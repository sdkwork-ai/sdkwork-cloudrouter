import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PORTAL = ROOT / "apps" / "sdkwork-clawrouter-pc"
COMMONS = PORTAL / "packages" / "sdkwork-clawroutes-pc-commons" / "src"


class FrontendDecimalRuntimeStandardTest(unittest.TestCase):
    def test_commons_exports_single_exact_decimal_runtime(self) -> None:
        decimal_runtime = (COMMONS / "decimal.ts").read_text(encoding="utf-8")
        commons_index = (COMMONS / "index.ts").read_text(encoding="utf-8")
        runtime_index = (COMMONS / "runtime.ts").read_text(encoding="utf-8")

        self.assertIn("export function readDecimalString", decimal_runtime)
        self.assertIn("export function sumDecimalStrings", decimal_runtime)
        self.assertIn("export function formatDecimalAmount", decimal_runtime)
        self.assertIn("export function decimalNumber", decimal_runtime)
        self.assertIn("bigint", decimal_runtime)
        self.assertNotIn("Number.isSafeInteger", decimal_runtime)
        self.assertIn("export * from './decimal.ts';", runtime_index)
        self.assertNotIn("export * from './decimal';", commons_index)

    def test_money_sensitive_frontends_use_shared_decimal_runtime(self) -> None:
        usage_service = (
            PORTAL
            / "packages"
            / "sdkwork-clawrouter-pc-console-usage"
            / "src"
            / "usageService.ts"
        ).read_text(encoding="utf-8")
        record_service = (
            PORTAL
            / "packages"
            / "sdkwork-clawrouter-pc-admin-record"
            / "src"
            / "recordService.ts"
        ).read_text(encoding="utf-8")
        settlements_service_path = (
            PORTAL
            / "packages"
            / "sdkwork-clawrouter-pc-console-settlements"
            / "src"
            / "settlementsService.ts"
        )
        settlements_view_path = (
            PORTAL
            / "packages"
            / "sdkwork-clawrouter-pc-console-settlements"
            / "src"
            / "SettlementsView.tsx"
        )
        usage_view = (
            PORTAL
            / "packages"
            / "sdkwork-clawrouter-pc-console-usage"
            / "src"
            / "UsageView.tsx"
        ).read_text(encoding="utf-8")
        record_view = (
            PORTAL / "packages" / "sdkwork-clawrouter-pc-admin-record" / "src" / "index.tsx"
        ).read_text(encoding="utf-8")

        services = [usage_service, record_service]
        if settlements_service_path.exists():
            services.append(settlements_service_path.read_text(encoding="utf-8"))

        for service in services:
            self.assertIn("readDecimalString,", service)
            self.assertNotIn("function readDecimalString", service)
            self.assertNotIn("function formatDecimalString", service)

        self.assertIn("formatDecimalAmount", usage_view)
        self.assertTrue(
            "from 'sdkwork-clawroutes-pc-commons/runtime'" in usage_view
            or "from '@sdkwork/clawroutes-pc-commons/runtime'" in usage_view,
            "usage view must import decimal helpers from commons runtime",
        )
        self.assertIn("formatDecimalAmount", record_view)
        self.assertTrue(
            "from 'sdkwork-clawroutes-pc-commons/runtime'" in record_view
            or "from '@sdkwork/clawroutes-pc-commons/runtime'" in record_view,
            "record view must import decimal helpers from commons runtime",
        )
        views = [usage_view, record_view]
        if settlements_view_path.exists():
            settlements_view = settlements_view_path.read_text(encoding="utf-8")
            self.assertIn("formatDecimalAmount", settlements_view)
            self.assertIn("sumDecimalStrings", settlements_view)
            self.assertIn("decimalNumber", settlements_view)
            self.assertTrue(
                "from 'sdkwork-clawroutes-pc-commons/runtime'" in settlements_view
                or "from '@sdkwork/clawroutes-pc-commons/runtime'" in settlements_view,
                "settlements view must import decimal helpers from commons runtime",
            )
            views.append(settlements_view)

        for view in views:
            self.assertNotIn("function decimalUnits", view)
            self.assertNotIn("function formatDecimalUnits", view)
            self.assertNotIn("function formatDecimalAmount", view)


if __name__ == "__main__":
    unittest.main()
