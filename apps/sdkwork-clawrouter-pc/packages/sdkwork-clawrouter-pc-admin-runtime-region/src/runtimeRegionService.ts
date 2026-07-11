import type {
  AdminRuntimeRegionSettingsResponse,
  AdminRuntimeRegionSettingsUpdateRequest,
} from '@sdkwork/clawrouter-pc-admin-core/sdk';
import { getClawRouterBackendSdkClient } from '@sdkwork/clawrouter-pc-admin-core/sdk';
import {
  ensureSdkworkApiSuccess,
  readApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';

export type RuntimeRegionSettingsForm = AdminRuntimeRegionSettingsResponse;

export const DEFAULT_RUNTIME_REGION_SETTINGS: RuntimeRegionSettingsForm = {
  currentRegionCode: 'cn',
  currentRegionName: 'China',
  remark: 'Default runtime region for route, endpoint, and regional pricing selection.',
};

export const RuntimeRegionService = {
  async fetchSettings(): Promise<RuntimeRegionSettingsForm> {
    const result = await getClawRouterBackendSdkClient().system.runtimeRegion.settings.retrieve();
    ensureSdkworkApiSuccess(result, 'Unable to load runtime region settings');
    return toRuntimeRegionSettings(readApiRecord(result));
  },

  async updateSettings(input: AdminRuntimeRegionSettingsUpdateRequest): Promise<RuntimeRegionSettingsForm> {
    const result = await getClawRouterBackendSdkClient().system.runtimeRegion.settings.update(input);
    ensureSdkworkApiSuccess(result, 'Unable to update runtime region settings');
    return toRuntimeRegionSettings(readApiRecord(result));
  },
};

export function toRuntimeRegionSettings(record: Record<string, unknown>): RuntimeRegionSettingsForm {
  return {
    currentRegionCode: readString(record, 'currentRegionCode', DEFAULT_RUNTIME_REGION_SETTINGS.currentRegionCode),
    currentRegionName: readString(record, 'currentRegionName', DEFAULT_RUNTIME_REGION_SETTINGS.currentRegionName),
    remark: readString(record, 'remark', DEFAULT_RUNTIME_REGION_SETTINGS.remark),
  };
}

function readString(record: Record<string, unknown>, key: keyof RuntimeRegionSettingsForm, fallback = ''): string {
  const value = record[key];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}
