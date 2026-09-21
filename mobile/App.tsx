import 'react-native-get-random-values';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import AppNavigator from './src/navigation/AppNavigator';
import { getDb } from './src/db/database';
import { colors } from './src/theme/colors';

function Gate({ children }: { children: React.ReactNode }) {
  const { ready } = useSettings();
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    getDb().then(() => setDbReady(true));
  }, []);

  if (!ready || !dbReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy }}>
        <ActivityIndicator size="large" color={colors.aqua} />
      </View>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <SettingsProvider>
      <Gate>
        <StatusBar style="light" />
        <AppNavigator />
      </Gate>
    </SettingsProvider>
  );
}
