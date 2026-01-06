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
const OPERATION_TIMEOUT = 10000; // 10 seconds timeout for operations

type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

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
  const [operationError, setOperationError] = createSignal<string>("");
  const [connectionState, setConnectionState] =
    createSignal<ConnectionState>("disconnected");
  const [userCommentMap, setUserCommentMap] = createSignal<
    Map<UserPublicData, number[]>
  >(props.userCommentMap);
  let deletePromptRef: HTMLDivElement | undefined;
  let modificationPromptRef: HTMLDivElement | undefined;
  let retryCount = 0;
  let socket: WebSocket | undefined;
  let commentSubmitTimeoutId: number | undefined;
  let editCommentTimeoutId: number | undefined;
  let deleteCommentTimeoutId: number | undefined;
  let reconnectTimeoutId: number | undefined;
  let isMounted = true;
  let intentionalDisconnect = false;

  createEffect(() => {
    const connect = () => {
      // Don't connect if not mounted or intentionally disconnected
      if (!isMounted || intentionalDisconnect) {
        console.log(
          "[WebSocket] Skipping connection: component unmounted or intentional disconnect"
        );
        return;
      }

      if (socket) {
        console.log("[WebSocket] Socket already exists");
        return;
      }

      if (retryCount > MAX_RETRIES) {
        console.error("[WebSocket] Max retries exceeded!");
        setConnectionState("error");
        return;
      }

      // Validate we have required data before connecting
      if (!props.id) {
        console.warn("[WebSocket] No post ID available, skipping connection");
        return;
      }

      const websocketUrl = env.VITE_WEBSOCKET;
      if (!websocketUrl) {
        console.error(
          "[WebSocket] VITE_WEBSOCKET environment variable not set"
        );
        setConnectionState("error");
        return;
      }

      console.log(
        `[WebSocket] Connecting... (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`
      );
      setConnectionState("connecting");

      const newSocket = new WebSocket(websocketUrl);

      newSocket.onopen = () => {
        console.log("[WebSocket] Connected successfully");
        setConnectionState("connected");
        updateChannel();
        retryCount = 0;
      };

      newSocket.onclose = (event) => {
        console.log(
          `[WebSocket] Connection closed (code: ${event.code}, reason: ${event.reason || "none"})`
        );
        socket = undefined;
        setConnectionState("disconnected");

        // Only retry if still mounted and not intentional disconnect
        if (isMounted && !intentionalDisconnect && retryCount <= MAX_RETRIES) {
          retryCount += 1;
          console.log(
            `[WebSocket] Scheduling reconnect in ${RETRY_INTERVAL}ms (attempt ${retryCount}/${MAX_RETRIES + 1})`
          );
          reconnectTimeoutId = window.setTimeout(connect, RETRY_INTERVAL);
        } else {
          console.log("[WebSocket] Not reconnecting:", {
            isMounted,
            intentionalDisconnect,
            retryCount
          });
        }
      };

      newSocket.onerror = (error) => {
        console.error("[WebSocket] Connection error:", error);
        setConnectionState("error");
      };

      newSocket.onmessage = (messageEvent) => {
        try {
          const parsed = JSON.parse(messageEvent.data) as WebSocketBroadcast;
          console.log("[WebSocket] Message received:", parsed.action);

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
              console.log("[WebSocket] Unknown action:", parsed.action);
              break;
          }
        } catch (e) {
          console.error("[WebSocket] Error parsing message:", e);
        }
      };

      socket = newSocket;
    };

    connect();

    onCleanup(() => {
      console.log("[WebSocket] Component cleanup starting");
      isMounted = false;
      intentionalDisconnect = true;

      // Clear reconnect timeout
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = undefined;
      }

      // Send disconnect message if connected
      if (socket?.readyState === WebSocket.OPEN) {
        try {
          socket.send(
            JSON.stringify({
              action: "disconnect",
              postType: "blog",
              postID: props.id,
              invokerID: props.currentUserID
            })
          );
          console.log("[WebSocket] Disconnect message sent");
        } catch (error) {
          console.error("[WebSocket] Error sending disconnect message:", error);
        }
        socket.close(1000, "Component unmounted");
      } else if (socket) {
        socket.close();
      }

      socket = undefined;
      setConnectionState("disconnected");

      // Clear operation timeouts
      if (commentSubmitTimeoutId) clearTimeout(commentSubmitTimeoutId);
      if (editCommentTimeoutId) clearTimeout(editCommentTimeoutId);
      if (deleteCommentTimeoutId) clearTimeout(deleteCommentTimeoutId);

      console.log("[WebSocket] Component cleanup complete");
    });
  });

  const updateChannel = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn("[WebSocket] Cannot update channel: socket not ready");
      return;
    }

    if (!props.currentUserID || !props.id) {
      console.warn(
        "[WebSocket] Cannot update channel: missing userID or postID"
      );
      return;
    }

    try {
      socket.send(
        JSON.stringify({
          action: "channelUpdate",
          postType: "blog",
          postID: props.id,
          invokerID: props.currentUserID
        })
      );
      console.log(`[WebSocket] Channel updated for post ${props.id}`);
    } catch (error) {
      console.error("[WebSocket] Error sending channel update:", error);
    }
  };

  const newComment = async (commentBody: string, parentCommentID?: number) => {
    setCommentSubmitLoading(true);

    // Clear any existing timeout
    if (commentSubmitTimeoutId) {
      clearTimeout(commentSubmitTimeoutId);
    }

    // Set timeout to clear loading state
    commentSubmitTimeoutId = window.setTimeout(() => {
      console.warn("Comment submission timed out");
      setCommentSubmitLoading(false);
      setOperationError("Comment submission timed out. Please try again.");
    }, OPERATION_TIMEOUT);

    if (!props.currentUserID) {
      console.warn("Cannot create comment: user not authenticated");
      clearTimeout(commentSubmitTimeoutId);
      setCommentSubmitLoading(false);
      return;
    }

    if (commentBody && socket && socket.readyState === WebSocket.OPEN) {
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
        clearTimeout(commentSubmitTimeoutId);
        await fallbackCommentCreation(commentBody, parentCommentID);
      }
    } else {
      clearTimeout(commentSubmitTimeoutId);
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
      } else {
        throw new Error("Failed to create comment");
      }
    } catch (error) {
      console.error("Error in fallback comment creation:", error);
      setOperationError("Failed to post comment. Please try again.");
      if (commentSubmitTimeoutId) {
        clearTimeout(commentSubmitTimeoutId);
      }
      setCommentSubmitLoading(false);
    }
  };

  const createCommentHandler = async (
    data: WebSocketBroadcast | BackupResponse
  ) => {
    // Clear timeout since we received response
    if (commentSubmitTimeoutId) {
      clearTimeout(commentSubmitTimeoutId);
    }
    setOperationError("");

    const body = data.commentBody;
    const commenterID = data.commenterID;
    const parentCommentID = data.commentParent;
    const id = data.commentID;

    console.log("[createCommentHandler] Received data:", {
      body,
      commenterID,
      parentCommentID,
      id
    });

    if (body && commenterID && parentCommentID !== undefined && id) {
      try {
        console.log(
          "[createCommentHandler] Fetching user data for:",
          commenterID
        );
        const userData = await api.database.getUserPublicData.query({
          id: commenterID
        });

        console.log("[createCommentHandler] User data response:", userData);

        if (!userData) {
          console.error(
            "Failed to fetch user data for commenter:",
            commenterID,
            "- Comment will not be displayed in UI but is saved in database"
          );
          setCommentSubmitLoading(false);
          return;
        }

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

        const existingIDs = Array.from(userCommentMap().entries()).find(
          ([key, _]) =>
            key.email === userData.email &&
            key.display_name === userData.display_name &&
            key.image === userData.image
        );

        if (existingIDs) {
          const [key, ids] = existingIDs;
          const newMap = new Map(userCommentMap());
          newMap.set(key, [...ids, id]);
          setUserCommentMap(newMap);
        } else {
          const newMap = new Map(userCommentMap());
          newMap.set(userData, [id]);
          setUserCommentMap(newMap);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    }
    setCommentSubmitLoading(false);
  };

  const editComment = async (body: string, comment_id: number) => {
    setCommentEditLoading(true);

    // Clear any existing timeout
    if (editCommentTimeoutId) {
      clearTimeout(editCommentTimeoutId);
    }

    // Set timeout to clear loading state
    editCommentTimeoutId = window.setTimeout(() => {
      console.warn("Comment edit timed out");
      setCommentEditLoading(false);
      setOperationError("Comment edit timed out. Please try again.");
    }, OPERATION_TIMEOUT);

    if (!props.currentUserID) {
      console.warn("Cannot edit comment: user not authenticated");
      clearTimeout(editCommentTimeoutId);
      setCommentEditLoading(false);
      return;
    }

    if (socket && socket.readyState === WebSocket.OPEN) {
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
        setOperationError("Failed to edit comment. Please try again.");
        clearTimeout(editCommentTimeoutId);
        setCommentEditLoading(false);
      }
    } else {
      console.warn("WebSocket not available for edit, operation canceled");
      setOperationError("Unable to edit comment. Please refresh the page.");
      clearTimeout(editCommentTimeoutId);
      setCommentEditLoading(false);
    }
  };

  const editCommentHandler = (data: WebSocketBroadcast) => {
    // Clear timeout since we received response
    if (editCommentTimeoutId) {
      clearTimeout(editCommentTimeoutId);
    }
    setOperationError("");

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

    // Clear any existing timeout
    if (deleteCommentTimeoutId) {
      clearTimeout(deleteCommentTimeoutId);
    }

    // Set timeout to clear loading state
    deleteCommentTimeoutId = window.setTimeout(() => {
      console.warn("Comment deletion timed out");
      setCommentDeletionLoading(false);
      setOperationError("Comment deletion timed out. Please try again.");
    }, OPERATION_TIMEOUT);

    if (!props.currentUserID) {
      console.warn(
        "[deleteComment] Cannot delete comment: user not authenticated"
      );
      clearTimeout(deleteCommentTimeoutId);
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
        clearTimeout(deleteCommentTimeoutId);
        await fallbackCommentDeletion(commentID, commenterID, deletionType);
      }
    } else {
      console.log(
        "[deleteComment] WebSocket not available, using HTTP fallback"
      );
      clearTimeout(deleteCommentTimeoutId);
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
      setOperationError("Failed to delete comment. Please try again.");
      if (deleteCommentTimeoutId) {
        clearTimeout(deleteCommentTimeoutId);
      }
      setCommentDeletionLoading(false);
    }
  };

  const deleteCommentHandler = (data: WebSocketBroadcast) => {
    // Clear timeout since we received response
    if (deleteCommentTimeoutId) {
      clearTimeout(deleteCommentTimeoutId);
    }
    setOperationError("");

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
      {/* Connection status indicator (dev mode only) */}
      <Show when={import.meta.env.DEV && connectionState() !== "connected"}>
        <div class="mx-auto mb-2 w-3/4 text-center text-xs italic opacity-60">
          <Show when={connectionState() === "connecting"}>
            <span>⚡ Connecting to live updates...</span>
          </Show>
          <Show when={connectionState() === "disconnected"}>
            <span>📡 Live updates disconnected</span>
          </Show>
          <Show when={connectionState() === "error"}>
            <span class="text-red">❌ Connection error</span>
          </Show>
        </div>
      </Show>

      <Show when={operationError()}>
        <div class="bg-red/20 border-red text-red mx-auto mb-4 w-3/4 rounded-lg border px-4 py-3 text-center">
          {operationError()}
        </div>
      </Show>

      <CommentSection
        privilegeLevel={props.privilegeLevel}
        allComments={allComments()}
        topLevelComments={topLevelComments()}
        postID={props.id}
        reactionMap={currentReactionMap()}
        currentUserID={props.currentUserID}
        userCommentMap={userCommentMap()}
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
