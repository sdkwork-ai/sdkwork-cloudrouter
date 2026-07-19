/** AdminAuthSettingsResponse contract. */
export interface AdminAuthSettingsResponse {
  /** leftRailMode field on AdminAuthSettingsResponse. */
  leftRailMode: 'auto' | 'highlights-only' | 'qr-only';
  /** loginMethods field on AdminAuthSettingsResponse. */
  loginMethods: ('password' | 'emailCode' | 'phoneCode' | 'sessionBridge')[];
  /** oauthLoginEnabled field on AdminAuthSettingsResponse. */
  oauthLoginEnabled: boolean;
  /** oauthProviders field on AdminAuthSettingsResponse. */
  oauthProviders: string[];
  /** oauthRegion field on AdminAuthSettingsResponse. */
  oauthRegion: 'mainland' | 'overseas';
  /** qrLoginEnabled field on AdminAuthSettingsResponse. */
  qrLoginEnabled: boolean;
  /** qrLoginType field on AdminAuthSettingsResponse. */
  qrLoginType: 'web' | 'official' | 'mini';
  /** recoveryMethods field on AdminAuthSettingsResponse. */
  recoveryMethods: ('email' | 'phone')[];
  /** registerMethods field on AdminAuthSettingsResponse. */
  registerMethods: ('email' | 'phone')[];
  /** verificationPolicy field on AdminAuthSettingsResponse. */
  verificationPolicy: Record<string, unknown>;
  /** wechat field on AdminAuthSettingsResponse. */
  wechat: Record<string, unknown>;
}
