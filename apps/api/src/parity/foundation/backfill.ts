import { getDatabasePool } from "../../database";
import { backfillLifecycle } from "./controllers/sync-lifecycle";
import { seedCategories } from "./controllers/columns";

try {
  await seedCategories();
  console.log(
    `Backfilled lifecycle history for ${await backfillLifecycle()} tasks.`,
  );
} finally {
  await getDatabasePool().end();
}
