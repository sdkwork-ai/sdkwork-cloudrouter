import tempfile
import textwrap
import unittest
from pathlib import Path
from unittest.mock import patch

from tools.frontend_operation_audit import FrontendOperationAudit


class FrontendOperationAuditTest(unittest.TestCase):
    def write_file(self, root: Path, relative_path: str, content: str) -> Path:
        path = root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return path

    def write_contract(self, root: Path, content: str) -> Path:
        path = root / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return path

    def write_modular_contract(self, root: Path, content: str) -> Path:
        fragment = root / "docs" / "schema-registry" / "frontend-field-contracts" / "operations" / "demo.yaml"
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
                  - operations/demo.yaml
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )
        return index

    def write_dependency_operation_fragment(self, root: Path, content: str) -> Path:
        fragment = root / "docs" / "schema-registry" / "frontend-field-contracts" / "operations" / "app-commerce-catalog.yaml"
        fragment.parent.mkdir(parents=True, exist_ok=True)
        fragment.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return fragment

    def test_extracts_class_static_and_object_service_operations(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            class_source = self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts",
                """
                export class DemoService {
                  static async fetchItems(): Promise<string[]> {
                    return [];
                  }

                  async ignoredInstanceMethod(): Promise<void> {
                  }

                  static async updateItem(id: string): Promise<void> {
                  }
                }
                """,
            )
            object_source = self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/services/appService.ts",
                """
                export const appService = {
                  async getApps(): Promise<string[]> {
                    return [];
                  },
                  async getAppById(id: string): Promise<string | undefined> {
                    return undefined;
                  }
                };
                """,
            )

            auditor = FrontendOperationAudit(root=root)

            self.assertEqual(["fetchItems", "updateItem"], auditor._extract_operations(class_source))
            self.assertEqual(["getApps", "getAppById"], auditor._extract_operations(object_source))

    def test_includes_portal_auth_controller_operations_outside_packages(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/src/auth/clawRouterAuthController.ts",
                """
                import { getClawRouterAppSdkClient } from 'sdkwork-clawroutes-pc-commons/runtime';

                export async function loadCurrentUser(): Promise<void> {
                  await getClawRouterAppSdkClient().user.fetchUserProfile();
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /auth/login
                    required_tables: [plus_user]
                frontend_operations:
                  - route: /auth/login
                    source: apps/sdkwork-clawrouter-pc/src/auth/clawRouterAuthController.ts
                    operation: loadCurrentUser
                    kind: read
                    api_surface: app
                    api_method: GET
                    api_path: /app/v3/api/user/profile
                    read_sources: [plus_user]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)

    def test_allows_appbase_iam_runtime_as_generated_sdk_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/src/auth/clawRouterAuthController.ts",
                """
                import { getClawRouterIamRuntime } from 'sdkwork-clawroutes-pc-commons/runtime';

                export async function login(): Promise<void> {
                  await getClawRouterIamRuntime().service.auth.sessions.create({ grantType: 'password' });
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /auth/login
                    required_tables: [iam_user, iam_credential, iam_session, iam_security_event]
                frontend_operations:
                  - route: /auth/login
                    source: apps/sdkwork-clawrouter-pc/src/auth/clawRouterAuthController.ts
                    operation: login
                    operation_id: sessions.create
                    kind: create
                    api_surface: app
                    api_method: POST
                    api_path: /app/v3/api/auth/sessions
                    read_sources: [iam_user, iam_credential, iam_session]
                    write_tables: [iam_session, iam_security_event]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)

    def test_allows_generations_dependency_service_as_generated_sdk_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/playgroundService.ts",
                """
                import { getSdkworkGenerationsAppSdkClient } from 'sdkwork-clawroutes-pc-commons/runtime';
                import { createSdkworkGenerationService } from '@sdkwork/generations-pc-workspace/generation-service';

                export class PlaygroundService {
                  static async runGeneration(): Promise<void> {
                    const service = createSdkworkGenerationService({
                      sdkClients: {
                        generationsApp: getSdkworkGenerationsAppSdkClient(),
                      },
                    });
                    await service.createGenerationCommand({ prompt: 'draw a cube' });
                  }
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /playground
                    required_tables: [generation_record, generation_dispatch_job]
                frontend_operations:
                  - route: /playground
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/playgroundService.ts
                    operation: runGeneration
                    operation_scope: app_shell
                    operation_id: generations.images.textToImage
                    kind: create
                    api_surface: app
                    api_method: POST
                    api_path: /app/v3/api/generations/images/text_to_image
                    sdk_domain: generations
                    read_sources: [generation_record]
                    write_tables: [generation_record, generation_dispatch_job]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)

    def test_allows_injected_generations_service_as_generated_sdk_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/playgroundGenerationsService.ts",
                """
                import type { SdkworkGenerationService } from '@sdkwork/generations-pc-workspace/generation-service';

                export async function runPlaygroundAssetGeneration(
                  service: SdkworkGenerationService,
                ): Promise<void> {
                  const result = await service.createGenerationCommand({ prompt: 'draw a cube' });
                  await service.listGenerationResults({ generationId: result.record.id });
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /playground
                    required_tables: [ai_generation_job, ai_generation_asset]
                frontend_operations:
                  - route: /playground
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/playgroundGenerationsService.ts
                    operation: runPlaygroundAssetGeneration
                    operation_scope: app_shell
                    operation_id: playground.generations.asset.run
                    kind: create
                    api_surface: app
                    api_method: POST
                    api_path: /app/v3/api/generations/images/text_to_image
                    sdk_domain: generations
                    read_sources: [ai_generation_job]
                    write_tables: [ai_generation_job, ai_generation_asset]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)

    def test_extracts_appbase_iam_runtime_auth_controller_factory_operations_without_legacy_provider_login(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/src/auth/clawRouterAuthController.ts",
                """
                import { createSdkworkIamRuntimeAuthController } from '@sdkwork/auth-pc-react';
                import { getClawRouterIamRuntime } from 'sdkwork-clawroutes-pc-commons/runtime';

                export const clawRouterAuthController = createSdkworkIamRuntimeAuthController({
                  getRuntime: getClawRouterIamRuntime,
                });
                """,
            )

            operations = FrontendOperationAudit(root=root)._extract_operations(source)

            self.assertIn("signIn", operations)
            self.assertIn("signInWithEmailCode", operations)
            self.assertIn("signInWithPhoneCode", operations)
            self.assertIn("signInWithSessionBridge", operations)
            self.assertIn("register", operations)
            self.assertIn("refreshSession", operations)
            self.assertIn("updateCurrentSession", operations)
            self.assertIn("signOut", operations)
            self.assertIn("getOAuthAuthorizationUrl", operations)
            self.assertIn("verifyCode", operations)
            self.assertNotIn("generateLoginQrCode", operations)
            self.assertNotIn("checkLoginQrCodeStatus", operations)
            self.assertNotIn("confirmLoginQrCode", operations)
            self.assertNotIn("callbackLoginQrCode", operations)

    def test_reports_unregistered_service_operation(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts",
                """
                export class DemoService {
                  static async fetchItems(): Promise<string[]> {
                    return [];
                  }
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /demo
                    required_tables: [demo_table]
                frontend_operations: []
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertFalse(result.ok)
            self.assertIn(
                "frontend operation missing from contract: apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts#fetchItems",
                result.messages,
            )

    def test_ignores_service_operations_inside_node_modules(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/node_modules/sdkwork-clawroutes-pc-commons/src/sessionService.ts",
                """
                export async function createAppSession(): Promise<void> {
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /demo
                    required_tables: [demo_table]
                frontend_operations: []
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)

    def test_default_contract_path_prefers_modular_index_over_stale_snapshot(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts",
                """
                import { getClawRouterAppSdkClient } from 'sdkwork-clawroutes-pc-commons/runtime';

                export async function fetchItems(): Promise<void> {
                  await getClawRouterAppSdkClient().demo.items.list();
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes: []
                frontend_operations: []
                """,
            )
            self.write_modular_contract(
                root,
                """
                routes:
                  - route: /demo
                    required_tables: [demo_table]
                frontend_operations:
                  - route: /demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts
                    operation: fetchItems
                    kind: read
                    api_surface: app
                    api_method: GET
                    api_path: /app/v3/api/demo/items
                    read_sources: [demo_table]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_dependency_only_operation_fragment_outside_main_contract_index(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/rechargeService.ts",
                """
                import { getSdkworkCommerceService } from '@sdkwork/commerce-service';

                export async function listCatalogProducts(): Promise<unknown> {
                  return getSdkworkCommerceService().catalog.products.list();
                }
                """,
            )
            self.write_modular_contract(
                root,
                """
                routes:
                  - route: /console/recharge
                    required_tables: [commerce_product_spu]
                frontend_operations: []
                """,
            )
            self.write_dependency_operation_fragment(
                root,
                """
                fragment: operations/app-commerce-catalog
                frontend_operations:
                  - route: /console/recharge
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/rechargeService.ts
                    operation: listCatalogProducts
                    operation_id: catalog.products.list
                    kind: read
                    api_surface: app
                    api_method: GET
                    api_path: /app/v3/api/catalog/products
                    sdk_domain: commerce
                    read_sources: [commerce_product_spu]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)

    def test_skips_broken_paths_when_recursive_scan_encounters_vanished_node_modules(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            portal = root / "apps" / "sdkwork-clawrouter-pc" / "packages"
            portal.mkdir(parents=True)
            self.write_contract(
                root,
                """
                routes: []
                frontend_operations: []
                """,
            )

            with patch.object(type(root), "iterdir", side_effect=FileNotFoundError("broken node_modules")):
                files = FrontendOperationAudit(root=root)._walk_source_tree(portal)

            self.assertEqual([], files)

    def test_reports_write_operation_without_write_tables(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts",
                """
                export class DemoService {
                  static async updateItem(): Promise<void> {
                  }
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /demo
                    required_tables: [demo_table]
                frontend_operations:
                  - route: /demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts
                    operation: updateItem
                    kind: update
                    api_surface: app
                    api_method: PATCH
                    api_path: /app/v3/api/demo/items/{id}
                    read_sources: [demo_table]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertFalse(result.ok)
            self.assertIn(
                "frontend operation apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts#updateItem kind update must declare non-empty write_tables",
                result.messages,
            )

    def test_allows_multipart_upload_operation_with_file_targets_instead_of_database_tables(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts",
                """
                import { getClawRouterAppSdkClient } from 'sdkwork-clawroutes-pc-commons/runtime';

                export async function uploadVideo(): Promise<void> {
                  const formData = new FormData();
                  await getClawRouterAppSdkClient().content.forum.attachments.create(formData);
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /demo
                    required_tables: [content_forum_post]
                frontend_operations:
                  - route: /demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts
                    operation: uploadVideo
                    operation_id: forum.attachments.create
                    kind: create
                    api_surface: app
                    api_method: POST
                    api_path: /app/v3/api/content/forum/attachments
                    request_content_type: multipart/form-data
                    read_sources: []
                    write_tables: []
                    file_targets: [forum_attachment_uploads]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)

    def test_reports_multipart_upload_operation_without_file_targets(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts",
                """
                import { getClawRouterAppSdkClient } from 'sdkwork-clawroutes-pc-commons/runtime';

                export async function uploadVideo(): Promise<void> {
                  const formData = new FormData();
                  await getClawRouterAppSdkClient().content.forum.attachments.create(formData);
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /demo
                    required_tables: [content_forum_post]
                frontend_operations:
                  - route: /demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts
                    operation: uploadVideo
                    operation_id: forum.attachments.create
                    kind: create
                    api_surface: app
                    api_method: POST
                    api_path: /app/v3/api/content/forum/attachments
                    request_content_type: multipart/form-data
                    read_sources: []
                    write_tables: []
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertFalse(result.ok)
            self.assertIn(
                "frontend operation apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts#uploadVideo multipart upload must declare non-empty file_targets",
                result.messages,
            )

    def test_reports_operation_table_not_declared_on_route(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts",
                """
                export class DemoService {
                  static async fetchItems(): Promise<string[]> {
                    return [];
                  }
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /demo
                    required_tables: [demo_table]
                frontend_operations:
                  - route: /demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts
                    operation: fetchItems
                    kind: read
                    api_surface: app
                    api_method: GET
                    api_path: /app/v3/api/demo/items
                    read_sources: [missing_table]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertFalse(result.ok)
            self.assertIn(
                "frontend operation apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts#fetchItems read_source missing_table is not declared in route /demo required_tables",
                result.messages,
            )

    def test_generate_includes_contract_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts",
                """
                export class DemoService {
                  static async addItem(): Promise<void> {
                  }
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /demo
                    required_tables: [demo_table, ops_audit_log]
                frontend_operations:
                  - route: /demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts
                    operation: addItem
                    kind: create
                    api_surface: app
                    api_method: POST
                    api_path: /app/v3/api/demo/items
                    read_sources: [demo_table]
                    write_tables: [demo_table, ops_audit_log]
                """,
            )

            audit = FrontendOperationAudit(root=root).generate()

            self.assertEqual("/demo", audit["operations"][0]["route"])
            self.assertEqual("create", audit["operations"][0]["kind"])
            self.assertEqual("app", audit["operations"][0]["api_surface"])
            self.assertEqual("POST", audit["operations"][0]["api_method"])
            self.assertEqual("/app/v3/api/demo/items", audit["operations"][0]["api_path"])
            self.assertEqual(["demo_table"], audit["operations"][0]["read_sources"])
            self.assertEqual(["demo_table", "ops_audit_log"], audit["operations"][0]["write_tables"])

    def test_reports_missing_api_contract(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts",
                """
                export class DemoService {
                  static async fetchItems(): Promise<string[]> {
                    return [];
                  }
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /demo
                    required_tables: [demo_table]
                frontend_operations:
                  - route: /demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts
                    operation: fetchItems
                    kind: read
                    read_sources: [demo_table]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertFalse(result.ok)
            self.assertIn(
                "frontend operation apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts#fetchItems must declare api_surface",
                result.messages,
            )
            self.assertIn(
                "frontend operation apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts#fetchItems must declare api_method",
                result.messages,
            )
            self.assertIn(
                "frontend operation apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts#fetchItems must declare api_path",
                result.messages,
            )

    def test_reports_api_path_prefix_and_route_surface_mismatch(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/adminService.ts",
                """
                import { getClawRouterBackendSdkClient } from 'sdkwork-clawroutes-pc-commons';

                export class AdminService {
                  static async fetchItems(): Promise<string[]> {
                    const result = await getClawRouterBackendSdkClient().router.fetchGroups();
                    return Array.isArray(result.data) ? result.data : [];
                  }
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /admin/demo
                    required_tables: [demo_table]
                frontend_operations:
                  - route: /admin/demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/adminService.ts
                    operation: fetchItems
                    kind: read
                    api_surface: app
                    api_method: GET
                    api_path: /app/v3/api/admin/demo/items
                    read_sources: [demo_table]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertFalse(result.ok)
            self.assertIn(
                "frontend operation apps/sdkwork-clawrouter-pc/packages/demo/src/adminService.ts#fetchItems route /admin/demo must use backend api_surface",
                result.messages,
            )

    def test_allows_sdk_surface_with_non_standard_url_path(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts",
                """
                import { getClawRouterAppSdkClient } from 'sdkwork-clawroutes-pc-commons/runtime';

                export class DemoService {
                  static async fetchItems(): Promise<string[]> {
                    const result = await getClawRouterAppSdkClient().tenant.fetchItems();
                    return Array.isArray(result.data) ? result.data : [];
                  }
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /demo
                    required_tables: [demo_table]
                frontend_operations:
                  - route: /demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts
                    operation: fetchItems
                    kind: read
                    api_surface: app
                    api_method: GET
                    api_path: /tenant-a/product-api/demo/items
                    read_sources: [demo_table]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)

    def test_reports_method_that_does_not_match_operation_kind(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts",
                """
                export class DemoService {
                  static async addItem(): Promise<void> {
                  }
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /demo
                    required_tables: [demo_table]
                frontend_operations:
                  - route: /demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts
                    operation: addItem
                    kind: create
                    api_surface: app
                    api_method: GET
                    api_path: /app/v3/api/demo/items
                    read_sources: [demo_table]
                    write_tables: [demo_table]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertFalse(result.ok)
            self.assertIn(
                "frontend operation apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts#addItem kind create does not allow api_method GET",
                result.messages,
            )

    def test_allows_backend_read_operation_to_use_java_post_list_contract(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/adminService.ts",
                """
                import { getClawRouterBackendSdkClient } from 'sdkwork-clawroutes-pc-commons';

                export class AdminService {
                  static async fetchItems(): Promise<string[]> {
                    const result = await getClawRouterBackendSdkClient().router.fetchGroups();
                    return Array.isArray(result.data) ? result.data : [];
                  }
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /admin/demo
                    required_tables: [demo_table]
                frontend_operations:
                  - route: /admin/demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/adminService.ts
                    operation: fetchItems
                    kind: read
                    api_surface: backend
                    api_method: POST
                    api_path: /backend/v3/api/demo/list
                    read_sources: [demo_table]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)

    def test_reports_app_operation_without_generated_sdk_and_mock_async_data(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts",
                """
                export class DemoService {
                  static async fetchItems(): Promise<string[]> {
                    return new Promise((resolve) => {
                      setTimeout(() => resolve(["local-mock"]), 100);
                    });
                  }
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /demo
                    required_tables: [demo_table]
                frontend_operations:
                  - route: /demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts
                    operation: fetchItems
                    kind: read
                    api_surface: app
                    api_method: GET
                    api_path: /app/v3/api/demo/items
                    read_sources: [demo_table]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertFalse(result.ok)
            self.assertIn(
                "frontend operation apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts#fetchItems must use getClawRouterAppSdkClient for app api_surface",
                result.messages,
            )
            self.assertIn(
                "frontend operation apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts#fetchItems must not use mock async data pattern: setTimeout",
                result.messages,
            )

    def test_reports_backend_operation_without_generated_sdk_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/adminService.ts",
                """
                export class AdminService {
                  static async fetchItems(): Promise<string[]> {
                    return [];
                  }
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /admin/demo
                    required_tables: [demo_table]
                frontend_operations:
                  - route: /admin/demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/adminService.ts
                    operation: fetchItems
                    kind: read
                    api_surface: backend
                    api_method: POST
                    api_path: /backend/v3/api/demo/list
                    read_sources: [demo_table]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertFalse(result.ok)
            self.assertIn(
                "frontend operation apps/sdkwork-clawrouter-pc/packages/demo/src/adminService.ts#fetchItems must use getClawRouterBackendSdkClient for backend api_surface",
                result.messages,
            )

    def test_accepts_commerce_dependency_service_as_generated_sdk_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/billingService.ts",
                """
                import { getSdkworkCommerceService } from '@sdkwork/commerce-service';

                export class BillingService {
                  static async fetchWallet(): Promise<unknown> {
                    return getSdkworkCommerceService().wallet.overview.retrieve();
                  }
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /console/commerce
                    required_tables: [commerce_account]
                frontend_operations:
                  - route: /console/commerce
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/billingService.ts
                    operation: fetchWallet
                    kind: read
                    api_surface: app
                    api_method: GET
                    api_path: /app/v3/api/billing/account/summary
                    sdk_domain: commerce
                    read_sources: [commerce_account]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)

    def test_reports_commerce_dependency_operation_without_dependency_service(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/billingService.ts",
                """
                import { getClawRouterAppSdkClient } from 'sdkwork-clawroutes-pc-commons/runtime';

                export class BillingService {
                  static async fetchWallet(): Promise<unknown> {
                    return getClawRouterAppSdkClient().commerce.wallet.overview.retrieve();
                  }
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /console/commerce
                    required_tables: [commerce_account]
                frontend_operations:
                  - route: /console/commerce
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/billingService.ts
                    operation: fetchWallet
                    kind: read
                    api_surface: app
                    api_method: GET
                    api_path: /app/v3/api/billing/account/summary
                    sdk_domain: commerce
                    read_sources: [commerce_account]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertFalse(result.ok)
            self.assertIn(
                "frontend operation apps/sdkwork-clawrouter-pc/packages/demo/src/billingService.ts#fetchWallet must use getClawRouterBackendSdkClient().<domain>, getClawRouterAppSdkClient().<domain>, or missingCommerceDependencyOperation for app api_surface",
                result.messages,
            )

    def test_accepts_appbase_app_sdk_client_as_iam_dependency_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/userService.ts",
                """
                import { getSdkworkAppbaseAppSdkClient } from 'sdkwork-clawroutes-pc-commons/runtime';

                export class UserService {
                  static async fetchCurrentUser(): Promise<unknown> {
                    return getSdkworkAppbaseAppSdkClient().iam.users.current.retrieve();
                  }
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /console/user
                    required_tables: [iam_user]
                frontend_operations:
                  - route: /console/user
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/userService.ts
                    operation: fetchCurrentUser
                    kind: read
                    api_surface: app
                    api_method: GET
                    api_path: /app/v3/api/iam/users/current
                    sdk_domain: iam
                    read_sources: [iam_user]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_appbase_app_oauth_authorization_url_create_without_product_write_tables(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/oauthService.ts",
                """
                import { getSdkworkAppbaseAppSdkClient } from 'sdkwork-clawroutes-pc-commons/sdk-clients';

                export async function createAuthorizationUrl(): Promise<unknown> {
                  return getSdkworkAppbaseAppSdkClient().oauth.authorizationUrls.create({
                    provider: 'github',
                    redirectUri: 'https://app.example/callback',
                    state: 'state-1',
                  });
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /auth/oauth/callback/:provider
                    required_tables: [iam_oauth_provider_config]
                frontend_operations:
                  - route: /auth/oauth/callback/:provider
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/oauthService.ts
                    operation: createAuthorizationUrl
                    operation_id: oauth.authorizationUrls.create
                    kind: create
                    api_surface: app
                    api_method: POST
                    api_path: /app/v3/api/oauth/authorization_urls
                    sdk_domain: iam
                    read_sources: [iam_oauth_provider_config]
                    write_tables: []
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_appbase_backend_oauth_sdk_client_as_dependency_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/oauthAdminService.ts",
                """
                import { getSdkworkAppbaseBackendSdkClient } from 'sdkwork-clawroutes-pc-commons/sdk-clients';

                export async function listOAuthProviderCatalog(): Promise<unknown> {
                  return getSdkworkAppbaseBackendSdkClient().iam.oauth.providerCatalog.list();
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /admin/oauth
                    dependency_owned: true
                    dependency_sdk_family: sdkwork-iam-backend-sdk
                    required_tables: [iam_oauth_provider_catalog]
                frontend_operations:
                  - route: /admin/oauth
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/oauthAdminService.ts
                    operation: listOAuthProviderCatalog
                    kind: read
                    api_surface: backend
                    api_method: GET
                    api_path: /backend/v3/api/iam/oauth/provider_catalog
                    sdk_domain: appbase
                    read_sources: [iam_oauth_provider_catalog]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_commerce_app_shell_operation_inferred_from_dependency_path(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/accountService.ts",
                """
                import { getSdkworkCommerceService } from '@sdkwork/commerce-service';

                export class AccountService {
                  static async fetchAccountDetails(): Promise<unknown> {
                    return getSdkworkCommerceService().accounts.current.summary.retrieve();
                  }
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /console/account
                    required_tables: [commerce_account]
                frontend_operations:
                  - route: /console/account
                    operation_scope: app_shell
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/accountService.ts
                    operation: fetchAccountDetails
                    kind: read
                    api_surface: app
                    api_method: GET
                    api_path: /app/v3/api/accounts/current/summary
                    read_sources: [commerce_account]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)

    def test_prefers_appbase_iam_dependency_boundary_over_shared_commerce_read_table(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/adminUserService.ts",
                """
                import { getSdkworkAppbaseBackendSdkClient } from 'sdkwork-clawroutes-pc-commons/runtime';

                export class AdminUserService {
                  static async fetchUsers(): Promise<unknown> {
                    return getSdkworkAppbaseBackendSdkClient().iam.users.list();
                  }
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /admin/user
                    required_tables: [iam_user, commerce_account]
                frontend_operations:
                  - route: /admin/user
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/adminUserService.ts
                    operation: fetchUsers
                    kind: read
                    api_surface: backend
                    api_method: GET
                    api_path: /backend/v3/api/iam/users
                    read_sources: [iam_user, commerce_account]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_appbase_backend_oauth_dependency_operation_without_product_sdk_namespace(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/oauthAdminService.ts",
                """
                import { getSdkworkAppbaseBackendSdkClient } from 'sdkwork-clawroutes-pc-commons/sdk-clients';

                export async function listOAuthResourceAccounts(): Promise<unknown> {
                  return getSdkworkAppbaseBackendSdkClient().iam.oauth.resourceAccounts.list();
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /admin/oauth
                    dependency_owned: true
                    dependency_sdk_family: sdkwork-iam-backend-sdk
                    required_tables: [iam_oauth_resource_account]
                frontend_operations:
                  - route: /admin/oauth
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/oauthAdminService.ts
                    operation: listOAuthResourceAccounts
                    kind: read
                    api_surface: backend
                    api_method: GET
                    api_path: /backend/v3/api/iam/oauth/resource_accounts
                    sdk_domain: appbase
                    openapi_exposed: false
                    read_sources: [iam_oauth_resource_account]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_legacy_commerce_runtime_import_when_backed_by_domain_transport_sdk(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/commerce-runtime.ts",
                """
                import { getClawRouterAppSdkClient } from './sdk-clients.ts';

                export async function appAccountsCurrentSummaryRetrieve(): Promise<unknown> {
                  return getClawRouterAppSdkClient().commerce.accounts.current.summary.retrieve();
                }
                """,
            )
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/commerce-console-service.ts",
                """
                import { appAccountsCurrentSummaryRetrieve } from './commerce-runtime.ts';

                export class ConsoleCommerceService {
                  static async fetchAccountDetails(): Promise<unknown> {
                    return appAccountsCurrentSummaryRetrieve();
                  }
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /console/account
                    required_tables: [commerce_account]
                frontend_operations:
                  - route: /console/account
                    source: apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/commerce-console-service.ts
                    operation: fetchAccountDetails
                    operation_scope: app_shell
                    kind: read
                    api_surface: app
                    api_method: GET
                    api_path: /app/v3/api/accounts/current/summary
                    read_sources: [commerce_account]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_local_runtime_adapter_import_as_generated_sdk_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/appRuntimeApiOperations.ts",
                """
                import { getClawRouterAppSdkClient } from 'sdkwork-clawroutes-pc-commons/runtime';

                export async function listModelCatalog(): Promise<unknown> {
                  return getClawRouterAppSdkClient().intelligence.modelsList();
                }
                """,
            )
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts",
                """
                import { listModelCatalog } from './appRuntimeApiOperations.ts';

                export class DemoService {
                  static async fetchModelGroups(): Promise<unknown> {
                    return listModelCatalog();
                  }
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /demo
                    required_tables: [ai_model]
                frontend_operations:
                  - route: /demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/appRuntimeApiOperations.ts
                    operation: listModelCatalog
                    kind: read
                    api_surface: app
                    api_method: GET
                    api_path: /app/v3/api/ai/models
                    read_sources: [ai_model]
                  - route: /demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts
                    operation: fetchModelGroups
                    operation_scope: app_shell
                    kind: read
                    api_surface: app
                    api_method: GET
                    api_path: /app/v3/api/ai/models
                    read_sources: [ai_model]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_app_shell_operation_with_global_read_sources(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/siteBranding.ts",
                """
                import { getClawRouterAppSdkClient } from './sdk-clients.ts';

                export async function fetchSiteBranding(): Promise<unknown> {
                  return getClawRouterAppSdkClient().system.site.runtime.retrieve();
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /
                    required_tables: [content_doc_page]
                frontend_operations:
                  - route: /
                    operation_scope: app_shell
                    source: apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/siteBranding.ts
                    operation: fetchSiteBranding
                    operation_id: site.runtime.retrieve
                    kind: read
                    api_surface: app
                    api_method: GET
                    api_path: /app/v3/api/system/site/runtime
                    read_sources: [ops_config_snapshot]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)

            audit = FrontendOperationAudit(root=root).generate()
            self.assertEqual("app_shell", audit["operations"][0]["operation_scope"])

    def test_accepts_openai_v1_operation_through_ai_sdk_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/chatService.ts",
                """
                import { getClawRouterAiSdkClient } from 'sdkwork-clawroutes-pc-commons/runtime';

                export class ChatService {
                  static async sendMessage(): Promise<string> {
                    const client = getClawRouterAiSdkClient({ apiKey: 'test-key' });
                    const response = await client.chat.completions.create({
                      model: 'gpt-test',
                      messages: [{ role: 'user', content: 'hello' }],
                    });
                    return response.id;
                  }
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /demo
                    required_tables: [ai_request_trace, ai_usage_fact]
                frontend_operations:
                  - route: /demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/chatService.ts
                    operation: sendMessage
                    kind: create
                    api_surface: openai_v1
                    api_method: POST
                    api_path: /v1/chat/completions
                    read_sources: [ai_request_trace]
                    write_tables: [ai_request_trace, ai_usage_fact]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)

    def test_reports_openai_v1_operation_without_ai_sdk_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/chatService.ts",
                """
                export class ChatService {
                  static async sendMessage(): Promise<string> {
                    return 'local';
                  }
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes:
                  - route: /demo
                    required_tables: [ai_request_trace, ai_usage_fact]
                frontend_operations:
                  - route: /demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/chatService.ts
                    operation: sendMessage
                    kind: create
                    api_surface: openai_v1
                    api_method: POST
                    api_path: /v1/chat/completions
                    read_sources: [ai_request_trace]
                    write_tables: [ai_request_trace, ai_usage_fact]
                """,
            )

            result = FrontendOperationAudit(root=root).validate()

            self.assertFalse(result.ok)
            self.assertIn(
                "frontend operation apps/sdkwork-clawrouter-pc/packages/demo/src/chatService.ts#sendMessage must use getClawRouterAiSdkClient for openai_v1 api_surface",
                result.messages,
            )


if __name__ == "__main__":
    unittest.main()
