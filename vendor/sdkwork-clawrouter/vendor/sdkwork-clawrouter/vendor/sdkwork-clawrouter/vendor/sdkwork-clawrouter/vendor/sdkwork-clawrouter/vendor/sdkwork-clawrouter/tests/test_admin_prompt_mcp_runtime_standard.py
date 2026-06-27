from __future__ import annotations

import json
import unittest
from pathlib import Path

import yaml

from tools.frontend_contract_loader import load_frontend_field_contract
from tools.schema_registry_loader import load_schema_registry


ROOT = Path(__file__).resolve().parents[1]
TABLE_REGISTRY_PATH = ROOT / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
BACKEND_OPENAPI_PATH = ROOT / "generated" / "openapi" / "clawrouter-backend-openapi.json"
BACKEND_SDK_ROOT = (
    ROOT
    / "sdks"
    / "clawrouter-backend-sdk"
    / "clawrouter-backend-sdk-typescript"
    / "src"
)
PORTAL_ROOT = ROOT / "apps" / "sdkwork-clawrouter-pc"


class AdminPromptMcpRuntimeStandardTest(unittest.TestCase):
    def test_prompt_and_mcp_contracts_are_vertical_backend_modules(self) -> None:
        contract = load_frontend_field_contract(ROOT)
        operations = {
            operation["operation"]: operation
            for operation in contract.get("frontend_operations", [])
            if isinstance(operation, dict)
            and operation.get("source")
            in {
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-prompts/src/promptService.ts",
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-mcp/src/mcpService.ts",
            }
        }

        expected = {
            "listPrompts": ("GET", "/backend/v3/api/prompts"),
            "createPrompt": ("POST", "/backend/v3/api/prompts"),
            "listPromptVersions": ("GET", "/backend/v3/api/prompts/{promptId}/versions"),
            "createPromptVersion": ("POST", "/backend/v3/api/prompts/{promptId}/versions"),
            "publishPromptVersion": ("POST", "/backend/v3/api/prompts/versions/{versionId}/publish"),
            "renderPromptVersion": ("POST", "/backend/v3/api/prompts/versions/{versionId}/render"),
            "listPromptBindings": ("GET", "/backend/v3/api/prompts/{promptId}/bindings"),
            "createPromptBinding": ("POST", "/backend/v3/api/prompts/{promptId}/bindings"),
            "updatePromptBinding": ("PUT", "/backend/v3/api/prompts/bindings/{bindingId}"),
            "listMcpServers": ("GET", "/backend/v3/api/mcp/servers"),
            "getMcpServer": ("GET", "/backend/v3/api/mcp/servers/{serverId}"),
            "createMcpServer": ("POST", "/backend/v3/api/mcp/servers"),
            "updateMcpServer": ("PUT", "/backend/v3/api/mcp/servers/{serverId}"),
            "listMcpServerRevisions": ("GET", "/backend/v3/api/mcp/servers/{serverId}/revisions"),
            "createMcpServerRevision": ("POST", "/backend/v3/api/mcp/servers/{serverId}/revisions"),
            "publishMcpServerRevision": ("POST", "/backend/v3/api/mcp/revisions/{revisionId}/publish"),
            "discoverMcpTools": ("POST", "/backend/v3/api/mcp/servers/{serverId}/discover"),
            "checkMcpServerHealth": ("POST", "/backend/v3/api/mcp/servers/{serverId}/health_check"),
            "listMcpTools": ("GET", "/backend/v3/api/mcp/servers/{serverId}/tools"),
            "updateMcpTool": ("PUT", "/backend/v3/api/mcp/tools/{toolId}"),
            "listMcpBindings": ("GET", "/backend/v3/api/mcp/servers/{serverId}/bindings"),
            "createMcpBinding": ("POST", "/backend/v3/api/mcp/servers/{serverId}/bindings"),
            "updateMcpBinding": ("PUT", "/backend/v3/api/mcp/bindings/{bindingId}"),
        }

        self.assertEqual(set(expected), set(operations))
        for operation_name, (method, api_path) in expected.items():
            with self.subTest(operation=operation_name):
                operation = operations[operation_name]
                self.assertEqual("backend", operation["api_surface"])
                self.assertEqual(method, operation["api_method"])
                self.assertEqual(api_path, operation["api_path"])
                self.assertNotIn("/capabilities", operation["api_path"])
                self.assertNotEqual("capabilities", operation.get("sdk_domain"))
                if operation_name.startswith("listPrompt") or operation_name in {
                    "createPrompt",
                    "renderPromptVersion",
                    "publishPromptVersion",
                }:
                    self.assertIn("ai_prompt", operation.get("read_sources", []))
                    self.assertIn("c_category", operation.get("read_sources", []))
                if "Mcp" in operation_name:
                    self.assertIn("ai_mcp_server", operation.get("read_sources", []))
                    if operation["api_method"] in {"POST", "PUT"}:
                        self.assertIn("ops_audit_log", operation.get("write_tables", []))

    def test_prompt_and_mcp_reuse_category_without_generic_capability_tables(self) -> None:
        contract = load_frontend_field_contract(ROOT)
        route_contracts = {
            route["route"]: route
            for route in contract.get("routes", [])
            if isinstance(route, dict) and route.get("route") in {"/admin/prompts", "/admin/mcp"}
        }
        self.assertEqual({"/admin/prompts", "/admin/mcp"}, set(route_contracts))
        self.assertIn("c_category", route_contracts["/admin/prompts"]["required_tables"])
        self.assertIn("c_category", route_contracts["/admin/mcp"]["required_tables"])
        self.assertNotIn("ai_capability", route_contracts["/admin/prompts"]["required_tables"])
        self.assertNotIn("ai_capability", route_contracts["/admin/mcp"]["required_tables"])

        table_registry = load_schema_registry(TABLE_REGISTRY_PATH)
        tables = {table["table"]: table for table in table_registry["tables"]}
        self.assertIn("/admin/prompts", tables["c_category"]["frontend_routes"])
        self.assertIn("/admin/mcp", tables["c_category"]["frontend_routes"])
        self.assertIn("/admin/prompts", tables["ops_audit_log"]["frontend_routes"])
        self.assertIn("/admin/mcp", tables["ops_audit_log"]["frontend_routes"])

    def test_prompt_and_mcp_openapi_and_sdk_are_generated(self) -> None:
        openapi = json.loads(BACKEND_OPENAPI_PATH.read_text(encoding="utf-8"))
        expected_paths = {
            ("/backend/v3/api/prompts", "get", "definitions.list"),
            ("/backend/v3/api/prompts", "post", "definitions.create"),
            ("/backend/v3/api/prompts/{promptId}/versions", "get", "versions.list"),
            ("/backend/v3/api/prompts/{promptId}/versions", "post", "versions.create"),
            ("/backend/v3/api/prompts/versions/{versionId}/publish", "post", "versions.publish"),
            ("/backend/v3/api/prompts/versions/{versionId}/render", "post", "versionRenders.create"),
            ("/backend/v3/api/prompts/{promptId}/bindings", "get", "definitionBindings.list"),
            ("/backend/v3/api/prompts/{promptId}/bindings", "post", "definitionBindings.create"),
            ("/backend/v3/api/prompts/bindings/{bindingId}", "put", "definitionBindings.update"),
            ("/backend/v3/api/mcp/servers", "get", "servers.list"),
            ("/backend/v3/api/mcp/servers/{serverId}", "get", "servers.retrieve"),
            ("/backend/v3/api/mcp/servers", "post", "servers.create"),
            ("/backend/v3/api/mcp/servers/{serverId}", "put", "servers.update"),
            ("/backend/v3/api/mcp/servers/{serverId}/revisions", "get", "servers.revisions.list"),
            ("/backend/v3/api/mcp/servers/{serverId}/revisions", "post", "servers.revisions.create"),
            ("/backend/v3/api/mcp/revisions/{revisionId}/publish", "post", "revisions.publish"),
            ("/backend/v3/api/mcp/servers/{serverId}/discover", "post", "servers.tools.refresh"),
            ("/backend/v3/api/mcp/servers/{serverId}/health_check", "post", "servers.healthChecks.create"),
            ("/backend/v3/api/mcp/servers/{serverId}/tools", "get", "servers.tools.list"),
            ("/backend/v3/api/mcp/tools/{toolId}", "put", "tools.update"),
            ("/backend/v3/api/mcp/servers/{serverId}/bindings", "get", "servers.bindings.list"),
            ("/backend/v3/api/mcp/servers/{serverId}/bindings", "post", "servers.bindings.create"),
            ("/backend/v3/api/mcp/bindings/{bindingId}", "put", "servers.bindings.update"),
        }

        for path, method, operation_id in expected_paths:
            with self.subTest(path=path, method=method):
                self.assertEqual(operation_id, openapi["paths"][path][method]["operationId"])

        for schema_name in [
            "AdminPromptItem",
            "AdminPromptVersionItem",
            "AdminPromptCreateRequest",
            "AdminPromptVersionCreateRequest",
            "AdminPromptBindingCreateRequest",
            "AdminPromptBindingUpdateRequest",
            "AdminMcpServerItem",
            "AdminMcpServerRevisionItem",
            "AdminMcpToolItem",
            "AdminMcpServerCreateRequest",
            "AdminMcpServerUpdateRequest",
            "AdminMcpToolUpdateRequest",
            "AdminMcpBindingCreateRequest",
            "AdminMcpBindingUpdateRequest",
        ]:
            self.assertIn(schema_name, openapi["components"]["schemas"])

        prompts_api = (BACKEND_SDK_ROOT / "api" / "prompts.ts").read_text(encoding="utf-8")
        mcp_api = (BACKEND_SDK_ROOT / "api" / "mcp.ts").read_text(encoding="utf-8")
        sdk = (BACKEND_SDK_ROOT / "sdk.ts").read_text(encoding="utf-8")
        self.assertIn("readonly prompts: PromptsApi;", sdk)
        self.assertIn("readonly mcp: McpApi;", sdk)
        self.assertIn("public readonly definitions: PromptsDefinitionsApi;", prompts_api)
        self.assertIn("public readonly versions: PromptsVersionsApi;", prompts_api)
        self.assertIn("public readonly versionRenders: PromptsVersionRendersApi;", prompts_api)
        self.assertIn("public readonly definitionBindings: PromptsDefinitionBindingsApi;", prompts_api)
        self.assertIn("async create(promptId: string", prompts_api)
        self.assertIn("async update(bindingId: string", prompts_api)
        self.assertIn("public readonly servers: McpServersApi;", mcp_api)
        self.assertIn("public readonly revisions: McpRevisionsApi;", mcp_api)
        self.assertIn("public readonly tools: McpToolsApi;", mcp_api)
        self.assertIn("public readonly healthChecks: McpServersHealthChecksApi;", mcp_api)
        self.assertIn("async refresh(serverId: string", mcp_api)
        self.assertIn("async create(serverId: string", mcp_api)
        self.assertIn("async update(bindingId: string", mcp_api)

    def test_admin_prompt_and_mcp_modules_are_independent_sdk_backed_pages(self) -> None:
        app = (PORTAL_ROOT / "src" / "App.tsx").read_text(encoding="utf-8")
        registry = (PORTAL_ROOT / "src" / "adminModuleRegistry.ts").read_text(encoding="utf-8")
        navigation = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-i18n"
            / "src"
            / "resources"
            / "admin"
            / "core-navigation.ts"
        ).read_text(encoding="utf-8")

        for package_name, service_file, sdk_marker, page_marker in [
            (
                "sdkwork-clawrouter-pc-admin-prompts",
                "promptService.ts",
                "getClawRouterBackendSdkClient().prompts",
                "data-admin-prompts",
            ),
            (
                "sdkwork-clawrouter-pc-admin-mcp",
                "mcpService.ts",
                "getClawRouterBackendSdkClient().mcp",
                "data-admin-mcp",
            ),
        ]:
            with self.subTest(package=package_name):
                package_root = PORTAL_ROOT / "packages" / package_name
                self.assertTrue(package_root.exists(), str(package_root))
                service = (package_root / "src" / service_file).read_text(encoding="utf-8")
                page = (package_root / "src" / "index.tsx").read_text(encoding="utf-8")
                package_json = yaml.safe_load((package_root / "package.json").read_text(encoding="utf-8"))
                self.assertEqual(package_name, package_json["name"])
                self.assertIn(sdk_marker, service)
                self.assertNotIn("fetch(", service)
                self.assertNotIn("axios", service)
                self.assertNotIn("/backend/v3/api", service)
                self.assertIn("AdminResourceCenter", page)
                self.assertIn(page_marker, page)

        self.assertIn("const PromptsAdmin", app)
        self.assertIn("const McpAdmin", app)
        self.assertIn('path="prompts" element={<PromptsAdmin />} />', app)
        self.assertIn('path="mcp" element={<McpAdmin />} />', app)
        self.assertIn("'/admin/prompts'", registry)
        self.assertIn("'/admin/mcp'", registry)
        self.assertIn("admin.menu.prompts", registry)
        self.assertIn("admin.menu.mcp", registry)
        self.assertIn('"admin.menu.prompts": "Prompt Management"', navigation)
        self.assertIn('"admin.menu.mcp": "MCP Management"', navigation)


    def test_prompt_and_mcp_admin_forms_use_unified_category_selector(self) -> None:
        commons_category_options = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-admin-core"
            / "src"
            / "admin-category-options.ts"
        ).read_text(encoding="utf-8")
        prompt_service = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-admin-prompts"
            / "src"
            / "promptService.ts"
        ).read_text(encoding="utf-8")
        prompt_page = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-admin-prompts"
            / "src"
            / "index.tsx"
        ).read_text(encoding="utf-8")
        mcp_service = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-admin-mcp"
            / "src"
            / "mcpService.ts"
        ).read_text(encoding="utf-8")
        mcp_page = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-admin-mcp"
            / "src"
            / "index.tsx"
        ).read_text(encoding="utf-8")

        self.assertIn("getClawRouterBackendSdkClient().ecosystem.skills.categories.list", commons_category_options)
        self.assertIn("c_category", commons_category_options)
        self.assertNotIn("fetch(", commons_category_options)
        self.assertNotIn("axios", commons_category_options)

        for service, duplicated_loader in [
            (prompt_service, "listPromptCategoryOptions"),
            (mcp_service, "listMcpCategoryOptions"),
        ]:
            with self.subTest(service_does_not_duplicate_category_loader=duplicated_loader):
                self.assertNotIn(duplicated_loader, service)
                self.assertNotIn("ecosystem.skills.categories.list", service)
                self.assertNotIn("fetch(", service)
                self.assertNotIn("/backend/v3/api", service)

        for page in [prompt_page, mcp_page]:
            with self.subTest(page_uses_shared_category_loader=True):
                self.assertIn("listAdminAiCategoryOptions", page)
                self.assertIn("CategorySelectField", page)
                self.assertIn("categoryOptions={categoryOptions}", page)
                self.assertIn("formatAdminCategoryOptionLabel", page)
                self.assertIn("categoryName", page)
                self.assertNotIn("'Category ID'", page)
                self.assertNotIn('"Category ID"', page)
                self.assertNotIn("<Field label={t('admin.prompts.fields.categoryId'", page)
                self.assertNotIn("<Field label={t('admin.mcp.fields.categoryId'", page)

    def test_prompt_and_mcp_admin_pages_use_resource_scope_selectors(self) -> None:
        commons_resource_options = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawroutes-pc-commons"
            / "src"
            / "admin-resource-options.ts"
        ).read_text(encoding="utf-8")
        prompt_page = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-admin-prompts"
            / "src"
            / "index.tsx"
        ).read_text(encoding="utf-8")
        mcp_page = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-admin-mcp"
            / "src"
            / "index.tsx"
        ).read_text(encoding="utf-8")

        self.assertIn("readAdminResourceOptions", commons_resource_options)
        self.assertIn("formatAdminResourceOptionLabel", commons_resource_options)
        self.assertNotIn("fetch(", commons_resource_options)
        self.assertNotIn("axios", commons_resource_options)

        self.assertIn("promptOptions", prompt_page)
        self.assertIn("loadPromptOptions", prompt_page)
        self.assertIn("ResourceSelectField", prompt_page)
        self.assertIn("formatAdminResourceOptionLabel", prompt_page)
        self.assertNotIn("'Prompt ID'", prompt_page)
        self.assertNotIn('"Prompt ID"', prompt_page)

        self.assertIn("serverOptions", mcp_page)
        self.assertIn("loadServerOptions", mcp_page)
        self.assertIn("ResourceSelectField", mcp_page)
        self.assertIn("formatAdminResourceOptionLabel", mcp_page)
        self.assertNotIn("'MCP Server ID'", mcp_page)
        self.assertNotIn('"MCP Server ID"', mcp_page)
        self.assertNotIn("'Server ID'", mcp_page)
        self.assertNotIn('"Server ID"', mcp_page)

    def test_prompt_and_mcp_admin_i18n_bundles_are_registered(self) -> None:
        resources_index = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-i18n"
            / "src"
            / "resources"
            / "index.ts"
        ).read_text(encoding="utf-8")
        prompt_bundle = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-i18n"
            / "src"
            / "resources"
            / "admin"
            / "prompts.ts"
        ).read_text(encoding="utf-8")
        mcp_bundle = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-i18n"
            / "src"
            / "resources"
            / "admin"
            / "mcp.ts"
        ).read_text(encoding="utf-8")

        self.assertIn("adminPromptsMessages", resources_index)
        self.assertIn("adminMcpMessages", resources_index)
        for bundle, key_prefix in [
            (prompt_bundle, "admin.prompts"),
            (mcp_bundle, "admin.mcp"),
        ]:
            with self.subTest(key_prefix=key_prefix):
                self.assertIn("satisfies I18nMessageBundle", bundle)
                self.assertIn(f'"{key_prefix}.scope', bundle)
                self.assertIn(f'"{key_prefix}.fields.category"', bundle)
                self.assertIn(f'"{key_prefix}.fields.noCategory"', bundle)
                self.assertIn("en:", bundle)
                self.assertIn("zh:", bundle)

    def test_prompt_and_mcp_admin_toolbar_and_dialog_labels_are_i18n_driven(self) -> None:
        resource_center = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawroutes-pc-commons"
            / "src"
            / "components"
            / "AdminResourceCenter.tsx"
        ).read_text(encoding="utf-8")
        prompt_page = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-admin-prompts"
            / "src"
            / "index.tsx"
        ).read_text(encoding="utf-8")
        mcp_page = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-admin-mcp"
            / "src"
            / "index.tsx"
        ).read_text(encoding="utf-8")
        prompt_bundle = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-i18n"
            / "src"
            / "resources"
            / "admin"
            / "prompts.ts"
        ).read_text(encoding="utf-8")
        mcp_bundle = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-i18n"
            / "src"
            / "resources"
            / "admin"
            / "mcp.ts"
        ).read_text(encoding="utf-8")

        self.assertIn("searchPlaceholder?: string", resource_center)
        self.assertIn("reloadLabel?: string", resource_center)
        self.assertIn("placeholder={searchPlaceholder}", resource_center)
        self.assertIn("{reloadLabel}", resource_center)
        self.assertNotIn('placeholder="Search current records"', resource_center)

        for page, prefix in [
            (prompt_page, "admin.prompts"),
            (mcp_page, "admin.mcp"),
        ]:
            with self.subTest(prefix=prefix):
                self.assertIn(f"searchPlaceholder={{t('{prefix}.search.placeholder')}}", page)
                self.assertIn("reloadLabel={t('common.actions.reload')}", page)
                self.assertIn("cancelLabel={t('common.actions.cancel')}", page)
                self.assertIn("cancelLabel: string", page)
                self.assertNotIn(">Cancel", page)

        self.assertIn('"admin.prompts.search.placeholder"', prompt_bundle)
        self.assertIn('"admin.mcp.search.placeholder"', mcp_bundle)

    def test_prompt_and_mcp_admin_zh_i18n_is_readable(self) -> None:
        prompt_bundle = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-i18n"
            / "src"
            / "resources"
            / "admin"
            / "prompts.ts"
        ).read_text(encoding="utf-8")
        mcp_bundle = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-i18n"
            / "src"
            / "resources"
            / "admin"
            / "mcp.ts"
        ).read_text(encoding="utf-8")

        expected_prompt_text = [
            "\u521b\u5efa\u63d0\u793a\u8bcd",
            "\u63d0\u793a\u8bcd\u5e93",
            "\u9009\u62e9\u63d0\u793a\u8bcd\u540e\u67e5\u770b\u7248\u672c\u548c\u7ed1\u5b9a",
            "\u63d0\u793a\u8bcd\u7248\u672c\u65e0\u6cd5\u53d1\u5e03\u3002",
        ]
        expected_mcp_text = [
            "\u521b\u5efa MCP \u670d\u52a1",
            "MCP \u670d\u52a1",
            "\u9009\u62e9 MCP \u670d\u52a1\u540e\u67e5\u770b\u4fee\u8ba2\u3001\u5de5\u5177\u548c\u7ed1\u5b9a",
            "MCP \u5de5\u5177\u65e0\u6cd5\u66f4\u65b0\u3002",
        ]
        unreadable_marker_codepoints = [
            (0x93BB, 0x611C, 0x305A),
            (0x9352, 0x6D98, 0x7F13),
            (0x6DC7, 0xE1C6, 0x8A79),
            (0x7BA1, 0xFF04, 0x60B3),
            (0x9354, 0x72B2, 0x6D47),
            (0x9418, 0x8235),
            (0x93BB, 0x612E, 0x305A),
            (0x9352, 0x6D98, 0x7F13),
            (0x95AB, 0x590B, 0x5AE8),
            (0x93C3, 0x72B3, 0x7876),
            (0x9286, 0x003F),
            (0x9417, 0x581F, 0x6E70),
            (0x7F01, 0x621D, 0x757E),
            (0x6DC7, 0xE1BF, 0xE179),
            (0x5BB8, 0x30E5, 0x53FF),
            (0x93C8, 0x5D85, 0x59DF),
            (0x935A, 0xE21C, 0x6564),
            (0x9418, 0x8235, 0x20AC),
        ]
        unreadable_markers = [
            "".join(chr(codepoint) for codepoint in marker)
            for marker in unreadable_marker_codepoints
        ]

        for text in expected_prompt_text:
            with self.subTest(prompt_text=text):
                self.assertIn(text, prompt_bundle)
        for text in expected_mcp_text:
            with self.subTest(mcp_text=text):
                self.assertIn(text, mcp_bundle)
        for marker in unreadable_markers:
            with self.subTest(unreadable_marker=marker):
                self.assertNotIn(marker, prompt_bundle)
                self.assertNotIn(marker, mcp_bundle)

    def test_prompt_and_mcp_admin_dialog_errors_are_i18n_driven(self) -> None:
        prompt_page = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-admin-prompts"
            / "src"
            / "index.tsx"
        ).read_text(encoding="utf-8")
        mcp_page = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-admin-mcp"
            / "src"
            / "index.tsx"
        ).read_text(encoding="utf-8")
        prompt_bundle = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-i18n"
            / "src"
            / "resources"
            / "admin"
            / "prompts.ts"
        ).read_text(encoding="utf-8")
        mcp_bundle = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-i18n"
            / "src"
            / "resources"
            / "admin"
            / "mcp.ts"
        ).read_text(encoding="utf-8")

        for raw_text in [
            "Failed to create prompt.",
            "Failed to create prompt version.",
            "Failed to publish prompt version.",
            "Failed to render prompt version.",
            "`${key} must be a JSON object`",
            "`${key} must be a JSON object or an array of objects`",
            "`${key} must be valid JSON`",
            "`${key} is required`",
        ]:
            with self.subTest(prompt_raw_text=raw_text):
                self.assertNotIn(raw_text, prompt_page)

        for raw_text in [
            "Failed to create MCP server.",
            "Failed to update MCP server.",
            "Failed to create MCP server revision.",
            "Failed to publish MCP server revision.",
            "MCP command failed.",
            "Failed to update MCP tool.",
            "`${key} must be a JSON object`",
            "`${key} must be a JSON string array`",
            "`${key} must be valid JSON`",
            "`${key} is required`",
            "`${key} must be an integer`",
            "`${key} must be a boolean`",
        ]:
            with self.subTest(mcp_raw_text=raw_text):
                self.assertNotIn(raw_text, mcp_page)

        for key in [
            "admin.prompts.errors.createPromptFailed",
            "admin.prompts.errors.createVersionFailed",
            "admin.prompts.errors.publishVersionFailed",
            "admin.prompts.errors.renderVersionFailed",
            "admin.prompts.errors.createBindingFailed",
            "admin.prompts.errors.updateBindingFailed",
            "admin.prompts.validation.required",
            "admin.prompts.validation.validJson",
            "admin.prompts.validation.jsonObject",
            "admin.prompts.validation.jsonObjectOrArray",
        ]:
            with self.subTest(prompt_key=key):
                self.assertIn(key, prompt_page)
                self.assertIn(f'"{key}"', prompt_bundle)

        for key in [
            "admin.mcp.errors.createServerFailed",
            "admin.mcp.errors.updateServerFailed",
            "admin.mcp.errors.createRevisionFailed",
            "admin.mcp.errors.publishRevisionFailed",
            "admin.mcp.errors.commandFailed",
            "admin.mcp.errors.updateToolFailed",
            "admin.mcp.errors.createBindingFailed",
            "admin.mcp.errors.updateBindingFailed",
            "admin.mcp.validation.required",
            "admin.mcp.validation.validJson",
            "admin.mcp.validation.jsonObject",
            "admin.mcp.validation.jsonStringArray",
            "admin.mcp.validation.integer",
            "admin.mcp.validation.boolean",
        ]:
            with self.subTest(mcp_key=key):
                self.assertIn(key, mcp_page)
                self.assertIn(f'"{key}"', mcp_bundle)

    def test_prompt_and_mcp_admin_secondary_actions_use_scoped_resource_selectors(self) -> None:
        resource_center = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawroutes-pc-commons"
            / "src"
            / "components"
            / "AdminResourceCenter.tsx"
        ).read_text(encoding="utf-8")
        prompt_page = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-admin-prompts"
            / "src"
            / "index.tsx"
        ).read_text(encoding="utf-8")
        mcp_page = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-admin-mcp"
            / "src"
            / "index.tsx"
        ).read_text(encoding="utf-8")
        prompt_bundle = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-i18n"
            / "src"
            / "resources"
            / "admin"
            / "prompts.ts"
        ).read_text(encoding="utf-8")
        mcp_bundle = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-i18n"
            / "src"
            / "resources"
            / "admin"
            / "mcp.ts"
        ).read_text(encoding="utf-8")

        self.assertIn("format?: (value: unknown, record: AdminResourceRecord) => string", resource_center)
        self.assertIn("formatAdminResourceColumnCell", resource_center)

        self.assertIn("versionOptions", prompt_page)
        self.assertIn("CreatePromptBindingDialog", prompt_page)
        self.assertIn("UpdatePromptBindingDialog", prompt_page)
        self.assertIn("createPromptBinding", prompt_page)
        self.assertIn("updatePromptBinding", prompt_page)
        self.assertIn("loadPromptVersionOptions", prompt_page)
        self.assertIn("versionOptions={versionOptions}", prompt_page)
        self.assertIn("admin.prompts.fields.selectVersion", prompt_page)
        self.assertIn("PROMPT_BINDING_NULL_VERSION_VALUE", prompt_page)
        self.assertIn("optionalNullableIntegerString(form, 'promptVersionId'", prompt_page)
        self.assertIn("admin.prompts.fields.defaultVersion", prompt_page)
        self.assertIn("admin.prompts.fields.keepVersion", prompt_page)
        self.assertIn("key: 'promptVersionId'", prompt_page)
        self.assertIn("admin.prompts.columns.promptVersion", prompt_page)
        self.assertIn("formatPromptBindingVersionCell", prompt_page)
        self.assertIn("admin.prompts.scope.defaultVersionLabel", prompt_page)
        self.assertNotIn("<Field label={t('admin.prompts.fields.versionId'", prompt_page)

        for key in [
            "admin.prompts.fields.selectVersion",
            "admin.prompts.actions.createBinding",
            "admin.prompts.actions.updateBinding",
            "admin.prompts.binding.createTitle",
            "admin.prompts.binding.updateTitle",
            "admin.prompts.fields.defaultVersion",
            "admin.prompts.fields.keepVersion",
            "admin.prompts.columns.promptVersion",
            "admin.prompts.scope.defaultVersionLabel",
            "admin.prompts.versionScopeLoadError",
        ]:
            with self.subTest(prompt_key=key):
                self.assertIn(f'"{key}"', prompt_bundle)

        self.assertIn("revisionOptions", mcp_page)
        self.assertIn("toolOptions", mcp_page)
        self.assertIn("CreateMcpBindingDialog", mcp_page)
        self.assertIn("UpdateMcpBindingDialog", mcp_page)
        self.assertIn("createMcpBinding", mcp_page)
        self.assertIn("updateMcpBinding", mcp_page)
        self.assertIn("loadMcpRevisionOptions", mcp_page)
        self.assertIn("loadMcpToolOptions", mcp_page)
        self.assertIn("revisionOptions={revisionOptions}", mcp_page)
        self.assertIn("toolOptions={toolOptions}", mcp_page)
        self.assertIn("admin.mcp.fields.selectRevision", mcp_page)
        self.assertIn("admin.mcp.fields.selectTool", mcp_page)
        self.assertIn("MCP_BINDING_NULL_REVISION_VALUE", mcp_page)
        self.assertIn("MCP_BINDING_NULL_TOOL_VALUE", mcp_page)
        self.assertIn("optionalNullableIntegerString(form, 'serverRevisionId'", mcp_page)
        self.assertIn("optionalNullableIntegerString(form, 'toolId'", mcp_page)
        self.assertIn("admin.mcp.fields.defaultRevision", mcp_page)
        self.assertIn("admin.mcp.fields.defaultTool", mcp_page)
        self.assertIn("admin.mcp.fields.keepRevision", mcp_page)
        self.assertIn("admin.mcp.fields.keepTool", mcp_page)
        self.assertIn("key: 'serverRevisionId'", mcp_page)
        self.assertIn("key: 'toolId'", mcp_page)
        self.assertIn("key: 'allowedTools'", mcp_page)
        self.assertIn("key: 'deniedTools'", mcp_page)
        self.assertIn("admin.mcp.columns.serverRevision", mcp_page)
        self.assertIn("admin.mcp.columns.tool", mcp_page)
        self.assertIn("admin.mcp.columns.allowedTools", mcp_page)
        self.assertIn("admin.mcp.columns.deniedTools", mcp_page)
        self.assertIn("formatMcpBindingScopeCell", mcp_page)
        self.assertIn("formatMcpToolPolicyCell", mcp_page)
        self.assertIn("admin.mcp.scope.defaultRevisionLabel", mcp_page)
        self.assertIn("admin.mcp.scope.allToolsLabel", mcp_page)
        self.assertIn("admin.mcp.scope.noDeniedToolsLabel", mcp_page)
        self.assertNotIn("<Field label={t('admin.mcp.fields.revisionId'", mcp_page)
        self.assertNotIn("<Field label={t('admin.mcp.fields.toolId'", mcp_page)

        for key in [
            "admin.mcp.fields.selectRevision",
            "admin.mcp.fields.selectTool",
            "admin.mcp.actions.createBinding",
            "admin.mcp.actions.updateBinding",
            "admin.mcp.binding.createTitle",
            "admin.mcp.binding.updateTitle",
            "admin.mcp.fields.defaultRevision",
            "admin.mcp.fields.defaultTool",
            "admin.mcp.fields.keepRevision",
            "admin.mcp.fields.keepTool",
            "admin.mcp.columns.serverRevision",
            "admin.mcp.columns.tool",
            "admin.mcp.columns.allowedTools",
            "admin.mcp.columns.deniedTools",
            "admin.mcp.scope.defaultRevisionLabel",
            "admin.mcp.scope.allToolsLabel",
            "admin.mcp.scope.noDeniedToolsLabel",
            "admin.mcp.revisionScopeLoadError",
            "admin.mcp.toolScopeLoadError",
        ]:
            with self.subTest(mcp_key=key):
                self.assertIn(f'"{key}"', mcp_bundle)


if __name__ == "__main__":
    unittest.main()
