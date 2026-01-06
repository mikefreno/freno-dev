import { onCleanup, onMount } from "solid-js";
import { PageHead } from "~/components/PageHead";

export default function Resume() {
  let iframeRef: HTMLIFrameElement | undefined;

  onMount(() => {
    const handleError = (e: ErrorEvent) => {
      if (e.filename?.includes("resume.pdf") || e.message === "Script error.") {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("error", handleError, true);

    onCleanup(() => {
      window.removeEventListener("error", handleError, true);

      if (iframeRef) {
        iframeRef.src = "about:blank";
      }
    });
  });

  return (
    <>
      <PageHead
        title="Resume"
        description="View Michael Freno's resume - Software Engineer."
      />

      <main class="flex h-screen w-full flex-col">
        <div class="mb-4 flex justify-center gap-3 pt-4">
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
        <div class="flex h-full w-full items-center justify-center">
          <iframe
            ref={iframeRef}
            src="/resume.pdf"
            class="h-full w-full border-0"
            title="Resume PDF"
          />
        </div>
      </main>
    </>
  );
}
