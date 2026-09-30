/**
 * Brand tokens make the published copy re-brandable without a code change.
 *
 * Homepage copy reaches the browser from two places: `/admin/site` (operator-authored, authoritative
 * when set) and the bundled i18n resources (the shipped default). Both are authored as *templates*
 * rather than finished sentences, so a deployment that renames the product in the console sees the
 * new name everywhere it is mentioned — instead of the old one surviving in whichever strings the
 * author happened to hardcode.
 *
 * Resolution is deliberately centralised here: a component that interpolates for itself is how one
 * surface ends up substituting a token and another leaving `{{siteName}}` on screen.
 */

/** Values a template may reference. All are plain strings so the map can go straight into i18next. */
export interface BrandTokenVariables {
  siteName: string;
  productName: string;
  version: string;
  [token: string]: string;
}

/** `{{ token }}` — inner whitespace tolerated, token must be a plain word. */
const TOKEN_PATTERN = /\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g;

/**
 * Substitutes `{{token}}` placeholders, leaving unknown tokens verbatim.
 *
 * Leaving an unknown token in place is deliberate: `{{version}}` legitimately has no value while a
 * release is unversioned, and inventing an empty string would silently delete the surrounding
 * sentence's meaning. A literal `{{version}}` on screen is a visible, reportable defect, which is
 * the better failure.
 */
export function interpolateBrandTokens(
  template: string,
  variables: BrandTokenVariables,
): string {
  return template.replace(TOKEN_PATTERN, (match, token: string) => {
    const value = variables[token];
    return typeof value === 'string' && value.length > 0 ? value : match;
  });
}

/**
 * Resolves the effective copy for one field.
 *
 * An operator override always wins — that is what makes the console authoritative. When it is
 * absent the shipped default is used and the same token pass still applies, so a default that
 * embeds the brand follows a rename too.
 */
export function resolveBrandText(
  override: string | undefined,
  fallback: string,
  variables: BrandTokenVariables,
): string {
  const template = typeof override === 'string' && override.trim().length > 0 ? override : fallback;
  return interpolateBrandTokens(template, variables);
}

/**
 * True when the template still references a token that has no value.
 *
 * Used by the console-side validation path to reject copy that would publish a raw `{{token}}`.
 */
export function findUnresolvedBrandTokens(
  template: string,
  variables: BrandTokenVariables,
): string[] {
  const unresolved = new Set<string>();
  for (const match of template.matchAll(TOKEN_PATTERN)) {
    const token = match[1];
    const value = variables[token];
    if (typeof value !== 'string' || value.length === 0) {
      unresolved.add(token);
    }
  }
  return [...unresolved];
}
