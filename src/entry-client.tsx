// @refresh reload
import { mount, StartClient } from "@solidjs/start/client";

// Handle chunk loading failures from stale cache
window.addEventListener("error", (event) => {
  if (
    event.message?.includes("Importing a module script failed") ||
    event.message?.includes("Failed to fetch dynamically imported module")
  ) {
    console.warn("Chunk load error detected, reloading page...");
    window.location.reload();
  }
});

window.addEventListener("unhandledrejection", (event) => {
  if (
    event.reason?.message?.includes("Importing a module script failed") ||
    event.reason?.message?.includes(
      "Failed to fetch dynamically imported module"
    )
  ) {
    console.warn("Chunk load error detected, reloading page...");
    event.preventDefault();
    window.location.reload();
  }
});

mount(() => <StartClient />, document.getElementById("app")!);
