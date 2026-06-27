package types

// Oss providers health checks create result schema exposed by Claw Router.
type OssProvidersHealthChecksCreateResult struct {
	Code string `json:"code"`
	Data StorageProviderHealthCheckResponse `json:"data"`
	Msg string `json:"msg"`
}
