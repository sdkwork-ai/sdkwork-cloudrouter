package types

// Shops retrieve result schema exposed by Cloud Router.
type ShopsRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
