//! Inbound model id in OpenRouter wire format → catalog model identity.
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
    let folded = value.trim().replace('：', ":");
    let (base, variant) = split_variant_suffix(&folded);
    let rewritten = base
        .split(':')
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
}
