import { createSignal, Show } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import type {
  Comment,
  CommentReaction,
  UserPublicData,
  ReactionType,
  ModificationType,
  SortingMode,
  CommentSectionProps
} from "~/types/comment";
import CommentInputBlock from "./CommentInputBlock";
import CommentSortingSelect from "./CommentSortingSelect";
import CommentSorting from "./CommentSorting";

const COMMENT_SORTING_OPTIONS: { val: SortingMode }[] = [
  { val: "newest" },
  { val: "oldest" },
  { val: "highest_rated" },
  { val: "hot" }
];

export default function CommentSection(props: CommentSectionProps) {
  const [searchParams] = useSearchParams();

  const [selectedSorting, setSelectedSorting] = createSignal<SortingMode>(
    (searchParams.sortBy as SortingMode) || COMMENT_SORTING_OPTIONS[0].val
  );

  const hasComments = () =>
    props.allComments &&
    props.allComments.length > 0 &&
    props.topLevelComments &&
    props.topLevelComments.length > 0;

  return (
    <div class="w-full">
      <div
        class="text-center text-2xl font-light tracking-widest underline underline-offset-8"
        id="comments"
      >
        Comments
      </div>
      <div class="mb-1">
        <CommentInputBlock
          isReply={false}
          isAuthenticated={props.isAuthenticated}
          post_id={props.postID}
          socket={undefined}
          currentUserID={props.currentUserID}
          newComment={props.newComment}
          commentSubmitLoading={props.commentSubmitLoading}
        />
      </div>

      <Show
        when={hasComments()}
        fallback={
          <div class="pt-8 text-center text-xl font-thin tracking-wide italic">
            No Comments Yet
          </div>
        }
      >
        <CommentSortingSelect
          selectedSorting={{ val: selectedSorting() }}
          setSorting={setSelectedSorting}
        />
        <div id="comments">
          <CommentSorting
            topLevelComments={props.topLevelComments}
            isAuthenticated={props.isAuthenticated}
            isAdmin={props.isAdmin}
            postID={props.postID}
            allComments={props.allComments}
            reactionMap={props.reactionMap}
            currentUserID={props.currentUserID}
            socket={undefined}
            userCommentMap={props.userCommentMap}
            newComment={props.newComment}
            editComment={async () => {}}
            toggleModification={props.toggleModification}
            commentSubmitLoading={props.commentSubmitLoading}
            selectedSorting={{ val: selectedSorting() }}
            commentReaction={props.commentReaction}
          />
        </div>
      </Show>
    </div>
  );
}
