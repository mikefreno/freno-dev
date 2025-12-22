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

export const DarkModeProvider: ParentComponent = (props) => {
  const [isDark, setIsDark] = createSignal(false);

  onMount(() => {
    // Check system preference
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mediaQuery.matches);

    // Listen for system theme changes
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
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
    setIsDark(!isDark());
  };

  const setDarkMode = (dark: boolean) => {
    setIsDark(dark);
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
