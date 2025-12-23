import { createSignal, Show } from "solid-js";
import { api } from "~/lib/api";
import TrashIcon from "~/components/icons/TrashIcon";
import LoadingSpinner from "~/components/LoadingSpinner";

export interface DeletePostButtonProps {
  type: string;
  postID: number;
}

export default function DeletePostButton(props: DeletePostButtonProps) {
  const [loading, setLoading] = createSignal(false);

  const deletePostTrigger = async (e: Event) => {
    e.preventDefault();
    const affirm = window.confirm("Are you sure you want to delete?");
    if (affirm) {
      setLoading(true);
      try {
        await api.database.deletePost.mutate({ id: props.postID });
        // Refresh the page after successful deletion
        window.location.reload();
      } catch (error) {
        alert("Failed to delete post");
        setLoading(false);
      }
    }
  };

  return (
    <form onSubmit={deletePostTrigger} class="flex w-full justify-end">
      <button type="submit" class="hover:cursor-pointer">
        <Show
          when={!loading()}
          fallback={<LoadingSpinner height={24} width={24} />}
        >
          <TrashIcon height={24} width={24} strokeWidth={1.5} />
        </Show>
      </button>
    </form>
  );
}
