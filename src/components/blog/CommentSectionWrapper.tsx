import { createSignal, createEffect, onCleanup, Show } from "solid-js";
import type {
  Comment,
  CommentReaction,
  CommentSectionWrapperProps,
  WebSocketBroadcast,
  BackupResponse,
  UserPublicData,
  ReactionType,
  DeletionType
} from "~/types/comment";
import { getSQLFormattedDate } from "~/lib/comment-utils";
import { api } from "~/lib/api";
import CommentSection from "./CommentSection";
import CommentDeletionPrompt from "./CommentDeletionPrompt";
import EditCommentModal from "./EditCommentModal";
import { env } from "~/env/client";

const MAX_RETRIES = 12;
const RETRY_INTERVAL = 5000;

export default function CommentSectionWrapper(
  props: CommentSectionWrapperProps
) {
  const [allComments, setAllComments] = createSignal<Comment[]>(
    props.allComments
  );
  const [topLevelComments, setTopLevelComments] = createSignal<Comment[]>(
    props.topLevelComments
  );
  const [currentReactionMap, setCurrentReactionMap] = createSignal<
    Map<number, CommentReaction[]>
  >(props.reactionMap);
  const [commentSubmitLoading, setCommentSubmitLoading] =
    createSignal<boolean>(false);
  const [commentDeletionLoading, setCommentDeletionLoading] =
    createSignal<boolean>(false);
  const [editCommentLoading, setCommentEditLoading] =
    createSignal<boolean>(false);
  const [showingCommentEdit, setShowingCommentEdit] =
    createSignal<boolean>(false);
  const [showingDeletionPrompt, setShowingDeletionPrompt] =
    createSignal<boolean>(false);
  const [commentIDForModification, setCommentIDForModification] =
    createSignal<number>(-1);
  const [commenterForModification, setCommenterForModification] =
    createSignal<string>("");
  const [commenterImageForModification, setCommenterImageForModification] =
    createSignal<string | undefined>(undefined);
  const [commenterEmailForModification, setCommenterEmailForModification] =
    createSignal<string | undefined>(undefined);
  const [
    commenterDisplayNameForModification,
    setCommenterDisplayNameForModification
  ] = createSignal<string | undefined>(undefined);
  const [commentBodyForModification, setCommentBodyForModification] =
    createSignal<string>("");

  let userCommentMap: Map<UserPublicData, number[]> = props.userCommentMap;
  let deletePromptRef: HTMLDivElement | undefined;
  let modificationPromptRef: HTMLDivElement | undefined;
  let retryCount = 0;
  let socket: WebSocket | undefined;

  createEffect(() => {
    const connect = () => {
      if (socket) return;
      if (retryCount > MAX_RETRIES) {
        console.error("Max retries exceeded!");
        return;
      }

      const websocketUrl = env.VITE_WEBSOCKET;
      if (!websocketUrl) {
        console.error("VITE_WEBSOCKET environment variable not set");
        return;
      }

      const newSocket = new WebSocket(websocketUrl);

      newSocket.onopen = () => {
        updateChannel();
        retryCount = 0;
      };

      newSocket.onclose = () => {
        retryCount += 1;
        socket = undefined;
        setTimeout(connect, RETRY_INTERVAL);
      };

      newSocket.onmessage = (messageEvent) => {
        try {
          const parsed = JSON.parse(messageEvent.data) as WebSocketBroadcast;
          switch (parsed.action) {
            case "commentCreationBroadcast":
              createCommentHandler(parsed);
              break;
            case "commentUpdateBroadcast":
              editCommentHandler(parsed);
              break;
            case "commentDeletionBroadcast":
              deleteCommentHandler(parsed);
              break;
            case "commentReactionBroadcast":
              commentReactionHandler(parsed);
              break;
            default:
              break;
          }
        } catch (e) {
          console.error(e);
        }
      };

      socket = newSocket;
    };

    connect();

    onCleanup(() => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.close();
        socket = undefined;
      }
    });
  });

  const updateChannel = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    if (!props.currentUserID || !props.id) {
      console.warn("Cannot update channel: missing userID or postID");
      return;
    }

    try {
      socket.send(
        JSON.stringify({
          action: "channelUpdate",
          postType: "blog",
          postID: props.id,
          invoker_id: props.currentUserID
        })
      );
    } catch (error) {
      console.error("Error sending channel update:", error);
    }
  };

  const newComment = async (commentBody: string, parentCommentID?: number) => {
    setCommentSubmitLoading(true);

    if (!props.currentUserID) {
      console.warn("Cannot create comment: user not authenticated");
      setCommentSubmitLoading(false);
      return;
    }

    if (commentBody && socket) {
      try {
        socket.send(
          JSON.stringify({
            action: "commentCreation",
            commentBody: commentBody,
            postType: "blog",
            postID: props.id,
            parentCommentID: parentCommentID,
            invokerID: props.currentUserID
          })
        );
      } catch (error) {
        console.error("Error sending comment creation:", error);
        await fallbackCommentCreation(commentBody, parentCommentID);
      }
    } else {
      await fallbackCommentCreation(commentBody, parentCommentID);
    }
  };

  const fallbackCommentCreation = async (
    commentBody: string,
    parentCommentID?: number
  ) => {
    try {
      const domain = env.VITE_DOMAIN;
      const res = await fetch(
        `${domain}/api/database/comments/create/blog/${props.id}`,
        {
          method: "POST",
          body: JSON.stringify({
            body: commentBody,
            parentCommentID: parentCommentID,
            commenterID: props.currentUserID
          })
        }
      );
      if (res.status === 201) {
        const id = (await res.json()).data;
        createCommentHandler({
          commentBody: commentBody,
          commentID: id,
          commenterID: props.currentUserID,
          commentParent: parentCommentID
        });
      }
    } catch (error) {
      console.error("Error in fallback comment creation:", error);
      setCommentSubmitLoading(false);
    }
  };

  const createCommentHandler = async (
    data: WebSocketBroadcast | BackupResponse
  ) => {
    const body = data.commentBody;
    const commenterID = data.commenterID;
    const parentCommentID = data.commentParent;
    const id = data.commentID;

    if (body && commenterID && parentCommentID !== undefined && id) {
      const domain = env.VITE_DOMAIN;
      const res = await fetch(
        `${domain}/api/database/user/public-data/${commenterID}`
      );
      const userData = (await res.json()) as UserPublicData;

      const comment_date = getSQLFormattedDate();
      const newComment: Comment = {
        id: id,
        body: body,
        post_id: props.id,
        parent_comment_id: parentCommentID,
        commenter_id: commenterID,
        edited: false,
        date: comment_date
      };

      if (parentCommentID === -1 || parentCommentID === null) {
        setTopLevelComments((prevComments) => [
          ...(prevComments || []),
          newComment
        ]);
      }
      setAllComments((prevComments) => [...(prevComments || []), newComment]);

      const existingIDs = Array.from(userCommentMap.entries()).find(
        ([key, _]) =>
          key.email === userData.email &&
          key.display_name === userData.display_name &&
          key.image === userData.image
      );

      if (existingIDs) {
        const [key, ids] = existingIDs;
        userCommentMap.set(key, [...ids, id]);
      } else {
        userCommentMap.set(userData, [id]);
      }
    }
    setCommentSubmitLoading(false);
  };

  const editComment = async (body: string, comment_id: number) => {
    setCommentEditLoading(true);

    if (!props.currentUserID) {
      console.warn("Cannot edit comment: user not authenticated");
      setCommentEditLoading(false);
      return;
    }

    if (socket) {
      try {
        socket.send(
          JSON.stringify({
            action: "commentUpdate",
            commentBody: body,
            postType: "blog",
            postID: props.id,
            commentID: comment_id,
            invokerID: props.currentUserID
          })
        );
      } catch (error) {
        console.error("Error sending comment update:", error);
        setCommentEditLoading(false);
      }
    }
  };

  const editCommentHandler = (data: WebSocketBroadcast) => {
    setAllComments((prev) =>
      prev.map((comment) => {
        if (comment.id === data.commentID) {
          return {
            ...comment,
            body: data.commentBody!,
            edited: true
          };
        }
        return comment;
      })
    );
    setTopLevelComments((prev) =>
      prev.map((comment) => {
        if (comment.id === data.commentID) {
          return {
            ...comment,
            body: data.commentBody!,
            edited: true
          };
        }
        return comment;
      })
    );
    setCommentEditLoading(false);
    setTimeout(() => {
      setShowingCommentEdit(false);
      clearModificationPrompt();
    }, 300);
  };

  // Comment deletion
  const deleteComment = async (
    commentID: number,
    commenterID: string,
    deletionType: DeletionType
  ) => {
    console.log("[deleteComment] Starting deletion:", {
      commentID,
      commenterID,
      deletionType,
      currentUserID: props.currentUserID,
      socketState: socket?.readyState
    });

    setCommentDeletionLoading(true);

    if (!props.currentUserID) {
      console.warn(
        "[deleteComment] Cannot delete comment: user not authenticated"
      );
      setCommentDeletionLoading(false);
      return;
    }

    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log("[deleteComment] Using WebSocket");
      try {
        socket.send(
          JSON.stringify({
            action: "commentDeletion",
            deleteType: deletionType,
            commentID: commentID,
            invokerID: props.currentUserID,
            postType: "blog",
            postID: props.id
          })
        );
      } catch (error) {
        console.error(
          "[deleteComment] WebSocket error, falling back to HTTP:",
          error
        );
        await fallbackCommentDeletion(commentID, commenterID, deletionType);
      }
    } else {
      console.log(
        "[deleteComment] WebSocket not available, using HTTP fallback"
      );
      await fallbackCommentDeletion(commentID, commenterID, deletionType);
    }
  };

  const fallbackCommentDeletion = async (
    commentID: number,
    commenterID: string,
    deletionType: DeletionType
  ) => {
    console.log("[fallbackCommentDeletion] Calling tRPC endpoint:", {
      commentID,
      commenterID,
      deletionType
    });

    try {
      const result = await api.database.deleteComment.mutate({
        commentID,
        commenterID,
        deletionType
      });

      console.log("[fallbackCommentDeletion] Success:", result);

      deleteCommentHandler({
        action: "commentDeletionBroadcast",
        commentID: commentID,
        commentBody: result.commentBody || undefined,
        commenterID: commenterID,
        deletionType: deletionType
      });
    } catch (error) {
      console.error("[fallbackCommentDeletion] Error:", error);
      setCommentDeletionLoading(false);
    }
  };

  const deleteCommentHandler = (data: WebSocketBroadcast) => {
    if (data.commentBody) {
      // Soft delete (replace body with deletion message)
      setAllComments((prev) =>
        prev.map((comment) => {
          if (comment.id === data.commentID) {
            return {
              ...comment,
              body: data.commentBody!,
              commenter_id: "",
              edited: false
            };
          }
          return comment;
        })
      );

      setTopLevelComments((prev) =>
        prev.map((comment) => {
          if (comment.id === data.commentID) {
            return {
              ...comment,
              body: data.commentBody!,
              commenter_id: "",
              edited: false
            };
          }
          return comment;
        })
      );
    } else {
      // Hard delete (remove from list)
      setAllComments((prev) =>
        prev.filter((comment) => comment.id !== data.commentID)
      );
      setTopLevelComments((prev) =>
        prev.filter((comment) => comment.id !== data.commentID)
      );
    }
    setCommentDeletionLoading(false);
    setTimeout(() => {
      clearModificationPrompt();
      setShowingDeletionPrompt(false);
    }, 300);
  };

  // Deletion/edit prompt toggle
  const toggleModification = (
    commentID: number,
    commenterID: string,
    commentBody: string,
    modificationType: "delete" | "edit",
    commenterImage?: string,
    commenterEmail?: string,
    commenterDisplayName?: string
  ) => {
    if (commentID === commentIDForModification()) {
      if (modificationType === "delete") {
        setShowingDeletionPrompt(false);
      } else {
        setShowingCommentEdit(false);
      }
      clearModificationPrompt();
    } else {
      if (modificationType === "delete") {
        setShowingDeletionPrompt(true);
      } else {
        setShowingCommentEdit(true);
      }
      setCommentIDForModification(commentID);
      setCommenterForModification(commenterID);
      setCommenterImageForModification(commenterImage);
      setCommenterEmailForModification(commenterEmail);
      setCommenterDisplayNameForModification(commenterDisplayName);
      setCommentBodyForModification(commentBody);
    }
  };

  const clearModificationPrompt = () => {
    setCommentIDForModification(-1);
    setCommenterForModification("");
    setCommenterImageForModification(undefined);
    setCommenterEmailForModification(undefined);
    setCommenterDisplayNameForModification(undefined);
    setCommentBodyForModification("");
  };

  // Reaction handling
  const commentReaction = (reactionType: ReactionType, commentID: number) => {
    if (!props.currentUserID) {
      console.warn("Cannot react to comment: user not authenticated");
      return;
    }

    if (socket) {
      try {
        socket.send(
          JSON.stringify({
            action: "commentReaction",
            postType: "blog",
            postID: props.id,
            commentID: commentID,
            invokerID: props.currentUserID,
            reactionType: reactionType
          })
        );
      } catch (error) {
        console.error("Error sending comment reaction:", error);
      }
    }
  };

  const commentReactionHandler = (data: any) => {
    switch (data.endEffect) {
      case "creation":
        if (data.commentID && data.reactionType && data.reactingUserID) {
          const newReaction: CommentReaction = {
            id: -1,
            type: data.reactionType,
            comment_id: data.commentID,
            user_id: data.reactingUserID,
            date: getSQLFormattedDate()
          };
          setCurrentReactionMap((prevMap) => {
            const entries = [
              ...(prevMap.get(data.commentID!) || []),
              newReaction
            ];
            return new Map([...prevMap, [data.commentID!, entries]]);
          });
        }
        break;

      case "deletion":
        if (data.commentID) {
          setCurrentReactionMap((prevMap) => {
            const entries = (prevMap.get(data.commentID!) || []).filter(
              (reaction) =>
                reaction.user_id !== data.reactingUserID ||
                reaction.type !== data.reactionType
            );
            return new Map([...prevMap, [data.commentID!, entries]]);
          });
        }
        break;

      case "inversion":
        // Only applies to upvotes/downvotes (vote inversion)
        if (
          data.commentID &&
          data.reactingUserID &&
          data.reactionType &&
          (data.reactionType === "upVote" || data.reactionType === "downVote")
        ) {
          setCurrentReactionMap((prevMap) => {
            let entries = (prevMap.get(data.commentID!) || []).filter(
              (reaction) =>
                reaction.user_id !== data.reactingUserID ||
                reaction.type !==
                  (data.reactionType === "upVote" ? "downVote" : "upVote")
            );
            const newReaction: CommentReaction = {
              id: -1,
              type: data.reactionType!,
              comment_id: data.commentID!,
              user_id: data.reactingUserID!,
              date: getSQLFormattedDate()
            };
            entries = entries.concat(newReaction);
            return new Map([...prevMap, [data.commentID!, entries]]);
          });
        }
        break;

      default:
        console.log("endEffect value unknown");
    }
  };

  // Click outside handlers (SolidJS version)
  createEffect(() => {
    const handleClickOutsideDelete = (e: MouseEvent) => {
      if (
        deletePromptRef &&
        !deletePromptRef.contains(e.target as Node) &&
        showingDeletionPrompt()
      ) {
        setShowingDeletionPrompt(false);
      }
    };

    const handleClickOutsideEdit = (e: MouseEvent) => {
      if (
        modificationPromptRef &&
        !modificationPromptRef.contains(e.target as Node) &&
        showingCommentEdit()
      ) {
        setShowingCommentEdit(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutsideDelete);
    document.addEventListener("mousedown", handleClickOutsideEdit);

    onCleanup(() => {
      document.removeEventListener("mousedown", handleClickOutsideDelete);
      document.removeEventListener("mousedown", handleClickOutsideEdit);
    });
  });

  return (
    <>
      <CommentSection
        privilegeLevel={props.privilegeLevel}
        allComments={allComments()}
        topLevelComments={topLevelComments()}
        postID={props.id}
        reactionMap={currentReactionMap()}
        currentUserID={props.currentUserID}
        userCommentMap={userCommentMap}
        newComment={newComment}
        commentSubmitLoading={commentSubmitLoading()}
        toggleModification={toggleModification}
        commentReaction={commentReaction}
      />

      <CommentDeletionPrompt
        isOpen={showingDeletionPrompt()}
        commentID={commentIDForModification()}
        commenterID={commenterForModification()}
        commenterImage={commenterImageForModification()}
        commenterEmail={commenterEmailForModification()}
        commenterDisplayName={commenterDisplayNameForModification()}
        privilegeLevel={props.privilegeLevel}
        commentDeletionLoading={commentDeletionLoading()}
        deleteComment={deleteComment}
        onClose={() => {
          setShowingDeletionPrompt(false);
          clearModificationPrompt();
        }}
      />

      <EditCommentModal
        isOpen={showingCommentEdit()}
        commentID={commentIDForModification()}
        commentBody={commentBodyForModification()}
        commenterImage={commenterImageForModification()}
        commenterEmail={commenterEmailForModification()}
        commenterDisplayName={commenterDisplayNameForModification()}
        editCommentLoading={editCommentLoading()}
        editComment={editComment}
        onClose={() => {
          setShowingCommentEdit(false);
          clearModificationPrompt();
        }}
      />
    </>
  );
}
