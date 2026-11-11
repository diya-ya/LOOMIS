import type { Point2D, Size2D, ImageFit, Unit } from '@/types';

const CM_PER_INCH = 2.54;
const MM_PER_CM = 10;

/** Convert a length between physical units. */
export function convertUnit(value: number, from: Unit, to: Unit): number {
  if (from === to) return value;
  const toCm =
    from === 'cm' ? value : from === 'mm' ? value / MM_PER_CM : value * CM_PER_INCH;
  if (to === 'cm') return toCm;
  if (to === 'mm') return toCm * MM_PER_CM;
  return toCm / CM_PER_INCH;
}

export function formatMeasurement(
  value: number,
  unit: Unit,
  precision: number,
): string {
  return `${value.toFixed(precision)} ${unit}`;
}

/** Normalized (0–1) → original image pixels. */
export function normalizedToImage(p: Point2D, image: Size2D): Point2D {
  return { x: p.x * image.width, y: p.y * image.height };
}

/** Original image pixels → normalized (0–1). */
export function imageToNormalized(p: Point2D, image: Size2D): Point2D {
  return {
    x: image.width === 0 ? 0 : p.x / image.width,
    y: image.height === 0 ? 0 : p.y / image.height,
  };
}

/** Image pixels → physical canvas coordinates (same unit as canvas). */
export function imageToCanvas(p: Point2D, fit: ImageFit): Point2D {
  return {
    x: fit.scale * p.x + fit.x,
    y: fit.scale * p.y + fit.y,
  };
}

/** Physical canvas → image pixels. */
export function canvasToImage(p: Point2D, fit: ImageFit): Point2D {
  if (fit.scale === 0) return { x: 0, y: 0 };
  return {
    x: (p.x - fit.x) / fit.scale,
    y: (p.y - fit.y) / fit.scale,
  };
}

/** Normalized → physical canvas. */
export function normalizedToCanvas(
  p: Point2D,
  image: Size2D,
  fit: ImageFit,
): Point2D {
  return imageToCanvas(normalizedToImage(p, image), fit);
}

/** Physical canvas → normalized. */
export function canvasToNormalized(
  p: Point2D,
  image: Size2D,
  fit: ImageFit,
): Point2D {
  return imageToNormalized(canvasToImage(p, fit), image);
}

/**
 * Map physical canvas coords to screen display coords.
 * screenSize is the rendered viewport size in CSS pixels;
 * canvasSize is physical canvas size (cm/in/mm — unitless ratio matters).
 */
export function canvasToScreen(
  p: Point2D,
  canvasSize: Size2D,
  screenSize: Size2D,
  viewport: { zoom: number; panX: number; panY: number },
): Point2D {
  const baseScale = Math.min(
    screenSize.width / canvasSize.width,
    screenSize.height / canvasSize.height,
  );
  const scale = baseScale * viewport.zoom;
  const offsetX =
    (screenSize.width - canvasSize.width * scale) / 2 + viewport.panX;
  const offsetY =
    (screenSize.height - canvasSize.height * scale) / 2 + viewport.panY;
  return {
    x: p.x * scale + offsetX,
    y: p.y * scale + offsetY,
  };
}

export function screenToCanvas(
  p: Point2D,
  canvasSize: Size2D,
  screenSize: Size2D,
  viewport: { zoom: number; panX: number; panY: number },
): Point2D {
  const baseScale = Math.min(
    screenSize.width / canvasSize.width,
    screenSize.height / canvasSize.height,
  );
  const scale = baseScale * viewport.zoom;
  const offsetX =
    (screenSize.width - canvasSize.width * scale) / 2 + viewport.panX;
  const offsetY =
    (screenSize.height - canvasSize.height * scale) / 2 + viewport.panY;
  if (scale === 0) return { x: 0, y: 0 };
  return {
    x: (p.x - offsetX) / scale,
    y: (p.y - offsetY) / scale,
  };
}

export function getDisplayScale(
  canvasSize: Size2D,
  screenSize: Size2D,
  zoom: number,
): number {
  return (
    Math.min(screenSize.width / canvasSize.width, screenSize.height / canvasSize.height) *
    zoom
  );
}

/** Rotate image dimensions for 90/270. */
export function rotatedImageSize(
  size: Size2D,
  rotation: 0 | 90 | 180 | 270,
): Size2D {
  if (rotation === 90 || rotation === 270) {
    return { width: size.height, height: size.width };
  }
  return size;
}
