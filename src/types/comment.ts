export interface Comment {
  id: number;
  body: string;
  post_id: number;
  parent_comment_id: number | null;
  commenter_id: string;
  edited: boolean;
  date: string;
}

export interface CommentReaction {
  id: number;
  comment_id: number;
  user_id: string;
  type: ReactionType;
  date: string;
}

export type ReactionType =
  | "tears"
  | "blank"
  | "tongue"
  | "cry"
  | "heartEye"
  | "angry"
  | "moneyEye"
  | "sick"
  | "upsideDown"
  | "worried";

export interface UserPublicData {
  email?: string;
  display_name?: string;
  image?: string;
}

export interface WebSocketBroadcast {
  action:
    | "commentCreationBroadcast"
    | "commentUpdateBroadcast"
    | "commentDeletionBroadcast"
    | "commentReactionBroadcast";
  commentID: number;
  commentBody?: string;
  commenterID: string;
  commentParent?: number | null;
  reactionType?: ReactionType;
  deletionType?: "user" | "admin" | "database";
}

export interface BackupResponse {
  commentID: number;
  commentBody?: string;
  commenterID: string;
  commentParent?: number | null;
}

export type PrivilegeLevel = "admin" | "user" | "anonymous";

export type SortingMode = "newest" | "oldest" | "highest_rated" | "hot";

export type DeletionType = "user" | "admin" | "database";

export type ModificationType = "delete" | "edit";

export interface CommentSectionWrapperProps {
  privilegeLevel: PrivilegeLevel;
  allComments: Comment[];
  topLevelComments: Comment[];
  id: number;
  reactionMap: Map<number, CommentReaction[]>;
  currentUserID: string;
  userCommentMap: Map<UserPublicData, number[]>;
}

export interface CommentSectionProps {
  privilegeLevel: PrivilegeLevel;
  postID: number;
  allComments: Comment[];
  topLevelComments: Comment[];
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

export interface CommentBlockProps {
  comment: Comment;
  projectID: number;
  recursionCount: number;
  allComments: Comment[] | undefined;
  child_comments: Comment[] | undefined;
  privilegeLevel: PrivilegeLevel;
  currentUserID: string;
  reactionMap: Map<number, CommentReaction[]>;
  level: number;
  socket: WebSocket | undefined;
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

export interface CommentInputBlockProps {
  isReply: boolean;
  parent_id?: number;
  privilegeLevel: PrivilegeLevel;
  post_id: number;
  socket: WebSocket | undefined;
  currentUserID: string;
  newComment: (commentBody: string, parentCommentID?: number) => Promise<void>;
  commentSubmitLoading: boolean;
}

export interface CommentSortingProps {
  topLevelComments: Comment[];
  privilegeLevel: PrivilegeLevel;
  postID: number;
  allComments: Comment[];
  reactionMap: Map<number, CommentReaction[]>;
  currentUserID: string;
  socket: WebSocket | undefined;
  userCommentMap: Map<UserPublicData, number[]> | undefined;
  newComment: (commentBody: string, parentCommentID?: number) => Promise<void>;
  editComment: (body: string, comment_id: number) => Promise<void>;
  toggleModification: (
    commentID: number,
    commenterID: string,
    commentBody: string,
    modificationType: ModificationType,
    commenterImage?: string,
    commenterEmail?: string,
    commenterDisplayName?: string
  ) => void;
  commentSubmitLoading: boolean;
  selectedSorting: {
    val: SortingMode;
  };
  commentReaction: (reactionType: ReactionType, commentID: number) => void;
}

export interface CommentSortingSelectProps {
  selectedSorting: {
    val: SortingMode;
  };
  setSorting: (mode: SortingMode) => void;
}

export interface ReactionBarProps {
  currentUserID: string;
  commentID: number;
  reactions: CommentReaction[];
  privilegeLevel: PrivilegeLevel;
  showingReactionOptions: boolean;
  commentReaction: (reactionType: ReactionType, commentID: number) => void;
}

export interface CommentDeletionPromptProps {
  isOpen: boolean;
  privilegeLevel: PrivilegeLevel;
  commentID: number;
  commenterID: string;
  deleteComment: (
    commentID: number,
    commenterID: string,
    deletionType: DeletionType
  ) => void;
  commentDeletionLoading: boolean;
  onClose: () => void;
  commenterImage?: string;
  commenterEmail?: string;
  commenterDisplayName?: string;
}

export interface EditCommentModalProps {
  isOpen: boolean;
  commentID: number;
  commentBody: string;
  editComment: (body: string, comment_id: number) => Promise<void>;
  editCommentLoading: boolean;
  onClose: () => void;
  commenterImage?: string;
  commenterEmail?: string;
  commenterDisplayName?: string;
}
