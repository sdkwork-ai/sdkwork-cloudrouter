package types

// Ranking vendor options response schema exposed by Claw Router.
type RankingVendorOptionsResponse struct {
	Items []RankingVendorOption `json:"items"`
}
