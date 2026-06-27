package types

// Media access schema exposed by Claw Router.
type MediaAccess struct {
	ExpiresAt string `json:"expiresAt"`
	Visibility string `json:"visibility"`
}
