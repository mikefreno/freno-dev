import { createTRPCRouter } from "../utils";
import { lineageAuthRouter } from "./lineage/auth";
import { lineageDatabaseRouter } from "./lineage/database";
import { lineageJsonServiceRouter } from "./lineage/json-service";
import { lineageMiscRouter } from "./lineage/misc";
import { lineagePvpRouter } from "./lineage/pvp";
import { lineageMaintenanceRouter } from "./lineage/maintenance";

export const lineageRouter = createTRPCRouter({
  // Authentication
  auth: lineageAuthRouter,

  // Database Management
  database: lineageDatabaseRouter,

  // PvP
  pvp: lineagePvpRouter,

  // JSON Service
  jsonService: lineageJsonServiceRouter,

  // Misc (Analytics, Tokens, etc.)
  misc: lineageMiscRouter,

  // Maintenance (Protected)
  maintenance: lineageMaintenanceRouter,
});