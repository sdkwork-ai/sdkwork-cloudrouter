import json
import re
import tempfile
import unittest
from pathlib import Path

from tools.clawrouter_gateway_openapi_generator import (
    ClawRouterGatewayOpenApiGenerator,
    VENDOR_PROVIDER_PREFIXES,
    audit_vendor_schema_quality,
)


class ClawRouterGatewayOpenApiGeneratorTest(unittest.TestCase):
    def assertSchemaRef(self, schema: dict[str, object], expected_ref: str) -> None:
        self.assertEqual({"$ref": expected_ref}, schema)

    def assertDescribedSchemaRef(self, schema: dict[str, object], expected_ref: str) -> None:
        self.assertEqual([{"$ref": expected_ref}], schema.get("allOf"))
        self.assertIsInstance(schema.get("description"), str)
        self.assertNotEqual("", schema.get("description", "").strip())
        self.assertNotIn("$ref", schema)

    def test_generates_gateway_standard_openapi_contract(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = ClawRouterGatewayOpenApiGenerator(root=root).generate()

            self.assertEqual("3.0.3", spec["openapi"])
            self.assertEqual("Claw Router Open API", spec["info"]["title"])
            self.assertEqual("/v1", spec["x-api-prefix"])
            self.assertNotIn("x-provider-passthrough", spec)

            for path in [
                "/v1/models",
                "/v1/models/{model}",
                "/v1/completions",
                "/v1/moderations",
                "/v1/chat/completions",
                "/v1/responses",
                "/v1/responses/input_tokens",
                "/v1/responses/compact",
                "/v1/responses/{response_id}/cancel",
                "/v1/responses/{response_id}/input_items",
                "/v1/embeddings",
                "/v1/images/generations",
                "/v1/videos",
                "/v1/videos/characters",
                "/v1/videos/characters/{character_id}",
                "/v1/videos/edits",
                "/v1/videos/extensions",
                "/v1/videos/{video_id}",
                "/v1/videos/{video_id}/content",
                "/v1/audio/speech",
                "/v1/audio/voices",
                "/v1/audio/voice_consents",
                "/v1/audio/voice_consents/{consent_id}",
                "/v1/files",
                "/v1/vector_stores",
                "/v1/vector_stores/{vector_store_id}/search",
                "/v1/vector_stores/{vector_store_id}/files",
                "/v1/vector_stores/{vector_store_id}/file_batches",
                "/v1/vector_stores/{vector_store_id}/file_batches/{batch_id}/cancel",
                "/v1/assistants",
                "/v1/threads",
                "/v1/threads/runs",
                "/v1/threads/{thread_id}/messages/{message_id}",
                "/v1/threads/{thread_id}/runs/{run_id}/steps",
                "/v1/batches",
                "/v1/batches/{batch_id}/cancel",
                "/v1/conversations",
                "/v1/conversations/{conversation_id}",
                "/v1/conversations/{conversation_id}/items",
                "/v1/conversations/{conversation_id}/items/{item_id}",
                "/v1/containers",
                "/v1/containers/{container_id}",
                "/v1/containers/{container_id}/files",
                "/v1/containers/{container_id}/files/{file_id}",
                "/v1/containers/{container_id}/files/{file_id}/content",
                "/v1/uploads",
                "/v1/realtime/client_secrets",
                "/v1/realtime/calls",
                "/v1/realtime/calls/{call_id}/accept",
                "/v1/realtime/calls/{call_id}/hangup",
                "/v1/realtime/calls/{call_id}/refer",
                "/v1/realtime/calls/{call_id}/reject",
                "/v1/realtime/sessions",
                "/v1/realtime/translations",
                "/google/v1beta/models/{model}:generateContent",
                "/google/v1beta/models/{model}:streamGenerateContent",
                "/google/v1beta/models/{model}:embedContent",
                "/google/v1beta/models/{model}:batchEmbedContents",
                "/google/v1beta/models/{model}:countTokens",
                "/anthropic/v1/messages",
                "/anthropic/v1/messages/count_tokens",
                "/volcengine/api/v3/contents/generations/tasks",
                "/suno/v1/music/generations",
                "/midjourney/v1/images/generations",
                "/kling/v1/videos/generations",
                "/vidu/ent/v2/text2video",
                "/vidu/ent/v2/img2video",
                "/vidu/ent/v2/reference2video",
                "/vidu/ent/v2/start-end2video",
                "/vidu/ent/v2/reference2image",
                "/vidu/ent/v2/tasks/{task_id}/creations",
                "/nano-banana/v1/images/generations",
            ]:
                self.assertIn(path, spec["paths"])

            self.assertNotIn("delete", spec["paths"]["/v1/models/{model}"])

            operation = spec["paths"]["/google/v1beta/models/{model}:generateContent"]["post"]
            self.assertEqual(["Chat/google"], operation["tags"])
            self.assertEqual(
                ["Chat/google"],
                spec["paths"]["/google/v1beta/models/{model}:streamGenerateContent"]["post"]["tags"],
            )
            self.assertEqual(
                ["Chat/google"],
                spec["paths"]["/google/v1beta/models/{model}:countTokens"]["post"]["tags"],
            )
            self.assertNotIn("x-provider", operation)
            self.assertNotIn("x-passthrough", operation)
            self.assertEqual(
                {"$ref": "#/components/schemas/OpenAiErrorEnvelope"},
                operation["responses"]["501"]["content"]["application/json"]["schema"],
            )
            self.assertNotIn("/google/{path}", spec["paths"])
            self.assertNotIn("/vidu/{path}", spec["paths"])

    def test_public_openai_surface_excludes_provider_control_plane_operations(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            forbidden_paths = {
                "/v1/organization/costs",
                "/v1/organization/usage/completions",
                "/v1/organization/audit_logs",
                "/v1/organization/admin_api_keys",
                "/v1/organization/users",
                "/v1/organization/certificates",
                "/v1/organization/projects",
                "/v1/projects/{project_id}/roles",
                "/v1/fine_tuning/jobs",
                "/v1/evals",
                "/v1/skills",
            }
            self.assertEqual(set(), forbidden_paths.intersection(spec["paths"]))
            self.assertNotIn("Administration", {tag["name"] for tag in spec["tags"]})
            forbidden_schemas = {
                "OpenAiOrganizationAdminApiKey",
                "OpenAiOrganizationAuditLog",
                "OpenAiProjectApiKey",
                "OpenAiFineTuningJob",
                "OpenAiEval",
                "OpenAiSkill",
            }
            self.assertEqual(
                set(),
                forbidden_schemas.intersection(spec["components"]["schemas"]),
            )

            retained_operations = {
                ("get", "/v1/models"),
                ("post", "/v1/chat/completions"),
                ("post", "/v1/responses"),
                ("post", "/v1/embeddings"),
                ("post", "/v1/images/generations"),
                ("post", "/v1/audio/speech"),
                ("post", "/v1/videos"),
                ("post", "/v1/batches"),
                ("post", "/v1/files"),
            }
            actual_operations = {
                (method, path)
                for path, path_item in spec["paths"].items()
                for method in path_item
                if method in {"get", "post", "put", "patch", "delete"}
            }
            self.assertTrue(retained_operations.issubset(actual_operations))
            self.assertNotIn(("delete", "/v1/models/{model}"), actual_operations)

    def test_documents_standard_list_pagination_parameters(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            for path, method in [
                ("/v1/chat/completions", "get"),
                ("/v1/chat/completions/{completion_id}/messages", "get"),
                ("/v1/responses/{response_id}/input_items", "get"),
                ("/v1/files", "get"),
                ("/v1/audio/voice_consents", "get"),
                ("/v1/videos", "get"),
                ("/v1/vector_stores", "get"),
                ("/v1/vector_stores/{vector_store_id}/files", "get"),
                ("/v1/vector_stores/{vector_store_id}/file_batches/{batch_id}/files", "get"),
                ("/v1/assistants", "get"),
                ("/v1/threads/{thread_id}/messages", "get"),
                ("/v1/threads/{thread_id}/runs", "get"),
                ("/v1/threads/{thread_id}/runs/{run_id}/steps", "get"),
                ("/v1/batches", "get"),
                ("/v1/conversations", "get"),
                ("/v1/conversations/{conversation_id}/items", "get"),
                ("/v1/containers", "get"),
                ("/v1/containers/{container_id}/files", "get"),
            ]:
                operation = spec["paths"][path][method]
                parameter_names = {parameter["name"] for parameter in operation["parameters"]}
                self.assertTrue(
                    {"limit", "order", "after", "before"}.issubset(parameter_names),
                    f"{method.upper()} {path} must declare OpenAI-compatible list pagination parameters",
                )

    def test_documents_stored_chat_completion_surface(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            chat_collection = spec["paths"]["/v1/chat/completions"]
            self.assertIn("post", chat_collection)
            self.assertIn("get", chat_collection)
            self.assertEqual(
                "listChatCompletions",
                chat_collection["get"]["operationId"],
            )
            chat_collection_query_names = {
                parameter["name"]
                for parameter in chat_collection["get"]["parameters"]
                if parameter["in"] == "query"
            }
            self.assertTrue(
                {"limit", "order", "after", "before", "model", "metadata"}.issubset(
                    chat_collection_query_names
                )
            )

            chat_item = spec["paths"]["/v1/chat/completions/{completion_id}"]
            self.assertEqual({"get", "post", "delete"}, set(chat_item.keys()))
            self.assertEqual(
                "retrieveChatCompletion",
                chat_item["get"]["operationId"],
            )
            self.assertEqual(
                "modifyChatCompletion",
                chat_item["post"]["operationId"],
            )
            self.assertEqual(
                "deleteChatCompletion",
                chat_item["delete"]["operationId"],
            )

            messages = spec["paths"]["/v1/chat/completions/{completion_id}/messages"]["get"]
            self.assertEqual("listChatCompletionMessages", messages["operationId"])
            path_parameter_names = {
                parameter["name"]
                for parameter in messages["parameters"]
                if parameter["in"] == "path"
            }
            self.assertEqual({"completion_id"}, path_parameter_names)

    def test_documents_response_include_query_parameter(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            for path, method in [
                ("/v1/responses/{response_id}", "get"),
                ("/v1/responses/{response_id}/input_items", "get"),
            ]:
                query_parameters = {
                    parameter["name"]: parameter
                    for parameter in spec["paths"][path][method]["parameters"]
                    if parameter["in"] == "query"
                }
                self.assertIn("include[]", query_parameters, f"{method.upper()} {path}")
                self.assertEqual(
                    "array",
                    query_parameters["include[]"]["schema"]["type"],
                    f"{method.upper()} {path}",
                )

    def test_documents_conversation_request_and_response_shapes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            schemas = spec["components"]["schemas"]
            for schema_name in [
                "OpenAiConversationCreateRequest",
                "OpenAiConversationUpdateRequest",
                "OpenAiConversation",
                "OpenAiConversationList",
                "OpenAiConversationItemCreateRequest",
                "OpenAiConversationItem",
                "OpenAiConversationItemList",
            ]:
                self.assertIn(schema_name, schemas)

            list_operation = spec["paths"]["/v1/conversations"]["get"]
            create_operation = spec["paths"]["/v1/conversations"]["post"]
            retrieve_operation = spec["paths"]["/v1/conversations/{conversation_id}"]["get"]
            create_item_operation = spec["paths"]["/v1/conversations/{conversation_id}/items"]["post"]

            self.assertEqual(
                {"$ref": "#/components/schemas/OpenAiConversationList"},
                list_operation["responses"]["200"]["content"]["application/json"]["schema"],
            )
            self.assertEqual(
                {"$ref": "#/components/schemas/OpenAiConversationCreateRequest"},
                create_operation["requestBody"]["content"]["application/json"]["schema"],
            )
            self.assertEqual(
                {"$ref": "#/components/schemas/OpenAiConversation"},
                create_operation["responses"]["200"]["content"]["application/json"]["schema"],
            )
            self.assertEqual(
                {"$ref": "#/components/schemas/OpenAiConversation"},
                retrieve_operation["responses"]["200"]["content"]["application/json"]["schema"],
            )
            self.assertEqual(
                {"$ref": "#/components/schemas/OpenAiConversationItemCreateRequest"},
                create_item_operation["requestBody"]["content"]["application/json"]["schema"],
            )
            self.assertEqual(
                {"$ref": "#/components/schemas/OpenAiConversationItem"},
                create_item_operation["responses"]["200"]["content"]["application/json"]["schema"],
            )
            self.assertIn("data", schemas["OpenAiConversationList"]["properties"])
            self.assertIn("items", schemas["OpenAiConversationCreateRequest"]["properties"])

    def test_documents_multipart_and_binary_passthrough_request_bodies(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            expected_multipart_refs = {
                ("/v1/files", "post"): "OpenAiFileUploadRequest",
                ("/v1/images/edits", "post"): "OpenAiImageEditMultipartRequest",
                ("/v1/images/variations", "post"): "OpenAiImageVariationMultipartRequest",
                ("/v1/audio/transcriptions", "post"): "OpenAiAudioTranscriptionMultipartRequest",
                ("/v1/audio/translations", "post"): "OpenAiAudioTranslationMultipartRequest",
                ("/v1/audio/voices", "post"): "OpenAiVoiceCreateMultipartRequest",
                ("/v1/audio/voice_consents", "post"): "OpenAiVoiceConsentMultipartRequest",
                ("/v1/videos/characters", "post"): "OpenAiVideoCharacterMultipartRequest",
                ("/v1/uploads/{upload_id}/parts", "post"): "OpenAiUploadPartMultipartRequest",
            }
            for (path, method), schema_name in expected_multipart_refs.items():
                content = spec["paths"][path][method]["requestBody"]["content"]
                self.assertIn("multipart/form-data", content, f"{method.upper()} {path}")
                self.assertEqual(
                    {"$ref": f"#/components/schemas/{schema_name}"},
                    content["multipart/form-data"]["schema"],
                )

            google_upload = spec["paths"]["/google/v1beta/files"]["post"]["requestBody"]["content"]
            self.assertEqual(
                {"$ref": "#/components/schemas/GoogleFileUploadMultipartRequest"},
                google_upload["multipart/form-data"]["schema"],
            )

            anthropic_upload = spec["paths"]["/anthropic/v1/files"]["post"]["requestBody"]["content"]
            self.assertEqual(
                {"$ref": "#/components/schemas/AnthropicFileUploadMultipartRequest"},
                anthropic_upload["multipart/form-data"]["schema"],
            )

    def test_documents_current_openai_platform_surface_extensions(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            expected_methods = {
                ("/v1/responses/input_tokens", "post"): "countResponseInputTokens",
                ("/v1/responses/compact", "post"): "compactResponse",
                ("/v1/audio/voices", "post"): "createVoice",
                ("/v1/audio/voice_consents", "get"): "listVoiceConsents",
                ("/v1/audio/voice_consents/{consent_id}", "post"): "updateVoiceConsent",
                ("/v1/audio/voice_consents/{consent_id}", "delete"): "deleteVoiceConsent",
                ("/v1/videos/characters", "post"): "createVideoCharacter",
                ("/v1/videos/characters/{character_id}", "get"): "retrieveVideoCharacter",
                ("/v1/videos/edits", "post"): "editVideo",
                ("/v1/videos/extensions", "post"): "extendVideo",
                ("/v1/batches/{batch_id}/cancel", "post"): "cancelBatch",
                ("/v1/vector_stores/{vector_store_id}/file_batches/{batch_id}/cancel", "post"): "cancelVectorStoreFileBatch",
                ("/v1/realtime/client_secrets", "post"): "createRealtimeClientSecret",
                ("/v1/realtime/calls", "post"): "createRealtimeCall",
                ("/v1/realtime/calls/{call_id}/accept", "post"): "acceptRealtimeCall",
                ("/v1/realtime/calls/{call_id}/hangup", "post"): "hangupRealtimeCall",
                ("/v1/realtime/calls/{call_id}/refer", "post"): "referRealtimeCall",
                ("/v1/realtime/calls/{call_id}/reject", "post"): "rejectRealtimeCall",
                ("/v1/realtime/translations", "post"): "createRealtimeTranslationSession",
                ("/v1/vector_stores/{vector_store_id}/files/{file_id}", "post"): "modifyVectorStoreFile",
            }
            for (path, method), operation_id in expected_methods.items():
                self.assertIn(path, spec["paths"], path)
                self.assertIn(method, spec["paths"][path], f"{method.upper()} {path}")
                self.assertEqual(operation_id, spec["paths"][path][method]["operationId"])

            self.assertNotIn("post", spec["paths"]["/v1/batches/{batch_id}"])
            self.assertNotIn(
                "post",
                spec["paths"]["/v1/vector_stores/{vector_store_id}/file_batches/{batch_id}"],
            )
            self.assertNotIn("/v1/uploads/{upload_id}", spec["paths"])
            consent_path_parameters = {
                parameter["name"]
                for parameter in spec["paths"]["/v1/audio/voice_consents/{consent_id}"]["get"]["parameters"]
                if parameter["in"] == "path"
            }
            self.assertEqual({"consent_id"}, consent_path_parameters)

    def test_documents_realtime_call_sdp_contract(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            operation = spec["paths"]["/v1/realtime/calls"]["post"]
            self.assertEqual("createRealtimeCall", operation["operationId"])
            request_content = operation["requestBody"]["content"]
            self.assertIn("multipart/form-data", request_content)
            self.assertEqual(
                {"$ref": "#/components/schemas/OpenAiRealtimeCallMultipartRequest"},
                request_content["multipart/form-data"]["schema"],
            )
            self.assertIn("application/json", request_content)
            response_content = operation["responses"]["201"]["content"]
            self.assertEqual(
                {"$ref": "#/components/schemas/SdpResponse"},
                response_content["application/sdp"]["schema"],
            )

    def test_documents_provider_native_reference_surface(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            for path in [
                "/google/v1beta/files",
                "/google/v1beta/cachedContents",
                "/google/v1beta/models/{model}:streamGenerateContent",
                "/google/v1beta/models/{model}:embedContent",
                "/google/v1beta/models/{model}:batchEmbedContents",
                "/google/v1beta/models/{model}:countTokens",
                "/anthropic/v1/messages/count_tokens",
                "/anthropic/v1/messages/batches",
                "/anthropic/v1/files",
                "/anthropic/v1/files/{file_id}/content",
                "/suno/v1/music/generations/{task_id}",
                "/midjourney/v1/images/generations/{task_id}",
                "/kling/v1/videos/generations/{task_id}",
                "/vidu/ent/v2/tasks/{task_id}/creations",
                "/nano-banana/v1/images/generations/{task_id}",
            ]:
                self.assertIn(path, spec["paths"])

            anthropic_files = spec["paths"]["/anthropic/v1/files"]["post"]
            self.assertNotIn("x-provider", anthropic_files)
            self.assertNotIn("x-passthrough", anthropic_files)
            self.assertIn("multipart/form-data", anthropic_files["requestBody"]["content"])

    def test_documents_provider_native_list_query_parameters(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            google_list_files = {
                parameter["name"]: parameter
                for parameter in spec["paths"]["/google/v1beta/files"]["get"]["parameters"]
                if parameter["in"] == "query"
            }
            self.assertEqual({"pageSize", "pageToken"}, set(google_list_files))
            self.assertEqual({"type": "integer", "minimum": 1, "maximum": 100}, google_list_files["pageSize"]["schema"])
            self.assertEqual({"type": "string"}, google_list_files["pageToken"]["schema"])

            google_cached_contents = {
                parameter["name"]: parameter
                for parameter in spec["paths"]["/google/v1beta/cachedContents"]["get"]["parameters"]
                if parameter["in"] == "query"
            }
            self.assertEqual({"pageSize", "pageToken"}, set(google_cached_contents))

            anthropic_batches = {
                parameter["name"]: parameter
                for parameter in spec["paths"]["/anthropic/v1/messages/batches"]["get"]["parameters"]
                if parameter["in"] == "query"
            }
            self.assertEqual({"before_id", "after_id", "limit"}, set(anthropic_batches))
            self.assertEqual({"type": "integer", "minimum": 1, "maximum": 100}, anthropic_batches["limit"]["schema"])

            anthropic_files = {
                parameter["name"]: parameter
                for parameter in spec["paths"]["/anthropic/v1/files"]["get"]["parameters"]
                if parameter["in"] == "query"
            }
            self.assertEqual({"before_id", "after_id", "limit"}, set(anthropic_files))

    def test_documents_anthropic_message_batch_cancel_official_route(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            self.assertNotIn("delete", spec["paths"]["/anthropic/v1/messages/batches/{batch_id}"])
            operation = spec["paths"]["/anthropic/v1/messages/batches/{batch_id}/cancel"]["post"]
            self.assertEqual(["Batches/anthropic"], operation["tags"])
            self.assertEqual("anthropicCancelMessageBatch", operation["operationId"])
            path_parameters = {
                parameter["name"]
                for parameter in operation["parameters"]
                if parameter["in"] == "path"
            }
            self.assertEqual({"batch_id"}, path_parameters)
            response_ref = operation["responses"]["200"]["content"]["application/json"]["schema"]["$ref"]
            self.assertEqual("#/components/schemas/AnthropicMessageBatch", response_ref)

    def test_public_openapi_exposes_only_declared_provider_native_operations(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            for provider in self._provider_prefixes():
                path = f"/{provider}/{{path}}"
                self.assertNotIn(
                    path,
                    spec["paths"],
                    f"{provider} public OpenAPI must not expose arbitrary generic passthrough paths",
                )

            provider_tags = {
                operation["tags"][0]
                for path, path_item in spec["paths"].items()
                if path.startswith("/") and path.split("/", 2)[1] in self._provider_prefixes()
                for method, operation in path_item.items()
                if not method.startswith("x-")
            }
            self.assertNotIn("Provider Passthrough", provider_tags)
            self.assertIn("Videos/vidu", provider_tags)
            self.assertIn("Images/vidu", provider_tags)

    def test_documents_vidu_official_native_api_shapes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            expected_operations = {
                ("/vidu/ent/v2/text2video", "post"): ("Videos/vidu", "viduCreateTextToVideo", "ViduTextToVideoRequest", "ViduVideoGenerationTask"),
                ("/vidu/ent/v2/img2video", "post"): ("Videos/vidu", "viduCreateImageToVideo", "ViduImageToVideoRequest", "ViduVideoGenerationTask"),
                ("/vidu/ent/v2/reference2video", "post"): ("Videos/vidu", "viduCreateReferenceToVideo", "ViduReferenceToVideoRequest", "ViduVideoGenerationTask"),
                ("/vidu/ent/v2/start-end2video", "post"): ("Videos/vidu", "viduCreateStartEndToVideo", "ViduStartEndToVideoRequest", "ViduVideoGenerationTask"),
                ("/vidu/ent/v2/reference2image", "post"): ("Images/vidu", "viduCreateReferenceToImage", "ViduReferenceToImageRequest", "ViduImageGenerationTask"),
                ("/vidu/ent/v2/tasks/{task_id}/creations", "get"): ("Videos/vidu", "viduGetTaskCreations", None, "ViduTaskCreationsResponse"),
            }
            for (path, method), (tag, operation_id, request_schema, response_schema) in expected_operations.items():
                operation = spec["paths"][path][method]
                self.assertEqual([tag], operation["tags"], f"{method.upper()} {path}")
                self.assertEqual(operation_id, operation["operationId"], f"{method.upper()} {path}")
                self.assertNotIn("x-provider", operation, f"{method.upper()} {path}")
                self.assertNotIn("x-passthrough", operation, f"{method.upper()} {path}")
                success_schema = operation["responses"]["200"]["content"]["application/json"]["schema"]
                self.assertEqual({"$ref": f"#/components/schemas/{response_schema}"}, success_schema)
                if request_schema is None:
                    self.assertNotIn("requestBody", operation)
                else:
                    request_body_schema = operation["requestBody"]["content"]["application/json"]["schema"]
                    self.assertEqual({"$ref": f"#/components/schemas/{request_schema}"}, request_body_schema)

            self.assertNotIn("/vidu/v1/videos/generations", spec["paths"])
            self.assertNotIn("/vidu/v1/videos/generations/{task_id}", spec["paths"])

            text_request = spec["components"]["schemas"]["ViduTextToVideoRequest"]
            self.assertEqual(["model", "prompt"], text_request["required"])
            self.assertIn("callback_url", text_request["properties"])
            self.assertIn("payload", text_request["properties"])
            task_response = spec["components"]["schemas"]["ViduVideoGenerationTask"]
            self.assertTrue({"task_id", "state", "model", "created_at"}.issubset(task_response["properties"]))
            creations_response = spec["components"]["schemas"]["ViduTaskCreationsResponse"]
            self.assertIn("creations", creations_response["properties"])

    def test_public_vendor_operations_do_not_expose_passthrough_contracts(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            serialized = json.dumps(spec, ensure_ascii=False).lower()
            self.assertNotIn("passthrough", serialized)
            self.assertNotIn("x-passthrough", serialized)
            self.assertNotIn("x-provider-passthrough", serialized)
            self.assertNotIn("native", serialized)

            for path, path_item in spec["paths"].items():
                if path.startswith("/v1/"):
                    continue
                provider_prefix = path.split("/", 2)[1] if path.startswith("/") else ""
                if provider_prefix not in self._provider_prefixes():
                    continue
                for method, operation in path_item.items():
                    if method.startswith("x-"):
                        continue
                    self.assertEqual(
                        [{"bearerAuth": []}],
                        operation["security"],
                        f"{method.upper()} {path} must require Claw Router API key auth",
                    )
                    self.assertNotIn("x-provider", operation, f"{method.upper()} {path}")
                    self.assertNotIn("x-passthrough", operation, f"{method.upper()} {path}")

    def test_public_vendor_operations_document_typed_payload_schemas(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            audit = audit_vendor_schema_quality(spec, provider_prefixes=self._provider_prefixes())

            self.assertEqual(
                [],
                audit.non_component_payload_schemas,
                "Vendor structured payloads must use named component schema refs.",
            )
            self.assertEqual(
                [],
                audit.optional_request_bodies,
                "Vendor operations with request bodies must document them as required inputs.",
            )
            self.assertEqual(
                [],
                audit.path_parameter_mismatches,
                "Vendor path templates must declare every path parameter as a required typed input.",
            )
            self.assertEqual(
                [],
                audit.query_parameter_mismatches,
                "Vendor query parameters must declare typed schemas and descriptions.",
            )
            self.assertEqual(
                [],
                audit.open_object_components,
                "Vendor reachable object components must be closed or typed map modules.",
            )
            self.assertEqual(
                [],
                audit.unregistered_operation_tags,
                "Vendor operations must use declared API reference tags.",
            )
            self.assertEqual(
                [],
                audit.generic_payload_refs,
                "Vendor JSON payloads must use vendor-specific component schemas.",
            )

    def test_public_openapi_operations_document_typed_payload_schemas(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            generic_refs: list[str] = []
            for path, path_item in spec["paths"].items():
                for method, operation in path_item.items():
                    if method.startswith("x-") or not isinstance(operation, dict):
                        continue
                    for content_type, media_type in operation.get("requestBody", {}).get("content", {}).items():
                        schema_ref = media_type.get("schema", {}).get("$ref")
                        if schema_ref in {
                            "#/components/schemas/JsonObject",
                            "#/components/schemas/ProviderMultipartRequest",
                        }:
                            generic_refs.append(
                                f"{method.upper()} {path} {content_type} request uses {schema_ref}"
                            )
                    for status, response in operation.get("responses", {}).items():
                        if not isinstance(response, dict):
                            continue
                        for content_type, media_type in response.get("content", {}).items():
                            schema_ref = media_type.get("schema", {}).get("$ref")
                            if schema_ref == "#/components/schemas/JsonObject":
                                generic_refs.append(
                                    f"{method.upper()} {path} {status} {content_type} response uses {schema_ref}"
                                )

            self.assertEqual([], sorted(generic_refs))

            schemas = spec["components"]["schemas"]
            create_completion = spec["paths"]["/v1/completions"]["post"]
            self.assertEqual(
                {"$ref": "#/components/schemas/OpenAiCompletionCreateRequest"},
                create_completion["requestBody"]["content"]["application/json"]["schema"],
            )
            self.assertEqual(
                {"$ref": "#/components/schemas/OpenAiCompletion"},
                create_completion["responses"]["200"]["content"]["application/json"]["schema"],
            )
            self.assertEqual("object", schemas["OpenAiCompletionCreateRequest"]["type"])
            self.assertDescribedSchemaRef(
                schemas["OpenAiCompletionCreateRequest"]["additionalProperties"],
                "#/components/schemas/ProviderJsonValue",
            )
            self.assertEqual(["model", "prompt"], schemas["OpenAiCompletionCreateRequest"]["required"])
            self.assertIn("model", schemas["OpenAiCompletionCreateRequest"]["properties"])
            self.assertIn("prompt", schemas["OpenAiCompletionCreateRequest"]["properties"])
            self.assertIn("choices", schemas["OpenAiCompletion"]["properties"])

            create_video_character = spec["paths"]["/v1/videos/characters"]["post"]
            self.assertEqual(
                {"$ref": "#/components/schemas/OpenAiVideoCharacterMultipartRequest"},
                create_video_character["requestBody"]["content"]["multipart/form-data"]["schema"],
            )
            self.assertEqual(
                "object",
                schemas["OpenAiVideoCharacterMultipartRequest"]["type"],
            )
            self.assertIn("file", schemas["OpenAiVideoCharacterMultipartRequest"]["properties"])
            self.assertDescribedSchemaRef(
                schemas["OpenAiVideoCharacterMultipartRequest"]["additionalProperties"],
                "#/components/schemas/ProviderJsonValue",
            )

    def test_public_openapi_object_extension_maps_are_typed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            open_objects = [
                schema_name
                for schema_name, schema in spec["components"]["schemas"].items()
                if isinstance(schema, dict)
                and schema.get("type") == "object"
                and schema.get("additionalProperties") is True
            ]
            self.assertEqual([], sorted(open_objects))
            self.assertDescribedSchemaRef(
                spec["components"]["schemas"]["OpenAiChatCompletionRequest"]["additionalProperties"],
                "#/components/schemas/ProviderJsonValue",
            )

    def test_public_openapi_does_not_emit_empty_schema_shapes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            empty_schema_locations: list[str] = []

            def visit(node: object, location: str) -> None:
                if isinstance(node, dict):
                    if node == {}:
                        empty_schema_locations.append(location)
                    for key, value in node.items():
                        visit(value, f"{location}.{key}")
                elif isinstance(node, list):
                    for index, value in enumerate(node):
                        visit(value, f"{location}[{index}]")

            visit(spec["components"]["schemas"], "#/components/schemas")

            self.assertEqual([], empty_schema_locations)

    def test_public_openapi_component_properties_are_typed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            untyped_properties: list[str] = []
            schema_shape_keys = {
                "$ref",
                "type",
                "oneOf",
                "anyOf",
                "allOf",
                "enum",
                "const",
                "items",
                "properties",
                "additionalProperties",
            }

            for schema_name, schema in spec["components"]["schemas"].items():
                if not isinstance(schema, dict) or schema.get("type") != "object":
                    continue
                properties = schema.get("properties")
                if not isinstance(properties, dict):
                    continue
                for property_name, property_schema in properties.items():
                    if not isinstance(property_schema, dict):
                        continue
                    if not any(key in property_schema for key in schema_shape_keys):
                        untyped_properties.append(f"{schema_name}.{property_name}")

            self.assertEqual([], sorted(untyped_properties))

    def test_public_openapi_media_file_inputs_reuse_named_modules(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            schemas = spec["components"]["schemas"]
            for schema_name in [
                "OpenAiFileReferenceInput",
                "OpenAiFileReferenceObject",
                "OpenAiImageReferenceInput",
                "OpenAiImageReferenceObject",
                "OpenAiImageReferenceInputList",
                "OpenAiBinaryFilePart",
            ]:
                self.assertIn(schema_name, schemas)
                self.assertIsInstance(schemas[schema_name].get("description"), str)

            self.assertDescribedSchemaRef(
                schemas["OpenAiImageEditRequest"]["properties"]["image"],
                "#/components/schemas/OpenAiImageReferenceInputList",
            )
            self.assertDescribedSchemaRef(
                schemas["OpenAiImageEditRequest"]["properties"]["mask"],
                "#/components/schemas/OpenAiImageReferenceInput",
            )
            self.assertDescribedSchemaRef(
                schemas["OpenAiImageVariationRequest"]["properties"]["image"],
                "#/components/schemas/OpenAiImageReferenceInput",
            )
            self.assertDescribedSchemaRef(
                schemas["OpenAiAudioTranscriptionRequest"]["properties"]["file"],
                "#/components/schemas/OpenAiFileReferenceInput",
            )
            self.assertDescribedSchemaRef(
                schemas["OpenAiAudioTranslationRequest"]["properties"]["file"],
                "#/components/schemas/OpenAiFileReferenceInput",
            )

            for schema_name, property_name in [
                ("OpenAiImageEditMultipartRequest", "image"),
                ("OpenAiImageEditMultipartRequest", "mask"),
                ("OpenAiImageVariationMultipartRequest", "image"),
                ("OpenAiAudioTranscriptionMultipartRequest", "file"),
                ("OpenAiAudioTranslationMultipartRequest", "file"),
            ]:
                self.assertDescribedSchemaRef(
                    schemas[schema_name]["properties"][property_name],
                    "#/components/schemas/OpenAiBinaryFilePart",
                )

    def test_public_openapi_reuses_shared_openai_resource_modules(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            expected_response_refs = {
                ("/v1/responses/input_tokens", "post"): "OpenAiResponseInputTokenCount",
                ("/v1/responses/compact", "post"): "OpenAiResponse",
                ("/v1/responses/{response_id}", "get"): "OpenAiResponse",
                ("/v1/responses/{response_id}/cancel", "post"): "OpenAiResponse",
                ("/v1/responses/{response_id}/input_items", "get"): "OpenAiResponseInputItemList",
                ("/v1/chat/completions", "get"): "OpenAiChatCompletionList",
                ("/v1/chat/completions/{completion_id}", "get"): "OpenAiChatCompletion",
                ("/v1/chat/completions/{completion_id}", "post"): "OpenAiChatCompletion",
                ("/v1/chat/completions/{completion_id}/messages", "get"): "OpenAiChatCompletionMessageList",
                ("/v1/images/generations", "post"): "OpenAiImageList",
                ("/v1/images/edits", "post"): "OpenAiImageList",
                ("/v1/images/variations", "post"): "OpenAiImageList",
                ("/v1/videos", "get"): "OpenAiVideoList",
                ("/v1/videos", "post"): "OpenAiVideo",
                ("/v1/videos/characters", "post"): "OpenAiVideoCharacter",
                ("/v1/videos/characters/{character_id}", "get"): "OpenAiVideoCharacter",
                ("/v1/videos/edits", "post"): "OpenAiVideo",
                ("/v1/videos/extensions", "post"): "OpenAiVideo",
                ("/v1/videos/{video_id}", "get"): "OpenAiVideo",
                ("/v1/videos/{video_id}/remix", "post"): "OpenAiVideo",
                ("/v1/audio/voices", "get"): "OpenAiVoiceList",
                ("/v1/audio/voices", "post"): "OpenAiVoice",
                ("/v1/audio/voices/{voice_id}", "get"): "OpenAiVoice",
                ("/v1/audio/voice_consents", "get"): "OpenAiVoiceConsentList",
                ("/v1/audio/voice_consents", "post"): "OpenAiVoiceConsent",
                ("/v1/audio/voice_consents/{consent_id}", "get"): "OpenAiVoiceConsent",
                ("/v1/audio/voice_consents/{consent_id}", "post"): "OpenAiVoiceConsent",
                ("/v1/audio/transcriptions", "post"): "OpenAiAudioTranscription",
                ("/v1/audio/translations", "post"): "OpenAiAudioTranslation",
                ("/v1/files", "get"): "OpenAiFileList",
                ("/v1/files", "post"): "OpenAiFile",
                ("/v1/files/{file_id}", "get"): "OpenAiFile",
                ("/v1/containers", "get"): "OpenAiContainerList",
                ("/v1/containers", "post"): "OpenAiContainer",
                ("/v1/containers/{container_id}", "get"): "OpenAiContainer",
                ("/v1/containers/{container_id}/files", "get"): "OpenAiContainerFileList",
                ("/v1/containers/{container_id}/files", "post"): "OpenAiContainerFile",
                ("/v1/containers/{container_id}/files/{file_id}", "get"): "OpenAiContainerFile",
                ("/v1/vector_stores", "get"): "OpenAiVectorStoreList",
                ("/v1/vector_stores", "post"): "OpenAiVectorStore",
                ("/v1/vector_stores/{vector_store_id}", "get"): "OpenAiVectorStore",
                ("/v1/vector_stores/{vector_store_id}/files", "post"): "OpenAiVectorStoreFile",
                ("/v1/vector_stores/{vector_store_id}/file_batches", "post"): "OpenAiVectorStoreFileBatch",
                ("/v1/batches", "get"): "OpenAiBatchList",
                ("/v1/batches", "post"): "OpenAiBatch",
                ("/v1/batches/{batch_id}", "get"): "OpenAiBatch",
                ("/v1/batches/{batch_id}/cancel", "post"): "OpenAiBatch",
                ("/v1/assistants", "get"): "OpenAiAssistantList",
                ("/v1/assistants", "post"): "OpenAiAssistant",
                ("/v1/threads", "post"): "OpenAiThread",
                ("/v1/threads/{thread_id}/messages", "post"): "OpenAiThreadMessage",
                ("/v1/threads/{thread_id}/runs", "post"): "OpenAiRun",
                ("/v1/threads/{thread_id}/runs/{run_id}/steps", "get"): "OpenAiRunStepList",
                ("/v1/uploads", "post"): "OpenAiUpload",
                ("/v1/uploads/{upload_id}/complete", "post"): "OpenAiUpload",
                ("/v1/realtime/client_secrets", "post"): "OpenAiRealtimeClientSecret",
            }
            for (path, method), schema_name in expected_response_refs.items():
                operation = spec["paths"][path][method]
                response_ref = operation["responses"]["200"]["content"]["application/json"]["schema"]["$ref"]
                self.assertEqual(
                    f"#/components/schemas/{schema_name}",
                    response_ref,
                    f"{method.upper()} {path} must reuse the shared {schema_name} response module",
                )

            expected_request_refs = {
                ("/v1/responses/input_tokens", "post"): "OpenAiResponseInputTokenCountRequest",
                ("/v1/responses/compact", "post"): "OpenAiResponseCompactRequest",
                ("/v1/chat/completions/{completion_id}", "post"): "OpenAiChatCompletionUpdateRequest",
                ("/v1/videos", "post"): "OpenAiVideoCreateRequest",
                ("/v1/videos/characters", "post"): "OpenAiVideoCharacterCreateRequest",
                ("/v1/videos/edits", "post"): "OpenAiVideoEditRequest",
                ("/v1/videos/extensions", "post"): "OpenAiVideoExtendRequest",
                ("/v1/videos/{video_id}/remix", "post"): "OpenAiVideoRemixRequest",
                ("/v1/audio/speech", "post"): "OpenAiSpeechCreateRequest",
                ("/v1/audio/voice_consents/{consent_id}", "post"): "OpenAiVoiceConsentUpdateRequest",
                ("/v1/containers", "post"): "OpenAiContainerCreateRequest",
                ("/v1/batches", "post"): "OpenAiBatchCreateRequest",
                ("/v1/vector_stores/{vector_store_id}/files", "post"): "OpenAiVectorStoreFileCreateRequest",
                ("/v1/vector_stores/{vector_store_id}/file_batches", "post"): "OpenAiVectorStoreFileBatchCreateRequest",
                ("/v1/assistants", "post"): "OpenAiAssistantCreateRequest",
                ("/v1/assistants/{assistant_id}", "post"): "OpenAiAssistantUpdateRequest",
                ("/v1/threads/{thread_id}/messages", "post"): "OpenAiThreadMessageCreateRequest",
                ("/v1/threads/{thread_id}/runs", "post"): "OpenAiRunCreateRequest",
                ("/v1/uploads", "post"): "OpenAiUploadCreateRequest",
                ("/v1/realtime/client_secrets", "post"): "OpenAiRealtimeClientSecretCreateRequest",
            }
            for (path, method), schema_name in expected_request_refs.items():
                operation = spec["paths"][path][method]
                request_ref = operation["requestBody"]["content"]["application/json"]["schema"]["$ref"]
                self.assertEqual(
                    f"#/components/schemas/{schema_name}",
                    request_ref,
                    f"{method.upper()} {path} must reuse the shared {schema_name} request module",
                )

            schemas = spec["components"]["schemas"]
            self.assertEqual(["file_id"], schemas["OpenAiVectorStoreFileCreateRequest"]["required"])
            self.assertIn("chunking_strategy", schemas["OpenAiVectorStoreFileCreateRequest"]["properties"])
            self.assertEqual(["input_file_id", "endpoint", "completion_window"], schemas["OpenAiBatchCreateRequest"]["required"])
            self.assertIn("request_counts", schemas["OpenAiBatch"]["properties"])
            self.assertIn("bytes", schemas["OpenAiFile"]["properties"])
            self.assertIn("client_secret", schemas["OpenAiRealtimeClientSecret"]["properties"])
            self.assertIn("memory_limit", schemas["OpenAiContainer"]["properties"])
            self.assertIn("path", schemas["OpenAiContainerFile"]["properties"])
            self.assertIn("url", schemas["OpenAiImage"]["properties"])
            self.assertIn("seconds", schemas["OpenAiVideo"]["properties"])
            self.assertIn("consent_document", schemas["OpenAiVoiceConsent"]["properties"])
            self.assertIn("text", schemas["OpenAiAudioTranscription"]["properties"])
            self.assertIn("usage", schemas["OpenAiRun"]["properties"])
            self.assertIn("completed_at", schemas["OpenAiRun"]["properties"])
            self.assertIn("usage", schemas["OpenAiRunStep"]["properties"])
            self.assertIn("response_format", schemas["OpenAiAssistant"]["properties"])

    def test_public_openapi_v1_payloads_use_canonical_modules(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            non_canonical_refs: list[str] = []
            allowed_refs = {"DeleteResult", "SdpResponse"}

            def is_canonical(schema_name: str) -> bool:
                return schema_name.startswith("OpenAi") or schema_name in allowed_refs

            for path, path_item in spec["paths"].items():
                if not (path == "/v1" or path.startswith("/v1/")):
                    continue
                for method, operation in path_item.items():
                    if method.startswith("x-") or not isinstance(operation, dict):
                        continue
                    location = f"{method.upper()} {path} {operation.get('operationId')}"
                    request_body = operation.get("requestBody")
                    if isinstance(request_body, dict):
                        for content_type, media_type in request_body.get("content", {}).items():
                            schema_ref = media_type.get("schema", {}).get("$ref")
                            if not isinstance(schema_ref, str):
                                continue
                            schema_name = schema_ref.rsplit("/", 1)[-1]
                            schema = spec["components"]["schemas"].get(schema_name)
                            if isinstance(schema, dict) and isinstance(schema.get("$ref"), str):
                                schema_name = schema["$ref"].rsplit("/", 1)[-1]
                            if not is_canonical(schema_name):
                                non_canonical_refs.append(f"{location} {content_type} request uses {schema_name}")
                    for status, response in operation.get("responses", {}).items():
                        if status not in {"200", "201"} or not isinstance(response, dict):
                            continue
                        for content_type, media_type in response.get("content", {}).items():
                            schema_ref = media_type.get("schema", {}).get("$ref")
                            if not isinstance(schema_ref, str):
                                continue
                            schema_name = schema_ref.rsplit("/", 1)[-1]
                            schema = spec["components"]["schemas"].get(schema_name)
                            if isinstance(schema, dict) and isinstance(schema.get("$ref"), str):
                                schema_name = schema["$ref"].rsplit("/", 1)[-1]
                            if not is_canonical(schema_name):
                                non_canonical_refs.append(f"{location} {status} {content_type} response uses {schema_name}")

            self.assertEqual([], sorted(non_canonical_refs))

    def test_public_vendor_schema_quality_audit_reports_optional_request_bodies(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()
            del spec["paths"]["/google/v1beta/models/{model}:generateContent"]["post"]["requestBody"]["required"]
            spec["paths"]["/anthropic/v1/messages"]["post"]["requestBody"]["required"] = False

            audit = audit_vendor_schema_quality(spec, provider_prefixes=self._provider_prefixes())

            self.assertEqual(
                [
                    "POST /anthropic/v1/messages requestBody must be required",
                    "POST /google/v1beta/models/{model}:generateContent requestBody must be required",
                ],
                audit.optional_request_bodies,
            )

    def test_public_vendor_schema_quality_audit_reports_path_parameter_mismatches(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()
            spec["paths"]["/google/v1beta/models/{model}:generateContent"]["post"]["parameters"] = []
            spec["paths"]["/anthropic/v1/files/{file_id}"]["get"]["parameters"][0]["required"] = False

            audit = audit_vendor_schema_quality(spec, provider_prefixes=self._provider_prefixes())

            self.assertEqual(
                [
                    "GET /anthropic/v1/files/{file_id} path parameter file_id must be required",
                    "POST /google/v1beta/models/{model}:generateContent path parameters mismatch: "
                    "declared [] expected ['model']",
                ],
                audit.path_parameter_mismatches,
            )

    def test_public_vendor_schema_quality_audit_reports_query_parameter_mismatches(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()
            parameters = spec["paths"]["/google/v1beta/files"]["get"]["parameters"]
            del parameters[0]["schema"]
            parameters[1]["description"] = ""

            audit = audit_vendor_schema_quality(spec, provider_prefixes=self._provider_prefixes())

            self.assertEqual(
                [
                    "GET /google/v1beta/files query parameter pageSize must declare a schema",
                    "GET /google/v1beta/files query parameter pageToken must declare a description",
                ],
                audit.query_parameter_mismatches,
            )

    def test_public_vendor_schema_quality_audit_reports_open_object_components(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()
            spec["components"]["schemas"]["GoogleGenerateContentRequest"]["additionalProperties"] = True
            del spec["components"]["schemas"]["GoogleContent"]["additionalProperties"]

            audit = audit_vendor_schema_quality(spec, provider_prefixes=self._provider_prefixes())

            self.assertEqual(
                [
                    "#/components/schemas/GoogleContent must set additionalProperties to false "
                    "or a typed schema",
                    "#/components/schemas/GoogleGenerateContentRequest must set additionalProperties to false "
                    "or a typed schema",
                ],
                audit.open_object_components,
            )

    def test_public_vendor_schema_quality_audit_reports_unregistered_operation_tags(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()
            spec["paths"]["/google/v1beta/models/{model}:generateContent"]["post"]["tags"] = ["Unknown/google"]

            audit = audit_vendor_schema_quality(spec, provider_prefixes=self._provider_prefixes())

            self.assertEqual(
                ["POST /google/v1beta/models/{model}:generateContent uses undeclared tag Unknown/google"],
                audit.unregistered_operation_tags,
            )

    def test_public_vendor_schema_quality_audit_reports_inline_structured_payloads(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()
            spec["paths"]["/google/v1beta/models/{model}:generateContent"]["post"]["requestBody"]["content"][
                "application/json"
            ]["schema"] = {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "contents": {
                        "type": "array",
                        "items": {"$ref": "#/components/schemas/GoogleContent"},
                    }
                },
            }
            spec["paths"]["/google/v1beta/models/{model}:generateContent"]["post"]["responses"]["400"]["content"][
                "application/json"
            ]["schema"] = {"type": "object", "additionalProperties": True}

            audit = audit_vendor_schema_quality(spec, provider_prefixes=self._provider_prefixes())

            self.assertEqual(
                [
                    "POST /google/v1beta/models/{model}:generateContent 400 application/json response "
                    "is missing a component schema ref",
                    "POST /google/v1beta/models/{model}:generateContent application/json request "
                    "is missing a component schema ref",
                ],
                audit.non_component_payload_schemas,
            )

    def test_public_vendor_schema_quality_audit_reports_missing_and_external_payload_schemas(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()
            del spec["paths"]["/google/v1beta/models/{model}:generateContent"]["post"]["requestBody"]["content"][
                "application/json"
            ]["schema"]
            spec["paths"]["/google/v1beta/models/{model}:generateContent"]["post"]["responses"]["200"]["content"][
                "application/json"
            ]["schema"] = {"$ref": "https://example.com/schemas/GoogleGenerateContentResponse.json"}

            audit = audit_vendor_schema_quality(spec, provider_prefixes=self._provider_prefixes())

            self.assertEqual(
                [
                    "POST /google/v1beta/models/{model}:generateContent 200 application/json response "
                    "uses non-component schema ref https://example.com/schemas/GoogleGenerateContentResponse.json",
                    "POST /google/v1beta/models/{model}:generateContent application/json request "
                    "is missing a schema",
                ],
                audit.non_component_payload_schemas,
            )

    def test_public_vendor_schema_quality_audit_allows_inline_binary_payloads(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            audit = audit_vendor_schema_quality(spec, provider_prefixes=self._provider_prefixes())

            self.assertIn(
                "AnthropicFile",
                audit.root_schema_names,
                "The file metadata response should still participate in the typed vendor schema graph.",
            )
            self.assertEqual(
                [],
                [
                    item
                    for item in audit.non_component_payload_schemas
                    if "/anthropic/v1/files/{file_id}/content" in item
                ],
                "Binary file content responses are allowed to use inline string/binary schemas.",
            )

    def test_public_vendor_schema_graph_uses_named_modules_for_nested_objects(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            audit = audit_vendor_schema_quality(spec, provider_prefixes=self._provider_prefixes())

            self.assertEqual(
                [],
                audit.inline_free_form_objects,
                "Vendor schemas must use named reusable components for nested object modules.",
            )
            self.assertEqual(
                [],
                audit.anonymous_object_union_branches,
                "Vendor schema union branches must reference named object components.",
            )

    def test_public_vendor_reachable_components_have_schema_descriptions(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            audit = audit_vendor_schema_quality(spec, provider_prefixes=self._provider_prefixes())

            self.assertEqual(
                [],
                audit.missing_component_descriptions,
                "Vendor reachable schema components must include component-level descriptions.",
            )

    def test_public_vendor_schema_quality_audit_reports_standardized_results(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            audit = audit_vendor_schema_quality(spec, provider_prefixes=self._provider_prefixes())

            self.assertEqual([], audit.unregistered_vendor_paths)
            self.assertEqual(47, len(audit.root_schema_names))
            self.assertIn("ProviderJsonNull", audit.reachable_schema_names)
            self.assertEqual([], audit.unresolved_refs)
            self.assertEqual([], audit.non_component_payload_schemas)
            self.assertEqual([], audit.optional_request_bodies)
            self.assertEqual([], audit.path_parameter_mismatches)
            self.assertEqual([], audit.query_parameter_mismatches)
            self.assertEqual([], audit.open_object_components)
            self.assertEqual([], audit.unregistered_operation_tags)
            self.assertEqual([], audit.generic_payload_refs)
            self.assertEqual([], audit.missing_component_descriptions)
            self.assertEqual([], audit.inline_free_form_objects)
            self.assertEqual([], audit.anonymous_object_union_branches)

    def test_public_vendor_schema_quality_audit_reports_unregistered_vendor_paths(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()
            spec["paths"]["/newvendor/v1/tasks"] = {
                "post": {
                    "operationId": "createNewVendorTask",
                    "summary": "Create task.",
                    "description": "Create task.",
                    "tags": ["Media/newvendor"],
                    "security": [{"bearerAuth": []}],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ProviderTaskResult"}
                            }
                        },
                    },
                    "responses": {
                        "200": {
                            "description": "Task result.",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/ProviderTaskResult"}
                                }
                            },
                        }
                    },
                }
            }

            audit = audit_vendor_schema_quality(spec, provider_prefixes=self._provider_prefixes())

            self.assertEqual(["/newvendor/v1/tasks"], audit.unregistered_vendor_paths)

    def test_gateway_openapi_check_runs_vendor_schema_quality_audit(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generator = ClawRouterGatewayOpenApiGenerator(root=root)
            output = generator.write()
            spec = json.loads(output.read_text(encoding="utf-8"))
            spec["paths"]["/google/v1beta/models/{model}:generateContent"]["post"]["requestBody"]["content"][
                "application/json"
            ]["schema"] = {"$ref": "#/components/schemas/JsonObject"}
            output.write_text(json.dumps(spec, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")

            result = generator.check()

            self.assertFalse(result.ok)
            self.assertTrue(
                any("Vendor schema quality audit failed" in message for message in result.messages),
                result.messages,
            )
            self.assertTrue(any("JsonObject" in message for message in result.messages), result.messages)

    def test_gateway_openapi_check_runs_public_payload_schema_quality_audit(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generator = ClawRouterGatewayOpenApiGenerator(root=root)
            output = generator.write()
            spec = json.loads(output.read_text(encoding="utf-8"))
            spec["paths"]["/v1/completions"]["post"]["requestBody"]["content"]["application/json"][
                "schema"
            ] = {"$ref": "#/components/schemas/JsonObject"}
            output.write_text(json.dumps(spec, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")

            result = generator.check()

            self.assertFalse(result.ok)
            self.assertTrue(
                any("Public schema quality audit failed" in message for message in result.messages),
                result.messages,
            )
            self.assertTrue(any("JsonObject" in message for message in result.messages), result.messages)

    def test_gateway_openapi_check_runs_public_component_schema_quality_audit(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generator = ClawRouterGatewayOpenApiGenerator(root=root)
            output = generator.write()
            spec = json.loads(output.read_text(encoding="utf-8"))
            schemas = spec["components"]["schemas"]
            schemas["OpenAiCompletion"]["properties"]["choices"]["items"] = {
                "$ref": "#/components/schemas/MissingCompletionChoice"
            }
            schemas["OpenAiCompletionCreateRequest"]["additionalProperties"] = True
            schemas["OpenAiCompletion"]["properties"]["empty"] = {}
            schemas["OpenAiCompletion"]["properties"]["metadata"] = {
                "$ref": "#/components/schemas/ProviderJsonObject",
                "description": "Invalid OpenAPI 3.0 ref sibling.",
            }
            output.write_text(json.dumps(spec, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")

            result = generator.check()

            self.assertFalse(result.ok)
            self.assertTrue(any("unresolved refs" in message for message in result.messages), result.messages)
            self.assertTrue(any("$ref sibling schemas" in message for message in result.messages), result.messages)
            self.assertTrue(any("empty schema shapes" in message for message in result.messages), result.messages)
            self.assertTrue(any("untyped component properties" in message for message in result.messages), result.messages)
            self.assertTrue(any("open object components" in message for message in result.messages), result.messages)

    def test_gateway_openapi_check_reports_missing_request_body_descriptions(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generator = ClawRouterGatewayOpenApiGenerator(root=root)
            output = generator.write()
            spec = json.loads(output.read_text(encoding="utf-8"))
            del spec["paths"]["/v1/completions"]["post"]["requestBody"]["description"]
            output.write_text(json.dumps(spec, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")

            result = generator.check()

            self.assertFalse(result.ok)
            self.assertTrue(
                any("OpenAPI reference standard audit failed" in message for message in result.messages),
                result.messages,
            )
            self.assertTrue(any("request body descriptions" in message for message in result.messages), result.messages)

    def test_gateway_openapi_check_reports_union_branches_without_descriptions(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generator = ClawRouterGatewayOpenApiGenerator(root=root)
            output = generator.write()
            spec = json.loads(output.read_text(encoding="utf-8"))
            branch = spec["components"]["schemas"]["OpenAiResponsesRequest"]["properties"]["input"]["oneOf"][0]
            del branch["description"]
            output.write_text(json.dumps(spec, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")

            result = generator.check()

            self.assertFalse(result.ok)
            self.assertTrue(
                any("OpenAPI reference standard audit failed" in message for message in result.messages),
                result.messages,
            )
            self.assertTrue(any("union branch descriptions" in message for message in result.messages), result.messages)

    def test_gateway_openapi_check_reports_additional_properties_refs_without_descriptions(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generator = ClawRouterGatewayOpenApiGenerator(root=root)
            output = generator.write()
            spec = json.loads(output.read_text(encoding="utf-8"))
            spec["components"]["schemas"]["ProviderMetadata"]["additionalProperties"] = {
                "$ref": "#/components/schemas/ProviderJsonValue"
            }
            output.write_text(json.dumps(spec, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")

            result = generator.check()

            self.assertFalse(result.ok)
            self.assertTrue(
                any("OpenAPI reference standard audit failed" in message for message in result.messages),
                result.messages,
            )
            self.assertTrue(any("additionalProperties descriptions" in message for message in result.messages), result.messages)

    def test_gateway_openapi_check_reports_json_schema_null_type(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generator = ClawRouterGatewayOpenApiGenerator(root=root)
            output = generator.write()
            spec = json.loads(output.read_text(encoding="utf-8"))
            spec["components"]["schemas"]["OpenAiChatMessage"]["properties"]["content"]["oneOf"].append(
                {"type": "null", "description": "Invalid JSON Schema null type in OpenAPI 3.0."}
            )
            output.write_text(json.dumps(spec, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")

            result = generator.check()

            self.assertFalse(result.ok)
            self.assertTrue(
                any("OpenAPI reference standard audit failed" in message for message in result.messages),
                result.messages,
            )
            self.assertTrue(any("OpenAPI 3.0 null type schemas" in message for message in result.messages), result.messages)

    def test_gateway_openapi_check_reports_nullable_schema_without_type(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generator = ClawRouterGatewayOpenApiGenerator(root=root)
            output = generator.write()
            spec = json.loads(output.read_text(encoding="utf-8"))
            del spec["components"]["schemas"]["ProviderJsonNull"]["type"]
            output.write_text(json.dumps(spec, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")

            result = generator.check()

            self.assertFalse(result.ok)
            self.assertTrue(
                any("OpenAPI reference standard audit failed" in message for message in result.messages),
                result.messages,
            )
            self.assertTrue(
                any("OpenAPI 3.0 nullable schemas without type" in message for message in result.messages),
                result.messages,
            )

    def test_gateway_openapi_check_reports_invalid_schema_keyword_placement(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generator = ClawRouterGatewayOpenApiGenerator(root=root)
            output = generator.write()
            spec = json.loads(output.read_text(encoding="utf-8"))
            schemas = spec["components"]["schemas"]
            schemas["OpenAiCompletionCreateRequest"]["properties"]["prompt"]["items"] = {"type": "string"}
            del schemas["OpenAiEmbeddingsRequest"]["properties"]["input"]["oneOf"][1]["items"]
            schemas["OpenAiCompletion"]["required"].append("missing_field")
            output.write_text(json.dumps(spec, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")

            result = generator.check()

            self.assertFalse(result.ok)
            self.assertTrue(
                any("OpenAPI reference standard audit failed" in message for message in result.messages),
                result.messages,
            )
            self.assertTrue(any("array schemas" in message for message in result.messages), result.messages)
            self.assertTrue(any("misplaced schema keywords" in message for message in result.messages), result.messages)
            self.assertTrue(any("required properties" in message for message in result.messages), result.messages)

    def test_gateway_openapi_check_reports_missing_nested_schema_descriptions(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generator = ClawRouterGatewayOpenApiGenerator(root=root)
            output = generator.write()
            spec = json.loads(output.read_text(encoding="utf-8"))
            del spec["components"]["schemas"]["CreateCompletionLogprobs"]["properties"]["tokens"]["items"][
                "description"
            ]
            output.write_text(json.dumps(spec, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")

            result = generator.check()

            self.assertFalse(result.ok)
            self.assertTrue(
                any("OpenAPI reference standard audit failed" in message for message in result.messages),
                result.messages,
            )
            self.assertTrue(any("schema descriptions" in message for message in result.messages), result.messages)

    def test_gateway_openapi_check_reports_unregistered_vendor_paths(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generator = ClawRouterGatewayOpenApiGenerator(root=root)
            output = generator.write()
            spec = json.loads(output.read_text(encoding="utf-8"))
            spec["paths"]["/newvendor/v1/tasks"] = {
                "post": {
                    "operationId": "createNewVendorTask",
                    "summary": "Create task.",
                    "description": "Create task.",
                    "tags": ["Media/newvendor"],
                    "security": [{"bearerAuth": []}],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ProviderTaskResult"}
                            }
                        },
                    },
                    "responses": {
                        "200": {
                            "description": "Task result.",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/ProviderTaskResult"}
                                }
                            },
                        }
                    },
                }
            }
            output.write_text(json.dumps(spec, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")

            result = generator.check()

            self.assertFalse(result.ok)
            self.assertTrue(
                any("Vendor schema quality audit failed" in message for message in result.messages),
                result.messages,
            )
            self.assertTrue(any("unregistered vendor paths" in message for message in result.messages), result.messages)
            self.assertTrue(any("/newvendor/v1/tasks" in message for message in result.messages), result.messages)

    def test_gateway_openapi_check_reports_vendor_input_documentation_gaps(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generator = ClawRouterGatewayOpenApiGenerator(root=root)
            output = generator.write()
            spec = json.loads(output.read_text(encoding="utf-8"))
            spec["paths"]["/google/v1beta/models/{model}:generateContent"]["post"]["parameters"] = []
            del spec["paths"]["/google/v1beta/models/{model}:generateContent"]["post"]["requestBody"]["required"]
            del spec["paths"]["/google/v1beta/models/{model}:generateContent"]["post"]["requestBody"]["content"][
                "application/json"
            ]["schema"]
            output.write_text(json.dumps(spec, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")

            result = generator.check()

            self.assertFalse(result.ok)
            self.assertTrue(
                any("non-component payload schemas" in message for message in result.messages),
                result.messages,
            )
            self.assertTrue(any("optional request bodies" in message for message in result.messages), result.messages)
            self.assertTrue(any("path parameter mismatches" in message for message in result.messages), result.messages)

    def test_every_operation_has_complete_documentation_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            operation_ids: list[str] = []
            for path, path_item in spec["paths"].items():
                path_parameters = {
                    match.lstrip("*")
                    for match in re.findall(r"\{([^}]+)\}", path)
                }
                for method, operation in path_item.items():
                    if method.startswith("x-"):
                        continue
                    operation_ids.append(operation["operationId"])
                    self.assertTrue(operation["summary"], f"{method.upper()} {path} summary")
                    self.assertTrue(operation["description"], f"{method.upper()} {path} description")
                    self.assertIn("security", operation, f"{method.upper()} {path} security")
                    self.assertTrue(
                        any(status.startswith("2") for status in operation["responses"]),
                        f"{method.upper()} {path} must document a 2xx success response",
                    )
                    self.assertIn("401", operation["responses"], f"{method.upper()} {path} 401")
                    self.assertIn("501", operation["responses"], f"{method.upper()} {path} 501")

                    declared_path_parameters = {
                        parameter["name"]
                        for parameter in operation.get("parameters", [])
                        if parameter.get("in") == "path"
                    }
                    self.assertEqual(
                        path_parameters,
                        declared_path_parameters,
                        f"{method.upper()} {path} must document every path parameter",
                    )

            self.assertEqual(
                len(operation_ids),
                len(set(operation_ids)),
                "operationId values must be globally unique",
            )

    def test_schema_properties_have_descriptions_for_reference_tables(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            for schema_name, schema in spec["components"]["schemas"].items():
                for property_name, property_schema in schema.get("properties", {}).items():
                    if "$ref" in property_schema:
                        continue
                    self.assertTrue(
                        property_schema.get("description"),
                        f"{schema_name}.{property_name} must describe the API reference field",
                    )

    def test_component_nested_schemas_have_descriptions_for_reference_tables(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            missing_descriptions: list[str] = []

            def visit(node: object, location: str, *, is_schema_node: bool) -> None:
                if isinstance(node, dict):
                    if is_schema_node and "$ref" not in node and not node.get("description"):
                        missing_descriptions.append(location)
                    for key, value in node.items():
                        visit(
                            value,
                            f"{location}.{key}",
                            is_schema_node=(
                                (key in {"items", "additionalProperties", "not"} and isinstance(value, dict))
                                or (key in {"oneOf", "anyOf", "allOf"} and isinstance(value, list))
                                or (location.endswith(".properties") and isinstance(value, dict))
                            ),
                        )
                elif isinstance(node, list):
                    for index, value in enumerate(node):
                        visit(value, f"{location}[{index}]", is_schema_node=is_schema_node)

            for schema_name, schema in spec["components"]["schemas"].items():
                visit(schema, f"#/components/schemas/{schema_name}", is_schema_node=True)

            self.assertEqual([], sorted(missing_descriptions))

    def test_request_bodies_have_descriptions_for_reference_tables(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            for path, path_item in spec["paths"].items():
                for method, operation in path_item.items():
                    if method.startswith("x-"):
                        continue
                    request_body = operation.get("requestBody")
                    if not isinstance(request_body, dict) or not request_body.get("content"):
                        continue
                    self.assertTrue(
                        request_body.get("description"),
                        f"{method.upper()} {path} requestBody must describe the documented input payload",
                    )

    def test_component_reference_properties_are_wrapped_with_local_descriptions(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            direct_reference_properties: list[str] = []
            for schema_name, schema in spec["components"]["schemas"].items():
                if not isinstance(schema, dict):
                    continue
                properties = schema.get("properties")
                if not isinstance(properties, dict):
                    continue
                for property_name, property_schema in properties.items():
                    if isinstance(property_schema, dict) and "$ref" in property_schema:
                        direct_reference_properties.append(
                            f"{schema_name}.{property_name} -> {property_schema['$ref']}"
                        )

            self.assertEqual([], sorted(direct_reference_properties))

    def test_component_additional_properties_refs_are_wrapped_with_local_descriptions(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            direct_map_value_refs: list[str] = []
            missing_descriptions: list[str] = []

            def visit(node: object, location: str) -> None:
                if isinstance(node, dict):
                    additional_properties = node.get("additionalProperties")
                    if isinstance(additional_properties, dict):
                        if "$ref" in additional_properties:
                            direct_map_value_refs.append(
                                f"{location}.additionalProperties -> {additional_properties['$ref']}"
                            )
                        if not additional_properties.get("description"):
                            missing_descriptions.append(f"{location}.additionalProperties")
                    for key, value in node.items():
                        visit(value, f"{location}.{key}")
                elif isinstance(node, list):
                    for index, value in enumerate(node):
                        visit(value, f"{location}[{index}]")

            visit(spec["components"]["schemas"], "#/components/schemas")

            self.assertEqual([], sorted(direct_map_value_refs))
            self.assertEqual([], sorted(missing_descriptions))

    def test_component_union_reference_branches_are_wrapped_with_local_descriptions(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            direct_union_branches: list[str] = []

            def visit(node: object, location: str) -> None:
                if isinstance(node, dict):
                    for union_key in ["oneOf", "anyOf"]:
                        branches = node.get(union_key)
                        if not isinstance(branches, list):
                            continue
                        for index, branch in enumerate(branches):
                            if isinstance(branch, dict) and "$ref" in branch:
                                direct_union_branches.append(
                                    f"{location}.{union_key}[{index}] -> {branch['$ref']}"
                                )
                    for key, value in node.items():
                        visit(value, f"{location}.{key}")
                elif isinstance(node, list):
                    for index, value in enumerate(node):
                        visit(value, f"{location}[{index}]")

            visit(spec["components"]["schemas"], "#/components/schemas")

            self.assertEqual([], sorted(direct_union_branches))

    def test_component_union_branches_have_local_descriptions(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            missing_descriptions: list[str] = []

            def visit(node: object, location: str) -> None:
                if isinstance(node, dict):
                    for union_key in ["oneOf", "anyOf"]:
                        branches = node.get(union_key)
                        if not isinstance(branches, list):
                            continue
                        for index, branch in enumerate(branches):
                            if not isinstance(branch, dict):
                                continue
                            if not branch.get("description"):
                                missing_descriptions.append(f"{location}.{union_key}[{index}]")
                    for key, value in node.items():
                        visit(value, f"{location}.{key}")
                elif isinstance(node, list):
                    for index, value in enumerate(node):
                        visit(value, f"{location}[{index}]")

            visit(spec["components"]["schemas"], "#/components/schemas")

            self.assertEqual([], sorted(missing_descriptions))

    def test_component_schemas_use_openapi_30_nullable_instead_of_null_type(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            null_type_locations: list[str] = []

            def visit(node: object, location: str) -> None:
                if isinstance(node, dict):
                    if node.get("type") == "null":
                        null_type_locations.append(location)
                    for key, value in node.items():
                        visit(value, f"{location}.{key}")
                elif isinstance(node, list):
                    for index, value in enumerate(node):
                        visit(value, f"{location}[{index}]")

            visit(spec["components"]["schemas"], "#/components/schemas")

            self.assertEqual([], sorted(null_type_locations))

    def test_nullable_schemas_declare_openapi_30_type(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            nullable_without_type: list[str] = []

            def visit(node: object, location: str) -> None:
                if isinstance(node, dict):
                    if node.get("nullable") is True and "type" not in node:
                        nullable_without_type.append(location)
                    for key, value in node.items():
                        visit(value, f"{location}.{key}")
                elif isinstance(node, list):
                    for index, value in enumerate(node):
                        visit(value, f"{location}[{index}]")

            visit(spec["components"]["schemas"], "#/components/schemas")

            self.assertEqual([], sorted(nullable_without_type))

    def test_closed_object_components_expose_named_fields_for_codegen(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            closed_empty_objects: list[str] = []
            for schema_name, schema in spec["components"]["schemas"].items():
                if not isinstance(schema, dict):
                    continue
                if (
                    schema.get("type") == "object"
                    and schema.get("additionalProperties") is False
                    and not schema.get("properties")
                ):
                    closed_empty_objects.append(schema_name)

            self.assertEqual([], sorted(closed_empty_objects))

    def test_generated_reference_descriptions_split_camel_case_field_names(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            google_request = spec["components"]["schemas"]["GoogleGenerateContentRequest"]
            self.assertIn(
                "Tool config field",
                google_request["properties"]["toolConfig"]["description"],
            )
            self.assertIn(
                "System instruction field",
                google_request["properties"]["systemInstruction"]["description"],
            )
            google_response = spec["components"]["schemas"]["GoogleGenerateContentResponse"]
            self.assertIn(
                "Prompt feedback field",
                google_response["properties"]["promptFeedback"]["description"],
            )
            self.assertNotIn(
                "Toolconfig",
                google_request["properties"]["toolConfig"]["description"],
            )

    def test_product_openai_routes_document_typed_request_and_response_schemas(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = ClawRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            expected_refs = {
                ("/v1/chat/completions", "post"): (
                    "OpenAiChatCompletionRequest",
                    "OpenAiChatCompletion",
                ),
                ("/v1/responses", "post"): (
                    "OpenAiResponsesRequest",
                    "OpenAiResponse",
                ),
                ("/v1/embeddings", "post"): (
                    "OpenAiEmbeddingsRequest",
                    "OpenAiEmbeddingList",
                ),
            }

            for (path, method), (request_schema, response_schema) in expected_refs.items():
                operation = spec["paths"][path][method]
                request_ref = operation["requestBody"]["content"]["application/json"]["schema"]["$ref"]
                response_ref = operation["responses"]["200"]["content"]["application/json"]["schema"]["$ref"]
                self.assertEqual(
                    f"#/components/schemas/{request_schema}",
                    request_ref,
                    f"{method.upper()} {path} request must use the Rust contract schema",
                )
                self.assertEqual(
                    f"#/components/schemas/{response_schema}",
                    response_ref,
                    f"{method.upper()} {path} response must use the Rust contract schema",
                )
                self.assertNotEqual(
                    "#/components/schemas/JsonObject",
                    response_ref,
                    f"{method.upper()} {path} must not document a generic response object",
                )

            component_names = spec["components"]["schemas"].keys()
            for schema_name in [
                "OpenAiChatCompletion",
                "OpenAiChatCompletionChoice",
                "OpenAiChatMessage",
                "OpenAiChatImageUrl",
                "OpenAiChatInputAudio",
                "OpenAiChatFile",
                "OpenAiToolChoice",
                "OpenAiResponseFormat",
                "OpenAiJsonSchema",
                "OpenAiTokenUsage",
                "OpenAiResponse",
                "OpenAiResponseOutputItem",
                "OpenAiResponseInputContentPart",
                "OpenAiTextConfig",
                "OpenAiReasoningConfig",
                "OpenAiAnnotation",
                "OpenAiResponseUsage",
                "OpenAiEmbeddingList",
                "OpenAiEmbedding",
                "OpenAiEmbeddingUsage",
            ]:
                self.assertIn(schema_name, component_names)

            schemas = spec["components"]["schemas"]
            image_generation_request = schemas["OpenAiImageGenerationRequest"]
            self.assertIn("n", image_generation_request["properties"])
            self.assertEqual(
                "integer",
                image_generation_request["properties"]["n"]["type"],
            )
            self.assertEqual(1, image_generation_request["properties"]["n"]["minimum"])
            self.assertEqual(16, image_generation_request["properties"]["n"]["maximum"])
            self.assertDescribedSchemaRef(
                schemas["OpenAiChatContentPart"]["properties"]["image_url"],
                "#/components/schemas/OpenAiChatImageUrl",
            )
            self.assertDescribedSchemaRef(
                schemas["OpenAiChatContentPart"]["properties"]["input_audio"],
                "#/components/schemas/OpenAiChatInputAudio",
            )
            self.assertDescribedSchemaRef(
                schemas["OpenAiChatContentPart"]["properties"]["file"],
                "#/components/schemas/OpenAiChatFile",
            )
            self.assertDescribedSchemaRef(
                schemas["OpenAiChatCompletionRequest"]["properties"]["response_format"],
                "#/components/schemas/OpenAiResponseFormat",
            )
            self.assertDescribedSchemaRef(
                schemas["OpenAiChatCompletionRequest"]["properties"]["tool_choice"],
                "#/components/schemas/OpenAiToolChoice",
            )
            self.assertEqual(
                "#/components/schemas/OpenAiResponseInputContentPart",
                schemas["OpenAiResponseInputItem"]["properties"]["content"]["oneOf"][1]["items"]["$ref"],
            )
            response_input_branches = schemas["OpenAiResponsesRequest"]["properties"]["input"]["oneOf"]
            self.assertEqual("string", response_input_branches[0]["type"])
            self.assertTrue(response_input_branches[0]["description"])
            self.assertEqual("array", response_input_branches[1]["type"])
            self.assertEqual(
                "#/components/schemas/OpenAiResponseInputItem",
                response_input_branches[1]["items"]["$ref"],
            )
            self.assertTrue(response_input_branches[1]["description"])
            self.assertNotIn(
                {"type": "object"},
                response_input_branches,
                "Responses.input must not expose an untyped object branch in the API reference",
            )
            self.assertDescribedSchemaRef(
                schemas["OpenAiResponsesRequest"]["properties"]["text"],
                "#/components/schemas/OpenAiTextConfig",
            )
            self.assertDescribedSchemaRef(
                schemas["OpenAiResponsesRequest"]["properties"]["reasoning"],
                "#/components/schemas/OpenAiReasoningConfig",
            )
            self.assertEqual(
                "#/components/schemas/OpenAiAnnotation",
                schemas["OpenAiResponseOutputContent"]["properties"]["annotations"]["items"]["$ref"],
            )
            self.assertDescribedSchemaRef(
                schemas["OpenAiResponseUsage"]["properties"]["input_tokens_details"],
                "#/components/schemas/OpenAiResponseInputTokensDetails",
            )
            self.assertDescribedSchemaRef(
                schemas["OpenAiJsonSchema"]["properties"]["additionalProperties"],
                "#/components/schemas/OpenAiJsonSchemaAdditionalProperties",
            )
            for schema_name, field_name in [
                ("OpenAiChatCompletionRequest", "service_tier"),
                ("OpenAiResponsesRequest", "service_tier"),
                ("OpenAiResponsesRequest", "truncation"),
                ("OpenAiReasoningConfig", "effort"),
                ("OpenAiReasoningConfig", "summary"),
                ("OpenAiResponse", "status"),
                ("OpenAiIncompleteDetails", "reason"),
                ("OpenAiResponseOutputItem", "type"),
                ("OpenAiResponseOutputContent", "type"),
                ("OpenAiAnnotation", "type"),
            ]:
                self.assertIn(
                    "enum",
                    schemas[schema_name]["properties"][field_name],
                    f"{schema_name}.{field_name} must document the standard enum values",
                )
            self.assertNotIn(
                "additional_properties",
                schemas["OpenAiJsonSchema"]["properties"],
                "OpenAPI schema must use the official JSON Schema additionalProperties field name",
            )

    def test_public_openapi_schema_quality_for_reference_rendering(self) -> None:
        public_spec = json.loads(
            Path("apps/sdkwork-clawrouter-pc/public/openapi.json").read_text(encoding="utf-8")
        )
        provider_prefixes = self._provider_prefixes()

        for path, path_item in public_spec["paths"].items():
            self.assertNotIn("/v1/v1", path)
            provider = path.split("/", 2)[1] if path.startswith("/") and len(path.split("/")) > 1 else ""
            for method, operation in path_item.items():
                if method.startswith("x-"):
                    continue
                success_responses = [
                    response
                    for status, response in operation["responses"].items()
                    if status.startswith("2")
                ]
                self.assertTrue(success_responses, f"{method.upper()} {path} must document a 2xx response")
                for response in success_responses:
                    self.assertTrue(response.get("content"), f"{method.upper()} {path} success content")
                    for content_type, media_type in response.get("content", {}).items():
                        self.assertIn("schema", media_type, f"{method.upper()} {path} {content_type} schema")
                if provider in provider_prefixes:
                    self.assertIn("/", operation["tags"][0], f"{method.upper()} {path} provider tag")
                    serialized = json.dumps(operation, ensure_ascii=False).lower()
                    self.assertNotIn("passthrough", serialized)
                    self.assertNotIn("native", serialized)

        for schema_name, schema in public_spec["components"]["schemas"].items():
            for property_name, property_schema in schema.get("properties", {}).items():
                if "$ref" in property_schema:
                    continue
                self.assertTrue(
                    property_schema.get("description"),
                    f"{schema_name}.{property_name} must describe the API reference field",
                )

    def test_writes_and_checks_gateway_openapi_spec(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generator = ClawRouterGatewayOpenApiGenerator(root=root)

            output = generator.write()

            self.assertEqual(
                root / "apps" / "sdkwork-clawrouter-pc" / "public" / "openapi.json",
                output,
            )
            payload = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual("Claw Router Open API", payload["info"]["title"])
            self.assertTrue(generator.check().ok)

            payload["info"]["description"] = "stale but structurally valid public OpenAPI fixture"
            output.write_text(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            result = generator.check()
            self.assertFalse(result.ok)
            self.assertIn(f"Claw Router gateway OpenAPI spec is stale: {output}", result.messages)

    def _provider_prefixes(self) -> set[str]:
        return set(VENDOR_PROVIDER_PREFIXES)


if __name__ == "__main__":
    unittest.main()
