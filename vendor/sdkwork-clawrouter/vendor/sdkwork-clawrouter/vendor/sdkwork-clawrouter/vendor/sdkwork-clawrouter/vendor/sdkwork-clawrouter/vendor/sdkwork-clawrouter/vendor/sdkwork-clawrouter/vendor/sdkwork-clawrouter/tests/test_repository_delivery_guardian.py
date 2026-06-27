import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from tools.repository_delivery_guardian import (
    LFS_MANAGED_SKILL_SEED_FILES,
    LFS_POINTER_PREFIX,
    RepositoryDeliveryGuardian,
    parse_cat_file_blob_sizes,
    parse_ls_files_stage_entries,
    non_lfs_migrate_info_lines,
    parse_ls_tree_sizes,
)


class RepositoryDeliveryGuardianTest(unittest.TestCase):
    def test_passes_current_repository_delivery_standards(self) -> None:
        self.assertEqual([], RepositoryDeliveryGuardian().run())

    def test_requires_lfs_attributes_and_hydrated_seed_files(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / ".gitattributes").write_text("", encoding="utf-8")
            for index, relative_path in enumerate(LFS_MANAGED_SKILL_SEED_FILES):
                path = root / relative_path
                path.parent.mkdir(parents=True, exist_ok=True)
                content = "[]\n"
                if index == 0:
                    content = f"{LFS_POINTER_PREFIX}\noid sha256:test\nsize 123\n"
                path.write_text(content, encoding="utf-8")

            with patch("tools.repository_delivery_guardian.run_git") as run_git:
                run_git.return_value.returncode = 0
                run_git.return_value.stdout = ""
                run_git.return_value.stderr = ""
                messages = RepositoryDeliveryGuardian(root).run(include_history=False)

        self.assertTrue(any("must be tracked by Git LFS" in message for message in messages))
        self.assertTrue(any("unresolved Git LFS pointer" in message for message in messages))

    def test_reports_large_head_blobs(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_valid_lfs_fixture(root)
            with patch("tools.repository_delivery_guardian.run_git") as run_git:
                run_git.side_effect = [
                    git_result("100644 blob abc123 52428801\tdata/skills/raw-too-large.json\n"),
                    git_result(""),
                    git_result(""),
                ]
                messages = RepositoryDeliveryGuardian(root).run(include_history=False)

        self.assertIn("data/skills/raw-too-large.json is 52428801 bytes", "\n".join(messages))

    def test_reports_large_index_blobs_before_commit(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_valid_lfs_fixture(root)
            with patch("tools.repository_delivery_guardian.run_git") as run_git:
                run_git.side_effect = [
                    git_result(""),
                    git_result("100644 abc123 0\tdata/skills/raw-too-large.json\n"),
                    git_result("abc123 blob 52428801\n"),
                ]
                messages = RepositoryDeliveryGuardian(root).run(include_history=False)

        self.assertIn("data/skills/raw-too-large.json is 52428801 bytes in the index", "\n".join(messages))

    def test_history_large_blob_check_does_not_fetch_remote_refs(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_valid_lfs_fixture(root)
            with patch("tools.repository_delivery_guardian.run_git") as run_git:
                run_git.side_effect = [
                    git_result(""),
                    git_result(""),
                    git_result(""),
                    git_result(""),
                ]
                messages = RepositoryDeliveryGuardian(root).run()

        self.assertEqual([], messages)
        history_call = next(
            call for call in run_git.call_args_list if call.args[:3] == (root, "lfs", "migrate")
        )
        self.assertIn("--skip-fetch", history_call.args)

    def test_parse_ls_tree_sizes_ignores_trees_and_missing_sizes(self) -> None:
        raw = "\n".join(
            [
                "100644 blob abc123 42\tREADME.md",
                "040000 tree def456 -\tdata",
                "100644 blob fedcba 100\tdata/skills/artifacts.json",
            ]
        )

        self.assertEqual(
            [(42, "README.md"), (100, "data/skills/artifacts.json")],
            parse_ls_tree_sizes(raw),
        )

    def test_parse_ls_files_stage_entries_preserves_paths_with_spaces(self) -> None:
        raw = "\n".join(
            [
                "100644 abc123 0\tREADME.md",
                "100644 fedcba 0\tdata/skills/file with spaces.json",
            ]
        )

        self.assertEqual(
            [("abc123", "README.md"), ("fedcba", "data/skills/file with spaces.json")],
            parse_ls_files_stage_entries(raw),
        )

    def test_parse_cat_file_blob_sizes_keeps_only_blob_sizes(self) -> None:
        raw = "\n".join(
            [
                "abc123 blob 42",
                "def456 tree 100",
                "fedcba blob not-a-size",
            ]
        )

        self.assertEqual({"abc123": 42}, parse_cat_file_blob_sizes(raw))

    def test_migrate_info_parser_ignores_lfs_object_summary(self) -> None:
        raw = "\n".join(
            [
                "Fetching remote refs: ..., done.",
                "*.json     \t225 MB\t3/197293 files\t 0%",
                "",
                "LFS Objects\t434 MB\t4/11 files\t36%",
                "Sorting commits: ..., done.",
            ]
        )

        self.assertEqual(
            ["*.json     \t225 MB\t3/197293 files\t 0%"],
            non_lfs_migrate_info_lines(raw),
        )


def write_valid_lfs_fixture(root: Path) -> None:
    (root / ".gitattributes").write_text(
        "\n".join(f"{path} filter=lfs diff=lfs merge=lfs -text" for path in LFS_MANAGED_SKILL_SEED_FILES),
        encoding="utf-8",
    )
    for relative_path in LFS_MANAGED_SKILL_SEED_FILES:
        path = root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("[]\n", encoding="utf-8")


def git_result(stdout: str = "", stderr: str = "", returncode: int = 0):
    return type(
        "GitResult",
        (),
        {
            "returncode": returncode,
            "stdout": stdout,
            "stderr": stderr,
        },
    )()


if __name__ == "__main__":
    unittest.main()
