import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


RETIRED_DEPENDENCY_ROOT = "/".join([".sdkwork", "dependencies"])
RETIRED_DEPS_LOCAL_LINK = ":".join(["deps", "local", "link"])
RETIRED_DEPS_LOCAL_CHECK = ":".join(["deps", "local", "check"])
RETIRED_LOCAL_SCRIPT = "-".join(["prepare-local", "dependencies.mjs"])
PORTAL_DEPENDENCY_PREFIX = "../../../"
OLD_APPLICATION_ROOT = re.compile(r"(?<!/)apps/sdkwork-clawrouter(?:[\\/]|$)")
MACHINE_ABSOLUTE_PATH = re.compile(
    "|".join(
        [
            re.escape("D:" + "\\" + "release"),
            re.escape("E:" + "\\" + "sdkwork-space"),
            re.escape("C:" + "\\" + "Users" + "\\" + "admin"),
            r"/(?:home|workspace|mnt)/sdkwork",
        ]
    ),
)

PORTAL_RELEASE_DEPENDENCIES = {
    "sdkwork-appbase",
    "sdkwork-core",
    "sdkwork-ui",
    "sdkwork-drive",
    "sdkwork-commerce",
    "sdkwork-generations",
    "sdkwork-image",
}


class DependencyManagementStandardTest(unittest.TestCase):
    def test_app_manifests_use_repository_relative_roots(self) -> None:
        root_manifest = json.loads((ROOT / "sdkwork.app.config.json").read_text(encoding="utf-8"))
        portal_manifest = json.loads(
            (ROOT / "apps" / "sdkwork-clawrouter-pc" / "sdkwork.app.config.json").read_text(encoding="utf-8")
        )

        self.assertEqual(".", root_manifest["publish"]["config"]["workspaceRoot"])
        self.assertEqual(".", root_manifest["artifacts"]["installConfig"]["metadata"]["workspaceRoot"])
        self.assertEqual(".", root_manifest["devApp"]["sourceRoot"])

        self.assertEqual(".", portal_manifest["publish"]["config"]["workspaceRoot"])
        self.assertEqual(".", portal_manifest["artifacts"]["installConfig"]["metadata"]["workspaceRoot"])
        self.assertEqual(".", portal_manifest["devApp"]["sourceRoot"])

    def test_release_dependencies_are_declared_without_source_checkout_paths(self) -> None:
        workflow = json.loads((ROOT / "sdkwork.workflow.json").read_text(encoding="utf-8"))

        dependency_ids = [dependency["id"] for dependency in workflow["dependencies"]]
        self.assertEqual(len(dependency_ids), len(set(dependency_ids)))

        for dependency in workflow["dependencies"]:
            with self.subTest(dependency=dependency["id"]):
                self.assertRegex(dependency["repository"], r"^Sdkwork-Cloud/[A-Za-z0-9_.-]+$")
                self.assertRegex(dependency["ref"], r"^[0-9a-f]{40}$")
                self.assertRegex(dependency["refInput"], r"^SDKWORK_[A-Z0-9_]+_REF$")
                self.assertEqual("SDKWORK_RELEASE_TOKEN", dependency["tokenSecret"])
                self.assertNotIn(
                    "path",
                    dependency,
                    "release dependency checkout paths are workflow implementation details; source dependency paths belong to native workspace files",
                )

    def test_external_portal_workspace_dependencies_are_declared_for_release(self) -> None:
        workspace = (
            ROOT / "apps" / "sdkwork-clawrouter-pc" / "pnpm-workspace.yaml"
        ).read_text(encoding="utf-8")
        workflow = json.loads((ROOT / "sdkwork.workflow.json").read_text(encoding="utf-8"))
        workflow_dependency_ids = {dependency["id"] for dependency in workflow["dependencies"]}

        external_dependency_ids = set()
        for line in workspace.splitlines():
            stripped = line.strip()
            if not stripped.startswith("- "):
                continue
            workspace_path = stripped[2:].strip().strip("'\"")
            if not workspace_path.startswith(f"{PORTAL_DEPENDENCY_PREFIX}sdkwork-"):
                continue
            dependency_id = workspace_path.removeprefix(PORTAL_DEPENDENCY_PREFIX).split("/", 1)[0]
            external_dependency_ids.add(dependency_id)

        self.assertGreater(len(external_dependency_ids), 0)
        self.assertLessEqual(external_dependency_ids, workflow_dependency_ids)

    def test_portal_workspace_uses_native_sibling_dependency_paths(self) -> None:
        workspace = (
            ROOT / "apps" / "sdkwork-clawrouter-pc" / "pnpm-workspace.yaml"
        ).read_text(encoding="utf-8")
        package_json = json.loads(
            (ROOT / "apps" / "sdkwork-clawrouter-pc" / "package.json").read_text(encoding="utf-8")
        )
        workflow = json.loads((ROOT / "sdkwork.workflow.json").read_text(encoding="utf-8"))
        workflow_dependency_ids = {dependency["id"] for dependency in workflow["dependencies"]}

        self.assertLessEqual(PORTAL_RELEASE_DEPENDENCIES, workflow_dependency_ids)
        for workspace_path in package_json["workspaces"]:
            self.assertIsNone(MACHINE_ABSOLUTE_PATH.search(workspace_path))
            self.assertNotIn(RETIRED_DEPENDENCY_ROOT, workspace_path)

        for dependency_id in PORTAL_RELEASE_DEPENDENCIES:
            with self.subTest(dependency=dependency_id):
                self.assertIn(f"{PORTAL_DEPENDENCY_PREFIX}{dependency_id}/", workspace)

    def test_retired_local_dependency_materializer_is_absent(self) -> None:
        root_package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
        gitignore = (ROOT / ".gitignore").read_text(encoding="utf-8")

        self.assertNotIn(RETIRED_DEPS_LOCAL_LINK, root_package["scripts"])
        self.assertNotIn(RETIRED_DEPS_LOCAL_CHECK, root_package["scripts"])
        self.assertFalse((ROOT / "scripts" / RETIRED_LOCAL_SCRIPT).exists())
        self.assertFalse((ROOT / ".sdkwork" / "dependencies").exists())
        self.assertNotIn(RETIRED_DEPENDENCY_ROOT, gitignore)

    def test_source_controlled_dependency_docs_do_not_use_machine_paths_or_old_root(self) -> None:
        checked_paths = [
            ROOT / "README.md",
            ROOT / "sdkwork.app.config.json",
            ROOT / "sdkwork.workflow.json",
            ROOT / ".github" / "workflows" / "package.yml",
            ROOT / "apps" / "sdkwork-clawrouter-pc" / "package.json",
            ROOT / "apps" / "sdkwork-clawrouter-pc" / "pnpm-workspace.yaml",
            ROOT / "apps" / "sdkwork-clawrouter-pc" / "sdkwork.app.config.json",
            ROOT / "specs" / "README.md",
            ROOT / "specs" / "component.spec.json",
        ]

        for path in checked_paths:
            text = path.read_text(encoding="utf-8")
            relative_path = path.relative_to(ROOT).as_posix()
            with self.subTest(path=relative_path):
                self.assertIsNone(OLD_APPLICATION_ROOT.search(text))
                self.assertIsNone(MACHINE_ABSOLUTE_PATH.search(text))
