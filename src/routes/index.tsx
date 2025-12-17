import { Typewriter } from "~/components/Typewriter";

export default function Home() {
  return (
    <Typewriter speed={100} delay={1000} keepAlive={2000}>
      <main class="text-center mx-auto text-subtext0 p-4">
        {/* fill in a ipsum lorem */}
        ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem
        ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem
      </main>
    </Typewriter>
  );
}
