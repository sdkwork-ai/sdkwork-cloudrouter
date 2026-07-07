package types

// Site delete result schema exposed by Claw Router.
type SiteDeleteResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
