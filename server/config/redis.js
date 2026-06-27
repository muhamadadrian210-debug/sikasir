const Redis = require('ioredis');
require('dotenv').config();

let redisClient;
let isRedisActive = false;

const REDIS_URL = process.env.REDIS_URL;

if (REDIS_URL) {
  try {
    console.log('[redis] Menghubungkan ke Redis...');
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      retryStrategy(times) {
        if (times > 3) {
          console.warn('[redis] Gagal terhubung ke Redis setelah 3 percobaan. Menggunakan mock local memory fallback...');
          isRedisActive = false;
          return null; // Stop retrying
        }
        return Math.min(times * 100, 2000);
      }
    });

    redisClient.on('connect', () => {
      console.log('[redis] Koneksi Redis berhasil terjalin!');
      isRedisActive = true;
    });

    redisClient.on('error', (err) => {
      // Catch connection errors silently so server does not crash
      console.warn('[redis] Terjadi error pada koneksi Redis:', err.message);
      isRedisActive = false;
    });
  } catch (err) {
    console.warn('[redis] Gagal menginisialisasi Redis:', err.message);
  }
}

// Fallback Mock Local Cache implementation if Redis is not configured or fails
const localCache = new Map();

const mockRedis = {
  async get(key) {
    return localCache.get(key) || null;
  },
  async set(key, value, expiryMode, expiryTime) {
    localCache.set(key, value);
    if (expiryMode === 'PX' && expiryTime) {
      setTimeout(() => {
        localCache.delete(key);
      }, expiryTime);
    } else if (expiryMode === 'EX' && expiryTime) {
      setTimeout(() => {
        localCache.delete(key);
      }, expiryTime * 1000);
    }
    return 'OK';
  },
  async incr(key) {
    const val = Number(localCache.get(key) || 0) + 1;
    localCache.set(key, String(val));
    return val;
  },
  async hincrby(key, field, increment) {
    const val = localCache.get(key) || {};
    const fieldVal = Number(val[field] || 0) + increment;
    val[field] = String(fieldVal);
    localCache.set(key, val);
    return fieldVal;
  },
  async hgetall(key) {
    return localCache.get(key) || {};
  },
  async hset(key, field, value) {
    const val = localCache.get(key) || {};
    val[field] = value;
    localCache.set(key, val);
    return 1;
  },
  async del(key) {
    return localCache.delete(key) ? 1 : 0;
  },
  async exists(key) {
    return localCache.has(key) ? 1 : 0;
  },
  async sadd(key, value) {
    const val = localCache.get(key) || [];
    if (!val.includes(value)) {
      val.push(value);
      localCache.set(key, val);
    }
    return 1;
  },
  async smembers(key) {
    return localCache.get(key) || [];
  }
};

module.exports = {
  getRedisClient: () => (isRedisActive ? redisClient : mockRedis),
  isRedisActive: () => isRedisActive
};
