package types

// Admin ai resource group item schema exposed by Claw Router.
type AdminAiResourceGroupItem struct {
	Capabilities []string `json:"capabilities"`
	Capability string `json:"capability"`
	Description string `json:"description"`
	Dynamic bool `json:"dynamic"`
	GroupCode string `json:"groupCode"`
	GroupName string `json:"groupName"`
	GroupType string `json:"groupType"`
	Id string `json:"id"`
	ResourceCount string `json:"resourceCount"`
	SelectionMode string `json:"selectionMode"`
	SortOrder string `json:"sortOrder"`
	Status string `json:"status"`
	VendorCodes []string `json:"vendorCodes"`
}
