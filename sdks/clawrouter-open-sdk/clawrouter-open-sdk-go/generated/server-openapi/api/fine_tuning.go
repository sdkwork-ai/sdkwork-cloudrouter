package api

import (
    "encoding/json"
    "fmt"
    "net/url"
    "strings"
    sdktypes "github.com/sdkwork/clawrouter-open-sdk/types"
    sdkhttp "github.com/sdkwork/clawrouter-open-sdk/http"
)

type FineTuningApi struct {
    client *sdkhttp.Client
}

func NewFineTuningApi(client *sdkhttp.Client) *FineTuningApi {
    return &FineTuningApi{client: client}
}

// Run fine-tuning grader
func (a *FineTuningApi) CreateRun(body sdktypes.OpenAiFineTuningGraderRunRequest) (sdktypes.OpenAiFineTuningGraderRunResult, error) {
    raw, err := a.client.Post(AiApiPath("/fine_tuning/alpha/graders/run"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiFineTuningGraderRunResult
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiFineTuningGraderRunResult](raw)
}

// Validate fine-tuning grader
func (a *FineTuningApi) CreateValidate(body sdktypes.OpenAiFineTuningGraderValidateRequest) (sdktypes.OpenAiFineTuningGraderValidationResult, error) {
    raw, err := a.client.Post(AiApiPath("/fine_tuning/alpha/graders/validate"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiFineTuningGraderValidationResult
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiFineTuningGraderValidationResult](raw)
}

// List fine-tuning checkpoint permissions
func (a *FineTuningApi) RetrievePermission(fineTunedModelCheckpoint string, limit *int, order *string, after *string, before *string, projectId *string) (sdktypes.OpenAiFineTuningCheckpointPermissionList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "order", Value: func() interface{} { if order == nil { return nil }; return *order }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "after", Value: func() interface{} { if after == nil { return nil }; return *after }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "before", Value: func() interface{} { if before == nil { return nil }; return *before }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "project_id", Value: func() interface{} { if projectId == nil { return nil }; return *projectId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath(fmt.Sprintf("/fine_tuning/checkpoints/%s/permissions", SerializePathParameter(fineTunedModelCheckpoint, PathParameterSpec{Name: "fine_tuned_model_checkpoint", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiFineTuningCheckpointPermissionList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiFineTuningCheckpointPermissionList](raw)
}

// Create fine-tuning checkpoint permission
func (a *FineTuningApi) CreatePermission(fineTunedModelCheckpoint string, body sdktypes.OpenAiFineTuningCheckpointPermissionCreateRequest) (sdktypes.OpenAiFineTuningCheckpointPermission, error) {
    raw, err := a.client.Post(AiApiPath(fmt.Sprintf("/fine_tuning/checkpoints/%s/permissions", SerializePathParameter(fineTunedModelCheckpoint, PathParameterSpec{Name: "fine_tuned_model_checkpoint", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiFineTuningCheckpointPermission
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiFineTuningCheckpointPermission](raw)
}

// Delete fine-tuning checkpoint permission
func (a *FineTuningApi) DeletePermission(fineTunedModelCheckpoint string, permissionId string) (sdktypes.DeleteResult, error) {
    raw, err := a.client.Delete(AiApiPath(fmt.Sprintf("/fine_tuning/checkpoints/%s/permissions/%s", SerializePathParameter(fineTunedModelCheckpoint, PathParameterSpec{Name: "fine_tuned_model_checkpoint", Style: "simple", Explode: false}), SerializePathParameter(permissionId, PathParameterSpec{Name: "permission_id", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.DeleteResult](raw)
}

// List fine-tuning jobs
func (a *FineTuningApi) ListJob(limit *int, order *string, after *string, before *string) (sdktypes.OpenAiFineTuningJobList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "order", Value: func() interface{} { if order == nil { return nil }; return *order }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "after", Value: func() interface{} { if after == nil { return nil }; return *after }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "before", Value: func() interface{} { if before == nil { return nil }; return *before }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath("/fine_tuning/jobs"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiFineTuningJobList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiFineTuningJobList](raw)
}

// Create fine-tuning job
func (a *FineTuningApi) CreateJob(body sdktypes.OpenAiFineTuningJobCreateRequest) (sdktypes.OpenAiFineTuningJob, error) {
    raw, err := a.client.Post(AiApiPath("/fine_tuning/jobs"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiFineTuningJob
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiFineTuningJob](raw)
}

// Retrieve fine-tuning job
func (a *FineTuningApi) RetrieveJob(fineTuningJobId string) (sdktypes.OpenAiFineTuningJob, error) {
    raw, err := a.client.Get(AiApiPath(fmt.Sprintf("/fine_tuning/jobs/%s", SerializePathParameter(fineTuningJobId, PathParameterSpec{Name: "fine_tuning_job_id", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiFineTuningJob
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiFineTuningJob](raw)
}

// Cancel fine-tuning job
func (a *FineTuningApi) CreateCancel(fineTuningJobId string) (sdktypes.OpenAiFineTuningJob, error) {
    raw, err := a.client.Post(AiApiPath(fmt.Sprintf("/fine_tuning/jobs/%s/cancel", SerializePathParameter(fineTuningJobId, PathParameterSpec{Name: "fine_tuning_job_id", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.OpenAiFineTuningJob
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiFineTuningJob](raw)
}

// List fine-tuning checkpoints
func (a *FineTuningApi) RetrieveCheckpoint(fineTuningJobId string, limit *int, order *string, after *string, before *string) (sdktypes.OpenAiFineTuningJobCheckpointList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "order", Value: func() interface{} { if order == nil { return nil }; return *order }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "after", Value: func() interface{} { if after == nil { return nil }; return *after }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "before", Value: func() interface{} { if before == nil { return nil }; return *before }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath(fmt.Sprintf("/fine_tuning/jobs/%s/checkpoints", SerializePathParameter(fineTuningJobId, PathParameterSpec{Name: "fine_tuning_job_id", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiFineTuningJobCheckpointList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiFineTuningJobCheckpointList](raw)
}

// List fine-tuning events
func (a *FineTuningApi) RetrieveEvent(fineTuningJobId string, limit *int, order *string, after *string, before *string) (sdktypes.OpenAiFineTuningJobEventList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "order", Value: func() interface{} { if order == nil { return nil }; return *order }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "after", Value: func() interface{} { if after == nil { return nil }; return *after }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "before", Value: func() interface{} { if before == nil { return nil }; return *before }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath(fmt.Sprintf("/fine_tuning/jobs/%s/events", SerializePathParameter(fineTuningJobId, PathParameterSpec{Name: "fine_tuning_job_id", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiFineTuningJobEventList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiFineTuningJobEventList](raw)
}

// Pause fine-tuning job
func (a *FineTuningApi) CreatePause(fineTuningJobId string) (sdktypes.OpenAiFineTuningJob, error) {
    raw, err := a.client.Post(AiApiPath(fmt.Sprintf("/fine_tuning/jobs/%s/pause", SerializePathParameter(fineTuningJobId, PathParameterSpec{Name: "fine_tuning_job_id", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.OpenAiFineTuningJob
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiFineTuningJob](raw)
}

// Resume fine-tuning job
func (a *FineTuningApi) CreateResume(fineTuningJobId string) (sdktypes.OpenAiFineTuningJob, error) {
    raw, err := a.client.Post(AiApiPath(fmt.Sprintf("/fine_tuning/jobs/%s/resume", SerializePathParameter(fineTuningJobId, PathParameterSpec{Name: "fine_tuning_job_id", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.OpenAiFineTuningJob
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiFineTuningJob](raw)
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
type QueryParameterSpec struct {
    Name          string
    Value         interface{}
    Style         string
    Explode       bool
    AllowReserved bool
    ContentType   string
}

func BuildQueryString(parameters []QueryParameterSpec) string {
    pairs := make([]string, 0)
    for _, parameter := range parameters {
        AppendSerializedParameter(&pairs, parameter)
    }
    return strings.Join(pairs, "&")
}

func AppendSerializedParameter(pairs *[]string, parameter QueryParameterSpec) {
    if parameter.Value == nil {
        return
    }

    if parameter.ContentType != "" {
        encoded, _ := json.Marshal(parameter.Value)
        *pairs = append(*pairs, url.QueryEscape(parameter.Name)+"="+EncodeQueryValue(string(encoded), parameter.AllowReserved))
        return
    }

    style := parameter.Style
    if style == "" {
        style = "form"
    }

    switch value := parameter.Value.(type) {
    case []string:
        AppendArrayParameter(pairs, parameter.Name, stringSliceToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case []int:
        AppendArrayParameter(pairs, parameter.Name, intSliceToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case []interface{}:
        AppendArrayParameter(pairs, parameter.Name, value, style, parameter.Explode, parameter.AllowReserved)
    case map[string]int:
        AppendObjectParameter(pairs, parameter.Name, intMapToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case map[string]string:
        AppendObjectParameter(pairs, parameter.Name, stringMapToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case map[string]interface{}:
        if style == "deepObject" {
            AppendDeepObjectParameter(pairs, parameter.Name, value, parameter.AllowReserved)
        } else {
            AppendObjectParameter(pairs, parameter.Name, value, style, parameter.Explode, parameter.AllowReserved)
        }
    default:
        *pairs = append(*pairs, url.QueryEscape(parameter.Name)+"="+EncodeQueryValue(fmt.Sprint(value), parameter.AllowReserved))
    }
}

func AppendArrayParameter(pairs *[]string, name string, value []interface{}, style string, explode bool, allowReserved bool) {
    values := make([]string, 0, len(value))
    for _, item := range value {
        if item != nil {
            values = append(values, fmt.Sprint(item))
        }
    }
    if len(values) == 0 {
        return
    }
    if style == "form" && explode {
        for _, item := range values {
            *pairs = append(*pairs, url.QueryEscape(name)+"="+EncodeQueryValue(item, allowReserved))
        }
        return
    }
    *pairs = append(*pairs, url.QueryEscape(name)+"="+EncodeQueryValue(strings.Join(values, ","), allowReserved))
}

func AppendObjectParameter(pairs *[]string, name string, value map[string]interface{}, style string, explode bool, allowReserved bool) {
    entries := make([]string, 0, len(value)*2)
    for key, item := range value {
        if item == nil {
            continue
        }
        if style == "form" && explode {
            *pairs = append(*pairs, url.QueryEscape(key)+"="+EncodeQueryValue(fmt.Sprint(item), allowReserved))
            continue
        }
        entries = append(entries, key, fmt.Sprint(item))
    }
    if len(entries) == 0 {
        return
    }
    if !(style == "form" && explode) {
        *pairs = append(*pairs, url.QueryEscape(name)+"="+EncodeQueryValue(strings.Join(entries, ","), allowReserved))
    }
}

func AppendDeepObjectParameter(pairs *[]string, name string, value map[string]interface{}, allowReserved bool) {
    for key, item := range value {
        if item == nil {
            continue
        }
        *pairs = append(*pairs, url.QueryEscape(fmt.Sprintf("%s[%s]", name, key))+"="+EncodeQueryValue(fmt.Sprint(item), allowReserved))
    }
}

func EncodeQueryValue(value string, allowReserved bool) string {
    encoded := url.QueryEscape(value)
    if !allowReserved {
        return encoded
    }
    replacements := map[string]string{
        "%3A": ":", "%2F": "/", "%3F": "?", "%23": "#",
        "%5B": "[", "%5D": "]", "%40": "@", "%21": "!",
        "%24": "$", "%26": "&", "%27": "'", "%28": "(",
        "%29": ")", "%2A": "*", "%2B": "+", "%2C": ",",
        "%3B": ";", "%3D": "=",
    }
    for escaped, reserved := range replacements {
        encoded = strings.ReplaceAll(encoded, escaped, reserved)
    }
    return encoded
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
