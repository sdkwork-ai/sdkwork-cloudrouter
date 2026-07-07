package types

// Model mappings create result schema exposed by Claw Router.
type ModelMappingsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
