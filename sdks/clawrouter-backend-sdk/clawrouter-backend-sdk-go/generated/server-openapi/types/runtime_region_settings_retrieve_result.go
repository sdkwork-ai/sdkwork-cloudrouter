package types

// Runtime region settings retrieve result schema exposed by Claw Router.
type RuntimeRegionSettingsRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
