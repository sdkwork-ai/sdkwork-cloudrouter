import Foundation

public class VideosRunwayApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// Runway image to video
    public func createV1ImageToVideo(body: RunwayImageToVideoRequest, xRunwayVersion: String) async throws -> RunwayTaskAccepted? {
        let requestHeaders = buildRequestHeaders(
            [
                "X-Runway-Version": HeaderParameterSpec(value: xRunwayVersion, style: "simple", explode: false, contentType: nil),
            ],
            [:]
        )
        return try await client.post("/runway/v1/image_to_video", body: body, params: nil, headers: requestHeaders, contentType: "application/json", responseType: RunwayTaskAccepted.self)
    }

    /// Runway text to video
    public func createV1TextToVideo(body: RunwayTextToVideoRequest, xRunwayVersion: String) async throws -> RunwayTaskAccepted? {
        let requestHeaders = buildRequestHeaders(
            [
                "X-Runway-Version": HeaderParameterSpec(value: xRunwayVersion, style: "simple", explode: false, contentType: nil),
            ],
            [:]
        )
        return try await client.post("/runway/v1/text_to_video", body: body, params: nil, headers: requestHeaders, contentType: "application/json", responseType: RunwayTaskAccepted.self)
    }



    private struct HeaderParameterSpec {
        let value: Any?
        let style: String
        let explode: Bool
        let contentType: String?
    }

    private func buildRequestHeaders(_ headers: [String: HeaderParameterSpec], _ cookies: [String: HeaderParameterSpec]) -> [String: String]? {
        var requestHeaders: [String: String] = [:]
        for (name, parameter) in headers {
            if let serialized = serializeParameterValue(parameter) {
                requestHeaders[name] = serialized
            }
        }

        if let cookieHeader = buildCookieHeader(cookies), !cookieHeader.isEmpty {
            requestHeaders["Cookie"] = requestHeaders["Cookie"].map { "\($0); \(cookieHeader)" } ?? cookieHeader
        }

        return requestHeaders.isEmpty ? nil : requestHeaders
    }

    private func buildCookieHeader(_ cookies: [String: HeaderParameterSpec]) -> String? {
        let pairs = cookies.compactMap { name, parameter -> String? in
            guard let serialized = serializeParameterValue(parameter) else { return nil }
            return "\(urlEncode(name))=\(urlEncode(serialized))"
        }
        return pairs.isEmpty ? nil : pairs.joined(separator: "; ")
    }

    private func serializeParameterValue(_ parameter: HeaderParameterSpec?) -> String? {
        guard let parameter, let value = parameter.value else { return nil }
        if let contentType = parameter.contentType, !contentType.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            if JSONSerialization.isValidJSONObject(value),
               let data = try? JSONSerialization.data(withJSONObject: value, options: []),
               let json = String(data: data, encoding: .utf8) {
                return json
            }
            return String(describing: value)
        }
        if let array = value as? [Any?] {
            return array.compactMap { $0.map { String(describing: $0) } }.joined(separator: ",")
        }
        if let object = value as? [String: Any] {
            var values: [String] = []
            for (key, item) in object {
                if parameter.explode {
                    values.append("\(key)=\(item)")
                } else {
                    values.append(key)
                    values.append(String(describing: item))
                }
            }
            return values.joined(separator: ",")
        }
        if let date = value as? Date {
            return ISO8601DateFormatter().string(from: date)
        }
        return String(describing: value)
    }

    private func urlEncode(_ value: String) -> String {
        value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? value
    }
}
