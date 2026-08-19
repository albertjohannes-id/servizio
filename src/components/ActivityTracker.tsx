import React, { useEffect } from 'react';
import { AppState, Platform, View } from 'react-native';
import { useAuth } from '../data/AuthContext';

export function ActivityTracker({ children }: { children: React.ReactNode }) {
  const { gate, touchActivity } = useAuth();

  useEffect(() => {
    if (gate !== 'unlocked') return;
    touchActivity();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') touchActivity();
    });
    return () => sub.remove();
  }, [gate, touchActivity]);

  if (Platform.OS !== 'web' || gate !== 'unlocked') {
    return <>{children}</>;
  }

  return (
    <View style={{ flex: 1 }} onStartShouldSetResponder={() => true} onResponderRelease={touchActivity}>
      {children}
    </View>
  );
}
