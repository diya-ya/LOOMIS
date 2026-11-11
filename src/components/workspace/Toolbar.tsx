import { Link } from 'react-router-dom';
import { useWorkspaceStore } from '@/store/workspaceStore';

type Props = {
  onExport: () => void;
};

export function Toolbar({ onExport }: Props) {
  const undo = useWorkspaceStore((s) => s.undo);
  const redo = useWorkspaceStore((s) => s.redo);
  const resetAnalysis = useWorkspaceStore((s) => s.resetAnalysis);
  const detectFace = useWorkspaceStore((s) => s.detectFace);
  const saveCurrentProject = useWorkspaceStore((s) => s.saveCurrentProject);
  const historyIndex = useWorkspaceStore((s) => s.historyIndex);
  const history = useWorkspaceStore((s) => s.history);
  const image = useWorkspaceStore((s) => s.image);
  const detectionStatus = useWorkspaceStore((s) => s.detectionStatus);
  const toggleCompare = useWorkspaceStore((s) => s.toggleCompare);
  const compareMode = useWorkspaceStore((s) => s.compareMode);
  const resetViewport = useWorkspaceStore((s) => s.resetViewport);
  const setViewport = useWorkspaceStore((s) => s.setViewport);
  const viewport = useWorkspaceStore((s) => s.viewport);
  const projectName = useWorkspaceStore((s) => s.projectName);
  const setProjectName = useWorkspaceStore((s) => s.setProjectName);

  const btn =
    'border border-[var(--color-border)] px-2.5 py-1.5 text-[10px] tracking-wider text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-structural)] hover:text-[var(--color-text)] disabled:opacity-30';

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2">
      <Link
        to="/"
        className="mr-2 font-serif text-sm tracking-[0.18em] text-[var(--color-text)]"
      >
        LOOMIS
      </Link>

      <input
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        className="mr-2 hidden max-w-[160px] border-b border-transparent bg-transparent text-xs text-[var(--color-text-secondary)] outline-none hover:border-[var(--color-border)] focus:border-[var(--color-accent)] md:block"
      />

      <button type="button" className={btn} disabled={historyIndex <= 0} onClick={() => undo()}>
        UNDO
      </button>
      <button
        type="button"
        className={btn}
        disabled={historyIndex >= history.length - 1}
        onClick={() => redo()}
      >
        REDO
      </button>
      <button type="button" className={btn} disabled={!image} onClick={() => resetAnalysis()}>
        RESET
      </button>
      <button
        type="button"
        className={btn}
        disabled={!image || detectionStatus === 'detecting'}
        onClick={() => void detectFace()}
      >
        {detectionStatus === 'detecting' ? 'DETECTING…' : 'RE-DETECT'}
      </button>

      <div className="mx-1 h-4 w-px bg-[var(--color-border)]" />

      <button
        type="button"
        className={btn}
        onClick={() => setViewport({ zoom: Math.min(5, viewport.zoom * 1.2) })}
      >
        +
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => setViewport({ zoom: Math.max(0.25, viewport.zoom / 1.2) })}
      >
        −
      </button>
      <button type="button" className={btn} onClick={() => resetViewport()}>
        FIT
      </button>
      <button
        type="button"
        className={`${btn} ${compareMode ? 'border-[var(--color-accent)] text-[var(--color-accent)]' : ''}`}
        onClick={() => toggleCompare()}
      >
        COMPARE
      </button>

      <div className="ml-auto flex gap-2">
        <button
          type="button"
          className={btn}
          disabled={!image}
          onClick={() => void saveCurrentProject()}
        >
          SAVE
        </button>
        <button
          type="button"
          className="border border-[var(--color-accent)] bg-[var(--color-accent)]/10 px-2.5 py-1.5 text-[10px] tracking-wider text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 disabled:opacity-30"
          disabled={!image}
          onClick={onExport}
        >
          EXPORT
        </button>
      </div>
    </div>
  );
}
