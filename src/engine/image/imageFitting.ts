import type { ImageFit, Size2D } from '@/types';

/**
 * Fit an image onto a canvas using the restrictive axis (contain).
 * Preserves aspect ratio, never distorts, centers on the non-restrictive axis.
 */
export function fitImageToCanvas(
  image: Size2D,
  canvas: Size2D,
): ImageFit {
  if (image.width <= 0 || image.height <= 0 || canvas.width <= 0 || canvas.height <= 0) {
    return { scale: 0, width: 0, height: 0, x: 0, y: 0 };
  }

  const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
  const width = scale * image.width;
  const height = scale * image.height;
  const x = (canvas.width - width) / 2;
  const y = (canvas.height - height) / 2;

  return { scale, width, height, x, y };
}

/**
 * Head-focused crop: scale so the face region fills more of the canvas.
 * faceBox is in normalized image coordinates (0–1).
 */
export function fitHeadFocus(
  image: Size2D,
  canvas: Size2D,
  faceBox: { x: number; y: number; width: number; height: number },
  padding = 0.35,
): ImageFit {
  const padX = faceBox.width * padding;
  const padY = faceBox.height * padding;
  const cropX = Math.max(0, faceBox.x - padX);
  const cropY = Math.max(0, faceBox.y - padY);
  const cropW = Math.min(1 - cropX, faceBox.width + padX * 2);
  const cropH = Math.min(1 - cropY, faceBox.height + padY * 2);

  const region: Size2D = {
    width: cropW * image.width,
    height: cropH * image.height,
  };

  const base = fitImageToCanvas(region, canvas);
  // Map so the cropped region is what fits; offset accounts for crop origin.
  return {
    scale: base.scale,
    width: base.scale * image.width,
    height: base.scale * image.height,
    x: base.x - cropX * image.width * base.scale,
    y: base.y - cropY * image.height * base.scale,
  };
}

export function imageAspectRatio(image: Size2D): number {
  if (image.height === 0) return 0;
  return image.width / image.height;
}

export function formatAspectRatio(ratio: number): string {
  if (ratio <= 0) return '—';
  // Find nearest simple ratio
  const candidates = [
    [1, 1],
    [3, 2],
    [2, 3],
    [4, 3],
    [3, 4],
    [5, 4],
    [4, 5],
    [16, 9],
    [9, 16],
    [5, 7],
    [7, 5],
  ];
  let best = candidates[0];
  let bestDiff = Infinity;
  for (const [a, b] of candidates) {
    const diff = Math.abs(ratio - a / b);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [a, b];
    }
  }
  if (bestDiff < 0.08) return `${best[0]}:${best[1]}`;
  return ratio.toFixed(2);
}
