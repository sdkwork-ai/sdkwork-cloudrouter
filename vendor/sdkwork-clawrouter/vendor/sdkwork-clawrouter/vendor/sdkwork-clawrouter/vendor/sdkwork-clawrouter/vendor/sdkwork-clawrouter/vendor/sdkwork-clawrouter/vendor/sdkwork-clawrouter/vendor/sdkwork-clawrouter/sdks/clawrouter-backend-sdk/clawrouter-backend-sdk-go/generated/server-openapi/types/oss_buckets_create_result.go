package types

// Oss buckets create result schema exposed by Claw Router.
type OssBucketsCreateResult struct {
	Code string `json:"code"`
	Data StorageBucketMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
