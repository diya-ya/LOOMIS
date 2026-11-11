import { describe, expect, it } from 'vitest';
import {
  distance,
  perpendicularDistance,
  parallelLineDistance,
} from './distanceCalculator';
import { convertUnit, normalizedToCanvas } from '../image/imageTransform';
import { fitImageToCanvas } from '../image/imageFitting';

describe('distanceCalculator', () => {
  it('computes euclidean distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5);
  });

  it('computes perpendicular distance to a line', () => {
    const d = perpendicularDistance({ x: 0, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(d).toBeCloseTo(5);
  });

  it('computes parallel line distance via midpoints', () => {
    const d = parallelLineDistance(
      { start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
      { start: { x: 0, y: 4 }, end: { x: 10, y: 4 } },
    );
    expect(d).toBeCloseTo(4);
  });
});

describe('unit conversion', () => {
  it('converts cm to inches and mm', () => {
    expect(convertUnit(2.54, 'cm', 'in')).toBeCloseTo(1);
    expect(convertUnit(1, 'cm', 'mm')).toBeCloseTo(10);
    expect(convertUnit(1, 'in', 'cm')).toBeCloseTo(2.54);
  });
});

describe('coordinate transforms', () => {
  it('maps normalized landmarks to canvas via fitting', () => {
    const image = { width: 1000, height: 1000 };
    const canvas = { width: 30, height: 40 };
    const fit = fitImageToCanvas(image, canvas);
    const p = normalizedToCanvas({ x: 0.5, y: 0.5 }, image, fit);
    expect(p.x).toBeCloseTo(fit.x + fit.width / 2);
    expect(p.y).toBeCloseTo(fit.y + fit.height / 2);
  });
});
