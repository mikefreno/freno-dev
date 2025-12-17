import { Typewriter } from "./Typewriter";

export function LeftBar() {
  return (
    <nav class="w-fit max-w-[25%] min-h-screen h-full border-r-2 border-r-maroon flex flex-col text-text text-xl font-bold py-10 px-4 gap-4 text-left">
      <Typewriter keepAlive={false}>
        <h3 class="text-2xl">Left Navigation</h3>
        <ul>
          <li class="hover:-translate-y-0.5 transition-transform duration-200 ease-in-out hover:text-green hover:font-bold hover:scale-110">
            <a href="#home">Home</a>
          </li>
          <li class="hover:-translate-y-0.5 transition-transform duration-200 ease-in-out hover:text-green hover:font-bold hover:scale-110">
            <a href="#about">About</a>
          </li>
          <li class="hover:-translate-y-0.5 transition-transform duration-200 ease-in-out hover:text-green hover:font-bold hover:scale-110">
            <a href="#services">Services</a>
          </li>
        </ul>
      </Typewriter>
    </nav>
  );
}

export function RightBar() {
  return (
    <nav class="w-fit max-w-[25%] min-h-screen h-full border-l-2 border-l-maroon flex flex-col text-text text-xl font-bold py-10 px-4 gap-4 text-right">
      <Typewriter keepAlive={false}>
        <h3 class="text-2xl">Right Navigation</h3>
        <ul>
          <li class="hover:-translate-y-0.5 transition-transform duration-200 ease-in-out hover:text-green hover:font-bold hover:scale-110">
            <a href="#home">Home</a>
          </li>
          <li class="hover:-translate-y-0.5 transition-transform duration-200 ease-in-out hover:text-green hover:font-bold hover:scale-110">
            <a href="#about">About</a>
          </li>
          <li class="hover:-translate-y-0.5 transition-transform duration-200 ease-in-out hover:text-green hover:font-bold hover:scale-110">
            <a href="#services">Services</a>
          </li>
        </ul>
      </Typewriter>
    </nav>
  );
}
