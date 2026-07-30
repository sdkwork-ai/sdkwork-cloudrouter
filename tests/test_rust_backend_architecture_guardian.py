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
                "upstream_credential",
            ),
            "crates/sdkwork-claw-health": ("health",),
            "crates/sdkwork-claw-security": ("headers", "redaction"),
            "crates/sdkwork-claw-http": ("auth", "contract_routes", "error", "health", "headers", "router"),
            "crates/sdkwork-claw-observability": ("tracing_setup",),
            "crates/sdkwork-clawrouter-edge-runtime": ("runtime",),
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
            "mod chat_completion_relay;\nmod chat_completion_stream_relay;\nmod embeddings_relay;\nmod gateway_usage_recorder;\nmod pricing_catalog;\nmod provider_secret_resolver;\nmod responses_relay;\nmod upstream_account_route_catalog;\nmod usage_settlement_store;\n",
            encoding="utf-8",
        )
        product_ports.joinpath("chat_completion_relay.rs").write_text("// ChatCompletionRelay port\n", encoding="utf-8")
        product_ports.joinpath("chat_completion_stream_relay.rs").write_text("// ChatCompletionStreamRelay port\n", encoding="utf-8")
        product_ports.joinpath("embeddings_relay.rs").write_text("// EmbeddingsRelay port\n", encoding="utf-8")
        product_ports.joinpath("gateway_usage_recorder.rs").write_text("// GatewayUsageRecorder GatewayUsageRecordCommand port\n", encoding="utf-8")
        product_ports.joinpath("pricing_catalog.rs").write_text("// PricingCatalog port\n", encoding="utf-8")
        product_ports.joinpath("provider_secret_resolver.rs").write_text("// ProviderSecretResolver port\n", encoding="utf-8")
        product_ports.joinpath("responses_relay.rs").write_text("// ResponsesRelay port\n", encoding="utf-8")
        product_ports.joinpath("upstream_account_route_catalog.rs").write_text(
            "// UpstreamAccountRouteCatalog shared immutable route snapshot port\n",
            encoding="utf-8",
        )
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
            "pub mod catalog;\npub mod postgres;\nmod queries;\npub mod rows;\n",
            encoding="utf-8",
        )
        product_sql.joinpath("catalog.rs").write_text("// sql catalog snapshot\n", encoding="utf-8")
        product_sql.joinpath("rows.rs").write_text("// sql row mappers\n", encoding="utf-8")
        product_queries = product_sql / "queries"
        product_queries.mkdir(parents=True, exist_ok=True)
        product_queries.joinpath("mod.rs").write_text("mod lookup;\nmod snapshot;\n", encoding="utf-8")
        product_queries.joinpath("lookup.rs").write_text("// request lookup query text builders\n", encoding="utf-8")
        product_queries.joinpath("snapshot.rs").write_text("// snapshot load query text builders\n", encoding="utf-8")
        product_postgres = product_sql / "postgres"
        product_postgres.mkdir(parents=True, exist_ok=True)
        product_postgres.joinpath("mod.rs").write_text("mod error;\nmod gateway_usage_recorder;\nmod loader;\nmod row_mapping;\nmod usage_settlement_store;\n", encoding="utf-8")
        product_postgres.joinpath("error.rs").write_text("// postgres load errors\n", encoding="utf-8")
        product_postgres.joinpath("gateway_usage_recorder.rs").write_text("// PostgresGatewayUsageRecorder ai_request_trace ai_usage\n", encoding="utf-8")
        product_postgres.joinpath("loader.rs").write_text("// postgres catalog loader\n", encoding="utf-8")
        product_postgres.joinpath("row_mapping.rs").write_text("// postgres row mapping\n", encoding="utf-8")
        product_postgres.joinpath("usage_settlement_store.rs").write_text("// PostgresUsageSettlementStore commerce_usage_settlement plus_account_history settlement_status INSUFFICIENT_POINTS\n", encoding="utf-8")

        boundary_services = (
            ("crates/sdkwork-clawrouter-edge-runtime", None),
            (
                "services/sdkwork-clawrouter-admin-gateway",
                ("sdkwork-routes-clawrouter-backend-api", "sdkwork_routes_clawrouter_backend_api"),
            ),
            (
                "services/sdkwork-clawrouter-standalone-gateway",
                ("sdkwork-routes-clawrouter-app-api", "sdkwork_routes_clawrouter_app_api"),
            ),
        )
        for service, route in boundary_services:
            service_root = root / service
            service_root.mkdir(parents=True, exist_ok=True)
            route_dependency = ""
            if route is not None:
                route_dependency = f'\n{route[0]} = {{ path = "../../crates/{route[0]}" }}'
            service_root.joinpath("Cargo.toml").write_text(
                textwrap.dedent(
                    f"""
                    [package]
                    name = "service"

                    [dependencies]
                    sdkwork-claw-config = {{ path = "../../crates/sdkwork-claw-config" }}
                    sdkwork-claw-http = {{ path = "../../crates/sdkwork-claw-http" }}
                    sdkwork-claw-observability = {{ path = "../../crates/sdkwork-claw-observability" }}
                    axum.workspace = true
                    tokio.workspace = true
                    anyhow.workspace = true{route_dependency}
                    """
                ).strip()
                + "\n",
                encoding="utf-8",
            )
            service_root.joinpath("src").mkdir(parents=True, exist_ok=True)
            lib_text = "pub fn router() { sdkwork_claw_http::service_router(\"service\"); }\n"
            if service == "crates/sdkwork-clawrouter-edge-runtime":
                lib_text = "pub mod runtime;\npub fn router() { sdkwork_claw_http::service_router(\"service\"); }\n"
            elif route is not None:
                lib_text = f"pub use {route[1]}::*;\n"
            service_root.joinpath("src", "lib.rs").write_text(lib_text, encoding="utf-8")

        for route_crate in (
            "crates/sdkwork-routes-clawrouter-app-api",
            "crates/sdkwork-routes-clawrouter-backend-api",
        ):
            route_src = root / route_crate / "src"
            route_src.mkdir(parents=True, exist_ok=True)
            route_src.joinpath("web_bootstrap.rs").write_text("// sdkwork-web-framework boundary\n", encoding="utf-8")

        doc = root / "docs" / "architecture" / "tech" / "TECH-29-rust-backend-module-standard.md"
        doc.parent.mkdir(parents=True, exist_ok=True)
        doc.write_text(
            "# Rust Backend Module Standard\n\n"
            + "\n".join(RustBackendArchitectureGuardian.REQUIRED_DOC_TERMS)
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
            service = root / "crates" / "sdkwork-clawrouter-edge-runtime"
            service.joinpath("Cargo.toml").write_text("[package]\nname = \"service\"\n", encoding="utf-8")
            service.joinpath("src", "lib.rs").write_text("pub fn router() {}\n", encoding="utf-8")

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("crates/sdkwork-clawrouter-edge-runtime/Cargo.toml must depend on sdkwork-claw-http", result.messages)
            self.assertIn("crates/sdkwork-clawrouter-edge-runtime/src/lib.rs must build routers through sdkwork_claw_http::service_router", result.messages)

    def test_reports_service_without_common_runtime_config_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            service = root / "services" / "sdkwork-clawrouter-standalone-gateway"
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
                "services/sdkwork-clawrouter-standalone-gateway/Cargo.toml must depend on sdkwork-claw-config",
                result.messages,
            )

    def test_reports_gateway_without_runtime_module(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            gateway_lib = root / "crates" / "sdkwork-clawrouter-edge-runtime" / "src" / "lib.rs"
            gateway_lib.write_text(
                gateway_lib.read_text(encoding="utf-8").replace("pub mod runtime;\n", ""),
                encoding="utf-8",
            )
            root.joinpath("crates", "sdkwork-clawrouter-edge-runtime", "src", "runtime.rs").unlink(missing_ok=True)

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("crates/sdkwork-clawrouter-edge-runtime/src/lib.rs must declare module: runtime", result.messages)

    def test_reports_missing_module_standard_doc_terms(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "architecture" / "tech" / "TECH-29-rust-backend-module-standard.md"
            doc.write_text("Rust-first only\n", encoding="utf-8")

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("docs/architecture/tech/TECH-29-rust-backend-module-standard.md must mention required backend module term: sdkwork-api-clawrouter-assembly", result.messages)
            self.assertIn("docs/architecture/tech/TECH-29-rust-backend-module-standard.md must mention required backend module term: backpressure", result.messages)

    def test_reports_missing_postgres_only_standard_doc_terms(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "architecture" / "tech" / "TECH-29-rust-backend-module-standard.md"
            doc.write_text(
                doc.read_text(encoding="utf-8").replace(
                    "There is no server SQLite", "Server database"
                ),
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("docs/architecture/tech/TECH-29-rust-backend-module-standard.md must mention required backend module term: There is no server SQLite", result.messages)

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
            self.assertIn("crates/sdkwork-claw-security/src/lib.rs must stay below 120 non-empty lines", result.messages)

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

    def test_rejects_server_side_sqlite_persistence_modules(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            sqlite_dir = root / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql" / "sqlite"
            sqlite_dir.mkdir(parents=True)
            sqlite_dir.joinpath("loader.rs").write_text("// forbidden server SQLite loader\n", encoding="utf-8")

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite must not contain server persistence adapters; PostgreSQL is the authoritative server database",
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
            postgres_dir = sql_dir / "postgres"
            postgres_dir.joinpath("gateway_usage_recorder.rs").unlink()

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/gateway_usage_recorder.rs is required for PostgreSQL GatewayUsageRecorder adapter",
                result.messages,
            )

    def test_reports_missing_usage_settlement_sql_adapters(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            sql_dir = root / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql"
            postgres_dir = sql_dir / "postgres"
            postgres_dir.joinpath("usage_settlement_store.rs").unlink()

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
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
                        "mod chat_completion_relay;\nmod chat_completion_stream_relay;\nmod embeddings_relay;\nmod gateway_usage_recorder;\nmod pricing_catalog;\nmod provider_secret_resolver;\nmod responses_relay;\nmod upstream_account_route_catalog;\nmod usage_settlement_store;\n",
                        encoding="utf-8",
                    )
                    module_dir.joinpath("chat_completion_relay.rs").write_text("// ChatCompletionRelay port\n", encoding="utf-8")
                    module_dir.joinpath("chat_completion_stream_relay.rs").write_text("// ChatCompletionStreamRelay port\n", encoding="utf-8")
                    module_dir.joinpath("embeddings_relay.rs").write_text("// EmbeddingsRelay port\n", encoding="utf-8")
                    module_dir.joinpath("gateway_usage_recorder.rs").write_text("// GatewayUsageRecorder port\n", encoding="utf-8")
                    module_dir.joinpath("pricing_catalog.rs").write_text("// PricingCatalog port\n", encoding="utf-8")
                    module_dir.joinpath("provider_secret_resolver.rs").write_text("// ProviderSecretResolver port\n", encoding="utf-8")
                    module_dir.joinpath("responses_relay.rs").write_text("// ResponsesRelay port\n", encoding="utf-8")
                    module_dir.joinpath("upstream_account_route_catalog.rs").write_text(
                        "// UpstreamAccountRouteCatalog port\n", encoding="utf-8"
                    )
                    module_dir.joinpath("usage_settlement_store.rs").write_text("// UsageSettlementStore port\n", encoding="utf-8")
                else:
                    module_dir.joinpath("mod.rs").write_text("// module\n", encoding="utf-8")

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_reports_missing_api_assembly_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "architecture" / "tech" / "TECH-29-rust-backend-module-standard.md"
            doc.write_text(doc.read_text(encoding="utf-8").replace("sdkwork-api-clawrouter-assembly", "api-assembly"), encoding="utf-8")

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("docs/architecture/tech/TECH-29-rust-backend-module-standard.md must mention required backend module term: sdkwork-api-clawrouter-assembly", result.messages)

    def test_reports_missing_postgres_only_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "architecture" / "tech" / "TECH-29-rust-backend-module-standard.md"
            doc.write_text(doc.read_text(encoding="utf-8").replace("There is no server SQLite", "Server database"), encoding="utf-8")

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/architecture/tech/TECH-29-rust-backend-module-standard.md must mention required backend module term: There is no server SQLite",
                result.messages,
            )

    def test_reports_missing_bounded_pool_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "architecture" / "tech" / "TECH-29-rust-backend-module-standard.md"
            doc.write_text(
                doc.read_text(encoding="utf-8").replace("bounded database pools", "database pools"),
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/architecture/tech/TECH-29-rust-backend-module-standard.md must mention required backend module term: bounded database pools",
                result.messages,
            )

    def test_reports_missing_tenant_scope_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "architecture" / "tech" / "TECH-29-rust-backend-module-standard.md"
            doc.write_text(doc.read_text(encoding="utf-8").replace("tenant and organization", "tenant scope"), encoding="utf-8")

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/architecture/tech/TECH-29-rust-backend-module-standard.md must mention required backend module term: tenant and organization",
                result.messages,
            )

    def test_reports_missing_pagination_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "architecture" / "tech" / "TECH-29-rust-backend-module-standard.md"
            doc.write_text(doc.read_text(encoding="utf-8").replace("pagination", "paging"), encoding="utf-8")

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/architecture/tech/TECH-29-rust-backend-module-standard.md must mention required backend module term: pagination",
                result.messages,
            )

    def test_reports_missing_bounded_limit_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "architecture" / "tech" / "TECH-29-rust-backend-module-standard.md"
            doc.write_text(doc.read_text(encoding="utf-8").replace("bounded limits", "limits"), encoding="utf-8")

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/architecture/tech/TECH-29-rust-backend-module-standard.md must mention required backend module term: bounded limits",
                result.messages,
            )

    def test_reports_missing_app_api_path_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "architecture" / "tech" / "TECH-29-rust-backend-module-standard.md"
            doc.write_text(doc.read_text(encoding="utf-8").replace("/app/v3/api", "/app/api"), encoding="utf-8")

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/architecture/tech/TECH-29-rust-backend-module-standard.md must mention required backend module term: /app/v3/api",
                result.messages,
            )

    def test_reports_missing_backend_api_path_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "architecture" / "tech" / "TECH-29-rust-backend-module-standard.md"
            doc.write_text(
                doc.read_text(encoding="utf-8").replace("/backend/v3/api", "/backend/api"),
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/architecture/tech/TECH-29-rust-backend-module-standard.md must mention required backend module term: /backend/v3/api",
                result.messages,
            )

    def test_reports_missing_open_api_path_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "architecture" / "tech" / "TECH-29-rust-backend-module-standard.md"
            doc.write_text(
                doc.read_text(encoding="utf-8").replace("/v1", "/open-api"),
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/architecture/tech/TECH-29-rust-backend-module-standard.md must mention required backend module term: /v1",
                result.messages,
            )

    def test_reports_missing_usage_recording_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "architecture" / "tech" / "TECH-29-rust-backend-module-standard.md"
            doc.write_text(
                doc.read_text(encoding="utf-8").replace("PostgresGatewayUsageRecorder", "UsageRecorder"),
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/architecture/tech/TECH-29-rust-backend-module-standard.md must mention required backend module term: PostgresGatewayUsageRecorder",
                result.messages,
            )

    def test_reports_missing_payment_webhook_secret_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "architecture" / "tech" / "TECH-29-rust-backend-module-standard.md"
            doc.write_text(
                doc.read_text(encoding="utf-8").replace("SDKWORK_CLAW_PAYMENT_WEBHOOK_SECRET", "payment webhook secret"),
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/architecture/tech/TECH-29-rust-backend-module-standard.md must mention required backend module term: SDKWORK_CLAW_PAYMENT_WEBHOOK_SECRET",
                result.messages,
            )

    def test_reports_missing_async_lock_rule_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "architecture" / "tech" / "TECH-29-rust-backend-module-standard.md"
            doc.write_text(
                doc.read_text(encoding="utf-8").replace("Do not hold locks across `.await`", "Do not hold async locks"),
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/architecture/tech/TECH-29-rust-backend-module-standard.md must mention required backend module term: Do not hold locks across `.await`",
                result.messages,
            )

    def test_reports_missing_backpressure_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "architecture" / "tech" / "TECH-29-rust-backend-module-standard.md"
            doc.write_text(
                doc.read_text(encoding="utf-8").replace("backpressure", "flow control"),
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/architecture/tech/TECH-29-rust-backend-module-standard.md must mention required backend module term: backpressure",
                result.messages,
            )

    def test_reports_missing_settlement_locking_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "architecture" / "tech" / "TECH-29-rust-backend-module-standard.md"
            doc.write_text(
                doc.read_text(encoding="utf-8").replace("FOR UPDATE SKIP LOCKED", "row lock"),
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/architecture/tech/TECH-29-rust-backend-module-standard.md must mention required backend module term: FOR UPDATE SKIP LOCKED",
                result.messages,
            )

    def test_reports_missing_layering_verification_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "architecture" / "tech" / "TECH-29-rust-backend-module-standard.md"
            doc.write_text(
                doc.read_text(encoding="utf-8").replace("node ../sdkwork-specs/tools/check-application-layering.mjs --root .", "layering check"),
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/architecture/tech/TECH-29-rust-backend-module-standard.md must mention required backend module term: node ../sdkwork-specs/tools/check-application-layering.mjs --root .",
                result.messages,
            )

    def test_reports_missing_composition_verification_doc_standard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_valid_workspace(root)
            doc = root / "docs" / "architecture" / "tech" / "TECH-29-rust-backend-module-standard.md"
            doc.write_text(
                doc.read_text(encoding="utf-8").replace(
                    "node ../sdkwork-specs/tools/check-rust-backend-composition.mjs --root .",
                    "composition check",
                ),
                encoding="utf-8",
            )

            result = RustBackendArchitectureGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "docs/architecture/tech/TECH-29-rust-backend-module-standard.md must mention required backend module term: node ../sdkwork-specs/tools/check-rust-backend-composition.mjs --root .",
                result.messages,
            )


if __name__ == "__main__":
    unittest.main()
