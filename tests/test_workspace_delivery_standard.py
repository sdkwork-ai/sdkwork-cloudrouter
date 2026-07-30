import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class WorkspaceDeliveryStandardTest(unittest.TestCase):
    def test_root_package_exposes_standard_verification_and_postgres_entrypoints(self) -> None:
        package_json = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
        scripts = package_json["scripts"]

        self.assertEqual(
            "node scripts/run-postgres-integration.mjs",
            scripts["test:postgres"],
        )
        self.assertEqual(
            "node scripts/run-postgres-integration.mjs --require-database",
            scripts["test:postgres:required"],
        )
        self.assertEqual(
            "node scripts/run-postgres-integration.mjs --with-docker",
            scripts["test:postgres:docker"],
        )
        self.assertEqual(
            "node scripts/verify-claw-router-application.mjs",
            scripts["verify"],
        )
        self.assertEqual(
            "node scripts/plan-claw-router-install-packages.mjs",
            scripts["install:packages:plan"],
        )
        self.assertEqual(
            "node scripts/plan-claw-router-install-packages.mjs --check",
            scripts["install:packages:check"],
        )
        self.assertEqual(
            "node scripts/build-claw-router-install-package.mjs",
            scripts["install:package:build"],
        )
        self.assertEqual(
            "node scripts/build-claw-router-install-package.mjs --check --dry-run --all",
            scripts["install:package:check"],
        )
        self.assertEqual(
            "node scripts/smoke-install-package-init.mjs --check --dry-run",
            scripts["install:init:smoke"],
        )

    def test_portal_production_build_declares_node_heap_budget_in_build_entrypoint(self) -> None:
        portal_package_json = json.loads(
            (
                ROOT
                / "apps"
                / "sdkwork-clawrouter-pc"
                / "package.json"
            ).read_text(encoding="utf-8")
        )
        build_script = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "scripts"
            / "build-portal.mjs"
        ).read_text(encoding="utf-8")

        self.assertEqual("pnpm deps:check && node scripts/build-portal.mjs", portal_package_json["scripts"]["build"])
        self.assertIn("MAX_OLD_SPACE_SIZE_MB = 8192", build_script)
        self.assertIn("CLAWROUTER_PORTAL_BUILD_HEAP_BOOTSTRAPPED", build_script)
        self.assertIn("process.execPath", build_script)
        self.assertIn("spawnSync(", build_script)
        self.assertIn("stdio: 'inherit'", build_script)
        self.assertIn("process.exit(result.status", build_script)
        self.assertIn("configLoader: 'native'", build_script)
        self.assertNotIn("buildServer", build_script)
        self.assertNotIn("build-server.mjs", build_script)

    def test_production_browser_smoke_uses_isolated_rust_edge_startup_contract(self) -> None:
        smoke_script = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "scripts"
            / "smoke-production-browser.mjs"
        ).read_text(encoding="utf-8")

        self.assertIn("EDGE_SERVER_STARTUP_TIMEOUT_MS", smoke_script)
        self.assertIn("CLAWROUTER_EDGE_STARTUP_TIMEOUT_MS", smoke_script)
        self.assertIn("CLAWROUTER_BROWSER_SMOKE_CARGO_TARGET_DIR", smoke_script)
        self.assertIn("target-codex", smoke_script)
        self.assertIn("browser-smoke-edge", smoke_script)
        self.assertIn("CARGO_TARGET_DIR", smoke_script)
        self.assertIn("browserSmokeStderrTail", smoke_script)
        self.assertIn("Rust edge server exited before readiness", smoke_script)
        self.assertIn("Rust edge server startup stderr", smoke_script)
        self.assertIn("Date.now() + EDGE_SERVER_STARTUP_TIMEOUT_MS", smoke_script)
        self.assertIn("Date.now() + ROUTE_RENDER_TIMEOUT_MS", smoke_script)
        self.assertIn("--no-sandbox", smoke_script)
        self.assertIn("browserSmokeStderrTail", smoke_script)
        self.assertIn("Browser process exited before CDP command", smoke_script)
        self.assertIn("cleanupBrowserUserDataDir", smoke_script)
        self.assertIn("EBUSY", smoke_script)
        self.assertIn("EPERM", smoke_script)
        self.assertIn("browser user data dir cleanup skipped", smoke_script)
        self.assertIn("PROCESS_SHUTDOWN_TIMEOUT_MS", smoke_script)
        self.assertIn("verifiedRouteCount", smoke_script)
        self.assertIn("Browser smoke did not verify any production routes", smoke_script)
        self.assertIn("BROWSER_SMOKE_ROUTES.length", smoke_script)
        self.assertIn("browserSmokeCompleted", smoke_script)
        self.assertIn("Browser smoke exited before completing production route verification", smoke_script)
        self.assertIn("primarySmokeError", smoke_script)
        self.assertIn("if (!primarySmokeError && !browserSmokeCompleted", smoke_script)
        self.assertIn("setActiveRoute(pathName)", smoke_script)
        self.assertIn("Network.responseReceived", smoke_script)
        self.assertIn("requestUrlsById", smoke_script)
        self.assertIn("routeIssuePrefix", smoke_script)

    def test_postgres_integration_runner_supports_optional_required_and_docker_modes(self) -> None:
        runner = ROOT / "scripts" / "run-postgres-integration.mjs"
        self.assertTrue(runner.exists())
        source = runner.read_text(encoding="utf-8")

        self.assertIn("SDKWORK_DATABASE_URL", source)
        self.assertIn("--require-database", source)
        self.assertIn("--with-docker", source)
        self.assertIn("docker-compose.postgres-test.yml", source)
        self.assertIn("sdkwork-clawrouter-postgres-test", source)
        self.assertIn("Docker engine is not available", source)
        self.assertIn("docker version", source)
        self.assertIn("cargo", source)
        self.assertIn("sdkwork-clawrouter-router-service", source)
        self.assertNotIn("postgres_generation_history_sql_contract", source)
        self.assertIn("postgres_transaction_integration", source)

    def test_postgres_docker_compose_is_ephemeral_and_health_checked(self) -> None:
        compose = ROOT / "docker-compose.postgres-test.yml"
        self.assertTrue(compose.exists())
        source = compose.read_text(encoding="utf-8")

        self.assertIn("postgres:16-alpine", source)
        self.assertIn("POSTGRES_DB: sdkwork_ai_test", source)
        self.assertIn("POSTGRES_USER: sdkwork_ai_test", source)
        self.assertIn("POSTGRES_PASSWORD: sdkwork_ai_test_password", source)
        self.assertIn("${SDKWORK_CLAW_POSTGRES_TEST_PORT:-15432}:5432", source)
        self.assertIn("tmpfs:", source)
        self.assertIn("/var/lib/postgresql/data", source)
        self.assertIn("healthcheck:", source)
        self.assertIn("pg_isready", source)

    def test_workspace_gitignore_excludes_dependency_and_build_artifacts(self) -> None:
        ignored = {
            line.strip()
            for line in (ROOT / ".gitignore").read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.strip().startswith("#")
        }

        for pattern in [
            "node_modules/",
            "apps/*/node_modules/",
            "apps/*/dist/",
            "apps/*/.vite/",
            "sdks/*/node_modules/",
            "sdks/*/dist/",
            "sdks/*/*/node_modules/",
            "sdks/*/*/dist/",
            "sdks/*/*/build/",
            "sdks/*/*/target/",
            "sdks/*/*/obj/",
            "sdks/*/*/.dart_tool/",
            "sdks/*/*/.sdkwork/manual-backups/",
            "sdks/*/*-typescript/node_modules/",
            "sdks/*/*-typescript/dist/",
            "target/",
        ]:
            with self.subTest(pattern=pattern):
                self.assertIn(pattern, ignored)

    def test_large_skill_seed_aggregates_are_lfs_managed(self) -> None:
        attributes = {
            line.strip()
            for line in (ROOT / ".gitattributes").read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.strip().startswith("#")
        }

        for path in [
            "data/skills/skills.json",
            "data/skills/artifacts.json",
            "data/skills/assets.json",
            "data/skills/clawhub/raw/checkpoint.json",
            "data/skills/clawhub/raw/index.json",
        ]:
            with self.subTest(path=path):
                self.assertIn(
                    f"{path} filter=lfs diff=lfs merge=lfs -text",
                    attributes,
                    "large skill seed aggregates must stay in Git LFS instead of normal Git blobs",
                )

    def test_root_delivery_documents_are_readable_and_actionable(self) -> None:
        required_snippets = [
            "pnpm verify",
            "pnpm test:postgres",
            "pnpm test:postgres:required",
            "pnpm test:postgres:docker",
            "SDKWORK_DATABASE_URL",
            "PORTAL_PUBLIC_API_BASE_URL",
            "PORTAL_PUBLIC_APP_API_BASE_URL",
            "PORTAL_PUBLIC_BACKEND_API_BASE_URL",
            "PORTAL_PUBLIC_TOOL_API_ENABLED",
            "scripts/release-environment-contract.mjs",
            ".env.release.example",
            ".env.release",
            "--env-file",
            "pnpm release:env:write",
            "pnpm install:packages:plan",
            "pnpm install:packages:check",
            "pnpm install:package:build",
            "pnpm install:package:check",
            "pnpm install:init:smoke",
            "scripts/plan-claw-router-install-packages.mjs",
            "scripts/build-claw-router-install-package.mjs",
            "scripts/smoke-install-package-init.mjs",
            "install-packages-manifest.json",
            "config/clawrouter.toml.example",
            "SDKWORK_CLAW_CONFIG_FILE",
            "SDKWORK_DATABASE_URL",
            "SDKWORK_DATABASE_MAX_CONNECTIONS",
            "macos-arm64-desktop",
            "windows-x64-service",
            "linux-arm64-container",
            "--check",
            "Docker Desktop",
            "--skip-contract-guardians",
            "tools.repository_delivery_guardian",
            "tools.clawrouter_sdk_guardian",
            "tools.clawrouter_gateway_openapi_generator",
            "tools.frontend_contract_guardian",
            "tools.frontend_static_source_manifest",
            "frontend-static-source-snapshots.yaml",
            "frontend-static-source-manifest.json",
            "frontend-route-classification.yaml",
            "schema_provenanced_content",
            "local_developer_tool_api",
            "tools.java_legacy_contract_audit",
        ]
        document_specific_snippets = {
            "README.md": [
                "server release profiles and default to external PostgreSQL",
                "desktop package dry-runs use",
                "a file-backed SQLite URL",
                "clawrouterctl ensure",
                "clawrouterctl refresh-catalog --force",
            ],
            "CHECK_RESULT.md": [
                "server release profiles and default to PostgreSQL",
                "desktop packages default to a local SQLite",
                "sdkwork-claw-installer ensure",
                "sdkwork-claw-installer refresh-catalog --force",
            ],
        }
        mojibake_markers = [
            chr(codepoint)
            for codepoint in [
                0x934F,
                0x6D93,
                0x59DD,
                0x5BEE,
                0x95B3,
                0x00E9,
                0x00E6,
                0x00E7,
                0xFFFD,
            ]
        ]

        for relative_path in ["README.md", "CHECK_RESULT.md"]:
            with self.subTest(path=relative_path):
                content = (ROOT / relative_path).read_text(encoding="utf-8")
                invalid_chars = {
                    char
                    for char in content
                    if char not in "\n\r\t" and (
                        ord(char) < 32
                        or 0x7F <= ord(char) <= 0x9F
                        or 0xE000 <= ord(char) <= 0xF8FF
                    )
                }
                self.assertEqual(
                    set(),
                    invalid_chars,
                    f"{relative_path} must stay readable UTF-8 without control or private-use characters",
                )
                for marker in mojibake_markers:
                    self.assertNotIn(marker, content)
                for snippet in required_snippets + document_specific_snippets[relative_path]:
                    self.assertIn(snippet, content)


if __name__ == "__main__":
    unittest.main()
