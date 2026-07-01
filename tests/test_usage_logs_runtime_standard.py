import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class UsageLogsRuntimeStandardTest(unittest.TestCase):
    def test_console_usage_operation_is_backed_by_real_app_usage_logs_api(self) -> None:
        contract = (ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml").read_text(
            encoding="utf-8"
        )
        product_api_mod = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "mod.rs"
        ).read_text(encoding="utf-8")
        app_api = (ROOT / "services" / "sdkwork-clawrouter-app-api-server" / "src" / "lib.rs").read_text(
            encoding="utf-8"
        )

        self.assertIn("operation: fetchLogs", contract)
        self.assertIn("api_path: /app/v3/api/ai/usage/logs", contract)
        self.assertIn(
            "read_sources: [ai_request_trace, ai_usage_fact, ai_routing_decision_log]",
            contract,
        )

        self.assertTrue(
            (ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "app_usage_logs.rs").exists()
        )
        self.assertIn("app_usage_logs_router", product_api_mod)
        self.assertIn("app_usage_logs_router_with_read_store", product_api_mod)
        self.assertIn("app_usage_logs_router()", app_api)
        self.assertIn("app_usage_logs_router_with_read_store", app_api)
        self.assertIn("UsageLogsReadStore", app_api)
        self.assertIn("SqliteUsageLogsReadStore", app_api)
        self.assertIn("PostgresUsageLogsReadStore", app_api)
        self.assertIn("app_request_subject_boundary", app_api)

    def test_usage_logs_api_validates_query_and_empty_runtime_returns_standard_page(self) -> None:
        app_usage_logs = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "app_usage_logs.rs"
        ).read_text(encoding="utf-8")
        ports_mod = (ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "ports" / "mod.rs").read_text(
            encoding="utf-8"
        )
        usage_port = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "ports" / "usage_logs_read_store.rs"
        ).read_text(encoding="utf-8")

        self.assertIn('"/app/v3/api/ai/usage/logs"', app_usage_logs)
        self.assertIn("MAX_USAGE_LOGS_PAGE_SIZE", app_usage_logs)
        self.assertIn("UsageLogsQueryValidationError", app_usage_logs)
        self.assertIn("validate_usage_logs_query", app_usage_logs)
        self.assertIn("parse_usage_logs_timestamp", app_usage_logs)
        self.assertIn("usage logs page must be greater than or equal to 1", app_usage_logs)
        self.assertIn("usage logs page_size must be between 1 and", app_usage_logs)
        self.assertIn("usage logs status must be one of all, success, error", app_usage_logs)
        self.assertIn("usage logs q must not exceed", app_usage_logs)
        self.assertIn("usage logs start_time must be a valid UTC timestamp", app_usage_logs)
        self.assertIn("usage logs end_time must be greater than or equal to start_time", app_usage_logs)
        self.assertIn('problem_from_wire_code("4001"', app_usage_logs)
        self.assertNotIn("PlusApiResult", app_usage_logs)
        self.assertIn("EmptyUsageLogsReadStore", app_usage_logs)
        self.assertIn("UsageLogsPage::default()", app_usage_logs)

        self.assertIn("UsageLogsReadStore", ports_mod)
        self.assertIn("UsageLogsReadFuture", ports_mod)
        self.assertIn("UsageLogsPage", ports_mod)
        self.assertIn("UsageLogItem", usage_port)
        self.assertIn("page_no", usage_port)
        self.assertIn("page_size", usage_port)
        self.assertIn("offset", usage_port)
        self.assertIn("total", usage_port)

    def test_usage_logs_read_stores_use_trace_usage_join_with_tenant_scope_and_pagination(self) -> None:
        for relative in [
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/usage_logs_read_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/usage_logs_read_store.rs",
        ]:
            store = (ROOT / relative).read_text(encoding="utf-8")
            self.assertIn("FROM ai_request_trace", store)
            self.assertIn("ai_usage_fact", store)
            self.assertIn("ai_routing_decision_log", store)
            self.assertIn("u.modality AS modality", store)
            self.assertNotIn("t.owner_type) AS modality", store)
            self.assertIn("tenant_id", store)
            self.assertIn("organization_id", store)
            self.assertIn("user_id", store)
            self.assertIn("started_at", store)
            self.assertIn("LIMIT", store)
            self.assertIn("OFFSET", store)
            self.assertIn("request_id", store)
            self.assertIn("api_key_name_snapshot", store)
            self.assertIn("channel_group_snapshot", store)
            self.assertIn("requested_model", store)
            self.assertIn("client_ip_masked", store)
            self.assertIn("rate_multiplier", store)
            self.assertIn("base_input_unit_price", store)
            self.assertIn("base_output_unit_price", store)
            self.assertIn("cache_read_unit_price", store)
            self.assertIn("load_usage_logs", store)
            self.assertIn("load_usage_logs_total", store)

    def test_usage_logs_read_models_reject_missing_or_invalid_trace_latency(self) -> None:
        for relative in [
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/usage_logs_read_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/usage_logs_read_store.rs",
        ]:
            store = (ROOT / relative).read_text(encoding="utf-8")
            compact_store = " ".join(store.split())
            with self.subTest(store=relative):
                self.assertNotIn("COALESCE(t.latency_ms, 0) AS latency_ms", store)
                self.assertIn("t.latency_ms AS latency_ms", store)
                self.assertNotIn(
                    'total_time: duration_label(integer_cell(&row, "latency_ms"))',
                    compact_store,
                )
                self.assertIn(
                    'total_time: duration_label(required_latency_cell(&row, "latency_ms")?)',
                    compact_store,
                )
                self.assertIn("missing usage log latency_ms from database row", store)
                self.assertIn("invalid usage log latency_ms from database row", store)

    def test_usage_logs_read_models_do_not_default_missing_modality_to_text(self) -> None:
        for relative in [
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/usage_logs_read_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/usage_logs_read_store.rs",
        ]:
            store = (ROOT / relative).read_text(encoding="utf-8")
            compact_store = " ".join(store.split())
            with self.subTest(store=relative):
                self.assertIn('log_type: modality_label(optional_integer_cell(&row, "modality"))', compact_store)
                self.assertIn("model_modality::label(value).to_owned()", store)
                self.assertNotIn("_ => \"text\"", store)
        modality_helper = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "model_modality.rs"
        ).read_text(encoding="utf-8")
        self.assertIn("_ => \"unknown\"", modality_helper)
        self.assertNotIn("_ => \"text\"", modality_helper)

    def test_console_usage_view_renders_real_loaded_records_without_hardcoded_ip_or_mock_names(self) -> None:
        usage_view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-usage"
            / "src"
            / "UsageView.tsx"
        ).read_text(encoding="utf-8")

        self.assertIn("usageLogs", usage_view)
        self.assertIn("setUsageLogs", usage_view)
        self.assertIn("loadedCostTotal", usage_view)
        self.assertIn("log.ip", usage_view)
        self.assertIn("pageSize", usage_view)
        self.assertIn("pageCount", usage_view)
        self.assertNotIn("mockLogs", usage_view)
        self.assertNotIn("setMockLogs", usage_view)
        self.assertNotIn("192.16...", usage_view)
        self.assertNotIn("> 825.98<", usage_view)
        self.assertNotIn(">96</button>", usage_view)

    def test_console_usage_view_has_retryable_load_state(self) -> None:
        usage_view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-usage"
            / "src"
            / "UsageView.tsx"
        ).read_text(encoding="utf-8")

        self.assertIn("BusinessStatePanel", usage_view)
        self.assertIn("loadUsageLogs", usage_view)
        self.assertIn("loadError", usage_view)
        self.assertIn("onRetry={() => void loadUsageLogs()}", usage_view)
        self.assertIn("await UsageService.fetchLogs", usage_view)
        self.assertNotIn("UsageService.fetchLogs().then", usage_view)

    def test_console_usage_product_states_are_localized(self) -> None:
        usage_view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-usage"
            / "src"
            / "UsageView.tsx"
        ).read_text(encoding="utf-8")
        usage_service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-usage"
            / "src"
            / "usageService.ts"
        ).read_text(encoding="utf-8")
        i18n = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-i18n"
            / "src"
            / "index.ts"
        ).read_text(encoding="utf-8")

        for marker in [
            "console.usage.title",
            "console.usage.searchPlaceholder",
            "console.usage.loading",
            "console.usage.loadErrorTitle",
            "console.usage.loadErrorFallback",
            "console.usage.emptyTitle",
            "console.usage.emptyDescription",
            "console.usage.table.details",
            "console.usage.errors.fetchFallback",
        ]:
            self.assertIn(marker, usage_view + usage_service + i18n)
            self.assertGreaterEqual(i18n.count(f'"{marker}"'), 2)

        for hardcoded_copy in [
            "Failed to load usage logs.",
            "Failed to fetch usage logs",
            "Loading usage logs...",
            "Usage logs could not be loaded",
            "No usage logs found",
            "Search key, model, request, path...",
            "Details",
        ]:
            self.assertNotIn(hardcoded_copy, usage_view)
            self.assertNotIn(hardcoded_copy, usage_service)

    def test_console_usage_view_uses_real_query_contract_and_hides_unsupported_actions(self) -> None:
        usage_view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-usage"
            / "src"
            / "UsageView.tsx"
        ).read_text(encoding="utf-8")
        usage_service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-usage"
            / "src"
            / "usageService.ts"
        ).read_text(encoding="utf-8")
        contract = (
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        ).read_text(encoding="utf-8")
        usage_operation_marker = (
            "  - route: /console/usage\n"
            "    source: apps/sdkwork-clawrouter-pc/packages/"
            "sdkwork-clawrouter-pc-console-usage/src/usageService.ts\n"
            "    operation: fetchLogs"
        )
        usage_operation_start = contract.index(usage_operation_marker)
        next_operation_start = contract.index("\n  - route:", usage_operation_start + 1)
        usage_operation_contract = contract[usage_operation_start:next_operation_start]

        self.assertNotIn("readOnlyUsageActions", usage_view)
        self.assertNotIn("Read-only", usage_view)
        self.assertNotIn("read-only", usage_view)
        self.assertNotIn("command contract", usage_view)
        self.assertIn("buildUsageLogQuery", usage_view)
        self.assertIn("page: number", usage_view)
        self.assertNotIn("pageNo", usage_view)
        self.assertIn("pageSize", usage_view)
        self.assertIn("searchQuery", usage_view)
        self.assertIn("status", usage_view)
        self.assertIn("startTime", usage_view)
        self.assertIn("endTime", usage_view)
        self.assertIn("UsageService.fetchLogs(buildUsageLogQuery", usage_view)
        self.assertIn("onClick={() => void applyFilters()}", usage_view)
        self.assertIn("onClick={() => void resetFilters()}", usage_view)
        self.assertIn("onClick={() => void goToPage(page - 1)}", usage_view)
        self.assertIn("onClick={() => void goToPage(page + 1)}", usage_view)
        self.assertNotIn("<SlidersHorizontal", usage_view)
        self.assertNotIn("<Settings2", usage_view)
        for unsupported_action in [
            "exportUsage",
            "downloadCsv",
            "downloadPdf",
            "handleExport",
            "handleAdvancedFilter",
            "static async exportLogs",
            "operation: exportLogs",
        ]:
            self.assertNotIn(unsupported_action, usage_view)
            self.assertNotIn(unsupported_action, usage_service)
            self.assertNotIn(unsupported_action, usage_operation_contract)
        self.assertIn("operation: fetchLogs", usage_operation_contract)
        self.assertNotIn("operation: exportLogs", usage_operation_contract)
        self.assertNotIn("operation: updateUsageFilter", usage_operation_contract)

    def test_console_usage_uses_precise_sdk_response_contract(self) -> None:
        contract = (
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        ).read_text(encoding="utf-8")
        openapi = (
            ROOT / "generated" / "openapi" / "clawrouter-app-openapi.json"
        ).read_text(encoding="utf-8")
        sdk_ai = (
            ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "api" / "ai.ts"
        ).read_text(encoding="utf-8")
        service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-usage"
            / "src"
            / "usageService.ts"
        ).read_text(encoding="utf-8")

        self.assertIn("name: UsageLogsResponse", contract)
        self.assertIn('"UsageLogsResponse"', openapi)
        self.assertIn('"UsageLogsListResult"', openapi)
        self.assertIn('"$ref": "#/components/schemas/UsageLogsResponse"', openapi)
        self.assertIn("async list(params?: AiUsageLogsListParams): Promise<UsageLogsListResult>", sdk_ai)
        self.assertIn("get<UsageLogsListResult>", sdk_ai)
        self.assertIn("{ name: 'q', value: params?.q", sdk_ai)
        self.assertNotIn("search_query", sdk_ai)

        response_path = ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "types" / "usage-logs-response.ts"
        item_path = ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "types" / "usage-log-item.ts"
        result_path = ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "types" / "usage-logs-list-result.ts"
        self.assertTrue(response_path.exists())
        self.assertTrue(item_path.exists())
        self.assertTrue(result_path.exists())
        self.assertIn("logs: UsageLogItem[];", response_path.read_text(encoding="utf-8"))
        self.assertIn("total: number;", response_path.read_text(encoding="utf-8"))
        self.assertIn("page: number;", response_path.read_text(encoding="utf-8"))
        self.assertNotIn("pageNo: number;", response_path.read_text(encoding="utf-8"))
        self.assertIn("data?: UsageLogsResponse;", result_path.read_text(encoding="utf-8"))

        self.assertIn("UsageLogsResponse as SdkUsageLogsResponse", service)
        self.assertIn("id: SdkUsageLogsResponse['logs'][number]['id'];", service)
        self.assertIn("total: SdkUsageLogsResponse['total']", service)


if __name__ == "__main__":
    unittest.main()
