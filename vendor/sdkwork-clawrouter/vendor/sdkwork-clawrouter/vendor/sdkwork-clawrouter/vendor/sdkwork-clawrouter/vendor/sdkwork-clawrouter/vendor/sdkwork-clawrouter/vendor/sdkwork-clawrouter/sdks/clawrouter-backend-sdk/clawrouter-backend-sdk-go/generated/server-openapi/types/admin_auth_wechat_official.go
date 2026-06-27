package types

// Admin auth wechat official schema exposed by Claw Router.
type AdminAuthWechatOfficial struct {
	AesKeyRef string `json:"aesKeyRef"`
	AppId string `json:"appId"`
	Enabled bool `json:"enabled"`
	Key string `json:"key"`
	Name string `json:"name"`
	OriginalId string `json:"originalId"`
	Primary bool `json:"primary"`
	Scene string `json:"scene"`
	SecretRef string `json:"secretRef"`
	TokenRef string `json:"tokenRef"`
	Url string `json:"url"`
}
