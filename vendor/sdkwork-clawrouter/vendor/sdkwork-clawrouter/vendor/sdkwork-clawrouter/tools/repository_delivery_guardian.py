"""Repository delivery guardrails for commercial Claw Router releases."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MAX_NORMAL_BLOB_BYTES = 50 * 1024 * 1024
LFS_POINTER_PREFIX = "version https://git-lfs.github.com/spec/v1"
LFS_MANAGED_SKILL_SEED_FILES = [
    "data/skills/skills.json",
    "data/skills/artifacts.json",
    "data/skills/assets.json",
    "data/skills/clawhub/raw/checkpoint.json",
    "data/skills/clawhub/raw/index.json",
]


class RepositoryDeliveryGuardian:
    def __init__(self, root: Path = ROOT, max_normal_blob_bytes: int = MAX_NORMAL_BLOB_BYTES) -> None:
        self.root = root
        self.max_normal_blob_bytes = max_normal_blob_bytes

    def run(self, *, include_history: bool = True) -> list[str]:
        messages: list[str] = []
        self._check_lfs_attributes(messages)
        self._check_lfs_hydration(messages)
        self._check_head_large_blobs(messages)
        self._check_index_large_blobs(messages)
        if include_history:
            self._check_history_large_blobs(messages)
        return messages

    def _check_lfs_attributes(self, messages: list[str]) -> None:
        attributes_path = self.root / ".gitattributes"
        if not attributes_path.is_file():
            messages.append(".gitattributes is missing")
            return

        attributes = {
            line.strip()
            for line in attributes_path.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.strip().startswith("#")
        }
        for relative_path in LFS_MANAGED_SKILL_SEED_FILES:
            expected = f"{relative_path} filter=lfs diff=lfs merge=lfs -text"
            if expected not in attributes:
                messages.append(f"{relative_path} must be tracked by Git LFS in .gitattributes")

    def _check_lfs_hydration(self, messages: list[str]) -> None:
        for relative_path in LFS_MANAGED_SKILL_SEED_FILES:
            path = self.root / relative_path
            if not path.is_file():
                messages.append(f"{relative_path} is missing")
                continue
            prefix = read_file_prefix(path)
            if prefix.startswith(LFS_POINTER_PREFIX):
                messages.append(f"{relative_path} is an unresolved Git LFS pointer; run git lfs pull")

    def _check_head_large_blobs(self, messages: list[str]) -> None:
        result = run_git(self.root, "ls-tree", "-r", "-l", "HEAD")
        if result.returncode != 0:
            messages.append(f"unable to inspect HEAD tree: {result.stderr.strip() or result.stdout.strip()}")
            return
        for size, path in parse_ls_tree_sizes(result.stdout):
            if size > self.max_normal_blob_bytes:
                messages.append(
                    f"{path} is {size} bytes in HEAD and must be moved to Git LFS or external artifact storage"
                )

    def _check_index_large_blobs(self, messages: list[str]) -> None:
        result = run_git(self.root, "ls-files", "--stage")
        if result.returncode != 0:
            messages.append(f"unable to inspect Git index: {result.stderr.strip() or result.stdout.strip()}")
            return

        entries = parse_ls_files_stage_entries(result.stdout)
        if not entries:
            return

        object_ids = sorted({object_id for object_id, _path in entries})
        size_result = run_git(
            self.root,
            "cat-file",
            "--batch-check=%(objectname) %(objecttype) %(objectsize)",
            input_text="\n".join(object_ids) + "\n",
        )
        if size_result.returncode != 0:
            messages.append(
                "unable to inspect Git index object sizes: "
                f"{size_result.stderr.strip() or size_result.stdout.strip()}"
            )
            return

        object_sizes = parse_cat_file_blob_sizes(size_result.stdout)
        for object_id, path in entries:
            size = object_sizes.get(object_id)
            if size is not None and size > self.max_normal_blob_bytes:
                messages.append(
                    f"{path} is {size} bytes in the index and must be moved to Git LFS or external artifact storage"
                )

    def _check_history_large_blobs(self, messages: list[str]) -> None:
        result = run_git(
            self.root,
            "lfs",
            "migrate",
            "info",
            "--skip-fetch",
            "HEAD",
            f"--above={self.max_normal_blob_bytes}B",
        )
        if result.returncode != 0:
            messages.append(
                "unable to inspect current history for large non-LFS blobs: "
                f"{result.stderr.strip() or result.stdout.strip()}"
            )
            return
        non_lfs_lines = non_lfs_migrate_info_lines(result.stdout)
        for line in non_lfs_lines:
            messages.append(f"current history contains non-LFS large blob group: {line}")


def read_file_prefix(path: Path, byte_count: int = 128) -> str:
    with path.open("rb") as handle:
        return handle.read(byte_count).decode("utf-8", errors="replace")


def run_git(root: Path, *args: str, input_text: str | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=root,
        text=True,
        input=input_text,
        capture_output=True,
        check=False,
    )


def parse_ls_tree_sizes(raw: str) -> list[tuple[int, str]]:
    entries: list[tuple[int, str]] = []
    for line in raw.splitlines():
        parts = line.split(None, 4)
        if len(parts) != 5:
            continue
        size_text, path = parts[3], parts[4]
        if not size_text.isdigit():
            continue
        entries.append((int(size_text), path))
    return entries


def parse_ls_files_stage_entries(raw: str) -> list[tuple[str, str]]:
    entries: list[tuple[str, str]] = []
    for line in raw.splitlines():
        parts = line.split(None, 3)
        if len(parts) != 4:
            continue
        _mode, object_id, _stage, path = parts
        entries.append((object_id, path))
    return entries


def parse_cat_file_blob_sizes(raw: str) -> dict[str, int]:
    sizes: dict[str, int] = {}
    for line in raw.splitlines():
        parts = line.split()
        if len(parts) != 3:
            continue
        object_id, object_type, size_text = parts
        if object_type == "blob" and size_text.isdigit():
            sizes[object_id] = int(size_text)
    return sizes


def non_lfs_migrate_info_lines(raw: str) -> list[str]:
    lines: list[str] = []
    for line in raw.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith(("Sorting commits:", "Examining commits:", "Fetching remote refs:")):
            continue
        if stripped.startswith("LFS Objects"):
            continue
        lines.append(stripped)
    return lines


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate repository-level commercial delivery standards.")
    parser.add_argument(
        "--skip-history",
        action="store_true",
        help="Skip the Git history large-blob audit. Use only for narrow unit tests.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    messages = RepositoryDeliveryGuardian().run(include_history=not args.skip_history)
    if messages:
        for message in messages:
            print(message, file=sys.stderr)
        return 1
    print("Repository delivery guardian passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
