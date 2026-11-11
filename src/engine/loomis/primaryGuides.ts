import type {
  FacePose,
  Landmark,
  LoomisConstruction,
  Size2D,
  ImageFit,
} from '@/types';
import { computeCranialSphere } from '@/engine/geometry/cranialSphere';
import { computeSidePlane } from '@/engine/geometry/sidePlane';
import { computeCenterline } from '@/engine/geometry/centerline';
import { computeFacialDivisions } from '@/engine/geometry/facialDivisions';
import { computeEyeGuides } from './eyeGuides';
import { computeMouthGuides } from './mouthGuides';
import { computeVerticalSubdivisions } from './verticalSubdivisions';
import { computeJawConstruction } from './jawConstruction';
import { mid } from '@/engine/geometry/helpers';

/**
 * Orchestrate full Loomis construction from landmarks + pose.
 * All output geometry is in physical canvas coordinates.
 */
export function buildLoomisConstruction(
  landmarks: Landmark[],
  pose: FacePose,
  image: Size2D,
  fit: ImageFit,
): LoomisConstruction {
  const warnings: string[] = [];

  if (landmarks.length === 0) {
    warnings.push('No landmarks available — construction cannot be generated.');
  }

  const hairline = landmarks.find((l) => l.id === 'hairline');
  if (hairline?.estimated) {
    warnings.push(
      'Hairline is estimated (MediaPipe does not detect hairline). Drag to correct.',
    );
  }

  if (pose.classification === 'uncertain') {
    warnings.push('Face orientation is uncertain — guides may need manual adjustment.');
  } else if (pose.classification === 'profile') {
    warnings.push(
      'Profile portrait — Loomis frontal construction is approximate. Prefer three-quarter or frontal references when possible.',
    );
  }

  const sphere = computeCranialSphere(landmarks, pose, image, fit);
  const halfWidth = sphere.radiusX * 0.95;

  const sidePlane = computeSidePlane(landmarks, pose, sphere, image, fit);
  if (sidePlane.warning) warnings.push(sidePlane.warning);

  const centerline = computeCenterline(landmarks, pose, image, fit);
  const divisions = computeFacialDivisions(
    landmarks,
    pose,
    image,
    fit,
    halfWidth,
  );

  if (!divisions.equalDivision) {
    warnings.push(
      'Primary thirds deviate from equal Loomis proportions — adapted to detected features.',
    );
  }

  const eyeGuides = computeEyeGuides(landmarks, pose, image, fit, halfWidth);
  const mouthGuides = computeMouthGuides(
    landmarks,
    pose,
    image,
    fit,
    halfWidth,
  );

  const top = mid(divisions.hairline.start, divisions.hairline.end);
  const bottom = mid(divisions.chin.start, divisions.chin.end);

  const verticalSubdivisions = computeVerticalSubdivisions(
    landmarks,
    pose,
    image,
    fit,
    top,
    bottom,
  );

  if (verticalSubdivisions.projected) {
    warnings.push(
      'Vertical subdivisions use projected facial-plane spacing for the turned head.',
    );
  }

  const jaw = computeJawConstruction(landmarks, image, fit);

  return {
    cranialSphere: sphere,
    sidePlane,
    centerline,
    divisions,
    eyeGuides,
    mouthGuides,
    verticalSubdivisions,
    jaw,
    warnings,
  };
}
