package types

// Model ranking history point schema exposed by Claw Router.
type ModelRankingHistoryPoint struct {
	Date string `json:"date"`
	Entries []ModelRankingHistoryEntry `json:"entries"`
	Index string `json:"index"`
}
