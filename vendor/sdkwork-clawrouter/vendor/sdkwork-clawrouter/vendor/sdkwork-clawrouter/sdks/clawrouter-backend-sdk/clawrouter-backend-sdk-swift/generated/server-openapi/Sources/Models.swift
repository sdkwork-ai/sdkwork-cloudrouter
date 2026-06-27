import Foundation

public struct AdjustmentsListResult: Codable {
    public let code: String?
    public let data: ServiceProviderCollectionResponse?
    public let msg: String?


    public init(code: String? = nil, data: ServiceProviderCollectionResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct AdminAiModelCreateRequest: Codable {
    public let apiFormat: String?
    public let capabilityIntro: String?
    public let contextTokens: String?
    public let description: String?
    public let displayName: String?
    public let inputModalities: [String]?
    public let limitations: [String]?
    public let maxOutputTokens: String?
    public let modalities: [String]?
    public let model: String?
    public let outputModalities: [String]?
    public let regionPrices: [AdminAiModelRegionPrice]?
    public let releaseStage: String?
    public let replacementModel: String?
    public let routingState: String?
    public let shelfState: String?
    public let supportedLanguages: [String]?
    public let supportsJsonSchema: Bool?
    public let supportsStreaming: Bool?
    public let supportsTools: Bool?
    public let trainingDataCutoff: String?
    public let type: String?
    public let useCases: [String]?
    public let vendorId: String?


    public init(apiFormat: String? = nil, capabilityIntro: String? = nil, contextTokens: String? = nil, description: String? = nil, displayName: String? = nil, inputModalities: [String]? = nil, limitations: [String]? = nil, maxOutputTokens: String? = nil, modalities: [String]? = nil, model: String? = nil, outputModalities: [String]? = nil, regionPrices: [AdminAiModelRegionPrice]? = nil, releaseStage: String? = nil, replacementModel: String? = nil, routingState: String? = nil, shelfState: String? = nil, supportedLanguages: [String]? = nil, supportsJsonSchema: Bool? = nil, supportsStreaming: Bool? = nil, supportsTools: Bool? = nil, trainingDataCutoff: String? = nil, type: String? = nil, useCases: [String]? = nil, vendorId: String? = nil) {
        self.apiFormat = apiFormat
        self.capabilityIntro = capabilityIntro
        self.contextTokens = contextTokens
        self.description = description
        self.displayName = displayName
        self.inputModalities = inputModalities
        self.limitations = limitations
        self.maxOutputTokens = maxOutputTokens
        self.modalities = modalities
        self.model = model
        self.outputModalities = outputModalities
        self.regionPrices = regionPrices
        self.releaseStage = releaseStage
        self.replacementModel = replacementModel
        self.routingState = routingState
        self.shelfState = shelfState
        self.supportedLanguages = supportedLanguages
        self.supportsJsonSchema = supportsJsonSchema
        self.supportsStreaming = supportsStreaming
        self.supportsTools = supportsTools
        self.trainingDataCutoff = trainingDataCutoff
        self.type = type
        self.useCases = useCases
        self.vendorId = vendorId
    }
}

public struct AdminAiModelItem: Codable {
    public let apiFormat: String?
    public let calls: String?
    public let capabilityIntro: String?
    public let contextTokens: String?
    public let description: String?
    public let displayName: String?
    public let id: String?
    public let inputModalities: [String]?
    public let limitations: [String]?
    public let maxOutputTokens: String?
    public let modalities: [String]?
    public let model: String?
    public let name: String?
    public let outputModalities: [String]?
    public let regionPrices: [AdminAiModelRegionPrice]?
    public let releaseStage: String?
    public let replacementModel: String?
    public let routingState: String?
    public let shelfState: String?
    public let status: String?
    public let supportedLanguages: [String]?
    public let supportsJsonSchema: Bool?
    public let supportsStreaming: Bool?
    public let supportsTools: Bool?
    public let trainingDataCutoff: String?
    public let type: String?
    public let useCases: [String]?
    public let vendorCode: String?
    public let vendorId: String?


    public init(apiFormat: String? = nil, calls: String? = nil, capabilityIntro: String? = nil, contextTokens: String? = nil, description: String? = nil, displayName: String? = nil, id: String? = nil, inputModalities: [String]? = nil, limitations: [String]? = nil, maxOutputTokens: String? = nil, modalities: [String]? = nil, model: String? = nil, name: String? = nil, outputModalities: [String]? = nil, regionPrices: [AdminAiModelRegionPrice]? = nil, releaseStage: String? = nil, replacementModel: String? = nil, routingState: String? = nil, shelfState: String? = nil, status: String? = nil, supportedLanguages: [String]? = nil, supportsJsonSchema: Bool? = nil, supportsStreaming: Bool? = nil, supportsTools: Bool? = nil, trainingDataCutoff: String? = nil, type: String? = nil, useCases: [String]? = nil, vendorCode: String? = nil, vendorId: String? = nil) {
        self.apiFormat = apiFormat
        self.calls = calls
        self.capabilityIntro = capabilityIntro
        self.contextTokens = contextTokens
        self.description = description
        self.displayName = displayName
        self.id = id
        self.inputModalities = inputModalities
        self.limitations = limitations
        self.maxOutputTokens = maxOutputTokens
        self.modalities = modalities
        self.model = model
        self.name = name
        self.outputModalities = outputModalities
        self.regionPrices = regionPrices
        self.releaseStage = releaseStage
        self.replacementModel = replacementModel
        self.routingState = routingState
        self.shelfState = shelfState
        self.status = status
        self.supportedLanguages = supportedLanguages
        self.supportsJsonSchema = supportsJsonSchema
        self.supportsStreaming = supportsStreaming
        self.supportsTools = supportsTools
        self.trainingDataCutoff = trainingDataCutoff
        self.type = type
        self.useCases = useCases
        self.vendorCode = vendorCode
        self.vendorId = vendorId
    }
}

public struct AdminAiModelMutationResponse: Codable {
    public let item: AdminAiModelItem?


    public init(item: AdminAiModelItem? = nil) {
        self.item = item
    }
}

public struct AdminAiModelRegionPrice: Codable {
    public let cacheReadPrice: String?
    public let cacheWritePrice: String?
    public let currency: String?
    public let priceIn: String?
    public let priceOut: String?
    public let regionCode: String?


    public init(cacheReadPrice: String? = nil, cacheWritePrice: String? = nil, currency: String? = nil, priceIn: String? = nil, priceOut: String? = nil, regionCode: String? = nil) {
        self.cacheReadPrice = cacheReadPrice
        self.cacheWritePrice = cacheWritePrice
        self.currency = currency
        self.priceIn = priceIn
        self.priceOut = priceOut
        self.regionCode = regionCode
    }
}

public struct AdminAiModelUpdateRequest: Codable {
    public let apiFormat: String?
    public let capabilityIntro: String?
    public let contextTokens: String?
    public let description: String?
    public let displayName: String?
    public let inputModalities: [String]?
    public let limitations: [String]?
    public let maxOutputTokens: String?
    public let modalities: [String]?
    public let model: String?
    public let outputModalities: [String]?
    public let regionPrices: [AdminAiModelRegionPrice]?
    public let releaseStage: String?
    public let replacementModel: String?
    public let routingState: String?
    public let shelfState: String?
    public let status: String?
    public let supportedLanguages: [String]?
    public let supportsJsonSchema: Bool?
    public let supportsStreaming: Bool?
    public let supportsTools: Bool?
    public let trainingDataCutoff: String?
    public let type: String?
    public let useCases: [String]?
    public let vendorId: String?


    public init(apiFormat: String? = nil, capabilityIntro: String? = nil, contextTokens: String? = nil, description: String? = nil, displayName: String? = nil, inputModalities: [String]? = nil, limitations: [String]? = nil, maxOutputTokens: String? = nil, modalities: [String]? = nil, model: String? = nil, outputModalities: [String]? = nil, regionPrices: [AdminAiModelRegionPrice]? = nil, releaseStage: String? = nil, replacementModel: String? = nil, routingState: String? = nil, shelfState: String? = nil, status: String? = nil, supportedLanguages: [String]? = nil, supportsJsonSchema: Bool? = nil, supportsStreaming: Bool? = nil, supportsTools: Bool? = nil, trainingDataCutoff: String? = nil, type: String? = nil, useCases: [String]? = nil, vendorId: String? = nil) {
        self.apiFormat = apiFormat
        self.capabilityIntro = capabilityIntro
        self.contextTokens = contextTokens
        self.description = description
        self.displayName = displayName
        self.inputModalities = inputModalities
        self.limitations = limitations
        self.maxOutputTokens = maxOutputTokens
        self.modalities = modalities
        self.model = model
        self.outputModalities = outputModalities
        self.regionPrices = regionPrices
        self.releaseStage = releaseStage
        self.replacementModel = replacementModel
        self.routingState = routingState
        self.shelfState = shelfState
        self.status = status
        self.supportedLanguages = supportedLanguages
        self.supportsJsonSchema = supportsJsonSchema
        self.supportsStreaming = supportsStreaming
        self.supportsTools = supportsTools
        self.trainingDataCutoff = trainingDataCutoff
        self.type = type
        self.useCases = useCases
        self.vendorId = vendorId
    }
}

public struct AdminAiModelsResponse: Codable {
    public let items: [AdminAiModelItem]?


    public init(items: [AdminAiModelItem]? = nil) {
        self.items = items
    }
}

public struct AdminAiResourceCreateRequest: Codable {
    public let apiEndpointCode: String?
    public let catalogKey: String?
    public let compositionMode: String?
    public let displayName: String?
    public let members: [AdminAiResourceMemberInput]?
    public let modalityCode: String?
    public let model: String?
    public let providerNativeModel: String?
    public let resourceCode: String?
    public let resourceType: String?
    public let sortOrder: String?
    public let status: String?
    public let vendorCode: String?


    public init(apiEndpointCode: String? = nil, catalogKey: String? = nil, compositionMode: String? = nil, displayName: String? = nil, members: [AdminAiResourceMemberInput]? = nil, modalityCode: String? = nil, model: String? = nil, providerNativeModel: String? = nil, resourceCode: String? = nil, resourceType: String? = nil, sortOrder: String? = nil, status: String? = nil, vendorCode: String? = nil) {
        self.apiEndpointCode = apiEndpointCode
        self.catalogKey = catalogKey
        self.compositionMode = compositionMode
        self.displayName = displayName
        self.members = members
        self.modalityCode = modalityCode
        self.model = model
        self.providerNativeModel = providerNativeModel
        self.resourceCode = resourceCode
        self.resourceType = resourceType
        self.sortOrder = sortOrder
        self.status = status
        self.vendorCode = vendorCode
    }
}

public struct AdminAiResourceGroupCreateRequest: Codable {
    public let description: String?
    public let groupCode: String?
    public let groupName: String?
    public let groupType: String?
    public let members: [AdminAiResourceGroupMemberInput]?
    public let selectionMode: String?
    public let sortOrder: String?
    public let status: String?


    public init(description: String? = nil, groupCode: String? = nil, groupName: String? = nil, groupType: String? = nil, members: [AdminAiResourceGroupMemberInput]? = nil, selectionMode: String? = nil, sortOrder: String? = nil, status: String? = nil) {
        self.description = description
        self.groupCode = groupCode
        self.groupName = groupName
        self.groupType = groupType
        self.members = members
        self.selectionMode = selectionMode
        self.sortOrder = sortOrder
        self.status = status
    }
}

public struct AdminAiResourceGroupDeleteResponse: Codable {
    public let deleted: Bool?


    public init(deleted: Bool? = nil) {
        self.deleted = deleted
    }
}

public struct AdminAiResourceGroupItem: Codable {
    public let capabilities: [String]?
    public let capability: String?
    public let description: String?
    public let dynamic_: Bool?
    public let groupCode: String?
    public let groupName: String?
    public let groupType: String?
    public let id: String?
    public let resourceCount: String?
    public let selectionMode: String?
    public let sortOrder: String?
    public let status: String?
    public let vendorCodes: [String]?


    public init(capabilities: [String]? = nil, capability: String? = nil, description: String? = nil, dynamic_: Bool? = nil, groupCode: String? = nil, groupName: String? = nil, groupType: String? = nil, id: String? = nil, resourceCount: String? = nil, selectionMode: String? = nil, sortOrder: String? = nil, status: String? = nil, vendorCodes: [String]? = nil) {
        self.capabilities = capabilities
        self.capability = capability
        self.description = description
        self.dynamic_ = dynamic_
        self.groupCode = groupCode
        self.groupName = groupName
        self.groupType = groupType
        self.id = id
        self.resourceCount = resourceCount
        self.selectionMode = selectionMode
        self.sortOrder = sortOrder
        self.status = status
        self.vendorCodes = vendorCodes
    }
}

public struct AdminAiResourceGroupMemberInput: Codable {
    public let itemRole: String?
    public let resourceCode: String?
    public let sortOrder: String?


    public init(itemRole: String? = nil, resourceCode: String? = nil, sortOrder: String? = nil) {
        self.itemRole = itemRole
        self.resourceCode = resourceCode
        self.sortOrder = sortOrder
    }
}

public struct AdminAiResourceGroupMutationResponse: Codable {
    public let item: AdminAiResourceGroupItem?


    public init(item: AdminAiResourceGroupItem? = nil) {
        self.item = item
    }
}

public struct AdminAiResourceGroupResourceItem: Codable {
    public let apiEndpointCode: String?
    public let catalogKey: String?
    public let displayName: String?
    public let id: String?
    public let memberRole: String?
    public let modalityCode: String?
    public let model: String?
    public let providerNativeModel: String?
    public let resourceCode: String?
    public let resourceType: String?
    public let sortOrder: String?
    public let status: String?
    public let vendorCode: String?


    public init(apiEndpointCode: String? = nil, catalogKey: String? = nil, displayName: String? = nil, id: String? = nil, memberRole: String? = nil, modalityCode: String? = nil, model: String? = nil, providerNativeModel: String? = nil, resourceCode: String? = nil, resourceType: String? = nil, sortOrder: String? = nil, status: String? = nil, vendorCode: String? = nil) {
        self.apiEndpointCode = apiEndpointCode
        self.catalogKey = catalogKey
        self.displayName = displayName
        self.id = id
        self.memberRole = memberRole
        self.modalityCode = modalityCode
        self.model = model
        self.providerNativeModel = providerNativeModel
        self.resourceCode = resourceCode
        self.resourceType = resourceType
        self.sortOrder = sortOrder
        self.status = status
        self.vendorCode = vendorCode
    }
}

public struct AdminAiResourceGroupResourcesResponse: Codable {
    public let items: [AdminAiResourceGroupResourceItem]?


    public init(items: [AdminAiResourceGroupResourceItem]? = nil) {
        self.items = items
    }
}

public struct AdminAiResourceGroupUpdateRequest: Codable {
    public let description: String?
    public let groupCode: String?
    public let groupName: String?
    public let groupType: String?
    public let members: [AdminAiResourceGroupMemberInput]?
    public let selectionMode: String?
    public let sortOrder: String?
    public let status: String?


    public init(description: String? = nil, groupCode: String? = nil, groupName: String? = nil, groupType: String? = nil, members: [AdminAiResourceGroupMemberInput]? = nil, selectionMode: String? = nil, sortOrder: String? = nil, status: String? = nil) {
        self.description = description
        self.groupCode = groupCode
        self.groupName = groupName
        self.groupType = groupType
        self.members = members
        self.selectionMode = selectionMode
        self.sortOrder = sortOrder
        self.status = status
    }
}

public struct AdminAiResourceGroupsResponse: Codable {
    public let items: [AdminAiResourceGroupItem]?


    public init(items: [AdminAiResourceGroupItem]? = nil) {
        self.items = items
    }
}

public struct AdminAiResourceItem: Codable {
    public let apiEndpointCode: String?
    public let capabilities: [String]?
    public let capability: String?
    public let catalogKey: String?
    public let compositionMode: String?
    public let displayName: String?
    public let id: String?
    public let members: [AdminAiResourceMemberItem]?
    public let modalityCode: String?
    public let model: String?
    public let providerNativeModel: String?
    public let resourceCode: String?
    public let resourceType: String?
    public let sortOrder: String?
    public let status: String?
    public let vendorCode: String?


    public init(apiEndpointCode: String? = nil, capabilities: [String]? = nil, capability: String? = nil, catalogKey: String? = nil, compositionMode: String? = nil, displayName: String? = nil, id: String? = nil, members: [AdminAiResourceMemberItem]? = nil, modalityCode: String? = nil, model: String? = nil, providerNativeModel: String? = nil, resourceCode: String? = nil, resourceType: String? = nil, sortOrder: String? = nil, status: String? = nil, vendorCode: String? = nil) {
        self.apiEndpointCode = apiEndpointCode
        self.capabilities = capabilities
        self.capability = capability
        self.catalogKey = catalogKey
        self.compositionMode = compositionMode
        self.displayName = displayName
        self.id = id
        self.members = members
        self.modalityCode = modalityCode
        self.model = model
        self.providerNativeModel = providerNativeModel
        self.resourceCode = resourceCode
        self.resourceType = resourceType
        self.sortOrder = sortOrder
        self.status = status
        self.vendorCode = vendorCode
    }
}

public struct AdminAiResourceMemberInput: Codable {
    public let memberResourceCode: String?
    public let memberRole: String?
    public let required_: Bool?
    public let sortOrder: String?


    public init(memberResourceCode: String? = nil, memberRole: String? = nil, required_: Bool? = nil, sortOrder: String? = nil) {
        self.memberResourceCode = memberResourceCode
        self.memberRole = memberRole
        self.required_ = required_
        self.sortOrder = sortOrder
    }
}

public struct AdminAiResourceMemberItem: Codable {
    public let memberResourceCode: String?
    public let memberRole: String?
    public let parentResourceCode: String?
    public let required_: Bool?
    public let sortOrder: String?


    public init(memberResourceCode: String? = nil, memberRole: String? = nil, parentResourceCode: String? = nil, required_: Bool? = nil, sortOrder: String? = nil) {
        self.memberResourceCode = memberResourceCode
        self.memberRole = memberRole
        self.parentResourceCode = parentResourceCode
        self.required_ = required_
        self.sortOrder = sortOrder
    }
}

public struct AdminAiResourceMutationResponse: Codable {
    public let item: AdminAiResourceItem?


    public init(item: AdminAiResourceItem? = nil) {
        self.item = item
    }
}

public struct AdminAiResourceUpdateRequest: Codable {
    public let apiEndpointCode: String?
    public let catalogKey: String?
    public let compositionMode: String?
    public let displayName: String?
    public let members: [AdminAiResourceMemberInput]?
    public let modalityCode: String?
    public let model: String?
    public let providerNativeModel: String?
    public let resourceCode: String?
    public let resourceType: String?
    public let sortOrder: String?
    public let status: String?
    public let vendorCode: String?


    public init(apiEndpointCode: String? = nil, catalogKey: String? = nil, compositionMode: String? = nil, displayName: String? = nil, members: [AdminAiResourceMemberInput]? = nil, modalityCode: String? = nil, model: String? = nil, providerNativeModel: String? = nil, resourceCode: String? = nil, resourceType: String? = nil, sortOrder: String? = nil, status: String? = nil, vendorCode: String? = nil) {
        self.apiEndpointCode = apiEndpointCode
        self.catalogKey = catalogKey
        self.compositionMode = compositionMode
        self.displayName = displayName
        self.members = members
        self.modalityCode = modalityCode
        self.model = model
        self.providerNativeModel = providerNativeModel
        self.resourceCode = resourceCode
        self.resourceType = resourceType
        self.sortOrder = sortOrder
        self.status = status
        self.vendorCode = vendorCode
    }
}

public struct AdminAiResourcesResponse: Codable {
    public let items: [AdminAiResourceItem]?


    public init(items: [AdminAiResourceItem]? = nil) {
        self.items = items
    }
}

public struct AdminAnalyticsInsight: Codable {
    public let detail: String?
    public let key: String?
    public let severity: String?
    public let title: String?
    public let value: String?


    public init(detail: String? = nil, key: String? = nil, severity: String? = nil, title: String? = nil, value: String? = nil) {
        self.detail = detail
        self.key = key
        self.severity = severity
        self.title = title
        self.value = value
    }
}

public struct AdminAnalyticsModelRankItem: Codable {
    public let averageTokensPerRequest: Double?
    public let catalogKey: String?
    public let errorRate: Double?
    public let modality: String?
    public let model: String?
    public let points: Double?
    public let rank: String?
    public let requestCount: String?
    public let totalTokens: Double?
    public let upstreamCost: Double?
    public let userCount: String?
    public let vendor: String?


    public init(averageTokensPerRequest: Double? = nil, catalogKey: String? = nil, errorRate: Double? = nil, modality: String? = nil, model: String? = nil, points: Double? = nil, rank: String? = nil, requestCount: String? = nil, totalTokens: Double? = nil, upstreamCost: Double? = nil, userCount: String? = nil, vendor: String? = nil) {
        self.averageTokensPerRequest = averageTokensPerRequest
        self.catalogKey = catalogKey
        self.errorRate = errorRate
        self.modality = modality
        self.model = model
        self.points = points
        self.rank = rank
        self.requestCount = requestCount
        self.totalTokens = totalTokens
        self.upstreamCost = upstreamCost
        self.userCount = userCount
        self.vendor = vendor
    }
}

public struct AdminAnalyticsModelRankings: Codable {
    public let points: [AdminAnalyticsModelRankItem]?
    public let requests: [AdminAnalyticsModelRankItem]?
    public let tokens: [AdminAnalyticsModelRankItem]?


    public init(points: [AdminAnalyticsModelRankItem]? = nil, requests: [AdminAnalyticsModelRankItem]? = nil, tokens: [AdminAnalyticsModelRankItem]? = nil) {
        self.points = points
        self.requests = requests
        self.tokens = tokens
    }
}

public struct AdminAnalyticsOverviewResponse: Codable {
    public let endTime: String?
    public let insights: [AdminAnalyticsInsight]?
    public let limit: String?
    public let modalityDistribution: [AdminPieChartItem]?
    public let modelDistribution: [AdminPieChartItem]?
    public let modelRankings: AdminAnalyticsModelRankings?
    public let startTime: String?
    public let summary: AdminAnalyticsSummary?
    public let timeRange: String?
    public let trend: [AdminAnalyticsTrendPoint]?
    public let userRankings: AdminAnalyticsUserRankings?


    public init(endTime: String? = nil, insights: [AdminAnalyticsInsight]? = nil, limit: String? = nil, modalityDistribution: [AdminPieChartItem]? = nil, modelDistribution: [AdminPieChartItem]? = nil, modelRankings: AdminAnalyticsModelRankings? = nil, startTime: String? = nil, summary: AdminAnalyticsSummary? = nil, timeRange: String? = nil, trend: [AdminAnalyticsTrendPoint]? = nil, userRankings: AdminAnalyticsUserRankings? = nil) {
        self.endTime = endTime
        self.insights = insights
        self.limit = limit
        self.modalityDistribution = modalityDistribution
        self.modelDistribution = modelDistribution
        self.modelRankings = modelRankings
        self.startTime = startTime
        self.summary = summary
        self.timeRange = timeRange
        self.trend = trend
        self.userRankings = userRankings
    }
}

public struct AdminAnalyticsSummary: Codable {
    public let activeModels: String?
    public let activeUsers: String?
    public let averagePointsPerRequest: Double?
    public let averageTokensPerRequest: Double?
    public let errorRate: Double?
    public let failedRequests: String?
    public let successfulRequests: String?
    public let totalPoints: Double?
    public let totalRequests: String?
    public let totalTokens: Double?
    public let totalUsers: String?
    public let upstreamCost: Double?


    public init(activeModels: String? = nil, activeUsers: String? = nil, averagePointsPerRequest: Double? = nil, averageTokensPerRequest: Double? = nil, errorRate: Double? = nil, failedRequests: String? = nil, successfulRequests: String? = nil, totalPoints: Double? = nil, totalRequests: String? = nil, totalTokens: Double? = nil, totalUsers: String? = nil, upstreamCost: Double? = nil) {
        self.activeModels = activeModels
        self.activeUsers = activeUsers
        self.averagePointsPerRequest = averagePointsPerRequest
        self.averageTokensPerRequest = averageTokensPerRequest
        self.errorRate = errorRate
        self.failedRequests = failedRequests
        self.successfulRequests = successfulRequests
        self.totalPoints = totalPoints
        self.totalRequests = totalRequests
        self.totalTokens = totalTokens
        self.totalUsers = totalUsers
        self.upstreamCost = upstreamCost
    }
}

public struct AdminAnalyticsTrendPoint: Codable {
    public let points: Double?
    public let requests: Double?
    public let time: String?
    public let tokens: Double?
    public let users: String?


    public init(points: Double? = nil, requests: Double? = nil, time: String? = nil, tokens: Double? = nil, users: String? = nil) {
        self.points = points
        self.requests = requests
        self.time = time
        self.tokens = tokens
        self.users = users
    }
}

public struct AdminAnalyticsUserRankItem: Codable {
    public let email: String?
    public let modelDistribution: [AdminPieChartItem]?
    public let points: Double?
    public let rank: String?
    public let requestCount: String?
    public let totalTokens: Double?
    public let userId: String?
    public let userName: String?


    public init(email: String? = nil, modelDistribution: [AdminPieChartItem]? = nil, points: Double? = nil, rank: String? = nil, requestCount: String? = nil, totalTokens: Double? = nil, userId: String? = nil, userName: String? = nil) {
        self.email = email
        self.modelDistribution = modelDistribution
        self.points = points
        self.rank = rank
        self.requestCount = requestCount
        self.totalTokens = totalTokens
        self.userId = userId
        self.userName = userName
    }
}

public struct AdminAnalyticsUserRankings: Codable {
    public let points: [AdminAnalyticsUserRankItem]?
    public let requests: [AdminAnalyticsUserRankItem]?
    public let tokens: [AdminAnalyticsUserRankItem]?


    public init(points: [AdminAnalyticsUserRankItem]? = nil, requests: [AdminAnalyticsUserRankItem]? = nil, tokens: [AdminAnalyticsUserRankItem]? = nil) {
        self.points = points
        self.requests = requests
        self.tokens = tokens
    }
}

public struct AdminAnnouncementCreateRequest: Codable {
    public let content: String?
    public let showAsPopup: Bool?
    public let status: String?
    public let target: String?
    public let title: String?


    public init(content: String? = nil, showAsPopup: Bool? = nil, status: String? = nil, target: String? = nil, title: String? = nil) {
        self.content = content
        self.showAsPopup = showAsPopup
        self.status = status
        self.target = target
        self.title = title
    }
}

public struct AdminAnnouncementItem: Codable {
    public let content: String?
    public let date: String?
    public let id: String?
    public let showAsPopup: Bool?
    public let status: String?
    public let target: String?
    public let title: String?


    public init(content: String? = nil, date: String? = nil, id: String? = nil, showAsPopup: Bool? = nil, status: String? = nil, target: String? = nil, title: String? = nil) {
        self.content = content
        self.date = date
        self.id = id
        self.showAsPopup = showAsPopup
        self.status = status
        self.target = target
        self.title = title
    }
}

public struct AdminAnnouncementMutationResponse: Codable {
    public let item: AdminAnnouncementItem?


    public init(item: AdminAnnouncementItem? = nil) {
        self.item = item
    }
}

public struct AdminAnnouncementUpdateRequest: Codable {
    public let content: String?
    public let showAsPopup: Bool?
    public let status: String?
    public let target: String?
    public let title: String?


    public init(content: String? = nil, showAsPopup: Bool? = nil, status: String? = nil, target: String? = nil, title: String? = nil) {
        self.content = content
        self.showAsPopup = showAsPopup
        self.status = status
        self.target = target
        self.title = title
    }
}

public struct AdminAnnouncementsResponse: Codable {
    public let items: [AdminAnnouncementItem]?


    public init(items: [AdminAnnouncementItem]? = nil) {
        self.items = items
    }
}

public struct AdminApiKeyCreateRequest: Codable {
    public let name: String?
    public let userId: String?


    public init(name: String? = nil, userId: String? = nil) {
        self.name = name
        self.userId = userId
    }
}

public struct AdminApiKeyCreateResponse: Codable {
    public let key: AdminApiKeyItem?
    public let rawKey: String?


    public init(key: AdminApiKeyItem? = nil, rawKey: String? = nil) {
        self.key = key
        self.rawKey = rawKey
    }
}

public struct AdminApiKeyItem: Codable {
    public let id: String?
    public let key: String?
    public let name: String?
    public let status: String?
    public let used: String?


    public init(id: String? = nil, key: String? = nil, name: String? = nil, status: String? = nil, used: String? = nil) {
        self.id = id
        self.key = key
        self.name = name
        self.status = status
        self.used = used
    }
}

public struct AdminAuthSettingsResponse: Codable {
    public let leftRailMode: String?
    public let loginMethods: [String]?
    public let oauthLoginEnabled: Bool?
    public let oauthProviders: [String]?
    public let oauthRegion: String?
    public let qrLoginEnabled: Bool?
    public let qrLoginType: String?
    public let recoveryMethods: [String]?
    public let registerMethods: [String]?
    public let verificationPolicy: AdminAuthVerificationPolicy?
    public let wechat: AdminAuthWechatSettings?


    public init(leftRailMode: String? = nil, loginMethods: [String]? = nil, oauthLoginEnabled: Bool? = nil, oauthProviders: [String]? = nil, oauthRegion: String? = nil, qrLoginEnabled: Bool? = nil, qrLoginType: String? = nil, recoveryMethods: [String]? = nil, registerMethods: [String]? = nil, verificationPolicy: AdminAuthVerificationPolicy? = nil, wechat: AdminAuthWechatSettings? = nil) {
        self.leftRailMode = leftRailMode
        self.loginMethods = loginMethods
        self.oauthLoginEnabled = oauthLoginEnabled
        self.oauthProviders = oauthProviders
        self.oauthRegion = oauthRegion
        self.qrLoginEnabled = qrLoginEnabled
        self.qrLoginType = qrLoginType
        self.recoveryMethods = recoveryMethods
        self.registerMethods = registerMethods
        self.verificationPolicy = verificationPolicy
        self.wechat = wechat
    }
}

public struct AdminAuthSettingsUpdateRequest: Codable {
    public let leftRailMode: String?
    public let loginMethods: [String]?
    public let oauthLoginEnabled: Bool?
    public let oauthProviders: [String]?
    public let oauthRegion: String?
    public let qrLoginEnabled: Bool?
    public let qrLoginType: String?
    public let recoveryMethods: [String]?
    public let registerMethods: [String]?
    public let verificationPolicy: AdminAuthVerificationPolicy?
    public let wechat: AdminAuthWechatSettingsUpdate?


    public init(leftRailMode: String? = nil, loginMethods: [String]? = nil, oauthLoginEnabled: Bool? = nil, oauthProviders: [String]? = nil, oauthRegion: String? = nil, qrLoginEnabled: Bool? = nil, qrLoginType: String? = nil, recoveryMethods: [String]? = nil, registerMethods: [String]? = nil, verificationPolicy: AdminAuthVerificationPolicy? = nil, wechat: AdminAuthWechatSettingsUpdate? = nil) {
        self.leftRailMode = leftRailMode
        self.loginMethods = loginMethods
        self.oauthLoginEnabled = oauthLoginEnabled
        self.oauthProviders = oauthProviders
        self.oauthRegion = oauthRegion
        self.qrLoginEnabled = qrLoginEnabled
        self.qrLoginType = qrLoginType
        self.recoveryMethods = recoveryMethods
        self.registerMethods = registerMethods
        self.verificationPolicy = verificationPolicy
        self.wechat = wechat
    }
}

public struct AdminAuthVerificationPolicy: Codable {
    public let emailCodeLoginEnabled: Bool?
    public let emailRegistrationVerificationRequired: Bool?
    public let phoneCodeLoginEnabled: Bool?
    public let phoneRegistrationVerificationRequired: Bool?


    public init(emailCodeLoginEnabled: Bool? = nil, emailRegistrationVerificationRequired: Bool? = nil, phoneCodeLoginEnabled: Bool? = nil, phoneRegistrationVerificationRequired: Bool? = nil) {
        self.emailCodeLoginEnabled = emailCodeLoginEnabled
        self.emailRegistrationVerificationRequired = emailRegistrationVerificationRequired
        self.phoneCodeLoginEnabled = phoneCodeLoginEnabled
        self.phoneRegistrationVerificationRequired = phoneRegistrationVerificationRequired
    }
}

public struct AdminAuthWechatMini: Codable {
    public let appId: String?
    public let enabled: Bool?
    public let env: String?
    public let key: String?
    public let name: String?
    public let path: String?
    public let primary: Bool?
    public let secretRef: String?
    public let url: String?


    public init(appId: String? = nil, enabled: Bool? = nil, env: String? = nil, key: String? = nil, name: String? = nil, path: String? = nil, primary: Bool? = nil, secretRef: String? = nil, url: String? = nil) {
        self.appId = appId
        self.enabled = enabled
        self.env = env
        self.key = key
        self.name = name
        self.path = path
        self.primary = primary
        self.secretRef = secretRef
        self.url = url
    }
}

public struct AdminAuthWechatOfficial: Codable {
    public let aesKeyRef: String?
    public let appId: String?
    public let enabled: Bool?
    public let key: String?
    public let name: String?
    public let originalId: String?
    public let primary: Bool?
    public let scene: String?
    public let secretRef: String?
    public let tokenRef: String?
    public let url: String?


    public init(aesKeyRef: String? = nil, appId: String? = nil, enabled: Bool? = nil, key: String? = nil, name: String? = nil, originalId: String? = nil, primary: Bool? = nil, scene: String? = nil, secretRef: String? = nil, tokenRef: String? = nil, url: String? = nil) {
        self.aesKeyRef = aesKeyRef
        self.appId = appId
        self.enabled = enabled
        self.key = key
        self.name = name
        self.originalId = originalId
        self.primary = primary
        self.scene = scene
        self.secretRef = secretRef
        self.tokenRef = tokenRef
        self.url = url
    }
}

public struct AdminAuthWechatSettings: Codable {
    public let mini: [AdminAuthWechatMini]?
    public let official: [AdminAuthWechatOfficial]?


    public init(mini: [AdminAuthWechatMini]? = nil, official: [AdminAuthWechatOfficial]? = nil) {
        self.mini = mini
        self.official = official
    }
}

public struct AdminAuthWechatSettingsUpdate: Codable {
    public let mini: [AdminAuthWechatMini]?
    public let official: [AdminAuthWechatOfficial]?


    public init(mini: [AdminAuthWechatMini]? = nil, official: [AdminAuthWechatOfficial]? = nil) {
        self.mini = mini
        self.official = official
    }
}

public struct AdminCacheInstance: Codable {
    public let cacheDeletes: String?
    public let cacheErrors: String?
    public let cacheHits: String?
    public let cacheInspections: String?
    public let cacheMisses: String?
    public let cacheRefreshes: String?
    public let cacheWrites: String?
    public let connectionProfileName: String?
    public let defaultTtlSeconds: String?
    public let entryCount: String?
    public let expiredEntryCount: String?
    public let keyPrefix: String?
    public let maxEntries: String?
    public let name: String?
    public let providerKind: String?
    public let purpose: String?
    public let status: String?
    public let supportsDelete: Bool?
    public let supportsInspect: Bool?
    public let supportsRefresh: Bool?


    public init(cacheDeletes: String? = nil, cacheErrors: String? = nil, cacheHits: String? = nil, cacheInspections: String? = nil, cacheMisses: String? = nil, cacheRefreshes: String? = nil, cacheWrites: String? = nil, connectionProfileName: String? = nil, defaultTtlSeconds: String? = nil, entryCount: String? = nil, expiredEntryCount: String? = nil, keyPrefix: String? = nil, maxEntries: String? = nil, name: String? = nil, providerKind: String? = nil, purpose: String? = nil, status: String? = nil, supportsDelete: Bool? = nil, supportsInspect: Bool? = nil, supportsRefresh: Bool? = nil) {
        self.cacheDeletes = cacheDeletes
        self.cacheErrors = cacheErrors
        self.cacheHits = cacheHits
        self.cacheInspections = cacheInspections
        self.cacheMisses = cacheMisses
        self.cacheRefreshes = cacheRefreshes
        self.cacheWrites = cacheWrites
        self.connectionProfileName = connectionProfileName
        self.defaultTtlSeconds = defaultTtlSeconds
        self.entryCount = entryCount
        self.expiredEntryCount = expiredEntryCount
        self.keyPrefix = keyPrefix
        self.maxEntries = maxEntries
        self.name = name
        self.providerKind = providerKind
        self.purpose = purpose
        self.status = status
        self.supportsDelete = supportsDelete
        self.supportsInspect = supportsInspect
        self.supportsRefresh = supportsRefresh
    }
}

public struct AdminCacheKeyItem: Codable {
    public let expiresInSeconds: String?
    public let instanceName: String?
    public let key: String?
    public let namespace: String?
    public let status: String?


    public init(expiresInSeconds: String? = nil, instanceName: String? = nil, key: String? = nil, namespace: String? = nil, status: String? = nil) {
        self.expiresInSeconds = expiresInSeconds
        self.instanceName = instanceName
        self.key = key
        self.namespace = namespace
        self.status = status
    }
}

public struct AdminCacheKeyListResponse: Codable {
    public let hasMore: Bool?
    public let instanceName: String?
    public let items: [AdminCacheKeyItem]?
    public let limit: String?
    public let namespace: String?
    public let nextCursor: String?
    public let returnedItems: String?
    public let scanComplete: Bool?
    public let scannedItems: String?


    public init(hasMore: Bool? = nil, instanceName: String? = nil, items: [AdminCacheKeyItem]? = nil, limit: String? = nil, namespace: String? = nil, nextCursor: String? = nil, returnedItems: String? = nil, scanComplete: Bool? = nil, scannedItems: String? = nil) {
        self.hasMore = hasMore
        self.instanceName = instanceName
        self.items = items
        self.limit = limit
        self.namespace = namespace
        self.nextCursor = nextCursor
        self.returnedItems = returnedItems
        self.scanComplete = scanComplete
        self.scannedItems = scannedItems
    }
}

public struct AdminCacheNamespacePolicy: Codable {
    public let consistency: String?
    public let enabled: Bool?
    public let failureMode: String?
    public let instanceName: String?
    public let jitterPercent: String?
    public let namespace: String?
    public let scope: String?
    public let sensitivity: String?
    public let staleWhileRevalidateSeconds: String?
    public let tags: [String]?
    public let ttlSeconds: String?


    public init(consistency: String? = nil, enabled: Bool? = nil, failureMode: String? = nil, instanceName: String? = nil, jitterPercent: String? = nil, namespace: String? = nil, scope: String? = nil, sensitivity: String? = nil, staleWhileRevalidateSeconds: String? = nil, tags: [String]? = nil, ttlSeconds: String? = nil) {
        self.consistency = consistency
        self.enabled = enabled
        self.failureMode = failureMode
        self.instanceName = instanceName
        self.jitterPercent = jitterPercent
        self.namespace = namespace
        self.scope = scope
        self.sensitivity = sensitivity
        self.staleWhileRevalidateSeconds = staleWhileRevalidateSeconds
        self.tags = tags
        self.ttlSeconds = ttlSeconds
    }
}

public struct AdminCacheOperationResponse: Codable {
    public let cacheKey: String?
    public let deletedEntries: String?
    public let instanceName: String?
    public let namespace: String?
    public let operation: String?
    public let refreshedEntries: String?
    public let status: String?


    public init(cacheKey: String? = nil, deletedEntries: String? = nil, instanceName: String? = nil, namespace: String? = nil, operation: String? = nil, refreshedEntries: String? = nil, status: String? = nil) {
        self.cacheKey = cacheKey
        self.deletedEntries = deletedEntries
        self.instanceName = instanceName
        self.namespace = namespace
        self.operation = operation
        self.refreshedEntries = refreshedEntries
        self.status = status
    }
}

public struct AdminCacheOverviewResponse: Codable {
    public let instances: [AdminCacheInstance]?
    public let namespacePolicies: [AdminCacheNamespacePolicy]?
    public let summary: AdminCacheSummary?


    public init(instances: [AdminCacheInstance]? = nil, namespacePolicies: [AdminCacheNamespacePolicy]? = nil, summary: AdminCacheSummary? = nil) {
        self.instances = instances
        self.namespacePolicies = namespacePolicies
        self.summary = summary
    }
}

public struct AdminCacheSummary: Codable {
    public let cacheDeletes: String?
    public let cacheErrors: String?
    public let cacheHits: String?
    public let cacheInspections: String?
    public let cacheMisses: String?
    public let cacheRefreshes: String?
    public let cacheWrites: String?
    public let expiredEntries: String?
    public let runtimeTarget: String?
    public let totalEntries: String?
    public let totalInstances: String?
    public let totalNamespaces: String?


    public init(cacheDeletes: String? = nil, cacheErrors: String? = nil, cacheHits: String? = nil, cacheInspections: String? = nil, cacheMisses: String? = nil, cacheRefreshes: String? = nil, cacheWrites: String? = nil, expiredEntries: String? = nil, runtimeTarget: String? = nil, totalEntries: String? = nil, totalInstances: String? = nil, totalNamespaces: String? = nil) {
        self.cacheDeletes = cacheDeletes
        self.cacheErrors = cacheErrors
        self.cacheHits = cacheHits
        self.cacheInspections = cacheInspections
        self.cacheMisses = cacheMisses
        self.cacheRefreshes = cacheRefreshes
        self.cacheWrites = cacheWrites
        self.expiredEntries = expiredEntries
        self.runtimeTarget = runtimeTarget
        self.totalEntries = totalEntries
        self.totalInstances = totalInstances
        self.totalNamespaces = totalNamespaces
    }
}

public struct AdminCapacityPair: Codable {
    public let total: Double?
    public let used: Double?


    public init(total: Double? = nil, used: Double? = nil) {
        self.total = total
        self.used = used
    }
}

public struct AdminChannelCreateRequest: Codable {
    public let accessType: String?
    public let capabilities: [String]?
    public let channelType: String?
    public let circuitBreakerPolicy: ProviderCircuitBreakerPolicy?
    public let credentialRotation: String?
    public let credentials: [AdminChannelCredentialInput]?
    public let expiresAt: String?
    public let name: String?
    public let protocol_: String?
    public let resourceCodes: [String]?
    public let retryPolicy: ProviderRetryPolicy?
    public let status: String?
    public let timeoutMs: String?
    public let vendor: String?
    public let weight: String?


    public init(accessType: String? = nil, capabilities: [String]? = nil, channelType: String? = nil, circuitBreakerPolicy: ProviderCircuitBreakerPolicy? = nil, credentialRotation: String? = nil, credentials: [AdminChannelCredentialInput]? = nil, expiresAt: String? = nil, name: String? = nil, protocol_: String? = nil, resourceCodes: [String]? = nil, retryPolicy: ProviderRetryPolicy? = nil, status: String? = nil, timeoutMs: String? = nil, vendor: String? = nil, weight: String? = nil) {
        self.accessType = accessType
        self.capabilities = capabilities
        self.channelType = channelType
        self.circuitBreakerPolicy = circuitBreakerPolicy
        self.credentialRotation = credentialRotation
        self.credentials = credentials
        self.expiresAt = expiresAt
        self.name = name
        self.protocol_ = protocol_
        self.resourceCodes = resourceCodes
        self.retryPolicy = retryPolicy
        self.status = status
        self.timeoutMs = timeoutMs
        self.vendor = vendor
        self.weight = weight
    }
}

public struct AdminChannelCredentialInput: Codable {
    public let apiKey: String?
    public let baseUrl: String?
    public let name: String?
    public let priority: String?
    public let secretRef: String?
    public let status: String?
    public let weight: String?


    public init(apiKey: String? = nil, baseUrl: String? = nil, name: String? = nil, priority: String? = nil, secretRef: String? = nil, status: String? = nil, weight: String? = nil) {
        self.apiKey = apiKey
        self.baseUrl = baseUrl
        self.name = name
        self.priority = priority
        self.secretRef = secretRef
        self.status = status
        self.weight = weight
    }
}

public struct AdminChannelCredentialItem: Codable {
    public let apiKey: String?
    public let baseUrl: String?
    public let credentialId: String?
    public let errors: String?
    public let id: String?
    public let maskedLabel: String?
    public let name: String?
    public let priority: String?
    public let secretRef: String?
    public let status: String?
    public let weight: String?


    public init(apiKey: String? = nil, baseUrl: String? = nil, credentialId: String? = nil, errors: String? = nil, id: String? = nil, maskedLabel: String? = nil, name: String? = nil, priority: String? = nil, secretRef: String? = nil, status: String? = nil, weight: String? = nil) {
        self.apiKey = apiKey
        self.baseUrl = baseUrl
        self.credentialId = credentialId
        self.errors = errors
        self.id = id
        self.maskedLabel = maskedLabel
        self.name = name
        self.priority = priority
        self.secretRef = secretRef
        self.status = status
        self.weight = weight
    }
}

public struct AdminChannelGroupChannelBindingInput: Codable {
    public let apiScope: [String]?
    public let capabilities: [String]?
    public let channelId: String?
    public let priority: Int?
    public let resourceCodes: [String]?
    public let status: String?
    public let weight: Int?


    public init(apiScope: [String]? = nil, capabilities: [String]? = nil, channelId: String? = nil, priority: Int? = nil, resourceCodes: [String]? = nil, status: String? = nil, weight: Int? = nil) {
        self.apiScope = apiScope
        self.capabilities = capabilities
        self.channelId = channelId
        self.priority = priority
        self.resourceCodes = resourceCodes
        self.status = status
        self.weight = weight
    }
}

public struct AdminChannelGroupChannelBindingItem: Codable {
    public let apiScope: [String]?
    public let capabilities: [String]?
    public let channelCode: String?
    public let channelGroupId: String?
    public let channelId: String?
    public let channelName: String?
    public let healthStatus: String?
    public let id: String?
    public let priority: Int?
    public let providerCode: String?
    public let providerName: String?
    public let resourceCodes: [String]?
    public let status: String?
    public let weight: Int?


    public init(apiScope: [String]? = nil, capabilities: [String]? = nil, channelCode: String? = nil, channelGroupId: String? = nil, channelId: String? = nil, channelName: String? = nil, healthStatus: String? = nil, id: String? = nil, priority: Int? = nil, providerCode: String? = nil, providerName: String? = nil, resourceCodes: [String]? = nil, status: String? = nil, weight: Int? = nil) {
        self.apiScope = apiScope
        self.capabilities = capabilities
        self.channelCode = channelCode
        self.channelGroupId = channelGroupId
        self.channelId = channelId
        self.channelName = channelName
        self.healthStatus = healthStatus
        self.id = id
        self.priority = priority
        self.providerCode = providerCode
        self.providerName = providerName
        self.resourceCodes = resourceCodes
        self.status = status
        self.weight = weight
    }
}

public struct AdminChannelGroupChannelBindingsReplaceRequest: Codable {
    public let items: [AdminChannelGroupChannelBindingInput]?


    public init(items: [AdminChannelGroupChannelBindingInput]? = nil) {
        self.items = items
    }
}

public struct AdminChannelGroupChannelBindingsResponse: Codable {
    public let items: [AdminChannelGroupChannelBindingItem]?


    public init(items: [AdminChannelGroupChannelBindingItem]? = nil) {
        self.items = items
    }
}

public struct AdminChannelGroupCreateRequest: Codable {
    public let capacity: [String: Any]?
    public let groupCode: String?
    public let groupName: String?
    public let groupType: String?
    public let officialPriceMultiplier: Double?
    public let priceReferenceMode: String?
    public let rateMultiplier: Double?
    public let resourceCodes: [String]?
    public let resourceGroupCodes: [String]?
    public let status: String?


    public init(capacity: [String: Any]? = nil, groupCode: String? = nil, groupName: String? = nil, groupType: String? = nil, officialPriceMultiplier: Double? = nil, priceReferenceMode: String? = nil, rateMultiplier: Double? = nil, resourceCodes: [String]? = nil, resourceGroupCodes: [String]? = nil, status: String? = nil) {
        self.capacity = capacity
        self.groupCode = groupCode
        self.groupName = groupName
        self.groupType = groupType
        self.officialPriceMultiplier = officialPriceMultiplier
        self.priceReferenceMode = priceReferenceMode
        self.rateMultiplier = rateMultiplier
        self.resourceCodes = resourceCodes
        self.resourceGroupCodes = resourceGroupCodes
        self.status = status
    }
}

public struct AdminChannelGroupItem: Codable {
    public let accountCount: AdminCountPair?
    public let capacity: AdminCapacityPair?
    public let groupCode: String?
    public let groupName: String?
    public let groupType: String?
    public let id: String?
    public let officialPriceMultiplier: Double?
    public let priceReferenceMode: String?
    public let providerCode: String?
    public let rateMultiplier: Double?
    public let resourceCodes: [String]?
    public let resourceGroupCodes: [String]?
    public let status: String?
    public let usage: AdminUsagePair?


    public init(accountCount: AdminCountPair? = nil, capacity: AdminCapacityPair? = nil, groupCode: String? = nil, groupName: String? = nil, groupType: String? = nil, id: String? = nil, officialPriceMultiplier: Double? = nil, priceReferenceMode: String? = nil, providerCode: String? = nil, rateMultiplier: Double? = nil, resourceCodes: [String]? = nil, resourceGroupCodes: [String]? = nil, status: String? = nil, usage: AdminUsagePair? = nil) {
        self.accountCount = accountCount
        self.capacity = capacity
        self.groupCode = groupCode
        self.groupName = groupName
        self.groupType = groupType
        self.id = id
        self.officialPriceMultiplier = officialPriceMultiplier
        self.priceReferenceMode = priceReferenceMode
        self.providerCode = providerCode
        self.rateMultiplier = rateMultiplier
        self.resourceCodes = resourceCodes
        self.resourceGroupCodes = resourceGroupCodes
        self.status = status
        self.usage = usage
    }
}

public struct AdminChannelGroupMutationResponse: Codable {
    public let item: AdminChannelGroupItem?


    public init(item: AdminChannelGroupItem? = nil) {
        self.item = item
    }
}

public struct AdminChannelGroupRouteExplainIssue: Codable {
    public let code: String?
    public let details: [String]?
    public let severity: String?


    public init(code: String? = nil, details: [String]? = nil, severity: String? = nil) {
        self.code = code
        self.details = details
        self.severity = severity
    }
}

public struct AdminChannelGroupRouteExplainResponse: Codable {
    public let activeHealthyBindingCount: Int?
    public let apiScope: [String]?
    public let capabilities: [String]?
    public let configuredResourceAccessCount: Int?
    public let configuredResourceGroupAccessCount: Int?
    public let effectiveResourceCodes: [String]?
    public let issueCodes: [String]?
    public let issues: [AdminChannelGroupRouteExplainIssue]?
    public let ready: Bool?
    public let resourceCodes: [String]?
    public let resourceGroupCodes: [String]?
    public let routableBindingCount: Int?
    public let source: String?


    public init(activeHealthyBindingCount: Int? = nil, apiScope: [String]? = nil, capabilities: [String]? = nil, configuredResourceAccessCount: Int? = nil, configuredResourceGroupAccessCount: Int? = nil, effectiveResourceCodes: [String]? = nil, issueCodes: [String]? = nil, issues: [AdminChannelGroupRouteExplainIssue]? = nil, ready: Bool? = nil, resourceCodes: [String]? = nil, resourceGroupCodes: [String]? = nil, routableBindingCount: Int? = nil, source: String? = nil) {
        self.activeHealthyBindingCount = activeHealthyBindingCount
        self.apiScope = apiScope
        self.capabilities = capabilities
        self.configuredResourceAccessCount = configuredResourceAccessCount
        self.configuredResourceGroupAccessCount = configuredResourceGroupAccessCount
        self.effectiveResourceCodes = effectiveResourceCodes
        self.issueCodes = issueCodes
        self.issues = issues
        self.ready = ready
        self.resourceCodes = resourceCodes
        self.resourceGroupCodes = resourceGroupCodes
        self.routableBindingCount = routableBindingCount
        self.source = source
    }
}

public struct AdminChannelGroupUpdateRequest: Codable {
    public let capacity: [String: Any]?
    public let groupCode: String?
    public let groupName: String?
    public let groupType: String?
    public let officialPriceMultiplier: Double?
    public let priceReferenceMode: String?
    public let rateMultiplier: Double?
    public let resourceCodes: [String]?
    public let resourceGroupCodes: [String]?
    public let status: String?


    public init(capacity: [String: Any]? = nil, groupCode: String? = nil, groupName: String? = nil, groupType: String? = nil, officialPriceMultiplier: Double? = nil, priceReferenceMode: String? = nil, rateMultiplier: Double? = nil, resourceCodes: [String]? = nil, resourceGroupCodes: [String]? = nil, status: String? = nil) {
        self.capacity = capacity
        self.groupCode = groupCode
        self.groupName = groupName
        self.groupType = groupType
        self.officialPriceMultiplier = officialPriceMultiplier
        self.priceReferenceMode = priceReferenceMode
        self.rateMultiplier = rateMultiplier
        self.resourceCodes = resourceCodes
        self.resourceGroupCodes = resourceGroupCodes
        self.status = status
    }
}

public struct AdminChannelGroupsResponse: Codable {
    public let items: [AdminChannelGroupItem]?


    public init(items: [AdminChannelGroupItem]? = nil) {
        self.items = items
    }
}

public struct AdminChannelItem: Codable {
    public let accessType: String?
    public let balance: String?
    public let capabilities: [String]?
    public let channelId: String?
    public let channelType: String?
    public let circuitBreakerPolicy: ProviderCircuitBreakerPolicy?
    public let createdAt: String?
    public let credentialRotation: String?
    public let credentials: [AdminChannelCredentialItem]?
    public let errors: String?
    public let expiresAt: String?
    public let id: String?
    public let isMultimodal: Bool?
    public let name: String?
    public let protocol_: String?
    public let resourceCodes: [String]?
    public let retryPolicy: ProviderRetryPolicy?
    public let status: String?
    public let timeoutMs: String?
    public let vendor: String?
    public let weight: String?


    public init(accessType: String? = nil, balance: String? = nil, capabilities: [String]? = nil, channelId: String? = nil, channelType: String? = nil, circuitBreakerPolicy: ProviderCircuitBreakerPolicy? = nil, createdAt: String? = nil, credentialRotation: String? = nil, credentials: [AdminChannelCredentialItem]? = nil, errors: String? = nil, expiresAt: String? = nil, id: String? = nil, isMultimodal: Bool? = nil, name: String? = nil, protocol_: String? = nil, resourceCodes: [String]? = nil, retryPolicy: ProviderRetryPolicy? = nil, status: String? = nil, timeoutMs: String? = nil, vendor: String? = nil, weight: String? = nil) {
        self.accessType = accessType
        self.balance = balance
        self.capabilities = capabilities
        self.channelId = channelId
        self.channelType = channelType
        self.circuitBreakerPolicy = circuitBreakerPolicy
        self.createdAt = createdAt
        self.credentialRotation = credentialRotation
        self.credentials = credentials
        self.errors = errors
        self.expiresAt = expiresAt
        self.id = id
        self.isMultimodal = isMultimodal
        self.name = name
        self.protocol_ = protocol_
        self.resourceCodes = resourceCodes
        self.retryPolicy = retryPolicy
        self.status = status
        self.timeoutMs = timeoutMs
        self.vendor = vendor
        self.weight = weight
    }
}

public struct AdminChannelMutationResponse: Codable {
    public let item: AdminChannelItem?


    public init(item: AdminChannelItem? = nil) {
        self.item = item
    }
}

public struct AdminChannelTestResponse: Codable {
    public let channelId: String?
    public let item: AdminChannelItem?
    public let latency: String?
    public let status: String?
    public let success: Bool?


    public init(channelId: String? = nil, item: AdminChannelItem? = nil, latency: String? = nil, status: String? = nil, success: Bool? = nil) {
        self.channelId = channelId
        self.item = item
        self.latency = latency
        self.status = status
        self.success = success
    }
}

public struct AdminChannelUpdateRequest: Codable {
    public let accessType: String?
    public let capabilities: [String]?
    public let channelType: String?
    public let circuitBreakerPolicy: ProviderCircuitBreakerPolicy?
    public let credentialRotation: String?
    public let credentials: [AdminChannelCredentialInput]?
    public let expiresAt: String?
    public let id: String?
    public let name: String?
    public let protocol_: String?
    public let resourceCodes: [String]?
    public let retryPolicy: ProviderRetryPolicy?
    public let status: String?
    public let timeoutMs: String?
    public let vendor: String?
    public let weight: String?


    public init(accessType: String? = nil, capabilities: [String]? = nil, channelType: String? = nil, circuitBreakerPolicy: ProviderCircuitBreakerPolicy? = nil, credentialRotation: String? = nil, credentials: [AdminChannelCredentialInput]? = nil, expiresAt: String? = nil, id: String? = nil, name: String? = nil, protocol_: String? = nil, resourceCodes: [String]? = nil, retryPolicy: ProviderRetryPolicy? = nil, status: String? = nil, timeoutMs: String? = nil, vendor: String? = nil, weight: String? = nil) {
        self.accessType = accessType
        self.capabilities = capabilities
        self.channelType = channelType
        self.circuitBreakerPolicy = circuitBreakerPolicy
        self.credentialRotation = credentialRotation
        self.credentials = credentials
        self.expiresAt = expiresAt
        self.id = id
        self.name = name
        self.protocol_ = protocol_
        self.resourceCodes = resourceCodes
        self.retryPolicy = retryPolicy
        self.status = status
        self.timeoutMs = timeoutMs
        self.vendor = vendor
        self.weight = weight
    }
}

public struct AdminChannelsResponse: Codable {
    public let items: [AdminChannelItem]?


    public init(items: [AdminChannelItem]? = nil) {
        self.items = items
    }
}

public struct AdminCountPair: Codable {
    public let available: Double?
    public let total: Double?


    public init(available: Double? = nil, total: Double? = nil) {
        self.available = available
        self.total = total
    }
}

public struct AdminDashboardDataResponse: Codable {
    public let activeUsers: String?
    public let modelDistribution: [AdminPieChartItem]?
    public let multimodal: [AdminPieChartItem]?
    public let recentUsage: [AdminDashboardRecentUsageItem]?
    public let traffic: [AdminDashboardTrafficItem]?
    public let userConsumption: [AdminPieChartItem]?


    public init(activeUsers: String? = nil, modelDistribution: [AdminPieChartItem]? = nil, multimodal: [AdminPieChartItem]? = nil, recentUsage: [AdminDashboardRecentUsageItem]? = nil, traffic: [AdminDashboardTrafficItem]? = nil, userConsumption: [AdminPieChartItem]? = nil) {
        self.activeUsers = activeUsers
        self.modelDistribution = modelDistribution
        self.multimodal = multimodal
        self.recentUsage = recentUsage
        self.traffic = traffic
        self.userConsumption = userConsumption
    }
}

public struct AdminDashboardRecentUsageItem: Codable {
    public let billingMode: String?
    public let cost: String?
    public let id: String?
    public let isApiUser: Bool?
    public let model: String?
    public let status: String?
    public let time: String?
    public let type: String?
    public let usageCount: Double?
    public let usageIn: Double?
    public let usageOut: Double?
    public let user: String?


    public init(billingMode: String? = nil, cost: String? = nil, id: String? = nil, isApiUser: Bool? = nil, model: String? = nil, status: String? = nil, time: String? = nil, type: String? = nil, usageCount: Double? = nil, usageIn: Double? = nil, usageOut: Double? = nil, user: String? = nil) {
        self.billingMode = billingMode
        self.cost = cost
        self.id = id
        self.isApiUser = isApiUser
        self.model = model
        self.status = status
        self.time = time
        self.type = type
        self.usageCount = usageCount
        self.usageIn = usageIn
        self.usageOut = usageOut
        self.user = user
    }
}

public struct AdminDashboardTrafficItem: Codable {
    public let cost: Double?
    public let requests: Double?
    public let time: String?
    public let tokens: Double?


    public init(cost: Double? = nil, requests: Double? = nil, time: String? = nil, tokens: Double? = nil) {
        self.cost = cost
        self.requests = requests
        self.time = time
        self.tokens = tokens
    }
}

public struct AdminDeleteResponse: Codable {
    public let deleted: Bool?


    public init(deleted: Bool? = nil) {
        self.deleted = deleted
    }
}

public struct AdminFirewallItem: Codable {
    public let id: String?
    public let reason: String?
    public let time: String?
    public let type: String?
    public let value: String?


    public init(id: String? = nil, reason: String? = nil, time: String? = nil, type: String? = nil, value: String? = nil) {
        self.id = id
        self.reason = reason
        self.time = time
        self.type = type
        self.value = value
    }
}

public struct AdminFirewallMutationResponse: Codable {
    public let item: AdminFirewallItem?


    public init(item: AdminFirewallItem? = nil) {
        self.item = item
    }
}

public struct AdminFirewallRuleCreateRequest: Codable {
    public let reason: String?
    public let type: String?
    public let value: String?


    public init(reason: String? = nil, type: String? = nil, value: String? = nil) {
        self.reason = reason
        self.type = type
        self.value = value
    }
}

public struct AdminFirewallRulesResponse: Codable {
    public let items: [AdminFirewallItem]?


    public init(items: [AdminFirewallItem]? = nil) {
        self.items = items
    }
}

public struct AdminIpLimitCreateRequest: Codable {
    public let blockDuration: String?
    public let rpm: Int?
    public let rps: Int?
    public let ruleName: String?
    public let status: String?
    public let targetIp: String?


    public init(blockDuration: String? = nil, rpm: Int? = nil, rps: Int? = nil, ruleName: String? = nil, status: String? = nil, targetIp: String? = nil) {
        self.blockDuration = blockDuration
        self.rpm = rpm
        self.rps = rps
        self.ruleName = ruleName
        self.status = status
        self.targetIp = targetIp
    }
}

public struct AdminIpLimitsResponse: Codable {
    public let items: [AdminRateLimitItem]?


    public init(items: [AdminRateLimitItem]? = nil) {
        self.items = items
    }
}

public struct AdminMcpBindingCreateRequest: Codable {
    public let allowedTools: [String]?
    public let deniedTools: [String]?
    public let enabled: Bool?
    public let ownerId: String?
    public let ownerType: String?
    public let policyJson: [String: String]?
    public let priority: Int?
    public let serverRevisionId: String?
    public let status: String?
    public let toolId: String?


    public init(allowedTools: [String]? = nil, deniedTools: [String]? = nil, enabled: Bool? = nil, ownerId: String? = nil, ownerType: String? = nil, policyJson: [String: String]? = nil, priority: Int? = nil, serverRevisionId: String? = nil, status: String? = nil, toolId: String? = nil) {
        self.allowedTools = allowedTools
        self.deniedTools = deniedTools
        self.enabled = enabled
        self.ownerId = ownerId
        self.ownerType = ownerType
        self.policyJson = policyJson
        self.priority = priority
        self.serverRevisionId = serverRevisionId
        self.status = status
        self.toolId = toolId
    }
}

public struct AdminMcpBindingItem: Codable {
    public let allowedTools: [String]?
    public let createdAt: String?
    public let deniedTools: [String]?
    public let enabled: Bool?
    public let id: String?
    public let organizationId: String?
    public let ownerId: String?
    public let ownerType: String?
    public let policyJson: [String: String]?
    public let priority: Int?
    public let serverId: String?
    public let serverRevisionId: String?
    public let snapshotJson: [String: String]?
    public let status: String?
    public let tenantId: String?
    public let toolId: String?
    public let updatedAt: String?
    public let uuid: String?


    public init(allowedTools: [String]? = nil, createdAt: String? = nil, deniedTools: [String]? = nil, enabled: Bool? = nil, id: String? = nil, organizationId: String? = nil, ownerId: String? = nil, ownerType: String? = nil, policyJson: [String: String]? = nil, priority: Int? = nil, serverId: String? = nil, serverRevisionId: String? = nil, snapshotJson: [String: String]? = nil, status: String? = nil, tenantId: String? = nil, toolId: String? = nil, updatedAt: String? = nil, uuid: String? = nil) {
        self.allowedTools = allowedTools
        self.createdAt = createdAt
        self.deniedTools = deniedTools
        self.enabled = enabled
        self.id = id
        self.organizationId = organizationId
        self.ownerId = ownerId
        self.ownerType = ownerType
        self.policyJson = policyJson
        self.priority = priority
        self.serverId = serverId
        self.serverRevisionId = serverRevisionId
        self.snapshotJson = snapshotJson
        self.status = status
        self.tenantId = tenantId
        self.toolId = toolId
        self.updatedAt = updatedAt
        self.uuid = uuid
    }
}

public struct AdminMcpBindingListResponse: Codable {
    public let items: [AdminMcpBindingItem]?


    public init(items: [AdminMcpBindingItem]? = nil) {
        self.items = items
    }
}

public struct AdminMcpBindingMutationResponse: Codable {
    public let item: AdminMcpBindingItem?


    public init(item: AdminMcpBindingItem? = nil) {
        self.item = item
    }
}

public struct AdminMcpBindingUpdateRequest: Codable {
    public let allowedTools: [String]?
    public let deniedTools: [String]?
    public let enabled: Bool?
    public let ownerId: String?
    public let ownerType: String?
    public let policyJson: [String: String]?
    public let priority: Int?
    public let serverRevisionId: String?
    public let status: String?
    public let toolId: String?


    public init(allowedTools: [String]? = nil, deniedTools: [String]? = nil, enabled: Bool? = nil, ownerId: String? = nil, ownerType: String? = nil, policyJson: [String: String]? = nil, priority: Int? = nil, serverRevisionId: String? = nil, status: String? = nil, toolId: String? = nil) {
        self.allowedTools = allowedTools
        self.deniedTools = deniedTools
        self.enabled = enabled
        self.ownerId = ownerId
        self.ownerType = ownerType
        self.policyJson = policyJson
        self.priority = priority
        self.serverRevisionId = serverRevisionId
        self.status = status
        self.toolId = toolId
    }
}

public struct AdminMcpDiscoveryResponse: Codable {
    public let checkedAt: String?
    public let discoveredCount: String?
    public let serverId: String?
    public let tools: [AdminMcpToolItem]?


    public init(checkedAt: String? = nil, discoveredCount: String? = nil, serverId: String? = nil, tools: [AdminMcpToolItem]? = nil) {
        self.checkedAt = checkedAt
        self.discoveredCount = discoveredCount
        self.serverId = serverId
        self.tools = tools
    }
}

public struct AdminMcpHealthCheckResponse: Codable {
    public let checkedAt: String?
    public let errorMasked: String?
    public let healthStatus: String?
    public let healthy: Bool?
    public let latencyMs: String?
    public let serverId: String?


    public init(checkedAt: String? = nil, errorMasked: String? = nil, healthStatus: String? = nil, healthy: Bool? = nil, latencyMs: String? = nil, serverId: String? = nil) {
        self.checkedAt = checkedAt
        self.errorMasked = errorMasked
        self.healthStatus = healthStatus
        self.healthy = healthy
        self.latencyMs = latencyMs
        self.serverId = serverId
    }
}

public struct AdminMcpServerCreateRequest: Codable {
    public let categoryId: String?
    public let description: String?
    public let name: String?
    public let serverKey: String?
    public let tags: [String]?
    public let transport: String?
    public let visibility: String?


    public init(categoryId: String? = nil, description: String? = nil, name: String? = nil, serverKey: String? = nil, tags: [String]? = nil, transport: String? = nil, visibility: String? = nil) {
        self.categoryId = categoryId
        self.description = description
        self.name = name
        self.serverKey = serverKey
        self.tags = tags
        self.transport = transport
        self.visibility = visibility
    }
}

public struct AdminMcpServerItem: Codable {
    public let categoryCode: String?
    public let categoryId: String?
    public let createdAt: String?
    public let deprecatedAt: String?
    public let description: String?
    public let healthStatus: String?
    public let id: String?
    public let lastCheckedAt: String?
    public let lastErrorMasked: String?
    public let latestRevisionId: String?
    public let name: String?
    public let organizationId: String?
    public let ownerUserId: String?
    public let publishedAt: String?
    public let publishedRevisionId: String?
    public let serverKey: String?
    public let status: String?
    public let tags: [String]?
    public let tenantId: String?
    public let transport: String?
    public let updatedAt: String?
    public let uuid: String?
    public let visibility: String?


    public init(categoryCode: String? = nil, categoryId: String? = nil, createdAt: String? = nil, deprecatedAt: String? = nil, description: String? = nil, healthStatus: String? = nil, id: String? = nil, lastCheckedAt: String? = nil, lastErrorMasked: String? = nil, latestRevisionId: String? = nil, name: String? = nil, organizationId: String? = nil, ownerUserId: String? = nil, publishedAt: String? = nil, publishedRevisionId: String? = nil, serverKey: String? = nil, status: String? = nil, tags: [String]? = nil, tenantId: String? = nil, transport: String? = nil, updatedAt: String? = nil, uuid: String? = nil, visibility: String? = nil) {
        self.categoryCode = categoryCode
        self.categoryId = categoryId
        self.createdAt = createdAt
        self.deprecatedAt = deprecatedAt
        self.description = description
        self.healthStatus = healthStatus
        self.id = id
        self.lastCheckedAt = lastCheckedAt
        self.lastErrorMasked = lastErrorMasked
        self.latestRevisionId = latestRevisionId
        self.name = name
        self.organizationId = organizationId
        self.ownerUserId = ownerUserId
        self.publishedAt = publishedAt
        self.publishedRevisionId = publishedRevisionId
        self.serverKey = serverKey
        self.status = status
        self.tags = tags
        self.tenantId = tenantId
        self.transport = transport
        self.updatedAt = updatedAt
        self.uuid = uuid
        self.visibility = visibility
    }
}

public struct AdminMcpServerListResponse: Codable {
    public let items: [AdminMcpServerItem]?


    public init(items: [AdminMcpServerItem]? = nil) {
        self.items = items
    }
}

public struct AdminMcpServerMutationResponse: Codable {
    public let item: AdminMcpServerItem?


    public init(item: AdminMcpServerItem? = nil) {
        self.item = item
    }
}

public struct AdminMcpServerRevisionCreateRequest: Codable {
    public let argsJson: [String]?
    public let authType: String?
    public let command: String?
    public let endpointUrl: String?
    public let envSchema: [String: String]?
    public let retryPolicy: [String: String]?
    public let revisionNo: String?
    public let secretRef: String?
    public let timeoutMs: Int?
    public let transport: String?


    public init(argsJson: [String]? = nil, authType: String? = nil, command: String? = nil, endpointUrl: String? = nil, envSchema: [String: String]? = nil, retryPolicy: [String: String]? = nil, revisionNo: String? = nil, secretRef: String? = nil, timeoutMs: Int? = nil, transport: String? = nil) {
        self.argsJson = argsJson
        self.authType = authType
        self.command = command
        self.endpointUrl = endpointUrl
        self.envSchema = envSchema
        self.retryPolicy = retryPolicy
        self.revisionNo = revisionNo
        self.secretRef = secretRef
        self.timeoutMs = timeoutMs
        self.transport = transport
    }
}

public struct AdminMcpServerRevisionItem: Codable {
    public let argsJson: [String]?
    public let authType: String?
    public let command: String?
    public let configHash: String?
    public let createdAt: String?
    public let createdBy: String?
    public let deprecatedAt: String?
    public let endpointUrl: String?
    public let envSchema: [String: String]?
    public let id: String?
    public let lifecycleStatus: String?
    public let organizationId: String?
    public let publishedAt: String?
    public let retryPolicy: [String: String]?
    public let revisionNo: String?
    public let secretRef: String?
    public let serverId: String?
    public let status: String?
    public let tenantId: String?
    public let timeoutMs: Int?
    public let transport: String?
    public let updatedAt: String?
    public let uuid: String?


    public init(argsJson: [String]? = nil, authType: String? = nil, command: String? = nil, configHash: String? = nil, createdAt: String? = nil, createdBy: String? = nil, deprecatedAt: String? = nil, endpointUrl: String? = nil, envSchema: [String: String]? = nil, id: String? = nil, lifecycleStatus: String? = nil, organizationId: String? = nil, publishedAt: String? = nil, retryPolicy: [String: String]? = nil, revisionNo: String? = nil, secretRef: String? = nil, serverId: String? = nil, status: String? = nil, tenantId: String? = nil, timeoutMs: Int? = nil, transport: String? = nil, updatedAt: String? = nil, uuid: String? = nil) {
        self.argsJson = argsJson
        self.authType = authType
        self.command = command
        self.configHash = configHash
        self.createdAt = createdAt
        self.createdBy = createdBy
        self.deprecatedAt = deprecatedAt
        self.endpointUrl = endpointUrl
        self.envSchema = envSchema
        self.id = id
        self.lifecycleStatus = lifecycleStatus
        self.organizationId = organizationId
        self.publishedAt = publishedAt
        self.retryPolicy = retryPolicy
        self.revisionNo = revisionNo
        self.secretRef = secretRef
        self.serverId = serverId
        self.status = status
        self.tenantId = tenantId
        self.timeoutMs = timeoutMs
        self.transport = transport
        self.updatedAt = updatedAt
        self.uuid = uuid
    }
}

public struct AdminMcpServerRevisionListResponse: Codable {
    public let items: [AdminMcpServerRevisionItem]?


    public init(items: [AdminMcpServerRevisionItem]? = nil) {
        self.items = items
    }
}

public struct AdminMcpServerRevisionMutationResponse: Codable {
    public let item: AdminMcpServerRevisionItem?


    public init(item: AdminMcpServerRevisionItem? = nil) {
        self.item = item
    }
}

public struct AdminMcpServerUpdateRequest: Codable {
    public let categoryId: String?
    public let description: String?
    public let name: String?
    public let serverKey: String?
    public let status: String?
    public let tags: [String]?
    public let transport: String?
    public let visibility: String?


    public init(categoryId: String? = nil, description: String? = nil, name: String? = nil, serverKey: String? = nil, status: String? = nil, tags: [String]? = nil, transport: String? = nil, visibility: String? = nil) {
        self.categoryId = categoryId
        self.description = description
        self.name = name
        self.serverKey = serverKey
        self.status = status
        self.tags = tags
        self.transport = transport
        self.visibility = visibility
    }
}

public struct AdminMcpToolItem: Codable {
    public let createdAt: String?
    public let description: String?
    public let discoveredAt: String?
    public let enabled: Bool?
    public let id: String?
    public let inputSchema: [String: String]?
    public let lastInvokedAt: String?
    public let name: String?
    public let organizationId: String?
    public let outputSchema: [String: String]?
    public let rateLimitPolicy: [String: String]?
    public let requiresApproval: Bool?
    public let riskLevel: String?
    public let schemaHash: String?
    public let serverId: String?
    public let serverRevisionId: String?
    public let sortWeight: Int?
    public let status: String?
    public let tenantId: String?
    public let toolKey: String?
    public let updatedAt: String?
    public let uuid: String?


    public init(createdAt: String? = nil, description: String? = nil, discoveredAt: String? = nil, enabled: Bool? = nil, id: String? = nil, inputSchema: [String: String]? = nil, lastInvokedAt: String? = nil, name: String? = nil, organizationId: String? = nil, outputSchema: [String: String]? = nil, rateLimitPolicy: [String: String]? = nil, requiresApproval: Bool? = nil, riskLevel: String? = nil, schemaHash: String? = nil, serverId: String? = nil, serverRevisionId: String? = nil, sortWeight: Int? = nil, status: String? = nil, tenantId: String? = nil, toolKey: String? = nil, updatedAt: String? = nil, uuid: String? = nil) {
        self.createdAt = createdAt
        self.description = description
        self.discoveredAt = discoveredAt
        self.enabled = enabled
        self.id = id
        self.inputSchema = inputSchema
        self.lastInvokedAt = lastInvokedAt
        self.name = name
        self.organizationId = organizationId
        self.outputSchema = outputSchema
        self.rateLimitPolicy = rateLimitPolicy
        self.requiresApproval = requiresApproval
        self.riskLevel = riskLevel
        self.schemaHash = schemaHash
        self.serverId = serverId
        self.serverRevisionId = serverRevisionId
        self.sortWeight = sortWeight
        self.status = status
        self.tenantId = tenantId
        self.toolKey = toolKey
        self.updatedAt = updatedAt
        self.uuid = uuid
    }
}

public struct AdminMcpToolListResponse: Codable {
    public let items: [AdminMcpToolItem]?


    public init(items: [AdminMcpToolItem]? = nil) {
        self.items = items
    }
}

public struct AdminMcpToolMutationResponse: Codable {
    public let item: AdminMcpToolItem?


    public init(item: AdminMcpToolItem? = nil) {
        self.item = item
    }
}

public struct AdminMcpToolUpdateRequest: Codable {
    public let description: String?
    public let enabled: Bool?
    public let inputSchema: [String: String]?
    public let name: String?
    public let outputSchema: [String: String]?
    public let rateLimitPolicy: [String: String]?
    public let requiresApproval: Bool?
    public let riskLevel: String?
    public let sortWeight: Int?
    public let status: String?


    public init(description: String? = nil, enabled: Bool? = nil, inputSchema: [String: String]? = nil, name: String? = nil, outputSchema: [String: String]? = nil, rateLimitPolicy: [String: String]? = nil, requiresApproval: Bool? = nil, riskLevel: String? = nil, sortWeight: Int? = nil, status: String? = nil) {
        self.description = description
        self.enabled = enabled
        self.inputSchema = inputSchema
        self.name = name
        self.outputSchema = outputSchema
        self.rateLimitPolicy = rateLimitPolicy
        self.requiresApproval = requiresApproval
        self.riskLevel = riskLevel
        self.sortWeight = sortWeight
        self.status = status
    }
}

public struct AdminModelCatalogSyncRequest: Codable {
    public let catalogRoot: String?
    public let catalogVersion: String?
    public let force: Bool?
    public let mode: String?
    public let source: String?
    public let vendorCodes: [String]?


    public init(catalogRoot: String? = nil, catalogVersion: String? = nil, force: Bool? = nil, mode: String? = nil, source: String? = nil, vendorCodes: [String]? = nil) {
        self.catalogRoot = catalogRoot
        self.catalogVersion = catalogVersion
        self.force = force
        self.mode = mode
        self.source = source
        self.vendorCodes = vendorCodes
    }
}

public struct AdminModelCatalogSyncResponse: Codable {
    public let acceptedCount: String?
    public let capabilityCount: String?
    public let catalogRoot: String?
    public let catalogVersion: String?
    public let dryRun: Bool?
    public let familyCount: String?
    public let meterCount: String?
    public let mode: String?
    public let modelCount: String?
    public let models: [AdminAiModelItem]?
    public let priceCount: String?
    public let rankingCount: String?
    public let requestedCatalogVersion: String?
    public let snapshotId: String?
    public let source: String?
    public let sourceHash: String?
    public let syncRunId: String?
    public let synced: Bool?
    public let vendorCodes: [String]?
    public let vendorCount: String?
    public let vendors: [AdminModelVendorItem]?


    public init(acceptedCount: String? = nil, capabilityCount: String? = nil, catalogRoot: String? = nil, catalogVersion: String? = nil, dryRun: Bool? = nil, familyCount: String? = nil, meterCount: String? = nil, mode: String? = nil, modelCount: String? = nil, models: [AdminAiModelItem]? = nil, priceCount: String? = nil, rankingCount: String? = nil, requestedCatalogVersion: String? = nil, snapshotId: String? = nil, source: String? = nil, sourceHash: String? = nil, syncRunId: String? = nil, synced: Bool? = nil, vendorCodes: [String]? = nil, vendorCount: String? = nil, vendors: [AdminModelVendorItem]? = nil) {
        self.acceptedCount = acceptedCount
        self.capabilityCount = capabilityCount
        self.catalogRoot = catalogRoot
        self.catalogVersion = catalogVersion
        self.dryRun = dryRun
        self.familyCount = familyCount
        self.meterCount = meterCount
        self.mode = mode
        self.modelCount = modelCount
        self.models = models
        self.priceCount = priceCount
        self.rankingCount = rankingCount
        self.requestedCatalogVersion = requestedCatalogVersion
        self.snapshotId = snapshotId
        self.source = source
        self.sourceHash = sourceHash
        self.syncRunId = syncRunId
        self.synced = synced
        self.vendorCodes = vendorCodes
        self.vendorCount = vendorCount
        self.vendors = vendors
    }
}

public struct AdminModelLimitCreateRequest: Codable {
    public let channelGroup: String?
    public let model: String?
    public let rpm: Int?
    public let status: String?
    public let tpm: Int?


    public init(channelGroup: String? = nil, model: String? = nil, rpm: Int? = nil, status: String? = nil, tpm: Int? = nil) {
        self.channelGroup = channelGroup
        self.model = model
        self.rpm = rpm
        self.status = status
        self.tpm = tpm
    }
}

public struct AdminModelLimitsResponse: Codable {
    public let items: [AdminRateLimitItem]?


    public init(items: [AdminRateLimitItem]? = nil) {
        self.items = items
    }
}

public struct AdminModelMappingCreateRequest: Codable {
    public let bindings: [AdminModelMappingRuleBindingInput]?
    public let enabled: Bool?
    public let mappingItems: [AdminModelMappingRuleItemInput]?
    public let mappingMode: String?
    public let matchType: String?
    public let sourceVendorCode: String?
    public let sourceVendorId: String?
    public let targetVendorCode: String?
    public let targetVendorId: String?


    public init(bindings: [AdminModelMappingRuleBindingInput]? = nil, enabled: Bool? = nil, mappingItems: [AdminModelMappingRuleItemInput]? = nil, mappingMode: String? = nil, matchType: String? = nil, sourceVendorCode: String? = nil, sourceVendorId: String? = nil, targetVendorCode: String? = nil, targetVendorId: String? = nil) {
        self.bindings = bindings
        self.enabled = enabled
        self.mappingItems = mappingItems
        self.mappingMode = mappingMode
        self.matchType = matchType
        self.sourceVendorCode = sourceVendorCode
        self.sourceVendorId = sourceVendorId
        self.targetVendorCode = targetVendorCode
        self.targetVendorId = targetVendorId
    }
}

public struct AdminModelMappingDeleteResponse: Codable {
    public let deleted: Bool?


    public init(deleted: Bool? = nil) {
        self.deleted = deleted
    }
}

public struct AdminModelMappingMutationResponse: Codable {
    public let item: AdminModelMappingRule?


    public init(item: AdminModelMappingRule? = nil) {
        self.item = item
    }
}

public struct AdminModelMappingResolveRequest: Codable {
    public let channelCode: String?
    public let channelId: String?
    public let providerAccountCode: String?
    public let providerAccountId: String?
    public let sourceModel: String?
    public let vendorCode: String?


    public init(channelCode: String? = nil, channelId: String? = nil, providerAccountCode: String? = nil, providerAccountId: String? = nil, sourceModel: String? = nil, vendorCode: String? = nil) {
        self.channelCode = channelCode
        self.channelId = channelId
        self.providerAccountCode = providerAccountCode
        self.providerAccountId = providerAccountId
        self.sourceModel = sourceModel
        self.vendorCode = vendorCode
    }
}

public struct AdminModelMappingResolveResponse: Codable {
    public let matched: Bool?
    public let matchedBindingType: String?
    public let rule: AdminModelMappingRule?
    public let sourceModel: String?
    public let targetCatalogKey: String?
    public let targetModel: String?
    public let targetProviderModel: String?
    public let targetProviderNativeModel: String?
    public let targetVendorCode: String?


    public init(matched: Bool? = nil, matchedBindingType: String? = nil, rule: AdminModelMappingRule? = nil, sourceModel: String? = nil, targetCatalogKey: String? = nil, targetModel: String? = nil, targetProviderModel: String? = nil, targetProviderNativeModel: String? = nil, targetVendorCode: String? = nil) {
        self.matched = matched
        self.matchedBindingType = matchedBindingType
        self.rule = rule
        self.sourceModel = sourceModel
        self.targetCatalogKey = targetCatalogKey
        self.targetModel = targetModel
        self.targetProviderModel = targetProviderModel
        self.targetProviderNativeModel = targetProviderNativeModel
        self.targetVendorCode = targetVendorCode
    }
}

public struct AdminModelMappingRule: Codable {
    public let bindingType: String?
    public let bindings: [AdminModelMappingRuleBinding]?
    public let createdAt: String?
    public let enabled: Bool?
    public let id: String?
    public let mappingItems: [AdminModelMappingRuleItem]?
    public let mappingMode: String?
    public let matchType: String?
    public let sourceVendorCode: String?
    public let sourceVendorId: String?
    public let targetVendorCode: String?
    public let targetVendorId: String?
    public let updatedAt: String?


    public init(bindingType: String? = nil, bindings: [AdminModelMappingRuleBinding]? = nil, createdAt: String? = nil, enabled: Bool? = nil, id: String? = nil, mappingItems: [AdminModelMappingRuleItem]? = nil, mappingMode: String? = nil, matchType: String? = nil, sourceVendorCode: String? = nil, sourceVendorId: String? = nil, targetVendorCode: String? = nil, targetVendorId: String? = nil, updatedAt: String? = nil) {
        self.bindingType = bindingType
        self.bindings = bindings
        self.createdAt = createdAt
        self.enabled = enabled
        self.id = id
        self.mappingItems = mappingItems
        self.mappingMode = mappingMode
        self.matchType = matchType
        self.sourceVendorCode = sourceVendorCode
        self.sourceVendorId = sourceVendorId
        self.targetVendorCode = targetVendorCode
        self.targetVendorId = targetVendorId
        self.updatedAt = updatedAt
    }
}

public struct AdminModelMappingRuleBinding: Codable {
    public let bindingCode: String?
    public let bindingId: String?
    public let bindingName: String?
    public let bindingType: String?
    public let createdAt: String?
    public let enabled: Bool?
    public let id: String?
    public let sortOrder: String?
    public let updatedAt: String?


    public init(bindingCode: String? = nil, bindingId: String? = nil, bindingName: String? = nil, bindingType: String? = nil, createdAt: String? = nil, enabled: Bool? = nil, id: String? = nil, sortOrder: String? = nil, updatedAt: String? = nil) {
        self.bindingCode = bindingCode
        self.bindingId = bindingId
        self.bindingName = bindingName
        self.bindingType = bindingType
        self.createdAt = createdAt
        self.enabled = enabled
        self.id = id
        self.sortOrder = sortOrder
        self.updatedAt = updatedAt
    }
}

public struct AdminModelMappingRuleBindingInput: Codable {
    public let bindingCode: String?
    public let bindingId: String?
    public let bindingName: String?
    public let bindingType: String?
    public let enabled: Bool?
    public let id: String?


    public init(bindingCode: String? = nil, bindingId: String? = nil, bindingName: String? = nil, bindingType: String? = nil, enabled: Bool? = nil, id: String? = nil) {
        self.bindingCode = bindingCode
        self.bindingId = bindingId
        self.bindingName = bindingName
        self.bindingType = bindingType
        self.enabled = enabled
        self.id = id
    }
}

public struct AdminModelMappingRuleItem: Codable {
    public let createdAt: String?
    public let enabled: Bool?
    public let id: String?
    public let sortOrder: String?
    public let sourceCatalogKey: String?
    public let sourceModel: String?
    public let targetCatalogKey: String?
    public let targetModel: String?
    public let targetProviderModel: String?
    public let targetProviderNativeModel: String?
    public let updatedAt: String?


    public init(createdAt: String? = nil, enabled: Bool? = nil, id: String? = nil, sortOrder: String? = nil, sourceCatalogKey: String? = nil, sourceModel: String? = nil, targetCatalogKey: String? = nil, targetModel: String? = nil, targetProviderModel: String? = nil, targetProviderNativeModel: String? = nil, updatedAt: String? = nil) {
        self.createdAt = createdAt
        self.enabled = enabled
        self.id = id
        self.sortOrder = sortOrder
        self.sourceCatalogKey = sourceCatalogKey
        self.sourceModel = sourceModel
        self.targetCatalogKey = targetCatalogKey
        self.targetModel = targetModel
        self.targetProviderModel = targetProviderModel
        self.targetProviderNativeModel = targetProviderNativeModel
        self.updatedAt = updatedAt
    }
}

public struct AdminModelMappingRuleItemInput: Codable {
    public let enabled: Bool?
    public let id: String?
    public let sourceCatalogKey: String?
    public let sourceModel: String?
    public let targetCatalogKey: String?
    public let targetModel: String?
    public let targetProviderModel: String?
    public let targetProviderNativeModel: String?


    public init(enabled: Bool? = nil, id: String? = nil, sourceCatalogKey: String? = nil, sourceModel: String? = nil, targetCatalogKey: String? = nil, targetModel: String? = nil, targetProviderModel: String? = nil, targetProviderNativeModel: String? = nil) {
        self.enabled = enabled
        self.id = id
        self.sourceCatalogKey = sourceCatalogKey
        self.sourceModel = sourceModel
        self.targetCatalogKey = targetCatalogKey
        self.targetModel = targetModel
        self.targetProviderModel = targetProviderModel
        self.targetProviderNativeModel = targetProviderNativeModel
    }
}

public struct AdminModelMappingUpdateRequest: Codable {
    public let bindings: [AdminModelMappingRuleBindingInput]?
    public let enabled: Bool?
    public let mappingItems: [AdminModelMappingRuleItemInput]?
    public let mappingMode: String?
    public let matchType: String?
    public let sourceVendorCode: String?
    public let sourceVendorId: String?
    public let targetVendorCode: String?
    public let targetVendorId: String?


    public init(bindings: [AdminModelMappingRuleBindingInput]? = nil, enabled: Bool? = nil, mappingItems: [AdminModelMappingRuleItemInput]? = nil, mappingMode: String? = nil, matchType: String? = nil, sourceVendorCode: String? = nil, sourceVendorId: String? = nil, targetVendorCode: String? = nil, targetVendorId: String? = nil) {
        self.bindings = bindings
        self.enabled = enabled
        self.mappingItems = mappingItems
        self.mappingMode = mappingMode
        self.matchType = matchType
        self.sourceVendorCode = sourceVendorCode
        self.sourceVendorId = sourceVendorId
        self.targetVendorCode = targetVendorCode
        self.targetVendorId = targetVendorId
    }
}

public struct AdminModelMappingsResponse: Codable {
    public let items: [AdminModelMappingRule]?


    public init(items: [AdminModelMappingRule]? = nil) {
        self.items = items
    }
}

public struct AdminModelVendorCreateRequest: Codable {
    public let color: String?
    public let description: String?
    public let name: String?
    public let status: String?
    public let vendorCode: String?


    public init(color: String? = nil, description: String? = nil, name: String? = nil, status: String? = nil, vendorCode: String? = nil) {
        self.color = color
        self.description = description
        self.name = name
        self.status = status
        self.vendorCode = vendorCode
    }
}

public struct AdminModelVendorItem: Codable {
    public let color: String?
    public let description: String?
    public let id: String?
    public let name: String?
    public let status: String?
    public let vendorCode: String?


    public init(color: String? = nil, description: String? = nil, id: String? = nil, name: String? = nil, status: String? = nil, vendorCode: String? = nil) {
        self.color = color
        self.description = description
        self.id = id
        self.name = name
        self.status = status
        self.vendorCode = vendorCode
    }
}

public struct AdminModelVendorMutationResponse: Codable {
    public let item: AdminModelVendorItem?


    public init(item: AdminModelVendorItem? = nil) {
        self.item = item
    }
}

public struct AdminModelVendorsResponse: Codable {
    public let items: [AdminModelVendorItem]?


    public init(items: [AdminModelVendorItem]? = nil) {
        self.items = items
    }
}

public struct AdminMonitorAlertItem: Codable {
    public let id: String?
    public let message: String?
    public let severity: String?
    public let source: String?
    public let status: String?
    public let time: String?
    public let title: String?


    public init(id: String? = nil, message: String? = nil, severity: String? = nil, source: String? = nil, status: String? = nil, time: String? = nil, title: String? = nil) {
        self.id = id
        self.message = message
        self.severity = severity
        self.source = source
        self.status = status
        self.time = time
        self.title = title
    }
}

public struct AdminMonitorAlertsResponse: Codable {
    public let items: [AdminMonitorAlertItem]?


    public init(items: [AdminMonitorAlertItem]? = nil) {
        self.items = items
    }
}

public struct AdminMonitorNodeItem: Codable {
    public let cpu: Double?
    public let id: String?
    public let ip: String?
    public let memory: Double?
    public let name: String?
    public let region: String?
    public let status: String?
    public let uptime: String?


    public init(cpu: Double? = nil, id: String? = nil, ip: String? = nil, memory: Double? = nil, name: String? = nil, region: String? = nil, status: String? = nil, uptime: String? = nil) {
        self.cpu = cpu
        self.id = id
        self.ip = ip
        self.memory = memory
        self.name = name
        self.region = region
        self.status = status
        self.uptime = uptime
    }
}

public struct AdminMonitorNodesResponse: Codable {
    public let items: [AdminMonitorNodeItem]?


    public init(items: [AdminMonitorNodeItem]? = nil) {
        self.items = items
    }
}

public struct AdminMonitorPerformanceItem: Codable {
    public let cpu: Double?
    public let memory: Double?
    public let network: Double?
    public let time: String?


    public init(cpu: Double? = nil, memory: Double? = nil, network: Double? = nil, time: String? = nil) {
        self.cpu = cpu
        self.memory = memory
        self.network = network
        self.time = time
    }
}

public struct AdminMonitorPerformanceResponse: Codable {
    public let items: [AdminMonitorPerformanceItem]?


    public init(items: [AdminMonitorPerformanceItem]? = nil) {
        self.items = items
    }
}

public struct AdminPieChartItem: Codable {
    public let color: String?
    public let name: String?
    public let value: Double?


    public init(color: String? = nil, name: String? = nil, value: Double? = nil) {
        self.color = color
        self.name = name
        self.value = value
    }
}

public struct AdminPromptBindingCreateRequest: Codable {
    public let bindingRole: String?
    public let enabled: Bool?
    public let ownerId: String?
    public let ownerType: String?
    public let policyJson: [String: String]?
    public let priority: Int?
    public let promptVersionId: String?


    public init(bindingRole: String? = nil, enabled: Bool? = nil, ownerId: String? = nil, ownerType: String? = nil, policyJson: [String: String]? = nil, priority: Int? = nil, promptVersionId: String? = nil) {
        self.bindingRole = bindingRole
        self.enabled = enabled
        self.ownerId = ownerId
        self.ownerType = ownerType
        self.policyJson = policyJson
        self.priority = priority
        self.promptVersionId = promptVersionId
    }
}

public struct AdminPromptBindingItem: Codable {
    public let bindingRole: String?
    public let createdAt: String?
    public let enabled: Bool?
    public let id: String?
    public let organizationId: String?
    public let ownerId: String?
    public let ownerType: String?
    public let policyJson: [String: String]?
    public let priority: Int?
    public let promptId: String?
    public let promptVersionId: String?
    public let snapshotJson: [String: String]?
    public let tenantId: String?
    public let updatedAt: String?
    public let uuid: String?


    public init(bindingRole: String? = nil, createdAt: String? = nil, enabled: Bool? = nil, id: String? = nil, organizationId: String? = nil, ownerId: String? = nil, ownerType: String? = nil, policyJson: [String: String]? = nil, priority: Int? = nil, promptId: String? = nil, promptVersionId: String? = nil, snapshotJson: [String: String]? = nil, tenantId: String? = nil, updatedAt: String? = nil, uuid: String? = nil) {
        self.bindingRole = bindingRole
        self.createdAt = createdAt
        self.enabled = enabled
        self.id = id
        self.organizationId = organizationId
        self.ownerId = ownerId
        self.ownerType = ownerType
        self.policyJson = policyJson
        self.priority = priority
        self.promptId = promptId
        self.promptVersionId = promptVersionId
        self.snapshotJson = snapshotJson
        self.tenantId = tenantId
        self.updatedAt = updatedAt
        self.uuid = uuid
    }
}

public struct AdminPromptBindingListResponse: Codable {
    public let items: [AdminPromptBindingItem]?


    public init(items: [AdminPromptBindingItem]? = nil) {
        self.items = items
    }
}

public struct AdminPromptBindingMutationResponse: Codable {
    public let item: AdminPromptBindingItem?


    public init(item: AdminPromptBindingItem? = nil) {
        self.item = item
    }
}

public struct AdminPromptBindingUpdateRequest: Codable {
    public let bindingRole: String?
    public let enabled: Bool?
    public let ownerId: String?
    public let ownerType: String?
    public let policyJson: [String: String]?
    public let priority: Int?
    public let promptVersionId: String?


    public init(bindingRole: String? = nil, enabled: Bool? = nil, ownerId: String? = nil, ownerType: String? = nil, policyJson: [String: String]? = nil, priority: Int? = nil, promptVersionId: String? = nil) {
        self.bindingRole = bindingRole
        self.enabled = enabled
        self.ownerId = ownerId
        self.ownerType = ownerType
        self.policyJson = policyJson
        self.priority = priority
        self.promptVersionId = promptVersionId
    }
}

public struct AdminPromptCreateRequest: Codable {
    public let categoryId: String?
    public let description: String?
    public let name: String?
    public let promptKey: String?
    public let promptType: String?
    public let tags: [String]?
    public let visibility: String?


    public init(categoryId: String? = nil, description: String? = nil, name: String? = nil, promptKey: String? = nil, promptType: String? = nil, tags: [String]? = nil, visibility: String? = nil) {
        self.categoryId = categoryId
        self.description = description
        self.name = name
        self.promptKey = promptKey
        self.promptType = promptType
        self.tags = tags
        self.visibility = visibility
    }
}

public struct AdminPromptItem: Codable {
    public let categoryCode: String?
    public let categoryId: String?
    public let createdAt: String?
    public let description: String?
    public let id: String?
    public let latestVersionId: String?
    public let name: String?
    public let organizationId: String?
    public let ownerUserId: String?
    public let promptKey: String?
    public let promptType: String?
    public let publishedVersionId: String?
    public let status: String?
    public let tags: [String]?
    public let tenantId: String?
    public let updatedAt: String?
    public let uuid: String?
    public let visibility: String?


    public init(categoryCode: String? = nil, categoryId: String? = nil, createdAt: String? = nil, description: String? = nil, id: String? = nil, latestVersionId: String? = nil, name: String? = nil, organizationId: String? = nil, ownerUserId: String? = nil, promptKey: String? = nil, promptType: String? = nil, publishedVersionId: String? = nil, status: String? = nil, tags: [String]? = nil, tenantId: String? = nil, updatedAt: String? = nil, uuid: String? = nil, visibility: String? = nil) {
        self.categoryCode = categoryCode
        self.categoryId = categoryId
        self.createdAt = createdAt
        self.description = description
        self.id = id
        self.latestVersionId = latestVersionId
        self.name = name
        self.organizationId = organizationId
        self.ownerUserId = ownerUserId
        self.promptKey = promptKey
        self.promptType = promptType
        self.publishedVersionId = publishedVersionId
        self.status = status
        self.tags = tags
        self.tenantId = tenantId
        self.updatedAt = updatedAt
        self.uuid = uuid
        self.visibility = visibility
    }
}

public struct AdminPromptListResponse: Codable {
    public let items: [AdminPromptItem]?


    public init(items: [AdminPromptItem]? = nil) {
        self.items = items
    }
}

public struct AdminPromptMutationResponse: Codable {
    public let item: AdminPromptItem?


    public init(item: AdminPromptItem? = nil) {
        self.item = item
    }
}

public struct AdminPromptRenderRequest: Codable {
    public let variables: [String: String]?


    public init(variables: [String: String]? = nil) {
        self.variables = variables
    }
}

public struct AdminPromptRenderResponse: Codable {
    public let rendered: String?


    public init(rendered: String? = nil) {
        self.rendered = rendered
    }
}

public struct AdminPromptVersionCreateRequest: Codable {
    public let content: String?
    public let examplesJson: [[String: String]]?
    public let modelConstraints: [String: String]?
    public let outputSchema: [String: String]?
    public let safetyPolicy: [String: String]?
    public let title: String?
    public let variableSchema: [String: String]?
    public let versionNo: String?


    public init(content: String? = nil, examplesJson: [[String: String]]? = nil, modelConstraints: [String: String]? = nil, outputSchema: [String: String]? = nil, safetyPolicy: [String: String]? = nil, title: String? = nil, variableSchema: [String: String]? = nil, versionNo: String? = nil) {
        self.content = content
        self.examplesJson = examplesJson
        self.modelConstraints = modelConstraints
        self.outputSchema = outputSchema
        self.safetyPolicy = safetyPolicy
        self.title = title
        self.variableSchema = variableSchema
        self.versionNo = versionNo
    }
}

public struct AdminPromptVersionItem: Codable {
    public let checksumHash: String?
    public let content: String?
    public let createdAt: String?
    public let createdBy: String?
    public let examplesJson: [[String: String]]?
    public let id: String?
    public let lifecycleStatus: String?
    public let modelConstraints: [String: String]?
    public let organizationId: String?
    public let outputSchema: [String: String]?
    public let promptId: String?
    public let publishedAt: String?
    public let reviewComment: String?
    public let reviewStatus: String?
    public let safetyPolicy: [String: String]?
    public let tenantId: String?
    public let title: String?
    public let updatedAt: String?
    public let uuid: String?
    public let variableSchema: [String: String]?
    public let versionNo: String?


    public init(checksumHash: String? = nil, content: String? = nil, createdAt: String? = nil, createdBy: String? = nil, examplesJson: [[String: String]]? = nil, id: String? = nil, lifecycleStatus: String? = nil, modelConstraints: [String: String]? = nil, organizationId: String? = nil, outputSchema: [String: String]? = nil, promptId: String? = nil, publishedAt: String? = nil, reviewComment: String? = nil, reviewStatus: String? = nil, safetyPolicy: [String: String]? = nil, tenantId: String? = nil, title: String? = nil, updatedAt: String? = nil, uuid: String? = nil, variableSchema: [String: String]? = nil, versionNo: String? = nil) {
        self.checksumHash = checksumHash
        self.content = content
        self.createdAt = createdAt
        self.createdBy = createdBy
        self.examplesJson = examplesJson
        self.id = id
        self.lifecycleStatus = lifecycleStatus
        self.modelConstraints = modelConstraints
        self.organizationId = organizationId
        self.outputSchema = outputSchema
        self.promptId = promptId
        self.publishedAt = publishedAt
        self.reviewComment = reviewComment
        self.reviewStatus = reviewStatus
        self.safetyPolicy = safetyPolicy
        self.tenantId = tenantId
        self.title = title
        self.updatedAt = updatedAt
        self.uuid = uuid
        self.variableSchema = variableSchema
        self.versionNo = versionNo
    }
}

public struct AdminPromptVersionListResponse: Codable {
    public let items: [AdminPromptVersionItem]?


    public init(items: [AdminPromptVersionItem]? = nil) {
        self.items = items
    }
}

public struct AdminPromptVersionMutationResponse: Codable {
    public let item: AdminPromptVersionItem?


    public init(item: AdminPromptVersionItem? = nil) {
        self.item = item
    }
}

public struct AdminProviderSecretCreateRequest: Codable {
    public let authType: String?
    public let name: String?
    public let providerCode: String?
    public let secretRef: String?
    public let status: String?


    public init(authType: String? = nil, name: String? = nil, providerCode: String? = nil, secretRef: String? = nil, status: String? = nil) {
        self.authType = authType
        self.name = name
        self.providerCode = providerCode
        self.secretRef = secretRef
        self.status = status
    }
}

public struct AdminProviderSecretItem: Codable {
    public let accountCode: String?
    public let authType: String?
    public let createdAt: String?
    public let id: String?
    public let maskedLabel: String?
    public let name: String?
    public let providerCode: String?
    public let secretRef: String?
    public let status: String?
    public let updatedAt: String?


    public init(accountCode: String? = nil, authType: String? = nil, createdAt: String? = nil, id: String? = nil, maskedLabel: String? = nil, name: String? = nil, providerCode: String? = nil, secretRef: String? = nil, status: String? = nil, updatedAt: String? = nil) {
        self.accountCode = accountCode
        self.authType = authType
        self.createdAt = createdAt
        self.id = id
        self.maskedLabel = maskedLabel
        self.name = name
        self.providerCode = providerCode
        self.secretRef = secretRef
        self.status = status
        self.updatedAt = updatedAt
    }
}

public struct AdminProviderSecretMutationResponse: Codable {
    public let item: AdminProviderSecretItem?


    public init(item: AdminProviderSecretItem? = nil) {
        self.item = item
    }
}

public struct AdminProviderSecretUpdateRequest: Codable {
    public let authType: String?
    public let id: String?
    public let name: String?
    public let providerCode: String?
    public let secretRef: String?
    public let status: String?


    public init(authType: String? = nil, id: String? = nil, name: String? = nil, providerCode: String? = nil, secretRef: String? = nil, status: String? = nil) {
        self.authType = authType
        self.id = id
        self.name = name
        self.providerCode = providerCode
        self.secretRef = secretRef
        self.status = status
    }
}

public struct AdminProviderSecretsResponse: Codable {
    public let items: [AdminProviderSecretItem]?


    public init(items: [AdminProviderSecretItem]? = nil) {
        self.items = items
    }
}

public struct AdminRateLimitItem: Codable {
    public let blockDuration: String?
    public let burst: Int?
    public let channelGroup: String?
    public let channelGroupId: String?
    public let channelGroupName: String?
    public let id: String?
    public let keyPrefix: String?
    public let model: String?
    public let rpd: Int?
    public let rpm: Int?
    public let rps: Int?
    public let ruleName: String?
    public let status: String?
    public let targetIp: String?
    public let tpm: Int?
    public let user: String?


    public init(blockDuration: String? = nil, burst: Int? = nil, channelGroup: String? = nil, channelGroupId: String? = nil, channelGroupName: String? = nil, id: String? = nil, keyPrefix: String? = nil, model: String? = nil, rpd: Int? = nil, rpm: Int? = nil, rps: Int? = nil, ruleName: String? = nil, status: String? = nil, targetIp: String? = nil, tpm: Int? = nil, user: String? = nil) {
        self.blockDuration = blockDuration
        self.burst = burst
        self.channelGroup = channelGroup
        self.channelGroupId = channelGroupId
        self.channelGroupName = channelGroupName
        self.id = id
        self.keyPrefix = keyPrefix
        self.model = model
        self.rpd = rpd
        self.rpm = rpm
        self.rps = rps
        self.ruleName = ruleName
        self.status = status
        self.targetIp = targetIp
        self.tpm = tpm
        self.user = user
    }
}

public struct AdminRateLimitMutationResponse: Codable {
    public let item: AdminRateLimitItem?


    public init(item: AdminRateLimitItem? = nil) {
        self.item = item
    }
}

public struct AdminRecordLogItem: Codable {
    public let baseInputPrice: String?
    public let baseOutputPrice: String?
    public let cacheReadPrice: String?
    public let cacheReadTokens: String?
    public let cost: String?
    public let errorCode: String?
    public let errorMessage: String?
    public let errorType: String?
    public let group: String?
    public let httpMethod: String?
    public let httpStatus: String?
    public let id: String?
    public let inputTokens: String?
    public let ip: String?
    public let isStream: Bool?
    public let model: String?
    public let multiplier: String?
    public let outputTokens: String?
    public let path: String?
    public let providerNativeModel: String?
    public let reasoningEffort: String?
    public let regionCode: String?
    public let requestId: String?
    public let requestedModelCatalogKey: String?
    public let status: String?
    public let time: String?
    public let tokenName: String?
    public let totalTime: String?
    public let ttft: String?
    public let type: String?
    public let user: String?
    public let userAgent: String?


    public init(baseInputPrice: String? = nil, baseOutputPrice: String? = nil, cacheReadPrice: String? = nil, cacheReadTokens: String? = nil, cost: String? = nil, errorCode: String? = nil, errorMessage: String? = nil, errorType: String? = nil, group: String? = nil, httpMethod: String? = nil, httpStatus: String? = nil, id: String? = nil, inputTokens: String? = nil, ip: String? = nil, isStream: Bool? = nil, model: String? = nil, multiplier: String? = nil, outputTokens: String? = nil, path: String? = nil, providerNativeModel: String? = nil, reasoningEffort: String? = nil, regionCode: String? = nil, requestId: String? = nil, requestedModelCatalogKey: String? = nil, status: String? = nil, time: String? = nil, tokenName: String? = nil, totalTime: String? = nil, ttft: String? = nil, type: String? = nil, user: String? = nil, userAgent: String? = nil) {
        self.baseInputPrice = baseInputPrice
        self.baseOutputPrice = baseOutputPrice
        self.cacheReadPrice = cacheReadPrice
        self.cacheReadTokens = cacheReadTokens
        self.cost = cost
        self.errorCode = errorCode
        self.errorMessage = errorMessage
        self.errorType = errorType
        self.group = group
        self.httpMethod = httpMethod
        self.httpStatus = httpStatus
        self.id = id
        self.inputTokens = inputTokens
        self.ip = ip
        self.isStream = isStream
        self.model = model
        self.multiplier = multiplier
        self.outputTokens = outputTokens
        self.path = path
        self.providerNativeModel = providerNativeModel
        self.reasoningEffort = reasoningEffort
        self.regionCode = regionCode
        self.requestId = requestId
        self.requestedModelCatalogKey = requestedModelCatalogKey
        self.status = status
        self.time = time
        self.tokenName = tokenName
        self.totalTime = totalTime
        self.ttft = ttft
        self.type = type
        self.user = user
        self.userAgent = userAgent
    }
}

public struct AdminRecordLogsResponse: Codable {
    public let logs: [AdminRecordLogItem]?
    public let page: String?
    public let pageSize: String?
    public let total: String?


    public init(logs: [AdminRecordLogItem]? = nil, page: String? = nil, pageSize: String? = nil, total: String? = nil) {
        self.logs = logs
        self.page = page
        self.pageSize = pageSize
        self.total = total
    }
}

public struct AdminReferralStatItem: Codable {
    public let bonusAwarded: String?
    public let id: String?
    public let inviter: String?
    public let link: String?
    public let totalInvited: String?
    public let totalRevenue: String?


    public init(bonusAwarded: String? = nil, id: String? = nil, inviter: String? = nil, link: String? = nil, totalInvited: String? = nil, totalRevenue: String? = nil) {
        self.bonusAwarded = bonusAwarded
        self.id = id
        self.inviter = inviter
        self.link = link
        self.totalInvited = totalInvited
        self.totalRevenue = totalRevenue
    }
}

public struct AdminReferralStatsResponse: Codable {
    public let items: [AdminReferralStatItem]?


    public init(items: [AdminReferralStatItem]? = nil) {
        self.items = items
    }
}

public struct AdminRuntimeRegionSettingsResponse: Codable {
    public let currentRegionCode: String?
    public let currentRegionName: String?
    public let remark: String?


    public init(currentRegionCode: String? = nil, currentRegionName: String? = nil, remark: String? = nil) {
        self.currentRegionCode = currentRegionCode
        self.currentRegionName = currentRegionName
        self.remark = remark
    }
}

public struct AdminRuntimeRegionSettingsUpdateRequest: Codable {
    public let currentRegionCode: String?
    public let currentRegionName: String?
    public let remark: String?


    public init(currentRegionCode: String? = nil, currentRegionName: String? = nil, remark: String? = nil) {
        self.currentRegionCode = currentRegionCode
        self.currentRegionName = currentRegionName
        self.remark = remark
    }
}

public struct AdminRuntimeRouteExplainCandidate: Codable {
    public let apiCode: String?
    public let catalogKey: String?
    public let channelGroupCode: String?
    public let channelGroupId: String?
    public let channelId: String?
    public let credentialId: String?
    public let credentialRotation: String?
    public let kind: String?
    public let policyId: String?
    public let pricingPlanCode: String?
    public let providerCode: String?
    public let providerModel: String?
    public let regionCode: String?
    public let requestedModel: String?
    public let ruleId: String?
    public let timeoutMs: Int?


    public init(apiCode: String? = nil, catalogKey: String? = nil, channelGroupCode: String? = nil, channelGroupId: String? = nil, channelId: String? = nil, credentialId: String? = nil, credentialRotation: String? = nil, kind: String? = nil, policyId: String? = nil, pricingPlanCode: String? = nil, providerCode: String? = nil, providerModel: String? = nil, regionCode: String? = nil, requestedModel: String? = nil, ruleId: String? = nil, timeoutMs: Int? = nil) {
        self.apiCode = apiCode
        self.catalogKey = catalogKey
        self.channelGroupCode = channelGroupCode
        self.channelGroupId = channelGroupId
        self.channelId = channelId
        self.credentialId = credentialId
        self.credentialRotation = credentialRotation
        self.kind = kind
        self.policyId = policyId
        self.pricingPlanCode = pricingPlanCode
        self.providerCode = providerCode
        self.providerModel = providerModel
        self.regionCode = regionCode
        self.requestedModel = requestedModel
        self.ruleId = ruleId
        self.timeoutMs = timeoutMs
    }
}

public struct AdminRuntimeRouteExplainIssue: Codable {
    public let code: String?
    public let message: String?
    public let severity: String?


    public init(code: String? = nil, message: String? = nil, severity: String? = nil) {
        self.code = code
        self.message = message
        self.severity = severity
    }
}

public struct AdminRuntimeRouteExplainRequest: Codable {
    public let apiCode: String?
    public let apiKeyId: String?
    public let billingMeter: String?
    public let capability: String?
    public let catalogKey: String?
    public let channelGroupId: String?
    public let model: String?
    public let resourceCode: String?
    public let routeKey: String?


    public init(apiCode: String? = nil, apiKeyId: String? = nil, billingMeter: String? = nil, capability: String? = nil, catalogKey: String? = nil, channelGroupId: String? = nil, model: String? = nil, resourceCode: String? = nil, routeKey: String? = nil) {
        self.apiCode = apiCode
        self.apiKeyId = apiKeyId
        self.billingMeter = billingMeter
        self.capability = capability
        self.catalogKey = catalogKey
        self.channelGroupId = channelGroupId
        self.model = model
        self.resourceCode = resourceCode
        self.routeKey = routeKey
    }
}

public struct AdminRuntimeRouteExplainResponse: Codable {
    public let apiCode: String?
    public let apiKeyId: String?
    public let billingMeter: String?
    public let blockedReasons: [AdminRuntimeRouteExplainIssue]?
    public let candidateCount: Int?
    public let capability: String?
    public let catalogKey: String?
    public let channelGroupId: String?
    public let groupCode: String?
    public let model: String?
    public let policyId: String?
    public let policySnapshotVersion: String?
    public let pricingPlanCode: String?
    public let ready: Bool?
    public let resourceCode: String?
    public let ruleId: String?
    public let selectedCandidates: [AdminRuntimeRouteExplainCandidate]?
    public let source: String?
    public let warnings: [AdminRuntimeRouteExplainIssue]?


    public init(apiCode: String? = nil, apiKeyId: String? = nil, billingMeter: String? = nil, blockedReasons: [AdminRuntimeRouteExplainIssue]? = nil, candidateCount: Int? = nil, capability: String? = nil, catalogKey: String? = nil, channelGroupId: String? = nil, groupCode: String? = nil, model: String? = nil, policyId: String? = nil, policySnapshotVersion: String? = nil, pricingPlanCode: String? = nil, ready: Bool? = nil, resourceCode: String? = nil, ruleId: String? = nil, selectedCandidates: [AdminRuntimeRouteExplainCandidate]? = nil, source: String? = nil, warnings: [AdminRuntimeRouteExplainIssue]? = nil) {
        self.apiCode = apiCode
        self.apiKeyId = apiKeyId
        self.billingMeter = billingMeter
        self.blockedReasons = blockedReasons
        self.candidateCount = candidateCount
        self.capability = capability
        self.catalogKey = catalogKey
        self.channelGroupId = channelGroupId
        self.groupCode = groupCode
        self.model = model
        self.policyId = policyId
        self.policySnapshotVersion = policySnapshotVersion
        self.pricingPlanCode = pricingPlanCode
        self.ready = ready
        self.resourceCode = resourceCode
        self.ruleId = ruleId
        self.selectedCandidates = selectedCandidates
        self.source = source
        self.warnings = warnings
    }
}

public struct AdminServiceNodeCreateRequest: Codable {
    public let domain: String?
    public let ip: String?
    public let name: String?
    public let remark: String?
    public let status: String?


    public init(domain: String? = nil, ip: String? = nil, name: String? = nil, remark: String? = nil, status: String? = nil) {
        self.domain = domain
        self.ip = ip
        self.name = name
        self.remark = remark
        self.status = status
    }
}

public struct AdminServiceNodeDeleteResponse: Codable {
    public let deleted: Bool?


    public init(deleted: Bool? = nil) {
        self.deleted = deleted
    }
}

public struct AdminServiceNodeItem: Codable {
    public let domain: String?
    public let healthStatus: String?
    public let id: String?
    public let ip: String?
    public let name: String?
    public let remark: String?
    public let status: String?
    public let updatedAt: String?


    public init(domain: String? = nil, healthStatus: String? = nil, id: String? = nil, ip: String? = nil, name: String? = nil, remark: String? = nil, status: String? = nil, updatedAt: String? = nil) {
        self.domain = domain
        self.healthStatus = healthStatus
        self.id = id
        self.ip = ip
        self.name = name
        self.remark = remark
        self.status = status
        self.updatedAt = updatedAt
    }
}

public struct AdminServiceNodeMutationResponse: Codable {
    public let item: AdminServiceNodeItem?


    public init(item: AdminServiceNodeItem? = nil) {
        self.item = item
    }
}

public struct AdminServiceNodeStatusUpdateRequest: Codable {
    public let status: String?


    public init(status: String? = nil) {
        self.status = status
    }
}

public struct AdminServiceNodeUpdateRequest: Codable {
    public let domain: String?
    public let ip: String?
    public let name: String?
    public let remark: String?


    public init(domain: String? = nil, ip: String? = nil, name: String? = nil, remark: String? = nil) {
        self.domain = domain
        self.ip = ip
        self.name = name
        self.remark = remark
    }
}

public struct AdminServiceNodesResponse: Codable {
    public let items: [AdminServiceNodeItem]?


    public init(items: [AdminServiceNodeItem]? = nil) {
        self.items = items
    }
}

public struct AdminSiteActionRequest: Codable {

    public init() {}
}

public struct AdminSiteChannelItem: Codable {
    public let channelCode: String?
    public let channelName: String?
    public let healthStatus: String?
    public let id: String?
    public let providerCode: String?
    public let siteChannelRole: String?
    public let siteCode: String?
    public let siteServiceCode: String?
    public let status: String?


    public init(channelCode: String? = nil, channelName: String? = nil, healthStatus: String? = nil, id: String? = nil, providerCode: String? = nil, siteChannelRole: String? = nil, siteCode: String? = nil, siteServiceCode: String? = nil, status: String? = nil) {
        self.channelCode = channelCode
        self.channelName = channelName
        self.healthStatus = healthStatus
        self.id = id
        self.providerCode = providerCode
        self.siteChannelRole = siteChannelRole
        self.siteCode = siteCode
        self.siteServiceCode = siteServiceCode
        self.status = status
    }
}

public struct AdminSiteChannelsResponse: Codable {
    public let items: [AdminSiteChannelItem]?


    public init(items: [AdminSiteChannelItem]? = nil) {
        self.items = items
    }
}

public struct AdminSiteConnectionCheckResponse: Codable {
    public let checkedAt: String?
    public let healthStatus: String?
    public let latencyMs: String?
    public let message: String?
    public let siteId: String?
    public let status: String?


    public init(checkedAt: String? = nil, healthStatus: String? = nil, latencyMs: String? = nil, message: String? = nil, siteId: String? = nil, status: String? = nil) {
        self.checkedAt = checkedAt
        self.healthStatus = healthStatus
        self.latencyMs = latencyMs
        self.message = message
        self.siteId = siteId
        self.status = status
    }
}

public struct AdminSiteCreateRequest: Codable {
    public let baseUrl: String?
    public let credentialRef: String?
    public let description: String?
    public let displayName: String?
    public let docsUrl: String?
    public let domains: [String]?
    public let environment: String?
    public let logo: MediaResource?
    public let maskedLabel: String?
    public let ownerKind: String?
    public let regionCode: String?
    public let siteCode: String?
    public let siteName: String?
    public let siteType: String?
    public let status: String?
    public let vendorCodes: [String]?
    public let websiteUrl: String?


    public init(baseUrl: String? = nil, credentialRef: String? = nil, description: String? = nil, displayName: String? = nil, docsUrl: String? = nil, domains: [String]? = nil, environment: String? = nil, logo: MediaResource? = nil, maskedLabel: String? = nil, ownerKind: String? = nil, regionCode: String? = nil, siteCode: String? = nil, siteName: String? = nil, siteType: String? = nil, status: String? = nil, vendorCodes: [String]? = nil, websiteUrl: String? = nil) {
        self.baseUrl = baseUrl
        self.credentialRef = credentialRef
        self.description = description
        self.displayName = displayName
        self.docsUrl = docsUrl
        self.domains = domains
        self.environment = environment
        self.logo = logo
        self.maskedLabel = maskedLabel
        self.ownerKind = ownerKind
        self.regionCode = regionCode
        self.siteCode = siteCode
        self.siteName = siteName
        self.siteType = siteType
        self.status = status
        self.vendorCodes = vendorCodes
        self.websiteUrl = websiteUrl
    }
}

public struct AdminSiteDeleteResponse: Codable {
    public let deleted: Bool?


    public init(deleted: Bool? = nil) {
        self.deleted = deleted
    }
}

public struct AdminSiteItem: Codable {
    public let baseUrl: String?
    public let consecutiveErrorCount: String?
    public let description: String?
    public let displayName: String?
    public let docsUrl: String?
    public let domains: [String]?
    public let environment: String?
    public let healthStatus: String?
    public let id: String?
    public let lastCheckedAt: String?
    public let lastLatencyMs: String?
    public let lastSyncAt: String?
    public let logo: MediaResource?
    public let ownerKind: String?
    public let regionCode: String?
    public let siteCode: String?
    public let siteName: String?
    public let siteType: String?
    public let sortOrder: String?
    public let status: String?
    public let vendorCodes: [String]?
    public let websiteUrl: String?


    public init(baseUrl: String? = nil, consecutiveErrorCount: String? = nil, description: String? = nil, displayName: String? = nil, docsUrl: String? = nil, domains: [String]? = nil, environment: String? = nil, healthStatus: String? = nil, id: String? = nil, lastCheckedAt: String? = nil, lastLatencyMs: String? = nil, lastSyncAt: String? = nil, logo: MediaResource? = nil, ownerKind: String? = nil, regionCode: String? = nil, siteCode: String? = nil, siteName: String? = nil, siteType: String? = nil, sortOrder: String? = nil, status: String? = nil, vendorCodes: [String]? = nil, websiteUrl: String? = nil) {
        self.baseUrl = baseUrl
        self.consecutiveErrorCount = consecutiveErrorCount
        self.description = description
        self.displayName = displayName
        self.docsUrl = docsUrl
        self.domains = domains
        self.environment = environment
        self.healthStatus = healthStatus
        self.id = id
        self.lastCheckedAt = lastCheckedAt
        self.lastLatencyMs = lastLatencyMs
        self.lastSyncAt = lastSyncAt
        self.logo = logo
        self.ownerKind = ownerKind
        self.regionCode = regionCode
        self.siteCode = siteCode
        self.siteName = siteName
        self.siteType = siteType
        self.sortOrder = sortOrder
        self.status = status
        self.vendorCodes = vendorCodes
        self.websiteUrl = websiteUrl
    }
}

public struct AdminSiteMutationResponse: Codable {
    public let item: AdminSiteItem?


    public init(item: AdminSiteItem? = nil) {
        self.item = item
    }
}

public struct AdminSiteSettingsResponse: Codable {
    public let accentColor: String?
    public let brandColor: String?
    public let customCss: String?
    public let description: String?
    public let docsUrl: String?
    public let favicon: MediaResource?
    public let footerCopyright: String?
    public let icon: MediaResource?
    public let icpRecordNumber: String?
    public let icpRecordUrl: String?
    public let logo: MediaResource?
    public let policeRecordNumber: String?
    public let policeRecordUrl: String?
    public let privacyUrl: String?
    public let seoDescription: String?
    public let seoTitle: String?
    public let shortName: String?
    public let siteName: String?
    public let supportUrl: String?
    public let termsUrl: String?


    public init(accentColor: String? = nil, brandColor: String? = nil, customCss: String? = nil, description: String? = nil, docsUrl: String? = nil, favicon: MediaResource? = nil, footerCopyright: String? = nil, icon: MediaResource? = nil, icpRecordNumber: String? = nil, icpRecordUrl: String? = nil, logo: MediaResource? = nil, policeRecordNumber: String? = nil, policeRecordUrl: String? = nil, privacyUrl: String? = nil, seoDescription: String? = nil, seoTitle: String? = nil, shortName: String? = nil, siteName: String? = nil, supportUrl: String? = nil, termsUrl: String? = nil) {
        self.accentColor = accentColor
        self.brandColor = brandColor
        self.customCss = customCss
        self.description = description
        self.docsUrl = docsUrl
        self.favicon = favicon
        self.footerCopyright = footerCopyright
        self.icon = icon
        self.icpRecordNumber = icpRecordNumber
        self.icpRecordUrl = icpRecordUrl
        self.logo = logo
        self.policeRecordNumber = policeRecordNumber
        self.policeRecordUrl = policeRecordUrl
        self.privacyUrl = privacyUrl
        self.seoDescription = seoDescription
        self.seoTitle = seoTitle
        self.shortName = shortName
        self.siteName = siteName
        self.supportUrl = supportUrl
        self.termsUrl = termsUrl
    }
}

public struct AdminSiteSettingsUpdateRequest: Codable {
    public let accentColor: String?
    public let brandColor: String?
    public let customCss: String?
    public let description: String?
    public let docsUrl: String?
    public let favicon: MediaResource?
    public let footerCopyright: String?
    public let icon: MediaResource?
    public let icpRecordNumber: String?
    public let icpRecordUrl: String?
    public let logo: MediaResource?
    public let policeRecordNumber: String?
    public let policeRecordUrl: String?
    public let privacyUrl: String?
    public let seoDescription: String?
    public let seoTitle: String?
    public let shortName: String?
    public let siteName: String?
    public let supportUrl: String?
    public let termsUrl: String?


    public init(accentColor: String? = nil, brandColor: String? = nil, customCss: String? = nil, description: String? = nil, docsUrl: String? = nil, favicon: MediaResource? = nil, footerCopyright: String? = nil, icon: MediaResource? = nil, icpRecordNumber: String? = nil, icpRecordUrl: String? = nil, logo: MediaResource? = nil, policeRecordNumber: String? = nil, policeRecordUrl: String? = nil, privacyUrl: String? = nil, seoDescription: String? = nil, seoTitle: String? = nil, shortName: String? = nil, siteName: String? = nil, supportUrl: String? = nil, termsUrl: String? = nil) {
        self.accentColor = accentColor
        self.brandColor = brandColor
        self.customCss = customCss
        self.description = description
        self.docsUrl = docsUrl
        self.favicon = favicon
        self.footerCopyright = footerCopyright
        self.icon = icon
        self.icpRecordNumber = icpRecordNumber
        self.icpRecordUrl = icpRecordUrl
        self.logo = logo
        self.policeRecordNumber = policeRecordNumber
        self.policeRecordUrl = policeRecordUrl
        self.privacyUrl = privacyUrl
        self.seoDescription = seoDescription
        self.seoTitle = seoTitle
        self.shortName = shortName
        self.siteName = siteName
        self.supportUrl = supportUrl
        self.termsUrl = termsUrl
    }
}

public struct AdminSiteUpdateRequest: Codable {
    public let baseUrl: String?
    public let credentialRef: String?
    public let description: String?
    public let displayName: String?
    public let docsUrl: String?
    public let domains: [String]?
    public let environment: String?
    public let logo: MediaResource?
    public let maskedLabel: String?
    public let ownerKind: String?
    public let regionCode: String?
    public let siteCode: String?
    public let siteName: String?
    public let siteType: String?
    public let status: String?
    public let vendorCodes: [String]?
    public let websiteUrl: String?


    public init(baseUrl: String? = nil, credentialRef: String? = nil, description: String? = nil, displayName: String? = nil, docsUrl: String? = nil, domains: [String]? = nil, environment: String? = nil, logo: MediaResource? = nil, maskedLabel: String? = nil, ownerKind: String? = nil, regionCode: String? = nil, siteCode: String? = nil, siteName: String? = nil, siteType: String? = nil, status: String? = nil, vendorCodes: [String]? = nil, websiteUrl: String? = nil) {
        self.baseUrl = baseUrl
        self.credentialRef = credentialRef
        self.description = description
        self.displayName = displayName
        self.docsUrl = docsUrl
        self.domains = domains
        self.environment = environment
        self.logo = logo
        self.maskedLabel = maskedLabel
        self.ownerKind = ownerKind
        self.regionCode = regionCode
        self.siteCode = siteCode
        self.siteName = siteName
        self.siteType = siteType
        self.status = status
        self.vendorCodes = vendorCodes
        self.websiteUrl = websiteUrl
    }
}

public struct AdminSitesResponse: Codable {
    public let items: [AdminSiteItem]?


    public init(items: [AdminSiteItem]? = nil) {
        self.items = items
    }
}

public struct AdminTokenLimitCreateRequest: Codable {
    public let burst: Int?
    public let keyPrefix: String?
    public let rpd: Int?
    public let rps: Int?
    public let status: String?
    public let user: String?


    public init(burst: Int? = nil, keyPrefix: String? = nil, rpd: Int? = nil, rps: Int? = nil, status: String? = nil, user: String? = nil) {
        self.burst = burst
        self.keyPrefix = keyPrefix
        self.rpd = rpd
        self.rps = rps
        self.status = status
        self.user = user
    }
}

public struct AdminTokenLimitsResponse: Codable {
    public let items: [AdminRateLimitItem]?


    public init(items: [AdminRateLimitItem]? = nil) {
        self.items = items
    }
}

public struct AdminUsagePair: Codable {
    public let today: Double?
    public let total: Double?


    public init(today: Double? = nil, total: Double? = nil) {
        self.today = today
        self.total = total
    }
}

public struct AiResourceGroupsCreateResult: Codable {
    public let code: String?
    public let data: AdminAiResourceGroupMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminAiResourceGroupMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct AiResourceGroupsDeleteResult: Codable {
    public let code: String?
    public let data: AdminAiResourceGroupDeleteResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminAiResourceGroupDeleteResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct AiResourceGroupsListResult: Codable {
    public let code: String?
    public let data: AdminAiResourceGroupsResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminAiResourceGroupsResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct AiResourceGroupsResourcesListResult: Codable {
    public let code: String?
    public let data: AdminAiResourceGroupResourcesResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminAiResourceGroupResourcesResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct AiResourceGroupsUpdateResult: Codable {
    public let code: String?
    public let data: AdminAiResourceGroupMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminAiResourceGroupMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct AiResourcesCreateResult: Codable {
    public let code: String?
    public let data: AdminAiResourceMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminAiResourceMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct AiResourcesListResult: Codable {
    public let code: String?
    public let data: AdminAiResourcesResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminAiResourcesResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct AiResourcesUpdateResult: Codable {
    public let code: String?
    public let data: AdminAiResourceMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminAiResourceMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct AnalyticsAdminOverviewRetrieveResult: Codable {
    public let code: String?
    public let data: AdminAnalyticsOverviewResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminAnalyticsOverviewResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct AnnouncementsCreateResult: Codable {
    public let code: String?
    public let data: AdminAnnouncementMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminAnnouncementMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct AnnouncementsDeleteResult: Codable {
    public let code: String?
    public let data: AdminDeleteResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminDeleteResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct AnnouncementsListResult: Codable {
    public let code: String?
    public let data: AdminAnnouncementsResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminAnnouncementsResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct AnnouncementsUpdateResult: Codable {
    public let code: String?
    public let data: AdminAnnouncementMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminAnnouncementMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ApiKeysCreateResult: Codable {
    public let code: String?
    public let data: AdminApiKeyCreateResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminApiKeyCreateResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ApiKeysDeleteResult: Codable {
    public let code: String?
    public let data: AdminDeleteResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminDeleteResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct AuditEventsListResult: Codable {
    public let code: String?
    public let data: ServiceProviderCollectionResponse?
    public let msg: String?


    public init(code: String? = nil, data: ServiceProviderCollectionResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct AuthSettingsRetrieveResult: Codable {
    public let code: String?
    public let data: AdminAuthSettingsResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminAuthSettingsResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct AuthSettingsUpdateResult: Codable {
    public let code: String?
    public let data: AdminAuthSettingsResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminAuthSettingsResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct BindingsListResult: Codable {
    public let code: String?
    public let data: ServiceProviderCollectionResponse?
    public let msg: String?


    public init(code: String? = nil, data: ServiceProviderCollectionResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct CacheInstancesDeleteResult: Codable {
    public let code: String?
    public let data: AdminCacheOperationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminCacheOperationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct CacheInstancesRefreshCreateResult: Codable {
    public let code: String?
    public let data: AdminCacheOperationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminCacheOperationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct CacheNamespacesDeleteResult: Codable {
    public let code: String?
    public let data: AdminCacheOperationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminCacheOperationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct CacheNamespacesKeysDeleteResult: Codable {
    public let code: String?
    public let data: AdminCacheOperationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminCacheOperationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct CacheNamespacesKeysListResult: Codable {
    public let code: String?
    public let data: AdminCacheKeyListResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminCacheKeyListResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct CacheNamespacesRefreshCreateResult: Codable {
    public let code: String?
    public let data: AdminCacheOperationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminCacheOperationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct CacheOverviewRetrieveResult: Codable {
    public let code: String?
    public let data: AdminCacheOverviewResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminCacheOverviewResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct CacheRefreshCreateResult: Codable {
    public let code: String?
    public let data: AdminCacheOperationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminCacheOperationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ChannelGroupsChannelBindingsListResult: Codable {
    public let code: String?
    public let data: AdminChannelGroupChannelBindingsResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminChannelGroupChannelBindingsResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ChannelGroupsChannelBindingsUpdateResult: Codable {
    public let code: String?
    public let data: AdminChannelGroupChannelBindingsResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminChannelGroupChannelBindingsResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ChannelGroupsCreateResult: Codable {
    public let code: String?
    public let data: AdminChannelGroupMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminChannelGroupMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ChannelGroupsDeleteResult: Codable {
    public let code: String?
    public let data: AdminDeleteResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminDeleteResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ChannelGroupsListResult: Codable {
    public let code: String?
    public let data: AdminChannelGroupsResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminChannelGroupsResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ChannelGroupsRouteExplainRetrieveResult: Codable {
    public let code: String?
    public let data: AdminChannelGroupRouteExplainResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminChannelGroupRouteExplainResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ChannelGroupsUpdateResult: Codable {
    public let code: String?
    public let data: AdminChannelGroupMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminChannelGroupMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ChannelsCreateResult: Codable {
    public let code: String?
    public let data: AdminChannelMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminChannelMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ChannelsDeleteResult: Codable {
    public let code: String?
    public let data: AdminDeleteResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminDeleteResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ChannelsListResult: Codable {
    public let code: String?
    public let data: AdminChannelsResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminChannelsResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ChannelsUpdateResult: Codable {
    public let code: String?
    public let data: AdminChannelMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminChannelMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ChannelsVerifyResult: Codable {
    public let code: String?
    public let data: AdminChannelTestResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminChannelTestResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ContractsListResult: Codable {
    public let code: String?
    public let data: ServiceProviderCollectionResponse?
    public let msg: String?


    public init(code: String? = nil, data: ServiceProviderCollectionResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct CreateStorageBucketRequest: Codable {
    public let blockPublicAccess: Bool?
    public let bucketName: String?
    public let bucketRegion: String?
    public let dataResidencyRegion: String?
    public let defaultEncryptionMode: String?
    public let defaultStorageClass: String?
    public let encryption: String?
    public let kmsKeyRef: String?
    public let lifecycleEnabled: Bool?
    public let logicalScope: String?
    public let objectKeyPrefix: String?
    public let objectLockEnabled: Bool?
    public let providerId: String?
    public let publicAccessBlocked: Bool?
    public let storageClass: String?
    public let versioningEnabled: Bool?


    public init(blockPublicAccess: Bool? = nil, bucketName: String? = nil, bucketRegion: String? = nil, dataResidencyRegion: String? = nil, defaultEncryptionMode: String? = nil, defaultStorageClass: String? = nil, encryption: String? = nil, kmsKeyRef: String? = nil, lifecycleEnabled: Bool? = nil, logicalScope: String? = nil, objectKeyPrefix: String? = nil, objectLockEnabled: Bool? = nil, providerId: String? = nil, publicAccessBlocked: Bool? = nil, storageClass: String? = nil, versioningEnabled: Bool? = nil) {
        self.blockPublicAccess = blockPublicAccess
        self.bucketName = bucketName
        self.bucketRegion = bucketRegion
        self.dataResidencyRegion = dataResidencyRegion
        self.defaultEncryptionMode = defaultEncryptionMode
        self.defaultStorageClass = defaultStorageClass
        self.encryption = encryption
        self.kmsKeyRef = kmsKeyRef
        self.lifecycleEnabled = lifecycleEnabled
        self.logicalScope = logicalScope
        self.objectKeyPrefix = objectKeyPrefix
        self.objectLockEnabled = objectLockEnabled
        self.providerId = providerId
        self.publicAccessBlocked = publicAccessBlocked
        self.storageClass = storageClass
        self.versioningEnabled = versioningEnabled
    }
}

public struct CreateStorageGarbageCollectionJobRequest: Codable {
    public let criteria: [String: String]?
    public let dryRun: Bool?
    public let dryRunSample: String?
    public let jobType: String?
    public let retentionWindow: String?
    public let target: String?


    public init(criteria: [String: String]? = nil, dryRun: Bool? = nil, dryRunSample: String? = nil, jobType: String? = nil, retentionWindow: String? = nil, target: String? = nil) {
        self.criteria = criteria
        self.dryRun = dryRun
        self.dryRunSample = dryRunSample
        self.jobType = jobType
        self.retentionWindow = retentionWindow
        self.target = target
    }
}

public struct CreateStorageProviderRequest: Codable {
    public let credentialRef: String?
    public let endpoint: String?
    public let endpointUrl: String?
    public let lifecycle: Bool?
    public let multipart: Bool?
    public let objectLock: Bool?
    public let pathStyleEnabled: Bool?
    public let providerCode: String?
    public let providerType: String?
    public let region: String?
    public let supportsLifecycle: Bool?
    public let supportsMultipart: Bool?
    public let supportsObjectLock: Bool?


    public init(credentialRef: String? = nil, endpoint: String? = nil, endpointUrl: String? = nil, lifecycle: Bool? = nil, multipart: Bool? = nil, objectLock: Bool? = nil, pathStyleEnabled: Bool? = nil, providerCode: String? = nil, providerType: String? = nil, region: String? = nil, supportsLifecycle: Bool? = nil, supportsMultipart: Bool? = nil, supportsObjectLock: Bool? = nil) {
        self.credentialRef = credentialRef
        self.endpoint = endpoint
        self.endpointUrl = endpointUrl
        self.lifecycle = lifecycle
        self.multipart = multipart
        self.objectLock = objectLock
        self.pathStyleEnabled = pathStyleEnabled
        self.providerCode = providerCode
        self.providerType = providerType
        self.region = region
        self.supportsLifecycle = supportsLifecycle
        self.supportsMultipart = supportsMultipart
        self.supportsObjectLock = supportsObjectLock
    }
}

public struct CreateStorageQuotaPolicyRequest: Codable {
    public let enforcement: String?
    public let quotaLimit: String?
    public let quotaLimitBytes: String?
    public let scopeId: String?
    public let scopeType: String?
    public let singleFileLimitBytes: String?


    public init(enforcement: String? = nil, quotaLimit: String? = nil, quotaLimitBytes: String? = nil, scopeId: String? = nil, scopeType: String? = nil, singleFileLimitBytes: String? = nil) {
        self.enforcement = enforcement
        self.quotaLimit = quotaLimit
        self.quotaLimitBytes = quotaLimitBytes
        self.scopeId = scopeId
        self.scopeType = scopeType
        self.singleFileLimitBytes = singleFileLimitBytes
    }
}

public struct CreateStorageReconciliationRunRequest: Codable {
    public let bucketId: String?
    public let checkMode: String?
    public let dryRun: Bool?
    public let providerId: String?
    public let reason: String?
    public let runType: String?


    public init(bucketId: String? = nil, checkMode: String? = nil, dryRun: Bool? = nil, providerId: String? = nil, reason: String? = nil, runType: String? = nil) {
        self.bucketId = bucketId
        self.checkMode = checkMode
        self.dryRun = dryRun
        self.providerId = providerId
        self.reason = reason
        self.runType = runType
    }
}

public struct DashboardAdminOverviewRetrieveResult: Codable {
    public let code: String?
    public let data: AdminDashboardDataResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminDashboardDataResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct DashboardRetrieveResult: Codable {
    public let code: String?
    public let data: ServiceProviderDashboardResponse?
    public let msg: String?


    public init(code: String? = nil, data: ServiceProviderDashboardResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct DefinitionBindingsCreateResult: Codable {
    public let code: String?
    public let data: AdminPromptBindingMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminPromptBindingMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct DefinitionBindingsListResult: Codable {
    public let code: String?
    public let data: AdminPromptBindingListResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminPromptBindingListResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct DefinitionBindingsUpdateResult: Codable {
    public let code: String?
    public let data: AdminPromptBindingMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminPromptBindingMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct DefinitionsCreateResult: Codable {
    public let code: String?
    public let data: AdminPromptMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminPromptMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct DefinitionsListResult: Codable {
    public let code: String?
    public let data: AdminPromptListResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminPromptListResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct DiagnosticsRouteSimulationCreateResult: Codable {
    public let code: String?
    public let data: MessagingRouteSimulationResponse?
    public let msg: String?


    public init(code: String? = nil, data: MessagingRouteSimulationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct DiagnosticsTestSendsCreateResult: Codable {
    public let code: String?
    public let data: MessagingTestSendResponse?
    public let msg: String?


    public init(code: String? = nil, data: MessagingTestSendResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct DownstreamsCreateResult: Codable {
    public let code: String?
    public let data: ServiceProviderDownstreamMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: ServiceProviderDownstreamMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct DownstreamsListResult: Codable {
    public let code: String?
    public let data: ServiceProviderCollectionResponse?
    public let msg: String?


    public init(code: String? = nil, data: ServiceProviderCollectionResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct FieldError: Codable {
    public let code: String?
    public let field: String?
    public let message: String?


    public init(code: String? = nil, field: String? = nil, message: String? = nil) {
        self.code = code
        self.field = field
        self.message = message
    }
}

public struct FirewallsRulesCreateResult: Codable {
    public let code: String?
    public let data: AdminFirewallMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminFirewallMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct FirewallsRulesDeleteResult: Codable {
    public let code: String?
    public let data: AdminDeleteResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminDeleteResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct FirewallsRulesListResult: Codable {
    public let code: String?
    public let data: AdminFirewallRulesResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminFirewallRulesResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct HealthCheckCreateResult: Codable {
    public let code: String?
    public let data: AdminSiteConnectionCheckResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminSiteConnectionCheckResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct InstallationStatusResponse: Codable {
    public let catalogSource: String?
    public let catalogVersion: String?
    public let changed: Bool?
    public let environment: String?
    public let externalCatalog: Bool?
    public let lastCatalogRefreshStatus: String?
    public let schemaVersion: String?
    public let seedProfile: String?
    public let status: String?


    public init(catalogSource: String? = nil, catalogVersion: String? = nil, changed: Bool? = nil, environment: String? = nil, externalCatalog: Bool? = nil, lastCatalogRefreshStatus: String? = nil, schemaVersion: String? = nil, seedProfile: String? = nil, status: String? = nil) {
        self.catalogSource = catalogSource
        self.catalogVersion = catalogVersion
        self.changed = changed
        self.environment = environment
        self.externalCatalog = externalCatalog
        self.lastCatalogRefreshStatus = lastCatalogRefreshStatus
        self.schemaVersion = schemaVersion
        self.seedProfile = seedProfile
        self.status = status
    }
}

public struct InstallationStatusRetrieveResult: Codable {
    public let code: String?
    public let data: InstallationStatusResponse?
    public let msg: String?


    public init(code: String? = nil, data: InstallationStatusResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct MarketingReferralStatsListResult: Codable {
    public let code: String?
    public let data: AdminReferralStatsResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminReferralStatsResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct MediaAccess: Codable {
    public let expiresAt: String?
    public let visibility: String?


    public init(expiresAt: String? = nil, visibility: String? = nil) {
        self.expiresAt = expiresAt
        self.visibility = visibility
    }
}

public struct MediaAiProvenance: Codable {
    public let generationTaskId: String?
    public let model: String?
    public let moderationStatus: String?
    public let promptId: String?
    public let provenance: String?
    public let provider: String?
    public let safetyLabels: [String]?
    public let seed: String?
    public let sourceMediaIds: [String]?


    public init(generationTaskId: String? = nil, model: String? = nil, moderationStatus: String? = nil, promptId: String? = nil, provenance: String? = nil, provider: String? = nil, safetyLabels: [String]? = nil, seed: String? = nil, sourceMediaIds: [String]? = nil) {
        self.generationTaskId = generationTaskId
        self.model = model
        self.moderationStatus = moderationStatus
        self.promptId = promptId
        self.provenance = provenance
        self.provider = provider
        self.safetyLabels = safetyLabels
        self.seed = seed
        self.sourceMediaIds = sourceMediaIds
    }
}

public struct MediaChecksum: Codable {
    public let algorithm: String?
    public let value: String?


    public init(algorithm: String? = nil, value: String? = nil) {
        self.algorithm = algorithm
        self.value = value
    }
}

public struct MediaResource: Codable {
    public let access: MediaAccess?
    public let ai: MediaAiProvenance?
    public let altText: String?
    public let bucketId: String?
    public let checksum: MediaChecksum?
    public let durationSeconds: Double?
    public let fileName: String?
    public let height: Int?
    public let id: String?
    public let kind: String?
    public let metadata: [String: String]?
    public let mimeType: String?
    public let objectBlobId: String?
    public let objectKey: String?
    public let objectVersion: String?
    public let poster: MediaResource?
    public let publicUrl: String?
    public let sizeBytes: String?
    public let source: String?
    public let thumbnails: [MediaResource]?
    public let title: String?
    public let uri: String?
    public let url: String?
    public let variants: [MediaResource]?
    public let width: Int?


    public init(access: MediaAccess? = nil, ai: MediaAiProvenance? = nil, altText: String? = nil, bucketId: String? = nil, checksum: MediaChecksum? = nil, durationSeconds: Double? = nil, fileName: String? = nil, height: Int? = nil, id: String? = nil, kind: String? = nil, metadata: [String: String]? = nil, mimeType: String? = nil, objectBlobId: String? = nil, objectKey: String? = nil, objectVersion: String? = nil, poster: MediaResource? = nil, publicUrl: String? = nil, sizeBytes: String? = nil, source: String? = nil, thumbnails: [MediaResource]? = nil, title: String? = nil, uri: String? = nil, url: String? = nil, variants: [MediaResource]? = nil, width: Int? = nil) {
        self.access = access
        self.ai = ai
        self.altText = altText
        self.bucketId = bucketId
        self.checksum = checksum
        self.durationSeconds = durationSeconds
        self.fileName = fileName
        self.height = height
        self.id = id
        self.kind = kind
        self.metadata = metadata
        self.mimeType = mimeType
        self.objectBlobId = objectBlobId
        self.objectKey = objectKey
        self.objectVersion = objectVersion
        self.poster = poster
        self.publicUrl = publicUrl
        self.sizeBytes = sizeBytes
        self.source = source
        self.thumbnails = thumbnails
        self.title = title
        self.uri = uri
        self.url = url
        self.variants = variants
        self.width = width
    }
}

public struct MembersListResult: Codable {
    public let code: String?
    public let data: ServiceProviderCollectionResponse?
    public let msg: String?


    public init(code: String? = nil, data: ServiceProviderCollectionResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct MessagingCollectionResponse: Codable {
    public let items: [[String: String]]?
    public let page: String?
    public let pageSize: String?
    public let total: String?


    public init(items: [[String: String]]? = nil, page: String? = nil, pageSize: String? = nil, total: String? = nil) {
        self.items = items
        self.page = page
        self.pageSize = pageSize
        self.total = total
    }
}

public struct MessagingMutationResponse: Codable {
    public let id: String?
    public let status: String?


    public init(id: String? = nil, status: String? = nil) {
        self.id = id
        self.status = status
    }
}

public struct MessagingProviderAccountCreateRequest: Codable {
    public let accountCode: String?
    public let accountName: String?
    public let baseUrl: String?
    public let capabilitySchema: [String: String]?
    public let channel: String?
    public let credential: [String: Any]?
    public let deliveryPurpose: String?
    public let providerCode: String?


    public init(accountCode: String? = nil, accountName: String? = nil, baseUrl: String? = nil, capabilitySchema: [String: String]? = nil, channel: String? = nil, credential: [String: Any]? = nil, deliveryPurpose: String? = nil, providerCode: String? = nil) {
        self.accountCode = accountCode
        self.accountName = accountName
        self.baseUrl = baseUrl
        self.capabilitySchema = capabilitySchema
        self.channel = channel
        self.credential = credential
        self.deliveryPurpose = deliveryPurpose
        self.providerCode = providerCode
    }
}

public struct MessagingRouteRuleCreateRequest: Codable {
    public let channel: String?
    public let countryCode: String?
    public let deliveryPurpose: String?
    public let failoverPolicy: [String: String]?
    public let locale: String?
    public let priority: Int?
    public let ruleCode: String?
    public let sceneCode: String?
    public let targets: [[String: Any]]?
    public let userSegment: String?


    public init(channel: String? = nil, countryCode: String? = nil, deliveryPurpose: String? = nil, failoverPolicy: [String: String]? = nil, locale: String? = nil, priority: Int? = nil, ruleCode: String? = nil, sceneCode: String? = nil, targets: [[String: Any]]? = nil, userSegment: String? = nil) {
        self.channel = channel
        self.countryCode = countryCode
        self.deliveryPurpose = deliveryPurpose
        self.failoverPolicy = failoverPolicy
        self.locale = locale
        self.priority = priority
        self.ruleCode = ruleCode
        self.sceneCode = sceneCode
        self.targets = targets
        self.userSegment = userSegment
    }
}

public struct MessagingRouteSimulationRequest: Codable {
    public let channel: String?
    public let countryCode: String?
    public let deliveryPurpose: String?
    public let locale: String?
    public let sceneCode: String?
    public let userSegment: String?


    public init(channel: String? = nil, countryCode: String? = nil, deliveryPurpose: String? = nil, locale: String? = nil, sceneCode: String? = nil, userSegment: String? = nil) {
        self.channel = channel
        self.countryCode = countryCode
        self.deliveryPurpose = deliveryPurpose
        self.locale = locale
        self.sceneCode = sceneCode
        self.userSegment = userSegment
    }
}

public struct MessagingRouteSimulationResponse: Codable {
    public let matched: Bool?
    public let routeRuleId: String?
    public let targets: [[String: String]]?


    public init(matched: Bool? = nil, routeRuleId: String? = nil, targets: [[String: String]]? = nil) {
        self.matched = matched
        self.routeRuleId = routeRuleId
        self.targets = targets
    }
}

public struct MessagingSenderIdentityCreateRequest: Codable {
    public let channel: String?
    public let countryCode: String?
    public let displayName: String?
    public let domainName: String?
    public let fromEmail: String?
    public let fromName: String?
    public let identityCode: String?
    public let providerAccountId: String?
    public let replyTo: String?
    public let senderId: String?
    public let signName: String?


    public init(channel: String? = nil, countryCode: String? = nil, displayName: String? = nil, domainName: String? = nil, fromEmail: String? = nil, fromName: String? = nil, identityCode: String? = nil, providerAccountId: String? = nil, replyTo: String? = nil, senderId: String? = nil, signName: String? = nil) {
        self.channel = channel
        self.countryCode = countryCode
        self.displayName = displayName
        self.domainName = domainName
        self.fromEmail = fromEmail
        self.fromName = fromName
        self.identityCode = identityCode
        self.providerAccountId = providerAccountId
        self.replyTo = replyTo
        self.senderId = senderId
        self.signName = signName
    }
}

public struct MessagingSuppressionCreateRequest: Codable {
    public let channel: String?
    public let endsAt: String?
    public let note: String?
    public let reasonCode: String?
    public let scopeId: String?
    public let scopeType: String?
    public let source: String?
    public let startsAt: String?
    public let targetHash: String?
    public let targetMasked: String?


    public init(channel: String? = nil, endsAt: String? = nil, note: String? = nil, reasonCode: String? = nil, scopeId: String? = nil, scopeType: String? = nil, source: String? = nil, startsAt: String? = nil, targetHash: String? = nil, targetMasked: String? = nil) {
        self.channel = channel
        self.endsAt = endsAt
        self.note = note
        self.reasonCode = reasonCode
        self.scopeId = scopeId
        self.scopeType = scopeType
        self.source = source
        self.startsAt = startsAt
        self.targetHash = targetHash
        self.targetMasked = targetMasked
    }
}

public struct MessagingTemplateCreateRequest: Codable {
    public let bodyTemplate: String?
    public let category: String?
    public let channel: String?
    public let contentFormat: String?
    public let deliveryPurpose: String?
    public let locale: String?
    public let sceneCode: String?
    public let subjectTemplate: String?
    public let templateCode: String?
    public let templateName: String?
    public let variableSchema: [String: String]?


    public init(bodyTemplate: String? = nil, category: String? = nil, channel: String? = nil, contentFormat: String? = nil, deliveryPurpose: String? = nil, locale: String? = nil, sceneCode: String? = nil, subjectTemplate: String? = nil, templateCode: String? = nil, templateName: String? = nil, variableSchema: [String: String]? = nil) {
        self.bodyTemplate = bodyTemplate
        self.category = category
        self.channel = channel
        self.contentFormat = contentFormat
        self.deliveryPurpose = deliveryPurpose
        self.locale = locale
        self.sceneCode = sceneCode
        self.subjectTemplate = subjectTemplate
        self.templateCode = templateCode
        self.templateName = templateName
        self.variableSchema = variableSchema
    }
}

public struct MessagingTemplateSendRequest: Codable {
    public let channel: String?
    public let countryCode: String?
    public let deliveryPurpose: String?
    public let dryRun: Bool?
    public let locale: String?
    public let sceneCode: String?
    public let targetHash: String?
    public let targetMasked: String?
    public let templateCode: String?
    public let userSegment: String?
    public let variables: [String: String]?


    public init(channel: String? = nil, countryCode: String? = nil, deliveryPurpose: String? = nil, dryRun: Bool? = nil, locale: String? = nil, sceneCode: String? = nil, targetHash: String? = nil, targetMasked: String? = nil, templateCode: String? = nil, userSegment: String? = nil, variables: [String: String]? = nil) {
        self.channel = channel
        self.countryCode = countryCode
        self.deliveryPurpose = deliveryPurpose
        self.dryRun = dryRun
        self.locale = locale
        self.sceneCode = sceneCode
        self.targetHash = targetHash
        self.targetMasked = targetMasked
        self.templateCode = templateCode
        self.userSegment = userSegment
        self.variables = variables
    }
}

public struct MessagingTemplateSendResponse: Codable {
    public let deliveryStatus: String?
    public let providerCode: String?
    public let requestId: String?


    public init(deliveryStatus: String? = nil, providerCode: String? = nil, requestId: String? = nil) {
        self.deliveryStatus = deliveryStatus
        self.providerCode = providerCode
        self.requestId = requestId
    }
}

public struct MessagingTestSendRequest: Codable {
    public let channel: String?
    public let countryCode: String?
    public let deliveryPurpose: String?
    public let dryRun: Bool?
    public let locale: String?
    public let sceneCode: String?
    public let targetHash: String?
    public let targetMasked: String?
    public let templateCode: String?
    public let userSegment: String?
    public let variables: [String: String]?


    public init(channel: String? = nil, countryCode: String? = nil, deliveryPurpose: String? = nil, dryRun: Bool? = nil, locale: String? = nil, sceneCode: String? = nil, targetHash: String? = nil, targetMasked: String? = nil, templateCode: String? = nil, userSegment: String? = nil, variables: [String: String]? = nil) {
        self.channel = channel
        self.countryCode = countryCode
        self.deliveryPurpose = deliveryPurpose
        self.dryRun = dryRun
        self.locale = locale
        self.sceneCode = sceneCode
        self.targetHash = targetHash
        self.targetMasked = targetMasked
        self.templateCode = templateCode
        self.userSegment = userSegment
        self.variables = variables
    }
}

public struct MessagingTestSendResponse: Codable {
    public let deliveryStatus: String?
    public let providerCode: String?
    public let requestId: String?


    public init(deliveryStatus: String? = nil, providerCode: String? = nil, requestId: String? = nil) {
        self.deliveryStatus = deliveryStatus
        self.providerCode = providerCode
        self.requestId = requestId
    }
}

public struct ModelMappingsCreateResult: Codable {
    public let code: String?
    public let data: AdminModelMappingMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminModelMappingMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ModelMappingsDeleteResult: Codable {
    public let code: String?
    public let data: AdminModelMappingDeleteResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminModelMappingDeleteResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ModelMappingsListResult: Codable {
    public let code: String?
    public let data: AdminModelMappingsResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminModelMappingsResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ModelMappingsResolveCreateResult: Codable {
    public let code: String?
    public let data: AdminModelMappingResolveResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminModelMappingResolveResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ModelMappingsUpdateResult: Codable {
    public let code: String?
    public let data: AdminModelMappingMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminModelMappingMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ModelRankingHistoryEntry: Codable {
    public let catalogKey: String?
    public let color: String?
    public let model: String?
    public let rank: String?
    public let volume: String?


    public init(catalogKey: String? = nil, color: String? = nil, model: String? = nil, rank: String? = nil, volume: String? = nil) {
        self.catalogKey = catalogKey
        self.color = color
        self.model = model
        self.rank = rank
        self.volume = volume
    }
}

public struct ModelRankingHistoryPoint: Codable {
    public let date: String?
    public let entries: [ModelRankingHistoryEntry]?
    public let index: String?


    public init(date: String? = nil, entries: [ModelRankingHistoryEntry]? = nil, index: String? = nil) {
        self.date = date
        self.entries = entries
        self.index = index
    }
}

public struct ModelRankingItem: Codable {
    public let baseVolume: String?
    public let color: String?
    public let contextSize: String?
    public let cost: Double?
    public let costIndicator: String?
    public let currency: String?
    public let id: String?
    public let isNew: Bool?
    public let latency: String?
    public let license: String?
    public let modality: String?
    public let name: String?
    public let prevRank: String?
    public let pricing: String?
    public let rank: String?
    public let requests: String?
    public let strengths: [String]?
    public let tokens: String?
    public let trendScore: Double?
    public let vendor: String?
    public let vendorCode: String?
    public let winRate: Double?


    public init(baseVolume: String? = nil, color: String? = nil, contextSize: String? = nil, cost: Double? = nil, costIndicator: String? = nil, currency: String? = nil, id: String? = nil, isNew: Bool? = nil, latency: String? = nil, license: String? = nil, modality: String? = nil, name: String? = nil, prevRank: String? = nil, pricing: String? = nil, rank: String? = nil, requests: String? = nil, strengths: [String]? = nil, tokens: String? = nil, trendScore: Double? = nil, vendor: String? = nil, vendorCode: String? = nil, winRate: Double? = nil) {
        self.baseVolume = baseVolume
        self.color = color
        self.contextSize = contextSize
        self.cost = cost
        self.costIndicator = costIndicator
        self.currency = currency
        self.id = id
        self.isNew = isNew
        self.latency = latency
        self.license = license
        self.modality = modality
        self.name = name
        self.prevRank = prevRank
        self.pricing = pricing
        self.rank = rank
        self.requests = requests
        self.strengths = strengths
        self.tokens = tokens
        self.trendScore = trendScore
        self.vendor = vendor
        self.vendorCode = vendorCode
        self.winRate = winRate
    }
}

public struct ModelRankingRefreshJobHistoryPage: Codable {
    public let items: [ModelRankingRefreshJobItem]?


    public init(items: [ModelRankingRefreshJobItem]? = nil) {
        self.items = items
    }
}

public struct ModelRankingRefreshJobItem: Codable {
    public let durationMs: String?
    public let endedAt: String?
    public let failureCount: String?
    public let failureReason: String?
    public let generatedCount: String?
    public let id: String?
    public let jobName: String?
    public let nextRefreshAt: String?
    public let organizationId: String?
    public let rankScope: String?
    public let snapshotDate: String?
    public let snapshotPeriod: String?
    public let sourceCount: String?
    public let startedAt: String?
    public let status: String?
    public let successCount: String?
    public let tenantId: String?
    public let windowEnd: String?
    public let windowStart: String?


    public init(durationMs: String? = nil, endedAt: String? = nil, failureCount: String? = nil, failureReason: String? = nil, generatedCount: String? = nil, id: String? = nil, jobName: String? = nil, nextRefreshAt: String? = nil, organizationId: String? = nil, rankScope: String? = nil, snapshotDate: String? = nil, snapshotPeriod: String? = nil, sourceCount: String? = nil, startedAt: String? = nil, status: String? = nil, successCount: String? = nil, tenantId: String? = nil, windowEnd: String? = nil, windowStart: String? = nil) {
        self.durationMs = durationMs
        self.endedAt = endedAt
        self.failureCount = failureCount
        self.failureReason = failureReason
        self.generatedCount = generatedCount
        self.id = id
        self.jobName = jobName
        self.nextRefreshAt = nextRefreshAt
        self.organizationId = organizationId
        self.rankScope = rankScope
        self.snapshotDate = snapshotDate
        self.snapshotPeriod = snapshotPeriod
        self.sourceCount = sourceCount
        self.startedAt = startedAt
        self.status = status
        self.successCount = successCount
        self.tenantId = tenantId
        self.windowEnd = windowEnd
        self.windowStart = windowStart
    }
}

public struct ModelRankingRefreshLatestJob: Codable {
    public let durationMs: String?
    public let endedAt: String?
    public let failureCount: String?
    public let failureReason: String?
    public let generatedCount: String?
    public let id: String?
    public let jobName: String?
    public let nextRefreshAt: String?
    public let organizationId: String?
    public let rankScope: String?
    public let snapshotDate: String?
    public let snapshotPeriod: String?
    public let sourceCount: String?
    public let startedAt: String?
    public let status: String?
    public let successCount: String?
    public let tenantId: String?
    public let windowEnd: String?
    public let windowStart: String?


    public init(durationMs: String? = nil, endedAt: String? = nil, failureCount: String? = nil, failureReason: String? = nil, generatedCount: String? = nil, id: String? = nil, jobName: String? = nil, nextRefreshAt: String? = nil, organizationId: String? = nil, rankScope: String? = nil, snapshotDate: String? = nil, snapshotPeriod: String? = nil, sourceCount: String? = nil, startedAt: String? = nil, status: String? = nil, successCount: String? = nil, tenantId: String? = nil, windowEnd: String? = nil, windowStart: String? = nil) {
        self.durationMs = durationMs
        self.endedAt = endedAt
        self.failureCount = failureCount
        self.failureReason = failureReason
        self.generatedCount = generatedCount
        self.id = id
        self.jobName = jobName
        self.nextRefreshAt = nextRefreshAt
        self.organizationId = organizationId
        self.rankScope = rankScope
        self.snapshotDate = snapshotDate
        self.snapshotPeriod = snapshotPeriod
        self.sourceCount = sourceCount
        self.startedAt = startedAt
        self.status = status
        self.successCount = successCount
        self.tenantId = tenantId
        self.windowEnd = windowEnd
        self.windowStart = windowStart
    }
}

public struct ModelRankingRefreshStatus: Codable {
    public let cacheMaxAgeSeconds: String?
    public let generatedAt: String?
    public let generatedCount: String?
    public let latestJob: ModelRankingRefreshLatestJob?
    public let nextRefreshAt: String?
    public let organizationId: String?
    public let rankScope: String?
    public let refreshIntervalSeconds: String?
    public let snapshotDate: String?
    public let snapshotPeriod: String?
    public let sourceCount: String?
    public let sourceTables: [String]?
    public let status: String?
    public let tenantId: String?
    public let windowEnd: String?
    public let windowStart: String?


    public init(cacheMaxAgeSeconds: String? = nil, generatedAt: String? = nil, generatedCount: String? = nil, latestJob: ModelRankingRefreshLatestJob? = nil, nextRefreshAt: String? = nil, organizationId: String? = nil, rankScope: String? = nil, refreshIntervalSeconds: String? = nil, snapshotDate: String? = nil, snapshotPeriod: String? = nil, sourceCount: String? = nil, sourceTables: [String]? = nil, status: String? = nil, tenantId: String? = nil, windowEnd: String? = nil, windowStart: String? = nil) {
        self.cacheMaxAgeSeconds = cacheMaxAgeSeconds
        self.generatedAt = generatedAt
        self.generatedCount = generatedCount
        self.latestJob = latestJob
        self.nextRefreshAt = nextRefreshAt
        self.organizationId = organizationId
        self.rankScope = rankScope
        self.refreshIntervalSeconds = refreshIntervalSeconds
        self.snapshotDate = snapshotDate
        self.snapshotPeriod = snapshotPeriod
        self.sourceCount = sourceCount
        self.sourceTables = sourceTables
        self.status = status
        self.tenantId = tenantId
        self.windowEnd = windowEnd
        self.windowStart = windowStart
    }
}

public struct ModelRankingRefreshTriggerRequest: Codable {
    public let cacheMaxAgeSeconds: String?
    public let limit: String?
    public let lookbackDays: String?
    public let rankScope: String?
    public let refreshIntervalSeconds: String?
    public let snapshotPeriod: String?


    public init(cacheMaxAgeSeconds: String? = nil, limit: String? = nil, lookbackDays: String? = nil, rankScope: String? = nil, refreshIntervalSeconds: String? = nil, snapshotPeriod: String? = nil) {
        self.cacheMaxAgeSeconds = cacheMaxAgeSeconds
        self.limit = limit
        self.lookbackDays = lookbackDays
        self.rankScope = rankScope
        self.refreshIntervalSeconds = refreshIntervalSeconds
        self.snapshotPeriod = snapshotPeriod
    }
}

public struct ModelRankingRefreshTriggerResponse: Codable {
    public let cacheMaxAgeSeconds: String?
    public let generatedCount: String?
    public let nextRefreshAt: String?
    public let organizationId: String?
    public let rankScope: String?
    public let refreshIntervalSeconds: String?
    public let snapshotDate: String?
    public let snapshotPeriod: String?
    public let sourceCount: String?
    public let status: String?
    public let tenantId: String?
    public let triggered: Bool?
    public let windowEnd: String?
    public let windowStart: String?


    public init(cacheMaxAgeSeconds: String? = nil, generatedCount: String? = nil, nextRefreshAt: String? = nil, organizationId: String? = nil, rankScope: String? = nil, refreshIntervalSeconds: String? = nil, snapshotDate: String? = nil, snapshotPeriod: String? = nil, sourceCount: String? = nil, status: String? = nil, tenantId: String? = nil, triggered: Bool? = nil, windowEnd: String? = nil, windowStart: String? = nil) {
        self.cacheMaxAgeSeconds = cacheMaxAgeSeconds
        self.generatedCount = generatedCount
        self.nextRefreshAt = nextRefreshAt
        self.organizationId = organizationId
        self.rankScope = rankScope
        self.refreshIntervalSeconds = refreshIntervalSeconds
        self.snapshotDate = snapshotDate
        self.snapshotPeriod = snapshotPeriod
        self.sourceCount = sourceCount
        self.status = status
        self.tenantId = tenantId
        self.triggered = triggered
        self.windowEnd = windowEnd
        self.windowStart = windowStart
    }
}

public struct ModelRankingsJobsListResult: Codable {
    public let code: String?
    public let data: ModelRankingRefreshJobHistoryPage?
    public let msg: String?


    public init(code: String? = nil, data: ModelRankingRefreshJobHistoryPage? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ModelRankingsListResult: Codable {
    public let code: String?
    public let data: ModelRankingsSnapshot?
    public let msg: String?


    public init(code: String? = nil, data: ModelRankingsSnapshot? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ModelRankingsRefreshResult: Codable {
    public let code: String?
    public let data: ModelRankingRefreshTriggerResponse?
    public let msg: String?


    public init(code: String? = nil, data: ModelRankingRefreshTriggerResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ModelRankingsSnapshot: Codable {
    public let history: [ModelRankingHistoryPoint]?
    public let items: [ModelRankingItem]?
    public let source: ModelRankingsSource?


    public init(history: [ModelRankingHistoryPoint]? = nil, items: [ModelRankingItem]? = nil, source: ModelRankingsSource? = nil) {
        self.history = history
        self.items = items
        self.source = source
    }
}

public struct ModelRankingsSource: Codable {
    public let cacheMaxAgeSeconds: String?
    public let generatedAt: String?
    public let nextRefreshAt: String?
    public let observedAt: String?
    public let rankScope: String?
    public let refreshIntervalSeconds: String?
    public let snapshotDate: String?
    public let snapshotPeriod: String?
    public let sourceDescription: String?
    public let sourceLabel: String?
    public let sourceTables: [String]?
    public let windowEnd: String?
    public let windowStart: String?


    public init(cacheMaxAgeSeconds: String? = nil, generatedAt: String? = nil, nextRefreshAt: String? = nil, observedAt: String? = nil, rankScope: String? = nil, refreshIntervalSeconds: String? = nil, snapshotDate: String? = nil, snapshotPeriod: String? = nil, sourceDescription: String? = nil, sourceLabel: String? = nil, sourceTables: [String]? = nil, windowEnd: String? = nil, windowStart: String? = nil) {
        self.cacheMaxAgeSeconds = cacheMaxAgeSeconds
        self.generatedAt = generatedAt
        self.nextRefreshAt = nextRefreshAt
        self.observedAt = observedAt
        self.rankScope = rankScope
        self.refreshIntervalSeconds = refreshIntervalSeconds
        self.snapshotDate = snapshotDate
        self.snapshotPeriod = snapshotPeriod
        self.sourceDescription = sourceDescription
        self.sourceLabel = sourceLabel
        self.sourceTables = sourceTables
        self.windowEnd = windowEnd
        self.windowStart = windowStart
    }
}

public struct ModelRankingsStatusRetrieveResult: Codable {
    public let code: String?
    public let data: ModelRankingRefreshStatus?
    public let msg: String?


    public init(code: String? = nil, data: ModelRankingRefreshStatus? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ModelVendorsCreateResult: Codable {
    public let code: String?
    public let data: AdminModelVendorMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminModelVendorMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ModelVendorsListResult: Codable {
    public let code: String?
    public let data: AdminModelVendorsResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminModelVendorsResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ModelsCreateResult: Codable {
    public let code: String?
    public let data: AdminAiModelMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminAiModelMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ModelsDeleteResult: Codable {
    public let code: String?
    public let data: AdminDeleteResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminDeleteResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ModelsListResult: Codable {
    public let code: String?
    public let data: AdminAiModelsResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminAiModelsResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ModelsRefreshResult: Codable {
    public let code: String?
    public let data: AdminModelCatalogSyncResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminModelCatalogSyncResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ModelsUpdateResult: Codable {
    public let code: String?
    public let data: AdminAiModelMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminAiModelMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct MonitorAlertsListResult: Codable {
    public let code: String?
    public let data: AdminMonitorAlertsResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminMonitorAlertsResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct MonitorNodesListResult: Codable {
    public let code: String?
    public let data: AdminMonitorNodesResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminMonitorNodesResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct MonitorPerformanceListResult: Codable {
    public let code: String?
    public let data: AdminMonitorPerformanceResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminMonitorPerformanceResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct OssBucketsCreateResult: Codable {
    public let code: String?
    public let data: StorageBucketMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: StorageBucketMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct OssBucketsListResult: Codable {
    public let code: String?
    public let data: StorageBucketListResponse?
    public let msg: String?


    public init(code: String? = nil, data: StorageBucketListResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct OssBucketsUpdateResult: Codable {
    public let code: String?
    public let data: StorageBucketMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: StorageBucketMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct OssDefaultBucketsListResult: Codable {
    public let code: String?
    public let data: StorageDefaultBucketListResponse?
    public let msg: String?


    public init(code: String? = nil, data: StorageDefaultBucketListResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct OssDefaultBucketsUpdateResult: Codable {
    public let code: String?
    public let data: StorageDefaultBucketMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: StorageDefaultBucketMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct OssGcJobsCreateResult: Codable {
    public let code: String?
    public let data: StorageGarbageCollectionJobMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: StorageGarbageCollectionJobMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct OssGcJobsListResult: Codable {
    public let code: String?
    public let data: StorageGarbageCollectionJobListResponse?
    public let msg: String?


    public init(code: String? = nil, data: StorageGarbageCollectionJobListResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct OssProvidersCreateResult: Codable {
    public let code: String?
    public let data: StorageProviderMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: StorageProviderMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct OssProvidersHealthChecksCreateResult: Codable {
    public let code: String?
    public let data: StorageProviderHealthCheckResponse?
    public let msg: String?


    public init(code: String? = nil, data: StorageProviderHealthCheckResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct OssProvidersListResult: Codable {
    public let code: String?
    public let data: StorageProviderListResponse?
    public let msg: String?


    public init(code: String? = nil, data: StorageProviderListResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct OssProvidersUpdateResult: Codable {
    public let code: String?
    public let data: StorageProviderMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: StorageProviderMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct OssQuotasCreateResult: Codable {
    public let code: String?
    public let data: StorageQuotaPolicyMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: StorageQuotaPolicyMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct OssQuotasListResult: Codable {
    public let code: String?
    public let data: StorageQuotaPolicyListResponse?
    public let msg: String?


    public init(code: String? = nil, data: StorageQuotaPolicyListResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct OssReconciliationRunsCreateResult: Codable {
    public let code: String?
    public let data: StorageReconciliationRunMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: StorageReconciliationRunMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct OssReconciliationRunsListResult: Codable {
    public let code: String?
    public let data: StorageReconciliationRunListResponse?
    public let msg: String?


    public init(code: String? = nil, data: StorageReconciliationRunListResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct OssUsageLedgerListResult: Codable {
    public let code: String?
    public let data: StorageUsageLedgerListResponse?
    public let msg: String?


    public init(code: String? = nil, data: StorageUsageLedgerListResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct OssUsageListResult: Codable {
    public let code: String?
    public let data: StorageUsageCounterListResponse?
    public let msg: String?


    public init(code: String? = nil, data: StorageUsageCounterListResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct OssUsageSnapshotsListResult: Codable {
    public let code: String?
    public let data: StorageUsageSnapshotListResponse?
    public let msg: String?


    public init(code: String? = nil, data: StorageUsageSnapshotListResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct PriceSimulationCreateResult: Codable {
    public let code: String?
    public let data: ServiceProviderPriceSimulationResponse?
    public let msg: String?


    public init(code: String? = nil, data: ServiceProviderPriceSimulationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct PricingRulesCreateResult: Codable {
    public let code: String?
    public let data: ServiceProviderPricingRuleMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: ServiceProviderPricingRuleMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct PricingRulesListResult: Codable {
    public let code: String?
    public let data: ServiceProviderCollectionResponse?
    public let msg: String?


    public init(code: String? = nil, data: ServiceProviderCollectionResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct PricingRulesUpdateResult: Codable {
    public let code: String?
    public let data: ServiceProviderPricingRuleMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: ServiceProviderPricingRuleMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ProblemDetail: Codable {
    public let code: String?
    public let detail: String?
    public let errors: [FieldError]?
    public let instance: String?
    public let requestId: String?
    public let status: Int?
    public let title: String?
    public let traceId: String?
    public let type: String?


    public init(code: String? = nil, detail: String? = nil, errors: [FieldError]? = nil, instance: String? = nil, requestId: String? = nil, status: Int? = nil, title: String? = nil, traceId: String? = nil, type: String? = nil) {
        self.code = code
        self.detail = detail
        self.errors = errors
        self.instance = instance
        self.requestId = requestId
        self.status = status
        self.title = title
        self.traceId = traceId
        self.type = type
    }
}

public struct ProviderAccountsCreateResult: Codable {
    public let code: String?
    public let data: MessagingMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: MessagingMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ProviderAccountsListResult: Codable {
    public let code: String?
    public let data: MessagingCollectionResponse?
    public let msg: String?


    public init(code: String? = nil, data: MessagingCollectionResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ProviderCircuitBreakerPolicy: Codable {
    public let failureThreshold: Int?


    public init(failureThreshold: Int? = nil) {
        self.failureThreshold = failureThreshold
    }
}

public struct ProviderRegistryListResult: Codable {
    public let code: String?
    public let data: ServiceProviderCollectionResponse?
    public let msg: String?


    public init(code: String? = nil, data: ServiceProviderCollectionResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ProviderRetryPolicy: Codable {
    public let backoffMs: Int?
    public let maxAttempts: Int?
    public let retryableStatusCodes: [Int]?


    public init(backoffMs: Int? = nil, maxAttempts: Int? = nil, retryableStatusCodes: [Int]? = nil) {
        self.backoffMs = backoffMs
        self.maxAttempts = maxAttempts
        self.retryableStatusCodes = retryableStatusCodes
    }
}

public struct ProviderSecretsCreateResult: Codable {
    public let code: String?
    public let data: AdminProviderSecretMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminProviderSecretMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ProviderSecretsDeleteResult: Codable {
    public let code: String?
    public let data: AdminDeleteResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminDeleteResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ProviderSecretsListResult: Codable {
    public let code: String?
    public let data: AdminProviderSecretsResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminProviderSecretsResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ProviderSecretsUpdateResult: Codable {
    public let code: String?
    public let data: AdminProviderSecretMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminProviderSecretMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ProviderWalletAccountsListResult: Codable {
    public let code: String?
    public let data: ServiceProviderCollectionResponse?
    public let msg: String?


    public init(code: String? = nil, data: ServiceProviderCollectionResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct RateLimitBucketsListResult: Codable {
    public let code: String?
    public let data: MessagingCollectionResponse?
    public let msg: String?


    public init(code: String? = nil, data: MessagingCollectionResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct RateLimitsApiKeysCreateResult: Codable {
    public let code: String?
    public let data: AdminRateLimitMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminRateLimitMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct RateLimitsApiKeysListResult: Codable {
    public let code: String?
    public let data: AdminTokenLimitsResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminTokenLimitsResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct RateLimitsIpCreateResult: Codable {
    public let code: String?
    public let data: AdminRateLimitMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminRateLimitMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct RateLimitsIpListResult: Codable {
    public let code: String?
    public let data: AdminIpLimitsResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminIpLimitsResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct RateLimitsModelsCreateResult: Codable {
    public let code: String?
    public let data: AdminRateLimitMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminRateLimitMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct RateLimitsModelsListResult: Codable {
    public let code: String?
    public let data: AdminModelLimitsResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminModelLimitsResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ReconciliationRunsListResult: Codable {
    public let code: String?
    public let data: ServiceProviderCollectionResponse?
    public let msg: String?


    public init(code: String? = nil, data: ServiceProviderCollectionResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct RecordsListResult: Codable {
    public let code: String?
    public let data: AdminRecordLogsResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminRecordLogsResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct RelationsListResult: Codable {
    public let code: String?
    public let data: ServiceProviderCollectionResponse?
    public let msg: String?


    public init(code: String? = nil, data: ServiceProviderCollectionResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct RevisionsPublishResult: Codable {
    public let code: String?
    public let data: AdminMcpServerRevisionMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminMcpServerRevisionMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct RiskEventsListResult: Codable {
    public let code: String?
    public let data: ServiceProviderCollectionResponse?
    public let msg: String?


    public init(code: String? = nil, data: ServiceProviderCollectionResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct RouteExplainCreateResult: Codable {
    public let code: String?
    public let data: AdminRuntimeRouteExplainResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminRuntimeRouteExplainResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct RouteRulesCreateResult: Codable {
    public let code: String?
    public let data: MessagingMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: MessagingMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct RouteRulesListResult: Codable {
    public let code: String?
    public let data: MessagingCollectionResponse?
    public let msg: String?


    public init(code: String? = nil, data: MessagingCollectionResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct RuntimeRegionSettingsRetrieveResult: Codable {
    public let code: String?
    public let data: AdminRuntimeRegionSettingsResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminRuntimeRegionSettingsResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct RuntimeRegionSettingsUpdateResult: Codable {
    public let code: String?
    public let data: AdminRuntimeRegionSettingsResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminRuntimeRegionSettingsResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct SendRequestsListResult: Codable {
    public let code: String?
    public let data: MessagingCollectionResponse?
    public let msg: String?


    public init(code: String? = nil, data: MessagingCollectionResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct SenderIdentitiesCreateResult: Codable {
    public let code: String?
    public let data: MessagingMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: MessagingMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct SenderIdentitiesListResult: Codable {
    public let code: String?
    public let data: MessagingCollectionResponse?
    public let msg: String?


    public init(code: String? = nil, data: MessagingCollectionResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ServersBindingsCreateResult: Codable {
    public let code: String?
    public let data: AdminMcpBindingMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminMcpBindingMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ServersBindingsListResult: Codable {
    public let code: String?
    public let data: AdminMcpBindingListResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminMcpBindingListResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ServersBindingsUpdateResult: Codable {
    public let code: String?
    public let data: AdminMcpBindingMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminMcpBindingMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ServersCreateResult: Codable {
    public let code: String?
    public let data: AdminMcpServerMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminMcpServerMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ServersHealthChecksCreateResult: Codable {
    public let code: String?
    public let data: AdminMcpHealthCheckResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminMcpHealthCheckResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ServersListResult: Codable {
    public let code: String?
    public let data: AdminMcpServerListResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminMcpServerListResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ServersRetrieveResult: Codable {
    public let code: String?
    public let data: AdminMcpServerMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminMcpServerMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ServersRevisionsCreateResult: Codable {
    public let code: String?
    public let data: AdminMcpServerRevisionMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminMcpServerRevisionMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ServersRevisionsListResult: Codable {
    public let code: String?
    public let data: AdminMcpServerRevisionListResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminMcpServerRevisionListResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ServersToolsListResult: Codable {
    public let code: String?
    public let data: AdminMcpToolListResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminMcpToolListResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ServersToolsRefreshResult: Codable {
    public let code: String?
    public let data: AdminMcpDiscoveryResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminMcpDiscoveryResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ServersUpdateResult: Codable {
    public let code: String?
    public let data: AdminMcpServerMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminMcpServerMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ServiceNodesCreateResult: Codable {
    public let code: String?
    public let data: AdminServiceNodeMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminServiceNodeMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ServiceNodesDeleteResult: Codable {
    public let code: String?
    public let data: AdminServiceNodeDeleteResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminServiceNodeDeleteResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ServiceNodesListResult: Codable {
    public let code: String?
    public let data: AdminServiceNodesResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminServiceNodesResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ServiceNodesStatusUpdateResult: Codable {
    public let code: String?
    public let data: AdminServiceNodeMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminServiceNodeMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ServiceNodesUpdateResult: Codable {
    public let code: String?
    public let data: AdminServiceNodeMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminServiceNodeMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ServiceProviderCollectionResponse: Codable {
    public let items: [[String: String]]?
    public let page: String?
    public let pageSize: String?
    public let total: String?


    public init(items: [[String: String]]? = nil, page: String? = nil, pageSize: String? = nil, total: String? = nil) {
        self.items = items
        self.page = page
        self.pageSize = pageSize
        self.total = total
    }
}

public struct ServiceProviderDashboardResponse: Codable {
    public let item: [String: Any]?


    public init(item: [String: Any]? = nil) {
        self.item = item
    }
}

public struct ServiceProviderDownstreamCreateRequest: Codable {
    public let defaultCurrency: String?
    public let defaultMultiplier: String?
    public let displayName: String?
    public let pricePlanCode: String?
    public let providerNo: String?
    public let providerType: String?
    public let sellerProviderId: String?
    public let settlementMode: String?


    public init(defaultCurrency: String? = nil, defaultMultiplier: String? = nil, displayName: String? = nil, pricePlanCode: String? = nil, providerNo: String? = nil, providerType: String? = nil, sellerProviderId: String? = nil, settlementMode: String? = nil) {
        self.defaultCurrency = defaultCurrency
        self.defaultMultiplier = defaultMultiplier
        self.displayName = displayName
        self.pricePlanCode = pricePlanCode
        self.providerNo = providerNo
        self.providerType = providerType
        self.sellerProviderId = sellerProviderId
        self.settlementMode = settlementMode
    }
}

public struct ServiceProviderDownstreamMutationResponse: Codable {
    public let item: [String: Any]?


    public init(item: [String: Any]? = nil) {
        self.item = item
    }
}

public struct ServiceProviderPriceSimulationRequest: Codable {
    public let billingMeterCode: String?
    public let buyerProviderId: String?
    public let catalogKey: String?
    public let model: String?
    public let quantity: String?
    public let tokenKind: String?


    public init(billingMeterCode: String? = nil, buyerProviderId: String? = nil, catalogKey: String? = nil, model: String? = nil, quantity: String? = nil, tokenKind: String? = nil) {
        self.billingMeterCode = billingMeterCode
        self.buyerProviderId = buyerProviderId
        self.catalogKey = catalogKey
        self.model = model
        self.quantity = quantity
        self.tokenKind = tokenKind
    }
}

public struct ServiceProviderPriceSimulationResponse: Codable {
    public let item: [String: Any]?


    public init(item: [String: Any]? = nil) {
        self.item = item
    }
}

public struct ServiceProviderPricingRuleCreateRequest: Codable {
    public let billingMeterCode: String?
    public let buyerProviderId: String?
    public let catalogKey: String?
    public let currency: String?
    public let edgeId: String?
    public let minimumCharge: String?
    public let model: String?
    public let pricePlanId: String?
    public let priority: Int?
    public let sellerProviderId: String?
    public let tokenKind: String?
    public let unitPrice: String?
    public let unitSize: String?


    public init(billingMeterCode: String? = nil, buyerProviderId: String? = nil, catalogKey: String? = nil, currency: String? = nil, edgeId: String? = nil, minimumCharge: String? = nil, model: String? = nil, pricePlanId: String? = nil, priority: Int? = nil, sellerProviderId: String? = nil, tokenKind: String? = nil, unitPrice: String? = nil, unitSize: String? = nil) {
        self.billingMeterCode = billingMeterCode
        self.buyerProviderId = buyerProviderId
        self.catalogKey = catalogKey
        self.currency = currency
        self.edgeId = edgeId
        self.minimumCharge = minimumCharge
        self.model = model
        self.pricePlanId = pricePlanId
        self.priority = priority
        self.sellerProviderId = sellerProviderId
        self.tokenKind = tokenKind
        self.unitPrice = unitPrice
        self.unitSize = unitSize
    }
}

public struct ServiceProviderPricingRuleMutationResponse: Codable {
    public let item: [String: Any]?


    public init(item: [String: Any]? = nil) {
        self.item = item
    }
}

public struct ServiceProviderPricingRuleUpdateRequest: Codable {
    public let minimumCharge: String?
    public let priority: Int?
    public let status: String?
    public let unitPrice: String?
    public let unitSize: String?


    public init(minimumCharge: String? = nil, priority: Int? = nil, status: String? = nil, unitPrice: String? = nil, unitSize: String? = nil) {
        self.minimumCharge = minimumCharge
        self.priority = priority
        self.status = status
        self.unitPrice = unitPrice
        self.unitSize = unitSize
    }
}

public struct SetStorageDefaultBucketRequest: Codable {
    public let bucketId: String?
    public let reason: String?


    public init(bucketId: String? = nil, reason: String? = nil) {
        self.bucketId = bucketId
        self.reason = reason
    }
}

public struct SiteCatalogListResult: Codable {
    public let code: String?
    public let data: AdminSitesResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminSitesResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct SiteChannelsListResult: Codable {
    public let code: String?
    public let data: AdminSiteChannelsResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminSiteChannelsResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct SiteCreateResult: Codable {
    public let code: String?
    public let data: AdminSiteMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminSiteMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct SiteDeleteResult: Codable {
    public let code: String?
    public let data: AdminSiteDeleteResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminSiteDeleteResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct SiteSettingsRetrieveResult: Codable {
    public let code: String?
    public let data: AdminSiteSettingsResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminSiteSettingsResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct SiteSettingsUpdateResult: Codable {
    public let code: String?
    public let data: AdminSiteSettingsResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminSiteSettingsResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct SiteUpdateResult: Codable {
    public let code: String?
    public let data: AdminSiteMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminSiteMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct StatementsListResult: Codable {
    public let code: String?
    public let data: ServiceProviderCollectionResponse?
    public let msg: String?


    public init(code: String? = nil, data: ServiceProviderCollectionResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct StorageBucketConfig: Codable {
    public let blockPublicAccess: Bool?
    public let bucketName: String?
    public let bucketRegion: String?
    public let createdAt: String?
    public let defaultEncryptionMode: String?
    public let defaultStorageClass: String?
    public let encryption: String?
    public let id: String?
    public let kmsKeyRef: String?
    public let lifecycleEnabled: Bool?
    public let logicalScope: String?
    public let objectKeyPrefix: String?
    public let objectLockEnabled: Bool?
    public let providerCode: String?
    public let providerId: String?
    public let publicAccessBlocked: Bool?
    public let status: String?
    public let storageClass: String?
    public let updatedAt: String?
    public let versioningEnabled: Bool?


    public init(blockPublicAccess: Bool? = nil, bucketName: String? = nil, bucketRegion: String? = nil, createdAt: String? = nil, defaultEncryptionMode: String? = nil, defaultStorageClass: String? = nil, encryption: String? = nil, id: String? = nil, kmsKeyRef: String? = nil, lifecycleEnabled: Bool? = nil, logicalScope: String? = nil, objectKeyPrefix: String? = nil, objectLockEnabled: Bool? = nil, providerCode: String? = nil, providerId: String? = nil, publicAccessBlocked: Bool? = nil, status: String? = nil, storageClass: String? = nil, updatedAt: String? = nil, versioningEnabled: Bool? = nil) {
        self.blockPublicAccess = blockPublicAccess
        self.bucketName = bucketName
        self.bucketRegion = bucketRegion
        self.createdAt = createdAt
        self.defaultEncryptionMode = defaultEncryptionMode
        self.defaultStorageClass = defaultStorageClass
        self.encryption = encryption
        self.id = id
        self.kmsKeyRef = kmsKeyRef
        self.lifecycleEnabled = lifecycleEnabled
        self.logicalScope = logicalScope
        self.objectKeyPrefix = objectKeyPrefix
        self.objectLockEnabled = objectLockEnabled
        self.providerCode = providerCode
        self.providerId = providerId
        self.publicAccessBlocked = publicAccessBlocked
        self.status = status
        self.storageClass = storageClass
        self.updatedAt = updatedAt
        self.versioningEnabled = versioningEnabled
    }
}

public struct StorageBucketListResponse: Codable {
    public let items: [StorageBucketConfig]?
    public let nextCursor: String?
    public let requestId: String?


    public init(items: [StorageBucketConfig]? = nil, nextCursor: String? = nil, requestId: String? = nil) {
        self.items = items
        self.nextCursor = nextCursor
        self.requestId = requestId
    }
}

public struct StorageBucketMutationResponse: Codable {
    public let bucket: StorageBucketConfig?
    public let requestId: String?


    public init(bucket: StorageBucketConfig? = nil, requestId: String? = nil) {
        self.bucket = bucket
        self.requestId = requestId
    }
}

public struct StorageDefaultBucketConfig: Codable {
    public let bucketId: String?
    public let bucketName: String?
    public let dataResidencyRegion: String?
    public let id: String?
    public let logicalScope: String?
    public let providerCode: String?
    public let providerId: String?
    public let providerType: String?
    public let reason: String?
    public let region: String?
    public let status: String?
    public let updatedAt: String?


    public init(bucketId: String? = nil, bucketName: String? = nil, dataResidencyRegion: String? = nil, id: String? = nil, logicalScope: String? = nil, providerCode: String? = nil, providerId: String? = nil, providerType: String? = nil, reason: String? = nil, region: String? = nil, status: String? = nil, updatedAt: String? = nil) {
        self.bucketId = bucketId
        self.bucketName = bucketName
        self.dataResidencyRegion = dataResidencyRegion
        self.id = id
        self.logicalScope = logicalScope
        self.providerCode = providerCode
        self.providerId = providerId
        self.providerType = providerType
        self.reason = reason
        self.region = region
        self.status = status
        self.updatedAt = updatedAt
    }
}

public struct StorageDefaultBucketListResponse: Codable {
    public let items: [StorageDefaultBucketConfig]?
    public let requestId: String?


    public init(items: [StorageDefaultBucketConfig]? = nil, requestId: String? = nil) {
        self.items = items
        self.requestId = requestId
    }
}

public struct StorageDefaultBucketMutationResponse: Codable {
    public let defaultBucket: StorageDefaultBucketConfig?
    public let requestId: String?


    public init(defaultBucket: StorageDefaultBucketConfig? = nil, requestId: String? = nil) {
        self.defaultBucket = defaultBucket
        self.requestId = requestId
    }
}

public struct StorageGarbageCollectionJob: Codable {
    public let candidateCount: String?
    public let createdAt: String?
    public let dryRun: Bool?
    public let id: String?
    public let jobId: String?
    public let jobType: String?
    public let retention: String?
    public let status: String?
    public let target: String?


    public init(candidateCount: String? = nil, createdAt: String? = nil, dryRun: Bool? = nil, id: String? = nil, jobId: String? = nil, jobType: String? = nil, retention: String? = nil, status: String? = nil, target: String? = nil) {
        self.candidateCount = candidateCount
        self.createdAt = createdAt
        self.dryRun = dryRun
        self.id = id
        self.jobId = jobId
        self.jobType = jobType
        self.retention = retention
        self.status = status
        self.target = target
    }
}

public struct StorageGarbageCollectionJobListResponse: Codable {
    public let items: [StorageGarbageCollectionJob]?
    public let nextCursor: String?
    public let requestId: String?


    public init(items: [StorageGarbageCollectionJob]? = nil, nextCursor: String? = nil, requestId: String? = nil) {
        self.items = items
        self.nextCursor = nextCursor
        self.requestId = requestId
    }
}

public struct StorageGarbageCollectionJobMutationResponse: Codable {
    public let job: StorageGarbageCollectionJob?
    public let requestId: String?


    public init(job: StorageGarbageCollectionJob? = nil, requestId: String? = nil) {
        self.job = job
        self.requestId = requestId
    }
}

public struct StorageProviderConfig: Codable {
    public let createdAt: String?
    public let credentialRef: String?
    public let endpoint: String?
    public let endpointUrl: String?
    public let health: String?
    public let healthStatus: String?
    public let id: String?
    public let lastHealthCheckAt: String?
    public let lifecycle: Bool?
    public let multipart: Bool?
    public let objectLock: Bool?
    public let pathStyleEnabled: Bool?
    public let providerCode: String?
    public let providerType: String?
    public let region: String?
    public let status: String?
    public let supportsLifecycle: Bool?
    public let supportsMultipart: Bool?
    public let supportsObjectLock: Bool?
    public let updatedAt: String?


    public init(createdAt: String? = nil, credentialRef: String? = nil, endpoint: String? = nil, endpointUrl: String? = nil, health: String? = nil, healthStatus: String? = nil, id: String? = nil, lastHealthCheckAt: String? = nil, lifecycle: Bool? = nil, multipart: Bool? = nil, objectLock: Bool? = nil, pathStyleEnabled: Bool? = nil, providerCode: String? = nil, providerType: String? = nil, region: String? = nil, status: String? = nil, supportsLifecycle: Bool? = nil, supportsMultipart: Bool? = nil, supportsObjectLock: Bool? = nil, updatedAt: String? = nil) {
        self.createdAt = createdAt
        self.credentialRef = credentialRef
        self.endpoint = endpoint
        self.endpointUrl = endpointUrl
        self.health = health
        self.healthStatus = healthStatus
        self.id = id
        self.lastHealthCheckAt = lastHealthCheckAt
        self.lifecycle = lifecycle
        self.multipart = multipart
        self.objectLock = objectLock
        self.pathStyleEnabled = pathStyleEnabled
        self.providerCode = providerCode
        self.providerType = providerType
        self.region = region
        self.status = status
        self.supportsLifecycle = supportsLifecycle
        self.supportsMultipart = supportsMultipart
        self.supportsObjectLock = supportsObjectLock
        self.updatedAt = updatedAt
    }
}

public struct StorageProviderHealthCheckResponse: Codable {
    public let checkedAt: String?
    public let healthy: Bool?
    public let providerId: String?
    public let requestId: String?
    public let status: String?


    public init(checkedAt: String? = nil, healthy: Bool? = nil, providerId: String? = nil, requestId: String? = nil, status: String? = nil) {
        self.checkedAt = checkedAt
        self.healthy = healthy
        self.providerId = providerId
        self.requestId = requestId
        self.status = status
    }
}

public struct StorageProviderListResponse: Codable {
    public let items: [StorageProviderConfig]?
    public let requestId: String?


    public init(items: [StorageProviderConfig]? = nil, requestId: String? = nil) {
        self.items = items
        self.requestId = requestId
    }
}

public struct StorageProviderMutationResponse: Codable {
    public let provider: StorageProviderConfig?
    public let requestId: String?


    public init(provider: StorageProviderConfig? = nil, requestId: String? = nil) {
        self.provider = provider
        self.requestId = requestId
    }
}

public struct StorageQuotaPolicy: Codable {
    public let createdAt: String?
    public let enforcement: String?
    public let id: String?
    public let limit: String?
    public let quotaLimitBytes: String?
    public let scopeId: String?
    public let scopeType: String?
    public let singleFileLimitBytes: String?
    public let status: String?
    public let updatedAt: String?
    public let used: String?
    public let usedBytes: String?


    public init(createdAt: String? = nil, enforcement: String? = nil, id: String? = nil, limit: String? = nil, quotaLimitBytes: String? = nil, scopeId: String? = nil, scopeType: String? = nil, singleFileLimitBytes: String? = nil, status: String? = nil, updatedAt: String? = nil, used: String? = nil, usedBytes: String? = nil) {
        self.createdAt = createdAt
        self.enforcement = enforcement
        self.id = id
        self.limit = limit
        self.quotaLimitBytes = quotaLimitBytes
        self.scopeId = scopeId
        self.scopeType = scopeType
        self.singleFileLimitBytes = singleFileLimitBytes
        self.status = status
        self.updatedAt = updatedAt
        self.used = used
        self.usedBytes = usedBytes
    }
}

public struct StorageQuotaPolicyListResponse: Codable {
    public let items: [StorageQuotaPolicy]?
    public let requestId: String?


    public init(items: [StorageQuotaPolicy]? = nil, requestId: String? = nil) {
        self.items = items
        self.requestId = requestId
    }
}

public struct StorageQuotaPolicyMutationResponse: Codable {
    public let quotaPolicy: StorageQuotaPolicy?
    public let requestId: String?


    public init(quotaPolicy: StorageQuotaPolicy? = nil, requestId: String? = nil) {
        self.quotaPolicy = quotaPolicy
        self.requestId = requestId
    }
}

public struct StorageReconciliationRun: Codable {
    public let bucketId: String?
    public let bucketName: String?
    public let dryRun: Bool?
    public let finishedAt: String?
    public let id: String?
    public let issueCount: String?
    public let issues: String?
    public let providerCode: String?
    public let providerId: String?
    public let runId: String?
    public let runType: String?
    public let scope: String?
    public let startedAt: String?
    public let status: String?


    public init(bucketId: String? = nil, bucketName: String? = nil, dryRun: Bool? = nil, finishedAt: String? = nil, id: String? = nil, issueCount: String? = nil, issues: String? = nil, providerCode: String? = nil, providerId: String? = nil, runId: String? = nil, runType: String? = nil, scope: String? = nil, startedAt: String? = nil, status: String? = nil) {
        self.bucketId = bucketId
        self.bucketName = bucketName
        self.dryRun = dryRun
        self.finishedAt = finishedAt
        self.id = id
        self.issueCount = issueCount
        self.issues = issues
        self.providerCode = providerCode
        self.providerId = providerId
        self.runId = runId
        self.runType = runType
        self.scope = scope
        self.startedAt = startedAt
        self.status = status
    }
}

public struct StorageReconciliationRunListResponse: Codable {
    public let items: [StorageReconciliationRun]?
    public let nextCursor: String?
    public let requestId: String?


    public init(items: [StorageReconciliationRun]? = nil, nextCursor: String? = nil, requestId: String? = nil) {
        self.items = items
        self.nextCursor = nextCursor
        self.requestId = requestId
    }
}

public struct StorageReconciliationRunMutationResponse: Codable {
    public let reconciliationRun: StorageReconciliationRun?
    public let requestId: String?


    public init(reconciliationRun: StorageReconciliationRun? = nil, requestId: String? = nil) {
        self.reconciliationRun = reconciliationRun
        self.requestId = requestId
    }
}

public struct StorageUsageCounter: Codable {
    public let fileCount: String?
    public let files: String?
    public let id: String?
    public let reserved: String?
    public let reservedBytes: String?
    public let scope: String?
    public let scopeId: String?
    public let scopeType: String?
    public let snapshotAt: String?
    public let updatedAt: String?
    public let used: String?
    public let usedBytes: String?


    public init(fileCount: String? = nil, files: String? = nil, id: String? = nil, reserved: String? = nil, reservedBytes: String? = nil, scope: String? = nil, scopeId: String? = nil, scopeType: String? = nil, snapshotAt: String? = nil, updatedAt: String? = nil, used: String? = nil, usedBytes: String? = nil) {
        self.fileCount = fileCount
        self.files = files
        self.id = id
        self.reserved = reserved
        self.reservedBytes = reservedBytes
        self.scope = scope
        self.scopeId = scopeId
        self.scopeType = scopeType
        self.snapshotAt = snapshotAt
        self.updatedAt = updatedAt
        self.used = used
        self.usedBytes = usedBytes
    }
}

public struct StorageUsageCounterListResponse: Codable {
    public let items: [StorageUsageCounter]?
    public let nextCursor: String?
    public let requestId: String?


    public init(items: [StorageUsageCounter]? = nil, nextCursor: String? = nil, requestId: String? = nil) {
        self.items = items
        self.nextCursor = nextCursor
        self.requestId = requestId
    }
}

public struct StorageUsageLedgerEntry: Codable {
    public let deltaBytes: String?
    public let id: String?
    public let occurredAt: String?
    public let scopeId: String?
    public let scopeType: String?


    public init(deltaBytes: String? = nil, id: String? = nil, occurredAt: String? = nil, scopeId: String? = nil, scopeType: String? = nil) {
        self.deltaBytes = deltaBytes
        self.id = id
        self.occurredAt = occurredAt
        self.scopeId = scopeId
        self.scopeType = scopeType
    }
}

public struct StorageUsageLedgerListResponse: Codable {
    public let items: [StorageUsageLedgerEntry]?
    public let nextCursor: String?
    public let requestId: String?


    public init(items: [StorageUsageLedgerEntry]? = nil, nextCursor: String? = nil, requestId: String? = nil) {
        self.items = items
        self.nextCursor = nextCursor
        self.requestId = requestId
    }
}

public struct StorageUsageSnapshot: Codable {
    public let fileCount: String?
    public let id: String?
    public let reservedBytes: String?
    public let scope: String?
    public let scopeId: String?
    public let scopeType: String?
    public let snapshotAt: String?
    public let snapshotType: String?
    public let usedBytes: String?


    public init(fileCount: String? = nil, id: String? = nil, reservedBytes: String? = nil, scope: String? = nil, scopeId: String? = nil, scopeType: String? = nil, snapshotAt: String? = nil, snapshotType: String? = nil, usedBytes: String? = nil) {
        self.fileCount = fileCount
        self.id = id
        self.reservedBytes = reservedBytes
        self.scope = scope
        self.scopeId = scopeId
        self.scopeType = scopeType
        self.snapshotAt = snapshotAt
        self.snapshotType = snapshotType
        self.usedBytes = usedBytes
    }
}

public struct StorageUsageSnapshotListResponse: Codable {
    public let items: [StorageUsageSnapshot]?
    public let nextCursor: String?
    public let requestId: String?


    public init(items: [StorageUsageSnapshot]? = nil, nextCursor: String? = nil, requestId: String? = nil) {
        self.items = items
        self.nextCursor = nextCursor
        self.requestId = requestId
    }
}

public struct SuppressionsCreateResult: Codable {
    public let code: String?
    public let data: MessagingMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: MessagingMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct SuppressionsListResult: Codable {
    public let code: String?
    public let data: MessagingCollectionResponse?
    public let msg: String?


    public init(code: String? = nil, data: MessagingCollectionResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct TemplateSendsCreateResult: Codable {
    public let code: String?
    public let data: MessagingTemplateSendResponse?
    public let msg: String?


    public init(code: String? = nil, data: MessagingTemplateSendResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct TemplatesCreateResult: Codable {
    public let code: String?
    public let data: MessagingMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: MessagingMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct TemplatesListResult: Codable {
    public let code: String?
    public let data: MessagingCollectionResponse?
    public let msg: String?


    public init(code: String? = nil, data: MessagingCollectionResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct TemplatesVersionsPublishResult: Codable {
    public let code: String?
    public let data: MessagingMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: MessagingMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct TestConnectionCreateResult: Codable {
    public let code: String?
    public let data: AdminSiteConnectionCheckResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminSiteConnectionCheckResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct ToolsUpdateResult: Codable {
    public let code: String?
    public let data: AdminMcpToolMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminMcpToolMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct UpdateStorageBucketRequest: Codable {
    public let reason: String?
    public let status: String?


    public init(reason: String? = nil, status: String? = nil) {
        self.reason = reason
        self.status = status
    }
}

public struct UpdateStorageProviderRequest: Codable {
    public let reason: String?
    public let status: String?


    public init(reason: String? = nil, status: String? = nil) {
        self.reason = reason
        self.status = status
    }
}

public struct UsageListResult: Codable {
    public let code: String?
    public let data: ServiceProviderCollectionResponse?
    public let msg: String?


    public init(code: String? = nil, data: ServiceProviderCollectionResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct VerificationPoliciesListResult: Codable {
    public let code: String?
    public let data: MessagingCollectionResponse?
    public let msg: String?


    public init(code: String? = nil, data: MessagingCollectionResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct VerificationPoliciesUpdateResult: Codable {
    public let code: String?
    public let data: MessagingMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: MessagingMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct VerificationPolicyUpdateRequest: Codable {
    public let allowedChannels: [String]?
    public let codeLength: Int?
    public let defaultChannel: String?
    public let maxSendPerHour: Int?
    public let maxVerifyAttempts: Int?
    public let resendIntervalSeconds: Int?
    public let riskPolicy: [String: String]?
    public let templateCode: String?
    public let ttlSeconds: Int?


    public init(allowedChannels: [String]? = nil, codeLength: Int? = nil, defaultChannel: String? = nil, maxSendPerHour: Int? = nil, maxVerifyAttempts: Int? = nil, resendIntervalSeconds: Int? = nil, riskPolicy: [String: String]? = nil, templateCode: String? = nil, ttlSeconds: Int? = nil) {
        self.allowedChannels = allowedChannels
        self.codeLength = codeLength
        self.defaultChannel = defaultChannel
        self.maxSendPerHour = maxSendPerHour
        self.maxVerifyAttempts = maxVerifyAttempts
        self.resendIntervalSeconds = resendIntervalSeconds
        self.riskPolicy = riskPolicy
        self.templateCode = templateCode
        self.ttlSeconds = ttlSeconds
    }
}

public struct VersionRendersCreateResult: Codable {
    public let code: String?
    public let data: AdminPromptRenderResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminPromptRenderResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct VersionsCreateResult: Codable {
    public let code: String?
    public let data: AdminPromptVersionMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminPromptVersionMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct VersionsListResult: Codable {
    public let code: String?
    public let data: AdminPromptVersionListResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminPromptVersionListResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}

public struct VersionsPublishResult: Codable {
    public let code: String?
    public let data: AdminPromptVersionMutationResponse?
    public let msg: String?


    public init(code: String? = nil, data: AdminPromptVersionMutationResponse? = nil, msg: String? = nil) {
        self.code = code
        self.data = data
        self.msg = msg
    }
}
