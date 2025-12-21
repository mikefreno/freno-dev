import { Show, untrack, createEffect, on, createSignal, For } from "solid-js";
import { createTiptapEditor, useEditorHTML } from "solid-tiptap";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
import { Node } from "@tiptap/core";
import { createLowlight, common } from "lowlight";
import css from "highlight.js/lib/languages/css";
import js from "highlight.js/lib/languages/javascript";
import ts from "highlight.js/lib/languages/typescript";
import ocaml from "highlight.js/lib/languages/ocaml";
import rust from "highlight.js/lib/languages/rust";
import python from "highlight.js/lib/languages/python";
import java from "highlight.js/lib/languages/java";
import go from "highlight.js/lib/languages/go";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import sql from "highlight.js/lib/languages/sql";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import yaml from "highlight.js/lib/languages/yaml";
import markdown from "highlight.js/lib/languages/markdown";
import xml from "highlight.js/lib/languages/xml";
import php from "highlight.js/lib/languages/php";
import ruby from "highlight.js/lib/languages/ruby";
import swift from "highlight.js/lib/languages/swift";
import kotlin from "highlight.js/lib/languages/kotlin";
import dockerfile from "highlight.js/lib/languages/dockerfile";

// Create lowlight instance with common languages
const lowlight = createLowlight(common);

// Register existing languages
lowlight.register("css", css);
lowlight.register("js", js);
lowlight.register("javascript", js);
lowlight.register("ts", ts);
lowlight.register("typescript", ts);
lowlight.register("ocaml", ocaml);
lowlight.register("rust", rust);

// Register new languages
lowlight.register("python", python);
lowlight.register("py", python);
lowlight.register("java", java);
lowlight.register("go", go);
lowlight.register("golang", go);
lowlight.register("c", c);
lowlight.register("cpp", cpp);
lowlight.register("c++", cpp);
lowlight.register("csharp", csharp);
lowlight.register("cs", csharp);
lowlight.register("sql", sql);
lowlight.register("bash", bash);
lowlight.register("shell", bash);
lowlight.register("sh", bash);
lowlight.register("json", json);
lowlight.register("yaml", yaml);
lowlight.register("yml", yaml);
lowlight.register("markdown", markdown);
lowlight.register("md", markdown);
lowlight.register("xml", xml);
lowlight.register("html", xml);
lowlight.register("php", php);
lowlight.register("ruby", ruby);
lowlight.register("rb", ruby);
lowlight.register("swift", swift);
lowlight.register("kotlin", kotlin);
lowlight.register("kt", kotlin);
lowlight.register("dockerfile", dockerfile);
lowlight.register("docker", dockerfile);

// Available languages for selector
const AVAILABLE_LANGUAGES = [
  { value: null, label: "Plain Text" },
  { value: "bash", label: "Bash/Shell" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "css", label: "CSS" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "go", label: "Go" },
  { value: "html", label: "HTML" },
  { value: "java", label: "Java" },
  { value: "javascript", label: "JavaScript" },
  { value: "json", label: "JSON" },
  { value: "kotlin", label: "Kotlin" },
  { value: "markdown", label: "Markdown" },
  { value: "ocaml", label: "OCaml" },
  { value: "php", label: "PHP" },
  { value: "python", label: "Python" },
  { value: "ruby", label: "Ruby" },
  { value: "rust", label: "Rust" },
  { value: "sql", label: "SQL" },
  { value: "swift", label: "Swift" },
  { value: "typescript", label: "TypeScript" },
  { value: "xml", label: "XML" },
  { value: "yaml", label: "YAML" }
] as const;

// IFrame extension
interface IframeOptions {
  allowFullscreen: boolean;
  HTMLAttributes: {
    [key: string]: any;
  };
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    iframe: {
      setIframe: (options: { src: string }) => ReturnType;
    };
  }
}

const IframeEmbed = Node.create<IframeOptions>({
  name: "iframe",
  group: "block",
  atom: true,

  addOptions() {
    return {
      allowFullscreen: true,
      HTMLAttributes: {
        class: "iframe-wrapper"
      }
    };
  },

  addAttributes() {
    return {
      src: {
        default: null
      },
      frameborder: {
        default: 0
      },
      allowfullscreen: {
        default: this.options.allowFullscreen,
        parseHTML: () => this.options.allowFullscreen
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: "iframe"
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", this.options.HTMLAttributes, ["iframe", HTMLAttributes]];
  },

  addCommands() {
    return {
      setIframe:
        (options: { src: string }) =>
        ({ tr, dispatch }) => {
          const { selection } = tr;
          const node = this.type.create(options);

          if (dispatch) {
            tr.replaceRangeWith(selection.from, selection.to, node);
          }

          return true;
        }
    };
  }
});

export interface TextEditorProps {
  updateContent: (content: string) => void;
  preSet?: string;
}

export default function TextEditor(props: TextEditorProps) {
  let editorRef!: HTMLDivElement;
  let bubbleMenuRef!: HTMLDivElement;

  const [showBubbleMenu, setShowBubbleMenu] = createSignal(false);
  const [bubbleMenuPosition, setBubbleMenuPosition] = createSignal({
    top: 0,
    left: 0
  });

  const [showLanguageSelector, setShowLanguageSelector] = createSignal(false);
  const [languageSelectorPosition, setLanguageSelectorPosition] = createSignal({
    top: 0,
    left: 0
  });

  const editor = createTiptapEditor(() => ({
    element: editorRef,
    extensions: [
      StarterKit,
      CodeBlockLowlight.configure({ lowlight }),
      Link.configure({
        openOnClick: true
      }),
      Image,
      IframeEmbed
    ],
    content: props.preSet || `<p><em><b>Hello!</b> World</em></p>`,
    editorProps: {
      attributes: {
        class: "focus:outline-none"
      }
    },
    onUpdate: ({ editor }) => {
      untrack(() => {
        props.updateContent(editor.getHTML());
      });
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;

      if (hasSelection && !editor.state.selection.empty) {
        setShowBubbleMenu(true);

        // Position the bubble menu
        const { view } = editor;
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);

        const left = Math.max((start.left + end.left) / 2, 0);
        const top = Math.max(start.top - 10, 0);

        setBubbleMenuPosition({ top, left });
      } else {
        setShowBubbleMenu(false);
      }
    }
  }));

  // Update editor content when preSet changes (e.g., when data loads), but only if editor exists and content is different
  createEffect(
    on(
      () => props.preSet,
      (newContent) => {
        const instance = editor();
        if (instance && newContent && instance.getHTML() !== newContent) {
          instance.commands.setContent(newContent, false); // false = don't emit update event
        }
      },
      { defer: true }
    )
  );

  const setLink = () => {
    const instance = editor();
    if (!instance) return;

    const previousUrl = instance.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    if (url === null) return;

    if (url === "") {
      instance.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    instance
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  };

  const addIframe = () => {
    const instance = editor();
    if (!instance) return;

    const url = window.prompt("URL");
    if (url) {
      instance.commands.setIframe({ src: url });
    }
  };

  const addImage = () => {
    const instance = editor();
    if (!instance) return;

    const url = window.prompt("URL");
    if (url) {
      instance.chain().focus().setImage({ src: url }).run();
    }
  };

  const insertCodeBlock = (language: string | null) => {
    const instance = editor();
    if (!instance) return;

    instance.chain().focus().toggleCodeBlock().run();

    // If language specified, update the node attributes
    if (language) {
      instance.chain().updateAttributes("codeBlock", { language }).run();
    }

    setShowLanguageSelector(false);
  };

  const showLanguagePicker = (e: MouseEvent) => {
    const buttonRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setLanguageSelectorPosition({
      top: buttonRect.bottom + 5,
      left: buttonRect.left
    });
    setShowLanguageSelector(!showLanguageSelector());
  };

  // Close language selector on outside click
  createEffect(() => {
    if (showLanguageSelector()) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (
          !target.closest(".language-selector") &&
          !target.closest("[data-language-picker-trigger]")
        ) {
          setShowLanguageSelector(false);
        }
      };

      setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
      }, 0);

      return () => document.removeEventListener("click", handleClickOutside);
    }
  });

  return (
    <div class="border-surface2 text-text w-full rounded-md border px-4 py-2">
      <Show when={editor()}>
        {(instance) => (
          <>
            {/* Bubble Menu - appears when text is selected */}
            <Show when={showBubbleMenu()}>
              <div
                ref={bubbleMenuRef}
                class="bg-mantle text-text fixed z-50 w-fit rounded p-2 text-sm whitespace-nowrap shadow-lg"
                style={{
                  top: `${bubbleMenuPosition().top}px`,
                  left: `${bubbleMenuPosition().left}px`,
                  transform: "translate(-50%, -100%)",
                  "margin-top": "-8px"
                }}
              >
                <div class="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      instance()
                        .chain()
                        .focus()
                        .toggleHeading({ level: 1 })
                        .run()
                    }
                    class={`${
                      instance().isActive("heading", { level: 1 })
                        ? "bg-surface2"
                        : "hover:bg-surface1"
                    } rounded px-2 py-1`}
                  >
                    H1
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      instance()
                        .chain()
                        .focus()
                        .toggleHeading({ level: 2 })
                        .run()
                    }
                    class={`${
                      instance().isActive("heading", { level: 2 })
                        ? "bg-surface2"
                        : "hover:bg-surface1"
                    } rounded px-2 py-1`}
                  >
                    H2
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      instance()
                        .chain()
                        .focus()
                        .toggleHeading({ level: 3 })
                        .run()
                    }
                    class={`${
                      instance().isActive("heading", { level: 3 })
                        ? "bg-surface2"
                        : "hover:bg-surface1"
                    } rounded px-2 py-1`}
                  >
                    H3
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      instance().chain().focus().toggleBold().run()
                    }
                    class={`${
                      instance().isActive("bold")
                        ? "bg-crust"
                        : "hover:bg-crust"
                    } bg-opacity-30 hover:bg-opacity-30 rounded px-2 py-1`}
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      instance().chain().focus().toggleItalic().run()
                    }
                    class={`${
                      instance().isActive("italic")
                        ? "bg-crust"
                        : "hover:bg-crust"
                    } bg-opacity-30 hover:bg-opacity-30 rounded px-2 py-1`}
                  >
                    <em>I</em>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      instance().chain().focus().toggleStrike().run()
                    }
                    class={`${
                      instance().isActive("strike")
                        ? "bg-crust"
                        : "hover:bg-crust"
                    } bg-opacity-30 hover:bg-opacity-30 rounded px-2 py-1`}
                  >
                    <s>S</s>
                  </button>
                  <button
                    type="button"
                    onClick={setLink}
                    class={`${
                      instance().isActive("link")
                        ? "bg-crust"
                        : "hover:bg-crust"
                    } bg-opacity-30 hover:bg-opacity-30 rounded px-2 py-1`}
                  >
                    Link
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      instance().chain().focus().toggleCode().run()
                    }
                    class={`${
                      instance().isActive("code")
                        ? "bg-crust"
                        : "hover:bg-crust"
                    } bg-opacity-30 hover:bg-opacity-30 rounded px-2 py-1`}
                  >
                    Code
                  </button>
                </div>
              </div>
            </Show>

            {/* Language Selector Dropdown */}
            <Show when={showLanguageSelector()}>
              <div
                class="language-selector bg-mantle text-text border-surface2 fixed z-50 max-h-64 w-48 overflow-y-auto rounded border shadow-lg"
                style={{
                  top: `${languageSelectorPosition().top}px`,
                  left: `${languageSelectorPosition().left}px`
                }}
              >
                <For each={AVAILABLE_LANGUAGES}>
                  {(lang) => (
                    <button
                      type="button"
                      onClick={() => insertCodeBlock(lang.value)}
                      class="hover:bg-surface1 w-full px-3 py-2 text-left text-sm transition-colors"
                    >
                      {lang.label}
                    </button>
                  )}
                </For>
              </div>
            </Show>

            <div class="border-surface2 mb-2 flex flex-wrap gap-1 border-b pb-2">
              <button
                type="button"
                onClick={() =>
                  instance().chain().focus().toggleHeading({ level: 1 }).run()
                }
                class={`${
                  instance().isActive("heading", { level: 1 })
                    ? "bg-surface2"
                    : "hover:bg-surface1"
                } rounded px-2 py-1 text-xs`}
                title="Heading 1"
              >
                H1
              </button>
              <button
                type="button"
                onClick={() =>
                  instance().chain().focus().toggleHeading({ level: 2 }).run()
                }
                class={`${
                  instance().isActive("heading", { level: 2 })
                    ? "bg-surface2"
                    : "hover:bg-surface1"
                } rounded px-2 py-1 text-xs`}
                title="Heading 2"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() =>
                  instance().chain().focus().toggleHeading({ level: 3 }).run()
                }
                class={`${
                  instance().isActive("heading", { level: 3 })
                    ? "bg-surface2"
                    : "hover:bg-surface1"
                } rounded px-2 py-1 text-xs`}
                title="Heading 3"
              >
                H3
              </button>
              <div class="border-surface2 mx-1 border-l"></div>
              <button
                type="button"
                onClick={() => instance().chain().focus().toggleBold().run()}
                class={`${
                  instance().isActive("bold")
                    ? "bg-surface2"
                    : "hover:bg-surface1"
                } rounded px-2 py-1 text-xs`}
                title="Bold"
              >
                <strong>B</strong>
              </button>
              <button
                type="button"
                onClick={() => instance().chain().focus().toggleItalic().run()}
                class={`${
                  instance().isActive("italic")
                    ? "bg-surface2"
                    : "hover:bg-surface1"
                } rounded px-2 py-1 text-xs`}
                title="Italic"
              >
                <em>I</em>
              </button>
              <button
                type="button"
                onClick={() => instance().chain().focus().toggleStrike().run()}
                class={`${
                  instance().isActive("strike")
                    ? "bg-surface2"
                    : "hover:bg-surface1"
                } rounded px-2 py-1 text-xs`}
                title="Strikethrough"
              >
                <s>S</s>
              </button>
              <div class="border-surface2 mx-1 border-l"></div>
              <button
                type="button"
                onClick={() =>
                  instance().chain().focus().toggleBulletList().run()
                }
                class={`${
                  instance().isActive("bulletList")
                    ? "bg-surface2"
                    : "hover:bg-surface1"
                } rounded px-2 py-1 text-xs`}
                title="Bullet List"
              >
                • List
              </button>
              <button
                type="button"
                onClick={() =>
                  instance().chain().focus().toggleOrderedList().run()
                }
                class={`${
                  instance().isActive("orderedList")
                    ? "bg-surface2"
                    : "hover:bg-surface1"
                } rounded px-2 py-1 text-xs`}
                title="Ordered List"
              >
                1. List
              </button>
              <button
                type="button"
                onClick={() =>
                  instance().chain().focus().toggleBlockquote().run()
                }
                class={`${
                  instance().isActive("blockquote")
                    ? "bg-surface2"
                    : "hover:bg-surface1"
                } rounded px-2 py-1 text-xs`}
                title="Blockquote"
              >
                " Quote
              </button>
              <div class="border-surface2 mx-1 border-l"></div>
              <button
                type="button"
                onClick={showLanguagePicker}
                data-language-picker-trigger
                class={`${
                  instance().isActive("codeBlock")
                    ? "bg-surface2"
                    : "hover:bg-surface1"
                } rounded px-2 py-1 text-xs`}
                title="Code Block"
              >
                {"</>"}
              </button>
              <button
                type="button"
                onClick={setLink}
                class={`${
                  instance().isActive("link")
                    ? "bg-surface2"
                    : "hover:bg-surface1"
                } rounded px-2 py-1 text-xs`}
                title="Add Link"
              >
                🔗 Link
              </button>
              <button
                type="button"
                onClick={addImage}
                class="hover:bg-surface1 rounded px-2 py-1 text-xs"
                title="Add Image"
              >
                🖼 Image
              </button>
              <button
                type="button"
                onClick={addIframe}
                class="hover:bg-surface1 rounded px-2 py-1 text-xs"
                title="Add Iframe"
              >
                📺 Iframe
              </button>
              <div class="border-surface2 mx-1 border-l"></div>
              <button
                type="button"
                onClick={() =>
                  instance().chain().focus().setHorizontalRule().run()
                }
                class="bg-surface0 hover:bg-surface1 rounded px-3 py-1 text-xs"
                title="Horizontal Rule"
              >
                ━━ HR
              </button>
            </div>
          </>
        )}
      </Show>

      <div
        ref={editorRef}
        class="prose prose-sm prose-invert sm:prose-base md:prose-xl lg:prose-xl xl:prose-2xl mx-auto h-[80dvh] min-w-full overflow-scroll focus:outline-none"
      />
    </div>
  );
}
