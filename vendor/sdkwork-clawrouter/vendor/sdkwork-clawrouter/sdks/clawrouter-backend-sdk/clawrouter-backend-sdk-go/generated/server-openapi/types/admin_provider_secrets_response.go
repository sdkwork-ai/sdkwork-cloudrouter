package types

// Admin provider secrets response schema exposed by Claw Router.
type AdminProviderSecretsResponse struct {
	Items []AdminProviderSecretItem `json:"items"`
}
