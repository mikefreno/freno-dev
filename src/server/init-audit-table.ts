import { ConnectionFactory } from "./database";

async function initAuditTable() {
  console.log("🔧 Initializing AuditLog table...");

  try {
    const conn = ConnectionFactory();

    await conn.execute({
      sql: `CREATE TABLE IF NOT EXISTS AuditLog (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        event_type TEXT NOT NULL,
        event_data TEXT,
        ip_address TEXT,
        user_agent TEXT,
        success INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE SET NULL
      )`
    });

    console.log("✅ AuditLog table created (or already exists)");

    console.log("🔧 Creating indexes...");

    await conn.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_audit_user_id ON AuditLog(user_id)`
    });

    await conn.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_audit_event_type ON AuditLog(event_type)`
    });

    await conn.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_audit_created_at ON AuditLog(created_at)`
    });

    await conn.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_audit_ip_address ON AuditLog(ip_address)`
    });

    console.log("✅ Indexes created");

    const result = await conn.execute({
      sql: `SELECT name FROM sqlite_master WHERE type='table' AND name='AuditLog'`
    });

    if (result.rows.length > 0) {
      console.log("✅ AuditLog table verified - ready for use!");

      const countResult = await conn.execute({
        sql: `SELECT COUNT(*) as count FROM AuditLog`
      });

      console.log(
        `📊 Current audit log entries: ${countResult.rows[0]?.count || 0}`
      );
    } else {
      console.error("❌ AuditLog table was not created properly");
      process.exit(1);
    }

    console.log("\n✅ Audit logging system is ready!");
    console.log("💡 You can now use the audit logging features");
    console.log("📖 See docs/AUDIT_LOGGING.md for usage examples\n");
  } catch (error) {
    console.error("❌ Failed to initialize AuditLog table:");
    console.error(error);
    process.exit(1);
  }
}

if (import.meta.main) {
  initAuditTable()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { initAuditTable };
