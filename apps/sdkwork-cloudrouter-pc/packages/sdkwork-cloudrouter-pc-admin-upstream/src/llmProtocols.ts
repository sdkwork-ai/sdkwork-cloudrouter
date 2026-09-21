import type { LlmProtocolConfig } from '@sdkwork/cloudrouter-pc-admin-core/sdk';

/**
 * LLM API 协议枚举选项。工具（OpenAI Codex、Claude Code）运行在底层协议之上，
 * 不属于协议值本身；历史数据中的 `openai_compatible` 仅保留在旧供应商记录上。
 * 新增协议时同步更新契约层 LlmProtocolCode 枚举与 i18n label 键。
 */
export const LLM_PROTOCOLS: readonly {
  code: LlmProtocolConfig['protocolCode'];
  labelKey: string;
  defaultPath: string;
}[] = [
  {
    code: 'openai_chat_completions',
    labelKey: 'admin.upstream.supplier.protocol.openai_chat_completions',
    defaultPath: '/v1',
  },
  {
    code: 'openai_responses',
    labelKey: 'admin.upstream.supplier.protocol.openai_responses',
    defaultPath: '/v1',
  },
  {
    code: 'anthropic_messages',
    labelKey: 'admin.upstream.supplier.protocol.anthropic_messages',
    defaultPath: '/v1',
  },
];

export function isKnownLlmProtocol(code: string): boolean {
  return LLM_PROTOCOLS.some((option) => option.code === code);
}

/**
 * LLM 协议 → 资源分组 联动映射（按供应商类型区分）。
 * 目录资源分组（data/ai-routing/resource-groups/*.json）无 items 明细下发，
 * 此处静态映射协议对应的能力分组；勾选/取消协议时联动增删。
 *
 * LLM/coding 对话面已经标准化：无论官方还是中继，只要声明了某协议，就复用同一批
 * 「协议面分组」。因此 relay 与 official 指向同一组分组，不再为 relay 另建平行分组——
 * 那正是导致分组越建越多、且与已有分组语义重复的原因。
 *
 * 只有图片/视频这类**未标准化**的能力（各 vendor 主机与路径各不相同）才需要独立分组，
 * 它们与协议无关，由 `relay.*.visual_generation` / `relay.bytedance.media` 承载，
 * 通过供应商声明的能力开关授权，不在此映射内。
 */
export const PROTOCOL_RESOURCE_GROUPS: Record<LlmProtocolConfig['protocolCode'], { official: readonly string[]; relay: readonly string[] }> = {
  openai_chat_completions: { official: ['api.openai.chat'], relay: ['api.openai.chat'] },
  openai_responses: { official: ['api.openai.chat'], relay: ['api.openai.chat'] },
  anthropic_messages: { official: ['api.claude.code'], relay: ['api.claude.code'] },
};

export function llmProtocolLabelKey(code: string): string {
  return LLM_PROTOCOLS.find((option) => option.code === code)?.labelKey
    ?? 'admin.upstream.supplier.protocol.unknown';
}
