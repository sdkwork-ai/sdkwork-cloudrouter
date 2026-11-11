package api

import (
    sdktypes "github.com/sdkwork/cloudrouter-open-sdk/types"
    sdkhttp "github.com/sdkwork/cloudrouter-open-sdk/http"
)

type AudioStabilityAiApi struct {
    client *sdkhttp.Client
}

func NewAudioStabilityAiApi(client *sdkhttp.Client) *AudioStabilityAiApi {
    return &AudioStabilityAiApi{client: client}
}

// Stability AI text-to-audio (music and sound effects)
func (a *AudioStabilityAiApi) CreateTextToAudio(body sdktypes.StabilityAudioRequest) ([]byte, error) {
    return a.client.RequestBytes("POST", "/stability_ai/v2beta/audio/stable-audio-2/text-to-audio", body, nil, nil, "multipart/form-data", false, false)
}
