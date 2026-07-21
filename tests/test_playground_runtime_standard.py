import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PLAYGROUND_ROOT = (
    ROOT
    / "apps"
    / "sdkwork-clawrouter-pc"
    / "packages"
    / "sdkwork-clawrouter-pc-playground"
)
PLAYGROUND_ADAPTER = PLAYGROUND_ROOT / "src" / "pages" / "Playground.tsx"
AGENTS_APP_ROOT = (
    ROOT.parent
    / "sdkwork-agents"
    / "apps"
    / "sdkwork-agents-pc"
)
AGENTS_PACKAGE_ROOT = AGENTS_APP_ROOT / "packages" / "sdkwork-agents-pc-agents"
AGENTS_CORE_ROOT = AGENTS_PACKAGE_ROOT.parent / "sdkwork-agents-pc-core"
AGENTS_WORKBENCH_ROOT = AGENTS_APP_ROOT / "src" / "workbench"


class PlaygroundRuntimeStandardTest(unittest.TestCase):
    def test_playground_is_a_thin_sdkwork_agents_workbench_host(self) -> None:
        adapter_source = PLAYGROUND_ADAPTER.read_text(encoding="utf-8")

        self.assertIn("@sdkwork/agents-pc/workbench", adapter_source)
        self.assertIn("AgentsWorkbench", adapter_source)
        self.assertIn("configureAgentsWorkbenchRuntime", adapter_source)
        self.assertIn("getSdkworkAgentAppSdkClient", adapter_source)
        self.assertIn("getSdkworkDriveAppSdkClient", adapter_source)
        self.assertIn("getSdkworkMemoryAppSdkClient", adapter_source)
        self.assertIn("getSdkworkPromptsAppSdkClient", adapter_source)
        self.assertIn("<AgentsWorkbench showSidebarLogo={false} />", adapter_source)
        self.assertNotIn("GlobalSidebar", adapter_source)
        self.assertNotIn("WORKBENCH_VIEW_BY_TAB", adapter_source)
        self.assertNotIn("PlaygroundPage", adapter_source)
        self.assertNotIn("PlaygroundService", adapter_source)
        self.assertNotIn("fetch(", adapter_source)
        self.assertNotIn("axios", adapter_source)
        self.assertLessEqual(adapter_source.count("\n"), 30)

    def test_agents_pc_exports_the_complete_embeddable_workbench(self) -> None:
        package = json.loads((AGENTS_APP_ROOT / "package.json").read_text(encoding="utf-8"))
        app_source = (AGENTS_APP_ROOT / "src" / "App.tsx").read_text(encoding="utf-8")
        workbench_export = (AGENTS_WORKBENCH_ROOT / "index.ts").read_text(encoding="utf-8")
        workbench_component = (
            AGENTS_WORKBENCH_ROOT / "AgentsWorkbench.tsx"
        ).read_text(encoding="utf-8")
        layout_source = (
            AGENTS_APP_ROOT / "src" / "components" / "WorkbenchLayout.tsx"
        ).read_text(encoding="utf-8")
        sidebar_source = (
            AGENTS_APP_ROOT / "src" / "components" / "GlobalSidebar.tsx"
        ).read_text(encoding="utf-8")
        tabs_source = (
            AGENTS_APP_ROOT / "src" / "components" / "workbenchTabs.ts"
        ).read_text(encoding="utf-8")

        self.assertEqual(
            "./src/workbench/index.ts",
            package["exports"]["./workbench"]["import"],
        )
        self.assertIn("AgentsWorkbench", workbench_export)
        self.assertIn("configureAgentsWorkbenchRuntime", workbench_export)
        self.assertIn("ThemeProvider", workbench_component)
        self.assertIn("AgentStateProvider", workbench_component)
        self.assertIn("WorkbenchLayout", workbench_component)
        self.assertIn("<AgentsWorkbench viewportMode=\"fixed\" />", app_source)
        self.assertIn("GlobalSidebar", layout_source)
        for package_name in [
            "agents-pc-chat",
            "agents-pc-inspiration",
            "agents-pc-creative",
            "agents-pc-assets",
            "agents-pc-presentation",
            "agents-pc-canvas",
        ]:
            self.assertIn(f"@sdkwork/{package_name}", layout_source)
        self.assertIn("'chat_session'", tabs_source)
        self.assertIn("DEFAULT_WORKBENCH_TAB", tabs_source)
        self.assertIn("SIDEBAR_TABS.map", sidebar_source)
        self.assertNotIn("@sdkwork/clawrouter", workbench_component)
        self.assertNotIn("@sdkwork/clawrouter", layout_source)

    def test_agents_package_exports_the_embeddable_home_facade(self) -> None:
        package = json.loads((AGENTS_PACKAGE_ROOT / "package.json").read_text(encoding="utf-8"))
        home_source = (AGENTS_PACKAGE_ROOT / "src" / "home.ts").read_text(encoding="utf-8")
        page_source = (
            AGENTS_PACKAGE_ROOT / "src" / "pages" / "AgentsHomePage.tsx"
        ).read_text(encoding="utf-8")
        conversation_source = (
            AGENTS_PACKAGE_ROOT / "src" / "pages" / "HomeAgentConversation.tsx"
        ).read_text(encoding="utf-8")

        self.assertEqual("./src/home.ts", package["exports"]["./home"]["import"])
        self.assertIn("AgentsHomePage", home_source)
        self.assertIn("configureAgentsHomeRuntime", home_source)
        self.assertIn("export function AgentsHomePage", page_source)
        self.assertIn("agentService.listAgentsPage", page_source)
        self.assertIn("agentService.createAgent", page_source)
        self.assertIn("agentService.updateAgent", page_source)
        self.assertIn("agentService.deleteAgent", page_source)
        self.assertIn("agentChatService.sendMessage", conversation_source)
        self.assertNotIn("@sdkwork/clawrouter", page_source)
        self.assertNotIn("@sdkwork/clawrouter", conversation_source)
        self.assertNotIn("fetch(", page_source)
        self.assertNotIn("fetch(", conversation_source)

    def test_agents_home_runtime_accepts_only_composed_app_sdk_clients(self) -> None:
        runtime_source = (
            AGENTS_PACKAGE_ROOT / "src" / "services" / "AgentsHomeRuntime.ts"
        ).read_text(encoding="utf-8")
        agents_client_source = (
            AGENTS_CORE_ROOT / "src" / "sdk" / "agentsAppSdkClient.ts"
        ).read_text(encoding="utf-8")
        drive_client_source = (
            AGENTS_CORE_ROOT / "src" / "sdk" / "driveAppSdkClient.ts"
        ).read_text(encoding="utf-8")
        core_package = json.loads(
            (AGENTS_CORE_ROOT / "package.json").read_text(encoding="utf-8")
        )

        self.assertIn("configureAgentsAppSdkClientProvider", runtime_source)
        self.assertIn("configureDriveAppSdkClientProvider", runtime_source)
        self.assertIn("getAgentsAppSdkClient", runtime_source)
        self.assertIn("getDriveAppSdkClient", runtime_source)
        self.assertIn("agentsAppSdkClientProvider", agents_client_source)
        self.assertIn("driveAppSdkClientProvider", drive_client_source)
        self.assertIn("./sdk/driveAppSdkClient", core_package["exports"])
        self.assertNotIn("fetch(", runtime_source)
        self.assertNotIn("axios", runtime_source)

    def test_agents_workbench_owns_chat_and_project_port_composition(self) -> None:
        runtime_source = (
            AGENTS_WORKBENCH_ROOT / "runtime.ts"
        ).read_text(encoding="utf-8")
        bootstrap_source = (
            AGENTS_APP_ROOT / "src" / "bootstrap" / "index.ts"
        ).read_text(encoding="utf-8")

        self.assertIn("configureAgentsHomeRuntime(runtime)", runtime_source)
        self.assertIn("configureChatAgentPort", runtime_source)
        self.assertIn("configureProjectPort", runtime_source)
        self.assertIn("agentChatService", runtime_source)
        self.assertIn("agentProjectService", runtime_source)
        self.assertIn("agentsDriveUploadService", runtime_source)
        self.assertIn("configureMemoryAppSdkClientProvider", runtime_source)
        self.assertIn("configurePromptsAppSdkClientProvider", runtime_source)
        self.assertIn("configureAgentsWorkbenchPorts()", bootstrap_source)
        self.assertNotIn("configureChatAgentPort({", bootstrap_source)
        self.assertNotIn("fetch(", runtime_source)
        self.assertNotIn("axios", runtime_source)

    def test_workspace_and_tailwind_register_the_agents_feature_packages(self) -> None:
        workspace_source = (ROOT / "pnpm-workspace.yaml").read_text(encoding="utf-8")
        css_source = (
            ROOT / "apps" / "sdkwork-clawrouter-pc" / "src" / "index.css"
        ).read_text(encoding="utf-8")
        sources_registry = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "src"
            / "portal-external-tailwind-sources.ts"
        ).read_text(encoding="utf-8")

        self.assertIn(
            "../sdkwork-agents/apps/sdkwork-agents-pc",
            workspace_source,
        )
        self.assertIn(
            "../sdkwork-prompts/sdks/sdkwork-prompts-app-sdk/generated/server-openapi",
            workspace_source,
        )
        for package_name in [
            "sdkwork-agents-pc-agents",
            "sdkwork-agents-pc-assets",
            "sdkwork-agents-pc-canvas",
            "sdkwork-agents-pc-chat",
            "sdkwork-agents-pc-commons",
            "sdkwork-agents-pc-core",
            "sdkwork-agents-pc-creative",
            "sdkwork-agents-pc-inspiration",
            "sdkwork-agents-pc-presentation",
        ]:
            self.assertIn(
                f"../sdkwork-agents/apps/sdkwork-agents-pc/packages/{package_name}",
                workspace_source,
            )
        tailwind_source = "../../../../sdkwork-agents/apps/sdkwork-agents-pc/packages"
        tailwind_app_source = "../../../../sdkwork-agents/apps/sdkwork-agents-pc/src"
        self.assertIn(tailwind_source, css_source)
        self.assertIn(tailwind_source, sources_registry)
        self.assertIn(tailwind_app_source, css_source)
        self.assertIn(tailwind_app_source, sources_registry)

    def test_playground_does_not_inject_the_retired_theme_surface_into_agents(self) -> None:
        source = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-playground"
            / "src"
            / "pages"
            / "Playground.tsx"
        ).read_text(encoding="utf-8")

        self.assertIn("sdkwork-playground-host", source)
        self.assertNotIn("theme-aware-dark-surface", source)

    def test_prompts_app_facade_consumes_the_transport_package_root(self) -> None:
        prompts_package_root = (
            ROOT.parent
            / "sdkwork-prompts"
            / "sdks"
            / "sdkwork-prompts-app-sdk"
            / "sdkwork-prompts-app-sdk-typescript"
        )
        package = json.loads((prompts_package_root / "package.json").read_text(encoding="utf-8"))
        source = (prompts_package_root / "src" / "index.ts").read_text(encoding="utf-8")

        self.assertEqual(
            "workspace:*",
            package["dependencies"]["sdkwork-prompts-app-sdk-generated-typescript"],
        )
        self.assertIn("from 'sdkwork-prompts-app-sdk-generated-typescript'", source)
        self.assertNotIn("../../generated/server-openapi", source)

    def test_component_contracts_declare_the_workbench_port(self) -> None:
        playground_spec = json.loads(
            (PLAYGROUND_ROOT / "specs" / "component.spec.json").read_text(encoding="utf-8")
        )
        agents_app_spec = json.loads(
            (AGENTS_APP_ROOT / "specs" / "component.spec.json").read_text(encoding="utf-8")
        )

        self.assertIn("agents.workbench", playground_spec["contracts"]["requiredPorts"])
        self.assertIn("agents.workbench", agents_app_spec["contracts"]["providedPorts"])
        self.assertIn(
            "src/workbench/index.ts",
            agents_app_spec["contracts"]["publicExports"],
        )


if __name__ == "__main__":
    unittest.main()
