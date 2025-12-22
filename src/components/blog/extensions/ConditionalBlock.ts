import { Node, mergeAttributes } from "@tiptap/core";

export interface ConditionalBlockOptions {
  HTMLAttributes: Record<string, any>;
}

export interface ConditionalBlockAttributes {
  conditionType: "auth" | "privilege" | "date" | "feature" | "env";
  conditionValue: string;
  showWhen: "true" | "false";
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    conditionalBlock: {
      setConditionalBlock: (
        attributes: ConditionalBlockAttributes
      ) => ReturnType;
      updateConditionalBlock: (
        attributes: Partial<ConditionalBlockAttributes>
      ) => ReturnType;
      removeConditionalBlock: () => ReturnType;
    };
  }
}

export const ConditionalBlock = Node.create<ConditionalBlockOptions>({
  name: "conditionalBlock",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: "conditional-block"
      }
    };
  },

  addAttributes() {
    return {
      conditionType: {
        default: "auth",
        parseHTML: (element) => element.getAttribute("data-condition-type"),
        renderHTML: (attributes) => ({
          "data-condition-type": attributes.conditionType
        })
      },
      conditionValue: {
        default: "authenticated",
        parseHTML: (element) => element.getAttribute("data-condition-value"),
        renderHTML: (attributes) => ({
          "data-condition-value": attributes.conditionValue
        })
      },
      showWhen: {
        default: "true",
        parseHTML: (element) => element.getAttribute("data-show-when"),
        renderHTML: (attributes) => ({
          "data-show-when": attributes.showWhen
        })
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: "div.conditional-block[data-condition-type]"
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      ["div", { class: "conditional-content" }, 0]
    ];
  },

  addCommands() {
    return {
      setConditionalBlock:
        (attributes) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, attributes);
        },
      updateConditionalBlock:
        (attributes) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, attributes);
        },
      removeConditionalBlock:
        () =>
        ({ commands }) => {
          return commands.lift(this.name);
        }
    };
  }
});
