import type {
  FirewallCreateInput,
  IpLimitCreateInput,
  ModelLimitCreateInput,
  TokenLimitCreateInput,
} from './ratelimitService';

export function createIpLimitInputFromForm(formData: FormData): IpLimitCreateInput {
  return {
    ruleName: readFormText(formData, 'ruleName'),
    targetIp: readFormText(formData, 'targetIp'),
    rps: readPositiveInteger(formData, 'rps'),
    rpm: readPositiveInteger(formData, 'rpm'),
    blockDuration: readRequiredFormText(formData, 'blockDuration'),
  };
}

export function createTokenLimitInputFromForm(formData: FormData): TokenLimitCreateInput {
  return {
    keyPrefix: readRequiredFormText(formData, 'keyPrefix'),
    user: readFormText(formData, 'user'),
    rps: readPositiveInteger(formData, 'rps'),
    rpd: readPositiveInteger(formData, 'rpd'),
    burst: readPositiveInteger(formData, 'burst'),
  };
}

export function createModelLimitInputFromForm(formData: FormData): ModelLimitCreateInput {
  return {
    model: readFormText(formData, 'model'),
    channelGroup: readFormText(formData, 'channelGroup'),
    rpm: readPositiveInteger(formData, 'rpm'),
    tpm: readPositiveInteger(formData, 'tpm'),
  };
}

export function createFirewallInputFromForm(formData: FormData): FirewallCreateInput {
  return {
    type: readFormText(formData, 'type'),
    value: readFormText(formData, 'value'),
    reason: readFormText(formData, 'reason'),
  };
}

function readFormText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function readPositiveInteger(formData: FormData, key: string): number {
  const text = readFormText(formData, key);
  if (!/^\d+$/.test(text)) {
    throw new Error(`${key} must be a positive integer`);
  }
  const value = Number(text);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${key} must be a positive integer`);
  }
  return value;
}

function readRequiredFormText(formData: FormData, key: string): string {
  const value = readFormText(formData, key);
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}
