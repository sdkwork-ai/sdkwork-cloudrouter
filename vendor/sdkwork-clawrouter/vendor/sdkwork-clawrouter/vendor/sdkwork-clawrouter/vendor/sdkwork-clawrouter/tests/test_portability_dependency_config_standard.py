import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PORTAL_ROOT = ROOT / "apps" / "sdkwork-clawrouter-pc"

RETIRED_DEPENDENCY_ROOT = "/".join([".sdkwork", "dependencies"])
APPBASE_DEPENDENCY_ID = "sdkwork-" + "appbase"
WORKFLOW_DEPENDENCIES = {
    "sdkwork-appbase",
    "sdkwork-core",
    "sdkwork-ui",
    "sdkwork-drive",
    "sdkwork-commerce",
    "sdkwork-generations",
    "sdkwork-image",
    "sdkwork-sdk-generator",
}

PORTAL_DEPENDENCIES = {
    "sdkwork-appbase",
    "sdkwork-core",
    "sdkwork-ui",
    "sdkwork-drive",
    "sdkwork-commerce",
    "sdkwork-generations",
    "sdkwork-image",
}

OLD_VITE_SIBLING_ROOT_IDENTIFIER = "local" + "SiblingRoot"

WORKFLOW_REF_INPUTS = {
    "sdkwork-appbase": "SDKWORK_APPBASE_REF",
    "sdkwork-core": "SDKWORK_CORE_REF",
    "sdkwork-ui": "SDKWORK_UI_REF",
    "sdkwork-drive": "SDKWORK_DRIVE_REF",
    "sdkwork-commerce": "SDKWORK_COMMERCE_REF",
    "sdkwork-generations": "SDKWORK_GENERATIONS_REF",
    "sdkwork-image": "SDKWORK_IMAGE_REF",
    "sdkwork-sdk-generator": "SDKWORK_SDK_GENERATOR_REF",
}

NATIVE_WORKSPACE_PACKAGES = {
    "sdkwork-appbase": [
        "../../../sdkwork-iam/sdks/sdkwork-iam-app-sdk/*-typescript/generated/server-openapi",
        "../../../sdkwork-iam/sdks/sdkwork-iam-backend-sdk/*-typescript/generated/server-openapi",
        "../../../sdkwork-appbase/packages/pc-react/foundation/sdkwork-appbase-pc-react",
        "../../../sdkwork-iam/packages/common/iam/*",
    ],
    "sdkwork-core": [
        "../../../sdkwork-core/sdkwork-core-pc-react",
    ],
    "sdkwork-ui": [
        "../../../sdkwork-ui/sdkwork-ui-pc-react",
    ],
    "sdkwork-drive": [
        "../../../sdkwork-drive/sdks/sdkwork-drive-app-sdk/sdkwork-drive-app-sdk-typescript",
    ],
    "sdkwork-commerce": [
        "../../../sdkwork-commerce/packages/common/commerce/*",
        "../../../sdkwork-commerce/apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-admin-product",
    ],
    "sdkwork-generations": [
        "../../../sdkwork-generations/apps/sdkwork-generations-pc/packages/sdkwork-generations-pc-workspace",
        "../../../sdkwork-generations/sdks/sdkwork-generations-app-sdk/sdkwork-generations-app-sdk-typescript/generated/server-openapi",
    ],
    "sdkwork-image": [
        "../../../sdkwork-image/packages/common/image/sdkwork-image-contracts",
        "../../../sdkwork-image/packages/pc-react/content/sdkwork-generation-pc-react",
    ],
}


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


class PortabilityDependencyConfigStandardTest(unittest.TestCase):
    def test_app_manifests_use_manifest_local_roots(self) -> None:
        root_manifest = read_json(ROOT / "sdkwork.app.config.json")
        portal_manifest = read_json(PORTAL_ROOT / "sdkwork.app.config.json")

        for manifest_path, manifest in [
            ("sdkwork.app.config.json", root_manifest),
            ("apps/sdkwork-clawrouter-pc/sdkwork.app.config.json", portal_manifest),
        ]:
            self.assertEqual(".", manifest["publish"]["config"]["workspaceRoot"], manifest_path)
            self.assertEqual(".", manifest["artifacts"]["installConfig"]["metadata"]["workspaceRoot"], manifest_path)
            self.assertEqual(".", manifest["devApp"]["sourceRoot"], manifest_path)

    def test_release_workflow_uses_git_dependencies_without_source_owned_checkout_paths(self) -> None:
        workflow = read_json(ROOT / "sdkwork.workflow.json")
        dependencies = {dependency["id"]: dependency for dependency in workflow["dependencies"]}

        self.assertTrue(WORKFLOW_DEPENDENCIES.issubset(dependencies))
        for dependency_id in WORKFLOW_DEPENDENCIES:
            dependency = dependencies[dependency_id]
            self.assertEqual(f"Sdkwork-Cloud/{dependency_id}", dependency["repository"])
            self.assertEqual(WORKFLOW_REF_INPUTS[dependency_id], dependency["refInput"])
            self.assertEqual("SDKWORK_RELEASE_TOKEN", dependency["tokenSecret"])
            self.assertNotIn(
                "path",
                dependency,
                "release dependency checkout paths are workflow implementation details; source dependency paths belong to native workspace files",
            )

        install_steps = workflow["lifecycle"]["install"]
        install_command = "\n".join(step["run"] for step in install_steps)
        self.assertIn("pnpm --dir apps/sdkwork-clawrouter-pc install", install_command)
        self.assertIn("--no-frozen-lockfile", install_command)
        self.assertNotIn("--frozen-lockfile", install_command.replace("--no-frozen-lockfile", ""))

    def test_package_workflow_exposes_ref_inputs_for_release_dependencies(self) -> None:
        workflow = read_text(ROOT / ".github" / "workflows" / "package.yml")

        for dependency_id, ref_input in WORKFLOW_REF_INPUTS.items():
            workflow_input = ref_input.lower()
            self.assertRegex(workflow, rf"\b{workflow_input}\b", dependency_id)
            self.assertIn(f'"{ref_input}":', workflow, dependency_id)

    def test_portal_workspace_uses_native_sibling_dependency_paths(self) -> None:
        workspace = read_text(PORTAL_ROOT / "pnpm-workspace.yaml")
        package_json = read_json(PORTAL_ROOT / "package.json")

        for dependency_id, release_patterns in NATIVE_WORKSPACE_PACKAGES.items():
            for release_pattern in release_patterns:
                self.assertIn(release_pattern, workspace, dependency_id)
                self.assertIn(release_pattern, package_json["workspaces"], dependency_id)
        self.assertNotIn(RETIRED_DEPENDENCY_ROOT, workspace)
        for workspace_path in package_json["workspaces"]:
            self.assertNotIn(RETIRED_DEPENDENCY_ROOT, workspace_path)

    def test_portal_typescript_and_vite_use_native_sibling_dependency_roots(self) -> None:
        vite_config = read_text(PORTAL_ROOT / "vite.config.ts")
        tsconfig = read_text(PORTAL_ROOT / "tsconfig.json")
        typecheck_config = read_text(PORTAL_ROOT / "tsconfig.typecheck.json")
        package_tsconfig = read_text(PORTAL_ROOT / "packages" / "tsconfig.json")

        self.assertIn("resolvePortalWorkspaceDependencyRoot", vite_config)
        self.assertNotIn(OLD_VITE_SIBLING_ROOT_IDENTIFIER, vite_config)
        self.assertNotIn(f"fs.existsSync({OLD_VITE_SIBLING_ROOT_IDENTIFIER})", vite_config)
        self.assertIn("'../../..'", vite_config)
        self.assertIn("../../../sdkwork-appbase", tsconfig)

        for dependency_id in PORTAL_DEPENDENCIES:
            self.assertIn(f"../../../{dependency_id}", tsconfig)
        self.assertIn("../../sdkwork-commerce", typecheck_config)
        for config_text in [tsconfig, typecheck_config, package_tsconfig]:
            self.assertNotIn(RETIRED_DEPENDENCY_ROOT, config_text)

    def test_active_docs_and_scripts_do_not_use_machine_specific_example_paths(self) -> None:
        checked_paths = [
            ROOT / "README.md",
            ROOT / "docs" / "33-sdkwork-models-install-flow.md",
            ROOT / "docs" / "installation" / "en-US" / "README.md",
            ROOT / "docs" / "installation" / "zh-CN" / "README.md",
            ROOT / "docs" / "installation" / "en-US" / "release-install.md",
            ROOT / "docs" / "installation" / "zh-CN" / "release-install.md",
            ROOT / "docs" / "installation" / "en-US" / "initialization.md",
            ROOT / "docs" / "installation" / "zh-CN" / "initialization.md",
            ROOT / "scripts" / "release-preflight.mjs",
            ROOT / "scripts" / "build-claw-router-install-package.mjs",
            ROOT / "scripts" / "configure-nginx.mjs",
        ]
        forbidden = re.compile(
            "|".join(
                [
                    re.escape("D:" + "\\" + "release"),
                    re.escape("E:" + "\\" + "sdkwork-space"),
                    re.escape("C:" + "\\" + "Users" + "\\" + "admin"),
                    re.escape("C:" + "\\" + "Program Files" + "\\" + "ClawRouter"),
                    re.escape("C:" + "\\" + "clawrouter") + r"\b",
                    re.escape("C:" + "\\" + "sdkwork" + "\\" + "router") + r"\b",
                    r"/home/sdkwork/\.local/share/clawrouter",
                    re.escape("C:/nginx/conf"),
                    re.escape("C:/Program Files/sdkwork/router/bin"),
                ]
            )
        )
        violations = []

        for path in checked_paths:
            content = read_text(path)
            for line_number, line in enumerate(content.splitlines(), start=1):
                if forbidden.search(line):
                    violations.append(f"{path.relative_to(ROOT).as_posix()}:{line_number}: {line.strip()}")

        self.assertEqual([], violations)

    def test_active_docs_use_extensionless_cross_platform_commands(self) -> None:
        checked_paths = [
            ROOT / "README.md",
            ROOT / "docs" / "33-sdkwork-models-install-flow.md",
            ROOT / "docs" / "installation" / "en-US" / "README.md",
            ROOT / "docs" / "installation" / "zh-CN" / "README.md",
            ROOT / "docs" / "installation" / "en-US" / "release-install.md",
            ROOT / "docs" / "installation" / "zh-CN" / "release-install.md",
            ROOT / "docs" / "installation" / "en-US" / "initialization.md",
            ROOT / "docs" / "installation" / "zh-CN" / "initialization.md",
        ]
        violations = []

        for path in checked_paths:
            content = read_text(path)
            for line_number, line in enumerate(content.splitlines(), start=1):
                if "pnpm.cmd" in line:
                    violations.append(f"{path.relative_to(ROOT).as_posix()}:{line_number}: {line.strip()}")

        self.assertEqual([], violations)

    def test_active_sources_use_native_appbase_dependency_paths(self) -> None:
        checked_roots = [
            ROOT / "README.md",
            ROOT / ".github",
            ROOT / ".sdkwork",
            ROOT / "apps",
            ROOT / "crates",
            ROOT / "packages",
            ROOT / "scripts",
            ROOT / "services",
            ROOT / "specs",
            ROOT / "tests",
            ROOT / "tools",
            ROOT / "package.json",
            ROOT / "sdkwork.workflow.json",
        ]
        ignored_directories = {
            ".git",
            ".pnpm",
            "dist",
            "generated",
            "node_modules",
            "sdks",
            "target",
        }
        checked_suffixes = {
            ".json",
            ".md",
            ".mjs",
            ".py",
            ".rs",
            ".toml",
            ".ts",
            ".tsx",
            ".yaml",
            ".yml",
        }
        forbidden_appbase_path = re.compile(rf"{re.escape(RETIRED_DEPENDENCY_ROOT)}/{re.escape(APPBASE_DEPENDENCY_ID)}")
        violations = []

        for path in self._iter_source_controlled_files(checked_roots, checked_suffixes, ignored_directories):
            relative_path = path.relative_to(ROOT).as_posix()
            text = path.read_text(encoding="utf-8", errors="ignore")
            for line_number, line in enumerate(text.splitlines(), start=1):
                if forbidden_appbase_path.search(line):
                    violations.append(f"{relative_path}:{line_number}: {line.strip()}")

        self.assertEqual([], violations)

    def test_active_sdk_generator_sources_use_native_dependency_root(self) -> None:
        sdk_generator_dependency_id = "sdkwork-" + "sdk-generator"
        old_sdk_generator_path = f"sdk/{sdk_generator_dependency_id}"
        checked_paths = [
            ROOT / "tools" / "clawrouter_strict_sdk_generate.mjs",
            ROOT / "tools" / "clawrouter_sdk_runtime_standardizer.py",
            ROOT / "tools" / "api_contract_manifest.py",
            ROOT / "tests" / "test_access_token_header_standard.py",
        ]
        forbidden_tokens = [
            f"../..', 'sdk', '{sdk_generator_dependency_id}",
            f'"{old_sdk_generator_path}"',
            f'ROOT.parents[1] / "sdk" / "{sdk_generator_dependency_id}"',
            f"{RETIRED_DEPENDENCY_ROOT}/{sdk_generator_dependency_id}",
        ]
        required_token = f"../{sdk_generator_dependency_id}"
        violations = []

        for path in checked_paths:
            text = read_text(path)
            relative_path = path.relative_to(ROOT).as_posix()
            for token in forbidden_tokens:
                if token in text:
                    violations.append(f"{relative_path}: contains old SDK generator path token {token}")

        generator_script = read_text(ROOT / "tools" / "clawrouter_strict_sdk_generate.mjs")
        standardizer = read_text(ROOT / "tools" / "clawrouter_sdk_runtime_standardizer.py")
        self.assertIn(f"../{sdk_generator_dependency_id}/tmp-js", generator_script)
        self.assertIn(required_token, standardizer)
        self.assertEqual([], violations)

    def _iter_source_controlled_files(
        self,
        roots: list[Path],
        suffixes: set[str],
        ignored_directories: set[str],
    ) -> list[Path]:
        files: list[Path] = []
        for root in roots:
            if root.is_file():
                files.append(root)
                continue
            if not root.exists():
                continue
            stack = [root]
            while stack:
                current = stack.pop()
                if current.is_dir():
                    if current.name in ignored_directories:
                        continue
                    stack.extend(current.iterdir())
                    continue
                if current.suffix in suffixes:
                    files.append(current)
        return sorted(files)


if __name__ == "__main__":
    unittest.main()
