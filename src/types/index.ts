export type Unit = 'cm' | 'in' | 'mm';

export type Orientation = 'portrait' | 'landscape';

export type FaceOrientationClass =
  | 'frontal'
  | 'slightly-turned'
  | 'three-quarter'
  | 'profile'
  | 'uncertain';

export type Point2D = {
  x: number;
  y: number;
};

export type Size2D = {
  width: number;
  height: number;
};

export type Rect = Point2D & Size2D;

export type ImageFit = {
  scale: number;
  width: number;
  height: number;
  x: number;
  y: number;
};

export type CanvasConfig = {
  width: number;
  height: number;
  unit: Unit;
  orientation: Orientation;
};

export type LandmarkId =
  | 'hairline'
  | 'browCenter'
  | 'noseTip'
  | 'noseBottom'
  | 'chin'
  | 'leftEyeOuter'
  | 'leftEyeInner'
  | 'rightEyeInner'
  | 'rightEyeOuter'
  | 'leftMouth'
  | 'rightMouth'
  | 'leftCheek'
  | 'rightCheek'
  | 'leftJaw'
  | 'rightJaw'
  | 'forehead'
  | 'leftTemple'
  | 'rightTemple'
  | 'upperLip'
  | 'lowerLip'
  | 'leftUpperEyelid'
  | 'leftLowerEyelid'
  | 'rightUpperEyelid'
  | 'rightLowerEyelid'
  | 'noseBridge'
  | 'faceCenter';

/** Normalized image coordinates (0–1 relative to image). */
export type Landmark = {
  id: LandmarkId;
  x: number;
  y: number;
  confidence: number;
  estimated?: boolean;
  manual?: boolean;
};

export type FacePose = {
  yaw: number;
  pitch: number;
  /** Applied in-plane roll after deadzone / robust estimation (degrees). */
  roll: number;
  classification: FaceOrientationClass;
  /** Raw roll before deadzone, when available. */
  rawRoll?: number;
  rollConfidence?: number;
  yawConfidence?: number;
  pitchConfidence?: number;
  notes?: string[];
};

export type DetectedFace = {
  id: string;
  landmarks: Landmark[];
  rawLandmarks: Point2D[];
  pose: FacePose;
  confidence: number;
  boundingBox: Rect;
};

export type DetectionStatus =
  | 'idle'
  | 'loading'
  | 'detecting'
  | 'success'
  | 'no-face'
  | 'error';

export type LayerVisibility = {
  portrait: boolean;
  landmarks: boolean;
  cranialSphere: boolean;
  sidePlane: boolean;
  centerline: boolean;
  primaryDivisions: boolean;
  eyeGuides: boolean;
  mouthGuides: boolean;
  verticalSubdivisions: boolean;
  jawConstruction: boolean;
  measurements: boolean;
  rulers: boolean;
};

export type MeasurementPrecision = 0 | 1 | 2 | 3;

export type MeasurementPrefs = {
  unit: Unit;
  precision: MeasurementPrecision;
  showAnnotations: boolean;
};

export type LineGuide = {
  id: string;
  start: Point2D;
  end: Point2D;
  label?: string;
};

export type CurveGuide = {
  id: string;
  points: Point2D[];
  closed?: boolean;
  label?: string;
};

export type CranialSphereGeometry = {
  center: Point2D;
  radiusX: number;
  radiusY: number;
  equatorY: number;
  outline: Point2D[];
  equator: LineGuide;
};

export type SidePlaneGeometry = {
  visible: boolean;
  edge: LineGuide;
  contour: Point2D[];
  warning?: string;
};

export type FacialDivisionsGeometry = {
  hairline: LineGuide;
  brow: LineGuide;
  noseBottom: LineGuide;
  chin: LineGuide;
  equalDivision: boolean;
};

export type EyeGuidesGeometry = {
  upper: LineGuide;
  lower: LineGuide;
};

export type MouthGuidesGeometry = {
  upper: LineGuide;
  lower: LineGuide;
};

export type VerticalSubdivisionsGeometry = {
  facialWidth: number;
  unit: number;
  lines: LineGuide[];
  projected: boolean;
};

export type JawConstructionGeometry = {
  left: LineGuide[];
  right: LineGuide[];
};

export type LoomisConstruction = {
  cranialSphere: CranialSphereGeometry;
  sidePlane: SidePlaneGeometry;
  centerline: LineGuide;
  divisions: FacialDivisionsGeometry;
  eyeGuides: EyeGuidesGeometry;
  mouthGuides: MouthGuidesGeometry;
  verticalSubdivisions: VerticalSubdivisionsGeometry;
  jaw: JawConstructionGeometry;
  warnings: string[];
};

export type MeasurementAnnotation = {
  id: string;
  label: string;
  value: number;
  unit: Unit;
  start: Point2D;
  end: Point2D;
  offsetSide: 'left' | 'right' | 'top' | 'bottom';
};

export type ImageTransform = {
  rotation: 0 | 90 | 180 | 270;
  cropMode: 'fit' | 'head-focus';
};

export type PortraitImage = {
  id: string;
  name: string;
  mimeType: string;
  width: number;
  height: number;
  dataUrl: string;
  blob?: Blob;
};

export type ViewportState = {
  zoom: number;
  panX: number;
  panY: number;
};

export type ProjectSnapshot = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  image: PortraitImage | null;
  canvas: CanvasConfig;
  imageTransform: ImageTransform;
  landmarks: Landmark[];
  selectedFaceId: string | null;
  faces: DetectedFace[];
  detectionStatus: DetectionStatus;
  construction: LoomisConstruction | null;
  layers: LayerVisibility;
  measurements: MeasurementPrefs;
  viewport: ViewportState;
};

export type HistoryEntry = {
  landmarks: Landmark[];
  layers: LayerVisibility;
  canvas: CanvasConfig;
  measurements: MeasurementPrefs;
  imageTransform: ImageTransform;
};

export const DEFAULT_LAYERS: LayerVisibility = {
  portrait: true,
  landmarks: true,
  cranialSphere: true,
  sidePlane: true,
  centerline: true,
  primaryDivisions: true,
  eyeGuides: true,
  mouthGuides: true,
  verticalSubdivisions: true,
  jawConstruction: true,
  measurements: true,
  rulers: true,
};

export const DEFAULT_CANVAS: CanvasConfig = {
  width: 30,
  height: 40,
  unit: 'cm',
  orientation: 'portrait',
};

export const DEFAULT_MEASUREMENTS: MeasurementPrefs = {
  unit: 'cm',
  precision: 1,
  showAnnotations: true,
};

export const DEFAULT_VIEWPORT: ViewportState = {
  zoom: 1,
  panX: 0,
  panY: 0,
};

export const GUIDE_COLORS = {
  primary: '#C78368',
  eyeMouth: '#91A8B8',
  vertical: '#D0B77D',
  cranial: '#A9A9A2',
  sidePlane: '#A89BB8',
  centerline: '#F2EBE0',
  measure: '#EAE4DA',
  landmark: '#EAE4DA',
  landmarkEstimated: '#D0B77D',
} as const;
