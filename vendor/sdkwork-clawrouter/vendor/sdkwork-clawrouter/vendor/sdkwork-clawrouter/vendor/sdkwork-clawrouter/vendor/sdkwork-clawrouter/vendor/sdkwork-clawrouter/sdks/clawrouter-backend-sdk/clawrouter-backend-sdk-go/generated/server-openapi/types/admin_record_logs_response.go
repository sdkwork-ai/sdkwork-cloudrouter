package types

// Admin record logs response schema exposed by Claw Router.
type AdminRecordLogsResponse struct {
	Logs []AdminRecordLogItem `json:"logs"`
	Page string `json:"page"`
	PageSize string `json:"pageSize"`
	Total string `json:"total"`
}
