use std::collections::{BTreeMap, BTreeSet};
use std::fmt::{Display, Formatter};

use serde::Deserialize;
use serde_json::Value;
use sha2::{Digest, Sha256};
use sqlx::{PgPool, Row};

use sdkwork_iam_bootstrap::{
    DEFAULT_IAM_ORGANIZATION_SQL_ID as DEFAULT_IAM_ORGANIZATION_ID,
    DEFAULT_IAM_TENANT_SQL_ID as DEFAULT_IAM_TENANT_ID,
};

use crate::application::{
    UpstreamCredentialSecretCodec, UpstreamCredentialSecretContext,
};
use crate::infrastructure::sql::account_rate_card::sync_legacy_account_group_rate_cards;

const MANIFEST_JSON: &str = include_str!("../../../../../data/ai-routing/install-manifest.json");
const CORE_RESOURCES_JSON: &str =
    include_str!("../../../../../data/ai-routing/resources/core-resources.json");
const OPENAI_RESOURCES_JSON: &str =
    include_str!("../../../../../data/ai-routing/resources/openai-resources.json");
const VENDOR_NATIVE_RESOURCES_JSON: &str =
    include_str!("../../../../../data/ai-routing/resources/vendor-native-resources.json");
const ADMIN_API_GROUPS_JSON: &str =
    include_str!("../../../../../data/ai-routing/resource-groups/admin-api-groups.json");
const OFFICIAL_PROVIDER_GROUPS_JSON: &str =
    include_str!("../../../../../data/ai-routing/resource-groups/official-provider-groups.json");
const RELAY_PROVIDER_GROUPS_JSON: &str =
    include_str!("../../../../../data/ai-routing/resource-groups/relay-provider-groups.json");

const ACTIVE_STATUS: i32 = 1;
const DISABLED_STATUS: i32 = 0;
const SYSTEM_TENANT_ID: i64 = 0;
const SYSTEM_ORGANIZATION_ID: i64 = 0;
const SYSTEM_DATA_SCOPE: i32 = 1;
const DEFAULT_ADMIN_DATA_SCOPE: i32 = 1;
const MAX_SEED_UUID_LENGTH: usize = 64;
const DEFAULT_OPENAI_BASE_URL: &str = "https://api.openai.com/v1";

/// Account group code of the seeded default **mixed** account group.
///
/// The value is the canonical
/// [`crate::domain::DEFAULT_ACCOUNT_GROUP_CODE`]; this alias only names the
/// *role* the seed gives it, so a reader of the installer sees why the code
/// exists. The code is a cross-crate contract, not a local label:
///
/// * the auth-token channel resolves every signed-in session through
///   `domain::select_default_account_group_for_subject`, whose second step
///   matches this code (the first step being the `is_default` flag this seed
///   sets),
/// * the account-route selector then requires an exact
///   `binding.account_group_id == group_id` match.
///
/// A rename on any side silently de-routes the whole signed-in user base.
const DEFAULT_MIXED_ACCOUNT_GROUP_CODE: &str = crate::domain::DEFAULT_ACCOUNT_GROUP_CODE;
/// Fingerprint of the seeded routing topology. It feeds `source_hash`, which
/// the installer compares to decide whether an already-installed environment
/// needs its seed re-imported, so it must be bumped whenever the topology the
/// seed writes changes.
///
/// `v8` adds `default-mixed-group-vendor-skeleton`: the default mixed group now
/// grants every vendor's resource group and holds every vendor default account
/// as a member, so auth-token (app-session) traffic can reach all seven
/// content-generation capabilities instead of only the OpenAI-shaped ones.
///
/// `v9` corrects two vendor default-account base URLs. `baidu` pointed at
/// `https://aip.baidubce.com` — Qianfan's legacy V1 host — while its seed
/// declares the V2 path `/v2/chat/completions`, so no request could ever reach
/// Baidu. `pixverse` pointed at `https://api.pixverse.ai`, its console host,
/// rather than the documented OpenAPI host `https://app-api.pixverse.ai`.
///
/// `v11` adds `default-relay-suppliers`: four bundled relay (中转站) suppliers
/// (`sdkwork-global`, `sdkwork-cn`, `birdcoder-global`, `birdcoder-cn`), each
/// with a `relay`-typed supplier row, a per-protocol `protocols` array, an
/// endpoint, a `api_key` auth method, an account and a default-group
/// membership. `v10` is skipped in the prose but was the released value; the
/// bump is what forces an already-installed environment to re-import the seed
/// and pick the relay rows up.
///
/// `v12` carries two changes that both have to reach an already-seeded
/// environment, which is the whole point of the fingerprint:
///
/// * `bytedance-ark-media-split` — `bytedance` becomes a first-class vendor
///   instead of an alias of `jimeng`. Before it, the two shared one descriptor
///   arm, so the eight `vendor_native` Doubao Seedance models were bound to
///   `jimeng`'s `/v1/videos/generations`; ByteDance's real surface is Ark,
///   `/api/v3/contents/generations/tasks`. A stale database keeps routing
///   Seedance traffic at the 即梦 consumer path until this bump forces the
///   re-import, so the fingerprint is load-bearing, not bookkeeping.
/// * `relay-media-vendor-groups` — the relay (中转站) account grants move from
///   a single `relay.openai_compatible.*` family onto three media groups
///   (`relay.bytedance.media`, `relay.cn.visual_generation`,
///   `relay.global.visual_generation`). Provider-native image/video APIs are
///   *not* standardised across vendors (every vendor ships its own path and
///   payload), so they need per-vendor groups; the LLM/coding chat surfaces
///   already share standard protocols (`openai_chat_completions`,
///   `openai_responses`, `anthropic_messages`) and therefore keep reusing the
///   protocol-surface groups instead of growing a parallel family.
const DEFAULT_ADMIN_ROUTING_TOPOLOGY_SEED_SOURCE: &str = "default-admin-routing-topology-seed.v12|vendor-default-accounts|default-group|default-mixed-group-vendor-skeleton|default-relay-suppliers|official.openai.full|openai|official|openai_compatible|https://api.openai.com/v1|vendor-modality-groups|i18n-zh-en|price_first|prepay|anthropic-messages-multi-vendor|bytedance-ark-media-split|relay-media-vendor-groups";

/// Environment values for which the bundled vendor default accounts are seeded
/// in the *enabled* state. Everywhere else (production and any unrecognised
/// lifecycle) they are seeded disabled, so an operator must explicitly attach
/// real credentials before billable vendor traffic can leave the gateway.
const DEV_LIKE_INSTALL_ENVIRONMENTS: [&str; 3] = ["development", "test", "staging"];

/// Placeholder credential value written for a bundled vendor default account.
///
/// The credential must be *present* for the account to survive the routing
/// snapshot's credential gate, but it is deliberately not a usable vendor key:
/// a real call made with it is rejected by the vendor, which is the expected
/// residual until an operator replaces it through the admin surface.
fn default_account_placeholder_secret(vendor_code: &str) -> String {
    format!("sk-dev-{vendor_code}-placeholder")
}

/// Endpoint code used by every bundled vendor default account. One endpoint per
/// vendor is enough: the vendor host is what the account resolves, and the
/// vendor-native path is carried by the request, not by the endpoint.
const DEFAULT_VENDOR_ENDPOINT_CODE: &str = "official-global";

/// Auth method code shared by every bundled vendor default account.
const DEFAULT_VENDOR_AUTH_METHOD_CODE: &str = "api_key";

/// `ai_upstream_supplier.supplier_type` value for a relay (中转站) supplier.
///
/// The column is constrained by
/// `ck_ai_upstream_supplier_type CHECK (supplier_type IN ('official', 'relay'))`,
/// so this is a closed set rather than free text, and a relay must not carry a
/// `default_vendor_code`.
const RELAY_SUPPLIER_TYPE: &str = "relay";

/// Sort-order offset for seeded relay suppliers.
///
/// `seeded_supplier_sort_order` numbers the 28 vendor suppliers from 1, so the
/// relay block starts clear of it and the admin list reads vendors first,
/// relays after.
const RELAY_SUPPLIER_SORT_ORDER_BASE: i32 = 1000;

/// Routing priority and weight for bundled vendor default accounts. They match
/// the OpenAI seed so seeded vendors compete on equal footing under the
/// `price_first` strategy.
const DEFAULT_VENDOR_ACCOUNT_PRIORITY: i32 = 100;
const DEFAULT_VENDOR_ACCOUNT_ROUTING_WEIGHT: i32 = 100;

#[derive(Debug)]
pub(crate) enum AiRoutingSeedLoadError {
    Json(serde_json::Error),
    Validation(String),
}

impl Display for AiRoutingSeedLoadError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Json(error) => write!(formatter, "{error}"),
            Self::Validation(message) => formatter.write_str(message),
        }
    }
}

impl std::error::Error for AiRoutingSeedLoadError {}

impl From<serde_json::Error> for AiRoutingSeedLoadError {
    fn from(value: serde_json::Error) -> Self {
        Self::Json(value)
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AiRoutingManifest {
    catalog_code: String,
    schema_version: String,
    source: String,
    sections: AiRoutingManifestSections,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AiRoutingManifestSections {
    resources: Vec<String>,
    resource_groups: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ResourceBundle {
    kind: String,
    items: Vec<ResourceSeed>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ResourceSeed {
    resource_code: String,
    resource_type: String,
    display_name: String,
    vendor_code: Option<String>,
    modality_code: Option<String>,
    api_code: Option<String>,
    path_template: Option<String>,
    method: Option<String>,
    catalog_key: Option<String>,
    model: Option<String>,
    provider_native_model: Option<String>,
    capability: String,
    capabilities: Vec<String>,
    sort_order: i32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ResourceGroupBundle {
    kind: String,
    items: Vec<ResourceGroupSeed>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ResourceGroupSeed {
    group_code: String,
    group_name: String,
    group_type: String,
    selection_mode: String,
    description: Option<String>,
    sort_order: i32,
    items: Vec<ResourceGroupItemSeed>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ResourceGroupItemSeed {
    item_type: String,
    resource_code: Option<String>,
    group_code: Option<String>,
}

#[derive(Debug, Clone)]
struct AiRoutingSeedCatalog {
    manifest: AiRoutingManifest,
    resources: Vec<ResourceSeed>,
    resource_groups: Vec<ResourceGroupSeed>,
}

#[derive(Debug, Clone)]
struct EndpointSeedDefinition<'a> {
    resource: &'a ResourceSeed,
}

#[derive(Debug, Clone, Copy)]
struct DefaultAdminUpstreamAccountSeed {
    supplier_code: &'static str,
    supplier_name: &'static str,
    supplier_type: &'static str,
    adapter_code: &'static str,
    protocol_code: &'static str,
    endpoint_code: &'static str,
    endpoint_name: &'static str,
    base_url: &'static str,
    auth_method_code: &'static str,
    account_code: &'static str,
    account_name: &'static str,
    account_type: &'static str,
    supplier_display_name_i18n: &'static str,
    priority: i32,
    routing_weight: i32,
}

#[derive(Debug, Clone)]
struct DefaultAdminUpstreamAccountGroupSeed {
    group_code: String,
    group_name: String,
    group_name_i18n: String,
    group_type: &'static str,
    account_code: Option<String>,
    resource_group_code: String,
    vendor_code: Option<String>,
    modalities: Vec<String>,
    tags: Vec<String>,
    priority: i32,
    routing_weight: i32,
    is_default: bool,
}

/// Legacy admin-topology upstream account seed.
///
/// This path predates `DEFAULT_VENDOR_UPSTREAM_ACCOUNTS` and used to be the
/// only account the seed created. It is now empty on purpose: OpenAI is a
/// vendor like every other content-generation provider, so it is seeded by the
/// vendor path below, which is environment-aware and issues a credential.
///
/// Keeping the former `openai-default` entry here would mean two seed paths
/// writing the same account row on every run. The admin path runs first and
/// always writes `status = DISABLED_STATUS`, so it would silently undo the
/// vendor path's environment-based enablement, leaving the default OpenAI
/// account permanently disabled while its group reported a member.
///
/// The array and its consumers are retained (rather than deleted) so a future
/// admin-only account that is *not* a content-generation vendor still has a
/// home, and so the topology-completeness check keeps its shape.
static DEFAULT_ADMIN_UPSTREAM_ACCOUNTS: [DefaultAdminUpstreamAccountSeed; 0] = [];

/// Per-vendor default upstream account for the vendor-modality account groups
/// derived from the bundled resource catalog.
///
/// The seed derives one account group per (vendor, modality) pair, but a group
/// with no member and no credential is an empty pool: it passes every static
/// gate and still cannot route, because the routing snapshot requires a group
/// member, an enabled account, a resolvable base URL and an active credential.
/// Historically only OpenAI had an account, so every other content-generation
/// modality (music / voice / sound effects / digital human / motion mimicry)
/// resolved to "no upstream account routes are configured".
///
/// Each entry here closes that hole for one vendor: the seed upserts the
/// supplier, an `official-global` endpoint pointing at the vendor's real host, a
/// `api_key` auth method, the account itself, and a placeholder credential, then
/// binds the account into every derived account group for that vendor. The
/// credential is a placeholder on purpose (see
/// `default_account_placeholder_secret`).
struct DefaultVendorUpstreamAccountSeed {
    vendor_code: &'static str,
    supplier_name: &'static str,
    supplier_display_name_i18n: &'static str,
    adapter_code: &'static str,
    protocol_code: &'static str,
    base_url: &'static str,
    account_code: &'static str,
    account_name: &'static str,
}

/// One `{protocolCode, baseUrl}` pair on a relay supplier.
///
/// A relay terminates several protocol surfaces on its own host, and each
/// surface has a *different* path prefix — the OpenAI-shaped ones live under
/// `/v1` while the Anthropic-shaped one lives under `/anthropic`. A single
/// scalar `base_url` therefore cannot describe a relay, which is why
/// `ai_upstream_supplier.protocols` exists and why the relay seed populates it.
struct DefaultRelayProtocolSeed {
    protocol_code: &'static str,
    base_url: &'static str,
}

/// Bundled default relay (中转站) supplier.
///
/// A relay differs from a vendor default account in three ways the seed must
/// honour, and each one is a hard constraint rather than a convention:
///
/// * `supplier_type` is `relay`, not `official`. The column has a CHECK
///   constraint (`ck_ai_upstream_supplier_type`) so the value cannot be
///   approximated, and `official` suppliers additionally require a
///   `default_vendor_code` that a relay by definition does not have.
/// * `protocols` carries every protocol surface the relay exposes, each with
///   its own base URL. The scalar `protocol_code`/`base_url` pair is kept only
///   as the compatibility projection of `protocols[0]`, mirroring what the
///   admin API writes.
/// * There is no `vendor.<code>` resource for a relay, so the account cannot be
///   a member of a derived `{vendor}.{modality}` group. It is bound into the
///   default mixed group directly and granted the relay resource groups, which
///   is what makes it reachable from auth-token (app-session) traffic.
struct DefaultRelaySupplierSeed {
    supplier_code: &'static str,
    supplier_name: &'static str,
    supplier_display_name_i18n: &'static str,
    adapter_code: &'static str,
    endpoint_code: &'static str,
    endpoint_name: &'static str,
    protocols: &'static [DefaultRelayProtocolSeed],
    resource_group_codes: &'static [&'static str],
    account_code: &'static str,
    account_name: &'static str,
}

/// Base URLs of the bundled relay (中转站) suppliers, one constant per
/// (host, protocol surface) pair.
///
/// They are seeded as *separate* suppliers per host rather than two endpoints
/// of one supplier because the two hosts differ while their surface prefixes do
/// not, so neither the scalar `base_url` nor a single endpoint row can express
/// both without silently dialling the wrong host for one region.
///
/// Naming the URLs rather than inlining them keeps the host string in exactly
/// one place per pair, so a host change cannot miss a protocol.
const DEFAULT_SDKWORK_RELAY_GLOBAL_OPENAI_BASE_URL: &str = "https://api.sdkwork.com/v1";
const DEFAULT_SDKWORK_RELAY_GLOBAL_ANTHROPIC_BASE_URL: &str = "https://api.sdkwork.com/anthropic";
const DEFAULT_SDKWORK_RELAY_CN_OPENAI_BASE_URL: &str = "https://api.sdkwork.cn/v1";
const DEFAULT_SDKWORK_RELAY_CN_ANTHROPIC_BASE_URL: &str = "https://api.sdkwork.cn/anthropic";
/// The BirdCoder relay mirrors the SDKWork relay surface on its own domains.
const DEFAULT_BIRDCODER_RELAY_GLOBAL_OPENAI_BASE_URL: &str = "https://api.birdcoder.com/v1";
const DEFAULT_BIRDCODER_RELAY_GLOBAL_ANTHROPIC_BASE_URL: &str = "https://api.birdcoder.com/anthropic";
const DEFAULT_BIRDCODER_RELAY_CN_OPENAI_BASE_URL: &str = "https://api.birdcoder.cn/v1";
const DEFAULT_BIRDCODER_RELAY_CN_ANTHROPIC_BASE_URL: &str = "https://api.birdcoder.cn/anthropic";

/// Resource groups a relay account is granted.
///
/// The LLM/coding conversation surface is standardised: every vendor that
/// fronts it speaks one of the three protocols (OpenAI Chat Completions, OpenAI
/// Responses, Anthropic Messages), so the protocol-surface groups that already
/// exist for official suppliers carry relay traffic too and no parallel relay
/// LLM group is created. `llmProtocols.ts` maps each protocol a relay declares
/// to the matching group, and the grant is driven from that declaration.
///
/// Only the media faces need groups of their own, because image/video APIs are
/// *not* standardised — each vendor has its own host and path, so a relay that
/// fronts them cannot be covered by one OpenAI-compatible group. The two media
/// relay groups are keyed by market rather than by brand: the China-native set
/// (Kling / Jimeng / Volcengine / Vidu) and the global-native set
/// (Gemini / FLUX / Runway / Luma / PixVerse / Stability), plus ByteDance's Ark
/// media set, which is its own host and whose seedance/seedream models are the
/// reason the group exists.
const RELAY_ACCOUNT_RESOURCE_GROUP_CODES: [&str; 3] = [
    "relay.bytedance.media",
    "relay.cn.visual_generation",
    "relay.global.visual_generation",
];

/// Bundled default relay suppliers.
///
/// Four suppliers, not two: each brand ships an international and a mainland
/// edge, and the two edges have different hosts. Folding them into one supplier
/// would make one region's traffic dial the other region's host.
const DEFAULT_RELAY_SUPPLIERS: [DefaultRelaySupplierSeed; 4] = [
    DefaultRelaySupplierSeed {
        supplier_code: "sdkwork-global",
        supplier_name: "SDKWork Relay (Global)",
        supplier_display_name_i18n:
            "{\"en-US\":\"SDKWork Relay (Global)\",\"zh-CN\":\"SDKWork 中转站（国际）\"}",
        adapter_code: "openai_compatible",
        endpoint_code: "relay-global",
        endpoint_name: "SDKWork Relay Global",
        protocols: &[
            DefaultRelayProtocolSeed {
                protocol_code: "openai_chat_completions",
                base_url: DEFAULT_SDKWORK_RELAY_GLOBAL_OPENAI_BASE_URL,
            },
            DefaultRelayProtocolSeed {
                protocol_code: "openai_responses",
                base_url: DEFAULT_SDKWORK_RELAY_GLOBAL_OPENAI_BASE_URL,
            },
            DefaultRelayProtocolSeed {
                protocol_code: "anthropic_messages",
                base_url: DEFAULT_SDKWORK_RELAY_GLOBAL_ANTHROPIC_BASE_URL,
            },
        ],
        resource_group_codes: &RELAY_ACCOUNT_RESOURCE_GROUP_CODES,
        account_code: "sdkwork-global-default",
        account_name: "SDKWork Relay (Global) Default",
    },
    DefaultRelaySupplierSeed {
        supplier_code: "sdkwork-cn",
        supplier_name: "SDKWork Relay (China)",
        supplier_display_name_i18n:
            "{\"en-US\":\"SDKWork Relay (China)\",\"zh-CN\":\"SDKWork 中转站（中国）\"}",
        adapter_code: "openai_compatible",
        endpoint_code: "relay-cn",
        endpoint_name: "SDKWork Relay China",
        protocols: &[
            DefaultRelayProtocolSeed {
                protocol_code: "openai_chat_completions",
                base_url: DEFAULT_SDKWORK_RELAY_CN_OPENAI_BASE_URL,
            },
            DefaultRelayProtocolSeed {
                protocol_code: "openai_responses",
                base_url: DEFAULT_SDKWORK_RELAY_CN_OPENAI_BASE_URL,
            },
            DefaultRelayProtocolSeed {
                protocol_code: "anthropic_messages",
                base_url: DEFAULT_SDKWORK_RELAY_CN_ANTHROPIC_BASE_URL,
            },
        ],
        resource_group_codes: &RELAY_ACCOUNT_RESOURCE_GROUP_CODES,
        account_code: "sdkwork-cn-default",
        account_name: "SDKWork Relay (China) Default",
    },
    DefaultRelaySupplierSeed {
        supplier_code: "birdcoder-global",
        supplier_name: "BirdCoder Relay (Global)",
        supplier_display_name_i18n:
            "{\"en-US\":\"BirdCoder Relay (Global)\",\"zh-CN\":\"BirdCoder 中转站（国际）\"}",
        adapter_code: "openai_compatible",
        endpoint_code: "relay-global",
        endpoint_name: "BirdCoder Relay Global",
        protocols: &[
            DefaultRelayProtocolSeed {
                protocol_code: "openai_chat_completions",
                base_url: DEFAULT_BIRDCODER_RELAY_GLOBAL_OPENAI_BASE_URL,
            },
            DefaultRelayProtocolSeed {
                protocol_code: "openai_responses",
                base_url: DEFAULT_BIRDCODER_RELAY_GLOBAL_OPENAI_BASE_URL,
            },
            DefaultRelayProtocolSeed {
                protocol_code: "anthropic_messages",
                base_url: DEFAULT_BIRDCODER_RELAY_GLOBAL_ANTHROPIC_BASE_URL,
            },
        ],
        resource_group_codes: &RELAY_ACCOUNT_RESOURCE_GROUP_CODES,
        account_code: "birdcoder-global-default",
        account_name: "BirdCoder Relay (Global) Default",
    },
    DefaultRelaySupplierSeed {
        supplier_code: "birdcoder-cn",
        supplier_name: "BirdCoder Relay (China)",
        supplier_display_name_i18n:
            "{\"en-US\":\"BirdCoder Relay (China)\",\"zh-CN\":\"BirdCoder 中转站（中国）\"}",
        adapter_code: "openai_compatible",
        endpoint_code: "relay-cn",
        endpoint_name: "BirdCoder Relay China",
        protocols: &[
            DefaultRelayProtocolSeed {
                protocol_code: "openai_chat_completions",
                base_url: DEFAULT_BIRDCODER_RELAY_CN_OPENAI_BASE_URL,
            },
            DefaultRelayProtocolSeed {
                protocol_code: "openai_responses",
                base_url: DEFAULT_BIRDCODER_RELAY_CN_OPENAI_BASE_URL,
            },
            DefaultRelayProtocolSeed {
                protocol_code: "anthropic_messages",
                base_url: DEFAULT_BIRDCODER_RELAY_CN_ANTHROPIC_BASE_URL,
            },
        ],
        resource_group_codes: &RELAY_ACCOUNT_RESOURCE_GROUP_CODES,
        account_code: "birdcoder-cn-default",
        account_name: "BirdCoder Relay (China) Default",
    },
];

/// Vendors that must ship a routable default account so that every bundled
/// content-generation capability has a live route out of the box in a
/// development-like environment.
///
/// Covers both the nine third-party vendors behind the non-OpenAI content
/// modalities (image / video / music / voice) and the two OpenAI-shaped vendors
/// whose own derived groups would otherwise stay empty pools. The existing
/// `DEFAULT_ADMIN_UPSTREAM_ACCOUNTS` entry only wired the hardcoded
/// `default-group`, so `openai.*` and `openai_compatible.*` had no member.
///
/// The set is validated against the bundled resource catalog at seed load time:
/// a vendor listed here that the catalog does not declare, or a derived
/// vendor-modality group with no account here, is a load error rather than a
/// silent empty pool.
const DEFAULT_VENDOR_UPSTREAM_ACCOUNTS: [DefaultVendorUpstreamAccountSeed; 28] = [
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "openai",
        supplier_name: "OpenAI",
        supplier_display_name_i18n: "{\"en-US\":\"OpenAI\",\"zh-CN\":\"OpenAI\"}",
        adapter_code: "openai",
        protocol_code: "openai_compatible",
        base_url: DEFAULT_OPENAI_BASE_URL,
        account_code: "openai-default",
        account_name: "OpenAI Default",
    },
    DefaultVendorUpstreamAccountSeed {
        // OpenAI-compatible aggregators are reached through the same sealed
        // credential the dedicated supplier carries, so the group is never an
        // empty pool. `base_url` is the canonical OpenAI-compatible host: an
        // operator repointing this account at a real aggregator only edits the
        // endpoint row, not the seed.
        vendor_code: "openai_compatible",
        supplier_name: "OpenAI Compatible",
        supplier_display_name_i18n: "{\"en-US\":\"OpenAI Compatible\",\"zh-CN\":\"OpenAI 兼容\"}",
        adapter_code: "openai_compatible",
        protocol_code: "openai_compatible",
        base_url: DEFAULT_OPENAI_BASE_URL,
        account_code: "openai-compatible-default",
        account_name: "OpenAI Compatible Default",
    },
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "gemini",
        supplier_name: "Gemini",
        supplier_display_name_i18n: "{\"en-US\":\"Gemini\",\"zh-CN\":\"谷歌 Gemini\"}",
        adapter_code: "gemini",
        protocol_code: "gemini_native",
        base_url: "https://generativelanguage.googleapis.com",
        account_code: "gemini-default",
        account_name: "Gemini Default",
    },
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "anthropic",
        supplier_name: "Anthropic",
        supplier_display_name_i18n: "{\"en-US\":\"Anthropic\",\"zh-CN\":\"Anthropic\"}",
        adapter_code: "anthropic",
        protocol_code: "anthropic_messages",
        base_url: "https://api.anthropic.com",
        account_code: "anthropic-default",
        account_name: "Anthropic Default",
    },
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "kling",
        supplier_name: "Kling",
        supplier_display_name_i18n: "{\"en-US\":\"Kling\",\"zh-CN\":\"可灵\"}",
        adapter_code: "kling",
        protocol_code: "kling_native",
        base_url: "https://api-beijing.klingai.com",
        account_code: "kling-default",
        account_name: "Kling Default",
    },
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "jimeng",
        supplier_name: "Jimeng",
        supplier_display_name_i18n: "{\"en-US\":\"Jimeng\",\"zh-CN\":\"即梦\"}",
        adapter_code: "jimeng",
        protocol_code: "jimeng_native",
        base_url: "https://visual.volcengineapi.com",
        account_code: "jimeng-default",
        account_name: "Jimeng Default",
    },
    // ByteDance's catalog surface is Volcengine Ark, not the Jimeng consumer
    // host. Its `doubao-seedance-*` / `doubao-seedream-*` models bind the
    // `bytedance.*` vendor-native endpoints (`/api/v3/...`), so it needs its
    // own supplier row pointing at the Ark host — reusing jimeng's base URL
    // would dial a host that does not serve those paths.
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "bytedance",
        supplier_name: "ByteDance",
        supplier_display_name_i18n: "{\"en-US\":\"ByteDance\",\"zh-CN\":\"字节跳动\"}",
        adapter_code: "volcengine",
        protocol_code: "volcengine_ark",
        base_url: "https://ark.cn-beijing.volces.com",
        account_code: "bytedance-default",
        account_name: "ByteDance Default",
    },
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "volcengine",
        supplier_name: "Volcengine",
        supplier_display_name_i18n: "{\"en-US\":\"Volcengine\",\"zh-CN\":\"火山引擎\"}",
        adapter_code: "volcengine",
        protocol_code: "volcengine_ark",
        base_url: "https://ark.cn-beijing.volces.com",
        account_code: "volcengine-default",
        account_name: "Volcengine Default",
    },
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "vidu",
        supplier_name: "Vidu",
        supplier_display_name_i18n: "{\"en-US\":\"Vidu\",\"zh-CN\":\"Vidu\"}",
        adapter_code: "vidu",
        protocol_code: "vidu_native",
        base_url: "https://api.vidu.cn",
        account_code: "vidu-default",
        account_name: "Vidu Default",
    },
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "minimax",
        supplier_name: "MiniMax",
        supplier_display_name_i18n: "{\"en-US\":\"MiniMax\",\"zh-CN\":\"MiniMax\"}",
        adapter_code: "minimax",
        protocol_code: "minimax_native",
        base_url: "https://api.minimax.chat",
        account_code: "minimax-default",
        account_name: "MiniMax Default",
    },
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "suno",
        supplier_name: "Suno",
        supplier_display_name_i18n: "{\"en-US\":\"Suno\",\"zh-CN\":\"Suno\"}",
        adapter_code: "suno",
        protocol_code: "suno_native",
        base_url: "https://api.sunoapi.org",
        account_code: "suno-default",
        account_name: "Suno Default",
    },
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "elevenlabs",
        supplier_name: "ElevenLabs",
        supplier_display_name_i18n: "{\"en-US\":\"ElevenLabs\",\"zh-CN\":\"ElevenLabs\"}",
        adapter_code: "elevenlabs",
        protocol_code: "elevenlabs_native",
        base_url: "https://api.elevenlabs.io",
        account_code: "elevenlabs-default",
        account_name: "ElevenLabs Default",
    },
    // ---------------------------------------------------------------------
    // Vendors the model catalog declares but that shipped no default account
    // until 2026-09-18. The routing gate is vendor-agnostic (see
    // `model_catalog_import::model_endpoint_descriptor`), so these models were
    // already reachable through the protocol-coherent generic surface — but
    // only as an *implicit* fall-through with no per-vendor account to inspect,
    // grant, price against, or pin. Seeding an account per vendor makes the
    // per-vendor route a real, first-class row.
    //
    // `adapter_code` is chosen from the vendor's dominant `apiFormat`: the
    // OpenAI-compatible-majority vendors reuse the existing
    // `openai_compatible` adapter; the pure vendor-native vendors declare their
    // own code. Both are declarations only — `adapter_code` lives on
    // `ai_upstream_supplier` and is never read by the application layer, and
    // the dispatched wire protocol is derived from the request's `api_code` via
    // `protocol_code_from_api_code`. So no adapter implementation is required
    // for an account to route; it only needs an enabled account, a resolvable
    // base URL and an active credential, all of which this seed provides.
    //
    // The `base_url` is the vendor's real public host where one is stable and
    // documented. Where a vendor has no single stable public host (or the host
    // is region/contract specific) the placeholder host is used and an operator
    // repoints the endpoint row. Group `official.<vendor>.full` carries the
    // vendor resource; see `VENDOR_RESOURCE_GROUP_BINDINGS`.
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "xai",
        supplier_name: "xAI",
        supplier_display_name_i18n: "{\"en-US\":\"xAI\",\"zh-CN\":\"xAI\"}",
        adapter_code: "openai_compatible",
        protocol_code: "openai_compatible",
        base_url: "https://api.x.ai",
        account_code: "xai-default",
        account_name: "xAI Default",
    },
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "alibaba",
        supplier_name: "Alibaba Cloud",
        supplier_display_name_i18n: "{\"en-US\":\"Alibaba Cloud\",\"zh-CN\":\"阿里云\"}",
        adapter_code: "openai_compatible",
        protocol_code: "openai_compatible",
        base_url: "https://dashscope.aliyuncs.com",
        account_code: "alibaba-default",
        account_name: "Alibaba Cloud Default",
    },
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "deepseek",
        supplier_name: "DeepSeek",
        supplier_display_name_i18n: "{\"en-US\":\"DeepSeek\",\"zh-CN\":\"深度求索\"}",
        adapter_code: "openai_compatible",
        protocol_code: "openai_compatible",
        base_url: "https://api.deepseek.com",
        account_code: "deepseek-default",
        account_name: "DeepSeek Default",
    },
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "moonshot",
        supplier_name: "Moonshot Kimi",
        supplier_display_name_i18n: "{\"en-US\":\"Moonshot Kimi\",\"zh-CN\":\"月之暗面 Kimi\"}",
        adapter_code: "openai_compatible",
        protocol_code: "openai_compatible",
        base_url: "https://api.moonshot.cn",
        account_code: "moonshot-default",
        account_name: "Moonshot Default",
    },
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "zhipu",
        supplier_name: "Zhipu AI",
        supplier_display_name_i18n: "{\"en-US\":\"Zhipu AI\",\"zh-CN\":\"智谱 AI\"}",
        adapter_code: "openai_compatible",
        protocol_code: "openai_compatible",
        base_url: "https://open.bigmodel.cn",
        account_code: "zhipu-default",
        account_name: "Zhipu Default",
    },
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "tencent",
        supplier_name: "Tencent Cloud",
        supplier_display_name_i18n: "{\"en-US\":\"Tencent Cloud\",\"zh-CN\":\"腾讯云\"}",
        adapter_code: "openai_compatible",
        protocol_code: "openai_compatible",
        base_url: "https://api.hunyuan.cloud.tencent.com",
        account_code: "tencent-default",
        account_name: "Tencent Cloud Default",
    },
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "xiaomi",
        supplier_name: "Xiaomi MiMo",
        supplier_display_name_i18n: "{\"en-US\":\"Xiaomi MiMo\",\"zh-CN\":\"小米 MiMo\"}",
        adapter_code: "openai_compatible",
        protocol_code: "openai_compatible",
        base_url: "https://api.xiaomi.com",
        account_code: "xiaomi-default",
        account_name: "Xiaomi MiMo Default",
    },
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "stepfun",
        supplier_name: "StepFun",
        supplier_display_name_i18n: "{\"en-US\":\"StepFun\",\"zh-CN\":\"阶跃星辰\"}",
        adapter_code: "openai_compatible",
        protocol_code: "openai_compatible",
        base_url: "https://api.stepfun.com",
        account_code: "stepfun-default",
        account_name: "StepFun Default",
    },
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "meituan",
        supplier_name: "Meituan",
        supplier_display_name_i18n: "{\"en-US\":\"Meituan\",\"zh-CN\":\"美团\"}",
        adapter_code: "openai_compatible",
        protocol_code: "openai_compatible",
        base_url: "https://api.meituan.com",
        account_code: "meituan-default",
        account_name: "Meituan Default",
    },
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "runway",
        supplier_name: "Runway",
        supplier_display_name_i18n: "{\"en-US\":\"Runway\",\"zh-CN\":\"Runway\"}",
        adapter_code: "runway",
        protocol_code: "vendor_native",
        base_url: "https://api.dev.runwayml.com",
        account_code: "runway-default",
        account_name: "Runway Default",
    },
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "baidu",
        supplier_name: "Baidu AI Cloud",
        supplier_display_name_i18n: "{\"en-US\":\"Baidu AI Cloud\",\"zh-CN\":\"百度智能云\"}",
        adapter_code: "baidu",
        protocol_code: "vendor_native",
        // Qianfan's V2 surface. Baidu's own V2 release notice moves every
        // model-service domain to `https://qianfan.baidubce.com/v2/{category}`;
        // `https://aip.baidubce.com` is the legacy V1 host, so pairing it with
        // the seeded `/v2/chat/completions` template produced
        // `https://aip.baidubce.com/v2/chat/completions`, which is not a route
        // Baidu serves.
        base_url: "https://qianfan.baidubce.com",
        account_code: "baidu-default",
        account_name: "Baidu AI Cloud Default",
    },
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "luma_ai",
        supplier_name: "Luma AI",
        supplier_display_name_i18n: "{\"en-US\":\"Luma AI\",\"zh-CN\":\"Luma AI\"}",
        adapter_code: "luma_ai",
        protocol_code: "vendor_native",
        base_url: "https://api.lumalabs.ai",
        account_code: "luma-ai-default",
        account_name: "Luma AI Default",
    },
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "pixverse",
        supplier_name: "PixVerse",
        supplier_display_name_i18n: "{\"en-US\":\"PixVerse\",\"zh-CN\":\"PixVerse\"}",
        adapter_code: "pixverse",
        protocol_code: "vendor_native",
        // PixVerse serves its OpenAPI from the application host; the API
        // reference and its own ComfyUI node both use
        // `https://app-api.pixverse.ai/openapi/v2`. `api.pixverse.ai` is the
        // console host and does not answer `/openapi/v2/video/text/generate`.
        base_url: "https://app-api.pixverse.ai",
        account_code: "pixverse-default",
        account_name: "PixVerse Default",
    },
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "mureka",
        supplier_name: "Mureka",
        supplier_display_name_i18n: "{\"en-US\":\"Mureka\",\"zh-CN\":\"Mureka\"}",
        adapter_code: "mureka",
        protocol_code: "vendor_native",
        base_url: "https://api.mureka.ai",
        account_code: "mureka-default",
        account_name: "Mureka Default",
    },
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "stability_ai",
        supplier_name: "Stability AI",
        supplier_display_name_i18n: "{\"en-US\":\"Stability AI\",\"zh-CN\":\"Stability AI\"}",
        adapter_code: "stability_ai",
        protocol_code: "vendor_native",
        base_url: "https://api.stability.ai",
        account_code: "stability-ai-default",
        account_name: "Stability AI Default",
    },
    DefaultVendorUpstreamAccountSeed {
        vendor_code: "black_forest_labs",
        supplier_name: "Black Forest Labs",
        supplier_display_name_i18n: "{\"en-US\":\"Black Forest Labs\",\"zh-CN\":\"Black Forest Labs\"}",
        adapter_code: "black_forest_labs",
        protocol_code: "vendor_native",
        base_url: "https://api.bfl.ai",
        account_code: "black-forest-labs-default",
        account_name: "Black Forest Labs Default",
    },
];

/// Modality whitelist for account groups, mirroring SUPPORTED_MODALITIES in the
/// admin upstream account group route.
const ACCOUNT_GROUP_SUPPORTED_MODALITIES: [&str; 5] = ["text", "audio", "image", "video", "music"];

/// Resource catalog capability/modality codes mapped to account group modality
/// codes. llm maps to text; embedding/network are not account group modalities.
///
/// `sfx` maps onto the `audio` account group deliberately: sound effects ride
/// the same accounts (and the same voices/audio quotas) as the rest of the
/// audio surface, and `ACCOUNT_GROUP_SUPPORTED_MODALITIES` is a closed set of
/// five. Adding a sixth group would strand the four sfx vendors in a group no
/// account is bound to, so a sound-effect request would report "no upstream
/// account routes are configured" even though the accounts exist.
const VENDOR_MODALITY_MAPPING: [(&str, &str); 6] = [
    ("llm", "text"),
    ("image", "image"),
    ("video", "video"),
    ("audio", "audio"),
    ("music", "music"),
    ("sfx", "audio"),
];

/// Curated binding from vendor code to the resource group granted to that
/// vendor's default account groups. Every vendor declared in the bundled
/// resources must have a binding (validated at seed load time).
const VENDOR_RESOURCE_GROUP_BINDINGS: [(&str, &str); 28] = [
    ("openai", "official.openai.full"),
    ("openai_compatible", "api.openai_compatible.all"),
    ("anthropic", "official.anthropic.claude_code"),
    ("gemini", "official.gemini.full"),
    ("kling", "official.kling.full"),
    ("jimeng", "official.jimeng.full"),
    ("bytedance", "official.bytedance.full"),
    ("minimax", "official.minimax.music"),
    ("vidu", "official.vidu.full"),
    ("volcengine", "official.volcengine.full"),
    ("suno", "official.suno.full"),
    ("elevenlabs", "official.elevenlabs.full"),
    // Vendors the model catalog declares but that previously shipped no default
    // account. Each binds a `official.<vendor>.full` group carrying the
    // `vendor.<vendor>` resource, so the account is a real, inspectable routing
    // target rather than an implicit fall-through to the OpenAI-compatible
    // surface.
    //
    // Whether such a group also carries a vendor-native `api.*` grant depends on
    // whether any of the vendor's models declares `apiFormat: "vendor_native"` —
    // not on the vendor's own `supportedProtocols`. Vendors whose models are all
    // `openai_compatible` deliberately stay on the generic surface, so they get
    // no `api.*` grant and no classifier arm; see
    // `data/ai-routing/resource-groups/official-provider-groups.json` and
    // `tools/check-cloudrouter-ai-routing-consistency.mjs` (Check 4b, which
    // reconciles declared endpoints against classifier arms and the compat-face
    // exemption ledger).
    ("xai", "official.xai.full"),
    ("alibaba", "official.alibaba.full"),
    ("deepseek", "official.deepseek.full"),
    ("moonshot", "official.moonshot.full"),
    ("zhipu", "official.zhipu.full"),
    ("runway", "official.runway.full"),
    ("baidu", "official.baidu.full"),
    ("luma_ai", "official.luma_ai.full"),
    ("pixverse", "official.pixverse.full"),
    ("tencent", "official.tencent.full"),
    ("stepfun", "official.stepfun.full"),
    ("meituan", "official.meituan.full"),
    ("stability_ai", "official.stability_ai.full"),
    ("black_forest_labs", "official.black_forest_labs.full"),
    ("mureka", "official.mureka.full"),
    ("xiaomi", "official.xiaomi.full"),
];

/// Localized vendor display names: (vendor_code, en-US, zh-CN).
const VENDOR_LOCALIZED_NAMES: [(&str, &str, &str); 28] = [
    ("openai", "OpenAI", "OpenAI"),
    ("openai_compatible", "OpenAI Compatible", "OpenAI 兼容"),
    ("anthropic", "Anthropic", "Anthropic"),
    ("gemini", "Gemini", "谷歌 Gemini"),
    ("kling", "Kling", "可灵"),
    ("jimeng", "Jimeng", "即梦"),
    ("bytedance", "ByteDance", "字节跳动"),
    ("minimax", "MiniMax", "MiniMax"),
    ("vidu", "Vidu", "Vidu"),
    ("volcengine", "Volcengine", "火山引擎"),
    ("suno", "Suno", "Suno"),
    ("elevenlabs", "ElevenLabs", "ElevenLabs"),
    ("xai", "xAI", "xAI"),
    ("alibaba", "Alibaba Cloud", "阿里云"),
    ("deepseek", "DeepSeek", "深度求索"),
    ("moonshot", "Moonshot Kimi", "月之暗面 Kimi"),
    ("zhipu", "Zhipu AI", "智谱 AI"),
    ("runway", "Runway", "Runway"),
    ("baidu", "Baidu AI Cloud", "百度智能云"),
    ("luma_ai", "Luma AI", "Luma AI"),
    ("pixverse", "PixVerse", "PixVerse"),
    ("tencent", "Tencent Cloud", "腾讯云"),
    ("stepfun", "StepFun", "阶跃星辰"),
    ("meituan", "Meituan", "美团"),
    ("stability_ai", "Stability AI", "Stability AI"),
    ("black_forest_labs", "Black Forest Labs", "Black Forest Labs"),
    ("mureka", "Mureka", "Mureka"),
    ("xiaomi", "Xiaomi MiMo", "小米 MiMo"),
];

/// Localized modality display names: (modality_code, en-US, zh-CN).
const MODALITY_LOCALIZED_NAMES: [(&str, &str, &str); 5] = [
    ("text", "Text", "文本"),
    ("audio", "Audio", "音频"),
    ("image", "Image", "图片"),
    ("video", "Video", "视频"),
    ("music", "Music", "音乐"),
];

/// Maps a resource modality to the account group type it serves. The `text`
/// modality routes through LLM groups; the other modalities map 1:1.
fn modality_group_type(modality: &str) -> &'static str {
    match modality {
        "text" => "llm",
        "audio" => "audio",
        "image" => "image",
        "video" => "video",
        "music" => "music",
        _ => "other",
    }
}

/// Extra resource groups granted to the default mixed account group on top of
/// its primary `resource_group_code` and the derived vendor skeleton.
///
/// The group/supplier resource intersection (`matched_resource_scope`) drops
/// every resource the group does not also grant. OpenAI-compatible vendors
/// such as DeepSeek declare Anthropic Messages / Claude Code native protocols,
/// so without an anthropic-shaped group grant those resources are intersected
/// away and the account can never serve `/anthropic/v1/messages` (50201 "no
/// upstream account routes are configured").
///
/// `api.claude.code` carries the two Anthropic-owned endpoints.
/// `api.anthropic.messages` carries those plus the per-vendor
/// `<vendor>.anthropic_messages` endpoints for every vendor whose catalog
/// `vendor.json` publishes `protocolBaseUrls.anthropic_messages` (DeepSeek,
/// Zhipu, Moonshot, Alibaba, Tencent, StepFun, Meituan, Xiaomi). Both groups are
/// granted because the intersection is computed against the resources the
/// *resolved account's supplier* owns: an Anthropic account owns
/// `api.anthropic.messages` and a DeepSeek account owns
/// `api.deepseek.anthropic_messages`, and only the group that names the right
/// one survives the intersection.
///
/// The two relay groups are the same fix for a different supplier kind. A relay
/// account owns no `vendor.<code>` resource, so it is not carried in by
/// `VENDOR_RESOURCE_GROUP_BINDINGS` and would otherwise have no route visible
/// to the default group at all — the group would be a member holding an account
/// whose scope the loader never surfaces, which fails closed with 50201 exactly
/// like an empty pool. Listing the relay chat and media groups here is what
/// makes the bundled relay suppliers reachable by signed-in users, and it keeps
/// the relay surface additive: adding another relay supplier needs no change in
/// this file, because every relay is granted the same groups.
const DEFAULT_GROUP_EXTRA_RESOURCE_GROUP_CODES: [&str; 5] = [
    "api.claude.code",
    "api.anthropic.messages",
    "relay.bytedance.media",
    "relay.cn.visual_generation",
    "relay.global.visual_generation",
];

fn default_admin_upstream_account_group() -> DefaultAdminUpstreamAccountGroupSeed {
    DefaultAdminUpstreamAccountGroupSeed {
        group_code: DEFAULT_MIXED_ACCOUNT_GROUP_CODE.to_owned(),
        group_name: "账号默认分组".to_owned(),
        group_name_i18n: "{\"en-US\":\"账号默认分组\",\"zh-CN\":\"账号默认分组\"}".to_owned(),
        group_type: "mixed",
        account_code: Some("openai-default".to_owned()),
        resource_group_code: "official.openai.full".to_owned(),
        vendor_code: None,
        modalities: Vec::new(),
        tags: vec!["stable".to_owned(), "recommended".to_owned()],
        priority: 100,
        routing_weight: 100,
        is_default: true,
    }
}

impl DefaultAdminUpstreamAccountGroupSeed {
    /// Resource groups granted to this account group: the primary grant, plus
    /// curated extras and the full vendor skeleton for the default mixed group
    /// only.
    ///
    /// The vendor skeleton is what makes the default group live up to its
    /// `mixed` type. This seed marks the group `is_default`, which is exactly
    /// the flag `domain::select_default_account_group_for_subject` consults
    /// first, so **every** app-session (auth-token) request — i.e. every
    /// signed-in end user driving the content-generation surfaces — resolves
    /// onto this one group, and the account-route selector then requires an
    /// exact `binding.account_group_id == group_id` match. So a default group
    /// that grants only `official.openai.full` (plus the `api.claude.code`
    /// patch) leaves the loader-visible apiScope of every non-OpenAI vendor
    /// intersected away, and video / music / voice / sound effects / digital
    /// human / motion mimicry all fail closed with 50201 "no upstream account
    /// routes are configured" even though every account, credential and group
    /// member is present and enabled.
    ///
    /// Deriving the skeleton from `VENDOR_RESOURCE_GROUP_BINDINGS` rather than
    /// hand-listing it keeps a single source of truth: a new vendor (or a new
    /// resource group for an existing vendor) is covered here automatically,
    /// which is the "zero-patch per new vendor protocol" property the routing
    /// design calls for.
    fn resource_group_codes(&self) -> Vec<&str> {
        if !self.is_default {
            return vec![self.resource_group_code.as_str()];
        }
        let mut codes = vec![self.resource_group_code.as_str()];
        codes.extend(DEFAULT_GROUP_EXTRA_RESOURCE_GROUP_CODES.iter().copied());
        codes.extend(
            VENDOR_RESOURCE_GROUP_BINDINGS
                .iter()
                .map(|(_, resource_group_code)| *resource_group_code),
        );
        // The primary grant is one of the vendor skeleton entries, so dedupe to
        // keep the emitted binding list — and its fingerprint — stable.
        let mut seen = std::collections::BTreeSet::new();
        codes.retain(|code| seen.insert(*code));
        codes
    }
}

impl EndpointSeedDefinition<'_> {
    fn api_code(&self) -> &str {
        self.resource.api_code.as_deref().unwrap_or_default()
    }

    fn protocol_code(&self) -> &str {
        default_protocol_code(self.resource)
    }

    fn display_name(&self) -> &str {
        self.resource.display_name.as_str()
    }

    fn method(&self) -> String {
        self.resource
            .method
            .clone()
            .unwrap_or_else(|| default_endpoint_method(self.api_code()).to_owned())
    }

    fn path_template(&self) -> String {
        self.resource
            .path_template
            .clone()
            .unwrap_or_else(|| default_path_template(self.api_code()))
    }

    fn streaming_supported(&self) -> bool {
        let api_code = self.api_code();
        api_code == "openai.responses"
            || api_code == "openai.chat_completions"
            || api_code == "openai.completions"
            || api_code == "openai.realtime"
            || api_code == "openai.audio.speech"
            || api_code == "gemini.stream_generate_content"
            || api_code == "gemini.live"
            || self
                .resource
                .capabilities
                .iter()
                .any(|capability| capability.trim().eq_ignore_ascii_case("streaming"))
    }

    fn sort_order(&self) -> i32 {
        self.resource.sort_order
    }
}

impl AiRoutingSeedCatalog {
    fn load() -> Result<Self, AiRoutingSeedLoadError> {
        let manifest = serde_json::from_str::<AiRoutingManifest>(MANIFEST_JSON)?;
        let resources = resource_bundles()?
            .into_iter()
            .flat_map(|bundle| bundle.items)
            .collect::<Vec<_>>();
        let resource_groups = resource_group_bundles()?
            .into_iter()
            .flat_map(|bundle| bundle.items)
            .collect::<Vec<_>>();
        let catalog = Self {
            manifest,
            resources,
            resource_groups,
        };
        validate_catalog(&catalog)?;
        Ok(catalog)
    }
}

/// Imports the bundled AI routing seed.
///
/// `environment` selects whether the bundled *vendor default accounts* are
/// seeded enabled: a development-like lifecycle (`development` / `test` /
/// `staging`) gets routable defaults so every content-generation capability
/// works out of the box, while `production` (and anything unrecognised) seeds
/// them disabled and requires an operator to attach real credentials.
///
/// `credential_codec` is the upstream-credential secret codec the running
/// gateway uses. When present, the seed seals a placeholder credential per
/// vendor account; when absent, no credential is written (and the account is
/// consequently not routable until an operator sets one).
pub async fn import_postgres_ai_routing_seed(
    pool: &PgPool,
    environment: Option<&str>,
    credential_codec: Option<&(dyn UpstreamCredentialSecretCodec + Send + Sync)>,
) -> Result<(), sqlx::Error> {
    let catalog = AiRoutingSeedCatalog::load().map_err(json_decode_error)?;
    // The seed is a convergent upsert: it runs on every startup that decides
    // `UpgradeRequired`, and re-running it against an already-current database
    // writes the same rows with the same deterministic ids. The fingerprint is
    // logged because it is the only signal that says *which* revision of the
    // bundled topology this process is about to project — and therefore which
    // revision the previous startup left behind when the two differ.
    tracing::info!(
        target: "sdkwork_cloudrouter::ai_routing_seed",
        source_hash = %source_hash(),
        catalog_code = %catalog.manifest.catalog_code,
        environment = environment.unwrap_or("<unresolved>"),
        vendor_accounts_enabled = seed_environment_enables_vendor_accounts(environment),
        credential_codec_configured = credential_codec.is_some(),
        "importing the bundled AI routing seed"
    );
    let mut tx = pool.begin().await?;
    import_postgres_api_endpoints(&mut tx, &catalog).await?;
    import_postgres_resources(&mut tx, &catalog).await?;
    import_postgres_resource_groups(&mut tx, &catalog).await?;
    disable_removed_postgres_resource_groups(&mut tx, &catalog).await?;
    import_postgres_resource_group_items(&mut tx, &catalog).await?;
    import_postgres_default_admin_upstream_topology(&mut tx, &catalog).await?;
    import_postgres_default_admin_routing_strategies(&mut tx).await?;

    // Runs after the groups exist: it attaches the vendor default accounts to
    // the derived vendor-modality groups.
    import_postgres_default_vendor_upstream_accounts(
        &mut tx,
        &catalog,
        seed_environment_enables_vendor_accounts(environment),
        credential_codec,
    )
    .await?;

    // Relay suppliers have no `vendor.<code>` resource and therefore no derived
    // vendor-modality group to attach to, so they take a separate write path
    // that binds their accounts into the default mixed group directly.
    import_postgres_default_relay_upstream_accounts(
        &mut tx,
        &catalog,
        seed_environment_enables_vendor_accounts(environment),
        credential_codec,
    )
    .await?;

    // The default mixed group names an account the vendor path above creates,
    // so its membership is completed here rather than during the topology pass.
    sync_default_group_members(&mut tx, &catalog).await?;

    let rate_card_effective_at = sqlx::query_scalar::<_, String>("SELECT CURRENT_TIMESTAMP::text")
        .fetch_one(&mut *tx)
        .await?;
    sync_legacy_account_group_rate_cards(&mut tx, &rate_card_effective_at)
        .await
        .map_err(|error| sqlx::Error::Protocol(error.to_string()))?;
    tx.commit().await?;
    Ok(())
}

/// Whether the given install environment should seed the bundled vendor default
/// accounts in the enabled state. `None` means the environment was not
/// resolved, which is treated as production-like (disabled) so an unresolved
/// install never ships live placeholder credentials.
fn seed_environment_enables_vendor_accounts(environment: Option<&str>) -> bool {
    environment
        .map(|value| value.trim().to_ascii_lowercase())
        .is_some_and(|value| DEV_LIKE_INSTALL_ENVIRONMENTS.contains(&value.as_str()))
}

pub async fn postgres_ai_routing_seed_complete(pool: &PgPool) -> Result<bool, sqlx::Error> {
    Ok(postgres_ai_routing_seed_gap(pool).await?.is_none())
}

/// Names the first clause of `postgres_ai_routing_seed_complete` that fails.
///
/// The completeness predicate is an `&&` chain of seven checks. When it returns
/// `false` the caller can only report `UpgradeRequired`, which is exactly as
/// informative as "something is wrong" — and the seven clauses fail for
/// completely different reasons (a resource bundle not re-seeded, a routing
/// strategy deleted, an account left disabled, a credential skipped because no
/// key ring was configured). Diagnosing one of them from the outside costs a
/// full bisect of the chain.
///
/// Returning the clause *name* turns that bisect into a single read. The pairs
/// are deliberately derived from the same calls the boolean form makes, so the
/// two can never disagree about what "complete" means; only the *reporting*
/// differs.
pub async fn postgres_ai_routing_seed_gap(
    pool: &PgPool,
) -> Result<Option<&'static str>, sqlx::Error> {
    let catalog = AiRoutingSeedCatalog::load().map_err(json_decode_error)?;
    let resource_codes = postgres_string_set(
        pool,
        "SELECT resource_code FROM ai_resource WHERE tenant_id = 0 AND organization_id = 0 AND status = 1 AND deleted_at IS NULL",
    )
    .await?;
    let group_codes = postgres_string_set(
        pool,
        "SELECT group_code FROM ai_resource_group WHERE tenant_id = 0 AND organization_id = 0 AND status = 1 AND deleted_at IS NULL",
    )
    .await?;
    let endpoint_codes = postgres_string_set(
        pool,
        "SELECT endpoint_code FROM ai_api_endpoint WHERE tenant_id = 0 AND organization_id = 0 AND status = 1 AND deleted_at IS NULL",
    )
    .await?;

    if !expected_resource_codes(&catalog).is_subset(&resource_codes) {
        return Ok(Some("ai_resource is missing bundled resource codes"));
    }
    if !expected_group_codes(&catalog).is_subset(&group_codes) {
        return Ok(Some("ai_resource_group is missing bundled resource groups"));
    }
    if !expected_endpoint_codes(&catalog).is_subset(&endpoint_codes) {
        return Ok(Some("ai_api_endpoint is missing bundled endpoint codes"));
    }
    if !postgres_default_admin_upstream_topology_complete(pool).await? {
        return Ok(Some(
            "the default admin upstream topology (supplier/endpoint/auth method/supplier resource binding) is incomplete",
        ));
    }
    if !postgres_default_admin_routing_strategies_complete(pool).await? {
        return Ok(Some(
            "a bundled routing strategy is absent, disabled or soft-deleted",
        ));
    }
    if !postgres_default_vendor_upstream_accounts_complete(pool).await? {
        return Ok(Some(
            "a bundled vendor default account is absent, disabled or has no active credential",
        ));
    }
    if !postgres_default_relay_upstream_accounts_complete(pool).await? {
        return Ok(Some(
            "a bundled relay default account is absent, disabled, missing its relay supplier or has no active credential",
        ));
    }
    if postgres_resource_group_item_count(pool, &catalog).await?
        < expected_resource_group_item_count(&catalog)
    {
        return Ok(Some(
            "ai_resource_group_item holds fewer rows than the bundled resource groups declare",
        ));
    }
    if let Some(gap) = postgres_default_admin_account_group_gap(pool, &catalog).await? {
        return Ok(Some(gap));
    }
    Ok(None)
}

/// Names the first bundled default account group that is missing, disabled or
/// still carrying the wrong vendor/resource binding.
///
/// The item-count clause above is the only account-group signal the chain
/// otherwise has, and a count cannot see *which* group is absent: a group that
/// the catalog added while a previously-seeded one was soft-deleted keeps the
/// total identical and the seed reports complete. That is exactly the shape of
/// the media-vendor change — `relay.bytedance.media` and the two visual
/// groups arrive while the retired `relay.openai_compatible.*` family leaves,
/// so the migration is invisible to a row count.
///
/// This walks the same derivation the seed writes from
/// ([`default_admin_upstream_account_groups`]), including each group's full
/// [`DefaultAdminUpstreamAccountGroupSeed::resource_group_codes`] grant list
/// *and* the member account each group names, so the predicate and the writer
/// can never disagree about what "complete" means; only the reporting differs.
async fn postgres_default_admin_account_group_gap(
    pool: &PgPool,
    catalog: &AiRoutingSeedCatalog,
) -> Result<Option<&'static str>, sqlx::Error> {
    let groups = default_admin_upstream_account_groups(catalog).map_err(json_decode_error)?;
    for group in &groups {
        let group_id = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT id
            FROM ai_upstream_account_group
            WHERE tenant_id = $1
              AND organization_id = $2
              AND group_code = $3
              AND status = $4
              AND deleted_at IS NULL
              AND metadata ->> 'itemCode' = $3
            "#,
        )
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(group.group_code.as_str())
        .bind(ACTIVE_STATUS)
        .fetch_optional(pool)
        .await?;
        let Some(group_id) = group_id else {
            return Ok(Some(
                "a bundled default account group is absent, disabled, or not seed-owned",
            ));
        };
        for resource_group_code in group.resource_group_codes() {
            let granted = sqlx::query_scalar::<_, bool>(
                r#"
                SELECT EXISTS (
                    SELECT 1
                    FROM ai_resource_binding binding
                    WHERE binding.tenant_id = $1
                      AND binding.organization_id = $2
                      AND binding.account_group_id = $3
                      AND binding.resource_group_code = $4
                      AND binding.grant_type = 'allow'
                      AND binding.status = $5
                      AND binding.deleted_at IS NULL
                )
                "#,
            )
            .bind(DEFAULT_IAM_TENANT_ID)
            .bind(DEFAULT_IAM_ORGANIZATION_ID)
            .bind(group_id)
            .bind(resource_group_code)
            .bind(ACTIVE_STATUS)
            .fetch_one(pool)
            .await?;
            if !granted {
                return Ok(Some(
                    "a bundled default account group no longer grants a resource group it is seeded with",
                ));
            }
        }
        // The group's member account is the other half of the same seed, and it
        // lives in a different table that no other clause in the chain reads.
        // It is also the half that a fresh database used to lose: the default
        // mixed group names `openai-default`, which the *vendor* account pass
        // creates *after* the topology pass that writes the group, so the
        // membership has to be reconciled on a second pass
        // ([`sync_default_group_members`]). Without an assertion here that
        // reconciliation is unobservable — a silently missing member leaves the
        // startup gate reporting `Installed` while routed traffic fails to
        // resolve the account.
        if let Some(account_code) = group.account_code.as_deref() {
            let member_present = sqlx::query_scalar::<_, bool>(
                r#"
                SELECT EXISTS (
                    SELECT 1
                    FROM ai_upstream_account_group_member member
                    JOIN ai_upstream_account account
                      ON account.id = member.account_id
                     AND account.deleted_at IS NULL
                    WHERE member.tenant_id = $1
                      AND member.organization_id = $2
                      AND member.account_group_id = $3
                      AND account.account_code = $4
                      AND member.status = $5
                      AND member.deleted_at IS NULL
                )
                "#,
            )
            .bind(DEFAULT_IAM_TENANT_ID)
            .bind(DEFAULT_IAM_ORGANIZATION_ID)
            .bind(group_id)
            .bind(account_code)
            .bind(ACTIVE_STATUS)
            .fetch_one(pool)
            .await?;
            if !member_present {
                return Ok(Some(
                    "a bundled default account group is missing the member account it is seeded with",
                ));
            }
        }
    }
    Ok(None)
}

/// The bundled vendor default accounts must exist, be enabled and carry an
/// active credential for the seed to count as complete.
///
/// Without this predicate the completeness check was satisfied by the catalog
/// *skeleton* alone (resources, groups, endpoints, the default group, the
/// routing strategies). A database seeded while the install environment was
/// mis-read as `production` therefore held all eleven vendor accounts in the
/// disabled state, still reported [`InstallationStatus::Installed`], and the
/// `ensure` command short-circuited before `import_postgres_ai_routing_seed`
/// could converge them. The symptom surfaced far from the cause: every
/// content-generation request failed with `50201 no upstream account routes are
/// configured`, because the routing snapshot drops a disabled account before it
/// ever reaches the account-route selector.
///
/// Only rows this seed owns are inspected (the
/// `default_vendor_upstream_account` marker). An operator who edits or replaces
/// a bundled account drops that marker, and their configuration must not be
/// reported as an incomplete seed.
async fn postgres_default_vendor_upstream_accounts_complete(
    pool: &PgPool,
) -> Result<bool, sqlx::Error> {
    for seed in DEFAULT_VENDOR_UPSTREAM_ACCOUNTS.iter() {
        let enabled_with_credential = sqlx::query_scalar::<_, bool>(
            r#"
            SELECT EXISTS (
                SELECT 1
                FROM ai_upstream_account account
                WHERE account.tenant_id = $1
                  AND account.organization_id = $2
                  AND account.account_code = $3
                  AND account.status = $4
                  AND account.deleted_at IS NULL
                  AND account.metadata ->> 'itemType' = 'default_vendor_upstream_account'
                  AND EXISTS (
                      SELECT 1
                      FROM ai_upstream_account_credential credential
                      WHERE credential.tenant_id = account.tenant_id
                        AND credential.organization_id = account.organization_id
                        AND credential.account_id = account.id
                        AND credential.status = $4
                        AND credential.is_active
                        AND credential.deleted_at IS NULL
                  )
            )
            "#,
        )
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(seed.account_code)
        .bind(ACTIVE_STATUS)
        .fetch_one(pool)
        .await?;
        if !enabled_with_credential {
            return Ok(false);
        }
    }
    Ok(true)
}

/// The bundled relay default accounts must exist, be enabled, still carry their
/// `relay` supplier and hold an active credential.
///
/// This is the relay counterpart to
/// [`postgres_default_vendor_upstream_accounts_complete`], and it exists for the
/// same reason: without it a relay row that never landed — or landed disabled
/// because the install environment was mis-read — would still report
/// [`InstallationStatus::Installed`], and every relay-routed request would fail
/// closed with `50201` far from the cause.
///
/// It also asserts the joined supplier is actually `supplier_type = 'relay'`.
/// That is the one property which distinguishes these rows from a vendor
/// account, and a row that lost it would be treated as an official supplier by
/// every consumer that branches on the type.
///
/// Only rows this seed owns are inspected (the `default_relay_upstream_account`
/// marker), so an operator who replaced a relay account with their own drops
/// the marker and is not reported as an incomplete seed.
async fn postgres_default_relay_upstream_accounts_complete(
    pool: &PgPool,
) -> Result<bool, sqlx::Error> {
    for seed in DEFAULT_RELAY_SUPPLIERS.iter() {
        let enabled_with_credential = sqlx::query_scalar::<_, bool>(
            r#"
            SELECT EXISTS (
                SELECT 1
                FROM ai_upstream_account account
                JOIN ai_upstream_supplier supplier
                  ON supplier.tenant_id = account.tenant_id
                 AND supplier.organization_id = account.organization_id
                 AND supplier.id = account.supplier_id
                WHERE account.tenant_id = $1
                  AND account.organization_id = $2
                  AND account.account_code = $3
                  AND account.status = $4
                  AND account.deleted_at IS NULL
                  AND account.metadata ->> 'itemType' = 'default_relay_upstream_account'
                  AND supplier.supplier_type = $5
                  AND supplier.deleted_at IS NULL
                  AND EXISTS (
                      SELECT 1
                      FROM ai_upstream_account_credential credential
                      WHERE credential.tenant_id = account.tenant_id
                        AND credential.organization_id = account.organization_id
                        AND credential.account_id = account.id
                        AND credential.status = $4
                        AND credential.is_active
                        AND credential.deleted_at IS NULL
                  )
            )
            "#,
        )
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(seed.account_code)
        .bind(ACTIVE_STATUS)
        .bind(RELAY_SUPPLIER_TYPE)
        .fetch_one(pool)
        .await?;
        if !enabled_with_credential {
            return Ok(false);
        }
    }
    Ok(true)
}

/// The bundled default routing strategies must be present so the account-group
/// `routing_strategy_code` (price_first) resolves to a real strategy.
async fn postgres_default_admin_routing_strategies_complete(
    pool: &PgPool,
) -> Result<bool, sqlx::Error> {
    for strategy in default_admin_routing_strategies() {
        let exists = sqlx::query_scalar::<_, bool>(
            r#"
            SELECT EXISTS (
                SELECT 1
                FROM ai_routing_strategy strategy
                WHERE strategy.tenant_id = $1
                  AND strategy.organization_id = $2
                  AND strategy.strategy_code = $3
                  AND strategy.status = 1
                  AND strategy.deleted_at IS NULL
            )
            "#,
        )
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(strategy.code)
        .fetch_one(pool)
        .await?;
        if !exists {
            return Ok(false);
        }
    }
    Ok(true)
}

async fn postgres_default_admin_upstream_topology_complete(
    pool: &PgPool,
) -> Result<bool, sqlx::Error> {
    let catalog = AiRoutingSeedCatalog::load().map_err(json_decode_error)?;
    for account in default_admin_upstream_accounts() {
        let exists = sqlx::query_scalar::<_, bool>(
            r#"
            SELECT EXISTS (
                SELECT 1
                FROM ai_upstream_supplier supplier
                JOIN ai_upstream_supplier_endpoint endpoint
                  ON endpoint.tenant_id = supplier.tenant_id
                 AND endpoint.organization_id = supplier.organization_id
                 AND endpoint.supplier_id = supplier.id
                 AND endpoint.endpoint_code = $4
                 AND endpoint.status = 1
                 AND endpoint.deleted_at IS NULL
                JOIN ai_upstream_supplier_auth_method auth_method
                  ON auth_method.tenant_id = supplier.tenant_id
                 AND auth_method.organization_id = supplier.organization_id
                 AND auth_method.supplier_id = supplier.id
                 AND auth_method.auth_method_code = $5
                 AND auth_method.status = 1
                 AND auth_method.deleted_at IS NULL
                JOIN ai_resource_binding supplier_resource
                  ON supplier_resource.tenant_id = supplier.tenant_id
                 AND supplier_resource.organization_id = supplier.organization_id
                 AND supplier_resource.binding_scope = 'supplier'
                 AND supplier_resource.supplier_id = supplier.id
                 AND supplier_resource.resource_group_code = $7
                 AND supplier_resource.grant_type = 'allow'
                 AND supplier_resource.status = 1
                 AND supplier_resource.deleted_at IS NULL
                WHERE supplier.tenant_id = $1::bigint
                  AND supplier.organization_id = $2::bigint
                  AND supplier.supplier_code = $3
                  AND supplier.status = 1
                  AND supplier.deleted_at IS NULL
            )
            -- The default account may have been re-bound to a different
            -- supplier/auth method by an admin (the seed never rewrites the
            -- binding of an existing account), so completeness only requires
            -- an account with the seed account code to exist.
            AND EXISTS (
                SELECT 1
                FROM ai_upstream_account account
                WHERE account.tenant_id = $1::bigint
                  AND account.organization_id = $2::bigint
                  AND account.account_code = $6
                  AND account.deleted_at IS NULL
            )
            "#,
        )
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(account.supplier_code)
        .bind(account.endpoint_code)
        .bind(account.auth_method_code)
        .bind(account.account_code)
        .bind("official.openai.full")
        .fetch_one(pool)
        .await?;
        if !exists {
            return Ok(false);
        }
    }

    for group in default_admin_upstream_account_groups(&catalog).map_err(json_decode_error)? {
        let exists = if let Some(account_code) = group.account_code.as_deref() {
            sqlx::query_scalar::<_, bool>(
                r#"
                SELECT EXISTS (
                    SELECT 1
                    FROM ai_upstream_account_group account_group
                    JOIN ai_upstream_account_group_member member
                      ON member.tenant_id = account_group.tenant_id
                     AND member.organization_id = account_group.organization_id
                     AND member.account_group_id = account_group.id
                     AND member.status = 1
                     AND member.enabled
                     AND member.deleted_at IS NULL
                    JOIN ai_upstream_account account
                      ON account.tenant_id = member.tenant_id
                     AND account.organization_id = member.organization_id
                     AND account.id = member.account_id
                     AND account.account_code = $4
                     AND account.deleted_at IS NULL
                    JOIN ai_resource_binding group_resource
                      ON group_resource.tenant_id = account_group.tenant_id
                     AND group_resource.organization_id = account_group.organization_id
                     AND group_resource.binding_scope = 'account_group'
                     AND group_resource.account_group_id = account_group.id
                     AND group_resource.resource_group_code = $5
                     AND group_resource.grant_type = 'allow'
                     AND group_resource.status = 1
                     AND group_resource.deleted_at IS NULL
                    WHERE account_group.tenant_id = $1::bigint
                      AND account_group.organization_id = $2::bigint
                      AND account_group.group_code = $3
                      AND account_group.status = 1
                      AND account_group.deleted_at IS NULL
                )
                "#,
            )
            .bind(DEFAULT_IAM_TENANT_ID)
            .bind(DEFAULT_IAM_ORGANIZATION_ID)
            .bind(group.group_code.as_str())
            .bind(account_code)
            .bind(group.resource_group_code.as_str())
            .fetch_one(pool)
            .await?
        } else {
            // Vendor groups are seeded as empty pools (no member binding), so
            // completeness only requires the group and its resource grant.
            sqlx::query_scalar::<_, bool>(
                r#"
                SELECT EXISTS (
                    SELECT 1
                    FROM ai_upstream_account_group account_group
                    JOIN ai_resource_binding group_resource
                      ON group_resource.tenant_id = account_group.tenant_id
                     AND group_resource.organization_id = account_group.organization_id
                     AND group_resource.binding_scope = 'account_group'
                     AND group_resource.account_group_id = account_group.id
                     AND group_resource.resource_group_code = $4
                     AND group_resource.grant_type = 'allow'
                     AND group_resource.status = 1
                     AND group_resource.deleted_at IS NULL
                    WHERE account_group.tenant_id = $1::bigint
                      AND account_group.organization_id = $2::bigint
                      AND account_group.group_code = $3
                      AND account_group.vendor_code = $5
                      AND account_group.status = 1
                      AND account_group.deleted_at IS NULL
                )
                "#,
            )
            .bind(DEFAULT_IAM_TENANT_ID)
            .bind(DEFAULT_IAM_ORGANIZATION_ID)
            .bind(group.group_code.as_str())
            .bind(group.resource_group_code.as_str())
            .bind(group.vendor_code.as_deref())
            .fetch_one(pool)
            .await?
        };
        if !exists {
            return Ok(false);
        }
    }

    Ok(true)
}

async fn import_postgres_api_endpoints(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    for resource in api_endpoint_resources(catalog) {
        let item = EndpointSeedDefinition { resource };
        let path_template = item.path_template();
        sqlx::query(
            r#"
            INSERT INTO ai_api_endpoint
                (uuid, tenant_id, organization_id, data_scope, status, metadata, endpoint_code, protocol_code, display_name, method, path_template, request_schema, response_schema, streaming_supported, sort_order, id)
            VALUES
                ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, '{}'::jsonb, '{}'::jsonb, $12, $13, $14)
            ON CONFLICT(tenant_id, organization_id, endpoint_code) DO UPDATE SET
                protocol_code = excluded.protocol_code,
                display_name = excluded.display_name,
                method = excluded.method,
                path_template = excluded.path_template,
                request_schema = excluded.request_schema,
                response_schema = excluded.response_schema,
                streaming_supported = excluded.streaming_supported,
                sort_order = excluded.sort_order,
                metadata = excluded.metadata,
                deleted_at = NULL,
                deleted_by = NULL,
                status = excluded.status
            "#,
        )
        .bind(stable_seed_uuid("sdk-ai-api-endpoint", &[item.api_code()]))
        .bind(SYSTEM_TENANT_ID)
        .bind(SYSTEM_ORGANIZATION_ID)
        .bind(SYSTEM_DATA_SCOPE)
        .bind(ACTIVE_STATUS)
        .bind(endpoint_metadata(catalog, &item))
        .bind(item.api_code())
        .bind(item.protocol_code())
        .bind(item.display_name())
        .bind(item.method())
        .bind(path_template)
        .bind(item.streaming_supported())
        .bind(item.sort_order())
        .bind(stable_seed_id("sdk-ai-api-endpoint-id", &[item.api_code()]))
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

async fn import_postgres_resources(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    for item in &catalog.resources {
        sqlx::query(resource_upsert_postgres())
            .bind(stable_seed_uuid("sdk-ai-resource", &[&item.resource_code]))
            .bind(SYSTEM_TENANT_ID)
            .bind(SYSTEM_ORGANIZATION_ID)
            .bind(SYSTEM_DATA_SCOPE)
            .bind(ACTIVE_STATUS)
            .bind(seed_metadata(
                catalog,
                "resource",
                &item.resource_code,
                resource_metadata(item),
            ))
            .bind(&item.resource_code)
            .bind(&item.resource_type)
            .bind(&item.display_name)
            .bind(resource_display_name_i18n(item))
            .bind(&item.vendor_code)
            .bind(&item.modality_code)
            .bind(&item.api_code)
            .bind(&item.catalog_key)
            .bind(&item.model)
            .bind(&item.provider_native_model)
            .bind(resource_schema(item))
            .bind(metadata_schema(item))
            .bind(resource_description(item))
            .bind(item.sort_order)
            .bind(stable_seed_id("sdk-ai-resource-id", &[&item.resource_code]))
            .execute(&mut **tx)
            .await?;
    }
    Ok(())
}

async fn import_postgres_resource_groups(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    for item in &catalog.resource_groups {
        sqlx::query(
            r#"
            INSERT INTO ai_resource_group
                (uuid, tenant_id, organization_id, data_scope, status, metadata, group_code, group_name, group_type, selection_mode, description, sort_order, id)
            VALUES
                ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT(tenant_id, organization_id, group_code) DO UPDATE SET
                group_name = excluded.group_name,
                group_type = excluded.group_type,
                selection_mode = excluded.selection_mode,
                description = excluded.description,
                sort_order = excluded.sort_order,
                metadata = excluded.metadata,
                deleted_at = NULL,
                deleted_by = NULL,
                status = excluded.status
            "#,
        )
        .bind(stable_seed_uuid("sdk-ai-resource-group", &[&item.group_code]))
        .bind(SYSTEM_TENANT_ID)
        .bind(SYSTEM_ORGANIZATION_ID)
        .bind(SYSTEM_DATA_SCOPE)
        .bind(ACTIVE_STATUS)
        .bind(seed_metadata(
            catalog,
            "resource_group",
            &item.group_code,
            serde_json::json!({
                "groupType": item.group_type,
                "selectionMode": item.selection_mode,
            }),
        ))
        .bind(&item.group_code)
        .bind(&item.group_name)
        .bind(&item.group_type)
        .bind(&item.selection_mode)
        .bind(&item.description)
        .bind(item.sort_order)
        .bind(stable_seed_id("sdk-ai-resource-group-id", &[&item.group_code]))
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

async fn disable_removed_postgres_resource_groups(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    let expected_group_codes = expected_group_codes(catalog);
    let rows = sqlx::query(
        r#"
        SELECT id, group_code
        FROM ai_resource_group
        WHERE tenant_id = $1
          AND organization_id = $2
          AND deleted_at IS NULL
          AND metadata ->> 'catalogCode' = $3
        "#,
    )
    .bind(SYSTEM_TENANT_ID)
    .bind(SYSTEM_ORGANIZATION_ID)
    .bind(&catalog.manifest.catalog_code)
    .fetch_all(&mut **tx)
    .await?;

    for row in rows {
        let group_code = row.get::<String, _>("group_code");
        if expected_group_codes.contains(group_code.as_str()) {
            continue;
        }
        let group_id = row.get::<i64, _>("id");
        sqlx::query(
            r#"
            UPDATE ai_resource_group_item
            SET status = $1, deleted_at = NOW()
            WHERE tenant_id = $2
              AND organization_id = $3
              AND resource_group_id = $4
              AND deleted_at IS NULL
            "#,
        )
        .bind(DISABLED_STATUS)
        .bind(SYSTEM_TENANT_ID)
        .bind(SYSTEM_ORGANIZATION_ID)
        .bind(group_id)
        .execute(&mut **tx)
        .await?;
        sqlx::query(
            r#"
            UPDATE ai_resource_group
            SET status = $1, deleted_at = NOW()
            WHERE tenant_id = $2
              AND organization_id = $3
              AND id = $4
              AND deleted_at IS NULL
            "#,
        )
        .bind(DISABLED_STATUS)
        .bind(SYSTEM_TENANT_ID)
        .bind(SYSTEM_ORGANIZATION_ID)
        .bind(group_id)
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

async fn import_postgres_resource_group_items(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    let group_ids = postgres_group_ids(tx).await?;
    clear_postgres_seed_resource_group_items(tx, catalog, &group_ids).await?;
    for group in &catalog.resource_groups {
        let Some(group_id) = group_ids.get(group.group_code.as_str()).copied() else {
            continue;
        };
        for (index, item) in group.items.iter().enumerate() {
            let resource_code = resource_item_code(item);
            let child_group_code = child_group_item_code(item);
            sqlx::query(group_item_upsert_postgres())
                .bind(stable_group_item_uuid(group, item))
                .bind(SYSTEM_TENANT_ID)
                .bind(SYSTEM_ORGANIZATION_ID)
                .bind(SYSTEM_DATA_SCOPE)
                .bind(ACTIVE_STATUS)
                .bind(seed_metadata(
                    catalog,
                    "resource_group_item",
                    &group.group_code,
                    serde_json::json!({
                        "resourceCode": resource_code,
                        "childResourceGroupCode": child_group_code,
                    }),
                ))
                .bind(group_id)
                .bind(&group.group_code)
                .bind(&item.item_type)
                .bind(resource_code)
                .bind(child_group_code)
                .bind("included")
                .bind((index as i32) + 1)
                .bind(stable_group_item_id(group, item))
                .execute(&mut **tx)
                .await?;
        }
    }
    Ok(())
}

async fn clear_postgres_seed_resource_group_items(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    catalog: &AiRoutingSeedCatalog,
    group_ids: &BTreeMap<String, i64>,
) -> Result<(), sqlx::Error> {
    for group in &catalog.resource_groups {
        let Some(group_id) = group_ids.get(group.group_code.as_str()).copied() else {
            continue;
        };
        sqlx::query(
            r#"
            UPDATE ai_resource_group_item
            SET status = $1, deleted_at = NOW()
            WHERE tenant_id = $2
              AND organization_id = $3
              AND resource_group_id = $4
              AND deleted_at IS NULL
            "#,
        )
        .bind(DISABLED_STATUS)
        .bind(SYSTEM_TENANT_ID)
        .bind(SYSTEM_ORGANIZATION_ID)
        .bind(group_id)
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

async fn import_postgres_default_admin_upstream_topology(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    for account in default_admin_upstream_accounts() {
        let supplier_id = default_admin_upstream_supplier_id(account);
        let endpoint_id = default_admin_upstream_supplier_endpoint_id(account);
        let auth_method_id = default_admin_upstream_supplier_auth_method_id(account);
        let account_id = default_admin_upstream_account_id(account);
        let metadata = seed_metadata(
            catalog,
            "default_admin_upstream_supplier",
            account.supplier_code,
            serde_json::json!({
                "supplierCode": account.supplier_code,
                "accountCode": account.account_code,
                "initialAccountStatus": "disabled",
            }),
        );

        sqlx::query(
            r#"
            INSERT INTO ai_upstream_supplier (
                id, uuid, tenant_id, organization_id, data_scope, status, metadata,
                supplier_code, supplier_name, display_name, display_name_i18n, supplier_type,
                adapter_code, protocol_code, environment, sort_order
            ) VALUES (
                $1, $2, $3, $4, $5, 1, $6::jsonb,
                $7, $8, $8, $9::jsonb, $10,
                $11, $12, 1, $13
            )
            ON CONFLICT (tenant_id, organization_id, supplier_code) DO UPDATE SET
                supplier_name = EXCLUDED.supplier_name,
                display_name = EXCLUDED.display_name,
                display_name_i18n = EXCLUDED.display_name_i18n,
                supplier_type = EXCLUDED.supplier_type,
                adapter_code = EXCLUDED.adapter_code,
                protocol_code = EXCLUDED.protocol_code,
                environment = EXCLUDED.environment,
                sort_order = EXCLUDED.sort_order,
                status = EXCLUDED.status,
                metadata = EXCLUDED.metadata,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(supplier_id)
        .bind(stable_seed_uuid(
            "sdk-ai-upstream-supplier",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                account.supplier_code,
            ],
        ))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(&metadata)
        .bind(account.supplier_code)
        .bind(account.supplier_name)
        .bind(account.supplier_display_name_i18n)
        .bind(account.supplier_type)
        .bind(account.adapter_code)
        .bind(account.protocol_code)
        .bind(account.priority)
        .execute(&mut **tx)
        .await?;

        // Resolve the upserted supplier's actual id: ON CONFLICT preserves the
        // id of a pre-existing row (e.g., one written by an older seed
        // derivation), so dependent inserts must reference the real id instead
        // of the deterministic seed id.
        let supplier_id = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT id
            FROM ai_upstream_supplier
            WHERE tenant_id = $1 AND organization_id = $2
              AND supplier_code = $3 AND deleted_at IS NULL
            "#,
        )
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(account.supplier_code)
        .fetch_one(&mut **tx)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO ai_upstream_supplier_endpoint (
                id, uuid, tenant_id, organization_id, data_scope, status, metadata,
                supplier_id, supplier_code, endpoint_code, endpoint_name, base_url,
                protocol_code, environment, priority, routing_weight
            ) VALUES (
                $1, $2, $3, $4, $5, 1, $6::jsonb,
                $7, $8, $9, $10, $11,
                $12, 1, $13, $14
            )
            ON CONFLICT (tenant_id, organization_id, supplier_id, endpoint_code) DO UPDATE SET
                endpoint_name = EXCLUDED.endpoint_name,
                base_url = EXCLUDED.base_url,
                protocol_code = EXCLUDED.protocol_code,
                environment = EXCLUDED.environment,
                priority = EXCLUDED.priority,
                routing_weight = EXCLUDED.routing_weight,
                status = EXCLUDED.status,
                metadata = EXCLUDED.metadata,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(endpoint_id)
        .bind(stable_seed_uuid(
            "sdk-ai-upstream-supplier-endpoint",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                account.supplier_code,
                account.endpoint_code,
            ],
        ))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(&metadata)
        .bind(supplier_id)
        .bind(account.supplier_code)
        .bind(account.endpoint_code)
        .bind(account.endpoint_name)
        .bind(account.base_url)
        .bind(account.protocol_code)
        .bind(account.priority)
        .bind(account.routing_weight)
        .execute(&mut **tx)
        .await?;

        // Resolve the upserted endpoint's actual id so the health state row
        // references the real supplier endpoint (see the supplier resolution).
        let endpoint_id = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT id
            FROM ai_upstream_supplier_endpoint
            WHERE tenant_id = $1 AND organization_id = $2
              AND supplier_id = $3 AND endpoint_code = $4 AND deleted_at IS NULL
            "#,
        )
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(supplier_id)
        .bind(account.endpoint_code)
        .fetch_one(&mut **tx)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO ai_upstream_supplier_endpoint_health_state (
                id, tenant_id, organization_id, supplier_id, endpoint_id,
                health_status, consecutive_error_count
            ) VALUES ($1, $2, $3, $4, $1, 0, 0)
            ON CONFLICT (tenant_id, organization_id, endpoint_id) DO NOTHING
            "#,
        )
        .bind(endpoint_id)
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(supplier_id)
        .execute(&mut **tx)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO ai_upstream_supplier_auth_method (
                id, uuid, tenant_id, organization_id, data_scope, status, metadata,
                supplier_id, supplier_code, auth_method_code, auth_method_name,
                auth_type, config_schema, runtime_auth_config, priority
            ) VALUES (
                $1, $2, $3, $4, $5, 1, $6::jsonb,
                $7, $8, $9, 'API Key',
                'api_key', '{"type":"object","required":["apiKey"],"properties":{"apiKey":{"type":"string","writeOnly":true}}}'::jsonb,
                '{"credentialTransport":"bearer","defaultHeaders":{}}'::jsonb, $10
            )
            ON CONFLICT (tenant_id, organization_id, supplier_id, auth_method_code) DO UPDATE SET
                auth_method_name = EXCLUDED.auth_method_name,
                auth_type = EXCLUDED.auth_type,
                config_schema = EXCLUDED.config_schema,
                runtime_auth_config = EXCLUDED.runtime_auth_config,
                priority = EXCLUDED.priority,
                status = EXCLUDED.status,
                metadata = EXCLUDED.metadata,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(auth_method_id)
        .bind(stable_seed_uuid(
            "sdk-ai-upstream-supplier-auth-method",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                account.supplier_code,
                account.auth_method_code,
            ],
        ))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(&metadata)
        .bind(supplier_id)
        .bind(account.supplier_code)
        .bind(account.auth_method_code)
        .bind(account.priority)
        .execute(&mut **tx)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO ai_upstream_account (
                id, uuid, tenant_id, organization_id, data_scope, status, metadata,
                supplier_id, supplier_code, preferred_endpoint_id,
                account_code, account_name, account_type, auth_method_code,
                credential_rotation_strategy, environment,
                billing_mode, contract_cost_multiplier
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7::jsonb,
                $8, $9, $10,
                $11, $12, $13, $14,
                'default', 1,
                'prepay', 1.000000000000
            )
            ON CONFLICT (tenant_id, organization_id, account_code) DO UPDATE SET
                -- An existing account may have been re-configured by an admin
                -- (supplier, auth method, preferred endpoint, name, pricing)
                -- and may carry credentials. Rewriting those columns here would
                -- clobber admin configuration and can violate the credential
                -- foreign key fk_ai_upstream_account_credential_account (it
                -- references tenant_id, organization_id, id, auth_method_code),
                -- so only the seed metadata is refreshed and a soft-deleted
                -- row is revived.
                metadata = EXCLUDED.metadata,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(account_id)
        .bind(stable_seed_uuid(
            "sdk-ai-upstream-account",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                account.account_code,
            ],
        ))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(DISABLED_STATUS)
        .bind(&metadata)
        .bind(supplier_id)
        .bind(account.supplier_code)
        .bind(endpoint_id)
        .bind(account.account_code)
        .bind(account.account_name)
        .bind(account.account_type)
        .bind(account.auth_method_code)
        .execute(&mut **tx)
        .await?;

        // Resolve the upserted account's actual id so the health state row
        // references the real account (see the supplier resolution).
        let account_id = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT id
            FROM ai_upstream_account
            WHERE tenant_id = $1 AND organization_id = $2
              AND account_code = $3 AND deleted_at IS NULL
            "#,
        )
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(account.account_code)
        .fetch_one(&mut **tx)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO ai_upstream_account_health_state (
                id, tenant_id, organization_id, account_id,
                health_status, consecutive_error_count
            ) VALUES ($1, $2, $3, $1, 0, 0)
            ON CONFLICT (tenant_id, organization_id, account_id) DO NOTHING
            "#,
        )
        .bind(account_id)
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .execute(&mut **tx)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO ai_resource_binding (
                id, uuid, tenant_id, organization_id, data_scope, status, metadata,
                binding_scope, supplier_id, supplier_code,
                resource_id, resource_code, resource_group_code,
                grant_type, priority
            )
            SELECT
                $1, $2, $3, $4, $5, 1, $6::jsonb,
                'supplier', $7, $8,
                NULL, NULL, $9,
                'allow', $10
            ON CONFLICT (id) DO UPDATE SET
                grant_type = EXCLUDED.grant_type,
                priority = EXCLUDED.priority,
                status = EXCLUDED.status,
                metadata = EXCLUDED.metadata,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(stable_seed_id(
            "sdk-ai-upstream-supplier-resource-id",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                account.supplier_code,
                "official.openai.full",
            ],
        ))
        .bind(stable_seed_uuid(
            "sdk-ai-upstream-supplier-resource",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                account.supplier_code,
                "official.openai.full",
            ],
        ))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(&metadata)
        .bind(supplier_id)
        .bind(account.supplier_code)
        .bind("official.openai.full")
        .bind(account.priority)
        .execute(&mut **tx)
        .await?;
    }

    for group in default_admin_upstream_account_groups(catalog).map_err(json_decode_error)? {
        // The member account may legitimately not exist yet: the default mixed
        // group names `openai-default`, which the *vendor* account path below
        // creates, and `DEFAULT_ADMIN_UPSTREAM_ACCOUNTS` is deliberately empty
        // so the two paths never write the same row. A `fetch_one` here would
        // therefore abort the whole seed on a fresh database with a bare
        // `RowNotFound`, leaving the schema half-populated and the startup gate
        // reporting an unexplained `UpgradeRequired` for ever.
        //
        // The membership is loaded again once the vendor accounts exist (see
        // `sync_default_group_members` at the end of the seed), so a group that
        // resolves no account here is completed rather than skipped.
        let account_id = match group.account_code.as_deref() {
            Some(account_code) => sqlx::query_scalar::<_, i64>(
                r#"
                    SELECT id
                    FROM ai_upstream_account
                    WHERE tenant_id = $1 AND organization_id = $2
                      AND account_code = $3 AND deleted_at IS NULL
                    "#,
            )
            .bind(DEFAULT_IAM_TENANT_ID)
            .bind(DEFAULT_IAM_ORGANIZATION_ID)
            .bind(account_code)
            .fetch_optional(&mut **tx)
            .await?,
            None => None,
        };
        let account_group_id = default_admin_upstream_account_group_id(&group);
        let metadata = seed_metadata(
            catalog,
            "default_admin_upstream_account_group",
            &group.group_code,
            serde_json::json!({
                "groupCode": group.group_code.as_str(),
                "accountCode": &group.account_code,
                "resourceGroupCode": group.resource_group_code.as_str(),
                "vendorCode": &group.vendor_code,
                "modalities": &group.modalities,
            }),
        );
        let modalities_json = serde_json::json!(&group.modalities).to_string();
        let tags_json = serde_json::json!(&group.tags).to_string();

        if group.is_default {
            // Clear the default flag on every other group in the same tenant and
            // organization scope so the partial unique index keeps exactly one
            // default group. Versions advance so concurrent optimistic-lock
            // editors observe the change instead of silently reverting it.
            sqlx::query(
                r#"
                UPDATE ai_upstream_account_group
                SET is_default = FALSE,
                    version = version + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE tenant_id = $1 AND organization_id = $2
                  AND is_default
                  AND group_code <> $3
                  AND deleted_at IS NULL
                "#,
            )
            .bind(DEFAULT_IAM_TENANT_ID)
            .bind(DEFAULT_IAM_ORGANIZATION_ID)
            .bind(group.group_code.as_str())
            .execute(&mut **tx)
            .await?;
        }

        sqlx::query(
            r#"
            INSERT INTO ai_upstream_account_group (
                id, uuid, tenant_id, organization_id, data_scope, status, metadata,
                group_code, group_name, group_name_i18n, description, group_type,
                routing_strategy, routing_strategy_code, fallback_mode, priority, environment,
                pricing_plan_code, cost_multiplier, sale_multiplier,
                billing_type, allowed_origin, vendor_code, modalities, tags,
                is_default
            ) VALUES (
                $1, $2, $3, $4, $5, 1, $6::jsonb,
                $7, $8, $9::jsonb, $10, $11,
                'weighted', 'price_first', 'sequential', $12, 1,
                'standard', 1.000000000000, 1.000000000000,
                1, '[]'::jsonb, $13, $14::jsonb, $15::jsonb,
                $16
            )
            ON CONFLICT (tenant_id, organization_id, group_code) DO UPDATE SET
                group_name = EXCLUDED.group_name,
                group_name_i18n = EXCLUDED.group_name_i18n,
                description = EXCLUDED.description,
                group_type = EXCLUDED.group_type,
                routing_strategy = EXCLUDED.routing_strategy,
                routing_strategy_code = EXCLUDED.routing_strategy_code,
                fallback_mode = EXCLUDED.fallback_mode,
                priority = EXCLUDED.priority,
                environment = EXCLUDED.environment,
                pricing_plan_code = EXCLUDED.pricing_plan_code,
                cost_multiplier = EXCLUDED.cost_multiplier,
                sale_multiplier = EXCLUDED.sale_multiplier,
                billing_type = EXCLUDED.billing_type,
                allowed_origin = EXCLUDED.allowed_origin,
                vendor_code = EXCLUDED.vendor_code,
                modalities = EXCLUDED.modalities,
                tags = EXCLUDED.tags,
                status = EXCLUDED.status,
                is_default = EXCLUDED.is_default,
                metadata = EXCLUDED.metadata,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(account_group_id)
        .bind(stable_seed_uuid(
            "sdk-ai-upstream-account-group",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                group.group_code.as_str(),
            ],
        ))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(&metadata)
        .bind(group.group_code.as_str())
        .bind(group.group_name.as_str())
        .bind(group.group_name_i18n.as_str())
        .bind(format!(
            "Default routing group authorized for {}",
            group.resource_group_code
        ))
        .bind(group.group_type)
        .bind(group.priority)
        .bind(group.vendor_code.as_deref())
        .bind(modalities_json)
        .bind(tags_json)
        .bind(group.is_default)
        .execute(&mut **tx)
        .await?;

        // Resolve the upserted group's actual id (see the supplier resolution):
        // members and group resource grants must reference the real id instead
        // of the deterministic seed id, which a pre-existing row does not have.
        let account_group_id = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT id
            FROM ai_upstream_account_group
            WHERE tenant_id = $1 AND organization_id = $2
              AND group_code = $3 AND deleted_at IS NULL
            "#,
        )
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(group.group_code.as_str())
        .fetch_one(&mut **tx)
        .await?;

        if let Some(account_id) = account_id {
            let account_code = group.account_code.as_deref().unwrap_or_default();
            sqlx::query(
                r#"
                INSERT INTO ai_upstream_account_group_member (
                    id, uuid, tenant_id, organization_id, data_scope, status, metadata,
                    account_group_id, account_id, priority, routing_weight, enabled
                ) VALUES (
                    $1, $2, $3, $4, $5, 1, $6::jsonb,
                    $7, $8, $9, $10, TRUE
                )
                ON CONFLICT (tenant_id, organization_id, account_group_id, account_id) DO UPDATE SET
                    priority = EXCLUDED.priority,
                    routing_weight = EXCLUDED.routing_weight,
                    enabled = EXCLUDED.enabled,
                    status = EXCLUDED.status,
                    metadata = EXCLUDED.metadata,
                    deleted_at = NULL,
                    deleted_by = NULL
                "#,
            )
            .bind(stable_seed_id(
                "sdk-ai-upstream-account-group-member-id",
                &[
                    &DEFAULT_IAM_TENANT_ID.to_string(),
                    &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                    group.group_code.as_str(),
                    account_code,
                ],
            ))
            .bind(stable_seed_uuid(
                "sdk-ai-upstream-account-group-member",
                &[
                    &DEFAULT_IAM_TENANT_ID.to_string(),
                    &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                    group.group_code.as_str(),
                    account_code,
                ],
            ))
            .bind(DEFAULT_IAM_TENANT_ID)
            .bind(DEFAULT_IAM_ORGANIZATION_ID)
            .bind(DEFAULT_ADMIN_DATA_SCOPE)
            .bind(&metadata)
            .bind(account_group_id)
            .bind(account_id)
            .bind(group.priority)
            .bind(group.routing_weight)
            .execute(&mut **tx)
            .await?;
        }

        for resource_group_code in group.resource_group_codes() {
            sqlx::query(
                r#"
                INSERT INTO ai_resource_binding (
                    id, uuid, tenant_id, organization_id, data_scope, status, metadata,
                    binding_scope, account_group_id, account_group_code,
                    resource_id, resource_code, resource_group_code,
                    grant_type, priority
                )
                VALUES (
                    $1, $2, $3, $4, $5, 1, $6::jsonb,
                    'account_group', $7, NULL,
                    NULL, NULL, $8,
                    'allow', $9
                )
                ON CONFLICT (id) DO UPDATE SET
                    grant_type = EXCLUDED.grant_type,
                    priority = EXCLUDED.priority,
                    status = EXCLUDED.status,
                    metadata = EXCLUDED.metadata,
                    deleted_at = NULL,
                    deleted_by = NULL
                "#,
            )
            .bind(stable_seed_id(
                "sdk-ai-upstream-account-group-resource-id",
                &[
                    &DEFAULT_IAM_TENANT_ID.to_string(),
                    &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                    group.group_code.as_str(),
                    resource_group_code,
                ],
            ))
            .bind(stable_seed_uuid(
                "sdk-ai-upstream-account-group-resource",
                &[
                    &DEFAULT_IAM_TENANT_ID.to_string(),
                    &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                    group.group_code.as_str(),
                    resource_group_code,
                ],
            ))
            .bind(DEFAULT_IAM_TENANT_ID)
            .bind(DEFAULT_IAM_ORGANIZATION_ID)
            .bind(DEFAULT_ADMIN_DATA_SCOPE)
            .bind(&metadata)
            .bind(account_group_id)
            .bind(resource_group_code)
            .bind(group.priority)
            .execute(&mut **tx)
            .await?;
        }
    }

    Ok(())
}

/// Attaches the bundled default account-group members that could not be
/// resolved while [`import_postgres_default_admin_upstream_topology`] ran.
///
/// The default mixed group names `openai-default`, and that account is created
/// by the *vendor* path, which runs afterwards. The topology step therefore
/// leaves the membership out when the account does not exist yet, and this
/// reconciliation closes the gap once it does.
///
/// It is deliberately a separate pass rather than a reordering: the vendor path
/// needs the supplier rows and resource groups the topology step writes, so the
/// two cannot be swapped. Running the membership upsert twice is harmless — the
/// insert is keyed on the same unique index the first pass would have used — and
/// it keeps a *pre-existing* database (where the account was already there)
/// converging to exactly the same rows.
///
/// A member is only written when both the group and the account exist and the
/// group is seed-owned, so an operator who replaced either one is not
/// re-attached.
async fn sync_default_group_members(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    for group in default_admin_upstream_account_groups(catalog).map_err(json_decode_error)? {
        let Some(account_code) = group.account_code.as_deref() else {
            continue;
        };
        let membership = sqlx::query_as::<_, (i64, i64)>(
            r#"
            SELECT account_group.id, account.id
            FROM ai_upstream_account_group account_group
            JOIN ai_upstream_account account
              ON account.tenant_id = account_group.tenant_id
             AND account.organization_id = account_group.organization_id
             AND account.account_code = $4
             AND account.deleted_at IS NULL
            WHERE account_group.tenant_id = $1
              AND account_group.organization_id = $2
              AND account_group.group_code = $3
              AND account_group.deleted_at IS NULL
              AND account_group.metadata ->> 'itemCode' = $3
            "#,
        )
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(group.group_code.as_str())
        .bind(account_code)
        .fetch_optional(&mut **tx)
        .await?;
        let Some((account_group_id, account_id)) = membership else {
            continue;
        };

        let metadata = seed_metadata(
            catalog,
            "default_admin_upstream_account_group",
            &group.group_code,
            serde_json::json!({
                "groupCode": group.group_code.as_str(),
                "accountCode": account_code,
                "resourceGroupCode": group.resource_group_code.as_str(),
                "vendorCode": &group.vendor_code,
                "modalities": &group.modalities,
            }),
        );
        sqlx::query(
            r#"
            INSERT INTO ai_upstream_account_group_member (
                id, uuid, tenant_id, organization_id, data_scope, status, metadata,
                account_group_id, account_id, priority, routing_weight, enabled
            ) VALUES (
                $1, $2, $3, $4, $5, 1, $6::jsonb,
                $7, $8, $9, $10, TRUE
            )
            ON CONFLICT (tenant_id, organization_id, account_group_id, account_id) DO UPDATE SET
                priority = EXCLUDED.priority,
                routing_weight = EXCLUDED.routing_weight,
                enabled = EXCLUDED.enabled,
                status = EXCLUDED.status,
                metadata = EXCLUDED.metadata,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(stable_seed_id(
            "sdk-ai-upstream-account-group-member-id",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                group.group_code.as_str(),
                account_code,
            ],
        ))
        .bind(stable_seed_uuid(
            "sdk-ai-upstream-account-group-member",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                group.group_code.as_str(),
                account_code,
            ],
        ))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(&metadata)
        .bind(account_group_id)
        .bind(account_id)
        .bind(group.priority)
        .bind(group.routing_weight)
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

/// Seeds one routable upstream account per bundled vendor so that every derived
/// vendor-modality account group becomes a non-empty pool.
///
/// Without this step the seed ships a complete taxonomy (resources, resource
/// groups, account groups, endpoints) and exactly one account
/// (`openai-default`), so any request classified onto a non-OpenAI vendor group
/// fails closed with "no upstream account routes are configured" even though
/// every static gate is green.
///
/// For each vendor the seed upserts, in dependency order:
///
/// 1. `ai_upstream_supplier` — the vendor itself.
/// 2. `ai_upstream_supplier_endpoint` (`official-global`) — the vendor's real
///    host, so the account resolves a base URL.
/// 3. `ai_upstream_supplier_auth_method` (`api_key`, bearer transport).
/// 4. `ai_upstream_account` — enabled only in a development-like environment.
/// 5. `ai_upstream_account_credential` — a placeholder secret, sealed with the
///    configured upstream-credential key ring so the runtime decoder accepts it.
/// 6. `ai_resource_binding` (scope `supplier`) — grants the vendor's curated
///    resource group to the supplier, mirroring the OpenAI entry.
/// 7. `ai_upstream_account_group_member` — attaches the account to every derived
///    account group for that vendor.
///
/// Idempotent: every statement upserts on the natural key, and an account that
/// an operator has already re-configured is never rewritten (only revived).
async fn import_postgres_default_vendor_upstream_accounts(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    catalog: &AiRoutingSeedCatalog,
    enabled: bool,
    credential_codec: Option<&(dyn UpstreamCredentialSecretCodec + Send + Sync)>,
) -> Result<(), sqlx::Error> {
    let vendor_modalities = vendor_account_group_modalities(catalog).map_err(json_decode_error)?;
    let resource_group_codes: BTreeSet<&str> = catalog
        .resource_groups
        .iter()
        .map(|group| group.group_code.as_str())
        .collect();

    for seed in DEFAULT_VENDOR_UPSTREAM_ACCOUNTS.iter() {
        let modalities = vendor_modalities
            .get(seed.vendor_code)
            .ok_or_else(|| {
                AiRoutingSeedLoadError::Validation(format!(
                    "default vendor upstream account `{}` has no derivable account groups",
                    seed.vendor_code
                ))
            })
            .map_err(json_decode_error)?;
        let resource_group_code = VENDOR_RESOURCE_GROUP_BINDINGS
            .iter()
            .find(|(code, _)| *code == seed.vendor_code)
            .map(|(_, group_code)| *group_code)
            .ok_or_else(|| {
                AiRoutingSeedLoadError::Validation(format!(
                    "default vendor upstream account `{}` has no resource group binding",
                    seed.vendor_code
                ))
            })
            .map_err(json_decode_error)?;
        if !resource_group_codes.contains(resource_group_code) {
            return Err(json_decode_error(AiRoutingSeedLoadError::Validation(
                format!(
                    "default vendor upstream account `{}` binds unknown resource group `{resource_group_code}`",
                    seed.vendor_code
                ),
            )));
        }
        if modalities.is_empty() {
            return Err(json_decode_error(AiRoutingSeedLoadError::Validation(
                format!(
                    "default vendor upstream account `{}` has an empty modality set",
                    seed.vendor_code
                ),
            )));
        }

        let supplier_id = stable_seed_id(
            "sdk-ai-upstream-supplier-id",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                seed.vendor_code,
            ],
        );
        let metadata = seed_metadata(
            catalog,
            "default_vendor_upstream_supplier",
            seed.vendor_code,
            serde_json::json!({
                "supplierCode": seed.vendor_code,
                "accountCode": seed.account_code,
                "initialAccountStatus": if enabled { "enabled" } else { "disabled" },
                "seedPurpose": "content-generation-default-account",
            }),
        );
        // The account row carries its own marker so the upsert below can tell a
        // bundled vendor account (safe to converge to the environment's status)
        // from an operator-configured one. It must differ from the admin path's
        // `default_admin_upstream_supplier`, because openai is written by both
        // paths and the admin path always runs first.
        let account_metadata = seed_metadata(
            catalog,
            "default_vendor_upstream_account",
            seed.account_code,
            serde_json::json!({
                "supplierCode": seed.vendor_code,
                "accountCode": seed.account_code,
                "initialAccountStatus": if enabled { "enabled" } else { "disabled" },
                "seedPurpose": "content-generation-default-account",
            }),
        );

        sqlx::query(
            r#"
            INSERT INTO ai_upstream_supplier (
                id, uuid, tenant_id, organization_id, data_scope, status, metadata,
                supplier_code, supplier_name, display_name, display_name_i18n, supplier_type,
                adapter_code, protocol_code, environment, sort_order
            ) VALUES (
                $1, $2, $3, $4, $5, 1, $6::jsonb,
                $7, $8, $8, $9::jsonb, 'official',
                $10, $11, 1, $12
            )
            ON CONFLICT (tenant_id, organization_id, supplier_code) DO UPDATE SET
                supplier_name = EXCLUDED.supplier_name,
                display_name = EXCLUDED.display_name,
                display_name_i18n = EXCLUDED.display_name_i18n,
                adapter_code = EXCLUDED.adapter_code,
                protocol_code = EXCLUDED.protocol_code,
                environment = EXCLUDED.environment,
                sort_order = EXCLUDED.sort_order,
                status = EXCLUDED.status,
                metadata = EXCLUDED.metadata,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(supplier_id)
        .bind(stable_seed_uuid(
            "sdk-ai-upstream-supplier",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                seed.vendor_code,
            ],
        ))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(&metadata)
        .bind(seed.vendor_code)
        .bind(seed.supplier_name)
        .bind(seed.supplier_display_name_i18n)
        .bind(seed.adapter_code)
        .bind(seed.protocol_code)
        .bind(seeded_supplier_sort_order(seed.vendor_code))
        .execute(&mut **tx)
        .await?;

        let supplier_id = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT id
            FROM ai_upstream_supplier
            WHERE tenant_id = $1 AND organization_id = $2
              AND supplier_code = $3 AND deleted_at IS NULL
            "#,
        )
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(seed.vendor_code)
        .fetch_one(&mut **tx)
        .await?;

        let endpoint_id = stable_seed_id(
            "sdk-ai-upstream-supplier-endpoint-id",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                seed.vendor_code,
                DEFAULT_VENDOR_ENDPOINT_CODE,
            ],
        );
        sqlx::query(
            r#"
            INSERT INTO ai_upstream_supplier_endpoint (
                id, uuid, tenant_id, organization_id, data_scope, status, metadata,
                supplier_id, supplier_code, endpoint_code, endpoint_name, base_url,
                protocol_code, environment, priority, routing_weight
            ) VALUES (
                $1, $2, $3, $4, $5, 1, $6::jsonb,
                $7, $8, $9, $10, $11,
                $12, 1, $13, $14
            )
            ON CONFLICT (tenant_id, organization_id, supplier_id, endpoint_code) DO UPDATE SET
                endpoint_name = EXCLUDED.endpoint_name,
                base_url = EXCLUDED.base_url,
                protocol_code = EXCLUDED.protocol_code,
                environment = EXCLUDED.environment,
                priority = EXCLUDED.priority,
                routing_weight = EXCLUDED.routing_weight,
                status = EXCLUDED.status,
                metadata = EXCLUDED.metadata,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(endpoint_id)
        .bind(stable_seed_uuid(
            "sdk-ai-upstream-supplier-endpoint",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                seed.vendor_code,
                DEFAULT_VENDOR_ENDPOINT_CODE,
            ],
        ))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(&metadata)
        .bind(supplier_id)
        .bind(seed.vendor_code)
        .bind(DEFAULT_VENDOR_ENDPOINT_CODE)
        .bind(format!("{} Official", seed.supplier_name))
        .bind(seed.base_url)
        .bind(seed.protocol_code)
        .bind(DEFAULT_VENDOR_ACCOUNT_PRIORITY)
        .bind(DEFAULT_VENDOR_ACCOUNT_ROUTING_WEIGHT)
        .execute(&mut **tx)
        .await?;

        let endpoint_id = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT id
            FROM ai_upstream_supplier_endpoint
            WHERE tenant_id = $1 AND organization_id = $2
              AND supplier_id = $3 AND endpoint_code = $4 AND deleted_at IS NULL
            "#,
        )
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(supplier_id)
        .bind(DEFAULT_VENDOR_ENDPOINT_CODE)
        .fetch_one(&mut **tx)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO ai_upstream_supplier_endpoint_health_state (
                id, tenant_id, organization_id, supplier_id, endpoint_id,
                health_status, consecutive_error_count
            ) VALUES ($1, $2, $3, $4, $1, 0, 0)
            ON CONFLICT (tenant_id, organization_id, endpoint_id) DO NOTHING
            "#,
        )
        .bind(endpoint_id)
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(supplier_id)
        .execute(&mut **tx)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO ai_upstream_supplier_auth_method (
                id, uuid, tenant_id, organization_id, data_scope, status, metadata,
                supplier_id, supplier_code, auth_method_code, auth_method_name,
                auth_type, config_schema, runtime_auth_config, priority
            ) VALUES (
                $1, $2, $3, $4, $5, 1, $6::jsonb,
                $7, $8, $9, 'API Key',
                'api_key', '{"type":"object","required":["apiKey"],"properties":{"apiKey":{"type":"string","writeOnly":true}}}'::jsonb,
                '{"credentialTransport":"bearer","defaultHeaders":{}}'::jsonb, $10
            )
            ON CONFLICT (tenant_id, organization_id, supplier_id, auth_method_code) DO UPDATE SET
                auth_method_name = EXCLUDED.auth_method_name,
                auth_type = EXCLUDED.auth_type,
                config_schema = EXCLUDED.config_schema,
                runtime_auth_config = EXCLUDED.runtime_auth_config,
                priority = EXCLUDED.priority,
                status = EXCLUDED.status,
                metadata = EXCLUDED.metadata,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(stable_seed_id(
            "sdk-ai-upstream-supplier-auth-method-id",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                seed.vendor_code,
                DEFAULT_VENDOR_AUTH_METHOD_CODE,
            ],
        ))
        .bind(stable_seed_uuid(
            "sdk-ai-upstream-supplier-auth-method",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                seed.vendor_code,
                DEFAULT_VENDOR_AUTH_METHOD_CODE,
            ],
        ))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(&metadata)
        .bind(supplier_id)
        .bind(seed.vendor_code)
        .bind(DEFAULT_VENDOR_AUTH_METHOD_CODE)
        .bind(DEFAULT_VENDOR_ACCOUNT_PRIORITY)
        .execute(&mut **tx)
        .await?;

        let account_id = stable_seed_id(
            "sdk-ai-upstream-account-id",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                seed.account_code,
            ],
        );
        sqlx::query(
            r#"
            INSERT INTO ai_upstream_account (
                id, uuid, tenant_id, organization_id, data_scope, status, metadata,
                supplier_id, supplier_code, preferred_endpoint_id,
                account_code, account_name, account_type, auth_method_code,
                credential_rotation_strategy, environment,
                billing_mode, contract_cost_multiplier
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7::jsonb,
                $8, $9, $10,
                $11, $12, 'standard', $13,
                'default', 1,
                'prepay', 1.000000000000
            )
            ON CONFLICT (tenant_id, organization_id, account_code) DO UPDATE SET
                -- Preserve an operator-configured account: refresh seed
                -- metadata and revive a soft-deleted row. Rewriting supplier,
                -- endpoint, auth method or status here would clobber admin
                -- configuration and can violate the credential foreign key.
                --
                -- Exception: a row this seed itself created (recognised by the
                -- vendor-account seed marker in its existing `metadata`) only
                -- ever drifted because the install environment changed, so its
                -- status is converged to the environment's intent. Without
                -- this, flipping an install from production to development
                -- left every bundled vendor account disabled forever and
                -- re-seeding could never repair it.
                --
                -- This is safe because the vendor path is now the *only* writer
                -- of these account rows: the legacy admin topology path seeds
                -- none. An operator who edits an account replaces `metadata`,
                -- which drops the marker and preserves their status.
                status = CASE
                    WHEN ai_upstream_account.metadata ->> 'itemType'
                        = 'default_vendor_upstream_account'
                    THEN EXCLUDED.status
                    ELSE ai_upstream_account.status
                END,
                metadata = EXCLUDED.metadata,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(account_id)
        .bind(stable_seed_uuid(
            "sdk-ai-upstream-account",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                seed.account_code,
            ],
        ))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(if enabled {
            ACTIVE_STATUS
        } else {
            DISABLED_STATUS
        })
        .bind(&account_metadata)
        .bind(supplier_id)
        .bind(seed.vendor_code)
        .bind(endpoint_id)
        .bind(seed.account_code)
        .bind(seed.account_name)
        .bind(DEFAULT_VENDOR_AUTH_METHOD_CODE)
        .execute(&mut **tx)
        .await?;

        let account_id = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT id
            FROM ai_upstream_account
            WHERE tenant_id = $1 AND organization_id = $2
              AND account_code = $3 AND deleted_at IS NULL
            "#,
        )
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(seed.account_code)
        .fetch_one(&mut **tx)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO ai_upstream_account_health_state (
                id, tenant_id, organization_id, account_id,
                health_status, consecutive_error_count
            ) VALUES ($1, $2, $3, $1, 0, 0)
            ON CONFLICT (tenant_id, organization_id, account_id) DO NOTHING
            "#,
        )
        .bind(account_id)
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .execute(&mut **tx)
        .await?;

        import_postgres_default_vendor_account_credential(
            tx,
            seed,
            account_id,
            enabled,
            credential_codec,
        )
        .await?;

        sqlx::query(
            r#"
            INSERT INTO ai_resource_binding (
                id, uuid, tenant_id, organization_id, data_scope, status, metadata,
                binding_scope, supplier_id, supplier_code,
                resource_id, resource_code, resource_group_code,
                grant_type, priority
            )
            SELECT
                $1, $2, $3, $4, $5, 1, $6::jsonb,
                'supplier', $7, $8,
                NULL, NULL, $9,
                'allow', $10
            ON CONFLICT (id) DO UPDATE SET
                grant_type = EXCLUDED.grant_type,
                priority = EXCLUDED.priority,
                status = EXCLUDED.status,
                metadata = EXCLUDED.metadata,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(stable_seed_id(
            "sdk-ai-upstream-supplier-resource-id",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                seed.vendor_code,
                resource_group_code,
            ],
        ))
        .bind(stable_seed_uuid(
            "sdk-ai-upstream-supplier-resource",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                seed.vendor_code,
                resource_group_code,
            ],
        ))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(&metadata)
        .bind(supplier_id)
        .bind(seed.vendor_code)
        .bind(resource_group_code)
        .bind(DEFAULT_VENDOR_ACCOUNT_PRIORITY)
        .execute(&mut **tx)
        .await?;

        // Attach the account to every derived account group for this vendor so
        // each group stops being an empty pool. The group's own resource grant
        // already carries the modality scope, and the account deliberately has
        // no account-scope binding, so the snapshot's second UNION branch
        // inherits the group scope instead of intersecting it away.
        for modality in modalities {
            let group_code = format!("{}.{modality}", seed.vendor_code);
            let account_group_id = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT id
                FROM ai_upstream_account_group
                WHERE tenant_id = $1 AND organization_id = $2
                  AND group_code = $3 AND deleted_at IS NULL
                "#,
            )
            .bind(DEFAULT_IAM_TENANT_ID)
            .bind(DEFAULT_IAM_ORGANIZATION_ID)
            .bind(group_code.as_str())
            .fetch_optional(&mut **tx)
            .await?;
            let Some(account_group_id) = account_group_id else {
                // The group derives from the same catalog this function reads,
                // so a miss means the catalog is internally inconsistent.
                return Err(json_decode_error(AiRoutingSeedLoadError::Validation(
                    format!(
                        "default vendor upstream account `{}` targets missing account group `{group_code}`",
                        seed.vendor_code
                    ),
                )));
            };
            let member_metadata = seed_metadata(
                catalog,
                "default_vendor_upstream_account_group_member",
                &group_code,
                serde_json::json!({
                    "groupCode": group_code.as_str(),
                    "accountCode": seed.account_code,
                    "vendorCode": seed.vendor_code,
                    "modality": modality.as_str(),
                }),
            );
            sqlx::query(
                r#"
                INSERT INTO ai_upstream_account_group_member (
                    id, uuid, tenant_id, organization_id, data_scope, status, metadata,
                    account_group_id, account_id, priority, routing_weight, enabled
                ) VALUES (
                    $1, $2, $3, $4, $5, 1, $6::jsonb,
                    $7, $8, $9, $10, TRUE
                )
                ON CONFLICT (tenant_id, organization_id, account_group_id, account_id) DO UPDATE SET
                    priority = EXCLUDED.priority,
                    routing_weight = EXCLUDED.routing_weight,
                    enabled = EXCLUDED.enabled,
                    status = EXCLUDED.status,
                    metadata = EXCLUDED.metadata,
                    deleted_at = NULL,
                    deleted_by = NULL
                "#,
            )
            .bind(stable_seed_id(
                "sdk-ai-upstream-account-group-member-id",
                &[
                    &DEFAULT_IAM_TENANT_ID.to_string(),
                    &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                    group_code.as_str(),
                    seed.account_code,
                ],
            ))
            .bind(stable_seed_uuid(
                "sdk-ai-upstream-account-group-member",
                &[
                    &DEFAULT_IAM_TENANT_ID.to_string(),
                    &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                    group_code.as_str(),
                    seed.account_code,
                ],
            ))
            .bind(DEFAULT_IAM_TENANT_ID)
            .bind(DEFAULT_IAM_ORGANIZATION_ID)
            .bind(DEFAULT_ADMIN_DATA_SCOPE)
            .bind(&member_metadata)
            .bind(account_group_id)
            .bind(account_id)
            .bind(DEFAULT_VENDOR_ACCOUNT_PRIORITY)
            .bind(DEFAULT_VENDOR_ACCOUNT_ROUTING_WEIGHT)
            .execute(&mut **tx)
            .await?;
        }

        // Membership in the derived `{vendor}.{modality}` groups is necessary
        // but not sufficient. Auth-token (app-session) requests never resolve
        // one of those groups: the authenticator pins them to the default
        // *mixed* group, and the selector then requires an exact
        // `binding.account_group_id == group_id` match. A vendor account that
        // is only a member of its own modality groups is therefore invisible to
        // every signed-in end user, and the whole content-generation surface
        // for that vendor fails closed with 50201.
        //
        // Binding the account into the default group as well — mirroring what
        // the admin path does for `openai-default` — is what makes the default
        // group a real mixed pool.
        let default_group_id = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT id
            FROM ai_upstream_account_group
            WHERE tenant_id = $1 AND organization_id = $2
              AND group_code = $3 AND deleted_at IS NULL
            "#,
        )
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_MIXED_ACCOUNT_GROUP_CODE)
        .fetch_optional(&mut **tx)
        .await?
        .ok_or_else(|| {
            json_decode_error(AiRoutingSeedLoadError::Validation(format!(
                "default vendor upstream account `{}` targets missing default mixed account group `{DEFAULT_MIXED_ACCOUNT_GROUP_CODE}`",
                seed.account_code
            )))
        })?;
        let default_group_member_metadata = seed_metadata(
            catalog,
            "default_vendor_upstream_account_group_member",
            DEFAULT_MIXED_ACCOUNT_GROUP_CODE,
            serde_json::json!({
                "groupCode": DEFAULT_MIXED_ACCOUNT_GROUP_CODE,
                "accountCode": seed.account_code,
                "vendorCode": seed.vendor_code,
                "membership": "default-mixed-group",
            }),
        );
        sqlx::query(
            r#"
            INSERT INTO ai_upstream_account_group_member (
                id, uuid, tenant_id, organization_id, data_scope, status, metadata,
                account_group_id, account_id, priority, routing_weight, enabled
            ) VALUES (
                $1, $2, $3, $4, $5, 1, $6::jsonb,
                $7, $8, $9, $10, TRUE
            )
            ON CONFLICT (tenant_id, organization_id, account_group_id, account_id) DO UPDATE SET
                priority = EXCLUDED.priority,
                routing_weight = EXCLUDED.routing_weight,
                enabled = EXCLUDED.enabled,
                status = EXCLUDED.status,
                metadata = EXCLUDED.metadata,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(stable_seed_id(
            "sdk-ai-upstream-account-group-member-id",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                DEFAULT_MIXED_ACCOUNT_GROUP_CODE,
                seed.account_code,
            ],
        ))
        .bind(stable_seed_uuid(
            "sdk-ai-upstream-account-group-member",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                DEFAULT_MIXED_ACCOUNT_GROUP_CODE,
                seed.account_code,
            ],
        ))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(&default_group_member_metadata)
        .bind(default_group_id)
        .bind(account_id)
        .bind(DEFAULT_VENDOR_ACCOUNT_PRIORITY)
        .bind(DEFAULT_VENDOR_ACCOUNT_ROUTING_WEIGHT)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

/// Seeds the bundled relay (中转站) suppliers and their default-group accounts.
///
/// This is a separate entry point from
/// `import_postgres_default_vendor_upstream_accounts` because the two differ in
/// ways that cannot be expressed as a flag on the vendor seed:
///
/// * the supplier row is `supplier_type = 'relay'`, while the vendor path writes
///   the SQL literal `'official'`;
/// * the relay row carries a `protocols` array and a scalar `default_base_url`,
///   neither of which the vendor seed struct has;
/// * a relay account has no `vendor.<code>` resource and so has no derived
///   `{vendor}.{modality}` groups to join — it is bound into the default mixed
///   group and granted the relay resource groups instead.
///
/// Credentials are the placeholder `sk-dev-{supplier_code}-placeholder` value
/// for the same reason the vendor path uses one: the routing snapshot requires
/// an active credential row before an account can route, and the placeholder is
/// deliberately not a usable relay key.
async fn import_postgres_default_relay_upstream_accounts(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    catalog: &AiRoutingSeedCatalog,
    enabled: bool,
    credential_codec: Option<&(dyn UpstreamCredentialSecretCodec + Send + Sync)>,
) -> Result<(), sqlx::Error> {
    let resource_group_codes: BTreeSet<&str> = catalog
        .resource_groups
        .iter()
        .map(|group| group.group_code.as_str())
        .collect();

    for seed in DEFAULT_RELAY_SUPPLIERS.iter() {
        // Fail loudly rather than silently granting nothing: a relay whose
        // granted group the catalog does not declare would seed an account that
        // is visible in the admin surface but unreachable in routing.
        for resource_group_code in seed.resource_group_codes.iter() {
            if !resource_group_codes.contains(resource_group_code) {
                return Err(json_decode_error(AiRoutingSeedLoadError::Validation(
                    format!(
                        "default relay supplier `{}` grants unknown resource group `{resource_group_code}`",
                        seed.supplier_code
                    ),
                )));
            }
        }
        if seed.protocols.is_empty() {
            return Err(json_decode_error(AiRoutingSeedLoadError::Validation(
                format!(
                    "default relay supplier `{}` declares no protocols",
                    seed.supplier_code
                ),
            )));
        }
        // `protocols[0]` is projected onto the scalar compatibility columns, so
        // an empty or duplicate code list would desynchronise the two views of
        // the same supplier.
        let mut seen_protocol_codes = BTreeSet::new();
        for protocol in seed.protocols.iter() {
            if protocol.protocol_code.trim().is_empty() {
                return Err(json_decode_error(AiRoutingSeedLoadError::Validation(
                    format!(
                        "default relay supplier `{}` declares a blank protocol code",
                        seed.supplier_code
                    ),
                )));
            }
            if !seen_protocol_codes.insert(protocol.protocol_code) {
                return Err(json_decode_error(AiRoutingSeedLoadError::Validation(
                    format!(
                        "default relay supplier `{}` declares duplicate protocol code `{}`",
                        seed.supplier_code, protocol.protocol_code
                    ),
                )));
            }
        }

        let primary = &seed.protocols[0];
        let protocols_json = serde_json::Value::Array(
            seed.protocols
                .iter()
                .map(|protocol| {
                    serde_json::json!({
                        "protocolCode": protocol.protocol_code,
                        "baseUrl": protocol.base_url,
                    })
                })
                .collect(),
        );

        let supplier_id = stable_seed_id(
            "sdk-ai-upstream-supplier-id",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                seed.supplier_code,
            ],
        );
        let supplier_metadata = seed_metadata(
            catalog,
            "default_relay_upstream_supplier",
            seed.supplier_code,
            serde_json::json!({
                "supplierCode": seed.supplier_code,
                "supplierType": "relay",
                "accountCode": seed.account_code,
                "initialAccountStatus": if enabled { "enabled" } else { "disabled" },
                "seedPurpose": "relay-default-supplier",
            }),
        );

        // `supplier_type` is bound rather than inlined so the relay value cannot
        // drift back to the vendor path's `'official'` literal, and
        // `default_vendor_code` stays NULL: the CHECK constraint only requires
        // it for `official` suppliers, and a relay has no single vendor.
        sqlx::query(
            r#"
            INSERT INTO ai_upstream_supplier (
                id, uuid, tenant_id, organization_id, data_scope, status, metadata,
                supplier_code, supplier_name, display_name, display_name_i18n, supplier_type,
                adapter_code, protocol_code, protocols, default_base_url,
                environment, sort_order
            ) VALUES (
                $1, $2, $3, $4, $5, 1, $6::jsonb,
                $7, $8, $8, $9::jsonb, $10,
                $11, $12, $13::jsonb, $14,
                1, $15
            )
            ON CONFLICT (tenant_id, organization_id, supplier_code) DO UPDATE SET
                supplier_name = EXCLUDED.supplier_name,
                display_name = EXCLUDED.display_name,
                display_name_i18n = EXCLUDED.display_name_i18n,
                supplier_type = EXCLUDED.supplier_type,
                adapter_code = EXCLUDED.adapter_code,
                protocol_code = EXCLUDED.protocol_code,
                protocols = EXCLUDED.protocols,
                default_base_url = EXCLUDED.default_base_url,
                environment = EXCLUDED.environment,
                sort_order = EXCLUDED.sort_order,
                status = EXCLUDED.status,
                metadata = EXCLUDED.metadata,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(supplier_id)
        .bind(stable_seed_uuid(
            "sdk-ai-upstream-supplier",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                seed.supplier_code,
            ],
        ))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(&supplier_metadata)
        .bind(seed.supplier_code)
        .bind(seed.supplier_name)
        .bind(seed.supplier_display_name_i18n)
        .bind(RELAY_SUPPLIER_TYPE)
        .bind(seed.adapter_code)
        .bind(primary.protocol_code)
        .bind(protocols_json.to_string())
        .bind(primary.base_url)
        .bind(seeded_relay_supplier_sort_order(seed.supplier_code))
        .execute(&mut **tx)
        .await?;

        let supplier_id = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT id
            FROM ai_upstream_supplier
            WHERE tenant_id = $1 AND organization_id = $2
              AND supplier_code = $3 AND deleted_at IS NULL
            "#,
        )
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(seed.supplier_code)
        .fetch_one(&mut **tx)
        .await?;

        // One endpoint per relay supplier. The per-protocol base URLs live in
        // `supplier.protocols`; the endpoint is the account's resolvable
        // `preferred_endpoint_id` and carries the primary protocol's URL.
        let endpoint_id = stable_seed_id(
            "sdk-ai-upstream-supplier-endpoint-id",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                seed.supplier_code,
                seed.endpoint_code,
            ],
        );
        sqlx::query(
            r#"
            INSERT INTO ai_upstream_supplier_endpoint (
                id, uuid, tenant_id, organization_id, data_scope, status, metadata,
                supplier_id, supplier_code, endpoint_code, endpoint_name, base_url,
                protocol_code, environment, priority, routing_weight
            ) VALUES (
                $1, $2, $3, $4, $5, 1, $6::jsonb,
                $7, $8, $9, $10, $11,
                $12, 1, $13, $14
            )
            ON CONFLICT (tenant_id, organization_id, supplier_id, endpoint_code) DO UPDATE SET
                endpoint_name = EXCLUDED.endpoint_name,
                base_url = EXCLUDED.base_url,
                protocol_code = EXCLUDED.protocol_code,
                environment = EXCLUDED.environment,
                priority = EXCLUDED.priority,
                routing_weight = EXCLUDED.routing_weight,
                status = EXCLUDED.status,
                metadata = EXCLUDED.metadata,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(endpoint_id)
        .bind(stable_seed_uuid(
            "sdk-ai-upstream-supplier-endpoint",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                seed.supplier_code,
                seed.endpoint_code,
            ],
        ))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(&supplier_metadata)
        .bind(supplier_id)
        .bind(seed.supplier_code)
        .bind(seed.endpoint_code)
        .bind(seed.endpoint_name)
        .bind(primary.base_url)
        .bind(primary.protocol_code)
        .bind(DEFAULT_VENDOR_ACCOUNT_PRIORITY)
        .bind(DEFAULT_VENDOR_ACCOUNT_ROUTING_WEIGHT)
        .execute(&mut **tx)
        .await?;

        let endpoint_id = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT id
            FROM ai_upstream_supplier_endpoint
            WHERE tenant_id = $1 AND organization_id = $2
              AND supplier_id = $3 AND endpoint_code = $4 AND deleted_at IS NULL
            "#,
        )
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(supplier_id)
        .bind(seed.endpoint_code)
        .fetch_one(&mut **tx)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO ai_upstream_supplier_endpoint_health_state (
                id, tenant_id, organization_id, supplier_id, endpoint_id,
                health_status, consecutive_error_count
            ) VALUES ($1, $2, $3, $4, $1, 0, 0)
            ON CONFLICT (tenant_id, organization_id, endpoint_id) DO NOTHING
            "#,
        )
        .bind(endpoint_id)
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(supplier_id)
        .execute(&mut **tx)
        .await?;

        // Same `api_key` auth method shape the vendor path writes: relays
        // authenticate with a bearer-typed API key.
        sqlx::query(
            r#"
            INSERT INTO ai_upstream_supplier_auth_method (
                id, uuid, tenant_id, organization_id, data_scope, status, metadata,
                supplier_id, supplier_code, auth_method_code, auth_method_name,
                auth_type, config_schema, runtime_auth_config, priority
            ) VALUES (
                $1, $2, $3, $4, $5, 1, $6::jsonb,
                $7, $8, $9, 'API Key',
                'api_key', '{"type":"object","required":["apiKey"],"properties":{"apiKey":{"type":"string","writeOnly":true}}}'::jsonb,
                '{"credentialTransport":"bearer","defaultHeaders":{}}'::jsonb, $10
            )
            ON CONFLICT (tenant_id, organization_id, supplier_id, auth_method_code) DO UPDATE SET
                auth_method_name = EXCLUDED.auth_method_name,
                auth_type = EXCLUDED.auth_type,
                config_schema = EXCLUDED.config_schema,
                runtime_auth_config = EXCLUDED.runtime_auth_config,
                priority = EXCLUDED.priority,
                status = EXCLUDED.status,
                metadata = EXCLUDED.metadata,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(stable_seed_id(
            "sdk-ai-upstream-supplier-auth-method-id",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                seed.supplier_code,
                DEFAULT_VENDOR_AUTH_METHOD_CODE,
            ],
        ))
        .bind(stable_seed_uuid(
            "sdk-ai-upstream-supplier-auth-method",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                seed.supplier_code,
                DEFAULT_VENDOR_AUTH_METHOD_CODE,
            ],
        ))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(&supplier_metadata)
        .bind(supplier_id)
        .bind(seed.supplier_code)
        .bind(DEFAULT_VENDOR_AUTH_METHOD_CODE)
        .bind(DEFAULT_VENDOR_ACCOUNT_PRIORITY)
        .execute(&mut **tx)
        .await?;

        let account_id = stable_seed_id(
            "sdk-ai-upstream-account-id",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                seed.account_code,
            ],
        );
        // The marker vocabulary matches the vendor path so the same
        // environment-convergence rule applies, but the `itemType` differs: an
        // operator who edits a relay account must be distinguishable from one
        // who edits a vendor account.
        let account_metadata = seed_metadata(
            catalog,
            "default_relay_upstream_account",
            seed.account_code,
            serde_json::json!({
                "supplierCode": seed.supplier_code,
                "accountCode": seed.account_code,
                "supplierType": "relay",
                "initialAccountStatus": if enabled { "enabled" } else { "disabled" },
                "seedPurpose": "relay-default-account",
            }),
        );
        sqlx::query(
            r#"
            INSERT INTO ai_upstream_account (
                id, uuid, tenant_id, organization_id, data_scope, status, metadata,
                supplier_id, supplier_code, preferred_endpoint_id,
                account_code, account_name, account_type, auth_method_code,
                credential_rotation_strategy, environment,
                billing_mode, contract_cost_multiplier
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7::jsonb,
                $8, $9, $10,
                $11, $12, 'standard', $13,
                'default', 1,
                'prepay', 1.000000000000
            )
            ON CONFLICT (tenant_id, organization_id, account_code) DO UPDATE SET
                status = CASE
                    WHEN ai_upstream_account.metadata ->> 'itemType'
                        = 'default_relay_upstream_account'
                    THEN EXCLUDED.status
                    ELSE ai_upstream_account.status
                END,
                metadata = EXCLUDED.metadata,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(account_id)
        .bind(stable_seed_uuid(
            "sdk-ai-upstream-account",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                seed.account_code,
            ],
        ))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(if enabled {
            ACTIVE_STATUS
        } else {
            DISABLED_STATUS
        })
        .bind(&account_metadata)
        .bind(supplier_id)
        .bind(seed.supplier_code)
        .bind(endpoint_id)
        .bind(seed.account_code)
        .bind(seed.account_name)
        .bind(DEFAULT_VENDOR_AUTH_METHOD_CODE)
        .execute(&mut **tx)
        .await?;

        let account_id = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT id
            FROM ai_upstream_account
            WHERE tenant_id = $1 AND organization_id = $2
              AND account_code = $3 AND deleted_at IS NULL
            "#,
        )
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(seed.account_code)
        .fetch_one(&mut **tx)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO ai_upstream_account_health_state (
                id, tenant_id, organization_id, account_id,
                health_status, consecutive_error_count
            ) VALUES ($1, $2, $3, $1, 0, 0)
            ON CONFLICT (tenant_id, organization_id, account_id) DO NOTHING
            "#,
        )
        .bind(account_id)
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .execute(&mut **tx)
        .await?;

        import_postgres_default_relay_account_credential(
            tx,
            seed,
            account_id,
            enabled,
            credential_codec,
        )
        .await?;

        // Supplier-scope grants: one `ai_resource_binding` row per relay
        // resource group. The relay account itself carries no account-scope
        // binding, so the routing snapshot's second UNION branch inherits these
        // group scopes instead of intersecting them away.
        for resource_group_code in seed.resource_group_codes.iter() {
            sqlx::query(
                r#"
                INSERT INTO ai_resource_binding (
                    id, uuid, tenant_id, organization_id, data_scope, status, metadata,
                    binding_scope, supplier_id, supplier_code,
                    resource_id, resource_code, resource_group_code,
                    grant_type, priority
                )
                SELECT
                    $1, $2, $3, $4, $5, 1, $6::jsonb,
                    'supplier', $7, $8,
                    NULL, NULL, $9,
                    'allow', $10
                ON CONFLICT (id) DO UPDATE SET
                    grant_type = EXCLUDED.grant_type,
                    priority = EXCLUDED.priority,
                    status = EXCLUDED.status,
                    metadata = EXCLUDED.metadata,
                    deleted_at = NULL,
                    deleted_by = NULL
                "#,
            )
            .bind(stable_seed_id(
                "sdk-ai-upstream-supplier-resource-id",
                &[
                    &DEFAULT_IAM_TENANT_ID.to_string(),
                    &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                    seed.supplier_code,
                    resource_group_code,
                ],
            ))
            .bind(stable_seed_uuid(
                "sdk-ai-upstream-supplier-resource",
                &[
                    &DEFAULT_IAM_TENANT_ID.to_string(),
                    &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                    seed.supplier_code,
                    resource_group_code,
                ],
            ))
            .bind(DEFAULT_IAM_TENANT_ID)
            .bind(DEFAULT_IAM_ORGANIZATION_ID)
            .bind(DEFAULT_ADMIN_DATA_SCOPE)
            .bind(&supplier_metadata)
            .bind(supplier_id)
            .bind(seed.supplier_code)
            .bind(*resource_group_code)
            .bind(DEFAULT_VENDOR_ACCOUNT_PRIORITY)
            .execute(&mut **tx)
            .await?;
        }

        // Membership in the default mixed group is what makes the relay
        // reachable. Auth-token (app-session) requests are pinned to this group
        // by the authenticator and the selector then requires an exact
        // `binding.account_group_id == group_id` match, so a relay account that
        // were only granted at supplier scope would be invisible to every
        // signed-in user.
        let default_group_id = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT id
            FROM ai_upstream_account_group
            WHERE tenant_id = $1 AND organization_id = $2
              AND group_code = $3 AND deleted_at IS NULL
            "#,
        )
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_MIXED_ACCOUNT_GROUP_CODE)
        .fetch_optional(&mut **tx)
        .await?
        .ok_or_else(|| {
            json_decode_error(AiRoutingSeedLoadError::Validation(format!(
                "default relay upstream account `{}` targets missing default mixed account group `{DEFAULT_MIXED_ACCOUNT_GROUP_CODE}`",
                seed.account_code
            )))
        })?;
        let default_group_member_metadata = seed_metadata(
            catalog,
            "default_relay_upstream_account_group_member",
            DEFAULT_MIXED_ACCOUNT_GROUP_CODE,
            serde_json::json!({
                "groupCode": DEFAULT_MIXED_ACCOUNT_GROUP_CODE,
                "accountCode": seed.account_code,
                "supplierCode": seed.supplier_code,
                "supplierType": "relay",
                "membership": "default-mixed-group",
            }),
        );
        sqlx::query(
            r#"
            INSERT INTO ai_upstream_account_group_member (
                id, uuid, tenant_id, organization_id, data_scope, status, metadata,
                account_group_id, account_id, priority, routing_weight, enabled
            ) VALUES (
                $1, $2, $3, $4, $5, 1, $6::jsonb,
                $7, $8, $9, $10, TRUE
            )
            ON CONFLICT (tenant_id, organization_id, account_group_id, account_id) DO UPDATE SET
                priority = EXCLUDED.priority,
                routing_weight = EXCLUDED.routing_weight,
                enabled = EXCLUDED.enabled,
                status = EXCLUDED.status,
                metadata = EXCLUDED.metadata,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(stable_seed_id(
            "sdk-ai-upstream-account-group-member-id",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                DEFAULT_MIXED_ACCOUNT_GROUP_CODE,
                seed.account_code,
            ],
        ))
        .bind(stable_seed_uuid(
            "sdk-ai-upstream-account-group-member",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                DEFAULT_MIXED_ACCOUNT_GROUP_CODE,
                seed.account_code,
            ],
        ))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(&default_group_member_metadata)
        .bind(default_group_id)
        .bind(account_id)
        .bind(DEFAULT_VENDOR_ACCOUNT_PRIORITY)
        .bind(DEFAULT_VENDOR_ACCOUNT_ROUTING_WEIGHT)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

/// Seals and upserts the placeholder credential for one bundled relay account.
///
/// Mirrors `import_postgres_default_vendor_account_credential`; the secret is
/// derived from the *supplier* code rather than a vendor code, because a relay
/// has no vendor.
async fn import_postgres_default_relay_account_credential(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    seed: &DefaultRelaySupplierSeed,
    account_id: i64,
    enabled: bool,
    credential_codec: Option<&(dyn UpstreamCredentialSecretCodec + Send + Sync)>,
) -> Result<(), sqlx::Error> {
    let Some(credential_codec) = credential_codec else {
        return Ok(());
    };
    let credential_id = stable_seed_id(
        "sdk-ai-upstream-account-credential-id",
        &[
            &DEFAULT_IAM_TENANT_ID.to_string(),
            &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
            seed.account_code,
            DEFAULT_VENDOR_AUTH_METHOD_CODE,
        ],
    );
    let secret = default_account_placeholder_secret(seed.supplier_code);
    let encoded = credential_codec
        .encode_secret(
            UpstreamCredentialSecretContext::new(
                DEFAULT_IAM_TENANT_ID,
                DEFAULT_IAM_ORGANIZATION_ID,
                account_id,
                credential_id,
            ),
            &secret,
        )
        .map_err(|error| {
            sqlx::Error::Protocol(format!(
                "failed to seal placeholder credential for relay `{}`: {}",
                seed.supplier_code, error
            ))
        })?;
    let masked_label = format!(
        "{}***{}",
        &secret[..secret.len().min(3)],
        &secret[secret.len().saturating_sub(4)..]
    );
    let credential_metadata = credential_seed_metadata();
    sqlx::query(
        r#"
        INSERT INTO ai_upstream_account_credential (
            id, uuid, tenant_id, organization_id, data_scope, status,
            version, metadata,
            account_id, auth_method_code, credential_name,
            secret_ciphertext, secret_key_id, secret_fingerprint, masked_label,
            credential_version, priority, is_active
        ) VALUES (
            $1, $2, $3, $4, $5, $6,
            0, $15::jsonb,
            $7, $8, $9,
            $10, $11, $12, $13,
            1, $14, TRUE
        )
        ON CONFLICT (tenant_id, organization_id, account_id, credential_version) DO UPDATE SET
            credential_name = EXCLUDED.credential_name,
            secret_ciphertext = EXCLUDED.secret_ciphertext,
            secret_key_id = EXCLUDED.secret_key_id,
            secret_fingerprint = EXCLUDED.secret_fingerprint,
            masked_label = EXCLUDED.masked_label,
            priority = EXCLUDED.priority,
            is_active = EXCLUDED.is_active,
            -- Same environment-convergence rule as the relay account row: an
            -- operator who rotated the credential replaces `metadata`, which
            -- drops the marker, so their status survives a re-seed. The marker
            -- checked here is the vendor path's, because both paths share one
            -- credential seed marker (see `credential_seed_metadata`).
            status = CASE
                WHEN ai_upstream_account_credential.metadata ->> 'itemType'
                    = 'default_vendor_upstream_account_credential'
                THEN EXCLUDED.status
                ELSE ai_upstream_account_credential.status
            END,
            deleted_at = NULL,
            deleted_by = NULL
        "#,
    )
    .bind(credential_id)
    .bind(stable_seed_uuid(
        "sdk-ai-upstream-account-credential",
        &[
            &DEFAULT_IAM_TENANT_ID.to_string(),
            &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
            seed.account_code,
            DEFAULT_VENDOR_AUTH_METHOD_CODE,
        ],
    ))
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .bind(DEFAULT_ADMIN_DATA_SCOPE)
    .bind(if enabled {
        ACTIVE_STATUS
    } else {
        DISABLED_STATUS
    })
    .bind(account_id)
    .bind(DEFAULT_VENDOR_AUTH_METHOD_CODE)
    .bind(format!("{} Default Credential", seed.supplier_name))
    .bind(encoded.ciphertext)
    .bind(encoded.key_id)
    .bind(encoded.fingerprint)
    .bind(masked_label)
    .bind(DEFAULT_VENDOR_ACCOUNT_PRIORITY)
    .bind(&credential_metadata)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

/// Deterministic ordering for seeded relay suppliers, offset past the vendor
/// block so the admin list keeps vendors first and relays grouped after them.
fn seeded_relay_supplier_sort_order(supplier_code: &str) -> i32 {
    DEFAULT_RELAY_SUPPLIERS
        .iter()
        .position(|seed| seed.supplier_code == supplier_code)
        .map(|index| {
            i32::try_from(index)
                .unwrap_or(i32::MAX)
                .saturating_add(RELAY_SUPPLIER_SORT_ORDER_BASE)
        })
        .unwrap_or(i32::MAX)
}

/// Seals and upserts the placeholder credential for one bundled vendor account.
///
/// The routing snapshot joins `ai_upstream_account_credential` on
/// `status = 1 AND is_active`, and the runtime later decodes
/// `secret_ciphertext` with the configured key ring, so the seeded row must
/// carry a genuinely sealed value under the same AAD the codec uses. When no
/// key ring is configured (no `SDKWORK_CLOUDROUTER_UPSTREAM_CREDENTIAL_KEY_RING`)
/// the credential is skipped: a row the runtime cannot decode is worse than a
/// clearly-absent one, and the coverage probe will report the gap.
async fn import_postgres_default_vendor_account_credential(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    seed: &DefaultVendorUpstreamAccountSeed,
    account_id: i64,
    enabled: bool,
    credential_codec: Option<&(dyn UpstreamCredentialSecretCodec + Send + Sync)>,
) -> Result<(), sqlx::Error> {
    let Some(credential_codec) = credential_codec else {
        return Ok(());
    };
    let credential_id = stable_seed_id(
        "sdk-ai-upstream-account-credential-id",
        &[
            &DEFAULT_IAM_TENANT_ID.to_string(),
            &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
            seed.account_code,
            DEFAULT_VENDOR_AUTH_METHOD_CODE,
        ],
    );
    let secret = default_account_placeholder_secret(seed.vendor_code);
    let encoded = credential_codec
        .encode_secret(
            UpstreamCredentialSecretContext::new(
                DEFAULT_IAM_TENANT_ID,
                DEFAULT_IAM_ORGANIZATION_ID,
                account_id,
                credential_id,
            ),
            &secret,
        )
        .map_err(|error| {
            sqlx::Error::Protocol(format!(
                "failed to seal placeholder credential for `{}`: {}",
                seed.vendor_code, error
            ))
        })?;
    let masked_label = format!(
        "{}***{}",
        &secret[..secret.len().min(3)],
        &secret[secret.len().saturating_sub(4)..]
    );
    let credential_metadata = credential_seed_metadata();
    sqlx::query(
        r#"
        INSERT INTO ai_upstream_account_credential (
            id, uuid, tenant_id, organization_id, data_scope, status,
            version, metadata,
            account_id, auth_method_code, credential_name,
            secret_ciphertext, secret_key_id, secret_fingerprint, masked_label,
            credential_version, priority, is_active
        ) VALUES (
            $1, $2, $3, $4, $5, $6,
            0, $15::jsonb,
            $7, $8, $9,
            $10, $11, $12, $13,
            1, $14, TRUE
        )
        ON CONFLICT (tenant_id, organization_id, account_id, credential_version) DO UPDATE SET
            credential_name = EXCLUDED.credential_name,
            secret_ciphertext = EXCLUDED.secret_ciphertext,
            secret_key_id = EXCLUDED.secret_key_id,
            secret_fingerprint = EXCLUDED.secret_fingerprint,
            masked_label = EXCLUDED.masked_label,
            priority = EXCLUDED.priority,
            is_active = EXCLUDED.is_active,
            -- Same environment-convergence rule as the account row: an operator
            -- who rotated the credential replaces `metadata`, which drops the
            -- seed marker, so their status survives a re-seed.
            status = CASE
                WHEN ai_upstream_account_credential.metadata ->> 'itemType'
                    = 'default_vendor_upstream_account_credential'
                THEN EXCLUDED.status
                ELSE ai_upstream_account_credential.status
            END,
            deleted_at = NULL,
            deleted_by = NULL
        "#,
    )
    .bind(credential_id)
    .bind(stable_seed_uuid(
        "sdk-ai-upstream-account-credential",
        &[
            &DEFAULT_IAM_TENANT_ID.to_string(),
            &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
            seed.account_code,
            DEFAULT_VENDOR_AUTH_METHOD_CODE,
        ],
    ))
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .bind(DEFAULT_ADMIN_DATA_SCOPE)
    .bind(if enabled {
        ACTIVE_STATUS
    } else {
        DISABLED_STATUS
    })
    .bind(account_id)
    .bind(DEFAULT_VENDOR_AUTH_METHOD_CODE)
    .bind(format!("{} Default Credential", seed.supplier_name))
    .bind(encoded.ciphertext)
    .bind(encoded.key_id)
    .bind(encoded.fingerprint)
    .bind(masked_label)
    .bind(DEFAULT_VENDOR_ACCOUNT_PRIORITY)
    .bind(&credential_metadata)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

/// Seed marker written to `ai_upstream_account_credential.metadata`.
///
/// The row has no catalog-backed metadata of its own, but the marker is what
/// lets a re-seed tell "this credential is still the bundled placeholder" from
/// "an operator rotated it". `itemType` is the same key `seed_metadata` emits,
/// so the marker is recognisable with the same SQL predicate as every other
/// seeded row.
fn credential_seed_metadata() -> String {
    serde_json::json!({
        "itemType": "default_vendor_upstream_account_credential",
        "source": "bundled",
        "sourceHash": source_hash(),
    })
    .to_string()
}

/// Deterministic ordering for seeded vendor suppliers so the admin list is
/// stable across re-seeds.
fn seeded_supplier_sort_order(vendor_code: &str) -> i32 {
    DEFAULT_VENDOR_UPSTREAM_ACCOUNTS
        .iter()
        .position(|seed| seed.vendor_code == vendor_code)
        .map(|index| i32::try_from(index).unwrap_or(i32::MAX) + 1)
        .unwrap_or(i32::MAX)
}

/// Seeds the default routing strategies that the account-group
/// `routing_strategy_code` references. The price-first strategy is the
/// default so a fresh install routes to the cheapest callable account without
/// any admin configuration. Every strategy in `ai_routing_strategy` is
/// idempotently upserted by `strategy_code`.
async fn import_postgres_default_admin_routing_strategies(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
) -> Result<(), sqlx::Error> {
    let catalog = AiRoutingSeedCatalog::load().map_err(json_decode_error)?;
    for strategy in default_admin_routing_strategies() {
        let strategy_id = default_admin_routing_strategy_id(&strategy.code);
        let strategy_uuid = default_admin_routing_strategy_uuid(&strategy.code);
        let metadata = seed_metadata(
            &catalog,
            "default_admin_routing_strategy",
            &strategy.code,
            Value::Null,
        );
        sqlx::query(
            r#"
            INSERT INTO ai_routing_strategy (
                id, uuid, tenant_id, organization_id, data_scope, status, metadata,
                strategy_code, strategy_name, strategy_name_i18n, description,
                strategy_type, params, priority, enabled, is_default, tags
            ) VALUES (
                $1, $2, $3, $4, $5, 1, $6::jsonb,
                $7, $8, $9::jsonb, $10,
                $11, $12::jsonb, $13, $14, $15, $16::jsonb
            )
            ON CONFLICT (tenant_id, organization_id, strategy_code) DO UPDATE SET
                strategy_name = EXCLUDED.strategy_name,
                strategy_name_i18n = EXCLUDED.strategy_name_i18n,
                description = EXCLUDED.description,
                strategy_type = EXCLUDED.strategy_type,
                params = EXCLUDED.params,
                priority = EXCLUDED.priority,
                enabled = EXCLUDED.enabled,
                is_default = EXCLUDED.is_default,
                tags = EXCLUDED.tags,
                metadata = EXCLUDED.metadata,
                status = EXCLUDED.status,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(strategy_id)
        .bind(strategy_uuid)
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(&metadata)
        .bind(strategy.code)
        .bind(strategy.name)
        .bind(strategy.name_i18n)
        .bind(strategy.description)
        .bind(strategy.strategy_type)
        .bind(strategy.params)
        .bind(strategy.priority)
        .bind(strategy.enabled)
        .bind(strategy.is_default)
        .bind(strategy.tags)
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

/// Built-in default routing strategies (see `route_strategy.rs` for the
/// strategy-pattern implementations these codes reference).
struct DefaultAdminRoutingStrategySeed {
    code: &'static str,
    name: &'static str,
    name_i18n: &'static str,
    description: &'static str,
    strategy_type: &'static str,
    params: &'static str,
    priority: i32,
    enabled: bool,
    is_default: bool,
    tags: &'static str,
}

fn default_admin_routing_strategies() -> Vec<DefaultAdminRoutingStrategySeed> {
    vec![DefaultAdminRoutingStrategySeed {
        code: "price_first",
        name: "Price First",
        name_i18n: r#"{"en-US":"Price First","zh-CN":"价格优先"}"#,
        description: "Prefer the cheapest callable upstream account for the request.",
        strategy_type: "price_first",
        params: r#"{}"#,
        priority: 100,
        enabled: true,
        is_default: true,
        tags: r#"["system"]"#,
    }]
}

fn default_admin_routing_strategy_id(code: &str) -> i64 {
    stable_seed_id(
        "sdk-ai-routing-strategy-id",
        &[
            &DEFAULT_IAM_TENANT_ID.to_string(),
            &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
            code,
        ],
    )
}

fn default_admin_routing_strategy_uuid(code: &str) -> String {
    stable_seed_uuid(
        "sdk-ai-routing-strategy",
        &[
            &DEFAULT_IAM_TENANT_ID.to_string(),
            &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
            code,
        ],
    )
}

fn default_admin_upstream_supplier_id(account: &DefaultAdminUpstreamAccountSeed) -> i64 {
    stable_seed_id(
        "sdk-ai-upstream-supplier-id",
        &[
            &DEFAULT_IAM_TENANT_ID.to_string(),
            &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
            account.supplier_code,
        ],
    )
}

fn default_admin_upstream_supplier_endpoint_id(account: &DefaultAdminUpstreamAccountSeed) -> i64 {
    stable_seed_id(
        "sdk-ai-upstream-supplier-endpoint-id",
        &[
            &DEFAULT_IAM_TENANT_ID.to_string(),
            &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
            account.supplier_code,
            account.endpoint_code,
        ],
    )
}

fn default_admin_upstream_supplier_auth_method_id(
    account: &DefaultAdminUpstreamAccountSeed,
) -> i64 {
    stable_seed_id(
        "sdk-ai-upstream-supplier-auth-method-id",
        &[
            &DEFAULT_IAM_TENANT_ID.to_string(),
            &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
            account.supplier_code,
            account.auth_method_code,
        ],
    )
}

fn default_admin_upstream_account_id(account: &DefaultAdminUpstreamAccountSeed) -> i64 {
    stable_seed_id(
        "sdk-ai-upstream-account-id",
        &[
            &DEFAULT_IAM_TENANT_ID.to_string(),
            &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
            account.account_code,
        ],
    )
}

fn default_admin_upstream_account_group_id(group: &DefaultAdminUpstreamAccountGroupSeed) -> i64 {
    stable_seed_id(
        "sdk-ai-upstream-account-group-id",
        &[
            &DEFAULT_IAM_TENANT_ID.to_string(),
            &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
            group.group_code.as_str(),
        ],
    )
}

fn resource_bundles() -> Result<Vec<ResourceBundle>, AiRoutingSeedLoadError> {
    [
        CORE_RESOURCES_JSON,
        OPENAI_RESOURCES_JSON,
        VENDOR_NATIVE_RESOURCES_JSON,
    ]
    .into_iter()
    .map(|payload| {
        let bundle = serde_json::from_str::<ResourceBundle>(payload)?;
        validate_bundle_kind(&bundle.kind, "ai-routing.resources")?;
        Ok(bundle)
    })
    .collect()
}

fn resource_group_bundles() -> Result<Vec<ResourceGroupBundle>, AiRoutingSeedLoadError> {
    [
        ADMIN_API_GROUPS_JSON,
        OFFICIAL_PROVIDER_GROUPS_JSON,
        RELAY_PROVIDER_GROUPS_JSON,
    ]
    .into_iter()
    .map(|payload| {
        let bundle = serde_json::from_str::<ResourceGroupBundle>(payload)?;
        validate_bundle_kind(&bundle.kind, "ai-routing.resource-groups")?;
        Ok(bundle)
    })
    .collect()
}

fn validate_catalog(catalog: &AiRoutingSeedCatalog) -> Result<(), AiRoutingSeedLoadError> {
    if catalog.manifest.catalog_code != "sdkwork-ai-routing"
        || catalog.manifest.schema_version != "ai-routing-seed.v1"
        || catalog.manifest.source != "bundled"
    {
        return Err(AiRoutingSeedLoadError::Validation(
            "invalid AI routing seed manifest identity".to_owned(),
        ));
    }
    validate_manifest_files(catalog)?;
    let resource_codes = validate_unique(
        catalog
            .resources
            .iter()
            .map(|item| item.resource_code.as_str()),
        "AI routing resource code",
    )?;
    let group_codes = validate_unique(
        catalog
            .resource_groups
            .iter()
            .map(|item| item.group_code.as_str()),
        "AI routing resource group code",
    )?;
    for resource in &catalog.resources {
        if resource.resource_code.trim().is_empty()
            || resource.resource_type.trim().is_empty()
            || resource.display_name.trim().is_empty()
            || resource.capability.trim().is_empty()
            || resource.capabilities.is_empty()
        {
            return Err(AiRoutingSeedLoadError::Validation(format!(
                "invalid AI routing resource `{}`",
                resource.resource_code
            )));
        }
        if resource.resource_type == "api_endpoint" {
            let api_code = resource.api_code.as_deref().unwrap_or_default();
            if api_code.trim().is_empty() {
                return Err(AiRoutingSeedLoadError::Validation(format!(
                    "AI routing API endpoint resource `{}` must define apiCode",
                    resource.resource_code
                )));
            }
            let path_template = resource.path_template.as_deref().unwrap_or_default();
            if !path_template.starts_with('/') {
                return Err(AiRoutingSeedLoadError::Validation(format!(
                    "AI routing API endpoint resource `{}` must define an explicit pathTemplate starting with `/`",
                    resource.resource_code
                )));
            }
            let method = resource.method.as_deref().unwrap_or_default();
            if !matches!(method, "GET" | "POST" | "PUT" | "PATCH" | "DELETE") {
                return Err(AiRoutingSeedLoadError::Validation(format!(
                    "AI routing API endpoint resource `{}` must define an explicit method in GET, POST, PUT, PATCH, DELETE",
                    resource.resource_code
                )));
            }
        }
    }
    for group in &catalog.resource_groups {
        if group.items.is_empty()
            && group.group_code != "api.all"
            && group.selection_mode != "dynamic_all_api"
        {
            return Err(AiRoutingSeedLoadError::Validation(format!(
                "AI routing resource group `{}` must not be empty",
                group.group_code
            )));
        }
        for item in &group.items {
            match item.item_type.as_str() {
                "resource" => {
                    let code = item.resource_code.as_deref().unwrap_or_default();
                    if !resource_codes.contains(code) {
                        return Err(AiRoutingSeedLoadError::Validation(format!(
                            "AI routing resource group `{}` references unknown resource `{code}`",
                            group.group_code
                        )));
                    }
                }
                "group" => {
                    let code = item.group_code.as_deref().unwrap_or_default();
                    if !group_codes.contains(code) {
                        return Err(AiRoutingSeedLoadError::Validation(format!(
                            "AI routing resource group `{}` references unknown group `{code}`",
                            group.group_code
                        )));
                    }
                }
                _ => {
                    return Err(AiRoutingSeedLoadError::Validation(format!(
                        "AI routing resource group `{}` contains unsupported item type `{}`",
                        group.group_code, item.item_type
                    )));
                }
            }
        }
    }
    Ok(())
}

fn validate_manifest_files(catalog: &AiRoutingSeedCatalog) -> Result<(), AiRoutingSeedLoadError> {
    if catalog.manifest.sections.resources
        != [
            "core-resources.json",
            "openai-resources.json",
            "vendor-native-resources.json",
        ]
    {
        return Err(AiRoutingSeedLoadError::Validation(
            "AI routing resources manifest section is out of sync".to_owned(),
        ));
    }
    if catalog.manifest.sections.resource_groups
        != [
            "admin-api-groups.json",
            "official-provider-groups.json",
            "relay-provider-groups.json",
        ]
    {
        return Err(AiRoutingSeedLoadError::Validation(
            "AI routing resource groups manifest section is out of sync".to_owned(),
        ));
    }
    Ok(())
}

fn validate_unique<'a, I>(
    values: I,
    label: &str,
) -> Result<BTreeSet<&'a str>, AiRoutingSeedLoadError>
where
    I: IntoIterator<Item = &'a str>,
{
    let mut set = BTreeSet::new();
    for value in values {
        if value.trim().is_empty() || !set.insert(value) {
            return Err(AiRoutingSeedLoadError::Validation(format!(
                "{label} must be unique and non-empty"
            )));
        }
    }
    Ok(set)
}

fn validate_bundle_kind(kind: &str, expected: &str) -> Result<(), AiRoutingSeedLoadError> {
    if kind == expected {
        return Ok(());
    }
    Err(AiRoutingSeedLoadError::Validation(format!(
        "AI routing seed bundle kind `{kind}` must be `{expected}`"
    )))
}

fn api_endpoint_resources(catalog: &AiRoutingSeedCatalog) -> Vec<&ResourceSeed> {
    catalog
        .resources
        .iter()
        .filter(|resource| resource.resource_type == "api_endpoint")
        .collect()
}

fn default_admin_upstream_accounts() -> &'static [DefaultAdminUpstreamAccountSeed] {
    &DEFAULT_ADMIN_UPSTREAM_ACCOUNTS
}

fn default_admin_upstream_account_groups(
    catalog: &AiRoutingSeedCatalog,
) -> Result<Vec<DefaultAdminUpstreamAccountGroupSeed>, AiRoutingSeedLoadError> {
    let mut groups = Vec::new();
    groups.push(default_admin_upstream_account_group());
    groups.extend(derive_vendor_account_group_seeds(catalog)?);
    Ok(groups)
}

/// Derives one default account group per vendor-modality pair from the bundled
/// resource catalog. Each group binds the vendor's curated resource group,
/// keeps the default 1x cost/sale multipliers, and is seeded as an empty pool
/// (no account member) for admins to attach accounts later.
fn derive_vendor_account_group_seeds(
    catalog: &AiRoutingSeedCatalog,
) -> Result<Vec<DefaultAdminUpstreamAccountGroupSeed>, AiRoutingSeedLoadError> {
    let vendor_modalities = vendor_account_group_modalities(catalog)?;
    let resource_group_codes: BTreeSet<&str> = catalog
        .resource_groups
        .iter()
        .map(|group| group.group_code.as_str())
        .collect();
    let mut seeds = Vec::new();
    for (vendor_code, modalities) in vendor_modalities {
        let resource_group_code = VENDOR_RESOURCE_GROUP_BINDINGS
            .iter()
            .find(|(code, _)| *code == vendor_code.as_str())
            .map(|(_, group_code)| *group_code)
            .ok_or_else(|| {
                AiRoutingSeedLoadError::Validation(format!(
                    "AI routing vendor `{vendor_code}` has no default account group resource group binding"
                ))
            })?;
        if !resource_group_codes.contains(resource_group_code) {
            return Err(AiRoutingSeedLoadError::Validation(format!(
                "AI routing vendor `{vendor_code}` binds unknown resource group `{resource_group_code}`"
            )));
        }
        for modality in modalities {
            let (vendor_en, vendor_zh) = localized_names(&VENDOR_LOCALIZED_NAMES, &vendor_code);
            let (modality_en, modality_zh) = localized_names(&MODALITY_LOCALIZED_NAMES, &modality);
            seeds.push(DefaultAdminUpstreamAccountGroupSeed {
                group_code: format!("{vendor_code}.{modality}"),
                // The single-language column carries the zh-CN name because the
                // default deployment is China mainland; the i18n map keeps the
                // bilingual names for locale-aware surfaces.
                group_name: format!("{vendor_zh} {modality_zh}分组"),
                group_name_i18n: localized_name_json(
                    &format!("{vendor_en} {modality_en} Group"),
                    &format!("{vendor_zh} {modality_zh}分组"),
                ),
                group_type: modality_group_type(&modality),
                account_code: None,
                resource_group_code: resource_group_code.to_owned(),
                vendor_code: Some(vendor_code.clone()),
                modalities: vec![modality],
                tags: Vec::new(),
                priority: 100,
                routing_weight: 100,
                is_default: false,
            });
        }
    }
    Ok(seeds)
}

/// Aggregates the account group modalities supported by each vendor declared in
/// the bundled resources: vendor resources carry capabilities, api_endpoint
/// resources carry a modality code. Codes outside the account group modality
/// whitelist are ignored.
fn vendor_account_group_modalities(
    catalog: &AiRoutingSeedCatalog,
) -> Result<BTreeMap<String, Vec<String>>, AiRoutingSeedLoadError> {
    let mut vendor_modalities: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    for resource in &catalog.resources {
        let Some(vendor_code) = resource.vendor_code.as_deref() else {
            continue;
        };
        let candidates: Vec<&str> = if resource.resource_type == "vendor" {
            resource.capabilities.iter().map(String::as_str).collect()
        } else {
            resource.modality_code.iter().map(String::as_str).collect()
        };
        for candidate in candidates {
            if let Some(modality) = account_group_modality_code(candidate) {
                vendor_modalities
                    .entry(vendor_code.to_owned())
                    .or_default()
                    .insert(modality.to_owned());
            }
        }
    }
    if vendor_modalities.is_empty() {
        return Err(AiRoutingSeedLoadError::Validation(
            "AI routing resource data declares no vendor account group modalities".to_owned(),
        ));
    }
    Ok(vendor_modalities
        .into_iter()
        .map(|(vendor_code, modalities)| (vendor_code, modalities.into_iter().collect()))
        .collect())
}

fn account_group_modality_code(candidate: &str) -> Option<&'static str> {
    let modality = VENDOR_MODALITY_MAPPING
        .iter()
        .find(|(source, _)| *source == candidate)
        .map(|(_, modality)| *modality)?;
    if ACCOUNT_GROUP_SUPPORTED_MODALITIES.contains(&modality) {
        Some(modality)
    } else {
        None
    }
}

/// Resolves the localized (en-US, zh-CN) names for a code, falling back to the
/// code itself when no entry exists.
fn localized_names<'a>(
    entries: &[(&'static str, &'static str, &'static str)],
    code: &'a str,
) -> (&'a str, &'a str) {
    entries
        .iter()
        .find(|(candidate, _, _)| *candidate == code)
        .map(|(_, en, zh)| (*en, *zh))
        .unwrap_or((code, code))
}

fn localized_name_json(en: &str, zh: &str) -> String {
    serde_json::json!({
        "en-US": en,
        "zh-CN": zh,
    })
    .to_string()
}

fn resource_upsert_postgres() -> &'static str {
    r#"
    INSERT INTO ai_resource
        (uuid, tenant_id, organization_id, data_scope, status, metadata, resource_code, resource_type, display_name, display_name_i18n, vendor_code, modality_code, api_code, catalog_key, model, provider_native_model, resource_schema, metadata_schema, description, sort_order, id)
    VALUES
        ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15, $16, $17::jsonb, $18::jsonb, $19, $20, $21)
    ON CONFLICT(tenant_id, organization_id, resource_code) DO UPDATE SET
        resource_type = excluded.resource_type,
        display_name = excluded.display_name,
        display_name_i18n = excluded.display_name_i18n,
        vendor_code = excluded.vendor_code,
        modality_code = excluded.modality_code,
        api_code = excluded.api_code,
        catalog_key = excluded.catalog_key,
        model = excluded.model,
        provider_native_model = excluded.provider_native_model,
        resource_schema = excluded.resource_schema,
        metadata_schema = excluded.metadata_schema,
        description = excluded.description,
        sort_order = excluded.sort_order,
        metadata = excluded.metadata,
        deleted_at = NULL,
        deleted_by = NULL,
        status = excluded.status
    "#
}

/// Localized display name for bundled vendor resources; every other resource
/// type keeps an empty i18n map and falls back to the single-language column.
fn resource_display_name_i18n(item: &ResourceSeed) -> String {
    if item.resource_type != "vendor" {
        return "{}".to_owned();
    }
    let Some(vendor_code) = item.vendor_code.as_deref() else {
        return "{}".to_owned();
    };
    let (vendor_en, vendor_zh) = localized_names(&VENDOR_LOCALIZED_NAMES, vendor_code);
    if vendor_en == vendor_code && vendor_zh == vendor_code {
        return "{}".to_owned();
    }
    localized_name_json(vendor_en, vendor_zh)
}

fn group_item_upsert_postgres() -> &'static str {
    r#"
    INSERT INTO ai_resource_group_item
        (uuid, tenant_id, organization_id, data_scope, status, metadata, resource_group_id, resource_group_code, item_type, resource_code, child_resource_group_code, item_role, sort_order, id)
    VALUES
        ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14)
    ON CONFLICT(tenant_id, organization_id, resource_group_id, item_type, resource_code, child_resource_group_code) DO UPDATE SET
        resource_group_code = excluded.resource_group_code,
        item_role = excluded.item_role,
        sort_order = excluded.sort_order,
        metadata = excluded.metadata,
        deleted_at = NULL,
        deleted_by = NULL,
        status = excluded.status
    "#
}

async fn postgres_group_ids(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
) -> Result<BTreeMap<String, i64>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT id, group_code FROM ai_resource_group WHERE tenant_id = 0 AND organization_id = 0",
    )
    .fetch_all(&mut **tx)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| (row.get::<String, _>("group_code"), row.get::<i64, _>("id")))
        .collect())
}

fn expected_resource_codes(catalog: &AiRoutingSeedCatalog) -> BTreeSet<String> {
    catalog
        .resources
        .iter()
        .map(|item| item.resource_code.clone())
        .collect()
}

fn expected_group_codes(catalog: &AiRoutingSeedCatalog) -> BTreeSet<String> {
    catalog
        .resource_groups
        .iter()
        .map(|item| item.group_code.clone())
        .collect()
}

fn expected_endpoint_codes(catalog: &AiRoutingSeedCatalog) -> BTreeSet<String> {
    api_endpoint_resources(catalog)
        .into_iter()
        .filter_map(|item| item.api_code.clone())
        .collect()
}

fn expected_resource_group_item_count(catalog: &AiRoutingSeedCatalog) -> i64 {
    catalog
        .resource_groups
        .iter()
        .map(|group| group.items.len() as i64)
        .sum()
}

async fn postgres_resource_group_item_count(
    pool: &PgPool,
    catalog: &AiRoutingSeedCatalog,
) -> Result<i64, sqlx::Error> {
    let row = sqlx::query(
        r#"
        SELECT (COUNT(1))::bigint AS count
        FROM ai_resource_group_item
        WHERE tenant_id = 0
          AND organization_id = 0
          AND status = 1
          AND deleted_at IS NULL
          AND metadata ->> 'catalogCode' = $1
        "#,
    )
    .bind(&catalog.manifest.catalog_code)
    .fetch_one(pool)
    .await?;
    Ok(row.get::<i64, _>("count"))
}

async fn postgres_string_set(
    pool: &PgPool,
    query: &'static str,
) -> Result<BTreeSet<String>, sqlx::Error> {
    let rows = sqlx::query(query).fetch_all(pool).await?;
    Ok(rows
        .into_iter()
        .filter_map(|row| row.try_get::<String, _>(0).ok())
        .collect())
}

fn resource_item_code(item: &ResourceGroupItemSeed) -> &str {
    if item.item_type == "resource" {
        item.resource_code.as_deref().unwrap_or("")
    } else {
        ""
    }
}

fn child_group_item_code(item: &ResourceGroupItemSeed) -> &str {
    if item.item_type == "group" {
        item.group_code.as_deref().unwrap_or("")
    } else {
        ""
    }
}

fn resource_metadata(item: &ResourceSeed) -> Value {
    serde_json::json!({
        "capability": item.capability,
        "capabilities": item.capabilities,
        "resourceBillingCategory": resource_billing_category(item),
        "defaultBillingMeter": default_billing_meter_code(item),
    })
}

fn resource_schema(item: &ResourceSeed) -> String {
    serde_json::json!({
        "compositionMode": match item.resource_type.as_str() {
            "bundle" => "all",
            _ => "single",
        },
        "capabilities": item.capabilities,
        "resourceBillingCategory": resource_billing_category(item),
        "defaultBillingMeter": default_billing_meter_code(item),
    })
    .to_string()
}

fn metadata_schema(item: &ResourceSeed) -> String {
    serde_json::json!({
        "capability": item.capability,
        "capabilities": item.capabilities,
    })
    .to_string()
}

fn resource_description(item: &ResourceSeed) -> String {
    format!("Bundled AI routing {} resource", item.display_name)
}

fn resource_billing_category(item: &ResourceSeed) -> &'static str {
    match item.modality_code.as_deref().unwrap_or_default() {
        "image" => "image",
        "video" => "video",
        "audio" => "audio",
        "music" => "music",
        "sfx" => "sfx",
        "network" => "api_resource",
        _ => "model",
    }
}

fn default_billing_meter_code(item: &ResourceSeed) -> &'static str {
    match item.modality_code.as_deref().unwrap_or_default() {
        "image" => "image_result",
        "video" => "video_result",
        "audio" => "audio_input_second",
        "music" => "music_output_second",
        "sfx" => "sfx_result",
        "network" => "api_request",
        "embedding" => "embedding_input_token",
        _ => "llm_input_token",
    }
}

fn endpoint_metadata(catalog: &AiRoutingSeedCatalog, item: &EndpointSeedDefinition<'_>) -> String {
    seed_metadata(
        catalog,
        "api_endpoint",
        item.api_code(),
        serde_json::json!({
            "resourceCode": &item.resource.resource_code,
            "vendorCode": &item.resource.vendor_code,
            "modalityCode": &item.resource.modality_code,
            "capability": &item.resource.capability,
            "capabilities": &item.resource.capabilities,
        }),
    )
}

fn default_protocol_code(item: &ResourceSeed) -> &'static str {
    match item.vendor_code.as_deref().unwrap_or_default() {
        "openai" | "openai_compatible" => "openai_compatible",
        _ => "vendor_native",
    }
}

fn default_path_template(api_code: &str) -> String {
    format!("/v1/{}", api_code.trim().replace('.', "/"))
}

fn default_endpoint_method(api_code: &str) -> &'static str {
    match api_code {
        "openai.models"
        | "openai.containers.files.retrieve"
        | "openai.containers.files.content"
        | "kling.task_query"
        | "jimeng.task_query"
        | "volcengine.task_query"
        | "vidu.task_query" => "GET",
        "openai.containers.delete" | "openai.containers.files.delete" => "DELETE",
        _ => "POST",
    }
}

fn seed_metadata(
    catalog: &AiRoutingSeedCatalog,
    item_type: &str,
    item_code: &str,
    extra: Value,
) -> String {
    serde_json::json!({
        "catalogCode": catalog.manifest.catalog_code,
        "schemaVersion": catalog.manifest.schema_version,
        "source": catalog.manifest.source,
        "itemType": item_type,
        "itemCode": item_code,
        "sourceHash": source_hash(),
        "extra": extra,
    })
    .to_string()
}

fn stable_group_item_uuid(group: &ResourceGroupSeed, item: &ResourceGroupItemSeed) -> String {
    stable_seed_uuid(
        "sdk-ai-resource-group-item",
        &[
            &group.group_code,
            &item.item_type,
            item.resource_code.as_deref().unwrap_or_default(),
            item.group_code.as_deref().unwrap_or_default(),
        ],
    )
}

fn stable_group_item_id(group: &ResourceGroupSeed, item: &ResourceGroupItemSeed) -> i64 {
    stable_seed_id(
        "sdk-ai-resource-group-item-id",
        &[
            &group.group_code,
            &item.item_type,
            item.resource_code.as_deref().unwrap_or_default(),
            item.group_code.as_deref().unwrap_or_default(),
        ],
    )
}

fn stable_seed_uuid(prefix: &str, parts: &[&str]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(prefix.as_bytes());
    for part in parts {
        hasher.update([0]);
        hasher.update(part.as_bytes());
    }
    let digest = hasher.finalize();
    let digest_hex = hex::encode(digest);
    let digest_chars = MAX_SEED_UUID_LENGTH - prefix.len() - 1;
    format!("{prefix}-{}", &digest_hex[..digest_chars])
}

fn stable_seed_id(prefix: &str, parts: &[&str]) -> i64 {
    let mut hasher = Sha256::new();
    hasher.update(prefix.as_bytes());
    for part in parts {
        hasher.update([0]);
        hasher.update(part.as_bytes());
    }
    let digest = hasher.finalize();
    let mut bytes = [0_u8; 8];
    bytes.copy_from_slice(&digest[..8]);
    let value = u64::from_be_bytes(bytes) & 0x3fff_ffff_ffff_ffff;
    (value as i64) + 1
}

fn source_hash() -> String {
    let mut hasher = Sha256::new();
    for payload in [
        MANIFEST_JSON,
        CORE_RESOURCES_JSON,
        OPENAI_RESOURCES_JSON,
        VENDOR_NATIVE_RESOURCES_JSON,
        ADMIN_API_GROUPS_JSON,
        OFFICIAL_PROVIDER_GROUPS_JSON,
        RELAY_PROVIDER_GROUPS_JSON,
        DEFAULT_ADMIN_ROUTING_TOPOLOGY_SEED_SOURCE,
    ] {
        hasher.update(payload.as_bytes());
        hasher.update([0]);
    }
    hex::encode(hasher.finalize())
}

fn json_decode_error(error: AiRoutingSeedLoadError) -> sqlx::Error {
    sqlx::Error::Protocol(format!("invalid bundled AI routing seed data: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_catalog() -> AiRoutingSeedCatalog {
        AiRoutingSeedCatalog::load().expect("bundled AI routing seed catalog must load")
    }

    fn test_groups() -> Vec<DefaultAdminUpstreamAccountGroupSeed> {
        default_admin_upstream_account_groups(&test_catalog())
            .expect("default account groups must derive")
    }

    #[test]
    fn standard_group_is_preserved() {
        let groups = test_groups();
        let standard = groups
            .iter()
            .find(|group| group.group_code == "default-group")
            .expect("default-group must be seeded");
        assert_eq!(standard.group_type, "mixed");
        assert_eq!(standard.account_code.as_deref(), Some("openai-default"));
        assert_eq!(standard.resource_group_code, "official.openai.full");
        assert!(standard.vendor_code.is_none());
        assert!(standard.modalities.is_empty());
        assert_eq!(
            standard.tags,
            vec!["stable".to_owned(), "recommended".to_owned()]
        );
        assert!(standard.is_default);
    }

    #[test]
    fn standard_group_names_are_default_account_group() {
        let groups = test_groups();
        let standard = groups
            .iter()
            .find(|group| group.group_code == "default-group")
            .expect("default-group must be seeded");
        assert_eq!(standard.group_name, "账号默认分组");
        let i18n: serde_json::Value = serde_json::from_str(&standard.group_name_i18n)
            .expect("default-group i18n must be valid JSON");
        assert_eq!(
            i18n.get("en-US").and_then(serde_json::Value::as_str),
            Some("账号默认分组"),
            "default-group en-US name must match the default account group"
        );
        assert_eq!(
            i18n.get("zh-CN").and_then(serde_json::Value::as_str),
            Some("账号默认分组"),
            "default-group zh-CN name must match the default account group"
        );
    }

    #[test]
    fn exactly_one_seed_group_is_default() {
        let groups = test_groups();
        let default_count = groups.iter().filter(|group| group.is_default).count();
        assert_eq!(
            default_count, 1,
            "exactly one seed account group must be the default"
        );
        assert!(
            groups
                .iter()
                .any(|group| group.is_default && group.group_code == "default-group"),
            "the default seed group must be default-group"
        );
    }

    /// The derived `<vendor>.<modality>` group set is a pure function of the
    /// bundled resource catalog: `vendor_account_group_modalities` walks every
    /// resource that declares a `vendorCode` and maps its capabilities (for
    /// `resource_type == "vendor"`) or its `modalityCode` (for every other
    /// resource, i.e. the bundled `api_endpoint` rows) through
    /// `VENDOR_MODALITY_MAPPING`, then keeps only the modalities in
    /// `ACCOUNT_GROUP_SUPPORTED_MODALITIES`.
    ///
    /// Asserting the *whole* set is what makes a silently dropped vendor
    /// visible: a new `vendor.*` resource that forgets a capability, or a
    /// `VENDOR_RESOURCE_GROUP_BINDINGS` entry pointing at a group nothing
    /// derives, both shrink this set. It is also what caught the sixteen
    /// vendors added for data-layer coverage — they each contribute their
    /// catalog-derived modalities and nothing else.
    #[test]
    fn vendor_group_codes_match_expected_catalog() {
        let groups = test_groups();
        let codes: BTreeSet<&str> = groups
            .iter()
            .map(|group| group.group_code.as_str())
            .collect();
        let expected = [
            "default-group",
            // Bundled vendor-native / OpenAI-compatible supplier families.
            "openai.text",
            "openai.image",
            "openai.audio",
            "openai.video",
            "openai_compatible.text",
            "openai_compatible.image",
            "openai_compatible.audio",
            "anthropic.text",
            "gemini.text",
            "gemini.image",
            "gemini.video",
            "gemini.audio",
            "kling.image",
            "kling.video",
            "jimeng.image",
            "jimeng.video",
            "bytedance.image",
            "bytedance.video",
            "vidu.image",
            "vidu.video",
            "volcengine.image",
            "volcengine.video",
            "volcengine.audio",
            "minimax.music",
            "minimax.audio",
            "suno.music",
            "suno.audio",
            "elevenlabs.audio",
            // The remaining catalog vendors, reached through the generic
            // OpenAI-compatible surface: every one of their models declares
            // `apiFormat: "openai_compatible"`, so they own no vendor-native
            // api_endpoint and must not be given a classifier arm.
            "xai.text",
            "xai.image",
            "xai.video",
            "alibaba.text",
            "alibaba.image",
            "alibaba.video",
            "deepseek.text",
            "moonshot.text",
            "zhipu.text",
            "zhipu.image",
            "zhipu.video",
            "runway.image",
            "runway.video",
            "baidu.text",
            "luma_ai.video",
            "pixverse.video",
            "tencent.text",
            "stepfun.text",
            "meituan.text",
            "stability_ai.image",
            "stability_ai.audio",
            "stability_ai.music",
            "black_forest_labs.image",
            "black_forest_labs.audio",
            "black_forest_labs.video",
            "mureka.music",
            "xiaomi.text",
            "xiaomi.image",
            "xiaomi.audio",
            "xiaomi.video",
        ];
        assert_eq!(
            codes.len(),
            expected.len(),
            "unexpected group code set: {codes:?}"
        );
        for code in expected {
            assert!(codes.contains(code), "missing group code {code}");
        }
    }

    #[test]
    fn vendor_groups_are_memberless_with_single_modality() {
        for group in test_groups() {
            if group.group_code == "default-group" {
                continue;
            }
            assert!(
                group.account_code.is_none(),
                "{} must be memberless",
                group.group_code
            );
            assert!(
                group.vendor_code.is_some(),
                "{} must be vendor-bound",
                group.group_code
            );
            assert_eq!(
                group.modalities.len(),
                1,
                "{} must carry exactly one modality",
                group.group_code
            );
        }
    }

    #[test]
    fn vendor_group_modalities_are_supported() {
        for group in test_groups() {
            for modality in &group.modalities {
                assert!(
                    ACCOUNT_GROUP_SUPPORTED_MODALITIES.contains(&modality.as_str()),
                    "{} uses unsupported modality {modality}",
                    group.group_code
                );
            }
        }
    }

    #[test]
    fn vendor_group_codes_are_unique() {
        let mut seen = BTreeSet::new();
        for group in test_groups() {
            assert!(
                seen.insert(group.group_code.clone()),
                "duplicate group code {}",
                group.group_code
            );
        }
    }

    #[test]
    fn vendor_group_localized_names_are_bilingual() {
        for group in test_groups() {
            let i18n: serde_json::Value = serde_json::from_str(&group.group_name_i18n)
                .unwrap_or_else(|_| {
                    panic!("{} group_name_i18n is not valid JSON", group.group_code)
                });
            for locale in ["en-US", "zh-CN"] {
                let name = i18n
                    .get(locale)
                    .and_then(serde_json::Value::as_str)
                    .unwrap_or_else(|| {
                        panic!("{} missing {locale} name in {}", group.group_code, i18n)
                    });
                assert!(
                    !name.trim().is_empty(),
                    "{} has empty {locale} name",
                    group.group_code
                );
            }
        }
    }

    #[test]
    fn vendor_group_chinese_names_follow_convention() {
        let groups = test_groups();
        let by_code: BTreeMap<&str, &DefaultAdminUpstreamAccountGroupSeed> = groups
            .iter()
            .map(|group| (group.group_code.as_str(), group))
            .collect();
        let expectations: [(&str, &str); 4] = [
            ("kling.video", "可灵 视频分组"),
            ("gemini.image", "谷歌 Gemini 图片分组"),
            ("minimax.music", "MiniMax 音乐分组"),
            ("volcengine.image", "火山引擎 图片分组"),
        ];
        for (code, expected_zh) in expectations {
            let group = by_code
                .get(code)
                .unwrap_or_else(|| panic!("missing group {code}"));
            let i18n: serde_json::Value =
                serde_json::from_str(&group.group_name_i18n).expect("valid i18n JSON");
            assert_eq!(
                i18n.get("zh-CN").and_then(serde_json::Value::as_str),
                Some(expected_zh),
                "{code} zh-CN name"
            );
            assert!(
                i18n.get("en-US")
                    .and_then(serde_json::Value::as_str)
                    .is_some_and(|name| !name.trim().is_empty()),
                "{code} en-US name"
            );
        }
    }

    #[test]
    fn every_api_endpoint_resource_declares_explicit_path_and_method() {
        let catalog = test_catalog();
        for resource in api_endpoint_resources(&catalog) {
            let item = EndpointSeedDefinition { resource };
            let path_template = item.path_template();
            assert!(
                path_template.starts_with('/'),
                "{} endpoint path must start with `/`, got {path_template}",
                resource.resource_code
            );
            let method = item.method();
            assert!(
                matches!(method.as_str(), "GET" | "POST" | "PUT" | "PATCH" | "DELETE"),
                "{} endpoint method must be explicit, got {method}",
                resource.resource_code
            );
            assert!(
                resource.path_template.is_some() && resource.method.is_some(),
                "{} must carry explicit pathTemplate and method",
                resource.resource_code
            );
        }
    }

    #[test]
    fn endpoint_paths_reflect_explicit_seed_values() {
        let catalog = test_catalog();
        let by_code: BTreeMap<&str, &ResourceSeed> = catalog
            .resources
            .iter()
            .filter(|resource| resource.resource_type == "api_endpoint")
            .map(|resource| (resource.api_code.as_deref().unwrap_or_default(), resource))
            .collect();
        let expectations: [(&str, &str, &str); 3] = [
            ("openai.chat_completions", "POST", "/v1/chat/completions"),
            ("openai.models", "GET", "/v1/models"),
            (
                "gemini.generate_content",
                "POST",
                "/v1beta/models/{model}:generateContent",
            ),
        ];
        for (api_code, method, path_template) in expectations {
            let resource = by_code
                .get(api_code)
                .unwrap_or_else(|| panic!("missing api endpoint {api_code}"));
            let item = EndpointSeedDefinition { resource };
            assert_eq!(item.method(), method, "{api_code} method");
            assert_eq!(item.path_template(), path_template, "{api_code} path");
        }
    }

    #[test]
    fn every_bundled_vendor_resource_has_derived_groups() {
        let catalog = test_catalog();
        let groups = default_admin_upstream_account_groups(&catalog)
            .expect("every vendor must derive groups");
        let bound: BTreeSet<&str> = groups
            .iter()
            .filter_map(|group| group.vendor_code.as_deref())
            .collect();
        for resource in &catalog.resources {
            if resource.resource_type != "vendor" {
                continue;
            }
            let vendor = resource
                .vendor_code
                .as_deref()
                .expect("vendor resource must declare vendorCode");
            assert!(
                bound.contains(vendor),
                "vendor {vendor} has no derived account groups"
            );
        }
    }

    #[test]
    fn vendor_resource_group_bindings_exist_in_catalog() {
        let catalog = test_catalog();
        let group_codes: BTreeSet<&str> = catalog
            .resource_groups
            .iter()
            .map(|group| group.group_code.as_str())
            .collect();
        for (vendor, group_code) in VENDOR_RESOURCE_GROUP_BINDINGS {
            assert!(
                group_codes.contains(group_code),
                "vendor {vendor} binds unknown resource group {group_code}"
            );
        }
    }

    #[test]
    fn every_derived_group_binds_an_existing_resource_group() {
        let catalog = test_catalog();
        let group_codes: BTreeSet<&str> = catalog
            .resource_groups
            .iter()
            .map(|group| group.group_code.as_str())
            .collect();
        for group in default_admin_upstream_account_groups(&catalog)
            .expect("default account groups must derive")
        {
            assert!(
                group_codes.contains(group.resource_group_code.as_str()),
                "{} binds unknown resource group {}",
                group.group_code,
                group.resource_group_code
            );
        }
    }

    #[test]
    fn default_routing_strategies_seed_a_single_price_first_default() {
        let strategies = default_admin_routing_strategies();
        assert_eq!(1, strategies.len());
        let price_first = &strategies[0];
        assert_eq!("price_first", price_first.code);
        assert_eq!("price_first", price_first.strategy_type);
        assert!(price_first.is_default);
        assert!(price_first.enabled);
        assert_eq!(100, price_first.priority);
        assert_eq!(r#"{}"#, price_first.params);
    }

    #[test]
    fn default_routing_strategy_ids_are_stable_and_unique() {
        let strategies = default_admin_routing_strategies();
        let ids: BTreeSet<i64> = strategies
            .iter()
            .map(|strategy| default_admin_routing_strategy_id(strategy.code))
            .collect();
        let uuids: BTreeSet<String> = strategies
            .iter()
            .map(|strategy| default_admin_routing_strategy_uuid(strategy.code))
            .collect();
        assert_eq!(strategies.len(), ids.len());
        assert_eq!(strategies.len(), uuids.len());
        // Deterministic ids never change across runs.
        assert_eq!(
            default_admin_routing_strategy_id("price_first"),
            default_admin_routing_strategy_id("price_first")
        );
    }

    #[test]
    fn default_account_group_routes_price_first_by_default() {
        // The seeded default group must carry the strategy code that resolves
        // to the seeded price_first strategy, keeping install-time routing
        // behavior aligned with the strategy registry default.
        let strategy_codes: BTreeSet<&str> = default_admin_routing_strategies()
            .iter()
            .map(|strategy| strategy.code)
            .collect();
        assert!(strategy_codes.contains("price_first"));
    }

    #[test]
    fn every_derived_vendor_group_has_a_default_account() {
        // The regression this guards: every vendor-modality group derived from
        // the catalog must have a bundled default account, otherwise the group
        // is an empty pool and every request routed to it fails closed with
        // "no upstream account routes are configured".
        let catalog = test_catalog();
        let vendor_accounts: BTreeSet<&str> = DEFAULT_VENDOR_UPSTREAM_ACCOUNTS
            .iter()
            .map(|seed| seed.vendor_code)
            .collect();
        let groups = default_admin_upstream_account_groups(&catalog)
            .expect("default account groups must derive");
        let mut missing = Vec::new();
        for group in &groups {
            let Some(vendor_code) = group.vendor_code.as_deref() else {
                continue;
            };
            if !vendor_accounts.contains(vendor_code) {
                missing.push(group.group_code.clone());
            }
        }
        assert!(
            missing.is_empty(),
            "derived account groups without a bundled default account: {missing:?}"
        );
    }

    #[test]
    fn default_vendor_accounts_are_unique_and_bound_to_known_vendors() {
        let catalog = test_catalog();
        let catalog_vendors: BTreeSet<&str> = catalog
            .resources
            .iter()
            .filter(|resource| resource.resource_type == "vendor")
            .filter_map(|resource| resource.vendor_code.as_deref())
            .collect();
        let mut account_codes = BTreeSet::new();
        let mut vendor_codes = BTreeSet::new();
        for seed in DEFAULT_VENDOR_UPSTREAM_ACCOUNTS.iter() {
            assert!(
                account_codes.insert(seed.account_code),
                "duplicate default vendor account code {}",
                seed.account_code
            );
            assert!(
                vendor_codes.insert(seed.vendor_code),
                "duplicate default vendor account for {}",
                seed.vendor_code
            );
            assert!(
                catalog_vendors.contains(seed.vendor_code),
                "default vendor account {} is not declared by the bundled catalog",
                seed.vendor_code
            );
            assert!(
                seed.base_url.starts_with("https://"),
                "default vendor account {} must use an https base URL",
                seed.vendor_code
            );
        }
    }

    #[test]
    fn default_vendor_account_passwords_are_placeholders() {
        // A placeholder must never be mistakable for a real vendor key, and it
        // must be non-empty so the credential row is well-formed.
        for seed in DEFAULT_VENDOR_UPSTREAM_ACCOUNTS.iter() {
            let secret = default_account_placeholder_secret(seed.vendor_code);
            assert!(
                secret.contains("placeholder"),
                "{} placeholder secret must be self-describing",
                seed.vendor_code
            );
            assert!(
                secret.starts_with("sk-dev-"),
                "{} placeholder secret must carry the dev marker",
                seed.vendor_code
            );
        }
    }

    #[test]
    fn vendor_accounts_seed_enabled_only_in_dev_like_environments() {
        for environment in ["development", "test", "staging", "DEVELOPMENT", " Test "] {
            assert!(
                seed_environment_enables_vendor_accounts(Some(environment)),
                "{environment} must seed enabled vendor accounts"
            );
        }
        for environment in ["production", "Production", "provider", ""] {
            assert!(
                !seed_environment_enables_vendor_accounts(Some(environment)),
                "{environment} must NOT seed enabled vendor accounts"
            );
        }
        assert!(
            !seed_environment_enables_vendor_accounts(None),
            "an unresolved environment must default to disabled"
        );
    }

    /// The install lifecycle is read through `ENV_INSTALL_ENVIRONMENT`, whose
    /// literal is not the name the dev scripts used to export. Pinning it here
    /// makes a rename on either side fail loudly rather than silently seeding
    /// every bundled vendor account disabled.
    #[test]
    fn install_environment_variable_name_is_the_one_the_dev_scripts_export() {
        use crate::infrastructure::sql::installer::ENV_INSTALL_ENVIRONMENT;
        assert_eq!(
            ENV_INSTALL_ENVIRONMENT, "SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT",
            "the dev scripts (start-workspace.mjs, manage-cloud-router-database.mjs) and \
             .env.postgres must export this exact name, otherwise the installer falls back to \
             `DEFAULT_INSTALL_ENVIRONMENT` (production) and seeds every vendor \
             default account disabled"
        );
    }

    /// Every vendor default account the *completeness* predicate inspects must
    /// be one this seed actually writes, and vice versa.
    ///
    /// `postgres_default_vendor_upstream_accounts_complete` is what forces a
    /// mis-seeded database back to `UpgradeRequired` so `ensure` can repair it.
    /// If it iterated a different set than the importer, it would either miss
    /// the account that stayed disabled (the original defect: a database with
    /// all seeded accounts disabled still reported `Installed`) or demand an
    /// account nobody writes and re-seed on every single run.
    #[test]
    fn vendor_account_completeness_covers_exactly_the_seeded_accounts() {
        let account_codes: Vec<&str> = DEFAULT_VENDOR_UPSTREAM_ACCOUNTS
            .iter()
            .map(|seed| seed.account_code)
            .collect();
        assert_eq!(
            account_codes.len(),
            DEFAULT_VENDOR_UPSTREAM_ACCOUNTS.len(),
            "the completeness predicate must cover exactly the seeded account set"
        );
        assert_eq!(
            account_codes.len(),
            28,
            "the bundled vendor default account set must cover every catalog vendor \
             (26 catalog vendors + the `gemini`/`kling` account-side aliases of \
             `google`/`kuaishou` — see VENDOR_CODE_ALIASES). `bytedance` used to be \
             an alias of `jimeng` and shared its account; they are separate vendors \
             now, each with its own host, so each carries its own account."
        );
        assert!(
            account_codes.contains(&"openai-default")
                && account_codes.contains(&"kling-default")
                && account_codes.contains(&"elevenlabs-default"),
            "spot-check the ends of the set: {account_codes:?}"
        );
        assert!(
            account_codes.contains(&"xai-default")
                && account_codes.contains(&"black-forest-labs-default")
                && account_codes.contains(&"mureka-default"),
            "spot-check the newly added tail of the set: {account_codes:?}"
        );
        let unique: BTreeSet<&str> = account_codes.iter().copied().collect();
        assert_eq!(
            unique.len(),
            account_codes.len(),
            "a duplicated account code would make the completeness predicate \
             silently skip one vendor"
        );
    }

    /// A seed run without a credential codec writes every vendor account but
    /// **no** credential, and the completeness predicate then requires one.
    ///
    /// The two halves are individually correct and jointly a trap: the accounts
    /// land, the predicate stays `UpgradeRequired`, and `ensure` fails with
    /// `catalog/seed bootstrap did not reach installed state: UpgradeRequired`
    /// — which reads like a seeding bug, not like "the key ring was not
    /// configured". The real cause was only visible in the database (27
    /// accounts, 11 credentials) after twenty minutes of bisecting a seed that
    /// was in fact correct.
    ///
    /// This test pins the coupling so the skip can never become silent: the
    /// credential writer must consult the codec, and the predicate must be the
    /// thing that notices.
    #[test]
    fn credential_writer_is_skipped_without_a_codec_and_the_predicate_notices() {
        let seed = DEFAULT_VENDOR_UPSTREAM_ACCOUNTS
            .iter()
            .find(|seed| seed.vendor_code == "xai")
            .expect("xai is part of the bundled vendor set");

        // The writer is a no-op without a codec …
        let source = include_str!("ai_routing_seed.rs");
        let writer = source
            .split("async fn import_postgres_default_vendor_account_credential")
            .nth(1)
            .expect("the credential writer must still exist");
        assert!(
            writer.contains("let Some(credential_codec) = credential_codec else"),
            "the credential writer must bail out when no codec is configured; \
             if this early-return is removed the seed will start writing \
             credentials it cannot seal"
        );

        // … and the completeness predicate is what surfaces the gap. It talks
        // to the database, so its *shape* is asserted here and its behaviour is
        // covered by the real-DB e2e
        // (`bundled_placeholder_credentials_decode_with_the_dev_key_ring`).
        assert_eq!(
            seed.account_code, "xai-default",
            "the credential writer keys the placeholder secret off \
             `seed.vendor_code`; renaming either side silently desynchronises \
             the sealed value from the account it belongs to"
        );
        assert_eq!(
            default_account_placeholder_secret(seed.vendor_code),
            "sk-dev-xai-placeholder",
            "the placeholder secret must stay self-describing and carry the dev marker"
        );
    }

    #[test]
    fn vendor_account_marker_is_distinct_from_the_admin_path_marker() {
        // Regression: openai is seeded by both the admin topology path and the
        // vendor default-account path, and the admin path runs first. The
        // vendor account upsert converges `status` only when the row still
        // carries the *vendor* marker, so if the two paths shared a marker the
        // pre-update metadata would match and the openai account would silently
        // keep whatever status the admin path wrote (disabled).
        let catalog = test_catalog();
        let admin_marker = seed_metadata(
            &catalog,
            "default_admin_upstream_supplier",
            "openai",
            serde_json::json!({}),
        );
        let vendor_supplier_marker = seed_metadata(
            &catalog,
            "default_vendor_upstream_supplier",
            "openai",
            serde_json::json!({}),
        );
        let vendor_account_marker = seed_metadata(
            &catalog,
            "default_vendor_upstream_account",
            "openai-default",
            serde_json::json!({}),
        );
        let item_type = |raw: &str| {
            serde_json::from_str::<Value>(raw)
                .expect("seed metadata must be valid JSON")
                .get("itemType")
                .and_then(Value::as_str)
                .expect("seed metadata must carry itemType")
                .to_owned()
        };
        assert_ne!(
            item_type(&vendor_account_marker),
            item_type(&admin_marker),
            "the vendor account marker must not collide with the admin path marker"
        );
        assert_ne!(
            item_type(&vendor_account_marker),
            item_type(&vendor_supplier_marker),
            "the account marker must be distinguishable from the supplier marker"
        );
        assert_eq!(
            item_type(&vendor_account_marker),
            "default_vendor_upstream_account"
        );
    }

    /// Every generic api_endpoint the model-catalog import can bind a model to
    /// must be granted to the default account group.
    ///
    /// Why this guard exists (2026-09-18): `model_catalog_import::
    /// model_endpoint_descriptor` binds EVERY model to a *vendor-agnostic*
    /// endpoint chosen purely from the model's `primaryCapability` — not to its
    /// own vendor's native endpoint. Verified on the live dev DB:
    ///
    ///   xai/grok-4.5        -> openai.chat_completions (api.openai.chat_completions)
    ///   minimax/hailuo-2.3  -> openai.video            (api.openai.video)
    ///   elevenlabs/music_v2 -> suno.music              (api.suno.music)
    ///
    /// Per-model reachability is therefore gated by whether the default group
    /// holds the *generic* endpoint resource. `api.openai.video` and
    /// `api.suno.music` were created only by the import path and referenced by
    /// no resource group, so all 77 video/music-primary models (62 + 15) could
    /// never reach any account route and failed closed with 50201 — while
    /// chat / image / audio / embedding (210 models) worked because
    /// `api.openai_compatible.all`, which the default group already holds,
    /// carries their generic endpoints.
    ///
    /// The seed catalog's own `validate_catalog` rejects a group item whose
    /// `resourceCode` is undeclared, so the resource has to be declared and
    /// granted in that order; this test pins the end state.
    #[test]
    fn default_group_grants_every_generic_endpoint_the_catalog_import_binds() {
        let catalog = test_catalog();

        // (primaryCapability -> endpoint_code -> resource_code), mirroring
        // `model_catalog_import::model_endpoint_descriptor`, which maps
        // endpoint_code to a resource by `endpoint_code == resource.api_code`.
        let generic_endpoints: [(&str, &str, &str); 7] = [
            ("chat", "openai.chat_completions", "api.openai.chat_completions"),
            ("embedding", "openai.embeddings", "api.openai.embeddings"),
            ("image", "openai.images", "api.openai.images"),
            ("audio", "openai.audio", "api.openai.audio"),
            ("video", "openai.video", "api.openai.video"),
            ("music", "suno.music", "api.suno.music"),
            ("rerank", "rerank", "api.rerank"),
        ];

        // 1. Every resource must be declared in the bundled catalog, otherwise
        //    `validate_catalog` forbids any group from referencing it.
        let declared: BTreeSet<&str> = catalog
            .resources
            .iter()
            .map(|resource| resource.resource_code.as_str())
            .collect();

        // 2. Expand the default group's grants
        //    (`DefaultAdminUpstreamAccountGroupSeed::resource_group_codes`)
        //    into the concrete resource codes they cover.
        let default_group = default_admin_upstream_account_groups(&catalog)
            .expect("default account groups must derive")
            .into_iter()
            .find(|group| group.is_default)
            .expect("the default account group must exist");
        let grant_codes = default_group.resource_group_codes();
        let mut granted_resources: BTreeSet<&str> = BTreeSet::new();
        for group_code in &grant_codes {
            let group = catalog
                .resource_groups
                .iter()
                .find(|group| group.group_code == *group_code)
                .unwrap_or_else(|| panic!("default group grants unknown group {group_code}"));
            for item in &group.items {
                if item.item_type == "resource" {
                    if let Some(code) = item.resource_code.as_deref() {
                        granted_resources.insert(code);
                    }
                }
            }
        }

        for (capability, endpoint_code, resource_code) in generic_endpoints {
            // `rerank` has no declared resource yet; it is only reachable once
            // the catalog declares it. Assert the pair is consistent when the
            // resource exists, so adding the declaration is what flips this on.
            if !declared.contains(resource_code) {
                assert_eq!(
                    capability, "rerank",
                    "generic api_endpoint for primaryCapability `{capability}` \
                     (endpoint_code `{endpoint_code}`) must have a declared resource \
                     `{resource_code}` in the bundled AI routing resource catalog, \
                     otherwise no resource group can reference it and every \
                     {capability}-primary model fails closed with 50201"
                );
                continue;
            }
            assert!(
                granted_resources.contains(resource_code),
                "the default account group must be granted `{resource_code}` \
                 (generic api_endpoint `{endpoint_code}` for primaryCapability \
                 `{capability}`); without it every {capability}-primary model in \
                 the catalog cannot reach any account route"
            );
        }
    }

    /// The bundled relay (中转站) suppliers must be expressible by the schema
    /// the seed writes into.
    ///
    /// `ck_ai_upstream_supplier_type` is a closed set, so a typo in
    /// `supplier_type` is a runtime seed failure rather than a bad-looking row.
    /// The relay path deliberately does *not* set `default_vendor_code`, and the
    /// corresponding CHECK only requires it for `official` suppliers, so the
    /// pair `(relay, no vendor)` is the shape that has to hold.
    #[test]
    fn relay_suppliers_declare_the_schema_permitted_supplier_type() {
        assert_eq!(
            RELAY_SUPPLIER_TYPE, "relay",
            "`ck_ai_upstream_supplier_type` admits only 'official' and 'relay'"
        );
        assert_eq!(
            DEFAULT_RELAY_SUPPLIERS.len(),
            4,
            "the bundled relay set is the four host/brand combinations"
        );
        let codes: BTreeSet<&str> = DEFAULT_RELAY_SUPPLIERS
            .iter()
            .map(|seed| seed.supplier_code)
            .collect();
        assert_eq!(
            codes,
            BTreeSet::from([
                "sdkwork-global",
                "sdkwork-cn",
                "birdcoder-global",
                "birdcoder-cn",
            ]),
            "the relay supplier codes are the public identity of each relay edge"
        );
    }

    /// A relay must expose all three bundled LLM protocol surfaces, and the
    /// OpenAI-shaped two must share a base URL while Anthropic has its own.
    ///
    /// This is the shape that makes the relay reachable from both the OpenAI
    /// and Anthropic client SDKs. Getting it wrong is silent: a relay that
    /// declares `anthropic_messages` with a `/v1` base URL would have the
    /// Anthropic SDK dial `/v1/v1/messages` (the SDK appends the version
    /// segment itself), and the failure would surface as a 404 from the relay
    /// rather than as a seed error.
    #[test]
    fn relay_protocols_cover_all_llm_surfaces_with_per_surface_base_urls() {
        for seed in DEFAULT_RELAY_SUPPLIERS.iter() {
            let codes: Vec<&str> = seed
                .protocols
                .iter()
                .map(|protocol| protocol.protocol_code)
                .collect();
            assert_eq!(
                codes,
                vec![
                    "openai_chat_completions",
                    "openai_responses",
                    "anthropic_messages"
                ],
                "relay `{}` must expose the full LLM surface set so both the \
                 OpenAI and Anthropic client SDKs can route through it",
                seed.supplier_code
            );

            let openai_base = seed
                .protocols
                .iter()
                .find(|protocol| protocol.protocol_code == "openai_chat_completions")
                .map(|protocol| protocol.base_url)
                .expect("openai_chat_completions must be present");
            let responses_base = seed
                .protocols
                .iter()
                .find(|protocol| protocol.protocol_code == "openai_responses")
                .map(|protocol| protocol.base_url)
                .expect("openai_responses must be present");
            assert_eq!(
                openai_base, responses_base,
                "relay `{}` serves both OpenAI-shaped surfaces from one prefix",
                seed.supplier_code
            );

            let anthropic_base = seed
                .protocols
                .iter()
                .find(|protocol| protocol.protocol_code == "anthropic_messages")
                .map(|protocol| protocol.base_url)
                .expect("anthropic_messages must be present");
            assert_ne!(
                openai_base, anthropic_base,
                "relay `{}` must give the Anthropic surface its own prefix; \
                 sharing the OpenAI `/v1` prefix makes the Anthropic SDK dial \
                 `/v1/v1/messages`",
                seed.supplier_code
            );
            assert!(
                anthropic_base.ends_with("/anthropic"),
                "relay `{}` anthropic base `{anthropic_base}` must end at the \
                 `/anthropic` surface so the SDK-supplied `/v1/messages` \
                 completes it to `/anthropic/v1/messages`",
                seed.supplier_code
            );
            assert!(
                openai_base.ends_with("/v1"),
                "relay `{}` openai base `{openai_base}` must end at `/v1` so the \
                 client-appended `/chat/completions` completes the documented \
                 path",
                seed.supplier_code
            );

            // Every base URL is written straight into `ai_upstream_supplier_
            // protocols` and dialled by the runtime, so it has to satisfy the
            // same absolute-HTTPS rule the admin API enforces.
            for protocol in seed.protocols.iter() {
                assert!(
                    protocol.base_url.starts_with("https://"),
                    "relay `{}` protocol `{}` base URL `{}` must be absolute \
                     HTTPS; the admin API rejects anything else and the runtime \
                     would emit it verbatim into the upstream request",
                    seed.supplier_code,
                    protocol.protocol_code,
                    protocol.base_url
                );
                assert!(
                    !protocol.base_url.contains('?')
                        && !protocol.base_url.contains('#')
                        && !protocol.base_url.contains('@'),
                    "relay `{}` protocol `{}` base URL `{}` must not carry a \
                     query string, fragment or embedded credentials",
                    seed.supplier_code,
                    protocol.protocol_code,
                    protocol.base_url
                );
            }
        }
    }

    /// Each relay supplier must have a distinct host, and the two brands must
    /// not accidentally share one.
    ///
    /// The four relays exist precisely because the hosts differ; a copy-paste
    /// slip that gives `sdkwork-cn` the `api.sdkwork.com` host would produce a
    /// supplier labelled "China" that dials the international edge, and nothing
    /// else in the seed would notice.
    #[test]
    fn relay_suppliers_dial_four_distinct_hosts() {
        let hosts: BTreeSet<&str> = DEFAULT_RELAY_SUPPLIERS
            .iter()
            .map(|seed| {
                seed.protocols[0]
                    .base_url
                    .strip_prefix("https://")
                    .and_then(|rest| rest.split('/').next())
                    .expect("relay base URLs are absolute HTTPS with a host")
            })
            .collect();
        assert_eq!(
            hosts,
            BTreeSet::from([
                "api.sdkwork.com",
                "api.sdkwork.cn",
                "api.birdcoder.com",
                "api.birdcoder.cn",
            ]),
            "each relay supplier must dial its own host"
        );
        assert_eq!(
            hosts.len(),
            DEFAULT_RELAY_SUPPLIERS.len(),
            "two relay suppliers sharing a host would make one of them \
             redundant and one region's traffic miss its intended edge"
        );
    }

    /// The accounts the relay path writes must not collide with the vendor
    /// path's account codes.
    ///
    /// `ai_upstream_account` is unique on `(tenant_id, organization_id,
    /// account_code)` and both paths upsert with `ON CONFLICT` on that key. A
    /// collision would make the second writer silently take over the first
    /// writer's row — including its supplier, when the two suppliers differ.
    #[test]
    fn relay_account_codes_do_not_collide_with_vendor_account_codes() {
        let vendor_codes: BTreeSet<&str> = DEFAULT_VENDOR_UPSTREAM_ACCOUNTS
            .iter()
            .map(|seed| seed.account_code)
            .collect();
        let relay_codes: Vec<&str> = DEFAULT_RELAY_SUPPLIERS
            .iter()
            .map(|seed| seed.account_code)
            .collect();
        let unique_relay: BTreeSet<&str> = relay_codes.iter().copied().collect();
        assert_eq!(
            unique_relay.len(),
            relay_codes.len(),
            "relay account codes must be unique: {relay_codes:?}"
        );
        for code in relay_codes {
            assert!(
                !vendor_codes.contains(code),
                "relay account code `{code}` collides with a vendor account; \
                 the two seed paths upsert on the same unique key and the \
                 second one would overwrite the first"
            );
        }
    }

    /// The relay supplier codes must not collide with the vendor suppliers'.
    ///
    /// Same reasoning as the account codes, one table up: a relay named after a
    /// vendor would take over that vendor's supplier row.
    #[test]
    fn relay_supplier_codes_do_not_collide_with_vendor_supplier_codes() {
        let vendor_codes: BTreeSet<&str> = DEFAULT_VENDOR_UPSTREAM_ACCOUNTS
            .iter()
            .map(|seed| seed.vendor_code)
            .collect();
        for seed in DEFAULT_RELAY_SUPPLIERS.iter() {
            assert!(
                !vendor_codes.contains(seed.supplier_code),
                "relay supplier code `{}` collides with a vendor supplier code",
                seed.supplier_code
            );
        }
    }

    /// The relay resource groups a relay account is granted must exist in the
    /// bundled catalog, and the default group must grant them.
    ///
    /// Without the default-group grant the relay account is a member of a group
    /// whose granted scope the loader never surfaces for auth-token traffic, so
    /// the relay is invisible to signed-in users — the same failure mode as an
    /// empty pool, and one that no static check on the supplier row can see.
    #[test]
    fn relay_resource_groups_exist_and_are_granted_to_the_default_group() {
        let catalog = test_catalog();
        let declared: BTreeSet<&str> = catalog
            .resource_groups
            .iter()
            .map(|group| group.group_code.as_str())
            .collect();

        for group_code in RELAY_ACCOUNT_RESOURCE_GROUP_CODES.iter() {
            assert!(
                declared.contains(group_code),
                "relay account group `{group_code}` must exist in the bundled \
                 resource-group catalog"
            );
        }

        let default_group = default_admin_upstream_account_groups(&catalog)
            .expect("default account groups must derive")
            .into_iter()
            .find(|group| group.is_default)
            .expect("the default account group must exist");
        let grants = default_group.resource_group_codes();
        for group_code in RELAY_ACCOUNT_RESOURCE_GROUP_CODES.iter() {
            assert!(
                grants.contains(group_code),
                "the default account group must grant relay group \
                 `{group_code}`; a relay account is bound into the default group \
                 and is otherwise unreachable from every auth-token session"
            );
        }
    }

    /// Every relay must be granted the same relay groups.
    ///
    /// The relay path reads the groups from the seed entry, so a divergence
    /// would give one brand a narrower surface than the other with no other
    /// signal. The media groups are what carry image and video, so a relay that
    /// lost one would silently stop supporting the capabilities its brand is
    /// required to provide. The LLM/coding surface is *not* in this list on
    /// purpose: it reuses the protocol-surface groups, which are granted from
    /// the protocols the relay declares (see `llmProtocols.ts`).
    #[test]
    fn every_relay_supplier_is_granted_the_media_groups() {
        for seed in DEFAULT_RELAY_SUPPLIERS.iter() {
            for group_code in [
                "relay.bytedance.media",
                "relay.cn.visual_generation",
                "relay.global.visual_generation",
            ] {
                assert!(
                    seed.resource_group_codes.contains(&group_code),
                    "relay `{}` must be granted `{group_code}`; the relay \
                     product requirement covers image and video generation, and \
                     a missing grant fails that capability closed with 50201 \
                     without any seed error",
                    seed.supplier_code
                );
            }
        }
    }

    /// The media relay groups must cover the vendor-native image/video surfaces
    /// the relay product requirement names.
    ///
    /// Why this guard exists (2026-09-20): the first relay cut pointed the
    /// media grant at `relay.openai_compatible.media`, which covers only the
    /// *OpenAI-shaped* media endpoints. Seedance, Seedream, Kling, Jimeng,
    /// Volcengine, Vidu, FLUX, Runway, Luma, PixVerse, Stability and Gemini all
    /// publish vendor-native paths that share no common protocol, so none of
    /// them was reachable through a relay — every such request failed closed
    /// with 50201 while the OpenAI-shaped media calls worked, a partial-surface
    /// failure that looks like a vendor problem rather than a missing grant.
    #[test]
    fn relay_media_groups_cover_the_vendor_native_visual_surfaces() {
        let catalog = test_catalog();
        let granted_by_group = |group_code: &str| -> BTreeSet<&str> {
            catalog
                .resource_groups
                .iter()
                .find(|group| group.group_code == group_code)
                .unwrap_or_else(|| panic!("resource group `{group_code}` must exist"))
                .items
                .iter()
                .filter(|item| item.item_type == "resource")
                .filter_map(|item| item.resource_code.as_deref())
                .collect()
        };

        // ByteDance's Ark media surface — the reason this split exists. A
        // `doubao-seedance-*` request binds `api.bytedance.video_generation` at
        // `/api/v3/contents/generations/tasks`, and `api.bytedance.task_query`
        // polls it.
        let bytedance = granted_by_group("relay.bytedance.media");
        for resource_code in [
            "api.bytedance.image_generation",
            "api.bytedance.video_generation",
            "api.bytedance.task_query",
        ] {
            assert!(
                bytedance.contains(resource_code),
                "`relay.bytedance.media` must grant `{resource_code}`"
            );
        }

        // The China-market vendor-native set.
        let cn = granted_by_group("relay.cn.visual_generation");
        for resource_code in [
            "api.kling.text_to_video",
            "api.kling.image_generation",
            "api.jimeng.video_generation",
            "api.jimeng.image_generation",
            "api.volcengine.video_generation",
            "api.volcengine.image_generation",
            "api.vidu.start_end_to_video",
            "api.vidu.reference_to_image",
        ] {
            assert!(
                cn.contains(resource_code),
                "`relay.cn.visual_generation` must grant `{resource_code}`"
            );
        }

        // The global vendor-native set, including Gemini's image/video actions.
        let global = granted_by_group("relay.global.visual_generation");
        for resource_code in [
            "api.gemini.image_generation",
            "api.gemini.video_generation",
            "api.black_forest_labs.image_generation",
            "api.runway.image_generation",
            "api.luma_ai.video_generation",
            "api.pixverse.video_generation",
            "api.stability_ai.image_generation",
        ] {
            assert!(
                global.contains(resource_code),
                "`relay.global.visual_generation` must grant `{resource_code}`"
            );
        }
    }
}
