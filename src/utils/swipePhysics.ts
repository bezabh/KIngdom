export type SwipeGestureAxis = 'pending' | 'horizontal' | 'vertical';

export interface SwipeSnapDecisionInput {
  /** Total horizontal displacement from touchStart in px */
  deltaX: number;
  /** Instantaneous release velocity in px/s (positive = moving right, negative = moving left) */
  velocityX: number;
  /** Configured minimum swipe threshold in px (from SwipeSensitivitySlider) */
  thresholdPx: number;
  /** Locked gesture axis */
  axis: SwipeGestureAxis;
}

export interface SwipeSnapDecision {
  shouldTransition: boolean;
  direction: 'left' | 'right';
  projectedDeltaX: number;
  springVelocity: number;
}

/** Velocity (px/s) considered an intentional flick */
export const MIN_FLICK_VELOCITY_PX_S = 380;
/** Momentum lookahead window (seconds) used for physics projection */
export const VELOCITY_PROJECTION_SEC = 0.14;
/** Pause duration (ms) after which finger is considered stopped mid-swipe */
export const SWIPE_PAUSE_DECAY_MS = 90;

/**
 * Computes rubber-band damped drag displacement so live drag feels tactile
 * 1:1 up to thresholdPx and gently resists beyond.
 */
export function computeDampedDragX(rawDeltaX: number, thresholdPx: number): number {
  const abs = Math.abs(rawDeltaX);
  const sign = rawDeltaX < 0 ? -1 : 1;
  if (abs <= thresholdPx) {
    return rawDeltaX;
  }
  const excess = abs - thresholdPx;
  const damped = thresholdPx + Math.min(90, excess * 0.42);
  return sign * damped;
}

/**
 * Decides whether a released swipe gesture should snap forward to the next/previous tab
 * or spring back to the current tab based on release velocity and displacement.
 */
export function computeSwipeSnapDecision(
  input: SwipeSnapDecisionInput
): SwipeSnapDecision {
  const { deltaX, velocityX, thresholdPx, axis } = input;
  const direction: 'left' | 'right' = deltaX < 0 ? 'left' : 'right';

  if (axis === 'vertical' || Math.abs(deltaX) < 12) {
    return {
      shouldTransition: false,
      direction,
      projectedDeltaX: deltaX,
      springVelocity: velocityX,
    };
  }

  const projectedDeltaX = deltaX + velocityX * VELOCITY_PROJECTION_SEC;

  // User actively flicked back toward origin to cancel mid-swipe
  const isReversingTowardOrigin =
    velocityX !== 0 &&
    Math.sign(velocityX) === -Math.sign(deltaX) &&
    Math.abs(velocityX) >= 340 &&
    Math.abs(projectedDeltaX) < thresholdPx * 0.75;

  if (isReversingTowardOrigin) {
    return {
      shouldTransition: false,
      direction,
      projectedDeltaX,
      springVelocity: velocityX,
    };
  }

  // Distance threshold met directly
  const metDistanceThreshold = Math.abs(deltaX) >= thresholdPx;

  // Momentum flick criterion: fast flick in same direction as drag covering >= 35% of threshold
  const minFlickTravel = Math.max(16, thresholdPx * 0.35);
  const sameDirection = velocityX === 0 || Math.sign(velocityX) === Math.sign(deltaX);
  const metVelocityFlick =
    sameDirection &&
    Math.abs(deltaX) >= minFlickTravel &&
    Math.abs(velocityX) >= MIN_FLICK_VELOCITY_PX_S &&
    Math.abs(projectedDeltaX) >= thresholdPx;

  return {
    shouldTransition: metDistanceThreshold || metVelocityFlick,
    direction,
    projectedDeltaX,
    springVelocity: velocityX,
  };
}
