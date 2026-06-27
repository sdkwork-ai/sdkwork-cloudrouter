import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { clearStoredAppSessionToken } from "./packages/sdkwork-clawroutes-pc-commons/src/app-session-token.ts";
import { resetClawRouterSdkClients } from "./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts";
import {
  DEFAULT_RANKING_SNAPSHOT_SOURCE,
  EMPTY_RANKING_CATALOG,
  EMPTY_RANKING_HISTORY,
  createRankingHistory,
  deriveRankingChartData,
  deriveRankingChartKeys,
  deriveRankingDynamicStats,
  deriveRankingPanelStats,
  deriveRankingViewModel,
  deriveVendorOptionsForRankings,
  filterRankingsForCatalog,
  findRankingColor,
  formatRankingVolume,
  rankingHistoryKey,
  resolveActiveRankingWeekIndex,
  type RankingModel,
} from "./packages/sdkwork-clawrouter-pc-rankings/src/rankingCatalog.ts";
import { RankingService } from "./packages/sdkwork-clawrouter-pc-rankings/src/rankingService.ts";

const originalFetch = globalThis.fetch;
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");

type CapturedAppRequest = {
  url: string;
  method: string;
};

async function withAppSdkFetch<T>(
  handler: (url: string, init?: RequestInit) => unknown,
  fn: (captured: CapturedAppRequest[]) => Promise<T>,
): Promise<T> {
  const captured: CapturedAppRequest[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    enumerable: true,
    value: {},
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method ?? "GET";
    captured.push({ url, method });
    const result = handler(url, init);
    return new Response(JSON.stringify({ code: "2000", data: result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  clearStoredAppSessionToken();
  resetClawRouterSdkClients();

  try {
    return await fn(captured);
  } finally {
    clearStoredAppSessionToken();
    resetClawRouterSdkClients();
    globalThis.fetch = originalFetch;
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, "window", originalWindowDescriptor);
    } else {
      delete (globalThis as { window?: Window }).window;
    }
  }
}

test("ranking snapshot metadata is explicit and does not imply realtime data", () => {
  assert.deepEqual(DEFAULT_RANKING_SNAPSHOT_SOURCE, {
    sourceLabel: "Published catalog benchmark",
    sourceDescription: "Derived from published model capability, cost, latency, and routing readiness snapshots.",
    observedAt: "2026-05-07",
    snapshotDate: "2026-05-07",
    snapshotPeriod: "daily",
    windowStart: "2026-05-01T00:00:00.000Z",
    windowEnd: "2026-05-07T23:59:59.999Z",
    generatedAt: "2026-05-07T00:00:00.000Z",
    refreshIntervalSeconds: 3600,
    nextRefreshAt: "2026-05-07T01:00:00.000Z",
    cacheMaxAgeSeconds: 60,
    historyAnchorDate: "2026-05-07",
    sourceTables: ["ai_model_rank_snapshot"],
    rankScope: "global",
  });
});

test("ranking runtime defaults are empty until the SDK-backed snapshot loads", () => {
  assert.deepEqual(EMPTY_RANKING_CATALOG, []);
  assert.deepEqual(EMPTY_RANKING_HISTORY, []);
});

test("ranking page wires i18n keys and server-backed vendor loading", () => {
  const rankingsSource = readFileSync(new URL("./packages/sdkwork-clawrouter-pc-rankings/src/Rankings.tsx", import.meta.url), "utf8");
  const i18nSource = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-i18n/src/resources/public/rankings.ts", import.meta.url),
    "utf8",
  );
  const expectedKeys = [
    "rankings.badge",
    "rankings.title",
    "rankings.subtitle",
    "rankings.categories",
    "rankings.allModalities",
    "rankings.modelAccess",
    "rankings.allModels",
    "rankings.modelVendors",
    "rankings.clear",
    "rankings.benchmarkIndex",
    "rankings.searchPlaceholder",
    "rankings.table.rank",
    "rankings.emptyTitle",
    "rankings.deploy",
    "rankings.winRate",
    "rankings.costIndicator",
  ];

  assert.match(rankingsSource, /from 'react-i18next'/);
  assert.match(rankingsSource, /const \{ t \} = useTranslation\(\);/);
  assert.match(rankingsSource, /RankingService\.fetchModelVendors\(\)/);
  assert.match(rankingsSource, /const vendorOptions = useMemo\(\s*\(\) => deriveVendorOptionsForRankings\(rankingCatalog, rankingVendors\),\s*\[rankingCatalog, rankingVendors\],\s*\);/);
  assert.match(rankingsSource, /const selectedVendorCode = selectedVendor\s*\?\s*vendorOptions\.vendorCodesByLabel\[selectedVendor\]/);
  assert.ok(
    rankingsSource.indexOf("const selectedVendorCode = selectedVendor") < rankingsSource.indexOf("const rankingView = useMemo"),
    "selectedVendorCode must be derived before deriveRankingViewModel receives it",
  );
  assert.doesNotMatch(rankingsSource, /\bfetch\s*\(/);

  for (const key of expectedKeys) {
    assert.match(rankingsSource, new RegExp(`t\\('${escapeRegex(key)}'`));
    assert.equal(i18nSource.match(new RegExp(`"${escapeRegex(key)}"`, "g"))?.length, 2, `${key} must be configured for en and zh`);
  }
});

test("ranking service loads model vendors through the generated app SDK vendor endpoint", async () => {
  await withAppSdkFetch(
    (url) => {
      const requestUrl = new URL(url, "http://localhost");
      assert.equal(requestUrl.pathname, "/app/v3/api/ai/model_vendors");
      return {
        items: [
          { label: "OpenAI", code: "openai", modelCount: 2 },
          { label: "Anthropic", code: "anthropic", modelCount: 1 },
        ],
      };
    },
    async (captured) => {
      const vendors = await RankingService.fetchModelVendors();

      assert.deepEqual(captured.map((request) => `${request.method} ${request.url}`), [
        "GET /app/v3/api/ai/model_vendors",
      ]);
      assert.deepEqual(vendors, [
        { label: "Anthropic", code: "anthropic", modelCount: 1 },
        { label: "OpenAI", code: "openai", modelCount: 2 },
      ]);
    },
  );
});

test("ranking service uses generated app SDK snapshot history instead of local synthetic history", async () => {
  const openAiKey = rankingHistoryKey({ id: "openai/gpt-4o-mini" });
  const anthropicKey = rankingHistoryKey({ id: "anthropic/claude-3-7-sonnet" });

  await withAppSdkFetch(
    (url) => {
      const requestUrl = new URL(url, "http://localhost");
      assert.equal(requestUrl.pathname, "/app/v3/api/ai/model_rankings");
      assert.equal(requestUrl.searchParams.get("limit"), "200");
      return {
        source: {
          sourceLabel: "Usage ranking snapshot",
          sourceDescription: "Precomputed from ai_usage_fact and ai_model_rank_snapshot.",
          observedAt: "2026-05-08T08:00:00.000Z",
          snapshotDate: "2026-05-08",
          snapshotPeriod: "daily",
          windowStart: "2026-05-01T00:00:00.000Z",
          windowEnd: "2026-05-08T00:00:00.000Z",
          generatedAt: "2026-05-08T08:00:00.000Z",
          refreshIntervalSeconds: 3600,
          nextRefreshAt: "2026-05-08T09:00:00.000Z",
          cacheMaxAgeSeconds: 60,
          sourceTables: ["ai_usage_fact", "ai_model_rank_snapshot"],
          rankScope: "global",
        },
        items: [
          {
            id: "openai/gpt-4o-mini",
            rank: 1,
            prevRank: 2,
            name: "gpt-4o-mini",
            vendor: "OpenAI",
            vendorCode: "openai",
            modality: "LLM",
            baseVolume: 1200,
            requests: 1200,
            tokens: 456000,
            cost: 12.34,
            currency: "USD",
            trendScore: 0.77,
            costIndicator: 2,
            latency: 120,
            color: "#10b981",
            isNew: false,
            strengths: ["Fast"],
            license: "Proprietary",
          },
          {
            id: "anthropic/claude-3-7-sonnet",
            rank: 2,
            prevRank: 1,
            name: "claude-3-7-sonnet",
            vendor: "Anthropic",
            vendorCode: "anthropic",
            modality: "LLM",
            baseVolume: 900,
            requests: 900,
            tokens: 321000,
            cost: 9.87,
            currency: "USD",
            trendScore: -0.12,
            costIndicator: 3,
            latency: 180,
            color: "#f97316",
            isNew: false,
            strengths: ["Reasoning"],
            license: "Proprietary",
          },
        ],
        history: [
          {
            date: "2026-05-07",
            index: 0,
            entries: [
              { catalogKey: "openai/gpt-4o-mini", model: "gpt-4o-mini", rank: 2, volume: 1000, color: "#10b981" },
              { catalogKey: "anthropic/claude-3-7-sonnet", model: "claude-3-7-sonnet", rank: 1, volume: 1100, color: "#f97316" },
            ],
          },
          {
            date: "2026-05-08",
            index: 1,
            entries: [
              { catalogKey: "openai/gpt-4o-mini", model: "gpt-4o-mini", rank: 1, volume: 1200, color: "#10b981" },
              { catalogKey: "anthropic/claude-3-7-sonnet", model: "claude-3-7-sonnet", rank: 2, volume: 900, color: "#f97316" },
            ],
          },
        ],
      };
    },
    async (captured) => {
      const snapshot = await RankingService.fetchModelRankings();

      assert.deepEqual(captured.map((request) => `${request.method} ${request.url}`), [
        "GET /app/v3/api/ai/model_rankings?limit=200",
      ]);
      assert.equal(snapshot.catalog.length, 2);
      assert.deepEqual(snapshot.catalog.map((model) => ({
        id: model.id,
        requests: model.requests,
        tokens: model.tokens,
        cost: model.cost,
        currency: model.currency,
        trendScore: model.trendScore,
      })), [
        {
          id: "openai/gpt-4o-mini",
          requests: 1200,
          tokens: 456000,
          cost: 12.34,
          currency: "USD",
          trendScore: 0.77,
        },
        {
          id: "anthropic/claude-3-7-sonnet",
          requests: 900,
          tokens: 321000,
          cost: 9.87,
          currency: "USD",
          trendScore: -0.12,
        },
      ]);
      assert.deepEqual(snapshot.history, [
        {
          name: "2026-05-07",
          rawDate: Date.parse("2026-05-07T00:00:00.000Z"),
          index: 0,
          Others: 0,
          [openAiKey]: 1000,
          [anthropicKey]: 1100,
        },
        {
          name: "2026-05-08",
          rawDate: Date.parse("2026-05-08T00:00:00.000Z"),
          index: 1,
          Others: 0,
          [openAiKey]: 1200,
          [anthropicKey]: 900,
        },
      ]);
      assert.equal(snapshot.source.snapshotDate, "2026-05-08");
      assert.equal(snapshot.source.snapshotPeriod, "daily");
      assert.equal(snapshot.source.windowStart, "2026-05-01T00:00:00.000Z");
      assert.equal(snapshot.source.windowEnd, "2026-05-08T00:00:00.000Z");
      assert.equal(snapshot.source.generatedAt, "2026-05-08T08:00:00.000Z");
      assert.equal(snapshot.source.refreshIntervalSeconds, 3600);
      assert.equal(snapshot.source.nextRefreshAt, "2026-05-08T09:00:00.000Z");
      assert.equal(snapshot.source.cacheMaxAgeSeconds, 60);
      assert.equal(snapshot.source.historyAnchorDate, "2026-05-08");
    },
  );
});

test("ranking service treats an empty published snapshot as a valid first-run state", async () => {
  await withAppSdkFetch(
    (url) => {
      const requestUrl = new URL(url, "http://localhost");
      assert.equal(requestUrl.pathname, "/app/v3/api/ai/model_rankings");
      return {
        source: {
          sourceLabel: "Published model ranking snapshot",
          sourceDescription: "No published ranking rows have been generated yet.",
          observedAt: "",
          snapshotDate: "",
          snapshotPeriod: "daily",
          windowStart: "",
          windowEnd: "",
          generatedAt: "",
          refreshIntervalSeconds: 3600,
          nextRefreshAt: "",
          cacheMaxAgeSeconds: 60,
          sourceTables: ["ai_model_rank_snapshot"],
          rankScope: "commercial-default",
        },
        items: [],
        history: [],
      };
    },
    async () => {
      const snapshot = await RankingService.fetchModelRankings();

      assert.deepEqual(snapshot.catalog, []);
      assert.deepEqual(snapshot.history, []);
      assert.equal(snapshot.source.snapshotPeriod, "daily");
      assert.equal(snapshot.source.rankScope, "commercial-default");
      assert.deepEqual(snapshot.source.sourceTables, ["ai_model_rank_snapshot"]);
    },
  );
});

test("ranking service maps backend history identities to stable series keys and display names", async () => {
  const openAiKey = rankingHistoryKey({ id: "openai/gpt-4o-mini" });
  const anthropicKey = rankingHistoryKey({ id: "anthropic/claude-3-7-sonnet" });

  await withAppSdkFetch(
    (url) => {
      const requestUrl = new URL(url, "http://localhost");
      assert.equal(requestUrl.pathname, "/app/v3/api/ai/model_rankings");
      return {
        source: {
          sourceLabel: "Published model ranking snapshot",
          sourceDescription: "History rows are keyed by stable backend catalog identity.",
          observedAt: "2026-05-08T08:00:00.000Z",
          snapshotDate: "2026-05-08",
          snapshotPeriod: "daily",
          windowStart: "2026-05-01T00:00:00.000Z",
          windowEnd: "2026-05-08T00:00:00.000Z",
          generatedAt: "2026-05-08T08:00:00.000Z",
          refreshIntervalSeconds: 3600,
          nextRefreshAt: "2026-05-08T09:00:00.000Z",
          cacheMaxAgeSeconds: 60,
          sourceTables: ["ai_model_rank_snapshot"],
          rankScope: "global",
        },
        items: [
          {
            id: "openai/gpt-4o-mini",
            rank: 1,
            prevRank: 1,
            name: "GPT-4o Mini",
            vendor: "OpenAI",
            vendorCode: "openai",
            modality: "LLM",
            baseVolume: 1200,
            requests: 1200,
            tokens: 456000,
            cost: 12.34,
            currency: "USD",
            costIndicator: 2,
            latency: 120,
            color: "#10b981",
            license: "Proprietary",
          },
          {
            id: "anthropic/claude-3-7-sonnet",
            rank: 2,
            prevRank: 2,
            name: "Claude 3.7 Sonnet",
            vendor: "Anthropic",
            vendorCode: "anthropic",
            modality: "LLM",
            baseVolume: 900,
            requests: 900,
            tokens: 321000,
            cost: 9.87,
            currency: "USD",
            costIndicator: 3,
            latency: 180,
            color: "#f97316",
            license: "Proprietary",
          },
        ],
        history: [
          {
            date: "2026-05-08",
            index: 0,
            entries: [
              { catalogKey: "openai/gpt-4o-mini", model: "gpt-4o-mini", rank: 1, volume: 1200, color: "#10b981" },
              { catalogKey: "anthropic/claude-3-7-sonnet", model: "claude-3-7-sonnet", rank: 2, volume: 900, color: "#f97316" },
            ],
          },
        ],
      };
    },
    async () => {
      const snapshot = await RankingService.fetchModelRankings();
      const view = deriveRankingViewModel({
        catalog: snapshot.catalog,
        history: snapshot.history,
        filters: {
          modality: "All",
          vendor: null,
          license: "All",
          searchQuery: "",
        },
        activeWeekIndex: 0,
      });

      assert.deepEqual(snapshot.history, [
        {
          name: "2026-05-08",
          rawDate: Date.parse("2026-05-08T00:00:00.000Z"),
          index: 0,
          Others: 0,
          [openAiKey]: 1200,
          [anthropicKey]: 900,
        },
      ]);
      assert.deepEqual(view.displayRankings.map((model) => [model.name, model.currentVolume]), [
        ["GPT-4o Mini", 1200],
        ["Claude 3.7 Sonnet", 900],
      ]);
      assert.deepEqual(view.chartKeys, ["Others", anthropicKey, openAiKey]);
    },
  );
});

test("ranking service rejects snapshot-scoped ranking ids to keep backend and history identity aligned", async () => {
  await withAppSdkFetch(
    (url) => {
      const requestUrl = new URL(url, "http://localhost");
      assert.equal(requestUrl.pathname, "/app/v3/api/ai/model_rankings");
      return {
        source: {
          sourceLabel: "Published model ranking snapshot",
          sourceDescription: "Ranking item identities must be catalog identities.",
          observedAt: "2026-05-08T08:00:00.000Z",
          snapshotDate: "2026-05-08",
          snapshotPeriod: "daily",
          windowStart: "2026-05-01T00:00:00.000Z",
          windowEnd: "2026-05-08T00:00:00.000Z",
          generatedAt: "2026-05-08T08:00:00.000Z",
          refreshIntervalSeconds: 3600,
          nextRefreshAt: "2026-05-08T09:00:00.000Z",
          cacheMaxAgeSeconds: 60,
          sourceTables: ["ai_model_rank_snapshot"],
          rankScope: "global",
        },
        items: [
          {
            id: "2026-05-08:openai/gpt-4o-mini",
            rank: 1,
            prevRank: 1,
            name: "GPT-4o Mini",
            vendor: "OpenAI",
            vendorCode: "openai",
            modality: "LLM",
            baseVolume: 1200,
            requests: 1200,
            tokens: 456000,
            cost: 12.34,
            currency: "USD",
            costIndicator: 2,
            latency: 120,
            color: "#10b981",
            license: "Proprietary",
          },
        ],
        history: [
          {
            date: "2026-05-08",
            index: 0,
            entries: [
              { catalogKey: "openai/gpt-4o-mini", model: "gpt-4o-mini", rank: 1, volume: 1200, color: "#10b981" },
            ],
          },
        ],
      };
    },
    async () => {
      await assert.rejects(
        () => RankingService.fetchModelRankings(),
        /Ranking model id must use stable catalog identity/,
      );
    },
  );
});

test("ranking service rejects fractional ranking count metrics", async () => {
  await withAppSdkFetch(
    (url) => {
      const requestUrl = new URL(url, "http://localhost");
      assert.equal(requestUrl.pathname, "/app/v3/api/ai/model_rankings");
      return {
        source: {
          sourceLabel: "Published model ranking snapshot",
          sourceDescription: "Ranking count metrics must be integer counters.",
          observedAt: "2026-05-08T08:00:00.000Z",
          snapshotDate: "2026-05-08",
          snapshotPeriod: "daily",
          windowStart: "2026-05-01T00:00:00.000Z",
          windowEnd: "2026-05-08T00:00:00.000Z",
          generatedAt: "2026-05-08T08:00:00.000Z",
          refreshIntervalSeconds: 3600,
          nextRefreshAt: "2026-05-08T09:00:00.000Z",
          cacheMaxAgeSeconds: 60,
          sourceTables: ["ai_model_rank_snapshot"],
          rankScope: "global",
        },
        items: [
          {
            id: "openai/gpt-4o-mini",
            rank: 1,
            prevRank: 1,
            name: "GPT-4o Mini",
            vendor: "OpenAI",
            vendorCode: "openai",
            modality: "LLM",
            baseVolume: 1200,
            requests: 1200.5,
            tokens: 456000,
            cost: 12.34,
            currency: "USD",
            costIndicator: 2,
            latency: 120,
            color: "#10b981",
            license: "Proprietary",
          },
        ],
        history: [],
      };
    },
    async () => {
      await assert.rejects(
        () => RankingService.fetchModelRankings(),
        /Ranking model requests must be a non-negative integer/,
      );
    },
  );
});

test("ranking service rejects fractional ranking order metrics", async () => {
  await withAppSdkFetch(
    (url) => {
      const requestUrl = new URL(url, "http://localhost");
      assert.equal(requestUrl.pathname, "/app/v3/api/ai/model_rankings");
      return {
        source: {
          sourceLabel: "Published model ranking snapshot",
          sourceDescription: "Ranking order metrics must be integer counters.",
          observedAt: "2026-05-08T08:00:00.000Z",
          snapshotDate: "2026-05-08",
          snapshotPeriod: "daily",
          windowStart: "2026-05-01T00:00:00.000Z",
          windowEnd: "2026-05-08T00:00:00.000Z",
          generatedAt: "2026-05-08T08:00:00.000Z",
          refreshIntervalSeconds: 3600,
          nextRefreshAt: "2026-05-08T09:00:00.000Z",
          cacheMaxAgeSeconds: 60,
          sourceTables: ["ai_model_rank_snapshot"],
          rankScope: "global",
        },
        items: [
          {
            id: "openai/gpt-4o-mini",
            rank: 1.5,
            prevRank: 1,
            name: "GPT-4o Mini",
            vendor: "OpenAI",
            vendorCode: "openai",
            modality: "LLM",
            baseVolume: 1200,
            requests: 1200,
            tokens: 456000,
            cost: 12.34,
            currency: "USD",
            costIndicator: 2,
            latency: 120,
            color: "#10b981",
            license: "Proprietary",
          },
        ],
        history: [],
      };
    },
    async () => {
      await assert.rejects(
        () => RankingService.fetchModelRankings(),
        /Ranking model rank must be a positive integer/,
      );
    },
  );
});

test("ranking service rejects fractional ranking history volume metrics", async () => {
  await withAppSdkFetch(
    (url) => {
      const requestUrl = new URL(url, "http://localhost");
      assert.equal(requestUrl.pathname, "/app/v3/api/ai/model_rankings");
      return {
        source: {
          sourceLabel: "Published model ranking snapshot",
          sourceDescription: "Ranking history metrics must be integer counters.",
          observedAt: "2026-05-08T08:00:00.000Z",
          snapshotDate: "2026-05-08",
          snapshotPeriod: "daily",
          windowStart: "2026-05-01T00:00:00.000Z",
          windowEnd: "2026-05-08T00:00:00.000Z",
          generatedAt: "2026-05-08T08:00:00.000Z",
          refreshIntervalSeconds: 3600,
          nextRefreshAt: "2026-05-08T09:00:00.000Z",
          cacheMaxAgeSeconds: 60,
          sourceTables: ["ai_model_rank_snapshot"],
          rankScope: "global",
        },
        items: [
          {
            id: "openai/gpt-4o-mini",
            rank: 1,
            prevRank: 1,
            name: "GPT-4o Mini",
            vendor: "OpenAI",
            vendorCode: "openai",
            modality: "LLM",
            baseVolume: 1200,
            requests: 1200,
            tokens: 456000,
            cost: 12.34,
            currency: "USD",
            costIndicator: 2,
            latency: 120,
            color: "#10b981",
            license: "Proprietary",
          },
        ],
        history: [
          {
            date: "2026-05-08",
            index: 0,
            entries: [
              { catalogKey: "openai/gpt-4o-mini", model: "gpt-4o-mini", rank: 1, volume: 1200.5, color: "#10b981" },
            ],
          },
        ],
      };
    },
    async () => {
      await assert.rejects(
        () => RankingService.fetchModelRankings(),
        /Ranking history entry volume must be a non-negative integer/,
      );
    },
  );
});

test("ranking service rejects fractional ranking history point indexes", async () => {
  await withAppSdkFetch(
    (url) => {
      const requestUrl = new URL(url, "http://localhost");
      assert.equal(requestUrl.pathname, "/app/v3/api/ai/model_rankings");
      return {
        source: {
          sourceLabel: "Published model ranking snapshot",
          sourceDescription: "Ranking history point indexes must be integer counters.",
          observedAt: "2026-05-08T08:00:00.000Z",
          snapshotDate: "2026-05-08",
          snapshotPeriod: "daily",
          windowStart: "2026-05-01T00:00:00.000Z",
          windowEnd: "2026-05-08T00:00:00.000Z",
          generatedAt: "2026-05-08T08:00:00.000Z",
          refreshIntervalSeconds: 3600,
          nextRefreshAt: "2026-05-08T09:00:00.000Z",
          cacheMaxAgeSeconds: 60,
          sourceTables: ["ai_model_rank_snapshot"],
          rankScope: "global",
        },
        items: [
          {
            id: "openai/gpt-4o-mini",
            rank: 1,
            prevRank: 1,
            name: "GPT-4o Mini",
            vendor: "OpenAI",
            vendorCode: "openai",
            modality: "LLM",
            baseVolume: 1200,
            requests: 1200,
            tokens: 456000,
            cost: 12.34,
            currency: "USD",
            costIndicator: 2,
            latency: 120,
            color: "#10b981",
            license: "Proprietary",
          },
        ],
        history: [
          {
            date: "2026-05-08",
            index: 0.5,
            entries: [
              { catalogKey: "openai/gpt-4o-mini", model: "gpt-4o-mini", rank: 1, volume: 1200, color: "#10b981" },
            ],
          },
        ],
      };
    },
    async () => {
      await assert.rejects(
        () => RankingService.fetchModelRankings(),
        /Ranking history point index must be a non-negative integer/,
      );
    },
  );
});

test("ranking service rejects fractional ranking source refresh intervals", async () => {
  await withAppSdkFetch(
    (url) => {
      const requestUrl = new URL(url, "http://localhost");
      assert.equal(requestUrl.pathname, "/app/v3/api/ai/model_rankings");
      return {
        source: {
          sourceLabel: "Published model ranking snapshot",
          sourceDescription: "Source refresh metadata must use integer seconds.",
          observedAt: "2026-05-08T08:00:00.000Z",
          snapshotDate: "2026-05-08",
          snapshotPeriod: "daily",
          windowStart: "2026-05-01T00:00:00.000Z",
          windowEnd: "2026-05-08T00:00:00.000Z",
          generatedAt: "2026-05-08T08:00:00.000Z",
          refreshIntervalSeconds: 3600.5,
          nextRefreshAt: "2026-05-08T09:00:00.000Z",
          cacheMaxAgeSeconds: 60,
          sourceTables: ["ai_model_rank_snapshot"],
          rankScope: "global",
        },
        items: [],
        history: [],
      };
    },
    async () => {
      await assert.rejects(
        () => RankingService.fetchModelRankings(),
        /Ranking source refresh interval seconds must be a positive integer/,
      );
    },
  );
});

test("ranking view model keeps same-name models isolated by stable identity", () => {
  const openAiModel = rankingModel({
    id: "openai/shared-model",
    name: "Shared Model",
    vendor: "OpenAI",
    vendorCode: "openai",
    color: "#10b981",
  });
  const azureModel = rankingModel({
    id: "azure/eastus/shared-model",
    name: "Shared Model",
    vendor: "Azure",
    vendorCode: "azure",
    color: "#2563eb",
  });
  const openAiKey = rankingHistoryKey(openAiModel);
  const azureKey = rankingHistoryKey(azureModel);
  const history = [
    { name: "2026-05-08", rawDate: Date.parse("2026-05-08T00:00:00.000Z"), index: 0, Others: 0, [openAiKey]: 1200, [azureKey]: 400 },
  ];

  const view = deriveRankingViewModel({
    catalog: [openAiModel, azureModel],
    history,
    filters: {
      modality: "All",
      vendor: null,
      license: "All",
      searchQuery: "",
    },
    activeWeekIndex: 0,
  });

  assert.deepEqual(view.chartKeys, ["Others", azureKey, openAiKey]);
  assert.deepEqual(view.displayRankings.map((model) => [model.id, model.currentVolume]), [
    ["openai/shared-model", 1200],
    ["azure/eastus/shared-model", 400],
  ]);
  assert.deepEqual(view.panelStats.models.map((model) => [model.name, model.value, model.color]), [
    ["Shared Model", 1200, "#10b981"],
    ["Shared Model", 400, "#2563eb"],
  ]);
  assert.equal(findRankingColor(openAiKey, view.displayRankings), "#10b981");
  assert.equal(findRankingColor(azureKey, view.displayRankings), "#2563eb");
});

test("ranking view model keeps server-backed vendor filters independent from filtered ranking snapshots", () => {
  const openAiModel = rankingModel({
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    vendor: "OpenAI",
    vendorCode: "openai",
    color: "#10b981",
  });
  const openAiKey = rankingHistoryKey(openAiModel);
  const view = deriveRankingViewModel({
    catalog: [openAiModel],
    history: [
      { name: "2026-05-08", rawDate: Date.parse("2026-05-08T00:00:00.000Z"), index: 0, Others: 0, [openAiKey]: 1200 },
    ],
    filters: {
      modality: "All",
      vendor: "OpenAI",
      license: "All",
      searchQuery: "",
    },
    activeWeekIndex: 0,
    vendors: [
      { label: "Anthropic", code: "anthropic", modelCount: 3 },
      { label: "OpenAI", code: "openai", modelCount: 7 },
    ],
  });

  assert.deepEqual(view.vendorOptions, {
    vendors: ["Anthropic", "OpenAI"],
    vendorCodesByLabel: {
      Anthropic: "anthropic",
      OpenAI: "openai",
    },
    vendorModelCounts: {
      Anthropic: 3,
      OpenAI: 7,
    },
  });
  assert.deepEqual(view.displayRankings.map((model) => model.vendor), ["OpenAI"]);
});

test("ranking vendor filtering uses stable server vendor code before display label", () => {
  const openAiModel = rankingModel({
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    vendor: "OpenAI Global",
    vendorCode: "openai",
    color: "#10b981",
  });
  const openAiKey = rankingHistoryKey(openAiModel);
  const view = deriveRankingViewModel({
    catalog: [openAiModel],
    history: [
      { name: "2026-05-08", rawDate: Date.parse("2026-05-08T00:00:00.000Z"), index: 0, Others: 0, [openAiKey]: 1200 },
    ],
    filters: {
      modality: "All",
      vendor: "OpenAI",
      vendorCode: "openai",
      license: "All",
      searchQuery: "",
    },
    activeWeekIndex: 0,
    vendors: [
      { label: "OpenAI", code: "openai", modelCount: 7 },
    ],
  });

  assert.deepEqual(view.displayRankings.map((model) => model.id), ["openai/gpt-4o-mini"]);
});

test("ranking service sends page filters through the generated app SDK query contract", async () => {
  await withAppSdkFetch(
    (url) => {
      const requestUrl = new URL(url, "http://localhost");
      assert.equal(requestUrl.pathname, "/app/v3/api/ai/model_rankings");
      assert.equal(requestUrl.searchParams.get("rank_scope"), "commercial-default");
      assert.equal(requestUrl.searchParams.get("vendor_code"), "openai");
      assert.equal(requestUrl.searchParams.get("modality"), "llm");
      assert.equal(requestUrl.searchParams.get("q"), "gpt");
      assert.equal(requestUrl.searchParams.has("search_query"), false);
      assert.equal(requestUrl.searchParams.has("searchQuery"), false);
      assert.equal(requestUrl.searchParams.get("limit"), "100");
      return {
        source: {
          sourceLabel: "Published model ranking snapshot",
          sourceDescription: "Filtered published rankings.",
          observedAt: "2026-05-08T08:00:00.000Z",
          snapshotDate: "2026-05-08",
          snapshotPeriod: "daily",
          windowStart: "2026-05-01T00:00:00.000Z",
          windowEnd: "2026-05-08T00:00:00.000Z",
          generatedAt: "2026-05-08T08:00:00.000Z",
          refreshIntervalSeconds: 3600,
          nextRefreshAt: "2026-05-08T09:00:00.000Z",
          cacheMaxAgeSeconds: 60,
          sourceTables: ["ai_model_rank_snapshot"],
          rankScope: "commercial-default",
        },
        items: [
          {
            id: "openai/gpt-4o-mini",
            rank: 1,
            prevRank: 1,
            name: "gpt-4o-mini",
            vendor: "OpenAI",
            vendorCode: "openai",
            modality: "LLM",
            baseVolume: 1200,
            requests: 1200,
            tokens: 456000,
            cost: 12.34,
            currency: "USD",
            costIndicator: 2,
            latency: 120,
            color: "#10b981",
            license: "Proprietary",
          },
        ],
        history: [],
      };
    },
    async (captured) => {
      const snapshot = await RankingService.fetchModelRankings({
        rankScope: "commercial-default",
        vendorCode: "openai",
        modality: "llm",
        searchQuery: "gpt",
        limit: 100,
      });

      assert.deepEqual(captured.map((request) => `${request.method} ${request.url}`), [
        "GET /app/v3/api/ai/model_rankings?rank_scope=commercial-default&vendor_code=openai&modality=llm&q=gpt&limit=100",
      ]);
      assert.equal(snapshot.catalog[0].vendorCode, "openai");
      assert.deepEqual(snapshot.history, []);
    },
  );
});

test("ranking history is deterministic and anchored to the published snapshot date", () => {
  const first = createRankingHistory(TEST_RANKING_CATALOG);
  const second = createRankingHistory(TEST_RANKING_CATALOG);

  assert.equal(first.length, 40);
  assert.deepEqual(first, second);
  assert.equal(first[0].name, "2025-08-07");
  assert.equal(first.at(-1)?.name, "2026-05-07");
  assert.equal(first[0].rawDate, Date.parse("2025-08-07T00:00:00.000Z"));
  assert.equal(first.at(-1)?.rawDate, Date.parse("2026-05-07T00:00:00.000Z"));
});

test("ranking filters are pure whitespace tolerant and immutable", () => {
  const catalog = [
    rankingModel({ id: "1", name: "gpt-4o", vendor: "OpenAI", modality: "LLM", license: "Proprietary" }),
    rankingModel({ id: "2", name: "llama-3", vendor: "Meta", modality: "LLM", license: "Open Source" }),
    rankingModel({ id: "3", name: "dall-e", vendor: "OpenAI", modality: "Image", license: "Proprietary" }),
  ];

  const filtered = filterRankingsForCatalog(catalog, {
    modality: "LLM",
    vendor: "  Meta  ",
    license: "Open Source",
    searchQuery: "  LLAMA ",
  });

  assert.deepEqual(filtered.map((model) => model.id), ["2"]);
  assert.notEqual(filtered, catalog);
  assert.deepEqual(catalog.map((model) => model.id), ["1", "2", "3"]);
});

test("ranking view model derives vendors counts charts panels and dynamic stats", () => {
  const catalog = [
    rankingModel({ id: "1", name: "alpha", vendor: "ProviderA", modality: "LLM", baseVolume: 1000, latency: 100, color: "#111111", license: "Open Source" }),
    rankingModel({ id: "2", name: "beta", vendor: "ProviderB", modality: "Image", baseVolume: 2000, latency: 300, color: "#222222", license: "Proprietary" }),
  ];
  const alphaKey = rankingHistoryKey(catalog[0]);
  const betaKey = rankingHistoryKey(catalog[1]);
  const history = [
    { name: "2026-04-26", rawDate: 1777161600000, index: 0, [alphaKey]: 100, [betaKey]: 20, Others: 5 },
    { name: "2026-05-03", rawDate: 1777766400000, index: 1, [alphaKey]: 150, [betaKey]: 240, Others: 10 },
  ];

  const view = deriveRankingViewModel({
    catalog,
    history,
    filters: {
      modality: "All",
      vendor: null,
      license: "All",
      searchQuery: "",
    },
    activeWeekIndex: 1,
  });

  assert.deepEqual(view.vendorOptions, {
    vendors: ["ProviderA", "ProviderB"],
    vendorCodesByLabel: {
      ProviderA: "provider_a",
      ProviderB: "provider_b",
    },
    vendorModelCounts: {
      ProviderA: 1,
      ProviderB: 1,
    },
  });
  assert.deepEqual(view.modalityCounts, {
    All: 2,
    LLM: 1,
    Image: 1,
    Audio: 0,
    Video: 0,
    Music: 0,
    Embedding: 0,
    Rerank: 0,
  });
  assert.deepEqual(view.chartKeys, ["Others", betaKey, alphaKey]);
  assert.deepEqual(view.displayRankings.map((model) => ({
    id: model.id,
    currentVolume: model.currentVolume,
    displayRank: model.displayRank,
    calculatedPrevRank: model.calculatedPrevRank,
  })), [
    { id: "2", currentVolume: 240, displayRank: 1, calculatedPrevRank: 2 },
    { id: "1", currentVolume: 150, displayRank: 2, calculatedPrevRank: 1 },
  ]);
  assert.equal(view.panelStats.date, "2026-05-03");
  assert.equal(view.panelStats.total, 400);
  assert.deepEqual(view.panelStats.models.map((model) => model.name), ["beta", "alpha", "Others"]);
  assert.equal(view.dynamicStats.totalVol, 390);
  assert.equal(view.dynamicStats.ossShare, 38);
  assert.equal(view.dynamicStats.avgLatency, 223);
  assert.equal(view.dynamicStats.trendingName, "beta");
  assert.equal(view.dynamicStats.trendingRankDisplay, "#1 Overall");
});

test("ranking helper functions handle empty and boundary states safely", () => {
  const catalog = [rankingModel({ id: "1", name: "alpha", vendor: "ProviderA" })];
  const history = createRankingHistory(catalog, { weeks: 2, anchorDate: "2026-05-03" });
  const filtered = filterRankingsForCatalog(catalog, {
    modality: "Music",
    vendor: null,
    license: "All",
    searchQuery: "",
  });
  const chartData = deriveRankingChartData(history, filtered);
  const displayRankings = deriveRankingViewModel({
    catalog,
    history,
    filters: {
      modality: "Music",
      vendor: null,
      license: "All",
      searchQuery: "",
    },
    activeWeekIndex: 99,
  }).displayRankings;

  assert.equal(resolveActiveRankingWeekIndex({ hoveredWeekIndex: 99, selectedWeekIndex: null, historyLength: 2 }), 1);
  assert.equal(resolveActiveRankingWeekIndex({ hoveredWeekIndex: -1, selectedWeekIndex: 0, historyLength: 2 }), 0);
  assert.deepEqual(filtered, []);
  assert.deepEqual(deriveRankingChartKeys(filtered), ["Others"]);
  assert.deepEqual(deriveRankingPanelStats(chartData, filtered, 1), {
    date: "2026-05-03",
    total: chartData[1].total,
    models: [{ name: "Others", value: chartData[1].Others, color: "#334155", isOthers: true }],
  });
  assert.deepEqual(
    deriveRankingDynamicStats({
      filteredRankings: filtered,
      activeWeekData: chartData[1],
      activeWeekIndex: 1,
      history: chartData,
      displayRankings,
    }),
    {
      totalVol: 0,
      ossShare: 0,
      avgLatency: 0,
      trendingName: "N/A",
      trendingRankDisplay: "-",
    },
  );
  assert.deepEqual(deriveVendorOptionsForRankings([]), { vendors: [], vendorCodesByLabel: {}, vendorModelCounts: {} });
  assert.equal(findRankingColor("missing", []), "#94a3b8");
  assert.equal(findRankingColor("Others", []), "#334155");
  assert.equal(formatRankingVolume(1_200_000_000_000), "1.20T");
  assert.equal(formatRankingVolume(1_200_000_000), "1.2B");
  assert.equal(formatRankingVolume(12_000), "12.0K");
});

const TEST_RANKING_CATALOG: RankingModel[] = [
  rankingModel({ id: "gpt-5.5", rank: 1, name: "gpt-5.5", vendor: "OpenAI" }),
  rankingModel({ id: "gpt-image-2", rank: 2, name: "gpt-image-2", vendor: "OpenAI", modality: "Image" }),
];

function rankingModel(overrides: Partial<RankingModel> = {}): RankingModel {
  return {
    id: "test",
    rank: 1,
    prevRank: 1,
    name: "test-model",
    vendor: "Test Vendor",
    vendorCode: vendorCodeFromLabel(overrides.vendor ?? "Test Vendor"),
    modality: "LLM",
    baseVolume: 1000,
    requests: 1000,
    tokens: 100000,
    cost: 1,
    currency: "USD",
    costIndicator: 1,
    latency: 100,
    color: "#000000",
    license: "Proprietary",
    ...overrides,
  };
}

function vendorCodeFromLabel(label: string): string {
  return label
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
