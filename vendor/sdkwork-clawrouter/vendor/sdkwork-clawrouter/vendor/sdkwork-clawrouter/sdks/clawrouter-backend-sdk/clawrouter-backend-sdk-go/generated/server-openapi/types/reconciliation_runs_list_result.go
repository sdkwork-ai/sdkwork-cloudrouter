package types

// Reconciliation runs list result schema exposed by Claw Router.
type ReconciliationRunsListResult struct {
	Code string `json:"code"`
	Data ServiceProviderCollectionResponse `json:"data"`
	Msg string `json:"msg"`
}
