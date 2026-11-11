import { describe, expect, it } from 'vitest';
import { computeFacialDivisions } from './facialDivisions';
import { computeCenterline } from './centerline';
import { computeVerticalSubdivisions } from '../loomis/verticalSubdivisions';
import type { FacePose, Landmark, LandmarkId } from '@/types';
import { fitImageToCanvas } from '../image/imageFitting';
import { mid } from './helpers';
import { lineAngleDeg } from './faceFrame';

const pose: FacePose = {
  yaw: 0,
  pitch: 0,
  roll: 0,
  classification: 'frontal',
};

function lm(id: LandmarkId, x: number, y: number): Landmark {
  return { id, x, y, confidence: 0.95 };
}

const landmarks: Landmark[] = [
  lm('hairline', 0.5, 0.2),
  lm('browCenter', 0.5, 0.4),
  lm('noseBottom', 0.5, 0.6),
  lm('chin', 0.5, 0.8),
  lm('leftTemple', 0.3, 0.35),
  lm('rightTemple', 0.7, 0.35),
  lm('leftCheek', 0.28, 0.55),
  lm('rightCheek', 0.72, 0.55),
  lm('leftEyeOuter', 0.35, 0.42),
  lm('rightEyeOuter', 0.65, 0.42),
  lm('leftEyeInner', 0.42, 0.42),
  lm('rightEyeInner', 0.58, 0.42),
  lm('noseBridge', 0.5, 0.48),
  lm('noseTip', 0.5, 0.55),
  lm('forehead', 0.5, 0.22),
];

describe('facial divisions', () => {
  it('creates four primary division lines', () => {
    const image = { width: 1000, height: 1200 };
    const fit = fitImageToCanvas(image, { width: 30, height: 40 });
    const div = computeFacialDivisions(landmarks, pose, image, fit, 10);
    expect(div.hairline.id).toBe('div-A');
    expect(div.brow.id).toBe('div-B');
    expect(div.noseBottom.id).toBe('div-C');
    expect(div.chin.id).toBe('div-D');
  });

  it('keeps upright divisions horizontal', () => {
    const image = { width: 1000, height: 1200 };
    const fit = fitImageToCanvas(image, { width: 30, height: 40 });
    const div = computeFacialDivisions(landmarks, pose, image, fit, 10);
    expect(Math.abs(lineAngleDeg(div.brow.start, div.brow.end))).toBeLessThan(0.5);
  });

  it('tilts centerline with roll', () => {
    const image = { width: 1000, height: 1200 };
    const fit = fitImageToCanvas(image, { width: 30, height: 40 });
    const tilted: FacePose = { ...pose, roll: 20 };
    const line = computeCenterline(landmarks, tilted, image, fit);
    const angle = lineAngleDeg(line.start, line.end);
    // Down axis at 20° roll → centerline ≈ 110° from +X (or -70)
    const fromVertical = Math.min(Math.abs(angle - 110), Math.abs(angle + 70));
    expect(fromVertical).toBeLessThan(3);
  });

  it('generates four parallel vertical subdivisions', () => {
    const image = { width: 1000, height: 1200 };
    const fit = fitImageToCanvas(image, { width: 30, height: 40 });
    const div = computeFacialDivisions(landmarks, pose, image, fit, 10);
    const top = mid(div.hairline.start, div.hairline.end);
    const bottom = mid(div.chin.start, div.chin.end);
    const verts = computeVerticalSubdivisions(
      landmarks,
      pose,
      image,
      fit,
      top,
      bottom,
    );
    expect(verts.lines).toHaveLength(4);
    const angles = verts.lines.map((l) => lineAngleDeg(l.start, l.end));
    for (let i = 1; i < angles.length; i++) {
      expect(Math.abs(angles[i] - angles[0])).toBeLessThan(0.5);
    }
  });
});
