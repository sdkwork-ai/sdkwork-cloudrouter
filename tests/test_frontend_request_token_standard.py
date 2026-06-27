import unittest
import re
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REQUEST_ID_SOURCE = (
    ROOT
    / "apps"
    / "sdkwork-clawrouter-pc"
    / "packages"
    / "sdkwork-clawroutes-pc-commons"
    / "src"
    / "idempotency.ts"
)
PORTAL_SOURCE_ROOT = ROOT / "apps" / "sdkwork-clawrouter-pc"
APP_OPENAPI_SOURCE = ROOT / "generated" / "openapi" / "clawrouter-app-openapi.json"
BACKEND_OPENAPI_SOURCE = ROOT / "generated" / "openapi" / "clawrouter-backend-openapi.json"
APP_SDK_SOURCE_ROOT = ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src"
BACKEND_SDK_SOURCE_ROOT = ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src"
API_CONTRACT_MANIFEST = ROOT / "generated" / "api" / "api-contract-manifest.json"
VERIFIER_SOURCE = ROOT / "scripts" / "verify-claw-router-application.mjs"
TOOLING_TEST_SOURCE = ROOT / "scripts" / "run-claw-router-application.test.mjs"
NODE_TEST_SOURCE = ROOT / "apps" / "sdkwork-clawrouter-pc" / "commons-runtime.test.ts"
API_PLAYGROUND_REQUEST_SOURCE = (
    ROOT.parent
    / "sdkwork-documents"
    / "apps"
    / "sdkwork-documents-pc"
    / "packages"
    / "sdkwork-documents-pc-api-reference"
    / "src"
    / "playgroundRequest.ts"
)
API_PLAYGROUND_RUNTIME_TEST_SOURCE = (
    ROOT / "apps" / "sdkwork-clawrouter-pc" / "api-reference-playground-runtime.test.ts"
)
SPECS_ROOT = ROOT.parent / "sdkwork-specs"
SDK_SPEC_SOURCE = SPECS_ROOT / "SDK_SPEC.md"
API_SPEC_SOURCE = SPECS_ROOT / "API_SPEC.md"
FRONTEND_SPEC_SOURCE = SPECS_ROOT / "FRONTEND_SPEC.md"
TEST_SPEC_SOURCE = SPECS_ROOT / "TEST_SPEC.md"


class FrontendRequestTokenStandardTest(unittest.TestCase):
    def test_request_tokens_fail_closed_without_cryptographic_randomness(self) -> None:
        source = REQUEST_ID_SOURCE.read_text(encoding="utf-8")

        self.assertNotIn("createRequestId", source)
        self.assertNotIn("createRequestToken", source)
        self.assertNotIn("createRequestParams", source)
        self.assertIn("export function createClientOperationToken", source)
        self.assertIn("export function createIdempotencyParams", source)
        self.assertNotIn("randomUUID", source)
        self.assertIn("getRandomValues", source)
        self.assertIn("Secure random source is unavailable", source)
        self.assertIn("Secure random source returned an invalid token seed", source)
        self.assertNotIn("xRequestId", source)
        self.assertNotIn("X-Request-Id", source)
        self.assertNotIn("request token", source.lower())
        self.assertNotIn("Math.random", source)
        self.assertNotIn("Date.now", source)
        self.assertNotIn("toString(36)", source)

    def test_request_token_runtime_test_is_part_of_product_verification(self) -> None:
        self.assertTrue(NODE_TEST_SOURCE.exists())
        verifier = VERIFIER_SOURCE.read_text(encoding="utf-8")
        tooling_test = TOOLING_TEST_SOURCE.read_text(encoding="utf-8")
        node_test = NODE_TEST_SOURCE.read_text(encoding="utf-8")

        self.assertIn("portal commons runtime tests", verifier)
        self.assertIn("apps/sdkwork-clawrouter-pc/commons-runtime.test.ts", verifier)
        self.assertIn("verification plan includes portal commons runtime tests", tooling_test)
        self.assertIn("createIdempotencyParams creates only idempotency keys", node_test)
        self.assertIn('assert.equal(captured[0].headers["x-request-id"], undefined)', node_test)
        self.assertIn("createClientOperationToken fails closed when secure randomness is unavailable", node_test)
        self.assertIn("createClientOperationToken rejects an all-zero random byte result", node_test)
        self.assertIn("curl snippet conversion strips caller-owned request id headers", node_test)

    def test_frontend_application_code_does_not_generate_or_send_request_ids(self) -> None:
        forbidden_patterns = [
            re.compile(r"\bxRequestId\b"),
            re.compile(r"X-Request-Id"),
            re.compile(r"x-request-id"),
            re.compile(r"createRequestId"),
            re.compile(r"createRequestToken"),
            re.compile(r"createRequestParams"),
            re.compile(r"crypto\.randomUUID\(\)"),
        ]
        offenders: list[str] = []
        source_roots = [PORTAL_SOURCE_ROOT / "src"]
        source_roots.extend(path for path in (PORTAL_SOURCE_ROOT / "packages").glob("*/src") if path.is_dir())
        for source_root in source_roots:
            for source_path in source_root.rglob("*.ts*"):
                if source_path.name == "request-id.ts":
                    offenders.append(str(source_path.relative_to(ROOT)))
                    continue
                source = source_path.read_text(encoding="utf-8")
                for pattern in forbidden_patterns:
                    if pattern.search(source):
                        offenders.append(str(source_path.relative_to(ROOT)))
                        break

        self.assertEqual([], offenders)

    def test_api_playground_rejects_caller_owned_request_id_headers(self) -> None:
        playground_request = API_PLAYGROUND_REQUEST_SOURCE.read_text(encoding="utf-8")
        runtime_test = API_PLAYGROUND_RUNTIME_TEST_SOURCE.read_text(encoding="utf-8")

        self.assertIn("compact.endsWith('requestid')", playground_request)
        self.assertIn("managedRequestIdHeader", runtime_test)
        self.assertIn("X-Request-Id", runtime_test)

    def test_frontend_outbound_contracts_do_not_accept_request_ids(self) -> None:
        declaration_pattern = re.compile(
            r"^\s*(?:export\s+)?(?:interface|type)\s+(\w+)\b",
            re.MULTILINE,
        )
        inline_input_pattern = re.compile(r"\binput:\s*\{[^}]*\brequestId\b", re.MULTILINE)
        offenders: list[str] = []
        source_roots = [PORTAL_SOURCE_ROOT / "src"]
        source_roots.extend(path for path in (PORTAL_SOURCE_ROOT / "packages").glob("*/src") if path.is_dir())
        for source_root in source_roots:
            for source_path in source_root.rglob("*.ts*"):
                if source_path.name == "request-id.ts":
                    offenders.append(str(source_path.relative_to(ROOT)))
                    continue
                source = source_path.read_text(encoding="utf-8")
                declarations = list(declaration_pattern.finditer(source))
                for index, declaration in enumerate(declarations):
                    name = declaration.group(1)
                    if not name.endswith(("Input", "Body", "Query", "Params", "Options")):
                        continue
                    end = declarations[index + 1].start() if index + 1 < len(declarations) else len(source)
                    if re.search(r"\brequestId\b", source[declaration.start():end]):
                        offenders.append(str(source_path.relative_to(ROOT)))
                        break
                else:
                    if inline_input_pattern.search(source):
                        offenders.append(str(source_path.relative_to(ROOT)))

        self.assertEqual([], offenders)

    def test_generated_app_and_backend_sdks_do_not_expose_request_id_headers(self) -> None:
        sdk_offenders: list[str] = []
        for sdk_root in [APP_SDK_SOURCE_ROOT, BACKEND_SDK_SOURCE_ROOT]:
            for source_path in sdk_root.rglob("*.ts"):
                source = source_path.read_text(encoding="utf-8")
                if "xRequestId" in source or "X-Request-Id" in source:
                    sdk_offenders.append(str(source_path.relative_to(ROOT)))

        openapi_offenders: list[str] = []
        for openapi_path in [APP_OPENAPI_SOURCE, BACKEND_OPENAPI_SOURCE]:
            spec = openapi_path.read_text(encoding="utf-8")
            if "X-Request-Id" in spec:
                openapi_offenders.append(str(openapi_path.relative_to(ROOT)))

        manifest = json.loads(API_CONTRACT_MANIFEST.read_text(encoding="utf-8"))
        manifest_offenders = [
            operation["key"]
            for operation in manifest["operations"]
            if operation.get("request_id_header") is True
        ]

        self.assertEqual([], sdk_offenders)
        self.assertEqual([], openapi_offenders)
        self.assertEqual([], manifest_offenders)

    def test_request_identity_standard_documents_server_owned_request_ids(self) -> None:
        sdk_spec = SDK_SPEC_SOURCE.read_text(encoding="utf-8")
        api_spec = API_SPEC_SOURCE.read_text(encoding="utf-8")
        frontend_spec = FRONTEND_SPEC_SOURCE.read_text(encoding="utf-8")
        test_spec = TEST_SPEC_SOURCE.read_text(encoding="utf-8")

        self.assertIn("Request Identity And Idempotency", sdk_spec)
        self.assertIn("Frontend and browser SDK consumers MUST NOT generate requestId values", sdk_spec)
        self.assertIn("SDK examples MUST pass Idempotency-Key only", sdk_spec)
        self.assertIn("App and backend API servers MUST generate a canonical UUID requestId", api_spec)
        self.assertIn("Generated app/backend SDKs MUST NOT expose optional `xRequestId`", sdk_spec)
        self.assertIn("success and error responses should expose the server requestid", api_spec.lower())
        self.assertIn("Frontend services MUST NOT generate requestId or xRequestId values", frontend_spec)
        self.assertIn("Static frontend scans MUST fail on xRequestId, `x-request-id`", test_spec)
        self.assertIn("Static SDK and OpenAPI scans MUST fail", test_spec)


if __name__ == "__main__":
    unittest.main()
