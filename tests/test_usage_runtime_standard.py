import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class UsageRuntimeStandardTest(unittest.TestCase):
    def test_usage_logs_backend_uses_exact_decimal_strings(self) -> None:
        usage_port = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "ports"
            / "usage_logs_read_store.rs"
        ).read_text(encoding="utf-8")
        postgres_store = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "postgres"
            / "usage_logs_read_store.rs"
        ).read_text(encoding="utf-8")
        postgres_admin_record_store = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "postgres"
            / "admin_record_store.rs"
        ).read_text(encoding="utf-8")

        for field in [
            "cost",
            "multiplier",
            "base_input_price",
            "base_output_price",
            "cache_read_price",
        ]:
            self.assertIn(f"pub {field}: String", usage_port)
            self.assertNotIn(f"pub {field}: f64", usage_port)

        for store in [postgres_store]:
            compact_store = " ".join(store.split())
            self.assertIn("DecimalValue", store)
            self.assertIn('"customer_charge_amount", USAGE_SPEND_DECIMAL_DIGITS, "usage log cost",', compact_store)
            self.assertIn('decimal_string_cell(&row, "rate_multiplier", 6, "usage log rate multiplier")?', compact_store)
            self.assertIn('"base_input_unit_price"', compact_store)
            self.assertIn('"usage log base input price"', compact_store)
            self.assertIn('"base_output_unit_price"', compact_store)
            self.assertIn('"usage log base output price"', compact_store)
            self.assertIn('"cache_read_unit_price"', compact_store)
            self.assertIn('"usage log cache read price"', compact_store)
            self.assertIn("fn decimal_value_string(", compact_store)
            self.assertIn("value: &str", compact_store)
            self.assertIn("digits: u32", compact_store)
            self.assertIn("field_name: &str", compact_store)
            self.assertIn("-> Result<String, DomainError>", compact_store)
            self.assertIn('format!("invalid {field_name}: {value}")', store)
            self.assertNotIn("DecimalValue::ZERO.to_fixed_string(digits)", store)
            self.assertNotIn("fn decimal_cell", store)
            self.assertNotIn("parse::<f64>()", store)

        for store in [postgres_admin_record_store]:
            compact_store = " ".join(store.split())
            self.assertIn("DecimalValue", store)
            self.assertIn('"customer_charge_amount", 6, "admin record customer charge",', compact_store)
            self.assertIn("multiplier: decimal_string_cell(", compact_store)
            self.assertIn('"rate_multiplier"', compact_store)
            self.assertIn('"admin record rate multiplier"', compact_store)
            self.assertIn("base_input_price: decimal_string_cell(", compact_store)
            self.assertIn('"base_input_unit_price"', compact_store)
            self.assertIn('"admin record base input price"', compact_store)
            self.assertIn("base_output_price: decimal_string_cell(", compact_store)
            self.assertIn('"base_output_unit_price"', compact_store)
            self.assertIn('"admin record base output price"', compact_store)
            self.assertIn("cache_read_price: decimal_string_cell(", compact_store)
            self.assertIn('"cache_read_unit_price"', compact_store)
            self.assertIn('"admin record cache read price"', compact_store)
            self.assertIn("fn decimal_value_string(", compact_store)
            self.assertIn("value: &str", compact_store)
            self.assertIn("digits: u32", compact_store)
            self.assertIn("field_name: &str", compact_store)
            self.assertIn("-> Result<String, DomainError>", compact_store)
            self.assertIn('format!("invalid {field_name}: {value}")', store)
            self.assertNotIn("DecimalValue::ZERO.to_fixed_string(digits)", store)
            self.assertNotIn("fn decimal_cell", store)
            self.assertNotIn("parse::<f64>()", store)

    def test_usage_logs_frontend_uses_exact_decimal_strings(self) -> None:
        usage_service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-usage"
            / "src"
            / "usageService.ts"
        ).read_text(encoding="utf-8")
        usage_sdk_type = (
            ROOT
            / "sdks"
            / "clawrouter-app-sdk"
            / "clawrouter-app-sdk-typescript"
            / "src"
            / "types"
            / "usage-log-item.ts"
        ).read_text(encoding="utf-8")
        usage_view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-usage"
            / "src"
            / "UsageView.tsx"
        ).read_text(encoding="utf-8")
        record_service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-record"
            / "src"
            / "recordService.ts"
        ).read_text(encoding="utf-8")
        record_view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-record"
            / "src"
            / "index.tsx"
        ).read_text(encoding="utf-8")

        for service in [usage_sdk_type, record_service]:
            for field in ["cost", "multiplier", "baseInputPrice", "baseOutputPrice", "cacheReadPrice"]:
                self.assertIn(f"{field}: string", service)
                self.assertNotIn(f"{field}: number", service)

        for service in [usage_service, record_service]:
            for field in ["cost", "multiplier", "baseInputPrice", "baseOutputPrice", "cacheReadPrice"]:
                self.assertNotIn(f"readNumber(item, '{field}')", service)
            self.assertIn("readDecimalString", service)

        self.assertIn("export type UsageLog = SdkUsageLogItem", usage_service)

        for view in [usage_view, record_view]:
            self.assertNotIn(".cost.toFixed(6)", view)
            self.assertNotIn(".baseInputPrice.toFixed(6)", view)
            self.assertNotIn(".baseOutputPrice.toFixed(6)", view)
            self.assertNotIn(".cacheReadPrice.toFixed(6)", view)
            self.assertNotIn("sum + log.cost", view)

        self.assertIn("formatLocalizedDecimalAmount(", usage_view)
        self.assertIn("usageLogs.map(log => log.cost)", usage_view)
        self.assertIn("SPEND_DECIMAL_DIGITS", usage_view)
        self.assertNotIn("toSafeNumber(log.cost)", usage_view)
        self.assertIn("formatDecimalAmount(", record_view)
        self.assertIn("sumDecimalStrings(logs.map(log => log.cost), 6)", record_view)
        self.assertNotIn("Number(log.cost)", record_view)


if __name__ == "__main__":
    unittest.main()
