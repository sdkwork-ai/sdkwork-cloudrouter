import tempfile
import textwrap
import unittest
from pathlib import Path
from unittest.mock import patch

from tools.frontend_field_audit import FrontendFieldAudit


class FrontendFieldAuditTest(unittest.TestCase):
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

    def test_extracts_top_level_and_nested_fields_from_interfaces_and_types(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts",
                """
                export interface AccountStats {
                  id: string;
                  'llm (Text)': number;
                  security: {
                    mfaEnabled: boolean;
                    loginLogs: {
                      ip: string;
                      status: 'success' | 'warning';
                    }[];
                  };
                }

                export type AppRelease = {
                  id: string;
                  version: string;
                  whatsNew?: string;
                };
                """,
            )

            interfaces = FrontendFieldAudit(root=root)._extract_interfaces(source)

            self.assertEqual(
                ["id", "llm (Text)", "security", "security.mfaEnabled", "security.loginLogs", "security.loginLogs.ip", "security.loginLogs.status"],
                interfaces["AccountStats"],
            )
            self.assertEqual(["id", "version", "whatsNew"], interfaces["AppRelease"])

    def test_reports_unregistered_frontend_model_interface(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts",
                """
                export interface DemoModel {
                  id: string;
                }
                """,
            )
            self.write_contract(root, "routes: []\nfrontend_models: []")

            result = FrontendFieldAudit(root=root).validate()

            self.assertFalse(result.ok)
            self.assertIn(
                "frontend model interface missing from contract: apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts#DemoModel",
                result.messages,
            )

    def test_ignores_frontend_model_interfaces_inside_node_modules(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/node_modules/ajv/lib/types.ts",
                """
                export interface SchemaObjectMap {
                  id: string;
                }
                """,
            )
            self.write_contract(root, "routes: []\nfrontend_models: []")

            result = FrontendFieldAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)

    def test_skips_broken_paths_when_recursive_scan_encounters_vanished_node_modules(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            portal = root / "apps" / "sdkwork-clawrouter-pc" / "packages"
            portal.mkdir(parents=True)
            self.write_contract(root, "routes: []\nfrontend_models: []")

            with patch.object(type(root), "iterdir", side_effect=FileNotFoundError("broken node_modules")):
                files = FrontendFieldAudit(root=root)._walk_source_tree(portal)

            self.assertEqual([], files)

    def test_generate_includes_route_and_data_sources_from_contract(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts",
                """
                export interface DemoModel {
                  id: string;
                }
                """,
            )
            self.write_contract(
                root,
                """
                frontend_models:
                  - route: /demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts
                    interface: DemoModel
                    fields: [id]
                    data_sources: [demo_table]
                routes:
                  - route: /demo
                    required_tables: [demo_table]
                """,
            )

            audit = FrontendFieldAudit(root=root).generate()

            self.assertEqual("/demo", audit["interfaces"][0]["route"])
            self.assertEqual(["demo_table"], audit["interfaces"][0]["data_sources"])

    def test_generate_includes_catalog_runtime_model_interfaces(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/runtimeModelCatalog.ts",
                """
                export interface RuntimeModel {
                  id: string;
                  priceAvailability: {
                    status: string;
                  };
                }
                """,
            )
            self.write_contract(
                root,
                """
                frontend_models:
                  - route: /models
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/runtimeModelCatalog.ts
                    interface: RuntimeModel
                    fields: [id, priceAvailability, priceAvailability.status]
                    data_sources: [ai_model]
                routes:
                  - route: /models
                    required_tables: [ai_model]
                """,
            )

            audit = FrontendFieldAudit(root=root).generate()

            self.assertEqual(
                ["id", "priceAvailability", "priceAvailability.status"],
                audit["interfaces"][0]["fields"],
            )

    def test_contract_source_outside_default_scan_extracts_only_declared_interface(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/forumCatalog.ts",
                """
                export type ForumAuthor = {
                  name: string;
                  avatar: string;
                };

                export interface ForumPost {
                  id: string;
                  author: ForumAuthor;
                }

                export type ForumPostPreview = {
                  id: string;
                };
                """,
            )
            self.write_contract(
                root,
                """
                frontend_models:
                  - route: /forum
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/forumCatalog.ts
                    interface: ForumPost
                    fields: [id, author, author.name, author.avatar]
                    data_sources: [content_forum_post]
                routes:
                  - route: /forum
                    required_tables: [content_forum_post]
                """,
            )

            audit = FrontendFieldAudit(root=root).generate()
            result = FrontendFieldAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)
            self.assertEqual(
                ["ForumPost"],
                [entry["interface"] for entry in audit["interfaces"]],
            )
            self.assertEqual(
                ["id", "author", "author.name", "author.avatar"],
                audit["interfaces"][0]["fields"],
            )

    def test_exported_imported_type_alias_can_satisfy_frontend_model_contract(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts",
                """
                import type { SdkworkCommerceDemoModel } from '@sdkwork/commerce-service';

                export type DemoModel = SdkworkCommerceDemoModel;
                """,
            )
            self.write_contract(
                root,
                """
                frontend_models:
                  - route: /demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts
                    interface: DemoModel
                    fields: [id, name]
                    data_sources: [demo_table]
                routes:
                  - route: /demo
                    required_tables: [demo_table]
                """,
            )

            audit = FrontendFieldAudit(root=root).generate()
            result = FrontendFieldAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)
            self.assertEqual(
                ["id", "name"],
                audit["interfaces"][0]["fields"],
            )

    def test_generations_workspace_imported_type_alias_can_satisfy_frontend_model_contract(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/playgroundTypes.ts",
                """
                import type { SdkworkGenerationHistoryItem } from '@sdkwork/generations-pc-workspace/generation-history';

                export type PlaygroundHistoryItem = SdkworkGenerationHistoryItem;
                """,
            )
            self.write_contract(
                root,
                """
                frontend_models:
                  - route: /playground
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/playgroundTypes.ts
                    interface: PlaygroundHistoryItem
                    fields: [id, prompt, status]
                    data_sources: [ai_generation_job]
                routes:
                  - route: /playground
                    required_tables: [ai_generation_job]
                """,
            )

            audit = FrontendFieldAudit(root=root).generate()
            result = FrontendFieldAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)
            self.assertEqual(
                ["id", "prompt", "status"],
                audit["interfaces"][0]["fields"],
            )

    def test_default_scanned_source_expands_local_interface_references(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/settingsService.ts",
                """
                interface DemoNotifications {
                  billReminder: boolean;
                  quotaWarning: boolean;
                }

                export interface DemoSettings {
                  language: string;
                  notifications: DemoNotifications;
                }
                """,
            )
            self.write_contract(
                root,
                """
                frontend_models:
                  - route: /settings
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/settingsService.ts
                    interface: DemoSettings
                    fields: [language, notifications, notifications.billReminder, notifications.quotaWarning]
                    data_sources: [iam_user_preference]
                routes:
                  - route: /settings
                    required_tables: [iam_user_preference]
                """,
            )

            audit = FrontendFieldAudit(root=root).generate()
            result = FrontendFieldAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)
            fields_by_interface = {entry["interface"]: entry["fields"] for entry in audit["interfaces"]}
            self.assertEqual(["DemoSettings"], list(fields_by_interface))
            self.assertEqual(
                ["language", "notifications", "notifications.billReminder", "notifications.quotaWarning"],
                fields_by_interface["DemoSettings"],
            )

    def test_generate_ignores_local_filter_catalog_interfaces(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/modelCatalog.ts",
                """
                export interface ModelCatalogFilters {
                  searchQuery: string;
                }
                """,
            )
            self.write_contract(root, "routes: []\nfrontend_models: []")

            result = FrontendFieldAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)

    def test_reports_contract_field_mismatch(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts",
                """
                export interface DemoModel {
                  id: string;
                  name: string;
                }
                """,
            )
            self.write_contract(
                root,
                """
                routes: []
                frontend_models:
                  - route: /demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts
                    interface: DemoModel
                    fields: [id]
                """,
            )

            result = FrontendFieldAudit(root=root).validate()

            self.assertFalse(result.ok)
            self.assertIn(
                "frontend model fields mismatch for apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts#DemoModel: missing fields [name]",
                result.messages,
            )

    def test_derived_fields_satisfy_frontend_only_view_model_fields(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts",
                """
                export interface DemoModel {
                  id: string;
                  displayName: string;
                }
                """,
            )
            self.write_contract(
                root,
                """
                frontend_models:
                  - route: /demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts
                    interface: DemoModel
                    fields: [id]
                    derived_fields: [displayName]
                    data_sources: [demo_table]
                routes:
                  - route: /demo
                    required_tables: [demo_table]
                """,
            )

            result = FrontendFieldAudit(root=root).validate()

            self.assertTrue(result.ok, result.messages)

    def test_reports_frontend_model_without_data_sources(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts",
                """
                export interface DemoModel {
                  id: string;
                }
                """,
            )
            self.write_contract(
                root,
                """
                frontend_models:
                  - route: /demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts
                    interface: DemoModel
                    fields: [id]
                routes:
                  - route: /demo
                    required_tables: [demo_table]
                """,
            )

            result = FrontendFieldAudit(root=root).validate()

            self.assertFalse(result.ok)
            self.assertIn(
                "frontend model apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts#DemoModel must declare non-empty data_sources",
                result.messages,
            )

    def test_allows_upload_model_with_file_targets_instead_of_database_sources(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts",
                """
                interface MediaResource {
                  kind: string;
                  source: string;
                  uri?: string;
                }

                export interface ForumAttachmentUploadResult {
                  attachment: MediaResource;
                  fileName: string;
                }
                """,
            )
            self.write_contract(
                root,
                """
                frontend_models:
                  - route: /demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts
                    interface: ForumAttachmentUploadResult
                    fields: [attachment, attachment.kind, attachment.source, attachment.uri, fileName]
                    data_sources: []
                    file_targets: [forum_attachment_uploads]
                routes:
                  - route: /demo
                    required_tables: [content_forum_post]
                """,
            )

            result = FrontendFieldAudit(root=root).validate()
            audit = FrontendFieldAudit(root=root).generate()

            self.assertTrue(result.ok, result.messages)
            self.assertEqual(["forum_attachment_uploads"], audit["interfaces"][0]["file_targets"])

    def test_reports_upload_model_without_file_targets_or_data_sources(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts",
                """
                interface MediaResource {
                  kind: string;
                  source: string;
                  uri?: string;
                }

                export interface ForumAttachmentUploadResult {
                  attachment: MediaResource;
                }
                """,
            )
            self.write_contract(
                root,
                """
                frontend_models:
                  - route: /demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts
                    interface: ForumAttachmentUploadResult
                    fields: [attachment, attachment.kind, attachment.source, attachment.uri]
                    data_sources: []
                routes:
                  - route: /demo
                    required_tables: [content_forum_post]
                """,
            )

            result = FrontendFieldAudit(root=root).validate()

            self.assertFalse(result.ok)
            self.assertIn(
                "frontend model apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts#ForumAttachmentUploadResult must declare non-empty data_sources or file_targets",
                result.messages,
            )

    def test_reports_frontend_model_data_source_not_declared_on_route(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts",
                """
                export interface DemoModel {
                  id: string;
                }
                """,
            )
            self.write_contract(
                root,
                """
                frontend_models:
                  - route: /demo
                    source: apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts
                    interface: DemoModel
                    fields: [id]
                    data_sources: [missing_table]
                routes:
                  - route: /demo
                    required_tables: [demo_table]
                """,
            )

            result = FrontendFieldAudit(root=root).validate()

            self.assertFalse(result.ok)
            self.assertIn(
                "frontend model apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts#DemoModel data_source missing_table is not declared in route /demo required_tables",
                result.messages,
            )


if __name__ == "__main__":
    unittest.main()
