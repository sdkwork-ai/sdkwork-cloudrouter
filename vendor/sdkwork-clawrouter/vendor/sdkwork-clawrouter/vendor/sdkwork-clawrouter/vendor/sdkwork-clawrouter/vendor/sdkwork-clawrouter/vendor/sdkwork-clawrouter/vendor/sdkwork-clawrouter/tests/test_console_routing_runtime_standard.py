import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PORTAL_ROOT = ROOT / "apps" / "sdkwork-clawrouter-pc"


class ConsoleRoutingRuntimeStandardTest(unittest.TestCase):
    def test_local_console_routing_module_is_retired(self) -> None:
        package_dir = PORTAL_ROOT / "packages" / "sdkwork-clawrouter-pc-console-routing"
        app_source = (PORTAL_ROOT / "src" / "App.tsx").read_text(encoding="utf-8")
        menu_source = (
            PORTAL_ROOT
            / "packages"
            / "sdkwork-clawrouter-pc-console-core"
            / "src"
            / "ConsoleLayout.tsx"
        ).read_text(encoding="utf-8")
        package_json = json.loads((PORTAL_ROOT / "package.json").read_text(encoding="utf-8"))

        self.assertFalse(package_dir.exists())
        self.assertNotIn("sdkwork-clawrouter-pc-console-routing", app_source)
        self.assertNotIn('path="routing"', app_source)
        self.assertNotIn("/console/routing", menu_source)
        self.assertNotIn("console.menu.routing", menu_source)
        self.assertNotIn("sdkwork-clawrouter-pc-console-routing", package_json.get("dependencies", {}))

    def test_console_routing_retirement_is_reflected_in_schema_governance(self) -> None:
        schema_sources = [
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "index.yaml",
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "routes" / "routes.yaml",
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml",
            ROOT / "docs" / "schema-registry" / "frontend-route-classification.yaml",
        ]

        for schema_source in schema_sources:
            source = schema_source.read_text(encoding="utf-8")
            with self.subTest(schema_source=schema_source.relative_to(ROOT).as_posix()):
                self.assertNotIn("/console/routing", source)
                self.assertNotIn("sdkwork-clawrouter-pc-console-routing", source)
                self.assertNotIn("console-routing.yaml", source)
