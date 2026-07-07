package types

// Site update result schema exposed by Claw Router.
type SiteUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
