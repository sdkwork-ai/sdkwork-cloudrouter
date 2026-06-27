import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class AdminDestructiveActionStandardTest(unittest.TestCase):
    def test_admin_destructive_actions_use_shared_confirm_dialog_instead_of_window_confirm(self) -> None:
        package_roots = [
            "sdkwork-clawrouter-pc-admin-announcement",
            "sdkwork-clawrouter-pc-admin-channel",
            "sdkwork-clawrouter-pc-admin-group",
            "sdkwork-clawrouter-pc-admin-marketing",
            "sdkwork-clawrouter-pc-admin-relay-site",
            "sdkwork-clawrouter-pc-admin-ratelimit",
        ]
        base = ROOT / "apps" / "sdkwork-clawrouter-pc" / "packages"

        for package in package_roots:
            with self.subTest(package=package):
                source_name = "siteAdmin.tsx" if package == "sdkwork-clawrouter-pc-admin-relay-site" else "index.tsx"
                index_path = base / package / "src" / source_name
                if not index_path.exists():
                    self.skipTest(f"{package} removed from claw router PC surface")
                source = index_path.read_text(encoding="utf-8")
                self.assertNotIn("window.confirm", source)
                self.assertNotIn(".confirm(", source)
                self.assertIn("ConfirmDialog", source)
                self.assertIn("role=\"alertdialog\"", (
                    base
                    / "sdkwork-clawroutes-pc-commons"
                    / "src"
                    / "components"
                    / "ConfirmDialog.tsx"
                ).read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
