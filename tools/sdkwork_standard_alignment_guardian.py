from __future__ import annotations

import argparse
import json
import os
import re
import stat
import subprocess
import tomllib
from collections import Counter
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class AlignmentCheck:
    id: str
    category: str
    severity: str
    status: str
    message: str
    remediation: str


@dataclass(frozen=True)
class AlignmentGuardianResult:
    checks: tuple[AlignmentCheck, ...]

    @property
    def blocking(self) -> tuple[AlignmentCheck, ...]:
        return tuple(check for check in self.checks if check.severity == "blocking" and check.status == "fail")

    @property
    def ok(self) -> bool:
        return not self.blocking


class SdkworkStandardAlignmentGuardian:
    """Audit sdkwork-clawrouter against sdkwork-specs framework integration requirements."""

    ROOT_COMPONENT_SPEC = "specs/component.spec.json"
    WORKFLOW_MANIFEST = "sdkwork.workflow.json"
    CARGO_MANIFEST = "Cargo.toml"
    DATABASE_LEGACY_STORE_ROOT = (
        "services/sdkwork-clawrouter-router-service/src/infrastructure/sql"
    )
    DATABASE_LEGACY_STORE_GLOB = "**/*_store.rs"
    REPOSITORY_SQLX_PACKAGE_PATTERN = re.compile(
        r"sdkwork-clawrouter-[a-z0-9]+(?:-[a-z0-9]+)*-repository-sqlx"
    )

    REQUIRED_REPOSITORY_CONTRACTS: tuple[str, ...] = (
        "specs/README.md",
        "specs/component.spec.json",
        "specs/topology.spec.json",
        "specs/application-env-standard.md",
        "specs/database-store-migration.manifest.json",
    )
    RETIRED_REPOSITORY_CONTRACTS: tuple[str, ...] = (
        "specs/API_SPEC.md",
        "specs/DATABASE_SPEC.md",
        "specs/appbase-integration.yaml",
        "specs/dependency-api-surfaces.json",
        "specs/naming-migration.manifest.json",
        "specs/standard-alignment.manifest.json",
    )

    REQUIRED_ROOT_CANONICAL_SPECS: tuple[str, ...] = (
        "WEB_FRAMEWORK_SPEC.md",
        "WEB_BACKEND_SPEC.md",
        "DATABASE_SPEC.md",
        "DEPLOYMENT_SPEC.md",
        "GITHUB_WORKFLOW_SPEC.md",
        "APP_RUNTIME_TOPOLOGY_SPEC.md",
    )

    REQUIRED_WORKFLOW_DEPENDENCY_IDS: tuple[str, ...] = (
        "sdkwork-web-framework",
        "sdkwork-database",
        "sdkwork-utils",
    )

    REQUIRED_CARGO_WORKSPACE_DEPS: tuple[str, ...] = (
        "sdkwork-web-axum",
        "sdkwork-web-core",
        "sdkwork-iam-web-adapter",
        "sdkwork-database-config",
        "sdkwork-database-sqlx",
        "sdkwork-database-repository",
        "sdkwork-utils-rust",
    )

    HTTP_ROUTE_CRATES: tuple[str, ...] = (
        "crates/sdkwork-routes-clawrouter-app-api",
        "crates/sdkwork-routes-clawrouter-backend-api",
    )
    IAM_RESOLVER_CANONICAL_IMPORT = "IamWebRequestContextResolver"
    IAM_RESOLVER_LEGACY_IMPORT = "IamDatabaseWebRequestContextResolver"
    IAM_RESOLVER_CANONICAL_FACTORY = "iam_web_request_context_resolver_from_env"
    IAM_RESOLVER_LEGACY_FACTORY = "iam_database_resolver_from_env"
    IAM_RESOLVER_CLAW_INTEGRATION_FILE = (
        "crates/sdkwork-claw-http/src/federated_database_env.rs"
    )
    IAM_RESOLVER_CLAW_INTEGRATION_MARKERS: tuple[str, ...] = (
        "ensure_iam_database_env_for_claw_database",
    )

    def __init__(self, root: Path) -> None:
        self.root = Path(root).resolve()

    @staticmethod
    def _is_canonical_repository_relative_path(value: object) -> bool:
        if not isinstance(value, str) or not value or value != value.strip():
            return False
        if "\\" in value or ":" in value or "\0" in value:
            return False
        return all(part not in {"", ".", ".."} for part in value.split("/"))

    def _path_has_link_component(self, candidate: Path) -> bool:
        try:
            relative = candidate.absolute().relative_to(self.root)
        except ValueError:
            return True
        current = self.root
        for part in relative.parts:
            current /= part
            try:
                metadata = current.lstat()
                file_attributes = getattr(metadata, "st_file_attributes", 0)
                if stat.S_ISLNK(metadata.st_mode) or (
                    file_attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT
                ):
                    return True
            except FileNotFoundError:
                continue
            except OSError:
                return True
        return False

    def _resolve_repository_path(
        self,
        relative: object,
        *,
        require_file: bool = False,
        require_dir: bool = False,
    ) -> Path | None:
        if not self._is_canonical_repository_relative_path(relative):
            return None
        assert isinstance(relative, str)
        lexical = Path(relative)
        if lexical.is_absolute() or ".." in lexical.parts:
            return None
        candidate = self.root / lexical
        if self._path_has_link_component(candidate):
            return None
        try:
            resolved = candidate.resolve(strict=require_file or require_dir)
        except (OSError, RuntimeError):
            return None
        if resolved != self.root and self.root not in resolved.parents:
            return None
        if require_file and not resolved.is_file():
            return None
        if require_dir and not resolved.is_dir():
            return None
        return resolved

    @staticmethod
    def _read_toml(path: Path) -> dict[str, object] | None:
        try:
            data = tomllib.loads(path.read_text(encoding="utf-8"))
        except (OSError, tomllib.TOMLDecodeError):
            return None
        return data if isinstance(data, dict) else None

    @staticmethod
    def _normalize_repository_relative_path(value: object) -> str | None:
        if not SdkworkStandardAlignmentGuardian._is_canonical_repository_relative_path(value):
            return None
        assert isinstance(value, str)
        return value

    def _cargo_metadata(self) -> tuple[dict[str, object] | None, str | None]:
        argv = ["cargo", "metadata", "--no-deps", "--format-version", "1"]
        try:
            completed = subprocess.run(
                argv,
                cwd=self.root,
                capture_output=True,
                text=True,
                timeout=60,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired) as error:
            return None, f"cargo metadata execution failed: {error}"
        if completed.returncode != 0:
            detail = completed.stderr.strip() or completed.stdout.strip()
            return None, f"cargo metadata failed with exit code {completed.returncode}: {detail}"
        try:
            metadata = json.loads(completed.stdout)
        except json.JSONDecodeError as error:
            return None, f"cargo metadata returned invalid JSON: {error}"
        if not isinstance(metadata, dict):
            return None, "cargo metadata root must be a JSON object"
        return metadata, None

    def _repository_sqlx_closure_issues(
        self, declared_status_by_path: dict[str, str]
    ) -> list[str]:
        issues: list[str] = []

        metadata, metadata_error = self._cargo_metadata()
        if metadata_error is not None or metadata is None:
            return [metadata_error or "cargo metadata is unavailable"]

        raw_packages = metadata.get("packages")
        raw_workspace_members = metadata.get("workspace_members")
        if not isinstance(raw_packages, list) or not all(
            isinstance(package, dict) for package in raw_packages
        ):
            return ["cargo metadata packages must be an array of objects"]
        if not isinstance(raw_workspace_members, list) or not all(
            isinstance(member, str) for member in raw_workspace_members
        ):
            return ["cargo metadata workspace_members must be an array of strings"]

        workspace_member_ids = set(raw_workspace_members)
        workspace_packages = [
            package
            for package in raw_packages
            if isinstance(package.get("id"), str)
            and package.get("id") in workspace_member_ids
        ]
        repository_packages: dict[str, dict[str, object]] = {}
        for package in workspace_packages:
            package_name = package.get("name")
            if not isinstance(package_name, str) or not self.REPOSITORY_SQLX_PACKAGE_PATTERN.fullmatch(
                package_name
            ):
                continue
            manifest_value = package.get("manifest_path")
            if not isinstance(manifest_value, str):
                issues.append(f"cargo metadata package {package_name} has no manifest_path")
                continue
            manifest_path = Path(manifest_value)
            try:
                manifest_resolved = manifest_path.resolve(strict=True)
                crate_root = manifest_resolved.parent
                crate_relative = crate_root.relative_to(self.root).as_posix()
            except (OSError, RuntimeError, ValueError):
                issues.append(
                    f"cargo metadata repository package is outside the repository: {package_name}"
                )
                continue
            if (
                self._path_has_link_component(manifest_resolved)
                or crate_root.name != package_name
                or crate_relative != f"crates/{package_name}"
            ):
                issues.append(
                    f"repository crate package/path identity mismatch: {package_name} at {crate_relative}"
                )
                continue
            repository_packages[crate_relative] = package

        production_consumers: dict[str, set[str]] = {
            relative: set() for relative in repository_packages
        }
        repository_paths_by_name = {
            str(package.get("name")): relative
            for relative, package in repository_packages.items()
        }
        for consumer in workspace_packages:
            consumer_name = consumer.get("name")
            dependencies = consumer.get("dependencies")
            if not isinstance(consumer_name, str) or not isinstance(dependencies, list):
                continue
            for dependency in dependencies:
                if not isinstance(dependency, dict) or dependency.get("kind") not in {None, "normal"}:
                    continue
                dependency_name = dependency.get("name")
                relative = repository_paths_by_name.get(str(dependency_name))
                if relative is None:
                    continue
                dependency_path = dependency.get("path")
                if isinstance(dependency_path, str):
                    try:
                        if Path(dependency_path).resolve(strict=True) != self.root / relative:
                            continue
                    except (OSError, RuntimeError):
                        continue
                production_consumers[relative].add(consumer_name)

        root_manifest = self._resolve_repository_path("Cargo.toml", require_file=True)
        root_cargo = self._read_toml(root_manifest) if root_manifest is not None else None
        workspace = root_cargo.get("workspace") if root_cargo is not None else None
        if not isinstance(workspace, dict):
            issues.append("root Cargo.toml must contain a readable [workspace] table")
            workspace = {}

        raw_workspace_dependencies = workspace.get("dependencies")
        workspace_dependency_paths: dict[str, str] = {}
        if isinstance(raw_workspace_dependencies, dict):
            for package_name, declaration in raw_workspace_dependencies.items():
                if not isinstance(package_name, str) or not self.REPOSITORY_SQLX_PACKAGE_PATTERN.fullmatch(
                    package_name
                ):
                    continue
                path_value = declaration.get("path") if isinstance(declaration, dict) else None
                normalized = self._normalize_repository_relative_path(path_value)
                if normalized is not None:
                    workspace_dependency_paths[normalized] = package_name

        existing_paths = set(repository_packages)
        for relative, package in sorted(repository_packages.items()):
            package_name = str(package.get("name"))
            if workspace_dependency_paths.get(relative) != package_name:
                issues.append(f"repository crate is not a root workspace dependency: {relative}")
        for relative in sorted(set(workspace_dependency_paths).difference(existing_paths)):
            issues.append(f"workspace dependency repository crate is missing: {relative}")

        declared_paths = set(declared_status_by_path)
        for relative in sorted(existing_paths.difference(declared_paths)):
            issues.append(
                f"repository crate is absent from the migration manifest: {relative}"
            )
        for relative, status_value in sorted(declared_status_by_path.items()):
            consumers = production_consumers.get(relative, set())
            if status_value == "MIGRATED":
                if relative not in existing_paths:
                    issues.append(
                        f"MIGRATED manifest entry is not a Cargo workspace repository crate: {relative}"
                    )
                elif not consumers:
                    issues.append(
                        f"MIGRATED repository crate has no production Cargo dependency edge: {relative}"
                    )
            elif status_value == "PENDING" and consumers:
                issues.append(
                    f"production repository dependency must be MIGRATED, not PENDING: {relative} "
                    f"(consumers: {', '.join(sorted(consumers))})"
                )
        return issues

    def _repository_component_verification(
        self,
        crate_relative: str,
        *,
        package_name: str,
        capability: str,
    ) -> tuple[set[str], list[str]]:
        component_path = self._resolve_repository_path(
            f"{crate_relative}/specs/component.spec.json", require_file=True
        )
        if component_path is None:
            return set(), ["missing component spec"]
        try:
            data = json.loads(component_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            return set(), [f"unreadable component spec: {error}"]
        issues: list[str] = []
        if (
            not isinstance(data, dict)
            or data.get("schemaVersion") != 1
            or data.get("kind") != "sdkwork.component.spec"
        ):
            return set(), ["invalid component spec schema/kind"]

        component = data.get("component")
        if not isinstance(component, dict):
            issues.append("component must be an object")
            component = {}
        expected_component_fields = {
            "name": package_name,
            "type": "rust-crate",
            "root": f"sdkwork-clawrouter/{crate_relative}",
            "domain": "platform",
            "capability": capability,
            "surface": "repository",
            "generated": False,
        }
        for field, expected in expected_component_fields.items():
            if component.get(field) != expected:
                issues.append(f"component.{field} must equal {expected!r}")
        if component.get("languages") != ["rust"]:
            issues.append("component.languages must equal ['rust']")
        manifests = component.get("manifests")
        if not isinstance(manifests, list) or "Cargo.toml" not in manifests:
            issues.append("component.manifests must include Cargo.toml")

        required_canonical_specs = {
            "COMPONENT_SPEC.md",
            "CODE_STYLE_SPEC.md",
            "NAMING_SPEC.md",
            "RUST_CODE_SPEC.md",
            "DATABASE_SPEC.md",
            "TEST_SPEC.md",
        }
        canonical_specs = data.get("canonicalSpecs")
        canonical_files: set[str] = set()
        if not isinstance(canonical_specs, list):
            issues.append("canonicalSpecs must be an array")
        else:
            for reference in canonical_specs:
                if not isinstance(reference, dict):
                    issues.append("canonicalSpecs entries must be objects")
                    continue
                file_name = reference.get("file")
                if not isinstance(file_name, str):
                    issues.append("canonicalSpecs entries must declare file")
                    continue
                canonical_files.add(file_name)
                expected_path = f"../../../../sdkwork-specs/{file_name}"
                if reference.get("path") != expected_path:
                    issues.append(
                        f"canonical spec {file_name} must use path {expected_path!r}"
                    )
            missing_specs = sorted(required_canonical_specs.difference(canonical_files))
            if missing_specs:
                issues.append(
                    f"canonicalSpecs missing {', '.join(missing_specs)}"
                )

        contracts = data.get("contracts")
        if not isinstance(contracts, dict):
            issues.append("contracts must be an object")
            contracts = {}
        if contracts.get("layerRole") != "backend-repository":
            issues.append("contracts.layerRole must equal 'backend-repository'")
        public_exports = contracts.get("publicExports")
        if not isinstance(public_exports, list) or "." not in public_exports:
            issues.append("contracts.publicExports must include '.'")
        for field in (
            "providedPorts",
            "requiredPorts",
            "runtimeEntrypoints",
            "sdkClients",
            "sdkDependencies",
            "dependencyApiExports",
            "dependencyApiSurfaces",
            "events",
            "configKeys",
        ):
            if not isinstance(contracts.get(field), list):
                issues.append(f"contracts.{field} must be an array")
        if contracts.get("routeManifest") is not None:
            issues.append("contracts.routeManifest must be null")

        verification = data.get("verification")
        commands = verification.get("commands") if isinstance(verification, dict) else None
        if not isinstance(commands, list) or not commands or not all(
            isinstance(command, str) and command.strip() for command in commands
        ):
            issues.append("verification.commands must be a non-empty string array")
            return set(), issues
        return {command.strip() for command in commands}, issues

    def _canonical_repository_test_command(
        self,
        command: str,
        *,
        package_name: str,
        crate_relative: str,
        parity_test_paths: set[str],
    ) -> list[str] | None:
        match = re.fullmatch(
            r"cargo test -p ([a-z0-9]+(?:-[a-z0-9]+)*) --test "
            r"([a-z0-9]+(?:[_-][a-z0-9]+)*)( -- --nocapture)?",
            command.strip(),
        )
        if match is None or match.group(1) != package_name:
            return None
        target = match.group(2)
        target_path = f"{crate_relative}/tests/{target}.rs"
        if target_path not in parity_test_paths:
            return None
        argv = ["cargo", "test", "-p", package_name, "--test", target]
        if match.group(3):
            argv.extend(["--", "--nocapture"])
        return argv

    def run(self) -> AlignmentGuardianResult:
        checks: list[AlignmentCheck] = []
        checks.extend(self._check_root_component_specs())
        checks.extend(self._check_repository_contracts())
        checks.append(self._check_standalone_production_profile())
        checks.extend(self._check_workflow_dependencies())
        checks.extend(self._check_cargo_workspace_dependencies())
        checks.extend(self._check_web_framework_integration())
        checks.extend(self._check_handler_subject_resolution())
        checks.extend(self._check_utils_integration())
        checks.extend(self._check_http_route_manifest_runtime())
        checks.extend(self._check_database_framework_integration())
        checks.extend(self._check_database_store_migration())
        checks.extend(self._check_api_contract_metadata())
        checks.extend(self._check_route_manifest_workspace())
        checks.extend(self._check_pc_package_taxonomy())
        checks.extend(self._check_rpc_discovery_policy())
        checks.extend(self._check_rust_service_naming())
        checks.extend(self._check_iam_resolver_standardization())
        return AlignmentGuardianResult(checks=tuple(checks))

    def _check_repository_contracts(self) -> list[AlignmentCheck]:
        checks: list[AlignmentCheck] = []
        required_contracts = set(self.REQUIRED_REPOSITORY_CONTRACTS)
        specs_root = self._resolve_repository_path("specs", require_dir=True)
        for relative in self.REQUIRED_REPOSITORY_CONTRACTS:
            contract_id = Path(relative).stem.lower()
            exists = self._resolve_repository_path(relative, require_file=True) is not None
            checks.append(
                AlignmentCheck(
                    id=f"repository-contract-{contract_id}",
                    category="metadata",
                    severity="blocking",
                    status="pass" if exists else "fail",
                    message=(
                        f"current repository contract exists: {relative}"
                        if exists
                        else f"missing or non-repository-owned current contract: {relative}"
                    ),
                    remediation=(
                        ""
                        if exists
                        else f"create {relative} from current authored authorities and runtime facts"
                    ),
                )
            )

        for relative in self.RETIRED_REPOSITORY_CONTRACTS:
            contract_id = Path(relative).name.split(".")[0].lower()
            exists = (self.root / relative).exists()
            checks.append(
                AlignmentCheck(
                    id=f"repository-contract-retired-{contract_id}",
                    category="metadata",
                    severity="blocking",
                    status="fail" if exists else "pass",
                    message=(
                        f"retired repository contract is still present: {relative}"
                        if exists
                        else f"retired repository contract is absent: {relative}"
                    ),
                    remediation=(
                        "remove the retired contract and declare active composition in "
                        "specs/component.spec.json; materialize cross-stack facts in "
                        "generated/composition.resolved.json"
                        if exists
                        else ""
                    ),
                )
            )

        actual_contracts = {
            path.relative_to(self.root).as_posix()
            for path in specs_root.iterdir()
            if self._resolve_repository_path(
                path.relative_to(self.root).as_posix(), require_file=True
            ) is not None
        } if specs_root is not None else set()
        unexpected = sorted(actual_contracts.difference(required_contracts))
        missing = sorted(required_contracts.difference(actual_contracts))
        exact = specs_root is not None and not unexpected and not missing
        details: list[str] = []
        if specs_root is None:
            details.append("specs directory is not repository-owned")
        if unexpected:
            details.append(f"unexpected: {', '.join(unexpected)}")
        if missing:
            details.append(f"missing: {', '.join(missing)}")
        checks.append(
            AlignmentCheck(
                id="repository-contract-exact-set",
                category="metadata",
                severity="blocking",
                status="pass" if exact else "fail",
                message=(
                    "root specs directory contains exactly the current repository contracts"
                    if exact
                    else f"root specs contract set is not exact ({'; '.join(details)})"
                ),
                remediation=(
                    "keep only the current repository contracts declared by the root contract index"
                    if not exact
                    else ""
                ),
            )
        )
        return checks

    def _check_root_component_specs(self) -> list[AlignmentCheck]:
        spec_path = self._resolve_repository_path(
            self.ROOT_COMPONENT_SPEC, require_file=True
        )
        if spec_path is None:
            return [
                AlignmentCheck(
                    id="component-spec-present",
                    category="metadata",
                    severity="blocking",
                    status="fail",
                    message=(
                        f"missing or non-repository-owned root component spec at "
                        f"{self.ROOT_COMPONENT_SPEC}"
                    ),
                    remediation="create specs/component.spec.json per COMPONENT_SPEC.md",
                )
            ]

        try:
            data = json.loads(spec_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            return [
                AlignmentCheck(
                    id="component-spec-schema",
                    category="metadata",
                    severity="blocking",
                    status="fail",
                    message=f"cannot read root component spec: {error}",
                    remediation="write a valid sdkwork.component.spec JSON object",
                )
            ]
        if not isinstance(data, dict):
            return [
                AlignmentCheck(
                    id="component-spec-schema",
                    category="metadata",
                    severity="blocking",
                    status="fail",
                    message="root component spec root must be a JSON object",
                    remediation="write a schemaVersion 1 sdkwork.component.spec object",
                )
            ]

        schema_errors: list[str] = []
        if data.get("schemaVersion") != 1:
            schema_errors.append("schemaVersion must equal 1")
        if data.get("kind") != "sdkwork.component.spec":
            schema_errors.append("kind must equal 'sdkwork.component.spec'")
        component = data.get("component")
        if not isinstance(component, dict):
            schema_errors.append("component must be an object")
        else:
            expected_component_identity = {
                "name": "sdkwork-clawrouter",
                "root": ".",
                "type": "app",
            }
            for field, expected in expected_component_identity.items():
                if component.get(field) != expected:
                    schema_errors.append(f"component.{field} must equal {expected!r}")
        canonical_specs = data.get("canonicalSpecs")
        if not isinstance(canonical_specs, list) or not canonical_specs:
            schema_errors.append("canonicalSpecs must be a non-empty array")
            canonical_specs = []
        elif not all(isinstance(entry, dict) for entry in canonical_specs):
            schema_errors.append("canonicalSpecs entries must be objects")
            canonical_specs = []

        declared_files: list[str] = []
        for entry in canonical_specs:
            file_name = entry.get("file")
            spec_relative_path = entry.get("path")
            purpose = entry.get("purpose")
            if not isinstance(file_name, str) or not file_name.strip():
                schema_errors.append("canonicalSpecs.file must be a non-empty string")
                continue
            declared_files.append(file_name)
            if spec_relative_path != f"../sdkwork-specs/{file_name}":
                schema_errors.append(
                    f"canonicalSpecs path for {file_name} must equal "
                    f"'../sdkwork-specs/{file_name}'"
                )
            if not isinstance(purpose, str) or not purpose.strip():
                schema_errors.append(
                    f"canonicalSpecs purpose for {file_name} must be a non-empty string"
                )
        duplicate_files = sorted(
            file_name
            for file_name, count in Counter(declared_files).items()
            if count > 1
        )
        if duplicate_files:
            schema_errors.append(
                f"canonicalSpecs contains duplicate files: {', '.join(duplicate_files)}"
            )
        if schema_errors:
            return [
                AlignmentCheck(
                    id="component-spec-schema",
                    category="metadata",
                    severity="blocking",
                    status="fail",
                    message=f"invalid root component spec: {'; '.join(schema_errors)}",
                    remediation="align specs/component.spec.json with COMPONENT_SPEC.md",
                )
            ]

        declared = {
            entry.get("file")
            for entry in canonical_specs
            if isinstance(entry, dict) and isinstance(entry.get("file"), str)
        }
        checks: list[AlignmentCheck] = [
            AlignmentCheck(
                id="component-spec-schema",
                category="metadata",
                severity="blocking",
                status="pass",
                message="root component spec has the canonical schema and application identity",
                remediation="",
            )
        ]
        for required in self.REQUIRED_ROOT_CANONICAL_SPECS:
            if required in declared:
                checks.append(
                    AlignmentCheck(
                        id=f"component-spec-{required}",
                        category="metadata",
                        severity="blocking",
                        status="pass",
                        message=f"root component spec declares {required}",
                        remediation="",
                    )
                )
            else:
                checks.append(
                    AlignmentCheck(
                        id=f"component-spec-{required}",
                        category="metadata",
                        severity="blocking",
                        status="fail",
                        message=f"root component spec missing canonical reference to {required}",
                        remediation=f"add {required} to specs/component.spec.json canonicalSpecs",
                    )
                )
        return checks

    def _check_workflow_dependencies(self) -> list[AlignmentCheck]:
        workflow_path = self.root / self.WORKFLOW_MANIFEST
        if not workflow_path.exists():
            return [
                AlignmentCheck(
                    id="workflow-manifest-present",
                    category="packaging",
                    severity="blocking",
                    status="fail",
                    message=f"missing {self.WORKFLOW_MANIFEST}",
                    remediation="create sdkwork.workflow.json per GITHUB_WORKFLOW_SPEC.md",
                )
            ]

        data = json.loads(workflow_path.read_text(encoding="utf-8"))
        dependency_ids = {
            entry.get("id")
            for entry in data.get("dependencies", [])
            if isinstance(entry, dict) and isinstance(entry.get("id"), str)
        }
        checks: list[AlignmentCheck] = []
        for dependency_id in self.REQUIRED_WORKFLOW_DEPENDENCY_IDS:
            if dependency_id in dependency_ids:
                checks.append(
                    AlignmentCheck(
                        id=f"workflow-dep-{dependency_id}",
                        category="packaging",
                        severity="blocking",
                        status="pass",
                        message=f"{self.WORKFLOW_MANIFEST} declares dependency checkout for {dependency_id}",
                        remediation="",
                    )
                )
            else:
                checks.append(
                    AlignmentCheck(
                        id=f"workflow-dep-{dependency_id}",
                        category="packaging",
                        severity="blocking",
                        status="fail",
                        message=f"{self.WORKFLOW_MANIFEST} missing dependency checkout for {dependency_id}",
                        remediation=f"add {dependency_id} to sdkwork.workflow.json dependencies",
                    )
                )
        return checks

    def _check_cargo_workspace_dependencies(self) -> list[AlignmentCheck]:
        cargo_path = self.root / self.CARGO_MANIFEST
        text = cargo_path.read_text(encoding="utf-8")
        checks: list[AlignmentCheck] = []
        for dependency in self.REQUIRED_CARGO_WORKSPACE_DEPS:
            if re.search(rf"^{re.escape(dependency)}\s*=", text, flags=re.MULTILINE):
                checks.append(
                    AlignmentCheck(
                        id=f"cargo-workspace-dep-{dependency}",
                        category="dependencies",
                        severity="blocking",
                        status="pass",
                        message=f"Cargo workspace declares {dependency}",
                        remediation="",
                    )
                )
            else:
                checks.append(
                    AlignmentCheck(
                        id=f"cargo-workspace-dep-{dependency}",
                        category="dependencies",
                        severity="blocking",
                        status="fail",
                        message=f"Cargo workspace missing workspace dependency {dependency}",
                        remediation=f"declare {dependency} under [workspace.dependencies] in Cargo.toml",
                    )
                )
        return checks

    def _check_web_framework_integration(self) -> list[AlignmentCheck]:
        checks: list[AlignmentCheck] = []
        cargo_text = (self.root / self.CARGO_MANIFEST).read_text(encoding="utf-8")
        has_web_framework_dep = "sdkwork-web-framework" in cargo_text or "sdkwork-web-axum" in cargo_text
        if has_web_framework_dep:
            checks.append(
                AlignmentCheck(
                    id="web-framework-workspace-dep",
                    category="web-framework",
                    severity="blocking",
                    status="pass",
                    message="Cargo workspace declares sdkwork-web-framework crates",
                    remediation="",
                )
            )
        else:
            checks.append(
                AlignmentCheck(
                    id="web-framework-workspace-dep",
                    category="web-framework",
                    severity="blocking",
                    status="fail",
                    message="Cargo workspace does not declare sdkwork-web-framework crates",
                    remediation="add sdkwork-web-axum and sdkwork-web-core workspace dependencies",
                )
            )

        for route_crate in self.HTTP_ROUTE_CRATES:
            web_bootstrap = self.root / route_crate / "src" / "web_bootstrap.rs"
            if web_bootstrap.exists():
                checks.append(
                    AlignmentCheck(
                        id=f"web-framework-bootstrap-{route_crate}",
                        category="web-framework",
                        severity="blocking",
                        status="pass",
                        message=f"{route_crate} provides web_bootstrap.rs",
                        remediation="",
                    )
                )
            else:
                checks.append(
                    AlignmentCheck(
                        id=f"web-framework-bootstrap-{route_crate}",
                        category="web-framework",
                        severity="blocking",
                        status="fail",
                        message=f"{route_crate} is missing web_bootstrap.rs for sdkwork-web-framework wrapping",
                        remediation="follow sdkwork-knowledgebase router web_bootstrap pattern and WEB_FRAMEWORK_SPEC.md",
                    )
                )

        claw_http = self.root / "crates" / "sdkwork-claw-http"
        web_bootstrap = self.root / self.HTTP_ROUTE_CRATES[0] / "src" / "web_bootstrap.rs"
        bootstrap_text = (
            web_bootstrap.read_text(encoding="utf-8") if web_bootstrap.exists() else ""
        )
        auth_rs = claw_http / "src" / "auth.rs"
        auth_text = auth_rs.read_text(encoding="utf-8") if auth_rs.exists() else ""
        web_framework_defaults_on = (
            "claw_web_framework_enabled_from_env" in (claw_http / "src" / "web_framework_compat.rs").read_text(encoding="utf-8")
            if (claw_http / "src" / "web_framework_compat.rs").exists()
            else ""
        )
        bypasses_legacy_boundary = "claw_web_framework_enabled_from_env()" in auth_text
        injects_trusted_subject = (
            "inject_legacy_handler_context_from_web_context" in bootstrap_text
            or "inject_legacy_handler_context_from_web_context"
            in (
                (self.root / self.HTTP_ROUTE_CRATES[1] / "src" / "web_bootstrap.rs")
                .read_text(encoding="utf-8")
                if (self.root / self.HTTP_ROUTE_CRATES[1] / "src" / "web_bootstrap.rs").exists()
                else ""
            )
        )
        projects_subject_middleware = "project_trusted_subject_from_web_request_context" in (
            claw_http / "src" / "web_framework_compat.rs"
        ).read_text(encoding="utf-8") if (claw_http / "src" / "web_framework_compat.rs").exists() else ""
        if (
            claw_http.exists()
            and web_framework_defaults_on
            and bypasses_legacy_boundary
            and injects_trusted_subject
            and projects_subject_middleware
        ):
            checks.append(
                AlignmentCheck(
                    id="web-framework-local-http-stack",
                    category="web-framework",
                    severity="blocking",
                    status="pass",
                    message="sdkwork-web-framework owns auth/context; legacy claw-http boundaries bypass when framework is active",
                    remediation="",
                )
            )
        elif claw_http.exists() and web_framework_defaults_on:
            checks.append(
                AlignmentCheck(
                    id="web-framework-local-http-stack",
                    category="web-framework",
                    severity="warning",
                    status="fail",
                    message="sdkwork-web-framework is default-on but legacy claw-http auth bypass/projection is incomplete",
                    remediation="ensure auth.rs bypasses legacy boundaries and web_bootstrap injects TrustedRequestSubject",
                )
            )
        elif claw_http.exists():
            checks.append(
                AlignmentCheck(
                    id="web-framework-local-http-stack",
                    category="web-framework",
                    severity="warning",
                    status="fail",
                    message="local sdkwork-claw-http stack still owns HTTP auth/context; migrate to sdkwork-web-framework",
                    remediation="retire competing interceptor/context logic per WEB_FRAMEWORK_SPEC.md migration plan",
                )
            )

        for route_crate in self.HTTP_ROUTE_CRATES:
            routes_rs = self.root / route_crate / "src" / "routes.rs"
            routes_text = routes_rs.read_text(encoding="utf-8") if routes_rs.exists() else ""
            router_from_env_finalizes = (
                "pub async fn router_from_env()" in routes_text
                and "maybe_wrap_router_with_web_framework" in routes_text
            )
            checks.append(
                AlignmentCheck(
                    id=f"web-framework-router-from-env-{route_crate}",
                    category="web-framework",
                    severity="blocking",
                    status="pass" if router_from_env_finalizes else "fail",
                    message=(
                        f"{route_crate} router_from_env finalizes with sdkwork-web-framework"
                        if router_from_env_finalizes
                        else f"{route_crate} router_from_env must call maybe_wrap_router_with_web_framework once"
                    ),
                    remediation="wrap the served router in web_bootstrap::maybe_wrap_router_with_web_framework before returning",
                )
            )

        gateway_runtime = self.root / "crates" / "sdkwork-clawrouter-edge-runtime" / "src" / "runtime.rs"
        gateway_text = (
            gateway_runtime.read_text(encoding="utf-8") if gateway_runtime.exists() else ""
        )
        all_in_one_finalizes_both = (
            "finalize_all_in_one_route_surfaces" in gateway_text
            and "maybe_wrap_router_with_web_framework_and_iam_pool" in gateway_text
        )
        checks.append(
            AlignmentCheck(
                id="web-framework-gateway-all-in-one-finalize",
                category="web-framework",
                severity="blocking",
                status="pass" if all_in_one_finalizes_both else "fail",
                message=(
                    "gateway all-in-one finalizes app and backend route surfaces with sdkwork-web-framework"
                    if all_in_one_finalizes_both
                    else "gateway all-in-one must finalize both app-api and backend-api routers once"
                ),
                remediation="use finalize_all_in_one_route_surfaces with maybe_wrap_router_with_web_framework_and_iam_pool(database_config, postgres_pool)",
            )
        )
        return checks

    def _uses_subject_extractor(self, text: str) -> bool:
        if "TrustedRequestSubject::from_headers" in text:
            return False
        if "Option<TrustedRequestSubject>" in text:
            return True
        return re.search(
            r"\b(?:trusted|_subject|subject)\s*:\s*TrustedRequestSubject\b",
            text,
        ) is not None

    def _check_handler_subject_resolution(self) -> list[AlignmentCheck]:
        checks: list[AlignmentCheck] = []
        api_dir = self.root / "services" / "sdkwork-clawrouter-router-service" / "src" / "api"
        allowlist = {"subject.rs", "openai_invocation.rs", "openai_chat.rs", "openai_embeddings.rs", "openai_models.rs", "openai_responses.rs"}
        legacy_files: list[str] = []
        migrated_files: list[str] = []
        openai_api_key_files: list[str] = []
        for path in sorted(api_dir.glob("*.rs")):
            if path.name in allowlist:
                continue
            text = path.read_text(encoding="utf-8")
            if "TrustedRequestSubject::from_headers" in text:
                legacy_files.append(path.name)
            elif "ApiKeyIdentity::from_headers" in text:
                openai_api_key_files.append(path.name)
            elif self._uses_subject_extractor(text):
                migrated_files.append(path.name)

        checks.append(
            AlignmentCheck(
                id="web-framework-handler-subject-migration",
                category="web-framework",
                severity="warning",
                status="pass" if not legacy_files else "fail",
                message=(
                    "product API handlers resolve subject via TrustedRequestSubject extractors"
                    if not legacy_files
                    else (
                        f"{len(legacy_files)} product API handlers still call "
                        "TrustedRequestSubject::from_headers"
                    )
                ),
                remediation=(
                    "replace header parsing with sdkwork-web-framework-aware extractors; "
                    "see services/sdkwork-clawrouter-router-service/src/api/subject.rs"
                ),
            )
        )
        if migrated_files:
            checks.append(
                AlignmentCheck(
                    id="web-framework-handler-subject-migration-progress",
                    category="web-framework",
                    severity="info",
                    status="pass",
                    message=(
                        f"{len(migrated_files)} product API modules use framework-aware "
                        "TrustedRequestSubject extractors"
                    ),
                    remediation="",
                )
            )
        if openai_api_key_files:
            checks.append(
                AlignmentCheck(
                    id="web-framework-openai-api-key-subject",
                    category="web-framework",
                    severity="info",
                    status="pass",
                    message=(
                        f"{len(openai_api_key_files)} OpenAI-compatible routes intentionally use "
                        "ApiKeyIdentity header resolution"
                    ),
                    remediation="",
                )
            )
        return checks

    def _check_utils_integration(self) -> list[AlignmentCheck]:
        checks: list[AlignmentCheck] = []
        cargo_text = (self.root / self.CARGO_MANIFEST).read_text(encoding="utf-8")
        has_utils_rust_dep = "sdkwork-utils-rust" in cargo_text
        if not has_utils_rust_dep:
            checks.append(
                AlignmentCheck(
                    id="utils-rust-workspace-dep",
                    category="utils",
                    severity="blocking",
                    status="fail",
                    message="Cargo workspace missing sdkwork-utils-rust workspace dependency",
                    remediation="declare sdkwork-utils-rust under [workspace.dependencies] in Cargo.toml",
                )
            )

        product_src = self.root / "services" / "sdkwork-clawrouter-router-service" / "src"
        rust_usage_files = 0
        if product_src.exists():
            for path in product_src.rglob("*.rs"):
                try:
                    uses_utils = "sdkwork_utils_rust::" in path.read_text(encoding="utf-8")
                except OSError:
                    continue
                if uses_utils:
                    rust_usage_files += 1
        checks.append(
            AlignmentCheck(
                id="utils-rust-product-adoption",
                category="utils",
                severity="warning",
                status="pass" if rust_usage_files else "fail",
                message=(
                    f"router service uses sdkwork-utils-rust in {rust_usage_files} module(s)"
                    if rust_usage_files
                    else "router service declares sdkwork-utils-rust but does not import it yet"
                ),
                remediation="replace local string/token helpers with sdkwork_utils_rust exports",
            )
        )

        pc_root = self.root / "apps" / "sdkwork-clawrouter-pc"
        commons_pkg = pc_root / "packages" / "sdkwork-clawroutes-pc-commons" / "package.json"
        pc_pkg = pc_root / "package.json"
        has_ts_dep = False
        for manifest in (commons_pkg, pc_pkg):
            if manifest.exists() and "@sdkwork/utils" in manifest.read_text(encoding="utf-8"):
                has_ts_dep = True
                break
        checks.append(
            AlignmentCheck(
                id="utils-pc-dependency",
                category="utils",
                severity="blocking",
                status="pass" if has_ts_dep else "fail",
                message=(
                    "PC application declares @sdkwork/utils workspace dependency"
                    if has_ts_dep
                    else "PC application is missing @sdkwork/utils dependency"
                ),
                remediation=(
                    "add ../../../sdkwork-utils/packages/sdkwork-utils-typescript to pnpm workspace "
                    "and declare @sdkwork/utils in sdkwork-clawroutes-pc-commons"
                ),
            )
        )

        ts_usage_files = 0
        packages_root = pc_root / "packages"
        if packages_root.exists():
            for path in packages_root.glob("*/src/**/*"):
                if not path.is_file() or path.suffix not in {".ts", ".tsx", ".mts"}:
                    continue
                try:
                    text = path.read_text(encoding="utf-8", errors="ignore")
                except OSError:
                    continue
                if (
                    "@sdkwork/utils" in text
                    or "sdkwork-clawroutes-pc-commons/sdkwork-utils" in text
                ):
                    ts_usage_files += 1
        app_src = pc_root / "src"
        if app_src.exists():
            for path in app_src.rglob("*"):
                if not path.is_file() or path.suffix not in {".ts", ".tsx", ".mts"}:
                    continue
                try:
                    text = path.read_text(encoding="utf-8", errors="ignore")
                except OSError:
                    continue
                if (
                    "@sdkwork/utils" in text
                    or "sdkwork-clawroutes-pc-commons/sdkwork-utils" in text
                ):
                    ts_usage_files += 1
        checks.append(
            AlignmentCheck(
                id="utils-pc-adoption",
                category="utils",
                severity="warning",
                status="pass" if ts_usage_files else "fail",
                message=(
                    f"PC application consumes sdkwork-utils in {ts_usage_files} module(s)"
                    if ts_usage_files
                    else "PC application declares @sdkwork/utils but has no imports yet"
                ),
                remediation="import helpers from sdkwork-clawroutes-pc-commons/sdkwork-utils instead of local duplicates",
            )
        )
        return checks

    def _check_database_framework_integration(self) -> list[AlignmentCheck]:
        checks: list[AlignmentCheck] = []
        gateway_runtime = self.root / "crates" / "sdkwork-clawrouter-edge-runtime" / "src" / "runtime.rs"
        gateway_text = gateway_runtime.read_text(encoding="utf-8") if gateway_runtime.exists() else ""
        if "sdkwork_database_sqlx" in gateway_text:
            checks.append(
                AlignmentCheck(
                    id="database-gateway-pool",
                    category="database",
                    severity="blocking",
                    status="pass",
                    message="gateway runtime uses sdkwork-database-sqlx DatabasePool",
                    remediation="",
                )
            )
        else:
            checks.append(
                AlignmentCheck(
                    id="database-gateway-pool",
                    category="database",
                    severity="blocking",
                    status="fail",
                    message="gateway runtime does not use sdkwork-database-sqlx DatabasePool",
                    remediation="route pool creation through sdkwork-database-sqlx",
                )
            )

        product_cargo = self.root / "services" / "sdkwork-clawrouter-router-service" / "Cargo.toml"
        product_text = product_cargo.read_text(encoding="utf-8") if product_cargo.exists() else ""
        if "sdkwork-database-repository" in product_text:
            product_rs_files = list((self.root / "services" / "sdkwork-clawrouter-router-service" / "src").rglob("*.rs"))
            uses_repository = any(
                "sdkwork_database_repository" in path.read_text(encoding="utf-8") for path in product_rs_files
            )
            uses_pool_builder = any(
                "PoolBuilder" in path.read_text(encoding="utf-8") for path in product_rs_files
            )
            if uses_repository and uses_pool_builder:
                checks.append(
                    AlignmentCheck(
                        id="database-product-repository",
                        category="database",
                        severity="warning",
                        status="pass",
                        message="router service uses sdkwork-database-repository and PoolBuilder",
                        remediation="",
                    )
                )
            elif uses_repository:
                checks.append(
                    AlignmentCheck(
                        id="database-product-repository",
                        category="database",
                        severity="warning",
                        status="pass",
                        message="router service uses sdkwork-database-repository",
                        remediation="",
                    )
                )
            else:
                checks.append(
                    AlignmentCheck(
                        id="database-product-repository",
                        category="database",
                        severity="warning",
                        status="fail",
                        message="router service declares sdkwork-database-repository but does not use it yet",
                        remediation="migrate SQL stores to repository pattern or remove unused dependency",
                    )
                )

        gateway_runtime = self.root / "crates" / "sdkwork-clawrouter-edge-runtime" / "src" / "runtime.rs"
        gateway_text = gateway_runtime.read_text(encoding="utf-8") if gateway_runtime.exists() else ""
        if "connect_claw_sqlite_runtime" in gateway_text:
            checks.append(
                AlignmentCheck(
                    id="database-gateway-sqlite-poolbuilder",
                    category="database",
                    severity="blocking",
                    status="pass",
                    message="gateway sqlite pool creation routes through sdkwork-database PoolBuilder helpers",
                    remediation="",
                )
            )
        elif "SqlitePoolOptions::new" in gateway_text:
            checks.append(
                AlignmentCheck(
                    id="database-gateway-sqlite-poolbuilder",
                    category="database",
                    severity="warning",
                    status="fail",
                    message="gateway still creates sqlite pools with raw SqlitePoolOptions",
                    remediation="use sdkwork_clawrouter_router_service::infrastructure::sql::pool::connect_claw_sqlite_runtime_pool",
                )
            )

        for route_crate in self.HTTP_ROUTE_CRATES:
            routes_rs = self.root / route_crate / "src" / "routes.rs"
            routes_text = routes_rs.read_text(encoding="utf-8") if routes_rs.exists() else ""
            uses_pool_helper = "connect_claw_sqlite_runtime_pool" in routes_text
            uses_raw_sqlite_pool = "SqlitePoolOptions::new" in routes_text.split("#[cfg(test)]")[0]
            if uses_pool_helper and not uses_raw_sqlite_pool:
                checks.append(
                    AlignmentCheck(
                        id=f"database-route-sqlite-pool-{route_crate}",
                        category="database",
                        severity="blocking",
                        status="pass",
                        message=f"{route_crate} sqlite startup pools use sdkwork-database PoolBuilder helpers",
                        remediation="",
                    )
                )
            else:
                checks.append(
                    AlignmentCheck(
                        id=f"database-route-sqlite-pool-{route_crate}",
                        category="database",
                        severity="blocking",
                        status="fail",
                        message=f"{route_crate} must route sqlite pool creation through connect_claw_sqlite_runtime_pool",
                        remediation="replace raw SqlitePoolOptions in router startup paths with product pool helpers",
                    )
                )

        return checks

    def _check_database_store_migration(self) -> list[AlignmentCheck]:
        checks: list[AlignmentCheck] = []
        manifest_path = self.root / "specs" / "database-store-migration.manifest.json"
        if not manifest_path.exists():
            checks.append(
                AlignmentCheck(
                    id="database-store-migration-manifest",
                    category="database",
                    severity="warning",
                    status="fail",
                    message="missing specs/database-store-migration.manifest.json for legacy SQL store phased migration",
                    remediation="create database store migration manifest per DATABASE_SPEC.md repository-sqlx pattern",
                )
            )
            return checks

        try:
            data = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            return [
                AlignmentCheck(
                    id="database-store-migration-manifest",
                    category="database",
                    severity="blocking",
                    status="fail",
                    message=f"invalid database store migration manifest: {error}",
                    remediation="write valid JSON derived from the current legacy store inventory",
                )
            ]

        if not isinstance(data, dict):
            return [
                AlignmentCheck(
                    id="database-store-migration-manifest",
                    category="database",
                    severity="blocking",
                    status="fail",
                    message="database store migration manifest root must be a JSON object",
                    remediation="write a schemaVersion 2 sdkwork.database-store-migration object",
                )
            ]

        manifest_errors: list[str] = []
        expected_identity = {
            "schemaVersion": 2,
            "kind": "sdkwork.database-store-migration",
            "application": "sdkwork-clawrouter",
            "authority": "../sdkwork-specs/DATABASE_SPEC.md",
        }
        for field, expected in expected_identity.items():
            if data.get(field) != expected:
                manifest_errors.append(f"{field} must equal {expected!r}")

        inventory = data.get("legacyInventory")
        if not isinstance(inventory, dict):
            manifest_errors.append("legacyInventory must be an object")
            inventory = {}
        if inventory.get("path") != self.DATABASE_LEGACY_STORE_ROOT:
            manifest_errors.append(
                f"legacyInventory.path must equal {self.DATABASE_LEGACY_STORE_ROOT!r}"
            )
        if inventory.get("glob") != self.DATABASE_LEGACY_STORE_GLOB:
            manifest_errors.append(
                f"legacyInventory.glob must equal {self.DATABASE_LEGACY_STORE_GLOB!r}"
            )

        raw_capabilities = data.get("capabilities")
        if not isinstance(raw_capabilities, list) or not all(
            isinstance(entry, dict) for entry in raw_capabilities
        ):
            manifest_errors.append("capabilities must be an array of objects")
            raw_capabilities = []
        stats = data.get("migrationStats")
        if not isinstance(stats, dict):
            manifest_errors.append("migrationStats must be an object")
            stats = {}

        required_list_fields = ("portPaths", "legacyPaths", "tables", "parityTests")
        for index, entry in enumerate(raw_capabilities):
            prefix = f"capabilities[{index}]"
            for field in required_list_fields:
                values = entry.get(field)
                if (
                    not isinstance(values, list)
                    or not values
                    or not all(
                        isinstance(value, str) and bool(value.strip()) for value in values
                    )
                ):
                    manifest_errors.append(
                        f"{prefix}.{field} must be a non-empty array of strings"
                    )
            logical_store_count = entry.get("logicalStoreCount")
            if logical_store_count is not None and (
                not isinstance(logical_store_count, int)
                or isinstance(logical_store_count, bool)
                or logical_store_count < 1
            ):
                manifest_errors.append(
                    f"{prefix}.logicalStoreCount must be a positive integer"
                )
            if "freshnessCommands" in entry:
                manifest_errors.append(
                    f"{prefix}.freshnessCommands is not allowed; executable verification "
                    "belongs to the repository component spec"
                )
            owner_review_required = entry.get("ownerReviewRequired")
            if owner_review_required is not None and not isinstance(
                owner_review_required, bool
            ):
                manifest_errors.append(
                    f"{prefix}.ownerReviewRequired must be a boolean"
                )
            if "ownerReview" in entry:
                manifest_errors.append(
                    f"{prefix}.ownerReview is not allowed; human review authority belongs "
                    "in docs/engineering/reviews/REVIEW-*.md and the external review gate"
                )
            if entry.get("status") == "MIGRATED" and entry.get(
                "verificationStatus"
            ) not in {"INCOMPLETE", "COMPLETE"}:
                manifest_errors.append(
                    f"{prefix}.verificationStatus must be INCOMPLETE or COMPLETE"
                )

        integer_stat_fields = (
            "legacyStoreFiles",
            "coveredLegacyStoreFiles",
            "currentDialectPairs",
            "migratedCapabilities",
            "pendingCapabilities",
            "pendingCapabilityGroups",
            "pendingLogicalStores",
            "migratedLogicalStores",
            "totalLogicalStores",
        )
        for field in integer_stat_fields:
            value = stats.get(field)
            if (
                not isinstance(value, int)
                or isinstance(value, bool)
                or value < 0
            ):
                manifest_errors.append(
                    f"migrationStats.{field} must be a non-negative integer"
                )
        completion_stat = stats.get("completionPercentage")
        if (
            not isinstance(completion_stat, (int, float))
            or isinstance(completion_stat, bool)
            or not 0 <= completion_stat <= 100
        ):
            manifest_errors.append(
                "migrationStats.completionPercentage must be a number from 0 to 100"
            )

        if manifest_errors:
            return [
                AlignmentCheck(
                    id="database-store-migration-manifest",
                    category="database",
                    severity="blocking",
                    status="fail",
                    message=f"invalid database store migration manifest: {'; '.join(manifest_errors)}",
                    remediation="use the canonical schema and fixed repository-owned inventory scope",
                )
            ]

        def safe_repository_path(relative: object) -> Path | None:
            return self._resolve_repository_path(relative)

        sql_infra = self._resolve_repository_path(
            self.DATABASE_LEGACY_STORE_ROOT, require_dir=True
        )
        if sql_infra is None:
            return [
                AlignmentCheck(
                    id="database-store-migration-manifest",
                    category="database",
                    severity="blocking",
                    status="fail",
                    message=(
                        "legacy store inventory root is missing or is not repository-owned"
                    ),
                    remediation=(
                        f"restore {self.DATABASE_LEGACY_STORE_ROOT} as a repository-owned directory"
                    ),
                )
            ]
        current_paths = {
            path.relative_to(self.root).as_posix()
            for path in sql_infra.glob(self.DATABASE_LEGACY_STORE_GLOB)
            if path.is_file()
        }
        inventory_prefix = f"{self.DATABASE_LEGACY_STORE_ROOT}/"

        def logical_store_paths(entry: dict[str, object]) -> set[str]:
            logical_paths: set[str] = set()
            legacy_paths = entry.get("legacyPaths")
            if not isinstance(legacy_paths, list):
                return logical_paths
            for relative in legacy_paths:
                if not isinstance(relative, str) or not relative.startswith(inventory_prefix):
                    continue
                remainder = relative.removeprefix(inventory_prefix)
                engine, separator, logical_path = remainder.partition("/")
                if separator and engine in {"postgres", "sqlite"} and logical_path:
                    logical_paths.add(logical_path)
            return logical_paths

        capabilities = list(raw_capabilities)
        tracked_paths = [
            relative
            for entry in capabilities
            for relative in entry.get("legacyPaths", [])
            if isinstance(relative, str)
        ]
        tracked_counts = Counter(tracked_paths)
        duplicate_paths = sorted(
            relative for relative, count in tracked_counts.items() if count > 1
        )
        tracked_current = current_paths.intersection(tracked_counts)
        untracked_paths = sorted(current_paths.difference(tracked_counts))
        pending_paths = {
            relative
            for entry in capabilities
            if entry.get("status") == "PENDING"
            for relative in entry.get("legacyPaths", [])
            if isinstance(relative, str)
        }
        stale_pending_paths = sorted(pending_paths.difference(current_paths))

        migrated = [entry for entry in capabilities if entry.get("status") == "MIGRATED"]
        pending = [entry for entry in capabilities if entry.get("status") == "PENDING"]
        invalid_statuses = sorted(
            {
                str(entry.get("status"))
                for entry in capabilities
                if entry.get("status") not in {"MIGRATED", "PENDING"}
            }
        )
        incomplete_entries: list[str] = []
        capability_ids: list[str] = []
        migration_orders: list[int] = []
        for entry in capabilities:
            capability = entry.get("capability")
            entry_issues: list[str] = []
            if not isinstance(capability, str) or re.fullmatch(
                r"[a-z0-9]+(?:-[a-z0-9]+)*", capability
            ) is None:
                entry_issues.append("invalid capability")
                capability = "<unknown>"
            else:
                capability_ids.append(capability)

            crate_path = entry.get("crate")
            if (
                not isinstance(crate_path, str)
                or re.fullmatch(
                    r"crates/sdkwork-clawrouter-[a-z0-9-]+-repository-sqlx",
                    crate_path,
                ) is None
                or safe_repository_path(crate_path) is None
            ):
                entry_issues.append("invalid crate")

            for field in ("portPaths", "legacyPaths", "tables", "parityTests"):
                values = entry.get(field)
                if (
                    not isinstance(values, list)
                    or not values
                    or not all(isinstance(value, str) and value.strip() for value in values)
                ):
                    entry_issues.append(f"invalid {field}")

            port_paths = entry.get("portPaths")
            if isinstance(port_paths, list):
                for relative in port_paths:
                    resolved = safe_repository_path(relative)
                    if (
                        resolved is None
                        or not isinstance(relative, str)
                        or not relative.startswith(
                            "services/sdkwork-clawrouter-router-service/src/ports/"
                        )
                    ):
                        entry_issues.append(f"unsafe port path {relative!r}")

            legacy_paths = entry.get("legacyPaths")
            if isinstance(legacy_paths, list):
                for relative in legacy_paths:
                    resolved = safe_repository_path(relative)
                    if (
                        resolved is None
                        or not isinstance(relative, str)
                        or not relative.startswith(f"{self.DATABASE_LEGACY_STORE_ROOT}/")
                        or not relative.endswith("_store.rs")
                    ):
                        entry_issues.append(f"unsafe legacy path {relative!r}")
            derived_logical_store_count = len(logical_store_paths(entry))
            if derived_logical_store_count < 1:
                entry_issues.append("legacyPaths do not identify a logical store")
            declared_logical_store_count = entry.get("logicalStoreCount")
            if (
                declared_logical_store_count is not None
                and declared_logical_store_count != derived_logical_store_count
            ):
                entry_issues.append(
                    "logicalStoreCount does not match the dialect inventory"
                )

            tables = entry.get("tables")
            if isinstance(tables, list) and any(
                not isinstance(table, str)
                or re.fullmatch(r"[a-z][a-z0-9_]*", table) is None
                for table in tables
            ):
                entry_issues.append("invalid tables")

            migration_order = entry.get("migrationOrder")
            if not isinstance(migration_order, int) or isinstance(migration_order, bool) or migration_order < 1:
                entry_issues.append("invalid migrationOrder")
            else:
                migration_orders.append(migration_order)

            if entry.get("status") not in {"MIGRATED", "PENDING"}:
                entry_issues.append("invalid status")
            if entry.get("priority") not in {"CRITICAL", "HIGH", "MEDIUM", "LOW"}:
                entry_issues.append("invalid priority")
            if not isinstance(entry.get("rollback"), str) or not entry.get("rollback", "").strip():
                entry_issues.append("invalid rollback")

            parity_tests = entry.get("parityTests")
            if isinstance(parity_tests, list) and any(
                safe_repository_path(relative) is None for relative in parity_tests
            ):
                entry_issues.append("unsafe parityTests")

            if entry_issues:
                incomplete_entries.append(f"{capability}: {', '.join(entry_issues)}")

        duplicate_capabilities = sorted(
            capability for capability, count in Counter(capability_ids).items() if count > 1
        )
        duplicate_orders = sorted(
            order for order, count in Counter(migration_orders).items() if count > 1
        )

        store_engines: dict[str, set[str]] = {}
        for relative in current_paths:
            remainder = relative.removeprefix(inventory_prefix)
            engine, separator, logical_path = remainder.partition("/")
            if separator and engine in {"postgres", "sqlite"}:
                store_engines.setdefault(logical_path, set()).add(engine)
        unpaired_stores = sorted(
            logical_path
            for logical_path, engines in store_engines.items()
            if engines != {"postgres", "sqlite"}
        )
        pending_logical_paths = {
            relative.removeprefix(inventory_prefix).partition("/")[2]
            for relative in pending_paths.intersection(current_paths)
        }
        migrated_logical_stores = sum(
            len(logical_store_paths(entry)) for entry in migrated
        )
        pending_logical_stores = len(pending_logical_paths)
        total_logical_stores = migrated_logical_stores + pending_logical_stores
        completion_percentage = (
            round((migrated_logical_stores / total_logical_stores) * 100, 2)
            if total_logical_stores
            else 100.0
        )
        expected_stats = {
            "legacyStoreFiles": len(current_paths),
            "coveredLegacyStoreFiles": len(tracked_current),
            "currentDialectPairs": len(store_engines),
            "migratedCapabilities": len(migrated),
            "pendingCapabilities": len(pending),
            "pendingCapabilityGroups": len(pending),
            "pendingLogicalStores": pending_logical_stores,
            "migratedLogicalStores": migrated_logical_stores,
            "totalLogicalStores": total_logical_stores,
            "completionPercentage": completion_percentage,
        }
        stale_stats = [
            f"{key}={stats.get(key)!r} (expected {value})"
            for key, value in expected_stats.items()
            if stats.get(key) != value
        ]

        coverage_issues: list[str] = []
        if duplicate_paths:
            coverage_issues.append(f"duplicate paths: {', '.join(duplicate_paths)}")
        if untracked_paths:
            coverage_issues.append(f"untracked paths: {', '.join(untracked_paths)}")
        if stale_pending_paths:
            coverage_issues.append(
                f"stale pending paths: {', '.join(stale_pending_paths)}"
            )
        if invalid_statuses:
            coverage_issues.append(f"invalid statuses: {', '.join(invalid_statuses)}")
        if incomplete_entries:
            coverage_issues.append(f"incomplete entries: {'; '.join(incomplete_entries)}")
        if duplicate_capabilities:
            coverage_issues.append(
                f"duplicate capabilities: {', '.join(duplicate_capabilities)}"
            )
        if duplicate_orders:
            coverage_issues.append(
                f"duplicate migrationOrder values: {', '.join(map(str, duplicate_orders))}"
            )
        if unpaired_stores:
            coverage_issues.append(f"unpaired dialect stores: {', '.join(unpaired_stores)}")
        if stale_stats:
            coverage_issues.append(f"stale statistics: {'; '.join(stale_stats)}")

        checks.append(
            AlignmentCheck(
                id="database-store-migration-manifest",
                category="database",
                severity="blocking",
                status="pass",
                message=(
                    f"database store migration manifest declares {len(migrated)} migrated and "
                    f"{len(pending)} pending capability owner(s)"
                ),
                remediation="",
            )
        )
        checks.append(
            AlignmentCheck(
                id="database-store-migration-inventory-coverage",
                category="database",
                severity="blocking",
                status="fail" if coverage_issues else "pass",
                message=(
                    "; ".join(coverage_issues)
                    if coverage_issues
                    else (
                        f"database store migration manifest tracks {len(tracked_current)}/"
                        f"{len(current_paths)} current legacy store paths exactly once"
                    )
                ),
                remediation=(
                    "rebuild the manifest from the current PostgreSQL/SQLite inventory; every "
                    "legacy path must be covered exactly once and migrationStats must be computed"
                    if coverage_issues
                    else ""
                ),
            )
        )

        declared_status_by_path = {
            crate_path: status_value
            for entry in capabilities
            if isinstance((crate_path := entry.get("crate")), str)
            and isinstance((status_value := entry.get("status")), str)
        }
        repository_closure_issues = self._repository_sqlx_closure_issues(
            declared_status_by_path
        )
        checks.append(
            AlignmentCheck(
                id="database-store-migration-repository-closure",
                category="database",
                severity="blocking",
                status="fail" if repository_closure_issues else "pass",
                message=(
                    "; ".join(repository_closure_issues)
                    if repository_closure_issues
                    else (
                        "Cargo workspace repository crates, production dependency edges, and "
                        "migration statuses form an exact closure"
                    )
                ),
                remediation=(
                    "reconcile cargo metadata, root workspace dependencies, repository crate "
                    "manifests, production dependency edges, and capability statuses"
                    if repository_closure_issues
                    else ""
                ),
            )
        )

        for entry in migrated:
            capability = str(entry.get("capability", "unknown"))
            crate_path = entry.get("crate")
            crate_root = safe_repository_path(crate_path)
            crate_exists = crate_root is not None and (crate_root / "Cargo.toml").is_file()
            crate_manifest = (
                self._read_toml(crate_root / "Cargo.toml") if crate_exists else None
            )
            package = crate_manifest.get("package") if crate_manifest is not None else None
            package_name = package.get("name") if isinstance(package, dict) else None
            component_commands: set[str] = set()
            component_issues = ["missing component spec"]
            if (
                isinstance(crate_path, str)
                and isinstance(package_name, str)
            ):
                component_commands, component_issues = (
                    self._repository_component_verification(
                        crate_path,
                        package_name=package_name,
                        capability=capability,
                    )
                )
            port_paths = entry.get("portPaths", [])
            ports_exist = isinstance(port_paths, list) and all(
                (resolved := safe_repository_path(relative)) is not None and resolved.is_file()
                for relative in port_paths
            )
            parity_tests = entry.get("parityTests", [])
            parity_test_paths = {
                relative
                for relative in parity_tests
                if isinstance(relative, str)
            } if isinstance(parity_tests, list) else set()
            parity_paths_are_tests = bool(parity_test_paths) and all(
                re.fullmatch(r"[A-Za-z0-9._/-]+/tests/[A-Za-z0-9_-]+\.rs", relative)
                is not None
                and (resolved := safe_repository_path(relative)) is not None
                and resolved.is_file()
                for relative in parity_test_paths
            )
            crate_parity_tests = {
                relative
                for relative in parity_test_paths
                if isinstance(crate_path, str)
                and relative.startswith(f"{crate_path}/tests/")
            }
            parity_exists = parity_paths_are_tests and bool(crate_parity_tests)
            canonical_commands: list[list[str]] = []
            executable_verification_declared = (
                isinstance(package_name, str)
                and isinstance(crate_path, str)
                and not component_issues
            )
            covered_parity_tests: set[str] = set()
            if executable_verification_declared:
                for command in sorted(component_commands):
                    argv = self._canonical_repository_test_command(
                        command,
                        package_name=package_name,
                        crate_relative=crate_path,
                        parity_test_paths=crate_parity_tests,
                    )
                    if argv is not None:
                        canonical_commands.append(argv)
                        covered_parity_tests.add(
                            f"{crate_path}/tests/{argv[5]}.rs"
                        )
                executable_verification_declared = (
                    bool(canonical_commands)
                    and covered_parity_tests == crate_parity_tests
                )
            verification_complete = entry.get("verificationStatus") == "COMPLETE"
            owner_review_complete = not entry.get("ownerReviewRequired", False)
            evidence_issues: list[str] = []
            if not crate_exists:
                evidence_issues.append("Cargo.toml")
            if component_issues:
                evidence_issues.append(
                    f"component spec identity/contract ({'; '.join(component_issues)})"
                )
            if not ports_exist:
                evidence_issues.append("ports")
            if not parity_exists:
                evidence_issues.append("parity tests")
            if not executable_verification_declared:
                evidence_issues.append("executable component verification")
            if not owner_review_complete:
                evidence_issues.append("external human owner review")
            if not verification_complete:
                evidence_issues.append(
                    f"verificationStatus={entry.get('verificationStatus')!r}"
                )
            if not evidence_issues:
                for argv in canonical_commands:
                    try:
                        completed = subprocess.run(
                            argv,
                            cwd=self.root,
                            capture_output=True,
                            text=True,
                            timeout=300,
                            check=False,
                        )
                    except (OSError, subprocess.TimeoutExpired):
                        evidence_issues.append("component verification command execution")
                        break
                    if completed.returncode != 0:
                        evidence_issues.append("component verification command execution")
                        break
            ready = not evidence_issues
            checks.append(
                AlignmentCheck(
                    id=f"database-store-migration-{capability}",
                    category="database",
                    severity="blocking",
                    status="pass" if ready else "fail",
                    message=(
                        f"{crate_path} has complete migrated repository ownership evidence"
                        if ready
                        else (
                            f"{crate_path} migrated ownership is incomplete: "
                            f"{', '.join(evidence_issues)}"
                        )
                    ),
                    remediation=(
                        "add the repository component contract and executable parity verification; "
                        "obtain any required external human owner review; set "
                        "verificationStatus=COMPLETE only after those gates pass"
                        if not ready
                        else ""
                    ),
                )
            )
        return checks

    def _check_http_route_manifest_runtime(self) -> list[AlignmentCheck]:
        checks: list[AlignmentCheck] = []
        for route_crate in self.HTTP_ROUTE_CRATES:
            manifest_rs = self.root / route_crate / "src" / "http_route_manifest.rs"
            bootstrap_rs = self.root / route_crate / "src" / "web_bootstrap.rs"
            if not manifest_rs.exists():
                checks.append(
                    AlignmentCheck(
                        id=f"http-route-manifest-{route_crate}",
                        category="web-framework",
                        severity="blocking",
                        status="fail",
                        message=f"{route_crate} is missing generated http_route_manifest.rs",
                        remediation="run node tools/generate-clawrouter-http-route-manifest-rs.mjs --apply",
                    )
                )
                continue
            bootstrap_text = bootstrap_rs.read_text(encoding="utf-8") if bootstrap_rs.exists() else ""
            wires_route_manifest = (
                (
                    "http_route_manifest()" in bootstrap_text
                    or "claw_router_app_http_route_manifest()" in bootstrap_text
                )
                and (
                    "WebFrameworkLayer::new" in bootstrap_text
                    or "build_web_framework_layer" in bootstrap_text
                    or "build_claw_router_" in bootstrap_text
                )
            )
            if wires_route_manifest:
                checks.append(
                    AlignmentCheck(
                        id=f"http-route-manifest-{route_crate}",
                        category="web-framework",
                        severity="blocking",
                        status="pass",
                        message=f"{route_crate} wires HttpRouteManifest into sdkwork-web-framework layer",
                        remediation="",
                    )
                )
            else:
                checks.append(
                    AlignmentCheck(
                        id=f"http-route-manifest-{route_crate}",
                        category="web-framework",
                        severity="blocking",
                        status="fail",
                        message=f"{route_crate} does not wire HttpRouteManifest into web framework bootstrap",
                        remediation="wire HttpRouteManifest via WebFrameworkLayer::new(resolver).with_route_manifest(http_route_manifest())",
                    )
                )
        return checks

    def _check_api_contract_metadata(self) -> list[AlignmentCheck]:
        checks: list[AlignmentCheck] = []
        openapi_roots = (
            self.root / "apis",
            self.root / "generated" / "openapi",
        )
        files_with_context = 0
        scanned = 0
        for root in openapi_roots:
            if not root.exists():
                continue
            for path in root.rglob("*.openapi.json"):
                scanned += 1
                text = path.read_text(encoding="utf-8")
                if "x-sdkwork-request-context" in text or "WebRequestContext" in text:
                    files_with_context += 1

        if scanned == 0:
            checks.append(
                AlignmentCheck(
                    id="api-contract-request-context",
                    category="api",
                    severity="blocking",
                    status="fail",
                    message="no OpenAPI contract files found under apis/ or generated/openapi/",
                    remediation="materialize API contracts per API_SPEC.md",
                )
            )
            return checks

        if files_with_context > 0:
            checks.append(
                AlignmentCheck(
                    id="api-contract-request-context",
                    category="api",
                    severity="blocking",
                    status="pass",
                    message=f"{files_with_context}/{scanned} OpenAPI files declare WebRequestContext metadata",
                    remediation="",
                )
            )
        else:
            checks.append(
                AlignmentCheck(
                    id="api-contract-request-context",
                    category="api",
                    severity="blocking",
                    status="fail",
                    message="OpenAPI contracts are missing x-sdkwork-request-context / WebRequestContext metadata",
                    remediation="add route manifest + OpenAPI extensions per API_SPEC.md section 19 and WEB_FRAMEWORK_SPEC.md",
                )
            )
        return checks

    def _check_route_manifest_workspace(self) -> list[AlignmentCheck]:
        manifest_root = self.root / "sdks" / "_route-manifests"
        if manifest_root.exists() and any(manifest_root.rglob("*.route-manifest.json")):
            return [
                AlignmentCheck(
                    id="route-manifest-workspace",
                    category="api",
                    severity="blocking",
                    status="pass",
                    message="sdks/_route-manifests contains route manifest inputs",
                    remediation="",
                )
            ]
        return [
            AlignmentCheck(
                id="route-manifest-workspace",
                category="api",
                severity="blocking",
                status="fail",
                message="missing sdks/_route-manifests/*.route-manifest.json workspace",
                remediation="create route manifests with requestContext and apiSurface per SDK_WORKSPACE_GENERATION_SPEC.md",
            )
        ]

    def _check_pc_package_taxonomy(self) -> list[AlignmentCheck]:
        checks: list[AlignmentCheck] = []
        pc_root = self.root / "apps" / "sdkwork-clawrouter-pc" / "packages"
        if not pc_root.exists():
            return checks

        required_shells = (
            "sdkwork-clawrouter-pc-shell",
            "sdkwork-clawrouter-pc-console-shell",
            "sdkwork-clawrouter-pc-admin-shell",
        )
        missing_shells = [
            package_name
            for package_name in required_shells
            if not (pc_root / package_name / "package.json").exists()
        ]
        if missing_shells:
            checks.append(
                AlignmentCheck(
                    id="pc-package-shell-taxonomy",
                    category="frontend",
                    severity="blocking",
                    status="fail",
                    message=f"PC application missing required shell packages: {', '.join(missing_shells)}",
                    remediation="create sdkwork-<application-code>-pc-shell, pc-console-shell, and pc-admin-shell per APP_PC_ARCHITECTURE_SPEC.md §3",
                )
            )
        else:
            checks.append(
                AlignmentCheck(
                    id="pc-package-shell-taxonomy",
                    category="frontend",
                    severity="blocking",
                    status="pass",
                    message="PC application declares app/console/admin shell packages",
                    remediation="",
                )
            )

        package_dirs = [
            path.name
            for path in pc_root.iterdir()
            if path.is_dir() and (path / "package.json").exists()
        ]
        clawrouter_dirs = [name for name in package_dirs if name.startswith("sdkwork-clawrouter-pc-")]
        scoped_names = 0
        for package_dir in clawrouter_dirs:
            package_json = pc_root / package_dir / "package.json"
            if not package_json.exists():
                continue
            data = json.loads(package_json.read_text(encoding="utf-8"))
            name = data.get("name")
            if isinstance(name, str) and name.startswith("@sdkwork/clawrouter-pc-"):
                scoped_names += 1
        if clawrouter_dirs and scoped_names == len(clawrouter_dirs):
            checks.append(
                AlignmentCheck(
                    id="pc-package-application-code",
                    category="naming",
                    severity="blocking",
                    status="pass",
                    message="PC packages use canonical clawrouter application code with @sdkwork/clawrouter-pc-* npm names",
                    remediation="",
                )
            )
        elif clawrouter_dirs:
            checks.append(
                AlignmentCheck(
                    id="pc-package-application-code",
                    category="naming",
                    severity="blocking",
                    status="fail",
                    message="PC package directories exist but npm names are not fully migrated to @sdkwork/clawrouter-pc-*",
                    remediation="run node scripts/migrate-clawrouter-naming-standard.mjs",
                )
            )
        else:
            checks.append(
                AlignmentCheck(
                    id="pc-package-application-code",
                    category="naming",
                    severity="blocking",
                    status="fail",
                    message="PC package taxonomy missing sdkwork-clawrouter-pc-* directories",
                    remediation="create packages under apps/sdkwork-clawrouter-pc/packages per APP_PC_ARCHITECTURE_SPEC.md",
                )
            )

        legacy_repo_refs = 0
        legacy_stem = "sdkwork-claw-router"
        for relative in ("sdkwork.app.config.json", "sdkwork.workflow.json", "specs/component.spec.json"):
            file_path = self.root / relative
            if file_path.exists() and legacy_stem in file_path.read_text(encoding="utf-8"):
                legacy_repo_refs += 1
        if legacy_repo_refs == 0:
            checks.append(
                AlignmentCheck(
                    id="repository-stem-clawrouter",
                    category="naming",
                    severity="blocking",
                    status="pass",
                    message="governance manifests use canonical sdkwork-clawrouter stem",
                    remediation="",
                )
            )
        else:
            checks.append(
                AlignmentCheck(
                    id="repository-stem-clawrouter",
                    category="naming",
                    severity="blocking",
                    status="fail",
                    message=f"{legacy_repo_refs} governance manifest(s) still reference retired {legacy_stem} stem",
                    remediation="run node scripts/replace-legacy-repository-stem.mjs",
                )
            )

        return checks

    def _check_standalone_production_profile(self) -> AlignmentCheck:
        topology_spec_path = self._resolve_repository_path(
            "specs/topology.spec.json", require_file=True
        )
        if topology_spec_path is None:
            return AlignmentCheck(
                id="deployment-standalone-profile",
                category="deployment",
                severity="blocking",
                status="fail",
                message=(
                    "missing or non-repository-owned topology authority at "
                    "specs/topology.spec.json"
                ),
                remediation="create specs/topology.spec.json per APP_RUNTIME_TOPOLOGY_SPEC.md",
            )

        try:
            topology_spec = json.loads(topology_spec_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            return AlignmentCheck(
                id="deployment-standalone-profile",
                category="deployment",
                severity="blocking",
                status="fail",
                message=f"cannot read topology authority: {error}",
                remediation="fix specs/topology.spec.json and run pnpm topology:validate",
            )

        if not isinstance(topology_spec, dict):
            return AlignmentCheck(
                id="deployment-standalone-profile",
                category="deployment",
                severity="blocking",
                status="fail",
                message="topology authority root must be a JSON object",
                remediation="write a schemaVersion 4 sdkwork.app.topology object",
            )
        if (
            topology_spec.get("schemaVersion") != 4
            or topology_spec.get("kind") != "sdkwork.app.topology"
        ):
            return AlignmentCheck(
                id="deployment-standalone-profile",
                category="deployment",
                severity="blocking",
                status="fail",
                message="topology authority must use schemaVersion 4 and kind sdkwork.app.topology",
                remediation="migrate specs/topology.spec.json to APP_RUNTIME_TOPOLOGY_SPEC.md v4",
            )

        profile_files = topology_spec.get("profileFiles")
        if not isinstance(profile_files, dict):
            return AlignmentCheck(
                id="deployment-standalone-profile",
                category="deployment",
                severity="blocking",
                status="fail",
                message="topology authority profileFiles must be an object",
                remediation="add standalone.production to specs/topology.spec.json profileFiles",
            )

        invalid_standalone_production_ids = sorted(
            profile_id
            for profile_id in profile_files
            if isinstance(profile_id, str)
            and profile_id.startswith("standalone.")
            and profile_id.endswith(".production")
            and profile_id != "standalone.production"
        )
        if invalid_standalone_production_ids:
            return AlignmentCheck(
                id="deployment-standalone-profile",
                category="deployment",
                severity="blocking",
                status="fail",
                message=(
                    "standalone production profile ids must contain exactly two segments; "
                    f"invalid: {', '.join(invalid_standalone_production_ids)}"
                ),
                remediation="replace retired profile ids with standalone.production",
            )

        expected_profile_id = "standalone.production"
        expected_relative_path = "etc/topology/standalone.production.env"
        relative_path = profile_files.get(expected_profile_id)
        if relative_path != expected_relative_path:
            return AlignmentCheck(
                id="deployment-standalone-profile",
                category="deployment",
                severity="blocking",
                status="fail",
                message="topology authority does not declare the canonical standalone production mapping",
                remediation=f"add {expected_relative_path} as profileFiles.{expected_profile_id}",
            )

        expected_parent = self._resolve_repository_path(
            "etc/topology", require_dir=True
        )
        profile_path = self._resolve_repository_path(
            expected_relative_path, require_file=True
        )
        if (
            expected_parent is None
            or profile_path is None
            or expected_parent not in profile_path.parents
        ):
            return AlignmentCheck(
                id="deployment-standalone-profile",
                category="deployment",
                severity="blocking",
                status="fail",
                message=(
                    "standalone production topology profile is missing or is not "
                    "repository-owned"
                ),
                remediation=f"add {expected_relative_path} and run pnpm topology:validate",
            )

        profile_text = profile_path.read_text(encoding="utf-8")
        profile_ids = [
            line.split("=", 1)[1].strip()
            for line in profile_text.splitlines()
            if line.strip().startswith("SDKWORK_CLAW_ROUTER_PROFILE_ID=")
        ]
        if profile_ids != [expected_profile_id]:
            return AlignmentCheck(
                id="deployment-standalone-profile",
                category="deployment",
                severity="blocking",
                status="fail",
                message="standalone production profile must declare its exact canonical profile id once",
                remediation=(
                    f"set SDKWORK_CLAW_ROUTER_PROFILE_ID={expected_profile_id} in "
                    f"{expected_relative_path}"
                ),
            )

        return AlignmentCheck(
            id="deployment-standalone-profile",
            category="deployment",
            severity="blocking",
            status="pass",
            message=f"topology authority provides standalone production profile: {expected_profile_id}",
            remediation="",
        )

    def _iter_scan_files(self, root: Path, *, suffixes: tuple[str, ...] = ()) -> list[Path]:
        skip_dir_names = {"node_modules", "target", "dist", "build", ".git", ".tmp", ".pnpm-store"}
        matched: list[Path] = []
        if not root.exists():
            return matched
        for dirpath, dirnames, filenames in os.walk(root, topdown=True, onerror=lambda _: None):
            dirnames[:] = [name for name in dirnames if name not in skip_dir_names]
            current = Path(dirpath)
            for filename in filenames:
                path = current / filename
                if suffixes and path.suffix not in suffixes:
                    continue
                try:
                    if path.is_file():
                        matched.append(path)
                except OSError:
                    continue
        return matched

    def _check_rpc_discovery_policy(self) -> list[AlignmentCheck]:
        has_grpc = False
        scan_roots = (
            self.root / "crates",
            self.root / "services",
            self.root / "apis",
            self.root / "sdks",
        )
        for root in scan_roots:
            for path in self._iter_scan_files(root, suffixes=(".proto", ".rs")):
                if path.suffix == ".proto":
                    has_grpc = True
                    break
                if path.suffix == ".rs":
                    text = path.read_text(encoding="utf-8", errors="ignore")
                    if "tonic::" in text:
                        has_grpc = True
                        break
            if has_grpc:
                break

        if not has_grpc:
            return [
                AlignmentCheck(
                    id="discovery-not-required",
                    category="discovery",
                    severity="info",
                    status="pass",
                    message="no RPC/gRPC services detected; sdkwork-discovery integration is not required yet",
                    remediation="add sdkwork-discovery when RPC services are introduced",
                )
            ]

        scan_files = (
            self.root / "Cargo.toml",
            self.root / "sdkwork.workflow.json",
            self.root / "specs" / "component.spec.json",
        )
        has_discovery = any(
            path.exists() and "sdkwork-discovery" in path.read_text(encoding="utf-8", errors="ignore")
            for path in scan_files
        )
        service_configs = list((self.root / "services").glob("*/Cargo.toml"))
        has_discovery = has_discovery or any(
            "sdkwork-discovery" in path.read_text(encoding="utf-8", errors="ignore")
            for path in service_configs
        )
        if has_discovery:
            return [
                AlignmentCheck(
                    id="discovery-required",
                    category="discovery",
                    severity="blocking",
                    status="pass",
                    message="RPC services detected and sdkwork-discovery references are present",
                    remediation="",
                )
            ]
        return [
            AlignmentCheck(
                id="discovery-required",
                category="discovery",
                severity="blocking",
                status="fail",
                message="RPC/gRPC services detected but sdkwork-discovery is not integrated",
                remediation="integrate sdkwork-discovery per RPC_SPEC.md and deployment topology",
            )
        ]

    def _check_rust_service_naming(self) -> list[AlignmentCheck]:
        checks: list[AlignmentCheck] = []
        forbidden_legacy_paths = (
            "services/sdkwork-claw-product",
            "services/sdkwork-claw-app",
            "services/sdkwork-claw-admin",
            "services/sdkwork-clawrouter-gateway",
            "crates/sdkwork-claw-product-test-support",
        )
        canonical_service_paths = (
            "services/sdkwork-clawrouter-router-service",
            "services/sdkwork-clawrouter-app-api-server",
            "services/sdkwork-clawrouter-admin-api-server",
            "crates/sdkwork-clawrouter-edge-runtime",
            "crates/sdkwork-clawrouter-standalone-gateway",
        )
        migration_manifest = self.root / "specs" / "naming-migration.manifest.json"
        pending_paths: set[str] = set()
        if migration_manifest.exists():
            data = json.loads(migration_manifest.read_text(encoding="utf-8"))
            for entry in data.get("pendingMigrations", []):
                if isinstance(entry, dict) and isinstance(entry.get("path"), str):
                    pending_paths.add(entry["path"])
        for legacy in forbidden_legacy_paths:
            if (self.root / legacy).exists():
                checks.append(
                    AlignmentCheck(
                        id=f"rust-naming-{legacy.replace('/', '-')}",
                        category="naming",
                        severity="warning",
                        status="fail",
                        message=f"{legacy} still uses retired generic service naming",
                        remediation="rename per specs/naming-migration.manifest.json and NAMING_SPEC.md",
                    )
                )
        for canonical in canonical_service_paths:
            if (self.root / canonical).exists():
                checks.append(
                    AlignmentCheck(
                        id=f"rust-naming-{canonical.replace('/', '-')}",
                        category="naming",
                        severity="info",
                        status="pass",
                        message=f"{canonical} uses canonical router service naming",
                        remediation="",
                    )
                )
        for pending in sorted(pending_paths):
            if (self.root / pending).exists():
                checks.append(
                    AlignmentCheck(
                        id=f"rust-naming-pending-{pending.replace('/', '-')}",
                        category="naming",
                        severity="info",
                        status="pass",
                        message=f"{pending} is documented as a pending rename in specs/naming-migration.manifest.json",
                        remediation="execute pending rename migration per NAMING_SPEC.md",
                    )
                )
        return checks

    def _check_iam_resolver_standardization(self) -> list[AlignmentCheck]:
        checks: list[AlignmentCheck] = []

        integration_path = self.root / self.IAM_RESOLVER_CLAW_INTEGRATION_FILE
        if integration_path.exists():
            integration_text = integration_path.read_text(encoding="utf-8", errors="ignore")
            is_canonical_integration = all(
                marker in integration_text for marker in self.IAM_RESOLVER_CLAW_INTEGRATION_MARKERS
            )
            if is_canonical_integration:
                checks.append(
                    AlignmentCheck(
                        id="iam-resolver-claw-integration-factory",
                        category="iam",
                        severity="blocking",
                        status="pass",
                        message=(
                            f"{self.IAM_RESOLVER_CLAW_INTEGRATION_FILE} provides claw-specific "
                            "IAM database environment materialization without a local resolver wrapper"
                        ),
                        remediation="",
                    )
                )
            else:
                checks.append(
                    AlignmentCheck(
                        id="iam-resolver-claw-integration-factory",
                        category="iam",
                        severity="blocking",
                        status="fail",
                        message=(
                            f"{self.IAM_RESOLVER_CLAW_INTEGRATION_FILE} exists but is not the "
                            "canonical claw IAM database environment integration"
                        ),
                        remediation=(
                            "implement ensure_iam_database_env_for_claw_database per WEB_FRAMEWORK_SPEC.md"
                        ),
                    )
                )
        else:
            checks.append(
                AlignmentCheck(
                    id="iam-resolver-claw-integration-factory",
                    category="iam",
                    severity="blocking",
                    status="fail",
                    message=(
                        f"missing claw IAM database environment integration at "
                        f"{self.IAM_RESOLVER_CLAW_INTEGRATION_FILE}"
                    ),
                    remediation=(
                        "add federated_database_env.rs for IAM database env materialization and wire "
                        "sdkwork_iam_web_adapter directly in route bootstraps"
                    ),
                )
            )

        deprecated_wrapper_paths = (
            "crates/sdkwork-claw-http/src/iam_web_resolver.rs",
            "crates/sdkwork-claw-http/src/web_resolver.rs",
        )
        for relative in deprecated_wrapper_paths:
            wrapper_path = self.root / relative
            if wrapper_path.exists():
                checks.append(
                    AlignmentCheck(
                        id=f"iam-resolver-wrapper-{relative.replace('/', '-')}",
                        category="iam",
                        severity="blocking",
                        status="fail",
                        message=f"deprecated app-local IAM resolver wrapper still exists: {relative}",
                        remediation="remove pass-through resolver wrapper and wire sdkwork_iam_web_adapter directly",
                    )
                )
            else:
                checks.append(
                    AlignmentCheck(
                        id=f"iam-resolver-wrapper-{relative.replace('/', '-')}",
                        category="iam",
                        severity="blocking",
                        status="pass",
                        message=f"no deprecated app-local IAM resolver wrapper at {relative}",
                        remediation="",
                    )
                )

        legacy_hits = 0
        canonical_hits = 0
        legacy_factory_hits = 0
        canonical_factory_hits = 0
        scan_roots = (
            self.root / "crates",
            self.root / "services",
        )
        for root in scan_roots:
            if not root.exists():
                continue
            for path in root.rglob("*.rs"):
                text = path.read_text(encoding="utf-8", errors="ignore")
                if self.IAM_RESOLVER_LEGACY_IMPORT in text:
                    legacy_hits += 1
                if self.IAM_RESOLVER_CANONICAL_IMPORT in text:
                    canonical_hits += 1
                if self.IAM_RESOLVER_LEGACY_FACTORY in text:
                    legacy_factory_hits += 1
                if self.IAM_RESOLVER_CANONICAL_FACTORY in text:
                    canonical_factory_hits += 1

        if legacy_hits == 0:
            checks.append(
                AlignmentCheck(
                    id="iam-resolver-no-legacy-import",
                    category="iam",
                    severity="blocking",
                    status="pass",
                    message=f"no Rust source imports {self.IAM_RESOLVER_LEGACY_IMPORT}",
                    remediation="",
                )
            )
        else:
            checks.append(
                AlignmentCheck(
                    id="iam-resolver-no-legacy-import",
                    category="iam",
                    severity="blocking",
                    status="fail",
                    message=f"legacy IAM resolver import still present in {legacy_hits} Rust source file(s)",
                    remediation=f"replace {self.IAM_RESOLVER_LEGACY_IMPORT} with {self.IAM_RESOLVER_CANONICAL_IMPORT}",
                )
            )

        if canonical_hits > 0:
            checks.append(
                AlignmentCheck(
                    id="iam-resolver-canonical-import",
                    category="iam",
                    severity="blocking",
                    status="pass",
                    message=f"canonical IAM resolver import {self.IAM_RESOLVER_CANONICAL_IMPORT} is in use",
                    remediation="",
                )
            )
        else:
            checks.append(
                AlignmentCheck(
                    id="iam-resolver-canonical-import",
                    category="iam",
                    severity="blocking",
                    status="fail",
                    message=f"canonical IAM resolver import {self.IAM_RESOLVER_CANONICAL_IMPORT} is not used in Rust sources",
                    remediation=f"use {self.IAM_RESOLVER_CANONICAL_IMPORT} from sdkwork_iam_web_adapter in web bootstrap layers",
                )
            )

        if legacy_factory_hits == 0:
            checks.append(
                AlignmentCheck(
                    id="iam-resolver-no-legacy-factory",
                    category="iam",
                    severity="blocking",
                    status="pass",
                    message=f"no Rust source calls {self.IAM_RESOLVER_LEGACY_FACTORY}",
                    remediation="",
                )
            )
        else:
            checks.append(
                AlignmentCheck(
                    id="iam-resolver-no-legacy-factory",
                    category="iam",
                    severity="blocking",
                    status="fail",
                    message=f"legacy IAM resolver factory still present in {legacy_factory_hits} Rust source file(s)",
                    remediation=f"replace {self.IAM_RESOLVER_LEGACY_FACTORY} with {self.IAM_RESOLVER_CANONICAL_FACTORY}",
                )
            )

        if canonical_factory_hits > 0:
            checks.append(
                AlignmentCheck(
                    id="iam-resolver-canonical-factory",
                    category="iam",
                    severity="blocking",
                    status="pass",
                    message=f"canonical IAM resolver factory {self.IAM_RESOLVER_CANONICAL_FACTORY} is in use",
                    remediation="",
                )
            )
        else:
            checks.append(
                AlignmentCheck(
                    id="iam-resolver-canonical-factory",
                    category="iam",
                    severity="blocking",
                    status="fail",
                    message=f"canonical IAM resolver factory {self.IAM_RESOLVER_CANONICAL_FACTORY} is not used in Rust sources",
                    remediation=f"use {self.IAM_RESOLVER_CANONICAL_FACTORY} from sdkwork_iam_web_adapter in web bootstrap layers",
                )
            )

        return checks


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Audit sdkwork-clawrouter alignment with sdkwork-specs framework standards."
    )
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit non-zero when any blocking check fails.",
    )
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON report.")
    args = parser.parse_args()

    result = SdkworkStandardAlignmentGuardian(root=args.root).run()
    if args.json:
        payload = {
            "ok": result.ok,
            "blockingFailures": len(result.blocking),
            "checks": [
                {
                    "id": check.id,
                    "category": check.category,
                    "severity": check.severity,
                    "status": check.status,
                    "message": check.message,
                    "remediation": check.remediation,
                }
                for check in result.checks
            ],
        }
        print(json.dumps(payload, indent=2, ensure_ascii=False))
    else:
        for check in result.checks:
            prefix = {"pass": "PASS", "fail": "FAIL"}[check.status]
            print(f"[{prefix}] ({check.severity}) {check.message}")
            if check.status == "fail" and check.remediation:
                print(f"       -> {check.remediation}")
        print(
            f"\nAlignment summary: {sum(1 for c in result.checks if c.status == 'pass')} passed, "
            f"{sum(1 for c in result.checks if c.status == 'fail')} failed, "
            f"{len(result.blocking)} blocking"
        )

    if args.strict and not result.ok:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
