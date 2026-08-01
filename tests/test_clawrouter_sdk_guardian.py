import json
import tempfile
import unittest
from pathlib import Path

from tools.clawrouter_sdk_guardian import ClawRouterSdkGuardian
from tools.clawrouter_sdk_runtime_standardizer import (
    COMPOSED_INDEX,
    sdk_derived_specs,
    sdk_generation_input_path_symbol,
    sdk_generation_input_spec,
)


class ClawRouterSdkGuardianTest(unittest.TestCase):
    def write_sdk(
        self,
        root: Path,
        sdk_dir: str,
        package_name: str,
        sdk_type: str,
        client_name: str,
        api_prefix: str,
        *,
        write_dist: bool = True,
    ) -> None:
        package_dir = f"{sdk_dir}-typescript"
        family = root / "sdks" / sdk_dir
        base = family / package_dir
        transport = base / "generated" / "server-openapi"
        (family / "openapi").mkdir(parents=True, exist_ok=True)
        (family / "bin").mkdir(parents=True, exist_ok=True)
        (family / "tests").mkdir(parents=True, exist_ok=True)
        (family / "README.md").write_text(f"# {sdk_dir}\n", encoding="utf-8")
        (family / "sdk-manifest.json").write_text(
            json.dumps(
                {
                    "workspace": sdk_dir,
                    "authoritySpec": f"openapi/{sdk_dir}.openapi.json",
                    "generationInputSpec": sdk_generation_input_spec(sdk_dir),
                    "derivedSpecs": sdk_derived_specs(sdk_dir),
                    "languages": [
                        {
                            "language": "typescript",
                            "workspace": package_dir,
                            "generationState": "materialized",
                            "packagePath": package_dir,
                            "manifestPath": f"{package_dir}/package.json",
                            "name": package_name,
                        }
                    ]
                    + [
                        {
                            "language": language,
                            "workspace": f"{sdk_dir}-{language}",
                            "generationState": "generation_available",
                            "releaseState": "reserved",
                            "generatedPath": f"{sdk_dir}-{language}/generated/server-openapi",
                        }
                        for language in [
                            "flutter",
                            "rust",
                            "java",
                            "csharp",
                            "swift",
                            "kotlin",
                            "go",
                            "python",
                        ]
                    ],
                }
            )
            + "\n",
            encoding="utf-8",
        )
        (family / "openapi" / f"{sdk_dir}.openapi.json").write_text(
            '{"openapi":"3.0.3","info":{"title":"fixture","version":"0.1.0"},"paths":{}}\n',
            encoding="utf-8",
        )
        (family / "openapi" / f"{sdk_dir}.sdkgen.json").write_text(
            '{"openapi":"3.0.3","info":{"title":"fixture","version":"0.1.0"},"paths":{}}\n',
            encoding="utf-8",
        )
        strict_input_path = sdk_generation_input_path_symbol(sdk_dir)
        sdkgen_input_path_line = (
            "const sdkgenInputPath = `sdks/${sdkFamily}/openapi/${sdkFamily}.sdkgen.json`;\n"
            if sdk_dir == "clawrouter-open-sdk"
            else ""
        )
        (family / "bin" / "generate-sdk.mjs").write_text(
            "const OFFICIAL_LANGUAGES = ['typescript', 'flutter', 'rust', 'java', 'csharp', 'swift', 'kotlin', 'go', 'python'];\n"
            f"const sdkFamily = '{sdk_dir}';\n"
            "const authorityInputPath = `sdks/${sdkFamily}/openapi/${sdkFamily}.openapi.json`;\n"
            f"{sdkgen_input_path_line}"
            "function strictTypeScriptArgs() {\n"
            f"  return ['-i', {strict_input_path}];\n"
            "}\n"
            "function generatorArgs() {\n"
            f"  return ['-i', {strict_input_path}];\n"
            "}\n"
            "function runLanguage(language) { cleanGeneratedOutput(language); }\n"
            "function cleanGeneratedOutput(language) {}\n"
            "console.log('--language');\n"
            "console.log('sdks/${sdkFamily}/${sdkFamily}-${language}/generated/server-openapi');\n",
            encoding="utf-8",
        )
        (family / "bin" / "verify-sdk.mjs").write_text("console.log('verify');\n", encoding="utf-8")
        (base / "src").mkdir(parents=True, exist_ok=True)
        (base / "custom").mkdir(parents=True, exist_ok=True)
        (transport / "src" / "api").mkdir(parents=True, exist_ok=True)
        (transport / "src" / "types").mkdir(parents=True, exist_ok=True)
        (transport / ".sdkwork").mkdir(parents=True, exist_ok=True)
        (base / "package.json").write_text(
            json.dumps(
                {
                    "name": package_name,
                    "version": "0.1.0",
                    "sdkworkRole": "composed-facade",
                    "main": "./dist/index.cjs",
                    "module": "./dist/index.js",
                    "types": "./dist/index.d.ts",
                    "exports": {
                        ".": {
                            "types": "./dist/index.d.ts",
                            "import": "./dist/index.js",
                            "require": "./dist/index.cjs",
                        }
                    },
                    "scripts": {
                        "build": "node custom/build-runtime.mjs",
                        "dev": "node custom/build-runtime.mjs",
                        "prepublishOnly": "npm run build",
                    },
                    "devDependencies": {
                        "@types/node": "^20.0.0",
                        "rollup": "^4.0.0",
                        "typescript": "^5.3.0",
                    },
                }
            )
            + "\n",
            encoding="utf-8",
        )
        (base / "sdkwork-sdk.json").write_text(
            json.dumps({"language": "typescript", "sdkType": sdk_type, "name": sdk_dir}) + "\n",
            encoding="utf-8",
        )
        (base / "README.md").write_text(f"# {package_name}\n", encoding="utf-8")
        (base / "custom" / "README.md").write_text("custom code lives here\n", encoding="utf-8")
        (base / "custom" / "build-runtime.mjs").write_text("console.log('build');\n", encoding="utf-8")
        (base / "src" / "index.ts").write_text(COMPOSED_INDEX, encoding="utf-8")
        (transport / "package.json").write_text(
            json.dumps({"name": f"{sdk_dir}-generated-typescript", "sdkworkRole": "transport"}) + "\n",
            encoding="utf-8",
        )
        (transport / ".sdkwork" / "sdkwork-generator-manifest.json").write_text("{}\n", encoding="utf-8")
        sdk_source = f"export class {client_name} {{}}\n"
        if sdk_dir == "clawrouter-backend-sdk":
            sdk_source = (
                "import { EcosystemApi, createEcosystemApi } from './api/ecosystem';\n"
                f"export class {client_name} {{\n"
                "  private httpClient: unknown;\n"
                "  public readonly ecosystem: EcosystemApi;\n"
                "  constructor() { this.ecosystem = createEcosystemApi(this.httpClient); }\n"
                "}\n"
            )
        (transport / "src" / "sdk.ts").write_text(sdk_source, encoding="utf-8")
        if sdk_dir == "clawrouter-backend-sdk":
            (transport / "src" / "api" / "index.ts").write_text(
                "export { EcosystemApi } from './ecosystem';\n",
                encoding="utf-8",
            )
            (transport / "src" / "api" / "ecosystem.ts").write_text(
                "export class EcosystemSkillsReviewApi { async approve() {} async reject() {} }\n"
                "export class EcosystemSkillsPackageApi { async create() {} async list() {} async delete() {} async retrieve() {} async update() {} async disable() {} async enable() {} }\n"
                "export class EcosystemSkillsCategoriesApi { async list() {} async create() {} }\n"
                "export class EcosystemSkillsAssetsApi { async list() {} async create() {} async delete() {} async retrieve() {} async update() {} }\n"
                "export class EcosystemSkillsArtifactsApi { async list() {} async create() {} async delete() {} async retrieve() {} async update() {} }\n"
                "export class EcosystemSkillsApi {\n"
                "  public readonly categories: EcosystemSkillsCategoriesApi;\n"
                "  public readonly package: EcosystemSkillsPackageApi;\n"
                "  public readonly artifacts: EcosystemSkillsArtifactsApi;\n"
                "  public readonly assets: EcosystemSkillsAssetsApi;\n"
                "  public readonly review: EcosystemSkillsReviewApi;\n"
                "  async create() {} async list() {} async delete() {} async retrieve() {} async update() {} async disable() {} async enable() {} async publish() {} async unpublish() {}\n"
                "}\n"
                "export class EcosystemApi { public readonly skills: EcosystemSkillsApi; }\n"
                "export function createEcosystemApi(client: unknown): EcosystemApi { return new EcosystemApi(); }\n",
                encoding="utf-8",
            )
        else:
            (transport / "src" / "api" / "index.ts").write_text("export {};\n", encoding="utf-8")
        (transport / "src" / "api" / "paths.ts").write_text(api_prefix + "\n", encoding="utf-8")
        type_exports: list[str] = []
        (transport / "src" / "types" / "common.ts").write_text(
            "export type { Page, RequestConfig, RequestOptions, QueryParams } from '@sdkwork/sdk-common';\n",
            encoding="utf-8",
        )
        if sdk_dir == "clawrouter-app-sdk":
            (transport / "src" / "types" / "app-model-catalog-price-availability.ts").write_text(
                "export interface AppModelCatalogPriceAvailability {\n"
                "  reason?: string | null;\n"
                "  status: 'reference' | 'unavailable';\n"
                "}\n",
                encoding="utf-8",
            )
            (transport / "src" / "types" / "app-model-catalog-item.ts").write_text(
                "import type { AppModelCatalogPriceAvailability } from './app-model-catalog-price-availability';\n\n"
                "export interface AppModelCatalogItem {\n"
                "  capabilities: string[];\n"
                "  displayName: string;\n"
                "  model: string;\n"
                "  officialReferenceUnitPrice?: string | null;\n"
                "  priceAvailability: AppModelCatalogPriceAvailability;\n"
                "  providerCodes: string[];\n"
                "  vendor: string;\n"
                "  vendorCode: string;\n"
                "}\n",
                encoding="utf-8",
            )
            type_exports.extend(
                [
                    "export type { AppModelCatalogItem } from './app-model-catalog-item';",
                    "export type { AppModelCatalogPriceAvailability } from './app-model-catalog-price-availability';",
                ]
            )
        (transport / "src" / "types" / "index.ts").write_text(
            "\n".join(type_exports) + "\n" if type_exports else "export {};\n",
            encoding="utf-8",
        )
        if write_dist:
            (base / "dist").mkdir(parents=True, exist_ok=True)
            (base / "dist" / "index.js").write_text("export {};\n", encoding="utf-8")
            (base / "dist" / "index.cjs").write_text('"use strict";\n', encoding="utf-8")
            (base / "dist" / "index.d.ts").write_text("export {};\n", encoding="utf-8")

    def write_portal_sdk_boundary(self, root: Path) -> None:
        open_sdk = root / "sdks" / "clawrouter-open-sdk" / "clawrouter-open-sdk-typescript"
        if not open_sdk.exists():
            self.write_sdk(
                root,
                "clawrouter-open-sdk",
                "@sdkwork/clawrouter-open-sdk",
                "ai",
                "SdkworkAiClient",
                "/v1",
            )
        portal = root / "apps" / "sdkwork-clawrouter-pc"
        commons = portal / "packages" / "sdkwork-clawroutes-pc-commons"
        (commons / "src").mkdir(parents=True, exist_ok=True)
        (portal / "package.json").write_text(
            json.dumps(
                {
                    "dependencies": {
                        "@sdkwork/clawrouter-app-sdk": "workspace:*",
                        "@sdkwork/clawrouter-backend-sdk": "workspace:*",
                        "@sdkwork/clawrouter-open-sdk": "workspace:*",
                    }
                }
            )
            + "\n",
            encoding="utf-8",
        )
        (commons / "package.json").write_text(
            json.dumps(
                {
                    "dependencies": {
                        "@sdkwork/clawrouter-app-sdk": "workspace:*",
                        "@sdkwork/clawrouter-backend-sdk": "workspace:*",
                        "@sdkwork/clawrouter-open-sdk": "workspace:*",
                    }
                }
            )
            + "\n",
            encoding="utf-8",
        )
        (commons / "src" / "index.ts").write_text("export * from './components/CopyButton';\n", encoding="utf-8")
        (commons / "src" / "runtime.ts").write_text("export * from './sdk-clients.ts';\n", encoding="utf-8")
        (commons / "src" / "sdk-clients.ts").write_text(
            "import { SdkworkAppClient } from '@sdkwork/clawrouter-app-sdk';\n"
            "import { SdkworkBackendClient } from '@sdkwork/clawrouter-backend-sdk';\n"
            "import { SdkworkAiClient } from '@sdkwork/clawrouter-open-sdk';\n"
            "export function createClawRouterAppSdkClient() { return new SdkworkAppClient({ baseUrl: '' }); }\n"
            "export function createClawRouterBackendSdkClient() { return new SdkworkBackendClient({ baseUrl: '' }); }\n"
            "export function createClawRouterAiSdkClient() { return new SdkworkAiClient({ baseUrl: '' }); }\n",
            encoding="utf-8",
        )

    def test_accepts_project_generated_three_sdk_systems(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(
                root,
                "clawrouter-app-sdk",
                "@sdkwork/clawrouter-app-sdk",
                "app",
                "SdkworkAppClient",
                "/app/v3/api",
            )
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            self.write_portal_sdk_boundary(root)

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_accepts_sdk_paths_that_do_not_match_sdk_system_prefixes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(
                root,
                "clawrouter-app-sdk",
                "@sdkwork/clawrouter-app-sdk",
                "app",
                "SdkworkAppClient",
                "/tenant-a/product-api",
            )
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/tenant-a/manage-api",
            )
            self.write_portal_sdk_boundary(root)

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_reports_missing_required_sdk_system_and_wrong_package_name(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(root, "clawrouter-app-sdk", "@sdkwork/wrong", "app", "SdkworkAppClient", "/app/v3/api")
            self.write_portal_sdk_boundary(root)

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "clawrouter-app-sdk-typescript package.json name must be @sdkwork/clawrouter-app-sdk",
                result.messages,
            )
            self.assertIn(f"generated SDK family is missing: {root / 'sdks' / 'clawrouter-backend-sdk'}", result.messages)

    def test_reports_missing_required_open_sdk_system(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(root, "clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk", "app", "SdkworkAppClient", "/app/v3/api")
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(f"generated SDK family is missing: {root / 'sdks' / 'clawrouter-open-sdk'}", result.messages)

    def test_reports_unexpected_fourth_sdk_system(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(root, "clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk", "app", "SdkworkAppClient", "/app/v3/api")
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            self.write_portal_sdk_boundary(root)
            (root / "sdks" / "clawrouter-admin-sdk").mkdir(parents=True)

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                f"unexpected generated SDK family is present: {root / 'sdks' / 'clawrouter-admin-sdk'}",
                result.messages,
            )

    def test_accepts_sdk_workspace_support_directories(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(root, "clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk", "app", "SdkworkAppClient", "/app/v3/api")
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            self.write_portal_sdk_boundary(root)
            (root / "sdks" / "test").mkdir(parents=True)
            (root / "sdks" / "_shared").mkdir(parents=True)
            (root / "sdks" / "_route-manifests" / "app-api").mkdir(parents=True)

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_reports_sdk_family_without_official_multilanguage_generation_matrix(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(
                root,
                "clawrouter-app-sdk",
                "@sdkwork/clawrouter-app-sdk",
                "app",
                "SdkworkAppClient",
                "/app/v3/api",
            )
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            self.write_portal_sdk_boundary(root)
            family = root / "sdks" / "clawrouter-app-sdk"
            assembly_path = family / "sdk-manifest.json"
            assembly = json.loads(assembly_path.read_text(encoding="utf-8"))
            assembly["languages"] = [
                item
                for item in assembly["languages"]
                if item.get("language") == "typescript"
            ]
            assembly_path.write_text(json.dumps(assembly) + "\n", encoding="utf-8")
            (family / "bin" / "generate-sdk.mjs").write_text(
                "console.log('typescript only');\n",
                encoding="utf-8",
            )

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "clawrouter-app-sdk sdk-manifest.json must list official SDK language flutter",
                result.messages,
            )
            self.assertIn(
                "clawrouter-app-sdk sdk-manifest.json must list official SDK language python",
                result.messages,
            )
            self.assertIn(
                "clawrouter-app-sdk bin/generate-sdk.mjs must support --language language selection",
                result.messages,
            )

    def test_reports_sdk_family_legacy_single_derived_spec_field(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(
                root,
                "clawrouter-app-sdk",
                "@sdkwork/clawrouter-app-sdk",
                "app",
                "SdkworkAppClient",
                "/app/v3/api",
            )
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            self.write_portal_sdk_boundary(root)
            assembly_path = root / "sdks" / "clawrouter-app-sdk" / "sdk-manifest.json"
            assembly = json.loads(assembly_path.read_text(encoding="utf-8"))
            assembly["derivedSpec"] = "openapi/clawrouter-app-sdk.sdkgen.json"
            assembly_path.write_text(json.dumps(assembly) + "\n", encoding="utf-8")

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "clawrouter-app-sdk sdk-manifest.json must not declare legacy derivedSpec; use derivedSpecs",
                result.messages,
            )

    def test_reports_sdk_family_generator_without_generated_transport_cleanup(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(
                root,
                "clawrouter-app-sdk",
                "@sdkwork/clawrouter-app-sdk",
                "app",
                "SdkworkAppClient",
                "/app/v3/api",
            )
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            self.write_portal_sdk_boundary(root)
            script_path = root / "sdks" / "clawrouter-app-sdk" / "bin" / "generate-sdk.mjs"
            script_path.write_text(
                script_path.read_text(encoding="utf-8")
                .replace("function runLanguage(language) { cleanGeneratedOutput(language); }\n", "")
                .replace("function cleanGeneratedOutput(language) {}\n", ""),
                encoding="utf-8",
            )

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "clawrouter-app-sdk bin/generate-sdk.mjs must clean non-TypeScript generated transport output after generation",
                result.messages,
            )

    def test_reports_sdk_family_generator_that_bypasses_authority_openapi_contract(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(
                root,
                "clawrouter-app-sdk",
                "@sdkwork/clawrouter-app-sdk",
                "app",
                "SdkworkAppClient",
                "/app/v3/api",
            )
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            self.write_portal_sdk_boundary(root)
            (root / "sdks" / "clawrouter-app-sdk" / "bin" / "generate-sdk.mjs").write_text(
                "const OFFICIAL_LANGUAGES = ['typescript', 'flutter', 'rust', 'java', 'csharp', 'swift', 'kotlin', 'go', 'python'];\n"
                "const sdkFamily = 'clawrouter-app-sdk';\n"
                "const authorityInputPath = `sdks/${sdkFamily}/openapi/${sdkFamily}.openapi.json`;\n"
                "const sdkgenInputPath = `sdks/${sdkFamily}/openapi/${sdkFamily}.sdkgen.json`;\n"
                "function strictTypeScriptArgs() {\n"
                "  return ['-i', sdkgenInputPath];\n"
                "}\n"
                "function generatorArgs() {\n"
                "  return ['-i', sdkgenInputPath];\n"
                "}\n"
                "console.log('--language');\n"
                "console.log('generated/openapi/clawrouter-app-openapi.json');\n"
                "console.log('sdks/${sdkFamily}/${sdkFamily}-${language}/generated/server-openapi');\n",
                encoding="utf-8",
            )

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "clawrouter-app-sdk bin/generate-sdk.mjs strictTypeScriptArgs() must generate from openapi/${sdkFamily}.openapi.json",
                result.messages,
            )

    def test_reports_sdk_family_generator_that_mixes_authority_and_derived_inputs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(
                root,
                "clawrouter-app-sdk",
                "@sdkwork/clawrouter-app-sdk",
                "app",
                "SdkworkAppClient",
                "/app/v3/api",
            )
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            self.write_portal_sdk_boundary(root)
            (root / "sdks" / "clawrouter-app-sdk" / "bin" / "generate-sdk.mjs").write_text(
                "const OFFICIAL_LANGUAGES = ['typescript', 'flutter', 'rust', 'java', 'csharp', 'swift', 'kotlin', 'go', 'python'];\n"
                "const sdkFamily = 'clawrouter-app-sdk';\n"
                "const authorityInputPath = `sdks/${sdkFamily}/openapi/${sdkFamily}.openapi.json`;\n"
                "const sdkgenInputPath = `sdks/${sdkFamily}/openapi/${sdkFamily}.sdkgen.json`;\n"
                "function strictTypeScriptArgs() {\n"
                "  return ['-i', authorityInputPath, '-i', sdkgenInputPath];\n"
                "}\n"
                "function generatorArgs() {\n"
                "  return ['-i', authorityInputPath, '-i', sdkgenInputPath];\n"
                "}\n"
                "console.log('--language');\n"
                "console.log('sdks/${sdkFamily}/${sdkFamily}-${language}/generated/server-openapi');\n",
                encoding="utf-8",
            )

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "clawrouter-app-sdk bin/generate-sdk.mjs strictTypeScriptArgs() must not generate from openapi/${sdkFamily}.sdkgen.json",
                result.messages,
            )
            self.assertIn(
                "clawrouter-app-sdk bin/generate-sdk.mjs generatorArgs(language) must not generate from openapi/${sdkFamily}.sdkgen.json",
                result.messages,
            )

    def test_reports_app_backend_generator_that_declares_unused_sdkgen_input_path(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(
                root,
                "clawrouter-app-sdk",
                "@sdkwork/clawrouter-app-sdk",
                "app",
                "SdkworkAppClient",
                "/app/v3/api",
            )
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            self.write_portal_sdk_boundary(root)
            script_path = root / "sdks" / "clawrouter-app-sdk" / "bin" / "generate-sdk.mjs"
            script_path.write_text(
                script_path.read_text(encoding="utf-8")
                + "const sdkgenInputPath = `sdks/${sdkFamily}/openapi/${sdkFamily}.sdkgen.json`;\n",
                encoding="utf-8",
            )

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "clawrouter-app-sdk bin/generate-sdk.mjs must not declare sdkgenInputPath because generation uses the authority OpenAPI",
                result.messages,
            )

    def test_reports_open_sdk_generator_that_omits_sdkgen_input_path(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(
                root,
                "clawrouter-app-sdk",
                "@sdkwork/clawrouter-app-sdk",
                "app",
                "SdkworkAppClient",
                "/app/v3/api",
            )
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            self.write_portal_sdk_boundary(root)
            script_path = root / "sdks" / "clawrouter-open-sdk" / "bin" / "generate-sdk.mjs"
            script_path.write_text(
                script_path.read_text(encoding="utf-8").replace(
                    "const sdkgenInputPath = `sdks/${sdkFamily}/openapi/${sdkFamily}.sdkgen.json`;\n",
                    "",
                ),
                encoding="utf-8",
            )

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "clawrouter-open-sdk bin/generate-sdk.mjs must declare sdkgenInputPath because generation uses the derived sdkgen contract",
                result.messages,
            )

    def test_reports_authority_input_path_that_points_to_sdkgen_contract(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(
                root,
                "clawrouter-app-sdk",
                "@sdkwork/clawrouter-app-sdk",
                "app",
                "SdkworkAppClient",
                "/app/v3/api",
            )
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            self.write_portal_sdk_boundary(root)
            script_path = root / "sdks" / "clawrouter-app-sdk" / "bin" / "generate-sdk.mjs"
            script_path.write_text(
                script_path.read_text(encoding="utf-8").replace(
                    "const authorityInputPath = `sdks/${sdkFamily}/openapi/${sdkFamily}.openapi.json`;",
                    "const authorityInputPath = `sdks/${sdkFamily}/openapi/${sdkFamily}.sdkgen.json`;",
                ),
                encoding="utf-8",
            )

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "clawrouter-app-sdk bin/generate-sdk.mjs authorityInputPath must point to openapi/${sdkFamily}.openapi.json",
                result.messages,
            )

    def test_reports_open_sdk_sdkgen_input_path_that_points_to_authority_contract(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(
                root,
                "clawrouter-app-sdk",
                "@sdkwork/clawrouter-app-sdk",
                "app",
                "SdkworkAppClient",
                "/app/v3/api",
            )
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            self.write_portal_sdk_boundary(root)
            script_path = root / "sdks" / "clawrouter-open-sdk" / "bin" / "generate-sdk.mjs"
            script_path.write_text(
                script_path.read_text(encoding="utf-8").replace(
                    "const sdkgenInputPath = `sdks/${sdkFamily}/openapi/${sdkFamily}.sdkgen.json`;",
                    "const sdkgenInputPath = `sdks/${sdkFamily}/openapi/${sdkFamily}.openapi.json`;",
                ),
                encoding="utf-8",
            )

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "clawrouter-open-sdk bin/generate-sdk.mjs sdkgenInputPath must point to openapi/${sdkFamily}.sdkgen.json",
                result.messages,
            )

    def test_reports_sdk_family_openapi_when_it_is_not_synchronized_with_generated_openapi(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(
                root,
                "clawrouter-app-sdk",
                "@sdkwork/clawrouter-app-sdk",
                "app",
                "SdkworkAppClient",
                "/app/v3/api",
            )
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            self.write_portal_sdk_boundary(root)
            generated_openapi = root / "generated" / "openapi"
            generated_openapi.mkdir(parents=True, exist_ok=True)
            (generated_openapi / "clawrouter-app-openapi.json").write_text(
                '{"openapi":"3.1.2","info":{"title":"generated-app","version":"0.1.0"},"paths":{}}\n',
                encoding="utf-8",
            )
            (generated_openapi / "clawrouter-backend-openapi.json").write_text(
                '{"openapi":"3.1.2","info":{"title":"generated-backend","version":"0.1.0"},"paths":{}}\n',
                encoding="utf-8",
            )
            app_family_openapi = root / "sdks" / "clawrouter-app-sdk" / "openapi" / "clawrouter-app-sdk.openapi.json"
            backend_family_openapi = root / "sdks" / "clawrouter-backend-sdk" / "openapi" / "clawrouter-backend-sdk.openapi.json"
            app_family_openapi.write_text(
                '{"openapi":"3.1.2","info":{"title":"stale-app","version":"0.1.0"},"paths":{}}\n',
                encoding="utf-8",
            )
            backend_family_openapi.write_text(
                '{"openapi":"3.1.2","info":{"title":"stale-backend","version":"0.1.0"},"paths":{}}\n',
                encoding="utf-8",
            )

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "clawrouter-app-sdk openapi/clawrouter-app-sdk.openapi.json must stay synchronized with owner-only generated/openapi/clawrouter-app-openapi.json",
                result.messages,
            )
            self.assertIn(
                "clawrouter-backend-sdk openapi/clawrouter-backend-sdk.openapi.json must stay synchronized with owner-only generated/openapi/clawrouter-backend-openapi.json",
                result.messages,
            )

    def test_reports_wrong_sdk_type_and_client_without_enforcing_url_prefix(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(root, "clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk", "backend", "WrongClient", "/wrong")
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            self.write_portal_sdk_boundary(root)

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("clawrouter-app-sdk-typescript sdkwork-sdk.json sdkType must be app", result.messages)
            self.assertIn("clawrouter-app-sdk-typescript src/sdk.ts must export SdkworkAppClient", result.messages)
            self.assertNotIn(
                "clawrouter-app-sdk-typescript src/api/paths.ts must contain /app/v3/api",
                result.messages,
            )

    def test_accepts_standard_ignored_runtime_export_paths_without_dist_artifacts(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(
                root,
                "clawrouter-app-sdk",
                "@sdkwork/clawrouter-app-sdk",
                "app",
                "SdkworkAppClient",
                "/app/v3/api",
                write_dist=False,
            )
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
                write_dist=False,
            )
            self.write_portal_sdk_boundary(root)

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertTrue(result.ok, "\n".join(result.messages))

    def test_reports_non_standard_runtime_export_paths(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(
                root,
                "clawrouter-app-sdk",
                "@sdkwork/clawrouter-app-sdk",
                "app",
                "SdkworkAppClient",
                "/app/v3/api",
            )
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            package_path = root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "package.json"
            package = json.loads(package_path.read_text(encoding="utf-8"))
            package["main"] = "./src/index.ts"
            package["exports"]["."]["require"] = "../dist/index.cjs"
            package_path.write_text(json.dumps(package) + "\n", encoding="utf-8")
            self.write_portal_sdk_boundary(root)

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "clawrouter-app-sdk-typescript package.json main must be dist/index.cjs",
                result.messages,
            )
            self.assertIn(
                "clawrouter-app-sdk-typescript package.json exports[.].require must stay inside SDK package: ../dist/index.cjs",
                result.messages,
            )

    def test_reports_generated_transport_copied_into_composed_facade(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(
                root,
                "clawrouter-app-sdk",
                "@sdkwork/clawrouter-app-sdk",
                "app",
                "SdkworkAppClient",
                "/app/v3/api",
            )
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            app_root = root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript"
            (app_root / "src" / "sdk.ts").write_text(
                "export class SdkworkAppClient {}\n",
                encoding="utf-8",
            )
            (app_root / ".sdkwork").mkdir(parents=True, exist_ok=True)
            (app_root / ".sdkwork" / "sdkwork-generator-manifest.json").write_text(
                "{}\n",
                encoding="utf-8",
            )
            self.write_portal_sdk_boundary(root)

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "clawrouter-app-sdk-typescript composed src must contain only index.ts; generated transport belongs under generated/server-openapi",
                result.messages,
            )
            self.assertIn(
                "clawrouter-app-sdk-typescript composed root must not copy generated control-plane file .sdkwork/sdkwork-generator-manifest.json",
                result.messages,
            )

    def test_reports_unexported_generated_api_artifact(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(root, "clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk", "app", "SdkworkAppClient", "/app/v3/api")
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            app = (
                root
                / "sdks"
                / "clawrouter-app-sdk"
                / "clawrouter-app-sdk-typescript"
                / "generated"
                / "server-openapi"
            )
            (app / "src" / "api" / "index.ts").write_text(
                "export { CouponsApi } from './coupons';\n",
                encoding="utf-8",
            )
            (app / "src" / "api" / "base.ts").write_text("export {};\n", encoding="utf-8")
            (app / "src" / "api" / "paths.ts").write_text("/app/v3/api\n", encoding="utf-8")
            (app / "src" / "api" / "coupons.ts").write_text("export class CouponsApi {}\n", encoding="utf-8")
            (app / "src" / "api" / "coupon.ts").write_text("export class CouponApi {}\n", encoding="utf-8")
            self.write_portal_sdk_boundary(root)

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "clawrouter-app-sdk-typescript must not contain unexported generated API artifact: src/api/coupon.ts",
                result.messages,
            )

    def test_reports_generated_type_file_missing_from_type_index(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(root, "clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk", "app", "SdkworkAppClient", "/app/v3/api")
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            backend_types = (
                root
                / "sdks"
                / "clawrouter-backend-sdk"
                / "clawrouter-backend-sdk-typescript"
                / "generated"
                / "server-openapi"
                / "src"
                / "types"
            )
            (backend_types / "index.ts").write_text(
                "export type { AdminSkillListResponse } from './admin-skill-list-response';\n",
                encoding="utf-8",
            )
            (backend_types / "admin-skill-list-response.ts").write_text(
                "export interface AdminSkillListResponse { items: Record<string, unknown>[]; }\n",
                encoding="utf-8",
            )
            (backend_types / "admin-skill-item.ts").write_text(
                "export interface AdminSkillItem { skillKey: string; }\n",
                encoding="utf-8",
            )
            self.write_portal_sdk_boundary(root)

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "clawrouter-backend-sdk-typescript src/types/index.ts must export AdminSkillItem from ./admin-skill-item",
                result.messages,
            )

    def test_reports_weak_public_sdk_common_empty_operation_types_and_forbidden_no_data_type(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(root, "clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk", "app", "SdkworkAppClient", "/app/v3/api")
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            app_types = (
                root
                / "sdks"
                / "clawrouter-app-sdk"
                / "clawrouter-app-sdk-typescript"
                / "generated"
                / "server-openapi"
                / "src"
                / "types"
            )
            (app_types / "common.ts").write_text(
                "export type { Page, PageResult, RequestConfig, RequestOptions, QueryParams } from '@sdkwork/sdk-common';\n",
                encoding="utf-8",
            )
            (app_types / "no-data.ts").write_text(
                "export type NoData = Record<string, unknown>;\n",
                encoding="utf-8",
            )
            (app_types / "disable-skill-request.ts").write_text(
                "export type DisableSkillRequest = Record<string, unknown>;\n",
                encoding="utf-8",
            )
            (app_types / "metadata-bag.ts").write_text(
                "export type MetadataBag = Record<string, unknown>;\n",
                encoding="utf-8",
            )
            self.write_portal_sdk_boundary(root)

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "clawrouter-app-sdk-typescript src/types/common.ts must not re-export PageResult",
                result.messages,
            )
            self.assertIn(
                "clawrouter-app-sdk-typescript src/types/no-data.ts is forbidden; no-data operations use PlusApiResult",
                result.messages,
            )
            self.assertIn(
                "clawrouter-app-sdk-typescript src/types/no-data.ts must not declare NoData",
                result.messages,
            )
            self.assertIn(
                "clawrouter-app-sdk-typescript src/types/disable-skill-request.ts must not expose "
                "DisableSkillRequest as Record<string, unknown>; use Record<string, never>",
                result.messages,
            )
            self.assertNotIn(
                "clawrouter-app-sdk-typescript src/types/metadata-bag.ts must not expose MetadataBag as "
                "Record<string, unknown>; use Record<string, never>",
                result.messages,
            )

    def test_reports_no_data_index_export(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(root, "clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk", "app", "SdkworkAppClient", "/app/v3/api")
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            app_types = (
                root
                / "sdks"
                / "clawrouter-app-sdk"
                / "clawrouter-app-sdk-typescript"
                / "generated"
                / "server-openapi"
                / "src"
                / "types"
            )
            (app_types / "index.ts").write_text(
                "export type { NoData } from './no-data';\n",
                encoding="utf-8",
            )
            (app_types / "no-data.ts").write_text(
                "export type NoData = Record<string, never>;\n",
                encoding="utf-8",
            )
            self.write_portal_sdk_boundary(root)

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "clawrouter-app-sdk-typescript src/types/index.ts must not export NoData from ./no-data",
                result.messages,
            )

    def test_reports_non_standard_sdk_build_script(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(root, "clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk", "app", "SdkworkAppClient", "/app/v3/api")
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            app_package_path = root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "package.json"
            app_package = json.loads(app_package_path.read_text(encoding="utf-8"))
            app_package["scripts"]["build"] = "tsc --emitDeclarationOnly && vite build"
            app_package["scripts"]["dev"] = "vite build --watch"
            app_package["devDependencies"]["vite"] = "^7.0.0"
            app_package["devDependencies"]["vite-plugin-dts"] = "^4.0.0"
            app_package_path.write_text(json.dumps(app_package) + "\n", encoding="utf-8")
            (
                root
                / "sdks"
                / "clawrouter-app-sdk"
                / "clawrouter-app-sdk-typescript"
                / "custom"
                / "build-runtime.mjs"
            ).unlink()
            self.write_portal_sdk_boundary(root)

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "clawrouter-app-sdk-typescript package.json scripts.build must be node custom/build-runtime.mjs",
                result.messages,
            )
            self.assertIn(
                "clawrouter-app-sdk-typescript package.json scripts.dev must be node custom/build-runtime.mjs",
                result.messages,
            )
            self.assertIn(
                "clawrouter-app-sdk-typescript custom/build-runtime.mjs is required for SDK runtime builds",
                result.messages,
            )
            self.assertIn(
                "clawrouter-app-sdk-typescript package.json devDependencies must not include vite",
                result.messages,
            )
            self.assertIn(
                "clawrouter-app-sdk-typescript package.json devDependencies must not include vite-plugin-dts",
                result.messages,
            )

    def test_reports_public_app_model_catalog_private_pricing_type_regression(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(root, "clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk", "app", "SdkworkAppClient", "/app/v3/api")
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            app_types = (
                root
                / "sdks"
                / "clawrouter-app-sdk"
                / "clawrouter-app-sdk-typescript"
                / "generated"
                / "server-openapi"
                / "src"
                / "types"
            )
            (app_types / "app-model-catalog-item.ts").write_text(
                "import type { AppModelCatalogPriceAvailability } from './app-model-catalog-price-availability';\n\n"
                "export interface AppModelCatalogItem {\n"
                "  model: string;\n"
                "  lowestUpstreamCostUnitPrice?: string | null;\n"
                "  priceAvailability: AppModelCatalogPriceAvailability;\n"
                "}\n",
                encoding="utf-8",
            )
            (app_types / "app-model-catalog-price-availability.ts").write_text(
                "export interface AppModelCatalogPriceAvailability {\n"
                "  status: 'available' | 'unavailable';\n"
                "  customerUnitPrice?: string | null;\n"
                "  grossMarginPerUnit?: string | null;\n"
                "  pricingPlanCode?: string | null;\n"
                "  groupCode?: string | null;\n"
                "}\n",
                encoding="utf-8",
            )
            self.write_portal_sdk_boundary(root)

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "clawrouter-app-sdk-typescript AppModelCatalogPriceAvailability.status must be 'reference' | 'unavailable'",
                result.messages,
            )
            self.assertIn(
                "clawrouter-app-sdk-typescript AppModelCatalogPriceAvailability.status must not expose public available",
                result.messages,
            )
            self.assertIn(
                "clawrouter-app-sdk-typescript AppModelCatalogItem must not expose public private pricing field lowestUpstreamCostUnitPrice",
                result.messages,
            )
            for sensitive_field in (
                "customerUnitPrice",
                "grossMarginPerUnit",
                "pricingPlanCode",
                "groupCode",
            ):
                self.assertIn(
                    "clawrouter-app-sdk-typescript AppModelCatalogPriceAvailability must not expose public private "
                    f"pricing field {sensitive_field}",
                    result.messages,
                )

    def test_reports_app_sdk_query_parameter_standard_regression(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(root, "clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk", "app", "SdkworkAppClient", "/app/v3/api")
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            app_api = (
                root
                / "sdks"
                / "clawrouter-app-sdk"
                / "clawrouter-app-sdk-typescript"
                / "generated"
                / "server-openapi"
                / "src"
                / "api"
                / "ai.ts"
            )
            app_api.write_text(
                "export interface RouterFetchModelsParams {\n"
                "  vendorCodes?: string;\n"
                "  q?: string;\n"
                "  searchQuery?: string;\n"
                "  search_query?: string;\n"
                "  keyword?: string;\n"
                "  search?: string;\n"
                "}\n\n"
                "export async function fetchModels(params?: RouterFetchModelsParams) {\n"
                "  return [\n"
                "    { name: 'vendor_codes', value: params?.vendorCodes, style: 'form', explode: true },\n"
                "    { name: 'q', value: params?.q, style: 'form', explode: true },\n"
                "    { name: 'search_query', value: params?.searchQuery, style: 'form', explode: true },\n"
                "    { name: 'searchQuery', value: params?.search_query, style: 'form', explode: true },\n"
                "    { name: 'keyword', value: params?.keyword, style: 'form', explode: true },\n"
                "    { name: 'search', value: params?.search, style: 'form', explode: true },\n"
                "  ];\n"
                "}\n",
                encoding="utf-8",
            )
            (
                root
                / "sdks"
                / "clawrouter-app-sdk"
                / "clawrouter-app-sdk-typescript"
                / "generated"
                / "server-openapi"
                / "src"
                / "api"
                / "index.ts"
            ).write_text("export * from './ai';\n", encoding="utf-8")
            self.write_portal_sdk_boundary(root)

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "clawrouter-app-sdk-typescript src/api/ai.ts must expose SDK search text as q, not searchQuery/search_query/keyword/search",
                result.messages,
            )
            self.assertIn(
                "clawrouter-app-sdk-typescript src/api/ai.ts must send URL search text as q, not search_query/searchQuery/keyword/search",
                result.messages,
            )
            self.assertIn(
                "clawrouter-app-sdk-typescript src/api/ai.ts must expose vendorCodes as string[] for multi-value query filters",
                result.messages,
            )
            self.assertIn(
                "clawrouter-app-sdk-typescript src/api/ai.ts must serialize vendor_codes with style=form and explode=false",
                result.messages,
            )

    def test_allows_standard_query_parameters_with_later_exploded_scalar_filters(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(root, "clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk", "app", "SdkworkAppClient", "/app/v3/api")
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            app_api = (
                root
                / "sdks"
                / "clawrouter-app-sdk"
                / "clawrouter-app-sdk-typescript"
                / "generated"
                / "server-openapi"
                / "src"
                / "api"
                / "ai.ts"
            )
            app_api.write_text(
                "export interface AiModelsListParams {\n"
                "  vendorCodes?: string[];\n"
                "  q?: string;\n"
                "}\n\n"
                "export async function list(params?: AiModelsListParams) {\n"
                "  return [\n"
                "    { name: 'vendor_codes', value: params?.vendorCodes, style: 'form', explode: false },\n"
                "    { name: 'q', value: params?.q, style: 'form', explode: true },\n"
                "  ];\n"
                "}\n",
                encoding="utf-8",
            )
            (
                root
                / "sdks"
                / "clawrouter-app-sdk"
                / "clawrouter-app-sdk-typescript"
                / "generated"
                / "server-openapi"
                / "src"
                / "api"
                / "index.ts"
            ).write_text("export * from './ai';\n", encoding="utf-8")
            self.write_portal_sdk_boundary(root)

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertTrue(result.ok, result.messages)

    def test_reports_backend_ecosystem_skill_resource_tree_regression(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(root, "clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk", "app", "SdkworkAppClient", "/app/v3/api")
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            ecosystem_api = (
                root
                / "sdks"
                / "clawrouter-backend-sdk"
                / "clawrouter-backend-sdk-typescript"
                / "generated"
                / "server-openapi"
                / "src"
                / "api"
                / "ecosystem.ts"
            )
            ecosystem_api.write_text(
                "export class EcosystemSkillsApi {\n"
                "  async enableSkill() {}\n"
                "  async disableSkill() {}\n"
                "  async publishSkill() {}\n"
                "  async offlineSkill() {}\n"
                "}\n",
                encoding="utf-8",
            )
            self.write_portal_sdk_boundary(root)

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "clawrouter-backend-sdk-typescript src/api/ecosystem.ts must expose resource class EcosystemApi",
                result.messages,
            )
            self.assertIn(
                "clawrouter-backend-sdk-typescript src/api/ecosystem.ts must expose resource member public readonly package: EcosystemSkillsPackageApi;",
                result.messages,
            )
            self.assertIn(
                "clawrouter-backend-sdk-typescript src/api/ecosystem.ts EcosystemSkillsApi must expose async list(",
                result.messages,
            )
            self.assertIn(
                "clawrouter-backend-sdk-typescript src/api/ecosystem.ts must use standard resource-tree methods, not async enableSkill(",
                result.messages,
            )

    def test_reports_missing_portal_sdk_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(root, "clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk", "app", "SdkworkAppClient", "/app/v3/api")
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            portal = root / "apps" / "sdkwork-clawrouter-pc"
            commons = portal / "packages" / "sdkwork-clawroutes-pc-commons"
            commons.mkdir(parents=True, exist_ok=True)
            (portal / "package.json").write_text('{"dependencies":{}}\n', encoding="utf-8")
            (commons / "package.json").write_text('{"dependencies":{}}\n', encoding="utf-8")

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn("portal package.json must depend on @sdkwork/clawrouter-app-sdk", result.messages)
            self.assertIn("portal package.json must depend on @sdkwork/clawrouter-open-sdk", result.messages)
            self.assertIn("portal commons package.json must depend on @sdkwork/clawrouter-backend-sdk", result.messages)
            self.assertIn("portal commons package.json must depend on @sdkwork/clawrouter-open-sdk", result.messages)
            self.assertIn("portal SDK boundary is missing: apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts", result.messages)

    def test_reports_portal_runtime_missing_sdk_client_export(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(root, "clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk", "app", "SdkworkAppClient", "/app/v3/api")
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            self.write_portal_sdk_boundary(root)
            runtime_path = (
                root
                / "apps"
                / "sdkwork-clawrouter-pc"
                / "packages"
                / "sdkwork-clawroutes-pc-commons"
                / "src"
                / "runtime.ts"
            )
            runtime_path.write_text("export * from './api-result.ts';\n", encoding="utf-8")

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "portal commons runtime must export ./sdk-clients.ts: "
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/runtime.ts",
                result.messages,
            )

    def test_reports_portal_ui_root_that_exports_sdk_clients(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_sdk(root, "clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk", "app", "SdkworkAppClient", "/app/v3/api")
            self.write_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
                "backend",
                "SdkworkBackendClient",
                "/backend/v3/api",
            )
            self.write_portal_sdk_boundary(root)
            index_path = (
                root
                / "apps"
                / "sdkwork-clawrouter-pc"
                / "packages"
                / "sdkwork-clawroutes-pc-commons"
                / "src"
                / "index.ts"
            )
            index_path.write_text("export * from './components/CopyButton';\nexport * from './sdk-clients';\n", encoding="utf-8")

            result = ClawRouterSdkGuardian(root=root).run()

            self.assertFalse(result.ok)
            self.assertIn(
                "portal commons UI root must not export ./sdk-clients; use sdkwork-clawroutes-pc-commons/runtime: "
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/index.ts",
                result.messages,
            )


if __name__ == "__main__":
    unittest.main()
