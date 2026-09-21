//! Route-side vendor code → catalog-side vendor code.
//!
//! The router names its upstream accounts after the *surface* a vendor is
//! reached through, while `sdkwork-models` names them after the *company* that
//! owns the models. The two vocabularies are both correct and they are not the
//! same set:
//!
//! | surface (router account) | catalog vendor | why they differ                                                     |
//! |--------------------------|----------------|---------------------------------------------------------------------|
//! | `kling`                  | `kuaishou`     | Kling is Kuaishou's video product                                   |
//! | `jimeng`                 | `bytedance`    | Jimeng is ByteDance's image product                                 |
//! | `volcengine`             | `bytedance`    | Volcengine is ByteDance's cloud; it serves the `doubao-*`/`seed*` models |
//! | `gemini`                 | `google`       | Gemini is Google's model family                                     |
//! | `nano_banana`            | `google`       | Nano Banana is the Gemini image surface                             |
//!
//! ## Why a table is load-bearing, not cosmetic
//!
//! Pricing resolves against the **catalog** vocabulary: `pricing_rate` rows are
//! keyed by the catalog vendor (`kuaishou`, `bytedance`, `google` …), and no row
//! anywhere is keyed by `kling`/`jimeng`/`volcengine`/`gemini`/`nano_banana`.
//! Route planning, meanwhile, carries the **surface** vocabulary on
//! `route.supplier_code` and on the api code (`volcengine.video_generation`).
//!
//! Without this bridge the two halves of a correct system disagree: the catalog
//! ships the price, the router asks for it under a name the catalog never used,
//! and the route answers `502 routing_failed: no price is published`. That
//! failure looks exactly like a missing price book row, which is why it must be
//! fixed here rather than papered over by adding duplicate rate rows under the
//! surface name — duplicate rows would then themselves drift.
//!
//! ## Scope
//!
//! This is deliberately a **router-side** table. `sdkwork-models` owns the
//! canonical vendor vocabulary and must not learn about the router's surface
//! aliases; the router is the side that chose to accept surface-named inbound
//! routes, so the router is the side that translates.
//!
//! The seed's own completeness test
//! (`ai_routing_seed::vendor_account_completeness_covers_exactly_the_seeded_accounts`)
//! asserts the 28 bundled accounts equal **26 catalog vendors + 2 account-side
//! aliases**, and names this constant as the authority for that claim. Keeping
//! the two in step is what that test is for.
//!
//! `bytedance` is itself a catalog vendor *and* the alias target of `jimeng` and
//! `volcengine`, so it carries its own default account. That is not a duplicate:
//! the three name three different hosts (`ark.cn-beijing.volces.com` for the
//! catalog/Ark surface, `jimeng.jianying.com` for the consumer surface, and the
//! Volcengine cloud endpoints), and on the *pricing* side all three still
//! resolve to the one `bytedance` rate book through this table.

/// Canonical alias: `(surface_vendor, catalog_vendor)`.
///
/// Only surfaces that are **not themselves catalog vendors** belong here. A
/// vendor whose surface name already matches its catalog name (`vidu`, `suno`,
/// `elevenlabs`, `minimax`, …) must be absent, so an accidental typo cannot
/// silently redirect its pricing.
const VENDOR_CODE_ALIASES: &[(&str, &str)] = &[
    // Kuaishou's Kling video surface.
    ("kling", "kuaishou"),
    // ByteDance: Jimeng (image) and Volcengine (cloud) are two doors onto the
    // same catalog vendor.
    ("jimeng", "bytedance"),
    ("volcengine", "bytedance"),
    // Google's Gemini model family and its Nano Banana image surface.
    ("gemini", "google"),
    ("nano_banana", "google"),
];

/// Resolves a route-side vendor code to the vendor code `sdkwork-models`
/// publishes models and prices under.
///
/// Returns the input unchanged when it is already a catalog vendor (the common
/// case) or is unknown — an unknown vendor must keep failing loudly at pricing
/// rather than be silently redirected somewhere plausible.
pub fn catalog_vendor_code(route_vendor_code: &str) -> &str {
    let trimmed = route_vendor_code.trim();
    VENDOR_CODE_ALIASES
        .iter()
        .find(|(surface, _)| *surface == trimmed)
        .map(|(_, catalog)| *catalog)
        .unwrap_or(trimmed)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Every alias resolves to a vendor the catalog actually publishes.
    ///
    /// A typo in the right-hand column would otherwise redirect a whole
    /// capability's pricing to a vendor that does not exist, and the symptom
    /// (no price published) is identical to the defect this table fixes.
    #[test]
    fn every_alias_targets_a_catalog_vendor() {
        const CATALOG_VENDORS: &[&str] = &[
            "alibaba",
            "anthropic",
            "baidu",
            "black_forest_labs",
            "bytedance",
            "deepseek",
            "elevenlabs",
            "google",
            "kuaishou",
            "luma_ai",
            "meituan",
            "minimax",
            "moonshot",
            "mureka",
            "openai",
            "pixverse",
            "runway",
            "stability_ai",
            "stepfun",
            "suno",
            "tencent",
            "vidu",
            "xai",
            "xiaomi",
            "zhipu",
        ];
        for (surface, catalog) in VENDOR_CODE_ALIASES {
            assert!(
                CATALOG_VENDORS.contains(catalog),
                "alias {surface} -> {catalog} points at a vendor sdkwork-models does not publish"
            );
        }
    }

    /// A surface must never be its own alias, and the table must not contain an
    /// alias whose left side is a catalog vendor — that would mean the router
    /// and the catalog disagree about a vendor's own name.
    #[test]
    fn aliases_only_cover_non_catalog_surfaces() {
        for (surface, catalog) in VENDOR_CODE_ALIASES {
            assert_ne!(surface, catalog, "{surface} aliases itself");
            assert_ne!(
                *surface,
                *catalog,
                "{surface} -> {catalog} is not a translation"
            );
            assert!(
                !surface.contains('/') && !catalog.contains('/'),
                "{surface} -> {catalog} must be bare vendor codes, not catalog keys"
            );
        }
    }

    /// The three account-side aliases the seed's completeness test names must be
    /// present here, or that test's 27 = 25 + 3 arithmetic stops holding.
    #[test]
    fn seed_completeness_arithmetic_holds() {
        for surface in ["kling", "jimeng", "gemini"] {
            assert_ne!(
                catalog_vendor_code(surface),
                surface,
                "seed's completeness test counts {surface} as an account-side alias"
            );
        }
    }

    #[test]
    fn catalog_vendors_pass_through_and_unknowns_are_not_redirected() {
        for vendor in ["vidu", "suno", "elevenlabs", "minimax", "openai"] {
            assert_eq!(catalog_vendor_code(vendor), vendor);
        }
        assert_eq!(catalog_vendor_code("not_a_vendor"), "not_a_vendor");
        assert_eq!(catalog_vendor_code("  vidu  "), "vidu");
        assert_eq!(catalog_vendor_code(""), "");
    }
}
