package types

// Artifacts create result schema exposed by Claw Router.
type ArtifactsCreateResult struct {
	Code string `json:"code"`
	Data RuntimeArtifactResponse `json:"data"`
	Msg string `json:"msg"`
}
