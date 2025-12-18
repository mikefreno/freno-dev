import { createSignal, JSX } from "solid-js";

export default function RevealDropDown(props: {
  title: string;
  children: JSX.Element;
}) {
  const [isRevealed, setIsRevealed] = createSignal(false);

  const toggleReveal = () => {
    setIsRevealed(!isRevealed());
  };

  return (
    <div class="border-surface0 relative mb-4 overflow-visible rounded-lg border">
      {/* Button Header */}
      <div
        class="bg-mantle flex cursor-pointer items-center justify-between p-3"
        onClick={toggleReveal}
      >
        <div class="flex items-center space-x-2">
          <span class="text-gray-600 dark:text-gray-300">
            {/* Life and lineage icon */}
          </span>
          <span class="font-medium">{props.title}</span>
        </div>
        <div class="flex items-center space-x-3">
          {/* Reveal Arrow */}
          <svg
            class={`h-5 w-5 transition-transform duration-200 ${
              isRevealed() ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Reveal Content */}
      <div
        class={`absolute right-0 left-0 z-10 overflow-hidden transition-all duration-300 ease-in-out ${
          isRevealed() ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div class="bg-mantle p-4 shadow-lg dark:bg-gray-900">
          {props.children}
        </div>
      </div>
    </div>
  );
}
