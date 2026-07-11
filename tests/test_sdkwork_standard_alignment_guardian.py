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
            candidate = root / "configs/topology"
            candidate.mkdir(parents=True)
            guardian = SdkworkStandardAlignmentGuardian(root)
            real_lstat = Path.lstat

            def lstat_with_reparse_point(path: Path):
                result = real_lstat(path)
                if path == root / "configs":
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
            (root / "configs/topology").mkdir(parents=True)
            guardian = SdkworkStandardAlignmentGuardian(root)

            for relative in (
                "configs\\topology",
                "configs/./topology",
                "configs//topology",
                "configs/topology/",
                "C:configs/topology",
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
        legacy_paths: list[str],
        legacy_store_files: int,
    ) -> None:
        self.write_json(
            root,
            "specs/database-store-migration.manifest.json",
            {
                "schemaVersion": 2,
                "kind": "sdkwork.database-store-migration",
                "application": "sdkwork-clawrouter",
                "authority": "../sdkwork-specs/DATABASE_SPEC.md",
                "legacyInventory": {
                    "path": "services/sdkwork-clawrouter-router-service/src/infrastructure/sql",
                    "glob": "**/*_store.rs",
                },
                "capabilities": [
                    {
                        "capability": "example",
                        "crate": "crates/sdkwork-clawrouter-example-repository-sqlx",
                        "portPaths": [
                            "services/sdkwork-clawrouter-router-service/src/ports/example_store.rs"
                        ],
                        "legacyPaths": legacy_paths,
                        "tables": ["example_item"],
                        "status": "PENDING",
                        "priority": "HIGH",
                        "migrationOrder": 1,
                        "parityTests": ["tests/example_store_parity.rs"],
                        "rollback": "restore composition to the legacy port adapter before deleting it",
                    }
                ],
                "migrationStats": {
                    "legacyStoreFiles": legacy_store_files,
                    "coveredLegacyStoreFiles": len(legacy_paths),
                    "currentDialectPairs": legacy_store_files // 2,
                    "migratedCapabilities": 0,
                    "pendingCapabilities": 1,
                    "pendingCapabilityGroups": 1,
                    "pendingLogicalStores": 1,
                    "migratedLogicalStores": 0,
                    "totalLogicalStores": 1,
                    "completionPercentage": 0.0,
                },
            },
        )

    def write_empty_store_migration_manifest(self, root: Path) -> None:
        (
            root
            / "services/sdkwork-clawrouter-router-service/src/infrastructure/sql"
        ).mkdir(parents=True, exist_ok=True)
        self.write_json(
            root,
            "specs/database-store-migration.manifest.json",
            {
                "schemaVersion": 2,
                "kind": "sdkwork.database-store-migration",
                "application": "sdkwork-clawrouter",
                "authority": "../sdkwork-specs/DATABASE_SPEC.md",
                "legacyInventory": {
                    "path": "services/sdkwork-clawrouter-router-service/src/infrastructure/sql",
                    "glob": "**/*_store.rs",
                },
                "capabilities": [],
                "migrationStats": {
                    "legacyStoreFiles": 0,
                    "coveredLegacyStoreFiles": 0,
                    "currentDialectPairs": 0,
                    "migratedCapabilities": 0,
                    "pendingCapabilities": 0,
                    "pendingCapabilityGroups": 0,
                    "pendingLogicalStores": 0,
                    "migratedLogicalStores": 0,
                    "totalLogicalStores": 0,
                    "completionPercentage": 100.0,
                },
            },
        )

    def write_active_repository_crate(self, root: Path, capability: str = "example") -> str:
        package_name = f"sdkwork-clawrouter-{capability}-repository-sqlx"
        relative = f"crates/{package_name}"
        crate = root / relative
        crate.mkdir(parents=True, exist_ok=True)
        (crate / "Cargo.toml").write_text(
            f'[package]\nname = "{package_name}"\nversion = "0.1.0"\nedition = "2021"\n',
            encoding="utf-8",
        )
        (crate / "src").mkdir()
        (crate / "src/lib.rs").write_text("// repository fixture\n", encoding="utf-8")
        (root / "Cargo.toml").write_text(
            "[workspace]\n"
            f'members = ["{relative}", "services/sdkwork-clawrouter-router-service"]\n'
            "[workspace.dependencies]\n"
            f'{package_name} = {{ path = "{relative}" }}\n',
            encoding="utf-8",
        )
        service_manifest = root / "services/sdkwork-clawrouter-router-service/Cargo.toml"
        service_manifest.parent.mkdir(parents=True, exist_ok=True)
        service_manifest.write_text(
            '[package]\nname = "sdkwork-clawrouter-router-service"\nversion = "0.1.0"\n'
            "[dependencies]\n"
            f"{package_name}.workspace = true\n",
            encoding="utf-8",
        )
        (service_manifest.parent / "src").mkdir()
        (service_manifest.parent / "src/lib.rs").write_text(
            "// service fixture\n", encoding="utf-8"
        )
        return relative

    def cargo_metadata_result(
        self, root: Path, capability: str = "example"
    ) -> subprocess.CompletedProcess[str]:
        repository_name = f"sdkwork-clawrouter-{capability}-repository-sqlx"
        repository_id = f"path+file:///{repository_name}#0.1.0"
        service_name = "sdkwork-clawrouter-router-service"
        service_id = f"path+file:///{service_name}#0.1.0"
        repository_root = root / "crates" / repository_name
        service_root = root / "services/sdkwork-clawrouter-router-service"
        metadata = {
            "packages": [
                {
                    "id": repository_id,
                    "name": repository_name,
                    "manifest_path": str(repository_root / "Cargo.toml"),
                    "dependencies": [],
                    "targets": [],
                },
                {
                    "id": service_id,
                    "name": service_name,
                    "manifest_path": str(service_root / "Cargo.toml"),
                    "dependencies": [
                        {
                            "name": repository_name,
                            "kind": None,
                            "path": str(repository_root),
                        }
                    ],
                    "targets": [],
                },
            ],
            "workspace_members": [repository_id, service_id],
        }
        return subprocess.CompletedProcess(
            args=[], returncode=0, stdout=json.dumps(metadata), stderr=""
        )

    def write_repository_component_spec(
        self,
        root: Path,
        crate_relative: str,
        *,
        capability: str = "example",
        component_overrides: dict[str, object] | None = None,
        contract_overrides: dict[str, object] | None = None,
    ) -> None:
        package_name = f"sdkwork-clawrouter-{capability}-repository-sqlx"
        component = {
            "name": package_name,
            "displayName": f"SDKWork Claw Router {capability} Repository SQLx",
            "version": "0.1.0",
            "type": "rust-crate",
            "root": f"sdkwork-clawrouter/{crate_relative}",
            "domain": "platform",
            "capability": capability,
            "surface": "repository",
            "languages": ["rust"],
            "generated": False,
            "private": True,
            "manifests": ["Cargo.toml"],
        }
        component.update(component_overrides or {})
        contracts = {
            "layerRole": "backend-repository",
            "publicExports": ["."],
            "providedPorts": [],
            "requiredPorts": [],
            "runtimeEntrypoints": [],
            "routeManifest": None,
            "sdkClients": [],
            "sdkDependencies": [],
            "dependencyApiExports": [],
            "dependencyApiSurfaces": [],
            "events": [],
            "configKeys": [],
        }
        contracts.update(contract_overrides or {})
        required_specs = (
            "COMPONENT_SPEC.md",
            "CODE_STYLE_SPEC.md",
            "NAMING_SPEC.md",
            "RUST_CODE_SPEC.md",
            "DATABASE_SPEC.md",
            "TEST_SPEC.md",
        )
        self.write_json(
            root,
            f"{crate_relative}/specs/component.spec.json",
            {
                "schemaVersion": 1,
                "kind": "sdkwork.component.spec",
                "component": component,
                "canonicalSpecs": [
                    {
                        "file": file,
                        "path": f"../../../../sdkwork-specs/{file}",
                        "purpose": "Repository ownership and verification authority.",
                    }
                    for file in required_specs
                ],
                "contracts": contracts,
                "verification": {
                    "commands": [
                        f"cargo test -p {package_name} --test dialect_parity"
                    ]
                },
            },
        )

    def write_legacy_store_pair(self, root: Path) -> tuple[str, str]:
        base = "services/sdkwork-clawrouter-router-service/src/infrastructure/sql"
        postgres = f"{base}/postgres/example_store.rs"
        sqlite = f"{base}/sqlite/example_store.rs"
        for relative in (postgres, sqlite):
            path = root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("// legacy store\n", encoding="utf-8")
        port = root / "services/sdkwork-clawrouter-router-service/src/ports/example_store.rs"
        port.parent.mkdir(parents=True, exist_ok=True)
        port.write_text("// port\n", encoding="utf-8")
        return postgres, sqlite

    def test_database_store_manifest_rejects_untracked_legacy_path(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            postgres, sqlite = self.write_legacy_store_pair(root)
            self.write_store_migration_manifest(
                root,
                legacy_paths=[postgres],
                legacy_store_files=2,
            )

            checks = SdkworkStandardAlignmentGuardian(root)._check_database_store_migration()
            coverage = next(
                check
                for check in checks
                if check.id == "database-store-migration-inventory-coverage"
            )

            self.assertEqual("fail", coverage.status)
            self.assertEqual("blocking", coverage.severity)
            self.assertIn(sqlite, coverage.message)

    def test_database_store_manifest_accepts_exact_unique_coverage(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            postgres, sqlite = self.write_legacy_store_pair(root)
            self.write_store_migration_manifest(
                root,
                legacy_paths=[postgres, sqlite],
                legacy_store_files=2,
            )

            checks = SdkworkStandardAlignmentGuardian(root)._check_database_store_migration()
            coverage = next(
                check
                for check in checks
                if check.id == "database-store-migration-inventory-coverage"
            )

            self.assertEqual("pass", coverage.status)
            self.assertIn("2/2", coverage.message)

    def test_database_store_manifest_rejects_duplicate_legacy_path(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            postgres, sqlite = self.write_legacy_store_pair(root)
            self.write_store_migration_manifest(
                root,
                legacy_paths=[postgres, sqlite, sqlite],
                legacy_store_files=2,
            )

            checks = SdkworkStandardAlignmentGuardian(root)._check_database_store_migration()
            coverage = next(
                check
                for check in checks
                if check.id == "database-store-migration-inventory-coverage"
            )

            self.assertEqual("fail", coverage.status)
            self.assertIn("duplicate", coverage.message)

    def test_database_store_manifest_rejects_noncanonical_inventory_scope(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            postgres, sqlite = self.write_legacy_store_pair(root)
            self.write_store_migration_manifest(
                root,
                legacy_paths=[postgres, sqlite],
                legacy_store_files=2,
            )
            manifest_path = root / "specs/database-store-migration.manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["legacyInventory"] = {"path": "empty", "glob": "**/*.rs"}
            manifest_path.write_text(
                json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
            )

            checks = SdkworkStandardAlignmentGuardian(root)._check_database_store_migration()
            manifest_check = next(
                check for check in checks if check.id == "database-store-migration-manifest"
            )

            self.assertEqual("fail", manifest_check.status)
            self.assertIn("legacyInventory", manifest_check.message)

    def test_database_store_manifest_rejects_non_object_root(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            manifest = root / "specs/database-store-migration.manifest.json"
            manifest.parent.mkdir(parents=True, exist_ok=True)
            manifest.write_text("[]\n", encoding="utf-8")

            checks = SdkworkStandardAlignmentGuardian(root)._check_database_store_migration()

            self.assertEqual("fail", checks[0].status)
            self.assertIn("JSON object", checks[0].message)

    def test_database_store_manifest_rejects_non_list_nested_fields(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            postgres, sqlite = self.write_legacy_store_pair(root)
            self.write_store_migration_manifest(
                root,
                legacy_paths=[postgres, sqlite],
                legacy_store_files=2,
            )
            manifest_path = root / "specs/database-store-migration.manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["capabilities"][0]["legacyPaths"] = 1
            manifest_path.write_text(json.dumps(manifest) + "\n", encoding="utf-8")

            checks = SdkworkStandardAlignmentGuardian(root)._check_database_store_migration()

            self.assertEqual("fail", checks[0].status)
            self.assertIn("legacyPaths", checks[0].message)

    def test_database_store_manifest_rejects_boolean_statistics(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            postgres, sqlite = self.write_legacy_store_pair(root)
            self.write_store_migration_manifest(
                root,
                legacy_paths=[postgres, sqlite],
                legacy_store_files=2,
            )
            manifest_path = root / "specs/database-store-migration.manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["migrationStats"]["pendingCapabilities"] = True
            manifest_path.write_text(json.dumps(manifest) + "\n", encoding="utf-8")

            checks = SdkworkStandardAlignmentGuardian(root)._check_database_store_migration()

            self.assertEqual("fail", checks[0].status)
            self.assertIn("migrationStats.pendingCapabilities", checks[0].message)

    def test_database_store_manifest_rejects_invalid_logical_store_count(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            postgres, sqlite = self.write_legacy_store_pair(root)
            self.write_store_migration_manifest(
                root,
                legacy_paths=[postgres, sqlite],
                legacy_store_files=2,
            )
            manifest_path = root / "specs/database-store-migration.manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["capabilities"][0]["logicalStoreCount"] = "invalid"
            manifest_path.write_text(json.dumps(manifest) + "\n", encoding="utf-8")

            checks = SdkworkStandardAlignmentGuardian(root)._check_database_store_migration()

            self.assertEqual("fail", checks[0].status)
            self.assertIn("logicalStoreCount", checks[0].message)

    def test_database_store_manifest_rejects_undeclared_active_repository_crate(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            active_crate = self.write_active_repository_crate(root)
            self.write_empty_store_migration_manifest(root)

            checks = SdkworkStandardAlignmentGuardian(root)._check_database_store_migration()
            closure = next(
                check
                for check in checks
                if check.id == "database-store-migration-repository-closure"
            )

            self.assertEqual("fail", closure.status)
            self.assertIn(active_crate, closure.message)

    def test_repository_closure_uses_cargo_metadata_as_package_authority(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "Cargo.toml").write_text("[workspace]\n", encoding="utf-8")
            package_name = "sdkwork-clawrouter-example-repository-sqlx"
            package_root = root / "crates" / package_name
            package_root.mkdir(parents=True)
            manifest_path = package_root / "Cargo.toml"
            manifest_path.write_text(
                f'[package]\nname = "{package_name}"\nversion = "0.1.0"\n',
                encoding="utf-8",
            )
            package_id = f"path+file:///{package_name}#0.1.0"
            metadata = {
                "packages": [
                    {
                        "id": package_id,
                        "name": package_name,
                        "manifest_path": str(manifest_path),
                        "dependencies": [],
                        "targets": [],
                    }
                ],
                "workspace_members": [package_id],
            }
            completed = subprocess.CompletedProcess(
                args=[],
                returncode=0,
                stdout=json.dumps(metadata),
                stderr="",
            )

            with patch(
                "tools.sdkwork_standard_alignment_guardian.subprocess.run",
                return_value=completed,
            ) as run:
                issues = SdkworkStandardAlignmentGuardian(
                    root
                )._repository_sqlx_closure_issues({})

            self.assertTrue(
                any("absent from" in issue and package_name in issue for issue in issues),
                issues,
            )
            run.assert_called_once_with(
                ["cargo", "metadata", "--no-deps", "--format-version", "1"],
                cwd=root.resolve(),
                capture_output=True,
                text=True,
                timeout=60,
                check=False,
            )

    def test_migrated_store_requires_existing_parity_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (
                root
                / "services/sdkwork-clawrouter-router-service/src/infrastructure/sql"
            ).mkdir(parents=True, exist_ok=True)
            crate = root / "crates/sdkwork-clawrouter-example-repository-sqlx"
            (crate / "specs").mkdir(parents=True, exist_ok=True)
            (crate / "Cargo.toml").write_text("[package]\nname='example'\n", encoding="utf-8")
            (crate / "specs/component.spec.json").write_text("{}\n", encoding="utf-8")
            port = root / "services/sdkwork-clawrouter-router-service/src/ports/example_store.rs"
            port.parent.mkdir(parents=True, exist_ok=True)
            port.write_text("// port\n", encoding="utf-8")
            self.write_json(
                root,
                "specs/database-store-migration.manifest.json",
                {
                    "schemaVersion": 2,
                    "kind": "sdkwork.database-store-migration",
                    "application": "sdkwork-clawrouter",
                    "authority": "../sdkwork-specs/DATABASE_SPEC.md",
                    "legacyInventory": {
                        "path": "services/sdkwork-clawrouter-router-service/src/infrastructure/sql",
                        "glob": "**/*_store.rs",
                    },
                    "capabilities": [
                        {
                            "capability": "example",
                            "crate": "crates/sdkwork-clawrouter-example-repository-sqlx",
                            "portPaths": [
                                "services/sdkwork-clawrouter-router-service/src/ports/example_store.rs"
                            ],
                            "legacyPaths": [
                                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/example_store.rs",
                                "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/example_store.rs",
                            ],
                            "tables": ["example_item"],
                            "status": "MIGRATED",
                            "priority": "HIGH",
                            "migrationOrder": 1,
                            "parityTests": [
                                "crates/sdkwork-clawrouter-example-repository-sqlx/tests/dialect_parity.rs"
                            ],
                            "rollback": "revert the isolated capability migration",
                            "verificationStatus": "COMPLETE",
                        }
                    ],
                    "migrationStats": {
                        "legacyStoreFiles": 0,
                        "coveredLegacyStoreFiles": 0,
                        "currentDialectPairs": 0,
                        "migratedCapabilities": 1,
                        "pendingCapabilities": 0,
                        "pendingCapabilityGroups": 0,
                        "pendingLogicalStores": 0,
                        "migratedLogicalStores": 1,
                        "totalLogicalStores": 1,
                        "completionPercentage": 100.0,
                    },
                },
            )

            checks = SdkworkStandardAlignmentGuardian(root)._check_database_store_migration()
            migrated = next(
                check for check in checks if check.id == "database-store-migration-example"
            )

            self.assertEqual("fail", migrated.status)
            self.assertIn("parity", migrated.message)

    def test_migrated_store_rejects_forged_repository_component_identity(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            crate_relative = self.write_active_repository_crate(root)
            crate = root / crate_relative
            self.write_repository_component_spec(
                root,
                crate_relative,
                component_overrides={
                    "name": "sdkwork-clawrouter-forged-repository-sqlx",
                    "root": "sdkwork-clawrouter/crates/forged",
                    "generated": True,
                },
                contract_overrides={"layerRole": "backend-service"},
            )
            parity = crate / "tests/dialect_parity.rs"
            parity.parent.mkdir(parents=True, exist_ok=True)
            parity.write_text("#[test]\nfn parity() {}\n", encoding="utf-8")
            port = root / "services/sdkwork-clawrouter-router-service/src/ports/example_store.rs"
            port.parent.mkdir(parents=True, exist_ok=True)
            port.write_text("// port\n", encoding="utf-8")
            self.write_empty_store_migration_manifest(root)
            manifest_path = root / "specs/database-store-migration.manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["capabilities"] = [
                {
                    "capability": "example",
                    "crate": crate_relative,
                    "portPaths": [
                        "services/sdkwork-clawrouter-router-service/src/ports/example_store.rs"
                    ],
                    "legacyPaths": [
                        "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/example_store.rs",
                        "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/example_store.rs",
                    ],
                    "tables": ["example_item"],
                    "status": "MIGRATED",
                    "priority": "HIGH",
                    "migrationOrder": 1,
                    "parityTests": [f"{crate_relative}/tests/dialect_parity.rs"],
                    "rollback": "revert the isolated extraction",
                    "verificationStatus": "COMPLETE",
                }
            ]
            manifest["migrationStats"].update(
                {
                    "migratedCapabilities": 1,
                    "migratedLogicalStores": 1,
                    "totalLogicalStores": 1,
                    "completionPercentage": 100.0,
                }
            )
            manifest_path.write_text(json.dumps(manifest) + "\n", encoding="utf-8")
            metadata = self.cargo_metadata_result(root)

            with patch(
                "tools.sdkwork_standard_alignment_guardian.subprocess.run",
                return_value=metadata,
            ) as run:
                checks = SdkworkStandardAlignmentGuardian(root)._check_database_store_migration()

            migrated = next(
                check for check in checks if check.id == "database-store-migration-example"
            )
            self.assertEqual("fail", migrated.status)
            self.assertIn("component spec identity", migrated.message)
            run.assert_called_once()

    def test_store_manifest_rejects_arbitrary_freshness_commands(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            crate_relative = self.write_active_repository_crate(root)
            crate = root / crate_relative
            self.write_repository_component_spec(root, crate_relative)
            port = root / "services/sdkwork-clawrouter-router-service/src/ports/example_store.rs"
            port.parent.mkdir(parents=True, exist_ok=True)
            port.write_text("// port\n", encoding="utf-8")
            self.write_empty_store_migration_manifest(root)
            manifest_path = root / "specs/database-store-migration.manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["capabilities"] = [
                {
                    "capability": "example",
                    "crate": crate_relative,
                    "portPaths": [
                        "services/sdkwork-clawrouter-router-service/src/ports/example_store.rs"
                    ],
                    "legacyPaths": [
                        "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/example_store.rs",
                        "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/example_store.rs",
                    ],
                    "tables": ["example_item"],
                    "status": "MIGRATED",
                    "priority": "HIGH",
                    "migrationOrder": 1,
                    "parityTests": [f"{crate_relative}/Cargo.toml"],
                    "freshnessCommands": ["echo forged"],
                    "rollback": "revert the isolated extraction",
                    "verificationStatus": "COMPLETE",
                    "ownerReviewRequired": True,
                    "ownerReview": {
                        "status": "APPROVED",
                        "evidence": f"{crate_relative}/Cargo.toml",
                    },
                }
            ]
            manifest["migrationStats"].update(
                {
                    "migratedCapabilities": 1,
                    "migratedLogicalStores": 1,
                    "totalLogicalStores": 1,
                    "completionPercentage": 100.0,
                }
            )
            manifest_path.write_text(json.dumps(manifest) + "\n", encoding="utf-8")

            checks = SdkworkStandardAlignmentGuardian(root)._check_database_store_migration()

            self.assertEqual("fail", checks[0].status)
            self.assertIn("freshnessCommands is not allowed", checks[0].message)

    def test_migrated_store_executes_canonical_component_verification_command(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            crate_relative = self.write_active_repository_crate(root)
            crate = root / crate_relative
            self.write_repository_component_spec(root, crate_relative)
            parity = crate / "tests/dialect_parity.rs"
            parity.parent.mkdir(parents=True, exist_ok=True)
            parity.write_text("#[test]\nfn parity() {}\n", encoding="utf-8")
            port = root / "services/sdkwork-clawrouter-router-service/src/ports/example_store.rs"
            port.parent.mkdir(parents=True, exist_ok=True)
            port.write_text("// port\n", encoding="utf-8")
            self.write_empty_store_migration_manifest(root)
            manifest_path = root / "specs/database-store-migration.manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["capabilities"] = [
                {
                    "capability": "example",
                    "crate": crate_relative,
                    "portPaths": [
                        "services/sdkwork-clawrouter-router-service/src/ports/example_store.rs"
                    ],
                    "legacyPaths": [
                        "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/example_store.rs",
                        "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/example_store.rs",
                    ],
                    "tables": ["example_item"],
                    "status": "MIGRATED",
                    "priority": "HIGH",
                    "migrationOrder": 1,
                    "parityTests": [f"{crate_relative}/tests/dialect_parity.rs"],
                    "rollback": "revert the isolated extraction",
                    "verificationStatus": "COMPLETE",
                }
            ]
            manifest["migrationStats"].update(
                {
                    "migratedCapabilities": 1,
                    "migratedLogicalStores": 1,
                    "totalLogicalStores": 1,
                    "completionPercentage": 100.0,
                }
            )
            manifest_path.write_text(json.dumps(manifest) + "\n", encoding="utf-8")
            failed = subprocess.CompletedProcess(
                args=[], returncode=1, stdout="", stderr="parity failed"
            )
            metadata = self.cargo_metadata_result(root)

            with patch(
                "tools.sdkwork_standard_alignment_guardian.subprocess.run",
                side_effect=[metadata, failed],
            ) as run:
                checks = SdkworkStandardAlignmentGuardian(root)._check_database_store_migration()

            migrated = next(
                check for check in checks if check.id == "database-store-migration-example"
            )
            self.assertEqual("fail", migrated.status)
            self.assertIn("component verification command", migrated.message)
            self.assertEqual(2, run.call_count)
            self.assertEqual(
                ["cargo", "metadata", "--no-deps", "--format-version", "1"],
                run.call_args_list[0].args[0],
            )
            self.assertEqual(
                [
                    "cargo",
                    "test",
                    "-p",
                    "sdkwork-clawrouter-example-repository-sqlx",
                    "--test",
                    "dialect_parity",
                ],
                run.call_args_list[1].args[0],
            )

    def test_migrated_store_does_not_accept_self_declared_owner_review(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            crate_relative = self.write_active_repository_crate(root)
            crate = root / crate_relative
            self.write_repository_component_spec(root, crate_relative)
            parity = crate / "tests/dialect_parity.rs"
            parity.parent.mkdir(parents=True, exist_ok=True)
            parity.write_text("#[test]\nfn parity() {}\n", encoding="utf-8")
            port = root / "services/sdkwork-clawrouter-router-service/src/ports/example_store.rs"
            port.parent.mkdir(parents=True, exist_ok=True)
            port.write_text("// port\n", encoding="utf-8")
            self.write_empty_store_migration_manifest(root)
            manifest_path = root / "specs/database-store-migration.manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["capabilities"] = [
                {
                    "capability": "example",
                    "crate": crate_relative,
                    "portPaths": [
                        "services/sdkwork-clawrouter-router-service/src/ports/example_store.rs"
                    ],
                    "legacyPaths": [
                        "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/example_store.rs",
                        "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/example_store.rs",
                    ],
                    "tables": ["example_item"],
                    "status": "MIGRATED",
                    "priority": "HIGH",
                    "migrationOrder": 1,
                    "parityTests": [f"{crate_relative}/tests/dialect_parity.rs"],
                    "rollback": "revert the isolated extraction",
                    "verificationStatus": "COMPLETE",
                    "ownerReviewRequired": True,
                    "ownerReview": {
                        "status": "APPROVED",
                        "evidence": f"{crate_relative}/Cargo.toml",
                    },
                }
            ]
            manifest["migrationStats"].update(
                {
                    "migratedCapabilities": 1,
                    "migratedLogicalStores": 1,
                    "totalLogicalStores": 1,
                    "completionPercentage": 100.0,
                }
            )
            manifest_path.write_text(json.dumps(manifest) + "\n", encoding="utf-8")
            succeeded = subprocess.CompletedProcess(
                args=[], returncode=0, stdout="", stderr=""
            )
            metadata = self.cargo_metadata_result(root)

            with patch(
                "tools.sdkwork_standard_alignment_guardian.subprocess.run",
                side_effect=[metadata, succeeded],
            ) as run:
                checks = SdkworkStandardAlignmentGuardian(root)._check_database_store_migration()

            self.assertEqual("fail", checks[0].status)
            self.assertIn("ownerReview is not allowed", checks[0].message)
            run.assert_not_called()

    def test_accepts_v4_standalone_production_profile_from_topology_authority(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.write_minimal_pc_packages(root)
            self.write_json(
                root,
                "specs/topology.spec.json",
                {
                    "schemaVersion": 4,
                    "kind": "sdkwork.app.topology",
                    "defaults": {"productionProfileId": "cloud.production"},
                    "profileFiles": {
                        "standalone.production": "configs/topology/standalone.production.env",
                        "cloud.production": "configs/topology/cloud.production.env",
                    },
                },
            )
            profile = root / "configs/topology/standalone.production.env"
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
                    "schemaVersion": 4,
                    "kind": "sdkwork.app.topology",
                    "profileFiles": {
                        "standalone.production": "configs/topology/standalone.production.env"
                    },
                },
            )
            legacy_profile = (
                root / "configs/topology/standalone.unified-process.production.env"
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
            self.assertIn("configs/topology/standalone.production.env", deployment_check.remediation)

    def test_rejects_declared_three_segment_legacy_profile(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            legacy_relative = "configs/topology/standalone.unified-process.production.env"
            self.write_json(
                root,
                "specs/topology.spec.json",
                {
                    "schemaVersion": 4,
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
                    "schemaVersion": 4,
                    "kind": "sdkwork.app.topology",
                    "profileFiles": {
                        "standalone.production": "configs/topology/standalone.production.env"
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
            self.assertIn("configs/topology/standalone.production.env", deployment_check.remediation)

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
                    "schemaVersion": 4,
                    "kind": "sdkwork.app.topology",
                    "profileFiles": {
                        "standalone.production": "configs/topology/standalone.production.env"
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
                (root / "configs/topology").symlink_to(external_root, target_is_directory=True)
            except OSError as error:
                self.skipTest(f"directory symlink unavailable: {error}")

            deployment_check = (
                SdkworkStandardAlignmentGuardian(root)._check_standalone_production_profile()
            )

            self.assertEqual("fail", deployment_check.status)
            self.assertIn("repository-owned", deployment_check.message)


if __name__ == "__main__":
    unittest.main()
