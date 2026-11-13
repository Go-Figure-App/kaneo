import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { getDatabase } from "../../database";

export async function migrateParity(
  database: ReturnType<typeof getDatabase>,
  migrationsFolder: string,
) {
  await migrate(database, {
    migrationsFolder,
    migrationsTable: "__drizzle_parity_migrations",
    migrationsSchema: "drizzle",
  });
}
