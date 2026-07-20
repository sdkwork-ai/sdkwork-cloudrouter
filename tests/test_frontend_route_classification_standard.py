import hashlib
import json
import os
import re
import unittest
from collections import Counter
from pathlib import Path
from typing import Any

import yaml

from tools.frontend_contract_guardian import FrontendContractGuardian


ROOT = Path(__file__).resolve().parents[1]
CLASSIFICATION_PATH = ROOT / "docs" / "schema-registry" / "frontend-route-classification.yaml"
CONTRACT_PATH = ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
MANIFEST_PATH = ROOT / "generated" / "schema" / "manifest" / "schema-manifest.json"
STATIC_SOURCE_MANIFEST_PATH = ROOT / "generated" / "schema" / "frontend" / "frontend-static-source-manifest.json"
PORTAL_ROOT = ROOT / "apps" / "sdkwork-clawrouter-pc"

ALLOWED_DELIVERY_KINDS = {
    "sdk_backed_business_runtime",
    "schema_provenanced_content",
    "local_developer_tool_api",
}

EXPECTED_SDK_CLIENTS = {
    "app": "getClawRouterAppSdkClient",
    "backend": "getClawRouterBackendSdkClient",
}

LOCAL_TOOL_ENDPOINTS = {
    "/api/code-snippet",
    "/api/generate-sdk",
    "/api/sdk-readme",
}

LOCAL_TOOL_BROWSER_PURPOSES = {
    "/openapi.json": "local_openapi_snapshot",
    "/openapi/schema-tabs.json": "local_openapi_snapshot",
    "/api/code-snippet": "local_tool_api",
    "/api/generate-sdk": "local_tool_api",
    "/api/sdk-readme": "local_tool_api",
    "external_runtime_request": "explicit_api_playground_request",
}

ALLOWED_STATIC_DELIVERY_MODES = {
    "curated_seed_content",
    "generated_reference_snapshot",
    "published_catalog_snapshot",
}

ALLOWED_STATIC_REFRESH_POLICIES = {
    "manual_content_release",
    "schema_registry_regeneration",
    "scheduled_snapshot_import",
}

ALLOWED_STATIC_STALENESS = {
    "release_bound",
    "daily_snapshot",
    "weekly_snapshot",
}

ALLOWED_STATIC_UPGRADE_TRIGGERS = {
    "user_personalization",
    "tenant_specific_data",
    "billing_or_pricing_decision",
    "provider_availability",
    "realtime_ranking",
    "authoring_workflow",
    "compliance_review",
}

ISO_DATE_OR_DATETIME_PATTERN = re.compile(
    r"^\d{4}-\d{2}-\d{2}(?:[T ][0-2]\d:[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-][0-2]\d:[0-5]\d)?)?$"
)
SOURCE_HASH_PATTERN = re.compile(r"^sha256:[0-9a-f]{64}$")
PORTAL_SOURCE_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx"}
PORTAL_SOURCE_EXCLUDED_DIRECTORIES = {
    ".git",
    ".turbo",
    ".vite",
    "coverage",
    "dist",
    "node_modules",
}


class FrontendRouteClassificationStandardTest(unittest.TestCase):
    def test_every_actual_portal_route_has_exactly_one_delivery_classification(self) -> None:
        guardian = FrontendContractGuardian(root=ROOT)
        actual_routes = set(guardian.extract_portal_routes())
        actual_route_packages = guardian.extract_portal_route_packages()
        manifest_routes = self._manifest()["routes"]
        classification = self._classification()
        route_entries = self._route_entries(classification)

        self.assertEqual("sdkwork-clawrouter-frontend-route-classification", classification["schema"])
        self.assertEqual("apps/sdkwork-clawrouter-pc/src/App.tsx", classification["source"])

        classified_routes = [entry.get("route") for entry in route_entries]
        duplicates = sorted(route for route, count in Counter(classified_routes).items() if count > 1)
        self.assertEqual([], duplicates, "Each portal route must have exactly one classification entry.")
        self.assertEqual(actual_routes, set(classified_routes))

        for entry in route_entries:
            route = entry["route"]
            with self.subTest(route=route):
                self.assertIn(entry.get("delivery_kind"), ALLOWED_DELIVERY_KINDS)
                self.assertIsInstance(entry.get("package"), str)
                self.assertTrue(entry["package"].startswith("sdkwork-clawrouter-") or entry["package"] == "portal-root")
                self.assertIsInstance(entry.get("owner"), str)
                self.assertTrue(entry["owner"].strip())
                self.assertIsInstance(entry.get("evidence"), list)
                self.assertTrue(entry["evidence"], "Each classification must cite executable evidence.")
                for evidence in entry["evidence"]:
                    self.assertIsInstance(evidence, str)
                    evidence_path = Path(evidence)
                    self.assertFalse(evidence_path.is_absolute(), f"{route} evidence must be repo-relative.")
                    self.assertNotIn("..", evidence_path.parts, f"{route} evidence must stay in repo.")
                    self.assertTrue((ROOT / evidence).exists(), f"{route} evidence file is missing: {evidence}")
                if route in actual_route_packages:
                    self.assertEqual(
                        actual_route_packages[route],
                        entry["package"],
                        f"{route} package must match App.tsx lazy route import.",
                    )

                manifest_route = manifest_routes.get(route)
                self.assertIsInstance(manifest_route, dict, f"{route} must exist in schema manifest.")
                self.assertEqual(manifest_route.get("route_scope"), entry.get("route_scope"))

    def test_admin_host_contributions_are_part_of_the_portal_route_authority(self) -> None:
        guardian = FrontendContractGuardian(root=ROOT)
        actual_routes = set(guardian.extract_portal_routes())
        actual_route_packages = guardian.extract_portal_route_packages()
        expected_packages = {
            "/admin/analytics": "@sdkwork/clawrouter-pc-admin-analytics",
            "/admin/cache": "@sdkwork/clawrouter-pc-admin-cache",
            "/admin/channel": "@sdkwork/clawrouter-pc-admin-channel",
            "/admin/dashboard": "@sdkwork/clawrouter-pc-admin-dashboard",
            "/admin/group": "@sdkwork/clawrouter-pc-admin-group",
            "/admin/model": "@sdkwork/models-pc-admin-catalog",
            "/admin/model/mappings": "@sdkwork/models-pc-admin-catalog",
            "/admin/model/resources": "@sdkwork/models-pc-admin-resource",
            "/admin/model/sites": "@sdkwork/clawrouter-pc-admin-relay-site",
            "/admin/monitor": "@sdkwork/clawrouter-pc-admin-monitor",
            "/admin/ratelimit": "@sdkwork/clawrouter-pc-admin-ratelimit",
            "/admin/record": "@sdkwork/clawrouter-pc-admin-record",
            "/admin/runtime-region": "@sdkwork/clawrouter-pc-admin-runtime-region",
            "/admin/service-nodes": "@sdkwork/clawrouter-pc-admin-service-nodes",
            "/admin/settings": "@sdkwork/clawrouter-pc-admin-site",
            "/admin/site": "@sdkwork/clawrouter-pc-admin-site",
        }

        self.assertTrue(set(expected_packages) <= actual_routes)
        self.assertEqual(expected_packages, {route: actual_route_packages[route] for route in expected_packages})

    def test_sdk_backed_routes_have_frontend_operation_contract_and_expected_sdk_surface(self) -> None:
        classification = self._classification()
        manifest_routes = self._manifest()["routes"]
        frontend_operations = self._frontend_operations()

        for entry in self._route_entries(classification):
            if entry.get("delivery_kind") != "sdk_backed_business_runtime":
                continue

            route = entry["route"]
            api_surface = entry.get("api_surface")
            operation_routes = {route, *self._string_list(entry.get("operation_routes"))}
            matching_operations = [
                operation
                for operation in frontend_operations
                if operation.get("route") in operation_routes and operation.get("api_surface") == api_surface
            ]

            with self.subTest(route=route):
                self.assertIn(api_surface, EXPECTED_SDK_CLIENTS)
                self.assertEqual(api_surface, manifest_routes[route].get("required_api_surface"))
                self.assertTrue(matching_operations, f"{route} must cite at least one {api_surface} operation.")

                expected_client = EXPECTED_SDK_CLIENTS[api_surface]
                operation_sources = sorted(
                    {
                        operation["source"]
                        for operation in matching_operations
                        if isinstance(operation.get("source"), str)
                    }
                )
                self.assertTrue(operation_sources, f"{route} operations must declare source files.")
                self.assertTrue(
                    any(expected_client in self._read_relative(source) for source in operation_sources),
                    f"{route} must be implemented through {expected_client}.",
                )

    def test_schema_content_routes_are_manifest_provenanced_without_runtime_business_operations(self) -> None:
        classification = self._classification()
        manifest_routes = self._manifest()["routes"]
        operation_routes = {
            operation["route"]
            for operation in self._frontend_operations()
            if isinstance(operation.get("route"), str)
        }

        for entry in self._route_entries(classification):
            if entry.get("delivery_kind") != "schema_provenanced_content":
                continue

            route = entry["route"]
            provenance_tables = set(self._string_list(entry.get("provenance_tables")))
            manifest_tables = set(self._string_list(manifest_routes[route].get("tables")))

            with self.subTest(route=route):
                self.assertTrue(provenance_tables, f"{route} must name schema provenance tables.")
                self.assertTrue(provenance_tables <= manifest_tables)
                self.assertNotIn(route, operation_routes, f"{route} should not hide runtime API work as static content.")
                self.assertEqual(
                    [],
                    self._runtime_network_client_sources(entry, classification),
                    f"{route} schema content must not contain runtime network client usage.",
                )
                self._assert_schema_content_static_delivery(route, entry)

    def test_local_tool_api_routes_are_env_gated_and_exhaustive(self) -> None:
        classification = self._classification()
        local_entries = [
            entry
            for entry in self._route_entries(classification)
            if entry.get("delivery_kind") == "local_developer_tool_api"
        ]
        self.assertTrue(local_entries, "Local developer tool API routes must be classified explicitly.")

        declared_endpoint_sources: set[tuple[str, str]] = set()
        for entry in local_entries:
            route = entry["route"]
            tool_endpoints = set(self._string_list(entry.get("tool_endpoints")))
            source_files = set(self._string_list(entry.get("source_files")))
            gate_sources = self._string_list(entry.get("gate_sources"))

            with self.subTest(route=route):
                self.assertTrue(tool_endpoints & LOCAL_TOOL_ENDPOINTS)
                self.assertTrue(tool_endpoints <= LOCAL_TOOL_ENDPOINTS)
                self.assertEqual("VITE_TOOL_API_ENABLED", entry.get("browser_env"))
                self.assertEqual("PORTAL_PUBLIC_TOOL_API_ENABLED", entry.get("runtime_env"))
                self.assertTrue(source_files)
                self.assertTrue(gate_sources)
                self.assertEqual(
                    self._browser_fetch_sources_for_package(entry["package"]),
                    self._declared_browser_network_sources(entry),
                    f"{route} must declare every raw browser fetch source in browser_network_sources.",
                )
                self._assert_local_tool_browser_network_source_metadata(route, entry, tool_endpoints)
                for gate_source in gate_sources:
                    source = self._read_relative(gate_source)
                    self.assertIn("resolveClawRouterRuntimeBoolean", source)
                    self.assertIn("VITE_TOOL_API_ENABLED", source)

            for endpoint in tool_endpoints:
                for source_file in source_files:
                    declared_endpoint_sources.add((endpoint, source_file))

        actual_endpoint_sources = self._browser_tool_endpoint_sources()
        self.assertEqual(actual_endpoint_sources, declared_endpoint_sources)

        edge_server_source = (ROOT / "services" / "sdkwork-clawrouter-edge-runtime" / "src" / "edge_server.rs").read_text(
            encoding="utf-8"
        )
        self.assertIn("PORTAL_PUBLIC_TOOL_API_ENABLED", (PORTAL_ROOT / "vite.config.ts").read_text(encoding="utf-8"))
        self.assertIn("tool_api_enabled", edge_server_source)
        self.assertIn("handle_portal_tool_api", edge_server_source)
        self.assertIn("normalize_code_snippet_request", edge_server_source)
        self.assertIn("normalize_sdk_readme_request", edge_server_source)
        for endpoint in LOCAL_TOOL_ENDPOINTS:
            self.assertIn(endpoint, edge_server_source)

    def _classification(self) -> dict[str, Any]:
        self.assertTrue(CLASSIFICATION_PATH.exists(), "frontend route classification registry is missing.")
        data = yaml.safe_load(CLASSIFICATION_PATH.read_text(encoding="utf-8"))
        self.assertIsInstance(data, dict)
        return data

    def _manifest(self) -> dict[str, Any]:
        import json

        data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        self.assertIsInstance(data, dict)
        self.assertIsInstance(data.get("routes"), dict)
        return data

    def _frontend_operations(self) -> list[dict[str, Any]]:
        data = yaml.safe_load(CONTRACT_PATH.read_text(encoding="utf-8"))
        operations = data.get("frontend_operations")
        self.assertIsInstance(operations, list)
        return [operation for operation in operations if isinstance(operation, dict)]

    def _route_entries(self, classification: dict[str, Any]) -> list[dict[str, Any]]:
        routes = classification.get("routes")
        self.assertIsInstance(routes, list)
        for entry in routes:
            self.assertIsInstance(entry, dict)
            self.assertIsInstance(entry.get("route"), str)
        return routes

    def _read_relative(self, relative_path: str) -> str:
        path = ROOT / relative_path
        self.assertTrue(path.exists(), f"{relative_path} must exist.")
        return path.read_text(encoding="utf-8")

    def _string_list(self, value: Any) -> list[str]:
        if not isinstance(value, list):
            return []
        return [item for item in value if isinstance(item, str)]

    def _browser_tool_endpoint_sources(self) -> set[tuple[str, str]]:
        endpoint_call = re.compile(r"fetch\(\s*['\"](/api/(?:code-snippet|generate-sdk|sdk-readme))['\"]")
        sources: set[tuple[str, str]] = set()

        for root in [PORTAL_ROOT / "src", PORTAL_ROOT / "packages"]:
            if not root.exists():
                continue
            for source_path in self._portal_source_files(root, {".ts", ".tsx"}):
                relative = source_path.relative_to(ROOT).as_posix()
                source = source_path.read_text(encoding="utf-8", errors="ignore")
                for match in endpoint_call.finditer(source):
                    sources.add((match.group(1), relative))
        return sources

    def _browser_fetch_sources_for_package(self, package_name: str) -> set[str]:
        fetch_call = re.compile(r"\bfetch\s*\(\s*([^,\)\n]+)")
        package_src = PORTAL_ROOT / "packages" / package_name / "src"
        sources: set[str] = set()
        for source_path in self._portal_source_files(package_src):
            source = source_path.read_text(encoding="utf-8", errors="ignore")
            relative = source_path.relative_to(ROOT).as_posix()
            for match in fetch_call.finditer(source):
                if self._is_ignored_source_position(source, match.start()):
                    continue
                endpoint = self._classify_fetch_argument(match.group(1), source_path)
                sources.add(f"{endpoint}|{relative}")
        return sources

    def _classify_fetch_argument(self, raw_argument: str, source_path: Path | None = None) -> str:
        argument = raw_argument.strip()
        literal_match = re.match(r"['\"]([^'\"]+)['\"]", argument)
        if literal_match is not None:
            return literal_match.group(1)
        if argument == "url" and source_path is not None and source_path.name == "apiReferenceSchemaTabs.ts":
            return "external_runtime_request"
        return "external_runtime_request"

    def _declared_browser_network_sources(self, entry: dict[str, Any]) -> set[str]:
        sources = entry.get("browser_network_sources")
        self.assertIsInstance(sources, list)
        declared: set[str] = set()
        for item in sources:
            self.assertIsInstance(item, dict)
            self.assertIsInstance(item.get("endpoint"), str)
            self.assertIsInstance(item.get("source"), str)
            self.assertIsInstance(item.get("purpose"), str)
            self.assertTrue(item["purpose"].strip())
            declared.add(f"{item['endpoint']}|{item['source']}")
        return declared

    def _assert_local_tool_browser_network_source_metadata(
        self,
        route: str,
        entry: dict[str, Any],
        tool_endpoints: set[str],
    ) -> None:
        sources = entry.get("browser_network_sources")
        self.assertIsInstance(sources, list)
        for item in sources:
            endpoint = item["endpoint"]
            source = item["source"]
            expected_purpose = self._expected_local_tool_browser_purpose(endpoint, source)
            self.assertIsNotNone(expected_purpose, f"{route} declares unsupported browser endpoint {endpoint}.")
            self.assertEqual(
                expected_purpose,
                item["purpose"],
                f"{route} {endpoint}|{source} must use the standard browser network purpose.",
            )
            if endpoint.startswith("/api/"):
                self.assertIn(
                    endpoint,
                    tool_endpoints,
                    f"{route} {endpoint}|{source} must be backed by a declared tool_endpoint.",
                )
            if endpoint == "external_runtime_request":
                self.assertIn(
                    Path(source).stem,
                    {"ApiPlayground", "apiReferenceSchemaTabs"},
                    f"{route} external runtime requests must be isolated in ApiPlayground or schema-tabs loader.",
                )

    def _expected_local_tool_browser_purpose(self, endpoint: str, source: str) -> str | None:
        if endpoint == "external_runtime_request" and Path(source).stem == "apiReferenceSchemaTabs":
            return "local_openapi_snapshot"
        return LOCAL_TOOL_BROWSER_PURPOSES.get(endpoint)

    def _assert_schema_content_static_delivery(self, route: str, entry: dict[str, Any]) -> None:
        static_delivery = entry.get("static_delivery")
        self.assertIsInstance(static_delivery, dict, f"{route} must declare static_delivery.")
        self.assertIn(
            static_delivery.get("mode"),
            ALLOWED_STATIC_DELIVERY_MODES,
            f"{route} must use an approved static delivery mode.",
        )
        self.assertIn(
            static_delivery.get("refresh_policy"),
            ALLOWED_STATIC_REFRESH_POLICIES,
            f"{route} must use an approved static refresh policy.",
        )
        self.assertIn(
            static_delivery.get("max_staleness"),
            ALLOWED_STATIC_STALENESS,
            f"{route} must declare an approved static max_staleness.",
        )
        upgrade_triggers = self._string_list(static_delivery.get("upgrade_triggers"))
        self.assertTrue(upgrade_triggers, f"{route} must declare static upgrade triggers.")
        self.assertTrue(
            set(upgrade_triggers) <= ALLOWED_STATIC_UPGRADE_TRIGGERS,
            f"{route} contains unsupported static upgrade triggers.",
        )
        self._assert_static_source_metadata(route, entry, static_delivery)

    def _assert_static_source_metadata(
        self,
        route: str,
        entry: dict[str, Any],
        static_delivery: dict[str, Any],
    ) -> None:
        self.assertNotIn("source_metadata", static_delivery, f"{route} must not inline generated source metadata.")
        manifest_ref = static_delivery.get("source_manifest_ref")
        self.assertIsInstance(manifest_ref, str, f"{route} static delivery must declare source_manifest_ref.")
        self.assertEqual(f"static-route:{route}", manifest_ref)

        manifest = self._static_source_manifest()
        self.assertEqual("sdkwork-clawrouter-frontend-static-source-manifest", manifest.get("schema"))
        self.assertEqual(1, manifest.get("version"))
        snapshots = manifest.get("snapshots")
        self.assertIsInstance(snapshots, dict)
        metadata = snapshots.get(manifest_ref)
        self.assertIsInstance(metadata, dict, f"{route} source_manifest_ref must exist in static source manifest.")
        self.assertEqual(manifest_ref, metadata.get("id"))
        self.assertEqual(route, metadata.get("route"))
        self.assertEqual(static_delivery.get("mode"), metadata.get("mode"))

        source_ref = metadata.get("source_ref")
        self.assertIsInstance(source_ref, str, f"{route} static source manifest source_ref must be a path.")
        source_path = Path(source_ref)
        self.assertFalse(source_path.is_absolute(), f"{route} static source manifest source_ref must be repo-relative.")
        self.assertNotIn("..", source_path.parts, f"{route} static source manifest source_ref must stay in repo.")
        resolved_source = ROOT / source_ref
        self.assertTrue(resolved_source.is_file(), f"{route} static source manifest source_ref is missing.")

        observed_at = metadata.get("observed_at")
        self.assertIsInstance(observed_at, str, f"{route} static source manifest observed_at must be a string.")
        self.assertRegex(
            observed_at,
            ISO_DATE_OR_DATETIME_PATTERN,
            f"{route} static source manifest observed_at must be an ISO date or datetime.",
        )

        source_hash = metadata.get("source_hash")
        self.assertIsInstance(source_hash, str, f"{route} static source manifest source_hash must be a string.")
        self.assertRegex(
            source_hash,
            SOURCE_HASH_PATTERN,
            f"{route} static source manifest source_hash must be sha256:<64 lowercase hex>.",
        )
        actual_hash = "sha256:" + hashlib.sha256(resolved_source.read_bytes()).hexdigest()
        self.assertEqual(actual_hash, source_hash, f"{route} static source manifest source_hash must match source_ref.")

        schema_tables = set(self._string_list(metadata.get("schema_tables")))
        provenance_tables = set(self._string_list(entry.get("provenance_tables")))
        self.assertTrue(schema_tables, f"{route} static source manifest schema_tables must not be empty.")
        self.assertTrue(
            schema_tables <= provenance_tables,
            f"{route} static source manifest schema_tables must be a subset of provenance_tables.",
        )

    def _static_source_manifest(self) -> dict[str, Any]:
        self.assertTrue(STATIC_SOURCE_MANIFEST_PATH.exists(), "frontend static source manifest is missing.")
        data = json.loads(STATIC_SOURCE_MANIFEST_PATH.read_text(encoding="utf-8"))
        self.assertIsInstance(data, dict)
        return data

    def _is_ignored_source_position(self, source: str, position: int) -> bool:
        line_start = source.rfind("\n", 0, position) + 1
        return self._is_ignored_line_position(source[line_start:position])

    def _portal_source_files(
        self,
        source_root: Path,
        extensions: set[str] | None = None,
    ) -> list[Path]:
        if not source_root.exists():
            return []
        allowed_extensions = extensions or PORTAL_SOURCE_EXTENSIONS
        files: list[Path] = []
        for current_root, directories, filenames in os.walk(source_root):
            directories[:] = [
                directory
                for directory in directories
                if directory not in PORTAL_SOURCE_EXCLUDED_DIRECTORIES
            ]
            current_path = Path(current_root)
            for filename in filenames:
                path = current_path / filename
                if path.suffix in allowed_extensions:
                    files.append(path)
        return sorted(files)

    def _is_ignored_line_position(self, prefix: str) -> bool:
        in_single_quote = False
        in_double_quote = False
        in_template = False
        in_line_comment = False
        in_block_comment = False
        escaped = False
        index = 0

        while index < len(prefix):
            char = prefix[index]
            next_char = prefix[index + 1] if index + 1 < len(prefix) else ""

            if in_line_comment:
                return True
            if in_block_comment:
                if char == "*" and next_char == "/":
                    in_block_comment = False
                    index += 2
                else:
                    index += 1
                continue
            if in_single_quote or in_double_quote or in_template:
                if escaped:
                    escaped = False
                    index += 1
                    continue
                if char == "\\":
                    escaped = True
                    index += 1
                    continue
                if in_single_quote and char == "'":
                    in_single_quote = False
                elif in_double_quote and char == '"':
                    in_double_quote = False
                elif in_template and char == "`":
                    in_template = False
                index += 1
                continue

            if char == "/" and next_char == "/":
                in_line_comment = True
                index += 2
                continue
            if char == "/" and next_char == "*":
                in_block_comment = True
                index += 2
                continue
            if char == "'":
                in_single_quote = True
            elif char == '"':
                in_double_quote = True
            elif char == "`":
                in_template = True
            index += 1

        return in_single_quote or in_double_quote or in_template or in_line_comment or in_block_comment

    def _runtime_network_client_sources(
        self,
        entry: dict[str, Any],
        classification: dict[str, Any],
    ) -> list[str]:
        package_name = entry.get("package")
        self.assertIsInstance(package_name, str)
        package_entries = [
            route_entry
            for route_entry in self._route_entries(classification)
            if route_entry.get("package") == package_name
        ]
        package_kinds = {route_entry.get("delivery_kind") for route_entry in package_entries}
        package_src = PORTAL_ROOT / "packages" / package_name / "src"

        if package_kinds <= {"schema_provenanced_content"}:
            candidate_paths = self._portal_source_files(package_src)
        else:
            candidate_paths = []
            for evidence in self._string_list(entry.get("evidence")):
                path = ROOT / evidence
                if (
                    path.is_file()
                    and path.suffix in {".ts", ".tsx", ".js", ".jsx"}
                    and package_src in path.parents
                ):
                    candidate_paths.append(path)

        runtime_client = re.compile(
            r"\bfetch\s*\("
            r"|\baxios(?:\s*\(|\.[A-Za-z_$][\w$]*\s*\()"
            r"|\bnew\s+XMLHttpRequest\s*\("
            r"|\bgetClawRouterAppSdkClient\s*\("
            r"|\bgetClawRouterBackendSdkClient\s*\("
            r"|^\s*import\s+(?:[^'\"]+\s+from\s+)?['\"]axios['\"]",
            re.MULTILINE,
        )
        return [
            path.relative_to(ROOT).as_posix()
            for path in candidate_paths
            if runtime_client.search(path.read_text(encoding="utf-8", errors="ignore"))
        ]


if __name__ == "__main__":
    unittest.main()
