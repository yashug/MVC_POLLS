/** The community runs on IST; the server may not. Everything user-facing goes through here. */
export const IST_OFFSET_MIN = 330;

/** Build a Date from an IST wall-clock time. */
export function ist(y: number, m: number, d: number, h = 0, min = 0): Date {
  return new Date(Date.UTC(y, m - 1, d, h, min) - IST_OFFSET_MIN * 60_000);
}

export function formatIst(
  date: Date | number | null | undefined,
  opts: Intl.DateTimeFormatOptions = {},
): string {
  if (date == null) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    ...opts,
  }).format(new Date(date));
}

export const fmtDateTime = (d: Date | number | null | undefined) =>
  formatIst(d, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

export const fmtDate = (d: Date | number | null | undefined) =>
  formatIst(d, { day: "numeric", month: "long", weekday: "short" });

/** Format an instant for a <input type="datetime-local"> showing IST wall-clock. */
export function toLocalInput(d: Date | number | null | undefined): string {
  if (d == null) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(d));
  const g = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}
