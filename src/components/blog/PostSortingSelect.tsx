import { createSignal, createEffect, For, Show } from "solid-js";
import { useNavigate, useLocation, useSearchParams } from "@solidjs/router";
import Check from "~/components/icons/Check";
import UpDownArrows from "~/components/icons/UpDownArrows";

const sorting = [
  { val: "newest", label: "Newest" },
  { val: "oldest", label: "Oldest" },
  { val: "most_liked", label: "Most Liked" },
  { val: "most_read", label: "Most Read" },
  { val: "most_comments", label: "Most Comments" }
];

export interface PostSortingSelectProps {}

export default function PostSortingSelect(props: PostSortingSelectProps) {
  const [selected, setSelected] = createSignal(sorting[0]);
  const [isOpen, setIsOpen] = createSignal(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const currentFilters = () => searchParams.filter || null;
  const currentInclude = () => searchParams.include || null;

  createEffect(() => {
    let newRoute = location.pathname + "?sort=" + selected().val;
    if (currentFilters()) {
      newRoute += "&filter=" + currentFilters();
    }
    if (currentInclude()) {
      newRoute += "&include=" + currentInclude();
    }
    navigate(newRoute);
  });

  const handleSelect = (sort: { val: string; label: string }) => {
    setSelected(sort);
    setIsOpen(false);
  };

  return (
    <div class="relative z-10 mt-1 w-72">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen())}
        class="focus-visible:border-peach focus-visible:ring-offset-peach bg-surface0 focus-visible:ring-opacity-75 relative w-full cursor-default rounded-lg py-2 pr-10 pl-3 text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:text-sm"
      >
        <span class="block truncate">{selected().label}</span>
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
          <For each={sorting}>
            {(sort) => (
              <button
                type="button"
                onClick={() => handleSelect(sort)}
                class={`relative w-full cursor-default py-2 pr-4 pl-10 text-left select-none ${
                  selected().val === sort.val
                    ? "bg-peach text-base brightness-75"
                    : "text-text hover:brightness-125"
                }`}
              >
                <span
                  class={`block truncate ${
                    selected().val === sort.val ? "font-medium" : "font-normal"
                  }`}
                >
                  {sort.label}
                </span>
                <Show when={selected().val === sort.val}>
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
  );
}
