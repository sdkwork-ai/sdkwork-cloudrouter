package api

import (
    "encoding/json"
    "fmt"
    "net/url"
    "strings"
    sdktypes "github.com/sdkwork/clawrouter-backend-sdk/types"
    sdkhttp "github.com/sdkwork/clawrouter-backend-sdk/http"
)

type StorageApi struct {
    client *sdkhttp.Client
}

func NewStorageApi(client *sdkhttp.Client) *StorageApi {
    return &StorageApi{client: client}
}

// List storage buckets
func (a *StorageApi) OssBucketsList(cursor *string, limit *string, status *string) (sdktypes.OssBucketsListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "limit", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/storage/buckets"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OssBucketsListResult
        return zero, err
    }
    return decodeResult[sdktypes.OssBucketsListResult](raw)
}

// Create storage bucket
func (a *StorageApi) OssBucketsCreate(body sdktypes.CreateStorageBucketRequest, idempotencyKey string) (sdktypes.OssBucketsCreateResult, error) {
    headers := BuildRequestHeaders(
        map[string]ParameterSpec{"Idempotency-Key": ParameterSpec{Value: idempotencyKey, Style: "simple", Explode: false},},
        map[string]ParameterSpec{},
    )
    raw, err := a.client.Post(BackendApiPath("/storage/buckets"), body, nil, headers, "application/json")
    if err != nil {
        var zero sdktypes.OssBucketsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.OssBucketsCreateResult](raw)
}

// Update storage bucket status
func (a *StorageApi) OssBucketsUpdate(bucketId string, body sdktypes.UpdateStorageBucketRequest) (sdktypes.OssBucketsUpdateResult, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/storage/buckets/%s", SerializePathParameter(bucketId, PathParameterSpec{Name: "bucketId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OssBucketsUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.OssBucketsUpdateResult](raw)
}

// List default storage bucket routes
func (a *StorageApi) OssDefaultBucketsList(logicalScope *string) (sdktypes.OssDefaultBucketsListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "logical_scope", Value: func() interface{} { if logicalScope == nil { return nil }; return *logicalScope }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/storage/default_buckets"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OssDefaultBucketsListResult
        return zero, err
    }
    return decodeResult[sdktypes.OssDefaultBucketsListResult](raw)
}

// Set default storage bucket route
func (a *StorageApi) OssDefaultBucketsUpdate(logicalScope string, body sdktypes.SetStorageDefaultBucketRequest) (sdktypes.OssDefaultBucketsUpdateResult, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/storage/default_buckets/%s", SerializePathParameter(logicalScope, PathParameterSpec{Name: "logicalScope", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OssDefaultBucketsUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.OssDefaultBucketsUpdateResult](raw)
}

// List storage garbage collection jobs
func (a *StorageApi) OssGcJobsList(cursor *string, limit *string, status *string) (sdktypes.OssGcJobsListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "limit", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/storage/gc_jobs"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OssGcJobsListResult
        return zero, err
    }
    return decodeResult[sdktypes.OssGcJobsListResult](raw)
}

// Create storage garbage collection job
func (a *StorageApi) OssGcJobsCreate(body sdktypes.CreateStorageGarbageCollectionJobRequest, idempotencyKey string) (sdktypes.OssGcJobsCreateResult, error) {
    headers := BuildRequestHeaders(
        map[string]ParameterSpec{"Idempotency-Key": ParameterSpec{Value: idempotencyKey, Style: "simple", Explode: false},},
        map[string]ParameterSpec{},
    )
    raw, err := a.client.Post(BackendApiPath("/storage/gc_jobs"), body, nil, headers, "application/json")
    if err != nil {
        var zero sdktypes.OssGcJobsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.OssGcJobsCreateResult](raw)
}

// List storage providers
func (a *StorageApi) OssProvidersList() (sdktypes.OssProvidersListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/storage/providers"), nil, nil)
    if err != nil {
        var zero sdktypes.OssProvidersListResult
        return zero, err
    }
    return decodeResult[sdktypes.OssProvidersListResult](raw)
}

// Create storage provider
func (a *StorageApi) OssProvidersCreate(body sdktypes.CreateStorageProviderRequest, idempotencyKey string) (sdktypes.OssProvidersCreateResult, error) {
    headers := BuildRequestHeaders(
        map[string]ParameterSpec{"Idempotency-Key": ParameterSpec{Value: idempotencyKey, Style: "simple", Explode: false},},
        map[string]ParameterSpec{},
    )
    raw, err := a.client.Post(BackendApiPath("/storage/providers"), body, nil, headers, "application/json")
    if err != nil {
        var zero sdktypes.OssProvidersCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.OssProvidersCreateResult](raw)
}

// Update storage provider status
func (a *StorageApi) OssProvidersUpdate(providerId string, body sdktypes.UpdateStorageProviderRequest) (sdktypes.OssProvidersUpdateResult, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/storage/providers/%s", SerializePathParameter(providerId, PathParameterSpec{Name: "providerId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OssProvidersUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.OssProvidersUpdateResult](raw)
}

// Check storage provider health
func (a *StorageApi) OssProvidersHealthChecksCreate(providerId string) (sdktypes.OssProvidersHealthChecksCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/storage/providers/%s/health_check", SerializePathParameter(providerId, PathParameterSpec{Name: "providerId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.OssProvidersHealthChecksCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.OssProvidersHealthChecksCreateResult](raw)
}

// List storage quota policies
func (a *StorageApi) OssQuotasList() (sdktypes.OssQuotasListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/storage/quotas"), nil, nil)
    if err != nil {
        var zero sdktypes.OssQuotasListResult
        return zero, err
    }
    return decodeResult[sdktypes.OssQuotasListResult](raw)
}

// Create storage quota policy
func (a *StorageApi) OssQuotasCreate(body sdktypes.CreateStorageQuotaPolicyRequest, idempotencyKey string) (sdktypes.OssQuotasCreateResult, error) {
    headers := BuildRequestHeaders(
        map[string]ParameterSpec{"Idempotency-Key": ParameterSpec{Value: idempotencyKey, Style: "simple", Explode: false},},
        map[string]ParameterSpec{},
    )
    raw, err := a.client.Post(BackendApiPath("/storage/quotas"), body, nil, headers, "application/json")
    if err != nil {
        var zero sdktypes.OssQuotasCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.OssQuotasCreateResult](raw)
}

// List storage reconciliation runs
func (a *StorageApi) OssReconciliationRunsList(cursor *string, limit *string, runType *string, status *string) (sdktypes.OssReconciliationRunsListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "limit", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "run_type", Value: func() interface{} { if runType == nil { return nil }; return *runType }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/storage/reconciliation_runs"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OssReconciliationRunsListResult
        return zero, err
    }
    return decodeResult[sdktypes.OssReconciliationRunsListResult](raw)
}

// Create storage reconciliation run
func (a *StorageApi) OssReconciliationRunsCreate(body sdktypes.CreateStorageReconciliationRunRequest, idempotencyKey string) (sdktypes.OssReconciliationRunsCreateResult, error) {
    headers := BuildRequestHeaders(
        map[string]ParameterSpec{"Idempotency-Key": ParameterSpec{Value: idempotencyKey, Style: "simple", Explode: false},},
        map[string]ParameterSpec{},
    )
    raw, err := a.client.Post(BackendApiPath("/storage/reconciliation_runs"), body, nil, headers, "application/json")
    if err != nil {
        var zero sdktypes.OssReconciliationRunsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.OssReconciliationRunsCreateResult](raw)
}

// List storage usage counters
func (a *StorageApi) OssUsageList(cursor *string, limit *string, scopeType *string, scopeId *string) (sdktypes.OssUsageListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "limit", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "scope_type", Value: func() interface{} { if scopeType == nil { return nil }; return *scopeType }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "scope_id", Value: func() interface{} { if scopeId == nil { return nil }; return *scopeId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/storage/usage"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OssUsageListResult
        return zero, err
    }
    return decodeResult[sdktypes.OssUsageListResult](raw)
}

// List storage usage ledger
func (a *StorageApi) OssUsageLedgerList(cursor *string, limit *string, scopeType *string, scopeId *string) (sdktypes.OssUsageLedgerListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "limit", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "scope_type", Value: func() interface{} { if scopeType == nil { return nil }; return *scopeType }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "scope_id", Value: func() interface{} { if scopeId == nil { return nil }; return *scopeId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/storage/usage/ledger"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OssUsageLedgerListResult
        return zero, err
    }
    return decodeResult[sdktypes.OssUsageLedgerListResult](raw)
}

// List storage usage snapshots
func (a *StorageApi) OssUsageSnapshotsList(cursor *string, limit *string, scopeType *string, scopeId *string) (sdktypes.OssUsageSnapshotsListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "limit", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "scope_type", Value: func() interface{} { if scopeType == nil { return nil }; return *scopeType }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "scope_id", Value: func() interface{} { if scopeId == nil { return nil }; return *scopeId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/storage/usage/snapshots"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OssUsageSnapshotsListResult
        return zero, err
    }
    return decodeResult[sdktypes.OssUsageSnapshotsListResult](raw)
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


type ParameterSpec struct {
    Value       interface{}
    Style       string
    Explode     bool
    ContentType string
}

func BuildRequestHeaders(headers map[string]ParameterSpec, cookies map[string]ParameterSpec) map[string]string {
    requestHeaders := map[string]string{}
    for name, parameter := range headers {
        if serialized, ok := SerializeParameterValue(parameter); ok {
            requestHeaders[name] = serialized
        }
    }

    if cookieHeader := BuildCookieHeader(cookies); cookieHeader != "" {
        if existing, ok := requestHeaders["Cookie"]; ok && existing != "" {
            requestHeaders["Cookie"] = existing + "; " + cookieHeader
        } else {
            requestHeaders["Cookie"] = cookieHeader
        }
    }

    if len(requestHeaders) == 0 {
        return nil
    }
    return requestHeaders
}

func BuildCookieHeader(cookies map[string]ParameterSpec) string {
    pairs := make([]string, 0, len(cookies))
    for name, parameter := range cookies {
        if serialized, ok := SerializeParameterValue(parameter); ok {
            pairs = append(pairs, url.QueryEscape(name)+"="+url.QueryEscape(serialized))
        }
    }
    return strings.Join(pairs, "; ")
}

func SerializeParameterValue(parameter ParameterSpec) (string, bool) {
    value := parameter.Value
    if value == nil {
        return "", false
    }
    if parameter.ContentType != "" {
        encoded, _ := json.Marshal(value)
        return string(encoded), true
    }
    switch typed := value.(type) {
    case string:
        return typed, true
    case fmt.Stringer:
        return typed.String(), true
    case []string:
        return strings.Join(typed, ","), true
    case []int:
        values := make([]string, 0, len(typed))
        for _, item := range typed {
            values = append(values, fmt.Sprint(item))
        }
        return strings.Join(values, ","), true
    case map[string]string:
        return SerializeHeaderObject(stringMapToInterface(typed), parameter.Explode), true
    case map[string]int:
        return SerializeHeaderObject(intMapToInterface(typed), parameter.Explode), true
    case map[string]interface{}:
        return SerializeHeaderObject(typed, parameter.Explode), true
    default:
        return fmt.Sprint(value), true
    }
}

func SerializeHeaderObject(values map[string]interface{}, explode bool) string {
    serialized := make([]string, 0, len(values)*2)
    for key, value := range values {
        if value == nil {
            continue
        }
        if explode {
            serialized = append(serialized, key+"="+fmt.Sprint(value))
        } else {
            serialized = append(serialized, key, fmt.Sprint(value))
        }
    }
    return strings.Join(serialized, ",")
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
