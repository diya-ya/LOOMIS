import type {
  FacePose,
  Landmark,
  Size2D,
  ImageFit,
  VerticalSubdivisionsGeometry,
  Point2D,
} from '@/types';
import {
  faceAcrossAxis,
  faceDownAxis,
  requireLm,
  add,
  scale,
} from '@/engine/geometry/helpers';
import { normalizedToCanvas } from '@/engine/image/imageTransform';

/**
 * Five proportional eye-width units across the facial plane.
 * Uses projected facial plane for rotated faces rather than equal
 * horizontal spacing in screen coordinates.
 */
export function computeVerticalSubdivisions(
  landmarks: Landmark[],
  pose: FacePose,
  image: Size2D,
  fit: ImageFit,
  top: Point2D,
  bottom: Point2D,
): VerticalSubdivisionsGeometry {
  const toC = (id: Parameters<typeof requireLm>[1], fb: Point2D) =>
    normalizedToCanvas(requireLm(landmarks, id, fb), image, fit);

  const leftOuter = toC('leftEyeOuter', { x: 0.35, y: 0.44 });
  const rightOuter = toC('rightEyeOuter', { x: 0.65, y: 0.44 });
  const leftTemple = toC('leftTemple', { x: 0.28, y: 0.35 });
  const rightTemple = toC('rightTemple', { x: 0.72, y: 0.35 });
  const leftCheek = toC('leftCheek', { x: 0.28, y: 0.55 });
  const rightCheek = toC('rightCheek', { x: 0.72, y: 0.55 });

  const across = faceAcrossAxis(pose);
  const down = faceDownAxis(pose);

  // Facial width from temples / cheeks projected onto across-axis
  const leftEdge = {
    x: (leftTemple.x + leftCheek.x) / 2,
    y: (leftTemple.y + leftCheek.y) / 2,
  };
  const rightEdge = {
    x: (rightTemple.x + rightCheek.x) / 2,
    y: (rightTemple.y + rightCheek.y) / 2,
  };

  const facialWidth = Math.hypot(
    rightEdge.x - leftEdge.x,
    rightEdge.y - leftEdge.y,
  );
  const unit = facialWidth / 5;

  const projected = Math.abs(pose.yaw) > 12;

  // Eye width as cross-check
  const eyeWidth = Math.hypot(
    rightOuter.x - leftOuter.x,
    rightOuter.y - leftOuter.y,
  );
  const u = projected ? unit : (facialWidth / 5 + eyeWidth / 5) / 2 || unit;

  const center = {
    x: (leftEdge.x + rightEdge.x) / 2,
    y: (top.y + bottom.y) / 2,
  };

  // Four internal vertical guidelines at 1u, 2u, 3u, 4u from left edge
  const lines = [];
  for (let i = 1; i <= 4; i++) {
    const along = add(leftEdge, scale(across, u * i));
    // For yaw, compress spacing on the far side using perspective-ish factor
    let t = i / 5;
    if (projected) {
      const yawSign = Math.sign(pose.yaw) || 1;
      // Compress the far half
      const compress = 1 - Math.abs(pose.yaw) / 200;
      if ((yawSign > 0 && t > 0.5) || (yawSign < 0 && t < 0.5)) {
        const local = t > 0.5 ? t - 0.5 : 0.5 - t;
        const adjusted = 0.5 + Math.sign(t - 0.5) * local * compress;
        t = adjusted;
      }
      const pos = add(leftEdge, scale(across, facialWidth * t));
      lines.push({
        id: `vert-${i}`,
        start: {
          x: pos.x - down.x * Math.hypot(top.x - bottom.x, top.y - bottom.y) * 0.55,
          y: pos.y - down.y * Math.hypot(top.x - bottom.x, top.y - bottom.y) * 0.55,
        },
        end: {
          x: pos.x + down.x * Math.hypot(top.x - bottom.x, top.y - bottom.y) * 0.55,
          y: pos.y + down.y * Math.hypot(top.x - bottom.x, top.y - bottom.y) * 0.55,
        },
        label: `V${i}`,
      });
    } else {
      lines.push({
        id: `vert-${i}`,
        start: {
          x: along.x - down.x * Math.hypot(top.x - bottom.x, top.y - bottom.y) * 0.55,
          y: along.y - down.y * Math.hypot(top.x - bottom.x, top.y - bottom.y) * 0.55,
        },
        end: {
          x: along.x + down.x * Math.hypot(top.x - bottom.x, top.y - bottom.y) * 0.55,
          y: along.y + down.y * Math.hypot(top.x - bottom.x, top.y - bottom.y) * 0.55,
        },
        label: `V${i}`,
      });
    }
  }

  void center;

  return {
    facialWidth,
    unit: u,
    lines,
    projected,
  };
}
