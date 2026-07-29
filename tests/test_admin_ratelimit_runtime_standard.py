import json
import unittest
from pathlib import Path

from tools.api_contract_manifest import ApiContractManifestGenerator


ROOT = Path(__file__).resolve().parents[1]
SERVICE_SOURCE = (
    "apps/sdkwork-clawrouter-pc/packages/"
    "sdkwork-clawrouter-pc-admin-ratelimit/src/ratelimitService.ts"
)
BACKEND_OPENAPI = ROOT / "generated" / "openapi" / "clawrouter-backend-openapi.json"
BACKEND_SDK_ROOT = (
    ROOT
    / "sdks"
    / "clawrouter-backend-sdk"
    / "clawrouter-backend-sdk-typescript"
    / "src"
)
ROUTER_SERVICE_ROOT = ROOT / "services" / "sdkwork-clawrouter-router-service"


class AdminRateLimitRuntimeStandardTest(unittest.TestCase):
    def test_contract_manifest_uses_only_canonical_system_routes_and_list_queries(self) -> None:
        manifest = ApiContractManifestGenerator(root=ROOT).generate()
        operations = {
            operation["operation_id"]: operation
            for operation in manifest["operations"]
            if operation["source"] == SERVICE_SOURCE
        }
        expected = {
            "rateLimits.apiKeys.list": ("GET", "/backend/v3/api/system/rate_limits/api_keys"),
            "rateLimits.apiKeys.create": ("POST", "/backend/v3/api/system/rate_limits/api_keys"),
            "rateLimits.ip.list": ("GET", "/backend/v3/api/system/rate_limits/ip"),
            "rateLimits.ip.create": ("POST", "/backend/v3/api/system/rate_limits/ip"),
            "rateLimits.models.list": ("GET", "/backend/v3/api/system/rate_limits/models"),
            "rateLimits.models.create": ("POST", "/backend/v3/api/system/rate_limits/models"),
            "firewalls.rules.list": ("GET", "/backend/v3/api/system/firewalls/rules"),
            "firewalls.rules.create": ("POST", "/backend/v3/api/system/firewalls/rules"),
            "firewalls.rules.delete": (
                "DELETE",
                "/backend/v3/api/system/firewalls/rules/{ruleId}",
            ),
        }

        self.assertEqual(set(expected), set(operations))
        for operation_id, (method, path) in expected.items():
            operation = operations[operation_id]
            with self.subTest(operation_id=operation_id):
                self.assertEqual("backend", operation["api_surface"])
                self.assertEqual("SdkworkBackendClient", operation["sdk_client"])
                self.assertEqual(method, operation["api_method"])
                self.assertEqual(path, operation["api_path"])
                self.assertNotIn("/router/", operation["api_path"])
                if operation_id.endswith(".list"):
                    self.assertEqual(
                        ["page", "page_size", "q"],
                        [parameter["name"] for parameter in operation["query_parameters"]],
                    )

    def test_openapi_uses_operation_specific_types_and_http_statuses(self) -> None:
        openapi = json.loads(BACKEND_OPENAPI.read_text(encoding="utf-8"))
        expected_resources = {
            "/backend/v3/api/system/rate_limits/api_keys": (
                "rateLimits.apiKeys",
                "AdminTokenLimitCreateRequest",
                "RateLimitsApiKeysListResult",
                "RateLimitsApiKeysCreateResult",
            ),
            "/backend/v3/api/system/rate_limits/ip": (
                "rateLimits.ip",
                "AdminIpLimitCreateRequest",
                "RateLimitsIpListResult",
                "RateLimitsIpCreateResult",
            ),
            "/backend/v3/api/system/rate_limits/models": (
                "rateLimits.models",
                "AdminModelLimitCreateRequest",
                "RateLimitsModelsListResult",
                "RateLimitsModelsCreateResult",
            ),
            "/backend/v3/api/system/firewalls/rules": (
                "firewalls.rules",
                "AdminFirewallRuleCreateRequest",
                "FirewallsRulesListResult",
                "FirewallsRulesCreateResult",
            ),
        }

        for path, (operation_prefix, request_type, list_result, create_result) in expected_resources.items():
            route = openapi["paths"][path]
            with self.subTest(path=path):
                self.assertEqual(f"{operation_prefix}.list", route["get"]["operationId"])
                self.assertEqual(
                    ["page", "page_size", "q"],
                    [parameter["name"] for parameter in route["get"]["parameters"]],
                )
                self.assertEqual(
                    f"#/components/schemas/{list_result}",
                    route["get"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"],
                )
                self.assertEqual(f"{operation_prefix}.create", route["post"]["operationId"])
                self.assertEqual(
                    f"#/components/schemas/{request_type}",
                    route["post"]["requestBody"]["content"]["application/json"]["schema"]["$ref"],
                )
                self.assertEqual(
                    f"#/components/schemas/{create_result}",
                    route["post"]["responses"]["201"]["content"]["application/json"]["schema"]["$ref"],
                )
                self.assertNotIn("200", route["post"]["responses"])

        delete_operation = openapi["paths"][
            "/backend/v3/api/system/firewalls/rules/{ruleId}"
        ]["delete"]
        self.assertEqual("firewalls.rules.delete", delete_operation["operationId"])
        self.assertEqual({"description": "No Content"}, delete_operation["responses"]["204"])
        self.assertNotIn("200", delete_operation["responses"])

    def test_generated_backend_sdk_and_frontend_use_typed_sdk_boundaries(self) -> None:
        service = (ROOT / SERVICE_SOURCE).read_text(encoding="utf-8")
        system_api = (BACKEND_SDK_ROOT / "api" / "system.ts").read_text(encoding="utf-8")
        type_exports = (BACKEND_SDK_ROOT / "types" / "index.ts").read_text(encoding="utf-8")

        expected_sdk_methods = [
            "async list(params?: SystemRateLimitsIpListParams, requestOptions?: ApiRequestOptions): Promise<IpLimitRulePage>",
            "async create(body: AdminIpLimitCreateRequest, requestOptions?: ApiRequestOptions): Promise<IpLimitRuleItem>",
            "async list(params?: SystemRateLimitsApiKeysListParams, requestOptions?: ApiRequestOptions): Promise<TokenLimitRulePage>",
            "async create(body: AdminTokenLimitCreateRequest, requestOptions?: ApiRequestOptions): Promise<TokenLimitRuleItem>",
            "async list(params?: SystemRateLimitsModelsListParams, requestOptions?: ApiRequestOptions): Promise<ModelLimitRulePage>",
            "async create(body: AdminModelLimitCreateRequest, requestOptions?: ApiRequestOptions): Promise<ModelLimitRuleItem>",
            "async list(params?: SystemFirewallsRulesListParams, requestOptions?: ApiRequestOptions): Promise<FirewallRulePage>",
            "async create(body: AdminFirewallRuleCreateRequest, requestOptions?: ApiRequestOptions): Promise<FirewallRuleItem>",
            "async delete(ruleId: string, requestOptions?: ApiRequestOptions): Promise<void>",
            "{ name: 'page_size', value: params?.pageSize",
            "{ name: 'q', value: params?.q",
        ]
        for token in expected_sdk_methods:
            self.assertIn(token, system_api)

        expected_type_exports = [
            "AdminIpLimitCreateRequest",
            "AdminTokenLimitCreateRequest",
            "AdminModelLimitCreateRequest",
            "AdminFirewallRuleCreateRequest",
            "IpLimitRuleItem",
            "IpLimitRulePage",
            "TokenLimitRuleItem",
            "TokenLimitRulePage",
            "ModelLimitRuleItem",
            "ModelLimitRulePage",
            "FirewallRuleItem",
            "FirewallRulePage",
        ]
        for type_name in expected_type_exports:
            self.assertIn(f"export type {{ {type_name} }}", type_exports)

        for sdk_call in [
            ".system.rateLimits.ip.list(",
            ".system.rateLimits.ip.create(",
            ".system.rateLimits.apiKeys.list(",
            ".system.rateLimits.apiKeys.create(",
            ".system.rateLimits.models.list(",
            ".system.rateLimits.models.create(",
            ".system.firewalls.rules.list(",
            ".system.firewalls.rules.create(",
            ".system.firewalls.rules.delete(",
        ]:
            self.assertIn(sdk_call, service)
        self.assertNotIn("fetch(", service)
        self.assertNotIn("axios", service)
        self.assertNotIn("Authorization", service)
        self.assertNotIn("/backend/v3/api/", service)

    def test_model_limit_contract_uses_upstream_account_group_only(self) -> None:
        openapi = json.loads(BACKEND_OPENAPI.read_text(encoding="utf-8"))
        schemas = openapi["components"]["schemas"]
        request = schemas["AdminModelLimitCreateRequest"]
        item = schemas["ModelLimitRuleItem"]
        service = (ROOT / SERVICE_SOURCE).read_text(encoding="utf-8")
        port = (
            ROUTER_SERVICE_ROOT / "src" / "ports" / "admin_model_rate_limit_store.rs"
        ).read_text(encoding="utf-8")
        postgres_store = (
            ROUTER_SERVICE_ROOT
            / "src"
            / "infrastructure"
            / "sql"
            / "postgres"
            / "admin_model_rate_limit_store.rs"
        ).read_text(encoding="utf-8")

        self.assertCountEqual(["model", "accountGroup", "rpm", "tpm"], request["required"])
        self.assertIn("accountGroup", request["properties"])
        self.assertIn("accountGroup", item["properties"])
        self.assertIn("accountGroupId", item["properties"])
        self.assertIn("accountGroupName", item["properties"])
        for source in [service, port, postgres_store]:
            self.assertNotIn("channelGroup", source)
            self.assertNotIn("channel_group", source)
        self.assertIn("accountGroup: string;", service)
        self.assertIn("pub account_group: String", port)
        self.assertIn("ai_upstream_account_group", postgres_store)

    def test_rate_limit_persistence_is_postgres_typed_and_store_paginated(self) -> None:
        capabilities = [
            "admin_api_key_rate_limit",
            "admin_ip_rate_limit",
            "admin_model_rate_limit",
            "admin_firewall_rule",
        ]
        required_policy_fields = {
            "admin_api_key_rate_limit": ["rps", "rpd", "status"],
            "admin_ip_rate_limit": ["rps", "rpm", "block_duration_seconds", "status"],
            "admin_model_rate_limit": ["group_id", "rpm", "tpm", "status"],
            "admin_firewall_rule": ["rule_type", "target_type", "action"],
        }

        for capability in capabilities:
            port_path = ROUTER_SERVICE_ROOT / "src" / "ports" / f"{capability}_store.rs"
            postgres_path = (
                ROUTER_SERVICE_ROOT
                / "src"
                / "infrastructure"
                / "sql"
                / "postgres"
                / f"{capability}_store.rs"
            )
            sqlite_path = (
                ROUTER_SERVICE_ROOT
                / "src"
                / "infrastructure"
                / "sql"
                / "sqlite"
                / f"{capability}_store.rs"
            )
            port = port_path.read_text(encoding="utf-8")
            postgres = postgres_path.read_text(encoding="utf-8")
            compact_postgres = " ".join(postgres.split())

            with self.subTest(capability=capability):
                self.assertTrue(postgres_path.is_file())
                self.assertFalse(sqlite_path.exists())
                self.assertIn("pub page_no: i64", port)
                self.assertIn("pub page_size: i64", port)
                self.assertIn("pub offset: i64", port)
                self.assertIn("pub q: Option<String>", port)
                self.assertIn("pub total: i64", port)
                self.assertRegex(postgres, r"LIMIT \$\d+ OFFSET \$\d+")
                self.assertIn(".bind(query.page_size)", postgres)
                self.assertIn(".bind(query.offset)", postgres)
                self.assertIn("COUNT(*) OVER() AS total", compact_postgres)
                for field in required_policy_fields[capability]:
                    self.assertIn(f'required_integer_cell(&row, "{field}")?', compact_postgres)


if __name__ == "__main__":
    unittest.main()
