package types

// Admin announcement update request schema exposed by Claw Router.
type AdminAnnouncementUpdateRequest struct {
	Content string `json:"content"`
	ShowAsPopup bool `json:"showAsPopup"`
	Status string `json:"status"`
	Target string `json:"target"`
	Title string `json:"title"`
}
