import { Accessor, createContext, useContext } from "solid-js";
import { createSignal } from "solid-js";

const BarsContext = createContext<{
  leftBarSize: Accessor<number>;
  setLeftBarSize: (size: number) => void;
  rightBarSize: Accessor<number>;
  setRightBarSize: (size: number) => void;
  centerWidth: Accessor<number>;
  setCenterWidth: (size: number) => void;
}>({
  leftBarSize: () => 0,
  setLeftBarSize: () => {},
  rightBarSize: () => 0,
  setRightBarSize: () => {},
  centerWidth: () => 0,
  setCenterWidth: () => {}
});

export function useBars() {
  const context = useContext(BarsContext);
  return context;
}

export function BarsProvider(props: { children: any }) {
  const [leftBarSize, setLeftBarSize] = createSignal(0);
  const [rightBarSize, setRightBarSize] = createSignal(0);
  const [centerWidth, setCenterWidth] = createSignal(0);

  return (
    <BarsContext.Provider
      value={{
        leftBarSize,
        setLeftBarSize,
        rightBarSize,
        setRightBarSize,
        centerWidth,
        setCenterWidth
      }}
    >
      {props.children}
    </BarsContext.Provider>
  );
}
