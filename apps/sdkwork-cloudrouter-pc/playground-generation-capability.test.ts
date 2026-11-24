/**
 * Playground generation parameter-alignment regression suite.
 *
 * Covers the two seams that broke the end-to-end flow:
 *   1. the composer offering durations/aspect ratios the vendor rejects, and
 *   2. restored generation history losing its modality and rendering as text.
 *
 * Runs with `node --import tsx --test` (no browser, no network).
 */
import assert from "node:assert/strict";
import test from "node:test";

import { fetchPlaygroundGenerationHistoryFromService } from "./packages/sdkwork-cloudrouter-pc-playground/src/playgroundGenerationsService.ts";
import {
  resolveVideoAspectRatioOptions,
  resolveVideoDurationCapability,
  resolveVideoDurationOptions,
  snapVideoAspectRatio,
  snapVideoDuration,
} from "../../../sdkwork-video/apps/sdkwork-video-pc/packages/sdkwork-video-pc-generation/src/video-generation-capability.ts";

function videoModel(vendorCode: string, model: string, displayName: string) {
  return {
    id: `${vendorCode}/${model}`,
    catalogKey: `${vendorCode}/${model}`,
    model,
    displayName,
    vendorCode,
    vendorName: vendorCode,
    modalities: ["video"],
    outputModalities: ["video"],
    capabilities: ["text_to_video"],
  } as never;
}

// ---------------------------------------------------------------------------
// Video duration: the composer may only offer what the dispatch layer accepts.
// ---------------------------------------------------------------------------

test("an OpenAI video model offers its documented discrete durations", () => {
  const sora = videoModel("openai", "sora-2", "Sora 2");
  assert.deepEqual(resolveVideoDurationCapability(sora).discrete, [4, 8, 12]);
  assert.deepEqual(resolveVideoDurationOptions(sora), [4, 8, 12]);
});

test("the default composer duration snaps to a value OpenAI accepts", () => {
  const sora = videoModel("openai", "sora-2", "Sora 2");
  assert.equal(snapVideoDuration(5, resolveVideoDurationCapability(sora)), 4);
  assert.equal(snapVideoDuration(10, resolveVideoDurationCapability(sora)), 8);
  assert.equal(snapVideoDuration(12, resolveVideoDurationCapability(sora)), 12);
});

test("a Veo 3 model offers 4/6/8 seconds", () => {
  const veo = videoModel("google", "veo-3.1-generate-preview", "Veo 3.1");
  assert.deepEqual(resolveVideoDurationCapability(veo).discrete, [4, 6, 8]);
  assert.equal(snapVideoDuration(5, resolveVideoDurationCapability(veo)), 4);
});

test("a range vendor keeps its documented bounds and its default duration", () => {
  const kling = videoModel("kuaishou", "kling-v3", "Kling V3");
  const capability = resolveVideoDurationCapability(kling);
  assert.deepEqual(capability.discrete, []);
  assert.equal(capability.min, 3);
  assert.equal(capability.max, 15);
  assert.equal(snapVideoDuration(5, capability), 5);
  assert.equal(snapVideoDuration(30, capability), 15);
  assert.equal(resolveVideoDurationOptions(kling).at(-1), 15);
});

test("a bytedance model keeps its own 2-30s window", () => {
  const seedance = videoModel("bytedance", "doubao-seedance-2-5-260623", "Seedance");
  const capability = resolveVideoDurationCapability(seedance);
  assert.deepEqual(capability.discrete, []);
  assert.equal(capability.min, 2);
  assert.equal(capability.max, 30);
  assert.equal(snapVideoDuration(31, capability), 30);
});

test("an unknown model falls back to the 3-15s composer default", () => {
  const capability = resolveVideoDurationCapability(videoModel("acme", "mystery", "Mystery"));
  assert.deepEqual(capability.discrete, []);
  assert.equal(capability.min, 3);
  assert.equal(capability.max, 15);
  assert.deepEqual(resolveVideoDurationOptions(null), [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
});

// ---------------------------------------------------------------------------
// Video aspect ratio: OpenAI and Veo 3 reject 1:1.
// ---------------------------------------------------------------------------

test("OpenAI video models only offer 16:9 and 9:16", () => {
  const sora = videoModel("openai", "sora-2", "Sora 2");
  assert.deepEqual(resolveVideoAspectRatioOptions(sora), ["16:9", "9:16"]);
  assert.equal(snapVideoAspectRatio("1:1", resolveVideoAspectRatioOptions(sora)), "16:9");
  assert.equal(snapVideoAspectRatio("9:16", resolveVideoAspectRatioOptions(sora)), "9:16");
});

test("Kling keeps the full composer ratio set including 1:1", () => {
  const kling = videoModel("kuaishou", "kling-v3", "Kling V3");
  assert.deepEqual(resolveVideoAspectRatioOptions(kling), ["16:9", "1:1", "9:16"]);
  assert.equal(snapVideoAspectRatio("1:1", resolveVideoAspectRatioOptions(kling)), "1:1");
});

// ---------------------------------------------------------------------------
// Restored history keeps the modality so the list renders the right preview.
// ---------------------------------------------------------------------------

function historyService(runs: Array<Record<string, unknown>>) {
  return {
    async getWorkspace() {
      return {
        digest: {
          completedRuns: runs.length,
          failedRuns: 0,
          runningRuns: 0,
          totalRuns: runs.length,
          totalTokensUsed: 0,
        },
        isAuthenticated: true,
        runs: runs.map((run, index) => ({
          id: `run-${index}`,
          latencyMs: 0,
          model: "openai",
          promptPreview: `prompt ${index}`,
          status: "completed",
          title: `prompt ${index}`,
          tokensUsed: 0,
          updatedAt: "2026-11-25T00:00:00.000Z",
          ...run,
        })),
      };
    },
  } as never;
}

test("a restored image run is rendered as an image history item", async () => {
  const items = await fetchPlaygroundGenerationHistoryFromService(
    historyService([{ modality: "image" }]) as never,
  );
  assert.equal(items[0]?.type, "images");
});

test("video, music and audio runs keep their own preview kind", async () => {
  const items = await fetchPlaygroundGenerationHistoryFromService(
    historyService([{ modality: "video" }, { modality: "music" }, { modality: "audio" }]) as never,
  );
  assert.deepEqual(
    items.map((item) => item.type),
    ["video", "music", "audio"],
  );
});

test("a run without a modality still renders as text", async () => {
  const items = await fetchPlaygroundGenerationHistoryFromService(
    historyService([{}]) as never,
  );
  assert.equal(items[0]?.type, "text");
});
