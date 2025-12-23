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

  const currentFilters = () =>
    searchParams.filter?.split("|").filter(Boolean) || [];
  const currentInclude = () =>
    searchParams.include?.split("|").filter(Boolean) || [];

  // Get currently selected tags based on mode
  const selectedTags = () => {
    if (filterMode() === "whitelist") {
      return currentInclude();
    } else {
      return currentFilters();
    }
  };

  // Sync filter mode with URL params and ensure one is always present
  createEffect(() => {
    if ("include" in searchParams) {
      setFilterMode("whitelist");
    } else if ("filter" in searchParams) {
      setFilterMode("blacklist");
    } else {
      // No filter param exists, default to blacklist mode with empty filter
      const params = new URLSearchParams(
        searchParams as Record<string, string>
      );
      params.set("filter", "");
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
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

  // Check if a tag is currently selected
  const isTagChecked = (tag: string) => {
    return selectedTags().includes(tag);
  };

  const allChecked = createMemo(() => {
    return (
      selectedTags().length === allTagKeys().length && allTagKeys().length > 0
    );
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
    const currentSelected = selectedTags();
    let newSelected: string[];

    if (isChecked) {
      // Add tag to selection
      newSelected = [...currentSelected, tag];
    } else {
      // Remove tag from selection
      newSelected = currentSelected.filter((t) => t !== tag);
    }

    // Build URL preserving all existing params
    const params = new URLSearchParams(searchParams as Record<string, string>);
    const paramName = filterMode() === "whitelist" ? "include" : "filter";
    const otherParamName = filterMode() === "whitelist" ? "filter" : "include";

    // Remove the other mode's param
    params.delete(otherParamName);

    if (newSelected.length > 0) {
      const paramValue = newSelected.join("|");
      params.set(paramName, paramValue);
    } else {
      // Keep empty param to preserve mode (especially important for whitelist)
      params.set(paramName, "");
    }

    navigate(`${location.pathname}?${params.toString()}`);
  };

  const handleToggleAll = () => {
    const params = new URLSearchParams(searchParams as Record<string, string>);
    const paramName = filterMode() === "whitelist" ? "include" : "filter";
    const otherParamName = filterMode() === "whitelist" ? "filter" : "include";

    // Remove the other mode's param
    params.delete(otherParamName);

    if (allChecked()) {
      // Uncheck all: keep empty param to preserve mode
      params.set(paramName, "");
    } else {
      // Check all: select all tags
      const allTags = allTagKeys().join("|");
      params.set(paramName, allTags);
    }

    navigate(`${location.pathname}?${params.toString()}`);
  };

  const toggleFilterMode = () => {
    // Get current tags BEFORE changing mode
    const currentSelected = selectedTags();

    const newMode = filterMode() === "whitelist" ? "blacklist" : "whitelist";
    setFilterMode(newMode);

    // Keep the same selected tags, just change the param name
    const params = new URLSearchParams(searchParams as Record<string, string>);
    const newParamName = newMode === "whitelist" ? "include" : "filter";
    const oldParamName = newMode === "whitelist" ? "filter" : "include";

    // Remove old param and set new one
    params.delete(oldParamName);

    if (currentSelected.length > 0) {
      const paramValue = currentSelected.join("|");
      params.set(newParamName, paramValue);
    } else {
      // Always keep the param, even if empty
      params.set(newParamName, "");
    }

    navigate(`${location.pathname}?${params.toString()}`);
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
                ? "Check tags to show ONLY posts with those tags"
                : "Check tags to HIDE posts with those tags"}
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
