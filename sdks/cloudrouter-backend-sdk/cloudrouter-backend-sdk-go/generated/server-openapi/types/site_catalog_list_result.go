package types

// Site catalog list result schema exposed by Cloud Router.
type SiteCatalogListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
