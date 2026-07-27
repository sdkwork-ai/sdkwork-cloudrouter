import type { I18nMessageBundle } from '../types';

export const playgroundGenerationMessages = {
  en: {
    "playground.generation.pending": "Generation is queued.",
    "playground.generation.processing": "Generation is running.",
    "playground.generation.failed": "Generation failed.",
    "playground.generation.empty": "Generated content is not available yet.",
    "playground.generation.imageAlt": "Generated image",
    "playground.generation.videoThumbnailAlt": "Generated video thumbnail",
    "playground.generationCost.estimated": "Estimated Compute Credits",
    "playground.generationCost.unavailable": "Actual settlement",
    "playground.generationCost.reference": "Reference",
    "playground.generationCost.settlement": "Final Compute Credits depend on the model route and Token Bank settlement.",
    "playground.generationCost.points": "{{points}} Compute Credits",
    "playground.generationOutput.images": "{{count}} image",
    "playground.generationOutput.items": "{{count}} item",
  },
  zh: {
    "playground.generation.pending": "生成任务已进入队列。",
    "playground.generation.processing": "正在生成中。",
    "playground.generation.failed": "生成失败。",
    "playground.generation.empty": "生成内容暂不可用。",
    "playground.generation.imageAlt": "生成图片",
    "playground.generation.videoThumbnailAlt": "生成视频缩略图",
    "playground.generationCost.estimated": "预计消耗算力元",
    "playground.generationCost.unavailable": "按实际结算",
    "playground.generationCost.reference": "参考价",
    "playground.generationCost.settlement": "最终算力元以模型路由和 Token Bank 结算为准。",
    "playground.generationCost.points": "{{points}} 算力元",
    "playground.generationOutput.images": "{{count}} 张",
    "playground.generationOutput.items": "{{count}} 个",
  },
} satisfies I18nMessageBundle;
