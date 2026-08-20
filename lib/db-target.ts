/**
 * Human-readable name for whichever database the CLI scripts are about to write
 * to. Printed by migrate and seed, because "which database did that just hit?"
 * is the easiest and most expensive mistake to make here.
 */
export function describeTarget(): string {
  // Must mirror db/index.ts exactly. A target line that disagrees with the
  // connection it describes is worse than no line at all.
  const url = process.env.LOCAL_ONLY === "1" ? undefined : process.env.TURSO_DATABASE_URL;
  if (!url) return "local file · data/mvc-polls.db";
  if (url.startsWith("file:")) return `local file · ${url.slice(5)}`;
  try {
    return `remote · ${new URL(url.replace(/^libsql:/, "https:")).host}`;
  } catch {
    return `remote · ${url}`;
  }
}
