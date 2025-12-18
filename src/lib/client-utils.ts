/**
 * Client-side utility functions
 * Note: These utilities should only run in the browser
 */

/**
 * Triggers haptic feedback on mobile devices
 * @param duration - Duration in milliseconds (default 50ms for a light tap)
 */
export function hapticFeedback(duration: number = 50) {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(duration);
  }
}
