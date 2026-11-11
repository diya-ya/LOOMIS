import { describe, expect, it } from 'vitest';
import type { FacePose, Landmark, LandmarkId } from '@/types';
import { fitImageToCanvas } from '@/engine/image/imageFitting';
import { buildLoomisConstruction } from '@/engine/loomis/primaryGuides';
import {
  buildFaceFrame,
  fromLocal,
  lineAngleDeg,
  toLocal,
} from './faceFrame';
import { poseFromNamedLandmarks } from '@/engine/vision/poseFromNamedLandmarks';

function lm(id: LandmarkId, x: number, y: number): Landmark {
  return { id, x, y, confidence: 0.95 };
}

function uprightLandmarks(asymmetry = 0): Landmark[] {
  return [
    lm('hairline', 0.5, 0.18),
    lm('forehead', 0.5, 0.22),
    lm('browCenter', 0.5, 0.36),
    lm('noseBridge', 0.5, 0.45),
    lm('noseTip', 0.5, 0.55),
    lm('noseBottom', 0.5, 0.58),
    lm('chin', 0.5, 0.85),
    lm('leftEyeOuter', 0.35, 0.42 + asymmetry),
    lm('leftEyeInner', 0.42, 0.42),
    lm('rightEyeInner', 0.58, 0.42),
    lm('rightEyeOuter', 0.65, 0.42 - asymmetry),
    lm('leftUpperEyelid', 0.38, 0.405),
    lm('leftLowerEyelid', 0.38, 0.435),
    lm('rightUpperEyelid', 0.62, 0.405),
    lm('rightLowerEyelid', 0.62, 0.435),
    lm('leftMouth', 0.42, 0.7),
    lm('rightMouth', 0.58, 0.7),
    lm('upperLip', 0.5, 0.68),
    lm('lowerLip', 0.5, 0.72),
    lm('leftTemple', 0.28, 0.35),
    lm('rightTemple', 0.72, 0.35),
    lm('leftCheek', 0.28, 0.55),
    lm('rightCheek', 0.72, 0.55),
    lm('leftJaw', 0.32, 0.72),
    lm('rightJaw', 0.68, 0.72),
    lm('faceCenter', 0.5, 0.5),
  ];
}

function rotateAll(landmarks: Landmark[], deg: number): Landmark[] {
  const rad = (deg * Math.PI) / 180;
  const cx = 0.5;
  const cy = 0.5;
  return landmarks.map((l) => {
    const dx = l.x - cx;
    const dy = l.y - cy;
    return {
      ...l,
      x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
      y: cy + dx * Math.sin(rad) + dy * Math.cos(rad),
    };
  });
}

const image = { width: 1000, height: 1200 };
const fit = fitImageToCanvas(image, { width: 30, height: 40 });

function angleNear(actual: number, expected: number, tol = 1.5) {
  let d = actual - expected;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  expect(Math.abs(d)).toBeLessThan(tol);
}

describe('face frame + construction orientation', () => {
  it('keeps upright frontal guides free of artificial rotation', () => {
    const landmarks = uprightLandmarks();
    const pose = poseFromNamedLandmarks(landmarks);
    expect(pose.roll).toBe(0);

    const construction = buildLoomisConstruction(landmarks, pose, image, fit);
    const browAngle = lineAngleDeg(
      construction.divisions.brow.start,
      construction.divisions.brow.end,
    );
    const hairAngle = lineAngleDeg(
      construction.divisions.hairline.start,
      construction.divisions.hairline.end,
    );
    angleNear(browAngle, 0, 0.75);
    angleNear(hairAngle, 0, 0.75);

    // Primary horizontals are parallel
    expect(Math.abs(browAngle - hairAngle)).toBeLessThan(0.5);

    // Verticals nearly vertical
    for (const line of construction.verticalSubdivisions.lines) {
      const a = lineAngleDeg(line.start, line.end);
      // vertical line ≈ ±90°
      const fromVertical = Math.min(Math.abs(a - 90), Math.abs(a + 90));
      expect(fromVertical).toBeLessThan(1);
    }
  });

  it('does not exaggerate slight asymmetry into roll', () => {
    const landmarks = uprightLandmarks(0.002);
    const pose = poseFromNamedLandmarks(landmarks);
    expect(pose.roll).toBe(0);
    const construction = buildLoomisConstruction(landmarks, pose, image, fit);
    angleNear(
      lineAngleDeg(
        construction.divisions.brow.start,
        construction.divisions.brow.end,
      ),
      0,
      1,
    );
  });

  it('tilts guides with a ~10° head roll', () => {
    const landmarks = rotateAll(uprightLandmarks(), 10);
    const pose = poseFromNamedLandmarks(landmarks);
    expect(pose.roll).toBeGreaterThan(5);

    const construction = buildLoomisConstruction(landmarks, pose, image, fit);
    const browAngle = lineAngleDeg(
      construction.divisions.brow.start,
      construction.divisions.brow.end,
    );
    angleNear(browAngle, pose.roll, 2);

    const vert = construction.verticalSubdivisions.lines[0];
    const vertAngle = lineAngleDeg(vert.start, vert.end);
    angleNear(vertAngle, pose.roll + 90, 2.5);
  });

  it('adapts side plane for three-quarter yaw without inventing roll', () => {
    const landmarks = uprightLandmarks().map((l) => {
      if (l.id === 'noseTip' || l.id === 'noseBridge' || l.id === 'noseBottom') {
        return { ...l, x: l.x + 0.06 };
      }
      return l;
    });
    const pose: FacePose = {
      ...poseFromNamedLandmarks(landmarks),
      yaw: 35,
      classification: 'three-quarter',
    };
    expect(Math.abs(pose.roll)).toBeLessThan(2);
    const construction = buildLoomisConstruction(landmarks, pose, image, fit);
    expect(construction.sidePlane.visible).toBe(true);
    angleNear(
      lineAngleDeg(
        construction.divisions.brow.start,
        construction.divisions.brow.end,
      ),
      0,
      1.5,
    );
  });

  it('keeps pitch from contaminating roll', () => {
    const landmarks = uprightLandmarks().map((l) => {
      if (l.id === 'noseTip') return { ...l, y: 0.5 };
      if (l.id === 'forehead') return { ...l, y: 0.16 };
      return l;
    });
    const pose = poseFromNamedLandmarks(landmarks);
    expect(pose.roll).toBe(0);
    const construction = buildLoomisConstruction(landmarks, pose, image, fit);
    angleNear(
      lineAngleDeg(
        construction.centerline.start,
        construction.centerline.end,
      ),
      90,
      2,
    );
  });

  it('round-trips local ↔ canvas coordinates', () => {
    const pose: FacePose = {
      yaw: 0,
      pitch: 0,
      roll: 15,
      classification: 'frontal',
    };
    const frame = buildFaceFrame(uprightLandmarks(), pose, image, fit);
    const p = { x: 12, y: 18 };
    const local = toLocal(frame, p);
    const back = fromLocal(frame, local);
    expect(back.x).toBeCloseTo(p.x, 6);
    expect(back.y).toBeCloseTo(p.y, 6);
  });

  it('keeps guides aligned across different image aspect ratios', () => {
    const landmarks = uprightLandmarks();
    const pose = poseFromNamedLandmarks(landmarks);
    const wide = { width: 1920, height: 1080 };
    const tall = { width: 800, height: 1200 };
    const fitWide = fitImageToCanvas(wide, { width: 40, height: 30 });
    const fitTall = fitImageToCanvas(tall, { width: 30, height: 40 });

    const a = buildLoomisConstruction(landmarks, pose, wide, fitWide);
    const b = buildLoomisConstruction(landmarks, pose, tall, fitTall);

    angleNear(
      lineAngleDeg(a.divisions.brow.start, a.divisions.brow.end),
      0,
      1,
    );
    angleNear(
      lineAngleDeg(b.divisions.brow.start, b.divisions.brow.end),
      0,
      1,
    );
  });

  it('updates geometry after manual landmark adjustment', () => {
    const landmarks = uprightLandmarks();
    const pose0 = poseFromNamedLandmarks(landmarks);
    const before = buildLoomisConstruction(landmarks, pose0, image, fit);

    const moved = landmarks.map((l) =>
      l.id === 'browCenter' ? { ...l, y: l.y + 0.04, manual: true } : l,
    );
    const pose1 = poseFromNamedLandmarks(moved);
    const after = buildLoomisConstruction(moved, pose1, image, fit);

    expect(after.divisions.brow.start.y).not.toBeCloseTo(
      before.divisions.brow.start.y,
      3,
    );
  });
});
