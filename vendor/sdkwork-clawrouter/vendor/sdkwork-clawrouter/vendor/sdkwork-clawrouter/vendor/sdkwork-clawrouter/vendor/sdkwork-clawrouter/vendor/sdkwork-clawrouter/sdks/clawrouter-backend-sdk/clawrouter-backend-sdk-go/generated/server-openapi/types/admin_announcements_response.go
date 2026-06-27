package types

// Admin announcements response schema exposed by Claw Router.
type AdminAnnouncementsResponse struct {
	Items []AdminAnnouncementItem `json:"items"`
}
