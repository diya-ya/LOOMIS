import { create } from 'zustand';
import type {
  CanvasConfig,
  DetectedFace,
  DetectionStatus,
  FacePose,
  HistoryEntry,
  ImageTransform,
  Landmark,
  LandmarkId,
  LayerVisibility,
  LoomisConstruction,
  MeasurementPrefs,
  PortraitImage,
  ProjectSnapshot,
  Unit,
  ViewportState,
} from '@/types';
import {
  DEFAULT_CANVAS,
  DEFAULT_LAYERS,
  DEFAULT_MEASUREMENTS,
  DEFAULT_VIEWPORT,
} from '@/types';
import { fitImageToCanvas, fitHeadFocus } from '@/engine/image/imageFitting';
import { convertUnit, rotatedImageSize } from '@/engine/image/imageTransform';
import { detectFacesFromDataUrl } from '@/engine/vision/faceLandmarker';
import { poseFromNamedLandmarks } from '@/engine/vision/poseFromNamedLandmarks';
import { buildLoomisConstruction } from '@/engine/loomis/primaryGuides';
import { buildMeasurements } from '@/engine/measurements/distanceCalculator';
import {
  createProjectId,
  deleteProject,
  listProjects,
  loadProject,
  renameProject,
  saveProject,
} from '@/utils/persistence';

const MAX_HISTORY = 50;

type WorkspaceState = {
  image: PortraitImage | null;
  canvas: CanvasConfig;
  imageTransform: ImageTransform;
  faces: DetectedFace[];
  selectedFaceId: string | null;
  landmarks: Landmark[];
  detectionStatus: DetectionStatus;
  detectionError: string | null;
  construction: LoomisConstruction | null;
  layers: LayerVisibility;
  measurements: MeasurementPrefs;
  viewport: ViewportState;
  history: HistoryEntry[];
  historyIndex: number;
  projectId: string | null;
  projectName: string;
  savedProjects: ProjectSnapshot[];
  compareMode: boolean;
  isExporting: boolean;

  // Derived helpers exposed as methods
  getImageSize: () => { width: number; height: number };
  getFit: () => ReturnType<typeof fitImageToCanvas>;
  getMeasurementAnnotations: () => ReturnType<typeof buildMeasurements>;

  setCanvas: (partial: Partial<CanvasConfig>) => void;
  setUnit: (unit: Unit) => void;
  swapOrientation: () => void;
  setImageTransform: (partial: Partial<ImageTransform>) => void;
  setLayer: (key: keyof LayerVisibility, value: boolean) => void;
  setLayers: (layers: Partial<LayerVisibility>) => void;
  setMeasurements: (partial: Partial<MeasurementPrefs>) => void;
  setViewport: (partial: Partial<ViewportState>) => void;
  resetViewport: () => void;

  uploadImage: (file: File) => Promise<void>;
  replaceImage: (file: File) => Promise<void>;
  removeImage: () => void;
  rotateImage: (delta: 90 | -90) => void;

  detectFace: () => Promise<void>;
  selectFace: (faceId: string) => void;
  updateLandmark: (id: LandmarkId, x: number, y: number) => void;
  rebuildConstruction: () => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  resetAnalysis: () => void;

  toggleCompare: () => void;

  saveCurrentProject: () => Promise<void>;
  loadSavedProject: (id: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
  deleteSavedProject: (id: string) => Promise<void>;
  renameSavedProject: (id: string, name: string) => Promise<void>;
  setProjectName: (name: string) => void;
};

function snapshotEntry(state: {
  landmarks: Landmark[];
  layers: LayerVisibility;
  canvas: CanvasConfig;
  measurements: MeasurementPrefs;
  imageTransform: ImageTransform;
}): HistoryEntry {
  return {
    landmarks: structuredClone(state.landmarks),
    layers: { ...state.layers },
    canvas: { ...state.canvas },
    measurements: { ...state.measurements },
    imageTransform: { ...state.imageTransform },
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function loadImageMeta(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Invalid image'));
    img.src = dataUrl;
  });
}

const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED.includes(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
    return 'Please upload a JPG, PNG, or WebP image.';
  }
  if (file.size > 25 * 1024 * 1024) {
    return 'Image must be under 25 MB.';
  }
  return null;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  image: null,
  canvas: { ...DEFAULT_CANVAS },
  imageTransform: { rotation: 0, cropMode: 'fit' },
  faces: [],
  selectedFaceId: null,
  landmarks: [],
  detectionStatus: 'idle',
  detectionError: null,
  construction: null,
  layers: { ...DEFAULT_LAYERS },
  measurements: { ...DEFAULT_MEASUREMENTS },
  viewport: { ...DEFAULT_VIEWPORT },
  history: [],
  historyIndex: -1,
  projectId: null,
  projectName: 'Untitled portrait',
  savedProjects: [],
  compareMode: false,
  isExporting: false,

  getImageSize: () => {
    const { image, imageTransform } = get();
    if (!image) return { width: 0, height: 0 };
    return rotatedImageSize(
      { width: image.width, height: image.height },
      imageTransform.rotation,
    );
  },

  getFit: () => {
    const state = get();
    const size = state.getImageSize();
    const canvasSize = { width: state.canvas.width, height: state.canvas.height };
    if (state.imageTransform.cropMode === 'head-focus' && state.faces.length) {
      const face =
        state.faces.find((f) => f.id === state.selectedFaceId) ?? state.faces[0];
      if (face) {
        return fitHeadFocus(size, canvasSize, face.boundingBox);
      }
    }
    return fitImageToCanvas(size, canvasSize);
  },

  getMeasurementAnnotations: () => {
    const state = get();
    if (!state.construction || !state.image) return [];
    return buildMeasurements(
      state.landmarks,
      state.construction,
      state.getImageSize(),
      state.getFit(),
      state.measurements,
      state.canvas.unit,
    );
  },

  setCanvas: (partial) => {
    get().pushHistory();
    set((s) => ({ canvas: { ...s.canvas, ...partial } }));
    get().rebuildConstruction();
  },

  setUnit: (unit) => {
    const state = get();
    if (state.canvas.unit === unit) return;
    get().pushHistory();
    const width = convertUnit(state.canvas.width, state.canvas.unit, unit);
    const height = convertUnit(state.canvas.height, state.canvas.unit, unit);
    set({
      canvas: {
        ...state.canvas,
        unit,
        width: Math.round(width * 1000) / 1000,
        height: Math.round(height * 1000) / 1000,
      },
      measurements: { ...state.measurements, unit },
    });
    get().rebuildConstruction();
  },

  swapOrientation: () => {
    get().pushHistory();
    set((s) => ({
      canvas: {
        ...s.canvas,
        width: s.canvas.height,
        height: s.canvas.width,
        orientation:
          s.canvas.orientation === 'portrait' ? 'landscape' : 'portrait',
      },
    }));
    get().rebuildConstruction();
  },

  setImageTransform: (partial) => {
    get().pushHistory();
    set((s) => ({ imageTransform: { ...s.imageTransform, ...partial } }));
    get().rebuildConstruction();
  },

  setLayer: (key, value) => {
    set((s) => ({ layers: { ...s.layers, [key]: value } }));
  },

  setLayers: (layers) => {
    set((s) => ({ layers: { ...s.layers, ...layers } }));
  },

  setMeasurements: (partial) => {
    set((s) => ({ measurements: { ...s.measurements, ...partial } }));
  },

  setViewport: (partial) => {
    set((s) => ({ viewport: { ...s.viewport, ...partial } }));
  },

  resetViewport: () => set({ viewport: { ...DEFAULT_VIEWPORT } }),

  uploadImage: async (file) => {
    const error = validateImageFile(file);
    if (error) throw new Error(error);
    const dataUrl = await readFileAsDataUrl(file);
    const meta = await loadImageMeta(dataUrl);
    set({
      image: {
        id: `img-${Date.now()}`,
        name: file.name,
        mimeType: file.type || 'image/jpeg',
        width: meta.width,
        height: meta.height,
        dataUrl,
        blob: file,
      },
      faces: [],
      selectedFaceId: null,
      landmarks: [],
      construction: null,
      detectionStatus: 'idle',
      detectionError: null,
      imageTransform: { rotation: 0, cropMode: 'fit' },
      history: [],
      historyIndex: -1,
      projectId: get().projectId ?? createProjectId(),
    });
  },

  replaceImage: async (file) => {
    await get().uploadImage(file);
  },

  removeImage: () => {
    set({
      image: null,
      faces: [],
      selectedFaceId: null,
      landmarks: [],
      construction: null,
      detectionStatus: 'idle',
      detectionError: null,
    });
  },

  rotateImage: (delta) => {
    get().pushHistory();
    set((s) => {
      const next = ((s.imageTransform.rotation + delta + 360) % 360) as
        | 0
        | 90
        | 180
        | 270;
      return { imageTransform: { ...s.imageTransform, rotation: next } };
    });
    get().rebuildConstruction();
  },

  detectFace: async () => {
    const { image } = get();
    if (!image) return;
    set({ detectionStatus: 'detecting', detectionError: null });
    try {
      const faces = await detectFacesFromDataUrl(image.dataUrl);
      if (faces.length === 0) {
        set({
          faces: [],
          selectedFaceId: null,
          landmarks: [],
          construction: null,
          detectionStatus: 'no-face',
          detectionError:
            'No face detected. Try a clearer portrait, better lighting, or place landmarks manually.',
        });
        return;
      }
      const selected = faces[0];
      set({
        faces,
        selectedFaceId: faces.length === 1 ? selected.id : null,
        landmarks: faces.length === 1 ? selected.landmarks : [],
        detectionStatus: faces.length === 1 ? 'success' : 'success',
        detectionError:
          faces.length > 1
            ? 'Multiple faces detected — select the intended subject.'
            : null,
      });
      if (faces.length === 1) {
        get().pushHistory();
        get().rebuildConstruction();
      }
    } catch (err) {
      set({
        detectionStatus: 'error',
        detectionError:
          err instanceof Error
            ? err.message
            : 'Face detection failed. Check your connection and retry.',
      });
    }
  },

  selectFace: (faceId) => {
    const face = get().faces.find((f) => f.id === faceId);
    if (!face) return;
    get().pushHistory();
    set({
      selectedFaceId: faceId,
      landmarks: structuredClone(face.landmarks),
      detectionError: null,
    });
    get().rebuildConstruction();
  },

  updateLandmark: (id, x, y) => {
    get().pushHistory();
    set((s) => ({
      landmarks: s.landmarks.map((l) =>
        l.id === id
          ? { ...l, x, y, manual: true, estimated: false, confidence: 1 }
          : l,
      ),
    }));
    get().rebuildConstruction();
  },

  rebuildConstruction: () => {
    const state = get();
    if (!state.image || state.landmarks.length === 0) {
      set({ construction: null });
      return;
    }
    // Re-estimate orientation from current landmarks so manual corrections
    // update roll/yaw/pitch without requiring a full MediaPipe pass.
    const landmarkPose = poseFromNamedLandmarks(state.landmarks);
    const face =
      state.faces.find((f) => f.id === state.selectedFaceId) ?? state.faces[0];

    // Keep matrix-informed yaw/pitch from detection when landmarks haven't
    // been manually edited heavily; always use landmark roll (deadzoned).
    const hasManual = state.landmarks.some((l) => l.manual);
    let pose: FacePose = landmarkPose;
    if (face?.pose && !hasManual) {
      pose = {
        ...landmarkPose,
        yaw: face.pose.yaw * 0.65 + landmarkPose.yaw * 0.35,
        pitch: face.pose.pitch * 0.65 + landmarkPose.pitch * 0.35,
        classification: landmarkPose.classification,
      };
    }

    // Persist refreshed pose onto the selected face for the UI
    const faces = state.faces.map((f) =>
      f.id === (state.selectedFaceId ?? face?.id) ? { ...f, pose } : f,
    );

    const construction = buildLoomisConstruction(
      state.landmarks,
      pose,
      state.getImageSize(),
      state.getFit(),
    );
    set({ construction, faces });
  },

  pushHistory: () => {
    const state = get();
    const entry = snapshotEntry(state);
    const trimmed = state.history.slice(0, state.historyIndex + 1);
    trimmed.push(entry);
    if (trimmed.length > MAX_HISTORY) trimmed.shift();
    set({
      history: trimmed,
      historyIndex: trimmed.length - 1,
    });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex <= 0) return;
    const nextIndex = state.historyIndex - 1;
    const entry = state.history[nextIndex];
    set({
      historyIndex: nextIndex,
      landmarks: structuredClone(entry.landmarks),
      layers: { ...entry.layers },
      canvas: { ...entry.canvas },
      measurements: { ...entry.measurements },
      imageTransform: { ...entry.imageTransform },
    });
    get().rebuildConstruction();
  },

  redo: () => {
    const state = get();
    if (state.historyIndex >= state.history.length - 1) return;
    const nextIndex = state.historyIndex + 1;
    const entry = state.history[nextIndex];
    set({
      historyIndex: nextIndex,
      landmarks: structuredClone(entry.landmarks),
      layers: { ...entry.layers },
      canvas: { ...entry.canvas },
      measurements: { ...entry.measurements },
      imageTransform: { ...entry.imageTransform },
    });
    get().rebuildConstruction();
  },

  resetAnalysis: () => {
    const state = get();
    const face =
      state.faces.find((f) => f.id === state.selectedFaceId) ?? state.faces[0];
    if (!face) return;
    get().pushHistory();
    set({
      landmarks: structuredClone(face.landmarks),
      layers: { ...DEFAULT_LAYERS },
      imageTransform: { rotation: 0, cropMode: 'fit' },
    });
    get().rebuildConstruction();
  },

  toggleCompare: () => set((s) => ({ compareMode: !s.compareMode })),

  saveCurrentProject: async () => {
    const state = get();
    const id = state.projectId ?? createProjectId();
    const snapshot: ProjectSnapshot = {
      id,
      name: state.projectName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      image: state.image
        ? {
            id: state.image.id,
            name: state.image.name,
            mimeType: state.image.mimeType,
            width: state.image.width,
            height: state.image.height,
            dataUrl: state.image.dataUrl,
          }
        : null,
      canvas: state.canvas,
      imageTransform: state.imageTransform,
      landmarks: state.landmarks,
      selectedFaceId: state.selectedFaceId,
      faces: state.faces,
      detectionStatus: state.detectionStatus,
      construction: state.construction,
      layers: state.layers,
      measurements: state.measurements,
      viewport: state.viewport,
    };
    await saveProject(snapshot);
    set({ projectId: id });
    await get().refreshProjects();
  },

  loadSavedProject: async (id) => {
    const project = await loadProject(id);
    if (!project) return;
    set({
      projectId: project.id,
      projectName: project.name,
      image: project.image,
      canvas: project.canvas,
      imageTransform: project.imageTransform,
      landmarks: project.landmarks,
      selectedFaceId: project.selectedFaceId,
      faces: project.faces,
      detectionStatus: project.detectionStatus,
      construction: project.construction,
      layers: project.layers,
      measurements: project.measurements,
      viewport: project.viewport,
      history: [],
      historyIndex: -1,
    });
    if (!project.construction && project.landmarks.length > 0) {
      get().rebuildConstruction();
    }
  },

  refreshProjects: async () => {
    const savedProjects = await listProjects();
    set({ savedProjects });
  },

  deleteSavedProject: async (id) => {
    await deleteProject(id);
    await get().refreshProjects();
  },

  renameSavedProject: async (id, name) => {
    await renameProject(id, name);
    if (get().projectId === id) set({ projectName: name });
    await get().refreshProjects();
  },

  setProjectName: (name) => set({ projectName: name }),
}));
