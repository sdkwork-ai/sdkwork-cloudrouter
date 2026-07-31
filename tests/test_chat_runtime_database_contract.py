from pathlib import Path
import re
import unittest

import yaml


ROOT = Path(__file__).resolve().parents[1]
CHAT_FRAGMENT = ROOT / "docs" / "schema-registry" / "tables" / "ai-chat-runtime.yaml"
MATERIALIZED_CONTRACT = ROOT / "database" / "contract" / "schema.yaml"
DATABASE_MANIFEST = ROOT / "database" / "database.manifest.json"
POSTGRES_BASELINE = (
    ROOT / "database" / "ddl" / "baseline" / "postgres" / "0001_clawrouter_baseline.sql"
)
POSTGRES_MIGRATION = (
    ROOT / "database" / "migrations" / "postgres" / "0004_add_chat_runtime_schema.up.sql"
)
POSTGRES_OPTIONAL_COST_MIGRATION = (
    ROOT
    / "database"
    / "migrations"
    / "postgres"
    / "0006_align_chat_runtime_optional_cost.up.sql"
)

CHAT_RUNTIME_TABLES = {
    "ai_chat_conversation",
    "ai_chat_turn",
    "ai_chat_item",
    "ai_chat_message",
    "ai_chat_message_part",
    "ai_chat_context_snapshot",
    "ai_runtime_invocation",
    "ai_runtime_usage_link",
}

CRITICAL_UNIQUE_INDEXES = {
    "ai_chat_conversation": "uk_ai_chat_conversation_scope_code",
    "ai_chat_turn": "uk_ai_chat_turn_scope_conversation_no",
    "ai_chat_item": "uk_ai_chat_item_scope_conversation_sequence",
    "ai_chat_message": "uk_ai_chat_message_scope_conversation_no",
    "ai_chat_message_part": "uk_ai_chat_message_part_scope_message_no",
    "ai_chat_context_snapshot": "uk_ai_chat_context_snapshot_scope_turn_no",
    "ai_runtime_invocation": "uk_ai_runtime_invocation_scope_uuid",
    "ai_runtime_usage_link": "uk_ai_runtime_usage_link_scope_uuid",
}


def load_yaml(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def normalize_sql(value: str) -> str:
    return " ".join(value.split())


def create_table_body(sql: str, table_name: str) -> str:
    match = re.search(
        rf"CREATE TABLE IF NOT EXISTS {re.escape(table_name)}\s*\((.*?)\n\);",
        sql,
        flags=re.DOTALL,
    )
    if match is None:
        raise AssertionError(f"missing CREATE TABLE for {table_name}")
    return normalize_sql(match.group(1))


def table_indexes(sql: str, table_name: str) -> set[str]:
    return {
        normalize_sql(match.group(0))
        for match in re.finditer(
            rf"CREATE (?:UNIQUE )?INDEX IF NOT EXISTS [^\n]+ ON {re.escape(table_name)}\s*\([^;]+;",
            sql,
        )
    }


class ChatRuntimeDatabaseContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.fragment = load_yaml(CHAT_FRAGMENT)
        cls.contract = load_yaml(MATERIALIZED_CONTRACT)
        cls.baseline_sql = POSTGRES_BASELINE.read_text(encoding="utf-8")
        cls.migration_sql = POSTGRES_MIGRATION.read_text(encoding="utf-8")
        cls.optional_cost_migration_sql = POSTGRES_OPTIONAL_COST_MIGRATION.read_text(
            encoding="utf-8"
        )

    def test_fragment_declares_exactly_the_eight_user_scoped_authorities(self) -> None:
        tables = {table["table"]: table for table in self.fragment["tables"]}
        self.assertEqual(CHAT_RUNTIME_TABLES, set(tables))
        for table_name, table in tables.items():
            self.assertEqual("user_entity", table["profile"], table_name)
            self.assertEqual("user_runtime_entity", table["common_columns"], table_name)
            self.assertTrue(table["system_of_record"], table_name)

    def test_materialized_contract_preserves_subject_scope_and_unique_sequences(self) -> None:
        tables = {table["name"]: table for table in self.contract["tables"]}
        self.assertTrue(CHAT_RUNTIME_TABLES.issubset(tables))
        for table_name in CHAT_RUNTIME_TABLES:
            table = tables[table_name]
            self.assertEqual("user_entity", table["profile"], table_name)
            for column_name in ("tenant_id", "organization_id", "user_id"):
                column = table["columns"][column_name]
                self.assertEqual("int64", column["type"], f"{table_name}.{column_name}")
                self.assertTrue(column["required"], f"{table_name}.{column_name}")
            index_names = {index["name"] for index in table["indexes"]}
            self.assertIn(CRITICAL_UNIQUE_INDEXES[table_name], index_names, table_name)

        for table_name in ("ai_chat_turn", "ai_runtime_usage_link"):
            cost_amount = tables[table_name]["columns"]["cost_amount"]
            self.assertEqual("NUMERIC(38, 12)", cost_amount["postgres_type"])
            self.assertFalse(cost_amount["required"])

    def test_folded_baseline_includes_the_forward_optional_cost_alignment(self) -> None:
        for table_name in ("ai_chat_turn", "ai_runtime_usage_link"):
            baseline_body = create_table_body(self.baseline_sql, table_name)
            original_migration_body = create_table_body(self.migration_sql, table_name)

            self.assertIn("cost_amount NUMERIC(38, 12),", baseline_body, table_name)
            self.assertNotIn("cost_amount NUMERIC(38, 12) NOT NULL", baseline_body, table_name)
            self.assertIn(
                "cost_amount NUMERIC(38, 12) NOT NULL DEFAULT 0",
                original_migration_body,
                table_name,
            )
            self.assertIn(
                f"ALTER TABLE {table_name}",
                self.optional_cost_migration_sql,
                table_name,
            )
            self.assertIn(
                "ALTER COLUMN cost_amount DROP NOT NULL",
                self.optional_cost_migration_sql,
                table_name,
            )

        self.assertIn(
            "(cost_amount IS NULL OR cost_amount >= 0)",
            create_table_body(self.baseline_sql, "ai_chat_turn"),
        )
        self.assertIn(
            "(cost_amount IS NULL OR cost_amount >= 0)",
            create_table_body(self.baseline_sql, "ai_runtime_usage_link"),
        )

    def test_original_chat_migration_owns_all_chat_tables_and_indexes(self) -> None:
        for table_name in CHAT_RUNTIME_TABLES:
            create_table_body(self.migration_sql, table_name)
            migration_indexes = table_indexes(self.migration_sql, table_name)
            baseline_indexes = table_indexes(self.baseline_sql, table_name)
            self.assertEqual(baseline_indexes, migration_indexes, table_name)

    def test_migration_is_transactional_bounded_and_fails_closed_on_partial_schema(self) -> None:
        for expected in (
            "-- transactional: true",
            "-- reversible: false",
            "SET LOCAL lock_timeout = '2s'",
            "SET LOCAL statement_timeout = '5min'",
            "IF present_table_count NOT IN (0, 8)",
            "IF required_column_count <> 10 OR required_index_count <> 7",
            "BEGIN;",
            "COMMIT;",
        ):
            self.assertIn(expected, self.migration_sql)


if __name__ == "__main__":
    unittest.main()
