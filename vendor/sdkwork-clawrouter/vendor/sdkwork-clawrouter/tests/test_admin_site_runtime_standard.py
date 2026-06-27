import unittest
from pathlib import Path

import yaml

from tools.api_contract_manifest import ApiContractManifestGenerator


ROOT = Path(__file__).resolve().parents[1]


class AdminSiteRuntimeStandardTest(unittest.TestCase):
    def test_admin_site_schema_and_contract_follow_confirmed_naming(self) -> None:
        manifest = ApiContractManifestGenerator(root=ROOT).generate()
        operations = {operation["key"]: operation for operation in manifest["operations"]}
        contract = yaml.safe_load(
            (ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml").read_text(
                encoding="utf-8"
            )
        )
        table_items = []
        for registry_path in sorted((ROOT / "docs" / "schema-registry" / "tables").glob("*.yaml")):
            registry = yaml.safe_load(registry_path.read_text(encoding="utf-8"))
            table_items.extend(registry.get("tables", []))
        effective_registry = (
            ROOT / "generated" / "schema" / "registry" / "sdkwork-clawrouter.tables.effective.yaml"
        ).read_text(encoding="utf-8")

        source = "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-relay-site/src/siteService.ts"
        expected_operation_keys = [
            f"{source}#fetchSites@/admin/model/sites",
            f"{source}#createSite@/admin/model/sites",
            f"{source}#updateSite@/admin/model/sites",
            f"{source}#deleteSite@/admin/model/sites",
            f"{source}#fetchSiteChannels@/admin/model/sites",
            f"{source}#testSiteConnection@/admin/model/sites",
            f"{source}#healthCheckSite@/admin/model/sites",
        ]
        for operation_key in expected_operation_keys:
            self.assertIn(operation_key, operations)

        self.assertEqual(
            "/backend/v3/api/sites",
            operations[f"{source}#fetchSites@/admin/model/sites"]["api_path"],
        )
        self.assertEqual(
            "/backend/v3/api/sites",
            operations[f"{source}#createSite@/admin/model/sites"]["api_path"],
        )
        self.assertEqual(
            "/backend/v3/api/sites/{siteId}",
            operations[f"{source}#updateSite@/admin/model/sites"]["api_path"],
        )
        self.assertEqual(
            "/backend/v3/api/sites/{siteId}",
            operations[f"{source}#deleteSite@/admin/model/sites"]["api_path"],
        )
        self.assertEqual(
            "/backend/v3/api/sites/{siteId}/channels",
            operations[f"{source}#fetchSiteChannels@/admin/model/sites"]["api_path"],
        )
        self.assertEqual(
            "/backend/v3/api/sites/{siteId}/test_connection",
            operations[f"{source}#testSiteConnection@/admin/model/sites"]["api_path"],
        )
        self.assertEqual(
            "/backend/v3/api/sites/{siteId}/health_check",
            operations[f"{source}#healthCheckSite@/admin/model/sites"]["api_path"],
        )

        serialized_operations = str(operations)
        self.assertNotIn("/backend/v3/api/integration/sites", serialized_operations)
        self.assertNotIn("/backend/v3/api/sites/{siteId}/models", serialized_operations)
        self.assertNotIn("/backend/v3/api/sites/{siteId}/services/{serviceId}/models", serialized_operations)
        self.assertNotIn("relay_stations", serialized_operations)
        self.assertNotIn("integration_site", serialized_operations)
        self.assertNotIn("siteModels.", serialized_operations)

        tables = {item["table"]: item for item in table_items}
        for table_name in ["ai_site", "ai_site_service"]:
            self.assertIn(table_name, tables)
            self.assertIn(table_name, effective_registry)
        self.assertNotIn("ai_site_model", tables)
        self.assertNotIn("ai_site_model", effective_registry)

        ai_channel_columns = tables["ai_channel"]["columns"]
        for field_name in [
            "site_id",
            "site_service_id",
            "site_code",
            "site_service_code",
            "site_channel_role",
        ]:
            self.assertIn(field_name, ai_channel_columns)

        self.assertIn("credential_ref", tables["ai_site_service"]["columns"])
        self.assertIn("credential_hash", tables["ai_site_service"]["columns"])
        self.assertIn("masked_label", tables["ai_site_service"]["columns"])

        self.assertNotIn("api_key", str(tables["ai_site_service"]["columns"]).lower())
        self.assertNotIn("plaintext", str(tables["ai_site_service"]["columns"]).lower())
        self.assertFalse(tables["ai_site_service"]["security"]["stores_secret_plaintext"])

        frontend_models = contract["frontend_models"]
        model_routes = {
            item["interface"]: item["route"]
            for item in frontend_models
            if item.get("source") == source
            and item.get("interface")
            in {
                "SiteItem",
                "SiteCreateInput",
                "SiteUpdateInput",
                "SiteChannelItem",
                "SiteConnectionCheckResult",
            }
        }
        self.assertEqual(
            {
                "SiteItem": "/admin/model/sites",
                "SiteCreateInput": "/admin/model/sites",
                "SiteUpdateInput": "/admin/model/sites",
                "SiteChannelItem": "/admin/model/sites",
                "SiteConnectionCheckResult": "/admin/model/sites",
            },
            model_routes,
        )

    def test_admin_site_runtime_files_use_confirmed_route_markers(self) -> None:
        sources = "\n".join(
            [
                (ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml").read_text(
                    encoding="utf-8"
                ),
                (
                    ROOT
                    / "services"
                    / "sdkwork-clawrouter-router-service"
                    / "src"
                    / "api"
                    / "admin_site.rs"
                ).read_text(encoding="utf-8"),
                (
                    ROOT
                    / "services"
                    / "sdkwork-clawrouter-router-service"
                    / "src"
                    / "infrastructure"
                    / "sql"
                    / "sqlite"
                    / "admin_site_store.rs"
                ).read_text(encoding="utf-8"),
            ]
        )
        self.assertIn("/backend/v3/api/sites", sources)
        self.assertIn("ai_site", sources)
        self.assertIn("ai_site_service", sources)
        self.assertNotIn("ai_upstream_provider", sources)


if __name__ == "__main__":
    unittest.main()
