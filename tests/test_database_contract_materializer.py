import json
import tempfile
import textwrap
import unittest
from pathlib import Path

import yaml

from tools.database_contract_materializer import DatabaseContractMaterializer


class DatabaseContractMaterializerTest(unittest.TestCase):
    def make_root(self, tmp: str) -> tuple[Path, Path]:
        root = Path(tmp)
        registry = root / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
        registry.parent.mkdir(parents=True)
        registry.write_text(
            textwrap.dedent(
                """
                schema_registry:
                  version: 2.4.0
                  common_column_groups:
                    tenant_entity: [id, tenant_id, organization_id, created_at, deleted_at]
                registry_dependencies: []
                tables:
                  - table: ai_channel
                    domain: ai
                    profile: tenant_entity
                    compliance_level: L2
                    write_owner: ai-routing-service
                    system_of_record: true
                    common_columns: tenant_entity
                    columns:
                      channel_code: string(64)
                    required_columns: [channel_code]
                    unique_constraints:
                      - name: uk_ai_channel_code
                        columns: [tenant_id, organization_id, channel_code]
                        where: deleted_at IS NULL
                    check_constraints:
                      - name: ck_ai_channel_tenant
                        columns: [tenant_id]
                        expression: tenant_id > 0
                  - table: ai_model_vendor
                    domain: models
                    generated_by_this_project: false
                    columns:
                      vendor_code: string(64)
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )
        database = root / "database"
        database.mkdir()
        (database / "database.manifest.json").write_text(
            json.dumps(
                {
                    "schemaVersion": 1,
                    "kind": "sdkwork.database.module",
                    "moduleId": "clawrouter",
                    "serviceCode": "CLAW_ROUTER",
                    "tablePrefix": "ai_",
                    "contractVersion": "1.0.0",
                    "baselineStrategy": "baseline-plus-migrations",
                    "modules": [],
                    "composeDependencies": [{"moduleId": "sdkwork-models"}],
                    "lifecycle": {"autoMigrate": True},
                    "paths": {
                        "contract": "contract/schema.yaml",
                        "migrations": "migrations",
                        "seeds": "seeds",
                        "driftPolicy": "drift/policy.yaml",
                    },
                }
            )
            + "\n",
            encoding="utf-8",
        )
        return root, registry

    def test_render_contains_full_owned_table_contract(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root, registry = self.make_root(tmp)

            rendered = DatabaseContractMaterializer(root, registry).render()
            contract = yaml.safe_load(rendered.schema_yaml)

            self.assertEqual(["postgres", "sqlite"], contract["engines"])
            self.assertEqual("2.4.0", contract["contract_version"])
            self.assertEqual(["ai_channel"], [table["name"] for table in contract["tables"]])
            table = contract["tables"][0]
            self.assertEqual("int64", table["columns"]["tenant_id"]["type"])
            self.assertTrue(table["columns"]["tenant_id"]["required"])
            self.assertEqual("TIMESTAMPTZ", table["columns"]["created_at"]["postgres_type"])
            self.assertEqual("TEXT", table["columns"]["created_at"]["sqlite_type"])
            self.assertIn("primary_key", {item["type"] for item in table["constraints"]})
            self.assertIn("check", {item["type"] for item in table["constraints"]})
            self.assertEqual("deleted_at IS NULL", table["indexes"][0]["where"])

    def test_materialize_writes_dual_dialect_assets_and_clears_db_composition(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root, registry = self.make_root(tmp)
            materializer = DatabaseContractMaterializer(root, registry)

            materializer.materialize()

            sqlite_baseline = (
                root
                / "database"
                / "ddl"
                / "baseline"
                / "sqlite"
                / "0001_clawrouter_baseline.sql"
            ).read_text(encoding="utf-8")
            self.assertIn("CREATE TABLE IF NOT EXISTS ai_channel", sqlite_baseline)
            self.assertNotIn("::jsonb", sqlite_baseline)
            self.assertNotIn("ai_model_vendor", sqlite_baseline)

            manifest = json.loads(
                (root / "database" / "database.manifest.json").read_text(encoding="utf-8")
            )
            self.assertEqual([], manifest["modules"])
            self.assertNotIn("composeDependencies", manifest)
            self.assertFalse(manifest["lifecycle"]["autoMigrate"])
            self.assertEqual(1, manifest["materializedTableCount"])
            self.assertEqual([], materializer.check())


if __name__ == "__main__":
    unittest.main()
