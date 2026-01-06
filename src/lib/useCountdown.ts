import { createSignal, onCleanup } from "solid-js";

export interface UseCountdownOptions {
  /**
   * Initial remaining time in seconds
   */
  initialTime?: number;
  /**
   * Cookie name to read expiration time from
   */
  cookieName?: string;
  /**
   * Callback when countdown reaches zero
   */
  onComplete?: () => void;
}

/**
 * Hook for managing countdown timers from expiration timestamps
 * @param options Configuration options
 * @returns [remainingTime, startCountdown]
 */
export function useCountdown(options: UseCountdownOptions = {}) {
  const [remainingTime, setRemainingTime] = createSignal(
    options.initialTime ?? 0
  );
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const calculateRemaining = (expiresAt: string | Date) => {
    const expires =
      typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
    const remaining = expires.getTime() - Date.now();
    const remainingInSeconds = remaining / 1000;

    if (remainingInSeconds <= 0) {
      setRemainingTime(0);
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      options.onComplete?.();
    } else {
      setRemainingTime(remainingInSeconds);
    }
  };

  const startCountdown = (expiresAt: string | Date) => {
    // Clear any existing interval
    if (intervalId !== null) {
      clearInterval(intervalId);
    }

    // Calculate immediately
    calculateRemaining(expiresAt);

    // Then update every second
    intervalId = setInterval(() => calculateRemaining(expiresAt), 1000);
  };

  const stopCountdown = () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  // Cleanup on unmount
  onCleanup(() => {
    stopCountdown();
  });

  return {
    remainingTime,
    startCountdown,
    stopCountdown,
    setRemainingTime
  };
}
