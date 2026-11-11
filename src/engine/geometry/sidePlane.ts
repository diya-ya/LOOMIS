import type {
  CranialSphereGeometry,
  FacePose,
  Landmark,
  SidePlaneGeometry,
  Size2D,
  ImageFit,
} from '@/types';
import { requireLm } from './helpers';
import { normalizedToCanvas } from '@/engine/image/imageTransform';
import { buildFaceFrame, type FaceFrame } from './faceFrame';
import { DEFAULT_ORIENTATION_CONFIG } from '@/engine/vision/orientationConfig';

/**
 * Estimate the side plane of the head using the shared face frame.
 * Visibility is driven by yaw only — not by roll.
 */
export function computeSidePlane(
  landmarks: Landmark[],
  pose: FacePose,
  sphere: CranialSphereGeometry,
  image: Size2D,
  fit: ImageFit,
  frame?: FaceFrame,
): SidePlaneGeometry {
  const face = frame ?? buildFaceFrame(landmarks, pose, image, fit);
  const absYaw = Math.abs(pose.yaw);
  const frontalThresh = DEFAULT_ORIENTATION_CONFIG.yawFrontalDeg * 0.65;

  if (absYaw < frontalThresh) {
    return {
      visible: false,
      edge: {
        id: 'side-plane',
        start: sphere.center,
        end: sphere.center,
      },
      contour: [],
      warning: undefined,
    };
  }

  if (absYaw > 65) {
    return {
      visible: true,
      edge: {
        id: 'side-plane',
        start: sphere.center,
        end: sphere.center,
      },
      contour: [],
      warning:
        'Profile view detected — side-plane approximation is limited. Adjust manually if needed.',
    };
  }

  const toC = (id: Parameters<typeof requireLm>[1], fb: { x: number; y: number }) =>
    normalizedToCanvas(requireLm(landmarks, id, fb), image, fit);

  const brow = toC('browCenter', { x: 0.5, y: 0.38 });
  const chin = toC('chin', { x: 0.5, y: 0.85 });
  const noseTip = toC('noseTip', { x: 0.5, y: 0.55 });

  const sideSign = pose.yaw >= 0 ? -1 : 1;
  const planeOffset = sphere.radiusX * (0.35 + absYaw / 120);
  const { across, down } = face;

  const top = {
    x: sphere.center.x + across.x * sideSign * planeOffset - down.x * sphere.radiusY * 0.85,
    y: sphere.center.y + across.y * sideSign * planeOffset - down.y * sphere.radiusY * 0.85,
  };
  const browEdge = {
    x: brow.x + across.x * sideSign * planeOffset * 0.9,
    y: brow.y + across.y * sideSign * planeOffset * 0.9,
  };
  const cheekEdge = {
    x: noseTip.x + across.x * sideSign * planeOffset * 0.75,
    y: noseTip.y + across.y * sideSign * planeOffset * 0.55,
  };
  const jawEdge = {
    x: chin.x + across.x * sideSign * planeOffset * 0.45,
    y: chin.y + across.y * sideSign * planeOffset * 0.2,
  };

  return {
    visible: true,
    edge: {
      id: 'side-plane',
      start: top,
      end: jawEdge,
      label: 'Side plane',
    },
    contour: [top, browEdge, cheekEdge, jawEdge],
    warning:
      absYaw > 40
        ? 'Strong turn — side plane is an approximation. Verify against your reference.'
        : undefined,
  };
}
