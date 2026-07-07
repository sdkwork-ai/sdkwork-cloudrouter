package types

// After sales return shipments list result schema exposed by Claw Router.
type AfterSalesReturnShipmentsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
