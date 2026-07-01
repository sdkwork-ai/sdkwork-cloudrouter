"""Relay-only guard: retired commerce/platform admin surfaces must not return to Claw Router."""

from __future__ import annotations

import re
import unittest
from pathlib import Path

from tools.frontend_contract_loader import load_frontend_field_contract
from tools.relay_retired_admin_surfaces import (
    RELAY_RETIRED_ADMIN_PACKAGE_SEGMENTS,
    RELAY_RETIRED_ADMIN_PORTAL_ROUTE_PREFIXES,
    is_relay_retired_admin_operation_route,
    is_relay_retired_admin_portal_route,
)


ROOT = Path(__file__).resolve().parents[1]
PORTAL_ROOT = ROOT / "apps" / "sdkwork-clawrouter-pc"
APP_TSX = PORTAL_ROOT / "src" / "App.tsx"
REGISTRY = PORTAL_ROOT / "packages" / "sdkwork-clawrouter-pc-admin-shell" / "src" / "adminModuleRegistry.ts"
PACKAGES_ROOT = PORTAL_ROOT / "packages"


def _extract_admin_route_block(app_source: str) -> str:
    match = re.search(
        r'<Route path="/admin"[^>]*>.*?</Route>\s*\n\s*<Route path="\*"',
        app_source,
        flags=re.DOTALL,
    )
    assert match is not None, "App.tsx must declare an /admin route block"
    return match.group(0)


class RelayRetiredAdminSurfacesStandardTest(unittest.TestCase):
    def test_retired_admin_packages_are_not_present_in_portal_workspace(self) -> None:
        for segment in RELAY_RETIRED_ADMIN_PACKAGE_SEGMENTS:
            package_dir = PACKAGES_ROOT / segment
            self.assertFalse(
                package_dir.exists(),
                f"retired admin package must not exist: {segment}",
            )

    def test_app_router_does_not_mount_retired_admin_portal_routes(self) -> None:
        app_source = APP_TSX.read_text(encoding="utf-8")
        admin_block = _extract_admin_route_block(app_source)
        for prefix in RELAY_RETIRED_ADMIN_PORTAL_ROUTE_PREFIXES:
            segment = prefix.removeprefix("/admin/")
            self.assertNotIn(
                f'path="{segment}"',
                admin_block,
                f"admin route block must not mount retired route {prefix}",
            )
            self.assertNotIn(
                f"path='{segment}'",
                admin_block,
                f"admin route block must not mount retired route {prefix}",
            )

    def test_admin_module_registry_excludes_retired_portal_routes(self) -> None:
        registry_source = REGISTRY.read_text(encoding="utf-8")
        registry_paths = set(re.findall(r"'(/admin/[^']+)'", registry_source))
        retired = [path for path in registry_paths if is_relay_retired_admin_portal_route(path)]
        self.assertEqual([], retired, "admin module registry must be relay-only")

    def test_frontend_field_contract_excludes_retired_admin_operation_routes(self) -> None:
        contract = load_frontend_field_contract(ROOT)
        retired: list[str] = []
        for operation in contract.get("frontend_operations", []):
            if not isinstance(operation, dict):
                continue
            route = str(operation.get("route", ""))
            if is_relay_retired_admin_operation_route(route):
                retired.append(route)
        self.assertEqual([], sorted(set(retired)))


if __name__ == "__main__":
    unittest.main()
