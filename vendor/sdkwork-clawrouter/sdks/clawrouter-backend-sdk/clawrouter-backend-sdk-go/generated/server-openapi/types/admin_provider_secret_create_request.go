package types

// Admin provider secret create request schema exposed by Claw Router.
type AdminProviderSecretCreateRequest struct {
	AuthType string `json:"authType"`
	Name string `json:"name"`
	ProviderCode string `json:"providerCode"`
	SecretRef string `json:"secretRef"`
	Status string `json:"status"`
}
