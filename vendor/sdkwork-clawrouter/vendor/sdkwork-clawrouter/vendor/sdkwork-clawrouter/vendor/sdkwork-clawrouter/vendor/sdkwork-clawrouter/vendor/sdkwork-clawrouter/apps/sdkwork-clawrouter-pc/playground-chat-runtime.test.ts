import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import i18next from "i18next";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { initReactI18next } from "react-i18next";
import {
  ChatMarkdownMessage,
  normalizeStreamingMarkdown,
} from "./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatMarkdownMessage.tsx";
import { ChatCodeBlock } from "./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatCodeBlock.tsx";
import { ChatMessageBubble } from "./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatMessageBubble.tsx";
import { ChatMessageList } from "./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatMessageList.tsx";
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
import { resolveReferenceImageCapability } from "./packages/sdkwork-clawrouter-pc-playground/src/referenceImageCapability.ts";
import {
  resolveVideoReferenceAssetRole,
  resolveVideoReferenceCapability,
  resolveVideoReferenceKindLimit,
  resolveVideoReferenceModeUpload,
} from "./packages/sdkwork-clawrouter-pc-playground/src/videoReferenceCapability.ts";
import { readRuntimeTextDelta } from "./packages/sdkwork-clawroutes-pc-commons/src/runtime.ts";

await i18next
  .use(initReactI18next)
  .init({
    lng: "en",
    fallbackLng: "en",
    initImmediate: false,
    interpolation: { escapeValue: false },
    resources: {
      en: {
        translation: {
          "playground.chat.emptyDescription": "Start a conversation.",
          "playground.chat.emptyTitle": "New chat",
          "playground.chat.messagesLoading": "Loading messages",
        },
      },
    },
  });

function readPortalFile(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function createSampleChatModel(overrides: Record<string, unknown> = {}) {
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
  };
}

function createSampleChatModelGroup(llms: unknown[]) {
  return {
    id: "openai",
    vendor: { code: "openai", name: "OpenAI" },
    llms,
    images: [],
    videos: [],
    audios: [],
    music: [],
    sfx: [],
  };
}

function createSampleChatSession(id: string, updatedAt: string, title = id) {
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

function createSampleChatMessage(id: string, content = id) {
  return {
    id,
    role: "user" as const,
    content,
    createdAt: "2026-05-27T00:00:00.000Z",
    status: "sent" as const,
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

test("chat playground does not render a duplicate header inside the conversation area", () => {
  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatPage.tsx");

  assert.doesNotMatch(source, /playground\.chat\.title/);
  assert.doesNotMatch(source, /playground\.chat\.subtitle/);
  assert.doesNotMatch(source, /absolute\s+inset-x-0\s+top-0\s+z-10/);
});

test("chat message list starts below the page chrome without reserving space for an inner header", () => {
  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatMessageList.tsx");

  assert.doesNotMatch(source, /pt-24/);
  assert.match(source, /px-4 pt-6 md:px-8/);
});

test("chat playground persists conversations through the app Chat SDK instead of provider completions", () => {
  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatService.ts");
  const operationsSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/appRuntimeApiOperations.ts");

  assert.match(source, /from '\.\.\/\.\.\/appRuntimeApiOperations\.ts'/);
  assert.match(source, /listChatConversations/);
  assert.match(source, /listChatMessages/);
  assert.match(source, /createChatConversation/);
  assert.match(source, /createChatTurn/);
  assert.match(source, /createRuntimeInvocation/);
  assert.match(source, /completeRuntimeInvocation/);
  assert.match(source, /completeChatTurnResponse/);
  assert.doesNotMatch(source, /getClawRouterAppSdkClient/);
  assert.doesNotMatch(source, /getClawRouterAiSdkClient/);
  assert.doesNotMatch(source, /chat\.completions/);
  assert.doesNotMatch(source, /client\.chat\./);
  assert.doesNotMatch(source, /client\.runtime\./);
  assert.match(operationsSource, /getClawRouterAppSdkClient/);
  assert.match(operationsSource, /client\.chat\.conversations\.list/);
  assert.match(operationsSource, /client\.chat\.conversationMessages\.list/);
  assert.match(operationsSource, /client\.chat\.turns\.create/);
  assert.match(operationsSource, /client\.chat\.turnResponses\.create/);
  assert.match(operationsSource, /client\.runtime\.invocations\.create/);
});

test("chat runtime stream envelope reads only generated SDK camelCase fields", () => {
  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatService.ts");

  assert.doesNotMatch(source, /\['eventType', 'event_type'\]/);
  assert.doesNotMatch(source, /\['errorMessageMasked', 'error_message_masked'\]/);
  assert.doesNotMatch(source, /event\.payload_json/);
  assert.doesNotMatch(source, /event\.event_no/);
});

test("chat session reconciliation treats successful remote session list as authoritative", async () => {
  await withMockLocalStorage(() => {
    const scope = "authoritative-remote";
    const staleSession = createSampleChatSession("stale-local", "2026-05-26T00:00:00.000Z", "Stale local");
    const remoteSession = createSampleChatSession("remote-live", "2026-05-27T00:00:00.000Z", "Remote live");
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

test("chat session reconciliation preserves unfinished local stream sessions only", async () => {
  await withMockLocalStorage(() => {
    const scope = "authoritative-in-flight";
    const staleSession = createSampleChatSession("stale-local", "2026-05-25T00:00:00.000Z", "Stale local");
    const remoteSession = createSampleChatSession("remote-live", "2026-05-26T00:00:00.000Z", "Remote live");
    const inFlightSession = createSampleChatSession("in-flight-local", "2026-05-27T00:00:00.000Z", "In flight");
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

test("chat playground sends stable catalog model identity for gateway route planning", () => {
  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatService.ts");

  assert.match(source, /function readSelectedModelCatalogKey/);
  assert.match(source, /const selectedModelCatalogKey = readSelectedModelCatalogKey\(input\.selectedModel\);/);
  assert.match(source, /model:\s*selectedModelCatalogKey/);
  assert.match(source, /selectedModel:\s*selectedModelCatalogKey/);
  assert.doesNotMatch(source, /model:\s*input\.selectedModel\.model \|\| input\.selectedModel\.id/);
});

test("chat playground consumes standard runtime SSE events for streaming interaction", () => {
  const serviceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatService.ts");
  const operationsSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/appRuntimeApiOperations.ts");
  const pageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatPage.tsx");
  const runtimeStreamSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/runtimeStream.ts");
  const commonsRuntimeSource = readPortalFile("./packages/sdkwork-clawroutes-pc-commons/src/runtime.ts");

  assert.match(serviceSource, /streamRuntimeEvents\(runtimeInvocation\.id\)/);
  assert.match(operationsSource, /streamRuntimeInvocationEvents/);
  assert.match(runtimeStreamSource, /sdkwork-clawroutes-pc-commons\/runtime/);
  assert.match(commonsRuntimeSource, /\.http\.streamJson/);
  assert.match(commonsRuntimeSource, /appApiPath/);
  assert.match(commonsRuntimeSource, /\/runtime\/invocations\/\$\{encodeURIComponent\(invocationId\)\}\/events\/stream/);
  assert.match(commonsRuntimeSource, /readRuntimePayloadTextDelta/);
  assert.match(commonsRuntimeSource, /isRuntimeTextDeltaEvent/);
  assert.match(commonsRuntimeSource, /eventType\.endsWith\('\.delta'\)/);
  assert.match(commonsRuntimeSource, /choices/);
  assert.match(commonsRuntimeSource, /outputText/);
  assert.match(serviceSource, /onDelta\?:/);
  assert.match(serviceSource, /readRuntimeTextDelta/);
  assert.match(pageSource, /onDelta:/);
  assert.match(pageSource, /status:\s*'responding'/);
});

test("chat playground persists unfinished runtime streams and resumes them after refresh", () => {
  const pageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatPage.tsx");
  const serviceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatService.ts");
  const storeSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatLocalStore.ts");
  const typesSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatTypes.ts");
  const operationsSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/appRuntimeApiOperations.ts");

  assert.match(typesSource, /ChatStreamStarted/);
  assert.match(typesSource, /onStreamStarted\?:/);
  assert.match(typesSource, /onRuntimeEvent\?:/);
  assert.match(typesSource, /ChatResumeInput/);
  assert.match(storeSource, /StoredChatInFlightStream/);
  assert.match(storeSource, /loadStoredChatInFlightStreams/);
  assert.match(storeSource, /saveStoredChatInFlightStream/);
  assert.match(storeSource, /clearStoredChatInFlightStream/);
  assert.match(serviceSource, /static async resumeMessage/);
  assert.match(serviceSource, /retrieveRuntimeInvocation/);
  assert.match(serviceSource, /input\.onStreamStarted\?\./);
  assert.match(serviceSource, /input\.onRuntimeEvent\?\./);
  assert.match(pageSource, /loadStoredChatInFlightStreams/);
  assert.match(pageSource, /saveStoredChatInFlightStream/);
  assert.match(pageSource, /clearStoredChatInFlightStream/);
  assert.match(pageSource, /ChatService\.resumeMessage/);
  assert.match(pageSource, /runtimeInvocationId/);
  assert.match(pageSource, /lastEventNo/);
  assert.match(operationsSource, /retrieveRuntimeInvocation/);
  assert.match(operationsSource, /streamRuntimeInvocationEvents/);
  assert.doesNotMatch(pageSource, /new EventSource|fetch\(/);
  assert.doesNotMatch(serviceSource, /new EventSource|fetch\(/);
});

test("chat stream resume persists usage snapshot across refresh before afterEventNo replay", () => {
  const pageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatPage.tsx");
  const storeSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatLocalStore.ts");
  const serviceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatService.ts");

  assert.match(storeSource, /usage:\s*RuntimeUsageSnapshot/);
  assert.match(storeSource, /isRuntimeUsageSnapshot\(record\.usage\)/);
  assert.match(pageSource, /let runtimeUsage = emptyRuntimeUsageSnapshot\(\);/);
  assert.match(pageSource, /runtimeUsage = mergeRuntimeUsageSnapshots\(runtimeUsage, event\.usage\);/);
  assert.match(pageSource, /usage:\s*runtimeUsage/);
  assert.match(pageSource, /initialUsage:\s*stream\.usage/);
  assert.match(serviceSource, /let usage = mergeRuntimeUsageSnapshots\(emptyRuntimeUsageSnapshot\(\), input\.initialUsage\);/);
});

test("chat stream resume finalizes runtime response even after backend terminal status", () => {
  const serviceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatService.ts");

  assert.match(
    serviceSource,
    /const completedInvocation = await completeRuntimeInvocation\(input\.runtimeInvocationId, content, usage, finalStatus\);/,
  );
  assert.doesNotMatch(serviceSource, /isCompletedRuntimeInvocation\(runtimeInvocation\)\s*\?/);
});

test("chat runtime failed events are handled as structured stream failures", () => {
  const serviceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatService.ts");

  assert.match(serviceSource, /readRuntimeFailureEventMessage/);
  assert.match(serviceSource, /eventType.*runtime\.failed/s);
  assert.match(serviceSource, /throw new Error\(failureMessage\)/);
});

test("chat playground stop uses runtime cancellation through the app SDK boundary", () => {
  const pageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatPage.tsx");
  const inputSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/SimpleChatInput.tsx");
  const serviceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatService.ts");

  assert.match(inputSource, /onStop\?:\s*\(\)\s*=>\s*Promise<void>\s*\|\s*void/);
  assert.match(inputSource, /playground\.chat\.input\.stop/);
  assert.match(pageSource, /activeChatStreamRef/);
  assert.match(pageSource, /ChatService\.cancelRuntimeInvocation/);
  assert.match(pageSource, /onStop=\{handleStop\}/);
  assert.match(serviceSource, /static async cancelRuntimeInvocation/);
  assert.match(serviceSource, /status:\s*'cancelled'/);
  assert.match(serviceSource, /readRuntimeCancellationEvent/);
  assert.match(serviceSource, /eventType.*runtime\.cancelled/s);
  assert.doesNotMatch(pageSource, /new EventSource|fetch\(/);
  assert.doesNotMatch(serviceSource, /new EventSource|fetch\(/);
});

test("runtime delta reader extracts markdown text from provider content part envelopes", () => {
  const claudeText = "### Claude\n\n```ts\nconst value = 42;\n```";
  assert.equal(readRuntimeTextDelta({
    eventType: "message.delta",
    payloadJson: {
      providerEvent: {
        delta: {
          text: claudeText,
          type: "text_delta",
        },
        type: "content_block_delta",
      },
    },
  } as Parameters<typeof readRuntimeTextDelta>[0]), claudeText);

  const geminiText = "### Gemini\n\n- first";
  assert.equal(readRuntimeTextDelta({
    eventType: "response.delta",
    payloadJson: {
      providerEvent: {
        candidates: [
          {
            content: {
              parts: [
                { text: geminiText },
              ],
            },
          },
        ],
      },
    },
  } as Parameters<typeof readRuntimeTextDelta>[0]), geminiText);

  const responsesText = "### Response\n\n```python\nprint('ok')\n```";
  assert.equal(readRuntimeTextDelta({
    eventType: "runtime.delta",
    payloadJson: {
      providerEvent: {
        output: [
          {
            content: [
              {
                text: responsesText,
                type: "output_text",
              },
            ],
          },
        ],
      },
    },
  } as Parameters<typeof readRuntimeTextDelta>[0]), responsesText);
});

test("runtime delta reader keeps structural breaks between provider text parts", () => {
  assert.equal(readRuntimeTextDelta({
    eventType: "response.delta",
    payloadJson: {
      providerEvent: {
        output: [
          {
            content: [
              { text: "```ts" },
              { text: "const first = 1;" },
              { text: "const second = 2;" },
              { text: "```" },
            ],
          },
        ],
      },
    },
  } as Parameters<typeof readRuntimeTextDelta>[0]), "```ts\nconst first = 1;\nconst second = 2;\n```");
});

test("playground chat delegates API key selection to backend runtime policy", () => {
  const pageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatPage.tsx");
  const inputSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/SimpleChatInput.tsx");
  const typeSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatTypes.ts");
  const serviceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatService.ts");

  assert.doesNotMatch(pageSource, /ApiKeyService/);
  assert.doesNotMatch(pageSource, /selectedApiKeyId/);
  assert.doesNotMatch(pageSource, /ChatApiKeyOption/);
  assert.doesNotMatch(inputSource, /ChatApiKeySwitcher/);
  assert.doesNotMatch(inputSource, /apiKeys/);
  assert.doesNotMatch(inputSource, /selectedApiKey/);
  assert.doesNotMatch(typeSource, /ChatApiKeyOption/);
  assert.doesNotMatch(typeSource, /selectedApiKeyId/);
  assert.doesNotMatch(typeSource, /apiKey\?:/);
  assert.doesNotMatch(serviceSource, /routeKeyId/);
  assert.doesNotMatch(serviceSource, /readOptionalInteger/);
  assert.doesNotMatch(serviceSource, /input\.selectedApiKeyId/);
});

test("chat playground leaves model visibility to the catalog instead of hiding unroutable entries", () => {
  const pageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatPage.tsx");
  const serviceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/playgroundService.ts");

  assert.match(pageSource, /PlaygroundService\.fetchModelGroups\(\)/);
  assert.doesNotMatch(pageSource, /fetchChatModelGroups/);
  assert.doesNotMatch(serviceSource, /requireProviderRoute/);
});

test("simple chat input keeps the selected model full name readable after selection", () => {
  const inputSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/SimpleChatInput.tsx");
  const pickerSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/PlaygroundModelPicker.tsx");

  assert.doesNotMatch(inputSource, /max-w-\[\d+px\]/);
  assert.match(inputSource, /w-fit min-w-0 max-w-full flex-\[0_1_auto\]/);
  assert.match(pickerSource, /const selectedModelLabel = selectedModel\.displayName \|\| selectedModel\.name \|\| selectedModel\.model;/);
  assert.match(pickerSource, /title=\{selectedModelLabel\}/);
  assert.match(pickerSource, /aria-label=\{selectedModelLabel\}/);
  assert.match(pickerSource, /whitespace-normal break-words/);
});

test("simple chat input remembers the selected chat model across reloads", () => {
  const inputSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/SimpleChatInput.tsx");

  assert.match(inputSource, /SIMPLE_CHAT_SELECTED_MODEL_STORAGE_KEY/);
  assert.match(inputSource, /interface StoredSimpleChatModelPreference/);
  assert.match(inputSource, /loadStoredSimpleChatModelPreference/);
  assert.match(inputSource, /saveStoredSimpleChatModelPreference/);
  assert.match(inputSource, /findStoredCallableSimpleChatModel/);
  assert.match(inputSource, /findChatModelBySignature/);
  assert.match(inputSource, /vendorCode: model\.vendorCode/);
  assert.match(inputSource, /region: readModelRegion\(model\)/);
  assert.match(inputSource, /model: model\.model/);
  assert.match(inputSource, /providerCodes: \[\.\.\.model\.providerCodes\]/);
  assert.match(inputSource, /const restoredModel = findStoredCallableSimpleChatModel\(modelGroups, storedPreference\);/);
  assert.match(inputSource, /setSelectedModelId\(restoredModel\.id\)/);
  assert.match(inputSource, /onSelectModel=\{handleSelectModel\}/);
  assert.match(inputSource, /saveStoredSimpleChatModelPreference\(selectedModel\)/);
  assert.match(inputSource, /removeStoredSimpleChatModelPreference\(\)/);
  assert.doesNotMatch(inputSource, /store\.setItem\(SIMPLE_CHAT_SELECTED_MODEL_STORAGE_KEY,\s*normalizedModelId\)/);
});

test("simple chat input reflects clicked catalog models while only submitting routable models", () => {
  const callableModel = createSampleChatModel({
    id: "openai/gpt-4o-mini",
    displayName: "GPT-4o Mini",
  });
  const catalogOnlyModel = createSampleChatModel({
    id: "openai/catalog-preview",
    displayName: "Catalog Preview",
    providerCodes: [],
    supportsStreaming: false,
  });
  const groups = [createSampleChatModelGroup([callableModel, catalogOnlyModel])];

  const initialSelection = resolveChatInputModelSelection(groups, "");
  assert.equal(initialSelection.displayModel?.id, callableModel.id);
  assert.equal(initialSelection.submitModel?.id, callableModel.id);

  const catalogOnlySelection = resolveChatInputModelSelection(groups, catalogOnlyModel.id);
  assert.equal(catalogOnlySelection.displayModel?.id, catalogOnlyModel.id);
  assert.equal(catalogOnlySelection.submitModel, null);

  const callableSelection = resolveChatInputModelSelection(groups, callableModel.id);
  assert.equal(callableSelection.displayModel?.id, callableModel.id);
  assert.equal(callableSelection.submitModel?.id, callableModel.id);
});

test("chat playground never submits catalog-only models without runtime routes", () => {
  const pageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatPage.tsx");
  const inputSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/SimpleChatInput.tsx");
  const selectorSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatModelSelection.ts");

  assert.match(selectorSource, /export function isCallableChatModel/);
  assert.match(selectorSource, /model\.providerCodes\.length > 0/);
  assert.match(selectorSource, /model\.supportsStreaming/);
  assert.match(selectorSource, /export function findCallableChatModel/);
  assert.match(selectorSource, /export function firstCallableChatModel/);
  assert.match(selectorSource, /export function resolveChatInputModelSelection/);
  assert.match(selectorSource, /const fallbackCallableModel = firstCallableChatModel\(groups\)/);
  assert.match(pageSource, /firstCallableChatModel\(groups\)/);
  assert.match(pageSource, /findCallableChatModel\(modelGroups, input\.selectedModelId\)/);
  assert.match(pageSource, /!isCallableChatModel\(selectedModel\)/);
  assert.match(pageSource, /playground\.chat\.errors\.modelUnavailable/);
  assert.doesNotMatch(pageSource, /findChatModel\(modelGroups, input\.selectedModelId\) \|\| selectedChatModel \|\| firstChatModel\(modelGroups\)/);
  assert.match(inputSource, /resolveChatInputModelSelection\(modelGroups, selectedModelId\)/);
  assert.match(inputSource, /selectedModelId=\{displaySelectedModel\?\.id \?\? ''\}/);
  assert.match(inputSource, /selectedModelId: submitModel!\.id/);
  assert.match(inputSource, /findStoredCallableSimpleChatModel/);
  assert.doesNotMatch(inputSource, /selectedModelId=\{submitModel\?\.id \?\? ''\}/);
  assert.doesNotMatch(inputSource, /selectedModelId: displaySelectedModel!\.id/);
  assert.doesNotMatch(inputSource, /const realSelectedModel = selectedModel \|\| firstChatModel\(modelGroups\);/);
});

test("simple chat input explains why the send button is disabled", () => {
  const callableModel = createSampleChatModel({
    id: "openai/gpt-4o-mini",
    displayName: "GPT-4o Mini",
  });
  const catalogOnlyModel = createSampleChatModel({
    id: "openai/catalog-preview",
    displayName: "Catalog Preview",
    providerCodes: [],
    supportsStreaming: true,
  });
  const nonStreamingModel = createSampleChatModel({
    id: "openai/sync-only",
    displayName: "Sync Only",
    providerCodes: ["openrouter"],
    supportsStreaming: false,
  });
  const groups = [createSampleChatModelGroup([callableModel, catalogOnlyModel, nonStreamingModel])];

  assert.equal(
    resolveChatInputSubmitBlockReason({
      loadingHistory: true,
      normalizedPrompt: "hello",
      selectedModelId: callableModel.id,
      submitting: false,
      modelGroups: groups,
    }),
    "playground.chat.input.disabled.loadingHistory",
  );
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
      selectedModelId: "",
      submitting: false,
      modelGroups: [createSampleChatModelGroup([catalogOnlyModel])],
    }),
    "playground.chat.input.disabled.noCallableModel",
  );
  assert.equal(
    resolveChatInputSubmitBlockReason({
      loadingHistory: false,
      normalizedPrompt: "",
      selectedModelId: callableModel.id,
      submitting: false,
      modelGroups: groups,
    }),
    "playground.chat.input.disabled.emptyPrompt",
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

  const inputSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/SimpleChatInput.tsx");
  const chatMessages = readPortalFile("./packages/sdkwork-clawrouter-pc-i18n/src/resources/playground/chat.ts");
  assert.match(inputSource, /resolveChatInputSubmitBlockReason/);
  assert.match(inputSource, /sendButtonTooltip/);
  assert.match(inputSource, /disabled:pointer-events-none/);
  assert.match(chatMessages, /playground\.chat\.input\.disabled\.modelUnrouted/);
  assert.match(chatMessages, /playground\.chat\.input\.disabled\.emptyPrompt/);
});

test("console API keys expose backend runtime default selection", () => {
  const serviceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-console-api-keys/src/apiKeyService.ts");
  const viewSource = readPortalFile("./packages/sdkwork-clawrouter-pc-console-api-keys/src/ApiKeysView.tsx");
  const appSdkItem = readWorkspaceFile("sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi/src/types/app-api-key-item.ts");
  const appSdkUpdate = readWorkspaceFile("sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi/src/types/update-api-key-request.ts");

  assert.match(appSdkItem, /defaultForRuntime: boolean;/);
  assert.match(appSdkUpdate, /defaultForRuntime\?: boolean;/);
  assert.match(serviceSource, /defaultForRuntime: SdkAppApiKeyItem\['defaultForRuntime'\]/);
  assert.match(serviceSource, /defaultForRuntime\?: boolean/);
  assert.match(serviceSource, /request\.defaultForRuntime = Boolean\(input\.defaultForRuntime\);/);
  assert.match(serviceSource, /defaultForRuntime: readBoolean\(value, 'defaultForRuntime'\)/);
  assert.match(viewSource, /handleSetDefaultRuntimeKey/);
  assert.match(viewSource, /ApiKeyService\.updateKey\(key\.id, \{ defaultForRuntime: true \}\)/);
  assert.match(viewSource, /console\.apiKeys\.runtimeDefault/);
});

test("runtime SSE event type comes directly from the generated app SDK contract", () => {
  const commonsRuntimeSource = readPortalFile("./packages/sdkwork-clawroutes-pc-commons/src/runtime.ts");
  const runtimeEventItemSource = readWorkspaceFile("sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi/src/types/runtime-event-item.ts");

  assert.match(runtimeEventItemSource, /payloadJson: Record<string, JsonValue>;/);
  assert.match(commonsRuntimeSource, /export type RuntimeStreamEvent = RuntimeEventItem;/);
  assert.doesNotMatch(commonsRuntimeSource, /RuntimeEventItem\s*&/);
  assert.doesNotMatch(commonsRuntimeSource, /payloadJson\?:/);
  assert.match(commonsRuntimeSource, /readRuntimePayloadTextDelta\(event\.payloadJson\)/);
});

test("chat playground keeps failed SSE turns visible instead of rolling back the conversation", () => {
  const pageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatPage.tsx");

  assert.doesNotMatch(pageSource, /setMessages\(priorMessages\)/);
  assert.match(pageSource, /message\.id === pendingAssistant\.id/);
  assert.match(pageSource, /status:\s*'failed'/);
  assert.match(pageSource, /streamedAssistantContent \|\| errorMessage/);
  assert.match(pageSource, /streamedAssistantContent \|\| item\.content \|\| errorMessage/);
});

test("chat playground persists failed SSE turns into the conversation cache", () => {
  const pageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatPage.tsx");
  const serviceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatService.ts");

  assert.match(serviceSource, /class ChatSendFailureError extends Error/);
  assert.match(pageSource, /persistFailedChatConversation\(/);
  assert.match(pageSource, /error instanceof ChatSendFailureError/);
  assert.match(pageSource, /saveStoredChatConversation\(chatStoreScope, nextSessions, nextMessagesBySessionId\)/);
  assert.match(pageSource, /setMessagesBySessionId\(nextMessagesBySessionId\)/);
  assert.match(pageSource, /setSelectedSessionId\(persistedFailure\.sessionId\)/);
});

test("chat playground closes failed SSE runs with both Runtime and Chat turn terminal records", () => {
  const serviceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatService.ts");
  const operationsSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/appRuntimeApiOperations.ts");

  assert.match(serviceSource, /async function failTurnResponse/);
  assert.match(serviceSource, /await failRuntimeInvocation\(runtimeInvocation\.id, failure\)/);
  assert.match(serviceSource, /await failTurnResponse\(\{/);
  assert.match(serviceSource, /completeRuntimeInvocationOperation/);
  assert.match(serviceSource, /completeChatTurnResponse/);
  assert.doesNotMatch(serviceSource, /client\.chat\.turnResponses\.create/);
  assert.match(operationsSource, /client\.chat\.turnResponses\.create/);
  assert.match(serviceSource, /status:\s*'failed'/);
  assert.match(serviceSource, /runtimeInvocationId:\s*invocation\.id/);
  assert.match(serviceSource, /errorCode:\s*failure\.errorCode/);
  assert.match(serviceSource, /idempotencyPrefix:\s*'chat-turn-response-failed'/);
});

test("chat playground does not self-resume an active in-flight stream already owned by the page", () => {
  const pageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatPage.tsx");

  assert.match(
    pageSource,
    /if \(!stream \|\| resumingStreamIdsRef\.current\.has\(stream\.id\) \|\| activeChatStreamRef\.current\?\.id === stream\.id\)/,
  );
});

test("chat message bubble renders streamed assistant deltas while still responding", () => {
  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatMessageBubble.tsx");

  assert.doesNotMatch(source, /splitMessageBlocks/);
  assert.match(source, /ChatMarkdownMessage/);
  assert.match(source, /const displayContent = hasSeparateError \? message\.content : \(message\.content \|\| message\.errorMessage \|\| ''\);/);
  assert.match(source, /const showTypingIndicator = isPending && displayContent\.trim\(\)\.length === 0;/);
  assert.match(source, /streaming=\{isPending\}/);
  assert.match(source, /showTypingIndicator \?/);
});

test("chat message bubble renders markdown code blocks in the actual message list surface", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMessageBubble, {
    message: {
      id: "assistant-markdown",
      conversationId: "conversation-1",
      role: "assistant",
      content: [
        "### Answer",
        "",
        "Here is the implementation:",
        "",
        "```ts",
        "const value = 42;",
        "```",
      ].join("\n"),
      status: "completed",
      createdAt: "2026-05-26T00:00:00.000Z",
    },
  }));

  assert.match(html, /<h3/);
  assert.match(html, /Copy code/);
  assert.match(html, /const[\s\S]*value[\s\S]*42/);
  assert.doesNotMatch(html, /```ts/);
});

test("assistant chat responses use full-width layout without an avatar", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMessageBubble, {
    message: {
      id: "assistant-full-width",
      conversationId: "conversation-1",
      role: "assistant",
      content: [
        "### Wide answer",
        "",
        "| column | value |",
        "| --- | --- |",
        "| long | content |",
      ].join("\n"),
      status: "completed",
      createdAt: "2026-05-26T00:00:00.000Z",
    },
  }));

  assert.match(html, /flex w-full min-w-0 flex-col gap-1 items-stretch/);
  assert.match(html, /select-text w-full min-w-0/);
  assert.doesNotMatch(html, /lucide-bot/);
  assert.doesNotMatch(html, /max-w-\[min\(820px,92%\)\]/);
});

test("user chat messages use a muted modern send bubble without an avatar", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMessageBubble, {
    message: {
      id: "user-modern-bubble",
      conversationId: "conversation-1",
      role: "user",
      content: "Please write a TypeScript parser.",
      status: "completed",
      createdAt: "2026-05-26T00:00:00.000Z",
    },
  }));
  const bubbleSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatMessageBubble.tsx");
  const markdownSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatMarkdownMessage.tsx");

  assert.match(html, /bg-slate-800\/80/);
  assert.match(html, /border-white\/10/);
  assert.match(html, /text-slate-50/);
  assert.doesNotMatch(html, /lucide-user-round/);
  assert.doesNotMatch(bubbleSource, /UserRound/);
  assert.doesNotMatch(bubbleSource, /rounded-br-md bg-white px-4 py-3 text-sm leading-6 text-slate-950/);
  assert.match(markdownSource, /tone === 'user'[\s\S]*'text-slate-50'[\s\S]*tone === 'danger'[\s\S]*'text-red-100'/);
});

test("chat markdown normalizes transport escaped markdown before rendering", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMarkdownMessage, {
    content: "### Answer\\n\\n- item\\n\\n```ts\\nconst value = 42;\\n```",
    tone: "assistant",
  }));

  assert.match(html, /<h3/);
  assert.match(html, /<li/);
  assert.match(html, /Copy code/);
  assert.match(html, /const[\s\S]*value[\s\S]*42/);
  assert.doesNotMatch(html, /\\n/);
  assert.doesNotMatch(html, /```ts/);
});

test("chat markdown unwraps provider message payloads before rendering", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMarkdownMessage, {
    content: JSON.stringify({
      message: {
        content: [
          {
            type: "text",
            text: "### Answer\n\n```tsx\nexport function Demo() {\n  return <span>ok</span>;\n}\n```",
          },
        ],
      },
    }),
    tone: "assistant",
  }));

  assert.match(html, /<h3/);
  assert.match(html, /Copy code/);
  assert.match(html, /export[\s\S]*function[\s\S]*Demo/);
  assert.doesNotMatch(html, /&quot;message&quot;/);
  assert.doesNotMatch(html, /```tsx/);
});

test("chat markdown renders language-less fenced code as a real code block", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMessageBubble, {
    message: {
      id: "assistant-unlabeled-code",
      conversationId: "conversation-1",
      role: "assistant",
      content: [
        "Use this exact value:",
        "",
        "```",
        "SDKWORK_RUNTIME_OK",
        "```",
      ].join("\n"),
      status: "completed",
      createdAt: "2026-05-26T00:00:00.000Z",
    },
  }));

  assert.match(html, /<figure/);
  assert.match(html, />text</);
  assert.match(html, /Copy code/);
  assert.match(html, /SDKWORK_RUNTIME_OK/);
  assert.doesNotMatch(html, /rounded-md px-1\.5 py-0\.5/);
});

test("chat markdown repairs inline fenced code emitted by compact provider streams", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMarkdownMessage, {
    content: [
      "Intro```java",
      "public class Demo {}",
      "```middle```text",
      "ok",
      "```tail```text",
      "O(n)",
      "```",
    ].join("\n"),
    tone: "assistant",
  }));

  assert.equal((html.match(/<figure/g) || []).length, 3);
  assert.match(html, /Copy code/);
  assert.match(html, /public[\s\S]*class[\s\S]*Demo/);
  assert.match(html, /O[\s\S]*n/);
  assert.doesNotMatch(html, /Intro```java/);
  assert.doesNotMatch(html, /middle```text/);
});

test("chat markdown repairs compact fenced code with code on the opening line", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMarkdownMessage, {
    content: "Example: ```ts const first = 1;\\nconst second = 2;``` after",
    tone: "assistant",
  }));

  assert.equal((html.match(/<figure/g) || []).length, 1);
  assert.match(html, />ts</);
  assert.match(html, /data-chat-code-line="1"/);
  assert.match(html, /data-chat-code-line="2"/);
  assert.match(html, /const[\s\S]*first[\s\S]*const[\s\S]*second/);
  assert.match(html, />Example:/);
  assert.match(html, />after</);
  assert.doesNotMatch(html, /rounded-md px-1\.5 py-0\.5/);
  assert.doesNotMatch(html, /ts const first/);
});

test("chat markdown repairs fully collapsed fenced code from previously damaged streams", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMarkdownMessage, {
    content: "Example: ```tsconst first = 1;const second = 2;``` after",
    tone: "assistant",
  }));

  assert.equal((html.match(/<figure/g) || []).length, 1);
  assert.match(html, />ts</);
  assert.match(html, /data-chat-code-line="1"/);
  assert.match(html, /data-chat-code-line="2"/);
  assert.match(html, /const[\s\S]*first[\s\S]*const[\s\S]*second/);
  assert.doesNotMatch(html, />tsconst</);
  assert.doesNotMatch(html, /rounded-md px-1\.5 py-0\.5/);
});

test("chat markdown repairs compact unlabeled fenced code with code on the opening line", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMarkdownMessage, {
    content: "Example: ```const first = 1;\\nconst second = 2;``` after",
    tone: "assistant",
  }));

  assert.equal((html.match(/<figure/g) || []).length, 1);
  assert.match(html, />text</);
  assert.match(html, /data-chat-code-line="1"/);
  assert.match(html, /data-chat-code-line="2"/);
  assert.match(html, /const[\s\S]*first[\s\S]*const[\s\S]*second/);
  assert.doesNotMatch(html, /rounded-md px-1\.5 py-0\.5/);
});

test("chat markdown repairs compact ordered lists before rendering", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMarkdownMessage, {
    content: "Please confirm:1.**What should I remind you about?**  \n2.**When should I remind you?** For example, today at 3 PM.",
    tone: "assistant",
  }));

  assert.match(html, /<ol/);
  assert.match(html, /<strong>What should I remind you about\?<\/strong>/);
  assert.match(html, /<strong>When should I remind you\?<\/strong>/);
  assert.doesNotMatch(html, /1\.&lt;strong/);
});
test("chat code block exposes visible copy action and syntax token styling", () => {
  const html = renderToStaticMarkup(React.createElement(ChatCodeBlock, {
    code: "export const value = 42;",
    language: "ts",
    tone: "assistant",
  }));

  assert.match(html, />ts</);
  assert.match(html, />Copy code</);
  assert.match(html, /text-sky-300/);
  assert.match(html, /export/);
  assert.match(html, /const/);
});

test("chat code block keeps each code line spacious instead of collapsing tokens together", () => {
  const html = renderToStaticMarkup(React.createElement(ChatCodeBlock, {
    code: [
      "function demo() {",
      "  return 42;",
      "}",
    ].join("\n"),
    language: "ts",
    tone: "assistant",
  }));

  assert.match(html, /data-chat-code-line="1"/);
  assert.match(html, /data-chat-code-line="2"/);
  assert.match(html, /data-chat-code-line="3"/);
  assert.match(html, /class="[^"]*block min-h-\[1\.625rem\][^"]*whitespace-pre/);
  assert.match(html, /function[\s\S]*demo[\s\S]*return[\s\S]*42/);
});

test("chat code block renders escaped line separators as real code lines", () => {
  const html = renderToStaticMarkup(React.createElement(ChatCodeBlock, {
    code: "const first = 1;\\nconst second = 2;",
    language: "ts",
    tone: "assistant",
  }));

  assert.match(html, /data-chat-code-line="1"/);
  assert.match(html, /data-chat-code-line="2"/);
  assert.doesNotMatch(html, /\\nconst second/);
});

test("chat code block preserves escaped newlines inside string literals", () => {
  const html = renderToStaticMarkup(React.createElement(ChatCodeBlock, {
    code: "const text = \"first\\nsecond\";",
    language: "ts",
    tone: "assistant",
  }));

  assert.match(html, /data-chat-code-line="1"/);
  assert.doesNotMatch(html, /data-chat-code-line="2"/);
  assert.match(html, /first\\nsecond/);
});

test("chat messages use a sanitized GFM markdown response surface", () => {
  const bubbleSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatMessageBubble.tsx");
  const markdownSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatMarkdownMessage.tsx");
  const codeBlockSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatCodeBlock.tsx");
  const packageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/package.json");

  assert.match(markdownSource, /from 'react-markdown'/);
  assert.match(markdownSource, /from 'remark-gfm'/);
  assert.match(markdownSource, /from 'rehype-sanitize'/);
  assert.match(markdownSource, /remarkPlugins=\{\[remarkGfm\]\}/);
  assert.match(markdownSource, /rehypePlugins=\{\[\[rehypeSanitize,\s*chatMarkdownSanitizeSchema\]\]\}/);
  assert.match(markdownSource, /normalizeStreamingMarkdown/);
  assert.match(markdownSource, /ChatCodeBlock/);
  assert.match(markdownSource, /ChatMarkdownTable/);
  assert.match(markdownSource, /target="_blank"/);
  assert.match(markdownSource, /rel="noreferrer noopener"/);
  assert.match(markdownSource, /isSafeMarkdownHref/);
  assert.match(codeBlockSource, /const displayCode = normalizeCodeBlockLineSeparators\(code\);/);
  assert.match(codeBlockSource, /navigator\.clipboard\.writeText\(displayCode\)/);
  assert.match(codeBlockSource, /overflow-x-auto/);
  assert.match(codeBlockSource, /languageLabel/);
  assert.doesNotMatch(bubbleSource, /dangerouslySetInnerHTML/);
  assert.doesNotMatch(markdownSource, /dangerouslySetInnerHTML/);
  assert.match(packageSource, /"react-markdown"/);
  assert.match(packageSource, /"remark-gfm"/);
  assert.match(packageSource, /"rehype-sanitize"/);
});

test("chat markdown renders GFM content without leaking renderer metadata into the DOM", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMarkdownMessage, {
    content: [
      "### Result",
      "",
      "- [x] ship the parser",
      "- [ ] verify the view",
      "",
      "| capability | status |",
      "| --- | --- |",
      "| code | ready |",
      "",
      "```ts",
      "const answer = 42;",
      "```",
    ].join("\n"),
    tone: "assistant",
  }));

  assert.match(html, /<h3/);
  assert.match(html, /contains-task-list/);
  assert.match(html, /list-disc pl-5 contains-task-list/);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /<table/);
  assert.match(html, /overflow-x-auto/);
  assert.match(html, /Copy code/);
  assert.match(html, /const[\s\S]*answer[\s\S]*42/);
  assert.doesNotMatch(html, /node="\[object Object\]"/);
});

test("chat markdown renders math, soft line breaks, autolinks, and footnotes professionally", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMarkdownMessage, {
    content: [
      "Line one",
      "Line two with https://example.com",
      "",
      "The inline equation is $E = mc^2$.",
      "",
      "$$",
      "\\int_0^1 x^2 dx = \\frac{1}{3}",
      "$$",
      "",
      "This answer has a footnote.[^1]",
      "",
      "[^1]: Footnote detail with `code`.",
    ].join("\n"),
    tone: "assistant",
  }));

  assert.match(html, /Line one<br\/>\s*Line two/);
  assert.match(html, /href="https:\/\/example.com"/);
  assert.match(html, /class="[^"]*katex/);
  assert.match(html, /class="[^"]*katex-display/);
  assert.match(html, /<sup/);
  assert.match(html, /Footnote detail/);
  assert.doesNotMatch(html, /\$E = mc\^2\$/);
  assert.doesNotMatch(html, /\\frac/);
});

test("chat markdown preserves safe internal anchor and footnote links", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMarkdownMessage, {
    content: [
      "Jump to [details](#details) and keep the note.[^1]",
      "",
      "[^1]: Footnote detail.",
    ].join("\n"),
    tone: "assistant",
  }));

  assert.match(html, /<a href="#details" class="[^"]*underline/);
  assert.match(html, /href="#[^"]*fn-1"/);
  assert.match(html, /href="#[^"]*fnref-1"/);
  assert.doesNotMatch(html, /href="#details" target="_blank"/);
});

test("chat markdown renders common inline math without corrupting code spans or prices", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMarkdownMessage, {
    content: [
      "Keep `$VALUE` as code and keep price text like $5 + $3 readable.",
      "",
      "The theorem is \\(a^2 + b^2 = c^2\\).",
    ].join("\n"),
    tone: "assistant",
  }));

  assert.match(html, />\$VALUE<\/code>/);
  assert.match(html, /\$5 \+ \$3/);
  assert.match(html, /class="[^"]*katex/);
  assert.doesNotMatch(html, /\\\(a\^2/);
});

test("chat markdown wraps long links and identifiers inside the message column", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMarkdownMessage, {
    content: [
      "See https://example.com/docs/sdkwork-clawrouter-runtime-streaming-chat-markdown-rendering-professional-long-link",
      "",
      "- extremelyLongUnbrokenIdentifierThatShouldNeverForceTheChatMessageListWiderThanTheViewport",
    ].join("\n"),
    tone: "assistant",
  }));

  assert.match(html, /href="https:\/\/example.com\/docs\/sdkwork-clawrouter-runtime-streaming-chat-markdown-rendering-professional-long-link"/);
  assert.match(html, /class="[^"]*\[overflow-wrap:anywhere\]/);
  assert.match(html, /<li class="[^"]*\[overflow-wrap:anywhere\]/);
});

test("chat markdown renders image-only paragraphs as constrained media blocks", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMarkdownMessage, {
    content: [
      "![Architecture diagram](https://example.com/assets/architecture.png)",
      "",
      "![Unsafe image](javascript:alert(1))",
      "",
      "![Mail image](mailto:ops@example.com)",
    ].join("\n"),
    tone: "assistant",
  }));

  assert.match(html, /src="https:\/\/example.com\/assets\/architecture.png"/);
  assert.match(html, /<div class="my-4 min-w-0 first:mt-0 last:mb-0"/);
  assert.match(html, /class="[^"]*block h-auto max-h-\[480px\] max-w-full/);
  assert.doesNotMatch(html, /<p class="[^"]*"><\/p>/);
  assert.doesNotMatch(html, /javascript:/);
  assert.doesNotMatch(html, /mailto:/);
});

test("chat markdown renders mixed text images inline instead of breaking paragraph flow", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMarkdownMessage, {
    content: "Text before ![Diagram](https://example.com/diagram.png) text after",
    tone: "assistant",
  }));

  assert.match(html, /Text before <img[^>]+src="https:\/\/example.com\/diagram.png"[^>]+\/> text after/);
  assert.match(html, /<img[^>]+class="[^"]*inline-block[^"]*align-middle/);
  assert.doesNotMatch(html, /<p[^>]*>Text before <img[^>]+class="block h-auto/);
});

test("chat markdown keeps long table cells wrapped inside the scroll surface", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMarkdownMessage, {
    content: [
      "| key | extremelyLongUnbrokenHeaderThatShouldWrapInsideTheTableCell |",
      "| --- | --- |",
      "| value | extremelyLongUnbrokenTableCellValueThatShouldNeverForceTheMessageColumnWiderThanTheViewport |",
    ].join("\n"),
    tone: "assistant",
  }));

  assert.match(html, /overflow-x-auto/);
  assert.match(html, /<th class="[^"]*\[overflow-wrap:anywhere\]/);
  assert.match(html, /<td class="[^"]*\[overflow-wrap:anywhere\]/);
  assert.match(html, /<td class="[^"]*whitespace-normal/);
});

test("chat markdown display math inherits danger tone in error surfaces", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMarkdownMessage, {
    content: [
      "### Runtime failure",
      "",
      "$$",
      "a^2 + b^2 = c^2",
      "$$",
    ].join("\n"),
    tone: "danger",
  }));

  assert.match(html, /chat-markdown[^"]*text-red-100/);
  assert.match(html, /katex-display[^"]*border-red-300\/20[^"]*text-red-100/);
  assert.match(html, /class="[^"]*katex[^"]*text-current/);
  assert.doesNotMatch(html, /katex[^"]*text-slate-100/);
});

test("chat markdown keeps nested list content compact without document-style paragraph gaps", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMarkdownMessage, {
    content: [
      "- First paragraph",
      "",
      "  Continuation paragraph",
      "",
      "  ```ts",
      "  const value = 1;",
      "  ```",
    ].join("\n"),
    tone: "assistant",
  }));

  assert.match(html, /<li class="[^"]*\[\&amp;&gt;p\]:my-1\.5/);
  assert.match(html, /\[\&amp;&gt;figure\]:my-2/);
  assert.match(html, /Copy code/);
});

test("chat markdown blockquotes and tables use response width without document-style clutter", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMarkdownMessage, {
    content: [
      "> Important implementation note.",
      "",
      "| very long column heading | value |",
      "| --- | --- |",
      "| The renderer should let the table use the available response width. | ok |",
    ].join("\n"),
    tone: "assistant",
  }));
  const markdownSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatMarkdownMessage.tsx");

  assert.match(html, /<blockquote/);
  assert.match(html, /bg-white\/\[0\.04\]/);
  assert.doesNotMatch(html, /italic/);
  assert.match(html, /<table/);
  assert.match(html, /min-w-full/);
  assert.doesNotMatch(markdownSource, /max-w-\[22rem\]/);
});

test("chat markdown surfaces stay constrained for wide code and tables", () => {
  const bubbleSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatMessageBubble.tsx");
  const markdownSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatMarkdownMessage.tsx");
  const codeBlockSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatCodeBlock.tsx");

  assert.match(bubbleSource, /const responseFrameClassName = isUser/);
  assert.match(bubbleSource, /'flex w-full min-w-0 flex-col gap-1 items-stretch'/);
  assert.match(bubbleSource, /'select-text w-full min-w-0 px-0 py-0 text-sm leading-6 text-slate-100'/);
  assert.match(markdownSource, /tabIndex=\{0\}/);
  assert.match(codeBlockSource, /tabIndex=\{0\}/);
  assert.match(codeBlockSource, /whitespace-pre/);
});

test("playground agent history output uses the same markdown response surface as chat messages", () => {
  const historySource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/ChatHistoryItem.tsx");
  const playgroundSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/pages/Playground.tsx");
  const html = renderToStaticMarkup(React.createElement(ChatMarkdownMessage, {
    content: [
      "### Answer",
      "",
      "```ts",
      "const value = 42;",
      "```",
    ].join("\n"),
    tone: "assistant",
  }));

  assert.match(historySource, /ChatMarkdownMessage/);
  assert.match(playgroundSource, /ChatMarkdownMessage/);
  assert.match(historySource, /<ChatMarkdownMessage content=\{item\.outputText\} tone="assistant"/);
  assert.match(playgroundSource, /content=\{previewText \|\| t\('playground\.preview\.noTextOutput'\)\}/);
  assert.match(html, /<h3/);
  assert.match(html, /Copy code/);
  assert.match(html, /const[\s\S]*value[\s\S]*42/);
  assert.doesNotMatch(historySource, /<div[^>]*>\s*\{item\.outputText\}\s*<\/div>/);
  assert.doesNotMatch(playgroundSource, /<div[^>]*>\s*\{previewText \|\| t\('playground\.preview\.noTextOutput'\)\}\s*<\/div>/);
});

test("chat markdown preserves readable text around raw html without allowing unsafe links", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMarkdownMessage, {
    content: "<div>visible</div> after [safe](https://example.com) and [bad](javascript:alert(1))",
    tone: "assistant",
  }));

  assert.match(html, /&lt;div&gt;visible&lt;\/div&gt; after/);
  assert.match(html, /href="https:\/\/example.com"/);
  assert.match(html, /target="_blank"/);
  assert.doesNotMatch(html, /href="javascript:/);
  assert.doesNotMatch(html, /<div>visible<\/div>/);
});

test("chat streaming markdown closes only real fenced code blocks", () => {
  assert.equal(
    normalizeStreamingMarkdown("```ts\nconst pending = true;"),
    "```ts\nconst pending = true;\n```",
  );
  assert.equal(
    normalizeStreamingMarkdown("Use ``` as literal text inside a sentence."),
    "Use ``` as literal text inside a sentence.",
  );
});

test("chat message bubble presents failed assistant errors completely with copy support", () => {
  const bubbleSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatMessageBubble.tsx");
  const typeSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatTypes.ts");
  const pageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatPage.tsx");

  assert.match(typeSource, /errorMessage\?: string;/);
  assert.match(pageSource, /errorMessage:\s*streamedAssistantContent \? errorMessage : undefined/);
  assert.match(bubbleSource, /const isFailed = message\.status === 'failed';/);
  assert.match(bubbleSource, /AlertTriangle/);
  assert.match(bubbleSource, /message\.errorMessage/);
  assert.match(bubbleSource, /readChatMessageCopyText\(message\)/);
  assert.match(bubbleSource, /navigator\.clipboard\.writeText\(copyText\)/);
  assert.match(bubbleSource, /select-text/);
  assert.match(bubbleSource, /border-red-400\/30/);
  assert.doesNotMatch(bubbleSource, /line-clamp/);
});

test("chat message bubble renders separate failed error text through markdown", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMessageBubble, {
    message: {
      id: "assistant-failed-markdown",
      conversationId: "conversation-1",
      role: "assistant",
      content: "Partial answer before the failure.",
      errorMessage: [
        "### Runtime failure",
        "",
        "```json",
        "{\"code\":\"5000\"}",
        "```",
      ].join("\n"),
      status: "failed",
      createdAt: "2026-05-26T00:00:00.000Z",
    },
  }));

  assert.match(html, /<h3/);
  assert.match(html, /Runtime failure/);
  assert.match(html, /Copy code/);
  assert.match(html, /5000/);
  assert.doesNotMatch(html, /```json/);
});

test("chat message list avoids duplicate error banners once the failed bubble contains the same error", () => {
  const listSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatMessageList.tsx");

  assert.match(listSource, /const shouldShowErrorBanner = Boolean\(error && !hasFailedAssistantError\(messages, error\)\);/);
  assert.match(listSource, /function hasFailedAssistantError/);
  assert.match(listSource, /message\.errorMessage \|\| message\.content/);
  assert.match(listSource, /message\.status === 'failed'/);
  assert.match(listSource, /\{shouldShowErrorBanner && \(/);
});

test("chat message list renders standalone error banners through markdown", () => {
  const html = renderToStaticMarkup(React.createElement(ChatMessageList, {
    messages: [
      {
        id: "user-1",
        conversationId: "conversation-1",
        role: "user",
        content: "Trigger a gateway error.",
        status: "completed",
        createdAt: "2026-05-26T00:00:00.000Z",
      },
    ],
    error: [
      "### Gateway failure",
      "",
      "```json",
      "{\"code\":\"5000\"}",
      "```",
    ].join("\n"),
  }));

  assert.match(html, /<h3/);
  assert.match(html, /Gateway failure/);
  assert.match(html, /Copy code/);
  assert.match(html, /5000/);
  assert.match(html, /text-red-100/);
  assert.doesNotMatch(html, /chat-markdown[^"]*text-slate-100/);
  assert.doesNotMatch(html, /```json/);
});

test("chat playground keeps streamed assistant output pinned to the message scroller bottom", () => {
  const pageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatPage.tsx");
  const listSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatMessageList.tsx");

  assert.match(pageSource, /const messageScrollerRef = useRef<HTMLDivElement>\(null\);/);
  assert.match(pageSource, /function scrollChatToBottom/);
  assert.match(pageSource, /requestAnimationFrame/);
  assert.match(pageSource, /function scheduleAssistantDeltaFlush/);
  assert.match(pageSource, /function flushPendingAssistantDelta/);
  assert.match(pageSource, /pendingAssistantDelta \+= delta;/);
  assert.match(pageSource, /scheduleAssistantDeltaFlush\(\);/);
  assert.match(pageSource, /flushPendingAssistantDelta\(\);[\s\S]*const sessionId = activeSessionId \|\| result\.session\.id;/);
  assert.match(pageSource, /ref=\{messageScrollerRef\}[\s\S]*overflow-y-auto/);
  assert.match(pageSource, /scrollContainerRef=\{messageScrollerRef\}/);
  assert.match(listSource, /useLayoutEffect/);
  assert.match(listSource, /scrollContainerRef\?: RefObject<HTMLDivElement \| null>;/);
  assert.match(listSource, /scroller\.scrollTop = scroller\.scrollHeight;/);
});

test("chat playground renders streamed deltas from accumulated content instead of appending to restored snapshots", () => {
  const pageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatPage.tsx");

  assert.doesNotMatch(pageSource, /content:\s*`\$\{message\.content\}\$\{delta\}`/);
  assert.match(pageSource, /message\.id === pendingAssistant\.id[\s\S]*content:\s*streamedAssistantContent/);
  assert.match(pageSource, /message\.id === stream\.pendingAssistantMessageId[\s\S]*content:\s*assistantContent/);
});

test("chat playground prefers complete streamed text when a streaming request fails", () => {
  const pageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatPage.tsx");

  assert.match(pageSource, /flushPendingAssistantDelta\(\);[\s\S]*const failedSession = error instanceof ChatSendFailureError/);
  assert.match(pageSource, /content:\s*streamedAssistantContent \|\| item\.content \|\| errorMessage/);
  assert.doesNotMatch(pageSource, /content:\s*item\.content \|\| streamedAssistantContent \|\| errorMessage/);
});

test("chat playground persists partial streamed output when a runtime stream fails", () => {
  const serviceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/chatService.ts");

  assert.match(serviceSource, /assistantContent:\s*content/);
  assert.match(serviceSource, /function readFailedTurnResponseMessage/);
  assert.match(serviceSource, /message:\s*readFailedTurnResponseMessage\(assistantContent, failure\)/);
  assert.match(serviceSource, /### Runtime failure/);
});

test("playground SSE runtime errors are translated before display", () => {
  const playgroundSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/pages/Playground.tsx");
  const playgroundCoreI18nSource = readPortalFile("./packages/sdkwork-clawrouter-pc-i18n/src/resources/playground/core.ts");
  const playgroundChatI18nSource = readPortalFile("./packages/sdkwork-clawrouter-pc-i18n/src/resources/playground/chat.ts");

  assert.match(playgroundSource, /error\.message\.startsWith\('playground\.'\)/);
  assert.match(playgroundSource, /t\(error\.message\)/);
  assert.match(playgroundCoreI18nSource, /"playground\.agent\.errors\.runtimeUnavailable"/);
  assert.match(playgroundChatI18nSource, /"playground\.chat\.errors\.runtimeUnavailable"/);
});

test("agent playground uses runtime SSE without legacy agent session APIs", () => {
  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/playgroundGenerationService.ts");
  const operationsSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/appRuntimeApiOperations.ts");
  const facadeSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/playgroundService.ts");
  const pageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/pages/Playground.tsx");
  const itemSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/ChatHistoryItem.tsx");
  const runtimeStreamSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/runtimeStream.ts");
  const commonsRuntimeSource = readPortalFile("./packages/sdkwork-clawroutes-pc-commons/src/runtime.ts");

  assert.match(source, /from '\.\/appRuntimeApiOperations\.ts'/);
  assert.match(source, /createRuntimeInvocation/);
  assert.match(source, /streamRuntimeEvents/);
  assert.match(source, /completeRuntimeInvocation/);
  assert.doesNotMatch(source, /listAgentDefinitions/);
  assert.doesNotMatch(source, /createAgentSession/);
  assert.doesNotMatch(source, /createAgentRun/);
  assert.doesNotMatch(source, /completeAgentRun/);
  assert.doesNotMatch(source, /getClawRouterAppSdkClient/);
  assert.doesNotMatch(source, /client\.agents\./);
  assert.doesNotMatch(source, /client\.runtime\./);
  assert.match(facadeSource, /from '@sdkwork\/generations-pc-workspace\/generation-service'/);
  assert.match(facadeSource, /createSdkworkGenerationService/);
  assert.match(facadeSource, /includeSampleRuns:\s*false/);
  assert.doesNotMatch(facadeSource, /await import\('@sdkwork\/image-pc-generation'\)/);
  assert.doesNotMatch(facadeSource, /loadSdkworkGenerationServiceFactory/);
  assert.doesNotMatch(facadeSource, /createFallbackSdkworkGenerationService/);
  assert.doesNotMatch(facadeSource, /runs\.length === 0 && workspace\.runs\.length > 0/);
  assert.doesNotMatch(operationsSource, /client\.agents\./);
  assert.match(operationsSource, /client\.runtime\.invocations\.create/);
  assert.match(operationsSource, /streamRuntimeInvocationEvents/);
  assert.match(runtimeStreamSource, /sdkwork-clawroutes-pc-commons\/runtime/);
  assert.match(commonsRuntimeSource, /\.http\.streamJson/);
  assert.match(commonsRuntimeSource, /appApiPath/);
  assert.match(commonsRuntimeSource, /\/runtime\/invocations\/\$\{encodeURIComponent\(invocationId\)\}\/events\/stream/);
  assert.match(source, /onDelta\?\.\(textDelta\)/);
  assert.match(facadeSource, /runPlaygroundGeneration\(input\)/);
  assert.match(pageSource, /onDelta:\s*\(delta\)/);
  assert.match(pageSource, /outputText:\s*`\$\{item\.outputText \|\| ''\}\$\{delta\}`/);
  assert.match(itemSource, /item\.outputText/);
});

test("playground generation orchestration is reusable across agent and modality panels", () => {
  const serviceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/playgroundService.ts");
  const generationServiceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/playgroundGenerationService.ts");
  const generationsServiceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/playgroundGenerationsService.ts");
  const commonsSdkSource = readPortalFile("./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts");
  const pageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/pages/Playground.tsx");

  assert.match(serviceSource, /runPlaygroundGeneration/);
  assert.match(serviceSource, /runPlaygroundAssetGeneration/);
  assert.match(serviceSource, /selectedModality === 'agent'/);
  assert.match(serviceSource, /createSdkworkGenerationService/);
  assert.match(serviceSource, /getSdkworkGenerationsAppSdkClient/);
  assert.match(serviceSource, /onDelta:\s*input\.onDelta/);
  assert.match(serviceSource, /onArtifact:\s*input\.onArtifact/);
  assert.match(serviceSource, /@sdkwork\/generations-pc-workspace/);
  assert.match(commonsSdkSource, /sdkwork-generations-app-sdk-generated-typescript/);
  assert.match(commonsSdkSource, /getSdkworkGenerationsAppSdkClient/);
  assert.match(commonsSdkSource, /VITE_SDKWORK_GENERATIONS_APP_API_BASE_URL/);
  assert.match(generationServiceSource, /export async function runPlaygroundGeneration/);
  assert.match(generationServiceSource, /streamRuntimeEvents/);
  assert.match(generationServiceSource, /readRuntimeTextDelta/);
  assert.match(generationServiceSource, /payloadJson/);
  assert.match(generationServiceSource, /media_generation/);
  assert.match(generationServiceSource, /appRuntimeApiOperations/);
  assert.doesNotMatch(generationServiceSource, /getClawRouterAppSdkClient/);
  assert.doesNotMatch(generationServiceSource, /\bfetch\s*\(/);
  assert.doesNotMatch(generationServiceSource, /new EventSource/);
  assert.doesNotMatch(generationServiceSource, /axios/);
  assert.match(generationsServiceSource, /createGenerationCommand/);
  assert.match(generationsServiceSource, /listGenerationResults/);
  assert.match(generationsServiceSource, /text_to_image/);
  assert.match(generationsServiceSource, /image_to_video/);
  assert.match(generationsServiceSource, /text_to_music/);
  assert.match(generationsServiceSource, /speech/);
  assert.match(generationsServiceSource, /sound_effect/);
  assert.doesNotMatch(generationsServiceSource, /streamRuntimeEvents/);
  assert.doesNotMatch(generationsServiceSource, /\bfetch\s*\(/);
  assert.doesNotMatch(generationsServiceSource, /axios/);
  assert.match(pageSource, /PlaygroundService\.runGeneration/);
  assert.doesNotMatch(pageSource, /runPlaygroundGeneration/);
  assert.doesNotMatch(pageSource, /playgroundGenerationService/);
  assert.match(pageSource, /onArtifact:\s*\(artifact\)/);
  assert.match(pageSource, /appendSdkworkGenerationArtifactToHistoryItem/);
});

test("chat playground keeps conversation state scoped to the app session while API key routing is backend-owned", () => {
  const pageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatPage.tsx");

  assert.match(pageSource, /const chatStoreScope = CHAT_LOCAL_SESSION_SCOPE;/);
  assert.match(pageSource, /loadStoredChatMessages\(chatStoreScope, selectedSessionId\)/);
  assert.match(pageSource, /mergeChatSessions\(chatStoreScope, \[\], \{\}\)/);
  assert.match(pageSource, /mergeChatSessions\(chatStoreScope, items, localConversation\.messagesBySessionId, \{\s*remoteAuthoritative: true,\s*\}\)/);
  assert.match(pageSource, /saveStoredChatConversation\(chatStoreScope, merged\.sessions, merged\.messagesBySessionId\)/);
  assert.match(pageSource, /saveStoredChatConversation\(chatStoreScope, sessionsRef\.current, next\)/);
  assert.match(pageSource, /\[chatStoreScope, clearNewChatDraft, t\]/);
  assert.doesNotMatch(pageSource, /selectedApiKeyId/);
  assert.doesNotMatch(pageSource, /resetActiveConversationView\(\{ clearSessions: true \}\)/);
});

test("chat playground exposes each conversation as an addressable route", () => {
  const appSource = readPortalFile("./src/App.tsx");
  const playgroundSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/pages/Playground.tsx");
  const pageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/chat/ChatPage.tsx");

  assert.match(appSource, /path="\/playground\/\*"/);
  assert.match(appSource, /path="\/c\/:conversationId"/);
  assert.match(playgroundSource, /useLocation/);
  assert.match(playgroundSource, /useNavigate/);
  assert.match(playgroundSource, /readPlaygroundModalityFromPath\(location\.pathname\)/);
  assert.match(playgroundSource, /pathname\.startsWith\('\/c\/'\)/);
  assert.match(playgroundSource, /PLAYGROUND_MODALITY_ROUTES\.chat/);
  assert.match(pageSource, /useLocation/);
  assert.match(pageSource, /useNavigate/);
  assert.match(pageSource, /const routeSessionId = useMemo\(\(\) => readChatRouteSessionId\(location\.pathname\), \[location\.pathname\]\);/);
  assert.match(pageSource, /const chatRootConversationPrefix = '\/c\/';/);
  assert.match(pageSource, /createChatSessionRoute\(sessionId\)/);
  assert.match(pageSource, /return `\/c\/\$\{encodeURIComponent\(sessionId\)\}`;/);
  assert.match(pageSource, /navigate\(createChatSessionRoute\(sessionId\)\)/);
  assert.match(pageSource, /navigate\('\/playground\/chat'\)/);
  assert.match(pageSource, /navigate\(createChatSessionRoute\(persistedFailure\.sessionId\), \{ replace: true \}\)/);
  assert.match(pageSource, /navigate\(createChatSessionRoute\(sessionId\), \{ replace: true \}\)/);
  assert.doesNotMatch(pageSource, /return localConversation\.sessions\[0\]\?\.id \?\? '';/);
  assert.doesNotMatch(pageSource, /return merged\.sessions\[0\]\?\.id \?\? '';/);
});

test("playground sidebar items expose stable addressable routes", () => {
  const playgroundSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/pages/Playground.tsx");

  assert.match(playgroundSource, /const PLAYGROUND_MODALITY_ROUTES/);
  assert.match(playgroundSource, /agent:\s*'\/playground\/agent'/);
  assert.match(playgroundSource, /chat:\s*'\/playground\/chat'/);
  assert.match(playgroundSource, /image:\s*'\/playground\/image'/);
  assert.match(playgroundSource, /video:\s*'\/playground\/video'/);
  assert.match(playgroundSource, /music:\s*'\/playground\/music'/);
  assert.match(playgroundSource, /audio:\s*'\/playground\/audio'/);
  assert.match(playgroundSource, /sfx:\s*'\/playground\/sfx'/);
  assert.match(playgroundSource, /assets:\s*'\/playground\/assets'/);
  assert.match(playgroundSource, /readPlaygroundModalityFromPath\(location\.pathname\)/);
  assert.match(playgroundSource, /navigate\(PLAYGROUND_MODALITY_ROUTES\[nextModality\]\)/);
  assert.match(playgroundSource, /navigate\(PLAYGROUND_MODALITY_ROUTES\.agent\)/);
  assert.match(playgroundSource, /navigate\(PLAYGROUND_MODALITY_ROUTES\.chat\)/);
  assert.doesNotMatch(playgroundSource, /navigate\('\/playground'\)/);
  assert.doesNotMatch(playgroundSource, /useState<Modality>\('image'\)/);
});

test("asset view maps history items from real history fields", () => {
  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/views/AssetView.tsx");

  assert.doesNotMatch(source, /item\.(thumbnail|previewUrl|duration|timestamp|size)\b/);
  assert.match(source, /item\.asset/);
  assert.match(source, /item\.images/);
  assert.match(source, /item\.videos/);
  assert.doesNotMatch(source, /item\.url/);
  assert.match(source, /item\.durationSeconds/);
  assert.match(source, /item\.createdAt/);
  assert.match(source, /item\.updatedAt/);
  assert.match(source, /item\.id/);
  assert.match(source, /agentHistory\.find\(\(item\) => item\.id === asset\.id\)/);
});

test("asset gallery applies the chosen sort order before rendering", () => {
  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/views/AssetGalleryView.tsx");

  assert.match(source, /const sortedAssets = useMemo\(/);
  assert.match(source, /sortBy === 'date'/);
  assert.match(source, /sortBy === 'name'/);
  assert.match(source, /\.sort\(/);
  assert.doesNotMatch(source, /onClick=\{\(\) => \{\}\}/);
});

test("asset gallery hides unavailable batch actions instead of rendering dead controls", () => {
  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/views/AssetGalleryView.tsx");

  assert.match(source, /\{onDelete && \(/);
  assert.match(source, /\{onExport && \(/);
  assert.doesNotMatch(source, /onDelete\?\./);
  assert.doesNotMatch(source, /onExport\?\./);
});

test("image generation reference images sit above the prompt and follow model capacity", () => {
  const panelSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/AssetGenerationPanel.tsx");
  const assetMessages = readPortalFile("./packages/sdkwork-clawrouter-pc-i18n/src/resources/playground/assets.ts");
  const uploaderPosition = panelSource.indexOf("<ReferenceImageUploader");
  const promptPosition = panelSource.indexOf("<textarea");

  assert(uploaderPosition >= 0, "Reference image uploader should be rendered by AssetGenerationPanel");
  assert(promptPosition >= 0, "Prompt textarea should be rendered by AssetGenerationPanel");
  assert(uploaderPosition < promptPosition, "Reference image uploader should sit above the prompt textarea");
  assert.match(panelSource, /const \[referenceImages, setReferenceImages\] = useState<ReferenceImagePreview\[\]>\(\[\]\);/);
  assert.match(panelSource, /referenceImages:\s*referenceImages\.map\(\(referenceImage\) => referenceImage\.metadata\)/);
  assert.match(panelSource, /multiple=\{referenceImageCapacity\.maxImages > 1\}/);
  assert.match(panelSource, /Array\.from\(event\.currentTarget\.files \?\? \[\]\)/);
  assert.doesNotMatch(panelSource, /referenceImageMetadata \? \[referenceImageMetadata\] : \[\]/);
  assert.match(assetMessages, /playground\.referenceImage\.capacity/);
  assert.match(assetMessages, /playground\.referenceImage\.unsupported/);
  assert.match(assetMessages, /playground\.referenceImage\.tooMany/);

  assert.deepEqual(resolveReferenceImageCapability("image", createSampleChatModel({
    capabilities: ["image_generation"],
    inputModalities: ["text"],
    outputModalities: ["image"],
  })), { enabled: false, maxImages: 0 });

  assert.deepEqual(resolveReferenceImageCapability("image", createSampleChatModel({
    capabilities: ["reference_image"],
    inputModalities: ["image"],
    outputModalities: ["image"],
  })), { enabled: true, maxImages: 1 });

  assert.deepEqual(resolveReferenceImageCapability("image", createSampleChatModel({
    capabilities: ["image_edit", "multi_image_reference"],
    inputModalities: ["image"],
    outputModalities: ["image"],
  })), { enabled: true, maxImages: 4 });

  assert.deepEqual(resolveReferenceImageCapability("video", createSampleChatModel({
    capabilities: ["multi_image_reference"],
    inputModalities: ["image"],
    outputModalities: ["image"],
  })), { enabled: false, maxImages: 0 });
});

test("video generation reference assets sit above the prompt and follow model mode capacity", () => {
  const panelSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/AssetGenerationPanel.tsx");
  const typeSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/playgroundTypes.ts");
  const serviceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/playgroundGenerationService.ts");
  const videoPopupSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/VideoGenerationModePopup.tsx");
  const assetMessages = readPortalFile("./packages/sdkwork-clawrouter-pc-i18n/src/resources/playground/assets.ts");
  const uploaderPosition = panelSource.indexOf("<VideoReferenceAssetUploader");
  const promptPosition = panelSource.indexOf("<textarea");

  assert(uploaderPosition >= 0, "Video reference asset uploader should be rendered by AssetGenerationPanel");
  assert(promptPosition >= 0, "Prompt textarea should be rendered by AssetGenerationPanel");
  assert(uploaderPosition < promptPosition, "Video reference asset uploader should sit above the prompt textarea");
  assert.match(typeSource, /export interface PlaygroundReferenceAssetInput/);
  assert.match(typeSource, /import type \{ ClawRouterMediaResource \} from '@sdkwork\/clawroutes-pc-commons\/runtime';/);
  assert.match(typeSource, /kind: 'image' \| 'audio' \| 'video';/);
  assert.match(typeSource, /role: 'first_frame' \| 'last_frame' \| 'reference_image' \| 'reference_audio' \| 'reference_video';/);
  assert.match(typeSource, /resource: ClawRouterMediaResource;/);
  assert.doesNotMatch(typeSource, /dataUrl\?: string;/);
  assert.doesNotMatch(typeSource, /url\?: string;/);
  assert.doesNotMatch(typeSource, /assetId\?: string;/);
  assert.match(typeSource, /referenceAssets\?: PlaygroundReferenceAssetInput\[\];/);
  assert.match(typeSource, /referenceMode\?: PlaygroundReferenceAssetMode;/);
  assert.match(panelSource, /const \[referenceAssets, setReferenceAssets\] = useState<ReferenceAssetPreview\[\]>\(\[\]\);/);
  assert.match(panelSource, /previewSrc: string;/);
  assert.match(panelSource, /function createUploadedReferenceMediaResource\([\s\S]*?\): ClawRouterMediaResource \{/);
  assert.match(panelSource, /resource: createUploadedReferenceMediaResource\(/);
  assert.match(panelSource, /referenceAssets:\s*referenceAssets\.map\(\(referenceAsset\) => referenceAsset\.metadata\)/);
  assert.match(panelSource, /referenceMode:\s*modality === 'video' \? activeVideoReferenceMode : undefined/);
  assert.match(panelSource, /accept=\{modeUpload\.accept\}/);
  assert.match(panelSource, /multiple=\{modeUpload\.maxFiles > 1\}/);
  assert.match(panelSource, /Array\.from\(event\.currentTarget\.files \?\? \[\]\)/);
  assert.match(serviceSource, /referenceAssets: input\.referenceAssets/);
  assert.match(serviceSource, /referenceMode: input\.referenceMode/);
  assert.match(assetMessages, /playground\.referenceAsset\.capacity/);
  assert.match(assetMessages, /playground\.referenceAsset\.unsupported/);
  assert.match(assetMessages, /playground\.referenceAsset\.tooMany/);
  assert.match(assetMessages, /playground\.videoReference\.mode\.firstLastFrame/);
  const mojibakeVideoTokens = [
    [0x9422, 0x71b8, 0x579a],
    [0x7459, 0x55db, 0x6b1b],
    [0x95ca, 0x5d07],
  ].map((codepoints) => String.fromCodePoint(...codepoints));
  for (const token of mojibakeVideoTokens) {
    assert.doesNotMatch(videoPopupSource, new RegExp(token));
  }

  const textOnlyVideo = resolveVideoReferenceCapability("video", createSampleChatModel({
    capabilities: ["video_generation"],
    inputModalities: ["text"],
    outputModalities: ["video"],
  }));
  assert.deepEqual(textOnlyVideo.supportedModes, ["text_to_video"]);
  assert.equal(textOnlyVideo.enabled, false);
  assert.equal(resolveVideoReferenceModeUpload(textOnlyVideo, "text_to_video").accept, "");

  const klingLikeVideo = resolveVideoReferenceCapability("video", createSampleChatModel({
    capabilities: ["video_generation", "first_last_frame", "multi_image_reference"],
    inputModalities: ["text", "image"],
    model: "kling-v2.1-master",
    outputModalities: ["video"],
  }));
  assert.deepEqual(klingLikeVideo.supportedModes, ["text_to_video", "first_frame", "first_last_frame", "multi_reference"]);
  assert.equal(klingLikeVideo.maxImages, 4);
  assert.equal(resolveVideoReferenceModeUpload(klingLikeVideo, "first_last_frame").accept, "image/*");
  assert.equal(resolveVideoReferenceModeUpload(klingLikeVideo, "first_last_frame").maxFiles, 2);

  const jimengLikeVideo = resolveVideoReferenceCapability("video", createSampleChatModel({
    capabilities: ["video_generation", "omni_reference"],
    inputModalities: ["text", "image", "audio", "video"],
    model: "jimeng-v4.0",
    outputModalities: ["video"],
  }));
  assert.deepEqual(jimengLikeVideo.supportedModes, ["text_to_video", "first_frame", "first_last_frame", "multi_reference", "omni_reference"]);
  assert.equal(jimengLikeVideo.maxAudio, 1);
  assert.equal(jimengLikeVideo.maxVideos, 1);
  assert.equal(resolveVideoReferenceModeUpload(jimengLikeVideo, "omni_reference").accept, "image/*,audio/*,video/*");
  assert.equal(resolveVideoReferenceModeUpload(jimengLikeVideo, "omni_reference").maxFiles, 6);
  assert.equal(resolveVideoReferenceKindLimit(jimengLikeVideo, "omni_reference", "image"), 4);
  assert.equal(resolveVideoReferenceKindLimit(jimengLikeVideo, "omni_reference", "audio"), 1);
  assert.equal(resolveVideoReferenceKindLimit(jimengLikeVideo, "omni_reference", "video"), 1);
  assert.equal(resolveVideoReferenceKindLimit(klingLikeVideo, "multi_reference", "audio"), 0);
  assert.equal(resolveVideoReferenceAssetRole("first_last_frame", "image", 0), "first_frame");
  assert.equal(resolveVideoReferenceAssetRole("first_last_frame", "image", 1), "last_frame");
  assert.equal(resolveVideoReferenceAssetRole("omni_reference", "audio", 0), "reference_audio");
  assert.equal(resolveVideoReferenceAssetRole("omni_reference", "video", 0), "reference_video");

  assert.deepEqual(resolveVideoReferenceCapability("image", createSampleChatModel({
    capabilities: ["omni_reference"],
    inputModalities: ["text", "image", "audio", "video"],
    outputModalities: ["video"],
  })).supportedModes, ["text_to_video"]);
});

test("generation mode popups reuse appbase popup and mode config primitives", () => {
  const imageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/ImageGenerationModePopup.tsx");
  const videoSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/VideoGenerationModePopup.tsx");
  const baseSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/GenerationModePopupBase.tsx");

  assert.match(baseSource, /@sdkwork\/image-pc-generation\/react/);
  assert.doesNotMatch(baseSource, /useState/);
  assert.doesNotMatch(baseSource, /document\.addEventListener/);
  assert.doesNotMatch(baseSource, /function ConfigSectionRenderer/);
  assert.match(imageSource, /SdkworkGenerationImageModeConfig/);
  assert.match(imageSource, /DEFAULT_SDKWORK_GENERATION_IMAGE_MODE_CONFIG/);
  assert.match(videoSource, /@sdkwork\/generations-pc-workspace\/generation-asset-config/);
  assert.match(videoSource, /SdkworkGenerationVideoModeConfig/);
  assert.match(videoSource, /DEFAULT_SDKWORK_GENERATION_VIDEO_MODE_CONFIG/);
  assert.doesNotMatch(imageSource, /as ImageGenerationConfig/);
  assert.doesNotMatch(videoSource, /as VideoGenerationConfig/);
});

test("asset generation panel serializes appbase asset config for runtime payloads", () => {
  const panelSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/AssetGenerationPanel.tsx");
  const typeSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/playgroundTypes.ts");

  assert.match(panelSource, /@sdkwork\/generations-pc-workspace\/generation-asset-config/);
  assert.match(panelSource, /createDefaultSdkworkGenerationAssetConfig/);
  assert.match(panelSource, /reconcileSdkworkGenerationAssetConfig/);
  assert.match(panelSource, /serializeSdkworkGenerationAssetConfig\(config, modality\)/);
  assert.match(panelSource, /updateSdkworkGenerationImageModeConfig/);
  assert.match(panelSource, /updateSdkworkGenerationVideoModeConfig/);
  assert.doesNotMatch(panelSource, /videoGenerationConfig/);
  assert.doesNotMatch(panelSource, /imageGenerationConfig/);
  assert.doesNotMatch(panelSource, /function createGenerationConfig/);
  assert.match(typeSource, /SdkworkGenerationSerializedAssetConfig/);
});

test("asset generation requires a real catalog model before submitting", () => {
  const panelSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/AssetGenerationPanel.tsx");

  assert.match(panelSource, /const canSubmit = normalizedPrompt\.length > 0 && !submitting && Boolean\(selectedModel\);/);
  assert.match(panelSource, /selectedModel:\s*selectedModel\?\.id \|\| undefined/);
  assert.doesNotMatch(panelSource, /selectedModel\?\.id \|\| selectedModelId/);
});

test("runtime usage reader follows gateway and provider event envelopes for generated assets", () => {
  const runtimeSource = readPortalFile("./packages/sdkwork-clawroutes-pc-commons/src/runtime.ts");

  assert.match(runtimeSource, /gatewayResponse/);
  assert.match(runtimeSource, /gatewayEvent/);
  assert.match(runtimeSource, /providerEvent/);
  assert.match(runtimeSource, /readRuntimeUsageSnapshotFromUnknown\(value\[key\], depth \+ 1\)/);
});

test("playground generation DTOs alias appbase history and artifact primitives", () => {
  const typeSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/playgroundTypes.ts");

  assert.match(typeSource, /SdkworkGenerationArtifact/);
  assert.match(typeSource, /SdkworkGenerationHistoryItem/);
  assert.match(typeSource, /SdkworkGenerationMedia/);
  assert.match(typeSource, /SdkworkGenerationModelBucket/);
  assert.match(typeSource, /export type PlaygroundGenerationArtifact = SdkworkGenerationArtifact/);
  assert.match(typeSource, /export type PlaygroundHistoryItem = SdkworkGenerationHistoryItem/);
  assert.match(typeSource, /export type PlaygroundMedia = SdkworkGenerationMedia/);
  assert.match(typeSource, /export type PlaygroundModelBucket = SdkworkGenerationModelBucket/);
  assert.doesNotMatch(typeSource, /export interface PlaygroundGenerationArtifact/);
  assert.doesNotMatch(typeSource, /export interface PlaygroundHistoryItem/);
  assert.doesNotMatch(typeSource, /export type PlaygroundMedia = string \|/);
  assert.doesNotMatch(typeSource, /export type PlaygroundModelBucket = 'llms'/);
});

test("asset generation panel delegates planning and credit estimation to appbase", () => {
  const panelSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/AssetGenerationPanel.tsx");
  const appbaseSource = readWorkspaceFile("../sdkwork-generations/apps/sdkwork-generations-pc/packages/sdkwork-generations-pc-workspace/src/generation-asset-config.ts");

  assert.match(panelSource, /estimateSdkworkGenerationCredits/);
  assert.match(panelSource, /findFirstSdkworkGenerationModelForModality/);
  assert.match(panelSource, /findSdkworkGenerationModelById/);
  assert.match(panelSource, /getSdkworkGenerationDurationOptions/);
  assert.doesNotMatch(panelSource, /function estimatePlaygroundGenerationCredits/);
  assert.doesNotMatch(panelSource, /function selectReferencePrice/);
  assert.doesNotMatch(panelSource, /function estimateMeterQuantity/);
  assert.doesNotMatch(panelSource, /function metersForModality/);
  assert.doesNotMatch(panelSource, /function durationOptionsForModality/);
  assert.match(appbaseSource, /export function estimateSdkworkGenerationCredits/);
  assert.match(appbaseSource, /export function getSdkworkGenerationDurationOptions/);
});

test("asset generation panel exposes speech synthesis controls through appbase config", () => {
  const panelSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/AssetGenerationPanel.tsx");
  const appbaseSource = readWorkspaceFile("../sdkwork-generations/apps/sdkwork-generations-pc/packages/sdkwork-generations-pc-workspace/src/generation-asset-config.ts");

  assert.match(panelSource, /updateSdkworkGenerationSpeechModeConfig/);
  assert.match(panelSource, /modality === 'audio' && config\.speechMode/);
  assert.match(panelSource, /playground\.speech\.voice/);
  assert.match(panelSource, /playground\.speech\.format/);
  assert.match(panelSource, /playground\.speech\.speed/);
  assert.match(panelSource, /onChange\(updateSdkworkGenerationSpeechModeConfig\(config,/);
  assert.match(appbaseSource, /export interface SdkworkGenerationSpeechModeConfig/);
  assert.match(appbaseSource, /speechMode\?: SdkworkGenerationSpeechModeConfig/);
  assert.match(appbaseSource, /responseFormat\?: SdkworkGenerationSpeechModeConfig\["responseFormat"\]/);
  assert.match(appbaseSource, /result\.speechMode = reconciled\.speechMode/);
  assert.match(appbaseSource, /result\.voice = reconciled\.speechMode\.voice/);
  assert.match(appbaseSource, /result\.responseFormat = reconciled\.speechMode\.responseFormat/);
  assert.match(appbaseSource, /result\.speed = reconciled\.speechMode\.speed/);
});

test("asset generation panel exposes sound effect controls through appbase config", () => {
  const panelSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/AssetGenerationPanel.tsx");
  const appbaseSource = readWorkspaceFile("../sdkwork-generations/apps/sdkwork-generations-pc/packages/sdkwork-generations-pc-workspace/src/generation-asset-config.ts");

  assert.match(panelSource, /updateSdkworkGenerationSfxModeConfig/);
  assert.match(panelSource, /modality === 'sfx' && config\.sfxMode/);
  assert.match(panelSource, /playground\.sfx\.format/);
  assert.match(panelSource, /playground\.sfx\.promptInfluence/);
  assert.match(panelSource, /playground\.sfx\.loop/);
  assert.match(panelSource, /onChange\(updateSdkworkGenerationSfxModeConfig\(config,/);
  assert.match(appbaseSource, /export interface SdkworkGenerationSfxModeConfig/);
  assert.match(appbaseSource, /sfxMode\?: SdkworkGenerationSfxModeConfig/);
  assert.match(appbaseSource, /promptInfluence\?: number/);
  assert.match(appbaseSource, /result\.sfxMode = reconciled\.sfxMode/);
  assert.match(appbaseSource, /result\.promptInfluence = reconciled\.sfxMode\.promptInfluence/);
  assert.match(appbaseSource, /result\.loop = reconciled\.sfxMode\.loop/);
});

test("playground model bucket routing reuses appbase asset modality mapping", () => {
  const pageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/pages/Playground.tsx");
  const inputSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/GenerationChatInput.tsx");

  assert.match(pageSource, /@sdkwork\/generations-pc-workspace\/generation-asset-config/);
  assert.match(inputSource, /@sdkwork\/generations-pc-workspace\/generation-asset-config/);
  assert.match(pageSource, /getSdkworkGenerationModelBucket/);
  assert.match(inputSource, /getSdkworkGenerationModelBucket/);
  assert.doesNotMatch(pageSource, /case 'image':\s*return 'images'/);
  assert.doesNotMatch(pageSource, /case 'video':\s*return 'videos'/);
  assert.doesNotMatch(pageSource, /case 'audio':\s*return 'audios'/);
  assert.doesNotMatch(inputSource, /case 'image':\s*return 'images'/);
  assert.doesNotMatch(inputSource, /case 'video':\s*return 'videos'/);
  assert.doesNotMatch(inputSource, /case 'audio':\s*return 'audios'/);
});

test("agent generation input sends appbase default config for selected asset modalities", () => {
  const inputSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/GenerationChatInput.tsx");
  const agentViewSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/views/AgentView.tsx");

  assert.match(inputSource, /@sdkwork\/generations-pc-workspace\/generation-asset-config/);
  assert.match(inputSource, /createDefaultSdkworkGenerationAssetConfig/);
  assert.match(inputSource, /serializeSdkworkGenerationAssetConfig/);
  assert.match(inputSource, /isPlaygroundGenerationTargetType\(selectedModality\)/);
  assert.match(inputSource, /const generationConfig = isPlaygroundGenerationTargetType\(selectedModality\)/);
  assert.match(inputSource, /serializeSdkworkGenerationAssetConfig\(/);
  assert.match(inputSource, /generationConfig,/);
  assert.doesNotMatch(inputSource, /playground\.parameters/);
  assert.doesNotMatch(inputSource, /<Type\b/);
  assert.match(agentViewSource, /PlaygroundGenerationSubmitInput/);
});

test("generation chat input keeps the focused composer compact", () => {
  const inputSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/GenerationChatInput.tsx");

  assert.match(inputSource, /transition-colors duration-200/);
  assert.match(inputSource, /shadow-\[0_12px_32px_rgba\(0,0,0,0\.58\)\]/);
  assert.match(inputSource, /min-h-\[112px\]/);
  assert.match(inputSource, /max-h-\[160px\]/);
  assert.match(inputSource, /overflow-y-auto/);
  assert.doesNotMatch(inputSource, /transition-all duration-300/);
  assert.doesNotMatch(inputSource, /min-h-\[200px\]/);
  assert.doesNotMatch(inputSource, /shadow-\[0_16px_40px_rgba\(0,0,0,0\.8\)\]/);
});

test("playground regeneration preserves appbase generation config from history items", () => {
  const typeSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/playgroundTypes.ts");
  const pageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/pages/Playground.tsx");
  const generationServiceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/playgroundGenerationService.ts");

  assert.match(typeSource, /generationConfig\?: PlaygroundGenerationConfig;/);
  assert.match(pageSource, /@sdkwork\/generations-pc-workspace\/generation-history/);
  assert.match(pageSource, /restoreSdkworkGenerationSerializedConfigFromHistoryItem/);
  assert.match(pageSource, /createSdkworkGenerationPendingHistoryItem\(\{[\s\S]*generationConfig,/);
  assert.match(pageSource, /generationConfig,\s*referenceImages,/);
  assert.match(pageSource, /generationConfig:\s*readRegenerationGenerationConfig\(previewItem\)/);
  assert.doesNotMatch(pageSource, /const generationConfig: PlaygroundGenerationConfig = \{\}/);
  assert.match(generationServiceSource, /generationConfig,\s*model,/);
  assert.match(generationServiceSource, /generationConfig:\s*generationConfig/);
});

test("playground history and preview mapping reuse appbase generation history helpers", () => {
  const pageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/pages/Playground.tsx");
  const historyMapperSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/historyMapper.ts");
  const generationServiceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/playgroundGenerationService.ts");
  const generationsServiceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/playgroundGenerationsService.ts");
  const assetPanelSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/AssetGenerationPanel.tsx");
  const viteConfigSource = readPortalFile("./vite.config.ts");
  const tsconfigSource = readPortalFile("./tsconfig.json");
  const tsconfigTypecheckSource = readPortalFile("./tsconfig.typecheck.json");
  const appbaseSource = readWorkspaceFile("../sdkwork-generations/apps/sdkwork-generations-pc/packages/sdkwork-generations-pc-workspace/src/generation-history.ts");

  assert.match(pageSource, /appendSdkworkGenerationArtifactToHistoryItem/);
  assert.match(pageSource, /createSdkworkGenerationPendingHistoryItem/);
  assert.match(pageSource, /getSdkworkGenerationPreviewKind/);
  assert.match(pageSource, /mapSdkworkGenerationHistoryTypeToModality/);
  assert.match(pageSource, /restoreSdkworkGenerationSerializedConfigFromHistoryItem/);
  assert.doesNotMatch(pageSource, /function appendArtifactToHistoryItem/);
  assert.doesNotMatch(pageSource, /function createPendingGenerationHistoryItem/);
  assert.doesNotMatch(pageSource, /function generationTargetFromHistoryType/);
  assert.doesNotMatch(pageSource, /function getPreviewKind/);

  assert.match(historyMapperSource, /normalizeSdkworkGenerationHistoryType/);
  assert.doesNotMatch(historyMapperSource, /function readHistoryType/);

  assert.match(generationServiceSource, /mapSdkworkGenerationArtifactsToHistoryMedia/);
  assert.match(generationServiceSource, /mapSdkworkGenerationModalityToHistoryType/);
  assert.doesNotMatch(generationServiceSource, /function mapArtifactsToHistoryMedia/);
  assert.doesNotMatch(generationServiceSource, /function mapHistoryType/);
  assert.match(generationsServiceSource, /@sdkwork\/generations-pc-workspace\/generation-history/);
  assert.match(assetPanelSource, /@sdkwork\/generations-pc-workspace\/generation-asset-config/);
  assert.match(viteConfigSource, /@sdkwork\/generations-pc-workspace\/generation-history/);
  assert.match(viteConfigSource, /@sdkwork\/generations-pc-workspace\/generation-asset-config/);
  assert.match(tsconfigSource, /"@sdkwork\/generations-pc-workspace\/generation-history"/);
  assert.match(tsconfigSource, /"@sdkwork\/generations-pc-workspace\/generation-asset-config"/);
  assert.match(tsconfigTypecheckSource, /"@sdkwork\/generations-pc-workspace\/generation-history"/);
  assert.match(tsconfigTypecheckSource, /"@sdkwork\/generations-pc-workspace\/generation-asset-config"/);

  assert.match(appbaseSource, /export function appendSdkworkGenerationArtifactToHistoryItem/);
  assert.match(appbaseSource, /export function restoreSdkworkGenerationSerializedConfigFromHistoryItem/);
});

test("playground asset history views reuse appbase history media helpers", () => {
  const assetViewSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/views/AssetView.tsx");
  const assetGallerySource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/views/AssetGalleryView.tsx");
  const sharedHistorySource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/views/SharedHistoryView.tsx");
  const chatHistorySource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/ChatHistoryItem.tsx");
  const messageItemsSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/MessageItems.tsx");

  assert.match(assetViewSource, /isSdkworkGenerationImageHistoryType/);
  assert.match(assetViewSource, /item\.asset/);
  assert.match(assetViewSource, /video\?\.poster \?\? video\?\.thumbnails\?\.\[0\]/);
  assert.doesNotMatch(assetViewSource, /readSdkworkGenerationMediaUrl/);
  assert.doesNotMatch(assetViewSource, /readSdkworkGenerationMediaThumb/);
  assert.doesNotMatch(assetViewSource, /toExternalUrlMediaResource/);
  assert.doesNotMatch(assetViewSource, /function readMediaUrl/);
  assert.doesNotMatch(assetViewSource, /function readMediaThumb/);
  assert.doesNotMatch(assetViewSource, /item\.type === 'image' \|\| item\.type === 'images'/);

  assert.match(assetGallerySource, /readMediaResourceUrl/);

  assert.match(sharedHistorySource, /isSdkworkGenerationImageHistoryType/);
  assert.doesNotMatch(sharedHistorySource, /item\.type === 'images' \|\| item\.type === 'image'/);

  assert.match(chatHistorySource, /getSdkworkGenerationPreviewKind/);
  assert.doesNotMatch(chatHistorySource, /item\.type === 'images' \|\| item\.type === 'image'/);

  assert.match(messageItemsSource, /readSdkworkGenerationMediaThumb/);
  assert.doesNotMatch(messageItemsSource, /typeof vid === 'string' \? vid : vid\.thumb \|\| vid\.url/);
});

test("app OpenAPI and SDK expose AgentRunStep terminal submit", () => {
  const openapi = JSON.parse(readWorkspaceFile("generated/openapi/clawrouter-app-openapi.json"));
  const agentSdkSource = readWorkspaceFile("sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi/src/api/agents.ts");

  assert(openapi.paths["/app/v3/api/agents/runs/{runId}/steps/{stepId}/complete"]);
  assert.equal(
    openapi.paths["/app/v3/api/agents/runs/{runId}/steps/{stepId}/complete"].post.operationId,
    "agentRunSteps.submit",
  );
  assert.match(agentSdkSource, /async submit\(runId: string, stepId: string, body: AgentRunStepCompleteRequest/);
  assert.match(agentSdkSource, /post<AgentRunStepsSubmitResult>\(appApiPath\(`\/agents\/runs\/\$\{serializePathParameter\(runId,/);
});

test("generation history contract preserves runtime output text after reload", () => {
  const openapi = JSON.parse(readWorkspaceFile("generated/openapi/clawrouter-app-openapi.json"));
  const generationHistoryItemSource = readWorkspaceFile("sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi/src/types/generation-history-item.ts");
  const historyMapperSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/historyMapper.ts");

  assert.equal(openapi.components.schemas.GenerationHistoryItem.properties.outputText.type, "string");
  assert(openapi.components.schemas.GenerationHistoryItem.properties.type.enum.includes("text"));
  assert(openapi.components.schemas.GenerationHistoryItem.properties.asset);
  assert.equal(openapi.components.schemas.GenerationHistoryItem.properties.url, undefined);
  assert.match(generationHistoryItemSource, /asset\?: MediaResource;/);
  assert.doesNotMatch(generationHistoryItemSource, /url\?: string;/);
  assert.match(generationHistoryItemSource, /outputText\?: string;/);
  assert.match(generationHistoryItemSource, /'text'/);
  assert.match(historyMapperSource, /item\.outputText \?\? item\.outputMessage/);
  assert.match(historyMapperSource, /const itemType = normalizePlaygroundHistoryType\(item\.type\)/);
  assert.match(historyMapperSource, /return normalizeSdkworkGenerationHistoryType\(value\)/);
});

test("agent generation keeps text-only output on agent history instead of pretending it is image media", () => {
  const pageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/pages/Playground.tsx");
  const typeSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/playgroundTypes.ts");
  const itemSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/components/ChatHistoryItem.tsx");
  const generationServiceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/playgroundGenerationService.ts");
  const appbaseHistorySource = readWorkspaceFile("../sdkwork-generations/apps/sdkwork-generations-pc/packages/sdkwork-generations-pc-workspace/src/generation-history.ts");

  assert.match(typeSource, /export type PlaygroundHistoryItem = SdkworkGenerationHistoryItem/);
  assert.match(appbaseHistorySource, /export type SdkworkGenerationHistoryType =/);
  assert.match(appbaseHistorySource, /\| "text"/);
  assert.match(appbaseHistorySource, /\| "image"/);
  assert.match(appbaseHistorySource, /\| "images"/);
  assert.match(appbaseHistorySource, /\| "video"/);
  assert.match(appbaseHistorySource, /\| "music"/);
  assert.match(appbaseHistorySource, /\| "audio"/);
  assert.match(appbaseHistorySource, /\| "sfx"/);
  assert.match(pageSource, /mapSdkworkGenerationHistoryTypeToModality\(previewItem\.type\) \?\? 'agent'/);
  assert.match(pageSource, /const isText = previewItem\?\.type === 'text'/);
  assert.match(pageSource, /previewKind === 'text'/);
  assert.match(itemSource, /const previewKind = getSdkworkGenerationPreviewKind\(item\.type\)/);
  assert.match(itemSource, /const isText = previewKind === 'text'/);
  assert.match(itemSource, /playground\.input\.type\.agent/);
  assert.match(itemSource, /!\(isText\) && \(/);
  assert.match(generationServiceSource, /return artifacts\[0\]\?\.modality;/);
  assert.match(generationServiceSource, /type:\s*mapSdkworkGenerationModalityToHistoryType\(targetType\)/);
});

test("app OpenAPI exposes product Chat and Runtime routes without legacy ai prefix or memory ownership", () => {
  const openapi = JSON.parse(readWorkspaceFile("generated/openapi/clawrouter-app-openapi.json"));
  const paths = Object.keys(openapi.paths ?? {});

  assert(paths.includes("/app/v3/api/chat/conversations"));
  assert(paths.includes("/app/v3/api/chat/conversations/{conversationId}/turns"));
  assert(paths.includes("/app/v3/api/chat/conversations/{conversationId}/turns/{turnId}/response"));
  assert(paths.includes("/app/v3/api/runtime/invocations"));
  assert(paths.includes("/app/v3/api/runtime/invocations/{invocationId}/complete"));
  assert(paths.includes("/app/v3/api/runtime/invocations/{invocationId}/events"));
  assert(paths.includes("/app/v3/api/runtime/invocations/{invocationId}/events/stream"));
  assert(paths.includes("/app/v3/api/runtime/invocations/{invocationId}/artifacts"));

  assert(!paths.some((path) => path.startsWith("/app/v3/api/ai/chat")));
  assert(!paths.some((path) => path.startsWith("/app/v3/api/ai/memory")));
  assert(!paths.some((path) => path.startsWith("/app/v3/api/ai/runtime")));
  assert(!paths.some((path) => path.startsWith("/app/v3/api/memory")));
});

test("playground memory operations use sdkwork-memory app SDK instead of clawrouter app SDK", () => {
  const operationsSource = readPortalFile("./packages/sdkwork-clawrouter-pc-playground/src/appRuntimeApiOperations.ts");
  const commonsSdkSource = readPortalFile("./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts");
  const memorySdkSource = readWorkspaceFile("../sdkwork-memory/sdks/sdkwork-memory-app-sdk/sdkwork-memory-app-sdk-typescript/generated/server-openapi/src/api/memory.ts");

  assert.match(operationsSource, /getSdkworkMemoryAppSdkClient/);
  assert.match(operationsSource, /client\.memory\.spaces\.list/);
  assert.match(operationsSource, /client\.memory\.list\(\{ spaceId, pageSize: params\.pageSize \}\)/);
  assert.match(operationsSource, /client\.memory\.create\(/);
  assert.match(operationsSource, /client\.memory\.retrieve\(entryId\)/);
  assert.match(operationsSource, /export async function listMemorySpaces[\s\S]*?const client = memoryClient\(sdkClient\)/);
  assert.doesNotMatch(operationsSource, /const client = appClient\(sdkClient\);[\s\n]*return client\.memory\./);
  assert.match(commonsSdkSource, /@sdkwork\/memory-app-sdk/);
  assert.match(commonsSdkSource, /getSdkworkMemoryAppSdkClient/);
  assert.match(commonsSdkSource, /VITE_SDKWORK_MEMORY_APP_API_BASE_URL/);
  assert.match(memorySdkSource, /appApiPath\(`\/memory\/spaces`\)/);
  assert.match(memorySdkSource, /appApiPath\(`\/memory\/memories`\)/);
});

test("app SDK sends JSON bodies for product Runtime mutations", () => {
  const runtimeSource = readWorkspaceFile("sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi/src/api/runtime.ts");
  const runtimeEventItemSource = readWorkspaceFile("sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi/src/types/runtime-event-item.ts");
  const openapi = JSON.parse(readWorkspaceFile("generated/openapi/clawrouter-app-openapi.json"));

  assert.match(runtimeSource, /async create\(body: RuntimeInvocationCreateRequest, params: RuntimeInvocationsCreateParams\)/);
  assert.match(runtimeSource, /post<InvocationsCreateResult>\(appApiPath\(`\/runtime\/invocations`\), body, undefined, requestHeaders, 'application\/json'\)/);
  assert.match(runtimeSource, /async submit\(invocationId: string, body: RuntimeInvocationCompleteRequest, params: RuntimeInvocationsSubmitParams\)/);
  assert.match(runtimeSource, /post<InvocationsSubmitResult>\(appApiPath\(`\/runtime\/invocations\/\$\{serializePathParameter\(invocationId,/);
  assert.match(runtimeSource, /async create\(invocationId: string, body: RuntimeEventCreateRequest, params: RuntimeInvocationEventsCreateParams\)/);
  assert.match(runtimeSource, /async create\(invocationId: string, body: RuntimeArtifactCreateRequest, params: RuntimeArtifactsCreateParams\)/);
  assert.equal(openapi.components.schemas.RuntimeEventItem.properties.payloadJson.type, "object");
  assert.match(runtimeEventItemSource, /payloadJson: Record<string, JsonValue>;/);
});

test("playground package typecheck includes portal shims for optional appbase peer modules", () => {
  const tsconfig = JSON.parse(readPortalFile("./packages/sdkwork-clawrouter-pc-playground/tsconfig.json"));

  assert.equal(tsconfig.extends, "../../tsconfig.typecheck.json");
  assert(tsconfig.include.includes("../../src/typecheck-shims.d.ts"));
});
