import { Title } from "@solidjs/meta";

export default function Resume() {
  return (
    <main class="flex h-screen w-full flex-col">
      <Title>Resume - Freno.dev</Title>
      <div class="flex h-full w-full items-center justify-center">
        <iframe
          src="/resume.pdf"
          class="h-full w-full border-0"
          title="Resume PDF"
        />
      </div>
    </main>
  );
}
