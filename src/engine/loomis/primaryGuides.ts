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
import { buildFaceFrame } from '@/engine/geometry/faceFrame';
import { computeEyeGuides } from './eyeGuides';
import { computeMouthGuides } from './mouthGuides';
import { computeVerticalSubdivisions } from './verticalSubdivisions';
import { computeJawConstruction } from './jawConstruction';
import { mid } from '@/engine/geometry/helpers';

type PoseWithConfidence = FacePose & {
  rollConfidence?: number;
  yawConfidence?: number;
  pitchConfidence?: number;
  rawRoll?: number;
  notes?: string[];
};

/**
 * Orchestrate full Loomis construction from landmarks + pose.
 * Builds a single FaceFrame first so all guides share one orientation.
 */
export function buildLoomisConstruction(
  landmarks: Landmark[],
  pose: FacePose,
  image: Size2D,
  fit: ImageFit,
): LoomisConstruction {
  const warnings: string[] = [];
  const poseEx = pose as PoseWithConfidence;

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

  if (poseEx.rollConfidence !== undefined && poseEx.rollConfidence < 0.55) {
    warnings.push(
      'Orientation confidence is low — construction may be misleading. Correct landmarks manually.',
    );
  }

  if (poseEx.notes?.length) {
    for (const note of poseEx.notes) {
      if (
        note.includes('low') ||
        note.includes('disagreed') ||
        note.includes('Rejected')
      ) {
        warnings.push(note);
      }
    }
  }

  // One shared frame for the entire construction
  const frame = buildFaceFrame(landmarks, pose, image, fit);

  const sphere = computeCranialSphere(landmarks, pose, image, fit, frame);
  const halfWidth = sphere.radiusX * 0.95;

  const sidePlane = computeSidePlane(landmarks, pose, sphere, image, fit, frame);
  if (sidePlane.warning) warnings.push(sidePlane.warning);

  const centerline = computeCenterline(landmarks, pose, image, fit, frame);
  const divisions = computeFacialDivisions(
    landmarks,
    pose,
    image,
    fit,
    halfWidth,
    frame,
  );

  if (!divisions.equalDivision) {
    warnings.push(
      'Primary thirds deviate from equal Loomis proportions — adapted to detected features.',
    );
  }

  const eyeGuides = computeEyeGuides(
    landmarks,
    pose,
    image,
    fit,
    halfWidth,
    frame,
  );
  const mouthGuides = computeMouthGuides(
    landmarks,
    pose,
    image,
    fit,
    halfWidth,
    frame,
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
    frame,
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
