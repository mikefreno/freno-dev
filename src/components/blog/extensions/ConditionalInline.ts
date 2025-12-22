import { Mark, mergeAttributes } from "@tiptap/core";

export interface ConditionalInlineOptions {
  HTMLAttributes: Record<string, any>;
}

export interface ConditionalInlineAttributes {
  conditionType: "auth" | "privilege" | "date" | "feature" | "env";
  conditionValue: string;
  showWhen: "true" | "false";
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    conditionalInline: {
      setConditionalInline: (
        attributes: ConditionalInlineAttributes
      ) => ReturnType;
      toggleConditionalInline: (
        attributes: ConditionalInlineAttributes
      ) => ReturnType;
      unsetConditionalInline: () => ReturnType;
    };
  }
}

export const ConditionalInline = Mark.create<ConditionalInlineOptions>({
  name: "conditionalInline",
  priority: 1000,
  keepOnSplit: false,

  addOptions() {
    return {
      HTMLAttributes: {
        class: "conditional-inline"
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
        tag: "span.conditional-inline[data-condition-type]"
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0
    ];
  },

  addCommands() {
    return {
      setConditionalInline:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      toggleConditionalInline:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes);
        },
      unsetConditionalInline:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        }
    };
  }
});
