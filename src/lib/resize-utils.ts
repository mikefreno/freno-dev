import { createSignal, onMount, onCleanup, Accessor } from "solid-js";

export const MOBILE_BREAKPOINT = 768;

/**
 * Creates a reactive window width signal that updates on resize
 * @param debounceMs Optional debounce delay in milliseconds
 * @returns Accessor for current window width
 */
export function createWindowWidth(debounceMs?: number): Accessor<number> {
  const initialWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
  const [width, setWidth] = createSignal(initialWidth);

  onMount(() => {
    // Sync to actual client width immediately on mount to avoid hydration mismatch
    setWidth(window.innerWidth);

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const handleResize = () => {
      if (debounceMs) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setWidth(window.innerWidth);
        }, debounceMs);
      } else {
        setWidth(window.innerWidth);
      }
    };

    window.addEventListener("resize", handleResize);

    onCleanup(() => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    });
  });

  return width;
}

/**
 * Checks if the current window width is in mobile viewport
 * @param width Current window width
 * @returns true if mobile viewport
 */
export function isMobile(width: number): boolean {
  return width < MOBILE_BREAKPOINT;
}

/**
 * Creates a derived signal for mobile state
 * @param windowWidth Window width accessor
 * @returns Accessor for mobile state
 */
export function createIsMobile(
  windowWidth: Accessor<number>
): Accessor<boolean> {
  return () => isMobile(windowWidth());
}
