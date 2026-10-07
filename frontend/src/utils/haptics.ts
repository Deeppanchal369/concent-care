/**
 * Subtle tactile haptic vibration utility for supported mobile devices.
 * Gracefully degrades to a no-op on desktop or unsupported devices.
 */
export function triggerHaptic(durationMs: number = 10): void {
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(durationMs);
    } catch {
      // Ignore vibration errors on restricted platforms
    }
  }
}

