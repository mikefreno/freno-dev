import { createSignal, createEffect, For, Show } from "solid-js";
import { useNavigate, useLocation, useSearchParams } from "@solidjs/router";
import Check from "~/components/icons/Check";
import UpDownArrows from "~/components/icons/UpDownArrows";

const sorting = [
  { val: "Newest" },
  { val: "Oldest" },
  { val: "Most Liked" },
  { val: "Most Read" },
  { val: "Most Comments" }
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
            ? "focus-visible:border-blue focus-visible:ring-offset-blue"
            : "focus-visible:border-peach focus-visible:ring-offset-peach"
        } bg-surface0 focus-visible:ring-opacity-75 relative w-full cursor-default rounded-lg py-2 pr-10 pl-3 text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:text-sm`}
      >
        <span class="block truncate">{selected().val}</span>
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
                    ? props.type === "project"
                      ? "bg-blue text-base brightness-75"
                      : "bg-peach text-base brightness-75"
                    : "text-text hover:brightness-125"
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
                      props.type === "project" ? "text-blue" : "text-peach"
                    } absolute inset-y-0 left-0 flex items-center pl-3`}
                  >
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
