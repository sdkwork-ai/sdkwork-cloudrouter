package types

// Model rankings snapshot schema exposed by Claw Router.
type ModelRankingsSnapshot struct {
	History []ModelRankingHistoryPoint `json:"history"`
	Items []ModelRankingItem `json:"items"`
	Source ModelRankingsSource `json:"source"`
}
