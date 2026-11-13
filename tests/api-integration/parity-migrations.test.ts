import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client, Pool } from "pg";
import { expect, it } from "vite-plus/test";
import { schema } from "../../apps/api/src/database";
import { prepareDatabaseStartup } from "../../apps/api/src/database/prepare-database-startup";
import { resolveDatabaseConfig } from "../../apps/api/src/database/resolve-database-url";
import { migrateParity } from "../../apps/api/src/parity/foundation/migrate";

it("applies both migration sets to upstream's shape, preserves its schema and repeats cleanly", async () => {
  const adminUrl = new URL(process.env.DATABASE_URL!);
  if (!["localhost", "127.0.0.1"].includes(adminUrl.hostname))
    throw new Error("Migration rehearsal requires a local database");
  adminUrl.pathname = "/postgres";
  const admin = new Client({ connectionString: adminUrl.toString() });
  const name = `parity_${randomUUID().replaceAll("-", "")}_test`;
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);
  const localUrl = new URL(adminUrl);
  localUrl.pathname = `/${name}`;
  const pool = new Pool({ connectionString: localUrl.toString() });
  const database = drizzle(pool, { schema });
  const upstream = resolve(import.meta.dirname, "../../apps/api/drizzle");
  const parity = resolve(import.meta.dirname, "../../apps/api/drizzle-parity");
  try {
    await migrate(database, { migrationsFolder: upstream });
    const snapshot = () =>
      pool.query(
        "SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name NOT LIKE '%_ext' ORDER BY table_name, ordinal_position",
      );
    const before = (await snapshot()).rows;
    const ledger = (
      await pool.query("SELECT * FROM drizzle.__drizzle_migrations ORDER BY id")
    ).rows;
    const startup = () =>
      prepareDatabaseStartup({
        resolveConfig: () => resolveDatabaseConfig(),
        waitForDatabase: async () => {
          await database.execute(sql`SELECT 1`);
        },
        runStartupMigrations: async () => {
          await migrate(database, { migrationsFolder: upstream });
          await migrateParity(database, parity);
        },
        logInfo: () => {},
      });
    await startup();
    await startup();
    expect((await snapshot()).rows).toEqual(before);
    expect(
      (
        await pool.query(
          "SELECT * FROM drizzle.__drizzle_migrations ORDER BY id",
        )
      ).rows,
    ).toEqual(ledger);
    expect(
      (await pool.query("SELECT * FROM drizzle.__drizzle_parity_migrations"))
        .rows,
    ).toHaveLength(1);
    const tables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('task_ext', 'column_ext', 'workspace_ext', 'project_ext')",
    );
    expect(tables.rows).toHaveLength(4);
    // A previous API build can still execute the original migration sequence.
    await migrate(database, { migrationsFolder: upstream });
  } finally {
    await pool.end();
    await admin.query(`DROP DATABASE "${name}"`);
    await admin.end();
  }
});
