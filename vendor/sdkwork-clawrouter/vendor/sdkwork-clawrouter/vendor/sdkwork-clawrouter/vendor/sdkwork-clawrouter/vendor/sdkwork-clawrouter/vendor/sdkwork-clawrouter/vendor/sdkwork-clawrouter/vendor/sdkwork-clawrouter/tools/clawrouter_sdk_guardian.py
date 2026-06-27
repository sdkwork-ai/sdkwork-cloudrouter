from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from tools.clawrouter_sdk_runtime_standardizer import (
    SDK_GENERATED_OPENAPI_PATHS,
    SdkRuntimeStandardizer,
    sdk_derived_specs,
    sdk_forbidden_generation_input_path_symbol,
    sdk_generation_input_path_symbol,
    sdk_generation_input_spec,
)


@dataclass(frozen=True)
class ClawRouterSdkGuardianResult:
    ok: bool
    messages: list[str]


@dataclass(frozen=True)
class ExpectedSdk:
    family_directory: str
    typescript_directory: str
    package_name: str
    sdk_type: str
    client_name: str

    @property
    def package_relative_dir(self) -> Path:
        return Path(self.family_directory) / self.typescript_directory


class ClawRouterSdkGuardian:
    """Check generated project SDK packages without modifying generator-owned files."""

    OFFICIAL_SDK_LANGUAGES = (
        "typescript",
        "flutter",
        "rust",
        "java",
        "csharp",
        "swift",
        "kotlin",
        "go",
        "python",
    )

    OPEN_EMPTY_RECORD_PATTERN = re.compile(
        r"^\s*export\s+type\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*Record<string,\s*unknown>\s*;",
        flags=re.MULTILINE,
    )
    EMPTY_INTERFACE_PATTERN = re.compile(
        r"^\s*export\s+interface\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\{\s*\}",
        flags=re.MULTILINE,
    )
    FORBIDDEN_COMMON_TYPE_EXPORTS = ("PageResult",)
    STANDARD_PACKAGE_ENTRY_FILES = {
        "main": "./dist/index.cjs",
        "module": "./dist/index.js",
        "types": "./dist/index.d.ts",
    }
    STANDARD_PACKAGE_EXPORT_ENTRY_FILES = {
        "types": "./dist/index.d.ts",
        "import": "./dist/index.js",
        "require": "./dist/index.cjs",
    }
    FORBIDDEN_PUBLIC_EMPTY_RECORD_PREFIXES = (
        "Create",
        "Delete",
        "Disable",
        "Enable",
        "Fetch",
        "Offline",
        "Publish",
        "Reject",
        "Remove",
        "Sync",
        "Test",
        "Trigger",
        "Update",
    )
    FORBIDDEN_PUBLIC_EMPTY_RECORD_SUFFIXES = ("Request", "Result", "Response")
    FORBIDDEN_NO_DATA_TYPE_PATTERN = re.compile(
        r"\b(?:interface|type|class|enum)\s+NoData\b",
        flags=re.MULTILINE,
    )
    SDK_WORKSPACE_SUPPORT_DIRECTORIES = frozenset(
        {
            "_route-manifests",
            "_shared",
            "test",
        }
    )

    APP_MODEL_CATALOG_PRIVATE_ITEM_FIELDS = ("lowestUpstreamCostUnitPrice",)
    APP_MODEL_CATALOG_PRIVATE_AVAILABILITY_FIELDS = (
        "customerUnitPrice",
        "grossMarginPerUnit",
        "pricingPlanCode",
        "groupCode",
    )
    APP_MODEL_CATALOG_PUBLIC_AVAILABILITY_STATUS = ("reference", "unavailable")

    EXPECTED = (
        ExpectedSdk(
            family_directory="clawrouter-app-sdk",
            typescript_directory="clawrouter-app-sdk-typescript",
            package_name="@sdkwork/clawrouter-app-sdk",
            sdk_type="app",
            client_name="SdkworkAppClient",
        ),
        ExpectedSdk(
            family_directory="clawrouter-backend-sdk",
            typescript_directory="clawrouter-backend-sdk-typescript",
            package_name="@sdkwork/clawrouter-backend-sdk",
            sdk_type="backend",
            client_name="SdkworkBackendClient",
        ),
        ExpectedSdk(
            family_directory="clawrouter-open-sdk",
            typescript_directory="clawrouter-open-sdk-typescript",
            package_name="@sdkwork/clawrouter-open-sdk",
            sdk_type="ai",
            client_name="SdkworkAiClient",
        ),
    )

    def __init__(self, root: Path) -> None:
        self.root = Path(root).resolve()
        self.sdk_root = self.root / "sdks"

    def run(self) -> ClawRouterSdkGuardianResult:
        messages: list[str] = []
        messages.extend(self._check_exact_sdk_systems())
        for expected in self.EXPECTED:
            messages.extend(self._check_sdk(expected))
        messages.extend(self._check_portal_boundary())
        return ClawRouterSdkGuardianResult(ok=not messages, messages=messages)

    def _check_exact_sdk_systems(self) -> list[str]:
        if not self.sdk_root.exists() or not self.sdk_root.is_dir():
            return []

        expected = {item.family_directory for item in self.EXPECTED}
        actual = {
            item.name
            for item in self.sdk_root.iterdir()
            if item.is_dir() and item.name not in self.SDK_WORKSPACE_SUPPORT_DIRECTORIES
        }
        return [
            f"unexpected generated SDK family is present: {self.sdk_root / family_directory}"
            for family_directory in sorted(actual - expected)
        ]

    def _check_sdk(self, expected: ExpectedSdk) -> list[str]:
        messages: list[str] = []
        family = self.sdk_root / expected.family_directory
        base = family / expected.typescript_directory
        messages.extend(self._check_sdk_family(expected, family))
        if not base.exists():
            return [*messages, f"generated TypeScript SDK is missing: {base}"]
        if not base.is_dir():
            return [*messages, f"generated TypeScript SDK path must be a directory: {base}"]

        package = self._read_json(base / "package.json", messages)
        if package is not None and package.get("name") != expected.package_name:
            messages.append(f"{expected.typescript_directory} package.json name must be {expected.package_name}")
        if package is not None:
            self._check_package_entry_files(expected.typescript_directory, base, package, messages)
            self._check_package_build_standard(expected.typescript_directory, base, package, messages)

        metadata = self._read_json(base / "sdkwork-sdk.json", messages)
        if metadata is not None:
            if metadata.get("language") != "typescript":
                messages.append(f"{expected.typescript_directory} sdkwork-sdk.json language must be typescript")
            if metadata.get("sdkType") != expected.sdk_type:
                messages.append(f"{expected.typescript_directory} sdkwork-sdk.json sdkType must be {expected.sdk_type}")

        self._require_file(base / "README.md", messages)
        self._require_file(base / "custom" / "README.md", messages)
        self._require_file(base / ".sdkwork" / "sdkwork-generator-manifest.json", messages)
        messages.extend(self._check_family_openapi_sync(expected, family))

        sdk_source = self._read_text(base / "src" / "sdk.ts", messages)
        if sdk_source is not None and expected.client_name not in sdk_source:
            messages.append(f"{expected.typescript_directory} src/sdk.ts must export {expected.client_name}")

        self._require_file(base / "src" / "api" / "paths.ts", messages)

        self._check_unexported_api_artifacts(expected.typescript_directory, base, messages)
        self._check_type_index_exports(expected.typescript_directory, base, messages)
        self._check_strict_public_types(expected.typescript_directory, base, messages)
        if expected.sdk_type in {"app", "backend"}:
            self._check_standard_query_parameters(expected.typescript_directory, base, messages)

        if expected.sdk_type == "app":
            self._check_public_app_model_catalog_types(expected.typescript_directory, base, messages)
        if expected.sdk_type == "backend":
            self._check_backend_ecosystem_skill_resource_tree(expected.typescript_directory, base, messages)
        return messages

    def _check_family_openapi_sync(self, expected: ExpectedSdk, family: Path) -> list[str]:
        source_relative = SDK_GENERATED_OPENAPI_PATHS.get(expected.family_directory)
        if source_relative is None:
            return []

        source_path = self.root / source_relative
        if not source_path.exists():
            return []

        messages: list[str] = []
        source_spec = self._read_json(source_path, messages)
        if source_spec is None:
            return messages

        openapi_path = family / "openapi" / f"{expected.family_directory}.openapi.json"
        sdkgen_path = family / "openapi" / f"{expected.family_directory}.sdkgen.json"
        family_openapi = self._read_json(openapi_path, messages)
        family_sdkgen = self._read_json(sdkgen_path, messages)
        family_openapi_relative = openapi_path.relative_to(family).as_posix()
        family_sdkgen_relative = sdkgen_path.relative_to(family).as_posix()
        source_relative = source_path.relative_to(self.root).as_posix()

        standardizer = SdkRuntimeStandardizer(root=self.root)
        expected_authority = standardizer._owner_only_openapi_payload(expected.family_directory, source_spec)

        if family_openapi is not None and family_openapi != expected_authority:
            messages.append(
                f"{expected.family_directory} {family_openapi_relative} must stay synchronized with "
                f"owner-only {source_relative}"
            )

        expected_sdkgen = expected_authority
        if expected.family_directory == "clawrouter-open-sdk":
            expected_sdkgen = standardizer._derive_sdkgen_openapi(expected_authority)

        if family_sdkgen is not None and family_sdkgen != expected_sdkgen:
            source_label = source_relative
            if expected.family_directory == "clawrouter-open-sdk":
                source_label = f"derived {source_label}"
            messages.append(
                f"{expected.family_directory} {family_sdkgen_relative} must stay synchronized with {source_label}"
            )

        return messages

    def _check_sdk_family(self, expected: ExpectedSdk, family: Path) -> list[str]:
        messages: list[str] = []
        if not family.exists():
            return [f"generated SDK family is missing: {family}"]
        if not family.is_dir():
            return [f"generated SDK family path must be a directory: {family}"]

        forbidden_root_artifacts = (
            "package.json",
            "sdkwork-sdk.json",
            "tsconfig.json",
            "src",
            "custom",
            ".sdkwork",
        )
        for artifact in forbidden_root_artifacts:
            if (family / artifact).exists():
                messages.append(
                    f"{expected.family_directory} must be an SDK family directory; "
                    f"{artifact} belongs under {expected.typescript_directory}"
                )

        self._require_file(family / "README.md", messages)
        self._require_file(family / ".sdkwork-assembly.json", messages)
        self._require_file(family / "openapi" / f"{expected.family_directory}.openapi.json", messages)
        self._require_file(family / "openapi" / f"{expected.family_directory}.sdkgen.json", messages)
        self._require_file(family / "bin" / "generate-sdk.mjs", messages)
        self._require_file(family / "bin" / "verify-sdk.mjs", messages)
        if not (family / "tests").is_dir():
            messages.append(f"{expected.family_directory} tests directory is required")
        generate_script = self._read_text(family / "bin" / "generate-sdk.mjs", [])
        if generate_script is not None:
            if "--language" not in generate_script or "OFFICIAL_LANGUAGES" not in generate_script:
                messages.append(
                    f"{expected.family_directory} bin/generate-sdk.mjs must support --language language selection"
                )
            authority_input_value = self._javascript_const_string_value(generate_script, "authorityInputPath")
            expected_authority_input_value = "sdks/${sdkFamily}/openapi/${sdkFamily}.openapi.json"
            if authority_input_value is None:
                messages.append(
                    f"{expected.family_directory} bin/generate-sdk.mjs must declare authorityInputPath"
                )
            elif authority_input_value != expected_authority_input_value:
                messages.append(
                    f"{expected.family_directory} bin/generate-sdk.mjs authorityInputPath must point to "
                    "openapi/${sdkFamily}.openapi.json"
                )
            if expected.family_directory == "clawrouter-open-sdk":
                sdkgen_input_value = self._javascript_const_string_value(generate_script, "sdkgenInputPath")
                expected_sdkgen_input_value = "sdks/${sdkFamily}/openapi/${sdkFamily}.sdkgen.json"
                if sdkgen_input_value is None:
                    messages.append(
                        f"{expected.family_directory} bin/generate-sdk.mjs must declare sdkgenInputPath "
                        "because generation uses the derived sdkgen contract"
                    )
                elif sdkgen_input_value != expected_sdkgen_input_value:
                    messages.append(
                        f"{expected.family_directory} bin/generate-sdk.mjs sdkgenInputPath must point to "
                        "openapi/${sdkFamily}.sdkgen.json"
                    )
            elif "const sdkgenInputPath" in generate_script:
                messages.append(
                    f"{expected.family_directory} bin/generate-sdk.mjs must not declare sdkgenInputPath "
                    "because generation uses the authority OpenAPI"
                )
            if f"sdks/${{sdkFamily}}/${{sdkFamily}}-${{language}}/generated/server-openapi" not in generate_script:
                messages.append(
                    f"{expected.family_directory} bin/generate-sdk.mjs must generate non-TypeScript SDKs "
                    "under <family>-<language>/generated/server-openapi"
                )
            if (
                "cleanGeneratedOutput(language);" not in generate_script
                or "function cleanGeneratedOutput(language)" not in generate_script
            ):
                messages.append(
                    f"{expected.family_directory} bin/generate-sdk.mjs must clean non-TypeScript "
                    "generated transport output after generation"
                )
            strict_type_script_body = self._javascript_function_body(generate_script, "strictTypeScriptArgs")
            if strict_type_script_body is None:
                messages.append(f"{expected.family_directory} bin/generate-sdk.mjs must define strictTypeScriptArgs()")
            else:
                strict_input_path = sdk_generation_input_path_symbol(expected.family_directory)
                forbidden_strict_input_path = sdk_forbidden_generation_input_path_symbol(expected.family_directory)
                if f"'-i', {strict_input_path}" not in strict_type_script_body:
                    if expected.family_directory == "clawrouter-open-sdk":
                        messages.append(
                            f"{expected.family_directory} bin/generate-sdk.mjs strictTypeScriptArgs() must generate from "
                            "openapi/${sdkFamily}.sdkgen.json"
                        )
                    else:
                        messages.append(
                            f"{expected.family_directory} bin/generate-sdk.mjs strictTypeScriptArgs() must generate from "
                            "openapi/${sdkFamily}.openapi.json"
                        )
                if f"'-i', {forbidden_strict_input_path}" in strict_type_script_body:
                    if expected.family_directory == "clawrouter-open-sdk":
                        messages.append(
                            f"{expected.family_directory} bin/generate-sdk.mjs strictTypeScriptArgs() must not generate from "
                            "openapi/${sdkFamily}.openapi.json"
                        )
                    else:
                        messages.append(
                            f"{expected.family_directory} bin/generate-sdk.mjs strictTypeScriptArgs() must not generate from "
                            "openapi/${sdkFamily}.sdkgen.json"
                        )
            generator_body = self._javascript_function_body(generate_script, "generatorArgs")
            if generator_body is None:
                messages.append(f"{expected.family_directory} bin/generate-sdk.mjs must define generatorArgs(language)")
            else:
                generator_input_path = sdk_generation_input_path_symbol(expected.family_directory)
                forbidden_generator_input_path = sdk_forbidden_generation_input_path_symbol(expected.family_directory)
                if f"'-i', {generator_input_path}" not in generator_body:
                    if expected.family_directory == "clawrouter-open-sdk":
                        messages.append(
                            f"{expected.family_directory} bin/generate-sdk.mjs generatorArgs(language) must generate from "
                            "openapi/${sdkFamily}.sdkgen.json"
                        )
                    else:
                        messages.append(
                            f"{expected.family_directory} bin/generate-sdk.mjs generatorArgs(language) must generate from "
                            "openapi/${sdkFamily}.openapi.json"
                        )
                if f"'-i', {forbidden_generator_input_path}" in generator_body:
                    if expected.family_directory == "clawrouter-open-sdk":
                        messages.append(
                            f"{expected.family_directory} bin/generate-sdk.mjs generatorArgs(language) must not generate from "
                            "openapi/${sdkFamily}.openapi.json"
                        )
                    else:
                        messages.append(
                            f"{expected.family_directory} bin/generate-sdk.mjs generatorArgs(language) must not generate from "
                            "openapi/${sdkFamily}.sdkgen.json"
                        )

        assembly = self._read_json(family / ".sdkwork-assembly.json", messages)
        if assembly is not None:
            if assembly.get("workspace") != expected.family_directory:
                messages.append(f"{expected.family_directory} .sdkwork-assembly.json workspace must match")
            if "derivedSpec" in assembly:
                messages.append(
                    f"{expected.family_directory} .sdkwork-assembly.json must not declare legacy derivedSpec; "
                    "use derivedSpecs"
                )
            expected_generation_input = sdk_generation_input_spec(expected.family_directory)
            if assembly.get("generationInputSpec") != expected_generation_input:
                messages.append(
                    f"{expected.family_directory} .sdkwork-assembly.json generationInputSpec must be "
                    f"{expected_generation_input}"
                )
            derived_specs = assembly.get("derivedSpecs")
            expected_derived_specs = sdk_derived_specs(expected.family_directory)
            if not isinstance(derived_specs, dict):
                messages.append(f"{expected.family_directory} .sdkwork-assembly.json derivedSpecs must be an object")
            elif expected.family_directory == "clawrouter-open-sdk":
                if derived_specs != expected_derived_specs:
                    messages.append(
                        f"{expected.family_directory} .sdkwork-assembly.json derivedSpecs.sdk-generator must be "
                        f"openapi/{expected.family_directory}.sdkgen.json"
                    )
            elif derived_specs != expected_derived_specs:
                messages.append(
                    f"{expected.family_directory} .sdkwork-assembly.json derivedSpecs must be empty because "
                    "generation uses the authority OpenAPI"
                )
            languages = assembly.get("languages")
            if not isinstance(languages, list) or not any(
                isinstance(item, dict)
                and item.get("language") == "typescript"
                and item.get("workspace") == expected.typescript_directory
                for item in languages
            ):
                messages.append(
                    f"{expected.family_directory} .sdkwork-assembly.json must list "
                    f"{expected.typescript_directory} as the materialized TypeScript workspace"
                )
            if isinstance(languages, list):
                languages_by_name = {
                    item.get("language"): item
                    for item in languages
                    if isinstance(item, dict) and isinstance(item.get("language"), str)
                }
                for language in self.OFFICIAL_SDK_LANGUAGES:
                    language_entry = languages_by_name.get(language)
                    if not isinstance(language_entry, dict):
                        messages.append(
                            f"{expected.family_directory} .sdkwork-assembly.json must list official SDK language {language}"
                        )
                        continue
                    if language == "typescript":
                        continue
                    expected_workspace = f"{expected.family_directory}-{language}"
                    expected_generated_path = f"{expected_workspace}/generated/server-openapi"
                    if language_entry.get("workspace") != expected_workspace:
                        messages.append(
                            f"{expected.family_directory} .sdkwork-assembly.json language {language} "
                            f"workspace must be {expected_workspace}"
                        )
                    if language_entry.get("generatedPath") != expected_generated_path:
                        messages.append(
                            f"{expected.family_directory} .sdkwork-assembly.json language {language} "
                            f"generatedPath must be {expected_generated_path}"
                        )
                    if language_entry.get("generationState") == "materialized":
                        manifest_path = language_entry.get("manifestPath")
                        if not isinstance(manifest_path, str) or not manifest_path:
                            messages.append(
                                f"{expected.family_directory} .sdkwork-assembly.json materialized language {language} "
                                "must declare manifestPath"
                            )
                        else:
                            self._require_file(family / manifest_path, messages)
        return messages

    def _read_json(self, path: Path, messages: list[str]) -> dict[str, Any] | None:
        if not path.exists():
            messages.append(f"required SDK file is missing: {path}")
            return None
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            messages.append(f"required SDK file is invalid JSON: {path}: {exc}")
            return None
        if not isinstance(payload, dict):
            messages.append(f"required SDK JSON file must contain an object: {path}")
            return None
        return payload

    def _read_text(self, path: Path, messages: list[str]) -> str | None:
        if not path.exists():
            messages.append(f"required SDK file is missing: {path}")
            return None
        try:
            return path.read_text(encoding="utf-8")
        except OSError as exc:
            messages.append(f"required SDK file cannot be read: {path}: {exc}")
            return None

    def _require_file(self, path: Path, messages: list[str]) -> None:
        if not path.exists() or not path.is_file():
            messages.append(f"required SDK file is missing: {path}")

    def _javascript_function_body(self, source: str, function_name: str) -> str | None:
        marker = f"function {function_name}("
        start = source.find(marker)
        if start < 0:
            return None

        open_brace = source.find("{", start)
        if open_brace < 0:
            return None

        depth = 0
        for index in range(open_brace, len(source)):
            character = source[index]
            if character == "{":
                depth += 1
            elif character == "}":
                depth -= 1
                if depth == 0:
                    return source[open_brace + 1 : index]
        return None

    def _javascript_const_string_value(self, source: str, const_name: str) -> str | None:
        match = re.search(
            rf"\bconst\s+{re.escape(const_name)}\s*=\s*(?P<quote>[`'\"])(?P<value>.*?)(?P=quote)\s*;",
            source,
            flags=re.DOTALL,
        )
        if match is None:
            return None
        return match.group("value")

    def _check_package_entry_files(
        self,
        sdk_dir: str,
        base: Path,
        package: dict[str, Any],
        messages: list[str],
    ) -> None:
        for field, expected_value in self.STANDARD_PACKAGE_ENTRY_FILES.items():
            value = package.get(field)
            if not isinstance(value, str) or not value.strip():
                messages.append(f"{sdk_dir} package.json must declare {field}")
                continue
            self._check_package_entry_path(
                sdk_dir,
                f"package.json {field}",
                value,
                expected_value,
                messages,
            )

        exports = package.get("exports")
        if not isinstance(exports, dict):
            messages.append(f"{sdk_dir} package.json must declare exports")
            return

        root_export = exports.get(".")
        if not isinstance(root_export, dict):
            messages.append(f"{sdk_dir} package.json exports must declare .")
            return

        for condition, expected_value in self.STANDARD_PACKAGE_EXPORT_ENTRY_FILES.items():
            value = root_export.get(condition)
            if not isinstance(value, str) or not value.strip():
                messages.append(f"{sdk_dir} package.json exports[.] must declare {condition}")
                continue
            self._check_package_entry_path(
                sdk_dir,
                f"package.json exports[.].{condition}",
                value,
                expected_value,
                messages,
            )

    def _check_package_entry_path(
        self,
        sdk_dir: str,
        label: str,
        raw_value: str,
        expected_value: str,
        messages: list[str],
    ) -> None:
        display = self._display_package_path(raw_value)
        relative_value = raw_value.removeprefix("./")
        relative_path = Path(relative_value)
        if relative_path.is_absolute() or ".." in relative_path.parts:
            messages.append(f"{sdk_dir} {label} must stay inside SDK package: {display}")
            return
        if display != self._display_package_path(expected_value):
            messages.append(
                f"{sdk_dir} {label} must be {self._display_package_path(expected_value)}"
            )

    def _display_package_path(self, raw_value: str) -> str:
        return raw_value.removeprefix("./").replace("\\", "/")

    def _check_package_build_standard(
        self,
        sdk_dir: str,
        base: Path,
        package: dict[str, Any],
        messages: list[str],
    ) -> None:
        scripts = package.get("scripts")
        if not isinstance(scripts, dict):
            scripts = {}
        if scripts.get("build") != "node custom/build-runtime.mjs":
            messages.append(f"{sdk_dir} package.json scripts.build must be node custom/build-runtime.mjs")
        if scripts.get("dev") != "node custom/build-runtime.mjs":
            messages.append(f"{sdk_dir} package.json scripts.dev must be node custom/build-runtime.mjs")
        if scripts.get("prepublishOnly") != "npm run build":
            messages.append(f"{sdk_dir} package.json scripts.prepublishOnly must be npm run build")

        build_script = base / "custom" / "build-runtime.mjs"
        if not build_script.exists() or not build_script.is_file():
            messages.append(f"{sdk_dir} custom/build-runtime.mjs is required for SDK runtime builds")

        dev_dependencies = package.get("devDependencies")
        if not isinstance(dev_dependencies, dict):
            dev_dependencies = {}
        for forbidden in ("vite", "vite-plugin-dts"):
            if forbidden in dev_dependencies:
                messages.append(f"{sdk_dir} package.json devDependencies must not include {forbidden}")
        for required in ("typescript", "rollup"):
            if required not in dev_dependencies:
                messages.append(f"{sdk_dir} package.json devDependencies must include {required}")

    def _check_public_app_model_catalog_types(self, sdk_dir: str, base: Path, messages: list[str]) -> None:
        types_dir = base / "src" / "types"
        item_source = self._read_text(types_dir / "app-model-catalog-item.ts", messages)
        availability_source = self._read_text(types_dir / "app-model-catalog-price-availability.ts", messages)

        if item_source is not None:
            for field in self.APP_MODEL_CATALOG_PRIVATE_ITEM_FIELDS:
                if self._has_typescript_property(item_source, field):
                    messages.append(
                        f"{sdk_dir} AppModelCatalogItem must not expose public private pricing field {field}"
                    )

        if availability_source is None:
            return

        status_values = self._typescript_property_union_literals(availability_source, "status")
        expected_values = list(self.APP_MODEL_CATALOG_PUBLIC_AVAILABILITY_STATUS)
        if status_values != expected_values:
            messages.append(
                f"{sdk_dir} AppModelCatalogPriceAvailability.status must be "
                f"'reference' | 'unavailable'"
            )
        if "available" in status_values:
            messages.append(f"{sdk_dir} AppModelCatalogPriceAvailability.status must not expose public available")

        for field in self.APP_MODEL_CATALOG_PRIVATE_AVAILABILITY_FIELDS:
            if self._has_typescript_property(availability_source, field):
                messages.append(
                    f"{sdk_dir} AppModelCatalogPriceAvailability must not expose public private "
                    f"pricing field {field}"
                )

    def _check_backend_ecosystem_skill_resource_tree(self, sdk_dir: str, base: Path, messages: list[str]) -> None:
        ecosystem_path = base / "src" / "api" / "ecosystem.ts"
        if not ecosystem_path.is_file():
            return

        source = ecosystem_path.read_text(encoding="utf-8")
        sdk_source = self._read_text(base / "src" / "sdk.ts", [])
        if sdk_source is not None:
            for snippet in (
                "public readonly ecosystem: EcosystemApi;",
                "this.ecosystem = createEcosystemApi(this.httpClient);",
            ):
                if snippet not in sdk_source:
                    messages.append(f"{sdk_dir} src/sdk.ts must expose generated ecosystem SDK domain")

        expected_resource_tree = {
            "EcosystemApi": ("public readonly skills: EcosystemSkillsApi;",),
            "EcosystemSkillsApi": (
                "public readonly categories: EcosystemSkillsCategoriesApi;",
                "public readonly package: EcosystemSkillsPackageApi;",
                "public readonly artifacts: EcosystemSkillsArtifactsApi;",
                "public readonly assets: EcosystemSkillsAssetsApi;",
                "public readonly review: EcosystemSkillsReviewApi;",
            ),
        }
        for class_name, snippets in expected_resource_tree.items():
            if f"export class {class_name}" not in source:
                messages.append(f"{sdk_dir} src/api/ecosystem.ts must expose resource class {class_name}")
            for snippet in snippets:
                if snippet not in source:
                    messages.append(f"{sdk_dir} src/api/ecosystem.ts must expose resource member {snippet}")

        expected_methods = {
            "EcosystemSkillsApi": (
                "create",
                "list",
                "delete",
                "retrieve",
                "update",
                "disable",
                "enable",
                "publish",
                "unpublish",
            ),
            "EcosystemSkillsPackageApi": (
                "create",
                "list",
                "delete",
                "retrieve",
                "update",
                "disable",
                "enable",
            ),
            "EcosystemSkillsReviewApi": ("approve", "reject"),
            "EcosystemSkillsCategoriesApi": ("list", "create"),
            "EcosystemSkillsAssetsApi": ("list", "create", "delete", "retrieve", "update"),
            "EcosystemSkillsArtifactsApi": ("list", "create", "delete", "retrieve", "update"),
        }
        for class_name, method_names in expected_methods.items():
            if f"export class {class_name}" not in source:
                messages.append(f"{sdk_dir} src/api/ecosystem.ts must expose resource class {class_name}")
                continue
            for method_name in method_names:
                if not self._class_has_async_method(source, class_name, method_name):
                    messages.append(f"{sdk_dir} src/api/ecosystem.ts {class_name} must expose async {method_name}(")

        forbidden_flat_methods = (
            "enableSkill",
            "disableSkill",
            "publishSkill",
            "offlineSkill",
            "approveSkill",
            "rejectSkill",
            "enableSkillPackage",
            "disableSkillPackage",
            "fetchSkills",
            "fetchSkillPackages",
        )
        for flat_method in forbidden_flat_methods:
            if re.search(rf"\basync\s+{re.escape(flat_method)}\s*\(", source) is not None:
                messages.append(
                    f"{sdk_dir} src/api/ecosystem.ts must use standard resource-tree methods, "
                    f"not async {flat_method}("
                )

    def _class_has_async_method(self, source: str, class_name: str, method_name: str) -> bool:
        class_match = re.search(rf"\bexport\s+class\s+{re.escape(class_name)}\s*\{{", source)
        if class_match is None:
            return False
        class_start = class_match.end()
        next_class = source.find("\nexport class ", class_start)
        class_source = source[class_start:] if next_class < 0 else source[class_start:next_class]
        return re.search(rf"\basync\s+{re.escape(method_name)}\s*\(", class_source) is not None

    def _check_unexported_api_artifacts(self, sdk_dir: str, base: Path, messages: list[str]) -> None:
        index_path = base / "src" / "api" / "index.ts"
        index_source = self._read_text(index_path, messages)
        if index_source is None:
            return
        exported_stems = set(re.findall(r"from\s+['\"]\./([^'\"]+)['\"]", index_source))
        allowed_stems = {"base", "index", "paths", *exported_stems}
        api_dir = base / "src" / "api"
        if not api_dir.is_dir():
            return
        for source_path in sorted(api_dir.glob("*.ts")):
            if source_path.stem not in allowed_stems:
                relative = source_path.relative_to(base).as_posix()
                messages.append(f"{sdk_dir} must not contain unexported generated API artifact: {relative}")

    def _check_type_index_exports(self, sdk_dir: str, base: Path, messages: list[str]) -> None:
        types_dir = base / "src" / "types"
        index_path = types_dir / "index.ts"
        index_source = self._read_text(index_path, messages)
        if index_source is None:
            return
        exported_stems = set(re.findall(r"from\s+['\"]\./([^'\"]+)['\"]", index_source))
        for source_path in sorted(types_dir.glob("*.ts")):
            if source_path.name == "index.ts":
                continue
            if source_path.name == "no-data.ts":
                continue
            source = self._read_text(source_path, messages)
            if source is None:
                continue
            match = re.search(
                r"^\s*export\s+(?:interface|type|class|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)",
                source,
                flags=re.MULTILINE,
            )
            if match is None:
                continue
            if source_path.stem not in exported_stems:
                messages.append(
                    f"{sdk_dir} src/types/index.ts must export {match.group(1)} from ./{source_path.stem}"
                )
        if "from './no-data'" in index_source or 'from "./no-data"' in index_source:
            messages.append(f"{sdk_dir} src/types/index.ts must not export NoData from ./no-data")

    def _check_strict_public_types(self, sdk_dir: str, base: Path, messages: list[str]) -> None:
        types_dir = base / "src" / "types"
        if not types_dir.is_dir():
            messages.append(f"{sdk_dir} src/types directory is missing")
            return

        common_source = self._read_text(types_dir / "common.ts", messages)
        if common_source is not None:
            self._check_common_type_exports(sdk_dir, common_source, messages)

        for source_path in sorted(types_dir.glob("*.ts")):
            if source_path.name in {"index.ts", "common.ts"}:
                continue
            source = self._read_text(source_path, messages)
            if source is None:
                continue
            if source_path.name == "no-data.ts":
                messages.append(f"{sdk_dir} src/types/no-data.ts is forbidden; no-data operations use PlusApiResult")
            if self.FORBIDDEN_NO_DATA_TYPE_PATTERN.search(source):
                messages.append(
                    f"{sdk_dir} {source_path.relative_to(base).as_posix()} must not declare NoData"
                )
            for type_name in self.OPEN_EMPTY_RECORD_PATTERN.findall(source):
                if self._allows_closed_empty_type(type_name):
                    continue
                messages.append(
                    f"{sdk_dir} {source_path.relative_to(base).as_posix()} must not expose "
                    f"{type_name} as Record<string, unknown>; use Record<string, never>"
                )
            for type_name in self.EMPTY_INTERFACE_PATTERN.findall(source):
                if self._allows_closed_empty_type(type_name):
                    continue
                messages.append(
                    f"{sdk_dir} {source_path.relative_to(base).as_posix()} must not expose "
                    f"{type_name} as an empty interface; use Record<string, never>"
                )

    def _check_common_type_exports(self, sdk_dir: str, source: str, messages: list[str]) -> None:
        for type_name in self.FORBIDDEN_COMMON_TYPE_EXPORTS:
            if re.search(rf"\b{re.escape(type_name)}\b", source):
                messages.append(f"{sdk_dir} src/types/common.ts must not re-export {type_name}")
        if re.search(r"^\s*(?:searchQuery|search_query|keyword|search)\??\s*:", source, flags=re.MULTILINE):
            messages.append(
                f"{sdk_dir} src/types/common.ts must expose common list search text as q, not searchQuery/search_query/keyword/search"
            )

    def _check_standard_query_parameters(self, sdk_dir: str, base: Path, messages: list[str]) -> None:
        api_dir = base / "src" / "api"
        if not api_dir.is_dir():
            return
        for source_path in sorted(api_dir.glob("*.ts")):
            if source_path.name in {"base.ts", "index.ts", "paths.ts"}:
                continue
            source = self._read_text(source_path, messages)
            if source is None:
                continue
            relative = source_path.relative_to(base).as_posix()
            if re.search(r"^\s*(?:searchQuery|search_query|keyword|search)\??\s*:", source, flags=re.MULTILINE):
                messages.append(
                    f"{sdk_dir} {relative} must expose SDK search text as q, not searchQuery/search_query/keyword/search"
                )
            if re.search(r"\{\s*name:\s*['\"](?:search_query|searchQuery|keyword|search)['\"]", source):
                messages.append(
                    f"{sdk_dir} {relative} must send URL search text as q, not search_query/searchQuery/keyword/search"
                )
            if "vendor_codes" in source:
                if re.search(r"^\s*vendorCodes\??\s*:\s*string\s*;", source, flags=re.MULTILINE):
                    messages.append(
                        f"{sdk_dir} {relative} must expose vendorCodes as string[] for multi-value query filters"
                    )
                if re.search(
                    r"\{[^}]*name:\s*['\"]vendor_codes['\"][^}]*style:\s*['\"]form['\"][^}]*explode:\s*true[^}]*\}",
                    source,
                    flags=re.DOTALL,
                ):
                    messages.append(
                        f"{sdk_dir} {relative} must serialize vendor_codes with style=form and explode=false"
                    )

    def _allows_closed_empty_type(self, type_name: str) -> bool:
        if type_name.startswith(self.FORBIDDEN_PUBLIC_EMPTY_RECORD_PREFIXES):
            return False
        if type_name.endswith(self.FORBIDDEN_PUBLIC_EMPTY_RECORD_SUFFIXES):
            return False
        return True

    def _has_typescript_property(self, source: str, property_name: str) -> bool:
        return re.search(rf"^\s*{re.escape(property_name)}\??\s*:", source, flags=re.MULTILINE) is not None

    def _typescript_property_union_literals(self, source: str, property_name: str) -> list[str]:
        match = re.search(rf"^\s*{re.escape(property_name)}\??\s*:\s*([^;\n]+)", source, flags=re.MULTILINE)
        if match is None:
            return []
        return re.findall(r"['\"]([^'\"]+)['\"]", match.group(1))

    def _check_portal_boundary(self) -> list[str]:
        messages: list[str] = []
        portal_root = self.root / "apps" / "sdkwork-clawrouter-pc"
        commons_root = portal_root / "packages" / "sdkwork-clawroutes-pc-commons"

        portal_package = self._read_json(portal_root / "package.json", messages)
        if portal_package is not None:
            self._check_dependency(
                portal_package,
                "@sdkwork/clawrouter-app-sdk",
                "workspace:*",
                "portal package.json",
                messages,
            )
            self._check_dependency(
                portal_package,
                "@sdkwork/clawrouter-backend-sdk",
                "workspace:*",
                "portal package.json",
                messages,
            )
            self._check_dependency(
                portal_package,
                "@sdkwork/clawrouter-open-sdk",
                "workspace:*",
                "portal package.json",
                messages,
            )

        commons_package = self._read_json(commons_root / "package.json", messages)
        if commons_package is not None:
            self._check_dependency(
                commons_package,
                "@sdkwork/clawrouter-app-sdk",
                "workspace:*",
                "portal commons package.json",
                messages,
            )
            self._check_dependency(
                commons_package,
                "@sdkwork/clawrouter-backend-sdk",
                "workspace:*",
                "portal commons package.json",
                messages,
            )
            self._check_dependency(
                commons_package,
                "@sdkwork/clawrouter-open-sdk",
                "workspace:*",
                "portal commons package.json",
                messages,
            )

        boundary_relative = "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts"
        boundary_path = self.root / boundary_relative
        boundary_source = self._read_text(boundary_path, [])
        if boundary_source is None:
            messages.append(f"portal SDK boundary is missing: {boundary_relative}")
        else:
            for token in (
                "@sdkwork/clawrouter-app-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "@sdkwork/clawrouter-open-sdk",
                "createClawRouterAppSdkClient",
                "createClawRouterBackendSdkClient",
                "createClawRouterAiSdkClient",
            ):
                if token not in boundary_source:
                    messages.append(f"portal SDK boundary must mention {token}")

        runtime_relative = "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/runtime.ts"
        runtime_source = self._read_text(self.root / runtime_relative, [])
        if runtime_source is None or "./sdk-clients.ts" not in runtime_source:
            messages.append(f"portal commons runtime must export ./sdk-clients.ts: {runtime_relative}")

        index_relative = "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/index.ts"
        index_source = self._read_text(self.root / index_relative, [])
        if index_source is not None and re.search(r"['\"]\./sdk-clients(?:\.(?:ts|js))?['\"]", index_source):
            messages.append(
                "portal commons UI root must not export ./sdk-clients; use sdkwork-clawroutes-pc-commons/runtime: "
                f"{index_relative}"
            )

        return messages

    def _check_dependency(
        self,
        package_json: dict[str, Any],
        package_name: str,
        expected_specifier: str,
        label: str,
        messages: list[str],
    ) -> None:
        dependencies = package_json.get("dependencies", {})
        dev_dependencies = package_json.get("devDependencies", {})
        if not isinstance(dependencies, dict):
            dependencies = {}
        if not isinstance(dev_dependencies, dict):
            dev_dependencies = {}
        actual = dependencies.get(package_name, dev_dependencies.get(package_name))
        if actual is None:
            messages.append(f"{label} must depend on {package_name}")
        elif actual != expected_specifier:
            messages.append(f"{label} {package_name} must use {expected_specifier}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Check sdkwork-clawrouter generated SDK packages.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    args = parser.parse_args()

    result = ClawRouterSdkGuardian(root=args.root).run()
    if result.ok:
        print("ClawRouter generated SDKs passed")
        return 0
    for message in result.messages:
        print(message)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
