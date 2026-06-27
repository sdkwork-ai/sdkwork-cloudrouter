import tempfile
import textwrap
import unittest
from pathlib import Path

from tools.java_legacy_contract_audit import JavaLegacyContractAudit


class JavaLegacyContractAuditTest(unittest.TestCase):
    def write_registry(self, root: Path, content: str) -> Path:
        registry = root / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
        registry.parent.mkdir(parents=True, exist_ok=True)
        registry.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return registry

    def write_java(self, root: Path, relative_path: str, content: str) -> Path:
        source = root / "legacy-java-plus-entity" / "src" / "main" / "java" / relative_path
        source.parent.mkdir(parents=True, exist_ok=True)
        source.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return source

    def test_generates_legacy_contract_audit_from_java_entity_columns(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                legacy_java_contracts:
                  finance_and_trade:
                    order:
                      entities:
                        plus_order: com.example.PlusOrder
                tables:
                  - table: plus_order
                    domain: legacy
                    generated_by_this_project: false
                """,
            )
            self.write_java(
                root,
                "com/example/PlusOrder.java",
                """
                package com.example;
                import jakarta.persistence.*;
                @Entity
                @Table(name = "plus_order")
                public class PlusOrder {
                    @Column(name = "order_sn")
                    private String orderSn;
                    @Column
                    private String subject;
                    @ManyToOne
                    @JoinColumn(name = "category_id")
                    private Object category;
                }
                """,
            )

            audit = JavaLegacyContractAudit(root=root, registry_path=registry).generate()

            table = audit["tables"][0]
            self.assertEqual("plus_order", table["table"])
            self.assertEqual("com.example.PlusOrder", table["entity"])
            self.assertEqual("plus_order", table["java_table_name"])
            self.assertEqual(["order_sn", "subject", "category_id"], table["declared_columns"])
            self.assertEqual(1, audit["summary"]["audited_table_count"])

    def test_reports_java_table_name_mismatch(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: platform_app
                    domain: legacy
                    java_contract:
                      entity: com.example.PlusApp
                """,
            )
            self.write_java(
                root,
                "com/example/PlusApp.java",
                """
                package com.example;
                import jakarta.persistence.*;
                @Entity
                @Table(name = "wrong_app")
                public class PlusApp {
                    @Column(name = "name")
                    private String name;
                }
                """,
            )

            result = JavaLegacyContractAudit(root=root, registry_path=registry).validate()

            self.assertFalse(result.ok)
            self.assertIn("platform_app Java @Table name mismatch: expected platform_app, found wrong_app", result.messages)

    def test_check_reports_stale_generated_audit(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            registry = self.write_registry(
                root,
                """
                tables:
                  - table: platform_app
                    domain: legacy
                    java_contract:
                      entity: com.example.PlusApp
                """,
            )
            self.write_java(
                root,
                "com/example/PlusApp.java",
                """
                package com.example;
                import jakarta.persistence.*;
                @Table(name = "platform_app")
                public class PlusApp {
                    @Column(name = "name")
                    private String name;
                }
                """,
            )
            output = JavaLegacyContractAudit(root=root, registry_path=registry).write()
            output.write_text("{}\n", encoding="utf-8")

            result = JavaLegacyContractAudit(root=root, registry_path=registry).check()

            self.assertFalse(result.ok)
            self.assertIn(f"java legacy contract audit is stale: {output}", result.messages)


if __name__ == "__main__":
    unittest.main()
