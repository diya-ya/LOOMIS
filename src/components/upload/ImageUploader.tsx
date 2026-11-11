import { useCallback, useRef, useState } from 'react';
import {
  useWorkspaceStore,
  validateImageFile,
} from '@/store/workspaceStore';
import { formatAspectRatio, imageAspectRatio } from '@/engine/image/imageFitting';

export function ImageUploader() {
  const image = useWorkspaceStore((s) => s.image);
  const uploadImage = useWorkspaceStore((s) => s.uploadImage);
  const replaceImage = useWorkspaceStore((s) => s.replaceImage);
  const removeImage = useWorkspaceStore((s) => s.removeImage);
  const detectFace = useWorkspaceStore((s) => s.detectFace);
  const rotateImage = useWorkspaceStore((s) => s.rotateImage);
  const detectionStatus = useWorkspaceStore((s) => s.detectionStatus);

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = useCallback(
    async (file: File, replace = false) => {
      const validation = validateImageFile(file);
      if (validation) {
        setError(validation);
        return;
      }
      setError(null);
      setBusy(true);
      try {
        if (replace) await replaceImage(file);
        else await uploadImage(file);
        await detectFace();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed');
      } finally {
        setBusy(false);
      }
    },
    [uploadImage, replaceImage, detectFace],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file, Boolean(image));
  };

  if (image) {
    return (
      <div className="space-y-3">
        <div className="relative overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg)]">
          <img
            src={image.dataUrl}
            alt={image.name}
            className="max-h-40 w-full object-contain"
          />
        </div>
        <div className="text-[11px] text-[var(--color-text-secondary)]">
          <p className="truncate text-[var(--color-text)]">{image.name}</p>
          <p className="mt-1">
            {image.width} × {image.height}px ·{' '}
            {formatAspectRatio(imageAspectRatio(image))}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="border border-[var(--color-border)] px-2.5 py-1.5 text-[10px] tracking-wider text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            onClick={() => inputRef.current?.click()}
          >
            REPLACE
          </button>
          <button
            type="button"
            className="border border-[var(--color-border)] px-2.5 py-1.5 text-[10px] tracking-wider text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            onClick={() => rotateImage(90)}
          >
            ROTATE
          </button>
          <button
            type="button"
            className="border border-[var(--color-border)] px-2.5 py-1.5 text-[10px] tracking-wider text-[var(--color-accent)] hover:opacity-80"
            onClick={() => removeImage()}
          >
            REMOVE
          </button>
        </div>
        {detectionStatus === 'detecting' && (
          <p className="text-[11px] text-[var(--color-soft-gold)]">Detecting face…</p>
        )}
        {error && <p className="text-[11px] text-red-400">{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f, true);
            e.target.value = '';
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer border border-dashed px-4 py-10 text-center transition-colors ${
          dragOver
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
            : 'border-[var(--color-border)] hover:border-[var(--color-structural)]'
        }`}
      >
        <p className="text-xs tracking-wide text-[var(--color-text)]">
          {busy ? 'Loading…' : 'Drop portrait here'}
        </p>
        <p className="mt-2 text-[11px] text-[var(--color-text-secondary)]">
          JPG, PNG, or WebP · or click to browse
        </p>
      </div>
      {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
