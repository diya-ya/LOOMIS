import type { FacePose, Landmark, LineGuide, Size2D, ImageFit } from '@/types';
import { requireLm } from './helpers';
import { normalizedToCanvas } from '@/engine/image/imageTransform';
import {
  buildFaceFrame,
  fromLocal,
  toLocal,
  type FaceFrame,
} from './faceFrame';

/**
 * Facial centerline along the shared face-frame down axis.
 * Not forced vertical, but also not independently slanted per landmark noise.
 */
export function computeCenterline(
  landmarks: Landmark[],
  pose: FacePose,
  image: Size2D,
  fit: ImageFit,
  frame?: FaceFrame,
): LineGuide {
  const face = frame ?? buildFaceFrame(landmarks, pose, image, fit);

  const toC = (id: Parameters<typeof requireLm>[1], fb: { x: number; y: number }) =>
    normalizedToCanvas(requireLm(landmarks, id, fb), image, fit);

  const hairline = toC('hairline', { x: 0.5, y: 0.18 });
  const chin = toC('chin', { x: 0.5, y: 0.85 });

  const localHair = toLocal(face, hairline);
  const localChin = toLocal(face, chin);

  // Extend slightly past hairline/chin along the shared down axis at local X = 0
  const pad = Math.abs(localChin.y - localHair.y) * 0.06;

  return {
    id: 'centerline',
    start: fromLocal(face, {
      x: 0,
      y: Math.min(localHair.y, localChin.y) - pad,
    }),
    end: fromLocal(face, {
      x: 0,
      y: Math.max(localHair.y, localChin.y) + pad,
    }),
    label: 'Centerline',
  };
}
