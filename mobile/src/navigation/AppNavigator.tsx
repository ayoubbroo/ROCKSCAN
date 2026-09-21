import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/colors';
import { t } from '../i18n';

import HomeScreen from '../screens/HomeScreen';
import CaptureScreen from '../screens/CaptureScreen';
import AnalyzeScreen from '../screens/AnalyzeScreen';
import ResultsScreen from '../screens/ResultsScreen';
import MeasurementsScreen from '../screens/MeasurementsScreen';
import HardnessTestScreen from '../screens/HardnessTestScreen';
import ValuationScreen from '../screens/ValuationScreen';
import SampleDetailScreen from '../screens/SampleDetailScreen';
import CompareScreen from '../screens/CompareScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ScanQRScreen from '../screens/ScanQRScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.navy }, headerTintColor: colors.white }}>
      <Stack.Screen name="HomeList" component={HomeScreen} options={{ title: t('nav.home') }} />
      <Stack.Screen name="Capture" component={CaptureScreen} options={{ title: t('capture.title') }} />
      <Stack.Screen name="Analyze" component={AnalyzeScreen} options={{ title: t('analysis.analyzing'), headerBackVisible: false }} />
      <Stack.Screen name="Results" component={ResultsScreen} options={{ title: t('analysis.candidates') }} />
      <Stack.Screen name="Measurements" component={MeasurementsScreen} options={{ title: t('measurements.title') }} />
      <Stack.Screen name="HardnessTest" component={HardnessTestScreen} options={{ title: t('measurements.hardness_title') }} />
      <Stack.Screen name="Valuation" component={ValuationScreen} options={{ title: t('valuation.title') }} />
      <Stack.Screen name="SampleDetail" component={SampleDetailScreen} options={{ title: t('sample.id') }} />
      <Stack.Screen name="Compare" component={CompareScreen} options={{ title: t('home.compare') }} />
      <Stack.Screen name="ScanQR" component={ScanQRScreen} options={{ title: t('sample.qr_code') }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.aqua,
          tabBarInactiveTintColor: colors.grey,
          tabBarStyle: { backgroundColor: colors.navy },
        }}
      >
        <Tab.Screen name="Home" component={HomeStack} options={{ title: t('nav.home') }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: t('nav.settings') }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
