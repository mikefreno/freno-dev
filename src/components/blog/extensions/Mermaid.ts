import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export const Mermaid = Node.create({
  name: "mermaid",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      content: {
        default: "",
        parseHTML: (element) => {
          // Try to get code element
          const code = element.querySelector("code");
          if (code) {
            // Get text content, which strips out all HTML tags (including spans from syntax highlighting)
            return code.textContent || "";
          }
          // Fallback to element's own text content
          return element.textContent || "";
        },
        renderHTML: (attributes) => {
          return {};
        }
      },
      language: {
        default: "mermaid",
        parseHTML: (element) => element.getAttribute("data-language"),
        renderHTML: (attributes) => {
          return {
            "data-language": attributes.language
          };
        }
      }
    };
  },

  parseHTML() {
    return [
      // Priority 1: Pre with explicit mermaid marker (from our own rendering)
      {
        tag: 'pre[data-mermaid-diagram="true"]',
        priority: 100
      },
      // Priority 2: Pre with data-type="mermaid"
      {
        tag: 'pre[data-type="mermaid"]',
        priority: 90
      },
      // Priority 3: Wrapper div (from NodeView)
      {
        tag: "div.mermaid-node-wrapper",
        priority: 80,
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          const pre = element.querySelector('pre[data-type="mermaid"]');
          if (!pre) return false;
          const code = pre.querySelector("code");
          return {
            content: code?.textContent || ""
          };
        }
      },
      // Priority 4: Generic pre blocks that look like mermaid (fallback for legacy content)
      {
        tag: "pre",
        priority: 51, // Higher than code block extension
        getAttrs: (element) => {
          if (typeof element === "string") return false;

          // Skip if already has data-type or data-mermaid-diagram attribute
          if (
            element.hasAttribute("data-type") ||
            element.hasAttribute("data-mermaid-diagram")
          ) {
            return false;
          }

          const code = element.querySelector("code");
          if (!code) return false;

          const content = code.textContent || "";
          const trimmedContent = content.trim();

          // Check if this looks like a mermaid diagram
          const mermaidKeywords = [
            "graph ",
            "sequenceDiagram",
            "classDiagram",
            "stateDiagram",
            "erDiagram",
            "gantt",
            "pie ",
            "journey",
            "gitGraph",
            "flowchart ",
            "mindmap",
            "timeline",
            "quadrantChart",
            "requirementDiagram",
            "C4Context"
          ];

          const isMermaid = mermaidKeywords.some((keyword) =>
            trimmedContent.startsWith(keyword)
          );

          if (isMermaid) {
            return {
              content: trimmedContent
            };
          }

          return false;
        }
      }
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "pre",
      mergeAttributes(HTMLAttributes, {
        "data-type": "mermaid",
        "data-mermaid-diagram": "true", // Clear marker for parsing from DB
        class: "mermaid-diagram"
      }),
      ["code", {}, node.attrs.content || ""]
    ];
  },

  addCommands() {
    return {
      setMermaid:
        (content: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { content }
          });
        },
      updateMermaid:
        (content: string) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const node = selection.$anchor.parent;

          if (node.type.name === this.name) {
            if (dispatch) {
              tr.setNodeMarkup(selection.$anchor.before(), undefined, {
                ...node.attrs,
                content
              });
            }
            return true;
          }
          return false;
        }
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement("div");
      dom.className = "mermaid-node-wrapper relative group";

      const pre = document.createElement("pre");
      pre.setAttribute("data-type", "mermaid");
      pre.setAttribute("data-mermaid-diagram", "true"); // Clear marker
      pre.className = "mermaid-diagram";

      const code = document.createElement("code");
      code.textContent = node.attrs.content || "";
      pre.appendChild(code);

      // Validation status indicator
      const statusIndicator = document.createElement("div");
      statusIndicator.className =
        "absolute top-2 left-2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200";

      // Validate syntax asynchronously
      const validateSyntax = async () => {
        const content = node.attrs.content || "";
        if (!content.trim()) {
          statusIndicator.className =
            "absolute top-2 left-2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200";
          return;
        }

        try {
          // Dynamic import to avoid bundling issues
          const mermaid = (await import("mermaid")).default;
          await mermaid.parse(content);
          // Valid - green indicator
          statusIndicator.className =
            "absolute top-2 left-2 w-3 h-3 rounded-full bg-green opacity-0 group-hover:opacity-100 transition-opacity duration-200";
          statusIndicator.title = "Valid mermaid syntax";
        } catch (err) {
          // Invalid - red indicator
          statusIndicator.className =
            "absolute top-2 left-2 w-3 h-3 rounded-full bg-red opacity-0 group-hover:opacity-100 transition-opacity duration-200";
          statusIndicator.title = `Invalid syntax: ${
            (err as any).message || "Parse error"
          }`;
        }
      };

      // Run validation
      validateSyntax();

      // Edit button overlay
      const editBtn = document.createElement("button");
      editBtn.className =
        "absolute top-2 right-2 bg-blue text-white px-3 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10";
      editBtn.textContent = "Edit Diagram";
      editBtn.contentEditable = "false";

      editBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Emit custom event to open modal
        const pos = typeof getPos === "function" ? getPos() : 0;
        const event = new CustomEvent("edit-mermaid", {
          detail: { content: node.attrs.content, pos }
        });
        editor.view.dom.dispatchEvent(event);
      });

      dom.appendChild(pre);
      dom.appendChild(statusIndicator);
      dom.appendChild(editBtn);

      return {
        dom,
        contentDOM: undefined,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) {
            return false;
          }
          code.textContent = updatedNode.attrs.content || "";
          // Re-validate on update
          validateSyntax();
          return true;
        }
      };
    };
  }
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mermaid: {
      setMermaid: (content: string) => ReturnType;
      updateMermaid: (content: string) => ReturnType;
    };
  }
}
