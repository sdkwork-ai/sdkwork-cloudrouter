package types

// Provider secrets delete result schema exposed by Cloud Router.
type ProviderSecretsDeleteResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
