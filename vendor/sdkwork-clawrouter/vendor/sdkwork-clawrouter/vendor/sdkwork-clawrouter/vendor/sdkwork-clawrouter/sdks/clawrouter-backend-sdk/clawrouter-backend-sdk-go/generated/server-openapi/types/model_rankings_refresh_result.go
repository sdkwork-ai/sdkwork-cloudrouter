package types

// Model rankings refresh result schema exposed by Claw Router.
type ModelRankingsRefreshResult struct {
	Code string `json:"code"`
	Data ModelRankingRefreshTriggerResponse `json:"data"`
	Msg string `json:"msg"`
}
