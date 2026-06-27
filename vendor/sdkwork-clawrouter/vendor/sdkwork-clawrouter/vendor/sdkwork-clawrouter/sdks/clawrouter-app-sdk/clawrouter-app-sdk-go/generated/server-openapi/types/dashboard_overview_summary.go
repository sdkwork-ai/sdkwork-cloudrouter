package types

// Dashboard overview summary schema exposed by Claw Router.
type DashboardOverviewSummary struct {
	AudioRequests string `json:"audioRequests"`
	AvailableCredits float64 `json:"availableCredits"`
	ErrorCount string `json:"errorCount"`
	ImageRequests string `json:"imageRequests"`
	MusicRequests string `json:"musicRequests"`
	RequestCount string `json:"requestCount"`
	Rpm float64 `json:"rpm"`
	TotalRequestCount string `json:"totalRequestCount"`
	TotalUsedCredits float64 `json:"totalUsedCredits"`
	Tpm float64 `json:"tpm"`
	UsedCredits float64 `json:"usedCredits"`
	VideoRequests string `json:"videoRequests"`
}
