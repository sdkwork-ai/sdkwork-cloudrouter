import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
AGENTS_PACKAGE = (
    ROOT
    / "apps"
    / "sdkwork-clawrouter-pc"
    / "packages"
    / "sdkwork-clawrouter-pc-admin-agents"
    / "src"
)


class AdminAgentsRuntimeStandardTest(unittest.TestCase):
    def test_agents_admin_uses_canonical_agent_backend_sdk_surface(self) -> None:
        service = (AGENTS_PACKAGE / "agentService.ts").read_text(encoding="utf-8")
        page = (AGENTS_PACKAGE / "index.tsx").read_text(encoding="utf-8")

        self.assertIn("getSdkworkAgentBackendSdkClient().ai.agents.list", service)
        self.assertIn("listManagedAgents", page)

        for forbidden in [
            "fetch(",
            "axios",
            "SDK_NOT_REGISTERED",
            "not registered yet",
            "when available",
        ]:
            self.assertNotIn(forbidden, service)
            self.assertNotIn(forbidden, page)


if __name__ == "__main__":
    unittest.main()
