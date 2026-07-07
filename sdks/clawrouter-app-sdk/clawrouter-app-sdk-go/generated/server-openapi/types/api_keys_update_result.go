package types

// Api keys update result schema exposed by Claw Router.
type ApiKeysUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
