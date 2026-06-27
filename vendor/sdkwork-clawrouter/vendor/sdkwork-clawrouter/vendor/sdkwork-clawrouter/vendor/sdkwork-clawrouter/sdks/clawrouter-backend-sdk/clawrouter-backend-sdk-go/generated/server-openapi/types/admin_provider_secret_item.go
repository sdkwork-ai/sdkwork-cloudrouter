package types

// Persisted provider secret account snapshot returned by the backend.
type AdminProviderSecretItem struct {
	AccountCode string `json:"accountCode"`
	AuthType string `json:"authType"`
	CreatedAt string `json:"createdAt"`
	Id string `json:"id"`
	MaskedLabel string `json:"maskedLabel"`
	Name string `json:"name"`
	ProviderCode string `json:"providerCode"`
	SecretRef string `json:"secretRef"`
	Status string `json:"status"`
	UpdatedAt string `json:"updatedAt"`
}
