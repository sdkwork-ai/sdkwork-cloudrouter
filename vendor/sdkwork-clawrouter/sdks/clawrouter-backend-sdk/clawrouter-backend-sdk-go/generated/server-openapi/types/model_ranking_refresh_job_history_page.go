package types

// Model ranking refresh job history page schema exposed by Claw Router.
type ModelRankingRefreshJobHistoryPage struct {
	Items []ModelRankingRefreshJobItem `json:"items"`
}
