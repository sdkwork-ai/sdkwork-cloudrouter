package types

// Rate limit buckets list result schema exposed by Claw Router.
type RateLimitBucketsListResult struct {
	Code string `json:"code"`
	Data MessagingCollectionResponse `json:"data"`
	Msg string `json:"msg"`
}
