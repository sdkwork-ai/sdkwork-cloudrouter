import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = ROOT.parent
DOCUMENTS_SDK_REFERENCE_ROOT = (
    WORKSPACE_ROOT
    / "sdkwork-documents"
    / "apps"
    / "sdkwork-documents-pc"
    / "packages"
    / "sdkwork-documents-pc-sdk-reference"
    / "src"
)
COMMONS_RUNTIME = (
    ROOT
    / "apps"
    / "sdkwork-clawrouter-pc"
    / "packages"
    / "sdkwork-clawroutes-pc-commons"
    / "src"
    / "sdk-clients.ts"
)


class SdkReferenceRuntimeStandardTest(unittest.TestCase):
    def test_sdk_reference_runtime_accepts_all_router_api_systems(self) -> None:
        sdk_runtime_source = (DOCUMENTS_SDK_REFERENCE_ROOT / "sdkReferenceRuntime.ts").read_text(encoding="utf-8")
        sdk_data = (DOCUMENTS_SDK_REFERENCE_ROOT / "data" / "sdkData.ts").read_text(encoding="utf-8")
        commons_runtime = COMMONS_RUNTIME.read_text(encoding="utf-8")

        for system_id in [
            "llm-open-api",
            "image-open-api",
            "video-open-api",
            "audio-open-api",
            "payment-open-api",
            "iaas-open-api",
            "paas-open-api",
            "app-api",
            "backend-api",
        ]:
            with self.subTest(system=system_id):
                self.assertIn(system_id, sdk_runtime_source)
                self.assertIn(system_id, sdk_data)
                self.assertIn(system_id, commons_runtime)

        for legacy_id in ["'gateway'", "'cloud-services'", "'app'", "'backend'"]:
            self.assertNotIn(f"export type SdkReferenceSystem = {legacy_id}", sdk_runtime_source)

    def test_sdk_reference_examples_use_generated_sdk_client_mounts(self) -> None:
        sdk_data = (DOCUMENTS_SDK_REFERENCE_ROOT / "data" / "sdkData.ts").read_text(encoding="utf-8")

        for expected in [
            "client.iam.apiKeys.list()",
            "client.iam.users.current.retrieve()",
        ]:
            self.assertIn(expected, sdk_data)

        for stale_example in [
            "client.apiKeys.list()",
            "client.users.list()",
            "client.user.fetchUserProfile()",
            "client.apikey.fetchApiKeysMap()",
            "client.api_keys.list()",
            "client.users.list",
            "client.users().list()",
            "client.ApiKeys.ListAsync()",
            "client.Users.ListAsync()",
            "client.api_keys().list()",
            "client.users().list().await",
        ]:
            self.assertNotIn(stale_example, sdk_data)

    def test_sdk_reference_uses_shared_openapi_endpoint_types(self) -> None:
        sdk_reference = DOCUMENTS_SDK_REFERENCE_ROOT / "pages" / "SdkReference.tsx"
        endpoint_view = DOCUMENTS_SDK_REFERENCE_ROOT / "components" / "SdkEndpointView.tsx"
        sdk_reference_source = sdk_reference.read_text(encoding="utf-8")
        endpoint_view_source = endpoint_view.read_text(encoding="utf-8")

        for token in [
            "import type { ApiReferenceEndpoint } from '@sdkwork/documents-pc-api-reference/openapiTypes'",
            "import type { OpenApiDocument } from '@sdkwork/documents-pc-api-reference/openapiTypes'",
            "loadSdkReferenceSystems()",
            "activeSystemData?.openApiSpec",
        ]:
            self.assertIn(token, sdk_reference_source)

        sdk_runtime_source = (DOCUMENTS_SDK_REFERENCE_ROOT / "sdkReferenceRuntime.ts").read_text(encoding="utf-8")
        sdk_documentation_source = (DOCUMENTS_SDK_REFERENCE_ROOT / "sdkEndpointDocumentation.ts").read_text(encoding="utf-8")
        sdk_generation_service_source = (
            DOCUMENTS_SDK_REFERENCE_ROOT / "sdkReferenceGenerationService.ts"
        ).read_text(encoding="utf-8")
        adapter_source = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawroutes-pc-commons"
            / "src"
            / "documents-reference-runtime-adapter.ts"
        ).read_text(encoding="utf-8")

        self.assertIn("export interface GeneratedSdkToolConfig", sdk_runtime_source)
        self.assertIn("const [activeSdkConfig, setActiveSdkConfig] = useState<GeneratedSdkToolConfig | null>(null)", sdk_reference_source)
        self.assertIn("getDocumentsAppSdkClient().sdkReference.documentation.create", sdk_generation_service_source)
        self.assertIn("getDocumentsAppSdkClient().sdkReference.archives.create", sdk_generation_service_source)
        self.assertIn("@sdkwork/documents-app-sdk", adapter_source)
        self.assertNotIn("generateResponse.json()", sdk_reference_source)

        self.assertIn("import type { ApiParameter } from '@sdkwork/documents-pc-api-reference/openapiTypes'", endpoint_view_source)
        self.assertIn("import type { ApiReferenceEndpoint } from '@sdkwork/documents-pc-api-reference/openapiTypes'", endpoint_view_source)
        self.assertIn("export interface SdkEndpointData", sdk_documentation_source)
        self.assertIn("function toSdkMethodName(endpoint: ApiReferenceEndpoint, language: string): string", sdk_documentation_source)
        self.assertIn("function upperPathSegment(_match: string, chr: string): string", sdk_documentation_source)
        self.assertIn("function flattenSdkParameters(parameters: ApiParameter[] = [], parentPath = '')", endpoint_view_source)
        self.assertIn("flattenSdkParameters(localDocumentation.parameters).map", endpoint_view_source)

        for source_name, source in [
            ("SdkReference.tsx", sdk_reference_source),
            ("SdkEndpointView.tsx", endpoint_view_source),
        ]:
            with self.subTest(source=source_name):
                self.assertNotIn(": any", source)
                self.assertNotIn("as any", source)
                self.assertNotIn("unknown as", source)
                self.assertNotIn("useState<any", source)
                self.assertNotIn("Promise<any>", source)

    def test_sdk_reference_sidebar_uses_fixed_width_without_resize_drag_handle(self) -> None:
        sdk_reference_source = (DOCUMENTS_SDK_REFERENCE_ROOT / "pages" / "SdkReference.tsx").read_text(encoding="utf-8")
        portal_css = (ROOT / "apps" / "sdkwork-clawrouter-pc" / "src" / "index.css").read_text(encoding="utf-8")

        self.assertIn("md:w-[360px] md:max-w-[360px] md:basis-[360px]", sdk_reference_source)
        self.assertIn("md:h-full overflow-y-auto custom-scrollbar py-6 px-6 md:py-8", sdk_reference_source)
        self.assertNotIn("useReferenceSidebarResize", sdk_reference_source)
        self.assertNotIn("reference-sidebar-resizable", sdk_reference_source)
        self.assertNotIn("sidebarStyle", sdk_reference_source)
        self.assertNotIn("style={sidebarStyle}", sdk_reference_source)
        self.assertNotIn("data-reference-sidebar-resizable", sdk_reference_source)
        self.assertNotIn('aria-label="Resize SDK reference sidebar"', sdk_reference_source)
        self.assertNotIn('role="separator"', sdk_reference_source)
        self.assertNotIn('cursor-ew-resize', sdk_reference_source)
        self.assertNotIn('onPointerDown={startSidebarResize}', sdk_reference_source)
        self.assertNotIn("reference-sidebar-resizable", portal_css)
        self.assertNotIn("translate-x-1/2", sdk_reference_source)
        self.assertNotIn("reference-sidebar-resizable relative w-full", sdk_reference_source)
        self.assertNotIn("py-6 px-6 md:py-8 overflow-y-auto custom-scrollbar bg-slate", sdk_reference_source)
        self.assertNotIn("md:w-[var(--reference-sidebar-width)]", sdk_reference_source)
        self.assertNotIn("md:w-64", sdk_reference_source)


if __name__ == "__main__":
    unittest.main()
