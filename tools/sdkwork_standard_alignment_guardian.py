from __future__ import annotations

import argparse
import json
import os
import re
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
    ALIGNMENT_MANIFEST = "specs/standard-alignment.manifest.json"

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
        "crates/sdkwork-claw-http/src/claw_web_resolver.rs"
    )
    IAM_RESOLVER_CLAW_INTEGRATION_MARKERS: tuple[str, ...] = (
        "iam_web_resolver_for_claw_database",
        "ensure_iam_database_env_for_claw_database",
    )

    def __init__(self, root: Path) -> None:
        self.root = Path(root).resolve()

    def run(self) -> AlignmentGuardianResult:
        checks: list[AlignmentCheck] = []
        checks.extend(self._check_root_component_specs())
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

    def _check_root_component_specs(self) -> list[AlignmentCheck]:
        spec_path = self.root / self.ROOT_COMPONENT_SPEC
        if not spec_path.exists():
            return [
                AlignmentCheck(
                    id="component-spec-present",
                    category="metadata",
                    severity="blocking",
                    status="fail",
                    message=f"missing root component spec at {self.ROOT_COMPONENT_SPEC}",
                    remediation="create specs/component.spec.json per COMPONENT_SPEC.md",
                )
            ]

        data = json.loads(spec_path.read_text(encoding="utf-8"))
        declared = {
            entry.get("file")
            for entry in data.get("canonicalSpecs", [])
            if isinstance(entry, dict) and isinstance(entry.get("file"), str)
        }
        checks: list[AlignmentCheck] = []
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

        gateway_runtime = self.root / "crates" / "sdkwork-clawrouter-cloud-gateway" / "src" / "runtime.rs"
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
        gateway_runtime = self.root / "crates" / "sdkwork-clawrouter-cloud-gateway" / "src" / "runtime.rs"
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

        gateway_runtime = self.root / "crates" / "sdkwork-clawrouter-cloud-gateway" / "src" / "runtime.rs"
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

        data = json.loads(manifest_path.read_text(encoding="utf-8"))
        migrated = [
            entry
            for entry in data.get("migratedStores", [])
            if isinstance(entry, dict) and entry.get("status") == "MIGRATED"
        ]
        sql_infra = self.root / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql"
        legacy_store_files = 0
        if sql_infra.exists():
            legacy_store_files = sum(
                1 for path in sql_infra.rglob("*_store.rs") if path.is_file()
            )
        checks.append(
            AlignmentCheck(
                id="database-store-migration-manifest",
                category="database",
                severity="warning",
                status="pass",
                message=(
                    f"database store migration manifest tracks {len(migrated)} migrated repository-sqlx "
                    f"module(s); {legacy_store_files} legacy *_store.rs modules remain in router service"
                ),
                remediation="continue phased migration documented in specs/database-store-migration.manifest.json",
            )
        )
        for entry in migrated:
            crate_path = entry.get("crate")
            if isinstance(crate_path, str) and (self.root / crate_path / "Cargo.toml").exists():
                checks.append(
                    AlignmentCheck(
                        id=f"database-store-migration-{entry.get('capability', 'unknown')}",
                        category="database",
                        severity="info",
                        status="pass",
                        message=f"{crate_path} is registered as a migrated repository-sqlx crate",
                        remediation="",
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

        standalone_profile_candidates = (
            self.root / "configs" / "topology" / "standalone.unified-process.production.env",
            self.root / "configs" / "topology" / "self-hosted.unified-process.production.env",
        )
        standalone_profiles = next(
            (path for path in standalone_profile_candidates if path.exists()),
            None,
        )
        if standalone_profiles is not None:
            checks.append(
                AlignmentCheck(
                    id="deployment-standalone-profile",
                    category="deployment",
                    severity="blocking",
                    status="pass",
                    message="standalone production topology profile is present under configs/topology/",
                    remediation="",
                )
            )
        else:
            checks.append(
                AlignmentCheck(
                    id="deployment-standalone-profile",
                    category="deployment",
                    severity="blocking",
                    status="fail",
                    message="missing standalone production topology profile",
                    remediation="add configs/topology/standalone.unified-process.production.env per APP_RUNTIME_TOPOLOGY_NAMING.md",
                )
            )
        return checks

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
            "crates/sdkwork-clawrouter-cloud-gateway",
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
                            "IAM resolver factory with database_config and shared pool wiring"
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
                            "canonical claw IAM integration factory"
                        ),
                        remediation=(
                            "implement iam_web_resolver_for_claw_database and "
                            "ensure_iam_database_env_for_claw_database per WEB_FRAMEWORK_SPEC.md"
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
                        f"missing claw IAM integration factory at "
                        f"{self.IAM_RESOLVER_CLAW_INTEGRATION_FILE}"
                    ),
                    remediation=(
                        "add claw_web_resolver.rs with iam_web_resolver_for_claw_database "
                        "to wire database_config and shared postgres pools into IamWebRequestContextResolver"
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
