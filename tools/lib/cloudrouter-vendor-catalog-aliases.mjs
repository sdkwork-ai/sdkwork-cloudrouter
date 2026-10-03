/**
 * Cloud Router routing-vendor code -> sdkwork-models catalog vendor code, plus
 * the vendors for which the console may not prefill an official address.
 *
 * ---------------------------------------------------------------------------
 * Why an alias table is needed at all
 * ---------------------------------------------------------------------------
 * The two catalogs answer different questions and therefore name vendors
 * differently.
 *
 *   - The sdkwork-models catalog names the **model publisher**. Its own rule
 *     (`sdkwork-models/README.md`, "Vendor and Region Identity") is that
 *     `vendorCode` "is the stable model vendor identity and must not encode a
 *     product line or operating region".
 *   - The Cloud Router routing catalog (`data/ai-routing/resources/*.json`)
 *     names the **routing counterparty**: the thing an operator can point an
 *     upstream account at. Some of those codes are product lines or platforms
 *     (`kling`, `jimeng`, `volcengine`) or API shapes (`openai_compatible`)
 *     rather than publishers.
 *
 * Where the two names differ for the same publisher, this table says so. It is
 * the only place the mapping lives: the generator applies it, and the frontend
 * consumes the already-joined output, so no second copy can drift.
 */

/**
 * Add an entry only when the Cloud Router vendor genuinely dials the catalog
 * publisher's own hosts, so the catalog's published Base URLs are the right
 * answer for it:
 *
 *   gemini      -> google      both publish generativelanguage.googleapis.com
 *   volcengine  -> bytedance   both publish ark.cn-beijing.volces.com (Volcengine Ark)
 *   kling       -> kuaishou    Kling is Kuaishou's model family and publishes Kuaishou's hosts
 */
export const CATALOG_VENDOR_CODE_ALIASES = Object.freeze({
  gemini: 'google',
  volcengine: 'bytedance',
  kling: 'kuaishou',
});

/**
 * Vendors the console must leave for the operator to configure, with the reason
 * it shows them.
 *
 * Declaring them here — rather than letting the generator shrug at any vendor it
 * cannot resolve — is what makes the gate meaningful: a vendor added to
 * `data/ai-routing/resources/*.json` without an official address now fails
 * `pnpm models:vendor-catalog:check` and forces a decision instead of silently shipping
 * a console that offers empty fields with no explanation.
 *
 * `counterpart` records whether sdkwork-models publishes the publisher at all.
 * That distinction is real and the console shows it: `false` means the routing
 * catalog names something the models catalog does not model, `true` means the
 * publisher exists but publishes no dialable official address.
 */
export const VENDORS_WITHOUT_CATALOG_ADDRESS = Object.freeze({
  openai_compatible: {
    counterpart: false,
    reason:
      'Aggregator shape, not a model publisher: it has no official host of its own, so its Base URLs are operator-configured.',
  },
  jimeng: {
    counterpart: false,
    reason:
      "ByteDance's consumer brand. Its models are cataloged under `bytedance`, but its own surface "
      + '(visual.volcengineapi.com) is not the Ark host, so aliasing it would prefill the wrong Base URL. '
      + 'Closing this gap means adding a `jimeng` vendor directory to sdkwork-models.',
  },
  suno: {
    counterpart: true,
    reason:
      'Suno publishes no official public API: it has released no self-serve developer access and no API '
      + 'documentation. The catalog entry therefore carries no nativeApiBaseUrl, and the console must not '
      + 'substitute the third-party services that resell Suno (api.sunoapi.org and similar are not Suno).',
  },
});
