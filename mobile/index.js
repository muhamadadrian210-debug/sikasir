// MUST BE AT THE VERY TOP BEFORE ANY IMPORT STATEMENTS
if (typeof global !== 'undefined') {
  const PlatformConstantsMock = {
    isTesting: false,
    reactNativeVersion: { major: 0, minor: 81, patch: 5 },
    forceTouchAvailable: false,
    osVersion: '14.0',
    systemName: 'Android',
    interfaceIdiom: 'handset',
  };

  if (!global.TurboModuleRegistry) {
    global.TurboModuleRegistry = {
      get: function (name) {
        if (name === 'PlatformConstants') return PlatformConstantsMock;
        return (global.nativeModuleProxy && global.nativeModuleProxy[name]) || {};
      },
      getEnforcing: function (name) {
        if (name === 'PlatformConstants') return PlatformConstantsMock;
        return (global.nativeModuleProxy && global.nativeModuleProxy[name]) || {};
      },
    };
  } else if (typeof global.TurboModuleRegistry.getEnforcing === 'function') {
    const origEnforcing = global.TurboModuleRegistry.getEnforcing;
    global.TurboModuleRegistry.getEnforcing = function (name) {
      if (name === 'PlatformConstants') return PlatformConstantsMock;
      try {
        const res = origEnforcing.call(global.TurboModuleRegistry, name);
        if (res) return res;
      } catch (e) {
        // Fallback for missing TurboModules
      }
      return PlatformConstantsMock;
    };
  }
}

// NOW IMPORT EXPO AND APP
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
