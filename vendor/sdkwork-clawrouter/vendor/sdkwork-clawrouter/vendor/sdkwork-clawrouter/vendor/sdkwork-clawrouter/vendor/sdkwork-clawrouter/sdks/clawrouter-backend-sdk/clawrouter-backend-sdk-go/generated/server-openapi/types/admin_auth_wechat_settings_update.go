package types

// Admin auth wechat settings update schema exposed by Claw Router.
type AdminAuthWechatSettingsUpdate struct {
	Mini []AdminAuthWechatMini `json:"mini"`
	Official []AdminAuthWechatOfficial `json:"official"`
}
