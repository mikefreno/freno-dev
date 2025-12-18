import { createEffect } from "solid-js";
import type { CommentInputBlockProps } from "~/types/comment";

export default function CommentInputBlock(props: CommentInputBlockProps) {
  let bodyRef: HTMLTextAreaElement | undefined;

  // Clear the textarea when comment is submitted
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
        <div class="h-fit w-3/4 md:w-1/2">
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
              <button
                type="submit"
                disabled={props.commentSubmitLoading}
                class={`${
                  props.commentSubmitLoading
                    ? "bg-zinc-400"
                    : "border-orange-500 bg-orange-400 hover:bg-orange-500"
                } rounded border px-4 py-2 font-light text-white shadow-md transition-all duration-300 ease-in-out active:scale-90`}
              >
                Submit
              </button>
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
