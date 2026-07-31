import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { apiService, getCurrentUser } from '../services/api';
import { Product } from '../types';
import { AiAssistantModal } from '../components/AiAssistantModal';

export function DashboardScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);

  const user = getCurrentUser();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await apiService.getProducts();
      setProducts(data);
    } catch (e: any) {
      console.log('Dashboard load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const lowStockProducts = products.filter((p) => p.stock <= 5);
  const totalStockItems = products.reduce((sum, p) => sum + p.stock, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadDashboardData} tintColor="#00f2fe" />
      }
    >
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Selamat Datang,</Text>
          <Text style={styles.userName}>{user?.username || 'Admin Kasir'}</Text>
        </View>

        <TouchableOpacity
          style={styles.aiButton}
          onPress={() => setAiModalVisible(true)}
        >
          <MaterialCommunityIcons name="robot text" size={18} color="#000" />
          <Text style={styles.aiButtonText}>Tanya AI</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="cube-outline" size={24} color="#00f2fe" />
          <Text style={styles.statValue}>{products.length}</Text>
          <Text style={styles.statLabel}>Total Jenis Barang</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="layers-outline" size={24} color="#10b981" />
          <Text style={styles.statValue}>{totalStockItems}</Text>
          <Text style={styles.statLabel}>Total Pcs Stok</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="warning-outline" size={24} color="#ef4444" />
          <Text style={[styles.statValue, { color: '#ef4444' }]}>{lowStockProducts.length}</Text>
          <Text style={styles.statLabel}>Stok Kritis (&lt;=5)</Text>
        </View>
      </View>

      {/* Low Stock Warning Section */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
          <Text style={styles.sectionTitle}>Peringatan Stok Kritis</Text>
        </View>

        {lowStockProducts.length === 0 ? (
          <Text style={styles.emptyText}>Semua stok barang dalam kondisi aman.</Text>
        ) : (
          lowStockProducts.slice(0, 5).map((p) => (
            <View key={p.id} style={styles.warningRow}>
              <Text style={styles.warningProdName}>{p.name}</Text>
              <Text style={styles.warningStock}>Sisa {p.stock} pcs</Text>
            </View>
          ))
        )}
      </View>

      {/* Floating AI Assistant Modal */}
      <AiAssistantModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        onDataUpdated={loadDashboardData}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07090e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 8,
  },
  welcomeText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  userName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00f2fe',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  aiButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#07090e',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#94a3b8',
  },
  sectionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyText: {
    fontSize: 12,
    color: '#64748b',
  },
  warningRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  warningProdName: {
    fontSize: 13,
    color: '#f8fafc',
  },
  warningStock: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ef4444',
  },
});
