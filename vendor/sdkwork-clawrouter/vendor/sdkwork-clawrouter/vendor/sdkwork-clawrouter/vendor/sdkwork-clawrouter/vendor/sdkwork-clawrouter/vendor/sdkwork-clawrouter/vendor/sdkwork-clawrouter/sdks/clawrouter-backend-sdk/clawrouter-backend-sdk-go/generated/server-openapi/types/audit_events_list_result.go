package types

// Audit events list result schema exposed by Claw Router.
type AuditEventsListResult struct {
	Code string `json:"code"`
	Data ServiceProviderCollectionResponse `json:"data"`
	Msg string `json:"msg"`
}
