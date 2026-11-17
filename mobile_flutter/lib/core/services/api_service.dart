import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late Dio _dio;
  String _baseUrl = 'https://sikasir-alpha.vercel.app/api'; // Official Cloud Production Server

  ApiService._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 20),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Client-App': 'sikasir-mobile-pos',
        'User-Agent': 'SiKasirMobilePOS/3.10.2',
      },
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('auth_token');
        final customUrl = prefs.getString('base_url');

        if (customUrl != null && customUrl.isNotEmpty && customUrl != _dio.options.baseUrl) {
          _dio.options.baseUrl = customUrl;
          options.baseUrl = customUrl;
        }

        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException error, handler) {
        // Safe global network error logger
        return handler.next(error);
      },
    ));
  }

  static String getErrorMessage(dynamic error) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map) {
        if (data['maintenance'] == true || error.response?.statusCode == 503) {
          return data['message']?.toString() ??
              data['error']?.toString() ??
              'Sistem sedang dalam pemeliharaan berkala (Maintenance Mode).';
        }
        if (data['error'] != null) {
          return data['error'].toString();
        }
        if (data['message'] != null) {
          return data['message'].toString();
        }
      }
      if (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.sendTimeout ||
          error.type == DioExceptionType.receiveTimeout) {
        return 'Waktu koneksi habis. Silakan periksa koneksi internet Anda.';
      }
      if (error.type == DioExceptionType.connectionError) {
        return 'Tidak dapat terhubung ke server cloud. Pastikan internet aktif.';
      }
      if (error.response?.statusCode == 401 || error.response?.statusCode == 403) {
        return 'Sesi login telah berakhir atau akses dibatasi. Silakan login ulang.';
      }
      if (error.response?.statusCode == 404) {
        return 'Layanan atau data tidak ditemukan di server.';
      }
      if (error.response?.statusCode == 500) {
        return 'Terjadi kendala internal pada server. Silakan coba beberapa saat lagi.';
      }
      if (error.response?.statusCode == 503) {
        return 'Server sedang sibuk atau dalam pemeliharaan berkala.';
      }
    }
    return error.toString().replaceFirst('Exception: ', '');
  }

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  Future<void> setToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
  }

  String get currentBaseUrl => _dio.options.baseUrl;

  Future<String> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('base_url') ?? _baseUrl;
  }

  Future<void> setBaseUrl(String newUrl) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('base_url', newUrl);
    _baseUrl = newUrl;
    _dio.options.baseUrl = newUrl;
  }

  void updateBaseUrl(String newUrl) {
    _baseUrl = newUrl;
    _dio.options.baseUrl = newUrl;
  }

  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) {
    return _dio.get(path, queryParameters: queryParameters);
  }

  Future<Response> post(String path, {dynamic data}) {
    return _dio.post(path, data: data);
  }

  Future<Response> put(String path, {dynamic data}) {
    return _dio.put(path, data: data);
  }

  Future<Response> delete(String path, {dynamic data}) {
    return _dio.delete(path, data: data);
  }
}
