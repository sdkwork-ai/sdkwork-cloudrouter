package types

// Admin channel credential item schema exposed by Claw Router.
type AdminChannelCredentialItem struct {
	ApiKey string `json:"apiKey"`
	BaseUrl string `json:"baseUrl"`
	CredentialId string `json:"credentialId"`
	Errors string `json:"errors"`
	Id string `json:"id"`
	MaskedLabel string `json:"maskedLabel"`
	Name string `json:"name"`
	Priority string `json:"priority"`
	SecretRef string `json:"secretRef"`
	Status string `json:"status"`
	Weight string `json:"weight"`
}
