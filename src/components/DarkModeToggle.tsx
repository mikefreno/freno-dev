import { createSignal, onMount, Show } from "solid-js";
import MoonIcon from "./icons/MoonIcon";
import SunIcon from "./icons/SunIcon";
import { Typewriter } from "./Typewriter";

export function DarkModeToggle() {
  const [isDark, setIsDark] = createSignal(false);

  onMount(() => {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    if (prefersDark) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      setIsDark(false);
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  });

  const toggleDarkMode = () => {
    const newDarkMode = !isDark();
    setIsDark(newDarkMode);

    if (newDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <button
      onClick={toggleDarkMode}
      class="hover:bg-surface0 flex w-full items-center gap-3 rounded-lg p-3 transition-all duration-200 ease-in-out hover:scale-105"
      aria-label="Toggle dark mode"
    >
      <Show
        when={isDark()}
        fallback={<SunIcon size={24} fill="var(--color-text)" />}
      >
        <MoonIcon size={24} fill="var(--color-text)" />
      </Show>
      <span class="text-lg font-semibold">
        <Show
          when={isDark()}
          fallback={<Typewriter keepAlive={false}>Light Mode</Typewriter>}
        >
          <Typewriter keepAlive={false}>Dark Mode</Typewriter>
        </Show>
      </span>
    </button>
  );
}
