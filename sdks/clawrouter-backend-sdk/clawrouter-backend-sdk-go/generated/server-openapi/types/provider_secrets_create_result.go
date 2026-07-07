package types

// Provider secrets create result schema exposed by Claw Router.
type ProviderSecretsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
