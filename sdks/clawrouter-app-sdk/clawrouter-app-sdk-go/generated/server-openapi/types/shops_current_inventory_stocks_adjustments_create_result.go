package types

// Shops current inventory stocks adjustments create result schema exposed by Claw Router.
type ShopsCurrentInventoryStocksAdjustmentsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
