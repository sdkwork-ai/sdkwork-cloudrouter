import type {
  MessagingVerificationCodeCreateRequest,
  MessagingVerificationCodeVerifyRequest,
} from '@sdkwork/messaging-app-sdk';
import {
  readRequiredApiItem,
  readRequiredString,
  type ApiRecord,
} from './api-result.ts';
import { createIdempotencyParams } from './idempotency.ts';
import {
  getSdkworkMessagingAppSdkClient,
  type SdkworkMessagingAppSdkClient,
} from './sdk-clients.ts';

const DEFAULT_MAX_CHALLENGES = 256;
const MAX_CONFIGURABLE_CHALLENGES = 4_096;
const MAX_CACHED_CHALLENGE_TTL_MS = 30 * 60 * 1_000;
const PENDING_CHALLENGE_TTL_MS = 2 * 60 * 1_000;
const MAX_CODE_ID_LENGTH = 256;
const MAX_EMAIL_TARGET_LENGTH = 320;
const MAX_PHONE_TARGET_LENGTH = 64;
const VERIFICATION_CODE_MIN_LENGTH = 4;
const VERIFICATION_CODE_MAX_LENGTH = 12;

const VERIFICATION_SCENES = [
  'BIND_EMAIL',
  'BIND_PHONE',
  'LOGIN',
  'REGISTER',
  'RESET_PASSWORD',
] as const;
const VERIFICATION_TYPES = ['EMAIL', 'PHONE'] as const;
const VERIFICATION_STATUSES = [
  'pending',
  'verified',
  'failed',
  'locked',
  'expired',
] as const;

type VerificationScene = (typeof VERIFICATION_SCENES)[number];
type VerificationType = (typeof VERIFICATION_TYPES)[number];
type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
type VerificationChannel = NonNullable<MessagingVerificationCodeCreateRequest['channel']>;

type VerificationCodesClient = Pick<
  SdkworkMessagingAppSdkClient['messaging']['verificationCodes'],
  'create' | 'verify'
>;

interface NormalizedVerificationTarget {
  channel: VerificationChannel;
  sceneCode: VerificationScene;
  target: string;
  verificationType: VerificationType;
}

interface PendingChallenge {
  expiresAtMs: number;
  kind: 'pending';
  token: symbol;
}

interface ActiveChallenge {
  codeId: string;
  expiresAtMs: number;
  kind: 'active';
}

type ChallengeEntry = PendingChallenge | ActiveChallenge;

export interface ClawRouterMessagingVerificationService {
  verificationCodes: {
    create: (body: Record<string, unknown>) => Promise<ApiRecord>;
    verify: (body: Record<string, unknown>) => Promise<ApiRecord>;
  };
}

export interface CreateClawRouterMessagingVerificationServiceOptions {
  getClient?: () => VerificationCodesClient;
  maxChallenges?: number;
  now?: () => number;
}

class VerificationChallengeCache {
  private readonly entries = new Map<string, ChallengeEntry>();

  constructor(
    private readonly maxChallenges: number,
    private readonly now: () => number,
  ) {}

  reserve(key: string): symbol {
    this.pruneExpired();
    const token = Symbol('messaging-verification-challenge');
    this.entries.delete(key);
    this.entries.set(key, {
      expiresAtMs: this.now() + PENDING_CHALLENGE_TTL_MS,
      kind: 'pending',
      token,
    });
    this.trimToCapacity();
    return token;
  }

  commit(key: string, token: symbol, challenge: ActiveChallenge): boolean {
    this.pruneExpired();
    const current = this.entries.get(key);
    if (current?.kind !== 'pending' || current.token !== token) {
      return false;
    }
    this.entries.delete(key);
    this.entries.set(key, challenge);
    return true;
  }

  release(key: string, token: symbol): void {
    const current = this.entries.get(key);
    if (current?.kind === 'pending' && current.token === token) {
      this.entries.delete(key);
    }
  }

  read(key: string): ActiveChallenge | undefined {
    this.pruneExpired();
    const challenge = this.entries.get(key);
    return challenge?.kind === 'active' ? challenge : undefined;
  }

  delete(key: string, codeId: string): void {
    const challenge = this.entries.get(key);
    if (challenge?.kind === 'active' && challenge.codeId === codeId) {
      this.entries.delete(key);
    }
  }

  clear(): void {
    this.entries.clear();
  }

  private pruneExpired(): void {
    const now = this.now();
    for (const [key, challenge] of this.entries) {
      if (challenge.expiresAtMs <= now) {
        this.entries.delete(key);
      }
    }
  }

  private trimToCapacity(): void {
    while (this.entries.size > this.maxChallenges) {
      const oldestKey = this.entries.keys().next().value;
      if (typeof oldestKey !== 'string') {
        this.entries.clear();
        return;
      }
      this.entries.delete(oldestKey);
    }
  }
}

let sharedMessagingVerificationService: ClawRouterMessagingVerificationService | null = null;

export function createClawRouterMessagingVerificationService(
  options: CreateClawRouterMessagingVerificationServiceOptions = {},
): ClawRouterMessagingVerificationService {
  const now = options.now ?? Date.now;
  const maxChallenges = normalizeMaxChallenges(options.maxChallenges);
  const cache = new VerificationChallengeCache(maxChallenges, now);
  const getClient = options.getClient
    ?? (() => getSdkworkMessagingAppSdkClient().messaging.verificationCodes);

  return {
    verificationCodes: {
      create: async (body) => {
        const target = normalizeVerificationTarget(body);
        const cacheKey = createChallengeCacheKey(target);
        const reservation = cache.reserve(cacheKey);
        try {
          const request: MessagingVerificationCodeCreateRequest = {
            channel: target.channel,
            sceneCode: target.sceneCode,
            target: target.target,
          };
          const result = await getClient().create(
            request,
            createIdempotencyParams('messaging-verification-code-create'),
          );
          const item = readRequiredApiItem(
            result,
            'Messaging verification challenge response is missing.',
          );
          const codeId = readRequiredBoundedString(
            item,
            'codeId',
            MAX_CODE_ID_LENGTH,
            'Messaging verification challenge codeId is invalid.',
          );
          const expiresAtMs = readChallengeExpiry(item, now());
          const status = readOptionalVerificationStatus(item);
          if (status !== undefined && status !== 'pending') {
            throw new Error('Messaging verification challenge is not pending.');
          }
          const committed = cache.commit(cacheKey, reservation, {
            codeId,
            expiresAtMs: Math.min(expiresAtMs, now() + MAX_CACHED_CHALLENGE_TTL_MS),
            kind: 'active',
          });
          if (!committed) {
            throw new Error('Messaging verification challenge was superseded by a newer request.');
          }
          return item;
        } catch (error) {
          cache.release(cacheKey, reservation);
          throw error;
        }
      },
      verify: async (body) => {
        const target = normalizeVerificationTarget(body);
        const code = readVerificationCode(body);
        const cacheKey = createChallengeCacheKey(target);
        const challenge = cache.read(cacheKey);
        if (!challenge) {
          throw new Error('No active messaging verification challenge exists for this request.');
        }
        const request: MessagingVerificationCodeVerifyRequest = {
          code,
          codeId: challenge.codeId,
        };
        const result = await getClient().verify(
          request,
          createIdempotencyParams('messaging-verification-code-verify'),
        );
        const item = readRequiredApiItem(
          result,
          'Messaging verification result is missing.',
        );
        const verified = readRequiredBoolean(
          item,
          'verified',
          'Messaging verification result is invalid.',
        );
        const status = readRequiredVerificationStatus(item);
        if (verified !== (status === 'verified')) {
          throw new Error('Messaging verification result is inconsistent.');
        }
        if (verified || status === 'locked' || status === 'expired') {
          cache.delete(cacheKey, challenge.codeId);
        }
        return item;
      },
    },
  };
}

export function getClawRouterMessagingVerificationService(): ClawRouterMessagingVerificationService {
  sharedMessagingVerificationService ??= createClawRouterMessagingVerificationService();
  return sharedMessagingVerificationService;
}

export function resetClawRouterMessagingVerificationService(): void {
  sharedMessagingVerificationService = null;
}

function normalizeMaxChallenges(value: number | undefined): number {
  const normalized = value ?? DEFAULT_MAX_CHALLENGES;
  if (
    !Number.isSafeInteger(normalized)
    || normalized < 1
    || normalized > MAX_CONFIGURABLE_CHALLENGES
  ) {
    throw new Error(
      `maxChallenges must be an integer between 1 and ${MAX_CONFIGURABLE_CHALLENGES}.`,
    );
  }
  return normalized;
}

function normalizeVerificationTarget(body: Record<string, unknown>): NormalizedVerificationTarget {
  const sceneCode = readRequiredEnum(
    body,
    'scene',
    VERIFICATION_SCENES,
    'Messaging verification scene is invalid.',
  );
  const verificationType = readRequiredEnum(
    body,
    'verifyType',
    VERIFICATION_TYPES,
    'Messaging verification type is invalid.',
  );
  const channel = verificationType === 'EMAIL' ? 'email' : 'sms';
  const maxTargetLength = channel === 'email'
    ? MAX_EMAIL_TARGET_LENGTH
    : MAX_PHONE_TARGET_LENGTH;
  const rawTarget = readRequiredBoundedString(
    body,
    'target',
    maxTargetLength,
    'Messaging verification target is invalid.',
  );
  return {
    channel,
    sceneCode,
    target: channel === 'email' ? rawTarget.toLowerCase() : rawTarget,
    verificationType,
  };
}

function readVerificationCode(body: Record<string, unknown>): string {
  const code = readRequiredBoundedString(
    body,
    'code',
    VERIFICATION_CODE_MAX_LENGTH,
    'Messaging verification code is invalid.',
  );
  if (code.length < VERIFICATION_CODE_MIN_LENGTH) {
    throw new Error('Messaging verification code is invalid.');
  }
  return code;
}

function createChallengeCacheKey(target: NormalizedVerificationTarget): string {
  return JSON.stringify([
    target.sceneCode,
    target.verificationType,
    target.target,
  ]);
}

function readChallengeExpiry(item: ApiRecord, now: number): number {
  const expiresAt = readRequiredBoundedString(
    item,
    'expiresAt',
    64,
    'Messaging verification challenge expiresAt is invalid.',
  );
  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now) {
    throw new Error('Messaging verification challenge expiresAt is invalid.');
  }
  return expiresAtMs;
}

function readRequiredBoundedString(
  record: ApiRecord,
  key: string,
  maxLength: number,
  message: string,
): string {
  const value = record[key];
  if (typeof value !== 'string') {
    throw new Error(message);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || /[\u0000-\u001F\u007F]/u.test(normalized)) {
    throw new Error(message);
  }
  return normalized;
}

function readRequiredBoolean(record: ApiRecord, key: string, message: string): boolean {
  const value = record[key];
  if (typeof value !== 'boolean') {
    throw new Error(message);
  }
  return value;
}

function readOptionalVerificationStatus(item: ApiRecord): VerificationStatus | undefined {
  if (item.status === undefined) {
    return undefined;
  }
  return readRequiredVerificationStatus(item);
}

function readRequiredVerificationStatus(item: ApiRecord): VerificationStatus {
  return readRequiredEnum(
    item,
    'status',
    VERIFICATION_STATUSES,
    'Messaging verification status is invalid.',
  );
}

function readRequiredEnum<const TValue extends string>(
  record: ApiRecord,
  key: string,
  allowed: readonly TValue[],
  message: string,
): TValue {
  const value = readRequiredString(record, key, message);
  if ((allowed as readonly string[]).includes(value)) {
    return value as TValue;
  }
  throw new Error(message);
}
