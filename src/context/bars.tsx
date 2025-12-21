import {
  Accessor,
  createContext,
  useContext,
  createMemo,
  onMount,
  onCleanup
} from "solid-js";
import { createSignal } from "solid-js";

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
  const initialWindowWidth =
    typeof window !== "undefined" ? window.innerWidth : 1024;
  const isMobile = initialWindowWidth < 768;
  const [leftBarVisible, setLeftBarVisible] = createSignal(!isMobile);
  const [rightBarVisible, setRightBarVisible] = createSignal(true);
  const [barsInitialized, setBarsInitialized] = createSignal(false);
  const [windowWidth, setWindowWidth] = createSignal(initialWindowWidth);

  let leftBarSized = false;
  let rightBarSized = false;

  // Track window width reactively for mobile/desktop detection
  onMount(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);

    onCleanup(() => {
      window.removeEventListener("resize", handleResize);
    });
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

  // Initialize immediately on mobile if left bar starts hidden
  onMount(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (isMobile && !leftBarVisible()) {
      // Skip waiting for left bar size on mobile when it starts hidden
      leftBarSized = true;
      checkAndSync();
    }
  });

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

  const checkAndSync = () => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const bothBarsReady = leftBarSized && (isMobile || rightBarSized);

    if (bothBarsReady) {
      const maxWidth = Math.max(_leftBarNaturalSize(), _rightBarNaturalSize());
      setSyncedBarSize(maxWidth);
      setBarsInitialized(true);
    }
  };

  const leftBarSize = createMemo(() => {
    // Return 0 if hidden (natural size is 0), otherwise return synced size when initialized
    const naturalSize = _leftBarNaturalSize();
    if (naturalSize === 0) return 0; // Hidden
    // On mobile (<768px), always return 0 for layout (overlay mode)
    const isMobile = windowWidth() < 768;
    if (isMobile) return 0;
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
