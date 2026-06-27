import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SKILL_PACKAGE = (
    ROOT
    / "apps"
    / "sdkwork-clawrouter-pc"
    / "packages"
    / "sdkwork-clawrouter-pc-admin-skill"
    / "src"
)


class AdminSkillRuntimeStandardTest(unittest.TestCase):
    def test_skill_admin_derives_bindings_from_agent_backend_sdk(self) -> None:
        service = (SKILL_PACKAGE / "skillService.ts").read_text(encoding="utf-8")
        page = (SKILL_PACKAGE / "index.tsx").read_text(encoding="utf-8")

        self.assertIn("getSdkworkAgentBackendSdkClient().ai.agents.list", service)
        self.assertIn("managementProfile", service)
        self.assertIn("skillIds", service)
        self.assertIn("listAgentSkillBindings", page)

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
