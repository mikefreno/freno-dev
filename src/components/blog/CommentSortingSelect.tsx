import { For, Show, createSignal } from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import type { CommentSortingSelectProps, SortingMode } from "~/types/comment";
import Check from "~/components/icons/Check";
import UpDownArrows from "~/components/icons/UpDownArrows";

const SORTING_OPTIONS: { val: SortingMode; label: string }[] = [
  { val: "newest", label: "Newest" },
  { val: "oldest", label: "Oldest" },
  { val: "highest_rated", label: "Highest Rated" },
  { val: "hot", label: "Hot" }
];

export default function CommentSortingSelect(props: CommentSortingSelectProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  const navigate = useNavigate();
  const location = useLocation();

  const selectedLabel = () => {
    const option = SORTING_OPTIONS.find(
      (opt) => opt.val === props.selectedSorting.val
    );
    return option?.label || "Newest";
  };

  const handleSelect = (mode: SortingMode) => {
    props.setSorting(mode);
    setIsOpen(false);

    // Update URL with sortBy parameter
    const url = new URL(window.location.href);
    url.searchParams.set("sortBy", mode);
    navigate(`${location.pathname}?${url.searchParams.toString()}#comments`, {
      scroll: false,
      replace: true
    });
  };

  return (
    <div class="mt-2 flex justify-center">
      <div class="w-72">
        <div class="relative z-40 mt-1">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen())}
            class="focus-visible:border-peach focus-visible:ring-offset-peach bg-surface0 focus-visible:ring-opacity-75 relative w-full cursor-default rounded-lg py-2 pr-10 pl-3 text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:text-sm"
          >
            <span class="block truncate">{selectedLabel()}</span>
            <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <UpDownArrows
                strokeWidth={1.5}
                height={24}
                width={24}
                class="fill-text"
              />
            </span>
          </button>

          <Show when={isOpen()}>
            <div class="ring-opacity-5 bg-surface0 ring-overlay0 absolute mt-1 max-h-60 w-full overflow-auto rounded-md py-1 text-base shadow-lg ring-1 focus:outline-none sm:text-sm">
              <For each={SORTING_OPTIONS}>
                {(sort) => (
                  <button
                    type="button"
                    onClick={() => handleSelect(sort.val)}
                    class={`relative w-full cursor-default py-2 pr-4 pl-10 text-left select-none ${
                      props.selectedSorting.val === sort.val
                        ? "bg-peach text-base brightness-75"
                        : "text-text hover:brightness-125"
                    }`}
                  >
                    <span
                      class={`block truncate ${
                        props.selectedSorting.val === sort.val
                          ? "font-medium"
                          : "font-normal"
                      }`}
                    >
                      {sort.label}
                    </span>
                    <Show when={props.selectedSorting.val === sort.val}>
                      <span class="text-peach absolute inset-y-0 left-0 flex items-center pl-3">
                        <Check
                          strokeWidth={1}
                          height={24}
                          width={24}
                          class="stroke-text"
                        />
                      </span>
                    </Show>
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
}
