package types

// Admin ai resource member item schema exposed by Claw Router.
type AdminAiResourceMemberItem struct {
	MemberResourceCode string `json:"memberResourceCode"`
	MemberRole string `json:"memberRole"`
	ParentResourceCode string `json:"parentResourceCode"`
	Required bool `json:"required"`
	SortOrder string `json:"sortOrder"`
}
