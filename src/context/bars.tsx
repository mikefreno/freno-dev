import {
  Accessor,
  createContext,
  useContext,
  createMemo,
  onMount
} from "solid-js";
import { createSignal } from "solid-js";
import { isMobile, MOBILE_BREAKPOINT } from "~/lib/resize-utils";

const BarsContext = createContext<{
  leftBarSize: Accessor<number>;
  setLeftBarSize: (size: number) => void;
  rightBarSize: Accessor<number>;
  setRightBarSize: (size: number) => void;
  centerWidth: Accessor<number>;
  setCenterWidth: (size: number) => void;
  leftBarVisible: Accessor<boolean>;
  setLeftBarVisible: (visible: boolean) => void;
  rightBarVisible: Accessor<boolean>;
  setRightBarVisible: (visible: boolean) => void;
  barsInitialized: Accessor<boolean>;
}>({
  leftBarSize: () => 0,
  setLeftBarSize: () => {},
  rightBarSize: () => 0,
  setRightBarSize: () => {},
  centerWidth: () => 0,
  setCenterWidth: () => {},
  leftBarVisible: () =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true,
  setLeftBarVisible: () => {},
  rightBarVisible: () => true,
  setRightBarVisible: () => {},
  barsInitialized: () => false
});

export function useBars() {
  const context = useContext(BarsContext);
  return context;
}

export function BarsProvider(props: { children: any }) {
  const [_leftBarNaturalSize, _setLeftBarNaturalSize] = createSignal(0);
  const [_rightBarNaturalSize, _setRightBarNaturalSize] = createSignal(0);
  const [syncedBarSize, setSyncedBarSize] = createSignal(0);
  const [centerWidth, setCenterWidth] = createSignal(0);
  const [windowWidth, setWindowWidth] = createSignal(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  const [leftBarVisible, setLeftBarVisible] = createSignal(true);
  const [rightBarVisible, setRightBarVisible] = createSignal(true);
  const [barsInitialized, setBarsInitialized] = createSignal(false);

  let leftBarSized = false;
  let rightBarSized = false;

  // Setup window width tracking and initial mobile detection on client only
  onMount(() => {
    // Immediately sync to actual window width
    setWindowWidth(window.innerWidth);
    const initialIsMobile = isMobile(window.innerWidth);
    setLeftBarVisible(!initialIsMobile);

    // Initialize immediately on mobile if left bar starts hidden
    if (initialIsMobile && !leftBarVisible()) {
      leftBarSized = true;
      checkAndSync();
    }

    // Setup resize listener
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  });

  const wrappedSetLeftBarSize = (size: number) => {
    if (!barsInitialized()) {
      // Before initialization, capture natural size
      _setLeftBarNaturalSize(size);
      if (!leftBarSized && size > 0) {
        leftBarSized = true;
        checkAndSync();
      }
    } else {
      // After initialization, just update the natural size for visibility handling
      _setLeftBarNaturalSize(size);
    }
  };

  const checkAndSync = () => {
    const currentIsMobile = isMobile(windowWidth());
    const bothBarsReady = leftBarSized && (currentIsMobile || rightBarSized);

    if (bothBarsReady) {
      const maxWidth = Math.max(_leftBarNaturalSize(), _rightBarNaturalSize());
      setSyncedBarSize(maxWidth);
      setBarsInitialized(true);
    }
  };

  const wrappedSetRightBarSize = (size: number) => {
    if (!barsInitialized()) {
      // Before initialization, capture natural size
      _setRightBarNaturalSize(size);
      if (!rightBarSized && size > 0) {
        rightBarSized = true;
        checkAndSync();
      }
    } else {
      // After initialization, just update the natural size for visibility handling
      _setRightBarNaturalSize(size);
    }
  };

  const leftBarSize = createMemo(() => {
    // Return 0 if hidden (natural size is 0), otherwise return synced size when initialized
    const naturalSize = _leftBarNaturalSize();
    if (naturalSize === 0) return 0; // Hidden
    // On mobile (<768px), always return 0 for layout (overlay mode)
    const currentIsMobile = isMobile(windowWidth());
    if (currentIsMobile) return 0;
    return barsInitialized() ? syncedBarSize() : naturalSize;
  });

  const rightBarSize = createMemo(() => {
    // Return 0 if hidden (natural size is 0), otherwise return synced size when initialized
    const naturalSize = _rightBarNaturalSize();
    if (naturalSize === 0) return 0; // Hidden
    return barsInitialized() ? syncedBarSize() : naturalSize;
  });

  return (
    <BarsContext.Provider
      value={{
        leftBarSize,
        setLeftBarSize: wrappedSetLeftBarSize,
        rightBarSize,
        setRightBarSize: wrappedSetRightBarSize,
        centerWidth,
        setCenterWidth,
        leftBarVisible,
        setLeftBarVisible,
        rightBarVisible,
        setRightBarVisible,
        barsInitialized
      }}
    >
      {props.children}
    </BarsContext.Provider>
  );
}
