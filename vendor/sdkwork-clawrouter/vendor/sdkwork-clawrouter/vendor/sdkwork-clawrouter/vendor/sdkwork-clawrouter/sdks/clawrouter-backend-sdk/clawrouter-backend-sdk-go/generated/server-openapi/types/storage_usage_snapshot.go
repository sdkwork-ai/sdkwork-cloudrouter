package types

// Storage usage snapshot schema exposed by Claw Router.
type StorageUsageSnapshot struct {
	FileCount string `json:"fileCount"`
	Id string `json:"id"`
	ReservedBytes string `json:"reservedBytes"`
	Scope string `json:"scope"`
	ScopeId string `json:"scopeId"`
	ScopeType string `json:"scopeType"`
	SnapshotAt string `json:"snapshotAt"`
	SnapshotType string `json:"snapshotType"`
	UsedBytes string `json:"usedBytes"`
}
