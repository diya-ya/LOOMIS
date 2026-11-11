import { useWorkspaceStore } from '@/store/workspaceStore';
import type { LayerVisibility } from '@/types';

const LAYER_ITEMS: { key: keyof LayerVisibility; label: string }[] = [
  { key: 'portrait', label: 'Portrait' },
  { key: 'landmarks', label: 'Landmarks' },
  { key: 'cranialSphere', label: 'Cranial sphere' },
  { key: 'sidePlane', label: 'Side plane' },
  { key: 'centerline', label: 'Centerline' },
  { key: 'primaryDivisions', label: 'Primary divisions' },
  { key: 'eyeGuides', label: 'Eye guides' },
  { key: 'mouthGuides', label: 'Mouth guides' },
  { key: 'verticalSubdivisions', label: 'Vertical subdivisions' },
  { key: 'jawConstruction', label: 'Jaw construction' },
  { key: 'measurements', label: 'Measurements' },
  { key: 'rulers', label: 'Rulers' },
];

export function LayerControls() {
  const layers = useWorkspaceStore((s) => s.layers);
  const setLayer = useWorkspaceStore((s) => s.setLayer);

  return (
    <div className="space-y-1">
      {LAYER_ITEMS.map((item) => (
        <label
          key={item.key}
          className="flex cursor-pointer items-center justify-between gap-2 py-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
        >
          <span>{item.label}</span>
          <input
            type="checkbox"
            checked={layers[item.key]}
            onChange={(e) => setLayer(item.key, e.target.checked)}
            className="accent-[var(--color-accent)]"
          />
        </label>
      ))}
    </div>
  );
}
