import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
API_SRC = REPO_ROOT / "services/sdkwork-clawrouter-router-service/src/api"
FORBIDDEN_IDENTIFIERS = (
    "PlusApiResult",
    "PlusErrorEnvelope",
    "ProjectionErrorEnvelope",
)


class RouterServiceApiEnvelopeStandardTests(unittest.TestCase):
    def test_router_service_api_handlers_do_not_reference_forbidden_legacy_envelopes(self):
        offenders: list[str] = []
        for path in sorted(API_SRC.glob("*.rs")):
            source = path.read_text(encoding="utf-8")
            for identifier in FORBIDDEN_IDENTIFIERS:
                if identifier in source:
                    offenders.append(f"{path.relative_to(REPO_ROOT)}: {identifier}")
        self.assertEqual(
            [],
            offenders,
            "router-service api handlers must use SdkWorkApiResponse helpers only",
        )

    def test_response_module_exposes_spec_compliant_helpers(self):
        response_rs = (API_SRC / "response.rs").read_text(encoding="utf-8")
        self.assertIn("pub fn success_envelope", response_rs)
        self.assertIn("pub fn problem_from_wire_code", response_rs)
        self.assertIn("application/problem+json", response_rs)
        self.assertNotIn("PlusApiResult", response_rs)


if __name__ == "__main__":
    unittest.main()
