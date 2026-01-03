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

  const addCopyButtons = () => {
    if (!contentRef) return;

    const codeBlocks = contentRef.querySelectorAll("pre code");

    codeBlocks.forEach((codeBlock) => {
      const pre = codeBlock.parentElement;
      if (!pre || pre.querySelector(".copy-button")) return;

      // Create wrapper for positioning
      pre.style.position = "relative";

      // Create copy button
      const copyButton = document.createElement("button");
      copyButton.className =
        "copy-button absolute top-2 right-2 px-3 py-1.5 text-xs font-medium rounded transition-all duration-200 z-10";
      copyButton.style.cssText =
        "background-color: var(--color-surface0); color: var(--color-text); border: 1px solid var(--color-overlay0);";
      copyButton.textContent = "Copy";
      copyButton.dataset.codeBlock = "true"; // Mark for event delegation

      pre.appendChild(copyButton);
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
        link.style.cssText =
          "text-decoration: none; font-size: 0.75em; vertical-align: super;";

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

    const headings = contentRef.querySelectorAll("h2");
    let referencesSection: HTMLElement | null = null;

    headings.forEach((heading) => {
      if (heading.textContent?.trim() === "References") {
        referencesSection = heading;
      }
    });

    if (referencesSection) {
      referencesSection.className = "text-2xl font-bold mb-4 text-text";

      // Find the parent container and add styling
      const parentDiv = referencesSection.parentElement;
      if (parentDiv) {
        // Add top border and padding
        parentDiv.style.cssText =
          "border-top: 1px solid var(--surface2); margin-top: 4rem; padding-top: 2rem;";
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
            currentElement.style.cssText = "scroll-margin-top: 100px;";

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
        addCopyButtons();
      }, 100);
    }
  });

  // Process references after content is mounted and when body changes
  onMount(() => {
    setTimeout(() => {
      processReferences();
      if (props.hasCodeBlock) {
        addCopyButtons();
      }
    }, 150);

    // Event delegation for copy buttons (single listener for all buttons)
    if (contentRef) {
      const handleCopyButtonInteraction = async (e: Event) => {
        const target = e.target as HTMLElement;

        // Handle mouseenter
        if (
          e.type === "mouseover" &&
          target.classList.contains("copy-button")
        ) {
          target.style.backgroundColor = "var(--color-surface1)";
        }

        // Handle mouseleave
        if (e.type === "mouseout" && target.classList.contains("copy-button")) {
          if (target.textContent === "Copy") {
            target.style.backgroundColor = "var(--color-surface0)";
          }
        }

        // Handle click
        if (e.type === "click" && target.classList.contains("copy-button")) {
          const pre = target.parentElement;
          const codeBlock = pre?.querySelector("code");
          if (!codeBlock) return;

          const code = codeBlock.textContent || "";

          try {
            await navigator.clipboard.writeText(code);
            target.textContent = "Copied!";
            target.style.backgroundColor = "var(--color-green)";
            target.style.color = "var(--color-base)";

            setTimeout(() => {
              target.textContent = "Copy";
              target.style.backgroundColor = "var(--color-surface0)";
              target.style.color = "var(--color-text)";
            }, 2000);
          } catch (err) {
            console.error("Failed to copy code:", err);
            target.textContent = "Failed";
            target.style.backgroundColor = "var(--color-red)";

            setTimeout(() => {
              target.textContent = "Copy";
              target.style.backgroundColor = "var(--color-surface0)";
            }, 2000);
          }
        }
      };

      // Single event listener for all copy button interactions
      contentRef.addEventListener("click", handleCopyButtonInteraction);
      contentRef.addEventListener("mouseover", handleCopyButtonInteraction);
      contentRef.addEventListener("mouseout", handleCopyButtonInteraction);
    }
  });

  createEffect(() => {
    // Re-process when body changes
    if (props.body && contentRef) {
      setTimeout(() => {
        processReferences();
        if (props.hasCodeBlock) {
          addCopyButtons();
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
