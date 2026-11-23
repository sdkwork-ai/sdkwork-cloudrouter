//! Model id compatibility: inbound wire spelling → catalog identity → outbound
//! supplier id.
//!
//! OpenRouter-style clients pass model ids as `vendor/slug` — `openai/gpt-4o`,
//! `anthropic/claude-opus-4.5`, optionally with a trailing variant suffix
//! (`anthropic/claude-opus-4.5:free`) or behind a relay namespace
//! (`openrouter/anthropic/claude-opus-4.5`). Clients also reach this gateway
//! through spellings that are *not* canonical OpenRouter but mean the same
//! model: a colon instead of the slash, half-width or full-width
//! (`anthropic:claude-opus-4.5`, `anthropic：claude-opus-4.5`, including the
//! IME habit of a space after the colon and the `Anthropic: Claude Opus 4.5`
//! display-label shape). The catalog meanwhile stores native model ids:
//! Anthropic publishes `claude-opus-4-5` (hyphens) where the OpenRouter wire
//! id uses `4.5` (dots), and relay access layers are overlays, not catalog
//! vendors (`TECH-32-sdkwork-models-standard.md` §4.2).
//!
//! Exact-match-only resolution therefore 503s every OpenRouter-formatted
//! request for a model the catalog actually serves. This module defines the
//! tolerant matching cascade that closes that gap; catalog implementations
//! apply it **only after their exact lookup misses**, so well-formed requests
//! keep their existing resolution, and multi-key matches stay ambiguous
//! (routing never guesses).
//!
//! The same module owns the three decisions that must agree on every surface:
//! the ordered routing identities (`vendor/model` → bare model id), the
//! supplier-facing outbound id (official native / relay qualified / explicit
//! override preserved), and path-segment percent coding for Gemini-style
//! media routes. HTTP field-name mechanics live in
//! `application::invocation::model_fields`; this domain layer stays free of
//! transport shapes.
//!
//! ## Scope
//!
//! Deliberately a **router-side** table, same principle as
//! [`super::vendor_code_alias`]: the router is the side that chose to accept
//! OpenRouter-formatted inbound ids, so the router is the side that translates.
//! `sdkwork-models` owns the canonical model vocabulary and must not learn
//! wire dialects. The relay namespace list mirrors the private
//! `relay_provider_namespace_prefix` in `sdkwork-models` (`openrouter`,
//! `siliconflow`, `together`, `fireworks`, `groq`); if a new relay namespace
//! is added there, add it here too.

/// One tolerant-resolution probe for a requested model id, in priority order.
///
/// A catalog implementation tries its exact index first (the caller's
/// responsibility, so hot-path requests never allocate probes), then walks
/// these probes; the first probe that resolves at least one catalog key wins.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum ModelAliasProbe {
    /// Catalog key or model name equals the string verbatim.
    Exact(String),
    /// Slug equality against the whole catalog key or model name.
    FullSlug(String),
    /// Slug equality against the model-id segment of the catalog key (the
    /// tail after the last `/`) or the model name. Vendor-agnostic last
    /// resort: it also absorbs relay vendor slugs that differ from catalog
    /// vendor codes (`x-ai/grok-4` → `xai/grok-4`).
    PartSlug(String),
}

impl ModelAliasProbe {
    fn is_empty(&self) -> bool {
        match self {
            ModelAliasProbe::Exact(value)
            | ModelAliasProbe::FullSlug(value)
            | ModelAliasProbe::PartSlug(value) => value.is_empty(),
        }
    }
}

/// Relay access layers whose namespace prefix is an overlay identity, not a
/// catalog vendor. Mirrors `relay_provider_namespace_prefix` in
/// `sdkwork-models`.
const RELAY_PROVIDER_NAMESPACES: &[&str] =
    &["openrouter", "siliconflow", "together", "fireworks", "groq"];

/// OpenRouter 的公开变体后缀（`:free` / `:beta` / `:nitro` / `:extended` /
/// `:online` / `:thinking` / `:floor` / `:precise`）。只有名单内的尾段才被
/// 当作变体剥掉；名单外的冒号尾段一律按 vendor/model 分隔符解释——这正是
/// `anthropic:claude-opus-4-5`（分隔符 + 纯词模型名）与 `model:variant`
/// 歧义时的裁决规则，而误判为分隔符的未知"变体"最多解析不到（与改动前的
/// 503 等价），不会路由错模型。
const KNOWN_VARIANT_SUFFIXES: &[&str] = &[
    "free", "beta", "nitro", "extended", "online", "thinking", "floor", "precise",
];

/// Splits one trailing `:variant` segment off a model id. Returns
/// `(base, Some(variant))` only when the tail is one of
/// [`KNOWN_VARIANT_SUFFIXES`]; anything else keeps the value unchanged, so
/// `anthropic:claude-opus-4-5` is read as vendor/model, not as a variant.
/// Dropping a recognized variant routes the request at the base model instead
/// of failing it (the catalog has no row for OpenRouter routing preferences).
fn split_variant_suffix(value: &str) -> (&str, Option<&str>) {
    if let Some((head, variant)) = value.rsplit_once(':') {
        if !head.is_empty()
            && KNOWN_VARIANT_SUFFIXES
                .iter()
                .any(|known| known.eq_ignore_ascii_case(variant.trim()))
        {
            return (head, Some(variant));
        }
    }
    (value, None)
}

/// Wire-id punctuation normalization applied before probe generation:
///
/// 1. full-width `：`（中文输入法的冒号）folded to ASCII `:`;
/// 2. one trailing `:variant` suffix split off first, so it is never mistaken
///    for a separator (`gpt-4o:free` keeps its variant);
/// 3. remaining `:` segments treated as vendor/model separators and rewritten
///    to `/` (`anthropic:claude-opus-4.5` → `anthropic/claude-opus-4.5`),
///    with each segment trimmed（容忍中文输入法在冒号后留下的空格，以及
///    `Anthropic: Claude Opus 4.5` 这类展示标签形态）, then the variant
///    re-attached.
///
/// Ids whose head legitimately contains `:` (OpenAI fine-tune ids such as
/// `ft:gpt-4o-2024-08-13:org:abc`) survive harmlessly: the rewritten form
/// matches no catalog id, and exact lookups for the original spelling have
/// already been tried by the caller.
pub(crate) fn normalize_wire_model_id(value: &str) -> String {
    let folded = value
        .trim()
        .replace('：', ":")
        .replace('｜', "|")
        .replace('／', "/");
    let (base, variant) = split_variant_suffix(&folded);
    let rewritten = base
        .split([':', '|', '/'])
        .map(str::trim)
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<_>>()
        .join("/");
    match variant {
        Some(variant) => format!("{rewritten}:{variant}"),
        None => rewritten,
    }
}

/// Normalized comparison form of a model id: trimmed, full-width `：` folded
/// to `:`, lowercased, whitespace runs folded to `-`, `.` folded to `-`
/// (OpenRouter `claude-opus-4.5` vs native `claude-opus-4-5`), with at most
/// one trailing known `:variant` segment stripped. Symmetric on both sides of
/// a comparison: catalog ids contain none of the folded punctuation, so
/// folding only ever merges spellings of the same id, never distinct ids.
pub(crate) fn model_alias_slug(value: &str) -> String {
    let folded = value.trim().replace('：', ":");
    let (base, _) = split_variant_suffix(&folded);
    base.split_whitespace()
        .collect::<Vec<_>>()
        .join("-")
        .to_ascii_lowercase()
        .replace('.', "-")
}

/// The requested id with a leading relay namespace stripped
/// (`openrouter/anthropic/claude-opus-4.5` → `anthropic/claude-opus-4.5`).
/// `None` when the id does not carry a relay namespace.
pub(crate) fn relay_namespace_stripped(value: &str) -> Option<String> {
    let (prefix, rest) = value.trim().split_once('/')?;
    let rest = rest.trim();
    let namespaced = RELAY_PROVIDER_NAMESPACES
        .iter()
        .any(|namespace| namespace.eq_ignore_ascii_case(prefix.trim()));
    namespaced
        .then(|| rest.to_owned())
        .filter(|rest| !rest.is_empty())
}

/// The model-id segment of a catalog key or wire id: the tail after the last
/// `/`, or the whole value when it carries no `/`.
pub(crate) fn model_id_segment(value: &str) -> &str {
    value.trim().rsplit('/').next().unwrap_or(value.trim())
}

/// Ordered routing identities for a requested model id.
///
/// 1. The vendor-qualified catalog identity: `vendor/modelId`, with request
///    separators normalized (`deepseek:deepseek-flash` →
///    `deepseek/deepseek-flash`, full-width forms folded, relay overlays
///    preserved) and one leading `region` segment dropped
///    (`deepseek/cn/deepseek-flash` → `deepseek/deepseek-flash`). This is what
///    the caller resolves and routes first.
/// 2. The bare model id: the part a vendor addresses the model by
///    (`deepseek-flash`, or `anthropic/claude-opus-4.5` behind a relay
///    namespace). This is the fallback identity: if the vendor-qualified
///    route cannot be selected, routing retries with the bare model id.
///
/// Duplicates (case-insensitive) and empty values are dropped. A request that
/// never carried a vendor prefix yields exactly one identity (the normalized
/// id) and the routing layer has nothing to fall back to.
pub(crate) fn model_route_identities(requested_model: &str) -> Vec<String> {
    let normalized = normalize_wire_model_id(requested_model);
    if normalized.is_empty() {
        return Vec::new();
    }
    let mut identities = Vec::with_capacity(2);
    if let Some(identity) = crate::domain::parse_request_model_identity(&normalized) {
        push_route_identity(
            &mut identities,
            &format!("{}/{}", identity.vendor_code, identity.model_id()),
        );
        push_route_identity(&mut identities, &identity.model_id());
    } else {
        push_route_identity(&mut identities, &normalized);
    }
    identities
}

fn push_route_identity(identities: &mut Vec<String>, value: &str) {
    let value = value.trim();
    if value.is_empty()
        || identities
            .iter()
            .any(|existing| existing.eq_ignore_ascii_case(value))
    {
        return;
    }
    identities.push(value.to_owned());
}

/// Every JSON/query/multipart field a vendor-native request may use to name a
/// model. The OpenAI surface uses `model`, Anthropic/OpenAI use `model`,
/// ElevenLabs/MiniMax audio use `model_id`, Kling uses `model_name`.
pub(crate) const MODEL_REQUEST_FIELD_NAMES: [&str; 5] =
    ["model", "model_name", "modelName", "model_id", "modelId"];

/// Resolves the model id written into the provider request body/query/path.
///
/// Official suppliers receive the vendor-native id; relays receive the
/// fully-qualified catalog key; an explicit `provider_model` that names a
/// different model is preserved. The resolved catalog key is authoritative
/// when present, which also strips vendor slugs the shared catalog parser's
/// known-vendor table does not list yet.
///
/// Returns `None` only when every input is blank.
pub(crate) fn resolve_provider_model_id(
    supplier_type: Option<&str>,
    catalog_key: Option<&str>,
    model: Option<&str>,
    provider_model: Option<&str>,
) -> Option<String> {
    let catalog_key = catalog_key.map(str::trim).filter(|value| !value.is_empty());
    let model = model.map(str::trim).filter(|value| !value.is_empty());
    let provider_model = provider_model
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let native_from_catalog = catalog_key.and_then(catalog_native_model_id);
    let relay = supplier_type.is_some_and(|kind| kind.trim().eq_ignore_ascii_case("relay"));

    if let Some(value) = provider_model {
        if !provider_is_catalog_spelling(value, catalog_key, native_from_catalog.as_deref()) {
            // An explicit override is the account's authoritative model name
            // (mapping target, Azure deployment, provider-native alias). It may
            // intentionally contain a vendor-looking head, so it is never
            // passed through the known-vendor stripper; a relay still gets its
            // separators folded into the qualified form it addresses models by.
            return Some(if relay {
                canonical_qualified_model_id(value)
            } else {
                value.to_owned()
            });
        }
    }

    if relay {
        return catalog_key
            .map(str::to_owned)
            .or_else(|| provider_model.map(canonical_qualified_model_id))
            .or_else(|| model.map(str::to_owned));
    }

    if let Some(native) = native_from_catalog {
        return Some(native);
    }
    // API-resource media routes often carry a model that has no catalog row
    // (vendor-native video/audio/music ids such as `seedance-1.0`). Apply the
    // shared parser so a known vendor prefix (`deepseek/deepseek-flash`,
    // `openai/gpt-4o`) is still removed before dialing an official vendor.
    provider_model
        .map(crate::domain::provider_native_model_id)
        .or_else(|| model.map(crate::domain::provider_native_model_id))
}

/// The model-id segment of a canonical `vendor/model` catalog key.
fn catalog_native_model_id(catalog_key: &str) -> Option<String> {
    crate::domain::parse_model_catalog_identity(catalog_key)
        .map(|identity| identity.model_id())
        .filter(|value| !value.is_empty())
}

/// Whether the configured provider model merely spells the catalog model:
/// either the catalog key itself or a dialect spelling whose model part is the
/// catalog-native id (`deepseek:deepseek-flash`, `zhipuai/glm-4.6`).
///
/// A different model id is an explicit override and must be preserved.
fn provider_is_catalog_spelling(
    provider_model: &str,
    catalog_key: Option<&str>,
    native_from_catalog: Option<&str>,
) -> bool {
    if catalog_key.is_some_and(|key| provider_model.eq_ignore_ascii_case(key)) {
        return true;
    }
    let Some(native) = native_from_catalog else {
        return false;
    };
    if crate::domain::provider_native_model_id(provider_model).eq_ignore_ascii_case(native) {
        return true;
    }
    crate::domain::parse_request_model_identity(provider_model)
        .map(|identity| identity.model_id().eq_ignore_ascii_case(native))
        .unwrap_or(false)
}

/// Canonicalizes a `vendor/model` id without dropping the vendor head.
///
/// Relay suppliers are addressed by the qualified id, so their dialect
/// spellings (`vendor:model`, full width) must be folded without losing the
/// vendor segment.
fn canonical_qualified_model_id(value: &str) -> String {
    match crate::domain::parse_request_model_identity(value) {
        Some(identity) => format!("{}/{}", identity.vendor_code, identity.model_id()),
        None => value.to_owned(),
    }
}

/// Percent-decodes a model id read from a URL path segment.
///
/// Gemini-style media paths carry the model inside the path
/// (`/v1beta/models/{model}:generateImages`). An OpenRouter-shaped id contains
/// `/`, so clients percent-encode it (`anthropic%2Fclaude-opus-4.5`). The
/// catalog must see the decoded id, while the outbound path must be encoded
/// again.
pub(crate) fn decode_model_path_segment(value: &str) -> String {
    let bytes = value.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' && index + 2 < bytes.len() {
            if let Ok(hex) = std::str::from_utf8(&bytes[index + 1..index + 3]) {
                if let Ok(byte) = u8::from_str_radix(hex, 16) {
                    decoded.push(byte);
                    index += 3;
                    continue;
                }
            }
        }
        decoded.push(bytes[index]);
        index += 1;
    }
    String::from_utf8(decoded).unwrap_or_else(|_| value.to_owned())
}

/// Percent-encodes a model id for use inside a URL path segment. `/` must be
/// encoded so a relay-qualified id stays one path segment.
pub(crate) fn encode_model_path_segment(value: &str) -> String {
    let mut encoded = String::with_capacity(value.len());
    for byte in value.bytes() {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~') {
            encoded.push(char::from(byte));
        } else {
            encoded.push('%');
            encoded.push_str(&format!("{byte:02X}"));
        }
    }
    encoded
}

/// Fallback probes for a requested model id whose exact lookup missed, in
/// priority order: the separator-normalized exact form（`:`/`：` 分隔符改写，
/// 仅当与原请求拼写不同）, then relay-stripped exact + slug forms (highest
/// fidelity), then whole-id slugs (relay-stripped before raw), then the
/// vendor-agnostic model-id segment slug. Empty and duplicate probes are
/// dropped.
pub(crate) fn model_alias_probes(requested_model: &str) -> Vec<ModelAliasProbe> {
    let trimmed = requested_model.trim();
    if trimmed.is_empty() {
        return Vec::new();
    }
    let normalized = normalize_wire_model_id(trimmed);
    let mut probes = Vec::new();
    if normalized != trimmed {
        probes.push(ModelAliasProbe::Exact(normalized.clone()));
    }
    if let Some(stripped) = relay_namespace_stripped(&normalized) {
        probes.push(ModelAliasProbe::Exact(stripped.clone()));
        probes.push(ModelAliasProbe::FullSlug(model_alias_slug(&stripped)));
    }
    probes.push(ModelAliasProbe::FullSlug(model_alias_slug(&normalized)));
    probes.push(ModelAliasProbe::PartSlug(model_alias_slug(
        model_id_segment(&normalized),
    )));
    probes.into_iter().filter(|probe| !probe.is_empty()).fold(
        Vec::with_capacity(5),
        |mut deduped, probe| {
            if !deduped.contains(&probe) {
                deduped.push(probe);
            }
            deduped
        },
    )
}

/// Does the catalog model (`catalog_key` + bare `model` name) satisfy the
/// probe? Kept next to the probe construction so the index keys a catalog
/// implementation builds ([`model_alias_slug`], [`model_id_segment`]) and the
/// scan matcher can never drift apart.
pub(crate) fn model_matches_alias_probe(
    catalog_key: &str,
    model: &str,
    probe: &ModelAliasProbe,
) -> bool {
    match probe {
        ModelAliasProbe::Exact(exact) => catalog_key == exact || model == exact,
        ModelAliasProbe::FullSlug(slug) => {
            model_alias_slug(catalog_key) == *slug || model_alias_slug(model) == *slug
        }
        ModelAliasProbe::PartSlug(slug) => {
            model_alias_slug(model_id_segment(catalog_key)) == *slug
                || model_alias_slug(model) == *slug
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slug_folds_case_dots_variant_and_fullwidth_colon() {
        assert_eq!(
            "anthropic/claude-opus-4-5",
            model_alias_slug("Anthropic/Claude.Opus-4.5")
        );
        assert_eq!(
            "anthropic/claude-opus-4-5",
            model_alias_slug("anthropic/claude-opus-4.5:free")
        );
        assert_eq!("gpt-4o", model_alias_slug("GPT-4o:beta"));
        // 全角冒号折叠为半角后同样识别变体后缀。
        assert_eq!(
            "anthropic/claude-opus-4-5",
            model_alias_slug("anthropic/claude-opus-4.5：free")
        );
        // 空白串折叠为 `-`（展示标签 / 中文输入法残留空格）。
        assert_eq!(
            "anthropic/claude-opus-4-5",
            model_alias_slug("Anthropic/Claude Opus 4.5")
        );
        // 未识别的冒号尾段不剥离：slug 保留内部冒号，不可能与目录 id 撞形。
        assert_eq!("openai/gpt-4o", model_alias_slug("openai/gpt-4o"));
        assert_eq!(
            "ft:gpt-4o-2024-08-13:org",
            model_alias_slug("ft:gpt-4o-2024.08.13:org")
        );
        assert_eq!("", model_alias_slug("   "));
    }

    #[test]
    fn slug_keeps_unrecognized_colon_tails() {
        // 非变体关键字的尾段不剥离（`fr ee`、`gpt-4-5` 可能是分隔符右侧的
        // 模型名），由分隔符改写层处理。
        assert_eq!("openai/gpt-4o:", model_alias_slug("openai/gpt-4o:"));
        assert_eq!(
            "openai/gpt-4o:fr-ee",
            model_alias_slug("openai/gpt-4o:fr ee")
        );
        assert_eq!(
            "anthropic:claude-opus-4-5",
            model_alias_slug("anthropic:claude-opus-4-5")
        );
    }

    #[test]
    fn normalization_rewrites_colon_separators_both_widths() {
        // 半角 / 全角冒号都按 vendor 分隔符改写为 `/`。
        assert_eq!(
            "anthropic/claude-opus-4.5",
            normalize_wire_model_id("anthropic:claude-opus-4.5")
        );
        assert_eq!(
            "anthropic/claude-opus-4.5",
            normalize_wire_model_id("anthropic：claude-opus-4.5")
        );
        // 中文输入法习惯：冒号后带空格；展示标签形态（大小写 + 空格模型名）。
        assert_eq!(
            "anthropic/claude-opus-4.5",
            normalize_wire_model_id("anthropic： claude-opus-4.5")
        );
        assert_eq!(
            "Anthropic/Claude Opus 4.5",
            normalize_wire_model_id("Anthropic: Claude Opus 4.5")
        );
        // 纯词模型名（无点无杠）也按分隔符解释：`claude-opus-4-5` 不是变体
        // 关键字，`:` 优先视为 vendor 分隔符。
        assert_eq!(
            "anthropic/claude-opus-4-5",
            normalize_wire_model_id("anthropic:claude-opus-4-5")
        );
        // 变体后缀先被剥离，不会被误当分隔符；改写后原样接回。
        assert_eq!("gpt-4o:free", normalize_wire_model_id("gpt-4o:free"));
        assert_eq!(
            "anthropic/claude-opus-4.5:free",
            normalize_wire_model_id("anthropic:claude-opus-4.5:free")
        );
        assert_eq!(
            "openai/gpt-4o:free",
            normalize_wire_model_id("openai/gpt-4o:free")
        );
        // 斜杠形态原样保留（仅去空白）；已知 relay 的全冒号嵌套形式同样改写。
        assert_eq!("openai/gpt-4o", normalize_wire_model_id("openai/gpt-4o"));
        assert_eq!(
            "openrouter/anthropic/claude-opus-4.5",
            normalize_wire_model_id("openrouter：anthropic：claude-opus-4.5")
        );
        // 精调 id（冒号头）改写后与任何目录 id 不同形，无害。
        assert_eq!(
            "ft/gpt-4o-2024.08.13/org/abc",
            normalize_wire_model_id("ft:gpt-4o-2024.08.13:org:abc")
        );
        assert_eq!("", normalize_wire_model_id("："));
    }

    #[test]
    fn relay_namespace_strip_only_takes_known_relays() {
        assert_eq!(
            Some("anthropic/claude-opus-4.5".to_owned()),
            relay_namespace_stripped("openrouter/anthropic/claude-opus-4.5")
        );
        assert_eq!(
            Some("gpt-4o".to_owned()),
            relay_namespace_stripped("OpenRouter/gpt-4o")
        );
        assert_eq!(None, relay_namespace_stripped("anthropic/claude-opus-4.5"));
        assert_eq!(None, relay_namespace_stripped("unknown-relay/gpt-4o"));
        assert_eq!(None, relay_namespace_stripped("openrouter/"));
    }

    #[test]
    fn probes_are_ordered_exact_then_slug_then_part() {
        let probes = model_alias_probes("openrouter/anthropic/claude-opus-4.5:free");
        assert_eq!(
            vec![
                ModelAliasProbe::Exact("anthropic/claude-opus-4.5:free".to_owned()),
                ModelAliasProbe::FullSlug("anthropic/claude-opus-4-5".to_owned()),
                ModelAliasProbe::FullSlug("openrouter/anthropic/claude-opus-4-5".to_owned()),
                ModelAliasProbe::PartSlug("claude-opus-4-5".to_owned()),
            ],
            probes
        );
        let probes = model_alias_probes("anthropic/claude-opus-4.5");
        assert_eq!(
            vec![
                ModelAliasProbe::FullSlug("anthropic/claude-opus-4-5".to_owned()),
                ModelAliasProbe::PartSlug("claude-opus-4-5".to_owned()),
            ],
            probes
        );
        // 冒号分隔符形态：改写后的精确形态打头，slug 层随后。
        let probes = model_alias_probes("anthropic：claude-opus-4.5");
        assert_eq!(
            vec![
                ModelAliasProbe::Exact("anthropic/claude-opus-4.5".to_owned()),
                ModelAliasProbe::FullSlug("anthropic/claude-opus-4-5".to_owned()),
                ModelAliasProbe::PartSlug("claude-opus-4-5".to_owned()),
            ],
            probes
        );
        // 标签形态：改写后的精确形态（带空格）+ 折叠空白后的 slug。
        let probes = model_alias_probes("Anthropic: Claude Opus 4.5");
        assert_eq!(
            vec![
                ModelAliasProbe::Exact("Anthropic/Claude Opus 4.5".to_owned()),
                ModelAliasProbe::FullSlug("anthropic/claude-opus-4-5".to_owned()),
                ModelAliasProbe::PartSlug("claude-opus-4-5".to_owned()),
            ],
            probes
        );
        assert!(model_alias_probes("   ").is_empty());
    }

    #[test]
    fn matcher_covers_all_three_probe_levels() {
        let model = ("anthropic/claude-opus-4-5", "claude-opus-4-5");
        assert!(model_matches_alias_probe(
            model.0,
            model.1,
            &ModelAliasProbe::Exact("anthropic/claude-opus-4-5".to_owned())
        ));
        assert!(model_matches_alias_probe(
            model.0,
            model.1,
            &ModelAliasProbe::FullSlug("anthropic/claude-opus-4-5".to_owned())
        ));
        // probe 携带 slug 形态的载荷（由 `model_alias_probes` 构造）：vendor
        // 段被忽略后仍命中（vendor 漂移由最宽容的 PartSlug 层吸收）。
        assert!(model_matches_alias_probe(
            model.0,
            model.1,
            &ModelAliasProbe::PartSlug("claude-opus-4-5".to_owned())
        ));
        // 端到端：OpenRouter 的 vendor slug（`x-ai`）与目录 vendor（`xai`）
        // 漂移 + 点号差异，仍能经 probe 级联命中。
        let probes = model_alias_probes("x-ai/Grok.4");
        assert!(probes.iter().any(|probe| model_matches_alias_probe(
            "xai/grok-4",
            "grok-4",
            probe
        )));
        // 全角冒号 + 标签形态经 probe 级联命中。
        let probes = model_alias_probes("anthropic：claude-opus-4.5");
        assert!(probes
            .iter()
            .any(|probe| model_matches_alias_probe(model.0, model.1, probe)));
        let probes = model_alias_probes("Anthropic: Claude Opus 4.5");
        assert!(probes
            .iter()
            .any(|probe| model_matches_alias_probe(model.0, model.1, probe)));
        assert!(!model_matches_alias_probe(
            model.0,
            model.1,
            &ModelAliasProbe::Exact("anthropic/claude-opus-4.5".to_owned())
        ));
    }

    #[test]
    fn normalization_rewrites_pipe_separators_both_widths() {
        // `provider|model` is a common picker/UI spelling; both widths and the
        // extra spaces a label leaves behind must reach the same catalog key.
        assert_eq!(
            "deepseek/deepseek-flash",
            normalize_wire_model_id("deepseek|deepseek-flash")
        );
        assert_eq!(
            "deepseek/deepseek-flash",
            normalize_wire_model_id("deepseek｜deepseek-flash")
        );
        assert_eq!(
            "deepseek/deepseek-flash",
            normalize_wire_model_id("  deepseek | deepseek-flash  ")
        );
        assert_eq!(
            "deepseek/deepseek-flash",
            normalize_wire_model_id("deepseek／deepseek-flash")
        );
        // Region in the middle resolves through the part-slug probe.
        assert!(model_alias_probes("deepseek|cn|deepseek-flash")
            .iter()
            .any(|probe| model_matches_alias_probe(
                "deepseek/deepseek-flash",
                "deepseek-flash",
                probe
            )));
        // A variant suffix survives the pipe rewrite.
        assert_eq!(
            "deepseek/deepseek-flash:free",
            normalize_wire_model_id("deepseek|deepseek-flash:free")
        );
    }

    #[test]
    fn route_identities_prefer_the_vendor_qualified_form_then_the_bare_model_id() {
        assert_eq!(
            vec!["deepseek/deepseek-flash", "deepseek-flash"],
            model_route_identities("deepseek/deepseek-flash")
        );
        // Separator dialects and the IME space reach the same two identities.
        for spelling in [
            "deepseek:deepseek-flash",
            "deepseek： deepseek-flash",
            "deepseek|deepseek-flash",
            "  deepseek／deepseek-flash  ",
        ] {
            assert_eq!(
                vec!["deepseek/deepseek-flash", "deepseek-flash"],
                model_route_identities(spelling),
                "spelling: {spelling}"
            );
        }
        // A region is routing state, not identity: drop the middle segment.
        assert_eq!(
            vec!["deepseek/deepseek-flash", "deepseek-flash"],
            model_route_identities("deepseek/cn/deepseek-flash")
        );
        // A relay namespace stays part of the qualified identity and is
        // stripped only for the bare fallback.
        assert_eq!(
            vec![
                "openrouter/anthropic/claude-opus-4.5",
                "anthropic/claude-opus-4.5"
            ],
            model_route_identities("openrouter：anthropic：claude-opus-4.5")
        );
        // No vendor separator: one identity, nothing to fall back to.
        assert_eq!(vec!["gpt-4o"], model_route_identities("gpt-4o"));
        assert!(model_route_identities("   ").is_empty());
        // A model id with its own slash keeps it: only the leading vendor
        // segment is routing syntax.
        assert_eq!(
            vec![
                "openrouter/meta-llama/llama-3-70b",
                "meta-llama/llama-3-70b"
            ],
            model_route_identities("openrouter/meta-llama/llama-3-70b")
        );
    }

    #[test]
    fn provider_model_resolution_covers_official_relay_and_explicit_override() {
        // Official (or unknown) suppliers receive the vendor-native id, with
        // the catalog key as the structural authority.
        assert_eq!(
            Some("deepseek-flash".to_owned()),
            resolve_provider_model_id(
                Some("official"),
                Some("deepseek/deepseek-flash"),
                Some("deepseek-flash"),
                Some("deepseek/deepseek-flash"),
            )
        );
        // Unknown catalog vendor is still stripped structurally.
        assert_eq!(
            Some("glm-4.6".to_owned()),
            resolve_provider_model_id(
                Some("official"),
                Some("zhipuai/glm-4.6"),
                Some("glm-4.6"),
                Some("zhipuai:glm-4.6"),
            )
        );
        // API-resource media route with no catalog row still strips a known
        // vendor prefix.
        assert_eq!(
            Some("gpt-4o".to_owned()),
            resolve_provider_model_id(Some("official"), None, Some("openai/gpt-4o"), None)
        );
        // Relay keeps the fully-qualified catalog key and upgrades a native
        // route id to it.
        assert_eq!(
            Some("deepseek/deepseek-flash".to_owned()),
            resolve_provider_model_id(
                Some("relay"),
                Some("deepseek/deepseek-flash"),
                Some("deepseek-flash"),
                Some("deepseek:deepseek-flash"),
            )
        );
        // Explicit provider overrides are authoritative and preserved.
        assert_eq!(
            Some("gpt-4o-mini-provider".to_owned()),
            resolve_provider_model_id(
                Some("official"),
                Some("openai/gpt-4o-mini"),
                Some("gpt-4o-mini"),
                Some("gpt-4o-mini-provider"),
            )
        );
        assert_eq!(
            Some("azure-deployment-42".to_owned()),
            resolve_provider_model_id(
                Some("official"),
                Some("openai/gpt-4o-mini"),
                Some("gpt-4o-mini"),
                Some("azure-deployment-42"),
            )
        );
        assert_eq!(
            Some("ft:gpt-4o-2024-08-13:org:abc".to_owned()),
            resolve_provider_model_id(
                Some("official"),
                Some("openai/gpt-4o-mini"),
                Some("gpt-4o-mini"),
                Some("ft:gpt-4o-2024-08-13:org:abc"),
            )
        );
        // Model ids that legitimately contain `/` must survive: only the
        // catalog vendor head is routing syntax.
        assert_eq!(
            Some("meta-llama/llama-3-70b".to_owned()),
            resolve_provider_model_id(
                Some("official"),
                Some("meta-llama/meta-llama/llama-3-70b"),
                Some("meta-llama/llama-3-70b"),
                None,
            )
        );
        assert_eq!(None, resolve_provider_model_id(None, None, None, None));
    }

    #[test]
    fn model_path_segments_round_trip_qualified_ids() {
        for model in [
            "openai/gpt-4o",
            "openrouter/anthropic/claude-opus-4.5",
            "meta-llama/llama-3-70b",
            "seedance-1.0",
        ] {
            let encoded = encode_model_path_segment(model);
            assert!(!encoded.contains('/'), "encoded path segment: {encoded}");
            assert_eq!(model, decode_model_path_segment(&encoded));
        }
        assert_eq!(
            "openai/gpt-4o",
            decode_model_path_segment("openai%2Fgpt-4o")
        );
        // An already-decoded segment survives unchanged.
        assert_eq!("gpt-4o", decode_model_path_segment("gpt-4o"));
    }
}
