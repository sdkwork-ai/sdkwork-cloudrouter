from __future__ import annotations

"""Insert the data-center operations into the authored frontend field contract.

The snapshot `docs/schema-registry/frontend-field-contracts.yaml` is authored
data: the contract guardian reads it as authority for API path, operation id,
kind, query parameters, and response shape. This module owns the five
`/backend/v3/api/datacenter/*` read operations and appends them exactly once,
idempotently, straight after the section marker so the file keeps a stable
diff for review.

Run through `python -B -m tools.datacenter_contract_operations --apply`; without
`--apply` it reports whether the snapshot already carries the operations.
"""

import argparse
import sys
from pathlib import Path
from typing import Any

import yaml

SOURCE = "apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudrouter-pc-admin-data/src/dataCenterService.ts"
SNAPSHOT = Path("docs") / "schema-registry" / "frontend-field-contracts.yaml"

PAGE_INFO_REF = "#/components/schemas/PageInfo"

INT64_DECIMAL_STRING = {
    "format": "int64",
    "pattern": "^[0-9]+$",
    "type": "string",
    "x-sdkwork-int64-string": True,
    "x-sdkwork-rust-type": "i64",
}

LIST_QUERY_PARAMETERS = [
    {
        "name": "page",
        "description": "1-based page number.",
        "schema": {"format": "int32", "minimum": 1, "type": "integer"},
    },
    {
        "name": "page_size",
        "description": "Page size between 1 and 200.",
        "schema": {"format": "int32", "maximum": 200, "minimum": 1, "type": "integer"},
    },
    {
        "name": "q",
        "description": "Free-text filter over the rendered columns.",
        "schema": {"maxLength": 256, "type": "string"},
    },
]


def _page(name: str, item_name: str, properties: dict[str, Any], required: list[str]) -> dict[str, Any]:
    return {
        "name": name,
        "schema": {
            "additionalProperties": False,
            "name": name,
            "properties": {
                "items": {
                    "items": {
                        "additionalProperties": False,
                        "name": item_name,
                        "properties": properties,
                        "required": required,
                        "type": "object",
                    },
                    "type": "array",
                },
                "pageInfo": {"$ref": PAGE_INFO_REF},
            },
            "required": ["items", "pageInfo"],
            "type": "object",
        },
    }


def _read_operation(
    *,
    route: str,
    operation: str,
    operation_id: str,
    api_path: str,
    description: str,
    read_sources: list[str],
    response_schema: dict[str, Any],
    query_parameters: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "route": route,
        "source": SOURCE,
        "operation": operation,
        "operation_id": operation_id,
        "kind": "read",
        "api_surface": "backend",
        "api_method": "GET",
        "api_path": api_path,
        "description": description,
        "sdk_domain": "system",
        "read_sources": read_sources,
        "response_schema": response_schema,
        "query_parameters_declared": True,
        "query_parameters": query_parameters,
    }


def datacenter_operations() -> list[dict[str, Any]]:
    """The five authored data-center read operations, in navigation order."""

    return [
        _read_operation(
            route="/admin/data/overview",
            operation="fetchOverview",
            operation_id="overview.retrieve",
            api_path="/backend/v3/api/datacenter/overview",
            description=(
                "Data-center overview counters for the caller workspace: configured sources, landed "
                "tables, data actions today, and export jobs still pending."
            ),
            read_sources=["dc_data_source", "dc_table", "dc_export_job", "dc_audit_log"],
            response_schema={
                "name": "DataCenterOverview",
                "schema": {
                    "additionalProperties": False,
                    "name": "DataCenterOverview",
                    "properties": {
                        "sources": INT64_DECIMAL_STRING,
                        "tables": INT64_DECIMAL_STRING,
                        "todayInstances": INT64_DECIMAL_STRING,
                        "pendingExports": INT64_DECIMAL_STRING,
                        "successRate": {"pattern": "^[0-9]+(?:\\.[0-9]+)?$", "type": "string"},
                    },
                    "required": [
                        "sources",
                        "tables",
                        "todayInstances",
                        "pendingExports",
                        "successRate",
                    ],
                    "type": "object",
                },
            },
            query_parameters=[],
        ),
        _read_operation(
            route="/admin/data/sources",
            operation="listSources",
            operation_id="dataSources.list",
            api_path="/backend/v3/api/datacenter/data_sources",
            description=(
                "List configured data sources with their last connectivity result. Credentials are "
                "write-only and never returned."
            ),
            read_sources=["dc_data_source", "dc_data_source_test_log"],
            response_schema=_page(
                "DataCenterSourcePage",
                "DataCenterSource",
                {
                    "id": {"maxLength": 32, "type": "string"},
                    "name": {"maxLength": 128, "type": "string"},
                    "kind": {
                        "enum": ["postgresql", "mysql", "platform", "file"],
                        "type": "string",
                    },
                    "health": {
                        "enum": ["healthy", "warning", "error", "unknown"],
                        "type": "string",
                    },
                    "tableCount": {"format": "int64", "minimum": 0, "type": "integer"},
                    "lastTestedAt": {"anyOf": [{"type": "string"}], "type": ["string", "null"]},
                },
                ["id", "name", "kind", "health", "tableCount", "lastTestedAt"],
            ),
            query_parameters=LIST_QUERY_PARAMETERS,
        ),
        _read_operation(
            route="/admin/data/tables",
            operation="listTables",
            operation_id="dataCenterTables.list",
            api_path="/backend/v3/api/datacenter/tables",
            description=(
                "List the governed table catalog. Landed tables carry exact row counts as decimal "
                "strings; external tables and views stay read-only."
            ),
            read_sources=["dc_table"],
            response_schema=_page(
                "DataCenterTablePage",
                "DataCenterTable",
                {
                    "id": {"maxLength": 32, "type": "string"},
                    "name": {"maxLength": 128, "type": "string"},
                    "kind": {"enum": ["landed", "external", "view"], "type": "string"},
                    "rowCount": INT64_DECIMAL_STRING,
                    "columnCount": {"format": "int32", "minimum": 0, "type": "integer"},
                    "owner": {"maxLength": 128, "type": "string"},
                    "updatedAt": {"maxLength": 64, "type": "string"},
                },
                ["id", "name", "kind", "rowCount", "columnCount", "owner", "updatedAt"],
            ),
            query_parameters=LIST_QUERY_PARAMETERS,
        ),
        _read_operation(
            route="/admin/data/exports",
            operation="listExports",
            operation_id="dataCenterExports.list",
            api_path="/backend/v3/api/datacenter/exports",
            description=(
                "List governed export jobs with their approval/generation status and signed-link "
                "expiry."
            ),
            read_sources=["dc_export_job"],
            response_schema=_page(
                "DataCenterExportPage",
                "DataCenterExport",
                {
                    "id": {"maxLength": 32, "type": "string"},
                    "datasetName": {"maxLength": 128, "type": "string"},
                    "status": {
                        "enum": ["pending_approval", "running", "succeeded", "failed", "expired"],
                        "type": "string",
                    },
                    "rowCount": INT64_DECIMAL_STRING,
                    "requestedBy": {"maxLength": 128, "type": "string"},
                    "expiresAt": {"anyOf": [{"type": "string"}], "type": ["string", "null"]},
                },
                ["id", "datasetName", "status", "rowCount", "requestedBy", "expiresAt"],
            ),
            query_parameters=LIST_QUERY_PARAMETERS,
        ),
        _read_operation(
            route="/admin/data/audits",
            operation="listAudits",
            operation_id="dataCenterAudits.list",
            api_path="/backend/v3/api/datacenter/audits",
            description=(
                "List the data-access audit trail: who connected, queried, downloaded, changed, "
                "published, approved, or rolled back what, and the row count it touched."
            ),
            read_sources=["dc_audit_log"],
            response_schema=_page(
                "DataCenterAuditPage",
                "DataCenterAudit",
                {
                    "id": {"maxLength": 32, "type": "string"},
                    "actor": {"maxLength": 128, "type": "string"},
                    "action": {
                        "enum": [
                            "connect",
                            "query",
                            "download",
                            "ddl",
                            "dml",
                            "publish",
                            "approve",
                            "rollback",
                        ],
                        "type": "string",
                    },
                    "object": {"maxLength": 298, "type": "string"},
                    "rowCount": INT64_DECIMAL_STRING,
                    "result": {"enum": ["success", "failure"], "type": "string"},
                    "at": {"maxLength": 64, "type": "string"},
                },
                ["id", "actor", "action", "object", "rowCount", "result", "at"],
            ),
            query_parameters=LIST_QUERY_PARAMETERS,
        ),
    ]


class _NoAliasDumper(yaml.SafeDumper):
    """Emit shared schema objects in full.

    The authors reuse the same `int64` schema dict for several properties; the
    default dumper would collapse them into `&id001`/`*id001` anchors, which the
    field-contract loader and the OpenAPI generator both read as opaque strings
    instead of schema objects.
    """

    def ignore_aliases(self, data):
        return True


def _operation_blocks() -> list[str]:
    """Render each operation as a YAML sequence item indented under
    `frontend_operations:` (whose items live at two-space indentation)."""
    blocks: list[str] = []
    for operation in datacenter_operations():
        dumped = yaml.dump(
            [operation],
            Dumper=_NoAliasDumper,
            allow_unicode=True,
            default_flow_style=False,
            sort_keys=False,
            width=120,
        )
        indented = "".join(
            f"  {line}" if line.strip() else line for line in dumped.splitlines(keepends=True)
        )
        blocks.append(indented)
    return blocks


def _insert(snapshot_text: str) -> tuple[str, int]:
    lines = snapshot_text.splitlines(keepends=True)
    marker = "frontend_operations:\n"
    if marker not in lines:
        raise SystemExit("frontend-field-contracts.yaml has no top-level frontend_operations section")
    index = lines.index(marker) + 1
    blocks = _operation_blocks()
    rendered = ["\n" + block for block in blocks]
    return "".join(lines[:index] + rendered + lines[index:]), len(blocks)


def main() -> int:
    parser = argparse.ArgumentParser(description="Insert data-center frontend field contract operations.")
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    snapshot_path = args.root.resolve() / SNAPSHOT
    text = snapshot_path.read_text(encoding="utf-8")
    present = [
        operation["operation_id"]
        for operation in datacenter_operations()
        if f"operation_id: {operation['operation_id']}" in text
    ]
    if present:
        print(f"data-center operations already present: {', '.join(present)}")
        return 0
    updated, count = _insert(text)
    yaml.safe_load(updated)
    if not args.apply:
        print(f"frontend contract is missing {count} data-center operations (run with --apply)")
        return 1
    snapshot_path.write_text(updated, encoding="utf-8")
    print(f"inserted {count} data-center operations into {snapshot_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
