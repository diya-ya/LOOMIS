import type {
  JawConstructionGeometry,
  Landmark,
  Size2D,
  ImageFit,
} from '@/types';
import { requireLm } from '@/engine/geometry/helpers';
import { normalizedToCanvas } from '@/engine/image/imageTransform';

export function computeJawConstruction(
  landmarks: Landmark[],
  image: Size2D,
  fit: ImageFit,
): JawConstructionGeometry {
  const toC = (id: Parameters<typeof requireLm>[1], fb: { x: number; y: number }) =>
    normalizedToCanvas(requireLm(landmarks, id, fb), image, fit);

  const leftCheek = toC('leftCheek', { x: 0.3, y: 0.52 });
  const rightCheek = toC('rightCheek', { x: 0.7, y: 0.52 });
  const leftJaw = toC('leftJaw', { x: 0.32, y: 0.72 });
  const rightJaw = toC('rightJaw', { x: 0.68, y: 0.72 });
  const chin = toC('chin', { x: 0.5, y: 0.85 });
  const leftTemple = toC('leftTemple', { x: 0.28, y: 0.35 });
  const rightTemple = toC('rightTemple', { x: 0.72, y: 0.35 });

  return {
    left: [
      {
        id: 'jaw-left-1',
        start: leftTemple,
        end: leftCheek,
        label: 'Left cheek',
      },
      {
        id: 'jaw-left-2',
        start: leftCheek,
        end: leftJaw,
        label: 'Left jaw',
      },
      {
        id: 'jaw-left-3',
        start: leftJaw,
        end: chin,
        label: 'Left chin',
      },
    ],
    right: [
      {
        id: 'jaw-right-1',
        start: rightTemple,
        end: rightCheek,
        label: 'Right cheek',
      },
      {
        id: 'jaw-right-2',
        start: rightCheek,
        end: rightJaw,
        label: 'Right jaw',
      },
      {
        id: 'jaw-right-3',
        start: rightJaw,
        end: chin,
        label: 'Right chin',
      },
    ],
  };
}
