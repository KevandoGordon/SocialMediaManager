/** Deterministic PRNG so mock numbers stay stable between reloads. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** ISO timestamp relative to the start of today (local time). Mock data is anchored to "now" so the calendar always looks busy. */
export function at(dayOffset: number, hour = 9, minute = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function minutesAgo(m: number) {
  return new Date(Date.now() - m * 60_000).toISOString();
}

/** Stamps a workspace onto seed records so each file can stay focused on its content. */
export function inWorkspace<T extends { workspaceId: string }>(workspaceId: string, rows: Omit<T, "workspaceId">[]): T[] {
  return rows.map((r) => ({ ...r, workspaceId }) as T);
}
