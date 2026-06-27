import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PORTAL_ROOT = ROOT / "apps" / "sdkwork-clawrouter-pc"


class ConsoleProvidersBackendRuntimeStandardTest(unittest.TestCase):
    def test_local_console_providers_module_is_retired(self) -> None:
        package_dir = PORTAL_ROOT / "packages" / "sdkwork-clawrouter-pc-console-providers"
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
        self.assertNotIn("sdkwork-clawrouter-pc-console-providers", app_source)
        self.assertNotIn('path="providers"', app_source)
        self.assertNotIn("/console/providers", menu_source)
        self.assertNotIn("console.menu.providers", menu_source)
        self.assertNotIn("sdkwork-clawrouter-pc-console-providers", package_json.get("dependencies", {}))

    def test_console_providers_retirement_is_reflected_in_schema_governance(self) -> None:
        schema_sources = [
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "index.yaml",
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "routes" / "routes.yaml",
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml",
            ROOT / "docs" / "schema-registry" / "frontend-route-classification.yaml",
        ]

        for schema_source in schema_sources:
            source = schema_source.read_text(encoding="utf-8")
            with self.subTest(schema_source=schema_source.relative_to(ROOT).as_posix()):
                self.assertNotIn("/console/providers", source)
                self.assertNotIn("sdkwork-clawrouter-pc-console-providers", source)
                self.assertNotIn("console-providers.yaml", source)
