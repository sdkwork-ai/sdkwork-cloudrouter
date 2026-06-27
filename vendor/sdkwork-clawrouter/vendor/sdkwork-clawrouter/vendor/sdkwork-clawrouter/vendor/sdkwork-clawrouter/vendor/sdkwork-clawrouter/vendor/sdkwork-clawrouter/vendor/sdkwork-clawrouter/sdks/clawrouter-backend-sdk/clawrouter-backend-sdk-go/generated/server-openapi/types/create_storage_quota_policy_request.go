package types

// Create storage quota policy request schema exposed by Claw Router.
type CreateStorageQuotaPolicyRequest struct {
	Enforcement string `json:"enforcement"`
	QuotaLimit string `json:"quotaLimit"`
	QuotaLimitBytes string `json:"quotaLimitBytes"`
	ScopeId string `json:"scopeId"`
	ScopeType string `json:"scopeType"`
	SingleFileLimitBytes string `json:"singleFileLimitBytes"`
}
