import { createEffect, createSignal, onMount, lazy } from "solid-js";
import type { HLJSApi } from "highlight.js";

const MermaidRenderer = lazy(() => import("./MermaidRenderer"));

export interface PostBodyClientProps {
  body: string;
  hasCodeBlock: boolean;
}

async function loadHighlightJS(): Promise<HLJSApi> {
  const hljs = (await import("~/lib/highlight-bundle")).default;
  return hljs;
}

export default function PostBodyClient(props: PostBodyClientProps) {
  let contentRef: HTMLDivElement | undefined;
  const [hljs, setHljs] = createSignal<HLJSApi | null>(null);

  const processCodeBlocks = () => {
    if (!contentRef) return;

    const codeBlocks = contentRef.querySelectorAll("pre code");

    codeBlocks.forEach((codeBlock) => {
      const pre = codeBlock.parentElement;
      if (!pre) return;

      if (pre.dataset.type === "mermaid") return;

      const existingHeader = pre.previousElementSibling;
      if (
        existingHeader?.classList.contains("language-header") &&
        existingHeader.querySelector(".copy-button")
      ) {
        return;
      }

      pre.style.backgroundColor = "#1a1a1a";

      const classes = Array.from(codeBlock.classList);
      const languageClass = classes.find((cls) => cls.startsWith("language-"));
      const language = languageClass?.replace("language-", "") || "";

      if (language) {
        const languageHeader = document.createElement("div");
        languageHeader.className = "language-header";
        languageHeader.style.backgroundColor = "#1a1a1a";

        const languageLabel = document.createElement("span");
        languageLabel.textContent = language;
        languageHeader.appendChild(languageLabel);

        const copyButton = document.createElement("button");
        copyButton.className = "copy-button";
        copyButton.textContent = "Copy";
        copyButton.dataset.codeBlock = "true";

        copyButton.dataset.codeBlockId = `code-${Math.random().toString(36).substr(2, 9)}`;
        codeBlock.dataset.codeBlockId = copyButton.dataset.codeBlockId;

        languageHeader.appendChild(copyButton);

        pre.parentElement?.insertBefore(languageHeader, pre);
      }

      const codeText = codeBlock.textContent || "";
      const lines = codeText.split("\n");
      const lineCount =
        lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;

      if (lineCount > 0 && !pre.querySelector(".line-numbers")) {
        const lineNumbers = document.createElement("div");
        lineNumbers.className = "line-numbers";

        for (let i = 1; i <= lineCount; i++) {
          const lineNum = document.createElement("div");
          lineNum.textContent = i.toString();
          lineNumbers.appendChild(lineNum);
        }

        pre.appendChild(lineNumbers);
      }
    });
  };

  const processVideos = () => {
    if (!contentRef) return;

    // Handle direct video elements
    const videoElements = contentRef.querySelectorAll("video");

    videoElements.forEach((video) => {
      // Ensure videos play inline and don't trigger downloads
      video.setAttribute("playsinline", "");
      video.setAttribute("controls", "");

      // Remove download attribute if present
      video.removeAttribute("download");

      // Ensure proper MIME types on source elements
      const sources = video.querySelectorAll("source");
      sources.forEach((source) => {
        const src = source.getAttribute("src");
        if (src) {
          // Remove download attribute from sources
          source.removeAttribute("download");

          // Set correct type attribute if missing
          if (!source.hasAttribute("type")) {
            if (src.endsWith(".mp4")) {
              source.setAttribute("type", "video/mp4");
            } else if (src.endsWith(".webm")) {
              source.setAttribute("type", "video/webm");
            } else if (src.endsWith(".ogg")) {
              source.setAttribute("type", "video/ogg");
            }
          }
        }
      });

      // If video has direct src attribute, ensure type is set
      const videoSrc = video.getAttribute("src");
      if (videoSrc && !video.hasAttribute("type")) {
        if (videoSrc.endsWith(".mp4")) {
          video.setAttribute("type", "video/mp4");
        } else if (videoSrc.endsWith(".webm")) {
          video.setAttribute("type", "video/webm");
        } else if (videoSrc.endsWith(".ogg")) {
          video.setAttribute("type", "video/ogg");
        }
      }
    });

    // Handle iframes with video sources - replace with proper video tags
    const iframes = contentRef.querySelectorAll("iframe");
    iframes.forEach((iframe) => {
      const src = iframe.getAttribute("src");
      if (
        src &&
        (src.endsWith(".mp4") ||
          src.endsWith(".mov") ||
          src.endsWith(".webm") ||
          src.endsWith(".ogg"))
      ) {
        // Create a proper video element
        const video = document.createElement("video");
        video.setAttribute("controls", "");
        video.setAttribute("playsinline", "");
        video.setAttribute("preload", "metadata");
        video.style.maxWidth = "100%";
        video.style.height = "auto";

        // Set appropriate type based on file extension
        let videoType = "video/mp4";
        if (src.endsWith(".mov")) {
          videoType = "video/mp4"; // MOV files are typically H.264 which plays as mp4
        } else if (src.endsWith(".webm")) {
          videoType = "video/webm";
        } else if (src.endsWith(".ogg")) {
          videoType = "video/ogg";
        }

        video.setAttribute("type", videoType);
        video.src = src;

        // Replace the iframe with the video element
        const parent = iframe.parentElement;
        if (parent) {
          parent.replaceChild(video, iframe);
        }
      }
    });

    // Also check for any anchor tags wrapping videos that might have download attribute
    const videoLinks = contentRef.querySelectorAll("a");
    videoLinks.forEach((link) => {
      const hasVideo = link.querySelector("video");
      if (hasVideo) {
        link.removeAttribute("download");
      }
    });
  };

  const processReferences = () => {
    if (!contentRef) return;

    const supElements = contentRef.querySelectorAll("sup");

    supElements.forEach((sup) => {
      const text = sup.textContent?.trim() || "";
      const match = text.match(/^\[(.+?)\]$/);

      if (match) {
        const refNumber = match[1];
        const refId = `ref-${refNumber}`;
        const refBackId = `ref-${refNumber}-back`;

        sup.id = refBackId;

        sup.innerHTML = "";
        const link = document.createElement("a");
        link.href = `#${refId}`;
        link.textContent = `[${refNumber}]`;
        link.className =
          "reference-link text-blue hover:text-sky no-underline cursor-pointer";

        link.onclick = (e) => {
          e.preventDefault();
          const target = document.getElementById(refId);
          if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "center" });
            target.style.backgroundColor = "rgba(137, 180, 250, 0.2)";
            setTimeout(() => {
              target.style.backgroundColor = "";
            }, 2000);
          }
        };

        sup.appendChild(link);
      }
    });

    const marker = contentRef.querySelector(
      "span[id='references-section-start']"
    ) as HTMLElement | null;
    const referencesHeadingText =
      marker?.getAttribute("data-heading") || "References";

    const headings = contentRef.querySelectorAll("h2");
    let referencesSection: HTMLElement | null = null;

    headings.forEach((heading) => {
      if (heading.textContent?.trim() === referencesHeadingText) {
        referencesSection = heading;
      }
    });

    if (referencesSection) {
      referencesSection.className = "text-2xl font-bold mb-4 text-text";

      const parentDiv = referencesSection.parentElement;
      if (parentDiv) {
        parentDiv.classList.add("references-heading");
      }

      let currentElement = referencesSection.nextElementSibling;

      while (currentElement) {
        if (currentElement.tagName === "P") {
          const text = currentElement.textContent?.trim() || "";
          const match = text.match(/^\[(.+?)\]\s*/);

          if (match) {
            const refNumber = match[1];
            const refId = `ref-${refNumber}`;

            currentElement.id = refId;

            currentElement.className =
              "reference-item transition-colors duration-500 text-sm mb-3";

            let refText = text.substring(match[0].length);

            refText = refText.replace(/[↑⬆️]\s*Back\s*$/i, "").trim();

            currentElement.innerHTML = "";

            const refNumSpan = document.createElement("span");
            refNumSpan.className = "text-blue font-semibold";
            refNumSpan.textContent = `[${refNumber}]`;
            currentElement.appendChild(refNumSpan);

            if (refText) {
              const refTextSpan = document.createElement("span");
              refTextSpan.className = "ml-2";
              refTextSpan.textContent = refText;
              currentElement.appendChild(refTextSpan);
            } else {
              const refTextSpan = document.createElement("span");
              refTextSpan.className = "ml-2 text-subtext0 italic";
              refTextSpan.textContent = "Add your reference text here";
              currentElement.appendChild(refTextSpan);
            }

            const backLink = document.createElement("a");
            backLink.href = `#ref-${refNumber}-back`;
            backLink.className =
              "text-mauve hover:text-pink ml-2 text-xs cursor-pointer";
            backLink.textContent = "↑ Back";
            backLink.onclick = (e) => {
              e.preventDefault();
              const target = document.getElementById(`ref-${refNumber}-back`);
              if (target) {
                target.scrollIntoView({ behavior: "smooth", block: "center" });
                target.style.backgroundColor = "rgba(203, 166, 247, 0.2)";
                setTimeout(() => {
                  target.style.backgroundColor = "";
                }, 2000);
              }
            };
            currentElement.appendChild(backLink);
          }
        }

        if (
          currentElement.tagName.match(/^H[1-6]$/) &&
          currentElement !== referencesSection
        ) {
          break;
        }

        currentElement = currentElement.nextElementSibling;
      }
    }
  };

  createEffect(() => {
    if (props.hasCodeBlock && !hljs()) {
      loadHighlightJS().then(setHljs);
    }
  });

  createEffect(() => {
    const hljsInstance = hljs();
    if (hljsInstance && props.hasCodeBlock && contentRef) {
      setTimeout(() => {
        hljsInstance.highlightAll();
        processCodeBlocks();
      }, 100);
    }
  });

  onMount(() => {
    setTimeout(() => {
      processVideos();
      processReferences();
      if (props.hasCodeBlock) {
        processCodeBlocks();
      }
    }, 150);

    if (contentRef) {
      const handleCopyButtonInteraction = async (e: Event) => {
        const target = e.target as HTMLElement;

        if (e.type === "click" && target.classList.contains("copy-button")) {
          const codeBlockId = target.dataset.codeBlockId;
          const codeBlock = codeBlockId
            ? contentRef?.querySelector(
                `code[data-code-block-id="${codeBlockId}"]`
              )
            : null;

          if (!codeBlock) return;

          const code = codeBlock.textContent || "";

          try {
            await navigator.clipboard.writeText(code);
            target.textContent = "Copied!";
            target.classList.add("copied");

            setTimeout(() => {
              target.textContent = "Copy";
              target.classList.remove("copied");
            }, 2000);
          } catch (err) {
            console.error("Failed to copy code:", err);
            target.textContent = "Failed";
            target.classList.add("failed");

            setTimeout(() => {
              target.textContent = "Copy";
              target.classList.remove("failed");
            }, 2000);
          }
        }
      };

      contentRef.addEventListener("click", handleCopyButtonInteraction);
    }
  });

  createEffect(() => {
    if (props.body && contentRef) {
      setTimeout(() => {
        processVideos();
        processReferences();
        if (props.hasCodeBlock) {
          processCodeBlocks();
        }
      }, 150);
    }
  });

  return (
    <div class="mx-auto max-w-4xl px-4">
      <div
        id="post-content-body"
        ref={contentRef}
        class="text-text prose dark:prose-invert max-w-none"
        innerHTML={props.body}
      />
      <MermaidRenderer />
    </div>
  );
}
