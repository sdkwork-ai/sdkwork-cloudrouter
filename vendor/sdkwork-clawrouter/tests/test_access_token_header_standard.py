import unittest
import re
from os import walk
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = ROOT.parent
DOCUMENTS_API_REFERENCE_SRC = (
    WORKSPACE_ROOT
    / "sdkwork-documents"
    / "apps"
    / "sdkwork-documents-pc"
    / "packages"
    / "sdkwork-documents-pc-api-reference"
    / "src"
)


class AccessTokenHeaderStandardTest(unittest.TestCase):
    def test_repository_does_not_contain_branded_access_token_protocol_names(self) -> None:
        roots = [
            ROOT,
            ROOT.parents[1] / "specs",
            ROOT.parent / "sdkwork-sdk-generator" / "src",
            ROOT.parent / "sdkwork-sdk-generator" / "tmp-js",
        ]
        vendor = "Sdkwork"
        forbidden_patterns = [
            re.compile(f"{vendor}-Access-Token"),
            re.compile(f"{vendor.lower()}-access-token"),
            re.compile(f"{vendor}-{vendor}-Access-Token"),
            re.compile(f"{vendor}AccessToken"),
            re.compile(f"{vendor[0].lower()}{vendor[1:]}AccessToken"),
            re.compile(f"auth-{vendor}-Access-Token"),
            re.compile(f"{vendor.upper()}_ACCESS_TOKEN"),
            re.compile(f"{vendor.lower()}_access_token"),
            re.compile(f"{vendor.upper()}_PC_REACT_LEGACY_ACCESS_TOKEN_STORAGE_KEY"),
            re.compile(f"{vendor.lower()}\\.core\\.pc-react\\.access-token"),
        ]
        text_suffixes = {
            ".cs",
            ".dart",
            ".go",
            ".gradle",
            ".java",
            ".js",
            ".json",
            ".kt",
            ".kts",
            ".md",
            ".mjs",
            ".py",
            ".rs",
            ".swift",
            ".toml",
            ".ts",
            ".tsx",
            ".xml",
            ".yaml",
            ".yml",
        }
        ignored_parts = {
            ".git",
            ".pnpm-store",
            ".worktrees",
            "build",
            "dist",
            "manual-backups",
            "node_modules",
            "target",
            "tmp",
        }

        def is_ignored_path(path: Path) -> bool:
            return any(part in ignored_parts or part.startswith("target-") for part in path.parts)

        checked_paths: list[Path] = []
        for root in roots:
            if not root.exists():
                continue
            for current_root, dirnames, filenames in walk(root):
                dirnames[:] = sorted(
                    dirname
                    for dirname in dirnames
                    if dirname not in ignored_parts and not dirname.startswith("target-")
                )
                current_path = Path(current_root)
                if is_ignored_path(current_path):
                    continue
                for filename in sorted(filenames):
                    path = current_path / filename
                    if is_ignored_path(path):
                        continue
                    if path.name not in {"LICENSE", "Package.swift"} and path.suffix not in text_suffixes:
                        continue
                    source = path.read_text(encoding="utf-8")
                    checked_paths.append(path)
                    for pattern in forbidden_patterns:
                        self.assertIsNone(
                            pattern.search(source),
                            f"{path.relative_to(ROOT.parents[1]).as_posix()} must not contain {pattern.pattern}",
                        )

        self.assertGreater(len(checked_paths), 0)

    def test_runtime_contracts_and_generated_artifacts_use_access_token_header(self) -> None:
        required_access_token_paths = [
            ROOT.parents[1] / "specs" / "API_SPEC.md",
            ROOT.parents[1] / "specs" / "CONFIG_SPEC.md",
            ROOT.parents[1] / "specs" / "IAM_SPEC.md",
            ROOT / "specs" / "API_SPEC.md",
            ROOT / "tools" / "clawrouter_openapi_generator.py",
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml",
            ROOT / "generated" / "api" / "api-contract-manifest.json",
            ROOT / "generated" / "openapi" / "clawrouter-app-openapi.json",
            ROOT / "generated" / "openapi" / "clawrouter-backend-openapi.json",
            ROOT / "sdks" / "clawrouter-app-sdk" / "openapi" / "clawrouter-app-sdk.openapi.json",
            ROOT / "sdks" / "clawrouter-app-sdk" / "openapi" / "clawrouter-app-sdk.sdkgen.json",
            ROOT / "sdks" / "clawrouter-backend-sdk" / "openapi" / "clawrouter-backend-sdk.openapi.json",
            ROOT / "sdks" / "clawrouter-backend-sdk" / "openapi" / "clawrouter-backend-sdk.sdkgen.json",
            ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "http" / "client.ts",
            ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "dist" / "index.js",
            ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "dist" / "index.cjs",
            ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "dist" / "types" / "iam-session-response.d.ts",
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "http" / "client.ts",
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "dist" / "index.js",
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "dist" / "index.cjs",
            ROOT / "sdks" / "clawrouter-open-sdk" / "clawrouter-open-sdk-typescript" / "src" / "http" / "client.ts",
            ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "README.md",
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "README.md",
            ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "types" / "iam-session-response.ts",
            DOCUMENTS_API_REFERENCE_SRC / "playgroundRequest.ts",
        ]

        vendor = "Sdkwork"
        forbidden_header = f"{vendor}-Access-Token"
        forbidden_scheme = f"{vendor}AccessToken"

        for path in required_access_token_paths:
            with self.subTest(path=path.relative_to(ROOT.parents[1]).as_posix()):
                source = path.read_text(encoding="utf-8")
                self.assertIn("Access-Token", source)
                self.assertNotIn(forbidden_header, source)
                if path.name in {
                    "clawrouter_openapi_generator.py",
                    "clawrouter-app-openapi.json",
                    "clawrouter-backend-openapi.json",
                    "clawrouter-app-sdk.openapi.json",
                    "clawrouter-app-sdk.sdkgen.json",
                    "clawrouter-backend-sdk.openapi.json",
                    "clawrouter-backend-sdk.sdkgen.json",
                }:
                    self.assertIn('"AccessToken"', source)
                    self.assertNotIn(f'"{forbidden_scheme}"', source)
                    self.assertIn('"name": "Access-Token"', source)
                    self.assertNotIn(f'"name": "{forbidden_header}"', source)
                if path.name == "playgroundRequest.ts":
                    self.assertIn("ACCESS_TOKEN_HEADER = 'Access-Token'", source)
                    self.assertIn("ACCESS_TOKEN_HEADER.toLowerCase()", source)
                    self.assertNotIn(f"'{vendor.lower()}-access-token'", source)
                    self.assertIn("headers[ACCESS_TOKEN_HEADER] = input.accessToken.trim();", source)
                    self.assertNotIn(
                        f"headers['{forbidden_header}'] = input.accessToken.trim();",
                        source,
                    )

    def test_audit_rejects_branded_access_token_security_scheme_names(self) -> None:
        audit_source = (ROOT / "tools" / "clawrouter_openapi_contract_audit.py").read_text(
            encoding="utf-8"
        )

        vendor = "Sdkwork"
        self.assertIn('security_schemes.get("AccessToken")', audit_source)
        self.assertIn('access_token.get("name") != "Access-Token"', audit_source)
        self.assertNotIn(f"{vendor}AccessToken", audit_source)
        self.assertNotIn(f"{vendor}-Access-Token", audit_source)

    def test_generated_transport_sdks_do_not_emit_branded_access_token_protocol_names(self) -> None:
        sdk_families = [
            "clawrouter-app-sdk",
            "clawrouter-backend-sdk",
            "clawrouter-open-sdk",
        ]
        text_suffixes = {
            ".cs",
            ".dart",
            ".go",
            ".gradle",
            ".java",
            ".json",
            ".kt",
            ".kts",
            ".md",
            ".py",
            ".rs",
            ".swift",
            ".toml",
            ".ts",
            ".xml",
            ".yaml",
            ".yml",
        }

        vendor = "Sdkwork"
        forbidden_patterns = [
            f"{vendor}-Access-Token",
            f"{vendor.lower()}-access-token",
            f"{vendor}AccessToken",
            f"auth-{vendor}-Access-Token",
            f"{vendor.upper()}_ACCESS_TOKEN",
            f"{vendor.lower()}_access_token",
            f"{vendor.upper()}_PC_REACT_LEGACY_ACCESS_TOKEN_STORAGE_KEY",
            f"{vendor.lower()}.core.pc-react.access-token",
        ]

        checked_paths: list[Path] = []
        for sdk_family in sdk_families:
            sdk_root = ROOT / "sdks" / sdk_family
            generated_roots = sorted(sdk_root.glob(f"{sdk_family}-*/generated/server-openapi"))
            self.assertGreater(
                len(generated_roots),
                0,
                f"{sdk_family} must include generated transport SDK artifacts",
            )
            for generated_root in generated_roots:
                for current_root, dirnames, filenames in walk(generated_root):
                    dirnames[:] = sorted(
                        dirname
                        for dirname in dirnames
                        if dirname not in {".sdkwork", "node_modules", "target", "dist", "build"}
                    )
                    current_path = Path(current_root)
                    for filename in sorted(filenames):
                        path = current_path / filename
                        if any(part in {".sdkwork", "node_modules", "target", "dist", "build"} for part in path.parts):
                            continue
                        if path.name not in {"LICENSE", "Package.swift"} and path.suffix not in text_suffixes:
                            continue
                        source = path.read_text(encoding="utf-8")
                        checked_paths.append(path)
                        for pattern in forbidden_patterns:
                            self.assertNotIn(
                                pattern,
                                source,
                                f"{path.relative_to(ROOT.parents[1]).as_posix()} must not contain {pattern}",
                            )

        self.assertGreater(len(checked_paths), 0)

    def test_generated_sdk_barrels_export_api_parameter_contracts(self) -> None:
        backend_api_barrel = (
            ROOT
            / "sdks"
            / "clawrouter-backend-sdk"
            / "clawrouter-backend-sdk-typescript"
            / "dist"
            / "api"
            / "index.d.ts"
        ).read_text(encoding="utf-8")
        app_api_barrel = (
            ROOT
            / "sdks"
            / "clawrouter-app-sdk"
            / "clawrouter-app-sdk-typescript"
            / "dist"
            / "api"
            / "index.d.ts"
        ).read_text(encoding="utf-8")

        self.assertIn("export * from './integration'", backend_api_barrel)
        self.assertIn("export * from './platform'", backend_api_barrel)
        self.assertIn("export * from './commerce'", app_api_barrel)

        app_commerce_api = (
            ROOT
            / "sdks"
            / "clawrouter-app-sdk"
            / "clawrouter-app-sdk-typescript"
            / "dist"
            / "api"
            / "commerce.d.ts"
        ).read_text(encoding="utf-8")
        self.assertIn("export interface CommerceBillingHistoryListParams", app_commerce_api)


if __name__ == "__main__":
    unittest.main()
