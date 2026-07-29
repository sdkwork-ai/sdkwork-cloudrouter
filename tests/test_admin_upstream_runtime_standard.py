import json
import unittest
from pathlib import Path

from tools.api_contract_manifest import ApiContractManifestGenerator


ROOT = Path(__file__).resolve().parents[1]
SOURCE = (
    "apps/sdkwork-clawrouter-pc/packages/"
    "sdkwork-clawrouter-pc-admin-upstream/src/upstreamService.ts"
)


class AdminUpstreamRuntimeStandardTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        manifest = ApiContractManifestGenerator(root=ROOT).generate()
        cls.operations = {
            (operation["source"], operation["operation"]): operation
            for operation in manifest["operations"]
        }

    def operation(self, name: str) -> dict:
        return self.operations[(SOURCE, name)]

    def test_three_upstream_aggregates_use_canonical_backend_resources(self) -> None:
        cases = {
            "createUpstreamSupplier": (
                "/backend/v3/api/ai/upstream_suppliers",
                "CreateUpstreamSupplierRequest",
                {"supplierCode", "supplierName", "supplierType", "adapterCode", "protocolCode"},
            ),
            "createUpstreamAccount": (
                "/backend/v3/api/ai/upstream_accounts",
                "CreateUpstreamAccountRequest",
                {"supplierId", "accountCode", "accountName", "authMethodCode"},
            ),
            "createUpstreamAccountGroup": (
                "/backend/v3/api/ai/upstream_account_groups",
                "CreateUpstreamAccountGroupRequest",
                {"groupCode", "groupName"},
            ),
        }

        for operation_name, (path, schema_name, required) in cases.items():
            with self.subTest(operation=operation_name):
                operation = self.operation(operation_name)
                self.assertEqual("POST", operation["api_method"])
                self.assertEqual(path, operation["api_path"])
                self.assertEqual(schema_name, operation["request_schema"]["name"])
                self.assertEqual(
                    required,
                    set(operation["request_schema"]["schema"]["required"]),
                )
                self.assertTrue(operation["idempotency_required"])

    def test_upstream_lists_use_standard_database_backed_pagination_contract(self) -> None:
        for operation_name in (
            "listUpstreamSuppliers",
            "listUpstreamAccounts",
            "listUpstreamAccountGroups",
        ):
            with self.subTest(operation=operation_name):
                operation = self.operation(operation_name)
                query_names = {
                    parameter["name"] for parameter in operation["query_parameters"]
                }
                self.assertEqual({"page", "page_size", "q"}, query_names)
                response = operation["response_schema"]["schema"]
                self.assertEqual(["items", "pageInfo"], response["required"])
                self.assertEqual(
                    "#/components/schemas/PageInfo",
                    response["properties"]["pageInfo"]["$ref"],
                )

    def test_upstream_frontend_uses_only_the_generated_backend_sdk_boundary(self) -> None:
        service = (ROOT / SOURCE).read_text(encoding="utf-8")

        for namespace in (
            ".ai.upstreamSuppliers",
            ".ai.upstreamAccounts",
            ".ai.upstreamAccountGroups",
        ):
            self.assertIn(namespace, service)
        self.assertIn("createIdempotencyParams", service)
        self.assertIn("{ ifMatch:", service)
        for forbidden in (
            "fetch(",
            "axios",
            ".http.request",
            "Authorization",
            "BACKEND_API_PREFIX",
            "channelGroups",
            "rawSecret",
        ):
            self.assertNotIn(forbidden, service)

    def test_upstream_credential_secret_is_write_only_and_never_returned(self) -> None:
        operation = self.operation("createUpstreamAccountCredential")
        request_secret = operation["request_schema"]["schema"]["properties"]["secret"]
        response_item = operation["response_schema"]["schema"]["properties"]["item"]

        self.assertTrue(request_secret["writeOnly"])
        self.assertEqual("UpstreamAccountCredential", response_item["name"])
        self.assertNotIn("rawSecret", response_item["properties"])
        self.assertNotIn("secret", response_item["properties"])
        self.assertNotIn("secretCiphertext", response_item["properties"])

    def test_current_upstream_package_replaces_the_retired_group_package(self) -> None:
        package_root = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-upstream"
        )
        component = json.loads(
            (package_root / "specs" / "component.spec.json").read_text(encoding="utf-8")
        )

        retired_package = package_root.parent / "sdkwork-clawrouter-pc-admin-group"
        self.assertFalse((retired_package / "package.json").exists())
        self.assertFalse(any((retired_package / "src").glob("*")))
        self.assertEqual("upstream-management", component["component"]["capability"])
        self.assertEqual("backend-admin", component["component"]["surface"])
        self.assertTrue((package_root / "src" / "supplierTab.tsx").exists())
        self.assertTrue((package_root / "src" / "accountTab.tsx").exists())
        self.assertTrue((package_root / "src" / "accountGroupTab.tsx").exists())


if __name__ == "__main__":
    unittest.main()
