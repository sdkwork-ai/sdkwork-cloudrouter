package types

// Notification item schema exposed by Claw Router.
type NotificationItem struct {
	ActionUrl string `json:"actionUrl"`
	AppId string `json:"appId"`
	Archived bool `json:"archived"`
	Content string `json:"content"`
	Desc string `json:"desc"`
	Id string `json:"id"`
	PopupSeen bool `json:"popupSeen"`
	Read bool `json:"read"`
	ShowAsPopup bool `json:"showAsPopup"`
	Time string `json:"time"`
	Title string `json:"title"`
	Type string `json:"type"`
}
