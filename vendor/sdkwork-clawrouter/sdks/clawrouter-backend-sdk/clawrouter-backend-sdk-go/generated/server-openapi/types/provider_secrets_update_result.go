package types

// Provider secrets update result schema exposed by Claw Router.
type ProviderSecretsUpdateResult struct {
	Code string `json:"code"`
	Data AdminProviderSecretMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
