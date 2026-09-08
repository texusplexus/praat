const KEY = "praat.anonId";

/** Stable anonymous id for this browser, so pilot sessions can be grouped. */
export function getAnonId(): string {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
