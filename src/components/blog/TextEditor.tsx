import { Show, untrack, createEffect, on, createSignal, For } from "solid-js";
import { useSearchParams, useNavigate } from "@solidjs/router";
import { api } from "~/lib/api";
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
  },
  {
    name: "AI Autocomplete (Admin)",
    shortcuts: [
      {
        keys: "⌘ Space",
        keysAlt: "Ctrl Space",
        description: "Trigger AI suggestion"
      },
      { keys: "→", keysAlt: "Right", description: "Accept word" },
      { keys: "⌥ Tab", keysAlt: "Alt Tab", description: "Accept line" },
      { keys: "⇧ Tab", keysAlt: "Shift Tab", description: "Accept full" },
      { keys: "ESC", keysAlt: "ESC", description: "Cancel suggestion" },
      {
        keys: "Swipe →",
        keysAlt: "Swipe →",
        description: "Accept full (mobile fullscreen)"
      }
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
const CONTEXT_SIZE = 512; // Characters before/after cursor for context for llm infill
const SWIPE_THRESHOLD = 100; // Swipe distance threshold in pixels (matches app.tsx)

// Custom Reference mark extension
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

// Suggestion decoration extension - shows inline AI suggestions
const SuggestionDecoration = Extension.create({
  name: "suggestionDecoration",

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: new PluginKey("suggestionDecoration"),
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldSet, oldState, newState) {
            // Get suggestion and loading state from editor storage
            const storage = (editor.storage as any).suggestionDecoration || {};
            const suggestion = storage.text || "";
            const isLoading = storage.isLoading || false;

            const { selection } = newState;
            const pos = selection.$anchor.pos;
            const decorations = [];

            // Show loading spinner inline if loading
            if (isLoading) {
              const loadingDecoration = Decoration.widget(
                pos,
                () => {
                  const span = document.createElement("span");
                  span.className = "inline-flex items-center ml-1";
                  span.style.pointerEvents = "none";

                  // Create a simple spinner using CSS animation
                  const spinner = document.createElement("span");
                  spinner.className =
                    "inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin";
                  spinner.style.color = "rgb(239, 68, 68)"; // Tailwind red-500
                  spinner.style.opacity = "0.5";

                  span.appendChild(spinner);
                  return span;
                },
                {
                  side: 1 // Place after the cursor
                }
              );
              decorations.push(loadingDecoration);
            }

            // Show suggestion text if present
            if (suggestion) {
              const suggestionDecoration = Decoration.widget(
                pos,
                () => {
                  const span = document.createElement("span");
                  span.textContent = suggestion;
                  span.style.color = "rgb(239, 68, 68)"; // Tailwind red-500
                  span.style.opacity = "0.5";
                  span.style.fontStyle = "italic";
                  span.style.fontFamily = "monospace";
                  span.style.pointerEvents = "none";
                  span.style.whiteSpace = "pre-wrap";
                  span.style.wordWrap = "break-word";
                  return span;
                },
                {
                  side: 1 // Place after the cursor
                }
              );
              decorations.push(suggestionDecoration);
            }

            if (decorations.length === 0) {
              return DecorationSet.empty;
            }

            return DecorationSet.create(newState.doc, decorations);
          }
        },
        props: {
          decorations(state) {
            return this.getState(state);
          }
        }
      })
    ];
  },

  addStorage() {
    return {
      text: "",
      isLoading: false
    };
  }
});

// Custom Reference mark extension
import { Mark, mergeAttributes } from "@tiptap/core";
import { Spinner } from "../Spinner";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    reference: {
      setReference: (options: { refId: string; refNum: number }) => ReturnType;
      updateReferenceNumber: (refId: string, newNum: number) => ReturnType;
    };
    referenceSectionMarker: {
      setReferenceSectionMarker: (heading: string) => ReturnType;
    };
  }
}

const Reference = Mark.create({
  name: "reference",

  addOptions() {
    return {
      HTMLAttributes: {}
    };
  },

  addAttributes() {
    return {
      refId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-ref-id"),
        renderHTML: (attributes) => {
          if (!attributes.refId) {
            return {};
          }
          return {
            "data-ref-id": attributes.refId
          };
        }
      },
      refNum: {
        default: 1,
        parseHTML: (element) => {
          const text = element.textContent || "";
          const match = text.match(/^\[(\d+)\]$/);
          return match ? parseInt(match[1]) : 1;
        }
      }
    };
  },

  // Exclude other marks (like links) from being applied to references
  excludes: "_",

  parseHTML() {
    return [
      {
        tag: "sup[data-ref-id]"
      },
      // Also parse legacy superscript references during HTML parsing
      {
        tag: "sup",
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          const text = element.textContent || "";
          const match = text.match(/^\[(\d+)\]$/);
          if (match && !element.getAttribute("data-ref-id")) {
            // This is a legacy reference - convert it
            return {
              refId: `ref-legacy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              refNum: parseInt(match[1])
            };
          }
          return false;
        }
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "sup",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0
    ];
  },

  addCommands() {
    return {
      setReference:
        (options: { refId: string; refNum: number }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: "text",
            text: `[${options.refNum}]`,
            marks: [
              {
                type: this.name,
                attrs: {
                  refId: options.refId,
                  refNum: options.refNum
                }
              }
            ]
          });
        },
      updateReferenceNumber:
        (refId: string, newNum: number) =>
        ({ tr, state, dispatch }) => {
          const { doc } = state;
          let found = false;

          doc.descendants((node, pos) => {
            if (node.isText && node.marks) {
              const refMark = node.marks.find(
                (mark) =>
                  mark.type.name === "reference" && mark.attrs.refId === refId
              );
              if (refMark) {
                if (dispatch) {
                  // Update both the mark attributes and the text content
                  const from = pos;
                  const to = pos + node.text.length;
                  const newMark = refMark.type.create({
                    refId: refId,
                    refNum: newNum
                  });

                  // Replace text and marks together
                  tr.replaceWith(
                    from,
                    to,
                    state.schema.text(`[${newNum}]`, [newMark])
                  );
                }
                found = true;
                return false;
              }
            }
          });

          return found;
        }
    };
  }
});

// Custom ReferenceSectionMarker node - invisible marker to identify references section
const ReferenceSectionMarker = Node.create({
  name: "referenceSectionMarker",
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,
  draggable: false,

  addAttributes() {
    return {
      heading: {
        default: "References",
        parseHTML: (element) =>
          element.getAttribute("data-heading") || "References",
        renderHTML: (attributes) => {
          return {
            "data-heading": attributes.heading
          };
        }
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[id='references-section-start']"
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        id: "references-section-start",
        style:
          "display: inline-flex; align-items: center; padding: 0.125rem 0.5rem; margin: 0 0.25rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600; font-family: system-ui, -apple-system, sans-serif; user-select: none; cursor: default; vertical-align: middle;",
        contenteditable: "false"
      }),
      "📌 References Section"
    ];
  },

  addCommands() {
    return {
      setReferenceSectionMarker:
        (heading: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { heading }
          });
        }
    };
  }
});

export interface TextEditorProps {
  updateContent: (content: string) => void;
  preSet?: string;
  postId?: number; // Optional: for persisting history to database
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

  // References section heading customization
  const [referencesHeading, setReferencesHeading] = createSignal(
    typeof window !== "undefined"
      ? localStorage.getItem("editor-references-heading") || "References"
      : "References"
  );

  // Persist heading changes to localStorage
  createEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("editor-references-heading", referencesHeading());
    }
  });

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

  // Search params and navigation for fullscreen persistence
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Initialize fullscreen from URL search param
  const [isFullscreen, setIsFullscreen] = createSignal(
    searchParams.fullscreen === "true"
  );
  const [keyboardVisible, setKeyboardVisible] = createSignal(false);
  const [keyboardHeight, setKeyboardHeight] = createSignal(0);

  // Undo Tree History (MVP - In-Memory + Database)
  interface HistoryNode {
    id: string; // Local UUID
    dbId?: number; // Database ID from PostHistory table
    content: string;
    timestamp: Date;
  }

  const [history, setHistory] = createSignal<HistoryNode[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] =
    createSignal<number>(-1);
  const [showHistoryModal, setShowHistoryModal] = createSignal(false);
  const [isLoadingHistory, setIsLoadingHistory] = createSignal(false);
  const MAX_HISTORY_SIZE = 100; // Match database pruning limit
  let historyDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isInitialLoad = true; // Flag to prevent capturing history on initial load
  let hasAttemptedHistoryLoad = false; // Flag to prevent repeated load attempts

  // LLM Infill state
  const [currentSuggestion, setCurrentSuggestion] = createSignal<string>("");
  const [isInfillLoading, setIsInfillLoading] = createSignal(false);
  const [infillConfig, setInfillConfig] = createSignal<{
    endpoint: string;
    token: string;
  } | null>(null);
  const [infillEnabled, setInfillEnabled] = createSignal(true); // Toggle for auto-suggestions
  let infillDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Touch gesture state for mobile AI suggestion acceptance
  let touchStartX = 0;
  let touchStartY = 0;

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

  // Fetch infill config on mount (admin-only)
  createEffect(async () => {
    try {
      const config = await api.infill.getConfig.query();
      if (config.endpoint && config.token) {
        setInfillConfig({ endpoint: config.endpoint, token: config.token });
      }
    } catch (error) {
      console.error("Failed to fetch infill config:", error);
    }
  });

  // Update suggestion: Store in editor and force view update
  createEffect(() => {
    const instance = editor();
    const suggestion = currentSuggestion();
    const loading = isInfillLoading();

    if (instance) {
      // Store suggestion and loading state in editor storage (cast to any to avoid TS error)
      (instance.storage as any).suggestionDecoration = {
        text: suggestion,
        isLoading: loading
      };
      // Force view update to show/hide decoration
      instance.view.dispatch(instance.state.tr);
    }
  });

  const requestInfill = async (): Promise<void> => {
    const config = infillConfig();
    if (!config) return;

    const context = getEditorContext();
    if (!context) return;

    setIsInfillLoading(true);

    try {
      // llama.cpp infill format
      const requestBody = {
        input_prefix: context.prefix,
        input_suffix: context.suffix,
        n_predict: 100,
        temperature: 0.3,
        stop: ["\n\n", "</s>", "<|endoftext|>"],
        stream: false
      };

      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Infill request failed: ${response.status}`);
      }

      const data = await response.json();

      // llama.cpp infill format returns { content: "..." }
      const suggestion = data.content || "";

      if (suggestion.trim()) {
        setCurrentSuggestion(suggestion.trim());
      }
    } catch (error) {
      console.error("Infill request failed:", error);
      setCurrentSuggestion("");
    } finally {
      setIsInfillLoading(false);
    }
  };

  // Helper to check if suggestion is active
  const hasSuggestion = () => currentSuggestion().length > 0;

  // Accept next word from suggestion
  const acceptWord = () => {
    const suggestion = currentSuggestion();
    if (!suggestion) return;

    // Take first word (split on whitespace)
    const words = suggestion.split(/\s+/);
    const firstWord = words[0] || "";

    const instance = editor();
    if (instance) {
      instance.commands.insertContent(firstWord + " ");
    }

    // Update suggestion to remaining text
    const remaining = words.slice(1).join(" ");
    setCurrentSuggestion(remaining);
  };

  // Accept current line from suggestion
  const acceptLine = () => {
    const suggestion = currentSuggestion();
    if (!suggestion) return;

    // Take up to first newline
    const lines = suggestion.split("\n");
    const firstLine = lines[0] || "";

    const instance = editor();
    if (instance) {
      instance.commands.insertContent(firstLine);
    }

    // Update suggestion to remaining text
    const remaining = lines.slice(1).join("\n");
    setCurrentSuggestion(remaining);
  };

  // Accept full suggestion
  const acceptFull = () => {
    const suggestion = currentSuggestion();
    if (!suggestion) return;

    const instance = editor();
    if (instance) {
      instance.commands.insertContent(suggestion);
    }

    setCurrentSuggestion("");
  };

  // Capture history snapshot
  const captureHistory = async (editorInstance: any) => {
    // Skip if initial load
    if (isInitialLoad) {
      return;
    }

    const content = editorInstance.getHTML();
    const currentHistory = history();
    const currentIndex = currentHistoryIndex();

    // Get previous content for diff creation
    const previousContent =
      currentIndex >= 0 ? currentHistory[currentIndex].content : "";

    // Skip if content hasn't changed
    if (content === previousContent) {
      return;
    }

    // Create new history node
    const newNode: HistoryNode = {
      id: crypto.randomUUID(),
      content,
      timestamp: new Date()
    };

    // If we're not at the end of history, truncate future history (linear history for MVP)
    const updatedHistory =
      currentIndex === currentHistory.length - 1
        ? [...currentHistory, newNode]
        : [...currentHistory.slice(0, currentIndex + 1), newNode];

    // Limit history size
    const limitedHistory =
      updatedHistory.length > MAX_HISTORY_SIZE
        ? updatedHistory.slice(updatedHistory.length - MAX_HISTORY_SIZE)
        : updatedHistory;

    setHistory(limitedHistory);
    setCurrentHistoryIndex(limitedHistory.length - 1);

    // Persist to database if postId is provided
    if (props.postId) {
      try {
        const parentHistoryId =
          currentIndex >= 0 && currentHistory[currentIndex]?.dbId
            ? currentHistory[currentIndex].dbId
            : null;

        const result = await api.postHistory.save.mutate({
          postId: props.postId,
          content,
          previousContent,
          parentHistoryId,
          isSaved: false
        });

        // Update the node with database ID
        if (result.success && result.historyId) {
          newNode.dbId = result.historyId;
          // Update history with dbId
          setHistory((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = newNode;
            return updated;
          });
        }
      } catch (error) {
        console.error("Failed to persist history to database:", error);
        // Continue anyway - we have in-memory history
      }
    }
  };

  // Parse UTC datetime string from SQLite to JavaScript Date
  // SQLite datetime('now') returns format: "YYYY-MM-DD HH:MM:SS" in UTC
  const parseUTCDateTime = (utcDateString: string): Date => {
    // SQLite returns datetime in format "YYYY-MM-DD HH:MM:SS"
    // We need to append 'Z' to indicate UTC, or convert to ISO format
    // Replace space with 'T' and append 'Z' for proper UTC parsing
    const isoString = utcDateString.replace(" ", "T") + "Z";
    return new Date(isoString);
  };

  // Format relative time for history display
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
    if (diffHour < 24)
      return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`;
    return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  };

  // Restore history to a specific point
  const restoreHistory = (index: number) => {
    const instance = editor();
    if (!instance) return;

    const node = history()[index];
    if (!node) return;

    // Get current content before changing
    const oldContent = instance.getHTML();

    // Set content without triggering history capture
    instance.commands.setContent(node.content, { emitUpdate: false });

    // Update current index
    setCurrentHistoryIndex(index);

    // Update parent content
    props.updateContent(node.content);

    // Close modal
    setShowHistoryModal(false);

    // Force UI update
    setEditorState((prev) => prev + 1);

    // Scroll to first change after a brief delay to allow content to render
    setTimeout(() => {
      scrollToFirstChange(instance, oldContent, node.content);
    }, 100);
  };

  // Find and scroll to the first difference between old and new content
  const scrollToFirstChange = (
    editorInstance: any,
    oldHTML: string,
    newHTML: string
  ) => {
    if (oldHTML === newHTML) return;

    // Convert HTML to plain text for comparison
    const oldText = editorInstance.state.doc.textContent;
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = oldHTML;
    const oldTextContent = tempDiv.textContent || "";

    // Find first character difference
    let firstDiffPos = 0;
    const minLength = Math.min(oldTextContent.length, oldText.length);

    for (let i = 0; i < minLength; i++) {
      if (oldTextContent[i] !== oldText[i]) {
        firstDiffPos = i;
        break;
      }
    }

    // If no character diff found but lengths differ, use the shorter length
    if (firstDiffPos === 0 && oldTextContent.length !== oldText.length) {
      firstDiffPos = minLength;
    }

    // Convert text position to ProseMirror position
    let currentTextPos = 0;
    let pmPos = 0;
    let found = false;

    editorInstance.state.doc.descendants((node: any, pos: number) => {
      if (found) return false;

      if (node.isText) {
        const nodeTextLength = node.text?.length || 0;
        if (currentTextPos + nodeTextLength >= firstDiffPos) {
          // Found the node containing the first change
          pmPos = pos + (firstDiffPos - currentTextPos);
          found = true;
          return false;
        }
        currentTextPos += nodeTextLength;
      }
    });

    if (pmPos > 0) {
      // Scroll to the position
      const coords = editorInstance.view.coordsAtPos(pmPos);
      const editorElement = editorInstance.view.dom as HTMLElement;
      const container = editorElement.closest(".overflow-y-auto");

      if (container && coords) {
        // Calculate scroll position (center the change in viewport)
        const containerRect = container.getBoundingClientRect();
        const scrollOffset =
          coords.top - containerRect.top - containerRect.height / 3;

        container.scrollBy({
          top: scrollOffset,
          behavior: "smooth"
        });
      }

      // Also set cursor to that position
      editorInstance.commands.focus();
      editorInstance.commands.setTextSelection(pmPos);

      // Flash highlight at the change position
      flashHighlight(editorInstance, pmPos);
    }
  };

  // Flash a highlight at a specific position
  const flashHighlight = (editorInstance: any, pos: number) => {
    const coords = editorInstance.view.coordsAtPos(pos);
    if (!coords) return;

    const editorElement = editorInstance.view.dom as HTMLElement;
    const container = editorElement.closest(".overflow-y-auto");
    if (!container) return;

    // Create highlight element
    const highlight = document.createElement("div");
    highlight.style.position = "absolute";
    highlight.style.left = `${coords.left}px`;
    highlight.style.top = `${coords.top}px`;
    highlight.style.width = "300px"; // Cover a good amount of text
    highlight.style.height = "1.5em";
    highlight.style.backgroundColor = "rgba(239, 68, 68, 0.3)"; // red-500 with opacity
    highlight.style.pointerEvents = "none";
    highlight.style.borderRadius = "4px";
    highlight.style.zIndex = "1000";
    highlight.style.transition = "opacity 0.6s ease-out";
    highlight.style.opacity = "1";

    // Position relative to the container
    const containerRect = container.getBoundingClientRect();
    const relativeTop = coords.top - containerRect.top + container.scrollTop;
    const relativeLeft =
      coords.left - containerRect.left + container.scrollLeft;

    highlight.style.left = `${relativeLeft}px`;
    highlight.style.top = `${relativeTop}px`;

    // Append to container
    const positionedContainer = container as HTMLElement;
    if (
      positionedContainer.style.position !== "relative" &&
      positionedContainer.style.position !== "absolute"
    ) {
      positionedContainer.style.position = "relative";
    }
    positionedContainer.appendChild(highlight);

    // Fade out and remove
    setTimeout(() => {
      highlight.style.opacity = "0";
    }, 100);

    setTimeout(() => {
      highlight.remove();
    }, 700);
  };

  // Load history from database
  const loadHistoryFromDB = async () => {
    if (!props.postId) return;

    setIsLoadingHistory(true);
    hasAttemptedHistoryLoad = true; // Mark that we've attempted to load
    try {
      console.log("[History] Loading from DB for postId:", props.postId);
      const dbHistory = await api.postHistory.getHistory.query({
        postId: props.postId
      });

      console.log("[History] DB returned entries:", dbHistory.length);
      if (dbHistory && dbHistory.length > 0) {
        console.log(
          "[History] First entry content length:",
          dbHistory[0].content.length
        );
        console.log(
          "[History] Last entry content length:",
          dbHistory[dbHistory.length - 1].content.length
        );

        // Convert database history to HistoryNode format with reconstructed content
        // Database stores timestamps in UTC, so we need to parse them correctly
        const historyNodes: HistoryNode[] = dbHistory.map((entry) => ({
          id: `db-${entry.id}`,
          dbId: entry.id,
          content: entry.content, // Full reconstructed content from diffs
          timestamp: parseUTCDateTime(entry.created_at) // Parse UTC timestamp
        }));

        setHistory(historyNodes);
        setCurrentHistoryIndex(historyNodes.length - 1);
        console.log(
          "[History] Loaded",
          historyNodes.length,
          "entries into memory"
        );
      } else {
        console.log("[History] No history found in DB");
      }
    } catch (error) {
      console.error("Failed to load history from database:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Extract editor context for LLM infill (CONTEXT_SIZE chars before/after cursor)
  const getEditorContext = (): {
    prefix: string;
    suffix: string;
    cursorPos: number;
  } | null => {
    const instance = editor();
    if (!instance) return null;

    const { state } = instance;
    const cursorPos = state.selection.$anchor.pos;

    // Convert ProseMirror position to text offset
    // We need to count actual text characters, not node positions
    let textOffset = 0;
    let reachedCursor = false;

    state.doc.descendants((node, pos) => {
      if (reachedCursor) return false; // Stop traversing

      if (node.isText) {
        const nodeEnd = pos + node.nodeSize;
        if (cursorPos <= nodeEnd) {
          // Cursor is within or right after this text node
          textOffset += Math.min(cursorPos - pos, node.text?.length || 0);
          reachedCursor = true;
          return false;
        }
        textOffset += node.text?.length || 0;
      }
    });

    const text = state.doc.textContent;
    if (text.length === 0) return null;

    const prefix = text.slice(
      Math.max(0, textOffset - CONTEXT_SIZE),
      textOffset
    );
    const suffix = text.slice(
      textOffset,
      Math.min(text.length, textOffset + CONTEXT_SIZE)
    );

    return {
      prefix,
      suffix,
      cursorPos: textOffset
    };
  };

  const editor = createTiptapEditor(() => ({
    element: editorRef,
    extensions: [
      StarterKit.configure({
        // Disable these since we're adding them separately with custom config
        codeBlock: false
      }),
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
      Subscript,
      SuggestionDecoration,
      Reference,
      ReferenceSectionMarker
    ],
    content: props.preSet || `<p><em><b>Hello!</b> World</em></p>`,
    onCreate: ({ editor }) => {
      // Migrate legacy references on initial load
      if (props.preSet) {
        setTimeout(() => {
          const doc = editor.state.doc;
          let refCount = 0;
          let legacyCount = 0;

          doc.descendants((node: any) => {
            if (node.isText && node.marks) {
              const refMark = node.marks.find(
                (mark: any) => mark.type.name === "reference"
              );
              if (refMark) {
                refCount++;
              }
              const superMark = node.marks.find(
                (mark: any) => mark.type.name === "superscript"
              );
              if (superMark && !refMark) {
                const match = node.text?.match(/^\[(\d+)\]$/);
                if (match) {
                  legacyCount++;
                }
              }
            }
          });

          if (legacyCount > 0) {
            migrateLegacyReferences(editor);
          }
        }, 100);
      }

      // CRITICAL FIX: Always set isInitialLoad to false after a delay
      // This ensures infill works regardless of how content was loaded
      setTimeout(() => {
        isInitialLoad = false;
      }, 1000);
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none"
      },
      handleKeyDown(view, event) {
        // Trigger infill: Ctrl+Space (or Cmd+Space)
        if ((event.ctrlKey || event.metaKey) && event.key === " ") {
          event.preventDefault();
          requestInfill();
          return true;
        }

        // Cancel suggestion: Escape
        if (event.key === "Escape" && hasSuggestion()) {
          event.preventDefault();
          setCurrentSuggestion("");
          return true;
        }

        // Accept word: Right Arrow (only when suggestion active)
        if (
          event.key === "ArrowRight" &&
          hasSuggestion() &&
          !event.shiftKey &&
          !event.ctrlKey &&
          !event.metaKey
        ) {
          event.preventDefault();
          acceptWord();
          return true;
        }

        // Accept line: Alt+Tab
        if (event.altKey && event.key === "Tab" && hasSuggestion()) {
          event.preventDefault();
          acceptLine();
          return true;
        }

        // Accept full: Shift+Tab
        if (
          event.shiftKey &&
          event.key === "Tab" &&
          hasSuggestion() &&
          !event.altKey
        ) {
          event.preventDefault();
          acceptFull();
          return true;
        }

        // Cmd/Ctrl+R for inserting reference
        if ((event.metaKey || event.ctrlKey) && event.key === "r") {
          event.preventDefault();
          insertReference();
          return true;
        }

        return false;
      },
      handleDOMEvents: {
        touchstart: (view, event) => {
          // Only handle touch events on mobile in fullscreen with active suggestion
          if (
            !hasSuggestion() ||
            !isFullscreen() ||
            typeof window === "undefined" ||
            window.innerWidth >= 768
          ) {
            return false;
          }

          touchStartX = event.touches[0].clientX;
          touchStartY = event.touches[0].clientY;
          return false;
        },
        touchend: (view, event) => {
          // Only handle touch events on mobile in fullscreen with active suggestion
          if (
            !hasSuggestion() ||
            !isFullscreen() ||
            typeof window === "undefined" ||
            window.innerWidth >= 768
          ) {
            return false;
          }

          const touchEndX = event.changedTouches[0].clientX;
          const touchEndY = event.changedTouches[0].clientY;
          const deltaX = touchEndX - touchStartX;
          const deltaY = touchEndY - touchStartY;

          // Check if horizontal swipe is dominant
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Swipe right - accept full suggestion
            if (deltaX > SWIPE_THRESHOLD) {
              event.preventDefault();
              acceptFull();
              return true;
            }
          }

          return false;
        }
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
        setTimeout(() => {
          renumberAllReferences(editor);
          updateReferencesSection(editor);
        }, 100);

        // Debounced history capture (capture after 2 seconds of inactivity)
        // Skip during initial load
        if (!isInitialLoad) {
          if (historyDebounceTimer) {
            clearTimeout(historyDebounceTimer);
          }
          historyDebounceTimer = setTimeout(() => {
            captureHistory(editor);
          }, 2000);
        }

        // Debounced infill trigger (250ms) - only if enabled and (desktop OR fullscreen mode)
        if (infillConfig() && !isInitialLoad && infillEnabled()) {
          const isMobileNotFullscreen =
            typeof window !== "undefined" &&
            window.innerWidth < 768 &&
            !isFullscreen();

          // Skip auto-infill on mobile when not in fullscreen
          if (!isMobileNotFullscreen) {
            if (infillDebounceTimer) {
              clearTimeout(infillDebounceTimer);
            }
            infillDebounceTimer = setTimeout(() => {
              requestInfill();
            }, 250);
          }
        }
      });
    },
    onSelectionUpdate: ({ editor }) => {
      // Clear suggestion when cursor moves (click/arrow keys without suggestion)
      if (currentSuggestion()) {
        setCurrentSuggestion("");
      }

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
      async (newContent) => {
        const instance = editor();

        if (instance && newContent) {
          const currentHTML = instance.getHTML();
          const contentMatches = currentHTML === newContent;

          if (!contentMatches) {
            console.log(
              "[History] Initial content load, postId:",
              props.postId
            );
            instance.commands.setContent(newContent, { emitUpdate: false });

            // Reset the load attempt flag when content changes
            hasAttemptedHistoryLoad = false;

            // Load history from database if postId is provided
            if (props.postId) {
              await loadHistoryFromDB();
              console.log(
                "[History] After load, history length:",
                history().length
              );
            }

            // Migrate legacy superscript references to Reference marks
            setTimeout(() => migrateLegacyReferences(instance), 50);

            // Capture initial state in history only if no history was loaded
            setTimeout(() => {
              if (history().length === 0) {
                console.log(
                  "[History] No history found, capturing initial state"
                );
                captureHistory(instance);
              } else {
                console.log(
                  "[History] Skipping initial capture, have",
                  history().length,
                  "entries"
                );
              }
              isInitialLoad = false;
            }, 200);
          } else {
            // Content already matches - this is the initial load case
            setTimeout(() => {
              isInitialLoad = false;
            }, 500);
          }
        }
      },
      { defer: true }
    )
  );

  // Load history when editor is ready (for edit mode)
  createEffect(() => {
    const instance = editor();
    if (
      instance &&
      props.postId &&
      history().length === 0 &&
      !isLoadingHistory() &&
      !hasAttemptedHistoryLoad // Only attempt once
    ) {
      console.log(
        "[History] Editor ready, loading history for postId:",
        props.postId
      );
      loadHistoryFromDB();
    }
  });

  const migrateLegacyReferences = (editorInstance: any) => {
    if (!editorInstance) return;

    const doc = editorInstance.state.doc;
    const legacyRefs: Array<{
      pos: number;
      num: number;
      textLength: number;
      hasOtherMarks: boolean;
    }> = [];
    const allSuperscriptNodes: Array<{
      pos: number;
      text: string;
      marks: any[];
    }> = [];

    // First pass: collect all text nodes with superscript
    doc.descendants((node: any, pos: number) => {
      if (node.isText && node.marks) {
        const hasReference = node.marks.some(
          (mark: any) => mark.type.name === "reference"
        );
        const hasSuperscript = node.marks.some(
          (mark: any) => mark.type.name === "superscript"
        );

        if (!hasReference && hasSuperscript) {
          allSuperscriptNodes.push({
            pos,
            text: node.text || "",
            marks: node.marks
          });
        }
      }
    });

    // Second pass: identify complete references (might be split)
    let i = 0;
    while (i < allSuperscriptNodes.length) {
      const node = allSuperscriptNodes[i];
      const text = node.text;

      // Check if this is a complete reference (with optional whitespace)
      const completeMatch = text.match(/^\s*\[(\d+)\]\s*$/);
      if (completeMatch) {
        const hasOtherMarks = node.marks.some(
          (mark: any) =>
            mark.type.name !== "superscript" && mark.type.name !== "reference"
        );
        legacyRefs.push({
          pos: node.pos,
          num: parseInt(completeMatch[1]),
          textLength: text.length,
          hasOtherMarks
        });
        i++;
        continue;
      }

      // Check if this might be the start of a split reference
      if (text === "[" && i + 2 < allSuperscriptNodes.length) {
        const nextNode = allSuperscriptNodes[i + 1];
        const afterNode = allSuperscriptNodes[i + 2];

        // Check if next nodes form [n]
        if (nextNode.text.match(/^\d+$/) && afterNode.text === "]") {
          const refNum = parseInt(nextNode.text);
          const totalLength =
            text.length + nextNode.text.length + afterNode.text.length;

          // We need to handle split references differently - remove all three nodes and create one
          legacyRefs.push({
            pos: node.pos,
            num: refNum,
            textLength: totalLength,
            hasOtherMarks: true // Treat split refs as having other marks
          });

          i += 3; // Skip the next two nodes
          continue;
        }
      }

      i++;
    }

    if (legacyRefs.length === 0) {
      return;
    }

    legacyRefs.sort((a, b) => b.pos - a.pos);

    const tr = editorInstance.state.tr;

    legacyRefs.forEach((ref) => {
      const refId = `ref-migrated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newMark = editorInstance.schema.marks.reference.create({
        refId: refId,
        refNum: ref.num
      });

      tr.replaceWith(
        ref.pos,
        ref.pos + ref.textLength,
        editorInstance.schema.text(`[${ref.num}]`, [newMark])
      );
    });

    editorInstance.view.dispatch(tr);
  };

  const renumberAllReferences = (editorInstance: any) => {
    if (!editorInstance) return;

    const doc = editorInstance.state.doc;
    const allRefs: Array<{
      pos: number;
      refId: string;
      refNum: number;
      textLength: number;
    }> = [];

    doc.descendants((node: any, pos: number) => {
      if (node.isText && node.marks) {
        const refMark = node.marks.find(
          (mark: any) => mark.type.name === "reference"
        );
        if (refMark) {
          allRefs.push({
            pos,
            refId: refMark.attrs.refId,
            refNum: refMark.attrs.refNum,
            textLength: node.text.length
          });
        }
      }
    });

    // Sort by position
    allRefs.sort((a, b) => a.pos - b.pos);

    // Check if renumbering is needed (if any ref doesn't match its expected number)
    let needsRenumbering = false;
    for (let i = 0; i < allRefs.length; i++) {
      if (allRefs[i].refNum !== i + 1) {
        needsRenumbering = true;
        break;
      }
    }

    if (!needsRenumbering) return;

    // Build a single transaction with all updates (from end to start to avoid position shifts)
    const tr = editorInstance.state.tr;

    for (let i = allRefs.length - 1; i >= 0; i--) {
      const correctNum = i + 1;
      const ref = allRefs[i];

      if (ref.refNum !== correctNum) {
        // Create updated mark
        const newMark = editorInstance.schema.marks.reference.create({
          refId: ref.refId,
          refNum: correctNum
        });

        // Replace the node with updated text and mark
        tr.replaceWith(
          ref.pos,
          ref.pos + ref.textLength,
          editorInstance.schema.text(`[${correctNum}]`, [newMark])
        );
      }
    }

    // Dispatch the single transaction with all changes
    editorInstance.view.dispatch(tr);
  };

  const updateReferencesSection = (editorInstance: any) => {
    if (!editorInstance) return;

    const doc = editorInstance.state.doc;
    const foundRefs = new Set<string>();

    doc.descendants((node: any) => {
      if (node.isText && node.marks) {
        // Look for both Reference marks (new) and superscript (legacy)
        const refMark = node.marks.find(
          (mark: any) => mark.type.name === "reference"
        );
        const hasSuperscript = node.marks.some(
          (mark: any) => mark.type.name === "superscript"
        );

        if (refMark) {
          // Use refNum from Reference mark
          foundRefs.add(refMark.attrs.refNum.toString());
        } else if (hasSuperscript) {
          // Fallback to legacy superscript pattern matching
          const text = node.text || "";
          const match = text.match(/^\[(.+?)\]$/);
          if (match) {
            foundRefs.add(match[1]);
          }
        }
      }
    });

    if (foundRefs.size === 0) {
      // No references found - remove the entire section if it exists
      let markerPos = -1;
      let hrPos = -1;
      let sectionEndPos = -1;

      doc.descendants((node: any, pos: number) => {
        // Find marker first
        if (node.type.name === "referenceSectionMarker") {
          markerPos = pos;
        }
        // Find HR before marker
        if (markerPos === -1 && node.type.name === "horizontalRule") {
          hrPos = pos;
        }
      });

      // Find the end of the references section
      if (markerPos >= 0) {
        let foundEnd = false;
        doc.descendants((node: any, pos: number) => {
          if (foundEnd || pos <= markerPos) return;

          // Section ends at next HR or H2 heading
          if (
            node.type.name === "horizontalRule" ||
            (node.type.name === "heading" && node.attrs.level <= 2)
          ) {
            sectionEndPos = pos;
            foundEnd = true;
          }
        });

        // If no end found, section goes to end of document
        if (!foundEnd) {
          sectionEndPos = doc.content.size;
        }
      }

      if (hrPos >= 0 && sectionEndPos > hrPos) {
        const tr = editorInstance.state.tr;
        tr.delete(hrPos, sectionEndPos);
        editorInstance.view.dispatch(tr);
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

    let markerPos = -1;
    let markerHeading = "";
    let referencesHeadingPos = -1;
    let sectionEndPos = -1;
    let existingRefs = new Map<
      string,
      { pos: number; isPlaceholder: boolean }
    >();

    // Look for the marker first
    doc.descendants((node: any, pos: number) => {
      if (node.type.name === "referenceSectionMarker") {
        markerPos = pos;
        markerHeading = node.attrs.heading || referencesHeading();
      }
      // If marker found, look for heading after it
      if (
        markerPos >= 0 &&
        referencesHeadingPos === -1 &&
        node.type.name === "heading" &&
        pos > markerPos &&
        pos < markerPos + 50
      ) {
        referencesHeadingPos = pos;
      }
      // Find section end (next HR or H2)
      if (
        referencesHeadingPos >= 0 &&
        sectionEndPos === -1 &&
        pos > referencesHeadingPos &&
        (node.type.name === "horizontalRule" ||
          (node.type.name === "heading" && node.attrs.level <= 2))
      ) {
        sectionEndPos = pos;
      }
      // Collect existing reference numbers within the section
      if (
        referencesHeadingPos >= 0 &&
        pos > referencesHeadingPos &&
        (sectionEndPos === -1 || pos < sectionEndPos) &&
        node.type.name === "paragraph"
      ) {
        const text = node.textContent;
        const match = text.match(/^\[(.+?)\]/);
        if (match) {
          const isPlaceholder = text.includes("Add your reference text here");
          existingRefs.set(match[1], { pos, isPlaceholder });
        }
      }
    });

    // If no section end found, it goes to document end
    if (referencesHeadingPos >= 0 && sectionEndPos === -1) {
      sectionEndPos = doc.content.size;
    }

    // Update marker heading if it changed
    if (markerPos >= 0 && markerHeading !== referencesHeading()) {
      const tr = editorInstance.state.tr;
      const markerNode = doc.nodeAt(markerPos);
      if (markerNode) {
        tr.replaceWith(
          markerPos,
          markerPos + markerNode.nodeSize,
          editorInstance.schema.nodes.referenceSectionMarker.create({
            heading: referencesHeading()
          })
        );
        editorInstance.view.dispatch(tr);
      }
    }

    // Update heading text if it changed
    if (referencesHeadingPos >= 0 && markerHeading !== referencesHeading()) {
      const tr = editorInstance.state.tr;
      const headingNode = doc.nodeAt(referencesHeadingPos);
      if (headingNode) {
        tr.replaceWith(
          referencesHeadingPos,
          referencesHeadingPos + headingNode.nodeSize,
          editorInstance.schema.nodes.heading.create(
            { level: 2 },
            editorInstance.schema.text(referencesHeading())
          )
        );
        editorInstance.view.dispatch(tr);
        return;
      }
    }

    // Create section if marker not found
    if (markerPos === -1) {
      const content: any[] = [
        { type: "horizontalRule" },
        {
          type: "paragraph",
          content: [
            {
              type: "referenceSectionMarker",
              attrs: { heading: referencesHeading() }
            }
          ]
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: referencesHeading() }]
        }
      ];

      // Add placeholder paragraphs for each reference
      refNumbers.forEach((refNum) => {
        content.push({
          type: "paragraph",
          content: [
            {
              type: "text",
              text: `[${refNum}] `,
              marks: [{ type: "bold" }]
            },
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
      return;
    }

    // Section exists - manage placeholders
    const tr = editorInstance.state.tr;
    let hasChanges = false;

    // Step 1: Remove placeholders for references that no longer exist
    const toDelete: Array<{ pos: number; nodeSize: number }> = [];
    existingRefs.forEach((info, refNum) => {
      if (info.isPlaceholder && !refNumbers.includes(refNum)) {
        const node = doc.nodeAt(info.pos);
        if (node) {
          toDelete.push({ pos: info.pos, nodeSize: node.nodeSize });
        }
      }
    });

    // Delete in reverse order to maintain positions
    toDelete
      .sort((a, b) => b.pos - a.pos)
      .forEach(({ pos, nodeSize }) => {
        tr.delete(pos, pos + nodeSize);
        hasChanges = true;
      });

    // Step 2: Add placeholders for new references in correct order
    if (referencesHeadingPos >= 0) {
      // For each missing reference, find the correct insertion position
      refNumbers.forEach((refNum) => {
        if (!existingRefs.has(refNum)) {
          const refNumInt = parseInt(refNum);
          let insertPos = referencesHeadingPos;
          const headingNode = doc.nodeAt(referencesHeadingPos);
          if (headingNode) {
            insertPos = referencesHeadingPos + headingNode.nodeSize;
          }

          // Find the last existing reference that comes before this one
          let foundInsertPos = false;
          existingRefs.forEach((info, existingRefNum) => {
            const existingRefNumInt = parseInt(existingRefNum);
            if (
              !isNaN(existingRefNumInt) &&
              !isNaN(refNumInt) &&
              existingRefNumInt < refNumInt
            ) {
              // This existing ref comes before the new one, insert after it
              const existingNode = doc.nodeAt(info.pos);
              if (
                existingNode &&
                info.pos + existingNode.nodeSize > insertPos
              ) {
                insertPos = info.pos + existingNode.nodeSize;
                foundInsertPos = true;
              }
            }
          });

          // If no existing reference comes before this one, but there are references after,
          // we've already set insertPos to right after heading which is correct
          // If this is larger than all existing refs, find the last one
          if (!foundInsertPos && existingRefs.size > 0) {
            let maxRefNum = -1;
            let maxRefPos = insertPos;
            existingRefs.forEach((info, existingRefNum) => {
              const existingRefNumInt = parseInt(existingRefNum);
              if (!isNaN(existingRefNumInt) && existingRefNumInt > maxRefNum) {
                maxRefNum = existingRefNumInt;
                maxRefPos = info.pos;
              }
            });

            if (maxRefNum >= 0 && refNumInt > maxRefNum) {
              // This new ref comes after all existing refs
              const maxNode = doc.nodeAt(maxRefPos);
              if (maxNode) {
                insertPos = maxRefPos + maxNode.nodeSize;
              }
            }
          }

          const nodeData = {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `[${refNum}] `,
                marks: [{ type: "bold" }]
              },
              {
                type: "text",
                text: "Add your reference text here"
              }
            ]
          };

          const node = editorInstance.schema.nodeFromJSON(nodeData);
          tr.insert(insertPos, node);

          // Update existingRefs map so subsequent inserts know about this one
          existingRefs.set(refNum, { pos: insertPos, isPlaceholder: true });

          hasChanges = true;
        }
      });
    }

    if (hasChanges) {
      editorInstance.view.dispatch(tr);
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

    const doc = instance.state.doc;
    const { from } = instance.state.selection;

    // Collect all existing references with their IDs and positions
    const refs: Array<{
      pos: number;
      refId: string;
      refNum: number;
      textLength: number;
      isLegacy: boolean;
    }> = [];

    doc.descendants((node: any, pos: number) => {
      if (node.isText && node.marks) {
        // Check for new Reference marks
        const refMark = node.marks.find(
          (mark: any) => mark.type.name === "reference"
        );
        if (refMark) {
          refs.push({
            pos,
            refId: refMark.attrs.refId,
            refNum: refMark.attrs.refNum,
            textLength: node.text.length,
            isLegacy: false
          });
        } else {
          // Check for legacy superscript references
          const hasSuperscript = node.marks.some(
            (mark: any) => mark.type.name === "superscript"
          );
          if (hasSuperscript) {
            const text = node.text || "";
            const match = text.match(/^\[(\d+)\]$/);
            if (match) {
              refs.push({
                pos,
                refId: `ref-legacy-${pos}`, // Temporary ID for legacy refs
                refNum: parseInt(match[1]),
                textLength: text.length,
                isLegacy: true
              });
            }
          }
        }
      }
    });

    // Sort by position in document
    refs.sort((a, b) => a.pos - b.pos);

    // Find where to insert (what number should this be?)
    let newRefNum = 1;
    let insertIndex = refs.length; // Default to end

    for (let i = 0; i < refs.length; i++) {
      if (from <= refs[i].pos) {
        newRefNum = i + 1;
        insertIndex = i;
        break;
      }
    }

    if (insertIndex === refs.length) {
      newRefNum = refs.length + 1;
    }

    // Generate unique ID for this reference
    const newRefId = `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Insert the new reference
    instance.commands.setReference({
      refId: newRefId,
      refNum: newRefNum
    });

    // Now renumber ALL references that come after the insertion point
    setTimeout(() => {
      const currentDoc = instance.state.doc;
      const allRefs: Array<{
        pos: number;
        refId: string;
        refNum: number;
        textLength: number;
        isLegacy: boolean;
      }> = [];

      currentDoc.descendants((node: any, pos: number) => {
        if (node.isText && node.marks) {
          // Check for new Reference marks
          const refMark = node.marks.find(
            (mark: any) => mark.type.name === "reference"
          );
          if (refMark) {
            allRefs.push({
              pos,
              refId: refMark.attrs.refId,
              refNum: refMark.attrs.refNum,
              textLength: node.text.length,
              isLegacy: false
            });
          } else {
            // Check for legacy superscript references
            const hasSuperscript = node.marks.some(
              (mark: any) => mark.type.name === "superscript"
            );
            if (hasSuperscript) {
              const text = node.text || "";
              const match = text.match(/^\[(\d+)\]$/);
              if (match) {
                allRefs.push({
                  pos,
                  refId: `ref-legacy-${pos}`,
                  refNum: parseInt(match[1]),
                  textLength: text.length,
                  isLegacy: true
                });
              }
            }
          }
        }
      });

      // Sort by position
      allRefs.sort((a, b) => a.pos - b.pos);

      // Build a single transaction with all updates (from end to start to avoid position shifts)
      const tr = instance.state.tr;
      let hasChanges = false;

      for (let i = allRefs.length - 1; i >= 0; i--) {
        const correctNum = i + 1;
        const ref = allRefs[i];

        if (ref.refNum !== correctNum) {
          if (ref.isLegacy) {
            // Convert legacy to Reference mark while renumbering
            const newRefId = `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`;
            const newMark = instance.schema.marks.reference.create({
              refId: newRefId,
              refNum: correctNum
            });
            tr.replaceWith(
              ref.pos,
              ref.pos + ref.textLength,
              instance.schema.text(`[${correctNum}]`, [newMark])
            );
          } else {
            // Update existing Reference mark
            const newMark = instance.schema.marks.reference.create({
              refId: ref.refId,
              refNum: correctNum
            });
            tr.replaceWith(
              ref.pos,
              ref.pos + ref.textLength,
              instance.schema.text(`[${correctNum}]`, [newMark])
            );
          }

          hasChanges = true;
        } else if (ref.isLegacy) {
          // Even if number is correct, convert legacy to Reference mark
          const newRefId = `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`;
          const newMark = instance.schema.marks.reference.create({
            refId: newRefId,
            refNum: correctNum
          });
          tr.replaceWith(
            ref.pos,
            ref.pos + ref.textLength,
            instance.schema.text(`[${correctNum}]`, [newMark])
          );
          hasChanges = true;
        }
      }

      // Dispatch the single transaction with all changes
      if (hasChanges) {
        instance.view.dispatch(tr);
      }

      // Update references section
      updateReferencesSection(instance);
    }, 10);
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

      const timeoutId = setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
      }, 0);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("click", handleClickOutside);
      };
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

      const timeoutId = setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
      }, 0);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("click", handleClickOutside);
      };
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

      const timeoutId = setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
      }, 0);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("click", handleClickOutside);
      };
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

      const timeoutId = setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
      }, 0);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("click", handleClickOutside);
      };
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
    const newFullscreenState = !isFullscreen();
    setIsFullscreen(newFullscreenState);

    // Update URL search param to persist state
    setSearchParams({ fullscreen: newFullscreenState ? "true" : undefined });
    const navigationElement = document.getElementById("navigation");
    if (navigationElement) {
      if (newFullscreenState) {
        navigationElement.classList.add("hidden");
      } else {
        navigationElement.classList.remove("hidden");
      }
    }
  };

  createEffect(() => {
    if (isFullscreen()) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setIsFullscreen(false);
          setSearchParams({ fullscreen: undefined });
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
                class="bg-crust text-text fixed z-120 w-fit rounded p-2 text-sm whitespace-nowrap shadow-xl"
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
                class="language-selector bg-mantle text-text border-surface2 fixed z-[120] max-h-64 w-48 overflow-y-auto rounded border shadow-lg"
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
                class="table-menu fixed z-[120]"
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
                class="mermaid-menu bg-mantle text-text border-surface2 fixed z-[120] max-h-96 w-56 overflow-y-auto rounded border shadow-lg"
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
                class="conditional-config fixed z-[120]"
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
                <button
                  type="button"
                  onClick={() => {
                    const newHeading = window.prompt(
                      "Enter heading for references section:",
                      referencesHeading()
                    );
                    if (newHeading && newHeading.trim()) {
                      setReferencesHeading(newHeading.trim());
                      // Update existing section if it exists
                      const instance = editor();
                      if (instance) {
                        updateReferencesSection(instance);
                      }
                    }
                  }}
                  class="hover:bg-surface1 touch-manipulation rounded px-2 py-1 text-xs select-none"
                  title={`Change references heading (current: "${referencesHeading()}")`}
                >
                  📑
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  class="hover:bg-surface1 touch-manipulation rounded px-2 py-1 text-xs select-none"
                  title={`View Document History (${history().length} snapshots)`}
                >
                  🕐
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

                {/* AI Autocomplete Toggle - shown when config available and (desktop OR fullscreen mode) */}
                <Show when={infillConfig()}>
                  <button
                    type="button"
                    onClick={() => {
                      setInfillEnabled(!infillEnabled());
                      // Clear any existing suggestion when disabled
                      if (!infillEnabled()) {
                        setCurrentSuggestion("");
                      }
                    }}
                    class={`${
                      infillEnabled()
                        ? "bg-blue text-base"
                        : "bg-surface1 text-subtext0"
                    } touch-manipulation rounded px-2 py-1 text-xs font-semibold transition-colors select-none`}
                    title={
                      infillEnabled()
                        ? typeof window !== "undefined" &&
                          window.innerWidth < 768
                          ? "AI Autocomplete: ON (swipe right to accept full)"
                          : "AI Autocomplete: ON (Ctrl/Cmd+Space to trigger manually)"
                        : "AI Autocomplete: OFF (Click to enable)"
                    }
                  >
                    {infillEnabled() ? "🤖 AI" : "🤖"}
                  </button>
                </Show>

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
        class="prose prose-sm prose-invert sm:prose-base md:prose-lg max-w-full transition-all duration-300 focus:outline-none md:px-8"
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
          class="bg-opacity-50 fixed inset-0 z-150 flex items-center justify-center bg-black"
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

      {/* History Modal */}
      <Show when={showHistoryModal()}>
        <div
          class="bg-opacity-50 fixed inset-0 z-150 flex items-center justify-center bg-black"
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            class="bg-base border-surface2 max-h-[80dvh] w-full max-w-2xl overflow-y-auto rounded-lg border p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div class="mb-6 flex items-center justify-between">
              <h2 class="text-text text-2xl font-bold">Document History</h2>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                class="hover:bg-surface1 text-subtext0 rounded p-2 text-xl"
              >
                ✕
              </button>
            </div>

            {/* History List */}
            <Show
              when={history().length > 0}
              fallback={
                <div class="text-subtext0 py-8 text-center">
                  No history available yet. Start editing to capture history.
                </div>
              }
            >
              <div class="space-y-2">
                <For each={[...history()].reverse()}>
                  {(node, index) => {
                    const correctIndex = history().length - 1 - index(); // Reverse index
                    const isCurrent = correctIndex === currentHistoryIndex();
                    return (
                      <div
                        class={`hover:bg-surface1 flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                          isCurrent
                            ? "border-blue bg-surface1"
                            : "border-surface2"
                        }`}
                        onClick={() => restoreHistory(correctIndex)}
                      >
                        <div class="flex items-center gap-3">
                          <span
                            class={`font-mono text-sm ${
                              isCurrent
                                ? "text-blue font-bold"
                                : "text-subtext0"
                            }`}
                          >
                            {isCurrent ? `>${index() + 1}<` : index() + 1}
                          </span>
                          <span class="text-text text-sm">
                            {formatRelativeTime(node.timestamp)}
                          </span>
                        </div>
                        <Show when={isCurrent}>
                          <span class="text-blue text-xs font-semibold">
                            CURRENT
                          </span>
                        </Show>
                      </div>
                    );
                  }}
                </For>
              </div>
            </Show>

            {/* Footer */}
            <div class="text-subtext0 border-surface2 mt-6 border-t pt-4 text-center text-sm">
              Click on any history item to restore that version
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
