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
    <div class="relative mb-4 overflow-visible">
      {/* Button Header */}
      <div
        class="bg-mantle border-surface0 flex cursor-pointer items-center justify-between rounded-t p-3"
        style={
          isRevealed()
            ? {
                "border-top-style": "var(--tw-border-style)",
                "border-inline-style": "var(--tw-border-style)",
                "border-top-width": "1px",
                "border-inline-width": "1px",
                "border-top-left-radius": "var(--radius-xl)",
                "border-top-right-radius": "var(--radius-xl)"
              }
            : {
                "border-style": "var(--tw-border-style)",
                "border-width": "1px",
                "border-radius": "var(--radius-xl)"
              }
        }
        onClick={toggleReveal}
      >
        <div class="flex items-center space-x-2">
          <span class="h-12 w-12">
            <img src={"/LineageIcon.png"} />
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
        class={`bg-mantle border-surface0 absolute right-0 left-0 z-10 overflow-scroll rounded-b-xl border-x border-b p-4 shadow-lg transition-all duration-300 ease-in-out ${
          isRevealed()
            ? "mx-h-[75dvh] opacity-100 md:max-h-[60vh]"
            : "max-h-0 opacity-0"
        }`}
      >
        {props.children}
      </div>
    </div>
  );
}
