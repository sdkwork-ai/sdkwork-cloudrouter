import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";
import {
  resolveChatInputModelSelection,
  resolveChatInputSubmitBlockReason,
} from "./packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatModelSelection.ts";
import {
  loadStoredChatSessions,
  mergeChatSessions,
  saveStoredChatConversation,
  saveStoredChatInFlightStream,
} from "./packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatLocalStore.ts";
import type { ChatMessage, ChatSessionSummary } from "./packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatTypes.ts";
import type {
  PlaygroundModelGroup,
  PlaygroundModelOption,
} from "./packages/sdkwork-clawrouter-pc-playground/src/playgroundTypes.ts";
import {
  emptyRuntimeUsageSnapshot,
  mergeRuntimeUsageSnapshots,
} from "@sdkwork/clawroutes-pc-commons/runtime-usage";
import { readRuntimeTextDelta } from "./packages/sdkwork-clawroutes-pc-commons/src/runtime-stream-event.ts";

function readPortalFile(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function createSampleChatModel(
  overrides: Partial<PlaygroundModelOption> = {},
): PlaygroundModelOption {
  const id = String(overrides.id ?? "openai/gpt-4o-mini");
  const model = String(overrides.model ?? "gpt-4o-mini");
  const displayName = String(overrides.displayName ?? overrides.name ?? model);
  return {
    id,
    catalogKey: String(overrides.catalogKey ?? id),
    model,
    name: displayName,
    displayName,
    desc: String(overrides.desc ?? `${displayName} description`),
    description: String(overrides.description ?? `${displayName} description`),
    ver: String(overrides.ver ?? "AI"),
    versionLabel: String(overrides.versionLabel ?? "AI"),
    vendorCode: String(overrides.vendorCode ?? "openai"),
    vendorName: String(overrides.vendorName ?? "OpenAI"),
    modalities: ["llm"],
    inputModalities: ["text"],
    outputModalities: ["text"],
    capabilities: ["chat"],
    officialReferenceUnitPrice: null,
    officialReferenceCurrency: null,
    officialReferencePrices: [],
    priceAvailability: { status: "unavailable" },
    providerCodes: ["openai"],
    supportsStreaming: true,
    supportsTools: false,
    supportsJsonSchema: false,
    ...overrides,
  } as PlaygroundModelOption;
}

function createSampleChatModelGroup(llms: PlaygroundModelOption[]): PlaygroundModelGroup {
  return {
    id: "openai",
    vendor: { code: "openai", name: "OpenAI" },
    llms,
    images: [],
    videos: [],
    audios: [],
    music: [],
    sfx: [],
  } as PlaygroundModelGroup;
}

function createSampleChatSession(
  id: string,
  updatedAt: string,
  title = id,
): ChatSessionSummary {
  return {
    id,
    latestCompletionId: id,
    title,
    createdAt: updatedAt,
    updatedAt,
    preview: title,
    messageCount: 2,
  };
}

function createSampleChatMessage(id: string, content = id): ChatMessage {
  return {
    id,
    role: "user",
    content,
    createdAt: "2026-05-27T00:00:00.000Z",
    status: "sent",
  };
}

async function withMockLocalStorage(fn: () => Promise<void> | void): Promise<void> {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map<string, string>();
  const storage = {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  } as Storage;

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    enumerable: true,
    value: storage,
  });

  try {
    await fn();
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, "localStorage", originalDescriptor);
    } else {
      delete (globalThis as { localStorage?: Storage }).localStorage;
    }
  }
}

test("chat runtime test owns only the Claw Router chat boundary", () => {
  const testSource = readPortalFile("./playground-chat-runtime.test.ts");

  assert.doesNotMatch(testSource, /(?:\.\.\/){2,}sdkwork-/);
});

test("chat playground leaves shared markdown implementation behind its public package export", () => {
  const markdownAdapter = readPortalFile(
    "./packages/sdkwork-clawrouter-pc-playground/src/components/chat/generationsMarkdown.ts",
  );
  const bubbleSource = readPortalFile(
    "./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatMessageBubble.tsx",
  );

  assert.match(markdownAdapter, /@sdkwork\/generations-pc-playground\/react/);
  assert.doesNotMatch(markdownAdapter, /sdkwork-generations\/.*\/src\//);
  assert.match(bubbleSource, /ChatMarkdownMessage/);
});

test("chat runtime uses application SDK operations and never constructs a raw transport", () => {
  const operationsSource = readPortalFile(
    "./packages/sdkwork-clawrouter-pc-playground/src/appRuntimeApiOperations.ts",
  );
  const serviceSource = readPortalFile(
    "./packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatService.ts",
  );
  const pageSource = readPortalFile(
    "./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatPage.tsx",
  );

  assert.match(operationsSource, /getClawRouterAppSdkClient/);
  assert.match(operationsSource, /streamRuntimeInvocationEvents/);
  assert.match(serviceSource, /from '\.\.\/\.\.\/appRuntimeApiOperations\.ts'/);
  assert.doesNotMatch(operationsSource, /\bfetch\s*\(/);
  assert.doesNotMatch(operationsSource, /axios/);
  assert.doesNotMatch(serviceSource, /\bfetch\s*\(/);
  assert.doesNotMatch(serviceSource, /new EventSource/);
  assert.doesNotMatch(pageSource, /\bfetch\s*\(/);
  assert.doesNotMatch(pageSource, /new EventSource/);
});

test("chat stream composition uses the typed runtime stream helper", () => {
  const runtimeStreamSource = readPortalFile(
    "./packages/sdkwork-clawrouter-pc-playground/src/runtimeStream.ts",
  );
  const commonsRuntimeSource = readPortalFile(
    "./packages/sdkwork-clawroutes-pc-commons/src/runtime.ts",
  );
  const streamEventSource = readPortalFile(
    "./packages/sdkwork-clawroutes-pc-commons/src/runtime-stream-event.ts",
  );

  assert.match(runtimeStreamSource, /@sdkwork\/clawroutes-pc-commons\/runtime/);
  assert.match(commonsRuntimeSource, /\.http\.streamJson/);
  assert.match(commonsRuntimeSource, /appApiPath/);
  assert.match(commonsRuntimeSource, /runtime\/invocations/);
  assert.match(commonsRuntimeSource, /export \{ readRuntimeTextDelta \} from '\.\/runtime-stream-event\.ts';/);
  assert.match(streamEventSource, /export type RuntimeStreamEvent = RuntimeEventItem;/);
  assert.match(streamEventSource, /MAX_RUNTIME_TEXT_DELTA_CHARACTERS/);
});

test("chat session reconciliation removes stale local data when the remote list is authoritative", async () => {
  await withMockLocalStorage(() => {
    const scope = "authoritative-remote";
    const staleSession = createSampleChatSession(
      "stale-local",
      "2026-05-26T00:00:00.000Z",
      "Stale local",
    );
    const remoteSession = createSampleChatSession(
      "remote-live",
      "2026-05-27T00:00:00.000Z",
      "Remote live",
    );
    saveStoredChatConversation(scope, [staleSession], {
      [staleSession.id]: [createSampleChatMessage("stale-message")],
    });

    const merged = mergeChatSessions(scope, [remoteSession], {}, { remoteAuthoritative: true });

    assert.deepEqual(merged.sessions.map((session) => session.id), ["remote-live"]);
    assert.equal(staleSession.id in merged.messagesBySessionId, false);

    saveStoredChatConversation(scope, merged.sessions, merged.messagesBySessionId);
    assert.deepEqual(loadStoredChatSessions(scope).map((session) => session.id), ["remote-live"]);
  });
});

test("chat session reconciliation retains an unfinished local stream while discarding stale completed data", async () => {
  await withMockLocalStorage(() => {
    const scope = "authoritative-in-flight";
    const staleSession = createSampleChatSession("stale-local", "2026-05-25T00:00:00.000Z");
    const remoteSession = createSampleChatSession("remote-live", "2026-05-26T00:00:00.000Z");
    const inFlightSession = createSampleChatSession("in-flight-local", "2026-05-27T00:00:00.000Z");
    saveStoredChatConversation(scope, [staleSession], {
      [staleSession.id]: [createSampleChatMessage("stale-message")],
      [inFlightSession.id]: [createSampleChatMessage("in-flight-message")],
    });
    saveStoredChatInFlightStream(scope, {
      assistantContent: "partial",
      id: "stream-1",
      pendingAssistantMessageId: "assistant-pending",
      prompt: "hello",
      runtimeInvocationId: "runtime-1",
      selectedModel: createSampleChatModel(),
      session: inFlightSession,
      sessionId: inFlightSession.id,
      startedAt: inFlightSession.createdAt,
      turnId: "turn-1",
      updatedAt: inFlightSession.updatedAt,
      usage: {
        cachedTokens: 0,
        inputTokens: 1,
        outputTokens: 1,
        totalTokens: 2,
      },
      userMessageId: "user-1",
    });

    const merged = mergeChatSessions(scope, [remoteSession], {}, { remoteAuthoritative: true });

    assert.deepEqual(merged.sessions.map((session) => session.id), ["in-flight-local", "remote-live"]);
    assert.equal(staleSession.id in merged.messagesBySessionId, false);
    assert.equal(inFlightSession.id in merged.messagesBySessionId, true);
  });
});

test("chat input shows a catalog model but only submits a callable streamed model", () => {
  const callableModel = createSampleChatModel({
    id: "openai/gpt-4o-mini",
    displayName: "GPT-4o Mini",
  });
  const catalogOnlyModel = createSampleChatModel({
    id: "openai/catalog-preview",
    displayName: "Catalog Preview",
    providerCodes: [],
  });
  const nonStreamingModel = createSampleChatModel({
    id: "openai/sync-only",
    displayName: "Sync Only",
    providerCodes: ["openrouter"],
    supportsStreaming: false,
  });
  const groups = [createSampleChatModelGroup([callableModel, catalogOnlyModel, nonStreamingModel])];

  const catalogSelection = resolveChatInputModelSelection(groups, catalogOnlyModel.id);
  assert.equal(catalogSelection.displayModel?.id, catalogOnlyModel.id);
  assert.equal(catalogSelection.submitModel, null);

  assert.equal(
    resolveChatInputSubmitBlockReason({
      loadingHistory: false,
      normalizedPrompt: "hello",
      selectedModelId: catalogOnlyModel.id,
      submitting: false,
      modelGroups: groups,
    }),
    "playground.chat.input.disabled.modelUnrouted",
  );
  assert.equal(
    resolveChatInputSubmitBlockReason({
      loadingHistory: false,
      normalizedPrompt: "hello",
      selectedModelId: nonStreamingModel.id,
      submitting: false,
      modelGroups: groups,
    }),
    "playground.chat.input.disabled.modelNotStreaming",
  );
  assert.equal(
    resolveChatInputSubmitBlockReason({
      loadingHistory: false,
      normalizedPrompt: "hello",
      selectedModelId: callableModel.id,
      submitting: false,
      modelGroups: groups,
    }),
    null,
  );
});

test("runtime usage leaf remains independent of the SDK bootstrap and accepts absent updates", () => {
  const initial = emptyRuntimeUsageSnapshot();
  const merged = mergeRuntimeUsageSnapshots(initial, {
    inputTokens: 3,
    outputTokens: 2,
  });

  assert.deepEqual(merged, {
    cachedTokens: 0,
    inputTokens: 3,
    outputTokens: 2,
    totalTokens: 5,
  });
  assert.equal(mergeRuntimeUsageSnapshots(merged, undefined), merged);
});

test("runtime delta reader extracts text from supported provider envelopes", () => {
  const claudeText = "### Claude\n\n```ts\nconst value = 42;\n```";
  assert.equal(
    readRuntimeTextDelta({
      eventType: "message.delta",
      payloadJson: {
        providerEvent: {
          delta: { text: claudeText, type: "text_delta" },
          type: "content_block_delta",
        },
      },
    } as Parameters<typeof readRuntimeTextDelta>[0]),
    claudeText,
  );

  const geminiText = "### Gemini\n\n- first";
  assert.equal(
    readRuntimeTextDelta({
      eventType: "response.delta",
      payloadJson: {
        providerEvent: {
          candidates: [{ content: { parts: [{ text: geminiText }] } }],
        },
      },
    } as Parameters<typeof readRuntimeTextDelta>[0]),
    geminiText,
  );

  assert.equal(
    readRuntimeTextDelta({
      eventType: "runtime.completed",
      payloadJson: { providerEvent: { text: "must not be emitted" } },
    } as Parameters<typeof readRuntimeTextDelta>[0]),
    "",
  );
});

test("runtime delta reader bounds untrusted stream payload width and delta size", () => {
  const boundedLength = 64 * 1024;
  const oversizedDelta = "x".repeat(boundedLength + 1024);

  assert.equal(
    readRuntimeTextDelta({
      eventType: "message.delta",
      payloadJson: {},
      textDelta: oversizedDelta,
    } as Parameters<typeof readRuntimeTextDelta>[0]),
    "x".repeat(boundedLength),
  );

  const textParts = Array.from({ length: 256 }, () => ({ text: "x" }));
  const boundedPayload = readRuntimeTextDelta({
    eventType: "response.delta",
    payloadJson: { providerEvent: { output: textParts } },
  } as Parameters<typeof readRuntimeTextDelta>[0]);

  assert.equal(boundedPayload.split("\n").length, 128);
  assert.equal(boundedPayload.length, 255);
});
