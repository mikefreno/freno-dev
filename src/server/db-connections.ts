import { createClient } from "@libsql/client/web";
import { env } from "~/env/server";

let mainDBConnection: ReturnType<typeof createClient> | null = null;
let lineageDBConnection: ReturnType<typeof createClient> | null = null;
let nessaDBConnection: ReturnType<typeof createClient> | null = null;

export function ConnectionFactory() {
  if (!mainDBConnection) {
    const config = {
      url: env.TURSO_DB_URL,
      authToken: env.TURSO_DB_TOKEN
    };
    mainDBConnection = createClient(config);
  }
  return mainDBConnection;
}

export function LineageConnectionFactory() {
  if (!lineageDBConnection) {
    const config = {
      url: env.TURSO_LINEAGE_URL,
      authToken: env.TURSO_LINEAGE_TOKEN
    };
    lineageDBConnection = createClient(config);
  }
  return lineageDBConnection;
}

export function NessaConnectionFactory() {
  if (!nessaDBConnection) {
    const config = {
      url: env.NESSA_DB_URL,
      authToken: env.NESSA_DB_TOKEN
    };
    nessaDBConnection = createClient(config);
  }
  return nessaDBConnection;
}
