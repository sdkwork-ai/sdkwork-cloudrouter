package types

// Admin ai resource member input schema exposed by Claw Router.
type AdminAiResourceMemberInput struct {
	MemberResourceCode string `json:"memberResourceCode"`
	MemberRole string `json:"memberRole"`
	Required bool `json:"required"`
	SortOrder string `json:"sortOrder"`
}
