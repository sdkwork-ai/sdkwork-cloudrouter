package types

// Storage reconciliation run mutation response schema exposed by Claw Router.
type StorageReconciliationRunMutationResponse struct {
	ReconciliationRun StorageReconciliationRun `json:"reconciliationRun"`
	RequestId string `json:"requestId"`
}
