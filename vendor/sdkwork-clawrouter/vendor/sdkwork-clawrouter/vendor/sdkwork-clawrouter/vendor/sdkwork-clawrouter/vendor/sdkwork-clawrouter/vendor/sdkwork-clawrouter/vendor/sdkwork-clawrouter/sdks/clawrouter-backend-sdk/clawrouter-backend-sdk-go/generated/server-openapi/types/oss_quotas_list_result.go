package types

// Oss quotas list result schema exposed by Claw Router.
type OssQuotasListResult struct {
	Code string `json:"code"`
	Data StorageQuotaPolicyListResponse `json:"data"`
	Msg string `json:"msg"`
}
