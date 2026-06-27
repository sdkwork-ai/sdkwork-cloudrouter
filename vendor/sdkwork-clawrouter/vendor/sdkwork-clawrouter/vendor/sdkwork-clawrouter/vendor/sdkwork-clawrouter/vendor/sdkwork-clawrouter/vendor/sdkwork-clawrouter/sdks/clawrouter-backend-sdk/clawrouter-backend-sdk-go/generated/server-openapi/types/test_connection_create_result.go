package types

// Test connection create result schema exposed by Claw Router.
type TestConnectionCreateResult struct {
	Code string `json:"code"`
	Data AdminSiteConnectionCheckResponse `json:"data"`
	Msg string `json:"msg"`
}
