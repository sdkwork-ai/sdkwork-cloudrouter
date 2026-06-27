import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class ApiContractDirectoryStandardTest(unittest.TestCase):
    def test_apis_surface_domain_contracts_exist(self) -> None:
        expected = [
            "apis/open-api/clawrouter/clawrouter-open-api.openapi.json",
            "apis/app-api/clawrouter/clawrouter-app-api.openapi.json",
            "apis/backend-api/clawrouter/clawrouter-backend-api.openapi.json",
        ]

        for relative_path in expected:
            with self.subTest(path=relative_path):
                path = ROOT / relative_path
                self.assertTrue(path.exists(), f"{relative_path} must exist")
                payload = json.loads(path.read_text(encoding="utf-8"))
                self.assertEqual(payload.get("openapi"), "3.1.2")

    def test_apis_manifest_declares_materialized_contracts(self) -> None:
        manifest = json.loads((ROOT / "apis/manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["kind"], "sdkwork.api-contract-manifest")
        self.assertEqual(manifest["application"], "sdkwork-clawrouter")
        contract_paths = {entry["path"] for entry in manifest["contracts"]}
        self.assertIn("apis/open-api/clawrouter/clawrouter-open-api.openapi.json", contract_paths)
        self.assertIn("apis/app-api/clawrouter/clawrouter-app-api.openapi.json", contract_paths)
        self.assertIn("apis/backend-api/clawrouter/clawrouter-backend-api.openapi.json", contract_paths)

    def test_apis_surface_readmes_follow_dictionary_sections(self) -> None:
        required_sections = ("Purpose", "Owner", "Allowed Content", "Forbidden Content", "Related Specs", "Verification")
        for relative_path in (
            "apis/open-api/README.md",
            "apis/app-api/README.md",
            "apis/backend-api/README.md",
        ):
            text = (ROOT / relative_path).read_text(encoding="utf-8")
            with self.subTest(path=relative_path):
                for section in required_sections:
                    self.assertIn(f"## {section}", text)


if __name__ == "__main__":
    unittest.main()
