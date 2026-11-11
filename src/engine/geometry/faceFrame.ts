import type { FacePose, Landmark, LandmarkId, Point2D, Size2D, ImageFit } from '@/types';
import { normalizedToCanvas } from '@/engine/image/imageTransform';
import { getLm, mid, normalize, rotate } from './helpers';

/**
 * Shared face-local coordinate system.
 * All Loomis construction should be computed relative to this frame,
 * then mapped to canvas — never by independently rotating each line.
 */
export type FaceFrame = {
  /** Origin in canvas coordinates (typically near brow / nose bridge). */
  origin: Point2D;
  /** Unit vector across the face (left → right), includes applied roll. */
  across: Point2D;
  /** Unit vector down the face (forehead → chin), includes applied roll. */
  down: Point2D;
  /** Applied in-plane roll in degrees (already deadzoned). */
  roll: number;
  yaw: number;
  pitch: number;
};

function lmPoint(
  landmarks: Landmark[],
  id: LandmarkId,
  fallback: Point2D,
  image: Size2D,
  fit: ImageFit,
): Point2D {
  const l = getLm(landmarks, id);
  return normalizedToCanvas(l ?? fallback, image, fit);
}

/**
 * Build a consistent face frame from pose + landmarks in canvas space.
 */
export function buildFaceFrame(
  landmarks: Landmark[],
  pose: FacePose,
  image: Size2D,
  fit: ImageFit,
): FaceFrame {
  const brow = lmPoint(landmarks, 'browCenter', { x: 0.5, y: 0.38 }, image, fit);
  const noseBridge = lmPoint(landmarks, 'noseBridge', { x: 0.5, y: 0.45 }, image, fit);
  const chin = lmPoint(landmarks, 'chin', { x: 0.5, y: 0.85 }, image, fit);
  const leftEyeOuter = lmPoint(landmarks, 'leftEyeOuter', { x: 0.35, y: 0.44 }, image, fit);
  const rightEyeOuter = lmPoint(landmarks, 'rightEyeOuter', { x: 0.65, y: 0.44 }, image, fit);
  const leftEyeInner = lmPoint(landmarks, 'leftEyeInner', { x: 0.42, y: 0.44 }, image, fit);
  const rightEyeInner = lmPoint(landmarks, 'rightEyeInner', { x: 0.58, y: 0.44 }, image, fit);

  const leftEye = mid(leftEyeOuter, leftEyeInner);
  const rightEye = mid(rightEyeOuter, rightEyeInner);
  const eyeMid = mid(leftEye, rightEye);

  // Origin: blend brow / eye mid / nose bridge for stability
  const origin = {
    x: brow.x * 0.35 + eyeMid.x * 0.35 + noseBridge.x * 0.3,
    y: brow.y * 0.45 + eyeMid.y * 0.25 + noseBridge.y * 0.3,
  };

  // Axes from applied roll only — NOT from per-line landmark slopes
  const across = normalize(rotate({ x: 1, y: 0 }, pose.roll));
  const down = normalize(rotate({ x: 0, y: 1 }, pose.roll));

  // Softly align down-axis toward chin when roll is meaningful,
  // but never let landmark noise redefine roll for upright faces.
  if (Math.abs(pose.roll) >= 5) {
    const toChin = { x: chin.x - origin.x, y: chin.y - origin.y };
    const len = Math.hypot(toChin.x, toChin.y) || 1;
    const chinDown = { x: toChin.x / len, y: toChin.y / len };
    // Keep roll-defined axes dominant (85%) so guides stay parallel
    const blendedDown = normalize({
      x: down.x * 0.85 + chinDown.x * 0.15,
      y: down.y * 0.85 + chinDown.y * 0.15,
    });
    // Re-orthogonalize across
    const blendedAcross = normalize({
      x: blendedDown.y,
      y: -blendedDown.x,
    });
    // Flip across if it points right-to-left
    const acrossSign =
      across.x * blendedAcross.x + across.y * blendedAcross.y >= 0 ? 1 : -1;
    return {
      origin,
      across: {
        x: blendedAcross.x * acrossSign,
        y: blendedAcross.y * acrossSign,
      },
      down: blendedDown,
      roll: pose.roll,
      yaw: pose.yaw,
      pitch: pose.pitch,
    };
  }

  return {
    origin,
    across,
    down,
    roll: pose.roll,
    yaw: pose.yaw,
    pitch: pose.pitch,
  };
}

/** Canvas point → face-local coordinates. */
export function toLocal(frame: FaceFrame, p: Point2D): Point2D {
  const dx = p.x - frame.origin.x;
  const dy = p.y - frame.origin.y;
  return {
    x: dx * frame.across.x + dy * frame.across.y,
    y: dx * frame.down.x + dy * frame.down.y,
  };
}

/** Face-local → canvas coordinates. */
export function fromLocal(frame: FaceFrame, local: Point2D): Point2D {
  return {
    x: frame.origin.x + frame.across.x * local.x + frame.down.x * local.y,
    y: frame.origin.y + frame.across.y * local.x + frame.down.y * local.y,
  };
}

/**
 * Horizontal guide in face-local space (constant local Y), mapped to canvas.
 * Foreshortens far side under yaw without tilting the line.
 */
export function crossLineFromFrame(
  frame: FaceFrame,
  centerCanvas: Point2D,
  halfWidth: number,
): { start: Point2D; end: Point2D } {
  const local = toLocal(frame, centerCanvas);
  const yawRad = (Math.abs(frame.yaw) * Math.PI) / 180;
  const foreshorten = Math.cos(yawRad);
  const leftScale = frame.yaw > 0 ? foreshorten : 1;
  const rightScale = frame.yaw < 0 ? foreshorten : 1;

  // Keep Y constant in local space so the guide stays parallel to others
  return {
    start: fromLocal(frame, {
      x: local.x - halfWidth * leftScale,
      y: local.y,
    }),
    end: fromLocal(frame, {
      x: local.x + halfWidth * rightScale,
      y: local.y,
    }),
  };
}

/**
 * Vertical guide in face-local space (constant local X).
 */
export function verticalLineFromFrame(
  frame: FaceFrame,
  localX: number,
  localYStart: number,
  localYEnd: number,
): { start: Point2D; end: Point2D } {
  return {
    start: fromLocal(frame, { x: localX, y: localYStart }),
    end: fromLocal(frame, { x: localX, y: localYEnd }),
  };
}

/** Angle of a line segment in degrees (0 = horizontal). */
export function lineAngleDeg(start: Point2D, end: Point2D): number {
  return (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI;
}
