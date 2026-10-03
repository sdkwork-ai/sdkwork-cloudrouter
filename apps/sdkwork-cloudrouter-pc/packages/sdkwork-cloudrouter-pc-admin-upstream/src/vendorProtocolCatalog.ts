import type { LlmProtocolConfig } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import { VENDOR_CATALOG_MATRIX } from './generated/vendorCatalogMatrix.generated';
import type { VendorCatalogEntry, VendorCatalogRegionCode, VendorCatalogRegionEntry } from './vendorProtocolCatalog.types';

/**
 * Vendor × region official-endpoint lookups for the supplier form.
 *
 * ---------------------------------------------------------------------------
 * Where the data comes from
 * ---------------------------------------------------------------------------
 * The sdkwork-models catalog is the single authority for "which LLM API
 * protocols does this vendor's official API speak, and at which Base URL".
 * `tools/generate-cloudrouter-vendor-catalog.mjs` joins that catalog to the
 * vendor codes this form offers and emits
 * `generated/vendorCatalogMatrix.generated.ts`.
 *
 * Nothing in this module restates a host or a path prefix. Every value is read
 * from the generated matrix, so a catalog change reaches the console through
 * `pnpm models:vendor-catalog:write` and a stale matrix fails `pnpm models:vendor-catalog:check`
 * instead of silently going missing the way the retired hand-written tables did.
 *
 * ---------------------------------------------------------------------------
 * Three answers, and why they differ
 * ---------------------------------------------------------------------------
 * Lookups return one of three states on purpose:
 *
 *   - the vendor is not described by the catalog at all -> `null`/`undefined`.
 *     The operator is left unrestricted, exactly as before. This covers
 *     `openai_compatible` (an aggregator shape, not a publisher) and `jimeng`
 *     (a ByteDance product line the catalog has no vendor directory for).
 *   - the vendor is described and publishes LLM API protocols -> that protocol
 *     set, each with its official Base URL. The form auto-checks them.
 *   - the vendor is described and publishes NO OpenAI/Anthropic-compatible
 *     face (the media vendors: Kling, Runway, Suno, Vidu, …) -> an empty set,
 *     plus a `nativeBaseUrl` for the non-LLM default Base URL. An empty set is
 *     a positive statement, not a missing answer: this vendor really has no LLM
 *     API protocol, so the form must not demand one.
 */

const FORM_PROTOCOLS: readonly LlmProtocolConfig['protocolCode'][] = [
  'openai_chat_completions',
  'openai_responses',
  'anthropic_messages',
];

/** Region selector values that mean the mainland-China market half. */
const CN_REGION_ALIASES = ['cn', 'china', 'mainland', 'china_mainland', 'zh'];

/** Collapse any catalog/DB region value onto the two halves the catalog publishes. */
export function normalizeVendorRegion(regionCode: string | null | undefined): VendorCatalogRegionCode {
  const normalized = (regionCode ?? '').trim().toLowerCase();
  return CN_REGION_ALIASES.includes(normalized) ? 'cn' : 'global';
}

/** The generated entry for a form vendor code, or undefined when undescribed. */
export function vendorCatalogEntry(vendorCode: string | null | undefined): VendorCatalogEntry | undefined {
  if (!vendorCode) return undefined;
  return VENDOR_CATALOG_MATRIX[vendorCode];
}

/**
 * Region lookup.
 *
 * The requested region wins. A fallback to the vendor's other region is allowed
 * ONLY when the catalog publishes that vendor in a single region, which is how
 * the mainland-only vendors (StepFun, Zhipu, Tencent, Baidu, Meituan, Xiaomi)
 * still resolve for an operator whose selector sits on `global`.
 *
 * A vendor published in BOTH regions is never substituted: PixVerse publishes a
 * global host and, for mainland China, a per-workspace Alibaba Cloud host that
 * cannot be written as a fixed domain. Falling back there would silently prefill
 * the global host into a mainland supplier, which is worse than prefilling
 * nothing.
 */
function regionEntry(
  vendorCode: string | null | undefined,
  regionCode: string | null | undefined,
): { region: VendorCatalogRegionCode; entry: VendorCatalogRegionEntry } | undefined {
  const entry = vendorCatalogEntry(vendorCode);
  if (!entry) return undefined;
  const region = normalizeVendorRegion(regionCode);
  const exact = entry.regions[region];
  if (exact) return { region, entry: exact };
  const published = Object.keys(entry.regions) as VendorCatalogRegionCode[];
  if (published.length === 1) return { region: published[0], entry: entry.regions[published[0]] as VendorCatalogRegionEntry };
  return undefined;
}

/**
 * The LLM API protocols the catalog declares for this vendor, across both
 * regions.
 *
 * `null`  — the catalog does not describe this vendor; leave the operator free.
 * `[]`    — the vendor publishes no LLM API protocol at all.
 * `[...]` — exactly these protocols; the form auto-checks them.
 */
export function vendorSupportedProtocols(vendorCode: string | null | undefined): LlmProtocolConfig['protocolCode'][] | null {
  const entry = vendorCatalogEntry(vendorCode);
  if (!entry || entry.catalogVendorCode === null) return null;
  const codes = new Set<LlmProtocolConfig['protocolCode']>();
  for (const region of Object.values(entry.regions)) {
    for (const code of Object.keys(region.protocols) as LlmProtocolConfig['protocolCode'][]) {
      if (FORM_PROTOCOLS.includes(code)) codes.add(code);
    }
  }
  return FORM_PROTOCOLS.filter((code) => codes.has(code));
}

export interface VendorProtocolDefaultUrl {
  baseUrl: string;
  region: VendorCatalogRegionCode;
}

/** Official default Base URL of one protocol, or undefined when the catalog publishes none. */
export function resolveVendorProtocolDefaultUrl(
  vendorCode: string | null | undefined,
  regionCode: string | null | undefined,
  protocolCode: LlmProtocolConfig['protocolCode'],
): VendorProtocolDefaultUrl | undefined {
  const resolved = regionEntry(vendorCode, regionCode);
  const baseUrl = resolved?.entry.protocols[protocolCode];
  if (!resolved || !baseUrl) return undefined;
  return { baseUrl, region: resolved.region };
}

export function vendorProtocolDefaultBaseUrl(
  vendorCode: string | null | undefined,
  regionCode: string | null | undefined,
  protocolCode: LlmProtocolConfig['protocolCode'],
): string {
  return resolveVendorProtocolDefaultUrl(vendorCode, regionCode, protocolCode)?.baseUrl ?? '';
}

/**
 * Official default Base URL of the vendor's own native API surface — the
 * endpoint used for image, video, audio and music calls. Undefined for vendors
 * that publish no such host.
 */
export function vendorNativeBaseUrl(vendorCode: string | null | undefined, regionCode: string | null | undefined): string | undefined {
  return regionEntry(vendorCode, regionCode)?.entry.nativeBaseUrl;
}

/**
 * Why the catalog publishes no dialable official address for this vendor, when
 * that is a deliberate catalog fact rather than a missing entry.
 *
 * Solo case today: Suno publishes no official public API, so a console that
 * showed a blank Base URL with no explanation would look broken, and one that
 * filled in a reseller's host would be wrong. Undefined means the vendor is
 * either fully described or not described at all.
 */
export function vendorAddressUnavailableReason(vendorCode: string | null | undefined): string | undefined {
  return vendorCatalogEntry(vendorCode)?.addressUnavailable;
}

/**
 * The Base URL to prefill the supplier's non-LLM "default Base URL" with: the
 * vendor's native host when it publishes one, otherwise the vendor's primary
 * LLM protocol endpoint (mainland vendors serve media off the same host).
 * Undefined when the catalog publishes neither.
 */
export function vendorDefaultBaseUrl(vendorCode: string | null | undefined, regionCode: string | null | undefined): string | undefined {
  const native = vendorNativeBaseUrl(vendorCode, regionCode);
  if (native) return native;
  for (const protocolCode of FORM_PROTOCOLS) {
    const resolved = resolveVendorProtocolDefaultUrl(vendorCode, regionCode, protocolCode);
    if (resolved) return resolved.baseUrl;
  }
  return undefined;
}

/** The vendor's standard address for the current region, used by the endpoint-row generator hint. */
export function vendorStandardBaseUrl(vendorCode: string | null | undefined, regionCode: string | null | undefined): string | undefined {
  return vendorDefaultBaseUrl(vendorCode, regionCode);
}

/** Path component of a standard Base URL, so a typed bare domain can inherit the vendor's prefix. */
function standardPathPrefix(vendorCode: string | null | undefined, regionCode: string | null | undefined): string {
  const standard = vendorStandardBaseUrl(vendorCode, regionCode);
  if (!standard) return '';
  try {
    const { pathname } = new URL(standard);
    return pathname === '/' ? '' : pathname.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

/**
 * Turn an operator-typed value into a Base URL:
 * - blank input resolves to the vendor's standard address for the region;
 * - a value that already carries a scheme is kept verbatim;
 * - anything else is read as a host and gets `https://` plus the vendor's
 *   standard path prefix.
 */
export function resolveVendorBaseUrl(vendorCode: string | null | undefined, regionCode: string | null | undefined, input: string): string {
  const trimmed = input.trim();
  if (trimmed === '') return vendorStandardBaseUrl(vendorCode, regionCode) ?? '';
  if (trimmed.includes('://')) return trimmed;
  const host = trimmed.replace(/\/+$/, '');
  return `https://${host}${standardPathPrefix(vendorCode, regionCode)}`;
}
