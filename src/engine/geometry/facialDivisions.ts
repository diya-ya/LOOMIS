import type {
  FacePose,
  FacialDivisionsGeometry,
  Landmark,
  Size2D,
  ImageFit,
  Point2D,
} from '@/types';
import {
  faceDownAxis,
  orientedCrossLine,
  requireLm,
  sub,
  length,
  add,
  scale,
} from './helpers';
import { normalizedToCanvas } from '@/engine/image/imageTransform';

/**
 * Four primary Loomis divisions A–D.
 * Starts with equal thirds A→D, then adapts to detected features.
 */
export function computeFacialDivisions(
  landmarks: Landmark[],
  pose: FacePose,
  image: Size2D,
  fit: ImageFit,
  halfWidth: number,
): FacialDivisionsGeometry {
  const toC = (id: Parameters<typeof requireLm>[1], fb: Point2D) =>
    normalizedToCanvas(requireLm(landmarks, id, fb), image, fit);

  const hairline = toC('hairline', { x: 0.5, y: 0.18 });
  const brow = toC('browCenter', { x: 0.5, y: 0.38 });
  const noseBottom = toC('noseBottom', { x: 0.5, y: 0.58 });
  const chin = toC('chin', { x: 0.5, y: 0.85 });

  const down = faceDownAxis(pose);
  const A = hairline;
  const D = chin;

  // Ideal equal thirds along A→D
  const AD = sub(D, A);
  const third = length(AD) / 3;
  const idealB = add(A, scale(down, third));
  const idealC = add(A, scale(down, third * 2));

  // Blend ideal equal divisions with detected brow / nose (60% detected)
  const B = {
    x: brow.x * 0.65 + idealB.x * 0.35,
    y: brow.y * 0.65 + idealB.y * 0.35,
  };
  const C = {
    x: noseBottom.x * 0.65 + idealC.x * 0.35,
    y: noseBottom.y * 0.65 + idealC.y * 0.35,
  };

  const d1 = length(sub(B, A));
  const d2 = length(sub(C, B));
  const d3 = length(sub(D, C));
  const avg = (d1 + d2 + d3) / 3;
  const equalDivision =
    Math.abs(d1 - avg) / avg < 0.18 &&
    Math.abs(d2 - avg) / avg < 0.18 &&
    Math.abs(d3 - avg) / avg < 0.18;

  const lineAt = (center: Point2D, id: string, label: string) => {
    const { start, end } = orientedCrossLine(center, halfWidth, pose);
    return { id, start, end, label };
  };

  return {
    hairline: lineAt(A, 'div-A', 'A — Hairline'),
    brow: lineAt(B, 'div-B', 'B — Brow'),
    noseBottom: lineAt(C, 'div-C', 'C — Nose'),
    chin: lineAt(D, 'div-D', 'D — Chin'),
    equalDivision,
  };
}
