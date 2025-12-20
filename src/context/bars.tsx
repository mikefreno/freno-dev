import { Accessor, createContext, useContext, createMemo } from "solid-js";
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
  leftBarVisible: () => true,
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
  const [leftBarVisible, _setLeftBarVisible] = createSignal(true);
  const [rightBarVisible, _setRightBarVisible] = createSignal(true);
  const [barsInitialized, setBarsInitialized] = createSignal(false);

  let leftBarSized = false;
  let rightBarSized = false;

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
    return barsInitialized() ? syncedBarSize() : naturalSize;
  });

  const rightBarSize = createMemo(() => {
    // Return 0 if hidden (natural size is 0), otherwise return synced size when initialized
    const naturalSize = _rightBarNaturalSize();
    if (naturalSize === 0) return 0; // Hidden
    return barsInitialized() ? syncedBarSize() : naturalSize;
  });

  const setLeftBarVisible = (visible: boolean) => {
    _setLeftBarVisible(visible);
  };

  const setRightBarVisible = (visible: boolean) => {
    _setRightBarVisible(visible);
  };
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
