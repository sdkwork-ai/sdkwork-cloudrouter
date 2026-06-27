package types

// Oss buckets update result schema exposed by Claw Router.
type OssBucketsUpdateResult struct {
	Code string `json:"code"`
	Data StorageBucketMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
