package types

// Admin ai resource group create request schema exposed by Claw Router.
type AdminAiResourceGroupCreateRequest struct {
	Description string `json:"description"`
	GroupCode string `json:"groupCode"`
	GroupName string `json:"groupName"`
	GroupType string `json:"groupType"`
	Members []AdminAiResourceGroupMemberInput `json:"members"`
	SelectionMode string `json:"selectionMode"`
	SortOrder string `json:"sortOrder"`
	Status string `json:"status"`
}
