package types

// Storage usage ledger list response schema exposed by Claw Router.
type StorageUsageLedgerListResponse struct {
	Items []StorageUsageLedgerEntry `json:"items"`
	NextCursor string `json:"nextCursor"`
	RequestId string `json:"requestId"`
}
