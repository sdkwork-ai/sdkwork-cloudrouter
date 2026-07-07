package types

// Model rankings refresh result schema exposed by Claw Router.
type ModelRankingsRefreshResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
