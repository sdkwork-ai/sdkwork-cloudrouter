from pathlib import Path
import unittest

from tools.schema_registry_loader import load_schema_registry


ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = ROOT / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
CATALOG_PATH = ROOT / "docs" / "schema-registry" / "table-catalog.md"


class SchemaTableCatalogDocTest(unittest.TestCase):
    def test_table_catalog_doc_covers_every_schema_registry_table(self) -> None:
        registry = load_schema_registry(REGISTRY_PATH)
        registry_tables = {
            table["table"]
            for table in registry.get("tables", [])
            if isinstance(table, dict) and isinstance(table.get("table"), str)
        }
        self.assertTrue(registry_tables, "schema registry must contain tables")

        content = CATALOG_PATH.read_text(encoding="utf-8")
        documented_tables = set()
        for line in content.splitlines():
            if not line.startswith("| `"):
                continue
            cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
            if len(cells) < 5:
                continue
            table_name = cells[0].strip("`")
            if table_name:
                documented_tables.add(table_name)

        self.assertEqual(registry_tables, documented_tables)

    def test_table_catalog_doc_records_schema_summary(self) -> None:
        registry = load_schema_registry(REGISTRY_PATH)
        table_count = len(
            [
                table
                for table in registry.get("tables", [])
                if isinstance(table, dict) and isinstance(table.get("table"), str)
            ]
        )
        content = CATALOG_PATH.read_text(encoding="utf-8")
        self.assertIn(f"- Table count: {table_count}", content)
        self.assertIn(
            "Generated from `docs/schema-registry/sdkwork-clawrouter.tables.yaml`.",
            content,
        )
        self.assertIn("- Server authority: PostgreSQL", content)

    def test_table_catalog_doc_adds_a_description_for_every_table(self) -> None:
        content = CATALOG_PATH.read_text(encoding="utf-8")
        undocumented = []
        for line in content.splitlines():
            if not line.startswith("| `"):
                continue
            cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
            if len(cells) < 5:
                continue
            table_name = cells[0].strip("`")
            description = cells[1]
            if not description or description in {"TBD", "TODO", "-"}:
                undocumented.append(table_name)

        self.assertFalse(
            undocumented,
            "table catalog rows must include table descriptions: "
            + ", ".join(undocumented),
        )

    def test_table_catalog_doc_excludes_retired_upstream_vocabulary(self) -> None:
        content = CATALOG_PATH.read_text(encoding="utf-8")
        for retired_name in (
            "ai_channel",
            "ai_provider",
            "ai_site",
            "ai_upstream_pool",
            "integration_provider_account",
            "integration_service_provider",
        ):
            self.assertNotIn(retired_name, content)


if __name__ == "__main__":
    unittest.main()
