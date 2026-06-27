package types

// Model vendors list result schema exposed by Claw Router.
type ModelVendorsListResult struct {
	Code string `json:"code"`
	Data RankingVendorOptionsResponse `json:"data"`
	Msg string `json:"msg"`
}
