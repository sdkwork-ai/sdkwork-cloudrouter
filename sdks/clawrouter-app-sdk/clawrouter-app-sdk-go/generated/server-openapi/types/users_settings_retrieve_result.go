package types

// Users settings retrieve result schema exposed by Claw Router.
type UsersSettingsRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
