package types

// Installation status retrieve result schema exposed by Claw Router.
type InstallationStatusRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
