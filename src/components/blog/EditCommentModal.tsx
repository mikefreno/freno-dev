import { createSignal, Show } from "solid-js";
import type { EditCommentModalProps } from "~/types/comment";
import Modal from "~/components/ui/Modal";
import Button from "~/components/ui/Button";

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
    <Modal
      open={props.isOpen}
      onClose={props.onClose}
      title="Edit Comment"
      class="bg-crust w-11/12 max-w-none sm:w-4/5 md:w-2/3"
    >
      <form onSubmit={editCommentWrapper}>
        <div class="textarea-group home">
          <textarea
            required
            ref={bodyRef}
            placeholder=" "
            value={props.commentBody}
            class="underlinedInput text-blue w-full bg-transparent"
            rows={4}
          />
          <span class="bar" />
          <label class="underlinedInputLabel">Edit Comment</label>
        </div>
        <div class="flex justify-end pt-2">
          <Button
            type="submit"
            loading={props.editCommentLoading}
            variant="primary"
          >
            Submit
          </Button>
        </div>
      </form>
      <Show when={showNoChange()}>
        <div class="text-red text-center italic">No change detected</div>
      </Show>
    </Modal>
  );
}
