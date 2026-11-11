package types

// ElevenLabs pronunciation dictionary version locator.
type ElevenLabsPronunciationDictionaryLocator struct {
	PronunciationDictionaryId string `json:"pronunciation_dictionary_id"`
	VersionId string `json:"version_id"`
}
