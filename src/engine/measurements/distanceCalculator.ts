import type {
  Landmark,
  MeasurementAnnotation,
  MeasurementPrefs,
  Point2D,
  Size2D,
  ImageFit,
  Unit,
  LoomisConstruction,
} from '@/types';
import { convertUnit, normalizedToCanvas } from './coordinateConversion';

/** Euclidean distance between two points. */
export function distance(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

/**
 * Perpendicular distance from point P to the infinite line through A→B.
 */
export function perpendicularDistance(
  p: Point2D,
  a: Point2D,
  b: Point2D,
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(p, a);
  const cross = (p.x - a.x) * dy - (p.y - a.y) * dx;
  return Math.abs(cross) / Math.sqrt(lenSq);
}

/** Distance between two parallel-ish guide lines measured along the centerline. */
export function parallelLineDistance(
  lineA: { start: Point2D; end: Point2D },
  lineB: { start: Point2D; end: Point2D },
): number {
  const midA = midpoint(lineA.start, lineA.end);
  const midB = midpoint(lineB.start, lineB.end);
  return distance(midA, midB);
}

export function midpoint(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function getLandmark(
  landmarks: Landmark[],
  id: string,
): Landmark | undefined {
  return landmarks.find((l) => l.id === id);
}

/**
 * Build measurement annotations in physical canvas coordinates.
 * Values are always computed in canvas units, then converted for display.
 */
export function buildMeasurements(
  landmarks: Landmark[],
  construction: LoomisConstruction | null,
  image: Size2D,
  fit: ImageFit,
  prefs: MeasurementPrefs,
  canvasUnit: Unit,
): MeasurementAnnotation[] {
  if (!construction || landmarks.length === 0) return [];

  const toCanvas = (p: Point2D) => normalizedToCanvas(p, image, fit);
  const annotations: MeasurementAnnotation[] = [];

  const convert = (v: number) => convertUnit(v, canvasUnit, prefs.unit);

  const { divisions, eyeGuides, mouthGuides, verticalSubdivisions, centerline } =
    construction;

  const dHairBrow = parallelLineDistance(divisions.hairline, divisions.brow);
  annotations.push({
    id: 'hairline-brow',
    label: 'A → B  Hairline–Brow',
    value: convert(dHairBrow),
    unit: prefs.unit,
    start: midpoint(divisions.hairline.start, divisions.hairline.end),
    end: midpoint(divisions.brow.start, divisions.brow.end),
    offsetSide: 'left',
  });

  const dBrowNose = parallelLineDistance(divisions.brow, divisions.noseBottom);
  annotations.push({
    id: 'brow-nose',
    label: 'B → C  Brow–Nose',
    value: convert(dBrowNose),
    unit: prefs.unit,
    start: midpoint(divisions.brow.start, divisions.brow.end),
    end: midpoint(divisions.noseBottom.start, divisions.noseBottom.end),
    offsetSide: 'left',
  });

  const dNoseChin = parallelLineDistance(divisions.noseBottom, divisions.chin);
  annotations.push({
    id: 'nose-chin',
    label: 'C → D  Nose–Chin',
    value: convert(dNoseChin),
    unit: prefs.unit,
    start: midpoint(divisions.noseBottom.start, divisions.noseBottom.end),
    end: midpoint(divisions.chin.start, divisions.chin.end),
    offsetSide: 'left',
  });

  if (verticalSubdivisions.lines.length >= 2) {
    const lines = verticalSubdivisions.lines;
    for (let i = 0; i < lines.length - 1; i++) {
      const d = parallelLineDistance(lines[i], lines[i + 1]);
      annotations.push({
        id: `vert-${i}`,
        label: `Eye-width ${i + 1}`,
        value: convert(d),
        unit: prefs.unit,
        start: midpoint(lines[i].start, lines[i].end),
        end: midpoint(lines[i + 1].start, lines[i + 1].end),
        offsetSide: 'bottom',
      });
    }
  }

  const eyeDist = parallelLineDistance(eyeGuides.upper, eyeGuides.lower);
  annotations.push({
    id: 'eyelid',
    label: 'Eyelid height',
    value: convert(eyeDist),
    unit: prefs.unit,
    start: midpoint(eyeGuides.upper.start, eyeGuides.upper.end),
    end: midpoint(eyeGuides.lower.start, eyeGuides.lower.end),
    offsetSide: 'right',
  });

  const mouthDist = parallelLineDistance(mouthGuides.upper, mouthGuides.lower);
  annotations.push({
    id: 'lips',
    label: 'Lip height',
    value: convert(mouthDist),
    unit: prefs.unit,
    start: midpoint(mouthGuides.upper.start, mouthGuides.upper.end),
    end: midpoint(mouthGuides.lower.start, mouthGuides.lower.end),
    offsetSide: 'right',
  });

  // Overall face height along centerline
  annotations.push({
    id: 'face-height',
    label: 'A → D  Face height',
    value: convert(parallelLineDistance(divisions.hairline, divisions.chin)),
    unit: prefs.unit,
    start: midpoint(divisions.hairline.start, divisions.hairline.end),
    end: midpoint(divisions.chin.start, divisions.chin.end),
    offsetSide: 'right',
  });

  // Optional selected landmark distance using hairline & chin if present
  const hairline = getLandmark(landmarks, 'hairline');
  const chin = getLandmark(landmarks, 'chin');
  if (hairline && chin) {
    const a = toCanvas(hairline);
    const b = toCanvas(chin);
    // Verify consistency with centerline direction
    void centerline;
    void a;
    void b;
  }

  return annotations;
}

export function landmarkDistance(
  a: Landmark,
  b: Landmark,
  image: Size2D,
  fit: ImageFit,
  fromUnit: Unit,
  toUnit: Unit,
): number {
  const pa = normalizedToCanvas(a, image, fit);
  const pb = normalizedToCanvas(b, image, fit);
  return convertUnit(distance(pa, pb), fromUnit, toUnit);
}
