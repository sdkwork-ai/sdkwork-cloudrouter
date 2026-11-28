/** App auth runtime settings response schema exposed by Cloud Router. */
export interface AppAuthRuntimeSettingsResponse {
  /** Invite code policy field on app auth runtime settings response. */
  inviteCodePolicy: { loginRequired: boolean; registerRequired: boolean; };
  /** Left rail mode field on app auth runtime settings response. */
  leftRailMode: 'auto' | 'highlights-only' | 'qr-only';
  /** Login methods field on app auth runtime settings response. */
  loginMethods: ('password' | 'emailCode' | 'phoneCode' | 'sessionBridge')[];
  /** Oauth login enabled field on app auth runtime settings response. */
  oauthLoginEnabled: boolean;
  /** Oauth providers field on app auth runtime settings response. */
  oauthProviders: string[];
  /** Oauth region field on app auth runtime settings response. */
  oauthRegion: 'mainland' | 'overseas';
  /** Qr login enabled field on app auth runtime settings response. */
  qrLoginEnabled: boolean;
  /** Qr login type field on app auth runtime settings response. */
  qrLoginType: 'web' | 'official' | 'mini';
  /** Recovery methods field on app auth runtime settings response. */
  recoveryMethods: ('email' | 'phone')[];
  /** Register methods field on app auth runtime settings response. */
  registerMethods: ('username' | 'email' | 'phone')[];
  /** Verification policy field on app auth runtime settings response. */
  verificationPolicy: { emailCodeLoginEnabled: boolean; emailRegistrationVerificationRequired: boolean; phoneCodeLoginEnabled: boolean; phoneRegistrationVerificationRequired: boolean; };
}
