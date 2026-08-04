package types

// Shops current retrieve result schema exposed by Cloud Router.
type ShopsCurrentRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
