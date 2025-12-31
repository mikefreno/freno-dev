import {
  createContext,
  useContext,
  createEffect,
  onMount,
  onCleanup,
  Accessor,
  ParentComponent
} from "solid-js";
import { createSignal } from "solid-js";

interface DarkModeContextType {
  isDark: Accessor<boolean>;
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;
}

const DarkModeContext = createContext<DarkModeContextType>({
  isDark: () => false,
  toggleDarkMode: () => {},
  setDarkMode: () => {}
});

export function useDarkMode() {
  const context = useContext(DarkModeContext);
  return context;
}

const STORAGE_KEY = "theme-override";

const getSystemPreference = () => {
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false;
};

const getInitialTheme = () => {
  if (typeof window === "undefined") return false;

  const storedOverride = localStorage.getItem(STORAGE_KEY);
  if (storedOverride !== null) {
    return storedOverride === "dark";
  }
  return getSystemPreference();
};

export const DarkModeProvider: ParentComponent = (props) => {
  // Initialize with correct theme synchronously
  const [isDark, setIsDark] = createSignal(getInitialTheme());

  // Force update immediately on client to fix hydration mismatch
  onMount(() => {
    const actualTheme = getInitialTheme();
    if (isDark() !== actualTheme) {
      setIsDark(actualTheme);
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    // Listen for system theme changes
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if there's no explicit override
      const storedOverride = localStorage.getItem(STORAGE_KEY);
      if (storedOverride === null) {
        setIsDark(e.matches);
      }
    };

    mediaQuery.addEventListener("change", handleChange);

    onCleanup(() => {
      mediaQuery.removeEventListener("change", handleChange);
    });
  });

  // Reactively update DOM when isDark changes
  createEffect(() => {
    if (isDark()) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  });

  const toggleDarkMode = () => {
    const newValue = !isDark();
    setIsDark(newValue);

    // Only persist if different from system preference
    const systemPreference = getSystemPreference();
    if (newValue !== systemPreference) {
      localStorage.setItem(STORAGE_KEY, newValue ? "dark" : "light");
    } else {
      // If matching system preference, remove override
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const setDarkMode = (dark: boolean) => {
    setIsDark(dark);

    // Only persist if different from system preference
    const systemPreference = getSystemPreference();
    if (dark !== systemPreference) {
      localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
    } else {
      // If matching system preference, remove override
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <DarkModeContext.Provider
      value={{
        isDark,
        toggleDarkMode,
        setDarkMode
      }}
    >
      {props.children}
    </DarkModeContext.Provider>
  );
};
