import type { CranialSphereGeometry, FacePose, Landmark, Size2D, ImageFit } from '@/types';
import { ellipsePoints, requireLm } from './helpers';
import { normalizedToCanvas } from '@/engine/image/imageTransform';
import type { LandmarkId } from '@/types';
import {
  buildFaceFrame,
  crossLineFromFrame,
  type FaceFrame,
} from './faceFrame';

/**
 * Estimate cranial sphere from facial landmarks in physical canvas space.
 * Orientation comes from the shared FaceFrame.
 */
export function computeCranialSphere(
  landmarks: Landmark[],
  pose: FacePose,
  image: Size2D,
  fit: ImageFit,
  frame?: FaceFrame,
): CranialSphereGeometry {
  const face = frame ?? buildFaceFrame(landmarks, pose, image, fit);

  const toC = (id: LandmarkId, fb: { x: number; y: number }) =>
    normalizedToCanvas(requireLm(landmarks, id, fb), image, fit);

  const brow = toC('browCenter', { x: 0.5, y: 0.38 });
  const chin = toC('chin', { x: 0.5, y: 0.85 });
  const leftTemple = toC('leftTemple', { x: 0.3, y: 0.35 });
  const rightTemple = toC('rightTemple', { x: 0.7, y: 0.35 });
  const hairline = toC('hairline', { x: 0.5, y: 0.18 });
  const leftCheek = toC('leftCheek', { x: 0.28, y: 0.5 });
  const rightCheek = toC('rightCheek', { x: 0.72, y: 0.5 });

  const faceHalfLen = Math.hypot(chin.x - brow.x, chin.y - brow.y) / 2;

  // Sphere center sits near brow / equator along the shared down axis
  const center = {
    x: brow.x - face.down.x * faceHalfLen * 0.05,
    y: brow.y - face.down.y * faceHalfLen * 0.05,
  };

  const horizontalSpan =
    Math.hypot(rightTemple.x - leftTemple.x, rightTemple.y - leftTemple.y) / 2 ||
    Math.hypot(rightCheek.x - leftCheek.x, rightCheek.y - leftCheek.y) / 2;

  const topOffset = Math.hypot(hairline.x - brow.x, hairline.y - brow.y) * 1.15;
  const verticalRadius = Math.max(topOffset, horizontalSpan * 0.95);
  const horizontalRadius = Math.max(horizontalSpan, verticalRadius * 0.92);

  const yawFactor = Math.cos((Math.abs(pose.yaw) * Math.PI) / 180);
  const radiusX = horizontalRadius * (0.65 + 0.35 * yawFactor);
  const radiusY = verticalRadius;

  const outline = ellipsePoints(center, radiusX, radiusY, face.roll, 72);
  const equatorLine = crossLineFromFrame(face, center, radiusX);

  return {
    center,
    radiusX,
    radiusY,
    equatorY: center.y,
    outline,
    equator: {
      id: 'sphere-equator',
      start: equatorLine.start,
      end: equatorLine.end,
      label: 'Brow equator',
    },
  };
}

export function cranialTopPoint(
  sphere: CranialSphereGeometry,
  pose: FacePose,
) {
  const down = {
    x: Math.sin((pose.roll * Math.PI) / 180),
    y: Math.cos((pose.roll * Math.PI) / 180),
  };
  return {
    x: sphere.center.x - down.x * sphere.radiusY,
    y: sphere.center.y - down.y * sphere.radiusY,
  };
}
