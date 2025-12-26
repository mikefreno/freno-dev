export interface User {
  id: string;
  email?: string | null;
  email_verified: number;
  password_hash?: string | null;
  display_name?: string | null;
  provider?: "email" | "google" | "github" | null;
  image?: string | null;
  apple_user_string?: string | null;
  database_name?: string | null;
  database_token?: string | null;
  database_url?: string | null;
  db_destroy_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: number;
  category: "blog" | "project"; // this is no longer used
  title: string;
  subtitle?: string;
  body: string;
  banner_photo?: string;
  date: string;
  published: boolean;
  author_id: string;
  reads: number;
  attachments?: string;
}

export interface PostLike {
  id: number;
  user_id: string;
  post_id: number;
}

export interface Comment {
  id: number;
  body: string;
  post_id: number;
  parent_comment_id?: number;
  date: string;
  edited: boolean;
  commenter_id: string;
}

export interface CommentReaction {
  id: number;
  type: string;
  comment_id: number;
  user_id: string;
}

export interface Connection {
  id: number;
  user_id: string;
  connection_id: string;
  post_id?: number;
}

export interface Tag {
  id: number;
  value: string;
  post_id: number;
}

export interface PostWithCommentsAndLikes {
  id: number;
  category: "blog" | "project"; // this is no longer used
  title: string;
  subtitle: string;
  body: string;
  banner_photo: string;
  date: string;
  published: boolean;
  author_id: string;
  reads: number;
  attachments: string;
  total_likes: number;
  total_comments: number;
}
export interface PostWithTags {
  id: number;
  category: "blog" | "project"; // this is no longer used
  title: string;
  subtitle: string;
  body: string;
  banner_photo: string;
  date: string;
  published: boolean;
  author_id: string;
  reads: number;
  attachments: string;
  tags: Tag[];
}
