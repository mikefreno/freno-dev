import { Show, onMount, onCleanup, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
import Xmark from "~/components/icons/Xmark";

export interface ModalProps {
  /** Controls modal visibility */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title (optional) */
  title?: string | JSX.Element;
  /** Modal content */
  children: JSX.Element;
  /** Action buttons (optional) */
  actions?: JSX.Element;
  /** Additional CSS classes for modal container */
  class?: string;
}

export default function Modal(props: ModalProps) {
  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onClose();
    }
  };

  const handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      props.onClose();
    }
  };

  onMount(() => {
    if (props.open && typeof document !== "undefined") {
      document.addEventListener("keydown", handleEscapeKey);
    }
  });

  onCleanup(() => {
    if (typeof document !== "undefined") {
      document.removeEventListener("keydown", handleEscapeKey);
    }
  });

  return (
    <Show when={props.open}>
      <Portal>
        <div
          class="fixed inset-0 z-500 flex items-center justify-center bg-black/50"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
        >
          <div
            class={`bg-base fade-in relative mx-4 max-w-md rounded-md px-8 py-4 shadow-lg ${props.class || ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              class="absolute top-4 right-4"
              onClick={props.onClose}
              aria-label="Close modal"
            >
              <Xmark
                strokeWidth={0.5}
                color="var(--color-text)"
                height={50}
                width={50}
              />
            </button>

            <Show when={props.title}>
              <div class="py-4 text-center text-3xl tracking-wide">
                {props.title}
              </div>
            </Show>

            <div class="modal-content">{props.children}</div>

            <Show when={props.actions}>
              <div class="modal-actions">{props.actions}</div>
            </Show>
          </div>
        </div>
      </Portal>
    </Show>
  );
}

export { Modal };
