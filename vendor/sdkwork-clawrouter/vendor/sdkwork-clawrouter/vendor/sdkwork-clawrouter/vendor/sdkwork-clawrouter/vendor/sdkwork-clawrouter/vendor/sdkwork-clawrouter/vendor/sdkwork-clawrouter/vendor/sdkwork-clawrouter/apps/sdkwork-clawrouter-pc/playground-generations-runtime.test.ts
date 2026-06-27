import assert from "node:assert/strict";
import test from "node:test";
import { runPlaygroundAssetGeneration } from "./packages/sdkwork-clawrouter-pc-playground/src/playgroundGenerationsService.ts";
import type { SdkworkGenerationCommandInput } from "@sdkwork/generations-pc-workspace/generation-service";
import type { GenerationAgentRunCreateInput } from "./packages/sdkwork-clawrouter-pc-playground/src/playgroundTypes.ts";

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

  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0]?.modality, "audio");
  assert.equal(artifacts[0]?.asset.kind, "audio");
  assert.equal(artifacts[0]?.asset.url, "https://cdn.example/generated.wav");
  assert.equal(artifacts[0]?.asset.mimeType, "audio/wav");
  assert.equal(artifacts[0]?.asset.durationSeconds, 4.3);
  assert.equal(result.item.asset?.url, "https://cdn.example/generated.wav");
  assert.equal(result.usage.imageCount, 0);
  assert.equal(result.usage.videoSeconds, "0");
  assert.equal(result.steps.length, 2);
});

async function runAssetGeneration(
  input: GenerationAgentRunCreateInput,
  resultOverrides: Record<string, unknown> = {},
) {
  const { commands, service } = createAssetGenerationService(resultOverrides);
    const artifacts: unknown[] = [];
  const result = await runPlaygroundAssetGeneration({
    ...input,
    onArtifact: (artifact) => artifacts.push(artifact),
  }, service as never);

  return {
    artifacts: artifacts as Awaited<ReturnType<typeof runPlaygroundAssetGeneration>>["item"]["asset"][],
    commands,
    result,
  };
}
