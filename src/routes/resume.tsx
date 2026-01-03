import { Title, Meta } from "@solidjs/meta";

export default function Resume() {
  return (
    <>
      <Title>Resume | Michael Freno</Title>
      <Meta
        name="description"
        content="View Michael Freno's resume - Software Engineer."
      />

      <main class="w-full flex-1 flex-col items-center p-4">
        <div class="mb-4 flex gap-3">
          <a
            href="/resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            class="bg-blue rounded px-4 py-2 text-base text-sm hover:brightness-125"
          >
            Open in New Tab
          </a>
          <a
            href="/resume.pdf"
            download="Michael_Freno_Resume.pdf"
            class="border-blue text-blue rounded border px-4 py-2 text-sm hover:brightness-125"
          >
            Download PDF
          </a>
        </div>

        <embed
          src="/resume.pdf"
          type="application/pdf"
          class="h-full w-full max-w-5xl shadow-lg"
        />
      </main>
    </>
  );
}
