import Foundation

public class FineTuningApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// Run fine-tuning grader
    public func createRun(body: OpenAiFineTuningGraderRunRequest) async throws -> OpenAiFineTuningGraderRunResult? {
        return try await client.post(ApiPaths.aiPath("/fine_tuning/alpha/graders/run"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiFineTuningGraderRunResult.self)
    }

    /// Validate fine-tuning grader
    public func createValidate(body: OpenAiFineTuningGraderValidateRequest) async throws -> OpenAiFineTuningGraderValidationResult? {
        return try await client.post(ApiPaths.aiPath("/fine_tuning/alpha/graders/validate"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiFineTuningGraderValidationResult.self)
    }

    /// List fine-tuning checkpoint permissions
    public func retrievePermission(fineTunedModelCheckpoint: String, limit: Int? = nil, order: String? = nil, after: String? = nil, before: String? = nil, projectId: String? = nil) async throws -> OpenAiFineTuningCheckpointPermissionList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "limit", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "order", value: order, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "after", value: after, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "before", value: before, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "project_id", value: projectId, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/fine_tuning/checkpoints/\(serializePathParameter(fineTunedModelCheckpoint, PathParameterSpec(name: "fine_tuned_model_checkpoint", style: "simple", explode: false)))/permissions"), query), responseType: OpenAiFineTuningCheckpointPermissionList.self)
    }

    /// Create fine-tuning checkpoint permission
    public func createPermission(fineTunedModelCheckpoint: String, body: OpenAiFineTuningCheckpointPermissionCreateRequest) async throws -> OpenAiFineTuningCheckpointPermission? {
        return try await client.post(ApiPaths.aiPath("/fine_tuning/checkpoints/\(serializePathParameter(fineTunedModelCheckpoint, PathParameterSpec(name: "fine_tuned_model_checkpoint", style: "simple", explode: false)))/permissions"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiFineTuningCheckpointPermission.self)
    }

    /// Delete fine-tuning checkpoint permission
    public func deletePermission(fineTunedModelCheckpoint: String, permissionId: String) async throws -> DeleteResult? {
        return try await client.delete(ApiPaths.aiPath("/fine_tuning/checkpoints/\(serializePathParameter(fineTunedModelCheckpoint, PathParameterSpec(name: "fine_tuned_model_checkpoint", style: "simple", explode: false)))/permissions/\(serializePathParameter(permissionId, PathParameterSpec(name: "permission_id", style: "simple", explode: false)))"), responseType: DeleteResult.self)
    }

    /// List fine-tuning jobs
    public func listJob(limit: Int? = nil, order: String? = nil, after: String? = nil, before: String? = nil) async throws -> OpenAiFineTuningJobList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "limit", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "order", value: order, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "after", value: after, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "before", value: before, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/fine_tuning/jobs"), query), responseType: OpenAiFineTuningJobList.self)
    }

    /// Create fine-tuning job
    public func createJob(body: OpenAiFineTuningJobCreateRequest) async throws -> OpenAiFineTuningJob? {
        return try await client.post(ApiPaths.aiPath("/fine_tuning/jobs"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiFineTuningJob.self)
    }

    /// Retrieve fine-tuning job
    public func retrieveJob(fineTuningJobId: String) async throws -> OpenAiFineTuningJob? {
        return try await client.get(ApiPaths.aiPath("/fine_tuning/jobs/\(serializePathParameter(fineTuningJobId, PathParameterSpec(name: "fine_tuning_job_id", style: "simple", explode: false)))"), responseType: OpenAiFineTuningJob.self)
    }

    /// Cancel fine-tuning job
    public func createCancel(fineTuningJobId: String) async throws -> OpenAiFineTuningJob? {
        return try await client.post(ApiPaths.aiPath("/fine_tuning/jobs/\(serializePathParameter(fineTuningJobId, PathParameterSpec(name: "fine_tuning_job_id", style: "simple", explode: false)))/cancel"), body: nil, responseType: OpenAiFineTuningJob.self)
    }

    /// List fine-tuning checkpoints
    public func retrieveCheckpoint(fineTuningJobId: String, limit: Int? = nil, order: String? = nil, after: String? = nil, before: String? = nil) async throws -> OpenAiFineTuningJobCheckpointList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "limit", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "order", value: order, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "after", value: after, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "before", value: before, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/fine_tuning/jobs/\(serializePathParameter(fineTuningJobId, PathParameterSpec(name: "fine_tuning_job_id", style: "simple", explode: false)))/checkpoints"), query), responseType: OpenAiFineTuningJobCheckpointList.self)
    }

    /// List fine-tuning events
    public func retrieveEvent(fineTuningJobId: String, limit: Int? = nil, order: String? = nil, after: String? = nil, before: String? = nil) async throws -> OpenAiFineTuningJobEventList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "limit", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "order", value: order, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "after", value: after, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "before", value: before, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/fine_tuning/jobs/\(serializePathParameter(fineTuningJobId, PathParameterSpec(name: "fine_tuning_job_id", style: "simple", explode: false)))/events"), query), responseType: OpenAiFineTuningJobEventList.self)
    }

    /// Pause fine-tuning job
    public func createPause(fineTuningJobId: String) async throws -> OpenAiFineTuningJob? {
        return try await client.post(ApiPaths.aiPath("/fine_tuning/jobs/\(serializePathParameter(fineTuningJobId, PathParameterSpec(name: "fine_tuning_job_id", style: "simple", explode: false)))/pause"), body: nil, responseType: OpenAiFineTuningJob.self)
    }

    /// Resume fine-tuning job
    public func createResume(fineTuningJobId: String) async throws -> OpenAiFineTuningJob? {
        return try await client.post(ApiPaths.aiPath("/fine_tuning/jobs/\(serializePathParameter(fineTuningJobId, PathParameterSpec(name: "fine_tuning_job_id", style: "simple", explode: false)))/resume"), body: nil, responseType: OpenAiFineTuningJob.self)
    }

    private struct PathParameterSpec {
        let name: String
        let style: String
        let explode: Bool
    }

    private func serializePathParameter(_ value: Any?, _ spec: PathParameterSpec) -> String {
        guard let value else { return "" }
        let style = spec.style.isEmpty ? "simple" : spec.style
        if let array = value as? [Any] {
            return serializePathArray(spec.name, array, style, spec.explode)
        }
        if let object = value as? [String: Any] {
            return serializePathObject(spec.name, object, style, spec.explode)
        }
        return pathPrimitivePrefix(spec.name, style) + pathEncode(String(describing: value))
    }

    private func serializePathArray(_ name: String, _ values: [Any], _ style: String, _ explode: Bool) -> String {
        let serialized = values.map { pathEncode(String(describing: $0)) }
        if serialized.isEmpty { return pathPrefix(name, style) }
        if style == "matrix" {
            if explode {
                return serialized.map { ";\(name)=\($0)" }.joined()
            }
            return ";\(name)=" + serialized.joined(separator: ",")
        }
        let separator = explode ? "." : ","
        return pathPrefix(name, style) + serialized.joined(separator: separator)
    }

    private func serializePathObject(_ name: String, _ values: [String: Any], _ style: String, _ explode: Bool) -> String {
        var entries: [String] = []
        var exploded: [String] = []
        for (key, value) in values {
            let escapedKey = pathEncode(key)
            let escapedValue = pathEncode(String(describing: value))
            if explode {
                if style == "matrix" {
                    exploded.append(";\(escapedKey)=\(escapedValue)")
                } else {
                    exploded.append("\(escapedKey)=\(escapedValue)")
                }
            } else {
                entries.append(escapedKey)
                entries.append(escapedValue)
            }
        }
        if style == "matrix" {
            if explode {
                return exploded.joined()
            }
            return ";\(name)=" + entries.joined(separator: ",")
        }
        if explode {
            let separator = style == "label" ? "." : ","
            return pathPrefix(name, style) + exploded.joined(separator: separator)
        }
        return pathPrefix(name, style) + entries.joined(separator: ",")
    }

    private func pathPrefix(_ name: String, _ style: String) -> String {
        if style == "label" { return "." }
        if style == "matrix" { return ";\(name)" }
        return ""
    }

    private func pathPrimitivePrefix(_ name: String, _ style: String) -> String {
        style == "matrix" ? ";\(name)=" : pathPrefix(name, style)
    }

    private func pathEncode(_ value: String) -> String {
        value.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? value
    }

    private struct QueryParameterSpec {
        let name: String
        let value: Any?
        let style: String
        let explode: Bool
        let allowReserved: Bool
        let contentType: String?
    }

    private func buildQueryString(_ parameters: [QueryParameterSpec]) -> String {
        var pairs: [String] = []
        for parameter in parameters {
            appendSerializedParameter(&pairs, parameter)
        }
        return pairs.joined(separator: "&")
    }

    private func appendSerializedParameter(_ pairs: inout [String], _ parameter: QueryParameterSpec) {
        guard let value = parameter.value else { return }
        if let contentType = parameter.contentType, !contentType.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            let data = (try? JSONSerialization.data(withJSONObject: value, options: [])) ?? Data(String(describing: value).utf8)
            let json = String(data: data, encoding: .utf8) ?? String(describing: value)
            pairs.append("\(urlEncode(parameter.name))=\(encodeQueryValue(json, allowReserved: parameter.allowReserved))")
            return
        }

        let style = parameter.style.isEmpty ? "form" : parameter.style
        if style == "deepObject", let object = value as? [String: Any] {
            appendDeepObjectParameter(&pairs, name: parameter.name, values: object, allowReserved: parameter.allowReserved)
        } else if let array = value as? [Any] {
            appendArrayParameter(&pairs, name: parameter.name, values: array, style: style, explode: parameter.explode, allowReserved: parameter.allowReserved)
        } else if let object = value as? [String: Any] {
            appendObjectParameter(&pairs, name: parameter.name, values: object, style: style, explode: parameter.explode, allowReserved: parameter.allowReserved)
        } else {
            pairs.append("\(urlEncode(parameter.name))=\(encodeQueryValue(String(describing: value), allowReserved: parameter.allowReserved))")
        }
    }

    private func appendArrayParameter(
        _ pairs: inout [String],
        name: String,
        values: [Any],
        style: String,
        explode: Bool,
        allowReserved: Bool
    ) {
        let serialized = values.map { String(describing: $0) }
        guard !serialized.isEmpty else { return }
        if style == "form" && explode {
            for item in serialized {
                pairs.append("\(urlEncode(name))=\(encodeQueryValue(item, allowReserved: allowReserved))")
            }
            return
        }
        pairs.append("\(urlEncode(name))=\(encodeQueryValue(serialized.joined(separator: ","), allowReserved: allowReserved))")
    }

    private func appendObjectParameter(
        _ pairs: inout [String],
        name: String,
        values: [String: Any],
        style: String,
        explode: Bool,
        allowReserved: Bool
    ) {
        var serialized: [String] = []
        for (key, value) in values {
            if style == "form" && explode {
                pairs.append("\(urlEncode(key))=\(encodeQueryValue(String(describing: value), allowReserved: allowReserved))")
            } else {
                serialized.append(key)
                serialized.append(String(describing: value))
            }
        }
        if !serialized.isEmpty {
            pairs.append("\(urlEncode(name))=\(encodeQueryValue(serialized.joined(separator: ","), allowReserved: allowReserved))")
        }
    }

    private func appendDeepObjectParameter(_ pairs: inout [String], name: String, values: [String: Any], allowReserved: Bool) {
        for (key, value) in values {
            pairs.append("\(urlEncode("\(name)[\(key)]"))=\(encodeQueryValue(String(describing: value), allowReserved: allowReserved))")
        }
    }

    private func encodeQueryValue(_ value: String, allowReserved: Bool) -> String {
        var encoded = urlEncode(value)
        if !allowReserved { return encoded }
        [
            "%3A": ":", "%2F": "/", "%3F": "?", "%23": "#",
            "%5B": "[", "%5D": "]", "%40": "@", "%21": "!",
            "%24": "$", "%26": "&", "%27": "'", "%28": "(",
            "%29": ")", "%2A": "*", "%2B": "+", "%2C": ",",
            "%3B": ";", "%3D": "=",
        ].forEach { encoded = encoded.replacingOccurrences(of: $0.key, with: $0.value) }
        return encoded
    }

    private func urlEncode(_ value: String) -> String {
        value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? value
    }

}
