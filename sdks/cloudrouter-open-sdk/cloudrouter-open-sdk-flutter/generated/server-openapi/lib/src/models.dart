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

class AnthropicContentBlock {
  final String? id;
  final Map<String, dynamic>? input;
  final String? name;
  final String? text;
  final String type;

  AnthropicContentBlock({
    this.id,
    this.input,
    this.name,
    this.text,
    required this.type
  });

  factory AnthropicContentBlock.fromJson(Map<String, dynamic> json) {
    return AnthropicContentBlock(
      id: json['id']?.toString(),
      input: (() {
        final map = _sdkworkAsMap(json['input']);
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
      name: json['name']?.toString(),
      text: json['text']?.toString(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('AnthropicContentBlock.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'input': input?.map((key, item) => MapEntry(key, item)),
      'name': name,
      'text': text,
      'type': type,
    };
  }
}

class AnthropicContentBlockParam {
  final dynamic content;
  final String? id;
  final Map<String, dynamic>? input;
  final String? name;
  final AnthropicContentSource? source;
  final String? text;
  final String? toolUseId;
  final String type;

  AnthropicContentBlockParam({
    this.content,
    this.id,
    this.input,
    this.name,
    this.source,
    this.text,
    this.toolUseId,
    required this.type
  });

  factory AnthropicContentBlockParam.fromJson(Map<String, dynamic> json) {
    return AnthropicContentBlockParam(
      content: json['content']?.toString(),
      id: json['id']?.toString(),
      input: (() {
        final map = _sdkworkAsMap(json['input']);
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
      name: json['name']?.toString(),
      source: (() {
        final map = _sdkworkAsMap(json['source']);
        return map == null ? null : AnthropicContentSource.fromJson(map);
      })(),
      text: json['text']?.toString(),
      toolUseId: json['tool_use_id']?.toString(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('AnthropicContentBlockParam.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'content': content,
      'id': id,
      'input': input?.map((key, item) => MapEntry(key, item)),
      'name': name,
      'source': source?.toJson(),
      'text': text,
      'tool_use_id': toolUseId,
      'type': type,
    };
  }
}

class AnthropicContentSource {
  final String? data;
  final String? fileId;
  final String? mediaType;
  final String type;
  final String? url;

  AnthropicContentSource({
    this.data,
    this.fileId,
    this.mediaType,
    required this.type,
    this.url
  });

  factory AnthropicContentSource.fromJson(Map<String, dynamic> json) {
    return AnthropicContentSource(
      data: json['data']?.toString(),
      fileId: json['file_id']?.toString(),
      mediaType: json['media_type']?.toString(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('AnthropicContentSource.type is required');
        }
        return value;
      })(),
      url: json['url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data,
      'file_id': fileId,
      'media_type': mediaType,
      'type': type,
      'url': url,
    };
  }
}

class AnthropicCountMessageTokensRequest {
  final int? maxTokens;
  final List<AnthropicMessageParam> messages;
  final Map<String, dynamic>? metadata;
  final String model;
  final List<String>? stopSequences;
  final bool? stream;
  final dynamic system;
  final double? temperature;
  final AnthropicThinkingConfig? thinking;
  final AnthropicToolChoice? toolChoice;
  final List<AnthropicTool>? tools;
  final int? topK;
  final double? topP;

  AnthropicCountMessageTokensRequest({
    this.maxTokens,
    required this.messages,
    this.metadata,
    required this.model,
    this.stopSequences,
    this.stream,
    this.system,
    this.temperature,
    this.thinking,
    this.toolChoice,
    this.tools,
    this.topK,
    this.topP
  });

  factory AnthropicCountMessageTokensRequest.fromJson(Map<String, dynamic> json) {
    return AnthropicCountMessageTokensRequest(
      maxTokens: json['max_tokens'] is int ? json['max_tokens'] : null,
      messages: (() {
        final list = _sdkworkAsList(json['messages']);
        if (list == null) {
          throw FormatException('AnthropicCountMessageTokensRequest.messages is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AnthropicMessageParam.fromJson(map);
      })())
            .whereType<AnthropicMessageParam>()
            .toList();
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
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('AnthropicCountMessageTokensRequest.model is required');
        }
        return value;
      })(),
      stopSequences: (() {
        final list = _sdkworkAsList(json['stop_sequences']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      stream: json['stream'] is bool ? json['stream'] : null,
      system: json['system']?.toString(),
      temperature: json['temperature'] is num ? json['temperature'].toDouble() : null,
      thinking: (() {
        final map = _sdkworkAsMap(json['thinking']);
        return map == null ? null : AnthropicThinkingConfig.fromJson(map);
      })(),
      toolChoice: (() {
        final map = _sdkworkAsMap(json['tool_choice']);
        return map == null ? null : AnthropicToolChoice.fromJson(map);
      })(),
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AnthropicTool.fromJson(map);
      })())
            .whereType<AnthropicTool>()
            .toList();
      })(),
      topK: json['top_k'] is int ? json['top_k'] : null,
      topP: json['top_p'] is num ? json['top_p'].toDouble() : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'max_tokens': maxTokens,
      'messages': messages.map((item) => item.toJson()).toList(),
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'stop_sequences': stopSequences?.map((item) => item).toList(),
      'stream': stream,
      'system': system,
      'temperature': temperature,
      'thinking': thinking?.toJson(),
      'tool_choice': toolChoice?.toJson(),
      'tools': tools?.map((item) => item.toJson()).toList(),
      'top_k': topK,
      'top_p': topP,
    };
  }
}

class AnthropicCountMessageTokensResponse {
  final int inputTokens;

  AnthropicCountMessageTokensResponse({
    required this.inputTokens
  });

  factory AnthropicCountMessageTokensResponse.fromJson(Map<String, dynamic> json) {
    return AnthropicCountMessageTokensResponse(
      inputTokens: (() {
        final value = json['input_tokens'];
        if (value is! int) {
          throw FormatException('AnthropicCountMessageTokensResponse.input_tokens is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'input_tokens': inputTokens,
    };
  }
}

class AnthropicDeleteResponse {
  final bool? deleted;
  final String? id;
  final String? type;

  AnthropicDeleteResponse({
    this.deleted,
    this.id,
    this.type
  });

  factory AnthropicDeleteResponse.fromJson(Map<String, dynamic> json) {
    return AnthropicDeleteResponse(
      deleted: json['deleted'] is bool ? json['deleted'] : null,
      id: json['id']?.toString(),
      type: json['type']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'deleted': deleted,
      'id': id,
      'type': type,
    };
  }
}

class AnthropicFile {
  final String createdAt;
  final bool? downloadable;
  final String filename;
  final String id;
  final String mimeType;
  final int sizeBytes;
  final String type;

  AnthropicFile({
    required this.createdAt,
    this.downloadable,
    required this.filename,
    required this.id,
    required this.mimeType,
    required this.sizeBytes,
    required this.type
  });

  factory AnthropicFile.fromJson(Map<String, dynamic> json) {
    return AnthropicFile(
      createdAt: (() {
        final value = json['created_at']?.toString();
        if (value == null) {
          throw FormatException('AnthropicFile.created_at is required');
        }
        return value;
      })(),
      downloadable: json['downloadable'] is bool ? json['downloadable'] : null,
      filename: (() {
        final value = json['filename']?.toString();
        if (value == null) {
          throw FormatException('AnthropicFile.filename is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AnthropicFile.id is required');
        }
        return value;
      })(),
      mimeType: (() {
        final value = json['mime_type']?.toString();
        if (value == null) {
          throw FormatException('AnthropicFile.mime_type is required');
        }
        return value;
      })(),
      sizeBytes: (() {
        final value = json['size_bytes'];
        if (value is! int) {
          throw FormatException('AnthropicFile.size_bytes is required');
        }
        return value;
      })(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('AnthropicFile.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created_at': createdAt,
      'downloadable': downloadable,
      'filename': filename,
      'id': id,
      'mime_type': mimeType,
      'size_bytes': sizeBytes,
      'type': type,
    };
  }
}

class AnthropicFileListResponse {
  final List<AnthropicFile> data;
  final String? firstId;
  final bool? hasMore;
  final String? lastId;

  AnthropicFileListResponse({
    required this.data,
    this.firstId,
    this.hasMore,
    this.lastId
  });

  factory AnthropicFileListResponse.fromJson(Map<String, dynamic> json) {
    return AnthropicFileListResponse(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          throw FormatException('AnthropicFileListResponse.data is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AnthropicFile.fromJson(map);
      })())
            .whereType<AnthropicFile>()
            .toList();
      })(),
      firstId: json['first_id']?.toString(),
      hasMore: json['has_more'] is bool ? json['has_more'] : null,
      lastId: json['last_id']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data.map((item) => item.toJson()).toList(),
      'first_id': firstId,
      'has_more': hasMore,
      'last_id': lastId,
    };
  }
}

class AnthropicFileUploadMultipartRequest {
  final String file;

  AnthropicFileUploadMultipartRequest({
    required this.file
  });

  factory AnthropicFileUploadMultipartRequest.fromJson(Map<String, dynamic> json) {
    return AnthropicFileUploadMultipartRequest(
      file: (() {
        final value = json['file']?.toString();
        if (value == null) {
          throw FormatException('AnthropicFileUploadMultipartRequest.file is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'file': file,
    };
  }
}

class AnthropicMessage {
  final List<AnthropicContentBlock> content;
  final String id;
  final String model;
  final String role;
  final String stopReason;
  final String? stopSequence;
  final String type;
  final AnthropicUsage usage;

  AnthropicMessage({
    required this.content,
    required this.id,
    required this.model,
    required this.role,
    required this.stopReason,
    this.stopSequence,
    required this.type,
    required this.usage
  });

  factory AnthropicMessage.fromJson(Map<String, dynamic> json) {
    return AnthropicMessage(
      content: (() {
        final list = _sdkworkAsList(json['content']);
        if (list == null) {
          throw FormatException('AnthropicMessage.content is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AnthropicContentBlock.fromJson(map);
      })())
            .whereType<AnthropicContentBlock>()
            .toList();
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AnthropicMessage.id is required');
        }
        return value;
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('AnthropicMessage.model is required');
        }
        return value;
      })(),
      role: (() {
        final value = json['role']?.toString();
        if (value == null) {
          throw FormatException('AnthropicMessage.role is required');
        }
        return value;
      })(),
      stopReason: (() {
        final value = json['stop_reason']?.toString();
        if (value == null) {
          throw FormatException('AnthropicMessage.stop_reason is required');
        }
        return value;
      })(),
      stopSequence: json['stop_sequence']?.toString(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('AnthropicMessage.type is required');
        }
        return value;
      })(),
      usage: (() {
        final map = _sdkworkAsMap(json['usage']);
        if (map == null) {
          throw FormatException('AnthropicMessage.usage is required');
        }
        return AnthropicUsage.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'content': content.map((item) => item.toJson()).toList(),
      'id': id,
      'model': model,
      'role': role,
      'stop_reason': stopReason,
      'stop_sequence': stopSequence,
      'type': type,
      'usage': usage.toJson(),
    };
  }
}

class AnthropicMessageBatch {
  final String? cancelInitiatedAt;
  final String? createdAt;
  final String? endedAt;
  final String? expiresAt;
  final String id;
  final String processingStatus;
  final AnthropicMessageBatchRequestCounts requestCounts;
  final String? resultsUrl;
  final String type;

  AnthropicMessageBatch({
    this.cancelInitiatedAt,
    this.createdAt,
    this.endedAt,
    this.expiresAt,
    required this.id,
    required this.processingStatus,
    required this.requestCounts,
    this.resultsUrl,
    required this.type
  });

  factory AnthropicMessageBatch.fromJson(Map<String, dynamic> json) {
    return AnthropicMessageBatch(
      cancelInitiatedAt: json['cancel_initiated_at']?.toString(),
      createdAt: json['created_at']?.toString(),
      endedAt: json['ended_at']?.toString(),
      expiresAt: json['expires_at']?.toString(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AnthropicMessageBatch.id is required');
        }
        return value;
      })(),
      processingStatus: (() {
        final value = json['processing_status']?.toString();
        if (value == null) {
          throw FormatException('AnthropicMessageBatch.processing_status is required');
        }
        return value;
      })(),
      requestCounts: (() {
        final map = _sdkworkAsMap(json['request_counts']);
        if (map == null) {
          throw FormatException('AnthropicMessageBatch.request_counts is required');
        }
        return AnthropicMessageBatchRequestCounts.fromJson(map);
      })(),
      resultsUrl: json['results_url']?.toString(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('AnthropicMessageBatch.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cancel_initiated_at': cancelInitiatedAt,
      'created_at': createdAt,
      'ended_at': endedAt,
      'expires_at': expiresAt,
      'id': id,
      'processing_status': processingStatus,
      'request_counts': requestCounts.toJson(),
      'results_url': resultsUrl,
      'type': type,
    };
  }
}

class AnthropicMessageBatchCreateRequest {
  final List<AnthropicMessageBatchRequest> requests;

  AnthropicMessageBatchCreateRequest({
    required this.requests
  });

  factory AnthropicMessageBatchCreateRequest.fromJson(Map<String, dynamic> json) {
    return AnthropicMessageBatchCreateRequest(
      requests: (() {
        final list = _sdkworkAsList(json['requests']);
        if (list == null) {
          throw FormatException('AnthropicMessageBatchCreateRequest.requests is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AnthropicMessageBatchRequest.fromJson(map);
      })())
            .whereType<AnthropicMessageBatchRequest>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'requests': requests.map((item) => item.toJson()).toList(),
    };
  }
}

class AnthropicMessageBatchListResponse {
  final List<AnthropicMessageBatch> data;
  final String? firstId;
  final bool? hasMore;
  final String? lastId;

  AnthropicMessageBatchListResponse({
    required this.data,
    this.firstId,
    this.hasMore,
    this.lastId
  });

  factory AnthropicMessageBatchListResponse.fromJson(Map<String, dynamic> json) {
    return AnthropicMessageBatchListResponse(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          throw FormatException('AnthropicMessageBatchListResponse.data is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AnthropicMessageBatch.fromJson(map);
      })())
            .whereType<AnthropicMessageBatch>()
            .toList();
      })(),
      firstId: json['first_id']?.toString(),
      hasMore: json['has_more'] is bool ? json['has_more'] : null,
      lastId: json['last_id']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data.map((item) => item.toJson()).toList(),
      'first_id': firstId,
      'has_more': hasMore,
      'last_id': lastId,
    };
  }
}

class AnthropicMessageBatchRequest {
  final String customId;
  final AnthropicMessageCreateRequest params;

  AnthropicMessageBatchRequest({
    required this.customId,
    required this.params
  });

  factory AnthropicMessageBatchRequest.fromJson(Map<String, dynamic> json) {
    return AnthropicMessageBatchRequest(
      customId: (() {
        final value = json['custom_id']?.toString();
        if (value == null) {
          throw FormatException('AnthropicMessageBatchRequest.custom_id is required');
        }
        return value;
      })(),
      params: (() {
        final map = _sdkworkAsMap(json['params']);
        if (map == null) {
          throw FormatException('AnthropicMessageBatchRequest.params is required');
        }
        return AnthropicMessageCreateRequest.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'custom_id': customId,
      'params': params.toJson(),
    };
  }
}

class AnthropicMessageBatchRequestCounts {
  final int? canceled;
  final int? errored;
  final int? expired;
  final int? processing;
  final int? succeeded;

  AnthropicMessageBatchRequestCounts({
    this.canceled,
    this.errored,
    this.expired,
    this.processing,
    this.succeeded
  });

  factory AnthropicMessageBatchRequestCounts.fromJson(Map<String, dynamic> json) {
    return AnthropicMessageBatchRequestCounts(
      canceled: json['canceled'] is int ? json['canceled'] : null,
      errored: json['errored'] is int ? json['errored'] : null,
      expired: json['expired'] is int ? json['expired'] : null,
      processing: json['processing'] is int ? json['processing'] : null,
      succeeded: json['succeeded'] is int ? json['succeeded'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'canceled': canceled,
      'errored': errored,
      'expired': expired,
      'processing': processing,
      'succeeded': succeeded,
    };
  }
}

class AnthropicMessageCreateRequest {
  final int maxTokens;
  final List<AnthropicMessageParam> messages;
  final Map<String, dynamic>? metadata;
  final String model;
  final List<String>? stopSequences;
  final bool? stream;
  final dynamic system;
  final double? temperature;
  final AnthropicThinkingConfig? thinking;
  final AnthropicToolChoice? toolChoice;
  final List<AnthropicTool>? tools;
  final int? topK;
  final double? topP;

  AnthropicMessageCreateRequest({
    required this.maxTokens,
    required this.messages,
    this.metadata,
    required this.model,
    this.stopSequences,
    this.stream,
    this.system,
    this.temperature,
    this.thinking,
    this.toolChoice,
    this.tools,
    this.topK,
    this.topP
  });

  factory AnthropicMessageCreateRequest.fromJson(Map<String, dynamic> json) {
    return AnthropicMessageCreateRequest(
      maxTokens: (() {
        final value = json['max_tokens'];
        if (value is! int) {
          throw FormatException('AnthropicMessageCreateRequest.max_tokens is required');
        }
        return value;
      })(),
      messages: (() {
        final list = _sdkworkAsList(json['messages']);
        if (list == null) {
          throw FormatException('AnthropicMessageCreateRequest.messages is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AnthropicMessageParam.fromJson(map);
      })())
            .whereType<AnthropicMessageParam>()
            .toList();
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
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('AnthropicMessageCreateRequest.model is required');
        }
        return value;
      })(),
      stopSequences: (() {
        final list = _sdkworkAsList(json['stop_sequences']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      stream: json['stream'] is bool ? json['stream'] : null,
      system: json['system']?.toString(),
      temperature: json['temperature'] is num ? json['temperature'].toDouble() : null,
      thinking: (() {
        final map = _sdkworkAsMap(json['thinking']);
        return map == null ? null : AnthropicThinkingConfig.fromJson(map);
      })(),
      toolChoice: (() {
        final map = _sdkworkAsMap(json['tool_choice']);
        return map == null ? null : AnthropicToolChoice.fromJson(map);
      })(),
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AnthropicTool.fromJson(map);
      })())
            .whereType<AnthropicTool>()
            .toList();
      })(),
      topK: json['top_k'] is int ? json['top_k'] : null,
      topP: json['top_p'] is num ? json['top_p'].toDouble() : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'max_tokens': maxTokens,
      'messages': messages.map((item) => item.toJson()).toList(),
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'stop_sequences': stopSequences?.map((item) => item).toList(),
      'stream': stream,
      'system': system,
      'temperature': temperature,
      'thinking': thinking?.toJson(),
      'tool_choice': toolChoice?.toJson(),
      'tools': tools?.map((item) => item.toJson()).toList(),
      'top_k': topK,
      'top_p': topP,
    };
  }
}

class AnthropicMessageParam {
  final dynamic content;
  final String role;

  AnthropicMessageParam({
    required this.content,
    required this.role
  });

  factory AnthropicMessageParam.fromJson(Map<String, dynamic> json) {
    return AnthropicMessageParam(
      content: (() {
        final value = json['content']?.toString();
        if (value == null) {
          throw FormatException('AnthropicMessageParam.content is required');
        }
        return value;
      })(),
      role: (() {
        final value = json['role']?.toString();
        if (value == null) {
          throw FormatException('AnthropicMessageParam.role is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'content': content,
      'role': role,
    };
  }
}

class AnthropicThinkingConfig {
  final int? budgetTokens;
  final String type;

  AnthropicThinkingConfig({
    this.budgetTokens,
    required this.type
  });

  factory AnthropicThinkingConfig.fromJson(Map<String, dynamic> json) {
    return AnthropicThinkingConfig(
      budgetTokens: json['budget_tokens'] is int ? json['budget_tokens'] : null,
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('AnthropicThinkingConfig.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'budget_tokens': budgetTokens,
      'type': type,
    };
  }
}

class AnthropicTool {
  final String? description;
  final ProviderJsonSchema inputSchema;
  final String name;

  AnthropicTool({
    this.description,
    required this.inputSchema,
    required this.name
  });

  factory AnthropicTool.fromJson(Map<String, dynamic> json) {
    return AnthropicTool(
      description: json['description']?.toString(),
      inputSchema: (() {
        final map = _sdkworkAsMap(json['input_schema']);
        if (map == null) {
          throw FormatException('AnthropicTool.input_schema is required');
        }
        return ProviderJsonSchema.fromJson(map);
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AnthropicTool.name is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'description': description,
      'input_schema': inputSchema.toJson(),
      'name': name,
    };
  }
}

class AnthropicToolChoice {
  final String? name;
  final String type;

  AnthropicToolChoice({
    this.name,
    required this.type
  });

  factory AnthropicToolChoice.fromJson(Map<String, dynamic> json) {
    return AnthropicToolChoice(
      name: json['name']?.toString(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('AnthropicToolChoice.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'name': name,
      'type': type,
    };
  }
}

class AnthropicUsage {
  final int? cacheCreationInputTokens;
  final int? cacheReadInputTokens;
  final int? inputTokens;
  final int? outputTokens;

  AnthropicUsage({
    this.cacheCreationInputTokens,
    this.cacheReadInputTokens,
    this.inputTokens,
    this.outputTokens
  });

  factory AnthropicUsage.fromJson(Map<String, dynamic> json) {
    return AnthropicUsage(
      cacheCreationInputTokens: json['cache_creation_input_tokens'] is int ? json['cache_creation_input_tokens'] : null,
      cacheReadInputTokens: json['cache_read_input_tokens'] is int ? json['cache_read_input_tokens'] : null,
      inputTokens: json['input_tokens'] is int ? json['input_tokens'] : null,
      outputTokens: json['output_tokens'] is int ? json['output_tokens'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cache_creation_input_tokens': cacheCreationInputTokens,
      'cache_read_input_tokens': cacheReadInputTokens,
      'input_tokens': inputTokens,
      'output_tokens': outputTokens,
    };
  }
}

class CreateCompletionChoice {
  final String? finishReason;
  final int? index;
  final CreateCompletionLogprobs? logprobs;
  final String? text;

  CreateCompletionChoice({
    this.finishReason,
    this.index,
    this.logprobs,
    this.text
  });

  factory CreateCompletionChoice.fromJson(Map<String, dynamic> json) {
    return CreateCompletionChoice(
      finishReason: json['finish_reason']?.toString(),
      index: json['index'] is int ? json['index'] : null,
      logprobs: (() {
        final map = _sdkworkAsMap(json['logprobs']);
        return map == null ? null : CreateCompletionLogprobs.fromJson(map);
      })(),
      text: json['text']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'finish_reason': finishReason,
      'index': index,
      'logprobs': logprobs?.toJson(),
      'text': text,
    };
  }
}

class CreateCompletionLogprobs {
  final List<int>? textOffset;
  final List<double>? tokenLogprobs;
  final List<String>? tokens;
  final List<Map<String, dynamic>>? topLogprobs;

  CreateCompletionLogprobs({
    this.textOffset,
    this.tokenLogprobs,
    this.tokens,
    this.topLogprobs
  });

  factory CreateCompletionLogprobs.fromJson(Map<String, dynamic> json) {
    return CreateCompletionLogprobs(
      textOffset: (() {
        final list = _sdkworkAsList(json['text_offset']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item is int ? item : null)
            .whereType<int>()
            .toList();
      })(),
      tokenLogprobs: (() {
        final list = _sdkworkAsList(json['token_logprobs']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item is num ? item.toDouble() : null)
            .whereType<double>()
            .toList();
      })(),
      tokens: (() {
        final list = _sdkworkAsList(json['tokens']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      topLogprobs: (() {
        final list = _sdkworkAsList(json['top_logprobs']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, dynamic>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem;
          result[key] = deserialized;
        });
        return result;
      })())
            .whereType<Map<String, dynamic>>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'text_offset': textOffset?.map((item) => item).toList(),
      'token_logprobs': tokenLogprobs?.map((item) => item).toList(),
      'tokens': tokens?.map((item) => item).toList(),
      'top_logprobs': topLogprobs?.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
    };
  }
}

class DeleteResult {
  final bool deleted;
  final String id;
  final String object;

  DeleteResult({
    required this.deleted,
    required this.id,
    required this.object
  });

  factory DeleteResult.fromJson(Map<String, dynamic> json) {
    return DeleteResult(
      deleted: (() {
        final value = json['deleted'];
        if (value is! bool) {
          throw FormatException('DeleteResult.deleted is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('DeleteResult.id is required');
        }
        return value;
      })(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('DeleteResult.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'deleted': deleted,
      'id': id,
      'object': object,
    };
  }
}

class GoogleBatchEmbedContentsRequest {
  final List<GoogleEmbedContentRequest> requests;

  GoogleBatchEmbedContentsRequest({
    required this.requests
  });

  factory GoogleBatchEmbedContentsRequest.fromJson(Map<String, dynamic> json) {
    return GoogleBatchEmbedContentsRequest(
      requests: (() {
        final list = _sdkworkAsList(json['requests']);
        if (list == null) {
          throw FormatException('GoogleBatchEmbedContentsRequest.requests is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : GoogleEmbedContentRequest.fromJson(map);
      })())
            .whereType<GoogleEmbedContentRequest>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'requests': requests.map((item) => item.toJson()).toList(),
    };
  }
}

class GoogleBatchEmbedContentsResponse {
  final List<GoogleContentEmbedding>? embeddings;

  GoogleBatchEmbedContentsResponse({
    this.embeddings
  });

  factory GoogleBatchEmbedContentsResponse.fromJson(Map<String, dynamic> json) {
    return GoogleBatchEmbedContentsResponse(
      embeddings: (() {
        final list = _sdkworkAsList(json['embeddings']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : GoogleContentEmbedding.fromJson(map);
      })())
            .whereType<GoogleContentEmbedding>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'embeddings': embeddings?.map((item) => item.toJson()).toList(),
    };
  }
}

class GoogleBlob {
  final String? data;
  final String? mimeType;

  GoogleBlob({
    this.data,
    this.mimeType
  });

  factory GoogleBlob.fromJson(Map<String, dynamic> json) {
    return GoogleBlob(
      data: json['data']?.toString(),
      mimeType: json['mimeType']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data,
      'mimeType': mimeType,
    };
  }
}

class GoogleCachedContent {
  final List<GoogleContent>? contents;
  final String? createTime;
  final String? displayName;
  final String? expireTime;
  final String? model;
  final String? name;
  final GoogleContent? systemInstruction;
  final GoogleToolConfig? toolConfig;
  final List<GoogleTool>? tools;
  final String? updateTime;
  final GoogleCachedContentUsageMetadata? usageMetadata;

  GoogleCachedContent({
    this.contents,
    this.createTime,
    this.displayName,
    this.expireTime,
    this.model,
    this.name,
    this.systemInstruction,
    this.toolConfig,
    this.tools,
    this.updateTime,
    this.usageMetadata
  });

  factory GoogleCachedContent.fromJson(Map<String, dynamic> json) {
    return GoogleCachedContent(
      contents: (() {
        final list = _sdkworkAsList(json['contents']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : GoogleContent.fromJson(map);
      })())
            .whereType<GoogleContent>()
            .toList();
      })(),
      createTime: json['createTime']?.toString(),
      displayName: json['displayName']?.toString(),
      expireTime: json['expireTime']?.toString(),
      model: json['model']?.toString(),
      name: json['name']?.toString(),
      systemInstruction: (() {
        final map = _sdkworkAsMap(json['systemInstruction']);
        return map == null ? null : GoogleContent.fromJson(map);
      })(),
      toolConfig: (() {
        final map = _sdkworkAsMap(json['toolConfig']);
        return map == null ? null : GoogleToolConfig.fromJson(map);
      })(),
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : GoogleTool.fromJson(map);
      })())
            .whereType<GoogleTool>()
            .toList();
      })(),
      updateTime: json['updateTime']?.toString(),
      usageMetadata: (() {
        final map = _sdkworkAsMap(json['usageMetadata']);
        return map == null ? null : GoogleCachedContentUsageMetadata.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'contents': contents?.map((item) => item.toJson()).toList(),
      'createTime': createTime,
      'displayName': displayName,
      'expireTime': expireTime,
      'model': model,
      'name': name,
      'systemInstruction': systemInstruction?.toJson(),
      'toolConfig': toolConfig?.toJson(),
      'tools': tools?.map((item) => item.toJson()).toList(),
      'updateTime': updateTime,
      'usageMetadata': usageMetadata?.toJson(),
    };
  }
}

class GoogleCachedContentCreateRequest {
  final List<GoogleContent>? contents;
  final String? displayName;
  final String? expireTime;
  final String? model;
  final GoogleContent? systemInstruction;
  final GoogleToolConfig? toolConfig;
  final List<GoogleTool>? tools;
  final String? ttl;

  GoogleCachedContentCreateRequest({
    this.contents,
    this.displayName,
    this.expireTime,
    this.model,
    this.systemInstruction,
    this.toolConfig,
    this.tools,
    this.ttl
  });

  factory GoogleCachedContentCreateRequest.fromJson(Map<String, dynamic> json) {
    return GoogleCachedContentCreateRequest(
      contents: (() {
        final list = _sdkworkAsList(json['contents']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : GoogleContent.fromJson(map);
      })())
            .whereType<GoogleContent>()
            .toList();
      })(),
      displayName: json['displayName']?.toString(),
      expireTime: json['expireTime']?.toString(),
      model: json['model']?.toString(),
      systemInstruction: (() {
        final map = _sdkworkAsMap(json['systemInstruction']);
        return map == null ? null : GoogleContent.fromJson(map);
      })(),
      toolConfig: (() {
        final map = _sdkworkAsMap(json['toolConfig']);
        return map == null ? null : GoogleToolConfig.fromJson(map);
      })(),
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : GoogleTool.fromJson(map);
      })())
            .whereType<GoogleTool>()
            .toList();
      })(),
      ttl: json['ttl']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'contents': contents?.map((item) => item.toJson()).toList(),
      'displayName': displayName,
      'expireTime': expireTime,
      'model': model,
      'systemInstruction': systemInstruction?.toJson(),
      'toolConfig': toolConfig?.toJson(),
      'tools': tools?.map((item) => item.toJson()).toList(),
      'ttl': ttl,
    };
  }
}

class GoogleCachedContentListResponse {
  final List<GoogleCachedContent>? cachedContents;
  final String? nextPageToken;

  GoogleCachedContentListResponse({
    this.cachedContents,
    this.nextPageToken
  });

  factory GoogleCachedContentListResponse.fromJson(Map<String, dynamic> json) {
    return GoogleCachedContentListResponse(
      cachedContents: (() {
        final list = _sdkworkAsList(json['cachedContents']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : GoogleCachedContent.fromJson(map);
      })())
            .whereType<GoogleCachedContent>()
            .toList();
      })(),
      nextPageToken: json['nextPageToken']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cachedContents': cachedContents?.map((item) => item.toJson()).toList(),
      'nextPageToken': nextPageToken,
    };
  }
}

class GoogleCachedContentUsageMetadata {
  final int? totalTokenCount;

  GoogleCachedContentUsageMetadata({
    this.totalTokenCount
  });

  factory GoogleCachedContentUsageMetadata.fromJson(Map<String, dynamic> json) {
    return GoogleCachedContentUsageMetadata(
      totalTokenCount: json['totalTokenCount'] is int ? json['totalTokenCount'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'totalTokenCount': totalTokenCount,
    };
  }
}

class GoogleCandidate {
  final GoogleCitationMetadata? citationMetadata;
  final GoogleContent? content;
  final String? finishReason;
  final int? index;
  final List<GoogleSafetyRating>? safetyRatings;
  final int? tokenCount;

  GoogleCandidate({
    this.citationMetadata,
    this.content,
    this.finishReason,
    this.index,
    this.safetyRatings,
    this.tokenCount
  });

  factory GoogleCandidate.fromJson(Map<String, dynamic> json) {
    return GoogleCandidate(
      citationMetadata: (() {
        final map = _sdkworkAsMap(json['citationMetadata']);
        return map == null ? null : GoogleCitationMetadata.fromJson(map);
      })(),
      content: (() {
        final map = _sdkworkAsMap(json['content']);
        return map == null ? null : GoogleContent.fromJson(map);
      })(),
      finishReason: json['finishReason']?.toString(),
      index: json['index'] is int ? json['index'] : null,
      safetyRatings: (() {
        final list = _sdkworkAsList(json['safetyRatings']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : GoogleSafetyRating.fromJson(map);
      })())
            .whereType<GoogleSafetyRating>()
            .toList();
      })(),
      tokenCount: json['tokenCount'] is int ? json['tokenCount'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'citationMetadata': citationMetadata?.toJson(),
      'content': content?.toJson(),
      'finishReason': finishReason,
      'index': index,
      'safetyRatings': safetyRatings?.map((item) => item.toJson()).toList(),
      'tokenCount': tokenCount,
    };
  }
}

class GoogleCitationMetadata {
  final List<GoogleCitationSource>? citationSources;

  GoogleCitationMetadata({
    this.citationSources
  });

  factory GoogleCitationMetadata.fromJson(Map<String, dynamic> json) {
    return GoogleCitationMetadata(
      citationSources: (() {
        final list = _sdkworkAsList(json['citationSources']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : GoogleCitationSource.fromJson(map);
      })())
            .whereType<GoogleCitationSource>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'citationSources': citationSources?.map((item) => item.toJson()).toList(),
    };
  }
}

class GoogleCitationSource {
  final int? endIndex;
  final String? license;
  final int? startIndex;
  final String? uri;

  GoogleCitationSource({
    this.endIndex,
    this.license,
    this.startIndex,
    this.uri
  });

  factory GoogleCitationSource.fromJson(Map<String, dynamic> json) {
    return GoogleCitationSource(
      endIndex: json['endIndex'] is int ? json['endIndex'] : null,
      license: json['license']?.toString(),
      startIndex: json['startIndex'] is int ? json['startIndex'] : null,
      uri: json['uri']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'endIndex': endIndex,
      'license': license,
      'startIndex': startIndex,
      'uri': uri,
    };
  }
}

class GoogleCodeExecutionResult {
  final String? outcome;
  final String? output;

  GoogleCodeExecutionResult({
    this.outcome,
    this.output
  });

  factory GoogleCodeExecutionResult.fromJson(Map<String, dynamic> json) {
    return GoogleCodeExecutionResult(
      outcome: json['outcome']?.toString(),
      output: json['output']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'outcome': outcome,
      'output': output,
    };
  }
}

class GoogleCodeExecutionTool {
  final bool? enabled;

  GoogleCodeExecutionTool({
    this.enabled
  });

  factory GoogleCodeExecutionTool.fromJson(Map<String, dynamic> json) {
    return GoogleCodeExecutionTool(
      enabled: json['enabled'] is bool ? json['enabled'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'enabled': enabled,
    };
  }
}

class GoogleContent {
  final List<GooglePart>? parts;
  final String? role;

  GoogleContent({
    this.parts,
    this.role
  });

  factory GoogleContent.fromJson(Map<String, dynamic> json) {
    return GoogleContent(
      parts: (() {
        final list = _sdkworkAsList(json['parts']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : GooglePart.fromJson(map);
      })())
            .whereType<GooglePart>()
            .toList();
      })(),
      role: json['role']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'parts': parts?.map((item) => item.toJson()).toList(),
      'role': role,
    };
  }
}

class GoogleContentEmbedding {
  final List<double>? values;

  GoogleContentEmbedding({
    this.values
  });

  factory GoogleContentEmbedding.fromJson(Map<String, dynamic> json) {
    return GoogleContentEmbedding(
      values: (() {
        final list = _sdkworkAsList(json['values']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item is num ? item.toDouble() : null)
            .whereType<double>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'values': values?.map((item) => item).toList(),
    };
  }
}

class GoogleCountTokensRequest {
  final List<GoogleContent>? contents;
  final GoogleGenerateContentRequest? generateContentRequest;

  GoogleCountTokensRequest({
    this.contents,
    this.generateContentRequest
  });

  factory GoogleCountTokensRequest.fromJson(Map<String, dynamic> json) {
    return GoogleCountTokensRequest(
      contents: (() {
        final list = _sdkworkAsList(json['contents']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : GoogleContent.fromJson(map);
      })())
            .whereType<GoogleContent>()
            .toList();
      })(),
      generateContentRequest: (() {
        final map = _sdkworkAsMap(json['generateContentRequest']);
        return map == null ? null : GoogleGenerateContentRequest.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'contents': contents?.map((item) => item.toJson()).toList(),
      'generateContentRequest': generateContentRequest?.toJson(),
    };
  }
}

class GoogleCountTokensResponse {
  final int? cachedContentTokenCount;
  final int? totalTokens;

  GoogleCountTokensResponse({
    this.cachedContentTokenCount,
    this.totalTokens
  });

  factory GoogleCountTokensResponse.fromJson(Map<String, dynamic> json) {
    return GoogleCountTokensResponse(
      cachedContentTokenCount: json['cachedContentTokenCount'] is int ? json['cachedContentTokenCount'] : null,
      totalTokens: json['totalTokens'] is int ? json['totalTokens'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cachedContentTokenCount': cachedContentTokenCount,
      'totalTokens': totalTokens,
    };
  }
}

class GoogleDynamicRetrievalConfig {
  final double? dynamicThreshold;
  final String? mode;

  GoogleDynamicRetrievalConfig({
    this.dynamicThreshold,
    this.mode
  });

  factory GoogleDynamicRetrievalConfig.fromJson(Map<String, dynamic> json) {
    return GoogleDynamicRetrievalConfig(
      dynamicThreshold: json['dynamicThreshold'] is num ? json['dynamicThreshold'].toDouble() : null,
      mode: json['mode']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'dynamicThreshold': dynamicThreshold,
      'mode': mode,
    };
  }
}

class GoogleEmbedContentRequest {
  final GoogleContent content;
  final int? outputDimensionality;
  final String? taskType;
  final String? title;

  GoogleEmbedContentRequest({
    required this.content,
    this.outputDimensionality,
    this.taskType,
    this.title
  });

  factory GoogleEmbedContentRequest.fromJson(Map<String, dynamic> json) {
    return GoogleEmbedContentRequest(
      content: (() {
        final map = _sdkworkAsMap(json['content']);
        if (map == null) {
          throw FormatException('GoogleEmbedContentRequest.content is required');
        }
        return GoogleContent.fromJson(map);
      })(),
      outputDimensionality: json['outputDimensionality'] is int ? json['outputDimensionality'] : null,
      taskType: json['taskType']?.toString(),
      title: json['title']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'content': content.toJson(),
      'outputDimensionality': outputDimensionality,
      'taskType': taskType,
      'title': title,
    };
  }
}

class GoogleEmbedContentResponse {
  final GoogleContentEmbedding? embedding;

  GoogleEmbedContentResponse({
    this.embedding
  });

  factory GoogleEmbedContentResponse.fromJson(Map<String, dynamic> json) {
    return GoogleEmbedContentResponse(
      embedding: (() {
        final map = _sdkworkAsMap(json['embedding']);
        return map == null ? null : GoogleContentEmbedding.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'embedding': embedding?.toJson(),
    };
  }
}

class GoogleEmptyResponse {
  final String object;

  GoogleEmptyResponse({
    required this.object
  });

  factory GoogleEmptyResponse.fromJson(Map<String, dynamic> json) {
    return GoogleEmptyResponse(
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('GoogleEmptyResponse.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'object': object,
    };
  }
}

class GoogleExecutableCode {
  final String? code;
  final String? language;

  GoogleExecutableCode({
    this.code,
    this.language
  });

  factory GoogleExecutableCode.fromJson(Map<String, dynamic> json) {
    return GoogleExecutableCode(
      code: json['code']?.toString(),
      language: json['language']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'language': language,
    };
  }
}

class GoogleFile {
  final String? createTime;
  final String? displayName;
  final ProviderTaskError? error;
  final String? expirationTime;
  final String? mimeType;
  final String? name;
  final String? sha256Hash;
  final String? sizeBytes;
  final String? state;
  final String? updateTime;
  final String? uri;

  GoogleFile({
    this.createTime,
    this.displayName,
    this.error,
    this.expirationTime,
    this.mimeType,
    this.name,
    this.sha256Hash,
    this.sizeBytes,
    this.state,
    this.updateTime,
    this.uri
  });

  factory GoogleFile.fromJson(Map<String, dynamic> json) {
    return GoogleFile(
      createTime: json['createTime']?.toString(),
      displayName: json['displayName']?.toString(),
      error: (() {
        final map = _sdkworkAsMap(json['error']);
        return map == null ? null : ProviderTaskError.fromJson(map);
      })(),
      expirationTime: json['expirationTime']?.toString(),
      mimeType: json['mimeType']?.toString(),
      name: json['name']?.toString(),
      sha256Hash: json['sha256Hash']?.toString(),
      sizeBytes: json['sizeBytes']?.toString(),
      state: json['state']?.toString(),
      updateTime: json['updateTime']?.toString(),
      uri: json['uri']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'createTime': createTime,
      'displayName': displayName,
      'error': error?.toJson(),
      'expirationTime': expirationTime,
      'mimeType': mimeType,
      'name': name,
      'sha256Hash': sha256Hash,
      'sizeBytes': sizeBytes,
      'state': state,
      'updateTime': updateTime,
      'uri': uri,
    };
  }
}

class GoogleFileData {
  final String? fileUri;
  final String? mimeType;

  GoogleFileData({
    this.fileUri,
    this.mimeType
  });

  factory GoogleFileData.fromJson(Map<String, dynamic> json) {
    return GoogleFileData(
      fileUri: json['fileUri']?.toString(),
      mimeType: json['mimeType']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'fileUri': fileUri,
      'mimeType': mimeType,
    };
  }
}

class GoogleFileListResponse {
  final List<GoogleFile>? files;
  final String? nextPageToken;

  GoogleFileListResponse({
    this.files,
    this.nextPageToken
  });

  factory GoogleFileListResponse.fromJson(Map<String, dynamic> json) {
    return GoogleFileListResponse(
      files: (() {
        final list = _sdkworkAsList(json['files']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : GoogleFile.fromJson(map);
      })())
            .whereType<GoogleFile>()
            .toList();
      })(),
      nextPageToken: json['nextPageToken']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'files': files?.map((item) => item.toJson()).toList(),
      'nextPageToken': nextPageToken,
    };
  }
}

class GoogleFileUploadMultipartRequest {
  final String file;
  final String? metadata;

  GoogleFileUploadMultipartRequest({
    required this.file,
    this.metadata
  });

  factory GoogleFileUploadMultipartRequest.fromJson(Map<String, dynamic> json) {
    return GoogleFileUploadMultipartRequest(
      file: (() {
        final value = json['file']?.toString();
        if (value == null) {
          throw FormatException('GoogleFileUploadMultipartRequest.file is required');
        }
        return value;
      })(),
      metadata: json['metadata']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'file': file,
      'metadata': metadata,
    };
  }
}

class GoogleFunctionCall {
  final Map<String, dynamic>? args;
  final String? name;

  GoogleFunctionCall({
    this.args,
    this.name
  });

  factory GoogleFunctionCall.fromJson(Map<String, dynamic> json) {
    return GoogleFunctionCall(
      args: (() {
        final map = _sdkworkAsMap(json['args']);
        if (map == null) {
          return null;
        }
        final result = <String, dynamic>{};
        map.forEach((key, item) {
          final deserialized = item;
          result[key] = deserialized;
        });
        return result;
      })(),
      name: json['name']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'args': args?.map((key, item) => MapEntry(key, item)),
      'name': name,
    };
  }
}

class GoogleFunctionCallingConfig {
  final List<String>? allowedFunctionNames;
  final String? mode;

  GoogleFunctionCallingConfig({
    this.allowedFunctionNames,
    this.mode
  });

  factory GoogleFunctionCallingConfig.fromJson(Map<String, dynamic> json) {
    return GoogleFunctionCallingConfig(
      allowedFunctionNames: (() {
        final list = _sdkworkAsList(json['allowedFunctionNames']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      mode: json['mode']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'allowedFunctionNames': allowedFunctionNames?.map((item) => item).toList(),
      'mode': mode,
    };
  }
}

class GoogleFunctionDeclaration {
  final String? description;
  final String name;
  final GoogleSchema? parameters;
  final GoogleSchema? response;

  GoogleFunctionDeclaration({
    this.description,
    required this.name,
    this.parameters,
    this.response
  });

  factory GoogleFunctionDeclaration.fromJson(Map<String, dynamic> json) {
    return GoogleFunctionDeclaration(
      description: json['description']?.toString(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('GoogleFunctionDeclaration.name is required');
        }
        return value;
      })(),
      parameters: (() {
        final map = _sdkworkAsMap(json['parameters']);
        return map == null ? null : GoogleSchema.fromJson(map);
      })(),
      response: (() {
        final map = _sdkworkAsMap(json['response']);
        return map == null ? null : GoogleSchema.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'description': description,
      'name': name,
      'parameters': parameters?.toJson(),
      'response': response?.toJson(),
    };
  }
}

class GoogleFunctionResponse {
  final String? name;
  final Map<String, dynamic>? response;

  GoogleFunctionResponse({
    this.name,
    this.response
  });

  factory GoogleFunctionResponse.fromJson(Map<String, dynamic> json) {
    return GoogleFunctionResponse(
      name: json['name']?.toString(),
      response: (() {
        final map = _sdkworkAsMap(json['response']);
        if (map == null) {
          return null;
        }
        final result = <String, dynamic>{};
        map.forEach((key, item) {
          final deserialized = item;
          result[key] = deserialized;
        });
        return result;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'name': name,
      'response': response?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class GoogleGenerateContentRequest {
  final String? cachedContent;
  final List<GoogleContent> contents;
  final GoogleGenerationConfig? generationConfig;
  final List<GoogleSafetySetting>? safetySettings;
  final GoogleContent? systemInstruction;
  final GoogleToolConfig? toolConfig;
  final List<GoogleTool>? tools;

  GoogleGenerateContentRequest({
    this.cachedContent,
    required this.contents,
    this.generationConfig,
    this.safetySettings,
    this.systemInstruction,
    this.toolConfig,
    this.tools
  });

  factory GoogleGenerateContentRequest.fromJson(Map<String, dynamic> json) {
    return GoogleGenerateContentRequest(
      cachedContent: json['cachedContent']?.toString(),
      contents: (() {
        final list = _sdkworkAsList(json['contents']);
        if (list == null) {
          throw FormatException('GoogleGenerateContentRequest.contents is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : GoogleContent.fromJson(map);
      })())
            .whereType<GoogleContent>()
            .toList();
      })(),
      generationConfig: (() {
        final map = _sdkworkAsMap(json['generationConfig']);
        return map == null ? null : GoogleGenerationConfig.fromJson(map);
      })(),
      safetySettings: (() {
        final list = _sdkworkAsList(json['safetySettings']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : GoogleSafetySetting.fromJson(map);
      })())
            .whereType<GoogleSafetySetting>()
            .toList();
      })(),
      systemInstruction: (() {
        final map = _sdkworkAsMap(json['systemInstruction']);
        return map == null ? null : GoogleContent.fromJson(map);
      })(),
      toolConfig: (() {
        final map = _sdkworkAsMap(json['toolConfig']);
        return map == null ? null : GoogleToolConfig.fromJson(map);
      })(),
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : GoogleTool.fromJson(map);
      })())
            .whereType<GoogleTool>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cachedContent': cachedContent,
      'contents': contents.map((item) => item.toJson()).toList(),
      'generationConfig': generationConfig?.toJson(),
      'safetySettings': safetySettings?.map((item) => item.toJson()).toList(),
      'systemInstruction': systemInstruction?.toJson(),
      'toolConfig': toolConfig?.toJson(),
      'tools': tools?.map((item) => item.toJson()).toList(),
    };
  }
}

class GoogleGenerateContentResponse {
  final List<GoogleCandidate>? candidates;
  final String? modelVersion;
  final GooglePromptFeedback? promptFeedback;
  final String? responseId;
  final GoogleUsageMetadata? usageMetadata;

  GoogleGenerateContentResponse({
    this.candidates,
    this.modelVersion,
    this.promptFeedback,
    this.responseId,
    this.usageMetadata
  });

  factory GoogleGenerateContentResponse.fromJson(Map<String, dynamic> json) {
    return GoogleGenerateContentResponse(
      candidates: (() {
        final list = _sdkworkAsList(json['candidates']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : GoogleCandidate.fromJson(map);
      })())
            .whereType<GoogleCandidate>()
            .toList();
      })(),
      modelVersion: json['modelVersion']?.toString(),
      promptFeedback: (() {
        final map = _sdkworkAsMap(json['promptFeedback']);
        return map == null ? null : GooglePromptFeedback.fromJson(map);
      })(),
      responseId: json['responseId']?.toString(),
      usageMetadata: (() {
        final map = _sdkworkAsMap(json['usageMetadata']);
        return map == null ? null : GoogleUsageMetadata.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'candidates': candidates?.map((item) => item.toJson()).toList(),
      'modelVersion': modelVersion,
      'promptFeedback': promptFeedback?.toJson(),
      'responseId': responseId,
      'usageMetadata': usageMetadata?.toJson(),
    };
  }
}

class GoogleGenerationConfig {
  final int? candidateCount;
  final int? maxOutputTokens;
  final String? responseMimeType;
  final GoogleSchema? responseSchema;
  final List<String>? stopSequences;
  final double? temperature;
  final GoogleThinkingConfig? thinkingConfig;
  final int? topK;
  final double? topP;

  GoogleGenerationConfig({
    this.candidateCount,
    this.maxOutputTokens,
    this.responseMimeType,
    this.responseSchema,
    this.stopSequences,
    this.temperature,
    this.thinkingConfig,
    this.topK,
    this.topP
  });

  factory GoogleGenerationConfig.fromJson(Map<String, dynamic> json) {
    return GoogleGenerationConfig(
      candidateCount: json['candidateCount'] is int ? json['candidateCount'] : null,
      maxOutputTokens: json['maxOutputTokens'] is int ? json['maxOutputTokens'] : null,
      responseMimeType: json['responseMimeType']?.toString(),
      responseSchema: (() {
        final map = _sdkworkAsMap(json['responseSchema']);
        return map == null ? null : GoogleSchema.fromJson(map);
      })(),
      stopSequences: (() {
        final list = _sdkworkAsList(json['stopSequences']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      temperature: json['temperature'] is num ? json['temperature'].toDouble() : null,
      thinkingConfig: (() {
        final map = _sdkworkAsMap(json['thinkingConfig']);
        return map == null ? null : GoogleThinkingConfig.fromJson(map);
      })(),
      topK: json['topK'] is int ? json['topK'] : null,
      topP: json['topP'] is num ? json['topP'].toDouble() : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'candidateCount': candidateCount,
      'maxOutputTokens': maxOutputTokens,
      'responseMimeType': responseMimeType,
      'responseSchema': responseSchema?.toJson(),
      'stopSequences': stopSequences?.map((item) => item).toList(),
      'temperature': temperature,
      'thinkingConfig': thinkingConfig?.toJson(),
      'topK': topK,
      'topP': topP,
    };
  }
}

class GooglePart {
  final GoogleCodeExecutionResult? codeExecutionResult;
  final GoogleExecutableCode? executableCode;
  final GoogleFileData? fileData;
  final GoogleFunctionCall? functionCall;
  final GoogleFunctionResponse? functionResponse;
  final GoogleBlob? inlineData;
  final String? text;

  GooglePart({
    this.codeExecutionResult,
    this.executableCode,
    this.fileData,
    this.functionCall,
    this.functionResponse,
    this.inlineData,
    this.text
  });

  factory GooglePart.fromJson(Map<String, dynamic> json) {
    return GooglePart(
      codeExecutionResult: (() {
        final map = _sdkworkAsMap(json['codeExecutionResult']);
        return map == null ? null : GoogleCodeExecutionResult.fromJson(map);
      })(),
      executableCode: (() {
        final map = _sdkworkAsMap(json['executableCode']);
        return map == null ? null : GoogleExecutableCode.fromJson(map);
      })(),
      fileData: (() {
        final map = _sdkworkAsMap(json['fileData']);
        return map == null ? null : GoogleFileData.fromJson(map);
      })(),
      functionCall: (() {
        final map = _sdkworkAsMap(json['functionCall']);
        return map == null ? null : GoogleFunctionCall.fromJson(map);
      })(),
      functionResponse: (() {
        final map = _sdkworkAsMap(json['functionResponse']);
        return map == null ? null : GoogleFunctionResponse.fromJson(map);
      })(),
      inlineData: (() {
        final map = _sdkworkAsMap(json['inlineData']);
        return map == null ? null : GoogleBlob.fromJson(map);
      })(),
      text: json['text']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'codeExecutionResult': codeExecutionResult?.toJson(),
      'executableCode': executableCode?.toJson(),
      'fileData': fileData?.toJson(),
      'functionCall': functionCall?.toJson(),
      'functionResponse': functionResponse?.toJson(),
      'inlineData': inlineData?.toJson(),
      'text': text,
    };
  }
}

class GooglePromptFeedback {
  final String? blockReason;
  final List<GoogleSafetyRating>? safetyRatings;

  GooglePromptFeedback({
    this.blockReason,
    this.safetyRatings
  });

  factory GooglePromptFeedback.fromJson(Map<String, dynamic> json) {
    return GooglePromptFeedback(
      blockReason: json['blockReason']?.toString(),
      safetyRatings: (() {
        final list = _sdkworkAsList(json['safetyRatings']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : GoogleSafetyRating.fromJson(map);
      })())
            .whereType<GoogleSafetyRating>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'blockReason': blockReason,
      'safetyRatings': safetyRatings?.map((item) => item.toJson()).toList(),
    };
  }
}

class GoogleSafetyRating {
  final bool? blocked;
  final String? category;
  final String? probability;

  GoogleSafetyRating({
    this.blocked,
    this.category,
    this.probability
  });

  factory GoogleSafetyRating.fromJson(Map<String, dynamic> json) {
    return GoogleSafetyRating(
      blocked: json['blocked'] is bool ? json['blocked'] : null,
      category: json['category']?.toString(),
      probability: json['probability']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'blocked': blocked,
      'category': category,
      'probability': probability,
    };
  }
}

class GoogleSafetySetting {
  final String? category;
  final String? threshold;

  GoogleSafetySetting({
    this.category,
    this.threshold
  });

  factory GoogleSafetySetting.fromJson(Map<String, dynamic> json) {
    return GoogleSafetySetting(
      category: json['category']?.toString(),
      threshold: json['threshold']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'category': category,
      'threshold': threshold,
    };
  }
}

class GoogleSchema {
  final String? description;
  final List<String>? enum_;
  final String? format;
  final dynamic items;
  final bool? nullable;
  final Map<String, dynamic>? properties;
  final List<String>? required_;
  final String? type;

  GoogleSchema({
    this.description,
    this.enum_,
    this.format,
    this.items,
    this.nullable,
    this.properties,
    this.required_,
    this.type
  });

  factory GoogleSchema.fromJson(Map<String, dynamic> json) {
    return GoogleSchema(
      description: json['description']?.toString(),
      enum_: (() {
        final list = _sdkworkAsList(json['enum']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      format: json['format']?.toString(),
      items: json['items'],
      nullable: json['nullable'] is bool ? json['nullable'] : null,
      properties: (() {
        final map = _sdkworkAsMap(json['properties']);
        if (map == null) {
          return null;
        }
        final result = <String, dynamic>{};
        map.forEach((key, item) {
          final deserialized = item;
          result[key] = deserialized;
        });
        return result;
      })(),
      required_: (() {
        final list = _sdkworkAsList(json['required']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      type: json['type']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'description': description,
      'enum': enum_?.map((item) => item).toList(),
      'format': format,
      'items': items,
      'nullable': nullable,
      'properties': properties?.map((key, item) => MapEntry(key, item)),
      'required': required_?.map((item) => item).toList(),
      'type': type,
    };
  }
}

class GoogleSearchTool {
  final GoogleDynamicRetrievalConfig? dynamicRetrievalConfig;

  GoogleSearchTool({
    this.dynamicRetrievalConfig
  });

  factory GoogleSearchTool.fromJson(Map<String, dynamic> json) {
    return GoogleSearchTool(
      dynamicRetrievalConfig: (() {
        final map = _sdkworkAsMap(json['dynamicRetrievalConfig']);
        return map == null ? null : GoogleDynamicRetrievalConfig.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'dynamicRetrievalConfig': dynamicRetrievalConfig?.toJson(),
    };
  }
}

class GoogleThinkingConfig {
  final bool? includeThoughts;
  final int? thinkingBudget;

  GoogleThinkingConfig({
    this.includeThoughts,
    this.thinkingBudget
  });

  factory GoogleThinkingConfig.fromJson(Map<String, dynamic> json) {
    return GoogleThinkingConfig(
      includeThoughts: json['includeThoughts'] is bool ? json['includeThoughts'] : null,
      thinkingBudget: json['thinkingBudget'] is int ? json['thinkingBudget'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'includeThoughts': includeThoughts,
      'thinkingBudget': thinkingBudget,
    };
  }
}

class GoogleTool {
  final GoogleCodeExecutionTool? codeExecution;
  final List<GoogleFunctionDeclaration>? functionDeclarations;
  final GoogleSearchTool? googleSearch;
  final GoogleUrlContextTool? urlContext;

  GoogleTool({
    this.codeExecution,
    this.functionDeclarations,
    this.googleSearch,
    this.urlContext
  });

  factory GoogleTool.fromJson(Map<String, dynamic> json) {
    return GoogleTool(
      codeExecution: (() {
        final map = _sdkworkAsMap(json['codeExecution']);
        return map == null ? null : GoogleCodeExecutionTool.fromJson(map);
      })(),
      functionDeclarations: (() {
        final list = _sdkworkAsList(json['functionDeclarations']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : GoogleFunctionDeclaration.fromJson(map);
      })())
            .whereType<GoogleFunctionDeclaration>()
            .toList();
      })(),
      googleSearch: (() {
        final map = _sdkworkAsMap(json['googleSearch']);
        return map == null ? null : GoogleSearchTool.fromJson(map);
      })(),
      urlContext: (() {
        final map = _sdkworkAsMap(json['urlContext']);
        return map == null ? null : GoogleUrlContextTool.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'codeExecution': codeExecution?.toJson(),
      'functionDeclarations': functionDeclarations?.map((item) => item.toJson()).toList(),
      'googleSearch': googleSearch?.toJson(),
      'urlContext': urlContext?.toJson(),
    };
  }
}

class GoogleToolConfig {
  final GoogleFunctionCallingConfig? functionCallingConfig;

  GoogleToolConfig({
    this.functionCallingConfig
  });

  factory GoogleToolConfig.fromJson(Map<String, dynamic> json) {
    return GoogleToolConfig(
      functionCallingConfig: (() {
        final map = _sdkworkAsMap(json['functionCallingConfig']);
        return map == null ? null : GoogleFunctionCallingConfig.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'functionCallingConfig': functionCallingConfig?.toJson(),
    };
  }
}

class GoogleUrlContextTool {
  final List<String>? allowedDomains;

  GoogleUrlContextTool({
    this.allowedDomains
  });

  factory GoogleUrlContextTool.fromJson(Map<String, dynamic> json) {
    return GoogleUrlContextTool(
      allowedDomains: (() {
        final list = _sdkworkAsList(json['allowedDomains']);
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
      'allowedDomains': allowedDomains?.map((item) => item).toList(),
    };
  }
}

class GoogleUsageMetadata {
  final int? cachedContentTokenCount;
  final int? candidatesTokenCount;
  final int? promptTokenCount;
  final int? thoughtsTokenCount;
  final int? totalTokenCount;

  GoogleUsageMetadata({
    this.cachedContentTokenCount,
    this.candidatesTokenCount,
    this.promptTokenCount,
    this.thoughtsTokenCount,
    this.totalTokenCount
  });

  factory GoogleUsageMetadata.fromJson(Map<String, dynamic> json) {
    return GoogleUsageMetadata(
      cachedContentTokenCount: json['cachedContentTokenCount'] is int ? json['cachedContentTokenCount'] : null,
      candidatesTokenCount: json['candidatesTokenCount'] is int ? json['candidatesTokenCount'] : null,
      promptTokenCount: json['promptTokenCount'] is int ? json['promptTokenCount'] : null,
      thoughtsTokenCount: json['thoughtsTokenCount'] is int ? json['thoughtsTokenCount'] : null,
      totalTokenCount: json['totalTokenCount'] is int ? json['totalTokenCount'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cachedContentTokenCount': cachedContentTokenCount,
      'candidatesTokenCount': candidatesTokenCount,
      'promptTokenCount': promptTokenCount,
      'thoughtsTokenCount': thoughtsTokenCount,
      'totalTokenCount': totalTokenCount,
    };
  }
}

class KlingVideoGenerationRequest {
  final String? aspectRatio;
  final String? callbackUrl;
  final double? cfgScale;
  final int? duration;
  final String? image;
  final String? imageTail;
  final String? mode;
  final String? model;
  final String? negativePrompt;
  final String prompt;

  KlingVideoGenerationRequest({
    this.aspectRatio,
    this.callbackUrl,
    this.cfgScale,
    this.duration,
    this.image,
    this.imageTail,
    this.mode,
    this.model,
    this.negativePrompt,
    required this.prompt
  });

  factory KlingVideoGenerationRequest.fromJson(Map<String, dynamic> json) {
    return KlingVideoGenerationRequest(
      aspectRatio: json['aspect_ratio']?.toString(),
      callbackUrl: json['callback_url']?.toString(),
      cfgScale: json['cfg_scale'] is num ? json['cfg_scale'].toDouble() : null,
      duration: json['duration'] is int ? json['duration'] : null,
      image: json['image']?.toString(),
      imageTail: json['image_tail']?.toString(),
      mode: json['mode']?.toString(),
      model: json['model']?.toString(),
      negativePrompt: json['negative_prompt']?.toString(),
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('KlingVideoGenerationRequest.prompt is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'callback_url': callbackUrl,
      'cfg_scale': cfgScale,
      'duration': duration,
      'image': image,
      'image_tail': imageTail,
      'mode': mode,
      'model': model,
      'negative_prompt': negativePrompt,
      'prompt': prompt,
    };
  }
}

class KlingVideoGenerationTask {
  final String? createdAt;
  final ProviderTaskError? error;
  final String? id;
  final String? model;
  final String? prompt;
  final String? state;
  final String? status;
  final String? taskId;
  final String? updatedAt;
  final List<ProviderGeneratedMedia>? videos;

  KlingVideoGenerationTask({
    this.createdAt,
    this.error,
    this.id,
    this.model,
    this.prompt,
    this.state,
    this.status,
    this.taskId,
    this.updatedAt,
    this.videos
  });

  factory KlingVideoGenerationTask.fromJson(Map<String, dynamic> json) {
    return KlingVideoGenerationTask(
      createdAt: json['created_at']?.toString(),
      error: (() {
        final map = _sdkworkAsMap(json['error']);
        return map == null ? null : ProviderTaskError.fromJson(map);
      })(),
      id: json['id']?.toString(),
      model: json['model']?.toString(),
      prompt: json['prompt']?.toString(),
      state: json['state']?.toString(),
      status: json['status']?.toString(),
      taskId: json['task_id']?.toString(),
      updatedAt: json['updated_at']?.toString(),
      videos: (() {
        final list = _sdkworkAsList(json['videos']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ProviderGeneratedMedia.fromJson(map);
      })())
            .whereType<ProviderGeneratedMedia>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created_at': createdAt,
      'error': error?.toJson(),
      'id': id,
      'model': model,
      'prompt': prompt,
      'state': state,
      'status': status,
      'task_id': taskId,
      'updated_at': updatedAt,
      'videos': videos?.map((item) => item.toJson()).toList(),
    };
  }
}

class MidjourneyImageGenerationRequest {
  final String? aspectRatio;
  final String? callbackUrl;
  final String? model;
  final String prompt;
  final int? seed;
  final String? style;

  MidjourneyImageGenerationRequest({
    this.aspectRatio,
    this.callbackUrl,
    this.model,
    required this.prompt,
    this.seed,
    this.style
  });

  factory MidjourneyImageGenerationRequest.fromJson(Map<String, dynamic> json) {
    return MidjourneyImageGenerationRequest(
      aspectRatio: json['aspect_ratio']?.toString(),
      callbackUrl: json['callback_url']?.toString(),
      model: json['model']?.toString(),
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('MidjourneyImageGenerationRequest.prompt is required');
        }
        return value;
      })(),
      seed: json['seed'] is int ? json['seed'] : null,
      style: json['style']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'callback_url': callbackUrl,
      'model': model,
      'prompt': prompt,
      'seed': seed,
      'style': style,
    };
  }
}

class MidjourneyImageGenerationTask {
  final String? createdAt;
  final ProviderTaskError? error;
  final String? id;
  final List<ProviderGeneratedMedia>? images;
  final String? model;
  final String? prompt;
  final String? state;
  final String? status;
  final String? taskId;
  final String? updatedAt;

  MidjourneyImageGenerationTask({
    this.createdAt,
    this.error,
    this.id,
    this.images,
    this.model,
    this.prompt,
    this.state,
    this.status,
    this.taskId,
    this.updatedAt
  });

  factory MidjourneyImageGenerationTask.fromJson(Map<String, dynamic> json) {
    return MidjourneyImageGenerationTask(
      createdAt: json['created_at']?.toString(),
      error: (() {
        final map = _sdkworkAsMap(json['error']);
        return map == null ? null : ProviderTaskError.fromJson(map);
      })(),
      id: json['id']?.toString(),
      images: (() {
        final list = _sdkworkAsList(json['images']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ProviderGeneratedMedia.fromJson(map);
      })())
            .whereType<ProviderGeneratedMedia>()
            .toList();
      })(),
      model: json['model']?.toString(),
      prompt: json['prompt']?.toString(),
      state: json['state']?.toString(),
      status: json['status']?.toString(),
      taskId: json['task_id']?.toString(),
      updatedAt: json['updated_at']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created_at': createdAt,
      'error': error?.toJson(),
      'id': id,
      'images': images?.map((item) => item.toJson()).toList(),
      'model': model,
      'prompt': prompt,
      'state': state,
      'status': status,
      'task_id': taskId,
      'updated_at': updatedAt,
    };
  }
}

class NanoBananaImageGenerationRequest {
  final String? aspectRatio;
  final String? callbackUrl;
  final List<String>? images;
  final String? model;
  final String prompt;
  final int? seed;
  final String? size;

  NanoBananaImageGenerationRequest({
    this.aspectRatio,
    this.callbackUrl,
    this.images,
    this.model,
    required this.prompt,
    this.seed,
    this.size
  });

  factory NanoBananaImageGenerationRequest.fromJson(Map<String, dynamic> json) {
    return NanoBananaImageGenerationRequest(
      aspectRatio: json['aspect_ratio']?.toString(),
      callbackUrl: json['callback_url']?.toString(),
      images: (() {
        final list = _sdkworkAsList(json['images']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      model: json['model']?.toString(),
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('NanoBananaImageGenerationRequest.prompt is required');
        }
        return value;
      })(),
      seed: json['seed'] is int ? json['seed'] : null,
      size: json['size']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'callback_url': callbackUrl,
      'images': images?.map((item) => item).toList(),
      'model': model,
      'prompt': prompt,
      'seed': seed,
      'size': size,
    };
  }
}

class NanoBananaImageGenerationTask {
  final String? createdAt;
  final ProviderTaskError? error;
  final String? id;
  final List<ProviderGeneratedMedia>? images;
  final String? model;
  final String? prompt;
  final String? state;
  final String? status;
  final String? taskId;
  final String? updatedAt;

  NanoBananaImageGenerationTask({
    this.createdAt,
    this.error,
    this.id,
    this.images,
    this.model,
    this.prompt,
    this.state,
    this.status,
    this.taskId,
    this.updatedAt
  });

  factory NanoBananaImageGenerationTask.fromJson(Map<String, dynamic> json) {
    return NanoBananaImageGenerationTask(
      createdAt: json['created_at']?.toString(),
      error: (() {
        final map = _sdkworkAsMap(json['error']);
        return map == null ? null : ProviderTaskError.fromJson(map);
      })(),
      id: json['id']?.toString(),
      images: (() {
        final list = _sdkworkAsList(json['images']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ProviderGeneratedMedia.fromJson(map);
      })())
            .whereType<ProviderGeneratedMedia>()
            .toList();
      })(),
      model: json['model']?.toString(),
      prompt: json['prompt']?.toString(),
      state: json['state']?.toString(),
      status: json['status']?.toString(),
      taskId: json['task_id']?.toString(),
      updatedAt: json['updated_at']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created_at': createdAt,
      'error': error?.toJson(),
      'id': id,
      'images': images?.map((item) => item.toJson()).toList(),
      'model': model,
      'prompt': prompt,
      'state': state,
      'status': status,
      'task_id': taskId,
      'updated_at': updatedAt,
    };
  }
}

class OpenAiAnnotation {
  final int? endIndex;
  final String? fileId;
  final String? filename;
  final int? index;
  final int? startIndex;
  final String? title;
  final String type;
  final String? url;

  OpenAiAnnotation({
    this.endIndex,
    this.fileId,
    this.filename,
    this.index,
    this.startIndex,
    this.title,
    required this.type,
    this.url
  });

  factory OpenAiAnnotation.fromJson(Map<String, dynamic> json) {
    return OpenAiAnnotation(
      endIndex: json['end_index'] is int ? json['end_index'] : null,
      fileId: json['file_id']?.toString(),
      filename: json['filename']?.toString(),
      index: json['index'] is int ? json['index'] : null,
      startIndex: json['start_index'] is int ? json['start_index'] : null,
      title: json['title']?.toString(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('OpenAiAnnotation.type is required');
        }
        return value;
      })(),
      url: json['url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'end_index': endIndex,
      'file_id': fileId,
      'filename': filename,
      'index': index,
      'start_index': startIndex,
      'title': title,
      'type': type,
      'url': url,
    };
  }
}

class OpenAiAssistant {
  final int createdAt;
  final String? description;
  final String id;
  final String? instructions;
  final Map<String, dynamic>? metadata;
  final String model;
  final String? name;
  final String object;
  final dynamic responseFormat;
  final double? temperature;
  final dynamic toolResources;
  final List<dynamic>? tools;
  final double? topP;

  OpenAiAssistant({
    required this.createdAt,
    this.description,
    required this.id,
    this.instructions,
    this.metadata,
    required this.model,
    this.name,
    required this.object,
    this.responseFormat,
    this.temperature,
    this.toolResources,
    this.tools,
    this.topP
  });

  factory OpenAiAssistant.fromJson(Map<String, dynamic> json) {
    return OpenAiAssistant(
      createdAt: (() {
        final value = json['created_at'];
        if (value is! int) {
          throw FormatException('OpenAiAssistant.created_at is required');
        }
        return value;
      })(),
      description: json['description']?.toString(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiAssistant.id is required');
        }
        return value;
      })(),
      instructions: json['instructions']?.toString(),
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
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiAssistant.model is required');
        }
        return value;
      })(),
      name: json['name']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiAssistant.object is required');
        }
        return value;
      })(),
      responseFormat: json['response_format']?.toString(),
      temperature: json['temperature'] is num ? json['temperature'].toDouble() : null,
      toolResources: json['tool_resources']?.toString(),
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<dynamic>()
            .toList();
      })(),
      topP: json['top_p'] is num ? json['top_p'].toDouble() : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created_at': createdAt,
      'description': description,
      'id': id,
      'instructions': instructions,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'name': name,
      'object': object,
      'response_format': responseFormat,
      'temperature': temperature,
      'tool_resources': toolResources,
      'tools': tools?.map((item) => item).toList(),
      'top_p': topP,
    };
  }
}

class OpenAiAssistantCreateRequest {
  final String? description;
  final String? instructions;
  final Map<String, dynamic>? metadata;
  final String model;
  final String? name;
  final dynamic responseFormat;
  final double? temperature;
  final dynamic toolResources;
  final List<dynamic>? tools;
  final double? topP;

  OpenAiAssistantCreateRequest({
    this.description,
    this.instructions,
    this.metadata,
    required this.model,
    this.name,
    this.responseFormat,
    this.temperature,
    this.toolResources,
    this.tools,
    this.topP
  });

  factory OpenAiAssistantCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiAssistantCreateRequest(
      description: json['description']?.toString(),
      instructions: json['instructions']?.toString(),
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
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiAssistantCreateRequest.model is required');
        }
        return value;
      })(),
      name: json['name']?.toString(),
      responseFormat: json['response_format']?.toString(),
      temperature: json['temperature'] is num ? json['temperature'].toDouble() : null,
      toolResources: json['tool_resources']?.toString(),
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<dynamic>()
            .toList();
      })(),
      topP: json['top_p'] is num ? json['top_p'].toDouble() : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'description': description,
      'instructions': instructions,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'name': name,
      'response_format': responseFormat,
      'temperature': temperature,
      'tool_resources': toolResources,
      'tools': tools?.map((item) => item).toList(),
      'top_p': topP,
    };
  }
}

class OpenAiAssistantList {
  final List<OpenAiAssistant> data;
  final String? firstId;
  final bool? hasMore;
  final String? lastId;
  final String object;

  OpenAiAssistantList({
    required this.data,
    this.firstId,
    this.hasMore,
    this.lastId,
    required this.object
  });

  factory OpenAiAssistantList.fromJson(Map<String, dynamic> json) {
    return OpenAiAssistantList(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          throw FormatException('OpenAiAssistantList.data is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiAssistant.fromJson(map);
      })())
            .whereType<OpenAiAssistant>()
            .toList();
      })(),
      firstId: json['first_id']?.toString(),
      hasMore: json['has_more'] is bool ? json['has_more'] : null,
      lastId: json['last_id']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiAssistantList.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data.map((item) => item.toJson()).toList(),
      'first_id': firstId,
      'has_more': hasMore,
      'last_id': lastId,
      'object': object,
    };
  }
}

class OpenAiAssistantUpdateRequest {
  final String? description;
  final String? instructions;
  final Map<String, dynamic>? metadata;
  final String? model;
  final String? name;
  final dynamic responseFormat;
  final double? temperature;
  final dynamic toolResources;
  final List<dynamic>? tools;
  final double? topP;

  OpenAiAssistantUpdateRequest({
    this.description,
    this.instructions,
    this.metadata,
    this.model,
    this.name,
    this.responseFormat,
    this.temperature,
    this.toolResources,
    this.tools,
    this.topP
  });

  factory OpenAiAssistantUpdateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiAssistantUpdateRequest(
      description: json['description']?.toString(),
      instructions: json['instructions']?.toString(),
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
      name: json['name']?.toString(),
      responseFormat: json['response_format']?.toString(),
      temperature: json['temperature'] is num ? json['temperature'].toDouble() : null,
      toolResources: json['tool_resources']?.toString(),
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<dynamic>()
            .toList();
      })(),
      topP: json['top_p'] is num ? json['top_p'].toDouble() : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'description': description,
      'instructions': instructions,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'name': name,
      'response_format': responseFormat,
      'temperature': temperature,
      'tool_resources': toolResources,
      'tools': tools?.map((item) => item).toList(),
      'top_p': topP,
    };
  }
}

class OpenAiAudioTranscription {
  final double? duration;
  final String? language;
  final List<dynamic>? segments;
  final String text;
  final List<dynamic>? words;

  OpenAiAudioTranscription({
    this.duration,
    this.language,
    this.segments,
    required this.text,
    this.words
  });

  factory OpenAiAudioTranscription.fromJson(Map<String, dynamic> json) {
    return OpenAiAudioTranscription(
      duration: json['duration'] is num ? json['duration'].toDouble() : null,
      language: json['language']?.toString(),
      segments: (() {
        final list = _sdkworkAsList(json['segments']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<dynamic>()
            .toList();
      })(),
      text: (() {
        final value = json['text']?.toString();
        if (value == null) {
          throw FormatException('OpenAiAudioTranscription.text is required');
        }
        return value;
      })(),
      words: (() {
        final list = _sdkworkAsList(json['words']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<dynamic>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'duration': duration,
      'language': language,
      'segments': segments?.map((item) => item).toList(),
      'text': text,
      'words': words?.map((item) => item).toList(),
    };
  }
}

class OpenAiAudioTranscriptionMultipartRequest {
  final String file;
  final String? language;
  final String model;
  final String? prompt;
  final String? responseFormat;

  OpenAiAudioTranscriptionMultipartRequest({
    required this.file,
    this.language,
    required this.model,
    this.prompt,
    this.responseFormat
  });

  factory OpenAiAudioTranscriptionMultipartRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiAudioTranscriptionMultipartRequest(
      file: (() {
        final value = json['file']?.toString();
        if (value == null) {
          throw FormatException('OpenAiAudioTranscriptionMultipartRequest.file is required');
        }
        return value;
      })(),
      language: json['language']?.toString(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiAudioTranscriptionMultipartRequest.model is required');
        }
        return value;
      })(),
      prompt: json['prompt']?.toString(),
      responseFormat: json['response_format']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'file': file,
      'language': language,
      'model': model,
      'prompt': prompt,
      'response_format': responseFormat,
    };
  }
}

class OpenAiAudioTranscriptionRequest {
  final OpenAiFileReferenceInput file;
  final String? language;
  final String model;
  final String? prompt;
  final String? responseFormat;

  OpenAiAudioTranscriptionRequest({
    required this.file,
    this.language,
    required this.model,
    this.prompt,
    this.responseFormat
  });

  factory OpenAiAudioTranscriptionRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiAudioTranscriptionRequest(
      file: (() {
        final map = _sdkworkAsMap(json['file']);
        if (map == null) {
          throw FormatException('OpenAiAudioTranscriptionRequest.file is required');
        }
        return OpenAiFileReferenceInput.fromJson(map);
      })(),
      language: json['language']?.toString(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiAudioTranscriptionRequest.model is required');
        }
        return value;
      })(),
      prompt: json['prompt']?.toString(),
      responseFormat: json['response_format']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'file': file.toJson(),
      'language': language,
      'model': model,
      'prompt': prompt,
      'response_format': responseFormat,
    };
  }
}

class OpenAiAudioTranslation {
  final double? duration;
  final List<dynamic>? segments;
  final String text;

  OpenAiAudioTranslation({
    this.duration,
    this.segments,
    required this.text
  });

  factory OpenAiAudioTranslation.fromJson(Map<String, dynamic> json) {
    return OpenAiAudioTranslation(
      duration: json['duration'] is num ? json['duration'].toDouble() : null,
      segments: (() {
        final list = _sdkworkAsList(json['segments']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<dynamic>()
            .toList();
      })(),
      text: (() {
        final value = json['text']?.toString();
        if (value == null) {
          throw FormatException('OpenAiAudioTranslation.text is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'duration': duration,
      'segments': segments?.map((item) => item).toList(),
      'text': text,
    };
  }
}

class OpenAiAudioTranslationMultipartRequest {
  final String file;
  final String model;
  final String? prompt;
  final String? responseFormat;

  OpenAiAudioTranslationMultipartRequest({
    required this.file,
    required this.model,
    this.prompt,
    this.responseFormat
  });

  factory OpenAiAudioTranslationMultipartRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiAudioTranslationMultipartRequest(
      file: (() {
        final value = json['file']?.toString();
        if (value == null) {
          throw FormatException('OpenAiAudioTranslationMultipartRequest.file is required');
        }
        return value;
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiAudioTranslationMultipartRequest.model is required');
        }
        return value;
      })(),
      prompt: json['prompt']?.toString(),
      responseFormat: json['response_format']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'file': file,
      'model': model,
      'prompt': prompt,
      'response_format': responseFormat,
    };
  }
}

class OpenAiAudioTranslationRequest {
  final OpenAiFileReferenceInput file;
  final String model;
  final String? prompt;
  final String? responseFormat;

  OpenAiAudioTranslationRequest({
    required this.file,
    required this.model,
    this.prompt,
    this.responseFormat
  });

  factory OpenAiAudioTranslationRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiAudioTranslationRequest(
      file: (() {
        final map = _sdkworkAsMap(json['file']);
        if (map == null) {
          throw FormatException('OpenAiAudioTranslationRequest.file is required');
        }
        return OpenAiFileReferenceInput.fromJson(map);
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiAudioTranslationRequest.model is required');
        }
        return value;
      })(),
      prompt: json['prompt']?.toString(),
      responseFormat: json['response_format']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'file': file.toJson(),
      'model': model,
      'prompt': prompt,
      'response_format': responseFormat,
    };
  }
}

class OpenAiBatch {
  final int? cancelledAt;
  final int? cancellingAt;
  final int? completedAt;
  final String completionWindow;
  final int? createdAt;
  final String endpoint;
  final String? errorFileId;
  final dynamic errors;
  final int? expiredAt;
  final int? expiresAt;
  final int? failedAt;
  final int? finalizingAt;
  final String id;
  final int? inProgressAt;
  final String inputFileId;
  final Map<String, dynamic>? metadata;
  final String object;
  final String? outputFileId;
  final OpenAiBatchRequestCounts? requestCounts;
  final String status;

  OpenAiBatch({
    this.cancelledAt,
    this.cancellingAt,
    this.completedAt,
    required this.completionWindow,
    this.createdAt,
    required this.endpoint,
    this.errorFileId,
    this.errors,
    this.expiredAt,
    this.expiresAt,
    this.failedAt,
    this.finalizingAt,
    required this.id,
    this.inProgressAt,
    required this.inputFileId,
    this.metadata,
    required this.object,
    this.outputFileId,
    this.requestCounts,
    required this.status
  });

  factory OpenAiBatch.fromJson(Map<String, dynamic> json) {
    return OpenAiBatch(
      cancelledAt: json['cancelled_at'] is int ? json['cancelled_at'] : null,
      cancellingAt: json['cancelling_at'] is int ? json['cancelling_at'] : null,
      completedAt: json['completed_at'] is int ? json['completed_at'] : null,
      completionWindow: (() {
        final value = json['completion_window']?.toString();
        if (value == null) {
          throw FormatException('OpenAiBatch.completion_window is required');
        }
        return value;
      })(),
      createdAt: json['created_at'] is int ? json['created_at'] : null,
      endpoint: (() {
        final value = json['endpoint']?.toString();
        if (value == null) {
          throw FormatException('OpenAiBatch.endpoint is required');
        }
        return value;
      })(),
      errorFileId: json['error_file_id']?.toString(),
      errors: json['errors']?.toString(),
      expiredAt: json['expired_at'] is int ? json['expired_at'] : null,
      expiresAt: json['expires_at'] is int ? json['expires_at'] : null,
      failedAt: json['failed_at'] is int ? json['failed_at'] : null,
      finalizingAt: json['finalizing_at'] is int ? json['finalizing_at'] : null,
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiBatch.id is required');
        }
        return value;
      })(),
      inProgressAt: json['in_progress_at'] is int ? json['in_progress_at'] : null,
      inputFileId: (() {
        final value = json['input_file_id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiBatch.input_file_id is required');
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
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiBatch.object is required');
        }
        return value;
      })(),
      outputFileId: json['output_file_id']?.toString(),
      requestCounts: (() {
        final map = _sdkworkAsMap(json['request_counts']);
        return map == null ? null : OpenAiBatchRequestCounts.fromJson(map);
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('OpenAiBatch.status is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cancelled_at': cancelledAt,
      'cancelling_at': cancellingAt,
      'completed_at': completedAt,
      'completion_window': completionWindow,
      'created_at': createdAt,
      'endpoint': endpoint,
      'error_file_id': errorFileId,
      'errors': errors,
      'expired_at': expiredAt,
      'expires_at': expiresAt,
      'failed_at': failedAt,
      'finalizing_at': finalizingAt,
      'id': id,
      'in_progress_at': inProgressAt,
      'input_file_id': inputFileId,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'object': object,
      'output_file_id': outputFileId,
      'request_counts': requestCounts?.toJson(),
      'status': status,
    };
  }
}

class OpenAiBatchCreateRequest {
  final String completionWindow;
  final String endpoint;
  final String inputFileId;
  final Map<String, dynamic>? metadata;

  OpenAiBatchCreateRequest({
    required this.completionWindow,
    required this.endpoint,
    required this.inputFileId,
    this.metadata
  });

  factory OpenAiBatchCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiBatchCreateRequest(
      completionWindow: (() {
        final value = json['completion_window']?.toString();
        if (value == null) {
          throw FormatException('OpenAiBatchCreateRequest.completion_window is required');
        }
        return value;
      })(),
      endpoint: (() {
        final value = json['endpoint']?.toString();
        if (value == null) {
          throw FormatException('OpenAiBatchCreateRequest.endpoint is required');
        }
        return value;
      })(),
      inputFileId: (() {
        final value = json['input_file_id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiBatchCreateRequest.input_file_id is required');
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
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'completion_window': completionWindow,
      'endpoint': endpoint,
      'input_file_id': inputFileId,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class OpenAiBatchList {
  final List<OpenAiBatch> data;
  final String? firstId;
  final bool? hasMore;
  final String? lastId;
  final String object;

  OpenAiBatchList({
    required this.data,
    this.firstId,
    this.hasMore,
    this.lastId,
    required this.object
  });

  factory OpenAiBatchList.fromJson(Map<String, dynamic> json) {
    return OpenAiBatchList(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          throw FormatException('OpenAiBatchList.data is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiBatch.fromJson(map);
      })())
            .whereType<OpenAiBatch>()
            .toList();
      })(),
      firstId: json['first_id']?.toString(),
      hasMore: json['has_more'] is bool ? json['has_more'] : null,
      lastId: json['last_id']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiBatchList.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data.map((item) => item.toJson()).toList(),
      'first_id': firstId,
      'has_more': hasMore,
      'last_id': lastId,
      'object': object,
    };
  }
}

class OpenAiBatchRequestCounts {
  final int? completed;
  final int? failed;
  final int? total;

  OpenAiBatchRequestCounts({
    this.completed,
    this.failed,
    this.total
  });

  factory OpenAiBatchRequestCounts.fromJson(Map<String, dynamic> json) {
    return OpenAiBatchRequestCounts(
      completed: json['completed'] is int ? json['completed'] : null,
      failed: json['failed'] is int ? json['failed'] : null,
      total: json['total'] is int ? json['total'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'completed': completed,
      'failed': failed,
      'total': total,
    };
  }
}

class OpenAiChatAudioConfig {
  final String? format;
  final String? voice;

  OpenAiChatAudioConfig({
    this.format,
    this.voice
  });

  factory OpenAiChatAudioConfig.fromJson(Map<String, dynamic> json) {
    return OpenAiChatAudioConfig(
      format: json['format']?.toString(),
      voice: json['voice']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'format': format,
      'voice': voice,
    };
  }
}

class OpenAiChatCompletion {
  final List<OpenAiChatCompletionChoice> choices;
  final int created;
  final String id;
  final String model;
  final String object;
  final String? requestId;
  final String? serviceTier;
  final String? systemFingerprint;
  final OpenAiTokenUsage? usage;

  OpenAiChatCompletion({
    required this.choices,
    required this.created,
    required this.id,
    required this.model,
    required this.object,
    this.requestId,
    this.serviceTier,
    this.systemFingerprint,
    this.usage
  });

  factory OpenAiChatCompletion.fromJson(Map<String, dynamic> json) {
    return OpenAiChatCompletion(
      choices: (() {
        final list = _sdkworkAsList(json['choices']);
        if (list == null) {
          throw FormatException('OpenAiChatCompletion.choices is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiChatCompletionChoice.fromJson(map);
      })())
            .whereType<OpenAiChatCompletionChoice>()
            .toList();
      })(),
      created: (() {
        final value = json['created'];
        if (value is! int) {
          throw FormatException('OpenAiChatCompletion.created is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiChatCompletion.id is required');
        }
        return value;
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiChatCompletion.model is required');
        }
        return value;
      })(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiChatCompletion.object is required');
        }
        return value;
      })(),
      requestId: json['request_id']?.toString(),
      serviceTier: json['service_tier']?.toString(),
      systemFingerprint: json['system_fingerprint']?.toString(),
      usage: (() {
        final map = _sdkworkAsMap(json['usage']);
        return map == null ? null : OpenAiTokenUsage.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'choices': choices.map((item) => item.toJson()).toList(),
      'created': created,
      'id': id,
      'model': model,
      'object': object,
      'request_id': requestId,
      'service_tier': serviceTier,
      'system_fingerprint': systemFingerprint,
      'usage': usage?.toJson(),
    };
  }
}

class OpenAiChatCompletionChoice {
  final String? finishReason;
  final int index;
  final OpenAiChoiceLogprobs? logprobs;
  final OpenAiChatMessage message;

  OpenAiChatCompletionChoice({
    this.finishReason,
    required this.index,
    this.logprobs,
    required this.message
  });

  factory OpenAiChatCompletionChoice.fromJson(Map<String, dynamic> json) {
    return OpenAiChatCompletionChoice(
      finishReason: json['finish_reason']?.toString(),
      index: (() {
        final value = json['index'];
        if (value is! int) {
          throw FormatException('OpenAiChatCompletionChoice.index is required');
        }
        return value;
      })(),
      logprobs: (() {
        final map = _sdkworkAsMap(json['logprobs']);
        return map == null ? null : OpenAiChoiceLogprobs.fromJson(map);
      })(),
      message: (() {
        final map = _sdkworkAsMap(json['message']);
        if (map == null) {
          throw FormatException('OpenAiChatCompletionChoice.message is required');
        }
        return OpenAiChatMessage.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'finish_reason': finishReason,
      'index': index,
      'logprobs': logprobs?.toJson(),
      'message': message.toJson(),
    };
  }
}

class OpenAiChatCompletionList {
  final List<OpenAiChatCompletion> data;
  final String? firstId;
  final bool? hasMore;
  final String? lastId;
  final String object;

  OpenAiChatCompletionList({
    required this.data,
    this.firstId,
    this.hasMore,
    this.lastId,
    required this.object
  });

  factory OpenAiChatCompletionList.fromJson(Map<String, dynamic> json) {
    return OpenAiChatCompletionList(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          throw FormatException('OpenAiChatCompletionList.data is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiChatCompletion.fromJson(map);
      })())
            .whereType<OpenAiChatCompletion>()
            .toList();
      })(),
      firstId: json['first_id']?.toString(),
      hasMore: json['has_more'] is bool ? json['has_more'] : null,
      lastId: json['last_id']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiChatCompletionList.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data.map((item) => item.toJson()).toList(),
      'first_id': firstId,
      'has_more': hasMore,
      'last_id': lastId,
      'object': object,
    };
  }
}

class OpenAiChatCompletionMessageList {
  final List<OpenAiChatMessage> data;
  final String? firstId;
  final bool? hasMore;
  final String? lastId;
  final String object;

  OpenAiChatCompletionMessageList({
    required this.data,
    this.firstId,
    this.hasMore,
    this.lastId,
    required this.object
  });

  factory OpenAiChatCompletionMessageList.fromJson(Map<String, dynamic> json) {
    return OpenAiChatCompletionMessageList(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          throw FormatException('OpenAiChatCompletionMessageList.data is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiChatMessage.fromJson(map);
      })())
            .whereType<OpenAiChatMessage>()
            .toList();
      })(),
      firstId: json['first_id']?.toString(),
      hasMore: json['has_more'] is bool ? json['has_more'] : null,
      lastId: json['last_id']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiChatCompletionMessageList.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data.map((item) => item.toJson()).toList(),
      'first_id': firstId,
      'has_more': hasMore,
      'last_id': lastId,
      'object': object,
    };
  }
}

class OpenAiChatCompletionRequest {
  final OpenAiChatAudioConfig? audio;
  final double? frequencyPenalty;
  final OpenAiFunctionCallChoice? functionCall;
  final List<OpenAiFunctionDefinition>? functions;
  final Map<String, double>? logitBias;
  final bool? logprobs;
  final int? maxCompletionTokens;
  final int? maxTokens;
  final List<OpenAiChatMessage> messages;
  final Map<String, dynamic>? metadata;
  final List<String>? modalities;
  final String model;
  final int? n;
  final bool? parallelToolCalls;
  final OpenAiPredictionConfig? prediction;
  final double? presencePenalty;
  final String? reasoningEffort;
  final OpenAiResponseFormat? responseFormat;
  final int? seed;
  final String? serviceTier;
  final dynamic stop;
  final bool? store;
  final bool? stream;
  final OpenAiStreamOptions? streamOptions;
  final double? temperature;
  final OpenAiToolChoice? toolChoice;
  final List<OpenAiTool>? tools;
  final int? topLogprobs;
  final double? topP;
  final String? user;

  OpenAiChatCompletionRequest({
    this.audio,
    this.frequencyPenalty,
    this.functionCall,
    this.functions,
    this.logitBias,
    this.logprobs,
    this.maxCompletionTokens,
    this.maxTokens,
    required this.messages,
    this.metadata,
    this.modalities,
    required this.model,
    this.n,
    this.parallelToolCalls,
    this.prediction,
    this.presencePenalty,
    this.reasoningEffort,
    this.responseFormat,
    this.seed,
    this.serviceTier,
    this.stop,
    this.store,
    this.stream,
    this.streamOptions,
    this.temperature,
    this.toolChoice,
    this.tools,
    this.topLogprobs,
    this.topP,
    this.user
  });

  factory OpenAiChatCompletionRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiChatCompletionRequest(
      audio: (() {
        final map = _sdkworkAsMap(json['audio']);
        return map == null ? null : OpenAiChatAudioConfig.fromJson(map);
      })(),
      frequencyPenalty: json['frequency_penalty'] is num ? json['frequency_penalty'].toDouble() : null,
      functionCall: (() {
        final map = _sdkworkAsMap(json['function_call']);
        return map == null ? null : OpenAiFunctionCallChoice.fromJson(map);
      })(),
      functions: (() {
        final list = _sdkworkAsList(json['functions']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiFunctionDefinition.fromJson(map);
      })())
            .whereType<OpenAiFunctionDefinition>()
            .toList();
      })(),
      logitBias: (() {
        final map = _sdkworkAsMap(json['logit_bias']);
        if (map == null) {
          return null;
        }
        final result = <String, double>{};
        map.forEach((key, item) {
          final deserialized = item is num ? item.toDouble() : null;
          if (deserialized is double) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      logprobs: json['logprobs'] is bool ? json['logprobs'] : null,
      maxCompletionTokens: json['max_completion_tokens'] is int ? json['max_completion_tokens'] : null,
      maxTokens: json['max_tokens'] is int ? json['max_tokens'] : null,
      messages: (() {
        final list = _sdkworkAsList(json['messages']);
        if (list == null) {
          throw FormatException('OpenAiChatCompletionRequest.messages is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiChatMessage.fromJson(map);
      })())
            .whereType<OpenAiChatMessage>()
            .toList();
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
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiChatCompletionRequest.model is required');
        }
        return value;
      })(),
      n: json['n'] is int ? json['n'] : null,
      parallelToolCalls: json['parallel_tool_calls'] is bool ? json['parallel_tool_calls'] : null,
      prediction: (() {
        final map = _sdkworkAsMap(json['prediction']);
        return map == null ? null : OpenAiPredictionConfig.fromJson(map);
      })(),
      presencePenalty: json['presence_penalty'] is num ? json['presence_penalty'].toDouble() : null,
      reasoningEffort: json['reasoning_effort']?.toString(),
      responseFormat: (() {
        final map = _sdkworkAsMap(json['response_format']);
        return map == null ? null : OpenAiResponseFormat.fromJson(map);
      })(),
      seed: json['seed'] is int ? json['seed'] : null,
      serviceTier: json['service_tier']?.toString(),
      stop: json['stop']?.toString(),
      store: json['store'] is bool ? json['store'] : null,
      stream: json['stream'] is bool ? json['stream'] : null,
      streamOptions: (() {
        final map = _sdkworkAsMap(json['stream_options']);
        return map == null ? null : OpenAiStreamOptions.fromJson(map);
      })(),
      temperature: json['temperature'] is num ? json['temperature'].toDouble() : null,
      toolChoice: (() {
        final map = _sdkworkAsMap(json['tool_choice']);
        return map == null ? null : OpenAiToolChoice.fromJson(map);
      })(),
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiTool.fromJson(map);
      })())
            .whereType<OpenAiTool>()
            .toList();
      })(),
      topLogprobs: json['top_logprobs'] is int ? json['top_logprobs'] : null,
      topP: json['top_p'] is num ? json['top_p'].toDouble() : null,
      user: json['user']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'audio': audio?.toJson(),
      'frequency_penalty': frequencyPenalty,
      'function_call': functionCall?.toJson(),
      'functions': functions?.map((item) => item.toJson()).toList(),
      'logit_bias': logitBias?.map((key, item) => MapEntry(key, item)),
      'logprobs': logprobs,
      'max_completion_tokens': maxCompletionTokens,
      'max_tokens': maxTokens,
      'messages': messages.map((item) => item.toJson()).toList(),
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'modalities': modalities?.map((item) => item).toList(),
      'model': model,
      'n': n,
      'parallel_tool_calls': parallelToolCalls,
      'prediction': prediction?.toJson(),
      'presence_penalty': presencePenalty,
      'reasoning_effort': reasoningEffort,
      'response_format': responseFormat?.toJson(),
      'seed': seed,
      'service_tier': serviceTier,
      'stop': stop,
      'store': store,
      'stream': stream,
      'stream_options': streamOptions?.toJson(),
      'temperature': temperature,
      'tool_choice': toolChoice?.toJson(),
      'tools': tools?.map((item) => item.toJson()).toList(),
      'top_logprobs': topLogprobs,
      'top_p': topP,
      'user': user,
    };
  }
}

class OpenAiChatCompletionUpdateRequest {
  final Map<String, dynamic>? metadata;

  OpenAiChatCompletionUpdateRequest({
    this.metadata
  });

  factory OpenAiChatCompletionUpdateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiChatCompletionUpdateRequest(
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
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class OpenAiChatContentPart {
  final OpenAiChatFile? file;
  final OpenAiChatImageUrl? imageUrl;
  final OpenAiChatInputAudio? inputAudio;
  final String? text;
  final String type;

  OpenAiChatContentPart({
    this.file,
    this.imageUrl,
    this.inputAudio,
    this.text,
    required this.type
  });

  factory OpenAiChatContentPart.fromJson(Map<String, dynamic> json) {
    return OpenAiChatContentPart(
      file: (() {
        final map = _sdkworkAsMap(json['file']);
        return map == null ? null : OpenAiChatFile.fromJson(map);
      })(),
      imageUrl: (() {
        final map = _sdkworkAsMap(json['image_url']);
        return map == null ? null : OpenAiChatImageUrl.fromJson(map);
      })(),
      inputAudio: (() {
        final map = _sdkworkAsMap(json['input_audio']);
        return map == null ? null : OpenAiChatInputAudio.fromJson(map);
      })(),
      text: json['text']?.toString(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('OpenAiChatContentPart.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'file': file?.toJson(),
      'image_url': imageUrl?.toJson(),
      'input_audio': inputAudio?.toJson(),
      'text': text,
      'type': type,
    };
  }
}

class OpenAiChatFile {
  final String? fileData;
  final String? fileId;
  final String? filename;

  OpenAiChatFile({
    this.fileData,
    this.fileId,
    this.filename
  });

  factory OpenAiChatFile.fromJson(Map<String, dynamic> json) {
    return OpenAiChatFile(
      fileData: json['file_data']?.toString(),
      fileId: json['file_id']?.toString(),
      filename: json['filename']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'file_data': fileData,
      'file_id': fileId,
      'filename': filename,
    };
  }
}

class OpenAiChatImageUrl {
  final String? detail;
  final String url;

  OpenAiChatImageUrl({
    this.detail,
    required this.url
  });

  factory OpenAiChatImageUrl.fromJson(Map<String, dynamic> json) {
    return OpenAiChatImageUrl(
      detail: json['detail']?.toString(),
      url: (() {
        final value = json['url']?.toString();
        if (value == null) {
          throw FormatException('OpenAiChatImageUrl.url is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'detail': detail,
      'url': url,
    };
  }
}

class OpenAiChatInputAudio {
  final String data;
  final String format;

  OpenAiChatInputAudio({
    required this.data,
    required this.format
  });

  factory OpenAiChatInputAudio.fromJson(Map<String, dynamic> json) {
    return OpenAiChatInputAudio(
      data: (() {
        final value = json['data']?.toString();
        if (value == null) {
          throw FormatException('OpenAiChatInputAudio.data is required');
        }
        return value;
      })(),
      format: (() {
        final value = json['format']?.toString();
        if (value == null) {
          throw FormatException('OpenAiChatInputAudio.format is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data,
      'format': format,
    };
  }
}

class OpenAiChatMessage {
  final dynamic content;
  final OpenAiFunctionCall? functionCall;
  final String? name;
  final String? refusal;
  final String role;
  final String? toolCallId;
  final List<OpenAiToolCall>? toolCalls;

  OpenAiChatMessage({
    this.content,
    this.functionCall,
    this.name,
    this.refusal,
    required this.role,
    this.toolCallId,
    this.toolCalls
  });

  factory OpenAiChatMessage.fromJson(Map<String, dynamic> json) {
    return OpenAiChatMessage(
      content: json['content']?.toString(),
      functionCall: (() {
        final map = _sdkworkAsMap(json['function_call']);
        return map == null ? null : OpenAiFunctionCall.fromJson(map);
      })(),
      name: json['name']?.toString(),
      refusal: json['refusal']?.toString(),
      role: (() {
        final value = json['role']?.toString();
        if (value == null) {
          throw FormatException('OpenAiChatMessage.role is required');
        }
        return value;
      })(),
      toolCallId: json['tool_call_id']?.toString(),
      toolCalls: (() {
        final list = _sdkworkAsList(json['tool_calls']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiToolCall.fromJson(map);
      })())
            .whereType<OpenAiToolCall>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'content': content,
      'function_call': functionCall?.toJson(),
      'name': name,
      'refusal': refusal,
      'role': role,
      'tool_call_id': toolCallId,
      'tool_calls': toolCalls?.map((item) => item.toJson()).toList(),
    };
  }
}

class OpenAiChoiceLogprobs {
  final List<OpenAiTokenLogprob>? content;
  final List<OpenAiTokenLogprob>? refusal;

  OpenAiChoiceLogprobs({
    this.content,
    this.refusal
  });

  factory OpenAiChoiceLogprobs.fromJson(Map<String, dynamic> json) {
    return OpenAiChoiceLogprobs(
      content: (() {
        final list = _sdkworkAsList(json['content']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiTokenLogprob.fromJson(map);
      })())
            .whereType<OpenAiTokenLogprob>()
            .toList();
      })(),
      refusal: (() {
        final list = _sdkworkAsList(json['refusal']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiTokenLogprob.fromJson(map);
      })())
            .whereType<OpenAiTokenLogprob>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'content': content?.map((item) => item.toJson()).toList(),
      'refusal': refusal?.map((item) => item.toJson()).toList(),
    };
  }
}

class OpenAiCompletion {
  final List<CreateCompletionChoice> choices;
  final int created;
  final String id;
  final String model;
  final String object;
  final String? systemFingerprint;
  final OpenAiTokenUsage? usage;

  OpenAiCompletion({
    required this.choices,
    required this.created,
    required this.id,
    required this.model,
    required this.object,
    this.systemFingerprint,
    this.usage
  });

  factory OpenAiCompletion.fromJson(Map<String, dynamic> json) {
    return OpenAiCompletion(
      choices: (() {
        final list = _sdkworkAsList(json['choices']);
        if (list == null) {
          throw FormatException('OpenAiCompletion.choices is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : CreateCompletionChoice.fromJson(map);
      })())
            .whereType<CreateCompletionChoice>()
            .toList();
      })(),
      created: (() {
        final value = json['created'];
        if (value is! int) {
          throw FormatException('OpenAiCompletion.created is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiCompletion.id is required');
        }
        return value;
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiCompletion.model is required');
        }
        return value;
      })(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiCompletion.object is required');
        }
        return value;
      })(),
      systemFingerprint: json['system_fingerprint']?.toString(),
      usage: (() {
        final map = _sdkworkAsMap(json['usage']);
        return map == null ? null : OpenAiTokenUsage.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'choices': choices.map((item) => item.toJson()).toList(),
      'created': created,
      'id': id,
      'model': model,
      'object': object,
      'system_fingerprint': systemFingerprint,
      'usage': usage?.toJson(),
    };
  }
}

class OpenAiCompletionCreateRequest {
  final int? bestOf;
  final bool? echo;
  final double? frequencyPenalty;
  final Map<String, double>? logitBias;
  final int? logprobs;
  final int? maxTokens;
  final String model;
  final int? n;
  final double? presencePenalty;
  final dynamic prompt;
  final int? seed;
  final dynamic stop;
  final bool? stream;
  final String? suffix;
  final double? temperature;
  final double? topP;
  final String? user;

  OpenAiCompletionCreateRequest({
    this.bestOf,
    this.echo,
    this.frequencyPenalty,
    this.logitBias,
    this.logprobs,
    this.maxTokens,
    required this.model,
    this.n,
    this.presencePenalty,
    required this.prompt,
    this.seed,
    this.stop,
    this.stream,
    this.suffix,
    this.temperature,
    this.topP,
    this.user
  });

  factory OpenAiCompletionCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiCompletionCreateRequest(
      bestOf: json['best_of'] is int ? json['best_of'] : null,
      echo: json['echo'] is bool ? json['echo'] : null,
      frequencyPenalty: json['frequency_penalty'] is num ? json['frequency_penalty'].toDouble() : null,
      logitBias: (() {
        final map = _sdkworkAsMap(json['logit_bias']);
        if (map == null) {
          return null;
        }
        final result = <String, double>{};
        map.forEach((key, item) {
          final deserialized = item is num ? item.toDouble() : null;
          if (deserialized is double) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      logprobs: json['logprobs'] is int ? json['logprobs'] : null,
      maxTokens: json['max_tokens'] is int ? json['max_tokens'] : null,
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiCompletionCreateRequest.model is required');
        }
        return value;
      })(),
      n: json['n'] is int ? json['n'] : null,
      presencePenalty: json['presence_penalty'] is num ? json['presence_penalty'].toDouble() : null,
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('OpenAiCompletionCreateRequest.prompt is required');
        }
        return value;
      })(),
      seed: json['seed'] is int ? json['seed'] : null,
      stop: json['stop']?.toString(),
      stream: json['stream'] is bool ? json['stream'] : null,
      suffix: json['suffix']?.toString(),
      temperature: json['temperature'] is num ? json['temperature'].toDouble() : null,
      topP: json['top_p'] is num ? json['top_p'].toDouble() : null,
      user: json['user']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'best_of': bestOf,
      'echo': echo,
      'frequency_penalty': frequencyPenalty,
      'logit_bias': logitBias?.map((key, item) => MapEntry(key, item)),
      'logprobs': logprobs,
      'max_tokens': maxTokens,
      'model': model,
      'n': n,
      'presence_penalty': presencePenalty,
      'prompt': prompt,
      'seed': seed,
      'stop': stop,
      'stream': stream,
      'suffix': suffix,
      'temperature': temperature,
      'top_p': topP,
      'user': user,
    };
  }
}

class OpenAiCompletionTokensDetails {
  final int? acceptedPredictionTokens;
  final int? audioTokens;
  final int? reasoningTokens;
  final int? rejectedPredictionTokens;

  OpenAiCompletionTokensDetails({
    this.acceptedPredictionTokens,
    this.audioTokens,
    this.reasoningTokens,
    this.rejectedPredictionTokens
  });

  factory OpenAiCompletionTokensDetails.fromJson(Map<String, dynamic> json) {
    return OpenAiCompletionTokensDetails(
      acceptedPredictionTokens: json['accepted_prediction_tokens'] is int ? json['accepted_prediction_tokens'] : null,
      audioTokens: json['audio_tokens'] is int ? json['audio_tokens'] : null,
      reasoningTokens: json['reasoning_tokens'] is int ? json['reasoning_tokens'] : null,
      rejectedPredictionTokens: json['rejected_prediction_tokens'] is int ? json['rejected_prediction_tokens'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'accepted_prediction_tokens': acceptedPredictionTokens,
      'audio_tokens': audioTokens,
      'reasoning_tokens': reasoningTokens,
      'rejected_prediction_tokens': rejectedPredictionTokens,
    };
  }
}

class OpenAiContainer {
  final int createdAt;
  final int? expiresAt;
  final String id;
  final int? lastActiveAt;
  final String? memoryLimit;
  final Map<String, dynamic>? metadata;
  final String? name;
  final String object;
  final String status;

  OpenAiContainer({
    required this.createdAt,
    this.expiresAt,
    required this.id,
    this.lastActiveAt,
    this.memoryLimit,
    this.metadata,
    this.name,
    required this.object,
    required this.status
  });

  factory OpenAiContainer.fromJson(Map<String, dynamic> json) {
    return OpenAiContainer(
      createdAt: (() {
        final value = json['created_at'];
        if (value is! int) {
          throw FormatException('OpenAiContainer.created_at is required');
        }
        return value;
      })(),
      expiresAt: json['expires_at'] is int ? json['expires_at'] : null,
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiContainer.id is required');
        }
        return value;
      })(),
      lastActiveAt: json['last_active_at'] is int ? json['last_active_at'] : null,
      memoryLimit: json['memory_limit']?.toString(),
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
      name: json['name']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiContainer.object is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('OpenAiContainer.status is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created_at': createdAt,
      'expires_at': expiresAt,
      'id': id,
      'last_active_at': lastActiveAt,
      'memory_limit': memoryLimit,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'name': name,
      'object': object,
      'status': status,
    };
  }
}

class OpenAiContainerCreateRequest {
  final List<String>? fileIds;
  final String? memoryLimit;
  final Map<String, dynamic>? metadata;
  final String? name;

  OpenAiContainerCreateRequest({
    this.fileIds,
    this.memoryLimit,
    this.metadata,
    this.name
  });

  factory OpenAiContainerCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiContainerCreateRequest(
      fileIds: (() {
        final list = _sdkworkAsList(json['file_ids']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      memoryLimit: json['memory_limit']?.toString(),
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
      name: json['name']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'file_ids': fileIds?.map((item) => item).toList(),
      'memory_limit': memoryLimit,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'name': name,
    };
  }
}

class OpenAiContainerFile {
  final int? bytes;
  final String? containerId;
  final int createdAt;
  final String? filename;
  final String id;
  final Map<String, dynamic>? metadata;
  final String object;
  final String? path;
  final String? purpose;

  OpenAiContainerFile({
    this.bytes,
    this.containerId,
    required this.createdAt,
    this.filename,
    required this.id,
    this.metadata,
    required this.object,
    this.path,
    this.purpose
  });

  factory OpenAiContainerFile.fromJson(Map<String, dynamic> json) {
    return OpenAiContainerFile(
      bytes: json['bytes'] is int ? json['bytes'] : null,
      containerId: json['container_id']?.toString(),
      createdAt: (() {
        final value = json['created_at'];
        if (value is! int) {
          throw FormatException('OpenAiContainerFile.created_at is required');
        }
        return value;
      })(),
      filename: json['filename']?.toString(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiContainerFile.id is required');
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
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiContainerFile.object is required');
        }
        return value;
      })(),
      path: json['path']?.toString(),
      purpose: json['purpose']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bytes': bytes,
      'container_id': containerId,
      'created_at': createdAt,
      'filename': filename,
      'id': id,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'object': object,
      'path': path,
      'purpose': purpose,
    };
  }
}

class OpenAiContainerFileCreateMultipartRequest {
  final String file;
  final String? metadata;
  final String? purpose;

  OpenAiContainerFileCreateMultipartRequest({
    required this.file,
    this.metadata,
    this.purpose
  });

  factory OpenAiContainerFileCreateMultipartRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiContainerFileCreateMultipartRequest(
      file: (() {
        final value = json['file']?.toString();
        if (value == null) {
          throw FormatException('OpenAiContainerFileCreateMultipartRequest.file is required');
        }
        return value;
      })(),
      metadata: json['metadata']?.toString(),
      purpose: json['purpose']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'file': file,
      'metadata': metadata,
      'purpose': purpose,
    };
  }
}

class OpenAiContainerFileList {
  final List<OpenAiContainerFile> data;
  final String? firstId;
  final bool? hasMore;
  final String? lastId;
  final String object;

  OpenAiContainerFileList({
    required this.data,
    this.firstId,
    this.hasMore,
    this.lastId,
    required this.object
  });

  factory OpenAiContainerFileList.fromJson(Map<String, dynamic> json) {
    return OpenAiContainerFileList(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          throw FormatException('OpenAiContainerFileList.data is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiContainerFile.fromJson(map);
      })())
            .whereType<OpenAiContainerFile>()
            .toList();
      })(),
      firstId: json['first_id']?.toString(),
      hasMore: json['has_more'] is bool ? json['has_more'] : null,
      lastId: json['last_id']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiContainerFileList.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data.map((item) => item.toJson()).toList(),
      'first_id': firstId,
      'has_more': hasMore,
      'last_id': lastId,
      'object': object,
    };
  }
}

class OpenAiContainerList {
  final List<OpenAiContainer> data;
  final String? firstId;
  final bool? hasMore;
  final String? lastId;
  final String object;

  OpenAiContainerList({
    required this.data,
    this.firstId,
    this.hasMore,
    this.lastId,
    required this.object
  });

  factory OpenAiContainerList.fromJson(Map<String, dynamic> json) {
    return OpenAiContainerList(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          throw FormatException('OpenAiContainerList.data is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiContainer.fromJson(map);
      })())
            .whereType<OpenAiContainer>()
            .toList();
      })(),
      firstId: json['first_id']?.toString(),
      hasMore: json['has_more'] is bool ? json['has_more'] : null,
      lastId: json['last_id']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiContainerList.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data.map((item) => item.toJson()).toList(),
      'first_id': firstId,
      'has_more': hasMore,
      'last_id': lastId,
      'object': object,
    };
  }
}

class OpenAiConversation {
  final int createdAt;
  final String id;
  final Map<String, String>? metadata;
  final String object;

  OpenAiConversation({
    required this.createdAt,
    required this.id,
    this.metadata,
    required this.object
  });

  factory OpenAiConversation.fromJson(Map<String, dynamic> json) {
    return OpenAiConversation(
      createdAt: (() {
        final value = json['created_at'];
        if (value is! int) {
          throw FormatException('OpenAiConversation.created_at is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiConversation.id is required');
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
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiConversation.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created_at': createdAt,
      'id': id,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'object': object,
    };
  }
}

class OpenAiConversationContentPart {
  final String? fileId;
  final String? imageUrl;
  final String? text;
  final String type;

  OpenAiConversationContentPart({
    this.fileId,
    this.imageUrl,
    this.text,
    required this.type
  });

  factory OpenAiConversationContentPart.fromJson(Map<String, dynamic> json) {
    return OpenAiConversationContentPart(
      fileId: json['file_id']?.toString(),
      imageUrl: json['image_url']?.toString(),
      text: json['text']?.toString(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('OpenAiConversationContentPart.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'file_id': fileId,
      'image_url': imageUrl,
      'text': text,
      'type': type,
    };
  }
}

class OpenAiConversationCreateRequest {
  final List<OpenAiConversationItemCreateRequest>? items;
  final Map<String, String>? metadata;

  OpenAiConversationCreateRequest({
    this.items,
    this.metadata
  });

  factory OpenAiConversationCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiConversationCreateRequest(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiConversationItemCreateRequest.fromJson(map);
      })())
            .whereType<OpenAiConversationItemCreateRequest>()
            .toList();
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
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items?.map((item) => item.toJson()).toList(),
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class OpenAiConversationItem {
  final List<OpenAiConversationContentPart>? content;
  final int? createdAt;
  final String id;
  final Map<String, String>? metadata;
  final String object;
  final String? role;
  final String? status;
  final String type;

  OpenAiConversationItem({
    this.content,
    this.createdAt,
    required this.id,
    this.metadata,
    required this.object,
    this.role,
    this.status,
    required this.type
  });

  factory OpenAiConversationItem.fromJson(Map<String, dynamic> json) {
    return OpenAiConversationItem(
      content: (() {
        final list = _sdkworkAsList(json['content']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiConversationContentPart.fromJson(map);
      })())
            .whereType<OpenAiConversationContentPart>()
            .toList();
      })(),
      createdAt: json['created_at'] is int ? json['created_at'] : null,
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiConversationItem.id is required');
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
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiConversationItem.object is required');
        }
        return value;
      })(),
      role: json['role']?.toString(),
      status: json['status']?.toString(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('OpenAiConversationItem.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'content': content?.map((item) => item.toJson()).toList(),
      'created_at': createdAt,
      'id': id,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'object': object,
      'role': role,
      'status': status,
      'type': type,
    };
  }
}

class OpenAiConversationItemCreateRequest {
  final List<OpenAiConversationContentPart>? content;
  final Map<String, String>? metadata;
  final String? role;
  final String type;

  OpenAiConversationItemCreateRequest({
    this.content,
    this.metadata,
    this.role,
    required this.type
  });

  factory OpenAiConversationItemCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiConversationItemCreateRequest(
      content: (() {
        final list = _sdkworkAsList(json['content']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiConversationContentPart.fromJson(map);
      })())
            .whereType<OpenAiConversationContentPart>()
            .toList();
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
      role: json['role']?.toString(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('OpenAiConversationItemCreateRequest.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'content': content?.map((item) => item.toJson()).toList(),
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'role': role,
      'type': type,
    };
  }
}

class OpenAiConversationItemList {
  final List<OpenAiConversationItem> data;
  final String? firstId;
  final bool? hasMore;
  final String? lastId;
  final String object;

  OpenAiConversationItemList({
    required this.data,
    this.firstId,
    this.hasMore,
    this.lastId,
    required this.object
  });

  factory OpenAiConversationItemList.fromJson(Map<String, dynamic> json) {
    return OpenAiConversationItemList(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          throw FormatException('OpenAiConversationItemList.data is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiConversationItem.fromJson(map);
      })())
            .whereType<OpenAiConversationItem>()
            .toList();
      })(),
      firstId: json['first_id']?.toString(),
      hasMore: json['has_more'] is bool ? json['has_more'] : null,
      lastId: json['last_id']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiConversationItemList.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data.map((item) => item.toJson()).toList(),
      'first_id': firstId,
      'has_more': hasMore,
      'last_id': lastId,
      'object': object,
    };
  }
}

class OpenAiConversationList {
  final List<OpenAiConversation> data;
  final String? firstId;
  final bool? hasMore;
  final String? lastId;
  final String object;

  OpenAiConversationList({
    required this.data,
    this.firstId,
    this.hasMore,
    this.lastId,
    required this.object
  });

  factory OpenAiConversationList.fromJson(Map<String, dynamic> json) {
    return OpenAiConversationList(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          throw FormatException('OpenAiConversationList.data is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiConversation.fromJson(map);
      })())
            .whereType<OpenAiConversation>()
            .toList();
      })(),
      firstId: json['first_id']?.toString(),
      hasMore: json['has_more'] is bool ? json['has_more'] : null,
      lastId: json['last_id']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiConversationList.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data.map((item) => item.toJson()).toList(),
      'first_id': firstId,
      'has_more': hasMore,
      'last_id': lastId,
      'object': object,
    };
  }
}

class OpenAiConversationReference {
  final String? id;

  OpenAiConversationReference({
    this.id
  });

  factory OpenAiConversationReference.fromJson(Map<String, dynamic> json) {
    return OpenAiConversationReference(
      id: json['id']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
    };
  }
}

class OpenAiConversationUpdateRequest {
  final Map<String, String>? metadata;

  OpenAiConversationUpdateRequest({
    this.metadata
  });

  factory OpenAiConversationUpdateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiConversationUpdateRequest(
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
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class OpenAiEmbedding {
  final dynamic embedding;
  final int index;
  final String object;

  OpenAiEmbedding({
    required this.embedding,
    required this.index,
    required this.object
  });

  factory OpenAiEmbedding.fromJson(Map<String, dynamic> json) {
    return OpenAiEmbedding(
      embedding: (() {
        final list = _sdkworkAsList(json['embedding']);
        if (list == null) {
          throw FormatException('OpenAiEmbedding.embedding is required');
        }
        return list
            .map((item) => item is num ? item.toDouble() : null)
            .whereType<double>()
            .toList();
      })(),
      index: (() {
        final value = json['index'];
        if (value is! int) {
          throw FormatException('OpenAiEmbedding.index is required');
        }
        return value;
      })(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiEmbedding.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'embedding': embedding.map((item) => item).toList(),
      'index': index,
      'object': object,
    };
  }
}

class OpenAiEmbeddingList {
  final List<OpenAiEmbedding> data;
  final String? model;
  final String object;
  final OpenAiEmbeddingUsage usage;

  OpenAiEmbeddingList({
    required this.data,
    this.model,
    required this.object,
    required this.usage
  });

  factory OpenAiEmbeddingList.fromJson(Map<String, dynamic> json) {
    return OpenAiEmbeddingList(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          throw FormatException('OpenAiEmbeddingList.data is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiEmbedding.fromJson(map);
      })())
            .whereType<OpenAiEmbedding>()
            .toList();
      })(),
      model: json['model']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiEmbeddingList.object is required');
        }
        return value;
      })(),
      usage: (() {
        final map = _sdkworkAsMap(json['usage']);
        if (map == null) {
          throw FormatException('OpenAiEmbeddingList.usage is required');
        }
        return OpenAiEmbeddingUsage.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data.map((item) => item.toJson()).toList(),
      'model': model,
      'object': object,
      'usage': usage.toJson(),
    };
  }
}

class OpenAiEmbeddingUsage {
  final int promptTokens;
  final int totalTokens;

  OpenAiEmbeddingUsage({
    required this.promptTokens,
    required this.totalTokens
  });

  factory OpenAiEmbeddingUsage.fromJson(Map<String, dynamic> json) {
    return OpenAiEmbeddingUsage(
      promptTokens: (() {
        final value = json['prompt_tokens'];
        if (value is! int) {
          throw FormatException('OpenAiEmbeddingUsage.prompt_tokens is required');
        }
        return value;
      })(),
      totalTokens: (() {
        final value = json['total_tokens'];
        if (value is! int) {
          throw FormatException('OpenAiEmbeddingUsage.total_tokens is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'prompt_tokens': promptTokens,
      'total_tokens': totalTokens,
    };
  }
}

class OpenAiEmbeddingsRequest {
  final int? dimensions;
  final String? encodingFormat;
  final dynamic input;
  final String model;
  final String? user;

  OpenAiEmbeddingsRequest({
    this.dimensions,
    this.encodingFormat,
    required this.input,
    required this.model,
    this.user
  });

  factory OpenAiEmbeddingsRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiEmbeddingsRequest(
      dimensions: json['dimensions'] is int ? json['dimensions'] : null,
      encodingFormat: json['encoding_format']?.toString(),
      input: (() {
        final value = json['input']?.toString();
        if (value == null) {
          throw FormatException('OpenAiEmbeddingsRequest.input is required');
        }
        return value;
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiEmbeddingsRequest.model is required');
        }
        return value;
      })(),
      user: json['user']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'dimensions': dimensions,
      'encoding_format': encodingFormat,
      'input': input,
      'model': model,
      'user': user,
    };
  }
}

class OpenAiError {
  final String code;
  final String message;
  final String? param;
  final String? path;
  final String type;

  OpenAiError({
    required this.code,
    required this.message,
    this.param,
    this.path,
    required this.type
  });

  factory OpenAiError.fromJson(Map<String, dynamic> json) {
    return OpenAiError(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('OpenAiError.code is required');
        }
        return value;
      })(),
      message: (() {
        final value = json['message']?.toString();
        if (value == null) {
          throw FormatException('OpenAiError.message is required');
        }
        return value;
      })(),
      param: json['param']?.toString(),
      path: json['path']?.toString(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('OpenAiError.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'message': message,
      'param': param,
      'path': path,
      'type': type,
    };
  }
}

class OpenAiErrorEnvelope {
  final OpenAiError error;

  OpenAiErrorEnvelope({
    required this.error
  });

  factory OpenAiErrorEnvelope.fromJson(Map<String, dynamic> json) {
    return OpenAiErrorEnvelope(
      error: (() {
        final map = _sdkworkAsMap(json['error']);
        if (map == null) {
          throw FormatException('OpenAiErrorEnvelope.error is required');
        }
        return OpenAiError.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'error': error.toJson(),
    };
  }
}

class OpenAiFile {
  final int bytes;
  final int createdAt;
  final String filename;
  final String id;
  final String object;
  final String purpose;
  final String? status;
  final dynamic statusDetails;

  OpenAiFile({
    required this.bytes,
    required this.createdAt,
    required this.filename,
    required this.id,
    required this.object,
    required this.purpose,
    this.status,
    this.statusDetails
  });

  factory OpenAiFile.fromJson(Map<String, dynamic> json) {
    return OpenAiFile(
      bytes: (() {
        final value = json['bytes'];
        if (value is! int) {
          throw FormatException('OpenAiFile.bytes is required');
        }
        return value;
      })(),
      createdAt: (() {
        final value = json['created_at'];
        if (value is! int) {
          throw FormatException('OpenAiFile.created_at is required');
        }
        return value;
      })(),
      filename: (() {
        final value = json['filename']?.toString();
        if (value == null) {
          throw FormatException('OpenAiFile.filename is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiFile.id is required');
        }
        return value;
      })(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiFile.object is required');
        }
        return value;
      })(),
      purpose: (() {
        final value = json['purpose']?.toString();
        if (value == null) {
          throw FormatException('OpenAiFile.purpose is required');
        }
        return value;
      })(),
      status: json['status']?.toString(),
      statusDetails: json['status_details']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bytes': bytes,
      'created_at': createdAt,
      'filename': filename,
      'id': id,
      'object': object,
      'purpose': purpose,
      'status': status,
      'status_details': statusDetails,
    };
  }
}

class OpenAiFileList {
  final List<OpenAiFile> data;
  final String? firstId;
  final bool? hasMore;
  final String? lastId;
  final String object;

  OpenAiFileList({
    required this.data,
    this.firstId,
    this.hasMore,
    this.lastId,
    required this.object
  });

  factory OpenAiFileList.fromJson(Map<String, dynamic> json) {
    return OpenAiFileList(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          throw FormatException('OpenAiFileList.data is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiFile.fromJson(map);
      })())
            .whereType<OpenAiFile>()
            .toList();
      })(),
      firstId: json['first_id']?.toString(),
      hasMore: json['has_more'] is bool ? json['has_more'] : null,
      lastId: json['last_id']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiFileList.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data.map((item) => item.toJson()).toList(),
      'first_id': firstId,
      'has_more': hasMore,
      'last_id': lastId,
      'object': object,
    };
  }
}

class OpenAiFileReferenceInput {


  OpenAiFileReferenceInput();

  factory OpenAiFileReferenceInput.fromJson(Map<String, dynamic> json) {
    return OpenAiFileReferenceInput();
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{};
  }
}

class OpenAiFileReferenceObject {
  final String? fileData;
  final String? fileId;
  final String? filename;
  final String? mimeType;
  final String? url;

  OpenAiFileReferenceObject({
    this.fileData,
    this.fileId,
    this.filename,
    this.mimeType,
    this.url
  });

  factory OpenAiFileReferenceObject.fromJson(Map<String, dynamic> json) {
    return OpenAiFileReferenceObject(
      fileData: json['file_data']?.toString(),
      fileId: json['file_id']?.toString(),
      filename: json['filename']?.toString(),
      mimeType: json['mime_type']?.toString(),
      url: json['url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'file_data': fileData,
      'file_id': fileId,
      'filename': filename,
      'mime_type': mimeType,
      'url': url,
    };
  }
}

class OpenAiFileUploadRequest {
  final String file;
  final String purpose;

  OpenAiFileUploadRequest({
    required this.file,
    required this.purpose
  });

  factory OpenAiFileUploadRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiFileUploadRequest(
      file: (() {
        final value = json['file']?.toString();
        if (value == null) {
          throw FormatException('OpenAiFileUploadRequest.file is required');
        }
        return value;
      })(),
      purpose: (() {
        final value = json['purpose']?.toString();
        if (value == null) {
          throw FormatException('OpenAiFileUploadRequest.purpose is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'file': file,
      'purpose': purpose,
    };
  }
}

class OpenAiFunctionCall {
  final String arguments;
  final String name;

  OpenAiFunctionCall({
    required this.arguments,
    required this.name
  });

  factory OpenAiFunctionCall.fromJson(Map<String, dynamic> json) {
    return OpenAiFunctionCall(
      arguments: (() {
        final value = json['arguments']?.toString();
        if (value == null) {
          throw FormatException('OpenAiFunctionCall.arguments is required');
        }
        return value;
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('OpenAiFunctionCall.name is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'arguments': arguments,
      'name': name,
    };
  }
}

class OpenAiFunctionCallChoice {


  OpenAiFunctionCallChoice();

  factory OpenAiFunctionCallChoice.fromJson(Map<String, dynamic> json) {
    return OpenAiFunctionCallChoice();
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{};
  }
}

class OpenAiFunctionDefinition {
  final String? description;
  final String name;
  final OpenAiJsonSchema? parameters;
  final bool? strict;

  OpenAiFunctionDefinition({
    this.description,
    required this.name,
    this.parameters,
    this.strict
  });

  factory OpenAiFunctionDefinition.fromJson(Map<String, dynamic> json) {
    return OpenAiFunctionDefinition(
      description: json['description']?.toString(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('OpenAiFunctionDefinition.name is required');
        }
        return value;
      })(),
      parameters: (() {
        final map = _sdkworkAsMap(json['parameters']);
        return map == null ? null : OpenAiJsonSchema.fromJson(map);
      })(),
      strict: json['strict'] is bool ? json['strict'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'description': description,
      'name': name,
      'parameters': parameters?.toJson(),
      'strict': strict,
    };
  }
}

class OpenAiImage {
  final String? b64Json;
  final String? mimeType;
  final String? revisedPrompt;
  final String? url;

  OpenAiImage({
    this.b64Json,
    this.mimeType,
    this.revisedPrompt,
    this.url
  });

  factory OpenAiImage.fromJson(Map<String, dynamic> json) {
    return OpenAiImage(
      b64Json: json['b64_json']?.toString(),
      mimeType: json['mime_type']?.toString(),
      revisedPrompt: json['revised_prompt']?.toString(),
      url: json['url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'b64_json': b64Json,
      'mime_type': mimeType,
      'revised_prompt': revisedPrompt,
      'url': url,
    };
  }
}

class OpenAiImageEditMultipartRequest {
  final String image;
  final String? mask;
  final String model;
  final String prompt;

  OpenAiImageEditMultipartRequest({
    required this.image,
    this.mask,
    required this.model,
    required this.prompt
  });

  factory OpenAiImageEditMultipartRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiImageEditMultipartRequest(
      image: (() {
        final value = json['image']?.toString();
        if (value == null) {
          throw FormatException('OpenAiImageEditMultipartRequest.image is required');
        }
        return value;
      })(),
      mask: json['mask']?.toString(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiImageEditMultipartRequest.model is required');
        }
        return value;
      })(),
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('OpenAiImageEditMultipartRequest.prompt is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'image': image,
      'mask': mask,
      'model': model,
      'prompt': prompt,
    };
  }
}

class OpenAiImageEditRequest {
  final OpenAiImageReferenceInputList? image;
  final OpenAiImageReferenceInput? mask;
  final String model;
  final String prompt;

  OpenAiImageEditRequest({
    this.image,
    this.mask,
    required this.model,
    required this.prompt
  });

  factory OpenAiImageEditRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiImageEditRequest(
      image: (() {
        final map = _sdkworkAsMap(json['image']);
        return map == null ? null : OpenAiImageReferenceInputList.fromJson(map);
      })(),
      mask: (() {
        final map = _sdkworkAsMap(json['mask']);
        return map == null ? null : OpenAiImageReferenceInput.fromJson(map);
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiImageEditRequest.model is required');
        }
        return value;
      })(),
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('OpenAiImageEditRequest.prompt is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'image': image?.toJson(),
      'mask': mask?.toJson(),
      'model': model,
      'prompt': prompt,
    };
  }
}

class OpenAiImageGenerationRequest {
  final String model;
  final int? n;
  final String prompt;
  final String? quality;
  final String? responseFormat;
  final String? size;

  OpenAiImageGenerationRequest({
    required this.model,
    this.n,
    required this.prompt,
    this.quality,
    this.responseFormat,
    this.size
  });

  factory OpenAiImageGenerationRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiImageGenerationRequest(
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiImageGenerationRequest.model is required');
        }
        return value;
      })(),
      n: json['n'] is int ? json['n'] : null,
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('OpenAiImageGenerationRequest.prompt is required');
        }
        return value;
      })(),
      quality: json['quality']?.toString(),
      responseFormat: json['response_format']?.toString(),
      size: json['size']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'model': model,
      'n': n,
      'prompt': prompt,
      'quality': quality,
      'response_format': responseFormat,
      'size': size,
    };
  }
}

class OpenAiImageList {
  final int created;
  final List<OpenAiImage> data;
  final OpenAiTokenUsage? usage;

  OpenAiImageList({
    required this.created,
    required this.data,
    this.usage
  });

  factory OpenAiImageList.fromJson(Map<String, dynamic> json) {
    return OpenAiImageList(
      created: (() {
        final value = json['created'];
        if (value is! int) {
          throw FormatException('OpenAiImageList.created is required');
        }
        return value;
      })(),
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          throw FormatException('OpenAiImageList.data is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiImage.fromJson(map);
      })())
            .whereType<OpenAiImage>()
            .toList();
      })(),
      usage: (() {
        final map = _sdkworkAsMap(json['usage']);
        return map == null ? null : OpenAiTokenUsage.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created': created,
      'data': data.map((item) => item.toJson()).toList(),
      'usage': usage?.toJson(),
    };
  }
}

class OpenAiImageReferenceInput {


  OpenAiImageReferenceInput();

  factory OpenAiImageReferenceInput.fromJson(Map<String, dynamic> json) {
    return OpenAiImageReferenceInput();
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{};
  }
}

class OpenAiImageReferenceInputList {


  OpenAiImageReferenceInputList();

  factory OpenAiImageReferenceInputList.fromJson(Map<String, dynamic> json) {
    return OpenAiImageReferenceInputList();
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{};
  }
}

class OpenAiImageReferenceObject {
  final String? b64Json;
  final String? detail;
  final String? fileId;
  final String? mimeType;
  final String? url;

  OpenAiImageReferenceObject({
    this.b64Json,
    this.detail,
    this.fileId,
    this.mimeType,
    this.url
  });

  factory OpenAiImageReferenceObject.fromJson(Map<String, dynamic> json) {
    return OpenAiImageReferenceObject(
      b64Json: json['b64_json']?.toString(),
      detail: json['detail']?.toString(),
      fileId: json['file_id']?.toString(),
      mimeType: json['mime_type']?.toString(),
      url: json['url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'b64_json': b64Json,
      'detail': detail,
      'file_id': fileId,
      'mime_type': mimeType,
      'url': url,
    };
  }
}

class OpenAiImageVariationMultipartRequest {
  final String image;
  final String model;
  final String? size;

  OpenAiImageVariationMultipartRequest({
    required this.image,
    required this.model,
    this.size
  });

  factory OpenAiImageVariationMultipartRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiImageVariationMultipartRequest(
      image: (() {
        final value = json['image']?.toString();
        if (value == null) {
          throw FormatException('OpenAiImageVariationMultipartRequest.image is required');
        }
        return value;
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiImageVariationMultipartRequest.model is required');
        }
        return value;
      })(),
      size: json['size']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'image': image,
      'model': model,
      'size': size,
    };
  }
}

class OpenAiImageVariationRequest {
  final OpenAiImageReferenceInput image;
  final String model;
  final String? size;

  OpenAiImageVariationRequest({
    required this.image,
    required this.model,
    this.size
  });

  factory OpenAiImageVariationRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiImageVariationRequest(
      image: (() {
        final map = _sdkworkAsMap(json['image']);
        if (map == null) {
          throw FormatException('OpenAiImageVariationRequest.image is required');
        }
        return OpenAiImageReferenceInput.fromJson(map);
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiImageVariationRequest.model is required');
        }
        return value;
      })(),
      size: json['size']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'image': image.toJson(),
      'model': model,
      'size': size,
    };
  }
}

class OpenAiIncompleteDetails {
  final String reason;

  OpenAiIncompleteDetails({
    required this.reason
  });

  factory OpenAiIncompleteDetails.fromJson(Map<String, dynamic> json) {
    return OpenAiIncompleteDetails(
      reason: (() {
        final value = json['reason']?.toString();
        if (value == null) {
          throw FormatException('OpenAiIncompleteDetails.reason is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'reason': reason,
    };
  }
}

class OpenAiJsonSchema {
  final bool? additionalProperties;
  final String? description;
  final List<dynamic>? enum_;
  final dynamic items;
  final Map<String, dynamic>? properties;
  final List<String>? required_;
  final String? type;

  OpenAiJsonSchema({
    this.additionalProperties,
    this.description,
    this.enum_,
    this.items,
    this.properties,
    this.required_,
    this.type
  });

  factory OpenAiJsonSchema.fromJson(Map<String, dynamic> json) {
    return OpenAiJsonSchema(
      additionalProperties: json['additionalProperties'] is bool ? json['additionalProperties'] : null,
      description: json['description']?.toString(),
      enum_: (() {
        final list = _sdkworkAsList(json['enum']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<dynamic>()
            .toList();
      })(),
      items: json['items'],
      properties: (() {
        final map = _sdkworkAsMap(json['properties']);
        if (map == null) {
          return null;
        }
        final result = <String, dynamic>{};
        map.forEach((key, item) {
          final deserialized = item;
          result[key] = deserialized;
        });
        return result;
      })(),
      required_: (() {
        final list = _sdkworkAsList(json['required']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      type: json['type']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'additionalProperties': additionalProperties,
      'description': description,
      'enum': enum_?.map((item) => item).toList(),
      'items': items,
      'properties': properties?.map((key, item) => MapEntry(key, item)),
      'required': required_?.map((item) => item).toList(),
      'type': type,
    };
  }
}

class OpenAiJsonSchemaFormat {
  final String? description;
  final String name;
  final OpenAiJsonSchema? schema;
  final bool? strict;

  OpenAiJsonSchemaFormat({
    this.description,
    required this.name,
    this.schema,
    this.strict
  });

  factory OpenAiJsonSchemaFormat.fromJson(Map<String, dynamic> json) {
    return OpenAiJsonSchemaFormat(
      description: json['description']?.toString(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('OpenAiJsonSchemaFormat.name is required');
        }
        return value;
      })(),
      schema: (() {
        final map = _sdkworkAsMap(json['schema']);
        return map == null ? null : OpenAiJsonSchema.fromJson(map);
      })(),
      strict: json['strict'] is bool ? json['strict'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'description': description,
      'name': name,
      'schema': schema?.toJson(),
      'strict': strict,
    };
  }
}

class OpenAiModel {
  final int? created;
  final String id;
  final String object;
  final String ownedBy;

  OpenAiModel({
    this.created,
    required this.id,
    required this.object,
    required this.ownedBy
  });

  factory OpenAiModel.fromJson(Map<String, dynamic> json) {
    return OpenAiModel(
      created: json['created'] is int ? json['created'] : null,
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiModel.id is required');
        }
        return value;
      })(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiModel.object is required');
        }
        return value;
      })(),
      ownedBy: (() {
        final value = json['owned_by']?.toString();
        if (value == null) {
          throw FormatException('OpenAiModel.owned_by is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created': created,
      'id': id,
      'object': object,
      'owned_by': ownedBy,
    };
  }
}

class OpenAiModelList {
  final List<OpenAiModel> data;
  final String object;

  OpenAiModelList({
    required this.data,
    required this.object
  });

  factory OpenAiModelList.fromJson(Map<String, dynamic> json) {
    return OpenAiModelList(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          throw FormatException('OpenAiModelList.data is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiModel.fromJson(map);
      })())
            .whereType<OpenAiModel>()
            .toList();
      })(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiModelList.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data.map((item) => item.toJson()).toList(),
      'object': object,
    };
  }
}

class OpenAiModeration {
  final String id;
  final String model;
  final List<OpenAiModerationResult> results;

  OpenAiModeration({
    required this.id,
    required this.model,
    required this.results
  });

  factory OpenAiModeration.fromJson(Map<String, dynamic> json) {
    return OpenAiModeration(
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiModeration.id is required');
        }
        return value;
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiModeration.model is required');
        }
        return value;
      })(),
      results: (() {
        final list = _sdkworkAsList(json['results']);
        if (list == null) {
          throw FormatException('OpenAiModeration.results is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiModerationResult.fromJson(map);
      })())
            .whereType<OpenAiModerationResult>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'model': model,
      'results': results.map((item) => item.toJson()).toList(),
    };
  }
}

class OpenAiModerationCreateRequest {
  final dynamic input;
  final String model;

  OpenAiModerationCreateRequest({
    required this.input,
    required this.model
  });

  factory OpenAiModerationCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiModerationCreateRequest(
      input: (() {
        final value = json['input']?.toString();
        if (value == null) {
          throw FormatException('OpenAiModerationCreateRequest.input is required');
        }
        return value;
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiModerationCreateRequest.model is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'input': input,
      'model': model,
    };
  }
}

class OpenAiModerationResult {
  final Map<String, dynamic>? categories;
  final Map<String, double>? categoryScores;
  final bool? flagged;

  OpenAiModerationResult({
    this.categories,
    this.categoryScores,
    this.flagged
  });

  factory OpenAiModerationResult.fromJson(Map<String, dynamic> json) {
    return OpenAiModerationResult(
      categories: (() {
        final map = _sdkworkAsMap(json['categories']);
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
      categoryScores: (() {
        final map = _sdkworkAsMap(json['category_scores']);
        if (map == null) {
          return null;
        }
        final result = <String, double>{};
        map.forEach((key, item) {
          final deserialized = item is num ? item.toDouble() : null;
          if (deserialized is double) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      flagged: json['flagged'] is bool ? json['flagged'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'categories': categories?.map((key, item) => MapEntry(key, item)),
      'category_scores': categoryScores?.map((key, item) => MapEntry(key, item)),
      'flagged': flagged,
    };
  }
}

class OpenAiNamedFunctionChoice {
  final String name;

  OpenAiNamedFunctionChoice({
    required this.name
  });

  factory OpenAiNamedFunctionChoice.fromJson(Map<String, dynamic> json) {
    return OpenAiNamedFunctionChoice(
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('OpenAiNamedFunctionChoice.name is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'name': name,
    };
  }
}

class OpenAiNamedToolChoice {
  final OpenAiNamedToolChoiceFunction function_;
  final String type;

  OpenAiNamedToolChoice({
    required this.function_,
    required this.type
  });

  factory OpenAiNamedToolChoice.fromJson(Map<String, dynamic> json) {
    return OpenAiNamedToolChoice(
      function_: (() {
        final map = _sdkworkAsMap(json['function']);
        if (map == null) {
          throw FormatException('OpenAiNamedToolChoice.function is required');
        }
        return OpenAiNamedToolChoiceFunction.fromJson(map);
      })(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('OpenAiNamedToolChoice.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'function': function_.toJson(),
      'type': type,
    };
  }
}

class OpenAiNamedToolChoiceFunction {
  final String name;

  OpenAiNamedToolChoiceFunction({
    required this.name
  });

  factory OpenAiNamedToolChoiceFunction.fromJson(Map<String, dynamic> json) {
    return OpenAiNamedToolChoiceFunction(
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('OpenAiNamedToolChoiceFunction.name is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'name': name,
    };
  }
}

class OpenAiPredictionConfig {
  final dynamic content;
  final String type;

  OpenAiPredictionConfig({
    this.content,
    required this.type
  });

  factory OpenAiPredictionConfig.fromJson(Map<String, dynamic> json) {
    return OpenAiPredictionConfig(
      content: json['content']?.toString(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('OpenAiPredictionConfig.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'content': content,
      'type': type,
    };
  }
}

class OpenAiPromptReference {
  final String? id;
  final Map<String, dynamic>? variables;
  final String? version;

  OpenAiPromptReference({
    this.id,
    this.variables,
    this.version
  });

  factory OpenAiPromptReference.fromJson(Map<String, dynamic> json) {
    return OpenAiPromptReference(
      id: json['id']?.toString(),
      variables: (() {
        final map = _sdkworkAsMap(json['variables']);
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
      version: json['version']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'variables': variables?.map((key, item) => MapEntry(key, item)),
      'version': version,
    };
  }
}

class OpenAiPromptTokensDetails {
  final int? audioTokens;
  final int? cachedTokens;

  OpenAiPromptTokensDetails({
    this.audioTokens,
    this.cachedTokens
  });

  factory OpenAiPromptTokensDetails.fromJson(Map<String, dynamic> json) {
    return OpenAiPromptTokensDetails(
      audioTokens: json['audio_tokens'] is int ? json['audio_tokens'] : null,
      cachedTokens: json['cached_tokens'] is int ? json['cached_tokens'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'audio_tokens': audioTokens,
      'cached_tokens': cachedTokens,
    };
  }
}

class OpenAiRealtimeCall {
  final int? createdAt;
  final String id;
  final Map<String, dynamic>? metadata;
  final String object;
  final String? sdp;
  final dynamic session;
  final String status;

  OpenAiRealtimeCall({
    this.createdAt,
    required this.id,
    this.metadata,
    required this.object,
    this.sdp,
    this.session,
    required this.status
  });

  factory OpenAiRealtimeCall.fromJson(Map<String, dynamic> json) {
    return OpenAiRealtimeCall(
      createdAt: json['created_at'] is int ? json['created_at'] : null,
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRealtimeCall.id is required');
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
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRealtimeCall.object is required');
        }
        return value;
      })(),
      sdp: json['sdp']?.toString(),
      session: json['session']?.toString(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRealtimeCall.status is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created_at': createdAt,
      'id': id,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'object': object,
      'sdp': sdp,
      'session': session,
      'status': status,
    };
  }
}

class OpenAiRealtimeCallActionRequest {
  final Map<String, dynamic>? metadata;

  OpenAiRealtimeCallActionRequest({
    this.metadata
  });

  factory OpenAiRealtimeCallActionRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiRealtimeCallActionRequest(
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
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class OpenAiRealtimeCallCreateRequest {
  final Map<String, dynamic>? metadata;
  final String? sdp;
  final dynamic session;

  OpenAiRealtimeCallCreateRequest({
    this.metadata,
    this.sdp,
    this.session
  });

  factory OpenAiRealtimeCallCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiRealtimeCallCreateRequest(
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
      sdp: json['sdp']?.toString(),
      session: json['session']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'sdp': sdp,
      'session': session,
    };
  }
}

class OpenAiRealtimeCallMultipartRequest {
  final String sdp;
  final String? session;

  OpenAiRealtimeCallMultipartRequest({
    required this.sdp,
    this.session
  });

  factory OpenAiRealtimeCallMultipartRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiRealtimeCallMultipartRequest(
      sdp: (() {
        final value = json['sdp']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRealtimeCallMultipartRequest.sdp is required');
        }
        return value;
      })(),
      session: json['session']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'sdp': sdp,
      'session': session,
    };
  }
}

class OpenAiRealtimeCallReferRequest {
  final Map<String, dynamic>? metadata;
  final String? target;

  OpenAiRealtimeCallReferRequest({
    this.metadata,
    this.target
  });

  factory OpenAiRealtimeCallReferRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiRealtimeCallReferRequest(
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
      target: json['target']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'target': target,
    };
  }
}

class OpenAiRealtimeClientSecret {
  final OpenAiRealtimeClientSecretValue clientSecret;
  final dynamic session;

  OpenAiRealtimeClientSecret({
    required this.clientSecret,
    this.session
  });

  factory OpenAiRealtimeClientSecret.fromJson(Map<String, dynamic> json) {
    return OpenAiRealtimeClientSecret(
      clientSecret: (() {
        final map = _sdkworkAsMap(json['client_secret']);
        if (map == null) {
          throw FormatException('OpenAiRealtimeClientSecret.client_secret is required');
        }
        return OpenAiRealtimeClientSecretValue.fromJson(map);
      })(),
      session: json['session']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'client_secret': clientSecret.toJson(),
      'session': session,
    };
  }
}

class OpenAiRealtimeClientSecretCreateRequest {
  final String? instructions;
  final Map<String, dynamic>? metadata;
  final List<String>? modalities;
  final String? model;
  final String? voice;

  OpenAiRealtimeClientSecretCreateRequest({
    this.instructions,
    this.metadata,
    this.modalities,
    this.model,
    this.voice
  });

  factory OpenAiRealtimeClientSecretCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiRealtimeClientSecretCreateRequest(
      instructions: json['instructions']?.toString(),
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
      model: json['model']?.toString(),
      voice: json['voice']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'instructions': instructions,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'modalities': modalities?.map((item) => item).toList(),
      'model': model,
      'voice': voice,
    };
  }
}

class OpenAiRealtimeClientSecretValue {
  final int? expiresAt;
  final String value;

  OpenAiRealtimeClientSecretValue({
    this.expiresAt,
    required this.value
  });

  factory OpenAiRealtimeClientSecretValue.fromJson(Map<String, dynamic> json) {
    return OpenAiRealtimeClientSecretValue(
      expiresAt: json['expires_at'] is int ? json['expires_at'] : null,
      value: (() {
        final value = json['value']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRealtimeClientSecretValue.value is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'expires_at': expiresAt,
      'value': value,
    };
  }
}

class OpenAiRealtimeSession {
  final OpenAiRealtimeClientSecretValue? clientSecret;
  final String id;
  final String? instructions;
  final List<String>? modalities;
  final String? model;
  final String object;
  final String? voice;

  OpenAiRealtimeSession({
    this.clientSecret,
    required this.id,
    this.instructions,
    this.modalities,
    this.model,
    required this.object,
    this.voice
  });

  factory OpenAiRealtimeSession.fromJson(Map<String, dynamic> json) {
    return OpenAiRealtimeSession(
      clientSecret: (() {
        final map = _sdkworkAsMap(json['client_secret']);
        return map == null ? null : OpenAiRealtimeClientSecretValue.fromJson(map);
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRealtimeSession.id is required');
        }
        return value;
      })(),
      instructions: json['instructions']?.toString(),
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
      model: json['model']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRealtimeSession.object is required');
        }
        return value;
      })(),
      voice: json['voice']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'client_secret': clientSecret?.toJson(),
      'id': id,
      'instructions': instructions,
      'modalities': modalities?.map((item) => item).toList(),
      'model': model,
      'object': object,
      'voice': voice,
    };
  }
}

class OpenAiRealtimeSessionCreateRequest {
  final String? instructions;
  final Map<String, dynamic>? metadata;
  final List<String>? modalities;
  final String? model;
  final String? voice;

  OpenAiRealtimeSessionCreateRequest({
    this.instructions,
    this.metadata,
    this.modalities,
    this.model,
    this.voice
  });

  factory OpenAiRealtimeSessionCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiRealtimeSessionCreateRequest(
      instructions: json['instructions']?.toString(),
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
      model: json['model']?.toString(),
      voice: json['voice']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'instructions': instructions,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'modalities': modalities?.map((item) => item).toList(),
      'model': model,
      'voice': voice,
    };
  }
}

class OpenAiRealtimeTranscriptionSession {
  final OpenAiRealtimeClientSecretValue? clientSecret;
  final String id;
  final String? inputAudioFormat;
  final dynamic inputAudioTranscription;
  final String object;

  OpenAiRealtimeTranscriptionSession({
    this.clientSecret,
    required this.id,
    this.inputAudioFormat,
    this.inputAudioTranscription,
    required this.object
  });

  factory OpenAiRealtimeTranscriptionSession.fromJson(Map<String, dynamic> json) {
    return OpenAiRealtimeTranscriptionSession(
      clientSecret: (() {
        final map = _sdkworkAsMap(json['client_secret']);
        return map == null ? null : OpenAiRealtimeClientSecretValue.fromJson(map);
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRealtimeTranscriptionSession.id is required');
        }
        return value;
      })(),
      inputAudioFormat: json['input_audio_format']?.toString(),
      inputAudioTranscription: json['input_audio_transcription']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRealtimeTranscriptionSession.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'client_secret': clientSecret?.toJson(),
      'id': id,
      'input_audio_format': inputAudioFormat,
      'input_audio_transcription': inputAudioTranscription,
      'object': object,
    };
  }
}

class OpenAiRealtimeTranscriptionSessionCreateRequest {
  final String? inputAudioFormat;
  final dynamic inputAudioTranscription;
  final Map<String, dynamic>? metadata;
  final String? model;
  final dynamic turnDetection;

  OpenAiRealtimeTranscriptionSessionCreateRequest({
    this.inputAudioFormat,
    this.inputAudioTranscription,
    this.metadata,
    this.model,
    this.turnDetection
  });

  factory OpenAiRealtimeTranscriptionSessionCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiRealtimeTranscriptionSessionCreateRequest(
      inputAudioFormat: json['input_audio_format']?.toString(),
      inputAudioTranscription: json['input_audio_transcription']?.toString(),
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
      turnDetection: json['turn_detection']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'input_audio_format': inputAudioFormat,
      'input_audio_transcription': inputAudioTranscription,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'turn_detection': turnDetection,
    };
  }
}

class OpenAiRealtimeTranslationSession {
  final OpenAiRealtimeClientSecretValue? clientSecret;
  final String id;
  final String object;
  final String? sourceLanguage;
  final String? targetLanguage;

  OpenAiRealtimeTranslationSession({
    this.clientSecret,
    required this.id,
    required this.object,
    this.sourceLanguage,
    this.targetLanguage
  });

  factory OpenAiRealtimeTranslationSession.fromJson(Map<String, dynamic> json) {
    return OpenAiRealtimeTranslationSession(
      clientSecret: (() {
        final map = _sdkworkAsMap(json['client_secret']);
        return map == null ? null : OpenAiRealtimeClientSecretValue.fromJson(map);
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRealtimeTranslationSession.id is required');
        }
        return value;
      })(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRealtimeTranslationSession.object is required');
        }
        return value;
      })(),
      sourceLanguage: json['source_language']?.toString(),
      targetLanguage: json['target_language']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'client_secret': clientSecret?.toJson(),
      'id': id,
      'object': object,
      'source_language': sourceLanguage,
      'target_language': targetLanguage,
    };
  }
}

class OpenAiRealtimeTranslationSessionCreateRequest {
  final Map<String, dynamic>? metadata;
  final String? model;
  final String? sourceLanguage;
  final String? targetLanguage;

  OpenAiRealtimeTranslationSessionCreateRequest({
    this.metadata,
    this.model,
    this.sourceLanguage,
    this.targetLanguage
  });

  factory OpenAiRealtimeTranslationSessionCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiRealtimeTranslationSessionCreateRequest(
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
      sourceLanguage: json['source_language']?.toString(),
      targetLanguage: json['target_language']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'source_language': sourceLanguage,
      'target_language': targetLanguage,
    };
  }
}

class OpenAiReasoningConfig {
  final String? effort;
  final String? summary;

  OpenAiReasoningConfig({
    this.effort,
    this.summary
  });

  factory OpenAiReasoningConfig.fromJson(Map<String, dynamic> json) {
    return OpenAiReasoningConfig(
      effort: json['effort']?.toString(),
      summary: json['summary']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'effort': effort,
      'summary': summary,
    };
  }
}

class OpenAiResponse {
  final int? createdAt;
  final OpenAiResponseError? error;
  final String id;
  final OpenAiIncompleteDetails? incompleteDetails;
  final String model;
  final String object;
  final List<OpenAiResponseOutputItem> output;
  final String? outputText;
  final String? status;
  final OpenAiResponseUsage? usage;

  OpenAiResponse({
    this.createdAt,
    this.error,
    required this.id,
    this.incompleteDetails,
    required this.model,
    required this.object,
    required this.output,
    this.outputText,
    this.status,
    this.usage
  });

  factory OpenAiResponse.fromJson(Map<String, dynamic> json) {
    return OpenAiResponse(
      createdAt: json['created_at'] is int ? json['created_at'] : null,
      error: (() {
        final map = _sdkworkAsMap(json['error']);
        return map == null ? null : OpenAiResponseError.fromJson(map);
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiResponse.id is required');
        }
        return value;
      })(),
      incompleteDetails: (() {
        final map = _sdkworkAsMap(json['incomplete_details']);
        return map == null ? null : OpenAiIncompleteDetails.fromJson(map);
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiResponse.model is required');
        }
        return value;
      })(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiResponse.object is required');
        }
        return value;
      })(),
      output: (() {
        final list = _sdkworkAsList(json['output']);
        if (list == null) {
          throw FormatException('OpenAiResponse.output is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiResponseOutputItem.fromJson(map);
      })())
            .whereType<OpenAiResponseOutputItem>()
            .toList();
      })(),
      outputText: json['output_text']?.toString(),
      status: json['status']?.toString(),
      usage: (() {
        final map = _sdkworkAsMap(json['usage']);
        return map == null ? null : OpenAiResponseUsage.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created_at': createdAt,
      'error': error?.toJson(),
      'id': id,
      'incomplete_details': incompleteDetails?.toJson(),
      'model': model,
      'object': object,
      'output': output.map((item) => item.toJson()).toList(),
      'output_text': outputText,
      'status': status,
      'usage': usage?.toJson(),
    };
  }
}

class OpenAiResponseCompactRequest {
  final dynamic input;
  final Map<String, dynamic>? metadata;
  final String? model;
  final String? previousResponseId;

  OpenAiResponseCompactRequest({
    this.input,
    this.metadata,
    this.model,
    this.previousResponseId
  });

  factory OpenAiResponseCompactRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiResponseCompactRequest(
      input: json['input']?.toString(),
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
      previousResponseId: json['previous_response_id']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'input': input,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'previous_response_id': previousResponseId,
    };
  }
}

class OpenAiResponseError {
  final String? code;
  final String? message;
  final String? param;
  final String? type;

  OpenAiResponseError({
    this.code,
    this.message,
    this.param,
    this.type
  });

  factory OpenAiResponseError.fromJson(Map<String, dynamic> json) {
    return OpenAiResponseError(
      code: json['code']?.toString(),
      message: json['message']?.toString(),
      param: json['param']?.toString(),
      type: json['type']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'message': message,
      'param': param,
      'type': type,
    };
  }
}

class OpenAiResponseFormat {
  final OpenAiJsonSchemaFormat? jsonSchema;
  final String type;

  OpenAiResponseFormat({
    this.jsonSchema,
    required this.type
  });

  factory OpenAiResponseFormat.fromJson(Map<String, dynamic> json) {
    return OpenAiResponseFormat(
      jsonSchema: (() {
        final map = _sdkworkAsMap(json['json_schema']);
        return map == null ? null : OpenAiJsonSchemaFormat.fromJson(map);
      })(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('OpenAiResponseFormat.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'json_schema': jsonSchema?.toJson(),
      'type': type,
    };
  }
}

class OpenAiResponseInputContentPart {
  final String? detail;
  final String? fileData;
  final String? fileId;
  final String? filename;
  final String? imageUrl;
  final String? text;
  final String type;

  OpenAiResponseInputContentPart({
    this.detail,
    this.fileData,
    this.fileId,
    this.filename,
    this.imageUrl,
    this.text,
    required this.type
  });

  factory OpenAiResponseInputContentPart.fromJson(Map<String, dynamic> json) {
    return OpenAiResponseInputContentPart(
      detail: json['detail']?.toString(),
      fileData: json['file_data']?.toString(),
      fileId: json['file_id']?.toString(),
      filename: json['filename']?.toString(),
      imageUrl: json['image_url']?.toString(),
      text: json['text']?.toString(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('OpenAiResponseInputContentPart.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'detail': detail,
      'file_data': fileData,
      'file_id': fileId,
      'filename': filename,
      'image_url': imageUrl,
      'text': text,
      'type': type,
    };
  }
}

class OpenAiResponseInputItem {
  final dynamic content;
  final String? id;
  final String? role;
  final String? status;
  final String? type;

  OpenAiResponseInputItem({
    this.content,
    this.id,
    this.role,
    this.status,
    this.type
  });

  factory OpenAiResponseInputItem.fromJson(Map<String, dynamic> json) {
    return OpenAiResponseInputItem(
      content: json['content']?.toString(),
      id: json['id']?.toString(),
      role: json['role']?.toString(),
      status: json['status']?.toString(),
      type: json['type']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'content': content,
      'id': id,
      'role': role,
      'status': status,
      'type': type,
    };
  }
}

class OpenAiResponseInputItemList {
  final List<OpenAiResponseInputItem> data;
  final String? firstId;
  final bool? hasMore;
  final String? lastId;
  final String object;

  OpenAiResponseInputItemList({
    required this.data,
    this.firstId,
    this.hasMore,
    this.lastId,
    required this.object
  });

  factory OpenAiResponseInputItemList.fromJson(Map<String, dynamic> json) {
    return OpenAiResponseInputItemList(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          throw FormatException('OpenAiResponseInputItemList.data is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiResponseInputItem.fromJson(map);
      })())
            .whereType<OpenAiResponseInputItem>()
            .toList();
      })(),
      firstId: json['first_id']?.toString(),
      hasMore: json['has_more'] is bool ? json['has_more'] : null,
      lastId: json['last_id']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiResponseInputItemList.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data.map((item) => item.toJson()).toList(),
      'first_id': firstId,
      'has_more': hasMore,
      'last_id': lastId,
      'object': object,
    };
  }
}

class OpenAiResponseInputTokenCount {
  final int inputTokens;
  final OpenAiResponseInputTokensDetails? inputTokensDetails;
  final String? model;
  final String? object;

  OpenAiResponseInputTokenCount({
    required this.inputTokens,
    this.inputTokensDetails,
    this.model,
    this.object
  });

  factory OpenAiResponseInputTokenCount.fromJson(Map<String, dynamic> json) {
    return OpenAiResponseInputTokenCount(
      inputTokens: (() {
        final value = json['input_tokens'];
        if (value is! int) {
          throw FormatException('OpenAiResponseInputTokenCount.input_tokens is required');
        }
        return value;
      })(),
      inputTokensDetails: (() {
        final map = _sdkworkAsMap(json['input_tokens_details']);
        return map == null ? null : OpenAiResponseInputTokensDetails.fromJson(map);
      })(),
      model: json['model']?.toString(),
      object: json['object']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'input_tokens': inputTokens,
      'input_tokens_details': inputTokensDetails?.toJson(),
      'model': model,
      'object': object,
    };
  }
}

class OpenAiResponseInputTokenCountRequest {
  final dynamic input;
  final String? instructions;
  final String model;
  final List<dynamic>? tools;

  OpenAiResponseInputTokenCountRequest({
    required this.input,
    this.instructions,
    required this.model,
    this.tools
  });

  factory OpenAiResponseInputTokenCountRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiResponseInputTokenCountRequest(
      input: (() {
        final value = json['input']?.toString();
        if (value == null) {
          throw FormatException('OpenAiResponseInputTokenCountRequest.input is required');
        }
        return value;
      })(),
      instructions: json['instructions']?.toString(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiResponseInputTokenCountRequest.model is required');
        }
        return value;
      })(),
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<dynamic>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'input': input,
      'instructions': instructions,
      'model': model,
      'tools': tools?.map((item) => item).toList(),
    };
  }
}

class OpenAiResponseInputTokensDetails {
  final int? cachedTokens;

  OpenAiResponseInputTokensDetails({
    this.cachedTokens
  });

  factory OpenAiResponseInputTokensDetails.fromJson(Map<String, dynamic> json) {
    return OpenAiResponseInputTokensDetails(
      cachedTokens: json['cached_tokens'] is int ? json['cached_tokens'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cached_tokens': cachedTokens,
    };
  }
}

class OpenAiResponseOutputContent {
  final List<OpenAiAnnotation>? annotations;
  final String? refusal;
  final String? text;
  final String type;

  OpenAiResponseOutputContent({
    this.annotations,
    this.refusal,
    this.text,
    required this.type
  });

  factory OpenAiResponseOutputContent.fromJson(Map<String, dynamic> json) {
    return OpenAiResponseOutputContent(
      annotations: (() {
        final list = _sdkworkAsList(json['annotations']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiAnnotation.fromJson(map);
      })())
            .whereType<OpenAiAnnotation>()
            .toList();
      })(),
      refusal: json['refusal']?.toString(),
      text: json['text']?.toString(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('OpenAiResponseOutputContent.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'annotations': annotations?.map((item) => item.toJson()).toList(),
      'refusal': refusal,
      'text': text,
      'type': type,
    };
  }
}

class OpenAiResponseOutputItem {
  final List<OpenAiResponseOutputContent>? content;
  final String? id;
  final String? role;
  final String? status;
  final String type;

  OpenAiResponseOutputItem({
    this.content,
    this.id,
    this.role,
    this.status,
    required this.type
  });

  factory OpenAiResponseOutputItem.fromJson(Map<String, dynamic> json) {
    return OpenAiResponseOutputItem(
      content: (() {
        final list = _sdkworkAsList(json['content']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiResponseOutputContent.fromJson(map);
      })())
            .whereType<OpenAiResponseOutputContent>()
            .toList();
      })(),
      id: json['id']?.toString(),
      role: json['role']?.toString(),
      status: json['status']?.toString(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('OpenAiResponseOutputItem.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'content': content?.map((item) => item.toJson()).toList(),
      'id': id,
      'role': role,
      'status': status,
      'type': type,
    };
  }
}

class OpenAiResponseOutputTokensDetails {
  final int? reasoningTokens;

  OpenAiResponseOutputTokensDetails({
    this.reasoningTokens
  });

  factory OpenAiResponseOutputTokensDetails.fromJson(Map<String, dynamic> json) {
    return OpenAiResponseOutputTokensDetails(
      reasoningTokens: json['reasoning_tokens'] is int ? json['reasoning_tokens'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'reasoning_tokens': reasoningTokens,
    };
  }
}

class OpenAiResponseUsage {
  final int inputTokens;
  final OpenAiResponseInputTokensDetails? inputTokensDetails;
  final int outputTokens;
  final OpenAiResponseOutputTokensDetails? outputTokensDetails;
  final int totalTokens;

  OpenAiResponseUsage({
    required this.inputTokens,
    this.inputTokensDetails,
    required this.outputTokens,
    this.outputTokensDetails,
    required this.totalTokens
  });

  factory OpenAiResponseUsage.fromJson(Map<String, dynamic> json) {
    return OpenAiResponseUsage(
      inputTokens: (() {
        final value = json['input_tokens'];
        if (value is! int) {
          throw FormatException('OpenAiResponseUsage.input_tokens is required');
        }
        return value;
      })(),
      inputTokensDetails: (() {
        final map = _sdkworkAsMap(json['input_tokens_details']);
        return map == null ? null : OpenAiResponseInputTokensDetails.fromJson(map);
      })(),
      outputTokens: (() {
        final value = json['output_tokens'];
        if (value is! int) {
          throw FormatException('OpenAiResponseUsage.output_tokens is required');
        }
        return value;
      })(),
      outputTokensDetails: (() {
        final map = _sdkworkAsMap(json['output_tokens_details']);
        return map == null ? null : OpenAiResponseOutputTokensDetails.fromJson(map);
      })(),
      totalTokens: (() {
        final value = json['total_tokens'];
        if (value is! int) {
          throw FormatException('OpenAiResponseUsage.total_tokens is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'input_tokens': inputTokens,
      'input_tokens_details': inputTokensDetails?.toJson(),
      'output_tokens': outputTokens,
      'output_tokens_details': outputTokensDetails?.toJson(),
      'total_tokens': totalTokens,
    };
  }
}

class OpenAiResponsesRequest {
  final bool? background;
  final dynamic conversation;
  final List<String>? include;
  final dynamic input;
  final String? instructions;
  final int? maxOutputTokens;
  final int? maxToolCalls;
  final Map<String, dynamic>? metadata;
  final String model;
  final bool? parallelToolCalls;
  final String? previousResponseId;
  final OpenAiPromptReference? prompt;
  final String? promptCacheKey;
  final OpenAiReasoningConfig? reasoning;
  final String? serviceTier;
  final bool? store;
  final bool? stream;
  final double? temperature;
  final OpenAiTextConfig? text;
  final OpenAiToolChoice? toolChoice;
  final List<OpenAiTool>? tools;
  final int? topLogprobs;
  final double? topP;
  final String? truncation;
  final String? user;

  OpenAiResponsesRequest({
    this.background,
    this.conversation,
    this.include,
    required this.input,
    this.instructions,
    this.maxOutputTokens,
    this.maxToolCalls,
    this.metadata,
    required this.model,
    this.parallelToolCalls,
    this.previousResponseId,
    this.prompt,
    this.promptCacheKey,
    this.reasoning,
    this.serviceTier,
    this.store,
    this.stream,
    this.temperature,
    this.text,
    this.toolChoice,
    this.tools,
    this.topLogprobs,
    this.topP,
    this.truncation,
    this.user
  });

  factory OpenAiResponsesRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiResponsesRequest(
      background: json['background'] is bool ? json['background'] : null,
      conversation: json['conversation']?.toString(),
      include: (() {
        final list = _sdkworkAsList(json['include']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      input: (() {
        final value = json['input']?.toString();
        if (value == null) {
          throw FormatException('OpenAiResponsesRequest.input is required');
        }
        return value;
      })(),
      instructions: json['instructions']?.toString(),
      maxOutputTokens: json['max_output_tokens'] is int ? json['max_output_tokens'] : null,
      maxToolCalls: json['max_tool_calls'] is int ? json['max_tool_calls'] : null,
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
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiResponsesRequest.model is required');
        }
        return value;
      })(),
      parallelToolCalls: json['parallel_tool_calls'] is bool ? json['parallel_tool_calls'] : null,
      previousResponseId: json['previous_response_id']?.toString(),
      prompt: (() {
        final map = _sdkworkAsMap(json['prompt']);
        return map == null ? null : OpenAiPromptReference.fromJson(map);
      })(),
      promptCacheKey: json['prompt_cache_key']?.toString(),
      reasoning: (() {
        final map = _sdkworkAsMap(json['reasoning']);
        return map == null ? null : OpenAiReasoningConfig.fromJson(map);
      })(),
      serviceTier: json['service_tier']?.toString(),
      store: json['store'] is bool ? json['store'] : null,
      stream: json['stream'] is bool ? json['stream'] : null,
      temperature: json['temperature'] is num ? json['temperature'].toDouble() : null,
      text: (() {
        final map = _sdkworkAsMap(json['text']);
        return map == null ? null : OpenAiTextConfig.fromJson(map);
      })(),
      toolChoice: (() {
        final map = _sdkworkAsMap(json['tool_choice']);
        return map == null ? null : OpenAiToolChoice.fromJson(map);
      })(),
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiTool.fromJson(map);
      })())
            .whereType<OpenAiTool>()
            .toList();
      })(),
      topLogprobs: json['top_logprobs'] is int ? json['top_logprobs'] : null,
      topP: json['top_p'] is num ? json['top_p'].toDouble() : null,
      truncation: json['truncation']?.toString(),
      user: json['user']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'background': background,
      'conversation': conversation,
      'include': include?.map((item) => item).toList(),
      'input': input,
      'instructions': instructions,
      'max_output_tokens': maxOutputTokens,
      'max_tool_calls': maxToolCalls,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'parallel_tool_calls': parallelToolCalls,
      'previous_response_id': previousResponseId,
      'prompt': prompt?.toJson(),
      'prompt_cache_key': promptCacheKey,
      'reasoning': reasoning?.toJson(),
      'service_tier': serviceTier,
      'store': store,
      'stream': stream,
      'temperature': temperature,
      'text': text?.toJson(),
      'tool_choice': toolChoice?.toJson(),
      'tools': tools?.map((item) => item.toJson()).toList(),
      'top_logprobs': topLogprobs,
      'top_p': topP,
      'truncation': truncation,
      'user': user,
    };
  }
}

class OpenAiRun {
  final String assistantId;
  final int? cancelledAt;
  final int? completedAt;
  final int createdAt;
  final int? expiresAt;
  final int? failedAt;
  final String id;
  final String? instructions;
  final dynamic lastError;
  final Map<String, dynamic>? metadata;
  final String? model;
  final String object;
  final dynamic requiredAction;
  final int? startedAt;
  final String status;
  final String threadId;
  final List<dynamic>? tools;
  final OpenAiTokenUsage? usage;

  OpenAiRun({
    required this.assistantId,
    this.cancelledAt,
    this.completedAt,
    required this.createdAt,
    this.expiresAt,
    this.failedAt,
    required this.id,
    this.instructions,
    this.lastError,
    this.metadata,
    this.model,
    required this.object,
    this.requiredAction,
    this.startedAt,
    required this.status,
    required this.threadId,
    this.tools,
    this.usage
  });

  factory OpenAiRun.fromJson(Map<String, dynamic> json) {
    return OpenAiRun(
      assistantId: (() {
        final value = json['assistant_id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRun.assistant_id is required');
        }
        return value;
      })(),
      cancelledAt: json['cancelled_at'] is int ? json['cancelled_at'] : null,
      completedAt: json['completed_at'] is int ? json['completed_at'] : null,
      createdAt: (() {
        final value = json['created_at'];
        if (value is! int) {
          throw FormatException('OpenAiRun.created_at is required');
        }
        return value;
      })(),
      expiresAt: json['expires_at'] is int ? json['expires_at'] : null,
      failedAt: json['failed_at'] is int ? json['failed_at'] : null,
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRun.id is required');
        }
        return value;
      })(),
      instructions: json['instructions']?.toString(),
      lastError: json['last_error']?.toString(),
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
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRun.object is required');
        }
        return value;
      })(),
      requiredAction: json['required_action']?.toString(),
      startedAt: json['started_at'] is int ? json['started_at'] : null,
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRun.status is required');
        }
        return value;
      })(),
      threadId: (() {
        final value = json['thread_id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRun.thread_id is required');
        }
        return value;
      })(),
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<dynamic>()
            .toList();
      })(),
      usage: (() {
        final map = _sdkworkAsMap(json['usage']);
        return map == null ? null : OpenAiTokenUsage.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'assistant_id': assistantId,
      'cancelled_at': cancelledAt,
      'completed_at': completedAt,
      'created_at': createdAt,
      'expires_at': expiresAt,
      'failed_at': failedAt,
      'id': id,
      'instructions': instructions,
      'last_error': lastError,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'object': object,
      'required_action': requiredAction,
      'started_at': startedAt,
      'status': status,
      'thread_id': threadId,
      'tools': tools?.map((item) => item).toList(),
      'usage': usage?.toJson(),
    };
  }
}

class OpenAiRunCreateRequest {
  final String? additionalInstructions;
  final String assistantId;
  final String? instructions;
  final Map<String, dynamic>? metadata;
  final String? model;
  final bool? stream;
  final List<dynamic>? tools;

  OpenAiRunCreateRequest({
    this.additionalInstructions,
    required this.assistantId,
    this.instructions,
    this.metadata,
    this.model,
    this.stream,
    this.tools
  });

  factory OpenAiRunCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiRunCreateRequest(
      additionalInstructions: json['additional_instructions']?.toString(),
      assistantId: (() {
        final value = json['assistant_id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRunCreateRequest.assistant_id is required');
        }
        return value;
      })(),
      instructions: json['instructions']?.toString(),
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
      stream: json['stream'] is bool ? json['stream'] : null,
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<dynamic>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'additional_instructions': additionalInstructions,
      'assistant_id': assistantId,
      'instructions': instructions,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'stream': stream,
      'tools': tools?.map((item) => item).toList(),
    };
  }
}

class OpenAiRunList {
  final List<OpenAiRun> data;
  final String? firstId;
  final bool? hasMore;
  final String? lastId;
  final String object;

  OpenAiRunList({
    required this.data,
    this.firstId,
    this.hasMore,
    this.lastId,
    required this.object
  });

  factory OpenAiRunList.fromJson(Map<String, dynamic> json) {
    return OpenAiRunList(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          throw FormatException('OpenAiRunList.data is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiRun.fromJson(map);
      })())
            .whereType<OpenAiRun>()
            .toList();
      })(),
      firstId: json['first_id']?.toString(),
      hasMore: json['has_more'] is bool ? json['has_more'] : null,
      lastId: json['last_id']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRunList.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data.map((item) => item.toJson()).toList(),
      'first_id': firstId,
      'has_more': hasMore,
      'last_id': lastId,
      'object': object,
    };
  }
}

class OpenAiRunStep {
  final String assistantId;
  final int? cancelledAt;
  final int? completedAt;
  final int createdAt;
  final int? expiredAt;
  final int? failedAt;
  final String id;
  final dynamic lastError;
  final Map<String, dynamic>? metadata;
  final String object;
  final String runId;
  final String status;
  final dynamic stepDetails;
  final String threadId;
  final String type;
  final OpenAiTokenUsage? usage;

  OpenAiRunStep({
    required this.assistantId,
    this.cancelledAt,
    this.completedAt,
    required this.createdAt,
    this.expiredAt,
    this.failedAt,
    required this.id,
    this.lastError,
    this.metadata,
    required this.object,
    required this.runId,
    required this.status,
    this.stepDetails,
    required this.threadId,
    required this.type,
    this.usage
  });

  factory OpenAiRunStep.fromJson(Map<String, dynamic> json) {
    return OpenAiRunStep(
      assistantId: (() {
        final value = json['assistant_id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRunStep.assistant_id is required');
        }
        return value;
      })(),
      cancelledAt: json['cancelled_at'] is int ? json['cancelled_at'] : null,
      completedAt: json['completed_at'] is int ? json['completed_at'] : null,
      createdAt: (() {
        final value = json['created_at'];
        if (value is! int) {
          throw FormatException('OpenAiRunStep.created_at is required');
        }
        return value;
      })(),
      expiredAt: json['expired_at'] is int ? json['expired_at'] : null,
      failedAt: json['failed_at'] is int ? json['failed_at'] : null,
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRunStep.id is required');
        }
        return value;
      })(),
      lastError: json['last_error']?.toString(),
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
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRunStep.object is required');
        }
        return value;
      })(),
      runId: (() {
        final value = json['run_id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRunStep.run_id is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRunStep.status is required');
        }
        return value;
      })(),
      stepDetails: json['step_details']?.toString(),
      threadId: (() {
        final value = json['thread_id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRunStep.thread_id is required');
        }
        return value;
      })(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRunStep.type is required');
        }
        return value;
      })(),
      usage: (() {
        final map = _sdkworkAsMap(json['usage']);
        return map == null ? null : OpenAiTokenUsage.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'assistant_id': assistantId,
      'cancelled_at': cancelledAt,
      'completed_at': completedAt,
      'created_at': createdAt,
      'expired_at': expiredAt,
      'failed_at': failedAt,
      'id': id,
      'last_error': lastError,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'object': object,
      'run_id': runId,
      'status': status,
      'step_details': stepDetails,
      'thread_id': threadId,
      'type': type,
      'usage': usage?.toJson(),
    };
  }
}

class OpenAiRunStepList {
  final List<OpenAiRunStep> data;
  final String? firstId;
  final bool? hasMore;
  final String? lastId;
  final String object;

  OpenAiRunStepList({
    required this.data,
    this.firstId,
    this.hasMore,
    this.lastId,
    required this.object
  });

  factory OpenAiRunStepList.fromJson(Map<String, dynamic> json) {
    return OpenAiRunStepList(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          throw FormatException('OpenAiRunStepList.data is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiRunStep.fromJson(map);
      })())
            .whereType<OpenAiRunStep>()
            .toList();
      })(),
      firstId: json['first_id']?.toString(),
      hasMore: json['has_more'] is bool ? json['has_more'] : null,
      lastId: json['last_id']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRunStepList.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data.map((item) => item.toJson()).toList(),
      'first_id': firstId,
      'has_more': hasMore,
      'last_id': lastId,
      'object': object,
    };
  }
}

class OpenAiRunSubmitToolOutputsRequest {
  final bool? stream;
  final List<dynamic> toolOutputs;

  OpenAiRunSubmitToolOutputsRequest({
    this.stream,
    required this.toolOutputs
  });

  factory OpenAiRunSubmitToolOutputsRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiRunSubmitToolOutputsRequest(
      stream: json['stream'] is bool ? json['stream'] : null,
      toolOutputs: (() {
        final list = _sdkworkAsList(json['tool_outputs']);
        if (list == null) {
          throw FormatException('OpenAiRunSubmitToolOutputsRequest.tool_outputs is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<dynamic>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'stream': stream,
      'tool_outputs': toolOutputs.map((item) => item).toList(),
    };
  }
}

class OpenAiRunUpdateRequest {
  final Map<String, dynamic>? metadata;

  OpenAiRunUpdateRequest({
    this.metadata
  });

  factory OpenAiRunUpdateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiRunUpdateRequest(
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
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class OpenAiSpeechCreateRequest {
  final dynamic input;
  final Map<String, dynamic>? metadata;
  final String model;
  final String? responseFormat;
  final double? speed;
  final String voice;

  OpenAiSpeechCreateRequest({
    required this.input,
    this.metadata,
    required this.model,
    this.responseFormat,
    this.speed,
    required this.voice
  });

  factory OpenAiSpeechCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiSpeechCreateRequest(
      input: (() {
        final value = json['input']?.toString();
        if (value == null) {
          throw FormatException('OpenAiSpeechCreateRequest.input is required');
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
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiSpeechCreateRequest.model is required');
        }
        return value;
      })(),
      responseFormat: json['response_format']?.toString(),
      speed: json['speed'] is num ? json['speed'].toDouble() : null,
      voice: (() {
        final value = json['voice']?.toString();
        if (value == null) {
          throw FormatException('OpenAiSpeechCreateRequest.voice is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'input': input,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'response_format': responseFormat,
      'speed': speed,
      'voice': voice,
    };
  }
}

class OpenAiStreamOptions {
  final bool? includeUsage;

  OpenAiStreamOptions({
    this.includeUsage
  });

  factory OpenAiStreamOptions.fromJson(Map<String, dynamic> json) {
    return OpenAiStreamOptions(
      includeUsage: json['include_usage'] is bool ? json['include_usage'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'include_usage': includeUsage,
    };
  }
}

class OpenAiTextConfig {
  final OpenAiResponseFormat? format;

  OpenAiTextConfig({
    this.format
  });

  factory OpenAiTextConfig.fromJson(Map<String, dynamic> json) {
    return OpenAiTextConfig(
      format: (() {
        final map = _sdkworkAsMap(json['format']);
        return map == null ? null : OpenAiResponseFormat.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'format': format?.toJson(),
    };
  }
}

class OpenAiThread {
  final int createdAt;
  final String id;
  final Map<String, dynamic>? metadata;
  final String object;
  final dynamic toolResources;

  OpenAiThread({
    required this.createdAt,
    required this.id,
    this.metadata,
    required this.object,
    this.toolResources
  });

  factory OpenAiThread.fromJson(Map<String, dynamic> json) {
    return OpenAiThread(
      createdAt: (() {
        final value = json['created_at'];
        if (value is! int) {
          throw FormatException('OpenAiThread.created_at is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiThread.id is required');
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
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiThread.object is required');
        }
        return value;
      })(),
      toolResources: json['tool_resources']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created_at': createdAt,
      'id': id,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'object': object,
      'tool_resources': toolResources,
    };
  }
}

class OpenAiThreadAndRunCreateRequest {
  final String assistantId;
  final String? instructions;
  final Map<String, dynamic>? metadata;
  final String? model;
  final bool? stream;
  final OpenAiThreadCreateRequest? thread;
  final List<dynamic>? tools;

  OpenAiThreadAndRunCreateRequest({
    required this.assistantId,
    this.instructions,
    this.metadata,
    this.model,
    this.stream,
    this.thread,
    this.tools
  });

  factory OpenAiThreadAndRunCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiThreadAndRunCreateRequest(
      assistantId: (() {
        final value = json['assistant_id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiThreadAndRunCreateRequest.assistant_id is required');
        }
        return value;
      })(),
      instructions: json['instructions']?.toString(),
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
      stream: json['stream'] is bool ? json['stream'] : null,
      thread: (() {
        final map = _sdkworkAsMap(json['thread']);
        return map == null ? null : OpenAiThreadCreateRequest.fromJson(map);
      })(),
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<dynamic>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'assistant_id': assistantId,
      'instructions': instructions,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'stream': stream,
      'thread': thread?.toJson(),
      'tools': tools?.map((item) => item).toList(),
    };
  }
}

class OpenAiThreadCreateRequest {
  final List<OpenAiThreadMessageCreateRequest>? messages;
  final Map<String, dynamic>? metadata;
  final dynamic toolResources;

  OpenAiThreadCreateRequest({
    this.messages,
    this.metadata,
    this.toolResources
  });

  factory OpenAiThreadCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiThreadCreateRequest(
      messages: (() {
        final list = _sdkworkAsList(json['messages']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiThreadMessageCreateRequest.fromJson(map);
      })())
            .whereType<OpenAiThreadMessageCreateRequest>()
            .toList();
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
      toolResources: json['tool_resources']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'messages': messages?.map((item) => item.toJson()).toList(),
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'tool_resources': toolResources,
    };
  }
}

class OpenAiThreadMessage {
  final String? assistantId;
  final List<dynamic>? attachments;
  final int? completedAt;
  final List<dynamic> content;
  final int createdAt;
  final String id;
  final int? incompleteAt;
  final dynamic incompleteDetails;
  final Map<String, dynamic>? metadata;
  final String object;
  final String role;
  final String? runId;
  final String? status;
  final String threadId;

  OpenAiThreadMessage({
    this.assistantId,
    this.attachments,
    this.completedAt,
    required this.content,
    required this.createdAt,
    required this.id,
    this.incompleteAt,
    this.incompleteDetails,
    this.metadata,
    required this.object,
    required this.role,
    this.runId,
    this.status,
    required this.threadId
  });

  factory OpenAiThreadMessage.fromJson(Map<String, dynamic> json) {
    return OpenAiThreadMessage(
      assistantId: json['assistant_id']?.toString(),
      attachments: (() {
        final list = _sdkworkAsList(json['attachments']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<dynamic>()
            .toList();
      })(),
      completedAt: json['completed_at'] is int ? json['completed_at'] : null,
      content: (() {
        final list = _sdkworkAsList(json['content']);
        if (list == null) {
          throw FormatException('OpenAiThreadMessage.content is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<dynamic>()
            .toList();
      })(),
      createdAt: (() {
        final value = json['created_at'];
        if (value is! int) {
          throw FormatException('OpenAiThreadMessage.created_at is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiThreadMessage.id is required');
        }
        return value;
      })(),
      incompleteAt: json['incomplete_at'] is int ? json['incomplete_at'] : null,
      incompleteDetails: json['incomplete_details']?.toString(),
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
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiThreadMessage.object is required');
        }
        return value;
      })(),
      role: (() {
        final value = json['role']?.toString();
        if (value == null) {
          throw FormatException('OpenAiThreadMessage.role is required');
        }
        return value;
      })(),
      runId: json['run_id']?.toString(),
      status: json['status']?.toString(),
      threadId: (() {
        final value = json['thread_id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiThreadMessage.thread_id is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'assistant_id': assistantId,
      'attachments': attachments?.map((item) => item).toList(),
      'completed_at': completedAt,
      'content': content.map((item) => item).toList(),
      'created_at': createdAt,
      'id': id,
      'incomplete_at': incompleteAt,
      'incomplete_details': incompleteDetails,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'object': object,
      'role': role,
      'run_id': runId,
      'status': status,
      'thread_id': threadId,
    };
  }
}

class OpenAiThreadMessageCreateRequest {
  final List<dynamic>? attachments;
  final dynamic content;
  final Map<String, dynamic>? metadata;
  final String role;

  OpenAiThreadMessageCreateRequest({
    this.attachments,
    required this.content,
    this.metadata,
    required this.role
  });

  factory OpenAiThreadMessageCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiThreadMessageCreateRequest(
      attachments: (() {
        final list = _sdkworkAsList(json['attachments']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<dynamic>()
            .toList();
      })(),
      content: (() {
        final value = json['content']?.toString();
        if (value == null) {
          throw FormatException('OpenAiThreadMessageCreateRequest.content is required');
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
      role: (() {
        final value = json['role']?.toString();
        if (value == null) {
          throw FormatException('OpenAiThreadMessageCreateRequest.role is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'attachments': attachments?.map((item) => item).toList(),
      'content': content,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'role': role,
    };
  }
}

class OpenAiThreadMessageList {
  final List<OpenAiThreadMessage> data;
  final String? firstId;
  final bool? hasMore;
  final String? lastId;
  final String object;

  OpenAiThreadMessageList({
    required this.data,
    this.firstId,
    this.hasMore,
    this.lastId,
    required this.object
  });

  factory OpenAiThreadMessageList.fromJson(Map<String, dynamic> json) {
    return OpenAiThreadMessageList(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          throw FormatException('OpenAiThreadMessageList.data is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiThreadMessage.fromJson(map);
      })())
            .whereType<OpenAiThreadMessage>()
            .toList();
      })(),
      firstId: json['first_id']?.toString(),
      hasMore: json['has_more'] is bool ? json['has_more'] : null,
      lastId: json['last_id']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiThreadMessageList.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data.map((item) => item.toJson()).toList(),
      'first_id': firstId,
      'has_more': hasMore,
      'last_id': lastId,
      'object': object,
    };
  }
}

class OpenAiThreadMessageUpdateRequest {
  final Map<String, dynamic>? metadata;

  OpenAiThreadMessageUpdateRequest({
    this.metadata
  });

  factory OpenAiThreadMessageUpdateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiThreadMessageUpdateRequest(
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
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class OpenAiThreadUpdateRequest {
  final Map<String, dynamic>? metadata;
  final dynamic toolResources;

  OpenAiThreadUpdateRequest({
    this.metadata,
    this.toolResources
  });

  factory OpenAiThreadUpdateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiThreadUpdateRequest(
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
      toolResources: json['tool_resources']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'tool_resources': toolResources,
    };
  }
}

class OpenAiTokenLogprob {
  final List<int>? bytes;
  final double logprob;
  final String token;
  final List<OpenAiTopLogprob>? topLogprobs;

  OpenAiTokenLogprob({
    this.bytes,
    required this.logprob,
    required this.token,
    this.topLogprobs
  });

  factory OpenAiTokenLogprob.fromJson(Map<String, dynamic> json) {
    return OpenAiTokenLogprob(
      bytes: (() {
        final list = _sdkworkAsList(json['bytes']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item is int ? item : null)
            .whereType<int>()
            .toList();
      })(),
      logprob: (() {
        final value = json['logprob'];
        if (value is! num) {
          throw FormatException('OpenAiTokenLogprob.logprob is required');
        }
        return value.toDouble();
      })(),
      token: (() {
        final value = json['token']?.toString();
        if (value == null) {
          throw FormatException('OpenAiTokenLogprob.token is required');
        }
        return value;
      })(),
      topLogprobs: (() {
        final list = _sdkworkAsList(json['top_logprobs']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiTopLogprob.fromJson(map);
      })())
            .whereType<OpenAiTopLogprob>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bytes': bytes?.map((item) => item).toList(),
      'logprob': logprob,
      'token': token,
      'top_logprobs': topLogprobs?.map((item) => item.toJson()).toList(),
    };
  }
}

class OpenAiTokenUsage {
  final int completionTokens;
  final OpenAiCompletionTokensDetails? completionTokensDetails;
  final int promptTokens;
  final OpenAiPromptTokensDetails? promptTokensDetails;
  final int totalTokens;

  OpenAiTokenUsage({
    required this.completionTokens,
    this.completionTokensDetails,
    required this.promptTokens,
    this.promptTokensDetails,
    required this.totalTokens
  });

  factory OpenAiTokenUsage.fromJson(Map<String, dynamic> json) {
    return OpenAiTokenUsage(
      completionTokens: (() {
        final value = json['completion_tokens'];
        if (value is! int) {
          throw FormatException('OpenAiTokenUsage.completion_tokens is required');
        }
        return value;
      })(),
      completionTokensDetails: (() {
        final map = _sdkworkAsMap(json['completion_tokens_details']);
        return map == null ? null : OpenAiCompletionTokensDetails.fromJson(map);
      })(),
      promptTokens: (() {
        final value = json['prompt_tokens'];
        if (value is! int) {
          throw FormatException('OpenAiTokenUsage.prompt_tokens is required');
        }
        return value;
      })(),
      promptTokensDetails: (() {
        final map = _sdkworkAsMap(json['prompt_tokens_details']);
        return map == null ? null : OpenAiPromptTokensDetails.fromJson(map);
      })(),
      totalTokens: (() {
        final value = json['total_tokens'];
        if (value is! int) {
          throw FormatException('OpenAiTokenUsage.total_tokens is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'completion_tokens': completionTokens,
      'completion_tokens_details': completionTokensDetails?.toJson(),
      'prompt_tokens': promptTokens,
      'prompt_tokens_details': promptTokensDetails?.toJson(),
      'total_tokens': totalTokens,
    };
  }
}

class OpenAiTool {
  final OpenAiFunctionDefinition? function_;
  final String type;

  OpenAiTool({
    this.function_,
    required this.type
  });

  factory OpenAiTool.fromJson(Map<String, dynamic> json) {
    return OpenAiTool(
      function_: (() {
        final map = _sdkworkAsMap(json['function']);
        return map == null ? null : OpenAiFunctionDefinition.fromJson(map);
      })(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('OpenAiTool.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'function': function_?.toJson(),
      'type': type,
    };
  }
}

class OpenAiToolCall {
  final OpenAiFunctionCall? function_;
  final String id;
  final String type;

  OpenAiToolCall({
    this.function_,
    required this.id,
    required this.type
  });

  factory OpenAiToolCall.fromJson(Map<String, dynamic> json) {
    return OpenAiToolCall(
      function_: (() {
        final map = _sdkworkAsMap(json['function']);
        return map == null ? null : OpenAiFunctionCall.fromJson(map);
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiToolCall.id is required');
        }
        return value;
      })(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('OpenAiToolCall.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'function': function_?.toJson(),
      'id': id,
      'type': type,
    };
  }
}

class OpenAiToolChoice {


  OpenAiToolChoice();

  factory OpenAiToolChoice.fromJson(Map<String, dynamic> json) {
    return OpenAiToolChoice();
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{};
  }
}

class OpenAiTopLogprob {
  final List<int>? bytes;
  final double logprob;
  final String token;

  OpenAiTopLogprob({
    this.bytes,
    required this.logprob,
    required this.token
  });

  factory OpenAiTopLogprob.fromJson(Map<String, dynamic> json) {
    return OpenAiTopLogprob(
      bytes: (() {
        final list = _sdkworkAsList(json['bytes']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item is int ? item : null)
            .whereType<int>()
            .toList();
      })(),
      logprob: (() {
        final value = json['logprob'];
        if (value is! num) {
          throw FormatException('OpenAiTopLogprob.logprob is required');
        }
        return value.toDouble();
      })(),
      token: (() {
        final value = json['token']?.toString();
        if (value == null) {
          throw FormatException('OpenAiTopLogprob.token is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bytes': bytes?.map((item) => item).toList(),
      'logprob': logprob,
      'token': token,
    };
  }
}

class OpenAiUpload {
  final int bytes;
  final int createdAt;
  final int? expiresAt;
  final OpenAiFile? file;
  final String filename;
  final String id;
  final String object;
  final String purpose;
  final String status;

  OpenAiUpload({
    required this.bytes,
    required this.createdAt,
    this.expiresAt,
    this.file,
    required this.filename,
    required this.id,
    required this.object,
    required this.purpose,
    required this.status
  });

  factory OpenAiUpload.fromJson(Map<String, dynamic> json) {
    return OpenAiUpload(
      bytes: (() {
        final value = json['bytes'];
        if (value is! int) {
          throw FormatException('OpenAiUpload.bytes is required');
        }
        return value;
      })(),
      createdAt: (() {
        final value = json['created_at'];
        if (value is! int) {
          throw FormatException('OpenAiUpload.created_at is required');
        }
        return value;
      })(),
      expiresAt: json['expires_at'] is int ? json['expires_at'] : null,
      file: (() {
        final map = _sdkworkAsMap(json['file']);
        return map == null ? null : OpenAiFile.fromJson(map);
      })(),
      filename: (() {
        final value = json['filename']?.toString();
        if (value == null) {
          throw FormatException('OpenAiUpload.filename is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiUpload.id is required');
        }
        return value;
      })(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiUpload.object is required');
        }
        return value;
      })(),
      purpose: (() {
        final value = json['purpose']?.toString();
        if (value == null) {
          throw FormatException('OpenAiUpload.purpose is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('OpenAiUpload.status is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bytes': bytes,
      'created_at': createdAt,
      'expires_at': expiresAt,
      'file': file?.toJson(),
      'filename': filename,
      'id': id,
      'object': object,
      'purpose': purpose,
      'status': status,
    };
  }
}

class OpenAiUploadCompleteRequest {
  final String? md5;
  final List<String> partIds;

  OpenAiUploadCompleteRequest({
    this.md5,
    required this.partIds
  });

  factory OpenAiUploadCompleteRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiUploadCompleteRequest(
      md5: json['md5']?.toString(),
      partIds: (() {
        final list = _sdkworkAsList(json['part_ids']);
        if (list == null) {
          throw FormatException('OpenAiUploadCompleteRequest.part_ids is required');
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
      'md5': md5,
      'part_ids': partIds.map((item) => item).toList(),
    };
  }
}

class OpenAiUploadCreateRequest {
  final int bytes;
  final String filename;
  final String mimeType;
  final String purpose;

  OpenAiUploadCreateRequest({
    required this.bytes,
    required this.filename,
    required this.mimeType,
    required this.purpose
  });

  factory OpenAiUploadCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiUploadCreateRequest(
      bytes: (() {
        final value = json['bytes'];
        if (value is! int) {
          throw FormatException('OpenAiUploadCreateRequest.bytes is required');
        }
        return value;
      })(),
      filename: (() {
        final value = json['filename']?.toString();
        if (value == null) {
          throw FormatException('OpenAiUploadCreateRequest.filename is required');
        }
        return value;
      })(),
      mimeType: (() {
        final value = json['mime_type']?.toString();
        if (value == null) {
          throw FormatException('OpenAiUploadCreateRequest.mime_type is required');
        }
        return value;
      })(),
      purpose: (() {
        final value = json['purpose']?.toString();
        if (value == null) {
          throw FormatException('OpenAiUploadCreateRequest.purpose is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bytes': bytes,
      'filename': filename,
      'mime_type': mimeType,
      'purpose': purpose,
    };
  }
}

class OpenAiUploadPart {
  final int createdAt;
  final String id;
  final String object;
  final String uploadId;

  OpenAiUploadPart({
    required this.createdAt,
    required this.id,
    required this.object,
    required this.uploadId
  });

  factory OpenAiUploadPart.fromJson(Map<String, dynamic> json) {
    return OpenAiUploadPart(
      createdAt: (() {
        final value = json['created_at'];
        if (value is! int) {
          throw FormatException('OpenAiUploadPart.created_at is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiUploadPart.id is required');
        }
        return value;
      })(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiUploadPart.object is required');
        }
        return value;
      })(),
      uploadId: (() {
        final value = json['upload_id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiUploadPart.upload_id is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created_at': createdAt,
      'id': id,
      'object': object,
      'upload_id': uploadId,
    };
  }
}

class OpenAiUploadPartMultipartRequest {
  final String data;

  OpenAiUploadPartMultipartRequest({
    required this.data
  });

  factory OpenAiUploadPartMultipartRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiUploadPartMultipartRequest(
      data: (() {
        final value = json['data']?.toString();
        if (value == null) {
          throw FormatException('OpenAiUploadPartMultipartRequest.data is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data,
    };
  }
}

class OpenAiVectorStore {
  final int? bytes;
  final int createdAt;
  final dynamic expiresAfter;
  final int? expiresAt;
  final OpenAiVectorStoreFileCounts? fileCounts;
  final String id;
  final int? lastActiveAt;
  final Map<String, dynamic>? metadata;
  final String? name;
  final String object;
  final String status;
  final int? usageBytes;

  OpenAiVectorStore({
    this.bytes,
    required this.createdAt,
    this.expiresAfter,
    this.expiresAt,
    this.fileCounts,
    required this.id,
    this.lastActiveAt,
    this.metadata,
    this.name,
    required this.object,
    required this.status,
    this.usageBytes
  });

  factory OpenAiVectorStore.fromJson(Map<String, dynamic> json) {
    return OpenAiVectorStore(
      bytes: json['bytes'] is int ? json['bytes'] : null,
      createdAt: (() {
        final value = json['created_at'];
        if (value is! int) {
          throw FormatException('OpenAiVectorStore.created_at is required');
        }
        return value;
      })(),
      expiresAfter: json['expires_after']?.toString(),
      expiresAt: json['expires_at'] is int ? json['expires_at'] : null,
      fileCounts: (() {
        final map = _sdkworkAsMap(json['file_counts']);
        return map == null ? null : OpenAiVectorStoreFileCounts.fromJson(map);
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVectorStore.id is required');
        }
        return value;
      })(),
      lastActiveAt: json['last_active_at'] is int ? json['last_active_at'] : null,
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
      name: json['name']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVectorStore.object is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVectorStore.status is required');
        }
        return value;
      })(),
      usageBytes: json['usage_bytes'] is int ? json['usage_bytes'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bytes': bytes,
      'created_at': createdAt,
      'expires_after': expiresAfter,
      'expires_at': expiresAt,
      'file_counts': fileCounts?.toJson(),
      'id': id,
      'last_active_at': lastActiveAt,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'name': name,
      'object': object,
      'status': status,
      'usage_bytes': usageBytes,
    };
  }
}

class OpenAiVectorStoreCreateRequest {
  final dynamic chunkingStrategy;
  final dynamic expiresAfter;
  final List<String>? fileIds;
  final Map<String, dynamic>? metadata;
  final String? name;

  OpenAiVectorStoreCreateRequest({
    this.chunkingStrategy,
    this.expiresAfter,
    this.fileIds,
    this.metadata,
    this.name
  });

  factory OpenAiVectorStoreCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVectorStoreCreateRequest(
      chunkingStrategy: json['chunking_strategy']?.toString(),
      expiresAfter: json['expires_after']?.toString(),
      fileIds: (() {
        final list = _sdkworkAsList(json['file_ids']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
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
      name: json['name']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'chunking_strategy': chunkingStrategy,
      'expires_after': expiresAfter,
      'file_ids': fileIds?.map((item) => item).toList(),
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'name': name,
    };
  }
}

class OpenAiVectorStoreFile {
  final Map<String, dynamic>? attributes;
  final dynamic chunkingStrategy;
  final int createdAt;
  final String id;
  final dynamic lastError;
  final String object;
  final String status;
  final int? usageBytes;
  final String vectorStoreId;

  OpenAiVectorStoreFile({
    this.attributes,
    this.chunkingStrategy,
    required this.createdAt,
    required this.id,
    this.lastError,
    required this.object,
    required this.status,
    this.usageBytes,
    required this.vectorStoreId
  });

  factory OpenAiVectorStoreFile.fromJson(Map<String, dynamic> json) {
    return OpenAiVectorStoreFile(
      attributes: (() {
        final map = _sdkworkAsMap(json['attributes']);
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
      chunkingStrategy: json['chunking_strategy']?.toString(),
      createdAt: (() {
        final value = json['created_at'];
        if (value is! int) {
          throw FormatException('OpenAiVectorStoreFile.created_at is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVectorStoreFile.id is required');
        }
        return value;
      })(),
      lastError: json['last_error']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVectorStoreFile.object is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVectorStoreFile.status is required');
        }
        return value;
      })(),
      usageBytes: json['usage_bytes'] is int ? json['usage_bytes'] : null,
      vectorStoreId: (() {
        final value = json['vector_store_id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVectorStoreFile.vector_store_id is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'attributes': attributes?.map((key, item) => MapEntry(key, item)),
      'chunking_strategy': chunkingStrategy,
      'created_at': createdAt,
      'id': id,
      'last_error': lastError,
      'object': object,
      'status': status,
      'usage_bytes': usageBytes,
      'vector_store_id': vectorStoreId,
    };
  }
}

class OpenAiVectorStoreFileBatch {
  final int createdAt;
  final OpenAiVectorStoreFileCounts? fileCounts;
  final String id;
  final String object;
  final String status;
  final String vectorStoreId;

  OpenAiVectorStoreFileBatch({
    required this.createdAt,
    this.fileCounts,
    required this.id,
    required this.object,
    required this.status,
    required this.vectorStoreId
  });

  factory OpenAiVectorStoreFileBatch.fromJson(Map<String, dynamic> json) {
    return OpenAiVectorStoreFileBatch(
      createdAt: (() {
        final value = json['created_at'];
        if (value is! int) {
          throw FormatException('OpenAiVectorStoreFileBatch.created_at is required');
        }
        return value;
      })(),
      fileCounts: (() {
        final map = _sdkworkAsMap(json['file_counts']);
        return map == null ? null : OpenAiVectorStoreFileCounts.fromJson(map);
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVectorStoreFileBatch.id is required');
        }
        return value;
      })(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVectorStoreFileBatch.object is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVectorStoreFileBatch.status is required');
        }
        return value;
      })(),
      vectorStoreId: (() {
        final value = json['vector_store_id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVectorStoreFileBatch.vector_store_id is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created_at': createdAt,
      'file_counts': fileCounts?.toJson(),
      'id': id,
      'object': object,
      'status': status,
      'vector_store_id': vectorStoreId,
    };
  }
}

class OpenAiVectorStoreFileBatchCreateRequest {
  final Map<String, dynamic>? attributes;
  final dynamic chunkingStrategy;
  final List<String> fileIds;

  OpenAiVectorStoreFileBatchCreateRequest({
    this.attributes,
    this.chunkingStrategy,
    required this.fileIds
  });

  factory OpenAiVectorStoreFileBatchCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVectorStoreFileBatchCreateRequest(
      attributes: (() {
        final map = _sdkworkAsMap(json['attributes']);
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
      chunkingStrategy: json['chunking_strategy']?.toString(),
      fileIds: (() {
        final list = _sdkworkAsList(json['file_ids']);
        if (list == null) {
          throw FormatException('OpenAiVectorStoreFileBatchCreateRequest.file_ids is required');
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
      'attributes': attributes?.map((key, item) => MapEntry(key, item)),
      'chunking_strategy': chunkingStrategy,
      'file_ids': fileIds.map((item) => item).toList(),
    };
  }
}

class OpenAiVectorStoreFileCounts {
  final int? cancelled;
  final int? completed;
  final int? failed;
  final int? inProgress;
  final int? total;

  OpenAiVectorStoreFileCounts({
    this.cancelled,
    this.completed,
    this.failed,
    this.inProgress,
    this.total
  });

  factory OpenAiVectorStoreFileCounts.fromJson(Map<String, dynamic> json) {
    return OpenAiVectorStoreFileCounts(
      cancelled: json['cancelled'] is int ? json['cancelled'] : null,
      completed: json['completed'] is int ? json['completed'] : null,
      failed: json['failed'] is int ? json['failed'] : null,
      inProgress: json['in_progress'] is int ? json['in_progress'] : null,
      total: json['total'] is int ? json['total'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cancelled': cancelled,
      'completed': completed,
      'failed': failed,
      'in_progress': inProgress,
      'total': total,
    };
  }
}

class OpenAiVectorStoreFileCreateRequest {
  final Map<String, dynamic>? attributes;
  final dynamic chunkingStrategy;
  final String fileId;

  OpenAiVectorStoreFileCreateRequest({
    this.attributes,
    this.chunkingStrategy,
    required this.fileId
  });

  factory OpenAiVectorStoreFileCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVectorStoreFileCreateRequest(
      attributes: (() {
        final map = _sdkworkAsMap(json['attributes']);
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
      chunkingStrategy: json['chunking_strategy']?.toString(),
      fileId: (() {
        final value = json['file_id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVectorStoreFileCreateRequest.file_id is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'attributes': attributes?.map((key, item) => MapEntry(key, item)),
      'chunking_strategy': chunkingStrategy,
      'file_id': fileId,
    };
  }
}

class OpenAiVectorStoreFileList {
  final List<OpenAiVectorStoreFile> data;
  final String? firstId;
  final bool? hasMore;
  final String? lastId;
  final String object;

  OpenAiVectorStoreFileList({
    required this.data,
    this.firstId,
    this.hasMore,
    this.lastId,
    required this.object
  });

  factory OpenAiVectorStoreFileList.fromJson(Map<String, dynamic> json) {
    return OpenAiVectorStoreFileList(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          throw FormatException('OpenAiVectorStoreFileList.data is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiVectorStoreFile.fromJson(map);
      })())
            .whereType<OpenAiVectorStoreFile>()
            .toList();
      })(),
      firstId: json['first_id']?.toString(),
      hasMore: json['has_more'] is bool ? json['has_more'] : null,
      lastId: json['last_id']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVectorStoreFileList.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data.map((item) => item.toJson()).toList(),
      'first_id': firstId,
      'has_more': hasMore,
      'last_id': lastId,
      'object': object,
    };
  }
}

class OpenAiVectorStoreFileUpdateRequest {
  final Map<String, dynamic>? attributes;

  OpenAiVectorStoreFileUpdateRequest({
    this.attributes
  });

  factory OpenAiVectorStoreFileUpdateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVectorStoreFileUpdateRequest(
      attributes: (() {
        final map = _sdkworkAsMap(json['attributes']);
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
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'attributes': attributes?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class OpenAiVectorStoreList {
  final List<OpenAiVectorStore> data;
  final String? firstId;
  final bool? hasMore;
  final String? lastId;
  final String object;

  OpenAiVectorStoreList({
    required this.data,
    this.firstId,
    this.hasMore,
    this.lastId,
    required this.object
  });

  factory OpenAiVectorStoreList.fromJson(Map<String, dynamic> json) {
    return OpenAiVectorStoreList(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          throw FormatException('OpenAiVectorStoreList.data is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiVectorStore.fromJson(map);
      })())
            .whereType<OpenAiVectorStore>()
            .toList();
      })(),
      firstId: json['first_id']?.toString(),
      hasMore: json['has_more'] is bool ? json['has_more'] : null,
      lastId: json['last_id']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVectorStoreList.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data.map((item) => item.toJson()).toList(),
      'first_id': firstId,
      'has_more': hasMore,
      'last_id': lastId,
      'object': object,
    };
  }
}

class OpenAiVectorStoreSearchRequest {
  final dynamic filters;
  final int? maxNumResults;
  final dynamic query;
  final dynamic rankingOptions;
  final bool? rewriteQuery;

  OpenAiVectorStoreSearchRequest({
    this.filters,
    this.maxNumResults,
    required this.query,
    this.rankingOptions,
    this.rewriteQuery
  });

  factory OpenAiVectorStoreSearchRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVectorStoreSearchRequest(
      filters: json['filters']?.toString(),
      maxNumResults: json['max_num_results'] is int ? json['max_num_results'] : null,
      query: (() {
        final value = json['query']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVectorStoreSearchRequest.query is required');
        }
        return value;
      })(),
      rankingOptions: json['ranking_options']?.toString(),
      rewriteQuery: json['rewrite_query'] is bool ? json['rewrite_query'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'filters': filters,
      'max_num_results': maxNumResults,
      'query': query,
      'ranking_options': rankingOptions,
      'rewrite_query': rewriteQuery,
    };
  }
}

class OpenAiVectorStoreSearchResponse {
  final List<OpenAiVectorStoreSearchResult>? data;
  final String? object;
  final List<String>? searchQuery;

  OpenAiVectorStoreSearchResponse({
    this.data,
    this.object,
    this.searchQuery
  });

  factory OpenAiVectorStoreSearchResponse.fromJson(Map<String, dynamic> json) {
    return OpenAiVectorStoreSearchResponse(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiVectorStoreSearchResult.fromJson(map);
      })())
            .whereType<OpenAiVectorStoreSearchResult>()
            .toList();
      })(),
      object: json['object']?.toString(),
      searchQuery: (() {
        final list = _sdkworkAsList(json['search_query']);
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
      'data': data?.map((item) => item.toJson()).toList(),
      'object': object,
      'search_query': searchQuery?.map((item) => item).toList(),
    };
  }
}

class OpenAiVectorStoreSearchResult {
  final Map<String, dynamic>? attributes;
  final List<dynamic>? content;
  final String? fileId;
  final String? filename;
  final double? score;

  OpenAiVectorStoreSearchResult({
    this.attributes,
    this.content,
    this.fileId,
    this.filename,
    this.score
  });

  factory OpenAiVectorStoreSearchResult.fromJson(Map<String, dynamic> json) {
    return OpenAiVectorStoreSearchResult(
      attributes: (() {
        final map = _sdkworkAsMap(json['attributes']);
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
      content: (() {
        final list = _sdkworkAsList(json['content']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<dynamic>()
            .toList();
      })(),
      fileId: json['file_id']?.toString(),
      filename: json['filename']?.toString(),
      score: json['score'] is num ? json['score'].toDouble() : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'attributes': attributes?.map((key, item) => MapEntry(key, item)),
      'content': content?.map((item) => item).toList(),
      'file_id': fileId,
      'filename': filename,
      'score': score,
    };
  }
}

class OpenAiVectorStoreUpdateRequest {
  final dynamic expiresAfter;
  final Map<String, dynamic>? metadata;
  final String? name;

  OpenAiVectorStoreUpdateRequest({
    this.expiresAfter,
    this.metadata,
    this.name
  });

  factory OpenAiVectorStoreUpdateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVectorStoreUpdateRequest(
      expiresAfter: json['expires_after']?.toString(),
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
      name: json['name']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'expires_after': expiresAfter,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'name': name,
    };
  }
}

class OpenAiVideo {
  final int? completedAt;
  final String? contentUrl;
  final int? createdAt;
  final String id;
  final Map<String, dynamic>? metadata;
  final String? model;
  final String object;
  final String? prompt;
  final int? seconds;
  final String? size;
  final String status;
  final String? url;

  OpenAiVideo({
    this.completedAt,
    this.contentUrl,
    this.createdAt,
    required this.id,
    this.metadata,
    this.model,
    required this.object,
    this.prompt,
    this.seconds,
    this.size,
    required this.status,
    this.url
  });

  factory OpenAiVideo.fromJson(Map<String, dynamic> json) {
    return OpenAiVideo(
      completedAt: json['completed_at'] is int ? json['completed_at'] : null,
      contentUrl: json['content_url']?.toString(),
      createdAt: json['created_at'] is int ? json['created_at'] : null,
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVideo.id is required');
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
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVideo.object is required');
        }
        return value;
      })(),
      prompt: json['prompt']?.toString(),
      seconds: json['seconds'] is int ? json['seconds'] : null,
      size: json['size']?.toString(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVideo.status is required');
        }
        return value;
      })(),
      url: json['url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'completed_at': completedAt,
      'content_url': contentUrl,
      'created_at': createdAt,
      'id': id,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'object': object,
      'prompt': prompt,
      'seconds': seconds,
      'size': size,
      'status': status,
      'url': url,
    };
  }
}

class OpenAiVideoCharacter {
  final int? createdAt;
  final String? description;
  final String id;
  final String? imageUrl;
  final Map<String, dynamic>? metadata;
  final String? name;
  final String object;

  OpenAiVideoCharacter({
    this.createdAt,
    this.description,
    required this.id,
    this.imageUrl,
    this.metadata,
    this.name,
    required this.object
  });

  factory OpenAiVideoCharacter.fromJson(Map<String, dynamic> json) {
    return OpenAiVideoCharacter(
      createdAt: json['created_at'] is int ? json['created_at'] : null,
      description: json['description']?.toString(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVideoCharacter.id is required');
        }
        return value;
      })(),
      imageUrl: json['image_url']?.toString(),
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
      name: json['name']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVideoCharacter.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created_at': createdAt,
      'description': description,
      'id': id,
      'image_url': imageUrl,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'name': name,
      'object': object,
    };
  }
}

class OpenAiVideoCharacterCreateRequest {
  final String? description;
  final dynamic image;
  final Map<String, dynamic>? metadata;
  final String? name;

  OpenAiVideoCharacterCreateRequest({
    this.description,
    this.image,
    this.metadata,
    this.name
  });

  factory OpenAiVideoCharacterCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVideoCharacterCreateRequest(
      description: json['description']?.toString(),
      image: json['image']?.toString(),
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
      name: json['name']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'description': description,
      'image': image,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'name': name,
    };
  }
}

class OpenAiVideoCharacterMultipartRequest {
  final String? description;
  final String? file;
  final String? image;
  final String? metadata;
  final String? name;

  OpenAiVideoCharacterMultipartRequest({
    this.description,
    this.file,
    this.image,
    this.metadata,
    this.name
  });

  factory OpenAiVideoCharacterMultipartRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVideoCharacterMultipartRequest(
      description: json['description']?.toString(),
      file: json['file']?.toString(),
      image: json['image']?.toString(),
      metadata: json['metadata']?.toString(),
      name: json['name']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'description': description,
      'file': file,
      'image': image,
      'metadata': metadata,
      'name': name,
    };
  }
}

class OpenAiVideoCreateRequest {
  final dynamic image;
  final Map<String, dynamic>? metadata;
  final String model;
  final String prompt;
  final int? seconds;
  final String? size;
  final dynamic video;

  OpenAiVideoCreateRequest({
    this.image,
    this.metadata,
    required this.model,
    required this.prompt,
    this.seconds,
    this.size,
    this.video
  });

  factory OpenAiVideoCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVideoCreateRequest(
      image: json['image']?.toString(),
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
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVideoCreateRequest.model is required');
        }
        return value;
      })(),
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVideoCreateRequest.prompt is required');
        }
        return value;
      })(),
      seconds: json['seconds'] is int ? json['seconds'] : null,
      size: json['size']?.toString(),
      video: json['video']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'image': image,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'prompt': prompt,
      'seconds': seconds,
      'size': size,
      'video': video,
    };
  }
}

class OpenAiVideoEditRequest {
  final dynamic image;
  final Map<String, dynamic>? metadata;
  final String? model;
  final String? prompt;
  final int? seconds;
  final String? size;
  final dynamic video;

  OpenAiVideoEditRequest({
    this.image,
    this.metadata,
    this.model,
    this.prompt,
    this.seconds,
    this.size,
    this.video
  });

  factory OpenAiVideoEditRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVideoEditRequest(
      image: json['image']?.toString(),
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
      prompt: json['prompt']?.toString(),
      seconds: json['seconds'] is int ? json['seconds'] : null,
      size: json['size']?.toString(),
      video: json['video']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'image': image,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'prompt': prompt,
      'seconds': seconds,
      'size': size,
      'video': video,
    };
  }
}

class OpenAiVideoExtendRequest {
  final dynamic image;
  final Map<String, dynamic>? metadata;
  final String? model;
  final String? prompt;
  final int? seconds;
  final String? size;
  final dynamic video;

  OpenAiVideoExtendRequest({
    this.image,
    this.metadata,
    this.model,
    this.prompt,
    this.seconds,
    this.size,
    this.video
  });

  factory OpenAiVideoExtendRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVideoExtendRequest(
      image: json['image']?.toString(),
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
      prompt: json['prompt']?.toString(),
      seconds: json['seconds'] is int ? json['seconds'] : null,
      size: json['size']?.toString(),
      video: json['video']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'image': image,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'prompt': prompt,
      'seconds': seconds,
      'size': size,
      'video': video,
    };
  }
}

class OpenAiVideoList {
  final List<OpenAiVideo> data;
  final String? firstId;
  final bool? hasMore;
  final String? lastId;
  final String object;

  OpenAiVideoList({
    required this.data,
    this.firstId,
    this.hasMore,
    this.lastId,
    required this.object
  });

  factory OpenAiVideoList.fromJson(Map<String, dynamic> json) {
    return OpenAiVideoList(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          throw FormatException('OpenAiVideoList.data is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiVideo.fromJson(map);
      })())
            .whereType<OpenAiVideo>()
            .toList();
      })(),
      firstId: json['first_id']?.toString(),
      hasMore: json['has_more'] is bool ? json['has_more'] : null,
      lastId: json['last_id']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVideoList.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data.map((item) => item.toJson()).toList(),
      'first_id': firstId,
      'has_more': hasMore,
      'last_id': lastId,
      'object': object,
    };
  }
}

class OpenAiVideoRemixRequest {
  final dynamic image;
  final Map<String, dynamic>? metadata;
  final String? model;
  final String? prompt;
  final int? seconds;
  final String? size;
  final dynamic video;

  OpenAiVideoRemixRequest({
    this.image,
    this.metadata,
    this.model,
    this.prompt,
    this.seconds,
    this.size,
    this.video
  });

  factory OpenAiVideoRemixRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVideoRemixRequest(
      image: json['image']?.toString(),
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
      prompt: json['prompt']?.toString(),
      seconds: json['seconds'] is int ? json['seconds'] : null,
      size: json['size']?.toString(),
      video: json['video']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'image': image,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'prompt': prompt,
      'seconds': seconds,
      'size': size,
      'video': video,
    };
  }
}

class OpenAiVoice {
  final int? createdAt;
  final String? description;
  final String id;
  final Map<String, dynamic>? metadata;
  final String? name;
  final String object;
  final String? status;

  OpenAiVoice({
    this.createdAt,
    this.description,
    required this.id,
    this.metadata,
    this.name,
    required this.object,
    this.status
  });

  factory OpenAiVoice.fromJson(Map<String, dynamic> json) {
    return OpenAiVoice(
      createdAt: json['created_at'] is int ? json['created_at'] : null,
      description: json['description']?.toString(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVoice.id is required');
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
      name: json['name']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVoice.object is required');
        }
        return value;
      })(),
      status: json['status']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created_at': createdAt,
      'description': description,
      'id': id,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'name': name,
      'object': object,
      'status': status,
    };
  }
}

class OpenAiVoiceConsent {
  final dynamic consentDocument;
  final int? createdAt;
  final String id;
  final Map<String, dynamic>? metadata;
  final String? name;
  final String object;
  final String? status;

  OpenAiVoiceConsent({
    this.consentDocument,
    this.createdAt,
    required this.id,
    this.metadata,
    this.name,
    required this.object,
    this.status
  });

  factory OpenAiVoiceConsent.fromJson(Map<String, dynamic> json) {
    return OpenAiVoiceConsent(
      consentDocument: json['consent_document']?.toString(),
      createdAt: json['created_at'] is int ? json['created_at'] : null,
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVoiceConsent.id is required');
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
      name: json['name']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVoiceConsent.object is required');
        }
        return value;
      })(),
      status: json['status']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'consent_document': consentDocument,
      'created_at': createdAt,
      'id': id,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'name': name,
      'object': object,
      'status': status,
    };
  }
}

class OpenAiVoiceConsentCreateRequest {
  final dynamic consentDocument;
  final Map<String, dynamic>? metadata;
  final String? name;

  OpenAiVoiceConsentCreateRequest({
    this.consentDocument,
    this.metadata,
    this.name
  });

  factory OpenAiVoiceConsentCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVoiceConsentCreateRequest(
      consentDocument: json['consent_document']?.toString(),
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
      name: json['name']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'consent_document': consentDocument,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'name': name,
    };
  }
}

class OpenAiVoiceConsentList {
  final List<OpenAiVoiceConsent> data;
  final String? firstId;
  final bool? hasMore;
  final String? lastId;
  final String object;

  OpenAiVoiceConsentList({
    required this.data,
    this.firstId,
    this.hasMore,
    this.lastId,
    required this.object
  });

  factory OpenAiVoiceConsentList.fromJson(Map<String, dynamic> json) {
    return OpenAiVoiceConsentList(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          throw FormatException('OpenAiVoiceConsentList.data is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiVoiceConsent.fromJson(map);
      })())
            .whereType<OpenAiVoiceConsent>()
            .toList();
      })(),
      firstId: json['first_id']?.toString(),
      hasMore: json['has_more'] is bool ? json['has_more'] : null,
      lastId: json['last_id']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVoiceConsentList.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data.map((item) => item.toJson()).toList(),
      'first_id': firstId,
      'has_more': hasMore,
      'last_id': lastId,
      'object': object,
    };
  }
}

class OpenAiVoiceConsentMultipartRequest {
  final String file;
  final Map<String, dynamic>? metadata;
  final String? name;

  OpenAiVoiceConsentMultipartRequest({
    required this.file,
    this.metadata,
    this.name
  });

  factory OpenAiVoiceConsentMultipartRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVoiceConsentMultipartRequest(
      file: (() {
        final value = json['file']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVoiceConsentMultipartRequest.file is required');
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
      name: json['name']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'file': file,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'name': name,
    };
  }
}

class OpenAiVoiceConsentUpdateRequest {
  final Map<String, dynamic>? metadata;
  final String? name;

  OpenAiVoiceConsentUpdateRequest({
    this.metadata,
    this.name
  });

  factory OpenAiVoiceConsentUpdateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVoiceConsentUpdateRequest(
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
      name: json['name']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'name': name,
    };
  }
}

class OpenAiVoiceCreateMultipartRequest {
  final String? description;
  final String? file;
  final String? metadata;
  final String? name;

  OpenAiVoiceCreateMultipartRequest({
    this.description,
    this.file,
    this.metadata,
    this.name
  });

  factory OpenAiVoiceCreateMultipartRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVoiceCreateMultipartRequest(
      description: json['description']?.toString(),
      file: json['file']?.toString(),
      metadata: json['metadata']?.toString(),
      name: json['name']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'description': description,
      'file': file,
      'metadata': metadata,
      'name': name,
    };
  }
}

class OpenAiVoiceCreateRequest {
  final String? description;
  final Map<String, dynamic>? metadata;
  final String? name;

  OpenAiVoiceCreateRequest({
    this.description,
    this.metadata,
    this.name
  });

  factory OpenAiVoiceCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVoiceCreateRequest(
      description: json['description']?.toString(),
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
      name: json['name']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'description': description,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'name': name,
    };
  }
}

class OpenAiVoiceList {
  final List<OpenAiVoice> data;
  final String? firstId;
  final bool? hasMore;
  final String? lastId;
  final String object;

  OpenAiVoiceList({
    required this.data,
    this.firstId,
    this.hasMore,
    this.lastId,
    required this.object
  });

  factory OpenAiVoiceList.fromJson(Map<String, dynamic> json) {
    return OpenAiVoiceList(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          throw FormatException('OpenAiVoiceList.data is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiVoice.fromJson(map);
      })())
            .whereType<OpenAiVoice>()
            .toList();
      })(),
      firstId: json['first_id']?.toString(),
      hasMore: json['has_more'] is bool ? json['has_more'] : null,
      lastId: json['last_id']?.toString(),
      object: (() {
        final value = json['object']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVoiceList.object is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data.map((item) => item.toJson()).toList(),
      'first_id': firstId,
      'has_more': hasMore,
      'last_id': lastId,
      'object': object,
    };
  }
}

class ProviderGeneratedMedia {
  final double? duration;
  final int? height;
  final String? id;
  final Map<String, dynamic>? metadata;
  final String? mimeType;
  final String? uri;
  final String? url;
  final int? width;

  ProviderGeneratedMedia({
    this.duration,
    this.height,
    this.id,
    this.metadata,
    this.mimeType,
    this.uri,
    this.url,
    this.width
  });

  factory ProviderGeneratedMedia.fromJson(Map<String, dynamic> json) {
    return ProviderGeneratedMedia(
      duration: json['duration'] is num ? json['duration'].toDouble() : null,
      height: json['height'] is int ? json['height'] : null,
      id: json['id']?.toString(),
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
      mimeType: json['mime_type']?.toString(),
      uri: json['uri']?.toString(),
      url: json['url']?.toString(),
      width: json['width'] is int ? json['width'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'duration': duration,
      'height': height,
      'id': id,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'mime_type': mimeType,
      'uri': uri,
      'url': url,
      'width': width,
    };
  }
}

class ProviderJsonSchema {
  final bool? additionalProperties;
  final String? description;
  final List<dynamic>? enum_;
  final dynamic items;
  final Map<String, dynamic>? properties;
  final List<String>? required_;
  final String? type;

  ProviderJsonSchema({
    this.additionalProperties,
    this.description,
    this.enum_,
    this.items,
    this.properties,
    this.required_,
    this.type
  });

  factory ProviderJsonSchema.fromJson(Map<String, dynamic> json) {
    return ProviderJsonSchema(
      additionalProperties: json['additionalProperties'] is bool ? json['additionalProperties'] : null,
      description: json['description']?.toString(),
      enum_: (() {
        final list = _sdkworkAsList(json['enum']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<dynamic>()
            .toList();
      })(),
      items: json['items'],
      properties: (() {
        final map = _sdkworkAsMap(json['properties']);
        if (map == null) {
          return null;
        }
        final result = <String, dynamic>{};
        map.forEach((key, item) {
          final deserialized = item;
          result[key] = deserialized;
        });
        return result;
      })(),
      required_: (() {
        final list = _sdkworkAsList(json['required']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      type: json['type']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'additionalProperties': additionalProperties,
      'description': description,
      'enum': enum_?.map((item) => item).toList(),
      'items': items,
      'properties': properties?.map((key, item) => MapEntry(key, item)),
      'required': required_?.map((item) => item).toList(),
      'type': type,
    };
  }
}

class ProviderTaskError {
  final String? code;
  final String? message;
  final String? type;

  ProviderTaskError({
    this.code,
    this.message,
    this.type
  });

  factory ProviderTaskError.fromJson(Map<String, dynamic> json) {
    return ProviderTaskError(
      code: json['code']?.toString(),
      message: json['message']?.toString(),
      type: json['type']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'message': message,
      'type': type,
    };
  }
}

class ProviderTaskResult {
  final List<ProviderGeneratedMedia>? audios;
  final List<VolcengineContentPart>? content;
  final String? id;
  final List<ProviderGeneratedMedia>? images;
  final Map<String, dynamic>? metadata;
  final String? status;
  final String? text;
  final List<ProviderGeneratedMedia>? videos;

  ProviderTaskResult({
    this.audios,
    this.content,
    this.id,
    this.images,
    this.metadata,
    this.status,
    this.text,
    this.videos
  });

  factory ProviderTaskResult.fromJson(Map<String, dynamic> json) {
    return ProviderTaskResult(
      audios: (() {
        final list = _sdkworkAsList(json['audios']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ProviderGeneratedMedia.fromJson(map);
      })())
            .whereType<ProviderGeneratedMedia>()
            .toList();
      })(),
      content: (() {
        final list = _sdkworkAsList(json['content']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : VolcengineContentPart.fromJson(map);
      })())
            .whereType<VolcengineContentPart>()
            .toList();
      })(),
      id: json['id']?.toString(),
      images: (() {
        final list = _sdkworkAsList(json['images']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ProviderGeneratedMedia.fromJson(map);
      })())
            .whereType<ProviderGeneratedMedia>()
            .toList();
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
      status: json['status']?.toString(),
      text: json['text']?.toString(),
      videos: (() {
        final list = _sdkworkAsList(json['videos']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ProviderGeneratedMedia.fromJson(map);
      })())
            .whereType<ProviderGeneratedMedia>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'audios': audios?.map((item) => item.toJson()).toList(),
      'content': content?.map((item) => item.toJson()).toList(),
      'id': id,
      'images': images?.map((item) => item.toJson()).toList(),
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'status': status,
      'text': text,
      'videos': videos?.map((item) => item.toJson()).toList(),
    };
  }
}

class SunoMusicGenerationRequest {
  final String? callbackUrl;
  final double? duration;
  final String? model;
  final String? negativeTags;
  final String prompt;
  final String? tags;
  final String? title;

  SunoMusicGenerationRequest({
    this.callbackUrl,
    this.duration,
    this.model,
    this.negativeTags,
    required this.prompt,
    this.tags,
    this.title
  });

  factory SunoMusicGenerationRequest.fromJson(Map<String, dynamic> json) {
    return SunoMusicGenerationRequest(
      callbackUrl: json['callback_url']?.toString(),
      duration: json['duration'] is num ? json['duration'].toDouble() : null,
      model: json['model']?.toString(),
      negativeTags: json['negative_tags']?.toString(),
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('SunoMusicGenerationRequest.prompt is required');
        }
        return value;
      })(),
      tags: json['tags']?.toString(),
      title: json['title']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'callback_url': callbackUrl,
      'duration': duration,
      'model': model,
      'negative_tags': negativeTags,
      'prompt': prompt,
      'tags': tags,
      'title': title,
    };
  }
}

class SunoMusicGenerationResponse {
  final String? createdAt;
  final String? id;
  final String? status;
  final String? taskId;

  SunoMusicGenerationResponse({
    this.createdAt,
    this.id,
    this.status,
    this.taskId
  });

  factory SunoMusicGenerationResponse.fromJson(Map<String, dynamic> json) {
    return SunoMusicGenerationResponse(
      createdAt: json['created_at']?.toString(),
      id: json['id']?.toString(),
      status: json['status']?.toString(),
      taskId: json['task_id']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created_at': createdAt,
      'id': id,
      'status': status,
      'task_id': taskId,
    };
  }
}

class SunoMusicGenerationTaskResponse {
  final String? createdAt;
  final ProviderTaskError? error;
  final String? id;
  final String? status;
  final String? taskId;
  final String? title;
  final List<SunoMusicTrack>? tracks;
  final String? updatedAt;

  SunoMusicGenerationTaskResponse({
    this.createdAt,
    this.error,
    this.id,
    this.status,
    this.taskId,
    this.title,
    this.tracks,
    this.updatedAt
  });

  factory SunoMusicGenerationTaskResponse.fromJson(Map<String, dynamic> json) {
    return SunoMusicGenerationTaskResponse(
      createdAt: json['created_at']?.toString(),
      error: (() {
        final map = _sdkworkAsMap(json['error']);
        return map == null ? null : ProviderTaskError.fromJson(map);
      })(),
      id: json['id']?.toString(),
      status: json['status']?.toString(),
      taskId: json['task_id']?.toString(),
      title: json['title']?.toString(),
      tracks: (() {
        final list = _sdkworkAsList(json['tracks']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : SunoMusicTrack.fromJson(map);
      })())
            .whereType<SunoMusicTrack>()
            .toList();
      })(),
      updatedAt: json['updated_at']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created_at': createdAt,
      'error': error?.toJson(),
      'id': id,
      'status': status,
      'task_id': taskId,
      'title': title,
      'tracks': tracks?.map((item) => item.toJson()).toList(),
      'updated_at': updatedAt,
    };
  }
}

class SunoMusicTrack {
  final String? audioUrl;
  final double? duration;
  final String? id;
  final String? imageUrl;
  final String? lyrics;
  final String? title;
  final String? videoUrl;

  SunoMusicTrack({
    this.audioUrl,
    this.duration,
    this.id,
    this.imageUrl,
    this.lyrics,
    this.title,
    this.videoUrl
  });

  factory SunoMusicTrack.fromJson(Map<String, dynamic> json) {
    return SunoMusicTrack(
      audioUrl: json['audio_url']?.toString(),
      duration: json['duration'] is num ? json['duration'].toDouble() : null,
      id: json['id']?.toString(),
      imageUrl: json['image_url']?.toString(),
      lyrics: json['lyrics']?.toString(),
      title: json['title']?.toString(),
      videoUrl: json['video_url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'audio_url': audioUrl,
      'duration': duration,
      'id': id,
      'image_url': imageUrl,
      'lyrics': lyrics,
      'title': title,
      'video_url': videoUrl,
    };
  }
}

class ViduCreation {
  final String? audioUrl;
  final String? coverUrl;
  final String? createdAt;
  final double? duration;
  final int? height;
  final String? id;
  final String? imageUrl;
  final Map<String, dynamic>? metadata;
  final String? type;
  final String? uri;
  final String? url;
  final String? videoUrl;
  final int? width;

  ViduCreation({
    this.audioUrl,
    this.coverUrl,
    this.createdAt,
    this.duration,
    this.height,
    this.id,
    this.imageUrl,
    this.metadata,
    this.type,
    this.uri,
    this.url,
    this.videoUrl,
    this.width
  });

  factory ViduCreation.fromJson(Map<String, dynamic> json) {
    return ViduCreation(
      audioUrl: json['audio_url']?.toString(),
      coverUrl: json['cover_url']?.toString(),
      createdAt: json['created_at']?.toString(),
      duration: json['duration'] is num ? json['duration'].toDouble() : null,
      height: json['height'] is int ? json['height'] : null,
      id: json['id']?.toString(),
      imageUrl: json['image_url']?.toString(),
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
      type: json['type']?.toString(),
      uri: json['uri']?.toString(),
      url: json['url']?.toString(),
      videoUrl: json['video_url']?.toString(),
      width: json['width'] is int ? json['width'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'audio_url': audioUrl,
      'cover_url': coverUrl,
      'created_at': createdAt,
      'duration': duration,
      'height': height,
      'id': id,
      'image_url': imageUrl,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'type': type,
      'uri': uri,
      'url': url,
      'video_url': videoUrl,
      'width': width,
    };
  }
}

class ViduImageGenerationTask {
  final String? createdAt;
  final List<ViduCreation>? creations;
  final String? model;
  final String? state;
  final String? taskId;

  ViduImageGenerationTask({
    this.createdAt,
    this.creations,
    this.model,
    this.state,
    this.taskId
  });

  factory ViduImageGenerationTask.fromJson(Map<String, dynamic> json) {
    return ViduImageGenerationTask(
      createdAt: json['created_at']?.toString(),
      creations: (() {
        final list = _sdkworkAsList(json['creations']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ViduCreation.fromJson(map);
      })())
            .whereType<ViduCreation>()
            .toList();
      })(),
      model: json['model']?.toString(),
      state: json['state']?.toString(),
      taskId: json['task_id']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created_at': createdAt,
      'creations': creations?.map((item) => item.toJson()).toList(),
      'model': model,
      'state': state,
      'task_id': taskId,
    };
  }
}

class ViduImageToVideoRequest {
  final String? aspectRatio;
  final String? callbackUrl;
  final int? duration;
  final List<String> images;
  final String model;
  final String? movementAmplitude;
  final String? payload;
  final String? prompt;
  final String? resolution;
  final int? seed;

  ViduImageToVideoRequest({
    this.aspectRatio,
    this.callbackUrl,
    this.duration,
    required this.images,
    required this.model,
    this.movementAmplitude,
    this.payload,
    this.prompt,
    this.resolution,
    this.seed
  });

  factory ViduImageToVideoRequest.fromJson(Map<String, dynamic> json) {
    return ViduImageToVideoRequest(
      aspectRatio: json['aspect_ratio']?.toString(),
      callbackUrl: json['callback_url']?.toString(),
      duration: json['duration'] is int ? json['duration'] : null,
      images: (() {
        final list = _sdkworkAsList(json['images']);
        if (list == null) {
          throw FormatException('ViduImageToVideoRequest.images is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('ViduImageToVideoRequest.model is required');
        }
        return value;
      })(),
      movementAmplitude: json['movement_amplitude']?.toString(),
      payload: json['payload']?.toString(),
      prompt: json['prompt']?.toString(),
      resolution: json['resolution']?.toString(),
      seed: json['seed'] is int ? json['seed'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'callback_url': callbackUrl,
      'duration': duration,
      'images': images.map((item) => item).toList(),
      'model': model,
      'movement_amplitude': movementAmplitude,
      'payload': payload,
      'prompt': prompt,
      'resolution': resolution,
      'seed': seed,
    };
  }
}

class ViduReferenceToImageRequest {
  final String? aspectRatio;
  final String? callbackUrl;
  final List<String> images;
  final String model;
  final String? payload;
  final String prompt;
  final int? seed;
  final String? style;

  ViduReferenceToImageRequest({
    this.aspectRatio,
    this.callbackUrl,
    required this.images,
    required this.model,
    this.payload,
    required this.prompt,
    this.seed,
    this.style
  });

  factory ViduReferenceToImageRequest.fromJson(Map<String, dynamic> json) {
    return ViduReferenceToImageRequest(
      aspectRatio: json['aspect_ratio']?.toString(),
      callbackUrl: json['callback_url']?.toString(),
      images: (() {
        final list = _sdkworkAsList(json['images']);
        if (list == null) {
          throw FormatException('ViduReferenceToImageRequest.images is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('ViduReferenceToImageRequest.model is required');
        }
        return value;
      })(),
      payload: json['payload']?.toString(),
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('ViduReferenceToImageRequest.prompt is required');
        }
        return value;
      })(),
      seed: json['seed'] is int ? json['seed'] : null,
      style: json['style']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'callback_url': callbackUrl,
      'images': images.map((item) => item).toList(),
      'model': model,
      'payload': payload,
      'prompt': prompt,
      'seed': seed,
      'style': style,
    };
  }
}

class ViduReferenceToVideoRequest {
  final String? aspectRatio;
  final String? callbackUrl;
  final int? duration;
  final List<String> images;
  final String model;
  final String? movementAmplitude;
  final String? payload;
  final String? prompt;
  final String? resolution;
  final int? seed;

  ViduReferenceToVideoRequest({
    this.aspectRatio,
    this.callbackUrl,
    this.duration,
    required this.images,
    required this.model,
    this.movementAmplitude,
    this.payload,
    this.prompt,
    this.resolution,
    this.seed
  });

  factory ViduReferenceToVideoRequest.fromJson(Map<String, dynamic> json) {
    return ViduReferenceToVideoRequest(
      aspectRatio: json['aspect_ratio']?.toString(),
      callbackUrl: json['callback_url']?.toString(),
      duration: json['duration'] is int ? json['duration'] : null,
      images: (() {
        final list = _sdkworkAsList(json['images']);
        if (list == null) {
          throw FormatException('ViduReferenceToVideoRequest.images is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('ViduReferenceToVideoRequest.model is required');
        }
        return value;
      })(),
      movementAmplitude: json['movement_amplitude']?.toString(),
      payload: json['payload']?.toString(),
      prompt: json['prompt']?.toString(),
      resolution: json['resolution']?.toString(),
      seed: json['seed'] is int ? json['seed'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'callback_url': callbackUrl,
      'duration': duration,
      'images': images.map((item) => item).toList(),
      'model': model,
      'movement_amplitude': movementAmplitude,
      'payload': payload,
      'prompt': prompt,
      'resolution': resolution,
      'seed': seed,
    };
  }
}

class ViduStartEndToVideoRequest {
  final String? aspectRatio;
  final String? callbackUrl;
  final int? duration;
  final List<String> images;
  final String model;
  final String? movementAmplitude;
  final String? payload;
  final String? prompt;
  final String? resolution;
  final int? seed;

  ViduStartEndToVideoRequest({
    this.aspectRatio,
    this.callbackUrl,
    this.duration,
    required this.images,
    required this.model,
    this.movementAmplitude,
    this.payload,
    this.prompt,
    this.resolution,
    this.seed
  });

  factory ViduStartEndToVideoRequest.fromJson(Map<String, dynamic> json) {
    return ViduStartEndToVideoRequest(
      aspectRatio: json['aspect_ratio']?.toString(),
      callbackUrl: json['callback_url']?.toString(),
      duration: json['duration'] is int ? json['duration'] : null,
      images: (() {
        final list = _sdkworkAsList(json['images']);
        if (list == null) {
          throw FormatException('ViduStartEndToVideoRequest.images is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('ViduStartEndToVideoRequest.model is required');
        }
        return value;
      })(),
      movementAmplitude: json['movement_amplitude']?.toString(),
      payload: json['payload']?.toString(),
      prompt: json['prompt']?.toString(),
      resolution: json['resolution']?.toString(),
      seed: json['seed'] is int ? json['seed'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'callback_url': callbackUrl,
      'duration': duration,
      'images': images.map((item) => item).toList(),
      'model': model,
      'movement_amplitude': movementAmplitude,
      'payload': payload,
      'prompt': prompt,
      'resolution': resolution,
      'seed': seed,
    };
  }
}

class ViduTaskCreationsResponse {
  final String? createdAt;
  final List<ViduCreation>? creations;
  final String? model;
  final String? state;
  final String? taskId;

  ViduTaskCreationsResponse({
    this.createdAt,
    this.creations,
    this.model,
    this.state,
    this.taskId
  });

  factory ViduTaskCreationsResponse.fromJson(Map<String, dynamic> json) {
    return ViduTaskCreationsResponse(
      createdAt: json['created_at']?.toString(),
      creations: (() {
        final list = _sdkworkAsList(json['creations']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ViduCreation.fromJson(map);
      })())
            .whereType<ViduCreation>()
            .toList();
      })(),
      model: json['model']?.toString(),
      state: json['state']?.toString(),
      taskId: json['task_id']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created_at': createdAt,
      'creations': creations?.map((item) => item.toJson()).toList(),
      'model': model,
      'state': state,
      'task_id': taskId,
    };
  }
}

class ViduTextToVideoRequest {
  final String? aspectRatio;
  final String? callbackUrl;
  final int? duration;
  final String model;
  final String? movementAmplitude;
  final String? payload;
  final String prompt;
  final String? resolution;
  final int? seed;

  ViduTextToVideoRequest({
    this.aspectRatio,
    this.callbackUrl,
    this.duration,
    required this.model,
    this.movementAmplitude,
    this.payload,
    required this.prompt,
    this.resolution,
    this.seed
  });

  factory ViduTextToVideoRequest.fromJson(Map<String, dynamic> json) {
    return ViduTextToVideoRequest(
      aspectRatio: json['aspect_ratio']?.toString(),
      callbackUrl: json['callback_url']?.toString(),
      duration: json['duration'] is int ? json['duration'] : null,
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('ViduTextToVideoRequest.model is required');
        }
        return value;
      })(),
      movementAmplitude: json['movement_amplitude']?.toString(),
      payload: json['payload']?.toString(),
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('ViduTextToVideoRequest.prompt is required');
        }
        return value;
      })(),
      resolution: json['resolution']?.toString(),
      seed: json['seed'] is int ? json['seed'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'callback_url': callbackUrl,
      'duration': duration,
      'model': model,
      'movement_amplitude': movementAmplitude,
      'payload': payload,
      'prompt': prompt,
      'resolution': resolution,
      'seed': seed,
    };
  }
}

class ViduVideoGenerationTask {
  final String? createdAt;
  final List<ViduCreation>? creations;
  final String? model;
  final String? state;
  final String? taskId;

  ViduVideoGenerationTask({
    this.createdAt,
    this.creations,
    this.model,
    this.state,
    this.taskId
  });

  factory ViduVideoGenerationTask.fromJson(Map<String, dynamic> json) {
    return ViduVideoGenerationTask(
      createdAt: json['created_at']?.toString(),
      creations: (() {
        final list = _sdkworkAsList(json['creations']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ViduCreation.fromJson(map);
      })())
            .whereType<ViduCreation>()
            .toList();
      })(),
      model: json['model']?.toString(),
      state: json['state']?.toString(),
      taskId: json['task_id']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created_at': createdAt,
      'creations': creations?.map((item) => item.toJson()).toList(),
      'model': model,
      'state': state,
      'task_id': taskId,
    };
  }
}

class VolcengineContentGenerationTask {
  final List<VolcengineContentPart>? content;
  final String? createdAt;
  final ProviderTaskError? error;
  final String? id;
  final String? model;
  final String? prompt;
  final ProviderTaskResult? result;
  final String? state;
  final String? status;
  final String? taskId;
  final String? updatedAt;
  final List<ProviderGeneratedMedia>? videos;

  VolcengineContentGenerationTask({
    this.content,
    this.createdAt,
    this.error,
    this.id,
    this.model,
    this.prompt,
    this.result,
    this.state,
    this.status,
    this.taskId,
    this.updatedAt,
    this.videos
  });

  factory VolcengineContentGenerationTask.fromJson(Map<String, dynamic> json) {
    return VolcengineContentGenerationTask(
      content: (() {
        final list = _sdkworkAsList(json['content']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : VolcengineContentPart.fromJson(map);
      })())
            .whereType<VolcengineContentPart>()
            .toList();
      })(),
      createdAt: json['created_at']?.toString(),
      error: (() {
        final map = _sdkworkAsMap(json['error']);
        return map == null ? null : ProviderTaskError.fromJson(map);
      })(),
      id: json['id']?.toString(),
      model: json['model']?.toString(),
      prompt: json['prompt']?.toString(),
      result: (() {
        final map = _sdkworkAsMap(json['result']);
        return map == null ? null : ProviderTaskResult.fromJson(map);
      })(),
      state: json['state']?.toString(),
      status: json['status']?.toString(),
      taskId: json['task_id']?.toString(),
      updatedAt: json['updated_at']?.toString(),
      videos: (() {
        final list = _sdkworkAsList(json['videos']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ProviderGeneratedMedia.fromJson(map);
      })())
            .whereType<ProviderGeneratedMedia>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'content': content?.map((item) => item.toJson()).toList(),
      'created_at': createdAt,
      'error': error?.toJson(),
      'id': id,
      'model': model,
      'prompt': prompt,
      'result': result?.toJson(),
      'state': state,
      'status': status,
      'task_id': taskId,
      'updated_at': updatedAt,
      'videos': videos?.map((item) => item.toJson()).toList(),
    };
  }
}

class VolcengineContentGenerationTaskCreateRequest {
  final String? callbackUrl;
  final List<VolcengineContentPart> content;
  final Map<String, dynamic>? metadata;
  final String model;

  VolcengineContentGenerationTaskCreateRequest({
    this.callbackUrl,
    required this.content,
    this.metadata,
    required this.model
  });

  factory VolcengineContentGenerationTaskCreateRequest.fromJson(Map<String, dynamic> json) {
    return VolcengineContentGenerationTaskCreateRequest(
      callbackUrl: json['callback_url']?.toString(),
      content: (() {
        final list = _sdkworkAsList(json['content']);
        if (list == null) {
          throw FormatException('VolcengineContentGenerationTaskCreateRequest.content is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : VolcengineContentPart.fromJson(map);
      })())
            .whereType<VolcengineContentPart>()
            .toList();
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
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('VolcengineContentGenerationTaskCreateRequest.model is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'callback_url': callbackUrl,
      'content': content.map((item) => item.toJson()).toList(),
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'model': model,
    };
  }
}

class VolcengineContentGenerationTaskCreateResponse {
  final String? createdAt;
  final String? id;
  final String? status;
  final String? taskId;

  VolcengineContentGenerationTaskCreateResponse({
    this.createdAt,
    this.id,
    this.status,
    this.taskId
  });

  factory VolcengineContentGenerationTaskCreateResponse.fromJson(Map<String, dynamic> json) {
    return VolcengineContentGenerationTaskCreateResponse(
      createdAt: json['created_at']?.toString(),
      id: json['id']?.toString(),
      status: json['status']?.toString(),
      taskId: json['task_id']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created_at': createdAt,
      'id': id,
      'status': status,
      'task_id': taskId,
    };
  }
}

class VolcengineContentPart {
  final String? fileId;
  final String? imageUrl;
  final String? text;
  final String type;
  final String? videoUrl;

  VolcengineContentPart({
    this.fileId,
    this.imageUrl,
    this.text,
    required this.type,
    this.videoUrl
  });

  factory VolcengineContentPart.fromJson(Map<String, dynamic> json) {
    return VolcengineContentPart(
      fileId: json['file_id']?.toString(),
      imageUrl: json['image_url']?.toString(),
      text: json['text']?.toString(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('VolcengineContentPart.type is required');
        }
        return value;
      })(),
      videoUrl: json['video_url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'file_id': fileId,
      'image_url': imageUrl,
      'text': text,
      'type': type,
      'video_url': videoUrl,
    };
  }
}
