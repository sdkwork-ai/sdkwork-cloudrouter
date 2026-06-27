package types

// Storage reconciliation run list response schema exposed by Claw Router.
type StorageReconciliationRunListResponse struct {
	Items []StorageReconciliationRun `json:"items"`
	NextCursor string `json:"nextCursor"`
	RequestId string `json:"requestId"`
}
