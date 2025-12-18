import { createSignal, createEffect, For, Show, onCleanup } from "solid-js";
import { useNavigate, useLocation, useSearchParams } from "@solidjs/router";

export interface TagSelectorProps {
  tagMap: Record<string, number>;
  category: "blog" | "project";
}

export default function TagSelector(props: TagSelectorProps) {
  const [showingMenu, setShowingMenu] = createSignal(false);
  let buttonRef: HTMLButtonElement | undefined;
  let menuRef: HTMLDivElement | undefined;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const currentSort = () => searchParams.sort || "";
  const currentFilters = () => searchParams.filter?.split("|") || [];

  const handleClickOutside = (e: MouseEvent) => {
    if (
      buttonRef &&
      menuRef &&
      !buttonRef.contains(e.target as Node) &&
      !menuRef.contains(e.target as Node)
    ) {
      setShowingMenu(false);
    }
  };

  createEffect(() => {
    if (showingMenu()) {
      document.addEventListener("click", handleClickOutside);
      onCleanup(() =>
        document.removeEventListener("click", handleClickOutside)
      );
    }
  });

  const toggleMenu = () => {
    setShowingMenu(!showingMenu());
  };

  const handleCheck = (filter: string, isChecked: boolean) => {
    if (isChecked) {
      const newFilters = searchParams.filter?.replace(filter + "|", "");
      if (newFilters && newFilters.length >= 1) {
        navigate(
          `${location.pathname}?sort=${currentSort()}&filter=${newFilters}`
        );
      } else {
        navigate(`${location.pathname}?sort=${currentSort()}`);
      }
    } else {
      const currentFiltersStr = searchParams.filter;
      if (currentFiltersStr) {
        const newFilters = currentFiltersStr + filter + "|";
        navigate(
          `${location.pathname}?sort=${currentSort()}&filter=${newFilters}`
        );
      } else {
        navigate(
          `${location.pathname}?sort=${currentSort()}&filter=${filter}|`
        );
      }
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        class={`${
          props.category === "project"
            ? "border-blue bg-blue hover:brightness-125"
            : "border-peach bg-peach hover:brightness-125"
        } mt-2 rounded border px-4 py-2 text-base font-light shadow-md transition-all duration-300 ease-in-out active:scale-90 md:mt-0`}
      >
        Filters
      </button>
      <Show when={showingMenu()}>
        <div
          ref={menuRef}
          class="bg-surface0 absolute z-50 mt-12 rounded-lg py-2 pr-4 pl-2 shadow-lg"
        >
          <For each={Object.entries(props.tagMap)}>
            {([key, value]) => (
              <div class="mx-auto my-2 flex">
                <input
                  type="checkbox"
                  checked={!currentFilters().includes(key.slice(1))}
                  onChange={(e) =>
                    handleCheck(key.slice(1), e.currentTarget.checked)
                  }
                />
                <div class="-mt-0.5 pl-1 text-sm font-normal">
                  {`${key.slice(1)} (${value}) `}
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </>
  );
}
