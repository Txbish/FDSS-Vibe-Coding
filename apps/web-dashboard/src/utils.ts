/**
 * Simple UUID v4 fallback (no external dependency).
 * Not cryptographically secure — fine for form IDs.
 */
export function v4Fallback(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
