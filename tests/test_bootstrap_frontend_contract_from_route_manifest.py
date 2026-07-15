import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from tools.bootstrap_frontend_contract_from_route_manifest import (
    FrontendContractBootstrapError,
    TARGETS,
    bootstrap_contract,
    main,
)


class BootstrapFrontendContractFromRouteManifestTest(unittest.TestCase):
    def write_app_manifest(self, root: Path, route: dict[str, object]) -> None:
        manifest_path = root / str(TARGETS[0]["manifest_path"])
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(
            json.dumps({"routes": [route]}),
            encoding="utf-8",
        )

    def test_refuses_to_invent_get_response_or_query_semantics(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self.write_app_manifest(
                root,
                {
                    "method": "GET",
                    "path": "/app/v3/api/ai/models",
                    "operationId": "models.list",
                    "tags": ["ai"],
                },
            )

            with self.assertRaises(FrontendContractBootstrapError) as context:
                bootstrap_contract(root)

            message = str(context.exception)
            self.assertIn("app GET /app/v3/api/ai/models", message)
            self.assertIn("operationId=models.list", message)
            self.assertIn("response_schema, read_sources, write_tables, query_parameters", message)
            self.assertIn("NoData", message)
            self.assertIn("docs/schema-registry/frontend-field-contracts/", message)

    def test_write_does_not_create_output_when_mutation_semantics_are_missing(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            output = root / "bootstrap-output.yaml"
            self.write_app_manifest(
                root,
                {
                    "method": "POST",
                    "path": "/app/v3/api/ai/models",
                    "operationId": "models.create",
                },
            )

            with patch.object(
                sys,
                "argv",
                [
                    "bootstrap_frontend_contract_from_route_manifest.py",
                    "--root",
                    str(root),
                    "--write",
                    "--output",
                    str(output),
                ],
            ):
                exit_code = main()

            self.assertEqual(1, exit_code)
            self.assertFalse(output.exists())

    def test_default_invocation_never_overwrites_curated_snapshot(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            snapshot = root / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
            snapshot.parent.mkdir(parents=True, exist_ok=True)
            snapshot.write_text("curated: true\n", encoding="utf-8")

            with patch.object(
                sys,
                "argv",
                ["bootstrap_frontend_contract_from_route_manifest.py", "--root", str(root)],
            ):
                exit_code = main()

            self.assertEqual(2, exit_code)
            self.assertEqual("curated: true\n", snapshot.read_text(encoding="utf-8"))

    def test_explicit_write_never_overwrites_existing_snapshot(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            output = root / "curated.yaml"
            output.write_text("curated: true\n", encoding="utf-8")

            with patch.object(
                sys,
                "argv",
                [
                    "bootstrap_frontend_contract_from_route_manifest.py",
                    "--root",
                    str(root),
                    "--write",
                    "--output",
                    str(output),
                ],
            ):
                exit_code = main()

            self.assertEqual(1, exit_code)
            self.assertEqual("curated: true\n", output.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
