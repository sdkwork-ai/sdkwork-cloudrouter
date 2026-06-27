package types

// Oss default buckets update result schema exposed by Claw Router.
type OssDefaultBucketsUpdateResult struct {
	Code string `json:"code"`
	Data StorageDefaultBucketMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
