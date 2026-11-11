import type {
  MouthGuidesGeometry,
  FacePose,
  Landmark,
  Size2D,
  ImageFit,
} from '@/types';
import { mid, orientedCrossLine, requireLm } from '@/engine/geometry/helpers';
import { normalizedToCanvas } from '@/engine/image/imageTransform';

export function computeMouthGuides(
  landmarks: Landmark[],
  pose: FacePose,
  image: Size2D,
  fit: ImageFit,
  halfWidth: number,
): MouthGuidesGeometry {
  const toC = (id: Parameters<typeof requireLm>[1], fb: { x: number; y: number }) =>
    normalizedToCanvas(requireLm(landmarks, id, fb), image, fit);

  const upperLip = toC('upperLip', { x: 0.5, y: 0.68 });
  const lowerLip = toC('lowerLip', { x: 0.5, y: 0.72 });
  const leftMouth = toC('leftMouth', { x: 0.4, y: 0.7 });
  const rightMouth = toC('rightMouth', { x: 0.6, y: 0.7 });

  const mouthHalf =
    Math.hypot(rightMouth.x - leftMouth.x, rightMouth.y - leftMouth.y) / 2;
  const width = Math.max(mouthHalf * 1.15, halfWidth * 0.45);

  const upper = orientedCrossLine(upperLip, width, pose);
  const lower = orientedCrossLine(lowerLip, width, pose);

  void mid;

  return {
    upper: { id: 'mouth-upper', ...upper, label: 'Upper lip' },
    lower: { id: 'mouth-lower', ...lower, label: 'Lower lip' },
  };
}
