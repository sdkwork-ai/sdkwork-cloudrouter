import hashlib
import json
import tempfile
import textwrap
import unittest
from pathlib import Path

from tools.frontend_contract_guardian import FrontendContractGuardian


class FrontendContractGuardianTest(unittest.TestCase):
    def write_app(self, root: Path, content: str) -> Path:
        app = root / "apps" / "sdkwork-clawrouter-pc" / "src" / "App.tsx"
        app.parent.mkdir(parents=True, exist_ok=True)
        app.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        self.write_standard_sdk_client_boundary(root)
        return app

    def write_manifest(self, root: Path, manifest: dict) -> Path:
        path = root / "generated" / "schema" / "manifest" / "schema-manifest.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return path

    def write_contract(self, root: Path, content: str) -> Path:
        path = root / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return path

    def write_modular_contract(self, root: Path, content: str) -> Path:
        fragment = root / "docs" / "schema-registry" / "frontend-field-contracts" / "routes" / "demo.yaml"
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
                  - routes/demo.yaml
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )
        return index

    def write_catalog_source(self, root: Path, relative_path: str, content: str) -> str:
        path = root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()

    def write_route_classification(self, root: Path, content: str) -> Path:
        path = root / "docs" / "schema-registry" / "frontend-route-classification.yaml"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return path

    def write_static_source_manifest(self, root: Path, manifest: dict) -> Path:
        path = root / "generated" / "schema" / "frontend" / "frontend-static-source-manifest.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        return path

    def write_vite_config(self, root: Path, content: str) -> Path:
        path = root / "apps" / "sdkwork-clawrouter-pc" / "vite.config.ts"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return path

    def write_portal_package(self, root: Path, content: str) -> Path:
        path = root / "apps" / "sdkwork-clawrouter-pc" / "package.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return path

    def write_portal_build_script(self, root: Path, content: str) -> Path:
        path = root / "apps" / "sdkwork-clawrouter-pc" / "scripts" / "build-portal.mjs"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return path

    def write_portal_source(self, root: Path, relative_path: str, content: str) -> Path:
        path = root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return path

    def write_standard_sdk_client_boundary(self, root: Path) -> Path:
        self.write_standard_runtime_env(root)
        path = (
            root
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawroutes-pc-commons"
            / "src"
            / "sdk-clients.ts"
        )
        if path.exists():
            return path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            textwrap.dedent(
                """
                import { SdkworkAppClient } from '@sdkwork/clawrouter-app-sdk';
                import { SdkworkBackendClient } from '@sdkwork/clawrouter-backend-sdk';
                import { SdkworkAiClient } from '@sdkwork/clawrouter-open-sdk';
                import { normalizeGeneratedSdkBaseUrl } from './sdk-base-url';

                const APP_API_PREFIX = '/app/v3/api';
                const BACKEND_API_PREFIX = '/backend/v3/api';
                const OPEN_API_PREFIX = '/v1';

                export interface ClawRouterAppSdkClientOptions {
                  accessToken?: string;
                  appBaseUrl?: string;
                  authToken?: string;
                  platform?: string;
                  timeout?: number;
                }

                export interface ClawRouterBackendSdkClientOptions {
                  accessToken?: string;
                  backendBaseUrl?: string;
                  authToken?: string;
                  platform?: string;
                  timeout?: number;
                }

                export interface ClawRouterAiSdkClientOptions {
                  accessToken?: string;
                  aiBaseUrl?: string;
                  apiKey?: string;
                  authToken?: string;
                  platform?: string;
                  timeout?: number;
                }

                export function getClawRouterAppSdkClient(options: ClawRouterAppSdkClientOptions = {}) {
                  return new SdkworkAppClient({
                    baseUrl: normalizeGeneratedSdkBaseUrl(options.appBaseUrl ?? APP_API_PREFIX, APP_API_PREFIX),
                    accessToken: options.accessToken,
                    authToken: options.authToken,
                    platform: options.platform,
                    timeout: options.timeout,
                  });
                }

                export function getClawRouterBackendSdkClient(options: ClawRouterBackendSdkClientOptions = {}) {
                  return new SdkworkBackendClient({
                    baseUrl: normalizeGeneratedSdkBaseUrl(options.backendBaseUrl ?? BACKEND_API_PREFIX, BACKEND_API_PREFIX),
                    accessToken: options.accessToken,
                    authToken: options.authToken,
                    platform: options.platform,
                    timeout: options.timeout,
                  });
                }

                export function getClawRouterAiSdkClient(options: ClawRouterAiSdkClientOptions = {}) {
                  return new SdkworkAiClient({
                    baseUrl: normalizeGeneratedSdkBaseUrl(options.aiBaseUrl ?? OPEN_API_PREFIX, OPEN_API_PREFIX),
                    accessToken: options.accessToken,
                    apiKey: options.apiKey,
                    authToken: options.authToken,
                    platform: options.platform,
                    timeout: options.timeout,
                  });
                }
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )
        return path

    def write_standard_runtime_env(self, root: Path) -> Path:
        path = (
            root
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawroutes-pc-commons"
            / "src"
            / "utils"
            / "env.ts"
        )
        if path.exists():
            return path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            textwrap.dedent(
                """
                type ClawRouterRuntimeWindow = Window & {
                  __CLAWROUTER_ENV__?: Record<string, unknown>;
                };

                const DEFAULT_API_BASE_URL = '/v1';

                export function readClawRouterRuntimeEnv(name: string): string | undefined {
                  if (typeof window === 'undefined') {
                    return undefined;
                  }
                  const value = (window as ClawRouterRuntimeWindow).__CLAWROUTER_ENV__?.[name];
                  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
                }

                export const API_BASE_URL = DEFAULT_API_BASE_URL;
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )
        return path

    def test_extracts_actual_routes_from_nested_portal_routes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(
                root,
                """
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/models" element={<Models />} />
                  <Route path="/console" element={<ConsoleLayout />}>
                    <Route index element={<Navigate to="/console/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardView />} />
                    <Route path="api-keys" element={<ApiKeysView />} />
                  </Route>
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="ratelimit" element={<RateLimitAdmin />} />
                  </Route>
                  <Route path="*" element={<MainLayout />} />
                </Routes>
                """,
            )

            routes = FrontendContractGuardian(root=root).extract_portal_routes()

            self.assertEqual(
                ["/", "/admin/ratelimit", "/console/api-keys", "/console/dashboard", "/models"],
                routes,
            )

    def test_extracts_contracted_child_routes_from_wildcard_mount(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(
                root,
                """
                <Routes>
                  <Route path="/auth/*" element={<AuthRoutes />} />
                </Routes>
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /auth/login
                    required_tables: [iam_user]
                  - route: /auth/register
                    required_tables: [iam_user]
                frontend_operations: []
                frontend_models: []
                """,
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                routes:
                  - route: /auth/login
                    package: portal-root
                    owner: public-portal
                    route_scope: public
                    delivery_kind: sdk_backed_business_runtime
                    api_surface: app
                    evidence: [apps/sdkwork-clawrouter-pc/src/App.tsx]
                  - route: /auth/register
                    package: portal-root
                    owner: public-portal
                    route_scope: public
                    delivery_kind: sdk_backed_business_runtime
                    api_surface: app
                    evidence: [apps/sdkwork-clawrouter-pc/src/App.tsx]
                """,
            )

            routes = FrontendContractGuardian(root=root).extract_portal_routes()

            self.assertEqual(["/auth/login", "/auth/register"], routes)

    def test_browser_source_files_ignore_dependency_and_build_artifact_directories(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/service.ts",
                "export const value = 1;",
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/node_modules/sdkwork-code-generator/src/index.ts",
                "import 'sdkwork-code-generator';",
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/dist/bundle.ts",
                "import 'sdkwork-code-generator';",
            )

            files = FrontendContractGuardian(root=root)._browser_source_files(
                root / "apps" / "sdkwork-clawrouter-pc"
            )

            self.assertEqual(
                ["apps/sdkwork-clawrouter-pc/packages/demo/src/service.ts"],
                [path.relative_to(root).as_posix() for path in files],
            )

    def test_reports_frontend_route_missing_from_manifest(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(
                root,
                """
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/models" element={<Models />} />
                </Routes>
                """,
            )
            self.write_manifest(root, {"routes": {"/": {"tables": ["content_doc_page"]}}, "tables": []})
            self.write_contract(root, "routes: []")

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("frontend route missing from schema manifest: /models", result.messages)

    def test_reports_actual_route_without_field_contract(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/models" element={<Models />} />')
            self.write_manifest(root, {"routes": {"/models": {"tables": ["ai_model_vendor"]}}, "tables": []})
            self.write_contract(root, "routes: []")

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("frontend route missing field contract: /models", result.messages)

    def test_reports_required_route_tables_and_columns(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/console/account" element={<AccountView />} />')
            self.write_manifest(
                root,
                {
                    "routes": {"/console/account": {"tables": ["plus_user"]}},
                    "tables": [
                        {
                            "table": "ai_usage_fact",
                            "columns": [{"name": "modality"}],
                        }
                    ],
                },
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /console/account
                    required_tables:
                      - ai_usage_fact
                    required_columns:
                      ai_usage_fact: [modality, customer_charge_amount]
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("route /console/account requires table ai_usage_fact", result.messages)
            self.assertIn(
                "table ai_usage_fact requires column customer_charge_amount for route /console/account",
                result.messages,
            )

    def test_accepts_sdkwork_appbase_required_tables_without_router_schema_ownership(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/vip" element={<VipPurchaseView />} />')
            self.write_manifest(
                root,
                {
                    "routes": {"/vip": {"tables": ["commerce_account"]}},
                    "tables": [
                        {
                            "table": "commerce_account",
                            "columns": [{"name": "id"}],
                        }
                    ],
                },
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /vip
                    required_tables:
                      - commerce_account
                      - commerce_vip_entitlement
                      - commerce_vip_entitlement_usage
                      - commerce_vip_package
                      - commerce_vip_package_group
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertNotIn("route /vip requires table commerce_vip_entitlement", result.messages)
            self.assertNotIn("route /vip requires table commerce_vip_entitlement_usage", result.messages)
            self.assertNotIn("route /vip requires table commerce_vip_package", result.messages)
            self.assertNotIn("route /vip requires table commerce_vip_package_group", result.messages)

    def test_accepts_sdkwork_file_platform_required_tables_without_router_schema_ownership(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/admin/storage/providers" element={<StorageAdmin />} />')
            self.write_manifest(
                root,
                {
                    "routes": {"/admin/storage/providers": {"tables": ["ops_audit_log"]}},
                    "tables": [
                        {
                            "table": "ops_audit_log",
                            "columns": [{"name": "id"}],
                        }
                    ],
                },
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /admin/storage/providers
                    required_tables:
                      - object_provider
                      - object_bucket
                      - storage_default_bucket_policy
                      - storage_quota_policy
                      - storage_usage_counter
                      - storage_usage_ledger
                      - storage_usage_snapshot
                      - storage_reconciliation_run
                      - storage_gc_job
                      - ops_audit_log
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertNotIn("route /admin/storage/providers requires table object_provider", result.messages)
            self.assertNotIn("route /admin/storage/providers requires table object_bucket", result.messages)
            self.assertNotIn("route /admin/storage/providers requires table storage_usage_counter", result.messages)

    def test_accepts_required_physical_columns_for_legacy_tables(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/apps" element={<AppCenter />} />')
            self.write_manifest(
                root,
                {
                    "routes": {"/apps": {"tables": ["appstore_app"]}},
                    "tables": [
                        {
                            "table": "appstore_app",
                            "columns": [],
                            "physical_columns": {"own": ["name", "resource_list", "release_notes"]},
                        }
                    ],
                },
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /apps
                    required_tables: [appstore_app]
                    required_columns:
                      appstore_app: [name, resource_list, release_notes]
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_reports_node_only_codegen_import_from_browser_source(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            workspace = Path(tmp)
            root = workspace / "sdkwork-clawrouter"
            self.write_app(root, '<Route path="/api-reference" element={<ApiReference />} />')
            self.write_manifest(root, {"routes": {"/api-reference": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /api-reference\n")
            component = (
                workspace
                / "sdkwork-documents"
                / "apps"
                / "sdkwork-documents-pc"
                / "packages"
                / "sdkwork-documents-pc-api-reference"
                / "src"
                / "components"
                / "ApiEndpointView.tsx"
            )
            component.parent.mkdir(parents=True, exist_ok=True)
            component.write_text("import { CodeGeneratorFactory } from 'sdkwork-code-generator';\n", encoding="utf-8")

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "browser source must not import node-only package sdkwork-code-generator: "
                "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiEndpointView.tsx",
                result.messages,
            )

    def test_reports_static_route_module_imports_from_app_entry(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(
                root,
                """
                import React from 'react';
                import { Home } from 'sdkwork-clawrouter-pc-home';
                const Models = React.lazy(() => import('sdkwork-clawrouter-pc-models').then((module) => ({ default: module.Models })));
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/models" element={<Models />} />
                </Routes>
                """,
            )
            self.write_manifest(root, {"routes": {"/": {"tables": []}, "/models": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n  - route: /models\n")

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "portal App.tsx must lazy-load route package import sdkwork-clawrouter-pc-home instead of static import",
                result.messages,
            )

    def test_reports_missing_vite_manual_chunks(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            self.write_vite_config(
                root,
                """
                export default defineConfig({
                  build: {
                    target: 'esnext',
                  },
                });
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "portal Vite config must define rollupOptions.output.manualChunks for production chunk boundaries",
                result.messages,
            )

    def test_reports_vite_manual_chunks_without_local_route_package_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            self.write_vite_config(
                root,
                """
                export default defineConfig({
                  build: {
                    rollupOptions: {
                      output: {
                        manualChunks(id) {
                          if (!id.includes('node_modules')) {
                            return undefined;
                          }
                          return 'vendor';
                        },
                      },
                    },
                  },
                });
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "portal Vite manualChunks must split local sdkwork-clawrouter route packages before generic vendor chunks",
                result.messages,
            )

    def test_accepts_vite_manual_chunks_with_local_route_package_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            self.write_vite_config(
                root,
                """
                const LOCAL_ROUTE_PACKAGE_PATTERN = /sdkwork-clawrouter-/;

                export default defineConfig({
                  build: {
                    rollupOptions: {
                      output: {
                        manualChunks(id) {
                          const normalizedId = id.replaceAll('\\\\', '/');
                          const routePackageMatch = normalizedId.match(LOCAL_ROUTE_PACKAGE_PATTERN);
                          if (routePackageMatch) {
                            return routePackageMatch.groups?.packageName;
                          }
                          if (!id.includes('node_modules')) {
                            return undefined;
                          }
                          return 'vendor';
                        },
                      },
                    },
                  },
                });
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_reports_forbidden_portal_node_server_files(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            path = root / "apps" / "sdkwork-clawrouter-pc" / "server.ts"
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("export const server = true;\n", encoding="utf-8")

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "portal Node server runtime is forbidden; serve portal static and forwarding through Rust edge server: server.ts",
                result.messages,
            )

    def test_reports_portal_scripts_that_reference_node_server_runtime(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            self.write_portal_package(
                root,
                """
                {
                  "scripts": {
                    "dev": "node --experimental-strip-types server.ts",
                    "dev:browser": "node --experimental-strip-types server.ts",
                    "build": "vite build && node scripts/build-server.mjs",
                    "start": "node dist/server.mjs"
                  }
                }
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "portal package scripts must not reference server.ts, dist/server.mjs, build-server.mjs, or smoke-production-server.mjs",
                result.messages,
            )
            self.assertIn(
                "portal dev and dev:browser scripts must run Vite directly with native config loading",
                result.messages,
            )

    def test_reports_portal_build_script_that_builds_node_server(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            self.write_portal_package(
                root,
                """
                {
                  "scripts": {
                    "dev": "vite",
                    "dev:browser": "vite",
                    "build": "node scripts/build-portal.mjs"
                  }
                }
                """,
            )
            self.write_portal_build_script(
                root,
                """
                process.env.NODE_ENV = "production";

                const { build } = await import("vite");
                const { buildServer } = await import("./build-server.mjs");

                await build({ configLoader: "native" });
                await buildServer();
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "portal build script must build only Vite portal artifacts and must not build a Node server",
                result.messages,
            )

    def test_accepts_vite_only_portal_scripts_and_build(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            self.write_portal_package(
                root,
                """
                {
                  "scripts": {
                    "dev": "vite --configLoader native",
                    "dev:browser": "vite --configLoader native",
                    "build": "node scripts/build-portal.mjs",
                    "start": "node ../../scripts/start-claw-router-production.mjs"
                  }
                }
                """,
            )
            self.write_portal_build_script(
                root,
                """
                process.env.NODE_ENV = "production";

                const { build } = await import("vite");

                await build({ configLoader: "native" });
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_reports_missing_generated_sdk_client_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            boundary = (
                root
                / "apps"
                / "sdkwork-clawrouter-pc"
                / "packages"
                / "sdkwork-clawroutes-pc-commons"
                / "src"
                / "sdk-clients.ts"
            )
            boundary.unlink()

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "portal SDK client boundary is missing: apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts",
                result.messages,
            )

    def test_reports_sdk_client_boundary_without_generated_sdk_construction(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts",
                "export function getClawRouterAppSdkClient() { return {}; }",
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "sdkwork-clawroutes-pc-commons/src/sdk-clients.ts must construct generated app, backend, and AI SDK clients",
                result.messages,
            )

    def test_reports_sdk_client_boundary_with_manual_auth_escape_hatches(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts",
                """
                import { SdkworkAppClient } from '@sdkwork/clawrouter-app-sdk';
                import { SdkworkBackendClient } from '@sdkwork/clawrouter-backend-sdk';
                import { normalizeGeneratedSdkBaseUrl } from './sdk-base-url';

                export interface ClawRouterSdkClientOptions {
                  baseUrl?: string;
                  appBaseUrl?: string;
                  backendBaseUrl?: string;
                  apiKey?: string;
                  authToken?: string;
                  platform?: string;
                  timeout?: number;
                  headers?: Record<string, string>;
                }

                const APP_API_PREFIX = '/app/v3/api';
                const BACKEND_API_PREFIX = '/backend/v3/api';

                export function getClawRouterAppSdkClient() {
                  return new SdkworkAppClient({
                    baseUrl: normalizeGeneratedSdkBaseUrl('/app/v3/api', APP_API_PREFIX),
                  });
                }

                export function getClawRouterBackendSdkClient() {
                  return new SdkworkBackendClient({
                    baseUrl: normalizeGeneratedSdkBaseUrl('/backend/v3/api', BACKEND_API_PREFIX),
                  });
                }
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "sdkwork-clawroutes-pc-commons/src/sdk-clients.ts must expose separate app/backend/AI SDK option types without manual header/baseUrl escape hatches",
                result.messages,
            )

    def test_reports_external_runtime_api_base_url_defaults(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/utils/env.ts",
                """
                const DEFAULT_API_BASE_URL = 'https://api.sdkwork.com';
                export const API_BASE_URL = DEFAULT_API_BASE_URL;
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "portal runtime API base URL defaults must stay same-origin and must not fall back to external domains",
                result.messages,
            )

    def test_reports_generated_sdk_import_outside_commons_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-dashboard/src/dashboardService.ts",
                """
                import { SdkworkAppClient } from '@sdkwork/clawrouter-app-sdk';

                export const client = new SdkworkAppClient({ baseUrl: '/app/v3/api' });
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "portal packages must value-import generated SDK clients only from sdkwork-clawroutes-pc-commons SDK boundary files: "
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-dashboard/src/dashboardService.ts "
                "imports @sdkwork/clawrouter-app-sdk",
                result.messages,
            )
            self.assertIn(
                "portal packages must construct generated SDK clients only in sdkwork-clawroutes-pc-commons SDK boundary files: "
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-dashboard/src/dashboardService.ts",
                result.messages,
            )

    def test_accepts_type_only_generated_sdk_imports_outside_commons_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-dashboard/src/dashboardService.ts",
                """
                import type { AppDashboardSummary } from '@sdkwork/clawrouter-app-sdk';
                import { getClawRouterAppSdkClient, readApiRecord } from 'sdkwork-clawroutes-pc-commons/runtime';

                export async function loadDashboard(): Promise<AppDashboardSummary | undefined> {
                  const result = await getClawRouterAppSdkClient().dashboard.fetchDashboardData();
                  return readApiRecord(result) as AppDashboardSummary;
                }
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_reports_business_service_that_reads_generated_sdk_result_data_directly(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-dashboard/src/dashboardService.ts",
                """
                import { getClawRouterAppSdkClient } from 'sdkwork-clawroutes-pc-commons/runtime';

                export async function loadDashboard() {
                  const result = await getClawRouterAppSdkClient().router.fetchDashboardOverview();
                  return result.data;
                }
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "portal business service files must read generated SDK results through "
                "sdkwork-clawroutes-pc-commons/runtime helpers instead of result.data: "
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-dashboard/src/dashboardService.ts",
                result.messages,
            )

    def test_reports_business_api_prefix_outside_commons_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-dashboard/src/dashboardService.ts",
                """
                export const appBaseUrl = '/app/v3/api';
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "portal business API prefixes must be isolated to sdkwork-clawroutes-pc-commons SDK boundary files: "
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-dashboard/src/dashboardService.ts",
                result.messages,
            )

    def test_reports_raw_fetch_in_business_source(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-dashboard/src/dashboardService.ts",
                """
                export async function loadDashboard() {
                  return fetch('/dashboard');
                }
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "portal remote business calls must go through service -> generated SDK clients, not raw fetch/axios/XMLHttpRequest: "
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-dashboard/src/dashboardService.ts",
                result.messages,
            )

    def test_reports_raw_axios_in_business_source(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-user/src/userService.ts",
                """
                import axios from 'axios';

                export async function loadUsers() {
                  return axios.get('/users');
                }
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "portal remote business calls must go through service -> generated SDK clients, not raw fetch/axios/XMLHttpRequest: "
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-user/src/userService.ts",
                result.messages,
            )

    def test_accepts_business_service_that_uses_commons_sdk_client(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-dashboard/src/dashboardService.ts",
                """
                import { getClawRouterAppSdkClient } from 'sdkwork-clawroutes-pc-commons/runtime';

                export async function loadDashboard() {
                  return getClawRouterAppSdkClient().dashboard.fetchDashboardData();
                }
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_business_service_that_uses_generated_sdk_fetch_method(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-announcement/src/announcementService.ts",
                """
                import { getClawRouterBackendSdkClient } from 'sdkwork-clawroutes-pc-commons/runtime';

                export async function loadAnnouncements() {
                  return getClawRouterBackendSdkClient().announcements.fetch();
                }
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_reports_business_service_that_imports_commons_ui_root(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-dashboard/src/dashboardService.ts",
                """
                import { ensurePlusApiSuccess, getClawRouterAppSdkClient } from 'sdkwork-clawroutes-pc-commons';

                export async function loadDashboard() {
                  const result = await getClawRouterAppSdkClient().router.fetchDashboardOverview();
                  ensurePlusApiSuccess(result, 'failed');
                  return result;
                }
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "portal business service files must import runtime helpers from "
                "sdkwork-clawroutes-pc-commons/runtime instead of the commons UI root: "
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-dashboard/src/dashboardService.ts",
                result.messages,
            )

    def test_reports_browser_source_that_imports_runtime_symbols_from_commons_ui_root(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            self.write_portal_source(
                root,
                "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiEndpointView.tsx",
                """
                import { API_BASE_URL, CopyButton, resolveClawRouterRuntimeBoolean } from 'sdkwork-clawroutes-pc-commons';

                export function ApiEndpointView() {
                  return <CopyButton text={API_BASE_URL} />;
                }
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "portal browser source must import runtime helpers from sdkwork-clawroutes-pc-commons/runtime "
                "instead of the commons UI root: "
                "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiEndpointView.tsx "
                "imports API_BASE_URL, resolveClawRouterRuntimeBoolean",
                result.messages,
            )

    def test_accepts_browser_source_that_splits_ui_and_runtime_commons_imports(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            self.write_portal_source(
                root,
                "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiEndpointView.tsx",
                """
                import { CopyButton } from 'sdkwork-clawroutes-pc-commons';
                import { API_BASE_URL, resolveClawRouterRuntimeBoolean } from 'sdkwork-clawroutes-pc-commons/runtime';

                const enabled = resolveClawRouterRuntimeBoolean('VITE_TOOL_API_ENABLED', false);

                export function ApiEndpointView() {
                  return <CopyButton text={enabled ? API_BASE_URL : ''} />;
                }
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_reports_commons_ui_root_that_reexports_runtime_modules(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/index.ts",
                """
                export * from './components/CopyButton';
                export * from './sdk-clients';
                export * from './utils/env';
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "sdkwork-clawroutes-pc-commons root must not re-export runtime modules; use "
                "sdkwork-clawroutes-pc-commons/runtime for runtime helpers: "
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/index.ts "
                "exports ./sdk-clients, ./utils/env",
                result.messages,
            )

    def test_reports_admin_service_manual_session_token_reads(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-user/src/userService.ts",
                """
                import { getClawRouterBackendSdkClient, getStoredAppSessionToken } from 'sdkwork-clawroutes-pc-commons';

                export async function loadUsers() {
                  const token = getStoredAppSessionToken();
                  return getClawRouterBackendSdkClient({ authToken: token }).user.fetchUsers();
                }
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "portal admin services must let sdkwork-clawroutes-pc-commons/src/sdk-clients.ts inject session tokens: "
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-user/src/userService.ts",
                result.messages,
            )

    def test_reports_random_business_facts_in_contracted_frontend_model_source(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/console/dashboard" element={<Dashboard />} />')
            self.write_manifest(
                root,
                {
                    "routes": {"/console/dashboard": {"tables": ["ai_usage_fact"]}},
                    "tables": [{"table": "ai_usage_fact", "columns": [{"name": "request_count"}]}],
                },
            )
            source_path = (
                "apps/sdkwork-clawrouter-pc/packages/"
                "sdkwork-clawrouter-pc-console-dashboard/src/dashboardService.ts"
            )
            self.write_contract(
                root,
                f"""
                frontend_models:
                  - route: /console/dashboard
                    source: {source_path}
                    interface: DashboardData
                    fields: [requests]
                    data_sources: [ai_usage_fact]
                routes:
                  - route: /console/dashboard
                    required_tables: [ai_usage_fact]
                    required_columns:
                      ai_usage_fact: [request_count]
                """,
            )
            self.write_portal_source(
                root,
                source_path,
                """
                export function getDashboardData() {
                  return [{ requests: Math.floor(Math.random() * 1000) }];
                }
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "frontend model source apps/sdkwork-clawrouter-pc/packages/"
                "sdkwork-clawrouter-pc-console-dashboard/src/dashboardService.ts "
                "must not generate business facts with Math.random",
                result.messages,
            )

    def test_reports_actual_route_without_route_classification(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(
                root,
                """
                <Routes>
                  <Route path="/models" element={<Models />} />
                  <Route path="/console/dashboard" element={<Dashboard />} />
                </Routes>
                """,
            )
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/models": {
                            "required_api_surface": "app",
                            "route_scope": "public",
                            "tables": ["ai_model"],
                        },
                        "/console/dashboard": {
                            "required_api_surface": "app",
                            "route_scope": "console",
                            "tables": ["ai_usage_fact"],
                        },
                    },
                    "tables": [
                        {"table": "ai_model", "columns": [{"name": "model"}]},
                        {"table": "ai_usage_fact", "columns": [{"name": "request_count"}]},
                    ],
                },
            )
            self.write_contract(
                root,
                """
                frontend_operations:
                  - route: /console/dashboard
                    source: apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-dashboard/src/dashboardService.ts
                    operation: fetchDashboardOverview
                    api_surface: app
                routes:
                  - route: /models
                    required_tables: [ai_model]
                  - route: /console/dashboard
                    required_tables: [ai_usage_fact]
                """,
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /models
                    package: sdkwork-clawrouter-pc-models
                    owner: public-portal
                    route_scope: public
                    delivery_kind: schema_provenanced_content
                    provenance_tables: [ai_model]
                    evidence: [generated/schema/manifest/schema-manifest.json]
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "frontend route missing delivery classification: /console/dashboard",
                result.messages,
            )

    def test_reports_missing_route_classification_when_required(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/models" element={<Models />} />')
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/models": {
                            "required_api_surface": "app",
                            "route_scope": "public",
                            "tables": ["ai_model"],
                        },
                    },
                    "tables": [{"table": "ai_model", "columns": [{"name": "model"}]}],
                },
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /models
                    required_tables: [ai_model]
                """,
            )

            result = FrontendContractGuardian(root=root, require_route_classification=True).run()

            self.assertFalse(result.ok)
            self.assertIn("frontend route classification registry is missing", result.messages)

    def test_reports_sdk_runtime_classification_without_matching_operation_contract(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/console/dashboard" element={<Dashboard />} />')
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/console/dashboard": {
                            "required_api_surface": "app",
                            "route_scope": "console",
                            "tables": ["ai_usage_fact"],
                        },
                    },
                    "tables": [{"table": "ai_usage_fact", "columns": [{"name": "request_count"}]}],
                },
            )
            self.write_contract(
                root,
                """
                frontend_operations: []
                routes:
                  - route: /console/dashboard
                    required_tables: [ai_usage_fact]
                """,
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /console/dashboard
                    package: sdkwork-clawrouter-pc-console-dashboard
                    owner: customer-console
                    route_scope: console
                    delivery_kind: sdk_backed_business_runtime
                    api_surface: app
                    evidence:
                      - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-dashboard/src/dashboardService.ts
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "sdk-backed route /console/dashboard must declare at least one app frontend operation contract",
                result.messages,
            )

    def test_accepts_sdk_runtime_classification_through_commerce_foundation_service(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(
                root,
                """
                const Commerce = lazyRoute(() => import('sdkwork-clawrouter-pc-console-commerce'), 'Commerce');
                <Route path="/console/commerce" element={<Commerce />} />
                """,
            )
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/console/commerce": {
                            "required_api_surface": "app",
                            "route_scope": "console",
                            "tables": ["commerce_account"],
                        },
                    },
                    "tables": [{"table": "commerce_account", "columns": [{"name": "balance"}]}],
                },
            )
            self.write_contract(
                root,
                """
                frontend_operations:
                  - route: /console/commerce
                    source: apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-commerce/src/commerceService.ts
                    operation: fetchBillingSummary
                    operation_id: account.summary.retrieve
                    api_surface: app
                    read_sources: [commerce_account]
                routes:
                  - route: /console/commerce
                    required_tables: [commerce_account]
                """,
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /console/commerce
                    package: sdkwork-clawrouter-pc-console-commerce
                    owner: customer-console
                    route_scope: console
                    delivery_kind: sdk_backed_business_runtime
                    api_surface: app
                    evidence:
                      - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-commerce/src/commerceService.ts
                      - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/commerce-runtime.ts
                """,
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-commerce/src/commerceService.ts",
                """
                import { getClawRouterCommerceService } from 'sdkwork-clawroutes-pc-commons/runtime';

                export async function fetchBillingSummary() {
                  return getClawRouterCommerceService().account.summary.retrieve();
                }
                """,
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/commerce-runtime.ts",
                """
                import { getClawRouterAppSdkClient, getClawRouterBackendSdkClient } from './sdk-clients.ts';

                export function getClawRouterCommerceService() {
                  return {
                    account: {
                      summary: {
                        retrieve: () => getClawRouterAppSdkClient().billing.account.summary.retrieve(),
                      },
                    },
                    admin: {
                      finance: {
                        ledger: {
                          list: () => getClawRouterBackendSdkClient().billing.finance.ledger.list(),
                        },
                      },
                    },
                  };
                }
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_app_shell_operations_through_dependency_sdk_boundaries(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(
                root,
                """
                <Route path="/console/account" element={<Account />} />
                <Route path="/admin/organization" element={<Organization />} />
                <Route path="/playground" element={<Playground />} />
                """,
            )
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/console/account": {
                            "required_api_surface": "app",
                            "route_scope": "console",
                            "tables": ["commerce_account"],
                        },
                        "/admin/organization": {
                            "required_api_surface": "backend",
                            "route_scope": "admin",
                            "tables": ["iam_user"],
                        },
                        "/playground": {
                            "required_api_surface": "app",
                            "route_scope": "public",
                            "tables": ["ai_generation_job"],
                        },
                    },
                    "tables": [
                        {"table": "commerce_account", "columns": [{"name": "id"}]},
                        {"table": "iam_user", "columns": [{"name": "id"}]},
                        {"table": "ai_generation_job", "columns": [{"name": "id"}]},
                    ],
                },
            )
            self.write_contract(
                root,
                """
                frontend_operations:
                  - route: /console/account
                    operation_scope: app_shell
                    source: apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-account/src/accountService.ts
                    operation: fetchAccountDetails
                    operation_id: accounts.current.summary.retrieve
                    api_surface: app
                    sdk_domain: commerce
                  - route: /admin/organization
                    operation_scope: app_shell
                    source: apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-organization/src/organizationService.ts
                    operation: loadDirectory
                    operation_id: admin.organization.directory.load
                    api_surface: backend
                    sdk_domain: iam
                  - route: /playground
                    operation_scope: app_shell
                    source: apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-playground/src/playgroundService.ts
                    operation: runPlaygroundAssetGeneration
                    operation_id: playground.assets.generate
                    api_surface: app
                    sdk_domain: generations
                routes:
                  - route: /console/account
                    required_tables: [commerce_account]
                  - route: /admin/organization
                    required_tables: [iam_user]
                  - route: /playground
                    required_tables: [ai_generation_job]
                """,
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-account/src/accountService.ts",
                """
                import { getSdkworkCommerceService } from '@sdkwork/commerce-service';

                export async function fetchAccountDetails() {
                  return getSdkworkCommerceService().accounts.current.summary.retrieve();
                }
                """,
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-organization/src/organizationService.ts",
                """
                import { getSdkworkAppbaseBackendSdkClient } from 'sdkwork-clawroutes-pc-commons/runtime';

                export async function loadDirectory() {
                  return getSdkworkAppbaseBackendSdkClient().iam.users.list();
                }
                """,
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-playground/src/playgroundService.ts",
                """
                import { createSdkworkGenerationService } from '@sdkwork/generations-pc-react';
                import { getSdkworkGenerationsAppSdkClient } from 'sdkwork-clawroutes-pc-commons/runtime';

                export async function runPlaygroundAssetGeneration() {
                  return createSdkworkGenerationService({
                    clients: { generationsApp: getSdkworkGenerationsAppSdkClient() },
                  });
                }
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_sdk_runtime_classification_through_dependency_sdk_boundaries(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(
                root,
                """
                <Route path="/admin/orders" element={<Orders />} />
                <Route path="/auth/login" element={<Login />} />
                """,
            )
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/admin/orders": {
                            "required_api_surface": "backend",
                            "route_scope": "admin",
                            "tables": ["commerce_order"],
                        },
                        "/auth/login": {
                            "required_api_surface": "app",
                            "route_scope": "public",
                            "tables": ["iam_user"],
                        },
                    },
                    "tables": [
                        {"table": "commerce_order", "columns": [{"name": "id"}]},
                        {"table": "iam_user", "columns": [{"name": "id"}]},
                    ],
                },
            )
            self.write_contract(
                root,
                """
                frontend_operations:
                  - route: /admin/orders
                    source: apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-orders/src/ordersService.ts
                    operation: backendOrdersList
                    operation_id: orders.list
                    api_surface: backend
                    sdk_domain: commerce
                  - route: /auth/login
                    source: apps/sdkwork-clawrouter-pc/src/auth/clawRouterAuthController.ts
                    operation: signIn
                    operation_id: sessions.create
                    api_surface: app
                    sdk_domain: auth
                routes:
                  - route: /admin/orders
                    required_tables: [commerce_order]
                  - route: /auth/login
                    required_tables: [iam_user]
                """,
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /admin/orders
                    package: sdkwork-clawrouter-pc-admin-orders
                    owner: commerce-admin
                    route_scope: admin
                    delivery_kind: sdk_backed_business_runtime
                    api_surface: backend
                    evidence:
                      - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-orders/src/ordersService.ts
                  - route: /auth/login
                    package: sdkwork-clawrouter-pc-auth
                    owner: identity-access
                    route_scope: public
                    delivery_kind: sdk_backed_business_runtime
                    api_surface: app
                    evidence:
                      - apps/sdkwork-clawrouter-pc/src/auth/clawRouterAuthController.ts
                """,
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-orders/src/ordersService.ts",
                """
                import { getSdkworkCommerceService } from '@sdkwork/commerce-service';

                export async function backendOrdersList() {
                  return getSdkworkCommerceService().admin.orders.list();
                }
                """,
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/src/auth/clawRouterAuthController.ts",
                """
                import { createSdkworkIamRuntimeAuthController } from '@sdkwork/auth-pc-react';
                import { getClawRouterIamRuntime } from 'sdkwork-clawroutes-pc-commons/runtime';

                export const clawRouterAuthController = createSdkworkIamRuntimeAuthController({
                  getRuntime: getClawRouterIamRuntime,
                });
                export const signIn = clawRouterAuthController.signIn;
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_sdk_runtime_classification_from_dependency_only_operation_fragment(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/admin/catalog/products" element={<Products />} />')
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/admin/catalog/products": {
                            "required_api_surface": "backend",
                            "route_scope": "admin",
                            "tables": ["commerce_product_spu"],
                        },
                    },
                    "tables": [{"table": "commerce_product_spu", "columns": [{"name": "id"}]}],
                },
            )
            self.write_contract(
                root,
                """
                frontend_operations: []
                routes:
                  - route: /admin/catalog/products
                    required_tables: [commerce_product_spu]
                """,
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /admin/catalog/products
                    package: sdkwork-clawrouter-pc-admin-catalog
                    owner: commerce-admin
                    route_scope: admin
                    delivery_kind: sdk_backed_business_runtime
                    api_surface: backend
                    operation_routes:
                      - /admin/catalog
                    evidence:
                      - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/catalogService.ts
                """,
            )
            dependency_fragment = (
                root
                / "docs"
                / "schema-registry"
                / "frontend-field-contracts"
                / "operations"
                / "backend-commerce-catalog.yaml"
            )
            dependency_fragment.parent.mkdir(parents=True, exist_ok=True)
            dependency_fragment.write_text(
                textwrap.dedent(
                    """
                    fragment: operations/backend-commerce-catalog
                    frontend_operations:
                      - route: /admin/catalog
                        source: apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/catalogService.ts
                        operation: listCommerceProducts
                        operation_id: catalog.products.list
                        kind: read
                        api_surface: backend
                        api_method: GET
                        api_path: /backend/v3/api/catalog/products
                        sdk_domain: commerce
                        read_sources: [commerce_product_spu]
                    """
                ).strip()
                + "\n",
                encoding="utf-8",
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/catalogService.ts",
                """
                export { listCommerceProducts } from 'sdkwork-commerce-pc-admin-product';
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_dependency_owned_appbase_oauth_admin_route_without_product_schema_manifest(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/admin/oauth" element={<OAuthAdmin />} />')
            self.write_manifest(root, {"routes": {}, "tables": []})
            self.write_contract(
                root,
                """
                frontend_operations:
                  - route: /admin/oauth
                    source: apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-oauth/src/oauthAdminService.ts
                    operation: listOAuthProviderCatalog
                    operation_id: iam.oauth.providerCatalog.list
                    kind: read
                    api_surface: backend
                    api_method: GET
                    api_path: /backend/v3/api/iam/oauth/provider_catalog
                    sdk_domain: appbase
                    openapi_exposed: false
                    read_sources: [iam_oauth_provider_catalog]
                routes:
                  - route: /admin/oauth
                    dependency_owned: true
                    dependency_sdk_family: sdkwork-iam-backend-sdk
                    required_tables: [iam_oauth_provider_catalog]
                """,
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /admin/oauth
                    package: sdkwork-clawrouter-pc-admin-oauth
                    owner: appbase-iam
                    route_scope: admin
                    delivery_kind: sdk_backed_business_runtime
                    dependency_owned: true
                    dependency_sdk_family: sdkwork-iam-backend-sdk
                    api_surface: backend
                    evidence:
                      - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-oauth/src/oauthAdminService.ts
                """,
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-oauth/src/oauthAdminService.ts",
                """
                import { getSdkworkAppbaseBackendSdkClient } from 'sdkwork-clawroutes-pc-commons/sdk-clients';

                export async function listOAuthProviderCatalog() {
                  return getSdkworkAppbaseBackendSdkClient().iam.oauth.providerCatalog.list();
                }
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_default_contract_path_prefers_modular_index_over_stale_snapshot(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/demo" element={<Demo />} />')
            self.write_manifest(
                root,
                {
                    "routes": {"/demo": {"tables": ["demo_table"]}},
                    "tables": [
                        {
                            "table": "demo_table",
                            "columns": [{"name": "id"}],
                        }
                    ],
                },
            )
            self.write_contract(root, "routes: []")
            self.write_modular_contract(
                root,
                """
                routes:
                  - route: /demo
                    required_tables: [demo_table]
                    required_columns:
                      demo_table: [id]
                frontend_operations: []
                frontend_models: []
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_app_shell_operation_on_schema_content_route_when_sdk_backed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            home_hash = self.write_catalog_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-home/src/pages/Home.tsx",
                """
                export function Home() {
                  return null;
                }
                """,
            )
            self.write_app(
                root,
                """
                const Home = lazyRoute(() => import('sdkwork-clawrouter-pc-home'), 'Home');
                <Route path="/" element={<Home />} />
                """,
            )
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/": {
                            "required_api_surface": "app",
                            "route_scope": "public",
                            "tables": ["content_doc_page"],
                        },
                    },
                    "tables": [{"table": "content_doc_page", "columns": [{"name": "slug"}]}],
                },
            )
            self.write_contract(
                root,
                """
                frontend_operations:
                  - route: /
                    operation_scope: app_shell
                    source: apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/siteBranding.ts
                    operation: fetchSiteBranding
                    operation_id: site.runtime.retrieve
                    api_surface: app
                    read_sources: [ops_config_snapshot]
                routes:
                  - route: /
                    required_tables: [content_doc_page]
                """,
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/siteBranding.ts",
                """
                import { getClawRouterAppSdkClient } from './sdk-clients.ts';

                export async function fetchSiteBranding() {
                  return getClawRouterAppSdkClient().system.site.runtime.retrieve();
                }
                """,
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /
                    package: sdkwork-clawrouter-pc-home
                    owner: public-portal
                    route_scope: public
                    delivery_kind: schema_provenanced_content
                    provenance_tables: [content_doc_page]
                    static_delivery:
                      mode: curated_seed_content
                      refresh_policy: manual_content_release
                      max_staleness: release_bound
                      upgrade_triggers: [authoring_workflow]
                      source_manifest_ref: home-page
                    evidence:
                      - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-home/src/pages/Home.tsx
                      - generated/schema/manifest/schema-manifest.json
                """,
            )
            self.write_static_source_manifest(
                root,
                {
                    "schema": "sdkwork-clawrouter-frontend-static-source-manifest",
                    "version": 1,
                    "snapshots": {
                        "home-page": {
                            "id": "home-page",
                            "route": "/",
                            "mode": "curated_seed_content",
                            "source_ref": "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-home/src/pages/Home.tsx",
                            "source_hash": home_hash,
                            "schema_tables": ["content_doc_page"],
                            "observed_at": "2026-05-18",
                        },
                    },
                },
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_app_shell_operation_via_commerce_runtime_sdk_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/console/account" element={<Account />} />')
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/console/account": {
                            "required_api_surface": "app",
                            "route_scope": "console",
                            "tables": ["commerce_account"],
                        },
                    },
                    "tables": [{"table": "commerce_account", "columns": [{"name": "account_id"}]}],
                },
            )
            self.write_contract(
                root,
                """
                frontend_operations:
                  - route: /console/account
                    operation_scope: app_shell
                    source: apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/commerce-console-service.ts
                    operation: fetchAccountDetails
                    operation_id: console.accountDetails.retrieve
                    api_surface: app
                routes:
                  - route: /console/account
                    required_tables: [commerce_account]
                """,
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/commerce-runtime.ts",
                """
                import { getClawRouterAppSdkClient } from './sdk-clients.ts';

                export async function appAccountsCurrentSummaryRetrieve() {
                  return getClawRouterAppSdkClient().commerce.accounts.current.summary.retrieve();
                }
                """,
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/commerce-console-service.ts",
                """
                import { appAccountsCurrentSummaryRetrieve } from './commerce-runtime.ts';

                export class ConsoleCommerceService {
                  static async fetchAccountDetails() {
                    return appAccountsCurrentSummaryRetrieve();
                  }
                }
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_app_shell_operation_via_local_runtime_adapter_sdk_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/playground" element={<Playground />} />')
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/playground": {
                            "required_api_surface": "app",
                            "route_scope": "console",
                            "tables": ["ai_model"],
                        },
                    },
                    "tables": [{"table": "ai_model", "columns": [{"name": "id"}]}],
                },
            )
            self.write_contract(
                root,
                """
                frontend_operations:
                  - route: /playground
                    source: apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-playground/src/appRuntimeApiOperations.ts
                    operation: listModelCatalog
                    operation_id: models.list
                    api_surface: app
                  - route: /playground
                    operation_scope: app_shell
                    source: apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-playground/src/playgroundService.ts
                    operation: fetchModelGroups
                    operation_id: playground.models.grouped
                    api_surface: app
                routes:
                  - route: /playground
                    required_tables: [ai_model]
                """,
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-playground/src/appRuntimeApiOperations.ts",
                """
                import { getClawRouterAppSdkClient } from 'sdkwork-clawroutes-pc-commons/runtime';

                export async function listModelCatalog() {
                  return getClawRouterAppSdkClient().intelligence.modelsList();
                }
                """,
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-playground/src/playgroundService.ts",
                """
                import { listModelCatalog } from './appRuntimeApiOperations.ts';

                export class PlaygroundService {
                  static async fetchModelGroups() {
                    return listModelCatalog();
                  }
                }
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_reports_app_shell_operation_without_standard_sdk_client(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"route_scope": "public", "tables": []}}, "tables": []})
            self.write_contract(
                root,
                """
                frontend_operations:
                  - route: /
                    operation_scope: app_shell
                    source: apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/siteBranding.ts
                    operation: fetchSiteBranding
                    operation_id: site.runtime.retrieve
                    api_surface: app
                routes:
                  - route: /
                """,
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/siteBranding.ts",
                """
                export async function fetchSiteBranding() {
                  return { siteName: 'Claw Router' };
                }
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "app-shell frontend operation fetchSiteBranding must use getClawRouterAppSdkClient",
                result.messages,
            )

    def test_reports_route_classification_evidence_that_does_not_exist(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(
                root,
                """
                const Models = lazyRoute(() => import('sdkwork-clawrouter-pc-models'), 'Models');
                <Route path="/models" element={<Models />} />
                """,
            )
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/models": {
                            "required_api_surface": "app",
                            "route_scope": "public",
                            "tables": ["ai_model"],
                        },
                    },
                    "tables": [{"table": "ai_model", "columns": [{"name": "model"}]}],
                },
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /models
                    required_tables: [ai_model]
                """,
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /models
                    package: sdkwork-clawrouter-pc-models
                    owner: public-portal
                    route_scope: public
                    delivery_kind: schema_provenanced_content
                    provenance_tables: [ai_model]
                    evidence:
                      - docs/schema-registry/missing-model-evidence.yaml
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "frontend route /models classification evidence does not exist: "
                "docs/schema-registry/missing-model-evidence.yaml",
                result.messages,
            )

    def test_reports_route_classification_package_that_differs_from_app_lazy_route_package(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(
                root,
                """
                const Models = lazyRoute(() => import('sdkwork-clawrouter-pc-models'), 'Models');
                <Route path="/models" element={<Models />} />
                """,
            )
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/models": {
                            "required_api_surface": "app",
                            "route_scope": "public",
                            "tables": ["ai_model"],
                        },
                    },
                    "tables": [{"table": "ai_model", "columns": [{"name": "model"}]}],
                },
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /models
                    required_tables: [ai_model]
                """,
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /models
                    package: sdkwork-clawrouter-pc-home
                    owner: public-portal
                    route_scope: public
                    delivery_kind: schema_provenanced_content
                    provenance_tables: [ai_model]
                    evidence:
                      - generated/schema/manifest/schema-manifest.json
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "frontend route /models classification package must match App.tsx lazy route package "
                "sdkwork-clawrouter-pc-models",
                result.messages,
            )

    def test_reports_schema_content_package_with_runtime_network_call(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(
                root,
                """
                const Models = lazyRoute(() => import('sdkwork-clawrouter-pc-models'), 'Models');
                <Route path="/models" element={<Models />} />
                """,
            )
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/models": {
                            "required_api_surface": "app",
                            "route_scope": "public",
                            "tables": ["ai_model"],
                        },
                    },
                    "tables": [{"table": "ai_model", "columns": [{"name": "model"}]}],
                },
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /models
                    required_tables: [ai_model]
                """,
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/runtime.ts",
                """
                export async function loadModels() {
                  return fetch('/app/v3/api/models');
                }
                """,
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /models
                    package: sdkwork-clawrouter-pc-models
                    owner: public-portal
                    route_scope: public
                    delivery_kind: schema_provenanced_content
                    provenance_tables: [ai_model]
                    evidence:
                      - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/runtime.ts
                      - generated/schema/manifest/schema-manifest.json
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "schema content route /models package sdkwork-clawrouter-pc-models must not contain runtime network client usage: "
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/runtime.ts",
                result.messages,
            )

    def test_reports_schema_content_without_static_delivery_policy(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(
                root,
                """
                const Models = lazyRoute(() => import('sdkwork-clawrouter-pc-models'), 'Models');
                <Route path="/models" element={<Models />} />
                """,
            )
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/models": {
                            "required_api_surface": "app",
                            "route_scope": "public",
                            "tables": ["ai_model"],
                        },
                    },
                    "tables": [{"table": "ai_model", "columns": [{"name": "model"}]}],
                },
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /models
                    required_tables: [ai_model]
                """,
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/data/models.ts",
                """
                export const modelCatalog = [];
                """,
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /models
                    package: sdkwork-clawrouter-pc-models
                    owner: public-portal
                    route_scope: public
                    delivery_kind: schema_provenanced_content
                    provenance_tables: [ai_model]
                    evidence:
                      - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/data/models.ts
                      - generated/schema/manifest/schema-manifest.json
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "schema content route /models must declare static_delivery",
                result.messages,
            )

    def test_reports_schema_content_with_invalid_static_delivery_policy(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(
                root,
                """
                const Models = lazyRoute(() => import('sdkwork-clawrouter-pc-models'), 'Models');
                <Route path="/models" element={<Models />} />
                """,
            )
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/models": {
                            "required_api_surface": "app",
                            "route_scope": "public",
                            "tables": ["ai_model"],
                        },
                    },
                    "tables": [{"table": "ai_model", "columns": [{"name": "model"}]}],
                },
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /models
                    required_tables: [ai_model]
                """,
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/data/models.ts",
                """
                export const modelCatalog = [];
                """,
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /models
                    package: sdkwork-clawrouter-pc-models
                    owner: public-portal
                    route_scope: public
                    delivery_kind: schema_provenanced_content
                    provenance_tables: [ai_model]
                    static_delivery:
                      mode: runtime_catalog
                      refresh_policy: live_query
                      max_staleness: never_stale
                      upgrade_triggers: [unknown_trigger]
                    evidence:
                      - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/data/models.ts
                      - generated/schema/manifest/schema-manifest.json
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "schema content route /models static_delivery.mode must be one of "
                "curated_seed_content, generated_reference_snapshot, published_catalog_snapshot",
                result.messages,
            )
            self.assertIn(
                "schema content route /models static_delivery.refresh_policy must be one of "
                "manual_content_release, scheduled_snapshot_import, schema_registry_regeneration",
                result.messages,
            )
            self.assertIn(
                "schema content route /models static_delivery.max_staleness must be one of "
                "daily_snapshot, release_bound, weekly_snapshot",
                result.messages,
            )
            self.assertIn(
                "schema content route /models static_delivery upgrade trigger unknown_trigger is not approved",
                result.messages,
            )

    def test_reports_curated_seed_content_without_source_manifest_ref(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(
                root,
                """
                const ForumView = lazyRoute(() => import('sdkwork-clawrouter-pc-forum'), 'ForumView');
                <Route path="/forum" element={<ForumView />} />
                """,
            )
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/forum": {
                            "required_api_surface": "app",
                            "route_scope": "public",
                            "tables": ["content_forum_post", "content_reaction"],
                        },
                    },
                    "tables": [
                        {"table": "content_forum_post", "columns": [{"name": "title"}]},
                        {"table": "content_reaction", "columns": [{"name": "post_id"}]},
                    ],
                },
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /forum
                    required_tables: [content_forum_post]
                """,
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-forum/src/data.ts",
                """
                export const forumCatalog = [];
                """,
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /forum
                    package: sdkwork-clawrouter-pc-forum
                    owner: public-portal
                    route_scope: public
                    delivery_kind: schema_provenanced_content
                    provenance_tables: [content_forum_post, content_reaction]
                    static_delivery:
                      mode: curated_seed_content
                      refresh_policy: manual_content_release
                      max_staleness: release_bound
                      upgrade_triggers: [authoring_workflow]
                    evidence:
                      - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-forum/src/data.ts
                      - generated/schema/manifest/schema-manifest.json
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "schema content route /forum curated seed static_delivery must declare source_manifest_ref",
                result.messages,
            )

    def test_reports_static_delivery_with_inline_source_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source_hash = self.write_catalog_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-forum/src/data.ts",
                """
                export const forumCatalog = [];
                """,
            )
            self.write_app(
                root,
                """
                const ForumView = lazyRoute(() => import('sdkwork-clawrouter-pc-forum'), 'ForumView');
                <Route path="/forum" element={<ForumView />} />
                """,
            )
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/forum": {
                            "required_api_surface": "app",
                            "route_scope": "public",
                            "tables": ["content_forum_post"],
                        },
                    },
                    "tables": [{"table": "content_forum_post", "columns": [{"name": "title"}]}],
                },
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /forum
                    required_tables: [content_forum_post]
                """,
            )
            self.write_static_source_manifest(
                root,
                {
                    "schema": "sdkwork-clawrouter-frontend-static-source-manifest",
                    "version": 1,
                    "snapshots": {
                        "static-route:/forum": {
                            "id": "static-route:/forum",
                            "route": "/forum",
                            "mode": "curated_seed_content",
                            "source_ref": "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-forum/src/data.ts",
                            "observed_at": "2026-05-03",
                            "source_hash": source_hash,
                            "schema_tables": ["content_forum_post"],
                        }
                    },
                },
            )
            self.write_route_classification(
                root,
                f"""
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /forum
                    package: sdkwork-clawrouter-pc-forum
                    owner: public-portal
                    route_scope: public
                    delivery_kind: schema_provenanced_content
                    provenance_tables: [content_forum_post]
                    static_delivery:
                      mode: curated_seed_content
                      refresh_policy: manual_content_release
                      max_staleness: release_bound
                      upgrade_triggers: [authoring_workflow]
                      source_manifest_ref: "static-route:/forum"
                      source_metadata:
                        source_ref: apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-forum/src/data.ts
                        observed_at: "2026-05-03"
                        source_hash: {source_hash}
                        schema_tables: [content_forum_post]
                    evidence:
                      - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-forum/src/data.ts
                      - generated/schema/manifest/schema-manifest.json
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "schema content route /forum curated seed static_delivery must use source_manifest_ref instead of inline source_metadata",
                result.messages,
            )

    def test_reports_missing_static_source_manifest(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(
                root,
                """
                const ForumView = lazyRoute(() => import('sdkwork-clawrouter-pc-forum'), 'ForumView');
                <Route path="/forum" element={<ForumView />} />
                """,
            )
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/forum": {
                            "required_api_surface": "app",
                            "route_scope": "public",
                            "tables": ["content_forum_post"],
                        },
                    },
                    "tables": [{"table": "content_forum_post", "columns": [{"name": "title"}]}],
                },
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /forum
                    required_tables: [content_forum_post]
                """,
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-forum/src/data.ts",
                """
                export const forumCatalog = [];
                """,
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /forum
                    package: sdkwork-clawrouter-pc-forum
                    owner: public-portal
                    route_scope: public
                    delivery_kind: schema_provenanced_content
                    provenance_tables: [content_forum_post]
                    static_delivery:
                      mode: curated_seed_content
                      refresh_policy: manual_content_release
                      max_staleness: release_bound
                      upgrade_triggers: [authoring_workflow]
                      source_manifest_ref: "static-route:/forum"
                    evidence:
                      - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-forum/src/data.ts
                      - generated/schema/manifest/schema-manifest.json
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertTrue(
                any(message.startswith("frontend static source manifest is missing:") for message in result.messages),
                result.messages,
            )

    def test_reports_generated_reference_source_manifest_with_mismatched_hash(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(
                root,
                """
                const Docs = lazyRoute(() => import('@sdkwork/documents-pc-api-reference'), 'Docs');
                <Route path="/docs" element={<Docs />} />
                """,
            )
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/docs": {
                            "required_api_surface": "app",
                            "route_scope": "public",
                            "tables": ["content_doc_page", "content_openapi_snapshot"],
                        },
                    },
                    "tables": [
                        {"table": "content_doc_page", "columns": [{"name": "slug"}]},
                        {"table": "content_openapi_snapshot", "columns": [{"name": "version"}]},
                    ],
                },
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /docs
                    required_tables: [content_doc_page]
                """,
            )
            self.write_portal_source(
                root,
                "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/pages/Docs.tsx",
                """
                export function Docs() {
                  return null;
                }
                """,
            )
            self.write_static_source_manifest(
                root,
                {
                    "schema": "sdkwork-clawrouter-frontend-static-source-manifest",
                    "version": 1,
                    "snapshots": {
                        "static-route:/docs": {
                            "id": "static-route:/docs",
                            "route": "/docs",
                            "mode": "generated_reference_snapshot",
                            "source_ref": "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/pages/Docs.tsx",
                            "observed_at": "2026-05-03",
                            "source_hash": "sha256:0000000000000000000000000000000000000000000000000000000000000000",
                            "schema_tables": ["content_doc_page", "content_openapi_snapshot"],
                        }
                    },
                },
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /docs
                    package: '@sdkwork/documents-pc-api-reference'
                    owner: developer-experience
                    route_scope: public
                    delivery_kind: schema_provenanced_content
                    provenance_tables: [content_doc_page, content_openapi_snapshot]
                    static_delivery:
                      mode: generated_reference_snapshot
                      refresh_policy: schema_registry_regeneration
                      max_staleness: release_bound
                      upgrade_triggers: [authoring_workflow]
                      source_manifest_ref: "static-route:/docs"
                    evidence:
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/pages/Docs.tsx
                      - generated/schema/manifest/schema-manifest.json
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "schema content route /docs generated reference static source manifest source_hash must match source_ref content",
                result.messages,
            )

    def test_reports_published_catalog_snapshot_without_source_manifest_ref(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(
                root,
                """
                const Models = lazyRoute(() => import('sdkwork-clawrouter-pc-models'), 'Models');
                <Route path="/models" element={<Models />} />
                """,
            )
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/models": {
                            "required_api_surface": "app",
                            "route_scope": "public",
                            "tables": ["ai_model"],
                        },
                    },
                    "tables": [{"table": "ai_model", "columns": [{"name": "model"}]}],
                },
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /models
                    required_tables: [ai_model]
                """,
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/data/models.ts",
                """
                export const modelCatalog = [];
                """,
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /models
                    package: sdkwork-clawrouter-pc-models
                    owner: public-portal
                    route_scope: public
                    delivery_kind: schema_provenanced_content
                    provenance_tables: [ai_model]
                    static_delivery:
                      mode: published_catalog_snapshot
                      refresh_policy: scheduled_snapshot_import
                      max_staleness: daily_snapshot
                      upgrade_triggers: [provider_availability]
                    evidence:
                      - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/data/models.ts
                      - generated/schema/manifest/schema-manifest.json
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "schema content route /models published catalog static_delivery must declare source_manifest_ref",
                result.messages,
            )

    def test_reports_published_catalog_source_manifest_with_unprovenanced_schema_table(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source_hash = self.write_catalog_source(
                root,
                "docs/schema-registry/catalog-source.yaml",
                """
                tables:
                  - ai_model
                  - ai_model_secret
                """,
            )
            self.write_app(
                root,
                """
                const Models = lazyRoute(() => import('sdkwork-clawrouter-pc-models'), 'Models');
                <Route path="/models" element={<Models />} />
                """,
            )
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/models": {
                            "required_api_surface": "app",
                            "route_scope": "public",
                            "tables": ["ai_model"],
                        },
                    },
                    "tables": [{"table": "ai_model", "columns": [{"name": "model"}]}],
                },
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /models
                    required_tables: [ai_model]
                """,
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/data/models.ts",
                """
                export const modelCatalog = [];
                """,
            )
            self.write_static_source_manifest(
                root,
                {
                    "schema": "sdkwork-clawrouter-frontend-static-source-manifest",
                    "version": 1,
                    "snapshots": {
                        "static-route:/models": {
                            "id": "static-route:/models",
                            "route": "/models",
                            "mode": "published_catalog_snapshot",
                            "source_ref": "docs/schema-registry/catalog-source.yaml",
                            "observed_at": "2026-05-03",
                            "source_hash": source_hash,
                            "schema_tables": ["ai_model", "ai_model_secret"],
                        }
                    },
                },
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /models
                    package: sdkwork-clawrouter-pc-models
                    owner: public-portal
                    route_scope: public
                    delivery_kind: schema_provenanced_content
                    provenance_tables: [ai_model]
                    static_delivery:
                      mode: published_catalog_snapshot
                      refresh_policy: scheduled_snapshot_import
                      max_staleness: daily_snapshot
                      upgrade_triggers: [provider_availability]
                      source_manifest_ref: "static-route:/models"
                    evidence:
                      - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/data/models.ts
                      - generated/schema/manifest/schema-manifest.json
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "schema content route /models published catalog static source manifest schema table "
                "ai_model_secret is not in provenance_tables",
                result.messages,
            )

    def test_reports_published_catalog_source_manifest_with_invalid_audit_fields(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_catalog_source(
                root,
                "docs/schema-registry/catalog-source.yaml",
                """
                tables:
                  - ai_model
                """,
            )
            self.write_app(
                root,
                """
                const Models = lazyRoute(() => import('sdkwork-clawrouter-pc-models'), 'Models');
                <Route path="/models" element={<Models />} />
                """,
            )
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/models": {
                            "required_api_surface": "app",
                            "route_scope": "public",
                            "tables": ["ai_model"],
                        },
                    },
                    "tables": [{"table": "ai_model", "columns": [{"name": "model"}]}],
                },
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /models
                    required_tables: [ai_model]
                """,
            )
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/data/models.ts",
                """
                export const modelCatalog = [];
                """,
            )
            self.write_static_source_manifest(
                root,
                {
                    "schema": "sdkwork-clawrouter-frontend-static-source-manifest",
                    "version": 1,
                    "snapshots": {
                        "static-route:/models": {
                            "id": "static-route:/models",
                            "route": "/models",
                            "mode": "published_catalog_snapshot",
                            "source_ref": "docs/schema-registry/catalog-source.yaml",
                            "observed_at": "05/03/2026",
                            "source_hash": "sha256:0000000000000000000000000000000000000000000000000000000000000000",
                            "schema_tables": [],
                        }
                    },
                },
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /models
                    package: sdkwork-clawrouter-pc-models
                    owner: public-portal
                    route_scope: public
                    delivery_kind: schema_provenanced_content
                    provenance_tables: [ai_model]
                    static_delivery:
                      mode: published_catalog_snapshot
                      refresh_policy: scheduled_snapshot_import
                      max_staleness: daily_snapshot
                      upgrade_triggers: [provider_availability]
                      source_manifest_ref: "static-route:/models"
                    evidence:
                      - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/data/models.ts
                      - generated/schema/manifest/schema-manifest.json
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "schema content route /models published catalog static source manifest observed_at must be an ISO date or datetime",
                result.messages,
            )
            self.assertIn(
                "schema content route /models published catalog static source manifest source_hash must match source_ref content",
                result.messages,
            )
            self.assertIn(
                "schema content route /models published catalog static source manifest must declare schema_tables",
                result.messages,
            )

    def test_accepts_schema_content_package_with_runtime_network_word_only_in_comment(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(
                root,
                """
                const ForumView = lazyRoute(() => import('sdkwork-clawrouter-pc-forum'), 'ForumView');
                <Route path="/forum" element={<ForumView />} />
                """,
            )
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/forum": {
                            "required_api_surface": "app",
                            "route_scope": "public",
                            "tables": ["content_forum_post"],
                        },
                    },
                    "tables": [{"table": "content_forum_post", "columns": [{"name": "title"}]}],
                },
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /forum
                    required_tables: [content_forum_post]
                """,
            )
            source_hash = self.write_catalog_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-forum/src/ForumView.tsx",
                """
                // In a future backend-backed app this page would fetch forum posts.
                export function ForumView() {
                  return null;
                }
                """,
            )
            self.write_static_source_manifest(
                root,
                {
                    "schema": "sdkwork-clawrouter-frontend-static-source-manifest",
                    "version": 1,
                    "snapshots": {
                        "static-route:/forum": {
                            "id": "static-route:/forum",
                            "route": "/forum",
                            "mode": "curated_seed_content",
                            "source_ref": "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-forum/src/ForumView.tsx",
                            "observed_at": "2026-05-03",
                            "source_hash": source_hash,
                            "schema_tables": ["content_forum_post"],
                        }
                    },
                },
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /forum
                    package: sdkwork-clawrouter-pc-forum
                    owner: public-portal
                    route_scope: public
                    delivery_kind: schema_provenanced_content
                    provenance_tables: [content_forum_post]
                    static_delivery:
                      mode: curated_seed_content
                      refresh_policy: manual_content_release
                      max_staleness: release_bound
                      upgrade_triggers: [authoring_workflow]
                      source_manifest_ref: "static-route:/forum"
                    evidence:
                      - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-forum/src/ForumView.tsx
                      - generated/schema/manifest/schema-manifest.json
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_reports_local_tool_api_classification_without_env_gate(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/api-reference" element={<ApiReference />} />')
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/api-reference": {
                            "required_api_surface": "app",
                            "route_scope": "public",
                            "tables": ["content_openapi_snapshot"],
                        },
                    },
                    "tables": [{"table": "content_openapi_snapshot", "columns": [{"name": "api_system"}]}],
                },
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /api-reference
                    required_tables: [content_openapi_snapshot]
                """,
            )
            self.write_portal_source(
                root,
                "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts",
                """
                export async function generate() {
                  await fetch('/api/code-snippet');
                }
                """,
            )
            self.write_portal_source(
                root,
                "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiEndpointView.tsx",
                """
                export function ApiEndpointView() {
                  return null;
                }
                """,
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /api-reference
                    package: '@sdkwork/documents-pc-api-reference'
                    owner: developer-experience
                    route_scope: public
                    delivery_kind: local_developer_tool_api
                    tool_endpoints: [/api/code-snippet]
                    source_files:
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts
                    gate_sources:
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiEndpointView.tsx
                    evidence:
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "local tool route /api-reference must declare browser_env VITE_TOOL_API_ENABLED",
                result.messages,
            )
            self.assertIn(
                "local tool route /api-reference must declare runtime_env PORTAL_PUBLIC_TOOL_API_ENABLED",
                result.messages,
            )
            self.assertIn(
                "local tool route /api-reference gate source "
                "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiEndpointView.tsx "
                "must read VITE_TOOL_API_ENABLED through resolveClawRouterRuntimeBoolean",
                result.messages,
            )

    def test_reports_local_tool_api_classification_without_all_browser_network_sources(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(
                root,
                """
                const ApiReference = lazyRoute(() => import('@sdkwork/documents-pc-api-reference'), 'ApiReference');
                <Route path="/api-reference" element={<ApiReference />} />
                """,
            )
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/api-reference": {
                            "required_api_surface": "app",
                            "route_scope": "public",
                            "tables": ["content_openapi_snapshot"],
                        },
                    },
                    "tables": [{"table": "content_openapi_snapshot", "columns": [{"name": "api_system"}]}],
                },
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /api-reference
                    required_tables: [content_openapi_snapshot]
                """,
            )
            self.write_portal_source(
                root,
                "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/pages/ApiReference.tsx",
                """
                export async function loadSpec() {
                  return fetch('/openapi.json');
                }
                """,
            )
            self.write_portal_source(
                root,
                "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiPlayground.tsx",
                """
                import { resolveClawRouterRuntimeBoolean } from 'sdkwork-clawroutes-pc-commons';
                const enabled = resolveClawRouterRuntimeBoolean('VITE_TOOL_API_ENABLED', false);
                export async function send(request: { url: string; requestInit: RequestInit }) {
                  return fetch(request.url, request.requestInit);
                }
                """,
            )
            self.write_portal_source(
                root,
                "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts",
                """
                export async function generate() {
                  return fetch('/api/code-snippet');
                }
                """,
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /api-reference
                    package: '@sdkwork/documents-pc-api-reference'
                    owner: developer-experience
                    route_scope: public
                    delivery_kind: local_developer_tool_api
                    browser_env: VITE_TOOL_API_ENABLED
                    runtime_env: PORTAL_PUBLIC_TOOL_API_ENABLED
                    tool_endpoints: [/api/code-snippet]
                    source_files:
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts
                    gate_sources:
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiPlayground.tsx
                    browser_network_sources:
                      - endpoint: /api/code-snippet
                        source: sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts
                        purpose: local_tool_api
                    evidence:
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiPlayground.tsx
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "local tool route /api-reference must declare browser_network_sources entry "
                "external_runtime_request|sdkwork-documents/apps/sdkwork-documents-pc/packages/"
                "sdkwork-documents-pc-api-reference/src/components/ApiPlayground.tsx",
                result.messages,
            )
            self.assertIn(
                "local tool route /api-reference must declare browser_network_sources entry "
                "/openapi.json|sdkwork-documents/apps/sdkwork-documents-pc/packages/"
                "sdkwork-documents-pc-api-reference/src/pages/ApiReference.tsx",
                result.messages,
            )

    def test_accepts_local_tool_api_generated_code_snippet_fetch_strings(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(
                root,
                """
                const ApiReference = lazyRoute(() => import('@sdkwork/documents-pc-api-reference'), 'ApiReference');
                <Route path="/api-reference" element={<ApiReference />} />
                """,
            )
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/api-reference": {
                            "required_api_surface": "app",
                            "route_scope": "public",
                            "tables": ["content_openapi_snapshot"],
                        },
                    },
                    "tables": [{"table": "content_openapi_snapshot", "columns": [{"name": "api_system"}]}],
                },
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /api-reference
                    required_tables: [content_openapi_snapshot]
                """,
            )
            self.write_portal_source(
                root,
                "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts",
                """
                export function buildSnippet(url: string) {
                  return `const response = await fetch("${url}", { method: "GET" });`;
                }
                export async function generate() {
                  return fetch('/api/code-snippet');
                }
                """,
            )
            self.write_portal_source(
                root,
                "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiEndpointView.tsx",
                """
                import { resolveClawRouterRuntimeBoolean } from 'sdkwork-clawroutes-pc-commons/runtime';
                const enabled = resolveClawRouterRuntimeBoolean('VITE_TOOL_API_ENABLED', false);
                export function ApiEndpointView() {
                  return null;
                }
                """,
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /api-reference
                    package: '@sdkwork/documents-pc-api-reference'
                    owner: developer-experience
                    route_scope: public
                    delivery_kind: local_developer_tool_api
                    browser_env: VITE_TOOL_API_ENABLED
                    runtime_env: PORTAL_PUBLIC_TOOL_API_ENABLED
                    tool_endpoints: [/api/code-snippet]
                    source_files:
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts
                    gate_sources:
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiEndpointView.tsx
                    browser_network_sources:
                      - endpoint: /api/code-snippet
                        source: sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts
                        purpose: local_tool_api
                    evidence:
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiEndpointView.tsx
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_local_tool_api_schema_tabs_manifest_fetch(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(
                root,
                """
                const ApiReference = lazyRoute(() => import('@sdkwork/documents-pc-api-reference'), 'ApiReference');
                <Route path="/api-reference" element={<ApiReference />} />
                """,
            )
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/api-reference": {
                            "required_api_surface": "app",
                            "route_scope": "public",
                            "tables": ["content_openapi_snapshot"],
                        },
                    },
                    "tables": [{"table": "content_openapi_snapshot", "columns": [{"name": "api_system"}]}],
                },
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /api-reference
                    required_tables: [content_openapi_snapshot]
                """,
            )
            self.write_portal_source(
                root,
                "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/apiReferenceSchemaTabs.ts",
                """
                const API_SCHEMA_TABS_URL = '/openapi/schema-tabs.json';
                async function defaultFetchJson(url: string): Promise<unknown> {
                  return fetch(url);
                }
                export async function loadTabs() {
                  return defaultFetchJson(API_SCHEMA_TABS_URL);
                }
                """,
            )
            self.write_portal_source(
                root,
                "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts",
                """
                export async function generate() {
                  return fetch('/api/code-snippet');
                }
                """,
            )
            self.write_portal_source(
                root,
                "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiEndpointView.tsx",
                """
                import { resolveClawRouterRuntimeBoolean } from 'sdkwork-clawroutes-pc-commons/runtime';
                const enabled = resolveClawRouterRuntimeBoolean('VITE_TOOL_API_ENABLED', false);
                export function ApiEndpointView() {
                  return null;
                }
                """,
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /api-reference
                    package: '@sdkwork/documents-pc-api-reference'
                    owner: developer-experience
                    route_scope: public
                    delivery_kind: local_developer_tool_api
                    browser_env: VITE_TOOL_API_ENABLED
                    runtime_env: PORTAL_PUBLIC_TOOL_API_ENABLED
                    tool_endpoints: [/api/code-snippet]
                    source_files:
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts
                    gate_sources:
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiEndpointView.tsx
                    browser_network_sources:
                      - endpoint: external_runtime_request
                        source: sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/apiReferenceSchemaTabs.ts
                        purpose: local_openapi_snapshot
                      - endpoint: /api/code-snippet
                        source: sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts
                        purpose: local_tool_api
                    evidence:
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/apiReferenceSchemaTabs.ts
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiEndpointView.tsx
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_dependency_check_prefix_before_vite_dev_scripts(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/" element={<Home />} />')
            self.write_manifest(root, {"routes": {"/": {"tables": []}}, "tables": []})
            self.write_contract(root, "routes:\n  - route: /\n")
            self.write_portal_package(
                root,
                """
                {
                  "scripts": {
                    "dev": "pnpm deps:check && vite --configLoader native",
                    "dev:browser": "pnpm deps:check && vite --configLoader native",
                    "build": "vite build --configLoader native"
                  }
                }
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertNotIn(
                "portal dev and dev:browser scripts must run Vite directly with native config loading",
                result.messages,
            )

    def test_reports_local_tool_api_browser_network_source_with_invalid_purpose(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(
                root,
                """
                const ApiReference = lazyRoute(() => import('@sdkwork/documents-pc-api-reference'), 'ApiReference');
                <Route path="/api-reference" element={<ApiReference />} />
                """,
            )
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/api-reference": {
                            "required_api_surface": "app",
                            "route_scope": "public",
                            "tables": ["content_openapi_snapshot"],
                        },
                    },
                    "tables": [{"table": "content_openapi_snapshot", "columns": [{"name": "api_system"}]}],
                },
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /api-reference
                    required_tables: [content_openapi_snapshot]
                """,
            )
            self.write_portal_source(
                root,
                "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/pages/ApiReference.tsx",
                """
                export async function loadSpec() {
                  return fetch('/openapi.json');
                }
                """,
            )
            self.write_portal_source(
                root,
                "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiPlayground.tsx",
                """
                import { resolveClawRouterRuntimeBoolean } from 'sdkwork-clawroutes-pc-commons';
                const enabled = resolveClawRouterRuntimeBoolean('VITE_TOOL_API_ENABLED', false);
                export async function send(request: { url: string; requestInit: RequestInit }) {
                  return fetch(request.url, request.requestInit);
                }
                """,
            )
            self.write_portal_source(
                root,
                "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts",
                """
                export async function generate() {
                  return fetch('/api/code-snippet');
                }
                """,
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /api-reference
                    package: '@sdkwork/documents-pc-api-reference'
                    owner: developer-experience
                    route_scope: public
                    delivery_kind: local_developer_tool_api
                    browser_env: VITE_TOOL_API_ENABLED
                    runtime_env: PORTAL_PUBLIC_TOOL_API_ENABLED
                    tool_endpoints: [/api/code-snippet]
                    source_files:
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts
                    gate_sources:
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiPlayground.tsx
                    browser_network_sources:
                      - endpoint: /openapi.json
                        source: sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/pages/ApiReference.tsx
                        purpose: local_tool_api
                      - endpoint: /api/code-snippet
                        source: sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts
                        purpose: explicit_api_playground_request
                      - endpoint: external_runtime_request
                        source: sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiPlayground.tsx
                        purpose: local_tool_api
                    evidence:
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/pages/ApiReference.tsx
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiPlayground.tsx
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "local tool route /api-reference browser_network_sources entry "
                "/openapi.json|sdkwork-documents/apps/sdkwork-documents-pc/packages/"
                "sdkwork-documents-pc-api-reference/src/pages/ApiReference.tsx "
                "must use purpose local_openapi_snapshot",
                result.messages,
            )
            self.assertIn(
                "local tool route /api-reference browser_network_sources entry "
                "/api/code-snippet|sdkwork-documents/apps/sdkwork-documents-pc/packages/"
                "sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts "
                "must use purpose local_tool_api",
                result.messages,
            )
            self.assertIn(
                "local tool route /api-reference browser_network_sources entry "
                "external_runtime_request|sdkwork-documents/apps/sdkwork-documents-pc/packages/"
                "sdkwork-documents-pc-api-reference/src/components/ApiPlayground.tsx "
                "must use purpose explicit_api_playground_request",
                result.messages,
            )

    def test_reports_external_runtime_browser_source_outside_api_playground(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(
                root,
                """
                const ApiReference = lazyRoute(() => import('@sdkwork/documents-pc-api-reference'), 'ApiReference');
                <Route path="/api-reference" element={<ApiReference />} />
                """,
            )
            self.write_manifest(
                root,
                {
                    "routes": {
                        "/api-reference": {
                            "required_api_surface": "app",
                            "route_scope": "public",
                            "tables": ["content_openapi_snapshot"],
                        },
                    },
                    "tables": [{"table": "content_openapi_snapshot", "columns": [{"name": "api_system"}]}],
                },
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /api-reference
                    required_tables: [content_openapi_snapshot]
                """,
            )
            self.write_portal_source(
                root,
                "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiEndpointView.tsx",
                """
                import { resolveClawRouterRuntimeBoolean } from 'sdkwork-clawroutes-pc-commons';
                const enabled = resolveClawRouterRuntimeBoolean('VITE_TOOL_API_ENABLED', false);
                export async function send(request: { url: string; requestInit: RequestInit }) {
                  return fetch(request.url, request.requestInit);
                }
                """,
            )
            self.write_portal_source(
                root,
                "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts",
                """
                export async function generate() {
                  return fetch('/api/code-snippet');
                }
                """,
            )
            self.write_route_classification(
                root,
                """
                schema: sdkwork-clawrouter-frontend-route-classification
                source: apps/sdkwork-clawrouter-pc/src/App.tsx
                routes:
                  - route: /api-reference
                    package: '@sdkwork/documents-pc-api-reference'
                    owner: developer-experience
                    route_scope: public
                    delivery_kind: local_developer_tool_api
                    browser_env: VITE_TOOL_API_ENABLED
                    runtime_env: PORTAL_PUBLIC_TOOL_API_ENABLED
                    tool_endpoints: [/api/code-snippet]
                    source_files:
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts
                    gate_sources:
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiEndpointView.tsx
                    browser_network_sources:
                      - endpoint: /api/code-snippet
                        source: sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts
                        purpose: local_tool_api
                      - endpoint: external_runtime_request
                        source: sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiEndpointView.tsx
                        purpose: explicit_api_playground_request
                    evidence:
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts
                      - sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiEndpointView.tsx
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "local tool route /api-reference external runtime browser source "
                "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiEndpointView.tsx "
                "must be isolated in an ApiPlayground component or the API reference schema-tabs loader",
                result.messages,
            )

    def test_ignores_random_ui_helpers_outside_contracted_frontend_model_sources(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_app(root, '<Route path="/console/dashboard" element={<Dashboard />} />')
            self.write_manifest(
                root,
                {
                    "routes": {"/console/dashboard": {"tables": ["ai_usage_fact"]}},
                    "tables": [{"table": "ai_usage_fact", "columns": [{"name": "request_count"}]}],
                },
            )
            source_path = (
                "apps/sdkwork-clawrouter-pc/packages/"
                "sdkwork-clawrouter-pc-console-dashboard/src/dashboardService.ts"
            )
            self.write_contract(
                root,
                f"""
                frontend_models:
                  - route: /console/dashboard
                    source: {source_path}
                    interface: DashboardData
                    fields: [requests]
                    data_sources: [ai_usage_fact]
                routes:
                  - route: /console/dashboard
                    required_tables: [ai_usage_fact]
                    required_columns:
                      ai_usage_fact: [request_count]
                """,
            )
            self.write_portal_source(root, source_path, "export const requests = 42;")
            self.write_portal_source(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-dashboard/src/sparkline.ts",
                """
                export function jitter() {
                  return Math.random();
                }
                """,
            )

            result = FrontendContractGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_portal_business_services_use_generated_sdk_client_mount_names(self) -> None:
        root = Path(__file__).resolve().parents[1]
        source_roots = [
            root / "apps" / "sdkwork-clawrouter-pc" / "packages",
            root / "apps" / "sdkwork-clawrouter-pc" / "src",
        ]
        forbidden_mounts = (
            ".announcements.",
            ".providerSecrets.",
            ".access" + "Groups.",
            ".rateLimits.",
            ".firewall.",
            ".couponBatches.",
            ".couponCodes.",
            ".referrals.",
            ".monitor.",
            ".users.",
            ".modelVendors.",
            ".models.",
            ".coupons.",
            ".payments.",
            ".skills.",
        )

        guardian = FrontendContractGuardian(root=root)
        for source_root in source_roots:
            for path in guardian._browser_source_files(source_root):
                if path.suffix not in {".ts", ".tsx"}:
                    continue
                try:
                    path = path.resolve()
                    path.relative_to(source_root.resolve())
                except ValueError:
                    continue
                text = path.read_text(encoding="utf-8")
                if "getClawRouterAppSdkClient()" not in text and "getClawRouterBackendSdkClient()" not in text:
                    continue
                with self.subTest(path=path.relative_to(root).as_posix()):
                    for mount in forbidden_mounts:
                        self.assertNotIn(mount, text)

if __name__ == "__main__":
    unittest.main()
