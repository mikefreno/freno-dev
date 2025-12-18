import { createSignal, createEffect, For, Show, createMemo } from "solid-js";
import type { CommentSortingProps } from "~/types/comment";
import { sortComments } from "~/lib/comment-utils";
import CommentBlock from "./CommentBlock";

export default function CommentSorting(props: CommentSortingProps) {
  const [clickedOnce, setClickedOnce] = createSignal(false);
  const [showingBlock, setShowingBlock] = createSignal<Map<number, boolean>>(
    new Map(props.topLevelComments?.map((comment) => [comment.id, true]))
  );

  // Update showing block when top level comments change
  createEffect(() => {
    setShowingBlock(
      new Map(props.topLevelComments?.map((comment) => [comment.id, true]))
    );
  });

  // Reset clickedOnce after timeout
  createEffect(() => {
    if (clickedOnce()) {
      setTimeout(() => setClickedOnce(false), 300);
    }
  });

  const checkForDoubleClick = (id: number) => {
    if (clickedOnce()) {
      setShowingBlock((prev) => {
        const newMap = new Map(prev);
        newMap.set(id, !prev.get(id));
        return newMap;
      });
    } else {
      setClickedOnce(true);
    }
  };

  // Memoized sorted comments
  const sortedComments = createMemo(() => {
    return sortComments(
      props.topLevelComments,
      props.selectedSorting.val,
      props.reactionMap
    );
  });

  return (
    <For each={sortedComments()}>
      {(topLevelComment) => (
        <div
          onClick={() => checkForDoubleClick(topLevelComment.id)}
          class="mt-4 max-w-full rounded bg-white py-2 pl-2 shadow select-none sm:pl-4 md:pl-8 lg:pl-12 dark:bg-zinc-900"
        >
          <Show
            when={showingBlock().get(topLevelComment.id)}
            fallback={<div class="h-4" />}
          >
            <CommentBlock
              comment={topLevelComment}
              category={props.type}
              projectID={props.postID}
              recursionCount={1}
              allComments={props.allComments}
              child_comments={props.allComments?.filter(
                (comment) => comment.parent_comment_id === topLevelComment.id
              )}
              privilegeLevel={props.privilegeLevel}
              currentUserID={props.currentUserID}
              reactionMap={props.reactionMap}
              level={0}
              socket={props.socket}
              userCommentMap={props.userCommentMap}
              toggleModification={props.toggleModification}
              newComment={props.newComment}
              commentSubmitLoading={props.commentSubmitLoading}
              commentReaction={props.commentReaction}
            />
          </Show>
        </div>
      )}
    </For>
  );
}
