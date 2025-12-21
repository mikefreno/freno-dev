import { Title, Meta } from "@solidjs/meta";
import { onMount, onCleanup } from "solid-js";

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
      <Title>Resume | Michael Freno</Title>
      <Meta
        name="description"
        content="View Michael Freno's resume - Software Engineer."
      />

      <main class="flex h-screen w-full flex-col">
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
