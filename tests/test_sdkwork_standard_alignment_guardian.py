import json
import stat
import subprocess
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from tools.sdkwork_standard_alignment_guardian import SdkworkStandardAlignmentGuardian


class SdkworkStandardAlignmentGuardianTest(unittest.TestCase):
    REQUIRED_REPOSITORY_CONTRACTS = (
        "specs/README.md",
        "specs/component.spec.json",
        "specs/topology.spec.json",
        "specs/application-env-standard.md",
        "specs/database-store-migration.manifest.json",
        "specs/process-database-pool.spec.json",
    )

    REQUIRED_SHELLS = (
        "sdkwork-clawrouter-pc-shell",
        "sdkwork-clawrouter-pc-console-shell",
        "sdkwork-clawrouter-pc-admin-shell",
    )

    def write_json(self, root: Path, relative: str, payload: object) -> None:
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    def write_minimal_pc_packages(self, root: Path) -> None:
        for package_name in self.REQUIRED_SHELLS:
            npm_name = f"@sdkwork/{package_name.removeprefix('sdkwork-')}"
            self.write_json(
                root,
                f"apps/sdkwork-clawrouter-pc/packages/{package_name}/package.json",
                {"name": npm_name},
            )

    def write_repository_contracts(self, root: Path, *, omit: str | None = None) -> None:
        for relative in self.REQUIRED_REPOSITORY_CONTRACTS:
            if relative == omit:
                continue
            path = root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            if path.suffix == ".json":
                path.write_text("{}\n", encoding="utf-8")
            else:
                path.write_text("# Current repository contract\n", encoding="utf-8")

    def test_requires_current_repository_contract_set(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            missing = "specs/application-env-standard.md"
            self.write_repository_contracts(root, omit=missing)

            checks = SdkworkStandardAlignmentGuardian(root)._check_repository_contracts()
            contract_check = next(
                check for check in checks if check.id == "repository-contract-application-env-standard"
            )

            self.assertEqual("fail", contract_check.status)
            self.assertEqual("blocking", contract_check.severity)
            self.assertIn(missing, contract_check.message)

    def test_rejects_retired_repository_contracts(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.write_repository_contracts(root)
            retired = root / "specs/dependency-api-surfaces.json"
            retired.write_text("{}\n", encoding="utf-8")

            checks = SdkworkStandardAlignmentGuardian(root)._check_repository_contracts()
            retired_check = next(
                check for check in checks if check.id == "repository-contract-retired-dependency-api-surfaces"
            )

            self.assertEqual("fail", retired_check.status)
            self.assertEqual("blocking", retired_check.severity)
            self.assertIn("component.spec.json", retired_check.remediation)
            self.assertIn("generated/composition.resolved.json", retired_check.remediation)

    def test_rejects_unknown_root_repository_contract(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.write_repository_contracts(root)
            (root / "specs/old-api-contract.md").write_text(
                "# Retired\n", encoding="utf-8"
            )

            checks = SdkworkStandardAlignmentGuardian(root)._check_repository_contracts()
            exact_set = next(
                check for check in checks if check.id == "repository-contract-exact-set"
            )

            self.assertEqual("fail", exact_set.status)
            self.assertIn("specs/old-api-contract.md", exact_set.message)

    def test_rejects_repository_contract_directory_linked_outside_root(self) -> None:
        with tempfile.TemporaryDirectory() as directory, tempfile.TemporaryDirectory() as external:
            root = Path(directory)
            external_root = Path(external)
            self.write_repository_contracts(external_root)
            try:
                (root / "specs").symlink_to(external_root / "specs", target_is_directory=True)
            except OSError as error:
                self.skipTest(f"directory symlink unavailable: {error}")

            checks = SdkworkStandardAlignmentGuardian(root)._check_repository_contracts()
            exact_set = next(
                check for check in checks if check.id == "repository-contract-exact-set"
            )

            self.assertEqual("fail", exact_set.status)
            self.assertIn("repository-owned", exact_set.message)

    def test_rejects_windows_reparse_point_when_isjunction_is_unavailable(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            candidate = root / "etc/topology"
            candidate.mkdir(parents=True)
            guardian = SdkworkStandardAlignmentGuardian(root)
            real_lstat = Path.lstat

            def lstat_with_reparse_point(path: Path):
                result = real_lstat(path)
                if path == root / "etc":
                    return SimpleNamespace(
                        st_mode=result.st_mode,
                        st_file_attributes=stat.FILE_ATTRIBUTE_REPARSE_POINT,
                    )
                return result

            with patch.object(Path, "lstat", autospec=True, side_effect=lstat_with_reparse_point):
                self.assertTrue(guardian._path_has_link_component(candidate))

    def test_rejects_non_posix_repository_relative_paths(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "etc/topology").mkdir(parents=True)
            guardian = SdkworkStandardAlignmentGuardian(root)

            for relative in (
                "configs\\topology",
                "configs/./topology",
                "configs//topology",
                "etc/topology/",
                "C:etc/topology",
            ):
                with self.subTest(relative=relative):
                    self.assertIsNone(guardian._resolve_repository_path(relative))

    def test_root_component_spec_rejects_non_object_json(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            spec = root / "specs/component.spec.json"
            spec.parent.mkdir(parents=True, exist_ok=True)
            spec.write_text("[]\n", encoding="utf-8")

            checks = SdkworkStandardAlignmentGuardian(root)._check_root_component_specs()

            self.assertEqual("fail", checks[0].status)
            self.assertIn("JSON object", checks[0].message)

    def test_root_component_spec_rejects_forged_identity(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.write_json(
                root,
                "specs/component.spec.json",
                {
                    "schemaVersion": 999,
                    "kind": "forged",
                    "component": {"name": "other", "root": ".", "type": "app"},
                    "canonicalSpecs": [
                        {
                            "file": file,
                            "path": f"../sdkwork-specs/{file}",
                            "purpose": "forged",
                        }
                        for file in SdkworkStandardAlignmentGuardian.REQUIRED_ROOT_CANONICAL_SPECS
                    ],
                },
            )

            checks = SdkworkStandardAlignmentGuardian(root)._check_root_component_specs()

            self.assertEqual("fail", checks[0].status)
            self.assertIn("schemaVersion", checks[0].message)

    def write_store_migration_manifest(
        self,
        root: Path,
        *,
        store_paths: list[str],
        active_store_files: int,
        tables: list[str] | None = None,
    ) -> None:
        self.write_json(
            root,
            "specs/database-store-migration.manifest.json",
            {
                "schemaVersion": 3,
                "kind": "sdkwork.database-store-migration",
                "application": "sdkwork-clawrouter",
                "authority": "../sdkwork-specs/DATABASE_SPEC.md",
                "databaseRole": "authoritative-server",
                "engines": ["postgres"],
                "storeInventory": {
                    "path": "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres",
                    "glob": "**/*_store.rs",
                },
                "capabilities": [
                    {
                        "capability": "example",
                        "targetCrate": "crates/sdkwork-clawrouter-example-repository-sqlx",
                        "storePaths": store_paths,
                        "tables": tables or ["example_item"],
                        "priority": "HIGH",
                        "migrationOrder": 1,
                    }
                ],
                "inventoryStats": {
                    "activeStoreFiles": active_store_files,
                    "coveredStoreFiles": len(store_paths),
                    "capabilityGroups": 1,
                    "logicalStores": active_store_files,
                },
            },
        )

    def write_postgres_store(self, root: Path, name: str = "example_store.rs") -> str:
        relative = (
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/"
            + name
        )
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("// PostgreSQL store fixture\n", encoding="utf-8")
        return relative

    def test_database_store_manifest_rejects_untracked_postgres_store(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            tracked = self.write_postgres_store(root)
            self.write_postgres_store(root, "untracked_store.rs")
            self.write_store_migration_manifest(
                root, store_paths=[tracked], active_store_files=2
            )

            checks = SdkworkStandardAlignmentGuardian(root)._check_database_store_migration()

            self.assertEqual("fail", checks[0].status)
            self.assertIn("untracked PostgreSQL stores", checks[0].message)

    def test_database_store_manifest_accepts_exact_postgres_coverage(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            store = self.write_postgres_store(root)
            self.write_store_migration_manifest(
                root, store_paths=[store], active_store_files=1
            )

            checks = SdkworkStandardAlignmentGuardian(root)._check_database_store_migration()

            self.assertEqual("pass", checks[0].status)

    def test_database_store_manifest_rejects_duplicate_store_path(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            store = self.write_postgres_store(root)
            self.write_store_migration_manifest(
                root, store_paths=[store, store], active_store_files=1
            )

            checks = SdkworkStandardAlignmentGuardian(root)._check_database_store_migration()

            self.assertEqual("fail", checks[0].status)
            self.assertIn("duplicate store paths", checks[0].message)

    def test_database_store_manifest_rejects_noncanonical_inventory_scope(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            store = self.write_postgres_store(root)
            self.write_store_migration_manifest(
                root, store_paths=[store], active_store_files=1
            )
            manifest_path = root / "specs/database-store-migration.manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["storeInventory"]["path"] = "services"
            manifest_path.write_text(json.dumps(manifest) + "\n", encoding="utf-8")

            checks = SdkworkStandardAlignmentGuardian(root)._check_database_store_migration()

            self.assertEqual("fail", checks[0].status)
            self.assertIn("storeInventory.path", checks[0].message)

    def test_database_store_manifest_rejects_non_object_root(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            manifest = root / "specs/database-store-migration.manifest.json"
            manifest.parent.mkdir(parents=True, exist_ok=True)
            manifest.write_text("[]\n", encoding="utf-8")

            checks = SdkworkStandardAlignmentGuardian(root)._check_database_store_migration()

            self.assertEqual("fail", checks[0].status)
            self.assertIn("JSON object", checks[0].message)

    def test_database_store_manifest_rejects_boolean_statistics(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            store = self.write_postgres_store(root)
            self.write_store_migration_manifest(
                root, store_paths=[store], active_store_files=1
            )
            manifest_path = root / "specs/database-store-migration.manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["inventoryStats"]["activeStoreFiles"] = True
            manifest_path.write_text(json.dumps(manifest) + "\n", encoding="utf-8")

            checks = SdkworkStandardAlignmentGuardian(root)._check_database_store_migration()

            self.assertEqual("fail", checks[0].status)
            self.assertIn("inventoryStats", checks[0].message)

    def test_database_store_manifest_rejects_sqlite_authority(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            store = self.write_postgres_store(root)
            self.write_store_migration_manifest(
                root, store_paths=[store], active_store_files=1
            )
            manifest_path = root / "specs/database-store-migration.manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["engines"] = ["postgres", "sqlite"]
            manifest_path.write_text(json.dumps(manifest) + "\n", encoding="utf-8")

            checks = SdkworkStandardAlignmentGuardian(root)._check_database_store_migration()

            self.assertEqual("fail", checks[0].status)
            self.assertIn("engines", checks[0].message)

    def test_database_store_manifest_rejects_retired_upstream_tables(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            store = self.write_postgres_store(root)
            self.write_store_migration_manifest(
                root,
                store_paths=[store],
                active_store_files=1,
                tables=["ai_channel"],
            )

            checks = SdkworkStandardAlignmentGuardian(root)._check_database_store_migration()

            self.assertEqual("fail", checks[0].status)
            self.assertIn("retired upstream tables", checks[0].message)

    def test_accepts_v5_standalone_production_profile_from_topology_authority(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.write_minimal_pc_packages(root)
            self.write_json(
                root,
                "specs/topology.spec.json",
                {
                    "schemaVersion": 5,
                    "kind": "sdkwork.app.topology",
                    "defaults": {"productionProfileId": "cloud.production"},
                    "profileFiles": {
                        "standalone.production": "etc/topology/standalone.production.env",
                        "cloud.production": "etc/topology/cloud.production.env",
                    },
                },
            )
            profile = root / "etc/topology/standalone.production.env"
            profile.parent.mkdir(parents=True, exist_ok=True)
            profile.write_text(
                "SDKWORK_CLAW_ROUTER_PROFILE_ID=standalone.production\n",
                encoding="utf-8",
            )

            deployment_check = (
                SdkworkStandardAlignmentGuardian(root)._check_standalone_production_profile()
            )

            self.assertEqual("pass", deployment_check.status)
            self.assertIn("standalone.production", deployment_check.message)

    def test_rejects_legacy_profile_not_declared_by_topology_authority(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.write_minimal_pc_packages(root)
            self.write_json(
                root,
                "specs/topology.spec.json",
                {
                    "schemaVersion": 5,
                    "kind": "sdkwork.app.topology",
                    "profileFiles": {
                        "standalone.production": "etc/topology/standalone.production.env"
                    },
                },
            )
            legacy_profile = (
                root / "etc/topology/standalone.unified-process.production.env"
            )
            legacy_profile.parent.mkdir(parents=True, exist_ok=True)
            legacy_profile.write_text(
                "SDKWORK_CLAW_ROUTER_PROFILE_ID=standalone.unified-process.production\n",
                encoding="utf-8",
            )

            deployment_check = (
                SdkworkStandardAlignmentGuardian(root)._check_standalone_production_profile()
            )

            self.assertEqual("fail", deployment_check.status)
            self.assertIn("etc/topology/standalone.production.env", deployment_check.remediation)

    def test_rejects_declared_three_segment_legacy_profile(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            legacy_relative = "etc/topology/standalone.unified-process.production.env"
            self.write_json(
                root,
                "specs/topology.spec.json",
                {
                    "schemaVersion": 5,
                    "kind": "sdkwork.app.topology",
                    "profileFiles": {
                        "standalone.unified-process.production": legacy_relative
                    },
                },
            )
            profile = root / legacy_relative
            profile.parent.mkdir(parents=True, exist_ok=True)
            profile.write_text(
                "SDKWORK_CLAW_ROUTER_PROFILE_ID=standalone.unified-process.production\n",
                encoding="utf-8",
            )

            deployment_check = (
                SdkworkStandardAlignmentGuardian(root)._check_standalone_production_profile()
            )

            self.assertEqual("fail", deployment_check.status)
            self.assertIn("exactly two", deployment_check.message)

    def test_topology_check_runs_when_pc_packages_are_absent(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.write_json(
                root,
                "specs/topology.spec.json",
                {
                    "schemaVersion": 5,
                    "kind": "sdkwork.app.topology",
                    "profileFiles": {
                        "standalone.production": "etc/topology/standalone.production.env"
                    },
                },
            )
            (root / "Cargo.toml").write_text("[workspace]\n", encoding="utf-8")
            self.write_json(root, "sdkwork.workflow.json", {"dependencies": []})
            self.write_json(root, "specs/component.spec.json", {"canonicalSpecs": []})

            result = SdkworkStandardAlignmentGuardian(root).run()
            deployment_check = next(
                check for check in result.checks if check.id == "deployment-standalone-profile"
            )

            self.assertEqual("fail", deployment_check.status)
            self.assertIn("etc/topology/standalone.production.env", deployment_check.remediation)

    def test_topology_rejects_non_object_json_root(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            spec = root / "specs/topology.spec.json"
            spec.parent.mkdir(parents=True, exist_ok=True)
            spec.write_text("[]\n", encoding="utf-8")

            deployment_check = (
                SdkworkStandardAlignmentGuardian(root)._check_standalone_production_profile()
            )

            self.assertEqual("fail", deployment_check.status)
            self.assertIn("JSON object", deployment_check.message)

    def test_topology_rejects_profile_directory_linked_outside_root(self) -> None:
        with tempfile.TemporaryDirectory() as directory, tempfile.TemporaryDirectory() as external:
            root = Path(directory)
            external_root = Path(external)
            self.write_json(
                root,
                "specs/topology.spec.json",
                {
                    "schemaVersion": 5,
                    "kind": "sdkwork.app.topology",
                    "profileFiles": {
                        "standalone.production": "etc/topology/standalone.production.env"
                    },
                },
            )
            external_profile = external_root / "standalone.production.env"
            external_profile.write_text(
                "SDKWORK_CLAW_ROUTER_PROFILE_ID=standalone.production\n",
                encoding="utf-8",
            )
            (root / "configs").mkdir(parents=True, exist_ok=True)
            try:
                (root / "etc/topology").symlink_to(external_root, target_is_directory=True)
            except OSError as error:
                self.skipTest(f"directory symlink unavailable: {error}")

            deployment_check = (
                SdkworkStandardAlignmentGuardian(root)._check_standalone_production_profile()
            )

            self.assertEqual("fail", deployment_check.status)
            self.assertIn("repository-owned", deployment_check.message)


if __name__ == "__main__":
    unittest.main()
