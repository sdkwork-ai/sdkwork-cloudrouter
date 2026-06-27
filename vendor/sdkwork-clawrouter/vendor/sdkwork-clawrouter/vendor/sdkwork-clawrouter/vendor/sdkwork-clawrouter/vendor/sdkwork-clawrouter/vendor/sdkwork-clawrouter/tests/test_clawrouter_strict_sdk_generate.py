import json
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class ClawRouterStrictSdkGenerateTest(unittest.TestCase):
    def write_openapi(self, root: Path) -> Path:
        spec_path = root / "openapi.json"
        spec_path.write_text(
            json.dumps(
                {
                    "openapi": "3.0.3",
                    "info": {"title": "Strict SDK Test", "version": "0.1.0"},
                    "servers": [{"url": "http://localhost:18082"}],
                    "paths": {
                        "/app/v3/api/session": {
                            "post": {
                                "operationId": "createAppSession",
                                "tags": ["session"],
                                "requestBody": {
                                    "required": False,
                                    "content": {
                                        "application/json": {
                                            "schema": {"$ref": "#/components/schemas/CreateAppSessionRequest"}
                                        }
                                    },
                                },
                                "responses": {
                                    "200": {
                                        "description": "OK",
                                        "content": {
                                            "application/json": {
                                                "schema": {"$ref": "#/components/schemas/CreateAppSessionResult"}
                                            }
                                        },
                                    }
                                },
                            }
                        },
                        "/app/v3/api/content/forum/attachments": {
                            "post": {
                                "operationId": "forum.attachments.create",
                                "tags": ["content"],
                                "x-sdkwork-resource": "forum.attachments",
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
                                "responses": {
                                    "200": {
                                        "description": "OK",
                                        "content": {
                                            "application/json": {
                                                "schema": {
                                                    "$ref": "#/components/schemas/ApplicationsVideosCreateResult"
                                                }
                                            }
                                        },
                                    }
                                },
                            }
                        }
                    },
                    "components": {
                        "schemas": {
                            "NoData": {
                                "type": "object",
                                "additionalProperties": False,
                                "properties": {},
                            },
                            "PlusApiResult": {
                                "description": "Base Claw Router response envelope.",
                                "type": "object",
                                "additionalProperties": False,
                                "required": ["code"],
                                "properties": {
                                    "code": {"type": "string"},
                                    "message": {"type": "string"},
                                    "data": {
                                        "allOf": [{"$ref": "#/components/schemas/NoData"}],
                                        "description": "Default empty data payload for the base response envelope.",
                                    },
                                },
                            },
                            "CreateAppSessionRequest": {
                                "description": "Explicit empty request body for create app session.",
                                "type": "object",
                                "additionalProperties": False,
                                "properties": {},
                            },
                            "CreateAppSessionResponse": {
                                "type": "object",
                                "additionalProperties": False,
                                "required": ["token"],
                                "properties": {"token": {"type": "string"}},
                            },
                            "CreateAppSessionResult": {
                                "type": "object",
                                "additionalProperties": False,
                                "required": ["code"],
                                "properties": {
                                    "code": {"type": "string"},
                                    "message": {"type": "string"},
                                    "data": {"$ref": "#/components/schemas/CreateAppSessionResponse"},
                                },
                            },
                            "DeleteSessionResult": {
                                "description": "Delete session result schema exposed by Claw Router.",
                                "type": "object",
                                "additionalProperties": False,
                                "required": ["code"],
                                "properties": {
                                    "code": {"type": "string"},
                                    "message": {"type": "string"},
                                    "data": {
                                        "allOf": [{"$ref": "#/components/schemas/NoData"}],
                                        "description": "No business data returned by this operation.",
                                    },
                                },
                            },
                            "AdminApiKeyItem": {
                                "type": "object",
                                "additionalProperties": False,
                                "required": ["id", "name"],
                                "properties": {
                                    "id": {"type": "integer", "format": "int64"},
                                    "name": {"type": "string"},
                                },
                            },
                            "AdminApiKeysMapResponse": {
                                "description": "Admin api keys map response schema exposed by Claw Router.",
                                "type": "object",
                                "additionalProperties": {
                                    "type": "array",
                                    "items": {"$ref": "#/components/schemas/AdminApiKeyItem"},
                                },
                                "properties": {},
                            },
                            "OpenMetadata": {
                                "type": "object",
                                "additionalProperties": True,
                            },
                            "ForumAttachmentUploadRequest": {
                                "type": "object",
                                "additionalProperties": False,
                                "required": ["file"],
                                "properties": {
                                    "file": {"type": "string", "format": "binary"},
                                },
                            },
                            "ForumAttachmentUploadResponse": {
                                "type": "object",
                                "additionalProperties": False,
                                "required": ["attachment", "sha256"],
                                "properties": {
                                    "attachment": {"$ref": "#/components/schemas/MediaResource"},
                                    "sha256": {"type": "string"},
                                },
                            },
                            "MediaResource": {
                                "type": "object",
                                "additionalProperties": False,
                                "required": ["kind", "source"],
                                "properties": {
                                    "kind": {"type": "string"},
                                    "source": {"type": "string"},
                                    "uri": {"type": "string"},
                                },
                            },
                            "ForumAttachmentsCreateResult": {
                                "type": "object",
                                "additionalProperties": False,
                                "required": ["code"],
                                "properties": {
                                    "code": {"type": "string"},
                                    "message": {"type": "string"},
                                    "data": {
                                        "$ref": "#/components/schemas/ForumAttachmentUploadResponse"
                                    },
                                },
                            },
                        }
                    },
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        return spec_path

    def test_dry_run_strict_generation_removes_page_result_and_closes_empty_dtos(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            temp_root = Path(tmp)
            output = temp_root / "sdk"
            spec_path = self.write_openapi(temp_root)

            completed = subprocess.run(
                [
                    "node",
                    "tools/clawrouter_strict_sdk_generate.mjs",
                    "generate",
                    "-i",
                    str(spec_path),
                    "-o",
                    str(output),
                    "-n",
                    "clawrouter-app-sdk",
                    "-t",
                    "app",
                    "-l",
                    "typescript",
                    "--base-url",
                    "http://localhost:18082",
                    "--api-prefix",
                    "/app/v3/api",
                    "--package-name",
                    "@sdkwork/clawrouter-app-sdk",
                    "--fixed-sdk-version",
                    "0.1.0",
                    "--no-sync-published-version",
                    "--dry-run",
                    "--json",
                ],
                cwd=ROOT,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

            self.assertEqual(completed.returncode, 0, completed.stderr)
            payload = json.loads(completed.stdout)
            files = {file["path"]: file["content"] for file in payload["files"]}

            self.assertIn("src/types/common.ts", files)
            self.assertIn(
                "export type { Page, RequestConfig, RequestOptions, QueryParams } from '@sdkwork/sdk-common';",
                files["src/types/common.ts"],
            )
            self.assertNotIn("PageResult", files["src/types/common.ts"])
            self.assertIn("  q?: string;", files["src/types/common.ts"])
            self.assertNotIn("searchQuery?: string;", files["src/types/common.ts"])
            self.assertNotIn("search_query?: string;", files["src/types/common.ts"])
            self.assertNotIn("keyword?: string;", files["src/types/common.ts"])
            self.assertNotIn("search?: string;", files["src/types/common.ts"])

            self.assertIn("src/types/create-app-session-request.ts", files)
            self.assertIn(
                "export type CreateAppSessionRequest = Record<string, never>;",
                files["src/types/create-app-session-request.ts"],
            )
            self.assertNotIn("Record<string, unknown>", files["src/types/create-app-session-request.ts"])

            self.assertNotIn("src/types/no-data.ts", files)
            self.assertNotIn("from './no-data'", files["src/types/index.ts"])

            self.assertIn("src/types/delete-session-result.ts", files)
            self.assertNotIn("NoData", files["src/types/delete-session-result.ts"])
            self.assertIn("data?: never;", files["src/types/delete-session-result.ts"])

            self.assertIn("src/types/plus-api-result.ts", files)
            self.assertNotIn("NoData", files["src/types/plus-api-result.ts"])
            self.assertIn("data?: never;", files["src/types/plus-api-result.ts"])

            self.assertIn("src/types/admin-api-keys-map-response.ts", files)
            self.assertIn(
                "export interface AdminApiKeysMapResponse {\n  [key: string]: AdminApiKeyItem[];\n}",
                files["src/types/admin-api-keys-map-response.ts"],
            )
            self.assertIn("id: string;", files["src/types/admin-api-key-item.ts"])
            self.assertNotIn("id: number;", files["src/types/admin-api-key-item.ts"])
            self.assertNotIn(
                "export type AdminApiKeysMapResponse = Record<string, AdminApiKeyItem[]>;",
                files["src/types/admin-api-keys-map-response.ts"],
            )

            self.assertIn("src/types/open-metadata.ts", files)
            self.assertIn("export type OpenMetadata = Record<string, unknown>;", files["src/types/open-metadata.ts"])

            multipart_api_source = "\n".join(
                content for path, content in files.items() if path.startswith("src/api/") and "multipart/form-data" in content
            )
            self.assertIn(
                "async forumAttachmentsCreate(body: " + "ForumAttachmentUploadRequest)",
                multipart_api_source,
            )
            self.assertNotIn(
                "async forumAttachmentsCreate(body: FormData)",
                multipart_api_source,
            )
            self.assertIn("src/types/media-resource.ts", files)
            upload_response_source = files["src/types/forum-attachment-upload-response.ts"]
            self.assertIn("import type { MediaResource } from './media-resource';", upload_response_source)
            self.assertIn("attachment: MediaResource;", upload_response_source)
            self.assertNotIn("attachment" + "Url", upload_response_source)

            self.assertIn("src/api/index.ts", files)
            self.assertIn("export { BaseApi } from './base';", files["src/api/index.ts"])
            self.assertIn("export { appApiPath } from './paths';", files["src/api/index.ts"])
            self.assertIn("export * from './forum';", files["src/api/index.ts"])
            self.assertIn("export * from './session';", files["src/api/index.ts"])
            self.assertNotIn("export { ContentApi, createContentApi }", files["src/api/index.ts"])

    def test_sdkwork_v3_uses_sdk_domain_as_top_level_resource_surface(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            temp_root = Path(tmp)
            output = temp_root / "sdk"
            spec_path = self.write_openapi(temp_root)
            spec = json.loads(spec_path.read_text(encoding="utf-8"))
            spec["paths"] = {
                "/backend/v3/api/storage/providers": {
                    "get": {
                        "operationId": "oss.providers.list",
                        "tags": ["storage"],
                        "x-sdk-domain": "oss",
                        "x-sdkwork-domain": "oss",
                        "x-sdkwork-resource": "oss.providers",
                        "responses": {
                            "200": {
                                "description": "OK",
                                "content": {
                                    "application/json": {
                                        "schema": {"$ref": "#/components/schemas/OssProvidersListResult"}
                                    }
                                },
                            }
                        },
                        "security": [{"AuthToken": [], "AccessToken": []}],
                    }
                }
            }
            spec["components"]["securitySchemes"] = {
                "AuthToken": {"type": "http", "scheme": "bearer"},
                "AccessToken": {"type": "apiKey", "in": "header", "name": "Access-Token"},
            }
            spec["components"]["schemas"] = {
                "StorageProviderListResponse": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["items"],
                    "properties": {"items": {"type": "array", "items": {"type": "object"}}},
                },
                "OssProvidersListResult": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["code"],
                    "properties": {
                        "code": {"type": "string"},
                        "message": {"type": "string"},
                        "data": {"$ref": "#/components/schemas/StorageProviderListResponse"},
                    },
                },
            }
            spec_path.write_text(json.dumps(spec, indent=2) + "\n", encoding="utf-8")

            completed = subprocess.run(
                [
                    "node",
                    "tools/clawrouter_strict_sdk_generate.mjs",
                    "generate",
                    "-i",
                    str(spec_path),
                    "-o",
                    str(output),
                    "-n",
                    "clawrouter-backend-sdk",
                    "-t",
                    "backend",
                    "-l",
                    "typescript",
                    "--base-url",
                    "http://localhost:18081",
                    "--api-prefix",
                    "/backend/v3/api",
                    "--package-name",
                    "@sdkwork/clawrouter-backend-sdk",
                    "--fixed-sdk-version",
                    "0.1.0",
                    "--no-sync-published-version",
                    "--standard-profile",
                    "sdkwork-v3",
                    "--dry-run",
                    "--json",
                ],
                cwd=ROOT,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

            self.assertEqual(completed.returncode, 0, completed.stderr)
            payload = json.loads(completed.stdout)
            files = {file["path"]: file["content"] for file in payload["files"]}

            self.assertIn("src/api/oss.ts", files)
            self.assertIn("import { OssApi, createOssApi } from './api/oss';", files["src/sdk.ts"])
            self.assertIn("public readonly oss: OssApi;", files["src/sdk.ts"])
            self.assertIn("this.oss = createOssApi(this.httpClient);", files["src/sdk.ts"])
            self.assertIn("public readonly providers: OssProvidersApi;", files["src/api/oss.ts"])
            self.assertIn("async list(", files["src/api/oss.ts"])
            self.assertNotIn("objectStorage", files["src/api/oss.ts"])
            self.assertNotIn("public readonly oss: StorageApi;", files["src/sdk.ts"])
            self.assertNotIn("public readonly oss: OssOssApi;", files["src/api/oss.ts"])

    def test_apply_generation_runs_project_runtime_standardizer(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            temp_root = Path(tmp)
            family = temp_root / "sdks" / "clawrouter-app-sdk"
            output = family / "clawrouter-app-sdk-typescript"
            spec_path = self.write_openapi(temp_root)

            completed = subprocess.run(
                [
                    "node",
                    "tools/clawrouter_strict_sdk_generate.mjs",
                    "generate",
                    "-i",
                    str(spec_path),
                    "-o",
                    str(output),
                    "-n",
                    "clawrouter-app-sdk",
                    "-t",
                    "app",
                    "-l",
                    "typescript",
                    "--base-url",
                    "http://localhost:18082",
                    "--api-prefix",
                    "/app/v3/api",
                    "--package-name",
                    "@sdkwork/clawrouter-app-sdk",
                    "--fixed-sdk-version",
                    "0.1.0",
                    "--no-sync-published-version",
                ],
                cwd=ROOT,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

            self.assertEqual(completed.returncode, 0, completed.stderr)

            package = json.loads((output / "package.json").read_text(encoding="utf-8"))
            self.assertEqual("node custom/build-runtime.mjs", package["scripts"]["build"])
            self.assertEqual("node custom/build-runtime.mjs", package["scripts"]["dev"])
            self.assertEqual("npm run build", package["scripts"]["prepublishOnly"])
            self.assertEqual("^1.0.2", package["dependencies"]["@sdkwork/sdk-common"])
            self.assertEqual("20.19.39", package["devDependencies"]["@types/node"])
            self.assertEqual("5.8.3", package["devDependencies"]["typescript"])
            self.assertEqual("4.60.1", package["devDependencies"]["rollup"])
            self.assertNotIn("vite", package["devDependencies"])
            self.assertNotIn("vite-plugin-dts", package["devDependencies"])

            build_runtime = output / "custom" / "build-runtime.mjs"
            self.assertTrue(build_runtime.is_file())
            build_runtime_source = build_runtime.read_text(encoding="utf-8")
            self.assertIn("await removeTypeOnlyRuntimeReExports(path.join(tempEsmDir, 'index.js'));", build_runtime_source)
            self.assertIn("async function removeTypeOnlyRuntimeReExports(entryFile) {", build_runtime_source)
            self.assertIn("line.trim() === \"export * from './types';\"", build_runtime_source)
            self.assertIn("source.split(/\\r?\\n/u)", build_runtime_source)
            self.assertIn("runtimeLines.join('\\n')", build_runtime_source)
            self.assertTrue((family / "README.md").is_file())
            self.assertTrue((family / ".sdkwork-assembly.json").is_file())
            self.assertTrue((family / "openapi" / "clawrouter-app-sdk.openapi.json").is_file())
            self.assertTrue((family / "openapi" / "clawrouter-app-sdk.sdkgen.json").is_file())
            self.assertTrue((family / "bin" / "generate-sdk.mjs").is_file())
            self.assertTrue((family / "bin" / "verify-sdk.mjs").is_file())
            self.assertTrue((family / "tests" / "sdk-family-smoke.test.mjs").is_file())

            assembly = json.loads((family / ".sdkwork-assembly.json").read_text(encoding="utf-8"))
            self.assertEqual("clawrouter-app-sdk", assembly["workspace"])
            self.assertEqual("clawrouter-app-sdk-typescript", assembly["languages"][0]["workspace"])
            publish_core = (output / "bin" / "publish-core.mjs").read_text(encoding="utf-8")
            self.assertIn("function hasTypeScriptSdkDependencies(projectDir) {", publish_core)
            self.assertIn("if (!hasTypeScriptSdkDependencies(ctx.projectDir)) {", publish_core)
            self.assertIn("run('npm', ['install', '--ignore-scripts'], { cwd: ctx.projectDir });", publish_core)
            self.assertNotIn("run('npm', ['install'], { cwd: ctx.projectDir });", publish_core)

            repeated = subprocess.run(
                completed.args,
                cwd=ROOT,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

            self.assertEqual(repeated.returncode, 0, repeated.stderr)
            self.assertIn("Written files: 0", repeated.stdout)

    def test_open_sdk_apply_generation_preserves_authority_openapi_snapshot(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            temp_root = Path(tmp)
            family = temp_root / "sdks" / "clawrouter-open-sdk"
            output = family / "clawrouter-open-sdk-typescript"
            authority_source = temp_root / "apps" / "sdkwork-clawrouter-pc" / "public" / "openapi.json"
            authority_source.parent.mkdir(parents=True, exist_ok=True)
            authority_spec_path = self.write_openapi(temp_root)
            authority = json.loads(authority_spec_path.read_text(encoding="utf-8"))
            sdkgen = json.loads(json.dumps(authority))
            sdkgen["x-sdkwork-derived-contract"] = {
                "source": "authority-openapi",
                "purpose": "sdk-generator-input",
            }
            authority_source.write_text(json.dumps(authority, indent=2) + "\n", encoding="utf-8")
            sdkgen_path = family / "openapi" / "clawrouter-open-sdk.sdkgen.json"
            sdkgen_path.parent.mkdir(parents=True, exist_ok=True)
            sdkgen_path.write_text(json.dumps(sdkgen, indent=2) + "\n", encoding="utf-8")

            completed = subprocess.run(
                [
                    "node",
                    "tools/clawrouter_strict_sdk_generate.mjs",
                    "generate",
                    "-i",
                    str(sdkgen_path),
                    "-o",
                    str(output),
                    "-n",
                    "clawrouter-open-sdk",
                    "-t",
                    "ai",
                    "-l",
                    "typescript",
                    "--base-url",
                    "http://localhost:18082",
                    "--api-prefix",
                    "/v1",
                    "--package-name",
                    "@sdkwork/clawrouter-open-sdk",
                    "--fixed-sdk-version",
                    "0.1.0",
                    "--no-sync-published-version",
                ],
                cwd=ROOT,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

            self.assertEqual(completed.returncode, 0, completed.stderr)

            family_authority = json.loads(
                (family / "openapi" / "clawrouter-open-sdk.openapi.json").read_text(encoding="utf-8")
            )
            family_sdkgen = json.loads(
                (family / "openapi" / "clawrouter-open-sdk.sdkgen.json").read_text(encoding="utf-8")
            )

            self.assertEqual(authority, family_authority)
            self.assertNotIn("x-sdkwork-derived-contract", family_authority)
            self.assertIn("x-sdkwork-derived-contract", family_sdkgen)

    def test_generates_agent_run_step_usage_fact_metadata_user_id(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            temp_root = Path(tmp)
            output = temp_root / "sdk"
            spec_path = self.write_openapi(temp_root)

            spec = json.loads(spec_path.read_text(encoding="utf-8"))
            spec["paths"]["/app/v3/api/agents/runs/{runId}/steps/{stepId}/complete"] = {
                "post": {
                    "operationId": "agentRunSteps.submit",
                    "tags": ["agents"],
                    "x-sdkwork-resource": "agentRunSteps",
                    "parameters": [
                        {
                            "name": "runId",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                        },
                        {
                            "name": "stepId",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                        },
                    ],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "additionalProperties": False,
                                    "required": ["status"],
                                    "properties": {"status": {"type": "string"}},
                                }
                            }
                        },
                    },
                    "responses": {
                        "200": {
                            "description": "OK",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "$ref": "#/components/schemas/AgentRunStepMeteringEvent"
                                    }
                                }
                            },
                        }
                    },
                }
            }
            spec["components"]["schemas"]["AgentRunStepUsageFactMetadata"] = {
                "type": "object",
                "additionalProperties": False,
                "required": [
                    "agentId",
                    "agentVersionId",
                    "runId",
                    "stepId",
                    "userId",
                    "meteringSource",
                ],
                "properties": {
                    "agentId": {"type": "string"},
                    "agentVersionId": {"type": "string"},
                    "runId": {"type": "string"},
                    "stepId": {"type": "string"},
                    "userId": {"type": "string"},
                    "skillId": {"type": ["string", "null"]},
                    "mcpServerId": {"type": ["string", "null"]},
                    "toolId": {"type": ["string", "null"]},
                    "meteringSource": {"type": "string", "enum": ["agent-runtime"]},
                },
            }
            spec["components"]["schemas"]["AgentRunStepMeteringEvent"] = {
                "type": "object",
                "additionalProperties": False,
                "required": ["type", "quantity", "usageFactMetadata"],
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": [
                            "token",
                            "image",
                            "video",
                            "audio",
                            "tool",
                            "mcp",
                            "skill",
                            "storage",
                            "network",
                        ],
                    },
                    "quantity": {"type": "string"},
                    "usageFactMetadata": {
                        "$ref": "#/components/schemas/AgentRunStepUsageFactMetadata"
                    },
                },
            }
            spec_path.write_text(json.dumps(spec, indent=2) + "\n", encoding="utf-8")

            completed = subprocess.run(
                [
                    "node",
                    "tools/clawrouter_strict_sdk_generate.mjs",
                    "generate",
                    "-i",
                    str(spec_path),
                    "-o",
                    str(output),
                    "-n",
                    "clawrouter-app-sdk",
                    "-t",
                    "app",
                    "-l",
                    "typescript",
                    "--base-url",
                    "http://localhost:18082",
                    "--api-prefix",
                    "/app/v3/api",
                    "--package-name",
                    "@sdkwork/clawrouter-app-sdk",
                    "--fixed-sdk-version",
                    "0.1.0",
                    "--no-sync-published-version",
                    "--dry-run",
                    "--json",
                ],
                cwd=ROOT,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

            self.assertEqual(completed.returncode, 0, completed.stderr)
            payload = json.loads(completed.stdout)
            files = {file["path"]: file["content"] for file in payload["files"]}

            self.assertIn("src/types/agent-run-step-usage-fact-metadata.ts", files)
            self.assertIn("userId: string;", files["src/types/agent-run-step-usage-fact-metadata.ts"])
            self.assertIn(
                "usageFactMetadata: AgentRunStepUsageFactMetadata;",
                files["src/types/agent-run-step-metering-event.ts"],
            )


if __name__ == "__main__":
    unittest.main()
