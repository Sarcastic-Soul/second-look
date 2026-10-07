// Applies the SQL files in drizzle/ over Neon's HTTP driver (drizzle-kit push hangs on some networks).
// Run: bun scripts/migrate.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

await migrate(drizzle(neon(process.env.DATABASE_URL!)), { migrationsFolder: "drizzle" });
console.log("migrations applied");
