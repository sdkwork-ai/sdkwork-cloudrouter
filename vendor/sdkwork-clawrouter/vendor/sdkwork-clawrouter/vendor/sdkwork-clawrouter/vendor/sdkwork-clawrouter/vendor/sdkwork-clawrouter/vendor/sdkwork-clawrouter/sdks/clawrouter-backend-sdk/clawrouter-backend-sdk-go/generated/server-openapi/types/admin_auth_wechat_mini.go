package types

// Admin auth wechat mini schema exposed by Claw Router.
type AdminAuthWechatMini struct {
	AppId string `json:"appId"`
	Enabled bool `json:"enabled"`
	Env string `json:"env"`
	Key string `json:"key"`
	Name string `json:"name"`
	Path string `json:"path"`
	Primary bool `json:"primary"`
	SecretRef string `json:"secretRef"`
	Url string `json:"url"`
}
