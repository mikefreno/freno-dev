import { Typewriter } from "./Typewriter";

export function LeftBar(props: { ref: HTMLDivElement | undefined }) {
  let ref = props.ref;
  return (
    <nav
      ref={ref}
      class="border-r-overlay2 fixed h-full min-h-screen w-fit max-w-[25%] border-r-2"
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
        </div>
      </Typewriter>
    </nav>
  );
}

export function RightBar(props: { ref: HTMLDivElement | undefined }) {
  let ref = props.ref;
  return (
    <nav
      ref={ref}
      class="border-l-overlay2 fixed right-0 h-full min-h-screen w-fit max-w-[25%] border-l-2"
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
