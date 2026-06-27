import re
import unittest
from pathlib import Path

from tools.schema_registry_loader import load_schema_registry


ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = ROOT / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
COMMERCE_MIGRATION = (
    ROOT.parent
    / "sdkwork-commerce"
    / "crates"
    / "sdkwork-commerce-storage-repository-sqlx"
    / "migrations"
    / "0001_commerce_foundation.sql"
)

PAYMENT_TRANSIT_TABLES = {
    "commerce_payment_provider_capability",
    "commerce_payment_operation_attempt",
    "commerce_payment_route_decision",
    "commerce_payment_capture",
    "commerce_payment_webhook_delivery",
    "commerce_payment_statement",
    "commerce_payment_statement_item",
    "commerce_payment_reconciliation_item",
    "commerce_payment_fee",
    "commerce_payment_dispute",
    "commerce_payment_dispute_event",
    "commerce_refund_item",
    "commerce_refund_attempt",
    "commerce_refund_event",
}


def _registry_tables() -> dict[str, dict]:
    registry = load_schema_registry(REGISTRY_PATH)
    return {table["table"]: table for table in registry["tables"]}


class PaymentTransitSchemaContractTest(unittest.TestCase):
    def test_payment_transit_tables_are_registered_as_appbase_owned(self) -> None:
        tables = _registry_tables()
        missing = sorted(PAYMENT_TRANSIT_TABLES - tables.keys())
        self.assertEqual([], missing)

        for table_name in PAYMENT_TRANSIT_TABLES:
            table = tables[table_name]
            self.assertEqual("commerce", table["domain"], table_name)
            self.assertEqual("appbase_standard", table["profile"], table_name)
            self.assertIs(table["system_of_record"], True, table_name)
            self.assertEqual("sdkwork-appbase-commerce", table["write_owner"], table_name)
            self.assertIs(table["generated_by_this_project"], False, table_name)
            self.assertIn("tenant_id", table["not_null_columns"], table_name)
            self.assertIn("id", table["columns"], table_name)

    def test_payment_transit_tables_are_in_commerce_foundation_migration(self) -> None:
        migration = COMMERCE_MIGRATION.read_text(encoding="utf-8")
        for table_name in sorted(PAYMENT_TRANSIT_TABLES):
            self.assertIn(
                f"CREATE TABLE IF NOT EXISTS {table_name}",
                migration,
                f"{table_name} must be physically declared in the commerce foundation migration",
            )

        self.assertNotIn(
            "commerce_payment_provider_operation_attempt",
            migration,
            "provider operation attempts must use the shorter commerce_payment_operation_attempt table name",
        )

    def test_payment_transit_indexes_use_bounded_identifiers(self) -> None:
        migration = COMMERCE_MIGRATION.read_text(encoding="utf-8")
        index_names = re.findall(r"CREATE\s+(?:UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+([a-zA-Z0-9_]+)", migration)
        self.assertTrue(index_names)
        too_long = sorted(name for name in index_names if len(name) > 63)
        self.assertEqual([], too_long)

        for expected in [
            "uk_commerce_payment_operation_attempt_no",
            "uk_commerce_payment_operation_attempt_idempotency",
            "idx_commerce_payment_operation_attempt_resource",
            "uk_commerce_payment_webhook_delivery_event",
            "uk_commerce_payment_webhook_delivery_nonce",
            "idx_commerce_payment_reconciliation_item_run_status",
        ]:
            self.assertIn(expected, index_names)


if __name__ == "__main__":
    unittest.main()
