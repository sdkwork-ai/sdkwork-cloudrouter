package types

// Risk events list result schema exposed by Claw Router.
type RiskEventsListResult struct {
	Code string `json:"code"`
	Data ServiceProviderCollectionResponse `json:"data"`
	Msg string `json:"msg"`
}
