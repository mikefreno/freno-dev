import { Show } from "solid-js";
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

// Create lowlight instance with common languages
const lowlight = createLowlight(common);

// Register additional languages
lowlight.register("css", css);
lowlight.register("js", js);
lowlight.register("ts", ts);
lowlight.register("ocaml", ocaml);
lowlight.register("rust", rust);

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
    onUpdate: ({ editor }) => {
      props.updateContent(editor.getHTML());
    }
  }));

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

  return (
    <div class="border-surface2 text-text w-full rounded-md border px-4 py-2">
      <Show when={editor()}>
        {(instance) => (
          <>
            {/* Bubble Menu - appears when text is selected */}
            <div
              class="tiptap-bubble-menu"
              style={{
                display: "none" // Will be shown by Tiptap when text is selected
              }}
            >
              <div class="bg-mantle text-text mt-4 w-fit rounded p-2 text-sm whitespace-nowrap shadow-lg">
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
            </div>

            {/* Toolbar - always visible */}
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
                onClick={() =>
                  instance().chain().focus().toggleCodeBlock().run()
                }
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
                class="hover:bg-surface1 rounded px-2 py-1 text-xs"
                title="Horizontal Rule"
              >
                ─ HR
              </button>
            </div>
          </>
        )}
      </Show>

      <div
        ref={editorRef}
        class="prose prose-sm prose-invert sm:prose-base md:prose-xl lg:prose-xl xl:prose-2xl mx-auto min-h-[400px] min-w-full focus:outline-none"
      />
    </div>
  );
}
