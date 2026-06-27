import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class AdminDashboardRuntimeStandardTest(unittest.TestCase):
    def test_admin_dashboard_chart_components_use_typed_props(self) -> None:
        view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-dashboard"
            / "src"
            / "index.tsx"
        ).read_text(encoding="utf-8")

        for token in [
            "type ChartPayloadEntry",
            "type CustomTooltipProps",
            "type CustomPieLegendProps",
            "const CustomTooltip = ({ active, payload = [], label }: CustomTooltipProps)",
            "const CustomPieLegend = ({ payload = [], unit }: CustomPieLegendProps)",
        ]:
            self.assertIn(token, view)

        self.assertNotIn(": any", view)
        self.assertNotIn("as any", view)
        self.assertNotIn("payload.map((entry: any", view)


if __name__ == "__main__":
    unittest.main()
