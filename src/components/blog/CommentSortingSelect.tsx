import { For, Show, createSignal } from "solid-js";
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

  const selectedLabel = () => {
    const option = SORTING_OPTIONS.find(
      (opt) => opt.val === props.selectedSorting.val
    );
    return option?.label || "Newest";
  };

  const handleSelect = (mode: SortingMode) => {
    props.setSorting(mode);
    setIsOpen(false);
  };

  return (
    <div class="mt-2 flex justify-center">
      <div class="w-72">
        <div class="relative z-40 mt-1">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen())}
            class="focus-visible:ring-opacity-75 relative w-full cursor-default rounded-lg bg-white py-2 pr-10 pl-3 text-left shadow-md focus:outline-none focus-visible:border-orange-600 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm dark:bg-zinc-900"
          >
            <span class="block truncate">{selectedLabel()}</span>
            <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <UpDownArrows
                strokeWidth={1.5}
                height={24}
                width={24}
                class="fill-zinc-900 dark:fill-white"
              />
            </span>
          </button>

          <Show when={isOpen()}>
            <div class="ring-opacity-5 absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black transition duration-100 ease-in focus:outline-none sm:text-sm dark:bg-zinc-900">
              <For each={SORTING_OPTIONS}>
                {(sort) => (
                  <button
                    type="button"
                    onClick={() => handleSelect(sort.val)}
                    class={`relative w-full cursor-default py-2 pr-4 pl-10 text-left select-none ${
                      props.selectedSorting.val === sort.val
                        ? "bg-orange-100 text-orange-900"
                        : "text-zinc-900 hover:bg-orange-50 dark:text-white dark:hover:bg-zinc-800"
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
                      <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-orange-600">
                        <Check
                          strokeWidth={1}
                          height={24}
                          width={24}
                          class="stroke-zinc-900 dark:stroke-white"
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
