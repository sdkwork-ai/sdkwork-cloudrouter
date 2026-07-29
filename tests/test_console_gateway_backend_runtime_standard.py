import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ROUTER_SERVICE = ROOT / "services" / "sdkwork-clawrouter-router-service"
APP_ROUTES = ROOT / "crates" / "sdkwork-routes-clawrouter-app-api" / "src" / "routes.rs"
CONTRACT = ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
APP_SDK = ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src"
GATEWAY_FRONTEND = (
    ROOT
    / "apps"
    / "sdkwork-clawrouter-pc"
    / "packages"
    / "sdkwork-clawrouter-pc-console-gateway"
    / "src"
)


class ConsoleGatewayBackendRuntimeStandardTest(unittest.TestCase):
    def test_gateway_route_uses_real_postgres_read_store_and_app_subject_boundary(self) -> None:
        api_mod = (ROUTER_SERVICE / "src" / "api" / "mod.rs").read_text(encoding="utf-8")
        gateway_api = (ROUTER_SERVICE / "src" / "api" / "app_gateway.rs").read_text(
            encoding="utf-8"
        )
        routes = APP_ROUTES.read_text(encoding="utf-8")

        self.assertIn("mod app_gateway;", api_mod)
        self.assertIn("app_gateway_traces_router_with_read_store", api_mod)
        self.assertIn('"/app/v3/api/ai/gateway/traces"', gateway_api)
        self.assertIn("ResolvedAppSqlScopedSubject", gateway_api)
        self.assertIn("map_optional_app_sql_subject", gateway_api)
        self.assertIn("PostgresAppGatewayTracesReadStore", routes)
        self.assertEqual(3, routes.count("PostgresAppGatewayTracesReadStore::new"))
        self.assertIn("merge_web_framework_scoped_app_read_router", routes)
        self.assertNotIn("SqliteAppGatewayTraces", routes)

    def test_gateway_port_exposes_only_safe_canonical_fields(self) -> None:
        port = (
            ROUTER_SERVICE / "src" / "ports" / "app_gateway_traces_read_store.rs"
        ).read_text(encoding="utf-8")
        ports_mod = (ROUTER_SERVICE / "src" / "ports" / "mod.rs").read_text(
            encoding="utf-8"
        )

        self.assertIn("AppGatewayTracesReadStore", ports_mod)
        self.assertIn("AppGatewayTracesCursor", ports_mod)
        for field in [
            "id",
            "time",
            "ip",
            "endpoint",
            "method",
            "status",
            "duration",
            "upstream_account",
        ]:
            self.assertIn(f"pub {field}:", port)
        for retired_or_sensitive in [
            "channel",
            "payload_hash",
            "metadata",
            "client_ip_hash",
            "user_agent_hash",
            "request_payload",
            "response_payload",
        ]:
            self.assertNotIn(retired_or_sensitive, port)

    def test_gateway_postgres_query_is_scoped_bounded_and_keyset_paginated(self) -> None:
        store = (
            ROUTER_SERVICE
            / "src"
            / "infrastructure"
            / "sql"
            / "postgres"
            / "app_gateway_traces_read_store.rs"
        ).read_text(encoding="utf-8")

        self.assertIn("FROM ai_request_trace", store)
        for scope in ["t.tenant_id = $1", "t.organization_id = $2", "t.user_id = $3"]:
            self.assertIn(scope, store)
        self.assertIn("ORDER BY t.started_at DESC, t.id DESC", store)
        self.assertIn("t.started_at <", store)
        self.assertIn("t.id < $5", store)
        self.assertIn("LIMIT $7", store)
        self.assertIn("checked_add(1)", store)
        self.assertIn("ESCAPE '\\'", store)
        self.assertIn("account_name_snapshot", store)
        self.assertNotIn(" OFFSET ", store)
        self.assertNotIn("COUNT(*) OVER", store)
        self.assertNotIn("SELECT *", store)
        self.assertNotIn("ops_gateway_instance", store)
        for sensitive in ["payload_hash", "metadata", "client_ip_hash", "user_agent_hash"]:
            self.assertNotIn(sensitive, store)

    def test_gateway_handler_uses_sdkwork_cursor_and_numeric_error_contract(self) -> None:
        gateway_api = (ROUTER_SERVICE / "src" / "api" / "app_gateway.rs").read_text(
            encoding="utf-8"
        )

        self.assertIn("base64url_encode", gateway_api)
        self.assertIn("base64url_decode", gateway_api)
        self.assertIn("cursor_window_page_info", gateway_api)
        self.assertIn("SdkWorkResultCode::InternalError", gateway_api)
        self.assertIn("validation_problem_for_context", gateway_api)
        self.assertIn("MAX_GATEWAY_TRACES_PAGE_SIZE", gateway_api)
        self.assertIn("MAX_GATEWAY_TRACES_CURSOR_LEN", gateway_api)
        self.assertNotIn('problem_from_wire_code("5000"', gateway_api)
        self.assertNotIn("format!(\"gateway traces read model is unavailable: {error}\")", gateway_api)

    def test_gateway_contract_and_sdk_are_precise(self) -> None:
        contract = CONTRACT.read_text(encoding="utf-8")
        operation_start = contract.index("- route: /console/gateway\n")
        operation = contract[operation_start : operation_start + 3500]
        openapi = (ROOT / "generated" / "openapi" / "clawrouter-app-openapi.json").read_text(
            encoding="utf-8"
        )
        sdk_api = (APP_SDK / "api" / "ai.ts").read_text(encoding="utf-8")
        sdk_trace = (APP_SDK / "types" / "gateway-trace.ts").read_text(encoding="utf-8")
        sdk_page = (APP_SDK / "types" / "gateway-traces-page.ts").read_text(encoding="utf-8")

        for marker in [
            "operation_id: gateway.traces.list",
            "name: GatewayTracesPage",
            "name: GatewayTrace",
            "upstreamAccount",
            "- name: cursor",
            "- name: page_size",
            "- name: q",
        ]:
            self.assertIn(marker, operation)
        self.assertIn('"GatewayTrace"', openapi)
        self.assertIn("export interface AiGatewayTracesListParams", sdk_api)
        self.assertIn("Promise<GatewayTracesPage>", sdk_api)
        self.assertIn("sdkworkUnwrapKind: 'page'", sdk_api)
        self.assertIn("upstreamAccount: string;", sdk_trace)
        self.assertIn("items: GatewayTrace[];", sdk_page)
        self.assertNotIn("channel", sdk_trace.lower())

    def test_gateway_frontend_uses_upstream_account_terminology(self) -> None:
        frontend = (GATEWAY_FRONTEND / "gatewayService.ts").read_text(encoding="utf-8")
        view = (GATEWAY_FRONTEND / "GatewayView.tsx").read_text(encoding="utf-8")
        i18n_root = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-i18n"
            / "src"
        )
        messages = (i18n_root / "resources" / "console" / "gateway.ts").read_text(
            encoding="utf-8"
        )
        registry = (i18n_root / "console-gateway-i18n-key-registry.ts").read_text(
            encoding="utf-8"
        )
        combined = frontend + view + messages + registry

        self.assertIn("upstreamAccount", frontend)
        self.assertIn("console.gateway.summary.accounts", combined)
        self.assertIn("console.gateway.table.routedAccount", combined)
        self.assertNotIn("routedChannel", combined)
        self.assertNotIn("summary.channels", combined)
        self.assertNotIn("trace.channel", combined)


if __name__ == "__main__":
    unittest.main()
