import { jsPDF } from 'jspdf';
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

export type PdfExportOptions = {
  includePortrait: boolean;
  includeConstruction: boolean;
  includeMeasurements: boolean;
  includeInstructions: boolean;
};

function toMm(value: number, unit: CanvasConfig['unit']): number {
  return convertUnit(value, unit, 'mm');
}

function drawPdfLine(
  doc: jsPDF,
  start: Point2D,
  end: Point2D,
  color: string,
  widthMm: number,
) {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(widthMm);
  doc.line(start.x, start.y, end.x, end.y);
}

export async function exportPdf(
  image: PortraitImage | null,
  fit: ImageFit,
  canvas: CanvasConfig,
  construction: LoomisConstruction | null,
  landmarks: Landmark[],
  measurements: MeasurementAnnotation[],
  layers: LayerVisibility,
  options: PdfExportOptions,
): Promise<Blob> {
  const pageW = toMm(canvas.width, canvas.unit);
  const pageH = toMm(canvas.height, canvas.unit);
  const margin = 8; // mm margin for labels

  // Page is exactly the canvas physical size; content inset by margin when needed
  const doc = new jsPDF({
    orientation: pageW >= pageH ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pageW, pageH],
    compress: true,
  });

  const s = (v: number) => toMm(v, canvas.unit);

  // Light paper background
  doc.setFillColor(250, 248, 244);
  doc.rect(0, 0, pageW, pageH, 'F');

  if (options.includePortrait && image && layers.portrait) {
    doc.addImage(
      image.dataUrl,
      'JPEG',
      s(fit.x),
      s(fit.y),
      s(fit.width),
      s(fit.height),
      undefined,
      'FAST',
    );
  }

  if (options.includeConstruction && construction) {
    if (layers.cranialSphere) {
      const pts = construction.cranialSphere.outline;
      doc.setDrawColor(169, 169, 162);
      doc.setLineWidth(0.25);
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        doc.line(s(a.x), s(a.y), s(b.x), s(b.y));
      }
      drawPdfLine(
        doc,
        { x: s(construction.cranialSphere.equator.start.x), y: s(construction.cranialSphere.equator.start.y) },
        { x: s(construction.cranialSphere.equator.end.x), y: s(construction.cranialSphere.equator.end.y) },
        GUIDE_COLORS.cranial,
        0.2,
      );
    }

    if (layers.sidePlane && construction.sidePlane.visible) {
      const c = construction.sidePlane.contour;
      doc.setDrawColor(168, 155, 184);
      doc.setLineWidth(0.3);
      for (let i = 0; i < c.length - 1; i++) {
        doc.line(s(c[i].x), s(c[i].y), s(c[i + 1].x), s(c[i + 1].y));
      }
    }

    if (layers.centerline) {
      drawPdfLine(
        doc,
        { x: s(construction.centerline.start.x), y: s(construction.centerline.start.y) },
        { x: s(construction.centerline.end.x), y: s(construction.centerline.end.y) },
        GUIDE_COLORS.centerline,
        0.3,
      );
    }

    if (layers.primaryDivisions) {
      for (const line of [
        construction.divisions.hairline,
        construction.divisions.brow,
        construction.divisions.noseBottom,
        construction.divisions.chin,
      ]) {
        drawPdfLine(
          doc,
          { x: s(line.start.x), y: s(line.start.y) },
          { x: s(line.end.x), y: s(line.end.y) },
          GUIDE_COLORS.primary,
          0.35,
        );
      }
    }

    if (layers.eyeGuides) {
      for (const line of [construction.eyeGuides.upper, construction.eyeGuides.lower]) {
        drawPdfLine(
          doc,
          { x: s(line.start.x), y: s(line.start.y) },
          { x: s(line.end.x), y: s(line.end.y) },
          GUIDE_COLORS.eyeMouth,
          0.25,
        );
      }
    }

    if (layers.mouthGuides) {
      for (const line of [construction.mouthGuides.upper, construction.mouthGuides.lower]) {
        drawPdfLine(
          doc,
          { x: s(line.start.x), y: s(line.start.y) },
          { x: s(line.end.x), y: s(line.end.y) },
          GUIDE_COLORS.eyeMouth,
          0.25,
        );
      }
    }

    if (layers.verticalSubdivisions) {
      for (const line of construction.verticalSubdivisions.lines) {
        drawPdfLine(
          doc,
          { x: s(line.start.x), y: s(line.start.y) },
          { x: s(line.end.x), y: s(line.end.y) },
          GUIDE_COLORS.vertical,
          0.2,
        );
      }
    }

    if (layers.jawConstruction) {
      for (const line of [...construction.jaw.left, ...construction.jaw.right]) {
        drawPdfLine(
          doc,
          { x: s(line.start.x), y: s(line.start.y) },
          { x: s(line.end.x), y: s(line.end.y) },
          GUIDE_COLORS.cranial,
          0.25,
        );
      }
    }

    if (layers.landmarks && image) {
      doc.setFillColor(234, 228, 218);
      for (const lm of landmarks) {
        const x = s(fit.scale * lm.x * image.width + fit.x);
        const y = s(fit.scale * lm.y * image.height + fit.y);
        doc.circle(x, y, 0.6, 'F');
      }
    }
  }

  if (options.includeMeasurements && layers.measurements) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(80, 76, 70);
    for (const m of measurements) {
      drawPdfLine(
        doc,
        { x: s(m.start.x), y: s(m.start.y) },
        { x: s(m.end.x), y: s(m.end.y) },
        GUIDE_COLORS.measure,
        0.15,
      );
      const labelX = Math.min(pageW - margin, Math.max(margin, s(m.end.x) + 2));
      const labelY = Math.min(pageH - margin, Math.max(margin, s(m.end.y)));
      doc.text(
        `${m.label}: ${m.value.toFixed(1)} ${m.unit}`,
        labelX,
        labelY,
      );
    }
  }

  if (options.includeInstructions) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.setTextColor(120, 116, 110);
    doc.text(
      `LOOMIS drawing guide — ${canvas.width} × ${canvas.height} ${canvas.unit}. Print at 100% scale (actual size). Do not fit-to-page.`,
      margin,
      pageH - 3,
    );
  }

  return doc.output('blob');
}
