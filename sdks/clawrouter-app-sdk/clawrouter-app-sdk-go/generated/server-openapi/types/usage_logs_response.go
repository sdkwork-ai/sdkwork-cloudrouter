package types

// Usage logs response schema exposed by Claw Router.
type UsageLogsResponse struct {
	Logs []UsageLogItem `json:"logs"`
	Page string `json:"page"`
	PageSize string `json:"pageSize"`
	Total string `json:"total"`
}
