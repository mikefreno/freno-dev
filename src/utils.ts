import { createClient } from "@libsql/client/web";
import { env } from "~/env/server";

export function ConnectionFactory() {
  const config = {
    url: env.TURSO_DB_URL,
    authToken: env.TURSO_DB_TOKEN,
  };

  const conn = createClient(config);
  return conn;
}
