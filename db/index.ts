import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * One codebase, two homes:
 *   - no env vars  → local file, runs offline on a laptop or a box in the community
 *   - TURSO_*      → hosted libSQL, for the Vercel deployment
 */
// LOCAL_ONLY=1 ignores any Turso credentials in the environment. `db:reset` sets
// it, so a destructive local command can never reach a hosted database — tsx
// auto-loads .env, which makes that easier to do by accident than it should be.
const forceLocal = process.env.LOCAL_ONLY === "1";
const url = (!forceLocal && process.env.TURSO_DATABASE_URL) || "file:./data/mvc-polls.db";
const authToken = forceLocal ? undefined : process.env.TURSO_AUTH_TOKEN;

const client = createClient(authToken ? { url, authToken } : { url });

export const db = drizzle(client, { schema });
export { schema };
