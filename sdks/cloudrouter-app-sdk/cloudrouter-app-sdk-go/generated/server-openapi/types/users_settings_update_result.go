package types

// Users settings update result schema exposed by Cloud Router.
type UsersSettingsUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
