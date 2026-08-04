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

/** Rebinds a server-machine loopback URL to the host used by the browser. */
export function resolveBrowserReachableBaseUrl(
  baseUrl: string,
  location: Pick<Location, 'hostname'> | undefined = typeof window === 'undefined' ? undefined : window.location,
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
  return parsed.toString().replace(/\/$/u, '');
}
