import Foundation

public struct AnthropicContentBlock: Codable {
    public let id: String?
    public let input: [String: String]?
    public let name: String?
    public let text: String?
    public let type: String?


    public init(id: String? = nil, input: [String: String]? = nil, name: String? = nil, text: String? = nil, type: String? = nil) {
        self.id = id
        self.input = input
        self.name = name
        self.text = text
        self.type = type
    }
}

public struct AnthropicContentBlockParam: Codable {
    public let content: String?
    public let id: String?
    public let input: [String: String]?
    public let name: String?
    public let source: AnthropicContentSource?
    public let text: String?
    public let toolUseId: String?
    public let type: String?


    public init(content: String? = nil, id: String? = nil, input: [String: String]? = nil, name: String? = nil, source: AnthropicContentSource? = nil, text: String? = nil, toolUseId: String? = nil, type: String? = nil) {
        self.content = content
        self.id = id
        self.input = input
        self.name = name
        self.source = source
        self.text = text
        self.toolUseId = toolUseId
        self.type = type
    }
}

public struct AnthropicContentSource: Codable {
    public let data: String?
    public let fileId: String?
    public let mediaType: String?
    public let type: String?
    public let url: String?


    public init(data: String? = nil, fileId: String? = nil, mediaType: String? = nil, type: String? = nil, url: String? = nil) {
        self.data = data
        self.fileId = fileId
        self.mediaType = mediaType
        self.type = type
        self.url = url
    }
}

public struct AnthropicCountMessageTokensRequest: Codable {
    public let maxTokens: Int?
    public let messages: [AnthropicMessageParam]?
    public let metadata: [String: String]?
    public let model: String?
    public let stopSequences: [String]?
    public let stream: Bool?
    public let system: String?
    public let temperature: Double?
    public let thinking: AnthropicThinkingConfig?
    public let toolChoice: AnthropicToolChoice?
    public let tools: [AnthropicTool]?
    public let topK: Int?
    public let topP: Double?


    public init(maxTokens: Int? = nil, messages: [AnthropicMessageParam]? = nil, metadata: [String: String]? = nil, model: String? = nil, stopSequences: [String]? = nil, stream: Bool? = nil, system: String? = nil, temperature: Double? = nil, thinking: AnthropicThinkingConfig? = nil, toolChoice: AnthropicToolChoice? = nil, tools: [AnthropicTool]? = nil, topK: Int? = nil, topP: Double? = nil) {
        self.maxTokens = maxTokens
        self.messages = messages
        self.metadata = metadata
        self.model = model
        self.stopSequences = stopSequences
        self.stream = stream
        self.system = system
        self.temperature = temperature
        self.thinking = thinking
        self.toolChoice = toolChoice
        self.tools = tools
        self.topK = topK
        self.topP = topP
    }
}

public struct AnthropicCountMessageTokensResponse: Codable {
    public let inputTokens: Int?


    public init(inputTokens: Int? = nil) {
        self.inputTokens = inputTokens
    }
}

public struct AnthropicDeleteResponse: Codable {
    public let deleted: Bool?
    public let id: String?
    public let type: String?


    public init(deleted: Bool? = nil, id: String? = nil, type: String? = nil) {
        self.deleted = deleted
        self.id = id
        self.type = type
    }
}

public struct AnthropicFile: Codable {
    public let createdAt: String?
    public let downloadable: Bool?
    public let filename: String?
    public let id: String?
    public let mimeType: String?
    public let sizeBytes: Int?
    public let type: String?


    public init(createdAt: String? = nil, downloadable: Bool? = nil, filename: String? = nil, id: String? = nil, mimeType: String? = nil, sizeBytes: Int? = nil, type: String? = nil) {
        self.createdAt = createdAt
        self.downloadable = downloadable
        self.filename = filename
        self.id = id
        self.mimeType = mimeType
        self.sizeBytes = sizeBytes
        self.type = type
    }
}

public struct AnthropicFileListResponse: Codable {
    public let data: [AnthropicFile]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?


    public init(data: [AnthropicFile]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
    }
}

public struct AnthropicFileUploadMultipartRequest: Codable {
    public let file: String?


    public init(file: String? = nil) {
        self.file = file
    }
}

public struct AnthropicMessage: Codable {
    public let content: [AnthropicContentBlock]?
    public let id: String?
    public let model: String?
    public let role: String?
    public let stopReason: String?
    public let stopSequence: String?
    public let type: String?
    public let usage: AnthropicUsage?


    public init(content: [AnthropicContentBlock]? = nil, id: String? = nil, model: String? = nil, role: String? = nil, stopReason: String? = nil, stopSequence: String? = nil, type: String? = nil, usage: AnthropicUsage? = nil) {
        self.content = content
        self.id = id
        self.model = model
        self.role = role
        self.stopReason = stopReason
        self.stopSequence = stopSequence
        self.type = type
        self.usage = usage
    }
}

public struct AnthropicMessageBatch: Codable {
    public let cancelInitiatedAt: String?
    public let createdAt: String?
    public let endedAt: String?
    public let expiresAt: String?
    public let id: String?
    public let processingStatus: String?
    public let requestCounts: AnthropicMessageBatchRequestCounts?
    public let resultsUrl: String?
    public let type: String?


    public init(cancelInitiatedAt: String? = nil, createdAt: String? = nil, endedAt: String? = nil, expiresAt: String? = nil, id: String? = nil, processingStatus: String? = nil, requestCounts: AnthropicMessageBatchRequestCounts? = nil, resultsUrl: String? = nil, type: String? = nil) {
        self.cancelInitiatedAt = cancelInitiatedAt
        self.createdAt = createdAt
        self.endedAt = endedAt
        self.expiresAt = expiresAt
        self.id = id
        self.processingStatus = processingStatus
        self.requestCounts = requestCounts
        self.resultsUrl = resultsUrl
        self.type = type
    }
}

public struct AnthropicMessageBatchCreateRequest: Codable {
    public let requests: [AnthropicMessageBatchRequest]?


    public init(requests: [AnthropicMessageBatchRequest]? = nil) {
        self.requests = requests
    }
}

public struct AnthropicMessageBatchListResponse: Codable {
    public let data: [AnthropicMessageBatch]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?


    public init(data: [AnthropicMessageBatch]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
    }
}

public struct AnthropicMessageBatchRequest: Codable {
    public let customId: String?
    public let params: AnthropicMessageCreateRequest?


    public init(customId: String? = nil, params: AnthropicMessageCreateRequest? = nil) {
        self.customId = customId
        self.params = params
    }
}

public struct AnthropicMessageBatchRequestCounts: Codable {
    public let canceled: Int?
    public let errored: Int?
    public let expired: Int?
    public let processing: Int?
    public let succeeded: Int?


    public init(canceled: Int? = nil, errored: Int? = nil, expired: Int? = nil, processing: Int? = nil, succeeded: Int? = nil) {
        self.canceled = canceled
        self.errored = errored
        self.expired = expired
        self.processing = processing
        self.succeeded = succeeded
    }
}

public struct AnthropicMessageCreateRequest: Codable {
    public let maxTokens: Int?
    public let messages: [AnthropicMessageParam]?
    public let metadata: [String: String]?
    public let model: String?
    public let stopSequences: [String]?
    public let stream: Bool?
    public let system: String?
    public let temperature: Double?
    public let thinking: AnthropicThinkingConfig?
    public let toolChoice: AnthropicToolChoice?
    public let tools: [AnthropicTool]?
    public let topK: Int?
    public let topP: Double?


    public init(maxTokens: Int? = nil, messages: [AnthropicMessageParam]? = nil, metadata: [String: String]? = nil, model: String? = nil, stopSequences: [String]? = nil, stream: Bool? = nil, system: String? = nil, temperature: Double? = nil, thinking: AnthropicThinkingConfig? = nil, toolChoice: AnthropicToolChoice? = nil, tools: [AnthropicTool]? = nil, topK: Int? = nil, topP: Double? = nil) {
        self.maxTokens = maxTokens
        self.messages = messages
        self.metadata = metadata
        self.model = model
        self.stopSequences = stopSequences
        self.stream = stream
        self.system = system
        self.temperature = temperature
        self.thinking = thinking
        self.toolChoice = toolChoice
        self.tools = tools
        self.topK = topK
        self.topP = topP
    }
}

public struct AnthropicMessageParam: Codable {
    public let content: String?
    public let role: String?


    public init(content: String? = nil, role: String? = nil) {
        self.content = content
        self.role = role
    }
}

public struct AnthropicThinkingConfig: Codable {
    public let budgetTokens: Int?
    public let type: String?


    public init(budgetTokens: Int? = nil, type: String? = nil) {
        self.budgetTokens = budgetTokens
        self.type = type
    }
}

public struct AnthropicTool: Codable {
    public let description: String?
    public let inputSchema: ProviderJsonSchema?
    public let name: String?


    public init(description: String? = nil, inputSchema: ProviderJsonSchema? = nil, name: String? = nil) {
        self.description = description
        self.inputSchema = inputSchema
        self.name = name
    }
}

public struct AnthropicToolChoice: Codable {
    public let name: String?
    public let type: String?


    public init(name: String? = nil, type: String? = nil) {
        self.name = name
        self.type = type
    }
}

public struct AnthropicUsage: Codable {
    public let cacheCreationInputTokens: Int?
    public let cacheReadInputTokens: Int?
    public let inputTokens: Int?
    public let outputTokens: Int?


    public init(cacheCreationInputTokens: Int? = nil, cacheReadInputTokens: Int? = nil, inputTokens: Int? = nil, outputTokens: Int? = nil) {
        self.cacheCreationInputTokens = cacheCreationInputTokens
        self.cacheReadInputTokens = cacheReadInputTokens
        self.inputTokens = inputTokens
        self.outputTokens = outputTokens
    }
}

public struct CreateCompletionChoice: Codable {
    public let finishReason: String?
    public let index: Int?
    public let logprobs: CreateCompletionLogprobs?
    public let text: String?


    public init(finishReason: String? = nil, index: Int? = nil, logprobs: CreateCompletionLogprobs? = nil, text: String? = nil) {
        self.finishReason = finishReason
        self.index = index
        self.logprobs = logprobs
        self.text = text
    }
}

public struct CreateCompletionLogprobs: Codable {
    public let textOffset: [Int]?
    public let tokenLogprobs: [Double]?
    public let tokens: [String]?
    public let topLogprobs: [[String: Any]]?


    public init(textOffset: [Int]? = nil, tokenLogprobs: [Double]? = nil, tokens: [String]? = nil, topLogprobs: [[String: Any]]? = nil) {
        self.textOffset = textOffset
        self.tokenLogprobs = tokenLogprobs
        self.tokens = tokens
        self.topLogprobs = topLogprobs
    }
}

public struct DeleteResult: Codable {
    public let deleted: Bool?
    public let id: String?
    public let object: String?


    public init(deleted: Bool? = nil, id: String? = nil, object: String? = nil) {
        self.deleted = deleted
        self.id = id
        self.object = object
    }
}

public struct GetOrganizationAudioSpeechesUsageItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct GetOrganizationAudioTranscriptionsUsageItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct GetOrganizationCodeInterpreterSessionsUsageItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct GetOrganizationCompletionsUsageItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct GetOrganizationCostsItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct GetOrganizationEmbeddingsUsageItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct GetOrganizationImagesUsageItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct GetOrganizationModerationsUsageItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct GetOrganizationVectorStoresUsageItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct GoogleBatchEmbedContentsRequest: Codable {
    public let requests: [GoogleEmbedContentRequest]?


    public init(requests: [GoogleEmbedContentRequest]? = nil) {
        self.requests = requests
    }
}

public struct GoogleBatchEmbedContentsResponse: Codable {
    public let embeddings: [GoogleContentEmbedding]?


    public init(embeddings: [GoogleContentEmbedding]? = nil) {
        self.embeddings = embeddings
    }
}

public struct GoogleBlob: Codable {
    public let data: String?
    public let mimeType: String?


    public init(data: String? = nil, mimeType: String? = nil) {
        self.data = data
        self.mimeType = mimeType
    }
}

public struct GoogleCachedContent: Codable {
    public let contents: [GoogleContent]?
    public let createTime: String?
    public let displayName: String?
    public let expireTime: String?
    public let model: String?
    public let name: String?
    public let systemInstruction: GoogleContent?
    public let toolConfig: GoogleToolConfig?
    public let tools: [GoogleTool]?
    public let updateTime: String?
    public let usageMetadata: GoogleCachedContentUsageMetadata?


    public init(contents: [GoogleContent]? = nil, createTime: String? = nil, displayName: String? = nil, expireTime: String? = nil, model: String? = nil, name: String? = nil, systemInstruction: GoogleContent? = nil, toolConfig: GoogleToolConfig? = nil, tools: [GoogleTool]? = nil, updateTime: String? = nil, usageMetadata: GoogleCachedContentUsageMetadata? = nil) {
        self.contents = contents
        self.createTime = createTime
        self.displayName = displayName
        self.expireTime = expireTime
        self.model = model
        self.name = name
        self.systemInstruction = systemInstruction
        self.toolConfig = toolConfig
        self.tools = tools
        self.updateTime = updateTime
        self.usageMetadata = usageMetadata
    }
}

public struct GoogleCachedContentCreateRequest: Codable {
    public let contents: [GoogleContent]?
    public let displayName: String?
    public let expireTime: String?
    public let model: String?
    public let systemInstruction: GoogleContent?
    public let toolConfig: GoogleToolConfig?
    public let tools: [GoogleTool]?
    public let ttl: String?


    public init(contents: [GoogleContent]? = nil, displayName: String? = nil, expireTime: String? = nil, model: String? = nil, systemInstruction: GoogleContent? = nil, toolConfig: GoogleToolConfig? = nil, tools: [GoogleTool]? = nil, ttl: String? = nil) {
        self.contents = contents
        self.displayName = displayName
        self.expireTime = expireTime
        self.model = model
        self.systemInstruction = systemInstruction
        self.toolConfig = toolConfig
        self.tools = tools
        self.ttl = ttl
    }
}

public struct GoogleCachedContentListResponse: Codable {
    public let cachedContents: [GoogleCachedContent]?
    public let nextPageToken: String?


    public init(cachedContents: [GoogleCachedContent]? = nil, nextPageToken: String? = nil) {
        self.cachedContents = cachedContents
        self.nextPageToken = nextPageToken
    }
}

public struct GoogleCachedContentUsageMetadata: Codable {
    public let totalTokenCount: Int?


    public init(totalTokenCount: Int? = nil) {
        self.totalTokenCount = totalTokenCount
    }
}

public struct GoogleCandidate: Codable {
    public let citationMetadata: GoogleCitationMetadata?
    public let content: GoogleContent?
    public let finishReason: String?
    public let index: Int?
    public let safetyRatings: [GoogleSafetyRating]?
    public let tokenCount: Int?


    public init(citationMetadata: GoogleCitationMetadata? = nil, content: GoogleContent? = nil, finishReason: String? = nil, index: Int? = nil, safetyRatings: [GoogleSafetyRating]? = nil, tokenCount: Int? = nil) {
        self.citationMetadata = citationMetadata
        self.content = content
        self.finishReason = finishReason
        self.index = index
        self.safetyRatings = safetyRatings
        self.tokenCount = tokenCount
    }
}

public struct GoogleCitationMetadata: Codable {
    public let citationSources: [GoogleCitationSource]?


    public init(citationSources: [GoogleCitationSource]? = nil) {
        self.citationSources = citationSources
    }
}

public struct GoogleCitationSource: Codable {
    public let endIndex: Int?
    public let license: String?
    public let startIndex: Int?
    public let uri: String?


    public init(endIndex: Int? = nil, license: String? = nil, startIndex: Int? = nil, uri: String? = nil) {
        self.endIndex = endIndex
        self.license = license
        self.startIndex = startIndex
        self.uri = uri
    }
}

public struct GoogleCodeExecutionResult: Codable {
    public let outcome: String?
    public let output: String?


    public init(outcome: String? = nil, output: String? = nil) {
        self.outcome = outcome
        self.output = output
    }
}

public struct GoogleCodeExecutionTool: Codable {
    public let enabled: Bool?


    public init(enabled: Bool? = nil) {
        self.enabled = enabled
    }
}

public struct GoogleContent: Codable {
    public let parts: [GooglePart]?
    public let role: String?


    public init(parts: [GooglePart]? = nil, role: String? = nil) {
        self.parts = parts
        self.role = role
    }
}

public struct GoogleContentEmbedding: Codable {
    public let values: [Double]?


    public init(values: [Double]? = nil) {
        self.values = values
    }
}

public struct GoogleCountTokensRequest: Codable {
    public let contents: [GoogleContent]?
    public let generateContentRequest: GoogleGenerateContentRequest?


    public init(contents: [GoogleContent]? = nil, generateContentRequest: GoogleGenerateContentRequest? = nil) {
        self.contents = contents
        self.generateContentRequest = generateContentRequest
    }
}

public struct GoogleCountTokensResponse: Codable {
    public let cachedContentTokenCount: Int?
    public let totalTokens: Int?


    public init(cachedContentTokenCount: Int? = nil, totalTokens: Int? = nil) {
        self.cachedContentTokenCount = cachedContentTokenCount
        self.totalTokens = totalTokens
    }
}

public struct GoogleDynamicRetrievalConfig: Codable {
    public let dynamicThreshold: Double?
    public let mode: String?


    public init(dynamicThreshold: Double? = nil, mode: String? = nil) {
        self.dynamicThreshold = dynamicThreshold
        self.mode = mode
    }
}

public struct GoogleEmbedContentRequest: Codable {
    public let content: GoogleContent?
    public let outputDimensionality: Int?
    public let taskType: String?
    public let title: String?


    public init(content: GoogleContent? = nil, outputDimensionality: Int? = nil, taskType: String? = nil, title: String? = nil) {
        self.content = content
        self.outputDimensionality = outputDimensionality
        self.taskType = taskType
        self.title = title
    }
}

public struct GoogleEmbedContentResponse: Codable {
    public let embedding: GoogleContentEmbedding?


    public init(embedding: GoogleContentEmbedding? = nil) {
        self.embedding = embedding
    }
}

public struct GoogleEmptyResponse: Codable {
    public let object: String?


    public init(object: String? = nil) {
        self.object = object
    }
}

public struct GoogleExecutableCode: Codable {
    public let code: String?
    public let language: String?


    public init(code: String? = nil, language: String? = nil) {
        self.code = code
        self.language = language
    }
}

public struct GoogleFile: Codable {
    public let createTime: String?
    public let displayName: String?
    public let error: ProviderTaskError?
    public let expirationTime: String?
    public let mimeType: String?
    public let name: String?
    public let sha256Hash: String?
    public let sizeBytes: String?
    public let state: String?
    public let updateTime: String?
    public let uri: String?


    public init(createTime: String? = nil, displayName: String? = nil, error: ProviderTaskError? = nil, expirationTime: String? = nil, mimeType: String? = nil, name: String? = nil, sha256Hash: String? = nil, sizeBytes: String? = nil, state: String? = nil, updateTime: String? = nil, uri: String? = nil) {
        self.createTime = createTime
        self.displayName = displayName
        self.error = error
        self.expirationTime = expirationTime
        self.mimeType = mimeType
        self.name = name
        self.sha256Hash = sha256Hash
        self.sizeBytes = sizeBytes
        self.state = state
        self.updateTime = updateTime
        self.uri = uri
    }
}

public struct GoogleFileData: Codable {
    public let fileUri: String?
    public let mimeType: String?


    public init(fileUri: String? = nil, mimeType: String? = nil) {
        self.fileUri = fileUri
        self.mimeType = mimeType
    }
}

public struct GoogleFileListResponse: Codable {
    public let files: [GoogleFile]?
    public let nextPageToken: String?


    public init(files: [GoogleFile]? = nil, nextPageToken: String? = nil) {
        self.files = files
        self.nextPageToken = nextPageToken
    }
}

public struct GoogleFileUploadMultipartRequest: Codable {
    public let file: String?
    public let metadata: String?


    public init(file: String? = nil, metadata: String? = nil) {
        self.file = file
        self.metadata = metadata
    }
}

public struct GoogleFunctionCall: Codable {
    public let args: [String: Any]?
    public let name: String?


    public init(args: [String: Any]? = nil, name: String? = nil) {
        self.args = args
        self.name = name
    }
}

public struct GoogleFunctionCallingConfig: Codable {
    public let allowedFunctionNames: [String]?
    public let mode: String?


    public init(allowedFunctionNames: [String]? = nil, mode: String? = nil) {
        self.allowedFunctionNames = allowedFunctionNames
        self.mode = mode
    }
}

public struct GoogleFunctionDeclaration: Codable {
    public let description: String?
    public let name: String?
    public let parameters: GoogleSchema?
    public let response: GoogleSchema?


    public init(description: String? = nil, name: String? = nil, parameters: GoogleSchema? = nil, response: GoogleSchema? = nil) {
        self.description = description
        self.name = name
        self.parameters = parameters
        self.response = response
    }
}

public struct GoogleFunctionResponse: Codable {
    public let name: String?
    public let response: [String: Any]?


    public init(name: String? = nil, response: [String: Any]? = nil) {
        self.name = name
        self.response = response
    }
}

public struct GoogleGenerateContentRequest: Codable {
    public let cachedContent: String?
    public let contents: [GoogleContent]?
    public let generationConfig: GoogleGenerationConfig?
    public let safetySettings: [GoogleSafetySetting]?
    public let systemInstruction: GoogleContent?
    public let toolConfig: GoogleToolConfig?
    public let tools: [GoogleTool]?


    public init(cachedContent: String? = nil, contents: [GoogleContent]? = nil, generationConfig: GoogleGenerationConfig? = nil, safetySettings: [GoogleSafetySetting]? = nil, systemInstruction: GoogleContent? = nil, toolConfig: GoogleToolConfig? = nil, tools: [GoogleTool]? = nil) {
        self.cachedContent = cachedContent
        self.contents = contents
        self.generationConfig = generationConfig
        self.safetySettings = safetySettings
        self.systemInstruction = systemInstruction
        self.toolConfig = toolConfig
        self.tools = tools
    }
}

public struct GoogleGenerateContentResponse: Codable {
    public let candidates: [GoogleCandidate]?
    public let modelVersion: String?
    public let promptFeedback: GooglePromptFeedback?
    public let responseId: String?
    public let usageMetadata: GoogleUsageMetadata?


    public init(candidates: [GoogleCandidate]? = nil, modelVersion: String? = nil, promptFeedback: GooglePromptFeedback? = nil, responseId: String? = nil, usageMetadata: GoogleUsageMetadata? = nil) {
        self.candidates = candidates
        self.modelVersion = modelVersion
        self.promptFeedback = promptFeedback
        self.responseId = responseId
        self.usageMetadata = usageMetadata
    }
}

public struct GoogleGenerationConfig: Codable {
    public let candidateCount: Int?
    public let maxOutputTokens: Int?
    public let responseMimeType: String?
    public let responseSchema: GoogleSchema?
    public let stopSequences: [String]?
    public let temperature: Double?
    public let thinkingConfig: GoogleThinkingConfig?
    public let topK: Int?
    public let topP: Double?


    public init(candidateCount: Int? = nil, maxOutputTokens: Int? = nil, responseMimeType: String? = nil, responseSchema: GoogleSchema? = nil, stopSequences: [String]? = nil, temperature: Double? = nil, thinkingConfig: GoogleThinkingConfig? = nil, topK: Int? = nil, topP: Double? = nil) {
        self.candidateCount = candidateCount
        self.maxOutputTokens = maxOutputTokens
        self.responseMimeType = responseMimeType
        self.responseSchema = responseSchema
        self.stopSequences = stopSequences
        self.temperature = temperature
        self.thinkingConfig = thinkingConfig
        self.topK = topK
        self.topP = topP
    }
}

public struct GooglePart: Codable {
    public let codeExecutionResult: GoogleCodeExecutionResult?
    public let executableCode: GoogleExecutableCode?
    public let fileData: GoogleFileData?
    public let functionCall: GoogleFunctionCall?
    public let functionResponse: GoogleFunctionResponse?
    public let inlineData: GoogleBlob?
    public let text: String?


    public init(codeExecutionResult: GoogleCodeExecutionResult? = nil, executableCode: GoogleExecutableCode? = nil, fileData: GoogleFileData? = nil, functionCall: GoogleFunctionCall? = nil, functionResponse: GoogleFunctionResponse? = nil, inlineData: GoogleBlob? = nil, text: String? = nil) {
        self.codeExecutionResult = codeExecutionResult
        self.executableCode = executableCode
        self.fileData = fileData
        self.functionCall = functionCall
        self.functionResponse = functionResponse
        self.inlineData = inlineData
        self.text = text
    }
}

public struct GooglePromptFeedback: Codable {
    public let blockReason: String?
    public let safetyRatings: [GoogleSafetyRating]?


    public init(blockReason: String? = nil, safetyRatings: [GoogleSafetyRating]? = nil) {
        self.blockReason = blockReason
        self.safetyRatings = safetyRatings
    }
}

public struct GoogleSafetyRating: Codable {
    public let blocked: Bool?
    public let category: String?
    public let probability: String?


    public init(blocked: Bool? = nil, category: String? = nil, probability: String? = nil) {
        self.blocked = blocked
        self.category = category
        self.probability = probability
    }
}

public struct GoogleSafetySetting: Codable {
    public let category: String?
    public let threshold: String?


    public init(category: String? = nil, threshold: String? = nil) {
        self.category = category
        self.threshold = threshold
    }
}

public struct GoogleSchema: Codable {
    public let description: String?
    public let enum_: [String]?
    public let format: String?
    public let items: Any?
    public let nullable: Bool?
    public let properties: [String: Any]?
    public let required_: [String]?
    public let type: String?


    public init(description: String? = nil, enum_: [String]? = nil, format: String? = nil, items: Any? = nil, nullable: Bool? = nil, properties: [String: Any]? = nil, required_: [String]? = nil, type: String? = nil) {
        self.description = description
        self.enum_ = enum_
        self.format = format
        self.items = items
        self.nullable = nullable
        self.properties = properties
        self.required_ = required_
        self.type = type
    }
}

public struct GoogleSearchTool: Codable {
    public let dynamicRetrievalConfig: GoogleDynamicRetrievalConfig?


    public init(dynamicRetrievalConfig: GoogleDynamicRetrievalConfig? = nil) {
        self.dynamicRetrievalConfig = dynamicRetrievalConfig
    }
}

public struct GoogleThinkingConfig: Codable {
    public let includeThoughts: Bool?
    public let thinkingBudget: Int?


    public init(includeThoughts: Bool? = nil, thinkingBudget: Int? = nil) {
        self.includeThoughts = includeThoughts
        self.thinkingBudget = thinkingBudget
    }
}

public struct GoogleTool: Codable {
    public let codeExecution: GoogleCodeExecutionTool?
    public let functionDeclarations: [GoogleFunctionDeclaration]?
    public let googleSearch: GoogleSearchTool?
    public let urlContext: GoogleUrlContextTool?


    public init(codeExecution: GoogleCodeExecutionTool? = nil, functionDeclarations: [GoogleFunctionDeclaration]? = nil, googleSearch: GoogleSearchTool? = nil, urlContext: GoogleUrlContextTool? = nil) {
        self.codeExecution = codeExecution
        self.functionDeclarations = functionDeclarations
        self.googleSearch = googleSearch
        self.urlContext = urlContext
    }
}

public struct GoogleToolConfig: Codable {
    public let functionCallingConfig: GoogleFunctionCallingConfig?


    public init(functionCallingConfig: GoogleFunctionCallingConfig? = nil) {
        self.functionCallingConfig = functionCallingConfig
    }
}

public struct GoogleUrlContextTool: Codable {
    public let allowedDomains: [String]?


    public init(allowedDomains: [String]? = nil) {
        self.allowedDomains = allowedDomains
    }
}

public struct GoogleUsageMetadata: Codable {
    public let cachedContentTokenCount: Int?
    public let candidatesTokenCount: Int?
    public let promptTokenCount: Int?
    public let thoughtsTokenCount: Int?
    public let totalTokenCount: Int?


    public init(cachedContentTokenCount: Int? = nil, candidatesTokenCount: Int? = nil, promptTokenCount: Int? = nil, thoughtsTokenCount: Int? = nil, totalTokenCount: Int? = nil) {
        self.cachedContentTokenCount = cachedContentTokenCount
        self.candidatesTokenCount = candidatesTokenCount
        self.promptTokenCount = promptTokenCount
        self.thoughtsTokenCount = thoughtsTokenCount
        self.totalTokenCount = totalTokenCount
    }
}

public struct KlingVideoGenerationRequest: Codable {
    public let aspectRatio: String?
    public let callbackUrl: String?
    public let cfgScale: Double?
    public let duration: Int?
    public let image: String?
    public let imageTail: String?
    public let mode: String?
    public let model: String?
    public let negativePrompt: String?
    public let prompt: String?


    public init(aspectRatio: String? = nil, callbackUrl: String? = nil, cfgScale: Double? = nil, duration: Int? = nil, image: String? = nil, imageTail: String? = nil, mode: String? = nil, model: String? = nil, negativePrompt: String? = nil, prompt: String? = nil) {
        self.aspectRatio = aspectRatio
        self.callbackUrl = callbackUrl
        self.cfgScale = cfgScale
        self.duration = duration
        self.image = image
        self.imageTail = imageTail
        self.mode = mode
        self.model = model
        self.negativePrompt = negativePrompt
        self.prompt = prompt
    }
}

public struct KlingVideoGenerationTask: Codable {
    public let createdAt: String?
    public let error: ProviderTaskError?
    public let id: String?
    public let model: String?
    public let prompt: String?
    public let state: String?
    public let status: String?
    public let taskId: String?
    public let updatedAt: String?
    public let videos: [ProviderGeneratedMedia]?


    public init(createdAt: String? = nil, error: ProviderTaskError? = nil, id: String? = nil, model: String? = nil, prompt: String? = nil, state: String? = nil, status: String? = nil, taskId: String? = nil, updatedAt: String? = nil, videos: [ProviderGeneratedMedia]? = nil) {
        self.createdAt = createdAt
        self.error = error
        self.id = id
        self.model = model
        self.prompt = prompt
        self.state = state
        self.status = status
        self.taskId = taskId
        self.updatedAt = updatedAt
        self.videos = videos
    }
}

public struct ListAssistantsItem: Codable {
    public let content: String?
    public let created: Int?
    public let createdAt: Int?
    public let id: String?
    public let metadata: [String: String]?
    public let model: String?
    public let object: String?
    public let output: [String]?
    public let role: String?
    public let status: String?
    public let usage: OpenAiTokenUsage?


    public init(content: String? = nil, created: Int? = nil, createdAt: Int? = nil, id: String? = nil, metadata: [String: String]? = nil, model: String? = nil, object: String? = nil, output: [String]? = nil, role: String? = nil, status: String? = nil, usage: OpenAiTokenUsage? = nil) {
        self.content = content
        self.created = created
        self.createdAt = createdAt
        self.id = id
        self.metadata = metadata
        self.model = model
        self.object = object
        self.output = output
        self.role = role
        self.status = status
        self.usage = usage
    }
}

public struct ListBatchesItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let endpoint: String?
    public let errorFileId: String?
    public let id: String?
    public let inputFileId: String?
    public let metadata: [String: String]?
    public let object: String?
    public let outputFileId: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, endpoint: String? = nil, errorFileId: String? = nil, id: String? = nil, inputFileId: String? = nil, metadata: [String: String]? = nil, object: String? = nil, outputFileId: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.endpoint = endpoint
        self.errorFileId = errorFileId
        self.id = id
        self.inputFileId = inputFileId
        self.metadata = metadata
        self.object = object
        self.outputFileId = outputFileId
        self.status = status
    }
}

public struct ListChatCompletionMessagesItem: Codable {
    public let content: String?
    public let created: Int?
    public let createdAt: Int?
    public let id: String?
    public let metadata: [String: String]?
    public let model: String?
    public let object: String?
    public let output: [String]?
    public let role: String?
    public let status: String?
    public let usage: OpenAiTokenUsage?


    public init(content: String? = nil, created: Int? = nil, createdAt: Int? = nil, id: String? = nil, metadata: [String: String]? = nil, model: String? = nil, object: String? = nil, output: [String]? = nil, role: String? = nil, status: String? = nil, usage: OpenAiTokenUsage? = nil) {
        self.content = content
        self.created = created
        self.createdAt = createdAt
        self.id = id
        self.metadata = metadata
        self.model = model
        self.object = object
        self.output = output
        self.role = role
        self.status = status
        self.usage = usage
    }
}

public struct ListChatCompletionsItem: Codable {
    public let content: String?
    public let created: Int?
    public let createdAt: Int?
    public let id: String?
    public let metadata: [String: String]?
    public let model: String?
    public let object: String?
    public let output: [String]?
    public let role: String?
    public let status: String?
    public let usage: OpenAiTokenUsage?


    public init(content: String? = nil, created: Int? = nil, createdAt: Int? = nil, id: String? = nil, metadata: [String: String]? = nil, model: String? = nil, object: String? = nil, output: [String]? = nil, role: String? = nil, status: String? = nil, usage: OpenAiTokenUsage? = nil) {
        self.content = content
        self.created = created
        self.createdAt = createdAt
        self.id = id
        self.metadata = metadata
        self.model = model
        self.object = object
        self.output = output
        self.role = role
        self.status = status
        self.usage = usage
    }
}

public struct ListContainerFilesItem: Codable {
    public let bytes: Int?
    public let created: Int?
    public let createdAt: Int?
    public let filename: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let status: String?


    public init(bytes: Int? = nil, created: Int? = nil, createdAt: Int? = nil, filename: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, status: String? = nil) {
        self.bytes = bytes
        self.created = created
        self.createdAt = createdAt
        self.filename = filename
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.status = status
    }
}

public struct ListContainersItem: Codable {
    public let bytes: Int?
    public let created: Int?
    public let createdAt: Int?
    public let filename: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let status: String?


    public init(bytes: Int? = nil, created: Int? = nil, createdAt: Int? = nil, filename: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, status: String? = nil) {
        self.bytes = bytes
        self.created = created
        self.createdAt = createdAt
        self.filename = filename
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.status = status
    }
}

public struct ListEvalRunOutputItemsItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let dataSource: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let resultCounts: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, dataSource: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, resultCounts: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.dataSource = dataSource
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.resultCounts = resultCounts
        self.status = status
    }
}

public struct ListEvalRunsItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let dataSource: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let resultCounts: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, dataSource: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, resultCounts: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.dataSource = dataSource
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.resultCounts = resultCounts
        self.status = status
    }
}

public struct ListEvalsItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let dataSource: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let resultCounts: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, dataSource: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, resultCounts: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.dataSource = dataSource
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.resultCounts = resultCounts
        self.status = status
    }
}

public struct ListFilesItem: Codable {
    public let bytes: Int?
    public let created: Int?
    public let createdAt: Int?
    public let filename: String?
    public let id: String?
    public let metadata: [String: String]?
    public let object: String?
    public let purpose: String?
    public let status: String?


    public init(bytes: Int? = nil, created: Int? = nil, createdAt: Int? = nil, filename: String? = nil, id: String? = nil, metadata: [String: String]? = nil, object: String? = nil, purpose: String? = nil, status: String? = nil) {
        self.bytes = bytes
        self.created = created
        self.createdAt = createdAt
        self.filename = filename
        self.id = id
        self.metadata = metadata
        self.object = object
        self.purpose = purpose
        self.status = status
    }
}

public struct ListFineTuningCheckpointPermissionsItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let fineTunedModel: String?
    public let id: String?
    public let metadata: [String: String]?
    public let model: String?
    public let object: String?
    public let resultFiles: [String]?
    public let status: String?
    public let trainingFile: String?


    public init(created: Int? = nil, createdAt: Int? = nil, fineTunedModel: String? = nil, id: String? = nil, metadata: [String: String]? = nil, model: String? = nil, object: String? = nil, resultFiles: [String]? = nil, status: String? = nil, trainingFile: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.fineTunedModel = fineTunedModel
        self.id = id
        self.metadata = metadata
        self.model = model
        self.object = object
        self.resultFiles = resultFiles
        self.status = status
        self.trainingFile = trainingFile
    }
}

public struct ListFineTuningJobCheckpointsItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let fineTunedModel: String?
    public let id: String?
    public let metadata: [String: String]?
    public let model: String?
    public let object: String?
    public let resultFiles: [String]?
    public let status: String?
    public let trainingFile: String?


    public init(created: Int? = nil, createdAt: Int? = nil, fineTunedModel: String? = nil, id: String? = nil, metadata: [String: String]? = nil, model: String? = nil, object: String? = nil, resultFiles: [String]? = nil, status: String? = nil, trainingFile: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.fineTunedModel = fineTunedModel
        self.id = id
        self.metadata = metadata
        self.model = model
        self.object = object
        self.resultFiles = resultFiles
        self.status = status
        self.trainingFile = trainingFile
    }
}

public struct ListFineTuningJobEventsItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let fineTunedModel: String?
    public let id: String?
    public let metadata: [String: String]?
    public let model: String?
    public let object: String?
    public let resultFiles: [String]?
    public let status: String?
    public let trainingFile: String?


    public init(created: Int? = nil, createdAt: Int? = nil, fineTunedModel: String? = nil, id: String? = nil, metadata: [String: String]? = nil, model: String? = nil, object: String? = nil, resultFiles: [String]? = nil, status: String? = nil, trainingFile: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.fineTunedModel = fineTunedModel
        self.id = id
        self.metadata = metadata
        self.model = model
        self.object = object
        self.resultFiles = resultFiles
        self.status = status
        self.trainingFile = trainingFile
    }
}

public struct ListFineTuningJobsItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let fineTunedModel: String?
    public let id: String?
    public let metadata: [String: String]?
    public let model: String?
    public let object: String?
    public let resultFiles: [String]?
    public let status: String?
    public let trainingFile: String?


    public init(created: Int? = nil, createdAt: Int? = nil, fineTunedModel: String? = nil, id: String? = nil, metadata: [String: String]? = nil, model: String? = nil, object: String? = nil, resultFiles: [String]? = nil, status: String? = nil, trainingFile: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.fineTunedModel = fineTunedModel
        self.id = id
        self.metadata = metadata
        self.model = model
        self.object = object
        self.resultFiles = resultFiles
        self.status = status
        self.trainingFile = trainingFile
    }
}

public struct ListMessagesItem: Codable {
    public let content: String?
    public let created: Int?
    public let createdAt: Int?
    public let id: String?
    public let metadata: [String: String]?
    public let model: String?
    public let object: String?
    public let output: [String]?
    public let role: String?
    public let status: String?
    public let usage: OpenAiTokenUsage?


    public init(content: String? = nil, created: Int? = nil, createdAt: Int? = nil, id: String? = nil, metadata: [String: String]? = nil, model: String? = nil, object: String? = nil, output: [String]? = nil, role: String? = nil, status: String? = nil, usage: OpenAiTokenUsage? = nil) {
        self.content = content
        self.created = created
        self.createdAt = createdAt
        self.id = id
        self.metadata = metadata
        self.model = model
        self.object = object
        self.output = output
        self.role = role
        self.status = status
        self.usage = usage
    }
}

public struct ListOrganizationAdminApiKeysItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct ListOrganizationAuditLogsItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct ListOrganizationCertificatesItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct ListOrganizationGroupRolesItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct ListOrganizationGroupUsersItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct ListOrganizationGroupsItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct ListOrganizationInvitesItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct ListOrganizationProjectsItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct ListOrganizationRolesItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct ListOrganizationUserRolesItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct ListOrganizationUsersItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct ListProjectApiKeysItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct ListProjectCertificatesItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct ListProjectGroupRolesItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct ListProjectGroupsItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct ListProjectRateLimitsItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct ListProjectRolesItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct ListProjectServiceAccountsItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct ListProjectUserRolesItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct ListProjectUsersItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let projectId: String?
    public let role: String?
    public let status: String?


    public init(created: Int? = nil, createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, projectId: String? = nil, role: String? = nil, status: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.projectId = projectId
        self.role = role
        self.status = status
    }
}

public struct ListResponseInputItemsItem: Codable {
    public let content: String?
    public let created: Int?
    public let createdAt: Int?
    public let id: String?
    public let metadata: [String: String]?
    public let model: String?
    public let object: String?
    public let output: [String]?
    public let role: String?
    public let status: String?
    public let usage: OpenAiTokenUsage?


    public init(content: String? = nil, created: Int? = nil, createdAt: Int? = nil, id: String? = nil, metadata: [String: String]? = nil, model: String? = nil, object: String? = nil, output: [String]? = nil, role: String? = nil, status: String? = nil, usage: OpenAiTokenUsage? = nil) {
        self.content = content
        self.created = created
        self.createdAt = createdAt
        self.id = id
        self.metadata = metadata
        self.model = model
        self.object = object
        self.output = output
        self.role = role
        self.status = status
        self.usage = usage
    }
}

public struct ListRunStepsItem: Codable {
    public let content: String?
    public let created: Int?
    public let createdAt: Int?
    public let id: String?
    public let metadata: [String: String]?
    public let model: String?
    public let object: String?
    public let output: [String]?
    public let role: String?
    public let status: String?
    public let usage: OpenAiTokenUsage?


    public init(content: String? = nil, created: Int? = nil, createdAt: Int? = nil, id: String? = nil, metadata: [String: String]? = nil, model: String? = nil, object: String? = nil, output: [String]? = nil, role: String? = nil, status: String? = nil, usage: OpenAiTokenUsage? = nil) {
        self.content = content
        self.created = created
        self.createdAt = createdAt
        self.id = id
        self.metadata = metadata
        self.model = model
        self.object = object
        self.output = output
        self.role = role
        self.status = status
        self.usage = usage
    }
}

public struct ListRunsItem: Codable {
    public let content: String?
    public let created: Int?
    public let createdAt: Int?
    public let id: String?
    public let metadata: [String: String]?
    public let model: String?
    public let object: String?
    public let output: [String]?
    public let role: String?
    public let status: String?
    public let usage: OpenAiTokenUsage?


    public init(content: String? = nil, created: Int? = nil, createdAt: Int? = nil, id: String? = nil, metadata: [String: String]? = nil, model: String? = nil, object: String? = nil, output: [String]? = nil, role: String? = nil, status: String? = nil, usage: OpenAiTokenUsage? = nil) {
        self.content = content
        self.created = created
        self.createdAt = createdAt
        self.id = id
        self.metadata = metadata
        self.model = model
        self.object = object
        self.output = output
        self.role = role
        self.status = status
        self.usage = usage
    }
}

public struct ListSkillVersionsItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let description: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let status: String?
    public let version: String?


    public init(created: Int? = nil, createdAt: Int? = nil, description: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, status: String? = nil, version: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.description = description
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.status = status
        self.version = version
    }
}

public struct ListSkillsItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let description: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let status: String?
    public let version: String?


    public init(created: Int? = nil, createdAt: Int? = nil, description: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, status: String? = nil, version: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.description = description
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.status = status
        self.version = version
    }
}

public struct ListVectorStoreFileBatchFilesItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let fileId: String?
    public let fileIds: [String]?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let status: String?
    public let usageBytes: Int?


    public init(created: Int? = nil, createdAt: Int? = nil, fileId: String? = nil, fileIds: [String]? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, status: String? = nil, usageBytes: Int? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.fileId = fileId
        self.fileIds = fileIds
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.status = status
        self.usageBytes = usageBytes
    }
}

public struct ListVectorStoreFilesItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let fileId: String?
    public let fileIds: [String]?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let status: String?
    public let usageBytes: Int?


    public init(created: Int? = nil, createdAt: Int? = nil, fileId: String? = nil, fileIds: [String]? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, status: String? = nil, usageBytes: Int? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.fileId = fileId
        self.fileIds = fileIds
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.status = status
        self.usageBytes = usageBytes
    }
}

public struct ListVectorStoresItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let fileId: String?
    public let fileIds: [String]?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let status: String?
    public let usageBytes: Int?


    public init(created: Int? = nil, createdAt: Int? = nil, fileId: String? = nil, fileIds: [String]? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, status: String? = nil, usageBytes: Int? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.fileId = fileId
        self.fileIds = fileIds
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.status = status
        self.usageBytes = usageBytes
    }
}

public struct ListVideosItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let id: String?
    public let metadata: [String: String]?
    public let model: String?
    public let object: String?
    public let status: String?
    public let url: String?
    public let video: String?


    public init(created: Int? = nil, createdAt: Int? = nil, id: String? = nil, metadata: [String: String]? = nil, model: String? = nil, object: String? = nil, status: String? = nil, url: String? = nil, video: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.id = id
        self.metadata = metadata
        self.model = model
        self.object = object
        self.status = status
        self.url = url
        self.video = video
    }
}

public struct ListVoiceConsentsItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let id: String?
    public let metadata: [String: String]?
    public let object: String?
    public let status: String?
    public let text: String?
    public let url: String?
    public let voice: String?


    public init(created: Int? = nil, createdAt: Int? = nil, id: String? = nil, metadata: [String: String]? = nil, object: String? = nil, status: String? = nil, text: String? = nil, url: String? = nil, voice: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.id = id
        self.metadata = metadata
        self.object = object
        self.status = status
        self.text = text
        self.url = url
        self.voice = voice
    }
}

public struct ListVoicesItem: Codable {
    public let created: Int?
    public let createdAt: Int?
    public let id: String?
    public let metadata: [String: String]?
    public let object: String?
    public let status: String?
    public let text: String?
    public let url: String?
    public let voice: String?


    public init(created: Int? = nil, createdAt: Int? = nil, id: String? = nil, metadata: [String: String]? = nil, object: String? = nil, status: String? = nil, text: String? = nil, url: String? = nil, voice: String? = nil) {
        self.created = created
        self.createdAt = createdAt
        self.id = id
        self.metadata = metadata
        self.object = object
        self.status = status
        self.text = text
        self.url = url
        self.voice = voice
    }
}

public struct MidjourneyImageGenerationRequest: Codable {
    public let aspectRatio: String?
    public let callbackUrl: String?
    public let model: String?
    public let prompt: String?
    public let seed: Int?
    public let style: String?


    public init(aspectRatio: String? = nil, callbackUrl: String? = nil, model: String? = nil, prompt: String? = nil, seed: Int? = nil, style: String? = nil) {
        self.aspectRatio = aspectRatio
        self.callbackUrl = callbackUrl
        self.model = model
        self.prompt = prompt
        self.seed = seed
        self.style = style
    }
}

public struct MidjourneyImageGenerationTask: Codable {
    public let createdAt: String?
    public let error: ProviderTaskError?
    public let id: String?
    public let images: [ProviderGeneratedMedia]?
    public let model: String?
    public let prompt: String?
    public let state: String?
    public let status: String?
    public let taskId: String?
    public let updatedAt: String?


    public init(createdAt: String? = nil, error: ProviderTaskError? = nil, id: String? = nil, images: [ProviderGeneratedMedia]? = nil, model: String? = nil, prompt: String? = nil, state: String? = nil, status: String? = nil, taskId: String? = nil, updatedAt: String? = nil) {
        self.createdAt = createdAt
        self.error = error
        self.id = id
        self.images = images
        self.model = model
        self.prompt = prompt
        self.state = state
        self.status = status
        self.taskId = taskId
        self.updatedAt = updatedAt
    }
}

public struct NanoBananaImageGenerationRequest: Codable {
    public let aspectRatio: String?
    public let callbackUrl: String?
    public let images: [String]?
    public let model: String?
    public let prompt: String?
    public let seed: Int?
    public let size: String?


    public init(aspectRatio: String? = nil, callbackUrl: String? = nil, images: [String]? = nil, model: String? = nil, prompt: String? = nil, seed: Int? = nil, size: String? = nil) {
        self.aspectRatio = aspectRatio
        self.callbackUrl = callbackUrl
        self.images = images
        self.model = model
        self.prompt = prompt
        self.seed = seed
        self.size = size
    }
}

public struct NanoBananaImageGenerationTask: Codable {
    public let createdAt: String?
    public let error: ProviderTaskError?
    public let id: String?
    public let images: [ProviderGeneratedMedia]?
    public let model: String?
    public let prompt: String?
    public let state: String?
    public let status: String?
    public let taskId: String?
    public let updatedAt: String?


    public init(createdAt: String? = nil, error: ProviderTaskError? = nil, id: String? = nil, images: [ProviderGeneratedMedia]? = nil, model: String? = nil, prompt: String? = nil, state: String? = nil, status: String? = nil, taskId: String? = nil, updatedAt: String? = nil) {
        self.createdAt = createdAt
        self.error = error
        self.id = id
        self.images = images
        self.model = model
        self.prompt = prompt
        self.state = state
        self.status = status
        self.taskId = taskId
        self.updatedAt = updatedAt
    }
}

public struct OpenAiAnnotation: Codable {
    public let endIndex: Int?
    public let fileId: String?
    public let filename: String?
    public let index: Int?
    public let startIndex: Int?
    public let title: String?
    public let type: String?
    public let url: String?


    public init(endIndex: Int? = nil, fileId: String? = nil, filename: String? = nil, index: Int? = nil, startIndex: Int? = nil, title: String? = nil, type: String? = nil, url: String? = nil) {
        self.endIndex = endIndex
        self.fileId = fileId
        self.filename = filename
        self.index = index
        self.startIndex = startIndex
        self.title = title
        self.type = type
        self.url = url
    }
}

public struct OpenAiAssistant: Codable {
    public let createdAt: Int?
    public let description: String?
    public let id: String?
    public let instructions: String?
    public let metadata: [String: String]?
    public let model: String?
    public let name: String?
    public let object: String?
    public let responseFormat: String?
    public let temperature: Double?
    public let toolResources: String?
    public let tools: [String]?
    public let topP: Double?


    public init(createdAt: Int? = nil, description: String? = nil, id: String? = nil, instructions: String? = nil, metadata: [String: String]? = nil, model: String? = nil, name: String? = nil, object: String? = nil, responseFormat: String? = nil, temperature: Double? = nil, toolResources: String? = nil, tools: [String]? = nil, topP: Double? = nil) {
        self.createdAt = createdAt
        self.description = description
        self.id = id
        self.instructions = instructions
        self.metadata = metadata
        self.model = model
        self.name = name
        self.object = object
        self.responseFormat = responseFormat
        self.temperature = temperature
        self.toolResources = toolResources
        self.tools = tools
        self.topP = topP
    }
}

public struct OpenAiAssistantCreateRequest: Codable {
    public let description: String?
    public let instructions: String?
    public let metadata: [String: String]?
    public let model: String?
    public let name: String?
    public let responseFormat: String?
    public let temperature: Double?
    public let toolResources: String?
    public let tools: [String]?
    public let topP: Double?


    public init(description: String? = nil, instructions: String? = nil, metadata: [String: String]? = nil, model: String? = nil, name: String? = nil, responseFormat: String? = nil, temperature: Double? = nil, toolResources: String? = nil, tools: [String]? = nil, topP: Double? = nil) {
        self.description = description
        self.instructions = instructions
        self.metadata = metadata
        self.model = model
        self.name = name
        self.responseFormat = responseFormat
        self.temperature = temperature
        self.toolResources = toolResources
        self.tools = tools
        self.topP = topP
    }
}

public struct OpenAiAssistantList: Codable {
    public let data: [OpenAiAssistant]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiAssistant]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiAssistantUpdateRequest: Codable {
    public let description: String?
    public let instructions: String?
    public let metadata: [String: String]?
    public let model: String?
    public let name: String?
    public let responseFormat: String?
    public let temperature: Double?
    public let toolResources: String?
    public let tools: [String]?
    public let topP: Double?


    public init(description: String? = nil, instructions: String? = nil, metadata: [String: String]? = nil, model: String? = nil, name: String? = nil, responseFormat: String? = nil, temperature: Double? = nil, toolResources: String? = nil, tools: [String]? = nil, topP: Double? = nil) {
        self.description = description
        self.instructions = instructions
        self.metadata = metadata
        self.model = model
        self.name = name
        self.responseFormat = responseFormat
        self.temperature = temperature
        self.toolResources = toolResources
        self.tools = tools
        self.topP = topP
    }
}

public struct OpenAiAudioTranscription: Codable {
    public let duration: Double?
    public let language: String?
    public let segments: [String]?
    public let text: String?
    public let words: [String]?


    public init(duration: Double? = nil, language: String? = nil, segments: [String]? = nil, text: String? = nil, words: [String]? = nil) {
        self.duration = duration
        self.language = language
        self.segments = segments
        self.text = text
        self.words = words
    }
}

public struct OpenAiAudioTranscriptionMultipartRequest: Codable {
    public let file: String?
    public let language: String?
    public let model: String?
    public let prompt: String?
    public let responseFormat: String?


    public init(file: String? = nil, language: String? = nil, model: String? = nil, prompt: String? = nil, responseFormat: String? = nil) {
        self.file = file
        self.language = language
        self.model = model
        self.prompt = prompt
        self.responseFormat = responseFormat
    }
}

public struct OpenAiAudioTranscriptionRequest: Codable {
    public let file: OpenAiFileReferenceInput?
    public let language: String?
    public let model: String?
    public let prompt: String?
    public let responseFormat: String?


    public init(file: OpenAiFileReferenceInput? = nil, language: String? = nil, model: String? = nil, prompt: String? = nil, responseFormat: String? = nil) {
        self.file = file
        self.language = language
        self.model = model
        self.prompt = prompt
        self.responseFormat = responseFormat
    }
}

public struct OpenAiAudioTranslation: Codable {
    public let duration: Double?
    public let segments: [String]?
    public let text: String?


    public init(duration: Double? = nil, segments: [String]? = nil, text: String? = nil) {
        self.duration = duration
        self.segments = segments
        self.text = text
    }
}

public struct OpenAiAudioTranslationMultipartRequest: Codable {
    public let file: String?
    public let model: String?
    public let prompt: String?
    public let responseFormat: String?


    public init(file: String? = nil, model: String? = nil, prompt: String? = nil, responseFormat: String? = nil) {
        self.file = file
        self.model = model
        self.prompt = prompt
        self.responseFormat = responseFormat
    }
}

public struct OpenAiAudioTranslationRequest: Codable {
    public let file: OpenAiFileReferenceInput?
    public let model: String?
    public let prompt: String?
    public let responseFormat: String?


    public init(file: OpenAiFileReferenceInput? = nil, model: String? = nil, prompt: String? = nil, responseFormat: String? = nil) {
        self.file = file
        self.model = model
        self.prompt = prompt
        self.responseFormat = responseFormat
    }
}

public struct OpenAiBatch: Codable {
    public let cancelledAt: Int?
    public let cancellingAt: Int?
    public let completedAt: Int?
    public let completionWindow: String?
    public let createdAt: Int?
    public let endpoint: String?
    public let errorFileId: String?
    public let errors: String?
    public let expiredAt: Int?
    public let expiresAt: Int?
    public let failedAt: Int?
    public let finalizingAt: Int?
    public let id: String?
    public let inProgressAt: Int?
    public let inputFileId: String?
    public let metadata: [String: String]?
    public let object: String?
    public let outputFileId: String?
    public let requestCounts: OpenAiBatchRequestCounts?
    public let status: String?


    public init(cancelledAt: Int? = nil, cancellingAt: Int? = nil, completedAt: Int? = nil, completionWindow: String? = nil, createdAt: Int? = nil, endpoint: String? = nil, errorFileId: String? = nil, errors: String? = nil, expiredAt: Int? = nil, expiresAt: Int? = nil, failedAt: Int? = nil, finalizingAt: Int? = nil, id: String? = nil, inProgressAt: Int? = nil, inputFileId: String? = nil, metadata: [String: String]? = nil, object: String? = nil, outputFileId: String? = nil, requestCounts: OpenAiBatchRequestCounts? = nil, status: String? = nil) {
        self.cancelledAt = cancelledAt
        self.cancellingAt = cancellingAt
        self.completedAt = completedAt
        self.completionWindow = completionWindow
        self.createdAt = createdAt
        self.endpoint = endpoint
        self.errorFileId = errorFileId
        self.errors = errors
        self.expiredAt = expiredAt
        self.expiresAt = expiresAt
        self.failedAt = failedAt
        self.finalizingAt = finalizingAt
        self.id = id
        self.inProgressAt = inProgressAt
        self.inputFileId = inputFileId
        self.metadata = metadata
        self.object = object
        self.outputFileId = outputFileId
        self.requestCounts = requestCounts
        self.status = status
    }
}

public struct OpenAiBatchCreateRequest: Codable {
    public let completionWindow: String?
    public let endpoint: String?
    public let inputFileId: String?
    public let metadata: [String: String]?


    public init(completionWindow: String? = nil, endpoint: String? = nil, inputFileId: String? = nil, metadata: [String: String]? = nil) {
        self.completionWindow = completionWindow
        self.endpoint = endpoint
        self.inputFileId = inputFileId
        self.metadata = metadata
    }
}

public struct OpenAiBatchList: Codable {
    public let data: [OpenAiBatch]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiBatch]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiBatchRequestCounts: Codable {
    public let completed: Int?
    public let failed: Int?
    public let total: Int?


    public init(completed: Int? = nil, failed: Int? = nil, total: Int? = nil) {
        self.completed = completed
        self.failed = failed
        self.total = total
    }
}

public struct OpenAiCertificate: Codable {
    public let active: Bool?
    public let content: String?
    public let createdAt: Int?
    public let expiresAt: Int?
    public let id: String?
    public let name: String?
    public let object: String?


    public init(active: Bool? = nil, content: String? = nil, createdAt: Int? = nil, expiresAt: Int? = nil, id: String? = nil, name: String? = nil, object: String? = nil) {
        self.active = active
        self.content = content
        self.createdAt = createdAt
        self.expiresAt = expiresAt
        self.id = id
        self.name = name
        self.object = object
    }
}

public struct OpenAiCertificateActivationRequest: Codable {
    public let certificateIds: [String]?


    public init(certificateIds: [String]? = nil) {
        self.certificateIds = certificateIds
    }
}

public struct OpenAiCertificateList: Codable {
    public let data: [OpenAiCertificate]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiCertificate]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiCertificateUploadMultipartRequest: Codable {
    public let certificate: String?
    public let file: String?
    public let metadata: String?
    public let name: String?


    public init(certificate: String? = nil, file: String? = nil, metadata: String? = nil, name: String? = nil) {
        self.certificate = certificate
        self.file = file
        self.metadata = metadata
        self.name = name
    }
}

public struct OpenAiChatAudioConfig: Codable {
    public let format: String?
    public let voice: String?


    public init(format: String? = nil, voice: String? = nil) {
        self.format = format
        self.voice = voice
    }
}

public struct OpenAiChatCompletion: Codable {
    public let choices: [OpenAiChatCompletionChoice]?
    public let created: Int?
    public let id: String?
    public let model: String?
    public let object: String?
    public let requestId: String?
    public let serviceTier: String?
    public let systemFingerprint: String?
    public let usage: OpenAiTokenUsage?


    public init(choices: [OpenAiChatCompletionChoice]? = nil, created: Int? = nil, id: String? = nil, model: String? = nil, object: String? = nil, requestId: String? = nil, serviceTier: String? = nil, systemFingerprint: String? = nil, usage: OpenAiTokenUsage? = nil) {
        self.choices = choices
        self.created = created
        self.id = id
        self.model = model
        self.object = object
        self.requestId = requestId
        self.serviceTier = serviceTier
        self.systemFingerprint = systemFingerprint
        self.usage = usage
    }
}

public struct OpenAiChatCompletionChoice: Codable {
    public let finishReason: String?
    public let index: Int?
    public let logprobs: OpenAiChoiceLogprobs?
    public let message: OpenAiChatMessage?


    public init(finishReason: String? = nil, index: Int? = nil, logprobs: OpenAiChoiceLogprobs? = nil, message: OpenAiChatMessage? = nil) {
        self.finishReason = finishReason
        self.index = index
        self.logprobs = logprobs
        self.message = message
    }
}

public struct OpenAiChatCompletionList: Codable {
    public let data: [OpenAiChatCompletion]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiChatCompletion]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiChatCompletionMessageList: Codable {
    public let data: [OpenAiChatMessage]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiChatMessage]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiChatCompletionRequest: Codable {
    public let audio: OpenAiChatAudioConfig?
    public let frequencyPenalty: Double?
    public let functionCall: OpenAiFunctionCallChoice?
    public let functions: [OpenAiFunctionDefinition]?
    public let logitBias: [String: Double]?
    public let logprobs: Bool?
    public let maxCompletionTokens: Int?
    public let maxTokens: Int?
    public let messages: [OpenAiChatMessage]?
    public let metadata: [String: String]?
    public let modalities: [String]?
    public let model: String?
    public let n: Int?
    public let parallelToolCalls: Bool?
    public let prediction: OpenAiPredictionConfig?
    public let presencePenalty: Double?
    public let reasoningEffort: String?
    public let responseFormat: OpenAiResponseFormat?
    public let seed: Int?
    public let serviceTier: String?
    public let stop: String?
    public let store: Bool?
    public let stream: Bool?
    public let streamOptions: OpenAiStreamOptions?
    public let temperature: Double?
    public let toolChoice: OpenAiToolChoice?
    public let tools: [OpenAiTool]?
    public let topLogprobs: Int?
    public let topP: Double?
    public let user: String?


    public init(audio: OpenAiChatAudioConfig? = nil, frequencyPenalty: Double? = nil, functionCall: OpenAiFunctionCallChoice? = nil, functions: [OpenAiFunctionDefinition]? = nil, logitBias: [String: Double]? = nil, logprobs: Bool? = nil, maxCompletionTokens: Int? = nil, maxTokens: Int? = nil, messages: [OpenAiChatMessage]? = nil, metadata: [String: String]? = nil, modalities: [String]? = nil, model: String? = nil, n: Int? = nil, parallelToolCalls: Bool? = nil, prediction: OpenAiPredictionConfig? = nil, presencePenalty: Double? = nil, reasoningEffort: String? = nil, responseFormat: OpenAiResponseFormat? = nil, seed: Int? = nil, serviceTier: String? = nil, stop: String? = nil, store: Bool? = nil, stream: Bool? = nil, streamOptions: OpenAiStreamOptions? = nil, temperature: Double? = nil, toolChoice: OpenAiToolChoice? = nil, tools: [OpenAiTool]? = nil, topLogprobs: Int? = nil, topP: Double? = nil, user: String? = nil) {
        self.audio = audio
        self.frequencyPenalty = frequencyPenalty
        self.functionCall = functionCall
        self.functions = functions
        self.logitBias = logitBias
        self.logprobs = logprobs
        self.maxCompletionTokens = maxCompletionTokens
        self.maxTokens = maxTokens
        self.messages = messages
        self.metadata = metadata
        self.modalities = modalities
        self.model = model
        self.n = n
        self.parallelToolCalls = parallelToolCalls
        self.prediction = prediction
        self.presencePenalty = presencePenalty
        self.reasoningEffort = reasoningEffort
        self.responseFormat = responseFormat
        self.seed = seed
        self.serviceTier = serviceTier
        self.stop = stop
        self.store = store
        self.stream = stream
        self.streamOptions = streamOptions
        self.temperature = temperature
        self.toolChoice = toolChoice
        self.tools = tools
        self.topLogprobs = topLogprobs
        self.topP = topP
        self.user = user
    }
}

public struct OpenAiChatCompletionUpdateRequest: Codable {
    public let metadata: [String: String]?


    public init(metadata: [String: String]? = nil) {
        self.metadata = metadata
    }
}

public struct OpenAiChatContentPart: Codable {
    public let file: OpenAiChatFile?
    public let imageUrl: OpenAiChatImageUrl?
    public let inputAudio: OpenAiChatInputAudio?
    public let text: String?
    public let type: String?


    public init(file: OpenAiChatFile? = nil, imageUrl: OpenAiChatImageUrl? = nil, inputAudio: OpenAiChatInputAudio? = nil, text: String? = nil, type: String? = nil) {
        self.file = file
        self.imageUrl = imageUrl
        self.inputAudio = inputAudio
        self.text = text
        self.type = type
    }
}

public struct OpenAiChatFile: Codable {
    public let fileData: String?
    public let fileId: String?
    public let filename: String?


    public init(fileData: String? = nil, fileId: String? = nil, filename: String? = nil) {
        self.fileData = fileData
        self.fileId = fileId
        self.filename = filename
    }
}

public struct OpenAiChatImageUrl: Codable {
    public let detail: String?
    public let url: String?


    public init(detail: String? = nil, url: String? = nil) {
        self.detail = detail
        self.url = url
    }
}

public struct OpenAiChatInputAudio: Codable {
    public let data: String?
    public let format: String?


    public init(data: String? = nil, format: String? = nil) {
        self.data = data
        self.format = format
    }
}

public struct OpenAiChatMessage: Codable {
    public let content: String?
    public let functionCall: OpenAiFunctionCall?
    public let name: String?
    public let refusal: String?
    public let role: String?
    public let toolCallId: String?
    public let toolCalls: [OpenAiToolCall]?


    public init(content: String? = nil, functionCall: OpenAiFunctionCall? = nil, name: String? = nil, refusal: String? = nil, role: String? = nil, toolCallId: String? = nil, toolCalls: [OpenAiToolCall]? = nil) {
        self.content = content
        self.functionCall = functionCall
        self.name = name
        self.refusal = refusal
        self.role = role
        self.toolCallId = toolCallId
        self.toolCalls = toolCalls
    }
}

public struct OpenAiChoiceLogprobs: Codable {
    public let content: [OpenAiTokenLogprob]?
    public let refusal: [OpenAiTokenLogprob]?


    public init(content: [OpenAiTokenLogprob]? = nil, refusal: [OpenAiTokenLogprob]? = nil) {
        self.content = content
        self.refusal = refusal
    }
}

public struct OpenAiCompletion: Codable {
    public let choices: [CreateCompletionChoice]?
    public let created: Int?
    public let id: String?
    public let model: String?
    public let object: String?
    public let systemFingerprint: String?
    public let usage: OpenAiTokenUsage?


    public init(choices: [CreateCompletionChoice]? = nil, created: Int? = nil, id: String? = nil, model: String? = nil, object: String? = nil, systemFingerprint: String? = nil, usage: OpenAiTokenUsage? = nil) {
        self.choices = choices
        self.created = created
        self.id = id
        self.model = model
        self.object = object
        self.systemFingerprint = systemFingerprint
        self.usage = usage
    }
}

public struct OpenAiCompletionCreateRequest: Codable {
    public let bestOf: Int?
    public let echo: Bool?
    public let frequencyPenalty: Double?
    public let logitBias: [String: Double]?
    public let logprobs: Int?
    public let maxTokens: Int?
    public let model: String?
    public let n: Int?
    public let presencePenalty: Double?
    public let prompt: String?
    public let seed: Int?
    public let stop: String?
    public let stream: Bool?
    public let suffix: String?
    public let temperature: Double?
    public let topP: Double?
    public let user: String?


    public init(bestOf: Int? = nil, echo: Bool? = nil, frequencyPenalty: Double? = nil, logitBias: [String: Double]? = nil, logprobs: Int? = nil, maxTokens: Int? = nil, model: String? = nil, n: Int? = nil, presencePenalty: Double? = nil, prompt: String? = nil, seed: Int? = nil, stop: String? = nil, stream: Bool? = nil, suffix: String? = nil, temperature: Double? = nil, topP: Double? = nil, user: String? = nil) {
        self.bestOf = bestOf
        self.echo = echo
        self.frequencyPenalty = frequencyPenalty
        self.logitBias = logitBias
        self.logprobs = logprobs
        self.maxTokens = maxTokens
        self.model = model
        self.n = n
        self.presencePenalty = presencePenalty
        self.prompt = prompt
        self.seed = seed
        self.stop = stop
        self.stream = stream
        self.suffix = suffix
        self.temperature = temperature
        self.topP = topP
        self.user = user
    }
}

public struct OpenAiCompletionTokensDetails: Codable {
    public let acceptedPredictionTokens: Int?
    public let audioTokens: Int?
    public let reasoningTokens: Int?
    public let rejectedPredictionTokens: Int?


    public init(acceptedPredictionTokens: Int? = nil, audioTokens: Int? = nil, reasoningTokens: Int? = nil, rejectedPredictionTokens: Int? = nil) {
        self.acceptedPredictionTokens = acceptedPredictionTokens
        self.audioTokens = audioTokens
        self.reasoningTokens = reasoningTokens
        self.rejectedPredictionTokens = rejectedPredictionTokens
    }
}

public struct OpenAiContainer: Codable {
    public let createdAt: Int?
    public let expiresAt: Int?
    public let id: String?
    public let lastActiveAt: Int?
    public let memoryLimit: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let status: String?


    public init(createdAt: Int? = nil, expiresAt: Int? = nil, id: String? = nil, lastActiveAt: Int? = nil, memoryLimit: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, status: String? = nil) {
        self.createdAt = createdAt
        self.expiresAt = expiresAt
        self.id = id
        self.lastActiveAt = lastActiveAt
        self.memoryLimit = memoryLimit
        self.metadata = metadata
        self.name = name
        self.object = object
        self.status = status
    }
}

public struct OpenAiContainerCreateRequest: Codable {
    public let fileIds: [String]?
    public let memoryLimit: String?
    public let metadata: [String: String]?
    public let name: String?


    public init(fileIds: [String]? = nil, memoryLimit: String? = nil, metadata: [String: String]? = nil, name: String? = nil) {
        self.fileIds = fileIds
        self.memoryLimit = memoryLimit
        self.metadata = metadata
        self.name = name
    }
}

public struct OpenAiContainerFile: Codable {
    public let bytes: Int?
    public let containerId: String?
    public let createdAt: Int?
    public let filename: String?
    public let id: String?
    public let metadata: [String: String]?
    public let object: String?
    public let path: String?
    public let purpose: String?


    public init(bytes: Int? = nil, containerId: String? = nil, createdAt: Int? = nil, filename: String? = nil, id: String? = nil, metadata: [String: String]? = nil, object: String? = nil, path: String? = nil, purpose: String? = nil) {
        self.bytes = bytes
        self.containerId = containerId
        self.createdAt = createdAt
        self.filename = filename
        self.id = id
        self.metadata = metadata
        self.object = object
        self.path = path
        self.purpose = purpose
    }
}

public struct OpenAiContainerFileCreateMultipartRequest: Codable {
    public let file: String?
    public let metadata: String?
    public let purpose: String?


    public init(file: String? = nil, metadata: String? = nil, purpose: String? = nil) {
        self.file = file
        self.metadata = metadata
        self.purpose = purpose
    }
}

public struct OpenAiContainerFileList: Codable {
    public let data: [OpenAiContainerFile]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiContainerFile]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiContainerList: Codable {
    public let data: [OpenAiContainer]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiContainer]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiConversation: Codable {
    public let createdAt: Int?
    public let id: String?
    public let metadata: [String: String]?
    public let object: String?


    public init(createdAt: Int? = nil, id: String? = nil, metadata: [String: String]? = nil, object: String? = nil) {
        self.createdAt = createdAt
        self.id = id
        self.metadata = metadata
        self.object = object
    }
}

public struct OpenAiConversationContentPart: Codable {
    public let fileId: String?
    public let imageUrl: String?
    public let text: String?
    public let type: String?


    public init(fileId: String? = nil, imageUrl: String? = nil, text: String? = nil, type: String? = nil) {
        self.fileId = fileId
        self.imageUrl = imageUrl
        self.text = text
        self.type = type
    }
}

public struct OpenAiConversationCreateRequest: Codable {
    public let items: [OpenAiConversationItemCreateRequest]?
    public let metadata: [String: String]?


    public init(items: [OpenAiConversationItemCreateRequest]? = nil, metadata: [String: String]? = nil) {
        self.items = items
        self.metadata = metadata
    }
}

public struct OpenAiConversationItem: Codable {
    public let content: [OpenAiConversationContentPart]?
    public let createdAt: Int?
    public let id: String?
    public let metadata: [String: String]?
    public let object: String?
    public let role: String?
    public let status: String?
    public let type: String?


    public init(content: [OpenAiConversationContentPart]? = nil, createdAt: Int? = nil, id: String? = nil, metadata: [String: String]? = nil, object: String? = nil, role: String? = nil, status: String? = nil, type: String? = nil) {
        self.content = content
        self.createdAt = createdAt
        self.id = id
        self.metadata = metadata
        self.object = object
        self.role = role
        self.status = status
        self.type = type
    }
}

public struct OpenAiConversationItemCreateRequest: Codable {
    public let content: [OpenAiConversationContentPart]?
    public let metadata: [String: String]?
    public let role: String?
    public let type: String?


    public init(content: [OpenAiConversationContentPart]? = nil, metadata: [String: String]? = nil, role: String? = nil, type: String? = nil) {
        self.content = content
        self.metadata = metadata
        self.role = role
        self.type = type
    }
}

public struct OpenAiConversationItemList: Codable {
    public let data: [OpenAiConversationItem]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiConversationItem]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiConversationList: Codable {
    public let data: [OpenAiConversation]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiConversation]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiConversationReference: Codable {
    public let id: String?


    public init(id: String? = nil) {
        self.id = id
    }
}

public struct OpenAiConversationUpdateRequest: Codable {
    public let metadata: [String: String]?


    public init(metadata: [String: String]? = nil) {
        self.metadata = metadata
    }
}

public struct OpenAiEmbedding: Codable {
    public let embedding: [Double]?
    public let index: Int?
    public let object: String?


    public init(embedding: [Double]? = nil, index: Int? = nil, object: String? = nil) {
        self.embedding = embedding
        self.index = index
        self.object = object
    }
}

public struct OpenAiEmbeddingList: Codable {
    public let data: [OpenAiEmbedding]?
    public let model: String?
    public let object: String?
    public let usage: OpenAiEmbeddingUsage?


    public init(data: [OpenAiEmbedding]? = nil, model: String? = nil, object: String? = nil, usage: OpenAiEmbeddingUsage? = nil) {
        self.data = data
        self.model = model
        self.object = object
        self.usage = usage
    }
}

public struct OpenAiEmbeddingUsage: Codable {
    public let promptTokens: Int?
    public let totalTokens: Int?


    public init(promptTokens: Int? = nil, totalTokens: Int? = nil) {
        self.promptTokens = promptTokens
        self.totalTokens = totalTokens
    }
}

public struct OpenAiEmbeddingsRequest: Codable {
    public let dimensions: Int?
    public let encodingFormat: String?
    public let input: String?
    public let model: String?
    public let user: String?


    public init(dimensions: Int? = nil, encodingFormat: String? = nil, input: String? = nil, model: String? = nil, user: String? = nil) {
        self.dimensions = dimensions
        self.encodingFormat = encodingFormat
        self.input = input
        self.model = model
        self.user = user
    }
}

public struct OpenAiError: Codable {
    public let code: String?
    public let message: String?
    public let param: String?
    public let path: String?
    public let type: String?


    public init(code: String? = nil, message: String? = nil, param: String? = nil, path: String? = nil, type: String? = nil) {
        self.code = code
        self.message = message
        self.param = param
        self.path = path
        self.type = type
    }
}

public struct OpenAiErrorEnvelope: Codable {
    public let error: OpenAiError?


    public init(error: OpenAiError? = nil) {
        self.error = error
    }
}

public struct OpenAiEval: Codable {
    public let createdAt: Int?
    public let dataSourceConfig: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let testingCriteria: [String]?


    public init(createdAt: Int? = nil, dataSourceConfig: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, testingCriteria: [String]? = nil) {
        self.createdAt = createdAt
        self.dataSourceConfig = dataSourceConfig
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.testingCriteria = testingCriteria
    }
}

public struct OpenAiEvalCreateRequest: Codable {
    public let dataSource: String?
    public let dataSourceConfig: String?
    public let metadata: [String: String]?
    public let name: String?
    public let testingCriteria: [String]?


    public init(dataSource: String? = nil, dataSourceConfig: String? = nil, metadata: [String: String]? = nil, name: String? = nil, testingCriteria: [String]? = nil) {
        self.dataSource = dataSource
        self.dataSourceConfig = dataSourceConfig
        self.metadata = metadata
        self.name = name
        self.testingCriteria = testingCriteria
    }
}

public struct OpenAiEvalList: Codable {
    public let data: [OpenAiEval]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiEval]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiEvalRun: Codable {
    public let createdAt: Int?
    public let dataSource: String?
    public let evalId: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let reportUrl: String?
    public let resultCounts: OpenAiEvalRunResultCounts?
    public let status: String?


    public init(createdAt: Int? = nil, dataSource: String? = nil, evalId: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, reportUrl: String? = nil, resultCounts: OpenAiEvalRunResultCounts? = nil, status: String? = nil) {
        self.createdAt = createdAt
        self.dataSource = dataSource
        self.evalId = evalId
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.reportUrl = reportUrl
        self.resultCounts = resultCounts
        self.status = status
    }
}

public struct OpenAiEvalRunCreateRequest: Codable {
    public let dataSource: String?
    public let metadata: [String: String]?
    public let name: String?


    public init(dataSource: String? = nil, metadata: [String: String]? = nil, name: String? = nil) {
        self.dataSource = dataSource
        self.metadata = metadata
        self.name = name
    }
}

public struct OpenAiEvalRunList: Codable {
    public let data: [OpenAiEvalRun]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiEvalRun]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiEvalRunOutputItem: Codable {
    public let createdAt: Int?
    public let evalId: String?
    public let id: String?
    public let metadata: [String: String]?
    public let object: String?
    public let results: [String]?
    public let runId: String?
    public let sample: String?
    public let status: String?


    public init(createdAt: Int? = nil, evalId: String? = nil, id: String? = nil, metadata: [String: String]? = nil, object: String? = nil, results: [String]? = nil, runId: String? = nil, sample: String? = nil, status: String? = nil) {
        self.createdAt = createdAt
        self.evalId = evalId
        self.id = id
        self.metadata = metadata
        self.object = object
        self.results = results
        self.runId = runId
        self.sample = sample
        self.status = status
    }
}

public struct OpenAiEvalRunOutputItemList: Codable {
    public let data: [OpenAiEvalRunOutputItem]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiEvalRunOutputItem]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiEvalRunResultCounts: Codable {
    public let errored: Int?
    public let failed: Int?
    public let passed: Int?
    public let total: Int?


    public init(errored: Int? = nil, failed: Int? = nil, passed: Int? = nil, total: Int? = nil) {
        self.errored = errored
        self.failed = failed
        self.passed = passed
        self.total = total
    }
}

public struct OpenAiEvalUpdateRequest: Codable {
    public let dataSource: String?
    public let dataSourceConfig: String?
    public let metadata: [String: String]?
    public let name: String?
    public let testingCriteria: [String]?


    public init(dataSource: String? = nil, dataSourceConfig: String? = nil, metadata: [String: String]? = nil, name: String? = nil, testingCriteria: [String]? = nil) {
        self.dataSource = dataSource
        self.dataSourceConfig = dataSourceConfig
        self.metadata = metadata
        self.name = name
        self.testingCriteria = testingCriteria
    }
}

public struct OpenAiFile: Codable {
    public let bytes: Int?
    public let createdAt: Int?
    public let filename: String?
    public let id: String?
    public let object: String?
    public let purpose: String?
    public let status: String?
    public let statusDetails: String?


    public init(bytes: Int? = nil, createdAt: Int? = nil, filename: String? = nil, id: String? = nil, object: String? = nil, purpose: String? = nil, status: String? = nil, statusDetails: String? = nil) {
        self.bytes = bytes
        self.createdAt = createdAt
        self.filename = filename
        self.id = id
        self.object = object
        self.purpose = purpose
        self.status = status
        self.statusDetails = statusDetails
    }
}

public struct OpenAiFileList: Codable {
    public let data: [OpenAiFile]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiFile]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiFileReferenceInput: Codable {

    public init() {}
}

public struct OpenAiFileReferenceObject: Codable {
    public let fileData: String?
    public let fileId: String?
    public let filename: String?
    public let mimeType: String?
    public let url: String?


    public init(fileData: String? = nil, fileId: String? = nil, filename: String? = nil, mimeType: String? = nil, url: String? = nil) {
        self.fileData = fileData
        self.fileId = fileId
        self.filename = filename
        self.mimeType = mimeType
        self.url = url
    }
}

public struct OpenAiFileUploadRequest: Codable {
    public let file: String?
    public let purpose: String?


    public init(file: String? = nil, purpose: String? = nil) {
        self.file = file
        self.purpose = purpose
    }
}

public struct OpenAiFineTuningCheckpointPermission: Codable {
    public let createdAt: Int?
    public let id: String?
    public let object: String?
    public let projectId: String?


    public init(createdAt: Int? = nil, id: String? = nil, object: String? = nil, projectId: String? = nil) {
        self.createdAt = createdAt
        self.id = id
        self.object = object
        self.projectId = projectId
    }
}

public struct OpenAiFineTuningCheckpointPermissionCreateRequest: Codable {
    public let projectId: String?


    public init(projectId: String? = nil) {
        self.projectId = projectId
    }
}

public struct OpenAiFineTuningCheckpointPermissionList: Codable {
    public let data: [OpenAiFineTuningCheckpointPermission]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiFineTuningCheckpointPermission]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiFineTuningGraderRunRequest: Codable {
    public let grader: String?
    public let input: String?
    public let modelSample: String?
    public let referenceAnswer: String?


    public init(grader: String? = nil, input: String? = nil, modelSample: String? = nil, referenceAnswer: String? = nil) {
        self.grader = grader
        self.input = input
        self.modelSample = modelSample
        self.referenceAnswer = referenceAnswer
    }
}

public struct OpenAiFineTuningGraderRunResult: Codable {
    public let details: String?
    public let feedback: String?
    public let passed: Bool?
    public let score: Double?


    public init(details: String? = nil, feedback: String? = nil, passed: Bool? = nil, score: Double? = nil) {
        self.details = details
        self.feedback = feedback
        self.passed = passed
        self.score = score
    }
}

public struct OpenAiFineTuningGraderValidateRequest: Codable {
    public let grader: String?


    public init(grader: String? = nil) {
        self.grader = grader
    }
}

public struct OpenAiFineTuningGraderValidationResult: Codable {
    public let errors: [String]?
    public let valid: Bool?
    public let warnings: [String]?


    public init(errors: [String]? = nil, valid: Bool? = nil, warnings: [String]? = nil) {
        self.errors = errors
        self.valid = valid
        self.warnings = warnings
    }
}

public struct OpenAiFineTuningJob: Codable {
    public let createdAt: Int?
    public let error: String?
    public let fineTunedModel: String?
    public let finishedAt: Int?
    public let hyperparameters: String?
    public let id: String?
    public let metadata: [String: String]?
    public let model: String?
    public let object: String?
    public let organizationId: String?
    public let resultFiles: [String]?
    public let status: String?
    public let trainedTokens: Int?
    public let trainingFile: String?
    public let validationFile: String?


    public init(createdAt: Int? = nil, error: String? = nil, fineTunedModel: String? = nil, finishedAt: Int? = nil, hyperparameters: String? = nil, id: String? = nil, metadata: [String: String]? = nil, model: String? = nil, object: String? = nil, organizationId: String? = nil, resultFiles: [String]? = nil, status: String? = nil, trainedTokens: Int? = nil, trainingFile: String? = nil, validationFile: String? = nil) {
        self.createdAt = createdAt
        self.error = error
        self.fineTunedModel = fineTunedModel
        self.finishedAt = finishedAt
        self.hyperparameters = hyperparameters
        self.id = id
        self.metadata = metadata
        self.model = model
        self.object = object
        self.organizationId = organizationId
        self.resultFiles = resultFiles
        self.status = status
        self.trainedTokens = trainedTokens
        self.trainingFile = trainingFile
        self.validationFile = validationFile
    }
}

public struct OpenAiFineTuningJobCheckpoint: Codable {
    public let createdAt: Int?
    public let fineTunedModelCheckpoint: String?
    public let fineTuningJobId: String?
    public let id: String?
    public let metrics: String?
    public let object: String?
    public let stepNumber: Int?


    public init(createdAt: Int? = nil, fineTunedModelCheckpoint: String? = nil, fineTuningJobId: String? = nil, id: String? = nil, metrics: String? = nil, object: String? = nil, stepNumber: Int? = nil) {
        self.createdAt = createdAt
        self.fineTunedModelCheckpoint = fineTunedModelCheckpoint
        self.fineTuningJobId = fineTuningJobId
        self.id = id
        self.metrics = metrics
        self.object = object
        self.stepNumber = stepNumber
    }
}

public struct OpenAiFineTuningJobCheckpointList: Codable {
    public let data: [OpenAiFineTuningJobCheckpoint]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiFineTuningJobCheckpoint]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiFineTuningJobCreateRequest: Codable {
    public let hyperparameters: String?
    public let integrations: [String]?
    public let metadata: [String: String]?
    public let model: String?
    public let seed: Int?
    public let suffix: String?
    public let trainingFile: String?
    public let validationFile: String?


    public init(hyperparameters: String? = nil, integrations: [String]? = nil, metadata: [String: String]? = nil, model: String? = nil, seed: Int? = nil, suffix: String? = nil, trainingFile: String? = nil, validationFile: String? = nil) {
        self.hyperparameters = hyperparameters
        self.integrations = integrations
        self.metadata = metadata
        self.model = model
        self.seed = seed
        self.suffix = suffix
        self.trainingFile = trainingFile
        self.validationFile = validationFile
    }
}

public struct OpenAiFineTuningJobEvent: Codable {
    public let createdAt: Int?
    public let data: String?
    public let id: String?
    public let level: String?
    public let message: String?
    public let object: String?
    public let type: String?


    public init(createdAt: Int? = nil, data: String? = nil, id: String? = nil, level: String? = nil, message: String? = nil, object: String? = nil, type: String? = nil) {
        self.createdAt = createdAt
        self.data = data
        self.id = id
        self.level = level
        self.message = message
        self.object = object
        self.type = type
    }
}

public struct OpenAiFineTuningJobEventList: Codable {
    public let data: [OpenAiFineTuningJobEvent]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiFineTuningJobEvent]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiFineTuningJobList: Codable {
    public let data: [OpenAiFineTuningJob]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiFineTuningJob]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiFunctionCall: Codable {
    public let arguments: String?
    public let name: String?


    public init(arguments: String? = nil, name: String? = nil) {
        self.arguments = arguments
        self.name = name
    }
}

public struct OpenAiFunctionCallChoice: Codable {

    public init() {}
}

public struct OpenAiFunctionDefinition: Codable {
    public let description: String?
    public let name: String?
    public let parameters: OpenAiJsonSchema?
    public let strict: Bool?


    public init(description: String? = nil, name: String? = nil, parameters: OpenAiJsonSchema? = nil, strict: Bool? = nil) {
        self.description = description
        self.name = name
        self.parameters = parameters
        self.strict = strict
    }
}

public struct OpenAiImage: Codable {
    public let b64Json: String?
    public let mimeType: String?
    public let revisedPrompt: String?
    public let url: String?


    public init(b64Json: String? = nil, mimeType: String? = nil, revisedPrompt: String? = nil, url: String? = nil) {
        self.b64Json = b64Json
        self.mimeType = mimeType
        self.revisedPrompt = revisedPrompt
        self.url = url
    }
}

public struct OpenAiImageEditMultipartRequest: Codable {
    public let image: String?
    public let mask: String?
    public let model: String?
    public let prompt: String?


    public init(image: String? = nil, mask: String? = nil, model: String? = nil, prompt: String? = nil) {
        self.image = image
        self.mask = mask
        self.model = model
        self.prompt = prompt
    }
}

public struct OpenAiImageEditRequest: Codable {
    public let image: OpenAiImageReferenceInputList?
    public let mask: OpenAiImageReferenceInput?
    public let model: String?
    public let prompt: String?


    public init(image: OpenAiImageReferenceInputList? = nil, mask: OpenAiImageReferenceInput? = nil, model: String? = nil, prompt: String? = nil) {
        self.image = image
        self.mask = mask
        self.model = model
        self.prompt = prompt
    }
}

public struct OpenAiImageGenerationRequest: Codable {
    public let model: String?
    public let prompt: String?
    public let quality: String?
    public let responseFormat: String?
    public let size: String?


    public init(model: String? = nil, prompt: String? = nil, quality: String? = nil, responseFormat: String? = nil, size: String? = nil) {
        self.model = model
        self.prompt = prompt
        self.quality = quality
        self.responseFormat = responseFormat
        self.size = size
    }
}

public struct OpenAiImageList: Codable {
    public let created: Int?
    public let data: [OpenAiImage]?
    public let usage: OpenAiTokenUsage?


    public init(created: Int? = nil, data: [OpenAiImage]? = nil, usage: OpenAiTokenUsage? = nil) {
        self.created = created
        self.data = data
        self.usage = usage
    }
}

public struct OpenAiImageReferenceInput: Codable {

    public init() {}
}

public struct OpenAiImageReferenceInputList: Codable {

    public init() {}
}

public struct OpenAiImageReferenceObject: Codable {
    public let b64Json: String?
    public let detail: String?
    public let fileId: String?
    public let mimeType: String?
    public let url: String?


    public init(b64Json: String? = nil, detail: String? = nil, fileId: String? = nil, mimeType: String? = nil, url: String? = nil) {
        self.b64Json = b64Json
        self.detail = detail
        self.fileId = fileId
        self.mimeType = mimeType
        self.url = url
    }
}

public struct OpenAiImageVariationMultipartRequest: Codable {
    public let image: String?
    public let model: String?
    public let size: String?


    public init(image: String? = nil, model: String? = nil, size: String? = nil) {
        self.image = image
        self.model = model
        self.size = size
    }
}

public struct OpenAiImageVariationRequest: Codable {
    public let image: OpenAiImageReferenceInput?
    public let model: String?
    public let size: String?


    public init(image: OpenAiImageReferenceInput? = nil, model: String? = nil, size: String? = nil) {
        self.image = image
        self.model = model
        self.size = size
    }
}

public struct OpenAiIncompleteDetails: Codable {
    public let reason: String?


    public init(reason: String? = nil) {
        self.reason = reason
    }
}

public struct OpenAiJsonSchema: Codable {
    public let additionalProperties: Bool?
    public let description: String?
    public let enum_: [String]?
    public let items: Any?
    public let properties: [String: Any]?
    public let required_: [String]?
    public let type: String?


    public init(additionalProperties: Bool? = nil, description: String? = nil, enum_: [String]? = nil, items: Any? = nil, properties: [String: Any]? = nil, required_: [String]? = nil, type: String? = nil) {
        self.additionalProperties = additionalProperties
        self.description = description
        self.enum_ = enum_
        self.items = items
        self.properties = properties
        self.required_ = required_
        self.type = type
    }
}

public struct OpenAiJsonSchemaFormat: Codable {
    public let description: String?
    public let name: String?
    public let schema: OpenAiJsonSchema?
    public let strict: Bool?


    public init(description: String? = nil, name: String? = nil, schema: OpenAiJsonSchema? = nil, strict: Bool? = nil) {
        self.description = description
        self.name = name
        self.schema = schema
        self.strict = strict
    }
}

public struct OpenAiModel: Codable {
    public let created: Int?
    public let id: String?
    public let object: String?
    public let ownedBy: String?


    public init(created: Int? = nil, id: String? = nil, object: String? = nil, ownedBy: String? = nil) {
        self.created = created
        self.id = id
        self.object = object
        self.ownedBy = ownedBy
    }
}

public struct OpenAiModelList: Codable {
    public let data: [OpenAiModel]?
    public let object: String?


    public init(data: [OpenAiModel]? = nil, object: String? = nil) {
        self.data = data
        self.object = object
    }
}

public struct OpenAiModeration: Codable {
    public let id: String?
    public let model: String?
    public let results: [OpenAiModerationResult]?


    public init(id: String? = nil, model: String? = nil, results: [OpenAiModerationResult]? = nil) {
        self.id = id
        self.model = model
        self.results = results
    }
}

public struct OpenAiModerationCreateRequest: Codable {
    public let input: String?
    public let model: String?


    public init(input: String? = nil, model: String? = nil) {
        self.input = input
        self.model = model
    }
}

public struct OpenAiModerationResult: Codable {
    public let categories: [String: String]?
    public let categoryScores: [String: Double]?
    public let flagged: Bool?


    public init(categories: [String: String]? = nil, categoryScores: [String: Double]? = nil, flagged: Bool? = nil) {
        self.categories = categories
        self.categoryScores = categoryScores
        self.flagged = flagged
    }
}

public struct OpenAiNamedFunctionChoice: Codable {
    public let name: String?


    public init(name: String? = nil) {
        self.name = name
    }
}

public struct OpenAiNamedToolChoice: Codable {
    public let function: OpenAiNamedToolChoiceFunction?
    public let type: String?


    public init(function: OpenAiNamedToolChoiceFunction? = nil, type: String? = nil) {
        self.function = function
        self.type = type
    }
}

public struct OpenAiNamedToolChoiceFunction: Codable {
    public let name: String?


    public init(name: String? = nil) {
        self.name = name
    }
}

public struct OpenAiOrganizationAdminApiKey: Codable {
    public let createdAt: Int?
    public let id: String?
    public let lastUsedAt: Int?
    public let name: String?
    public let object: String?
    public let owner: String?
    public let redactedValue: String?
    public let value: String?


    public init(createdAt: Int? = nil, id: String? = nil, lastUsedAt: Int? = nil, name: String? = nil, object: String? = nil, owner: String? = nil, redactedValue: String? = nil, value: String? = nil) {
        self.createdAt = createdAt
        self.id = id
        self.lastUsedAt = lastUsedAt
        self.name = name
        self.object = object
        self.owner = owner
        self.redactedValue = redactedValue
        self.value = value
    }
}

public struct OpenAiOrganizationAdminApiKeyCreateRequest: Codable {
    public let name: String?


    public init(name: String? = nil) {
        self.name = name
    }
}

public struct OpenAiOrganizationAdminApiKeyList: Codable {
    public let data: [OpenAiOrganizationAdminApiKey]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiOrganizationAdminApiKey]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiOrganizationAuditLog: Codable {
    public let actor_: String?
    public let apiKeyId: String?
    public let effectiveAt: Int?
    public let id: String?
    public let metadata: [String: String]?
    public let object: String?
    public let project: String?
    public let request: String?
    public let type: String?


    public init(actor_: String? = nil, apiKeyId: String? = nil, effectiveAt: Int? = nil, id: String? = nil, metadata: [String: String]? = nil, object: String? = nil, project: String? = nil, request: String? = nil, type: String? = nil) {
        self.actor_ = actor_
        self.apiKeyId = apiKeyId
        self.effectiveAt = effectiveAt
        self.id = id
        self.metadata = metadata
        self.object = object
        self.project = project
        self.request = request
        self.type = type
    }
}

public struct OpenAiOrganizationAuditLogList: Codable {
    public let data: [OpenAiOrganizationAuditLog]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiOrganizationAuditLog]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiOrganizationCostBucket: Codable {
    public let amount: Double?
    public let currency: String?
    public let endTime: Int?
    public let object: String?
    public let results: [String]?
    public let startTime: Int?


    public init(amount: Double? = nil, currency: String? = nil, endTime: Int? = nil, object: String? = nil, results: [String]? = nil, startTime: Int? = nil) {
        self.amount = amount
        self.currency = currency
        self.endTime = endTime
        self.object = object
        self.results = results
        self.startTime = startTime
    }
}

public struct OpenAiOrganizationCostList: Codable {
    public let data: [OpenAiOrganizationCostBucket]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiOrganizationCostBucket]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiOrganizationGroup: Codable {
    public let createdAt: Int?
    public let description: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?


    public init(createdAt: Int? = nil, description: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil) {
        self.createdAt = createdAt
        self.description = description
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
    }
}

public struct OpenAiOrganizationGroupCreateRequest: Codable {
    public let description: String?
    public let metadata: [String: String]?
    public let name: String?


    public init(description: String? = nil, metadata: [String: String]? = nil, name: String? = nil) {
        self.description = description
        self.metadata = metadata
        self.name = name
    }
}

public struct OpenAiOrganizationGroupList: Codable {
    public let data: [OpenAiOrganizationGroup]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiOrganizationGroup]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiOrganizationGroupUpdateRequest: Codable {
    public let description: String?
    public let metadata: [String: String]?
    public let name: String?


    public init(description: String? = nil, metadata: [String: String]? = nil, name: String? = nil) {
        self.description = description
        self.metadata = metadata
        self.name = name
    }
}

public struct OpenAiOrganizationGroupUserCreateRequest: Codable {
    public let userId: String?


    public init(userId: String? = nil) {
        self.userId = userId
    }
}

public struct OpenAiOrganizationInvite: Codable {
    public let createdAt: Int?
    public let email: String?
    public let expiresAt: Int?
    public let id: String?
    public let object: String?
    public let projects: [String]?
    public let role: String?
    public let status: String?


    public init(createdAt: Int? = nil, email: String? = nil, expiresAt: Int? = nil, id: String? = nil, object: String? = nil, projects: [String]? = nil, role: String? = nil, status: String? = nil) {
        self.createdAt = createdAt
        self.email = email
        self.expiresAt = expiresAt
        self.id = id
        self.object = object
        self.projects = projects
        self.role = role
        self.status = status
    }
}

public struct OpenAiOrganizationInviteCreateRequest: Codable {
    public let email: String?
    public let projects: [String]?
    public let role: String?


    public init(email: String? = nil, projects: [String]? = nil, role: String? = nil) {
        self.email = email
        self.projects = projects
        self.role = role
    }
}

public struct OpenAiOrganizationInviteList: Codable {
    public let data: [OpenAiOrganizationInvite]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiOrganizationInvite]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiOrganizationUsageBucket: Codable {
    public let endTime: Int?
    public let inputTokens: Int?
    public let numRequests: Int?
    public let object: String?
    public let outputTokens: Int?
    public let results: [String]?
    public let startTime: Int?


    public init(endTime: Int? = nil, inputTokens: Int? = nil, numRequests: Int? = nil, object: String? = nil, outputTokens: Int? = nil, results: [String]? = nil, startTime: Int? = nil) {
        self.endTime = endTime
        self.inputTokens = inputTokens
        self.numRequests = numRequests
        self.object = object
        self.outputTokens = outputTokens
        self.results = results
        self.startTime = startTime
    }
}

public struct OpenAiOrganizationUsageList: Codable {
    public let data: [OpenAiOrganizationUsageBucket]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiOrganizationUsageBucket]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiOrganizationUser: Codable {
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let role: String?
    public let status: String?


    public init(createdAt: Int? = nil, email: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, role: String? = nil, status: String? = nil) {
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.role = role
        self.status = status
    }
}

public struct OpenAiOrganizationUserList: Codable {
    public let data: [OpenAiOrganizationUser]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiOrganizationUser]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiOrganizationUserUpdateRequest: Codable {
    public let metadata: [String: String]?
    public let role: String?


    public init(metadata: [String: String]? = nil, role: String? = nil) {
        self.metadata = metadata
        self.role = role
    }
}

public struct OpenAiPredictionConfig: Codable {
    public let content: String?
    public let type: String?


    public init(content: String? = nil, type: String? = nil) {
        self.content = content
        self.type = type
    }
}

public struct OpenAiProject: Codable {
    public let archivedAt: Int?
    public let createdAt: Int?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let status: String?


    public init(archivedAt: Int? = nil, createdAt: Int? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, status: String? = nil) {
        self.archivedAt = archivedAt
        self.createdAt = createdAt
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.status = status
    }
}

public struct OpenAiProjectApiKey: Codable {
    public let createdAt: Int?
    public let id: String?
    public let lastUsedAt: Int?
    public let name: String?
    public let object: String?
    public let owner: String?
    public let redactedValue: String?


    public init(createdAt: Int? = nil, id: String? = nil, lastUsedAt: Int? = nil, name: String? = nil, object: String? = nil, owner: String? = nil, redactedValue: String? = nil) {
        self.createdAt = createdAt
        self.id = id
        self.lastUsedAt = lastUsedAt
        self.name = name
        self.object = object
        self.owner = owner
        self.redactedValue = redactedValue
    }
}

public struct OpenAiProjectApiKeyList: Codable {
    public let data: [OpenAiProjectApiKey]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiProjectApiKey]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiProjectCreateRequest: Codable {
    public let metadata: [String: String]?
    public let name: String?


    public init(metadata: [String: String]? = nil, name: String? = nil) {
        self.metadata = metadata
        self.name = name
    }
}

public struct OpenAiProjectGroupCreateRequest: Codable {
    public let groupId: String?


    public init(groupId: String? = nil) {
        self.groupId = groupId
    }
}

public struct OpenAiProjectList: Codable {
    public let data: [OpenAiProject]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiProject]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiProjectRateLimit: Codable {
    public let batch1DayMaxInputTokens: Int?
    public let id: String?
    public let maxImagesPer1Minute: Int?
    public let maxRequestsPer1Minute: Int?
    public let maxTokensPer1Minute: Int?
    public let model: String?
    public let object: String?


    public init(batch1DayMaxInputTokens: Int? = nil, id: String? = nil, maxImagesPer1Minute: Int? = nil, maxRequestsPer1Minute: Int? = nil, maxTokensPer1Minute: Int? = nil, model: String? = nil, object: String? = nil) {
        self.batch1DayMaxInputTokens = batch1DayMaxInputTokens
        self.id = id
        self.maxImagesPer1Minute = maxImagesPer1Minute
        self.maxRequestsPer1Minute = maxRequestsPer1Minute
        self.maxTokensPer1Minute = maxTokensPer1Minute
        self.model = model
        self.object = object
    }
}

public struct OpenAiProjectRateLimitList: Codable {
    public let data: [OpenAiProjectRateLimit]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiProjectRateLimit]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiProjectRateLimitUpdateRequest: Codable {
    public let batch1DayMaxInputTokens: Int?
    public let maxImagesPer1Minute: Int?
    public let maxRequestsPer1Minute: Int?
    public let maxTokensPer1Minute: Int?


    public init(batch1DayMaxInputTokens: Int? = nil, maxImagesPer1Minute: Int? = nil, maxRequestsPer1Minute: Int? = nil, maxTokensPer1Minute: Int? = nil) {
        self.batch1DayMaxInputTokens = batch1DayMaxInputTokens
        self.maxImagesPer1Minute = maxImagesPer1Minute
        self.maxRequestsPer1Minute = maxRequestsPer1Minute
        self.maxTokensPer1Minute = maxTokensPer1Minute
    }
}

public struct OpenAiProjectServiceAccount: Codable {
    public let apiKey: OpenAiProjectApiKey?
    public let createdAt: Int?
    public let id: String?
    public let name: String?
    public let object: String?
    public let role: String?


    public init(apiKey: OpenAiProjectApiKey? = nil, createdAt: Int? = nil, id: String? = nil, name: String? = nil, object: String? = nil, role: String? = nil) {
        self.apiKey = apiKey
        self.createdAt = createdAt
        self.id = id
        self.name = name
        self.object = object
        self.role = role
    }
}

public struct OpenAiProjectServiceAccountCreateRequest: Codable {
    public let name: String?
    public let role: String?


    public init(name: String? = nil, role: String? = nil) {
        self.name = name
        self.role = role
    }
}

public struct OpenAiProjectServiceAccountList: Codable {
    public let data: [OpenAiProjectServiceAccount]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiProjectServiceAccount]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiProjectUpdateRequest: Codable {
    public let metadata: [String: String]?
    public let name: String?


    public init(metadata: [String: String]? = nil, name: String? = nil) {
        self.metadata = metadata
        self.name = name
    }
}

public struct OpenAiProjectUser: Codable {
    public let createdAt: Int?
    public let email: String?
    public let id: String?
    public let name: String?
    public let object: String?
    public let role: String?


    public init(createdAt: Int? = nil, email: String? = nil, id: String? = nil, name: String? = nil, object: String? = nil, role: String? = nil) {
        self.createdAt = createdAt
        self.email = email
        self.id = id
        self.name = name
        self.object = object
        self.role = role
    }
}

public struct OpenAiProjectUserCreateRequest: Codable {
    public let role: String?
    public let userId: String?


    public init(role: String? = nil, userId: String? = nil) {
        self.role = role
        self.userId = userId
    }
}

public struct OpenAiProjectUserList: Codable {
    public let data: [OpenAiProjectUser]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiProjectUser]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiProjectUserUpdateRequest: Codable {
    public let role: String?


    public init(role: String? = nil) {
        self.role = role
    }
}

public struct OpenAiPromptReference: Codable {
    public let id: String?
    public let variables: [String: String]?
    public let version: String?


    public init(id: String? = nil, variables: [String: String]? = nil, version: String? = nil) {
        self.id = id
        self.variables = variables
        self.version = version
    }
}

public struct OpenAiPromptTokensDetails: Codable {
    public let audioTokens: Int?
    public let cachedTokens: Int?


    public init(audioTokens: Int? = nil, cachedTokens: Int? = nil) {
        self.audioTokens = audioTokens
        self.cachedTokens = cachedTokens
    }
}

public struct OpenAiRealtimeCall: Codable {
    public let createdAt: Int?
    public let id: String?
    public let metadata: [String: String]?
    public let object: String?
    public let sdp: String?
    public let session: String?
    public let status: String?


    public init(createdAt: Int? = nil, id: String? = nil, metadata: [String: String]? = nil, object: String? = nil, sdp: String? = nil, session: String? = nil, status: String? = nil) {
        self.createdAt = createdAt
        self.id = id
        self.metadata = metadata
        self.object = object
        self.sdp = sdp
        self.session = session
        self.status = status
    }
}

public struct OpenAiRealtimeCallActionRequest: Codable {
    public let metadata: [String: String]?


    public init(metadata: [String: String]? = nil) {
        self.metadata = metadata
    }
}

public struct OpenAiRealtimeCallCreateRequest: Codable {
    public let metadata: [String: String]?
    public let sdp: String?
    public let session: String?


    public init(metadata: [String: String]? = nil, sdp: String? = nil, session: String? = nil) {
        self.metadata = metadata
        self.sdp = sdp
        self.session = session
    }
}

public struct OpenAiRealtimeCallMultipartRequest: Codable {
    public let sdp: String?
    public let session: String?


    public init(sdp: String? = nil, session: String? = nil) {
        self.sdp = sdp
        self.session = session
    }
}

public struct OpenAiRealtimeCallReferRequest: Codable {
    public let metadata: [String: String]?
    public let target: String?


    public init(metadata: [String: String]? = nil, target: String? = nil) {
        self.metadata = metadata
        self.target = target
    }
}

public struct OpenAiRealtimeClientSecret: Codable {
    public let clientSecret: OpenAiRealtimeClientSecretValue?
    public let session: String?


    public init(clientSecret: OpenAiRealtimeClientSecretValue? = nil, session: String? = nil) {
        self.clientSecret = clientSecret
        self.session = session
    }
}

public struct OpenAiRealtimeClientSecretCreateRequest: Codable {
    public let instructions: String?
    public let metadata: [String: String]?
    public let modalities: [String]?
    public let model: String?
    public let voice: String?


    public init(instructions: String? = nil, metadata: [String: String]? = nil, modalities: [String]? = nil, model: String? = nil, voice: String? = nil) {
        self.instructions = instructions
        self.metadata = metadata
        self.modalities = modalities
        self.model = model
        self.voice = voice
    }
}

public struct OpenAiRealtimeClientSecretValue: Codable {
    public let expiresAt: Int?
    public let value: String?


    public init(expiresAt: Int? = nil, value: String? = nil) {
        self.expiresAt = expiresAt
        self.value = value
    }
}

public struct OpenAiRealtimeSession: Codable {
    public let clientSecret: OpenAiRealtimeClientSecretValue?
    public let id: String?
    public let instructions: String?
    public let modalities: [String]?
    public let model: String?
    public let object: String?
    public let voice: String?


    public init(clientSecret: OpenAiRealtimeClientSecretValue? = nil, id: String? = nil, instructions: String? = nil, modalities: [String]? = nil, model: String? = nil, object: String? = nil, voice: String? = nil) {
        self.clientSecret = clientSecret
        self.id = id
        self.instructions = instructions
        self.modalities = modalities
        self.model = model
        self.object = object
        self.voice = voice
    }
}

public struct OpenAiRealtimeSessionCreateRequest: Codable {
    public let instructions: String?
    public let metadata: [String: String]?
    public let modalities: [String]?
    public let model: String?
    public let voice: String?


    public init(instructions: String? = nil, metadata: [String: String]? = nil, modalities: [String]? = nil, model: String? = nil, voice: String? = nil) {
        self.instructions = instructions
        self.metadata = metadata
        self.modalities = modalities
        self.model = model
        self.voice = voice
    }
}

public struct OpenAiRealtimeTranscriptionSession: Codable {
    public let clientSecret: OpenAiRealtimeClientSecretValue?
    public let id: String?
    public let inputAudioFormat: String?
    public let inputAudioTranscription: String?
    public let object: String?


    public init(clientSecret: OpenAiRealtimeClientSecretValue? = nil, id: String? = nil, inputAudioFormat: String? = nil, inputAudioTranscription: String? = nil, object: String? = nil) {
        self.clientSecret = clientSecret
        self.id = id
        self.inputAudioFormat = inputAudioFormat
        self.inputAudioTranscription = inputAudioTranscription
        self.object = object
    }
}

public struct OpenAiRealtimeTranscriptionSessionCreateRequest: Codable {
    public let inputAudioFormat: String?
    public let inputAudioTranscription: String?
    public let metadata: [String: String]?
    public let model: String?
    public let turnDetection: String?


    public init(inputAudioFormat: String? = nil, inputAudioTranscription: String? = nil, metadata: [String: String]? = nil, model: String? = nil, turnDetection: String? = nil) {
        self.inputAudioFormat = inputAudioFormat
        self.inputAudioTranscription = inputAudioTranscription
        self.metadata = metadata
        self.model = model
        self.turnDetection = turnDetection
    }
}

public struct OpenAiRealtimeTranslationSession: Codable {
    public let clientSecret: OpenAiRealtimeClientSecretValue?
    public let id: String?
    public let object: String?
    public let sourceLanguage: String?
    public let targetLanguage: String?


    public init(clientSecret: OpenAiRealtimeClientSecretValue? = nil, id: String? = nil, object: String? = nil, sourceLanguage: String? = nil, targetLanguage: String? = nil) {
        self.clientSecret = clientSecret
        self.id = id
        self.object = object
        self.sourceLanguage = sourceLanguage
        self.targetLanguage = targetLanguage
    }
}

public struct OpenAiRealtimeTranslationSessionCreateRequest: Codable {
    public let metadata: [String: String]?
    public let model: String?
    public let sourceLanguage: String?
    public let targetLanguage: String?


    public init(metadata: [String: String]? = nil, model: String? = nil, sourceLanguage: String? = nil, targetLanguage: String? = nil) {
        self.metadata = metadata
        self.model = model
        self.sourceLanguage = sourceLanguage
        self.targetLanguage = targetLanguage
    }
}

public struct OpenAiReasoningConfig: Codable {
    public let effort: String?
    public let summary: String?


    public init(effort: String? = nil, summary: String? = nil) {
        self.effort = effort
        self.summary = summary
    }
}

public struct OpenAiResponse: Codable {
    public let createdAt: Int?
    public let error: OpenAiResponseError?
    public let id: String?
    public let incompleteDetails: OpenAiIncompleteDetails?
    public let model: String?
    public let object: String?
    public let output: [OpenAiResponseOutputItem]?
    public let outputText: String?
    public let status: String?
    public let usage: OpenAiResponseUsage?


    public init(createdAt: Int? = nil, error: OpenAiResponseError? = nil, id: String? = nil, incompleteDetails: OpenAiIncompleteDetails? = nil, model: String? = nil, object: String? = nil, output: [OpenAiResponseOutputItem]? = nil, outputText: String? = nil, status: String? = nil, usage: OpenAiResponseUsage? = nil) {
        self.createdAt = createdAt
        self.error = error
        self.id = id
        self.incompleteDetails = incompleteDetails
        self.model = model
        self.object = object
        self.output = output
        self.outputText = outputText
        self.status = status
        self.usage = usage
    }
}

public struct OpenAiResponseCompactRequest: Codable {
    public let input: String?
    public let metadata: [String: String]?
    public let model: String?
    public let previousResponseId: String?


    public init(input: String? = nil, metadata: [String: String]? = nil, model: String? = nil, previousResponseId: String? = nil) {
        self.input = input
        self.metadata = metadata
        self.model = model
        self.previousResponseId = previousResponseId
    }
}

public struct OpenAiResponseError: Codable {
    public let code: String?
    public let message: String?
    public let param: String?
    public let type: String?


    public init(code: String? = nil, message: String? = nil, param: String? = nil, type: String? = nil) {
        self.code = code
        self.message = message
        self.param = param
        self.type = type
    }
}

public struct OpenAiResponseFormat: Codable {
    public let jsonSchema: OpenAiJsonSchemaFormat?
    public let type: String?


    public init(jsonSchema: OpenAiJsonSchemaFormat? = nil, type: String? = nil) {
        self.jsonSchema = jsonSchema
        self.type = type
    }
}

public struct OpenAiResponseInputContentPart: Codable {
    public let detail: String?
    public let fileData: String?
    public let fileId: String?
    public let filename: String?
    public let imageUrl: String?
    public let text: String?
    public let type: String?


    public init(detail: String? = nil, fileData: String? = nil, fileId: String? = nil, filename: String? = nil, imageUrl: String? = nil, text: String? = nil, type: String? = nil) {
        self.detail = detail
        self.fileData = fileData
        self.fileId = fileId
        self.filename = filename
        self.imageUrl = imageUrl
        self.text = text
        self.type = type
    }
}

public struct OpenAiResponseInputItem: Codable {
    public let content: String?
    public let id: String?
    public let role: String?
    public let status: String?
    public let type: String?


    public init(content: String? = nil, id: String? = nil, role: String? = nil, status: String? = nil, type: String? = nil) {
        self.content = content
        self.id = id
        self.role = role
        self.status = status
        self.type = type
    }
}

public struct OpenAiResponseInputItemList: Codable {
    public let data: [OpenAiResponseInputItem]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiResponseInputItem]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiResponseInputTokenCount: Codable {
    public let inputTokens: Int?
    public let inputTokensDetails: OpenAiResponseInputTokensDetails?
    public let model: String?
    public let object: String?


    public init(inputTokens: Int? = nil, inputTokensDetails: OpenAiResponseInputTokensDetails? = nil, model: String? = nil, object: String? = nil) {
        self.inputTokens = inputTokens
        self.inputTokensDetails = inputTokensDetails
        self.model = model
        self.object = object
    }
}

public struct OpenAiResponseInputTokenCountRequest: Codable {
    public let input: String?
    public let instructions: String?
    public let model: String?
    public let tools: [String]?


    public init(input: String? = nil, instructions: String? = nil, model: String? = nil, tools: [String]? = nil) {
        self.input = input
        self.instructions = instructions
        self.model = model
        self.tools = tools
    }
}

public struct OpenAiResponseInputTokensDetails: Codable {
    public let cachedTokens: Int?


    public init(cachedTokens: Int? = nil) {
        self.cachedTokens = cachedTokens
    }
}

public struct OpenAiResponseOutputContent: Codable {
    public let annotations: [OpenAiAnnotation]?
    public let refusal: String?
    public let text: String?
    public let type: String?


    public init(annotations: [OpenAiAnnotation]? = nil, refusal: String? = nil, text: String? = nil, type: String? = nil) {
        self.annotations = annotations
        self.refusal = refusal
        self.text = text
        self.type = type
    }
}

public struct OpenAiResponseOutputItem: Codable {
    public let content: [OpenAiResponseOutputContent]?
    public let id: String?
    public let role: String?
    public let status: String?
    public let type: String?


    public init(content: [OpenAiResponseOutputContent]? = nil, id: String? = nil, role: String? = nil, status: String? = nil, type: String? = nil) {
        self.content = content
        self.id = id
        self.role = role
        self.status = status
        self.type = type
    }
}

public struct OpenAiResponseOutputTokensDetails: Codable {
    public let reasoningTokens: Int?


    public init(reasoningTokens: Int? = nil) {
        self.reasoningTokens = reasoningTokens
    }
}

public struct OpenAiResponseUsage: Codable {
    public let inputTokens: Int?
    public let inputTokensDetails: OpenAiResponseInputTokensDetails?
    public let outputTokens: Int?
    public let outputTokensDetails: OpenAiResponseOutputTokensDetails?
    public let totalTokens: Int?


    public init(inputTokens: Int? = nil, inputTokensDetails: OpenAiResponseInputTokensDetails? = nil, outputTokens: Int? = nil, outputTokensDetails: OpenAiResponseOutputTokensDetails? = nil, totalTokens: Int? = nil) {
        self.inputTokens = inputTokens
        self.inputTokensDetails = inputTokensDetails
        self.outputTokens = outputTokens
        self.outputTokensDetails = outputTokensDetails
        self.totalTokens = totalTokens
    }
}

public struct OpenAiResponsesRequest: Codable {
    public let background: Bool?
    public let conversation: String?
    public let include: [String]?
    public let input: String?
    public let instructions: String?
    public let maxOutputTokens: Int?
    public let maxToolCalls: Int?
    public let metadata: [String: String]?
    public let model: String?
    public let parallelToolCalls: Bool?
    public let previousResponseId: String?
    public let prompt: OpenAiPromptReference?
    public let promptCacheKey: String?
    public let reasoning: OpenAiReasoningConfig?
    public let serviceTier: String?
    public let store: Bool?
    public let stream: Bool?
    public let temperature: Double?
    public let text: OpenAiTextConfig?
    public let toolChoice: OpenAiToolChoice?
    public let tools: [OpenAiTool]?
    public let topLogprobs: Int?
    public let topP: Double?
    public let truncation: String?
    public let user: String?


    public init(background: Bool? = nil, conversation: String? = nil, include: [String]? = nil, input: String? = nil, instructions: String? = nil, maxOutputTokens: Int? = nil, maxToolCalls: Int? = nil, metadata: [String: String]? = nil, model: String? = nil, parallelToolCalls: Bool? = nil, previousResponseId: String? = nil, prompt: OpenAiPromptReference? = nil, promptCacheKey: String? = nil, reasoning: OpenAiReasoningConfig? = nil, serviceTier: String? = nil, store: Bool? = nil, stream: Bool? = nil, temperature: Double? = nil, text: OpenAiTextConfig? = nil, toolChoice: OpenAiToolChoice? = nil, tools: [OpenAiTool]? = nil, topLogprobs: Int? = nil, topP: Double? = nil, truncation: String? = nil, user: String? = nil) {
        self.background = background
        self.conversation = conversation
        self.include = include
        self.input = input
        self.instructions = instructions
        self.maxOutputTokens = maxOutputTokens
        self.maxToolCalls = maxToolCalls
        self.metadata = metadata
        self.model = model
        self.parallelToolCalls = parallelToolCalls
        self.previousResponseId = previousResponseId
        self.prompt = prompt
        self.promptCacheKey = promptCacheKey
        self.reasoning = reasoning
        self.serviceTier = serviceTier
        self.store = store
        self.stream = stream
        self.temperature = temperature
        self.text = text
        self.toolChoice = toolChoice
        self.tools = tools
        self.topLogprobs = topLogprobs
        self.topP = topP
        self.truncation = truncation
        self.user = user
    }
}

public struct OpenAiRole: Codable {
    public let createdAt: Int?
    public let description: String?
    public let id: String?
    public let name: String?
    public let object: String?
    public let permissions: [String]?


    public init(createdAt: Int? = nil, description: String? = nil, id: String? = nil, name: String? = nil, object: String? = nil, permissions: [String]? = nil) {
        self.createdAt = createdAt
        self.description = description
        self.id = id
        self.name = name
        self.object = object
        self.permissions = permissions
    }
}

public struct OpenAiRoleAssignment: Codable {
    public let createdAt: Int?
    public let groupId: String?
    public let id: String?
    public let object: String?
    public let projectId: String?
    public let roleId: String?
    public let userId: String?


    public init(createdAt: Int? = nil, groupId: String? = nil, id: String? = nil, object: String? = nil, projectId: String? = nil, roleId: String? = nil, userId: String? = nil) {
        self.createdAt = createdAt
        self.groupId = groupId
        self.id = id
        self.object = object
        self.projectId = projectId
        self.roleId = roleId
        self.userId = userId
    }
}

public struct OpenAiRoleAssignmentCreateRequest: Codable {
    public let roleId: String?


    public init(roleId: String? = nil) {
        self.roleId = roleId
    }
}

public struct OpenAiRoleAssignmentList: Codable {
    public let data: [OpenAiRoleAssignment]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiRoleAssignment]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiRoleCreateRequest: Codable {
    public let description: String?
    public let name: String?
    public let permissions: [String]?


    public init(description: String? = nil, name: String? = nil, permissions: [String]? = nil) {
        self.description = description
        self.name = name
        self.permissions = permissions
    }
}

public struct OpenAiRoleList: Codable {
    public let data: [OpenAiRole]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiRole]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiRoleUpdateRequest: Codable {
    public let description: String?
    public let name: String?
    public let permissions: [String]?


    public init(description: String? = nil, name: String? = nil, permissions: [String]? = nil) {
        self.description = description
        self.name = name
        self.permissions = permissions
    }
}

public struct OpenAiRun: Codable {
    public let assistantId: String?
    public let cancelledAt: Int?
    public let completedAt: Int?
    public let createdAt: Int?
    public let expiresAt: Int?
    public let failedAt: Int?
    public let id: String?
    public let instructions: String?
    public let lastError: String?
    public let metadata: [String: String]?
    public let model: String?
    public let object: String?
    public let requiredAction: String?
    public let startedAt: Int?
    public let status: String?
    public let threadId: String?
    public let tools: [String]?
    public let usage: OpenAiTokenUsage?


    public init(assistantId: String? = nil, cancelledAt: Int? = nil, completedAt: Int? = nil, createdAt: Int? = nil, expiresAt: Int? = nil, failedAt: Int? = nil, id: String? = nil, instructions: String? = nil, lastError: String? = nil, metadata: [String: String]? = nil, model: String? = nil, object: String? = nil, requiredAction: String? = nil, startedAt: Int? = nil, status: String? = nil, threadId: String? = nil, tools: [String]? = nil, usage: OpenAiTokenUsage? = nil) {
        self.assistantId = assistantId
        self.cancelledAt = cancelledAt
        self.completedAt = completedAt
        self.createdAt = createdAt
        self.expiresAt = expiresAt
        self.failedAt = failedAt
        self.id = id
        self.instructions = instructions
        self.lastError = lastError
        self.metadata = metadata
        self.model = model
        self.object = object
        self.requiredAction = requiredAction
        self.startedAt = startedAt
        self.status = status
        self.threadId = threadId
        self.tools = tools
        self.usage = usage
    }
}

public struct OpenAiRunCreateRequest: Codable {
    public let additionalInstructions: String?
    public let assistantId: String?
    public let instructions: String?
    public let metadata: [String: String]?
    public let model: String?
    public let stream: Bool?
    public let tools: [String]?


    public init(additionalInstructions: String? = nil, assistantId: String? = nil, instructions: String? = nil, metadata: [String: String]? = nil, model: String? = nil, stream: Bool? = nil, tools: [String]? = nil) {
        self.additionalInstructions = additionalInstructions
        self.assistantId = assistantId
        self.instructions = instructions
        self.metadata = metadata
        self.model = model
        self.stream = stream
        self.tools = tools
    }
}

public struct OpenAiRunList: Codable {
    public let data: [OpenAiRun]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiRun]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiRunStep: Codable {
    public let assistantId: String?
    public let cancelledAt: Int?
    public let completedAt: Int?
    public let createdAt: Int?
    public let expiredAt: Int?
    public let failedAt: Int?
    public let id: String?
    public let lastError: String?
    public let metadata: [String: String]?
    public let object: String?
    public let runId: String?
    public let status: String?
    public let stepDetails: String?
    public let threadId: String?
    public let type: String?
    public let usage: OpenAiTokenUsage?


    public init(assistantId: String? = nil, cancelledAt: Int? = nil, completedAt: Int? = nil, createdAt: Int? = nil, expiredAt: Int? = nil, failedAt: Int? = nil, id: String? = nil, lastError: String? = nil, metadata: [String: String]? = nil, object: String? = nil, runId: String? = nil, status: String? = nil, stepDetails: String? = nil, threadId: String? = nil, type: String? = nil, usage: OpenAiTokenUsage? = nil) {
        self.assistantId = assistantId
        self.cancelledAt = cancelledAt
        self.completedAt = completedAt
        self.createdAt = createdAt
        self.expiredAt = expiredAt
        self.failedAt = failedAt
        self.id = id
        self.lastError = lastError
        self.metadata = metadata
        self.object = object
        self.runId = runId
        self.status = status
        self.stepDetails = stepDetails
        self.threadId = threadId
        self.type = type
        self.usage = usage
    }
}

public struct OpenAiRunStepList: Codable {
    public let data: [OpenAiRunStep]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiRunStep]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiRunSubmitToolOutputsRequest: Codable {
    public let stream: Bool?
    public let toolOutputs: [String]?


    public init(stream: Bool? = nil, toolOutputs: [String]? = nil) {
        self.stream = stream
        self.toolOutputs = toolOutputs
    }
}

public struct OpenAiRunUpdateRequest: Codable {
    public let metadata: [String: String]?


    public init(metadata: [String: String]? = nil) {
        self.metadata = metadata
    }
}

public struct OpenAiSkill: Codable {
    public let createdAt: Int?
    public let description: String?
    public let id: String?
    public let latestVersion: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let status: String?
    public let updatedAt: Int?
    public let versions: [OpenAiSkillVersion]?


    public init(createdAt: Int? = nil, description: String? = nil, id: String? = nil, latestVersion: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, status: String? = nil, updatedAt: Int? = nil, versions: [OpenAiSkillVersion]? = nil) {
        self.createdAt = createdAt
        self.description = description
        self.id = id
        self.latestVersion = latestVersion
        self.metadata = metadata
        self.name = name
        self.object = object
        self.status = status
        self.updatedAt = updatedAt
        self.versions = versions
    }
}

public struct OpenAiSkillCreateMultipartRequest: Codable {
    public let file: String?
    public let metadata: String?
    public let name: String?
    public let package: String?


    public init(file: String? = nil, metadata: String? = nil, name: String? = nil, package: String? = nil) {
        self.file = file
        self.metadata = metadata
        self.name = name
        self.package = package
    }
}

public struct OpenAiSkillList: Codable {
    public let data: [OpenAiSkill]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiSkill]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiSkillUpdateRequest: Codable {
    public let description: String?
    public let metadata: [String: String]?
    public let name: String?


    public init(description: String? = nil, metadata: [String: String]? = nil, name: String? = nil) {
        self.description = description
        self.metadata = metadata
        self.name = name
    }
}

public struct OpenAiSkillVersion: Codable {
    public let createdAt: Int?
    public let id: String?
    public let metadata: [String: String]?
    public let object: String?
    public let packageSha256: String?
    public let skillId: String?
    public let status: String?
    public let version: String?


    public init(createdAt: Int? = nil, id: String? = nil, metadata: [String: String]? = nil, object: String? = nil, packageSha256: String? = nil, skillId: String? = nil, status: String? = nil, version: String? = nil) {
        self.createdAt = createdAt
        self.id = id
        self.metadata = metadata
        self.object = object
        self.packageSha256 = packageSha256
        self.skillId = skillId
        self.status = status
        self.version = version
    }
}

public struct OpenAiSkillVersionCreateMultipartRequest: Codable {
    public let file: String?
    public let metadata: String?
    public let name: String?
    public let package: String?


    public init(file: String? = nil, metadata: String? = nil, name: String? = nil, package: String? = nil) {
        self.file = file
        self.metadata = metadata
        self.name = name
        self.package = package
    }
}

public struct OpenAiSkillVersionList: Codable {
    public let data: [OpenAiSkillVersion]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiSkillVersion]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiSpeechCreateRequest: Codable {
    public let input: String?
    public let metadata: [String: String]?
    public let model: String?
    public let responseFormat: String?
    public let speed: Double?
    public let voice: String?


    public init(input: String? = nil, metadata: [String: String]? = nil, model: String? = nil, responseFormat: String? = nil, speed: Double? = nil, voice: String? = nil) {
        self.input = input
        self.metadata = metadata
        self.model = model
        self.responseFormat = responseFormat
        self.speed = speed
        self.voice = voice
    }
}

public struct OpenAiStreamOptions: Codable {
    public let includeUsage: Bool?


    public init(includeUsage: Bool? = nil) {
        self.includeUsage = includeUsage
    }
}

public struct OpenAiTextConfig: Codable {
    public let format: OpenAiResponseFormat?


    public init(format: OpenAiResponseFormat? = nil) {
        self.format = format
    }
}

public struct OpenAiThread: Codable {
    public let createdAt: Int?
    public let id: String?
    public let metadata: [String: String]?
    public let object: String?
    public let toolResources: String?


    public init(createdAt: Int? = nil, id: String? = nil, metadata: [String: String]? = nil, object: String? = nil, toolResources: String? = nil) {
        self.createdAt = createdAt
        self.id = id
        self.metadata = metadata
        self.object = object
        self.toolResources = toolResources
    }
}

public struct OpenAiThreadAndRunCreateRequest: Codable {
    public let assistantId: String?
    public let instructions: String?
    public let metadata: [String: String]?
    public let model: String?
    public let stream: Bool?
    public let thread: OpenAiThreadCreateRequest?
    public let tools: [String]?


    public init(assistantId: String? = nil, instructions: String? = nil, metadata: [String: String]? = nil, model: String? = nil, stream: Bool? = nil, thread: OpenAiThreadCreateRequest? = nil, tools: [String]? = nil) {
        self.assistantId = assistantId
        self.instructions = instructions
        self.metadata = metadata
        self.model = model
        self.stream = stream
        self.thread = thread
        self.tools = tools
    }
}

public struct OpenAiThreadCreateRequest: Codable {
    public let messages: [OpenAiThreadMessageCreateRequest]?
    public let metadata: [String: String]?
    public let toolResources: String?


    public init(messages: [OpenAiThreadMessageCreateRequest]? = nil, metadata: [String: String]? = nil, toolResources: String? = nil) {
        self.messages = messages
        self.metadata = metadata
        self.toolResources = toolResources
    }
}

public struct OpenAiThreadMessage: Codable {
    public let assistantId: String?
    public let attachments: [String]?
    public let completedAt: Int?
    public let content: [String]?
    public let createdAt: Int?
    public let id: String?
    public let incompleteAt: Int?
    public let incompleteDetails: String?
    public let metadata: [String: String]?
    public let object: String?
    public let role: String?
    public let runId: String?
    public let status: String?
    public let threadId: String?


    public init(assistantId: String? = nil, attachments: [String]? = nil, completedAt: Int? = nil, content: [String]? = nil, createdAt: Int? = nil, id: String? = nil, incompleteAt: Int? = nil, incompleteDetails: String? = nil, metadata: [String: String]? = nil, object: String? = nil, role: String? = nil, runId: String? = nil, status: String? = nil, threadId: String? = nil) {
        self.assistantId = assistantId
        self.attachments = attachments
        self.completedAt = completedAt
        self.content = content
        self.createdAt = createdAt
        self.id = id
        self.incompleteAt = incompleteAt
        self.incompleteDetails = incompleteDetails
        self.metadata = metadata
        self.object = object
        self.role = role
        self.runId = runId
        self.status = status
        self.threadId = threadId
    }
}

public struct OpenAiThreadMessageCreateRequest: Codable {
    public let attachments: [String]?
    public let content: String?
    public let metadata: [String: String]?
    public let role: String?


    public init(attachments: [String]? = nil, content: String? = nil, metadata: [String: String]? = nil, role: String? = nil) {
        self.attachments = attachments
        self.content = content
        self.metadata = metadata
        self.role = role
    }
}

public struct OpenAiThreadMessageList: Codable {
    public let data: [OpenAiThreadMessage]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiThreadMessage]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiThreadMessageUpdateRequest: Codable {
    public let metadata: [String: String]?


    public init(metadata: [String: String]? = nil) {
        self.metadata = metadata
    }
}

public struct OpenAiThreadUpdateRequest: Codable {
    public let metadata: [String: String]?
    public let toolResources: String?


    public init(metadata: [String: String]? = nil, toolResources: String? = nil) {
        self.metadata = metadata
        self.toolResources = toolResources
    }
}

public struct OpenAiTokenLogprob: Codable {
    public let bytes: [Int]?
    public let logprob: Double?
    public let token: String?
    public let topLogprobs: [OpenAiTopLogprob]?


    public init(bytes: [Int]? = nil, logprob: Double? = nil, token: String? = nil, topLogprobs: [OpenAiTopLogprob]? = nil) {
        self.bytes = bytes
        self.logprob = logprob
        self.token = token
        self.topLogprobs = topLogprobs
    }
}

public struct OpenAiTokenUsage: Codable {
    public let completionTokens: Int?
    public let completionTokensDetails: OpenAiCompletionTokensDetails?
    public let promptTokens: Int?
    public let promptTokensDetails: OpenAiPromptTokensDetails?
    public let totalTokens: Int?


    public init(completionTokens: Int? = nil, completionTokensDetails: OpenAiCompletionTokensDetails? = nil, promptTokens: Int? = nil, promptTokensDetails: OpenAiPromptTokensDetails? = nil, totalTokens: Int? = nil) {
        self.completionTokens = completionTokens
        self.completionTokensDetails = completionTokensDetails
        self.promptTokens = promptTokens
        self.promptTokensDetails = promptTokensDetails
        self.totalTokens = totalTokens
    }
}

public struct OpenAiTool: Codable {
    public let function: OpenAiFunctionDefinition?
    public let type: String?


    public init(function: OpenAiFunctionDefinition? = nil, type: String? = nil) {
        self.function = function
        self.type = type
    }
}

public struct OpenAiToolCall: Codable {
    public let function: OpenAiFunctionCall?
    public let id: String?
    public let type: String?


    public init(function: OpenAiFunctionCall? = nil, id: String? = nil, type: String? = nil) {
        self.function = function
        self.id = id
        self.type = type
    }
}

public struct OpenAiToolChoice: Codable {

    public init() {}
}

public struct OpenAiTopLogprob: Codable {
    public let bytes: [Int]?
    public let logprob: Double?
    public let token: String?


    public init(bytes: [Int]? = nil, logprob: Double? = nil, token: String? = nil) {
        self.bytes = bytes
        self.logprob = logprob
        self.token = token
    }
}

public struct OpenAiUpload: Codable {
    public let bytes: Int?
    public let createdAt: Int?
    public let expiresAt: Int?
    public let file: OpenAiFile?
    public let filename: String?
    public let id: String?
    public let object: String?
    public let purpose: String?
    public let status: String?


    public init(bytes: Int? = nil, createdAt: Int? = nil, expiresAt: Int? = nil, file: OpenAiFile? = nil, filename: String? = nil, id: String? = nil, object: String? = nil, purpose: String? = nil, status: String? = nil) {
        self.bytes = bytes
        self.createdAt = createdAt
        self.expiresAt = expiresAt
        self.file = file
        self.filename = filename
        self.id = id
        self.object = object
        self.purpose = purpose
        self.status = status
    }
}

public struct OpenAiUploadCompleteRequest: Codable {
    public let md5: String?
    public let partIds: [String]?


    public init(md5: String? = nil, partIds: [String]? = nil) {
        self.md5 = md5
        self.partIds = partIds
    }
}

public struct OpenAiUploadCreateRequest: Codable {
    public let bytes: Int?
    public let filename: String?
    public let mimeType: String?
    public let purpose: String?


    public init(bytes: Int? = nil, filename: String? = nil, mimeType: String? = nil, purpose: String? = nil) {
        self.bytes = bytes
        self.filename = filename
        self.mimeType = mimeType
        self.purpose = purpose
    }
}

public struct OpenAiUploadPart: Codable {
    public let createdAt: Int?
    public let id: String?
    public let object: String?
    public let uploadId: String?


    public init(createdAt: Int? = nil, id: String? = nil, object: String? = nil, uploadId: String? = nil) {
        self.createdAt = createdAt
        self.id = id
        self.object = object
        self.uploadId = uploadId
    }
}

public struct OpenAiUploadPartMultipartRequest: Codable {
    public let data: String?


    public init(data: String? = nil) {
        self.data = data
    }
}

public struct OpenAiVectorStore: Codable {
    public let bytes: Int?
    public let createdAt: Int?
    public let expiresAfter: String?
    public let expiresAt: Int?
    public let fileCounts: OpenAiVectorStoreFileCounts?
    public let id: String?
    public let lastActiveAt: Int?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let status: String?
    public let usageBytes: Int?


    public init(bytes: Int? = nil, createdAt: Int? = nil, expiresAfter: String? = nil, expiresAt: Int? = nil, fileCounts: OpenAiVectorStoreFileCounts? = nil, id: String? = nil, lastActiveAt: Int? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, status: String? = nil, usageBytes: Int? = nil) {
        self.bytes = bytes
        self.createdAt = createdAt
        self.expiresAfter = expiresAfter
        self.expiresAt = expiresAt
        self.fileCounts = fileCounts
        self.id = id
        self.lastActiveAt = lastActiveAt
        self.metadata = metadata
        self.name = name
        self.object = object
        self.status = status
        self.usageBytes = usageBytes
    }
}

public struct OpenAiVectorStoreCreateRequest: Codable {
    public let chunkingStrategy: String?
    public let expiresAfter: String?
    public let fileIds: [String]?
    public let metadata: [String: String]?
    public let name: String?


    public init(chunkingStrategy: String? = nil, expiresAfter: String? = nil, fileIds: [String]? = nil, metadata: [String: String]? = nil, name: String? = nil) {
        self.chunkingStrategy = chunkingStrategy
        self.expiresAfter = expiresAfter
        self.fileIds = fileIds
        self.metadata = metadata
        self.name = name
    }
}

public struct OpenAiVectorStoreFile: Codable {
    public let attributes: [String: String]?
    public let chunkingStrategy: String?
    public let createdAt: Int?
    public let id: String?
    public let lastError: String?
    public let object: String?
    public let status: String?
    public let usageBytes: Int?
    public let vectorStoreId: String?


    public init(attributes: [String: String]? = nil, chunkingStrategy: String? = nil, createdAt: Int? = nil, id: String? = nil, lastError: String? = nil, object: String? = nil, status: String? = nil, usageBytes: Int? = nil, vectorStoreId: String? = nil) {
        self.attributes = attributes
        self.chunkingStrategy = chunkingStrategy
        self.createdAt = createdAt
        self.id = id
        self.lastError = lastError
        self.object = object
        self.status = status
        self.usageBytes = usageBytes
        self.vectorStoreId = vectorStoreId
    }
}

public struct OpenAiVectorStoreFileBatch: Codable {
    public let createdAt: Int?
    public let fileCounts: OpenAiVectorStoreFileCounts?
    public let id: String?
    public let object: String?
    public let status: String?
    public let vectorStoreId: String?


    public init(createdAt: Int? = nil, fileCounts: OpenAiVectorStoreFileCounts? = nil, id: String? = nil, object: String? = nil, status: String? = nil, vectorStoreId: String? = nil) {
        self.createdAt = createdAt
        self.fileCounts = fileCounts
        self.id = id
        self.object = object
        self.status = status
        self.vectorStoreId = vectorStoreId
    }
}

public struct OpenAiVectorStoreFileBatchCreateRequest: Codable {
    public let attributes: [String: String]?
    public let chunkingStrategy: String?
    public let fileIds: [String]?


    public init(attributes: [String: String]? = nil, chunkingStrategy: String? = nil, fileIds: [String]? = nil) {
        self.attributes = attributes
        self.chunkingStrategy = chunkingStrategy
        self.fileIds = fileIds
    }
}

public struct OpenAiVectorStoreFileCounts: Codable {
    public let cancelled: Int?
    public let completed: Int?
    public let failed: Int?
    public let inProgress: Int?
    public let total: Int?


    public init(cancelled: Int? = nil, completed: Int? = nil, failed: Int? = nil, inProgress: Int? = nil, total: Int? = nil) {
        self.cancelled = cancelled
        self.completed = completed
        self.failed = failed
        self.inProgress = inProgress
        self.total = total
    }
}

public struct OpenAiVectorStoreFileCreateRequest: Codable {
    public let attributes: [String: String]?
    public let chunkingStrategy: String?
    public let fileId: String?


    public init(attributes: [String: String]? = nil, chunkingStrategy: String? = nil, fileId: String? = nil) {
        self.attributes = attributes
        self.chunkingStrategy = chunkingStrategy
        self.fileId = fileId
    }
}

public struct OpenAiVectorStoreFileList: Codable {
    public let data: [OpenAiVectorStoreFile]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiVectorStoreFile]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiVectorStoreFileUpdateRequest: Codable {
    public let attributes: [String: String]?


    public init(attributes: [String: String]? = nil) {
        self.attributes = attributes
    }
}

public struct OpenAiVectorStoreList: Codable {
    public let data: [OpenAiVectorStore]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiVectorStore]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiVectorStoreSearchRequest: Codable {
    public let filters: String?
    public let maxNumResults: Int?
    public let query: String?
    public let rankingOptions: String?
    public let rewriteQuery: Bool?


    public init(filters: String? = nil, maxNumResults: Int? = nil, query: String? = nil, rankingOptions: String? = nil, rewriteQuery: Bool? = nil) {
        self.filters = filters
        self.maxNumResults = maxNumResults
        self.query = query
        self.rankingOptions = rankingOptions
        self.rewriteQuery = rewriteQuery
    }
}

public struct OpenAiVectorStoreSearchResponse: Codable {
    public let data: [OpenAiVectorStoreSearchResult]?
    public let object: String?
    public let searchQuery: [String]?


    public init(data: [OpenAiVectorStoreSearchResult]? = nil, object: String? = nil, searchQuery: [String]? = nil) {
        self.data = data
        self.object = object
        self.searchQuery = searchQuery
    }
}

public struct OpenAiVectorStoreSearchResult: Codable {
    public let attributes: [String: String]?
    public let content: [String]?
    public let fileId: String?
    public let filename: String?
    public let score: Double?


    public init(attributes: [String: String]? = nil, content: [String]? = nil, fileId: String? = nil, filename: String? = nil, score: Double? = nil) {
        self.attributes = attributes
        self.content = content
        self.fileId = fileId
        self.filename = filename
        self.score = score
    }
}

public struct OpenAiVectorStoreUpdateRequest: Codable {
    public let expiresAfter: String?
    public let metadata: [String: String]?
    public let name: String?


    public init(expiresAfter: String? = nil, metadata: [String: String]? = nil, name: String? = nil) {
        self.expiresAfter = expiresAfter
        self.metadata = metadata
        self.name = name
    }
}

public struct OpenAiVideo: Codable {
    public let completedAt: Int?
    public let contentUrl: String?
    public let createdAt: Int?
    public let id: String?
    public let metadata: [String: String]?
    public let model: String?
    public let object: String?
    public let prompt: String?
    public let seconds: Int?
    public let size: String?
    public let status: String?
    public let url: String?


    public init(completedAt: Int? = nil, contentUrl: String? = nil, createdAt: Int? = nil, id: String? = nil, metadata: [String: String]? = nil, model: String? = nil, object: String? = nil, prompt: String? = nil, seconds: Int? = nil, size: String? = nil, status: String? = nil, url: String? = nil) {
        self.completedAt = completedAt
        self.contentUrl = contentUrl
        self.createdAt = createdAt
        self.id = id
        self.metadata = metadata
        self.model = model
        self.object = object
        self.prompt = prompt
        self.seconds = seconds
        self.size = size
        self.status = status
        self.url = url
    }
}

public struct OpenAiVideoCharacter: Codable {
    public let createdAt: Int?
    public let description: String?
    public let id: String?
    public let imageUrl: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?


    public init(createdAt: Int? = nil, description: String? = nil, id: String? = nil, imageUrl: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil) {
        self.createdAt = createdAt
        self.description = description
        self.id = id
        self.imageUrl = imageUrl
        self.metadata = metadata
        self.name = name
        self.object = object
    }
}

public struct OpenAiVideoCharacterCreateRequest: Codable {
    public let description: String?
    public let image: String?
    public let metadata: [String: String]?
    public let name: String?


    public init(description: String? = nil, image: String? = nil, metadata: [String: String]? = nil, name: String? = nil) {
        self.description = description
        self.image = image
        self.metadata = metadata
        self.name = name
    }
}

public struct OpenAiVideoCharacterMultipartRequest: Codable {
    public let description: String?
    public let file: String?
    public let image: String?
    public let metadata: String?
    public let name: String?


    public init(description: String? = nil, file: String? = nil, image: String? = nil, metadata: String? = nil, name: String? = nil) {
        self.description = description
        self.file = file
        self.image = image
        self.metadata = metadata
        self.name = name
    }
}

public struct OpenAiVideoCreateRequest: Codable {
    public let image: String?
    public let metadata: [String: String]?
    public let model: String?
    public let prompt: String?
    public let seconds: Int?
    public let size: String?
    public let video: String?


    public init(image: String? = nil, metadata: [String: String]? = nil, model: String? = nil, prompt: String? = nil, seconds: Int? = nil, size: String? = nil, video: String? = nil) {
        self.image = image
        self.metadata = metadata
        self.model = model
        self.prompt = prompt
        self.seconds = seconds
        self.size = size
        self.video = video
    }
}

public struct OpenAiVideoEditRequest: Codable {
    public let image: String?
    public let metadata: [String: String]?
    public let model: String?
    public let prompt: String?
    public let seconds: Int?
    public let size: String?
    public let video: String?


    public init(image: String? = nil, metadata: [String: String]? = nil, model: String? = nil, prompt: String? = nil, seconds: Int? = nil, size: String? = nil, video: String? = nil) {
        self.image = image
        self.metadata = metadata
        self.model = model
        self.prompt = prompt
        self.seconds = seconds
        self.size = size
        self.video = video
    }
}

public struct OpenAiVideoExtendRequest: Codable {
    public let image: String?
    public let metadata: [String: String]?
    public let model: String?
    public let prompt: String?
    public let seconds: Int?
    public let size: String?
    public let video: String?


    public init(image: String? = nil, metadata: [String: String]? = nil, model: String? = nil, prompt: String? = nil, seconds: Int? = nil, size: String? = nil, video: String? = nil) {
        self.image = image
        self.metadata = metadata
        self.model = model
        self.prompt = prompt
        self.seconds = seconds
        self.size = size
        self.video = video
    }
}

public struct OpenAiVideoList: Codable {
    public let data: [OpenAiVideo]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiVideo]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiVideoRemixRequest: Codable {
    public let image: String?
    public let metadata: [String: String]?
    public let model: String?
    public let prompt: String?
    public let seconds: Int?
    public let size: String?
    public let video: String?


    public init(image: String? = nil, metadata: [String: String]? = nil, model: String? = nil, prompt: String? = nil, seconds: Int? = nil, size: String? = nil, video: String? = nil) {
        self.image = image
        self.metadata = metadata
        self.model = model
        self.prompt = prompt
        self.seconds = seconds
        self.size = size
        self.video = video
    }
}

public struct OpenAiVoice: Codable {
    public let createdAt: Int?
    public let description: String?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let status: String?


    public init(createdAt: Int? = nil, description: String? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, status: String? = nil) {
        self.createdAt = createdAt
        self.description = description
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.status = status
    }
}

public struct OpenAiVoiceConsent: Codable {
    public let consentDocument: String?
    public let createdAt: Int?
    public let id: String?
    public let metadata: [String: String]?
    public let name: String?
    public let object: String?
    public let status: String?


    public init(consentDocument: String? = nil, createdAt: Int? = nil, id: String? = nil, metadata: [String: String]? = nil, name: String? = nil, object: String? = nil, status: String? = nil) {
        self.consentDocument = consentDocument
        self.createdAt = createdAt
        self.id = id
        self.metadata = metadata
        self.name = name
        self.object = object
        self.status = status
    }
}

public struct OpenAiVoiceConsentCreateRequest: Codable {
    public let consentDocument: String?
    public let metadata: [String: String]?
    public let name: String?


    public init(consentDocument: String? = nil, metadata: [String: String]? = nil, name: String? = nil) {
        self.consentDocument = consentDocument
        self.metadata = metadata
        self.name = name
    }
}

public struct OpenAiVoiceConsentList: Codable {
    public let data: [OpenAiVoiceConsent]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiVoiceConsent]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct OpenAiVoiceConsentMultipartRequest: Codable {
    public let file: String?
    public let metadata: [String: String]?
    public let name: String?


    public init(file: String? = nil, metadata: [String: String]? = nil, name: String? = nil) {
        self.file = file
        self.metadata = metadata
        self.name = name
    }
}

public struct OpenAiVoiceConsentUpdateRequest: Codable {
    public let metadata: [String: String]?
    public let name: String?


    public init(metadata: [String: String]? = nil, name: String? = nil) {
        self.metadata = metadata
        self.name = name
    }
}

public struct OpenAiVoiceCreateMultipartRequest: Codable {
    public let description: String?
    public let file: String?
    public let metadata: String?
    public let name: String?


    public init(description: String? = nil, file: String? = nil, metadata: String? = nil, name: String? = nil) {
        self.description = description
        self.file = file
        self.metadata = metadata
        self.name = name
    }
}

public struct OpenAiVoiceCreateRequest: Codable {
    public let description: String?
    public let metadata: [String: String]?
    public let name: String?


    public init(description: String? = nil, metadata: [String: String]? = nil, name: String? = nil) {
        self.description = description
        self.metadata = metadata
        self.name = name
    }
}

public struct OpenAiVoiceList: Codable {
    public let data: [OpenAiVoice]?
    public let firstId: String?
    public let hasMore: Bool?
    public let lastId: String?
    public let object: String?


    public init(data: [OpenAiVoice]? = nil, firstId: String? = nil, hasMore: Bool? = nil, lastId: String? = nil, object: String? = nil) {
        self.data = data
        self.firstId = firstId
        self.hasMore = hasMore
        self.lastId = lastId
        self.object = object
    }
}

public struct ProviderGeneratedMedia: Codable {
    public let duration: Double?
    public let height: Int?
    public let id: String?
    public let metadata: [String: String]?
    public let mimeType: String?
    public let uri: String?
    public let url: String?
    public let width: Int?


    public init(duration: Double? = nil, height: Int? = nil, id: String? = nil, metadata: [String: String]? = nil, mimeType: String? = nil, uri: String? = nil, url: String? = nil, width: Int? = nil) {
        self.duration = duration
        self.height = height
        self.id = id
        self.metadata = metadata
        self.mimeType = mimeType
        self.uri = uri
        self.url = url
        self.width = width
    }
}

public struct ProviderJsonSchema: Codable {
    public let additionalProperties: Bool?
    public let description: String?
    public let enum_: [String]?
    public let items: Any?
    public let properties: [String: Any]?
    public let required_: [String]?
    public let type: String?


    public init(additionalProperties: Bool? = nil, description: String? = nil, enum_: [String]? = nil, items: Any? = nil, properties: [String: Any]? = nil, required_: [String]? = nil, type: String? = nil) {
        self.additionalProperties = additionalProperties
        self.description = description
        self.enum_ = enum_
        self.items = items
        self.properties = properties
        self.required_ = required_
        self.type = type
    }
}

public struct ProviderTaskError: Codable {
    public let code: String?
    public let message: String?
    public let type: String?


    public init(code: String? = nil, message: String? = nil, type: String? = nil) {
        self.code = code
        self.message = message
        self.type = type
    }
}

public struct ProviderTaskResult: Codable {
    public let audios: [ProviderGeneratedMedia]?
    public let content: [VolcengineContentPart]?
    public let id: String?
    public let images: [ProviderGeneratedMedia]?
    public let metadata: [String: String]?
    public let status: String?
    public let text: String?
    public let videos: [ProviderGeneratedMedia]?


    public init(audios: [ProviderGeneratedMedia]? = nil, content: [VolcengineContentPart]? = nil, id: String? = nil, images: [ProviderGeneratedMedia]? = nil, metadata: [String: String]? = nil, status: String? = nil, text: String? = nil, videos: [ProviderGeneratedMedia]? = nil) {
        self.audios = audios
        self.content = content
        self.id = id
        self.images = images
        self.metadata = metadata
        self.status = status
        self.text = text
        self.videos = videos
    }
}

public struct SunoMusicGenerationRequest: Codable {
    public let callbackUrl: String?
    public let duration: Double?
    public let model: String?
    public let negativeTags: String?
    public let prompt: String?
    public let tags: String?
    public let title: String?


    public init(callbackUrl: String? = nil, duration: Double? = nil, model: String? = nil, negativeTags: String? = nil, prompt: String? = nil, tags: String? = nil, title: String? = nil) {
        self.callbackUrl = callbackUrl
        self.duration = duration
        self.model = model
        self.negativeTags = negativeTags
        self.prompt = prompt
        self.tags = tags
        self.title = title
    }
}

public struct SunoMusicGenerationResponse: Codable {
    public let createdAt: String?
    public let id: String?
    public let status: String?
    public let taskId: String?


    public init(createdAt: String? = nil, id: String? = nil, status: String? = nil, taskId: String? = nil) {
        self.createdAt = createdAt
        self.id = id
        self.status = status
        self.taskId = taskId
    }
}

public struct SunoMusicGenerationTaskResponse: Codable {
    public let createdAt: String?
    public let error: ProviderTaskError?
    public let id: String?
    public let status: String?
    public let taskId: String?
    public let title: String?
    public let tracks: [SunoMusicTrack]?
    public let updatedAt: String?


    public init(createdAt: String? = nil, error: ProviderTaskError? = nil, id: String? = nil, status: String? = nil, taskId: String? = nil, title: String? = nil, tracks: [SunoMusicTrack]? = nil, updatedAt: String? = nil) {
        self.createdAt = createdAt
        self.error = error
        self.id = id
        self.status = status
        self.taskId = taskId
        self.title = title
        self.tracks = tracks
        self.updatedAt = updatedAt
    }
}

public struct SunoMusicTrack: Codable {
    public let audioUrl: String?
    public let duration: Double?
    public let id: String?
    public let imageUrl: String?
    public let lyrics: String?
    public let title: String?
    public let videoUrl: String?


    public init(audioUrl: String? = nil, duration: Double? = nil, id: String? = nil, imageUrl: String? = nil, lyrics: String? = nil, title: String? = nil, videoUrl: String? = nil) {
        self.audioUrl = audioUrl
        self.duration = duration
        self.id = id
        self.imageUrl = imageUrl
        self.lyrics = lyrics
        self.title = title
        self.videoUrl = videoUrl
    }
}

public struct ViduCreation: Codable {
    public let audioUrl: String?
    public let coverUrl: String?
    public let createdAt: String?
    public let duration: Double?
    public let height: Int?
    public let id: String?
    public let imageUrl: String?
    public let metadata: [String: String]?
    public let type: String?
    public let uri: String?
    public let url: String?
    public let videoUrl: String?
    public let width: Int?


    public init(audioUrl: String? = nil, coverUrl: String? = nil, createdAt: String? = nil, duration: Double? = nil, height: Int? = nil, id: String? = nil, imageUrl: String? = nil, metadata: [String: String]? = nil, type: String? = nil, uri: String? = nil, url: String? = nil, videoUrl: String? = nil, width: Int? = nil) {
        self.audioUrl = audioUrl
        self.coverUrl = coverUrl
        self.createdAt = createdAt
        self.duration = duration
        self.height = height
        self.id = id
        self.imageUrl = imageUrl
        self.metadata = metadata
        self.type = type
        self.uri = uri
        self.url = url
        self.videoUrl = videoUrl
        self.width = width
    }
}

public struct ViduImageGenerationTask: Codable {
    public let createdAt: String?
    public let creations: [ViduCreation]?
    public let model: String?
    public let state: String?
    public let taskId: String?


    public init(createdAt: String? = nil, creations: [ViduCreation]? = nil, model: String? = nil, state: String? = nil, taskId: String? = nil) {
        self.createdAt = createdAt
        self.creations = creations
        self.model = model
        self.state = state
        self.taskId = taskId
    }
}

public struct ViduImageToVideoRequest: Codable {
    public let aspectRatio: String?
    public let callbackUrl: String?
    public let duration: Int?
    public let images: [String]?
    public let model: String?
    public let movementAmplitude: String?
    public let payload: String?
    public let prompt: String?
    public let resolution: String?
    public let seed: Int?


    public init(aspectRatio: String? = nil, callbackUrl: String? = nil, duration: Int? = nil, images: [String]? = nil, model: String? = nil, movementAmplitude: String? = nil, payload: String? = nil, prompt: String? = nil, resolution: String? = nil, seed: Int? = nil) {
        self.aspectRatio = aspectRatio
        self.callbackUrl = callbackUrl
        self.duration = duration
        self.images = images
        self.model = model
        self.movementAmplitude = movementAmplitude
        self.payload = payload
        self.prompt = prompt
        self.resolution = resolution
        self.seed = seed
    }
}

public struct ViduReferenceToImageRequest: Codable {
    public let aspectRatio: String?
    public let callbackUrl: String?
    public let images: [String]?
    public let model: String?
    public let payload: String?
    public let prompt: String?
    public let seed: Int?
    public let style: String?


    public init(aspectRatio: String? = nil, callbackUrl: String? = nil, images: [String]? = nil, model: String? = nil, payload: String? = nil, prompt: String? = nil, seed: Int? = nil, style: String? = nil) {
        self.aspectRatio = aspectRatio
        self.callbackUrl = callbackUrl
        self.images = images
        self.model = model
        self.payload = payload
        self.prompt = prompt
        self.seed = seed
        self.style = style
    }
}

public struct ViduReferenceToVideoRequest: Codable {
    public let aspectRatio: String?
    public let callbackUrl: String?
    public let duration: Int?
    public let images: [String]?
    public let model: String?
    public let movementAmplitude: String?
    public let payload: String?
    public let prompt: String?
    public let resolution: String?
    public let seed: Int?


    public init(aspectRatio: String? = nil, callbackUrl: String? = nil, duration: Int? = nil, images: [String]? = nil, model: String? = nil, movementAmplitude: String? = nil, payload: String? = nil, prompt: String? = nil, resolution: String? = nil, seed: Int? = nil) {
        self.aspectRatio = aspectRatio
        self.callbackUrl = callbackUrl
        self.duration = duration
        self.images = images
        self.model = model
        self.movementAmplitude = movementAmplitude
        self.payload = payload
        self.prompt = prompt
        self.resolution = resolution
        self.seed = seed
    }
}

public struct ViduStartEndToVideoRequest: Codable {
    public let aspectRatio: String?
    public let callbackUrl: String?
    public let duration: Int?
    public let images: [String]?
    public let model: String?
    public let movementAmplitude: String?
    public let payload: String?
    public let prompt: String?
    public let resolution: String?
    public let seed: Int?


    public init(aspectRatio: String? = nil, callbackUrl: String? = nil, duration: Int? = nil, images: [String]? = nil, model: String? = nil, movementAmplitude: String? = nil, payload: String? = nil, prompt: String? = nil, resolution: String? = nil, seed: Int? = nil) {
        self.aspectRatio = aspectRatio
        self.callbackUrl = callbackUrl
        self.duration = duration
        self.images = images
        self.model = model
        self.movementAmplitude = movementAmplitude
        self.payload = payload
        self.prompt = prompt
        self.resolution = resolution
        self.seed = seed
    }
}

public struct ViduTaskCreationsResponse: Codable {
    public let createdAt: String?
    public let creations: [ViduCreation]?
    public let model: String?
    public let state: String?
    public let taskId: String?


    public init(createdAt: String? = nil, creations: [ViduCreation]? = nil, model: String? = nil, state: String? = nil, taskId: String? = nil) {
        self.createdAt = createdAt
        self.creations = creations
        self.model = model
        self.state = state
        self.taskId = taskId
    }
}

public struct ViduTextToVideoRequest: Codable {
    public let aspectRatio: String?
    public let callbackUrl: String?
    public let duration: Int?
    public let model: String?
    public let movementAmplitude: String?
    public let payload: String?
    public let prompt: String?
    public let resolution: String?
    public let seed: Int?


    public init(aspectRatio: String? = nil, callbackUrl: String? = nil, duration: Int? = nil, model: String? = nil, movementAmplitude: String? = nil, payload: String? = nil, prompt: String? = nil, resolution: String? = nil, seed: Int? = nil) {
        self.aspectRatio = aspectRatio
        self.callbackUrl = callbackUrl
        self.duration = duration
        self.model = model
        self.movementAmplitude = movementAmplitude
        self.payload = payload
        self.prompt = prompt
        self.resolution = resolution
        self.seed = seed
    }
}

public struct ViduVideoGenerationTask: Codable {
    public let createdAt: String?
    public let creations: [ViduCreation]?
    public let model: String?
    public let state: String?
    public let taskId: String?


    public init(createdAt: String? = nil, creations: [ViduCreation]? = nil, model: String? = nil, state: String? = nil, taskId: String? = nil) {
        self.createdAt = createdAt
        self.creations = creations
        self.model = model
        self.state = state
        self.taskId = taskId
    }
}

public struct VolcengineContentGenerationTask: Codable {
    public let content: [VolcengineContentPart]?
    public let createdAt: String?
    public let error: ProviderTaskError?
    public let id: String?
    public let model: String?
    public let prompt: String?
    public let result: ProviderTaskResult?
    public let state: String?
    public let status: String?
    public let taskId: String?
    public let updatedAt: String?
    public let videos: [ProviderGeneratedMedia]?


    public init(content: [VolcengineContentPart]? = nil, createdAt: String? = nil, error: ProviderTaskError? = nil, id: String? = nil, model: String? = nil, prompt: String? = nil, result: ProviderTaskResult? = nil, state: String? = nil, status: String? = nil, taskId: String? = nil, updatedAt: String? = nil, videos: [ProviderGeneratedMedia]? = nil) {
        self.content = content
        self.createdAt = createdAt
        self.error = error
        self.id = id
        self.model = model
        self.prompt = prompt
        self.result = result
        self.state = state
        self.status = status
        self.taskId = taskId
        self.updatedAt = updatedAt
        self.videos = videos
    }
}

public struct VolcengineContentGenerationTaskCreateRequest: Codable {
    public let callbackUrl: String?
    public let content: [VolcengineContentPart]?
    public let metadata: [String: String]?
    public let model: String?


    public init(callbackUrl: String? = nil, content: [VolcengineContentPart]? = nil, metadata: [String: String]? = nil, model: String? = nil) {
        self.callbackUrl = callbackUrl
        self.content = content
        self.metadata = metadata
        self.model = model
    }
}

public struct VolcengineContentGenerationTaskCreateResponse: Codable {
    public let createdAt: String?
    public let id: String?
    public let status: String?
    public let taskId: String?


    public init(createdAt: String? = nil, id: String? = nil, status: String? = nil, taskId: String? = nil) {
        self.createdAt = createdAt
        self.id = id
        self.status = status
        self.taskId = taskId
    }
}

public struct VolcengineContentPart: Codable {
    public let fileId: String?
    public let imageUrl: String?
    public let text: String?
    public let type: String?
    public let videoUrl: String?


    public init(fileId: String? = nil, imageUrl: String? = nil, text: String? = nil, type: String? = nil, videoUrl: String? = nil) {
        self.fileId = fileId
        self.imageUrl = imageUrl
        self.text = text
        self.type = type
        self.videoUrl = videoUrl
    }
}
