import {
  createSignal,
  createEffect,
  createMemo,
  For,
  Show,
  onCleanup
} from "solid-js";
import { useNavigate, useLocation, useSearchParams } from "@solidjs/router";

export interface TagSelectorProps {
  tagMap: Record<string, number>;
}

export default function TagSelector(props: TagSelectorProps) {
  const [showingMenu, setShowingMenu] = createSignal(false);
  const [showingRareTags, setShowingRareTags] = createSignal(false);
  const [filterMode, setFilterMode] = createSignal<"whitelist" | "blacklist">(
    "blacklist"
  );
  let buttonRef: HTMLButtonElement | undefined;
  let menuRef: HTMLDivElement | undefined;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const currentSort = () => searchParams.sort || "";
  const currentFilters = () =>
    searchParams.filter?.split("|").filter(Boolean) || [];
  const currentInclude = () =>
    searchParams.include?.split("|").filter(Boolean) || [];

  // Sync filter mode with URL params
  createEffect(() => {
    if (searchParams.include) {
      setFilterMode("whitelist");
    } else if (searchParams.filter) {
      setFilterMode("blacklist");
    }
  });

  const frequentTags = createMemo(() =>
    Object.entries(props.tagMap).filter(([_, count]) => count > 1)
  );

  const rareTags = createMemo(() =>
    Object.entries(props.tagMap).filter(([_, count]) => count <= 1)
  );

  const allTagKeys = createMemo(() =>
    Object.keys(props.tagMap).map((key) => key.slice(1))
  );

  // In blacklist mode: checked = not filtered out
  // In whitelist mode: checked = included in whitelist
  const isTagChecked = (tag: string) => {
    if (filterMode() === "whitelist") {
      return currentInclude().includes(tag);
    } else {
      return !currentFilters().includes(tag);
    }
  };

  const allChecked = createMemo(() => {
    if (filterMode() === "whitelist") {
      return currentInclude().length === allTagKeys().length;
    } else {
      return allTagKeys().every((tag) => !currentFilters().includes(tag));
    }
  });

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

  const handleCheck = (tag: string, isChecked: boolean) => {
    if (filterMode() === "whitelist") {
      // Whitelist mode: manage include param
      let newInclude: string[];
      if (isChecked) {
        // Add to whitelist
        newInclude = [...currentInclude(), tag];
      } else {
        // Remove from whitelist
        newInclude = currentInclude().filter((t) => t !== tag);
      }

      if (newInclude.length > 0) {
        const includeStr = newInclude.map((t) => `#${t}`).join("|");
        navigate(
          `${location.pathname}?sort=${currentSort()}&include=${includeStr}`
        );
      } else {
        // If no tags selected, clear whitelist
        navigate(`${location.pathname}?sort=${currentSort()}`);
      }
    } else {
      // Blacklist mode: manage filter param
      if (isChecked) {
        const newFilters = searchParams.filter?.replace(tag + "|", "");
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
          const newFilters = currentFiltersStr + tag + "|";
          navigate(
            `${location.pathname}?sort=${currentSort()}&filter=${newFilters}`
          );
        } else {
          navigate(`${location.pathname}?sort=${currentSort()}&filter=${tag}|`);
        }
      }
    }
  };

  const handleToggleAll = () => {
    if (filterMode() === "whitelist") {
      if (allChecked()) {
        // Uncheck all: clear whitelist
        navigate(`${location.pathname}?sort=${currentSort()}`);
      } else {
        // Check all: add all tags to whitelist
        const allTags = allTagKeys()
          .map((t) => `#${t}`)
          .join("|");
        navigate(
          `${location.pathname}?sort=${currentSort()}&include=${allTags}`
        );
      }
    } else {
      if (allChecked()) {
        // Uncheck all: Build filter string with all tags
        const allTags = allTagKeys().join("|") + "|";
        navigate(
          `${location.pathname}?sort=${currentSort()}&filter=${allTags}`
        );
      } else {
        // Check all: Remove filter param
        navigate(`${location.pathname}?sort=${currentSort()}`);
      }
    }
  };

  const toggleFilterMode = () => {
    const newMode = filterMode() === "whitelist" ? "blacklist" : "whitelist";
    setFilterMode(newMode);
    // Clear all filters when switching modes
    navigate(`${location.pathname}?sort=${currentSort()}`);
  };

  return (
    <div class="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        class="border-blue bg-lavender mt-2 rounded border px-4 py-2 text-base font-light shadow-md transition-all duration-300 ease-in-out hover:brightness-125 active:scale-90 md:mt-0"
      >
        Filters
      </button>
      <Show when={showingMenu()}>
        <div
          ref={menuRef}
          class="bg-surface0 absolute top-full left-0 z-50 mt-2 min-w-64 rounded-lg py-2 pr-4 pl-2 shadow-lg"
        >
          {/* Filter Mode Toggle */}
          <div class="border-overlay0 mb-2 border-b pb-2">
            <div class="mb-2 flex items-center justify-between">
              <span class="text-subtext0 text-xs font-medium">
                Filter Mode:
              </span>
              <button
                type="button"
                onClick={toggleFilterMode}
                class={`rounded px-2 py-1 text-xs font-semibold transition-all duration-200 hover:brightness-110 ${
                  filterMode() === "whitelist"
                    ? "bg-green text-base"
                    : "bg-red text-base"
                }`}
              >
                {filterMode() === "whitelist" ? "✓ Whitelist" : "✗ Blacklist"}
              </button>
            </div>
            <div class="text-subtext1 text-xs italic">
              {filterMode() === "whitelist"
                ? "Check tags to show ONLY those posts"
                : "Uncheck tags to HIDE those posts"}
            </div>
          </div>

          {/* Toggle All Button */}
          <div class="border-overlay0 mb-2 flex justify-center border-b pb-2">
            <button
              type="button"
              onClick={handleToggleAll}
              class="text-text hover:text-blue text-xs font-medium underline"
            >
              {allChecked() ? "Uncheck All" : "Check All"}
            </button>
          </div>

          {/* Frequent Tags */}
          <For each={frequentTags()}>
            {([key, value]) => (
              <div class="mx-auto my-2 flex">
                <input
                  type="checkbox"
                  checked={isTagChecked(key.slice(1))}
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

          {/* Rare Tags Section */}
          <Show when={rareTags().length > 0}>
            <div class="border-overlay0 mt-2 border-t pt-2">
              <button
                type="button"
                onClick={() => setShowingRareTags(!showingRareTags())}
                class="text-subtext0 hover:text-text mb-1 w-full text-left text-xs font-medium"
              >
                {showingRareTags() ? "▼" : "▶"} Rare tags ({rareTags().length})
              </button>
              <Show when={showingRareTags()}>
                <For each={rareTags()}>
                  {([key, value]) => (
                    <div class="mx-auto my-2 flex">
                      <input
                        type="checkbox"
                        checked={isTagChecked(key.slice(1))}
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
              </Show>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
