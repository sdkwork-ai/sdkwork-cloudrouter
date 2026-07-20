import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PRODUCT_API_ROOT = ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api"
GATEWAY_SOURCE_ROOT = ROOT / "services" / "sdkwork-clawrouter-edge-runtime" / "src"


class BackendRequestIdentityStandardTest(unittest.TestCase):
    def test_product_api_modules_use_canonical_request_id_helper(self) -> None:
        forbidden_patterns = [
            re.compile(r"\bfn\s+normalize_request_id\s*\("),
            re.compile(r"\brequired_header\s*\(\s*headers\s*,\s*REQUEST_ID_HEADER\s*\)"),
            re.compile(r"\boptional_header\s*\(\s*headers\s*,\s*REQUEST_ID_HEADER\s*\)"),
            re.compile(r"\brequest_id_from_headers\s*\("),
            re.compile(r"\boptional_request_id_from_headers\s*\("),
            re.compile(r"\bREQUEST_ID_HEADER\b"),
        ]
        offenders: list[str] = []

        for source_path in PRODUCT_API_ROOT.glob("*.rs"):
            if source_path.name == "request_id.rs":
                continue
            source = source_path.read_text(encoding="utf-8")
            if any(pattern.search(source) for pattern in forbidden_patterns):
                offenders.append(str(source_path.relative_to(ROOT)))

        self.assertEqual([], offenders)

    def test_request_id_helper_is_server_generated_only(self) -> None:
        source = (PRODUCT_API_ROOT / "request_id.rs").read_text(encoding="utf-8")

        self.assertIn("pub fn generate_server_request_id()", source)
        self.assertNotIn("headers.get", source)
        self.assertNotIn("X-Request-Id", source)
        self.assertNotIn("optional_request_id_from_headers", source)

    def test_gateway_runtime_usage_ids_are_server_generated(self) -> None:
        source_files = [
            GATEWAY_SOURCE_ROOT / "passthrough.rs",
            GATEWAY_SOURCE_ROOT / "invocation_http.rs",
        ]
        identity_source = (GATEWAY_SOURCE_ROOT / "request_identity.rs").read_text(encoding="utf-8")
        forbidden_patterns = [
            re.compile(r'request_id:\s*request_header_value\([^)]*"x-request-id"'),
            re.compile(r'request_id:\s*header_value\([^)]*"x-request-id"'),
            re.compile(r'generated_adapter_request_id'),
            re.compile(r'generated_route_scoped_request_id'),
            re.compile(r'format!\("adapter-'),
            re.compile(r'format!\("route-scoped-usage-'),
        ]

        offenders: list[str] = []
        for source_path in source_files:
            source = source_path.read_text(encoding="utf-8")
            if any(pattern.search(source) for pattern in forbidden_patterns):
                offenders.append(str(source_path.relative_to(ROOT)))
            self.assertIn("crate::request_identity::generate_server_request_id", source)
            self.assertIn("generate_server_request_id()", source)

        self.assertIn("getrandom::fill", identity_source)
        self.assertIn("AtomicU64", identity_source)
        self.assertIn("FALLBACK_COUNTER", identity_source)

        self.assertEqual([], offenders)


if __name__ == "__main__":
    unittest.main()
