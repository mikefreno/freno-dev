import { createEffect } from "solid-js";
import type { CommentInputBlockProps } from "~/types/comment";
import Button from "~/components/ui/Button";

export default function CommentInputBlock(props: CommentInputBlockProps) {
  let bodyRef: HTMLTextAreaElement | undefined;

  createEffect(() => {
    if (!props.commentSubmitLoading && bodyRef) {
      bodyRef.value = "";
    }
  });

  const newCommentWrapper = (e: SubmitEvent) => {
    e.preventDefault();
    if (bodyRef && bodyRef.value.length > 0) {
      props.newComment(bodyRef.value, props.parent_id);
    }
  };

  if (props.privilegeLevel === "user" || props.privilegeLevel === "admin") {
    return (
      <div class="flex w-full justify-center select-none">
        <div class="h-fit w-3/4">
          <form onSubmit={newCommentWrapper}>
            <div class="textarea-group blog">
              <textarea
                ref={bodyRef}
                required
                name="message"
                placeholder=" "
                class="underlinedInput w-full bg-transparent select-text"
                rows={props.isReply ? 2 : 4}
              />
              <span class="bar" />
              <label class="underlinedInputLabel">
                {`Enter your ${props.isReply ? "reply" : "message"}`}
              </label>
            </div>
            <div class="flex justify-end pt-2">
              <Button
                type="submit"
                loading={props.commentSubmitLoading}
                variant="primary"
              >
                Submit
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  } else {
    return (
      <div class="flex w-full justify-center">
        <div class="textarea-group blog">
          <textarea
            required
            disabled
            name="message"
            placeholder=" "
            class="underlinedInput w-full bg-transparent"
            rows={4}
          />
          <span class="bar" />
          <label class="underlinedInputLabel">
            {`You must be logged in to ${props.isReply ? "reply" : "comment"}`}
          </label>
        </div>
      </div>
    );
  }
}
