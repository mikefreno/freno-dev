import { Typewriter } from "~/components/Typewriter";

export default function Home() {
  return (
    <main class="p-4 text-xl">
      <Typewriter speed={30} keepAlive={2000}>
        <div class="text-4xl">Hey!</div>
      </Typewriter>
      <Typewriter speed={80} keepAlive={2000}>
        <div>
          My name is <span class="text-green">Mike Freno</span>, I'm a{" "}
          <span class="text-blue">Software Engineer</span> based in{" "}
          <span class="text-yellow">Brooklyn, NY</span>
        </div>
      </Typewriter>
      <Typewriter speed={100}>
        I'm a passionate dev tooling, game, and open source software developer.
        Recently been working in the world of{" "}
        <a
          href="https://www.love2d.org"
          class="text-blue hover-underline-animation"
        >
          LÖVE
        </a>{" "}
      </Typewriter>
      You can see some of my work <a>here</a>(github)
      <Typewriter speed={50} keepAlive={false}>
        <div>My Collection of By-the-ways:</div>
      </Typewriter>
      <Typewriter speed={50} keepAlive={false}>
        <ul class="list-disc pl-8">
          <li>I use Neovim</li>
          <li>I use Arch Linux</li>
          <li>I use Rust</li>
        </ul>
      </Typewriter>
    </main>
  );
}
