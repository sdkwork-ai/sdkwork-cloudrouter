package types

// Site channels list result schema exposed by Claw Router.
type SiteChannelsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
