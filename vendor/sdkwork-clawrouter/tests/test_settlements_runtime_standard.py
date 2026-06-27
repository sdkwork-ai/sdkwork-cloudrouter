import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONSOLE_SETTLEMENTS_PACKAGE = (
    ROOT
    / "apps"
    / "sdkwork-clawrouter-pc"
    / "packages"
    / "sdkwork-clawrouter-pc-console-settlements"
)


def skip_unless_console_settlements_package(test_case: unittest.TestCase) -> None:
    if not CONSOLE_SETTLEMENTS_PACKAGE.exists():
        test_case.skipTest("console settlements package removed from claw router PC surface")


class SettlementsRuntimeStandardTest(unittest.TestCase):
    def test_settlements_backend_uses_exact_decimal_strings(self) -> None:
        settlements_port = (
            ROOT
            / "crates"
            / "sdkwork-clawrouter-settlements-dashboard-repository-sqlx"
            / "src"
            / "types.rs"
        ).read_text(encoding="utf-8")
        repository_mapping = (
            ROOT
            / "crates"
            / "sdkwork-clawrouter-settlements-dashboard-repository-sqlx"
            / "src"
            / "mapping.rs"
        ).read_text(encoding="utf-8")
        sqlite_store = (
            ROOT
            / "crates"
            / "sdkwork-clawrouter-settlements-dashboard-repository-sqlx"
            / "src"
            / "sqlite.rs"
        ).read_text(encoding="utf-8")
        postgres_store = (
            ROOT
            / "crates"
            / "sdkwork-clawrouter-settlements-dashboard-repository-sqlx"
            / "src"
            / "postgres.rs"
        ).read_text(encoding="utf-8")

        for field in ["text", "image", "video", "audio", "music"]:
            self.assertIn(f"pub {field}: String", settlements_port)
            self.assertNotIn(f"pub {field}: f64", settlements_port)
        self.assertIn("pub total_cost: String", settlements_port)
        self.assertIn("pub cost: String", settlements_port)
        self.assertNotIn("pub total_cost: f64", settlements_port)
        self.assertNotIn("pub cost: f64", settlements_port)

        compact_mapping = " ".join(repository_mapping.split())
        for store in [sqlite_store, postgres_store]:
            compact_store = " ".join(store.split())
            self.assertIn("DecimalValue", repository_mapping)
            self.assertIn('row.decimal_string_cell("total_cost", 6, "settlement bill total cost")?', compact_mapping)
            self.assertIn('row.decimal_string_cell("cost_amount", 6, "settlement item cost")?', compact_mapping)
            self.assertIn('decimal_add_strings(&target.cost, &item_cost, 6)', repository_mapping)
            self.assertIn('row.decimal_string_cell("text_cost", 6, "settlement chart text cost")?', compact_mapping)
            self.assertIn('row.decimal_string_cell("image_cost", 6, "settlement chart image cost")?', compact_mapping)
            self.assertIn('row.decimal_string_cell("video_cost", 6, "settlement chart video cost")?', compact_mapping)
            self.assertIn('row.decimal_string_cell("audio_cost", 6, "settlement chart audio cost")?', compact_mapping)
            self.assertIn('row.decimal_string_cell("music_cost", 6, "settlement chart music cost")?', compact_mapping)
            self.assertIn("fn decimal_value_string(", compact_mapping)
            self.assertIn("value: &str", compact_mapping)
            self.assertIn("digits: u32", compact_mapping)
            self.assertIn("field_name: &str", compact_mapping)
            self.assertIn("-> RepositoryResult<String>", compact_mapping)
            self.assertIn('format!("invalid {field_name}: {value}")', repository_mapping)
            self.assertNotIn("DecimalValue::ZERO.to_fixed_string(digits)", repository_mapping)
            self.assertNotIn("DecimalValue::parse(left).unwrap_or(DecimalValue::ZERO)", repository_mapping)
            self.assertNotIn("DecimalValue::parse(right).unwrap_or(DecimalValue::ZERO)", repository_mapping)
            self.assertIn(
                "fn model_list(raw: &str, fallback: &str) -> RepositoryResult<Vec<String>>",
                compact_mapping,
            )
            self.assertIn("invalid settlement model list json from database row", repository_mapping)
            self.assertNotIn("serde_json::from_str::<Vec<String>>(raw).unwrap_or_default()", repository_mapping)
            self.assertNotIn("COALESCE(s.statement_status, 0) AS statement_status", store)
            self.assertNotIn("COALESCE(s.payment_status, 0) AS payment_status", store)
            self.assertIn("s.statement_status AS statement_status", store)
            self.assertIn("s.payment_status AS payment_status", store)
            self.assertIn(
                'row.required_statement_status_cell("payment_status", "payment")?',
                compact_mapping,
            )
            self.assertIn(
                'row.required_statement_status_cell("statement_status", "statement")?',
                compact_mapping,
            )
            self.assertIn("fn statement_status_label(", compact_mapping)
            self.assertIn("payment_status: i64", compact_mapping)
            self.assertIn("statement_status: i64", compact_mapping)
            self.assertIn(") -> RepositoryResult<String>", compact_mapping)
            self.assertIn("missing settlement bill status payment", repository_mapping)
            self.assertIn("missing settlement bill status statement", repository_mapping)
            self.assertIn("unsupported settlement bill status", repository_mapping)
            self.assertIn('row.required_modality_cell("modality", "settlement item")?', compact_mapping)
            self.assertIn("unsupported settlement item modality", repository_mapping)
            self.assertIn("missing settlement item modality", repository_mapping)
            self.assertNotIn("payment_status.unwrap_or(0)", store)
            self.assertNotIn("statement_status.unwrap_or(0)", store)
            self.assertNotIn('optional_integer_cell(&row, "modality").unwrap_or(MODALITY_TEXT)', repository_mapping)
            self.assertNotIn("_ => &mut breakdown.text", repository_mapping)
            self.assertNotIn("fn decimal_cell", store)
            self.assertNotIn("parse::<f64>()", store)
            self.assertNotIn("target.cost +=", repository_mapping)

    def test_console_settlements_uses_exact_decimal_strings(self) -> None:
        skip_unless_console_settlements_package(self)
        service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-settlements"
            / "src"
            / "settlementsService.ts"
        ).read_text(encoding="utf-8")
        view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-settlements"
            / "src"
            / "SettlementsView.tsx"
        ).read_text(encoding="utf-8")

        for field in ["text", "image", "video", "audio", "music", "cost", "totalCost"]:
            self.assertIn(f"{field}: string", service)
            self.assertNotIn(f"{field}: number", service)
            self.assertNotIn(f"readNumber(item, '{field}')", service)
        self.assertIn("readDecimalString", service)
        self.assertIn(
            "getClawRouterAppSdkClient().billing.settlements.dashboard.list(",
            service,
        )
        self.assertNotIn("getClawRouterAppSdkClient().router.fetchDashboardData", service)
        self.assertNotIn("fetch('/app/v3/api", service)
        self.assertNotIn("axios", service)

        self.assertIn("formatCurrency = (val: string)", view)
        self.assertIn("sumDecimalStrings(settlementBills.map(bill => bill.totalCost), 6)", view)
        self.assertIn("chartDataForRendering", view)
        self.assertIn("decimalNumber(value)", view)
        self.assertNotIn("formatCurrency = (val: number)", view)
        self.assertNotIn("sum + bill.totalCost", view)
        self.assertNotIn("sum + item.text + item.image + item.video + item.audio + item.music", view)

    def test_console_settlements_ui_has_retryable_load_state(self) -> None:
        skip_unless_console_settlements_package(self)
        view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-settlements"
            / "src"
            / "SettlementsView.tsx"
        ).read_text(encoding="utf-8")

        self.assertIn("BusinessStatePanel", view)
        self.assertIn("loadSettlementDashboard", view)
        self.assertIn("loadError", view)
        self.assertIn("onRetry={() => void loadSettlementDashboard()}", view)
        self.assertIn("await SettlementsService.fetchDashboardData", view)
        self.assertNotIn("SettlementsService.fetchDashboardData({ year: selectedYear }).then", view)

    def test_console_settlements_product_states_are_localized(self) -> None:
        skip_unless_console_settlements_package(self)
        view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-settlements"
            / "src"
            / "SettlementsView.tsx"
        ).read_text(encoding="utf-8")
        service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-settlements"
            / "src"
            / "settlementsService.ts"
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
            "console.settlements.states.loading",
            "console.settlements.states.loadingDescription",
            "console.settlements.states.loadErrorTitle",
            "console.settlements.states.loadErrorFallback",
            "console.settlements.states.emptyTitle",
            "console.settlements.states.emptyDescription",
        ]:
            self.assertIn(marker, view + service + i18n)
            self.assertGreaterEqual(i18n.count(f'"{marker}"'), 2)

        for hardcoded_copy in [
            "Loading settlement dashboard...",
            "Fetching settlement chart and bill data.",
            "Settlement dashboard could not be loaded",
            "Failed to load settlement dashboard.",
            "No settlement data found",
            "The selected year has no settlement chart or bill rows yet.",
            "Failed to fetch settlement dashboard",
        ]:
            self.assertNotIn(hardcoded_copy, view)
            self.assertNotIn(hardcoded_copy, service)

    def test_console_settlements_ui_is_read_only_until_command_contract_exists(self) -> None:
        skip_unless_console_settlements_package(self)
        view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-settlements"
            / "src"
            / "SettlementsView.tsx"
        ).read_text(encoding="utf-8")
        service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-settlements"
            / "src"
            / "settlementsService.ts"
        ).read_text(encoding="utf-8")
        contract = (
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        ).read_text(encoding="utf-8")
        settlement_operation_marker = (
            "  - route: /console/settlements\n"
            "    source: apps/sdkwork-clawrouter-pc/packages/"
            "sdkwork-clawrouter-pc-console-settlements/src/settlementsService.ts\n"
            "    operation: fetchDashboardData"
        )
        settlement_operation_start = contract.index(settlement_operation_marker)
        next_operation_start = contract.index("\n  - route:", settlement_operation_start + 1)
        settlement_operation_contract = contract[settlement_operation_start:next_operation_start]

        self.assertIn("SettlementsService.fetchDashboardData({ year: selectedYear })", view)
        self.assertNotIn("readOnlySettlementActions", view)
        self.assertNotIn("Read-only", view)
        self.assertNotIn("read-only", view)
        self.assertNotIn("command contract", view)
        self.assertIn("BusinessStatePanel", view)
        self.assertNotIn("trigger actual invoice viewing", view)
        self.assertNotIn("<Download", view)
        self.assertNotIn("<ExternalLink", view)
        for unsupported_action in [
            "exportStatements",
            "downloadStatement",
            "downloadInvoice",
            "viewInvoice",
            "handleExport",
            "handleInvoice",
            "static async export",
            "static async download",
            "static async viewInvoice",
        ]:
            self.assertNotIn(unsupported_action, view)
            self.assertNotIn(unsupported_action, service)
        self.assertIn("operation: fetchDashboardData", settlement_operation_contract)
        self.assertNotIn("operation: export", settlement_operation_contract)
        self.assertNotIn("operation: downloadStatement", settlement_operation_contract)
        self.assertNotIn("operation: viewInvoice", settlement_operation_contract)
        self.assertNotIn("operation: createSettlement", settlement_operation_contract)

    def test_console_settlements_uses_precise_sdk_response_contract(self) -> None:
        skip_unless_console_settlements_package(self)
        contract = (
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        ).read_text(encoding="utf-8")
        openapi = (
            ROOT / "generated" / "openapi" / "clawrouter-app-openapi.json"
        ).read_text(encoding="utf-8")
        sdk_billing = (
            ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "api" / "billing.ts"
        ).read_text(encoding="utf-8")
        service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-settlements"
            / "src"
            / "settlementsService.ts"
        ).read_text(encoding="utf-8")

        self.assertIn("name: SettlementDashboardResponse", contract)
        self.assertIn('"SettlementDashboardResponse"', openapi)
        self.assertIn('"SettlementsDashboardListResult"', openapi)
        self.assertIn('"$ref": "#/components/schemas/SettlementDashboardResponse"', openapi)
        self.assertIn("async list(params?: BillingSettlementsDashboardListParams): Promise<SettlementsDashboardListResult>", sdk_billing)
        self.assertIn("get<SettlementsDashboardListResult>", sdk_billing)

        response_path = ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "types" / "settlement-dashboard-response.ts"
        chart_path = ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "types" / "settlement-chart-point.ts"
        bill_path = ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "types" / "settlement-bill.ts"
        result_path = ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "types" / "settlements-dashboard-list-result.ts"
        self.assertTrue(response_path.exists())
        self.assertTrue(chart_path.exists())
        self.assertTrue(bill_path.exists())
        self.assertTrue(result_path.exists())
        self.assertIn("chartData: SettlementChartPoint[];", response_path.read_text(encoding="utf-8"))
        self.assertIn("bills: SettlementBill[];", response_path.read_text(encoding="utf-8"))
        self.assertIn("data?: SettlementDashboardResponse;", result_path.read_text(encoding="utf-8"))

        self.assertIn("SettlementDashboardResponse as SdkSettlementDashboardResponse", service)
        self.assertIn("day: SdkSettlementDashboardResponse['chartData'][number]['day'];", service)
        self.assertIn("breakdown: SdkSettlementDashboardResponse['bills'][number]['breakdown'];", service)


if __name__ == "__main__":
    unittest.main()
