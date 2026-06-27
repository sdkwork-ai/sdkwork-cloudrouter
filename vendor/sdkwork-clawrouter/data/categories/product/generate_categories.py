#!/usr/bin/env python3
"""Generate the product category seed from the structured taxonomy source."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

PRODUCT_DIR = Path(__file__).resolve().parent
SOURCE_PATH = PRODUCT_DIR / "taxonomy-source.json"
OUTPUT_PATH = PRODUCT_DIR / "categories.json"


def load_source() -> dict[str, Any]:
    return json.loads(SOURCE_PATH.read_text(encoding="utf-8"))


def category_no(root_code: str, second_index: int | None = None, third_index: int | None = None, leaf_index: int | None = None) -> str:
    parts = [root_code]
    if second_index is not None:
        parts.append(f"{second_index:02d}")
    if third_index is not None:
        parts.append(f"{third_index:02d}")
    if leaf_index is not None:
        parts.append(f"{leaf_index:02d}")
    return "-".join(parts)


def append_category(
    categories: list[dict[str, Any]],
    code: str,
    parent: str | None,
    name: str,
    sort_order: int,
) -> None:
    categories.append(
        {
            "categoryNo": code,
            "parentCategoryNo": parent,
            "name": name,
            "sortOrder": sort_order,
            "status": "active",
        }
    )


def build_seed(source: dict[str, Any]) -> dict[str, Any]:
    categories: list[dict[str, Any]] = []
    sort_order = 1000
    for root in source["roots"]:
        root_code = root["code"]
        root_name = root["name"]
        append_category(categories, root_code, None, root_name, sort_order)
        sort_order += 10
        leaf_variants = root["leafVariants"]
        for second_index, second in enumerate(root["children"], start=1):
            second_code = category_no(root_code, second_index)
            append_category(categories, second_code, root_code, second["name"], sort_order)
            sort_order += 10
            for third_index, third_name in enumerate(second["children"], start=1):
                third_code = category_no(root_code, second_index, third_index)
                append_category(categories, third_code, second_code, third_name, sort_order)
                sort_order += 10
                for leaf_index, leaf_variant in enumerate(leaf_variants, start=1):
                    leaf_code = category_no(root_code, second_index, third_index, leaf_index)
                    append_category(categories, leaf_code, third_code, f"{third_name}{leaf_variant}", sort_order)
                    sort_order += 10

    maintenance = summarize(categories)
    return {
        "schemaVersion": 1,
        "kind": "sdkwork.category_seed",
        "dataset": "product",
        "target": "commerce_product_category",
        "installPolicy": {
            "defaultEnabled": False,
            "configKey": "SDKWORK_CLAW_INSTALL_CATEGORY_SEEDS",
            "selectableDatasetsKey": "SDKWORK_CLAW_INSTALL_CATEGORY_SEED_DATASETS",
        },
        "source": {
            "alignment": source["alignment"],
            "notes": source["notes"],
            "maintenance": maintenance,
        },
        "categories": categories,
    }


def summarize(categories: list[dict[str, Any]]) -> dict[str, Any]:
    by_code = {item["categoryNo"]: item for item in categories}
    children: dict[str, list[dict[str, Any]]] = {item["categoryNo"]: [] for item in categories}
    for item in categories:
        parent = item["parentCategoryNo"]
        if parent:
            children[parent].append(item)

    def depth(code: str) -> int:
        value = 1
        seen: set[str] = set()
        current = by_code[code]
        while current["parentCategoryNo"]:
            if code in seen:
                raise ValueError(f"cycle detected at {code}")
            seen.add(code)
            value += 1
            code = current["parentCategoryNo"]
            current = by_code[code]
        return value

    roots = [item for item in categories if item["parentCategoryNo"] is None]
    leaves = [item for item in categories if not children[item["categoryNo"]]]
    generic_suffixes = ("精选", "入门", "专业", "套装")
    return {
        "firstLevelCount": len(roots),
        "totalCount": len(categories),
        "maxDepth": max(depth(item["categoryNo"]) for item in categories),
        "fourthLevelLeafCount": sum(1 for item in leaves if depth(item["categoryNo"]) == 4),
        "genericLeafSuffixCount": sum(1 for item in leaves if item["name"].endswith(generic_suffixes)),
        "categoryNoPattern": "WX-ROOT-SS-TT-DD",
    }


def validate_seed(seed: dict[str, Any]) -> None:
    categories = seed["categories"]
    codes = {item["categoryNo"] for item in categories}
    if len(codes) != len(categories):
        raise ValueError("duplicate categoryNo values detected")
    for item in categories:
        parent = item["parentCategoryNo"]
        if parent and parent not in codes:
            raise ValueError(f"missing parent {parent} for {item['categoryNo']}")
        if "?" in item["name"]:
            raise ValueError(f"invalid question-mark display name in {item['categoryNo']}")
    maintenance = seed["source"]["maintenance"]
    if maintenance["firstLevelCount"] < 35:
        raise ValueError("product taxonomy must keep at least 35 first-level roots")
    if maintenance["totalCount"] < 2975:
        raise ValueError("product taxonomy must keep at least 2975 nodes")
    if maintenance["maxDepth"] != 4:
        raise ValueError("product taxonomy must keep a complete four-level shape")
    if maintenance["fourthLevelLeafCount"] < 2240:
        raise ValueError("product taxonomy must keep at least 2240 fourth-level leaves")
    if maintenance["genericLeafSuffixCount"] != 0:
        raise ValueError("product taxonomy leaves must not use generic template suffixes")


def write_seed(seed: dict[str, Any]) -> None:
    OUTPUT_PATH.write_text(json.dumps(seed, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="validate categories.json is generated from taxonomy-source.json")
    args = parser.parse_args()

    seed = build_seed(load_source())
    validate_seed(seed)
    generated = json.dumps(seed, ensure_ascii=True, indent=2) + "\n"
    if args.check:
        current = OUTPUT_PATH.read_text(encoding="utf-8")
        if current != generated:
            print(f"{OUTPUT_PATH} is stale; run {Path(__file__).as_posix()}", file=sys.stderr)
            return 1
        print("Product category seed is current")
        return 0
    OUTPUT_PATH.write_text(generated, encoding="utf-8")
    print(
        "Wrote product category seed: "
        f"total={seed['source']['maintenance']['totalCount']} "
        f"roots={seed['source']['maintenance']['firstLevelCount']} "
        f"fourthLevelLeaves={seed['source']['maintenance']['fourthLevelLeafCount']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
