package types

// Provider secrets create result schema exposed by Claw Router.
type ProviderSecretsCreateResult struct {
	Code string `json:"code"`
	Data AdminProviderSecretMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
