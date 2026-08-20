import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * One codebase, two homes:
 *   - no env vars  → local file, runs offline on a laptop or a box in the community
 *   - TURSO_*      → hosted libSQL, for the Vercel deployment
 */
const url = process.env.TURSO_DATABASE_URL ?? "file:./data/mvc-polls.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient(authToken ? { url, authToken } : { url });

export const db = drizzle(client, { schema });
export { schema };
