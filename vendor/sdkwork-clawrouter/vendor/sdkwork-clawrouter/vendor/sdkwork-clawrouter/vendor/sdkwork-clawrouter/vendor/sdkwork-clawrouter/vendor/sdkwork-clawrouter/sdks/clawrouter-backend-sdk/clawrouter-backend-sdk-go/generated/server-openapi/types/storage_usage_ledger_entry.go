package types

// Storage usage ledger entry schema exposed by Claw Router.
type StorageUsageLedgerEntry struct {
	DeltaBytes string `json:"deltaBytes"`
	Id string `json:"id"`
	OccurredAt string `json:"occurredAt"`
	ScopeId string `json:"scopeId"`
	ScopeType string `json:"scopeType"`
}
