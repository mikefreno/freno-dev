import { Accessor, createContext, useContext } from "solid-js";
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
  toggleLeftBar: () => void;
  toggleRightBar: () => void;
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
  toggleRightBar: () => {}
});

export function useBars() {
  const context = useContext(BarsContext);
  return context;
}

export function BarsProvider(props: { children: any }) {
  const [leftBarSize, setLeftBarSize] = createSignal(0);
  const [rightBarSize, setRightBarSize] = createSignal(0);
  const [centerWidth, setCenterWidth] = createSignal(0);
  const [leftBarVisible, setLeftBarVisible] = createSignal(true);
  const [rightBarVisible, setRightBarVisible] = createSignal(true);

  const toggleLeftBar = () => setLeftBarVisible(!leftBarVisible());
  const toggleRightBar = () => setRightBarVisible(!rightBarVisible());

  return (
    <BarsContext.Provider
      value={{
        leftBarSize,
        setLeftBarSize,
        rightBarSize,
        setRightBarSize,
        centerWidth,
        setCenterWidth,
        leftBarVisible,
        setLeftBarVisible,
        rightBarVisible,
        setRightBarVisible,
        toggleLeftBar,
        toggleRightBar
      }}
    >
      {props.children}
    </BarsContext.Provider>
  );
}
