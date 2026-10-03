// GENERATED FILE — DO NOT EDIT BY HAND.
//
// Source of truth: sdkwork-models `models/<vendor>/<region>/vendor.json`
//   protocolBaseUrls  -> regions[<region>].protocols[<formProtocolCode>]
//   nativeApiBaseUrl  -> regions[<region>].nativeBaseUrl
//
// Regenerate with: pnpm models:vendor-catalog:write
// Verify with:     pnpm models:vendor-catalog:check

import type { VendorCatalogMatrix } from '../vendorProtocolCatalog.types';

export const VENDOR_CATALOG_MATRIX: VendorCatalogMatrix = {
  "openai": {
    catalogVendorCode: "openai",
    regions: {
      "global": {
        protocols: {
          "openai_chat_completions": "https://api.openai.com/v1",
          "openai_responses": "https://api.openai.com/v1",
        },
      },
    },
  },
  "openai_compatible": {
    catalogVendorCode: null,
    regions: {},
  },
  "anthropic": {
    catalogVendorCode: "anthropic",
    regions: {
      "global": {
        protocols: {
          "anthropic_messages": "https://api.anthropic.com",
        },
      },
    },
  },
  "gemini": {
    catalogVendorCode: "google",
    regions: {
      "global": {
        protocols: {
          "openai_chat_completions": "https://generativelanguage.googleapis.com/v1beta/openai",
        },
      },
    },
  },
  "kling": {
    catalogVendorCode: "kuaishou",
    regions: {
      "cn": {
        protocols: {
        },
        nativeBaseUrl: "https://api-beijing.klingai.com",
      },
      "global": {
        protocols: {
        },
        nativeBaseUrl: "https://api-singapore.klingai.com",
      },
    },
  },
  "jimeng": {
    catalogVendorCode: null,
    regions: {},
  },
  "bytedance": {
    catalogVendorCode: "bytedance",
    regions: {
      "cn": {
        protocols: {
          "openai_chat_completions": "https://ark.cn-beijing.volces.com/api/v3",
          "openai_responses": "https://ark.cn-beijing.volces.com/api/v3",
        },
      },
      "global": {
        protocols: {
          "openai_chat_completions": "https://ark.ap-southeast.bytepluses.com/api/v3",
          "openai_responses": "https://ark.ap-southeast.bytepluses.com/api/v3",
        },
      },
    },
  },
  "volcengine": {
    catalogVendorCode: "bytedance",
    regions: {
      "cn": {
        protocols: {
          "openai_chat_completions": "https://ark.cn-beijing.volces.com/api/v3",
          "openai_responses": "https://ark.cn-beijing.volces.com/api/v3",
        },
      },
      "global": {
        protocols: {
          "openai_chat_completions": "https://ark.ap-southeast.bytepluses.com/api/v3",
          "openai_responses": "https://ark.ap-southeast.bytepluses.com/api/v3",
        },
      },
    },
  },
  "vidu": {
    catalogVendorCode: "vidu",
    regions: {
      "cn": {
        protocols: {
        },
        nativeBaseUrl: "https://api.vidu.cn/ent/v2",
      },
      "global": {
        protocols: {
        },
        nativeBaseUrl: "https://api.vidu.com/ent/v2",
      },
    },
  },
  "minimax": {
    catalogVendorCode: "minimax",
    regions: {
      "cn": {
        protocols: {
          "openai_chat_completions": "https://api.minimax.cn/v1",
        },
      },
      "global": {
        protocols: {
          "openai_chat_completions": "https://api.minimax.io/v1",
        },
      },
    },
  },
  "suno": {
    catalogVendorCode: "suno",
    addressUnavailable: "Suno publishes no official public API: it has released no self-serve developer access and no API documentation. The catalog entry therefore carries no nativeApiBaseUrl, and the console must not substitute the third-party services that resell Suno (api.sunoapi.org and similar are not Suno).",
    regions: {
      "global": {
        protocols: {
        },
      },
    },
  },
  "elevenlabs": {
    catalogVendorCode: "elevenlabs",
    regions: {
      "global": {
        protocols: {
        },
        nativeBaseUrl: "https://api.elevenlabs.io/v1",
      },
    },
  },
  "alibaba": {
    catalogVendorCode: "alibaba",
    regions: {
      "cn": {
        protocols: {
          "anthropic_messages": "https://dashscope.aliyuncs.com/apps/anthropic",
          "openai_chat_completions": "https://dashscope.aliyuncs.com/compatible-mode/v1",
          "openai_responses": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        },
      },
      "global": {
        protocols: {
          "anthropic_messages": "https://dashscope-intl.aliyuncs.com/apps/anthropic",
          "openai_chat_completions": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
          "openai_responses": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        },
      },
    },
  },
  "baidu": {
    catalogVendorCode: "baidu",
    regions: {
      "cn": {
        protocols: {
          "openai_chat_completions": "https://qianfan.baidubce.com/v2",
        },
      },
    },
  },
  "black_forest_labs": {
    catalogVendorCode: "black_forest_labs",
    regions: {
      "global": {
        protocols: {
        },
        nativeBaseUrl: "https://api.bfl.ai/v1",
      },
    },
  },
  "deepseek": {
    catalogVendorCode: "deepseek",
    regions: {
      "cn": {
        protocols: {
          "anthropic_messages": "https://api.deepseek.com/anthropic",
          "openai_chat_completions": "https://api.deepseek.com/v1",
          "openai_responses": "https://api.deepseek.com",
        },
      },
      "global": {
        protocols: {
          "anthropic_messages": "https://api.deepseek.com/anthropic",
          "openai_chat_completions": "https://api.deepseek.com/v1",
          "openai_responses": "https://api.deepseek.com",
        },
      },
    },
  },
  "luma_ai": {
    catalogVendorCode: "luma_ai",
    regions: {
      "global": {
        protocols: {
        },
        nativeBaseUrl: "https://api.lumalabs.ai/dream-machine/v1",
      },
    },
  },
  "meituan": {
    catalogVendorCode: "meituan",
    regions: {
      "cn": {
        protocols: {
          "anthropic_messages": "https://api.longcat.chat/anthropic",
          "openai_chat_completions": "https://api.longcat.chat/openai/v1",
        },
      },
    },
  },
  "moonshot": {
    catalogVendorCode: "moonshot",
    regions: {
      "cn": {
        protocols: {
          "anthropic_messages": "https://api.moonshot.cn/anthropic",
          "openai_chat_completions": "https://api.moonshot.cn/v1",
        },
      },
      "global": {
        protocols: {
          "anthropic_messages": "https://api.moonshot.ai/anthropic",
          "openai_chat_completions": "https://api.moonshot.ai/v1",
        },
      },
    },
  },
  "mureka": {
    catalogVendorCode: "mureka",
    regions: {
      "global": {
        protocols: {
        },
        nativeBaseUrl: "https://api.mureka.ai/v1",
      },
    },
  },
  "pixverse": {
    catalogVendorCode: "pixverse",
    regions: {
      "cn": {
        protocols: {
        },
      },
      "global": {
        protocols: {
        },
        nativeBaseUrl: "https://app-api.pixverse.ai/openapi/v2",
      },
    },
  },
  "runway": {
    catalogVendorCode: "runway",
    regions: {
      "global": {
        protocols: {
        },
        nativeBaseUrl: "https://api.dev.runwayml.com/v1",
      },
    },
  },
  "stability_ai": {
    catalogVendorCode: "stability_ai",
    regions: {
      "global": {
        protocols: {
        },
        nativeBaseUrl: "https://api.stability.ai",
      },
    },
  },
  "stepfun": {
    catalogVendorCode: "stepfun",
    regions: {
      "cn": {
        protocols: {
          "anthropic_messages": "https://api.stepfun.com/step_plan",
          "openai_chat_completions": "https://api.stepfun.com/v1",
          "openai_responses": "https://api.stepfun.com/v1",
        },
      },
    },
  },
  "tencent": {
    catalogVendorCode: "tencent",
    regions: {
      "cn": {
        protocols: {
          "anthropic_messages": "https://tokenhub.tencentmaas.com",
          "openai_chat_completions": "https://tokenhub.tencentmaas.com/v1",
        },
      },
    },
  },
  "typesafe": {
    catalogVendorCode: "typesafe",
    regions: {
      "global": {
        protocols: {
        },
        nativeBaseUrl: "https://api.typesafe.ai/v1",
      },
    },
  },
  "xai": {
    catalogVendorCode: "xai",
    regions: {
      "global": {
        protocols: {
          "openai_chat_completions": "https://api.x.ai/v1",
          "openai_responses": "https://api.x.ai/v1",
        },
      },
    },
  },
  "xiaomi": {
    catalogVendorCode: "xiaomi",
    regions: {
      "cn": {
        protocols: {
          "anthropic_messages": "https://api.xiaomimimo.com/anthropic",
          "openai_chat_completions": "https://api.xiaomimimo.com/v1",
        },
      },
      "global": {
        protocols: {
          "anthropic_messages": "https://api.xiaomimimo.com/anthropic",
          "openai_chat_completions": "https://api.xiaomimimo.com/v1",
        },
      },
    },
  },
  "zhipu": {
    catalogVendorCode: "zhipu",
    regions: {
      "cn": {
        protocols: {
          "anthropic_messages": "https://open.bigmodel.cn/api/anthropic",
          "openai_chat_completions": "https://open.bigmodel.cn/api/paas/v4",
        },
      },
    },
  },
};
