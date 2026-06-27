Map<String, dynamic>? _sdkworkAsMap(dynamic value) {
  if (value is Map<String, dynamic>) {
    return value;
  }
  if (value is Map) {
    return value.map((key, item) => MapEntry(key.toString(), item));
  }
  return null;
}

List<dynamic>? _sdkworkAsList(dynamic value) {
  return value is List ? value : null;
}

class ApiKeysCreateResult {
  final String code;
  final CreateApiKeyResponse? data;
  final String? msg;

  ApiKeysCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ApiKeysCreateResult.fromJson(Map<String, dynamic> json) {
    return ApiKeysCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ApiKeysCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : CreateApiKeyResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class ApiKeysDeleteResult {
  final String code;
  final DeleteApiKeyResponse? data;
  final String? msg;

  ApiKeysDeleteResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ApiKeysDeleteResult.fromJson(Map<String, dynamic> json) {
    return ApiKeysDeleteResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ApiKeysDeleteResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : DeleteApiKeyResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class ApiKeysListResult {
  final String code;
  final AppApiKeyListResponse? data;
  final String? msg;

  ApiKeysListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ApiKeysListResult.fromJson(Map<String, dynamic> json) {
    return ApiKeysListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ApiKeysListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AppApiKeyListResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class ApiKeysUpdateResult {
  final String code;
  final UpdateApiKeyResponse? data;
  final String? msg;

  ApiKeysUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ApiKeysUpdateResult.fromJson(Map<String, dynamic> json) {
    return ApiKeysUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ApiKeysUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : UpdateApiKeyResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class AppApiKeyItem {
  final String channelGroup;
  final String? channelGroupName;
  final String? copyableKey;
  final String created;
  final bool defaultForRuntime;
  final String expires;
  final String id;
  final String ipLimit;
  final String maskedKey;
  final List<String> modalities;
  final String name;
  final String quota;
  final String? rate;
  final String status;
  final String usedQuota;

  AppApiKeyItem({
    required this.channelGroup,
    this.channelGroupName,
    this.copyableKey,
    required this.created,
    required this.defaultForRuntime,
    required this.expires,
    required this.id,
    required this.ipLimit,
    required this.maskedKey,
    required this.modalities,
    required this.name,
    required this.quota,
    this.rate,
    required this.status,
    required this.usedQuota
  });

  factory AppApiKeyItem.fromJson(Map<String, dynamic> json) {
    return AppApiKeyItem(
      channelGroup: (() {
        final value = json['channelGroup']?.toString();
        if (value == null) {
          throw FormatException('AppApiKeyItem.channelGroup is required');
        }
        return value;
      })(),
      channelGroupName: json['channelGroupName']?.toString(),
      copyableKey: json['copyableKey']?.toString(),
      created: (() {
        final value = json['created']?.toString();
        if (value == null) {
          throw FormatException('AppApiKeyItem.created is required');
        }
        return value;
      })(),
      defaultForRuntime: (() {
        final value = json['defaultForRuntime'];
        if (value is! bool) {
          throw FormatException('AppApiKeyItem.defaultForRuntime is required');
        }
        return value;
      })(),
      expires: (() {
        final value = json['expires']?.toString();
        if (value == null) {
          throw FormatException('AppApiKeyItem.expires is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AppApiKeyItem.id is required');
        }
        return value;
      })(),
      ipLimit: (() {
        final value = json['ipLimit']?.toString();
        if (value == null) {
          throw FormatException('AppApiKeyItem.ipLimit is required');
        }
        return value;
      })(),
      maskedKey: (() {
        final value = json['maskedKey']?.toString();
        if (value == null) {
          throw FormatException('AppApiKeyItem.maskedKey is required');
        }
        return value;
      })(),
      modalities: (() {
        final list = _sdkworkAsList(json['modalities']);
        if (list == null) {
          throw FormatException('AppApiKeyItem.modalities is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AppApiKeyItem.name is required');
        }
        return value;
      })(),
      quota: (() {
        final value = json['quota']?.toString();
        if (value == null) {
          throw FormatException('AppApiKeyItem.quota is required');
        }
        return value;
      })(),
      rate: json['rate']?.toString(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AppApiKeyItem.status is required');
        }
        return value;
      })(),
      usedQuota: (() {
        final value = json['usedQuota']?.toString();
        if (value == null) {
          throw FormatException('AppApiKeyItem.usedQuota is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'channelGroup': channelGroup,
      'channelGroupName': channelGroupName,
      'copyableKey': copyableKey,
      'created': created,
      'defaultForRuntime': defaultForRuntime,
      'expires': expires,
      'id': id,
      'ipLimit': ipLimit,
      'maskedKey': maskedKey,
      'modalities': modalities.map((item) => item).toList(),
      'name': name,
      'quota': quota,
      'rate': rate,
      'status': status,
      'usedQuota': usedQuota,
    };
  }
}

class AppApiKeyListResponse {
  final List<AppChannelGroup> groups;
  final List<AppApiKeyItem> items;

  AppApiKeyListResponse({
    required this.groups,
    required this.items
  });

  factory AppApiKeyListResponse.fromJson(Map<String, dynamic> json) {
    return AppApiKeyListResponse(
      groups: (() {
        final list = _sdkworkAsList(json['groups']);
        if (list == null) {
          throw FormatException('AppApiKeyListResponse.groups is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AppChannelGroup.fromJson(map);
      })())
            .whereType<AppChannelGroup>()
            .toList();
      })(),
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AppApiKeyListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AppApiKeyItem.fromJson(map);
      })())
            .whereType<AppApiKeyItem>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'groups': groups.map((item) => item.toJson()).toList(),
      'items': items.map((item) => item.toJson()).toList(),
    };
  }
}

class AppChannelGroup {
  final String code;
  final String id;
  final String name;
  final String rate;

  AppChannelGroup({
    required this.code,
    required this.id,
    required this.name,
    required this.rate
  });

  factory AppChannelGroup.fromJson(Map<String, dynamic> json) {
    return AppChannelGroup(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('AppChannelGroup.code is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AppChannelGroup.id is required');
        }
        return value;
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AppChannelGroup.name is required');
        }
        return value;
      })(),
      rate: (() {
        final value = json['rate']?.toString();
        if (value == null) {
          throw FormatException('AppChannelGroup.rate is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'id': id,
      'name': name,
      'rate': rate,
    };
  }
}

class AppChannelGroupListResponse {
  final List<AppChannelGroup> items;

  AppChannelGroupListResponse({
    required this.items
  });

  factory AppChannelGroupListResponse.fromJson(Map<String, dynamic> json) {
    return AppChannelGroupListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AppChannelGroupListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AppChannelGroup.fromJson(map);
      })())
            .whereType<AppChannelGroup>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
    };
  }
}

class ArtifactsCreateResult {
  final String code;
  final RuntimeArtifactResponse? data;
  final String? msg;

  ArtifactsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ArtifactsCreateResult.fromJson(Map<String, dynamic> json) {
    return ArtifactsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ArtifactsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : RuntimeArtifactResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class ArtifactsListResult {
  final String code;
  final RuntimeArtifactListResponse? data;
  final String? msg;

  ArtifactsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ArtifactsListResult.fromJson(Map<String, dynamic> json) {
    return ArtifactsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ArtifactsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : RuntimeArtifactListResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class ChannelGroupsListResult {
  final String code;
  final AppChannelGroupListResponse? data;
  final String? msg;

  ChannelGroupsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ChannelGroupsListResult.fromJson(Map<String, dynamic> json) {
    return ChannelGroupsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ChannelGroupsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AppChannelGroupListResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class ChatConversationCreateRequest {
  final String? agentId;
  final String? agentSessionId;
  final String? defaultModel;
  final String? defaultProvider;
  final String? memorySpaceId;
  final Map<String, dynamic>? metadata;
  final String? sourceSurface;
  final String? title;

  ChatConversationCreateRequest({
    this.agentId,
    this.agentSessionId,
    this.defaultModel,
    this.defaultProvider,
    this.memorySpaceId,
    this.metadata,
    this.sourceSurface,
    this.title
  });

  factory ChatConversationCreateRequest.fromJson(Map<String, dynamic> json) {
    return ChatConversationCreateRequest(
      agentId: json['agentId']?.toString(),
      agentSessionId: json['agentSessionId']?.toString(),
      defaultModel: json['defaultModel']?.toString(),
      defaultProvider: json['defaultProvider']?.toString(),
      memorySpaceId: json['memorySpaceId']?.toString(),
      metadata: (() {
        final map = _sdkworkAsMap(json['metadata']);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      sourceSurface: json['sourceSurface']?.toString(),
      title: json['title']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'agentId': agentId,
      'agentSessionId': agentSessionId,
      'defaultModel': defaultModel,
      'defaultProvider': defaultProvider,
      'memorySpaceId': memorySpaceId,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'sourceSurface': sourceSurface,
      'title': title,
    };
  }
}

class ChatConversationItem {
  final String? agentId;
  final String? agentSessionId;
  final String createdAt;
  final String? defaultModel;
  final String? defaultProvider;
  final String id;
  final String? lastMessagePreview;
  final String? memorySpaceId;
  final String messageCount;
  final String sourceSurface;
  final String status;
  final String title;
  final String turnCount;
  final String updatedAt;

  ChatConversationItem({
    this.agentId,
    this.agentSessionId,
    required this.createdAt,
    this.defaultModel,
    this.defaultProvider,
    required this.id,
    this.lastMessagePreview,
    this.memorySpaceId,
    required this.messageCount,
    required this.sourceSurface,
    required this.status,
    required this.title,
    required this.turnCount,
    required this.updatedAt
  });

  factory ChatConversationItem.fromJson(Map<String, dynamic> json) {
    return ChatConversationItem(
      agentId: json['agentId']?.toString(),
      agentSessionId: json['agentSessionId']?.toString(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('ChatConversationItem.createdAt is required');
        }
        return value;
      })(),
      defaultModel: json['defaultModel']?.toString(),
      defaultProvider: json['defaultProvider']?.toString(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('ChatConversationItem.id is required');
        }
        return value;
      })(),
      lastMessagePreview: json['lastMessagePreview']?.toString(),
      memorySpaceId: json['memorySpaceId']?.toString(),
      messageCount: (() {
        final value = json['messageCount']?.toString();
        if (value == null) {
          throw FormatException('ChatConversationItem.messageCount is required');
        }
        return value;
      })(),
      sourceSurface: (() {
        final value = json['sourceSurface']?.toString();
        if (value == null) {
          throw FormatException('ChatConversationItem.sourceSurface is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('ChatConversationItem.status is required');
        }
        return value;
      })(),
      title: (() {
        final value = json['title']?.toString();
        if (value == null) {
          throw FormatException('ChatConversationItem.title is required');
        }
        return value;
      })(),
      turnCount: (() {
        final value = json['turnCount']?.toString();
        if (value == null) {
          throw FormatException('ChatConversationItem.turnCount is required');
        }
        return value;
      })(),
      updatedAt: (() {
        final value = json['updatedAt']?.toString();
        if (value == null) {
          throw FormatException('ChatConversationItem.updatedAt is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'agentId': agentId,
      'agentSessionId': agentSessionId,
      'createdAt': createdAt,
      'defaultModel': defaultModel,
      'defaultProvider': defaultProvider,
      'id': id,
      'lastMessagePreview': lastMessagePreview,
      'memorySpaceId': memorySpaceId,
      'messageCount': messageCount,
      'sourceSurface': sourceSurface,
      'status': status,
      'title': title,
      'turnCount': turnCount,
      'updatedAt': updatedAt,
    };
  }
}

class ChatConversationListResponse {
  final List<ChatConversationItem> items;

  ChatConversationListResponse({
    required this.items
  });

  factory ChatConversationListResponse.fromJson(Map<String, dynamic> json) {
    return ChatConversationListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('ChatConversationListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ChatConversationItem.fromJson(map);
      })())
            .whereType<ChatConversationItem>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
    };
  }
}

class ChatConversationResponse {
  final ChatConversationItem item;

  ChatConversationResponse({
    required this.item
  });

  factory ChatConversationResponse.fromJson(Map<String, dynamic> json) {
    return ChatConversationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('ChatConversationResponse.item is required');
        }
        return ChatConversationItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class ChatMessageItem {
  final String content;
  final String conversationId;
  final String createdAt;
  final String direction;
  final String id;
  final String? model;
  final String? provider;
  final String role;
  final String? runtime;
  final String? runtimeInvocationId;
  final String status;
  final String? turnId;
  final Map<String, dynamic>? usage;
  final String? usageLinkId;

  ChatMessageItem({
    required this.content,
    required this.conversationId,
    required this.createdAt,
    required this.direction,
    required this.id,
    this.model,
    this.provider,
    required this.role,
    this.runtime,
    this.runtimeInvocationId,
    required this.status,
    this.turnId,
    this.usage,
    this.usageLinkId
  });

  factory ChatMessageItem.fromJson(Map<String, dynamic> json) {
    return ChatMessageItem(
      content: (() {
        final value = json['content']?.toString();
        if (value == null) {
          throw FormatException('ChatMessageItem.content is required');
        }
        return value;
      })(),
      conversationId: (() {
        final value = json['conversationId']?.toString();
        if (value == null) {
          throw FormatException('ChatMessageItem.conversationId is required');
        }
        return value;
      })(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('ChatMessageItem.createdAt is required');
        }
        return value;
      })(),
      direction: (() {
        final value = json['direction']?.toString();
        if (value == null) {
          throw FormatException('ChatMessageItem.direction is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('ChatMessageItem.id is required');
        }
        return value;
      })(),
      model: json['model']?.toString(),
      provider: json['provider']?.toString(),
      role: (() {
        final value = json['role']?.toString();
        if (value == null) {
          throw FormatException('ChatMessageItem.role is required');
        }
        return value;
      })(),
      runtime: json['runtime']?.toString(),
      runtimeInvocationId: json['runtimeInvocationId']?.toString(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('ChatMessageItem.status is required');
        }
        return value;
      })(),
      turnId: json['turnId']?.toString(),
      usage: _sdkworkAsMap(json['usage']),
      usageLinkId: json['usageLinkId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'content': content,
      'conversationId': conversationId,
      'createdAt': createdAt,
      'direction': direction,
      'id': id,
      'model': model,
      'provider': provider,
      'role': role,
      'runtime': runtime,
      'runtimeInvocationId': runtimeInvocationId,
      'status': status,
      'turnId': turnId,
      'usage': usage,
      'usageLinkId': usageLinkId,
    };
  }
}

class ChatMessageListResponse {
  final List<ChatMessageItem> items;

  ChatMessageListResponse({
    required this.items
  });

  factory ChatMessageListResponse.fromJson(Map<String, dynamic> json) {
    return ChatMessageListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('ChatMessageListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ChatMessageItem.fromJson(map);
      })())
            .whereType<ChatMessageItem>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
    };
  }
}

class ChatTurnCreateRequest {
  final String? agentId;
  final String? agentSessionId;
  final String message;
  final Map<String, dynamic>? metadata;
  final String? mode;
  final String? model;
  final String? provider;

  ChatTurnCreateRequest({
    this.agentId,
    this.agentSessionId,
    required this.message,
    this.metadata,
    this.mode,
    this.model,
    this.provider
  });

  factory ChatTurnCreateRequest.fromJson(Map<String, dynamic> json) {
    return ChatTurnCreateRequest(
      agentId: json['agentId']?.toString(),
      agentSessionId: json['agentSessionId']?.toString(),
      message: (() {
        final value = json['message']?.toString();
        if (value == null) {
          throw FormatException('ChatTurnCreateRequest.message is required');
        }
        return value;
      })(),
      metadata: (() {
        final map = _sdkworkAsMap(json['metadata']);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      mode: json['mode']?.toString(),
      model: json['model']?.toString(),
      provider: json['provider']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'agentId': agentId,
      'agentSessionId': agentSessionId,
      'message': message,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'mode': mode,
      'model': model,
      'provider': provider,
    };
  }
}

class ChatTurnCreateResponse {
  final List<ChatMessageItem> messages;
  final ChatTurnItem turn;

  ChatTurnCreateResponse({
    required this.messages,
    required this.turn
  });

  factory ChatTurnCreateResponse.fromJson(Map<String, dynamic> json) {
    return ChatTurnCreateResponse(
      messages: (() {
        final list = _sdkworkAsList(json['messages']);
        if (list == null) {
          throw FormatException('ChatTurnCreateResponse.messages is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ChatMessageItem.fromJson(map);
      })())
            .whereType<ChatMessageItem>()
            .toList();
      })(),
      turn: (() {
        final map = _sdkworkAsMap(json['turn']);
        if (map == null) {
          throw FormatException('ChatTurnCreateResponse.turn is required');
        }
        return ChatTurnItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'messages': messages.map((item) => item.toJson()).toList(),
      'turn': turn.toJson(),
    };
  }
}

class ChatTurnItem {
  final String? agentId;
  final String? agentSessionId;
  final String conversationId;
  final String createdAt;
  final String id;
  final String? model;
  final String? provider;
  final String status;
  final String updatedAt;

  ChatTurnItem({
    this.agentId,
    this.agentSessionId,
    required this.conversationId,
    required this.createdAt,
    required this.id,
    this.model,
    this.provider,
    required this.status,
    required this.updatedAt
  });

  factory ChatTurnItem.fromJson(Map<String, dynamic> json) {
    return ChatTurnItem(
      agentId: json['agentId']?.toString(),
      agentSessionId: json['agentSessionId']?.toString(),
      conversationId: (() {
        final value = json['conversationId']?.toString();
        if (value == null) {
          throw FormatException('ChatTurnItem.conversationId is required');
        }
        return value;
      })(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('ChatTurnItem.createdAt is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('ChatTurnItem.id is required');
        }
        return value;
      })(),
      model: json['model']?.toString(),
      provider: json['provider']?.toString(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('ChatTurnItem.status is required');
        }
        return value;
      })(),
      updatedAt: (() {
        final value = json['updatedAt']?.toString();
        if (value == null) {
          throw FormatException('ChatTurnItem.updatedAt is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'agentId': agentId,
      'agentSessionId': agentSessionId,
      'conversationId': conversationId,
      'createdAt': createdAt,
      'id': id,
      'model': model,
      'provider': provider,
      'status': status,
      'updatedAt': updatedAt,
    };
  }
}

class ChatTurnResponseRequest {
  final String message;
  final Map<String, dynamic>? metadata;
  final String? model;
  final String? provider;
  final String? runtime;
  final String? runtimeInvocationId;
  final String? status;
  final Map<String, dynamic>? usage;
  final String? usageFactId;

  ChatTurnResponseRequest({
    required this.message,
    this.metadata,
    this.model,
    this.provider,
    this.runtime,
    this.runtimeInvocationId,
    this.status,
    this.usage,
    this.usageFactId
  });

  factory ChatTurnResponseRequest.fromJson(Map<String, dynamic> json) {
    return ChatTurnResponseRequest(
      message: (() {
        final value = json['message']?.toString();
        if (value == null) {
          throw FormatException('ChatTurnResponseRequest.message is required');
        }
        return value;
      })(),
      metadata: (() {
        final map = _sdkworkAsMap(json['metadata']);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      model: json['model']?.toString(),
      provider: json['provider']?.toString(),
      runtime: json['runtime']?.toString(),
      runtimeInvocationId: json['runtimeInvocationId']?.toString(),
      status: json['status']?.toString(),
      usage: _sdkworkAsMap(json['usage']),
      usageFactId: json['usageFactId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'message': message,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'provider': provider,
      'runtime': runtime,
      'runtimeInvocationId': runtimeInvocationId,
      'status': status,
      'usage': usage,
      'usageFactId': usageFactId,
    };
  }
}

class ConversationMessagesListResult {
  final String code;
  final ChatMessageListResponse? data;
  final String? msg;

  ConversationMessagesListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ConversationMessagesListResult.fromJson(Map<String, dynamic> json) {
    return ConversationMessagesListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ConversationMessagesListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ChatMessageListResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class ConversationsCreateResult {
  final String code;
  final ChatConversationResponse? data;
  final String? msg;

  ConversationsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ConversationsCreateResult.fromJson(Map<String, dynamic> json) {
    return ConversationsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ConversationsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ChatConversationResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class ConversationsListResult {
  final String code;
  final ChatConversationListResponse? data;
  final String? msg;

  ConversationsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ConversationsListResult.fromJson(Map<String, dynamic> json) {
    return ConversationsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ConversationsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ChatConversationListResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class ConversationsRetrieveResult {
  final String code;
  final ChatConversationItem? data;
  final String? msg;

  ConversationsRetrieveResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ConversationsRetrieveResult.fromJson(Map<String, dynamic> json) {
    return ConversationsRetrieveResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ConversationsRetrieveResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ChatConversationItem.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class CreateApiKeyRequest {
  final String channelGroup;
  final bool? defaultForRuntime;
  final String? expires;
  final String? ipLimit;
  final bool? isUnlimitedQuota;
  final List<String>? modalities;
  final String name;
  final String? quota;

  CreateApiKeyRequest({
    required this.channelGroup,
    this.defaultForRuntime,
    this.expires,
    this.ipLimit,
    this.isUnlimitedQuota,
    this.modalities,
    required this.name,
    this.quota
  });

  factory CreateApiKeyRequest.fromJson(Map<String, dynamic> json) {
    return CreateApiKeyRequest(
      channelGroup: (() {
        final value = json['channelGroup']?.toString();
        if (value == null) {
          throw FormatException('CreateApiKeyRequest.channelGroup is required');
        }
        return value;
      })(),
      defaultForRuntime: json['defaultForRuntime'] is bool ? json['defaultForRuntime'] : null,
      expires: json['expires']?.toString(),
      ipLimit: json['ipLimit']?.toString(),
      isUnlimitedQuota: json['isUnlimitedQuota'] is bool ? json['isUnlimitedQuota'] : null,
      modalities: (() {
        final list = _sdkworkAsList(json['modalities']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('CreateApiKeyRequest.name is required');
        }
        return value;
      })(),
      quota: json['quota']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'channelGroup': channelGroup,
      'defaultForRuntime': defaultForRuntime,
      'expires': expires,
      'ipLimit': ipLimit,
      'isUnlimitedQuota': isUnlimitedQuota,
      'modalities': modalities?.map((item) => item).toList(),
      'name': name,
      'quota': quota,
    };
  }
}

class CreateApiKeyResponse {
  final AppApiKeyItem item;
  final String rawKey;

  CreateApiKeyResponse({
    required this.item,
    required this.rawKey
  });

  factory CreateApiKeyResponse.fromJson(Map<String, dynamic> json) {
    return CreateApiKeyResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('CreateApiKeyResponse.item is required');
        }
        return AppApiKeyItem.fromJson(map);
      })(),
      rawKey: (() {
        final value = json['rawKey']?.toString();
        if (value == null) {
          throw FormatException('CreateApiKeyResponse.rawKey is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
      'rawKey': rawKey,
    };
  }
}

class DashboardAnnouncement {
  final String id;
  final String text;
  final String time;
  final String type;

  DashboardAnnouncement({
    required this.id,
    required this.text,
    required this.time,
    required this.type
  });

  factory DashboardAnnouncement.fromJson(Map<String, dynamic> json) {
    return DashboardAnnouncement(
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('DashboardAnnouncement.id is required');
        }
        return value;
      })(),
      text: (() {
        final value = json['text']?.toString();
        if (value == null) {
          throw FormatException('DashboardAnnouncement.text is required');
        }
        return value;
      })(),
      time: (() {
        final value = json['time']?.toString();
        if (value == null) {
          throw FormatException('DashboardAnnouncement.time is required');
        }
        return value;
      })(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('DashboardAnnouncement.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'text': text,
      'time': time,
      'type': type,
    };
  }
}

class DashboardChartPoint {
  final double audioWhisper;
  final double imageMidjourneyDallE;
  final double llmText;
  final double musicSuno;
  final String time;
  final double videoRunwaySora;

  DashboardChartPoint({
    required this.audioWhisper,
    required this.imageMidjourneyDallE,
    required this.llmText,
    required this.musicSuno,
    required this.time,
    required this.videoRunwaySora
  });

  factory DashboardChartPoint.fromJson(Map<String, dynamic> json) {
    return DashboardChartPoint(
      audioWhisper: (() {
        final value = json['audio (Whisper)'];
        if (value is! num) {
          throw FormatException('DashboardChartPoint.audio (Whisper) is required');
        }
        return value.toDouble();
      })(),
      imageMidjourneyDallE: (() {
        final value = json['image (Midjourney/DALL-E)'];
        if (value is! num) {
          throw FormatException('DashboardChartPoint.image (Midjourney/DALL-E) is required');
        }
        return value.toDouble();
      })(),
      llmText: (() {
        final value = json['llm (Text)'];
        if (value is! num) {
          throw FormatException('DashboardChartPoint.llm (Text) is required');
        }
        return value.toDouble();
      })(),
      musicSuno: (() {
        final value = json['music (Suno)'];
        if (value is! num) {
          throw FormatException('DashboardChartPoint.music (Suno) is required');
        }
        return value.toDouble();
      })(),
      time: (() {
        final value = json['time']?.toString();
        if (value == null) {
          throw FormatException('DashboardChartPoint.time is required');
        }
        return value;
      })(),
      videoRunwaySora: (() {
        final value = json['video (Runway/Sora)'];
        if (value is! num) {
          throw FormatException('DashboardChartPoint.video (Runway/Sora) is required');
        }
        return value.toDouble();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'audio (Whisper)': audioWhisper,
      'image (Midjourney/DALL-E)': imageMidjourneyDallE,
      'llm (Text)': llmText,
      'music (Suno)': musicSuno,
      'time': time,
      'video (Runway/Sora)': videoRunwaySora,
    };
  }
}

class DashboardConfigurationDomain {
  final String domain;
  final String id;
  final String ip;
  final String name;
  final String remark;
  final String status;

  DashboardConfigurationDomain({
    required this.domain,
    required this.id,
    required this.ip,
    required this.name,
    required this.remark,
    required this.status
  });

  factory DashboardConfigurationDomain.fromJson(Map<String, dynamic> json) {
    return DashboardConfigurationDomain(
      domain: (() {
        final value = json['domain']?.toString();
        if (value == null) {
          throw FormatException('DashboardConfigurationDomain.domain is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('DashboardConfigurationDomain.id is required');
        }
        return value;
      })(),
      ip: (() {
        final value = json['ip']?.toString();
        if (value == null) {
          throw FormatException('DashboardConfigurationDomain.ip is required');
        }
        return value;
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('DashboardConfigurationDomain.name is required');
        }
        return value;
      })(),
      remark: (() {
        final value = json['remark']?.toString();
        if (value == null) {
          throw FormatException('DashboardConfigurationDomain.remark is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('DashboardConfigurationDomain.status is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'domain': domain,
      'id': id,
      'ip': ip,
      'name': name,
      'remark': remark,
      'status': status,
    };
  }
}

class DashboardOverviewResponse {
  final List<DashboardAnnouncement> announcements;
  final List<DashboardChartPoint> chartData;
  final List<DashboardConfigurationDomain>? configurationDomains;
  final List<DashboardSparklinePoint> multimodalSparkline;
  final List<DashboardSparklinePoint> performanceSparkline;
  final List<DashboardSparklinePoint> requestSparkline;
  final DashboardOverviewSummary summary;
  final List<DashboardTopModel> topModels;
  final List<String> warnings;

  DashboardOverviewResponse({
    required this.announcements,
    required this.chartData,
    this.configurationDomains,
    required this.multimodalSparkline,
    required this.performanceSparkline,
    required this.requestSparkline,
    required this.summary,
    required this.topModels,
    required this.warnings
  });

  factory DashboardOverviewResponse.fromJson(Map<String, dynamic> json) {
    return DashboardOverviewResponse(
      announcements: (() {
        final list = _sdkworkAsList(json['announcements']);
        if (list == null) {
          throw FormatException('DashboardOverviewResponse.announcements is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : DashboardAnnouncement.fromJson(map);
      })())
            .whereType<DashboardAnnouncement>()
            .toList();
      })(),
      chartData: (() {
        final list = _sdkworkAsList(json['chartData']);
        if (list == null) {
          throw FormatException('DashboardOverviewResponse.chartData is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : DashboardChartPoint.fromJson(map);
      })())
            .whereType<DashboardChartPoint>()
            .toList();
      })(),
      configurationDomains: (() {
        final list = _sdkworkAsList(json['configurationDomains']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : DashboardConfigurationDomain.fromJson(map);
      })())
            .whereType<DashboardConfigurationDomain>()
            .toList();
      })(),
      multimodalSparkline: (() {
        final list = _sdkworkAsList(json['multimodalSparkline']);
        if (list == null) {
          throw FormatException('DashboardOverviewResponse.multimodalSparkline is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : DashboardSparklinePoint.fromJson(map);
      })())
            .whereType<DashboardSparklinePoint>()
            .toList();
      })(),
      performanceSparkline: (() {
        final list = _sdkworkAsList(json['performanceSparkline']);
        if (list == null) {
          throw FormatException('DashboardOverviewResponse.performanceSparkline is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : DashboardSparklinePoint.fromJson(map);
      })())
            .whereType<DashboardSparklinePoint>()
            .toList();
      })(),
      requestSparkline: (() {
        final list = _sdkworkAsList(json['requestSparkline']);
        if (list == null) {
          throw FormatException('DashboardOverviewResponse.requestSparkline is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : DashboardSparklinePoint.fromJson(map);
      })())
            .whereType<DashboardSparklinePoint>()
            .toList();
      })(),
      summary: (() {
        final map = _sdkworkAsMap(json['summary']);
        if (map == null) {
          throw FormatException('DashboardOverviewResponse.summary is required');
        }
        return DashboardOverviewSummary.fromJson(map);
      })(),
      topModels: (() {
        final list = _sdkworkAsList(json['topModels']);
        if (list == null) {
          throw FormatException('DashboardOverviewResponse.topModels is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : DashboardTopModel.fromJson(map);
      })())
            .whereType<DashboardTopModel>()
            .toList();
      })(),
      warnings: (() {
        final list = _sdkworkAsList(json['warnings']);
        if (list == null) {
          throw FormatException('DashboardOverviewResponse.warnings is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'announcements': announcements.map((item) => item.toJson()).toList(),
      'chartData': chartData.map((item) => item.toJson()).toList(),
      'configurationDomains': configurationDomains?.map((item) => item.toJson()).toList(),
      'multimodalSparkline': multimodalSparkline.map((item) => item.toJson()).toList(),
      'performanceSparkline': performanceSparkline.map((item) => item.toJson()).toList(),
      'requestSparkline': requestSparkline.map((item) => item.toJson()).toList(),
      'summary': summary.toJson(),
      'topModels': topModels.map((item) => item.toJson()).toList(),
      'warnings': warnings.map((item) => item).toList(),
    };
  }
}

class DashboardOverviewRetrieveResult {
  final String code;
  final DashboardOverviewResponse? data;
  final String? msg;

  DashboardOverviewRetrieveResult({
    required this.code,
    this.data,
    this.msg
  });

  factory DashboardOverviewRetrieveResult.fromJson(Map<String, dynamic> json) {
    return DashboardOverviewRetrieveResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('DashboardOverviewRetrieveResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : DashboardOverviewResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class DashboardOverviewSummary {
  final String audioRequests;
  final double availableCredits;
  final String errorCount;
  final String imageRequests;
  final String musicRequests;
  final String requestCount;
  final double rpm;
  final String totalRequestCount;
  final double totalUsedCredits;
  final double tpm;
  final double usedCredits;
  final String videoRequests;

  DashboardOverviewSummary({
    required this.audioRequests,
    required this.availableCredits,
    required this.errorCount,
    required this.imageRequests,
    required this.musicRequests,
    required this.requestCount,
    required this.rpm,
    required this.totalRequestCount,
    required this.totalUsedCredits,
    required this.tpm,
    required this.usedCredits,
    required this.videoRequests
  });

  factory DashboardOverviewSummary.fromJson(Map<String, dynamic> json) {
    return DashboardOverviewSummary(
      audioRequests: (() {
        final value = json['audioRequests']?.toString();
        if (value == null) {
          throw FormatException('DashboardOverviewSummary.audioRequests is required');
        }
        return value;
      })(),
      availableCredits: (() {
        final value = json['availableCredits'];
        if (value is! num) {
          throw FormatException('DashboardOverviewSummary.availableCredits is required');
        }
        return value.toDouble();
      })(),
      errorCount: (() {
        final value = json['errorCount']?.toString();
        if (value == null) {
          throw FormatException('DashboardOverviewSummary.errorCount is required');
        }
        return value;
      })(),
      imageRequests: (() {
        final value = json['imageRequests']?.toString();
        if (value == null) {
          throw FormatException('DashboardOverviewSummary.imageRequests is required');
        }
        return value;
      })(),
      musicRequests: (() {
        final value = json['musicRequests']?.toString();
        if (value == null) {
          throw FormatException('DashboardOverviewSummary.musicRequests is required');
        }
        return value;
      })(),
      requestCount: (() {
        final value = json['requestCount']?.toString();
        if (value == null) {
          throw FormatException('DashboardOverviewSummary.requestCount is required');
        }
        return value;
      })(),
      rpm: (() {
        final value = json['rpm'];
        if (value is! num) {
          throw FormatException('DashboardOverviewSummary.rpm is required');
        }
        return value.toDouble();
      })(),
      totalRequestCount: (() {
        final value = json['totalRequestCount']?.toString();
        if (value == null) {
          throw FormatException('DashboardOverviewSummary.totalRequestCount is required');
        }
        return value;
      })(),
      totalUsedCredits: (() {
        final value = json['totalUsedCredits'];
        if (value is! num) {
          throw FormatException('DashboardOverviewSummary.totalUsedCredits is required');
        }
        return value.toDouble();
      })(),
      tpm: (() {
        final value = json['tpm'];
        if (value is! num) {
          throw FormatException('DashboardOverviewSummary.tpm is required');
        }
        return value.toDouble();
      })(),
      usedCredits: (() {
        final value = json['usedCredits'];
        if (value is! num) {
          throw FormatException('DashboardOverviewSummary.usedCredits is required');
        }
        return value.toDouble();
      })(),
      videoRequests: (() {
        final value = json['videoRequests']?.toString();
        if (value == null) {
          throw FormatException('DashboardOverviewSummary.videoRequests is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'audioRequests': audioRequests,
      'availableCredits': availableCredits,
      'errorCount': errorCount,
      'imageRequests': imageRequests,
      'musicRequests': musicRequests,
      'requestCount': requestCount,
      'rpm': rpm,
      'totalRequestCount': totalRequestCount,
      'totalUsedCredits': totalUsedCredits,
      'tpm': tpm,
      'usedCredits': usedCredits,
      'videoRequests': videoRequests,
    };
  }
}

class DashboardSparklinePoint {
  final double value;

  DashboardSparklinePoint({
    required this.value
  });

  factory DashboardSparklinePoint.fromJson(Map<String, dynamic> json) {
    return DashboardSparklinePoint(
      value: (() {
        final value = json['value'];
        if (value is! num) {
          throw FormatException('DashboardSparklinePoint.value is required');
        }
        return value.toDouble();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'value': value,
    };
  }
}

class DashboardTopModel {
  final double cost;
  final bool isUp;
  final String modality;
  final String name;
  final String rank;
  final String requests;
  final String supplier;
  final String trend;

  DashboardTopModel({
    required this.cost,
    required this.isUp,
    required this.modality,
    required this.name,
    required this.rank,
    required this.requests,
    required this.supplier,
    required this.trend
  });

  factory DashboardTopModel.fromJson(Map<String, dynamic> json) {
    return DashboardTopModel(
      cost: (() {
        final value = json['cost'];
        if (value is! num) {
          throw FormatException('DashboardTopModel.cost is required');
        }
        return value.toDouble();
      })(),
      isUp: (() {
        final value = json['isUp'];
        if (value is! bool) {
          throw FormatException('DashboardTopModel.isUp is required');
        }
        return value;
      })(),
      modality: (() {
        final value = json['modality']?.toString();
        if (value == null) {
          throw FormatException('DashboardTopModel.modality is required');
        }
        return value;
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('DashboardTopModel.name is required');
        }
        return value;
      })(),
      rank: (() {
        final value = json['rank']?.toString();
        if (value == null) {
          throw FormatException('DashboardTopModel.rank is required');
        }
        return value;
      })(),
      requests: (() {
        final value = json['requests']?.toString();
        if (value == null) {
          throw FormatException('DashboardTopModel.requests is required');
        }
        return value;
      })(),
      supplier: (() {
        final value = json['supplier']?.toString();
        if (value == null) {
          throw FormatException('DashboardTopModel.supplier is required');
        }
        return value;
      })(),
      trend: (() {
        final value = json['trend']?.toString();
        if (value == null) {
          throw FormatException('DashboardTopModel.trend is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cost': cost,
      'isUp': isUp,
      'modality': modality,
      'name': name,
      'rank': rank,
      'requests': requests,
      'supplier': supplier,
      'trend': trend,
    };
  }
}

class DeleteApiKeyResponse {
  final bool deleted;
  final String id;

  DeleteApiKeyResponse({
    required this.deleted,
    required this.id
  });

  factory DeleteApiKeyResponse.fromJson(Map<String, dynamic> json) {
    return DeleteApiKeyResponse(
      deleted: (() {
        final value = json['deleted'];
        if (value is! bool) {
          throw FormatException('DeleteApiKeyResponse.deleted is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('DeleteApiKeyResponse.id is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'deleted': deleted,
      'id': id,
    };
  }
}

class FieldError {
  final String? code;
  final String field;
  final String message;

  FieldError({
    this.code,
    required this.field,
    required this.message
  });

  factory FieldError.fromJson(Map<String, dynamic> json) {
    return FieldError(
      code: json['code']?.toString(),
      field: (() {
        final value = json['field']?.toString();
        if (value == null) {
          throw FormatException('FieldError.field is required');
        }
        return value;
      })(),
      message: (() {
        final value = json['message']?.toString();
        if (value == null) {
          throw FormatException('FieldError.message is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'field': field,
      'message': message,
    };
  }
}

class GatewayTrace {
  final String channel;
  final String duration;
  final String endpoint;
  final String id;
  final String ip;
  final String method;
  final int status;
  final String time;

  GatewayTrace({
    required this.channel,
    required this.duration,
    required this.endpoint,
    required this.id,
    required this.ip,
    required this.method,
    required this.status,
    required this.time
  });

  factory GatewayTrace.fromJson(Map<String, dynamic> json) {
    return GatewayTrace(
      channel: (() {
        final value = json['channel']?.toString();
        if (value == null) {
          throw FormatException('GatewayTrace.channel is required');
        }
        return value;
      })(),
      duration: (() {
        final value = json['duration']?.toString();
        if (value == null) {
          throw FormatException('GatewayTrace.duration is required');
        }
        return value;
      })(),
      endpoint: (() {
        final value = json['endpoint']?.toString();
        if (value == null) {
          throw FormatException('GatewayTrace.endpoint is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('GatewayTrace.id is required');
        }
        return value;
      })(),
      ip: (() {
        final value = json['ip']?.toString();
        if (value == null) {
          throw FormatException('GatewayTrace.ip is required');
        }
        return value;
      })(),
      method: (() {
        final value = json['method']?.toString();
        if (value == null) {
          throw FormatException('GatewayTrace.method is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status'];
        if (value is! int) {
          throw FormatException('GatewayTrace.status is required');
        }
        return value;
      })(),
      time: (() {
        final value = json['time']?.toString();
        if (value == null) {
          throw FormatException('GatewayTrace.time is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'channel': channel,
      'duration': duration,
      'endpoint': endpoint,
      'id': id,
      'ip': ip,
      'method': method,
      'status': status,
      'time': time,
    };
  }
}

class GatewayTracesListResult {
  final String code;
  final GatewayTracesResponse? data;
  final String? msg;

  GatewayTracesListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory GatewayTracesListResult.fromJson(Map<String, dynamic> json) {
    return GatewayTracesListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('GatewayTracesListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : GatewayTracesResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class GatewayTracesResponse {
  final List<GatewayTrace> items;

  GatewayTracesResponse({
    required this.items
  });

  factory GatewayTracesResponse.fromJson(Map<String, dynamic> json) {
    return GatewayTracesResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('GatewayTracesResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : GatewayTrace.fromJson(map);
      })())
            .whereType<GatewayTrace>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
    };
  }
}

class InvocationEventStreamsListResult {
  final String code;
  final RuntimeEventListResponse? data;
  final String? msg;

  InvocationEventStreamsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory InvocationEventStreamsListResult.fromJson(Map<String, dynamic> json) {
    return InvocationEventStreamsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('InvocationEventStreamsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : RuntimeEventListResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class InvocationEventsCreateResult {
  final String code;
  final RuntimeEventResponse? data;
  final String? msg;

  InvocationEventsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory InvocationEventsCreateResult.fromJson(Map<String, dynamic> json) {
    return InvocationEventsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('InvocationEventsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : RuntimeEventResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class InvocationEventsListResult {
  final String code;
  final RuntimeEventListResponse? data;
  final String? msg;

  InvocationEventsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory InvocationEventsListResult.fromJson(Map<String, dynamic> json) {
    return InvocationEventsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('InvocationEventsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : RuntimeEventListResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class InvocationsCreateResult {
  final String code;
  final RuntimeInvocationResponse? data;
  final String? msg;

  InvocationsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory InvocationsCreateResult.fromJson(Map<String, dynamic> json) {
    return InvocationsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('InvocationsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : RuntimeInvocationResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class InvocationsListResult {
  final String code;
  final RuntimeInvocationListResponse? data;
  final String? msg;

  InvocationsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory InvocationsListResult.fromJson(Map<String, dynamic> json) {
    return InvocationsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('InvocationsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : RuntimeInvocationListResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class InvocationsRetrieveResult {
  final String code;
  final RuntimeInvocationItem? data;
  final String? msg;

  InvocationsRetrieveResult({
    required this.code,
    this.data,
    this.msg
  });

  factory InvocationsRetrieveResult.fromJson(Map<String, dynamic> json) {
    return InvocationsRetrieveResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('InvocationsRetrieveResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : RuntimeInvocationItem.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class InvocationsSubmitResult {
  final String code;
  final RuntimeInvocationResponse? data;
  final String? msg;

  InvocationsSubmitResult({
    required this.code,
    this.data,
    this.msg
  });

  factory InvocationsSubmitResult.fromJson(Map<String, dynamic> json) {
    return InvocationsSubmitResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('InvocationsSubmitResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : RuntimeInvocationResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class MediaAccess {
  final String? expiresAt;
  final String visibility;

  MediaAccess({
    this.expiresAt,
    required this.visibility
  });

  factory MediaAccess.fromJson(Map<String, dynamic> json) {
    return MediaAccess(
      expiresAt: json['expiresAt']?.toString(),
      visibility: (() {
        final value = json['visibility']?.toString();
        if (value == null) {
          throw FormatException('MediaAccess.visibility is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'expiresAt': expiresAt,
      'visibility': visibility,
    };
  }
}

class MediaAiProvenance {
  final String? generationTaskId;
  final String? model;
  final String? moderationStatus;
  final String? promptId;
  final String? provenance;
  final String? provider;
  final List<String>? safetyLabels;
  final String? seed;
  final List<String>? sourceMediaIds;

  MediaAiProvenance({
    this.generationTaskId,
    this.model,
    this.moderationStatus,
    this.promptId,
    this.provenance,
    this.provider,
    this.safetyLabels,
    this.seed,
    this.sourceMediaIds
  });

  factory MediaAiProvenance.fromJson(Map<String, dynamic> json) {
    return MediaAiProvenance(
      generationTaskId: json['generationTaskId']?.toString(),
      model: json['model']?.toString(),
      moderationStatus: json['moderationStatus']?.toString(),
      promptId: json['promptId']?.toString(),
      provenance: json['provenance']?.toString(),
      provider: json['provider']?.toString(),
      safetyLabels: (() {
        final list = _sdkworkAsList(json['safetyLabels']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      seed: json['seed']?.toString(),
      sourceMediaIds: (() {
        final list = _sdkworkAsList(json['sourceMediaIds']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'generationTaskId': generationTaskId,
      'model': model,
      'moderationStatus': moderationStatus,
      'promptId': promptId,
      'provenance': provenance,
      'provider': provider,
      'safetyLabels': safetyLabels?.map((item) => item).toList(),
      'seed': seed,
      'sourceMediaIds': sourceMediaIds?.map((item) => item).toList(),
    };
  }
}

class MediaChecksum {
  final String algorithm;
  final String value;

  MediaChecksum({
    required this.algorithm,
    required this.value
  });

  factory MediaChecksum.fromJson(Map<String, dynamic> json) {
    return MediaChecksum(
      algorithm: (() {
        final value = json['algorithm']?.toString();
        if (value == null) {
          throw FormatException('MediaChecksum.algorithm is required');
        }
        return value;
      })(),
      value: (() {
        final value = json['value']?.toString();
        if (value == null) {
          throw FormatException('MediaChecksum.value is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'algorithm': algorithm,
      'value': value,
    };
  }
}

class MediaResource {
  final MediaAccess? access;
  final MediaAiProvenance? ai;
  final String? altText;
  final String? bucketId;
  final MediaChecksum? checksum;
  final double? durationSeconds;
  final String? fileName;
  final int? height;
  final String? id;
  final String kind;
  final Map<String, dynamic>? metadata;
  final String? mimeType;
  final String? objectBlobId;
  final String? objectKey;
  final String? objectVersion;
  final MediaResource? poster;
  final String? publicUrl;
  final String? sizeBytes;
  final String source;
  final List<MediaResource>? thumbnails;
  final String? title;
  final String? uri;
  final String? url;
  final List<MediaResource>? variants;
  final int? width;

  MediaResource({
    this.access,
    this.ai,
    this.altText,
    this.bucketId,
    this.checksum,
    this.durationSeconds,
    this.fileName,
    this.height,
    this.id,
    required this.kind,
    this.metadata,
    this.mimeType,
    this.objectBlobId,
    this.objectKey,
    this.objectVersion,
    this.poster,
    this.publicUrl,
    this.sizeBytes,
    required this.source,
    this.thumbnails,
    this.title,
    this.uri,
    this.url,
    this.variants,
    this.width
  });

  factory MediaResource.fromJson(Map<String, dynamic> json) {
    return MediaResource(
      access: (() {
        final map = _sdkworkAsMap(json['access']);
        return map == null ? null : MediaAccess.fromJson(map);
      })(),
      ai: (() {
        final map = _sdkworkAsMap(json['ai']);
        return map == null ? null : MediaAiProvenance.fromJson(map);
      })(),
      altText: json['altText']?.toString(),
      bucketId: json['bucketId']?.toString(),
      checksum: (() {
        final map = _sdkworkAsMap(json['checksum']);
        return map == null ? null : MediaChecksum.fromJson(map);
      })(),
      durationSeconds: json['durationSeconds'] is num ? json['durationSeconds'].toDouble() : null,
      fileName: json['fileName']?.toString(),
      height: json['height'] is int ? json['height'] : null,
      id: json['id']?.toString(),
      kind: (() {
        final value = json['kind']?.toString();
        if (value == null) {
          throw FormatException('MediaResource.kind is required');
        }
        return value;
      })(),
      metadata: (() {
        final map = _sdkworkAsMap(json['metadata']);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      mimeType: json['mimeType']?.toString(),
      objectBlobId: json['objectBlobId']?.toString(),
      objectKey: json['objectKey']?.toString(),
      objectVersion: json['objectVersion']?.toString(),
      poster: (() {
        final map = _sdkworkAsMap(json['poster']);
        return map == null ? null : MediaResource.fromJson(map);
      })(),
      publicUrl: json['publicUrl']?.toString(),
      sizeBytes: json['sizeBytes']?.toString(),
      source: (() {
        final value = json['source']?.toString();
        if (value == null) {
          throw FormatException('MediaResource.source is required');
        }
        return value;
      })(),
      thumbnails: (() {
        final list = _sdkworkAsList(json['thumbnails']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : MediaResource.fromJson(map);
      })())
            .whereType<MediaResource>()
            .toList();
      })(),
      title: json['title']?.toString(),
      uri: json['uri']?.toString(),
      url: json['url']?.toString(),
      variants: (() {
        final list = _sdkworkAsList(json['variants']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : MediaResource.fromJson(map);
      })())
            .whereType<MediaResource>()
            .toList();
      })(),
      width: json['width'] is int ? json['width'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'access': access?.toJson(),
      'ai': ai?.toJson(),
      'altText': altText,
      'bucketId': bucketId,
      'checksum': checksum?.toJson(),
      'durationSeconds': durationSeconds,
      'fileName': fileName,
      'height': height,
      'id': id,
      'kind': kind,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'mimeType': mimeType,
      'objectBlobId': objectBlobId,
      'objectKey': objectKey,
      'objectVersion': objectVersion,
      'poster': poster?.toJson(),
      'publicUrl': publicUrl,
      'sizeBytes': sizeBytes,
      'source': source,
      'thumbnails': thumbnails?.map((item) => item.toJson()).toList(),
      'title': title,
      'uri': uri,
      'url': url,
      'variants': variants?.map((item) => item.toJson()).toList(),
      'width': width,
    };
  }
}

class ModelRankingHistoryEntry {
  final String catalogKey;
  final String color;
  final String model;
  final String rank;
  final String volume;

  ModelRankingHistoryEntry({
    required this.catalogKey,
    required this.color,
    required this.model,
    required this.rank,
    required this.volume
  });

  factory ModelRankingHistoryEntry.fromJson(Map<String, dynamic> json) {
    return ModelRankingHistoryEntry(
      catalogKey: (() {
        final value = json['catalogKey']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingHistoryEntry.catalogKey is required');
        }
        return value;
      })(),
      color: (() {
        final value = json['color']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingHistoryEntry.color is required');
        }
        return value;
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingHistoryEntry.model is required');
        }
        return value;
      })(),
      rank: (() {
        final value = json['rank']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingHistoryEntry.rank is required');
        }
        return value;
      })(),
      volume: (() {
        final value = json['volume']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingHistoryEntry.volume is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'catalogKey': catalogKey,
      'color': color,
      'model': model,
      'rank': rank,
      'volume': volume,
    };
  }
}

class ModelRankingHistoryPoint {
  final String date;
  final List<ModelRankingHistoryEntry> entries;
  final String index;

  ModelRankingHistoryPoint({
    required this.date,
    required this.entries,
    required this.index
  });

  factory ModelRankingHistoryPoint.fromJson(Map<String, dynamic> json) {
    return ModelRankingHistoryPoint(
      date: (() {
        final value = json['date']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingHistoryPoint.date is required');
        }
        return value;
      })(),
      entries: (() {
        final list = _sdkworkAsList(json['entries']);
        if (list == null) {
          throw FormatException('ModelRankingHistoryPoint.entries is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ModelRankingHistoryEntry.fromJson(map);
      })())
            .whereType<ModelRankingHistoryEntry>()
            .toList();
      })(),
      index: (() {
        final value = json['index']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingHistoryPoint.index is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'date': date,
      'entries': entries.map((item) => item.toJson()).toList(),
      'index': index,
    };
  }
}

class ModelRankingItem {
  final String baseVolume;
  final String color;
  final String? contextSize;
  final double cost;
  final String costIndicator;
  final String currency;
  final String id;
  final bool isNew;
  final String latency;
  final String? license;
  final String modality;
  final String name;
  final String prevRank;
  final String? pricing;
  final String rank;
  final String requests;
  final List<String> strengths;
  final String tokens;
  final double? trendScore;
  final String vendor;
  final String vendorCode;
  final double? winRate;

  ModelRankingItem({
    required this.baseVolume,
    required this.color,
    this.contextSize,
    required this.cost,
    required this.costIndicator,
    required this.currency,
    required this.id,
    required this.isNew,
    required this.latency,
    this.license,
    required this.modality,
    required this.name,
    required this.prevRank,
    this.pricing,
    required this.rank,
    required this.requests,
    required this.strengths,
    required this.tokens,
    this.trendScore,
    required this.vendor,
    required this.vendorCode,
    this.winRate
  });

  factory ModelRankingItem.fromJson(Map<String, dynamic> json) {
    return ModelRankingItem(
      baseVolume: (() {
        final value = json['baseVolume']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingItem.baseVolume is required');
        }
        return value;
      })(),
      color: (() {
        final value = json['color']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingItem.color is required');
        }
        return value;
      })(),
      contextSize: json['contextSize']?.toString(),
      cost: (() {
        final value = json['cost'];
        if (value is! num) {
          throw FormatException('ModelRankingItem.cost is required');
        }
        return value.toDouble();
      })(),
      costIndicator: (() {
        final value = json['costIndicator']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingItem.costIndicator is required');
        }
        return value;
      })(),
      currency: (() {
        final value = json['currency']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingItem.currency is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingItem.id is required');
        }
        return value;
      })(),
      isNew: (() {
        final value = json['isNew'];
        if (value is! bool) {
          throw FormatException('ModelRankingItem.isNew is required');
        }
        return value;
      })(),
      latency: (() {
        final value = json['latency']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingItem.latency is required');
        }
        return value;
      })(),
      license: json['license']?.toString(),
      modality: (() {
        final value = json['modality']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingItem.modality is required');
        }
        return value;
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingItem.name is required');
        }
        return value;
      })(),
      prevRank: (() {
        final value = json['prevRank']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingItem.prevRank is required');
        }
        return value;
      })(),
      pricing: json['pricing']?.toString(),
      rank: (() {
        final value = json['rank']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingItem.rank is required');
        }
        return value;
      })(),
      requests: (() {
        final value = json['requests']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingItem.requests is required');
        }
        return value;
      })(),
      strengths: (() {
        final list = _sdkworkAsList(json['strengths']);
        if (list == null) {
          throw FormatException('ModelRankingItem.strengths is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      tokens: (() {
        final value = json['tokens']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingItem.tokens is required');
        }
        return value;
      })(),
      trendScore: json['trendScore'] is num ? json['trendScore'].toDouble() : null,
      vendor: (() {
        final value = json['vendor']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingItem.vendor is required');
        }
        return value;
      })(),
      vendorCode: (() {
        final value = json['vendorCode']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingItem.vendorCode is required');
        }
        return value;
      })(),
      winRate: json['winRate'] is num ? json['winRate'].toDouble() : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'baseVolume': baseVolume,
      'color': color,
      'contextSize': contextSize,
      'cost': cost,
      'costIndicator': costIndicator,
      'currency': currency,
      'id': id,
      'isNew': isNew,
      'latency': latency,
      'license': license,
      'modality': modality,
      'name': name,
      'prevRank': prevRank,
      'pricing': pricing,
      'rank': rank,
      'requests': requests,
      'strengths': strengths.map((item) => item).toList(),
      'tokens': tokens,
      'trendScore': trendScore,
      'vendor': vendor,
      'vendorCode': vendorCode,
      'winRate': winRate,
    };
  }
}

class ModelRankingsListResult {
  final String code;
  final ModelRankingsSnapshot? data;
  final String? msg;

  ModelRankingsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ModelRankingsListResult.fromJson(Map<String, dynamic> json) {
    return ModelRankingsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ModelRankingsSnapshot.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class ModelRankingsSnapshot {
  final List<ModelRankingHistoryPoint> history;
  final List<ModelRankingItem> items;
  final ModelRankingsSource source;

  ModelRankingsSnapshot({
    required this.history,
    required this.items,
    required this.source
  });

  factory ModelRankingsSnapshot.fromJson(Map<String, dynamic> json) {
    return ModelRankingsSnapshot(
      history: (() {
        final list = _sdkworkAsList(json['history']);
        if (list == null) {
          throw FormatException('ModelRankingsSnapshot.history is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ModelRankingHistoryPoint.fromJson(map);
      })())
            .whereType<ModelRankingHistoryPoint>()
            .toList();
      })(),
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('ModelRankingsSnapshot.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ModelRankingItem.fromJson(map);
      })())
            .whereType<ModelRankingItem>()
            .toList();
      })(),
      source: (() {
        final map = _sdkworkAsMap(json['source']);
        if (map == null) {
          throw FormatException('ModelRankingsSnapshot.source is required');
        }
        return ModelRankingsSource.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'history': history.map((item) => item.toJson()).toList(),
      'items': items.map((item) => item.toJson()).toList(),
      'source': source.toJson(),
    };
  }
}

class ModelRankingsSource {
  final String cacheMaxAgeSeconds;
  final String generatedAt;
  final String nextRefreshAt;
  final String observedAt;
  final String rankScope;
  final String refreshIntervalSeconds;
  final String snapshotDate;
  final String snapshotPeriod;
  final String sourceDescription;
  final String sourceLabel;
  final List<String> sourceTables;
  final String windowEnd;
  final String windowStart;

  ModelRankingsSource({
    required this.cacheMaxAgeSeconds,
    required this.generatedAt,
    required this.nextRefreshAt,
    required this.observedAt,
    required this.rankScope,
    required this.refreshIntervalSeconds,
    required this.snapshotDate,
    required this.snapshotPeriod,
    required this.sourceDescription,
    required this.sourceLabel,
    required this.sourceTables,
    required this.windowEnd,
    required this.windowStart
  });

  factory ModelRankingsSource.fromJson(Map<String, dynamic> json) {
    return ModelRankingsSource(
      cacheMaxAgeSeconds: (() {
        final value = json['cacheMaxAgeSeconds']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingsSource.cacheMaxAgeSeconds is required');
        }
        return value;
      })(),
      generatedAt: (() {
        final value = json['generatedAt']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingsSource.generatedAt is required');
        }
        return value;
      })(),
      nextRefreshAt: (() {
        final value = json['nextRefreshAt']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingsSource.nextRefreshAt is required');
        }
        return value;
      })(),
      observedAt: (() {
        final value = json['observedAt']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingsSource.observedAt is required');
        }
        return value;
      })(),
      rankScope: (() {
        final value = json['rankScope']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingsSource.rankScope is required');
        }
        return value;
      })(),
      refreshIntervalSeconds: (() {
        final value = json['refreshIntervalSeconds']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingsSource.refreshIntervalSeconds is required');
        }
        return value;
      })(),
      snapshotDate: (() {
        final value = json['snapshotDate']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingsSource.snapshotDate is required');
        }
        return value;
      })(),
      snapshotPeriod: (() {
        final value = json['snapshotPeriod']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingsSource.snapshotPeriod is required');
        }
        return value;
      })(),
      sourceDescription: (() {
        final value = json['sourceDescription']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingsSource.sourceDescription is required');
        }
        return value;
      })(),
      sourceLabel: (() {
        final value = json['sourceLabel']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingsSource.sourceLabel is required');
        }
        return value;
      })(),
      sourceTables: (() {
        final list = _sdkworkAsList(json['sourceTables']);
        if (list == null) {
          throw FormatException('ModelRankingsSource.sourceTables is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      windowEnd: (() {
        final value = json['windowEnd']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingsSource.windowEnd is required');
        }
        return value;
      })(),
      windowStart: (() {
        final value = json['windowStart']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingsSource.windowStart is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cacheMaxAgeSeconds': cacheMaxAgeSeconds,
      'generatedAt': generatedAt,
      'nextRefreshAt': nextRefreshAt,
      'observedAt': observedAt,
      'rankScope': rankScope,
      'refreshIntervalSeconds': refreshIntervalSeconds,
      'snapshotDate': snapshotDate,
      'snapshotPeriod': snapshotPeriod,
      'sourceDescription': sourceDescription,
      'sourceLabel': sourceLabel,
      'sourceTables': sourceTables.map((item) => item).toList(),
      'windowEnd': windowEnd,
      'windowStart': windowStart,
    };
  }
}

class ModelVendorsListResult {
  final String code;
  final RankingVendorOptionsResponse? data;
  final String? msg;

  ModelVendorsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ModelVendorsListResult.fromJson(Map<String, dynamic> json) {
    return ModelVendorsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ModelVendorsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : RankingVendorOptionsResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class ModelsListResult {
  final String code;
  final NoData? data;
  final String? msg;

  ModelsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ModelsListResult.fromJson(Map<String, dynamic> json) {
    return ModelsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ModelsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : NoData.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class NoData {


  NoData();

  factory NoData.fromJson(Map<String, dynamic> json) {
    return NoData();
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{};
  }
}

class NotificationItem {
  final String? actionUrl;
  final String appId;
  final bool archived;
  final String content;
  final String desc;
  final String id;
  final bool popupSeen;
  final bool read;
  final bool showAsPopup;
  final String time;
  final String title;
  final String type;

  NotificationItem({
    this.actionUrl,
    required this.appId,
    required this.archived,
    required this.content,
    required this.desc,
    required this.id,
    required this.popupSeen,
    required this.read,
    required this.showAsPopup,
    required this.time,
    required this.title,
    required this.type
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      actionUrl: json['actionUrl']?.toString(),
      appId: (() {
        final value = json['appId']?.toString();
        if (value == null) {
          throw FormatException('NotificationItem.appId is required');
        }
        return value;
      })(),
      archived: (() {
        final value = json['archived'];
        if (value is! bool) {
          throw FormatException('NotificationItem.archived is required');
        }
        return value;
      })(),
      content: (() {
        final value = json['content']?.toString();
        if (value == null) {
          throw FormatException('NotificationItem.content is required');
        }
        return value;
      })(),
      desc: (() {
        final value = json['desc']?.toString();
        if (value == null) {
          throw FormatException('NotificationItem.desc is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('NotificationItem.id is required');
        }
        return value;
      })(),
      popupSeen: (() {
        final value = json['popupSeen'];
        if (value is! bool) {
          throw FormatException('NotificationItem.popupSeen is required');
        }
        return value;
      })(),
      read: (() {
        final value = json['read'];
        if (value is! bool) {
          throw FormatException('NotificationItem.read is required');
        }
        return value;
      })(),
      showAsPopup: (() {
        final value = json['showAsPopup'];
        if (value is! bool) {
          throw FormatException('NotificationItem.showAsPopup is required');
        }
        return value;
      })(),
      time: (() {
        final value = json['time']?.toString();
        if (value == null) {
          throw FormatException('NotificationItem.time is required');
        }
        return value;
      })(),
      title: (() {
        final value = json['title']?.toString();
        if (value == null) {
          throw FormatException('NotificationItem.title is required');
        }
        return value;
      })(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('NotificationItem.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'actionUrl': actionUrl,
      'appId': appId,
      'archived': archived,
      'content': content,
      'desc': desc,
      'id': id,
      'popupSeen': popupSeen,
      'read': read,
      'showAsPopup': showAsPopup,
      'time': time,
      'title': title,
      'type': type,
    };
  }
}

class NotificationListResponse {
  final List<NotificationItem> items;

  NotificationListResponse({
    required this.items
  });

  factory NotificationListResponse.fromJson(Map<String, dynamic> json) {
    return NotificationListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('NotificationListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : NotificationItem.fromJson(map);
      })())
            .whereType<NotificationItem>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
    };
  }
}

class NotificationMutationResponse {
  final String state;
  final bool updated;

  NotificationMutationResponse({
    required this.state,
    required this.updated
  });

  factory NotificationMutationResponse.fromJson(Map<String, dynamic> json) {
    return NotificationMutationResponse(
      state: (() {
        final value = json['state']?.toString();
        if (value == null) {
          throw FormatException('NotificationMutationResponse.state is required');
        }
        return value;
      })(),
      updated: (() {
        final value = json['updated'];
        if (value is! bool) {
          throw FormatException('NotificationMutationResponse.updated is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'state': state,
      'updated': updated,
    };
  }
}

class NotificationsAcknowledgeCreateResult {
  final String code;
  final NotificationMutationResponse? data;
  final String? msg;

  NotificationsAcknowledgeCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory NotificationsAcknowledgeCreateResult.fromJson(Map<String, dynamic> json) {
    return NotificationsAcknowledgeCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('NotificationsAcknowledgeCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : NotificationMutationResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class NotificationsListResult {
  final String code;
  final NotificationListResponse? data;
  final String? msg;

  NotificationsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory NotificationsListResult.fromJson(Map<String, dynamic> json) {
    return NotificationsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('NotificationsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : NotificationListResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class NotificationsPopupSeenCreateResult {
  final String code;
  final NotificationMutationResponse? data;
  final String? msg;

  NotificationsPopupSeenCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory NotificationsPopupSeenCreateResult.fromJson(Map<String, dynamic> json) {
    return NotificationsPopupSeenCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('NotificationsPopupSeenCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : NotificationMutationResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class ProblemDetail {
  final String? code;
  final String? detail;
  final List<FieldError>? errors;
  final String? instance;
  final String? requestId;
  final int status;
  final String title;
  final String? traceId;
  final String type;

  ProblemDetail({
    this.code,
    this.detail,
    this.errors,
    this.instance,
    this.requestId,
    required this.status,
    required this.title,
    this.traceId,
    required this.type
  });

  factory ProblemDetail.fromJson(Map<String, dynamic> json) {
    return ProblemDetail(
      code: json['code']?.toString(),
      detail: json['detail']?.toString(),
      errors: (() {
        final list = _sdkworkAsList(json['errors']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : FieldError.fromJson(map);
      })())
            .whereType<FieldError>()
            .toList();
      })(),
      instance: json['instance']?.toString(),
      requestId: json['requestId']?.toString(),
      status: (() {
        final value = json['status'];
        if (value is! int) {
          throw FormatException('ProblemDetail.status is required');
        }
        return value;
      })(),
      title: (() {
        final value = json['title']?.toString();
        if (value == null) {
          throw FormatException('ProblemDetail.title is required');
        }
        return value;
      })(),
      traceId: json['traceId']?.toString(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('ProblemDetail.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'detail': detail,
      'errors': errors?.map((item) => item.toJson()).toList(),
      'instance': instance,
      'requestId': requestId,
      'status': status,
      'title': title,
      'traceId': traceId,
      'type': type,
    };
  }
}

class RankingVendorOption {
  final String code;
  final String label;
  final String modelCount;

  RankingVendorOption({
    required this.code,
    required this.label,
    required this.modelCount
  });

  factory RankingVendorOption.fromJson(Map<String, dynamic> json) {
    return RankingVendorOption(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('RankingVendorOption.code is required');
        }
        return value;
      })(),
      label: (() {
        final value = json['label']?.toString();
        if (value == null) {
          throw FormatException('RankingVendorOption.label is required');
        }
        return value;
      })(),
      modelCount: (() {
        final value = json['modelCount']?.toString();
        if (value == null) {
          throw FormatException('RankingVendorOption.modelCount is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'label': label,
      'modelCount': modelCount,
    };
  }
}

class RankingVendorOptionsResponse {
  final List<RankingVendorOption> items;

  RankingVendorOptionsResponse({
    required this.items
  });

  factory RankingVendorOptionsResponse.fromJson(Map<String, dynamic> json) {
    return RankingVendorOptionsResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('RankingVendorOptionsResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : RankingVendorOption.fromJson(map);
      })())
            .whereType<RankingVendorOption>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
    };
  }
}

class RoutingApiKeyItem {
  final String? copyableKey;
  final String createdAt;
  final String displayKey;
  final String id;
  final String name;
  final String status;
  final String totalUsage;

  RoutingApiKeyItem({
    this.copyableKey,
    required this.createdAt,
    required this.displayKey,
    required this.id,
    required this.name,
    required this.status,
    required this.totalUsage
  });

  factory RoutingApiKeyItem.fromJson(Map<String, dynamic> json) {
    return RoutingApiKeyItem(
      copyableKey: json['copyableKey']?.toString(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('RoutingApiKeyItem.createdAt is required');
        }
        return value;
      })(),
      displayKey: (() {
        final value = json['displayKey']?.toString();
        if (value == null) {
          throw FormatException('RoutingApiKeyItem.displayKey is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('RoutingApiKeyItem.id is required');
        }
        return value;
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('RoutingApiKeyItem.name is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('RoutingApiKeyItem.status is required');
        }
        return value;
      })(),
      totalUsage: (() {
        final value = json['totalUsage']?.toString();
        if (value == null) {
          throw FormatException('RoutingApiKeyItem.totalUsage is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'copyableKey': copyableKey,
      'createdAt': createdAt,
      'displayKey': displayKey,
      'id': id,
      'name': name,
      'status': status,
      'totalUsage': totalUsage,
    };
  }
}

class RoutingApiKeysListResult {
  final String code;
  final RoutingApiKeysResponse? data;
  final String? msg;

  RoutingApiKeysListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory RoutingApiKeysListResult.fromJson(Map<String, dynamic> json) {
    return RoutingApiKeysListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('RoutingApiKeysListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : RoutingApiKeysResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class RoutingApiKeysResponse {
  final List<RoutingApiKeyItem> items;

  RoutingApiKeysResponse({
    required this.items
  });

  factory RoutingApiKeysResponse.fromJson(Map<String, dynamic> json) {
    return RoutingApiKeysResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('RoutingApiKeysResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : RoutingApiKeyItem.fromJson(map);
      })())
            .whereType<RoutingApiKeyItem>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
    };
  }
}

class RoutingChannelItem {
  final String accessType;
  final String apiKey;
  final String balance;
  final String baseUrl;
  final List<String> capabilities;
  final RoutingCircuitBreakerPolicy? circuitBreakerPolicy;
  final String errors;
  final String id;
  final bool isMultimodal;
  final String latency;
  final List<String> models;
  final String name;
  final String protocol;
  final String provider;
  final String providerCode;
  final RoutingRetryPolicy? retryPolicy;
  final String rpm;
  final String status;
  final String? timeoutMs;
  final String vendor;
  final String weight;

  RoutingChannelItem({
    required this.accessType,
    required this.apiKey,
    required this.balance,
    required this.baseUrl,
    required this.capabilities,
    this.circuitBreakerPolicy,
    required this.errors,
    required this.id,
    required this.isMultimodal,
    required this.latency,
    required this.models,
    required this.name,
    required this.protocol,
    required this.provider,
    required this.providerCode,
    this.retryPolicy,
    required this.rpm,
    required this.status,
    this.timeoutMs,
    required this.vendor,
    required this.weight
  });

  factory RoutingChannelItem.fromJson(Map<String, dynamic> json) {
    return RoutingChannelItem(
      accessType: (() {
        final value = json['accessType']?.toString();
        if (value == null) {
          throw FormatException('RoutingChannelItem.accessType is required');
        }
        return value;
      })(),
      apiKey: (() {
        final value = json['apiKey']?.toString();
        if (value == null) {
          throw FormatException('RoutingChannelItem.apiKey is required');
        }
        return value;
      })(),
      balance: (() {
        final value = json['balance']?.toString();
        if (value == null) {
          throw FormatException('RoutingChannelItem.balance is required');
        }
        return value;
      })(),
      baseUrl: (() {
        final value = json['baseUrl']?.toString();
        if (value == null) {
          throw FormatException('RoutingChannelItem.baseUrl is required');
        }
        return value;
      })(),
      capabilities: (() {
        final list = _sdkworkAsList(json['capabilities']);
        if (list == null) {
          throw FormatException('RoutingChannelItem.capabilities is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      circuitBreakerPolicy: (() {
        final map = _sdkworkAsMap(json['circuitBreakerPolicy']);
        return map == null ? null : RoutingCircuitBreakerPolicy.fromJson(map);
      })(),
      errors: (() {
        final value = json['errors']?.toString();
        if (value == null) {
          throw FormatException('RoutingChannelItem.errors is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('RoutingChannelItem.id is required');
        }
        return value;
      })(),
      isMultimodal: (() {
        final value = json['isMultimodal'];
        if (value is! bool) {
          throw FormatException('RoutingChannelItem.isMultimodal is required');
        }
        return value;
      })(),
      latency: (() {
        final value = json['latency']?.toString();
        if (value == null) {
          throw FormatException('RoutingChannelItem.latency is required');
        }
        return value;
      })(),
      models: (() {
        final list = _sdkworkAsList(json['models']);
        if (list == null) {
          throw FormatException('RoutingChannelItem.models is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('RoutingChannelItem.name is required');
        }
        return value;
      })(),
      protocol: (() {
        final value = json['protocol']?.toString();
        if (value == null) {
          throw FormatException('RoutingChannelItem.protocol is required');
        }
        return value;
      })(),
      provider: (() {
        final value = json['provider']?.toString();
        if (value == null) {
          throw FormatException('RoutingChannelItem.provider is required');
        }
        return value;
      })(),
      providerCode: (() {
        final value = json['providerCode']?.toString();
        if (value == null) {
          throw FormatException('RoutingChannelItem.providerCode is required');
        }
        return value;
      })(),
      retryPolicy: (() {
        final map = _sdkworkAsMap(json['retryPolicy']);
        return map == null ? null : RoutingRetryPolicy.fromJson(map);
      })(),
      rpm: (() {
        final value = json['rpm']?.toString();
        if (value == null) {
          throw FormatException('RoutingChannelItem.rpm is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('RoutingChannelItem.status is required');
        }
        return value;
      })(),
      timeoutMs: json['timeoutMs']?.toString(),
      vendor: (() {
        final value = json['vendor']?.toString();
        if (value == null) {
          throw FormatException('RoutingChannelItem.vendor is required');
        }
        return value;
      })(),
      weight: (() {
        final value = json['weight']?.toString();
        if (value == null) {
          throw FormatException('RoutingChannelItem.weight is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'accessType': accessType,
      'apiKey': apiKey,
      'balance': balance,
      'baseUrl': baseUrl,
      'capabilities': capabilities.map((item) => item).toList(),
      'circuitBreakerPolicy': circuitBreakerPolicy?.toJson(),
      'errors': errors,
      'id': id,
      'isMultimodal': isMultimodal,
      'latency': latency,
      'models': models.map((item) => item).toList(),
      'name': name,
      'protocol': protocol,
      'provider': provider,
      'providerCode': providerCode,
      'retryPolicy': retryPolicy?.toJson(),
      'rpm': rpm,
      'status': status,
      'timeoutMs': timeoutMs,
      'vendor': vendor,
      'weight': weight,
    };
  }
}

class RoutingChannelsListResult {
  final String code;
  final RoutingChannelsResponse? data;
  final String? msg;

  RoutingChannelsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory RoutingChannelsListResult.fromJson(Map<String, dynamic> json) {
    return RoutingChannelsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('RoutingChannelsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : RoutingChannelsResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class RoutingChannelsResponse {
  final List<RoutingChannelItem> items;

  RoutingChannelsResponse({
    required this.items
  });

  factory RoutingChannelsResponse.fromJson(Map<String, dynamic> json) {
    return RoutingChannelsResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('RoutingChannelsResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : RoutingChannelItem.fromJson(map);
      })())
            .whereType<RoutingChannelItem>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
    };
  }
}

class RoutingCircuitBreakerPolicy {
  final String failureThreshold;

  RoutingCircuitBreakerPolicy({
    required this.failureThreshold
  });

  factory RoutingCircuitBreakerPolicy.fromJson(Map<String, dynamic> json) {
    return RoutingCircuitBreakerPolicy(
      failureThreshold: (() {
        final value = json['failureThreshold']?.toString();
        if (value == null) {
          throw FormatException('RoutingCircuitBreakerPolicy.failureThreshold is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'failureThreshold': failureThreshold,
    };
  }
}

class RoutingModelStats {
  final String lat;
  final String m;
  final String req;
  final String sr;
  final String tok;

  RoutingModelStats({
    required this.lat,
    required this.m,
    required this.req,
    required this.sr,
    required this.tok
  });

  factory RoutingModelStats.fromJson(Map<String, dynamic> json) {
    return RoutingModelStats(
      lat: (() {
        final value = json['lat']?.toString();
        if (value == null) {
          throw FormatException('RoutingModelStats.lat is required');
        }
        return value;
      })(),
      m: (() {
        final value = json['m']?.toString();
        if (value == null) {
          throw FormatException('RoutingModelStats.m is required');
        }
        return value;
      })(),
      req: (() {
        final value = json['req']?.toString();
        if (value == null) {
          throw FormatException('RoutingModelStats.req is required');
        }
        return value;
      })(),
      sr: (() {
        final value = json['sr']?.toString();
        if (value == null) {
          throw FormatException('RoutingModelStats.sr is required');
        }
        return value;
      })(),
      tok: (() {
        final value = json['tok']?.toString();
        if (value == null) {
          throw FormatException('RoutingModelStats.tok is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'lat': lat,
      'm': m,
      'req': req,
      'sr': sr,
      'tok': tok,
    };
  }
}

class RoutingRequestTraceItem {
  final String channel;
  final String duration;
  final String endedAt;
  final String errorMessageMasked;
  final String errorType;
  final String httpMethod;
  final String id;
  final String model;
  final String providerErrorCode;
  final String requestBytes;
  final String requestId;
  final String requestPath;
  final String requestPayloadHash;
  final String responseBytes;
  final String responsePayloadHash;
  final String startedAt;
  final String status;
  final bool streaming;
  final String time;
  final String tokens;
  final String traceId;

  RoutingRequestTraceItem({
    required this.channel,
    required this.duration,
    required this.endedAt,
    required this.errorMessageMasked,
    required this.errorType,
    required this.httpMethod,
    required this.id,
    required this.model,
    required this.providerErrorCode,
    required this.requestBytes,
    required this.requestId,
    required this.requestPath,
    required this.requestPayloadHash,
    required this.responseBytes,
    required this.responsePayloadHash,
    required this.startedAt,
    required this.status,
    required this.streaming,
    required this.time,
    required this.tokens,
    required this.traceId
  });

  factory RoutingRequestTraceItem.fromJson(Map<String, dynamic> json) {
    return RoutingRequestTraceItem(
      channel: (() {
        final value = json['channel']?.toString();
        if (value == null) {
          throw FormatException('RoutingRequestTraceItem.channel is required');
        }
        return value;
      })(),
      duration: (() {
        final value = json['duration']?.toString();
        if (value == null) {
          throw FormatException('RoutingRequestTraceItem.duration is required');
        }
        return value;
      })(),
      endedAt: (() {
        final value = json['endedAt']?.toString();
        if (value == null) {
          throw FormatException('RoutingRequestTraceItem.endedAt is required');
        }
        return value;
      })(),
      errorMessageMasked: (() {
        final value = json['errorMessageMasked']?.toString();
        if (value == null) {
          throw FormatException('RoutingRequestTraceItem.errorMessageMasked is required');
        }
        return value;
      })(),
      errorType: (() {
        final value = json['errorType']?.toString();
        if (value == null) {
          throw FormatException('RoutingRequestTraceItem.errorType is required');
        }
        return value;
      })(),
      httpMethod: (() {
        final value = json['httpMethod']?.toString();
        if (value == null) {
          throw FormatException('RoutingRequestTraceItem.httpMethod is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('RoutingRequestTraceItem.id is required');
        }
        return value;
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('RoutingRequestTraceItem.model is required');
        }
        return value;
      })(),
      providerErrorCode: (() {
        final value = json['providerErrorCode']?.toString();
        if (value == null) {
          throw FormatException('RoutingRequestTraceItem.providerErrorCode is required');
        }
        return value;
      })(),
      requestBytes: (() {
        final value = json['requestBytes']?.toString();
        if (value == null) {
          throw FormatException('RoutingRequestTraceItem.requestBytes is required');
        }
        return value;
      })(),
      requestId: (() {
        final value = json['requestId']?.toString();
        if (value == null) {
          throw FormatException('RoutingRequestTraceItem.requestId is required');
        }
        return value;
      })(),
      requestPath: (() {
        final value = json['requestPath']?.toString();
        if (value == null) {
          throw FormatException('RoutingRequestTraceItem.requestPath is required');
        }
        return value;
      })(),
      requestPayloadHash: (() {
        final value = json['requestPayloadHash']?.toString();
        if (value == null) {
          throw FormatException('RoutingRequestTraceItem.requestPayloadHash is required');
        }
        return value;
      })(),
      responseBytes: (() {
        final value = json['responseBytes']?.toString();
        if (value == null) {
          throw FormatException('RoutingRequestTraceItem.responseBytes is required');
        }
        return value;
      })(),
      responsePayloadHash: (() {
        final value = json['responsePayloadHash']?.toString();
        if (value == null) {
          throw FormatException('RoutingRequestTraceItem.responsePayloadHash is required');
        }
        return value;
      })(),
      startedAt: (() {
        final value = json['startedAt']?.toString();
        if (value == null) {
          throw FormatException('RoutingRequestTraceItem.startedAt is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('RoutingRequestTraceItem.status is required');
        }
        return value;
      })(),
      streaming: (() {
        final value = json['streaming'];
        if (value is! bool) {
          throw FormatException('RoutingRequestTraceItem.streaming is required');
        }
        return value;
      })(),
      time: (() {
        final value = json['time']?.toString();
        if (value == null) {
          throw FormatException('RoutingRequestTraceItem.time is required');
        }
        return value;
      })(),
      tokens: (() {
        final value = json['tokens']?.toString();
        if (value == null) {
          throw FormatException('RoutingRequestTraceItem.tokens is required');
        }
        return value;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('RoutingRequestTraceItem.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'channel': channel,
      'duration': duration,
      'endedAt': endedAt,
      'errorMessageMasked': errorMessageMasked,
      'errorType': errorType,
      'httpMethod': httpMethod,
      'id': id,
      'model': model,
      'providerErrorCode': providerErrorCode,
      'requestBytes': requestBytes,
      'requestId': requestId,
      'requestPath': requestPath,
      'requestPayloadHash': requestPayloadHash,
      'responseBytes': responseBytes,
      'responsePayloadHash': responsePayloadHash,
      'startedAt': startedAt,
      'status': status,
      'streaming': streaming,
      'time': time,
      'tokens': tokens,
      'traceId': traceId,
    };
  }
}

class RoutingRequestTracesListResult {
  final String code;
  final RoutingRequestTracesResponse? data;
  final String? msg;

  RoutingRequestTracesListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory RoutingRequestTracesListResult.fromJson(Map<String, dynamic> json) {
    return RoutingRequestTracesListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('RoutingRequestTracesListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : RoutingRequestTracesResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class RoutingRequestTracesResponse {
  final List<RoutingRequestTraceItem> items;

  RoutingRequestTracesResponse({
    required this.items
  });

  factory RoutingRequestTracesResponse.fromJson(Map<String, dynamic> json) {
    return RoutingRequestTracesResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('RoutingRequestTracesResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : RoutingRequestTraceItem.fromJson(map);
      })())
            .whereType<RoutingRequestTraceItem>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
    };
  }
}

class RoutingRetryPolicy {
  final String backoffMs;
  final String maxAttempts;
  final List<String> retryableStatusCodes;

  RoutingRetryPolicy({
    required this.backoffMs,
    required this.maxAttempts,
    required this.retryableStatusCodes
  });

  factory RoutingRetryPolicy.fromJson(Map<String, dynamic> json) {
    return RoutingRetryPolicy(
      backoffMs: (() {
        final value = json['backoffMs']?.toString();
        if (value == null) {
          throw FormatException('RoutingRetryPolicy.backoffMs is required');
        }
        return value;
      })(),
      maxAttempts: (() {
        final value = json['maxAttempts']?.toString();
        if (value == null) {
          throw FormatException('RoutingRetryPolicy.maxAttempts is required');
        }
        return value;
      })(),
      retryableStatusCodes: (() {
        final list = _sdkworkAsList(json['retryableStatusCodes']);
        if (list == null) {
          throw FormatException('RoutingRetryPolicy.retryableStatusCodes is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'backoffMs': backoffMs,
      'maxAttempts': maxAttempts,
      'retryableStatusCodes': retryableStatusCodes.map((item) => item).toList(),
    };
  }
}

class RoutingUsageData {
  final String latency;
  final String requests;
  final String time;

  RoutingUsageData({
    required this.latency,
    required this.requests,
    required this.time
  });

  factory RoutingUsageData.fromJson(Map<String, dynamic> json) {
    return RoutingUsageData(
      latency: (() {
        final value = json['latency']?.toString();
        if (value == null) {
          throw FormatException('RoutingUsageData.latency is required');
        }
        return value;
      })(),
      requests: (() {
        final value = json['requests']?.toString();
        if (value == null) {
          throw FormatException('RoutingUsageData.requests is required');
        }
        return value;
      })(),
      time: (() {
        final value = json['time']?.toString();
        if (value == null) {
          throw FormatException('RoutingUsageData.time is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'latency': latency,
      'requests': requests,
      'time': time,
    };
  }
}

class RoutingUsageListResult {
  final String code;
  final RoutingUsageSnapshot? data;
  final String? msg;

  RoutingUsageListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory RoutingUsageListResult.fromJson(Map<String, dynamic> json) {
    return RoutingUsageListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('RoutingUsageListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : RoutingUsageSnapshot.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class RoutingUsageSnapshot {
  final List<RoutingUsageData> chartData;
  final List<RoutingModelStats> modelStats;

  RoutingUsageSnapshot({
    required this.chartData,
    required this.modelStats
  });

  factory RoutingUsageSnapshot.fromJson(Map<String, dynamic> json) {
    return RoutingUsageSnapshot(
      chartData: (() {
        final list = _sdkworkAsList(json['chartData']);
        if (list == null) {
          throw FormatException('RoutingUsageSnapshot.chartData is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : RoutingUsageData.fromJson(map);
      })())
            .whereType<RoutingUsageData>()
            .toList();
      })(),
      modelStats: (() {
        final list = _sdkworkAsList(json['modelStats']);
        if (list == null) {
          throw FormatException('RoutingUsageSnapshot.modelStats is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : RoutingModelStats.fromJson(map);
      })())
            .whereType<RoutingModelStats>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'chartData': chartData.map((item) => item.toJson()).toList(),
      'modelStats': modelStats.map((item) => item.toJson()).toList(),
    };
  }
}

class RuntimeArtifactCreateRequest {
  final String artifactType;
  final Map<String, dynamic>? contentJson;
  final String? contentText;
  final Map<String, dynamic>? metadata;
  final String? mimeType;
  final String? name;
  final MediaResource? resource;
  final String? sha256;
  final String? sizeBytes;
  final String? storageKey;

  RuntimeArtifactCreateRequest({
    required this.artifactType,
    this.contentJson,
    this.contentText,
    this.metadata,
    this.mimeType,
    this.name,
    this.resource,
    this.sha256,
    this.sizeBytes,
    this.storageKey
  });

  factory RuntimeArtifactCreateRequest.fromJson(Map<String, dynamic> json) {
    return RuntimeArtifactCreateRequest(
      artifactType: (() {
        final value = json['artifactType']?.toString();
        if (value == null) {
          throw FormatException('RuntimeArtifactCreateRequest.artifactType is required');
        }
        return value;
      })(),
      contentJson: (() {
        final map = _sdkworkAsMap(json['contentJson']);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      contentText: json['contentText']?.toString(),
      metadata: (() {
        final map = _sdkworkAsMap(json['metadata']);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      mimeType: json['mimeType']?.toString(),
      name: json['name']?.toString(),
      resource: (() {
        final map = _sdkworkAsMap(json['resource']);
        return map == null ? null : MediaResource.fromJson(map);
      })(),
      sha256: json['sha256']?.toString(),
      sizeBytes: json['sizeBytes']?.toString(),
      storageKey: json['storageKey']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'artifactType': artifactType,
      'contentJson': contentJson?.map((key, item) => MapEntry(key, item)),
      'contentText': contentText,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'mimeType': mimeType,
      'name': name,
      'resource': resource?.toJson(),
      'sha256': sha256,
      'sizeBytes': sizeBytes,
      'storageKey': storageKey,
    };
  }
}

class RuntimeArtifactItem {
  final String artifactType;
  final String? contentText;
  final String createdAt;
  final String id;
  final String invocationId;
  final String? mimeType;
  final String? name;
  final MediaResource? resource;
  final String? sha256;
  final String? sizeBytes;
  final String? storageKey;

  RuntimeArtifactItem({
    required this.artifactType,
    this.contentText,
    required this.createdAt,
    required this.id,
    required this.invocationId,
    this.mimeType,
    this.name,
    this.resource,
    this.sha256,
    this.sizeBytes,
    this.storageKey
  });

  factory RuntimeArtifactItem.fromJson(Map<String, dynamic> json) {
    return RuntimeArtifactItem(
      artifactType: (() {
        final value = json['artifactType']?.toString();
        if (value == null) {
          throw FormatException('RuntimeArtifactItem.artifactType is required');
        }
        return value;
      })(),
      contentText: json['contentText']?.toString(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('RuntimeArtifactItem.createdAt is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('RuntimeArtifactItem.id is required');
        }
        return value;
      })(),
      invocationId: (() {
        final value = json['invocationId']?.toString();
        if (value == null) {
          throw FormatException('RuntimeArtifactItem.invocationId is required');
        }
        return value;
      })(),
      mimeType: json['mimeType']?.toString(),
      name: json['name']?.toString(),
      resource: (() {
        final map = _sdkworkAsMap(json['resource']);
        return map == null ? null : MediaResource.fromJson(map);
      })(),
      sha256: json['sha256']?.toString(),
      sizeBytes: json['sizeBytes']?.toString(),
      storageKey: json['storageKey']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'artifactType': artifactType,
      'contentText': contentText,
      'createdAt': createdAt,
      'id': id,
      'invocationId': invocationId,
      'mimeType': mimeType,
      'name': name,
      'resource': resource?.toJson(),
      'sha256': sha256,
      'sizeBytes': sizeBytes,
      'storageKey': storageKey,
    };
  }
}

class RuntimeArtifactListResponse {
  final List<RuntimeArtifactItem> items;

  RuntimeArtifactListResponse({
    required this.items
  });

  factory RuntimeArtifactListResponse.fromJson(Map<String, dynamic> json) {
    return RuntimeArtifactListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('RuntimeArtifactListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : RuntimeArtifactItem.fromJson(map);
      })())
            .whereType<RuntimeArtifactItem>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
    };
  }
}

class RuntimeArtifactResponse {
  final RuntimeArtifactItem item;

  RuntimeArtifactResponse({
    required this.item
  });

  factory RuntimeArtifactResponse.fromJson(Map<String, dynamic> json) {
    return RuntimeArtifactResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('RuntimeArtifactResponse.item is required');
        }
        return RuntimeArtifactItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class RuntimeEventCreateRequest {
  final String? eventSource;
  final String eventType;
  final Map<String, dynamic>? metadata;
  final Map<String, dynamic>? payloadJson;
  final String? textDelta;

  RuntimeEventCreateRequest({
    this.eventSource,
    required this.eventType,
    this.metadata,
    this.payloadJson,
    this.textDelta
  });

  factory RuntimeEventCreateRequest.fromJson(Map<String, dynamic> json) {
    return RuntimeEventCreateRequest(
      eventSource: json['eventSource']?.toString(),
      eventType: (() {
        final value = json['eventType']?.toString();
        if (value == null) {
          throw FormatException('RuntimeEventCreateRequest.eventType is required');
        }
        return value;
      })(),
      metadata: (() {
        final map = _sdkworkAsMap(json['metadata']);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      payloadJson: (() {
        final map = _sdkworkAsMap(json['payloadJson']);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      textDelta: json['textDelta']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'eventSource': eventSource,
      'eventType': eventType,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'payloadJson': payloadJson?.map((key, item) => MapEntry(key, item)),
      'textDelta': textDelta,
    };
  }
}

class RuntimeEventItem {
  final String createdAt;
  final String eventNo;
  final String eventSource;
  final String eventType;
  final String id;
  final String invocationId;
  final Map<String, dynamic> payloadJson;
  final String? textDelta;

  RuntimeEventItem({
    required this.createdAt,
    required this.eventNo,
    required this.eventSource,
    required this.eventType,
    required this.id,
    required this.invocationId,
    required this.payloadJson,
    this.textDelta
  });

  factory RuntimeEventItem.fromJson(Map<String, dynamic> json) {
    return RuntimeEventItem(
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('RuntimeEventItem.createdAt is required');
        }
        return value;
      })(),
      eventNo: (() {
        final value = json['eventNo']?.toString();
        if (value == null) {
          throw FormatException('RuntimeEventItem.eventNo is required');
        }
        return value;
      })(),
      eventSource: (() {
        final value = json['eventSource']?.toString();
        if (value == null) {
          throw FormatException('RuntimeEventItem.eventSource is required');
        }
        return value;
      })(),
      eventType: (() {
        final value = json['eventType']?.toString();
        if (value == null) {
          throw FormatException('RuntimeEventItem.eventType is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('RuntimeEventItem.id is required');
        }
        return value;
      })(),
      invocationId: (() {
        final value = json['invocationId']?.toString();
        if (value == null) {
          throw FormatException('RuntimeEventItem.invocationId is required');
        }
        return value;
      })(),
      payloadJson: (() {
        final map = _sdkworkAsMap(json['payloadJson']);
        if (map == null) {
          throw FormatException('RuntimeEventItem.payloadJson is required');
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      textDelta: json['textDelta']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'createdAt': createdAt,
      'eventNo': eventNo,
      'eventSource': eventSource,
      'eventType': eventType,
      'id': id,
      'invocationId': invocationId,
      'payloadJson': payloadJson.map((key, item) => MapEntry(key, item)),
      'textDelta': textDelta,
    };
  }
}

class RuntimeEventListResponse {
  final List<RuntimeEventItem> items;

  RuntimeEventListResponse({
    required this.items
  });

  factory RuntimeEventListResponse.fromJson(Map<String, dynamic> json) {
    return RuntimeEventListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('RuntimeEventListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : RuntimeEventItem.fromJson(map);
      })())
            .whereType<RuntimeEventItem>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
    };
  }
}

class RuntimeEventResponse {
  final RuntimeEventItem item;

  RuntimeEventResponse({
    required this.item
  });

  factory RuntimeEventResponse.fromJson(Map<String, dynamic> json) {
    return RuntimeEventResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('RuntimeEventResponse.item is required');
        }
        return RuntimeEventItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class RuntimeInvocationCompleteRequest {
  final String? errorCode;
  final String? errorMessageMasked;
  final String? errorType;
  final String? exitCode;
  final String? finishReason;
  final String? latencyMs;
  final Map<String, dynamic>? metadata;
  final String? providerConversationId;
  final String? providerResponseId;
  final String? providerSessionId;
  final String? providerStepId;
  final Map<String, dynamic>? responseJson;
  final String? status;
  final String? ttftMs;
  final UsageSnapshot? usageJson;

  RuntimeInvocationCompleteRequest({
    this.errorCode,
    this.errorMessageMasked,
    this.errorType,
    this.exitCode,
    this.finishReason,
    this.latencyMs,
    this.metadata,
    this.providerConversationId,
    this.providerResponseId,
    this.providerSessionId,
    this.providerStepId,
    this.responseJson,
    this.status,
    this.ttftMs,
    this.usageJson
  });

  factory RuntimeInvocationCompleteRequest.fromJson(Map<String, dynamic> json) {
    return RuntimeInvocationCompleteRequest(
      errorCode: json['errorCode']?.toString(),
      errorMessageMasked: json['errorMessageMasked']?.toString(),
      errorType: json['errorType']?.toString(),
      exitCode: json['exitCode']?.toString(),
      finishReason: json['finishReason']?.toString(),
      latencyMs: json['latencyMs']?.toString(),
      metadata: (() {
        final map = _sdkworkAsMap(json['metadata']);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      providerConversationId: json['providerConversationId']?.toString(),
      providerResponseId: json['providerResponseId']?.toString(),
      providerSessionId: json['providerSessionId']?.toString(),
      providerStepId: json['providerStepId']?.toString(),
      responseJson: (() {
        final map = _sdkworkAsMap(json['responseJson']);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      status: json['status']?.toString(),
      ttftMs: json['ttftMs']?.toString(),
      usageJson: (() {
        final map = _sdkworkAsMap(json['usageJson']);
        return map == null ? null : UsageSnapshot.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'errorCode': errorCode,
      'errorMessageMasked': errorMessageMasked,
      'errorType': errorType,
      'exitCode': exitCode,
      'finishReason': finishReason,
      'latencyMs': latencyMs,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'providerConversationId': providerConversationId,
      'providerResponseId': providerResponseId,
      'providerSessionId': providerSessionId,
      'providerStepId': providerStepId,
      'responseJson': responseJson?.map((key, item) => MapEntry(key, item)),
      'status': status,
      'ttftMs': ttftMs,
      'usageJson': usageJson?.toJson(),
    };
  }
}

class RuntimeInvocationCreateRequest {
  final String? agentRunId;
  final String? agentRunStepId;
  final String? agentSessionId;
  final String? approvalPolicy;
  final String? chatItemId;
  final String? chatTurnId;
  final String? conversationId;
  final String? cwd;
  final String? endpoint;
  final String? invocationType;
  final Map<String, dynamic>? metadata;
  final String? model;
  final String? permissionMode;
  final String? provider;
  final Map<String, dynamic>? requestJson;
  final String runtime;
  final String? sandboxPolicy;
  final String? status;
  final bool? streaming;
  final String? toolCallId;
  final String? toolName;
  final String? traceId;

  RuntimeInvocationCreateRequest({
    this.agentRunId,
    this.agentRunStepId,
    this.agentSessionId,
    this.approvalPolicy,
    this.chatItemId,
    this.chatTurnId,
    this.conversationId,
    this.cwd,
    this.endpoint,
    this.invocationType,
    this.metadata,
    this.model,
    this.permissionMode,
    this.provider,
    this.requestJson,
    required this.runtime,
    this.sandboxPolicy,
    this.status,
    this.streaming,
    this.toolCallId,
    this.toolName,
    this.traceId
  });

  factory RuntimeInvocationCreateRequest.fromJson(Map<String, dynamic> json) {
    return RuntimeInvocationCreateRequest(
      agentRunId: json['agentRunId']?.toString(),
      agentRunStepId: json['agentRunStepId']?.toString(),
      agentSessionId: json['agentSessionId']?.toString(),
      approvalPolicy: json['approvalPolicy']?.toString(),
      chatItemId: json['chatItemId']?.toString(),
      chatTurnId: json['chatTurnId']?.toString(),
      conversationId: json['conversationId']?.toString(),
      cwd: json['cwd']?.toString(),
      endpoint: json['endpoint']?.toString(),
      invocationType: json['invocationType']?.toString(),
      metadata: (() {
        final map = _sdkworkAsMap(json['metadata']);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      model: json['model']?.toString(),
      permissionMode: json['permissionMode']?.toString(),
      provider: json['provider']?.toString(),
      requestJson: (() {
        final map = _sdkworkAsMap(json['requestJson']);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      runtime: (() {
        final value = json['runtime']?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationCreateRequest.runtime is required');
        }
        return value;
      })(),
      sandboxPolicy: json['sandboxPolicy']?.toString(),
      status: json['status']?.toString(),
      streaming: json['streaming'] is bool ? json['streaming'] : null,
      toolCallId: json['toolCallId']?.toString(),
      toolName: json['toolName']?.toString(),
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'agentRunId': agentRunId,
      'agentRunStepId': agentRunStepId,
      'agentSessionId': agentSessionId,
      'approvalPolicy': approvalPolicy,
      'chatItemId': chatItemId,
      'chatTurnId': chatTurnId,
      'conversationId': conversationId,
      'cwd': cwd,
      'endpoint': endpoint,
      'invocationType': invocationType,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'permissionMode': permissionMode,
      'provider': provider,
      'requestJson': requestJson?.map((key, item) => MapEntry(key, item)),
      'runtime': runtime,
      'sandboxPolicy': sandboxPolicy,
      'status': status,
      'streaming': streaming,
      'toolCallId': toolCallId,
      'toolName': toolName,
      'traceId': traceId,
    };
  }
}

class RuntimeInvocationItem {
  final String? agentRunId;
  final String? agentRunStepId;
  final String? agentSessionId;
  final String? approvalPolicy;
  final String attemptNo;
  final String? chatItemId;
  final String? chatTurnId;
  final String? completedAt;
  final String? conversationId;
  final String createdAt;
  final String? cwd;
  final String? endpoint;
  final String? errorCode;
  final String? errorMessageMasked;
  final String? errorType;
  final String? exitCode;
  final String? finishReason;
  final String id;
  final String invocationNo;
  final String invocationType;
  final String? latencyMs;
  final String? model;
  final String? permissionMode;
  final String? provider;
  final String? providerConversationId;
  final String? providerResponseId;
  final String? providerSessionId;
  final String? providerStepId;
  final String? requestId;
  final String runtime;
  final String? sandboxPolicy;
  final String? startedAt;
  final String status;
  final bool streaming;
  final String? toolCallId;
  final String? toolName;
  final String? traceId;
  final String? ttftMs;

  RuntimeInvocationItem({
    this.agentRunId,
    this.agentRunStepId,
    this.agentSessionId,
    this.approvalPolicy,
    required this.attemptNo,
    this.chatItemId,
    this.chatTurnId,
    this.completedAt,
    this.conversationId,
    required this.createdAt,
    this.cwd,
    this.endpoint,
    this.errorCode,
    this.errorMessageMasked,
    this.errorType,
    this.exitCode,
    this.finishReason,
    required this.id,
    required this.invocationNo,
    required this.invocationType,
    this.latencyMs,
    this.model,
    this.permissionMode,
    this.provider,
    this.providerConversationId,
    this.providerResponseId,
    this.providerSessionId,
    this.providerStepId,
    this.requestId,
    required this.runtime,
    this.sandboxPolicy,
    this.startedAt,
    required this.status,
    required this.streaming,
    this.toolCallId,
    this.toolName,
    this.traceId,
    this.ttftMs
  });

  factory RuntimeInvocationItem.fromJson(Map<String, dynamic> json) {
    return RuntimeInvocationItem(
      agentRunId: json['agentRunId']?.toString(),
      agentRunStepId: json['agentRunStepId']?.toString(),
      agentSessionId: json['agentSessionId']?.toString(),
      approvalPolicy: json['approvalPolicy']?.toString(),
      attemptNo: (() {
        final value = json['attemptNo']?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.attemptNo is required');
        }
        return value;
      })(),
      chatItemId: json['chatItemId']?.toString(),
      chatTurnId: json['chatTurnId']?.toString(),
      completedAt: json['completedAt']?.toString(),
      conversationId: json['conversationId']?.toString(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.createdAt is required');
        }
        return value;
      })(),
      cwd: json['cwd']?.toString(),
      endpoint: json['endpoint']?.toString(),
      errorCode: json['errorCode']?.toString(),
      errorMessageMasked: json['errorMessageMasked']?.toString(),
      errorType: json['errorType']?.toString(),
      exitCode: json['exitCode']?.toString(),
      finishReason: json['finishReason']?.toString(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.id is required');
        }
        return value;
      })(),
      invocationNo: (() {
        final value = json['invocationNo']?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.invocationNo is required');
        }
        return value;
      })(),
      invocationType: (() {
        final value = json['invocationType']?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.invocationType is required');
        }
        return value;
      })(),
      latencyMs: json['latencyMs']?.toString(),
      model: json['model']?.toString(),
      permissionMode: json['permissionMode']?.toString(),
      provider: json['provider']?.toString(),
      providerConversationId: json['providerConversationId']?.toString(),
      providerResponseId: json['providerResponseId']?.toString(),
      providerSessionId: json['providerSessionId']?.toString(),
      providerStepId: json['providerStepId']?.toString(),
      requestId: json['requestId']?.toString(),
      runtime: (() {
        final value = json['runtime']?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.runtime is required');
        }
        return value;
      })(),
      sandboxPolicy: json['sandboxPolicy']?.toString(),
      startedAt: json['startedAt']?.toString(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.status is required');
        }
        return value;
      })(),
      streaming: (() {
        final value = json['streaming'];
        if (value is! bool) {
          throw FormatException('RuntimeInvocationItem.streaming is required');
        }
        return value;
      })(),
      toolCallId: json['toolCallId']?.toString(),
      toolName: json['toolName']?.toString(),
      traceId: json['traceId']?.toString(),
      ttftMs: json['ttftMs']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'agentRunId': agentRunId,
      'agentRunStepId': agentRunStepId,
      'agentSessionId': agentSessionId,
      'approvalPolicy': approvalPolicy,
      'attemptNo': attemptNo,
      'chatItemId': chatItemId,
      'chatTurnId': chatTurnId,
      'completedAt': completedAt,
      'conversationId': conversationId,
      'createdAt': createdAt,
      'cwd': cwd,
      'endpoint': endpoint,
      'errorCode': errorCode,
      'errorMessageMasked': errorMessageMasked,
      'errorType': errorType,
      'exitCode': exitCode,
      'finishReason': finishReason,
      'id': id,
      'invocationNo': invocationNo,
      'invocationType': invocationType,
      'latencyMs': latencyMs,
      'model': model,
      'permissionMode': permissionMode,
      'provider': provider,
      'providerConversationId': providerConversationId,
      'providerResponseId': providerResponseId,
      'providerSessionId': providerSessionId,
      'providerStepId': providerStepId,
      'requestId': requestId,
      'runtime': runtime,
      'sandboxPolicy': sandboxPolicy,
      'startedAt': startedAt,
      'status': status,
      'streaming': streaming,
      'toolCallId': toolCallId,
      'toolName': toolName,
      'traceId': traceId,
      'ttftMs': ttftMs,
    };
  }
}

class RuntimeInvocationListResponse {
  final List<RuntimeInvocationItem> items;

  RuntimeInvocationListResponse({
    required this.items
  });

  factory RuntimeInvocationListResponse.fromJson(Map<String, dynamic> json) {
    return RuntimeInvocationListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('RuntimeInvocationListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : RuntimeInvocationItem.fromJson(map);
      })())
            .whereType<RuntimeInvocationItem>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
    };
  }
}

class RuntimeInvocationResponse {
  final RuntimeInvocationItem item;

  RuntimeInvocationResponse({
    required this.item
  });

  factory RuntimeInvocationResponse.fromJson(Map<String, dynamic> json) {
    return RuntimeInvocationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('RuntimeInvocationResponse.item is required');
        }
        return RuntimeInvocationItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class SettingsDataResponse {
  final String language;
  final SettingsNotifications notifications;
  final String timezone;
  final String webhookUrl;

  SettingsDataResponse({
    required this.language,
    required this.notifications,
    required this.timezone,
    required this.webhookUrl
  });

  factory SettingsDataResponse.fromJson(Map<String, dynamic> json) {
    return SettingsDataResponse(
      language: (() {
        final value = json['language']?.toString();
        if (value == null) {
          throw FormatException('SettingsDataResponse.language is required');
        }
        return value;
      })(),
      notifications: (() {
        final map = _sdkworkAsMap(json['notifications']);
        if (map == null) {
          throw FormatException('SettingsDataResponse.notifications is required');
        }
        return SettingsNotifications.fromJson(map);
      })(),
      timezone: (() {
        final value = json['timezone']?.toString();
        if (value == null) {
          throw FormatException('SettingsDataResponse.timezone is required');
        }
        return value;
      })(),
      webhookUrl: (() {
        final value = json['webhookUrl']?.toString();
        if (value == null) {
          throw FormatException('SettingsDataResponse.webhookUrl is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'language': language,
      'notifications': notifications.toJson(),
      'timezone': timezone,
      'webhookUrl': webhookUrl,
    };
  }
}

class SettingsNotifications {
  final bool apiMonitor;
  final bool billReminder;
  final bool quotaWarning;

  SettingsNotifications({
    required this.apiMonitor,
    required this.billReminder,
    required this.quotaWarning
  });

  factory SettingsNotifications.fromJson(Map<String, dynamic> json) {
    return SettingsNotifications(
      apiMonitor: (() {
        final value = json['apiMonitor'];
        if (value is! bool) {
          throw FormatException('SettingsNotifications.apiMonitor is required');
        }
        return value;
      })(),
      billReminder: (() {
        final value = json['billReminder'];
        if (value is! bool) {
          throw FormatException('SettingsNotifications.billReminder is required');
        }
        return value;
      })(),
      quotaWarning: (() {
        final value = json['quotaWarning'];
        if (value is! bool) {
          throw FormatException('SettingsNotifications.quotaWarning is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'apiMonitor': apiMonitor,
      'billReminder': billReminder,
      'quotaWarning': quotaWarning,
    };
  }
}

class SiteRuntimeRetrieveResult {
  final String code;
  final SiteRuntimeSettingsResponse? data;
  final String? msg;

  SiteRuntimeRetrieveResult({
    required this.code,
    this.data,
    this.msg
  });

  factory SiteRuntimeRetrieveResult.fromJson(Map<String, dynamic> json) {
    return SiteRuntimeRetrieveResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeRetrieveResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : SiteRuntimeSettingsResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class SiteRuntimeSettingsResponse {
  final String accentColor;
  final String brandColor;
  final String customCss;
  final String description;
  final String docsUrl;
  final MediaResource favicon;
  final String footerCopyright;
  final MediaResource icon;
  final String icpRecordNumber;
  final String icpRecordUrl;
  final MediaResource logo;
  final String policeRecordNumber;
  final String policeRecordUrl;
  final String privacyUrl;
  final String seoDescription;
  final String seoTitle;
  final String shortName;
  final String siteName;
  final String supportUrl;
  final String termsUrl;

  SiteRuntimeSettingsResponse({
    required this.accentColor,
    required this.brandColor,
    required this.customCss,
    required this.description,
    required this.docsUrl,
    required this.favicon,
    required this.footerCopyright,
    required this.icon,
    required this.icpRecordNumber,
    required this.icpRecordUrl,
    required this.logo,
    required this.policeRecordNumber,
    required this.policeRecordUrl,
    required this.privacyUrl,
    required this.seoDescription,
    required this.seoTitle,
    required this.shortName,
    required this.siteName,
    required this.supportUrl,
    required this.termsUrl
  });

  factory SiteRuntimeSettingsResponse.fromJson(Map<String, dynamic> json) {
    return SiteRuntimeSettingsResponse(
      accentColor: (() {
        final value = json['accentColor']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.accentColor is required');
        }
        return value;
      })(),
      brandColor: (() {
        final value = json['brandColor']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.brandColor is required');
        }
        return value;
      })(),
      customCss: (() {
        final value = json['customCss']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.customCss is required');
        }
        return value;
      })(),
      description: (() {
        final value = json['description']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.description is required');
        }
        return value;
      })(),
      docsUrl: (() {
        final value = json['docsUrl']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.docsUrl is required');
        }
        return value;
      })(),
      favicon: (() {
        final map = _sdkworkAsMap(json['favicon']);
        if (map == null) {
          throw FormatException('SiteRuntimeSettingsResponse.favicon is required');
        }
        return MediaResource.fromJson(map);
      })(),
      footerCopyright: (() {
        final value = json['footerCopyright']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.footerCopyright is required');
        }
        return value;
      })(),
      icon: (() {
        final map = _sdkworkAsMap(json['icon']);
        if (map == null) {
          throw FormatException('SiteRuntimeSettingsResponse.icon is required');
        }
        return MediaResource.fromJson(map);
      })(),
      icpRecordNumber: (() {
        final value = json['icpRecordNumber']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.icpRecordNumber is required');
        }
        return value;
      })(),
      icpRecordUrl: (() {
        final value = json['icpRecordUrl']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.icpRecordUrl is required');
        }
        return value;
      })(),
      logo: (() {
        final map = _sdkworkAsMap(json['logo']);
        if (map == null) {
          throw FormatException('SiteRuntimeSettingsResponse.logo is required');
        }
        return MediaResource.fromJson(map);
      })(),
      policeRecordNumber: (() {
        final value = json['policeRecordNumber']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.policeRecordNumber is required');
        }
        return value;
      })(),
      policeRecordUrl: (() {
        final value = json['policeRecordUrl']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.policeRecordUrl is required');
        }
        return value;
      })(),
      privacyUrl: (() {
        final value = json['privacyUrl']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.privacyUrl is required');
        }
        return value;
      })(),
      seoDescription: (() {
        final value = json['seoDescription']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.seoDescription is required');
        }
        return value;
      })(),
      seoTitle: (() {
        final value = json['seoTitle']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.seoTitle is required');
        }
        return value;
      })(),
      shortName: (() {
        final value = json['shortName']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.shortName is required');
        }
        return value;
      })(),
      siteName: (() {
        final value = json['siteName']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.siteName is required');
        }
        return value;
      })(),
      supportUrl: (() {
        final value = json['supportUrl']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.supportUrl is required');
        }
        return value;
      })(),
      termsUrl: (() {
        final value = json['termsUrl']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.termsUrl is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'accentColor': accentColor,
      'brandColor': brandColor,
      'customCss': customCss,
      'description': description,
      'docsUrl': docsUrl,
      'favicon': favicon.toJson(),
      'footerCopyright': footerCopyright,
      'icon': icon.toJson(),
      'icpRecordNumber': icpRecordNumber,
      'icpRecordUrl': icpRecordUrl,
      'logo': logo.toJson(),
      'policeRecordNumber': policeRecordNumber,
      'policeRecordUrl': policeRecordUrl,
      'privacyUrl': privacyUrl,
      'seoDescription': seoDescription,
      'seoTitle': seoTitle,
      'shortName': shortName,
      'siteName': siteName,
      'supportUrl': supportUrl,
      'termsUrl': termsUrl,
    };
  }
}

class TurnResponsesCreateResult {
  final String code;
  final ChatTurnCreateResponse? data;
  final String? msg;

  TurnResponsesCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory TurnResponsesCreateResult.fromJson(Map<String, dynamic> json) {
    return TurnResponsesCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('TurnResponsesCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ChatTurnCreateResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class TurnsCreateResult {
  final String code;
  final ChatTurnCreateResponse? data;
  final String? msg;

  TurnsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory TurnsCreateResult.fromJson(Map<String, dynamic> json) {
    return TurnsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('TurnsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ChatTurnCreateResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class UpdateApiKeyRequest {
  final String? channelGroup;
  final bool? defaultForRuntime;
  final String? expires;
  final String? ipLimit;
  final bool? isUnlimitedQuota;
  final List<String>? modalities;
  final String? name;
  final String? quota;

  UpdateApiKeyRequest({
    this.channelGroup,
    this.defaultForRuntime,
    this.expires,
    this.ipLimit,
    this.isUnlimitedQuota,
    this.modalities,
    this.name,
    this.quota
  });

  factory UpdateApiKeyRequest.fromJson(Map<String, dynamic> json) {
    return UpdateApiKeyRequest(
      channelGroup: json['channelGroup']?.toString(),
      defaultForRuntime: json['defaultForRuntime'] is bool ? json['defaultForRuntime'] : null,
      expires: json['expires']?.toString(),
      ipLimit: json['ipLimit']?.toString(),
      isUnlimitedQuota: json['isUnlimitedQuota'] is bool ? json['isUnlimitedQuota'] : null,
      modalities: (() {
        final list = _sdkworkAsList(json['modalities']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      name: json['name']?.toString(),
      quota: json['quota']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'channelGroup': channelGroup,
      'defaultForRuntime': defaultForRuntime,
      'expires': expires,
      'ipLimit': ipLimit,
      'isUnlimitedQuota': isUnlimitedQuota,
      'modalities': modalities?.map((item) => item).toList(),
      'name': name,
      'quota': quota,
    };
  }
}

class UpdateApiKeyResponse {
  final AppApiKeyItem item;

  UpdateApiKeyResponse({
    required this.item
  });

  factory UpdateApiKeyResponse.fromJson(Map<String, dynamic> json) {
    return UpdateApiKeyResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('UpdateApiKeyResponse.item is required');
        }
        return AppApiKeyItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class UpdateSettingsRequest {
  final String language;
  final SettingsNotifications notifications;
  final String timezone;
  final String webhookUrl;

  UpdateSettingsRequest({
    required this.language,
    required this.notifications,
    required this.timezone,
    required this.webhookUrl
  });

  factory UpdateSettingsRequest.fromJson(Map<String, dynamic> json) {
    return UpdateSettingsRequest(
      language: (() {
        final value = json['language']?.toString();
        if (value == null) {
          throw FormatException('UpdateSettingsRequest.language is required');
        }
        return value;
      })(),
      notifications: (() {
        final map = _sdkworkAsMap(json['notifications']);
        if (map == null) {
          throw FormatException('UpdateSettingsRequest.notifications is required');
        }
        return SettingsNotifications.fromJson(map);
      })(),
      timezone: (() {
        final value = json['timezone']?.toString();
        if (value == null) {
          throw FormatException('UpdateSettingsRequest.timezone is required');
        }
        return value;
      })(),
      webhookUrl: (() {
        final value = json['webhookUrl']?.toString();
        if (value == null) {
          throw FormatException('UpdateSettingsRequest.webhookUrl is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'language': language,
      'notifications': notifications.toJson(),
      'timezone': timezone,
      'webhookUrl': webhookUrl,
    };
  }
}

class UpdateSettingsResponse {
  final bool success;

  UpdateSettingsResponse({
    required this.success
  });

  factory UpdateSettingsResponse.fromJson(Map<String, dynamic> json) {
    return UpdateSettingsResponse(
      success: (() {
        final value = json['success'];
        if (value is! bool) {
          throw FormatException('UpdateSettingsResponse.success is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'success': success,
    };
  }
}

class UsageLogItem {
  final String baseInputPrice;
  final String baseOutputPrice;
  final String cacheReadPrice;
  final String cacheReadTokens;
  final String cost;
  final String errorCode;
  final String errorMessage;
  final String errorType;
  final String group;
  final String httpStatus;
  final String id;
  final String inputTokens;
  final String ip;
  final bool isStream;
  final String model;
  final String multiplier;
  final String outputTokens;
  final String path;
  final String providerNativeModel;
  final String reasoningEffort;
  final String regionCode;
  final String requestId;
  final String requestedModelCatalogKey;
  final String status;
  final String time;
  final String tokenName;
  final String totalTime;
  final String ttft;
  final String type;
  final String userAgent;

  UsageLogItem({
    required this.baseInputPrice,
    required this.baseOutputPrice,
    required this.cacheReadPrice,
    required this.cacheReadTokens,
    required this.cost,
    required this.errorCode,
    required this.errorMessage,
    required this.errorType,
    required this.group,
    required this.httpStatus,
    required this.id,
    required this.inputTokens,
    required this.ip,
    required this.isStream,
    required this.model,
    required this.multiplier,
    required this.outputTokens,
    required this.path,
    required this.providerNativeModel,
    required this.reasoningEffort,
    required this.regionCode,
    required this.requestId,
    required this.requestedModelCatalogKey,
    required this.status,
    required this.time,
    required this.tokenName,
    required this.totalTime,
    required this.ttft,
    required this.type,
    required this.userAgent
  });

  factory UsageLogItem.fromJson(Map<String, dynamic> json) {
    return UsageLogItem(
      baseInputPrice: (() {
        final value = json['baseInputPrice']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.baseInputPrice is required');
        }
        return value;
      })(),
      baseOutputPrice: (() {
        final value = json['baseOutputPrice']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.baseOutputPrice is required');
        }
        return value;
      })(),
      cacheReadPrice: (() {
        final value = json['cacheReadPrice']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.cacheReadPrice is required');
        }
        return value;
      })(),
      cacheReadTokens: (() {
        final value = json['cacheReadTokens']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.cacheReadTokens is required');
        }
        return value;
      })(),
      cost: (() {
        final value = json['cost']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.cost is required');
        }
        return value;
      })(),
      errorCode: (() {
        final value = json['errorCode']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.errorCode is required');
        }
        return value;
      })(),
      errorMessage: (() {
        final value = json['errorMessage']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.errorMessage is required');
        }
        return value;
      })(),
      errorType: (() {
        final value = json['errorType']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.errorType is required');
        }
        return value;
      })(),
      group: (() {
        final value = json['group']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.group is required');
        }
        return value;
      })(),
      httpStatus: (() {
        final value = json['httpStatus']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.httpStatus is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.id is required');
        }
        return value;
      })(),
      inputTokens: (() {
        final value = json['inputTokens']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.inputTokens is required');
        }
        return value;
      })(),
      ip: (() {
        final value = json['ip']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.ip is required');
        }
        return value;
      })(),
      isStream: (() {
        final value = json['isStream'];
        if (value is! bool) {
          throw FormatException('UsageLogItem.isStream is required');
        }
        return value;
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.model is required');
        }
        return value;
      })(),
      multiplier: (() {
        final value = json['multiplier']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.multiplier is required');
        }
        return value;
      })(),
      outputTokens: (() {
        final value = json['outputTokens']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.outputTokens is required');
        }
        return value;
      })(),
      path: (() {
        final value = json['path']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.path is required');
        }
        return value;
      })(),
      providerNativeModel: (() {
        final value = json['providerNativeModel']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.providerNativeModel is required');
        }
        return value;
      })(),
      reasoningEffort: (() {
        final value = json['reasoningEffort']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.reasoningEffort is required');
        }
        return value;
      })(),
      regionCode: (() {
        final value = json['regionCode']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.regionCode is required');
        }
        return value;
      })(),
      requestId: (() {
        final value = json['requestId']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.requestId is required');
        }
        return value;
      })(),
      requestedModelCatalogKey: (() {
        final value = json['requestedModelCatalogKey']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.requestedModelCatalogKey is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.status is required');
        }
        return value;
      })(),
      time: (() {
        final value = json['time']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.time is required');
        }
        return value;
      })(),
      tokenName: (() {
        final value = json['tokenName']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.tokenName is required');
        }
        return value;
      })(),
      totalTime: (() {
        final value = json['totalTime']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.totalTime is required');
        }
        return value;
      })(),
      ttft: (() {
        final value = json['ttft']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.ttft is required');
        }
        return value;
      })(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.type is required');
        }
        return value;
      })(),
      userAgent: (() {
        final value = json['userAgent']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.userAgent is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'baseInputPrice': baseInputPrice,
      'baseOutputPrice': baseOutputPrice,
      'cacheReadPrice': cacheReadPrice,
      'cacheReadTokens': cacheReadTokens,
      'cost': cost,
      'errorCode': errorCode,
      'errorMessage': errorMessage,
      'errorType': errorType,
      'group': group,
      'httpStatus': httpStatus,
      'id': id,
      'inputTokens': inputTokens,
      'ip': ip,
      'isStream': isStream,
      'model': model,
      'multiplier': multiplier,
      'outputTokens': outputTokens,
      'path': path,
      'providerNativeModel': providerNativeModel,
      'reasoningEffort': reasoningEffort,
      'regionCode': regionCode,
      'requestId': requestId,
      'requestedModelCatalogKey': requestedModelCatalogKey,
      'status': status,
      'time': time,
      'tokenName': tokenName,
      'totalTime': totalTime,
      'ttft': ttft,
      'type': type,
      'userAgent': userAgent,
    };
  }
}

class UsageLogsListResult {
  final String code;
  final UsageLogsResponse? data;
  final String? msg;

  UsageLogsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory UsageLogsListResult.fromJson(Map<String, dynamic> json) {
    return UsageLogsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('UsageLogsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : UsageLogsResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class UsageLogsResponse {
  final List<UsageLogItem> logs;
  final String page;
  final String pageSize;
  final String total;

  UsageLogsResponse({
    required this.logs,
    required this.page,
    required this.pageSize,
    required this.total
  });

  factory UsageLogsResponse.fromJson(Map<String, dynamic> json) {
    return UsageLogsResponse(
      logs: (() {
        final list = _sdkworkAsList(json['logs']);
        if (list == null) {
          throw FormatException('UsageLogsResponse.logs is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : UsageLogItem.fromJson(map);
      })())
            .whereType<UsageLogItem>()
            .toList();
      })(),
      page: (() {
        final value = json['page']?.toString();
        if (value == null) {
          throw FormatException('UsageLogsResponse.page is required');
        }
        return value;
      })(),
      pageSize: (() {
        final value = json['pageSize']?.toString();
        if (value == null) {
          throw FormatException('UsageLogsResponse.pageSize is required');
        }
        return value;
      })(),
      total: (() {
        final value = json['total']?.toString();
        if (value == null) {
          throw FormatException('UsageLogsResponse.total is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'logs': logs.map((item) => item.toJson()).toList(),
      'page': page,
      'pageSize': pageSize,
      'total': total,
    };
  }
}

class UsageSnapshot {
  final String? cachedTokens;
  final String? inputTokens;
  final String? outputTokens;
  final String? totalTokens;

  UsageSnapshot({
    this.cachedTokens,
    this.inputTokens,
    this.outputTokens,
    this.totalTokens
  });

  factory UsageSnapshot.fromJson(Map<String, dynamic> json) {
    return UsageSnapshot(
      cachedTokens: json['cachedTokens']?.toString(),
      inputTokens: json['inputTokens']?.toString(),
      outputTokens: json['outputTokens']?.toString(),
      totalTokens: json['totalTokens']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cachedTokens': cachedTokens,
      'inputTokens': inputTokens,
      'outputTokens': outputTokens,
      'totalTokens': totalTokens,
    };
  }
}

class UsersSettingsRetrieveResult {
  final String code;
  final SettingsDataResponse? data;
  final String? msg;

  UsersSettingsRetrieveResult({
    required this.code,
    this.data,
    this.msg
  });

  factory UsersSettingsRetrieveResult.fromJson(Map<String, dynamic> json) {
    return UsersSettingsRetrieveResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('UsersSettingsRetrieveResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : SettingsDataResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}

class UsersSettingsUpdateResult {
  final String code;
  final UpdateSettingsResponse? data;
  final String? msg;

  UsersSettingsUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory UsersSettingsUpdateResult.fromJson(Map<String, dynamic> json) {
    return UsersSettingsUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('UsersSettingsUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : UpdateSettingsResponse.fromJson(map);
      })(),
      msg: json['msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'msg': msg,
    };
  }
}
