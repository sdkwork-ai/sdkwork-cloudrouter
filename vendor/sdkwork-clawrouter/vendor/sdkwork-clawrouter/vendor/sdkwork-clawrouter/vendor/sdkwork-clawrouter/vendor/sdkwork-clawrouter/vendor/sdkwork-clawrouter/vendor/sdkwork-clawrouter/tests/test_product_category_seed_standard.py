import json
import subprocess
import sys
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
PRODUCT_DIR = REPO_ROOT / "data" / "categories" / "product"
PRODUCT_SEED = PRODUCT_DIR / "categories.json"
PRODUCT_SOURCE = PRODUCT_DIR / "taxonomy-source.json"
PRODUCT_GENERATOR = PRODUCT_DIR / "generate_categories.py"


class ProductCategorySeedStandardTest(unittest.TestCase):
    def test_product_category_seed_is_source_generated_and_complete(self) -> None:
        self.assertTrue(PRODUCT_SOURCE.exists(), "product taxonomy source must be committed")
        self.assertTrue(PRODUCT_GENERATOR.exists(), "product taxonomy generator must be committed")

        subprocess.run(
            [sys.executable, str(PRODUCT_GENERATOR), "--check"],
            cwd=REPO_ROOT,
            check=True,
            text=True,
            capture_output=True,
        )

        data = json.loads(PRODUCT_SEED.read_text(encoding="utf-8"))
        categories = data["categories"]
        by_code = {item["categoryNo"]: item for item in categories}
        children = {item["categoryNo"]: [] for item in categories}
        for item in categories:
            parent = item["parentCategoryNo"]
            if parent:
                self.assertIn(parent, by_code)
                children[parent].append(item)

        def depth(code: str) -> int:
            value = 1
            seen = set()
            current = by_code[code]
            while current["parentCategoryNo"]:
                self.assertNotIn(code, seen)
                seen.add(code)
                value += 1
                code = current["parentCategoryNo"]
                current = by_code[code]
            return value

        roots = [item for item in categories if item["parentCategoryNo"] is None]
        leaves = [item for item in categories if not children[item["categoryNo"]]]
        fourth_level_leaves = [item for item in leaves if depth(item["categoryNo"]) == 4]
        generic_suffixes = ("精选", "入门", "专业", "套装")
        templated_leaves = [
            item["categoryNo"]
            for item in leaves
            if item["name"].endswith(generic_suffixes)
        ]

        second_level_counts = [
            len(children[root["categoryNo"]])
            for root in roots
        ]

        self.assertEqual(35, len(roots))
        self.assertTrue(
            all(count >= 5 for count in second_level_counts),
            f"every first-level root must have at least five second-level categories: {second_level_counts}",
        )
        self.assertGreaterEqual(len(categories), 3600)
        self.assertEqual(4, max(depth(item["categoryNo"]) for item in categories))
        self.assertGreaterEqual(len(fourth_level_leaves), 2800)
        self.assertEqual([], templated_leaves[:10])

        root_names = {item["name"] for item in roots}
        for expected_root in {
            "珠宝首饰",
            "保健膳食",
            "医疗健康",
            "虚拟商品",
            "食品饮料",
            "家用电器",
            "电脑&办公",
            "教育培训",
        }:
            self.assertIn(expected_root, root_names)


if __name__ == "__main__":
    unittest.main()
