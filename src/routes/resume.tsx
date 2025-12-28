import { Title, Meta } from "@solidjs/meta";
import { createSignal, onMount, Show, For } from "solid-js";
import { isServer } from "solid-js/web";
import { TerminalSplash } from "~/components/TerminalSplash";

export default function Resume() {
  const [pages, setPages] = createSignal<HTMLCanvasElement[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal(false);
  let containerRef: HTMLDivElement | undefined;

  onMount(async () => {
    try {
      // Dynamically import PDF.js only on client
      const pdfjsLib = await import("pdfjs-dist");

      // Set worker source to local file
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      // Load the PDF
      const loadingTask = pdfjsLib.getDocument("/resume.pdf");
      const pdf = await loadingTask.promise;

      const canvases: HTMLCanvasElement[] = [];

      // Render each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });

        // Create canvas
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.className = "shadow-lg mb-4 mx-auto max-w-full";

        // Render page
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        canvases.push(canvas);
      }

      setPages(canvases);
      setLoading(false);
    } catch (err) {
      console.error("Error loading PDF:", err);
      setError(true);
      setLoading(false);
    }
  });

  return (
    <>
      <Title>Resume | Michael Freno</Title>
      <Meta
        name="description"
        content="View Michael Freno's resume - Software Engineer."
      />

      <main class="flex min-h-screen w-full flex-col">
        <Show
          when={!loading() && !error()}
          fallback={
            <Show when={error()} fallback={<TerminalSplash />}>
              <div class="flex h-screen w-full flex-col items-center justify-center gap-6 p-8">
                <div class="flex flex-col items-center gap-4 text-center">
                  <h2 class="text-2xl font-bold">View Resume</h2>
                  <p class="text-gray-600 dark:text-gray-400">
                    Unable to load PDF viewer.
                  </p>
                </div>
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
              </div>
            </Show>
          }
        >
          <div
            ref={containerRef}
            class="flex w-full flex-col items-center gap-4 overflow-y-auto p-4"
          >
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
            <For each={pages()}>
              {(canvas) => {
                let divRef: HTMLDivElement | undefined;
                onMount(() => {
                  if (divRef) {
                    divRef.appendChild(canvas);
                  }
                });
                return <div ref={divRef} />;
              }}
            </For>
          </div>
        </Show>
      </main>
    </>
  );
}
