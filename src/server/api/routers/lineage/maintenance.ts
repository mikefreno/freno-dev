import { createTRPCRouter, adminProcedure } from "../../utils";
import { LineageConnectionFactory } from "~/server/utils";
import { env } from "~/env/server";
import { TRPCError } from "@trpc/server";
import { createClient as createAPIClient } from "@tursodatabase/api";

const IGNORE = ["frenome", "magic-delve-conductor"];

export const lineageMaintenanceRouter = createTRPCRouter({
  findLooseDatabases: adminProcedure.query(async () => {
    const conn = LineageConnectionFactory();
    const query = "SELECT database_url FROM User WHERE database_url IS NOT NULL";

    try {
      const res = await conn.execute(query);
      const turso = createAPIClient({
        org: "mikefreno",
        token: env.TURSO_DB_API_TOKEN,
      });
      const linkedDatabaseUrls = res.rows.map((row) => row.database_url);

      const all_dbs = await turso.databases.list();
      const dbs_to_delete = all_dbs.filter((db) => {
        return !IGNORE.includes(db.name) && !linkedDatabaseUrls.includes(db.name);
      });

      return {
        success: true,
        looseDatabases: dbs_to_delete,
        count: dbs_to_delete.length,
      };
    } catch (e) {
      console.error("Error finding loose databases:", e);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to find loose databases",
      });
    }
  }),

  cleanupExpiredDatabases: adminProcedure.query(async () => {
    const conn = LineageConnectionFactory();
    const query =
      "SELECT * FROM User WHERE datetime(db_destroy_date) < datetime('now');";

    try {
      const res = await conn.execute(query);
      const turso = createAPIClient({
        org: "mikefreno",
        token: env.TURSO_DB_API_TOKEN,
      });

      const deletedDatabases = [];

      for (const row of res.rows) {
        const db_url = row.database_url;

        try {
          await turso.databases.delete(db_url as string);
          const updateQuery =
            "UPDATE User SET database_url = ?, database_token = ?, db_destroy_date = ? WHERE id = ?";
          const params = [null, null, null, row.id];
          await conn.execute({ sql: updateQuery, args: params });
          deletedDatabases.push(db_url);
        } catch (deleteErr) {
          console.error(`Failed to delete database ${db_url}:`, deleteErr);
        }
      }

      return {
        success: true,
        deletedDatabases,
        count: deletedDatabases.length,
      };
    } catch (e) {
      console.error("Error cleaning up expired databases:", e);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to cleanup expired databases",
      });
    }
  }),
});
