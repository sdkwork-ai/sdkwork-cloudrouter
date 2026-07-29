import json
import unittest
from pathlib import Path

from tools.api_contract_manifest import ApiContractManifestGenerator


ROOT = Path(__file__).resolve().parents[1]
ROUTER_SERVICE = ROOT / "services" / "sdkwork-clawrouter-router-service"
APP_ROUTE_CRATE = ROOT / "crates" / "sdkwork-routes-clawrouter-app-api"
APP_SDK_ROOT = (
    ROOT
    / "sdks"
    / "clawrouter-app-sdk"
    / "clawrouter-app-sdk-typescript"
    / "src"
)
ROUTING_OPERATIONS_SOURCE = (
    "apps/sdkwork-clawrouter-pc/packages/"
    "sdkwork-clawroutes-pc-commons/src/routingApiOperations.ts"
)


class ConsoleRoutingBackendRuntimeStandardTest(unittest.TestCase):
    def test_app_routing_routes_have_one_current_route_owner_and_runtime_assembly(self) -> None:
        api_mod = (ROUTER_SERVICE / "src" / "api" / "mod.rs").read_text(encoding="utf-8")
        app_routing = (ROUTER_SERVICE / "src" / "api" / "app_routing.rs").read_text(
            encoding="utf-8"
        )
        route_assembly = (APP_ROUTE_CRATE / "src" / "routes.rs").read_text(encoding="utf-8")

        self.assertIn("mod app_routing;", api_mod)
        self.assertIn("app_routing_router_with_read_store", api_mod)
        for path in [
            "/app/v3/api/ai/routing/account_groups",
            "/app/v3/api/ai/routing/api_keys",
            "/app/v3/api/ai/routing/request_traces",
            "/app/v3/api/ai/routing/usage",
        ]:
            self.assertIn(path, app_routing)
        self.assertNotIn("/app/v3/api/ai/routing/channels", app_routing)
        self.assertNotIn("channel", app_routing.lower())

        self.assertIn("ResolvedAppSqlScopedSubject", app_routing)
        self.assertIn("map_optional_app_sql_subject", app_routing)
        self.assertIn("AppRoutingReadStore", app_routing)
        self.assertIn("app routing read model is unavailable", app_routing)
        self.assertNotIn("PlusApiResult", app_routing)

        self.assertIn("PostgresAppRoutingReadStore", route_assembly)
        self.assertIn("PostgresAppRoutingStrategyStore", route_assembly)
        self.assertIn("app_routing_router_with_read_store", route_assembly)
        self.assertIn("merge_web_framework_scoped_app_router", route_assembly)
        self.assertFalse((ROOT / "services" / "sdkwork-clawrouter-app-api-server").exists())

    def test_app_routing_contract_and_generated_sdk_are_precise(self) -> None:
        manifest = ApiContractManifestGenerator(root=ROOT).generate()
        operations = {
            operation["operation_id"]: operation
            for operation in manifest["operations"]
            if operation["source"] == ROUTING_OPERATIONS_SOURCE
        }
        expected = {
            "routing.apiKeys.list": (
                "/app/v3/api/ai/routing/api_keys",
                ["page", "page_size", "q"],
                "AppRoutingApiKeyListResponse",
            ),
            "routing.requestTraces.list": (
                "/app/v3/api/ai/routing/request_traces",
                ["page", "page_size", "q"],
                "AppRoutingRequestTraceListResponse",
            ),
            "routing.usage.retrieve": (
                "/app/v3/api/ai/routing/usage",
                [],
                "AppRoutingUsageSnapshot",
            ),
        }
        self.assertEqual(set(expected), set(operations))
        for operation_id, (path, query_names, response_name) in expected.items():
            operation = operations[operation_id]
            with self.subTest(operation_id=operation_id):
                self.assertEqual("app", operation["api_surface"])
                self.assertEqual("SdkworkAppClient", operation["sdk_client"])
                self.assertEqual("GET", operation["api_method"])
                self.assertEqual(path, operation["api_path"])
                self.assertEqual(query_names, [item["name"] for item in operation["query_parameters"]])
                self.assertEqual(response_name, operation["response_schema"]["name"])

        openapi = json.loads(
            (ROOT / "generated" / "openapi" / "clawrouter-app-openapi.json").read_text(
                encoding="utf-8"
            )
        )
        schemas = openapi["components"]["schemas"]
        for schema_name in [
            "AppRoutingAccountGroupListResponse",
            "AppRoutingApiKeyListResponse",
            "AppRoutingRequestTraceListResponse",
            "AppRoutingUsageSnapshot",
        ]:
            self.assertIn(schema_name, schemas)
            self.assertNotEqual({}, schemas[schema_name].get("properties", {}))

        account_group = schemas["AppRoutingAccountGroup"]
        self.assertIn("memberAccountCount", account_group["properties"])
        self.assertIn("authorized", account_group["properties"])
        self.assertNotIn("accountCount", account_group["properties"])
        self.assertNotIn("groupType", account_group["properties"])

        sdk_api = (APP_SDK_ROOT / "api" / "ai.ts").read_text(encoding="utf-8")
        for token in [
            "async list(params?: AiRoutingAccountGroupsListParams, requestOptions?: ApiRequestOptions): Promise<AppRoutingAccountGroupListResponse>",
            "async list(params?: AiRoutingApiKeysListParams, requestOptions?: ApiRequestOptions): Promise<AppRoutingApiKeyListResponse>",
            "async list(params?: AiRoutingRequestTracesListParams, requestOptions?: ApiRequestOptions): Promise<AppRoutingRequestTraceListResponse>",
            "async retrieve(requestOptions?: ApiRequestOptions): Promise<AppRoutingUsageSnapshot>",
            "{ name: 'page_size', value: params?.pageSize",
            "{ name: 'q', value: params?.q",
        ]:
            self.assertIn(token, sdk_api)
        routing_sdk = sdk_api[
            sdk_api.index("export class AiRoutingUsageApi") : sdk_api.index("export class AiRoutingApi")
        ]
        self.assertNotIn("Promise<Record<string, never>>", routing_sdk)

    def test_frontend_routing_boundary_consumes_only_generated_app_sdk(self) -> None:
        source = (ROOT / ROUTING_OPERATIONS_SOURCE).read_text(encoding="utf-8")
        for type_name in [
            "AppRoutingApiKeyListResponse",
            "AppRoutingRequestTraceListResponse",
            "AppRoutingUsageSnapshot",
        ]:
            self.assertIn(type_name, source)
        for call in [
            ".ai.routing.apiKeys.list(",
            ".ai.routing.requestTraces.list(",
            ".ai.routing.usage.retrieve(",
        ]:
            self.assertIn(call, source)
        self.assertNotIn("fetch(", source)
        self.assertNotIn("axios", source)
        self.assertNotIn("Authorization", source)
        self.assertNotIn("/app/v3/api/", source)

    def test_routing_read_port_and_postgres_store_use_current_upstream_model(self) -> None:
        ports_mod = (ROUTER_SERVICE / "src" / "ports" / "mod.rs").read_text(encoding="utf-8")
        port = (ROUTER_SERVICE / "src" / "ports" / "app_routing_read_store.rs").read_text(
            encoding="utf-8"
        )
        postgres_path = (
            ROUTER_SERVICE
            / "src"
            / "infrastructure"
            / "sql"
            / "postgres"
            / "app_routing_read_store.rs"
        )
        sqlite_path = (
            ROUTER_SERVICE
            / "src"
            / "infrastructure"
            / "sql"
            / "sqlite"
            / "app_routing_read_store.rs"
        )
        postgres = postgres_path.read_text(encoding="utf-8")

        for export_name in [
            "AppRoutingAccountGroupItem",
            "AppRoutingApiKeyItem",
            "AppRoutingRequestTraceItem",
            "AppRoutingUsageSnapshot",
            "AppRoutingReadStore",
            "AppRoutingListQuery",
        ]:
            self.assertIn(export_name, ports_mod)
            self.assertIn(export_name, port)
        self.assertIn("pub page_size: i64", port)
        self.assertIn("pub offset: i64", port)
        self.assertIn("pub q: Option<String>", port)
        self.assertIn("pub account_groups: Vec<AppRoutingApiKeyAccountGroupItem>", port)
        self.assertNotIn("Channel", port)
        self.assertNotIn("channel", port.lower())

        self.assertTrue(postgres_path.is_file())
        self.assertFalse(sqlite_path.exists())
        for table in [
            "ai_upstream_account_group",
            "ai_upstream_account_group_member",
            "ai_upstream_account_group_resource",
            "ai_upstream_account",
            "ai_upstream_supplier",
            "iam_gateway_api_key",
            "iam_gateway_api_key_account_group",
            "ai_request_trace",
            "ai_routing_decision_log",
            "ai_usage",
        ]:
            self.assertIn(table, postgres)
        for scope in ["tenant_id", "organization_id", "user_id"]:
            self.assertIn(scope, postgres)
        self.assertIn("COUNT(*) OVER() AS total", " ".join(postgres.split()))
        self.assertRegex(postgres, r"LIMIT \$\d+ OFFSET \$\d+")
        self.assertIn(".bind(query.page_size.max(1))", postgres)
        self.assertIn(".bind(query.offset.max(0))", postgres)
        self.assertEqual(3, postgres.count("let search = query.q.as_deref()"))
        self.assertIn(".bind(search)", postgres)
        self.assertNotIn("ai_channel", postgres)
        self.assertNotIn("SELECT *", postgres)

    def test_routing_strategy_store_is_versioned_postgres_and_fails_closed(self) -> None:
        port = (ROUTER_SERVICE / "src" / "ports" / "app_routing_strategy_store.rs").read_text(
            encoding="utf-8"
        )
        postgres_path = (
            ROUTER_SERVICE
            / "src"
            / "infrastructure"
            / "sql"
            / "postgres"
            / "app_routing_strategy_store.rs"
        )
        sqlite_path = (
            ROUTER_SERVICE
            / "src"
            / "infrastructure"
            / "sql"
            / "sqlite"
            / "app_routing_strategy_store.rs"
        )
        postgres = postgres_path.read_text(encoding="utf-8")
        compact = " ".join(postgres.split())

        self.assertTrue(postgres_path.is_file())
        self.assertFalse(sqlite_path.exists())
        for token in [
            "next_profile_version",
            "LOAD_NEXT_PROFILE_VERSION",
            "LOAD_PROFILE_ID_BY_UUID",
            'format!("model-map-{sequence:04}-{normalized}")',
            'routing_strategy_type(required_integer_cell(&policy, "strategy_code")?)?',
            "fn routing_strategy_type(value: i64) -> DomainResult<AppRoutingStrategyType>",
            "invalid routing strategy code from database row",
            "fn row_to_mapping_rule",
            "-> DomainResult<AppRoutingMappingRule>",
            "invalid routing strategy match_expression json from database row",
            "missing routing strategy target_model from database row",
        ]:
            self.assertIn(token, compact if " ." in token else postgres)
        self.assertNotIn("const ROUTING_PROFILE_VERSION", postgres)
        self.assertNotIn("COALESCE(p.fallback_mode, 1) AS strategy_code", postgres)
        self.assertNotIn("COALESCE(match_expression", postgres)
        self.assertNotIn("source_model_from_rule_code", postgres)
        self.assertNotIn("pub fn from_code(code: i64) -> Self", port)
        self.assertNotIn("_ => Self::Latency", port)

    def test_retired_channel_contracts_and_implementations_are_absent(self) -> None:
        contract = (ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml").read_text(
            encoding="utf-8"
        )
        app_openapi = (ROOT / "generated" / "openapi" / "clawrouter-app-openapi.json").read_text(
            encoding="utf-8"
        )
        retired_paths = [
            ROUTER_SERVICE / "src" / "api" / "app_routing_channel_command.rs",
            ROUTER_SERVICE / "src" / "ports" / "app_routing_channel_command_store.rs",
            ROUTER_SERVICE
            / "src"
            / "infrastructure"
            / "sql"
            / "postgres"
            / "app_routing_channel_command_store.rs",
        ]
        for path in retired_paths:
            self.assertFalse(path.exists())
        for source in [contract, app_openapi]:
            self.assertNotIn("/app/v3/api/ai/routing/channels", source)
            self.assertNotIn("ai_channel", source)


if __name__ == "__main__":
    unittest.main()
