import { describe, expect, it } from 'vitest';
import {
  applyRollDeadzone,
  DEFAULT_ORIENTATION_CONFIG,
} from './orientationConfig';
import {
  classifyOrientation,
  combineOrientation,
  estimateOrientationFromLandmarks,
  estimateRollFromPairs,
  pairRollDeg,
  poseFromMatrix,
  weightedCircularMeanDeg,
} from './orientationEstimator';

describe('applyRollDeadzone', () => {
  it('zeros roll within 0–2°', () => {
    expect(applyRollDeadzone(0)).toBe(0);
    expect(applyRollDeadzone(1.5)).toBe(0);
    expect(applyRollDeadzone(-1.9)).toBe(0);
  });

  it('softly applies roll between 2–5°', () => {
    const v = applyRollDeadzone(3.5);
    expect(Math.abs(v)).toBeGreaterThan(0);
    expect(Math.abs(v)).toBeLessThan(3.5);
  });

  it('applies full roll above 5°', () => {
    expect(applyRollDeadzone(10)).toBeCloseTo(10);
    expect(applyRollDeadzone(-12)).toBeCloseTo(-12);
  });
});

describe('pairRollDeg / circular mean', () => {
  it('returns ~0 for a horizontal pair', () => {
    expect(pairRollDeg({ x: 0.3, y: 0.4 }, { x: 0.7, y: 0.4 })).toBeCloseTo(0, 5);
  });

  it('returns ~10° for a tilted pair', () => {
    const dy = Math.tan((10 * Math.PI) / 180) * 0.4;
    expect(
      pairRollDeg({ x: 0.3, y: 0.4 }, { x: 0.7, y: 0.4 + dy }),
    ).toBeCloseTo(10, 0);
  });

  it('computes weighted circular mean', () => {
    const mean = weightedCircularMeanDeg([2, -2, 0], [1, 1, 1]);
    expect(mean).toBeCloseTo(0, 5);
  });
});

describe('estimateRollFromPairs', () => {
  it('rejects outlier pairs', () => {
    const result = estimateRollFromPairs([
      {
        id: 'a',
        left: { x: 0, y: 0 },
        right: { x: 1, y: 0 },
        weight: 1,
      },
      {
        id: 'b',
        left: { x: 0, y: 0 },
        right: { x: 1, y: 0.01 },
        weight: 1,
      },
      {
        id: 'outlier',
        left: { x: 0, y: 0 },
        right: { x: 1, y: 0.5 },
        weight: 1,
      },
    ]);
    expect(result.pairs.find((p) => p.id === 'outlier')?.rejected).toBe(true);
    expect(Math.abs(result.rawRoll)).toBeLessThan(2);
  });
});

describe('estimateOrientationFromLandmarks', () => {
  const upright = {
    leftEyeOuter: { x: 0.35, y: 0.4 },
    leftEyeInner: { x: 0.42, y: 0.4 },
    rightEyeInner: { x: 0.58, y: 0.4 },
    rightEyeOuter: { x: 0.65, y: 0.4 },
    leftBrow: { x: 0.36, y: 0.35 },
    rightBrow: { x: 0.64, y: 0.35 },
    mouthLeft: { x: 0.42, y: 0.68 },
    mouthRight: { x: 0.58, y: 0.68 },
    noseTip: { x: 0.5, y: 0.55 },
    noseBridge: { x: 0.5, y: 0.45 },
    chin: { x: 0.5, y: 0.85 },
    forehead: { x: 0.5, y: 0.2 },
  };

  it('treats upright frontal face as zero roll', () => {
    const est = estimateOrientationFromLandmarks(upright);
    expect(est.roll).toBe(0);
    expect(Math.abs(est.rawRoll)).toBeLessThan(
      DEFAULT_ORIENTATION_CONFIG.rollDeadzoneDeg,
    );
    expect(est.classification).toBe('frontal');
  });

  it('does not exaggerate slight natural asymmetry', () => {
    const asymmetric = {
      ...upright,
      leftEyeOuter: { x: 0.35, y: 0.401 },
      rightEyeOuter: { x: 0.65, y: 0.399 },
      mouthLeft: { x: 0.42, y: 0.681 },
      mouthRight: { x: 0.58, y: 0.679 },
    };
    const est = estimateOrientationFromLandmarks(asymmetric);
    expect(est.roll).toBe(0);
  });

  it('follows ~10° head tilt', () => {
    const tilt = (p: { x: number; y: number }, deg: number) => {
      const rad = (deg * Math.PI) / 180;
      const cx = 0.5;
      const cy = 0.5;
      const dx = p.x - cx;
      const dy = p.y - cy;
      return {
        x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
        y: cy + dx * Math.sin(rad) + dy * Math.cos(rad),
      };
    };
    const tilted = {
      leftEyeOuter: tilt(upright.leftEyeOuter, 10),
      leftEyeInner: tilt(upright.leftEyeInner, 10),
      rightEyeInner: tilt(upright.rightEyeInner, 10),
      rightEyeOuter: tilt(upright.rightEyeOuter, 10),
      leftBrow: tilt(upright.leftBrow, 10),
      rightBrow: tilt(upright.rightBrow, 10),
      mouthLeft: tilt(upright.mouthLeft, 10),
      mouthRight: tilt(upright.mouthRight, 10),
      noseTip: tilt(upright.noseTip, 10),
      noseBridge: tilt(upright.noseBridge, 10),
      chin: tilt(upright.chin, 10),
      forehead: tilt(upright.forehead, 10),
    };
    const est = estimateOrientationFromLandmarks(tilted);
    expect(est.roll).toBeGreaterThan(5);
    expect(est.roll).toBeLessThan(15);
  });

  it('does not mistake pitch for roll', () => {
    const lookingUp = {
      ...upright,
      noseTip: { x: 0.5, y: 0.48 },
      forehead: { x: 0.5, y: 0.18 },
      chin: { x: 0.5, y: 0.88 },
    };
    const est = estimateOrientationFromLandmarks(lookingUp);
    expect(est.roll).toBe(0);
    expect(est.pitch).not.toBe(0);
  });

  it('detects yaw for three-quarter without inventing roll', () => {
    const turned = {
      ...upright,
      noseTip: { x: 0.58, y: 0.55 },
      noseBridge: { x: 0.56, y: 0.45 },
      leftEyeOuter: { x: 0.38, y: 0.4 },
      rightEyeOuter: { x: 0.62, y: 0.4 },
      mouthLeft: { x: 0.46, y: 0.68 },
      mouthRight: { x: 0.6, y: 0.68 },
    };
    const est = estimateOrientationFromLandmarks(turned);
    expect(est.roll).toBe(0);
    expect(Math.abs(est.yaw)).toBeGreaterThan(5);
  });
});

describe('combineOrientation', () => {
  it('prefers landmark roll over noisy matrix roll', () => {
    const landmark = estimateOrientationFromLandmarks({
      leftEyeOuter: { x: 0.35, y: 0.4 },
      leftEyeInner: { x: 0.42, y: 0.4 },
      rightEyeInner: { x: 0.58, y: 0.4 },
      rightEyeOuter: { x: 0.65, y: 0.4 },
      mouthLeft: { x: 0.42, y: 0.68 },
      mouthRight: { x: 0.58, y: 0.68 },
      noseTip: { x: 0.5, y: 0.55 },
      chin: { x: 0.5, y: 0.85 },
      forehead: { x: 0.5, y: 0.2 },
    });
    const combined = combineOrientation(landmark, {
      yaw: 5,
      pitch: -2,
      roll: 18, // spurious matrix roll
    });
    expect(combined.roll).toBe(0);
    expect(combined.notes.some((n) => n.includes('disagreed'))).toBe(true);
  });
});

describe('poseFromMatrix / classify', () => {
  it('extracts finite angles from identity-like matrix', () => {
    // Column-major identity 4x4
    const m = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const pose = poseFromMatrix(m);
    expect(Number.isFinite(pose.yaw)).toBe(true);
    expect(Number.isFinite(pose.pitch)).toBe(true);
    expect(Number.isFinite(pose.roll)).toBe(true);
  });

  it('classifies yaw bands', () => {
    expect(classifyOrientation(0, 0, 0)).toBe('frontal');
    expect(classifyOrientation(20, 0, 0)).toBe('slightly-turned');
    expect(classifyOrientation(40, 0, 0)).toBe('three-quarter');
    expect(classifyOrientation(70, 0, 0)).toBe('profile');
  });
});
