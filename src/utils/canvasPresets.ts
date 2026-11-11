import type { CanvasConfig, Unit } from '@/types';
import { convertUnit } from '@/engine/image/imageTransform';

export type CanvasPreset = {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
};

export const CANVAS_PRESETS: CanvasPreset[] = [
  { id: 'a4', label: 'A4', widthMm: 210, heightMm: 297 },
  { id: 'a3', label: 'A3', widthMm: 297, heightMm: 420 },
  { id: 'a2', label: 'A2', widthMm: 420, heightMm: 594 },
  { id: 'letter', label: 'Letter', widthMm: 215.9, heightMm: 279.4 },
  { id: '30x40', label: '30 × 40 cm', widthMm: 300, heightMm: 400 },
  { id: '40x50', label: '40 × 50 cm', widthMm: 400, heightMm: 500 },
  { id: '9x12', label: '9 × 12 in', widthMm: 228.6, heightMm: 304.8 },
];

export function presetToCanvas(
  preset: CanvasPreset,
  unit: Unit,
  orientation: CanvasConfig['orientation'],
): Pick<CanvasConfig, 'width' | 'height'> {
  let w = convertUnit(preset.widthMm, 'mm', unit);
  let h = convertUnit(preset.heightMm, 'mm', unit);
  if (orientation === 'landscape') {
    [w, h] = [h, w];
  }
  return {
    width: Math.round(w * 100) / 100,
    height: Math.round(h * 100) / 100,
  };
}
