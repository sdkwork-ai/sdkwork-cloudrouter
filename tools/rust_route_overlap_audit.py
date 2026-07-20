from __future__ import annotations

import argparse
import os
import re
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class RustRouteLocation:
    method: str
    path: str
    source_path: str
    line: int


@dataclass(frozen=True)
class RustRouteOverlapAuditResult:
    ok: bool
    messages: list[str]


class RustRouteOverlapAudit:
    """Detect duplicate Axum method routes in production Rust sources."""

    SOURCE_ROOTS: tuple[str, ...] = (
        "services",
    )
    APPBASE_CRATES_ROOT = Path("crates")
    ROUTE_MARKER = ".route("
    METHOD_NAMES: tuple[str, ...] = ("delete", "get", "patch", "post", "put")
    STRING_CONSTANT_PATTERN = re.compile(
        r"""(?m)^\s*(?:pub(?:\([^)]*\))?\s+)?(?:const|static)\s+([A-Z][A-Z0-9_]*)\s*:\s*(?:&'static\s+)?&str\s*=\s*"((?:\\.|[^"\\])*)"\s*;"""
    )

    def __init__(self, root: Path) -> None:
        self.root = Path(root).resolve()

    def run(self) -> RustRouteOverlapAuditResult:
        route_map: dict[tuple[str, str], list[RustRouteLocation]] = defaultdict(list)
        for source_path in self._rust_sources():
            text = source_path.read_text(encoding="utf-8", errors="ignore")
            test_spans = self._cfg_test_module_spans(text)
            string_constants = self._string_constants(text)
            for offset, args in self._route_calls(text):
                if self._inside_spans(offset, test_spans):
                    continue
                path, handler_expression = self._first_string_arg(args, string_constants)
                if not path:
                    continue
                line = text.count("\n", 0, offset) + 1
                display_path = self._display_path(source_path)
                for method in self._methods(handler_expression):
                    route_map[(method, path)].append(
                        RustRouteLocation(method, path, display_path, line)
                    )

        messages: list[str] = []
        for (method, path), locations in sorted(route_map.items(), key=lambda item: item[0]):
            if len(locations) <= 1:
                continue
            if self._is_allowed_mutually_exclusive_duplicate(method, path, locations):
                continue
            formatted_locations = ", ".join(
                f"{location.source_path}:{location.line}" for location in locations
            )
            messages.append(
                f"duplicate Rust Axum method route {method} {path}: {formatted_locations}"
            )
        return RustRouteOverlapAuditResult(ok=not messages, messages=messages)

    def _rust_sources(self) -> list[Path]:
        sources: list[Path] = []
        for root in self._source_roots():
            if not root.exists():
                continue
            for source_path in root.rglob("*.rs"):
                normalized = source_path.as_posix()
                if "/tests/" in normalized or "/target/" in normalized:
                    continue
                sources.append(source_path)
        return sources

    def _source_roots(self) -> list[Path]:
        source_roots = [self.root / source_root for source_root in self.SOURCE_ROOTS]
        appbase_root = self._appbase_root()
        if appbase_root is not None:
            source_roots.append(appbase_root / self.APPBASE_CRATES_ROOT)
        return source_roots

    def _appbase_root(self) -> Path | None:
        local_dependency = self.root / ".sdkwork" / "dependencies" / "sdkwork-appbase"
        if local_dependency.exists():
            return local_dependency
        sibling_dependency = self.root.parent / "sdkwork-appbase"
        if sibling_dependency.exists():
            return sibling_dependency
        return None

    def _route_calls(self, text: str) -> list[tuple[int, str]]:
        calls: list[tuple[int, str]] = []
        offset = 0
        while True:
            marker = text.find(self.ROUTE_MARKER, offset)
            if marker < 0:
                return calls
            args_start = marker + len(self.ROUTE_MARKER)
            cursor = args_start
            depth = 1
            in_string = False
            escaped = False
            while cursor < len(text) and depth:
                character = text[cursor]
                if in_string:
                    if escaped:
                        escaped = False
                    elif character == "\\":
                        escaped = True
                    elif character == '"':
                        in_string = False
                    cursor += 1
                    continue
                if character == '"':
                    in_string = True
                elif character == "(":
                    depth += 1
                elif character == ")":
                    depth -= 1
                cursor += 1
            calls.append((marker, text[args_start : cursor - 1]))
            offset = cursor

    def _cfg_test_module_spans(self, text: str) -> list[tuple[int, int]]:
        spans: list[tuple[int, int]] = []
        pattern = re.compile(r"#\s*\[\s*cfg\s*\(\s*test\s*\)\s*\]\s*mod\s+\w+\s*\{")
        for match in pattern.finditer(text):
            brace = text.find("{", match.start())
            if brace < 0:
                continue
            end = self._balanced_brace_end(text, brace)
            spans.append((match.start(), end))
        return spans

    def _balanced_brace_end(self, text: str, start: int) -> int:
        depth = 0
        in_string = False
        escaped = False
        for index in range(start, len(text)):
            character = text[index]
            if in_string:
                if escaped:
                    escaped = False
                elif character == "\\":
                    escaped = True
                elif character == '"':
                    in_string = False
                continue
            if character == '"':
                in_string = True
            elif character == "{":
                depth += 1
            elif character == "}":
                depth -= 1
                if depth == 0:
                    return index + 1
        return len(text)

    def _inside_spans(self, offset: int, spans: list[tuple[int, int]]) -> bool:
        return any(start <= offset < end for start, end in spans)

    def _string_constants(self, text: str) -> dict[str, str]:
        return {
            match.group(1): self._decode_rust_string_literal(match.group(2))
            for match in self.STRING_CONSTANT_PATTERN.finditer(text)
        }

    def _first_string_arg(
        self, args: str, string_constants: dict[str, str] | None = None
    ) -> tuple[str | None, str]:
        string_constants = string_constants or {}
        cursor = 0
        while cursor < len(args) and args[cursor].isspace():
            cursor += 1
        if cursor >= len(args):
            return None, args
        if args[cursor] != '"':
            first_arg, remainder = self._split_first_arg(args[cursor:])
            path = self._resolve_string_constant_arg(first_arg, string_constants)
            return path, remainder
        cursor += 1
        value: list[str] = []
        escaped = False
        while cursor < len(args):
            character = args[cursor]
            if escaped:
                value.append(character)
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == '"':
                cursor += 1
                break
            else:
                value.append(character)
            cursor += 1
        while cursor < len(args) and args[cursor].isspace():
            cursor += 1
        if cursor < len(args) and args[cursor] == ",":
            cursor += 1
        return "".join(value), args[cursor:]

    def _split_first_arg(self, args: str) -> tuple[str, str]:
        cursor = 0
        depth = 0
        in_string = False
        escaped = False
        while cursor < len(args):
            character = args[cursor]
            if in_string:
                if escaped:
                    escaped = False
                elif character == "\\":
                    escaped = True
                elif character == '"':
                    in_string = False
                cursor += 1
                continue
            if character == '"':
                in_string = True
            elif character in "([{":
                depth += 1
            elif character in ")]}":
                depth = max(0, depth - 1)
            elif character == "," and depth == 0:
                return args[:cursor].strip(), args[cursor + 1 :]
            cursor += 1
        return args.strip(), ""

    def _resolve_string_constant_arg(
        self, first_arg: str, string_constants: dict[str, str]
    ) -> str | None:
        name = first_arg.strip()
        while name.startswith("&"):
            name = name[1:].strip()
        return string_constants.get(name)

    def _decode_rust_string_literal(self, value: str) -> str:
        decoded: list[str] = []
        escaped = False
        for character in value:
            if escaped:
                decoded.append(character)
                escaped = False
            elif character == "\\":
                escaped = True
            else:
                decoded.append(character)
        if escaped:
            decoded.append("\\")
        return "".join(decoded)

    def _methods(self, expression: str) -> set[str]:
        methods = {
            method.upper()
            for method in self.METHOD_NAMES
            if f"{method}(" in expression or f".{method}(" in expression
        }
        if methods:
            return methods
        if ".fallback(" in expression or "MethodRouter::new().fallback" in expression:
            return {"ANY"}
        return {"UNKNOWN"}

    def _is_allowed_mutually_exclusive_duplicate(
        self,
        method: str,
        path: str,
        locations: list[RustRouteLocation],
    ) -> bool:
        source_paths = {location.source_path for location in locations}
        if (
            path.startswith("/app/v3/api/auth/")
            and source_paths == {"services/sdkwork-clawrouter-router-service/src/api/app_auth.rs"}
        ):
            return True
        if (
            method == "GET"
            and path
            in {
                "/app/v3/api/ai/channel_groups",
                "/app/v3/api/iam/api_keys",
            }
            and source_paths == {"services/sdkwork-clawrouter-router-service/src/api/app_api_keys.rs"}
        ):
            return True
        if (
            method == "DELETE"
            and path == "/v1/models/{model}"
            and source_paths
            == {
                "crates/sdkwork-clawrouter-edge-runtime/src/passthrough.rs",
                "crates/sdkwork-clawrouter-edge-runtime/src/invocation_http.rs",
            }
        ):
            return True
        if self._is_dependency_authority_route_overlap(method, path, source_paths):
            return True
        return False

    def _is_dependency_authority_route_overlap(
        self,
        method: str,
        path: str,
        source_paths: set[str],
    ) -> bool:
        claw_sources = {
            source_path
            for source_path in source_paths
            if source_path.startswith("services/sdkwork-clawrouter-router-service/")
        }
        appbase_sources = {
            source_path
            for source_path in source_paths
            if "sdkwork-appbase/" in source_path.replace("\\", "/")
        }
        if not claw_sources or not appbase_sources:
            return False
        dependency_prefixes = (
            "/app/v3/api/auth/",
            "/app/v3/api/oauth/",
            "/app/v3/api/system/iam/",
            "/app/v3/api/iam/",
        )
        return any(path.startswith(prefix) for prefix in dependency_prefixes)

    def _display_path(self, path: Path) -> str:
        try:
            return path.relative_to(self.root).as_posix()
        except ValueError:
            return Path(os.path.relpath(path, self.root)).as_posix()


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit duplicate Rust Axum method routes.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    args = parser.parse_args()

    result = RustRouteOverlapAudit(root=args.root).run()
    if result.ok:
        print("Rust route overlap audit passed")
        return 0
    for message in result.messages:
        print(message)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
