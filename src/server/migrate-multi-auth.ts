import { ConnectionFactory } from "./database";
import { v4 as uuidV4 } from "uuid";

/**
 * Migration script to add multi-provider and enhanced session support
 * Run this script once to migrate existing database
 */

export async function migrateMultiAuth() {
  const conn = ConnectionFactory();
  console.log("[Migration] Starting multi-auth migration...");

  try {
    // Step 1: Check if UserProvider table exists
    const tableCheck = await conn.execute({
      sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='UserProvider'"
    });

    if (tableCheck.rows.length > 0) {
      console.log(
        "[Migration] UserProvider table already exists, skipping creation"
      );
    } else {
      console.log("[Migration] Creating UserProvider table...");
      await conn.execute(`
        CREATE TABLE UserProvider (
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
        )
      `);

      console.log("[Migration] Creating UserProvider indexes...");
      await conn.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_user_provider_provider_user ON UserProvider (provider, provider_user_id)"
      );
      await conn.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_user_provider_provider_email ON UserProvider (provider, email)"
      );
      await conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_user_provider_user_id ON UserProvider (user_id)"
      );
      await conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_user_provider_provider ON UserProvider (provider)"
      );
      await conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_user_provider_email ON UserProvider (email)"
      );
    }

    // Step 2: Check if Session table has device columns
    const sessionColumnsCheck = await conn.execute({
      sql: "PRAGMA table_info(Session)"
    });
    const hasDeviceName = sessionColumnsCheck.rows.some(
      (row: any) => row.name === "device_name"
    );

    if (hasDeviceName) {
      console.log(
        "[Migration] Session table already has device columns, skipping"
      );
    } else {
      console.log("[Migration] Adding device columns to Session table...");
      await conn.execute("ALTER TABLE Session ADD COLUMN device_name TEXT");
      await conn.execute("ALTER TABLE Session ADD COLUMN device_type TEXT");
      await conn.execute("ALTER TABLE Session ADD COLUMN browser TEXT");
      await conn.execute("ALTER TABLE Session ADD COLUMN os TEXT");

      // SQLite doesn't support non-constant defaults in ALTER TABLE
      // Add column with NULL default, then update existing rows
      await conn.execute("ALTER TABLE Session ADD COLUMN last_active_at TEXT");

      // Update existing rows to set last_active_at = last_used
      console.log(
        "[Migration] Updating existing sessions with last_active_at..."
      );
      await conn.execute(
        "UPDATE Session SET last_active_at = COALESCE(last_used, created_at) WHERE last_active_at IS NULL"
      );

      console.log("[Migration] Creating Session indexes...");
      await conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_session_last_active ON Session (last_active_at)"
      );
      await conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_session_user_active ON Session (user_id, revoked, last_active_at)"
      );
    }

    // Step 3: Migrate existing users to UserProvider table
    console.log("[Migration] Checking for users to migrate...");
    const usersResult = await conn.execute({
      sql: "SELECT id, email, provider, display_name, image, apple_user_string FROM User WHERE provider IS NOT NULL"
    });

    console.log(
      `[Migration] Found ${usersResult.rows.length} users to migrate`
    );

    let migratedCount = 0;
    for (const row of usersResult.rows) {
      const user = row as any;

      // Skip apple provider users (they're for Life and Lineage mobile app, not website auth)
      if (user.provider === "apple") {
        console.log(
          `[Migration] Skipping user ${user.id} with apple provider (mobile app only)`
        );
        continue;
      }

      // Check if already migrated
      const existingProvider = await conn.execute({
        sql: "SELECT id FROM UserProvider WHERE user_id = ? AND provider = ?",
        args: [user.id, user.provider || "email"]
      });

      if (existingProvider.rows.length > 0) {
        console.log(
          `[Migration] User ${user.id} already migrated, skipping`
        );
        continue;
      }

      // Determine provider_user_id based on provider type
      let providerUserId: string | null = null;
      if (user.provider === "github") {
        providerUserId = user.display_name;
      } else if (user.provider === "google") {
        providerUserId = user.email;
      } else {
        providerUserId = user.email;
      }

      try {
        await conn.execute({
          sql: `INSERT INTO UserProvider (id, user_id, provider, provider_user_id, email, display_name, image)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            uuidV4(),
            user.id,
            user.provider || "email",
            providerUserId,
            user.email,
            user.display_name,
            user.image
          ]
        });
        migratedCount++;
      } catch (error: any) {
        console.error(
          `[Migration] Failed to migrate user ${user.id}:`,
          error.message
        );
      }
    }

      // Determine provider_user_id based on provider type
      let providerUserId: string | null = null;
      if (user.provider === "github") {
        providerUserId = user.display_name;
      } else if (user.provider === "google") {
        providerUserId = user.email;
      } else if (user.provider === "apple") {
        providerUserId = user.apple_user_string;
      } else {
        providerUserId = user.email;
      }

      try {
        await conn.execute({
          sql: `INSERT INTO UserProvider (id, user_id, provider, provider_user_id, email, display_name, image)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            uuidV4(),
            user.id,
            user.provider || "email",
            providerUserId,
            user.email,
            user.display_name,
            user.image
          ]
        });
        migratedCount++;
      } catch (error: any) {
        console.error(
          `[Migration] Failed to migrate user ${user.id}:`,
          error.message
        );
      }
    }

    console.log(`[Migration] Migrated ${migratedCount} users successfully`);

    // Step 4: Verification
    console.log("[Migration] Running verification queries...");
    const providerCount = await conn.execute({
      sql: "SELECT COUNT(*) as count FROM UserProvider"
    });
    console.log(
      `[Migration] Total providers in UserProvider table: ${(providerCount.rows[0] as any).count}`
    );

    const multiProviderUsers = await conn.execute({
      sql: `SELECT COUNT(*) as count FROM (
              SELECT user_id FROM UserProvider GROUP BY user_id HAVING COUNT(*) > 1
            )`
    });
    console.log(
      `[Migration] Users with multiple providers: ${(multiProviderUsers.rows[0] as any).count}`
    );

    console.log("[Migration] Multi-auth migration completed successfully!");
    return {
      success: true,
      migratedUsers: migratedCount,
      totalProviders: (providerCount.rows[0] as any).count
    };
  } catch (error) {
    console.error("[Migration] Migration failed:", error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateMultiAuth()
    .then((result) => {
      console.log("[Migration] Result:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("[Migration] Error:", error);
      process.exit(1);
    });
}
