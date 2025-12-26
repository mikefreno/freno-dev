import { Show, untrack, createEffect, on, createSignal, For } from "solid-js";
import { createTiptapEditor } from "solid-tiptap";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Details from "@tiptap/extension-details";
import DetailsSummary from "@tiptap/extension-details-summary";
import DetailsContent from "@tiptap/extension-details-content";
import { Node } from "@tiptap/core";
import { createLowlight, common } from "lowlight";
import { Mermaid } from "./extensions/Mermaid";
import { ConditionalBlock } from "./extensions/ConditionalBlock";
import { ConditionalInline } from "./extensions/ConditionalInline";
import TextAlign from "@tiptap/extension-text-align";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
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

const lowlight = createLowlight(common);

lowlight.register("css", css);
lowlight.register("js", js);
lowlight.register("javascript", js);
lowlight.register("ts", ts);
lowlight.register("typescript", ts);
lowlight.register("ocaml", ocaml);
lowlight.register("rust", rust);

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

const MERMAID_TEMPLATES = [
  {
    name: "Flowchart",
    code: `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Option 1]
    B -->|No| D[Option 2]
    C --> E[End]
    D --> E`
  },
  {
    name: "Sequence Diagram",
    code: `sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>B: Hello Bob!
    B->>A: Hello Alice!`
  },
  {
    name: "State Diagram",
    code: `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing
    Processing --> Done
    Done --> [*]`
  },
  {
    name: "Class Diagram",
    code: `classDiagram
    class Animal {
        +String name
        +makeSound()
    }
    class Dog {
        +bark()
    }
    Animal <|-- Dog`
  },
  {
    name: "Entity Relationship",
    code: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER {
        string name
        string email
    }`
  },
  {
    name: "Gantt Chart",
    code: `gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
    Task 1 :a1, 2024-01-01, 30d
    Task 2 :after a1, 20d`
  },
  {
    name: "Pie Chart",
    code: `pie title Languages Used
    "JavaScript" : 45
    "TypeScript" : 30
    "Python" : 15
    "Go" : 10`
  }
];

interface ShortcutCategory {
  name: string;
  shortcuts: Array<{
    keys: string;
    keysAlt?: string;
    description: string;
  }>;
}

const KEYBOARD_SHORTCUTS: ShortcutCategory[] = [
  {
    name: "Text Formatting",
    shortcuts: [
      { keys: "⌘ B", keysAlt: "Ctrl B", description: "Bold" },
      { keys: "⌘ I", keysAlt: "Ctrl I", description: "Italic" },
      { keys: "⌘ ⇧ X", keysAlt: "Ctrl Shift X", description: "Strikethrough" },
      { keys: "⌘ E", keysAlt: "Ctrl E", description: "Inline Code" },
      { keys: "⌘ .", keysAlt: "Ctrl .", description: "Superscript" },
      { keys: "⌘ ,", keysAlt: "Ctrl ,", description: "Subscript" }
    ]
  },
  {
    name: "Headings",
    shortcuts: [
      { keys: "⌘ ⌥ 1", keysAlt: "Ctrl Alt 1", description: "Heading 1" },
      { keys: "⌘ ⌥ 2", keysAlt: "Ctrl Alt 2", description: "Heading 2" },
      { keys: "⌘ ⌥ 3", keysAlt: "Ctrl Alt 3", description: "Heading 3" },
      { keys: "⌘ ⌥ 0", keysAlt: "Ctrl Alt 0", description: "Paragraph" }
    ]
  },
  {
    name: "Lists",
    shortcuts: [
      { keys: "⌘ ⇧ 7", keysAlt: "Ctrl Shift 7", description: "Ordered List" },
      { keys: "⌘ ⇧ 8", keysAlt: "Ctrl Shift 8", description: "Bullet List" },
      { keys: "⌘ ⇧ 9", keysAlt: "Ctrl Shift 9", description: "Task List" },
      { keys: "Tab", keysAlt: "Tab", description: "Indent" },
      { keys: "⇧ Tab", keysAlt: "Shift Tab", description: "Outdent" }
    ]
  },
  {
    name: "Text Alignment",
    shortcuts: [
      { keys: "⌘ ⇧ L", keysAlt: "Ctrl Shift L", description: "Align Left" },
      { keys: "⌘ ⇧ E", keysAlt: "Ctrl Shift E", description: "Align Center" },
      { keys: "⌘ ⇧ R", keysAlt: "Ctrl Shift R", description: "Align Right" },
      { keys: "⌘ ⇧ J", keysAlt: "Ctrl Shift J", description: "Justify" }
    ]
  },
  {
    name: "Insert",
    shortcuts: [
      { keys: "⌘ K", keysAlt: "Ctrl K", description: "Insert/Edit Link" },
      { keys: "⌘ R", keysAlt: "Ctrl R", description: "Insert Reference [n]" },
      { keys: "⌘ ⇧ C", keysAlt: "Ctrl Shift C", description: "Code Block" },
      { keys: "⌘ Enter", keysAlt: "Ctrl Enter", description: "Hard Break" },
      { keys: "⌘ ⇧ -", keysAlt: "Ctrl Shift -", description: "Horizontal Rule" }
    ]
  },
  {
    name: "Editing",
    shortcuts: [
      { keys: "⌘ Z", keysAlt: "Ctrl Z", description: "Undo" },
      { keys: "⌘ ⇧ Z", keysAlt: "Ctrl Shift Z", description: "Redo" },
      { keys: "⌘ Y", keysAlt: "Ctrl Y", description: "Redo (Alt)" },
      { keys: "⌘ A", keysAlt: "Ctrl A", description: "Select All" }
    ]
  },
  {
    name: "Other",
    shortcuts: [
      {
        keys: "⌘ ⇧ \\",
        keysAlt: "Ctrl Shift \\",
        description: "Clear Formatting"
      },
      { keys: "ESC", keysAlt: "ESC", description: "Exit Fullscreen" }
    ]
  }
];

const isMac = () => {
  return (
    typeof window !== "undefined" &&
    /Mac|iPhone|iPad|iPod/.test(window.navigator.platform)
  );
};

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
  let containerRef!: HTMLDivElement;

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

  const [showTableMenu, setShowTableMenu] = createSignal(false);
  const [tableMenuPosition, setTableMenuPosition] = createSignal({
    top: 0,
    left: 0
  });

  const [showMermaidTemplates, setShowMermaidTemplates] = createSignal(false);
  const [mermaidMenuPosition, setMermaidMenuPosition] = createSignal({
    top: 0,
    left: 0
  });

  const [showKeyboardHelp, setShowKeyboardHelp] = createSignal(false);

  const [showConditionalConfig, setShowConditionalConfig] = createSignal(false);
  const [conditionalConfigPosition, setConditionalConfigPosition] =
    createSignal({
      top: 0,
      left: 0
    });
  const [conditionalForm, setConditionalForm] = createSignal<{
    conditionType: "auth" | "privilege" | "date" | "feature" | "env";
    conditionValue: string;
    showWhen: "true" | "false";
    inline: boolean; // New field for inline vs block
  }>({
    conditionType: "auth",
    conditionValue: "authenticated",
    showWhen: "true",
    inline: false
  });

  const [isFullscreen, setIsFullscreen] = createSignal(false);
  const [keyboardVisible, setKeyboardVisible] = createSignal(false);
  const [keyboardHeight, setKeyboardHeight] = createSignal(0);

  // Force reactive updates for button states
  const [editorState, setEditorState] = createSignal(0);

  // Helper to check editor active state reactively
  const isActive = (type: string, attrs?: Record<string, any>) => {
    editorState(); // Track reactive dependency
    const instance = editor();
    return instance ? instance.isActive(type, attrs) : false;
  };

  const isAlignActive = (alignment: string) => {
    editorState();
    const instance = editor();
    if (!instance) return false;

    const { $from } = instance.state.selection;
    const node = $from.node($from.depth);
    const currentAlign = node?.attrs?.textAlign;

    if (currentAlign) {
      return currentAlign === alignment;
    }

    return alignment === "left";
  };

  // Helper for mobile-optimized button classes
  const getButtonClasses = (
    isActive: boolean,
    includeHover: boolean = false
  ) => {
    const baseClasses =
      "rounded px-2 py-1 text-xs select-none touch-manipulation active:scale-95 transition-transform";
    const activeClass = isActive ? "bg-surface2" : "";
    const hoverClass = includeHover && !isActive ? "hover:bg-surface1" : "";
    return `${baseClasses} ${activeClass} ${hoverClass}`.trim();
  };

  const editor = createTiptapEditor(() => ({
    element: editorRef,
    extensions: [
      StarterKit,
      CodeBlockLowlight.configure({ lowlight }),
      Link.configure({
        openOnClick: true
      }),
      Image,
      IframeEmbed,
      TaskList,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: "task-item"
        }
      }),
      Details.configure({
        HTMLAttributes: {
          class: "tiptap-details"
        }
      }),
      DetailsSummary,
      DetailsContent.configure({
        HTMLAttributes: {
          class: "details-content"
        }
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "tiptap-table"
        }
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: "tiptap-table-row"
        }
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: "tiptap-table-header"
        }
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: "tiptap-table-cell"
        }
      }),
      Mermaid,
      ConditionalBlock,
      ConditionalInline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
        defaultAlignment: "left"
      }),
      Superscript,
      Subscript
    ],
    content: props.preSet || `<p><em><b>Hello!</b> World</em></p>`,
    editorProps: {
      attributes: {
        class: "focus:outline-none"
      },
      handleKeyDown(view, event) {
        // Cmd/Ctrl+R for inserting reference
        if ((event.metaKey || event.ctrlKey) && event.key === "r") {
          event.preventDefault();
          insertReference();
          return true;
        }
        return false;
      },
      handleClickOn(view, pos, node, nodePos, event) {
        const target = event.target as HTMLElement;

        const summary = target.closest("summary");
        if (summary) {
          const details = summary.closest('[data-type="details"]');
          if (details) {
            const isOpen = details.hasAttribute("open");
            if (isOpen) {
              details.removeAttribute("open");
            } else {
              details.setAttribute("open", "");
            }
            const content = details.querySelector(
              '[data-type="detailsContent"]'
            );
            if (content) {
              if (isOpen) {
                content.setAttribute("hidden", "hidden");
              } else {
                content.removeAttribute("hidden");
              }
            }
            return true; // Prevent default behavior
          }
        }
        return false;
      }
    },
    onUpdate: ({ editor }) => {
      untrack(() => {
        props.updateContent(editor.getHTML());
        setTimeout(() => updateReferencesSection(editor), 100);
      });
    },
    onSelectionUpdate: ({ editor }) => {
      // Force reactive update for button states
      setEditorState((prev) => prev + 1);

      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;

      if (hasSelection && !editor.state.selection.empty) {
        setShowBubbleMenu(true);

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

  createEffect(
    on(
      () => props.preSet,
      (newContent) => {
        const instance = editor();
        if (instance && newContent && instance.getHTML() !== newContent) {
          instance.commands.setContent(newContent, { emitUpdate: false });
        }
      },
      { defer: true }
    )
  );

  const updateReferencesSection = (editorInstance: any) => {
    if (!editorInstance) return;

    const doc = editorInstance.state.doc;
    const foundRefs = new Set<string>();

    doc.descendants((node: any) => {
      if (node.isText && node.marks) {
        const hasSuperscript = node.marks.some(
          (mark: any) => mark.type.name === "superscript"
        );
        if (hasSuperscript) {
          const text = node.text || "";
          const match = text.match(/^\[(.+?)\]$/);
          if (match) {
            foundRefs.add(match[1]);
          }
        }
      }
    });

    if (foundRefs.size === 0) {
      let hasReferencesSection = false;
      let hrPos = -1;
      let sectionStartPos = -1;

      doc.descendants((node: any, pos: number) => {
        if (node.type.name === "heading" && node.textContent === "References") {
          hasReferencesSection = true;
          sectionStartPos = pos;
        }
      });

      if (hasReferencesSection && sectionStartPos > 0) {
        doc.nodesBetween(
          Math.max(0, sectionStartPos - 50),
          sectionStartPos,
          (node: any, pos: number) => {
            if (node.type.name === "horizontalRule") {
              hrPos = pos;
            }
          }
        );

        if (hrPos >= 0) {
          const tr = editorInstance.state.tr;
          tr.delete(hrPos, doc.content.size);
          editorInstance.view.dispatch(tr);
        }
      }
      return;
    }

    const refNumbers = Array.from(foundRefs).sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });

    let referencesHeadingPos = -1;
    let existingRefs = new Set<string>();

    doc.descendants((node: any, pos: number) => {
      if (node.type.name === "heading" && node.textContent === "References") {
        referencesHeadingPos = pos;
      }
      if (referencesHeadingPos >= 0 && node.type.name === "paragraph") {
        const match = node.textContent.match(/^\[(.+?)\]/);
        if (match) {
          existingRefs.add(match[1]);
        }
      }
    });

    if (referencesHeadingPos === -1) {
      const content: any[] = [
        { type: "horizontalRule" },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "References" }]
        }
      ];

      refNumbers.forEach((refNum) => {
        content.push({
          type: "paragraph",
          content: [
            {
              type: "text",
              text: `[${refNum}] `,
              marks: [{ type: "bold" }]
            } as any,
            {
              type: "text",
              text: "Add your reference text here"
            }
          ]
        });
      });

      const tr = editorInstance.state.tr;
      tr.insert(
        doc.content.size,
        editorInstance.schema.nodeFromJSON({ type: "doc", content }).content
      );
      editorInstance.view.dispatch(tr);
    } else {
      const newRefs = refNumbers.filter((ref) => !existingRefs.has(ref));

      if (newRefs.length > 0) {
        let insertPos = referencesHeadingPos;
        doc.nodesBetween(
          referencesHeadingPos,
          doc.content.size,
          (node: any, pos: number) => {
            if (pos > insertPos) {
              insertPos = pos + node.nodeSize;
            }
          }
        );

        const content: any[] = [];
        newRefs.forEach((refNum) => {
          content.push({
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `[${refNum}] `,
                marks: [{ type: "bold" }]
              } as any,
              {
                type: "text",
                text: "Add your reference text here"
              }
            ]
          });
        });

        const tr = editorInstance.state.tr;
        content.forEach((item) => {
          tr.insert(insertPos, editorInstance.schema.nodeFromJSON(item));
          insertPos += editorInstance.schema.nodeFromJSON(item).nodeSize;
        });
        editorInstance.view.dispatch(tr);
      }
    }
  };

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

  const insertReference = () => {
    const instance = editor();
    if (!instance) return;

    // Get next reference number by scanning document
    const doc = instance.state.doc;
    const foundRefs = new Set<string>();

    doc.descendants((node: any) => {
      if (node.isText && node.marks) {
        const hasSuperscript = node.marks.some(
          (mark: any) => mark.type.name === "superscript"
        );
        if (hasSuperscript) {
          const text = node.text || "";
          const match = text.match(/^\[(.+?)\]$/);
          if (match) {
            foundRefs.add(match[1]);
          }
        }
      }
    });

    // Calculate next number
    const numericRefs = Array.from(foundRefs)
      .map((ref) => parseInt(ref))
      .filter((num) => !isNaN(num));
    const nextNum = numericRefs.length > 0 ? Math.max(...numericRefs) + 1 : 1;

    const refNum = window.prompt("Reference number:", nextNum.toString());
    if (refNum === null || refNum.trim() === "") return;

    // Insert [n] with superscript
    instance
      .chain()
      .focus()
      .insertContent({
        type: "text",
        text: `[${refNum.trim()}]`,
        marks: [{ type: "superscript" }]
      })
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

  const insertCollapsibleSection = () => {
    const instance = editor();
    if (!instance) return;

    const title = window.prompt("Section title:", "Click to expand");

    if (title !== null && title.trim() !== "") {
      const content = {
        type: "details",
        attrs: { open: true },
        content: [
          {
            type: "detailsSummary",
            content: [{ type: "text", text: title }]
          },
          {
            type: "detailsContent",
            content: [
              {
                type: "paragraph"
              }
            ]
          }
        ]
      };

      const { from } = instance.state.selection;
      instance.chain().focus().insertContent(content).run();

      setTimeout(() => {
        const { state } = instance;
        let targetPos = from;

        state.doc.nodesBetween(from, from + 200, (node, pos) => {
          if (node.type.name === "detailsContent") {
            targetPos = pos + 1;
            return false; // Stop iteration
          }
        });

        if (targetPos > from) {
          instance.commands.setTextSelection(targetPos);
          instance.commands.focus();
        }
      }, 10);
    }
  };

  const insertCodeBlock = (language: string | null) => {
    const instance = editor();
    if (!instance) return;

    instance.chain().focus().toggleCodeBlock().run();

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

  const insertTable = (rows: number, cols: number) => {
    const instance = editor();
    if (!instance) return;

    instance
      .chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: true })
      .run();

    setShowTableMenu(false);
  };

  const showTableInserter = (e: MouseEvent) => {
    const buttonRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTableMenuPosition({
      top: buttonRect.bottom + 5,
      left: buttonRect.left
    });
    setShowTableMenu(!showTableMenu());
  };

  const deleteTableWithConfirmation = () => {
    const instance = editor();
    if (!instance) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this table?"
    );
    if (!confirmed) return;

    instance.chain().focus().deleteTable().run();
  };

  const deleteRowWithConfirmation = () => {
    const instance = editor();
    if (!instance) return;

    const { state } = instance;
    const { selection } = state;

    let rowNode = null;
    let depth = 0;
    for (let d = selection.$anchor.depth; d > 0; d--) {
      const node = selection.$anchor.node(d);
      if (node.type.name === "tableRow") {
        rowNode = node;
        depth = d;
        break;
      }
    }

    if (rowNode) {
      let hasContent = false;
      rowNode.descendants((node) => {
        if (node.textContent.trim().length > 0) {
          hasContent = true;
          return false;
        }
      });

      if (hasContent) {
        const confirmed = window.confirm(
          "This row contains content. Are you sure you want to delete it?"
        );
        if (!confirmed) return;
      }
    }

    instance.chain().focus().deleteRow().run();
  };

  const deleteColumnWithConfirmation = () => {
    const instance = editor();
    if (!instance) return;

    const { state } = instance;
    const { selection } = state;

    const cellPos = selection.$anchor;

    let tableNode = null;
    let tableDepth = 0;
    for (let d = cellPos.depth; d > 0; d--) {
      const node = cellPos.node(d);
      if (node.type.name === "table") {
        tableNode = node;
        tableDepth = d;
        break;
      }
    }

    if (tableNode) {
      let colIndex = 0;
      const cellNode = cellPos.node(cellPos.depth);
      const rowNode = cellPos.node(cellPos.depth - 1);

      rowNode.forEach((node, offset, index) => {
        if (
          cellPos.pos >= cellPos.start(cellPos.depth - 1) + offset &&
          cellPos.pos <
            cellPos.start(cellPos.depth - 1) + offset + node.nodeSize
        ) {
          colIndex = index;
        }
      });

      let hasContent = false;
      tableNode.descendants((node, pos, parent) => {
        if (parent && parent.type.name === "tableRow") {
          let currentCol = 0;
          parent.forEach((cell, offset, index) => {
            if (index === colIndex && cell.textContent.trim().length > 0) {
              hasContent = true;
              return false;
            }
          });
        }
      });

      if (hasContent) {
        const confirmed = window.confirm(
          "This column contains content. Are you sure you want to delete it?"
        );
        if (!confirmed) return;
      }
    }

    instance.chain().focus().deleteColumn().run();
  };

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

  createEffect(() => {
    if (showTableMenu()) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (
          !target.closest(".table-menu") &&
          !target.closest("[data-table-trigger]")
        ) {
          setShowTableMenu(false);
        }
      };

      setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
      }, 0);

      return () => document.removeEventListener("click", handleClickOutside);
    }
  });

  createEffect(() => {
    if (showMermaidTemplates()) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (
          !target.closest(".mermaid-menu") &&
          !target.closest("[data-mermaid-trigger]")
        ) {
          setShowMermaidTemplates(false);
        }
      };

      setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
      }, 0);

      return () => document.removeEventListener("click", handleClickOutside);
    }
  });

  createEffect(() => {
    if (showConditionalConfig()) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (
          !target.closest(".conditional-config") &&
          !target.closest("[data-conditional-trigger]")
        ) {
          setShowConditionalConfig(false);
        }
      };

      setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
      }, 0);

      return () => document.removeEventListener("click", handleClickOutside);
    }
  });

  const showMermaidSelector = (e: MouseEvent) => {
    const buttonRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMermaidMenuPosition({
      top: buttonRect.bottom + 5,
      left: buttonRect.left
    });
    setShowMermaidTemplates(!showMermaidTemplates());
  };

  const insertMermaidDiagram = (template: (typeof MERMAID_TEMPLATES)[0]) => {
    const instance = editor();
    if (!instance) return;

    instance.chain().focus().setMermaid(template.code).run();
    setShowMermaidTemplates(false);
  };

  const showConditionalConfigurator = (e: MouseEvent) => {
    const buttonRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setConditionalConfigPosition({
      top: buttonRect.bottom + 5,
      left: buttonRect.left
    });

    const instance = editor();
    if (instance?.isActive("conditionalBlock")) {
      const attrs = instance.getAttributes("conditionalBlock");
      setConditionalForm({
        conditionType: attrs.conditionType || "auth",
        conditionValue: attrs.conditionValue || "authenticated",
        showWhen: attrs.showWhen || "true",
        inline: false
      });
    } else if (instance?.isActive("conditionalInline")) {
      const attrs = instance.getAttributes("conditionalInline");
      setConditionalForm({
        conditionType: attrs.conditionType || "auth",
        conditionValue: attrs.conditionValue || "authenticated",
        showWhen: attrs.showWhen || "true",
        inline: true
      });
    } else {
      setConditionalForm({
        conditionType: "auth",
        conditionValue: "authenticated",
        showWhen: "true",
        inline: false
      });
    }

    setShowConditionalConfig(!showConditionalConfig());
  };

  const insertConditionalBlock = () => {
    const instance = editor();
    if (!instance) return;

    const { conditionType, conditionValue, showWhen, inline } =
      conditionalForm();

    if (inline) {
      if (instance.isActive("conditionalInline")) {
        instance
          .chain()
          .focus()
          .unsetConditionalInline()
          .setConditionalInline({
            conditionType,
            conditionValue,
            showWhen
          })
          .run();
      } else {
        instance
          .chain()
          .focus()
          .setConditionalInline({
            conditionType,
            conditionValue,
            showWhen
          })
          .run();
      }
    } else {
      if (instance.isActive("conditionalBlock")) {
        instance
          .chain()
          .focus()
          .updateConditionalBlock({
            conditionType,
            conditionValue,
            showWhen
          })
          .run();
      } else {
        instance
          .chain()
          .focus()
          .setConditionalBlock({
            conditionType,
            conditionValue,
            showWhen
          })
          .run();
      }
    }

    setShowConditionalConfig(false);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen());
  };

  createEffect(() => {
    if (isFullscreen()) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setIsFullscreen(false);
        }
      };

      document.addEventListener("keydown", handleKeyDown);

      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  });

  createEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const viewport = window.visualViewport;
    const initialHeight = viewport.height;

    const handleResize = () => {
      const currentHeight = viewport.height;
      const heightDiff = initialHeight - currentHeight;

      if (heightDiff > 150) {
        setKeyboardVisible(true);
        setKeyboardHeight(heightDiff);
      } else {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    };

    viewport.addEventListener("resize", handleResize);
    viewport.addEventListener("scroll", handleResize);

    return () => {
      viewport.removeEventListener("resize", handleResize);
      viewport.removeEventListener("scroll", handleResize);
    };
  });

  const TableGridSelector = () => {
    const [hoverCell, setHoverCell] = createSignal({ row: 0, col: 0 });
    const maxRows = 10;
    const maxCols = 10;

    return (
      <div class="bg-mantle border-surface2 rounded border p-3 shadow-lg">
        <div class="text-subtext0 mb-2 text-xs">
          Insert Table: {hoverCell().row + 1} × {hoverCell().col + 1}
        </div>
        <div
          class="grid gap-1"
          style={{ "grid-template-columns": `repeat(${maxCols}, 1fr)` }}
        >
          <For each={Array.from({ length: maxRows * maxCols })}>
            {(_, idx) => {
              const row = Math.floor(idx() / maxCols);
              const col = idx() % maxCols;

              return (
                <div
                  class={`border-surface2 h-4 w-4 cursor-pointer border ${
                    row <= hoverCell().row && col <= hoverCell().col
                      ? "bg-blue"
                      : "bg-surface0"
                  }`}
                  onMouseEnter={() => setHoverCell({ row, col })}
                  onClick={() => insertTable(row + 1, col + 1)}
                />
              );
            }}
          </For>
        </div>
        <div class="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => {
              const rows = parseInt(prompt("Number of rows:", "3") || "3");
              const cols = parseInt(prompt("Number of columns:", "3") || "3");
              if (rows && cols) insertTable(rows, cols);
            }}
            class="hover:bg-surface1 rounded px-2 py-1 text-xs"
          >
            Custom Size...
          </button>
        </div>
      </div>
    );
  };

  const ConditionalConfigurator = () => {
    return (
      <div class="bg-mantle border-surface2 w-80 rounded border p-4 shadow-lg">
        <h3 class="text-text mb-3 font-semibold">Conditional Block</h3>

        {/* Condition Type Selector */}
        <label class="text-subtext0 mb-2 block text-xs">Condition Type</label>
        <select
          class="bg-surface0 text-text border-surface2 mb-3 w-full rounded border px-2 py-1"
          value={conditionalForm().conditionType}
          onInput={(e) =>
            setConditionalForm({
              ...conditionalForm(),
              conditionType: e.currentTarget.value as any
            })
          }
        >
          <option value="auth">User Authentication</option>
          <option value="privilege">Privilege Level</option>
          <option value="date">Date Range</option>
          <option value="feature">Feature Flag</option>
          <option value="env">Environment Variable</option>
        </select>

        {/* Dynamic Condition Value Input based on type */}
        <Show when={conditionalForm().conditionType === "auth"}>
          <label class="text-subtext0 mb-2 block text-xs">User State</label>
          <select
            class="bg-surface0 text-text border-surface2 mb-3 w-full rounded border px-2 py-1"
            value={conditionalForm().conditionValue}
            onInput={(e) =>
              setConditionalForm({
                ...conditionalForm(),
                conditionValue: e.currentTarget.value
              })
            }
          >
            <option value="authenticated">Authenticated</option>
            <option value="anonymous">Anonymous</option>
          </select>
        </Show>

        <Show when={conditionalForm().conditionType === "privilege"}>
          <label class="text-subtext0 mb-2 block text-xs">
            Privilege Level
          </label>
          <select
            class="bg-surface0 text-text border-surface2 mb-3 w-full rounded border px-2 py-1"
            value={conditionalForm().conditionValue}
            onInput={(e) =>
              setConditionalForm({
                ...conditionalForm(),
                conditionValue: e.currentTarget.value
              })
            }
          >
            <option value="admin">Admin</option>
            <option value="user">User</option>
            <option value="anonymous">Anonymous</option>
          </select>
        </Show>

        <Show when={conditionalForm().conditionType === "date"}>
          <label class="text-subtext0 mb-2 block text-xs">Date Condition</label>
          <input
            type="text"
            placeholder="before:2026-01-01 or after:2025-01-01"
            class="bg-surface0 text-text border-surface2 mb-3 w-full rounded border px-2 py-1"
            value={conditionalForm().conditionValue}
            onInput={(e) =>
              setConditionalForm({
                ...conditionalForm(),
                conditionValue: e.currentTarget.value
              })
            }
          />
          <div class="text-subtext0 mb-3 text-xs">
            Format: before:YYYY-MM-DD, after:YYYY-MM-DD, or
            between:YYYY-MM-DD,YYYY-MM-DD
          </div>
        </Show>

        <Show when={conditionalForm().conditionType === "feature"}>
          <label class="text-subtext0 mb-2 block text-xs">
            Feature Flag Name
          </label>
          <input
            type="text"
            placeholder="feature-name"
            class="bg-surface0 text-text border-surface2 mb-3 w-full rounded border px-2 py-1"
            value={conditionalForm().conditionValue}
            onInput={(e) =>
              setConditionalForm({
                ...conditionalForm(),
                conditionValue: e.currentTarget.value
              })
            }
          />
        </Show>

        <Show when={conditionalForm().conditionType === "env"}>
          <label class="text-subtext0 mb-2 block text-xs">
            Environment Variable
          </label>
          <input
            type="text"
            list="env-variables"
            placeholder="NODE_ENV:production"
            class="bg-surface0 text-text border-surface2 mb-3 w-full rounded border px-2 py-1"
            value={conditionalForm().conditionValue}
            onInput={(e) =>
              setConditionalForm({
                ...conditionalForm(),
                conditionValue: e.currentTarget.value
              })
            }
          />
          <datalist id="env-variables">
            <option value="NODE_ENV:development">
              Development environment
            </option>
            <option value="NODE_ENV:production">Production environment</option>
            <option value="NODE_ENV:test">Test environment</option>
            <option value="VERCEL_ENV:preview">
              Vercel preview deployment
            </option>
            <option value="VERCEL_ENV:production">Vercel production</option>
            <option value="VITE_DOMAIN:*">Any domain configured</option>
            <option value="VITE_AWS_BUCKET_STRING:*">
              S3 bucket configured
            </option>
            <option value="VITE_GOOGLE_CLIENT_ID:*">Google auth enabled</option>
            <option value="VITE_GITHUB_CLIENT_ID:*">GitHub auth enabled</option>
            <option value="VITE_WEBSOCKET:*">WebSocket configured</option>
          </datalist>
          <div class="text-subtext0 mb-3 text-xs">
            Format: VAR_NAME:value or VAR_NAME:* for any truthy value
          </div>
        </Show>

        {/* Show When Toggle */}
        <label class="text-subtext0 mb-2 block text-xs">Show When</label>
        <select
          class="bg-surface0 text-text border-surface2 mb-3 w-full rounded border px-2 py-1"
          value={conditionalForm().showWhen}
          onInput={(e) =>
            setConditionalForm({
              ...conditionalForm(),
              showWhen: e.currentTarget.value as "true" | "false"
            })
          }
        >
          <option value="true">Condition is TRUE</option>
          <option value="false">Condition is FALSE</option>
        </select>

        {/* Inline Toggle */}
        <label class="text-subtext0 mb-3 flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={conditionalForm().inline}
            onChange={(e) =>
              setConditionalForm({
                ...conditionalForm(),
                inline: e.currentTarget.checked
              })
            }
            class="rounded"
          />
          <span>Inline (no line break)</span>
        </label>

        {/* Action Buttons */}
        <div class="flex gap-2">
          <button
            type="button"
            onClick={insertConditionalBlock}
            class="bg-blue rounded px-3 py-1 text-sm hover:brightness-125"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => setShowConditionalConfig(false)}
            class="hover:bg-surface1 rounded px-3 py-1 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      class="border-surface2 text-text w-full max-w-full overflow-hidden rounded-md border px-4 py-2"
      classList={{
        "fixed inset-0 z-100 m-0 h-screen max-h-screen rounded-none flex flex-col overflow-hidden!":
          isFullscreen(),
        "bg-base": isFullscreen()
      }}
    >
      <Show when={editor()}>
        {(instance) => (
          <>
            {/* Bubble Menu - appears when text is selected */}
            <Show when={showBubbleMenu()}>
              <div
                ref={bubbleMenuRef}
                class="bg-crust text-text fixed z-110 w-fit rounded p-2 text-sm whitespace-nowrap shadow-xl"
                style={{
                  top: `${bubbleMenuPosition().top}px`,
                  left: `${bubbleMenuPosition().left}px`,
                  transform: "translate(-50%, -100%)",
                  "margin-top": "-8px"
                }}
              >
                <div class="flex scale-105 flex-wrap gap-1">
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
                      isActive("heading", { level: 1 })
                        ? "bg-surface2"
                        : "hover:bg-surface1"
                    } touch-manipulation rounded px-2 py-1 select-none`}
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
                      isActive("heading", { level: 2 })
                        ? "bg-surface2"
                        : "hover:bg-surface1"
                    } touch-manipulation rounded px-2 py-1 select-none`}
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
                      isActive("heading", { level: 3 })
                        ? "bg-surface2"
                        : "hover:bg-surface1"
                    } touch-manipulation rounded px-2 py-1 select-none`}
                  >
                    H3
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      instance().chain().focus().toggleBold().run()
                    }
                    class={`${
                      isActive("bold") && "bg-crust"
                    } bg-opacity-30 hover:bg-opacity-30 touch-manipulation rounded px-2 py-1 select-none`}
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      instance().chain().focus().toggleItalic().run()
                    }
                    class={`${
                      isActive("italic") && "bg-crust"
                    } bg-opacity-30 hover:bg-opacity-30 touch-manipulation rounded px-2 py-1 select-none`}
                  >
                    <em>I</em>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      instance().chain().focus().toggleStrike().run()
                    }
                    class={`${
                      isActive("strike") && "bg-crust"
                    } bg-opacity-30 hover:bg-opacity-30 touch-manipulation rounded px-2 py-1 select-none`}
                  >
                    <s>S</s>
                  </button>
                  <button
                    type="button"
                    onClick={setLink}
                    class={`${
                      isActive("link") && "bg-crust"
                    } bg-opacity-30 hover:bg-opacity-30 touch-manipulation rounded px-2 py-1 select-none`}
                  >
                    Link
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      instance().chain().focus().toggleSuperscript().run()
                    }
                    class={`${
                      isActive("superscript") && "bg-crust"
                    } bg-opacity-30 hover:bg-opacity-30 touch-manipulation rounded px-2 py-1 select-none`}
                    title="Superscript (Reference)"
                  >
                    X<sup>n</sup>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      instance().chain().focus().toggleSubscript().run()
                    }
                    class={`${
                      isActive("subscript") && "bg-crust"
                    } bg-opacity-30 hover:bg-opacity-30 touch-manipulation rounded px-2 py-1 select-none`}
                    title="Subscript"
                  >
                    X<sub>n</sub>
                  </button>
                  {/* Table controls in bubble menu */}
                  <Show when={isActive("table")}>
                    <div class="border-crust mx-1 border-l opacity-30"></div>

                    <button
                      type="button"
                      onClick={() =>
                        instance().chain().focus().addRowBefore().run()
                      }
                      class="hover:bg-crust hover:bg-opacity-30 touch-manipulation rounded px-2 py-1 select-none"
                      title="Add Row Before"
                    >
                      ↑ Row
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        instance().chain().focus().addRowAfter().run()
                      }
                      class="hover:bg-crust hover:bg-opacity-30 touch-manipulation rounded px-2 py-1 select-none"
                      title="Add Row After"
                    >
                      Row ↓
                    </button>

                    <button
                      type="button"
                      onClick={deleteRowWithConfirmation}
                      class="hover:bg-red hover:bg-opacity-30 touch-manipulation rounded px-2 py-1 select-none"
                      title="Delete Row"
                    >
                      ✕ Row
                    </button>

                    <div class="border-crust mx-1 border-l opacity-30"></div>

                    <button
                      type="button"
                      onClick={() =>
                        instance().chain().focus().addColumnBefore().run()
                      }
                      class="hover:bg-crust hover:bg-opacity-30 touch-manipulation rounded px-2 py-1 select-none"
                      title="Add Column Before"
                    >
                      ← Col
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        instance().chain().focus().addColumnAfter().run()
                      }
                      class="hover:bg-crust hover:bg-opacity-30 touch-manipulation rounded px-2 py-1 select-none"
                      title="Add Column After"
                    >
                      Col →
                    </button>

                    <button
                      type="button"
                      onClick={deleteColumnWithConfirmation}
                      class="hover:bg-red hover:bg-opacity-30 touch-manipulation rounded px-2 py-1 select-none"
                      title="Delete Column"
                    >
                      ✕ Col
                    </button>

                    <div class="border-crust mx-1 border-l opacity-30"></div>

                    <button
                      type="button"
                      onClick={() =>
                        instance().chain().focus().mergeCells().run()
                      }
                      class="hover:bg-crust hover:bg-opacity-30 touch-manipulation rounded px-2 py-1 select-none"
                      title="Merge Cells"
                    >
                      ⊡
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        instance().chain().focus().splitCell().run()
                      }
                      class="hover:bg-crust hover:bg-opacity-30 touch-manipulation rounded px-2 py-1 select-none"
                      title="Split Cell"
                    >
                      ⊞
                    </button>

                    <button
                      type="button"
                      onClick={deleteTableWithConfirmation}
                      class="hover:bg-red hover:bg-opacity-30 touch-manipulation rounded px-2 py-1 select-none"
                      title="Delete Table"
                    >
                      ✕ Table
                    </button>
                  </Show>
                </div>
              </div>
            </Show>

            {/* Language Selector Dropdown */}
            <Show when={showLanguageSelector()}>
              <div
                class="language-selector bg-mantle text-text border-surface2 fixed z-110 max-h-64 w-48 overflow-y-auto rounded border shadow-lg"
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

            {/* Table Grid Selector */}
            <Show when={showTableMenu()}>
              <div
                class="table-menu fixed z-110"
                style={{
                  top: `${tableMenuPosition().top}px`,
                  left: `${tableMenuPosition().left}px`
                }}
              >
                <TableGridSelector />
              </div>
            </Show>

            {/* Mermaid Template Selector */}
            <Show when={showMermaidTemplates()}>
              <div
                class="mermaid-menu bg-mantle text-text border-surface2 fixed z-110 max-h-96 w-56 overflow-y-auto rounded border shadow-lg"
                style={{
                  top: `${mermaidMenuPosition().top}px`,
                  left: `${mermaidMenuPosition().left}px`
                }}
              >
                <div class="border-surface2 border-b p-2">
                  <div class="text-subtext0 text-xs font-semibold">
                    Select Diagram Type
                  </div>
                </div>
                <For each={MERMAID_TEMPLATES}>
                  {(template) => (
                    <button
                      type="button"
                      onClick={() => insertMermaidDiagram(template)}
                      class="hover:bg-surface1 w-full px-3 py-2 text-left text-sm"
                    >
                      {template.name}
                    </button>
                  )}
                </For>
              </div>
            </Show>

            {/* Conditional Configurator */}
            <Show when={showConditionalConfig()}>
              <div
                class="conditional-config fixed z-110"
                style={{
                  top: `${conditionalConfigPosition().top}px`,
                  left: `${conditionalConfigPosition().left}px`
                }}
              >
                <ConditionalConfigurator />
              </div>
            </Show>

            {/* Main Toolbar - Fixed at top always */}
            <div
              id="main-toolbar"
              class="border-surface2 bg-base sticky top-0 z-[105] border-b"
              classList={{
                "flex-none": isFullscreen()
              }}
            >
              <div class="flex flex-wrap gap-1 pb-2">
                <button
                  type="button"
                  onClick={() =>
                    instance().chain().focus().toggleHeading({ level: 1 }).run()
                  }
                  class={`${
                    isActive("heading", { level: 1 })
                      ? "bg-surface2"
                      : "hover:bg-surface1"
                  } touch-manipulation rounded px-2 py-1 text-xs select-none`}
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
                    isActive("heading", { level: 2 })
                      ? "bg-surface2"
                      : "hover:bg-surface1"
                  } touch-manipulation rounded px-2 py-1 text-xs select-none`}
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
                    isActive("heading", { level: 3 })
                      ? "bg-surface2"
                      : "hover:bg-surface1"
                  } touch-manipulation rounded px-2 py-1 text-xs select-none`}
                  title="Heading 3"
                >
                  H3
                </button>
                <div class="border-surface2 mx-1 border-l"></div>
                <button
                  type="button"
                  onClick={() => instance().chain().focus().toggleBold().run()}
                  class={getButtonClasses(isActive("bold"))}
                  title="Bold"
                >
                  <strong>B</strong>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    instance().chain().focus().toggleItalic().run()
                  }
                  class={getButtonClasses(isActive("italic"))}
                  title="Italic"
                >
                  <em>I</em>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    instance().chain().focus().toggleStrike().run()
                  }
                  class={getButtonClasses(isActive("strike"))}
                  title="Strikethrough"
                >
                  <s>S</s>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    instance().chain().focus().toggleSuperscript().run()
                  }
                  class={`${
                    isActive("superscript")
                      ? "bg-surface2"
                      : "hover:bg-surface1"
                  } touch-manipulation rounded px-2 py-1 text-xs select-none`}
                  title="Superscript (for references)"
                >
                  X<sup class="text-[0.6em]">n</sup>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    instance().chain().focus().toggleSubscript().run()
                  }
                  class={`${
                    isActive("subscript") && "bg-surface2"
                  } touch-manipulation rounded px-2 py-1 text-xs select-none`}
                  title="Subscript"
                >
                  X<sub class="text-[0.6em]">n</sub>
                </button>
                <button
                  type="button"
                  onClick={insertReference}
                  class="hover:bg-surface1 touch-manipulation rounded px-2 py-1 text-xs select-none"
                  title="Insert Reference [n] (Cmd/Ctrl+R)"
                >
                  [n]
                </button>
                <div class="border-surface2 mx-1 border-l"></div>
                <button
                  type="button"
                  onClick={() =>
                    instance().chain().focus().toggleBulletList().run()
                  }
                  class={`${
                    isActive("bulletList") && "bg-surface2"
                  } touch-manipulation rounded px-2 py-1 text-xs select-none`}
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
                    isActive("orderedList")
                      ? "bg-surface2"
                      : "hover:bg-surface1"
                  } touch-manipulation rounded px-2 py-1 text-xs select-none`}
                  title="Ordered List"
                >
                  1. List
                </button>
                <button
                  type="button"
                  onClick={() =>
                    instance().chain().focus().toggleTaskList().run()
                  }
                  class={`${
                    isActive("taskList") && "bg-surface2"
                  } touch-manipulation rounded px-2 py-1 text-xs select-none`}
                  title="Task List"
                >
                  ☑ Tasks
                </button>
                <button
                  type="button"
                  onClick={() =>
                    instance().chain().focus().toggleBlockquote().run()
                  }
                  class={`${
                    isActive("blockquote") && "bg-surface2"
                  } touch-manipulation rounded px-2 py-1 text-xs select-none`}
                  title="Blockquote"
                >
                  " Quote
                </button>
                <button
                  type="button"
                  onClick={insertCollapsibleSection}
                  class="hover:bg-surface1 touch-manipulation rounded px-2 py-1 text-xs select-none"
                  title="Insert Collapsible Section"
                >
                  ▼ Details
                </button>
                <div class="border-surface2 mx-1 border-l"></div>

                {/* Text Alignment */}
                <button
                  type="button"
                  onClick={() => {
                    instance().chain().focus().setTextAlign("left").run();
                    setEditorState((prev) => prev + 1);
                  }}
                  class={`${
                    isAlignActive("left") && "bg-surface2"
                  } touch-manipulation rounded px-2 py-1 text-xs select-none`}
                  title="Align Left"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => {
                    instance().chain().focus().setTextAlign("center").run();
                    setEditorState((prev) => prev + 1);
                  }}
                  class={`${
                    isAlignActive("center") && "bg-surface2"
                  } touch-manipulation rounded px-2 py-1 text-xs select-none`}
                  title="Align Center"
                >
                  ↔
                </button>
                <button
                  type="button"
                  onClick={() => {
                    instance().chain().focus().setTextAlign("right").run();
                    setEditorState((prev) => prev + 1);
                  }}
                  class={`${
                    isAlignActive("right") && "bg-surface2"
                  } touch-manipulation rounded px-2 py-1 text-xs select-none`}
                  title="Align Right"
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    instance().chain().focus().setTextAlign("justify").run();
                    setEditorState((prev) => prev + 1);
                  }}
                  class={`${
                    isAlignActive("justify") && "bg-surface2"
                  } touch-manipulation rounded px-2 py-1 text-xs select-none`}
                  title="Justify"
                >
                  ⇄
                </button>
                <div class="border-surface2 mx-1 border-l"></div>
                <button
                  type="button"
                  onClick={showLanguagePicker}
                  data-language-picker-trigger
                  class={`${
                    (showLanguageSelector() || isActive("codeBlock")) &&
                    "bg-surface2"
                  } touch-manipulation rounded px-2 py-1 text-xs select-none`}
                  title="Code Block"
                >
                  {"</>"}
                </button>
                <button
                  type="button"
                  onClick={setLink}
                  class={`${
                    isActive("link") && "bg-surface2"
                  } touch-manipulation rounded px-2 py-1 text-xs select-none`}
                  title="Add Link"
                >
                  🔗 Link
                </button>
                <button
                  type="button"
                  onClick={addImage}
                  class="touch-manipulation rounded px-2 py-1 text-xs select-none"
                  title="Add Image"
                >
                  🖼 Image
                </button>
                <button
                  type="button"
                  onClick={addIframe}
                  class="touch-manipulation rounded px-2 py-1 text-xs select-none"
                  title="Add Iframe"
                >
                  📺 Iframe
                </button>
                <button
                  type="button"
                  onClick={showTableInserter}
                  data-table-trigger
                  class={`${
                    (showTableMenu() || isActive("table")) && "bg-surface2"
                  } touch-manipulation rounded px-2 py-1 text-xs select-none`}
                  title="Insert Table"
                >
                  ⊞ Table
                </button>
                <button
                  type="button"
                  onClick={showMermaidSelector}
                  data-mermaid-trigger
                  class={`${
                    showMermaidTemplates() && "bg-surface2"
                  } touch-manipulation rounded px-2 py-1 text-xs select-none`}
                  title="Insert Diagram"
                >
                  📊 Diagram
                </button>
                <button
                  type="button"
                  onClick={showConditionalConfigurator}
                  data-conditional-trigger
                  class={`${
                    (showConditionalConfig() || isActive("conditionalBlock")) &&
                    "bg-surface2"
                  } rounded px-2 py-1 text-xs select-none`}
                  title="Insert Conditional Block"
                >
                  🔒 Conditional
                </button>
                <div class="border-surface2 mx-1 border-l"></div>
                <button
                  type="button"
                  onClick={() =>
                    instance().chain().focus().setHorizontalRule().run()
                  }
                  class="hover:bg-surface1 rounded px-3 py-1 text-xs"
                  title="Horizontal Rule"
                >
                  ━━ HR
                </button>
                <div class="border-surface2 mx-1 border-l"></div>

                {/* Undo/Redo buttons - critical for mobile */}
                <button
                  type="button"
                  onClick={() => instance().chain().focus().undo().run()}
                  disabled={!instance().can().undo()}
                  class="hover:bg-surface1 touch-manipulation rounded px-2 py-1 text-xs select-none disabled:cursor-not-allowed disabled:opacity-60"
                  title="Undo (Cmd/Ctrl+Z)"
                >
                  ↺
                </button>
                <button
                  type="button"
                  onClick={() => instance().chain().focus().redo().run()}
                  disabled={!instance().can().redo()}
                  class="hover:bg-surface1 touch-manipulation rounded px-2 py-1 text-xs select-none disabled:cursor-not-allowed disabled:opacity-60"
                  title="Redo (Cmd/Ctrl+Shift+Z)"
                >
                  ↻
                </button>
                <div class="border-surface2 mx-1 border-l"></div>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  class="hover:bg-surface1 touch-manipulation rounded px-2 py-1 text-xs select-none"
                  title={
                    isFullscreen()
                      ? "Exit Fullscreen (ESC)"
                      : "Enter Fullscreen"
                  }
                >
                  {isFullscreen() ? "⇲ Exit" : "⇱ Fullscreen"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowKeyboardHelp(!showKeyboardHelp())}
                  class="hover:bg-surface1 touch-manipulation rounded px-2 py-1 text-xs select-none"
                  title="Keyboard Shortcuts"
                >
                  ⌨ Help
                </button>

                {/* Table controls - shown when cursor is in a table */}
                <Show when={isActive("table")}>
                  <div class="border-surface2 mx-1 border-l"></div>

                  <button
                    type="button"
                    onClick={() =>
                      instance().chain().focus().addColumnBefore().run()
                    }
                    class="hover:bg-surface1 touch-manipulation rounded px-2 py-1 text-xs select-none"
                    title="Add Column Before"
                  >
                    ← Col
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      instance().chain().focus().addColumnAfter().run()
                    }
                    class="hover:bg-surface1 touch-manipulation rounded px-2 py-1 text-xs select-none"
                    title="Add Column After"
                  >
                    Col →
                  </button>

                  <button
                    type="button"
                    onClick={deleteColumnWithConfirmation}
                    class="hover:bg-red bg-opacity-20 touch-manipulation rounded px-2 py-1 text-xs select-none"
                    title="Delete Column"
                  >
                    ✕ Col
                  </button>

                  <div class="border-surface2 mx-1 border-l"></div>

                  <button
                    type="button"
                    onClick={() =>
                      instance().chain().focus().addRowBefore().run()
                    }
                    class="hover:bg-surface1 touch-manipulation rounded px-2 py-1 text-xs select-none"
                    title="Add Row Before"
                  >
                    ↑ Row
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      instance().chain().focus().addRowAfter().run()
                    }
                    class="hover:bg-surface1 touch-manipulation rounded px-2 py-1 text-xs select-none"
                    title="Add Row After"
                  >
                    Row ↓
                  </button>

                  <button
                    type="button"
                    onClick={deleteRowWithConfirmation}
                    class="hover:bg-red bg-opacity-20 touch-manipulation rounded px-2 py-1 text-xs select-none"
                    title="Delete Row"
                  >
                    ✕ Row
                  </button>

                  <div class="border-surface2 mx-1 border-l"></div>

                  <button
                    type="button"
                    onClick={deleteTableWithConfirmation}
                    class="hover:bg-red touch-manipulation rounded px-2 py-1 text-xs select-none"
                    title="Delete Table"
                  >
                    ✕ Table
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      instance().chain().focus().toggleHeaderRow().run()
                    }
                    class={`${
                      isActive("tableHeader")
                        ? "bg-surface2"
                        : "hover:bg-surface1"
                    } touch-manipulation rounded px-2 py-1 text-xs select-none`}
                    title="Toggle Header Row"
                  >
                    ≡ Header
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      instance().chain().focus().mergeCells().run()
                    }
                    class="hover:bg-surface1 touch-manipulation rounded px-2 py-1 text-xs select-none"
                    title="Merge Cells"
                  >
                    ⊡ Merge
                  </button>

                  <button
                    type="button"
                    onClick={() => instance().chain().focus().splitCell().run()}
                    class="hover:bg-surface1 touch-manipulation rounded px-2 py-1 text-xs select-none"
                    title="Split Cell"
                  >
                    ⊞ Split
                  </button>
                </Show>
              </div>
            </div>
          </>
        )}
      </Show>

      <div
        ref={editorRef}
        class="prose prose-sm prose-invert sm:prose-base md:prose-xl lg:prose-xl xl:prose-2xl mx-auto max-w-full transition-all duration-300 focus:outline-none"
        classList={{
          "h-[80dvh] overflow-scroll": !isFullscreen(),
          "flex-1 h-full overflow-y-auto": isFullscreen()
        }}
        style={{
          "padding-bottom": keyboardVisible() ? `${keyboardHeight()}px` : "1rem"
        }}
      />

      {/* Keyboard Help Modal */}
      <Show when={showKeyboardHelp()}>
        <div
          class="bg-opacity-50 fixed inset-0 z-110 flex items-center justify-center bg-black"
          onClick={() => setShowKeyboardHelp(false)}
        >
          <div
            class="bg-base border-surface2 max-h-[80dvh] w-full max-w-2xl overflow-y-auto rounded-lg border p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div class="mb-6 flex items-center justify-between">
              <h2 class="text-text text-2xl font-bold">Keyboard Shortcuts</h2>
              <button
                type="button"
                onClick={() => setShowKeyboardHelp(false)}
                class="hover:bg-surface1 text-subtext0 rounded p-2 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Shortcuts Grid */}
            <div class="space-y-6">
              <For each={KEYBOARD_SHORTCUTS}>
                {(category) => (
                  <div>
                    <h3 class="text-blue mb-3 text-lg font-semibold">
                      {category.name}
                    </h3>
                    <div class="space-y-2">
                      <For each={category.shortcuts}>
                        {(shortcut) => (
                          <div class="flex items-center justify-between">
                            <span class="text-text">
                              {shortcut.description}
                            </span>
                            <kbd class="bg-surface0 border-surface2 text-subtext0 rounded border px-3 py-1 font-mono text-sm">
                              {isMac()
                                ? shortcut.keys
                                : shortcut.keysAlt || shortcut.keys}
                            </kbd>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                )}
              </For>
            </div>

            {/* Footer */}
            <div class="text-subtext0 border-surface2 mt-6 border-t pt-4 text-center text-sm">
              Press <span class="text-text font-semibold">⌨ Help</span> button
              to toggle this help
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
