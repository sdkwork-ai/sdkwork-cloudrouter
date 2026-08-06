import {
  ensureSdkworkApiSuccess,
  getCloudRouterAppSdkClient,
  isRecord,
  readApiRecord,
  readBoolean,
  readString,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
export interface AppInvitePolicy {
  registerRequired: boolean;
  loginRequired: boolean;
}

export interface AppInviteValidation {
  valid: boolean;
  message: string;
}

export interface AppInviteCodeResult {
  inviteCode: string;
}

export async function fetchInvitePolicy(): Promise<AppInvitePolicy> {
  const result = await getCloudRouterAppSdkClient().iam.invite.policy.retrieve();
  ensureSdkworkApiSuccess(result, 'Unable to load invite policy');
  const record = readApiRecord(result);
  return {
    registerRequired: readBoolean(record, 'registerRequired', false),
    loginRequired: readBoolean(record, 'loginRequired', false),
  };
}

export async function validateInviteCode(inviteCode: string): Promise<AppInviteValidation> {
  const result = await getCloudRouterAppSdkClient().iam.invite.validate.create({ inviteCode });
  ensureSdkworkApiSuccess(result, 'Unable to validate invite code');
  const record = readApiRecord(result);
  return {
    valid: readBoolean(record, 'valid', false),
    message: readString(record, 'message', ''),
  };
}

export interface AppInviteClaimResult {
  rewardStatus: string;
  /**
   * Backend wire code of a rejected claim (e.g. "4001" invalid code, "4090"
   * already bound); empty on success. Lets the gate distinguish terminal
   * business rejections from transient network / server failures.
   */
  wireCode: string;
}

export async function claimInviteRelation(inviteCode: string): Promise<AppInviteClaimResult> {
  const result = await getCloudRouterAppSdkClient().iam.invite.claim.create({ inviteCode });
  // Rejections arrive as problem envelopes carrying the wire code; read it
  // before the success guard throws so the caller can classify the failure.
  const wireCode = isRecord(result) ? readString(result, 'code', '') : '';
  if (wireCode) {
    return { rewardStatus: '', wireCode };
  }
  ensureSdkworkApiSuccess(result, 'Unable to claim invite relation');
  const record = readApiRecord(result);
  return {
    rewardStatus: readString(record, 'rewardStatus', ''),
    wireCode: '',
  };
}

const TICKET_STORAGE_KEY = 'sdkwork-cloudrouter-invite-ticket';
const TICKET_TTL_MILLIS = 30 * 60 * 1000;

export interface InviteTicket {
  code: string;
  expiresAt: number;
}

export function readInviteTicket(): InviteTicket | null {
  try {
    const raw = window.sessionStorage.getItem(TICKET_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<InviteTicket>;
    if (typeof parsed.code !== 'string' || typeof parsed.expiresAt !== 'number') {
      return null;
    }
    if (parsed.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(TICKET_STORAGE_KEY);
      return null;
    }
    return { code: parsed.code, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

export function storeInviteTicket(code: string): InviteTicket {
  const ticket: InviteTicket = {
    code,
    expiresAt: Date.now() + TICKET_TTL_MILLIS,
  };
  window.sessionStorage.setItem(TICKET_STORAGE_KEY, JSON.stringify(ticket));
  return ticket;
}

export function clearInviteTicket(): void {
  window.sessionStorage.removeItem(TICKET_STORAGE_KEY);
}
