import type { Landmark } from '@/types';

export function overallConfidence(landmarks: Landmark[]): number {
  if (landmarks.length === 0) return 0;
  const sum = landmarks.reduce((s, l) => s + l.confidence, 0);
  return sum / landmarks.length;
}

export function uncertainLandmarks(
  landmarks: Landmark[],
  threshold = 0.7,
): Landmark[] {
  return landmarks.filter((l) => l.confidence < threshold || l.estimated);
}

export function confidenceLabel(value: number): string {
  if (value >= 0.9) return 'High';
  if (value >= 0.75) return 'Good';
  if (value >= 0.6) return 'Moderate';
  if (value >= 0.4) return 'Low';
  return 'Uncertain';
}
