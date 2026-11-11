import Foundation

public struct AlibabaAsyncTask: Codable {
    public let code: String?
    public let endTime: String?
    public let message: String?
    public let origPrompt: String?
    public let results: [ProviderGeneratedMedia]?
    public let scheduledTime: String?
    public let submitTime: String?
    public let taskId: String?
    public let taskStatus: String?
    public let videoUrl: String?


    public init(code: String? = nil, endTime: String? = nil, message: String? = nil, origPrompt: String? = nil, results: [ProviderGeneratedMedia]? = nil, scheduledTime: String? = nil, submitTime: String? = nil, taskId: String? = nil, taskStatus: String? = nil, videoUrl: String? = nil) {
        self.code = code
        self.endTime = endTime
        self.message = message
        self.origPrompt = origPrompt
        self.results = results
        self.scheduledTime = scheduledTime
        self.submitTime = submitTime
        self.taskId = taskId
        self.taskStatus = taskStatus
        self.videoUrl = videoUrl
    }
}

public struct AlibabaImageGenerationRequest: Codable {
    public let input: [String: String]?
    public let model: String?
    public let parameters: [String: String]?


    public init(input: [String: String]? = nil, model: String? = nil, parameters: [String: String]? = nil) {
        self.input = input
        self.model = model
        self.parameters = parameters
    }
}

public struct AlibabaImageGenerationResponse: Codable {
    public let code: String?
    public let message: String?
    public let output: AlibabaAsyncTask?
    public let requestId: String?
    public let usage: AlibabaTaskUsage?


    public init(code: String? = nil, message: String? = nil, output: AlibabaAsyncTask? = nil, requestId: String? = nil, usage: AlibabaTaskUsage? = nil) {
        self.code = code
        self.message = message
        self.output = output
        self.requestId = requestId
        self.usage = usage
    }
}

public struct AlibabaSpeechInput: Codable {
    public let instructions: String?
    public let languageType: String?
    public let optimizeInstructions: Bool?
    public let text: String?
    public let voice: String?


    public init(instructions: String? = nil, languageType: String? = nil, optimizeInstructions: Bool? = nil, text: String? = nil, voice: String? = nil) {
        self.instructions = instructions
        self.languageType = languageType
        self.optimizeInstructions = optimizeInstructions
        self.text = text
        self.voice = voice
    }
}

public struct AlibabaSpeechRequest: Codable {
    public let input: AlibabaSpeechInput?
    public let model: String?
    public let parameters: [String: String]?


    public init(input: AlibabaSpeechInput? = nil, model: String? = nil, parameters: [String: String]? = nil) {
        self.input = input
        self.model = model
        self.parameters = parameters
    }
}

public struct AlibabaSpeechResponse: Codable {
    public let code: String?
    public let message: String?
    public let output: [String: String]?
    public let requestId: String?
    public let usage: [String: String]?


    public init(code: String? = nil, message: String? = nil, output: [String: String]? = nil, requestId: String? = nil, usage: [String: String]? = nil) {
        self.code = code
        self.message = message
        self.output = output
        self.requestId = requestId
        self.usage = usage
    }
}

public struct AlibabaTaskUsage: Codable {
    public let sr: Int?
    public let duration: Double?
    public let imageCount: Int?
    public let inputVideoDuration: Int?
    public let outputVideoDuration: Int?
    public let ratio: String?


    public init(sr: Int? = nil, duration: Double? = nil, imageCount: Int? = nil, inputVideoDuration: Int? = nil, outputVideoDuration: Int? = nil, ratio: String? = nil) {
        self.sr = sr
        self.duration = duration
        self.imageCount = imageCount
        self.inputVideoDuration = inputVideoDuration
        self.outputVideoDuration = outputVideoDuration
        self.ratio = ratio
    }
}

public struct AlibabaVideoGenerationRequest: Codable {
    public let input: [String: String]?
    public let model: String?
    public let parameters: [String: String]?


    public init(input: [String: String]? = nil, model: String? = nil, parameters: [String: String]? = nil) {
        self.input = input
        self.model = model
        self.parameters = parameters
    }
}

public struct AlibabaVideoGenerationResponse: Codable {
    public let code: String?
    public let message: String?
    public let output: AlibabaAsyncTask?
    public let requestId: String?
    public let usage: AlibabaTaskUsage?


    public init(code: String? = nil, message: String? = nil, output: AlibabaAsyncTask? = nil, requestId: String? = nil, usage: AlibabaTaskUsage? = nil) {
        self.code = code
        self.message = message
        self.output = output
        self.requestId = requestId
        self.usage = usage
    }
}

public struct AlibabaVideoGenerationTask: Codable {
    public let output: AlibabaAsyncTask?
    public let requestId: String?
    public let usage: AlibabaTaskUsage?


    public init(output: AlibabaAsyncTask? = nil, requestId: String? = nil, usage: AlibabaTaskUsage? = nil) {
        self.output = output
        self.requestId = requestId
        self.usage = usage
    }
}

public struct AnthropicCacheControl: Codable {
    public let ttl: String?
    public let type: String?


    public init(ttl: String? = nil, type: String? = nil) {
        self.ttl = ttl
        self.type = type
    }
}

public struct AnthropicContainer: Codable {
    public let id: String?
    public let skills: [AnthropicSkill]?


    public init(id: String? = nil, skills: [AnthropicSkill]? = nil) {
        self.id = id
        self.skills = skills
    }
}

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
    public let cacheControl: AnthropicCacheControl?
    public let caller: [String: String]?
    public let citations: [[String: String]]?
    public let content: String?
    public let context: String?
    public let data: String?
    public let id: String?
    public let input: [String: String]?
    public let isError: Bool?
    public let name: String?
    public let signature: String?
    public let source: AnthropicContentSource?
    public let text: String?
    public let thinking: String?
    public let title: String?
    public let toolUseId: String?
    public let toolsetName: String?
    public let type: String?


    public init(cacheControl: AnthropicCacheControl? = nil, caller: [String: String]? = nil, citations: [[String: String]]? = nil, content: String? = nil, context: String? = nil, data: String? = nil, id: String? = nil, input: [String: String]? = nil, isError: Bool? = nil, name: String? = nil, signature: String? = nil, source: AnthropicContentSource? = nil, text: String? = nil, thinking: String? = nil, title: String? = nil, toolUseId: String? = nil, toolsetName: String? = nil, type: String? = nil) {
        self.cacheControl = cacheControl
        self.caller = caller
        self.citations = citations
        self.content = content
        self.context = context
        self.data = data
        self.id = id
        self.input = input
        self.isError = isError
        self.name = name
        self.signature = signature
        self.source = source
        self.text = text
        self.thinking = thinking
        self.title = title
        self.toolUseId = toolUseId
        self.toolsetName = toolsetName
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
    public let cacheControl: AnthropicCacheControl?
    public let messages: [AnthropicMessageParam]?
    public let model: String?
    public let outputConfig: AnthropicOutputConfig?
    public let speed: String?
    public let system: String?
    public let thinking: AnthropicThinkingConfig?
    public let toolChoice: AnthropicToolChoice?
    public let tools: [AnthropicTool]?


    public init(cacheControl: AnthropicCacheControl? = nil, messages: [AnthropicMessageParam]? = nil, model: String? = nil, outputConfig: AnthropicOutputConfig? = nil, speed: String? = nil, system: String? = nil, thinking: AnthropicThinkingConfig? = nil, toolChoice: AnthropicToolChoice? = nil, tools: [AnthropicTool]? = nil) {
        self.cacheControl = cacheControl
        self.messages = messages
        self.model = model
        self.outputConfig = outputConfig
        self.speed = speed
        self.system = system
        self.thinking = thinking
        self.toolChoice = toolChoice
        self.tools = tools
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

public struct AnthropicDiagnostics: Codable {
    public let previousMessageId: String?


    public init(previousMessageId: String? = nil) {
        self.previousMessageId = previousMessageId
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
    public let cacheControl: AnthropicCacheControl?
    public let container: AnthropicContainer?
    public let diagnostics: AnthropicDiagnostics?
    public let inferenceGeo: String?
    public let maxTokens: Int?
    public let messages: [AnthropicMessageParam]?
    public let metadata: AnthropicMetadata?
    public let model: String?
    public let outputConfig: AnthropicOutputConfig?
    public let serviceTier: String?
    public let speed: String?
    public let stopSequences: [String]?
    public let stream: Bool?
    public let system: String?
    public let temperature: Double?
    public let thinking: AnthropicThinkingConfig?
    public let toolChoice: AnthropicToolChoice?
    public let tools: [AnthropicTool]?
    public let topK: Int?
    public let topP: Double?


    public init(cacheControl: AnthropicCacheControl? = nil, container: AnthropicContainer? = nil, diagnostics: AnthropicDiagnostics? = nil, inferenceGeo: String? = nil, maxTokens: Int? = nil, messages: [AnthropicMessageParam]? = nil, metadata: AnthropicMetadata? = nil, model: String? = nil, outputConfig: AnthropicOutputConfig? = nil, serviceTier: String? = nil, speed: String? = nil, stopSequences: [String]? = nil, stream: Bool? = nil, system: String? = nil, temperature: Double? = nil, thinking: AnthropicThinkingConfig? = nil, toolChoice: AnthropicToolChoice? = nil, tools: [AnthropicTool]? = nil, topK: Int? = nil, topP: Double? = nil) {
        self.cacheControl = cacheControl
        self.container = container
        self.diagnostics = diagnostics
        self.inferenceGeo = inferenceGeo
        self.maxTokens = maxTokens
        self.messages = messages
        self.metadata = metadata
        self.model = model
        self.outputConfig = outputConfig
        self.serviceTier = serviceTier
        self.speed = speed
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

public struct AnthropicMetadata: Codable {
    public let userId: String?


    public init(userId: String? = nil) {
        self.userId = userId
    }
}

public struct AnthropicOutputConfig: Codable {
    public let effort: String?
    public let format: AnthropicOutputFormat?


    public init(effort: String? = nil, format: AnthropicOutputFormat? = nil) {
        self.effort = effort
        self.format = format
    }
}

public struct AnthropicOutputFormat: Codable {
    public let schema: ProviderJsonSchema?
    public let type: String?


    public init(schema: ProviderJsonSchema? = nil, type: String? = nil) {
        self.schema = schema
        self.type = type
    }
}

public struct AnthropicServerTool: Codable {
    public let allowedCallers: [String]?
    public let allowedDomains: [String]?
    public let blockedDomains: [String]?
    public let cacheControl: AnthropicCacheControl?
    public let deferLoading: Bool?
    public let displayHeightPx: Int?
    public let displayNumber: Int?
    public let displayWidthPx: Int?
    public let maxCharacters: Int?
    public let maxUses: Int?
    public let name: String?
    public let strict: Bool?
    public let type: String?
    public let userLocation: [String: String]?


    public init(allowedCallers: [String]? = nil, allowedDomains: [String]? = nil, blockedDomains: [String]? = nil, cacheControl: AnthropicCacheControl? = nil, deferLoading: Bool? = nil, displayHeightPx: Int? = nil, displayNumber: Int? = nil, displayWidthPx: Int? = nil, maxCharacters: Int? = nil, maxUses: Int? = nil, name: String? = nil, strict: Bool? = nil, type: String? = nil, userLocation: [String: String]? = nil) {
        self.allowedCallers = allowedCallers
        self.allowedDomains = allowedDomains
        self.blockedDomains = blockedDomains
        self.cacheControl = cacheControl
        self.deferLoading = deferLoading
        self.displayHeightPx = displayHeightPx
        self.displayNumber = displayNumber
        self.displayWidthPx = displayWidthPx
        self.maxCharacters = maxCharacters
        self.maxUses = maxUses
        self.name = name
        self.strict = strict
        self.type = type
        self.userLocation = userLocation
    }
}

public struct AnthropicSkill: Codable {
    public let skillId: String?
    public let type: String?
    public let version: String?


    public init(skillId: String? = nil, type: String? = nil, version: String? = nil) {
        self.skillId = skillId
        self.type = type
        self.version = version
    }
}

public struct AnthropicThinkingConfig: Codable {
    public let budgetTokens: Int?
    public let display: String?
    public let type: String?


    public init(budgetTokens: Int? = nil, display: String? = nil, type: String? = nil) {
        self.budgetTokens = budgetTokens
        self.display = display
        self.type = type
    }
}

public struct AnthropicTool: Codable {
    public let allowedCallers: [String]?
    public let cacheControl: AnthropicCacheControl?
    public let deferLoading: Bool?
    public let description: String?
    public let eagerInputStreaming: Bool?
    public let inputExamples: [[String: String]]?
    public let inputSchema: ProviderJsonSchema?
    public let name: String?
    public let strict: Bool?
    public let type: String?


    public init(allowedCallers: [String]? = nil, cacheControl: AnthropicCacheControl? = nil, deferLoading: Bool? = nil, description: String? = nil, eagerInputStreaming: Bool? = nil, inputExamples: [[String: String]]? = nil, inputSchema: ProviderJsonSchema? = nil, name: String? = nil, strict: Bool? = nil, type: String? = nil) {
        self.allowedCallers = allowedCallers
        self.cacheControl = cacheControl
        self.deferLoading = deferLoading
        self.description = description
        self.eagerInputStreaming = eagerInputStreaming
        self.inputExamples = inputExamples
        self.inputSchema = inputSchema
        self.name = name
        self.strict = strict
        self.type = type
    }
}

public struct AnthropicToolChoice: Codable {
    public let disableParallelToolUse: Bool?
    public let name: String?
    public let type: String?


    public init(disableParallelToolUse: Bool? = nil, name: String? = nil, type: String? = nil) {
        self.disableParallelToolUse = disableParallelToolUse
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

public struct ArkAudioSource: Codable {
    public let url: String?


    public init(url: String? = nil) {
        self.url = url
    }
}

public struct ArkContentPart: Codable {
    public let audioUrl: ArkAudioSource?
    public let draftTask: ArkDraftTask?
    public let imageUrl: ArkImageSource?
    public let role: String?
    public let text: String?
    public let type: String?
    public let videoUrl: ArkVideoSource?


    public init(audioUrl: ArkAudioSource? = nil, draftTask: ArkDraftTask? = nil, imageUrl: ArkImageSource? = nil, role: String? = nil, text: String? = nil, type: String? = nil, videoUrl: ArkVideoSource? = nil) {
        self.audioUrl = audioUrl
        self.draftTask = draftTask
        self.imageUrl = imageUrl
        self.role = role
        self.text = text
        self.type = type
        self.videoUrl = videoUrl
    }
}

public struct ArkDraftTask: Codable {
    public let id: String?


    public init(id: String? = nil) {
        self.id = id
    }
}

public struct ArkImageGenerationData: Codable {
    public let b64Json: String?
    public let boundingBox: [String: String]?
    public let description: String?
    public let error: ProviderTaskError?
    public let name: String?
    public let outputFormat: String?
    public let size: String?
    public let url: String?
    public let zIndex: Int?


    public init(b64Json: String? = nil, boundingBox: [String: String]? = nil, description: String? = nil, error: ProviderTaskError? = nil, name: String? = nil, outputFormat: String? = nil, size: String? = nil, url: String? = nil, zIndex: Int? = nil) {
        self.b64Json = b64Json
        self.boundingBox = boundingBox
        self.description = description
        self.error = error
        self.name = name
        self.outputFormat = outputFormat
        self.size = size
        self.url = url
        self.zIndex = zIndex
    }
}

public struct ArkImageSource: Codable {
    public let url: String?


    public init(url: String? = nil) {
        self.url = url
    }
}

public struct ArkImageUsage: Codable {
    public let generatedImages: Int?
    public let inputImages: Int?
    public let outputTokens: Int?
    public let toolUsage: ArkVideoToolUsage?
    public let totalTokens: Int?


    public init(generatedImages: Int? = nil, inputImages: Int? = nil, outputTokens: Int? = nil, toolUsage: ArkVideoToolUsage? = nil, totalTokens: Int? = nil) {
        self.generatedImages = generatedImages
        self.inputImages = inputImages
        self.outputTokens = outputTokens
        self.toolUsage = toolUsage
        self.totalTokens = totalTokens
    }
}

public struct ArkVideoSource: Codable {
    public let url: String?


    public init(url: String? = nil) {
        self.url = url
    }
}

public struct ArkVideoTaskContent: Codable {
    public let lastFrameUrl: String?
    public let videoUrl: String?


    public init(lastFrameUrl: String? = nil, videoUrl: String? = nil) {
        self.lastFrameUrl = lastFrameUrl
        self.videoUrl = videoUrl
    }
}

public struct ArkVideoToolUsage: Codable {
    public let webSearch: Int?


    public init(webSearch: Int? = nil) {
        self.webSearch = webSearch
    }
}

public struct ArkVideoUsage: Codable {
    public let completionTokens: Int?
    public let toolUsage: ArkVideoToolUsage?
    public let totalTokens: Int?


    public init(completionTokens: Int? = nil, toolUsage: ArkVideoToolUsage? = nil, totalTokens: Int? = nil) {
        self.completionTokens = completionTokens
        self.toolUsage = toolUsage
        self.totalTokens = totalTokens
    }
}

public struct ArkWebSearchTool: Codable {
    public let type: String?


    public init(type: String? = nil) {
        self.type = type
    }
}

public struct BlackForestLabsImageGenerationRequest: Codable {
    public let aspectRatio: String?
    public let autoCrop: Bool?
    public let bottom: Int?
    public let dilatePixels: Int?
    public let disablePup: Bool?
    public let finetuneId: String?
    public let finetuneStrength: Double?
    public let garment: String?
    public let grounding: Bool?
    public let guidance: Double?
    public let height: Int?
    public let image: String?
    public let imagePrompt: String?
    public let imagePromptStrength: Double?
    public let images: String?
    public let inputImage: String?
    public let inputImage2: String?
    public let inputImage3: String?
    public let inputImage4: String?
    public let inputImage5: String?
    public let inputImage6: String?
    public let inputImage7: String?
    public let inputImage8: String?
    public let inputImageBlobPath: String?
    public let left_: Int?
    public let mask: String?
    public let mode: String?
    public let outputFormat: String?
    public let person: String?
    public let prompt: String?
    public let promptUpsampling: Bool?
    public let raw: Bool?
    public let referenceOffsetX: Int?
    public let referenceOffsetY: Int?
    public let resolution: String?
    public let right_: Int?
    public let safetyTolerance: Int?
    public let seed: Int?
    public let steps: Int?
    public let top: Int?
    public let user: String?
    public let version: String?
    public let webhookSecret: String?
    public let webhookUrl: String?
    public let width: Int?


    public init(aspectRatio: String? = nil, autoCrop: Bool? = nil, bottom: Int? = nil, dilatePixels: Int? = nil, disablePup: Bool? = nil, finetuneId: String? = nil, finetuneStrength: Double? = nil, garment: String? = nil, grounding: Bool? = nil, guidance: Double? = nil, height: Int? = nil, image: String? = nil, imagePrompt: String? = nil, imagePromptStrength: Double? = nil, images: String? = nil, inputImage: String? = nil, inputImage2: String? = nil, inputImage3: String? = nil, inputImage4: String? = nil, inputImage5: String? = nil, inputImage6: String? = nil, inputImage7: String? = nil, inputImage8: String? = nil, inputImageBlobPath: String? = nil, left_: Int? = nil, mask: String? = nil, mode: String? = nil, outputFormat: String? = nil, person: String? = nil, prompt: String? = nil, promptUpsampling: Bool? = nil, raw: Bool? = nil, referenceOffsetX: Int? = nil, referenceOffsetY: Int? = nil, resolution: String? = nil, right_: Int? = nil, safetyTolerance: Int? = nil, seed: Int? = nil, steps: Int? = nil, top: Int? = nil, user: String? = nil, version: String? = nil, webhookSecret: String? = nil, webhookUrl: String? = nil, width: Int? = nil) {
        self.aspectRatio = aspectRatio
        self.autoCrop = autoCrop
        self.bottom = bottom
        self.dilatePixels = dilatePixels
        self.disablePup = disablePup
        self.finetuneId = finetuneId
        self.finetuneStrength = finetuneStrength
        self.garment = garment
        self.grounding = grounding
        self.guidance = guidance
        self.height = height
        self.image = image
        self.imagePrompt = imagePrompt
        self.imagePromptStrength = imagePromptStrength
        self.images = images
        self.inputImage = inputImage
        self.inputImage2 = inputImage2
        self.inputImage3 = inputImage3
        self.inputImage4 = inputImage4
        self.inputImage5 = inputImage5
        self.inputImage6 = inputImage6
        self.inputImage7 = inputImage7
        self.inputImage8 = inputImage8
        self.inputImageBlobPath = inputImageBlobPath
        self.left_ = left_
        self.mask = mask
        self.mode = mode
        self.outputFormat = outputFormat
        self.person = person
        self.prompt = prompt
        self.promptUpsampling = promptUpsampling
        self.raw = raw
        self.referenceOffsetX = referenceOffsetX
        self.referenceOffsetY = referenceOffsetY
        self.resolution = resolution
        self.right_ = right_
        self.safetyTolerance = safetyTolerance
        self.seed = seed
        self.steps = steps
        self.top = top
        self.user = user
        self.version = version
        self.webhookSecret = webhookSecret
        self.webhookUrl = webhookUrl
        self.width = width
    }
}

public struct BlackForestLabsImageGenerationTask: Codable {
    public let details: [String: String]?
    public let id: String?
    public let pollingUrl: String?
    public let progress: Double?
    public let result: [String: String]?
    public let status: String?


    public init(details: [String: String]? = nil, id: String? = nil, pollingUrl: String? = nil, progress: Double? = nil, result: [String: String]? = nil, status: String? = nil) {
        self.details = details
        self.id = id
        self.pollingUrl = pollingUrl
        self.progress = progress
        self.result = result
        self.status = status
    }
}

public struct BlackForestLabsVideoGenerationRequest: Codable {
    public let aspectRatio: String?
    public let draft: Bool?
    public let draftCache: String?
    public let duration: Int?
    public let generateAudio: Bool?
    public let keyframes: String?
    public let mode: String?
    public let prompt: String?
    public let resolution: String?
    public let safetyTolerance: Int?
    public let startVideo: String?
    public let user: String?
    public let version: String?


    public init(aspectRatio: String? = nil, draft: Bool? = nil, draftCache: String? = nil, duration: Int? = nil, generateAudio: Bool? = nil, keyframes: String? = nil, mode: String? = nil, prompt: String? = nil, resolution: String? = nil, safetyTolerance: Int? = nil, startVideo: String? = nil, user: String? = nil, version: String? = nil) {
        self.aspectRatio = aspectRatio
        self.draft = draft
        self.draftCache = draftCache
        self.duration = duration
        self.generateAudio = generateAudio
        self.keyframes = keyframes
        self.mode = mode
        self.prompt = prompt
        self.resolution = resolution
        self.safetyTolerance = safetyTolerance
        self.startVideo = startVideo
        self.user = user
        self.version = version
    }
}

public struct BlackForestLabsVideoGenerationTask: Codable {
    public let details: [String: String]?
    public let id: String?
    public let pollingUrl: String?
    public let progress: Double?
    public let result: [String: String]?
    public let status: String?


    public init(details: [String: String]? = nil, id: String? = nil, pollingUrl: String? = nil, progress: Double? = nil, result: [String: String]? = nil, status: String? = nil) {
        self.details = details
        self.id = id
        self.pollingUrl = pollingUrl
        self.progress = progress
        self.result = result
        self.status = status
    }
}

public struct BytedanceImageGenerationRequest: Codable {
    public let background: String?
    public let image: String?
    public let layerDecomposition: Bool?
    public let model: String?
    public let optimizePromptOptions: [String: String]?
    public let outputFormat: String?
    public let prompt: String?
    public let responseFormat: String?
    public let sequentialImageGeneration: String?
    public let sequentialImageGenerationOptions: [String: String]?
    public let size: String?
    public let stream: Bool?
    public let tools: [ArkWebSearchTool]?
    public let watermark: Bool?


    public init(background: String? = nil, image: String? = nil, layerDecomposition: Bool? = nil, model: String? = nil, optimizePromptOptions: [String: String]? = nil, outputFormat: String? = nil, prompt: String? = nil, responseFormat: String? = nil, sequentialImageGeneration: String? = nil, sequentialImageGenerationOptions: [String: String]? = nil, size: String? = nil, stream: Bool? = nil, tools: [ArkWebSearchTool]? = nil, watermark: Bool? = nil) {
        self.background = background
        self.image = image
        self.layerDecomposition = layerDecomposition
        self.model = model
        self.optimizePromptOptions = optimizePromptOptions
        self.outputFormat = outputFormat
        self.prompt = prompt
        self.responseFormat = responseFormat
        self.sequentialImageGeneration = sequentialImageGeneration
        self.sequentialImageGenerationOptions = sequentialImageGenerationOptions
        self.size = size
        self.stream = stream
        self.tools = tools
        self.watermark = watermark
    }
}

public struct BytedanceImageGenerationResponse: Codable {
    public let created: Int?
    public let data: [ArkImageGenerationData]?
    public let error: ProviderTaskError?
    public let model: String?
    public let tools: [ArkWebSearchTool]?
    public let usage: ArkImageUsage?


    public init(created: Int? = nil, data: [ArkImageGenerationData]? = nil, error: ProviderTaskError? = nil, model: String? = nil, tools: [ArkWebSearchTool]? = nil, usage: ArkImageUsage? = nil) {
        self.created = created
        self.data = data
        self.error = error
        self.model = model
        self.tools = tools
        self.usage = usage
    }
}

public struct BytedanceSpeechChunk: Codable {
    public let code: Int?
    public let data: String?
    public let message: String?
    public let sequence: Int?


    public init(code: Int? = nil, data: String? = nil, message: String? = nil, sequence: Int? = nil) {
        self.code = code
        self.data = data
        self.message = message
        self.sequence = sequence
    }
}

public struct BytedanceSpeechRequest: Codable {
    public let reqParams: BytedanceTtsRequestParams?


    public init(reqParams: BytedanceTtsRequestParams? = nil) {
        self.reqParams = reqParams
    }
}

public struct BytedanceTtsAudioParams: Codable {
    public let format: String?
    public let loudnessRate: Int?
    public let sampleRate: Int?
    public let speechRate: Int?


    public init(format: String? = nil, loudnessRate: Int? = nil, sampleRate: Int? = nil, speechRate: Int? = nil) {
        self.format = format
        self.loudnessRate = loudnessRate
        self.sampleRate = sampleRate
        self.speechRate = speechRate
    }
}

public struct BytedanceTtsRequestParams: Codable {
    public let additions: String?
    public let audioParams: BytedanceTtsAudioParams?
    public let model: String?
    public let pronunciationDict: [String: String]?
    public let speaker: String?
    public let ssml: String?
    public let text: String?
    public let tone: [String]?


    public init(additions: String? = nil, audioParams: BytedanceTtsAudioParams? = nil, model: String? = nil, pronunciationDict: [String: String]? = nil, speaker: String? = nil, ssml: String? = nil, text: String? = nil, tone: [String]? = nil) {
        self.additions = additions
        self.audioParams = audioParams
        self.model = model
        self.pronunciationDict = pronunciationDict
        self.speaker = speaker
        self.ssml = ssml
        self.text = text
        self.tone = tone
    }
}

public struct BytedanceVideoGenerationRequest: Codable {
    public let callbackUrl: String?
    public let cameraFixed: Bool?
    public let content: [ArkContentPart]?
    public let draft: Bool?
    public let duration: Int?
    public let executionExpiresAfter: Int?
    public let frames: Int?
    public let generateAudio: Bool?
    public let model: String?
    public let omniReferenceTaskType: String?
    public let outputFormat: String?
    public let priority: Int?
    public let ratio: String?
    public let resolution: String?
    public let returnLastFrame: Bool?
    public let safetyIdentifier: String?
    public let seed: Int?
    public let serviceTier: String?
    public let tools: [ArkWebSearchTool]?
    public let watermark: Bool?


    public init(callbackUrl: String? = nil, cameraFixed: Bool? = nil, content: [ArkContentPart]? = nil, draft: Bool? = nil, duration: Int? = nil, executionExpiresAfter: Int? = nil, frames: Int? = nil, generateAudio: Bool? = nil, model: String? = nil, omniReferenceTaskType: String? = nil, outputFormat: String? = nil, priority: Int? = nil, ratio: String? = nil, resolution: String? = nil, returnLastFrame: Bool? = nil, safetyIdentifier: String? = nil, seed: Int? = nil, serviceTier: String? = nil, tools: [ArkWebSearchTool]? = nil, watermark: Bool? = nil) {
        self.callbackUrl = callbackUrl
        self.cameraFixed = cameraFixed
        self.content = content
        self.draft = draft
        self.duration = duration
        self.executionExpiresAfter = executionExpiresAfter
        self.frames = frames
        self.generateAudio = generateAudio
        self.model = model
        self.omniReferenceTaskType = omniReferenceTaskType
        self.outputFormat = outputFormat
        self.priority = priority
        self.ratio = ratio
        self.resolution = resolution
        self.returnLastFrame = returnLastFrame
        self.safetyIdentifier = safetyIdentifier
        self.seed = seed
        self.serviceTier = serviceTier
        self.tools = tools
        self.watermark = watermark
    }
}

public struct BytedanceVideoGenerationTask: Codable {
    public let content: ArkVideoTaskContent?
    public let createdAt: Int?
    public let draft: Bool?
    public let duration: Int?
    public let error: ProviderTaskError?
    public let executionExpiresAfter: Int?
    public let frames: Int?
    public let framespersecond: Int?
    public let generateAudio: Bool?
    public let id: String?
    public let model: String?
    public let outputFormat: String?
    public let priority: Int?
    public let ratio: String?
    public let resolution: String?
    public let safetyIdentifier: String?
    public let seed: Int?
    public let serviceTier: String?
    public let status: String?
    public let tools: [ArkWebSearchTool]?
    public let updatedAt: Int?
    public let usage: ArkVideoUsage?


    public init(content: ArkVideoTaskContent? = nil, createdAt: Int? = nil, draft: Bool? = nil, duration: Int? = nil, error: ProviderTaskError? = nil, executionExpiresAfter: Int? = nil, frames: Int? = nil, framespersecond: Int? = nil, generateAudio: Bool? = nil, id: String? = nil, model: String? = nil, outputFormat: String? = nil, priority: Int? = nil, ratio: String? = nil, resolution: String? = nil, safetyIdentifier: String? = nil, seed: Int? = nil, serviceTier: String? = nil, status: String? = nil, tools: [ArkWebSearchTool]? = nil, updatedAt: Int? = nil, usage: ArkVideoUsage? = nil) {
        self.content = content
        self.createdAt = createdAt
        self.draft = draft
        self.duration = duration
        self.error = error
        self.executionExpiresAfter = executionExpiresAfter
        self.frames = frames
        self.framespersecond = framespersecond
        self.generateAudio = generateAudio
        self.id = id
        self.model = model
        self.outputFormat = outputFormat
        self.priority = priority
        self.ratio = ratio
        self.resolution = resolution
        self.safetyIdentifier = safetyIdentifier
        self.seed = seed
        self.serviceTier = serviceTier
        self.status = status
        self.tools = tools
        self.updatedAt = updatedAt
        self.usage = usage
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

public struct ElevenLabsAudioEffects: Codable {
    public let backgroundNoiseId: String?
    public let distance: Double?
    public let environmentId: String?
    public let filterPresetId: String?
    public let pan: Double?
    public let sendLevel: Double?


    public init(backgroundNoiseId: String? = nil, distance: Double? = nil, environmentId: String? = nil, filterPresetId: String? = nil, pan: Double? = nil, sendLevel: Double? = nil) {
        self.backgroundNoiseId = backgroundNoiseId
        self.distance = distance
        self.environmentId = environmentId
        self.filterPresetId = filterPresetId
        self.pan = pan
        self.sendLevel = sendLevel
    }
}

public struct ElevenLabsCompositionPlan: Codable {
    public let chunks: [[String: String]]?


    public init(chunks: [[String: String]]? = nil) {
        self.chunks = chunks
    }
}

public struct ElevenLabsMusicGenerationRequest: Codable {
    public let compositionPlan: ElevenLabsMusicPrompt?
    public let finetuneId: String?
    public let finetuneStrength: Double?
    public let forceInstrumental: Bool?
    public let generationMode: String?
    public let lyricsText: String?
    public let modelId: String?
    public let musicLengthMs: Int?
    public let musicPrompt: ElevenLabsMusicPrompt?
    public let prompt: String?
    public let respectSectionsDurations: Bool?
    public let seed: Int?
    public let signWithC2pa: Bool?
    public let storeForInpainting: Bool?
    public let usePhoneticNames: Bool?


    public init(compositionPlan: ElevenLabsMusicPrompt? = nil, finetuneId: String? = nil, finetuneStrength: Double? = nil, forceInstrumental: Bool? = nil, generationMode: String? = nil, lyricsText: String? = nil, modelId: String? = nil, musicLengthMs: Int? = nil, musicPrompt: ElevenLabsMusicPrompt? = nil, prompt: String? = nil, respectSectionsDurations: Bool? = nil, seed: Int? = nil, signWithC2pa: Bool? = nil, storeForInpainting: Bool? = nil, usePhoneticNames: Bool? = nil) {
        self.compositionPlan = compositionPlan
        self.finetuneId = finetuneId
        self.finetuneStrength = finetuneStrength
        self.forceInstrumental = forceInstrumental
        self.generationMode = generationMode
        self.lyricsText = lyricsText
        self.modelId = modelId
        self.musicLengthMs = musicLengthMs
        self.musicPrompt = musicPrompt
        self.prompt = prompt
        self.respectSectionsDurations = respectSectionsDurations
        self.seed = seed
        self.signWithC2pa = signWithC2pa
        self.storeForInpainting = storeForInpainting
        self.usePhoneticNames = usePhoneticNames
    }
}

public struct ElevenLabsMusicPrompt: Codable {
    public let negativeGlobalStyles: [String]?
    public let positiveGlobalStyles: [String]?
    public let sections: [[String: String]]?


    public init(negativeGlobalStyles: [String]? = nil, positiveGlobalStyles: [String]? = nil, sections: [[String: String]]? = nil) {
        self.negativeGlobalStyles = negativeGlobalStyles
        self.positiveGlobalStyles = positiveGlobalStyles
        self.sections = sections
    }
}

public struct ElevenLabsPronunciationDictionaryLocator: Codable {
    public let pronunciationDictionaryId: String?
    public let versionId: String?


    public init(pronunciationDictionaryId: String? = nil, versionId: String? = nil) {
        self.pronunciationDictionaryId = pronunciationDictionaryId
        self.versionId = versionId
    }
}

public struct ElevenLabsSoundGenerationRequest: Codable {
    public let durationSeconds: Double?
    public let loop: Bool?
    public let modelId: String?
    public let promptInfluence: Double?
    public let text: String?


    public init(durationSeconds: Double? = nil, loop: Bool? = nil, modelId: String? = nil, promptInfluence: Double? = nil, text: String? = nil) {
        self.durationSeconds = durationSeconds
        self.loop = loop
        self.modelId = modelId
        self.promptInfluence = promptInfluence
        self.text = text
    }
}

public struct ElevenLabsSoundGenerationResponse: Codable {
    public let audio: [String: Any]?
    public let audioUrl: String?
    public let id: String?
    public let status: String?
    public let url: String?


    public init(audio: [String: Any]? = nil, audioUrl: String? = nil, id: String? = nil, status: String? = nil, url: String? = nil) {
        self.audio = audio
        self.audioUrl = audioUrl
        self.id = id
        self.status = status
        self.url = url
    }
}

public struct ElevenLabsTextToSpeechRequest: Codable {
    public let applyLanguageTextNormalization: Bool?
    public let applyTextNormalization: String?
    public let audioEffects: ElevenLabsAudioEffects?
    public let languageCode: String?
    public let modelId: String?
    public let nextRequestIds: [String]?
    public let nextText: String?
    public let previousRequestIds: [String]?
    public let previousText: String?
    public let pronunciationDictionaryLocators: [ElevenLabsPronunciationDictionaryLocator]?
    public let seed: Int?
    public let text: String?
    public let usePvcAsIvc: Bool?
    public let voiceSettings: ElevenLabsVoiceSettings?


    public init(applyLanguageTextNormalization: Bool? = nil, applyTextNormalization: String? = nil, audioEffects: ElevenLabsAudioEffects? = nil, languageCode: String? = nil, modelId: String? = nil, nextRequestIds: [String]? = nil, nextText: String? = nil, previousRequestIds: [String]? = nil, previousText: String? = nil, pronunciationDictionaryLocators: [ElevenLabsPronunciationDictionaryLocator]? = nil, seed: Int? = nil, text: String? = nil, usePvcAsIvc: Bool? = nil, voiceSettings: ElevenLabsVoiceSettings? = nil) {
        self.applyLanguageTextNormalization = applyLanguageTextNormalization
        self.applyTextNormalization = applyTextNormalization
        self.audioEffects = audioEffects
        self.languageCode = languageCode
        self.modelId = modelId
        self.nextRequestIds = nextRequestIds
        self.nextText = nextText
        self.previousRequestIds = previousRequestIds
        self.previousText = previousText
        self.pronunciationDictionaryLocators = pronunciationDictionaryLocators
        self.seed = seed
        self.text = text
        self.usePvcAsIvc = usePvcAsIvc
        self.voiceSettings = voiceSettings
    }
}

public struct ElevenLabsTextToSpeechResponse: Codable {
    public let audioUrl: String?
    public let id: String?
    public let status: String?
    public let url: String?


    public init(audioUrl: String? = nil, id: String? = nil, status: String? = nil, url: String? = nil) {
        self.audioUrl = audioUrl
        self.id = id
        self.status = status
        self.url = url
    }
}

public struct ElevenLabsVoiceSettings: Codable {
    public let cloneStrength: Double?
    public let similarityBoost: Double?
    public let speed: Double?
    public let stability: Double?
    public let style: Double?
    public let useSpeakerBoost: Bool?


    public init(cloneStrength: Double? = nil, similarityBoost: Double? = nil, speed: Double? = nil, stability: Double? = nil, style: Double? = nil, useSpeakerBoost: Bool? = nil) {
        self.cloneStrength = cloneStrength
        self.similarityBoost = similarityBoost
        self.speed = speed
        self.stability = stability
        self.style = style
        self.useSpeakerBoost = useSpeakerBoost
    }
}

public struct GeminiImageGenerationRequest: Codable {
    public let instances: [[String: String]]?
    public let parameters: [String: String]?


    public init(instances: [[String: String]]? = nil, parameters: [String: String]? = nil) {
        self.instances = instances
        self.parameters = parameters
    }
}

public struct GeminiImageGenerationResponse: Codable {
    public let error: [String: String]?
    public let predictions: [[String: String]]?


    public init(error: [String: String]? = nil, predictions: [[String: String]]? = nil) {
        self.error = error
        self.predictions = predictions
    }
}

public struct GeminiVideoGenerationRequest: Codable {
    public let instances: [[String: String]]?
    public let parameters: [String: String]?


    public init(instances: [[String: String]]? = nil, parameters: [String: String]? = nil) {
        self.instances = instances
        self.parameters = parameters
    }
}

public struct GeminiVideoOperation: Codable {
    public let done: Bool?
    public let error: [String: String]?
    public let name: String?
    public let response: [String: String]?


    public init(done: Bool? = nil, error: [String: String]? = nil, name: String? = nil, response: [String: String]? = nil) {
        self.done = done
        self.error = error
        self.name = name
        self.response = response
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
    public let embedContentConfig: [String: String]?
    public let model: String?
    public let outputDimensionality: Int?
    public let taskType: String?
    public let title: String?


    public init(content: GoogleContent? = nil, embedContentConfig: [String: String]? = nil, model: String? = nil, outputDimensionality: Int? = nil, taskType: String? = nil, title: String? = nil) {
        self.content = content
        self.embedContentConfig = embedContentConfig
        self.model = model
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
    public let continuationToken: String?
    public let generationConfig: GoogleGenerationConfig?
    public let labels: [String: String]?
    public let model: String?
    public let safetySettings: [GoogleSafetySetting]?
    public let serviceTier: String?
    public let store: Bool?
    public let systemInstruction: GoogleContent?
    public let toolConfig: GoogleToolConfig?
    public let tools: [GoogleTool]?


    public init(cachedContent: String? = nil, contents: [GoogleContent]? = nil, continuationToken: String? = nil, generationConfig: GoogleGenerationConfig? = nil, labels: [String: String]? = nil, model: String? = nil, safetySettings: [GoogleSafetySetting]? = nil, serviceTier: String? = nil, store: Bool? = nil, systemInstruction: GoogleContent? = nil, toolConfig: GoogleToolConfig? = nil, tools: [GoogleTool]? = nil) {
        self.cachedContent = cachedContent
        self.contents = contents
        self.continuationToken = continuationToken
        self.generationConfig = generationConfig
        self.labels = labels
        self.model = model
        self.safetySettings = safetySettings
        self.serviceTier = serviceTier
        self.store = store
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
    public let audioTranscriptionConfig: [String: String]?
    public let candidateCount: Int?
    public let enableAffectiveDialog: Bool?
    public let enableEnhancedCivicAnswers: Bool?
    public let frequencyPenalty: Double?
    public let imageConfig: [String: String]?
    public let logprobs: Int?
    public let maxOutputTokens: Int?
    public let mediaResolution: String?
    public let presencePenalty: Double?
    public let responseFormat: [String: String]?
    public let responseJsonSchema: String?
    public let responseLogprobs: Bool?
    public let responseMimeType: String?
    public let responseModalities: [String]?
    public let responseSchema: GoogleSchema?
    public let seed: Int?
    public let speechConfig: [String: String]?
    public let stopSequences: [String]?
    public let temperature: Double?
    public let thinkingConfig: GoogleThinkingConfig?
    public let topK: Int?
    public let topP: Double?
    public let translationConfig: [String: String]?


    public init(audioTranscriptionConfig: [String: String]? = nil, candidateCount: Int? = nil, enableAffectiveDialog: Bool? = nil, enableEnhancedCivicAnswers: Bool? = nil, frequencyPenalty: Double? = nil, imageConfig: [String: String]? = nil, logprobs: Int? = nil, maxOutputTokens: Int? = nil, mediaResolution: String? = nil, presencePenalty: Double? = nil, responseFormat: [String: String]? = nil, responseJsonSchema: String? = nil, responseLogprobs: Bool? = nil, responseMimeType: String? = nil, responseModalities: [String]? = nil, responseSchema: GoogleSchema? = nil, seed: Int? = nil, speechConfig: [String: String]? = nil, stopSequences: [String]? = nil, temperature: Double? = nil, thinkingConfig: GoogleThinkingConfig? = nil, topK: Int? = nil, topP: Double? = nil, translationConfig: [String: String]? = nil) {
        self.audioTranscriptionConfig = audioTranscriptionConfig
        self.candidateCount = candidateCount
        self.enableAffectiveDialog = enableAffectiveDialog
        self.enableEnhancedCivicAnswers = enableEnhancedCivicAnswers
        self.frequencyPenalty = frequencyPenalty
        self.imageConfig = imageConfig
        self.logprobs = logprobs
        self.maxOutputTokens = maxOutputTokens
        self.mediaResolution = mediaResolution
        self.presencePenalty = presencePenalty
        self.responseFormat = responseFormat
        self.responseJsonSchema = responseJsonSchema
        self.responseLogprobs = responseLogprobs
        self.responseMimeType = responseMimeType
        self.responseModalities = responseModalities
        self.responseSchema = responseSchema
        self.seed = seed
        self.speechConfig = speechConfig
        self.stopSequences = stopSequences
        self.temperature = temperature
        self.thinkingConfig = thinkingConfig
        self.topK = topK
        self.topP = topP
        self.translationConfig = translationConfig
    }
}

public struct GooglePart: Codable {
    public let audioTranscription: [String: String]?
    public let codeExecutionResult: GoogleCodeExecutionResult?
    public let executableCode: GoogleExecutableCode?
    public let fileData: GoogleFileData?
    public let functionCall: GoogleFunctionCall?
    public let functionResponse: GoogleFunctionResponse?
    public let inlineData: GoogleBlob?
    public let mediaProcessing: String?
    public let mediaResolution: [String: String]?
    public let partMetadata: [String: String]?
    public let speechMetadata: [String: String]?
    public let text: String?
    public let thought: Bool?
    public let thoughtSignature: String?
    public let toolCall: [String: String]?
    public let toolResponse: [String: String]?
    public let videoMetadata: [String: String]?


    public init(audioTranscription: [String: String]? = nil, codeExecutionResult: GoogleCodeExecutionResult? = nil, executableCode: GoogleExecutableCode? = nil, fileData: GoogleFileData? = nil, functionCall: GoogleFunctionCall? = nil, functionResponse: GoogleFunctionResponse? = nil, inlineData: GoogleBlob? = nil, mediaProcessing: String? = nil, mediaResolution: [String: String]? = nil, partMetadata: [String: String]? = nil, speechMetadata: [String: String]? = nil, text: String? = nil, thought: Bool? = nil, thoughtSignature: String? = nil, toolCall: [String: String]? = nil, toolResponse: [String: String]? = nil, videoMetadata: [String: String]? = nil) {
        self.audioTranscription = audioTranscription
        self.codeExecutionResult = codeExecutionResult
        self.executableCode = executableCode
        self.fileData = fileData
        self.functionCall = functionCall
        self.functionResponse = functionResponse
        self.inlineData = inlineData
        self.mediaProcessing = mediaProcessing
        self.mediaResolution = mediaResolution
        self.partMetadata = partMetadata
        self.speechMetadata = speechMetadata
        self.text = text
        self.thought = thought
        self.thoughtSignature = thoughtSignature
        self.toolCall = toolCall
        self.toolResponse = toolResponse
        self.videoMetadata = videoMetadata
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
    public let computerUse: [String: String]?
    public let fileSearch: [String: String]?
    public let functionDeclarations: [GoogleFunctionDeclaration]?
    public let googleMaps: [String: String]?
    public let googleSearch: GoogleSearchTool?
    public let googleSearchRetrieval: [String: String]?
    public let mcpServers: [[String: String]]?
    public let urlContext: GoogleUrlContextTool?


    public init(codeExecution: GoogleCodeExecutionTool? = nil, computerUse: [String: String]? = nil, fileSearch: [String: String]? = nil, functionDeclarations: [GoogleFunctionDeclaration]? = nil, googleMaps: [String: String]? = nil, googleSearch: GoogleSearchTool? = nil, googleSearchRetrieval: [String: String]? = nil, mcpServers: [[String: String]]? = nil, urlContext: GoogleUrlContextTool? = nil) {
        self.codeExecution = codeExecution
        self.computerUse = computerUse
        self.fileSearch = fileSearch
        self.functionDeclarations = functionDeclarations
        self.googleMaps = googleMaps
        self.googleSearch = googleSearch
        self.googleSearchRetrieval = googleSearchRetrieval
        self.mcpServers = mcpServers
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

public struct JimengVideoGenerationRequest: Codable {
    public let callbackUrl: String?
    public let duration: Int?
    public let fps: Int?
    public let image: String?
    public let model: String?
    public let prompt: String?
    public let ratio: String?
    public let seed: Int?


    public init(callbackUrl: String? = nil, duration: Int? = nil, fps: Int? = nil, image: String? = nil, model: String? = nil, prompt: String? = nil, ratio: String? = nil, seed: Int? = nil) {
        self.callbackUrl = callbackUrl
        self.duration = duration
        self.fps = fps
        self.image = image
        self.model = model
        self.prompt = prompt
        self.ratio = ratio
        self.seed = seed
    }
}

public struct JimengVideoGenerationTask: Codable {
    public let createdAt: Int?
    public let error: [String: String]?
    public let id: String?
    public let status: String?
    public let taskId: String?
    public let videoUrl: String?


    public init(createdAt: Int? = nil, error: [String: String]? = nil, id: String? = nil, status: String? = nil, taskId: String? = nil, videoUrl: String? = nil) {
        self.createdAt = createdAt
        self.error = error
        self.id = id
        self.status = status
        self.taskId = taskId
        self.videoUrl = videoUrl
    }
}

public struct KlingAudioTask: Codable {
    public let code: Int?
    public let data: [String: String]?
    public let message: String?
    public let requestId: String?


    public init(code: Int? = nil, data: [String: String]? = nil, message: String? = nil, requestId: String? = nil) {
        self.code = code
        self.data = data
        self.message = message
        self.requestId = requestId
    }
}

public struct KlingAvatarCreateRequest: Codable {
    public let audioUrl: String?
    public let callbackUrl: String?
    public let humanImage: String?
    public let modelName: String?
    public let prompt: String?
    public let text: String?
    public let voiceId: String?
    public let voiceLanguage: String?
    public let voiceMode: String?


    public init(audioUrl: String? = nil, callbackUrl: String? = nil, humanImage: String? = nil, modelName: String? = nil, prompt: String? = nil, text: String? = nil, voiceId: String? = nil, voiceLanguage: String? = nil, voiceMode: String? = nil) {
        self.audioUrl = audioUrl
        self.callbackUrl = callbackUrl
        self.humanImage = humanImage
        self.modelName = modelName
        self.prompt = prompt
        self.text = text
        self.voiceId = voiceId
        self.voiceLanguage = voiceLanguage
        self.voiceMode = voiceMode
    }
}

public struct KlingElementReference: Codable {
    public let elementId: Int?


    public init(elementId: Int? = nil) {
        self.elementId = elementId
    }
}

public struct KlingImageGenerationRequest: Codable {
    public let aspectRatio: String?
    public let callbackUrl: String?
    public let elementList: [KlingElementReference]?
    public let externalTaskId: String?
    public let humanFidelity: Double?
    public let image: String?
    public let imageFidelity: Double?
    public let imageReference: String?
    public let modelName: String?
    public let n: Int?
    public let negativePrompt: String?
    public let prompt: String?
    public let resolution: String?
    public let watermarkInfo: KlingWatermarkInfo?


    public init(aspectRatio: String? = nil, callbackUrl: String? = nil, elementList: [KlingElementReference]? = nil, externalTaskId: String? = nil, humanFidelity: Double? = nil, image: String? = nil, imageFidelity: Double? = nil, imageReference: String? = nil, modelName: String? = nil, n: Int? = nil, negativePrompt: String? = nil, prompt: String? = nil, resolution: String? = nil, watermarkInfo: KlingWatermarkInfo? = nil) {
        self.aspectRatio = aspectRatio
        self.callbackUrl = callbackUrl
        self.elementList = elementList
        self.externalTaskId = externalTaskId
        self.humanFidelity = humanFidelity
        self.image = image
        self.imageFidelity = imageFidelity
        self.imageReference = imageReference
        self.modelName = modelName
        self.n = n
        self.negativePrompt = negativePrompt
        self.prompt = prompt
        self.resolution = resolution
        self.watermarkInfo = watermarkInfo
    }
}

public struct KlingImageGenerationTask: Codable {
    public let code: Int?
    public let data: KlingImageTaskData?
    public let message: String?
    public let requestId: String?


    public init(code: Int? = nil, data: KlingImageTaskData? = nil, message: String? = nil, requestId: String? = nil) {
        self.code = code
        self.data = data
        self.message = message
        self.requestId = requestId
    }
}

public struct KlingImageResult: Codable {
    public let index: Int?
    public let url: String?


    public init(index: Int? = nil, url: String? = nil) {
        self.index = index
        self.url = url
    }
}

public struct KlingImageTaskData: Codable {
    public let createdAt: Int?
    public let taskId: String?
    public let taskInfo: [String: String]?
    public let taskResult: KlingImageTaskResult?
    public let taskStatus: String?
    public let taskStatusMsg: String?
    public let updatedAt: Int?


    public init(createdAt: Int? = nil, taskId: String? = nil, taskInfo: [String: String]? = nil, taskResult: KlingImageTaskResult? = nil, taskStatus: String? = nil, taskStatusMsg: String? = nil, updatedAt: Int? = nil) {
        self.createdAt = createdAt
        self.taskId = taskId
        self.taskInfo = taskInfo
        self.taskResult = taskResult
        self.taskStatus = taskStatus
        self.taskStatusMsg = taskStatusMsg
        self.updatedAt = updatedAt
    }
}

public struct KlingImageTaskResult: Codable {
    public let images: [KlingImageResult]?


    public init(images: [KlingImageResult]? = nil) {
        self.images = images
    }
}

public struct KlingMotionControlRequest: Codable {
    public let callbackUrl: String?
    public let image: String?
    public let modelName: String?
    public let prompt: String?
    public let video: String?


    public init(callbackUrl: String? = nil, image: String? = nil, modelName: String? = nil, prompt: String? = nil, video: String? = nil) {
        self.callbackUrl = callbackUrl
        self.image = image
        self.modelName = modelName
        self.prompt = prompt
        self.video = video
    }
}

public struct KlingSoundGenerationRequest: Codable {
    public let callbackUrl: String?
    public let duration: Double?
    public let externalTaskId: String?
    public let prompt: String?


    public init(callbackUrl: String? = nil, duration: Double? = nil, externalTaskId: String? = nil, prompt: String? = nil) {
        self.callbackUrl = callbackUrl
        self.duration = duration
        self.externalTaskId = externalTaskId
        self.prompt = prompt
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

public struct KlingVideoToAudioRequest: Codable {
    public let asmrMode: Bool?
    public let bgmPrompt: String?
    public let callbackUrl: String?
    public let externalTaskId: String?
    public let soundEffectPrompt: String?
    public let videoId: String?
    public let videoUrl: String?


    public init(asmrMode: Bool? = nil, bgmPrompt: String? = nil, callbackUrl: String? = nil, externalTaskId: String? = nil, soundEffectPrompt: String? = nil, videoId: String? = nil, videoUrl: String? = nil) {
        self.asmrMode = asmrMode
        self.bgmPrompt = bgmPrompt
        self.callbackUrl = callbackUrl
        self.externalTaskId = externalTaskId
        self.soundEffectPrompt = soundEffectPrompt
        self.videoId = videoId
        self.videoUrl = videoUrl
    }
}

public struct KlingWatermarkInfo: Codable {
    public let enabled: Bool?


    public init(enabled: Bool? = nil) {
        self.enabled = enabled
    }
}

public struct LumaConcept: Codable {
    public let key: String?


    public init(key: String? = nil) {
        self.key = key
    }
}

public struct LumaGenerationAssets: Codable {
    public let image: String?
    public let video: String?


    public init(image: String? = nil, video: String? = nil) {
        self.image = image
        self.video = video
    }
}

public struct LumaKeyframe: Codable {
    public let id: String?
    public let type: String?
    public let url: String?


    public init(id: String? = nil, type: String? = nil, url: String? = nil) {
        self.id = id
        self.type = type
        self.url = url
    }
}

public struct LumaKeyframes: Codable {
    public let frame0: LumaKeyframe?
    public let frame1: LumaKeyframe?


    public init(frame0: LumaKeyframe? = nil, frame1: LumaKeyframe? = nil) {
        self.frame0 = frame0
        self.frame1 = frame1
    }
}

public struct LumaVideoGenerationRequest: Codable {
    public let aspectRatio: String?
    public let callbackUrl: String?
    public let concepts: [LumaConcept]?
    public let duration: String?
    public let generationType: String?
    public let keyframes: LumaKeyframes?
    public let loop: Bool?
    public let model: String?
    public let prompt: String?
    public let resolution: String?


    public init(aspectRatio: String? = nil, callbackUrl: String? = nil, concepts: [LumaConcept]? = nil, duration: String? = nil, generationType: String? = nil, keyframes: LumaKeyframes? = nil, loop: Bool? = nil, model: String? = nil, prompt: String? = nil, resolution: String? = nil) {
        self.aspectRatio = aspectRatio
        self.callbackUrl = callbackUrl
        self.concepts = concepts
        self.duration = duration
        self.generationType = generationType
        self.keyframes = keyframes
        self.loop = loop
        self.model = model
        self.prompt = prompt
        self.resolution = resolution
    }
}

public struct LumaVideoGenerationTask: Codable {
    public let assets: LumaGenerationAssets?
    public let createdAt: String?
    public let failureReason: String?
    public let generationType: String?
    public let id: String?
    public let model: String?
    public let request: [String: String]?
    public let state: String?


    public init(assets: LumaGenerationAssets? = nil, createdAt: String? = nil, failureReason: String? = nil, generationType: String? = nil, id: String? = nil, model: String? = nil, request: [String: String]? = nil, state: String? = nil) {
        self.assets = assets
        self.createdAt = createdAt
        self.failureReason = failureReason
        self.generationType = generationType
        self.id = id
        self.model = model
        self.request = request
        self.state = state
    }
}

public struct MiniMaxMusicAudioSetting: Codable {
    public let bitrate: Int?
    public let format: String?
    public let sampleRate: Int?


    public init(bitrate: Int? = nil, format: String? = nil, sampleRate: Int? = nil) {
        self.bitrate = bitrate
        self.format = format
        self.sampleRate = sampleRate
    }
}

public struct MiniMaxMusicBaseResp: Codable {
    public let statusCode: Int?
    public let statusMsg: String?


    public init(statusCode: Int? = nil, statusMsg: String? = nil) {
        self.statusCode = statusCode
        self.statusMsg = statusMsg
    }
}

public struct MiniMaxMusicData: Codable {
    public let audio: String?
    public let extraInfo: MiniMaxMusicExtraInfo?
    public let status: Int?


    public init(audio: String? = nil, extraInfo: MiniMaxMusicExtraInfo? = nil, status: Int? = nil) {
        self.audio = audio
        self.extraInfo = extraInfo
        self.status = status
    }
}

public struct MiniMaxMusicExtraInfo: Codable {
    public let bitrate: Int?
    public let musicChannel: Int?
    public let musicDuration: Double?
    public let musicSampleRate: Int?
    public let musicSize: Int?


    public init(bitrate: Int? = nil, musicChannel: Int? = nil, musicDuration: Double? = nil, musicSampleRate: Int? = nil, musicSize: Int? = nil) {
        self.bitrate = bitrate
        self.musicChannel = musicChannel
        self.musicDuration = musicDuration
        self.musicSampleRate = musicSampleRate
        self.musicSize = musicSize
    }
}

public struct MiniMaxMusicGenerationRequest: Codable {
    public let audioBase64: String?
    public let audioSetting: MiniMaxMusicAudioSetting?
    public let audioUrl: String?
    public let coverFeatureId: String?
    public let isInstrumental: Bool?
    public let lyrics: String?
    public let lyricsOptimizer: Bool?
    public let model: String?
    public let outputFormat: String?
    public let prompt: String?
    public let stream: Bool?


    public init(audioBase64: String? = nil, audioSetting: MiniMaxMusicAudioSetting? = nil, audioUrl: String? = nil, coverFeatureId: String? = nil, isInstrumental: Bool? = nil, lyrics: String? = nil, lyricsOptimizer: Bool? = nil, model: String? = nil, outputFormat: String? = nil, prompt: String? = nil, stream: Bool? = nil) {
        self.audioBase64 = audioBase64
        self.audioSetting = audioSetting
        self.audioUrl = audioUrl
        self.coverFeatureId = coverFeatureId
        self.isInstrumental = isInstrumental
        self.lyrics = lyrics
        self.lyricsOptimizer = lyricsOptimizer
        self.model = model
        self.outputFormat = outputFormat
        self.prompt = prompt
        self.stream = stream
    }
}

public struct MiniMaxMusicGenerationResponse: Codable {
    public let baseResp: MiniMaxMusicBaseResp?
    public let data: MiniMaxMusicData?
    public let traceId: String?


    public init(baseResp: MiniMaxMusicBaseResp? = nil, data: MiniMaxMusicData? = nil, traceId: String? = nil) {
        self.baseResp = baseResp
        self.data = data
        self.traceId = traceId
    }
}

public struct MinimaxBaseResp: Codable {
    public let statusCode: Int?
    public let statusMsg: String?


    public init(statusCode: Int? = nil, statusMsg: String? = nil) {
        self.statusCode = statusCode
        self.statusMsg = statusMsg
    }
}

public struct MinimaxFileRetrieveResponse: Codable {
    public let baseResp: MinimaxBaseResp?
    public let file: [String: String]?


    public init(baseResp: MinimaxBaseResp? = nil, file: [String: String]? = nil) {
        self.baseResp = baseResp
        self.file = file
    }
}

public struct MinimaxImageData: Codable {
    public let imageBase64: [String]?
    public let imageUrls: [String]?


    public init(imageBase64: [String]? = nil, imageUrls: [String]? = nil) {
        self.imageBase64 = imageBase64
        self.imageUrls = imageUrls
    }
}

public struct MinimaxImageGenerationRequest: Codable {
    public let aspectRatio: String?
    public let height: Int?
    public let model: String?
    public let n: Int?
    public let prompt: String?
    public let promptOptimizer: Bool?
    public let responseFormat: String?
    public let seed: Int?
    public let subjectReference: [[String: String]]?
    public let width: Int?


    public init(aspectRatio: String? = nil, height: Int? = nil, model: String? = nil, n: Int? = nil, prompt: String? = nil, promptOptimizer: Bool? = nil, responseFormat: String? = nil, seed: Int? = nil, subjectReference: [[String: String]]? = nil, width: Int? = nil) {
        self.aspectRatio = aspectRatio
        self.height = height
        self.model = model
        self.n = n
        self.prompt = prompt
        self.promptOptimizer = promptOptimizer
        self.responseFormat = responseFormat
        self.seed = seed
        self.subjectReference = subjectReference
        self.width = width
    }
}

public struct MinimaxImageGenerationResponse: Codable {
    public let baseResp: MinimaxBaseResp?
    public let data: MinimaxImageData?
    public let id: String?
    public let metadata: [String: String]?


    public init(baseResp: MinimaxBaseResp? = nil, data: MinimaxImageData? = nil, id: String? = nil, metadata: [String: String]? = nil) {
        self.baseResp = baseResp
        self.data = data
        self.id = id
        self.metadata = metadata
    }
}

public struct MinimaxStreamOptions: Codable {
    public let excludeAggregatedAudio: Bool?


    public init(excludeAggregatedAudio: Bool? = nil) {
        self.excludeAggregatedAudio = excludeAggregatedAudio
    }
}

public struct MinimaxTextToSpeechRequest: Codable {
    public let audioSetting: [String: String]?
    public let languageBoost: String?
    public let model: String?
    public let outputFormat: String?
    public let pronunciationDict: [String: String]?
    public let stream: Bool?
    public let streamOptions: MinimaxStreamOptions?
    public let subtitleEnable: Bool?
    public let subtitleType: String?
    public let text: String?
    public let textNormalizationMode: String?
    public let timbreWeights: [MinimaxTimbreWeight]?
    public let voiceModify: MinimaxVoiceModify?
    public let voiceSetting: [String: String]?


    public init(audioSetting: [String: String]? = nil, languageBoost: String? = nil, model: String? = nil, outputFormat: String? = nil, pronunciationDict: [String: String]? = nil, stream: Bool? = nil, streamOptions: MinimaxStreamOptions? = nil, subtitleEnable: Bool? = nil, subtitleType: String? = nil, text: String? = nil, textNormalizationMode: String? = nil, timbreWeights: [MinimaxTimbreWeight]? = nil, voiceModify: MinimaxVoiceModify? = nil, voiceSetting: [String: String]? = nil) {
        self.audioSetting = audioSetting
        self.languageBoost = languageBoost
        self.model = model
        self.outputFormat = outputFormat
        self.pronunciationDict = pronunciationDict
        self.stream = stream
        self.streamOptions = streamOptions
        self.subtitleEnable = subtitleEnable
        self.subtitleType = subtitleType
        self.text = text
        self.textNormalizationMode = textNormalizationMode
        self.timbreWeights = timbreWeights
        self.voiceModify = voiceModify
        self.voiceSetting = voiceSetting
    }
}

public struct MinimaxTextToSpeechResponse: Codable {
    public let baseResp: MinimaxBaseResp?
    public let data: [String: String]?
    public let extraInfo: [String: String]?
    public let traceId: String?


    public init(baseResp: MinimaxBaseResp? = nil, data: [String: String]? = nil, extraInfo: [String: String]? = nil, traceId: String? = nil) {
        self.baseResp = baseResp
        self.data = data
        self.extraInfo = extraInfo
        self.traceId = traceId
    }
}

public struct MinimaxTimbreWeight: Codable {
    public let voiceId: String?
    public let weight: Int?


    public init(voiceId: String? = nil, weight: Int? = nil) {
        self.voiceId = voiceId
        self.weight = weight
    }
}

public struct MinimaxVideoGenerationRequest: Codable {
    public let callbackUrl: String?
    public let duration: Int?
    public let fastPretreatment: Bool?
    public let firstFrameImage: String?
    public let lastFrameImage: String?
    public let model: String?
    public let prompt: String?
    public let promptOptimizer: Bool?
    public let resolution: String?


    public init(callbackUrl: String? = nil, duration: Int? = nil, fastPretreatment: Bool? = nil, firstFrameImage: String? = nil, lastFrameImage: String? = nil, model: String? = nil, prompt: String? = nil, promptOptimizer: Bool? = nil, resolution: String? = nil) {
        self.callbackUrl = callbackUrl
        self.duration = duration
        self.fastPretreatment = fastPretreatment
        self.firstFrameImage = firstFrameImage
        self.lastFrameImage = lastFrameImage
        self.model = model
        self.prompt = prompt
        self.promptOptimizer = promptOptimizer
        self.resolution = resolution
    }
}

public struct MinimaxVideoGenerationTask: Codable {
    public let baseResp: MinimaxBaseResp?
    public let fileId: String?
    public let status: String?
    public let taskId: String?
    public let videoHeight: Int?
    public let videoWidth: Int?


    public init(baseResp: MinimaxBaseResp? = nil, fileId: String? = nil, status: String? = nil, taskId: String? = nil, videoHeight: Int? = nil, videoWidth: Int? = nil) {
        self.baseResp = baseResp
        self.fileId = fileId
        self.status = status
        self.taskId = taskId
        self.videoHeight = videoHeight
        self.videoWidth = videoWidth
    }
}

public struct MinimaxVoiceModify: Codable {
    public let intensity: Int?
    public let pitch: Int?
    public let soundEffects: String?
    public let timbre: Int?


    public init(intensity: Int? = nil, pitch: Int? = nil, soundEffects: String? = nil, timbre: Int? = nil) {
        self.intensity = intensity
        self.pitch = pitch
        self.soundEffects = soundEffects
        self.timbre = timbre
    }
}

public struct MurekaMusicGenerationRequest: Codable {
    public let callbackUrl: String?
    public let duration: Int?
    public let lyrics: String?
    public let model: String?
    public let prompt: String?
    public let referenceAudioUrl: String?
    public let tags: [String]?
    public let title: String?


    public init(callbackUrl: String? = nil, duration: Int? = nil, lyrics: String? = nil, model: String? = nil, prompt: String? = nil, referenceAudioUrl: String? = nil, tags: [String]? = nil, title: String? = nil) {
        self.callbackUrl = callbackUrl
        self.duration = duration
        self.lyrics = lyrics
        self.model = model
        self.prompt = prompt
        self.referenceAudioUrl = referenceAudioUrl
        self.tags = tags
        self.title = title
    }
}

public struct MurekaMusicGenerationTask: Codable {
    public let audioUrl: String?
    public let duration: Int?
    public let error: [String: String]?
    public let id: String?
    public let status: String?
    public let taskId: String?
    public let title: String?


    public init(audioUrl: String? = nil, duration: Int? = nil, error: [String: String]? = nil, id: String? = nil, status: String? = nil, taskId: String? = nil, title: String? = nil) {
        self.audioUrl = audioUrl
        self.duration = duration
        self.error = error
        self.id = id
        self.status = status
        self.taskId = taskId
        self.title = title
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
    public let reasoningEffort: String?
    public let responseFormat: String?
    public let temperature: Double?
    public let toolResources: String?
    public let tools: [String]?
    public let topP: Double?


    public init(description: String? = nil, instructions: String? = nil, metadata: [String: String]? = nil, model: String? = nil, name: String? = nil, reasoningEffort: String? = nil, responseFormat: String? = nil, temperature: Double? = nil, toolResources: String? = nil, tools: [String]? = nil, topP: Double? = nil) {
        self.description = description
        self.instructions = instructions
        self.metadata = metadata
        self.model = model
        self.name = name
        self.reasoningEffort = reasoningEffort
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
    public let reasoningEffort: String?
    public let responseFormat: String?
    public let temperature: Double?
    public let toolResources: String?
    public let tools: [String]?
    public let topP: Double?


    public init(description: String? = nil, instructions: String? = nil, metadata: [String: String]? = nil, model: String? = nil, name: String? = nil, reasoningEffort: String? = nil, responseFormat: String? = nil, temperature: Double? = nil, toolResources: String? = nil, tools: [String]? = nil, topP: Double? = nil) {
        self.description = description
        self.instructions = instructions
        self.metadata = metadata
        self.model = model
        self.name = name
        self.reasoningEffort = reasoningEffort
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
    public let outputExpiresAfter: [String: String]?


    public init(completionWindow: String? = nil, endpoint: String? = nil, inputFileId: String? = nil, metadata: [String: String]? = nil, outputExpiresAfter: [String: String]? = nil) {
        self.completionWindow = completionWindow
        self.endpoint = endpoint
        self.inputFileId = inputFileId
        self.metadata = metadata
        self.outputExpiresAfter = outputExpiresAfter
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
    public let streamOptions: OpenAiStreamOptions?
    public let suffix: String?
    public let temperature: Double?
    public let topP: Double?
    public let user: String?


    public init(bestOf: Int? = nil, echo: Bool? = nil, frequencyPenalty: Double? = nil, logitBias: [String: Double]? = nil, logprobs: Int? = nil, maxTokens: Int? = nil, model: String? = nil, n: Int? = nil, presencePenalty: Double? = nil, prompt: String? = nil, seed: Int? = nil, stop: String? = nil, stream: Bool? = nil, streamOptions: OpenAiStreamOptions? = nil, suffix: String? = nil, temperature: Double? = nil, topP: Double? = nil, user: String? = nil) {
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
        self.streamOptions = streamOptions
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
    public let expiresAfter: [String: String]?
    public let fileIds: [String]?
    public let memoryLimit: String?
    public let name: String?
    public let networkPolicy: [String: String]?
    public let skills: [[String: String]]?


    public init(expiresAfter: [String: String]? = nil, fileIds: [String]? = nil, memoryLimit: String? = nil, name: String? = nil, networkPolicy: [String: String]? = nil, skills: [[String: String]]? = nil) {
        self.expiresAfter = expiresAfter
        self.fileIds = fileIds
        self.memoryLimit = memoryLimit
        self.name = name
        self.networkPolicy = networkPolicy
        self.skills = skills
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
    public let items: [[String: String]]?


    public init(items: [[String: String]]? = nil) {
        self.items = items
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

public struct OpenAiDeepSeekWebFetchRequest: Codable {
    public let url: String?


    public init(url: String? = nil) {
        self.url = url
    }
}

public struct OpenAiDeepSeekWebFetchResponse: Codable {
    public let content: String?
    public let title: String?


    public init(content: String? = nil, title: String? = nil) {
        self.content = content
        self.title = title
    }
}

public struct OpenAiDeepSeekWebSearchRequest: Codable {
    public let count: Int?
    public let localization: String?
    public let needContent: Bool?
    public let oriQuestion: String?
    public let query: String?


    public init(count: Int? = nil, localization: String? = nil, needContent: Bool? = nil, oriQuestion: String? = nil, query: String? = nil) {
        self.count = count
        self.localization = localization
        self.needContent = needContent
        self.oriQuestion = oriQuestion
        self.query = query
    }
}

public struct OpenAiDeepSeekWebSearchResponse: Codable {
    public let results: [OpenAiDeepSeekWebSearchResult]?


    public init(results: [OpenAiDeepSeekWebSearchResult]? = nil) {
        self.results = results
    }
}

public struct OpenAiDeepSeekWebSearchResult: Codable {
    public let authority: Int?
    public let content: String?
    public let date: String?
    public let rerankScore: Double?
    public let siteIcon: String?
    public let siteName: String?
    public let snippet: String?
    public let summary: String?
    public let title: String?
    public let url: String?


    public init(authority: Int? = nil, content: String? = nil, date: String? = nil, rerankScore: Double? = nil, siteIcon: String? = nil, siteName: String? = nil, snippet: String? = nil, summary: String? = nil, title: String? = nil, url: String? = nil) {
        self.authority = authority
        self.content = content
        self.date = date
        self.rerankScore = rerankScore
        self.siteIcon = siteIcon
        self.siteName = siteName
        self.snippet = snippet
        self.summary = summary
        self.title = title
        self.url = url
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
    public let background: String?
    public let complexity: String?
    public let frameCount: Int?
    public let frameDurationMs: Int?
    public let image: String?
    public let inputFidelity: String?
    public let markup: String?
    public let mask: String?
    public let model: String?
    public let moderation: String?
    public let n: Int?
    public let outputCompression: Int?
    public let outputFormat: String?
    public let partialImages: Int?
    public let prompt: String?
    public let quality: String?
    public let responseFormat: String?
    public let safetyIdentifier: String?
    public let size: String?
    public let stream: Bool?
    public let svg: [String: String]?
    public let user: String?


    public init(background: String? = nil, complexity: String? = nil, frameCount: Int? = nil, frameDurationMs: Int? = nil, image: String? = nil, inputFidelity: String? = nil, markup: String? = nil, mask: String? = nil, model: String? = nil, moderation: String? = nil, n: Int? = nil, outputCompression: Int? = nil, outputFormat: String? = nil, partialImages: Int? = nil, prompt: String? = nil, quality: String? = nil, responseFormat: String? = nil, safetyIdentifier: String? = nil, size: String? = nil, stream: Bool? = nil, svg: [String: String]? = nil, user: String? = nil) {
        self.background = background
        self.complexity = complexity
        self.frameCount = frameCount
        self.frameDurationMs = frameDurationMs
        self.image = image
        self.inputFidelity = inputFidelity
        self.markup = markup
        self.mask = mask
        self.model = model
        self.moderation = moderation
        self.n = n
        self.outputCompression = outputCompression
        self.outputFormat = outputFormat
        self.partialImages = partialImages
        self.prompt = prompt
        self.quality = quality
        self.responseFormat = responseFormat
        self.safetyIdentifier = safetyIdentifier
        self.size = size
        self.stream = stream
        self.svg = svg
        self.user = user
    }
}

public struct OpenAiImageEditRequest: Codable {
    public let background: String?
    public let complexity: String?
    public let frameCount: Int?
    public let frameDurationMs: Int?
    public let images: [OpenAiImageReferenceInput]?
    public let inputFidelity: String?
    public let markup: [String: String]?
    public let mask: [String: String]?
    public let model: String?
    public let moderation: String?
    public let n: Int?
    public let outputCompression: Int?
    public let outputFormat: String?
    public let partialImages: Int?
    public let prompt: String?
    public let quality: String?
    public let safetyIdentifier: String?
    public let size: String?
    public let stream: Bool?
    public let svg: [String: String]?
    public let user: String?


    public init(background: String? = nil, complexity: String? = nil, frameCount: Int? = nil, frameDurationMs: Int? = nil, images: [OpenAiImageReferenceInput]? = nil, inputFidelity: String? = nil, markup: [String: String]? = nil, mask: [String: String]? = nil, model: String? = nil, moderation: String? = nil, n: Int? = nil, outputCompression: Int? = nil, outputFormat: String? = nil, partialImages: Int? = nil, prompt: String? = nil, quality: String? = nil, safetyIdentifier: String? = nil, size: String? = nil, stream: Bool? = nil, svg: [String: String]? = nil, user: String? = nil) {
        self.background = background
        self.complexity = complexity
        self.frameCount = frameCount
        self.frameDurationMs = frameDurationMs
        self.images = images
        self.inputFidelity = inputFidelity
        self.markup = markup
        self.mask = mask
        self.model = model
        self.moderation = moderation
        self.n = n
        self.outputCompression = outputCompression
        self.outputFormat = outputFormat
        self.partialImages = partialImages
        self.prompt = prompt
        self.quality = quality
        self.safetyIdentifier = safetyIdentifier
        self.size = size
        self.stream = stream
        self.svg = svg
        self.user = user
    }
}

public struct OpenAiImageGenerationRequest: Codable {
    public let background: String?
    public let complexity: String?
    public let frameCount: Int?
    public let frameDurationMs: Int?
    public let model: String?
    public let moderation: String?
    public let n: Int?
    public let outputCompression: Int?
    public let outputFormat: String?
    public let partialImages: Int?
    public let prompt: String?
    public let quality: String?
    public let responseFormat: String?
    public let safetyIdentifier: String?
    public let size: String?
    public let stream: Bool?
    public let style: String?
    public let svg: [String: String]?
    public let user: String?


    public init(background: String? = nil, complexity: String? = nil, frameCount: Int? = nil, frameDurationMs: Int? = nil, model: String? = nil, moderation: String? = nil, n: Int? = nil, outputCompression: Int? = nil, outputFormat: String? = nil, partialImages: Int? = nil, prompt: String? = nil, quality: String? = nil, responseFormat: String? = nil, safetyIdentifier: String? = nil, size: String? = nil, stream: Bool? = nil, style: String? = nil, svg: [String: String]? = nil, user: String? = nil) {
        self.background = background
        self.complexity = complexity
        self.frameCount = frameCount
        self.frameDurationMs = frameDurationMs
        self.model = model
        self.moderation = moderation
        self.n = n
        self.outputCompression = outputCompression
        self.outputFormat = outputFormat
        self.partialImages = partialImages
        self.prompt = prompt
        self.quality = quality
        self.responseFormat = responseFormat
        self.safetyIdentifier = safetyIdentifier
        self.size = size
        self.stream = stream
        self.style = style
        self.svg = svg
        self.user = user
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

public struct OpenAiPredictionConfig: Codable {
    public let content: String?
    public let type: String?


    public init(content: String? = nil, type: String? = nil) {
        self.content = content
        self.type = type
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
    public let audio: [String: String]?
    public let include: [String]?
    public let instructions: String?
    public let maxOutputTokens: Int?
    public let model: String?
    public let outputModalities: [String]?
    public let parallelToolCalls: Bool?
    public let prompt: [String: String]?
    public let reasoning: [String: String]?
    public let toolChoice: String?
    public let tools: [[String: String]]?
    public let tracing: [String: String]?
    public let truncation: [String: String]?
    public let type: String?


    public init(audio: [String: String]? = nil, include: [String]? = nil, instructions: String? = nil, maxOutputTokens: Int? = nil, model: String? = nil, outputModalities: [String]? = nil, parallelToolCalls: Bool? = nil, prompt: [String: String]? = nil, reasoning: [String: String]? = nil, toolChoice: String? = nil, tools: [[String: String]]? = nil, tracing: [String: String]? = nil, truncation: [String: String]? = nil, type: String? = nil) {
        self.audio = audio
        self.include = include
        self.instructions = instructions
        self.maxOutputTokens = maxOutputTokens
        self.model = model
        self.outputModalities = outputModalities
        self.parallelToolCalls = parallelToolCalls
        self.prompt = prompt
        self.reasoning = reasoning
        self.toolChoice = toolChoice
        self.tools = tools
        self.tracing = tracing
        self.truncation = truncation
        self.type = type
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
    public let targetUri: String?


    public init(targetUri: String? = nil) {
        self.targetUri = targetUri
    }
}

public struct OpenAiRealtimeCallRejectRequest: Codable {
    public let statusCode: Int?


    public init(statusCode: Int? = nil) {
        self.statusCode = statusCode
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
    public let expiresAfter: [String: String]?
    public let session: [String: String]?


    public init(expiresAfter: [String: String]? = nil, session: [String: String]? = nil) {
        self.expiresAfter = expiresAfter
        self.session = session
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
    public let clientSecret: [String: String]?
    public let inputAudioFormat: String?
    public let inputAudioTranscription: [String: String]?
    public let instructions: String?
    public let maxResponseOutputTokens: Int?
    public let modalities: [String]?
    public let outputAudioFormat: String?
    public let prompt: [String: String]?
    public let speed: Double?
    public let temperature: Double?
    public let toolChoice: String?
    public let tools: [[String: String]]?
    public let tracing: [String: String]?
    public let truncation: [String: String]?
    public let turnDetection: [String: String]?
    public let voice: String?


    public init(clientSecret: [String: String]? = nil, inputAudioFormat: String? = nil, inputAudioTranscription: [String: String]? = nil, instructions: String? = nil, maxResponseOutputTokens: Int? = nil, modalities: [String]? = nil, outputAudioFormat: String? = nil, prompt: [String: String]? = nil, speed: Double? = nil, temperature: Double? = nil, toolChoice: String? = nil, tools: [[String: String]]? = nil, tracing: [String: String]? = nil, truncation: [String: String]? = nil, turnDetection: [String: String]? = nil, voice: String? = nil) {
        self.clientSecret = clientSecret
        self.inputAudioFormat = inputAudioFormat
        self.inputAudioTranscription = inputAudioTranscription
        self.instructions = instructions
        self.maxResponseOutputTokens = maxResponseOutputTokens
        self.modalities = modalities
        self.outputAudioFormat = outputAudioFormat
        self.prompt = prompt
        self.speed = speed
        self.temperature = temperature
        self.toolChoice = toolChoice
        self.tools = tools
        self.tracing = tracing
        self.truncation = truncation
        self.turnDetection = turnDetection
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
    public let include: [String]?
    public let inputAudioFormat: String?
    public let inputAudioNoiseReduction: [String: String]?
    public let inputAudioTranscription: [String: String]?
    public let turnDetection: [String: String]?


    public init(include: [String]? = nil, inputAudioFormat: String? = nil, inputAudioNoiseReduction: [String: String]? = nil, inputAudioTranscription: [String: String]? = nil, turnDetection: [String: String]? = nil) {
        self.include = include
        self.inputAudioFormat = inputAudioFormat
        self.inputAudioNoiseReduction = inputAudioNoiseReduction
        self.inputAudioTranscription = inputAudioTranscription
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
    public let image: [String: String]?
    public let input: String?
    public let instructions: String?
    public let model: String?
    public let previousResponseId: String?
    public let promptCacheKey: String?
    public let promptCacheOptions: [String: String]?
    public let promptCacheRetention: String?
    public let serviceTier: String?


    public init(image: [String: String]? = nil, input: String? = nil, instructions: String? = nil, model: String? = nil, previousResponseId: String? = nil, promptCacheKey: String? = nil, promptCacheOptions: [String: String]? = nil, promptCacheRetention: String? = nil, serviceTier: String? = nil) {
        self.image = image
        self.input = input
        self.instructions = instructions
        self.model = model
        self.previousResponseId = previousResponseId
        self.promptCacheKey = promptCacheKey
        self.promptCacheOptions = promptCacheOptions
        self.promptCacheRetention = promptCacheRetention
        self.serviceTier = serviceTier
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
    public let conversation: String?
    public let input: String?
    public let instructions: String?
    public let model: String?
    public let parallelToolCalls: Bool?
    public let personality: String?
    public let previousResponseId: String?
    public let reasoning: String?
    public let text: String?
    public let toolChoice: String?
    public let tools: [String]?
    public let truncation: String?


    public init(conversation: String? = nil, input: String? = nil, instructions: String? = nil, model: String? = nil, parallelToolCalls: Bool? = nil, personality: String? = nil, previousResponseId: String? = nil, reasoning: String? = nil, text: String? = nil, toolChoice: String? = nil, tools: [String]? = nil, truncation: String? = nil) {
        self.conversation = conversation
        self.input = input
        self.instructions = instructions
        self.model = model
        self.parallelToolCalls = parallelToolCalls
        self.personality = personality
        self.previousResponseId = previousResponseId
        self.reasoning = reasoning
        self.text = text
        self.toolChoice = toolChoice
        self.tools = tools
        self.truncation = truncation
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
    public let additionalMessages: [OpenAiThreadMessageCreateRequest]?
    public let assistantId: String?
    public let instructions: String?
    public let maxCompletionTokens: Int?
    public let maxPromptTokens: Int?
    public let metadata: [String: String]?
    public let model: String?
    public let parallelToolCalls: Bool?
    public let reasoningEffort: String?
    public let responseFormat: String?
    public let stream: Bool?
    public let temperature: Double?
    public let toolChoice: String?
    public let tools: [String]?
    public let topP: Double?
    public let truncationStrategy: String?


    public init(additionalInstructions: String? = nil, additionalMessages: [OpenAiThreadMessageCreateRequest]? = nil, assistantId: String? = nil, instructions: String? = nil, maxCompletionTokens: Int? = nil, maxPromptTokens: Int? = nil, metadata: [String: String]? = nil, model: String? = nil, parallelToolCalls: Bool? = nil, reasoningEffort: String? = nil, responseFormat: String? = nil, stream: Bool? = nil, temperature: Double? = nil, toolChoice: String? = nil, tools: [String]? = nil, topP: Double? = nil, truncationStrategy: String? = nil) {
        self.additionalInstructions = additionalInstructions
        self.additionalMessages = additionalMessages
        self.assistantId = assistantId
        self.instructions = instructions
        self.maxCompletionTokens = maxCompletionTokens
        self.maxPromptTokens = maxPromptTokens
        self.metadata = metadata
        self.model = model
        self.parallelToolCalls = parallelToolCalls
        self.reasoningEffort = reasoningEffort
        self.responseFormat = responseFormat
        self.stream = stream
        self.temperature = temperature
        self.toolChoice = toolChoice
        self.tools = tools
        self.topP = topP
        self.truncationStrategy = truncationStrategy
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

public struct OpenAiSpeechCreateRequest: Codable {
    public let input: String?
    public let instructions: String?
    public let model: String?
    public let responseFormat: String?
    public let speed: Double?
    public let streamFormat: String?
    public let voice: String?


    public init(input: String? = nil, instructions: String? = nil, model: String? = nil, responseFormat: String? = nil, speed: Double? = nil, streamFormat: String? = nil, voice: String? = nil) {
        self.input = input
        self.instructions = instructions
        self.model = model
        self.responseFormat = responseFormat
        self.speed = speed
        self.streamFormat = streamFormat
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
    public let maxCompletionTokens: Int?
    public let maxPromptTokens: Int?
    public let metadata: [String: String]?
    public let model: String?
    public let parallelToolCalls: Bool?
    public let responseFormat: String?
    public let stream: Bool?
    public let temperature: Double?
    public let thread: OpenAiThreadCreateRequest?
    public let toolChoice: String?
    public let toolResources: String?
    public let tools: [String]?
    public let topP: Double?
    public let truncationStrategy: String?


    public init(assistantId: String? = nil, instructions: String? = nil, maxCompletionTokens: Int? = nil, maxPromptTokens: Int? = nil, metadata: [String: String]? = nil, model: String? = nil, parallelToolCalls: Bool? = nil, responseFormat: String? = nil, stream: Bool? = nil, temperature: Double? = nil, thread: OpenAiThreadCreateRequest? = nil, toolChoice: String? = nil, toolResources: String? = nil, tools: [String]? = nil, topP: Double? = nil, truncationStrategy: String? = nil) {
        self.assistantId = assistantId
        self.instructions = instructions
        self.maxCompletionTokens = maxCompletionTokens
        self.maxPromptTokens = maxPromptTokens
        self.metadata = metadata
        self.model = model
        self.parallelToolCalls = parallelToolCalls
        self.responseFormat = responseFormat
        self.stream = stream
        self.temperature = temperature
        self.thread = thread
        self.toolChoice = toolChoice
        self.toolResources = toolResources
        self.tools = tools
        self.topP = topP
        self.truncationStrategy = truncationStrategy
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
    public let expiresAfter: [String: String]?
    public let filename: String?
    public let mimeType: String?
    public let purpose: String?


    public init(bytes: Int? = nil, expiresAfter: [String: String]? = nil, filename: String? = nil, mimeType: String? = nil, purpose: String? = nil) {
        self.bytes = bytes
        self.expiresAfter = expiresAfter
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
    public let description: String?
    public let expiresAfter: String?
    public let fileIds: [String]?
    public let metadata: [String: String]?
    public let name: String?


    public init(chunkingStrategy: String? = nil, description: String? = nil, expiresAfter: String? = nil, fileIds: [String]? = nil, metadata: [String: String]? = nil, name: String? = nil) {
        self.chunkingStrategy = chunkingStrategy
        self.description = description
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
    public let files: [[String: String]]?


    public init(attributes: [String: String]? = nil, chunkingStrategy: String? = nil, fileIds: [String]? = nil, files: [[String: String]]? = nil) {
        self.attributes = attributes
        self.chunkingStrategy = chunkingStrategy
        self.fileIds = fileIds
        self.files = files
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
    public let inputReference: [String: String]?
    public let model: String?
    public let prompt: String?
    public let seconds: String?
    public let size: String?


    public init(inputReference: [String: String]? = nil, model: String? = nil, prompt: String? = nil, seconds: String? = nil, size: String? = nil) {
        self.inputReference = inputReference
        self.model = model
        self.prompt = prompt
        self.seconds = seconds
        self.size = size
    }
}

public struct OpenAiVideoEditRequest: Codable {
    public let prompt: String?
    public let video: String?


    public init(prompt: String? = nil, video: String? = nil) {
        self.prompt = prompt
        self.video = video
    }
}

public struct OpenAiVideoExtendRequest: Codable {
    public let prompt: String?
    public let seconds: String?
    public let video: String?


    public init(prompt: String? = nil, seconds: String? = nil, video: String? = nil) {
        self.prompt = prompt
        self.seconds = seconds
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
    public let prompt: String?


    public init(prompt: String? = nil) {
        self.prompt = prompt
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
    public let name: String?


    public init(name: String? = nil) {
        self.name = name
    }
}

public struct OpenAiVoiceCreateMultipartRequest: Codable {
    public let file: String?
    public let model: String?
    public let name: String?
    public let prompt: String?
    public let scriptHint: String?
    public let type: String?


    public init(file: String? = nil, model: String? = nil, name: String? = nil, prompt: String? = nil, scriptHint: String? = nil, type: String? = nil) {
        self.file = file
        self.model = model
        self.name = name
        self.prompt = prompt
        self.scriptHint = scriptHint
        self.type = type
    }
}

public struct OpenAiVoiceCreateRequest: Codable {
    public let model: String?
    public let name: String?
    public let prompt: String?
    public let scriptHint: String?
    public let type: String?


    public init(model: String? = nil, name: String? = nil, prompt: String? = nil, scriptHint: String? = nil, type: String? = nil) {
        self.model = model
        self.name = name
        self.prompt = prompt
        self.scriptHint = scriptHint
        self.type = type
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

public struct PixverseErrorDetail: Codable {
    public let message: String?
    public let param: [String: String]?
    public let type: String?


    public init(message: String? = nil, param: [String: String]? = nil, type: String? = nil) {
        self.message = message
        self.param = param
        self.type = type
    }
}

public struct PixverseTaskResp: Codable {
    public let aspectRatio: String?
    public let createTime: String?
    public let credits: Int?
    public let customerPaths: [String: String]?
    public let duration: Int?
    public let hasAudio: Bool?
    public let id: Int?
    public let modifyTime: String?
    public let negativePrompt: String?
    public let outputHeight: Int?
    public let outputWidth: Int?
    public let path: String?
    public let prompt: String?
    public let quality: String?
    public let resolutionRatio: Int?
    public let seed: Int?
    public let size: Int?
    public let status: Int?
    public let style: String?
    public let url: String?
    public let videoId: Int?


    public init(aspectRatio: String? = nil, createTime: String? = nil, credits: Int? = nil, customerPaths: [String: String]? = nil, duration: Int? = nil, hasAudio: Bool? = nil, id: Int? = nil, modifyTime: String? = nil, negativePrompt: String? = nil, outputHeight: Int? = nil, outputWidth: Int? = nil, path: String? = nil, prompt: String? = nil, quality: String? = nil, resolutionRatio: Int? = nil, seed: Int? = nil, size: Int? = nil, status: Int? = nil, style: String? = nil, url: String? = nil, videoId: Int? = nil) {
        self.aspectRatio = aspectRatio
        self.createTime = createTime
        self.credits = credits
        self.customerPaths = customerPaths
        self.duration = duration
        self.hasAudio = hasAudio
        self.id = id
        self.modifyTime = modifyTime
        self.negativePrompt = negativePrompt
        self.outputHeight = outputHeight
        self.outputWidth = outputWidth
        self.path = path
        self.prompt = prompt
        self.quality = quality
        self.resolutionRatio = resolutionRatio
        self.seed = seed
        self.size = size
        self.status = status
        self.style = style
        self.url = url
        self.videoId = videoId
    }
}

public struct PixverseVideoGenerationRequest: Codable {
    public let aspectRatio: String?
    public let duration: Int?
    public let generateAudioSwitch: Bool?
    public let generateMultiClipSwitch: Bool?
    public let model: String?
    public let prompt: String?
    public let quality: String?
    public let seed: Int?
    public let webhookId: String?


    public init(aspectRatio: String? = nil, duration: Int? = nil, generateAudioSwitch: Bool? = nil, generateMultiClipSwitch: Bool? = nil, model: String? = nil, prompt: String? = nil, quality: String? = nil, seed: Int? = nil, webhookId: String? = nil) {
        self.aspectRatio = aspectRatio
        self.duration = duration
        self.generateAudioSwitch = generateAudioSwitch
        self.generateMultiClipSwitch = generateMultiClipSwitch
        self.model = model
        self.prompt = prompt
        self.quality = quality
        self.seed = seed
        self.webhookId = webhookId
    }
}

public struct PixverseVideoGenerationResponse: Codable {
    public let errCode: Int?
    public let errMsg: String?
    public let error: PixverseErrorDetail?
    public let resp: PixverseTaskResp?


    public init(errCode: Int? = nil, errMsg: String? = nil, error: PixverseErrorDetail? = nil, resp: PixverseTaskResp? = nil) {
        self.errCode = errCode
        self.errMsg = errMsg
        self.error = error
        self.resp = resp
    }
}

public struct PixverseVideoGenerationTask: Codable {
    public let errCode: Int?
    public let errMsg: String?
    public let error: PixverseErrorDetail?
    public let resp: PixverseTaskResp?


    public init(errCode: Int? = nil, errMsg: String? = nil, error: PixverseErrorDetail? = nil, resp: PixverseTaskResp? = nil) {
        self.errCode = errCode
        self.errMsg = errMsg
        self.error = error
        self.resp = resp
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

public struct RunwayImageToVideoRequest: Codable {
    public let audio: Bool?
    public let bitrate: String?
    public let cfgScale: Double?
    public let contentModeration: [String: String]?
    public let draft: Bool?
    public let duration: Int?
    public let model: String?
    public let negativePrompt: String?
    public let outputFormat: String?
    public let promptExpansionMode: String?
    public let promptImage: String?
    public let promptText: String?
    public let proresProfile: String?
    public let providerSettings: [String: String]?
    public let ratio: String?
    public let referenceAudio: [[String: String]]?
    public let referenceVideos: [[String: String]]?
    public let references: [[String: String]]?
    public let resolution: String?
    public let seed: Int?


    public init(audio: Bool? = nil, bitrate: String? = nil, cfgScale: Double? = nil, contentModeration: [String: String]? = nil, draft: Bool? = nil, duration: Int? = nil, model: String? = nil, negativePrompt: String? = nil, outputFormat: String? = nil, promptExpansionMode: String? = nil, promptImage: String? = nil, promptText: String? = nil, proresProfile: String? = nil, providerSettings: [String: String]? = nil, ratio: String? = nil, referenceAudio: [[String: String]]? = nil, referenceVideos: [[String: String]]? = nil, references: [[String: String]]? = nil, resolution: String? = nil, seed: Int? = nil) {
        self.audio = audio
        self.bitrate = bitrate
        self.cfgScale = cfgScale
        self.contentModeration = contentModeration
        self.draft = draft
        self.duration = duration
        self.model = model
        self.negativePrompt = negativePrompt
        self.outputFormat = outputFormat
        self.promptExpansionMode = promptExpansionMode
        self.promptImage = promptImage
        self.promptText = promptText
        self.proresProfile = proresProfile
        self.providerSettings = providerSettings
        self.ratio = ratio
        self.referenceAudio = referenceAudio
        self.referenceVideos = referenceVideos
        self.references = references
        self.resolution = resolution
        self.seed = seed
    }
}

public struct RunwayTask: Codable {
    public let createdAt: String?
    public let failure: String?
    public let failureCode: String?
    public let id: String?
    public let output: [String]?
    public let progress: Double?
    public let status: String?


    public init(createdAt: String? = nil, failure: String? = nil, failureCode: String? = nil, id: String? = nil, output: [String]? = nil, progress: Double? = nil, status: String? = nil) {
        self.createdAt = createdAt
        self.failure = failure
        self.failureCode = failureCode
        self.id = id
        self.output = output
        self.progress = progress
        self.status = status
    }
}

public struct RunwayTaskAccepted: Codable {
    public let estimatedCost: [String: String]?
    public let id: String?


    public init(estimatedCost: [String: String]? = nil, id: String? = nil) {
        self.estimatedCost = estimatedCost
        self.id = id
    }
}

public struct RunwayTextToImageRequest: Codable {
    public let background: String?
    public let backgroundColor: String?
    public let colors: [String]?
    public let contentModeration: [String: String]?
    public let edit: Bool?
    public let grounding: Bool?
    public let maskUri: String?
    public let model: String?
    public let outputCount: Int?
    public let outputFormat: String?
    public let preciseEdit: Bool?
    public let promptText: String?
    public let quality: String?
    public let ratio: String?
    public let referenceImages: [[String: String]]?
    public let seed: Int?
    public let thinkingLevel: String?


    public init(background: String? = nil, backgroundColor: String? = nil, colors: [String]? = nil, contentModeration: [String: String]? = nil, edit: Bool? = nil, grounding: Bool? = nil, maskUri: String? = nil, model: String? = nil, outputCount: Int? = nil, outputFormat: String? = nil, preciseEdit: Bool? = nil, promptText: String? = nil, quality: String? = nil, ratio: String? = nil, referenceImages: [[String: String]]? = nil, seed: Int? = nil, thinkingLevel: String? = nil) {
        self.background = background
        self.backgroundColor = backgroundColor
        self.colors = colors
        self.contentModeration = contentModeration
        self.edit = edit
        self.grounding = grounding
        self.maskUri = maskUri
        self.model = model
        self.outputCount = outputCount
        self.outputFormat = outputFormat
        self.preciseEdit = preciseEdit
        self.promptText = promptText
        self.quality = quality
        self.ratio = ratio
        self.referenceImages = referenceImages
        self.seed = seed
        self.thinkingLevel = thinkingLevel
    }
}

public struct RunwayTextToVideoRequest: Codable {
    public let audio: Bool?
    public let bitrate: String?
    public let cfgScale: Double?
    public let contentModeration: [String: String]?
    public let draft: Bool?
    public let draftTaskId: String?
    public let duration: Int?
    public let model: String?
    public let negativePrompt: String?
    public let outputFormat: String?
    public let promptExpansionMode: String?
    public let promptText: String?
    public let proresProfile: String?
    public let providerSettings: [String: String]?
    public let ratio: String?
    public let referenceAudio: [[String: String]]?
    public let referenceVideos: [[String: String]]?
    public let references: [[String: String]]?
    public let resolution: String?
    public let seed: Int?


    public init(audio: Bool? = nil, bitrate: String? = nil, cfgScale: Double? = nil, contentModeration: [String: String]? = nil, draft: Bool? = nil, draftTaskId: String? = nil, duration: Int? = nil, model: String? = nil, negativePrompt: String? = nil, outputFormat: String? = nil, promptExpansionMode: String? = nil, promptText: String? = nil, proresProfile: String? = nil, providerSettings: [String: String]? = nil, ratio: String? = nil, referenceAudio: [[String: String]]? = nil, referenceVideos: [[String: String]]? = nil, references: [[String: String]]? = nil, resolution: String? = nil, seed: Int? = nil) {
        self.audio = audio
        self.bitrate = bitrate
        self.cfgScale = cfgScale
        self.contentModeration = contentModeration
        self.draft = draft
        self.draftTaskId = draftTaskId
        self.duration = duration
        self.model = model
        self.negativePrompt = negativePrompt
        self.outputFormat = outputFormat
        self.promptExpansionMode = promptExpansionMode
        self.promptText = promptText
        self.proresProfile = proresProfile
        self.providerSettings = providerSettings
        self.ratio = ratio
        self.referenceAudio = referenceAudio
        self.referenceVideos = referenceVideos
        self.references = references
        self.resolution = resolution
        self.seed = seed
    }
}

public struct StabilityAudioRequest: Codable {
    public let cfgScale: Double?
    public let duration: Double?
    public let model: String?
    public let outputFormat: String?
    public let prompt: String?
    public let seed: Int?
    public let steps: Int?


    public init(cfgScale: Double? = nil, duration: Double? = nil, model: String? = nil, outputFormat: String? = nil, prompt: String? = nil, seed: Int? = nil, steps: Int? = nil) {
        self.cfgScale = cfgScale
        self.duration = duration
        self.model = model
        self.outputFormat = outputFormat
        self.prompt = prompt
        self.seed = seed
        self.steps = steps
    }
}

public struct StabilityImageGenerationRequest: Codable {
    public let aspectRatio: String?
    public let cfgScale: Double?
    public let image: String?
    public let mode: String?
    public let model: String?
    public let negativePrompt: String?
    public let outputFormat: String?
    public let prompt: String?
    public let seed: Int?
    public let strength: Double?
    public let stylePreset: String?


    public init(aspectRatio: String? = nil, cfgScale: Double? = nil, image: String? = nil, mode: String? = nil, model: String? = nil, negativePrompt: String? = nil, outputFormat: String? = nil, prompt: String? = nil, seed: Int? = nil, strength: Double? = nil, stylePreset: String? = nil) {
        self.aspectRatio = aspectRatio
        self.cfgScale = cfgScale
        self.image = image
        self.mode = mode
        self.model = model
        self.negativePrompt = negativePrompt
        self.outputFormat = outputFormat
        self.prompt = prompt
        self.seed = seed
        self.strength = strength
        self.stylePreset = stylePreset
    }
}

public struct StabilityImageGenerationResponse: Codable {
    public let finishReason: String?
    public let image: String?
    public let seed: Int?


    public init(finishReason: String? = nil, image: String? = nil, seed: Int? = nil) {
        self.finishReason = finishReason
        self.image = image
        self.seed = seed
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

public struct TypeSafeAnswer: Codable {
    public let choice: String?
    public let confidence: Double?
    public let legend: [String: String]?
    public let noul: Double?
    public let probabilities: [String: Double]?
    public let score: Double?
    public let type: String?


    public init(choice: String? = nil, confidence: Double? = nil, legend: [String: String]? = nil, noul: Double? = nil, probabilities: [String: Double]? = nil, score: Double? = nil, type: String? = nil) {
        self.choice = choice
        self.confidence = confidence
        self.legend = legend
        self.noul = noul
        self.probabilities = probabilities
        self.score = score
        self.type = type
    }
}

public struct TypeSafeQuestion: Codable {
    public let criteria: String?
    public let instructions: String?
    public let type: String?


    public init(criteria: String? = nil, instructions: String? = nil, type: String? = nil) {
        self.criteria = criteria
        self.instructions = instructions
        self.type = type
    }
}

public struct TypeSafeSystemOneRequest: Codable {
    public let model: String?
    public let questions: [String: TypeSafeQuestion]?
    public let state: String?


    public init(model: String? = nil, questions: [String: TypeSafeQuestion]? = nil, state: String? = nil) {
        self.model = model
        self.questions = questions
        self.state = state
    }
}

public struct TypeSafeSystemOneResponse: Codable {
    public let answers: [String: TypeSafeAnswer]?
    public let model: String?
    public let usage: TypeSafeUsage?


    public init(answers: [String: TypeSafeAnswer]? = nil, model: String? = nil, usage: TypeSafeUsage? = nil) {
        self.answers = answers
        self.model = model
        self.usage = usage
    }
}

public struct TypeSafeUsage: Codable {
    public let inputTokens: Int?
    public let outputTokens: Int?


    public init(inputTokens: Int? = nil, outputTokens: Int? = nil) {
        self.inputTokens = inputTokens
        self.outputTokens = outputTokens
    }
}

public struct ViduAudioGenerationTask: Codable {
    public let createdAt: String?
    public let creations: [ViduCreation]?
    public let credits: Int?
    public let duration: Int?
    public let errCode: String?
    public let model: String?
    public let prompt: String?
    public let seed: Int?
    public let state: String?
    public let taskId: String?


    public init(createdAt: String? = nil, creations: [ViduCreation]? = nil, credits: Int? = nil, duration: Int? = nil, errCode: String? = nil, model: String? = nil, prompt: String? = nil, seed: Int? = nil, state: String? = nil, taskId: String? = nil) {
        self.createdAt = createdAt
        self.creations = creations
        self.credits = credits
        self.duration = duration
        self.errCode = errCode
        self.model = model
        self.prompt = prompt
        self.seed = seed
        self.state = state
        self.taskId = taskId
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
    public let watermarkedUrl: String?
    public let width: Int?


    public init(audioUrl: String? = nil, coverUrl: String? = nil, createdAt: String? = nil, duration: Double? = nil, height: Int? = nil, id: String? = nil, imageUrl: String? = nil, metadata: [String: String]? = nil, type: String? = nil, uri: String? = nil, url: String? = nil, videoUrl: String? = nil, watermarkedUrl: String? = nil, width: Int? = nil) {
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
        self.watermarkedUrl = watermarkedUrl
        self.width = width
    }
}

public struct ViduImageGenerationTask: Codable {
    public let aspectRatio: String?
    public let callbackUrl: String?
    public let createdAt: String?
    public let creations: [ViduCreation]?
    public let credits: Int?
    public let duration: Int?
    public let errCode: String?
    public let images: [String]?
    public let model: String?
    public let offPeak: Bool?
    public let payload: String?
    public let prompt: String?
    public let resolution: String?
    public let seed: Int?
    public let state: String?
    public let taskId: String?
    public let watermark: Bool?


    public init(aspectRatio: String? = nil, callbackUrl: String? = nil, createdAt: String? = nil, creations: [ViduCreation]? = nil, credits: Int? = nil, duration: Int? = nil, errCode: String? = nil, images: [String]? = nil, model: String? = nil, offPeak: Bool? = nil, payload: String? = nil, prompt: String? = nil, resolution: String? = nil, seed: Int? = nil, state: String? = nil, taskId: String? = nil, watermark: Bool? = nil) {
        self.aspectRatio = aspectRatio
        self.callbackUrl = callbackUrl
        self.createdAt = createdAt
        self.creations = creations
        self.credits = credits
        self.duration = duration
        self.errCode = errCode
        self.images = images
        self.model = model
        self.offPeak = offPeak
        self.payload = payload
        self.prompt = prompt
        self.resolution = resolution
        self.seed = seed
        self.state = state
        self.taskId = taskId
        self.watermark = watermark
    }
}

public struct ViduImageToVideoRequest: Codable {
    public let audio: Bool?
    public let callbackUrl: String?
    public let duration: Int?
    public let images: [String]?
    public let isRec: Bool?
    public let metaData: String?
    public let model: String?
    public let offPeak: Bool?
    public let payload: String?
    public let prompt: String?
    public let resolution: String?
    public let seed: Int?
    public let watermark: Bool?
    public let wmPosition: Int?
    public let wmUrl: String?


    public init(audio: Bool? = nil, callbackUrl: String? = nil, duration: Int? = nil, images: [String]? = nil, isRec: Bool? = nil, metaData: String? = nil, model: String? = nil, offPeak: Bool? = nil, payload: String? = nil, prompt: String? = nil, resolution: String? = nil, seed: Int? = nil, watermark: Bool? = nil, wmPosition: Int? = nil, wmUrl: String? = nil) {
        self.audio = audio
        self.callbackUrl = callbackUrl
        self.duration = duration
        self.images = images
        self.isRec = isRec
        self.metaData = metaData
        self.model = model
        self.offPeak = offPeak
        self.payload = payload
        self.prompt = prompt
        self.resolution = resolution
        self.seed = seed
        self.watermark = watermark
        self.wmPosition = wmPosition
        self.wmUrl = wmUrl
    }
}

public struct ViduReferenceToImageRequest: Codable {
    public let aspectRatio: String?
    public let bgm: Bool?
    public let callbackUrl: String?
    public let images: [String]?
    public let model: String?
    public let offPeak: Bool?
    public let payload: String?
    public let prompt: String?
    public let resolution: String?
    public let seed: Int?


    public init(aspectRatio: String? = nil, bgm: Bool? = nil, callbackUrl: String? = nil, images: [String]? = nil, model: String? = nil, offPeak: Bool? = nil, payload: String? = nil, prompt: String? = nil, resolution: String? = nil, seed: Int? = nil) {
        self.aspectRatio = aspectRatio
        self.bgm = bgm
        self.callbackUrl = callbackUrl
        self.images = images
        self.model = model
        self.offPeak = offPeak
        self.payload = payload
        self.prompt = prompt
        self.resolution = resolution
        self.seed = seed
    }
}

public struct ViduReferenceToVideoRequest: Codable {
    public let aspectRatio: String?
    public let audio: Bool?
    public let autoSubjects: Bool?
    public let bgm: Bool?
    public let callbackUrl: String?
    public let duration: Int?
    public let images: [String]?
    public let metaData: String?
    public let model: String?
    public let movementAmplitude: String?
    public let offPeak: Bool?
    public let payload: String?
    public let prompt: String?
    public let resolution: String?
    public let seed: Int?
    public let sounds: [[String: String]]?
    public let subjects: [[String: String]]?
    public let watermark: Bool?
    public let wmPosition: Int?
    public let wmUrl: String?


    public init(aspectRatio: String? = nil, audio: Bool? = nil, autoSubjects: Bool? = nil, bgm: Bool? = nil, callbackUrl: String? = nil, duration: Int? = nil, images: [String]? = nil, metaData: String? = nil, model: String? = nil, movementAmplitude: String? = nil, offPeak: Bool? = nil, payload: String? = nil, prompt: String? = nil, resolution: String? = nil, seed: Int? = nil, sounds: [[String: String]]? = nil, subjects: [[String: String]]? = nil, watermark: Bool? = nil, wmPosition: Int? = nil, wmUrl: String? = nil) {
        self.aspectRatio = aspectRatio
        self.audio = audio
        self.autoSubjects = autoSubjects
        self.bgm = bgm
        self.callbackUrl = callbackUrl
        self.duration = duration
        self.images = images
        self.metaData = metaData
        self.model = model
        self.movementAmplitude = movementAmplitude
        self.offPeak = offPeak
        self.payload = payload
        self.prompt = prompt
        self.resolution = resolution
        self.seed = seed
        self.sounds = sounds
        self.subjects = subjects
        self.watermark = watermark
        self.wmPosition = wmPosition
        self.wmUrl = wmUrl
    }
}

public struct ViduStartEndToVideoRequest: Codable {
    public let audio: Bool?
    public let callbackUrl: String?
    public let duration: Int?
    public let images: [String]?
    public let metaData: String?
    public let model: String?
    public let offPeak: Bool?
    public let payload: String?
    public let prompt: String?
    public let resolution: String?
    public let seed: Int?
    public let watermark: Bool?
    public let wmPosition: Int?
    public let wmUrl: String?


    public init(audio: Bool? = nil, callbackUrl: String? = nil, duration: Int? = nil, images: [String]? = nil, metaData: String? = nil, model: String? = nil, offPeak: Bool? = nil, payload: String? = nil, prompt: String? = nil, resolution: String? = nil, seed: Int? = nil, watermark: Bool? = nil, wmPosition: Int? = nil, wmUrl: String? = nil) {
        self.audio = audio
        self.callbackUrl = callbackUrl
        self.duration = duration
        self.images = images
        self.metaData = metaData
        self.model = model
        self.offPeak = offPeak
        self.payload = payload
        self.prompt = prompt
        self.resolution = resolution
        self.seed = seed
        self.watermark = watermark
        self.wmPosition = wmPosition
        self.wmUrl = wmUrl
    }
}

public struct ViduTaskCreationsResponse: Codable {
    public let aspectRatio: String?
    public let createdAt: String?
    public let creations: [ViduCreation]?
    public let credits: Int?
    public let duration: Int?
    public let errCode: String?
    public let model: String?
    public let offPeak: Bool?
    public let payload: String?
    public let prompt: String?
    public let resolution: String?
    public let seed: Int?
    public let state: String?
    public let taskId: String?
    public let watermark: Bool?


    public init(aspectRatio: String? = nil, createdAt: String? = nil, creations: [ViduCreation]? = nil, credits: Int? = nil, duration: Int? = nil, errCode: String? = nil, model: String? = nil, offPeak: Bool? = nil, payload: String? = nil, prompt: String? = nil, resolution: String? = nil, seed: Int? = nil, state: String? = nil, taskId: String? = nil, watermark: Bool? = nil) {
        self.aspectRatio = aspectRatio
        self.createdAt = createdAt
        self.creations = creations
        self.credits = credits
        self.duration = duration
        self.errCode = errCode
        self.model = model
        self.offPeak = offPeak
        self.payload = payload
        self.prompt = prompt
        self.resolution = resolution
        self.seed = seed
        self.state = state
        self.taskId = taskId
        self.watermark = watermark
    }
}

public struct ViduTemplateRequest: Codable {
    public let area: String?
    public let aspectRatio: String?
    public let beast: String?
    public let bgm: Bool?
    public let callbackUrl: String?
    public let images: [String]?
    public let metaData: String?
    public let offPeak: Bool?
    public let payload: String?
    public let prompt: String?
    public let seed: Int?
    public let template: String?
    public let videoUrls: [String]?
    public let watermark: Bool?
    public let wmPosition: Int?
    public let wmUrl: String?


    public init(area: String? = nil, aspectRatio: String? = nil, beast: String? = nil, bgm: Bool? = nil, callbackUrl: String? = nil, images: [String]? = nil, metaData: String? = nil, offPeak: Bool? = nil, payload: String? = nil, prompt: String? = nil, seed: Int? = nil, template: String? = nil, videoUrls: [String]? = nil, watermark: Bool? = nil, wmPosition: Int? = nil, wmUrl: String? = nil) {
        self.area = area
        self.aspectRatio = aspectRatio
        self.beast = beast
        self.bgm = bgm
        self.callbackUrl = callbackUrl
        self.images = images
        self.metaData = metaData
        self.offPeak = offPeak
        self.payload = payload
        self.prompt = prompt
        self.seed = seed
        self.template = template
        self.videoUrls = videoUrls
        self.watermark = watermark
        self.wmPosition = wmPosition
        self.wmUrl = wmUrl
    }
}

public struct ViduTemplateTask: Codable {
    public let aspectRatio: String?
    public let bgm: Bool?
    public let createdAt: String?
    public let creations: [ViduCreation]?
    public let credits: Int?
    public let duration: Int?
    public let errCode: String?
    public let images: [String]?
    public let model: String?
    public let offPeak: Bool?
    public let payload: String?
    public let prompt: String?
    public let resolution: String?
    public let seed: Int?
    public let state: String?
    public let taskId: String?
    public let template: String?
    public let watermark: Bool?


    public init(aspectRatio: String? = nil, bgm: Bool? = nil, createdAt: String? = nil, creations: [ViduCreation]? = nil, credits: Int? = nil, duration: Int? = nil, errCode: String? = nil, images: [String]? = nil, model: String? = nil, offPeak: Bool? = nil, payload: String? = nil, prompt: String? = nil, resolution: String? = nil, seed: Int? = nil, state: String? = nil, taskId: String? = nil, template: String? = nil, watermark: Bool? = nil) {
        self.aspectRatio = aspectRatio
        self.bgm = bgm
        self.createdAt = createdAt
        self.creations = creations
        self.credits = credits
        self.duration = duration
        self.errCode = errCode
        self.images = images
        self.model = model
        self.offPeak = offPeak
        self.payload = payload
        self.prompt = prompt
        self.resolution = resolution
        self.seed = seed
        self.state = state
        self.taskId = taskId
        self.template = template
        self.watermark = watermark
    }
}

public struct ViduTextToAudioRequest: Codable {
    public let bgm: Bool?
    public let callbackUrl: String?
    public let duration: Double?
    public let model: String?
    public let offPeak: Bool?
    public let payload: String?
    public let prompt: String?
    public let seed: Int?


    public init(bgm: Bool? = nil, callbackUrl: String? = nil, duration: Double? = nil, model: String? = nil, offPeak: Bool? = nil, payload: String? = nil, prompt: String? = nil, seed: Int? = nil) {
        self.bgm = bgm
        self.callbackUrl = callbackUrl
        self.duration = duration
        self.model = model
        self.offPeak = offPeak
        self.payload = payload
        self.prompt = prompt
        self.seed = seed
    }
}

public struct ViduTextToVideoRequest: Codable {
    public let aspectRatio: String?
    public let audio: Bool?
    public let callbackUrl: String?
    public let duration: Int?
    public let metaData: String?
    public let model: String?
    public let offPeak: Bool?
    public let payload: String?
    public let prompt: String?
    public let resolution: String?
    public let seed: Int?
    public let watermark: Bool?
    public let wmPosition: Int?
    public let wmUrl: String?


    public init(aspectRatio: String? = nil, audio: Bool? = nil, callbackUrl: String? = nil, duration: Int? = nil, metaData: String? = nil, model: String? = nil, offPeak: Bool? = nil, payload: String? = nil, prompt: String? = nil, resolution: String? = nil, seed: Int? = nil, watermark: Bool? = nil, wmPosition: Int? = nil, wmUrl: String? = nil) {
        self.aspectRatio = aspectRatio
        self.audio = audio
        self.callbackUrl = callbackUrl
        self.duration = duration
        self.metaData = metaData
        self.model = model
        self.offPeak = offPeak
        self.payload = payload
        self.prompt = prompt
        self.resolution = resolution
        self.seed = seed
        self.watermark = watermark
        self.wmPosition = wmPosition
        self.wmUrl = wmUrl
    }
}

public struct ViduTimingToAudioRequest: Codable {
    public let bgm: Bool?
    public let callbackUrl: String?
    public let duration: Double?
    public let model: String?
    public let offPeak: Bool?
    public let payload: String?
    public let seed: Int?
    public let timingPrompts: [[String: String]]?


    public init(bgm: Bool? = nil, callbackUrl: String? = nil, duration: Double? = nil, model: String? = nil, offPeak: Bool? = nil, payload: String? = nil, seed: Int? = nil, timingPrompts: [[String: String]]? = nil) {
        self.bgm = bgm
        self.callbackUrl = callbackUrl
        self.duration = duration
        self.model = model
        self.offPeak = offPeak
        self.payload = payload
        self.seed = seed
        self.timingPrompts = timingPrompts
    }
}

public struct ViduVideoGenerationTask: Codable {
    public let aspectRatio: String?
    public let createdAt: String?
    public let creations: [ViduCreation]?
    public let credits: Int?
    public let duration: Int?
    public let errCode: String?
    public let model: String?
    public let offPeak: Bool?
    public let payload: String?
    public let prompt: String?
    public let resolution: String?
    public let seed: Int?
    public let state: String?
    public let taskId: String?
    public let watermark: Bool?


    public init(aspectRatio: String? = nil, createdAt: String? = nil, creations: [ViduCreation]? = nil, credits: Int? = nil, duration: Int? = nil, errCode: String? = nil, model: String? = nil, offPeak: Bool? = nil, payload: String? = nil, prompt: String? = nil, resolution: String? = nil, seed: Int? = nil, state: String? = nil, taskId: String? = nil, watermark: Bool? = nil) {
        self.aspectRatio = aspectRatio
        self.createdAt = createdAt
        self.creations = creations
        self.credits = credits
        self.duration = duration
        self.errCode = errCode
        self.model = model
        self.offPeak = offPeak
        self.payload = payload
        self.prompt = prompt
        self.resolution = resolution
        self.seed = seed
        self.state = state
        self.taskId = taskId
        self.watermark = watermark
    }
}

public struct VolcengineContentGenerationTask: Codable {
    public let content: ArkVideoTaskContent?
    public let createdAt: Int?
    public let draft: Bool?
    public let duration: Int?
    public let error: ProviderTaskError?
    public let executionExpiresAfter: Int?
    public let frames: Int?
    public let framespersecond: Int?
    public let generateAudio: Bool?
    public let id: String?
    public let model: String?
    public let outputFormat: String?
    public let priority: Int?
    public let ratio: String?
    public let resolution: String?
    public let safetyIdentifier: String?
    public let seed: Int?
    public let serviceTier: String?
    public let status: String?
    public let tools: [ArkWebSearchTool]?
    public let updatedAt: Int?
    public let usage: ArkVideoUsage?


    public init(content: ArkVideoTaskContent? = nil, createdAt: Int? = nil, draft: Bool? = nil, duration: Int? = nil, error: ProviderTaskError? = nil, executionExpiresAfter: Int? = nil, frames: Int? = nil, framespersecond: Int? = nil, generateAudio: Bool? = nil, id: String? = nil, model: String? = nil, outputFormat: String? = nil, priority: Int? = nil, ratio: String? = nil, resolution: String? = nil, safetyIdentifier: String? = nil, seed: Int? = nil, serviceTier: String? = nil, status: String? = nil, tools: [ArkWebSearchTool]? = nil, updatedAt: Int? = nil, usage: ArkVideoUsage? = nil) {
        self.content = content
        self.createdAt = createdAt
        self.draft = draft
        self.duration = duration
        self.error = error
        self.executionExpiresAfter = executionExpiresAfter
        self.frames = frames
        self.framespersecond = framespersecond
        self.generateAudio = generateAudio
        self.id = id
        self.model = model
        self.outputFormat = outputFormat
        self.priority = priority
        self.ratio = ratio
        self.resolution = resolution
        self.safetyIdentifier = safetyIdentifier
        self.seed = seed
        self.serviceTier = serviceTier
        self.status = status
        self.tools = tools
        self.updatedAt = updatedAt
        self.usage = usage
    }
}

public struct VolcengineContentGenerationTaskCreateRequest: Codable {
    public let callbackUrl: String?
    public let cameraFixed: Bool?
    public let content: [VolcengineContentPart]?
    public let draft: Bool?
    public let duration: Int?
    public let executionExpiresAfter: Int?
    public let frames: Int?
    public let generateAudio: Bool?
    public let model: String?
    public let omniReferenceTaskType: String?
    public let outputFormat: String?
    public let priority: Int?
    public let ratio: String?
    public let resolution: String?
    public let returnLastFrame: Bool?
    public let safetyIdentifier: String?
    public let seed: Int?
    public let serviceTier: String?
    public let tools: [ArkWebSearchTool]?
    public let watermark: Bool?


    public init(callbackUrl: String? = nil, cameraFixed: Bool? = nil, content: [VolcengineContentPart]? = nil, draft: Bool? = nil, duration: Int? = nil, executionExpiresAfter: Int? = nil, frames: Int? = nil, generateAudio: Bool? = nil, model: String? = nil, omniReferenceTaskType: String? = nil, outputFormat: String? = nil, priority: Int? = nil, ratio: String? = nil, resolution: String? = nil, returnLastFrame: Bool? = nil, safetyIdentifier: String? = nil, seed: Int? = nil, serviceTier: String? = nil, tools: [ArkWebSearchTool]? = nil, watermark: Bool? = nil) {
        self.callbackUrl = callbackUrl
        self.cameraFixed = cameraFixed
        self.content = content
        self.draft = draft
        self.duration = duration
        self.executionExpiresAfter = executionExpiresAfter
        self.frames = frames
        self.generateAudio = generateAudio
        self.model = model
        self.omniReferenceTaskType = omniReferenceTaskType
        self.outputFormat = outputFormat
        self.priority = priority
        self.ratio = ratio
        self.resolution = resolution
        self.returnLastFrame = returnLastFrame
        self.safetyIdentifier = safetyIdentifier
        self.seed = seed
        self.serviceTier = serviceTier
        self.tools = tools
        self.watermark = watermark
    }
}

public struct VolcengineContentGenerationTaskCreateResponse: Codable {
    public let id: String?


    public init(id: String? = nil) {
        self.id = id
    }
}

public struct VolcengineContentPart: Codable {
    public let audioUrl: ArkAudioSource?
    public let draftTask: ArkDraftTask?
    public let imageUrl: ArkImageSource?
    public let role: String?
    public let text: String?
    public let type: String?
    public let videoUrl: ArkVideoSource?


    public init(audioUrl: ArkAudioSource? = nil, draftTask: ArkDraftTask? = nil, imageUrl: ArkImageSource? = nil, role: String? = nil, text: String? = nil, type: String? = nil, videoUrl: ArkVideoSource? = nil) {
        self.audioUrl = audioUrl
        self.draftTask = draftTask
        self.imageUrl = imageUrl
        self.role = role
        self.text = text
        self.type = type
        self.videoUrl = videoUrl
    }
}

public struct VolcengineImageGenerationRequest: Codable {
    public let background: String?
    public let image: String?
    public let layerDecomposition: Bool?
    public let model: String?
    public let optimizePromptOptions: [String: String]?
    public let outputFormat: String?
    public let prompt: String?
    public let responseFormat: String?
    public let sequentialImageGeneration: String?
    public let sequentialImageGenerationOptions: [String: String]?
    public let size: String?
    public let stream: Bool?
    public let tools: [ArkWebSearchTool]?
    public let watermark: Bool?


    public init(background: String? = nil, image: String? = nil, layerDecomposition: Bool? = nil, model: String? = nil, optimizePromptOptions: [String: String]? = nil, outputFormat: String? = nil, prompt: String? = nil, responseFormat: String? = nil, sequentialImageGeneration: String? = nil, sequentialImageGenerationOptions: [String: String]? = nil, size: String? = nil, stream: Bool? = nil, tools: [ArkWebSearchTool]? = nil, watermark: Bool? = nil) {
        self.background = background
        self.image = image
        self.layerDecomposition = layerDecomposition
        self.model = model
        self.optimizePromptOptions = optimizePromptOptions
        self.outputFormat = outputFormat
        self.prompt = prompt
        self.responseFormat = responseFormat
        self.sequentialImageGeneration = sequentialImageGeneration
        self.sequentialImageGenerationOptions = sequentialImageGenerationOptions
        self.size = size
        self.stream = stream
        self.tools = tools
        self.watermark = watermark
    }
}

public struct VolcengineImageGenerationResponse: Codable {
    public let created: Int?
    public let data: [ArkImageGenerationData]?
    public let error: ProviderTaskError?
    public let model: String?
    public let tools: [ArkWebSearchTool]?
    public let usage: ArkImageUsage?


    public init(created: Int? = nil, data: [ArkImageGenerationData]? = nil, error: ProviderTaskError? = nil, model: String? = nil, tools: [ArkWebSearchTool]? = nil, usage: ArkImageUsage? = nil) {
        self.created = created
        self.data = data
        self.error = error
        self.model = model
        self.tools = tools
        self.usage = usage
    }
}

public struct XaiDeferredImageResponse: Codable {
    public let data: [XaiGeneratedImage]?
    public let error: [String: String]?
    public let requestId: String?
    public let status: String?
    public let usage: XaiUsage?


    public init(data: [XaiGeneratedImage]? = nil, error: [String: String]? = nil, requestId: String? = nil, status: String? = nil, usage: XaiUsage? = nil) {
        self.data = data
        self.error = error
        self.requestId = requestId
        self.status = status
        self.usage = usage
    }
}

public struct XaiGeneratedImage: Codable {
    public let b64Json: String?
    public let fileOutput: [String: String]?
    public let mimeType: String?
    public let storageError: String?
    public let url: String?


    public init(b64Json: String? = nil, fileOutput: [String: String]? = nil, mimeType: String? = nil, storageError: String? = nil, url: String? = nil) {
        self.b64Json = b64Json
        self.fileOutput = fileOutput
        self.mimeType = mimeType
        self.storageError = storageError
        self.url = url
    }
}

public struct XaiImageEditRequest: Codable {
    public let aspectRatio: String?
    public let deferred: Bool?
    public let image: XaiImageUrl?
    public let images: [XaiImageUrl]?
    public let model: String?
    public let n: Int?
    public let output: [String: String]?
    public let prompt: String?
    public let resolution: String?
    public let responseFormat: String?
    public let storageOptions: [String: String]?
    public let user: String?


    public init(aspectRatio: String? = nil, deferred: Bool? = nil, image: XaiImageUrl? = nil, images: [XaiImageUrl]? = nil, model: String? = nil, n: Int? = nil, output: [String: String]? = nil, prompt: String? = nil, resolution: String? = nil, responseFormat: String? = nil, storageOptions: [String: String]? = nil, user: String? = nil) {
        self.aspectRatio = aspectRatio
        self.deferred = deferred
        self.image = image
        self.images = images
        self.model = model
        self.n = n
        self.output = output
        self.prompt = prompt
        self.resolution = resolution
        self.responseFormat = responseFormat
        self.storageOptions = storageOptions
        self.user = user
    }
}

public struct XaiImageGenerationRequest: Codable {
    public let aspectRatio: String?
    public let deferred: Bool?
    public let model: String?
    public let n: Int?
    public let output: [String: String]?
    public let prompt: String?
    public let resolution: String?
    public let responseFormat: String?
    public let storageOptions: [String: String]?
    public let user: String?


    public init(aspectRatio: String? = nil, deferred: Bool? = nil, model: String? = nil, n: Int? = nil, output: [String: String]? = nil, prompt: String? = nil, resolution: String? = nil, responseFormat: String? = nil, storageOptions: [String: String]? = nil, user: String? = nil) {
        self.aspectRatio = aspectRatio
        self.deferred = deferred
        self.model = model
        self.n = n
        self.output = output
        self.prompt = prompt
        self.resolution = resolution
        self.responseFormat = responseFormat
        self.storageOptions = storageOptions
        self.user = user
    }
}

public struct XaiImageGenerationResponse: Codable {
    public let data: [XaiGeneratedImage]?
    public let usage: XaiUsage?


    public init(data: [XaiGeneratedImage]? = nil, usage: XaiUsage? = nil) {
        self.data = data
        self.usage = usage
    }
}

public struct XaiImageUrl: Codable {
    public let fileId: String?
    public let url: String?


    public init(fileId: String? = nil, url: String? = nil) {
        self.fileId = fileId
        self.url = url
    }
}

public struct XaiUsage: Codable {
    public let completionTokens: Int?
    public let costInUsdTicks: Int?
    public let numSourcesUsed: Int?
    public let promptTokens: Int?
    public let totalTokens: Int?


    public init(completionTokens: Int? = nil, costInUsdTicks: Int? = nil, numSourcesUsed: Int? = nil, promptTokens: Int? = nil, totalTokens: Int? = nil) {
        self.completionTokens = completionTokens
        self.costInUsdTicks = costInUsdTicks
        self.numSourcesUsed = numSourcesUsed
        self.promptTokens = promptTokens
        self.totalTokens = totalTokens
    }
}

public struct XaiVideoEditRequest: Codable {
    public let model: String?
    public let output: [String: String]?
    public let prompt: String?
    public let storageOptions: [String: String]?
    public let user: String?
    public let video: XaiVideoInput?


    public init(model: String? = nil, output: [String: String]? = nil, prompt: String? = nil, storageOptions: [String: String]? = nil, user: String? = nil, video: XaiVideoInput? = nil) {
        self.model = model
        self.output = output
        self.prompt = prompt
        self.storageOptions = storageOptions
        self.user = user
        self.video = video
    }
}

public struct XaiVideoExtensionRequest: Codable {
    public let duration: Int?
    public let model: String?
    public let output: [String: String]?
    public let prompt: String?
    public let storageOptions: [String: String]?
    public let video: XaiVideoInput?


    public init(duration: Int? = nil, model: String? = nil, output: [String: String]? = nil, prompt: String? = nil, storageOptions: [String: String]? = nil, video: XaiVideoInput? = nil) {
        self.duration = duration
        self.model = model
        self.output = output
        self.prompt = prompt
        self.storageOptions = storageOptions
        self.video = video
    }
}

public struct XaiVideoGenerationRequest: Codable {
    public let aspectRatio: String?
    public let duration: Int?
    public let image: XaiImageUrl?
    public let keyframes: [XaiImageUrl]?
    public let model: String?
    public let output: [String: String]?
    public let prompt: String?
    public let referenceAudios: [String]?
    public let referenceImages: [XaiImageUrl]?
    public let resolution: String?
    public let storageOptions: [String: String]?
    public let user: String?


    public init(aspectRatio: String? = nil, duration: Int? = nil, image: XaiImageUrl? = nil, keyframes: [XaiImageUrl]? = nil, model: String? = nil, output: [String: String]? = nil, prompt: String? = nil, referenceAudios: [String]? = nil, referenceImages: [XaiImageUrl]? = nil, resolution: String? = nil, storageOptions: [String: String]? = nil, user: String? = nil) {
        self.aspectRatio = aspectRatio
        self.duration = duration
        self.image = image
        self.keyframes = keyframes
        self.model = model
        self.output = output
        self.prompt = prompt
        self.referenceAudios = referenceAudios
        self.referenceImages = referenceImages
        self.resolution = resolution
        self.storageOptions = storageOptions
        self.user = user
    }
}

public struct XaiVideoGenerationTask: Codable {
    public let error: [String: String]?
    public let model: String?
    public let progress: Int?
    public let requestId: String?
    public let status: String?
    public let usage: XaiUsage?
    public let video: XaiVideoUrl?


    public init(error: [String: String]? = nil, model: String? = nil, progress: Int? = nil, requestId: String? = nil, status: String? = nil, usage: XaiUsage? = nil, video: XaiVideoUrl? = nil) {
        self.error = error
        self.model = model
        self.progress = progress
        self.requestId = requestId
        self.status = status
        self.usage = usage
        self.video = video
    }
}

public struct XaiVideoInput: Codable {
    public let fileId: String?
    public let url: String?


    public init(fileId: String? = nil, url: String? = nil) {
        self.fileId = fileId
        self.url = url
    }
}

public struct XaiVideoStartResponse: Codable {
    public let requestId: String?


    public init(requestId: String? = nil) {
        self.requestId = requestId
    }
}

public struct XaiVideoUrl: Codable {
    public let duration: Int?
    public let fileId: String?
    public let url: String?


    public init(duration: Int? = nil, fileId: String? = nil, url: String? = nil) {
        self.duration = duration
        self.fileId = fileId
        self.url = url
    }
}

public struct ZhipuContentFilter: Codable {
    public let level: Int?
    public let role: String?


    public init(level: Int? = nil, role: String? = nil) {
        self.level = level
        self.role = role
    }
}

public struct ZhipuImageGenerationRequest: Codable {
    public let model: String?
    public let prompt: String?
    public let quality: String?
    public let size: String?
    public let userId: String?
    public let watermarkEnabled: Bool?


    public init(model: String? = nil, prompt: String? = nil, quality: String? = nil, size: String? = nil, userId: String? = nil, watermarkEnabled: Bool? = nil) {
        self.model = model
        self.prompt = prompt
        self.quality = quality
        self.size = size
        self.userId = userId
        self.watermarkEnabled = watermarkEnabled
    }
}

public struct ZhipuImageGenerationResponse: Codable {
    public let contentFilter: [ZhipuContentFilter]?
    public let created: Int?
    public let data: [ZhipuImageResult]?


    public init(contentFilter: [ZhipuContentFilter]? = nil, created: Int? = nil, data: [ZhipuImageResult]? = nil) {
        self.contentFilter = contentFilter
        self.created = created
        self.data = data
    }
}

public struct ZhipuImageResult: Codable {
    public let url: String?


    public init(url: String? = nil) {
        self.url = url
    }
}

public struct ZhipuVideoGenerationRequest: Codable {
    public let duration: Int?
    public let fps: Int?
    public let imageUrl: String?
    public let model: String?
    public let prompt: String?
    public let quality: String?
    public let requestId: String?
    public let size: String?
    public let userId: String?
    public let watermarkEnabled: Bool?
    public let withAudio: Bool?


    public init(duration: Int? = nil, fps: Int? = nil, imageUrl: String? = nil, model: String? = nil, prompt: String? = nil, quality: String? = nil, requestId: String? = nil, size: String? = nil, userId: String? = nil, watermarkEnabled: Bool? = nil, withAudio: Bool? = nil) {
        self.duration = duration
        self.fps = fps
        self.imageUrl = imageUrl
        self.model = model
        self.prompt = prompt
        self.quality = quality
        self.requestId = requestId
        self.size = size
        self.userId = userId
        self.watermarkEnabled = watermarkEnabled
        self.withAudio = withAudio
    }
}

public struct ZhipuVideoGenerationTask: Codable {
    public let created: Int?
    public let id: String?
    public let imageResult: [ZhipuImageResult]?
    public let model: String?
    public let requestId: String?
    public let taskStatus: String?
    public let videoResult: [ZhipuVideoResult]?


    public init(created: Int? = nil, id: String? = nil, imageResult: [ZhipuImageResult]? = nil, model: String? = nil, requestId: String? = nil, taskStatus: String? = nil, videoResult: [ZhipuVideoResult]? = nil) {
        self.created = created
        self.id = id
        self.imageResult = imageResult
        self.model = model
        self.requestId = requestId
        self.taskStatus = taskStatus
        self.videoResult = videoResult
    }
}

public struct ZhipuVideoResult: Codable {
    public let coverImageUrl: String?
    public let url: String?


    public init(coverImageUrl: String? = nil, url: String? = nil) {
        self.coverImageUrl = coverImageUrl
        self.url = url
    }
}
