import { createSignal, onMount } from "solid-js";

export default function ErrorTest() {
  const [shouldCrash, setShouldCrash] = createSignal(false);

  // Crash on mount if flag is set
  if (shouldCrash()) {
    throw new Error("Test error - Error boundary triggered!");
  }

  return (
    <div class="bg-crust flex min-h-screen items-center justify-center">
      <div class="bg-surface0 max-w-md rounded-lg p-8 text-center shadow-lg">
        <h1 class="text-text mb-4 text-2xl font-bold">Error Boundary Test</h1>
        <p class="text-subtext0 mb-6">
          Click the button below to trigger the error boundary
        </p>
        <button
          onClick={() => setShouldCrash(true)}
          class="bg-red hover:bg-maroon rounded px-6 py-3 text-base font-bold transition"
        >
          💥 Trigger Error Boundary
        </button>
      </div>
    </div>
  );
}
