import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import type { getDatabase } from "../../database";

export async function migrateParity(
  database: ReturnType<typeof getDatabase>,
  migrationsFolder: string,
) {
  const connection = await database.$client.connect();
  try {
    // Hold the same session from before the ledger read through migration commit.
    await connection.query("SELECT pg_advisory_lock(742190, 0)");
    await migrate(drizzle(connection), {
      migrationsFolder,
      migrationsTable: "__drizzle_parity_migrations",
      migrationsSchema: "drizzle",
    });
    await connection.query("SELECT pg_advisory_unlock(742190, 0)");
  } catch (error) {
    // Closing a failed session releases its advisory lock and avoids returning
    // a potentially broken transaction to the pool. Preserve the original error.
    connection.release(true);
    throw error;
  }
  connection.release();
}
