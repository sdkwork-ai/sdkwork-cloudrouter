import os
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND_AI_PATH = (
    ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "operations" / "backend-ai.yaml"
)
BACKEND_ROUTER_PATH = (
    ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "operations" / "backend-router.yaml"
)
BACKEND_SYSTEM_PATH = (
    ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "operations" / "backend-system.yaml"
)
ADMIN_ENTITIES_PATH = (
    ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "shared" / "entities" / "admin.yaml"
)


class AiChannelGroupContractStandardizationTest(unittest.TestCase):
    def test_admin_channel_group_surface_has_no_access_group_debt(self) -> None:
        forbidden_terms = [
            "Admin" + "Access" + "Group",
            "admin_" + "access_" + "group",
            "access" + "Groups",
            "access_" + "groups",
            "access " + "group",
            "Access " + "Group",
        ]
        scanned_roots = [
            ROOT / "apps" / "sdkwork-clawrouter-pc" / "packages" / "sdkwork-clawrouter-pc-admin-group",
            ROOT / "apps" / "sdkwork-clawrouter-pc" / "packages" / "sdkwork-clawrouter-pc-admin-ratelimit",
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "operations" / "backend-ai.yaml",
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "operations" / "backend-system.yaml",
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "operations" / "backend-router.yaml",
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "operations" / "backend-integration.yaml",
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "shared" / "entities" / "admin.yaml",
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "api" / "ai.ts",
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "api" / "system.ts",
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "types" / "index.ts",
        ]
        suffixes = {".cs", ".dart", ".go", ".java", ".json", ".kt", ".md", ".py", ".rs", ".ts", ".yaml", ".yml"}
        ignored_dirs = {".git", "node_modules", "target", "dist", "build", ".venv", "__pycache__"}
        violations: list[str] = []

        for root in scanned_roots:
            if not root.exists():
                continue
            if root.is_file():
                content = root.read_text(encoding="utf-8", errors="ignore")
                for term in forbidden_terms:
                    if term in content:
                        violations.append(f"{root.relative_to(ROOT).as_posix()}: {term}")
                continue
            for directory, dir_names, file_names in os.walk(root):
                dir_names[:] = [name for name in dir_names if name not in ignored_dirs]
                for file_name in file_names:
                    path = Path(directory) / file_name
                    if path.suffix not in suffixes:
                        continue
                    if any(part in ignored_dirs for part in path.relative_to(ROOT).parts):
                        continue
                    content = path.read_text(encoding="utf-8", errors="ignore")
                    for term in forbidden_terms:
                        if term in content:
                            violations.append(f"{path.relative_to(ROOT).as_posix()}: {term}")

        self.assertEqual([], violations)

    def test_backend_ai_fragment_owns_channel_group_operations(self) -> None:
        backend_ai = BACKEND_AI_PATH.read_text(encoding="utf-8")
        backend_router = BACKEND_ROUTER_PATH.read_text(encoding="utf-8")

        for token in [
            "operation: fetchGroups",
            "operation: addGroup",
            "operation: updateGroup",
            "operation: deleteGroup",
            "operation: fetchGroupChannelBindings",
            "operation: replaceGroupChannelBindings",
            "operation_id: channelGroups.list",
            "operation_id: channelGroups.create",
            "operation_id: channelGroups.update",
            "operation_id: channelGroups.delete",
            "operation_id: channelGroups.channelBindings.list",
            "operation_id: channelGroups.channelBindings.update",
            "api_path: /backend/v3/api/ai/channel_groups",
        ]:
            self.assertIn(token, backend_ai)
            self.assertNotIn(token, backend_router)

    def test_backend_system_fragment_owns_rate_limit_operations(self) -> None:
        backend_system = BACKEND_SYSTEM_PATH.read_text(encoding="utf-8")
        backend_router = BACKEND_ROUTER_PATH.read_text(encoding="utf-8")

        for token in [
            "operation: fetchIpLimits",
            "operation: addIpLimit",
            "operation: fetchTokenLimits",
            "operation: addTokenLimit",
            "operation: fetchModelLimits",
            "operation: addModelLimit",
            "operation_id: rateLimits.ip.list",
            "operation_id: rateLimits.ip.create",
            "operation_id: rateLimits.apiKeys.list",
            "operation_id: rateLimits.apiKeys.create",
            "operation_id: rateLimits.models.list",
            "operation_id: rateLimits.models.create",
            "api_path: /backend/v3/api/system/rate_limits/models",
        ]:
            self.assertIn(token, backend_system)
            self.assertNotIn(token, backend_router)

    def test_shared_admin_entities_use_canonical_channel_group_shapes(self) -> None:
        admin_entities = ADMIN_ENTITIES_PATH.read_text(encoding="utf-8")

        self.assertIn("  admin_channel_group_item:", admin_entities)
        self.assertNotIn("  admin_" + "access_" + "group_item:", admin_entities)

        group_block = self._extract_entity_block(admin_entities, "admin_channel_group_item")
        for token in [
            "groupCode:",
            "groupName:",
            "providerCode:",
            "priceReferenceMode:",
            "officialPriceMultiplier:",
            "groupType:",
        ]:
            self.assertIn(token, group_block)
        self.assertNotIn("billingType:", group_block)
        self.assertNotIn("\n      platform:\n", group_block)

        rate_limit_block = self._extract_entity_block(admin_entities, "admin_rate_limit_item")
        for token in ["channelGroup:", "channelGroupId:", "channelGroupName:"]:
            self.assertIn(token, rate_limit_block)
        self.assertNotIn("\n      group:\n", rate_limit_block)

    def test_backend_runtime_and_admin_api_sources_have_no_channel_group_legacy_debt(self) -> None:
        forbidden_terms = [
            "AiRoutingCacheInvalidatingAdmin" + "Access" + "GroupStore",
            "find_" + "access_" + "group",
            "failed to find " + "access " + "group for model rate limit",
            "access " + "group was not found",
            "/backend/v3/api/router/" + "channel_groups",
            "/backend/v3/api/iam/" + "channel_groups",
        ]
        scoped_files = [
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "application" / "mod.rs",
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "api"
            / "admin_model_rate_limit.rs",
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "sqlite"
            / "admin_model_rate_limit_store.rs",
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "postgres"
            / "admin_model_rate_limit_store.rs",
            ROOT
            / "services"
            / "sdkwork-clawrouter-admin-api-server"
            / "tests"
            / "database_config_router.rs",
        ]
        violations: list[str] = []

        for path in scoped_files:
            content = path.read_text(encoding="utf-8", errors="ignore")
            for term in forbidden_terms:
                if term in content:
                    violations.append(f"{path.relative_to(ROOT).as_posix()}: {term}")

        self.assertEqual([], violations)

    def test_backend_generated_sdks_have_no_access_group_debt(self) -> None:
        forbidden_terms = [
            "Admin" + "Access" + "Group",
            "Access" + "Groups",
            "access" + "GroupsList",
            "/iam/" + "access" + "_" + "groups",
        ]
        scoped_roots = [
            ROOT
            / "sdks"
            / "clawrouter-backend-sdk"
            / "clawrouter-backend-sdk-flutter"
            / "generated"
            / "server-openapi",
            ROOT
            / "sdks"
            / "clawrouter-backend-sdk"
            / "clawrouter-backend-sdk-rust"
            / "generated"
            / "server-openapi",
            ROOT
            / "sdks"
            / "clawrouter-backend-sdk"
            / "clawrouter-backend-sdk-java"
            / "generated"
            / "server-openapi",
            ROOT
            / "sdks"
            / "clawrouter-backend-sdk"
            / "clawrouter-backend-sdk-csharp"
            / "generated"
            / "server-openapi",
            ROOT
            / "sdks"
            / "clawrouter-backend-sdk"
            / "clawrouter-backend-sdk-swift"
            / "generated"
            / "server-openapi",
            ROOT
            / "sdks"
            / "clawrouter-backend-sdk"
            / "clawrouter-backend-sdk-kotlin"
            / "generated"
            / "server-openapi",
            ROOT
            / "sdks"
            / "clawrouter-backend-sdk"
            / "clawrouter-backend-sdk-go"
            / "generated"
            / "server-openapi",
            ROOT
            / "sdks"
            / "clawrouter-backend-sdk"
            / "clawrouter-backend-sdk-python"
            / "generated"
            / "server-openapi",
        ]
        suffixes = {".cs", ".dart", ".go", ".java", ".json", ".kt", ".md", ".py", ".rs", ".swift", ".yaml", ".yml"}
        ignored_dirs = {".git", "node_modules", "dist", "build", "__pycache__"}
        violations: list[str] = []

        for root in scoped_roots:
            if not root.exists():
                continue
            for directory, dir_names, file_names in os.walk(root):
                dir_names[:] = [name for name in dir_names if name not in ignored_dirs]
                for file_name in file_names:
                    path = Path(directory) / file_name
                    if path.suffix not in suffixes:
                        continue
                    content = path.read_text(encoding="utf-8", errors="ignore")
                    for term in forbidden_terms:
                        if term in content:
                            violations.append(f"{path.relative_to(ROOT).as_posix()}: {term}")

        self.assertEqual([], violations)

    def test_admin_skill_runtime_uses_resource_snapshot_contracts(self) -> None:
        self.skipTest("admin skill runtime removed from claw router; owned by sdkwork-kernel")

    @staticmethod
    def _extract_entity_block(contents: str, entity_name: str) -> str:
        match = re.search(rf"  {entity_name}:\n(.*?)(?=\n  [a-z0-9_]+:|\Z)", contents, re.S)
        if match is None:
            raise AssertionError(f"Could not find shared entity block for {entity_name}")
        return match.group(1)


if __name__ == "__main__":
    unittest.main()
