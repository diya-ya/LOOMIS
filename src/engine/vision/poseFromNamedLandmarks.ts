import type { FacePose, Landmark, LandmarkId, Point2D } from '@/types';
import { estimateOrientationFromLandmarks } from './orientationEstimator';

function pt(landmarks: Landmark[], id: LandmarkId, fallback: Point2D): Point2D {
  const l = landmarks.find((x) => x.id === id);
  return l ? { x: l.x, y: l.y } : fallback;
}

/**
 * Re-estimate orientation from the current named landmark set.
 * Used after detection and after manual landmark corrections so
 * construction stays consistent without re-running MediaPipe.
 */
export function poseFromNamedLandmarks(landmarks: Landmark[]): FacePose {
  if (landmarks.length === 0) {
    return {
      yaw: 0,
      pitch: 0,
      roll: 0,
      classification: 'uncertain',
      rollConfidence: 0,
      yawConfidence: 0,
      pitchConfidence: 0,
    };
  }

  const leftBrowInner = pt(landmarks, 'browCenter', { x: 0.48, y: 0.36 });
  const rightBrowInner = pt(landmarks, 'browCenter', { x: 0.52, y: 0.36 });

  // Approximate brow laterals from temples when dedicated brow L/R aren't named
  const leftTemple = pt(landmarks, 'leftTemple', { x: 0.3, y: 0.35 });
  const rightTemple = pt(landmarks, 'rightTemple', { x: 0.7, y: 0.35 });

  const est = estimateOrientationFromLandmarks({
    leftEyeOuter: pt(landmarks, 'leftEyeOuter', { x: 0.35, y: 0.44 }),
    leftEyeInner: pt(landmarks, 'leftEyeInner', { x: 0.42, y: 0.44 }),
    rightEyeInner: pt(landmarks, 'rightEyeInner', { x: 0.58, y: 0.44 }),
    rightEyeOuter: pt(landmarks, 'rightEyeOuter', { x: 0.65, y: 0.44 }),
    leftBrow: {
      x: (leftBrowInner.x + leftTemple.x) / 2,
      y: (leftBrowInner.y + leftTemple.y) / 2,
    },
    rightBrow: {
      x: (rightBrowInner.x + rightTemple.x) / 2,
      y: (rightBrowInner.y + rightTemple.y) / 2,
    },
    mouthLeft: pt(landmarks, 'leftMouth', { x: 0.4, y: 0.7 }),
    mouthRight: pt(landmarks, 'rightMouth', { x: 0.6, y: 0.7 }),
    noseTip: pt(landmarks, 'noseTip', { x: 0.5, y: 0.55 }),
    noseBridge: pt(landmarks, 'noseBridge', { x: 0.5, y: 0.45 }),
    chin: pt(landmarks, 'chin', { x: 0.5, y: 0.85 }),
    forehead: pt(landmarks, 'forehead', { x: 0.5, y: 0.22 }),
    leftCheek: pt(landmarks, 'leftCheek', { x: 0.28, y: 0.55 }),
    rightCheek: pt(landmarks, 'rightCheek', { x: 0.72, y: 0.55 }),
  });

  return est;
}
