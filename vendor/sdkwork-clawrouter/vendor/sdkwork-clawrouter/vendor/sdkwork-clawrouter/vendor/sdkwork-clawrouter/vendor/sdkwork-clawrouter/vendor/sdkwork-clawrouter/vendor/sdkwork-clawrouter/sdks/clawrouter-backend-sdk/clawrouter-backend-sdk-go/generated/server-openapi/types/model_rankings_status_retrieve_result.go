package types

// Model rankings status retrieve result schema exposed by Claw Router.
type ModelRankingsStatusRetrieveResult struct {
	Code string `json:"code"`
	Data ModelRankingRefreshStatus `json:"data"`
	Msg string `json:"msg"`
}
