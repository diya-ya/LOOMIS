import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { GUIDE_COLORS } from '@/types';
import type { LandmarkId, Point2D } from '@/types';
import {
  canvasToNormalized,
  canvasToScreen,
  getDisplayScale,
  normalizedToCanvas,
  screenToCanvas,
} from '@/engine/image/imageTransform';

function pointsToPath(points: Point2D[], closed = false): string {
  if (!points.length) return '';
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  return closed ? `${d} Z` : d;
}

export function DrawingCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [dragging, setDragging] = useState<LandmarkId | null>(null);
  const [panning, setPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const spaceDown = useRef(false);

  const image = useWorkspaceStore((s) => s.image);
  const canvas = useWorkspaceStore((s) => s.canvas);
  const layers = useWorkspaceStore((s) => s.layers);
  const landmarks = useWorkspaceStore((s) => s.landmarks);
  const construction = useWorkspaceStore((s) => s.construction);
  const viewport = useWorkspaceStore((s) => s.viewport);
  const compareMode = useWorkspaceStore((s) => s.compareMode);
  const imageTransform = useWorkspaceStore((s) => s.imageTransform);
  const measurements = useWorkspaceStore((s) => s.measurements);
  const getFit = useWorkspaceStore((s) => s.getFit);
  const getImageSize = useWorkspaceStore((s) => s.getImageSize);
  const getMeasurementAnnotations = useWorkspaceStore((s) => s.getMeasurementAnnotations);
  const updateLandmark = useWorkspaceStore((s) => s.updateLandmark);
  const setViewport = useWorkspaceStore((s) => s.setViewport);

  const fit = getFit();
  const imageSize = getImageSize();
  const annotations = measurements.showAnnotations ? getMeasurementAnnotations() : [];
  const showGuides = !compareMode;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDown.current = true;
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDown.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const toScreen = useCallback(
    (p: Point2D) =>
      canvasToScreen(p, canvas, size, viewport),
    [canvas, size, viewport],
  );

  const landmarkScreen = useMemo(() => {
    return landmarks.map((lm) => {
      const c = normalizedToCanvas(lm, imageSize, fit);
      return { ...lm, screen: toScreen(c), canvas: c };
    });
  }, [landmarks, imageSize, fit, toScreen]);

  const displayScale = getDisplayScale(canvas, size, viewport.zoom);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const next = Math.min(5, Math.max(0.25, viewport.zoom * factor));
    setViewport({ zoom: next });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || spaceDown.current || e.button === 2) {
      setPanning(true);
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        panX: viewport.panX,
        panY: viewport.panY,
      };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (panning) {
      setViewport({
        panX: panStart.current.panX + (e.clientX - panStart.current.x),
        panY: panStart.current.panY + (e.clientY - panStart.current.y),
      });
      return;
    }
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const canvasPt = screenToCanvas(screenPt, canvas, size, viewport);
    const norm = canvasToNormalized(canvasPt, imageSize, fit);
    updateLandmark(
      dragging,
      Math.min(1, Math.max(0, norm.x)),
      Math.min(1, Math.max(0, norm.y)),
    );
  };

  const onPointerUp = () => {
    setDragging(null);
    setPanning(false);
  };

  const imgScreen = {
    x: toScreen({ x: fit.x, y: fit.y }).x,
    y: toScreen({ x: fit.x, y: fit.y }).y,
    w: fit.width * displayScale,
    h: fit.height * displayScale,
  };

  const origin = toScreen({ x: 0, y: 0 });
  const corner = toScreen({ x: canvas.width, y: canvas.height });

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[#0c0c0b]"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Canvas page */}
      <div
        className="absolute border border-[var(--color-border)] bg-[#1a1a18] shadow-[0_0_80px_rgba(0,0,0,0.45)]"
        style={{
          left: origin.x,
          top: origin.y,
          width: corner.x - origin.x,
          height: corner.y - origin.y,
        }}
      />

      {image && layers.portrait && (
        <img
          src={image.dataUrl}
          alt=""
          draggable={false}
          className="absolute select-none"
          style={{
            left: imgScreen.x,
            top: imgScreen.y,
            width: imgScreen.w,
            height: imgScreen.h,
            transform: `rotate(${imageTransform.rotation}deg)`,
            transformOrigin: 'center center',
            opacity: compareMode ? 1 : 0.92,
          }}
        />
      )}

      <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'none' }}>
        {layers.rulers && (
          <g opacity={0.35}>
            {Array.from({ length: Math.ceil(canvas.width) + 1 }).map((_, i) => {
              const p = toScreen({ x: i, y: 0 });
              return (
                <line
                  key={`rx-${i}`}
                  x1={p.x}
                  y1={origin.y}
                  x2={p.x}
                  y2={origin.y + 8}
                  stroke={GUIDE_COLORS.measure}
                  strokeWidth={1}
                />
              );
            })}
            {Array.from({ length: Math.ceil(canvas.height) + 1 }).map((_, i) => {
              const p = toScreen({ x: 0, y: i });
              return (
                <line
                  key={`ry-${i}`}
                  x1={origin.x}
                  y1={p.y}
                  x2={origin.x + 8}
                  y2={p.y}
                  stroke={GUIDE_COLORS.measure}
                  strokeWidth={1}
                />
              );
            })}
          </g>
        )}

        {showGuides && construction && (
          <>
            {layers.cranialSphere && (
              <g>
                <path
                  d={pointsToPath(
                    construction.cranialSphere.outline.map(toScreen),
                    true,
                  )}
                  fill="none"
                  stroke={GUIDE_COLORS.cranial}
                  strokeWidth={1.25}
                  opacity={0.85}
                />
                <line
                  x1={toScreen(construction.cranialSphere.equator.start).x}
                  y1={toScreen(construction.cranialSphere.equator.start).y}
                  x2={toScreen(construction.cranialSphere.equator.end).x}
                  y2={toScreen(construction.cranialSphere.equator.end).y}
                  stroke={GUIDE_COLORS.cranial}
                  strokeWidth={1}
                  strokeDasharray="4 3"
                />
              </g>
            )}

            {layers.sidePlane && construction.sidePlane.visible && (
              <path
                d={pointsToPath(construction.sidePlane.contour.map(toScreen))}
                fill="none"
                stroke={GUIDE_COLORS.sidePlane}
                strokeWidth={1.5}
              />
            )}

            {layers.centerline && (
              <line
                x1={toScreen(construction.centerline.start).x}
                y1={toScreen(construction.centerline.start).y}
                x2={toScreen(construction.centerline.end).x}
                y2={toScreen(construction.centerline.end).y}
                stroke={GUIDE_COLORS.centerline}
                strokeWidth={1.5}
              />
            )}

            {layers.primaryDivisions && (
              <g>
                {[
                  construction.divisions.hairline,
                  construction.divisions.brow,
                  construction.divisions.noseBottom,
                  construction.divisions.chin,
                ].map((line) => (
                  <line
                    key={line.id}
                    x1={toScreen(line.start).x}
                    y1={toScreen(line.start).y}
                    x2={toScreen(line.end).x}
                    y2={toScreen(line.end).y}
                    stroke={GUIDE_COLORS.primary}
                    strokeWidth={1.75}
                  />
                ))}
              </g>
            )}

            {layers.eyeGuides && (
              <g>
                {[construction.eyeGuides.upper, construction.eyeGuides.lower].map(
                  (line) => (
                    <line
                      key={line.id}
                      x1={toScreen(line.start).x}
                      y1={toScreen(line.start).y}
                      x2={toScreen(line.end).x}
                      y2={toScreen(line.end).y}
                      stroke={GUIDE_COLORS.eyeMouth}
                      strokeWidth={1.25}
                    />
                  ),
                )}
              </g>
            )}

            {layers.mouthGuides && (
              <g>
                {[construction.mouthGuides.upper, construction.mouthGuides.lower].map(
                  (line) => (
                    <line
                      key={line.id}
                      x1={toScreen(line.start).x}
                      y1={toScreen(line.start).y}
                      x2={toScreen(line.end).x}
                      y2={toScreen(line.end).y}
                      stroke={GUIDE_COLORS.eyeMouth}
                      strokeWidth={1.25}
                    />
                  ),
                )}
              </g>
            )}

            {layers.verticalSubdivisions && (
              <g>
                {construction.verticalSubdivisions.lines.map((line) => (
                  <line
                    key={line.id}
                    x1={toScreen(line.start).x}
                    y1={toScreen(line.start).y}
                    x2={toScreen(line.end).x}
                    y2={toScreen(line.end).y}
                    stroke={GUIDE_COLORS.vertical}
                    strokeWidth={1}
                    opacity={0.8}
                  />
                ))}
              </g>
            )}

            {layers.jawConstruction && (
              <g>
                {[...construction.jaw.left, ...construction.jaw.right].map((line) => (
                  <line
                    key={line.id}
                    x1={toScreen(line.start).x}
                    y1={toScreen(line.start).y}
                    x2={toScreen(line.end).x}
                    y2={toScreen(line.end).y}
                    stroke={GUIDE_COLORS.cranial}
                    strokeWidth={1.25}
                  />
                ))}
              </g>
            )}
          </>
        )}

        {showGuides && layers.measurements && annotations.map((m) => {
          const a = toScreen(m.start);
          const b = toScreen(m.end);
          return (
            <g key={m.id} opacity={0.75}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={GUIDE_COLORS.measure}
                strokeWidth={1}
                strokeDasharray="3 2"
              />
              <text
                x={(a.x + b.x) / 2 + (m.offsetSide === 'left' ? -8 : 8)}
                y={(a.y + b.y) / 2}
                fill={GUIDE_COLORS.measure}
                fontSize={10}
                fontFamily="Manrope, sans-serif"
              >
                {m.value.toFixed(measurements.precision)} {m.unit}
              </text>
            </g>
          );
        })}

        {showGuides && layers.landmarks &&
          landmarkScreen.map((lm) => (
            <circle
              key={lm.id}
              cx={lm.screen.x}
              cy={lm.screen.y}
              r={dragging === lm.id ? 6 : 4}
              fill={
                lm.estimated || lm.manual === false && lm.estimated
                  ? GUIDE_COLORS.landmarkEstimated
                  : lm.manual
                    ? GUIDE_COLORS.primary
                    : GUIDE_COLORS.landmark
              }
              stroke="#111110"
              strokeWidth={1}
              style={{ pointerEvents: 'auto', cursor: 'grab' }}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                setDragging(lm.id);
              }}
            >
              <title>
                {lm.id}
                {lm.estimated ? ' (estimated)' : ''}
                {lm.manual ? ' (manual)' : ''}
              </title>
            </circle>
          ))}
      </svg>

      {!image && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Upload a portrait to begin construction
          </p>
        </div>
      )}
    </div>
  );
}
