import assert from "node:assert/strict";
import test from "node:test";

import {
  channelAiResourceCapabilityCodes,
  channelAiResourceGroupCapabilityCodes,
  isAiResourceGroupVisibleForChannelVendorScope,
  isAiResourceVisibleForChannelVendorScope,
} from "./packages/sdkwork-clawrouter-pc-admin-channel/src/channelVendorSelection.ts";

test("admin channel AI resource filtering prefers primary capability over broad aliases", () => {
  const embeddingsResource = {
    resourceCode: "api.openai.embeddings",
    resourceType: "api_endpoint",
    vendorCode: "OpenAI",
    modalityCode: "llm",
    capability: "embedding",
    capabilities: ["embedding", "embeddings", "llm"],
  };

  assert.deepEqual(
    channelAiResourceCapabilityCodes(embeddingsResource),
    ["embedding"],
  );
  assert.equal(
    isAiResourceVisibleForChannelVendorScope(embeddingsResource, ["openai"], ["llm"]),
    false,
  );
  assert.equal(
    isAiResourceVisibleForChannelVendorScope(embeddingsResource, ["openai"], ["embedding"]),
    true,
  );
});

test("admin channel AI resource filtering hides cross-capability groups for narrow accounts", () => {
  const allOpenAiApis = {
    groupCode: "api.openai_compatible.all",
    groupName: "All OpenAI Compatible APIs",
    vendorCodes: ["openai"],
    capabilities: ["llm", "image", "audio", "video", "embedding"],
  };

  assert.deepEqual(
    channelAiResourceGroupCapabilityCodes(allOpenAiApis),
    ["llm", "image", "audio", "video", "embedding"],
  );
  assert.equal(
    isAiResourceGroupVisibleForChannelVendorScope(allOpenAiApis, ["openai"], ["llm"]),
    false,
  );
  assert.equal(
    isAiResourceGroupVisibleForChannelVendorScope(
      allOpenAiApis,
      ["openai"],
      ["llm", "image", "audio", "video", "embedding"],
    ),
    true,
  );
});

test("admin channel AI resource filtering requires every summarized group vendor to match", () => {
  assert.equal(
    isAiResourceGroupVisibleForChannelVendorScope(
      {
        groupCode: "official.multi.full",
        groupName: "Multi Vendor Full",
        vendorCodes: ["openai", "anthropic"],
        capabilities: ["llm"],
      },
      ["openai"],
      ["llm"],
    ),
    false,
  );
});
