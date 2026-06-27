import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = ROOT.parent
API_REFERENCE_ROOT = (
    WORKSPACE_ROOT
    / "sdkwork-documents"
    / "apps"
    / "sdkwork-documents-pc"
    / "packages"
    / "sdkwork-documents-pc-api-reference"
    / "src"
)


class ApiReferencePlaygroundStandardTest(unittest.TestCase):
    def test_api_playground_param_rows_use_deterministic_ids(self) -> None:
        playground = API_REFERENCE_ROOT / "components" / "ApiPlayground.tsx"
        params_table = API_REFERENCE_ROOT / "components" / "ApiPlaygroundParamsTable.tsx"
        row_runtime = API_REFERENCE_ROOT / "apiPlaygroundRows.ts"
        response_download = API_REFERENCE_ROOT / "playgroundResponseDownload.ts"

        self.assertTrue(row_runtime.exists(), "API Playground row behavior must live in a pure module.")
        self.assertTrue(response_download.exists(), "API Playground response download behavior must live in a pure module.")

        playground_source = playground.read_text(encoding="utf-8")
        params_table_source = params_table.read_text(encoding="utf-8")
        row_runtime_source = row_runtime.read_text(encoding="utf-8")
        response_download_source = response_download.read_text(encoding="utf-8")

        self.assertIn("makeApiPlaygroundSchemaRows", row_runtime_source)
        self.assertIn("makeApiPlaygroundEmptyRow", row_runtime_source)
        self.assertIn("extractApiPlaygroundPathTemplateVariables", row_runtime_source)
        self.assertIn("parseApiPlaygroundBulkRows", row_runtime_source)
        self.assertIn("createApiPlaygroundInitialState", playground_source)
        self.assertIn("makeApiPlaygroundEmptyRow", playground_source)
        self.assertIn("parseApiPlaygroundBulkRows", playground_source)
        self.assertIn("downloadApiPlaygroundResponse", playground_source)
        self.assertIn("serializeApiPlaygroundResponseData", playground_source)
        self.assertIn("from '../apiPlaygroundRows'", params_table_source)
        self.assertIn("export function serializeApiPlaygroundResponseData", response_download_source)
        self.assertIn("export function createApiPlaygroundResponseDownload", response_download_source)
        self.assertIn("export function downloadApiPlaygroundResponse", response_download_source)

        for source_path, source in [
            ("ApiPlayground.tsx", playground_source),
            ("apiPlaygroundRows.ts", row_runtime_source),
            ("playgroundResponseDownload.ts", response_download_source),
        ]:
            with self.subTest(source=source_path):
                self.assertNotIn("Math.random", source)
                self.assertNotIn("crypto.randomUUID", source)
                self.assertNotIn("randomUUID", source)
                self.assertNotIn("getRandomValues", source)

        for unstable_id_token in [
            "bulk-query-${Date.now()}",
            "bulk-header-${Date.now()}",
            "Math.random().toString",
            "response-${Date.now()}",
        ]:
            self.assertNotIn(unstable_id_token, playground_source)

        self.assertEqual(
            2,
            playground_source.count("downloadApiPlaygroundResponse("),
            "ApiPlayground must route both Send and Download plus Save Response through the same helper.",
        )
        for dom_download_token in [
            "URL.createObjectURL",
            "document.createElement('a')",
            "document.body.appendChild",
            "URL.revokeObjectURL",
            ".download =",
        ]:
            self.assertNotIn(dom_download_token, playground_source)

        for helper_download_token in [
            "new Blob([download.text]",
            "URL.createObjectURL",
            "document.createElement('a')",
            "document.body.appendChild",
            "URL.revokeObjectURL",
            "anchor.download = download.filename",
        ]:
            self.assertIn(helper_download_token, response_download_source)

    def test_api_playground_schema_body_examples_are_not_named_as_mock_data(self) -> None:
        row_runtime = API_REFERENCE_ROOT / "apiPlaygroundRows.ts"
        row_runtime_source = row_runtime.read_text(encoding="utf-8")

        self.assertIn("generateOpenApiSchemaExample", row_runtime_source)
        self.assertIn("return JSON.stringify(generateOpenApiSchemaExample(schema", row_runtime_source)
        self.assertNotIn("generateApiPlaygroundMockBody", row_runtime_source)
        self.assertNotIn("MockBody", row_runtime_source)
        self.assertNotIn("mock body", row_runtime_source.lower())

    def test_api_reference_components_use_typed_openapi_boundaries(self) -> None:
        api_types = API_REFERENCE_ROOT / "openapiTypes.ts"
        api_reference = API_REFERENCE_ROOT / "pages" / "ApiReference.tsx"
        endpoint_view = API_REFERENCE_ROOT / "components" / "ApiEndpointView.tsx"
        playground = API_REFERENCE_ROOT / "components" / "ApiPlayground.tsx"
        params_table = API_REFERENCE_ROOT / "components" / "ApiPlaygroundParamsTable.tsx"

        self.assertTrue(api_types.exists(), "OpenAPI and API Reference endpoint contracts must live in a shared typed module.")

        api_types_source = api_types.read_text(encoding="utf-8")
        api_reference_source = api_reference.read_text(encoding="utf-8")
        endpoint_view_source = endpoint_view.read_text(encoding="utf-8")
        playground_source = playground.read_text(encoding="utf-8")
        params_table_source = params_table.read_text(encoding="utf-8")

        for token in [
            "export interface ApiReferenceEndpoint",
            "export interface OpenApiDocument",
            "export interface OpenApiOperation",
            "export interface OpenApiJsonSchema",
            "export function isOpenApiDocument",
            "export function isOpenApiOperation",
            "export function isOpenApiParameter",
            "export function asOpenApiJsonSchema",
        ]:
            self.assertIn(token, api_types_source)

        self.assertIn("import type { ApiReferenceEndpoint", api_reference_source)
        self.assertIn("import type { ApiReferenceEndpoint }", endpoint_view_source)
        self.assertIn("import type { ApiReferenceEndpoint }", playground_source)
        self.assertIn("const [response, setResponse] = useState<PlaygroundResponse | null>(null)", playground_source)
        self.assertIn("const parameters = React.useMemo<OpenApiParameter[]>(()", playground_source)
        self.assertIn("unknownToErrorMessage", playground_source)

        for source_name, source in [
            ("ApiReference.tsx", api_reference_source),
            ("ApiEndpointView.tsx", endpoint_view_source),
            ("ApiPlayground.tsx", playground_source),
            ("ApiPlaygroundParamsTable.tsx", params_table_source),
        ]:
            with self.subTest(source=source_name):
                self.assertNotIn(": any", source)
                self.assertNotIn("as any", source)
                self.assertNotIn("unknown as", source)
                self.assertNotIn("useState<any", source)

    def test_api_reference_sidebar_uses_fixed_width_without_resize_drag_handle(self) -> None:
        api_reference_source = (API_REFERENCE_ROOT / "pages" / "ApiReference.tsx").read_text(encoding="utf-8")
        portal_css = (ROOT / "apps" / "sdkwork-clawrouter-pc" / "src" / "index.css").read_text(encoding="utf-8")

        self.assertIn("documentsShellLayout.stickySidebarBelowSubHeader", api_reference_source)
        self.assertIn("documentsShellLayout.stickySubHeader", api_reference_source)
        self.assertIn("w-[360px] max-w-[360px] basis-[360px]", api_reference_source)
        self.assertIn("flex-1 overflow-y-auto custom-scrollbar p-4", api_reference_source)
        self.assertNotIn("useReferenceSidebarResize", api_reference_source)
        self.assertNotIn("reference-sidebar-resizable", api_reference_source)
        self.assertNotIn("sidebarStyle", api_reference_source)
        self.assertNotIn("style={sidebarStyle}", api_reference_source)
        self.assertNotIn("data-reference-sidebar-resizable", api_reference_source)
        self.assertNotIn('aria-label="Resize API reference sidebar"', api_reference_source)
        self.assertNotIn('role="separator"', api_reference_source)
        self.assertNotIn('cursor-ew-resize', api_reference_source)
        self.assertNotIn('onPointerDown={startSidebarResize}', api_reference_source)
        self.assertNotIn("reference-sidebar-resizable", portal_css)
        self.assertNotIn("translate-x-1/2", api_reference_source)
        self.assertNotIn("w-72 shrink-0", api_reference_source)

    def test_api_playground_request_builder_does_not_import_react_components_for_types(self) -> None:
        request_source = (API_REFERENCE_ROOT / "playgroundRequest.ts").read_text(encoding="utf-8")

        self.assertIn("import type { ParamRow } from './apiPlaygroundRows';", request_source)
        self.assertNotIn("from './components/ApiPlaygroundParamsTable'", request_source)

    def test_api_reference_playground_has_ssr_dom_smoke_and_initial_state_contract(self) -> None:
        row_runtime = (API_REFERENCE_ROOT / "apiPlaygroundRows.ts").read_text(encoding="utf-8")
        code_snippet_runtime = (API_REFERENCE_ROOT / "codeSnippetClient.ts").read_text(encoding="utf-8")
        playground = (API_REFERENCE_ROOT / "components" / "ApiPlayground.tsx").read_text(encoding="utf-8")
        smoke = ROOT / "apps" / "sdkwork-clawrouter-pc" / "api-reference-ssr-smoke.test.cjs"
        production_smoke = ROOT / "apps" / "sdkwork-clawrouter-pc" / "scripts" / "smoke-production-browser.mjs"
        playground_request = API_REFERENCE_ROOT / "playgroundRequest.ts"
        playground_download = API_REFERENCE_ROOT / "playgroundResponseDownload.ts"
        verifier = (ROOT / "scripts" / "verify-claw-router-application.mjs").read_text(encoding="utf-8")
        product_tests = (ROOT / "scripts" / "run-claw-router-application.test.mjs").read_text(encoding="utf-8")

        self.assertIn("export function createApiPlaygroundInitialState", row_runtime)
        self.assertIn("export function createApiPlaygroundInitialStateKey", row_runtime)
        self.assertIn("export function extractApiPlaygroundPathTemplateVariables", row_runtime)
        self.assertIn("appendMissingPathTemplateRows", row_runtime)
        self.assertIn("stableStringify", row_runtime)
        self.assertIn("export function extractCodeSnippetPathTemplateVariables", code_snippet_runtime)
        self.assertIn("inferCodeSnippetPathVariableExample", code_snippet_runtime)
        self.assertIn("extractCodeSnippetPathTemplateVariables(expandedUrl)", code_snippet_runtime)
        self.assertIn("createApiPlaygroundInitialState", playground)
        self.assertIn("createApiPlaygroundInitialStateKey", playground)
        self.assertIn("initialStateKey", playground)
        self.assertIn("setQueryParams(initialState.queryParams)", playground)
        self.assertIn("setPathParams(initialState.pathParams)", playground)
        self.assertIn("setHeaderParams(initialState.headerParams)", playground)
        self.assertIn("setBodyValue(initialState.bodyValue)", playground)
        self.assertTrue(smoke.exists())
        smoke_source = smoke.read_text(encoding="utf-8")
        self.assertIn("renderToStaticMarkup", smoke_source)
        self.assertIn("ApiPlayground", smoke_source)
        self.assertIn("ApiPlaygroundParamsTable", smoke_source)
        self.assertIn("createApiPlaygroundInitialState", smoke_source)
        self.assertIn("Query Params", smoke_source)
        self.assertIn("Path Variables", smoke_source)
        self.assertIn("Bulk Edit", smoke_source)
        self.assertIn("Authorization", smoke_source)
        self.assertIn("X-Trace-Id", smoke_source)
        self.assertIn("portal api reference SSR smoke tests", verifier)
        self.assertIn("api-reference-ssr-smoke.test.cjs", verifier)
        self.assertIn("verification plan includes portal api reference SSR smoke before broad suites", product_tests)

        production_smoke_source = production_smoke.read_text(encoding="utf-8")
        playground_request_source = playground_request.read_text(encoding="utf-8")
        playground_download_source = playground_download.read_text(encoding="utf-8")
        api_reference_smoke_start = production_smoke_source.index('pathName: "/api-reference"')
        tool_api_smoke_start = production_smoke_source.index("async function canBindPort")
        api_reference_smoke_source = production_smoke_source[api_reference_smoke_start:tool_api_smoke_start]

        self.assertIn('pathName: "/api-reference"', production_smoke_source)
        self.assertIn('/api-reference?__browser-smoke-playground-validation=1', api_reference_smoke_source)
        self.assertIn('/api-reference?__browser-smoke-playground-managed-header=1', api_reference_smoke_source)
        self.assertIn('/api-reference?__browser-smoke-playground-send=1', api_reference_smoke_source)
        self.assertIn('/api-reference?__browser-smoke-playground-send-download=1', api_reference_smoke_source)
        self.assertIn('/api-reference?__browser-smoke-tool-api-disabled=1', api_reference_smoke_source)
        self.assertIn("createApiPlaygroundInitialState", row_runtime)
        self.assertIn("createApiPlaygroundInitialStateKey", row_runtime)
        self.assertIn("extractApiPlaygroundPathTemplateVariables", row_runtime)
        self.assertIn("parseApiPlaygroundBulkRows", row_runtime)
        self.assertIn("extractCodeSnippetPathTemplateVariables", code_snippet_runtime)
        self.assertIn("buildPlaygroundRequest", playground)
        self.assertIn("buildPlaygroundRequest", playground_request_source)
        self.assertIn("FORBIDDEN_HEADER_NAMES", playground_request_source)
        self.assertIn("Unresolved Path Variable", playground_request_source)
        self.assertIn("resolveRequiredErrorTab", playground_request_source)
        self.assertIn("content-type", playground_request_source)
        self.assertIn("Managed Header", playground_request_source)
        self.assertIn("headers", playground)
        self.assertIn("downloadApiPlaygroundResponse", playground)
        self.assertIn("createApiPlaygroundResponseDownload", playground_download_source)
        self.assertIn("serializeApiPlaygroundResponseData", playground_download_source)
        self.assertIn("playground-response", playground_download_source)
        self.assertIn("playground-response-200-ok.json", api_reference_smoke_source)
        self.assertIn("Math.random", production_smoke_source)
        self.assertIn("production browser smoke validates api reference route bundle semantics", product_tests)

    def test_api_reference_playground_production_browser_smoke_covers_primitive_send_download_and_drawer(self) -> None:
        playground = (API_REFERENCE_ROOT / "components" / "ApiPlayground.tsx").read_text(encoding="utf-8")
        browser_smoke = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "scripts"
            / "smoke-production-browser.mjs"
        ).read_text(encoding="utf-8")
        product_tests = (ROOT / "scripts" / "run-claw-router-application.test.mjs").read_text(encoding="utf-8")

        for route in [
            "/api-reference?__browser-smoke-playground-primitive-response=1",
            "/api-reference?__browser-smoke-playground-send-download=1",
            "/api-reference?__browser-smoke-playground-drawer=1",
        ]:
            self.assertIn(route, browser_smoke)
            self.assertIn(route, product_tests)

        self.assertIn("API_PLAYGROUND_PRIMITIVE_FIXTURE_MODE", browser_smoke)
        self.assertIn("Browser smoke primitive response", browser_smoke)
        self.assertIn('window.__BROWSER_SMOKE_CLIPBOARD__ === "null"', browser_smoke)
        self.assertIn('window.__BROWSER_SMOKE_DOWNLOAD__?.text === "null"', browser_smoke)
        self.assertIn('clickRouteButtonByExactText("Send and Download")', browser_smoke)
        self.assertIn("clickRoutePlaygroundBulkEditForSection", browser_smoke)
        self.assertIn('clickRoutePlaygroundBulkEditForSection("Headers")', browser_smoke)
        self.assertIn('clickRoutePlaygroundBulkEditForSection("Query Params")', browser_smoke)
        self.assertIn('window.__BROWSER_SMOKE_DOWNLOAD__?.download === "playground-response-200-ok.json"', browser_smoke)
        self.assertIn('button[title="Close Drawer"]', browser_smoke)
        self.assertIn("clickRouteButtonByTitle(\"Close Drawer\")", browser_smoke)
        self.assertIn('!document.body.innerText.includes("API PLAYGROUND")', browser_smoke)
        self.assertIn("max-w-[100vw]", playground)
        self.assertIn("title={t('common.actions.closeDrawer')}", playground)
        self.assertIn('type="button"', playground)
        self.assertIn("group-focus-within/send:opacity-100", playground)
        self.assertIn("group-focus-within/send:visible", playground)
        self.assertIn("handleSendAndDownload", playground)

    def test_api_reference_playground_production_browser_smoke_covers_auth_and_network_failure(self) -> None:
        request_source = (API_REFERENCE_ROOT / "playgroundRequest.ts").read_text(encoding="utf-8")
        browser_smoke = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "scripts"
            / "smoke-production-browser.mjs"
        ).read_text(encoding="utf-8")
        product_tests = (ROOT / "scripts" / "run-claw-router-application.test.mjs").read_text(encoding="utf-8")

        for route in [
            "/api-reference?__browser-smoke-playground-api-key-auth=1",
            "/api-reference?__browser-smoke-playground-network-error=1",
        ]:
            self.assertIn(route, browser_smoke)
            self.assertIn(route, product_tests)

        self.assertIn("API_PLAYGROUND_AUTH_FIXTURE_MODE", browser_smoke)
        self.assertIn("API_PLAYGROUND_NETWORK_FAILURE_FIXTURE_MODE", browser_smoke)
        self.assertIn('setRouteSelectValueByOptionText("Bearer Token")', browser_smoke)
        self.assertIn('setRoutePasswordInputByPlaceholder("Enter your API Key (sk-...)", "browser-smoke-api-key")', browser_smoke)
        self.assertIn('requestHeaderValue(request, "authorization")', browser_smoke)
        self.assertIn("Browser smoke API key auth response", browser_smoke)
        self.assertIn('!document.body.innerText.includes("browser-smoke-api-key")', browser_smoke)
        self.assertIn("Fetch.failRequest", browser_smoke)
        self.assertIn('networkErrorReason: "ConnectionFailed"', browser_smoke)
        self.assertIn("errorReason: fixture.networkErrorReason", browser_smoke)
        self.assertIn("Network Error", browser_smoke)
        self.assertIn("This might be a CORS issue", browser_smoke)
        self.assertIn("0 Network Error", browser_smoke)

        self.assertIn("headers.Authorization = `Bearer ${input.apiKey.trim()}`", request_source)
        self.assertIn("headers.Authorization = `Bearer ${input.authToken.trim()}`", request_source)
        self.assertIn("credentials: input.authType === 'current_user' ? 'include' : 'omit'", request_source)

    def test_api_reference_playground_production_browser_smoke_intercepts_gateway_prefix_requests(self) -> None:
        schema_tabs_source = (API_REFERENCE_ROOT / "apiReferenceSchemaTabs.ts").read_text(encoding="utf-8")
        browser_smoke = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "scripts"
            / "smoke-production-browser.mjs"
        ).read_text(encoding="utf-8")

        self.assertIn("x-api-prefix", schema_tabs_source)
        self.assertIn('requestBaseUrl: resolveApiSystemRequestBaseUrl', schema_tabs_source)
        self.assertIn('urlPattern: "*://*/v1/*"', browser_smoke)
        self.assertIn('parsedUrl.pathname.startsWith("/v1/")', browser_smoke)
        self.assertIn("expectedChatCompletionsPath", browser_smoke)
        self.assertIn('"/v1/chat/completions"', browser_smoke)
        self.assertIn('"/api/v1/chat/completions"', browser_smoke)

    def test_api_reference_production_browser_smoke_blocks_disabled_local_tool_api_runtime_calls(self) -> None:
        endpoint_view = (API_REFERENCE_ROOT / "components" / "ApiEndpointView.tsx").read_text(encoding="utf-8")
        code_snippet_source = (API_REFERENCE_ROOT / "codeSnippetClient.ts").read_text(encoding="utf-8")
        browser_smoke = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "scripts"
            / "smoke-production-browser.mjs"
        ).read_text(encoding="utf-8")
        product_tests = (ROOT / "scripts" / "run-claw-router-application.test.mjs").read_text(encoding="utf-8")

        route = "/api-reference?__browser-smoke-tool-api-disabled=1"
        self.assertIn(route, browser_smoke)
        self.assertIn(route, product_tests)

        self.assertIn("createToolApiRequestCollector", browser_smoke)
        self.assertIn("toolApiRequestCollector.register(cdp)", browser_smoke)
        self.assertIn("Network.requestWillBeSent", browser_smoke)
        self.assertIn('forbiddenToolApiPaths: ["/api/code-snippet"]', browser_smoke)
        self.assertIn("/api/code-snippet", browser_smoke)
        self.assertIn("assertNoRequests(pathName)", browser_smoke)
        self.assertIn("CLAWROUTER_API_KEY", browser_smoke)
        self.assertIn('window.__CLAWROUTER_ENV__?.VITE_TOOL_API_ENABLED === "false"', browser_smoke)

        local_tool_flag_index = endpoint_view.index("const localToolApiEnabled")
        static_fallback_index = endpoint_view.index("const fallbackCode = buildStaticCodeSnippet(request)")
        disabled_gate_index = endpoint_view.index("if (!localToolApiEnabled)")
        dynamic_snippet_index = endpoint_view.index("generateCodeSnippet(request)")
        self.assertLess(local_tool_flag_index, static_fallback_index)
        self.assertLess(static_fallback_index, disabled_gate_index)
        self.assertLess(disabled_gate_index, dynamic_snippet_index)
        self.assertIn("setGeneratedCode(fallbackCode)", endpoint_view)
        self.assertIn("fetch('/api/code-snippet'", code_snippet_source)
        self.assertIn("export function buildStaticCodeSnippet", code_snippet_source)

    def test_api_reference_production_browser_smoke_covers_static_code_snippet_tabs_and_copy(self) -> None:
        endpoint_view = (API_REFERENCE_ROOT / "components" / "ApiEndpointView.tsx").read_text(encoding="utf-8")
        code_snippet_source = (API_REFERENCE_ROOT / "codeSnippetClient.ts").read_text(encoding="utf-8")
        browser_smoke = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "scripts"
            / "smoke-production-browser.mjs"
        ).read_text(encoding="utf-8")
        product_tests = (ROOT / "scripts" / "run-claw-router-application.test.mjs").read_text(encoding="utf-8")

        route = "/api-reference?__browser-smoke-code-snippet-tabs=1"
        self.assertIn(route, browser_smoke)
        self.assertIn(route, product_tests)

        self.assertIn('clickRouteCodeLanguageButtonByExactText("typescript")', browser_smoke)
        self.assertIn('clickRouteCodeLibraryButtonByExactText("fetch")', browser_smoke)
        self.assertIn('clickRouteButtonByTitle("Copy code")', browser_smoke)
        self.assertIn('window.__BROWSER_SMOKE_CLIPBOARD__?.includes("await fetch")', browser_smoke)
        self.assertIn('window.__BROWSER_SMOKE_CLIPBOARD__?.includes("CLAWROUTER_API_KEY")', browser_smoke)
        self.assertIn('forbiddenToolApiPaths: ["/api/code-snippet"]', browser_smoke)
        self.assertIn("axios.request", browser_smoke)
        self.assertIn("await fetch", browser_smoke)

        self.assertIn("CODEGEN_LANGUAGE_LIBRARY_MAP", code_snippet_source)
        self.assertIn("typescript: ['axios', 'fetch'", code_snippet_source)
        self.assertIn("function buildAxiosSnippet", code_snippet_source)
        self.assertIn("function buildFetchSnippet", code_snippet_source)
        self.assertIn('text={generatedCode}', endpoint_view)
        self.assertIn("title={t('common.actions.copyCode')}", endpoint_view)


if __name__ == "__main__":
    unittest.main()
