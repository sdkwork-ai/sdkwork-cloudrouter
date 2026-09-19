//! Real-database end-to-end probe for the seven content-generation capabilities
//! (image, video, music, voice, sound effects, digital human, motion mimicry)
//! through the genuine PostgreSQL catalog.
//!
//! Where `media_routing_e2e` / `audio_vendor_routing_e2e` /
//! `avatar_motion_routing_e2e` prove the chain with a *controlled* in-memory
//! catalog (accounts + pricing authored by the test), this test drives the
//! **database router with provider secrets configured** — the production
//! composition, in which the invocation pipeline owns the vendor-native paths
//! and the account pool, credential resolution, pricing preflight, and real
//! upstream dispatch all run against the catalog the seed actually wrote.
//!
//! Two composition details matter and a naive probe gets both wrong:
//!
//! 1. `router_with_database_and_api_key_config` (the harness used by
//!    `openai_chat_db_auth_token_e2e`) passes **no** provider secret map and no
//!    relay, so `runtime.rs` merges the "route is declared but no upstream relay
//!    is configured" placeholder for every vendor prefix and answers HTTP 501
//!    before routing. The provider paths never run. This test supplies a
//!    provider secret map keyed by the catalog's own
//!    `managed://upstream-account-credential/<id>` refs so the placeholder is
//!    not merged and the invocation pipeline serves them.
//! 2. A 501 `*_passthrough_not_configured` response is therefore an *assembly*
//!    gap, not evidence that the vendor was reached. It is classified as a gap
//!    so the probe cannot pass on the placeholder.
//!
//! A catalog gap (no account route, no price, no account/credential) is
//! likewise a failure. A provider-side rejection is the expected residual: the
//! seed ships dev placeholder credentials, so vendors answer 401/403.
//!
//! 3. The caller's wallet must be funded. The production pricing step reserves
//!    the quoted amount before dispatch, and a bootstrapped test user starts at
//!    zero, so without `credit_token_bank_wallets` every correctly-priced
//!    request would stop at `insufficient available balance for hold` and the
//!    probe could not tell a broken chain from an empty wallet. That marker is
//!    classified as a gap so the funding step can never fail silently.
//!
//! Requires a running PostgreSQL reachable at `SDKWORK_DATABASE_URL`; the test
//! skips cleanly when the variable is absent.

use axum::body::Body;
use axum::http::Request;
use sdkwork_cloudrouter_config::{ApiKeySecurityConfig, DatabaseConfig, ProviderSecretMapConfig};
use sdkwork_cloudrouter_test_support::resolve_upstream_credential_key_ring;
use sdkwork_test::{AuthTokenClient, LoginHarness, PgTestContext};
use sqlx::Row;
use tower::ServiceExt;

/// Development secrets matching `.env.gateway` / `.sdkwork/secrets` (test-only).
/// Mirrors `sdkwork_test::router_harness::DevSecrets`; kept local because this
/// test needs a different router constructor than `RouterHarness` exposes.
const API_KEY_PEPPER: &str = "sdkwork-cloudrouter-local-dev-secret-20260507";
const TRUSTED_SUBJECT: &str = "sdkwork-cloudrouter-local-dev-secret-20260507";
const APP_SESSION: &str = "sdkwork-cloudrouter-local-dev-secret-20260507";
const INTERNAL_GATEWAY_SIGNING: &str = "-zC9LRxQyR2B2LQLhoTMi1XQmH_phcEDDVBtX3sxtWY";

/// One representative open-api surface per capability. Paths are the exact
/// inbound routes the gateway declares in
/// `sdkwork-api-cloudrouter-assembly::generated_open_http_route_manifest`.
const CASES: &[(&str, &str, &str)] = &[
    (
        "图片 image",
        "/v1/images/generations",
        r#"{"model":"gpt-image-2","prompt":"a red apple on a wooden table","n":1}"#,
    ),
    (
        "视频 video",
        "/kling/v1/videos/generations",
        r#"{"model_name":"kling-v3","prompt":"a paper plane gliding over a city","duration":"5"}"#,
    ),
    (
        // MiniMax, not Suno. The catalog deliberately parks every Suno music
        // model (`suno-v5`/`suno-v5.5` are `lifecycle=deprecated`,
        // `routingState=catalog_only`; `suno-v6*` are `lifecycle=catalog_only`,
        // `shelfState=hidden`), so the Suno route cannot legitimately reach a
        // vendor and a probe against it would assert the opposite of what the
        // catalog declares. `minimax/music-cover` is the routable music model:
        // `active` + `listed` + `routing=enabled`, rated 0.15/result on
        // `api_result`, and its account is a live member of `minimax.music`.
        //
        // The body carries `model` because the MiniMax contract requires it
        // (`MiniMaxMusicGenerationRequest.required = ["model"]`) and the pricing
        // key is resolved from it; Suno's schema makes `model` optional, which
        // is exactly why the route could not resolve a catalog model there.
        "音乐 music",
        "/minimax/v1/music_generation",
        r#"{"model":"music-cover","prompt":"upbeat synthwave, warm analog pads"}"#,
    ),
    (
        "配音 voice",
        "/elevenlabs/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
        r#"{"model_id":"eleven_multilingual_v2","text":"hello world"}"#,
    ),
    (
        "音效 sfx",
        "/elevenlabs/v1/sound-generation",
        r#"{"model_id":"eleven_text_to_sound_v2","text":"cinematic whoosh transition","duration_seconds":5}"#,
    ),
    (
        "数字人 avatar",
        "/kling/v1/videos/avatar",
        r#"{"model_name":"kling-v3","image":"https://cdn.example.test/portrait.png","audio":"https://cdn.example.test/line.mp3"}"#,
    ),
    (
        "动作模仿 motion",
        "/kling/v1/videos/motion-control",
        r#"{"model_name":"kling-v3","image":"https://cdn.example.test/person.png","video":"https://cdn.example.test/dance.mp4"}"#,
    ),
];

/// Fragments that mean the request died *inside the gateway* before any
/// upstream call: placeholder assembly, missing account route, missing price,
/// missing account/credential, or a prepaid hold the wallet could not cover.
const GATEWAY_GAP_MARKERS: &[&str] = &[
    "passthrough_not_configured",
    "no upstream account routes are configured",
    "upstream cost price not found",
    "pricing is not available",
    "price_not_found",
    "routing_failed",
    "upstream_route_unavailable",
    "account_not_found",
    // Prepaid holds are part of the gateway's pricing step, so a wallet that
    // cannot cover the reserved amount is a gateway-side stop, not a vendor
    // call. Without this marker an unfunded account would be counted as
    // "reached the vendor", which is exactly the false positive the probe
    // exists to prevent. `credit_token_bank_wallets` funds the account, so
    // seeing this marker means the funding step, not the chain, regressed.
    "insufficient available balance",
];

/// Credits every `token_bank` wallet in the tenant so the prepaid hold can
/// succeed.
///
/// The probe drives the **production** invocation pipeline, whose pricing step
/// reserves the quoted amount against the caller's wallet before dispatching.
/// A freshly bootstrapped test user has a zero-balance wallet, so every
/// correctly-priced request would stop at the hold and the probe could never
/// observe a vendor call — the chain would look broken while being perfectly
/// intact.
///
/// Scope and idempotence: only the tenant's existing `USER` / `token_bank` /
/// `GENERAL` wallets are touched, only upward (`GREATEST`), so re-running the
/// probe never compounds the credit and an operator-set higher balance is left
/// alone.
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

/// Fragments that mean the gateway *did* dial the vendor but the network never
/// completed the connection (no proxy configured, host blocked, DNS, timeout).
///
/// Reported as its own bucket rather than counted as "reached": the routing,
/// pricing, hold, and dispatch stages all ran, so it is not a gateway assembly
/// gap, but the vendor was never actually contacted, so it is not proof the
/// chain closes either. Folding it into either bucket would misstate what the
/// probe measured.
const NETWORK_UNREACHABLE_MARKERS: &[&str] = &[
    "provider_http_transport_failed",
    "tcp connect error",
    "dns error",
];

/// Loads the dev gateway secrets into the process environment. Mirrors
/// `RouterHarness` so the router is built exactly the way production does.
///
/// One deliberate deviation: `SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT` is
/// `development`, not the harness's `dev`. That variable is the *install
/// environment* (`ai_routing_seed::seed_environment_enables_vendor_accounts`),
/// and only `development` / `test` / `staging` seed the bundled vendor accounts
/// **enabled**. With `dev` (or unset) the seed writes every vendor account with
/// `status = 0`, and because this constructor runs `StartupInstallMode::Ensure`
/// it does so against the shared dev database — 26 of 27 vendor groups then
/// report `callable = 0` and every provider route fails routing.
fn seal_environment() {
    std::env::set_var("SDKWORK_CLOUDROUTER_DEPLOYMENT_MODE", "dev");
    std::env::set_var("SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT", "development");
    std::env::set_var(
        "SDKWORK_CLOUDROUTER_ROUTER_DEPLOYMENT_PROFILE",
        "standalone",
    );
    std::env::set_var("SDKWORK_CLOUDROUTER_ROUTER_RUNTIME_TARGET", "desktop");
    std::env::set_var("SDKWORK_CLOUDROUTER_STARTUP_INSTALL_MODE", "skip");
    std::env::set_var("SDKWORK_DATABASE_AUTO_MIGRATE", "false");
    std::env::set_var("SDKWORK_DATABASE_SEED_ON_BOOT", "false");
    std::env::set_var("SDKWORK_CLOUDROUTER_API_KEY_PEPPER", API_KEY_PEPPER);
    std::env::set_var(
        "SDKWORK_CLOUDROUTER_TRUSTED_SUBJECT_SECRET",
        TRUSTED_SUBJECT,
    );
    std::env::set_var("SDKWORK_CLOUDROUTER_APP_SESSION_SECRET", APP_SESSION);
    std::env::set_var(
        "SDKWORK_CLOUDROUTER_INTERNAL_GATEWAY_SIGNING_SECRET",
        INTERNAL_GATEWAY_SIGNING,
    );
    // Must match the ring that encrypted the credential rows currently in the
    // catalog; see `resolve_upstream_credential_key_ring`.
    let key_ring: &'static str = Box::leak(resolve_upstream_credential_key_ring().into_boxed_str());
    std::env::set_var("SDKWORK_CLOUDROUTER_UPSTREAM_CREDENTIAL_KEY_RING", key_ring);
}

/// Builds the provider secret map from the live credential rows, keyed by the
/// catalog's own `managed://upstream-account-credential/<id>` refs. Placeholder
/// values are intentional: the seed credentials point at real vendor base URLs,
/// so the residual must be a vendor-side rejection.
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

#[tokio::test]
async fn seven_media_capabilities_reach_their_vendor_on_the_real_catalog() {
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

    for (capability, uri, body) in CASES {
        let response = router
            .clone()
            .oneshot(
                client
                    .apply(
                        Request::builder()
                            .method("POST")
                            .uri(*uri)
                            .header("content-type", "application/json"),
                    )
                    .body(Body::from((*body).to_owned()))
                    .unwrap(),
            )
            .await
            .unwrap();

        let status = response.status();
        let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let text = String::from_utf8_lossy(&bytes).to_string();
        let excerpt = text.chars().take(500).collect::<String>();
        eprintln!("=== [{capability}] POST {uri} => HTTP {status}\n{excerpt}\n");

        let gateway_gap = GATEWAY_GAP_MARKERS
            .iter()
            .any(|marker| text.contains(marker));
        let network_unreachable = NETWORK_UNREACHABLE_MARKERS
            .iter()
            .any(|marker| text.contains(marker));
        if gateway_gap {
            gaps.push(format!("[{capability}] {uri} => HTTP {status}: {excerpt}"));
        } else if network_unreachable {
            unreachable.push(format!("[{capability}] {uri} => HTTP {status}: {excerpt}"));
        } else {
            reached.push(format!("[{capability}] {uri} => HTTP {status}"));
        }
    }

    eprintln!("=== 抵达厂商（链路完整）===");
    for line in &reached {
        eprintln!("  {line}");
    }
    eprintln!("=== 已拨号但网络不可达（环境，非网关缺口）===");
    for line in &unreachable {
        eprintln!("  {line}");
    }
    eprintln!("=== 网关内部缺口（链路断裂）===");
    for line in &gaps {
        eprintln!("  {line}");
    }

    assert!(
        gaps.is_empty(),
        "{} of {} capabilities never reached their vendor; the live catalog or router \
         assembly is missing account routes, credentials, or pricing:\n{}",
        gaps.len(),
        CASES.len(),
        gaps.join("\n")
    );
}
