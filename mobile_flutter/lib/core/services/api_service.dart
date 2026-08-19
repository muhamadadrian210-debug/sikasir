import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late Dio _dio;
  String _baseUrl = 'http://10.0.2.2:3000/api'; // Default Android Emulator host / change to IP in Settings

  ApiService._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
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
