import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, typography } from '../theme/colors';
import { t } from '../i18n';
import { parseSampleQrValue } from '../services/qrService';
import { getSampleByCode } from '../db/repositories/samplesRepo';

export default function ScanQRScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    requestPermission();
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={typography.body}>Camera permission required.</Text>
      </View>
    );
  }

  const onScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    const code = parseSampleQrValue(data);
    if (!code) {
      Alert.alert(t('common.error'), 'Unrecognized QR code.');
      setScanned(false);
      return;
    }
    const sample = await getSampleByCode(code);
    if (!sample) {
      Alert.alert(t('common.error'), `${code} not found in local archive.`);
      setScanned(false);
      return;
    }
    navigation.replace('SampleDetail', { sampleId: sample.id });
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={scanned ? undefined : onScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  center: { alignItems: 'center', justifyContent: 'center' },
  camera: { flex: 1 },
});
