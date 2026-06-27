package types

// Ranking vendor option schema exposed by Claw Router.
type RankingVendorOption struct {
	Code string `json:"code"`
	Label string `json:"label"`
	ModelCount string `json:"modelCount"`
}
