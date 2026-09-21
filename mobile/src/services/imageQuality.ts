import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export interface LocalQualityCheck {
  score: number; // 0-100, heuristic only — the AI vision provider runs the authoritative check server-side
  sufficientForAnalysis: boolean;
  issues: string[];
}

const MIN_DIMENSION_PX = 600;
const MIN_FILE_SIZE_BYTES = 20 * 1024; // very small files are almost always over-compressed/blank

/**
 * Runs a fast, local, heuristic-only quality gate BEFORE spending a network
 * call on the AI provider. This never claims to detect blur/exposure with
 * certainty from just resolution + file size — it only catches the most
 * obvious failures (tiny images, near-empty files) early. The authoritative
 * quality assessment always comes back from POST /api/analyze.
 */
export async function runLocalQualityCheck(uri: string): Promise<LocalQualityCheck> {
  const issues: string[] = [];
  let score = 100;

  try {
    const info = await ImageManipulator.manipulateAsync(uri, [], { format: ImageManipulator.SaveFormat.JPEG });
    const width = info.width;
    const height = info.height;

    if (width < MIN_DIMENSION_PX || height < MIN_DIMENSION_PX) {
      issues.push('low_resolution');
      score -= 40;
    }

    const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
    if (fileInfo.exists && 'size' in fileInfo && (fileInfo.size ?? 0) < MIN_FILE_SIZE_BYTES) {
      issues.push('file_too_small_possibly_blank_or_corrupt');
      score -= 40;
    }
  } catch (e) {
    issues.push('could_not_read_image');
    score = 0;
  }

  score = Math.max(0, score);

  return {
    score,
    sufficientForAnalysis: issues.length === 0,
    issues,
  };
}
