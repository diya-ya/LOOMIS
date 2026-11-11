/**
 * Configurable thresholds for orientation estimation.
 * Values are in degrees unless noted.
 */
export type OrientationConfig = {
  /** |roll| below this → treat as exactly 0° */
  rollDeadzoneDeg: number;
  /** |roll| below this → apply with reduced weight / soft fade */
  rollCautionDeg: number;
  /** Soft fade: between deadzone and caution, scale applied roll */
  rollCautionFade: boolean;
  /** Max angular disagreement between landmark pairs before rejecting outliers (deg) */
  rollPairOutlierDeg: number;
  /** Minimum pairs required for high-confidence roll */
  minRollPairs: number;
  /** Prefer landmark roll over matrix roll for in-plane rotation */
  preferLandmarkRoll: boolean;
  /** |yaw| below this is treated as frontal for foreshortening */
  yawFrontalDeg: number;
};

export const DEFAULT_ORIENTATION_CONFIG: OrientationConfig = {
  rollDeadzoneDeg: 2,
  rollCautionDeg: 5,
  rollCautionFade: true,
  rollPairOutlierDeg: 8,
  minRollPairs: 2,
  preferLandmarkRoll: true,
  yawFrontalDeg: 12,
};

export function applyRollDeadzone(
  rawRollDeg: number,
  config: OrientationConfig = DEFAULT_ORIENTATION_CONFIG,
): number {
  const abs = Math.abs(rawRollDeg);
  if (abs <= config.rollDeadzoneDeg) return 0;
  if (!config.rollCautionFade || abs >= config.rollCautionDeg) {
    return rawRollDeg;
  }
  // Soft fade between deadzone and caution
  const t =
    (abs - config.rollDeadzoneDeg) /
    (config.rollCautionDeg - config.rollDeadzoneDeg);
  return rawRollDeg * t;
}
