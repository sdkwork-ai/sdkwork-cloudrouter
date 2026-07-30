import json
import tempfile
import unittest
from pathlib import Path

from tools.clawrouter_sdk_runtime_standardizer import SdkRuntimeStandardizer


class SdkRuntimeStandardizerTest(unittest.TestCase):
    def standardizer(self, root: Path, sdk_directories: tuple[str, ...] = ("clawrouter-app-sdk", "clawrouter-backend-sdk")) -> SdkRuntimeStandardizer:
        return SdkRuntimeStandardizer(root=root, sdk_directories=sdk_directories)

    def sdk_base(self, root: Path, sdk_dir: str) -> Path:
        return root / "sdks" / sdk_dir / f"{sdk_dir}-typescript"

    def javascript_function_body(self, source: str, function_name: str) -> str:
        marker = f"function {function_name}("
        start = source.find(marker)
        self.assertGreaterEqual(start, 0, f"missing function {function_name}")

        open_brace = source.find("{", start)
        self.assertGreaterEqual(open_brace, 0, f"missing opening brace for {function_name}")

        depth = 0
        for index in range(open_brace, len(source)):
            character = source[index]
            if character == "{":
                depth += 1
            elif character == "}":
                depth -= 1
                if depth == 0:
                    return source[open_brace + 1 : index]

        self.fail(f"unclosed function body for {function_name}")

    def write_minimal_typescript_sdk(self, root: Path, sdk_dir: str, package_name: str) -> Path:
        base = self.sdk_base(root, sdk_dir)
        base.mkdir(parents=True, exist_ok=True)
        (base / "package.json").write_text(
            json.dumps({"name": package_name, "version": "0.1.0"}) + "\n",
            encoding="utf-8",
        )
        return base

    def test_standardizes_generated_sdk_runtime_build_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for sdk_dir, package_name in (
                ("clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk"),
                ("clawrouter-backend-sdk", "@sdkwork/clawrouter-backend-sdk"),
            ):
                base = self.write_minimal_typescript_sdk(root, sdk_dir, package_name)
                (base / "custom").mkdir(parents=True, exist_ok=True)
                (base / "src" / "http").mkdir(parents=True, exist_ok=True)
                (base / "package.json").write_text(
                    json.dumps(
                        {
                            "name": package_name,
                            "dependencies": {
                                "@sdkwork/sdk-common": "^1.0.0",
                            },
                            "scripts": {
                                "build": "tsc --emitDeclarationOnly && vite build",
                                "dev": "vite build --watch",
                                "prepublishOnly": "npm run build",
                            },
                            "devDependencies": {
                                "@types/node": "^20.0.0",
                                "typescript": "^5.3.0",
                                "vite": "^7.0.0",
                                "vite-plugin-dts": "^4.0.0",
                            },
                        }
                    )
                    + "\n",
                    encoding="utf-8",
                )
                (base / "src" / "http" / "client.ts").write_text(
                    "import type { QueryParams } from '@sdkwork/sdk-common';\n"
                    "export class HttpClient {\n"
                    "  async request<T>(path: string, options: unknown = {}): Promise<T> { throw new Error('stub'); }\n"
                    "  async post<T>(path: string, body?: unknown, params?: QueryParams, headers?: Record<string, string>): Promise<T> {\n"
                    "    return this.request<T>(path, { method: 'POST', body, params, headers });\n"
                    "  }\n"
                    "  async put<T>(path: string, body?: unknown, params?: QueryParams, headers?: Record<string, string>): Promise<T> {\n"
                    "    return this.request<T>(path, { method: 'PUT', body, params, headers });\n"
                    "  }\n"
                    "  async patch<T>(path: string, body?: unknown, params?: QueryParams, headers?: Record<string, string>): Promise<T> {\n"
                    "    return this.request<T>(path, { method: 'PATCH', body, params, headers });\n"
                    "  }\n"
                    "}\n",
                    encoding="utf-8",
                )

            updated = self.standardizer(root).run()

            updated_paths = set(updated)
            for sdk_dir in ("clawrouter-app-sdk", "clawrouter-backend-sdk"):
                base = self.sdk_base(root, sdk_dir)
                self.assertTrue(
                    {
                        base / "package.json",
                        base / "custom" / "build-runtime.mjs",
                        base / "custom" / "README.md",
                        base / "sdkwork-sdk.json",
                        base / ".sdkwork" / "sdkwork-generator-manifest.json",
                        base / "src" / "http" / "client.ts",
                    }.issubset(updated_paths)
                )
                package = json.loads((base / "package.json").read_text(encoding="utf-8"))
                self.assertEqual("node custom/build-runtime.mjs", package["scripts"]["build"])
                self.assertEqual("node custom/build-runtime.mjs", package["scripts"]["dev"])
                self.assertEqual("npm run build", package["scripts"]["prepublishOnly"])
                self.assertEqual("workspace:*", package["dependencies"]["@sdkwork/sdk-common"])
                self.assertIn("rollup", package["devDependencies"])
                self.assertNotIn("vite", package["devDependencies"])
                self.assertNotIn("vite-plugin-dts", package["devDependencies"])
                build_runtime = (base / "custom" / "build-runtime.mjs").read_text(encoding="utf-8")
                self.assertIn("rollup", build_runtime)
                self.assertIn("await removeTypeOnlyRuntimeReExports(path.join(tempEsmDir, 'index.js'));", build_runtime)
                self.assertIn("async function removeTypeOnlyRuntimeReExports(entryFile) {", build_runtime)
                self.assertIn("line.trim() === \"export * from './types';\"", build_runtime)
                self.assertIn("source.split(/\\r?\\n/u)", build_runtime)
                self.assertIn("runtimeLines.join('\\n')", build_runtime)
                self.assertNotIn("stageDomainTransport", build_runtime)
                self.assertNotIn("generated/domains", build_runtime)
                self.assertNotIn("domains-generated", build_runtime)
                http_client = (base / "src" / "http" / "client.ts").read_text(encoding="utf-8")
                self.assertIn("contentType?: string", http_client)
                self.assertIn("headers: this.withContentType(headers, contentType)", http_client)

    def test_standardizes_app_and_backend_http_clients_to_dual_token_headers(self) -> None:
        source = """import { BaseHttpClient, withRetry } from '@sdkwork/sdk-common';

export class HttpClient {
  private applySdkworkAuthHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
    const authConfig = this.getInternalAuthConfig();
    const tokenManager = authConfig.tokenManager;
    const accessToken = tokenManager?.getAccessToken?.();
    if (!accessToken) {
      return headers;
    }

    return {
      ...(headers ?? {}),
      [HttpClient.ACCESS_TOKEN_HEADER]: accessToken,
    };
  }
}
"""
        standardizer = self.standardizer(Path.cwd())

        normalized = standardizer._standardize_http_client_dual_token_headers(source)

        self.assertIn("import { BaseHttpClient, buildAuthHeaders, withRetry }", normalized)
        self.assertIn("buildAuthHeaders('dual-token', undefined, tokenManager)", normalized)
        self.assertIn("...authHeaders", normalized)
        self.assertNotIn("tokenManager?.getAccessToken?.()", normalized)
        self.assertNotIn("Authorization: `Bearer ${authToken}`", normalized)
        self.assertEqual(normalized, standardizer._standardize_http_client_dual_token_headers(normalized))

    def test_standardizes_primary_generated_http_client(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            base = self.sdk_base(root, "clawrouter-app-sdk")
            source = """import { BaseHttpClient, withRetry } from '@sdkwork/sdk-common';

export class HttpClient {
  private applySdkworkAuthHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
    const authConfig = this.getInternalAuthConfig();
    const tokenManager = authConfig.tokenManager;
    const accessToken = tokenManager?.getAccessToken?.();
    if (!accessToken) {
      return headers;
    }

    return {
      ...(headers ?? {}),
      [HttpClient.ACCESS_TOKEN_HEADER]: accessToken,
    };
  }
}
"""
            clients = (base / "generated" / "server-openapi" / "src" / "http" / "client.ts",)
            for client in clients:
                client.parent.mkdir(parents=True, exist_ok=True)
                client.write_text(source, encoding="utf-8")

            updated = self.standardizer(root, ("clawrouter-app-sdk",))._standardize_generated_http_clients(
                "clawrouter-app-sdk",
                base,
            )

            self.assertEqual(set(clients), set(updated))
            for client in clients:
                normalized = client.read_text(encoding="utf-8")
                self.assertIn("buildAuthHeaders('dual-token', undefined, tokenManager)", normalized)
                self.assertNotIn("Authorization: `Bearer ${authToken}`", normalized)

    def test_standardizes_generated_sdk_runtime_build_metadata_idempotently(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for sdk_dir, package_name in (
                ("clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk"),
                ("clawrouter-backend-sdk", "@sdkwork/clawrouter-backend-sdk"),
            ):
                self.write_minimal_typescript_sdk(root, sdk_dir, package_name)

            self.standardizer(root).run()
            second_run = self.standardizer(root).run()

            touched = {
                path
                for path in second_run
                if path.name in {"package.json", "build-runtime.mjs"}
            }
            self.assertEqual(set(), touched)

    def test_removes_retired_domain_transport_directories(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            base = self.write_minimal_typescript_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
            )
            retired_roots = (
                base / "generated" / "domains",
                base / "src" / "domains",
                base / "dist" / "domains-generated",
            )
            for retired_root in retired_roots:
                retired_root.mkdir(parents=True)

            updated = self.standardizer(root, ("clawrouter-backend-sdk",)).run()

            self.assertTrue(set(retired_roots).issubset(set(updated)))
            self.assertTrue(all(not retired_root.exists() for retired_root in retired_roots))

    def test_syncs_typescript_package_root_from_generated_server_openapi(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            base = self.write_minimal_typescript_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
            )
            generated = base / "generated" / "server-openapi"
            (generated / ".sdkwork").mkdir(parents=True, exist_ok=True)
            (generated / "src" / "api").mkdir(parents=True, exist_ok=True)
            (generated / "src" / "types").mkdir(parents=True, exist_ok=True)
            (generated / "custom").mkdir(parents=True, exist_ok=True)
            (generated / "package.json").write_text(
                json.dumps(
                    {
                        "name": "clawrouter-backend-sdk-generated-typescript",
                        "version": "0.1.0",
                        "private": True,
                        "sdkworkRole": "transport",
                        "scripts": {"build": "node custom/build-runtime.mjs"},
                    }
                )
                + "\n",
                encoding="utf-8",
            )
            (generated / "README.md").write_text("fresh sdk readme\n", encoding="utf-8")
            (generated / "sdkwork-sdk.json").write_text(
                json.dumps(
                    {
                        "language": "typescript",
                        "sdkType": "backend",
                        "packageName": "clawrouter-backend-sdk-generated-typescript",
                    }
                )
                + "\n",
                encoding="utf-8",
            )
            (generated / ".sdkwork" / "sdkwork-generator-manifest.json").write_text(
                json.dumps(
                    {
                        "generator": "@sdkwork/sdk-generator",
                        "generatedFiles": [
                            {"path": "src/sdk.ts"},
                            {"path": "src/api/index.ts"},
                            {"path": "src/types/index.ts"},
                        ],
                    }
                )
                + "\n",
                encoding="utf-8",
            )
            (generated / "src" / "sdk.ts").write_text(
                "export class SdkworkBackendClient {}\n",
                encoding="utf-8",
            )
            (generated / "src" / "api" / "index.ts").write_text(
                "export * from './platform';\n",
                encoding="utf-8",
            )
            (generated / "src" / "types" / "index.ts").write_text(
                "export type { PlatformResult } from './platform-result';\n",
                encoding="utf-8",
            )
            (generated / "src" / "types" / "platform-result.ts").write_text(
                "export interface PlatformResult { ok: boolean; }\n",
                encoding="utf-8",
            )
            (base / ".sdkwork").mkdir(parents=True, exist_ok=True)
            (base / "src" / "api").mkdir(parents=True, exist_ok=True)
            (base / "src" / "types").mkdir(parents=True, exist_ok=True)
            (base / ".sdkwork" / "sdkwork-generator-manifest.json").write_text(
                json.dumps({"generator": "@sdkwork/sdk-generator", "generatedFiles": [{"path": "src/api/legacy-provider.ts"}]})
                + "\n",
                encoding="utf-8",
            )
            (base / "src" / "api" / "legacy-provider.ts").write_text("legacy provider\n", encoding="utf-8")
            (base / "src" / "types" / "legacy-provider-account.ts").write_text(
                "export interface LegacyProviderAccount {}\n",
                encoding="utf-8",
            )
            (base / "src" / "domains").mkdir(parents=True, exist_ok=True)
            (base / "src" / "domains" / "index.ts").write_text(
                "export const domains = true;\n",
                encoding="utf-8",
            )
            (base / "src" / "sdk.ts").write_text("legacyProvider\n", encoding="utf-8")

            self.standardizer(root, ("clawrouter-backend-sdk",)).run()

            self.assertFalse((base / "src" / "api" / "legacy-provider.ts").exists())
            self.assertFalse((base / "src" / "types" / "legacy-provider-account.ts").exists())
            self.assertEqual(
                "export class SdkworkBackendClient {}\n",
                (base / "src" / "sdk.ts").read_text(encoding="utf-8"),
            )
            self.assertIn("fresh sdk readme", (base / "README.md").read_text(encoding="utf-8"))
            package = json.loads((base / "package.json").read_text(encoding="utf-8"))
            self.assertEqual("@sdkwork/clawrouter-backend-sdk", package["name"])
            self.assertEqual("composed-facade", package["sdkworkRole"])
            self.assertFalse(package.get("private", False))
            self.assertEqual("./dist/index.cjs", package["main"])
            self.assertEqual("./dist/index.js", package["module"])
            self.assertEqual("./dist/index.d.ts", package["types"])
            self.assertEqual("./dist/index.d.ts", package["exports"]["."]["types"])
            self.assertEqual("./dist/index.js", package["exports"]["."]["import"])
            self.assertEqual("./dist/index.cjs", package["exports"]["."]["require"])
            self.assertFalse((base / "src" / "domains").exists())
            self.assertNotIn("./domains", package["exports"])
            self.assertEqual("node custom/build-runtime.mjs", package["scripts"]["build"])
            root_metadata = json.loads((base / "sdkwork-sdk.json").read_text(encoding="utf-8"))
            self.assertEqual("@sdkwork/clawrouter-backend-sdk", root_metadata["packageName"])
            self.assertEqual("backend", root_metadata["sdkType"])

    def test_standardizes_app_multipart_methods_to_request_dto_body(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            base = self.write_minimal_typescript_sdk(root, "clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk")
            generated_openapi = root / "generated" / "openapi"
            generated_openapi.mkdir(parents=True, exist_ok=True)
            sdk_openapi = root / "sdks" / "clawrouter-app-sdk" / "openapi"
            sdk_openapi.mkdir(parents=True, exist_ok=True)
            multipart_spec = {
                "openapi": "3.1.0",
                "paths": {
                    "/app/v3/api/content/forum/attachments": {
                        "post": {
                            "operationId": "forum.attachments.create",
                            "requestBody": {
                                "required": True,
                                "content": {
                                    "multipart/form-data": {
                                        "schema": {
                                            "$ref": "#/components/schemas/ForumAttachmentUploadRequest"
                                        }
                                    }
                                },
                            },
                        }
                    }
                },
                "components": {
                    "schemas": {
                        "ForumAttachmentUploadRequest": {
                            "type": "object",
                            "properties": {"file": {"type": "string", "format": "binary"}},
                        }
                    }
                },
            }
            (sdk_openapi / "clawrouter-app-sdk.sdkgen.json").write_text(
                json.dumps(multipart_spec, indent=2) + "\n",
                encoding="utf-8",
            )
            (generated_openapi / "clawrouter-app-openapi.json").write_text(
                json.dumps(multipart_spec, indent=2) + "\n",
                encoding="utf-8",
            )
            api_dir = base / "src" / "api"
            api_dir.mkdir(parents=True, exist_ok=True)
            (api_dir / "content.ts").write_text(
                "import { appApiPath } from './paths';\n"
                "import type { HttpClient } from '../http/client';\n"
                "import type { ForumAttachmentsCreateResult, ForumAttachmentUploadRequest } from '../types';\n"
                "export class ContentForumAttachmentsApi {\n"
                "  constructor(private client: HttpClient) {}\n"
                "  async create(body: ForumAttachmentUploadRequest): Promise<ForumAttachmentsCreateResult> {\n"
                "    return this.client.post<ForumAttachmentsCreateResult>(appApiPath(`/content/forum/attachments`), body, undefined, undefined, 'multipart/form-data');\n"
                "  }\n"
                "}\n",
                encoding="utf-8",
            )

            self.standardizer(root, ("clawrouter-app-sdk",)).run()

            content = (api_dir / "content.ts").read_text(encoding="utf-8")
            self.assertIn("ForumAttachmentUploadRequest", content)
            self.assertIn("async create(body: ForumAttachmentUploadRequest)", content)
            self.assertNotIn("async create(body: FormData)", content)

    def test_syncs_family_openapi_snapshots_without_typescript_workspace(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generated_openapi = root / "generated" / "openapi"
            generated_openapi.mkdir(parents=True, exist_ok=True)
            app_authority = {
                "openapi": "3.1.0",
                "info": {"title": "fresh app", "version": "0.1.0"},
                "paths": {"/app/v3/api/fresh": {"get": {"responses": {"200": {"description": "OK"}}}}},
            }
            backend_authority = {
                "openapi": "3.1.0",
                "info": {"title": "fresh backend", "version": "0.1.0"},
                "paths": {"/backend/v3/api/fresh": {"get": {"responses": {"200": {"description": "OK"}}}}},
            }
            (generated_openapi / "clawrouter-app-openapi.json").write_text(
                json.dumps(app_authority, indent=2) + "\n",
                encoding="utf-8",
            )
            (generated_openapi / "clawrouter-backend-openapi.json").write_text(
                json.dumps(backend_authority, indent=2) + "\n",
                encoding="utf-8",
            )

            stale_spec = {
                "openapi": "3.1.0",
                "info": {"title": "stale", "version": "0.1.0"},
                "paths": {},
            }
            for sdk_dir in ("clawrouter-app-sdk", "clawrouter-backend-sdk"):
                sdk_openapi = root / "sdks" / sdk_dir / "openapi"
                sdk_openapi.mkdir(parents=True, exist_ok=True)
                (sdk_openapi / f"{sdk_dir}.openapi.json").write_text(
                    json.dumps(stale_spec, indent=2) + "\n",
                    encoding="utf-8",
                )
                (sdk_openapi / f"{sdk_dir}.sdkgen.json").write_text(
                    json.dumps(stale_spec, indent=2) + "\n",
                    encoding="utf-8",
                )

            standardizer = self.standardizer(root)
            updated = standardizer.sync_openapi_snapshots()
            expected_app_authority = standardizer._owner_only_openapi_payload(
                "clawrouter-app-sdk",
                app_authority,
            )
            expected_backend_authority = standardizer._owner_only_openapi_payload(
                "clawrouter-backend-sdk",
                backend_authority,
            )

            self.assertEqual(
                {
                    root / "sdks" / "clawrouter-app-sdk" / "openapi" / "clawrouter-app-sdk.openapi.json",
                    root / "sdks" / "clawrouter-app-sdk" / "openapi" / "clawrouter-app-sdk.sdkgen.json",
                    root / "sdks" / "clawrouter-backend-sdk" / "openapi" / "clawrouter-backend-sdk.openapi.json",
                    root / "sdks" / "clawrouter-backend-sdk" / "openapi" / "clawrouter-backend-sdk.sdkgen.json",
                },
                set(updated),
            )
            self.assertEqual(
                expected_app_authority,
                json.loads(
                    (
                        root
                        / "sdks"
                        / "clawrouter-app-sdk"
                        / "openapi"
                        / "clawrouter-app-sdk.openapi.json"
                    ).read_text(encoding="utf-8")
                ),
            )
            self.assertEqual(
                expected_app_authority,
                json.loads(
                    (
                        root
                        / "sdks"
                        / "clawrouter-app-sdk"
                        / "openapi"
                        / "clawrouter-app-sdk.sdkgen.json"
                    ).read_text(encoding="utf-8")
                ),
            )
            self.assertEqual(
                expected_backend_authority,
                json.loads(
                    (
                        root
                        / "sdks"
                        / "clawrouter-backend-sdk"
                        / "openapi"
                        / "clawrouter-backend-sdk.openapi.json"
                    ).read_text(encoding="utf-8")
                ),
            )
            self.assertFalse((root / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript").exists())

    def test_writes_open_sdk_derived_spec_without_recursive_schema_cycles(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_minimal_typescript_sdk(root, "clawrouter-open-sdk", "@sdkwork/clawrouter-open-sdk")
            source_path = root / "apps" / "sdkwork-clawrouter-pc" / "public" / "openapi.json"
            source_path.parent.mkdir(parents=True, exist_ok=True)
            source = {
                "openapi": "3.0.3",
                "info": {"title": "fixture", "version": "0.1.0"},
                "paths": {
                    "/v1/chat/completions": {
                        "post": {
                            "operationId": "createChatCompletion",
                            "responses": {"200": {"description": "ok"}},
                        }
                    }
                },
                "components": {
                    "schemas": {
                        "ProviderJsonValue": {
                            "oneOf": [
                                {"type": "string"},
                                {"type": "array", "items": {"$ref": "#/components/schemas/ProviderJsonValue"}},
                                {"$ref": "#/components/schemas/ProviderJsonObject"},
                            ]
                        },
                        "ProviderJsonObject": {
                            "type": "object",
                            "additionalProperties": {"$ref": "#/components/schemas/ProviderJsonValue"},
                        },
                        "OpenAiJsonSchema": {
                            "type": "object",
                            "properties": {
                                "items": {"$ref": "#/components/schemas/OpenAiJsonSchema"},
                                "metadata": {"$ref": "#/components/schemas/ProviderJsonValue"},
                            },
                        },
                        "PlainModel": {
                            "type": "object",
                            "properties": {"name": {"type": "string"}},
                        },
                    }
                },
            }
            source_path.write_text(json.dumps(source, indent=2) + "\n", encoding="utf-8")

            self.standardizer(root, ("clawrouter-open-sdk",)).run()

            family = root / "sdks" / "clawrouter-open-sdk"
            authority = json.loads((family / "openapi" / "clawrouter-open-sdk.openapi.json").read_text(encoding="utf-8"))
            sdkgen = json.loads((family / "openapi" / "clawrouter-open-sdk.sdkgen.json").read_text(encoding="utf-8"))
            assembly = json.loads((family / "sdk-manifest.json").read_text(encoding="utf-8"))
            generate_script = (family / "bin" / "generate-sdk.mjs").read_text(encoding="utf-8")

            self.assertEqual(
                "#/components/schemas/ProviderJsonValue",
                authority["components"]["schemas"]["ProviderJsonObject"]["additionalProperties"]["$ref"],
            )
            self.assertEqual([], self.component_ref_cycles(sdkgen))
            self.assertTrue(
                sdkgen["components"]["schemas"]["ProviderJsonObject"]["additionalProperties"][
                    "x-sdkwork-derived-recursive-boundary"
                ]
            )
            self.assertEqual(
                {"type": "string"},
                sdkgen["components"]["schemas"]["PlainModel"]["properties"]["name"],
            )
            self.assertIn("authorityInputPath", generate_script)
            self.assertIn("sdkgenInputPath", generate_script)
            self.assertIn("openapi/${sdkFamily}.sdkgen.json", generate_script)
            self.assertEqual("openapi/clawrouter-open-sdk.sdkgen.json", assembly["generationInputSpec"])
            self.assertNotIn("derivedSpec", assembly)
            self.assertEqual(
                {"sdk-generator": "openapi/clawrouter-open-sdk.sdkgen.json"},
                assembly["derivedSpecs"],
            )
            strict_body = self.javascript_function_body(generate_script, "strictTypeScriptArgs")
            generator_body = self.javascript_function_body(generate_script, "generatorArgs")
            self.assertIn("'-i', sdkgenInputPath", strict_body)
            self.assertIn("'-i', sdkgenInputPath", generator_body)
            self.assertIn("rmSync", generate_script)
            self.assertIn("function generatedOutputPath(language) {", generate_script)
            self.assertIn("if (language === 'typescript') {", generate_script)
            self.assertIn(
                "rmSync(path.join(workspaceRoot, generatedOutputPath(language)), { recursive: true, force: true });",
                generate_script,
            )

    def test_standardizes_app_and_backend_typescript_generation_to_authority_openapi(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for sdk_dir, package_name in (
                ("clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk"),
                ("clawrouter-backend-sdk", "@sdkwork/clawrouter-backend-sdk"),
            ):
                self.write_minimal_typescript_sdk(root, sdk_dir, package_name)

            self.standardizer(root).run()

            for sdk_dir in ("clawrouter-app-sdk", "clawrouter-backend-sdk"):
                generate_script = (root / "sdks" / sdk_dir / "bin" / "generate-sdk.mjs").read_text(encoding="utf-8")
                assembly = json.loads((root / "sdks" / sdk_dir / "sdk-manifest.json").read_text(encoding="utf-8"))
                strict_body = self.javascript_function_body(generate_script, "strictTypeScriptArgs")
                generator_body = self.javascript_function_body(generate_script, "generatorArgs")
                self.assertIn("const authorityInputPath = `sdks/${sdkFamily}/openapi/${sdkFamily}.openapi.json`;", generate_script)
                self.assertNotIn("const sdkgenInputPath", generate_script)
                self.assertEqual(f"openapi/{sdk_dir}.openapi.json", assembly["generationInputSpec"])
                self.assertNotIn("derivedSpec", assembly)
                self.assertEqual({}, assembly["derivedSpecs"])
                self.assertIn("'-i', authorityInputPath", strict_body)
                self.assertNotIn("'-i', sdkgenInputPath", strict_body)
                self.assertIn("'-i', authorityInputPath", generator_body)
                self.assertNotIn("'-i', sdkgenInputPath", generator_body)
                self.assertIn("cleanGeneratedOutput(language);", generate_script)
                self.assertIn("function cleanGeneratedOutput(language) {", generate_script)
                self.assertIn("syncFamilyOpenApiSnapshots();", generate_script)
                self.assertIn("function syncFamilyOpenApiSnapshots() {", generate_script)
                self.assertIn("if (languages.includes('typescript')) {", generate_script)
                self.assertIn("syncComposedTypeScriptFacade();", generate_script)
                composed_sync_body = self.javascript_function_body(
                    generate_script,
                    "syncComposedTypeScriptFacade",
                )
                self.assertIn("'tools.clawrouter_sdk_runtime_standardizer'", composed_sync_body)
                self.assertNotIn("'--openapi-only'", composed_sync_body)
                self.assertNotIn("domainTransport", generate_script)
                self.assertNotIn("generated/domains", generate_script)
                self.assertNotIn("domain-transport", generate_script)

    def test_verify_script_checks_family_generation_input_contract(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for sdk_dir, package_name in (
                ("clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk"),
                ("clawrouter-backend-sdk", "@sdkwork/clawrouter-backend-sdk"),
                ("clawrouter-open-sdk", "@sdkwork/clawrouter-open-sdk"),
            ):
                self.write_minimal_typescript_sdk(root, sdk_dir, package_name)

            self.standardizer(
                root,
                ("clawrouter-app-sdk", "clawrouter-backend-sdk", "clawrouter-open-sdk"),
            ).run()

            expected_generation_inputs = {
                "clawrouter-app-sdk": "openapi/clawrouter-app-sdk.openapi.json",
                "clawrouter-backend-sdk": "openapi/clawrouter-backend-sdk.openapi.json",
                "clawrouter-open-sdk": "openapi/clawrouter-open-sdk.sdkgen.json",
            }
            expected_derived_specs = {
                "clawrouter-app-sdk": "{}",
                "clawrouter-backend-sdk": "{}",
                "clawrouter-open-sdk": '{"sdk-generator":"openapi/clawrouter-open-sdk.sdkgen.json"}',
            }
            for sdk_dir in expected_generation_inputs:
                verify_script = (root / "sdks" / sdk_dir / "bin" / "verify-sdk.mjs").read_text(
                    encoding="utf-8"
                )
                self.assertIn(
                    f"const expectedGenerationInputSpec = '{expected_generation_inputs[sdk_dir]}';",
                    verify_script,
                )
                self.assertIn(
                    f"const expectedDerivedSpecs = {expected_derived_specs[sdk_dir]};",
                    verify_script,
                )
                self.assertIn("assembly.generationInputSpec !== expectedGenerationInputSpec", verify_script)
                self.assertIn("JSON.stringify(assembly.derivedSpecs ?? null)", verify_script)
                self.assertIn("Object.prototype.hasOwnProperty.call(assembly, 'derivedSpec')", verify_script)

    def component_ref_cycles(self, spec: dict[str, object]) -> list[list[str]]:
        schemas = spec.get("components", {}).get("schemas", {})  # type: ignore[union-attr]
        if not isinstance(schemas, dict):
            return []
        graph = {name: sorted(self.component_refs(schema) & schemas.keys()) for name, schema in schemas.items()}
        cycles: list[list[str]] = []
        stack: list[str] = []
        on_stack: set[str] = set()
        visited: set[str] = set()

        def visit(name: str) -> None:
            visited.add(name)
            on_stack.add(name)
            stack.append(name)
            for target in graph.get(name, []):
                if target not in visited:
                    visit(target)
                elif target in on_stack:
                    cycles.append([*stack[stack.index(target) :], target])
            stack.pop()
            on_stack.remove(name)

        for schema_name in graph:
            if schema_name not in visited:
                visit(schema_name)
        return cycles

    def component_refs(self, value: object) -> set[str]:
        refs: set[str] = set()
        if isinstance(value, list):
            for item in value:
                refs.update(self.component_refs(item))
        elif isinstance(value, dict):
            raw_ref = value.get("$ref")
            if isinstance(raw_ref, str) and raw_ref.startswith("#/components/schemas/"):
                refs.add(raw_ref.rsplit("/", 1)[-1])
            for item in value.values():
                refs.update(self.component_refs(item))
        return refs

    def test_standardizes_publish_core_dependency_install_without_dependency_prepare_scripts(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for sdk_dir, package_name in (
                ("clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk"),
                ("clawrouter-backend-sdk", "@sdkwork/clawrouter-backend-sdk"),
            ):
                base = self.sdk_base(root, sdk_dir)
                (base / "bin").mkdir(parents=True, exist_ok=True)
                (base / "package.json").write_text(
                    json.dumps({"name": package_name}) + "\n",
                    encoding="utf-8",
                )
                (base / "bin" / "publish-core.mjs").write_text(
                    "import { existsSync } from 'node:fs';\n"
                    "import path from 'node:path';\n"
                    "function runTypeScript(ctx) {\n"
                    "  run('npm', ['install'], { cwd: ctx.projectDir });\n"
                    "  run('npm', ['run', 'build'], { cwd: ctx.projectDir });\n"
                    "}\n",
                    encoding="utf-8",
                )

            updated = self.standardizer(root).run()

            for sdk_dir in ("clawrouter-app-sdk", "clawrouter-backend-sdk"):
                publish_core = self.sdk_base(root, sdk_dir) / "bin" / "publish-core.mjs"
                source = publish_core.read_text(encoding="utf-8")
                self.assertIn("function hasTypeScriptSdkDependencies(projectDir) {", source)
                self.assertIn("if (!hasTypeScriptSdkDependencies(ctx.projectDir)) {", source)
                self.assertIn("run('npm', ['install', '--ignore-scripts'], { cwd: ctx.projectDir });", source)
                self.assertIn("TypeScript dependencies already installed, skipping npm install.", source)
                self.assertNotIn("run('npm', ['install'], { cwd: ctx.projectDir });", source)
                self.assertIn(publish_core, updated)

    def test_standardizes_publish_core_dependency_install_idempotently(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for sdk_dir, package_name in (
                ("clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk"),
                ("clawrouter-backend-sdk", "@sdkwork/clawrouter-backend-sdk"),
            ):
                base = self.sdk_base(root, sdk_dir)
                (base / "bin").mkdir(parents=True, exist_ok=True)
                (base / "package.json").write_text(
                    json.dumps({"name": package_name}) + "\n",
                    encoding="utf-8",
                )
                (base / "bin" / "publish-core.mjs").write_text(
                    "import { existsSync } from 'node:fs';\n"
                    "import path from 'node:path';\n"
                    "function hasTypeScriptSdkDependencies(projectDir) {\n"
                    "  return existsSync(path.join(projectDir, 'node_modules', 'typescript'))\n"
                    "    && existsSync(path.join(projectDir, 'node_modules', 'rollup'))\n"
                    "    && existsSync(path.join(projectDir, 'node_modules', '@sdkwork', 'sdk-common'));\n"
                    "}\n"
                    "\n"
                    "function runTypeScript(ctx) {\n"
                    "  const packageFile = path.join(ctx.projectDir, 'package.json');\n"
                    "  ensureFile(packageFile, 'package.json');\n"
                    "  const packageJson = loadJson(packageFile);\n"
                    "  const hasBuildScript = Boolean(packageJson?.scripts?.build);\n"
                    "\n"
                    "  if (ctx.action === 'check') {\n"
                    "    run('npm', ['pack', '--dry-run'], { cwd: ctx.projectDir });\n"
                    "    return;\n"
                    "  }\n"
                    "\n"
                    "  if (!hasTypeScriptSdkDependencies(ctx.projectDir)) {\n"
                    "    if (!hasTypeScriptSdkDependencies(ctx.projectDir)) {\n"
                    "    run('npm', ['install', '--ignore-scripts'], { cwd: ctx.projectDir });\n"
                    "  } else {\n"
                    "    log('TypeScript dependencies already installed, skipping npm install.');\n"
                    "  }\n"
                    "  } else {\n"
                    "    log('TypeScript dependencies already installed, skipping npm install.');\n"
                    "  }\n"
                    "  if (hasBuildScript) {\n"
                    "    run('npm', ['run', 'build'], { cwd: ctx.projectDir });\n"
                    "  }\n"
                    "}\n"
                    "\n"
                    "function runDart(ctx) {}\n",
                    encoding="utf-8",
                )

            updated = self.standardizer(root).run()

            for sdk_dir in ("clawrouter-app-sdk", "clawrouter-backend-sdk"):
                publish_core = self.sdk_base(root, sdk_dir) / "bin" / "publish-core.mjs"
                source = publish_core.read_text(encoding="utf-8")
                self.assertEqual(1, source.count("if (!hasTypeScriptSdkDependencies(ctx.projectDir)) {"))
                self.assertEqual(1, source.count("run('npm', ['install', '--ignore-scripts'], { cwd: ctx.projectDir });"))
                self.assertNotIn("if (!hasTypeScriptSdkDependencies(ctx.projectDir)) {\n    if (!hasTypeScriptSdkDependencies", source)
                self.assertIn(
                    "  if (!hasTypeScriptSdkDependencies(ctx.projectDir)) {\n"
                    "    run('npm', ['install', '--ignore-scripts'], { cwd: ctx.projectDir });\n"
                    "  } else {\n"
                    "    log('TypeScript dependencies already installed, skipping npm install.');\n"
                    "  }\n"
                    "  if (hasBuildScript) {",
                    source,
                )
                self.assertIn(publish_core, updated)

    def test_standardizes_publish_core_check_to_build_before_pack(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for sdk_dir, package_name in (
                ("clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk"),
                ("clawrouter-backend-sdk", "@sdkwork/clawrouter-backend-sdk"),
            ):
                base = self.sdk_base(root, sdk_dir)
                (base / "bin").mkdir(parents=True, exist_ok=True)
                (base / "package.json").write_text(
                    json.dumps({"name": package_name}) + "\n",
                    encoding="utf-8",
                )
                (base / "bin" / "publish-core.mjs").write_text(
                    "import { existsSync } from 'node:fs';\n"
                    "function runTypeScript(ctx) {\n"
                    "  const packageFile = path.join(ctx.projectDir, 'package.json');\n"
                    "  ensureFile(packageFile, 'package.json');\n"
                    "  const packageJson = loadJson(packageFile);\n"
                    "  const hasBuildScript = Boolean(packageJson?.scripts?.build);\n"
                    "\n"
                    "  if (ctx.action === 'check') {\n"
                    "    run('npm', ['pack', '--dry-run'], { cwd: ctx.projectDir });\n"
                    "    return;\n"
                    "  }\n"
                    "\n"
                    "  run('npm', ['install'], { cwd: ctx.projectDir });\n"
                    "  if (hasBuildScript) {\n"
                    "    run('npm', ['run', 'build'], { cwd: ctx.projectDir });\n"
                    "  } else {\n"
                    "    log('No build script found in package.json, skipping build.');\n"
                    "  }\n"
                    "\n"
                    "  if (ctx.action === 'build') {\n"
                    "    return;\n"
                    "  }\n"
                    "\n"
                    "  run('npm', ['publish'], { cwd: ctx.projectDir });\n"
                    "}\n",
                    encoding="utf-8",
                )

            updated = self.standardizer(root).run()

            for sdk_dir in ("clawrouter-app-sdk", "clawrouter-backend-sdk"):
                publish_core = self.sdk_base(root, sdk_dir) / "bin" / "publish-core.mjs"
                source = publish_core.read_text(encoding="utf-8")
                self.assertNotIn(
                    "if (ctx.action === 'check') {\n"
                    "    run('npm', ['pack', '--dry-run'], { cwd: ctx.projectDir });\n"
                    "    return;\n"
                    "  }\n\n"
                    "  if (!hasTypeScriptSdkDependencies(ctx.projectDir)) {",
                    source,
                )
                self.assertIn(
                    "  if (hasBuildScript) {\n"
                    "    run('npm', ['run', 'build'], { cwd: ctx.projectDir });\n"
                    "  } else {\n"
                    "    log('No build script found in package.json, skipping build.');\n"
                    "  }\n"
                    "\n"
                    "  if (ctx.action === 'check') {\n"
                    "    run('npm', ['pack', '--dry-run'], { cwd: ctx.projectDir });\n"
                    "    return;\n"
                    "  }\n"
                    "\n"
                    "  if (ctx.action === 'build') {",
                    source,
                )
                self.assertIn(publish_core, updated)

    def test_exports_every_generated_type_file_from_type_index(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for sdk_dir, package_name in (
                ("clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk"),
                ("clawrouter-backend-sdk", "@sdkwork/clawrouter-backend-sdk"),
            ):
                base = self.sdk_base(root, sdk_dir)
                (base / "src" / "types").mkdir(parents=True, exist_ok=True)
                (base / "package.json").write_text(
                    json.dumps({"name": package_name}) + "\n",
                    encoding="utf-8",
                )
                (base / "src" / "types" / "index.ts").write_text(
                    "export type { ExistingType } from './existing-type';\n",
                    encoding="utf-8",
                )
                (base / "src" / "types" / "existing-type.ts").write_text(
                    "export interface ExistingType { id: string; }\n",
                    encoding="utf-8",
                )
                (base / "src" / "types" / "admin-skill-item.ts").write_text(
                    "export interface AdminSkillItem { skillKey: string; }\n",
                    encoding="utf-8",
                )

            updated = self.standardizer(root).run()

            for sdk_dir in ("clawrouter-app-sdk", "clawrouter-backend-sdk"):
                index_path = self.sdk_base(root, sdk_dir) / "src" / "types" / "index.ts"
                source = index_path.read_text(encoding="utf-8")
                self.assertIn("export type { ExistingType } from './existing-type';", source)
                self.assertIn("export type { AdminSkillItem } from './admin-skill-item';", source)
                self.assertIn(index_path, updated)

    def test_preserves_generator_manifest_and_ignores_unmanifested_legacy_type_files(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for sdk_dir, package_name in (
                ("clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk"),
                ("clawrouter-backend-sdk", "@sdkwork/clawrouter-backend-sdk"),
            ):
                base = self.sdk_base(root, sdk_dir)
                (base / ".sdkwork").mkdir(parents=True, exist_ok=True)
                (base / "src" / "types").mkdir(parents=True, exist_ok=True)
                (base / "package.json").write_text(
                    json.dumps({"name": package_name}) + "\n",
                    encoding="utf-8",
                )
                (base / "src" / "types" / "index.ts").write_text(
                    "export type { ExistingType } from './existing-type';\n"
                    "export type { LegacyType } from './legacy-type';\n",
                    encoding="utf-8",
                )
                (base / "src" / "types" / "existing-type.ts").write_text(
                    "export interface ExistingType { id: string; }\n",
                    encoding="utf-8",
                )
                (base / "src" / "types" / "legacy-type.ts").write_text(
                    "export interface LegacyType { id: string; }\n",
                    encoding="utf-8",
                )
                (base / ".sdkwork" / "sdkwork-generator-manifest.json").write_text(
                    json.dumps(
                        {
                            "schemaVersion": 1,
                            "generator": "@sdkwork/sdk-generator",
                            "sdk": {
                                "name": sdk_dir,
                                "version": "0.1.0",
                                "language": "typescript",
                                "sdkType": "app" if sdk_dir == "clawrouter-app-sdk" else "backend",
                                "packageName": package_name,
                            },
                            "generatedFiles": [
                                {"path": "src/types/index.ts", "sha256": "index"},
                                {"path": "src/types/existing-type.ts", "sha256": "existing"},
                            ],
                            "scaffoldFiles": ["custom/README.md"],
                            "customRoots": ["custom/"],
                        }
                    )
                    + "\n",
                    encoding="utf-8",
                )

            updated = self.standardizer(root).run()

            for sdk_dir in ("clawrouter-app-sdk", "clawrouter-backend-sdk"):
                base = self.sdk_base(root, sdk_dir)
                manifest = json.loads((base / ".sdkwork" / "sdkwork-generator-manifest.json").read_text(encoding="utf-8"))
                source = (base / "src" / "types" / "index.ts").read_text(encoding="utf-8")

                self.assertEqual("@sdkwork/sdk-generator", manifest["generator"])
                self.assertIn("generatedFiles", manifest)
                self.assertTrue((base / "src" / "types" / "existing-type.ts").exists())
                self.assertFalse((base / "src" / "types" / "legacy-type.ts").exists())
                self.assertIn("export type { ExistingType } from './existing-type';", source)
                self.assertNotIn("legacy-type", source)
                self.assertIn(base / "src" / "types" / "legacy-type.ts", updated)
                self.assertIn(base / "src" / "types" / "index.ts", updated)

    def test_removes_unmanifested_no_data_type_file_and_export(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for sdk_dir, package_name in (
                ("clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk"),
                ("clawrouter-backend-sdk", "@sdkwork/clawrouter-backend-sdk"),
            ):
                base = self.sdk_base(root, sdk_dir)
                (base / ".sdkwork").mkdir(parents=True, exist_ok=True)
                (base / "src" / "types").mkdir(parents=True, exist_ok=True)
                (base / "package.json").write_text(
                    json.dumps({"name": package_name}) + "\n",
                    encoding="utf-8",
                )
                (base / "src" / "types" / "index.ts").write_text(
                    "export type { ExistingType } from './existing-type';\n"
                    "export type { NoData } from './no-data';\n",
                    encoding="utf-8",
                )
                (base / "src" / "types" / "existing-type.ts").write_text(
                    "export interface ExistingType { id: string; }\n",
                    encoding="utf-8",
                )
                (base / "src" / "types" / "no-data.ts").write_text(
                    "export type NoData = Record<string, unknown>;\n",
                    encoding="utf-8",
                )
                (base / ".sdkwork" / "sdkwork-generator-manifest.json").write_text(
                    json.dumps(
                        {
                            "schemaVersion": 1,
                            "generator": "@sdkwork/sdk-generator",
                            "generatedFiles": [
                                {"path": "src/types/index.ts", "sha256": "index"},
                                {"path": "src/types/existing-type.ts", "sha256": "existing"},
                            ],
                        }
                    )
                    + "\n",
                    encoding="utf-8",
                )

            updated = self.standardizer(root).run()

            for sdk_dir in ("clawrouter-app-sdk", "clawrouter-backend-sdk"):
                base = self.sdk_base(root, sdk_dir)
                source = (base / "src" / "types" / "index.ts").read_text(encoding="utf-8")

                self.assertFalse((base / "src" / "types" / "no-data.ts").exists())
                self.assertNotIn("export type { NoData } from './no-data';", source)
                self.assertIn(base / "src" / "types" / "no-data.ts", updated)
                self.assertIn(base / "src" / "types" / "index.ts", updated)

    def test_normalizes_generated_union_array_type_precedence(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for sdk_dir, package_name in (
                ("clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk"),
                ("clawrouter-backend-sdk", "@sdkwork/clawrouter-backend-sdk"),
            ):
                base = self.sdk_base(root, sdk_dir)
                (base / "src" / "types").mkdir(parents=True, exist_ok=True)
                (base / "package.json").write_text(
                    json.dumps({"name": package_name}) + "\n",
                    encoding="utf-8",
                )
                (base / "src" / "types" / "request.ts").write_text(
                    "export interface Request {\n"
                    "  modalities?: 'text' | 'image' | 'video' | 'audio' | 'music'[];\n"
                    "  retryableStatusCodes: 408 | 409 | 425 | 429 | 500 | 502 | 503 | 504[];\n"
                    "  passthrough?: string | null;\n"
                    "  alreadyCorrect?: ('a' | 'b')[];\n"
                    "}\n",
                    encoding="utf-8",
                )

            self.standardizer(root).run()

            for sdk_dir in ("clawrouter-app-sdk", "clawrouter-backend-sdk"):
                source = (self.sdk_base(root, sdk_dir) / "src" / "types" / "request.ts").read_text(encoding="utf-8")
                self.assertIn("modalities?: ('text' | 'image' | 'video' | 'audio' | 'music')[];", source)
                self.assertIn("retryableStatusCodes: (408 | 409 | 425 | 429 | 500 | 502 | 503 | 504)[];", source)
                self.assertIn("passthrough?: string | null;", source)
                self.assertIn("alreadyCorrect?: ('a' | 'b')[];", source)

    def test_standardizes_body_and_url_search_text_to_q(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            base = self.write_minimal_typescript_sdk(
                root,
                "clawrouter-backend-sdk",
                "@sdkwork/clawrouter-backend-sdk",
            )
            (base / "src" / "api").mkdir(parents=True, exist_ok=True)
            (base / "src" / "types").mkdir(parents=True, exist_ok=True)
            (base / "src" / "types" / "common.ts").write_text(
                "export interface QueryListForm {\n"
                "  searchQuery?: string;\n"
                "  status?: string;\n"
                "}\n",
                encoding="utf-8",
            )
            (base / "src" / "types" / "admin-app-list-request.ts").write_text(
                "export interface AdminAppListRequest {\n"
                "  searchQuery?: string;\n"
                "  keyword?: string;\n"
                "  pageNo?: number;\n"
                "}\n",
                encoding="utf-8",
            )
            (base / "src" / "api" / "ai.ts").write_text(
                "export interface AiModelsListParams {\n"
                "  searchQuery?: string;\n"
                "}\n\n"
                "export async function list(params?: AiModelsListParams) {\n"
                "  return [\n"
                "    { name: 'search_query', value: params?.searchQuery, style: 'form', explode: true },\n"
                "  ];\n"
                "}\n",
                encoding="utf-8",
            )

            self.standardizer(root, ("clawrouter-backend-sdk",)).run()

            common_source = (base / "src" / "types" / "common.ts").read_text(encoding="utf-8")
            body_source = (base / "src" / "types" / "admin-app-list-request.ts").read_text(encoding="utf-8")
            api_source = (base / "src" / "api" / "ai.ts").read_text(encoding="utf-8")
            self.assertIn("q?: string;", common_source)
            self.assertNotIn("searchQuery?: string;", common_source)
            self.assertIn("q?: string;", body_source)
            self.assertNotIn("searchQuery?: string;", body_source)
            self.assertNotIn("keyword?: string;", body_source)
            self.assertIn("q?: string;", api_source)
            self.assertIn("{ name: 'q', value: params?.q", api_source)
            self.assertNotIn("search_query", api_source)
            self.assertNotIn("params?.searchQuery", api_source)

    def test_standardizes_api_index_to_export_full_modules_for_parameter_types(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for sdk_dir, package_name, path_export in (
                ("clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk", "appApiPath"),
                ("clawrouter-backend-sdk", "@sdkwork/clawrouter-backend-sdk", "backendApiPath"),
            ):
                base = self.sdk_base(root, sdk_dir)
                (base / "src" / "api").mkdir(parents=True, exist_ok=True)
                (base / "package.json").write_text(
                    json.dumps({"name": package_name}) + "\n",
                    encoding="utf-8",
                )
                (base / "src" / "api" / "index.ts").write_text(
                    "export { BaseApi } from './base';\n"
                    f"export {{ {path_export} }} from './paths';\n"
                    "export { BillingApi, createBillingApi } from './billing';\n"
                    "export { IntegrationApi, createIntegrationApi } from './integration';\n",
                    encoding="utf-8",
                )
                (base / "src" / "api" / "base.ts").write_text("export abstract class BaseApi {}\n", encoding="utf-8")
                (base / "src" / "api" / "paths.ts").write_text(f"export function {path_export}(path: string) {{ return path; }}\n", encoding="utf-8")
                (base / "src" / "api" / "billing.ts").write_text(
                    "export interface BillingListParams { q?: string; }\n"
                    "export class BillingApi {}\n"
                    "export function createBillingApi(): BillingApi { return new BillingApi(); }\n",
                    encoding="utf-8",
                )
                (base / "src" / "api" / "integration.ts").write_text(
                    "export interface IntegrationProviderSecretsListParams { status?: string; }\n"
                    "export class IntegrationApi {}\n"
                    "export function createIntegrationApi(): IntegrationApi { return new IntegrationApi(); }\n",
                    encoding="utf-8",
                )

            updated = self.standardizer(root).run()

            for sdk_dir in ("clawrouter-app-sdk", "clawrouter-backend-sdk"):
                index_path = self.sdk_base(root, sdk_dir) / "src" / "api" / "index.ts"
                source = index_path.read_text(encoding="utf-8")
                self.assertIn("export { BaseApi } from './base';", source)
                self.assertRegex(source, r"export \{ (?:appApiPath|backendApiPath) \} from './paths';")
                self.assertIn("export * from './billing';", source)
                self.assertIn("export * from './integration';", source)
                self.assertNotIn("export { BillingApi, createBillingApi }", source)
                self.assertIn(index_path, updated)

    def test_removes_generated_trailing_whitespace(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for sdk_dir, package_name in (
                ("clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk"),
                ("clawrouter-backend-sdk", "@sdkwork/clawrouter-backend-sdk"),
            ):
                base = self.sdk_base(root, sdk_dir)
                (base / "src" / "api").mkdir(parents=True, exist_ok=True)
                (base / "src" / "http").mkdir(parents=True, exist_ok=True)
                (base / "src" / "types").mkdir(parents=True, exist_ok=True)
                (base / "package.json").write_text(
                    json.dumps({"name": package_name}) + "\n",
                    encoding="utf-8",
                )
                (base / "src" / "api" / "index.ts").write_text(
                    "export { ExampleApi } from './example';\n",
                    encoding="utf-8",
                )
                (base / "src" / "api" / "example.ts").write_text(
                    "export class ExampleApi { \n  constructor() { \n  } \n}\n",
                    encoding="utf-8",
                )
                (base / "src" / "http" / "client.ts").write_text(
                    "export class HttpClient { \n}\n",
                    encoding="utf-8",
                )

            self.standardizer(root).run()

            for sdk_dir in ("clawrouter-app-sdk", "clawrouter-backend-sdk"):
                base = self.sdk_base(root, sdk_dir)
                for relative in ("src/api/example.ts", "src/http/client.ts"):
                    source = (base / relative).read_text(encoding="utf-8")
                    self.assertNotRegex(source, r"[ \t]+(?=\n)")

    def test_removes_generated_language_transport_trailing_whitespace(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generated_files: list[Path] = []
            for sdk_dir, package_name in (
                ("clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk"),
                ("clawrouter-backend-sdk", "@sdkwork/clawrouter-backend-sdk"),
            ):
                self.write_minimal_typescript_sdk(root, sdk_dir, package_name)
                language_root = root / "sdks" / sdk_dir / f"{sdk_dir}-java" / "generated" / "server-openapi"
                for relative in ("README.md", "src/main/java/com/sdkwork/Example.java"):
                    generated_file = language_root / relative
                    generated_file.parent.mkdir(parents=True, exist_ok=True)
                    generated_file.write_text("class Example {    \n\t\n}\n", encoding="utf-8")
                    generated_files.append(generated_file)

            updated = self.standardizer(root).run()

            for generated_file in generated_files:
                self.assertIn(generated_file, updated)
                source = generated_file.read_text(encoding="utf-8")
                self.assertNotRegex(source, r"[ \t]+(?=\n)")

    def test_preserves_exported_router_api_artifacts(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for sdk_dir, package_name in (
                ("clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk"),
                ("clawrouter-backend-sdk", "@sdkwork/clawrouter-backend-sdk"),
            ):
                base = self.sdk_base(root, sdk_dir)
                (base / "src" / "api").mkdir(parents=True, exist_ok=True)
                (base / "dist" / "api").mkdir(parents=True, exist_ok=True)
                (base / "package.json").write_text(
                    json.dumps({"name": package_name}) + "\n",
                    encoding="utf-8",
                )
                (base / "src" / "api" / "index.ts").write_text(
                    "export { RouterApi } from './router';\n",
                    encoding="utf-8",
                )
                (base / "src" / "api" / "router.ts").write_text(
                    "export class RouterApi {}\n",
                    encoding="utf-8",
                )
                (base / "dist" / "api" / "router.d.ts").write_text(
                    "export declare class RouterApi {}\n",
                    encoding="utf-8",
                )
                (base / "dist" / "api" / "router.d.ts.map").write_text(
                    "{}\n",
                    encoding="utf-8",
                )

            updated = self.standardizer(root).run()

            for sdk_dir in ("clawrouter-app-sdk", "clawrouter-backend-sdk"):
                base = self.sdk_base(root, sdk_dir)
                self.assertTrue((base / "src" / "api" / "router.ts").exists())
                self.assertTrue((base / "dist" / "api" / "router.d.ts").exists())
                self.assertTrue((base / "dist" / "api" / "router.d.ts.map").exists())
                self.assertNotIn(base / "src" / "api" / "router.ts", updated)
                self.assertNotIn(base / "dist" / "api" / "router.d.ts", updated)

    def test_removes_unexported_generated_api_artifacts(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for sdk_dir, package_name, exported_name, stale_name in (
                ("clawrouter-app-sdk", "@sdkwork/clawrouter-app-sdk", "coupons", "coupon"),
                ("clawrouter-backend-sdk", "@sdkwork/clawrouter-backend-sdk", "provider-secrets", "provider-secret"),
            ):
                base = self.sdk_base(root, sdk_dir)
                (base / "src" / "api").mkdir(parents=True, exist_ok=True)
                (base / "dist" / "api").mkdir(parents=True, exist_ok=True)
                (base / "package.json").write_text(
                    json.dumps({"name": package_name}) + "\n",
                    encoding="utf-8",
                )
                (base / "src" / "api" / "index.ts").write_text(
                    f"export {{ ExampleApi }} from './{exported_name}';\n",
                    encoding="utf-8",
                )
                for name in ("base", "paths", exported_name, stale_name):
                    (base / "src" / "api" / f"{name}.ts").write_text(
                        "export {};\n",
                        encoding="utf-8",
                    )
                    (base / "dist" / "api" / f"{name}.d.ts").write_text(
                        "export {};\n",
                        encoding="utf-8",
                    )
                    (base / "dist" / "api" / f"{name}.d.ts.map").write_text(
                        "{}\n",
                        encoding="utf-8",
                    )

            self.standardizer(root).run()

            for sdk_dir, exported_name, stale_name in (
                ("clawrouter-app-sdk", "coupons", "coupon"),
                ("clawrouter-backend-sdk", "provider-secrets", "provider-secret"),
            ):
                base = self.sdk_base(root, sdk_dir)
                self.assertTrue((base / "src" / "api" / f"{exported_name}.ts").exists())
                self.assertTrue((base / "dist" / "api" / f"{exported_name}.d.ts").exists())
                self.assertFalse((base / "src" / "api" / f"{stale_name}.ts").exists())
                self.assertFalse((base / "dist" / "api" / f"{stale_name}.d.ts").exists())
                self.assertFalse((base / "dist" / "api" / f"{stale_name}.d.ts.map").exists())


class ClawRouterAppSdkIamOwnerOperationsTest(unittest.TestCase):
    def test_owner_only_openapi_keeps_clawrouter_user_settings_operations(self) -> None:
        from tools.clawrouter_sdk_runtime_standardizer import SdkRuntimeStandardizer

        root = Path(__file__).resolve().parents[1]
        authority = json.loads(
            (
                root
                / "sdks"
                / "clawrouter-app-sdk"
                / "openapi"
                / "clawrouter-app-sdk.openapi.json"
            ).read_text(encoding="utf-8")
        )
        paths = authority.get("paths")
        self.assertIsInstance(paths, dict)
        settings_path = paths.get("/app/v3/api/iam/users/settings")
        self.assertIsInstance(settings_path, dict)
        self.assertIn("get", settings_path)
        self.assertIn("put", settings_path)
        self.assertEqual(
            settings_path["get"].get("operationId"),
            "users.settings.retrieve",
        )
        self.assertEqual(
            settings_path["put"].get("operationId"),
            "users.settings.update",
        )

        generated = json.loads(
            (
                root / "generated" / "openapi" / "clawrouter-app-openapi.json"
            ).read_text(encoding="utf-8")
        )
        owner_only = SdkRuntimeStandardizer(root=root)._owner_only_openapi_payload(
            "clawrouter-app-sdk",
            generated,
        )
        owner_paths = owner_only.get("paths")
        self.assertIsInstance(owner_paths, dict)
        self.assertIn("/app/v3/api/iam/users/settings", owner_paths)


if __name__ == "__main__":
    unittest.main()
