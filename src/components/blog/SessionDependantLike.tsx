import { createSignal, Show } from "solid-js";
import { api } from "~/lib/api";
import LikeIcon from "~/components/icons/LikeIcon";

export interface PostLike {
  id: number;
  user_id: string;
  post_id: string;
}

export interface SessionDependantLikeProps {
  currentUserID: string | undefined | null;
  privilegeLevel: "admin" | "user" | "anonymous";
  likes: PostLike[];
  projectID: number;
}

export default function SessionDependantLike(props: SessionDependantLikeProps) {
  const [hovering, setHovering] = createSignal(false);
  const [likes, setLikes] = createSignal(props.likes);
  const [instantOffset, setInstantOffset] = createSignal(0);
  const [hasLiked, setHasLiked] = createSignal(
    props.likes.some((like) => like.user_id === props.currentUserID)
  );

  const giveProjectLike = async () => {
    if (!props.currentUserID) return;

    const initialHasLiked = hasLiked();
    const initialInstantOffset = initialHasLiked ? -1 : 1;

    setHasLiked(!hasLiked());
    setInstantOffset(initialInstantOffset);

    try {
      if (initialHasLiked) {
        const result = await api.database.removePostLike.mutate({
          user_id: props.currentUserID,
          post_id: props.projectID.toString(),
        });
        setLikes(result.newLikes as PostLike[]);
      } else {
        const result = await api.database.addPostLike.mutate({
          user_id: props.currentUserID,
          post_id: props.projectID.toString(),
        });
        setLikes(result.newLikes as PostLike[]);
      }
      setInstantOffset(0);
    } catch (error) {
      console.error("There has been a problem with your like operation:", error);
      setHasLiked(initialHasLiked);
      setInstantOffset(0);
    }
  };

  const likeCount = () => likes().length + instantOffset();
  
  const getLikeIconColor = () => {
    if (hasLiked()) {
      return "fill-orange-400";
    }
    
    if (hovering()) {
      return "fill-orange-400 dark:fill-orange-500";
    }
    
    return "fill-black dark:fill-white";
  };

  return (
    <Show
      when={props.privilegeLevel !== "anonymous"}
      fallback={
        <button class="tooltip flex flex-col">
          <div class="mx-auto">
            <LikeIcon
              strokeWidth={1}
              color="fill-black dark:fill-white"
              height={32}
              width={32}
            />
          </div>
          <div class="my-auto pl-2 pt-0.5 text-sm text-black dark:text-white">
            {likes().length} {likes().length === 1 ? "Like" : "Likes"}
          </div>
          <div class="tooltip-text -ml-12 w-12">Must be logged in</div>
        </button>
      }
    >
      <button
        onClick={() => giveProjectLike()}
        onMouseOver={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div class="hover:text-orange-400 tooltip flex flex-col text-black dark:text-white">
          <div class="mx-auto">
            <LikeIcon
              strokeWidth={1}
              color={getLikeIconColor()}
              height={32}
              width={32}
            />
          </div>
          <div
            class={`${
              hasLiked() ? "text-orange-400" : ""
            } mx-auto flex pl-2 transition-colors duration-200 ease-in`}
          >
            {likeCount()} {likeCount() === 1 ? "Like" : "Likes"}
          </div>
          <div class="tooltip-text -ml-14 w-12 px-2">
            <Show
              when={hasLiked()}
              fallback={<div class="px-2 text-center">Leave a Like</div>}
            >
              <div class="px-2">Remove Like</div>
            </Show>
          </div>
        </div>
      </button>
    </Show>
  );
}
