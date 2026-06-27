package types

// Storage quota policy mutation response schema exposed by Claw Router.
type StorageQuotaPolicyMutationResponse struct {
	QuotaPolicy StorageQuotaPolicy `json:"quotaPolicy"`
	RequestId string `json:"requestId"`
}
