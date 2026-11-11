import type {
  MouthGuidesGeometry,
  FacePose,
  Landmark,
  Size2D,
  ImageFit,
} from '@/types';
import { requireLm } from '@/engine/geometry/helpers';
import { normalizedToCanvas } from '@/engine/image/imageTransform';
import {
  buildFaceFrame,
  crossLineFromFrame,
  toLocal,
  type FaceFrame,
} from '@/engine/geometry/faceFrame';

/**
 * Mouth guides follow lip landmarks for height; orientation comes from
 * the shared face frame so they stay parallel with other horizontals.
 */
export function computeMouthGuides(
  landmarks: Landmark[],
  pose: FacePose,
  image: Size2D,
  fit: ImageFit,
  halfWidth: number,
  frame?: FaceFrame,
): MouthGuidesGeometry {
  const face = frame ?? buildFaceFrame(landmarks, pose, image, fit);

  const toC = (id: Parameters<typeof requireLm>[1], fb: { x: number; y: number }) =>
    normalizedToCanvas(requireLm(landmarks, id, fb), image, fit);

  const upperLip = toC('upperLip', { x: 0.5, y: 0.68 });
  const lowerLip = toC('lowerLip', { x: 0.5, y: 0.72 });
  const leftMouth = toC('leftMouth', { x: 0.4, y: 0.7 });
  const rightMouth = toC('rightMouth', { x: 0.6, y: 0.7 });

  const mouthHalf = Math.abs(toLocal(face, rightMouth).x - toLocal(face, leftMouth).x) / 2;
  const width = Math.max(mouthHalf * 1.15, halfWidth * 0.45);

  const upper = crossLineFromFrame(face, upperLip, width);
  const lower = crossLineFromFrame(face, lowerLip, width);

  return {
    upper: { id: 'mouth-upper', ...upper, label: 'Upper lip' },
    lower: { id: 'mouth-lower', ...lower, label: 'Lower lip' },
  };
}
