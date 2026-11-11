import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision';
import type { DetectedFace, FacePose } from '@/types';
import {
  boundingBoxFromRaw,
  mapMediaPipeLandmarks,
  rawToPoints,
  MP,
} from './landmarkMapping';
import {
  combineOrientation,
  estimateOrientationFromLandmarks,
  poseFromMatrix,
  type OrientationEstimate,
} from './orientationEstimator';

const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

export async function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        numFaces: 4,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: true,
      });
    })().catch(async (err) => {
      console.warn('FaceLandmarker GPU init failed, retrying CPU', err);
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'CPU',
        },
        runningMode: 'IMAGE',
        numFaces: 4,
        outputFacialTransformationMatrixes: true,
      });
    });
  }
  return landmarkerPromise;
}

function avg(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function orientationToPose(est: OrientationEstimate): FacePose & OrientationEstimate {
  return est;
}

function resultToFaces(result: FaceLandmarkerResult): DetectedFace[] {
  const faces: DetectedFace[] = [];
  const count = result.faceLandmarks?.length ?? 0;

  for (let i = 0; i < count; i++) {
    const raw = result.faceLandmarks[i];
    if (!raw || raw.length < 468) continue;

    const landmarks = mapMediaPipeLandmarks(raw, 0.9);
    const box = boundingBoxFromRaw(raw);
    const get = (idx: number) => ({ x: raw[idx].x, y: raw[idx].y });

    // Always estimate robust landmark-based orientation (especially roll)
    const landmarkPose = estimateOrientationFromLandmarks({
      leftEyeOuter: get(MP.leftEyeOuter),
      leftEyeInner: get(MP.leftEyeInner),
      rightEyeInner: get(MP.rightEyeInner),
      rightEyeOuter: get(MP.rightEyeOuter),
      leftBrow: avg(get(MP.leftBrowInner), get(MP.leftBrowOuter)),
      rightBrow: avg(get(MP.rightBrowInner), get(MP.rightBrowOuter)),
      mouthLeft: get(MP.leftMouth),
      mouthRight: get(MP.rightMouth),
      noseTip: get(MP.noseTip),
      noseBridge: get(MP.noseBridge),
      chin: get(MP.chin),
      forehead: get(MP.foreheadTop),
      leftCheek: get(MP.leftCheek),
      rightCheek: get(MP.rightCheek),
    });

    const matrix = result.facialTransformationMatrixes?.[i];
    const matrixPose =
      matrix?.data && matrix.data.length >= 16
        ? poseFromMatrix(matrix.data)
        : null;

    // Landmark roll + matrix yaw/pitch (when available)
    const combined = combineOrientation(landmarkPose, matrixPose);
    const pose = orientationToPose(combined);

    const overallConfidence = Math.min(
      0.95,
      (combined.rollConfidence + combined.yawConfidence + combined.pitchConfidence) /
        3,
    );

    faces.push({
      id: `face-${i}`,
      landmarks,
      rawLandmarks: rawToPoints(raw),
      pose,
      confidence: overallConfidence,
      boundingBox: box,
    });
  }

  return faces;
}

export async function detectFaces(
  image: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
): Promise<DetectedFace[]> {
  const landmarker = await getFaceLandmarker();
  const result = landmarker.detect(image);
  return resultToFaces(result);
}

export async function detectFacesFromDataUrl(
  dataUrl: string,
): Promise<DetectedFace[]> {
  const img = await loadImage(dataUrl);
  return detectFaces(img);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for detection'));
    img.src = src;
  });
}

export function resetFaceLandmarker(): void {
  landmarkerPromise = null;
}
