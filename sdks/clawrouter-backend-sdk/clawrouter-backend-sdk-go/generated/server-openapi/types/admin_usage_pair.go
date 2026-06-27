package types

// Admin usage pair schema exposed by Claw Router.
type AdminUsagePair struct {
	Today float64 `json:"today"`
	Total float64 `json:"total"`
}
