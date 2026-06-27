package types

// Oss quotas create result schema exposed by Claw Router.
type OssQuotasCreateResult struct {
	Code string `json:"code"`
	Data StorageQuotaPolicyMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
