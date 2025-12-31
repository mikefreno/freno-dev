import { Show, createSignal, onMount } from "solid-js";
import MoonIcon from "./icons/MoonIcon";
import SunIcon from "./icons/SunIcon";
import { Typewriter } from "./Typewriter";
import { useDarkMode } from "~/context/darkMode";

export function DarkModeToggle() {
  const { isDark, toggleDarkMode } = useDarkMode();
  const [mounted, setMounted] = createSignal(false);

  onMount(() => {
    setMounted(true);
  });

  return (
    <button
      onClick={toggleDarkMode}
      class="hover:bg-surface0 flex w-full items-center gap-3 rounded-lg p-3 transition-all duration-200 ease-in-out hover:scale-105"
      aria-label="Toggle dark mode"
    >
      <Show
        when={mounted()}
        fallback={<div style={{ width: "24px", height: "24px" }} />}
      >
        <Show
          when={isDark()}
          fallback={<SunIcon size={24} fill="var(--color-text)" />}
        >
          <MoonIcon size={24} fill="var(--color-text)" />
        </Show>
      </Show>
      <span class="text-lg font-semibold">
        <Show
          when={mounted()}
          fallback={<span style={{ visibility: "hidden" }}>Dark Mode</span>}
        >
          <Show
            when={isDark()}
            fallback={<Typewriter keepAlive={false}>Light Mode</Typewriter>}
          >
            <Typewriter keepAlive={false}>Dark Mode</Typewriter>
          </Show>
        </Show>
      </span>
    </button>
  );
}
