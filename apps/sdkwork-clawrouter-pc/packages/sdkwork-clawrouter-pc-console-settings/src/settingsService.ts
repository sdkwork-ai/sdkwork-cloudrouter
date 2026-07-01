import {
  ensureSdkworkApiSuccess,
  getClawRouterAppSdkClient,
  isRecord,
  readApiRecord,
  readRequiredApiItem,
  readRequiredString,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import type {
  SettingsDataResponse as SdkSettingsDataResponse,
  UpdateSettingsRequest,
} from '@sdkwork/clawrouter-app-sdk';

type SdkSettingsNotifications = SdkSettingsDataResponse['notifications'];

interface SettingsNotifications {
  billReminder: SdkSettingsNotifications['billReminder'];
  quotaWarning: SdkSettingsNotifications['quotaWarning'];
  apiMonitor: SdkSettingsNotifications['apiMonitor'];
}

export interface SettingsData {
  language: SdkSettingsDataResponse['language'];
  timezone: SdkSettingsDataResponse['timezone'];
  webhookUrl: SdkSettingsDataResponse['webhookUrl'];
  notifications: SettingsNotifications;
}

export class SettingsService {
  static async fetchSettings(): Promise<SettingsData> {
    const result = await getClawRouterAppSdkClient().iam.users.settings.retrieve();
    ensureSdkworkApiSuccess(result, 'console.settings.states.loadErrorFallback');
    return normalizeSettings(readRequiredApiItem(result, 'console.settings.states.loadErrorFallback'));
  }

  static async updateSettings(data: SettingsData): Promise<void> {
    const result = await getClawRouterAppSdkClient().iam.users.settings.update(
      toUpdateSettingsRequest(data),
    );
    ensureSettingsUpdateSuccess(result);
  }
}

function toUpdateSettingsRequest(data: SettingsData): UpdateSettingsRequest {
  return {
    language: requiredText(data.language, 'language'),
    timezone: requiredText(data.timezone, 'timezone'),
    webhookUrl: webhookUrl(data.webhookUrl),
    notifications: {
      billReminder: Boolean(data.notifications.billReminder),
      quotaWarning: Boolean(data.notifications.quotaWarning),
      apiMonitor: Boolean(data.notifications.apiMonitor),
    },
  };
}

function requiredText(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }
  return normalized;
}

function webhookUrl(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return '';
  }
  if (!/^https?:\/\//i.test(normalized)) {
    throw new Error('webhookUrl must use http or https');
  }
  return normalized;
}

function normalizeSettings(data: ApiRecord): SettingsData {
  const notifications = readRequiredRecord(data, 'notifications', 'Settings notifications are required');
  return {
    language: readRequiredString(data, 'language', 'Settings language is required'),
    timezone: readRequiredString(data, 'timezone', 'Settings timezone is required'),
    webhookUrl: readRequiredExistingString(data, 'webhookUrl', 'Settings webhook URL is required'),
    notifications: {
      billReminder: readRequiredBoolean(notifications, 'billReminder', 'Settings bill reminder flag is required'),
      quotaWarning: readRequiredBoolean(notifications, 'quotaWarning', 'Settings quota warning flag is required'),
      apiMonitor: readRequiredBoolean(notifications, 'apiMonitor', 'Settings API monitor flag is required'),
    },
  };
}

function ensureSettingsUpdateSuccess(result: unknown): void {
  try {
    ensureSdkworkApiSuccess(result, 'Settings update confirmation is required');
  } catch {
    throw new Error('Settings update confirmation is required');
  }
  if (readRequiredBoolean(readApiRecord(result), 'success', 'Settings update confirmation is required') !== true) {
    throw new Error('Settings update confirmation is required');
  }
}

function readRequiredRecord(record: ApiRecord, key: string, message: string): ApiRecord {
  const value = record[key];
  if (!isRecord(value)) {
    throw new Error(message);
  }
  return value;
}

function readRequiredExistingString(record: ApiRecord, key: string, message: string): string {
  if (!(key in record) || typeof record[key] !== 'string') {
    throw new Error(message);
  }
  return record[key];
}

function readRequiredBoolean(record: ApiRecord, key: string, message: string): boolean {
  const value = record[key];
  if (typeof value !== 'boolean') {
    throw new Error(message);
  }
  return value;
}
