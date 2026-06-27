package types

// Oss providers update result schema exposed by Claw Router.
type OssProvidersUpdateResult struct {
	Code string `json:"code"`
	Data StorageProviderMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
