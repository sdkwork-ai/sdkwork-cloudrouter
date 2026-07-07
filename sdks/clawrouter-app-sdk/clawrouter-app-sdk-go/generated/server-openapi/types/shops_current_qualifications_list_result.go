package types

// Shops current qualifications list result schema exposed by Claw Router.
type ShopsCurrentQualificationsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
