import json
import tempfile
import textwrap
import unittest
from pathlib import Path

from tools.frontend_static_source_manifest import FrontendStaticSourceManifest


class FrontendStaticSourceManifestTest(unittest.TestCase):
    def write_file(self, root: Path, relative_path: str, content: str) -> Path:
        path = root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return path

    def write_snapshots(self, root: Path, content: str) -> Path:
        path = root / "docs" / "schema-registry" / "frontend-static-source-snapshots.yaml"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
        return path

    def test_generates_static_source_manifest_with_source_hashes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/data.ts",
                """
                export const demoContent = [{ title: 'Demo' }];
                """,
            )
            snapshots = self.write_snapshots(
                root,
                """
                schema: sdkwork-clawrouter-frontend-static-source-snapshots
                version: 1
                snapshots:
                  - id: static-route:/demo
                    route: /demo
                    mode: curated_seed_content
                    source_ref: apps/sdkwork-clawrouter-pc/packages/demo/src/data.ts
                    observed_at: "2026-05-03"
                    schema_tables: [content_demo]
                """,
            )

            manifest = FrontendStaticSourceManifest(root=root, snapshots_path=snapshots).generate()

            snapshot = manifest["snapshots"]["static-route:/demo"]
            self.assertEqual("sdkwork-clawrouter-frontend-static-source-manifest", manifest["schema"])
            self.assertEqual(1, manifest["version"])
            self.assertEqual("/demo", snapshot["route"])
            self.assertEqual("curated_seed_content", snapshot["mode"])
            self.assertRegex(snapshot["source_hash"], r"^sha256:[0-9a-f]{64}$")
            self.assertEqual(["content_demo"], snapshot["schema_tables"])

    def test_check_reports_stale_generated_static_source_manifest(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_file(
                root,
                "apps/sdkwork-clawrouter-pc/packages/demo/src/data.ts",
                """
                export const demoContent = [];
                """,
            )
            snapshots = self.write_snapshots(
                root,
                """
                schema: sdkwork-clawrouter-frontend-static-source-snapshots
                version: 1
                snapshots:
                  - id: static-route:/demo
                    route: /demo
                    mode: curated_seed_content
                    source_ref: apps/sdkwork-clawrouter-pc/packages/demo/src/data.ts
                    observed_at: "2026-05-03"
                    schema_tables: [content_demo]
                """,
            )
            output = root / "generated" / "schema" / "frontend" / "frontend-static-source-manifest.json"
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(json.dumps({"schema": "stale"}, indent=2) + "\n", encoding="utf-8")

            result = FrontendStaticSourceManifest(root=root, snapshots_path=snapshots).check(output)

            self.assertFalse(result.ok)
            self.assertIn(f"frontend static source manifest is stale: {output}", result.messages)

    def test_validate_rejects_duplicate_snapshot_ids_and_invalid_source_ref(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            snapshots = self.write_snapshots(
                root,
                """
                schema: sdkwork-clawrouter-frontend-static-source-snapshots
                version: 1
                snapshots:
                  - id: static-route:/demo
                    route: /demo
                    mode: curated_seed_content
                    source_ref: ../outside.ts
                    observed_at: "2026-05-03"
                    schema_tables: [content_demo]
                  - id: static-route:/demo
                    route: /demo-copy
                    mode: curated_seed_content
                    source_ref: missing.ts
                    observed_at: "2026-05-03"
                    schema_tables: [content_demo]
                """,
            )

            result = FrontendStaticSourceManifest(root=root, snapshots_path=snapshots).validate()

            self.assertFalse(result.ok)
            self.assertIn("frontend static source snapshot has duplicate id: static-route:/demo", result.messages)
            self.assertIn(
                "frontend static source snapshot static-route:/demo source_ref must be a repo-relative path",
                result.messages,
            )
            self.assertIn(
                "frontend static source snapshot static-route:/demo source_ref does not exist: missing.ts",
                result.messages,
            )


if __name__ == "__main__":
    unittest.main()
