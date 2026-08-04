package types

// Turn responses create result schema exposed by Cloud Router.
type TurnResponsesCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
