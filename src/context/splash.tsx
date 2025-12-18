import { Accessor, createContext, useContext } from "solid-js";
import { createSignal } from "solid-js";

// Create context with initial value
const SplashContext = createContext<{
  showSplash: Accessor<boolean>;
  setShowSplash: (show: boolean) => void;
}>({
  showSplash: () => true,
  setShowSplash: () => {}
});

export function useSplash() {
  const context = useContext(SplashContext);
  return context;
}

export function SplashProvider(props: { children: any }) {
  const [showSplash, setShowSplash] = createSignal(true);

  return (
    <SplashContext.Provider value={{ showSplash, setShowSplash }}>
      {props.children}
    </SplashContext.Provider>
  );
}
