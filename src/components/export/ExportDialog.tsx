import { useState } from 'react';
import { saveAs } from 'file-saver';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { exportPng } from '@/engine/export/pngExport';
import { exportPdf } from '@/engine/export/pdfExport';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ExportDialog({ open, onClose }: Props) {
  const [format, setFormat] = useState<'png' | 'pdf'>('png');
  const [resolution, setResolution] = useState(30); // px per cm
  const [includePortrait, setIncludePortrait] = useState(true);
  const [includeConstruction, setIncludeConstruction] = useState(true);
  const [includeMeasurements, setIncludeMeasurements] = useState(true);
  const [includeBackground, setIncludeBackground] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const image = useWorkspaceStore((s) => s.image);
  const canvas = useWorkspaceStore((s) => s.canvas);
  const construction = useWorkspaceStore((s) => s.construction);
  const landmarks = useWorkspaceStore((s) => s.landmarks);
  const layers = useWorkspaceStore((s) => s.layers);
  const getFit = useWorkspaceStore((s) => s.getFit);
  const getMeasurementAnnotations = useWorkspaceStore((s) => s.getMeasurementAnnotations);
  const projectName = useWorkspaceStore((s) => s.projectName);

  if (!open) return null;

  const runExport = async () => {
    setBusy(true);
    setError(null);
    try {
      const fit = getFit();
      const measurements = getMeasurementAnnotations();
      const base = projectName.replace(/[^\w\-]+/g, '_') || 'loomis';

      if (format === 'png') {
        const blob = await exportPng(
          image,
          fit,
          canvas,
          construction,
          landmarks,
          measurements,
          layers,
          {
            resolution,
            includePortrait,
            includeConstruction,
            includeMeasurements,
            includeBackground,
          },
        );
        saveAs(blob, `${base}.png`);
      } else {
        const blob = await exportPdf(
          image,
          fit,
          canvas,
          construction,
          landmarks,
          measurements,
          layers,
          {
            includePortrait,
            includeConstruction,
            includeMeasurements,
            includeInstructions: true,
          },
        );
        saveAs(blob, `${base}.pdf`);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md border border-[var(--color-border)] bg-[var(--color-panel)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="text-xs font-semibold tracking-[0.2em] text-[var(--color-text)]">
            EXPORT
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-4 py-4 text-sm">
          <div className="flex gap-2">
            {(['png', 'pdf'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`flex-1 border px-3 py-2 text-[10px] tracking-wider uppercase ${
                  format === f
                    ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {format === 'png' && (
            <label className="block">
              <span className="text-[10px] tracking-wider text-[var(--color-text-secondary)]">
                RESOLUTION (px / cm)
              </span>
              <input
                type="number"
                min={10}
                max={120}
                value={resolution}
                onChange={(e) => setResolution(Number(e.target.value) || 30)}
                className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-[var(--color-text)]"
              />
            </label>
          )}

          {format === 'pdf' && (
            <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
              PDF page size will be {canvas.width} × {canvas.height} {canvas.unit}.
              Print at 100% / actual size — do not use fit-to-page.
            </p>
          )}

          {(
            [
              ['Portrait', includePortrait, setIncludePortrait],
              ['Construction', includeConstruction, setIncludeConstruction],
              ['Measurements', includeMeasurements, setIncludeMeasurements],
            ] as const
          ).map(([label, value, setter]) => (
            <label
              key={label}
              className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]"
            >
              <span>Include {label.toLowerCase()}</span>
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setter(e.target.checked)}
                className="accent-[var(--color-accent)]"
              />
            </label>
          ))}

          {format === 'png' && (
            <label className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
              <span>Include background</span>
              <input
                type="checkbox"
                checked={includeBackground}
                onChange={(e) => setIncludeBackground(e.target.checked)}
                className="accent-[var(--color-accent)]"
              />
            </label>
          )}

          {error && <p className="text-[11px] text-red-400">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-[10px] tracking-wider text-[var(--color-text-secondary)]"
          >
            CANCEL
          </button>
          <button
            type="button"
            disabled={busy || !image}
            onClick={() => void runExport()}
            className="bg-[var(--color-accent)] px-4 py-1.5 text-[10px] font-semibold tracking-wider text-[#1a1410] disabled:opacity-40"
          >
            {busy ? 'EXPORTING…' : `DOWNLOAD ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
