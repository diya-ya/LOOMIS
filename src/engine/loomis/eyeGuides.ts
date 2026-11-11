import type {
  EyeGuidesGeometry,
  FacePose,
  Landmark,
  Size2D,
  ImageFit,
} from '@/types';
import { mid, requireLm } from '@/engine/geometry/helpers';
import { normalizedToCanvas } from '@/engine/image/imageTransform';
import {
  buildFaceFrame,
  crossLineFromFrame,
  type FaceFrame,
} from '@/engine/geometry/faceFrame';

/**
 * Eye guides follow eyelid landmark heights but share the face frame
 * orientation (parallel to primary divisions) — not per-eye slopes.
 */
export function computeEyeGuides(
  landmarks: Landmark[],
  pose: FacePose,
  image: Size2D,
  fit: ImageFit,
  halfWidth: number,
  frame?: FaceFrame,
): EyeGuidesGeometry {
  const face = frame ?? buildFaceFrame(landmarks, pose, image, fit);

  const toC = (id: Parameters<typeof requireLm>[1], fb: { x: number; y: number }) =>
    normalizedToCanvas(requireLm(landmarks, id, fb), image, fit);

  const leftUpper = toC('leftUpperEyelid', { x: 0.38, y: 0.42 });
  const rightUpper = toC('rightUpperEyelid', { x: 0.62, y: 0.42 });
  const leftLower = toC('leftLowerEyelid', { x: 0.38, y: 0.46 });
  const rightLower = toC('rightLowerEyelid', { x: 0.62, y: 0.46 });

  const upperMid = mid(leftUpper, rightUpper);
  const lowerMid = mid(leftLower, rightLower);

  const upper = crossLineFromFrame(face, upperMid, halfWidth * 0.95);
  const lower = crossLineFromFrame(face, lowerMid, halfWidth * 0.95);

  return {
    upper: { id: 'eye-upper', ...upper, label: 'Upper eyelid' },
    lower: { id: 'eye-lower', ...lower, label: 'Lower eyelid' },
  };
}
