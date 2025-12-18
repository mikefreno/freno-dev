import { createSignal, Show } from "solid-js";
import type {
  Comment,
  CommentReaction,
  UserPublicData,
  ReactionType,
  ModificationType,
  PostType,
  PrivilegeLevel,
  SortingMode
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

interface CommentSectionProps {
  privilegeLevel: PrivilegeLevel;
  allComments: Comment[];
  topLevelComments: Comment[];
  type: PostType;
  postID: number;
  reactionMap: Map<number, CommentReaction[]>;
  currentUserID: string;
  userCommentMap: Map<UserPublicData, number[]> | undefined;
  newComment: (commentBody: string, parentCommentID?: number) => Promise<void>;
  commentSubmitLoading: boolean;
  toggleModification: (
    commentID: number,
    commenterID: string,
    commentBody: string,
    modificationType: ModificationType,
    commenterImage?: string,
    commenterEmail?: string,
    commenterDisplayName?: string
  ) => void;
  commentReaction: (reactionType: ReactionType, commentID: number) => void;
}

export default function CommentSection(props: CommentSectionProps) {
  const [selectedSorting, setSelectedSorting] = createSignal<SortingMode>(
    COMMENT_SORTING_OPTIONS[0].val
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
          privilegeLevel={props.privilegeLevel}
          type={props.type}
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
            privilegeLevel={props.privilegeLevel}
            type={props.type}
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
