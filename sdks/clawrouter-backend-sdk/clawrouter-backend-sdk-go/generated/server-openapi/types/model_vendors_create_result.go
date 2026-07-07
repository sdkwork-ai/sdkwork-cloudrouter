package types

// Model vendors create result schema exposed by Claw Router.
type ModelVendorsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
