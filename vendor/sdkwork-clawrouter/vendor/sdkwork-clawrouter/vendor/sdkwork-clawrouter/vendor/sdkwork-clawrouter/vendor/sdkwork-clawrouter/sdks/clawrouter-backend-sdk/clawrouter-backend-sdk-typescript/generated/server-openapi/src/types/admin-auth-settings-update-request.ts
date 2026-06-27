import type { AdminAuthVerificationPolicy } from './admin-auth-verification-policy';
import type { AdminAuthWechatSettingsUpdate } from './admin-auth-wechat-settings-update';

/** Admin auth settings update request schema exposed by Claw Router. */
export interface AdminAuthSettingsUpdateRequest {
  /** Left rail mode field on admin auth settings update request. */
  leftRailMode?: 'auto' | 'highlights-only' | 'qr-only';
  /** Login methods field on admin auth settings update request. */
  loginMethods?: ('password' | 'emailCode' | 'phoneCode' | 'sessionBridge')[];
  /** Oauth login enabled field on admin auth settings update request. */
  oauthLoginEnabled?: boolean;
  /** Oauth providers field on admin auth settings update request. */
  oauthProviders?: string[];
  /** Oauth region field on admin auth settings update request. */
  oauthRegion?: 'mainland' | 'overseas';
  /** Qr login enabled field on admin auth settings update request. */
  qrLoginEnabled?: boolean;
  /** Qr login type field on admin auth settings update request. */
  qrLoginType?: 'web' | 'official' | 'mini';
  /** Recovery methods field on admin auth settings update request. */
  recoveryMethods?: ('email' | 'phone')[];
  /** Register methods field on admin auth settings update request. */
  registerMethods?: ('email' | 'phone')[];
  /** Verification policy field on admin auth settings update request. */
  verificationPolicy?: AdminAuthVerificationPolicy;
  /** Wechat field on admin auth settings update request. */
  wechat?: AdminAuthWechatSettingsUpdate;
}
