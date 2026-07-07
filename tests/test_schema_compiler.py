import tempfile
import textwrap
import unittest
import re
from pathlib import Path

from tools.schema_compiler import SchemaCompileError, SchemaCompiler


class SchemaCompilerTest(unittest.TestCase):
    def write_registry(self, root: Path, content: str) -> Path:
        registry = root / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
        registry.parent.mkdir(parents=True, exist_ok=True)
        registry.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return registry

    def test_real_registry_compiles_clawrouter_owned_tables_only(self) -> None:
        root = Path(__file__).resolve().parents[1]

        sql = SchemaCompiler(root=root).compile_postgres()
        registry = SchemaCompiler(root=root)._load_registry()

        imported = {
            table["table"]
            for table in registry.get("tables", [])
            if isinstance(table, dict) and table.get("imported")
        }
        self.assertIn("ai_model_vendor", imported)

        for table in sorted(imported):
            self.assertNotIn(f"CREATE TABLE IF NOT EXISTS {table} (", sql)

        for table in [
            "ai_channel",
            "ai_routing_policy",
            "ai_usage",
            "ai_request_trace",
            "ai_pricing",
        ]:
            self.assertIn(f"CREATE TABLE IF NOT EXISTS {table} (", sql)
        self.assertNotIn("CREATE TABLE IF NOT EXISTS ai_usage_trace (", sql)

    def test_rejects_registry_without_project_generated_tables(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: ai_model_vendor
                    domain: ai
                    generated_by_this_project: false
                    columns:
                      vendor_code: string(64)
                """,
            )

            with self.assertRaisesRegex(
                SchemaCompileError,
                "schema registry does not contain any project-generated tables",
            ):
                SchemaCompiler(root=root, registry_path=registry).compile_postgres()

    def test_compiles_common_columns_and_standard_types_to_postgres(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  common_column_groups:
                    tenant_entity: [id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, deleted_at, deleted_by, metadata]
                tables:
                  - table: ai_model_vendor
                    domain: ai
                    common_columns: tenant_entity
                    columns:
                      vendor_code: string(64)
                      display_name: string(128)
                      capabilities: json
                      enabled: bool
                      sort_order: int32
                      usage_count: int64
                      unit_price: decimal
                      published_at: instant
                """,
            )

            sql = SchemaCompiler(root=root, registry_path=registry).compile_postgres()

            self.assertIn("CREATE TABLE IF NOT EXISTS ai_model_vendor (", sql)
            self.assertIn("    id BIGINT NOT NULL PRIMARY KEY,", sql)
            self.assertNotIn("BIGSERIAL", sql)
            self.assertNotIn("AUTOINCREMENT", sql.upper())
            self.assertIsNone(re.search(r"\bGENERATED\s+(ALWAYS|BY\s+DEFAULT)\b", sql, re.IGNORECASE))
            self.assertNotIn(" AS IDENTITY", sql.upper())
            self.assertIn("    uuid VARCHAR(64) NOT NULL,", sql)
            self.assertIn("    tenant_id BIGINT NOT NULL DEFAULT 0,", sql)
            self.assertIn("    organization_id BIGINT NOT NULL DEFAULT 0,", sql)
            self.assertIn("    data_scope INTEGER NOT NULL DEFAULT 0,", sql)
            self.assertIn("    status INTEGER NOT NULL DEFAULT 1,", sql)
            self.assertIn("    deleted_at TIMESTAMPTZ,", sql)
            self.assertIn("    deleted_by BIGINT,", sql)
            self.assertIn("    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,", sql)
            self.assertIn("    vendor_code VARCHAR(64),", sql)
            self.assertIn("    capabilities JSONB,", sql)
            self.assertIn("    enabled BOOLEAN,", sql)
            self.assertIn("    sort_order INTEGER,", sql)
            self.assertIn("    usage_count BIGINT,", sql)
            self.assertIn("    unit_price NUMERIC(38, 12),", sql)
            self.assertIn("    published_at TIMESTAMPTZ", sql)

    def test_compiles_tables_from_registry_fragments(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  common_column_groups:
                    tenant_entity: [id, uuid, tenant_id, organization_id, status]
                table_fragments:
                  - tables/ai.yaml
                """,
            )
            fragment = registry.parent / "tables" / "ai.yaml"
            fragment.parent.mkdir(parents=True, exist_ok=True)
            fragment.write_text(
                textwrap.dedent(
                    """
                    tables:
                      - table: ai_model_vendor
                        domain: ai
                        common_columns: tenant_entity
                        columns:
                          vendor_code: string(64)
                    """
                ).strip()
                + "\n",
                encoding="utf-8",
            )

            sql = SchemaCompiler(root=root, registry_path=registry).compile_postgres()

            self.assertIn("CREATE TABLE IF NOT EXISTS ai_model_vendor", sql)
            self.assertIn("    vendor_code VARCHAR(64)", sql)

    def test_compiles_unique_and_regular_indexes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  common_column_groups:
                    tenant_entity: [id, tenant_id, organization_id, status, updated_at]
                tables:
                  - table: ai_model_vendor
                    domain: ai
                    common_columns: tenant_entity
                    columns:
                      vendor_code: string(64)
                    indexes:
                      - { name: uk_ai_model_vendor_code, unique: true, columns: [vendor_code] }
                      - { name: idx_ai_model_vendor_status, columns: [tenant_id, organization_id, status, updated_at, id] }
                """,
            )

            sql = SchemaCompiler(root=root, registry_path=registry).compile_postgres()

            self.assertIn(
                "CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_model_vendor_code ON ai_model_vendor (vendor_code);",
                sql,
            )
            self.assertIn(
                "CREATE INDEX IF NOT EXISTS idx_ai_model_vendor_status ON ai_model_vendor (tenant_id, organization_id, status, updated_at, id);",
                sql,
            )

    def test_compiles_explicit_primary_key_for_system_tables(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: system_installation_state
                    domain: system
                    primary_key: id
                    columns:
                      id: int64
                      installation_id: string(64)
                    required_columns: [id, installation_id]
                """,
            )

            sql = SchemaCompiler(root=root, registry_path=registry).compile_postgres()

            self.assertIn("    id BIGINT NOT NULL PRIMARY KEY,", sql)
            self.assertIn("    installation_id VARCHAR(64) NOT NULL", sql)

    def test_compiles_not_null_columns_as_required_database_constraints(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  common_column_groups:
                    tenant_entity: [id, uuid, tenant_id, organization_id, status]
                tables:
                  - table: ai_model
                    domain: ai
                    common_columns: tenant_entity
                    not_null_columns: [uuid, tenant_id, organization_id, status, catalog_key, model]
                    columns:
                      catalog_key: string(256)
                      model: string(128)
                """,
            )

            sql = SchemaCompiler(root=root, registry_path=registry).compile_postgres()

            self.assertIn("    catalog_key VARCHAR(256) NOT NULL,", sql)
            self.assertIn("    model VARCHAR(128) NOT NULL", sql)

    def test_compiles_database_spec_unique_constraints_as_indexes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  common_column_groups:
                    tenant_entity: [id, uuid, tenant_id, organization_id, status]
                tables:
                  - table: ai_billing_meter
                    domain: ai
                    common_columns: tenant_entity
                    unique_constraints:
                      - { columns: [uuid], source: column_unique }
                      - { name: uk_ai_billing_meter_code, columns: [tenant_id, organization_id, meter_code] }
                    columns:
                      meter_code: string(64)
                """,
            )

            sql = SchemaCompiler(root=root, registry_path=registry).compile_postgres()

            self.assertIn(
                "CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_billing_meter_uuid ON ai_billing_meter (uuid);",
                sql,
            )
            self.assertIn(
                "CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_billing_meter_code ON ai_billing_meter (tenant_id, organization_id, meter_code);",
                sql,
            )

    def test_compiles_explicit_column_constraints_for_java_compatible_tables(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: ai_agent_skill
                    domain: legacy
                    generated_by_this_project: true
                    columns:
                      id: { type: int64, constraints: "PRIMARY KEY" }
                      uuid: { type: string(255), constraints: "NOT NULL UNIQUE" }
                      skill_key: { type: string(128), constraints: "NOT NULL" }
                      enabled: { type: bool, constraints: "NOT NULL DEFAULT TRUE" }
                      tags: { type: json, constraints: "NOT NULL DEFAULT '[]'::jsonb" }
                      default_config: { type: json, constraints: "NOT NULL DEFAULT '{}'::jsonb" }
                    indexes:
                      - { name: uk_ai_agent_skill_key, unique: true, columns: [skill_key] }
                """,
            )

            sql = SchemaCompiler(root=root, registry_path=registry).compile_postgres()

            self.assertIn("CREATE TABLE IF NOT EXISTS ai_agent_skill (", sql)
            self.assertIn("    id BIGINT NOT NULL PRIMARY KEY,", sql)
            self.assertIn("    uuid VARCHAR(255) NOT NULL UNIQUE,", sql)
            self.assertIn("    skill_key VARCHAR(128) NOT NULL,", sql)
            self.assertIn("    enabled BOOLEAN NOT NULL DEFAULT TRUE,", sql)
            self.assertIn("    tags JSONB NOT NULL DEFAULT '[]'::jsonb,", sql)
            self.assertIn("    default_config JSONB NOT NULL DEFAULT '{}'::jsonb", sql)
            self.assertIn(
                "CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_agent_skill_key ON ai_agent_skill (skill_key);",
                sql,
            )

    def test_skips_java_owned_legacy_tables(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                schema_registry:
                  common_column_groups:
                    tenant_entity: [id]
                tables:
                  - table: plus_order
                    domain: legacy
                    generated_by_this_project: false
                    columns:
                      order_no: string(64)
                  - table: ai_usage
                    domain: ai
                    common_columns: tenant_entity
                    columns:
                      request_id: string(128)
                """,
            )

            sql = SchemaCompiler(root=root, registry_path=registry).compile_postgres()

            self.assertNotIn("CREATE TABLE IF NOT EXISTS plus_order", sql)
            self.assertIn("CREATE TABLE IF NOT EXISTS ai_usage", sql)

    def test_rejects_unsupported_column_types(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: ai_bad_table
                    domain: ai
                    columns:
                      amount: moneyish
                """,
            )

            with self.assertRaisesRegex(
                SchemaCompileError,
                "unsupported column type for ai_bad_table.amount: moneyish",
            ):
                SchemaCompiler(root=root, registry_path=registry).compile_postgres()

    def test_writes_postgres_schema_file(self) -> None:
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
            output = root / "generated" / "schema" / "postgres" / "schema.sql"

            SchemaCompiler(root=root, registry_path=registry).write_postgres(output)

            self.assertTrue(output.exists())
            self.assertIn("CREATE TABLE IF NOT EXISTS ai_model_vendor", output.read_text(encoding="utf-8"))

    def test_check_postgres_schema_reports_stale_file(self) -> None:
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
            output = root / "generated" / "schema" / "postgres" / "schema.sql"
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text("-- stale\n", encoding="utf-8")

            result = SchemaCompiler(root=root, registry_path=registry).check_postgres(output)

            self.assertFalse(result.ok)
            self.assertIn(f"postgres schema is stale: {output}", result.messages)

    def test_check_postgres_schema_accepts_fresh_file(self) -> None:
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
            output = root / "generated" / "schema" / "postgres" / "schema.sql"
            compiler = SchemaCompiler(root=root, registry_path=registry)
            compiler.write_postgres(output)

            result = compiler.check_postgres(output)

            self.assertTrue(result.ok, result.messages)


if __name__ == "__main__":
    unittest.main()
