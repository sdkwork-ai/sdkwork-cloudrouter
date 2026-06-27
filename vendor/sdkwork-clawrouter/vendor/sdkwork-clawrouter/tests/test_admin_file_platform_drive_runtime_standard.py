import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DRIVE_PACKAGE = (
    ROOT
    / "apps"
    / "sdkwork-clawrouter-pc"
    / "packages"
    / "sdkwork-clawrouter-pc-admin-file-platform"
    / "src"
)


class AdminFilePlatformDriveRuntimeStandardTest(unittest.TestCase):
    def test_drive_admin_uses_canonical_drive_app_sdk_surface(self) -> None:
        service = (DRIVE_PACKAGE / "driveService.ts").read_text(encoding="utf-8")
        definitions = (DRIVE_PACKAGE / "driveSectionDefinitions.tsx").read_text(encoding="utf-8")

        self.assertIn("getSdkworkDriveAppSdkClient().drive.spaces.list", service)
        self.assertIn("getSdkworkDriveAppSdkClient().drive.nodes.list", service)
        self.assertIn("getSdkworkDriveAppSdkClient().drive.permissions.list", service)
        self.assertIn("getSdkworkDriveAppSdkClient().drive.shareLinks.list", service)
        self.assertIn("listDrivePermissions()", definitions)
        self.assertIn("listDriveShareLinks()", definitions)

        for forbidden in [
            "fetch(",
            "axios",
            "SDK_NOT_REGISTERED",
            "not registered yet",
            "when available",
        ]:
            self.assertNotIn(forbidden, service)
            self.assertNotIn(forbidden, definitions)


if __name__ == "__main__":
    unittest.main()
