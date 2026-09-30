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
//! So this probe enumerates the published surface one API at a time. Its cases
//! live in the hand-written `API_CASES` table below, which is kept in step with
//! the catalog by `check-cloudrouter-ai-routing-consistency.mjs` (the seeded
//! `api_endpoint` set) and by `scripts/dev/audit-api-chain-reachability.mjs`
//! (the per-endpoint four-link chain). Those two tools are the authority: a new
//! API is covered here the moment someone adds its case, and the audits fail
//! loudly if the table drifts behind the catalog.
//!
//! Catalogued-unrouted namespaces (see `load_catalogued_unrouted_scopes`, which
//! reads the ledger shared with `tools/check-cloudrouter-ai-routing-consistency.mjs`)
//! are dialed too, but they must fail closed with exactly
//! `no upstream account routes are configured ... on api scope <scope>` — that
//! exact tuple is their asserted contract, not a gap. Any other answer (404, a
//! misrouted call, a different error) fails the test.
//!
//! Circuit-breaker carry-over (`failure_threshold: 5` per account,
//! `open_duration: 30s` in `CircuitBreakerConfig::default()`) is absorbed
//! mechanically: a case answered with `open circuit breaker` waits out the open
//! window and re-probes (`BREAKER_MAX_RETRIES`) before it can be judged a gap.
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
use sdkwork_cloudrouter_test_support::resolve_upstream_credential_key_ring;
use sdkwork_test::{AuthTokenClient, LoginHarness, PgTestContext};
use sqlx::Row;
use tower::ServiceExt;

/// Development secrets matching `.env.gateway` / `.sdkwork/secrets` (test-only).
const API_KEY_PEPPER: &str = "sdkwork-cloudrouter-local-dev-secret-20260507";
const TRUSTED_SUBJECT: &str = "sdkwork-cloudrouter-local-dev-secret-20260507";
const APP_SESSION: &str = "sdkwork-cloudrouter-local-dev-secret-20260507";
const INTERNAL_GATEWAY_SIGNING: &str = "-zC9LRxQyR2B2LQLhoTMi1XQmH_phcEDDVBtX3sxtWY";

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

/// Published namespaces the routing contract declares unrouted live in the
/// shared ledger `data/ai-routing/declared-unrouted.json` (authored and
/// validated by `tools/check-cloudrouter-ai-routing-consistency.mjs`). Entries
/// that carry `apiCode` + `failClosedScope` are doors the runtime probe dials:
/// they mount an inbound route but have no supplier, vendor, or bundled
/// account, so the *correct* behavior is to fail closed with exactly
/// `no upstream account routes are configured ... on api scope <scope>`.
///
/// The probe still dials them and asserts that exact failure shape: a 404 would
/// mean the manifest lost the door, and any other error means the fail-closed
/// guard drifted. Only the exact tuple counts as the catalogued outcome.
///
/// Loading is fail-closed: a missing, malformed, or emptied ledger panics
/// instead of silently reclassifying those doors as chain gaps.
fn load_catalogued_unrouted_scopes() -> std::collections::BTreeMap<String, String> {
    let repo_root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|crates| crates.parent())
        .expect("edge-runtime lives at <repo>/crates/<crate>");
    let ledger_path = repo_root.join("data/ai-routing/declared-unrouted.json");
    let source = std::fs::read_to_string(&ledger_path).unwrap_or_else(|error| {
        panic!(
            "read the declared-unrouted ledger {} failed: {error}",
            ledger_path.display()
        )
    });
    let ledger: serde_json::Value = serde_json::from_str(&source).unwrap_or_else(|error| {
        panic!(
            "the declared-unrouted ledger {} is not valid JSON: {error}",
            ledger_path.display()
        )
    });
    let items = ledger
        .get("items")
        .and_then(|items| items.as_array())
        .unwrap_or_else(|| {
            panic!(
                "the declared-unrouted ledger {} has no \"items\" array",
                ledger_path.display()
            )
        });
    let mut scopes = std::collections::BTreeMap::new();
    for item in items {
        if let (Some(api_code), Some(scope)) = (
            item.get("apiCode").and_then(|value| value.as_str()),
            item.get("failClosedScope").and_then(|value| value.as_str()),
        ) {
            scopes.insert(api_code.to_owned(), scope.to_owned());
        }
    }
    assert!(
        !scopes.is_empty(),
        "the declared-unrouted ledger {} declares no fail-closed api scope; the \
         catalogued-exemption contract shared with \
         tools/check-cloudrouter-ai-routing-consistency.mjs is lost",
        ledger_path.display()
    );
    scopes
}

/// The circuit breaker opens per account after `failure_threshold` (5)
/// consecutive upstream failures. With placeholder credentials every real
/// vendor call fails, so the sixth probe sharing one vendor account inherits an
/// open circuit even though its own wiring is complete. The open window is 30s
/// (`CircuitBreakerConfig::default()`); after it the half-open probe dials the
/// vendor again, which is all this probe needs to prove the chain.
const BREAKER_OPEN_MARKER: &str = "open circuit breaker";
const BREAKER_RETRY_COOLDOWN: std::time::Duration = std::time::Duration::from_secs(31);
const BREAKER_MAX_RETRIES: u32 = 2;

/// One API under test: the api code, the HTTP method, the inbound path, and a
/// minimal body.
///
/// The method is carried explicitly because the published surface is not
/// POST-only: the contract mounts 59 `GET` and 17 `DELETE` operations beside
/// the 91 `POST` ones, and a probe that dials the wrong verb answers `405` and
/// proves nothing about the chain.
struct ApiCase {
    api_code: &'static str,
    /// The HTTP method this operation is published under.
    method: &'static str,
    /// The concrete path this probe dials, with real model names substituted in.
    path: &'static str,
    /// The *published* path template this probe's route is matched against.
    /// Differs from `path` only for routes the manifest publishes with a
    /// placeholder (`/google/v1beta/models/{model}:generateContent`); empty
    /// means "identical to `path`".
    published_path: &'static str,
    body: &'static str,
    /// How the gateway is *expected* to answer this operation on a deployment
    /// whose upstream accounts serve it versus one that does not.
    expectation: ApiExpectation,
}

/// The contract's own vocabulary for a published operation, mirrored so a
/// probe can assert the right thing without inventing a status.
///
/// Every open-api operation publishes `200, 400, 401, 404, 501, 502`. The three
/// that matter to a chain probe are:
///
/// * `Routable` — the gateway must reach a vendor account (200, or the
///   vendor's own rejection / a network failure while the seed ships
///   placeholder credentials). A `501` here would be a chain gap.
/// * `Unbacked` — the operation is published but has no upstream route account
///   on this deployment, so the contract's documented answer is `501`
///   (`"... has no upstream route account on this deployment"`). It must NOT
///   answer 404 (the route is gone) and must NOT answer a routing/pricing gap.
/// * `Synthetic` — the gateway answers locally with a body it owns
///   (`GET /v1/models`, `GET /v1/vendors`), regardless of upstream.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ApiExpectation {
    Routable,
    Unbacked,
    Synthetic,
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

    /// `"<METHOD> <published path>"` — the key the generated route manifest and
    /// the contract both spell an operation with.
    fn operation(&self) -> String {
        format!("{} {}", self.method, self.manifest_path())
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
    ApiCase {
        api_code: "anthropic.messages",
        path: "/anthropic/v1/messages",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model":"claude-sonnet-4-5","max_tokens":16,"messages":[{"role":"user","content":"hi"}]}"#,
    },
    ApiCase {
        api_code: "anthropic.chat",
        path: "/v1/chat/completions",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model":"claude-sonnet-4-5","messages":[{"role":"user","content":"hi"}],"max_tokens":16}"#,
    },
    ApiCase {
        api_code: "openai.responses",
        path: "/v1/responses",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model":"gpt-6-astra","input":"hi"}"#,
    },
    ApiCase {
        api_code: "openai.completions",
        path: "/v1/completions",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model":"gpt-6-astra","prompt":"hi","max_tokens":16}"#,
    },
    ApiCase {
        api_code: "google.generate_content",
        path: "/google/v1beta/models/gemini-3.5-flash:generateContent",
        published_path: "/google/v1beta/models/{model}:generateContent",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"contents":[{"parts":[{"text":"hi"}]}]}"#,
    },
    ApiCase {
        api_code: "google.stream_generate_content",
        path: "/google/v1beta/models/gemini-3.5-flash:streamGenerateContent",
        published_path: "/google/v1beta/models/{model}:streamGenerateContent",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"contents":[{"parts":[{"text":"hi"}]}]}"#,
    },
    ApiCase {
        api_code: "openai.threads",
        path: "/v1/threads",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model":"gpt-6-astra"}"#,
    },
    ApiCase {
        api_code: "openai.assistants",
        path: "/v1/assistants",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model":"gpt-6-astra"}"#,
    },
    ApiCase {
        api_code: "openai.conversations",
        path: "/v1/conversations",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model":"gpt-6-astra"}"#,
    },
    // --- embedding ---
    ApiCase {
        api_code: "openai.embeddings",
        path: "/v1/embeddings",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model":"text-embedding-3-small","input":"hi"}"#,
    },
    ApiCase {
        api_code: "google.embed_content",
        path: "/google/v1beta/models/gemini-embedding-2:embedContent",
        published_path: "/google/v1beta/models/{model}:embedContent",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"content":{"parts":[{"text":"hi"}]}}"#,
    },
    // --- image ---
    ApiCase {
        api_code: "openai.images",
        path: "/v1/images/generations",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model":"gpt-image-2","prompt":"a red apple","n":1}"#,
    },
    ApiCase {
        api_code: "openai.images.edits",
        path: "/v1/images/edits",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model":"gpt-image-2","prompt":"add a hat"}"#,
    },
    ApiCase {
        api_code: "nano_banana.image_generation",
        path: "/nano-banana/v1/images/generations",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model":"gemini-3-pro-image","prompt":"a red apple"}"#,
    },
    ApiCase {
        api_code: "midjourney.image_generation",
        path: "/midjourney/v1/images/generations",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model":"midjourney-v7","prompt":"a red apple"}"#,
    },
    // --- video ---
    ApiCase {
        api_code: "openai.video",
        path: "/v1/videos",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model":"sora-2","prompt":"a paper plane"}"#,
    },
    ApiCase {
        api_code: "kling.text_to_video",
        path: "/kling/v1/videos/generations",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model_name":"kling-v3","prompt":"a paper plane","duration":"5"}"#,
    },
    ApiCase {
        api_code: "kling.avatar",
        path: "/kling/v1/videos/avatar",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model_name":"kling-v3","image":"https://cdn.example.test/p.png","audio":"https://cdn.example.test/a.mp3"}"#,
    },
    ApiCase {
        api_code: "kling.motion_control",
        path: "/kling/v1/videos/motion-control",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model_name":"kling-v3","image":"https://cdn.example.test/p.png","video":"https://cdn.example.test/d.mp4"}"#,
    },
    ApiCase {
        api_code: "vidu.start_end_to_video",
        path: "/vidu/ent/v2/start-end2video",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model":"viduq3","prompt":"a paper plane"}"#,
    },
    // Vidu's three primary video surfaces. The contract published all three and
    // `sdkwork-generations` calls them through `videos_vidu()`, but the taxonomy
    // named no route for any of them, so each died in `classify_request` as
    // `ResourceClassification` (a 404 on a published path). The probes pin the
    // classification now that the taxonomy, the seeds, the grants and both arm
    // tables carry them.
    //
    // `viduq3` is the vendor's active video model, so the pricing resolver's
    // requested-model path finds `vidu/viduq3` in the price book.
    ApiCase {
        api_code: "vidu.text_to_video",
        path: "/vidu/ent/v2/text2video",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model":"viduq3","prompt":"a paper plane"}"#,
    },
    ApiCase {
        api_code: "vidu.image_to_video",
        path: "/vidu/ent/v2/img2video",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model":"viduq3","images":["https://cdn.example.test/p.png"],"prompt":"a paper plane"}"#,
    },
    ApiCase {
        api_code: "vidu.reference_to_video",
        path: "/vidu/ent/v2/reference2video",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model":"viduq3","images":["https://cdn.example.test/p.png"],"prompt":"a red apple"}"#,
    },
    // `POST /ent/v2/template` is *template*-driven: the official contract
    // requires `template` (a scene-template name such as `hugging`). The body
    // therefore carries the official shape. Because no model binds to this
    // endpoint (`vidu.motion_sync` is registered in `NOT_BOUND_BY_DESCRIPTOR`
    // — binding one would make every `video` model answer template requests),
    // the price is resolved the same way `kling.motion_control` resolves it:
    // the request names a real catalog model, and the resolver's
    // requested-model path looks `<catalog-vendor>/<model>` up in the price
    // book. `viduq3` is the vendor's active video model.
    ApiCase {
        api_code: "vidu.motion_sync",
        path: "/vidu/ent/v2/template",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"template":"hugging","model":"viduq3","images":["https://cdn.example.test/p.png"],"prompt":"hug"}"#,
    },
    // `POST /ent/v2/reference2image` accepts `viduq2` / `viduq1` (the official
    // `model` enum). The previous fixture sent `vidu-image`, which is not a
    // catalog model, so the price lookup derived `vidu/vidu-image` and could
    // never match a price row.
    ApiCase {
        api_code: "vidu.reference_to_image",
        path: "/vidu/ent/v2/reference2image",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model":"viduq2","prompt":"a red apple"}"#,
    },
    ApiCase {
        api_code: "volcengine.video_generation",
        path: "/volcengine/api/v3/contents/generations/tasks",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model":"doubao-seedance-2-5-260628","content":[{"type":"text","text":"a paper plane"}]}"#,
    },
    // --- audio / speech ---
    ApiCase {
        api_code: "openai.audio.speech",
        path: "/v1/audio/speech",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model":"tts-1-hd","input":"hi","voice":"alloy"}"#,
    },
    ApiCase {
        api_code: "openai.realtime",
        path: "/v1/realtime/sessions",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model":"gpt-realtime-2.1"}"#,
    },
    ApiCase {
        api_code: "elevenlabs.text_to_speech",
        path: "/elevenlabs/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
        published_path: "/elevenlabs/v1/text-to-speech/{voice_id}",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model_id":"eleven_multilingual_v2","text":"hello"}"#,
    },
    ApiCase {
        api_code: "volcengine.speech",
        path: "/volcengine/api/v3/audio/speech",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model":"seed-tts-2.0-standard","input":"hello"}"#,
    },
    // --- music ---
    ApiCase {
        api_code: "suno.music",
        path: "/suno/v1/music/generations",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model":"mureka-v9","prompt":"upbeat"}"#,
    },
    ApiCase {
        api_code: "minimax.music_generation",
        path: "/minimax/v1/music_generation",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model":"music-cover","prompt":"upbeat"}"#,
    },
    // --- sfx ---
    ApiCase {
        api_code: "elevenlabs.sound_generation",
        path: "/elevenlabs/v1/sound-generation",
        published_path: "",
        method: "POST",
        expectation: ApiExpectation::Routable,
        body: r#"{"model_id":"eleven_text_to_sound_v2","text":"whoosh"}"#,
    },
    ApiCase {
        api_code: "anthropicListFiles",
        method: "GET",
        path: "/anthropic/v1/files",
        published_path: "/anthropic/v1/files",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "anthropicUploadFile",
        method: "POST",
        path: "/anthropic/v1/files",
        published_path: "/anthropic/v1/files",
        body: r#"{"filename":"probe.txt"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "anthropicDeleteFile",
        method: "DELETE",
        path: "/anthropic/v1/files/file-probe-001",
        published_path: "/anthropic/v1/files/{file_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "anthropicRetrieveFile",
        method: "GET",
        path: "/anthropic/v1/files/file-probe-001",
        published_path: "/anthropic/v1/files/{file_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "anthropicRetrieveFileContent",
        method: "GET",
        path: "/anthropic/v1/files/file-probe-001/content",
        published_path: "/anthropic/v1/files/{file_id}/content",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "anthropicListMessageBatches",
        method: "GET",
        path: "/anthropic/v1/messages/batches",
        published_path: "/anthropic/v1/messages/batches",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "anthropicCreateMessageBatch",
        method: "POST",
        path: "/anthropic/v1/messages/batches",
        published_path: "/anthropic/v1/messages/batches",
        body: r#"{"requests":[{"custom_id":"probe-1","params":{"model":"claude-sonnet-4-5","max_tokens":16,"messages":[{"role":"user","content":"hi"}]}}]}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "anthropicRetrieveMessageBatch",
        method: "GET",
        path: "/anthropic/v1/messages/batches/batch-probe-001",
        published_path: "/anthropic/v1/messages/batches/{batch_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "anthropicCancelMessageBatch",
        method: "POST",
        path: "/anthropic/v1/messages/batches/batch-probe-001/cancel",
        published_path: "/anthropic/v1/messages/batches/{batch_id}/cancel",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "anthropicCountMessageTokens",
        method: "POST",
        path: "/anthropic/v1/messages/count_tokens",
        published_path: "/anthropic/v1/messages/count_tokens",
        body: r#"{"model":"claude-sonnet-4-5","messages":[{"role":"user","content":"hi"}]}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "googleListCachedContents",
        method: "GET",
        path: "/google/v1beta/cachedContents",
        published_path: "/google/v1beta/cachedContents",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "googleCreateCachedContent",
        method: "POST",
        path: "/google/v1beta/cachedContents",
        published_path: "/google/v1beta/cachedContents",
        body: r#"{"model":"models/gemini-3.5-flash","contents":[{"parts":[{"text":"hi"}]}]}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "googleDeleteCachedContent",
        method: "DELETE",
        path: "/google/v1beta/cachedContents/cachedContents-probe-001",
        published_path: "/google/v1beta/cachedContents/{cached_content_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "googleRetrieveCachedContent",
        method: "GET",
        path: "/google/v1beta/cachedContents/cachedContents-probe-001",
        published_path: "/google/v1beta/cachedContents/{cached_content_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "googleListFiles",
        method: "GET",
        path: "/google/v1beta/files",
        published_path: "/google/v1beta/files",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "googleUploadFile",
        method: "POST",
        path: "/google/v1beta/files",
        published_path: "/google/v1beta/files",
        body: r#"{"filename":"probe.txt"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "googleDeleteFile",
        method: "DELETE",
        path: "/google/v1beta/files/file-probe-001",
        published_path: "/google/v1beta/files/{file_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "googleRetrieveFile",
        method: "GET",
        path: "/google/v1beta/files/file-probe-001",
        published_path: "/google/v1beta/files/{file_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "googleBatchEmbedContents",
        method: "POST",
        path: "/google/v1beta/models/gemini-3.5-flash:batchEmbedContents",
        published_path: "/google/v1beta/models/{model}:batchEmbedContents",
        body: r#"{"requests":[{"model":"models/text-embedding-004","content":{"parts":[{"text":"hi"}]}}]}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "googleCountTokens",
        method: "POST",
        path: "/google/v1beta/models/gemini-3.5-flash:countTokens",
        published_path: "/google/v1beta/models/{model}:countTokens",
        body: r#"{"contents":[{"parts":[{"text":"hi"}]}]}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "klingRetrieveVideoGeneration",
        method: "GET",
        path: "/kling/v1/videos/generations/task-probe-001",
        published_path: "/kling/v1/videos/generations/{task_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "midjourneyRetrieveImageGeneration",
        method: "GET",
        path: "/midjourney/v1/images/generations/task-probe-001",
        published_path: "/midjourney/v1/images/generations/{task_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "nanoBananaRetrieveImageGeneration",
        method: "GET",
        path: "/nano-banana/v1/images/generations/task-probe-001",
        published_path: "/nano-banana/v1/images/generations/{task_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "sunoRetrieveMusicGeneration",
        method: "GET",
        path: "/suno/v1/music/generations/task-probe-001",
        published_path: "/suno/v1/music/generations/{task_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "listAssistants",
        method: "GET",
        path: "/v1/assistants",
        published_path: "/v1/assistants",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "deleteAssistant",
        method: "DELETE",
        path: "/v1/assistants/asst-probe-001",
        published_path: "/v1/assistants/{assistant_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "retrieveAssistant",
        method: "GET",
        path: "/v1/assistants/asst-probe-001",
        published_path: "/v1/assistants/{assistant_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "modifyAssistant",
        method: "POST",
        path: "/v1/assistants/asst-probe-001",
        published_path: "/v1/assistants/{assistant_id}",
        body: r#"{"model":"gpt-6-astra","name":"probe"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "openai.audio.transcriptions",
        method: "POST",
        path: "/v1/audio/transcriptions",
        published_path: "/v1/audio/transcriptions",
        body: r#"{"model":"whisper-1"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "openai.audio.translations",
        method: "POST",
        path: "/v1/audio/translations",
        published_path: "/v1/audio/translations",
        body: r#"{"model":"whisper-1"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "listVoiceConsents",
        method: "GET",
        path: "/v1/audio/voice_consents",
        published_path: "/v1/audio/voice_consents",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "createVoiceConsent",
        method: "POST",
        path: "/v1/audio/voice_consents",
        published_path: "/v1/audio/voice_consents",
        body: r#"{"voice_id":"voice-probe-001"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "deleteVoiceConsent",
        method: "DELETE",
        path: "/v1/audio/voice_consents/vc-probe-001",
        published_path: "/v1/audio/voice_consents/{consent_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "retrieveVoiceConsent",
        method: "GET",
        path: "/v1/audio/voice_consents/vc-probe-001",
        published_path: "/v1/audio/voice_consents/{consent_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "updateVoiceConsent",
        method: "POST",
        path: "/v1/audio/voice_consents/vc-probe-001",
        published_path: "/v1/audio/voice_consents/{consent_id}",
        body: r#"{"voice_id":"voice-probe-001"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "listVoices",
        method: "GET",
        path: "/v1/audio/voices",
        published_path: "/v1/audio/voices",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "createVoice",
        method: "POST",
        path: "/v1/audio/voices",
        published_path: "/v1/audio/voices",
        body: r#"{"name":"probe-voice"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "retrieveVoice",
        method: "GET",
        path: "/v1/audio/voices/21m00Tcm4TlvDq8ikWAM",
        published_path: "/v1/audio/voices/{voice_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "listBatches",
        method: "GET",
        path: "/v1/batches",
        published_path: "/v1/batches",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "openai.batches",
        method: "POST",
        path: "/v1/batches",
        published_path: "/v1/batches",
        body: r#"{"input_file_id":"file-probe-001","endpoint":"/v1/chat/completions","completion_window":"24h"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "retrieveBatch",
        method: "GET",
        path: "/v1/batches/batch-probe-001",
        published_path: "/v1/batches/{batch_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "cancelBatch",
        method: "POST",
        path: "/v1/batches/batch-probe-001/cancel",
        published_path: "/v1/batches/{batch_id}/cancel",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "listChatCompletions",
        method: "GET",
        path: "/v1/chat/completions",
        published_path: "/v1/chat/completions",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "deleteChatCompletion",
        method: "DELETE",
        path: "/v1/chat/completions/cmpl-probe-001",
        published_path: "/v1/chat/completions/{completion_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "retrieveChatCompletion",
        method: "GET",
        path: "/v1/chat/completions/cmpl-probe-001",
        published_path: "/v1/chat/completions/{completion_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "modifyChatCompletion",
        method: "POST",
        path: "/v1/chat/completions/cmpl-probe-001",
        published_path: "/v1/chat/completions/{completion_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "listChatCompletionMessages",
        method: "GET",
        path: "/v1/chat/completions/cmpl-probe-001/messages",
        published_path: "/v1/chat/completions/{completion_id}/messages",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "openai.containers",
        method: "GET",
        path: "/v1/containers",
        published_path: "/v1/containers",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "createContainer",
        method: "POST",
        path: "/v1/containers",
        published_path: "/v1/containers",
        body: r#"{"name":"probe-container"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "deleteContainer",
        method: "DELETE",
        path: "/v1/containers/cntr-probe-001",
        published_path: "/v1/containers/{container_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "retrieveContainer",
        method: "GET",
        path: "/v1/containers/cntr-probe-001",
        published_path: "/v1/containers/{container_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "listContainerFiles",
        method: "GET",
        path: "/v1/containers/cntr-probe-001/files",
        published_path: "/v1/containers/{container_id}/files",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "createContainerFile",
        method: "POST",
        path: "/v1/containers/cntr-probe-001/files",
        published_path: "/v1/containers/{container_id}/files",
        body: r#"{"file_id":"file-probe-001"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "deleteContainerFile",
        method: "DELETE",
        path: "/v1/containers/cntr-probe-001/files/file-probe-001",
        published_path: "/v1/containers/{container_id}/files/{file_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "retrieveContainerFile",
        method: "GET",
        path: "/v1/containers/cntr-probe-001/files/file-probe-001",
        published_path: "/v1/containers/{container_id}/files/{file_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "retrieveContainerFileContent",
        method: "GET",
        path: "/v1/containers/cntr-probe-001/files/file-probe-001/content",
        published_path: "/v1/containers/{container_id}/files/{file_id}/content",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "listConversations",
        method: "GET",
        path: "/v1/conversations",
        published_path: "/v1/conversations",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "deleteConversation",
        method: "DELETE",
        path: "/v1/conversations/conv-probe-001",
        published_path: "/v1/conversations/{conversation_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "retrieveConversation",
        method: "GET",
        path: "/v1/conversations/conv-probe-001",
        published_path: "/v1/conversations/{conversation_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "modifyConversation",
        method: "POST",
        path: "/v1/conversations/conv-probe-001",
        published_path: "/v1/conversations/{conversation_id}",
        body: r#"{"metadata":{"probe":"1"}}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "listConversationItems",
        method: "GET",
        path: "/v1/conversations/conv-probe-001/items",
        published_path: "/v1/conversations/{conversation_id}/items",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "createConversationItem",
        method: "POST",
        path: "/v1/conversations/conv-probe-001/items",
        published_path: "/v1/conversations/{conversation_id}/items",
        body: r#"{"items":[{"type":"message","role":"user","content":[{"type":"input_text","text":"hi"}]}]}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "deleteConversationItem",
        method: "DELETE",
        path: "/v1/conversations/conv-probe-001/items/item-probe-001",
        published_path: "/v1/conversations/{conversation_id}/items/{item_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "retrieveConversationItem",
        method: "GET",
        path: "/v1/conversations/conv-probe-001/items/item-probe-001",
        published_path: "/v1/conversations/{conversation_id}/items/{item_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "openai.files",
        method: "GET",
        path: "/v1/files",
        published_path: "/v1/files",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "uploadFile",
        method: "POST",
        path: "/v1/files",
        published_path: "/v1/files",
        body: r#"{"purpose":"assistants","filename":"probe.txt"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "deleteFile",
        method: "DELETE",
        path: "/v1/files/file-probe-001",
        published_path: "/v1/files/{file_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "retrieveFile",
        method: "GET",
        path: "/v1/files/file-probe-001",
        published_path: "/v1/files/{file_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "retrieveFileContent",
        method: "GET",
        path: "/v1/files/file-probe-001/content",
        published_path: "/v1/files/{file_id}/content",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "openai.images.variations",
        method: "POST",
        path: "/v1/images/variations",
        published_path: "/v1/images/variations",
        body: r#"{"model":"gpt-image-2","image":"aGVsbG8="}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "openai.models",
        method: "GET",
        path: "/v1/models",
        published_path: "/v1/models",
        body: r#"{}"#,
        expectation: ApiExpectation::Synthetic,
    },
    ApiCase {
        api_code: "retrieveModel",
        method: "GET",
        path: "/v1/models/gemini-3.5-flash",
        published_path: "/v1/models/{model}",
        body: r#"{}"#,
        expectation: ApiExpectation::Synthetic,
    },
    ApiCase {
        api_code: "openai.moderations",
        method: "POST",
        path: "/v1/moderations",
        published_path: "/v1/moderations",
        body: r#"{"input":"hi"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "createRealtimeCall",
        method: "POST",
        path: "/v1/realtime/calls",
        published_path: "/v1/realtime/calls",
        body: r#"{"model":"gpt-realtime-2.1"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "acceptRealtimeCall",
        method: "POST",
        path: "/v1/realtime/calls/call-probe-001/accept",
        published_path: "/v1/realtime/calls/{call_id}/accept",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "hangupRealtimeCall",
        method: "POST",
        path: "/v1/realtime/calls/call-probe-001/hangup",
        published_path: "/v1/realtime/calls/{call_id}/hangup",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "referRealtimeCall",
        method: "POST",
        path: "/v1/realtime/calls/call-probe-001/refer",
        published_path: "/v1/realtime/calls/{call_id}/refer",
        body: r#"{"target":"sip:probe@example.test"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "rejectRealtimeCall",
        method: "POST",
        path: "/v1/realtime/calls/call-probe-001/reject",
        published_path: "/v1/realtime/calls/{call_id}/reject",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "createRealtimeClientSecret",
        method: "POST",
        path: "/v1/realtime/client_secrets",
        published_path: "/v1/realtime/client_secrets",
        body: r#"{"session":{"type":"realtime"}}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "createRealtimeTranscriptionSession",
        method: "POST",
        path: "/v1/realtime/transcription_sessions",
        published_path: "/v1/realtime/transcription_sessions",
        body: r#"{"model":"gpt-realtime-2.1"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "createRealtimeTranslationSession",
        method: "POST",
        path: "/v1/realtime/translations",
        published_path: "/v1/realtime/translations",
        body: r#"{"model":"gpt-realtime-2.1"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "compactResponse",
        method: "POST",
        path: "/v1/responses/compact",
        published_path: "/v1/responses/compact",
        body: r#"{"model":"gpt-6-astra"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "countResponseInputTokens",
        method: "POST",
        path: "/v1/responses/input_tokens",
        published_path: "/v1/responses/input_tokens",
        body: r#"{"model":"gpt-6-astra","input":"hi"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "deleteResponse",
        method: "DELETE",
        path: "/v1/responses/resp-probe-001",
        published_path: "/v1/responses/{response_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "retrieveResponse",
        method: "GET",
        path: "/v1/responses/resp-probe-001",
        published_path: "/v1/responses/{response_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "cancelResponse",
        method: "POST",
        path: "/v1/responses/resp-probe-001/cancel",
        published_path: "/v1/responses/{response_id}/cancel",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "listResponseInputItems",
        method: "GET",
        path: "/v1/responses/resp-probe-001/input_items",
        published_path: "/v1/responses/{response_id}/input_items",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "createThreadAndRun",
        method: "POST",
        path: "/v1/threads/runs",
        published_path: "/v1/threads/runs",
        body: r#"{"assistant_id":"asst-probe-001","model":"gpt-6-astra"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "deleteThread",
        method: "DELETE",
        path: "/v1/threads/thread-probe-001",
        published_path: "/v1/threads/{thread_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "retrieveThread",
        method: "GET",
        path: "/v1/threads/thread-probe-001",
        published_path: "/v1/threads/{thread_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "modifyThread",
        method: "POST",
        path: "/v1/threads/thread-probe-001",
        published_path: "/v1/threads/{thread_id}",
        body: r#"{"metadata":{"probe":"1"}}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "listMessages",
        method: "GET",
        path: "/v1/threads/thread-probe-001/messages",
        published_path: "/v1/threads/{thread_id}/messages",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "createMessage",
        method: "POST",
        path: "/v1/threads/thread-probe-001/messages",
        published_path: "/v1/threads/{thread_id}/messages",
        body: r#"{"role":"user","content":"hi"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "deleteMessage",
        method: "DELETE",
        path: "/v1/threads/thread-probe-001/messages/msg-probe-001",
        published_path: "/v1/threads/{thread_id}/messages/{message_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "retrieveMessage",
        method: "GET",
        path: "/v1/threads/thread-probe-001/messages/msg-probe-001",
        published_path: "/v1/threads/{thread_id}/messages/{message_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "modifyMessage",
        method: "POST",
        path: "/v1/threads/thread-probe-001/messages/msg-probe-001",
        published_path: "/v1/threads/{thread_id}/messages/{message_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "listRuns",
        method: "GET",
        path: "/v1/threads/thread-probe-001/runs",
        published_path: "/v1/threads/{thread_id}/runs",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "createRun",
        method: "POST",
        path: "/v1/threads/thread-probe-001/runs",
        published_path: "/v1/threads/{thread_id}/runs",
        body: r#"{"assistant_id":"asst-probe-001","model":"gpt-6-astra"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "retrieveRun",
        method: "GET",
        path: "/v1/threads/thread-probe-001/runs/run-probe-001",
        published_path: "/v1/threads/{thread_id}/runs/{run_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "modifyRun",
        method: "POST",
        path: "/v1/threads/thread-probe-001/runs/run-probe-001",
        published_path: "/v1/threads/{thread_id}/runs/{run_id}",
        body: r#"{"assistant_id":"asst-probe-001","model":"gpt-6-astra"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "cancelRun",
        method: "POST",
        path: "/v1/threads/thread-probe-001/runs/run-probe-001/cancel",
        published_path: "/v1/threads/{thread_id}/runs/{run_id}/cancel",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "listRunSteps",
        method: "GET",
        path: "/v1/threads/thread-probe-001/runs/run-probe-001/steps",
        published_path: "/v1/threads/{thread_id}/runs/{run_id}/steps",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "retrieveRunStep",
        method: "GET",
        path: "/v1/threads/thread-probe-001/runs/run-probe-001/steps/step-probe-001",
        published_path: "/v1/threads/{thread_id}/runs/{run_id}/steps/{step_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "submitRunToolOutputs",
        method: "POST",
        path: "/v1/threads/thread-probe-001/runs/run-probe-001/submit_tool_outputs",
        published_path: "/v1/threads/{thread_id}/runs/{run_id}/submit_tool_outputs",
        body: r#"{"tool_outputs":[{"tool_call_id":"call-probe-001","output":"ok"}]}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "openai.uploads",
        method: "POST",
        path: "/v1/uploads",
        published_path: "/v1/uploads",
        body: r#"{"purpose":"assistants","bytes":16,"filename":"probe.txt","mime_type":"text/plain"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "cancelUpload",
        method: "POST",
        path: "/v1/uploads/upload-probe-001/cancel",
        published_path: "/v1/uploads/{upload_id}/cancel",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "completeUpload",
        method: "POST",
        path: "/v1/uploads/upload-probe-001/complete",
        published_path: "/v1/uploads/{upload_id}/complete",
        body: r#"{"part_ids":["part-probe-001"]}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "addUploadPartExplicit",
        method: "POST",
        path: "/v1/uploads/upload-probe-001/parts",
        published_path: "/v1/uploads/{upload_id}/parts",
        body: r#"{"data":"aGVsbG8="}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "listVectorStores",
        method: "GET",
        path: "/v1/vector_stores",
        published_path: "/v1/vector_stores",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "openai.vector_stores",
        method: "POST",
        path: "/v1/vector_stores",
        published_path: "/v1/vector_stores",
        body: r#"{"name":"probe-store"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "deleteVectorStore",
        method: "DELETE",
        path: "/v1/vector_stores/vs-probe-001",
        published_path: "/v1/vector_stores/{vector_store_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "retrieveVectorStore",
        method: "GET",
        path: "/v1/vector_stores/vs-probe-001",
        published_path: "/v1/vector_stores/{vector_store_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "modifyVectorStore",
        method: "POST",
        path: "/v1/vector_stores/vs-probe-001",
        published_path: "/v1/vector_stores/{vector_store_id}",
        body: r#"{"name":"probe-store"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "createVectorStoreFileBatch",
        method: "POST",
        path: "/v1/vector_stores/vs-probe-001/file_batches",
        published_path: "/v1/vector_stores/{vector_store_id}/file_batches",
        body: r#"{"file_ids":["file-probe-001"]}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "retrieveVectorStoreFileBatch",
        method: "GET",
        path: "/v1/vector_stores/vs-probe-001/file_batches/batch-probe-001",
        published_path: "/v1/vector_stores/{vector_store_id}/file_batches/{batch_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "cancelVectorStoreFileBatch",
        method: "POST",
        path: "/v1/vector_stores/vs-probe-001/file_batches/batch-probe-001/cancel",
        published_path: "/v1/vector_stores/{vector_store_id}/file_batches/{batch_id}/cancel",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "listVectorStoreFileBatchFiles",
        method: "GET",
        path: "/v1/vector_stores/vs-probe-001/file_batches/batch-probe-001/files",
        published_path: "/v1/vector_stores/{vector_store_id}/file_batches/{batch_id}/files",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "listVectorStoreFiles",
        method: "GET",
        path: "/v1/vector_stores/vs-probe-001/files",
        published_path: "/v1/vector_stores/{vector_store_id}/files",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "createVectorStoreFile",
        method: "POST",
        path: "/v1/vector_stores/vs-probe-001/files",
        published_path: "/v1/vector_stores/{vector_store_id}/files",
        body: r#"{"file_id":"file-probe-001"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "deleteVectorStoreFile",
        method: "DELETE",
        path: "/v1/vector_stores/vs-probe-001/files/file-probe-001",
        published_path: "/v1/vector_stores/{vector_store_id}/files/{file_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "retrieveVectorStoreFile",
        method: "GET",
        path: "/v1/vector_stores/vs-probe-001/files/file-probe-001",
        published_path: "/v1/vector_stores/{vector_store_id}/files/{file_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "modifyVectorStoreFile",
        method: "POST",
        path: "/v1/vector_stores/vs-probe-001/files/file-probe-001",
        published_path: "/v1/vector_stores/{vector_store_id}/files/{file_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "searchVectorStore",
        method: "POST",
        path: "/v1/vector_stores/vs-probe-001/search",
        published_path: "/v1/vector_stores/{vector_store_id}/search",
        body: r#"{"query":"hi"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "listVideos",
        method: "GET",
        path: "/v1/videos",
        published_path: "/v1/videos",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "createVideoCharacter",
        method: "POST",
        path: "/v1/videos/characters",
        published_path: "/v1/videos/characters",
        body: r#"{"model":"sora-2"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "retrieveVideoCharacter",
        method: "GET",
        path: "/v1/videos/characters/char-probe-001",
        published_path: "/v1/videos/characters/{character_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "editVideo",
        method: "POST",
        path: "/v1/videos/edits",
        published_path: "/v1/videos/edits",
        body: r#"{"model":"sora-2","prompt":"a paper plane"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "extendVideo",
        method: "POST",
        path: "/v1/videos/extensions",
        published_path: "/v1/videos/extensions",
        body: r#"{"model":"sora-2","prompt":"a paper plane"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "deleteVideo",
        method: "DELETE",
        path: "/v1/videos/video-probe-001",
        published_path: "/v1/videos/{video_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "retrieveVideo",
        method: "GET",
        path: "/v1/videos/video-probe-001",
        published_path: "/v1/videos/{video_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "retrieveVideoContent",
        method: "GET",
        path: "/v1/videos/video-probe-001/content",
        published_path: "/v1/videos/{video_id}/content",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "remixVideo",
        method: "POST",
        path: "/v1/videos/video-probe-001/remix",
        published_path: "/v1/videos/{video_id}/remix",
        body: r#"{"model":"sora-2","prompt":"a paper plane"}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "vidu.video_task_query",
        method: "GET",
        path: "/vidu/ent/v2/tasks/task-probe-001/creations",
        published_path: "/vidu/ent/v2/tasks/{task_id}/creations",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
    ApiCase {
        api_code: "volcengineRetrieveContentGenerationTask",
        method: "GET",
        path: "/volcengine/api/v3/contents/generations/tasks/task-probe-001",
        published_path: "/volcengine/api/v3/contents/generations/tasks/{task_id}",
        body: r#"{}"#,
        expectation: ApiExpectation::Routable,
    },
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
        panic!(
            "read route manifest {} failed: {error}",
            manifest_path.display()
        )
    });

    // Pair each `HttpMethod::<Verb>` with the path literal that follows it, and
    // key the result by `"<VERB> <path>"` — the surface is not POST-only (59
    // `GET` and 17 `DELETE` operations are published beside the 91 `POST` ones),
    // so a POST-only scan could not see a `GET`-only route at all.
    //
    // The generated file spells a route two ways — `HttpRoute::<ctor>(HttpMethod
    // ::Post, "<path>", ...)` on one line, or with the arguments wrapped across
    // lines — so the scan looks at the remainder of the current line first and
    // only then at the next few lines. Reading only the following lines dropped
    // the single-line form and reported `/v1/videos` as unpublished.
    const HTTP_METHODS: &[(&str, &str)] = &[
        ("HttpMethod::Get", "GET"),
        ("HttpMethod::Post", "POST"),
        ("HttpMethod::Put", "PUT"),
        ("HttpMethod::Patch", "PATCH"),
        ("HttpMethod::Delete", "DELETE"),
    ];
    let mut published: std::collections::BTreeSet<String> = std::collections::BTreeSet::new();
    let lines: Vec<&str> = source.lines().collect();
    for (index, line) in lines.iter().enumerate() {
        let Some((method_at, verb, marker_len)) = HTTP_METHODS
            .iter()
            .find_map(|(marker, verb)| line.find(marker).map(|at| (at, *verb, marker.len())))
        else {
            continue;
        };
        let after_method = &line[method_at + marker_len..];
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
            published.insert(format!("{} {}", verb, normalise_path(path)));
        }
    }
    assert!(
        published.len() > 150,
        "only {} routes parsed from the manifest; the parser or the generated layout changed",
        published.len()
    );

    let mut missing: Vec<String> = Vec::new();
    for case in API_CASES {
        // Match against the *published* template, not the concrete dialled
        // path: routes with a path parameter (`/google/v1beta/models/{model}
        // :generateContent`) are published with the placeholder, and comparing
        // a substituted path against it would report every such route as
        // unpublished.
        let operation = format!("{} {}", case.method, normalise_path(case.manifest_path()));
        if published.contains(&operation) {
            continue;
        }
        missing.push(format!(
            "{} ({} -> {operation})",
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
/// Replaces a concrete path parameter with `{}` so a probe spelling and a
/// manifest template compare equal.
///
/// A case that dials a substituted path declares its template in
/// `ApiCase::published_path`; this function then collapses both spellings to the
/// same `{}` form, so the comparison never depends on which concrete value the
/// probe happened to use.
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
    let mut catalogued_unrouted: Vec<String> = Vec::new();
    let catalogued_unrouted_scopes = load_catalogued_unrouted_scopes();

    for case in API_CASES {
        let send = || async {
            let response = router
                .clone()
                .oneshot(
                    client
                        .apply(
                            Request::builder()
                                .method(case.method)
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
            (status, text)
        };

        let (mut status, mut text) = send().await;

        // Circuit-breaker carry-over from earlier cases sharing the same vendor
        // account: wait out the open window and re-probe before judging.
        let mut breaker_retries = 0u32;
        while text.contains(BREAKER_OPEN_MARKER) && breaker_retries < BREAKER_MAX_RETRIES {
            breaker_retries += 1;
            eprintln!(
                "  wait [{}] POST {} hit an open circuit breaker; retry \
                 {breaker_retries}/{BREAKER_MAX_RETRIES} after the 30s open window",
                case.api_code, case.path
            );
            tokio::time::sleep(BREAKER_RETRY_COOLDOWN).await;
            let (retry_status, retry_text) = send().await;
            status = retry_status;
            text = retry_text;
        }

        let excerpt = text.chars().take(600).collect::<String>();
        let label = format!("[{}] POST {}", case.api_code, case.path);

        // A 404 on a published path means the assembly never mounted the route:
        // the API exists in the catalog but has no inbound surface, which is the
        // first link of the chain and a hard gap.
        if status == axum::http::StatusCode::NOT_FOUND {
            unrouted.push(format!("{label} => HTTP {status}: {excerpt}"));
            continue;
        }

        // A catalogued-unrouted namespace must fail closed with exactly the
        // documented message naming its api scope. Anything else — 404, a
        // misrouted call, a different error — is a defect, not the exemption.
        if let Some(scope) = catalogued_unrouted_scopes.get(case.api_code) {
            let fail_closed = text.contains("no upstream account routes are configured")
                && text.contains(&format!("on api scope {scope}"));
            if fail_closed {
                catalogued_unrouted.push(format!(
                    "{label} => HTTP {status} (declared unrouted, fails closed on api scope \
                     {scope})"
                ));
                continue;
            }
        }

        if GATEWAY_GAP_MARKERS
            .iter()
            .any(|marker| text.contains(marker))
        {
            gaps.push(format!("{label} => HTTP {status}: {excerpt}"));
        } else if NETWORK_UNREACHABLE_MARKERS
            .iter()
            .any(|marker| text.contains(marker))
        {
            unreachable.push(format!("{label} => HTTP {status}: {excerpt}"));
        } else {
            reached.push(format!("{label} => HTTP {status}: {excerpt}"));
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
    eprintln!("=== 已编目豁免：声明无路由且精确失败关闭 ===");
    for line in &catalogued_unrouted {
        eprintln!("  EXEMPT {line}");
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
        "\nsummary: reached={} unrouted={} exempt={} network={} gaps={} of {} case(s)",
        reached.len(),
        unrouted.len(),
        catalogued_unrouted.len(),
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
