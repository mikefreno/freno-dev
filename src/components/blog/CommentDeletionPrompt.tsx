import { createSignal, Show } from "solid-js";
import type { CommentDeletionPromptProps, DeletionType } from "~/types/comment";
import UserDefaultImage from "~/components/icons/UserDefaultImage";
import Xmark from "~/components/icons/Xmark";

export default function CommentDeletionPrompt(
  props: CommentDeletionPromptProps
) {
  const [normalDeleteChecked, setNormalDeleteChecked] = createSignal(false);
  const [adminDeleteChecked, setAdminDeleteChecked] = createSignal(false);
  const [fullDeleteChecked, setFullDeleteChecked] = createSignal(false);

  const handleNormalDeleteCheckbox = () => {
    setNormalDeleteChecked(!normalDeleteChecked());
    setFullDeleteChecked(false);
    setAdminDeleteChecked(false);
  };

  const handleAdminDeleteCheckbox = () => {
    setAdminDeleteChecked(!adminDeleteChecked());
    setFullDeleteChecked(false);
    setNormalDeleteChecked(false);
  };

  const handleFullDeleteCheckbox = () => {
    setFullDeleteChecked(!fullDeleteChecked());
    setNormalDeleteChecked(false);
    setAdminDeleteChecked(false);
  };

  const deletionWrapper = () => {
    let deleteType: DeletionType = "user";
    if (normalDeleteChecked()) {
      deleteType = "user";
    } else if (adminDeleteChecked()) {
      deleteType = "admin";
    } else if (fullDeleteChecked()) {
      deleteType = "database";
    }
    console.log("[CommentDeletionPrompt] Calling deleteComment:", {
      commentID: props.commentID,
      commenterID: props.commenterID,
      deleteType
    });
    props.deleteComment(props.commentID, props.commenterID, deleteType);
  };

  const isDeleteEnabled = () =>
    normalDeleteChecked() || adminDeleteChecked() || fullDeleteChecked();

  return (
    <div class="flex justify-center">
      <div class="fixed top-48 z-100 h-fit">
        <div
          id="delete_prompt"
          class="fade-in bg-red rounded-md px-8 py-4 shadow-lg brightness-110"
        >
          <button class="absolute right-4" onClick={() => {}}>
            <Xmark strokeWidth={0.5} color="white" height={50} width={50} />
          </button>
          <div class="py-4 text-center text-3xl tracking-wide">
            Comment Deletion
          </div>
          <div class="bg-surface0 mx-auto w-3/4 rounded px-6 py-4">
            <div class="flex overflow-x-auto overflow-y-hidden select-text">
              {/* Comment body will be passed as prop */}
            </div>
            <div class="my-2 flex pl-2">
              <Show
                when={props.commenterImage}
                fallback={
                  <UserDefaultImage strokeWidth={1} height={24} width={24} />
                }
              >
                <img
                  src={props.commenterImage}
                  height={24}
                  width={24}
                  alt="user-image"
                  class="h-6 w-6 rounded-full object-cover object-center"
                />
              </Show>
              <div class="px-1">
                {props.commenterDisplayName ||
                  props.commenterEmail ||
                  "[removed]"}
              </div>
            </div>
          </div>
          <div class="flex w-full justify-center">
            <div class="flex pt-4">
              <input
                type="checkbox"
                class="my-auto"
                checked={normalDeleteChecked()}
                onChange={handleNormalDeleteCheckbox}
              />
              <div class="my-auto px-2 text-sm font-normal">
                {props.privilegeLevel === "admin"
                  ? "Confirm User Delete?"
                  : "Confirm Delete?"}
              </div>
            </div>
          </div>
          <Show when={props.privilegeLevel === "admin"}>
            <div class="flex w-full justify-center">
              <div class="flex pt-4">
                <input
                  type="checkbox"
                  class="my-auto"
                  checked={adminDeleteChecked()}
                  onChange={handleAdminDeleteCheckbox}
                />
                <div class="my-auto px-2 text-sm font-normal">
                  Confirm Admin Delete?
                </div>
              </div>
            </div>
            <div class="flex w-full justify-center">
              <div class="flex pt-4">
                <input
                  type="checkbox"
                  class="my-auto"
                  checked={fullDeleteChecked()}
                  onChange={handleFullDeleteCheckbox}
                />
                <div class="my-auto px-2 text-sm font-normal">
                  Confirm Full Delete (removal from database)?
                </div>
              </div>
            </div>
          </Show>
          <div class="flex w-full justify-center pt-2">
            <button
              type="button"
              onClick={deletionWrapper}
              disabled={props.commentDeletionLoading || !isDeleteEnabled()}
              class={`${
                props.commentDeletionLoading || !isDeleteEnabled()
                  ? "bg-surface2 opacity-50"
                  : "border-red bg-red hover:brightness-125"
              } rounded border px-4 py-2 text-base shadow-md transition-all duration-300 ease-in-out active:scale-90`}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
