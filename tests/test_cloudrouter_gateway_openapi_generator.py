import json
import re
import tempfile
import unittest
from pathlib import Path

from tools.cloudrouter_gateway_openapi_generator import (
    CloudRouterGatewayOpenApiGenerator,
    VENDOR_PROVIDER_PREFIXES,
    audit_vendor_schema_quality,
)


class CloudRouterGatewayOpenApiGeneratorTest(unittest.TestCase):
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
            spec = CloudRouterGatewayOpenApiGenerator(root=root).generate()

            self.assertEqual("3.1.2", spec["openapi"])
            self.assertEqual(
                "https://json-schema.org/draft/2020-12/schema",
                spec["jsonSchemaDialect"],
            )
            self.assertEqual("Cloud Router Open API", spec["info"]["title"])
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
                "/kling/v1/videos/generations",
                "/vidu/ent/v2/text2video",
                "/vidu/ent/v2/img2video",
                "/vidu/ent/v2/reference2video",
                "/vidu/ent/v2/start-end2video",
                "/vidu/ent/v2/reference2image",
                "/vidu/ent/v2/tasks/{task_id}/creations",
            ]:
                self.assertIn(path, spec["paths"])

            # Vendor-absent namespaces must not be published: Midjourney has no
            # public API and nano-banana's official ingress is the Gemini
            # native generateImages surface.
            for absent in (
                "/midjourney/v1/images/generations",
                "/nano-banana/v1/images/generations",
            ):
                self.assertNotIn(absent, spec["paths"])

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
                "/kling/v1/videos/generations/{task_id}",
                "/vidu/ent/v2/tasks/{task_id}/creations",
            ]:
                self.assertIn(path, spec["paths"])

            anthropic_files = spec["paths"]["/anthropic/v1/files"]["post"]
            self.assertNotIn("x-provider", anthropic_files)
            self.assertNotIn("x-passthrough", anthropic_files)
            self.assertIn("multipart/form-data", anthropic_files["requestBody"]["content"])

    def test_documents_provider_native_list_query_parameters(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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

    def test_documents_volcengine_ark_media_official_fields(self) -> None:
        """Ark video/image bodies mirror the official reference pages field by field.

        Sources: docs.volcengine.com create-video-generation-task-api,
        get-video-generation-task-api, and image-generation-api. The same wire is
        served by the ByteDance Ark doors, so both families are pinned here.
        """

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        schemas = spec["components"]["schemas"]
        expected_video_create_fields = {
            "model",
            "content",
            "omni_reference_task_type",
            "resolution",
            "ratio",
            "duration",
            "frames",
            "generate_audio",
            "watermark",
            "output_format",
            "seed",
            "camera_fixed",
            "return_last_frame",
            "draft",
            "service_tier",
            "callback_url",
            "execution_expires_after",
            "priority",
            "safety_identifier",
            "tools",
        }
        for schema_name in (
            "VolcengineContentGenerationTaskCreateRequest",
            "BytedanceVideoGenerationRequest",
        ):
            request = schemas[schema_name]
            self.assertEqual(["model", "content"], request["required"], schema_name)
            self.assertEqual(expected_video_create_fields, set(request["properties"]), schema_name)
            self.assertNotIn("metadata", request["properties"], schema_name)
            self.assertEqual(
                ["auto", "reference", "edit", "extend"],
                request["properties"]["omni_reference_task_type"]["enum"],
            )
            self.assertEqual("auto", request["properties"]["omni_reference_task_type"]["default"])
            self.assertEqual(
                ["480p", "720p", "1080p", "4k"],
                request["properties"]["resolution"]["enum"],
            )
            self.assertEqual(
                ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9", "adaptive"],
                request["properties"]["ratio"]["enum"],
            )
            self.assertEqual(-1, request["properties"]["duration"]["minimum"])
            self.assertEqual(29, request["properties"]["frames"]["minimum"])
            self.assertEqual(289, request["properties"]["frames"]["maximum"])
            self.assertTrue(request["properties"]["generate_audio"]["default"])
            self.assertFalse(request["properties"]["watermark"]["default"])
            self.assertEqual(
                ["mp4", "mov"], request["properties"]["output_format"]["enum"]
            )
            self.assertEqual(-1, request["properties"]["seed"]["minimum"])
            self.assertEqual(2147483647, request["properties"]["seed"]["maximum"])
            self.assertFalse(request["properties"]["camera_fixed"]["default"])
            self.assertFalse(request["properties"]["return_last_frame"]["default"])
            self.assertFalse(request["properties"]["draft"]["default"])
            self.assertEqual(
                ["default", "flex"], request["properties"]["service_tier"]["enum"]
            )
            self.assertEqual(
                172800, request["properties"]["execution_expires_after"]["default"]
            )
            self.assertEqual(3600, request["properties"]["execution_expires_after"]["minimum"])
            self.assertEqual(259200, request["properties"]["execution_expires_after"]["maximum"])
            self.assertEqual(0, request["properties"]["priority"]["minimum"])
            self.assertEqual(9, request["properties"]["priority"]["maximum"])
            self.assertEqual(64, request["properties"]["safety_identifier"]["maxLength"])
            self.assertEqual(
                {"$ref": "#/components/schemas/ArkWebSearchTool"},
                request["properties"]["tools"]["items"],
            )

        content_part = schemas["VolcengineContentPart"]
        self.assertEqual(["type"], content_part["required"])
        self.assertEqual(
            {"type", "text", "image_url", "video_url", "audio_url", "draft_task", "role"},
            set(content_part["properties"]),
        )
        self.assertNotIn("file_id", content_part["properties"])
        self.assertEqual(
            ["text", "image_url", "video_url", "audio_url", "draft_task"],
            content_part["properties"]["type"]["enum"],
        )
        for media_field in ("image_url", "video_url", "audio_url"):
            self.assertEqual(
                [{"$ref": f"#/components/schemas/Ark{media_field.split('_')[0].capitalize()}Source"}],
                content_part["properties"][media_field]["allOf"],
            )
            self.assertEqual(
                ["url"],
                schemas[f"Ark{media_field.split('_')[0].capitalize()}Source"]["required"],
            )
        self.assertEqual(
            [{"$ref": "#/components/schemas/ArkDraftTask"}],
            content_part["properties"]["draft_task"]["allOf"],
        )
        self.assertEqual(
            [
                "first_frame",
                "last_frame",
                "reference_image",
                "reference_video",
                "reference_audio",
            ],
            content_part["properties"]["role"]["enum"],
        )

        create_response = schemas["VolcengineContentGenerationTaskCreateResponse"]
        self.assertEqual({"id"}, set(create_response["properties"]))

        for schema_name in (
            "VolcengineContentGenerationTask",
            "BytedanceVideoGenerationTask",
        ):
            task = schemas[schema_name]
            self.assertEqual(
                [
                    "queued",
                    "running",
                    "cancelled",
                    "succeeded",
                    "failed",
                    "expired",
                ],
                task["properties"]["status"]["enum"],
                schema_name,
            )
            self.assertEqual(
                [{"$ref": "#/components/schemas/ArkVideoTaskContent"}],
                task["properties"]["content"]["allOf"],
                schema_name,
            )
            self.assertEqual(
                [{"$ref": "#/components/schemas/ArkVideoUsage"}],
                task["properties"]["usage"]["allOf"],
                schema_name,
            )
            self.assertIn("framespersecond", task["properties"], schema_name)
            self.assertIn("execution_expires_after", task["properties"], schema_name)
            self.assertNotIn("result", task["properties"], schema_name)
        self.assertEqual(
            {"video_url", "last_frame_url"},
            set(schemas["ArkVideoTaskContent"]["properties"]),
        )

        expected_image_fields = {
            "model",
            "prompt",
            "image",
            "layer_decomposition",
            "size",
            "optimize_prompt_options",
            "output_format",
            "background",
            "response_format",
            "sequential_image_generation",
            "sequential_image_generation_options",
            "stream",
            "tools",
            "watermark",
        }
        for schema_name in (
            "VolcengineImageGenerationRequest",
            "BytedanceImageGenerationRequest",
        ):
            request = schemas[schema_name]
            self.assertEqual(["model"], request["required"], schema_name)
            self.assertEqual(expected_image_fields, set(request["properties"]), schema_name)
            self.assertNotIn("seed", request["properties"], schema_name)
            self.assertEqual(2, len(request["properties"]["image"]["oneOf"]))
            self.assertEqual(
                ["png", "jpeg"], request["properties"]["output_format"]["enum"]
            )
            self.assertEqual(
                ["transparent", "opaque"], request["properties"]["background"]["enum"]
            )
            self.assertEqual(
                ["auto", "disabled"],
                request["properties"]["sequential_image_generation"]["enum"],
            )
            self.assertEqual(15, request["properties"]["sequential_image_generation_options"]["properties"]["max_images"]["maximum"])
            self.assertTrue(request["properties"]["watermark"]["default"])

        image_response = schemas["VolcengineImageGenerationResponse"]
        self.assertEqual(
            {"created", "model", "data", "usage", "tools", "error"},
            set(image_response["properties"]),
        )
        self.assertEqual(
            {"url", "b64_json", "size", "output_format", "z_index", "name", "description", "bounding_box", "error"},
            set(schemas["ArkImageGenerationData"]["properties"]),
        )
        self.assertEqual(
            {"generated_images", "input_images", "output_tokens", "total_tokens", "tool_usage"},
            set(schemas["ArkImageUsage"]["properties"]),
        )

    def test_documents_alibaba_dashscope_media_contract(self) -> None:
        """DashScope image/video bodies and the mandatory async header.

        Sources: help.aliyun.com text-to-video-api-reference,
        image-to-video-api-reference, and text-to-image-v2-api-reference
        (the `text2image/image-synthesis` legacy section).
        """

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        schemas = spec["components"]["schemas"]
        for path in (
            "/alibaba/api/v1/services/aigc/text2image/image-synthesis",
            "/alibaba/api/v1/services/aigc/video-generation/video-synthesis",
        ):
            operation = spec["paths"][path]["post"]
            headers = [item for item in operation["parameters"] if item.get("in") == "header"]
            self.assertEqual(["X-DashScope-Async"], [item["name"] for item in headers], path)
            self.assertTrue(headers[0]["required"], path)
            self.assertEqual("enable", headers[0]["schema"]["default"], path)

        image = schemas["AlibabaImageGenerationRequest"]
        self.assertEqual(["model", "input"], image["required"])
        self.assertEqual({"prompt", "negative_prompt"}, set(image["properties"]["input"]["properties"]))
        self.assertEqual(["prompt"], image["properties"]["input"]["required"])
        self.assertEqual(
            {"size", "n", "prompt_extend", "watermark", "seed"},
            set(image["properties"]["parameters"]["properties"]),
        )
        self.assertEqual(1, image["properties"]["parameters"]["properties"]["n"]["minimum"])
        self.assertEqual(4, image["properties"]["parameters"]["properties"]["n"]["maximum"])
        self.assertTrue(image["properties"]["parameters"]["properties"]["prompt_extend"]["default"])

        video = schemas["AlibabaVideoGenerationRequest"]
        self.assertEqual(["model", "input"], video["required"])
        self.assertEqual(
            {"prompt", "negative_prompt", "img_url", "audio_url", "template"},
            set(video["properties"]["input"]["properties"]),
        )
        parameters = video["properties"]["parameters"]
        self.assertEqual(
            {"resolution", "ratio", "duration", "prompt_extend", "watermark", "seed"},
            set(parameters["properties"]),
        )
        self.assertEqual(
            ["480P", "720P", "1080P"], parameters["properties"]["resolution"]["enum"]
        )
        self.assertEqual(
            ["16:9", "9:16", "1:1", "4:3", "3:4"], parameters["properties"]["ratio"]["enum"]
        )
        self.assertEqual(2, parameters["properties"]["duration"]["minimum"])
        self.assertEqual(15, parameters["properties"]["duration"]["maximum"])

        task = schemas["AlibabaAsyncTask"]
        self.assertEqual(
            ["PENDING", "RUNNING", "SUCCEEDED", "FAILED", "CANCELED", "UNKNOWN"],
            task["properties"]["task_status"]["enum"],
        )
        for field in ("submit_time", "scheduled_time", "end_time", "orig_prompt", "video_url"):
            self.assertIn(field, task["properties"])
        usage = schemas["AlibabaTaskUsage"]
        self.assertEqual(
            {"duration", "input_video_duration", "output_video_duration", "SR", "ratio", "image_count"},
            set(usage["properties"]),
        )

    def test_documents_elevenlabs_text_to_speech_official_fields(self) -> None:
        """ElevenLabs TTS body mirrors `Body_text_to_speech_full`.

        Source: the vendor's published OpenAPI document
        (`https://api.elevenlabs.io/openapi.json`), cached under
        `.tmp-vendor-specs/elevenlabs.json`.
        """

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        schemas = spec["components"]["schemas"]
        request = schemas["ElevenLabsTextToSpeechRequest"]
        self.assertEqual(["text"], request["required"])
        self.assertEqual(
            {
                "text",
                "model_id",
                "language_code",
                "voice_settings",
                "pronunciation_dictionary_locators",
                "seed",
                "previous_text",
                "next_text",
                "previous_request_ids",
                "next_request_ids",
                "use_pvc_as_ivc",
                "apply_text_normalization",
                "apply_language_text_normalization",
                "audio_effects",
            },
            set(request["properties"]),
        )
        self.assertEqual("eleven_multilingual_v2", request["properties"]["model_id"]["default"])
        self.assertEqual(
            ["auto", "on", "off"], request["properties"]["apply_text_normalization"]["enum"]
        )
        self.assertEqual("auto", request["properties"]["apply_text_normalization"]["default"])
        self.assertFalse(
            request["properties"]["apply_language_text_normalization"]["default"]
        )
        self.assertEqual(4294967295, request["properties"]["seed"]["maximum"])
        self.assertEqual(3, request["properties"]["pronunciation_dictionary_locators"]["maxItems"])
        self.assertEqual(
            {"$ref": "#/components/schemas/ElevenLabsPronunciationDictionaryLocator"},
            request["properties"]["pronunciation_dictionary_locators"]["items"],
        )
        self.assertEqual(
            [{"$ref": "#/components/schemas/ElevenLabsVoiceSettings"}],
            request["properties"]["voice_settings"]["allOf"],
        )
        self.assertEqual(
            [{"$ref": "#/components/schemas/ElevenLabsAudioEffects"}],
            request["properties"]["audio_effects"]["allOf"],
        )
        self.assertEqual(
            {
                "stability",
                "similarity_boost",
                "style",
                "use_speaker_boost",
                "speed",
                "clone_strength",
            },
            set(schemas["ElevenLabsVoiceSettings"]["properties"]),
        )
        self.assertEqual(
            {
                "filter_preset_id",
                "distance",
                "environment_id",
                "background_noise_id",
                "send_level",
                "pan",
            },
            set(schemas["ElevenLabsAudioEffects"]["properties"]),
        )
        self.assertEqual(
            ["pronunciation_dictionary_id"],
            schemas["ElevenLabsPronunciationDictionaryLocator"]["required"],
        )

    def test_documents_kling_image_and_video_to_audio_official_fields(self) -> None:
        """Kling image + video-to-audio bodies match the vendor's markdown API docs.

        Sources: klingai.com document-api image 3.0-omni image-generation and
        video audio-generation video-to-audio.
        """

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        schemas = spec["components"]["schemas"]
        image = schemas["KlingImageGenerationRequest"]
        self.assertEqual(["prompt"], image["required"])
        self.assertEqual(
            {
                "model_name",
                "prompt",
                "negative_prompt",
                "image",
                "image_reference",
                "image_fidelity",
                "human_fidelity",
                "element_list",
                "resolution",
                "n",
                "aspect_ratio",
                "watermark_info",
                "callback_url",
                "external_task_id",
            },
            set(image["properties"]),
        )
        self.assertNotIn("image_reference_list", image["properties"])
        self.assertEqual(["kling-v2-1", "kling-v3"], image["properties"]["model_name"]["enum"])
        self.assertEqual("kling-v3", image["properties"]["model_name"]["default"])
        self.assertEqual(["subject", "face"], image["properties"]["image_reference"]["enum"])
        self.assertEqual(["1k", "2k"], image["properties"]["resolution"]["enum"])
        self.assertEqual(
            ["16:9", "9:16", "1:1", "4:3", "3:4", "3:2", "2:3", "21:9"],
            image["properties"]["aspect_ratio"]["enum"],
        )
        self.assertEqual(0.5, image["properties"]["image_fidelity"]["default"])
        self.assertEqual(0.45, image["properties"]["human_fidelity"]["default"])
        self.assertEqual(
            {"$ref": "#/components/schemas/KlingElementReference"},
            image["properties"]["element_list"]["items"],
        )
        self.assertEqual(
            ["element_id"], schemas["KlingElementReference"]["required"]
        )

        task = schemas["KlingImageGenerationTask"]
        self.assertEqual({"code", "message", "request_id", "data"}, set(task["properties"]))
        data = schemas["KlingImageTaskData"]
        self.assertEqual(
            {
                "task_id",
                "task_status",
                "task_status_msg",
                "task_info",
                "created_at",
                "updated_at",
                "task_result",
            },
            set(data["properties"]),
        )
        self.assertEqual(
            ["submitted", "processing", "succeed", "failed"],
            data["properties"]["task_status"]["enum"],
        )
        self.assertEqual(
            {"index", "url"},
            set(schemas["KlingImageResult"]["properties"]),
        )

        video_to_audio = schemas["KlingVideoToAudioRequest"]
        self.assertEqual(
            {
                "video_id",
                "video_url",
                "sound_effect_prompt",
                "bgm_prompt",
                "asmr_mode",
                "external_task_id",
                "callback_url",
            },
            set(video_to_audio["properties"]),
        )
        self.assertNotIn("prompt", video_to_audio["properties"])
        self.assertFalse(video_to_audio["properties"]["asmr_mode"]["default"])

    def test_documents_anthropic_messages_official_fields(self) -> None:
        """Anthropic Messages body carries the fields the vendor documents.

        Source: docs.anthropic.com/en/api/messages Markdown, `Create a Message`
        body parameters.
        """

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        schemas = spec["components"]["schemas"]
        request = schemas["AnthropicMessageCreateRequest"]
        self.assertEqual(["model", "messages", "max_tokens"], request["required"])
        for field in (
            "cache_control",
            "container",
            "diagnostics",
            "inference_geo",
            "output_config",
            "service_tier",
            "speed",
        ):
            self.assertIn(field, request["properties"])
        self.assertEqual(0, request["properties"]["max_tokens"]["minimum"])
        self.assertEqual(
            ["auto", "standard_only"], request["properties"]["service_tier"]["enum"]
        )
        self.assertEqual(["standard", "fast"], request["properties"]["speed"]["enum"])
        self.assertEqual(
            [{"$ref": "#/components/schemas/AnthropicOutputConfig"}],
            request["properties"]["output_config"]["allOf"],
        )
        self.assertEqual(
            ["low", "medium", "high", "xhigh", "max"],
            schemas["AnthropicOutputConfig"]["properties"]["effort"]["enum"],
        )
        self.assertEqual(
            ["json_schema"],
            schemas["AnthropicOutputFormat"]["properties"]["type"]["enum"],
        )
        self.assertEqual(
            ["5m", "1h"], schemas["AnthropicCacheControl"]["properties"]["ttl"]["enum"]
        )
        self.assertEqual("5m", schemas["AnthropicCacheControl"]["properties"]["ttl"]["default"])
        self.assertEqual(20, schemas["AnthropicContainer"]["properties"]["skills"]["maxItems"])
        self.assertEqual(
            ["anthropic", "custom"], schemas["AnthropicSkill"]["properties"]["type"]["enum"]
        )
        self.assertEqual(256, schemas["AnthropicDiagnostics"]["properties"]["previous_message_id"]["maxLength"])
        self.assertEqual(
            {"user_id"}, set(schemas["AnthropicMetadata"]["properties"])
        )

    def test_documents_zhipu_image_and_video_official_fields(self) -> None:
        """Zhipu image/video bodies mirror the vendor OpenAPI embedded in its docs.

        Sources: docs.bigmodel.cn 图像生成、视频生成(异步)、查询异步结果.
        """

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        schemas = spec["components"]["schemas"]
        image = schemas["ZhipuImageGenerationRequest"]
        self.assertEqual(["model", "prompt"], image["required"])
        self.assertEqual(
            ["glm-image", "cogview-4-250304", "cogview-4", "cogview-3-flash"],
            image["properties"]["model"]["enum"],
        )
        self.assertEqual(["hd", "standard"], image["properties"]["quality"]["enum"])
        self.assertEqual("hd", image["properties"]["quality"]["default"])
        self.assertEqual("1280x1280", image["properties"]["size"]["default"])
        self.assertEqual(6, image["properties"]["user_id"]["minLength"])
        self.assertEqual(128, image["properties"]["user_id"]["maxLength"])

        image_response = schemas["ZhipuImageGenerationResponse"]
        self.assertEqual(
            {"created", "data", "content_filter"}, set(image_response["properties"])
        )
        self.assertEqual(
            {"$ref": "#/components/schemas/ZhipuImageResult"},
            image_response["properties"]["data"]["items"],
        )
        self.assertEqual({"url"}, set(schemas["ZhipuImageResult"]["properties"]))
        self.assertEqual(
            ["assistant", "user", "history"],
            schemas["ZhipuContentFilter"]["properties"]["role"]["enum"],
        )
        self.assertEqual(3, schemas["ZhipuContentFilter"]["properties"]["level"]["maximum"])

        video = schemas["ZhipuVideoGenerationRequest"]
        self.assertEqual(["model"], video["required"])
        self.assertEqual(3, len(video["properties"]["image_url"]["oneOf"]))
        self.assertEqual(2, video["properties"]["image_url"]["oneOf"][2]["minItems"])
        self.assertEqual([30, 60], video["properties"]["fps"]["enum"])
        self.assertEqual(30, video["properties"]["fps"]["default"])
        self.assertEqual([5, 10], video["properties"]["duration"]["enum"])
        self.assertEqual(5, video["properties"]["duration"]["default"])
        self.assertEqual(["speed", "quality"], video["properties"]["quality"]["enum"])
        self.assertFalse(video["properties"]["with_audio"]["default"])
        self.assertEqual(6, video["properties"]["user_id"]["minLength"])

        task = schemas["ZhipuVideoGenerationTask"]
        self.assertEqual(
            ["PROCESSING", "SUCCESS", "FAIL"], task["properties"]["task_status"]["enum"]
        )
        self.assertEqual(
            {"$ref": "#/components/schemas/ZhipuVideoResult"},
            task["properties"]["video_result"]["items"],
        )
        self.assertEqual(
            {"$ref": "#/components/schemas/ZhipuImageResult"},
            task["properties"]["image_result"]["items"],
        )
        self.assertEqual(
            {"url", "cover_image_url"}, set(schemas["ZhipuVideoResult"]["properties"])
        )

    def test_documents_minimax_music_and_tts_official_fields(self) -> None:
        """MiniMax music/TTS bodies mirror the OpenAPI embedded in the vendor docs.

        Sources: platform.minimax.io music-generation and speech-t2a-http.
        """

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        schemas = spec["components"]["schemas"]
        music = schemas["MiniMaxMusicGenerationRequest"]
        self.assertEqual(["model"], music["required"])
        self.assertEqual(
            [
                "music-3.0",
                "music-2.6",
                "music-cover",
                "music-3.0-free",
                "music-2.6-free",
                "music-cover-free",
            ],
            music["properties"]["model"]["enum"],
        )
        self.assertEqual(2000, music["properties"]["prompt"]["maxLength"])
        self.assertEqual(1, music["properties"]["lyrics"]["minLength"])
        self.assertEqual(3500, music["properties"]["lyrics"]["maxLength"])
        self.assertEqual(["url", "hex"], music["properties"]["output_format"]["enum"])
        self.assertEqual("hex", music["properties"]["output_format"]["default"])
        self.assertFalse(music["properties"]["stream"]["default"])
        self.assertFalse(music["properties"]["is_instrumental"]["default"])
        for field in ("audio_url", "audio_base64", "cover_feature_id"):
            self.assertIn(field, music["properties"])
        audio_setting = schemas["MiniMaxMusicAudioSetting"]
        self.assertEqual([16000, 24000, 32000, 44100], audio_setting["properties"]["sample_rate"]["enum"])
        self.assertEqual([32000, 64000, 128000, 256000], audio_setting["properties"]["bitrate"]["enum"])
        self.assertEqual(["mp3", "wav", "pcm"], audio_setting["properties"]["format"]["enum"])

        tts = schemas["MinimaxTextToSpeechRequest"]
        self.assertEqual(["model", "text"], tts["required"])
        self.assertEqual(
            [
                "speech-2.8-hd",
                "speech-2.8-turbo",
                "speech-2.6-hd",
                "speech-2.6-turbo",
                "speech-02-hd",
                "speech-02-turbo",
                "speech-01-hd",
                "speech-01-turbo",
            ],
            tts["properties"]["model"]["enum"],
        )
        self.assertEqual(10000, tts["properties"]["text"]["maxLength"])
        for field in (
            "stream_options",
            "timbre_weights",
            "text_normalization_mode",
            "voice_modify",
            "subtitle_type",
            "output_format",
        ):
            self.assertIn(field, tts["properties"])
        self.assertEqual(
            ["sentence", "word", "word_streaming"],
            tts["properties"]["subtitle_type"]["enum"],
        )
        self.assertEqual("sentence", tts["properties"]["subtitle_type"]["default"])
        self.assertEqual(["url", "hex"], tts["properties"]["output_format"]["enum"])
        self.assertEqual(
            ["basic", "quality"], tts["properties"]["text_normalization_mode"]["enum"]
        )
        self.assertEqual(
            ["voice_id", "weight"], schemas["MinimaxTimbreWeight"]["required"]
        )
        self.assertEqual(
            ["spacious_echo", "auditorium_echo", "lofi_telephone", "robotic"],
            schemas["MinimaxVoiceModify"]["properties"]["sound_effects"]["enum"],
        )
        self.assertEqual(-100, schemas["MinimaxVoiceModify"]["properties"]["pitch"]["minimum"])
        self.assertEqual(100, schemas["MinimaxVoiceModify"]["properties"]["pitch"]["maximum"])

    def test_documents_stability_multipart_transport(self) -> None:
        """Stability serves multipart/form-data, not JSON bodies.

        Source: https://platform.stability.ai/llms.txt ("Multipart form POST").
        The image door publishes the JSON response and therefore requires
        `Accept: application/json`; the audio door publishes audio bytes and
        must not require it.
        """

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        image = spec["paths"]["/stability_ai/v2beta/stable-image/generate/{mode}"]["post"]
        audio = spec["paths"]["/stability_ai/v2beta/audio/stable-audio-2/text-to-audio"]["post"]
        for operation, label in ((image, "image"), (audio, "audio")):
            content = operation["requestBody"]["content"]
            self.assertIn("multipart/form-data", content, label)
            self.assertNotIn("application/json", content, label)
            schema_ref = content["multipart/form-data"]["schema"]["$ref"]
            self.assertTrue(schema_ref.startswith("#/components/schemas/Stability"), label)

        image_headers = {
            parameter["name"] for parameter in image["parameters"] if parameter.get("in") == "header"
        }
        audio_headers = {
            parameter["name"] for parameter in audio["parameters"] if parameter.get("in") == "header"
        }
        self.assertIn("Accept", image_headers)
        self.assertNotIn("Accept", audio_headers)
        self.assertIn("audio/mpeg", audio["responses"]["200"]["content"])

    def test_documents_luma_generation_official_fields(self) -> None:
        """Luma `GenerationRequest` mirrors the Dream Machine OpenAPI.

        Source: docs.lumalabs.ai/reference/creategeneration.md (embedded
        OpenAPI 3.1 definition, `GenerationRequest`).
        """

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        schemas = spec["components"]["schemas"]
        request = schemas["LumaVideoGenerationRequest"]
        self.assertEqual(["model"], request["required"])
        self.assertEqual(
            {
                "generation_type",
                "prompt",
                "aspect_ratio",
                "loop",
                "keyframes",
                "callback_url",
                "model",
                "resolution",
                "duration",
                "concepts",
            },
            set(request["properties"]),
        )
        self.assertEqual(["video"], request["properties"]["generation_type"]["enum"])
        self.assertEqual("video", request["properties"]["generation_type"]["default"])
        self.assertEqual(
            ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9", "9:21"],
            request["properties"]["aspect_ratio"]["enum"],
        )
        self.assertEqual("16:9", request["properties"]["aspect_ratio"]["default"])
        self.assertEqual(["ray-2", "ray-flash-2"], request["properties"]["model"]["enum"])
        self.assertEqual("ray-2", request["properties"]["model"]["default"])
        self.assertEqual(
            [{"$ref": "#/components/schemas/LumaKeyframes"}],
            request["properties"]["keyframes"]["allOf"],
        )
        self.assertEqual(
            {"frame0", "frame1"}, set(schemas["LumaKeyframes"]["properties"])
        )
        self.assertEqual(
            ["image", "generation"],
            schemas["LumaKeyframe"]["properties"]["type"]["enum"],
        )
        self.assertEqual(["key"], schemas["LumaConcept"]["required"])
        task = schemas["LumaVideoGenerationTask"]
        self.assertEqual(
            ["queued", "dreaming", "completed", "failed"],
            task["properties"]["state"]["enum"],
        )
        self.assertEqual(
            [{"$ref": "#/components/schemas/LumaGenerationAssets"}],
            task["properties"]["assets"]["allOf"],
        )
        self.assertEqual(
            {"video", "image"}, set(schemas["LumaGenerationAssets"]["properties"])
        )
        self.assertIn("model", task["properties"])
        self.assertIn("request", task["properties"])

    def test_documents_openai_media_official_fields(self) -> None:
        """OpenAI /v1 image, speech, and video bodies mirror the vendor spec.

        Source: github.com/openai/openai-openapi openapi.yaml.
        """

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        schemas = spec["components"]["schemas"]
        image = schemas["OpenAiImageGenerationRequest"]
        self.assertEqual(["model", "prompt"], image["required"])
        for field in (
            "frame_count",
            "frame_duration_ms",
            "complexity",
            "svg",
            "output_format",
            "output_compression",
            "stream",
            "partial_images",
            "moderation",
            "background",
            "style",
            "safety_identifier",
            "user",
        ):
            self.assertIn(field, image["properties"], field)
        self.assertEqual(10, image["properties"]["n"]["maximum"])
        self.assertEqual(
            ["png", "webp", "jpeg", "gif", "svg"], image["properties"]["output_format"]["enum"]
        )
        self.assertEqual(3, image["properties"]["partial_images"]["maximum"])

        edit = schemas["OpenAiImageEditRequest"]
        self.assertEqual(["images", "prompt"], edit["required"])
        self.assertNotIn("image", edit["properties"])
        self.assertEqual(16, edit["properties"]["images"]["maxItems"])
        self.assertEqual(
            ["high", "low"], edit["properties"]["input_fidelity"]["enum"]
        )
        multipart = schemas["OpenAiImageEditMultipartRequest"]
        self.assertIn("image", multipart["properties"])

        speech = schemas["OpenAiSpeechCreateRequest"]
        self.assertEqual(
            {"model", "input", "instructions", "voice", "response_format", "speed", "stream_format"},
            set(speech["properties"]),
        )
        self.assertNotIn("metadata", speech["properties"])
        self.assertEqual(4096, speech["properties"]["input"]["maxLength"])
        self.assertEqual(0.25, speech["properties"]["speed"]["minimum"])
        self.assertEqual(4, speech["properties"]["speed"]["maximum"])
        self.assertEqual(
            ["sse", "audio"], speech["properties"]["stream_format"]["enum"]
        )
        self.assertEqual(
            ["mp3", "opus", "aac", "flac", "wav", "pcm"],
            speech["properties"]["response_format"]["enum"],
        )

        video = schemas["OpenAiVideoCreateRequest"]
        self.assertEqual(["prompt"], video["required"])
        self.assertEqual(
            {"model", "prompt", "input_reference", "seconds", "size"},
            set(video["properties"]),
        )
        self.assertEqual(
            ["4", "8", "12"], video["properties"]["seconds"]["enum"]
        )
        self.assertEqual(
            ["720x1280", "1280x720", "1024x1792", "1792x1024"],
            video["properties"]["size"]["enum"],
        )
        self.assertEqual(
            ["video", "prompt"], schemas["OpenAiVideoEditRequest"]["required"]
        )
        self.assertEqual(
            ["video", "prompt", "seconds"],
            schemas["OpenAiVideoExtendRequest"]["required"],
        )
        self.assertEqual(["prompt"], schemas["OpenAiVideoRemixRequest"]["required"])
        self.assertIn(
            "output_expires_after", schemas["OpenAiBatchCreateRequest"]["properties"]
        )
        self.assertIn(
            "stream_options", schemas["OpenAiCompletionCreateRequest"]["properties"]
        )

    def test_documents_openai_platform_operation_fields(self) -> None:
        """OpenAI assistants, conversations, Responses helpers, runs, uploads,
        vector stores, and voices match the vendor OpenAPI."""

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        schemas = spec["components"]["schemas"]
        effort = ["none", "minimal", "low", "medium", "high", "xhigh", "max"]
        for name in ("OpenAiAssistantCreateRequest", "OpenAiAssistantUpdateRequest"):
            self.assertEqual(effort, schemas[name]["properties"]["reasoning_effort"]["enum"], name)

        conversation = schemas["OpenAiConversationItemCreateRequest"]
        self.assertEqual(["items"], conversation["required"])
        self.assertEqual(1, conversation["properties"]["items"]["minItems"])

        token_count = schemas["OpenAiResponseInputTokenCountRequest"]
        self.assertIsNone(token_count.get("required"))
        for field in ("previous_response_id", "personality", "conversation", "parallel_tool_calls"):
            self.assertIn(field, token_count["properties"])

        compact = schemas["OpenAiResponseCompactRequest"]
        self.assertEqual(["model"], compact["required"])
        self.assertEqual(
            ["in_memory", "24h"], compact["properties"]["prompt_cache_retention"]["enum"]
        )
        self.assertEqual(
            ["auto", "default", "fast", "flex", "priority"],
            compact["properties"]["service_tier"]["enum"],
        )
        self.assertNotIn("metadata", compact["properties"])

        run = schemas["OpenAiRunCreateRequest"]
        for field in (
            "additional_messages",
            "max_completion_tokens",
            "truncation_strategy",
            "parallel_tool_calls",
        ):
            self.assertIn(field, run["properties"])
        self.assertEqual(
            effort, run["properties"]["reasoning_effort"]["enum"]
        )

        thread_and_run = schemas["OpenAiThreadAndRunCreateRequest"]
        for field in ("tool_resources", "parallel_tool_calls", "max_prompt_tokens"):
            self.assertIn(field, thread_and_run["properties"])

        self.assertIn("expires_after", schemas["OpenAiUploadCreateRequest"]["properties"])
        self.assertIn("description", schemas["OpenAiVectorStoreCreateRequest"]["properties"])
        self.assertIn(
            "files", schemas["OpenAiVectorStoreFileBatchCreateRequest"]["properties"]
        )
        self.assertIsNone(schemas["OpenAiVectorStoreFileBatchCreateRequest"].get("required"))

        voice = schemas["OpenAiVoiceCreateRequest"]
        self.assertEqual(["type", "name", "prompt"], voice["required"])
        self.assertEqual(["prompt"], voice["properties"]["type"]["enum"])
        self.assertEqual(2000, voice["properties"]["prompt"]["maxLength"])
        self.assertNotIn("metadata", voice["properties"])

    def test_documents_openai_realtime_official_fields(self) -> None:
        """Realtime client-secret, session, transcription, and call actions.

        Source: github.com/openai/openai-openapi openapi.yaml.
        """

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        schemas = spec["components"]["schemas"]
        client_secret = schemas["OpenAiRealtimeClientSecretCreateRequest"]
        self.assertEqual({"expires_after", "session"}, set(client_secret["properties"]))
        self.assertNotIn("required", client_secret)

        session = schemas["OpenAiRealtimeSessionCreateRequest"]
        self.assertEqual(["client_secret"], session["required"])
        for field in (
            "input_audio_format",
            "output_audio_format",
            "input_audio_transcription",
            "speed",
            "tracing",
            "turn_detection",
            "tools",
            "tool_choice",
            "temperature",
            "max_response_output_tokens",
            "truncation",
            "prompt",
        ):
            self.assertIn(field, session["properties"], field)
        self.assertNotIn("model", session["properties"])
        self.assertNotIn("metadata", session["properties"])
        self.assertEqual(0.25, session["properties"]["speed"]["minimum"])
        self.assertEqual(1.5, session["properties"]["speed"]["maximum"])

        transcription = schemas["OpenAiRealtimeTranscriptionSessionCreateRequest"]
        self.assertEqual(
            ["pcm16", "g711_ulaw", "g711_alaw"],
            transcription["properties"]["input_audio_format"]["enum"],
        )
        self.assertIn("input_audio_noise_reduction", transcription["properties"])
        self.assertIn("include", transcription["properties"])

        accept = schemas["OpenAiRealtimeCallActionRequest"]
        self.assertEqual(["type"], accept["required"])
        for field in ("output_modalities", "max_output_tokens", "truncation", "prompt"):
            self.assertIn(field, accept["properties"], field)
        refer = schemas["OpenAiRealtimeCallReferRequest"]
        self.assertEqual(["target_uri"], refer["required"])
        self.assertNotIn("target", refer["properties"])
        reject = schemas["OpenAiRealtimeCallRejectRequest"]
        self.assertEqual({"status_code"}, set(reject["properties"]))
        self.assertNotIn(
            "requestBody",
            spec["paths"]["/v1/realtime/calls/{call_id}/hangup"]["post"],
        )

    def test_documents_vidu_official_request_fields(self) -> None:
        """Vidu request bodies mirror the vendor API-reference markdown pages."""

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        schemas = spec["components"]["schemas"]
        t2v = schemas["ViduTextToVideoRequest"]
        self.assertEqual(["model", "prompt"], t2v["required"])
        self.assertEqual(
            {
                "model",
                "prompt",
                "duration",
                "seed",
                "aspect_ratio",
                "resolution",
                "audio",
                "payload",
                "off_peak",
                "watermark",
                "wm_position",
                "wm_url",
                "meta_data",
                "callback_url",
            },
            set(t2v["properties"]),
        )
        self.assertNotIn("movement_amplitude", t2v["properties"])

        i2v = schemas["ViduImageToVideoRequest"]
        self.assertIn("is_rec", i2v["properties"])
        self.assertIn("images", i2v["properties"])
        self.assertNotIn("aspect_ratio", i2v["properties"])

        r2v = schemas["ViduReferenceToVideoRequest"]
        for field in ("subjects", "auto_subjects", "bgm", "sounds", "movement_amplitude"):
            self.assertIn(field, r2v["properties"])

        se2v = schemas["ViduStartEndToVideoRequest"]
        self.assertNotIn("aspect_ratio", se2v["properties"])

        image = schemas["ViduReferenceToImageRequest"]
        self.assertEqual(["model", "prompt"], image["required"])
        self.assertNotIn("style", image["properties"])
        for field in ("bgm", "resolution", "off_peak"):
            self.assertIn(field, image["properties"])

        text_audio = schemas["ViduTextToAudioRequest"]
        self.assertEqual(["model", "prompt"], text_audio["required"])
        self.assertNotIn("text", text_audio["properties"])
        self.assertEqual(2, text_audio["properties"]["duration"]["minimum"])
        self.assertEqual(10, text_audio["properties"]["duration"]["maximum"])

        timing = schemas["ViduTimingToAudioRequest"]
        self.assertEqual(["model", "timing_prompts"], timing["required"])
        self.assertNotIn("timing_data", timing["properties"])

        template = schemas["ViduTemplateRequest"]
        self.assertEqual(["template", "images"], template["required"])
        self.assertIn("video_urls", template["properties"])
        for field in ("area", "beast", "bgm", "meta_data"):
            self.assertIn(field, template["properties"])

        task = schemas["ViduVideoGenerationTask"]
        self.assertEqual(
            ["created", "queueing", "processing", "success", "failed"],
            task["properties"]["state"]["enum"],
        )
        for field in ("prompt", "duration", "seed", "credits", "err_code", "off_peak"):
            self.assertIn(field, task["properties"])
        self.assertIn("watermarked_url", schemas["ViduCreation"]["properties"])
        self.assertIn("images", schemas["ViduImageGenerationTask"]["properties"])
        template_task = schemas["ViduTemplateTask"]
        self.assertIn("template", template_task["properties"])
        self.assertIn("bgm", template_task["properties"])
        audio_task = schemas["ViduAudioGenerationTask"]
        self.assertEqual(
            ["created", "queueing", "processing", "success", "failed"],
            audio_task["properties"]["state"]["enum"],
        )
        self.assertNotIn("aspect_ratio", audio_task["properties"])

    def test_documents_pixverse_official_fields(self) -> None:
        """PixVerse text-to-video and task polling match the vendor docs."""

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        schemas = spec["components"]["schemas"]
        request = schemas["PixverseVideoGenerationRequest"]
        self.assertEqual(
            ["model", "prompt", "duration", "quality", "aspect_ratio"],
            request["required"],
        )
        self.assertEqual(
            ["v6-max", "c1", "v6", "v3.5", "v4", "v4.5", "v5", "v5-fast", "v5.5", "v5.6"],
            request["properties"]["model"]["enum"],
        )
        self.assertEqual(
            ["360p", "540p", "720p", "1080p"],
            request["properties"]["quality"]["enum"],
        )
        self.assertEqual(
            ["16:9", "9:16", "4:3", "3:4", "1:1", "2:3", "3:2", "21:9"],
            request["properties"]["aspect_ratio"]["enum"],
        )
        self.assertEqual(15, request["properties"]["duration"]["maximum"])
        self.assertEqual(2147483647, request["properties"]["seed"]["maximum"])
        for field in ("webhook_id", "generate_audio_switch", "generate_multi_clip_switch"):
            self.assertIn(field, request["properties"])
        for field in ("img_id", "motion_mode", "negative_prompt"):
            self.assertNotIn(field, request["properties"])

        for name in ("PixverseVideoGenerationResponse", "PixverseVideoGenerationTask"):
            envelope = schemas[name]
            self.assertEqual(
                {"ErrCode", "ErrMsg", "Resp", "Error"}, set(envelope["properties"]), name
            )
        resp = schemas["PixverseTaskResp"]
        self.assertEqual([1, 5, 7, 8], resp["properties"]["status"]["enum"])
        self.assertIn("video_id", resp["properties"])
        self.assertIn("id", resp["properties"])

        for path in (
            "/pixverse/openapi/v2/video/text/generate",
            "/pixverse/openapi/v2/video/result/{video_id}",
        ):
            operation = spec["paths"][path]["post" if path.endswith("generate") else "get"]
            headers = {
                parameter["name"]: parameter
                for parameter in operation["parameters"]
                if parameter.get("in") == "header"
            }
            self.assertIn("Ai-trace-id", headers, path)
            self.assertTrue(headers["Ai-trace-id"]["required"], path)

    def test_documents_runway_and_bfl_official_fields(self) -> None:
        """Runway per-model request unions and BFL flux-3-video modes."""

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        schemas = spec["components"]["schemas"]
        text_to_video = schemas["RunwayTextToVideoRequest"]
        for field in (
            "contentModeration",
            "outputFormat",
            "proresProfile",
            "audio",
            "negativePrompt",
            "providerSettings",
            "references",
            "resolution",
            "referenceAudio",
            "referenceVideos",
            "cfgScale",
            "bitrate",
            "promptExpansionMode",
            "draft",
            "draftTaskId",
        ):
            self.assertIn(field, text_to_video["properties"], field)
        self.assertEqual(30, text_to_video["properties"]["duration"]["maximum"])
        self.assertIn("hdr_pq_12bit_master", text_to_video["properties"]["outputFormat"]["enum"])
        self.assertEqual(0.0, text_to_video["properties"]["cfgScale"]["minimum"])
        self.assertEqual(4294967295, text_to_video["properties"]["seed"]["maximum"])

        image_to_video = schemas["RunwayImageToVideoRequest"]
        for field in ("promptImage", "referenceVideos", "draft"):
            self.assertIn(field, image_to_video["properties"], field)
        self.assertNotIn("draftTaskId", image_to_video["properties"])

        text_to_image = schemas["RunwayTextToImageRequest"]
        for field in (
            "quality",
            "background",
            "outputCount",
            "grounding",
            "edit",
            "preciseEdit",
            "maskUri",
            "thinkingLevel",
            "colors",
            "backgroundColor",
        ):
            self.assertIn(field, text_to_image["properties"], field)
        self.assertEqual(10, text_to_image["properties"]["outputCount"]["maximum"])

        bfl = schemas["BlackForestLabsVideoGenerationRequest"]
        self.assertEqual(["mode"], bfl["required"])
        self.assertEqual(
            ["t2v", "i2v", "v2v", "draft_enhance"],
            bfl["properties"]["mode"]["enum"],
        )
        self.assertEqual(["integer", "string"], bfl["properties"]["duration"]["type"])
        self.assertEqual(["hd", "fhd", "qhd", "uhd"], bfl["properties"]["resolution"]["enum"])
        self.assertEqual(7, bfl["properties"]["safety_tolerance"]["maximum"])
        for field in ("keyframes", "start_video", "draft_cache", "generate_audio", "version"):
            self.assertIn(field, bfl["properties"], field)
        for field in ("image", "seed"):
            self.assertNotIn(field, bfl["properties"])
        self.assertEqual("fhd", bfl["properties"]["resolution"]["default"])
        self.assertIs(True, bfl["properties"]["generate_audio"]["default"])
        self.assertEqual(2, bfl["properties"]["safety_tolerance"]["default"])
        self.assertEqual(5, bfl["properties"]["duration"]["minimum"])
        self.assertEqual(20, bfl["properties"]["duration"]["maximum"])
        self.assertEqual(
            ["21:9", "2:1", "16:9", "4:3", "1:1", "3:4", "9:16", "9:21", "auto"],
            bfl["properties"]["aspect_ratio"]["enum"],
        )

    def test_documents_google_generate_content_nested_fields(self) -> None:
        """Gemini request, generationConfig, part, tool, and embed fields."""

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        schemas = spec["components"]["schemas"]
        request = schemas["GoogleGenerateContentRequest"]
        for field in ("contents", "tools", "toolConfig", "safetySettings", "generationConfig", "cachedContent"):
            self.assertIn(field, request["properties"], field)
        for field in ("store", "continuationToken", "serviceTier", "labels", "model", "systemInstruction"):
            self.assertIn(field, request["properties"], field)
        self.assertEqual(
            ["unspecified", "standard", "flex", "priority"],
            request["properties"]["serviceTier"]["enum"],
        )

        config = schemas["GoogleGenerationConfig"]
        for field in (
            "responseModalities",
            "responseLogprobs",
            "logprobs",
            "frequencyPenalty",
            "presencePenalty",
            "seed",
            "mediaResolution",
            "imageConfig",
            "speechConfig",
            "audioTranscriptionConfig",
            "translationConfig",
            "responseFormat",
            "responseJsonSchema",
            "enableEnhancedCivicAnswers",
            "enableAffectiveDialog",
        ):
            self.assertIn(field, config["properties"], field)
        self.assertEqual(
            [
                "MEDIA_RESOLUTION_UNSPECIFIED",
                "MEDIA_RESOLUTION_LOW",
                "MEDIA_RESOLUTION_MEDIUM",
                "MEDIA_RESOLUTION_HIGH",
            ],
            config["properties"]["mediaResolution"]["enum"],
        )

        part = schemas["GooglePart"]
        for field in (
            "thought",
            "thoughtSignature",
            "mediaProcessing",
            "mediaResolution",
            "partMetadata",
            "speechMetadata",
            "videoMetadata",
            "toolCall",
            "toolResponse",
            "audioTranscription",
        ):
            self.assertIn(field, part["properties"], field)
        self.assertEqual(
            ["MEDIA_PROCESSING_UNSPECIFIED", "STATIC", "AGENTIC"],
            part["properties"]["mediaProcessing"]["enum"],
        )

        tool = schemas["GoogleTool"]
        for field in (
            "functionDeclarations",
            "codeExecution",
            "googleSearch",
            "googleSearchRetrieval",
            "urlContext",
            "fileSearch",
            "googleMaps",
            "computerUse",
            "mcpServers",
        ):
            self.assertIn(field, tool["properties"], field)

        embed = schemas["GoogleEmbedContentRequest"]
        self.assertIn("model", embed["properties"])
        self.assertIn("embedContentConfig", embed["properties"])
        self.assertIn("CODE_RETRIEVAL_QUERY", embed["properties"]["taskType"]["enum"])

    def test_documents_anthropic_tool_and_thinking_choices(self) -> None:
        """Anthropic tool_choice/thinking unions match the Messages API docs."""

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        schemas = spec["components"]["schemas"]
        tool_choice = schemas["AnthropicToolChoice"]
        self.assertEqual(["auto", "any", "tool", "none"], tool_choice["properties"]["type"]["enum"])
        self.assertIn("disable_parallel_tool_use", tool_choice["properties"])

        thinking = schemas["AnthropicThinkingConfig"]
        self.assertEqual(
            ["enabled", "disabled", "between_tools", "adaptive"],
            thinking["properties"]["type"]["enum"],
        )
        self.assertEqual(1024, thinking["properties"]["budget_tokens"]["minimum"])
        self.assertEqual(["summarized", "omitted"], thinking["properties"]["display"]["enum"])

        tool = schemas["AnthropicTool"]
        for field in (
            "type",
            "cache_control",
            "allowed_callers",
            "defer_loading",
            "eager_input_streaming",
            "input_examples",
            "strict",
        ):
            self.assertIn(field, tool["properties"], field)
        self.assertEqual(["custom"], tool["properties"]["type"]["enum"])
        self.assertEqual(128, tool["properties"]["name"]["maxLength"])
        self.assertEqual(
            [
                "direct",
                "code_execution_20250825",
                "code_execution_20260120",
                "code_execution_20260521",
            ],
            tool["properties"]["allowed_callers"]["items"]["enum"],
        )

        server = schemas["AnthropicServerTool"]
        self.assertEqual(
            [
                "bash_20250124",
                "text_editor_20250124",
                "text_editor_20250429",
                "text_editor_20250728",
                "web_search_20250305",
                "tool_search_tool_regex",
            ],
            server["properties"]["type"]["enum"],
        )
        self.assertEqual(
            [
                "bash",
                "str_replace_editor",
                "str_replace_based_edit_tool",
                "web_search",
                "tool_search_tool_regex",
            ],
            server["properties"]["name"]["enum"],
        )
        for field in (
            "max_uses",
            "allowed_domains",
            "blocked_domains",
            "user_location",
            "max_characters",
            "display_width_px",
            "display_height_px",
            "display_number",
        ):
            self.assertIn(field, server["properties"], field)
        tools = schemas["AnthropicMessageCreateRequest"]["properties"]["tools"]
        self.assertEqual(2, len(tools["items"]["oneOf"]))

        block = schemas["AnthropicContentBlockParam"]
        self.assertEqual(16, len(block["properties"]["type"]["enum"]))
        for field in (
            "cache_control",
            "citations",
            "thinking",
            "signature",
            "data",
            "is_error",
            "caller",
            "toolset_name",
            "title",
            "context",
        ):
            self.assertIn(field, block["properties"], field)

        count = schemas["AnthropicCountMessageTokensRequest"]
        self.assertEqual(
            {
                "model",
                "messages",
                "cache_control",
                "output_config",
                "speed",
                "system",
                "thinking",
                "tool_choice",
                "tools",
            },
            set(count["properties"]),
        )
        for field in ("max_tokens", "temperature", "top_p", "top_k", "stream", "metadata"):
            self.assertNotIn(field, count["properties"], field)

    def test_documents_xai_video_input_file_id(self) -> None:
        """xAI edit/extension video inputs accept a Files API id next to a URL."""

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        schemas = spec["components"]["schemas"]
        video_input = schemas["XaiVideoInput"]
        self.assertEqual({"url", "file_id"}, set(video_input["properties"]))
        self.assertNotIn("required", video_input)
        for name in ("XaiVideoEditRequest", "XaiVideoExtensionRequest"):
            video = schemas[name]["properties"]["video"]
            reference = video.get("$ref") or video["allOf"][0]["$ref"]
            self.assertEqual("#/components/schemas/XaiVideoInput", reference, name)
        self.assertIn("duration", schemas["XaiVideoUrl"]["properties"])

    def test_documents_elevenlabs_music_and_sound_constraints(self) -> None:
        """ElevenLabs music/sound requests mirror the vendor OpenAPI constraints."""

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        schemas = spec["components"]["schemas"]
        music = schemas["ElevenLabsMusicGenerationRequest"]
        self.assertEqual(4100, music["properties"]["prompt"]["maxLength"])
        self.assertEqual(
            ["track", "loop", "ambience", "video_to_music"],
            music["properties"]["generation_mode"]["enum"],
        )
        self.assertEqual(4000, music["properties"]["lyrics_text"]["maxLength"])
        self.assertEqual(3000, music["properties"]["music_length_ms"]["minimum"])
        self.assertEqual(600000, music["properties"]["music_length_ms"]["maximum"])
        self.assertEqual(
            ["music_v1", "music_v2", "music_v2_5"],
            music["properties"]["model_id"]["enum"],
        )
        self.assertEqual("music_v1", music["properties"]["model_id"]["default"])
        self.assertEqual(2147483647, music["properties"]["seed"]["maximum"])
        self.assertEqual(100, music["properties"]["finetune_id"]["maxLength"])
        self.assertEqual(2.0, music["properties"]["finetune_strength"]["maximum"])
        self.assertEqual(1.0, music["properties"]["finetune_strength"]["default"])
        self.assertIs(True, music["properties"]["respect_sections_durations"]["default"])
        self.assertIn("ElevenLabsMusicPrompt", schemas)
        self.assertIn("ElevenLabsCompositionPlan", schemas)

        sound = schemas["ElevenLabsSoundGenerationRequest"]
        self.assertEqual(["text"], sound["required"])
        self.assertEqual(
            ["eleven_text_to_sound_v2", "eleven_text_to_sound_v3"],
            sound["properties"]["model_id"]["enum"],
        )
        self.assertEqual("eleven_text_to_sound_v2", sound["properties"]["model_id"]["default"])
        self.assertIs(False, sound["properties"]["loop"]["default"])
        self.assertEqual(0.5, sound["properties"]["duration_seconds"]["minimum"])
        self.assertEqual(30, sound["properties"]["duration_seconds"]["maximum"])

    def test_documents_bfl_image_model_union(self) -> None:
        """BFL's parameterized flux-{model} image door publishes the vendor union."""

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        image = spec["components"]["schemas"]["BlackForestLabsImageGenerationRequest"]
        properties = image["properties"]
        self.assertGreaterEqual(len(properties), 45)
        self.assertEqual(
            ["768sq", "1k", "1.5k", "2k", "4k", "match_input"],
            properties["resolution"]["enum"],
        )
        self.assertEqual(["high", "fast"], properties["mode"]["enum"])
        self.assertEqual(["jpeg", "png", "webp"], properties["output_format"]["enum"])
        self.assertEqual(1, properties["steps"]["minimum"])
        self.assertEqual(50, properties["steps"]["maximum"])
        self.assertEqual(1.5, properties["guidance"]["minimum"])
        self.assertEqual(5, properties["guidance"]["maximum"])
        self.assertEqual(2048, properties["top"]["maximum"])
        self.assertEqual("uri", properties["webhook_url"]["format"])
        self.assertEqual(2083, properties["webhook_url"]["maxLength"])
        for field in (
            "images",
            "input_image",
            "input_image_8",
            "mask",
            "auto_crop",
            "grounding",
            "dilate_pixels",
            "finetune_id",
            "garment",
            "person",
            "user",
            "version",
        ):
            self.assertIn(field, properties, field)

    def test_documents_xai_image_constraints(self) -> None:
        """xAI image generation/edit constraints from the vendor OpenAPI."""

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        schemas = spec["components"]["schemas"]
        generation = schemas["XaiImageGenerationRequest"]["properties"]
        self.assertEqual(1, generation["n"]["minimum"])
        self.assertEqual(10, generation["n"]["maximum"])
        self.assertEqual(1, generation["n"]["default"])
        self.assertEqual(["1k", "1.5k", "2k"], generation["resolution"]["enum"])
        self.assertEqual("url", generation["response_format"]["default"])
        self.assertEqual(16, len(generation["aspect_ratio"]["enum"]))

        edit = schemas["XaiImageEditRequest"]["properties"]
        self.assertEqual(16, len(edit["aspect_ratio"]["enum"]))
        self.assertEqual(["1k", "1.5k", "2k"], edit["resolution"]["enum"])
        self.assertEqual("url", edit["response_format"]["default"])

    def test_documents_stability_union_constraints(self) -> None:
        """Stability image/audio multipart constraints from the vendor OpenAPI."""

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        schemas = spec["components"]["schemas"]
        image = schemas["StabilityImageGenerationRequest"]["properties"]
        self.assertEqual(["text-to-image", "image-to-image"], image["mode"]["enum"])
        self.assertEqual("text-to-image", image["mode"]["default"])
        self.assertEqual(
            ["sd3.5-large", "sd3.5-large-turbo", "sd3.5-medium"], image["model"]["enum"]
        )
        self.assertEqual("sd3.5-large", image["model"]["default"])
        self.assertEqual(9, len(image["aspect_ratio"]["enum"]))
        self.assertEqual("1:1", image["aspect_ratio"]["default"])
        self.assertEqual(["png", "jpeg", "webp"], image["output_format"]["enum"])
        self.assertEqual("png", image["output_format"]["default"])
        self.assertEqual(0, image["strength"]["minimum"])
        self.assertEqual(1, image["strength"]["maximum"])
        for field in ("style_preset", "cfg_scale"):
            self.assertIn(field, image, field)

        audio = schemas["StabilityAudioRequest"]["properties"]
        self.assertEqual("stable-audio-2", audio["model"]["default"])
        self.assertEqual("mp3", audio["output_format"]["default"])
        self.assertEqual(1, audio["duration"]["minimum"])
        self.assertEqual(190, audio["duration"]["maximum"])
        self.assertEqual(190, audio["duration"]["default"])

    def test_documents_alibaba_speech_input(self) -> None:
        """DashScope Qwen-TTS input envelope fields."""

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        schemas = spec["components"]["schemas"]
        request = schemas["AlibabaSpeechRequest"]
        self.assertEqual(["model", "input"], request["required"])
        payload = request["properties"]["input"]
        reference = payload.get("$ref") or payload["allOf"][0]["$ref"]
        self.assertEqual("#/components/schemas/AlibabaSpeechInput", reference)

        data = schemas["AlibabaSpeechInput"]
        self.assertEqual(["text", "voice"], data["required"])
        self.assertEqual(
            [
                "Auto",
                "Chinese",
                "English",
                "German",
                "Italian",
                "Portuguese",
                "Spanish",
                "Japanese",
                "Korean",
                "French",
                "Russian",
            ],
            data["properties"]["language_type"]["enum"],
        )
        self.assertIs(False, data["properties"]["optimize_instructions"]["default"])
        self.assertIn("instructions", data["properties"])

    def test_documents_bytedance_tts_nesting(self) -> None:
        """ByteDance Seed TTS nests synthesis fields under req_params."""

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        schemas = spec["components"]["schemas"]
        request = schemas["BytedanceSpeechRequest"]
        self.assertEqual(["req_params"], request["required"])
        reference = request["properties"]["req_params"].get("$ref") or request["properties"][
            "req_params"
        ]["allOf"][0]["$ref"]
        self.assertEqual("#/components/schemas/BytedanceTtsRequestParams", reference)

        params = schemas["BytedanceTtsRequestParams"]
        self.assertEqual(["text", "speaker", "audio_params"], params["required"])
        for field in ("model", "ssml", "additions", "pronunciation_dict", "tone"):
            self.assertIn(field, params["properties"], field)

        audio = schemas["BytedanceTtsAudioParams"]
        self.assertEqual(["mp3", "pcm", "ogg_opus", "wav"], audio["properties"]["format"]["enum"])
        self.assertEqual("mp3", audio["properties"]["format"]["default"])
        self.assertIn("sample_rate", audio["properties"])

        operation = spec["paths"]["/bytedance/api/v3/tts/unidirectional"]["post"]
        headers = {
            parameter["name"]: parameter
            for parameter in operation["parameters"]
            if parameter.get("in") == "header"
        }
        self.assertIn("X-Api-Request-Id", headers)
        self.assertTrue(headers["X-Api-Request-Id"]["required"])

    def test_documents_runway_create_responses(self) -> None:
        """Runway create calls acknowledge {id, estimatedCost}, not the task body."""

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        accepted = spec["components"]["schemas"]["RunwayTaskAccepted"]
        self.assertEqual({"id", "estimatedCost"}, set(accepted["properties"]))
        for path in (
            "/runway/v1/text_to_image",
            "/runway/v1/text_to_video",
            "/runway/v1/image_to_video",
        ):
            response = spec["paths"][path]["post"]["responses"]["200"]["content"][
                "application/json"
            ]["schema"]
            reference = response.get("$ref") or response["allOf"][0]["$ref"]
            self.assertEqual("#/components/schemas/RunwayTaskAccepted", reference, path)

    def test_documents_minimax_legacy_enums(self) -> None:
        """MiniMax legacy video/image doors publish the documented enums."""

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        schemas = spec["components"]["schemas"]
        video = schemas["MinimaxVideoGenerationRequest"]["properties"]
        self.assertEqual(
            ["MiniMax-Hailuo-2.3", "MiniMax-Hailuo-02", "T2V-01-Director", "T2V-01"],
            video["model"]["enum"],
        )
        self.assertEqual(["720P", "768P", "1080P"], video["resolution"]["enum"])

        task = schemas["MinimaxVideoGenerationTask"]["properties"]
        self.assertEqual(
            ["Preparing", "Queueing", "Processing", "Success", "Fail"],
            task["status"]["enum"],
        )
        self.assertIn("video_width", task)
        self.assertIn("video_height", task)

        image = schemas["MinimaxImageGenerationRequest"]["properties"]
        self.assertEqual(["image-01", "image-01-live"], image["model"]["enum"])
        self.assertEqual(8, len(image["aspect_ratio"]["enum"]))
        self.assertEqual(["url", "base64"], image["response_format"]["enum"])
        self.assertEqual("url", image["response_format"]["default"])
        self.assertEqual(1, image["n"]["default"])
        self.assertIs(False, image["prompt_optimizer"]["default"])
        self.assertIn("subject_reference", image)

        response = schemas["MinimaxImageGenerationResponse"]["properties"]["data"]
        reference = response.get("$ref") or response["allOf"][0]["$ref"]
        self.assertEqual("#/components/schemas/MinimaxImageData", reference)
        self.assertIn("image_urls", schemas["MinimaxImageData"]["properties"])

    def test_public_vendor_operations_do_not_expose_passthrough_contracts(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
                        f"{method.upper()} {path} must require Cloud Router API key auth",
                    )
                    self.assertNotIn("x-provider", operation, f"{method.upper()} {path}")
                    self.assertNotIn("x-passthrough", operation, f"{method.upper()} {path}")

    def test_public_vendor_operations_document_typed_payload_schemas(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            schemas = spec["components"]["schemas"]
            for schema_name in [
                "OpenAiFileReferenceInput",
                "OpenAiFileReferenceObject",
                "OpenAiImageReferenceInput",
                "OpenAiImageReferenceObject",
                "OpenAiBinaryFilePart",
            ]:
                self.assertIn(schema_name, schemas)
                self.assertIsInstance(schemas[schema_name].get("description"), str)

            self.assertEqual(
                {"$ref": "#/components/schemas/OpenAiImageReferenceInput"},
                schemas["OpenAiImageEditRequest"]["properties"]["images"]["items"],
            )
            self.assertEqual(
                "object",
                schemas["OpenAiImageEditRequest"]["properties"]["mask"]["type"],
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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()
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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()
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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()
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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()
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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()
            spec["paths"]["/google/v1beta/models/{model}:generateContent"]["post"]["tags"] = ["Unknown/google"]

            audit = audit_vendor_schema_quality(spec, provider_prefixes=self._provider_prefixes())

            self.assertEqual(
                ["POST /google/v1beta/models/{model}:generateContent uses undeclared tag Unknown/google"],
                audit.unregistered_operation_tags,
            )

    def test_public_vendor_schema_quality_audit_reports_inline_structured_payloads(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()
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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()
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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            audit = audit_vendor_schema_quality(spec, provider_prefixes=self._provider_prefixes())

            self.assertEqual(
                [],
                audit.missing_component_descriptions,
                "Vendor reachable schema components must include component-level descriptions.",
            )

    def test_public_vendor_schema_quality_audit_reports_standardized_results(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

            audit = audit_vendor_schema_quality(spec, provider_prefixes=self._provider_prefixes())

            self.assertEqual([], audit.unregistered_vendor_paths)
            # Bumped 57 -> 59 by the TypeSafe AI vendor-native door, then
            # 59 -> 124 by the media-door expansion (MiniMax image/video/speech,
            # xAI Grok Imagine image/video, Kling and Vidu sound effects,
            # Runway video, ElevenLabs Music, Mureka song, the DashScope and
            # Seed TTS speech doors, and the FLUX 3 video door): every published
            # door contributes its request/response payload components as roots,
            # and the vendor-relay envelopes they reference resolve transitively.
            # 124 -> 125 by the Vidu scene-template response schema.
            self.assertEqual(125, len(audit.root_schema_names))
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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()
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
            generator = CloudRouterGatewayOpenApiGenerator(root=root)
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
            generator = CloudRouterGatewayOpenApiGenerator(root=root)
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
            generator = CloudRouterGatewayOpenApiGenerator(root=root)
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
            generator = CloudRouterGatewayOpenApiGenerator(root=root)
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
            generator = CloudRouterGatewayOpenApiGenerator(root=root)
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
            generator = CloudRouterGatewayOpenApiGenerator(root=root)
            output = generator.write()
            spec = json.loads(output.read_text(encoding="utf-8"))
            spec["components"]["schemas"]["ProviderJsonObject"]["additionalProperties"] = {
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
            generator = CloudRouterGatewayOpenApiGenerator(root=root)
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
            generator = CloudRouterGatewayOpenApiGenerator(root=root)
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
            generator = CloudRouterGatewayOpenApiGenerator(root=root)
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
            generator = CloudRouterGatewayOpenApiGenerator(root=root)
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
            generator = CloudRouterGatewayOpenApiGenerator(root=root)
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
            generator = CloudRouterGatewayOpenApiGenerator(root=root)
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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

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
            self.assertEqual(10, image_generation_request["properties"]["n"]["maximum"])
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
            Path("apps/sdkwork-cloudrouter-pc/public/openapi.json").read_text(encoding="utf-8")
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
            # resolve() so the comparison below survives Windows 8.3 short
            # names: TemporaryDirectory can hand back CHARLE~1-style paths,
            # while the generator resolves its root to the long form.
            root = Path(tmp).resolve()
            generator = CloudRouterGatewayOpenApiGenerator(root=root)

            output = generator.write()

            self.assertEqual(
                root / "apps" / "sdkwork-cloudrouter-pc" / "public" / "openapi.json",
                output,
            )
            payload = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual("Cloud Router Open API", payload["info"]["title"])
            self.assertTrue(generator.check().ok)

            payload["info"]["description"] = "stale but structurally valid public OpenAPI fixture"
            output.write_text(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            result = generator.check()
            self.assertFalse(result.ok)
            self.assertIn(f"Cloud Router gateway OpenAPI spec is stale: {output}", result.messages)

    def _deepseek_web_tool_operations(self) -> tuple[dict[str, object], dict[str, object]]:
        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()
        return (
            spec["paths"]["/v1/tools/search"]["post"],
            spec["paths"]["/v1/tools/fetch"]["post"],
        )

    def test_deepseek_web_tools_publish_only_their_own_error_sets(self) -> None:
        search, fetch = self._deepseek_web_tool_operations()

        # DeepSeek answers 403 (safety policy) and 404 (no extractable content)
        # only for page reads, i.e. Fetch. Publishing either on Search would
        # advertise a retry branch that cannot happen.
        self.assertNotIn("403", search["responses"])
        self.assertNotIn("404", search["responses"])
        self.assertIn("403", fetch["responses"])
        self.assertIn("404", fetch["responses"])

        # 404 must not survive on Search as the generic gateway "route target not
        # found": the route is mounted by contract.
        self.assertEqual(
            {"402", "408", "413", "429", "500", "501", "502", "504"},
            set(search["responses"]) - {"200", "400", "401"},
        )
        self.assertEqual(
            {"402", "403", "404", "408", "413", "429", "500", "501", "502", "504"},
            set(fetch["responses"]) - {"200", "400", "401"},
        )
        self.assertIn("extract", fetch["responses"]["404"]["description"])

    def test_deepseek_web_tools_mark_gateway_only_statuses(self) -> None:
        search, fetch = self._deepseek_web_tool_operations()

        # 501/502 do not come from DeepSeek; they are gateway states. The
        # prefix keeps a reader from looking them up in the vendor reference.
        for operation in (search, fetch):
            for status in ("501", "502"):
                description = operation["responses"][status]["description"]
                self.assertTrue(
                    description.startswith("Cloud Router-specific:"),
                    f"{status} must be marked as a gateway status, got {description!r}",
                )

    def test_deepseek_web_tools_document_per_account_qps_limits(self) -> None:
        search, fetch = self._deepseek_web_tool_operations()

        # DeepSeek limits both tools to 5 QPS per account, independently of each
        # other, and Fetch additionally hits per-domain limits of the target host.
        self.assertIn(
            "5 requests per second per account",
            search["responses"]["429"]["description"],
        )
        self.assertIn(
            "5 requests per second per account",
            fetch["responses"]["429"]["description"],
        )
        self.assertIn("per-domain", fetch["responses"]["429"]["description"])
        self.assertNotIn("per-domain", search["responses"]["429"]["description"])

    def test_deepseek_web_tools_document_forwarded_unknown_fields(self) -> None:
        search, fetch = self._deepseek_web_tool_operations()

        # The gateway relays the body verbatim, so unknown keys are ignored by
        # DeepSeek instead of being rejected at the edge.
        for operation in (search, fetch):
            self.assertTrue(operation["requestBody"]["required"])
            self.assertIn("ignored", operation["requestBody"]["description"])

    def test_deepseek_web_tools_document_result_dependent_billing(self) -> None:
        search, fetch = self._deepseek_web_tool_operations()

        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()
        schemas = spec["components"]["schemas"]

        # Billing is per successful request and conditional on producing a
        # result — the contract has to state that, because a customer reading
        # only the schema would otherwise expect every 200 to be charged.
        self.assertIn("empty `results` array is not billed", search["description"])
        self.assertIn("no extractable body is not billed", fetch["description"])
        self.assertIn(
            "does not change the per-request price",
            schemas["OpenAiDeepSeekWebSearchRequest"]["properties"]["count"]["description"],
        )
        self.assertIn(
            "unbilled",
            schemas["OpenAiDeepSeekWebSearchResponse"]["properties"]["results"]["description"],
        )
        self.assertIn(
            "never billed",
            schemas["OpenAiDeepSeekWebFetchResponse"]["properties"]["content"]["description"],
        )
        self.assertIn(
            '-"exact phrase"',
            schemas["OpenAiDeepSeekWebSearchRequest"]["properties"]["query"]["description"],
        )

    def test_vendor_required_headers_and_deferred_status_are_declared(self) -> None:
        """A vendor that rejects a call without a header must see it declared.

        The relay forwards every non-hop-by-hop header verbatim, so a missing
        declaration is not a relay bug — it is a contract bug: a generated SDK
        has no way to send the header, and the upstream rejects the call.
        `X-Runway-Version` and `anthropic-version` are required by their vendors
        on every request; Stability AI only answers JSON when asked for it, and
        the published response schema is the JSON form.
        """
        with tempfile.TemporaryDirectory() as tmp:
            spec = CloudRouterGatewayOpenApiGenerator(root=Path(tmp)).generate()

        required_headers = {
            "anthropic": "anthropic-version",
            "runway": "X-Runway-Version",
            "stability_ai": "Accept",
        }
        for namespace, header_name in required_headers.items():
            seen = 0
            for path, path_item in spec["paths"].items():
                if not path.startswith(f"/{namespace}/"):
                    continue
                if namespace == "stability_ai" and path.endswith("/text-to-audio"):
                    # The audio door publishes audio bytes, not the JSON form,
                    # so it must not require the JSON Accept header.
                    audio = path_item["post"]
                    declared = {
                        parameter["name"]
                        for parameter in audio.get("parameters", [])
                        if parameter.get("in") == "header"
                    }
                    self.assertNotIn("Accept", declared)
                    continue
                for method, operation in path_item.items():
                    if not isinstance(operation, dict) or not operation.get("operationId"):
                        continue
                    declared = {
                        parameter["name"]: parameter
                        for parameter in operation.get("parameters", [])
                        if parameter.get("in") == "header"
                    }
                    self.assertIn(
                        header_name,
                        declared,
                        f"{method.upper()} {path} must declare the required {header_name} header",
                    )
                    self.assertTrue(
                        declared[header_name].get("required"),
                        f"{method.upper()} {path} {header_name} must be required",
                    )
                    seen += 1
            self.assertGreater(seen, 0, f"no operations found for {namespace}")

        # xAI's deferred image poll answers 202 while the image is still being
        # generated, then 200 with data. Both statuses are part of the wire.
        poll = spec["paths"]["/xai/v1/images/{request_id}"]["get"]
        self.assertIn("202", poll["responses"])
        self.assertIn("200", poll["responses"])

    def _provider_prefixes(self) -> set[str]:
        return set(VENDOR_PROVIDER_PREFIXES)


if __name__ == "__main__":
    unittest.main()
