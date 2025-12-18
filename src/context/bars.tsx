import { Accessor, createContext, useContext } from "solid-js";
import { createSignal } from "solid-js";
import { hapticFeedback } from "~/lib/client-utils";

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
  toggleLeftBar: () => void;
  toggleRightBar: () => void;
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
  toggleLeftBar: () => {},
  toggleRightBar: () => {},
  barsInitialized: () => false
});

export function useBars() {
  const context = useContext(BarsContext);
  return context;
}

export function BarsProvider(props: { children: any }) {
  const [leftBarSize, setLeftBarSize] = createSignal(0);
  const [rightBarSize, setRightBarSize] = createSignal(0);
  const [centerWidth, setCenterWidth] = createSignal(0);
  const [leftBarVisible, _setLeftBarVisible] = createSignal(true);
  const [rightBarVisible, _setRightBarVisible] = createSignal(true);
  const [barsInitialized, setBarsInitialized] = createSignal(false);

  // Track when both bars have been sized at least once
  let leftBarSized = false;
  let rightBarSized = false;

  const wrappedSetLeftBarSize = (size: number) => {
    setLeftBarSize(size);
    if (!leftBarSized && size > 0) {
      leftBarSized = true;
      if (rightBarSized) {
        setBarsInitialized(true);
      }
    }
  };

  const wrappedSetRightBarSize = (size: number) => {
    setRightBarSize(size);
    if (!rightBarSized && size > 0) {
      rightBarSized = true;
      if (leftBarSized) {
        setBarsInitialized(true);
      }
    }
  };

  // Wrap visibility setters with haptic feedback
  const setLeftBarVisible = (visible: boolean) => {
    hapticFeedback(50);
    _setLeftBarVisible(visible);
  };

  const setRightBarVisible = (visible: boolean) => {
    hapticFeedback(50);
    _setRightBarVisible(visible);
  };

  const toggleLeftBar = () => setLeftBarVisible(!leftBarVisible());
  const toggleRightBar = () => setRightBarVisible(!rightBarVisible());

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
        toggleLeftBar,
        toggleRightBar,
        barsInitialized
      }}
    >
      {props.children}
    </BarsContext.Provider>
  );
}
