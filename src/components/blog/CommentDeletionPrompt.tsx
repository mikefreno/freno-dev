import { createSignal, Show } from "solid-js";
import type { CommentDeletionPromptProps, DeletionType } from "~/types/comment";
import UserDefaultImage from "~/components/icons/UserDefaultImage";
import Modal from "~/components/ui/Modal";
import Button from "~/components/ui/Button";

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
    props.deleteComment(props.commentID, props.commenterID, deleteType);
  };

  const isDeleteEnabled = () =>
    normalDeleteChecked() || adminDeleteChecked() || fullDeleteChecked();

  return (
    <Modal
      open={props.isOpen}
      onClose={props.onClose}
      title="Comment Deletion"
      class="bg-crust brightness-110"
    >
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
            {props.commenterDisplayName || props.commenterEmail || "[removed]"}
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
            <div class="my-auto px-2 text-sm font-normal">Admin Delete?</div>
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
            <div class="my-auto px-2 text-sm font-normal">Database Delete?</div>
          </div>
        </div>
      </Show>
      <div class="flex w-full justify-center pt-2">
        <Button
          type="button"
          onClick={deletionWrapper}
          loading={props.commentDeletionLoading}
          disabled={!isDeleteEnabled()}
          variant="danger"
        >
          Delete
        </Button>
      </div>
    </Modal>
  );
}
