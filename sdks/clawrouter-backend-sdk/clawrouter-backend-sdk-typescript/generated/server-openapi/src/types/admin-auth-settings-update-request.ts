import type { JsonValue } from './json-value';

/** AdminAuthSettingsUpdateRequest contract. */
export interface AdminAuthSettingsUpdateRequest {
  /** leftRailMode field on AdminAuthSettingsUpdateRequest. */
  leftRailMode?: 'auto' | 'highlights-only' | 'qr-only';
  /** loginMethods field on AdminAuthSettingsUpdateRequest. */
  loginMethods?: ('password' | 'emailCode' | 'phoneCode' | 'sessionBridge')[];
  /** oauthLoginEnabled field on AdminAuthSettingsUpdateRequest. */
  oauthLoginEnabled?: boolean;
  /** oauthProviders field on AdminAuthSettingsUpdateRequest. */
  oauthProviders?: string[];
  /** oauthRegion field on AdminAuthSettingsUpdateRequest. */
  oauthRegion?: 'mainland' | 'overseas';
  /** qrLoginEnabled field on AdminAuthSettingsUpdateRequest. */
  qrLoginEnabled?: boolean;
  /** qrLoginType field on AdminAuthSettingsUpdateRequest. */
  qrLoginType?: 'web' | 'official' | 'mini';
  /** recoveryMethods field on AdminAuthSettingsUpdateRequest. */
  recoveryMethods?: ('email' | 'phone')[];
  /** registerMethods field on AdminAuthSettingsUpdateRequest. */
  registerMethods?: ('email' | 'phone')[];
  /** verificationPolicy field on AdminAuthSettingsUpdateRequest. */
  verificationPolicy?: Record<string, JsonValue>;
  /** wechat field on AdminAuthSettingsUpdateRequest. */
  wechat?: Record<string, JsonValue>;
}
