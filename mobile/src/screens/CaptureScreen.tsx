import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, typography, spacing } from '../theme/colors';
import { t } from '../i18n';
import { createSample } from '../db/repositories/samplesRepo';
import { addPhoto } from '../db/repositories/photosRepo';
import { runLocalQualityCheck } from '../services/imageQuality';
import { PhotoType } from '../types/models';

const PHOTO_SEQUENCE: { type: PhotoType; labelKey: string }[] = [
  { type: 'full', labelKey: 'capture.photo_type_full' },
  { type: 'closeup', labelKey: 'capture.photo_type_closeup' },
  { type: 'side', labelKey: 'capture.photo_type_side' },
  { type: 'fracture', labelKey: 'capture.photo_type_fracture' },
  { type: 'crystal_detail', labelKey: 'capture.photo_type_crystal_detail' },
];

export default function CaptureScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [sampleId, setSampleId] = useState<number | null>(null);
  const [sampleCode, setSampleCode] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [capturedUris, setCapturedUris] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const sample = await createSample();
      setSampleId(sample.id);
      setSampleCode(sample.sample_code);
    })();
  }, []);

  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={typography.body}>Camera permission required.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStep = PHOTO_SEQUENCE[stepIndex];

  const takePhoto = async () => {
    if (!cameraRef.current || !sampleId || !sampleCode || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85, base64: false });
      if (!photo?.uri) throw new Error('No photo captured');

      const quality = await runLocalQualityCheck(photo.uri);
      if (!quality.sufficientForAnalysis) {
        Alert.alert(t('quality.insufficient_title'), t('quality.insufficient_message'));
        setBusy(false);
        return;
      }

      await addPhoto(sampleId, sampleCode, currentStep.type, photo.uri, stepIndex + 1, quality.score, quality.issues);
      setCapturedUris((prev) => ({ ...prev, [currentStep.type]: photo.uri }));
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setBusy(false);
    }
  };

  const goNextStep = () => {
    if (stepIndex < PHOTO_SEQUENCE.length - 1) {
      setStepIndex(stepIndex + 1);
    } else if (sampleId) {
      navigation.replace('Analyze', { sampleId });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.instructions} contentContainerStyle={{ padding: spacing.md }}>
        <Text style={typography.h2}>{t('capture.instructions_title')}</Text>
        {['instruction_1', 'instruction_2', 'instruction_3', 'instruction_4', 'instruction_5', 'instruction_6'].map(
          (k) => (
            <Text key={k} style={styles.instructionLine}>
              • {t(`capture.${k}`)}
            </Text>
          )
        )}
      </ScrollView>

      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      </View>

      <View style={styles.controls}>
        <Text style={styles.stepLabel}>{t(currentStep.labelKey)}</Text>
        {capturedUris[currentStep.type] ? (
          <View style={styles.previewRow}>
            <Image source={{ uri: capturedUris[currentStep.type] }} style={styles.thumb} />
            <TouchableOpacity style={styles.secondaryButton} onPress={takePhoto} disabled={busy}>
              <Text style={styles.secondaryButtonText}>{t('capture.retake')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={goNextStep}>
              <Text style={styles.primaryButtonText}>
                {stepIndex < PHOTO_SEQUENCE.length - 1 ? t('common.next') : t('capture.continue')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.captureButton} onPress={takePhoto} disabled={busy}>
            <Text style={styles.primaryButtonText}>{t('capture.take_photo')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  center: { alignItems: 'center', justifyContent: 'center' },
  instructions: { maxHeight: 160, backgroundColor: colors.deepBlue },
  instructionLine: { color: colors.white, marginTop: 4, fontSize: 13 },
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  controls: { backgroundColor: colors.navy, padding: spacing.md },
  stepLabel: { color: colors.aqua, fontWeight: '700', marginBottom: spacing.sm, textAlign: 'center' },
  captureButton: { backgroundColor: colors.aqua, padding: spacing.md, borderRadius: 30, alignItems: 'center' },
  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  thumb: { width: 50, height: 50, borderRadius: 8 },
  primaryButton: { backgroundColor: colors.aqua, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 8 },
  primaryButtonText: { color: colors.navy, fontWeight: '700' },
  secondaryButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 8, borderWidth: 1, borderColor: colors.white },
  secondaryButtonText: { color: colors.white, fontWeight: '700' },
});
