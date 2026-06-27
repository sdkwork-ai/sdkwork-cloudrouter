package types

// Model rankings jobs list result schema exposed by Claw Router.
type ModelRankingsJobsListResult struct {
	Code string `json:"code"`
	Data ModelRankingRefreshJobHistoryPage `json:"data"`
	Msg string `json:"msg"`
}
