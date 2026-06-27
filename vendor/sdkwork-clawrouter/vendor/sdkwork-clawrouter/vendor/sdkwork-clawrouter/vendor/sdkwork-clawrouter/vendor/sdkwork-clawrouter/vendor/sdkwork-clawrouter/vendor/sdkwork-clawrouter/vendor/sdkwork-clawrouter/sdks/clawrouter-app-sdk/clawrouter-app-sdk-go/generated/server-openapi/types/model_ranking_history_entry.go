package types

// Model ranking history entry schema exposed by Claw Router.
type ModelRankingHistoryEntry struct {
	CatalogKey string `json:"catalogKey"`
	Color string `json:"color"`
	Model string `json:"model"`
	Rank string `json:"rank"`
	Volume string `json:"volume"`
}
