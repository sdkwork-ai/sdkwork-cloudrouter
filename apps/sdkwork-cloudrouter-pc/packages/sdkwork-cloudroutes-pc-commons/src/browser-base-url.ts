function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (normalized === 'localhost' || normalized === '::1') {
    return true;
  }
  const octets = normalized.split('.');
  return octets.length === 4
    && octets.every((octet) => /^\d+$/u.test(octet) && Number(octet) >= 0 && Number(octet) <= 255)
    && Number(octets[0]) === 127;
}

/**
 * Rebinds a server-machine loopback URL to the host used by the browser.
 *
 * ENVIRONMENT_SPEC §6.3 protocol adaptation: the rebound origin also follows
 * the page scheme — the management edge serves both schemes on the same host,
 * so an http:// page never targets an https:// loopback origin and vice versa.
 */
export function resolveBrowserReachableBaseUrl(
  baseUrl: string,
  location: Pick<Location, 'hostname' | 'protocol'> | undefined = typeof window === 'undefined' ? undefined : window.location,
): string {
  const trimmedBaseUrl = baseUrl.trim();
  if (!trimmedBaseUrl || !location?.hostname) {
    return trimmedBaseUrl;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmedBaseUrl);
  } catch {
    return trimmedBaseUrl;
  }

  if (!isLoopbackHostname(parsed.hostname) || isLoopbackHostname(location.hostname)) {
    return trimmedBaseUrl;
  }

  const browserHostname = location.hostname.replace(/^\[|\]$/g, '');
  parsed.hostname = browserHostname.includes(':') ? `[${browserHostname}]` : browserHostname;
  const pageProtocol = location.protocol;
  if (
    (parsed.protocol === 'http:' || parsed.protocol === 'https:')
    && (pageProtocol === 'http:' || pageProtocol === 'https:')
    && parsed.protocol !== pageProtocol
  ) {
    parsed.protocol = pageProtocol;
  }
  return parsed.toString().replace(/\/$/u, '');
}
