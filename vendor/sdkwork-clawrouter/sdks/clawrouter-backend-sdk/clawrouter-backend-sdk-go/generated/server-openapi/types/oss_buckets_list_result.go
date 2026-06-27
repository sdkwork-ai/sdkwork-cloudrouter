package types

// Oss buckets list result schema exposed by Claw Router.
type OssBucketsListResult struct {
	Code string `json:"code"`
	Data StorageBucketListResponse `json:"data"`
	Msg string `json:"msg"`
}
