import {
  getModelsAppSdkClient,
  isRecord,
  readRequiredApiItems,
  readString,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import type { GroupPickerVendor } from '@sdkwork/cloudroutes-pc-commons/components/GroupPicker';

/**
 * 模型厂商兜底显示名：与 sdkwork-models `models/vendors.json`（catalogVersion 2026.08.13.1）
 * 的 code → displayName 保持同步，按 sortOrder 排列。仅用于 model_vendors API 不可用
 * 或个别厂商缺失时补齐显示，权威数据始终以 API 返回为准。
 */
const FALLBACK_VENDOR_LABELS: ReadonlyArray<readonly [code: string, label: string]> = [
  ['openai', 'OpenAI'],
  ['anthropic', 'Anthropic'],
  ['google', 'Google'],
  ['xai', 'xAI'],
  ['alibaba', 'Alibaba Cloud'],
  ['deepseek', 'DeepSeek'],
  ['moonshot', 'Moonshot Kimi'],
  ['zhipu', 'Zhipu AI'],
  ['runway', 'Runway'],
  ['baidu', 'Baidu AI Cloud'],
  ['luma_ai', 'Luma AI'],
  ['vidu', 'Vidu'],
  ['pixverse', 'PixVerse'],
  ['tencent', 'Tencent Cloud'],
  ['bytedance', 'ByteDance'],
  ['minimax', 'MiniMax'],
  ['stepfun', 'StepFun'],
  ['kuaishou', 'Kuaishou'],
  ['meituan', 'Meituan'],
  ['stability_ai', 'Stability AI'],
  ['black_forest_labs', 'Black Forest Labs'],
  ['suno', 'Suno'],
  ['mureka', 'Mureka'],
  ['elevenlabs', 'ElevenLabs'],
  ['xiaomi', 'Xiaomi MiMo'],
];

function toVendorOption(item: unknown): GroupPickerVendor | null {
  if (!isRecord(item)) {
    return null;
  }
  const code = (readString(item, 'code') ?? readString(item, 'vendorCode') ?? '').trim();
  if (!code) {
    return null;
  }
  const label = (readString(item, 'label') ?? readString(item, 'vendor') ?? code).trim();
  return { code, label: label || code };
}

/**
 * 拉取模型厂商列表（model vendors 权威主数据，经 app SDK 边界调用）。
 * 返回完整厂商列表：API 项优先，缺失的厂商用静态兜底表补齐显示名；
 * API 完全不可用时回退到静态全量表。
 */
export async function fetchModelVendors(): Promise<GroupPickerVendor[]> {
  try {
    const result = await getModelsAppSdkClient().ai.modelVendors.list();
    const vendors = new Map<string, GroupPickerVendor>();
    for (const item of readRequiredApiItems(result, 'console.apiKeys.errors.loadVendorsFallback')) {
      const vendor = toVendorOption(item);
      if (vendor) {
        vendors.set(vendor.code, vendor);
      }
    }
    for (const [code, label] of FALLBACK_VENDOR_LABELS) {
      if (!vendors.has(code)) {
        vendors.set(code, { code, label });
      }
    }
    return Array.from(vendors.values());
  } catch {
    return FALLBACK_VENDOR_LABELS.map(([code, label]) => ({ code, label }));
  }
}
