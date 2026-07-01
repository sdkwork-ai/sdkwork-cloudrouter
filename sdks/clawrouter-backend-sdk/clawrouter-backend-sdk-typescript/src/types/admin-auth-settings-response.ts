import type { AdminAuthVerificationPolicy } from './admin-auth-verification-policy';
import type { AdminAuthWechatSettings } from './admin-auth-wechat-settings';

/** Admin auth settings response schema exposed by Claw Router. */
export interface AdminAuthSettingsResponse {
  /** Left rail mode field on admin auth settings response. */
  leftRailMode: string;
  /** Login methods field on admin auth settings response. */
  loginMethods: string[];
  /** Oauth login enabled field on admin auth settings response. */
  oauthLoginEnabled: boolean;
  /** Oauth providers field on admin auth settings response. */
  oauthProviders: string[];
  /** Oauth region field on admin auth settings response. */
  oauthRegion: string;
  /** Qr login enabled field on admin auth settings response. */
  qrLoginEnabled: boolean;
  /** Qr login type field on admin auth settings response. */
  qrLoginType: 'web' | 'official' | 'mini';
  /** Recovery methods field on admin auth settings response. */
  recoveryMethods: string[];
  /** Register methods field on admin auth settings response. */
  registerMethods: string[];
  /** Verification policy field on admin auth settings response. */
  verificationPolicy: AdminAuthVerificationPolicy;
  /** Wechat field on admin auth settings response. */
  wechat: AdminAuthWechatSettings;
}
