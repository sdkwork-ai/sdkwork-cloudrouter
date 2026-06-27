import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class AdminPackageTypecheckStandardTest(unittest.TestCase):
    def test_all_admin_packages_are_explicit_esm_and_typechecked(self) -> None:
        packages_root = ROOT / "apps" / "sdkwork-clawrouter-pc" / "packages"
        admin_packages = sorted(
            package
            for package in packages_root.iterdir()
            if package.is_dir() and package.name.startswith("sdkwork-clawrouter-pc-admin-")
        )

        self.assertGreater(len(admin_packages), 0)
        for package in admin_packages:
            with self.subTest(package=package.name):
                manifest = json.loads((package / "package.json").read_text(encoding="utf-8"))
                self.assertEqual(manifest.get("type"), "module")
                self.assertEqual(manifest.get("scripts", {}).get("typecheck"), "tsc --noEmit")


if __name__ == "__main__":
    unittest.main()
