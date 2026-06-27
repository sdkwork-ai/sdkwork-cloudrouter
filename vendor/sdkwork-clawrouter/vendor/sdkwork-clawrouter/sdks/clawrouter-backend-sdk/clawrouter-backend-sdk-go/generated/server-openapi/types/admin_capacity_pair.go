package types

// Admin capacity pair schema exposed by Claw Router.
type AdminCapacityPair struct {
	Total float64 `json:"total"`
	Used float64 `json:"used"`
}
