import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class DashboardOverviewRuntimeStandardTest(unittest.TestCase):
    def test_console_dashboard_declares_single_app_overview_contract_and_sdk_method(self) -> None:
        contract = (ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml").read_text(
            encoding="utf-8"
        )
        manifest = json.loads(
            (ROOT / "generated" / "api" / "api-contract-manifest.json").read_text(encoding="utf-8")
        )
        openapi = json.loads(
            (ROOT / "generated" / "openapi" / "clawrouter-app-openapi.json").read_text(encoding="utf-8")
        )
        sdk_ai = (ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "api" / "ai.ts").read_text(
            encoding="utf-8"
        )
        frontend = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-dashboard"
            / "src"
            / "dashboardService.ts"
        ).read_text(encoding="utf-8")

        operation_key = (
            "apps/sdkwork-clawrouter-pc/packages/"
            "sdkwork-clawrouter-pc-console-dashboard/src/dashboardService.ts#fetchDashboardOverview@/console/dashboard"
        )
        operations = {operation["key"]: operation for operation in manifest["operations"]}

        self.assertIn("operation: fetchDashboardOverview", contract)
        self.assertIn("api_path: /app/v3/api/ai/dashboard/overview", contract)
        self.assertIn(operation_key, operations)
        self.assertEqual("app", operations[operation_key]["api_surface"])
        self.assertEqual("GET", operations[operation_key]["api_method"])
        self.assertEqual("/app/v3/api/ai/dashboard/overview", operations[operation_key]["api_path"])
        self.assertIn("/app/v3/api/ai/dashboard/overview", openapi["paths"])
        self.assertIn("async retrieve(params?: AiDashboardOverviewRetrieveParams): Promise<DashboardOverviewRetrieveResult>", sdk_ai)
        self.assertIn("static async fetchDashboardOverview", frontend)
        self.assertIn("client.ai.dashboard.overview.retrieve(params)", frontend)
        self.assertNotIn("client.account.fetchAccountDetails", frontend)
        self.assertNotIn("client.router.fetchUsageData", frontend)
        self.assertNotIn("client.router.fetchDashboardData", frontend)
        self.assertNotIn("client.notification.fetchMessages", frontend)

    def test_console_dashboard_contract_response_schema_is_precise(self) -> None:
        contract = (
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        ).read_text(encoding="utf-8")
        operation_marker = "api_path: /app/v3/api/ai/dashboard/overview"
        operation_index = contract.index(operation_marker)
        schema_index = contract.index("name: DashboardOverviewResponse", operation_index)
        self.assertLess(schema_index - operation_index, 1200)

        for marker in [
            "name: DashboardOverviewSummary",
            "name: DashboardSparklinePoint",
            "name: DashboardChartPoint",
            "name: DashboardTopModel",
            "name: DashboardAnnouncement",
            "required: [summary, requestSparkline, multimodalSparkline, performanceSparkline, chartData, topModels, announcements, warnings]",
            "required: [availableCredits, usedCredits, requestCount, totalUsedCredits, totalRequestCount, errorCount, imageRequests, videoRequests, audioRequests, musicRequests, rpm, tpm]",
            "totalUsedCredits: { type: number }",
            "totalRequestCount: { type: integer, format: int64 }",
            "type: { type: string, enum: [success, info, warning, error, unknown] }",
            "modality: { type: string, enum: [text, image, video, audio, music, unknown] }",
        ]:
            self.assertIn(marker, contract[schema_index : schema_index + 6200])

    def test_console_dashboard_generated_sdk_and_frontend_use_precise_overview_type(self) -> None:
        openapi = (
            ROOT / "generated" / "openapi" / "clawrouter-app-openapi.json"
        ).read_text(encoding="utf-8")
        sdk_ai = (
            ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "api" / "ai.ts"
        ).read_text(encoding="utf-8")
        overview_response_path = (
            ROOT
            / "sdks"
            / "clawrouter-app-sdk"
            / "clawrouter-app-sdk-typescript"
            / "src"
            / "types"
            / "dashboard-overview-response.ts"
        )
        fetch_result_path = (
            ROOT
            / "sdks"
            / "clawrouter-app-sdk"
            / "clawrouter-app-sdk-typescript"
            / "src"
            / "types"
            / "dashboard-overview-retrieve-result.ts"
        )
        top_model_path = (
            ROOT
            / "sdks"
            / "clawrouter-app-sdk"
            / "clawrouter-app-sdk-typescript"
            / "src"
            / "types"
            / "dashboard-top-model.ts"
        )
        announcement_path = (
            ROOT
            / "sdks"
            / "clawrouter-app-sdk"
            / "clawrouter-app-sdk-typescript"
            / "src"
            / "types"
            / "dashboard-announcement.ts"
        )
        summary_path = (
            ROOT
            / "sdks"
            / "clawrouter-app-sdk"
            / "clawrouter-app-sdk-typescript"
            / "src"
            / "types"
            / "dashboard-overview-summary.ts"
        )
        frontend = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-dashboard"
            / "src"
            / "dashboardService.ts"
        ).read_text(encoding="utf-8")

        self.assertIn('"DashboardOverviewResponse"', openapi)
        self.assertIn('"$ref": "#/components/schemas/DashboardOverviewResponse"', openapi)
        self.assertTrue(overview_response_path.exists())
        self.assertTrue(fetch_result_path.exists())
        self.assertTrue(top_model_path.exists())
        self.assertTrue(announcement_path.exists())

        overview_response = overview_response_path.read_text(encoding="utf-8")
        fetch_result = fetch_result_path.read_text(encoding="utf-8")
        top_model = top_model_path.read_text(encoding="utf-8")
        announcement = announcement_path.read_text(encoding="utf-8")
        summary = summary_path.read_text(encoding="utf-8")
        self.assertIn("export interface DashboardOverviewResponse", overview_response)
        self.assertIn("data?: DashboardOverviewResponse;", fetch_result)
        self.assertIn("totalUsedCredits: number;", summary)
        self.assertIn("totalRequestCount: string;", summary)
        self.assertIn("modality: 'text' | 'image' | 'video' | 'audio' | 'music' | 'unknown';", top_model)
        self.assertIn("type: 'success' | 'info' | 'warning' | 'error' | 'unknown';", announcement)
        sdk_ai = (
            ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "api" / "ai.ts"
        ).read_text(encoding="utf-8")
        self.assertIn("async retrieve(params?: AiDashboardOverviewRetrieveParams): Promise<DashboardOverviewRetrieveResult>", sdk_ai)

        self.assertIn("DashboardOverviewResponse as SdkDashboardOverviewResponse", frontend)
        self.assertIn("interface DashboardSummary", frontend)
        self.assertIn("topModels: ModelUsage[]", frontend)
        self.assertIn("Promise<DashboardSnapshot>", frontend)
        self.assertIn("normalizeSummary", frontend)

    def test_console_dashboard_ui_has_retryable_load_state(self) -> None:
        view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-dashboard"
            / "src"
            / "DashboardView.tsx"
        ).read_text(encoding="utf-8")

        self.assertIn("BusinessStatePanel", view)
        self.assertIn("loadDashboard", view)
        self.assertIn("loadError", view)
        self.assertIn("onRetry={() => void loadDashboard()}", view)
        self.assertIn("await DashboardService.fetchDashboardOverview", view)
        self.assertNotIn("DashboardService.fetchDashboardOverview(timeRange).then", view)

    def test_console_dashboard_product_states_are_localized_not_hardcoded_english(self) -> None:
        view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-dashboard"
            / "src"
            / "DashboardView.tsx"
        ).read_text(encoding="utf-8")
        service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-dashboard"
            / "src"
            / "dashboardService.ts"
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
            "console.dashboard.dashboardview.text.loadingTitle",
            "console.dashboard.dashboardview.text.loadingDescription",
            "console.dashboard.dashboardview.text.loadErrorTitle",
            "console.dashboard.dashboardview.text.loadErrorFallback",
            "console.dashboard.dashboardview.text.initialAnnouncement",
            "console.dashboard.dashboardview.text.measurementUnavailable",
            "console.dashboard.dashboardview.text.speedTimeout",
            "console.dashboard.dashboardview.text.domainProtocolError",
        ]:
            self.assertIn(marker, view + service + i18n)

        for hardcoded_copy in [
            "Loading dashboard overview...",
            "Fetching usage, model ranking, and announcement data.",
            "Dashboard overview could not be loaded",
            "Failed to load dashboard overview.",
            "Dashboard overview is ready. Usage data will appear after routed requests are recorded.",
            "Browser image measurement is unavailable.",
            "Configuration domain speed test timed out.",
            "Configuration domain must use http or https.",
        ]:
            self.assertNotIn(hardcoded_copy, view)
            self.assertNotIn(hardcoded_copy, service)

    def test_console_dashboard_ui_renders_initialized_success_state_without_empty_gate(self) -> None:
        view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-dashboard"
            / "src"
            / "DashboardView.tsx"
        ).read_text(encoding="utf-8")
        service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-dashboard"
            / "src"
            / "dashboardService.ts"
        ).read_text(encoding="utf-8")

        self.assertIn("createInitialDashboardSnapshot", service)
        self.assertIn("createInitialChartData", service)
        self.assertIn("topModels: []", service)
        self.assertNotIn("INITIAL_TOP_MODELS", service)
        self.assertIn("DashboardService.emptyDashboardSnapshot(timeRange)", view)
        self.assertIn("totalRequests > 0 ? Math.round", view)
        self.assertNotIn(".filter((item) => item.value > 0)", view)
        self.assertNotIn("const hasDashboardData", view)
        self.assertNotIn("!hasDashboardData", view)
        self.assertNotIn('kind="empty"', view)
        self.assertNotIn("No dashboard data found", view)

    def test_console_dashboard_starts_with_metric_cards_without_overview_header(self) -> None:
        view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-dashboard"
            / "src"
            / "DashboardView.tsx"
        ).read_text(encoding="utf-8")

        metric_grid_index = view.index("grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4")
        loading_state_index = view.index("{isLoading ?")

        self.assertLess(metric_grid_index, loading_state_index)
        self.assertIn("pt-2", view)
        self.assertIn("lg:pt-3", view)
        self.assertNotIn("bg-slate-50 p-4", view)
        self.assertNotIn("lg:p-6", view)
        self.assertNotIn("<h1", view)
        self.assertNotIn("console.dashboard.dashboardview.text.gga6x6", view)
        self.assertNotIn("鎺у埗鍙版瑙?, view)
        self.assertIn("snapshot.summary.totalUsedCredits", view)
        self.assertIn("snapshot.summary.totalRequestCount", view)
        self.assertIn("console.dashboard.dashboardview.text.totalUsedCredits", view)
        self.assertIn("console.dashboard.dashboardview.text.totalRequestCount", view)

    def test_console_dashboard_ui_keeps_only_read_overview_contract_without_product_caveats(self) -> None:
        view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-dashboard"
            / "src"
            / "DashboardView.tsx"
        ).read_text(encoding="utf-8")
        service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-dashboard"
            / "src"
            / "dashboardService.ts"
        ).read_text(encoding="utf-8")
        contract = (
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        ).read_text(encoding="utf-8")
        dashboard_operation_marker = (
            "  - route: /console/dashboard\n"
            "    source: apps/sdkwork-clawrouter-pc/packages/"
            "sdkwork-clawrouter-pc-console-dashboard/src/dashboardService.ts\n"
            "    operation: fetchDashboardOverview"
        )
        dashboard_operation_start = contract.index(dashboard_operation_marker)
        next_operation_start = contract.index("\n  - route:", dashboard_operation_start + 1)
        dashboard_operation_contract = contract[dashboard_operation_start:next_operation_start]

        self.assertIn("DashboardService.fetchDashboardOverview(timeRange)", view)
        self.assertIn("BusinessStatePanel", view)
        self.assertNotIn("readOnlyDashboardActions", view)
        self.assertNotIn("Read-only", view)
        self.assertNotIn("read-only", view)
        self.assertNotIn("command contract", view)
        self.assertNotIn("<Search", view)
        self.assertNotIn("actionLabel=\"", view)
        self.assertNotIn("onAction={() => navigate('/console/' + 'billing?tab=recharge')}", view)
        self.assertNotIn("onAction?: () => void", view)
        for unsupported_action in [
            "exportDashboard",
            "downloadDashboard",
            "searchResources",
            "handleExport",
            "handleDownload",
            "handleSearch",
            "static async export",
            "static async download",
        ]:
            self.assertNotIn(unsupported_action, view)
            self.assertNotIn(unsupported_action, service)
        self.assertIn("operation: fetchDashboardOverview", dashboard_operation_contract)
        self.assertNotIn("operation: export", dashboard_operation_contract)
        self.assertNotIn("operation: downloadDashboard", dashboard_operation_contract)
        self.assertNotIn("operation: searchResources", dashboard_operation_contract)

    def test_dashboard_overview_summary_exposes_window_and_historical_totals(self) -> None:
        ports = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "ports"
            / "dashboard_overview_read_store.rs"
        ).read_text(encoding="utf-8")
        postgres_store = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "postgres"
            / "dashboard_overview_read_store.rs"
        ).read_text(encoding="utf-8")
        sqlite_store = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "sqlite"
            / "dashboard_overview_read_store.rs"
        ).read_text(encoding="utf-8")

        self.assertIn("pub total_used_credits: f64", ports)
        self.assertIn("pub total_request_count: i64", ports)
        for store in (postgres_store, sqlite_store):
            self.assertIn("LOAD_USAGE_TOTALS", store)
            self.assertIn("load_usage_totals", store)
            self.assertIn("total_used_credits", store)
            self.assertIn("total_request_count", store)
            self.assertIn("let (total_request_count, total_used_credits) = load_usage_totals", store)
            self.assertIn("total_used_credits,", store)
            self.assertIn("total_request_count,", store)

    def test_backend_app_router_exposes_real_dashboard_overview_route(self) -> None:
        product_api = (ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "mod.rs").read_text(
            encoding="utf-8"
        )
        app_api = (ROOT / "crates" / "sdkwork-routes-clawrouter-app-api" / "src" / "routes.rs").read_text(encoding="utf-8")

        self.assertIn("app_dashboard_overview_router", product_api)
        self.assertIn("app_dashboard_overview_router_with_read_store", product_api)
        self.assertIn("app_dashboard_overview_router()", app_api)
        self.assertIn("app_dashboard_overview_router_with_read_store", app_api)
        self.assertIn("merge_web_framework_scoped_app_read_router", app_api)
        self.assertNotIn("/app/v3/api/router/dashboard/overview\", \"fetchDashboardOverview", app_api)

    def test_dashboard_overview_validates_query_before_read_store_access(self) -> None:
        contract = (ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml").read_text(
            encoding="utf-8"
        )
        app_dashboard = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "app_dashboard.rs"
        ).read_text(encoding="utf-8")
        postgres_store = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "postgres"
            / "dashboard_overview_read_store.rs"
        ).read_text(encoding="utf-8")

        self.assertIn("MAX_DASHBOARD_RANGE_DAYS", app_dashboard)
        self.assertIn("SUPPORTED_DASHBOARD_RANGES", app_dashboard)
        self.assertIn("DashboardOverviewQueryValidationError", app_dashboard)
        self.assertIn("validate_dashboard_overview_query", app_dashboard)
        self.assertIn("parse_dashboard_timestamp", app_dashboard)
        self.assertIn("format_dashboard_timestamp_for_query", app_dashboard)
        self.assertIn("dashboard overview time_range must be one of hourly, daily, monthly, yearly", app_dashboard)
        self.assertIn("dashboard overview start_time must be a valid UTC timestamp", app_dashboard)
        self.assertIn("dashboard overview end_time must be greater than or equal to start_time", app_dashboard)
        self.assertIn("dashboard overview time range must not exceed", app_dashboard)
        self.assertIn('StatusCode::BAD_REQUEST', app_dashboard)
        self.assertIn('problem_from_wire_code("4001"', app_dashboard)
        self.assertNotIn("PlusApiResult", app_dashboard)
        self.assertIn("let validated_query = match validate_dashboard_overview_query(query)", app_dashboard)
        self.assertIn("ResolvedAppSqlScopedSubject", app_dashboard)
        self.assertIn("validated_query.query", app_dashboard)
        self.assertIn("start_time: parsed_start", app_dashboard)
        self.assertIn("end_time: parsed_end", app_dashboard)
        self.assertGreaterEqual(app_dashboard.count(".map(format_dashboard_timestamp_for_query)"), 2)
        self.assertIn("$4::timestamptz", postgres_store)
        self.assertIn("$5::timestamptz", postgres_store)
        self.assertNotIn("AT TIME ZONE 'UTC'", postgres_store)
        dashboard_operation_marker = (
            "  - route: /console/dashboard\n"
            "    source: apps/sdkwork-clawrouter-pc/packages/"
            "sdkwork-clawrouter-pc-console-dashboard/src/dashboardService.ts\n"
            "    operation: fetchDashboardOverview"
        )
        dashboard_operation_start = contract.index(dashboard_operation_marker)
        next_operation_start = contract.index("\n  - route:", dashboard_operation_start + 1)
        dashboard_section = contract[dashboard_operation_start:next_operation_start]
        for table in [
            "ai_usage",
            "ai_request_trace",
            "ai_model_rank_snapshot",
            "ops_notification_message",
            "ops_metric_snapshot",
            "ops_gateway_instance",
        ]:
            self.assertIn(table, dashboard_section)
        routes_contract = (
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "routes" / "routes.yaml"
        ).read_text(encoding="utf-8")
        self.assertIn("route: /console/dashboard", routes_contract)
        self.assertIn("ai_request_trace:", routes_contract)
        self.assertIn("- request_id", routes_contract)
        self.assertIn("- http_status", routes_contract)
        self.assertIn("- error_type", routes_contract)
        self.assertIn("- provider_error_code", routes_contract)
        self.assertIn("- started_at", routes_contract)

    def test_dashboard_overview_summary_rates_are_derived_from_time_window(self) -> None:
        metrics = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "dashboard_overview_metrics.rs"
        ).read_text(encoding="utf-8")
        postgres_store = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "postgres"
            / "dashboard_overview_read_store.rs"
        ).read_text(encoding="utf-8")
        sqlite_store = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "sqlite"
            / "dashboard_overview_read_store.rs"
        ).read_text(encoding="utf-8")
        sql_mod = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql" / "mod.rs"
        ).read_text(encoding="utf-8")

        self.assertIn("mod dashboard_overview_metrics;", sql_mod)
        self.assertIn("derive_dashboard_summary_rates", metrics)
        self.assertIn("parse_dashboard_query_timestamp", metrics)
        self.assertIn("seconds_between", metrics)
        self.assertIn("let minutes = duration_seconds / 60.0", metrics)
        self.assertIn("request_count as f64 / minutes", metrics)
        self.assertIn("total_tokens / minutes", metrics)

        for store in (postgres_store, sqlite_store):
            self.assertIn("derive_dashboard_summary_rates", store)
            self.assertIn("let total_tokens = decimal_cell(&row, \"total_tokens\")", store)
            self.assertIn("let (rpm, tpm) = derive_dashboard_summary_rates", store)
            self.assertIn("rpm,", store)
            self.assertIn("tpm,", store)
            self.assertNotIn("rpm: 0.0", store)
            self.assertNotIn("tpm: decimal_cell(&row, \"total_tokens\")", store)

    def test_dashboard_overview_error_count_is_read_from_request_trace(self) -> None:
        postgres_store = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "postgres"
            / "dashboard_overview_read_store.rs"
        ).read_text(encoding="utf-8")
        sqlite_store = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "sqlite"
            / "dashboard_overview_read_store.rs"
        ).read_text(encoding="utf-8")

        for store in (postgres_store, sqlite_store):
            self.assertIn("LOAD_ERROR_COUNT", store)
            self.assertIn("FROM ai_request_trace", store)
            self.assertIn("COUNT(DISTINCT", store)
            self.assertIn("COALESCE(NULLIF(request_id, ''), CAST(id AS TEXT))", store)
            self.assertIn("http_status >= 400", store)
            self.assertIn("error_type IS NOT NULL", store)
            self.assertIn("provider_error_code", store)
            self.assertIn("started_at", store)
            self.assertIn("load_error_count", store)
            self.assertIn("let error_count = load_error_count", store)
            self.assertIn("error_count,", store)
            self.assertNotIn("error_count: 0", store)

    def test_dashboard_overview_top_model_modality_preserves_unknown_values(self) -> None:
        dashboard_service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-dashboard"
            / "src"
            / "dashboardService.ts"
        ).read_text(encoding="utf-8")

        for relative in [
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/dashboard_overview_read_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/dashboard_overview_read_store.rs",
        ]:
            store = (ROOT / relative).read_text(encoding="utf-8")
            with self.subTest(store=relative):
                self.assertIn("None => \"unknown\"", store)
                self.assertIn("Some(_) => \"unknown\"", store)
                self.assertNotIn("_ => \"text\"", store)

        self.assertIn("normalized === 'unknown'", dashboard_service)
        self.assertIn("return 'unknown';", dashboard_service)
        self.assertNotIn("Unsupported dashboard top model modality: ${value}", dashboard_service)

    def test_dashboard_overview_announcement_type_preserves_unknown_values(self) -> None:
        dashboard_service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-dashboard"
            / "src"
            / "dashboardService.ts"
        ).read_text(encoding="utf-8")

        for relative in [
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/dashboard_overview_read_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/dashboard_overview_read_store.rs",
        ]:
            store = (ROOT / relative).read_text(encoding="utf-8")
            with self.subTest(store=relative):
                self.assertIn('Some(1) => "info"', store)
                self.assertIn("None => \"unknown\"", store)
                self.assertIn("Some(_) => \"unknown\"", store)
                self.assertNotIn("_ => \"info\"", store)

        self.assertIn("type: 'success' | 'info' | 'warning' | 'error' | 'unknown';", dashboard_service)
        self.assertIn("normalized === 'unknown'", dashboard_service)
        self.assertIn("return 'unknown';", dashboard_service)
        self.assertNotIn("Unsupported dashboard announcement type: ${value}", dashboard_service)


if __name__ == "__main__":
    unittest.main()
