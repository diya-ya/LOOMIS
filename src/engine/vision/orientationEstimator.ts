import type { FaceOrientationClass, FacePose, Point2D } from '@/types';

/**
 * Estimate yaw/pitch/roll from MediaPipe facial transformation matrix
 * or fallback geometric heuristics from landmark positions.
 */
export function classifyOrientation(
  yaw: number,
  _pitch: number,
  _roll: number,
): FaceOrientationClass {
  const absYaw = Math.abs(yaw);
  // Extreme pitch can make yaw unreliable
  if (Math.abs(_pitch) > 55 && absYaw < 20) return 'uncertain';
  if (absYaw < 12) return 'frontal';
  if (absYaw < 25) return 'slightly-turned';
  if (absYaw < 55) return 'three-quarter';
  if (absYaw < 90) return 'profile';
  return 'uncertain';
}

/**
 * Extract Euler-ish angles from a 4x4 column-major facial transformation matrix.
 * MediaPipe FaceLandmarker provides facialTransformationMatrixes.
 */
export function poseFromMatrix(matrix: Float32Array | number[]): FacePose {
  // Column-major 4x4
  const r00 = matrix[0];
  const r10 = matrix[1];
  const r20 = matrix[2];
  const r21 = matrix[6];
  const r22 = matrix[10];

  // ZYX convention approximations
  const pitch = Math.atan2(-r20, Math.sqrt(r21 * r21 + r22 * r22)) * (180 / Math.PI);
  const yaw = Math.atan2(r10, r00) * (180 / Math.PI);
  const roll = Math.atan2(r21, r22) * (180 / Math.PI);

  return {
    yaw,
    pitch,
    roll,
    classification: classifyOrientation(yaw, pitch, roll),
  };
}

/**
 * Geometric fallback when no transformation matrix is available.
 * Uses eye corners and nose tip in normalized coordinates.
 */
export function poseFromLandmarks(args: {
  leftEye: Point2D;
  rightEye: Point2D;
  noseTip: Point2D;
  mouthLeft: Point2D;
  mouthRight: Point2D;
  chin: Point2D;
  forehead: Point2D;
}): FacePose {
  const { leftEye, rightEye, noseTip, mouthLeft, mouthRight, chin, forehead } =
    args;

  const eyeMid = {
    x: (leftEye.x + rightEye.x) / 2,
    y: (leftEye.y + rightEye.y) / 2,
  };
  const mouthMid = {
    x: (mouthLeft.x + mouthRight.x) / 2,
    y: (mouthLeft.y + mouthRight.y) / 2,
  };

  const eyeDx = rightEye.x - leftEye.x;
  const eyeDy = rightEye.y - leftEye.y;
  const roll = Math.atan2(eyeDy, eyeDx) * (180 / Math.PI);

  // Yaw: horizontal offset of nose relative to eye midpoint, normalized by eye width
  const eyeWidth = Math.hypot(eyeDx, eyeDy) || 1;
  const noseOffset = (noseTip.x - eyeMid.x) / eyeWidth;
  const yaw = Math.max(-75, Math.min(75, noseOffset * 70));

  // Pitch: vertical position of nose between forehead and chin
  const faceHeight = chin.y - forehead.y || 1;
  const noseRatio = (noseTip.y - forehead.y) / faceHeight;
  const pitch = (noseRatio - 0.45) * 80;

  // Cross-check mouth mid vs eye mid for yaw consistency
  const mouthOffset = (mouthMid.x - eyeMid.x) / eyeWidth;
  const yawBlend = yaw * 0.7 + mouthOffset * 70 * 0.3;

  return {
    yaw: yawBlend,
    pitch,
    roll,
    classification: classifyOrientation(yawBlend, pitch, roll),
  };
}
