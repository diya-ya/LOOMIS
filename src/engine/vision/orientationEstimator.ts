import type { FaceOrientationClass, FacePose, Point2D } from '@/types';
import {
  applyRollDeadzone,
  DEFAULT_ORIENTATION_CONFIG,
  type OrientationConfig,
} from './orientationConfig';

export type RollPairEstimate = {
  id: string;
  angleDeg: number;
  weight: number;
  rejected?: boolean;
};

export type OrientationEstimate = FacePose & {
  /** Raw roll before deadzone (degrees). */
  rawRoll: number;
  /** Confidence 0–1 for the applied roll. */
  rollConfidence: number;
  /** Confidence 0–1 for yaw. */
  yawConfidence: number;
  /** Confidence 0–1 for pitch. */
  pitchConfidence: number;
  /** Individual bilateral pair estimates used for roll. */
  rollPairs: RollPairEstimate[];
  /** Human-readable notes / warnings. */
  notes: string[];
};

export function classifyOrientation(
  yaw: number,
  pitch: number,
  _roll: number,
): FaceOrientationClass {
  const absYaw = Math.abs(yaw);
  if (Math.abs(pitch) > 55 && absYaw < 20) return 'uncertain';
  if (absYaw < 12) return 'frontal';
  if (absYaw < 25) return 'slightly-turned';
  if (absYaw < 55) return 'three-quarter';
  if (absYaw < 90) return 'profile';
  return 'uncertain';
}

/** Angle of the vector from left → right landmark, in degrees (0 = horizontal). */
export function pairRollDeg(left: Point2D, right: Point2D): number {
  return (Math.atan2(right.y - left.y, right.x - left.x) * 180) / Math.PI;
}

function mid(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function hypot(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Circular mean of angles in degrees, weighted.
 * Returns null if no weights.
 */
export function weightedCircularMeanDeg(
  angles: number[],
  weights: number[],
): number | null {
  let sx = 0;
  let sy = 0;
  let wSum = 0;
  for (let i = 0; i < angles.length; i++) {
    const w = weights[i] ?? 0;
    if (w <= 0) continue;
    const rad = (angles[i] * Math.PI) / 180;
    sx += Math.cos(rad) * w;
    sy += Math.sin(rad) * w;
    wSum += w;
  }
  if (wSum <= 0) return null;
  return (Math.atan2(sy / wSum, sx / wSum) * 180) / Math.PI;
}

/** Median of angles in degrees (linear; fine for near-zero facial roll). */
function medianDeg(angles: number[]): number {
  if (angles.length === 0) return 0;
  const sorted = [...angles].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function angleDeltaDeg(a: number, b: number): number {
  let d = a - b;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

/**
 * Robust multi-pair roll estimation.
 * Uses median consensus first so a single outlier cannot pull the mean,
 * then rejects pairs that disagree beyond the configured threshold.
 */
export function estimateRollFromPairs(
  pairs: { id: string; left: Point2D; right: Point2D; weight: number }[],
  config: OrientationConfig = DEFAULT_ORIENTATION_CONFIG,
): { rawRoll: number; confidence: number; pairs: RollPairEstimate[] } {
  const estimates: RollPairEstimate[] = pairs
    .filter((p) => hypot(p.left, p.right) > 1e-6)
    .map((p) => ({
      id: p.id,
      angleDeg: pairRollDeg(p.left, p.right),
      weight: p.weight,
    }));

  if (estimates.length === 0) {
    return { rawRoll: 0, confidence: 0, pairs: [] };
  }

  // Median is robust to a single extreme pair
  const median = medianDeg(estimates.map((e) => e.angleDeg));

  const refined = estimates.map((e) => {
    const rejected =
      Math.abs(angleDeltaDeg(e.angleDeg, median)) > config.rollPairOutlierDeg;
    return { ...e, rejected, weight: rejected ? 0 : e.weight };
  });

  const kept = refined.filter((e) => !e.rejected);
  const mean =
    kept.length > 0
      ? (weightedCircularMeanDeg(
          kept.map((e) => e.angleDeg),
          kept.map((e) => e.weight),
        ) ?? median)
      : median;

  const keptCount = kept.length;
  const totalWeight = kept.reduce((s, e) => s + e.weight, 0);
  const maxWeight = pairs.reduce((s, p) => s + p.weight, 0) || 1;

  let confidence = Math.min(1, totalWeight / maxWeight);
  if (keptCount < config.minRollPairs) {
    confidence *= 0.5;
  }

  if (keptCount >= 2) {
    const spreads = kept.map((e) => Math.abs(angleDeltaDeg(e.angleDeg, mean)));
    const avgSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length;
    if (avgSpread > 3) confidence *= Math.max(0.35, 1 - avgSpread / 15);
  }

  return { rawRoll: mean, confidence, pairs: refined };
}

export type LandmarkPoseInput = {
  leftEyeOuter: Point2D;
  leftEyeInner: Point2D;
  rightEyeInner: Point2D;
  rightEyeOuter: Point2D;
  leftBrow?: Point2D;
  rightBrow?: Point2D;
  mouthLeft: Point2D;
  mouthRight: Point2D;
  noseTip: Point2D;
  noseBridge?: Point2D;
  chin: Point2D;
  forehead: Point2D;
  leftCheek?: Point2D;
  rightCheek?: Point2D;
};

/**
 * Estimate yaw from nose offset relative to eye midline (not from slope).
 * Separate from roll.
 */
export function estimateYawFromLandmarks(input: LandmarkPoseInput): {
  yaw: number;
  confidence: number;
} {
  const leftEye = mid(input.leftEyeOuter, input.leftEyeInner);
  const rightEye = mid(input.rightEyeOuter, input.rightEyeInner);
  const eyeMid = mid(leftEye, rightEye);
  const eyeWidth = hypot(leftEye, rightEye) || 1;
  const mouthMid = mid(input.mouthLeft, input.mouthRight);

  const noseRef = input.noseBridge ?? input.noseTip;
  const noseOffset = (noseRef.x - eyeMid.x) / eyeWidth;
  const mouthOffset = (mouthMid.x - eyeMid.x) / eyeWidth;

  // Lateral cheek asymmetry as tertiary signal
  let cheekOffset = 0;
  let cheekW = 0;
  if (input.leftCheek && input.rightCheek) {
    const cheekMid = mid(input.leftCheek, input.rightCheek);
    cheekOffset = (cheekMid.x - eyeMid.x) / eyeWidth;
    cheekW = 0.15;
  }

  const yaw =
    noseOffset * 70 * 0.55 +
    mouthOffset * 70 * 0.3 +
    cheekOffset * 70 * cheekW +
    // residual from nose tip for stronger turns
    ((input.noseTip.x - eyeMid.x) / eyeWidth) * 70 * 0.15;

  const clamped = Math.max(-75, Math.min(75, yaw));

  // Confidence drops when signals disagree
  const signals = [noseOffset * 70, mouthOffset * 70];
  const spread = Math.abs(signals[0] - signals[1]);
  const confidence = Math.max(0.35, 1 - spread / 40);

  return { yaw: clamped, confidence };
}

/**
 * Estimate pitch from vertical landmark proportions (not from slope).
 */
export function estimatePitchFromLandmarks(input: LandmarkPoseInput): {
  pitch: number;
  confidence: number;
} {
  const faceHeight = input.chin.y - input.forehead.y;
  if (Math.abs(faceHeight) < 1e-6) {
    return { pitch: 0, confidence: 0 };
  }

  const noseRatio = (input.noseTip.y - input.forehead.y) / faceHeight;
  const eyeMidY =
    (input.leftEyeOuter.y +
      input.leftEyeInner.y +
      input.rightEyeInner.y +
      input.rightEyeOuter.y) /
    4;
  const eyeRatio = (eyeMidY - input.forehead.y) / faceHeight;

  // Expected frontal ratios (approximate)
  const pitchFromNose = (noseRatio - 0.48) * 90;
  const pitchFromEye = (eyeRatio - 0.36) * 90;
  const pitch = pitchFromNose * 0.65 + pitchFromEye * 0.35;

  const agreement = Math.abs(pitchFromNose - pitchFromEye);
  const confidence = Math.max(0.35, 1 - agreement / 35);

  return {
    pitch: Math.max(-60, Math.min(60, pitch)),
    confidence,
  };
}

/**
 * Full landmark-based orientation with robust roll + separate yaw/pitch.
 */
export function estimateOrientationFromLandmarks(
  input: LandmarkPoseInput,
  config: OrientationConfig = DEFAULT_ORIENTATION_CONFIG,
): OrientationEstimate {
  const notes: string[] = [];

  const leftEyeCenter = mid(input.leftEyeOuter, input.leftEyeInner);
  const rightEyeCenter = mid(input.rightEyeOuter, input.rightEyeInner);

  const rollPairs = [
    {
      id: 'eye-centers',
      left: leftEyeCenter,
      right: rightEyeCenter,
      weight: 1.0,
    },
    {
      id: 'eye-outer',
      left: input.leftEyeOuter,
      right: input.rightEyeOuter,
      weight: 0.85,
    },
    {
      id: 'eye-inner',
      left: input.leftEyeInner,
      right: input.rightEyeInner,
      weight: 0.7,
    },
    {
      id: 'mouth',
      left: input.mouthLeft,
      right: input.mouthRight,
      weight: 0.9,
    },
  ];

  if (input.leftBrow && input.rightBrow) {
    rollPairs.push({
      id: 'brows',
      left: input.leftBrow,
      right: input.rightBrow,
      weight: 0.75,
    });
  }

  const rollEst = estimateRollFromPairs(rollPairs, config);
  const appliedRoll = applyRollDeadzone(rollEst.rawRoll, config);

  if (Math.abs(rollEst.rawRoll) <= config.rollDeadzoneDeg) {
    notes.push(
      `Roll ${rollEst.rawRoll.toFixed(1)}° within deadzone — treated as upright.`,
    );
  } else if (Math.abs(rollEst.rawRoll) < config.rollCautionDeg) {
    notes.push(
      `Roll ${rollEst.rawRoll.toFixed(1)}° in caution range — applied softly as ${appliedRoll.toFixed(1)}°.`,
    );
  }

  if (rollEst.confidence < 0.55) {
    notes.push('Roll confidence is low — verify guide orientation manually.');
  }

  const rejected = rollEst.pairs.filter((p) => p.rejected);
  if (rejected.length > 0) {
    notes.push(
      `Rejected inconsistent roll pairs: ${rejected.map((p) => p.id).join(', ')}.`,
    );
  }

  const yawEst = estimateYawFromLandmarks(input);
  const pitchEst = estimatePitchFromLandmarks(input);

  return {
    yaw: yawEst.yaw,
    pitch: pitchEst.pitch,
    roll: appliedRoll,
    rawRoll: rollEst.rawRoll,
    rollConfidence: rollEst.confidence,
    yawConfidence: yawEst.confidence,
    pitchConfidence: pitchEst.confidence,
    classification: classifyOrientation(yawEst.yaw, pitchEst.pitch, appliedRoll),
    rollPairs: rollEst.pairs,
    notes,
  };
}

/**
 * Extract yaw/pitch from MediaPipe facial transformation matrix.
 * Roll from the matrix is often unreliable for upright photos — callers
 * should prefer landmark-based roll (see combineOrientation).
 */
export function poseFromMatrix(
  matrix: Float32Array | number[],
): Pick<FacePose, 'yaw' | 'pitch' | 'roll'> {
  // Column-major 4x4
  const r00 = matrix[0];
  const r10 = matrix[1];
  const r20 = matrix[2];
  const r21 = matrix[6];
  const r22 = matrix[10];
  const r01 = matrix[4];
  const r02 = matrix[8];
  const r12 = matrix[9];

  // MediaPipe face mesh uses a metric face space; extract with asin-safe pitch
  const pitch = Math.asin(Math.max(-1, Math.min(1, -r20))) * (180 / Math.PI);
  const yaw = Math.atan2(r10, r00) * (180 / Math.PI);
  // Alternate roll from first row / third column — kept for diagnostics only
  const rollA = Math.atan2(r21, r22) * (180 / Math.PI);
  const rollB = Math.atan2(-r01, r02 !== 0 || r12 !== 0 ? Math.hypot(r02, r12) || 1 : 1) * (180 / Math.PI);
  // Prefer the smaller-magnitude candidate when they disagree strongly (noise)
  const roll = Math.abs(rollA) <= Math.abs(rollB) + 5 ? rollA : rollB;

  return { yaw, pitch, roll };
}

/**
 * Combine matrix (yaw/pitch) with robust landmark roll.
 */
export function combineOrientation(
  landmarkEstimate: OrientationEstimate,
  matrixPose: Pick<FacePose, 'yaw' | 'pitch' | 'roll'> | null,
  config: OrientationConfig = DEFAULT_ORIENTATION_CONFIG,
): OrientationEstimate {
  const notes = [...landmarkEstimate.notes];

  if (!matrixPose) {
    return landmarkEstimate;
  }

  // Always prefer landmark roll for in-plane rotation when configured
  const roll = config.preferLandmarkRoll
    ? landmarkEstimate.roll
    : applyRollDeadzone(matrixPose.roll, config);

  if (config.preferLandmarkRoll && Math.abs(matrixPose.roll - landmarkEstimate.rawRoll) > 8) {
    notes.push(
      `Matrix roll (${matrixPose.roll.toFixed(1)}°) disagreed with landmark roll (${landmarkEstimate.rawRoll.toFixed(1)}°) — using landmarks.`,
    );
  }

  // Blend yaw/pitch: matrix is usually better for out-of-plane when available
  const yaw =
    matrixPose.yaw * 0.65 + landmarkEstimate.yaw * 0.35;
  const pitch =
    matrixPose.pitch * 0.65 + landmarkEstimate.pitch * 0.35;

  return {
    ...landmarkEstimate,
    yaw,
    pitch,
    roll,
    classification: classifyOrientation(yaw, pitch, roll),
    yawConfidence: Math.min(1, landmarkEstimate.yawConfidence + 0.15),
    pitchConfidence: Math.min(1, landmarkEstimate.pitchConfidence + 0.15),
    notes,
  };
}

/**
 * Backward-compatible geometric fallback API.
 * @deprecated Prefer estimateOrientationFromLandmarks
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
  const est = estimateOrientationFromLandmarks({
    leftEyeOuter: args.leftEye,
    leftEyeInner: args.leftEye,
    rightEyeInner: args.rightEye,
    rightEyeOuter: args.rightEye,
    mouthLeft: args.mouthLeft,
    mouthRight: args.mouthRight,
    noseTip: args.noseTip,
    chin: args.chin,
    forehead: args.forehead,
  });
  return {
    yaw: est.yaw,
    pitch: est.pitch,
    roll: est.roll,
    classification: est.classification,
  };
}
