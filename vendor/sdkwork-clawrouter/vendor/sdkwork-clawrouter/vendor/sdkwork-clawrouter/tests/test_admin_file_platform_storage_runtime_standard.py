import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
STORAGE_PACKAGE = (
    ROOT
    / "apps"
    / "sdkwork-clawrouter-pc"
    / "packages"
    / "sdkwork-clawrouter-pc-admin-file-platform"
    / "src"
)


class AdminFilePlatformStorageRuntimeStandardTest(unittest.TestCase):
    def test_storage_admin_uses_drive_backend_sdk_boundary(self) -> None:
        service = (STORAGE_PACKAGE / "storageService.ts").read_text(encoding="utf-8")
        definitions = (STORAGE_PACKAGE / "storageSectionDefinitions.tsx").read_text(encoding="utf-8")

        self.assertIn("getSdkworkDriveBackendSdkClient", service)
        self.assertIn("export function getDriveStorageSdk(): DriveBackend {", service)
        self.assertIn("return getSdkworkDriveBackendSdkClient().drive;", service)
        self.assertIn(".storageProviders", service)
        self.assertIn(".storageProviderBindings", service)
        self.assertIn(".maintenance", service)
        self.assertNotIn("getClawRouterBackendSdkClient().oss", service)

        for forbidden in [
            "SDK_NOT_REGISTERED",
            "interface StorageProviderRecord",
            "interface StorageBucketRecord",
            "interface StorageDefaultBucketRecord",
            "interface StorageQuotaRecord",
            "interface StorageUsageRecord",
            "interface StorageReconciliationRecord",
            "interface StorageGarbageCollectionRecord",
            "not registered yet",
            "when available",
            "objectStorage",
            "storage.quotas",
            "fetch(",
            "axios",
        ]:
            self.assertNotIn(forbidden, service)
            self.assertNotIn(forbidden, definitions)


if __name__ == "__main__":
    unittest.main()
