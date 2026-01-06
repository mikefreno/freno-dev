import { Show, type JSX } from "solid-js";

export interface FormFeedbackProps {
  type: "success" | "error";
  message: string | JSX.Element;
  show?: boolean;
  class?: string;
}

export default function FormFeedback(props: FormFeedbackProps) {
  const show = () => props.show ?? true;

  return (
    <Show when={show()}>
      <div
        class={`text-center text-sm ${
          props.type === "success" ? "text-green" : "text-red"
        } ${props.class || ""}`}
        role="alert"
      >
        {props.message}
      </div>
    </Show>
  );
}

export { FormFeedback };
