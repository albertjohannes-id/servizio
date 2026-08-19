import { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppShell } from './src/components/AppShell';
import { ActivityTracker } from './src/components/ActivityTracker';
import { AssetProvider } from './src/data/AssetContext';
import { AuthProvider } from './src/data/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';

function useWebFieldInset() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const id = 'servizio-field-inset';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent =
      'input, textarea { padding-left: 20px !important; padding-right: 16px !important; box-sizing: border-box; }';
    document.head.appendChild(style);
  }, []);
}

export default function App() {
  useWebFieldInset();
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AssetProvider>
          <ActivityTracker>
            <AppShell>
              <RootNavigator />
            </AppShell>
          </ActivityTracker>
          <StatusBar style="dark" />
        </AssetProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
