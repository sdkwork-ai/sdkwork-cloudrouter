import tempfile
import textwrap
import unittest
from pathlib import Path

from tools.schema_manifest import SchemaManifestGenerator

class SchemaManifestGeneratorTest(unittest.TestCase):
    def write_registry(self, root: Path, content: str) -> Path:
        registry = root / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
        registry.parent.mkdir(parents=True, exist_ok=True)
        registry.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return registry

    def test_generates_summary_tables_and_route_index(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  name: sdkwork-clawrouter
                  version: 0.1.0
                  api_prefixes:
                    app: /app/v3/api
                    backend: /backend/v3/api
                    openai_compatible: /v1
                tables:
                  - table: plus_order
                    domain: legacy
                    
                    generated_by_this_project: false
                    frontend_routes: [/console/orders, /admin/order]
                    api_surfaces: [app, backend]
                  - table: ai_model_vendor
                    domain: ai
                    write_owner: model-catalog-service
                    frontend_routes: [/models, /admin/model]
                    api_surfaces: [app, backend]
                    columns:
                      vendor_code: string(64)
                """,
            )

            manifest = SchemaManifestGenerator(root=root, registry_path=registry).generate()

            self.assertEqual("sdkwork-clawrouter", manifest["schema"]["name"])
            self.assertEqual(2, manifest["summary"]["table_count"])
            self.assertEqual(1, manifest["summary"]["generated_table_count"])
            self.assertEqual(1, manifest["summary"]["legacy_table_count"])
            self.assertEqual(["ai_model_vendor"], manifest["generated_tables"])
            self.assertEqual(["plus_order"], manifest["external_legacy_tables"])
            self.assertEqual(["ai_model_vendor", "plus_order"], manifest["routes"]["/admin/model"]["tables"] + manifest["routes"]["/admin/order"]["tables"])
            self.assertEqual(["app", "backend"], manifest["routes"]["/models"]["api_surfaces"])
            self.assertEqual("backend", manifest["routes"]["/admin/model"]["required_api_surface"])
            self.assertEqual("admin", manifest["routes"]["/admin/model"]["route_scope"])
            self.assertEqual("app", manifest["routes"]["/models"]["required_api_surface"])
            self.assertEqual("public", manifest["routes"]["/models"]["route_scope"])

    def test_generates_manifest_from_registry_fragments(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  name: sdkwork-clawrouter
                table_fragments:
                  - tables/system.yaml
                  - tables/ai.yaml
                """,
            )
            fragments_root = registry.parent / "tables"
            fragments_root.mkdir(parents=True, exist_ok=True)
            (fragments_root / "system.yaml").write_text(
                textwrap.dedent(
                    """
                    tables:
                      - table: system_installation_state
                        domain: system
                    """
                ).strip()
                + "\n",
                encoding="utf-8",
            )
            (fragments_root / "ai.yaml").write_text(
                textwrap.dedent(
                    """
                    tables:
                      - table: ai_model_vendor
                        domain: ai
                    """
                ).strip()
                + "\n",
                encoding="utf-8",
            )

            manifest = SchemaManifestGenerator(root=root, registry_path=registry).generate()

            self.assertEqual(
                ["ai_model_vendor", "system_installation_state"],
                [table["table"] for table in manifest["tables"]],
            )
            self.assertEqual(
                ["ai_model_vendor", "system_installation_state"],
                manifest["generated_tables"],
            )

    def test_checks_effective_schema_registry_snapshot(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  name: sdkwork-clawrouter
                tables:
                  - table: ai_model_vendor
                    domain: ai
                """,
            )
            generator = SchemaManifestGenerator(root=root, registry_path=registry)
            generator.write()
            snapshot = root / "generated" / "schema" / "registry" / "sdkwork-clawrouter.tables.effective.yaml"
            snapshot.write_text(snapshot.read_text(encoding="utf-8").replace("ai_model_vendor", "stale_table"), encoding="utf-8")

            result = generator.check()

            self.assertFalse(result.ok)
            self.assertIn(f"effective schema registry is stale: {snapshot}", result.messages)

    def test_effective_schema_registry_rewrites_spec_paths_for_generated_location(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'specs').mkdir()
            (root / 'specs' / 'DATABASE_SPEC.md').write_text('# Database Spec\n', encoding='utf-8')
            (root / 'specs' / 'API_SPEC.md').write_text('# API Spec\n', encoding='utf-8')
            registry = self.write_registry(
                root,
                '''
                schema_registry:
                  name: sdkwork-clawrouter
                  standard: ../../specs/DATABASE_SPEC.md
                  api_standard: ../../specs/API_SPEC.md
                tables:
                  - table: ai_model_vendor
                    domain: ai
                '''
            )

            snapshot = SchemaManifestGenerator(root=root, registry_path=registry).write_effective_registry()
            snapshot_text = snapshot.read_text(encoding='utf-8')

            self.assertIn('standard: ../../../specs/DATABASE_SPEC.md', snapshot_text)
            self.assertIn('api_standard: ../../../specs/API_SPEC.md', snapshot_text)
            self.assertTrue((snapshot.parent / '../../../specs/DATABASE_SPEC.md').resolve().exists())
            self.assertTrue((snapshot.parent / '../../../specs/API_SPEC.md').resolve().exists())

    def test_resolves_common_columns_and_explicit_columns(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  common_column_groups:
                    tenant_entity: [id, uuid, tenant_id, status, metadata]
                tables:
                  - table: ai_billing_meter
                    domain: ai
                    common_columns: tenant_entity
                    columns:
                      meter_code: string(64)
                      billing_mode: enum_int32
                """,
            )

            manifest = SchemaManifestGenerator(root=root, registry_path=registry).generate()
            columns = manifest["tables"][0]["columns"]

            self.assertEqual(
                ["id", "uuid", "tenant_id", "status", "metadata", "meter_code", "billing_mode"],
                [column["name"] for column in columns],
            )
            self.assertEqual("common", columns[0]["source"])
            self.assertEqual("explicit", columns[-1]["source"])

    def test_includes_structured_explicit_columns(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: ai_agent_skill
                    domain: legacy
                    columns:
                      skill_key: { type: string(128), constraints: "NOT NULL" }
                      builtin: { type: bool, constraints: "NOT NULL DEFAULT FALSE" }
                      created_at: { type: instant, constraints: "NOT NULL DEFAULT CURRENT_TIMESTAMP" }
                """,
            )

            manifest = SchemaManifestGenerator(root=root, registry_path=registry).generate()
            columns = manifest["tables"][0]["columns"]

            self.assertEqual(
                ["skill_key", "builtin", "created_at"],
                [column["name"] for column in columns],
            )
            self.assertEqual("string(128)", columns[0]["type"])
            self.assertEqual("bool", columns[1]["type"])
            self.assertEqual("instant", columns[2]["type"])

    def test_preserves_legacy_physical_columns_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: appstore_app
                    domain: legacy
                    generated_by_this_project: false
                    physical_columns:
                      inherited: PlusUserBaseEntity columns
                      own: [name, icon_url]
                """,
            )

            manifest = SchemaManifestGenerator(root=root, registry_path=registry).generate()

            self.assertEqual("PlusUserBaseEntity columns", manifest["tables"][0]["physical_columns"]["inherited"])
            self.assertEqual(["name", "icon_url"], manifest["tables"][0]["physical_columns"]["own"])

    def test_preserves_projection_source_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: ops_metric_snapshot
                    domain: ops
                    profile: projection
                    source_tables: [ai_usage]
                    source_refs: [external-metrics]
                    projection_policy:
                      does_not_replace: [plus_account_history]
                      purpose: dashboard_read_model
                    columns:
                      metric_name: string(128)
                """,
            )

            manifest = SchemaManifestGenerator(root=root, registry_path=registry).generate()
            table = manifest["tables"][0]

            self.assertEqual(["ai_usage"], table["source_tables"])
            self.assertEqual(["external-metrics"], table["source_refs"])
            self.assertEqual(["plus_account_history"], table["projection_policy"]["does_not_replace"])
            self.assertEqual("dashboard_read_model", table["projection_policy"]["purpose"])

    def test_preserves_unique_constraints_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: plus_order
                    domain: legacy
                    generated_by_this_project: false
                    unique_constraints:
                      - { columns: [uuid], source: column_unique }
                      - { name: uk_plus_order_out_trade_no, columns: [out_trade_no] }
                """,
            )

            manifest = SchemaManifestGenerator(root=root, registry_path=registry).generate()
            constraints = manifest["tables"][0]["unique_constraints"]

            self.assertEqual(
                [
                    {"columns": ["uuid"], "source": "column_unique"},
                    {"name": "uk_plus_order_out_trade_no", "columns": ["out_trade_no"]},
                ],
                constraints,
            )

    def test_preserves_not_null_columns_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: plus_payment
                    domain: legacy
                    generated_by_this_project: false
                    not_null_columns: [purpose, out_trade_no, channel, provider, status, amount]
                """,
            )

            manifest = SchemaManifestGenerator(root=root, registry_path=registry).generate()

            self.assertEqual(
                ["purpose", "out_trade_no", "channel", "provider", "status", "amount"],
                manifest["tables"][0]["not_null_columns"],
            )

    def test_preserves_column_types_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: plus_payment
                    domain: legacy
                    generated_by_this_project: false
                    column_types:
                      amount: NUMERIC(18, 6)
                      out_trade_no: VARCHAR(128)
                """,
            )

            manifest = SchemaManifestGenerator(root=root, registry_path=registry).generate()

            self.assertEqual(
                {
                    "amount": "NUMERIC(18, 6)",
                    "out_trade_no": "VARCHAR(128)",
                },
                manifest["tables"][0]["column_types"],
            )

    def test_preserves_foreign_keys_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: plus_payment
                    domain: legacy
                    generated_by_this_project: false
                    foreign_keys:
                      - { name: fk_plus_payment_order, columns: [order_id], references_table: plus_order, references_columns: [id] }
                """,
            )

            manifest = SchemaManifestGenerator(root=root, registry_path=registry).generate()

            self.assertEqual(
                [
                    {
                        "name": "fk_plus_payment_order",
                        "columns": ["order_id"],
                        "references_table": "plus_order",
                        "references_columns": ["id"],
                    }
                ],
                manifest["tables"][0]["foreign_keys"],
            )

    def test_preserves_index_method_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: plus_product
                    domain: legacy
                    generated_by_this_project: false
                    indexes:
                      - { name: gin_plus_product_tags, method: gin, columns: [tags] }
                      - { name: gist_plus_product_location, method: gist, columns: [location] }
                      - { name: uk_plus_product_code, unique: true, columns: [code] }
                """,
            )

            manifest = SchemaManifestGenerator(root=root, registry_path=registry).generate()

            self.assertEqual(
                [
                    {"name": "gin_plus_product_tags", "unique": False, "method": "gin", "columns": ["tags"]},
                    {"name": "gist_plus_product_location", "unique": False, "method": "gist", "columns": ["location"]},
                    {"name": "uk_plus_product_code", "unique": True, "columns": ["code"]},
                ],
                manifest["tables"][0]["indexes"],
            )

    def test_preserves_semantic_contracts_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: ops_job_execution
                    domain: ops
                    columns:
                      job_type: enum_int32
                      payload: json
                    semantic_contracts:
                      model_ranking_refresh:
                        job_name: model_ranking_refresh
                        job_type:
                          code: 20
                        trigger_types:
                          scheduled: 1
                          manual: 2
                        payload_contract:
                          required_fields: [rankScope, snapshotDate]
                          source_tables: [ai_usage, ai_model, ai_model_rank_snapshot]
                """,
            )

            manifest = SchemaManifestGenerator(root=root, registry_path=registry).generate()

            self.assertEqual(
                {
                    "model_ranking_refresh": {
                        "job_name": "model_ranking_refresh",
                        "job_type": {"code": 20},
                        "trigger_types": {"scheduled": 1, "manual": 2},
                        "payload_contract": {
                            "required_fields": ["rankScope", "snapshotDate"],
                            "source_tables": [
                                "ai_usage",
                                "ai_model",
                                "ai_model_rank_snapshot",
                            ],
                        },
                    }
                },
                manifest["tables"][0]["semantic_contracts"],
            )

    def test_writes_and_checks_manifest(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: ai_model_vendor
                    domain: ai
                    columns:
                      vendor_code: string(64)
                """,
            )
            generator = SchemaManifestGenerator(root=root, registry_path=registry)
            output = generator.write()

            self.assertTrue(output.exists())
            self.assertTrue(generator.check().ok)

    def test_check_reports_stale_manifest(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: ai_model_vendor
                    domain: ai
                    columns:
                      vendor_code: string(64)
                """,
            )
            output = root / "generated" / "schema" / "manifest" / "schema-manifest.json"
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text("{}\n", encoding="utf-8")

            result = SchemaManifestGenerator(root=root, registry_path=registry).check()

            self.assertFalse(result.ok)
            self.assertIn(f"schema manifest is stale: {output}", result.messages)


if __name__ == "__main__":
    unittest.main()
