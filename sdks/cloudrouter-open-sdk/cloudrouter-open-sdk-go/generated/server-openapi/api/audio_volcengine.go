package api

import (
    sdktypes "github.com/sdkwork/cloudrouter-open-sdk/types"
    sdkhttp "github.com/sdkwork/cloudrouter-open-sdk/http"
)

type AudioVolcengineApi struct {
    client *sdkhttp.Client
}

func NewAudioVolcengineApi(client *sdkhttp.Client) *AudioVolcengineApi {
    return &AudioVolcengineApi{client: client}
}

// Volcengine create speech
func (a *AudioVolcengineApi) CreateApiV3AudioSpeech(body sdktypes.OpenAiSpeechCreateRequest) ([]byte, error) {
    return a.client.RequestBytes("POST", "/volcengine/api/v3/audio/speech", body, nil, nil, "application/json", false, false)
}
