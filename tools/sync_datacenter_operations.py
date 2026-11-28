from __future__ import annotations

"""Splice the `datacenter` operation group into the backend OpenAPI documents.

`tools/cloudrouter_openapi_generator.py` renders the whole backend document, so
running it on a tree where unrelated provider operations have drifted rewrites
hundreds of unrelated operations. That makes a data-center change look like an
API-wide change and destroys reviewability.

This tool is the narrow alternative. It derives the `datacenter` path items and
their transitive `components/schemas` dependencies from the API contract
manifest (the authored frontend field contract, through
`tools.api_contract_manifest`'s renderer) and splices exactly those entries into
`generated/openapi/cloudrouter-backend-openapi.json` and the materialized
authority copy under `apis/backend-api/cloudrouter/`. Every other JSON value in
both documents is left byte-identical.

Run with `--apply`; without it the tool reports what would change.
"""

import argparse
import copy
import json
import sys
from pathlib import Path
from typing import Any

PREFIX = "/backend/v3/api/datacenter/"
TARGETS = (
    "generated/openapi/cloudrouter-backend-openapi.json",
    "apis/backend-api/cloudrouter/cloudrouter-backend-api.openapi.json",
)

PROBLEM_RESPONSES = {
    400: "Bad Request",
    401: "Unauthorized",
    500: "Server Error",
}


def _schema_refs(value: Any) -> set[str]:
    refs: set[str] = set()
    if isinstance(value, dict):
        ref = value.get("$ref")
        if isinstance(ref, str) and ref.startswith("#/components/schemas/"):
            refs.add(ref.rsplit("/", 1)[-1])
        for item in value.values():
            refs |= _schema_refs(item)
    elif isinstance(value, list):
        for item in value:
            refs |= _schema_refs(item)
    return refs


def _closed_schema_set(schemas: dict[str, Any], seeds: set[str]) -> set[str]:
    closed = set(seeds)
    frontier = list(seeds)
    while frontier:
        name = frontier.pop()
        for ref in _schema_refs(schemas.get(name, {})):
            if ref not in closed and ref in schemas:
                closed.add(ref)
                frontier.append(ref)
    return closed


def _problem_response(description: str) -> dict[str, Any]:
    return {
        "description": description,
        "content": {
            "application/problem+json": {"schema": {"$ref": "#/components/schemas/ProblemDetail"}}
        },
    }


def _envelope_schema(item_schema: dict[str, Any]) -> dict[str, Any]:
    """Wrap a page/item schema in the `SdkWorkApiResponse` envelope shape.

    `API_SPEC.md` §15: a 200 body is `{code, data, traceId}`. The generated SDK
    unwraps `data`, so the operation's success schema must declare that wrapper
    for the response-envelope check to accept the operation.
    """
    return {
        "type": "object",
        "additionalProperties": False,
        "required": ["code", "data", "traceId"],
        "properties": {
            "code": {"type": "integer", "format": "int32", "enum": [0]},
            "data": item_schema,
            "traceId": {"type": "string"},
        },
    }


def build_operations(manifest: dict[str, Any], document: dict[str, Any]) -> dict[str, Any]:
    """Build the OpenAPI path items for every `datacenter` manifest operation."""
    operations = [
        operation
        for operation in manifest.get("operations", [])
        if isinstance(operation, dict)
        and str(operation.get("api_path", "")).startswith(PREFIX)
        and operation.get("openapi_exposed") is not False
    ]
    if not operations:
        raise SystemExit("contract manifest declares no datacenter operations")

    existing_schemas = document["components"]["schemas"]
    paths: dict[str, Any] = {}
    pending_schemas: dict[str, Any] = {}

    for operation in operations:
        path = operation["api_path"]
        operation_id = operation["operation_id"]
        response_schema = operation.get("response_schema") or {}
        success: dict[str, Any] = {"description": "OK"}
        schema = response_schema.get("schema") if isinstance(response_schema, dict) else None
        if isinstance(schema, dict) and schema:
            name = str(response_schema.get("name") or "").strip()
            body_schema = copy.deepcopy(schema)
            if not name or "$ref" in schema:
                raise SystemExit(f"{path}: response schema must be a named inline object")
            if name in pending_schemas and pending_schemas[name] != body_schema:
                raise SystemExit(f"{path}: conflicting response schemas for {name}")
            envelope_name = f"SdkWorkApiResponse{name}"
            pending_schemas[name] = body_schema
            pending_schemas[envelope_name] = _envelope_schema(body_schema)
            success["content"] = {
                "application/json": {"schema": {"$ref": f"#/components/schemas/{envelope_name}"}}
            }

        responses = {"200": success}
        for status, description in PROBLEM_RESPONSES.items():
            responses[str(status)] = _problem_response(description)
        responses["default"] = _problem_response("Error response.")

        parameters = [
            copy.deepcopy(parameter)
            for parameter in operation.get("query_parameters", [])
            if isinstance(parameter, dict)
        ]

        paths[path] = {
            "get": {
                "tags": ["datacenter"],
                "operationId": operation_id,
                "summary": f"GET {path}",
                "description": str(operation.get("description") or operation_id),
                "parameters": parameters,
                "responses": responses,
                "security": [{"AccessToken": [], "AuthToken": []}],
                "x-contract-kind": "read",
                "x-route-scope": "admin",
                "x-sdk-domain": "datacenter",
                "x-read-sources": list(operation.get("read_sources") or []),
                "x-write-tables": [],
                "x-file-targets": [],
                "x-sdkwork-owner": "sdkwork-cloudrouter",
                "x-sdkwork-api-authority": "sdkwork-cloudrouter-backend-api",
                "x-sdkwork-api-surface": "backend-api",
                "x-sdkwork-auth-mode": "dual-token",
                "x-sdkwork-domain": "datacenter",
                "x-sdkwork-resource": operation_id.split(".")[1] if "." in operation_id else operation_id,
                "x-sdkwork-request-context": "WebRequestContext",
                "x-sdkwork-source-route-crate": "sdkwork-routes-cloudrouter-backend-api",
                "x-source-file": operation.get("source", ""),
                "x-route": operation.get("route", ""),
            }
        }

    seed_refs: set[str] = set()
    for path_item in paths.values():
        seed_refs |= _schema_refs(path_item)
    seed_refs -= set(existing_schemas) | set(pending_schemas)
    added_schemas = {
        name: copy.deepcopy(existing_schemas[name]) for name in sorted(seed_refs)
    }
    # Transitive dependencies of any schema the operations reference.
    for name in _closed_schema_set(existing_schemas, set(added_schemas)) - set(added_schemas):
        added_schemas[name] = copy.deepcopy(existing_schemas[name])
    pending_schemas.update(
        {name: schema for name, schema in added_schemas.items() if name not in pending_schemas}
    )

    return {"paths": paths, "schemas": pending_schemas}


def _insert_head(text: str, container_key: str, entries: dict[str, Any], indent: int) -> str:
    """Insert `entries` as the first keys of the object named by `container_key`.

    `indent` is the column of one entry key inside that object. Each entry's
    own body is re-rendered with an indentation *step* measured from the
    document (the committed file descends four spaces per level), so the
    inserted text matches the surrounding layout exactly.
    """
    if not entries:
        return text
    start = text.find(f'"{container_key}": {{')
    if start < 0:
        raise SystemExit(f"{container_key} object is missing from the target document")
    body_start = text.index("\n", start) + 1
    step = _indent_step(text, container_key)
    block_lines: list[str] = []
    for key, value in entries.items():
        rendered = _render_entry(key, value, indent, step)
        block_lines.append(rendered + ",")
    return text[:body_start] + "\n".join(block_lines) + "\n" + text[body_start:]


def _indent_step(text: str, container_key: str) -> int:
    """Per-level indentation of the committed document (defaults to 2)."""
    start = text.find(f'"{container_key}": {{')
    body_start = text.index("\n", start) + 1
    body_line = text[body_start: text.find("\n", body_start)]
    leading = len(body_line) - len(body_line.lstrip(" "))
    # The first entry key sits one level below the container key line.
    container_line_start = text.rfind("\n", 0, start) + 1
    container_leading = start - container_line_start
    step = leading - container_leading
    return step if step in (2, 4) else 2


def _render_entry(key: str, value: Any, indent: int, step: int) -> str:
    """Render one `"key": value` member of a JSON object at `indent`."""
    payload = json.dumps(value, ensure_ascii=False, indent=step).splitlines()
    head = f"{' ' * indent}{json.dumps(key, ensure_ascii=False)}: {payload[0]}"
    lines = [head]
    lines.extend(f"{' ' * indent}{line}" for line in payload[1:])
    return "\n".join(lines)


def apply_to_file(path: Path, groups: dict[str, Any]) -> tuple[str, int, int]:
    text = path.read_text(encoding="utf-8")
    document = json.loads(text)
    conflicts = [key for key in groups["paths"] if key in document["paths"]]
    if conflicts:
        raise SystemExit(f"{path.name} already declares datacenter paths: {', '.join(conflicts)}")
    new_schemas = {
        name: schema
        for name, schema in groups["schemas"].items()
        if name not in document["components"]["schemas"]
    }
    updated = _insert_head(text, "paths", groups["paths"], indent=6)
    updated = _insert_head(updated, "schemas", new_schemas, indent=8)
    json.loads(updated)
    return updated, len(groups["paths"]), len(new_schemas)


def main() -> int:
    parser = argparse.ArgumentParser(description="Splice datacenter operations into backend OpenAPI.")
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    root = args.root.resolve()
    sys.path.insert(0, str(root))
    from tools.frontend_contract_loader import load_frontend_field_contract

    contract = load_frontend_field_contract(root)
    manifest = {
        "operations": [
            operation
            for operation in contract.get("frontend_operations", [])
            if isinstance(operation, dict)
            and str(operation.get("api_path", "")).startswith(PREFIX)
        ]
    }
    for operation in manifest["operations"]:
        operation.setdefault("openapi_exposed", True)

    for target in TARGETS:
        target_path = root / target
        document = json.loads(target_path.read_text(encoding="utf-8"))
        groups = build_operations(manifest, document)
        updated, path_count, schema_count = apply_to_file(target_path, groups)
        if updated == target_path.read_text(encoding="utf-8"):
            print(f"{target}: already up to date")
            continue
        if not args.apply:
            print(f"{target}: would add {path_count} datacenter paths and {schema_count} schemas")
            continue
        target_path.write_text(updated, encoding="utf-8")
        print(f"{target}: added {path_count} datacenter paths and {schema_count} schemas")
    return 0


if __name__ == "__main__":
    sys.exit(main())
