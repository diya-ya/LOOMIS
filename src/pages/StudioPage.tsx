import { useEffect, useState } from 'react';
import { DrawingCanvas } from '@/components/workspace/DrawingCanvas';
import { Toolbar } from '@/components/workspace/Toolbar';
import { PropertiesPanel } from '@/components/workspace/PropertiesPanel';
import { LayerControls } from '@/components/workspace/LayerControls';
import { ExportDialog } from '@/components/export/ExportDialog';
import { useWorkspaceStore } from '@/store/workspaceStore';

export function StudioPage() {
  const [exportOpen, setExportOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'tools' | 'props' | null>(null);
  const refreshProjects = useWorkspaceStore((s) => s.refreshProjects);
  const detectionStatus = useWorkspaceStore((s) => s.detectionStatus);
  const detectionError = useWorkspaceStore((s) => s.detectionError);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useWorkspaceStore.getState().undo();
      }
      if (meta && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        useWorkspaceStore.getState().redo();
      }
      if (meta && e.key === 's') {
        e.preventDefault();
        void useWorkspaceStore.getState().saveCurrentProject();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-bg)]">
      <Toolbar onExport={() => setExportOpen(true)} />

      {(detectionStatus === 'no-face' || detectionStatus === 'error') && detectionError && (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2 text-[11px] text-[var(--color-soft-gold)]">
          {detectionError}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Left sidebar — desktop */}
        <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-panel)] lg:block">
          <div className="border-b border-[var(--color-border)] px-3 py-2.5 text-[10px] font-semibold tracking-[0.18em] text-[var(--color-text-secondary)]">
            LAYERS
          </div>
          <div className="px-3 py-2">
            <LayerControls />
          </div>
          <div className="border-t border-[var(--color-border)] px-3 py-3 text-[10px] leading-relaxed text-[var(--color-text-secondary)]">
            Drag landmarks to correct. Space + drag to pan. Scroll to zoom.
            Portraits stay local on this device.
          </div>
        </aside>

        {/* Center canvas */}
        <main className="relative min-w-0 flex-1">
          <DrawingCanvas />

          {/* Mobile toggles */}
          <div className="absolute bottom-3 left-3 right-3 flex gap-2 lg:hidden">
            <button
              type="button"
              onClick={() =>
                setMobilePanel((p) => (p === 'tools' ? null : 'tools'))
              }
              className="flex-1 border border-[var(--color-border)] bg-[var(--color-panel)]/95 px-3 py-2 text-[10px] tracking-wider text-[var(--color-text)]"
            >
              LAYERS
            </button>
            <button
              type="button"
              onClick={() =>
                setMobilePanel((p) => (p === 'props' ? null : 'props'))
              }
              className="flex-1 border border-[var(--color-border)] bg-[var(--color-panel)]/95 px-3 py-2 text-[10px] tracking-wider text-[var(--color-text)]"
            >
              PROPERTIES
            </button>
          </div>
        </main>

        {/* Right sidebar — desktop */}
        <div className="hidden w-72 shrink-0 border-l border-[var(--color-border)] lg:block">
          <PropertiesPanel onExport={() => setExportOpen(true)} />
        </div>
      </div>

      {/* Mobile drawers */}
      {mobilePanel === 'tools' && (
        <div className="fixed inset-x-0 bottom-0 z-40 max-h-[50vh] overflow-y-auto border-t border-[var(--color-border)] bg-[var(--color-panel)] p-3 lg:hidden">
          <LayerControls />
        </div>
      )}
      {mobilePanel === 'props' && (
        <div className="fixed inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-y-auto border-t border-[var(--color-border)] bg-[var(--color-panel)] lg:hidden">
          <PropertiesPanel onExport={() => setExportOpen(true)} />
        </div>
      )}

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
