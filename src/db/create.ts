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
      registered_at TEXT NOT NULL DEFAULT (datetime('now')),
      failed_attempts INTEGER DEFAULT 0,
      locked_until TEXT
    );
  `,
  Session: `
     CREATE TABLE Session
     (
       id TEXT PRIMARY KEY,
       user_id TEXT NOT NULL,
       token_family TEXT NOT NULL,
       refresh_token_hash TEXT NOT NULL,
       parent_session_id TEXT,
       rotation_count INTEGER DEFAULT 0,
       created_at TEXT NOT NULL DEFAULT (datetime('now')),
       expires_at TEXT NOT NULL,
       access_token_expires_at TEXT NOT NULL,
       last_used TEXT NOT NULL DEFAULT (datetime('now')),
       ip_address TEXT,
       user_agent TEXT,
       revoked INTEGER DEFAULT 0,
       device_name TEXT,
       device_type TEXT,
       browser TEXT,
       os TEXT,
       last_active_at TEXT DEFAULT (datetime('now')),
       FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE,
       FOREIGN KEY (parent_session_id) REFERENCES Session(id) ON DELETE SET NULL
     );
     CREATE INDEX IF NOT EXISTS idx_session_user_id ON Session (user_id);
     CREATE INDEX IF NOT EXISTS idx_session_expires_at ON Session (expires_at);
     CREATE INDEX IF NOT EXISTS idx_session_token_family ON Session (token_family);
     CREATE INDEX IF NOT EXISTS idx_session_refresh_token_hash ON Session (refresh_token_hash);
     CREATE INDEX IF NOT EXISTS idx_session_revoked ON Session (revoked);
     CREATE INDEX IF NOT EXISTS idx_session_last_active ON Session (last_active_at);
     CREATE INDEX IF NOT EXISTS idx_session_user_active ON Session (user_id, revoked, last_active_at);
  `,
  UserProvider: `
    CREATE TABLE UserProvider
    (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL CHECK(provider IN ('email', 'google', 'github', 'apple')),
      provider_user_id TEXT,
      email TEXT,
      display_name TEXT,
      image TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_used_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_provider_provider_user ON UserProvider (provider, provider_user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_provider_provider_email ON UserProvider (provider, email);
    CREATE INDEX IF NOT EXISTS idx_user_provider_user_id ON UserProvider (user_id);
    CREATE INDEX IF NOT EXISTS idx_user_provider_provider ON UserProvider (provider);
    CREATE INDEX IF NOT EXISTS idx_user_provider_email ON UserProvider (email);
  `,
  PasswordResetToken: `
    CREATE TABLE PasswordResetToken
    (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_password_reset_token ON PasswordResetToken (token);
    CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON PasswordResetToken (user_id);
    CREATE INDEX IF NOT EXISTS idx_password_reset_expires_at ON PasswordResetToken (expires_at);
  `,
  Post: `
    CREATE TABLE Post
    (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL UNIQUE,
      subtitle TEXT,
      body TEXT NOT NULL,
      banner_photo TEXT,
      date TEXT,
      published INTEGER NOT NULL,
      category TEXT,
      author_id TEXT NOT NULL,
      reads INTEGER NOT NULL DEFAULT 0,
      attachments TEXT,
      last_edited_date TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_posts_category ON Post (category);
    CREATE INDEX IF NOT EXISTS idx_posts_published ON Post (published);
    CREATE INDEX IF NOT EXISTS idx_posts_date ON Post (date);
    CREATE INDEX IF NOT EXISTS idx_posts_published_date ON Post (published, date);
  `,
  PostLike: `
    CREATE TABLE PostLike 
    (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      post_id INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_user_post ON PostLike (user_id, post_id);
    CREATE INDEX IF NOT EXISTS idx_likes_post_id ON PostLike (post_id);
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
    CREATE INDEX IF NOT EXISTS idx_tag_value ON Tag (value);
    CREATE INDEX IF NOT EXISTS idx_tag_post_value ON Tag (post_id, value);
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
