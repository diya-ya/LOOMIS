import { useWorkspaceStore } from '@/store/workspaceStore';
import { CANVAS_PRESETS, presetToCanvas } from '@/utils/canvasPresets';
import type { Unit } from '@/types';

export function CanvasSettings() {
  const canvas = useWorkspaceStore((s) => s.canvas);
  const setCanvas = useWorkspaceStore((s) => s.setCanvas);
  const setUnit = useWorkspaceStore((s) => s.setUnit);
  const swapOrientation = useWorkspaceStore((s) => s.swapOrientation);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] tracking-wider text-[var(--color-text-secondary)]">
            WIDTH
          </span>
          <input
            type="number"
            min={1}
            step={0.1}
            value={canvas.width}
            onChange={(e) => setCanvas({ width: Number(e.target.value) || 1 })}
            className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-[var(--color-text)]"
          />
        </label>
        <label className="block">
          <span className="text-[10px] tracking-wider text-[var(--color-text-secondary)]">
            HEIGHT
          </span>
          <input
            type="number"
            min={1}
            step={0.1}
            value={canvas.height}
            onChange={(e) => setCanvas({ height: Number(e.target.value) || 1 })}
            className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-[var(--color-text)]"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-[10px] tracking-wider text-[var(--color-text-secondary)]">
          UNITS
        </span>
        <select
          value={canvas.unit}
          onChange={(e) => setUnit(e.target.value as Unit)}
          className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-[var(--color-text)]"
        >
          <option value="cm">Centimetres</option>
          <option value="in">Inches</option>
          <option value="mm">Millimetres</option>
        </select>
      </label>

      <button
        type="button"
        onClick={() => swapOrientation()}
        className="w-full border border-[var(--color-border)] px-2 py-1.5 text-[10px] tracking-wider text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
      >
        {canvas.orientation === 'portrait' ? 'PORTRAIT' : 'LANDSCAPE'} · SWAP
      </button>

      <div>
        <span className="text-[10px] tracking-wider text-[var(--color-text-secondary)]">
          PRESETS
        </span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {CANVAS_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                const dims = presetToCanvas(preset, canvas.unit, canvas.orientation);
                setCanvas(dims);
              }}
              className="border border-[var(--color-border)] px-2 py-1 text-[10px] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
