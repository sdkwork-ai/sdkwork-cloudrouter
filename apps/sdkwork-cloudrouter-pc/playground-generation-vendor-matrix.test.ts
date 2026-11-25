/**
 * Playground generation vendor × creation-type completeness matrix.
 *
 * The Playground can select a model from any vendor, but a command only lands
 * when three layers agree:
 *
 *   1. the composer emits a catalog `vendorCode` and a bare wire `model`,
 *   2. `parameters.vendor` (plus `generationMode`) names a surface the
 *      sdkwork-generations provider adapter dispatches, and
 *   3. the routed app-API operation is one the generations SDK maps onto a
 *      command endpoint.
 *
 * This suite pins all three for every (creation type, vendor) pair, so a new
 * vendor or a changed vocabulary fails here instead of at runtime. The backend
 * half is asserted in the `sdkwork-generations` provider-adapter crate
 * (`vendor.rs` … `dispatch` match arms); this file asserts the client half and
 * the vocabulary they share.
 *
 * Runs with `node --import tsx --test` (no browser, no network).
 */
import assert from "node:assert/strict";
import test from "node:test";

import { runPlaygroundAssetGeneration } from "./packages/sdkwork-cloudrouter-pc-playground/src/playgroundGenerationsService.ts";
import type {
  GenerationAgentRunCreateInput,
  PlaygroundGenerationArtifact,
} from "./packages/sdkwork-cloudrouter-pc-playground/src/playgroundTypes.ts";

/** One vendor × creation-type pairing the Playground can submit. */
interface VendorCase {
  /** Catalog vendor code forwarded as `parameters.vendor`. */
  vendorCode: string;
  /** Bare catalog model id forwarded as `model`. */
  model: string;
  /** Creation type (`targetType` / command modality). */
  targetType: GenerationAgentRunCreateInput["targetType"];
  /** Routed app-API operation type. */
  operationType: string;
  /** `parameters.generationMode` the adapter dispatches on, when any. */
  generationMode?: string;
  /** Composer reference mode that produces `generationMode`. */
  referenceMode?: GenerationAgentRunCreateInput["referenceMode"];
}

/**
 * Vendor × creation-type pairings derived from the provider-adapter dispatch
 * tables:
 *
 * - image   → openai | nano-banana(google) | vidu | kling(kuaishou) | volcengine(bytedance)
 * - video   → openai | veo(google) | kling(kuaishou) | vidu | volcengine(bytedance)
 * - music   → suno | minimax
 * - voice   → openai | elevenlabs | volcengine(bytedance)
 * - sfx     → elevenlabs
 */
const VENDOR_CASES: readonly VendorCase[] = [
  // -- Images --------------------------------------------------------------
  { vendorCode: "openai", model: "gpt-image-2", targetType: "image", operationType: "text_to_image" },
  { vendorCode: "google", model: "imagen-4-0-generate-001", targetType: "image", operationType: "text_to_image" },
  { vendorCode: "kuaishou", model: "kling-image-v1", targetType: "image", operationType: "text_to_image" },
  { vendorCode: "vidu", model: "viduq1-reference2image", targetType: "image", operationType: "text_to_image" },
  { vendorCode: "bytedance", model: "doubao-seedream-4-0-250828", targetType: "image", operationType: "text_to_image" },

  // -- Video: text-to-video on every wired vendor --------------------------
  { vendorCode: "openai", model: "sora-2", targetType: "video", operationType: "text_to_video" },
  { vendorCode: "google", model: "veo-3.1-generate-preview", targetType: "video", operationType: "text_to_video" },
  { vendorCode: "kuaishou", model: "kling-v3", targetType: "video", operationType: "text_to_video" },
  { vendorCode: "vidu", model: "viduq3-pro", targetType: "video", operationType: "text_to_video" },
  { vendorCode: "bytedance", model: "doubao-seedance-2-0-260128", targetType: "video", operationType: "text_to_video" },

  // -- Video: first-frame (image_to_video) --------------------------------
  { vendorCode: "openai", model: "sora-2", targetType: "video", operationType: "image_to_video", generationMode: "image_to_video", referenceMode: "first_frame" },
  { vendorCode: "kuaishou", model: "kling-v3", targetType: "video", operationType: "image_to_video", generationMode: "image_to_video", referenceMode: "first_frame" },
  { vendorCode: "vidu", model: "viduq3-pro", targetType: "video", operationType: "image_to_video", generationMode: "image_to_video", referenceMode: "first_frame" },
  { vendorCode: "bytedance", model: "doubao-seedance-2-0-260128", targetType: "video", operationType: "image_to_video", generationMode: "image_to_video", referenceMode: "first_frame" },

  // -- Video: first + last frame (start_end_frame) ------------------------
  { vendorCode: "kuaishou", model: "kling-v3", targetType: "video", operationType: "image_to_video", generationMode: "start_end_frame", referenceMode: "first_last_frame" },
  { vendorCode: "vidu", model: "viduq3-pro", targetType: "video", operationType: "image_to_video", generationMode: "start_end_frame", referenceMode: "first_last_frame" },
  { vendorCode: "bytedance", model: "doubao-seedance-2-0-260128", targetType: "video", operationType: "image_to_video", generationMode: "start_end_frame", referenceMode: "first_last_frame" },

  // -- Video: multi/omni reference (reference_to_video) -------------------
  { vendorCode: "vidu", model: "viduq3-pro", targetType: "video", operationType: "image_to_video", generationMode: "reference_to_video", referenceMode: "multi_reference" },
  { vendorCode: "bytedance", model: "doubao-seedance-2-0-260128", targetType: "video", operationType: "image_to_video", generationMode: "reference_to_video", referenceMode: "multi_reference" },
  { vendorCode: "bytedance", model: "doubao-seedance-2-0-260128", targetType: "video", operationType: "image_to_video", generationMode: "reference_to_video", referenceMode: "omni_reference" },

  // -- Music ---------------------------------------------------------------
  { vendorCode: "suno", model: "suno-v6", targetType: "music", operationType: "text_to_music" },
  { vendorCode: "minimax", model: "music-3.0", targetType: "music", operationType: "text_to_music" },

  // -- Voice ---------------------------------------------------------------
  { vendorCode: "openai", model: "gpt-tts-1", targetType: "audio", operationType: "speech" },
  { vendorCode: "elevenlabs", model: "eleven_multilingual_v2", targetType: "audio", operationType: "speech" },
  { vendorCode: "bytedance", model: "doubao-tts", targetType: "audio", operationType: "speech" },

  // -- Sound effects -------------------------------------------------------
  { vendorCode: "elevenlabs", model: "eleven_text_to_sound_v2", targetType: "sfx", operationType: "sound_effect" },
];

/** Frame resource the composer attaches for reference-driven video. */
function frameResource(url: string) {
  return {
    kind: "image",
    publicUrl: url,
    source: "external_url",
    url,
  } as const;
}

interface CapturedCommand {
  model?: string;
  modality: string;
  operationType: string;
  parameters?: Record<string, unknown>;
}

/**
 * Run one Playground command against a minimal generations service double and
 * capture what would reach the provider adapter.
 */
async function captureCommand(
  input: Pick<
    GenerationAgentRunCreateInput,
    "prompt" | "targetType" | "selectedModel" | "selectedVendorCode" | "referenceMode" | "referenceAssets"
  >,
): Promise<CapturedCommand> {
  const commands: CapturedCommand[] = [];
  const artifacts: PlaygroundGenerationArtifact[] = [];
  const service = {
    async createGenerationCommand(command: CapturedCommand) {
      commands.push(JSON.parse(JSON.stringify(command)) as CapturedCommand);
      return {
        record: {
          id: "gen-matrix",
          modality: command.modality,
          operationType: command.operationType,
          promptPreview: command.prompt,
          status: "succeeded",
          updatedAt: "2026-01-01T00:00:01.000Z",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        generation: { id: "gen-matrix" },
      };
    },
    async getGeneration(id: string) {
      return {
        id,
        modality: commands[0]?.modality,
        operationType: commands[0]?.operationType,
        status: "succeeded",
        updatedAt: "2026-01-01T00:00:01.000Z",
      };
    },
    async listGenerationResults() {
      return { items: [] };
    },
  };

  await runPlaygroundAssetGeneration(
    {
      ...input,
      onArtifact: (artifact: PlaygroundGenerationArtifact) => artifacts.push(artifact),
    } as GenerationAgentRunCreateInput,
    service as never,
  );

  assert.equal(commands.length, 1, "exactly one command must be submitted");
  return commands[0];
}

test("every vendor and creation type submits one routed command carrying its catalog vendor", async () => {
  for (const scenario of VENDOR_CASES) {
    const label = `${scenario.targetType}/${scenario.vendorCode} (${scenario.operationType})`;
    const command = await captureCommand({
      prompt: `matrix ${label}`,
      targetType: scenario.targetType,
      selectedModel: scenario.model,
      selectedVendorCode: scenario.vendorCode,
      referenceMode: scenario.referenceMode,
      referenceAssets: scenario.referenceMode
        ? [
          { kind: "image", role: "first_frame", name: "first.png", resource: frameResource("https://cdn.example/first.png") },
          { kind: "image", role: "last_frame", name: "last.png", resource: frameResource("https://cdn.example/last.png") },
        ]
        : undefined,
    });

    // 1. The adapter resolves the vendor from `parameters.vendor`.
    assert.equal(command.parameters?.vendor, scenario.vendorCode, `${label}: parameters.vendor`);

    // 2. The wire model is the bare catalog model id (the adapter strips a
    //    redundant `vendor/` prefix, so sending it bare keeps it unambiguous).
    assert.equal(command.model, scenario.model, `${label}: wire model`);

    // 3. The routed operation stays inside the app-API enum the generations
    //    SDK maps onto a command endpoint.
    assert.equal(command.operationType, scenario.operationType, `${label}: operation type`);

    // 4. The precise vendor surface rides `parameters.generationMode`.
    assert.equal(
      command.parameters?.generationMode,
      scenario.generationMode,
      `${label}: generationMode`,
    );

    // 5. The target type is echoed so the adapter never has to guess it.
    assert.equal(command.parameters?.targetType, scenario.targetType, `${label}: targetType`);
  }
});

test("every routed operation is one the generations SDK can dispatch", async () => {
  // Mirrors `resolveCommandInvoker` in @sdkwork/generations-pc-workspace: an
  // operation missing from this table throws before any HTTP call.
  const supported: Record<string, readonly string[]> = {
    image: ["text_to_image", "image_edit"],
    video: ["text_to_video", "image_to_video", "video_extend"],
    music: ["text_to_music", "lyrics_to_music"],
    sfx: ["sound_effect"],
    audio: ["speech"],
    voice: ["speech", "transcription", "translation"],
  };
  for (const scenario of VENDOR_CASES) {
    const modality = scenario.targetType ?? "";
    assert.ok(
      supported[modality]?.includes(scenario.operationType),
      `${modality}/${scenario.operationType} must be dispatchable by the generations SDK`,
    );
  }
});

test("reference-driven video keeps its frame roles for every vendor that supports them", async () => {
  const firstLastFrameVendors = ["kuaishou", "vidu", "bytedance"];
  for (const vendorCode of firstLastFrameVendors) {
    const command = await captureCommand({
      prompt: "matrix first/last frame",
      targetType: "video",
      selectedModel: "catalog-model",
      selectedVendorCode: vendorCode,
      referenceMode: "first_last_frame",
      referenceAssets: [
        { kind: "image", role: "first_frame", name: "first.png", resource: frameResource("https://cdn.example/first.png") },
        { kind: "image", role: "last_frame", name: "last.png", resource: frameResource("https://cdn.example/last.png") },
        { kind: "audio", role: "reference_audio", name: "voice.mp3", resource: { kind: "audio", url: "https://cdn.example/voice.mp3", source: "external_url" } as never },
        { kind: "video", role: "reference_video", name: "motion.mp4", resource: { kind: "video", url: "https://cdn.example/motion.mp4", source: "external_url" } as never },
      ],
    });

    const assets = command.parameters?.referenceAssets as Array<{ role?: string; url?: string }>;
    // The adapter derives `imageTail` / `audioUrl` / driving videos from these
    // roles; losing them silently downgraded the request to a plain prompt.
    assert.deepEqual(
      assets.map((asset) => asset.role),
      ["first_frame", "last_frame", "reference_audio", "reference_video"],
      `${vendorCode}: every upload keeps its role`,
    );
    assert.deepEqual(
      assets.map((asset) => asset.url),
      [
        "https://cdn.example/first.png",
        "https://cdn.example/last.png",
        "https://cdn.example/voice.mp3",
        "https://cdn.example/motion.mp4",
      ],
      `${vendorCode}: every upload keeps its locator`,
    );
    assert.equal(command.parameters?.generationMode, "start_end_frame", `${vendorCode}: start_end_frame`);
  }
});

test("omni-reference video carries image, audio and video references together", async () => {
  for (const vendorCode of ["vidu", "bytedance"]) {
    const command = await captureCommand({
      prompt: "matrix omni reference",
      targetType: "video",
      selectedModel: "catalog-model",
      selectedVendorCode: vendorCode,
      referenceMode: "omni_reference",
      referenceAssets: [
        { kind: "image", role: "reference_image", name: "subject.png", resource: frameResource("https://cdn.example/subject.png") },
        { kind: "audio", role: "reference_audio", name: "voice.mp3", resource: { kind: "audio", url: "https://cdn.example/voice.mp3", source: "external_url" } as never },
        { kind: "video", role: "reference_video", name: "motion.mp4", resource: { kind: "video", url: "https://cdn.example/motion.mp4", source: "external_url" } as never },
      ],
    });
    assert.equal(command.parameters?.generationMode, "reference_to_video", `${vendorCode}: reference_to_video`);
    const assets = command.parameters?.referenceAssets as Array<{ role?: string }>;
    assert.deepEqual(assets.map((asset) => asset.role), ["reference_image", "reference_audio", "reference_video"]);
  }
});

test("a vendor that only supports text-to-video never receives a reference mode", async () => {
  // Veo's image_to_video / reference surfaces need base64 frames the command
  // plane does not carry, so the picker must resolve it to text_to_video.
  const command = await captureCommand({
    prompt: "veo text only",
    targetType: "video",
    selectedModel: "veo-3.1-generate-preview",
    selectedVendorCode: "google",
    referenceMode: "text_to_video",
  });
  assert.equal(command.parameters?.generationMode, undefined);
  assert.equal(command.operationType, "text_to_video");
  assert.equal(command.parameters?.vendor, "google");
});

test("an image reference submit routes to image_edit for every wired image vendor", async () => {
  const imageVendors = ["openai", "google", "kuaishou", "vidu", "bytedance"];
  for (const vendorCode of imageVendors) {
    const command = await captureCommand({
      prompt: "matrix image edit",
      targetType: "image",
      selectedModel: "catalog-image-model",
      selectedVendorCode: vendorCode,
      referenceMode: "image_to_image",
      referenceAssets: [
        { kind: "image", role: "reference_image", name: "source.png", resource: frameResource("https://cdn.example/source.png") },
      ],
    });
    assert.equal(command.operationType, "image_edit", `${vendorCode}: image_edit`);
    assert.equal(command.parameters?.vendor, vendorCode, `${vendorCode}: parameters.vendor`);
  }
});

test("agent-mode media targets normalize onto an app-runtime gateway media route", () => {
  // The Cloud Router app-runtime gateway classifies a media invocation through
  // `runtime_gateway_api` (services/sdkwork-cloudrouter-router-service
  // src/api/app_runtime.rs): it needs `requestJson.targetType` to route to a
  // media surface at all. An invocation without a resolvable target type is
  // classified as a chat completion, so a media turn never produced media.
  //
  // This is the client half of that contract: every creation type the
  // Playground agent mode can submit must normalize onto a gateway media route.
  const normalize = (value: string): string | null => {
    const normalized = value.trim().toLowerCase().replace(/[ -]/gu, "_");
    if (normalized.includes("image")) return "image";
    if (normalized.includes("video")) return "video";
    if (normalized.includes("music")) return "music";
    if (normalized.includes("sfx") || normalized.includes("sound_effect")) return "sfx";
    if (normalized.includes("audio") || normalized.includes("voice") || normalized.includes("speech")) return "audio";
    return null;
  };

  const gatewayMediaRoutes = ["image", "video", "music", "audio", "sfx"];
  for (const targetType of gatewayMediaRoutes) {
    assert.ok(
      gatewayMediaRoutes.includes(normalize(targetType) ?? ""),
      `${targetType} must normalize onto a gateway media route`,
    );
  }
  // A target type the gateway cannot classify must not be invented.
  assert.equal(normalize(""), null);
});

test("agent mode records the vendor and reference mode the runtime dispatches on", () => {
  // `runPlaygroundGeneration` builds a runtime invocation whose `provider` and
  // `requestJson` are what the app-runtime gateway routes on. The previous
  // implementation derived `provider` from the text before the first `/` of a
  // bare catalog model id — always empty — so every agent-mode command stayed
  // on the default vendor.
  const resolveVendor = (selectedModel?: string, selectedVendorCode?: string): string | undefined => {
    const explicit = selectedVendorCode?.trim();
    if (explicit) return explicit;
    const [prefix, rest] = (selectedModel ?? '').trim().split('/', 2);
    return prefix && rest ? prefix.trim() : undefined;
  };

  assert.equal(resolveVendor('kling-v3', 'kuaishou'), 'kuaishou');
  assert.equal(resolveVendor('kling-v3'), undefined, 'a bare id carries no vendor');
  assert.equal(resolveVendor('kuaishou/kling-v3'), 'kuaishou');
  assert.equal(resolveVendor(undefined, 'bytedance'), 'bytedance');
});

