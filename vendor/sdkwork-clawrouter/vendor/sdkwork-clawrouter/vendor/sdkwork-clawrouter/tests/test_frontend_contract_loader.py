import tempfile
import textwrap
import unittest
from pathlib import Path

from tools.frontend_contract_loader import (
    FrontendFieldContractCompiler,
    compile_frontend_field_contract,
    default_frontend_contract_path,
    load_frontend_field_contract,
)


class FrontendContractLoaderTest(unittest.TestCase):
    def write_file(self, root: Path, relative_path: str, content: str) -> Path:
        path = root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return path

    def write_modular_contract(self, root: Path) -> Path:
        self.write_file(
            root,
            "docs/schema-registry/frontend-field-contracts/shared/entities.yaml",
            """
            fragment: shared/entities
            x_response_entities:
              DemoEntity:
                table: demo_table
                fields:
                  id: { column: id }
            """,
        )
        self.write_file(
            root,
            "docs/schema-registry/frontend-field-contracts/routes/demo.yaml",
            """
            fragment: routes/demo
            routes:
              - route: /demo
                required_tables: [demo_table]
            """,
        )
        self.write_file(
            root,
            "docs/schema-registry/frontend-field-contracts/operations/demo.yaml",
            """
            fragment: operations/demo
            frontend_operations:
              - route: /demo
                source: apps/sdkwork-clawrouter-pc/packages/demo/src/demoService.ts
                operation: fetchDemo
                kind: read
                api_surface: app
                api_method: GET
                api_path: /app/v3/api/demo
                read_sources: [demo_table]
            """,
        )
        return self.write_file(
            root,
            "docs/schema-registry/frontend-field-contracts/index.yaml",
            """
            schema: sdkwork-clawrouter-frontend-field-contracts
            version: 0.1.0
            source: apps/sdkwork-clawrouter-pc/src/App.tsx
            rule: every actual portal route must be backed by explicit schema tables.
            fragments:
              - shared/entities.yaml
              - routes/demo.yaml
              - operations/demo.yaml
            """,
        )

    def test_compiles_modular_contract_fragments(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_modular_contract(root)

            contract = compile_frontend_field_contract(root)

            self.assertEqual("sdkwork-clawrouter-frontend-field-contracts", contract["schema"])
            self.assertIn("DemoEntity", contract["x_response_entities"])
            self.assertEqual("/demo", contract["routes"][0]["route"])
            self.assertEqual("fetchDemo", contract["frontend_operations"][0]["operation"])
            self.assertEqual([], contract["frontend_models"])

    def test_default_path_prefers_modular_index_over_stale_snapshot(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "docs/schema-registry/frontend-field-contracts.yaml",
                """
                routes:
                  - route: /stale
                    required_tables: [stale_table]
                frontend_operations: []
                """,
            )
            index = self.write_modular_contract(root)

            selected_path = default_frontend_contract_path(root)
            contract = load_frontend_field_contract(root)

            self.assertEqual(index.resolve(), selected_path)
            self.assertEqual("/demo", contract["routes"][0]["route"])

    def test_compiler_check_reports_stale_snapshot_when_index_exists(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "docs/schema-registry/frontend-field-contracts.yaml",
                """
                routes:
                  - route: /stale
                    required_tables: [stale_table]
                frontend_operations: []
                """,
            )
            self.write_modular_contract(root)

            result = FrontendFieldContractCompiler(root=root).check()

            self.assertFalse(result.ok)
            self.assertIn(
                f"frontend field contract snapshot is stale: {root / 'docs' / 'schema-registry' / 'frontend-field-contracts.yaml'}",
                result.messages,
            )


if __name__ == "__main__":
    unittest.main()
