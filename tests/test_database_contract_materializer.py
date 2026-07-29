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
                  - table: ai_upstream_supplier
                    domain: ai
                    profile: tenant_entity
                    compliance_level: L2
                    write_owner: ai-routing-service
                    system_of_record: true
                    common_columns: tenant_entity
                    columns:
                      supplier_code: string(64)
                    required_columns: [supplier_code]
                    unique_constraints:
                      - name: uk_ai_upstream_supplier_code
                        columns: [tenant_id, organization_id, supplier_code]
                        where: deleted_at IS NULL
                    check_constraints:
                      - name: ck_ai_upstream_supplier_tenant
                        columns: [tenant_id]
                        expressions:
                          postgres: tenant_id > 0
                          sqlite: tenant_id > 0
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
                    "schemaVersion": 2,
                    "kind": "sdkwork.database.module",
                    "databaseRole": "authoritative-server",
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

            self.assertEqual("authoritative-server", contract["database_role"])
            self.assertEqual(["postgres"], contract["engines"])
            self.assertEqual("2.4.0", contract["contract_version"])
            self.assertEqual(
                ["ai_upstream_supplier"], [table["name"] for table in contract["tables"]]
            )
            table = contract["tables"][0]
            self.assertEqual("int64", table["columns"]["tenant_id"]["type"])
            self.assertTrue(table["columns"]["tenant_id"]["required"])
            self.assertEqual("TIMESTAMPTZ", table["columns"]["created_at"]["postgres_type"])
            self.assertNotIn("sqlite_type", table["columns"]["created_at"])
            self.assertIn("primary_key", {item["type"] for item in table["constraints"]})
            self.assertIn("check", {item["type"] for item in table["constraints"]})
            self.assertIn(
                "tenant_id > 0",
                {item.get("expression") for item in table["constraints"]},
            )
            self.assertEqual("deleted_at IS NULL", table["indexes"][0]["where"])

    def test_materialize_writes_authoritative_postgres_assets_and_clears_composition(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root, registry = self.make_root(tmp)
            materializer = DatabaseContractMaterializer(root, registry)

            materializer.materialize()

            postgres_baseline = (
                root
                / "database"
                / "ddl"
                / "baseline"
                / "postgres"
                / "0001_clawrouter_baseline.sql"
            ).read_text(encoding="utf-8")
            self.assertIn("CREATE TABLE IF NOT EXISTS ai_upstream_supplier", postgres_baseline)
            self.assertNotIn("ai_model_vendor", postgres_baseline)
            self.assertFalse((root / "database" / "ddl" / "baseline" / "sqlite").exists())

            manifest = json.loads(
                (root / "database" / "database.manifest.json").read_text(encoding="utf-8")
            )
            self.assertEqual([], manifest["modules"])
            self.assertNotIn("composeDependencies", manifest)
            self.assertEqual(2, manifest["schemaVersion"])
            self.assertEqual("authoritative-server", manifest["databaseRole"])
            self.assertEqual(["postgres"], manifest["engines"])
            self.assertEqual("ai_", manifest["tablePrefix"])
            self.assertNotIn("tablePrefixes", manifest)
            self.assertEqual("ai_upstream_supplier", manifest["baselineAnchorTable"])
            self.assertFalse(manifest["lifecycle"]["autoMigrate"])
            self.assertEqual(1, manifest["materializedTableCount"])
            self.assertEqual([], materializer.check())


if __name__ == "__main__":
    unittest.main()
