import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PORTAL_ROOT = ROOT / "apps" / "sdkwork-clawrouter-pc"
APP = PORTAL_ROOT / "src" / "App.tsx"
REGISTRY = PORTAL_ROOT / "packages" / "sdkwork-clawrouter-pc-admin-shell" / "src" / "adminModuleRegistry.ts"


def _collect_registry_paths(source: str) -> set[str]:
    return set(re.findall(r"'(/admin/[^']+)'", source))


def _collect_app_route_paths(source: str) -> set[str]:
    paths: set[str] = set()
    for match in re.finditer(r'<Route\s+path="([^"]+)"', source):
        route_path = match.group(1)
        if route_path == "*":
            continue
        paths.add(f"/admin/{route_path}")
    return paths


class AdminRouteRegistryRuntimeStandardTest(unittest.TestCase):
    def test_admin_registry_menu_paths_are_mounted_in_app_router(self) -> None:
        app_source = APP.read_text(encoding="utf-8")
        registry_source = REGISTRY.read_text(encoding="utf-8")
        registry_paths = _collect_registry_paths(registry_source)
        app_paths = _collect_app_route_paths(app_source)

        required_prefixes = [
            "/admin/storage",
            "/admin/drive",
            "/admin/agents",
            "/admin/skill",
        ]
        for required_prefix in required_prefixes:
            matching_registry_paths = [
                path
                for path in registry_paths
                if path == required_prefix or path.startswith(f"{required_prefix}/")
            ]
            self.assertTrue(
                matching_registry_paths,
                f"admin module registry is missing menu path for {required_prefix}",
            )
            for registry_path in matching_registry_paths:
                if registry_path in app_paths:
                    continue
                covered = any(
                    app_path == registry_path or registry_path.startswith(f"{app_path}/")
                    for app_path in app_paths
                )
                self.assertTrue(
                    covered,
                    f"App.tsx is missing a route mount for registry path {registry_path}",
                )


if __name__ == "__main__":
    unittest.main()
