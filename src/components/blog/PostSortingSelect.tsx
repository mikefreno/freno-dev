import { createSignal, createEffect, For, Show } from "solid-js";
import { useNavigate, useLocation, useSearchParams } from "@solidjs/router";
import Check from "~/components/icons/Check";
import UpDownArrows from "~/components/icons/UpDownArrows";

const sorting = [
  { val: "Newest" },
  { val: "Oldest" },
  { val: "Most Liked" },
  { val: "Most Read" },
  { val: "Most Comments" },
];

export interface PostSortingSelectProps {
  type: "blog" | "project";
}

export default function PostSortingSelect(props: PostSortingSelectProps) {
  const [selected, setSelected] = createSignal(sorting[0]);
  const [isOpen, setIsOpen] = createSignal(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const currentFilters = () => searchParams.filter || null;

  createEffect(() => {
    let newRoute = location.pathname + "?sort=" + selected().val.toLowerCase();
    if (currentFilters()) {
      newRoute += "&filter=" + currentFilters();
    }
    navigate(newRoute);
  });

  const handleSelect = (sort: { val: string }) => {
    setSelected(sort);
    setIsOpen(false);
  };

  return (
    <div class="relative z-10 mt-1 w-72">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen())}
        class={`${
          props.type === "project"
            ? "focus-visible:border-blue-600 focus-visible:ring-offset-blue-300"
            : "focus-visible:border-orange-600 focus-visible:ring-offset-orange-300"
        } relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 dark:bg-zinc-900 sm:text-sm`}
      >
        <span class="block truncate">{selected().val}</span>
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
        <div class="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-900 sm:text-sm">
          <For each={sorting}>
            {(sort) => (
              <button
                type="button"
                onClick={() => handleSelect(sort)}
                class={`relative w-full cursor-default select-none py-2 pl-10 pr-4 text-left ${
                  selected().val === sort.val
                    ? props.type === "project"
                      ? "bg-blue-100 text-blue-900"
                      : "bg-orange-100 text-orange-900"
                    : "text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <span
                  class={`block truncate ${
                    selected().val === sort.val ? "font-medium" : "font-normal"
                  }`}
                >
                  {sort.val}
                </span>
                <Show when={selected().val === sort.val}>
                  <span
                    class={`${
                      props.type === "project"
                        ? "text-blue-600"
                        : "text-orange-600"
                    } absolute inset-y-0 left-0 flex items-center pl-3`}
                  >
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
  );
}
