package types

// Runtime artifact list response schema exposed by Claw Router.
type RuntimeArtifactListResponse struct {
	Items []RuntimeArtifactItem `json:"items"`
}
