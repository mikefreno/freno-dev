import { createSignal, createEffect, For, Show } from "solid-js";
import type {
  CommentBlockProps,
  CommentReaction,
  UserPublicData
} from "~/types/comment";
import { createWindowWidth } from "~/lib/resize-utils";
import UserDefaultImage from "~/components/icons/UserDefaultImage";
import ReplyIcon from "~/components/icons/ReplyIcon";
import TrashIcon from "~/components/icons/TrashIcon";
import EditIcon from "~/components/icons/EditIcon";
import ThumbsUpEmoji from "~/components/icons/emojis/ThumbsUp";
import LoadingSpinner from "~/components/LoadingSpinner";
import CommentInputBlock from "./CommentInputBlock";
import ReactionBar from "./ReactionBar";

export default function CommentBlock(props: CommentBlockProps) {
  const [commentCollapsed, setCommentCollapsed] = createSignal(false);
  const [showingReactionOptions, setShowingReactionOptions] =
    createSignal(false);
  const [replyBoxShowing, setReplyBoxShowing] = createSignal(false);
  const [toggleHeight, setToggleHeight] = createSignal(0);
  const [reactions, setReactions] = createSignal<CommentReaction[]>([]);
  const windowWidth = createWindowWidth(200);
  const [deletionLoading, setDeletionLoading] = createSignal(false);
  const [userData, setUserData] = createSignal<UserPublicData | null>(null);

  let containerRef: HTMLDivElement | undefined;
  let commentInputRef: HTMLDivElement | undefined;

  createEffect(() => {
    setCommentCollapsed(props.level >= 4);
  });

  createEffect(() => {
    if (props.userCommentMap) {
      props.userCommentMap.forEach((commentIds, user) => {
        if (commentIds.includes(props.comment.id)) {
          setUserData(user);
        }
      });
    }
  });

  createEffect(() => {
    if (containerRef) {
      const correction = showingReactionOptions() ? 80 : 48;
      setToggleHeight(containerRef.clientHeight + correction);
    }
    windowWidth();
    showingReactionOptions();
  });

  createEffect(() => {
    setReactions(props.reactionMap.get(props.comment.id) || []);
  });

  const collapseCommentToggle = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCommentCollapsed(!commentCollapsed());
  };

  const showingReactionOptionsToggle = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowingReactionOptions(!showingReactionOptions());
  };

  const toggleCommentReplyBox = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setReplyBoxShowing(!replyBoxShowing());
  };

  const deleteCommentTrigger = async (e: MouseEvent) => {
    e.stopPropagation();
    console.log("Delete comment");

    setDeletionLoading(true);
    const user = userData();
    props.toggleModification(
      props.comment.id,
      props.comment.commenter_id,
      props.comment.body,
      "delete",
      user?.image,
      user?.email,
      user?.display_name
    );
    setDeletionLoading(false);
  };

  const editCommentTrigger = (e: MouseEvent) => {
    e.stopPropagation();
    const user = userData();
    props.toggleModification(
      props.comment.id,
      props.comment.commenter_id,
      props.comment.body,
      "edit",
      user?.image,
      user?.email,
      user?.display_name
    );
  };

  const upvoteCount = () =>
    reactions().filter((r) => r.type === "upVote").length;

  const downvoteCount = () =>
    reactions().filter((r) => r.type === "downVote").length;

  const hasUpvoted = () =>
    reactions().some(
      (r) => r.type === "upVote" && r.user_id === props.currentUserID
    );

  const hasDownvoted = () =>
    reactions().some(
      (r) => r.type === "downVote" && r.user_id === props.currentUserID
    );

  const canDelete = () =>
    props.currentUserID === props.comment.commenter_id ||
    props.privilegeLevel === "admin";

  const canEdit = () => props.currentUserID === props.comment.commenter_id;

  const isAnonymous = () => props.privilegeLevel === "anonymous";

  const replyIconColor = () => "var(--color-peach)";

  return (
    <>
      {/* Collapsed state */}
      <Show when={commentCollapsed()}>
        <button
          onClick={collapseCommentToggle}
          class="ml-5 w-full px-2 lg:w-3/4"
        >
          <div class="border-text my-auto mt-1 mr-2 h-8 border-l-2" />
        </button>
      </Show>

      {/* Expanded state */}
      <Show when={!commentCollapsed()}>
        <div class="z-500 transition-all duration-300 ease-in-out">
          <div class="my-4 flex w-full overflow-x-hidden overflow-y-hidden lg:w-3/4">
            {/* Vote buttons column */}
            <div
              class="flex flex-col justify-between"
              style={{ height: `${toggleHeight()}px` }}
            >
              {/* Upvote */}
              <button
                onClick={() =>
                  props.commentReaction("upVote", props.comment.id)
                }
              >
                <div
                  class={`h-5 w-5 ${
                    hasUpvoted()
                      ? "fill-green"
                      : `fill-text hover:fill-green ${
                          isAnonymous() ? "tooltip z-50" : ""
                        }`
                  }`}
                >
                  <ThumbsUpEmoji />
                  <Show when={isAnonymous()}>
                    <div class="tooltip-text -ml-16 w-32 text-white">
                      You must be logged in
                    </div>
                  </Show>
                </div>
              </button>

              {/* Vote count */}
              <div class="mx-auto">{upvoteCount() - downvoteCount()}</div>

              {/* Downvote */}
              <button
                onClick={() =>
                  props.commentReaction("downVote", props.comment.id)
                }
              >
                <div
                  class={`h-5 w-5 ${
                    hasDownvoted()
                      ? "fill-red"
                      : `fill-text hover:fill-red ${
                          isAnonymous() ? "tooltip z-50" : ""
                        }`
                  }`}
                >
                  <div class="rotate-180">
                    <ThumbsUpEmoji />
                  </div>
                  <Show when={isAnonymous()}>
                    <div class="tooltip-text -ml-16 w-32">
                      You must be logged in
                    </div>
                  </Show>
                </div>
              </button>
            </div>

            {/* Collapse toggle line */}
            <button onClick={collapseCommentToggle} class="z-0 px-2">
              <div
                class="border-text border-l-2 transition-all duration-300 ease-in-out"
                style={{ height: `${toggleHeight()}px` }}
              />
            </button>

            {/* Comment content */}
            <div
              class="w-3/4"
              onClick={showingReactionOptionsToggle}
              id={props.comment.id.toString()}
            >
              <div
                ref={containerRef}
                class="overflow-x-hidden overflow-y-hidden select-text"
              >
                <div class="max-w-[90%] md:max-w-[75%]">
                  {props.comment.body}
                </div>
                <Show when={props.comment.edited}>
                  <div class="pb-0.5 text-xs italic">Edited</div>
                </Show>
              </div>

              {/* User info */}
              <div class="flex pl-2">
                <Show
                  when={userData()?.image}
                  fallback={
                    <UserDefaultImage strokeWidth={1} height={24} width={24} />
                  }
                >
                  <img
                    src={userData()!.image}
                    height={24}
                    width={24}
                    alt="user-image"
                    class="h-6 w-6 rounded-full object-cover object-center"
                  />
                </Show>
                <div class="px-1">
                  {userData()?.display_name || userData()?.email || "[removed]"}
                </div>

                {/* Delete button */}
                <Show when={canDelete()}>
                  <button class="z-100" onClick={deleteCommentTrigger}>
                    <Show
                      when={!deletionLoading()}
                      fallback={<LoadingSpinner height={24} width={24} />}
                    >
                      <TrashIcon
                        height={24}
                        width={24}
                        stroke="var(--color-red)"
                        strokeWidth={1.5}
                      />
                    </Show>
                  </button>
                </Show>
              </div>

              {/* Edit and Reply buttons */}
              <div class="absolute flex">
                <Show when={canEdit()}>
                  <button onClick={editCommentTrigger} class="px-2">
                    <EditIcon strokeWidth={1} height={24} width={24} />
                  </button>
                </Show>
                <button onClick={toggleCommentReplyBox} class="z-30">
                  <ReplyIcon color={replyIconColor()} height={24} width={24} />
                </button>
              </div>

              {/* Reaction bar */}
              <div
                class={`${
                  showingReactionOptions() || reactions().length > 0
                    ? ""
                    : "opacity-0"
                } ml-16`}
              >
                <ReactionBar
                  commentID={props.comment.id}
                  currentUserID={props.currentUserID}
                  reactions={reactions()}
                  showingReactionOptions={showingReactionOptions()}
                  privilegeLevel={props.privilegeLevel}
                  commentReaction={props.commentReaction}
                />
              </div>
            </div>
          </div>

          {/* Reply box */}
          <Show when={replyBoxShowing()}>
            <div
              ref={commentInputRef}
              class="fade-in lg:w-2/3"
              style={{ "margin-left": `${-24 * props.recursionCount}px` }}
            >
              <CommentInputBlock
                isReply={true}
                privilegeLevel={props.privilegeLevel}
                parent_id={props.comment.id}
                post_id={props.projectID}
                currentUserID={props.currentUserID}
                socket={props.socket}
                newComment={props.newComment}
                commentSubmitLoading={props.commentSubmitLoading}
              />
            </div>
          </Show>

          {/* Recursive child comments */}
          <div class="pl-2 sm:pl-4 md:pl-8 lg:pl-12">
            <For each={props.child_comments}>
              {(childComment) => (
                <CommentBlock
                  comment={childComment}
                  projectID={props.projectID}
                  recursionCount={1}
                  allComments={props.allComments}
                  child_comments={props.allComments?.filter(
                    (comment) => comment.parent_comment_id === childComment.id
                  )}
                  privilegeLevel={props.privilegeLevel}
                  currentUserID={props.currentUserID}
                  reactionMap={props.reactionMap}
                  level={props.level + 1}
                  socket={props.socket}
                  userCommentMap={props.userCommentMap}
                  toggleModification={props.toggleModification}
                  newComment={props.newComment}
                  commentSubmitLoading={props.commentSubmitLoading}
                  commentReaction={props.commentReaction}
                />
              )}
            </For>
          </div>
        </div>
      </Show>
    </>
  );
}
