import type {
  FacePose,
  Landmark,
  Size2D,
  ImageFit,
  VerticalSubdivisionsGeometry,
  Point2D,
} from '@/types';
import { requireLm } from '@/engine/geometry/helpers';
import { normalizedToCanvas } from '@/engine/image/imageTransform';
import {
  buildFaceFrame,
  toLocal,
  verticalLineFromFrame,
  type FaceFrame,
} from '@/engine/geometry/faceFrame';
import { DEFAULT_ORIENTATION_CONFIG } from '@/engine/vision/orientationConfig';

/**
 * Five proportional eye-width units across the facial plane.
 * Verticals are parallel in face-local space (constant local X).
 */
export function computeVerticalSubdivisions(
  landmarks: Landmark[],
  pose: FacePose,
  image: Size2D,
  fit: ImageFit,
  top: Point2D,
  bottom: Point2D,
  frame?: FaceFrame,
): VerticalSubdivisionsGeometry {
  const face = frame ?? buildFaceFrame(landmarks, pose, image, fit);

  const toC = (id: Parameters<typeof requireLm>[1], fb: Point2D) =>
    normalizedToCanvas(requireLm(landmarks, id, fb), image, fit);

  const leftOuter = toC('leftEyeOuter', { x: 0.35, y: 0.44 });
  const rightOuter = toC('rightEyeOuter', { x: 0.65, y: 0.44 });
  const leftTemple = toC('leftTemple', { x: 0.28, y: 0.35 });
  const rightTemple = toC('rightTemple', { x: 0.72, y: 0.35 });
  const leftCheek = toC('leftCheek', { x: 0.28, y: 0.55 });
  const rightCheek = toC('rightCheek', { x: 0.72, y: 0.55 });

  const leftEdge = {
    x: (leftTemple.x + leftCheek.x) / 2,
    y: (leftTemple.y + leftCheek.y) / 2,
  };
  const rightEdge = {
    x: (rightTemple.x + rightCheek.x) / 2,
    y: (rightTemple.y + rightCheek.y) / 2,
  };

  const localLeft = toLocal(face, leftEdge);
  const localRight = toLocal(face, rightEdge);
  const localTop = toLocal(face, top);
  const localBottom = toLocal(face, bottom);

  const facialWidth = Math.abs(localRight.x - localLeft.x);
  const eyeWidth = Math.abs(
    toLocal(face, rightOuter).x - toLocal(face, leftOuter).x,
  );

  const projected = Math.abs(pose.yaw) > DEFAULT_ORIENTATION_CONFIG.yawFrontalDeg;
  const u = projected
    ? facialWidth / 5
    : ((facialWidth / 5 + eyeWidth / 5) / 2) || facialWidth / 5;

  const yStart = Math.min(localTop.y, localBottom.y) - Math.abs(localBottom.y - localTop.y) * 0.05;
  const yEnd = Math.max(localTop.y, localBottom.y) + Math.abs(localBottom.y - localTop.y) * 0.05;

  const leftX = Math.min(localLeft.x, localRight.x);
  const width = facialWidth || 1;

  const lines = [];
  for (let i = 1; i <= 4; i++) {
    let t = i / 5;
    if (projected) {
      const yawSign = Math.sign(pose.yaw) || 1;
      const compress = 1 - Math.abs(pose.yaw) / 200;
      if ((yawSign > 0 && t > 0.5) || (yawSign < 0 && t < 0.5)) {
        const local = t > 0.5 ? t - 0.5 : 0.5 - t;
        t = 0.5 + Math.sign(t - 0.5) * local * compress;
      }
    }
    const localX = leftX + width * t;
    const seg = verticalLineFromFrame(face, localX, yStart, yEnd);
    lines.push({
      id: `vert-${i}`,
      start: seg.start,
      end: seg.end,
      label: `V${i}`,
    });
  }

  return {
    facialWidth,
    unit: u,
    lines,
    projected,
  };
}
