package types

// Oss providers list result schema exposed by Claw Router.
type OssProvidersListResult struct {
	Code string `json:"code"`
	Data StorageProviderListResponse `json:"data"`
	Msg string `json:"msg"`
}
