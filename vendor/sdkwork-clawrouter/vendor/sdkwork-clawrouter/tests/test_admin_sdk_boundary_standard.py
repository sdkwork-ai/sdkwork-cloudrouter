import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PORTAL_ROOT = ROOT / "apps" / "sdkwork-clawrouter-pc"
PACKAGES_ROOT = PORTAL_ROOT / "packages"
SPECS_ROOT = ROOT.parent / "sdkwork-specs"

BACKEND_SDK_MARKERS = (
    "@sdkwork/clawrouter-backend-sdk",
    "@sdkwork/iam-backend-sdk",
    "getClawRouterBackendSdkClient",
    "getSdkworkAppbaseBackendSdkClient",
    "createClawRouterBackendSdkClient",
    "createSdkworkAppbaseBackendSdkClient",
    "VITE_CLAWROUTER_BACKEND_API_BASE_URL",
    "VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL",
)

COMMONS_BACKEND_RUNTIME_BOUNDARIES = {
    Path("sdkwork-clawroutes-pc-commons/src/sdk-clients.ts"),
    Path("sdkwork-clawroutes-pc-commons/src/runtime.ts"),
    Path("sdkwork-clawroutes-pc-commons/src/portal-session.ts"),
}


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def read_json(path: Path) -> dict:
    return json.loads(read_text(path))


def source_files() -> list[Path]:
    roots = [PORTAL_ROOT / "src", PACKAGES_ROOT]
    files: list[Path] = []
    for root in roots:
        for pattern in ("*.ts", "*.tsx", "*.mts", "*.mjs"):
            files.extend(root.rglob(pattern))
    return sorted(
        path
        for path in files
        if "node_modules" not in path.parts
        and "dist" not in path.parts
        and not path.name.endswith(".d.ts")
    )


def package_relative_source_path(path: Path) -> Path | None:
    try:
        return path.relative_to(PACKAGES_ROOT)
    except ValueError:
        return None


def is_admin_package_source(path: Path) -> bool:
    relative = package_relative_source_path(path)
    return relative is not None and relative.parts[0].startswith("sdkwork-clawrouter-pc-admin-")


def is_allowed_runtime_boundary(path: Path) -> bool:
    relative = package_relative_source_path(path)
    return relative in COMMONS_BACKEND_RUNTIME_BOUNDARIES


def source_contains_backend_sdk_marker(source: str) -> bool:
    return any(marker in source for marker in BACKEND_SDK_MARKERS)


class AdminSdkBoundaryStandardTest(unittest.TestCase):
    def test_backend_sdk_usage_stays_inside_backend_admin_boundaries(self) -> None:
        violations: list[str] = []

        for path in source_files():
            source = read_text(path)
            if not source_contains_backend_sdk_marker(source):
                continue
            if is_admin_package_source(path) or is_allowed_runtime_boundary(path):
                continue
            violations.append(path.relative_to(ROOT).as_posix())

        self.assertEqual(
            [],
            violations,
            "Backend SDK and appbase backend SDK imports must stay in backend-admin packages "
            "or the approved SDK runtime bootstrap boundary.",
        )

    def test_admin_package_component_specs_declare_backend_admin_surface(self) -> None:
        violations: list[str] = []

        for package_root in sorted(PACKAGES_ROOT.glob("sdkwork-clawrouter-pc-admin-*")):
            spec_path = package_root / "specs" / "component.spec.json"
            if not spec_path.exists():
                violations.append(f"{package_root.relative_to(ROOT).as_posix()}: missing component spec")
                continue
            spec = read_json(spec_path)
            component = spec.get("component", {})
            if component.get("surface") != "backend-admin":
                violations.append(f"{spec_path.relative_to(ROOT).as_posix()}: component.surface must be backend-admin")

        self.assertEqual([], violations)

    def test_specs_define_backend_admin_package_boundary_and_common_sdk_root(self) -> None:
        expectations = {
            "APP_SDK_INTEGRATION_SPEC.md": [
                "backend-admin package boundary",
                "route path is not a surface classification",
                "one common SDK root",
            ],
            "COMPONENT_SPEC.md": [
                "component.surface",
                "backend-admin",
                "pc-admin",
            ],
            "CONFIG_SPEC.md": [
                "one browser-visible public SDK root",
                "per-surface or per-SDK public override keys",
            ],
            "SDK_SPEC.md": [
                "backend-admin package boundaries",
                "MUST NOT silently inherit the product app SDK or backend SDK base URL",
            ],
        }

        for filename, markers in expectations.items():
            source = read_text(SPECS_ROOT / filename)
            with self.subTest(filename=filename):
                for marker in markers:
                    self.assertIn(marker, source)

    def test_portal_session_backend_access_check_is_narrowly_scoped(self) -> None:
        source = read_text(PACKAGES_ROOT / "sdkwork-clawroutes-pc-commons" / "src" / "portal-session.ts")
        self.assertIn("getClawRouterBackendSdkClient", source)
        self.assertIn("backendClient.system.installation.status.retrieve()", source)

        forbidden_business_namespaces = (
            ".platform.",
            ".commerce.",
            ".ecosystem.",
            ".iam.",
            ".serviceProviders.",
        )
        for namespace in forbidden_business_namespaces:
            with self.subTest(namespace=namespace):
                self.assertNotIn(namespace, source)

if __name__ == "__main__":
    unittest.main()
