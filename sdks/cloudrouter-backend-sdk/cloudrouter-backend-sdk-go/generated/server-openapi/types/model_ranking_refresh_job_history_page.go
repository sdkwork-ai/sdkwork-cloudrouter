package types

// Model ranking refresh job history page schema exposed by Cloud Router.
type ModelRankingRefreshJobHistoryPage struct {
	Items []map[string]JsonValue `json:"items"`
	PageInfo PageInfo `json:"pageInfo"`
}
