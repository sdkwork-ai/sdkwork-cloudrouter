import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import {
  buildApiCategorySidebarTree,
  buildApiReferenceSystemsFromTabs,
  createApiReferenceSystemSummaries,
  formatApiOperationDisplayName,
  getApiSystemDisplayName,
  getDefaultApiReferenceEndpoint,
  loadApiReferenceSystems,
  loadApiReferenceSchemaTabs,
  loadApiReferenceSystem,
  sortApiSchemaTabs,
  type ApiSchemaTab,
  type ApiSchemaTabsDocument,
} from "../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/apiReferenceSchemaTabs.ts";
import {
  APP_API_PREFIX,
  BACKEND_API_PREFIX,
  OPEN_API_PREFIX,
} from "./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts";
import {
  buildSdkReferenceSidebarTree,
  buildSdkReferenceSystems,
  createGeneratedSdkToolConfig,
  getGeneratedSdkMetadataForSystem,
  loadSdkReferenceSystem,
  loadSdkReferenceSystemSummaries,
} from "../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-sdk-reference/src/sdkReferenceRuntime.ts";
import {
  buildSdkEndpointDocumentation,
} from "../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-sdk-reference/src/sdkEndpointDocumentation.ts";
import {
  getSdkDataForSystem,
} from "../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-sdk-reference/src/data/sdkData.ts";
import {
  buildStaticCodeSnippet,
  joinRequestUrl,
} from "../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts";
import {
  createApiPlaygroundInitialState,
  createApiPlaygroundInitialStateKey,
  makeApiPlaygroundEmptyRow,
  makeApiPlaygroundSchemaRows,
  parseApiPlaygroundBulkRows,
} from "../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/apiPlaygroundRows.ts";
import {
  buildPlaygroundRequest,
} from "../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/playgroundRequest.ts";
import * as apiPlaygroundResponse from "../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/playgroundResponseDownload.ts";

if (!i18n.isInitialized) {
  void i18n
    .use(initReactI18next)
    .init({
      lng: "en",
      fallbackLng: "en",
      resources: { en: { translation: {} } },
      interpolation: { escapeValue: false },
      initImmediate: false,
    });
}

const { createApiPlaygroundResponseDownload } = apiPlaygroundResponse;
const apiReferencePageSource = () => readFileSync(
  new URL("../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/pages/ApiReference.tsx", import.meta.url),
  "utf8",
);
const sdkReferencePageSource = () => readFileSync(
  new URL("../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-sdk-reference/src/pages/SdkReference.tsx", import.meta.url),
  "utf8",
);
const sdkEndpointViewSource = () => readFileSync(
  new URL("../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-sdk-reference/src/components/SdkEndpointView.tsx", import.meta.url),
  "utf8",
);
const sdkReferenceGenerationServiceSource = () => readFileSync(
  new URL("../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-sdk-reference/src/sdkReferenceGenerationService.ts", import.meta.url),
  "utf8",
);
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");

function withClawRouterRuntimeEnv<T>(
  env: Record<string, string>,
  fn: () => T,
  origin = "https://portal.example.test",
): T {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    enumerable: true,
    value: {
      __CLAWROUTER_ENV__: env,
      location: { origin },
    },
  });

  try {
    return fn();
  } finally {
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, "window", originalWindowDescriptor);
    } else {
      delete (globalThis as { window?: Window }).window;
    }
  }
}

const gatewaySpec = {
  paths: {
    "/v1/chat/completions": {
      post: {
        operationId: "createChatCompletion",
        summary: "Create Chat Completion",
        tags: ["Chat"],
        responses: { "200": { description: "ok" } },
      },
    },
  },
};

const multimodalGatewaySpec = {
  components: {
    schemas: {
      JsonObject: {
        type: "object",
        additionalProperties: true,
        description: "Provider-specific JSON payload accepted by Claw Router.",
      },
      ProviderMultipartRequest: {
        type: "object",
        additionalProperties: true,
        required: ["file"],
        description: "Provider-specific multipart form fields and binary files.",
        properties: {
          file: { type: "string", format: "binary", description: "Binary file part sent to the upstream provider." },
          metadata: { type: "string", description: "Optional provider-specific metadata field." },
        },
      },
      ViduTextToVideoRequest: {
        type: "object",
        additionalProperties: true,
        required: ["model", "prompt"],
        properties: {
          model: { type: "string", description: "Vidu model name accepted by the upstream account." },
          prompt: { type: "string", description: "Text prompt sent to the Vidu API." },
          duration: { type: "integer", description: "Requested video duration in seconds." },
          seed: { type: "integer", format: "int64", description: "Optional deterministic seed." },
        },
      },
      ViduVideoGenerationTask: {
        type: "object",
        additionalProperties: true,
        properties: {
          task_id: { type: "string", description: "Vidu video task identifier." },
          state: { type: "string", description: "Vidu task state." },
          creations: {
            type: "array",
            description: "Generated media records when included by Vidu.",
            items: {
              type: "object",
              additionalProperties: true,
            },
          },
        },
      },
    },
  },
  paths: {
    "/vidu/ent/v2/reference2image": {
      post: {
        operationId: "viduCreateReferenceToImage",
        summary: "Vidu Reference To Image",
        tags: ["Images/vidu"],
        responses: { "200": { description: "ok" } },
      },
    },
    "/vidu/ent/v2/text2video": {
      post: {
        operationId: "viduCreateTextToVideo",
        summary: "Vidu Text To Video",
        tags: ["Videos/vidu"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ViduTextToVideoRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ViduVideoGenerationTask" },
              },
            },
          },
        },
      },
    },
    "/google/v1beta/files": {
      get: {
        operationId: "googleListFiles",
        summary: "Google Gemini List Files",
        tags: ["Files/google"],
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/JsonObject" },
              },
            },
          },
        },
      },
      post: {
        operationId: "googleUploadFile",
        summary: "Google Gemini Upload File",
        tags: ["Files/google"],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: { $ref: "#/components/schemas/ProviderMultipartRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/JsonObject" },
              },
            },
          },
        },
      },
    },
    "/anthropic/v1/files/{file_id}/content": {
      get: {
        operationId: "anthropicRetrieveFileContent",
        summary: "Anthropic Retrieve File Content",
        tags: ["Files/anthropic"],
        parameters: [
          { name: "file_id", in: "path", required: true, description: "Anthropic file identifier.", schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/octet-stream": {
                schema: { type: "string", format: "binary", description: "Raw file bytes returned by Anthropic." },
              },
            },
          },
        },
      },
    },
    "/anthropic/v1/messages": {
      post: {
        operationId: "anthropicCreateMessage",
        summary: "Anthropic Create Message",
        tags: ["Chat/anthropic"],
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/JsonObject" },
              },
            },
          },
        },
      },
    },
    "/v1/images/generations": {
      post: {
        operationId: "createImage",
        summary: "Create Image",
        tags: ["Images"],
        responses: { "200": { description: "ok" } },
      },
    },
    "/v1/videos": {
      post: {
        operationId: "createVideo",
        summary: "Create Video",
        tags: ["Videos"],
        responses: { "200": { description: "ok" } },
      },
    },
    "/v1/chat/completions": {
      post: {
        operationId: "createChatCompletion",
        summary: "Create Chat Completion",
        tags: ["Chat"],
        responses: { "200": { description: "ok" } },
      },
    },
  },
};

const conversationGatewaySpec = {
  components: {
    schemas: {
      OpenAiConversationCreateRequest: {
        type: "object",
        additionalProperties: true,
        properties: {
          metadata: {
            type: "object",
            additionalProperties: { type: "string" },
            description: "Conversation metadata.",
          },
          items: {
            type: "array",
            description: "Initial items to include in the conversation context.",
            items: { $ref: "#/components/schemas/OpenAiConversationItem" },
          },
        },
      },
      OpenAiConversation: {
        type: "object",
        additionalProperties: true,
        required: ["id", "object", "created_at"],
        properties: {
          id: { type: "string", description: "Conversation identifier." },
          object: { type: "string", enum: ["conversation"], description: "Object type." },
          created_at: { type: "integer", format: "int64", description: "Unix timestamp when the conversation was created." },
          metadata: { type: "object", additionalProperties: { type: "string" }, description: "Conversation metadata." },
        },
      },
      OpenAiConversationList: {
        type: "object",
        additionalProperties: false,
        required: ["object", "data"],
        properties: {
          object: { type: "string", enum: ["list"], description: "Object type." },
          data: {
            type: "array",
            description: "Conversation objects.",
            items: { $ref: "#/components/schemas/OpenAiConversation" },
          },
          first_id: { type: "string", description: "First conversation id in the page." },
          last_id: { type: "string", description: "Last conversation id in the page." },
          has_more: { type: "boolean", description: "Whether more conversations are available." },
        },
      },
      OpenAiConversationItem: {
        type: "object",
        additionalProperties: true,
        required: ["id", "type"],
        properties: {
          id: { type: "string", description: "Conversation item identifier." },
          type: { type: "string", description: "Conversation item type." },
          role: { type: "string", description: "Message role when this item is a message." },
          content: { type: "array", items: { type: "object", additionalProperties: true }, description: "Conversation item content." },
        },
      },
    },
  },
  paths: {
    "/v1/conversations": {
      get: {
        operationId: "listConversations",
        summary: "List conversations",
        description: "Lists conversations.",
        tags: ["Conversations"],
        parameters: [
          { name: "limit", in: "query", required: false, description: "Maximum number of objects to return.", schema: { type: "integer" } },
          { name: "order", in: "query", required: false, description: "Sort order by creation time.", schema: { type: "string", enum: ["asc", "desc"] } },
        ],
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/OpenAiConversationList" },
              },
            },
          },
        },
      },
      post: {
        operationId: "createConversation",
        summary: "Create conversation",
        description: "Creates a conversation.",
        tags: ["Conversations"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OpenAiConversationCreateRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/OpenAiConversation" },
              },
            },
          },
        },
      },
    },
    "/v1/conversations/{conversation_id}": {
      get: {
        operationId: "retrieveConversation",
        summary: "Retrieve conversation",
        description: "Retrieves a conversation.",
        tags: ["Conversations"],
        parameters: [
          { name: "conversation_id", in: "path", required: true, description: "Conversation identifier.", schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/OpenAiConversation" },
              },
            },
          },
        },
      },
    },
  },
};

const fineTuningGatewaySpec = {
  components: {
    schemas: {
      OpenAiFineTuningJobEventList: {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/OpenAiFineTuningJobEvent" },
          },
        },
      },
      OpenAiFineTuningJobEvent: {
        type: "object",
        properties: {
          id: { type: "string", description: "Event identifier." },
        },
      },
    },
  },
  paths: {
    "/v1/fine_tuning/jobs/{fine_tuning_job_id}/events": {
      get: {
        operationId: "listFineTuningEvents",
        summary: "List fine tuning events",
        description: "Lists fine tuning events.",
        tags: ["Fine Tuning"],
        parameters: [
          { name: "fine_tuning_job_id", in: "path", required: true, description: "Fine tuning job identifier.", schema: { type: "string" } },
          { name: "limit", in: "query", required: false, description: "Maximum number of objects to return.", schema: { type: "integer" } },
        ],
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/OpenAiFineTuningJobEventList" },
              },
            },
          },
        },
      },
    },
  },
};

const recursiveGatewaySpec = {
  components: {
    schemas: {
      RecursiveJsonSchemaAdditionalProperties: {
        oneOf: [
          { type: "boolean" },
          { $ref: "#/components/schemas/RecursiveJsonSchema" },
        ],
      },
      RecursiveJsonSchema: {
        type: "object",
        additionalProperties: true,
        properties: {
          type: {
            type: "string",
            description: "JSON schema primitive type.",
          },
          items: {
            allOf: [{ $ref: "#/components/schemas/RecursiveJsonSchema" }],
            description: "Nested schema item.",
          },
          properties: {
            type: "object",
            additionalProperties: {
              allOf: [{ $ref: "#/components/schemas/RecursiveJsonSchema" }],
              description: "Property schema map values.",
            },
          },
          additionalProperties: {
            allOf: [{ $ref: "#/components/schemas/RecursiveJsonSchemaAdditionalProperties" }],
            description: "Additional properties schema.",
          },
        },
      },
      RecursiveChatTool: {
        type: "object",
        required: ["name", "parameters"],
        properties: {
          name: { type: "string" },
          parameters: { $ref: "#/components/schemas/RecursiveJsonSchema" },
        },
      },
      RecursiveChatRequest: {
        type: "object",
        required: ["model", "tools"],
        properties: {
          model: { type: "string" },
          tools: {
            type: "array",
            items: { $ref: "#/components/schemas/RecursiveChatTool" },
          },
        },
      },
      RecursiveChatResponse: {
        type: "object",
        required: ["id", "schema"],
        properties: {
          id: { type: "string" },
          schema: {
            allOf: [{ $ref: "#/components/schemas/RecursiveJsonSchema" }],
            description: "Returned recursive schema.",
          },
        },
      },
    },
  },
  paths: {
    "/v1/chat/completions": {
      post: {
        operationId: "createRecursiveChatCompletion",
        summary: "Create Recursive Chat Completion",
        tags: ["Chat"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RecursiveChatRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RecursiveChatResponse" },
              },
            },
          },
        },
      },
    },
  },
};

const appSpec = {
  paths: {
    "/app/v3/api/ai/models": {
      get: {
        operationId: "listAppModels",
        summary: "List App Models",
        tags: ["Models"],
        responses: { "200": { description: "ok" } },
      },
    },
  },
};

const paymentAggregateSpec = JSON.parse(readFileSync(
  new URL("../../crates/sdkwork-claw-http/specs/payment-aggregate-openapi.json", import.meta.url),
  "utf8",
));
const paasSpec = JSON.parse(readFileSync(
  new URL("../../crates/sdkwork-claw-http/specs/paas-openapi.json", import.meta.url),
  "utf8",
));
const cloudStorageSpec = JSON.parse(readFileSync(
  new URL("../../crates/sdkwork-claw-http/specs/cloud-services-openapi.json", import.meta.url),
  "utf8",
));

test("api reference schema tabs sort by backend order and keep schema urls", () => {
  const tabs: ApiSchemaTab[] = [
    { id: "backend", name: "Backend API", order: 30, schemaUrls: ["/backend/v3/api/openapi.json"], defaultSchemaUrl: "/backend/v3/api/openapi.json" },
    { id: "gateway", name: "AI鑱氬悎API", order: 10, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
  ];

  assert.deepEqual(sortApiSchemaTabs(tabs).map((tab) => tab.id), ["gateway", "backend"]);
  assert.equal(sortApiSchemaTabs(tabs)[0].schemaUrls[0], "/openapi.json");
});

test("api reference lazy loader fetches the manifest first and one schema on demand", async () => {
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "gateway", name: "LLM Open API", order: 10, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
      { id: "app", name: "App API", order: 20, schemaUrls: ["/app/v3/api/openapi.json"], defaultSchemaUrl: "/app/v3/api/openapi.json" },
    ],
  };
  const requested: string[] = [];
  const fetchJson = async (url: string) => {
    requested.push(url);
    if (url === "/openapi/schema-tabs.json") return manifest;
    if (url === "/app/v3/api/openapi.json") return appSpec;
    throw new Error(`unexpected schema fetch ${url}`);
  };

  const loadedManifest = await loadApiReferenceSchemaTabs(fetchJson);
  const summaries = createApiReferenceSystemSummaries(loadedManifest);
  assert.deepEqual(requested, ["/openapi/schema-tabs.json"]);
  assert.equal(summaries[0].categories.length, 0);

  const appSystem = await loadApiReferenceSystem(summaries[1].schemaTab, fetchJson);
  assert.equal(appSystem.id, "app");
  assert.deepEqual(requested, ["/openapi/schema-tabs.json", "/app/v3/api/openapi.json"]);
});

test("sdk reference lazy loader also defers schemas until a system is selected", async () => {
  const manifest: ApiSchemaTabsDocument = {
    tabs: [
      { id: "gateway", name: "LLM Open API", order: 10, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
      { id: "app", name: "App API", order: 20, schemaUrls: ["/app/v3/api/openapi.json"], defaultSchemaUrl: "/app/v3/api/openapi.json" },
    ],
  };
  const requested: string[] = [];
  const fetchJson = async (url: string) => {
    requested.push(url);
    if (url === "/openapi/schema-tabs.json") return manifest;
    if (url === "/app/v3/api/openapi.json") return appSpec;
    throw new Error(`unexpected SDK schema fetch ${url}`);
  };

  const summaries = await loadSdkReferenceSystemSummaries(fetchJson);
  assert.deepEqual(requested, ["/openapi/schema-tabs.json"]);
  assert.deepEqual(summaries.map((system) => system.id), ["llm-open-api", "app-api"]);

  const appSystem = await loadSdkReferenceSystem(summaries[1], fetchJson);
  assert.equal(appSystem.id, "app-api");
  assert.deepEqual(requested, ["/openapi/schema-tabs.json", "/app/v3/api/openapi.json"]);
});

test("api reference builds one system per backend schema tab", async () => {
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "app", name: "App API", order: 20, schemaUrls: ["/app/v3/api/openapi.json"], defaultSchemaUrl: "/app/v3/api/openapi.json" },
      { id: "gateway", name: "AI鑱氬悎API", order: 10, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };

  const systems = await buildApiReferenceSystemsFromTabs(manifest, async (url) => {
    if (url === "/openapi.json") return gatewaySpec;
    if (url === "/app/v3/api/openapi.json") return appSpec;
    throw new Error(`unexpected url ${url}`);
  });

  assert.deepEqual(systems.map((system) => system.id), ["gateway", "app"]);
  assert.equal(systems[0].categories[0].name, "Chat");
  assert.equal(systems[1].categories[0].endpoints[0].path, "/app/v3/api/ai/models");
});

test("api reference loads available payment aggregate, paas, cloud storage and app schemas", async () => {
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      {
        id: "app",
        name: "App API",
        order: 50,
        schemaUrls: ["/app/v3/api/openapi.json"],
        defaultSchemaUrl: "/app/v3/api/openapi.json",
      },
      {
        id: "paas-api",
        name: "PaaS API",
        order: 30,
        schemaUrls: ["/paas/v3/openapi.json"],
        defaultSchemaUrl: "/paas/v3/openapi.json",
        status: "available",
        description: "PaaS aggregation APIs cover OCR, face verification, content safety, and document intelligence.",
        serviceGroups: [
          {
            code: "ocr",
            name: "OCR璇嗗埆",
            providerCodes: ["baidu", "alibaba", "tencent"],
            operations: ["general_text", "document_text", "id_card", "bank_card", "business_license"],
          },
          {
            code: "face_compare",
            name: "浜鸿劯姣斿",
            providerCodes: ["baidu", "alibaba", "tencent"],
            operations: ["one_to_one", "one_to_many", "quality_check"],
          },
          {
            code: "face_liveness_verification",
            name: "浜鸿劯鏍歌韩",
            providerCodes: ["baidu", "alibaba", "tencent"],
            operations: ["liveness_detection", "id_verification", "video_liveness"],
          },
          {
            code: "content_moderation",
            name: "鍐呭瀹夊叏",
            providerCodes: ["baidu", "alibaba", "tencent"],
            operations: ["image_moderation", "text_moderation", "audio_moderation", "video_moderation"],
          },
        ],
      },
      {
        id: "cloud-services",
        name: "鍩虹浜戞湇鍔PI",
        order: 40,
        schemaUrls: ["/cloud/v3/openapi.json"],
        defaultSchemaUrl: "/cloud/v3/openapi.json",
        status: "available",
        description: "S3-compatible object storage APIs expose bucket, object, multipart, presigned URL, and browser SDK config contracts.",
        serviceGroups: [
          {
            code: "object_storage",
            name: "S3 Object Storage",
            description: "S3-compatible cloud object storage.",
            providerCodes: ["aws_s3", "minio", "cloudflare_r2", "aliyun_oss", "tencent_cos", "huawei_obs", "volcengine_tos", "baidu_bos"],
            operations: ["s3_bucket_list", "s3_bucket_create", "s3_bucket_acl", "s3_bucket_tagging", "s3_object_list", "s3_object_put", "s3_object_batch_delete", "s3_object_acl", "s3_object_tagging", "s3_multipart_upload", "s3_multipart_upload_list", "s3_presigned_url", "s3_presigned_post", "s3_browser_sdk_config", "s3_temporary_credentials", "s3_checksum", "s3_server_side_encryption"],
          },
          {
            code: "cloud_compute",
            name: "Cloud Compute",
            description: "Unified IaaS compute lifecycle APIs.",
            providerCodes: ["aws_ec2", "azure_compute", "gcp_compute", "alicloud_ecs", "tencent_cvm", "huawei_ecs", "volcengine_ecs"],
            operations: ["compute_instance_list", "compute_instance_create", "compute_instance_lifecycle", "compute_instance_resize", "compute_image_list", "compute_flavor_list", "compute_ssh_key", "compute_security_group", "compute_volume"],
          },
          {
            code: "container_runtime",
            name: "Container Runtime",
            description: "Provider-backed container runtime APIs.",
            providerCodes: ["aws_ec2", "azure_compute", "gcp_compute", "alicloud_ecs", "tencent_cvm", "huawei_ecs", "volcengine_ecs"],
            operations: ["container_create", "container_actions"],
          },
          {
            code: "deployment_orchestration",
            name: "Deployment Orchestration",
            description: "Cloud deployment application, release, and rollout APIs.",
            providerCodes: ["aws_ec2", "azure_compute", "gcp_compute", "alicloud_ecs", "tencent_cvm", "huawei_ecs", "volcengine_ecs"],
            operations: ["deployment_application", "deployment_release", "deployment_rollout"],
          },
        ],
      },
      {
        id: "gateway",
        name: "AI鑱氬悎API",
        order: 10,
        schemaUrls: ["/openapi.json"],
        defaultSchemaUrl: "/openapi.json",
      },
      {
        id: "payment-aggregate",
        name: "鏀粯鑱氬悎API",
        order: 20,
        schemaUrls: ["/payments/v3/openapi.json"],
        defaultSchemaUrl: "/payments/v3/openapi.json",
        status: "available",
        description: "Payment aggregation APIs expose unified payment channel contracts.",
      },
    ],
  };
  const requested: string[] = [];

  const systems = await buildApiReferenceSystemsFromTabs(manifest, async (url) => {
    requested.push(url);
    if (url === "/openapi.json") return gatewaySpec;
    if (url === "/payments/v3/openapi.json") return paymentAggregateSpec;
    if (url === "/paas/v3/openapi.json") return paasSpec;
    if (url === "/cloud/v3/openapi.json") return cloudStorageSpec;
    if (url === "/app/v3/api/openapi.json") return appSpec;
    throw new Error(`unexpected schema fetch ${url}`);
  });

  assert.deepEqual(systems.map((system) => system.id), ["gateway", "payment-aggregate", "paas-api", "cloud-services", "app"]);
  assert.deepEqual(requested, ["/openapi.json", "/payments/v3/openapi.json", "/paas/v3/openapi.json", "/cloud/v3/openapi.json", "/app/v3/api/openapi.json"]);
  assert.equal(getApiSystemDisplayName(systems[0]), "LLM Open API");
  assert.equal(systems[0].requestBaseUrl, "/v1");
  assert.equal(systems[1].status, "available");
  assert.equal(systems[1].schemaUrl, "/payments/v3/openapi.json");
  assert.equal(systems[1].requestBaseUrl, "/payments/v3");
  assert.equal(systems[1].categories.some((category) => category.name === "Payments/Intents"), true);
  assert.equal(getDefaultApiReferenceEndpoint(systems[1])?.path, "/payments/v3/payment_intents");
  const paymentEndpointIds = systems[1].categories.flatMap((category) => category.endpoints.map((endpoint) => endpoint.id));
  assert.equal(paymentEndpointIds.includes("paymentIntents.capture"), true);
  assert.equal(paymentEndpointIds.includes("paymentReconciliationTasks.differences.list"), true);
  assert.equal(paymentEndpointIds.includes("paymentWebhooks.events.create"), true);
  assert.equal(systems[2].status, "available");
  assert.equal(systems[2].schemaUrl, "/paas/v3/openapi.json");
  assert.equal(systems[2].requestBaseUrl, "/paas/v3");
  assert.equal(systems[2].categories.some((category) => category.name === "PaaS/OCR"), true);
  assert.equal(systems[2].categories.some((category) => category.name === "PaaS/Face"), true);
  assert.deepEqual(systems[2].serviceGroups.map((group) => group.code), ["ocr", "face_compare", "face_liveness_verification", "content_moderation"]);
  assert.deepEqual(systems[2].serviceGroups[0].providerCodes, ["baidu", "alibaba", "tencent"]);
  assert.deepEqual(systems[2].serviceGroups[1].operations, ["one_to_one", "one_to_many", "quality_check"]);
  assert.equal(getDefaultApiReferenceEndpoint(systems[2])?.path, "/paas/v3/ocr/recognitions");
  const paasSidebar = buildApiCategorySidebarTree(systems[2].categories);
  const paasRoot = paasSidebar.find((node) => node.fullName === "PaaS");
  assert.deepEqual(paasRoot?.children.slice(0, 2).map((node) => node.fullName), ["PaaS/OCR", "PaaS/Face"]);
  assert.equal(systems[3].status, "available");
  assert.equal(systems[3].schemaUrl, "/cloud/v3/openapi.json");
  assert.equal(systems[3].requestBaseUrl, "/cloud/v3");
  assert.equal(systems[3].openApiSpec?.["x-s3-compatible"], true);
  assert.equal(systems[3].categories.some((category) => category.name === "Cloud Storage/S3 Buckets"), true);
  assert.equal(systems[3].categories.some((category) => category.name === "Cloud Storage/S3 Presigned"), true);
  assert.equal(systems[3].categories.some((category) => category.name === "Cloud IaaS/Compute Instances"), true);
  assert.equal(systems[3].categories.some((category) => category.name === "Cloud IaaS/Containers"), true);
  assert.equal(systems[3].categories.some((category) => category.name === "Cloud IaaS/Deployments"), true);
  assert.deepEqual(systems[3].serviceGroups.map((group) => group.code), ["object_storage", "cloud_compute", "container_runtime", "deployment_orchestration"]);
  assert.deepEqual(systems[3].serviceGroups[0].providerCodes, ["aws_s3", "minio", "cloudflare_r2", "aliyun_oss", "tencent_cos", "huawei_obs", "volcengine_tos", "baidu_bos"]);
  assert.equal(systems[3].serviceGroups[0].operations.includes("s3_object_batch_delete"), true);
  assert.equal(systems[3].serviceGroups[0].operations.includes("s3_server_side_encryption"), true);
  assert.deepEqual(systems[3].serviceGroups[1].providerCodes, ["aws_ec2", "azure_compute", "gcp_compute", "alicloud_ecs", "tencent_cvm", "huawei_ecs", "volcengine_ecs"]);
  assert.equal(systems[3].serviceGroups[1].operations.includes("compute_instance_create"), true);
  assert.equal(systems[3].serviceGroups[1].operations.includes("compute_volume"), true);
  assert.equal(systems[3].serviceGroups[2].operations.includes("container_actions"), true);
  assert.equal(systems[3].serviceGroups[3].operations.includes("deployment_release"), true);
  const cloudEndpointIds = systems[3].categories.flatMap((category) => category.endpoints.map((endpoint) => endpoint.id));
  assert.equal(cloudEndpointIds.includes("cloudStorageBuckets.acl.retrieve"), true);
  assert.equal(cloudEndpointIds.includes("cloudStorageObjects.batchDelete"), true);
  assert.equal(cloudEndpointIds.includes("cloudStorageMultipartUploads.list"), true);
  assert.equal(cloudEndpointIds.includes("cloudIaasComputeInstances.create"), true);
  assert.equal(cloudEndpointIds.includes("cloudIaasContainers.actions.invoke"), true);
  assert.equal(cloudEndpointIds.includes("cloudIaasDeploymentReleases.create"), true);
  assert.equal(getDefaultApiReferenceEndpoint(systems[3])?.path, "/cloud/v3/storage/providers");
  const cloudSidebar = buildApiCategorySidebarTree(systems[3].categories);
  const cloudRoot = cloudSidebar.find((node) => node.fullName === "Cloud Storage");
  assert.deepEqual(cloudRoot?.children.slice(0, 3).map((node) => node.fullName), ["Cloud Storage/S3 Providers", "Cloud Storage/S3 SDK", "Cloud Storage/S3 Buckets"]);
  const cloudIaasRoot = cloudSidebar.find((node) => node.fullName === "Cloud IaaS");
  assert.deepEqual(cloudIaasRoot?.children.slice(0, 3).map((node) => node.fullName), ["Cloud IaaS/Providers", "Cloud IaaS/Regions", "Cloud IaaS/Compute Instances"]);
  assert.equal(systems[4].requestBaseUrl, "/app/v3/api");
});

test("api reference systems derive request base urls per API surface", async () => {
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "gateway", name: "AI鑱氬悎API", order: 10, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
      { id: "payment-aggregate", name: "鏀粯鑱氬悎API", order: 20, schemaUrls: ["/payments/v3/openapi.json"], defaultSchemaUrl: "/payments/v3/openapi.json" },
      { id: "app", name: "App API", order: 30, schemaUrls: ["/app/v3/api/openapi.json"], defaultSchemaUrl: "/app/v3/api/openapi.json" },
      { id: "backend", name: "Backend API", order: 40, schemaUrls: ["/backend/v3/api/openapi.json"], defaultSchemaUrl: "/backend/v3/api/openapi.json" },
    ],
  };

  const systems = await buildApiReferenceSystemsFromTabs(manifest, async (url) => {
    if (url === "/openapi.json") return gatewaySpec;
    if (url === "/payments/v3/openapi.json") return paymentAggregateSpec;
    if (url === "/app/v3/api/openapi.json") return appSpec;
    if (url === "/backend/v3/api/openapi.json") return appSpec;
    throw new Error(`unexpected schema fetch ${url}`);
  });
  const requestBaseUrlById = new Map(systems.map((system) => [system.id, system.requestBaseUrl]));

  assert.equal(requestBaseUrlById.get("gateway"), OPEN_API_PREFIX);
  assert.equal(requestBaseUrlById.get("payment-aggregate"), "/payments/v3");
  assert.equal(requestBaseUrlById.get("app"), APP_API_PREFIX);
  assert.equal(requestBaseUrlById.get("backend"), BACKEND_API_PREFIX);
});

test("api reference schema tabs source uses commons SDK prefix boundary instead of local business prefix literals", () => {
  const source = readFileSync(
    new URL("../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/apiReferenceSchemaTabs.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /from '@sdkwork\/clawroutes-pc-commons\/runtime'/);
  assert.match(source, /\bAPP_API_PREFIX\b/);
  assert.match(source, /\bBACKEND_API_PREFIX\b/);
  assert.match(source, /\bOPEN_API_PREFIX\b/);
  assert.doesNotMatch(source, /return '\/app\/v3\/api';/);
  assert.doesNotMatch(source, /return '\/backend\/v3\/api';/);
  assert.doesNotMatch(source, /return '\/v1';/);
});

test("api reference formats operation summaries as stable display titles", () => {
  assert.equal(formatApiOperationDisplayName("Create chat completion"), "Create Chat Completion");
  assert.equal(formatApiOperationDisplayName("Google Gemini stream generate content"), "Google Gemini Stream Generate Content");
  assert.equal(formatApiOperationDisplayName("POST /v1/chat/completions"), "POST /v1/chat/completions");
});

test("api reference defaults gateway display to LLM Open API and opens chat completions first", async () => {
  const gatewayOpenApi = JSON.parse(readFileSync(
    new URL("./public/openapi.json", import.meta.url),
    "utf8",
  ));
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "llm-open-api", name: "LLM Open API", order: 10, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };

  const systems = await buildApiReferenceSystemsFromTabs(manifest, async (url) => {
    if (url === "/openapi.json") return gatewayOpenApi;
    throw new Error(`unexpected url ${url}`);
  });
  const defaultEndpoint = getDefaultApiReferenceEndpoint(systems[0]);

  assert.equal(getApiSystemDisplayName(systems[0]), "LLM Open API");
  assert.equal(defaultEndpoint?.name, "Create Chat Completion");
  assert.equal(defaultEndpoint?.path, "/v1/chat/completions");
});

test("api reference page renders planned API groups as planned empty states", () => {
  const source = apiReferencePageSource();

  assert.equal(source.includes("activeSystemData?.status === 'planned'"), true);
  assert.equal(source.includes("system.status === 'planned'"), true);
  assert.equal(source.includes("api.planned.title"), true);
  assert.equal(source.includes("activeSystemData?.serviceGroups.length"), true);
  assert.equal(source.includes("group.providerCodes.map"), true);
  assert.equal(source.includes("group.operations.join"), true);
});

test("api reference endpoint view and playground use system request base urls instead of global API base url", () => {
  const endpointSource = readFileSync(
    new URL("../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiEndpointView.tsx", import.meta.url),
    "utf8",
  );
  const playgroundSource = readFileSync(
    new URL("../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiPlayground.tsx", import.meta.url),
    "utf8",
  );
  const pageSource = apiReferencePageSource();

  assert.equal(endpointSource.includes("requestBaseUrl"), true);
  assert.equal(endpointSource.includes("joinRequestUrl(API_BASE_URL, endpoint.path)"), false);
  assert.equal(endpointSource.includes("baseUrl: requestBaseUrl"), true);
  assert.equal(playgroundSource.includes("requestBaseUrl"), true);
  assert.equal(playgroundSource.includes("baseUrl: API_BASE_URL"), false);
  assert.equal(playgroundSource.includes("baseUrl: requestBaseUrl"), true);
  assert.equal(pageSource.includes("<ApiEndpointView"), true);
  assert.equal(pageSource.includes("requestBaseUrl={activeSystemData.requestBaseUrl}"), true);
});

test("sdk reference endpoint playground also threads system request base urls through the sdk endpoint view", () => {
  const sdkEndpointViewSource = readFileSync(
    new URL("../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-sdk-reference/src/components/SdkEndpointView.tsx", import.meta.url),
    "utf8",
  );
  const sdkReferencePageSource = readFileSync(
    new URL("../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-sdk-reference/src/pages/SdkReference.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(sdkEndpointViewSource.includes("requestBaseUrl: string;"), true);
  assert.equal(sdkEndpointViewSource.includes("requestBaseUrl={requestBaseUrl}"), true);
  assert.equal(sdkReferencePageSource.includes("requestBaseUrl={activeSystemData.requestBaseUrl}"), true);
});

test("api reference keeps vendor multimodal endpoints under their OpenAI modality groups", async () => {
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "gateway", name: "Claw Router Open API", order: 10, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };

  const systems = await buildApiReferenceSystemsFromTabs(manifest, async (url) => {
    if (url === "/openapi.json") return multimodalGatewaySpec;
    throw new Error(`unexpected url ${url}`);
  });

  assert.deepEqual(
    systems[0].categories.map((category) => category.name),
    ["Chat", "Chat/anthropic", "Images", "Images/vidu", "Videos", "Videos/vidu", "Files/anthropic", "Files/google"],
  );
  assert.equal(
    systems[0].categories.find((category) => category.name === "Images/vidu")?.endpoints[0].path,
    "/vidu/ent/v2/reference2image",
  );
  assert.equal(
    systems[0].categories.find((category) => category.name === "Videos/vidu")?.endpoints[0].path,
    "/vidu/ent/v2/text2video",
  );
  assert.equal(
    systems[0].categories.find((category) => category.name === "Files/google")?.endpoints[0].path,
    "/google/v1beta/files",
  );
});

test("api reference splits canonical open api tabs by media domain", async () => {
  const mediaGatewaySpec = {
    paths: {
      "/v1/chat/completions": {
        post: {
          operationId: "createChatCompletion",
          summary: "Create Chat Completion",
          tags: ["Chat"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/v1/images/generations": {
        post: {
          operationId: "createImageGeneration",
          summary: "Create Image Generation",
          tags: ["Images"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/vidu/ent/v2/text2video": {
        post: {
          operationId: "viduCreateTextToVideo",
          summary: "Vidu Text To Video",
          tags: ["Videos/vidu"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/v1/audio/transcriptions": {
        post: {
          operationId: "createAudioTranscription",
          summary: "Create Audio Transcription",
          tags: ["Audio"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/suno/v1/music": {
        post: {
          operationId: "sunoCreateMusic",
          summary: "Suno Create Music",
          tags: ["Music/suno"],
          responses: { "200": { description: "ok" } },
        },
      },
    },
  };
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "llm-open-api", name: "LLM Open API", order: 10, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
      { id: "image-open-api", name: "Image Open API", order: 20, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
      { id: "video-open-api", name: "Video Open API", order: 30, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
      { id: "audio-open-api", name: "Audio Open API", order: 40, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
      { id: "drive-open-api", name: "Drive Open API", order: 50, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };

  const systems = await buildApiReferenceSystemsFromTabs(manifest, async (url) => {
    if (url === "/openapi.json") return mediaGatewaySpec;
    throw new Error(`unexpected url ${url}`);
  });
  const pathsBySystem = new Map(systems.map((system) => [
    system.id,
    system.categories.flatMap((category) => category.endpoints.map((endpoint) => endpoint.path)).sort(),
  ]));
  const categoryNamesBySystem = new Map(systems.map((system) => [
    system.id,
    system.categories.map((category) => category.name),
  ]));

  assert.deepEqual(pathsBySystem.get("llm-open-api"), ["/v1/chat/completions"]);
  assert.deepEqual(pathsBySystem.get("image-open-api"), ["/v1/images/generations"]);
  assert.deepEqual(pathsBySystem.get("video-open-api"), ["/vidu/ent/v2/text2video"]);
  assert.deepEqual(pathsBySystem.get("audio-open-api"), ["/suno/v1/music", "/v1/audio/transcriptions"]);
  assert.deepEqual(categoryNamesBySystem.get("audio-open-api"), ["Audio", "Music/suno"]);
  assert.equal(pathsBySystem.get("llm-open-api")?.includes("/v1/images/generations"), false);
  assert.equal(pathsBySystem.get("llm-open-api")?.includes("/vidu/ent/v2/text2video"), false);
  assert.equal(pathsBySystem.get("llm-open-api")?.includes("/v1/audio/transcriptions"), false);
  assert.equal(pathsBySystem.get("llm-open-api")?.includes("/suno/v1/music"), false);
});

test("api reference splits canonical open api tabs by product capability domain", async () => {
  const productGatewaySpec = {
    paths: {
      "/v1/chat/completions": {
        post: {
          operationId: "createChatCompletion",
          summary: "Create Chat Completion",
          tags: ["Chat"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/v1/files": {
        post: {
          operationId: "uploadFile",
          summary: "Upload File",
          tags: ["Files"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/v1/uploads": {
        post: {
          operationId: "createUpload",
          summary: "Create Upload",
          tags: ["Uploads"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/v1/vector_stores": {
        post: {
          operationId: "createVectorStore",
          summary: "Create Vector Store",
          tags: ["Vector Stores"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/v1/vector_stores/{vector_store_id}/search": {
        post: {
          operationId: "searchVectorStore",
          summary: "Search Vector Store",
          tags: ["Vector Stores"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/v1/conversations": {
        post: {
          operationId: "createConversation",
          summary: "Create Conversation",
          tags: ["Conversations"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/v1/assistants": {
        post: {
          operationId: "createAssistant",
          summary: "Create Assistant",
          tags: ["Assistants"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/v1/threads/{thread_id}/runs": {
        post: {
          operationId: "createThreadRun",
          summary: "Create Thread Run",
          tags: ["Assistants"],
          responses: { "200": { description: "ok" } },
        },
      },
    },
  };
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "llm-open-api", name: "LLM Open API", order: 10, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
      { id: "drive-open-api", name: "Drive Open API", order: 50, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
      { id: "knowledgebase-open-api", name: "Knowledgebase Open API", order: 60, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
      { id: "memory-open-api", name: "Memory Open API", order: 70, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
      { id: "agent-open-api", name: "Agent Open API", order: 80, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };

  const systems = await buildApiReferenceSystemsFromTabs(manifest, async (url) => {
    if (url === "/openapi.json") return productGatewaySpec;
    throw new Error(`unexpected url ${url}`);
  });
  const pathsBySystem = new Map(systems.map((system) => [
    system.id,
    system.categories.flatMap((category) => category.endpoints.map((endpoint) => endpoint.path)).sort(),
  ]));
  const categoryNamesBySystem = new Map(systems.map((system) => [
    system.id,
    system.categories.map((category) => category.name),
  ]));

  assert.deepEqual(pathsBySystem.get("llm-open-api"), ["/v1/chat/completions"]);
  assert.deepEqual(pathsBySystem.get("drive-open-api"), ["/v1/files", "/v1/uploads"]);
  assert.deepEqual(pathsBySystem.get("knowledgebase-open-api"), [
    "/v1/vector_stores",
    "/v1/vector_stores/{vector_store_id}/search",
  ]);
  assert.deepEqual(pathsBySystem.get("memory-open-api"), ["/v1/conversations"]);
  assert.deepEqual(pathsBySystem.get("agent-open-api"), ["/v1/assistants", "/v1/threads/{thread_id}/runs"]);
  assert.deepEqual(categoryNamesBySystem.get("drive-open-api"), ["Files", "Uploads"]);
  assert.deepEqual(categoryNamesBySystem.get("knowledgebase-open-api"), ["Vector Stores"]);
  assert.deepEqual(categoryNamesBySystem.get("memory-open-api"), ["Conversations"]);
  assert.deepEqual(categoryNamesBySystem.get("agent-open-api"), ["Assistants"]);
});

test("api reference shows Google Gemini content endpoints under chat", async () => {
  const gatewayOpenApi = JSON.parse(readFileSync(
    new URL("./public/openapi.json", import.meta.url),
    "utf8",
  ));
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "llm-open-api", name: "LLM Open API", order: 10, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };
  const systems = await buildApiReferenceSystemsFromTabs(manifest, async (url) => {
    if (url === "/openapi.json") return gatewayOpenApi;
    throw new Error(`unexpected url ${url}`);
  });
  const sidebarTree = buildApiCategorySidebarTree(systems[0].categories);
  const chat = sidebarTree.find((node) => node.name === "Chat");
  const google = chat?.children.find((node) => node.name === "google");
  const googlePaths = google?.endpoints.map((endpoint) => endpoint.path).sort();

  assert.ok(google);
  assert.deepEqual(googlePaths, [
    "/google/v1beta/models/{model}:countTokens",
    "/google/v1beta/models/{model}:generateContent",
    "/google/v1beta/models/{model}:streamGenerateContent",
  ]);
});

test("api reference sidebar builds nested modality vendor tree", async () => {
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "gateway", name: "Claw Router Open API", order: 10, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };

  const systems = await buildApiReferenceSystemsFromTabs(manifest, async (url) => {
    if (url === "/openapi.json") return multimodalGatewaySpec;
    throw new Error(`unexpected url ${url}`);
  });

  const tree = buildApiCategorySidebarTree(systems[0].categories);

  assert.deepEqual(tree.map((node) => node.name), ["Chat", "Images", "Videos", "Files"]);

  const images = tree.find((node) => node.name === "Images");
  assert.ok(images);
  assert.deepEqual(images.children.map((node) => node.name), ["vidu"]);
  assert.equal(images.endpoints[0].path, "/v1/images/generations");
  assert.equal(images.children[0].endpoints[0].path, "/vidu/ent/v2/reference2image");
  assert.equal(images.totalEndpoints, 2);

  const files = tree.find((node) => node.name === "Files");
  assert.ok(files);
  assert.equal(files.endpoints.length, 0);
  assert.deepEqual(files.children.map((node) => node.name), ["anthropic", "google"]);
  assert.equal(files.children.find((node) => node.name === "google")?.endpoints[0].path, "/google/v1beta/files");
  assert.equal(files.children.find((node) => node.name === "anthropic")?.endpoints[0].path, "/anthropic/v1/files/{file_id}/content");
  assert.equal(files.totalEndpoints, 3);

  const videos = tree.find((node) => node.name === "Videos");
  assert.ok(videos);
  assert.deepEqual(videos.children.map((node) => node.name), ["vidu"]);
  assert.equal(videos.endpoints[0].path, "/v1/videos");
  assert.equal(videos.children[0].fullName, "Videos/vidu");
  assert.equal(videos.children[0].endpoints[0].path, "/vidu/ent/v2/text2video");
  assert.equal(videos.totalEndpoints, 2);
});

test("api reference expands referenced request and response schemas into detailed fields", async () => {
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "gateway", name: "Claw Router Open API", order: 10, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };

  const systems = await buildApiReferenceSystemsFromTabs(manifest, async (url) => {
    if (url === "/openapi.json") return multimodalGatewaySpec;
    throw new Error(`unexpected url ${url}`);
  });

  const endpoint = systems[0].categories
    .flatMap((category) => category.endpoints)
    .find((item) => item.path === "/vidu/ent/v2/text2video");

  assert.ok(endpoint);
  assert.equal(endpoint.requestObject, "ViduTextToVideoRequest");
  assert.equal(endpoint.responseObject, "ViduVideoGenerationTask");
  assert.equal(endpoint.responseStatus, "200");
  assert.equal(endpoint.responseContentType, "application/json");
  assert.deepEqual(
    endpoint.body.map((param) => ({
      name: param.name,
      type: param.type,
      required: param.required,
      desc: param.desc,
    })),
    [
      {
        name: "model",
        type: "string",
        required: true,
        desc: "Vidu model name accepted by the upstream account.",
      },
      {
        name: "prompt",
        type: "string",
        required: true,
        desc: "Text prompt sent to the Vidu API.",
      },
      {
        name: "duration",
        type: "integer",
        required: false,
        desc: "Requested video duration in seconds.",
      },
      {
        name: "seed",
        type: "integer<int64>",
        required: false,
        desc: "Optional deterministic seed.",
      },
    ],
  );
  assert.deepEqual(
    endpoint.responseProperties?.map((param) => ({
      name: param.name,
      type: param.type,
      desc: param.desc,
      children: param.children?.map((child) => child.name),
    })),
    [
      {
        name: "task_id",
        type: "string",
        desc: "Vidu video task identifier.",
        children: undefined,
      },
      {
        name: "state",
        type: "string",
        desc: "Vidu task state.",
        children: undefined,
      },
      {
        name: "creations",
        type: "array<Record<string, unknown>>",
        desc: "Generated media records when included by Vidu.",
        children: ["*"],
      },
    ],
  );
  assert.equal(endpoint.response, '{\n  "task_id": "string",\n  "state": "string",\n  "creations": [\n    {}\n  ]\n}');
});

test("api reference resolves reusable OpenAPI parameters", async () => {
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "payment-aggregate", name: "鏀粯鑱氬悎API", order: 20, schemaUrls: ["/payments/v3/openapi.json"], defaultSchemaUrl: "/payments/v3/openapi.json" },
    ],
  };
  const spec = {
    components: {
      parameters: {
        PaymentIntentIdPath: {
          name: "paymentIntentId",
          in: "path",
          required: true,
          description: "SDKWork payment intent id.",
          schema: { type: "string" },
        },
      },
    },
    paths: {
      "/payments/v3/payment_intents/{paymentIntentId}": {
        get: {
          operationId: "retrievePaymentIntent",
          summary: "Retrieve Payment Intent",
          tags: ["Payments/Intents"],
          parameters: [
            { $ref: "#/components/parameters/PaymentIntentIdPath" },
          ],
          responses: { "200": { description: "ok" } },
        },
      },
    },
  };

  const systems = await buildApiReferenceSystemsFromTabs(manifest, async (url) => {
    if (url === "/payments/v3/openapi.json") return spec;
    throw new Error(`unexpected url ${url}`);
  });
  const endpoint = systems[0].categories[0].endpoints[0];

  assert.equal(endpoint.body.some((param) => (
    param.name === "paymentIntentId"
    && param.type === "string"
    && param.desc === "SDKWork payment intent id."
    && param.required === true
  )), true);
});

test("api and sdk reference builders render recursive schema tabs without overflowing the stack", async () => {
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "gateway", name: "Claw Router Open API", order: 10, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };
  const fetchJson = async (url: string) => {
    if (url === "/openapi.json") return recursiveGatewaySpec;
    throw new Error(`unexpected url ${url}`);
  };

  const apiSystems = await buildApiReferenceSystemsFromTabs(manifest, fetchJson);
  const sdkSystems = await buildSdkReferenceSystems(manifest, fetchJson);
  const apiEndpoint = apiSystems[0].categories.flatMap((category) => category.endpoints)[0];
  const sdkEndpoint = sdkSystems[0].categories.flatMap((category) => category.endpoints)[0];

  assert.equal(apiEndpoint.name, "Create Recursive Chat Completion");
  assert.equal(sdkEndpoint.name, "Create Recursive Chat Completion");
  assert.ok(apiEndpoint.body.some((param) => param.name === "tools"));
  assert.ok(apiEndpoint.responseProperties?.some((param) => param.name === "schema"));
  assert.deepEqual(
    apiEndpoint.body
      .find((param) => param.name === "tools")
      ?.children
      ?.find((param) => param.name === "parameters")
      ?.children
      ?.find((param) => param.name === "items")
      ?.children,
    [{
      name: "value",
      type: "object",
      desc: "Nested schema item.",
      required: false,
    }],
  );
});

test("api reference documents multipart request bodies and binary success responses", async () => {
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "gateway", name: "Claw Router Open API", order: 10, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };

  const systems = await buildApiReferenceSystemsFromTabs(manifest, async (url) => {
    if (url === "/openapi.json") return multimodalGatewaySpec;
    throw new Error(`unexpected url ${url}`);
  });

  const uploadEndpoint = systems[0].categories
    .flatMap((category) => category.endpoints)
    .find((item) => item.path === "/google/v1beta/files" && item.method === "POST");
  const binaryEndpoint = systems[0].categories
    .flatMap((category) => category.endpoints)
    .find((item) => item.path === "/anthropic/v1/files/{file_id}/content" && item.method === "GET");

  assert.ok(uploadEndpoint);
  assert.equal(uploadEndpoint.requestObject, "ProviderMultipartRequest");
  assert.equal(uploadEndpoint.body.some((param) => param.name === "file" && param.type === "string<binary>" && param.required), true);
  assert.equal(uploadEndpoint.body.some((param) => param.name === "metadata" && param.type === "string"), true);

  assert.ok(binaryEndpoint);
  assert.equal(binaryEndpoint.responseContentType, "application/octet-stream");
  assert.equal(binaryEndpoint.responseType, "string<binary>");
  assert.equal(binaryEndpoint.responseProperties?.some((param) => param.name === "value" && param.type === "string<binary>"), true);
});

test("api endpoint view exposes response object and renders response properties as a table", () => {
  const source = readFileSync(
    new URL("../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiEndpointView.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("Response Object"), true);
  assert.equal(source.includes("endpoint.responseObject"), true);
  assert.equal(source.includes("<table"), true);
  assert.equal(source.includes("<th className"), true);
  assert.equal(source.includes("Response Properties"), true);
});

test("api endpoint view keeps response object and properties table visible for empty response schemas", () => {
  const source = readFileSync(
    new URL("../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiEndpointView.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("const responseProperties = endpoint.responseProperties ?? [];"), true);
  assert.equal(source.includes("endpoint.responseObject"), true);
  assert.equal(source.includes("<ParameterTable parameters={responseProperties} isResponse={true} />"), true);
  assert.equal(source.includes("No response parameters are defined for this response object."), true);
});

test("api reference documents JsonObject schemas as free-form objects instead of empty tables", async () => {
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "gateway", name: "Claw Router Open API", order: 10, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };

  const systems = await buildApiReferenceSystemsFromTabs(manifest, async (url) => {
    if (url === "/openapi.json") return multimodalGatewaySpec;
    throw new Error(`unexpected url ${url}`);
  });

  const endpoint = systems[0].categories
    .flatMap((category) => category.endpoints)
    .find((item) => item.path === "/google/v1beta/files");

  assert.ok(endpoint);
  assert.deepEqual(endpoint.responseProperties, [
    {
      name: "*",
      type: "Record<string, unknown>",
      desc: "Provider-specific JSON payload accepted by Claw Router.",
      required: false,
    },
  ]);
  assert.equal(endpoint.response, "{}");
});

test("api reference documents non-json success response schemas with their actual content type", async () => {
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "gateway", name: "Claw Router Open API", order: 10, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };
  const nonJsonResponseSpec = {
    components: {
      schemas: {
        SdpResponse: {
          type: "string",
          description: "WebRTC SDP answer returned as application/sdp.",
        },
      },
    },
    paths: {
      "/v1/realtime/calls": {
        post: {
          operationId: "createRealtimeCall",
          summary: "Create realtime call",
          tags: ["Realtime"],
          responses: {
            "201": {
              description: "ok",
              content: {
                "application/sdp": {
                  schema: { $ref: "#/components/schemas/SdpResponse" },
                },
              },
            },
          },
        },
      },
    },
  };

  const systems = await buildApiReferenceSystemsFromTabs(manifest, async (url) => {
    if (url === "/openapi.json") return nonJsonResponseSpec;
    throw new Error(`unexpected url ${url}`);
  });

  const endpoint = systems[0].categories[0].endpoints[0];

  assert.equal(endpoint.responseObject, "SdpResponse");
  assert.equal(endpoint.responseType, "string");
  assert.equal(endpoint.responseStatus, "201");
  assert.equal(endpoint.responseContentType, "application/sdp");
  assert.deepEqual(endpoint.responseProperties, [
    {
      name: "value",
      type: "string",
      desc: "WebRTC SDP answer returned as application/sdp.",
      required: false,
    },
  ]);
});

test("api reference request URLs avoid duplicating the version prefix", () => {
  const code = buildStaticCodeSnippet({
    path: "/v1/conversations",
    method: "get",
    operation: conversationGatewaySpec.paths["/v1/conversations"].get,
    pathItem: conversationGatewaySpec.paths["/v1/conversations"],
    baseUrl: "/v1",
    language: "typescript",
    library: "axios",
    openAPISpec: conversationGatewaySpec,
  });

  assert.equal(code.includes("/v1/v1/conversations"), false);
  assert.equal(code.includes('url: "/v1/conversations?limit=0&order=asc"'), true);
});

test("api reference static snippets use multipart form bodies for upload endpoints", () => {
  const code = buildStaticCodeSnippet({
    path: "/google/v1beta/files",
    method: "post",
    operation: multimodalGatewaySpec.paths["/google/v1beta/files"].post,
    pathItem: multimodalGatewaySpec.paths["/google/v1beta/files"],
    baseUrl: "https://api.example.test",
    language: "typescript",
    library: "fetch",
    openAPISpec: multimodalGatewaySpec,
  });

  assert.equal(code.includes("new FormData()"), true);
  assert.equal(code.includes('form.append("file"'), true);
  assert.equal(code.includes('Content-Type": "application/json"'), false);
  assert.equal(code.includes("JSON.stringify(requestBody)"), false);
});

test("api reference request URLs keep OpenAI and provider native base paths consistent", () => {
  assert.equal(joinRequestUrl("https://api.example.test", "/v1/conversations"), "https://api.example.test/v1/conversations");
  assert.equal(joinRequestUrl("https://api.example.test/v1", "/v1/conversations"), "https://api.example.test/v1/conversations");
  assert.equal(joinRequestUrl("https://api.example.test/proxy/v1", "/v1/conversations"), "https://api.example.test/proxy/v1/conversations");
  assert.equal(joinRequestUrl("/v1", "/v1/conversations"), "/v1/conversations");
  assert.equal(joinRequestUrl("/proxy/v1", "/v1/conversations"), "/proxy/v1/conversations");

  assert.equal(joinRequestUrl("https://api.example.test", "/google/v1beta/files"), "https://api.example.test/google/v1beta/files");
  assert.equal(joinRequestUrl("https://api.example.test/google", "/google/v1beta/files"), "https://api.example.test/google/v1beta/files");
  assert.equal(joinRequestUrl("https://api.example.test/proxy/v1", "/google/v1beta/files"), "https://api.example.test/proxy/google/v1beta/files");
  assert.equal(joinRequestUrl("https://api.example.test/proxy/google/v1beta", "/google/v1beta/files"), "https://api.example.test/proxy/google/v1beta/files");
  assert.equal(joinRequestUrl("/v1", "/google/v1beta/files"), "/google/v1beta/files");
  assert.equal(joinRequestUrl("/proxy/v1", "/google/v1beta/files"), "/proxy/google/v1beta/files");

  assert.equal(joinRequestUrl("https://api.example.test", "/anthropic/v1/messages"), "https://api.example.test/anthropic/v1/messages");
  assert.equal(joinRequestUrl("https://api.example.test/anthropic", "/anthropic/v1/messages"), "https://api.example.test/anthropic/v1/messages");
  assert.equal(joinRequestUrl("https://api.example.test/proxy/v1", "/anthropic/v1/messages"), "https://api.example.test/proxy/anthropic/v1/messages");
  assert.equal(joinRequestUrl("/v1", "/anthropic/v1/messages"), "/anthropic/v1/messages");
  assert.equal(joinRequestUrl("/proxy/v1", "/anthropic/v1/messages"), "/proxy/anthropic/v1/messages");

  assert.equal(joinRequestUrl("https://api.example.test/v1", "/vidu/ent/v2/text2video"), "https://api.example.test/vidu/ent/v2/text2video");
});

test("api playground request URLs follow the same OpenAI and provider native base path rules", () => {
  const openAi = buildPlaygroundRequest({
    baseUrl: "https://api.example.test/v1",
    endpoint: { method: "GET", path: "/v1/conversations" },
    pathParams: [],
    queryParams: [],
    headerParams: [],
    bodyValue: "",
    authType: "api_key",
    apiKey: "test-key",
  });
  const google = buildPlaygroundRequest({
    baseUrl: "/v1",
    endpoint: { method: "GET", path: "/google/v1beta/files" },
    pathParams: [],
    queryParams: [],
    headerParams: [],
    bodyValue: "",
    authType: "api_key",
    apiKey: "test-key",
  });
  const anthropic = buildPlaygroundRequest({
    baseUrl: "https://api.example.test/anthropic",
    endpoint: { method: "POST", path: "/anthropic/v1/messages" },
    pathParams: [],
    queryParams: [],
    headerParams: [],
    bodyValue: "{}",
    authType: "api_key",
    apiKey: "test-key",
  });

  assert.equal(openAi.ok, true);
  assert.equal(openAi.url, "https://api.example.test/v1/conversations");
  assert.equal(google.ok, true);
  assert.equal(google.url, "/google/v1beta/files");
  assert.equal(anthropic.ok, true);
  assert.equal(anthropic.url, "https://api.example.test/anthropic/v1/messages");
});

test("api reference expands conversations response objects and parameters", async () => {
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "gateway", name: "Claw Router Open API", order: 10, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };

  const systems = await buildApiReferenceSystemsFromTabs(manifest, async (url) => {
    if (url === "/openapi.json") return conversationGatewaySpec;
    throw new Error(`unexpected url ${url}`);
  });

  const listEndpoint = systems[0].categories
    .flatMap((category) => category.endpoints)
    .find((item) => item.path === "/v1/conversations" && item.method === "GET");
  const createEndpoint = systems[0].categories
    .flatMap((category) => category.endpoints)
    .find((item) => item.path === "/v1/conversations" && item.method === "POST");

  assert.ok(listEndpoint);
  assert.ok(createEndpoint);
  assert.equal(listEndpoint.responseObject, "OpenAiConversationList");
  assert.equal(listEndpoint.body.some((param) => param.name === "limit" && param.type === "integer"), true);
  assert.equal(listEndpoint.responseProperties?.some((param) => param.name === "data" && param.type === "array<OpenAiConversation>"), true);
  assert.equal(listEndpoint.responseProperties?.find((param) => param.name === "data")?.children?.some((child) => child.name === "id"), true);
  assert.equal(createEndpoint.requestObject, "OpenAiConversationCreateRequest");
  assert.equal(createEndpoint.responseObject, "OpenAiConversation");
  assert.equal(createEndpoint.body.some((param) => param.name === "items" && param.type === "array<OpenAiConversationItem>"), true);
  assert.equal(createEndpoint.responseProperties?.some((param) => param.name === "id" && param.type === "string"), true);
});

test("api reference falls back to legacy openapi when schema tabs manifest is unavailable", async () => {
  const requested: string[] = [];
  const systems = await loadApiReferenceSystems(async (url) => {
    requested.push(url);
    if (url === "/openapi/schema-tabs.json") {
      throw new Error("manifest unavailable");
    }
    return gatewaySpec;
  });

  assert.deepEqual(requested, ["/openapi/schema-tabs.json", "/openapi.json"]);
  assert.equal(systems.length, 1);
  assert.equal(systems[0].id, "llm-open-api");
  assert.equal(systems[0].categories[0].endpoints[0].name, "Create Chat Completion");
});

test("sdk reference reuses schema tabs and maps tabs to generated SDK metadata", async () => {
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "payment-aggregate", name: "鏀粯鑱氬悎API", order: 20, schemaUrls: ["/payments/v3/openapi.json"], defaultSchemaUrl: "/payments/v3/openapi.json", status: "available" },
      { id: "cloud-services", name: "鍩虹浜戞湇鍔PI", order: 30, schemaUrls: ["/cloud/v3/openapi.json"], defaultSchemaUrl: "/cloud/v3/openapi.json", status: "available" },
      { id: "app", name: "App API", order: 40, schemaUrls: ["/app/v3/api/openapi.json"], defaultSchemaUrl: "/app/v3/api/openapi.json" },
      { id: "backend", name: "Backend API", order: 50, schemaUrls: ["/backend/v3/api/openapi.json"], defaultSchemaUrl: "/backend/v3/api/openapi.json" },
    ],
  };

  const systems = await buildSdkReferenceSystems(manifest, async (url) => {
    if (url === "/payments/v3/openapi.json") return paymentAggregateSpec;
    if (url === "/cloud/v3/openapi.json") return cloudStorageSpec;
    if (url === "/app/v3/api/openapi.json") return appSpec;
    if (url === "/backend/v3/api/openapi.json") {
      return {
        paths: {
          "/backend/v3/api/iam/api_keys": {
            get: {
              operationId: "fetchApiKeysMap",
              summary: "Fetch API Keys",
              tags: ["API Keys"],
              responses: { "200": { description: "ok" } },
            },
          },
        },
      };
    }
    throw new Error(`unexpected sdk reference url ${url}`);
  });

  assert.deepEqual(systems.map((system) => system.id), ["payment-open-api", "iaas-open-api", "app-api", "backend-api"]);
  assert.equal(systems[0].schemaUrl, "/payments/v3/openapi.json");
  assert.equal(systems[0].requestBaseUrl, "/payments/v3");
  assert.equal(systems[0].categories.some((category) => category.name === "Payments/Intents"), true);
  assert.equal(systems[1].schemaUrl, "/cloud/v3/openapi.json");
  assert.equal(systems[1].requestBaseUrl, "/cloud/v3");
  assert.equal(systems[1].categories.some((category) => category.name === "Cloud Storage/S3 Buckets"), true);
  assert.equal(systems[2].categories[0].endpoints[0].path, "/app/v3/api/ai/models");
  assert.equal(getGeneratedSdkMetadataForSystem("payment-open-api").packageName, "@sdkwork/clawrouter-payment-sdk");
  assert.equal(getGeneratedSdkMetadataForSystem("iaas-open-api").packageName, "@sdkwork/clawrouter-cloud-services-sdk");
  assert.equal(getGeneratedSdkMetadataForSystem("app-api").packageName, "@sdkwork/clawrouter-app-sdk");
  assert.equal(getGeneratedSdkMetadataForSystem("backend-api").packageName, "@sdkwork/clawrouter-backend-sdk");

  const cloudConfig = createGeneratedSdkToolConfig("iaas-open-api", "typescript", "/cloud/v3/openapi.json");
  assert.equal(cloudConfig.sdkType, "iaas");
  assert.equal(cloudConfig.apiSpecPath, "/cloud/v3/openapi.json");
  assert.equal(cloudConfig.baseUrl, "/cloud/v3");
  assert.equal(cloudConfig.packageName, "@sdkwork/clawrouter-cloud-services-sdk");

  const config = createGeneratedSdkToolConfig("backend-api", "typescript", "/backend/v3/api/openapi.json");
  assert.equal(config.sdkType, "backend");
  assert.equal(config.apiSpecPath, "/backend/v3/api/openapi.json");
  assert.equal(config.packageName, "@sdkwork/clawrouter-backend-sdk");
});

test("sdk reference maps product open api tabs to generated open SDK metadata", async () => {
  const openApiSpec = {
    paths: {
      "/v1/files": {
        get: {
          operationId: "listFiles",
          summary: "List Files",
          tags: ["Files"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/v1/vector_stores": {
        get: {
          operationId: "listVectorStores",
          summary: "List Vector Stores",
          tags: ["Vector Stores"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/v1/conversations": {
        get: {
          operationId: "listConversations",
          summary: "List Conversations",
          tags: ["Conversations"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/v1/assistants": {
        get: {
          operationId: "listAssistants",
          summary: "List Assistants",
          tags: ["Assistants"],
          responses: { "200": { description: "ok" } },
        },
      },
    },
  };
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "drive-open-api", name: "Drive Open API", order: 50, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
      { id: "knowledgebase-open-api", name: "Knowledgebase Open API", order: 60, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
      { id: "memory-open-api", name: "Memory Open API", order: 70, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
      { id: "agent-open-api", name: "Agent Open API", order: 80, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };

  const systems = await buildSdkReferenceSystems(manifest, async (url) => {
    if (url === "/openapi.json") return openApiSpec;
    throw new Error(`unexpected sdk reference url ${url}`);
  });

  assert.deepEqual(systems.map((system) => system.id), [
    "drive-open-api",
    "knowledgebase-open-api",
    "memory-open-api",
    "agent-open-api",
  ]);
  assert.equal(systems[0].categories[0].endpoints[0].path, "/v1/files");
  assert.equal(systems[1].categories[0].endpoints[0].path, "/v1/vector_stores");
  assert.equal(systems[2].categories[0].endpoints[0].path, "/v1/conversations");
  assert.equal(systems[3].categories[0].endpoints[0].path, "/v1/assistants");
  assert.equal(getGeneratedSdkMetadataForSystem("drive-open-api").packageName, "@sdkwork-internal/drive-sdk-generated");
  assert.equal(getGeneratedSdkMetadataForSystem("knowledgebase-open-api").packageName, "@sdkwork/clawrouter-open-sdk");
  assert.equal(getGeneratedSdkMetadataForSystem("memory-open-api").packageName, "@sdkwork/memory-sdk");
  assert.equal(getGeneratedSdkMetadataForSystem("agent-open-api").packageName, "@sdkwork/agent-sdk");

  const driveConfig = createGeneratedSdkToolConfig("drive-open-api", "typescript", "/openapi.json");
  assert.equal(driveConfig.name, "SdkworkDriveOpenClient");
  assert.equal(driveConfig.sdkType, "drive");
  assert.equal(driveConfig.apiPrefix, "/open/v3/api");
  assert.equal(driveConfig.baseUrl, "https://api.sdkwork.com");

  const knowledgebaseConfig = createGeneratedSdkToolConfig("knowledgebase-open-api", "typescript", "/openapi.json");
  assert.equal(knowledgebaseConfig.name, "SdkworkAiClient");
  assert.equal(knowledgebaseConfig.sdkType, "ai");
  assert.equal(knowledgebaseConfig.apiPrefix, "");

  const memoryConfig = createGeneratedSdkToolConfig("memory-open-api", "typescript", "/openapi.json");
  assert.equal(memoryConfig.name, "SdkworkMemoryOpenClient");
  assert.equal(memoryConfig.sdkType, "memory");
  assert.equal(memoryConfig.apiPrefix, "/mem/v3/api");

  const agentConfig = createGeneratedSdkToolConfig("agent-open-api", "typescript", "/openapi.json");
  assert.equal(agentConfig.name, "SdkworkAgentClient");
  assert.equal(agentConfig.sdkType, "agent");
  assert.equal(agentConfig.apiPrefix, "/agent/v3/api");
});

test("sdk reference normalizes sdkwork canonical open api authority aliases", async () => {
  const openApiSpec = {
    openapi: "3.0.3",
    info: { title: "Alias Open API", version: "1.0.0" },
    paths: {
      "/v1/files": {
        get: {
          operationId: "listFiles",
          summary: "List Files",
          tags: ["Files"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/v1/vector_stores": {
        get: {
          operationId: "listVectorStores",
          summary: "List Vector Stores",
          tags: ["Vector Stores"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/v1/conversations": {
        get: {
          operationId: "listConversations",
          summary: "List Conversations",
          tags: ["Conversations"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/v1/assistants": {
        get: {
          operationId: "listAssistants",
          summary: "List Assistants",
          tags: ["Assistants"],
          responses: { "200": { description: "ok" } },
        },
      },
    },
  };
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "sdkwork-drive-open-api", name: "Drive Open API", order: 50, schemaUrls: ["/openapi.json"] },
      { id: "sdkwork-knowledgebase-open-api", name: "Knowledgebase Open API", order: 60, schemaUrls: ["/openapi.json"] },
      { id: "sdkwork-memory-open-api", name: "Memory Open API", order: 70, schemaUrls: ["/openapi.json"] },
      { id: "sdkwork-agent-open-api", name: "Agent Open API", order: 80, schemaUrls: ["/openapi.json"] },
    ],
  };

  const systems = await buildSdkReferenceSystems(manifest, async (url) => {
    if (url === "/openapi.json") return openApiSpec;
    throw new Error(`unexpected sdk reference url ${url}`);
  });

  assert.deepEqual(systems.map((system) => system.id), [
    "drive-open-api",
    "knowledgebase-open-api",
    "memory-open-api",
    "agent-open-api",
  ]);
});

test("sdk reference generates llm open api SDKs from domain-root paths", () => {
  const gatewayConfig = createGeneratedSdkToolConfig("llm-open-api", "typescript", "/openapi.json");
  const appConfig = createGeneratedSdkToolConfig("app-api", "typescript", "/app/v3/api/openapi.json");
  const gatewayTypescriptSdk = getSdkDataForSystem("llm-open-api").find((sdk) => sdk.id === "typescript");

  assert.ok(gatewayTypescriptSdk);
  assert.equal(gatewayConfig.baseUrl, "https://api.sdkwork.com");
  assert.equal(gatewayConfig.apiPrefix, "");
  assert.equal(gatewayConfig.apiSpecPath, "/openapi.json");
  assert.equal(appConfig.baseUrl, "/app/v3/api");
  assert.equal(appConfig.apiPrefix, "/app/v3/api");
  assert.equal(gatewayTypescriptSdk.initCode.includes('baseUrl: process.env.CLAWROUTER_API_BASE_URL ?? "https://api.sdkwork.com"'), true);
  assert.equal(gatewayTypescriptSdk.initCode.includes('?? "/v1"'), false);
});

test("sdk reference gateway base URL uses SDK-specific runtime override and falls back to public API base URL", () => {
  const inheritedConfig = withClawRouterRuntimeEnv(
    {
      VITE_API_BASE_URL: "https://tenant.example.com/v1",
    },
    () => createGeneratedSdkToolConfig("llm-open-api", "typescript", "/openapi.json"),
  );
  const overriddenConfig = withClawRouterRuntimeEnv(
    {
      VITE_API_BASE_URL: "https://tenant.example.com/v1",
      VITE_CLAWROUTER_OPEN_API_BASE_URL: "https://open.example.com/v1",
    },
    () => createGeneratedSdkToolConfig("llm-open-api", "typescript", "/openapi.json"),
  );

  assert.equal(inheritedConfig.baseUrl, "https://tenant.example.com");
  assert.equal(overriddenConfig.baseUrl, "https://open.example.com");
});

test("sdk reference gateway base URL does not collapse root-relative open API routes to empty config", () => {
  const inheritedConfig = withClawRouterRuntimeEnv(
    {
      VITE_API_BASE_URL: "/v1",
    },
    () => createGeneratedSdkToolConfig("llm-open-api", "typescript", "/openapi.json"),
    "https://tenant.example.test",
  );
  const overriddenConfig = withClawRouterRuntimeEnv(
    {
      VITE_API_BASE_URL: "https://tenant.example.com/v1",
      VITE_CLAWROUTER_OPEN_API_BASE_URL: "/v1",
    },
    () => createGeneratedSdkToolConfig("llm-open-api", "typescript", "/openapi.json"),
    "https://open.example.test",
  );

  assert.equal(inheritedConfig.baseUrl, "https://tenant.example.test");
  assert.equal(overriddenConfig.baseUrl, "https://open.example.test");
});

test("sdk reference canonical open api sidebars keep media out of llm", async () => {
  const sidebarGatewaySpec = {
    paths: {
      "/v1/chat/completions": {
        post: {
          operationId: "createChatCompletion",
          summary: "Create Chat Completion",
          tags: ["Chat"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/anthropic/v1/messages": {
        post: {
          operationId: "anthropicCreateMessage",
          summary: "Anthropic Create Message",
          tags: ["Chat/anthropic"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/v1/images/generations": {
        post: {
          operationId: "createImage",
          summary: "Create Image",
          tags: ["Images"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/vidu/ent/v2/reference2image": {
        post: {
          operationId: "viduCreateReferenceToImage",
          summary: "Vidu Reference To Image",
          tags: ["Images/vidu"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/v1/videos": {
        post: {
          operationId: "createVideo",
          summary: "Create Video",
          tags: ["Videos"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/vidu/ent/v2/text2video": {
        post: {
          operationId: "viduCreateTextToVideo",
          summary: "Vidu Text To Video",
          tags: ["Videos/vidu"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/v1/audio/speech": {
        post: {
          operationId: "createSpeech",
          summary: "Create Speech",
          tags: ["Audio"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/suno/v1/music/generations": {
        post: {
          operationId: "sunoCreateMusicGeneration",
          summary: "Suno Create Music Generation",
          tags: ["Music/suno"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/google/v1beta/files": {
        get: {
          operationId: "googleListFiles",
          summary: "Google Gemini List Files",
          tags: ["Files/google"],
          responses: { "200": { description: "ok" } },
        },
      },
      "/anthropic/v1/files/{file_id}/content": {
        get: {
          operationId: "anthropicRetrieveFileContent",
          summary: "Anthropic Retrieve File Content",
          tags: ["Files/anthropic"],
          responses: { "200": { description: "ok" } },
        },
      },
    },
  };
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "llm-open-api", name: "LLM Open API", order: 10, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
      { id: "image-open-api", name: "Image Open API", order: 20, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
      { id: "video-open-api", name: "Video Open API", order: 30, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
      { id: "audio-open-api", name: "Audio Open API", order: 40, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
      { id: "drive-open-api", name: "Drive Open API", order: 50, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };

  const systems = await buildSdkReferenceSystems(manifest, async (url) => {
    if (url === "/openapi.json") return sidebarGatewaySpec;
    throw new Error(`unexpected sdk reference url ${url}`);
  });

  const systemsById = new Map(systems.map((system) => [system.id, system]));
  const llmTree = buildSdkReferenceSidebarTree(systemsById.get("llm-open-api")?.categories ?? []);

  assert.deepEqual(llmTree.map((node) => node.name), ["Chat"]);

  const videosTree = buildSdkReferenceSidebarTree(systemsById.get("video-open-api")?.categories ?? []);
  const videos = videosTree.find((node) => node.name === "Videos");
  assert.ok(videos);
  assert.deepEqual(videos.children.map((node) => node.name), ["vidu"]);
  assert.equal(videos.endpoints[0].path, "/v1/videos");
  assert.equal(videos.children[0].fullName, "Videos/vidu");
  assert.equal(videos.children[0].endpoints[0].path, "/vidu/ent/v2/text2video");
  assert.equal(videos.totalEndpoints, 2);

  const imageTree = buildSdkReferenceSidebarTree(systemsById.get("image-open-api")?.categories ?? []);
  assert.deepEqual(imageTree.map((node) => node.name), ["Images"]);

  const audioTree = buildSdkReferenceSidebarTree(systemsById.get("audio-open-api")?.categories ?? []);
  assert.deepEqual(audioTree.map((node) => node.name), ["Audio", "Music"]);
  assert.equal(audioTree.find((node) => node.name === "Audio")?.endpoints[0].path, "/v1/audio/speech");
  assert.equal(audioTree.find((node) => node.name === "Music")?.children[0].fullName, "Music/suno");
  assert.equal(
    audioTree.find((node) => node.name === "Music")?.children[0].endpoints[0].path,
    "/suno/v1/music/generations",
  );

  const driveTree = buildSdkReferenceSidebarTree(systemsById.get("drive-open-api")?.categories ?? []);
  assert.deepEqual(driveTree.map((node) => node.name), ["Files"]);

  const files = driveTree.find((node) => node.name === "Files");
  assert.ok(files);
  assert.equal(files.endpoints.length, 0);
  assert.deepEqual(files.children.map((node) => node.name), ["anthropic", "google"]);
  assert.equal(files.children.find((node) => node.name === "google")?.fullName, "Files/google");
  assert.equal(files.children.find((node) => node.name === "google")?.endpoints[0].path, "/google/v1beta/files");
});

test("sdk reference endpoint documentation uses resolved schema details", async () => {
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "video-open-api", name: "Video Open API", order: 10, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };

  const systems = await buildSdkReferenceSystems(manifest, async (url) => {
    if (url === "/openapi.json") return multimodalGatewaySpec;
    throw new Error(`unexpected sdk reference url ${url}`);
  });

  const endpoint = systems[0].categories
    .flatMap((category) => category.endpoints)
    .find((item) => item.path === "/vidu/ent/v2/text2video");

  assert.ok(endpoint);
  const docs = buildSdkEndpointDocumentation(endpoint, {
    name: "SdkworkAiClient",
    packageName: "@sdkwork/clawrouter-open-sdk",
    baseUrl: "https://api.example.test",
  });

  assert.equal(docs.methodName, "create");
  assert.equal(docs.requestType, "ViduTextToVideoRequest");
  assert.equal(docs.responseType, "ViduVideoGenerationTask");
  assert.equal(docs.signature, "async create(body: ViduTextToVideoRequest): Promise<ViduVideoGenerationTask>");
  assert.equal(docs.parameters.some((param) => param.name === "model" && param.type === "string" && param.required), true);
  assert.equal(docs.parameters.some((param) => param.name === "prompt" && param.type === "string" && param.required), true);
  assert.equal(docs.returns.some((param) => param.name === "task_id" && param.type === "string"), true);
  assert.equal(docs.codeDefinition.includes("body: unknown"), false);
  assert.equal(docs.codeDefinition.includes("Promise<unknown>"), false);
  assert.equal(docs.exampleUsage.includes("client.videosVidu.ent.v2.text2video.create({"), true);
  assert.equal(docs.exampleUsage.includes("model: \"string\""), true);
  assert.equal(docs.exampleUsage.includes("null"), false);
});

test("sdk reference endpoint documentation keeps JsonObject as explicit free-form object", async () => {
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "drive-open-api", name: "Drive Open API", order: 50, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };

  const systems = await buildSdkReferenceSystems(manifest, async (url) => {
    if (url === "/openapi.json") return multimodalGatewaySpec;
    throw new Error(`unexpected sdk reference url ${url}`);
  });

  const endpoint = systems[0].categories
    .flatMap((category) => category.endpoints)
    .find((item) => item.path === "/google/v1beta/files");

  assert.ok(endpoint);
  const docs = buildSdkEndpointDocumentation(endpoint, {
    name: "SdkworkAiClient",
    packageName: "@sdkwork/clawrouter-open-sdk",
    baseUrl: "https://api.example.test",
  });

  assert.equal(docs.responseType, "Record<string, unknown>");
  assert.equal(docs.signature, "async list(): Promise<Record<string, unknown>>");
  assert.deepEqual(docs.returns, [
    {
      name: "*",
      type: "Record<string, unknown>",
      desc: "Provider-specific JSON payload accepted by Claw Router.",
      required: false,
    },
  ]);
  assert.equal(docs.exampleUsage.includes("client.filesGoogle.v1beta.files.list()"), true);
});

test("sdk reference endpoint documentation supports multipart requests and binary responses", async () => {
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "drive-open-api", name: "Drive Open API", order: 50, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };

  const systems = await buildSdkReferenceSystems(manifest, async (url) => {
    if (url === "/openapi.json") return multimodalGatewaySpec;
    throw new Error(`unexpected sdk reference url ${url}`);
  });

  const uploadEndpoint = systems[0].categories
    .flatMap((category) => category.endpoints)
    .find((item) => item.path === "/google/v1beta/files" && item.method === "POST");
  const binaryEndpoint = systems[0].categories
    .flatMap((category) => category.endpoints)
    .find((item) => item.path === "/anthropic/v1/files/{file_id}/content" && item.method === "GET");

  assert.ok(uploadEndpoint);
  assert.ok(binaryEndpoint);

  const sdkData = {
    name: "ClawRouterGatewaySdk",
    packageName: "@sdkwork/clawrouter-gateway-sdk",
    baseUrl: "https://api.example.test",
  };
  const uploadDocs = buildSdkEndpointDocumentation(uploadEndpoint, sdkData, "typescript");
  const binaryDocs = buildSdkEndpointDocumentation(binaryEndpoint, sdkData, "typescript");

  assert.equal(uploadDocs.requestType, "ProviderMultipartRequest");
  assert.equal(uploadDocs.parameters.some((param) => param.name === "file" && param.type === "string<binary>" && param.required), true);
  assert.equal(uploadDocs.codeDefinition.includes("@param body.file"), true);
  assert.equal(uploadDocs.exampleUsage.includes("client.filesGoogle.v1beta.files.create({"), true);

  assert.equal(binaryDocs.responseType, "Blob");
  assert.equal(binaryDocs.signature, "async content(fileId: string): Promise<Blob>");
  assert.equal(binaryDocs.returns.some((param) => param.name === "value" && param.type === "string<binary>"), true);
  assert.equal(binaryDocs.exampleUsage.includes('client.filesAnthropic.v1.files.content("file_id")'), true);
});

test("sdk endpoint view renders nested return fields instead of only top level rows", async () => {
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "memory-open-api", name: "Memory Open API", order: 70, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };

  const systems = await buildSdkReferenceSystems(manifest, async (url) => {
    if (url === "/openapi.json") return conversationGatewaySpec;
    throw new Error(`unexpected sdk reference url ${url}`);
  });

  const endpoint = systems[0].categories
    .flatMap((category) => category.endpoints)
    .find((item) => item.path === "/v1/conversations" && item.method === "GET");

  assert.ok(endpoint);
  const docs = buildSdkEndpointDocumentation(
    endpoint,
    {
      name: "ClawRouterGatewaySdk",
      packageName: "@sdkwork/clawrouter-gateway-sdk",
      baseUrl: "https://api.example.test",
    },
    "typescript",
  );
  const dataReturn = docs.returns.find((param) => param.name === "data");
  const source = sdkEndpointViewSource();

  assert.equal(dataReturn?.children?.some((child) => child.name === "id" && child.desc === "Conversation identifier."), true);
  assert.equal(source.includes("flattenSdkParameters(localDocumentation.returns)"), true);
  assert.equal(source.includes("`${name}[]`"), true);
});

test("sdk reference endpoint documentation follows the selected SDK language", async () => {
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "video-open-api", name: "Video Open API", order: 10, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };

  const systems = await buildSdkReferenceSystems(manifest, async (url) => {
    if (url === "/openapi.json") return multimodalGatewaySpec;
    throw new Error(`unexpected sdk reference url ${url}`);
  });

  const endpoint = systems[0].categories
    .flatMap((category) => category.endpoints)
    .find((item) => item.path === "/vidu/ent/v2/text2video");

  assert.ok(endpoint);
  const sdkData = {
    name: "SdkworkAiClient",
    packageName: "@sdkwork/clawrouter-open-sdk",
    baseUrl: "https://api.example.test",
  };
  const typescriptDocs = buildSdkEndpointDocumentation(endpoint, sdkData, "typescript");
  const pythonDocs = buildSdkEndpointDocumentation(endpoint, sdkData, "python");

  assert.notEqual(pythonDocs.codeDefinition, typescriptDocs.codeDefinition);
  assert.equal(typescriptDocs.languageLabel, "typescript");
  assert.equal(pythonDocs.languageLabel, "python");
  assert.equal(pythonDocs.methodName, "create");
  assert.equal(pythonDocs.signature, "def create(body: ViduTextToVideoRequest) -> ViduVideoGenerationTask");
  assert.equal(pythonDocs.codeDefinition.includes("async viduCreateTextToVideo"), false);
  assert.equal(pythonDocs.codeDefinition.includes("def create"), true);
  assert.equal(pythonDocs.exampleUsage.includes("client.videos_vidu.ent.v2.text2video.create({"), true);
});

test("sdk reference endpoint documentation includes path and query parameters", async () => {
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "memory-open-api", name: "Memory Open API", order: 70, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };

  const systems = await buildSdkReferenceSystems(manifest, async (url) => {
    if (url === "/openapi.json") return conversationGatewaySpec;
    throw new Error(`unexpected sdk reference url ${url}`);
  });

  const listEndpoint = systems[0].categories
    .flatMap((category) => category.endpoints)
    .find((item) => item.path === "/v1/conversations" && item.method === "GET");
  const retrieveEndpoint = systems[0].categories
    .flatMap((category) => category.endpoints)
    .find((item) => item.path === "/v1/conversations/{conversation_id}" && item.method === "GET");

  assert.ok(listEndpoint);
  assert.ok(retrieveEndpoint);

  const sdkData = {
    name: "ClawRouterGatewaySdk",
    packageName: "@sdkwork/clawrouter-gateway-sdk",
    baseUrl: "https://api.example.test",
  };
  const listDocs = buildSdkEndpointDocumentation(listEndpoint, sdkData, "typescript");
  const retrieveDocs = buildSdkEndpointDocumentation(retrieveEndpoint, sdkData, "python");

  assert.equal(listDocs.requestType, "ConversationListParams");
  assert.equal(listDocs.signature, "async list(params?: ConversationListParams): Promise<OpenAiConversationList>");
  assert.equal(listDocs.parameters.some((param) => param.name === "limit" && param.type === "integer"), true);
  assert.equal(listDocs.returns.some((param) => param.name === "data" && param.type === "array<OpenAiConversation>"), true);
  assert.equal(listDocs.exampleUsage.includes("client.conversation.list({"), true);
  assert.equal(retrieveDocs.signature, "def retrieve(conversation_id: str) -> OpenAiConversation");
  assert.equal(retrieveDocs.parameters.some((param) => param.name === "conversation_id" && param.required), true);
  assert.equal(retrieveDocs.exampleUsage.includes('client.conversation.retrieve("conversation_id")'), true);
});

test("sdk reference endpoint documentation derives gateway root from configured prefix paths", async () => {
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "gateway", name: "Claw Router Open API", order: 10, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };

  const systems = await buildSdkReferenceSystems(manifest, async (url) => {
    if (url === "/openapi.json") return {
      paths: {
        "/v1/evals": {
          get: {
            operationId: "listEvals",
            summary: "List evals",
            description: "Lists evals.",
            tags: ["Evaluations"],
            responses: { "200": { description: "ok" } },
          },
        },
      },
    };
    throw new Error(`unexpected sdk reference url ${url}`);
  });

  const endpoint = systems[0].categories
    .flatMap((category) => category.endpoints)
    .find((item) => item.path === "/v1/evals" && item.method === "GET");

  assert.ok(endpoint);

  const docs = buildSdkEndpointDocumentation(endpoint, {
    name: "ClawRouterGatewaySdk",
    packageName: "@sdkwork/clawrouter-gateway-sdk",
    baseUrl: "https://api.example.test",
  }, "typescript");

  assert.equal(docs.signature, "async list(): Promise<void>");
  assert.equal(docs.exampleUsage.includes("client.eval.list()"), true);
  assert.equal(docs.exampleUsage.includes("client.evaluations.list()"), false);
});

test("sdk reference endpoint documentation uses terminal collection action methods", async () => {
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "gateway", name: "Claw Router Open API", order: 10, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };

  const systems = await buildSdkReferenceSystems(manifest, async (url) => {
    if (url === "/openapi.json") return fineTuningGatewaySpec;
    throw new Error(`unexpected sdk reference url ${url}`);
  });

  const endpoint = systems[0].categories
    .flatMap((category) => category.endpoints)
    .find((item) => item.path === "/v1/fine_tuning/jobs/{fine_tuning_job_id}/events" && item.method === "GET");

  assert.ok(endpoint);

  const docs = buildSdkEndpointDocumentation(endpoint, {
    name: "ClawRouterGatewaySdk",
    packageName: "@sdkwork/clawrouter-gateway-sdk",
    baseUrl: "https://api.example.test",
  }, "typescript");

  assert.equal(
    docs.signature,
    "async listEvents(fineTuningJobId: string, params?: FineTuningJobsListEventsParams): Promise<OpenAiFineTuningJobEventList>",
  );
  assert.equal(docs.exampleUsage.includes('client.fineTuning.jobs.listEvents("fine_tuning_job_id", {'), true);
  assert.equal(docs.exampleUsage.includes("client.fineTuning.jobs.events.list"), false);
});

test("sdk reference endpoint examples use provider native base URLs when endpoints are vendor-prefixed", async () => {
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "llm-open-api", name: "LLM Open API", order: 10, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
      { id: "image-open-api", name: "Image Open API", order: 20, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
      { id: "drive-open-api", name: "Drive Open API", order: 50, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };

  const systems = await buildSdkReferenceSystems(manifest, async (url) => {
    if (url === "/openapi.json") return multimodalGatewaySpec;
    throw new Error(`unexpected sdk reference url ${url}`);
  });

  const systemsById = new Map(systems.map((system) => [system.id, system]));
  const googleEndpoint = systemsById.get("drive-open-api")?.categories
    .flatMap((category) => category.endpoints)
    .find((item) => item.path === "/google/v1beta/files");
  const anthropicEndpoint = systemsById.get("llm-open-api")?.categories
    .flatMap((category) => category.endpoints)
    .find((item) => item.path === "/anthropic/v1/messages");
  const openAiEndpoint = systemsById.get("image-open-api")?.categories
    .flatMap((category) => category.endpoints)
    .find((item) => item.path === "/v1/images/generations");

  assert.ok(googleEndpoint);
  assert.ok(anthropicEndpoint);
  assert.ok(openAiEndpoint);

  const sdkData = {
    name: "SdkworkAiClient",
    packageName: "@sdkwork/clawrouter-open-sdk",
    baseUrl: "https://api.example.test/v1",
  };
  const googleDocs = buildSdkEndpointDocumentation(googleEndpoint, sdkData, "typescript");
  const anthropicDocs = buildSdkEndpointDocumentation(anthropicEndpoint, sdkData, "typescript");
  const openAiDocs = buildSdkEndpointDocumentation(openAiEndpoint, sdkData, "typescript");

  assert.equal(googleDocs.exampleUsage.includes('baseUrl: "https://api.example.test/google"'), true);
  assert.equal(googleDocs.exampleUsage.includes('baseUrl: "https://api.example.test/v1"'), false);
  assert.equal(anthropicDocs.exampleUsage.includes('baseUrl: "https://api.example.test/anthropic"'), true);
  assert.equal(openAiDocs.exampleUsage.includes('baseUrl: "https://api.example.test"'), true);
  assert.equal(openAiDocs.exampleUsage.includes('baseUrl: "https://api.example.test/v1"'), false);
});

test("sdk reference language switching does not reload OpenAPI schema documents", () => {
  const source = sdkReferencePageSource();

  assert.equal(source.includes("[activeSystem, activeSdk.id]"), false);
  assert.equal(source.includes("await fetch(schemaUrl)"), false);
  assert.equal(source.includes("loadSdkReferenceSystems()"), true);
});

test("sdk reference generation uses app SDK instead of local tool API fetches", () => {
  const pageSource = sdkReferencePageSource();
  const serviceSource = readFileSync(
    new URL("../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-sdk-reference/src/sdkReferenceGenerationService.ts", import.meta.url),
    "utf8",
  );
  const appSdkSource = readFileSync(
    new URL("../../sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/src/index.ts/api/sdk-reference.ts", import.meta.url),
    "utf8",
  );

  assert.equal(pageSource.includes("fetch('/api/sdk-readme'"), false);
  assert.equal(pageSource.includes('fetch("/api/sdk-readme"'), false);
  assert.equal(pageSource.includes("fetch('/api/generate-sdk'"), false);
  assert.equal(pageSource.includes('fetch("/api/generate-sdk"'), false);
  assert.equal(serviceSource.includes("fetch('/api/sdk-readme'"), false);
  assert.equal(serviceSource.includes('fetch("/api/sdk-readme"'), false);
  assert.equal(serviceSource.includes("fetch('/api/generate-sdk'"), false);
  assert.equal(serviceSource.includes('fetch("/api/generate-sdk"'), false);
  assert.match(serviceSource, /getClawRouterAppSdkClient/u);
  assert.match(serviceSource, /sdkReference\.documentation\.create/u);
  assert.match(serviceSource, /sdkReference\.archives\.create/u);
  assert.match(appSdkSource, /appApiPath\(`\/sdk_reference\/documentation`\)/u);
  assert.match(appSdkSource, /appApiPath\(`\/sdk_reference\/archives`\)/u);
});

test("sdk endpoint view sends selected endpoint metadata to documentation generation", () => {
  const source = sdkEndpointViewSource();

  assert.match(source, /endpointPath:\s*endpoint\.path/u);
  assert.match(source, /endpointMethod:\s*endpoint\.method/u);
  assert.match(source, /operationId:\s*endpoint\.openApiOperation\?\.operationId/u);
  assert.match(source, /language:\s*normalizedLanguage/u);
  assert.match(source, /\[\s*spec,\s*normalizedLanguage,\s*sdkConfig,\s*endpoint\.path,\s*endpoint\.method,\s*endpoint\.openApiOperation\?\.operationId,\s*\]/u);
});

test("sdk reference generation requests keep config language aligned with selected language", () => {
  const runtimeSource = readFileSync(
    new URL("../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-sdk-reference/src/sdkReferenceRuntime.ts", import.meta.url),
    "utf8",
  );
  const serviceSource = sdkReferenceGenerationServiceSource();

  assert.match(runtimeSource, /const language = normalizeSdkReferenceLanguage\(languageId\);/u);
  assert.match(serviceSource, /const language = normalizeSdkReferenceLanguage\(input\.language\);/u);
  assert.match(serviceSource, /config:\s*normalizeJsonObject\(\{\s*\.\.\.input\.config,\s*language,\s*\}/u);
});

test("sdk endpoint docs show code definition and example before parameter details", () => {
  const source = sdkEndpointViewSource();
  const codeIndex = source.indexOf("CODE DEFINITION");
  const exampleIndex = source.indexOf("EXAMPLE USAGE");
  const parametersIndex = source.indexOf("PARAMETERS AND RETURNS");

  assert.notEqual(codeIndex, -1);
  assert.notEqual(exampleIndex, -1);
  assert.notEqual(parametersIndex, -1);
  assert.ok(codeIndex < exampleIndex, "code definition should be before example usage");
  assert.ok(exampleIndex < parametersIndex, "example usage should be before parameter details");
});

test("api and sdk reference sidebar child directories align with endpoint rows", () => {
  for (const source of [apiReferencePageSource(), sdkReferencePageSource()]) {
    assert.equal(source.includes('className="ml-4 border-l border-slate-200 pl-3 dark:border-white/10"'), false);
    assert.equal(source.includes("renderEndpointItem(endpoint, depth > 0)"), false);
  }
});

test("sdk reference load preserves schema tab default schema url", async () => {
  const { loadSdkReferenceSystems } = await import("../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-sdk-reference/src/sdkReferenceRuntime.ts");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/openapi/schema-tabs.json") {
      return new Response(JSON.stringify({
        tabs: [
          {
            id: "gateway",
            name: "Claw Router Open API",
            order: 10,
            schemaUrls: ["/tenant/openapi.json"],
            defaultSchemaUrl: "/tenant/openapi.json",
          },
        ],
      }));
    }
    if (url === "/tenant/openapi.json") {
      return new Response(JSON.stringify(gatewaySpec));
    }
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;

  try {
    const systems = await loadSdkReferenceSystems();
    assert.equal(systems[0].schemaUrl, "/tenant/openapi.json");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("api playground schema rows use deterministic ids from location name and index", () => {
  const rows = makeApiPlaygroundSchemaRows(
    [
      { in: "query", name: "user_id", description: "User id", required: true },
      { in: "header", name: "X-Trace-Id", description: "Trace id" },
      { in: "query", name: " Page Size ", description: " Pagination size " },
      { in: "query", name: "", description: "Unnamed value" },
    ],
    "query",
  );

  assert.deepEqual(
    rows.map((row) => row.id),
    ["schema-query-0-user-id", "schema-query-1-page-size", "schema-query-2-unnamed"],
  );
  assert.deepEqual(rows.map((row) => row.key), ["user_id", "Page Size", ""]);
  assert.equal(rows[0].required, true);
  assert.equal(rows[0].enabled, true);
  assert.equal(rows[0].isSchema, true);
  assert.equal(rows[1].description, "Pagination size");
});

test("api playground empty custom rows use caller-owned deterministic sequence ids", () => {
  assert.deepEqual(makeApiPlaygroundEmptyRow("query", 1), {
    id: "custom-query-1",
    key: "",
    value: "",
    description: "",
    enabled: false,
    isSchema: false,
  });
  assert.equal(makeApiPlaygroundEmptyRow("header", 8, true).id, "custom-header-8");
  assert.equal(makeApiPlaygroundEmptyRow("header", -4).id, "custom-header-0");
});

test("api playground bulk rows parse key value text without clock or random ids", () => {
  const rows = parseApiPlaygroundBulkRows("trace:abc\n// disabled:yes\nempty-value:", "header");

  assert.deepEqual(rows, [
    {
      id: "bulk-header-0",
      key: "trace",
      value: "abc",
      description: "",
      enabled: true,
      isSchema: false,
    },
    {
      id: "bulk-header-1",
      key: "disabled",
      value: "yes",
      description: "",
      enabled: false,
      isSchema: false,
    },
    {
      id: "bulk-header-2",
      key: "empty-value",
      value: "",
      description: "",
      enabled: true,
      isSchema: false,
    },
    {
      id: "bulk-header-empty",
      key: "",
      value: "",
      description: "",
      enabled: true,
      isSchema: false,
    },
  ]);
});

test("api playground initial state derives deterministic rows and default body", () => {
  const state = createApiPlaygroundInitialState({
    path: "/v1/models/{model}/responses",
    openApiOperation: {
      parameters: [
        { in: "path", name: "model", required: true, description: "Model id" },
        { in: "query", name: "limit", required: true, description: "Page size" },
        { in: "header", name: "X-Trace-Id", description: "Trace id" },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["prompt"],
              properties: {
                prompt: { type: "string", example: "hello" },
                stream: { type: "boolean" },
              },
            },
          },
        },
      },
    },
  });

  assert.equal(state.activeTab, "params");
  assert.deepEqual(
    state.queryParams.map((row) => row.id),
    ["schema-query-0-limit", "custom-query-1"],
  );
  assert.deepEqual(
    state.pathParams.map((row) => row.id),
    ["schema-path-0-model"],
  );
  assert.deepEqual(
    state.headerParams.map((row) => row.id),
    ["schema-header-0-x-trace-id", "custom-header-2"],
  );
  assert.equal(state.queryParams[0].required, true);
  assert.equal(state.headerParams[0].description, "Trace id");
  assert.equal(state.bodyValue, '{\n  "prompt": "hello",\n  "stream": true\n}');
});

test("api playground initial state resolves referenced request body examples", async () => {
  const manifest: ApiSchemaTabsDocument = {
    cacheTtlSeconds: 30,
    tabs: [
      { id: "gateway", name: "Claw Router Open API", order: 10, schemaUrls: ["/openapi.json"], defaultSchemaUrl: "/openapi.json" },
    ],
  };

  const systems = await buildApiReferenceSystemsFromTabs(manifest, async (url) => {
    if (url === "/openapi.json") return multimodalGatewaySpec;
    throw new Error(`unexpected url ${url}`);
  });

  const endpoint = systems[0].categories
    .flatMap((category) => category.endpoints)
    .find((item) => item.path === "/vidu/ent/v2/text2video");

  assert.ok(endpoint);
  const state = createApiPlaygroundInitialState(endpoint);

  assert.equal(
    state.bodyValue,
    '{\n  "model": "string",\n  "prompt": "string",\n  "duration": 0,\n  "seed": 0\n}',
  );
  assert.equal(state.activeTab, "body");
});

test("api playground initial state backfills path template variables missing from OpenAPI parameters", () => {
  const state = createApiPlaygroundInitialState({
    path: "/v1/models/{model}/responses/{response_id}",
    openApiOperation: {
      parameters: [
        { in: "query", name: "include", description: "Optional include" },
        { in: "path", name: "model", required: true, description: "Model id" },
      ],
    },
  });

  assert.deepEqual(
    state.pathParams.map((row) => ({
      id: row.id,
      key: row.key,
      description: row.description,
      enabled: row.enabled,
      isSchema: row.isSchema,
      required: row.required,
    })),
    [
      {
        id: "schema-path-0-model",
        key: "model",
        description: "Model id",
        enabled: true,
        isSchema: true,
        required: true,
      },
      {
        id: "template-path-1-response-id",
        key: "response_id",
        description: "Path variable from endpoint template",
        enabled: true,
        isSchema: true,
        required: true,
      },
    ],
  );
});

test("api playground initial state reset key is stable across equivalent endpoint objects", () => {
  const endpoint = {
    id: "create-response",
    method: "POST",
    path: "/v1/models/{model}/responses",
    openApiOperation: {
      parameters: [
        { in: "path", name: "model", required: true, description: "Model id" },
        { in: "query", name: "limit", required: true, description: "Page size" },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                prompt: { example: "hello", type: "string" },
              },
            },
          },
        },
      },
    },
  };
  const equivalentEndpoint = {
    path: "/v1/models/{model}/responses",
    method: "POST",
    id: "create-response",
    openApiOperation: {
      requestBody: {
        content: {
          "application/json": {
            schema: {
              properties: {
                prompt: { type: "string", example: "hello" },
              },
              type: "object",
            },
          },
        },
        required: true,
      },
      parameters: [
        { description: "Model id", required: true, name: "model", in: "path" },
        { description: "Page size", required: true, name: "limit", in: "query" },
      ],
    },
  };

  assert.equal(createApiPlaygroundInitialStateKey(endpoint), createApiPlaygroundInitialStateKey(equivalentEndpoint));
  assert.notEqual(createApiPlaygroundInitialStateKey(endpoint), createApiPlaygroundInitialStateKey({ ...endpoint, path: "/v1/other" }));
  assert.notEqual(
    createApiPlaygroundInitialStateKey(endpoint),
    createApiPlaygroundInitialStateKey({
      ...endpoint,
      openApiOperation: {
        ...endpoint.openApiOperation,
        parameters: [
          { in: "path", name: "model", required: true, description: "Changed model id" },
          { in: "query", name: "limit", required: true, description: "Page size" },
        ],
      },
    }),
  );
});

test("api playground request builder focuses validation and rejects managed headers", () => {
  const endpoint = {
    method: "POST",
    path: "/v1/models/{model}/responses",
    openApiOperation: {
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { type: "object" },
          },
        },
      },
    },
  };

  const missingRequired = buildPlaygroundRequest({
    baseUrl: "https://api.example.test",
    endpoint,
    pathParams: [{ id: "schema-path-0-model", key: "model", value: "", description: "", enabled: true, isSchema: true, required: true }],
    queryParams: [],
    headerParams: [],
    bodyValue: "{}",
    authType: "current_user",
    authToken: "auth-token",
    accessToken: "access-token",
  });

  assert.equal(missingRequired.ok, false);
  assert.equal(missingRequired.activeTab, "params");
  assert.deepEqual(missingRequired.errors, { "schema-path-0-model": true });

  const managedHeader = buildPlaygroundRequest({
    baseUrl: "https://api.example.test",
    endpoint,
    pathParams: [{ id: "schema-path-0-model", key: "model", value: "gpt-4o", description: "", enabled: true, isSchema: true, required: true }],
    queryParams: [],
    headerParams: [{ id: "custom-header-1", key: "Authorization", value: "Bearer unsafe", description: "", enabled: true, isSchema: false }],
    bodyValue: "{}",
    authType: "current_user",
    authToken: "auth-token",
    accessToken: "access-token",
  });

  assert.equal(managedHeader.ok, false);
  assert.equal(managedHeader.activeTab, "headers");
  assert.deepEqual(managedHeader.errors, { "custom-header-1": true });
  assert.equal(managedHeader.response.statusText, "Managed Header");

  const managedAccessTokenHeader = buildPlaygroundRequest({
    baseUrl: "https://api.example.test",
    endpoint,
    pathParams: [{ id: "schema-path-0-model", key: "model", value: "gpt-4o", description: "", enabled: true, isSchema: true, required: true }],
    queryParams: [],
    headerParams: [{ id: "custom-header-2", key: "Access-Token", value: "unsafe", description: "", enabled: true, isSchema: false }],
    bodyValue: "{}",
    authType: "current_user",
    authToken: "auth-token",
    accessToken: "access-token",
  });

  assert.equal(managedAccessTokenHeader.ok, false);
  assert.equal(managedAccessTokenHeader.activeTab, "headers");
  assert.deepEqual(managedAccessTokenHeader.errors, { "custom-header-2": true });
  assert.equal(managedAccessTokenHeader.response.statusText, "Managed Header");

  const managedBrandedAccessTokenHeader = buildPlaygroundRequest({
    baseUrl: "https://api.example.test",
    endpoint,
    pathParams: [{ id: "schema-path-0-model", key: "model", value: "gpt-4o", description: "", enabled: true, isSchema: true, required: true }],
    queryParams: [],
    headerParams: [{ id: "custom-header-3", key: "Vendor-Access-Token", value: "unsafe", description: "", enabled: true, isSchema: false }],
    bodyValue: "{}",
    authType: "current_user",
    authToken: "auth-token",
    accessToken: "access-token",
  });

  assert.equal(managedBrandedAccessTokenHeader.ok, false);
  assert.equal(managedBrandedAccessTokenHeader.activeTab, "headers");
  assert.deepEqual(managedBrandedAccessTokenHeader.errors, { "custom-header-3": true });
  assert.equal(managedBrandedAccessTokenHeader.response.statusText, "Managed Header");

  const managedRequestIdHeader = buildPlaygroundRequest({
    baseUrl: "https://api.example.test",
    endpoint,
    pathParams: [{ id: "schema-path-0-model", key: "model", value: "gpt-4o", description: "", enabled: true, isSchema: true, required: true }],
    queryParams: [],
    headerParams: [{ id: "custom-header-4", key: "X-Request-Id", value: "client-generated", description: "", enabled: true, isSchema: false }],
    bodyValue: "{}",
    authType: "current_user",
    authToken: "auth-token",
    accessToken: "access-token",
  });

  assert.equal(managedRequestIdHeader.ok, false);
  assert.equal(managedRequestIdHeader.activeTab, "headers");
  assert.deepEqual(managedRequestIdHeader.errors, { "custom-header-4": true });
  assert.equal(managedRequestIdHeader.response.statusText, "Managed Header");

  const currentUserRequest = buildPlaygroundRequest({
    baseUrl: "https://api.example.test",
    endpoint: {
      ...endpoint,
      path: "/app/v3/api/models/{model}/responses",
    },
    pathParams: [{ id: "schema-path-0-model", key: "model", value: "gpt-4o", description: "", enabled: true, isSchema: true, required: true }],
    queryParams: [],
    headerParams: [],
    bodyValue: "{}",
    authType: "current_user",
    authToken: "auth-token",
    accessToken: "access-token",
  });

  assert.equal(currentUserRequest.ok, true);
  assert.equal(currentUserRequest.requestInit.headers.Authorization, "Bearer auth-token");
  assert.equal(currentUserRequest.requestInit.headers["Access-Token"], "access-token");

  const gatewayCurrentUserRequest = buildPlaygroundRequest({
    baseUrl: "https://api.example.test",
    endpoint: {
      method: "POST",
      path: "/v1/chat/completions",
      openApiOperation: {
        requestBody: {
          content: {
            "application/json": {},
          },
        },
      },
    },
    pathParams: [],
    queryParams: [],
    headerParams: [],
    bodyValue: "{}",
    authType: "current_user",
    authToken: "auth-token",
    accessToken: "access-token",
  });

  assert.equal(gatewayCurrentUserRequest.ok, false);
  assert.equal(gatewayCurrentUserRequest.activeTab, "auth");
  assert.equal(gatewayCurrentUserRequest.response.statusText, "Gateway API Key Required");

  const invalidBody = buildPlaygroundRequest({
    baseUrl: "https://api.example.test",
    endpoint,
    pathParams: [{ id: "schema-path-0-model", key: "model", value: "gpt-4o", description: "", enabled: true, isSchema: true, required: true }],
    queryParams: [],
    headerParams: [],
    bodyValue: "{invalid",
    authType: "current_user",
    authToken: "auth-token",
    accessToken: "access-token",
  });

  assert.equal(invalidBody.ok, false);
  assert.equal(invalidBody.activeTab, "body");
  assert.deepEqual(invalidBody.errors, { body: true });
});

test("api playground current user send requires login before network requests", () => {
  const source = readFileSync(
    new URL("../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiPlayground.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useLocation/u);
  assert.match(source, /useNavigate/u);
  assert.match(source, /buildPortalAuthLoginRedirect/u);
  assert.match(source, /hasStoredPortalSession/u);
  assert.match(source, /if \(authType === 'current_user' && !hasStoredPortalSession\(\)\) \{\s*navigate\(buildPortalAuthLoginRedirect\(location\)\);\s*return null;\s*\}/u);
  const loginGuardIndex = source.indexOf("authType === 'current_user' && !hasStoredPortalSession()");
  const fetchIndex = source.indexOf("await fetch(request.url, request.requestInit)");
  assert.notEqual(loginGuardIndex, -1);
  assert.notEqual(fetchIndex, -1);
  assert.ok(loginGuardIndex < fetchIndex, "login guard must run before the playground network request");
});

test("api playground request builder focuses required header errors on headers tab", () => {
  const result = buildPlaygroundRequest({
    baseUrl: "https://api.example.test",
    endpoint: {
      method: "GET",
      path: "/v1/audit",
    },
    pathParams: [],
    queryParams: [],
    headerParams: [{
      id: "schema-header-0-x-audit-id",
      key: "X-Audit-Id",
      value: "",
      description: "",
      enabled: true,
      isSchema: true,
      required: true,
    }],
    bodyValue: "",
    authType: "current_user",
    authToken: "auth-token",
    accessToken: "access-token",
  });

  assert.equal(result.ok, false);
  assert.equal(result.activeTab, "headers");
  assert.deepEqual(result.errors, { "schema-header-0-x-audit-id": true });
});

test("api playground request builder rejects unresolved path template variables", () => {
  const result = buildPlaygroundRequest({
    baseUrl: "https://api.example.test",
    endpoint: {
      method: "GET",
      path: "/v1/models/{model}/responses/{response_id}",
    },
    pathParams: [{
      id: "schema-path-0-model",
      key: "model",
      value: "gpt-4o",
      description: "",
      enabled: true,
      isSchema: true,
      required: true,
    }],
    queryParams: [],
    headerParams: [],
    bodyValue: "",
    authType: "current_user",
    authToken: "auth-token",
    accessToken: "access-token",
  });

  assert.equal(result.ok, false);
  assert.equal(result.activeTab, "params");
  assert.deepEqual(result.errors, { "path-template": true });
  assert.equal(result.response.statusText, "Unresolved Path Variable");
});

test("api playground request builder rejects custom content type headers", () => {
  const result = buildPlaygroundRequest({
    baseUrl: "https://api.example.test",
    endpoint: {
      method: "POST",
      path: "/v1/responses",
      openApiOperation: {
        requestBody: {
          content: {
            "application/json": {},
          },
        },
      },
    },
    pathParams: [],
    queryParams: [],
    headerParams: [{
      id: "custom-header-content-type",
      key: "Content-Type",
      value: "text/plain",
      description: "",
      enabled: true,
      isSchema: false,
    }],
    bodyValue: "{\"prompt\":\"hello\"}",
    authType: "api_key",
    apiKey: "sk-test",
  });

  assert.equal(result.ok, false);
  assert.equal(result.activeTab, "headers");
  assert.deepEqual(result.errors, { "custom-header-content-type": true });
  assert.equal(result.response.statusText, "Managed Header");
});

test("api playground response download serializes current response without clock filenames", () => {
  assert.deepEqual(createApiPlaygroundResponseDownload(null), null);
  assert.deepEqual(createApiPlaygroundResponseDownload({ status: 204, statusText: "No Content", time: 4, size: 0, headers: [], data: undefined }), null);

  assert.deepEqual(
    createApiPlaygroundResponseDownload({
      status: 200,
      statusText: "OK",
      time: 12,
      size: 4,
      headers: [["content-type", "application/json"]],
      data: { ok: true },
    }),
    {
      filename: "playground-response-200-ok.json",
      mimeType: "application/json",
      text: '{\n  "ok": true\n}',
    },
  );

  assert.deepEqual(
    createApiPlaygroundResponseDownload({
      status: 404,
      statusText: "Not Found!",
      time: 8,
      size: 5,
      headers: [["content-type", "text/plain"]],
      data: "missing",
    }),
    {
      filename: "playground-response-404-not-found.txt",
      mimeType: "text/plain",
      text: "missing",
    },
  );

  assert.deepEqual(
    createApiPlaygroundResponseDownload({
      status: 200,
      statusText: "OK",
      time: 1,
      size: 4,
      headers: [],
      data: false,
    }),
    {
      filename: "playground-response-200-ok.json",
      mimeType: "application/json",
      text: "false",
    },
  );
});

test("api playground response serializer preserves primitive and null response bodies for UI actions", () => {
  const serializeApiPlaygroundResponseData = (apiPlaygroundResponse as any).serializeApiPlaygroundResponseData;
  assert.equal(typeof serializeApiPlaygroundResponseData, "function");

  assert.equal(serializeApiPlaygroundResponseData(false), "false");
  assert.equal(serializeApiPlaygroundResponseData(0), "0");
  assert.equal(serializeApiPlaygroundResponseData(null), "null");
  assert.equal(serializeApiPlaygroundResponseData(undefined), "");
  assert.equal(serializeApiPlaygroundResponseData({ ok: true }), '{\n  "ok": true\n}');

  assert.deepEqual(
    createApiPlaygroundResponseDownload({
      status: 200,
      statusText: "OK",
      time: 2,
      size: 4,
      headers: [["content-type", "application/json"]],
      data: null,
    }),
    {
      filename: "playground-response-200-ok.json",
      mimeType: "application/json",
      text: "null",
    },
  );
});
