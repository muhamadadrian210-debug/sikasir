import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { Tenant } from '../types';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(true);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoadingTenants(true);
      const list = await apiService.getTenants();
      setTenants(list);
      if (list.length > 0) {
        setSelectedTenantId(list[0].id);
      }
    } catch (e: any) {
      console.log('Fetch tenants error:', e.message);
    } finally {
      setLoadingTenants(false);
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Peringatan', 'Username dan password wajib diisi.');
      return;
    }

    try {
      setLoading(true);
      await apiService.login(username.trim(), password, selectedTenantId || undefined);
      onLoginSuccess();
    } catch (e: any) {
      Alert.alert('Gagal Login', e.message || 'Username atau password salah.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* App Logo & Header */}
        <View className="header" style={styles.header}>
          <View style={styles.logoBadge}>
            <MaterialCommunityIcons name="cash-register" size={36} color="#00f2fe" />
          </View>
          <Text style={styles.appTitle}>SiKasir Mobile</Text>
          <Text style={styles.appSubtitle}>Point of Sale Supermarket & Warung POS</Text>
        </View>

        {/* Login Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Login Akun Kasir / Admin</Text>

          {/* Tenant Store Selector */}
          <Text style={styles.label}>Pilih Toko / Minimarket</Text>
          {loadingTenants ? (
            <ActivityIndicator size="small" color="#00f2fe" style={{ marginVertical: 8 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tenantScroll}>
              {tenants.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.tenantChip,
                    selectedTenantId === t.id && styles.tenantChipActive,
                  ]}
                  onPress={() => setSelectedTenantId(t.id)}
                >
                  <Text
                    style={[
                      styles.tenantChipText,
                      selectedTenantId === t.id && styles.tenantChipTextActive,
                    ]}
                  >
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Username Input */}
          <Text style={styles.label}>Username</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username kasir/admin"
              placeholderTextColor="#64748b"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          {/* Password Input */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password akun"
              placeholderTextColor="#64748b"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.pwToggle}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#94a3b8"
              />
            </TouchableOpacity>
          </View>

          {/* Submit Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.loginBtnText}>MASUK KE POS KASIR</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>© PT Sivilize Corp Indonesia • SiKasir Native Mobile</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07090e',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#00f2fe33',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
    marginTop: 12,
  },
  tenantScroll: {
    marginBottom: 8,
  },
  tenantChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tenantChipActive: {
    backgroundColor: '#00f2fe20',
    borderColor: '#00f2fe',
  },
  tenantChipText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  tenantChipTextActive: {
    color: '#00f2fe',
    fontWeight: '700',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#07090e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  pwToggle: {
    padding: 4,
  },
  loginBtn: {
    backgroundColor: '#00f2fe',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#07090e',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  footerText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 11,
    marginTop: 32,
  },
});
