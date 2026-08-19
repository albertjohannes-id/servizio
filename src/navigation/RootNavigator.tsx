import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../data/AuthContext';
import { AccountScreen } from '../screens/AccountScreen';
import { AddEditAssetScreen } from '../screens/AddEditAssetScreen';
import { AssetDetailScreen } from '../screens/AssetDetailScreen';
import { DebugMetricsScreen } from '../screens/DebugMetricsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LogServiceScreen } from '../screens/LogServiceScreen';
import { SetupScreen } from '../screens/SetupScreen';
import { UnlockScreen } from '../screens/UnlockScreen';
import { colors } from '../theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { ready, gate } = useAuth();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShadowVisible: false,
          headerBackTitle: '',
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '500', fontSize: 16 },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {gate === 'unlocked' ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Account" component={AccountScreen} options={{ title: 'Account' }} />
            <Stack.Screen name="AddEditAsset" component={AddEditAssetScreen} options={{ title: '' }} />
            <Stack.Screen name="AssetDetail" component={AssetDetailScreen} options={{ title: '' }} />
            <Stack.Screen name="LogService" component={LogServiceScreen} options={{ title: '' }} />
            <Stack.Screen name="DebugMetrics" component={DebugMetricsScreen} options={{ title: '' }} />
          </>
        ) : gate === 'locked' ? (
          <Stack.Screen name="Unlock" component={UnlockScreen} options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="Setup" component={SetupScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
