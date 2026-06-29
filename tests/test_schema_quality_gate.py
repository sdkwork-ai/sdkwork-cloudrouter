import json
import hashlib
import tempfile
import textwrap
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from tools.api_contract_manifest import ApiContractManifestGenerator
from tools.clawrouter_gateway_openapi_generator import ClawRouterGatewayOpenApiGenerator
from tools.clawrouter_openapi_generator import ClawRouterOpenApiGenerator
from tools.clawrouter_sdk_runtime_standardizer import (
    SDK_GENERATED_OPENAPI_PATHS,
    SdkRuntimeStandardizer,
    sdk_derived_specs,
    sdk_generation_input_path_symbol,
    sdk_generation_input_spec,
)
from tools.domain_type_generator import DomainTypeGenerator
from tools.frontend_contract_loader import FrontendFieldContractCompiler
from tools.frontend_field_audit import FrontendFieldAudit
from tools.frontend_operation_audit import FrontendOperationAudit
from tools.java_legacy_contract_audit import JavaLegacyContractAudit
from tools.openapi_component_generator import OpenApiComponentGenerator
from tools.schema_compiler import SchemaCompiler
from tools.schema_manifest import SchemaManifestGenerator
from tools.schema_quality_gate import SchemaQualityGate


def media_resource(locator: str, kind: str = "image") -> dict:
    source = (
        "external_url"
        if locator.startswith(("http://", "https://"))
        else "data_url"
        if locator.startswith("data:")
        else "provider_asset"
    )
    if source == "provider_asset":
        return {"kind": kind, "source": source, "uri": locator}
    return {"kind": kind, "source": source, "url": locator, "publicUrl": locator}


class SchemaQualityGateTest(unittest.TestCase):
    def write_registry(self, root: Path, content: str) -> Path:
        registry = root / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
        registry.parent.mkdir(parents=True, exist_ok=True)
        registry.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return registry

    def write_app(self, root: Path, content: str = '<Route path="/models" element={<Models />} />') -> Path:
        app = root / "apps" / "sdkwork-clawrouter-pc" / "src" / "App.tsx"
        app.parent.mkdir(parents=True, exist_ok=True)
        app.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return app

    def write_frontend_contract(self, root: Path) -> Path:
        contract = root / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        contract.parent.mkdir(parents=True, exist_ok=True)
        contract.write_text(
            textwrap.dedent(
                """
                routes:
                  - route: /models
                    required_tables: [ai_model_vendor]
                    required_columns:
                      ai_model_vendor: [vendor_code, display_name]
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )
        return contract

    def write_frontend_contract_index(self, root: Path, content: str) -> Path:
        fragment = root / "docs" / "schema-registry" / "frontend-field-contracts" / "routes" / "models.yaml"
        fragment.parent.mkdir(parents=True, exist_ok=True)
        fragment.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        index = root / "docs" / "schema-registry" / "frontend-field-contracts" / "index.yaml"
        index.write_text(
            textwrap.dedent(
                """
                schema: sdkwork-clawrouter-frontend-field-contracts
                version: 0.1.0
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                rule: every actual portal route must be backed by explicit schema tables.
                fragments:
                  - routes/models.yaml
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )
        return index

    def write_default_flyway(self, root: Path, content: str) -> Path:
        flyway = (
            root.parent.parent
            / "spring-ai-plus-server-application"
            / "src"
            / "main"
            / "resources"
            / "database"
            / "postgresql"
            / "V6__vip_membership.sql"
        )
        flyway.parent.mkdir(parents=True, exist_ok=True)
        flyway.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return flyway

    def write_architecture_docs(self, root: Path) -> None:
        docs = {
            "02-技术架构设计.md": "Rust-first sdkwork-clawrouter-cloud-gateway sdkwork-clawrouter-app-api-server sdkwork-clawrouter-admin-api-server /app/v3/api /backend/v3/api /v1",
            "03-技术选型.md": "Rust-first axum tokio sqlx tower hyper utoipa tracing moka rust_decimal",
            "07-性能设计.md": "Rust-first Tokio Axum moka Redis streaming batch writer connection pool",
            "09-部署架构设计.md": "Rust-first Rust services desktop server docker kubernetes SDKWORK_CLAW_DEPLOYMENT_MODE SDKWORK_CLAW_GATEWAY_BIND SDKWORK_CLAW_APP_API_BIND SDKWORK_CLAW_ADMIN_API_BIND",
        }
        docs_root = root / "docs"
        docs_root.mkdir(parents=True, exist_ok=True)
        for filename, content in docs.items():
            (docs_root / filename).write_text(content + "\n", encoding="utf-8")

    def valid_registry(self) -> str:
        return """
        schema_registry:
          legacy_compatibility_guardrails:
            forbidden_synonym_tables: []
        domain_names:
          model_vendor:
            canonical_name: ModelVendor
            type_bindings:
              java: com.sdkwork.claw.router.domain.enums.ModelVendor
              rust: sdkwork_claw_router::domain::ModelVendor
              typescript: ModelVendor
              openapi: ModelVendor
            builtin_values:
              - { code: openai, java: OPENAI, rust: OpenAi, label: OpenAI }
              - { code: unknown, java: UNKNOWN, rust: Unknown, label: Unknown Vendor }
        tables:
          - table: ai_model_vendor
            domain: ai
            frontend_routes: [/models]
            api_surfaces: [app]
            columns:
              vendor_code: string(64)
              display_name: string(128)
        """

    def write_generated_artifacts(self, root: Path, registry: Path) -> None:
        SchemaCompiler(root=root, registry_path=registry).write_postgres()
        DomainTypeGenerator(root=root, registry_path=registry).write()
        SchemaManifestGenerator(root=root, registry_path=registry).write()
        OpenApiComponentGenerator(root=root, registry_path=registry).write()
        ApiContractManifestGenerator(root=root).write()
        ClawRouterOpenApiGenerator(root=root).write()
        ClawRouterGatewayOpenApiGenerator(root=root).write()
        self.write_rust_backend_architecture(root)
        self.write_generated_sdks(root)
        self.write_portal_sdk_boundary(root)
        self.write_project_skills(root)
        self.write_skill_seed_bundle(root)
        self.write_architecture_docs(root)
        JavaLegacyContractAudit(root=root, registry_path=registry).write()
        FrontendFieldAudit(root=root).write()
        FrontendOperationAudit(root=root).write()

    def write_rust_backend_architecture(self, root: Path) -> None:
        (root / "Cargo.toml").write_text(
            textwrap.dedent(
                """
                [workspace]
                members = [
                    "crates/sdkwork-claw-contract",
                    "crates/sdkwork-claw-config",
                    "crates/sdkwork-claw-health",
                    "crates/sdkwork-claw-security",
                    "crates/sdkwork-claw-http",
                    "crates/sdkwork-claw-observability",
                    "crates/sdkwork-clawrouter-cloud-gateway",
                    "services/sdkwork-clawrouter-admin-api-server",
                    "services/sdkwork-clawrouter-app-api-server",
                    "services/sdkwork-clawrouter-router-service",
                ]

                [workspace.dependencies]
                anyhow = "1"
                axum = "0.8"
                hmac = "0.12"
                hex = "0.4"
                serde = "1"
                serde_json = "1"
                sha2 = "0.10"
                bytes = "1"
                http-body-util = "0.1"
                hyper = "1"
                hyper-util = "0.1"
                hyper-rustls = "0.27"
                sqlx = "0.8"
                tokio = "1"
                tower = "0.5"
                tower-http = "0.6"
                tracing = "0.1"
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )
        for member in (
            "crates/sdkwork-claw-contract",
            "crates/sdkwork-claw-config",
            "crates/sdkwork-claw-health",
            "crates/sdkwork-claw-security",
            "crates/sdkwork-claw-http",
            "crates/sdkwork-claw-observability",
            "services/sdkwork-clawrouter-router-service",
        ):
            cargo = root / member / "Cargo.toml"
            cargo.parent.mkdir(parents=True, exist_ok=True)
            cargo.write_text("[package]\nname = \"member\"\n", encoding="utf-8")

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
            "crates/sdkwork-claw-health": ("health",),
            "crates/sdkwork-claw-security": ("headers", "redaction"),
            "crates/sdkwork-claw-http": ("auth", "contract_routes", "error", "health", "headers", "router"),
            "crates/sdkwork-claw-observability": ("tracing_setup",),
            "services/sdkwork-clawrouter-router-service": (
                "api",
                "application",
                "domain",
                "identity",
                "infrastructure",
                "ports",
            ),
        }
        for member, modules in module_rules.items():
            src = root / member / "src"
            src.mkdir(parents=True, exist_ok=True)
            src.joinpath("lib.rs").write_text(
                "\n".join(f"pub mod {module};" for module in modules) + "\n",
                encoding="utf-8",
            )
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
            (service_root / "src").mkdir(parents=True, exist_ok=True)
            (service_root / "Cargo.toml").write_text(
                textwrap.dedent(
                    """
                    [package]
                    name = "service"

                    [dependencies]
                    sdkwork-claw-config = { path = "../../crates/sdkwork-claw-config" }
                    sdkwork-claw-http = { path = "../../crates/sdkwork-claw-http" }
                    sdkwork-claw-observability = { path = "../../crates/sdkwork-claw-observability" }
                    anyhow.workspace = true
                    axum.workspace = true
                    tokio.workspace = true
                    """
                ).strip()
                + "\n",
                encoding="utf-8",
            )
            lib_text = "pub fn router() { sdkwork_claw_http::service_router(\"service\"); }\n"
            if service == "sdkwork-clawrouter-cloud-gateway":
                lib_text = "pub mod runtime;\npub fn router() { sdkwork_claw_http::service_router(\"service\"); }\n"
                (service_root / "src" / "runtime.rs").write_text("// gateway runtime\n", encoding="utf-8")
            (service_root / "src" / "lib.rs").write_text(lib_text, encoding="utf-8")

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

    def write_generated_sdks(self, root: Path) -> None:
        self.write_generated_sdk(
            root,
            family_dir="clawrouter-app-sdk",
            package_dir="clawrouter-app-sdk-typescript",
            package_name="@sdkwork/clawrouter-app-sdk",
            sdk_type="app",
            client_name="SdkworkAppClient",
            api_prefix="/app/v3/api",
        )
        self.write_generated_sdk(
            root,
            family_dir="clawrouter-backend-sdk",
            package_dir="clawrouter-backend-sdk-typescript",
            package_name="@sdkwork/clawrouter-backend-sdk",
            sdk_type="backend",
            client_name="SdkworkBackendClient",
            api_prefix="/backend/v3/api",
        )
        self.write_generated_sdk(
            root,
            family_dir="clawrouter-open-sdk",
            package_dir="clawrouter-open-sdk-typescript",
            package_name="@sdkwork/clawrouter-open-sdk",
            sdk_type="ai",
            client_name="SdkworkAiClient",
            api_prefix="/v1",
        )

    def write_generated_sdk(
        self,
        root: Path,
        family_dir: str,
        package_dir: str,
        package_name: str,
        sdk_type: str,
        client_name: str,
        api_prefix: str,
    ) -> None:
        family = root / "sdks" / family_dir
        base = family / package_dir
        (family / "openapi").mkdir(parents=True, exist_ok=True)
        (family / "bin").mkdir(parents=True, exist_ok=True)
        (family / "tests").mkdir(parents=True, exist_ok=True)
        (family / "README.md").write_text(f"# {family_dir}\n", encoding="utf-8")
        (family / ".sdkwork-assembly.json").write_text(
            json.dumps(
                {
                    "workspace": family_dir,
                    "authoritySpec": f"openapi/{family_dir}.openapi.json",
                    "generationInputSpec": sdk_generation_input_spec(family_dir),
                    "derivedSpecs": sdk_derived_specs(family_dir),
                    "languages": [
                        {
                            "language": "typescript",
                            "workspace": package_dir,
                            "generationState": "materialized",
                            "packagePath": package_dir,
                            "manifestPath": f"{package_dir}/package.json",
                            "name": package_name,
                        }
                    ]
                    + [
                        {
                            "language": language,
                            "workspace": f"{family_dir}-{language}",
                            "generationState": "generation_available",
                            "releaseState": "reserved",
                            "generatedPath": f"{family_dir}-{language}/generated/server-openapi",
                        }
                        for language in [
                            "flutter",
                            "rust",
                            "java",
                            "csharp",
                            "swift",
                            "kotlin",
                            "go",
                            "python",
                        ]
                    ],
                }
            )
            + "\n",
            encoding="utf-8",
        )
        source_spec_path = root / SDK_GENERATED_OPENAPI_PATHS[family_dir]
        source_spec = json.loads(source_spec_path.read_text(encoding="utf-8"))
        (family / "openapi" / f"{family_dir}.openapi.json").write_text(
            json.dumps(source_spec, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        sdkgen_spec = source_spec
        if family_dir == "clawrouter-open-sdk":
            sdkgen_spec = SdkRuntimeStandardizer(root=root)._derive_sdkgen_openapi(source_spec)
        (family / "openapi" / f"{family_dir}.sdkgen.json").write_text(
            json.dumps(sdkgen_spec, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        generation_input_path = sdk_generation_input_path_symbol(family_dir)
        sdkgen_input_path_line = (
            "const sdkgenInputPath = `sdks/${sdkFamily}/openapi/${sdkFamily}.sdkgen.json`;\n"
            if family_dir == "clawrouter-open-sdk"
            else ""
        )
        (family / "bin" / "generate-sdk.mjs").write_text(
            "const OFFICIAL_LANGUAGES = ['typescript', 'flutter', 'rust', 'java', 'csharp', 'swift', 'kotlin', 'go', 'python'];\n"
            f"const sdkFamily = '{family_dir}';\n"
            "const authorityInputPath = `sdks/${sdkFamily}/openapi/${sdkFamily}.openapi.json`;\n"
            f"{sdkgen_input_path_line}"
            "function strictTypeScriptArgs() {\n"
            f"  return ['-i', {generation_input_path}];\n"
            "}\n"
            "function generatorArgs(language) {\n"
            f"  return ['-i', {generation_input_path}, '-l', language];\n"
            "}\n"
            "function runLanguage(language) { cleanGeneratedOutput(language); }\n"
            "function cleanGeneratedOutput(language) {}\n"
            "console.log('--language');\n"
            "console.log('sdks/${sdkFamily}/${sdkFamily}-${language}/generated/server-openapi');\n",
            encoding="utf-8",
        )
        (family / "bin" / "verify-sdk.mjs").write_text("console.log('verify');\n", encoding="utf-8")
        (base / "src" / "api").mkdir(parents=True, exist_ok=True)
        (base / "src" / "types").mkdir(parents=True, exist_ok=True)
        (base / ".sdkwork").mkdir(parents=True, exist_ok=True)
        (base / "custom").mkdir(parents=True, exist_ok=True)
        (base / "dist").mkdir(parents=True, exist_ok=True)
        (base / "package.json").write_text(
            json.dumps(
                {
                    "name": package_name,
                    "version": "0.1.0",
                    "main": "./dist/index.cjs",
                    "module": "./dist/index.js",
                    "types": "./dist/index.d.ts",
                    "exports": {
                        ".": {
                            "types": "./dist/index.d.ts",
                            "import": "./dist/index.js",
                            "require": "./dist/index.cjs",
                        }
                    },
                    "scripts": {
                        "build": "node custom/build-runtime.mjs",
                        "dev": "node custom/build-runtime.mjs",
                        "prepublishOnly": "npm run build",
                    },
                    "devDependencies": {
                        "@types/node": "^20.0.0",
                        "rollup": "^4.0.0",
                        "typescript": "^5.3.0",
                    },
                }
            )
            + "\n",
            encoding="utf-8",
        )
        (base / "sdkwork-sdk.json").write_text(f'{{"language":"typescript","sdkType":"{sdk_type}"}}\n', encoding="utf-8")
        (base / "README.md").write_text(f"# {package_name}\n", encoding="utf-8")
        (base / "custom" / "README.md").write_text("custom\n", encoding="utf-8")
        (base / "custom" / "build-runtime.mjs").write_text("console.log('build');\n", encoding="utf-8")
        (base / ".sdkwork" / "sdkwork-generator-manifest.json").write_text("{}\n", encoding="utf-8")
        sdk_source = f"export class {client_name} {{}}\n"
        if family_dir == "clawrouter-backend-sdk":
            sdk_source = (
                "import { EcosystemApi, createEcosystemApi } from './api/ecosystem';\n"
                f"export class {client_name} {{\n"
                "  private httpClient: unknown;\n"
                "  public readonly ecosystem: EcosystemApi;\n"
                "  constructor() { this.ecosystem = createEcosystemApi(this.httpClient); }\n"
                "}\n"
            )
        (base / "src" / "sdk.ts").write_text(sdk_source, encoding="utf-8")
        (base / "src" / "api" / "base.ts").write_text("export class BaseApi {}\n", encoding="utf-8")
        api_index_source = "export { BaseApi } from './base';\n"
        api_index_source += (
            "export { appApiPath } from './paths';\n"
            if sdk_type == "app"
            else "export { backendApiPath } from './paths';\n"
        )
        if family_dir == "clawrouter-backend-sdk":
            api_index_source += "export { EcosystemApi } from './ecosystem';\n"
            (base / "src" / "api" / "ecosystem.ts").write_text(
                "export class EcosystemSkillsReviewApi { async approve() {} async reject() {} }\n"
                "export class EcosystemSkillsPackageApi { async create() {} async list() {} async delete() {} async retrieve() {} async update() {} async disable() {} async enable() {} }\n"
                "export class EcosystemSkillsCategoriesApi { async list() {} async create() {} }\n"
                "export class EcosystemSkillsAssetsApi { async list() {} async create() {} async delete() {} async retrieve() {} async update() {} }\n"
                "export class EcosystemSkillsArtifactsApi { async list() {} async create() {} async delete() {} async retrieve() {} async update() {} }\n"
                "export class EcosystemSkillsApi {\n"
                "  public readonly categories: EcosystemSkillsCategoriesApi;\n"
                "  public readonly package: EcosystemSkillsPackageApi;\n"
                "  public readonly artifacts: EcosystemSkillsArtifactsApi;\n"
                "  public readonly assets: EcosystemSkillsAssetsApi;\n"
                "  public readonly review: EcosystemSkillsReviewApi;\n"
                "  async create() {} async list() {} async delete() {} async retrieve() {} async update() {} async disable() {} async enable() {} async publish() {} async unpublish() {}\n"
                "}\n"
                "export class EcosystemApi { public readonly skills: EcosystemSkillsApi; }\n"
                "export function createEcosystemApi(client: unknown): EcosystemApi { return new EcosystemApi(); }\n",
                encoding="utf-8",
            )
        (base / "src" / "api" / "index.ts").write_text(api_index_source, encoding="utf-8")
        (base / "src" / "api" / "paths.ts").write_text(f"{api_prefix}\n", encoding="utf-8")
        (base / "src" / "types" / "common.ts").write_text(
            "export interface BasePlusVO {}\n"
            "export interface BasePlusEntity extends BasePlusVO {}\n"
            "export interface QueryListForm {}\n"
            "export type { Page, RequestConfig, RequestOptions, QueryParams } from '@sdkwork/sdk-common';\n",
            encoding="utf-8",
        )
        common_export = "export * from './common';\n"
        if family_dir == "clawrouter-app-sdk":
            (base / "src" / "types" / "app-model-catalog-price-availability.ts").write_text(
                "export interface AppModelCatalogPriceAvailability {\n"
                "  reason?: string | null;\n"
                "  status: 'reference' | 'unavailable';\n"
                "}\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "app-model-catalog-item.ts").write_text(
                "import type { AppModelCatalogPriceAvailability } from './app-model-catalog-price-availability';\n\n"
                "export interface AppModelCatalogItem {\n"
                "  capabilities: string[];\n"
                "  displayName: string;\n"
                "  model: string;\n"
                "  officialReferenceUnitPrice?: string | null;\n"
                "  priceAvailability: AppModelCatalogPriceAvailability;\n"
                "  providerCodes: string[];\n"
                "  vendor: string;\n"
                "  vendorCode: string;\n"
                "}\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "index.ts").write_text(
                common_export
                + "export type { AppModelCatalogPriceAvailability } from './app-model-catalog-price-availability';\n"
                "export type { AppModelCatalogItem } from './app-model-catalog-item';\n",
                encoding="utf-8",
            )
        else:
            (base / "src" / "types" / "index.ts").write_text(common_export, encoding="utf-8")
        (base / "dist" / "index.js").write_text("export {};\n", encoding="utf-8")
        (base / "dist" / "index.cjs").write_text('"use strict";\n', encoding="utf-8")
        (base / "dist" / "index.d.ts").write_text("export {};\n", encoding="utf-8")

    def write_portal_sdk_boundary(self, root: Path) -> None:
        portal = root / "apps" / "sdkwork-clawrouter-pc"
        commons = portal / "packages" / "sdkwork-clawroutes-pc-commons"
        (commons / "src").mkdir(parents=True, exist_ok=True)
        (portal / "package.json").write_text(
            '{"scripts":{"dev":"vite --configLoader native","dev:browser":"vite --configLoader native","build":"vite build --configLoader native"},"dependencies":{"@sdkwork/clawrouter-app-sdk":"workspace:*","@sdkwork/clawrouter-backend-sdk":"workspace:*","@sdkwork/clawrouter-open-sdk":"workspace:*"}}\n',
            encoding="utf-8",
        )
        (commons / "package.json").write_text(
            '{"dependencies":{"@sdkwork/clawrouter-app-sdk":"workspace:*","@sdkwork/clawrouter-backend-sdk":"workspace:*","@sdkwork/clawrouter-open-sdk":"workspace:*"}}\n',
            encoding="utf-8",
        )
        (commons / "src" / "index.ts").write_text("export * from './components/CopyButton';\n", encoding="utf-8")
        (commons / "src" / "runtime.ts").write_text("export * from './sdk-clients.ts';\n", encoding="utf-8")
        (commons / "src" / "utils").mkdir(parents=True, exist_ok=True)
        (commons / "src" / "utils" / "env.ts").write_text(
            "const DEFAULT_API_BASE_URL = '/v1';\n"
            "export function readClawRouterRuntimeEnv(_name: string): string | undefined { return undefined; }\n"
            "export const API_BASE_URL = DEFAULT_API_BASE_URL;\n",
            encoding="utf-8",
        )
        (commons / "src" / "sdk-base-url.ts").write_text(
            "export function normalizeGeneratedSdkBaseUrl(baseUrl: string, _apiPrefix: string): string { return baseUrl; }\n",
            encoding="utf-8",
        )
        (commons / "src" / "sdk-clients.ts").write_text(
            "import { SdkworkAppClient } from '@sdkwork/clawrouter-app-sdk';\n"
            "import { SdkworkBackendClient } from '@sdkwork/clawrouter-backend-sdk';\n"
            "import { SdkworkAiClient } from '@sdkwork/clawrouter-open-sdk';\n"
            "import { normalizeGeneratedSdkBaseUrl } from './sdk-base-url';\n"
            "const APP_API_PREFIX = '/app/v3/api';\n"
            "const BACKEND_API_PREFIX = '/backend/v3/api';\n"
            "const OPEN_API_PREFIX = '/v1';\n"
            "export interface ClawRouterAppSdkClientOptions { appBaseUrl?: string; authToken?: string; platform?: string; timeout?: number; }\n"
            "export interface ClawRouterBackendSdkClientOptions { backendBaseUrl?: string; authToken?: string; platform?: string; timeout?: number; }\n"
            "export interface ClawRouterAiSdkClientOptions { aiBaseUrl?: string; apiKey?: string; authToken?: string; platform?: string; timeout?: number; }\n"
            "export function createClawRouterAiSdkClient(options: ClawRouterAiSdkClientOptions = {}) { return new SdkworkAiClient({ baseUrl: normalizeGeneratedSdkBaseUrl(options.aiBaseUrl ?? OPEN_API_PREFIX, OPEN_API_PREFIX), apiKey: options.apiKey, authToken: options.authToken, platform: options.platform, timeout: options.timeout }); }\n"
            "export function createClawRouterAppSdkClient(options: ClawRouterAppSdkClientOptions = {}) { return new SdkworkAppClient({ baseUrl: normalizeGeneratedSdkBaseUrl(options.appBaseUrl ?? APP_API_PREFIX, APP_API_PREFIX), authToken: options.authToken, platform: options.platform, timeout: options.timeout }); }\n"
            "export function createClawRouterBackendSdkClient(options: ClawRouterBackendSdkClientOptions = {}) { return new SdkworkBackendClient({ baseUrl: normalizeGeneratedSdkBaseUrl(options.backendBaseUrl ?? BACKEND_API_PREFIX, BACKEND_API_PREFIX), authToken: options.authToken, platform: options.platform, timeout: options.timeout }); }\n",
            encoding="utf-8",
        )

    def write_project_skills(self, root: Path) -> None:
        self.write_skill(
            root,
            "clawrouter-app-sdk-integration",
            """
            ---
            name: clawrouter-app-sdk-integration
            description: Use @sdkwork/clawrouter-app-sdk for product contract surface integration.
            ---
            Use @sdkwork/clawrouter-app-sdk.
            Select the SDK by contract surface.
            URL path prefixes are not the source of truth.
            Block raw fetch and axios for remote business endpoints.
            Never hand-edit generated SDK output.
            Regenerate with sdkwork-sdk-generator.
            Preserve apps/sdkwork-clawrouter-pc UI visuals.
            """,
        )
        self.write_skill(
            root,
            "clawrouter-backend-sdk-integration",
            """
            ---
            name: clawrouter-backend-sdk-integration
            description: Use @sdkwork/clawrouter-backend-sdk for management contract surface integration.
            ---
            Use @sdkwork/clawrouter-backend-sdk.
            Select the SDK by contract surface.
            URL path prefixes are not the source of truth.
            Block raw fetch and axios for remote business endpoints.
            Never hand-edit generated SDK output.
            Regenerate with sdkwork-sdk-generator.
            Preserve apps/sdkwork-clawrouter-pc UI visuals.
            """,
        )
        self.write_skill(
            root,
            "clawrouter-sdk-generation",
            """
            ---
            name: clawrouter-sdk-generation
            description: Regenerate @sdkwork/clawrouter-app-sdk, @sdkwork/clawrouter-backend-sdk, and @sdkwork/clawrouter-open-sdk.
            ---
            Generate exactly three SDK systems: @sdkwork/clawrouter-app-sdk, @sdkwork/clawrouter-backend-sdk, and @sdkwork/clawrouter-open-sdk.
            URL path prefixes are not used as the standard for SDK ownership.
            Read generated/api/api-contract-manifest.json.
            Write generated/openapi/clawrouter-app-openapi.json.
            Write generated/openapi/clawrouter-backend-openapi.json.
            Write apps/sdkwork-clawrouter-pc/public/openapi.json with tools.clawrouter_gateway_openapi_generator.
            app/backend SDK generation uses the authority OpenAPI snapshots.
            open SDK generation uses openapi/clawrouter-open-sdk.sdkgen.json.
            .sdkwork-assembly.json generationInputSpec declares the actual generation input.
            .sdkwork-assembly.json derivedSpecs declares derived generator artifacts.
            Run sdkwork-sdk-generator.
            Never hand-edit generated SDK output.
            """,
        )

    def write_skill_seed_bundle(self, root: Path) -> None:
        skills_root = root / "data" / "skills"
        manifests_root = skills_root / "manifests"
        artifacts_root = skills_root / "artifacts"
        manifests_root.mkdir(parents=True, exist_ok=True)
        artifacts_root.mkdir(parents=True, exist_ok=True)
        (skills_root / "install-manifest.json").write_text(
            json.dumps(
                {
                    "catalogCode": "sdkwork-agent-skills",
                    "schemaVersion": "agent-skills-seed.v1",
                    "source": "bundled",
                }
            ),
            encoding="utf-8",
        )
        (skills_root / "categories.json").write_text(
            json.dumps(
                [
                    {
                        "id": 1901,
                        "uuid": "skill-category-sdkwork-official",
                        "code": "sdkwork-official",
                    }
                ]
            ),
            encoding="utf-8",
        )
        (skills_root / "packages.json").write_text(
            json.dumps(
                [
                    {
                        "id": 7101,
                        "uuid": "pkg",
                        "packageKey": "agent-productivity-suite",
                        "categoryId": 1901,
                        "enabled": True,
                        "icon": media_resource("https://cdn.example.test/packages/agent-productivity/icon.png"),
                        "cover": media_resource("https://cdn.example.test/packages/agent-productivity/cover.png"),
                    }
                ]
            ),
            encoding="utf-8",
        )
        (skills_root / "skills.json").write_text(
            json.dumps(
                [
                    {
                        "id": 8101,
                        "uuid": "skill-prompt-optimizer",
                        "skillKey": "prompt-optimizer",
                        "name": "Prompt Optimizer",
                        "categoryId": 1901,
                        "packageId": 7101,
                        "provider": "SDKWork",
                        "sourceType": "OFFICIAL",
                        "manifestUrl": "data/skills/manifests/prompt-optimizer.json",
                        "version": "1.0.0",
                        "versionName": "1.0.0",
                        "runtime": "builtin",
                        "entrypoint": "sdkwork.skills.prompt_optimizer",
                        "marketStatus": "PUBLISHED",
                        "visibility": "PUBLIC",
                        "reviewStatus": "APPROVED",
                        "builtin": True,
                        "isBuiltin": True,
                        "enabled": True,
                        "icon": media_resource("https://cdn.example.test/skills/prompt-optimizer/icon.png"),
                        "cover": media_resource("https://cdn.example.test/skills/prompt-optimizer/cover.png"),
                        "capabilities": ["prompt.analysis"],
                        "configSchema": {"type": "object"},
                        "defaultConfig": {},
                    }
                ]
            ),
            encoding="utf-8",
        )
        (skills_root / "assets.json").write_text(
            json.dumps(
                [
                    {
                        "uuid": "asset",
                        "targetType": 35,
                        "targetId": 8101,
                        "asset": media_resource("https://cdn.example.test/skills/prompt-optimizer/cover.png"),
                        "thumbnail": media_resource("https://cdn.example.test/skills/prompt-optimizer/thumb.png"),
                    }
                ]
            ),
            encoding="utf-8",
        )
        artifact_payload = {
            "artifactRef": "builtin://sdkwork.skills.prompt_optimizer@1.0.0",
            "version": "1.0.0",
            "runtime": "builtin",
            "skill": {"id": 8101},
            "instructions": ["Improve the prompt."],
            "inputSchema": {"type": "object"},
            "outputSchema": {"type": "object"},
        }
        checksum_hash = artifact_payload_checksum(artifact_payload)
        artifact_payload["checksumHash"] = checksum_hash
        artifact_payload_text = json.dumps(artifact_payload)
        artifact_size_bytes = len(artifact_payload_text.encode("utf-8"))
        (skills_root / "artifacts.json").write_text(
            json.dumps(
                [
                    {
                        "uuid": "artifact",
                        "targetType": 35,
                        "targetId": 8101,
                        "artifactRef": "builtin://sdkwork.skills.prompt_optimizer@1.0.0",
                        "artifact": media_resource(
                            "data/skills/artifacts/prompt-optimizer-1.0.0.json",
                            "document",
                        ),
                        "version": "1.0.0",
                        "runtime": "builtin",
                        "checksumHash": checksum_hash,
                        "artifactSizeBytes": artifact_size_bytes,
                    }
                ]
            ),
            encoding="utf-8",
        )
        (manifests_root / "prompt-optimizer.json").write_text(
            json.dumps(
                {
                    "schemaVersion": "agent-skill-manifest.v1",
                    "id": 8101,
                    "uuid": "skill-prompt-optimizer",
                    "skillKey": "prompt-optimizer",
                    "name": "Prompt Optimizer",
                    "version": "1.0.0",
                    "runtime": "builtin",
                    "entrypoint": "sdkwork.skills.prompt_optimizer",
                    "capabilities": ["prompt.analysis"],
                    "configSchema": {"type": "object"},
                    "defaultConfig": {},
                    "artifacts": [
                        {
                            "artifactRef": "builtin://sdkwork.skills.prompt_optimizer@1.0.0",
                            "artifact": media_resource(
                                "data/skills/artifacts/prompt-optimizer-1.0.0.json",
                                "document",
                            ),
                            "version": "1.0.0",
                            "runtime": "builtin",
                            "checksumHash": checksum_hash,
                            "artifactSizeBytes": artifact_size_bytes,
                        }
                    ],
                }
            ),
            encoding="utf-8",
        )
        (artifacts_root / "prompt-optimizer-1.0.0.json").write_text(artifact_payload_text, encoding="utf-8")

    def write_skill(self, root: Path, name: str, content: str) -> None:
        skill = root / ".agents" / "skills" / name / "SKILL.md"
        skill.parent.mkdir(parents=True, exist_ok=True)
        skill.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")

    def test_quality_gate_accepts_current_generated_artifacts(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(root, self.valid_registry())
            self.write_generated_artifacts(root, registry)
            self.write_app(root)
            self.write_frontend_contract(root)

            result = SchemaQualityGate(root=root, registry_path=registry).run()

            self.assertTrue(result.ok, result.messages)

    def test_quality_gate_reports_stale_generated_artifacts(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(root, self.valid_registry())
            self.write_generated_artifacts(root, registry)
            stale = root / "generated" / "types" / "typescript" / "domain-types.ts"
            stale.write_text("// stale\n", encoding="utf-8")
            self.write_app(root)
            self.write_frontend_contract(root)

            result = SchemaQualityGate(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(f"generated domain type is stale: {stale}", result.messages)

    def test_quality_gate_reports_stale_schema_manifest(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(root, self.valid_registry())
            self.write_generated_artifacts(root, registry)
            manifest = SchemaManifestGenerator(root=root, registry_path=registry).write()
            manifest.write_text("{}\n", encoding="utf-8")
            self.write_app(root)
            self.write_frontend_contract(root)

            result = SchemaQualityGate(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(f"schema manifest is stale: {manifest}", result.messages)

    def test_quality_gate_reports_stale_openapi_components(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(root, self.valid_registry())
            self.write_generated_artifacts(root, registry)
            components = OpenApiComponentGenerator(root=root, registry_path=registry).write()
            components.write_text("components: {}\n", encoding="utf-8")
            self.write_app(root)
            self.write_frontend_contract(root)

            result = SchemaQualityGate(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(f"openapi schema components are stale: {components}", result.messages)

    def test_quality_gate_reports_stale_api_contract_manifest(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(root, self.valid_registry())
            self.write_generated_artifacts(root, registry)
            manifest = ApiContractManifestGenerator(root=root).write()
            manifest.write_text("{}\n", encoding="utf-8")
            self.write_app(root)
            self.write_frontend_contract(root)

            result = SchemaQualityGate(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(f"api contract manifest is stale: {manifest}", result.messages)

    def test_quality_gate_reports_stale_clawrouter_openapi(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(root, self.valid_registry())
            self.write_generated_artifacts(root, registry)
            stale = root / "generated" / "openapi" / "clawrouter-app-openapi.json"
            stale.write_text("{}\n", encoding="utf-8")
            self.write_app(root)
            self.write_frontend_contract(root)

            result = SchemaQualityGate(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(f"clawrouter app OpenAPI spec is stale: {stale}", result.messages)

    def test_quality_gate_reports_stale_gateway_openapi(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(root, self.valid_registry())
            self.write_generated_artifacts(root, registry)
            stale = root / "apps" / "sdkwork-clawrouter-pc" / "public" / "openapi.json"
            stale_spec = json.loads(stale.read_text(encoding="utf-8"))
            stale_spec["info"]["description"] = "Stale generated fixture"
            stale.write_text(json.dumps(stale_spec, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            self.write_app(root)
            self.write_frontend_contract(root)

            result = SchemaQualityGate(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(f"Claw Router gateway OpenAPI spec is stale: {stale}", result.messages)

    def test_quality_gate_reports_openapi_response_precision_drift(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(root, self.valid_registry())
            contract = root / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
            contract.parent.mkdir(parents=True, exist_ok=True)
            contract.write_text(
                textwrap.dedent(
                    """
                    routes:
                      - route: /models
                        required_tables: [ai_model_vendor]
                        required_columns:
                          ai_model_vendor: [vendor_code, display_name]
                    frontend_operations:
                      - source: apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-models/src/modelService.ts
                        operation: fetchModelVendors
                        route: /models
                        kind: read
                        api_surface: app
                        api_method: GET
                        api_path: /app/v3/api/model_vendors
                        query_parameters: []
                        read_sources: [ai_model_vendor]
                        write_tables: []
                        response_schema:
                          name: ModelVendorListResponse
                          type: object
                          properties:
                            items:
                              type: array
                              items:
                                type: object
                                additionalProperties: false
                                name: ModelVendorListItem
                                required: [id, vendorCode]
                                properties:
                                  id: { type: string }
                                  vendorCode: { type: string }
                    """
                ).strip()
                + "\n",
                encoding="utf-8",
            )
            self.write_generated_artifacts(root, registry)
            source = (
                root
                / "apps"
                / "sdkwork-clawrouter-pc"
                / "packages"
                / "sdkwork-clawrouter-pc-console-models"
                / "src"
                / "modelService.ts"
            )
            source.parent.mkdir(parents=True, exist_ok=True)
            source.write_text(
                textwrap.dedent(
                    """
                    import { getClawRouterAppSdkClient } from '@sdkwork-clawrouter/commons';

                    export async function fetchModelVendors() {
                      return getClawRouterAppSdkClient().ai.modelVendors.list();
                    }
                    """
                ).strip()
                + "\n",
                encoding="utf-8",
            )
            FrontendOperationAudit(root=root).write()
            spec_path = root / "generated" / "openapi" / "clawrouter-app-openapi.json"
            spec = json.loads(spec_path.read_text(encoding="utf-8"))
            spec["paths"]["/app/v3/api/ai/model_vendors"]["get"]["responses"]["200"]["content"]["application/json"]["schema"] = {
                "$ref": "#/components/schemas/PlusApiResult"
            }
            spec_path.write_text(json.dumps(spec, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            self.write_app(root)

            result = SchemaQualityGate(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app modelVendors.list 200 response must reference #/components/schemas/ModelVendorsListResult",
                result.messages,
            )

    def test_quality_gate_reports_openapi_contract_strength_drift(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(root, self.valid_registry())
            self.write_generated_artifacts(root, registry)
            spec_path = root / "generated" / "openapi" / "clawrouter-app-openapi.json"
            spec = json.loads(spec_path.read_text(encoding="utf-8"))
            spec["components"]["schemas"]["OperationRequest"] = {
                "type": "object",
                "additionalProperties": {"$ref": "#/components/schemas/JsonValue"},
            }
            spec_path.write_text(json.dumps(spec, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            self.write_app(root)
            self.write_frontend_contract(root)

            result = SchemaQualityGate(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app schema component OperationRequest is forbidden; use operation-specific request DTOs",
                result.messages,
            )

    def test_quality_gate_reports_generated_sdk_gap(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(root, self.valid_registry())
            self.write_generated_artifacts(root, registry)
            (root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "package.json").write_text('{"name":"wrong"}\n', encoding="utf-8")
            self.write_app(root)
            self.write_frontend_contract(root)

            result = SchemaQualityGate(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "clawrouter-app-sdk-typescript package.json name must be @sdkwork/clawrouter-app-sdk",
                result.messages,
            )

    def test_quality_gate_reports_project_skill_gap(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(root, self.valid_registry())
            self.write_generated_artifacts(root, registry)
            (root / ".agents" / "skills" / "clawrouter-sdk-generation" / "SKILL.md").write_text(
                "incomplete\n",
                encoding="utf-8",
            )
            self.write_app(root)
            self.write_frontend_contract(root)

            result = SchemaQualityGate(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn("skill clawrouter-sdk-generation must mention @sdkwork/clawrouter-app-sdk", result.messages)

    def test_quality_gate_reports_architecture_standard_drift(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(root, self.valid_registry())
            self.write_generated_artifacts(root, registry)
            drift = root / "docs" / "02-技术架构设计.md"
            drift.write_text("Spring-first with Rust/Pingora Sidecar\n", encoding="utf-8")
            self.write_app(root)
            self.write_frontend_contract(root)

            result = SchemaQualityGate(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "architecture doc docs/02-技术架构设计.md contains forbidden Spring-first drift term: Spring-first",
                result.messages,
            )

    def test_quality_gate_reports_frontend_contract_gaps(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(root, self.valid_registry())
            self.write_generated_artifacts(root, registry)
            self.write_app(
                root,
                """
                <Routes>
                  <Route path="/models" element={<Models />} />
                  <Route path="/console/account" element={<AccountView />} />
                </Routes>
                """,
            )
            self.write_frontend_contract(root)

            result = SchemaQualityGate(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn("frontend route missing from schema manifest: /console/account", result.messages)

    def test_quality_gate_reports_stale_java_legacy_audit(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(root, self.valid_registry())
            self.write_generated_artifacts(root, registry)
            audit = JavaLegacyContractAudit(root=root, registry_path=registry).write()
            audit.write_text("{}\n", encoding="utf-8")
            self.write_app(root)
            self.write_frontend_contract(root)

            result = SchemaQualityGate(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(f"java legacy contract audit is stale: {audit}", result.messages)

    def test_quality_gate_reports_flyway_schema_contract_drift(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "legacy-java-plus-workspace" / "apps" / "sdkwork-clawrouter"
            registry = self.write_registry(root, self.valid_registry())
            self.write_generated_artifacts(root, registry)
            self.write_app(root)
            self.write_frontend_contract(root)
            self.write_default_flyway(
                root,
                """
                CREATE INDEX IF NOT EXISTS idx_ai_model_vendor_vendor_code
                    ON ai_model_vendor (vendor_code);
                """,
            )

            result = SchemaQualityGate(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "ai_model_vendor registry must mirror Flyway index idx_ai_model_vendor_vendor_code on vendor_code",
                result.messages,
            )

    def test_quality_gate_reports_stale_frontend_field_audit(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(root, self.valid_registry())
            self.write_generated_artifacts(root, registry)
            stale = FrontendFieldAudit(root=root).write()
            stale.write_text("{}\n", encoding="utf-8")
            self.write_app(root)
            self.write_frontend_contract(root)

            result = SchemaQualityGate(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(f"frontend field audit is stale: {stale}", result.messages)

    def test_quality_gate_reports_stale_modular_frontend_contract_snapshot(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(root, self.valid_registry())
            self.write_generated_artifacts(root, registry)
            self.write_app(root)
            self.write_frontend_contract(root)
            self.write_frontend_contract_index(
                root,
                """
                routes:
                  - route: /models
                    required_tables: [ai_model_vendor]
                    required_columns:
                      ai_model_vendor: [vendor_code, display_name]
                frontend_operations: []
                frontend_models: []
                """,
            )

            result = SchemaQualityGate(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(
                f"frontend field contract snapshot is stale: {root / 'docs' / 'schema-registry' / 'frontend-field-contracts.yaml'}",
                result.messages,
            )

    def test_quality_gate_reports_stale_frontend_operation_audit(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(root, self.valid_registry())
            self.write_generated_artifacts(root, registry)
            stale = FrontendOperationAudit(root=root).write()
            stale.write_text("{}\n", encoding="utf-8")
            self.write_app(root)
            self.write_frontend_contract(root)

            result = SchemaQualityGate(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn(f"frontend operation audit is stale: {stale}", result.messages)

    def test_quality_gate_includes_payload_sdk_audit(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(root, self.valid_registry())
            self.write_generated_artifacts(root, registry)
            self.write_app(root)
            self.write_frontend_contract(root)

            with patch("tools.schema_quality_gate.ClawRouterPayloadSdkAudit") as audit_class:
                audit_class.return_value.run.return_value = Mock(ok=False, messages=["payload sdk audit drift"])

                result = SchemaQualityGate(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn("payload sdk audit drift", result.messages)

    def test_quality_gate_includes_openapi_contract_audit(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(root, self.valid_registry())
            self.write_generated_artifacts(root, registry)
            self.write_app(root)
            self.write_frontend_contract(root)

            with patch("tools.schema_quality_gate.ClawRouterOpenApiContractAudit") as audit_class:
                audit_class.return_value.run.return_value = Mock(ok=False, messages=["openapi contract audit drift"])

                result = SchemaQualityGate(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn("openapi contract audit drift", result.messages)

    def test_quality_gate_includes_appbase_capability_guardian_when_appbase_exists(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(root, self.valid_registry())
            self.write_generated_artifacts(root, registry)
            self.write_app(root)
            self.write_frontend_contract(root)
            (root / "sdkwork-appbase").mkdir()

            with patch("tools.schema_quality_gate.AppbaseCapabilityGuardian") as guardian_class:
                guardian_class.return_value.run.return_value = Mock(ok=False, messages=["appbase capability drift"])

                result = SchemaQualityGate(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn("appbase capability drift", result.messages)

    def test_quality_gate_includes_appbase_integration_guardian_when_manifest_exists(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(root, self.valid_registry())
            self.write_generated_artifacts(root, registry)
            self.write_app(root)
            self.write_frontend_contract(root)
            integration = root / "specs" / "appbase-integration.yaml"
            integration.parent.mkdir(parents=True, exist_ok=True)
            integration.write_text("kind: sdkwork.appbase.integration\n", encoding="utf-8")

            with patch("tools.schema_quality_gate.AppbaseIntegrationGuardian") as guardian_class:
                guardian_class.return_value.run.return_value = Mock(ok=False, messages=["appbase integration drift"])

                result = SchemaQualityGate(root=root, registry_path=registry).run()

            self.assertFalse(result.ok)
            self.assertIn("appbase integration drift", result.messages)


def artifact_payload_checksum(payload: dict) -> str:
    canonical = dict(payload)
    canonical.pop("checksumHash", None)
    encoded = json.dumps(canonical, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return "sha256:" + hashlib.sha256(encoded).hexdigest()


if __name__ == "__main__":
    unittest.main()
