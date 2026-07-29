import copy
import tempfile
import unittest
from pathlib import Path

import yaml

from tools.database_contract_materializer import DatabaseContractMaterializer
from tools.schema_compiler import SchemaCompileError, SchemaCompiler
from tools.schema_registry_loader import load_schema_registry


ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = ROOT / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"

RETENTION_INDEXES = {
    "ai_config_change_event": "idx_ai_config_change_event_retention",
    "ai_pricing_import_snapshot": "idx_ai_pricing_import_snapshot_retention",
    "ai_usage": "idx_ai_usage_retention",
    "ops_alert_event": "idx_ops_alert_event_retention",
    "ops_audit_log": "idx_ops_audit_log_retention",
    "ops_config_snapshot": "idx_ops_config_snapshot_retention",
    "ops_gateway_heartbeat": "idx_ops_gateway_heartbeat_retention",
    "ops_job_execution": "idx_ops_job_execution_retention",
}

CLEANUP_OWNERS = {
    "ai_config_change_event": "ai-routing-service",
    "ai_pricing_import_snapshot": "ai-pricing-service",
    "ai_usage": "router-service",
    "ops_alert_event": "clawrouter-ops-runtime",
    "ops_audit_log": "clawrouter-ops-runtime",
    "ops_config_snapshot": "clawrouter-ops-runtime",
    "ops_gateway_heartbeat": "clawrouter-ops-runtime",
    "ops_job_execution": "clawrouter-ops-runtime",
}

OPS_QUERY_INDEXES = {
    "ops_alert_event": (
        "idx_ops_alert_event_tenant_status_latest",
        ["tenant_id", "organization_id", "status", "last_seen_at", "id"],
    ),
    "ops_gateway_heartbeat": (
        "idx_ops_gateway_heartbeat_instance_status_time",
        ["instance_id", "status", "heartbeat_at", "id"],
    ),
    "ops_gateway_instance": (
        "idx_ops_gateway_instance_tenant_status_heartbeat",
        [
            "tenant_id",
            "organization_id",
            "status",
            "deleted_at",
            "last_heartbeat_at",
            "updated_at",
            "id",
        ],
    ),
}

ROOT_MATERIALIZED_RETENTION_TABLES = {
    "ai_config_change_event",
    "ai_pricing_import_snapshot",
    "ai_usage",
}


class DatabaseLifecycleIndexesTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.registry = load_schema_registry(REGISTRY_PATH, app_root=ROOT)
        cls.tables = {
            table["table"]: table
            for table in cls.registry["tables"]
            if isinstance(table, dict) and isinstance(table.get("table"), str)
        }
        cls.common_groups = cls.registry["schema_registry"]["common_column_groups"]
        cls.compiler = SchemaCompiler(ROOT, REGISTRY_PATH)

    def test_retention_tables_define_bounded_cleanup_contract(self) -> None:
        expected_predicate = (
            "retention_until IS NOT NULL AND retention_until <= :now "
            "AND legal_hold = false"
        )
        required_metrics = {
            "cleanup_candidates",
            "cleanup_archived",
            "cleanup_deleted",
            "cleanup_skipped_legal_hold",
            "cleanup_failures",
        }

        for table_name, index_name in RETENTION_INDEXES.items():
            with self.subTest(table=table_name):
                table = self.tables[table_name]
                columns = self.compiler._collect_columns(
                    table,
                    self.common_groups,
                    "postgres",
                )
                self.assertIn("retention_until", columns)
                self.assertIn("legal_hold", columns)

                indexes = {item["name"]: item["columns"] for item in table["indexes"]}
                self.assertEqual(["retention_until", "id"], indexes[index_name])

                lifecycle = table["lifecycle"]
                self.assertEqual("indexed_append_only", lifecycle["storage_strategy"])
                self.assertEqual("12mo", lifecycle["retention"]["online_retention"])
                self.assertEqual("5y", lifecycle["retention"]["archive_retention"])
                self.assertEqual("24h", lifecycle["retention"]["grace_period"])

                cleanup = lifecycle["cleanup"]
                self.assertEqual(CLEANUP_OWNERS[table_name], cleanup["owner"])
                self.assertEqual("platform_cross_tenant", cleanup["scope"])
                self.assertEqual(
                    {
                        "mode": "service_identity",
                        "service": CLEANUP_OWNERS[table_name],
                        "audit_required": True,
                    },
                    cleanup["authorization"],
                )
                self.assertEqual(
                    {
                        "required": True,
                        "operations": ["archive", "delete"],
                        "key_columns": ["tenant_id", "organization_id", "id"],
                    },
                    cleanup["candidate_recheck"],
                )
                self.assertEqual(1000, cleanup["batch_size"])
                self.assertEqual(expected_predicate, cleanup["predicate"])
                self.assertTrue(cleanup["archive_before_delete"])
                self.assertEqual(5, cleanup["retry"]["max_attempts"])
                self.assertEqual("exponential", cleanup["retry"]["backoff"]["strategy"])
                self.assertEqual("1s", cleanup["retry"]["backoff"]["initial"])
                self.assertEqual("5m", cleanup["retry"]["backoff"]["maximum"])
                self.assertTrue(required_metrics.issubset(cleanup["monitoring"]["metrics"]))
                self.assertIn("retention_lag", cleanup["monitoring"]["alerts"])
                self.assertIn("retry_exhausted", cleanup["monitoring"]["alerts"])
                self.assertEqual(
                    {"supported": True, "default": True},
                    cleanup["dry_run"],
                )

    def test_ops_query_indexes_match_current_store_predicates_and_sort_keys(self) -> None:
        for table_name, (index_name, expected_columns) in OPS_QUERY_INDEXES.items():
            with self.subTest(table=table_name):
                indexes = {
                    item["name"]: item["columns"]
                    for item in self.tables[table_name]["indexes"]
                }
                self.assertEqual(expected_columns, indexes[index_name])

    def test_compiler_emits_lifecycle_and_ops_query_indexes_for_both_engines(self) -> None:
        expected_indexes = {
            **{
                table_name: (index_name, ["retention_until", "id"])
                for table_name, index_name in RETENTION_INDEXES.items()
            },
            **OPS_QUERY_INDEXES,
        }

        for dialect, sql in (
            ("postgres", self.compiler.compile_postgres()),
            ("sqlite", self.compiler.compile_sqlite()),
        ):
            for table_name, (index_name, columns) in expected_indexes.items():
                with self.subTest(dialect=dialect, table=table_name, index=index_name):
                    self.assertIn(
                        f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name} "
                        f"({', '.join(columns)});",
                        sql,
                    )

    def test_materialized_contract_preserves_lifecycle_policy(self) -> None:
        rendered = DatabaseContractMaterializer(ROOT, REGISTRY_PATH).render()
        contract = yaml.safe_load(rendered.schema_yaml)
        tables = {table["name"]: table for table in contract["tables"]}

        self.assertEqual(
            ROOT_MATERIALIZED_RETENTION_TABLES,
            set(RETENTION_INDEXES).intersection(tables),
        )
        for table_name in ROOT_MATERIALIZED_RETENTION_TABLES:
            with self.subTest(table=table_name):
                self.assertEqual(
                    self.tables[table_name]["lifecycle"],
                    tables[table_name]["lifecycle"],
                )

    def test_compiler_rejects_unsafe_cross_tenant_cleanup_contracts(self) -> None:
        cases = (
            (
                "missing scope",
                lambda table: table["lifecycle"]["cleanup"].pop("scope"),
                "cleanup.scope must be platform_cross_tenant",
            ),
            (
                "wrong service identity",
                lambda table: table["lifecycle"]["cleanup"]["authorization"].update(
                    {"service": "another-service"}
                ),
                "authorization.service must match cleanup owner",
            ),
            (
                "incomplete tenant recheck key",
                lambda table: table["lifecycle"]["cleanup"]["candidate_recheck"].update(
                    {"key_columns": ["tenant_id", "id"]}
                ),
                "candidate_recheck.key_columns must be tenant_id, organization_id, id",
            ),
            (
                "missing retention index",
                lambda table: table.update(
                    {
                        "indexes": [
                            index
                            for index in table["indexes"]
                            if index["columns"] != ["retention_until", "id"]
                        ]
                    }
                ),
                r"must define an index on \(retention_until, id\)",
            ),
        )

        for label, mutate, expected_error in cases:
            with self.subTest(case=label), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                table = copy.deepcopy(self.tables["ops_alert_event"])
                mutate(table)
                registry = root / "docs" / "schema-registry" / "registry.yaml"
                registry.parent.mkdir(parents=True)
                registry.write_text(
                    yaml.safe_dump(
                        {
                            "schema_registry": {
                                "common_column_groups": {
                                    "event_log": self.common_groups["event_log"]
                                }
                            },
                            "tables": [table],
                        },
                        sort_keys=False,
                    ),
                    encoding="utf-8",
                )

                with self.assertRaisesRegex(SchemaCompileError, expected_error):
                    SchemaCompiler(root, registry).compile_postgres()


if __name__ == "__main__":
    unittest.main()
