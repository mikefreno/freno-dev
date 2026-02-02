import { Accessor, createContext, useContext } from "solid-js";
import { createSignal } from "solid-js";

const BarsContext = createContext<{
  leftBarVisible: Accessor<boolean>;
  setLeftBarVisible: (visible: boolean) => void;
  rightBarVisible: Accessor<boolean>;
  setRightBarVisible: (visible: boolean) => void;
}>({
  leftBarVisible: () => true,
  setLeftBarVisible: () => {},
  rightBarVisible: () => true,
  setRightBarVisible: () => {}
});

export function useBars() {
  const context = useContext(BarsContext);
  return context;
}

export function BarsProvider(props: { children: any }) {
  const [leftBarVisible, setLeftBarVisible] = createSignal(true);
  const [rightBarVisible, setRightBarVisible] = createSignal(true);

  return (
    <BarsContext.Provider
      value={{
        leftBarVisible,
        setLeftBarVisible,
        rightBarVisible,
        setRightBarVisible
      }}
    >
      {props.children}
    </BarsContext.Provider>
  );
}
