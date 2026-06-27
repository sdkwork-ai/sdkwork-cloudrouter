package types

// Storage quota policy schema exposed by Claw Router.
type StorageQuotaPolicy struct {
	CreatedAt string `json:"createdAt"`
	Enforcement string `json:"enforcement"`
	Id string `json:"id"`
	Limit string `json:"limit"`
	QuotaLimitBytes string `json:"quotaLimitBytes"`
	ScopeId string `json:"scopeId"`
	ScopeType string `json:"scopeType"`
	SingleFileLimitBytes string `json:"singleFileLimitBytes"`
	Status string `json:"status"`
	UpdatedAt string `json:"updatedAt"`
	Used string `json:"used"`
	UsedBytes string `json:"usedBytes"`
}
