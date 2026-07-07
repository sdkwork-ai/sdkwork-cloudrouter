package types

// Site runtime retrieve result schema exposed by Claw Router.
type SiteRuntimeRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
