export const model: { [key: string]: string } = {
  User: `
    CREATE TABLE User 
    (
      id TEXT NOT NULL PRIMARY KEY,
      email TEXT UNIQUE,
      email_verified INTEGER DEFAULT 0,
      password_hash TEXT,
      display_name TEXT,
      provider TEXT,
      image TEXT,
      registered_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `,
  Post: `
    CREATE TABLE Post
    (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL UNIQUE,
      subtitle TEXT,
      body TEXT NOT NULL,
      banner_photo TEXT,
      date TEXT NOT NULL DEFAULT (datetime('now')),
      published INTEGER NOT NULL,
      category TEXT,
      author_id TEXT NOT NULL,
      reads INTEGER NOT NULL DEFAULT 0,
      attachments TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_posts_category ON Post (category);
  `,
  PostLike: `
    CREATE TABLE PostLike 
    (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      post_id INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_user_post ON PostLike (user_id, post_id);
  `,
  Comment: `
    CREATE TABLE Comment 
    (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      body TEXT NOT NULL,
      post_id INTEGER,
      parent_comment_id INTEGER,
      date TEXT NOT NULL DEFAULT (datetime('now')),
      edited INTEGER NOT NULL DEFAULT 0,
      commenter_id TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_comment_commenter_id ON Comment (commenter_id);
    CREATE INDEX IF NOT EXISTS idx_comment_parent_comment_id ON Comment (parent_comment_id);
    CREATE INDEX IF NOT EXISTS idx_comment_post_id ON Comment (post_id);
  `,
  CommentReaction: `
    CREATE TABLE CommentReaction 
    (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      comment_id INTEGER NOT NULL,
      user_id TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_reaction_user_type_comment ON CommentReaction (user_id, type, comment_id);
  `,
  Connection: `
    CREATE TABLE Connection 
    (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      connection_id TEXT NOT NULL,
      post_id INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_connection_post_id ON Connection (post_id);
  `,
  Tag: `
    CREATE TABLE Tag
    (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      value TEXT NOT NULL,
      post_id INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tag_post_id ON Tag (post_id);
  `,
  PostHistory: `
    CREATE TABLE PostHistory
    (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      parent_id INTEGER,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      is_saved INTEGER DEFAULT 0,
      FOREIGN KEY (post_id) REFERENCES Post(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_history_post_id ON PostHistory (post_id);
    CREATE INDEX IF NOT EXISTS idx_history_parent_id ON PostHistory (parent_id);
  `
};
