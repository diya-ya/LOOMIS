import type { FacePose, Landmark, LineGuide, Size2D, ImageFit } from '@/types';
import { faceDownAxis, requireLm } from './helpers';
import { normalizedToCanvas } from '@/engine/image/imageTransform';

/**
 * Facial centerline following actual orientation — not forced vertical.
 */
export function computeCenterline(
  landmarks: Landmark[],
  pose: FacePose,
  image: Size2D,
  fit: ImageFit,
): LineGuide {
  const toC = (id: Parameters<typeof requireLm>[1], fb: { x: number; y: number }) =>
    normalizedToCanvas(requireLm(landmarks, id, fb), image, fit);

  const hairline = toC('hairline', { x: 0.5, y: 0.18 });
  const brow = toC('browCenter', { x: 0.5, y: 0.38 });
  const noseBridge = toC('noseBridge', { x: 0.5, y: 0.45 });
  const noseTip = toC('noseTip', { x: 0.5, y: 0.55 });
  const chin = toC('chin', { x: 0.5, y: 0.85 });

  // Blend geometric midline points with pose-aware axis
  const points = [hairline, brow, noseBridge, noseTip, chin];
  const start = points[0];
  const end = points[points.length - 1];

  // Soften with pose down-axis so tilted heads stay coherent
  const down = faceDownAxis(pose);
  const height = Math.hypot(end.x - start.x, end.y - start.y);
  const mid = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };

  // Weighted: 70% landmark path endpoints, 30% pose axis through midpoint
  const poseStart = {
    x: mid.x - down.x * height * 0.55,
    y: mid.y - down.y * height * 0.55,
  };
  const poseEnd = {
    x: mid.x + down.x * height * 0.55,
    y: mid.y + down.y * height * 0.55,
  };

  return {
    id: 'centerline',
    start: {
      x: start.x * 0.7 + poseStart.x * 0.3,
      y: start.y * 0.7 + poseStart.y * 0.3,
    },
    end: {
      x: end.x * 0.7 + poseEnd.x * 0.3,
      y: end.y * 0.7 + poseEnd.y * 0.3,
    },
    label: 'Centerline',
  };
}
