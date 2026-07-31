import { NativeModules } from 'react-native';

// Global Polyfill for TurboModuleRegistry in Expo Go
if (typeof global !== 'undefined') {
  const PlatformConstantsMock = {
    isTesting: false,
    reactNativeVersion: { major: 0, minor: 76, patch: 0 },
    forceTouchAvailable: false,
    osVersion: '14.0',
    systemName: 'Android',
    interfaceIdiom: 'handset',
  };

  const getPlatformConstants = () => NativeModules.PlatformConstants || PlatformConstantsMock;

  if (!global.TurboModuleRegistry) {
    global.TurboModuleRegistry = {
      get: (name: string) => (name === 'PlatformConstants' ? getPlatformConstants() : NativeModules[name]),
      getEnforcing: (name: string) => (name === 'PlatformConstants' ? getPlatformConstants() : (NativeModules[name] || {})),
    };
  } else {
    const origEnforcing = global.TurboModuleRegistry.getEnforcing;
    global.TurboModuleRegistry.getEnforcing = function (name: string) {
      if (name === 'PlatformConstants') {
        try {
          const res = origEnforcing ? origEnforcing.call(global.TurboModuleRegistry, name) : null;
          if (res) return res;
        } catch (e) {
          // Fallback if TurboModule is missing in native binary
        }
        return getPlatformConstants();
      }
      try {
        return origEnforcing ? origEnforcing.call(global.TurboModuleRegistry, name) : (NativeModules[name] || {});
      } catch (e) {
        return NativeModules[name] || {};
      }
    };
  }
}

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
