import { Typewriter } from "./Typewriter";
import { useBars } from "~/context/bars";
import { onMount, createEffect } from "solid-js";

export function LeftBar() {
  const { setLeftBarSize, leftBarVisible } = useBars();
  let ref: HTMLDivElement | undefined;
  let actualWidth = 0;

  onMount(() => {
    if (ref) {
      const updateSize = () => {
        actualWidth = ref?.offsetWidth || 0;
        setLeftBarSize(leftBarVisible() ? actualWidth : 0);
      };

      updateSize();

      const resizeObserver = new ResizeObserver((entries) => {
        // Use requestAnimationFrame to avoid ResizeObserver loop error
        requestAnimationFrame(() => {
          actualWidth = ref?.offsetWidth || 0;
          setLeftBarSize(leftBarVisible() ? actualWidth : 0);
        });
      });
      resizeObserver.observe(ref);

      return () => resizeObserver.disconnect();
    }
  });

  // Update size when visibility changes
  createEffect(() => {
    setLeftBarSize(leftBarVisible() ? actualWidth : 0);
  });

  return (
    <nav
      ref={ref}
      class="border-r-overlay2 fixed h-full min-h-screen w-fit max-w-[25%] border-r-2 transition-transform duration-500 ease-out z-50"
      classList={{
        "-translate-x-full": !leftBarVisible(),
        "translate-x-0": leftBarVisible()
      }}
      style={{
        "transition-timing-function": leftBarVisible() 
          ? "cubic-bezier(0.34, 1.56, 0.64, 1)" // Bounce out when revealing
          : "cubic-bezier(0.4, 0, 0.2, 1)" // Smooth when hiding
      }}
    >
      <Typewriter speed={10} keepAlive={10000} class="z-50 pr-8 pl-4">
        <h3 class="hover:text-subtext0 w-fit text-center text-3xl underline transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105">
          <a href="/">Freno.dev</a>
        </h3>
      </Typewriter>
      <Typewriter keepAlive={false} class="z-50 h-full">
        <div class="text-text flex h-full flex-col justify-between px-4 text-xl font-bold">
          <ul class="gap-4">
            {/*TODO:Grab and render 5 most recent blog posts here */}
            <li></li>
          </ul>
          <div class="flex flex-col gap-4">
            <ul class="gap-4">
              <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                <a href="/">Home</a>
              </li>
              <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                <a href="/blog">Blog</a>
              </li>
              <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                <a href="#services">Services</a>
              </li>
            </ul>
            {/* Right bar navigation merged for mobile */}
            <ul class="gap-4 md:hidden border-t border-overlay0 pt-4">
              <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                <a href="#home">Home</a>
              </li>
              <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                <a href="#about">About</a>
              </li>
              <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                <a href="#services">Services</a>
              </li>
            </ul>
          </div>
        </div>
      </Typewriter>
    </nav>
  );
}

export function RightBar() {
  const { setRightBarSize, rightBarVisible } = useBars();
  let ref: HTMLDivElement | undefined;
  let actualWidth = 0;

  onMount(() => {
    if (ref) {
      const updateSize = () => {
        actualWidth = ref?.offsetWidth || 0;
        setRightBarSize(rightBarVisible() ? actualWidth : 0);
      };

      updateSize();

      const resizeObserver = new ResizeObserver((entries) => {
        // Use requestAnimationFrame to avoid ResizeObserver loop error
        requestAnimationFrame(() => {
          actualWidth = ref?.offsetWidth || 0;
          setRightBarSize(rightBarVisible() ? actualWidth : 0);
        });
      });
      resizeObserver.observe(ref);

      return () => resizeObserver.disconnect();
    }
  });

  // Update size when visibility changes
  createEffect(() => {
    setRightBarSize(rightBarVisible() ? actualWidth : 0);
  });

  return (
    <nav
      ref={ref}
      class="border-l-overlay2 fixed right-0 h-full min-h-screen w-fit max-w-[25%] border-l-2 transition-transform duration-500 ease-out md:block hidden z-50"
      classList={{
        "translate-x-full": !rightBarVisible(),
        "translate-x-0": rightBarVisible()
      }}
      style={{
        "transition-timing-function": rightBarVisible() 
          ? "cubic-bezier(0.34, 1.56, 0.64, 1)" // Bounce out when revealing
          : "cubic-bezier(0.4, 0, 0.2, 1)" // Smooth when hiding
      }}
    >
      <Typewriter keepAlive={false} class="z-50">
        <h3 class="hover:text-subtext0 w-fit text-center text-3xl underline transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105">
          Right Navigation
        </h3>
        <div class="text-text flex h-screen flex-col justify-between px-4 py-10 text-xl font-bold">
          <ul class="gap-4">
            <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
              <a href="#home">Home</a>
            </li>
            <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
              <a href="#about">About</a>
            </li>
            <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
              <a href="#services">Services</a>
            </li>
          </ul>
        </div>
      </Typewriter>
    </nav>
  );
}
