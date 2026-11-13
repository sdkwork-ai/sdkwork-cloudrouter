/**
 * Payment domain defaults for the admin payment center.
 *
 * PSP callbacks must target the public API gateway (the canonical
 * `api.<base-domain>` host), not the console page the operator is browsing.
 * The callback quick-add form therefore derives the API host from the current
 * console host instead of copying it verbatim.
 */

const CONSOLE_HOST_PREFIXES = new Set(["platform", "console", "admin", "www"]);

const IPV4_LITERAL = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/**
 * Resolves the public API hostname used for payment webhooks.
 *
 * - `platform.birdcoder.com` → `api.birdcoder.com`
 * - `www.sdkwork.com` → `api.sdkwork.com`
 * - an `api.*` host, `localhost`, or an IP literal is returned unchanged.
 *
 * A host that does not look like a console host is left untouched so the
 * operator can still edit it; the field is never silently rewritten on save.
 */
export function resolvePublicApiHostname(hostname: string): string {
  const host = hostname.trim().toLowerCase();
  if (!host) {
    return "";
  }
  if (host === "localhost" || host.includes(":") || IPV4_LITERAL.test(host)) {
    return host;
  }
  if (host.startsWith("api.")) {
    return host;
  }
  const labels = host.split(".");
  if (labels.length >= 3 && CONSOLE_HOST_PREFIXES.has(labels[0])) {
    return `api.${labels.slice(1).join(".")}`;
  }
  return host;
}
