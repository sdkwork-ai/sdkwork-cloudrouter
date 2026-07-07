package types

// Model mappings update result schema exposed by Claw Router.
type ModelMappingsUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
