package types

// Oss providers create result schema exposed by Claw Router.
type OssProvidersCreateResult struct {
	Code string `json:"code"`
	Data StorageProviderMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
