package types

// Persisted announcement snapshot returned by the backend.
type AdminAnnouncementItem struct {
	Content string `json:"content"`
	Date string `json:"date"`
	Id string `json:"id"`
	ShowAsPopup bool `json:"showAsPopup"`
	Status string `json:"status"`
	Target string `json:"target"`
	Title string `json:"title"`
}
