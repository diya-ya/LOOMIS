import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision';
import type { DetectedFace } from '@/types';
import {
  boundingBoxFromRaw,
  mapMediaPipeLandmarks,
  rawToPoints,
} from './landmarkMapping';
import { poseFromLandmarks, poseFromMatrix } from './orientationEstimator';
import { MP } from './landmarkMapping';

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
      // Retry with CPU if GPU fails
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

function resultToFaces(result: FaceLandmarkerResult): DetectedFace[] {
  const faces: DetectedFace[] = [];
  const count = result.faceLandmarks?.length ?? 0;

  for (let i = 0; i < count; i++) {
    const raw = result.faceLandmarks[i];
    if (!raw || raw.length < 468) continue;

    const landmarks = mapMediaPipeLandmarks(raw, 0.9);
    const box = boundingBoxFromRaw(raw);

    let pose;
    const matrix = result.facialTransformationMatrixes?.[i];
    if (matrix?.data && matrix.data.length >= 16) {
      pose = poseFromMatrix(matrix.data);
    } else {
      const get = (idx: number) => ({ x: raw[idx].x, y: raw[idx].y });
      pose = poseFromLandmarks({
        leftEye: get(MP.leftEyeOuter),
        rightEye: get(MP.rightEyeOuter),
        noseTip: get(MP.noseTip),
        mouthLeft: get(MP.leftMouth),
        mouthRight: get(MP.rightMouth),
        chin: get(MP.chin),
        forehead: get(MP.foreheadTop),
      });
    }

    faces.push({
      id: `face-${i}`,
      landmarks,
      rawLandmarks: rawToPoints(raw),
      pose,
      confidence: 0.9,
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
