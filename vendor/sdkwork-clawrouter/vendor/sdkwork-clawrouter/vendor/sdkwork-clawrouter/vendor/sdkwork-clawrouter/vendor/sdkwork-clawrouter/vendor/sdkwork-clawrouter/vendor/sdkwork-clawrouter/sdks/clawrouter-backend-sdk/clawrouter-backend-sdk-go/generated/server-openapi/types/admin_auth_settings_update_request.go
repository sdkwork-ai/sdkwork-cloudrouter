package types

// Admin auth settings update request schema exposed by Claw Router.
type AdminAuthSettingsUpdateRequest struct {
	LeftRailMode string `json:"leftRailMode"`
	LoginMethods []string `json:"loginMethods"`
	OauthLoginEnabled bool `json:"oauthLoginEnabled"`
	OauthProviders []string `json:"oauthProviders"`
	OauthRegion string `json:"oauthRegion"`
	QrLoginEnabled bool `json:"qrLoginEnabled"`
	QrLoginType string `json:"qrLoginType"`
	RecoveryMethods []string `json:"recoveryMethods"`
	RegisterMethods []string `json:"registerMethods"`
	VerificationPolicy AdminAuthVerificationPolicy `json:"verificationPolicy"`
	Wechat AdminAuthWechatSettingsUpdate `json:"wechat"`
}
