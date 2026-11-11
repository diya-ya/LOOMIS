import type { Landmark, LandmarkId, Point2D, FacePose } from '@/types';

export function getLm(
  landmarks: Landmark[],
  id: LandmarkId,
): Landmark | undefined {
  return landmarks.find((l) => l.id === id);
}

export function requireLm(
  landmarks: Landmark[],
  id: LandmarkId,
  fallback: Point2D,
): Point2D {
  const l = getLm(landmarks, id);
  return l ? { x: l.x, y: l.y } : fallback;
}

export function mid(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function add(a: Point2D, b: Point2D): Point2D {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Point2D, b: Point2D): Point2D {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a: Point2D, s: number): Point2D {
  return { x: a.x * s, y: a.y * s };
}

export function length(a: Point2D): number {
  return Math.hypot(a.x, a.y);
}

export function normalize(a: Point2D): Point2D {
  const len = length(a) || 1;
  return { x: a.x / len, y: a.y / len };
}

export function rotate(a: Point2D, degrees: number): Point2D {
  const rad = (degrees * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
}

export function lerp(a: Point2D, b: Point2D, t: number): Point2D {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Unit vector along facial centerline direction (accounts for roll). */
export function faceDownAxis(pose: FacePose): Point2D {
  return normalize(rotate({ x: 0, y: 1 }, pose.roll));
}

/** Unit vector across the face (perpendicular to centerline in screen space, adjusted by yaw). */
export function faceAcrossAxis(pose: FacePose): Point2D {
  return normalize(rotate({ x: 1, y: 0 }, pose.roll));
}

/**
 * Project a horizontal division line across the face at a point,
 * oriented by roll and foreshortened by yaw for non-frontal faces.
 */
export function orientedCrossLine(
  center: Point2D,
  halfWidth: number,
  pose: FacePose,
): { start: Point2D; end: Point2D } {
  const across = faceAcrossAxis(pose);
  // Foreshorten the far side when yaw is significant
  const yawRad = (Math.abs(pose.yaw) * Math.PI) / 180;
  const foreshorten = Math.cos(yawRad);
  const leftScale = pose.yaw > 0 ? foreshorten : 1;
  const rightScale = pose.yaw < 0 ? foreshorten : 1;

  return {
    start: {
      x: center.x - across.x * halfWidth * leftScale,
      y: center.y - across.y * halfWidth * leftScale,
    },
    end: {
      x: center.x + across.x * halfWidth * rightScale,
      y: center.y + across.y * halfWidth * rightScale,
    },
  };
}

export function ellipsePoints(
  center: Point2D,
  radiusX: number,
  radiusY: number,
  rotationDeg: number,
  segments = 64,
): Point2D[] {
  const points: Point2D[] = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const local = { x: Math.cos(t) * radiusX, y: Math.sin(t) * radiusY };
    const rotated = rotate(local, rotationDeg);
    points.push(add(center, rotated));
  }
  return points;
}
