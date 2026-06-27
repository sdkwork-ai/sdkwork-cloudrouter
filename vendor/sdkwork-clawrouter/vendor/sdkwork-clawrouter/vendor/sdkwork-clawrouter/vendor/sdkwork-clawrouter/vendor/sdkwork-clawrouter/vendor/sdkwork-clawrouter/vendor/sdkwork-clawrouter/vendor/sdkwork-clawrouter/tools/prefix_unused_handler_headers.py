#!/usr/bin/env python3
"""Prefix unused handler `headers` parameters with `_` using rustc unused-variable hints."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CRATE = "sdkwork-clawrouter-router-service"
REF_HEADER_PARAM_RE = re.compile(r"\bheaders\s*:\s*&HeaderMap\b")
PLAIN_HEADER_PARAM_RE = re.compile(r"\bheaders\s*:\s*HeaderMap\b")


def collect_unused_header_lines() -> dict[Path, set[int]]:
    proc = subprocess.run(
        [
            "cargo",
            "check",
            "-p",
            CRATE,
            "--message-format=json",
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    by_file: dict[Path, set[int]] = defaultdict(set)
    for line in proc.stdout.splitlines():
        line = line.strip()
        if not line.startswith("{") or '"unused variable: `headers`"' not in line:
            continue
        payload = json.loads(line)
        message = payload.get("message", {})
        for span in message.get("spans", []):
            file_name = span.get("file_name")
            line_start = span.get("line_start")
            if not file_name or not line_start:
                continue
            path = Path(file_name)
            if not path.is_absolute():
                path = ROOT / path
            by_file[path].add(line_start)
    return by_file


def apply_fixes(by_file: dict[Path, set[int]]) -> int:
    changed = 0
    for path, lines in sorted(by_file.items()):
        if not path.exists():
            continue
        content = path.read_text(encoding="utf-8")
        file_lines = content.splitlines(keepends=True)
        for line_no in sorted(lines):
            idx = line_no - 1
            if idx < 0 or idx >= len(file_lines):
                continue
            old = file_lines[idx]
            new = REF_HEADER_PARAM_RE.sub("_headers: &HeaderMap", old, count=1)
            if new == old:
                new = PLAIN_HEADER_PARAM_RE.sub("_headers: HeaderMap", old, count=1)
            if new != old:
                file_lines[idx] = new
                changed += 1
        path.write_text("".join(file_lines), encoding="utf-8")
    return changed


def main() -> int:
    by_file = collect_unused_header_lines()
    if not by_file:
        print("No unused `headers` parameters reported by rustc.")
        return 0
    total_lines = sum(len(v) for v in by_file.values())
    print(f"Fixing {total_lines} unused `headers` parameters across {len(by_file)} files...")
    changed = apply_fixes(by_file)
    print(f"Updated {changed} parameter declarations.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
