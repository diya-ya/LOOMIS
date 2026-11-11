import type {
  LayerVisibility,
  LoomisConstruction,
  MeasurementAnnotation,
  PortraitImage,
  ImageFit,
  CanvasConfig,
  Landmark,
  Point2D,
} from '@/types';
import { GUIDE_COLORS } from '@/types';
import { convertUnit } from '@/engine/image/imageTransform';

export type PngExportOptions = {
  resolution: number; // px per canvas unit (e.g. px/cm)
  includePortrait: boolean;
  includeConstruction: boolean;
  includeMeasurements: boolean;
  includeBackground: boolean;
  backgroundColor?: string;
};

function pathFromPoints(ctx: CanvasRenderingContext2D, points: Point2D[], closed = false) {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  if (closed) ctx.closePath();
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  start: Point2D,
  end: Point2D,
  color: string,
  width: number,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function exportPng(
  image: PortraitImage | null,
  fit: ImageFit,
  canvas: CanvasConfig,
  construction: LoomisConstruction | null,
  landmarks: Landmark[],
  measurements: MeasurementAnnotation[],
  layers: LayerVisibility,
  options: PngExportOptions,
): Promise<Blob> {
  const wCm = convertUnit(canvas.width, canvas.unit, 'cm');
  const hCm = convertUnit(canvas.height, canvas.unit, 'cm');
  // Convert fit from canvas units to cm if needed
  const unitScale = convertUnit(1, canvas.unit, 'cm');
  const pxPerCm = options.resolution;
  const width = Math.round(wCm * pxPerCm);
  const height = Math.round(hCm * pxPerCm);

  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  const s = (v: number) => v * unitScale * pxPerCm;

  if (options.includeBackground) {
    ctx.fillStyle = options.backgroundColor ?? '#111110';
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  if (options.includePortrait && image && layers.portrait) {
    const img = await loadImage(image.dataUrl);
    ctx.drawImage(img, s(fit.x), s(fit.y), s(fit.width), s(fit.height));
  }

  if (options.includeConstruction && construction) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (layers.cranialSphere) {
      ctx.strokeStyle = GUIDE_COLORS.cranial;
      ctx.lineWidth = 1.5;
      pathFromPoints(
        ctx,
        construction.cranialSphere.outline.map((p) => ({ x: s(p.x), y: s(p.y) })),
        true,
      );
      ctx.stroke();
      drawLine(
        ctx,
        { x: s(construction.cranialSphere.equator.start.x), y: s(construction.cranialSphere.equator.start.y) },
        { x: s(construction.cranialSphere.equator.end.x), y: s(construction.cranialSphere.equator.end.y) },
        GUIDE_COLORS.cranial,
        1,
      );
    }

    if (layers.sidePlane && construction.sidePlane.visible) {
      ctx.strokeStyle = GUIDE_COLORS.sidePlane;
      ctx.lineWidth = 1.5;
      pathFromPoints(
        ctx,
        construction.sidePlane.contour.map((p) => ({ x: s(p.x), y: s(p.y) })),
      );
      ctx.stroke();
    }

    if (layers.centerline) {
      drawLine(
        ctx,
        { x: s(construction.centerline.start.x), y: s(construction.centerline.start.y) },
        { x: s(construction.centerline.end.x), y: s(construction.centerline.end.y) },
        GUIDE_COLORS.centerline,
        1.5,
      );
    }

    if (layers.primaryDivisions) {
      for (const line of [
        construction.divisions.hairline,
        construction.divisions.brow,
        construction.divisions.noseBottom,
        construction.divisions.chin,
      ]) {
        drawLine(
          ctx,
          { x: s(line.start.x), y: s(line.start.y) },
          { x: s(line.end.x), y: s(line.end.y) },
          GUIDE_COLORS.primary,
          1.75,
        );
      }
    }

    if (layers.eyeGuides) {
      for (const line of [construction.eyeGuides.upper, construction.eyeGuides.lower]) {
        drawLine(
          ctx,
          { x: s(line.start.x), y: s(line.start.y) },
          { x: s(line.end.x), y: s(line.end.y) },
          GUIDE_COLORS.eyeMouth,
          1.25,
        );
      }
    }

    if (layers.mouthGuides) {
      for (const line of [construction.mouthGuides.upper, construction.mouthGuides.lower]) {
        drawLine(
          ctx,
          { x: s(line.start.x), y: s(line.start.y) },
          { x: s(line.end.x), y: s(line.end.y) },
          GUIDE_COLORS.eyeMouth,
          1.25,
        );
      }
    }

    if (layers.verticalSubdivisions) {
      for (const line of construction.verticalSubdivisions.lines) {
        drawLine(
          ctx,
          { x: s(line.start.x), y: s(line.start.y) },
          { x: s(line.end.x), y: s(line.end.y) },
          GUIDE_COLORS.vertical,
          1,
        );
      }
    }

    if (layers.jawConstruction) {
      for (const line of [...construction.jaw.left, ...construction.jaw.right]) {
        drawLine(
          ctx,
          { x: s(line.start.x), y: s(line.start.y) },
          { x: s(line.end.x), y: s(line.end.y) },
          GUIDE_COLORS.cranial,
          1.25,
        );
      }
    }

    if (layers.landmarks) {
      for (const lm of landmarks) {
        ctx.fillStyle = lm.estimated ? GUIDE_COLORS.landmarkEstimated : GUIDE_COLORS.landmark;
        const x = s(fit.scale * lm.x * (image?.width ?? 0) + fit.x);
        const y = s(fit.scale * lm.y * (image?.height ?? 0) + fit.y);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (options.includeMeasurements && layers.measurements) {
    ctx.font = `${Math.max(10, pxPerCm * 0.35)}px Manrope, sans-serif`;
    ctx.fillStyle = GUIDE_COLORS.measure;
    ctx.strokeStyle = GUIDE_COLORS.measure;
    for (const m of measurements) {
      drawLine(
        ctx,
        { x: s(m.start.x), y: s(m.start.y) },
        { x: s(m.end.x), y: s(m.end.y) },
        GUIDE_COLORS.measure,
        1,
      );
      const label = `${m.value.toFixed(1)} ${m.unit}`;
      ctx.fillText(label, s(m.end.x) + 6, s(m.end.y));
    }
  }

  return new Promise((resolve, reject) => {
    offscreen.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed'))),
      'image/png',
    );
  });
}
