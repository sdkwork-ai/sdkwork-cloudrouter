package types

// Admin cache key list response schema exposed by Claw Router.
type AdminCacheKeyListResponse struct {
	HasMore bool `json:"hasMore"`
	InstanceName string `json:"instanceName"`
	Items []AdminCacheKeyItem `json:"items"`
	Limit string `json:"limit"`
	Namespace string `json:"namespace"`
	NextCursor string `json:"nextCursor"`
	ReturnedItems string `json:"returnedItems"`
	ScanComplete bool `json:"scanComplete"`
	ScannedItems string `json:"scannedItems"`
}
