package types

// Admin auth wechat settings schema exposed by Claw Router.
type AdminAuthWechatSettings struct {
	Mini []AdminAuthWechatMini `json:"mini"`
	Official []AdminAuthWechatOfficial `json:"official"`
}
