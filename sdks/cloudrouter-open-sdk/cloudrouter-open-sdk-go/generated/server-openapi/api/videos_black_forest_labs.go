package api

import (
    sdktypes "github.com/sdkwork/cloudrouter-open-sdk/types"
    sdkhttp "github.com/sdkwork/cloudrouter-open-sdk/http"
)

type VideosBlackForestLabsApi struct {
    client *sdkhttp.Client
}

func NewVideosBlackForestLabsApi(client *sdkhttp.Client) *VideosBlackForestLabsApi {
    return &VideosBlackForestLabsApi{client: client}
}

// Black Forest Labs FLUX 3 video generation
func (a *VideosBlackForestLabsApi) CreateFlux3Video(body sdktypes.BlackForestLabsVideoGenerationRequest) (sdktypes.BlackForestLabsVideoGenerationTask, error) {
    raw, err := a.client.Post("/black_forest_labs/v1/flux-3-video", body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.BlackForestLabsVideoGenerationTask
        return zero, err
    }
    return decodeResult[sdktypes.BlackForestLabsVideoGenerationTask](raw)
}
