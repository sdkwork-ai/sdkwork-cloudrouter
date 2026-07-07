package types

// Runtime region settings update result schema exposed by Claw Router.
type RuntimeRegionSettingsUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
