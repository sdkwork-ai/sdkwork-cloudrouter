/**
 * Pure textarea <-> allowlist helpers for the CORS settings panel.
 *
 * Kept separate from the network service so the normalization rules are unit
 * testable without the SDK runtime.
 */

/** Splits the editor textarea into trimmed, non-empty, de-duplicated origins. */
export function parseOriginLines(text: string): string[] {
  const seen = new Set<string>();
  const origins: string[] = [];
  for (const raw of text.split(/\r?\n/u)) {
    const origin = raw.trim();
    if (!origin || seen.has(origin)) {
      continue;
    }
    seen.add(origin);
    origins.push(origin);
  }
  return origins;
}

/** Renders the allowlist back into one-origin-per-line editor text. */
export function formatOriginLines(origins: readonly string[]): string {
  return origins.join('\n');
}
