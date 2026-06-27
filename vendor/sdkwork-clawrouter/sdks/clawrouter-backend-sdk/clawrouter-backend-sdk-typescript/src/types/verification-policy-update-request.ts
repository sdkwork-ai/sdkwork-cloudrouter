import type { JsonValue } from './json-value';

/** Verification policy update request schema exposed by Claw Router. */
export interface VerificationPolicyUpdateRequest {
  /** Allowed channels field on verification policy update request. */
  allowedChannels: string[];
  /** Code length field on verification policy update request. */
  codeLength: string;
  /** Default channel field on verification policy update request. */
  defaultChannel?: string;
  /** Max send per hour field on verification policy update request. */
  maxSendPerHour?: string;
  /** Max verify attempts field on verification policy update request. */
  maxVerifyAttempts: string;
  /** Resend interval seconds field on verification policy update request. */
  resendIntervalSeconds?: string;
  /** Risk policy field on verification policy update request. */
  riskPolicy?: Record<string, JsonValue>;
  /** Template code field on verification policy update request. */
  templateCode: string;
  /** Ttl seconds field on verification policy update request. */
  ttlSeconds: string;
}
