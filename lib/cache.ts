/**
 * A small in-process cache for the handful of rows that every page reads and
 * almost nothing changes: the event, and the five items.
 *
 * The database answers from Tokyo, ~130ms from the Mumbai function, and those
 * two reads sit at the front of every render with everything else waiting
 * behind them. Holding them for a few seconds takes that off the critical path
 * without any resident seeing their own registration go stale — nothing here
 * caches per-villa data, and every write path reads the item straight from the
 * database to check the deadline before it accepts anything.
 *
 * The cache lives in one server instance's memory. Vercel runs several, so two
 * residents can be up to `ttlMs` apart from each other. That is fine for what
 * is kept here and would not be fine for anything else.
 */

type Entry<T> = { value: T; at: number };

const store = new Map<string, Entry<unknown>>();
const inFlight = new Map<string, { promise: Promise<unknown>; startedAt: number }>();

/**
 * A refresh that never settles must not wedge the key forever. Serverless
 * freezes instances between requests, so an in-flight promise can simply stop
 * existing, and without this the key would serve its last value for the life
 * of the instance.
 */
const STUCK_MS = 10_000;

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();

  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && now - hit.at < ttlMs) return hit.value;

  // Two requests arriving together on the same instance should cost one query.
  const pending = inFlight.get(key);
  if (pending && now - pending.startedAt < STUCK_MS) return pending.promise as Promise<T>;

  const promise = load().then(
    (value) => {
      store.set(key, { value, at: Date.now() });
      inFlight.delete(key);
      return value;
    },
    (err) => {
      inFlight.delete(key);
      // A blip reaching Tokyo shouldn't take the app down mid-festival. If we
      // ever had a value, serving it beats an error page.
      const stale = store.get(key) as Entry<T> | undefined;
      if (stale) return stale.value;
      throw err;
    },
  );

  inFlight.set(key, { promise, startedAt: now });
  return promise;
}

/** Drop cached rows so the next read goes to the database. */
export function bust(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
