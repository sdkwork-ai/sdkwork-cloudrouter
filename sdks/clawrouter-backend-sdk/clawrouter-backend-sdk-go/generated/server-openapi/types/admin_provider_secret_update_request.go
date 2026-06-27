package types

// Admin provider secret update request schema exposed by Claw Router.
type AdminProviderSecretUpdateRequest struct {
	AuthType string `json:"authType"`
	Id string `json:"id"`
	Name string `json:"name"`
	ProviderCode string `json:"providerCode"`
	SecretRef string `json:"secretRef"`
	Status string `json:"status"`
}
