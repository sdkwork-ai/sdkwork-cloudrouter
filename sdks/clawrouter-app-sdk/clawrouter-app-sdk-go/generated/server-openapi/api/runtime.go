package api

import (
    "fmt"
    "net/url"
    "strings"
    sdktypes "github.com/sdkwork/clawrouter-app-sdk/types"
    sdkhttp "github.com/sdkwork/clawrouter-app-sdk/http"
)

type RuntimeApi struct {
    client *sdkhttp.Client
}

func NewRuntimeApi(client *sdkhttp.Client) *RuntimeApi {
    return &RuntimeApi{client: client}
}

// List
func (a *RuntimeApi) InvocationsList() (sdktypes.InvocationsListResult, error) {
    raw, err := a.client.Get(AppApiPath("/runtime/invocations"), nil, nil)
    if err != nil {
        var zero sdktypes.InvocationsListResult
        return zero, err
    }
    return decodeResult[sdktypes.InvocationsListResult](raw)
}

// Create
func (a *RuntimeApi) InvocationsCreate() (sdktypes.InvocationsCreateResult, error) {
    raw, err := a.client.Post(AppApiPath("/runtime/invocations"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.InvocationsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.InvocationsCreateResult](raw)
}

// Retrieve
func (a *RuntimeApi) InvocationsRetrieve(invocationId string) (sdktypes.InvocationsRetrieveResult, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/runtime/invocations/%s", SerializePathParameter(invocationId, PathParameterSpec{Name: "invocationId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.InvocationsRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.InvocationsRetrieveResult](raw)
}

// List
func (a *RuntimeApi) ArtifactsList(invocationId string) (sdktypes.ArtifactsListResult, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/runtime/invocations/%s/artifacts", SerializePathParameter(invocationId, PathParameterSpec{Name: "invocationId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.ArtifactsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ArtifactsListResult](raw)
}

// Create
func (a *RuntimeApi) ArtifactsCreate(invocationId string) (sdktypes.ArtifactsCreateResult, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/runtime/invocations/%s/artifacts", SerializePathParameter(invocationId, PathParameterSpec{Name: "invocationId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ArtifactsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.ArtifactsCreateResult](raw)
}

// Create
func (a *RuntimeApi) InvocationsSubmit(invocationId string) (sdktypes.InvocationsSubmitResult, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/runtime/invocations/%s/complete", SerializePathParameter(invocationId, PathParameterSpec{Name: "invocationId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.InvocationsSubmitResult
        return zero, err
    }
    return decodeResult[sdktypes.InvocationsSubmitResult](raw)
}

// List
func (a *RuntimeApi) InvocationEventsList(invocationId string) (sdktypes.InvocationEventsListResult, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/runtime/invocations/%s/events", SerializePathParameter(invocationId, PathParameterSpec{Name: "invocationId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.InvocationEventsListResult
        return zero, err
    }
    return decodeResult[sdktypes.InvocationEventsListResult](raw)
}

// Create
func (a *RuntimeApi) InvocationEventsCreate(invocationId string) (sdktypes.InvocationEventsCreateResult, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/runtime/invocations/%s/events", SerializePathParameter(invocationId, PathParameterSpec{Name: "invocationId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.InvocationEventsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.InvocationEventsCreateResult](raw)
}

// List
func (a *RuntimeApi) InvocationEventStreamsList(invocationId string) (sdktypes.InvocationEventStreamsListResult, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/runtime/invocations/%s/events/stream", SerializePathParameter(invocationId, PathParameterSpec{Name: "invocationId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.InvocationEventStreamsListResult
        return zero, err
    }
    return decodeResult[sdktypes.InvocationEventStreamsListResult](raw)
}

type PathParameterSpec struct {
    Name    string
    Style   string
    Explode bool
}

func SerializePathParameter(value interface{}, spec PathParameterSpec) string {
    if value == nil {
        return ""
    }
    style := spec.Style
    if style == "" {
        style = "simple"
    }

    switch typed := value.(type) {
    case []string:
        return SerializePathArray(spec.Name, stringSliceToInterface(typed), style, spec.Explode)
    case []int:
        return SerializePathArray(spec.Name, intSliceToInterface(typed), style, spec.Explode)
    case []interface{}:
        return SerializePathArray(spec.Name, typed, style, spec.Explode)
    case map[string]string:
        return SerializePathObject(spec.Name, stringMapToInterface(typed), style, spec.Explode)
    case map[string]int:
        return SerializePathObject(spec.Name, intMapToInterface(typed), style, spec.Explode)
    case map[string]interface{}:
        return SerializePathObject(spec.Name, typed, style, spec.Explode)
    default:
        return PathPrefix(spec.Name, style) + url.PathEscape(fmt.Sprint(value))
    }
}

func SerializePathArray(name string, values []interface{}, style string, explode bool) string {
    serialized := make([]string, 0, len(values))
    for _, item := range values {
        if item != nil {
            serialized = append(serialized, url.PathEscape(fmt.Sprint(item)))
        }
    }
    if len(serialized) == 0 {
        return PathPrefix(name, style)
    }
    if style == "matrix" {
        if explode {
            parts := make([]string, 0, len(serialized))
            for _, item := range serialized {
                parts = append(parts, ";"+name+"="+item)
            }
            return strings.Join(parts, "")
        }
        return ";" + name + "=" + strings.Join(serialized, ",")
    }
    separator := ","
    if explode {
        separator = "."
    }
    return PathPrefix(name, style) + strings.Join(serialized, separator)
}

func SerializePathObject(name string, values map[string]interface{}, style string, explode bool) string {
    entries := make([]string, 0, len(values)*2)
    exploded := make([]string, 0, len(values))
    for key, value := range values {
        if value == nil {
            continue
        }
        escapedKey := url.PathEscape(key)
        escapedValue := url.PathEscape(fmt.Sprint(value))
        if explode {
            if style == "matrix" {
                exploded = append(exploded, ";"+escapedKey+"="+escapedValue)
            } else {
                exploded = append(exploded, escapedKey+"="+escapedValue)
            }
        } else {
            entries = append(entries, escapedKey, escapedValue)
        }
    }
    if style == "matrix" {
        if explode {
            return strings.Join(exploded, "")
        }
        return ";" + name + "=" + strings.Join(entries, ",")
    }
    if explode {
        separator := ","
        if style == "label" {
            separator = "."
        }
        return PathPrefix(name, style) + strings.Join(exploded, separator)
    }
    return PathPrefix(name, style) + strings.Join(entries, ",")
}

func PathPrefix(name string, style string) string {
    if style == "label" {
        return "."
    }
    if style == "matrix" {
        return ";" + name
    }
    return ""
}


func stringSliceToInterface(values []string) []interface{} {
    result := make([]interface{}, 0, len(values))
    for _, value := range values {
        result = append(result, value)
    }
    return result
}

func intSliceToInterface(values []int) []interface{} {
    result := make([]interface{}, 0, len(values))
    for _, value := range values {
        result = append(result, value)
    }
    return result
}

func stringMapToInterface(values map[string]string) map[string]interface{} {
    result := make(map[string]interface{}, len(values))
    for key, value := range values {
        result[key] = value
    }
    return result
}

func intMapToInterface(values map[string]int) map[string]interface{} {
    result := make(map[string]interface{}, len(values))
    for key, value := range values {
        result[key] = value
    }
    return result
}
