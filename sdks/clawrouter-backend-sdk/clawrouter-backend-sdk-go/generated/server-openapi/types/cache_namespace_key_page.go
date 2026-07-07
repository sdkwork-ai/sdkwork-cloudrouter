package types

// Cache namespace key page schema exposed by Claw Router.
type CacheNamespaceKeyPage struct {
	InstanceName string `json:"instanceName"`
	Items []map[string]interface{} `json:"items"`
	Namespace string `json:"namespace"`
	PageInfo PageInfo `json:"pageInfo"`
	ReturnedItems string `json:"returnedItems"`
	ScanComplete bool `json:"scanComplete"`
	ScannedItems string `json:"scannedItems"`
}
