import { useWorkspaceStore } from '@/store/workspaceStore';
import type { MeasurementPrecision, Unit } from '@/types';

export function MeasurementPanel() {
  const measurements = useWorkspaceStore((s) => s.measurements);
  const setMeasurements = useWorkspaceStore((s) => s.setMeasurements);
  const setUnit = useWorkspaceStore((s) => s.setUnit);
  const annotations = useWorkspaceStore((s) => s.getMeasurementAnnotations());
  const construction = useWorkspaceStore((s) => s.construction);

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-[10px] tracking-wider text-[var(--color-text-secondary)]">
          DISPLAY UNIT
        </span>
        <select
          value={measurements.unit}
          onChange={(e) => {
            const unit = e.target.value as Unit;
            setUnit(unit);
            setMeasurements({ unit });
          }}
          className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-[var(--color-text)]"
        >
          <option value="cm">cm</option>
          <option value="in">in</option>
          <option value="mm">mm</option>
        </select>
      </label>

      <label className="block">
        <span className="text-[10px] tracking-wider text-[var(--color-text-secondary)]">
          PRECISION
        </span>
        <select
          value={measurements.precision}
          onChange={(e) =>
            setMeasurements({
              precision: Number(e.target.value) as MeasurementPrecision,
            })
          }
          className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-[var(--color-text)]"
        >
          <option value={0}>0</option>
          <option value={1}>0.0</option>
          <option value={2}>0.00</option>
          <option value={3}>0.000</option>
        </select>
      </label>

      <label className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
        <span>Show annotations</span>
        <input
          type="checkbox"
          checked={measurements.showAnnotations}
          onChange={(e) => setMeasurements({ showAnnotations: e.target.checked })}
          className="accent-[var(--color-accent)]"
        />
      </label>

      <div className="max-h-48 space-y-1.5 overflow-y-auto border-t border-[var(--color-border)] pt-2">
        {!construction && (
          <p className="text-[11px] text-[var(--color-text-secondary)]">
            Measurements appear after face detection.
          </p>
        )}
        {annotations.map((a) => (
          <div
            key={a.id}
            className="flex items-baseline justify-between gap-2 text-[11px]"
          >
            <span className="text-[var(--color-text-secondary)]">{a.label}</span>
            <span className="tabular-nums text-[var(--color-text)]">
              {a.value.toFixed(measurements.precision)} {a.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
