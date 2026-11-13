import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/database/schema-parity.ts",
  out: "./drizzle-parity",
  dialect: "postgresql",
  migrations: { table: "__drizzle_parity_migrations", schema: "drizzle" },
});
