package types

// Api keys delete result schema exposed by Cloud Router.
type ApiKeysDeleteResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
