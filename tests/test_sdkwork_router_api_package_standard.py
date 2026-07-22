import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPECS_ROOT = ROOT.parent / "sdkwork-specs"


class SdkworkRouterApiPackageStandardTest(unittest.TestCase):
    def test_root_specs_use_router_route_package_naming(self) -> None:
        spec_files = [
            "README.md",
            "NAMING_SPEC.md",
            "API_SPEC.md",
            "WEB_BACKEND_SPEC.md",
            "RUST_CODE_SPEC.md",
            "SDK_SPEC.md",
            "SDK_WORKSPACE_GENERATION_SPEC.md",
            "APPLICATION_SPEC.md",
            "APP_SDK_INTEGRATION_SPEC.md",
            "COMPONENT_SPEC.md",
            "TEST_SPEC.md",
        ]

        for spec_file in spec_files:
            source = (SPECS_ROOT / spec_file).read_text(encoding="utf-8")
            with self.subTest(spec=spec_file):
                self.assertIn("sdkwork-routes-", source)

    def test_router_api_packages_are_declared_as_workspace_route_crates(self) -> None:
        cargo_toml = (ROOT / "Cargo.toml").read_text(encoding="utf-8")
        expected_packages = [
            "sdkwork-routes-clawrouter-llm-open-api",
            "sdkwork-routes-payment-open-api",
            "sdkwork-routes-image-open-api",
            "sdkwork-routes-video-open-api",
            "sdkwork-routes-audio-open-api",
            "sdkwork-routes-clawrouter-drive-open-api",
            "sdkwork-routes-clawrouter-knowledgebase-open-api",
            "sdkwork-routes-clawrouter-memory-open-api",
            "sdkwork-routes-agent-open-api",
            "sdkwork-routes-iaas-open-api",
            "sdkwork-routes-paas-open-api",
            "sdkwork-routes-clawrouter-app-api",
            "sdkwork-routes-clawrouter-backend-api",
        ]

        for package_name in expected_packages:
            with self.subTest(package=package_name):
                package_root = ROOT / "crates" / package_name
                cargo_manifest = package_root / "Cargo.toml"
                self.assertTrue(cargo_manifest.exists(), f"{package_name} must be a Rust package")
                self.assertIn(f'"crates/{package_name}"', cargo_toml)
                self.assertNotIn(f'"packages/{package_name}"', cargo_toml)
                self.assertIn(f'name = "{package_name}"', cargo_manifest.read_text(encoding="utf-8"))
                self.assertTrue((package_root / "src" / "lib.rs").exists())
                self.assertTrue((package_root / "src" / "manifest.rs").exists())
                self.assertFalse(
                    (ROOT / "packages" / package_name).exists(),
                    f"{package_name} must not remain under top-level packages/",
                )
                self.assertTrue((package_root / "specs" / "README.md").exists())
                self.assertTrue((package_root / "specs" / "component.spec.json").exists())

    def test_router_api_route_crates_have_component_specs(self) -> None:
        expected_packages = [
            "sdkwork-routes-clawrouter-llm-open-api",
            "sdkwork-routes-payment-open-api",
            "sdkwork-routes-image-open-api",
            "sdkwork-routes-video-open-api",
            "sdkwork-routes-audio-open-api",
            "sdkwork-routes-clawrouter-drive-open-api",
            "sdkwork-routes-clawrouter-knowledgebase-open-api",
            "sdkwork-routes-clawrouter-memory-open-api",
            "sdkwork-routes-agent-open-api",
            "sdkwork-routes-iaas-open-api",
            "sdkwork-routes-paas-open-api",
            "sdkwork-routes-clawrouter-app-api",
            "sdkwork-routes-clawrouter-backend-api",
        ]

        for package_name in expected_packages:
            spec_path = ROOT / "crates" / package_name / "specs" / "component.spec.json"
            with self.subTest(package=package_name):
                spec = json.loads(spec_path.read_text(encoding="utf-8"))
                self.assertEqual(spec["kind"], "sdkwork.component.spec")
                self.assertEqual(spec["component"]["name"], package_name)
                self.assertEqual(spec["component"]["type"], "rust-route-crate")
                self.assertEqual(spec["component"]["root"], f"sdkwork-clawrouter/crates/{package_name}")
                self.assertEqual(spec["component"]["languages"], ["rust"])
                canonical_specs = {entry["file"] for entry in spec["canonicalSpecs"]}
                self.assertIn("API_SPEC.md", canonical_specs)
                self.assertIn("SDK_WORKSPACE_GENERATION_SPEC.md", canonical_specs)
                self.assertIn("TEST_SPEC.md", canonical_specs)
                self.assertIn("RUST_CODE_SPEC.md", canonical_specs)
                self.assertEqual(spec["contracts"]["routeManifest"], "src/manifest.rs")
                self.assertEqual(spec["contracts"]["sdkClients"], [])
                self.assertEqual(spec["contracts"]["dependencyApiExports"], [])

    def test_app_and_backend_route_crates_expose_executable_router_builders(self) -> None:
        expected = {
            "sdkwork-routes-clawrouter-app-api": [
                "src/routes.rs#build_sdkwork_claw_router_app_api_router",
                "src/routes.rs#build_sdkwork_claw_router_app_api_router_from_env",
            ],
            "sdkwork-routes-clawrouter-backend-api": [
                "src/routes.rs#build_sdkwork_claw_router_backend_api_router",
                "src/routes.rs#build_sdkwork_claw_router_backend_api_router_from_env",
            ],
        }

        for package_name, runtime_entrypoints in expected.items():
            package_root = ROOT / "crates" / package_name
            cargo_manifest = (package_root / "Cargo.toml").read_text(encoding="utf-8")
            lib_source = (package_root / "src" / "lib.rs").read_text(encoding="utf-8")
            routes_source = (package_root / "src" / "routes.rs").read_text(encoding="utf-8")
            spec = json.loads((package_root / "specs" / "component.spec.json").read_text(encoding="utf-8"))

            with self.subTest(package=package_name):
                self.assertIn("axum.workspace = true", cargo_manifest)
                self.assertIn("sdkwork-claw-config.workspace = true", cargo_manifest)
                self.assertIn("sdkwork-clawrouter-router-service.workspace = true", cargo_manifest)
                self.assertIn("pub mod routes;", lib_source)
                for runtime_entrypoint in runtime_entrypoints:
                    self.assertIn(runtime_entrypoint, spec["contracts"]["runtimeEntrypoints"])
                for runtime_entrypoint in runtime_entrypoints:
                    function_name = runtime_entrypoint.split("#", 1)[1]
                    self.assertRegex(routes_source, rf"pub (?:async )?fn {re.escape(function_name)}")
                self.assertIn("Router", routes_source)

    def test_gateway_mounts_claw_apis_through_route_crates_not_service_crates(self) -> None:
        gateway_manifest = (ROOT / "crates" / "sdkwork-clawrouter-edge-runtime" / "Cargo.toml").read_text(
            encoding="utf-8",
        )
        gateway_runtime = (ROOT / "crates" / "sdkwork-clawrouter-edge-runtime" / "src" / "runtime.rs").read_text(
            encoding="utf-8",
        )

        self.assertIn("sdkwork-routes-clawrouter-app-api.workspace = true", gateway_manifest)
        self.assertIn("sdkwork-routes-clawrouter-backend-api.workspace = true", gateway_manifest)
        self.assertNotIn("sdkwork-clawrouter-app-api-server.workspace = true", gateway_manifest)
        self.assertNotIn("sdkwork-clawrouter-admin-api-server.workspace = true", gateway_manifest)
        self.assertIn("sdkwork_routes_clawrouter_app_api::", gateway_runtime)
        self.assertIn("sdkwork_routes_clawrouter_backend_api::", gateway_runtime)
        self.assertNotIn("sdkwork_clawrouter_app_api_server::", gateway_runtime)
        self.assertNotIn("sdkwork_clawrouter_admin_api_server::", gateway_runtime)

    def test_edge_runtime_embeds_claw_api_route_crates_and_dependency_router(self) -> None:
        gateway_runtime = (ROOT / "crates" / "sdkwork-clawrouter-edge-runtime" / "src" / "runtime.rs").read_text(
            encoding="utf-8",
        )
        edge_server = (ROOT / "crates" / "sdkwork-clawrouter-edge-runtime" / "src" / "edge_server.rs").read_text(
            encoding="utf-8",
        )

        self.assertIn("sdkwork_routes_clawrouter_app_api::", gateway_runtime)
        self.assertIn("sdkwork_routes_clawrouter_backend_api::", gateway_runtime)
        self.assertIn("with_dependency_api_router", edge_server)
        self.assertIn("dependency_api_path(path)", edge_server)

    def test_clawrouter_open_api_adapters_keep_clawrouter_authority_mapping(self) -> None:
        expected_mappings = {
            "sdkwork-routes-clawrouter-drive-open-api": (
                "sdkwork-clawrouter.drive-open-api",
                "clawrouter-open-sdk",
            ),
            "sdkwork-routes-clawrouter-knowledgebase-open-api": (
                "sdkwork-clawrouter.knowledgebase-open-api",
                "clawrouter-open-sdk",
            ),
            "sdkwork-routes-clawrouter-llm-open-api": (
                "sdkwork-clawrouter.llm-open-api",
                "clawrouter-open-sdk",
            ),
            "sdkwork-routes-clawrouter-memory-open-api": (
                "sdkwork-clawrouter.memory-open-api",
                "clawrouter-open-sdk",
            ),
        }

        for package_name, (api_authority, sdk_family) in expected_mappings.items():
            manifest = (ROOT / "crates" / package_name / "src" / "manifest.rs").read_text(
                encoding="utf-8",
            )
            with self.subTest(package=package_name):
                self.assertIn(f'pub const API_AUTHORITY: &str = "{api_authority}";', manifest)
                self.assertIn(f'pub const SDK_FAMILY: &str = "{sdk_family}";', manifest)
                self.assertIn("sdkwork-clawrouter.", manifest)


if __name__ == "__main__":
    unittest.main()
