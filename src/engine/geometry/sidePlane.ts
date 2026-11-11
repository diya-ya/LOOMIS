import type {
  CranialSphereGeometry,
  FacePose,
  Landmark,
  SidePlaneGeometry,
  Size2D,
  ImageFit,
} from '@/types';
import { faceAcrossAxis, faceDownAxis, requireLm } from './helpers';
import { normalizedToCanvas } from '@/engine/image/imageTransform';

/**
 * Estimate the side plane of the head — the transition between
 * frontal facial plane and cranial side.
 */
export function computeSidePlane(
  landmarks: Landmark[],
  pose: FacePose,
  sphere: CranialSphereGeometry,
  image: Size2D,
  fit: ImageFit,
): SidePlaneGeometry {
  const absYaw = Math.abs(pose.yaw);

  if (absYaw < 8) {
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
  const down = faceDownAxis(pose);
  const across = faceAcrossAxis(pose);

  // Side plane sits on the far side of the turn
  const sideSign = pose.yaw >= 0 ? -1 : 1;
  const planeOffset = sphere.radiusX * (0.35 + absYaw / 120);

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

  const contour = [top, browEdge, cheekEdge, jawEdge];

  return {
    visible: true,
    edge: {
      id: 'side-plane',
      start: top,
      end: jawEdge,
      label: 'Side plane',
    },
    contour,
    warning:
      absYaw > 40
        ? 'Strong turn — side plane is an approximation. Verify against your reference.'
        : undefined,
  };
}
