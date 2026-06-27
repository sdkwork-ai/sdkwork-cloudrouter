package types

// Cache namespaces keys delete result schema exposed by Claw Router.
type CacheNamespacesKeysDeleteResult struct {
	Code string `json:"code"`
	Data AdminCacheOperationResponse `json:"data"`
	Msg string `json:"msg"`
}
