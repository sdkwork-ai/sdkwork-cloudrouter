import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WEB_FRAMEWORK_ROOT = ROOT.parent / "sdkwork-web-framework"
DASHBOARD = (
    ROOT
    / "deployments"
    / "grafana"
    / "claw-router-http-operations-dashboard.json"
)
ALERTS = ROOT / "deployments" / "prometheus" / "claw-router-alerts.yaml"
RUNBOOK = ROOT / "docs" / "runbooks" / "observability-alert-response.md"
RUNBOOK_URL = (
    "https://github.com/Sdkwork-Cloud/sdkwork-clawrouter/blob/main/"
    "docs/runbooks/observability-alert-response.md"
)

RUNTIME_METRICS = {
    "sdkwork_http_requests_labeled_total",
    "sdkwork_http_request_duration_seconds_bucket",
    "sdkwork_http_metric_series_dropped_total",
    "sdkwork_http_readiness_checks_total",
}
EXTERNAL_METRICS = {
    "up",
    "container_memory_working_set_bytes",
    "container_spec_memory_limit_bytes",
    "kube_pod_container_status_last_terminated_reason",
}
METRIC_REFERENCE = re.compile(
    r"\b(?:sdkwork|http|container|kube)_[a-z0-9_]+"
    r"(?:_total|_bucket|_bytes|_reason)\b|\bup\b"
)

KUBERNETES_SCRAPE_CONTRACTS = {
    "claw-router-gateway.yaml": (
        "18080",
        "SDKWORK_CLAWROUTER_APPLICATION_PUBLIC_INGRESS_BIND",
    ),
    "claw-router-admin-api.yaml": ("18081", "SDKWORK_CLAW_ADMIN_API_BIND"),
    "claw-router-app-api.yaml": ("18082", "SDKWORK_CLAW_APP_API_BIND"),
    "claw-router-edge.yaml": ("3900", "SDKWORK_CLAW_GATEWAY_BIND"),
}


def _dashboard_expressions(document: dict) -> list[str]:
    expressions: list[str] = []
    for panel in document.get("panels", []):
        for target in panel.get("targets", []):
            expression = target.get("expr")
            if expression:
                expressions.append(expression)
    return expressions


class ObservabilityRuntimeContractTest(unittest.TestCase):
    def test_dashboard_is_valid_and_queries_only_runtime_metrics(self) -> None:
        dashboard = json.loads(DASHBOARD.read_text(encoding="utf-8"))
        expressions = _dashboard_expressions(dashboard)
        self.assertTrue(expressions)
        references = set(METRIC_REFERENCE.findall("\n".join(expressions)))
        self.assertEqual(
            {
                "sdkwork_http_requests_labeled_total",
                "sdkwork_http_request_duration_seconds_bucket",
            },
            references,
        )
        serialized = json.dumps(dashboard)
        self.assertNotIn("tenant_id", serialized)
        self.assertNotIn("clawrouter_slo_", serialized)
        self.assertNotIn("clawrouter_requests_total", serialized)

        variables = {
            item["name"] for item in dashboard["templating"]["list"]
        }
        self.assertEqual(
            {
                "datasource",
                "service",
                "environment",
                "deployment_profile",
                "runtime_target",
            },
            variables,
        )

    def test_alerts_query_declared_runtime_or_platform_metrics(self) -> None:
        alerts = ALERTS.read_text(encoding="utf-8")
        references = set(METRIC_REFERENCE.findall(alerts))
        self.assertEqual(set(), references - RUNTIME_METRICS - EXTERNAL_METRICS)
        self.assertNotIn("docs.clawrouter.example.com", alerts)
        self.assertNotIn("clawrouter_slo_", alerts)
        self.assertNotIn("clawrouter_requests_total", alerts)
        self.assertNotIn("tenant_id", alerts)

        alert_blocks = alerts.split("      - alert: ")[1:]
        self.assertGreaterEqual(len(alert_blocks), 10)
        for block in alert_blocks:
            alert_name = block.splitlines()[0].strip()
            with self.subTest(alert=alert_name):
                self.assertIn(f'runbook_url: "{RUNBOOK_URL}"', block)

    def test_referenced_application_metrics_exist_in_runtime_source(self) -> None:
        framework_metrics = (
            WEB_FRAMEWORK_ROOT / "crates" / "sdkwork-web-core" / "src" / "metrics.rs"
        ).read_text(encoding="utf-8")
        claw_metrics = (
            ROOT / "crates" / "sdkwork-claw-http" / "src" / "metrics.rs"
        ).read_text(encoding="utf-8")
        runtime_source = framework_metrics + claw_metrics
        for metric in RUNTIME_METRICS:
            with self.subTest(metric=metric):
                self.assertIn(metric, runtime_source)

        self.assertIn("operation_id=", framework_metrics)
        self.assertNotIn("operationId=", framework_metrics)
        self.assertIn("REQUEST_SERIES_SHARDS: usize = 64", framework_metrics)
        self.assertIn("DEFAULT_MAX_LABELED_REQUEST_SERIES: usize = 4_096", framework_metrics)

    def test_kubernetes_scrape_ports_match_process_bind_contracts(self) -> None:
        root = ROOT / "deployments" / "kubernetes"
        for file_name, (port, bind_variable) in KUBERNETES_SCRAPE_CONTRACTS.items():
            text = (root / file_name).read_text(encoding="utf-8")
            with self.subTest(deployment=file_name):
                self.assertIn('prometheus.io/scrape: "true"', text)
                self.assertIn("prometheus.io/path: /metrics", text)
                self.assertIn(f'prometheus.io/port: "{port}"', text)
                self.assertIn(f"containerPort: {port}", text)
                self.assertIn(f"name: {bind_variable}", text)
                self.assertIn(f"value: 0.0.0.0:{port}", text)

    def test_runbook_is_real_and_indexed(self) -> None:
        runbook = RUNBOOK.read_text(encoding="utf-8")
        index = (ROOT / "docs" / "runbooks" / "README.md").read_text(
            encoding="utf-8"
        )
        self.assertIn("sdkwork_http_requests_labeled_total", runbook)
        self.assertIn("OOMKilled", runbook)
        self.assertIn(RUNBOOK.name, index)


if __name__ == "__main__":
    unittest.main()
