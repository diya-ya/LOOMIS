import { describe, expect, it } from 'vitest';
import { fitImageToCanvas, formatAspectRatio, imageAspectRatio } from './imageFitting';

describe('fitImageToCanvas', () => {
  it('fits a wider image than canvas (letterbox vertically)', () => {
    const fit = fitImageToCanvas({ width: 2000, height: 1000 }, { width: 30, height: 40 });
    expect(fit.scale).toBeCloseTo(30 / 2000);
    expect(fit.width).toBeCloseTo(30);
    expect(fit.height).toBeCloseTo(15);
    expect(fit.x).toBeCloseTo(0);
    expect(fit.y).toBeCloseTo(12.5);
  });

  it('fits a taller image than canvas (pillarbox horizontally)', () => {
    const fit = fitImageToCanvas({ width: 1000, height: 2000 }, { width: 30, height: 40 });
    expect(fit.scale).toBeCloseTo(40 / 2000);
    expect(fit.width).toBeCloseTo(20);
    expect(fit.height).toBeCloseTo(40);
    expect(fit.x).toBeCloseTo(5);
    expect(fit.y).toBeCloseTo(0);
  });

  it('handles equal aspect ratios', () => {
    const fit = fitImageToCanvas({ width: 300, height: 400 }, { width: 30, height: 40 });
    expect(fit.scale).toBeCloseTo(0.1);
    expect(fit.width).toBeCloseTo(30);
    expect(fit.height).toBeCloseTo(40);
    expect(fit.x).toBeCloseTo(0);
    expect(fit.y).toBeCloseTo(0);
  });

  it('fits square image on rectangular canvas', () => {
    const fit = fitImageToCanvas({ width: 1000, height: 1000 }, { width: 40, height: 30 });
    expect(fit.scale).toBeCloseTo(0.03);
    expect(fit.width).toBeCloseTo(30);
    expect(fit.height).toBeCloseTo(30);
    expect(fit.x).toBeCloseTo(5);
    expect(fit.y).toBeCloseTo(0);
  });

  it('recalculates for different canvas sizes', () => {
    const a = fitImageToCanvas({ width: 800, height: 600 }, { width: 20, height: 20 });
    const b = fitImageToCanvas({ width: 800, height: 600 }, { width: 40, height: 40 });
    expect(b.scale).toBeCloseTo(a.scale * 2);
    expect(b.width).toBeCloseTo(a.width * 2);
  });

  it('never distorts aspect ratio', () => {
    const img = { width: 1920, height: 1080 };
    const fit = fitImageToCanvas(img, { width: 21, height: 29.7 });
    expect(fit.width / fit.height).toBeCloseTo(img.width / img.height);
  });
});

describe('aspect helpers', () => {
  it('computes aspect ratio', () => {
    expect(imageAspectRatio({ width: 4, height: 3 })).toBeCloseTo(4 / 3);
  });

  it('formats common ratios', () => {
    expect(formatAspectRatio(1)).toBe('1:1');
    expect(formatAspectRatio(4 / 3)).toBe('4:3');
  });
});
