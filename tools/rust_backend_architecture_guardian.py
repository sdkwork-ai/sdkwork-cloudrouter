from __future__ import annotations

import argparse
import tomllib
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class RustBackendArchitectureGuardianResult:
    ok: bool
    messages: list[str]


class RustBackendArchitectureGuardian:
    """Validate Rust backend module boundaries that make the architecture executable."""

    REQUIRED_WORKSPACE_MEMBERS: tuple[str, ...] = (
        "crates/sdkwork-claw-contract",
        "crates/sdkwork-claw-config",
        "crates/sdkwork-claw-health",
        "crates/sdkwork-claw-security",
        "crates/sdkwork-claw-http",
        "crates/sdkwork-claw-observability",
        "crates/sdkwork-routes-clawrouter-app-api",
        "crates/sdkwork-routes-clawrouter-backend-api",
        "crates/sdkwork-clawrouter-edge-runtime",
        "services/sdkwork-clawrouter-admin-gateway",
        "services/sdkwork-clawrouter-standalone-gateway",
        "services/sdkwork-clawrouter-router-service",
    )
    HTTP_BOUNDARY_SERVICES: tuple[str, ...] = (
        "crates/sdkwork-clawrouter-edge-runtime",
        "services/sdkwork-clawrouter-admin-gateway",
        "services/sdkwork-clawrouter-standalone-gateway",
    )
    THIN_ROUTE_GATEWAYS: dict[str, tuple[str, str]] = {
        "services/sdkwork-clawrouter-admin-gateway": (
            "sdkwork_routes_clawrouter_backend_api",
            "crates/sdkwork-routes-clawrouter-backend-api",
        ),
        "services/sdkwork-clawrouter-standalone-gateway": (
            "sdkwork_routes_clawrouter_app_api",
            "crates/sdkwork-routes-clawrouter-app-api",
        ),
    }
    REQUIRED_WORKSPACE_DEPENDENCIES: tuple[str, ...] = (
        "axum",
        "tokio",
        "tower",
        "tower-http",
        "tracing",
        "serde",
        "serde_json",
        "hmac",
        "hex",
        "sha2",
        "bytes",
        "http-body-util",
        "hyper",
        "hyper-util",
        "hyper-rustls",
        "sqlx",
        "anyhow",
    )
    LIB_RS_MAX_NON_EMPTY_LINES = 120
    REQUIRED_CRATE_MODULES: dict[str, tuple[str, ...]] = {
        "crates/sdkwork-claw-contract": ("api_surface", "manifest", "operation", "path_pattern"),
        "crates/sdkwork-claw-config": (
            "api_key",
            "database",
            "deployment",
            "provider_relay",
            "provider_secret_map",
            "runtime",
            "upstream_credential",
        ),
        "crates/sdkwork-claw-health": ("health",),
        "crates/sdkwork-claw-security": ("headers", "redaction"),
        "crates/sdkwork-claw-http": ("auth", "contract_routes", "error", "health", "headers", "router"),
        "crates/sdkwork-claw-observability": ("tracing_setup",),
        "crates/sdkwork-clawrouter-edge-runtime": ("runtime",),
        "services/sdkwork-clawrouter-router-service": (
            "api",
            "application",
            "domain",
            "identity",
            "infrastructure",
            "ports",
        ),
    }
    MODULE_STANDARD_DOC = "docs/architecture/tech/TECH-29-rust-backend-module-standard.md"
    REQUIRED_DOC_TERMS: tuple[str, ...] = (
        "Rust-first",
        "sdkwork-claw-security",
        "sdkwork-claw-http",
        "Hexagonal architecture",
        "api",
        "application",
        "domain",
        "ports",
        "adapters",
        "infrastructure",
        "bootstrap",
        "/app/v3/api",
        "/backend/v3/api",
        "/v1",
        "axum",
        "tokio",
        "tower",
        "tower-http",
        "connection pool",
        "RuntimeConfig",
        "SDKWORK_CLAW_GATEWAY_BIND",
        "SDKWORK_CLAW_APP_API_BIND",
        "SDKWORK_CLAW_ADMIN_API_BIND",
        "valid socket address",
        "DatabaseConfig",
        "SDKWORK_DATABASE_URL",
        "DatabaseHealth",
        "configured",
        "maxConnections",
        "must not expose database URLs",
        "streaming",
        "backpressure",
        "timeout",
        "request id",
        "tracing",
        "redaction",
        "sensitive headers",
        "authorization",
        "ApiKeyIdentity",
        "ApiKeySecretHasher",
        "ApiKeySecurityConfig",
        "SDKWORK_CLAW_API_KEY_PEPPER",
        "HmacSha256ApiKeySecretHasher",
        "iam_gateway_api_key.key_hash",
        "no plaintext API key storage",
        "HMAC",
        "pepper",
        "Authorization: Bearer",
        "x-api-key",
        "x-goog-api-key",
        "query key",
        "business handlers must not parse raw auth headers",
        "idempotency",
        "audit log",
        "rate limit",
        "CORS",
        "security headers",
        "manifest-driven contract route",
        "501",
        "no fake success",
        "Product implementation",
        "PricingCatalog",
        "ModelCatalogQueryService",
        "PriceAvailability",
        "lowest upstream cost",
        "AdminModelRoute",
        "OpenAIModelsRoute",
        "/v1/models",
        "OpenAIChatCompletionsRoute",
        "/v1/chat/completions",
        "OpenAIResponsesRoute",
        "/v1/responses",
        "LlmInputToken",
        "responses_relay_not_configured",
        "ResponsesRelay",
        "ResponsesRelayRequest",
        "OpenAiCompatibleResponsesRelay",
        "SecretRefOpenAiCompatibleResponsesRelay",
        "OpenAIEmbeddingsRoute",
        "/v1/embeddings",
        "EmbeddingInputToken",
        "embedding_relay_not_configured",
        "EmbeddingsRelay",
        "EmbeddingsRelayRequest",
        "OpenAiCompatibleEmbeddingsRelay",
        "SecretRefOpenAiCompatibleEmbeddingsRelay",
        "ChatCompletionRelay",
        "ChatCompletionRelayRequest",
        "ChatCompletionStreamRelay",
        "ChatCompletionStreamRelayResponse",
        "GatewayUsageRecorder",
        "GatewayUsageRecordCommand",
        "PostgresGatewayUsageRecorder",
        "ai_request_trace",
        "ai_usage",
        "provider_usage_record_failed",
        "stream_options",
        "include_usage",
        "StreamingUsageRecordingBody",
        "streaming usage",
        "UsageSettlementStore",
        "UsageSettlementCommand",
        "UsageSettlementOutcome",
        "UsageSettlementWorker",
        "UsageSettlementWorkerConfig",
        "PostgresUsageSettlementStore",
        "commerce_usage_settlement",
        "plus_account_history",
        "settlement_status",
        "settlement_id",
        "INSUFFICIENT_POINTS",
        "background worker",
        "schema readiness",
        "SDKWORK_CLAW_USAGE_SETTLEMENT_WORKER_ENABLED",
        "SDKWORK_CLAW_USAGE_SETTLEMENT_BATCH_SIZE",
        "SDKWORK_CLAW_USAGE_SETTLEMENT_INTERVAL_MILLIS",
        "FOR UPDATE SKIP LOCKED",
        "OpenAiCompatibleChatCompletionStreamRelay",
        "SecretRefOpenAiCompatibleChatCompletionStreamRelay",
        "streaming_relay_not_configured",
        "text/event-stream",
        "SSE",
        "provider_base_url",
        "provider_secret_ref",
        "ProviderSecretResolver",
        "ProviderSecretMapConfig",
        "SDKWORK_CLAW_PROVIDER_SECRET_MAP_JSON",
        "ProviderSecretMapResolver",
        "SecretRefOpenAiCompatibleChatCompletionRelay",
        "provider_relay_not_configured",
        "ProviderRelayConfig",
        "SDKWORK_CLAW_OPENAI_RELAY_BASE_URL",
        "SDKWORK_CLAW_OPENAI_RELAY_BEARER_TOKEN",
        "OpenAiCompatibleChatCompletionRelay",
        "UpstreamProviderEndpoint",
        "absolute http or https provider URL",
        "hyper",
        "hyper-rustls",
        "TLS connector",
        "normalize the /v1 prefix",
        "never send /v1/v1/...",
        "provider response timeout",
        "ai_upstream_account.timeout_ms",
        "ai_upstream_account.retry_policy",
        "request-context provider timeout",
        "request-context provider retry policy",
        "ProviderRetryPolicy",
        "strict JSON",
        "non-stream JSON relay",
        "transient provider retry",
        "retryable upstream status",
        "stream adapters must not retry",
        "no plaintext provider secret storage",
        "GatewayRouterError",
        "infrastructure/sql",
        "PostgreSQL loader",
        "immutable snapshot",
        "Schema Registry table names",
        "decimal strings",
        "generated enums",
        "no ai_pricing_group",
        "lib.rs",
        "thin orchestration entrypoint",
        "submodules",
    )

    def __init__(self, root: Path) -> None:
        self.root = Path(root).resolve()

    def run(self) -> RustBackendArchitectureGuardianResult:
        messages: list[str] = []
        workspace = self._load_toml(self.root / "Cargo.toml", messages)
        if workspace is not None:
            messages.extend(self._check_workspace(workspace))
        messages.extend(self._check_library_entrypoints())
        messages.extend(self._check_http_boundary_services())
        messages.extend(self._check_product_ports_boundary())
        messages.extend(self._check_product_provider_boundary())
        messages.extend(self._check_product_sql_boundary())
        messages.extend(self._check_module_standard_doc())
        return RustBackendArchitectureGuardianResult(ok=not messages, messages=messages)

    def _check_workspace(self, workspace: dict[str, Any]) -> list[str]:
        messages: list[str] = []
        workspace_section = workspace.get("workspace", {})
        members = workspace_section.get("members", []) if isinstance(workspace_section, dict) else []
        if not isinstance(members, list):
            members = []
        normalized_members = {self._normalize_path(member) for member in members if isinstance(member, str)}
        for member in self.REQUIRED_WORKSPACE_MEMBERS:
            if member not in normalized_members:
                messages.append(f"Cargo workspace must include member: {member}")
            elif not (self.root / member / "Cargo.toml").exists():
                messages.append(f"Cargo workspace member must contain Cargo.toml: {member}")

        dependencies = workspace_section.get("dependencies", {}) if isinstance(workspace_section, dict) else {}
        if not isinstance(dependencies, dict):
            dependencies = {}
        for dependency in self.REQUIRED_WORKSPACE_DEPENDENCIES:
            if dependency not in dependencies:
                messages.append(f"Cargo workspace dependencies must include: {dependency}")
        return messages

    def _check_library_entrypoints(self) -> list[str]:
        messages: list[str] = []
        for crate_path, modules in self.REQUIRED_CRATE_MODULES.items():
            lib_path = self.root / crate_path / "src" / "lib.rs"
            if not lib_path.exists():
                messages.append(f"{crate_path}/src/lib.rs is missing")
                continue
            text = lib_path.read_text(encoding="utf-8")
            non_empty_lines = [line for line in text.splitlines() if line.strip()]
            if len(non_empty_lines) > self.LIB_RS_MAX_NON_EMPTY_LINES:
                messages.append(
                    f"{crate_path}/src/lib.rs must stay below {self.LIB_RS_MAX_NON_EMPTY_LINES} non-empty lines"
                )

            for module in modules:
                declarations = (
                    f"pub mod {module};",
                    f"mod {module};",
                )
                if not any(declaration in text for declaration in declarations):
                    messages.append(f"{crate_path}/src/lib.rs must declare module: {module}")
                if not self._module_exists(crate_path, module):
                    messages.append(f"{crate_path}/src/{module}.rs or src/{module}/mod.rs is missing")
        return messages

    def _check_http_boundary_services(self) -> list[str]:
        messages: list[str] = []
        for service in self.HTTP_BOUNDARY_SERVICES:
            cargo_path = self.root / service / "Cargo.toml"
            service_toml = self._load_toml(cargo_path, messages)
            if service_toml is not None:
                dependencies = service_toml.get("dependencies", {})
                if not isinstance(dependencies, dict) or "sdkwork-claw-config" not in dependencies:
                    messages.append(f"{service}/Cargo.toml must depend on sdkwork-claw-config")

                thin_route = self.THIN_ROUTE_GATEWAYS.get(service)
                if thin_route is None:
                    if not isinstance(dependencies, dict) or "sdkwork-claw-http" not in dependencies:
                        messages.append(f"{service}/Cargo.toml must depend on sdkwork-claw-http")
                else:
                    route_dep = thin_route[1].split("/")[-1].replace("-", "_")
                    route_crate_key = next(
                        (
                            key
                            for key in (dependencies or {})
                            if key.replace("-", "_") == route_dep.replace("-", "_")
                            or key == thin_route[1].split("/")[-1]
                        ),
                        None,
                    )
                    expected_keys = {
                        thin_route[1].split("/")[-1],
                        thin_route[0].replace("_", "-"),
                    }
                    if not isinstance(dependencies, dict) or not any(
                        key in dependencies for key in expected_keys
                    ):
                        messages.append(
                            f"{service}/Cargo.toml must depend on route crate {thin_route[1]}"
                        )

            lib_path = self.root / service / "src" / "lib.rs"
            if not lib_path.exists():
                messages.append(f"{service}/src/lib.rs is missing")
                continue
            text = lib_path.read_text(encoding="utf-8")
            thin_route = self.THIN_ROUTE_GATEWAYS.get(service)
            if thin_route is None:
                if "sdkwork_claw_http::service_router" not in text:
                    messages.append(
                        f"{service}/src/lib.rs must build routers through sdkwork_claw_http::service_router"
                    )
                continue

            route_module = thin_route[0]
            route_crate = self.root / thin_route[1]
            bootstrap_path = route_crate / "src" / "web_bootstrap.rs"
            if route_module not in text:
                messages.append(
                    f"{service}/src/lib.rs must re-export thin route crate module {route_module}"
                )
            if not bootstrap_path.exists():
                messages.append(
                    f"{thin_route[1]}/src/web_bootstrap.rs is required for sdkwork-web-framework HTTP boundary"
                )
        return messages

    def _check_module_standard_doc(self) -> list[str]:
        path = self.root / self.MODULE_STANDARD_DOC
        if not path.exists():
            return [f"backend module standard doc is missing: {self.MODULE_STANDARD_DOC}"]
        text = path.read_text(encoding="utf-8")
        messages: list[str] = []
        for term in self.REQUIRED_DOC_TERMS:
            if term not in text:
                messages.append(f"{self.MODULE_STANDARD_DOC} must mention required backend module term: {term}")
        return messages

    def _check_product_ports_boundary(self) -> list[str]:
        messages: list[str] = []
        ports_dir = (
            self.root
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "ports"
        )
        ports_mod = ports_dir / "mod.rs"
        if not ports_mod.exists():
            return [
                "services/sdkwork-clawrouter-router-service/src/ports/mod.rs is required for product port boundaries"
            ]

        text = ports_mod.read_text(encoding="utf-8")
        required_modules = {
            "chat_completion_relay": "ChatCompletionRelay provider relay port",
            "chat_completion_stream_relay": "ChatCompletionStreamRelay provider streaming relay port",
            "embeddings_relay": "EmbeddingsRelay provider relay port",
            "gateway_usage_recorder": "GatewayUsageRecorder usage fact and request trace writer port",
            "pricing_catalog": "PricingCatalog product catalog port",
            "provider_secret_resolver": "ProviderSecretResolver secret_ref lookup port",
            "responses_relay": "ResponsesRelay provider relay port",
            "upstream_account_route_catalog": "UpstreamAccountRouteCatalog shared immutable route snapshot port",
            "usage_settlement_store": "UsageSettlementStore usage fact settlement and account ledger port",
        }
        for module, purpose in required_modules.items():
            if f"mod {module};" not in text and f"pub mod {module};" not in text:
                messages.append(
                    f"services/sdkwork-clawrouter-router-service/src/ports/mod.rs must declare {module} module"
                )
            if not ports_dir.joinpath(f"{module}.rs").exists():
                messages.append(
                    f"services/sdkwork-clawrouter-router-service/src/ports/{module}.rs is required for {purpose}"
                )
        return messages

    def _check_product_sql_boundary(self) -> list[str]:
        messages: list[str] = []
        infrastructure_mod = (
            self.root
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "mod.rs"
        )
        if not infrastructure_mod.exists():
            messages.append(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/mod.rs is required for product infrastructure submodules"
            )
        else:
            text = infrastructure_mod.read_text(encoding="utf-8")
            if "pub mod sql;" not in text and "mod sql;" not in text:
                messages.append(
                    "services/sdkwork-clawrouter-router-service/src/infrastructure/mod.rs must declare sql module"
                )

        sql_mod = (
            self.root
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "mod.rs"
        )
        if not sql_mod.exists():
            messages.append(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/mod.rs is required for PricingCatalog SQL boundaries"
            )
        else:
            text = sql_mod.read_text(encoding="utf-8")
            if "catalog" not in text:
                messages.append(
                    "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/mod.rs must declare catalog module"
                )
            if "queries" not in text:
                messages.append(
                    "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/mod.rs must declare queries module"
                )
            if "rows" not in text:
                messages.append(
                    "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/mod.rs must declare rows module"
                )

        required_files = {
            "catalog.rs": "PricingCatalog SQL snapshots",
            "rows.rs": "PricingCatalog SQL row mappers",
        }
        sql_dir = (
            self.root
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
        )
        for filename, purpose in required_files.items():
            if not sql_dir.joinpath(filename).exists():
                messages.append(
                    f"services/sdkwork-clawrouter-router-service/src/infrastructure/sql/{filename} is required for {purpose}"
                )
        query_dir = sql_dir / "queries"
        required_query_files = {
            "mod.rs": "PricingCatalog SQL query module",
            "lookup.rs": "PricingCatalog SQL lookup query boundaries",
            "snapshot.rs": "PricingCatalog SQL snapshot load query boundaries",
        }
        for filename, purpose in required_query_files.items():
            if not query_dir.joinpath(filename).exists():
                messages.append(
                    f"services/sdkwork-clawrouter-router-service/src/infrastructure/sql/queries/{filename} is required for {purpose}"
                )
        sqlite_dir = sql_dir / "sqlite"
        if sqlite_dir.exists() and any(path.is_file() for path in sqlite_dir.rglob("*")):
            messages.append(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite must not contain server persistence adapters; PostgreSQL is the authoritative server database"
            )
        postgres_dir = sql_dir / "postgres"
        required_postgres_files = {
            "mod.rs": "PostgreSQL PricingCatalog module",
            "error.rs": "PostgreSQL PricingCatalog load errors",
            "loader.rs": "PostgreSQL PricingCatalog loader",
            "gateway_usage_recorder.rs": "PostgreSQL GatewayUsageRecorder adapter",
            "usage_settlement_store.rs": "PostgreSQL UsageSettlementStore adapter",
            "row_mapping.rs": "PostgreSQL PricingCatalog row mapping",
        }
        for filename, purpose in required_postgres_files.items():
            if not postgres_dir.joinpath(filename).exists():
                messages.append(
                    f"services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/{filename} is required for {purpose}"
                )
        return messages

    def _check_product_provider_boundary(self) -> list[str]:
        messages: list[str] = []
        infrastructure_mod = (
            self.root
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "mod.rs"
        )
        if not infrastructure_mod.exists():
            messages.append(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/mod.rs is required for product infrastructure submodules"
            )
        else:
            text = infrastructure_mod.read_text(encoding="utf-8")
            if "pub mod provider;" not in text and "mod provider;" not in text:
                messages.append(
                    "services/sdkwork-clawrouter-router-service/src/infrastructure/mod.rs must declare provider module"
                )

        provider_mod = (
            self.root
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "provider"
            / "mod.rs"
        )
        if not provider_mod.exists():
            messages.append(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/provider/mod.rs is required for provider relay adapters"
            )
        else:
            text = provider_mod.read_text(encoding="utf-8")
            if "openai_compatible_relay" not in text:
                messages.append(
                    "services/sdkwork-clawrouter-router-service/src/infrastructure/provider/mod.rs must declare openai_compatible_relay module"
                )
            if "provider_secret_map_resolver" not in text:
                messages.append(
                    "services/sdkwork-clawrouter-router-service/src/infrastructure/provider/mod.rs must declare provider_secret_map_resolver module"
                )

        provider_dir = (
            self.root
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "provider"
        )
        if not provider_dir.joinpath("openai_compatible_relay.rs").exists():
            messages.append(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/provider/openai_compatible_relay.rs is required for OpenAI-compatible provider relay"
            )
        if not provider_dir.joinpath("provider_secret_map_resolver.rs").exists():
            messages.append(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/provider/provider_secret_map_resolver.rs is required for provider secret map resolver"
            )
        return messages

    def _load_toml(self, path: Path, messages: list[str]) -> dict[str, Any] | None:
        if not path.exists():
            messages.append(f"TOML file is missing: {self._display_path(path)}")
            return None
        try:
            payload = tomllib.loads(path.read_text(encoding="utf-8"))
        except tomllib.TOMLDecodeError as exc:
            messages.append(f"TOML file is invalid: {self._display_path(path)}: {exc}")
            return None
        if not isinstance(payload, dict):
            messages.append(f"TOML file root must be a table: {self._display_path(path)}")
            return None
        return payload

    def _normalize_path(self, value: str) -> str:
        return value.replace("\\", "/").strip("/")

    def _module_exists(self, crate_path: str, module: str) -> bool:
        src = self.root / crate_path / "src"
        return src.joinpath(f"{module}.rs").exists() or src.joinpath(module, "mod.rs").exists()

    def _display_path(self, path: Path) -> str:
        try:
            return path.relative_to(self.root).as_posix()
        except ValueError:
            return path.as_posix()


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate sdkwork-clawrouter Rust backend module boundaries.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    args = parser.parse_args()

    result = RustBackendArchitectureGuardian(root=args.root).run()
    if result.ok:
        print("Rust backend architecture guardian passed")
        return 0
    for message in result.messages:
        print(message)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
