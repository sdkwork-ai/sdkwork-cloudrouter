import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PORTAL_PACKAGES = ROOT / "apps" / "sdkwork-clawrouter-pc" / "packages"


class FrontendBusinessStateStandardTest(unittest.TestCase):
    def test_console_and_admin_business_packages_do_not_persist_business_state_in_browser_storage(
        self,
    ) -> None:
        forbidden_markers = ["localStorage", "sessionStorage"]
        allowed_paths = {
            "sdkwork-clawroutes-pc-commons/src/app-session-token.ts",
            "sdkwork-clawroutes-pc-commons/src/components/Navbar.tsx",
            "sdkwork-clawrouter-pc-i18n/src/index.ts",
            "sdkwork-clawrouter-pc-admin-shell/src/AdminHeader.tsx",
        }
        violations: list[str] = []

        for package_dir in sorted(PORTAL_PACKAGES.glob("sdkwork-clawrouter-*")):
            package_name = package_dir.name
            if not (
                package_name.startswith("sdkwork-clawrouter-pc-console-")
                or package_name.startswith("sdkwork-clawrouter-pc-admin-")
            ):
                continue
            for source in sorted((package_dir / "src").rglob("*")):
                if source.suffix not in {".ts", ".tsx"}:
                    continue
                relative = source.relative_to(PORTAL_PACKAGES).as_posix()
                if relative in allowed_paths:
                    continue
                content = source.read_text(encoding="utf-8")
                for marker in forbidden_markers:
                    if marker in content:
                        violations.append(f"{relative}: contains {marker}")

        self.assertEqual(
            [],
            violations,
            "Console/admin business state must be persisted through generated SDK-backed APIs, not browser storage.",
        )

    def test_business_state_components_are_centralized_and_used_by_core_business_tables(
        self,
    ) -> None:
        commons_index = PORTAL_PACKAGES / "sdkwork-clawroutes-pc-commons" / "src" / "index.ts"
        business_state_component = (
            PORTAL_PACKAGES
            / "sdkwork-clawroutes-pc-commons"
            / "src"
            / "components"
            / "BusinessState.tsx"
        )
        core_table_components = [
            PORTAL_PACKAGES
            / "sdkwork-clawrouter-pc-admin-group"
            / "src"
            / "index.tsx",
            ROOT
            / "data"
            / "sdkwork-models"
            / "apps"
            / "sdkwork-models-pc"
            / "packages"
            / "sdkwork-models-pc-admin-catalog"
            / "src"
            / "index.tsx",
            PORTAL_PACKAGES
            / "sdkwork-clawrouter-pc-admin-record"
            / "src"
            / "index.tsx",
            PORTAL_PACKAGES
            / "sdkwork-clawrouter-pc-admin-ratelimit"
            / "src"
            / "index.tsx",
            PORTAL_PACKAGES
            / "sdkwork-clawrouter-pc-admin-channel"
            / "src"
            / "index.tsx",
        ]
        panel_components = [
            PORTAL_PACKAGES
            / "sdkwork-clawrouter-pc-admin-monitor"
            / "src"
            / "index.tsx",
            PORTAL_PACKAGES
            / "sdkwork-clawrouter-pc-console-settings"
            / "src"
            / "SettingsView.tsx",
        ]

        self.assertTrue(
            business_state_component.exists(),
            "Commons must expose a shared commercial-grade business state component.",
        )
        business_state_source = business_state_component.read_text(encoding="utf-8")
        self.assertIn("export type BusinessStateKind", business_state_source)
        self.assertIn("loading", business_state_source)
        self.assertIn("error", business_state_source)
        self.assertIn("empty", business_state_source)
        self.assertIn("onRetry", business_state_source)
        self.assertIn("role=", business_state_source)

        commons_index_source = commons_index.read_text(encoding="utf-8")
        self.assertIn("components/BusinessState", commons_index_source)

        for component in core_table_components:
            if not component.exists():
                self.skipTest(f"missing relay admin component: {component}")
            source = component.read_text(encoding="utf-8")
            try:
                relative = component.relative_to(PORTAL_PACKAGES).as_posix()
            except ValueError:
                relative = component.relative_to(ROOT).as_posix()
            self.assertIn(
                "BusinessStateTableRow",
                source,
                f"{relative} must use shared table business states instead of bespoke table placeholders.",
            )
            self.assertIn(
                "load",
                source,
                f"{relative} must expose a retryable load function for business state errors.",
            )
            self.assertIn(
                "loadError",
                source,
                f"{relative} must preserve load failures in UI state instead of console-only handling.",
            )
            self.assertNotIn(
                '<Loader2 className="w-6 h-6 animate-spin',
                source,
                f"{relative} must not hand-roll table loading rows.",
            )
            if relative != "sdkwork-clawrouter-pc-admin-ratelimit/src/index.tsx":
                self.assertNotIn(
                    '<Loader2 className="w-8 h-8',
                    source,
                    f"{relative} must not hand-roll panel loading overlays for table data.",
                )

        for component in panel_components:
            if not component.exists():
                continue
            source = component.read_text(encoding="utf-8")
            relative = component.relative_to(PORTAL_PACKAGES).as_posix()
            self.assertIn(
                "BusinessStatePanel",
                source,
                f"{relative} must use shared panel business states instead of bespoke full-panel placeholders.",
            )
            self.assertIn(
                "load",
                source,
                f"{relative} must expose a retryable load function for panel business state errors.",
            )
            self.assertIn(
                "loadError",
                source,
                f"{relative} must preserve load failures in UI state instead of console-only handling.",
            )
            self.assertNotIn(
                '<Loader2 className="w-8 h-8',
                source,
                f"{relative} must not hand-roll full-panel loading indicators.",
            )


if __name__ == "__main__":
    unittest.main()
