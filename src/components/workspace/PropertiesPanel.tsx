import { useState } from 'react';
import { ImageUploader } from '@/components/upload/ImageUploader';
import { CanvasSettings } from '@/components/upload/CanvasSettings';
import { LayerControls } from './LayerControls';
import { MeasurementPanel } from './MeasurementPanel';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { confidenceLabel, overallConfidence } from '@/engine/vision/confidence';

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[var(--color-border)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-[10px] font-semibold tracking-[0.18em] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
      >
        {title}
        <span className="text-[var(--color-structural)]">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

export function PropertiesPanel({ onExport }: { onExport: () => void }) {
  const faces = useWorkspaceStore((s) => s.faces);
  const selectedFaceId = useWorkspaceStore((s) => s.selectedFaceId);
  const selectFace = useWorkspaceStore((s) => s.selectFace);
  const detectionStatus = useWorkspaceStore((s) => s.detectionStatus);
  const detectionError = useWorkspaceStore((s) => s.detectionError);
  const landmarks = useWorkspaceStore((s) => s.landmarks);
  const construction = useWorkspaceStore((s) => s.construction);
  const detectFace = useWorkspaceStore((s) => s.detectFace);
  const imageTransform = useWorkspaceStore((s) => s.imageTransform);
  const setImageTransformStore = useWorkspaceStore((s) => s.setImageTransform);
  const savedProjects = useWorkspaceStore((s) => s.savedProjects);
  const refreshProjects = useWorkspaceStore((s) => s.refreshProjects);
  const loadSavedProject = useWorkspaceStore((s) => s.loadSavedProject);
  const deleteSavedProject = useWorkspaceStore((s) => s.deleteSavedProject);

  const face =
    faces.find((f) => f.id === selectedFaceId) ?? (faces.length === 1 ? faces[0] : null);
  const conf = overallConfidence(landmarks);

  return (
    <aside className="flex h-full flex-col overflow-y-auto bg-[var(--color-panel)]">
      <Section title="PORTRAIT">
        <ImageUploader />
      </Section>

      <Section title="CANVAS">
        <CanvasSettings />
        <label className="mt-3 flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
          <span>Head-focused crop</span>
          <input
            type="checkbox"
            checked={imageTransform.cropMode === 'head-focus'}
            onChange={(e) =>
              setImageTransformStore({
                cropMode: e.target.checked ? 'head-focus' : 'fit',
              })
            }
            className="accent-[var(--color-accent)]"
          />
        </label>
      </Section>

      <Section title="FACE ANALYSIS">
        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-[var(--color-text-secondary)]">
            <span>Status</span>
            <span className="text-[var(--color-text)]">{detectionStatus}</span>
          </div>
          {face && (
            <>
              <div className="flex justify-between text-[var(--color-text-secondary)]">
                <span>Orientation</span>
                <span className="text-[var(--color-text)]">
                  {face.pose.classification}
                </span>
              </div>
              <div className="flex justify-between text-[var(--color-text-secondary)]">
                <span>Yaw / Pitch / Roll</span>
                <span className="tabular-nums text-[var(--color-text)]">
                  {face.pose.yaw.toFixed(0)}° / {face.pose.pitch.toFixed(0)}° /{' '}
                  {face.pose.roll.toFixed(0)}°
                </span>
              </div>
              <div className="flex justify-between text-[var(--color-text-secondary)]">
                <span>Confidence</span>
                <span className="text-[var(--color-text)]">
                  {confidenceLabel(conf)} ({(conf * 100).toFixed(0)}%)
                </span>
              </div>
            </>
          )}
          {faces.length > 1 && (
            <div className="space-y-1 pt-1">
              <p className="text-[11px] text-[var(--color-soft-gold)]">
                Select the subject face:
              </p>
              {faces.map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => selectFace(f.id)}
                  className={`block w-full border px-2 py-1.5 text-left text-[11px] ${
                    selectedFaceId === f.id
                      ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  Face {i + 1} · {f.pose.classification}
                </button>
              ))}
            </div>
          )}
          {detectionError && (
            <p className="text-[11px] text-[var(--color-soft-gold)]">{detectionError}</p>
          )}
          <button
            type="button"
            onClick={() => void detectFace()}
            className="mt-1 w-full border border-[var(--color-border)] px-2 py-1.5 text-[10px] tracking-wider text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
          >
            RE-DETECT
          </button>
        </div>
      </Section>

      <Section title="CONSTRUCTION" defaultOpen={false}>
        <LayerControls />
        {construction?.warnings && construction.warnings.length > 0 && (
          <ul className="mt-2 space-y-1 border-t border-[var(--color-border)] pt-2">
            {construction.warnings.map((w) => (
              <li key={w} className="text-[10px] leading-snug text-[var(--color-soft-gold)]">
                {w}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="MEASUREMENTS" defaultOpen={false}>
        <MeasurementPanel />
      </Section>

      <Section title="PROJECTS" defaultOpen={false}>
        <button
          type="button"
          onClick={() => void refreshProjects()}
          className="mb-2 w-full border border-[var(--color-border)] px-2 py-1.5 text-[10px] tracking-wider text-[var(--color-text-secondary)]"
        >
          REFRESH
        </button>
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {savedProjects.length === 0 && (
            <p className="text-[11px] text-[var(--color-text-secondary)]">
              No saved projects yet. Portraits stay on this device.
            </p>
          )}
          {savedProjects.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-1 border border-[var(--color-border)] px-2 py-1.5"
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-[11px] text-[var(--color-text)]"
                onClick={() => void loadSavedProject(p.id)}
              >
                {p.name}
              </button>
              <button
                type="button"
                className="text-[10px] text-[var(--color-accent)]"
                onClick={() => void deleteSavedProject(p.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="EXPORT">
        <p className="mb-2 text-[11px] text-[var(--color-text-secondary)]">
          PNG or print-ready PDF at physical canvas size.
        </p>
        <button
          type="button"
          onClick={onExport}
          className="w-full bg-[var(--color-accent)] px-2 py-2 text-[10px] font-semibold tracking-[0.18em] text-[#1a1410]"
        >
          OPEN EXPORT
        </button>
      </Section>
    </aside>
  );
}
