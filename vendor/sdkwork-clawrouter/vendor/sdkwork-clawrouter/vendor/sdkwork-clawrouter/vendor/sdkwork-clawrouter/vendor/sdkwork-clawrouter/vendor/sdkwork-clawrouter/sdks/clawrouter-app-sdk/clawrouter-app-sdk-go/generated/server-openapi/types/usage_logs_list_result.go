package types

// Usage logs list result schema exposed by Claw Router.
type UsageLogsListResult struct {
	Code string `json:"code"`
	Data UsageLogsResponse `json:"data"`
	Msg string `json:"msg"`
}
