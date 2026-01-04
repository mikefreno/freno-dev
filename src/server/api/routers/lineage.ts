import { createTRPCRouter } from "../utils";
import { lineageAuthRouter } from "./lineage/auth";
import { lineageDatabaseRouter } from "./lineage/database";
import { lineageJsonServiceRouter } from "./lineage/json-service";
import { lineageMiscRouter } from "./lineage/misc";
import { lineagePvpRouter } from "./lineage/pvp";
import { lineageMaintenanceRouter } from "./lineage/maintenance";

export const lineageRouter = createTRPCRouter({
  auth: lineageAuthRouter,

  database: lineageDatabaseRouter,

  pvp: lineagePvpRouter,

  jsonService: lineageJsonServiceRouter,

  misc: lineageMiscRouter,

  maintenance: lineageMaintenanceRouter
});
