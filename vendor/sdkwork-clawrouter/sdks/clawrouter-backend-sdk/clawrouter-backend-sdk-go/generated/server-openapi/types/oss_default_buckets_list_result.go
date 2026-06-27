package types

// Oss default buckets list result schema exposed by Claw Router.
type OssDefaultBucketsListResult struct {
	Code string `json:"code"`
	Data StorageDefaultBucketListResponse `json:"data"`
	Msg string `json:"msg"`
}
