package types

// Model rankings page schema exposed by Claw Router.
type ModelRankingsPage struct {
	History []map[string]JsonValue `json:"history"`
	Items []map[string]JsonValue `json:"items"`
	PageInfo PageInfo `json:"pageInfo"`
	Source map[string]JsonValue `json:"source"`
}
