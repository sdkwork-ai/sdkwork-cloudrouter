import { lookup } from "node:dns/promises";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { isIP } from "node:net";
import { extname, resolve } from "node:path";

import type {
  LoadedSchemaSource,
  LoadSchemaSourceOptions,
  RemoteSchemaUrlPolicy,
  SchemaTextFormat,
} from "./types";

const DEFAULT_FETCH_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_REDIRECTS = 5;
const localRequire = createRequire(import.meta.url);
const generatorRequire = createRequire(
  new URL("../../../../sdkwork-sdk-generator/package.json", import.meta.url),
);

type YamlModule = {
  load(input: string): unknown;
};

type RemoteHostnameResolution =
  | {
      kind: "resolved";
      privateOrLocalAddress: string | null;
    }
  | {
      kind: "unresolved";
    };

export async function loadSchemaSource(
  options: LoadSchemaSourceOptions,
): Promise<LoadedSchemaSource> {
  switch (options.schema.kind) {
    case "file":
      return loadFileSchema(options.schema.value);
    case "url":
      return loadRemoteSchema(options.schema, options);
    case "raw":
      return loadRawSchema(options.schema.value, options.schema.format);
    case "object":
      return {
        schema: cloneSchema(options.schema.value),
        rawContent: JSON.stringify(options.schema.value, null, 2),
        source: {
          kind: "object",
          format: "object",
        },
      };
  }
}

async function loadFileSchema(filePath: string): Promise<LoadedSchemaSource> {
  const resolvedPath = resolve(filePath);
  const rawContent = await readFile(resolvedPath, "utf-8");
  const format = detectFormatFromPath(resolvedPath);

  return {
    schema: parseSchemaContent(rawContent, format),
    rawContent,
    source: {
      kind: "file",
      format,
      resolvedPath,
    },
  };
}

async function loadRemoteSchema(
  schema: Extract<LoadSchemaSourceOptions["schema"], { kind: "url" }>,
  options: LoadSchemaSourceOptions,
): Promise<LoadedSchemaSource> {
  const url = new URL(schema.value);
  await assertRemoteUrlAllowed(url, options.remoteUrlPolicy);

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS,
  );

  try {
    const { response, finalUrl } = await fetchRemoteSchemaResponse(
      url,
      schema.headers,
      controller.signal,
      options,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch schema: HTTP ${response.status}`);
    }

    const rawContent = await response.text();
    const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    if (Buffer.byteLength(rawContent, "utf-8") > maxBytes) {
      throw new Error("Schema payload exceeds the configured maxBytes limit.");
    }

    const format = detectFormatFromUrl(finalUrl.toString(), response.headers.get("content-type"));
    return {
      schema: parseSchemaContent(rawContent, format),
      rawContent,
      source: {
        kind: "url",
        format,
        url: finalUrl.toString(),
        contentType: response.headers.get("content-type"),
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function loadRawSchema(
  rawContent: string,
  format?: Exclude<SchemaTextFormat, "object">,
): Promise<LoadedSchemaSource> {
  const resolvedFormat = format ?? detectFormatFromContent(rawContent);
  return {
    schema: parseSchemaContent(rawContent, resolvedFormat),
    rawContent,
    source: {
      kind: "raw",
      format: resolvedFormat,
    },
  };
}

function parseSchemaContent(
  rawContent: string,
  format: Exclude<SchemaTextFormat, "object">,
): Record<string, any> {
  if (format === "json") {
    return JSON.parse(rawContent) as Record<string, any>;
  }

  return loadYamlModule().load(rawContent) as Record<string, any>;
}

function detectFormatFromPath(filePath: string): Exclude<SchemaTextFormat, "object"> {
  const extension = extname(filePath).toLowerCase();
  return extension === ".yaml" || extension === ".yml" ? "yaml" : "json";
}

function detectFormatFromUrl(
  url: string,
  contentType: string | null,
): Exclude<SchemaTextFormat, "object"> {
  const normalizedContentType = (contentType ?? "").toLowerCase();
  if (
    normalizedContentType.includes("yaml")
    || normalizedContentType.includes("x-yaml")
    || url.toLowerCase().endsWith(".yaml")
    || url.toLowerCase().endsWith(".yml")
  ) {
    return "yaml";
  }

  return "json";
}

function detectFormatFromContent(
  rawContent: string,
): Exclude<SchemaTextFormat, "object"> {
  const trimmed = rawContent.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return "json";
  }

  return "yaml";
}

function loadYamlModule(): YamlModule {
  try {
    return localRequire("js-yaml") as YamlModule;
  } catch {
    return generatorRequire("js-yaml") as YamlModule;
  }
}

function cloneSchema(schema: Record<string, unknown>): Record<string, any> {
  return JSON.parse(JSON.stringify(schema)) as Record<string, any>;
}

async function assertRemoteUrlAllowed(
  url: URL,
  policy: RemoteSchemaUrlPolicy | undefined,
): Promise<void> {
  assertSupportedRemoteSchemaProtocol(url);

  if (url.username || url.password) {
    throw new Error("Remote schema URLs must not include credentials.");
  }

  const hostname = normalizeHostname(url.hostname);
  if (matchesHostRules(hostname, policy?.blockedHosts)) {
    throw new Error(`Remote schema host is blocked: ${hostname}`);
  }

  if (policy?.allowedHosts?.length && !matchesHostRules(hostname, policy.allowedHosts)) {
    throw new Error(`Remote schema host is not in the allowlist: ${hostname}`);
  }

  if (!policy?.allowPrivateHosts && isPrivateOrLocalHost(hostname)) {
    throw new Error(`Remote schema host is private or local and is not allowed: ${hostname}`);
  }

  if (policy?.allowPrivateHosts || isIP(hostname)) {
    return;
  }

  const resolution = await resolveRemoteHostname(hostname);
  if (resolution.kind === "unresolved") {
    if (!policy?.allowUnresolvedHosts) {
      throw new Error(`Failed to resolve remote schema host for safety checks: ${hostname}`);
    }
    return;
  }

  if (resolution.privateOrLocalAddress) {
    throw new Error(
      `Remote schema host resolves to a private or local address: ${resolution.privateOrLocalAddress}`,
    );
  }
}

function assertSupportedRemoteSchemaProtocol(url: URL): void {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported schema URL protocol: ${url.protocol}`);
  }
}

function matchesHostRules(
  hostname: string,
  rules: string[] | undefined,
): boolean {
  return (rules ?? []).some((rule) => hostMatchesRule(hostname, rule));
}

function hostMatchesRule(hostname: string, rule: string): boolean {
  const normalizedRule = normalizeHostname(rule);
  if (!normalizedRule) {
    return false;
  }

  if (normalizedRule.startsWith("*.")) {
    const suffix = normalizedRule.slice(1);
    return hostname.endsWith(suffix) && hostname.length > suffix.length;
  }

  return hostname === normalizedRule;
}

function normalizeHostname(hostname: string): string {
  return hostname
    .trim()
    .replace(/^\[(.*)\]$/, "$1")
    .replace(/\.$/, "")
    .toLowerCase();
}

function isPrivateOrLocalHost(hostname: string): boolean {
  if (!hostname) {
    return false;
  }

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return true;
  }

  const ipVersion = isIP(hostname);
  if (ipVersion === 4) {
    return isPrivateOrLocalIpv4(hostname);
  }
  if (ipVersion === 6) {
    return isPrivateOrLocalIpv6(hostname);
  }

  return false;
}

function isPrivateOrLocalIpv4(hostname: string): boolean {
  const octets = hostname.split(".").map((part) => Number.parseInt(part, 10));
  const [first, second] = octets;

  return first === 0
    || first === 10
    || (first === 100 && second >= 64 && second <= 127)
    || first === 127
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 0)
    || (first === 192 && second === 168)
    || (first === 198 && (second === 18 || second === 19))
    || first >= 224;
}

function isPrivateOrLocalIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized === "::" || normalized === "::1") {
    return true;
  }

  if (normalized.startsWith("::ffff:")) {
    return isPrivateOrLocalHost(normalized.slice("::ffff:".length));
  }

  const firstHextet = normalized.split(":")[0] ?? "";
  if (firstHextet === "fc" || firstHextet === "fd") {
    return true;
  }
  if (firstHextet === "fe8" || firstHextet === "fe9" || firstHextet === "fea" || firstHextet === "feb") {
    return true;
  }
  if (firstHextet.startsWith("ff")) {
    return true;
  }

  return normalized.startsWith("fc")
    || normalized.startsWith("fd")
    || normalized.startsWith("fe8")
    || normalized.startsWith("fe9")
    || normalized.startsWith("fea")
    || normalized.startsWith("feb")
    || normalized.startsWith("ff");
}

async function resolveRemoteHostname(hostname: string): Promise<RemoteHostnameResolution> {
  try {
    const addresses = await lookup(hostname, {
      all: true,
      verbatim: true,
    });

    for (const entry of addresses) {
      const normalizedAddress = normalizeHostname(entry.address);
      if (isPrivateOrLocalHost(normalizedAddress)) {
        return {
          kind: "resolved",
          privateOrLocalAddress: normalizedAddress,
        };
      }
    }

    return {
      kind: "resolved",
      privateOrLocalAddress: null,
    };
  } catch {
    return {
      kind: "unresolved",
    };
  }
}

async function fetchRemoteSchemaResponse(
  initialUrl: URL,
  headers: Record<string, string> | undefined,
  signal: AbortSignal,
  options: LoadSchemaSourceOptions,
): Promise<{ response: Response; finalUrl: URL }> {
  let currentUrl = initialUrl;
  let currentHeaders = headers;
  let redirectsFollowed = 0;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const initialOrigin = initialUrl.origin;

  while (true) {
    const response = await fetch(currentUrl, {
      headers: currentHeaders,
      signal,
      redirect: "manual",
    });

    if (!isRedirectResponse(response.status)) {
      return {
        response,
        finalUrl: currentUrl,
      };
    }

    if (redirectsFollowed >= maxRedirects) {
      throw new Error("Remote schema URL exceeded the configured maxRedirects limit.");
    }

    const location = response.headers.get("location");
    if (!location) {
      throw new Error("Remote schema redirect response is missing a Location header.");
    }

    currentUrl = new URL(location, currentUrl);
    await assertRemoteUrlAllowed(currentUrl, options.remoteUrlPolicy);
    currentHeaders = currentHeaders !== undefined && currentUrl.origin === initialOrigin
      ? headers
      : undefined;
    redirectsFollowed += 1;
  }
}

function isRedirectResponse(status: number): boolean {
  return status === 301
    || status === 302
    || status === 303
    || status === 307
    || status === 308;
}
