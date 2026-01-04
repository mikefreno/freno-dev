import { createEffect, createSignal, onMount } from "solid-js";
import type { HLJSApi } from "highlight.js";
import MermaidRenderer from "./MermaidRenderer";

export interface PostBodyClientProps {
  body: string;
  hasCodeBlock: boolean;
}

async function loadHighlightJS(): Promise<HLJSApi> {
  const [
    hljsModule,
    javascript,
    typescript,
    python,
    rust,
    c,
    cpp,
    csharp,
    ocaml,
    lua,
    swift,
    bash,
    css,
    xml, // handles HTML
    go,
    glsl,
    json,
    markdown,
    yaml,
    sql,
    diff,
    toml
  ] = await Promise.all([
    import("highlight.js/lib/core"),
    import("highlight.js/lib/languages/javascript"),
    import("highlight.js/lib/languages/typescript"),
    import("highlight.js/lib/languages/python"),
    import("highlight.js/lib/languages/rust"),
    import("highlight.js/lib/languages/c"),
    import("highlight.js/lib/languages/cpp"),
    import("highlight.js/lib/languages/csharp"),
    import("highlight.js/lib/languages/ocaml"),
    import("highlight.js/lib/languages/lua"),
    import("highlight.js/lib/languages/swift"),
    import("highlight.js/lib/languages/bash"),
    import("highlight.js/lib/languages/css"),
    import("highlight.js/lib/languages/xml"),
    import("highlight.js/lib/languages/go"),
    import("highlight.js/lib/languages/glsl"),
    import("highlight.js/lib/languages/json"),
    import("highlight.js/lib/languages/markdown"),
    import("highlight.js/lib/languages/yaml"),
    import("highlight.js/lib/languages/sql"),
    import("highlight.js/lib/languages/diff"),
    import("highlight.js/lib/languages/ini"), // handles TOML
    import("highlight.js/styles/github-dark.css")
  ]);

  const hljs = hljsModule.default;

  hljs.registerLanguage("javascript", javascript.default);
  hljs.registerLanguage("typescript", typescript.default);
  hljs.registerLanguage("python", python.default);
  hljs.registerLanguage("rust", rust.default);
  hljs.registerLanguage("c", c.default);
  hljs.registerLanguage("cpp", cpp.default);
  hljs.registerLanguage("csharp", csharp.default);
  hljs.registerLanguage("ocaml", ocaml.default);
  hljs.registerLanguage("lua", lua.default);
  hljs.registerLanguage("swift", swift.default);
  hljs.registerLanguage("bash", bash.default);
  hljs.registerLanguage("sh", bash.default); // alias
  hljs.registerLanguage("css", css.default);
  hljs.registerLanguage("html", xml.default);
  hljs.registerLanguage("xml", xml.default);
  hljs.registerLanguage("go", go.default);
  hljs.registerLanguage("glsl", glsl.default);
  hljs.registerLanguage("json", json.default);
  hljs.registerLanguage("markdown", markdown.default);
  hljs.registerLanguage("yaml", yaml.default);
  hljs.registerLanguage("yml", yaml.default); // alias
  hljs.registerLanguage("sql", sql.default);
  hljs.registerLanguage("diff", diff.default);
  hljs.registerLanguage("toml", toml.default);

  hljs.registerLanguage("js", javascript.default);
  hljs.registerLanguage("ts", typescript.default);
  hljs.registerLanguage("jsx", javascript.default);
  hljs.registerLanguage("tsx", typescript.default);

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

      // Skip mermaid diagrams
      if (pre.dataset.type === "mermaid") return;

      // Check if already processed (has header with copy button)
      const existingHeader = pre.previousElementSibling;
      if (
        existingHeader?.classList.contains("language-header") &&
        existingHeader.querySelector(".copy-button")
      ) {
        return;
      }

      // Set off-black background for code block
      pre.style.backgroundColor = "#1a1a1a";

      // Extract language from code block classes
      const classes = Array.from(codeBlock.classList);
      const languageClass = classes.find((cls) => cls.startsWith("language-"));
      const language = languageClass?.replace("language-", "") || "";

      // Create language header if language is detected
      if (language) {
        const languageHeader = document.createElement("div");
        languageHeader.className = "language-header";
        languageHeader.style.backgroundColor = "#1a1a1a";

        // Add language label
        const languageLabel = document.createElement("span");
        languageLabel.textContent = language;
        languageHeader.appendChild(languageLabel);

        // Create copy button in header
        const copyButton = document.createElement("button");
        copyButton.className = "copy-button";
        copyButton.textContent = "Copy";
        copyButton.dataset.codeBlock = "true";

        // Store reference to the code block for copying
        copyButton.dataset.codeBlockId = `code-${Math.random().toString(36).substr(2, 9)}`;
        codeBlock.dataset.codeBlockId = copyButton.dataset.codeBlockId;

        languageHeader.appendChild(copyButton);

        // Insert header before pre element
        pre.parentElement?.insertBefore(languageHeader, pre);
      }

      // Add line numbers
      const codeText = codeBlock.textContent || "";
      const lines = codeText.split("\n");
      const lineCount =
        lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;

      if (lineCount > 0 && !pre.querySelector(".line-numbers")) {
        // Create line numbers container
        const lineNumbers = document.createElement("div");
        lineNumbers.className = "line-numbers";

        // Generate line numbers
        for (let i = 1; i <= lineCount; i++) {
          const lineNum = document.createElement("div");
          lineNum.textContent = i.toString();
          lineNumbers.appendChild(lineNum);
        }

        pre.appendChild(lineNumbers);
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

    // Look for the references section marker to get the custom heading name
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

      // Find the parent container and add styling
      const parentDiv = referencesSection.parentElement;
      if (parentDiv) {
        parentDiv.classList.add("references-heading");
      }

      // Find all paragraphs after the References heading that start with [n]
      let currentElement = referencesSection.nextElementSibling;

      while (currentElement) {
        if (currentElement.tagName === "P") {
          const text = currentElement.textContent?.trim() || "";
          const match = text.match(/^\[(.+?)\]\s*/);

          if (match) {
            const refNumber = match[1];
            const refId = `ref-${refNumber}`;

            // Set the ID for linking
            currentElement.id = refId;

            // Add styling
            currentElement.className =
              "reference-item transition-colors duration-500 text-sm mb-3";

            // Parse and style the content - get everything after [n]
            let refText = text.substring(match[0].length);

            // Remove any existing "↑ Back" text (including various Unicode arrow variants)
            refText = refText.replace(/[↑⬆️]\s*Back\s*$/i, "").trim();

            // Create styled content
            currentElement.innerHTML = "";

            // Add bold reference number
            const refNumSpan = document.createElement("span");
            refNumSpan.className = "text-blue font-semibold";
            refNumSpan.textContent = `[${refNumber}]`;
            currentElement.appendChild(refNumSpan);

            // Add reference text
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

            // Add back button
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
                // Highlight the reference link briefly
                target.style.backgroundColor = "rgba(203, 166, 247, 0.2)";
                setTimeout(() => {
                  target.style.backgroundColor = "";
                }, 2000);
              }
            };
            currentElement.appendChild(backLink);
          }
        }

        // Check if we've reached another heading (end of references)
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

  // Load highlight.js only when needed
  createEffect(() => {
    if (props.hasCodeBlock && !hljs()) {
      loadHighlightJS().then(setHljs);
    }
  });

  // Apply syntax highlighting when hljs loads and when body changes
  createEffect(() => {
    const hljsInstance = hljs();
    if (hljsInstance && props.hasCodeBlock && contentRef) {
      setTimeout(() => {
        hljsInstance.highlightAll();
        processCodeBlocks();
      }, 100);
    }
  });

  // Process references after content is mounted and when body changes
  onMount(() => {
    setTimeout(() => {
      processReferences();
      if (props.hasCodeBlock) {
        processCodeBlocks();
      }
    }, 150);

    // Event delegation for copy buttons (single listener for all buttons)
    if (contentRef) {
      const handleCopyButtonInteraction = async (e: Event) => {
        const target = e.target as HTMLElement;

        // Handle click
        if (e.type === "click" && target.classList.contains("copy-button")) {
          // Find the code block using the stored ID
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

      // Single event listener for all copy button interactions
      contentRef.addEventListener("click", handleCopyButtonInteraction);
    }
  });

  createEffect(() => {
    // Re-process when body changes
    if (props.body && contentRef) {
      setTimeout(() => {
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
