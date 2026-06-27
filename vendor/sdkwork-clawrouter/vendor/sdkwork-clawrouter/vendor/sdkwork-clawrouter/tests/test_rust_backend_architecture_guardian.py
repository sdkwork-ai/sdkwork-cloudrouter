import tempfile
import textwrap
import unittest
from pathlib import Path

from tools.rust_backend_architecture_guardian import RustBackendArchitectureGuardian


class RustBackendArchitectureGuardianTest(unittest.TestCase):
    def write_valid_workspace(self, root: Path) -> None:
        root.joinpath("Cargo.toml").write_text(
            textwrap.dedent(
                """
                [workspace]
                members = [
                    "crates/sdkwork-claw-contract",
                    "crates/sdkwork-claw-config",
                    "crates/sdkwork-claw-core",
                    "crates/sdkwork-claw-security",
                    "crates/sdkwork-claw-http",
                    "crates/sdkwork-claw-observability",
                    "crates/sdkwork-clawrouter-cloud-gateway",
                    "services/sdkwork-clawrouter-admin-api-server",
                    "services/sdkwork-clawrouter-app-api-server",
                    "services/sdkwork-clawrouter-router-service",
                ]
                resolver = "2"

                [workspace.dependencies]
                axum = "0.8"
                tokio = "1"
                tower = "0.5"
                tower-http = "0.6"
                tracing = "0.1"
                serde = "1"
                serde_json = "1"
                hmac = "0.12"
                hex = "0.4"
                sha2 = "0.10"
                bytes = "1"
                http-body-util = "0.1"
                hyper = "1"
                hyper-util = "0.1"
                hyper-rustls = "0.27"
                sqlx = "0.8"
                anyhow = "1"
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )
        for member in (
            "crates/sdkwork-claw-contract",
            "crates/sdkwork-claw-config",
            "crates/sdkwork-claw-core",
            "crates/sdkwork-claw-security",
            "crates/sdkwork-claw-http",
            "crates/sdkwork-claw-observability",
            "crates/sdkwork-clawrouter-cloud-gateway",
            "services/sdkwork-clawrouter-admin-api-server",
            "services/sdkwork-clawrouter-app-api-server",
            "services/sdkwork-clawrouter-router-service",
        ):
            root.joinpath(member, "Cargo.toml").parent.mkdir(parents=True, exist_ok=True)
            root.joinpath(member, "Cargo.toml").write_text("[package]\nname = \"demo\"\n", encoding="utf-8")

        module_rules = {
            "crates/sdkwork-claw-contract": ("api_surface", "manifest", "operation", "path_pattern"),
            "crates/sdkwork-claw-config": (
                "api_key",
                "database",
                "deployment",
                "provider_relay",
                "provider_secret_map",
                "runtime",
            ),
            "crates/sdkwork-claw-core": ("health",),
            "crates/sdkwork-claw-security": ("headers", "redaction"),
            "crates/sdkwork-claw-http": ("auth", "contract_routes", "error", "health", "headers", "router"),
            "crates/sdkwork-claw-observability": ("tracing_setup",),
            "crates/sdkwork-clawrouter-cloud-gateway": ("runtime",),
            "services/sdkwork-clawrouter-router-service": ("api", "application", "domain", "identity", "infrastructure", "ports"),
        }
        for member, modules in module_rules.items():
            src = root / member / "src"
            src.mkdir(parents=True, exist_ok=True)
            lib_lines = [f"pub mod {module};" for module in modules]
            src.joinpath("lib.rs").write_text("\n".join(lib_lines) + "\n", encoding="utf-8")
            for module in modules:
                src.joinpath(f"{module}.rs").write_text("// module\n", encoding="utf-8")

        product_src = root / "services" / "sdkwork-clawrouter-router-service" / "src"
        product_src.joinpath("infrastructure.rs").unlink()
        product_src.joinpath("ports.rs").unlink()
        product_ports = product_src / "ports"
        product_ports.mkdir(parents=True, exist_ok=True)
        product_ports.joinpath("mod.rs").write_text(
            "mod chat_completion_relay;\nmod chat_completion_stream_relay;\nmod embeddings_relay;\nmod gateway_usage_recorder;\nmod pricing_catalog;\nmod provider_secret_resolver;\nmod responses_relay;\nmod usage_settlement_store;\n",
            encoding="utf-8",
        )
        product_ports.joinpath("chat_completion_relay.rs").write_text("// ChatCompletionRelay port\n", encoding="utf-8")
        product_ports.joinpath("chat_completion_stream_relay.rs").write_text("// ChatCompletionStreamRelay port\n", encoding="utf-8")
        product_ports.joinpath("embeddings_relay.rs").write_text("// EmbeddingsRelay port\n", encoding="utf-8")
        product_ports.joinpath("gateway_usage_recorder.rs").write_text("// GatewayUsageRecorder GatewayUsageRecordCommand port\n", encoding="utf-8")
        product_ports.joinpath("pricing_catalog.rs").write_text("// PricingCatalog port\n", encoding="utf-8")
        product_ports.joinpath("provider_secret_resolver.rs").write_text("// ProviderSecretResolver port\n", encoding="utf-8")
        product_ports.joinpath("responses_relay.rs").write_text("// ResponsesRelay port\n", encoding="utf-8")
        product_ports.joinpath("usage_settlement_store.rs").write_text("// UsageSettlementStore UsageSettlementCommand UsageSettlementOutcome port\n", encoding="utf-8")
        product_infrastructure = product_src / "infrastructure"
        product_infrastructure.mkdir(parents=True, exist_ok=True)
        product_infrastructure.joinpath("mod.rs").write_text("pub mod provider;\npub mod sql;\n", encoding="utf-8")
        product_provider = product_infrastructure / "provider"
        product_provider.mkdir(parents=True, exist_ok=True)
        product_provider.joinpath("mod.rs").write_text(
            "mod openai_compatible_relay;\nmod provider_secret_map_resolver;\n",
            encoding="utf-8",
        )
        product_provider.joinpath("openai_compatible_relay.rs").write_text(
            "// OpenAiCompatibleChatCompletionRelay SecretRefOpenAiCompatibleChatCompletionRelay OpenAiCompatibleChatCompletionStreamRelay SecretRefOpenAiCompatibleChatCompletionStreamRelay OpenAiCompatibleResponsesRelay SecretRefOpenAiCompatibleResponsesRelay OpenAiCompatibleEmbeddingsRelay SecretRefOpenAiCompatibleEmbeddingsRelay UpstreamProviderEndpoint hyper\n",
            encoding="utf-8",
        )
        product_provider.joinpath("provider_secret_map_resolver.rs").write_text(
            "// ProviderSecretMapResolver resolves ProviderSecretMapConfig\n",
            encoding="utf-8",
        )
        product_sql = product_infrastructure / "sql"
        product_sql.mkdir(parents=True, exist_ok=True)
        product_sql.joinpath("mod.rs").write_text(
            "pub mod catalog;\npub mod postgres;\nmod queries;\npub mod rows;\npub mod sqlite;\n",
            encoding="utf-8",
        )
        product_sql.joinpath("catalog.rs").write_text("// sql catalog snapshot\n", encoding="utf-8")
        product_sql.joinpath("rows.rs").write_text("// sql row mappers\n", encoding="utf-8")
        product_queries = product_sql / "queries"
        product_queries.mkdir(parents=True, exist_ok=True)
        product_queries.joinpath("mod.rs").write_text("mod lookup;\nmod snapshot;\n", encoding="utf-8")
        product_queries.joinpath("lookup.rs").write_text("// request lookup query text builders\n", encoding="utf-8")
        product_queries.joinpath("snapshot.rs").write_text("// snapshot load query text builders\n", encoding="utf-8")
        product_sqlite = product_sql / "sqlite"
        product_sqlite.mkdir(parents=True, exist_ok=True)
        product_sqlite.joinpath("mod.rs").write_text("mod error;\nmod gateway_usage_recorder;\nmod loader;\nmod queries;\nmod row_mapping;\nmod usage_settlement_store;\n", encoding="utf-8")
        product_sqlite.joinpath("error.rs").write_text("// sqlite load errors\n", encoding="utf-8")
        product_sqlite.joinpath("gateway_usage_recorder.rs").write_text("// SqliteGatewayUsageRecorder ai_request_trace ai_usage_fact\n", encoding="utf-8")
        product_sqlite.joinpath("loader.rs").write_text("// sqlite catalog loader\n", encoding="utf-8")
        product_sqlite.joinpath("queries.rs").write_text("// sqlite catalog load queries\n", encoding="utf-8")
        product_sqlite.joinpath("row_mapping.rs").write_text("// sqlite row mapping\n", encoding="utf-8")
        product_sqlite.joinpath("usage_settlement_store.rs").write_text("// SqliteUsageSettlementStore commerce_usage_settlement plus_account_history settlement_status INSUFFICIENT_POINTS\n", encoding="utf-8")
        product_postgres = product_sql / "postgres"
        product_postgres.mkdir(parents=True, exist_ok=True)
        product_postgres.joinpath("mod.rs").write_text("mod error;\nmod gateway_usage_recorder;\nmod loader;\nmod row_mapping;\nmod usage_settlement_store;\n", encoding="utf-8")
        product_postgres.joinpath("error.rs").write_text("// postgres load errors\n", encoding="utf-8")
        product_postgres.joinpath("gateway_usage_recorder.rs").write_text("// PostgresGatewayUsageRecorder ai_request_trace ai_usage_fact\n", encoding="utf-8")
        product_postgres.joinpath("loader.rs").write_text("// postgres catalog loader\n", encoding="utf-8")
        product_postgres.joinpath("row_mapping.rs").write_text("// postgres row mapping\n", encoding="utf-8")
        product_postgres.joinpath("usage_settlement_store.rs").write_text("// PostgresUsageSettlementStore commerce_usage_settlement plus_account_history settlement_status INSUFFICIENT_POINTS\n", encoding="utf-8")

        for service in ("sdkwork-clawrouter-cloud-gateway", "sdkwork-clawrouter-admin-api-server", "sdkwork-clawrouter-app-api-server"):
            service_root = root / "services" / service
            service_root.joinpath("Cargo.toml").write_text(
                textwrap.dedent(
                    """
                    [package]
                    name = "service"

                    [dependencies]
                    sdkwork-claw-config = { path = "../../crates/sdkwork-claw-config" }
                    sdkwork-claw-http = { path = "../../crates/sdkwork-claw-http" }
                    sdkwork-claw-observability = { path = "../../crates/sdkwork-claw-observability" }
                    axum.workspace = true
                    tokio.workspace = true
                    anyhow.workspace = true
                    """
                ).strip()
                + "\n",
                encoding="utf-8",
            )
            service_root.joinpath("src").mkdir(parents=True, exist_ok=True)
            lib_text = "pub fn router() { sdkwork_claw_http::service_router(\"service\"); }\n"
            if service == "sdkwork-clawrouter-cloud-gateway":
                lib_text = "pub mod runtime;\npub fn router() { sdkwork_claw_http::service_router(\"service\"); }\n"
            service_root.joinpath("src", "lib.rs").write_text(lib_text, encoding="utf-8")

        doc = root / "docs" / "29-rust-backend-module-standard.md"
        doc.parent.mkdir(parents=True, exist_ok=True)
        doc.write_text(
            textwrap.dedent(
                """
                # Rust Backend Module Standard

                Rust-first backend module boundary uses sdkwork-claw-security and sdkwork-claw-http.
                Hexagonal architecture keeps api, application, domain, ports, adapters, infrastructure, and bootstrap separated.
                App surface /app/v3/api, backend surface /backend/v3/api, and runtime surface /v1 remain separate.
                High performance requires axum, tokio, tower, tower-http, connection pool, streaming, backpressure, timeout, request id, and tracing.
                RuntimeConfig loads SDKWORK_CLAW_GATEWAY_BIND, SDKWORK_CLAW_APP_API_BIND, SDKWORK_CLAW_ADMIN_API_BIND, and validates each bind value as a valid socket address.
                DatabaseConfig parses SDKWORK_CLAW_DATABASE_URL for typed deployment database wiring.
                DatabaseHealth exposes configured, engine, and maxConnections only, and must not expose database URLs.
                ApiKeyIdentity is parsed only in sdkwork-claw-http auth from Authorization: Bearer, x-api-key, x-goog-api-key, and query key inputs; business handlers must not parse raw auth headers.
                ApiKeySecurityConfig loads SDKWORK_CLAW_API_KEY_PEPPER and HmacSha256ApiKeySecretHasher implements ApiKeySecretHasher for HMAC plus pepper hashing and iam_gateway_api_key.key_hash lookup with no plaintext API key storage.
                Security requires redaction, sensitive headers, authorization, idempotency, audit log, rate limit, CORS, and security headers.
                The manifest-driven contract route returns 501 for declared but unfinished operations with no fake success responses.
                Package rules keep contract, config, core, security, http, observability, gateway, app-api, admin-api, and product boundaries clear.
                Product implementation keeps domain, application, ports, and infrastructure as first-class submodules.
                PricingCatalog powers ModelCatalogQueryService, PriceAvailability, and lowest upstream cost pricing views.
                SQL PricingCatalog boundary uses infrastructure/sql catalog, queries, rows, sqlite, and postgres modules, SQLite loader, PostgreSQL loader, immutable snapshot, Schema Registry table names, decimal strings, generated enums, and no ai_pricing_group.
                AdminModelRoute calls ModelCatalogQueryService and must not rebuild pricing logic in HTTP handlers.
                OpenAIModelsRoute serves /v1/models through the gateway runtime module, uses PricingCatalog snapshots, and returns OpenAI-compatible model list envelopes only after API key authentication.
                OpenAIChatCompletionsRoute serves /v1/chat/completions through the gateway runtime module, authenticates the API key, validates model routing and pricing, uses ChatCompletionRelay for non-stream execution, uses ChatCompletionStreamRelay with ChatCompletionStreamRelayResponse for SSE text/event-stream pass-through, and returns provider_relay_not_configured or streaming_relay_not_configured only when the matching relay is absent.
                Non-stream OpenAIChatCompletionsRoute provider success must build GatewayUsageRecordCommand from provider usage and persist through GatewayUsageRecorder, with SqliteGatewayUsageRecorder and PostgresGatewayUsageRecorder writing ai_request_trace and ai_usage_fact; missing usage returns provider_usage_record_failed. The streaming usage boundary must force upstream stream_options.include_usage through OpenAiCompatibleChatCompletionStreamRelay and SecretRefOpenAiCompatibleChatCompletionStreamRelay, then StreamingUsageRecordingBody must persist the provider SSE usage event before stream completion.
                UsageSettlementWorker owns the background worker boundary and UsageSettlementWorkerConfig controls schema readiness gated settlement activation. SDKWORK_CLAW_USAGE_SETTLEMENT_WORKER_ENABLED, SDKWORK_CLAW_USAGE_SETTLEMENT_BATCH_SIZE, and SDKWORK_CLAW_USAGE_SETTLEMENT_INTERVAL_MILLIS configure the worker. UsageSettlementStore consumes UsageSettlementCommand and returns UsageSettlementOutcome from a worker boundary after ai_usage_fact is written. SqliteUsageSettlementStore and PostgresUsageSettlementStore must settle pending or failed settlement_status rows into commerce_usage_settlement and plus_account_history idempotently, update settlement_id, use FOR UPDATE SKIP LOCKED on Postgres, and insufficient balances must use INSUFFICIENT_POINTS without double-debiting.
                OpenAIResponsesRoute serves /v1/responses through the gateway runtime module, authenticates the API key, validates responses capability, provider route, and LlmInputToken pricing, returns responses_relay_not_configured when relay is absent, and uses ResponsesRelay with ResponsesRelayRequest for non-stream provider execution.
                OpenAiCompatibleResponsesRelay and SecretRefOpenAiCompatibleResponsesRelay use UpstreamProviderEndpoint, provider_base_url, provider_secret_ref, ai_channel.timeout_ms, ai_channel.retry_policy, request-context provider timeout, request-context provider retry policy, ProviderRetryPolicy, strict JSON, non-stream JSON relay, transient provider retry, and retryable upstream status for native OpenAI-compatible /v1/responses relay without plaintext provider secret storage.
                OpenAIEmbeddingsRoute serves /v1/embeddings through the gateway runtime module, authenticates the API key, validates embedding capability, provider route, and EmbeddingInputToken pricing, returns embedding_relay_not_configured when relay is absent, and uses EmbeddingsRelay with EmbeddingsRelayRequest for provider execution.
                OpenAiCompatibleEmbeddingsRelay and SecretRefOpenAiCompatibleEmbeddingsRelay use UpstreamProviderEndpoint, provider_base_url, provider_secret_ref, ai_channel.timeout_ms, ai_channel.retry_policy, request-context provider timeout, request-context provider retry policy, ProviderRetryPolicy, strict JSON, non-stream JSON relay, transient provider retry, and retryable upstream status for native OpenAI-compatible /v1/embeddings relay without plaintext provider secret storage.
                ChatCompletionRelay accepts ChatCompletionRelayRequest only after authentication, model routing, and pricing validation, and carries provider_base_url, provider_secret_ref, ai_channel.timeout_ms, ai_channel.retry_policy, request-context provider timeout, and request-context provider retry policy, so HTTP handlers must not call upstream providers directly.
                OpenAiCompatibleChatCompletionStreamRelay and SecretRefOpenAiCompatibleChatCompletionStreamRelay use UpstreamProviderEndpoint, an absolute http or https provider URL, hyper, hyper-rustls, and a TLS connector for native OpenAI-compatible upstream SSE calls, normalize the /v1 prefix, never send /v1/v1/..., require a provider response timeout, apply request-context provider timeout from ai_channel.timeout_ms, stream adapters must not retry retryable upstream status, and keep no plaintext provider secret storage.
                ProviderSecretResolver resolves provider_secret_ref into runtime bearer credentials outside catalog snapshots.
                ProviderSecretMapConfig loads SDKWORK_CLAW_PROVIDER_SECRET_MAP_JSON for environment-backed local and deployment secret reference resolution.
                ProviderSecretMapResolver adapts ProviderSecretMapConfig into ProviderSecretResolver without exposing plaintext provider tokens.
                ProviderRelayConfig loads SDKWORK_CLAW_OPENAI_RELAY_BASE_URL and SDKWORK_CLAW_OPENAI_RELAY_BEARER_TOKEN for deployment-time provider relay wiring.
                OpenAiCompatibleChatCompletionRelay and SecretRefOpenAiCompatibleChatCompletionRelay use UpstreamProviderEndpoint, an absolute http or https provider URL, hyper, hyper-rustls, and a TLS connector for native OpenAI-compatible upstream calls, normalize the /v1 prefix, never send /v1/v1/..., require a provider response timeout, apply request-context provider timeout from ai_channel.timeout_ms, apply request-context provider retry policy from ai_channel.retry_policy, ProviderRetryPolicy, strict JSON, non-stream JSON relay, transient provider retry, retryable upstream status, and keep no plaintext provider secret storage.
                GatewayRouterError reports database loader and API key pepper configuration failures without leaking secrets.
                lib.rs must stay below 80 non-empty lines and delegate implementation to submodules.
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )

    def test_accepts_complete_rust_backend_architecture(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_reports_missing_required_workspace_member(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            cargo = root / "Cargo.toml"
            cargo.write_text(
                cargo.read_text(encoding="utf-8").replace('    "crates/sdkwork-claw-security",\n', ""),
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("Cargo workspace must include member: crates/sdkwork-claw-security", result.messages)

    def test_reports_service_without_common_http_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            service = root / "services" / "sdkwork-clawrouter-app-api-server"
            service.joinpath("Cargo.toml").write_text("[package]\nname = \"service\"\n", encoding="utf-8")
            service.joinpath("src", "lib.rs").write_text("pub fn router() {}\n", encoding="utf-8")

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("services/sdkwork-clawrouter-app-api-server/Cargo.toml must depend on sdkwork-claw-http", result.messages)
            self.assertIn("services/sdkwork-clawrouter-app-api-server/src/lib.rs must build routers through sdkwork_claw_http::service_router", result.messages)

    def test_reports_service_without_common_runtime_config_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            service = root / "services" / "sdkwork-clawrouter-app-api-server"
            cargo = service / "Cargo.toml"
            cargo.write_text(
                cargo.read_text(encoding="utf-8").replace(
                    'sdkwork-claw-config = { path = "../../crates/sdkwork-claw-config" }\n',
                    "",
                ),
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "services/sdkwork-clawrouter-app-api-server/Cargo.toml must depend on sdkwork-claw-config",
                result.messages,
            )

    def test_reports_gateway_without_runtime_module(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            gateway_lib = root / "services" / "sdkwork-clawrouter-cloud-gateway" / "src" / "lib.rs"
            gateway_lib.write_text(
                gateway_lib.read_text(encoding="utf-8").replace("pub mod runtime;\n", ""),
                encoding="utf-8",
            )
            root.joinpath("services", "sdkwork-clawrouter-cloud-gateway", "src", "runtime.rs").unlink(missing_ok=True)

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("crates/sdkwork-clawrouter-cloud-gateway/src/lib.rs must declare module: runtime", result.messages)

    def test_reports_missing_module_standard_doc_terms(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "29-rust-backend-module-standard.md"
            doc.write_text("Rust-first only\n", encoding="utf-8")

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("docs/29-rust-backend-module-standard.md must mention required backend module term: sdkwork-claw-security", result.messages)
            self.assertIn("docs/29-rust-backend-module-standard.md must mention required backend module term: backpressure", result.messages)

    def test_reports_missing_product_query_standard_doc_terms(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "29-rust-backend-module-standard.md"
            doc.write_text(doc.read_text(encoding="utf-8").replace("PriceAvailability", "PriceState"), encoding="utf-8")

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("docs/29-rust-backend-module-standard.md must mention required backend module term: PriceAvailability", result.messages)

    def test_reports_product_without_chat_completion_relay_port(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            ports_mod = root / "services" / "sdkwork-clawrouter-router-service" / "src" / "ports" / "mod.rs"
            ports_mod.write_text(
                ports_mod.read_text(encoding="utf-8").replace("mod chat_completion_relay;\n", ""),
                encoding="utf-8",
            )
            root.joinpath(
                "services",
                "sdkwork-clawrouter-router-service",
                "src",
                "ports",
                "chat_completion_relay.rs",
            ).unlink()

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/ports/mod.rs must declare chat_completion_relay module",
                result.messages,
            )

    def test_reports_product_without_embeddings_relay_port(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            ports_mod = root / "services" / "sdkwork-clawrouter-router-service" / "src" / "ports" / "mod.rs"
            ports_mod.write_text(
                ports_mod.read_text(encoding="utf-8").replace("mod embeddings_relay;\n", ""),
                encoding="utf-8",
            )
            root.joinpath(
                "services",
                "sdkwork-clawrouter-router-service",
                "src",
                "ports",
                "embeddings_relay.rs",
            ).unlink()

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/ports/mod.rs must declare embeddings_relay module",
                result.messages,
            )

    def test_reports_product_without_provider_secret_resolver_port(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            ports_mod = root / "services" / "sdkwork-clawrouter-router-service" / "src" / "ports" / "mod.rs"
            ports_mod.write_text(
                ports_mod.read_text(encoding="utf-8").replace("mod provider_secret_resolver;\n", ""),
                encoding="utf-8",
            )
            root.joinpath(
                "services",
                "sdkwork-clawrouter-router-service",
                "src",
                "ports",
                "provider_secret_resolver.rs",
            ).unlink()

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/ports/mod.rs must declare provider_secret_resolver module",
                result.messages,
            )

    def test_reports_library_crate_without_required_submodules(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            lib = root / "crates" / "sdkwork-claw-http" / "src" / "lib.rs"
            lib.write_text("pub fn all_in_one() {}\n", encoding="utf-8")

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("crates/sdkwork-claw-http/src/lib.rs must declare module: health", result.messages)
            self.assertIn("crates/sdkwork-claw-http/src/lib.rs must declare module: router", result.messages)

    def test_reports_missing_contract_route_modules(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            contract_lib = root / "crates" / "sdkwork-claw-contract" / "src" / "lib.rs"
            contract_lib.write_text("pub mod api_surface;\n", encoding="utf-8")
            http_lib = root / "crates" / "sdkwork-claw-http" / "src" / "lib.rs"
            http_lib.write_text(
                "pub mod health;\npub mod headers;\npub mod router;\n",
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("crates/sdkwork-claw-contract/src/lib.rs must declare module: manifest", result.messages)
            self.assertIn("crates/sdkwork-claw-contract/src/lib.rs must declare module: operation", result.messages)
            self.assertIn("crates/sdkwork-claw-contract/src/lib.rs must declare module: path_pattern", result.messages)
            self.assertIn("crates/sdkwork-claw-http/src/lib.rs must declare module: contract_routes", result.messages)
            self.assertIn("crates/sdkwork-claw-http/src/lib.rs must declare module: error", result.messages)

    def test_reports_config_without_api_key_security_module(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            config_lib = root / "crates" / "sdkwork-claw-config" / "src" / "lib.rs"
            config_lib.write_text(config_lib.read_text(encoding="utf-8").replace("pub mod api_key;\n", ""), encoding="utf-8")
            root.joinpath("crates", "sdkwork-claw-config", "src", "api_key.rs").unlink()

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("crates/sdkwork-claw-config/src/lib.rs must declare module: api_key", result.messages)

    def test_reports_config_without_provider_relay_module(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            config_lib = root / "crates" / "sdkwork-claw-config" / "src" / "lib.rs"
            config_lib.write_text(
                config_lib.read_text(encoding="utf-8").replace("pub mod provider_relay;\n", ""),
                encoding="utf-8",
            )
            root.joinpath("crates", "sdkwork-claw-config", "src", "provider_relay.rs").unlink()

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "crates/sdkwork-claw-config/src/lib.rs must declare module: provider_relay",
                result.messages,
            )

    def test_reports_config_without_provider_secret_map_module(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            config_lib = root / "crates" / "sdkwork-claw-config" / "src" / "lib.rs"
            config_lib.write_text(
                config_lib.read_text(encoding="utf-8").replace(
                    "pub mod provider_secret_map;\n", ""
                ),
                encoding="utf-8",
            )
            root.joinpath(
                "crates", "sdkwork-claw-config", "src", "provider_secret_map.rs"
            ).unlink()

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "crates/sdkwork-claw-config/src/lib.rs must declare module: provider_secret_map",
                result.messages,
            )

    def test_reports_http_boundary_without_auth_module(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            http_lib = root / "crates" / "sdkwork-claw-http" / "src" / "lib.rs"
            http_lib.write_text(http_lib.read_text(encoding="utf-8").replace("pub mod auth;\n", ""), encoding="utf-8")
            root.joinpath("crates", "sdkwork-claw-http", "src", "auth.rs").unlink()

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("crates/sdkwork-claw-http/src/lib.rs must declare module: auth", result.messages)

    def test_reports_oversized_library_entry_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            lib = root / "crates" / "sdkwork-claw-security" / "src" / "lib.rs"
            lib.write_text("pub mod headers;\npub mod redaction;\n" + ("pub fn oversized() {}\n" * 130), encoding="utf-8")

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("crates/sdkwork-claw-security/src/lib.rs must stay below 80 non-empty lines", result.messages)

    def test_reports_product_without_hexagonal_submodules(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            lib = root / "services" / "sdkwork-clawrouter-router-service" / "src" / "lib.rs"
            lib.write_text("pub mod identity;\n", encoding="utf-8")

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("services/sdkwork-clawrouter-router-service/src/lib.rs must declare module: domain", result.messages)
            self.assertIn("services/sdkwork-clawrouter-router-service/src/lib.rs must declare module: application", result.messages)
            self.assertIn("services/sdkwork-clawrouter-router-service/src/lib.rs must declare module: ports", result.messages)
            self.assertIn("services/sdkwork-clawrouter-router-service/src/lib.rs must declare module: infrastructure", result.messages)
            self.assertIn("services/sdkwork-clawrouter-router-service/src/lib.rs must declare module: api", result.messages)

    def test_reports_missing_product_sql_boundary_modules(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            sql_dir = root / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql"
            sql_dir.joinpath("catalog.rs").unlink()
            sql_dir.joinpath("rows.rs").unlink()
            query_dir = sql_dir / "queries"
            query_dir.joinpath("lookup.rs").unlink()
            query_dir.joinpath("snapshot.rs").unlink()

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/catalog.rs is required for PricingCatalog SQL snapshots",
                result.messages,
            )
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/queries/lookup.rs is required for PricingCatalog SQL lookup query boundaries",
                result.messages,
            )
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/queries/snapshot.rs is required for PricingCatalog SQL snapshot load query boundaries",
                result.messages,
            )
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/rows.rs is required for PricingCatalog SQL row mappers",
                result.messages,
            )

    def test_reports_missing_product_provider_relay_adapter_modules(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            infrastructure_mod = (
                root
                / "services"
                / "sdkwork-clawrouter-router-service"
                / "src"
                / "infrastructure"
                / "mod.rs"
            )
            infrastructure_mod.write_text(
                infrastructure_mod.read_text(encoding="utf-8").replace("pub mod provider;\n", ""),
                encoding="utf-8",
            )
            provider_dir = (
                root
                / "services"
                / "sdkwork-clawrouter-router-service"
                / "src"
                / "infrastructure"
                / "provider"
            )
            provider_dir.joinpath("openai_compatible_relay.rs").unlink()
            provider_dir.joinpath("mod.rs").unlink()

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/mod.rs must declare provider module",
                result.messages,
            )
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/provider/openai_compatible_relay.rs is required for OpenAI-compatible provider relay",
                result.messages,
            )

    def test_reports_missing_provider_secret_map_resolver_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            provider_dir = (
                root
                / "services"
                / "sdkwork-clawrouter-router-service"
                / "src"
                / "infrastructure"
                / "provider"
            )
            provider_dir.joinpath("provider_secret_map_resolver.rs").unlink()
            provider_mod = provider_dir / "mod.rs"
            provider_mod.write_text(
                provider_mod.read_text(encoding="utf-8").replace(
                    "mod provider_secret_map_resolver;\n", ""
                ),
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/provider/mod.rs must declare provider_secret_map_resolver module",
                result.messages,
            )
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/provider/provider_secret_map_resolver.rs is required for provider secret map resolver",
                result.messages,
            )

    def test_reports_missing_chat_completion_stream_relay_port_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            ports_dir = root / "services" / "sdkwork-clawrouter-router-service" / "src" / "ports"
            ports_mod = ports_dir / "mod.rs"
            ports_mod.write_text(
                ports_mod.read_text(encoding="utf-8").replace("mod chat_completion_stream_relay;\n", ""),
                encoding="utf-8",
            )
            ports_dir.joinpath("chat_completion_stream_relay.rs").unlink()

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/ports/mod.rs must declare chat_completion_stream_relay module",
                result.messages,
            )
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/ports/chat_completion_stream_relay.rs is required for ChatCompletionStreamRelay provider streaming relay port",
                result.messages,
            )

    def test_reports_missing_gateway_usage_recorder_port_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            ports_dir = root / "services" / "sdkwork-clawrouter-router-service" / "src" / "ports"
            ports_mod = ports_dir / "mod.rs"
            ports_mod.write_text(
                ports_mod.read_text(encoding="utf-8").replace("mod gateway_usage_recorder;\n", ""),
                encoding="utf-8",
            )
            ports_dir.joinpath("gateway_usage_recorder.rs").unlink()

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/ports/mod.rs must declare gateway_usage_recorder module",
                result.messages,
            )
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/ports/gateway_usage_recorder.rs is required for GatewayUsageRecorder usage fact and request trace writer port",
                result.messages,
            )

    def test_reports_missing_usage_settlement_port_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            ports_dir = root / "services" / "sdkwork-clawrouter-router-service" / "src" / "ports"
            ports_mod = ports_dir / "mod.rs"
            ports_mod.write_text(
                ports_mod.read_text(encoding="utf-8").replace("mod usage_settlement_store;\n", ""),
                encoding="utf-8",
            )
            ports_dir.joinpath("usage_settlement_store.rs").unlink()

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/ports/mod.rs must declare usage_settlement_store module",
                result.messages,
            )
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/ports/usage_settlement_store.rs is required for UsageSettlementStore usage fact settlement and account ledger port",
                result.messages,
            )

    def test_reports_missing_product_sqlite_loader_modules(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            sqlite_dir = root / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql" / "sqlite"
            sqlite_dir.joinpath("loader.rs").unlink()
            sqlite_dir.joinpath("queries.rs").unlink()
            sqlite_dir.joinpath("row_mapping.rs").unlink()

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/loader.rs is required for SQLite PricingCatalog loader",
                result.messages,
            )
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/queries.rs is required for SQLite PricingCatalog load queries",
                result.messages,
            )
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/row_mapping.rs is required for SQLite PricingCatalog row mapping",
                result.messages,
            )

    def test_reports_missing_product_postgres_loader_modules(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            postgres_dir = root / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql" / "postgres"
            postgres_dir.joinpath("loader.rs").unlink()
            postgres_dir.joinpath("row_mapping.rs").unlink()

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/loader.rs is required for PostgreSQL PricingCatalog loader",
                result.messages,
            )
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/row_mapping.rs is required for PostgreSQL PricingCatalog row mapping",
                result.messages,
            )

    def test_reports_missing_gateway_usage_recorder_sql_adapters(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            sql_dir = root / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql"
            sqlite_dir = sql_dir / "sqlite"
            postgres_dir = sql_dir / "postgres"
            sqlite_dir.joinpath("gateway_usage_recorder.rs").unlink()
            postgres_dir.joinpath("gateway_usage_recorder.rs").unlink()

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/gateway_usage_recorder.rs is required for SQLite GatewayUsageRecorder adapter",
                result.messages,
            )
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/gateway_usage_recorder.rs is required for PostgreSQL GatewayUsageRecorder adapter",
                result.messages,
            )

    def test_reports_missing_usage_settlement_sql_adapters(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            sql_dir = root / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql"
            sqlite_dir = sql_dir / "sqlite"
            postgres_dir = sql_dir / "postgres"
            sqlite_dir.joinpath("usage_settlement_store.rs").unlink()
            postgres_dir.joinpath("usage_settlement_store.rs").unlink()

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/usage_settlement_store.rs is required for SQLite UsageSettlementStore adapter",
                result.messages,
            )
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/usage_settlement_store.rs is required for PostgreSQL UsageSettlementStore adapter",
                result.messages,
            )

    def test_accepts_directory_backed_rust_modules(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            src = root / "services" / "sdkwork-clawrouter-router-service" / "src"
            for module in ("api", "application", "domain", "infrastructure", "ports"):
                module_file = src / f"{module}.rs"
                module_file.unlink(missing_ok=True)
                module_dir = src / module
                module_dir.mkdir(parents=True, exist_ok=True)
                if module == "infrastructure":
                    module_dir.joinpath("mod.rs").write_text("pub mod provider;\npub mod sql;\n", encoding="utf-8")
                elif module == "ports":
                    module_dir.joinpath("mod.rs").write_text(
                        "mod chat_completion_relay;\nmod chat_completion_stream_relay;\nmod embeddings_relay;\nmod gateway_usage_recorder;\nmod pricing_catalog;\nmod provider_secret_resolver;\nmod responses_relay;\nmod usage_settlement_store;\n",
                        encoding="utf-8",
                    )
                    module_dir.joinpath("chat_completion_relay.rs").write_text("// ChatCompletionRelay port\n", encoding="utf-8")
                    module_dir.joinpath("chat_completion_stream_relay.rs").write_text("// ChatCompletionStreamRelay port\n", encoding="utf-8")
                    module_dir.joinpath("embeddings_relay.rs").write_text("// EmbeddingsRelay port\n", encoding="utf-8")
                    module_dir.joinpath("gateway_usage_recorder.rs").write_text("// GatewayUsageRecorder port\n", encoding="utf-8")
                    module_dir.joinpath("pricing_catalog.rs").write_text("// PricingCatalog port\n", encoding="utf-8")
                    module_dir.joinpath("provider_secret_resolver.rs").write_text("// ProviderSecretResolver port\n", encoding="utf-8")
                    module_dir.joinpath("responses_relay.rs").write_text("// ResponsesRelay port\n", encoding="utf-8")
                    module_dir.joinpath("usage_settlement_store.rs").write_text("// UsageSettlementStore port\n", encoding="utf-8")
                else:
                    module_dir.joinpath("mod.rs").write_text("// module\n", encoding="utf-8")

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_reports_missing_admin_model_route_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "29-rust-backend-module-standard.md"
            doc.write_text(doc.read_text(encoding="utf-8").replace("AdminModelRoute", "ModelRoute"), encoding="utf-8")

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("docs/29-rust-backend-module-standard.md must mention required backend module term: AdminModelRoute", result.messages)

    def test_reports_missing_database_health_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "29-rust-backend-module-standard.md"
            doc.write_text(doc.read_text(encoding="utf-8").replace("DatabaseHealth", "DatabaseStatus"), encoding="utf-8")

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/29-rust-backend-module-standard.md must mention required backend module term: DatabaseHealth",
                result.messages,
            )

    def test_reports_missing_runtime_config_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "29-rust-backend-module-standard.md"
            doc.write_text(
                doc.read_text(encoding="utf-8").replace("RuntimeConfig", "RuntimeSettings"),
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/29-rust-backend-module-standard.md must mention required backend module term: RuntimeConfig",
                result.messages,
            )

    def test_reports_missing_api_key_identity_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "29-rust-backend-module-standard.md"
            doc.write_text(doc.read_text(encoding="utf-8").replace("ApiKeyIdentity", "ApiIdentity"), encoding="utf-8")

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/29-rust-backend-module-standard.md must mention required backend module term: ApiKeyIdentity",
                result.messages,
            )

    def test_reports_missing_api_key_hashing_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "29-rust-backend-module-standard.md"
            doc.write_text(doc.read_text(encoding="utf-8").replace("ApiKeySecretHasher", "ApiHasher"), encoding="utf-8")

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/29-rust-backend-module-standard.md must mention required backend module term: ApiKeySecretHasher",
                result.messages,
            )

    def test_reports_missing_api_key_security_config_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "29-rust-backend-module-standard.md"
            doc.write_text(doc.read_text(encoding="utf-8").replace("ApiKeySecurityConfig", "ApiKeyConfig"), encoding="utf-8")

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/29-rust-backend-module-standard.md must mention required backend module term: ApiKeySecurityConfig",
                result.messages,
            )

    def test_reports_missing_openai_models_runtime_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "29-rust-backend-module-standard.md"
            doc.write_text(doc.read_text(encoding="utf-8").replace("/v1/models", "/v1/model-list"), encoding="utf-8")

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/29-rust-backend-module-standard.md must mention required backend module term: /v1/models",
                result.messages,
            )

    def test_reports_missing_openai_chat_runtime_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "29-rust-backend-module-standard.md"
            doc.write_text(
                doc.read_text(encoding="utf-8").replace("/v1/chat/completions", "/v1/chat"),
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/29-rust-backend-module-standard.md must mention required backend module term: /v1/chat/completions",
                result.messages,
            )

    def test_reports_missing_openai_responses_runtime_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "29-rust-backend-module-standard.md"
            doc.write_text(
                doc.read_text(encoding="utf-8").replace("/v1/responses", "/v1/response"),
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/29-rust-backend-module-standard.md must mention required backend module term: /v1/responses",
                result.messages,
            )

    def test_reports_missing_responses_relay_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "29-rust-backend-module-standard.md"
            doc.write_text(
                doc.read_text(encoding="utf-8").replace("ResponsesRelay", "ResponseRelay"),
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/29-rust-backend-module-standard.md must mention required backend module term: ResponsesRelay",
                result.messages,
            )

    def test_reports_missing_openai_embeddings_runtime_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "29-rust-backend-module-standard.md"
            doc.write_text(
                doc.read_text(encoding="utf-8").replace("/v1/embeddings", "/v1/embed"),
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/29-rust-backend-module-standard.md must mention required backend module term: /v1/embeddings",
                result.messages,
            )

    def test_reports_missing_embeddings_relay_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "29-rust-backend-module-standard.md"
            doc.write_text(
                doc.read_text(encoding="utf-8").replace("EmbeddingsRelay", "EmbeddingRelay"),
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/29-rust-backend-module-standard.md must mention required backend module term: EmbeddingsRelay",
                result.messages,
            )

    def test_reports_missing_chat_completion_relay_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "29-rust-backend-module-standard.md"
            doc.write_text(
                doc.read_text(encoding="utf-8").replace("ChatCompletionRelay", "ChatRelay"),
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/29-rust-backend-module-standard.md must mention required backend module term: ChatCompletionRelay",
                result.messages,
            )

    def test_reports_missing_chat_completion_stream_relay_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "29-rust-backend-module-standard.md"
            doc.write_text(
                doc.read_text(encoding="utf-8").replace("ChatCompletionStreamRelay", "ChatStreamRelay"),
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/29-rust-backend-module-standard.md must mention required backend module term: ChatCompletionStreamRelay",
                result.messages,
            )

    def test_reports_missing_provider_relay_config_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "29-rust-backend-module-standard.md"
            doc.write_text(
                doc.read_text(encoding="utf-8").replace("ProviderRelayConfig", "ProviderConfig"),
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/29-rust-backend-module-standard.md must mention required backend module term: ProviderRelayConfig",
                result.messages,
            )

    def test_reports_missing_provider_secret_map_config_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "29-rust-backend-module-standard.md"
            doc.write_text(
                doc.read_text(encoding="utf-8").replace(
                    "ProviderSecretMapConfig", "ProviderSecretConfig"
                ),
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/29-rust-backend-module-standard.md must mention required backend module term: ProviderSecretMapConfig",
                result.messages,
            )


if __name__ == "__main__":
    unittest.main()
