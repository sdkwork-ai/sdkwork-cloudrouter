package types

// Cache overview retrieve result schema exposed by Claw Router.
type CacheOverviewRetrieveResult struct {
	Code string `json:"code"`
	Data AdminCacheOverviewResponse `json:"data"`
	Msg string `json:"msg"`
}
