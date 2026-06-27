#!/usr/bin/env python3
"""Migrate claw-router schema registry from local storage/media tables to Drive references."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRAGMENTS = ROOT / "docs" / "schema-registry" / "tables"
ASSEMBLY = ROOT / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
CONTENT_FRAGMENT = FRAGMENTS / "024-content.yaml"

COLUMN_REPLACEMENTS = [
    ("avatar_media_resource_id: string(128)", "avatar_drive_uri: string(512)"),
    ("avatar_object_blob_id: int64", ""),
    ("icon_media_resource_id: string(128)", "icon_drive_uri: string(512)"),
    ("icon_object_blob_id: int64", ""),
    ("logo_media_resource_id: string(128)", "logo_drive_uri: string(512)"),
    ("logo_object_blob_id: int64", ""),
    ("media_resource_id: string(128)", "drive_uri: string(512)"),
    ("object_blob_id: int64", ""),
]

TABLE_BLOCK_START = re.compile(r"^- table: ([a-z0-9_]+)\s*$")
STORAGE_TABLES = {
    "object_provider",
    "object_bucket",
    "object_blob",
    "object_tag",
    "media_resource",
    "storage_default_bucket_policy",
    "storage_quota_policy",
    "storage_usage_counter",
    "storage_usage_ledger",
    "storage_usage_snapshot",
    "storage_reconciliation_run",
    "storage_gc_job",
    "upload_part",
}

ZOMBIE_TABLES = {
    "ai_agent_version",
    "ai_agent_memory",
    "ai_agent_tool_binding",
    "ai_agent_mcp_server",
    "commerce_settlement_export",
    "commerce_usage_pricing_plan",
    "ops_outbox_event",
    "ops_inbox_event",
    "ops_notification_preference",
}


def remove_table_blocks(text: str, table_names: set[str]) -> str:
    lines = text.splitlines(keepends=True)
    out: list[str] = []
    skip = False
    for line in lines:
        match = TABLE_BLOCK_START.match(line.rstrip("\n"))
        if match:
            skip = match.group(1) in table_names
        if not skip:
            out.append(line)
    return "".join(out)


def patch_columns(text: str) -> str:
    for old, new in COLUMN_REPLACEMENTS:
        if old and old in text:
            if new:
                text = text.replace(old, new)
            else:
                text = re.sub(rf"^    {re.escape(old)}\n", "", text, flags=re.MULTILINE)
    for removed in ("object_blob", "upload_session", "media_resource"):
        text = re.sub(rf"^  - {removed}\n", "", text, flags=re.MULTILINE)
    return text


def patch_assembly() -> None:
    text = ASSEMBLY.read_text(encoding="utf-8")
    text = text.replace("- tables/024-content.yaml\n", "")
    guardrail_old = (
        "Greenfield composition model uses ai_* runtime, ops_*, integration_*, storage_,\n"
        "      object_, upload_, media_, and c_* tables as claw-router generated ownership."
    )
    guardrail_new = (
        "Greenfield composition model uses ai_* runtime, ops_*, integration_*, and c_*\n"
        "      tables as claw-router generated ownership. Drive-owned storage, upload, object,\n"
        "      and MediaResource lifecycle are owned by sdkwork-drive and must not be generated\n"
        "      in claw-router schema.sql."
    )
    text = text.replace(guardrail_old, guardrail_new)
    if "module_id: sdkwork-drive" not in text:
        insert = (
            "- module_id: sdkwork-drive\n"
            "  locator: ../sdkwork-drive\n"
            "  registry_path: docs/schema-registry/sdkwork-drive.tables.yaml\n"
            "  order: 25\n"
            "  ownership: read_only\n"
        )
        text = text.replace(
            "- module_id: commerce-core\n",
            insert + "- module_id: commerce-core\n",
        )
    ASSEMBLY.write_text(text, encoding="utf-8")


def main() -> None:
    if CONTENT_FRAGMENT.exists():
        CONTENT_FRAGMENT.unlink()
        print(f"deleted {CONTENT_FRAGMENT.relative_to(ROOT)}")

    for path in sorted(FRAGMENTS.glob("*.yaml")):
        original = path.read_text(encoding="utf-8")
        updated = remove_table_blocks(original, ZOMBIE_TABLES)
        updated = patch_columns(updated)
        if updated != original:
            path.write_text(updated, encoding="utf-8")
            print(f"patched columns in {path.relative_to(ROOT)}")

    patch_assembly()
    print("updated assembly registry")


if __name__ == "__main__":
    main()
