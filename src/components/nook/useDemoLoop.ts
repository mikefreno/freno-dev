import { onCleanup, onMount } from "solid-js";

/**
 * Drives a looping landing-page demo: each `[atMs, step]` pair fires at its
 * offset, and the whole schedule restarts every `periodMs`. Timers are torn
 * down with the owning component.
 */
export function useDemoLoop(
  periodMs: number,
  steps: [atMs: number, step: () => void][]
): void {
  onMount(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      timers.length = 0;
      for (const [at, step] of steps) {
        if (at === 0) step();
        else timers.push(setTimeout(step, at));
      }
    };
    run();
    const interval = setInterval(run, periodMs);
    onCleanup(() => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
    });
  });
}
