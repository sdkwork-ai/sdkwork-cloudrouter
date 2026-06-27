import {
  type SdkworkAuthRuntimeConfig,
  type SdkworkAuthVerificationPolicyConfig,
} from '@sdkwork/auth-pc-react';
import { useEffect, useState } from 'react';
import {
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import { fetchClawRouterAuthRuntimeSettings } from './clawRouterAuthSettingsService';

type LoginMethod = NonNullable<SdkworkAuthRuntimeConfig['loginMethods']>[number];
type RegisterMethod = NonNullable<SdkworkAuthRuntimeConfig['registerMethods']>[number];
type RecoveryMethod = NonNullable<SdkworkAuthRuntimeConfig['recoveryMethods']>[number];
type LeftRailMode = NonNullable<SdkworkAuthRuntimeConfig['leftRailMode']>;
type OAuthProviderRegion = NonNullable<SdkworkAuthRuntimeConfig['oauthProviderRegion']>;
type QrLoginType = NonNullable<SdkworkAuthRuntimeConfig['qrLoginType']>;
type BackendQrLoginType = 'web' | 'official' | 'mini';

const LOGIN_METHODS = ['password', 'emailCode', 'phoneCode', 'sessionBridge'] as const satisfies readonly LoginMethod[];
const REGISTER_METHODS = ['email', 'phone'] as const satisfies readonly RegisterMethod[];
const RECOVERY_METHODS = ['email', 'phone'] as const satisfies readonly RecoveryMethod[];
const LEFT_RAIL_MODES = ['auto', 'highlights-only', 'qr-only'] as const satisfies readonly LeftRailMode[];
const OAUTH_REGIONS = ['mainland', 'overseas'] as const satisfies readonly OAuthProviderRegion[];
const BACKEND_QR_LOGIN_TYPES = ['web', 'official', 'mini'] as const satisfies readonly BackendQrLoginType[];

export const DEFAULT_CLAW_ROUTER_AUTH_RUNTIME_CONFIG: SdkworkAuthRuntimeConfig = {
  leftRailMode: 'highlights-only',
  loginMethods: ['password'],
  oauthLoginEnabled: false,
  oauthProviders: [],
  qrLoginEnabled: true,
  qrLoginType: 'sdkwork_app',
  recoveryMethods: ['email', 'phone'],
  registerMethods: ['email', 'phone'],
  verificationPolicy: {
    emailCodeLoginEnabled: false,
    emailRegistrationVerificationRequired: false,
    phoneCodeLoginEnabled: false,
    phoneRegistrationVerificationRequired: false,
  },
};

export function useClawRouterAuthRuntimeConfig(): SdkworkAuthRuntimeConfig {
  const [runtimeConfig, setRuntimeConfig] = useState(DEFAULT_CLAW_ROUTER_AUTH_RUNTIME_CONFIG);

  useEffect(() => {
    let cancelled = false;

    fetchClawRouterAuthRuntimeConfig()
      .then((config) => {
        if (!cancelled) {
          setRuntimeConfig(config);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRuntimeConfig(DEFAULT_CLAW_ROUTER_AUTH_RUNTIME_CONFIG);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return runtimeConfig;
}

export async function fetchClawRouterAuthRuntimeConfig(): Promise<SdkworkAuthRuntimeConfig> {
  return mergeClawRouterAuthRuntimeConfig(await fetchClawRouterAuthRuntimeSettings());
}

export function mergeClawRouterAuthRuntimeConfig(record: ApiRecord): SdkworkAuthRuntimeConfig {
  return {
    ...DEFAULT_CLAW_ROUTER_AUTH_RUNTIME_CONFIG,
    leftRailMode: readRequiredEnum(record, 'leftRailMode', LEFT_RAIL_MODES, 'Auth leftRailMode is required', 'Unsupported auth leftRailMode'),
    loginMethods: readRequiredEnumArray(record, 'loginMethods', LOGIN_METHODS, 'Auth loginMethods are required', 'Unsupported auth loginMethods'),
    oauthLoginEnabled: readRequiredBoolean(record, 'oauthLoginEnabled', 'Auth oauthLoginEnabled flag is required'),
    oauthProviders: readRequiredProviderArray(record, 'oauthProviders', 'Auth oauthProviders are required'),
    ...(readOptionalEnum(record, 'oauthRegion', OAUTH_REGIONS, 'Unsupported auth oauthRegion') === undefined
      ? {}
      : { oauthProviderRegion: readOptionalEnum(record, 'oauthRegion', OAUTH_REGIONS, 'Unsupported auth oauthRegion') }),
    qrLoginEnabled: readRequiredBoolean(record, 'qrLoginEnabled', 'Auth qrLoginEnabled flag is required'),
    qrLoginType: readRequiredQrLoginType(record),
    recoveryMethods: readRequiredEnumArray(record, 'recoveryMethods', RECOVERY_METHODS, 'Auth recoveryMethods are required', 'Unsupported auth recoveryMethods'),
    registerMethods: readRequiredEnumArray(record, 'registerMethods', REGISTER_METHODS, 'Auth registerMethods are required', 'Unsupported auth registerMethods'),
    verificationPolicy: readVerificationPolicy(record.verificationPolicy),
  };
}

function readRequiredQrLoginType(record: ApiRecord): QrLoginType {
  const value = record.qrLoginType;
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Auth qrLoginType is required');
  }
  const normalized = value.trim();
  const backendType = readBackendQrLoginType(normalized);
  if (backendType === 'web') {
    return 'sdkwork_app';
  }
  if (backendType === 'official') {
    return 'wechat_official_account';
  }
  if (backendType === 'mini') {
    return 'wechat_mini_program';
  }
  throw new Error(`Unsupported auth qrLoginType: ${normalized}`);
}

function readBackendQrLoginType(value: string): BackendQrLoginType | null {
  if ((BACKEND_QR_LOGIN_TYPES as readonly string[]).includes(value)) {
    return value as BackendQrLoginType;
  }
  if (value === 'sdkwork_app' || value === 'sdkwork-app' || value === 'sdkwork' || value === 'mobile_app') {
    return 'web';
  }
  if (value === 'wechat_official_account' || value === 'wechat-official-account' || value === 'wechat-official' || value === 'official_account') {
    return 'official';
  }
  if (value === 'wechat_mini_program' || value === 'wechat-mini-program' || value === 'miniapp' || value === 'mini_program') {
    return 'mini';
  }
  return null;
}

function readVerificationPolicy(value: unknown): SdkworkAuthVerificationPolicyConfig {
  if (!isRecord(value)) {
    throw new Error('Auth verificationPolicy is required');
  }
  return {
    emailCodeLoginEnabled: readRequiredBoolean(value, 'emailCodeLoginEnabled', 'Auth emailCodeLoginEnabled flag is required'),
    emailRegistrationVerificationRequired: readRequiredBoolean(value, 'emailRegistrationVerificationRequired', 'Auth emailRegistrationVerificationRequired flag is required'),
    phoneCodeLoginEnabled: readRequiredBoolean(value, 'phoneCodeLoginEnabled', 'Auth phoneCodeLoginEnabled flag is required'),
    phoneRegistrationVerificationRequired: readRequiredBoolean(value, 'phoneRegistrationVerificationRequired', 'Auth phoneRegistrationVerificationRequired flag is required'),
  };
}

function readRequiredBoolean(record: ApiRecord, key: string, message: string): boolean {
  const value = record[key];
  if (typeof value !== 'boolean') {
    throw new Error(message);
  }
  return value;
}

function readRequiredEnum<T extends string>(
  record: ApiRecord,
  key: string,
  allowed: readonly T[],
  missingMessage: string,
  unsupportedPrefix: string,
): T {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(missingMessage);
  }
  const normalized = value.trim();
  if ((allowed as readonly string[]).includes(normalized)) {
    return normalized as T;
  }
  throw new Error(`${unsupportedPrefix}: ${normalized}`);
}

function readOptionalEnum<T extends string>(
  record: ApiRecord,
  key: string,
  allowed: readonly T[],
  unsupportedPrefix: string,
): T | undefined {
  const value = record[key];
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`${unsupportedPrefix}: ${String(value)}`);
  }
  const normalized = value.trim();
  if ((allowed as readonly string[]).includes(normalized)) {
    return normalized as T;
  }
  throw new Error(`${unsupportedPrefix}: ${normalized}`);
}

function readRequiredEnumArray<T extends string>(
  record: ApiRecord,
  key: string,
  allowed: readonly T[],
  missingMessage: string,
  unsupportedPrefix: string,
): T[] {
  const values = record[key];
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(missingMessage);
  }
  const allowedValues = new Set<string>(allowed);
  const normalized = values.map((item) => {
    if (typeof item !== 'string' || !item.trim()) {
      throw new Error(`${unsupportedPrefix}: ${String(item)}`);
    }
    const value = item.trim();
    if (!allowedValues.has(value)) {
      throw new Error(`${unsupportedPrefix}: ${value}`);
    }
    return value as T;
  });
  return [...new Set(normalized)];
}

function readRequiredProviderArray(record: ApiRecord, key: string, missingMessage: string): string[] {
  const values = record[key];
  if (!Array.isArray(values)) {
    throw new Error(missingMessage);
  }
  return values.map((item) => {
    if (typeof item !== 'string' || !item.trim()) {
      throw new Error('Auth oauth provider is invalid');
    }
    const value = item.trim();
    if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length > 64) {
      throw new Error(`Auth oauth provider is invalid: ${value}`);
    }
    return value;
  });
}

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
