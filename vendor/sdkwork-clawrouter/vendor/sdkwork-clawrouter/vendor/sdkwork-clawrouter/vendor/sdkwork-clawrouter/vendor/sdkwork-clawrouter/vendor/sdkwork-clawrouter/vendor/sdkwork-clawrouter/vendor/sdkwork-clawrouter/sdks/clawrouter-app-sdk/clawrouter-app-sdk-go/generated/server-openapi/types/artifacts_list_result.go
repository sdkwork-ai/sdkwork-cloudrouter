package types

// Artifacts list result schema exposed by Claw Router.
type ArtifactsListResult struct {
	Code string `json:"code"`
	Data RuntimeArtifactListResponse `json:"data"`
	Msg string `json:"msg"`
}
