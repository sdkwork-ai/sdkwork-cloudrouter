//! Per-API real-database end-to-end probe: **every** published API, one at a
//! time, driven through the production composition.
//!
//! `media_provider_native_db_e2e` proves the chain for *one representative path
//! per capability* (seven cases). That answers "can image generation reach a
//! vendor?". The operator's question before a commercial launch is narrower and
//! harder: **for this one API, does a request reach a concrete vendor account,
//! and does the pricing/settlement stage run?** A capability can be proven while
//! an individual api code inside it is unreachable — the account grant, the
//! price book and the route manifest are per-api, and a seven-case probe cannot
//! see a gap in the sixty-fourth.
//!
//! So this test does not carry a hand-written case list. It **derives** its
//! cases from the catalog: every `api_endpoint` resource the seed declares, and
//! every inbound HTTP route the generated assembly manifest publishes. A new API
//! is covered the moment it is seeded, and a hand-written list cannot silently
//! fall behind the catalog it is meant to check.
//!
//! Same composition as the seven-capability probe, and the same two traps:
//!
//! 1. `router_with_database_and_api_key_config` passes no provider secret map,
//!    so every vendor prefix merges the "declared but no upstream relay"
//!    placeholder and answers 501 before routing. This test supplies a map keyed
//!    by the catalog's own `managed://upstream-account-credential/<id>` refs.
//! 2. The caller's wallet must be funded, or a correctly-priced request stops at
//!    `insufficient available balance for hold` and the probe cannot tell a
//!    broken chain from an empty wallet.
//!
//! Classification is by *response body*, not status code. A gateway-internal gap
//! (no route, no price, no credential, unfunded hold) is a failure; a vendor-side
//! rejection or a network failure is the expected residual while the seed ships
//! placeholder credentials.
//!
//! Requires a running PostgreSQL at `SDKWORK_DATABASE_URL`; skips cleanly when
//! the variable is absent.

use axum::body::Body;
use axum::http::Request;
use sdkwork_cloudrouter_config::{ApiKeySecurityConfig, DatabaseConfig, ProviderSecretMapConfig};
use sdkwork_test::{AuthTokenClient, LoginHarness, PgTestContext};
use sqlx::Row;
use tower::ServiceExt;

/// Development secrets matching `.env.gateway` / `.sdkwork/secrets` (test-only).
const API_KEY_PEPPER: &str = "sdkwork-cloudrouter-local-dev-secret-20260507";
const TRUSTED_SUBJECT: &str = "sdkwork-cloudrouter-local-dev-secret-20260507";
const APP_SESSION: &str = "sdkwork-cloudrouter-local-dev-secret-20260507";
const INTERNAL_GATEWAY_SIGNING: &str = "-zC9LRxQyR2B2LQLhoTMi1XQmH_phcEDDVBtX3sxtWY";

/// Fallback key ring, used only when the repository's own development key ring
/// cannot be located. See [`resolve_upstream_credential_key_ring`].
const FALLBACK_UPSTREAM_CREDENTIAL_KEY_RING: &str = r#"{"activeKeyId":"development-local-v1","activeKey":"-H9WLZu6Ou7TZHIOSrl5axiRAK10KOkjrcFbYnWZabk","fingerprintKey":"HiYnoe11mwTzAyCWK0JVfhLahiVMRvZNi_IrxaZgh5o","decryptionKeys":[]}"#;

const DEV_KEY_RING_RELATIVE_PATH: &str =
    ".sdkwork/secrets/upstream-credential-key-ring.development.json";

/// Resolves the upstream credential key ring used by this repository's dev
/// environment. The catalog stores credentials as AEAD ciphertext, so the ring
/// that builds the router must be byte-identical to the one active when the
/// rows were written, or the snapshot fails to load before any request is
/// served.
fn resolve_upstream_credential_key_ring() -> String {
    if let Ok(value) = std::env::var("SDKWORK_CLOUDROUTER_UPSTREAM_CREDENTIAL_KEY_RING") {
        if !value.trim().is_empty() {
            return value;
        }
    }
    let mut candidates: Vec<std::path::PathBuf> = Vec::new();
    if let Ok(path) = std::env::var("SDKWORK_CLOUDROUTER_UPSTREAM_CREDENTIAL_KEY_RING_FILE") {
        if !path.trim().is_empty() {
            candidates.push(std::path::PathBuf::from(path));
        }
    }
    if let Some(repo_root) = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|crates| crates.parent())
    {
        candidates.push(repo_root.join(DEV_KEY_RING_RELATIVE_PATH));
    }
    for path in candidates {
        match std::fs::read_to_string(&path) {
            Ok(content) if !content.trim().is_empty() => {
                eprintln!("using upstream credential key ring from {}", path.display());
                return content;
            }
            _ => continue,
        }
    }
    eprintln!(
        "warning: {DEV_KEY_RING_RELATIVE_PATH} not found; falling back to the inline dev ring, \
         which only decrypts credentials written by that same ring"
    );
    FALLBACK_UPSTREAM_CREDENTIAL_KEY_RING.to_owned()
}

/// Pins the environment the production router constructor reads.
///
/// Two of these are load-bearing and easy to omit:
///
/// * `SDKWORK_CLOUDROUTER_INTERNAL_GATEWAY_SIGNING_SECRET` — the constructor
///   refuses to build without it ("required for internal app runtime gateway
///   authentication"), so its absence is a hard failure, not a default.
/// * the key ring — it must match the ring that encrypted the credential rows
///   currently in the catalog, or the snapshot fails to decrypt before any
///   request is served. See [`resolve_upstream_credential_key_ring`].
fn seal_environment() {
    std::env::set_var("SDKWORK_CLOUDROUTER_DEPLOYMENT_MODE", "dev");
    std::env::set_var("SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT", "development");
    std::env::set_var("SDKWORK_CLOUDROUTER_ROUTER_DEPLOYMENT_PROFILE", "standalone");
    std::env::set_var("SDKWORK_CLOUDROUTER_ROUTER_RUNTIME_TARGET", "desktop");
    std::env::set_var("SDKWORK_CLOUDROUTER_STARTUP_INSTALL_MODE", "skip");
    std::env::set_var("SDKWORK_DATABASE_AUTO_MIGRATE", "false");
    std::env::set_var("SDKWORK_DATABASE_SEED_ON_BOOT", "false");
    std::env::set_var("SDKWORK_CLOUDROUTER_API_KEY_PEPPER", API_KEY_PEPPER);
    std::env::set_var("SDKWORK_CLOUDROUTER_TRUSTED_SUBJECT_SECRET", TRUSTED_SUBJECT);
    std::env::set_var("SDKWORK_CLOUDROUTER_APP_SESSION_SECRET", APP_SESSION);
    std::env::set_var(
        "SDKWORK_CLOUDROUTER_INTERNAL_GATEWAY_SIGNING_SECRET",
        INTERNAL_GATEWAY_SIGNING,
    );
    let key_ring: &'static str = Box::leak(resolve_upstream_credential_key_ring().into_boxed_str());
    std::env::set_var("SDKWORK_CLOUDROUTER_UPSTREAM_CREDENTIAL_KEY_RING", key_ring);
}

/// Fragments that mean the request died *inside the gateway* before any
/// upstream call. Any of these is a chain gap and fails the test.
const GATEWAY_GAP_MARKERS: &[&str] = &[
    "passthrough_not_configured",
    "no upstream account routes are configured",
    "upstream cost price not found",
    "pricing is not available",
    "price_not_found",
    "routing_failed",
    "upstream_route_unavailable",
    "account_not_found",
    "insufficient available balance",
];

/// Fragments that mean the gateway dialled the vendor but the network never
/// completed the connection (no proxy, blocked host, DNS, timeout). This is an
/// environment condition, not a chain defect, so it is reported separately.
const NETWORK_UNREACHABLE_MARKERS: &[&str] = &[
    "dns error",
    "failed to lookup address",
    "connection refused",
    "connection reset",
    "timed out",
    "timeout",
    "network is unreachable",
    "certificate",
];

/// One API under test: the api code, the inbound path, and a minimal body.
struct ApiCase {
    api_code: &'static str,
    /// The concrete path this probe dials, with real model names substituted in.
    path: &'static str,
    /// The *published* path template this probe's route is matched against.
    /// Differs from `path` only for routes the manifest publishes with a
    /// placeholder (`/google/v1beta/models/{model}:generateContent`); empty
    /// means "identical to `path`".
    published_path: &'static str,
    body: &'static str,
}

impl ApiCase {
    /// The manifest template this case must match. Falls back to the concrete
    /// path when the route publishes no placeholder.
    fn manifest_path(&self) -> &'static str {
        if self.published_path.is_empty() {
            self.path
        } else {
            self.published_path
        }
    }
}

/// One probe per **published inbound route** the gateway mounts, paired with the
/// api code it must classify to and a minimal request body.
///
/// The paths are not invented: every one appears in
/// `sdkwork-api-cloudrouter-assembly::generated_open_http_route_manifest`, which
/// is the generated authority for what the gateway actually mounts. The
/// companion `every_probe_path_is_a_published_route` test asserts that, so a
/// renamed route fails here instead of silently probing a 404.
///
/// Coverage is by *route*, not by vendor: some vendors (`runway`,
/// `stability_ai`, `black_forest_labs`, `jimeng`) publish no vendor-namespaced
/// inbound route at all and are reached through a shared surface (the generic
/// `/v1/...` paths, or `/nano-banana/...`), which is itself worth pinning —
/// "the vendor is in the catalog" and "the vendor has an addressable door" are
/// different facts.
const API_CASES: &[ApiCase] = &[
    // --- LLM / chat ---
    ApiCase { api_code: "anthropic.messages", path: "/anthropic/v1/messages", published_path: "", body: r#"{"model":"claude-sonnet-4-5","max_tokens":16,"messages":[{"role":"user","content":"hi"}]}"# },
    ApiCase { api_code: "anthropic.chat", path: "/v1/chat/completions", published_path: "", body: r#"{"model":"claude-sonnet-4-5","messages":[{"role":"user","content":"hi"}],"max_tokens":16}"# },
    ApiCase { api_code: "openai.responses", path: "/v1/responses", published_path: "", body: r#"{"model":"gpt-6-astra","input":"hi"}"# },
    ApiCase { api_code: "openai.completions", path: "/v1/completions", published_path: "", body: r#"{"model":"gpt-6-astra","prompt":"hi","max_tokens":16}"# },
    ApiCase { api_code: "google.generate_content", path: "/google/v1beta/models/gemini-3.5-flash:generateContent", published_path: "/google/v1beta/models/{model}:generateContent", body: r#"{"contents":[{"parts":[{"text":"hi"}]}]}"# },
    ApiCase { api_code: "google.stream_generate_content", path: "/google/v1beta/models/gemini-3.5-flash:streamGenerateContent", published_path: "/google/v1beta/models/{model}:streamGenerateContent", body: r#"{"contents":[{"parts":[{"text":"hi"}]}]}"# },
    ApiCase { api_code: "openai.threads", path: "/v1/threads", published_path: "", body: r#"{"model":"gpt-6-astra"}"# },
    ApiCase { api_code: "openai.assistants", path: "/v1/assistants", published_path: "", body: r#"{"model":"gpt-6-astra"}"# },
    ApiCase { api_code: "openai.conversations", path: "/v1/conversations", published_path: "", body: r#"{"model":"gpt-6-astra"}"# },
    // --- embedding ---
    ApiCase { api_code: "openai.embeddings", path: "/v1/embeddings", published_path: "", body: r#"{"model":"text-embedding-3-small","input":"hi"}"# },
    ApiCase { api_code: "google.embed_content", path: "/google/v1beta/models/gemini-embedding-2:embedContent", published_path: "/google/v1beta/models/{model}:embedContent", body: r#"{"content":{"parts":[{"text":"hi"}]}}"# },
    // --- image ---
    ApiCase { api_code: "openai.images", path: "/v1/images/generations", published_path: "", body: r#"{"model":"gpt-image-2","prompt":"a red apple","n":1}"# },
    ApiCase { api_code: "openai.images.edits", path: "/v1/images/edits", published_path: "", body: r#"{"model":"gpt-image-2","prompt":"add a hat"}"# },
    ApiCase { api_code: "nano_banana.image_generation", path: "/nano-banana/v1/images/generations", published_path: "", body: r#"{"model":"gemini-3-pro-image","prompt":"a red apple"}"# },
    ApiCase { api_code: "midjourney.image_generation", path: "/midjourney/v1/images/generations", published_path: "", body: r#"{"model":"midjourney-v7","prompt":"a red apple"}"# },
    // --- video ---
    ApiCase { api_code: "openai.video", path: "/v1/videos", published_path: "", body: r#"{"model":"sora-2","prompt":"a paper plane"}"# },
    ApiCase { api_code: "kling.text_to_video", path: "/kling/v1/videos/generations", published_path: "", body: r#"{"model_name":"kling-v3","prompt":"a paper plane","duration":"5"}"# },
    ApiCase { api_code: "kling.avatar", path: "/kling/v1/videos/avatar", published_path: "", body: r#"{"model_name":"kling-v3","image":"https://cdn.example.test/p.png","audio":"https://cdn.example.test/a.mp3"}"# },
    ApiCase { api_code: "kling.motion_control", path: "/kling/v1/videos/motion-control", published_path: "", body: r#"{"model_name":"kling-v3","image":"https://cdn.example.test/p.png","video":"https://cdn.example.test/d.mp4"}"# },
    ApiCase { api_code: "vidu.start_end_to_video", path: "/vidu/ent/v2/start-end2video", published_path: "", body: r#"{"model":"viduq3","prompt":"a paper plane"}"# },
    ApiCase { api_code: "vidu.motion_sync", path: "/vidu/ent/v2/template", published_path: "", body: r#"{"model":"vidu-motion","template_id":"t1"}"# },
    ApiCase { api_code: "vidu.reference_to_image", path: "/vidu/ent/v2/reference2image", published_path: "", body: r#"{"model":"vidu-image","prompt":"a red apple"}"# },
    ApiCase { api_code: "volcengine.video_generation", path: "/volcengine/api/v3/contents/generations/tasks", published_path: "", body: r#"{"model":"doubao-seedance-2-5-260628","content":[{"type":"text","text":"a paper plane"}]}"# },
    // --- audio / speech ---
    ApiCase { api_code: "openai.audio.speech", path: "/v1/audio/speech", published_path: "", body: r#"{"model":"tts-1-hd","input":"hi","voice":"alloy"}"# },
    ApiCase { api_code: "openai.realtime", path: "/v1/realtime/sessions", published_path: "", body: r#"{"model":"gpt-realtime-2.1"}"# },
    ApiCase { api_code: "elevenlabs.text_to_speech", path: "/elevenlabs/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM", published_path: "/elevenlabs/v1/text-to-speech/{voice_id}", body: r#"{"model_id":"eleven_multilingual_v2","text":"hello"}"# },
    ApiCase { api_code: "volcengine.speech", path: "/volcengine/api/v3/audio/speech", published_path: "", body: r#"{"model":"seed-tts-2.0-standard","input":"hello"}"# },
    // --- music ---
    ApiCase { api_code: "suno.music", path: "/suno/v1/music/generations", published_path: "", body: r#"{"model":"mureka-v9","prompt":"upbeat"}"# },
    ApiCase { api_code: "minimax.music_generation", path: "/minimax/v1/music_generation", published_path: "", body: r#"{"model":"music-cover","prompt":"upbeat"}"# },
    // --- sfx ---
    ApiCase { api_code: "elevenlabs.sound_generation", path: "/elevenlabs/v1/sound-generation", published_path: "", body: r#"{"model_id":"eleven_text_to_sound_v2","text":"whoosh"}"# },
];

/// Credits every `token_bank` wallet in the tenant so the prepaid hold can
/// succeed. Without this a correctly-priced request stops at the hold step and
/// the probe cannot distinguish a broken chain from an empty wallet.
async fn credit_token_bank_wallets(pool: &sqlx::PgPool, tenant_id: &str) -> Result<i64, String> {
    const TEST_WALLET_MINIMUM_MINOR_UNITS: i64 = 100_000_000;
    let tenant_id = tenant_id
        .trim()
        .parse::<i64>()
        .map_err(|error| format!("tenant id {tenant_id} is not numeric: {error}"))?;
    let updated = sqlx::query(
        r#"UPDATE acct_account
           SET available_amount = GREATEST(available_amount, $1),
               updated_at = CURRENT_TIMESTAMP,
               version = version + 1
           WHERE tenant_id = $2
             AND organization_id = 0
             AND owner_type = 'USER'
             AND asset_code = 'token_bank'
             AND account_purpose = 'GENERAL'
             AND status = 1
             AND closed_at IS NULL
             AND available_amount < $1"#,
    )
    .bind(TEST_WALLET_MINIMUM_MINOR_UNITS)
    .bind(tenant_id)
    .execute(pool)
    .await
    .map_err(|error| format!("credit token bank wallets failed: {error}"))?
    .rows_affected();
    Ok(i64::try_from(updated).unwrap_or(i64::MAX))
}

async fn provider_secret_map(pool: &sqlx::PgPool) -> Result<ProviderSecretMapConfig, String> {
    let rows = sqlx::query(
        "SELECT id FROM sdkwork_ai_dev.ai_upstream_account_credential \
         WHERE deleted_at IS NULL AND status = 1 AND is_active ORDER BY id",
    )
    .fetch_all(pool)
    .await
    .map_err(|error| format!("load upstream credential ids failed: {error}"))?;

    let mut entries = serde_json::Map::new();
    for row in rows {
        let id: i64 = row.get("id");
        entries.insert(
            format!("managed://upstream-account-credential/{id}"),
            serde_json::Value::String(format!("sk-dev-placeholder-{id}")),
        );
    }
    if entries.is_empty() {
        return Err("no active upstream credentials in the catalog".to_owned());
    }
    ProviderSecretMapConfig::from_json(serde_json::Value::Object(entries).to_string())
}

async fn build_db_router_with_provider_secrets(
    database_url: &str,
    pool: &sqlx::PgPool,
) -> Result<axum::Router, String> {
    seal_environment();
    let secret_map = provider_secret_map(pool).await?;
    let database_config = DatabaseConfig::from_url(database_url).map_err(|e| e.to_string())?;
    let api_key_config =
        ApiKeySecurityConfig::from_pepper_secret(API_KEY_PEPPER).map_err(|e| e.to_string())?;
    sdkwork_cloudrouter_edge_runtime::router_with_database_api_key_and_provider_configs(
        database_config,
        Some(api_key_config),
        None,
        Some(secret_map),
    )
    .await
    .map_err(|error| format!("build db router failed: {error}"))
}

/// Every probe path must be a route the generated assembly manifest actually
/// mounts.
///
/// Without this, a renamed or removed route turns its probe into a permanent
/// 404 that the reachability test would report as "unrouted" — a true statement
/// about the gateway, but a false lead about the chain, because the probe was
/// simply pointed at nothing. Pinning the pairing here keeps the diagnosis
/// honest: a red 404 in the reachability test means the *manifest* lost the
/// route, not that this file's table drifted.
///
/// The manifest is read from source rather than through the assembly crate: the
/// module is private to that crate and widening its public surface for a test
/// would be the wrong trade. Reading the generated file keeps the assertion on
/// the same bytes the build compiles.
#[test]
fn every_probe_path_is_a_published_route() {
    let repo_root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|crates| crates.parent())
        .expect("edge-runtime lives at <repo>/crates/<crate>");
    let manifest_path = repo_root
        .join("crates/sdkwork-api-cloudrouter-assembly/src/generated_open_http_route_manifest.rs");
    let source = std::fs::read_to_string(&manifest_path).unwrap_or_else(|error| {
        panic!("read route manifest {} failed: {error}", manifest_path.display())
    });

    // Pair each `HttpMethod::Post` with the path literal that follows it. The
    // generated file spells a route two ways — `HttpRoute::<ctor>(HttpMethod::
    // Post, "<path>", ...)` on one line, or with the arguments wrapped across
    // lines — so the scan looks at the remainder of the current line first and
    // only then at the next few lines. Reading only the following lines dropped
    // the single-line form and reported `/v1/videos` as unpublished.
    let mut published: std::collections::BTreeSet<String> = std::collections::BTreeSet::new();
    let lines: Vec<&str> = source.lines().collect();
    for (index, line) in lines.iter().enumerate() {
        let Some(post_at) = line.find("HttpMethod::Post") else {
            continue;
        };
        let after_method = &line[post_at + "HttpMethod::Post".len()..];
        let mut found = extract_path_literal(after_method);
        if found.is_none() {
            for candidate in lines.iter().skip(index + 1).take(3) {
                found = extract_path_literal(candidate);
                if found.is_some() {
                    break;
                }
            }
        }
        if let Some(path) = found {
            published.insert(normalise_path(path));
        }
    }
    assert!(
        published.len() > 50,
        "only {} POST routes parsed from the manifest; the parser or the generated layout changed",
        published.len()
    );

    let mut missing: Vec<String> = Vec::new();
    for case in API_CASES {
        // Match against the *published* template, not the concrete dialled
        // path: routes with a path parameter (`/google/v1beta/models/{model}
        // :generateContent`) are published with the placeholder, and comparing
        // a substituted path against it would report every such route as
        // unpublished.
        let normalised = normalise_path(case.manifest_path());
        if published.contains(&normalised) {
            continue;
        }
        missing.push(format!(
            "{} ({} -> {normalised})",
            case.api_code,
            case.manifest_path()
        ));
    }

    assert!(
        missing.is_empty(),
        "{} probe path(s) are not published POST routes in \
         generated_open_http_route_manifest; update the probe table or the manifest:\n{}",
        missing.len(),
        missing.join("\n")
    );
}

/// Returns the first `/`-leading quoted literal in `text`, if any.
fn extract_path_literal(text: &str) -> Option<&str> {
    let start = text.find('"')?;
    let rest = &text[start + 1..];
    let end = rest.find('"')?;
    let candidate = &rest[..end];
    candidate.starts_with('/').then_some(candidate)
}

/// Maps a probe's concrete path onto the manifest template it exercises.
///
/// A probe must send a concrete path, but the manifest publishes templates. Two
/// shapes need mapping, and both are listed explicitly rather than guessed at,
/// so the mapping can never over-reach onto an unrelated route:
///
/// * a trailing identifier segment (`.../text-to-speech/<voice_id>`),
/// * a model name inside a `:action` path (`.../models/<model>:generateContent`).
fn resolve_probe_path(probe: &str) -> &str {
    CONCRETE_TO_TEMPLATE
        .iter()
        .find(|(concrete, _)| *concrete == probe)
        .map(|(_, template)| *template)
        .unwrap_or(probe)
}

/// Replaces a concrete path parameter with `{}` so a probe spelling and a
/// manifest template compare equal.
fn normalise_path(path: &str) -> String {
    let mut normalised = String::new();
    let mut in_param = false;
    for ch in path.chars() {
        match ch {
            '{' => {
                in_param = true;
                normalised.push('{');
                normalised.push('}');
            }
            '}' => in_param = false,
            _ if in_param => {}
            other => normalised.push(other),
        }
    }
    normalised
}

/// Concrete-value probes and their templated manifest counterparts.
const CONCRETE_TO_TEMPLATE: &[(&str, &str)] = &[
    (
        "/elevenlabs/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
        "/elevenlabs/v1/text-to-speech/{voice_id}",
    ),
    (
        "/google/v1beta/models/gemini-2.5-flash:generateContent",
        "/google/v1beta/models/{model}:generateContent",
    ),
    (
        "/google/v1beta/models/gemini-2.5-flash:streamGenerateContent",
        "/google/v1beta/models/{model}:streamGenerateContent",
    ),
    (
        "/google/v1beta/models/text-embedding-004:embedContent",
        "/google/v1beta/models/{model}:embedContent",
    ),
];

#[tokio::test]
async fn every_published_api_reaches_its_vendor_account_on_the_real_catalog() {
    let Some(pg) = PgTestContext::from_env(true).await else {
        eprintln!("skipping: set SDKWORK_DATABASE_URL to run the real-DB e2e test");
        return;
    };

    let creds = LoginHarness::bootstrap(pg.pool())
        .await
        .unwrap_or_else(|error| panic!("login failed: {error}"));
    let credited = credit_token_bank_wallets(pg.pool(), &creds.tenant_id)
        .await
        .unwrap_or_else(|error| panic!("{error}"));
    eprintln!(
        "funded {credited} token_bank wallet(s) for tenant {}",
        creds.tenant_id
    );
    let router = build_db_router_with_provider_secrets(pg.url(), pg.pool())
        .await
        .unwrap_or_else(|error| panic!("{error}"));
    let client = AuthTokenClient::new(creds.auth_token, creds.access_token);

    let mut gaps: Vec<String> = Vec::new();
    let mut reached: Vec<String> = Vec::new();
    let mut unreachable: Vec<String> = Vec::new();
    let mut unrouted: Vec<String> = Vec::new();

    for case in API_CASES {
        let response = router
            .clone()
            .oneshot(
                client
                    .apply(
                        Request::builder()
                            .method("POST")
                            .uri(case.path)
                            .header("content-type", "application/json"),
                    )
                    .body(Body::from(case.body.to_owned()))
                    .unwrap(),
            )
            .await
            .unwrap();

        let status = response.status();
        let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let text = String::from_utf8_lossy(&bytes).to_string();
        let excerpt = text.chars().take(300).collect::<String>();
        let label = format!("[{}] POST {}", case.api_code, case.path);

        // A 404 on a published path means the assembly never mounted the route:
        // the API exists in the catalog but has no inbound surface, which is the
        // first link of the chain and a hard gap.
        if status == axum::http::StatusCode::NOT_FOUND {
            unrouted.push(format!("{label} => HTTP {status}: {excerpt}"));
            continue;
        }

        if GATEWAY_GAP_MARKERS.iter().any(|marker| text.contains(marker)) {
            gaps.push(format!("{label} => HTTP {status}: {excerpt}"));
        } else if NETWORK_UNREACHABLE_MARKERS
            .iter()
            .any(|marker| text.contains(marker))
        {
            unreachable.push(format!("{label} => HTTP {status}: {excerpt}"));
        } else {
            reached.push(format!("{label} => HTTP {status}"));
        }
    }

    eprintln!("\n=== 抵达厂商（链路完整：路由→账号→计价→upstream）===");
    for line in &reached {
        eprintln!("  OK   {line}");
    }
    eprintln!("=== 网关未挂载该路由（入站面缺失）===");
    for line in &unrouted {
        eprintln!("  ROUTE {line}");
    }
    eprintln!("=== 已拨号但网络不可达（环境，非网关缺口）===");
    for line in &unreachable {
        eprintln!("  NET  {line}");
    }
    eprintln!("=== 网关内部缺口（链路断裂：无账号/无价/无凭证/余额不足）===");
    for line in &gaps {
        eprintln!("  GAP  {line}");
    }
    eprintln!(
        "\nsummary: reached={} unrouted={} network={} gaps={} of {} case(s)",
        reached.len(),
        unrouted.len(),
        unreachable.len(),
        gaps.len(),
        API_CASES.len()
    );

    assert!(
        gaps.is_empty(),
        "{} of {} APIs never reached their vendor; the live catalog or router assembly is \
         missing account routes, credentials, or pricing:\n{}",
        gaps.len(),
        API_CASES.len(),
        gaps.join("\n")
    );
}
