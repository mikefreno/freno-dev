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
  failed_attempts?: number;
  locked_until?: string | null;
}

export interface Session {
  id: string;
  user_id: string;
  token_family: string;
  created_at: string;
  expires_at: string;
  last_used: string;
  ip_address?: string | null;
  user_agent?: string | null;
  revoked: number;
  device_name?: string | null;
  device_type?: string | null;
  browser?: string | null;
  os?: string | null;
  last_active_at?: string | null;
}

export interface UserProvider {
  id: string;
  user_id: string;
  provider: "email" | "google" | "github" | "apple"; // apple is for Life and Lineage mobile app only
  provider_user_id?: string | null;
  email?: string | null;
  display_name?: string | null;
  image?: string | null;
  created_at: string;
  last_used_at: string;
}

export interface PasswordResetToken {
  id: string;
  token: string;
  user_id: string;
  expires_at: string;
  used_at?: string | null;
  created_at: string;
}

export interface Post {
  id: number;
  category: "blog" | "project"; // this is no longer used
  title: string;
  subtitle?: string;
  body: string;
  banner_photo?: string;
  date?: string | null;
  published: number; // 0 or 1 (sqlite)
  author_id: string;
  reads: number;
  attachments?: string;
  last_edited_date?: string | null;
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
  date?: string | null;
  published: boolean;
  author_id: string;
  reads: number;
  attachments: string;
  total_likes: number;
  total_comments: number;
  last_edited_date?: string | null;
}

export interface PostCardData {
  id: number;
  category: "blog" | "project";
  title: string;
  subtitle: string;
  banner_photo: string;
  date?: string | null;
  published: number;
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
  date?: string | null;
  published: boolean;
  author_id: string;
  reads: number;
  attachments: string;
  tags: Tag[];
  last_edited_date?: string | null;
}

export interface VisitorAnalytics {
  id: string;
  user_id?: string | null;
  path: string;
  method: string;
  referrer?: string | null;
  user_agent?: string | null;
  ip_address?: string | null;
  country?: string | null;
  device_type?: string | null;
  browser?: string | null;
  os?: string | null;
  session_id?: string | null;
  duration_ms?: number | null;
  fcp?: number | null;
  lcp?: number | null;
  cls?: number | null;
  fid?: number | null;
  inp?: number | null;
  ttfb?: number | null;
  dom_load?: number | null;
  load_complete?: number | null;
  created_at: string;
}

export interface AnalyticsQuery {
  userId?: string;
  path?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  limit?: number;
  offset?: number;
}
