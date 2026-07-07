package types

// Model rankings jobs list result schema exposed by Claw Router.
type ModelRankingsJobsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
