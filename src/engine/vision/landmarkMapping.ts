import type { Landmark, LandmarkId, Point2D, Rect } from '@/types';

/**
 * MediaPipe Face Landmarker indices (478 landmarks with iris).
 * Mapping dense mesh indices to named structural landmarks.
 */
export const MP = {
  // Face oval samples
  foreheadTop: 10,
  chin: 152,
  leftCheek: 234,
  rightCheek: 454,
  leftTemple: 127,
  rightTemple: 356,
  leftJaw: 172,
  rightJaw: 397,

  // Eyes
  leftEyeOuter: 33,
  leftEyeInner: 133,
  rightEyeInner: 362,
  rightEyeOuter: 263,
  leftUpperEyelid: 159,
  leftLowerEyelid: 145,
  rightUpperEyelid: 386,
  rightLowerEyelid: 374,

  // Brows
  leftBrowInner: 107,
  leftBrowOuter: 70,
  rightBrowInner: 336,
  rightBrowOuter: 300,

  // Nose
  noseBridge: 6,
  noseTip: 1,
  noseBottom: 2,
  noseLeft: 98,
  noseRight: 327,

  // Mouth
  upperLip: 13,
  lowerLip: 14,
  leftMouth: 61,
  rightMouth: 291,
} as const;

type RawLandmark = { x: number; y: number; z?: number };

function avg(points: Point2D[]): Point2D {
  const n = points.length || 1;
  return {
    x: points.reduce((s, p) => s + p.x, 0) / n,
    y: points.reduce((s, p) => s + p.y, 0) / n,
  };
}

function pt(raw: RawLandmark[], index: number): Point2D {
  const p = raw[index];
  if (!p) return { x: 0.5, y: 0.5 };
  return { x: p.x, y: p.y };
}

function make(
  id: LandmarkId,
  p: Point2D,
  confidence: number,
  estimated = false,
): Landmark {
  return { id, x: p.x, y: p.y, confidence, estimated };
}

/**
 * Map MediaPipe dense landmarks to LOOMIS named landmarks.
 * Hairline is estimated (MediaPipe does not detect hairline reliably).
 */
export function mapMediaPipeLandmarks(
  raw: RawLandmark[],
  faceConfidence: number,
): Landmark[] {
  if (raw.length < 468) return [];

  const chin = pt(raw, MP.chin);
  const forehead = pt(raw, MP.foreheadTop);
  const leftEyeOuter = pt(raw, MP.leftEyeOuter);
  const rightEyeOuter = pt(raw, MP.rightEyeOuter);
  const leftEyeInner = pt(raw, MP.leftEyeInner);
  const rightEyeInner = pt(raw, MP.rightEyeInner);
  const noseTip = pt(raw, MP.noseTip);
  const noseBottom = pt(raw, MP.noseBottom);
  const noseBridge = pt(raw, MP.noseBridge);

  const browCenter = avg([
    pt(raw, MP.leftBrowInner),
    pt(raw, MP.rightBrowInner),
  ]);

  // Estimate hairline: extend from brow through forehead by ~same brow-to-forehead distance
  const browToForehead = {
    x: forehead.x - browCenter.x,
    y: forehead.y - browCenter.y,
  };
  const hairline: Point2D = {
    x: forehead.x + browToForehead.x * 0.85,
    y: Math.max(0.02, forehead.y + browToForehead.y * 0.85),
  };

  const faceCenter = avg([browCenter, noseBridge, noseTip, chin]);

  const c = faceConfidence;

  return [
    make('hairline', hairline, c * 0.55, true),
    make('forehead', forehead, c * 0.9),
    make('browCenter', browCenter, c * 0.95),
    make('noseBridge', noseBridge, c * 0.95),
    make('noseTip', noseTip, c * 0.95),
    make('noseBottom', noseBottom, c * 0.9),
    make('chin', chin, c * 0.95),
    make('leftEyeOuter', leftEyeOuter, c * 0.95),
    make('leftEyeInner', leftEyeInner, c * 0.95),
    make('rightEyeInner', rightEyeInner, c * 0.95),
    make('rightEyeOuter', rightEyeOuter, c * 0.95),
    make('leftUpperEyelid', pt(raw, MP.leftUpperEyelid), c * 0.9),
    make('leftLowerEyelid', pt(raw, MP.leftLowerEyelid), c * 0.9),
    make('rightUpperEyelid', pt(raw, MP.rightUpperEyelid), c * 0.9),
    make('rightLowerEyelid', pt(raw, MP.rightLowerEyelid), c * 0.9),
    make('leftMouth', pt(raw, MP.leftMouth), c * 0.95),
    make('rightMouth', pt(raw, MP.rightMouth), c * 0.95),
    make('upperLip', pt(raw, MP.upperLip), c * 0.9),
    make('lowerLip', pt(raw, MP.lowerLip), c * 0.9),
    make('leftCheek', pt(raw, MP.leftCheek), c * 0.85),
    make('rightCheek', pt(raw, MP.rightCheek), c * 0.85),
    make('leftJaw', pt(raw, MP.leftJaw), c * 0.85),
    make('rightJaw', pt(raw, MP.rightJaw), c * 0.85),
    make('leftTemple', pt(raw, MP.leftTemple), c * 0.8),
    make('rightTemple', pt(raw, MP.rightTemple), c * 0.8),
    make('faceCenter', faceCenter, c * 0.9),
  ];
}

export function boundingBoxFromRaw(raw: RawLandmark[]): Rect {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const p of raw) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function rawToPoints(raw: RawLandmark[]): Point2D[] {
  return raw.map((p) => ({ x: p.x, y: p.y }));
}
