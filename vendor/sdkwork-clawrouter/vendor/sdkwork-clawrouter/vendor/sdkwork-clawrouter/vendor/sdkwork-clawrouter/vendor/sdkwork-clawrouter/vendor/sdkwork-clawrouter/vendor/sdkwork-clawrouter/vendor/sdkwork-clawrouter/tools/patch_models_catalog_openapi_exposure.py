"""Mark sdkwork-models catalog frontend contracts as dependency-owned OpenAPI surfaces."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

APP_CATALOG_PATHS = {
    "/app/v3/api/ai/models",
    "/app/v3/api/ai/model_vendors",
    "/app/v3/api/ai/model_rankings",
}

MODELS_SOURCE_MARKERS = (
    "data/sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/modelService.ts",
    "data/sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-resource/src/resourceGroupService.ts",
)


def should_patch_block(block: str) -> bool:
    if "openapi_exposed: false" in block:
        return False
    if any(marker in block for marker in MODELS_SOURCE_MARKERS):
        return True
    return any(f"api_path: {api_path}" in block for api_path in APP_CATALOG_PATHS)


def patch_block(block: str) -> tuple[str, bool]:
    if not should_patch_block(block):
        return block, False
    return re.sub(
        r"(?m)^(\s*api_path: .+\n)",
        r"\1\1".replace(r"\1\1", lambda m: f"{m.group(1)}{m.group(1).replace('api_path', 'openapi_exposed', 1).split(':')[0]}openapi_exposed: false\n"),
        block,
        count=1,
    ), True


def patch_block_simple(block: str) -> tuple[str, bool]:
    if not should_patch_block(block):
        return block, False
    lines = block.splitlines(keepends=True)
    patched: list[str] = []
    inserted = False
    for line in lines:
        patched.append(line)
        if not inserted and line.lstrip().startswith("api_path:"):
            indent = line[: len(line) - len(line.lstrip())]
            patched.append(f"{indent}openapi_exposed: false\n")
            inserted = True
    return "".join(patched), True


def patch_file(path: Path) -> int:
    text = path.read_text(encoding="utf-8")
    parts = re.split(r"(?=^- route:)", text, flags=re.MULTILINE)
    if len(parts) == 1:
        return 0
    changed = 0
    rebuilt = [parts[0]]
    for part in parts[1:]:
        patched, did_change = patch_block_simple(part)
        if did_change:
            changed += 1
        rebuilt.append(patched)
    if changed:
        path.write_text("".join(rebuilt), encoding="utf-8", newline="\n")
    return changed


def main() -> int:
    targets = [
        ROOT / "docs/schema-registry/frontend-field-contracts/operations/backend-ai.yaml",
        ROOT / "docs/schema-registry/frontend-field-contracts/operations/app-ai.yaml",
        ROOT / "docs/schema-registry/frontend-field-contracts/operations/app-intelligence.yaml",
    ]
    total = sum(patch_file(path) for path in targets)
    print(f"patched {total} catalog operation blocks")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
