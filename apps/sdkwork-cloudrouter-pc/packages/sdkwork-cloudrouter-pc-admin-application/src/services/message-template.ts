/**
 * Message template expansion.
 *
 * Catalog copy carries placeholders such as `{count}` / `{page}`. Rendering
 * them is a pure string operation, kept here so every App Center surface (page,
 * panel, footer) expands the same catalog entry the same way.
 */
export function templateMessage(
  value: string,
  replacements: Record<string, string>,
): string {
  return Object.entries(replacements).reduce(
    (result, [key, replacement]) => result.replace(`{${key}}`, replacement),
    value,
  );
}
