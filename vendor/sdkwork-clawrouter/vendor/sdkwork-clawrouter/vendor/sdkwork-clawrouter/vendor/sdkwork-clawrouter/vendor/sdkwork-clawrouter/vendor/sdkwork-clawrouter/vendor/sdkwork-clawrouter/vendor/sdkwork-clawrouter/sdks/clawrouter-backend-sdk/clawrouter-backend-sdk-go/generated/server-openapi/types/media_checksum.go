package types

// Media checksum schema exposed by Claw Router.
type MediaChecksum struct {
	Algorithm string `json:"algorithm"`
	Value string `json:"value"`
}
