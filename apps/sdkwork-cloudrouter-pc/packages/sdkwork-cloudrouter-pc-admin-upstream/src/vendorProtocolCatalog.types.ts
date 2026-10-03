/**
 * Shape of the generated vendor catalog matrix.
 *
 * Kept in its own module with no imports so the generated data file can import
 * the type without creating a runtime cycle with the accessors.
 */

/** The three LLM API protocol codes the supplier form can declare. */
export type VendorCatalogProtocolCode =
  | 'openai_chat_completions'
  | 'openai_responses'
  | 'anthropic_messages';

/** The supplier form's region selector: the two market halves the catalog publishes. */
export type VendorCatalogRegionCode = 'cn' | 'global';

export interface VendorCatalogRegionEntry {
  /** Official default Base URL per protocol, derived from the catalog's `protocolBaseUrls`. */
  protocols: Partial<Record<VendorCatalogProtocolCode, string>>;
  /**
   * Official default Base URL of the vendor's own native API surface, derived
   * from the catalog's `nativeApiBaseUrl`. Present for vendors that publish no
   * OpenAI/Anthropic-compatible face (the media-only vendors), and used to
   * prefill the supplier's non-LLM default Base URL.
   */
  nativeBaseUrl?: string;
}

export interface VendorCatalogEntry {
  /**
   * The sdkwork-models vendor this Cloud Router vendor was resolved from.
   * `null` means the routing catalog offers the vendor but the models catalog
   * publishes no such publisher (an aggregator shape), so the console has no
   * official data and leaves the operator unrestricted.
   */
  catalogVendorCode: string | null;
  /**
   * Present only for a vendor the catalog models but for which it publishes no
   * dialable official address (Suno publishes no public API at all). The console
   * shows this reason instead of an unexplained empty Base URL field — and it
   * must never substitute a third-party reseller's host.
   */
  addressUnavailable?: string;
  /** Entries are omitted for regions the catalog does not publish. */
  regions: Partial<Record<VendorCatalogRegionCode, VendorCatalogRegionEntry>>;
}

/** Keyed by the Cloud Router vendor code the supplier form offers. */
export type VendorCatalogMatrix = Record<string, VendorCatalogEntry>;
