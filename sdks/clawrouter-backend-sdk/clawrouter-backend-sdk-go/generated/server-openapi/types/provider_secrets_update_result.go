package types

// Provider secrets update result schema exposed by Claw Router.
type ProviderSecretsUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
