from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class OpenApiDynamicSchemaSourceTest(unittest.TestCase):
    def test_rust_openapi_schemas_are_generated_into_cargo_build_output(self) -> None:
        build_script = ROOT / "crates" / "sdkwork-claw-http" / "build.rs"
        contract_routes = ROOT / "crates" / "sdkwork-claw-http" / "src" / "contract_routes.rs"

        self.assertTrue(
            build_script.exists(),
            "sdkwork-claw-http must generate OpenAPI schemas during cargo build",
        )
        build_source = build_script.read_text(encoding="utf-8")
        self.assertIn("tools.clawrouter_gateway_openapi_generator", build_source)
        self.assertIn("tools.clawrouter_openapi_generator", build_source)
        self.assertIn("OUT_DIR", build_source)
        self.assertIn("frontend-field-contracts", build_source)
        self.assertIn("index.yaml", build_source)
        self.assertIn("operations", build_source)
        self.assertIn("models", build_source)
        self.assertIn("routes", build_source)
        self.assertIn("shared", build_source)
        for schema_name in (
            "gateway-openapi.json",
            "clawrouter-app-openapi.json",
            "clawrouter-backend-openapi.json",
        ):
            self.assertIn(schema_name, build_source)

        route_source = contract_routes.read_text(encoding="utf-8")
        self.assertNotIn("apps/sdkwork-clawrouter-pc/public/openapi.json", route_source)
        self.assertNotIn("../../../generated/openapi/clawrouter-app-openapi.json", route_source)
        self.assertNotIn("../../../generated/openapi/clawrouter-backend-openapi.json", route_source)
        self.assertIn('env!("OUT_DIR")', route_source)
        for schema_name in (
            "gateway-openapi.json",
            "clawrouter-app-openapi.json",
            "clawrouter-backend-openapi.json",
        ):
            self.assertIn(schema_name, route_source)


if __name__ == "__main__":
    unittest.main()
