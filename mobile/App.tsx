import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { KasirScreen } from './src/screens/KasirScreen';
import { ProductsScreen } from './src/screens/ProductsScreen';
import { getAuthToken } from './src/services/api';

const Tab = createBottomTabNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!getAuthToken());

  if (!isLoggedIn) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#0f172a',
              borderTopColor: '#1e293b',
              height: 60,
              paddingBottom: 8,
              paddingTop: 8,
            },
            tabBarActiveTintColor: '#00f2fe',
            tabBarInactiveTintColor: '#64748b',
          }}
        >
          <Tab.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{
              tabBarLabel: 'Dashboard',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="grid-outline" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Kasir"
            component={KasirScreen}
            options={{
              tabBarLabel: 'Kasir POS',
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="cash-register" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Products"
            component={ProductsScreen}
            options={{
              tabBarLabel: 'Stok Barang',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="cube-outline" size={size} color={color} />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
