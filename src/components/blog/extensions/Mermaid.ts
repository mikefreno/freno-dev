import { Node, mergeAttributes } from "@tiptap/core";

export const Mermaid = Node.create({
  name: "mermaid",
  group: "block",
  content: "text*",
  marks: "",
  code: true,

  addAttributes() {
    return {
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
      {
        tag: 'pre[data-type="mermaid"]'
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "pre",
      mergeAttributes(HTMLAttributes, {
        "data-type": "mermaid",
        class: "mermaid-diagram"
      }),
      ["code", 0]
    ];
  },

  addCommands() {
    return {
      setMermaid:
        (content: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            content: [{ type: "text", text: content }]
          });
        }
    };
  }
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mermaid: {
      setMermaid: (content: string) => ReturnType;
    };
  }
}
