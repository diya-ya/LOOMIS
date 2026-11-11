import type {
  FacePose,
  FacialDivisionsGeometry,
  Landmark,
  Size2D,
  ImageFit,
  Point2D,
} from '@/types';
import { requireLm, sub, length } from './helpers';
import { normalizedToCanvas } from '@/engine/image/imageTransform';
import {
  buildFaceFrame,
  crossLineFromFrame,
  toLocal,
  fromLocal,
  type FaceFrame,
} from './faceFrame';

/**
 * Four primary Loomis divisions A–D.
 * Centers follow landmarks along the face-local down axis;
 * all cross-lines share the same FaceFrame (parallel horizontals).
 */
export function computeFacialDivisions(
  landmarks: Landmark[],
  pose: FacePose,
  image: Size2D,
  fit: ImageFit,
  halfWidth: number,
  frame?: FaceFrame,
): FacialDivisionsGeometry {
  const face = frame ?? buildFaceFrame(landmarks, pose, image, fit);

  const toC = (id: Parameters<typeof requireLm>[1], fb: Point2D) =>
    normalizedToCanvas(requireLm(landmarks, id, fb), image, fit);

  const hairline = toC('hairline', { x: 0.5, y: 0.18 });
  const brow = toC('browCenter', { x: 0.5, y: 0.38 });
  const noseBottom = toC('noseBottom', { x: 0.5, y: 0.58 });
  const chin = toC('chin', { x: 0.5, y: 0.85 });

  // Project landmark centers onto the face centerline (local X = 0)
  // so horizontal guides stay centered even with mild asymmetry.
  const projectToCenterline = (p: Point2D): Point2D => {
    const local = toLocal(face, p);
    return fromLocal(face, { x: 0, y: local.y });
  };

  const A = projectToCenterline(hairline);
  const D = projectToCenterline(chin);
  const browOnAxis = projectToCenterline(brow);
  const noseOnAxis = projectToCenterline(noseBottom);

  const localA = toLocal(face, A);
  const localD = toLocal(face, D);
  const span = localD.y - localA.y;
  const third = span / 3;

  const idealB = fromLocal(face, { x: 0, y: localA.y + third });
  const idealC = fromLocal(face, { x: 0, y: localA.y + third * 2 });

  // Blend ideal equal thirds with detected features (along the axis only)
  const B = {
    x: browOnAxis.x * 0.65 + idealB.x * 0.35,
    y: browOnAxis.y * 0.65 + idealB.y * 0.35,
  };
  const C = {
    x: noseOnAxis.x * 0.65 + idealC.x * 0.35,
    y: noseOnAxis.y * 0.65 + idealC.y * 0.35,
  };

  // Re-project blended points so they remain on the centerline
  const Baxis = projectToCenterline(B);
  const Caxis = projectToCenterline(C);

  const d1 = length(sub(Baxis, A));
  const d2 = length(sub(Caxis, Baxis));
  const d3 = length(sub(D, Caxis));
  const avg = (d1 + d2 + d3) / 3 || 1;
  const equalDivision =
    Math.abs(d1 - avg) / avg < 0.18 &&
    Math.abs(d2 - avg) / avg < 0.18 &&
    Math.abs(d3 - avg) / avg < 0.18;

  const lineAt = (center: Point2D, id: string, label: string) => {
    const { start, end } = crossLineFromFrame(face, center, halfWidth);
    return { id, start, end, label };
  };

  return {
    hairline: lineAt(A, 'div-A', 'A — Hairline'),
    brow: lineAt(Baxis, 'div-B', 'B — Brow'),
    noseBottom: lineAt(Caxis, 'div-C', 'C — Nose'),
    chin: lineAt(D, 'div-D', 'D — Chin'),
    equalDivision,
  };
}
