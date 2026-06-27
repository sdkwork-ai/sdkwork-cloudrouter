package types

// Media ai provenance schema exposed by Claw Router.
type MediaAiProvenance struct {
	GenerationTaskId string `json:"generationTaskId"`
	Model string `json:"model"`
	ModerationStatus string `json:"moderationStatus"`
	PromptId string `json:"promptId"`
	Provenance string `json:"provenance"`
	Provider string `json:"provider"`
	SafetyLabels []string `json:"safetyLabels"`
	Seed string `json:"seed"`
	SourceMediaIds []string `json:"sourceMediaIds"`
}
