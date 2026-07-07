package types

// After sales return shipments create result schema exposed by Claw Router.
type AfterSalesReturnShipmentsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
