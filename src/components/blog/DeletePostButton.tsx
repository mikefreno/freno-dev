import { createSignal } from "solid-js";
import { api } from "~/lib/api";
import TrashIcon from "~/components/icons/TrashIcon";
import Button from "~/components/ui/Button";

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
        window.location.reload();
      } catch (error) {
        alert("Failed to delete post");
        setLoading(false);
      }
    }
  };

  return (
    <form onSubmit={deletePostTrigger} class="flex w-full justify-end">
      <Button
        type="submit"
        variant="ghost"
        loading={loading()}
        class="hover:cursor-pointer"
      >
        <TrashIcon height={24} width={24} strokeWidth={1.5} />
      </Button>
    </form>
  );
}
