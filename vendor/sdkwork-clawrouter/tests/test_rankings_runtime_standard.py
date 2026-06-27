import json
import unittest
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
RANKINGS_PACKAGE = (
    ROOT
    / "apps"
    / "sdkwork-clawrouter-pc"
    / "packages"
    / "sdkwork-clawrouter-pc-rankings"
)
CLASSIFICATION_PATH = ROOT / "docs" / "schema-registry" / "frontend-route-classification.yaml"


class RankingsRuntimeStandardTest(unittest.TestCase):
    def test_rankings_package_build_is_source_package_type_validation(self) -> None:
        package = json.loads((RANKINGS_PACKAGE / "package.json").read_text(encoding="utf-8"))
        scripts = package.get("scripts", {})
        dev_dependencies = package.get("devDependencies", {})

        self.assertEqual("tsc --noEmit", scripts.get("build"))
        self.assertEqual("tsc --noEmit", scripts.get("typecheck"))
        self.assertEqual("tsc --noEmit --watch", scripts.get("dev"))
        self.assertNotIn(
            "vite build",
            " ".join(str(value) for value in scripts.values()),
            "The rankings package is a source-imported route package and must not use app-mode Vite builds that require index.html.",
        )
        self.assertNotIn("vite", dev_dependencies)

    def test_rankings_page_uses_testable_snapshot_catalog_module(self) -> None:
        page_path = RANKINGS_PACKAGE / "src" / "Rankings.tsx"
        catalog_path = RANKINGS_PACKAGE / "src" / "rankingCatalog.ts"
        runtime_test_path = ROOT / "apps" / "sdkwork-clawrouter-pc" / "rankings-runtime.test.ts"
        verifier_path = ROOT / "scripts" / "verify-claw-router-application.mjs"

        self.assertTrue(catalog_path.exists(), "Rankings business logic must live in a pure catalog module.")
        self.assertTrue(runtime_test_path.exists(), "Rankings runtime behavior must have executable Node tests.")

        page_source = page_path.read_text(encoding="utf-8")
        catalog_source = catalog_path.read_text(encoding="utf-8")
        runtime_test_source = runtime_test_path.read_text(encoding="utf-8")
        verifier_source = verifier_path.read_text(encoding="utf-8")

        self.assertIn("EMPTY_RANKING_CATALOG", page_source)
        self.assertIn("EMPTY_RANKING_HISTORY", page_source)
        self.assertIn("DEFAULT_RANKING_SNAPSHOT_SOURCE", page_source)
        self.assertIn("deriveRankingViewModel(", page_source)
        self.assertIn("formatRankingVolume(", page_source)
        self.assertNotIn("useState(RANKING_CATALOG)", page_source)
        self.assertNotIn("useState(RANKING_HISTORY)", page_source)
        self.assertNotIn("const rankingCatalog", page_source)
        self.assertNotIn("const RAW_HISTORY", page_source)
        self.assertNotIn("new Date()", page_source)
        self.assertNotIn("Global model usage and popularity benchmark.", page_source)
        self.assertNotIn("Live Volume", page_source)
        self.assertNotIn("Weekly API calls Tracker", page_source)
        self.assertIn("RankingService.fetchModelRankings({", page_source)
        self.assertIn("vendorCode: selectedVendorCode", page_source)
        self.assertIn("modality: activeBackendModality", page_source)
        self.assertIn("searchQuery", page_source)
        self.assertIn("limit: 200", page_source)
        self.assertIn("vendorOptions.vendorCodesByLabel", page_source)
        self.assertIn("rankings.snapshotBenchmark", page_source)
        self.assertIn("rankings.benchmarkIndex", page_source)

        self.assertIn("export const DEFAULT_RANKING_SNAPSHOT_SOURCE", catalog_source)
        self.assertIn("export const EMPTY_RANKING_CATALOG", catalog_source)
        self.assertIn("export const EMPTY_RANKING_HISTORY", catalog_source)
        self.assertRegex(catalog_source, r"observedAt:\s*['\"]2026-05-07['\"]")
        self.assertRegex(catalog_source, r"historyAnchorDate:\s*['\"]2026-05-07['\"]")
        self.assertNotIn("export const RANKING_CATALOG", catalog_source)
        self.assertNotIn("export const RANKING_HISTORY", catalog_source)
        self.assertIn("export function rankingHistoryKey", catalog_source)
        self.assertIn("export function createRankingHistory", catalog_source)
        self.assertIn("export function filterRankingsForCatalog", catalog_source)
        self.assertIn("export function deriveRankingViewModel", catalog_source)
        self.assertIn("export function deriveRankingDynamicStats", catalog_source)
        self.assertIn("export function resolveActiveRankingWeekIndex", catalog_source)
        self.assertIn("numericCell(activeWeekData, rankingHistoryKey(model))", catalog_source)
        self.assertIn("filteredRankings.map(rankingHistoryKey).reverse()", catalog_source)
        self.assertIn("requests: number;", catalog_source)
        self.assertIn("tokens: number;", catalog_source)
        self.assertIn("cost: number;", catalog_source)
        self.assertIn("currency: string;", catalog_source)
        self.assertIn("trendScore?: number;", catalog_source)
        self.assertNotIn("numericCell(activeWeekData, model.name)", catalog_source)
        self.assertNotIn("filteredRankings.map((model) => model.name).reverse()", catalog_source)

        self.assertIn("ranking history is deterministic", runtime_test_source)
        self.assertIn("deriveRankingViewModel", runtime_test_source)
        self.assertIn("DEFAULT_RANKING_SNAPSHOT_SOURCE", runtime_test_source)
        self.assertIn("ranking runtime defaults are empty", runtime_test_source)
        self.assertIn("ranking service maps backend history identities to stable series keys and display names", runtime_test_source)
        self.assertIn("ranking service rejects snapshot-scoped ranking ids", runtime_test_source)
        self.assertIn("Ranking model id must use stable catalog identity", runtime_test_source)
        self.assertIn("ranking service rejects fractional ranking count metrics", runtime_test_source)
        self.assertIn("Ranking model requests must be a non-negative integer", runtime_test_source)
        self.assertIn("ranking service rejects fractional ranking order metrics", runtime_test_source)
        self.assertIn("Ranking model rank must be a positive integer", runtime_test_source)
        self.assertIn("ranking service rejects fractional ranking history volume metrics", runtime_test_source)
        self.assertIn("Ranking history entry volume must be a non-negative integer", runtime_test_source)
        self.assertIn("ranking service rejects fractional ranking history point indexes", runtime_test_source)
        self.assertIn("Ranking history point index must be a non-negative integer", runtime_test_source)
        self.assertIn("ranking service rejects fractional ranking source refresh intervals", runtime_test_source)
        self.assertIn("Ranking source refresh interval seconds must be a positive integer", runtime_test_source)
        self.assertIn("tokens: 456000", runtime_test_source)
        self.assertIn("trendScore: 0.77", runtime_test_source)
        self.assertIn("ranking view model keeps same-name models isolated by stable identity", runtime_test_source)
        self.assertIn("rankingHistoryKey", runtime_test_source)
        self.assertIn("ranking service sends page filters through the generated app SDK query contract", runtime_test_source)
        self.assertIn("rankScope: \"commercial-default\"", runtime_test_source)
        self.assertIn("vendorCode: \"openai\"", runtime_test_source)
        self.assertIn("modality: \"llm\"", runtime_test_source)
        self.assertIn("searchQuery: \"gpt\"", runtime_test_source)
        self.assertIn("portal rankings runtime tests", verifier_source)
        self.assertIn("apps/sdkwork-clawrouter-pc/rankings-runtime.test.ts", verifier_source)

    def test_rankings_service_preserves_required_model_ranking_metrics(self) -> None:
        catalog_path = RANKINGS_PACKAGE / "src" / "rankingCatalog.ts"
        service_path = RANKINGS_PACKAGE / "src" / "rankingService.ts"
        catalog_source = catalog_path.read_text(encoding="utf-8")
        service_source = service_path.read_text(encoding="utf-8")

        for required_field in [
            "requests: number;",
            "tokens: number;",
            "cost: number;",
            "currency: string;",
            "trendScore?: number;",
        ]:
            self.assertIn(required_field, catalog_source)

        for required_mapping in [
            "rank: readRequiredPositiveInteger(value, 'rank', 'Ranking model rank')",
            "prevRank: readRequiredNonNegativeInteger(value, 'prevRank', 'Ranking model previous rank')",
            "baseVolume: readRequiredNonNegativeInteger(value, 'baseVolume', 'Ranking model base volume')",
            "requests: readRequiredNonNegativeInteger(value, 'requests', 'Ranking model requests')",
            "tokens: readRequiredNonNegativeInteger(value, 'tokens', 'Ranking model tokens')",
            "cost: readRequiredNonNegativeNumber(value, 'cost', 'Ranking model cost is required')",
            "currency: readRequiredString(value, 'currency', 'Ranking model currency is required')",
            "costIndicator: readRequiredBoundedInteger(value, 'costIndicator', 1, 5, 'Ranking model cost indicator')",
            "latency: readRequiredNonNegativeInteger(value, 'latency', 'Ranking model latency')",
            "trendScore: optionalFiniteNumber(value, 'trendScore')",
            "refreshIntervalSeconds: readRequiredPositiveInteger(source, 'refreshIntervalSeconds', 'Ranking source refresh interval seconds')",
            "cacheMaxAgeSeconds: readRequiredPositiveInteger(source, 'cacheMaxAgeSeconds', 'Ranking source cache max age seconds')",
            "index: readRequiredNonNegativeInteger(value, 'index', 'Ranking history point index')",
            "readRequiredNonNegativeInteger(entry, 'rank', 'Ranking history entry rank')",
            "const volume = readRequiredNonNegativeInteger(entry, 'volume', 'Ranking history entry volume')",
        ]:
            self.assertIn(required_mapping, service_source)
        self.assertIn("function readRequiredNonNegativeInteger(record: ApiRecord, key: string, label: string): number", service_source)
        self.assertIn("function readRequiredPositiveInteger(record: ApiRecord, key: string, label: string): number", service_source)
        self.assertIn("function readRequiredBoundedInteger(", service_source)
        self.assertIn("throw new Error(`${label} must be a non-negative integer`)", service_source)
        self.assertIn("throw new Error(`${label} must be a positive integer`)", service_source)

    def test_rankings_page_uses_typed_browser_and_chart_runtime_boundaries(self) -> None:
        page_path = RANKINGS_PACKAGE / "src" / "Rankings.tsx"
        page_source = page_path.read_text(encoding="utf-8")

        self.assertIn("import type { CategoricalChartFunc } from 'recharts/types/chart/types'", page_source)
        self.assertIn("let interval: number | undefined", page_source)
        self.assertIn("let captureInterval: number | undefined", page_source)
        self.assertIn("let options: MediaRecorderOptions", page_source)
        self.assertIn("const handleChartMouseMove: CategoricalChartFunc", page_source)
        self.assertIn("const handleChartClick: CategoricalChartFunc", page_source)
        self.assertIn("typeof state.activeTooltipIndex === 'number'", page_source)

        self.assertNotIn("let interval: any", page_source)
        self.assertNotIn("let captureInterval: any", page_source)
        self.assertNotIn("let options: any", page_source)
        self.assertNotIn("state: any", page_source)
        self.assertNotIn(": any", page_source)
        self.assertNotIn("as any", page_source)

    def test_rankings_route_classification_declares_sdk_backed_snapshot_delivery(self) -> None:
        classification = yaml.safe_load(CLASSIFICATION_PATH.read_text(encoding="utf-8"))
        route = self._route_entry(classification, "/rankings")

        self.assertEqual("sdk_backed_business_runtime", route["delivery_kind"])
        self.assertEqual("app", route["api_surface"])
        self.assertNotIn("static_delivery", route)
        self.assertIn(
            "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-rankings/src/rankingCatalog.ts",
            route["evidence"],
        )
        self.assertIn(
            "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-rankings/src/rankingService.ts",
            route["evidence"],
        )

    def test_rankings_production_smoke_covers_route_and_chunk_semantics(self) -> None:
        smoke_path = ROOT / "apps" / "sdkwork-clawrouter-pc" / "scripts" / "smoke-production-browser.mjs"
        product_test_path = ROOT / "scripts" / "run-claw-router-application.test.mjs"
        catalog_path = RANKINGS_PACKAGE / "src" / "rankingCatalog.ts"

        smoke_source = smoke_path.read_text(encoding="utf-8")
        product_test_source = product_test_path.read_text(encoding="utf-8")
        catalog_source = catalog_path.read_text(encoding="utf-8")

        self.assertIn('pathName: "/rankings"', smoke_source)
        self.assertIn("Snapshot Benchmark", smoke_source)
        self.assertIn("Published catalog benchmark", smoke_source)
        self.assertIn("DEFAULT_RANKING_SNAPSHOT_SOURCE", catalog_source)
        self.assertIn("deriveRankingViewModel", catalog_source)
        self.assertIn("createRankingHistory", catalog_source)
        self.assertIn("portal production browser DOM smoke", product_test_source)
        self.assertIn("Published catalog benchmark", product_test_source)

    def _route_entry(self, classification: dict, route: str) -> dict:
        for entry in classification.get("routes", []):
            if isinstance(entry, dict) and entry.get("route") == route:
                return entry
        self.fail(f"Missing frontend route classification for {route}.")


if __name__ == "__main__":
    unittest.main()
