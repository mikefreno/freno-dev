import { createSignal, Show } from "solid-js";
import type { EditCommentModalProps } from "~/types/comment";
import Xmark from "~/components/icons/Xmark";

export default function EditCommentModal(props: EditCommentModalProps) {
  let bodyRef: HTMLTextAreaElement | undefined;
  const [showNoChange, setShowNoChange] = createSignal(false);

  const editCommentWrapper = (e: SubmitEvent) => {
    e.preventDefault();
    if (
      bodyRef &&
      bodyRef.value.length > 0 &&
      bodyRef.value !== props.commentBody
    ) {
      setShowNoChange(false);
      props.editComment(bodyRef.value, props.commentID);
    } else {
      setShowNoChange(true);
    }
  };

  return (
    <div class="flex justify-center">
      <div class="fixed top-48 h-fit w-11/12 sm:w-4/5 md:w-2/3">
        <div
          id="edit_prompt"
          class="fade-in z-50 rounded-md bg-zinc-600 px-8 py-4 shadow-lg dark:bg-zinc-800"
        >
          <button class="absolute right-4" onClick={() => {}}>
            <Xmark strokeWidth={0.5} color="white" height={50} width={50} />
          </button>
          <div class="py-4 text-center text-3xl tracking-wide text-zinc-50">
            Edit Comment
          </div>
          <form onSubmit={editCommentWrapper}>
            <div class="textarea-group home">
              <textarea
                required
                ref={bodyRef}
                placeholder=" "
                value={props.commentBody}
                class="underlinedInput w-full bg-transparent text-blue-300"
                rows={4}
              />
              <span class="bar" />
              <label class="underlinedInputLabel">Edit Comment</label>
            </div>
            <div class="flex justify-end pt-2">
              <button
                type="submit"
                disabled={props.editCommentLoading}
                class={`${
                  props.editCommentLoading ? "bg-zinc-400" : ""
                } rounded border px-4 py-2 text-white shadow-md transition-all duration-300 ease-in-out hover:border-blue-500 hover:bg-blue-400 active:scale-90`}
              >
                Submit
              </button>
            </div>
          </form>
          <Show when={showNoChange()}>
            <div class="text-center text-red-500 italic">
              No change detected
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
}
