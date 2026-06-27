from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

_FRAMEWORK_TOOLS_ROOT = Path(__file__).resolve().parents[2] / "sdkwork-web-framework" / "tools"
if _FRAMEWORK_TOOLS_ROOT.is_dir() and str(_FRAMEWORK_TOOLS_ROOT) not in sys.path:
    sys.path.insert(0, str(_FRAMEWORK_TOOLS_ROOT))

from schema_registry.composer import compose_frontend_field_contract as _compose_frontend_field_contract  # noqa: E402

try:
    import yaml
except ImportError as exc:  # pragma: no cover - exercised only when PyYAML is unavailable
    yaml = None
    _YAML_IMPORT_ERROR = exc
else:
    _YAML_IMPORT_ERROR = None


class _FlowList(list[Any]):
    pass


class _FlowDict(dict[str, Any]):
    pass


DEFAULT_CONTRACT_SNAPSHOT = Path("docs") / "schema-registry" / "frontend-field-contracts.yaml"
DEFAULT_CONTRACT_INDEX = Path("docs") / "schema-registry" / "frontend-field-contracts" / "index.yaml"
MERGEABLE_LIST_SECTIONS = {"frontend_models", "frontend_operations", "routes"}
MERGEABLE_MAPPING_SECTIONS = {"x_response_entities"}
METADATA_KEYS = {"schema", "version", "source", "rule"}
FLOW_SEQUENCE_KEYS = {"enum", "required"}
FLOW_SCHEMA_KEYS = {
    "additionalProperties",
    "default",
    "description",
    "enum",
    "format",
    "maxLength",
    "maximum",
    "minLength",
    "minimum",
    "nullable",
    "pattern",
    "type",
}

if yaml is not None:
    class _ContractYamlDumper(yaml.SafeDumper):
        def increase_indent(self, flow: bool = False, indentless: bool = False) -> None:
            return super().increase_indent(flow, False)

    def _represent_flow_list(
        dumper: _ContractYamlDumper,
        value: _FlowList,
    ) -> yaml.SequenceNode:
        return dumper.represent_sequence("tag:yaml.org,2002:seq", value, flow_style=True)

    def _represent_flow_dict(
        dumper: _ContractYamlDumper,
        value: _FlowDict,
    ) -> yaml.MappingNode:
        return dumper.represent_mapping("tag:yaml.org,2002:map", value, flow_style=True)

    _ContractYamlDumper.add_representer(_FlowList, _represent_flow_list)
    _ContractYamlDumper.add_representer(_FlowDict, _represent_flow_dict)
else:  # pragma: no cover - exercised only when PyYAML is unavailable
    _ContractYamlDumper = None



@dataclass(frozen=True)
class FrontendContractCompileResult:
    ok: bool
    messages: list[str]


def default_frontend_contract_path(root: Path) -> Path:
    root = Path(root).resolve()
    index_path = root / DEFAULT_CONTRACT_INDEX
    if index_path.is_file():
        return index_path
    return root / DEFAULT_CONTRACT_SNAPSHOT


def load_frontend_field_contract(root: Path, contract_path: Path | None = None) -> dict[str, Any]:
    root = Path(root).resolve()
    selected_path = Path(contract_path).resolve() if contract_path is not None else default_frontend_contract_path(root)
    payload = _load_yaml_mapping(selected_path, "frontend field contract")
    if _is_fragment_index(payload):
        return compile_frontend_field_contract(root=root, index_path=selected_path)
    return payload


def compile_frontend_field_contract(root: Path, index_path: Path | None = None) -> dict[str, Any]:
    root = Path(root).resolve()
    selected_index = Path(index_path).resolve() if index_path is not None else root / DEFAULT_CONTRACT_INDEX
    return _compose_frontend_field_contract(root, selected_index)


def render_frontend_field_contract(root: Path, index_path: Path | None = None) -> str:
    if yaml is None:
        raise RuntimeError("PyYAML is required to render frontend field contracts") from _YAML_IMPORT_ERROR
    payload = compile_frontend_field_contract(root=root, index_path=index_path)
    styled_payload = _style_frontend_contract_snapshot(payload)
    content = yaml.dump(
        styled_payload,
        Dumper=_ContractYamlDumper,
        allow_unicode=True,
        default_flow_style=False,
        sort_keys=False,
        width=240,
    )
    return _normalize_frontend_contract_yaml_style(content)


class FrontendFieldContractCompiler:
    def __init__(
        self,
        root: Path,
        index_path: Path | None = None,
        snapshot_path: Path | None = None,
    ) -> None:
        self.root = Path(root).resolve()
        self.index_path = (
            Path(index_path).resolve()
            if index_path is not None
            else self.root / DEFAULT_CONTRACT_INDEX
        )
        self.snapshot_path = (
            Path(snapshot_path).resolve()
            if snapshot_path is not None
            else self.root / DEFAULT_CONTRACT_SNAPSHOT
        )

    def write(self) -> Path:
        content = render_frontend_field_contract(self.root, self.index_path)
        self.snapshot_path.parent.mkdir(parents=True, exist_ok=True)
        self.snapshot_path.write_text(content, encoding="utf-8", newline="\n")
        return self.snapshot_path

    def check(self) -> FrontendContractCompileResult:
        if not self.index_path.is_file():
            return FrontendContractCompileResult(ok=True, messages=[])
        try:
            compiled = compile_frontend_field_contract(self.root, self.index_path)
            snapshot = _load_yaml_mapping(self.snapshot_path, "frontend field contract snapshot")
        except (OSError, ValueError, RuntimeError) as exc:
            return FrontendContractCompileResult(ok=False, messages=[str(exc)])
        if snapshot != compiled:
            return FrontendContractCompileResult(
                ok=False,
                messages=[f"frontend field contract snapshot is stale: {self.snapshot_path}"],
            )
        return FrontendContractCompileResult(ok=True, messages=[])


def _load_yaml_mapping(path: Path, label: str) -> dict[str, Any]:
    if yaml is None:
        raise RuntimeError(f"PyYAML is required to load {label}") from _YAML_IMPORT_ERROR
    if not path.is_file():
        return {}
    payload = yaml.safe_load(path.read_text(encoding="utf-8"))
    if payload is None:
        return {}
    if not isinstance(payload, dict):
        raise ValueError(f"{label} root must be a mapping")
    return payload


def _is_fragment_index(payload: dict[str, Any]) -> bool:
    return isinstance(payload.get("fragments"), list)


def _fragment_path(index_path: Path, raw_fragment: Any) -> Path:
    if isinstance(raw_fragment, str):
        raw_path = raw_fragment
    elif isinstance(raw_fragment, dict) and isinstance(raw_fragment.get("path"), str):
        raw_path = raw_fragment["path"]
    else:
        raise ValueError("frontend field contract fragment entries must be strings or mappings with path")
    candidate = Path(raw_path)
    if candidate.is_absolute() or ".." in candidate.parts:
        raise ValueError(f"frontend field contract fragment path must stay inside the contract directory: {raw_path}")
    return (index_path.parent / candidate).resolve()


def _merge_fragment(compiled: dict[str, Any], fragment: dict[str, Any], *, root: Path, fragment_path: Path) -> None:
    for key, value in fragment.items():
        if key in METADATA_KEYS or key == "schema" or key == "fragment":
            continue
        if key in MERGEABLE_LIST_SECTIONS:
            if not isinstance(value, list):
                raise ValueError(f"{_display(root, fragment_path)} {key} must be a list")
            compiled.setdefault(key, [])
            if not isinstance(compiled[key], list):
                raise ValueError(f"frontend field contract section {key} cannot be both list and mapping")
            compiled[key].extend(value)
            continue
        if key in MERGEABLE_MAPPING_SECTIONS:
            if not isinstance(value, dict):
                raise ValueError(f"{_display(root, fragment_path)} {key} must be a mapping")
            compiled.setdefault(key, {})
            if not isinstance(compiled[key], dict):
                raise ValueError(f"frontend field contract section {key} cannot be both mapping and list")
            duplicate_keys = set(compiled[key]) & set(value)
            if duplicate_keys:
                duplicates = ", ".join(sorted(str(item) for item in duplicate_keys))
                raise ValueError(f"{_display(root, fragment_path)} declares duplicate {key}: {duplicates}")
            compiled[key].update(value)
            continue
        raise ValueError(f"{_display(root, fragment_path)} declares unsupported frontend field contract section: {key}")


def _style_frontend_contract_snapshot(value: Any, *, key: str | None = None) -> Any:
    if isinstance(value, list):
        styled = [_style_frontend_contract_snapshot(item) for item in value]
        if key in FLOW_SEQUENCE_KEYS and _is_scalar_sequence(styled):
            return _FlowList(styled)
        return styled
    if isinstance(value, dict):
        styled = {
            item_key: _style_frontend_contract_snapshot(item_value, key=str(item_key))
            for item_key, item_value in value.items()
        }
        if _is_flow_schema_mapping(styled):
            return _FlowDict(styled)
        return styled
    return value


def _is_scalar_sequence(value: list[Any]) -> bool:
    return all(not isinstance(item, (dict, list)) for item in value)


def _is_flow_schema_mapping(value: dict[str, Any]) -> bool:
    if not value or not set(value).issubset(FLOW_SCHEMA_KEYS):
        return False
    if "description" in value:
        return False
    return all(
        not isinstance(item, dict)
        and (not isinstance(item, list) or _is_scalar_sequence(item))
        for item in value.values()
    )


def _normalize_frontend_contract_yaml_style(content: str) -> str:
    return re.sub(r"\{([^{}\n]*:[^{}\n]*)\}", r"{ \1 }", content)


def _display(root: Path, path: Path) -> str:
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return path.as_posix()


def main() -> int:
    parser = argparse.ArgumentParser(description="Compile modular frontend field contracts into the snapshot YAML.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument("--index", type=Path, default=None, help="frontend field contract index YAML path")
    parser.add_argument("--output", type=Path, default=None, help="compiled snapshot output path")
    parser.add_argument("--check", action="store_true", help="validate compiled snapshot is current")
    args = parser.parse_args()

    compiler = FrontendFieldContractCompiler(root=args.root, index_path=args.index, snapshot_path=args.output)
    if args.check:
        result = compiler.check()
        if result.ok:
            print("Frontend field contract snapshot is current")
            return 0
        for message in result.messages:
            print(message)
        return 1

    output = compiler.write()
    print(f"Wrote frontend field contract snapshot to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
