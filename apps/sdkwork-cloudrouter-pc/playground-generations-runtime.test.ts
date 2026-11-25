import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchPlaygroundGenerationHistoryFromService,
  runPlaygroundAssetGeneration,
} from "./packages/sdkwork-cloudrouter-pc-playground/src/playgroundGenerationsService.ts";
import type { SdkworkGenerationCommandInput } from "@sdkwork/generations-pc-workspace/generation-service";
import type { GenerationAgentRunCreateInput } from "./packages/sdkwork-cloudrouter-pc-playground/src/playgroundTypes.ts";

function createAssetGenerationService(resultOverrides: Record<string, unknown> = {}) {
  const commands: SdkworkGenerationCommandInput[] = [];
  return {
    commands,
    service: {
      async createGenerationCommand(input: SdkworkGenerationCommandInput) {
        commands.push(input);
        return {
          generation: {
            id: `generation-${commands.length}`,
            latencyMs: 0,
            model: input.model ?? "sdkwork-generations",
            promptPreview: input.prompt,
            status: "completed",
            title: input.operationType,
            tokensUsed: 0,
            updatedAt: "2026-06-07T00:00:00.000Z",
          },
          record: {
            id: `generation-${commands.length}`,
            modality: input.modality,
            operationType: input.operationType,
            promptPreview: input.prompt,
            status: "succeeded",
            updatedAt: "2026-06-07T00:00:00.000Z",
            createdAt: "2026-06-07T00:00:00.000Z",
          },
        };
      },
      async listGenerationResults() {
        return {
          items: [
            {
              id: "result-1",
              generationId: "generation-1",
              resultType: typeof resultOverrides.resultType === "string" ? resultOverrides.resultType : "audio",
              previewText: "Generated asset",
              resourceSnapshot: {
                kind: "audio",
                publicUrl: "https://cdn.example/generated.mp3",
                source: "generated",
                url: "https://cdn.example/generated.mp3",
                durationMs: 4300,
                ...resultOverrides,
              },
              createdAt: "2026-06-07T00:00:00.000Z",
            },
          ],
        };
      },
    },
  };
}

test("playground asset generation maps image text and reference submissions to sdkwork-generations image commands", async () => {
  const textOnly = await runAssetGeneration({
    prompt: "Create image",
    targetType: "image",
  }, {
    resultType: "image",
    kind: "image",
    publicUrl: "https://cdn.example/generated.png",
    url: "https://cdn.example/generated.png",
  });

  assert.equal(textOnly.commands[0]?.modality, "image");
  assert.equal(textOnly.commands[0]?.operationType, "text_to_image");
  assert.equal(textOnly.commands[0]?.parameters?.targetType, "image");
  assert.equal(textOnly.result.item.type, "images");
  assert.equal(textOnly.result.item.images?.[0]?.url, "https://cdn.example/generated.png");

  const referenceImageResource = {
    id: "reference-image-id",
    kind: "image",
    publicUrl: "https://cdn.example/reference.png",
    source: "external_url",
    url: "https://cdn.example/reference.png",
  } as const;
  const withReference = await runAssetGeneration({
    prompt: "Edit image",
    targetType: "image",
    generationConfig: {
      aspectRatio: "1:1",
      imageCount: 2,
      imageMode: {
        aspectRatio: "1:1",
        count: 2,
        quality: "2k",
      },
      quality: "high",
    },
    referenceImages: [
      {
        name: "reference.png",
        mimeType: "image/png",
        resource: referenceImageResource,
        sizeBytes: 1024,
      },
    ],
  }, {
    resultType: "image",
    kind: "image",
    publicUrl: "https://cdn.example/edited.png",
    url: "https://cdn.example/edited.png",
  });

  const command = withReference.commands[0];
  assert.equal(command?.operationType, "image_edit");
  assert.deepEqual(command?.inputAssetIds, ["reference-image-id"]);
  assert.deepEqual(command?.parameters?.generationConfig, {
    aspectRatio: "1:1",
    imageCount: 2,
    imageMode: {
      aspectRatio: "1:1",
      count: 2,
      quality: "2k",
    },
    quality: "high",
  });
  assert.deepEqual(command?.parameters?.referenceImages, [
    {
      assetId: "reference-image-id",
      mimeType: "image/png",
      name: "reference.png",
      resource: referenceImageResource,
      sizeBytes: 1024,
      url: "https://cdn.example/reference.png",
    },
  ]);
});

test("playground asset generation maps image reference modes to sdkwork-generations image commands", async () => {
  const textMode = await runAssetGeneration({
    prompt: "Create image",
    targetType: "image",
    referenceMode: "text_to_image",
  });
  assert.equal(textMode.commands[0]?.operationType, "text_to_image");
  assert.equal(textMode.commands[0]?.parameters?.referenceMode, "text_to_image");

  const imageToImage = await runAssetGeneration({
    prompt: "Restyle image",
    targetType: "image",
    referenceMode: "image_to_image",
    referenceImages: [
      {
        name: "reference.png",
        mimeType: "image/png",
        resource: {
          id: "reference-image-id",
          kind: "image",
          publicUrl: "https://cdn.example/reference.png",
          source: "external_url",
          url: "https://cdn.example/reference.png",
        },
        sizeBytes: 1024,
      },
    ],
  });
  assert.equal(imageToImage.commands[0]?.operationType, "image_edit");
  assert.equal(imageToImage.commands[0]?.parameters?.referenceMode, "image_to_image");

  const multiReference = await runAssetGeneration({
    prompt: "Keep subject consistent",
    targetType: "image",
    referenceMode: "multi_reference",
    referenceImages: [
      {
        name: "reference-a.png",
        mimeType: "image/png",
        resource: {
          id: "reference-a",
          kind: "image",
          publicUrl: "https://cdn.example/a.png",
          source: "external_url",
          url: "https://cdn.example/a.png",
        },
      },
      {
        name: "reference-b.png",
        mimeType: "image/png",
        resource: {
          id: "reference-b",
          kind: "image",
          publicUrl: "https://cdn.example/b.png",
          source: "external_url",
          url: "https://cdn.example/b.png",
        },
      },
    ],
  });
  assert.equal(multiReference.commands[0]?.operationType, "image_edit");
  assert.equal(multiReference.commands[0]?.parameters?.referenceMode, "multi_reference");
});

test("playground asset generation maps every video reference mode to sdkwork-generations video commands", async () => {
  const textOnly = await runAssetGeneration({
    prompt: "Create video",
    targetType: "video",
    generationConfig: {
      aspectRatio: "16:9",
      durationSeconds: 5,
      imageCount: 1,
      quality: "standard",
      resolution: "1080p",
      syncAudioVideo: true,
      videoMode: {
        aspectRatio: "16:9",
        count: 1,
        duration: 5,
        resolution: "1080p",
        syncAudioVideo: true,
      },
    },
    referenceMode: "text_to_video",
  }, {
    resultType: "video",
    kind: "video",
    publicUrl: "https://cdn.example/generated.mp4",
    url: "https://cdn.example/generated.mp4",
    durationSeconds: 5,
  });

  assert.equal(textOnly.commands[0]?.operationType, "text_to_video");
  assert.equal(textOnly.result.item.type, "video");
  assert.equal(textOnly.result.item.videos?.[0]?.url, "https://cdn.example/generated.mp4");

  const referenceAssetResource = {
    kind: "video",
    publicUrl: "https://cdn.example/source.mp4",
    source: "external_url",
    uri: "drive://space/source-video",
    url: "https://cdn.example/source.mp4",
  } as const;
  for (const referenceMode of ["first_frame", "first_last_frame", "multi_reference", "omni_reference"] as const) {
    const { commands } = await runAssetGeneration({
      prompt: "Create referenced video",
      targetType: "video",
      referenceMode,
      referenceAssets: [
        {
          kind: "video",
          role: "reference_video",
          name: "source.mp4",
          mimeType: "video/mp4",
          resource: referenceAssetResource,
          sizeBytes: 2048,
        },
      ],
    }, {
      resultType: "video",
      kind: "video",
      publicUrl: "https://cdn.example/generated.mp4",
      url: "https://cdn.example/generated.mp4",
    });

    assert.equal(commands[0]?.modality, "video");
    assert.equal(commands[0]?.operationType, "image_to_video");
    assert.equal(commands[0]?.parameters?.referenceMode, referenceMode);
    assert.deepEqual(commands[0]?.inputAssetIds, ["drive://space/source-video"]);
    assert.deepEqual(commands[0]?.parameters?.referenceAssets, [
      {
        assetId: "drive://space/source-video",
        kind: "video",
        mimeType: "video/mp4",
        name: "source.mp4",
        resource: referenceAssetResource,
        role: "reference_video",
        sizeBytes: 2048,
        url: "https://cdn.example/source.mp4",
      },
    ]);
  }
});

test("playground reference modes reach the vendor adapter surface as parameters.generationMode", async () => {
  // The composer names video modes by intent; the generations provider adapter
  // switches on vendor surfaces. Without the translation every referenced
  // video submit fell through to the operation-type default and silently lost
  // its tail frame or its extra references.
  const expectedGenerationMode: Record<string, string> = {
    first_frame: "image_to_video",
    first_last_frame: "start_end_frame",
    multi_reference: "reference_to_video",
    omni_reference: "reference_to_video",
  };
  const frameResource = (url: string) => ({
    kind: "image",
    publicUrl: url,
    source: "external_url",
    url,
  }) as const;

  for (const [referenceMode, generationMode] of Object.entries(expectedGenerationMode)) {
    const { commands } = await runAssetGeneration({
      prompt: "Create referenced video",
      targetType: "video",
      referenceMode: referenceMode as never,
      referenceAssets: [
        { kind: "image", role: "first_frame", name: "first.png", resource: frameResource("https://cdn.example/first.png") },
        { kind: "image", role: "last_frame", name: "last.png", resource: frameResource("https://cdn.example/last.png") },
      ],
    }, {
      resultType: "video",
      kind: "video",
      publicUrl: "https://cdn.example/generated.mp4",
      url: "https://cdn.example/generated.mp4",
    });

    assert.equal(commands[0]?.parameters?.generationMode, generationMode, `${referenceMode} must resolve to ${generationMode}`);
    // The routed operation stays inside the app-API enum the generations SDK
    // maps onto a command endpoint.
    assert.equal(commands[0]?.operationType, "image_to_video");
    assert.deepEqual(commands[0]?.parameters?.referenceAssets, [
      {
        kind: "image",
        name: "first.png",
        resource: frameResource("https://cdn.example/first.png"),
        role: "first_frame",
        url: "https://cdn.example/first.png",
      },
      {
        kind: "image",
        name: "last.png",
        resource: frameResource("https://cdn.example/last.png"),
        role: "last_frame",
        url: "https://cdn.example/last.png",
      },
    ]);
  }

  // A plain text-to-video submit carries no generation mode at all.
  const textOnly = await runAssetGeneration({
    prompt: "Create video",
    targetType: "video",
    referenceMode: "text_to_video",
  }, {
    resultType: "video",
    kind: "video",
    publicUrl: "https://cdn.example/generated.mp4",
    url: "https://cdn.example/generated.mp4",
  });
  assert.equal(textOnly.commands[0]?.parameters?.generationMode, undefined);
  assert.equal(textOnly.commands[0]?.operationType, "text_to_video");
});

test("playground commands carry the selected catalog vendor code so non-default vendors are reached", async () => {
  // The generations provider adapter resolves the vendor from
  // `parameters.vendor` before the modality default; a bare catalog model id
  // without it was dispatched to the default vendor.
  const cases: Array<[string, string, string]> = [
    ["kuaishou", "kling-v3", "kuaishou"],
    ["bytedance", "doubao-seedance-2-0", "bytedance"],
    ["vidu", "viduq3-pro", "vidu"],
    ["google", "veo-3.1-generate-preview", "google"],
    ["openai", "sora-2", "openai"],
  ];
  for (const [vendorCode, model, expectedVendor] of cases) {
    const { commands } = await runAssetGeneration({
      prompt: "Create video",
      targetType: "video",
      selectedModel: model,
      selectedVendorCode: vendorCode,
    }, {
      resultType: "video",
      kind: "video",
      publicUrl: "https://cdn.example/generated.mp4",
      url: "https://cdn.example/generated.mp4",
    });
    assert.equal(commands[0]?.parameters?.vendor, expectedVendor);
    assert.equal(commands[0]?.model, model, "the wire model stays the bare catalog model id");
  }

  // A `vendor/model` catalog key also resolves the vendor.
  const { commands } = await runAssetGeneration({
    prompt: "Create image",
    targetType: "image",
    selectedModel: "kuaishou/kling-image-v1",
  }, {
    resultType: "image",
    kind: "image",
    publicUrl: "https://cdn.example/generated.png",
    url: "https://cdn.example/generated.png",
  });
  assert.equal(commands[0]?.parameters?.vendor, "kuaishou");
  assert.equal(commands[0]?.model, "kuaishou/kling-image-v1");
});

test("playground asset generation passes music speech and sound effect configuration to sdkwork-generations", async () => {
  const cases = [
    [
      "music",
      "text_to_music",
      {
        durationSeconds: 60,
        aspectRatio: "16:9",
        imageCount: 1,
        quality: "standard",
      },
    ],
    [
      "audio",
      "speech",
      {
        durationSeconds: 8,
        aspectRatio: "16:9",
        imageCount: 1,
        quality: "standard",
        responseFormat: "wav",
        speed: 1.25,
        speechMode: {
          responseFormat: "wav",
          speed: 1.25,
          voice: "nova",
        },
        voice: "nova",
      },
    ],
    [
      "sfx",
      "sound_effect",
      {
        durationSeconds: 15,
        aspectRatio: "16:9",
        imageCount: 1,
        loop: true,
        promptInfluence: 0.75,
        quality: "standard",
        responseFormat: "mp3",
        sfxMode: {
          loop: true,
          promptInfluence: 0.75,
          responseFormat: "mp3",
        },
      },
    ],
  ] as const;

  for (const [targetType, operationType, generationConfig] of cases) {
    const { commands, result } = await runAssetGeneration({
      prompt: "Create media",
      targetType,
      generationConfig,
      selectedModel: `${targetType}-model`,
    });

    assert.equal(commands[0]?.modality, targetType);
    assert.equal(commands[0]?.operationType, operationType);
    assert.equal(commands[0]?.model, `${targetType}-model`);
    assert.deepEqual(commands[0]?.parameters?.generationConfig, generationConfig);
    assert.equal(commands[0]?.parameters?.targetType, targetType);
    assert.equal(result.targetType, targetType);
    assert.equal(result.status, "completed");
  }
});

test("playground asset generation emits mapped result artifacts and usage from sdkwork-generations results", async () => {
  const { artifacts, result } = await runAssetGeneration({
    prompt: "Create audio",
    targetType: "audio",
  }, {
    resultType: "sound_effect",
    contentType: "audio/wav",
    publicUrl: "https://cdn.example/generated.wav",
    url: "https://cdn.example/generated.wav",
    durationMs: 4300,
  });

  const artifactView = artifacts as unknown as Array<{ modality?: string; asset?: { kind: string; url: string; mimeType: string; durationSeconds: number } }>;
  assert.equal(artifacts.length, 1);
  assert.equal(artifactView[0]?.modality, "audio");
  assert.equal(artifactView[0]?.asset?.kind, "audio");
  assert.equal(artifactView[0]?.asset?.url, "https://cdn.example/generated.wav");
  assert.equal(artifactView[0]?.asset.mimeType, "audio/wav");
  assert.equal(artifactView[0]?.asset.durationSeconds, 4.3);
  assert.equal(result.item.asset?.url, "https://cdn.example/generated.wav");
  assert.equal(result.usage.imageCount, 0);
  assert.equal(result.usage.videoSeconds, "0");
  assert.equal(result.steps.length, 2);
});

test("a queued vendor command is polled to completion before results are read", async () => {
  const polled: string[] = [];
  const slept: number[] = [];
  const statuses = ["running", "succeeded"];
  const service = {
    async createGenerationCommand(input: SdkworkGenerationCommandInput) {
      return {
        generation: { id: "generation-async", latencyMs: 0, model: "kling", promptPreview: input.prompt, status: "pending", title: input.operationType, tokensUsed: 0, updatedAt: "2026-06-07T00:00:00.000Z" },
        record: { id: "generation-async", modality: "video", operationType: input.operationType, promptPreview: input.prompt, status: "queued", updatedAt: "2026-06-07T00:00:00.000Z", createdAt: "2026-06-07T00:00:00.000Z" },
      };
    },
    async getGeneration(id: string) {
      polled.push(id);
      const status = statuses.shift() ?? "succeeded";
      return { id, modality: "video", operationType: "text_to_video", promptPreview: "p", status, updatedAt: "2026-06-07T00:00:01.000Z", createdAt: "2026-06-07T00:00:00.000Z" };
    },
    async listGenerationResults() {
      return {
        items: [{
          id: "result-async",
          generationId: "generation-async",
          resultType: "video",
          assetId: "asset-async",
          resourceSnapshot: { kind: "video", publicUrl: "https://cdn.example/async.mp4", source: "generated", url: "https://cdn.example/async.mp4", durationSeconds: 5 },
          createdAt: "2026-06-07T00:00:01.000Z",
        }],
      };
    },
  };

  const { result } = await runAssetGeneration({ prompt: "Create video", targetType: "video" }, {}, service, {
    intervalMs: 10,
    maxAttempts: 5,
    sleep: async (ms) => { slept.push(ms); },
  });

  assert.deepEqual(polled, ["generation-async", "generation-async"], "queued then running each poll once");
  assert.deepEqual(slept, [10, 10]);
  assert.equal(result.status, "completed");
  assert.equal(result.item.videos?.[0]?.url, "https://cdn.example/async.mp4");
  assert.deepEqual(result.item.results, [{ resultId: "result-async", assetId: "asset-async" }], "the catalog identity rides along on the item");
});

function queuedCommandService(id: string, model: string) {
  return {
    async createGenerationCommand(input: SdkworkGenerationCommandInput) {
      return {
        generation: { id, latencyMs: 0, model, promptPreview: input.prompt, status: "pending", title: input.operationType, tokensUsed: 0, updatedAt: "2026-06-07T00:00:00.000Z" },
        record: { id, modality: "video", operationType: input.operationType, promptPreview: input.prompt, status: "queued", updatedAt: "2026-06-07T00:00:00.000Z", createdAt: "2026-06-07T00:00:00.000Z" },
      };
    },
    async listGenerationResults() {
      return { items: [] };
    },
  };
}

function recordFor(id: string, status: string) {
  return { id, modality: "video", operationType: "text_to_video", promptPreview: "p", status, updatedAt: "2026-06-07T00:00:01.000Z", createdAt: "2026-06-07T00:00:00.000Z" };
}

test("polling can be disabled and a non-terminal deadline is reported as pending", async () => {
  const fireAndForget = queuedCommandService("generation-ff", "kling");
  const { result } = await runAssetGeneration({ prompt: "Create video", targetType: "video" }, {}, fireAndForget, { maxAttempts: 0 });

  assert.equal(result.status, "pending");
  assert.equal(result.item.outputText, "Generation accepted.");
  assert.deepEqual(result.item.results, []);

  let polls = 0;
  const deadline = {
    ...queuedCommandService("generation-deadline", "kling"),
    async getGeneration(id: string) {
      polls += 1;
      return recordFor(id, "running");
    },
  };
  const deadlineResult = await runAssetGeneration({ prompt: "Create video", targetType: "video" }, {}, deadline, { maxAttempts: 3, sleep: async () => undefined });
  assert.equal(polls, 3, "the deadline bounds the polling");
  assert.equal(deadlineResult.result.status, "processing", "a running record at the deadline stays non-terminal");
});

test("a failed poll keeps the last known record and polling continues", async () => {
  let calls = 0;
  const media = createAssetGenerationService({ resultType: "video", kind: "video", publicUrl: "https://cdn.example/v.mp4", url: "https://cdn.example/v.mp4" }).service;
  const flaky = {
    ...media,
    createGenerationCommand: queuedCommandService("generation-flaky", "vidu").createGenerationCommand,
    async getGeneration(id: string) {
      calls += 1;
      if (calls === 1) {
        throw new Error("network blip");
      }
      return recordFor(id, "succeeded");
    },
  };
  const { result } = await runAssetGeneration({ prompt: "Create video", targetType: "video" }, {}, flaky, { maxAttempts: 5, sleep: async () => undefined });
  assert.equal(calls, 2);
  assert.equal(result.status, "completed");
  assert.equal(result.item.videos?.[0]?.url, "https://cdn.example/v.mp4");
});

test("restored history resolves completed asset runs with media and asset catalog state", async () => {
  const runs = [
    { id: "gen-done", modality: "image", operationType: "text_to_image", promptPreview: "一只猫", status: "succeeded", createdAt: "2026-06-07T00:00:00.000Z", updatedAt: "2026-06-07T00:00:01.000Z" },
    { id: "gen-text", modality: "text", operationType: "text_generate", promptPreview: "写一首诗", status: "succeeded", createdAt: "2026-06-07T00:00:00.000Z", updatedAt: "2026-06-07T00:00:01.000Z" },
    { id: "gen-running", modality: "video", operationType: "text_to_video", promptPreview: "一段视频", status: "running", createdAt: "2026-06-07T00:00:00.000Z", updatedAt: "2026-06-07T00:00:01.000Z" },
  ];
  const listed: string[] = [];
  const service = {
    async getWorkspace() {
      return { runs };
    },
    async listGenerationResults({ generationId }: { generationId: string }) {
      listed.push(generationId);
      if (generationId === "gen-done") {
        return {
          items: [{
            id: "res-done",
            generationId,
            resultType: "image",
            assetId: "asset-done",
            resourceSnapshot: { kind: "image", publicUrl: "https://cdn.example/cat.png", source: "generated", url: "https://cdn.example/cat.png" },
            createdAt: "2026-06-07T00:00:01.000Z",
          }],
        };
      }
      throw new Error("offline");
    },
  };

  const items = await fetchPlaygroundGenerationHistoryFromService(service as never);

  assert.deepEqual(listed, ["gen-done"], "only completed asset runs resolve results");
  assert.equal(items.length, 3);
  assert.equal(items[0]?.type, "images");
  assert.equal(items[0]?.images?.[0]?.url, "https://cdn.example/cat.png");
  assert.deepEqual(items[0]?.results, [{ resultId: "res-done", assetId: "asset-done" }]);
  assert.equal(items[1]?.type, "text");
  assert.equal(items[1]?.results, undefined);
  assert.equal(items[2]?.type, "video");
  assert.equal(items[2]?.results, undefined, "a pending run keeps no catalog state yet");
});

async function runAssetGeneration(
  input: GenerationAgentRunCreateInput,
  resultOverrides: Record<string, unknown> = {},
  service = createAssetGenerationService(resultOverrides).service,
  poll: { intervalMs?: number; maxAttempts?: number; sleep?: (ms: number) => Promise<void> } = {},
) {
  const commands: SdkworkGenerationCommandInput[] = [];
  const original = service.createGenerationCommand.bind(service);
  service.createGenerationCommand = async (command: SdkworkGenerationCommandInput) => {
    commands.push(command);
    return original(command);
  };
  const artifacts: unknown[] = [];
  const result = await runPlaygroundAssetGeneration({
    ...input,
    onArtifact: (artifact) => artifacts.push(artifact),
  }, service as never, poll);

  return {
    artifacts: artifacts as Awaited<ReturnType<typeof runPlaygroundAssetGeneration>>["item"]["asset"][],
    commands,
    result,
  };
}
