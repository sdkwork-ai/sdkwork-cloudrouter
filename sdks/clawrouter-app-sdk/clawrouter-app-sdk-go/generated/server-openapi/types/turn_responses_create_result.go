package types

// Turn responses create result schema exposed by Claw Router.
type TurnResponsesCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
