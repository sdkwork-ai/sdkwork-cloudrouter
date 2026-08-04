package types

// Provider secrets list result schema exposed by Cloud Router.
type ProviderSecretsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
