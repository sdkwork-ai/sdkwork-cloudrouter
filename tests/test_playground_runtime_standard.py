import re
import unittest
from pathlib import Path
import yaml


ROOT = Path(__file__).resolve().parents[1]
PLAYGROUND_ROOT = (
    ROOT
    / "apps"
    / "sdkwork-clawrouter-pc"
    / "packages"
    / "sdkwork-clawrouter-pc-playground"
    / "src"
)
GENERATIONS_WORKSPACE_ROOT = (
    ROOT.parent
    / "sdkwork-generations"
    / "apps"
    / "sdkwork-generations-pc"
    / "packages"
    / "sdkwork-generations-pc-workspace"
)


class PlaygroundRuntimeStandardTest(unittest.TestCase):
    def test_playground_history_field_contract_targets_shared_type_source(self) -> None:
        contract_path = ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        contract = yaml.safe_load(contract_path.read_text(encoding="utf-8"))

        playground_contracts = [
            entry
            for entry in contract["frontend_models"]
            if entry.get("route") == "/playground" and entry.get("interface") == "PlaygroundHistoryItem"
        ]

        self.assertEqual(1, len(playground_contracts))
        self.assertEqual(
            "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-playground/src/playgroundTypes.ts",
            playground_contracts[0]["source"],
        )
        self.assertIn("outputText", playground_contracts[0]["fields"])
        self.assertIn("generationConfig", playground_contracts[0]["fields"])

    def test_playground_chat_agent_runtime_sse_contracts_use_standard_boundaries(self) -> None:
        contract_path = ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        contract = yaml.safe_load(contract_path.read_text(encoding="utf-8"))
        operation_ids = {
            entry["operation"]: entry["operation_id"]
            for entry in contract["frontend_operations"]
            if "operation_id" in entry
            and entry.get("source")
            in {
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-playground/src/appRuntimeApiOperations.ts",
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatService.ts",
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-playground/src/playgroundService.ts",
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-playground/src/runtimeStream.ts",
            }
        }

        for operation in [
            "listChatConversations",
            "createChatConversation",
            "retrieveChatConversation",
            "listChatMessages",
            "createChatTurn",
            "completeChatTurnResponse",
            "listRuntimeInvocations",
            "createRuntimeInvocation",
            "retrieveRuntimeInvocation",
            "completeRuntimeInvocation",
            "listRuntimeEvents",
            "streamRuntimeEvents",
            "createRuntimeEvent",
            "listRuntimeArtifacts",
            "createRuntimeArtifact",
        ]:
            with self.subTest(operation=operation):
                self.assertIn(operation, operation_ids)
                self.assertNotRegex(operation_ids[operation], r"^(chat|memory|runtime)\.")

        service_source = (PLAYGROUND_ROOT / "playgroundService.ts").read_text(encoding="utf-8")
        chat_service_source = (PLAYGROUND_ROOT / "components" / "chat" / "chatService.ts").read_text(encoding="utf-8")
        runtime_stream_source = (PLAYGROUND_ROOT / "runtimeStream.ts").read_text(encoding="utf-8")
        commons_runtime_source = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawroutes-pc-commons"
            / "src"
            / "runtime.ts"
        ).read_text(encoding="utf-8")

        for source in [service_source, chat_service_source, runtime_stream_source]:
            with self.subTest(source="playground boundary"):
                self.assertNotIn("@sdkwork/clawrouter-app-sdk", source)
                self.assertNotIn("Math.random", source)

        self.assertIn("appApiPath", commons_runtime_source)
        self.assertIn("streamJson<RuntimeStreamEvent>", commons_runtime_source)
        self.assertTrue(
            "sdkwork-clawroutes-pc-commons/runtime" in runtime_stream_source
            or "@sdkwork/clawroutes-pc-commons/runtime" in runtime_stream_source,
            "runtimeStream must re-export from commons runtime",
        )
        self.assertNotIn("APP_API_PREFIX", runtime_stream_source)
        self.assertNotIn("streamJson<RuntimeStreamEvent>", runtime_stream_source)

    def test_playground_memory_operations_use_sdkwork_memory_app_sdk(self) -> None:
        operations_source = (
            PLAYGROUND_ROOT / "appRuntimeApiOperations.ts"
        ).read_text(encoding="utf-8")
        commons_source = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawroutes-pc-commons"
            / "src"
            / "sdk-clients.ts"
        ).read_text(encoding="utf-8")

        self.assertIn("getSdkworkMemoryAppSdkClient", operations_source)
        self.assertIn("client.memory.spaces.list", operations_source)
        self.assertIn("client.memory.list({ spaceId, pageSize: params.pageSize })", operations_source)
        self.assertIn("client.memory.create(", operations_source)
        self.assertIn("@sdkwork/memory-app-sdk", commons_source)
        self.assertIn("VITE_SDKWORK_MEMORY_APP_API_BASE_URL", commons_source)

    def test_playground_generation_adapter_operations_are_declared_as_runtime_boundary(self) -> None:
        contract_path = ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        contract = yaml.safe_load(contract_path.read_text(encoding="utf-8"))
        operation_contracts = {
            entry["operation"]: entry
            for entry in contract["frontend_operations"]
            if entry.get("source")
            == "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-playground/src/appRuntimeApiOperations.ts"
        }

        expected_operation_ids = {
            "listModelCatalog": "models.list",
            "listChatConversations": "conversations.list",
            "createRuntimeInvocation": "invocations.create",
            "completeRuntimeInvocation": "invocations.submit",
            "listRuntimeArtifacts": "artifacts.list",
        }
        expected_domains = {
            "listModelCatalog": "intelligence",
            "listChatConversations": "chat",
            "createRuntimeInvocation": "runtime",
            "completeRuntimeInvocation": "runtime",
            "listRuntimeArtifacts": "runtime",
        }

        for operation, operation_id in expected_operation_ids.items():
            with self.subTest(operation=operation):
                self.assertIn(operation, operation_contracts)
                self.assertEqual(operation_id, operation_contracts[operation].get("operation_id"))
                self.assertEqual("/playground", operation_contracts[operation].get("route"))
                self.assertEqual("app", operation_contracts[operation].get("api_surface"))
                self.assertEqual(expected_domains[operation], operation_contracts[operation].get("sdk_domain"))
                self.assertNotEqual("app_shell", operation_contracts[operation].get("operation_scope"))

        runtime_invocation_create_schema = operation_contracts["createRuntimeInvocation"]["request_schema"]
        self.assertNotIn("requestId", runtime_invocation_create_schema.get("required", []))
        self.assertNotIn("requestId", runtime_invocation_create_schema.get("properties", {}))
        self.assertIn(
            "The server generates the runtime request id.",
            operation_contracts["createRuntimeInvocation"].get("description", ""),
        )

        runtime_operations_source = (
            PLAYGROUND_ROOT / "appRuntimeApiOperations.ts"
        ).read_text(encoding="utf-8")
        runtime_invocation_create_body = re.search(
            r"export interface RuntimeInvocationCreateBody \{(?P<body>.*?)\n\}",
            runtime_operations_source,
            re.DOTALL,
        )
        self.assertIsNotNone(runtime_invocation_create_body)
        self.assertNotIn("requestId", runtime_invocation_create_body.group("body"))
        runtime_artifact_create_body = re.search(
            r"export interface RuntimeArtifactCreateBody \{(?P<body>.*?)\n\}",
            runtime_operations_source,
            re.DOTALL,
        )
        self.assertIsNotNone(runtime_artifact_create_body)
        self.assertIn("resource?: ClawRouterMediaResource", runtime_artifact_create_body.group("body"))
        self.assertNotIn("storageUrl?: string", runtime_artifact_create_body.group("body"))

        service_contracts = {
            entry["operation"]: entry
            for entry in contract["frontend_operations"]
            if entry.get("source")
            in {
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-playground/src/playgroundService.ts",
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-playground/src/playgroundGenerationService.ts",
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-playground/src/playgroundGenerationsService.ts",
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatService.ts",
            }
        }
        for operation in [
            "fetchGenerationHistory",
            "runGeneration",
            "runPlaygroundAssetGeneration",
            "runPlaygroundGeneration",
            "fetchSessions",
            "fetchMessages",
            "sendMessage",
        ]:
            with self.subTest(operation=operation):
                self.assertEqual("app_shell", service_contracts[operation].get("operation_scope"))

    def test_playground_history_and_preview_components_use_shared_types(self) -> None:
        type_source = (PLAYGROUND_ROOT / "playgroundTypes.ts").read_text(encoding="utf-8")
        service_source = (PLAYGROUND_ROOT / "playgroundService.ts").read_text(encoding="utf-8")
        page_source = (PLAYGROUND_ROOT / "pages" / "Playground.tsx").read_text(encoding="utf-8")
        input_source = (PLAYGROUND_ROOT / "components" / "GenerationChatInput.tsx").read_text(encoding="utf-8")

        self.assertIn("SdkworkGenerationHistoryItem", type_source)
        self.assertIn("export type PlaygroundHistoryItem = SdkworkGenerationHistoryItem", type_source)
        self.assertIn("export type PlaygroundPreviewSetter", type_source)
        self.assertIn("export interface PlaygroundModelOption", type_source)
        self.assertIn("export interface PlaygroundAssetViewProps", type_source)
        self.assertNotIn("export interface PlaygroundHistoryItem", type_source)
        self.assertIn("export type { PlaygroundHistoryItem, PlaygroundMedia", service_source)
        self.assertIn("from '../playgroundTypes'", page_source)
        for shared_type in [
            "PlaygroundHistoryItem",
            "PlaygroundModelBucket",
            "PlaygroundModelGroup",
        ]:
            with self.subTest(shared_type=shared_type):
                self.assertIn(shared_type, page_source)
        for shared_type in [
            "PlaygroundGenerationArtifact",
            "PlaygroundMedia",
        ]:
            with self.subTest(shared_type=shared_type):
                self.assertIn(shared_type, type_source)
        self.assertIn("const MODEL_BUCKETS: PlaygroundModelBucket[]", service_source)
        self.assertIn("export type PlaygroundModelBucket = SdkworkGenerationModelBucket", type_source)
        self.assertIn("const MODEL_BUCKETS: PlaygroundModelBucket[] = ['llms', 'images', 'videos', 'audios', 'music', 'sfx']", service_source)
        self.assertIn("listModelCatalog()", service_source)
        self.assertNotIn("getClawRouterAppSdkClient().ai.models.list()", service_source)
        self.assertIn("return 'llms';", page_source)
        self.assertIn("return 'llms';", input_source)
        self.assertIn("getSdkworkGenerationModelBucket", page_source)
        self.assertIn("getSdkworkGenerationModelBucket", input_source)
        self.assertNotIn("case 'audio': return 'audios'", page_source)
        self.assertNotIn("case 'audio': return 'audios'", input_source)
        self.assertNotIn("'agents'", type_source)
        self.assertNotIn("agents:", type_source)
        self.assertNotIn("ai.playground.models", service_source)

    def test_playground_generation_runtime_uses_generations_pc_workspace(self) -> None:
        portal_workspace_source = (ROOT / "pnpm-workspace.yaml").read_text(encoding="utf-8")
        portal_package_source = (
            ROOT / "apps" / "sdkwork-clawrouter-pc" / "package.json"
        ).read_text(encoding="utf-8")
        playground_package_source = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-playground"
            / "package.json"
        ).read_text(encoding="utf-8")
        service_source = (PLAYGROUND_ROOT / "playgroundService.ts").read_text(encoding="utf-8")
        generations_workspace_package_source = (
            GENERATIONS_WORKSPACE_ROOT / "package.json"
        ).read_text(encoding="utf-8")
        generations_workspace_index_source = (
            GENERATIONS_WORKSPACE_ROOT / "src" / "index.ts"
        ).read_text(encoding="utf-8")
        generations_service_source = (
            GENERATIONS_WORKSPACE_ROOT / "src" / "generation-service.ts"
        ).read_text(encoding="utf-8")

        self.assertIn('"@sdkwork/generations-pc-workspace": "workspace:*"', playground_package_source)
        self.assertIn(
            "../../../sdkwork-generations/apps/sdkwork-generations-pc/packages/sdkwork-generations-pc-workspace",
            portal_workspace_source,
        )
        self.assertIn('"@sdkwork/generations-pc-workspace": "workspace:*"', portal_package_source)
        self.assertIn('"name": "@sdkwork/generations-pc-workspace"', generations_workspace_package_source)
        self.assertIn('export * from "./generation-service.ts"', generations_workspace_index_source)
        self.assertIn("listGenerationRecords", generations_service_source)

        self.assertIn("from '@sdkwork/generations-pc-workspace/generation-service'", service_source)
        self.assertIn("createSdkworkGenerationService", service_source)
        self.assertIn("type SdkworkGenerationWorkspaceData", service_source)
        self.assertIn("includeSampleRuns: false", service_source)
        self.assertIn("fetchPlaygroundGenerationHistoryFromService", service_source)
        self.assertNotIn("getClawRouterAppSdkClient().ai.generation.list()", service_source)
        self.assertNotIn("ai.playground.history", service_source)
        self.assertIn("fetchGenerationWorkspace", service_source)
        self.assertNotIn("@sdkwork/generation-pc-react", service_source)
        self.assertNotIn("loadSdkworkGenerationServiceFactory", service_source)
        self.assertNotIn("createFallbackSdkworkGenerationService", service_source)
        self.assertNotIn("runs.length === 0 && workspace.runs.length > 0", service_source)
        self.assertNotIn("createGenerationWorkspaceData", service_source)

    def test_playground_generation_dependency_uses_generations_workspace_not_appbase_integration(self) -> None:
        integration_source = (ROOT / "specs" / "appbase-integration.yaml").read_text(encoding="utf-8")
        portal_package_source = (
            ROOT / "apps" / "sdkwork-clawrouter-pc" / "package.json"
        ).read_text(encoding="utf-8")
        playground_package_source = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-playground"
            / "package.json"
        ).read_text(encoding="utf-8")

        self.assertTrue(GENERATIONS_WORKSPACE_ROOT.exists())
        self.assertIn("sdkwork-generations-pc-workspace", GENERATIONS_WORKSPACE_ROOT.as_posix())
        self.assertNotIn("capability: generation", integration_source)
        self.assertNotIn('@sdkwork/generation-pc-react', integration_source)
        self.assertNotIn("apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-playground/src/playgroundService.ts", integration_source)
        self.assertNotIn("apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-playground/src/appRuntimeApiOperations.ts", integration_source)
        self.assertNotIn("tests.test_playground_runtime_standard", integration_source)
        self.assertIn('"@sdkwork/generations-pc-workspace": "workspace:*"', portal_package_source)
        self.assertIn('"@sdkwork/generations-pc-workspace": "workspace:*"', playground_package_source)

    def test_playground_route_contract_excludes_retired_zombie_tables(self) -> None:
        contract_path = ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        contract = yaml.safe_load(contract_path.read_text(encoding="utf-8"))

        playground_routes = [
            entry
            for entry in contract["routes"]
            if entry.get("route") == "/playground"
        ]

        self.assertEqual(1, len(playground_routes))
        required_tables = playground_routes[0].get("required_tables", [])
        retired_tables = {
            "ai_agent_version",
            "ai_agent_memory",
            "ai_agent_tool_binding",
            "ai_agent_mcp_server",
        }
        for table_name in retired_tables:
            self.assertNotIn(table_name, required_tables)

        checked_sources = [
            PLAYGROUND_ROOT / "components" / "ChatHistoryItem.tsx",
            PLAYGROUND_ROOT / "components" / "MessageItems.tsx",
            PLAYGROUND_ROOT / "components" / "views" / "AgentView.tsx",
            PLAYGROUND_ROOT / "components" / "views" / "SharedHistoryView.tsx",
            PLAYGROUND_ROOT / "components" / "views" / "ImageView.tsx",
            PLAYGROUND_ROOT / "components" / "views" / "VideoView.tsx",
            PLAYGROUND_ROOT / "components" / "views" / "MusicView.tsx",
            PLAYGROUND_ROOT / "components" / "views" / "AudioView.tsx",
            PLAYGROUND_ROOT / "components" / "views" / "SfxView.tsx",
        ]

        for source_path in checked_sources:
            source = source_path.read_text(encoding="utf-8")
            relative = source_path.relative_to(ROOT).as_posix()
            with self.subTest(source=relative):
                self.assertNotIn(": any", source)
                self.assertNotIn("as any", source)
                self.assertNotIn("unknown as", source)
                self.assertIn("Playground", source)

    def test_playground_chat_deep_link_route_is_a_first_class_schema_route(self) -> None:
        contract = yaml.safe_load(
            (ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml").read_text(
                encoding="utf-8"
            )
        )
        classification = yaml.safe_load(
            (ROOT / "docs" / "schema-registry" / "frontend-route-classification.yaml").read_text(
                encoding="utf-8"
            )
        )
        schema_manifest = yaml.safe_load(
            (ROOT / "generated" / "schema" / "manifest" / "schema-manifest.json").read_text(
                encoding="utf-8"
            )
        )

        route_contracts = {
            entry["route"]: entry
            for entry in contract["routes"]
            if isinstance(entry, dict) and isinstance(entry.get("route"), str)
        }
        classifications = {
            entry["route"]: entry
            for entry in classification["routes"]
            if isinstance(entry, dict) and isinstance(entry.get("route"), str)
        }

        self.assertIn("/c/:conversationId", route_contracts)
        self.assertIn("/c/:conversationId", schema_manifest["routes"])
        self.assertIn("/c/:conversationId", classifications)

        deep_link_route = route_contracts["/c/:conversationId"]
        for required_table in ["ai_chat_conversation", "ai_chat_turn", "ai_runtime_invocation", "ai_model"]:
            with self.subTest(required_table=required_table):
                self.assertIn(required_table, deep_link_route["required_tables"])

        deep_link_classification = classifications["/c/:conversationId"]
        self.assertIn(
            deep_link_classification["package"],
            {
                "sdkwork-clawrouter-pc-playground",
                "@sdkwork/clawrouter-pc-playground",
            },
        )
        self.assertEqual("sdk_backed_business_runtime", deep_link_classification["delivery_kind"])
        self.assertEqual("app", deep_link_classification["api_surface"])
        self.assertIn("/playground", deep_link_classification["operation_routes"])
        self.assertIn("/chat", deep_link_classification["operation_routes"])

    def test_playground_generation_controls_are_product_ready_not_read_only_placeholders(self) -> None:
        checked_sources = [
            PLAYGROUND_ROOT / "pages" / "Playground.tsx",
            PLAYGROUND_ROOT / "components" / "GenerationChatInput.tsx",
            PLAYGROUND_ROOT / "components" / "AssetGenerationPanel.tsx",
            PLAYGROUND_ROOT / "components" / "views" / "ImageView.tsx",
            PLAYGROUND_ROOT / "components" / "views" / "VideoView.tsx",
            PLAYGROUND_ROOT / "components" / "views" / "MusicView.tsx",
            PLAYGROUND_ROOT / "components" / "views" / "AudioView.tsx",
            PLAYGROUND_ROOT / "components" / "views" / "SfxView.tsx",
        ]
        combined_source = "\n".join(source.read_text(encoding="utf-8") for source in checked_sources)
        page_source = (PLAYGROUND_ROOT / "pages" / "Playground.tsx").read_text(encoding="utf-8")
        panel_source = (PLAYGROUND_ROOT / "components" / "AssetGenerationPanel.tsx").read_text(encoding="utf-8")
        generation_input_source = (PLAYGROUND_ROOT / "components" / "GenerationChatInput.tsx").read_text(encoding="utf-8")
        i18n_source = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-i18n"
            / "src"
            / "index.ts"
        ).read_text(encoding="utf-8")
        for forbidden in [
            "ReadOnlyPlayground",
            "readOnlyReason",
            "READ_ONLY_",
            "Playground generation and asset actions are temporarily unavailable.",
            "Playground 生成和资产操作暂不可用。",
        ]:
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, combined_source)
                self.assertNotIn(forbidden, i18n_source)

        self.assertNotIn("ReadOnlyPlaygroundControl", "\n".join(str(path) for path in PLAYGROUND_ROOT.rglob("*.tsx")))
        self.assertIn("export function AssetGenerationPanel", panel_source)
        self.assertIn("onSubmitGeneration({", panel_source)
        self.assertIn("selectedModality: modality", panel_source)
        self.assertIn("setAgentHistory((current) => [result.item", page_source)
        self.assertIn("void downloadPreviewAsset();", page_source)
        self.assertIn("void sharePreviewAsset();", page_source)
        self.assertIn("void regeneratePreviewAsset();", page_source)
        self.assertNotIn("title={t('playground.readOnlyReason')}", page_source)
        self.assertNotIn("title={title ?? t(PLAYGROUND_READ_ONLY_REASON_KEY)}", generation_input_source)

    def test_generation_input_uses_modality_names_without_mojibake(self) -> None:
        checked_sources = [
            PLAYGROUND_ROOT / "pages" / "Playground.tsx",
            PLAYGROUND_ROOT / "components" / "GenerationChatInput.tsx",
            PLAYGROUND_ROOT / "components" / "ImageGenerationModePopup.tsx",
            PLAYGROUND_ROOT / "components" / "VideoGenerationModePopup.tsx",
            PLAYGROUND_ROOT / "components" / "views" / "AgentView.tsx",
        ]

        combined_source = "\n".join(source.read_text(encoding="utf-8") for source in checked_sources)

        for legacy_name in [
            "selectedType",
            "setSelectedType",
            "showTypeMenu",
            "setShowTypeMenu",
            "getTypeIcon",
            "typeLabels",
        ]:
            with self.subTest(legacy_name=legacy_name):
                self.assertNotIn(legacy_name, combined_source)

        for canonical_name in [
            "selectedModality",
            "setSelectedModality",
            "showModalityMenu",
            "setShowModalityMenu",
            "getModalityIcon",
            "modalityLabels",
        ]:
            with self.subTest(canonical_name=canonical_name):
                self.assertIn(canonical_name, combined_source)

        mojibake_token_codepoints = [0x93C5, 0x9422, 0x9241, 0xFFFD]
        for mojibake_token in (chr(codepoint) for codepoint in mojibake_token_codepoints):
            with self.subTest(mojibake_token=mojibake_token):
                self.assertNotIn(mojibake_token, combined_source)

        mojibake_label_codepoints = [0x9422, 0x59E3, 0x7459, 0x95CA, 0x93C5, 0x6942, 0x7481]
        for mojibake_token in (chr(codepoint) for codepoint in mojibake_label_codepoints):
            with self.subTest(mojibake_token=mojibake_token):
                self.assertNotIn(mojibake_token, combined_source)

        generation_input_source = (
            PLAYGROUND_ROOT / "components" / "GenerationChatInput.tsx"
        ).read_text(encoding="utf-8")
        agent_view_source = (
            PLAYGROUND_ROOT / "components" / "views" / "AgentView.tsx"
        ).read_text(encoding="utf-8")
        input_layout_source = generation_input_source + "\n" + agent_view_source

        self.assertIn('className="w-full max-w-[1280px] relative"', generation_input_source)
        self.assertIn("<GenerationChatInput", agent_view_source)
        self.assertIn("w-[450px]", agent_view_source)
        for forbidden_width in ["w-[800px]", "max-w-[800px]", "w-[960px]", "max-w-[960px]"]:
            with self.subTest(forbidden_width=forbidden_width):
                self.assertNotIn(forbidden_width, input_layout_source)

    def test_generation_input_reuses_shared_model_picker_and_keeps_toolbar_compact(self) -> None:
        generation_input_source = (
            PLAYGROUND_ROOT / "components" / "GenerationChatInput.tsx"
        ).read_text(encoding="utf-8")
        model_picker_source = (
            PLAYGROUND_ROOT / "components" / "PlaygroundModelPicker.tsx"
        ).read_text(encoding="utf-8")

        self.assertIn("PlaygroundModelPicker", generation_input_source)
        self.assertIn("createFallbackModel", generation_input_source)
        self.assertIn("bucket={selectedBucket}", generation_input_source)
        self.assertIn("menuPlacement=\"top\"", generation_input_source)
        self.assertIn("variant=\"flat\"", generation_input_source)
        self.assertIn("compact", generation_input_source)
        self.assertIn("min-h-[112px]", generation_input_source)
        self.assertNotIn("activeVendorCode", generation_input_source)
        self.assertNotIn("onMouseEnter", generation_input_source)
        self.assertNotIn("findModelById", generation_input_source)
        self.assertNotIn("firstModel(", generation_input_source)

        self.assertIn("variant?: 'default' | 'flat';", model_picker_source)
        self.assertNotIn("onMouseEnter", model_picker_source)
        self.assertIn("onClick={() => setActiveVendorCode(group.vendor.code)}", model_picker_source)

    def test_playground_chat_is_independent_module_under_agent(self) -> None:
        page_source = (PLAYGROUND_ROOT / "pages" / "Playground.tsx").read_text(encoding="utf-8")
        chat_page_source = (
            PLAYGROUND_ROOT / "components" / "chat" / "ChatPage.tsx"
        ).read_text(encoding="utf-8")
        simple_chat_input_source = (
            PLAYGROUND_ROOT / "components" / "chat" / "SimpleChatInput.tsx"
        ).read_text(encoding="utf-8")
        chat_message_list_source = (
            PLAYGROUND_ROOT / "components" / "chat" / "ChatMessageList.tsx"
        ).read_text(encoding="utf-8")
        chat_message_bubble_source = (
            PLAYGROUND_ROOT / "components" / "chat" / "ChatMessageBubble.tsx"
        ).read_text(encoding="utf-8")
        chat_types_source = (
            PLAYGROUND_ROOT / "components" / "chat" / "chatTypes.ts"
        ).read_text(encoding="utf-8")
        generation_input_source = (
            PLAYGROUND_ROOT / "components" / "GenerationChatInput.tsx"
        ).read_text(encoding="utf-8")

        self.assertIn("MessageSquare", page_source)
        self.assertIn("import { ChatPage } from '../components/chat/ChatPage';", page_source)
        self.assertIn("export type Modality = 'agent' | 'chat'", page_source)
        self.assertIn("setModality('chat')", page_source)
        self.assertIn("label={t('playground.modality.chat')}", page_source)
        self.assertLess(
            page_source.index("label={t('playground.modality.agent')}"),
            page_source.index("label={t('playground.modality.chat')}"),
        )
        self.assertIn("modality === 'chat'", page_source)
        self.assertIn("<ChatPage", page_source)

        self.assertIn("export function ChatPage", chat_page_source)
        self.assertIn("<ChatMessageList", chat_page_source)
        self.assertIn("<SimpleChatInput", chat_page_source)
        self.assertNotIn("<ChatApiKeySwitcher", chat_page_source)
        self.assertIn("PlaygroundService.fetchModelGroups()", chat_page_source)
        self.assertNotIn("ApiKeyService", chat_page_source)
        self.assertNotIn("selectedApiKeyId", chat_page_source)
        self.assertNotIn("ChatApiKeyOption", chat_page_source)
        self.assertNotIn("GenerationChatInput", chat_page_source)

        self.assertIn("import { SimpleChatInput } from './SimpleChatInput';", chat_page_source)
        self.assertIn("export function SimpleChatInput", simple_chat_input_source)
        self.assertIn("bucket=\"llms\"", simple_chat_input_source)
        self.assertIn("PlaygroundModelPicker", simple_chat_input_source)
        self.assertIn("w-fit min-w-0 max-w-full flex-[0_1_auto]", simple_chat_input_source)
        self.assertNotIn("w-full max-w-[136px]", simple_chat_input_source)
        self.assertNotIn("max-w-[168px]", simple_chat_input_source)
        self.assertNotIn("max-w-[176px]", simple_chat_input_source)
        self.assertNotIn("max-w-[220px]", simple_chat_input_source)
        self.assertNotIn("max-w-[360px]", simple_chat_input_source)
        self.assertIn("flatComposer", simple_chat_input_source)
        self.assertNotIn("border border-white/10", simple_chat_input_source)
        self.assertNotIn("shadow-[0_24px_70px", simple_chat_input_source)
        self.assertNotIn("ring-1", simple_chat_input_source)
        self.assertIn("useLayoutEffect", simple_chat_input_source)
        self.assertIn("onCompositionStart", simple_chat_input_source)
        self.assertIn("onCompositionEnd", simple_chat_input_source)
        self.assertIn("textareaRef", simple_chat_input_source)
        self.assertIn("variant=\"flat\"", simple_chat_input_source)
        self.assertNotIn("<ChatApiKeySwitcher", simple_chat_input_source)
        self.assertNotIn("apiKeys", simple_chat_input_source)
        self.assertNotIn("selectedApiKey", simple_chat_input_source)
        self.assertNotIn("MessageSquare", simple_chat_input_source)
        self.assertNotIn("selectedVendorName", simple_chat_input_source)
        self.assertNotIn("playground.chat.vendor", simple_chat_input_source)
        self.assertNotIn("GenerationChatInput", simple_chat_input_source)

        self.assertIn("export function ChatMessageList", chat_message_list_source)
        self.assertIn("ChatMessageBubble", chat_message_list_source)
        self.assertIn("export function ChatMessageBubble", chat_message_bubble_source)
        self.assertIn("export interface ChatMessage", chat_types_source)
        self.assertIn("export interface SimpleChatInputSubmit", chat_types_source)
        self.assertNotIn("ChatApiKeyOption", chat_types_source)
        self.assertNotIn("selectedApiKeyId", chat_types_source)
        self.assertFalse((PLAYGROUND_ROOT / "components" / "chat" / "ChatApiKeySwitcher.tsx").exists())

        model_picker_source = (
            PLAYGROUND_ROOT / "components" / "PlaygroundModelPicker.tsx"
        ).read_text(encoding="utf-8")
        self.assertIn("variant?: 'default' | 'flat';", model_picker_source)
        self.assertNotIn("onMouseEnter", model_picker_source)
        self.assertIn("onClick={() => setActiveVendorCode(group.vendor.code)}", model_picker_source)

        self.assertNotIn("createLocalAssistantMessage", chat_page_source)
        self.assertNotIn("3<span", generation_input_source)
        self.assertNotIn("showRatioMenu", generation_input_source)
        self.assertNotIn("playground.input.ratio.hd", generation_input_source)
        self.assertNotIn("w-[72px] h-[96px]", generation_input_source)

    def test_playground_media_generation_uses_fixed_bottom_credit_action_bar(self) -> None:
        panel_source = (
            PLAYGROUND_ROOT / "components" / "AssetGenerationPanel.tsx"
        ).read_text(encoding="utf-8")
        page_source = (
            PLAYGROUND_ROOT / "pages" / "Playground.tsx"
        ).read_text(encoding="utf-8")
        type_source = (PLAYGROUND_ROOT / "playgroundTypes.ts").read_text(encoding="utf-8")
        service_source = (PLAYGROUND_ROOT / "playgroundService.ts").read_text(encoding="utf-8")
        generation_service_source = (
            PLAYGROUND_ROOT / "playgroundGenerationService.ts"
        ).read_text(encoding="utf-8")
        playground_i18n_root = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-i18n"
            / "src"
            / "resources"
            / "playground"
        )
        i18n_source = "\n".join(
            path.read_text(encoding="utf-8")
            for path in playground_i18n_root.glob("*.ts")
        )
        image_mode_popup_source = (
            PLAYGROUND_ROOT / "components" / "ImageGenerationModePopup.tsx"
        ).read_text(encoding="utf-8")
        video_mode_popup_source = (
            PLAYGROUND_ROOT / "components" / "VideoGenerationModePopup.tsx"
        ).read_text(encoding="utf-8")
        mode_popup_base_source = (
            PLAYGROUND_ROOT / "components" / "GenerationModePopupBase.tsx"
        ).read_text(encoding="utf-8")
        mode_popup_sources = image_mode_popup_source + "\n" + video_mode_popup_source + "\n" + mode_popup_base_source

        self.assertIn("export function AssetGenerationPanel", panel_source)
        self.assertIn("function GenerationBottomActionBar", panel_source)
        self.assertIn("function GenerationSubmitButton", panel_source)
        self.assertNotIn("sticky bottom-0", panel_source)
        self.assertIn("playground.generationCost.unavailable", panel_source)
        self.assertIn("playground.generationCost.points", panel_source)
        self.assertIn("estimateSdkworkGenerationCredits", panel_source)
        self.assertIn("findFirstSdkworkGenerationModelForModality", panel_source)
        self.assertIn("findSdkworkGenerationModelById", panel_source)
        self.assertIn("getSdkworkGenerationDurationOptions", panel_source)
        self.assertNotIn("function estimatePlaygroundGenerationCredits", panel_source)
        self.assertNotIn("function selectReferencePrice", panel_source)
        self.assertNotIn("function estimateMeterQuantity", panel_source)
        self.assertNotIn("function metersForModality", panel_source)
        self.assertNotIn("function GenerationActionBar", panel_source)
        self.assertIn("function ReferenceImageUploader", panel_source)
        self.assertIn("ImageGenerationModePopup", panel_source)
        self.assertIn("VideoGenerationModePopup", panel_source)
        self.assertIn("GenerationModePopupBase", mode_popup_base_source)
        self.assertIn('accept="image/*"', panel_source)
        self.assertIn("referenceImageUrl", panel_source)
        self.assertIn("referenceImage.metadata.name", panel_source)
        self.assertIn("readReferenceImageDataUrl", panel_source)
        self.assertIn("createUploadedReferenceMediaResource(referenceImageDataUrl", panel_source)
        self.assertIn("URL.createObjectURL", panel_source)
        self.assertIn("URL.revokeObjectURL", panel_source)
        self.assertIn("aspectRatio", mode_popup_sources)
        self.assertIn("playground.referenceAssets", panel_source)
        self.assertIn("valueKey: 'aspectRatio'", image_mode_popup_source)
        self.assertIn("playground.generationOutput.images", panel_source)
        self.assertIn("ImageGenerationModePopup", panel_source)
        self.assertIn("config={config}", panel_source)
        self.assertIn("const outputLabel = generationOutputLabel", panel_source)
        self.assertIn("playground.generationOutput.images", panel_source)
        self.assertIn("playground.generationOutput.items", panel_source)
        self.assertIn("h-[64px]", panel_source)
        self.assertNotIn("-mb-4", panel_source)
        self.assertNotIn("min-h-4 flex-1", panel_source)
        self.assertIn("whitespace-nowrap", panel_source)
        self.assertIn("playground.generate", panel_source)
        self.assertIn("costLabel", panel_source)
        self.assertIn("outputLabel", panel_source)
        self.assertNotIn("t('playground.generationCost.estimated')", panel_source)
        self.assertNotIn("mb-3 flex min-w-0 items-start", panel_source)
        self.assertIn("findSdkworkGenerationModelById(modelGroups, selectedModelId)", panel_source)
        self.assertIn("generationConfig: serializeSdkworkGenerationAssetConfig(config, modality)", panel_source)
        self.assertNotIn("function createGenerationConfig", panel_source)
        self.assertIn("referenceImages:", panel_source)
        self.assertIn("referenceAssets:", panel_source)
        self.assertIn("const targetType = inputModality === 'agent' ? undefined : inputModality;", page_source)
        self.assertIn("targetType === undefined ? 'llms' : toModelBucket(targetType)", page_source)
        self.assertIn("const isText = previewItem?.type === 'text'", page_source)
        self.assertIn("previewKind === 'text'", page_source)
        self.assertIn("targetType,", page_source)
        self.assertIn("generationConfig,", page_source)
        self.assertIn("referenceImages,", page_source)
        self.assertIn("referenceAssets,", page_source)
        self.assertIn("const requestedTargetType = input.targetType;", generation_service_source)
        self.assertIn("resolveGenerationResultTargetType(requestedTargetType, completedGenerationOutput.artifacts)", generation_service_source)
        self.assertIn("return artifacts[0]?.modality;", generation_service_source)
        self.assertIn("mapSdkworkGenerationModalityToHistoryType(targetType)", generation_service_source)
        self.assertNotIn("function mapHistoryType", generation_service_source)
        self.assertIn("targetType: requestedTargetType", generation_service_source)
        self.assertIn("generationConfig: input.generationConfig", generation_service_source)
        self.assertIn("referenceImages: input.referenceImages", generation_service_source)
        self.assertIn("referenceAssets: input.referenceAssets", generation_service_source)
        self.assertIn("PlaygroundService.runGeneration", page_source)
        self.assertIn("generationConfig?: PlaygroundGenerationConfig", type_source)
        self.assertIn("referenceImages?: PlaygroundReferenceImageInput[]", type_source)
        self.assertIn("referenceAssets?: PlaygroundReferenceAssetInput[]", type_source)
        self.assertIn("resource: ClawRouterMediaResource", type_source)
        self.assertIn("ClawRouterMediaResource", type_source)
        self.assertIn("export type PlaygroundHistoryItem = SdkworkGenerationHistoryItem", type_source)
        self.assertIn("SdkworkGenerationHistoryType", (
            GENERATIONS_WORKSPACE_ROOT / "src" / "generation-history.ts"
        ).read_text(encoding="utf-8"))
        self.assertIn("targetType?: PlaygroundGenerationTargetType", type_source)
        self.assertIn("officialReferencePrices", type_source)
        self.assertIn("priceAvailability", type_source)
        self.assertIn("const officialReferencePrices = readReferencePrices(item, 'officialReferencePrices')", service_source)
        self.assertIn("officialReferencePrices,", service_source)
        self.assertIn("priceAvailability: readPriceAvailability(item, officialReferenceUnitPrice, officialReferencePrices)", service_source)

        for key in [
            "playground.generationCost.estimated",
            "playground.generationCost.unavailable",
            "playground.generationCost.reference",
            "playground.generationCost.settlement",
            "playground.referenceAssets",
            "playground.action.ratio",
            "playground.config.images",
            "playground.referenceImage.upload",
            "playground.referenceImage.remove",
            "playground.aspectRatio.square",
            "playground.aspectRatio.landscape",
            "playground.aspectRatio.portrait",
        ]:
            with self.subTest(key=key):
                self.assertEqual(
                    2,
                    i18n_source.count(f'"{key}"'),
                    f"{key} must be translated in both locales",
                )

        for relative in [
            "components/views/ImageView.tsx",
            "components/views/VideoView.tsx",
            "components/views/MusicView.tsx",
            "components/views/AudioView.tsx",
            "components/views/SfxView.tsx",
        ]:
            source = (PLAYGROUND_ROOT / relative).read_text(encoding="utf-8")
            with self.subTest(source=relative):
                self.assertIn("<AssetGenerationPanel", source)
                self.assertIn("modelGroups={modelGroups}", source)
                self.assertIn("overflow-hidden", source)
                self.assertIn("shrink-0", source)
                self.assertNotIn("bg-gradient-to-r from-emerald-500 to-green-500 px-6 py-2", source)

    def test_playground_generation_request_contract_preserves_explicit_media_config(self) -> None:
        contract_source = (
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        ).read_text(encoding="utf-8")
        openapi_source = (
            ROOT / "generated" / "openapi" / "clawrouter-app-openapi.json"
        ).read_text(encoding="utf-8")
        sdk_sources = "\n".join(
            path.read_text(encoding="utf-8")
            for path in (
                ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "api"
            ).glob("*.ts")
        )
        app_api_source = (
            ROOT / "services" / "sdkwork-clawrouter-app-api-server" / "src" / "lib.rs"
        ).read_text(encoding="utf-8")
        operations_source = (
            PLAYGROUND_ROOT / "appRuntimeApiOperations.ts"
        ).read_text(encoding="utf-8")
        service_source = (PLAYGROUND_ROOT / "playgroundService.ts").read_text(encoding="utf-8")
        generation_service_source = (
            PLAYGROUND_ROOT / "playgroundGenerationService.ts"
        ).read_text(encoding="utf-8")
        types_source = (PLAYGROUND_ROOT / "playgroundTypes.ts").read_text(encoding="utf-8")

        for field in [
            "targetType",
            "generationConfig",
            "referenceAssets",
            "referenceImages",
            "aspectRatio",
            "durationSeconds",
        ]:
            with self.subTest(source="contract", field=field):
                self.assertIn(field, contract_source)
        for field in [
            "targetType",
            "generationConfig",
            "referenceAssets",
            "referenceImages",
            "resource",
            "ClawRouterMediaResource",
        ]:
            with self.subTest(source="types", field=field):
                self.assertIn(field, types_source)
        self.assertIn("SdkworkGenerationSerializedAssetConfig", types_source)

        self.assertIn("targetType", generation_service_source)
        self.assertIn("generationConfig: input.generationConfig", generation_service_source)
        self.assertIn("referenceImages: input.referenceImages", generation_service_source)
        self.assertIn("referenceAssets: input.referenceAssets", generation_service_source)
        self.assertIn("operation_id: playground.runtime.generation.run", contract_source)
        self.assertIn("openapi_exposed: false", contract_source)
        self.assertIn("sdk_domain: runtime", contract_source)
        self.assertIn("operation_scope: app_shell", contract_source)
        self.assertIn("runPlaygroundGeneration(input)", service_source)
        self.assertIn("appRuntimeApiOperations", generation_service_source)
        self.assertNotIn("getClawRouterAppSdkClient", generation_service_source)
        self.assertNotIn("client.agents.", generation_service_source)
        self.assertNotIn("client.runtime.", generation_service_source)
        self.assertIn("client.runtime.invocations.create", operations_source)
        self.assertNotIn("client.agents.agentRuns.create", operations_source)
        self.assertIn("streamRuntimeEvents(invocationId)", generation_service_source)
        self.assertIn("usageJson: generationOutput.usage", generation_service_source)
        self.assertIn("readRuntimeUsageSnapshot(event)", generation_service_source)
        self.assertIn("readPreferredRuntimeUsageCount(undefined, usage.inputTokens)", generation_service_source)
        self.assertNotIn("/app/v3/api/ai/generation/agents/runs", openapi_source)
        self.assertNotIn("generation.agent.runs.create", openapi_source)
        self.assertNotIn("generation/agents/runs", sdk_sources)
        self.assertNotIn("app_generation_agent_router", app_api_source)

    def test_playground_agent_generation_legacy_backend_entrypoint_is_removed(self) -> None:
        old_backend_files = [
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "app_generation_agent.rs",
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "ports"
            / "app_generation_agent_run_store.rs",
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "app_generation_agent_runtime.rs",
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "postgres"
            / "app_generation_agent_run_store.rs",
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "sqlite"
            / "app_generation_agent_run_store.rs",
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "tests"
            / "sqlite_app_generation_agent_run_store.rs",
        ]

        for old_file in old_backend_files:
            with self.subTest(path=old_file.relative_to(ROOT).as_posix()):
                self.assertFalse(old_file.exists())

        checked_sources = [
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "mod.rs",
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "ports" / "mod.rs",
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql" / "mod.rs",
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "postgres"
            / "mod.rs",
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "sqlite"
            / "mod.rs",
        ]
        for source_path in checked_sources:
            source = source_path.read_text(encoding="utf-8")
            with self.subTest(source=source_path.relative_to(ROOT).as_posix()):
                self.assertNotIn("app_generation_agent", source)
                self.assertNotIn("AppGenerationAgentRun", source)
                self.assertNotIn("/app/v3/api/ai/generation/agents/runs", source)

    def test_playground_agent_history_time_filter_is_applied(self) -> None:
        page_source = (
            PLAYGROUND_ROOT / "pages" / "Playground.tsx"
        ).read_text(encoding="utf-8")

        self.assertIn("function isWithinTimeFilter", page_source)
        self.assertIn("result = result.filter((item) => isWithinTimeFilter(item, timeFilter))", page_source)
        self.assertIn("timeFilter", page_source[page_source.index("const filteredAgentHistory"):page_source.index("const updateSelectedModel")])

    def test_playground_chat_i18n_keys_are_translated(self) -> None:
        source = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-i18n"
            / "src"
            / "resources"
            / "playground"
            / "chat.ts"
        ).read_text(encoding="utf-8")

        for key in [
            "playground.chat.title",
            "playground.chat.subtitle",
            "playground.chat.emptyTitle",
            "playground.chat.emptyDescription",
            "playground.chat.input.placeholder",
            "playground.chat.input.send",
            "playground.chat.vendor",
            "playground.chat.model",
            "playground.chat.apiKey.loading",
            "playground.chat.apiKey.label",
            "playground.chat.apiKey.empty",
            "playground.chat.apiKey.create",
            "playground.chat.apiKey.loadFailed",
            "playground.chat.history",
            "playground.chat.newChat",
            "playground.chat.errors.missingApiKey",
            "playground.chat.errors.emptyResponse",
        ]:
            with self.subTest(key=key):
                self.assertEqual(
                    2,
                    source.count(f'"{key}"'),
                    f"{key} must be translated in both locales",
                )

    def test_playground_chat_loads_history_and_uses_app_chat_runtime_sse(self) -> None:
        chat_service_source = (
            PLAYGROUND_ROOT / "components" / "chat" / "chatService.ts"
        ).read_text(encoding="utf-8")
        chat_page_source = (
            PLAYGROUND_ROOT / "components" / "chat" / "ChatPage.tsx"
        ).read_text(encoding="utf-8")
        chat_session_list_source = (
            PLAYGROUND_ROOT / "components" / "chat" / "ChatSessionList.tsx"
        ).read_text(encoding="utf-8")
        chat_storage_source = (
            PLAYGROUND_ROOT / "components" / "chat" / "chatLocalStore.ts"
        ).read_text(encoding="utf-8")
        chat_types_source = (
            PLAYGROUND_ROOT / "components" / "chat" / "chatTypes.ts"
        ).read_text(encoding="utf-8")
        commons_runtime_source = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawroutes-pc-commons"
            / "src"
            / "runtime.ts"
        ).read_text(encoding="utf-8")
        commons_package_source = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawroutes-pc-commons"
            / "package.json"
        ).read_text(encoding="utf-8")
        portal_tsconfig_source = (
            ROOT / "apps" / "sdkwork-clawrouter-pc" / "tsconfig.json"
        ).read_text(encoding="utf-8")

        self.assertIn("@sdkwork/clawrouter-app-sdk", commons_package_source)
        self.assertIn("@sdkwork/clawrouter-app-sdk", portal_tsconfig_source)
        self.assertIn("streamRuntimeInvocationEvents", commons_runtime_source)
        self.assertIn("streamJson<RuntimeStreamEvent>", commons_runtime_source)
        self.assertIn("readRuntimeUsageSnapshot", commons_runtime_source)
        self.assertIn("mergeRuntimeUsageSnapshots", commons_runtime_source)
        self.assertIn("appApiPath", commons_runtime_source)

        self.assertIn("export class ChatService", chat_service_source)
        self.assertIn("appRuntimeApiOperations", chat_service_source)
        self.assertNotIn("getClawRouterAppSdkClient()", chat_service_source)
        self.assertNotIn("client.chat.", chat_service_source)
        self.assertNotIn("client.runtime.", chat_service_source)
        self.assertIn("listChatConversations", chat_service_source)
        self.assertIn("listChatMessages", chat_service_source)
        self.assertIn("createChatConversation", chat_service_source)
        self.assertIn("createChatTurn", chat_service_source)
        self.assertIn("createRuntimeInvocation", chat_service_source)
        self.assertIn("streamRuntimeEvents(runtimeInvocation.id)", chat_service_source)
        self.assertIn("completeRuntimeInvocation", chat_service_source)
        self.assertIn("completeChatTurnResponse", chat_service_source)
        self.assertIn("async function failTurnResponse", chat_service_source)
        self.assertIn("await failTurnResponse(", chat_service_source)
        self.assertIn("status: 'failed'", chat_service_source)
        self.assertIn("runtimeInvocationId: invocation.id", chat_service_source)
        self.assertIn("errorCode: failure.errorCode", chat_service_source)
        self.assertIn("readRuntimeTextDelta(event)", chat_service_source)
        self.assertIn("readRuntimeUsageSnapshot(event)", chat_service_source)
        self.assertIn("usageJson: usage", chat_service_source)
        self.assertIn("usage: { ...usage }", chat_service_source)
        self.assertIn("metadata: {", chat_service_source)
        self.assertNotIn("routeKeyId", chat_service_source)
        self.assertNotIn("readOptionalInteger", chat_service_source)
        self.assertNotIn("input.selectedApiKeyId", chat_service_source)
        self.assertIn("latestCompletionId: conversation.id", chat_service_source)
        self.assertIn("toRuntimeMessages(input.messages, input.prompt)", chat_service_source)
        self.assertIn("message.status === 'sent' || message.status === 'complete'", chat_service_source)
        self.assertNotIn("function readMessageId", chat_service_source)
        self.assertNotIn("fetch(", chat_service_source)
        self.assertNotIn("axios", chat_service_source)
        self.assertNotIn("client.chat.completions", chat_service_source)
        self.assertNotIn("getClawRouterAiSdkClient", chat_service_source)

        self.assertIn("export interface ChatSessionSummary", chat_types_source)
        self.assertIn("export interface ChatSendResult", chat_types_source)
        self.assertNotIn("ChatApiKeyOption", chat_types_source)
        self.assertNotIn("copyableKey: ApiKey", chat_types_source)
        self.assertNotIn("groupName: ApiKey", chat_types_source)
        self.assertNotIn("selectedApiKeyId", chat_types_source)
        self.assertNotIn("apiKey?:", chat_types_source)
        self.assertIn("sessionId?: string", chat_types_source)

        self.assertIn("ChatService.fetchSessions", chat_page_source)
        self.assertIn("ChatService.fetchMessages", chat_page_source)
        self.assertIn("ChatService.sendMessage", chat_page_source)
        self.assertIn("loadStoredChatMessages", chat_page_source)
        self.assertIn("saveStoredChatConversation", chat_page_source)
        self.assertIn("mergeChatSessions", chat_page_source)
        self.assertIn("loading={loadingMessages}", chat_page_source)
        self.assertIn("loadingHistory={loadingSessions || loadingMessages}", chat_page_source)
        self.assertIn("<ChatSessionList", chat_page_source)
        self.assertIn("selectedSessionId", chat_page_source)
        self.assertIn("selectedChatModel", chat_page_source)
        self.assertIn("latestCompletionId", chat_page_source)
        self.assertIn("setSelectedSessionId(sessionId)", chat_page_source)
        self.assertNotIn("copyableKey: key.copyableKey", chat_page_source)
        self.assertNotIn("groupName: key.groupName", chat_page_source)
        self.assertIn("createChatUserMessage(input.prompt)", chat_page_source)
        self.assertIn("const handleSubmit = async (input: SimpleChatInputSubmit): Promise<boolean> =>", chat_page_source)
        self.assertIn("return true;", chat_page_source)
        self.assertIn("return false;", chat_page_source)
        self.assertIn("const failedMessages = [", chat_page_source)
        self.assertIn("streamedAssistantContent || errorMessage", chat_page_source)
        self.assertIn("setMessageError(errorMessage)", chat_page_source)
        self.assertNotIn("selectedApiKeyIdRef", chat_page_source)
        self.assertNotIn("selectedApiKeySnapshotId", chat_page_source)
        self.assertIn("const priorSessions = sessionsRef.current", chat_page_source)
        self.assertIn("const activeSessions = sessionChanged ? priorSessions : sessionsRef.current", chat_page_source)
        self.assertIn("selectedSessionIdRef", chat_page_source)
        self.assertIn("const sessionChanged = Boolean(sessionId) && sessionId !== selectedSessionIdRef.current", chat_page_source)
        self.assertIn("isNewChatDraftRef", chat_page_source)
        self.assertIn("setIsNewChatDraft(true)", chat_page_source)
        self.assertIn("if (isNewChatDraftRef.current) {", chat_page_source)
        self.assertIn("return '';", chat_page_source)
        self.assertIn("setIsNewChatDraft(false)", chat_page_source)
        self.assertIn("setLoadingMessages(false)", chat_page_source)
        self.assertIn("setMessageError(null)", chat_page_source)
        self.assertIn("resetActiveConversationView()", chat_page_source)
        self.assertNotIn("resetActiveConversationView({ clearSessions: true })", chat_page_source)
        self.assertNotIn("apiKeyId", chat_page_source)
        self.assertIn("disabled={submitting}", chat_page_source)
        self.assertNotIn("createLocalAssistantMessage", chat_page_source)

        self.assertIn("export function ChatSessionList", chat_session_list_source)
        self.assertIn("disabled?: boolean", chat_session_list_source)
        self.assertIn("disabled={disabled}", chat_session_list_source)
        self.assertIn("disabled={disabled || active}", chat_session_list_source)
        self.assertIn("playground.chat.newChat", chat_session_list_source)
        self.assertIn("playground.chat.history", chat_session_list_source)
        self.assertIn("sessions.map", chat_session_list_source)
        self.assertIn("CHAT_LOCAL_STORE_PREFIX", chat_storage_source)
        self.assertIn("export function loadStoredChatSessions", chat_storage_source)
        self.assertIn("export function loadStoredChatMessages", chat_storage_source)
        self.assertIn("export function saveStoredChatConversation", chat_storage_source)
        self.assertIn("export function mergeChatSessions", chat_storage_source)

    def test_playground_chat_controls_are_stable_and_polished(self) -> None:
        simple_chat_input_source = (
            PLAYGROUND_ROOT / "components" / "chat" / "SimpleChatInput.tsx"
        ).read_text(encoding="utf-8")
        model_picker_source = (
            PLAYGROUND_ROOT / "components" / "PlaygroundModelPicker.tsx"
        ).read_text(encoding="utf-8")
        page_source = (
            PLAYGROUND_ROOT / "pages" / "Playground.tsx"
        ).read_text(encoding="utf-8")
        agent_view_source = (
            PLAYGROUND_ROOT / "components" / "views" / "AgentView.tsx"
        ).read_text(encoding="utf-8")
        api_key_service_source = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-api-keys"
            / "src"
            / "apiKeyService.ts"
        ).read_text(encoding="utf-8")

        self.assertIn("const modelSelection = useMemo(", simple_chat_input_source)
        self.assertIn("const displaySelectedModel = modelSelection.displayModel", simple_chat_input_source)
        self.assertIn("const submitModel = modelSelection.submitModel", simple_chat_input_source)
        self.assertIn("const hasSubmittableModel = Boolean(submitModel)", simple_chat_input_source)
        self.assertNotIn("selectedApiKey", simple_chat_input_source)
        self.assertNotIn("apiKeys", simple_chat_input_source)
        self.assertIn("resolveChatInputSubmitBlockReason({", simple_chat_input_source)
        self.assertIn("loadingHistory,", simple_chat_input_source)
        self.assertIn("const canSubmit = !submitBlockReason && hasSubmittableModel", simple_chat_input_source)
        self.assertIn("const submitted = await onSubmit({", simple_chat_input_source)
        self.assertIn("if (submitted) {", simple_chat_input_source)
        self.assertIn("disabled={submitting}", simple_chat_input_source)
        self.assertIn("w-fit min-w-0 max-w-full flex-[0_1_auto]", simple_chat_input_source)
        self.assertNotIn("w-full max-w-[136px]", simple_chat_input_source)
        self.assertNotIn("max-w-[168px]", simple_chat_input_source)
        self.assertNotIn("max-w-[176px]", simple_chat_input_source)
        self.assertNotIn("selectedModel.id && selectedApiKeyId", simple_chat_input_source)
        self.assertFalse((PLAYGROUND_ROOT / "components" / "chat" / "ChatApiKeySwitcher.tsx").exists())

        self.assertIn("usePopoverDismiss", model_picker_source)
        self.assertIn("disabled?: boolean", model_picker_source)
        self.assertNotIn("onMouseEnter", model_picker_source)
        self.assertIn("w-[392px]", model_picker_source)
        self.assertNotIn("w-[520px]", model_picker_source)

        self.assertIn("useEffect(() => {", page_source)
        self.assertIn("setShowModelMenu(false);", page_source)
        self.assertIn("}, [modality]);", page_source)
        self.assertIn("w-[450px]", agent_view_source)

        self.assertNotIn("SdkAppApiKeyListResponse['groups']", api_key_service_source)
        self.assertNotIn("readRequiredApiItems(result, 'console.apiKeys.errors.loadGroupsFallback', ['groups'])", api_key_service_source)
        self.assertIn("readApiKeyDisplayName(id, name)", api_key_service_source)
        self.assertNotIn("isSecretLikeApiKeyName", api_key_service_source)

    def test_playground_history_rust_read_models_fail_closed_for_invalid_database_rows(self) -> None:
        for relative in [
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/app_generation_history_read_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/app_generation_history_read_store.rs",
        ]:
            with self.subTest(store=relative):
                self.assertFalse((ROOT / relative).exists())


if __name__ == "__main__":
    unittest.main()
