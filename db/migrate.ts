import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./index";
import { describeTarget } from "../lib/db-target";

console.log(`→ ${describeTarget()}`);

migrate(db, { migrationsFolder: "./db/migrations" })
  .then(() => { console.log("✓ migrations applied"); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
