import { createClient, type Client } from "@libsql/client/web";
import { env } from "~/env/server";

let mainDBConnection: Client | null = null;
let lineageDBConnection: Client | null = null;
let nessaDBConnection: Client | null = null;
let nookDBConnection: Client | null = null;

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

export function NookConnectionFactory() {
  if (!nookDBConnection) {
    const config = {
      url: env.NOOK_DB_URL,
      authToken: env.NOOK_DB_TOKEN
    };
    nookDBConnection = createClient(config);
  }
  return nookDBConnection;
}
