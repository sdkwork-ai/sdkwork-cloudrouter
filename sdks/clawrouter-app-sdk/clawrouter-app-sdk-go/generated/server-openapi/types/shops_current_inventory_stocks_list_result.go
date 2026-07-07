package types

// Shops current inventory stocks list result schema exposed by Claw Router.
type ShopsCurrentInventoryStocksListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
