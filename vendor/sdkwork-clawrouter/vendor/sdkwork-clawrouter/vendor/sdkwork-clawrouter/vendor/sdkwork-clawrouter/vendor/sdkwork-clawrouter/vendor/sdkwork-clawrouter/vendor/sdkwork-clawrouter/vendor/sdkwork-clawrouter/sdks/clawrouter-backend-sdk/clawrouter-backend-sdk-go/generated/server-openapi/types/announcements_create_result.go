package types

// Announcements create result schema exposed by Claw Router.
type AnnouncementsCreateResult struct {
	Code string `json:"code"`
	Data AdminAnnouncementMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
