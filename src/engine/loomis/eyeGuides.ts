import type {
  EyeGuidesGeometry,
  FacePose,
  Landmark,
  Size2D,
  ImageFit,
} from '@/types';
import { mid, orientedCrossLine, requireLm } from '@/engine/geometry/helpers';
import { normalizedToCanvas } from '@/engine/image/imageTransform';

export function computeEyeGuides(
  landmarks: Landmark[],
  pose: FacePose,
  image: Size2D,
  fit: ImageFit,
  halfWidth: number,
): EyeGuidesGeometry {
  const toC = (id: Parameters<typeof requireLm>[1], fb: { x: number; y: number }) =>
    normalizedToCanvas(requireLm(landmarks, id, fb), image, fit);

  const leftUpper = toC('leftUpperEyelid', { x: 0.38, y: 0.42 });
  const rightUpper = toC('rightUpperEyelid', { x: 0.62, y: 0.42 });
  const leftLower = toC('leftLowerEyelid', { x: 0.38, y: 0.46 });
  const rightLower = toC('rightLowerEyelid', { x: 0.62, y: 0.46 });

  const upperMid = mid(leftUpper, rightUpper);
  const lowerMid = mid(leftLower, rightLower);

  const upper = orientedCrossLine(upperMid, halfWidth * 0.95, pose);
  const lower = orientedCrossLine(lowerMid, halfWidth * 0.95, pose);

  return {
    upper: { id: 'eye-upper', ...upper, label: 'Upper eyelid' },
    lower: { id: 'eye-lower', ...lower, label: 'Lower eyelid' },
  };
}
