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

class AlibabaAsyncTask {
  final String? code;
  final String? endTime;
  final String? message;
  final String? origPrompt;
  final List<ProviderGeneratedMedia>? results;
  final String? scheduledTime;
  final String? submitTime;
  final String? taskId;
  final String? taskStatus;
  final String? videoUrl;

  AlibabaAsyncTask({
    this.code,
    this.endTime,
    this.message,
    this.origPrompt,
    this.results,
    this.scheduledTime,
    this.submitTime,
    this.taskId,
    this.taskStatus,
    this.videoUrl
  });

  factory AlibabaAsyncTask.fromJson(Map<String, dynamic> json) {
    return AlibabaAsyncTask(
      code: json['code']?.toString(),
      endTime: json['end_time']?.toString(),
      message: json['message']?.toString(),
      origPrompt: json['orig_prompt']?.toString(),
      results: (() {
        final list = _sdkworkAsList(json['results']);
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
      scheduledTime: json['scheduled_time']?.toString(),
      submitTime: json['submit_time']?.toString(),
      taskId: json['task_id']?.toString(),
      taskStatus: json['task_status']?.toString(),
      videoUrl: json['video_url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'end_time': endTime,
      'message': message,
      'orig_prompt': origPrompt,
      'results': results?.map((item) => item.toJson()).toList(),
      'scheduled_time': scheduledTime,
      'submit_time': submitTime,
      'task_id': taskId,
      'task_status': taskStatus,
      'video_url': videoUrl,
    };
  }
}

class AlibabaImageGenerationRequest {
  final Map<String, dynamic> input;
  final String model;
  final Map<String, dynamic>? parameters;

  AlibabaImageGenerationRequest({
    required this.input,
    required this.model,
    this.parameters
  });

  factory AlibabaImageGenerationRequest.fromJson(Map<String, dynamic> json) {
    return AlibabaImageGenerationRequest(
      input: (() {
        final map = _sdkworkAsMap(json['input']);
        if (map == null) {
          throw FormatException('AlibabaImageGenerationRequest.input is required');
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
          throw FormatException('AlibabaImageGenerationRequest.model is required');
        }
        return value;
      })(),
      parameters: (() {
        final map = _sdkworkAsMap(json['parameters']);
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
      'input': input.map((key, item) => MapEntry(key, item)),
      'model': model,
      'parameters': parameters?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class AlibabaImageGenerationResponse {
  final String? code;
  final String? message;
  final AlibabaAsyncTask? output;
  final String? requestId;
  final AlibabaTaskUsage? usage;

  AlibabaImageGenerationResponse({
    this.code,
    this.message,
    this.output,
    this.requestId,
    this.usage
  });

  factory AlibabaImageGenerationResponse.fromJson(Map<String, dynamic> json) {
    return AlibabaImageGenerationResponse(
      code: json['code']?.toString(),
      message: json['message']?.toString(),
      output: (() {
        final map = _sdkworkAsMap(json['output']);
        return map == null ? null : AlibabaAsyncTask.fromJson(map);
      })(),
      requestId: json['request_id']?.toString(),
      usage: (() {
        final map = _sdkworkAsMap(json['usage']);
        return map == null ? null : AlibabaTaskUsage.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'message': message,
      'output': output?.toJson(),
      'request_id': requestId,
      'usage': usage?.toJson(),
    };
  }
}

class AlibabaSpeechInput {
  final String? instructions;
  final String? languageType;
  final bool? optimizeInstructions;
  final String text;
  final String voice;

  AlibabaSpeechInput({
    this.instructions,
    this.languageType,
    this.optimizeInstructions,
    required this.text,
    required this.voice
  });

  factory AlibabaSpeechInput.fromJson(Map<String, dynamic> json) {
    return AlibabaSpeechInput(
      instructions: json['instructions']?.toString(),
      languageType: json['language_type']?.toString(),
      optimizeInstructions: json['optimize_instructions'] is bool ? json['optimize_instructions'] : null,
      text: (() {
        final value = json['text']?.toString();
        if (value == null) {
          throw FormatException('AlibabaSpeechInput.text is required');
        }
        return value;
      })(),
      voice: (() {
        final value = json['voice']?.toString();
        if (value == null) {
          throw FormatException('AlibabaSpeechInput.voice is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'instructions': instructions,
      'language_type': languageType,
      'optimize_instructions': optimizeInstructions,
      'text': text,
      'voice': voice,
    };
  }
}

class AlibabaSpeechRequest {
  final AlibabaSpeechInput input;
  final String model;
  final Map<String, dynamic>? parameters;

  AlibabaSpeechRequest({
    required this.input,
    required this.model,
    this.parameters
  });

  factory AlibabaSpeechRequest.fromJson(Map<String, dynamic> json) {
    return AlibabaSpeechRequest(
      input: (() {
        final map = _sdkworkAsMap(json['input']);
        if (map == null) {
          throw FormatException('AlibabaSpeechRequest.input is required');
        }
        return AlibabaSpeechInput.fromJson(map);
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('AlibabaSpeechRequest.model is required');
        }
        return value;
      })(),
      parameters: (() {
        final map = _sdkworkAsMap(json['parameters']);
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
      'input': input.toJson(),
      'model': model,
      'parameters': parameters?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class AlibabaSpeechResponse {
  final String? code;
  final String? message;
  final Map<String, dynamic>? output;
  final String? requestId;
  final Map<String, dynamic>? usage;

  AlibabaSpeechResponse({
    this.code,
    this.message,
    this.output,
    this.requestId,
    this.usage
  });

  factory AlibabaSpeechResponse.fromJson(Map<String, dynamic> json) {
    return AlibabaSpeechResponse(
      code: json['code']?.toString(),
      message: json['message']?.toString(),
      output: (() {
        final map = _sdkworkAsMap(json['output']);
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
      requestId: json['request_id']?.toString(),
      usage: (() {
        final map = _sdkworkAsMap(json['usage']);
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
      'code': code,
      'message': message,
      'output': output?.map((key, item) => MapEntry(key, item)),
      'request_id': requestId,
      'usage': usage?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class AlibabaTaskUsage {
  final int? sr;
  final double? duration;
  final int? imageCount;
  final int? inputVideoDuration;
  final int? outputVideoDuration;
  final String? ratio;

  AlibabaTaskUsage({
    this.sr,
    this.duration,
    this.imageCount,
    this.inputVideoDuration,
    this.outputVideoDuration,
    this.ratio
  });

  factory AlibabaTaskUsage.fromJson(Map<String, dynamic> json) {
    return AlibabaTaskUsage(
      sr: json['SR'] is int ? json['SR'] : null,
      duration: json['duration'] is num ? json['duration'].toDouble() : null,
      imageCount: json['image_count'] is int ? json['image_count'] : null,
      inputVideoDuration: json['input_video_duration'] is int ? json['input_video_duration'] : null,
      outputVideoDuration: json['output_video_duration'] is int ? json['output_video_duration'] : null,
      ratio: json['ratio']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'SR': sr,
      'duration': duration,
      'image_count': imageCount,
      'input_video_duration': inputVideoDuration,
      'output_video_duration': outputVideoDuration,
      'ratio': ratio,
    };
  }
}

class AlibabaVideoGenerationRequest {
  final Map<String, dynamic> input;
  final String model;
  final Map<String, dynamic>? parameters;

  AlibabaVideoGenerationRequest({
    required this.input,
    required this.model,
    this.parameters
  });

  factory AlibabaVideoGenerationRequest.fromJson(Map<String, dynamic> json) {
    return AlibabaVideoGenerationRequest(
      input: (() {
        final map = _sdkworkAsMap(json['input']);
        if (map == null) {
          throw FormatException('AlibabaVideoGenerationRequest.input is required');
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
          throw FormatException('AlibabaVideoGenerationRequest.model is required');
        }
        return value;
      })(),
      parameters: (() {
        final map = _sdkworkAsMap(json['parameters']);
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
      'input': input.map((key, item) => MapEntry(key, item)),
      'model': model,
      'parameters': parameters?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class AlibabaVideoGenerationResponse {
  final String? code;
  final String? message;
  final AlibabaAsyncTask? output;
  final String? requestId;
  final AlibabaTaskUsage? usage;

  AlibabaVideoGenerationResponse({
    this.code,
    this.message,
    this.output,
    this.requestId,
    this.usage
  });

  factory AlibabaVideoGenerationResponse.fromJson(Map<String, dynamic> json) {
    return AlibabaVideoGenerationResponse(
      code: json['code']?.toString(),
      message: json['message']?.toString(),
      output: (() {
        final map = _sdkworkAsMap(json['output']);
        return map == null ? null : AlibabaAsyncTask.fromJson(map);
      })(),
      requestId: json['request_id']?.toString(),
      usage: (() {
        final map = _sdkworkAsMap(json['usage']);
        return map == null ? null : AlibabaTaskUsage.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'message': message,
      'output': output?.toJson(),
      'request_id': requestId,
      'usage': usage?.toJson(),
    };
  }
}

class AlibabaVideoGenerationTask {
  final AlibabaAsyncTask? output;
  final String? requestId;
  final AlibabaTaskUsage? usage;

  AlibabaVideoGenerationTask({
    this.output,
    this.requestId,
    this.usage
  });

  factory AlibabaVideoGenerationTask.fromJson(Map<String, dynamic> json) {
    return AlibabaVideoGenerationTask(
      output: (() {
        final map = _sdkworkAsMap(json['output']);
        return map == null ? null : AlibabaAsyncTask.fromJson(map);
      })(),
      requestId: json['request_id']?.toString(),
      usage: (() {
        final map = _sdkworkAsMap(json['usage']);
        return map == null ? null : AlibabaTaskUsage.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'output': output?.toJson(),
      'request_id': requestId,
      'usage': usage?.toJson(),
    };
  }
}

class AnthropicCacheControl {
  final String? ttl;
  final String type;

  AnthropicCacheControl({
    this.ttl,
    required this.type
  });

  factory AnthropicCacheControl.fromJson(Map<String, dynamic> json) {
    return AnthropicCacheControl(
      ttl: json['ttl']?.toString(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('AnthropicCacheControl.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'ttl': ttl,
      'type': type,
    };
  }
}

class AnthropicContainer {
  final String? id;
  final List<AnthropicSkill>? skills;

  AnthropicContainer({
    this.id,
    this.skills
  });

  factory AnthropicContainer.fromJson(Map<String, dynamic> json) {
    return AnthropicContainer(
      id: json['id']?.toString(),
      skills: (() {
        final list = _sdkworkAsList(json['skills']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AnthropicSkill.fromJson(map);
      })())
            .whereType<AnthropicSkill>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'skills': skills?.map((item) => item.toJson()).toList(),
    };
  }
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
  final AnthropicCacheControl? cacheControl;
  final Map<String, dynamic>? caller;
  final List<Map<String, dynamic>>? citations;
  final dynamic content;
  final String? context;
  final String? data;
  final String? id;
  final Map<String, dynamic>? input;
  final bool? isError;
  final String? name;
  final String? signature;
  final AnthropicContentSource? source;
  final String? text;
  final String? thinking;
  final String? title;
  final String? toolUseId;
  final String? toolsetName;
  final String type;

  AnthropicContentBlockParam({
    this.cacheControl,
    this.caller,
    this.citations,
    this.content,
    this.context,
    this.data,
    this.id,
    this.input,
    this.isError,
    this.name,
    this.signature,
    this.source,
    this.text,
    this.thinking,
    this.title,
    this.toolUseId,
    this.toolsetName,
    required this.type
  });

  factory AnthropicContentBlockParam.fromJson(Map<String, dynamic> json) {
    return AnthropicContentBlockParam(
      cacheControl: (() {
        final map = _sdkworkAsMap(json['cache_control']);
        return map == null ? null : AnthropicCacheControl.fromJson(map);
      })(),
      caller: (() {
        final map = _sdkworkAsMap(json['caller']);
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
      citations: (() {
        final list = _sdkworkAsList(json['citations']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })())
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      content: json['content']?.toString(),
      context: json['context']?.toString(),
      data: json['data']?.toString(),
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
      isError: json['is_error'] is bool ? json['is_error'] : null,
      name: json['name']?.toString(),
      signature: json['signature']?.toString(),
      source: (() {
        final map = _sdkworkAsMap(json['source']);
        return map == null ? null : AnthropicContentSource.fromJson(map);
      })(),
      text: json['text']?.toString(),
      thinking: json['thinking']?.toString(),
      title: json['title']?.toString(),
      toolUseId: json['tool_use_id']?.toString(),
      toolsetName: json['toolset_name']?.toString(),
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
      'cache_control': cacheControl?.toJson(),
      'caller': caller?.map((key, item) => MapEntry(key, item)),
      'citations': citations?.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
      'content': content,
      'context': context,
      'data': data,
      'id': id,
      'input': input?.map((key, item) => MapEntry(key, item)),
      'is_error': isError,
      'name': name,
      'signature': signature,
      'source': source?.toJson(),
      'text': text,
      'thinking': thinking,
      'title': title,
      'tool_use_id': toolUseId,
      'toolset_name': toolsetName,
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
  final AnthropicCacheControl? cacheControl;
  final List<AnthropicMessageParam> messages;
  final String model;
  final AnthropicOutputConfig? outputConfig;
  final String? speed;
  final dynamic system;
  final AnthropicThinkingConfig? thinking;
  final AnthropicToolChoice? toolChoice;
  final List<dynamic>? tools;

  AnthropicCountMessageTokensRequest({
    this.cacheControl,
    required this.messages,
    required this.model,
    this.outputConfig,
    this.speed,
    this.system,
    this.thinking,
    this.toolChoice,
    this.tools
  });

  factory AnthropicCountMessageTokensRequest.fromJson(Map<String, dynamic> json) {
    return AnthropicCountMessageTokensRequest(
      cacheControl: (() {
        final map = _sdkworkAsMap(json['cache_control']);
        return map == null ? null : AnthropicCacheControl.fromJson(map);
      })(),
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
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('AnthropicCountMessageTokensRequest.model is required');
        }
        return value;
      })(),
      outputConfig: (() {
        final map = _sdkworkAsMap(json['output_config']);
        return map == null ? null : AnthropicOutputConfig.fromJson(map);
      })(),
      speed: json['speed']?.toString(),
      system: json['system']?.toString(),
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
            .whereType<dynamic>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cache_control': cacheControl?.toJson(),
      'messages': messages.map((item) => item.toJson()).toList(),
      'model': model,
      'output_config': outputConfig?.toJson(),
      'speed': speed,
      'system': system,
      'thinking': thinking?.toJson(),
      'tool_choice': toolChoice?.toJson(),
      'tools': tools?.map((item) => item.toJson()).toList(),
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

class AnthropicDiagnostics {
  final String? previousMessageId;

  AnthropicDiagnostics({
    this.previousMessageId
  });

  factory AnthropicDiagnostics.fromJson(Map<String, dynamic> json) {
    return AnthropicDiagnostics(
      previousMessageId: json['previous_message_id']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'previous_message_id': previousMessageId,
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
  final String? stopReason;
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
        if (!json.containsKey('stop_reason')) {
          throw FormatException('AnthropicMessage.stop_reason is required');
        }
        final _sdkworkRequiredValue = json['stop_reason'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('AnthropicMessage.stop_reason is required');
        }
        return value;
      })();
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
  final AnthropicCacheControl? cacheControl;
  final AnthropicContainer? container;
  final AnthropicDiagnostics? diagnostics;
  final String? inferenceGeo;
  final int maxTokens;
  final List<AnthropicMessageParam> messages;
  final AnthropicMetadata? metadata;
  final String model;
  final AnthropicOutputConfig? outputConfig;
  final String? serviceTier;
  final String? speed;
  final List<String>? stopSequences;
  final bool? stream;
  final dynamic system;
  final double? temperature;
  final AnthropicThinkingConfig? thinking;
  final AnthropicToolChoice? toolChoice;
  final List<dynamic>? tools;
  final int? topK;
  final double? topP;

  AnthropicMessageCreateRequest({
    this.cacheControl,
    this.container,
    this.diagnostics,
    this.inferenceGeo,
    required this.maxTokens,
    required this.messages,
    this.metadata,
    required this.model,
    this.outputConfig,
    this.serviceTier,
    this.speed,
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
      cacheControl: (() {
        final map = _sdkworkAsMap(json['cache_control']);
        return map == null ? null : AnthropicCacheControl.fromJson(map);
      })(),
      container: (() {
        final map = _sdkworkAsMap(json['container']);
        return map == null ? null : AnthropicContainer.fromJson(map);
      })(),
      diagnostics: (() {
        final map = _sdkworkAsMap(json['diagnostics']);
        return map == null ? null : AnthropicDiagnostics.fromJson(map);
      })(),
      inferenceGeo: json['inference_geo']?.toString(),
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
        return map == null ? null : AnthropicMetadata.fromJson(map);
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('AnthropicMessageCreateRequest.model is required');
        }
        return value;
      })(),
      outputConfig: (() {
        final map = _sdkworkAsMap(json['output_config']);
        return map == null ? null : AnthropicOutputConfig.fromJson(map);
      })(),
      serviceTier: json['service_tier']?.toString(),
      speed: json['speed']?.toString(),
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
            .whereType<dynamic>()
            .toList();
      })(),
      topK: json['top_k'] is int ? json['top_k'] : null,
      topP: json['top_p'] is num ? json['top_p'].toDouble() : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cache_control': cacheControl?.toJson(),
      'container': container?.toJson(),
      'diagnostics': diagnostics?.toJson(),
      'inference_geo': inferenceGeo,
      'max_tokens': maxTokens,
      'messages': messages.map((item) => item.toJson()).toList(),
      'metadata': metadata?.toJson(),
      'model': model,
      'output_config': outputConfig?.toJson(),
      'service_tier': serviceTier,
      'speed': speed,
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

class AnthropicMetadata {
  final String? userId;

  AnthropicMetadata({
    this.userId
  });

  factory AnthropicMetadata.fromJson(Map<String, dynamic> json) {
    return AnthropicMetadata(
      userId: json['user_id']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'user_id': userId,
    };
  }
}

class AnthropicOutputConfig {
  final String? effort;
  final AnthropicOutputFormat? format;

  AnthropicOutputConfig({
    this.effort,
    this.format
  });

  factory AnthropicOutputConfig.fromJson(Map<String, dynamic> json) {
    return AnthropicOutputConfig(
      effort: json['effort']?.toString(),
      format: (() {
        final map = _sdkworkAsMap(json['format']);
        return map == null ? null : AnthropicOutputFormat.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'effort': effort,
      'format': format?.toJson(),
    };
  }
}

class AnthropicOutputFormat {
  final ProviderJsonSchema schema;
  final String type;

  AnthropicOutputFormat({
    required this.schema,
    required this.type
  });

  factory AnthropicOutputFormat.fromJson(Map<String, dynamic> json) {
    return AnthropicOutputFormat(
      schema: (() {
        final map = _sdkworkAsMap(json['schema']);
        if (map == null) {
          throw FormatException('AnthropicOutputFormat.schema is required');
        }
        return ProviderJsonSchema.fromJson(map);
      })(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('AnthropicOutputFormat.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'schema': schema.toJson(),
      'type': type,
    };
  }
}

class AnthropicServerTool {
  final List<String>? allowedCallers;
  final List<String>? allowedDomains;
  final List<String>? blockedDomains;
  final AnthropicCacheControl? cacheControl;
  final bool? deferLoading;
  final int? displayHeightPx;
  final int? displayNumber;
  final int? displayWidthPx;
  final int? maxCharacters;
  final int? maxUses;
  final String name;
  final bool? strict;
  final String type;
  final Map<String, dynamic>? userLocation;

  AnthropicServerTool({
    this.allowedCallers,
    this.allowedDomains,
    this.blockedDomains,
    this.cacheControl,
    this.deferLoading,
    this.displayHeightPx,
    this.displayNumber,
    this.displayWidthPx,
    this.maxCharacters,
    this.maxUses,
    required this.name,
    this.strict,
    required this.type,
    this.userLocation
  });

  factory AnthropicServerTool.fromJson(Map<String, dynamic> json) {
    return AnthropicServerTool(
      allowedCallers: (() {
        final list = _sdkworkAsList(json['allowed_callers']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      allowedDomains: (() {
        final list = _sdkworkAsList(json['allowed_domains']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      blockedDomains: (() {
        final list = _sdkworkAsList(json['blocked_domains']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      cacheControl: (() {
        final map = _sdkworkAsMap(json['cache_control']);
        return map == null ? null : AnthropicCacheControl.fromJson(map);
      })(),
      deferLoading: json['defer_loading'] is bool ? json['defer_loading'] : null,
      displayHeightPx: json['display_height_px'] is int ? json['display_height_px'] : null,
      displayNumber: json['display_number'] is int ? json['display_number'] : null,
      displayWidthPx: json['display_width_px'] is int ? json['display_width_px'] : null,
      maxCharacters: json['max_characters'] is int ? json['max_characters'] : null,
      maxUses: json['max_uses'] is int ? json['max_uses'] : null,
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AnthropicServerTool.name is required');
        }
        return value;
      })(),
      strict: json['strict'] is bool ? json['strict'] : null,
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('AnthropicServerTool.type is required');
        }
        return value;
      })(),
      userLocation: (() {
        final map = _sdkworkAsMap(json['user_location']);
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
      'allowed_callers': allowedCallers?.map((item) => item).toList(),
      'allowed_domains': allowedDomains?.map((item) => item).toList(),
      'blocked_domains': blockedDomains?.map((item) => item).toList(),
      'cache_control': cacheControl?.toJson(),
      'defer_loading': deferLoading,
      'display_height_px': displayHeightPx,
      'display_number': displayNumber,
      'display_width_px': displayWidthPx,
      'max_characters': maxCharacters,
      'max_uses': maxUses,
      'name': name,
      'strict': strict,
      'type': type,
      'user_location': userLocation?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class AnthropicSkill {
  final String skillId;
  final String type;
  final String? version;

  AnthropicSkill({
    required this.skillId,
    required this.type,
    this.version
  });

  factory AnthropicSkill.fromJson(Map<String, dynamic> json) {
    return AnthropicSkill(
      skillId: (() {
        final value = json['skill_id']?.toString();
        if (value == null) {
          throw FormatException('AnthropicSkill.skill_id is required');
        }
        return value;
      })(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('AnthropicSkill.type is required');
        }
        return value;
      })(),
      version: json['version']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'skill_id': skillId,
      'type': type,
      'version': version,
    };
  }
}

class AnthropicThinkingConfig {
  final int? budgetTokens;
  final String? display;
  final String type;

  AnthropicThinkingConfig({
    this.budgetTokens,
    this.display,
    required this.type
  });

  factory AnthropicThinkingConfig.fromJson(Map<String, dynamic> json) {
    return AnthropicThinkingConfig(
      budgetTokens: json['budget_tokens'] is int ? json['budget_tokens'] : null,
      display: json['display']?.toString(),
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
      'display': display,
      'type': type,
    };
  }
}

class AnthropicTool {
  final List<String>? allowedCallers;
  final AnthropicCacheControl? cacheControl;
  final bool? deferLoading;
  final String? description;
  final bool? eagerInputStreaming;
  final List<Map<String, dynamic>>? inputExamples;
  final ProviderJsonSchema inputSchema;
  final String name;
  final bool? strict;
  final String? type;

  AnthropicTool({
    this.allowedCallers,
    this.cacheControl,
    this.deferLoading,
    this.description,
    this.eagerInputStreaming,
    this.inputExamples,
    required this.inputSchema,
    required this.name,
    this.strict,
    this.type
  });

  factory AnthropicTool.fromJson(Map<String, dynamic> json) {
    return AnthropicTool(
      allowedCallers: (() {
        final list = _sdkworkAsList(json['allowed_callers']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      cacheControl: (() {
        final map = _sdkworkAsMap(json['cache_control']);
        return map == null ? null : AnthropicCacheControl.fromJson(map);
      })(),
      deferLoading: json['defer_loading'] is bool ? json['defer_loading'] : null,
      description: json['description']?.toString(),
      eagerInputStreaming: json['eager_input_streaming'] is bool ? json['eager_input_streaming'] : null,
      inputExamples: (() {
        final list = _sdkworkAsList(json['input_examples']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })())
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
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
      })(),
      strict: json['strict'] is bool ? json['strict'] : null,
      type: json['type']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'allowed_callers': allowedCallers?.map((item) => item).toList(),
      'cache_control': cacheControl?.toJson(),
      'defer_loading': deferLoading,
      'description': description,
      'eager_input_streaming': eagerInputStreaming,
      'input_examples': inputExamples?.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
      'input_schema': inputSchema.toJson(),
      'name': name,
      'strict': strict,
      'type': type,
    };
  }
}

class AnthropicToolChoice {
  final bool? disableParallelToolUse;
  final String? name;
  final String type;

  AnthropicToolChoice({
    this.disableParallelToolUse,
    this.name,
    required this.type
  });

  factory AnthropicToolChoice.fromJson(Map<String, dynamic> json) {
    return AnthropicToolChoice(
      disableParallelToolUse: json['disable_parallel_tool_use'] is bool ? json['disable_parallel_tool_use'] : null,
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
      'disable_parallel_tool_use': disableParallelToolUse,
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

class ArkAudioSource {
  final String url;

  ArkAudioSource({
    required this.url
  });

  factory ArkAudioSource.fromJson(Map<String, dynamic> json) {
    return ArkAudioSource(
      url: (() {
        final value = json['url']?.toString();
        if (value == null) {
          throw FormatException('ArkAudioSource.url is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'url': url,
    };
  }
}

class ArkContentPart {
  final ArkAudioSource? audioUrl;
  final ArkDraftTask? draftTask;
  final ArkImageSource? imageUrl;
  final String? role;
  final String? text;
  final String type;
  final ArkVideoSource? videoUrl;

  ArkContentPart({
    this.audioUrl,
    this.draftTask,
    this.imageUrl,
    this.role,
    this.text,
    required this.type,
    this.videoUrl
  });

  factory ArkContentPart.fromJson(Map<String, dynamic> json) {
    return ArkContentPart(
      audioUrl: (() {
        final map = _sdkworkAsMap(json['audio_url']);
        return map == null ? null : ArkAudioSource.fromJson(map);
      })(),
      draftTask: (() {
        final map = _sdkworkAsMap(json['draft_task']);
        return map == null ? null : ArkDraftTask.fromJson(map);
      })(),
      imageUrl: (() {
        final map = _sdkworkAsMap(json['image_url']);
        return map == null ? null : ArkImageSource.fromJson(map);
      })(),
      role: json['role']?.toString(),
      text: json['text']?.toString(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('ArkContentPart.type is required');
        }
        return value;
      })(),
      videoUrl: (() {
        final map = _sdkworkAsMap(json['video_url']);
        return map == null ? null : ArkVideoSource.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'audio_url': audioUrl?.toJson(),
      'draft_task': draftTask?.toJson(),
      'image_url': imageUrl?.toJson(),
      'role': role,
      'text': text,
      'type': type,
      'video_url': videoUrl?.toJson(),
    };
  }
}

class ArkDraftTask {
  final String id;

  ArkDraftTask({
    required this.id
  });

  factory ArkDraftTask.fromJson(Map<String, dynamic> json) {
    return ArkDraftTask(
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('ArkDraftTask.id is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
    };
  }
}

class ArkImageGenerationData {
  final String? b64Json;
  final Map<String, dynamic>? boundingBox;
  final String? description;
  final ProviderTaskError? error;
  final String? name;
  final String? outputFormat;
  final String? size;
  final String? url;
  final int? zIndex;

  ArkImageGenerationData({
    this.b64Json,
    this.boundingBox,
    this.description,
    this.error,
    this.name,
    this.outputFormat,
    this.size,
    this.url,
    this.zIndex
  });

  factory ArkImageGenerationData.fromJson(Map<String, dynamic> json) {
    return ArkImageGenerationData(
      b64Json: json['b64_json']?.toString(),
      boundingBox: (() {
        final map = _sdkworkAsMap(json['bounding_box']);
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
      description: json['description']?.toString(),
      error: (() {
        final map = _sdkworkAsMap(json['error']);
        return map == null ? null : ProviderTaskError.fromJson(map);
      })(),
      name: json['name']?.toString(),
      outputFormat: json['output_format']?.toString(),
      size: json['size']?.toString(),
      url: json['url']?.toString(),
      zIndex: json['z_index'] is int ? json['z_index'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'b64_json': b64Json,
      'bounding_box': boundingBox?.map((key, item) => MapEntry(key, item)),
      'description': description,
      'error': error?.toJson(),
      'name': name,
      'output_format': outputFormat,
      'size': size,
      'url': url,
      'z_index': zIndex,
    };
  }
}

class ArkImageSource {
  final String url;

  ArkImageSource({
    required this.url
  });

  factory ArkImageSource.fromJson(Map<String, dynamic> json) {
    return ArkImageSource(
      url: (() {
        final value = json['url']?.toString();
        if (value == null) {
          throw FormatException('ArkImageSource.url is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'url': url,
    };
  }
}

class ArkImageUsage {
  final int? generatedImages;
  final int? inputImages;
  final int? outputTokens;
  final ArkVideoToolUsage? toolUsage;
  final int? totalTokens;

  ArkImageUsage({
    this.generatedImages,
    this.inputImages,
    this.outputTokens,
    this.toolUsage,
    this.totalTokens
  });

  factory ArkImageUsage.fromJson(Map<String, dynamic> json) {
    return ArkImageUsage(
      generatedImages: json['generated_images'] is int ? json['generated_images'] : null,
      inputImages: json['input_images'] is int ? json['input_images'] : null,
      outputTokens: json['output_tokens'] is int ? json['output_tokens'] : null,
      toolUsage: (() {
        final map = _sdkworkAsMap(json['tool_usage']);
        return map == null ? null : ArkVideoToolUsage.fromJson(map);
      })(),
      totalTokens: json['total_tokens'] is int ? json['total_tokens'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'generated_images': generatedImages,
      'input_images': inputImages,
      'output_tokens': outputTokens,
      'tool_usage': toolUsage?.toJson(),
      'total_tokens': totalTokens,
    };
  }
}

class ArkVideoSource {
  final String url;

  ArkVideoSource({
    required this.url
  });

  factory ArkVideoSource.fromJson(Map<String, dynamic> json) {
    return ArkVideoSource(
      url: (() {
        final value = json['url']?.toString();
        if (value == null) {
          throw FormatException('ArkVideoSource.url is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'url': url,
    };
  }
}

class ArkVideoTaskContent {
  final String? lastFrameUrl;
  final String? videoUrl;

  ArkVideoTaskContent({
    this.lastFrameUrl,
    this.videoUrl
  });

  factory ArkVideoTaskContent.fromJson(Map<String, dynamic> json) {
    return ArkVideoTaskContent(
      lastFrameUrl: json['last_frame_url']?.toString(),
      videoUrl: json['video_url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'last_frame_url': lastFrameUrl,
      'video_url': videoUrl,
    };
  }
}

class ArkVideoToolUsage {
  final int? webSearch;

  ArkVideoToolUsage({
    this.webSearch
  });

  factory ArkVideoToolUsage.fromJson(Map<String, dynamic> json) {
    return ArkVideoToolUsage(
      webSearch: json['web_search'] is int ? json['web_search'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'web_search': webSearch,
    };
  }
}

class ArkVideoUsage {
  final int? completionTokens;
  final ArkVideoToolUsage? toolUsage;
  final int? totalTokens;

  ArkVideoUsage({
    this.completionTokens,
    this.toolUsage,
    this.totalTokens
  });

  factory ArkVideoUsage.fromJson(Map<String, dynamic> json) {
    return ArkVideoUsage(
      completionTokens: json['completion_tokens'] is int ? json['completion_tokens'] : null,
      toolUsage: (() {
        final map = _sdkworkAsMap(json['tool_usage']);
        return map == null ? null : ArkVideoToolUsage.fromJson(map);
      })(),
      totalTokens: json['total_tokens'] is int ? json['total_tokens'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'completion_tokens': completionTokens,
      'tool_usage': toolUsage?.toJson(),
      'total_tokens': totalTokens,
    };
  }
}

class ArkWebSearchTool {
  final String type;

  ArkWebSearchTool({
    required this.type
  });

  factory ArkWebSearchTool.fromJson(Map<String, dynamic> json) {
    return ArkWebSearchTool(
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('ArkWebSearchTool.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'type': type,
    };
  }
}

class BlackForestLabsImageGenerationRequest {
  final String? aspectRatio;
  final bool? autoCrop;
  final int? bottom;
  final int? dilatePixels;
  final bool? disablePup;
  final String? finetuneId;
  final double? finetuneStrength;
  final String? garment;
  final bool? grounding;
  final double? guidance;
  final int? height;
  final String? image;
  final String? imagePrompt;
  final double? imagePromptStrength;
  final dynamic images;
  final String? inputImage;
  final String? inputImage2;
  final String? inputImage3;
  final String? inputImage4;
  final String? inputImage5;
  final String? inputImage6;
  final String? inputImage7;
  final String? inputImage8;
  final String? inputImageBlobPath;
  final int? left;
  final String? mask;
  final String? mode;
  final String? outputFormat;
  final String? person;
  final String prompt;
  final bool? promptUpsampling;
  final bool? raw;
  final int? referenceOffsetX;
  final int? referenceOffsetY;
  final String? resolution;
  final int? right;
  final int? safetyTolerance;
  final int? seed;
  final int? steps;
  final int? top;
  final String? user;
  final String? version;
  final String? webhookSecret;
  final String? webhookUrl;
  final int? width;

  BlackForestLabsImageGenerationRequest({
    this.aspectRatio,
    this.autoCrop,
    this.bottom,
    this.dilatePixels,
    this.disablePup,
    this.finetuneId,
    this.finetuneStrength,
    this.garment,
    this.grounding,
    this.guidance,
    this.height,
    this.image,
    this.imagePrompt,
    this.imagePromptStrength,
    this.images,
    this.inputImage,
    this.inputImage2,
    this.inputImage3,
    this.inputImage4,
    this.inputImage5,
    this.inputImage6,
    this.inputImage7,
    this.inputImage8,
    this.inputImageBlobPath,
    this.left,
    this.mask,
    this.mode,
    this.outputFormat,
    this.person,
    required this.prompt,
    this.promptUpsampling,
    this.raw,
    this.referenceOffsetX,
    this.referenceOffsetY,
    this.resolution,
    this.right,
    this.safetyTolerance,
    this.seed,
    this.steps,
    this.top,
    this.user,
    this.version,
    this.webhookSecret,
    this.webhookUrl,
    this.width
  });

  factory BlackForestLabsImageGenerationRequest.fromJson(Map<String, dynamic> json) {
    return BlackForestLabsImageGenerationRequest(
      aspectRatio: json['aspect_ratio']?.toString(),
      autoCrop: json['auto_crop'] is bool ? json['auto_crop'] : null,
      bottom: json['bottom'] is int ? json['bottom'] : null,
      dilatePixels: json['dilate_pixels'] is int ? json['dilate_pixels'] : null,
      disablePup: json['disable_pup'] is bool ? json['disable_pup'] : null,
      finetuneId: json['finetune_id']?.toString(),
      finetuneStrength: json['finetune_strength'] is num ? json['finetune_strength'].toDouble() : null,
      garment: json['garment']?.toString(),
      grounding: json['grounding'] is bool ? json['grounding'] : null,
      guidance: json['guidance'] is num ? json['guidance'].toDouble() : null,
      height: json['height'] is int ? json['height'] : null,
      image: json['image']?.toString(),
      imagePrompt: json['image_prompt']?.toString(),
      imagePromptStrength: json['image_prompt_strength'] is num ? json['image_prompt_strength'].toDouble() : null,
      images: json['images']?.toString(),
      inputImage: json['input_image']?.toString(),
      inputImage2: json['input_image_2']?.toString(),
      inputImage3: json['input_image_3']?.toString(),
      inputImage4: json['input_image_4']?.toString(),
      inputImage5: json['input_image_5']?.toString(),
      inputImage6: json['input_image_6']?.toString(),
      inputImage7: json['input_image_7']?.toString(),
      inputImage8: json['input_image_8']?.toString(),
      inputImageBlobPath: json['input_image_blob_path']?.toString(),
      left: json['left'] is int ? json['left'] : null,
      mask: json['mask']?.toString(),
      mode: json['mode']?.toString(),
      outputFormat: json['output_format']?.toString(),
      person: json['person']?.toString(),
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('BlackForestLabsImageGenerationRequest.prompt is required');
        }
        return value;
      })(),
      promptUpsampling: json['prompt_upsampling'] is bool ? json['prompt_upsampling'] : null,
      raw: json['raw'] is bool ? json['raw'] : null,
      referenceOffsetX: json['reference_offset_x'] is int ? json['reference_offset_x'] : null,
      referenceOffsetY: json['reference_offset_y'] is int ? json['reference_offset_y'] : null,
      resolution: json['resolution']?.toString(),
      right: json['right'] is int ? json['right'] : null,
      safetyTolerance: json['safety_tolerance'] is int ? json['safety_tolerance'] : null,
      seed: json['seed'] is int ? json['seed'] : null,
      steps: json['steps'] is int ? json['steps'] : null,
      top: json['top'] is int ? json['top'] : null,
      user: json['user']?.toString(),
      version: json['version']?.toString(),
      webhookSecret: json['webhook_secret']?.toString(),
      webhookUrl: json['webhook_url']?.toString(),
      width: json['width'] is int ? json['width'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'auto_crop': autoCrop,
      'bottom': bottom,
      'dilate_pixels': dilatePixels,
      'disable_pup': disablePup,
      'finetune_id': finetuneId,
      'finetune_strength': finetuneStrength,
      'garment': garment,
      'grounding': grounding,
      'guidance': guidance,
      'height': height,
      'image': image,
      'image_prompt': imagePrompt,
      'image_prompt_strength': imagePromptStrength,
      'images': images,
      'input_image': inputImage,
      'input_image_2': inputImage2,
      'input_image_3': inputImage3,
      'input_image_4': inputImage4,
      'input_image_5': inputImage5,
      'input_image_6': inputImage6,
      'input_image_7': inputImage7,
      'input_image_8': inputImage8,
      'input_image_blob_path': inputImageBlobPath,
      'left': left,
      'mask': mask,
      'mode': mode,
      'output_format': outputFormat,
      'person': person,
      'prompt': prompt,
      'prompt_upsampling': promptUpsampling,
      'raw': raw,
      'reference_offset_x': referenceOffsetX,
      'reference_offset_y': referenceOffsetY,
      'resolution': resolution,
      'right': right,
      'safety_tolerance': safetyTolerance,
      'seed': seed,
      'steps': steps,
      'top': top,
      'user': user,
      'version': version,
      'webhook_secret': webhookSecret,
      'webhook_url': webhookUrl,
      'width': width,
    };
  }
}

class BlackForestLabsImageGenerationTask {
  final Map<String, dynamic>? details;
  final String? id;
  final String? pollingUrl;
  final double? progress;
  final Map<String, dynamic>? result;
  final String? status;

  BlackForestLabsImageGenerationTask({
    this.details,
    this.id,
    this.pollingUrl,
    this.progress,
    this.result,
    this.status
  });

  factory BlackForestLabsImageGenerationTask.fromJson(Map<String, dynamic> json) {
    return BlackForestLabsImageGenerationTask(
      details: (() {
        final map = _sdkworkAsMap(json['details']);
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
      id: json['id']?.toString(),
      pollingUrl: json['polling_url']?.toString(),
      progress: json['progress'] is num ? json['progress'].toDouble() : null,
      result: (() {
        final map = _sdkworkAsMap(json['result']);
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
      status: json['status']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'details': details?.map((key, item) => MapEntry(key, item)),
      'id': id,
      'polling_url': pollingUrl,
      'progress': progress,
      'result': result?.map((key, item) => MapEntry(key, item)),
      'status': status,
    };
  }
}

class BlackForestLabsVideoGenerationRequest {
  final String? aspectRatio;
  final bool? draft;
  final String? draftCache;
  final int? duration;
  final bool? generateAudio;
  final dynamic keyframes;
  final String mode;
  final String? prompt;
  final String? resolution;
  final int? safetyTolerance;
  final String? startVideo;
  final String? user;
  final String? version;

  BlackForestLabsVideoGenerationRequest({
    this.aspectRatio,
    this.draft,
    this.draftCache,
    this.duration,
    this.generateAudio,
    this.keyframes,
    required this.mode,
    this.prompt,
    this.resolution,
    this.safetyTolerance,
    this.startVideo,
    this.user,
    this.version
  });

  factory BlackForestLabsVideoGenerationRequest.fromJson(Map<String, dynamic> json) {
    return BlackForestLabsVideoGenerationRequest(
      aspectRatio: json['aspect_ratio']?.toString(),
      draft: json['draft'] is bool ? json['draft'] : null,
      draftCache: json['draft_cache']?.toString(),
      duration: json['duration'] is int ? json['duration'] : null,
      generateAudio: json['generate_audio'] is bool ? json['generate_audio'] : null,
      keyframes: json['keyframes']?.toString(),
      mode: (() {
        final value = json['mode']?.toString();
        if (value == null) {
          throw FormatException('BlackForestLabsVideoGenerationRequest.mode is required');
        }
        return value;
      })(),
      prompt: json['prompt']?.toString(),
      resolution: json['resolution']?.toString(),
      safetyTolerance: json['safety_tolerance'] is int ? json['safety_tolerance'] : null,
      startVideo: json['start_video']?.toString(),
      user: json['user']?.toString(),
      version: json['version']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'draft': draft,
      'draft_cache': draftCache,
      'duration': duration,
      'generate_audio': generateAudio,
      'keyframes': keyframes,
      'mode': mode,
      'prompt': prompt,
      'resolution': resolution,
      'safety_tolerance': safetyTolerance,
      'start_video': startVideo,
      'user': user,
      'version': version,
    };
  }
}

class BlackForestLabsVideoGenerationTask {
  final Map<String, dynamic>? details;
  final String? id;
  final String? pollingUrl;
  final double? progress;
  final Map<String, dynamic>? result;
  final String? status;

  BlackForestLabsVideoGenerationTask({
    this.details,
    this.id,
    this.pollingUrl,
    this.progress,
    this.result,
    this.status
  });

  factory BlackForestLabsVideoGenerationTask.fromJson(Map<String, dynamic> json) {
    return BlackForestLabsVideoGenerationTask(
      details: (() {
        final map = _sdkworkAsMap(json['details']);
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
      id: json['id']?.toString(),
      pollingUrl: json['polling_url']?.toString(),
      progress: json['progress'] is num ? json['progress'].toDouble() : null,
      result: (() {
        final map = _sdkworkAsMap(json['result']);
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
      status: json['status']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'details': details?.map((key, item) => MapEntry(key, item)),
      'id': id,
      'polling_url': pollingUrl,
      'progress': progress,
      'result': result?.map((key, item) => MapEntry(key, item)),
      'status': status,
    };
  }
}

class BytedanceImageGenerationRequest {
  final String? background;
  final dynamic image;
  final bool? layerDecomposition;
  final String model;
  final Map<String, dynamic>? optimizePromptOptions;
  final String? outputFormat;
  final String? prompt;
  final String? responseFormat;
  final String? sequentialImageGeneration;
  final Map<String, dynamic>? sequentialImageGenerationOptions;
  final String? size;
  final bool? stream;
  final List<ArkWebSearchTool>? tools;
  final bool? watermark;

  BytedanceImageGenerationRequest({
    this.background,
    this.image,
    this.layerDecomposition,
    required this.model,
    this.optimizePromptOptions,
    this.outputFormat,
    this.prompt,
    this.responseFormat,
    this.sequentialImageGeneration,
    this.sequentialImageGenerationOptions,
    this.size,
    this.stream,
    this.tools,
    this.watermark
  });

  factory BytedanceImageGenerationRequest.fromJson(Map<String, dynamic> json) {
    return BytedanceImageGenerationRequest(
      background: json['background']?.toString(),
      image: json['image']?.toString(),
      layerDecomposition: json['layer_decomposition'] is bool ? json['layer_decomposition'] : null,
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('BytedanceImageGenerationRequest.model is required');
        }
        return value;
      })(),
      optimizePromptOptions: (() {
        final map = _sdkworkAsMap(json['optimize_prompt_options']);
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
      outputFormat: json['output_format']?.toString(),
      prompt: json['prompt']?.toString(),
      responseFormat: json['response_format']?.toString(),
      sequentialImageGeneration: json['sequential_image_generation']?.toString(),
      sequentialImageGenerationOptions: (() {
        final map = _sdkworkAsMap(json['sequential_image_generation_options']);
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
      size: json['size']?.toString(),
      stream: json['stream'] is bool ? json['stream'] : null,
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ArkWebSearchTool.fromJson(map);
      })())
            .whereType<ArkWebSearchTool>()
            .toList();
      })(),
      watermark: json['watermark'] is bool ? json['watermark'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'background': background,
      'image': image,
      'layer_decomposition': layerDecomposition,
      'model': model,
      'optimize_prompt_options': optimizePromptOptions?.map((key, item) => MapEntry(key, item)),
      'output_format': outputFormat,
      'prompt': prompt,
      'response_format': responseFormat,
      'sequential_image_generation': sequentialImageGeneration,
      'sequential_image_generation_options': sequentialImageGenerationOptions?.map((key, item) => MapEntry(key, item)),
      'size': size,
      'stream': stream,
      'tools': tools?.map((item) => item.toJson()).toList(),
      'watermark': watermark,
    };
  }
}

class BytedanceImageGenerationResponse {
  final int? created;
  final List<ArkImageGenerationData>? data;
  final ProviderTaskError? error;
  final String? model;
  final List<ArkWebSearchTool>? tools;
  final ArkImageUsage? usage;

  BytedanceImageGenerationResponse({
    this.created,
    this.data,
    this.error,
    this.model,
    this.tools,
    this.usage
  });

  factory BytedanceImageGenerationResponse.fromJson(Map<String, dynamic> json) {
    return BytedanceImageGenerationResponse(
      created: json['created'] is int ? json['created'] : null,
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ArkImageGenerationData.fromJson(map);
      })())
            .whereType<ArkImageGenerationData>()
            .toList();
      })(),
      error: (() {
        final map = _sdkworkAsMap(json['error']);
        return map == null ? null : ProviderTaskError.fromJson(map);
      })(),
      model: json['model']?.toString(),
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ArkWebSearchTool.fromJson(map);
      })())
            .whereType<ArkWebSearchTool>()
            .toList();
      })(),
      usage: (() {
        final map = _sdkworkAsMap(json['usage']);
        return map == null ? null : ArkImageUsage.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created': created,
      'data': data?.map((item) => item.toJson()).toList(),
      'error': error?.toJson(),
      'model': model,
      'tools': tools?.map((item) => item.toJson()).toList(),
      'usage': usage?.toJson(),
    };
  }
}

class BytedanceSpeechChunk {
  final int? code;
  final String? data;
  final String? message;
  final int? sequence;

  BytedanceSpeechChunk({
    this.code,
    this.data,
    this.message,
    this.sequence
  });

  factory BytedanceSpeechChunk.fromJson(Map<String, dynamic> json) {
    return BytedanceSpeechChunk(
      code: json['code'] is int ? json['code'] : null,
      data: json['data']?.toString(),
      message: json['message']?.toString(),
      sequence: json['sequence'] is int ? json['sequence'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'message': message,
      'sequence': sequence,
    };
  }
}

class BytedanceSpeechRequest {
  final BytedanceTtsRequestParams reqParams;

  BytedanceSpeechRequest({
    required this.reqParams
  });

  factory BytedanceSpeechRequest.fromJson(Map<String, dynamic> json) {
    return BytedanceSpeechRequest(
      reqParams: (() {
        final map = _sdkworkAsMap(json['req_params']);
        if (map == null) {
          throw FormatException('BytedanceSpeechRequest.req_params is required');
        }
        return BytedanceTtsRequestParams.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'req_params': reqParams.toJson(),
    };
  }
}

class BytedanceTtsAudioParams {
  final String format;
  final int? loudnessRate;
  final int sampleRate;
  final int? speechRate;

  BytedanceTtsAudioParams({
    required this.format,
    this.loudnessRate,
    required this.sampleRate,
    this.speechRate
  });

  factory BytedanceTtsAudioParams.fromJson(Map<String, dynamic> json) {
    return BytedanceTtsAudioParams(
      format: (() {
        final value = json['format']?.toString();
        if (value == null) {
          throw FormatException('BytedanceTtsAudioParams.format is required');
        }
        return value;
      })(),
      loudnessRate: json['loudness_rate'] is int ? json['loudness_rate'] : null,
      sampleRate: (() {
        final value = json['sample_rate'];
        if (value is! int) {
          throw FormatException('BytedanceTtsAudioParams.sample_rate is required');
        }
        return value;
      })(),
      speechRate: json['speech_rate'] is int ? json['speech_rate'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'format': format,
      'loudness_rate': loudnessRate,
      'sample_rate': sampleRate,
      'speech_rate': speechRate,
    };
  }
}

class BytedanceTtsRequestParams {
  final String? additions;
  final BytedanceTtsAudioParams audioParams;
  final String? model;
  final Map<String, dynamic>? pronunciationDict;
  final String speaker;
  final String? ssml;
  final String text;
  final List<String>? tone;

  BytedanceTtsRequestParams({
    this.additions,
    required this.audioParams,
    this.model,
    this.pronunciationDict,
    required this.speaker,
    this.ssml,
    required this.text,
    this.tone
  });

  factory BytedanceTtsRequestParams.fromJson(Map<String, dynamic> json) {
    return BytedanceTtsRequestParams(
      additions: json['additions']?.toString(),
      audioParams: (() {
        final map = _sdkworkAsMap(json['audio_params']);
        if (map == null) {
          throw FormatException('BytedanceTtsRequestParams.audio_params is required');
        }
        return BytedanceTtsAudioParams.fromJson(map);
      })(),
      model: json['model']?.toString(),
      pronunciationDict: (() {
        final map = _sdkworkAsMap(json['pronunciation_dict']);
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
      speaker: (() {
        final value = json['speaker']?.toString();
        if (value == null) {
          throw FormatException('BytedanceTtsRequestParams.speaker is required');
        }
        return value;
      })(),
      ssml: json['ssml']?.toString(),
      text: (() {
        final value = json['text']?.toString();
        if (value == null) {
          throw FormatException('BytedanceTtsRequestParams.text is required');
        }
        return value;
      })(),
      tone: (() {
        final list = _sdkworkAsList(json['tone']);
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
      'additions': additions,
      'audio_params': audioParams.toJson(),
      'model': model,
      'pronunciation_dict': pronunciationDict?.map((key, item) => MapEntry(key, item)),
      'speaker': speaker,
      'ssml': ssml,
      'text': text,
      'tone': tone?.map((item) => item).toList(),
    };
  }
}

class BytedanceVideoGenerationRequest {
  final String? callbackUrl;
  final bool? cameraFixed;
  final List<ArkContentPart> content;
  final bool? draft;
  final int? duration;
  final int? executionExpiresAfter;
  final int? frames;
  final bool? generateAudio;
  final String model;
  final String? omniReferenceTaskType;
  final String? outputFormat;
  final int? priority;
  final String? ratio;
  final String? resolution;
  final bool? returnLastFrame;
  final String? safetyIdentifier;
  final int? seed;
  final String? serviceTier;
  final List<ArkWebSearchTool>? tools;
  final bool? watermark;

  BytedanceVideoGenerationRequest({
    this.callbackUrl,
    this.cameraFixed,
    required this.content,
    this.draft,
    this.duration,
    this.executionExpiresAfter,
    this.frames,
    this.generateAudio,
    required this.model,
    this.omniReferenceTaskType,
    this.outputFormat,
    this.priority,
    this.ratio,
    this.resolution,
    this.returnLastFrame,
    this.safetyIdentifier,
    this.seed,
    this.serviceTier,
    this.tools,
    this.watermark
  });

  factory BytedanceVideoGenerationRequest.fromJson(Map<String, dynamic> json) {
    return BytedanceVideoGenerationRequest(
      callbackUrl: json['callback_url']?.toString(),
      cameraFixed: json['camera_fixed'] is bool ? json['camera_fixed'] : null,
      content: (() {
        final list = _sdkworkAsList(json['content']);
        if (list == null) {
          throw FormatException('BytedanceVideoGenerationRequest.content is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ArkContentPart.fromJson(map);
      })())
            .whereType<ArkContentPart>()
            .toList();
      })(),
      draft: json['draft'] is bool ? json['draft'] : null,
      duration: json['duration'] is int ? json['duration'] : null,
      executionExpiresAfter: json['execution_expires_after'] is int ? json['execution_expires_after'] : null,
      frames: json['frames'] is int ? json['frames'] : null,
      generateAudio: json['generate_audio'] is bool ? json['generate_audio'] : null,
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('BytedanceVideoGenerationRequest.model is required');
        }
        return value;
      })(),
      omniReferenceTaskType: json['omni_reference_task_type']?.toString(),
      outputFormat: json['output_format']?.toString(),
      priority: json['priority'] is int ? json['priority'] : null,
      ratio: json['ratio']?.toString(),
      resolution: json['resolution']?.toString(),
      returnLastFrame: json['return_last_frame'] is bool ? json['return_last_frame'] : null,
      safetyIdentifier: json['safety_identifier']?.toString(),
      seed: json['seed'] is int ? json['seed'] : null,
      serviceTier: json['service_tier']?.toString(),
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ArkWebSearchTool.fromJson(map);
      })())
            .whereType<ArkWebSearchTool>()
            .toList();
      })(),
      watermark: json['watermark'] is bool ? json['watermark'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'callback_url': callbackUrl,
      'camera_fixed': cameraFixed,
      'content': content.map((item) => item.toJson()).toList(),
      'draft': draft,
      'duration': duration,
      'execution_expires_after': executionExpiresAfter,
      'frames': frames,
      'generate_audio': generateAudio,
      'model': model,
      'omni_reference_task_type': omniReferenceTaskType,
      'output_format': outputFormat,
      'priority': priority,
      'ratio': ratio,
      'resolution': resolution,
      'return_last_frame': returnLastFrame,
      'safety_identifier': safetyIdentifier,
      'seed': seed,
      'service_tier': serviceTier,
      'tools': tools?.map((item) => item.toJson()).toList(),
      'watermark': watermark,
    };
  }
}

class BytedanceVideoGenerationTask {
  final ArkVideoTaskContent? content;
  final int? createdAt;
  final bool? draft;
  final int? duration;
  final ProviderTaskError? error;
  final int? executionExpiresAfter;
  final int? frames;
  final int? framespersecond;
  final bool? generateAudio;
  final String? id;
  final String? model;
  final String? outputFormat;
  final int? priority;
  final String? ratio;
  final String? resolution;
  final String? safetyIdentifier;
  final int? seed;
  final String? serviceTier;
  final String? status;
  final List<ArkWebSearchTool>? tools;
  final int? updatedAt;
  final ArkVideoUsage? usage;

  BytedanceVideoGenerationTask({
    this.content,
    this.createdAt,
    this.draft,
    this.duration,
    this.error,
    this.executionExpiresAfter,
    this.frames,
    this.framespersecond,
    this.generateAudio,
    this.id,
    this.model,
    this.outputFormat,
    this.priority,
    this.ratio,
    this.resolution,
    this.safetyIdentifier,
    this.seed,
    this.serviceTier,
    this.status,
    this.tools,
    this.updatedAt,
    this.usage
  });

  factory BytedanceVideoGenerationTask.fromJson(Map<String, dynamic> json) {
    return BytedanceVideoGenerationTask(
      content: (() {
        final map = _sdkworkAsMap(json['content']);
        return map == null ? null : ArkVideoTaskContent.fromJson(map);
      })(),
      createdAt: json['created_at'] is int ? json['created_at'] : null,
      draft: json['draft'] is bool ? json['draft'] : null,
      duration: json['duration'] is int ? json['duration'] : null,
      error: (() {
        final map = _sdkworkAsMap(json['error']);
        return map == null ? null : ProviderTaskError.fromJson(map);
      })(),
      executionExpiresAfter: json['execution_expires_after'] is int ? json['execution_expires_after'] : null,
      frames: json['frames'] is int ? json['frames'] : null,
      framespersecond: json['framespersecond'] is int ? json['framespersecond'] : null,
      generateAudio: json['generate_audio'] is bool ? json['generate_audio'] : null,
      id: json['id']?.toString(),
      model: json['model']?.toString(),
      outputFormat: json['output_format']?.toString(),
      priority: json['priority'] is int ? json['priority'] : null,
      ratio: json['ratio']?.toString(),
      resolution: json['resolution']?.toString(),
      safetyIdentifier: json['safety_identifier']?.toString(),
      seed: json['seed'] is int ? json['seed'] : null,
      serviceTier: json['service_tier']?.toString(),
      status: json['status']?.toString(),
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ArkWebSearchTool.fromJson(map);
      })())
            .whereType<ArkWebSearchTool>()
            .toList();
      })(),
      updatedAt: json['updated_at'] is int ? json['updated_at'] : null,
      usage: (() {
        final map = _sdkworkAsMap(json['usage']);
        return map == null ? null : ArkVideoUsage.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'content': content?.toJson(),
      'created_at': createdAt,
      'draft': draft,
      'duration': duration,
      'error': error?.toJson(),
      'execution_expires_after': executionExpiresAfter,
      'frames': frames,
      'framespersecond': framespersecond,
      'generate_audio': generateAudio,
      'id': id,
      'model': model,
      'output_format': outputFormat,
      'priority': priority,
      'ratio': ratio,
      'resolution': resolution,
      'safety_identifier': safetyIdentifier,
      'seed': seed,
      'service_tier': serviceTier,
      'status': status,
      'tools': tools?.map((item) => item.toJson()).toList(),
      'updated_at': updatedAt,
      'usage': usage?.toJson(),
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

class ElevenLabsAudioEffects {
  final String? backgroundNoiseId;
  final double? distance;
  final String? environmentId;
  final String? filterPresetId;
  final double? pan;
  final double? sendLevel;

  ElevenLabsAudioEffects({
    this.backgroundNoiseId,
    this.distance,
    this.environmentId,
    this.filterPresetId,
    this.pan,
    this.sendLevel
  });

  factory ElevenLabsAudioEffects.fromJson(Map<String, dynamic> json) {
    return ElevenLabsAudioEffects(
      backgroundNoiseId: json['background_noise_id']?.toString(),
      distance: json['distance'] is num ? json['distance'].toDouble() : null,
      environmentId: json['environment_id']?.toString(),
      filterPresetId: json['filter_preset_id']?.toString(),
      pan: json['pan'] is num ? json['pan'].toDouble() : null,
      sendLevel: json['send_level'] is num ? json['send_level'].toDouble() : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'background_noise_id': backgroundNoiseId,
      'distance': distance,
      'environment_id': environmentId,
      'filter_preset_id': filterPresetId,
      'pan': pan,
      'send_level': sendLevel,
    };
  }
}

class ElevenLabsCompositionPlan {
  final List<Map<String, dynamic>> chunks;

  ElevenLabsCompositionPlan({
    required this.chunks
  });

  factory ElevenLabsCompositionPlan.fromJson(Map<String, dynamic> json) {
    return ElevenLabsCompositionPlan(
      chunks: (() {
        final list = _sdkworkAsList(json['chunks']);
        if (list == null) {
          throw FormatException('ElevenLabsCompositionPlan.chunks is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
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
      'chunks': chunks.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
    };
  }
}

class ElevenLabsMusicGenerationRequest {
  final dynamic compositionPlan;
  final String? finetuneId;
  final double? finetuneStrength;
  final bool? forceInstrumental;
  final String? generationMode;
  final String? lyricsText;
  final String? modelId;
  final int? musicLengthMs;
  final ElevenLabsMusicPrompt? musicPrompt;
  final String? prompt;
  final bool? respectSectionsDurations;
  final int? seed;
  final bool? signWithC2pa;
  final bool? storeForInpainting;
  final bool? usePhoneticNames;

  ElevenLabsMusicGenerationRequest({
    this.compositionPlan,
    this.finetuneId,
    this.finetuneStrength,
    this.forceInstrumental,
    this.generationMode,
    this.lyricsText,
    this.modelId,
    this.musicLengthMs,
    this.musicPrompt,
    this.prompt,
    this.respectSectionsDurations,
    this.seed,
    this.signWithC2pa,
    this.storeForInpainting,
    this.usePhoneticNames
  });

  factory ElevenLabsMusicGenerationRequest.fromJson(Map<String, dynamic> json) {
    return ElevenLabsMusicGenerationRequest(
      compositionPlan: (() {
        final map = _sdkworkAsMap(json['composition_plan']);
        return map == null ? null : ElevenLabsMusicPrompt.fromJson(map);
      })(),
      finetuneId: json['finetune_id']?.toString(),
      finetuneStrength: json['finetune_strength'] is num ? json['finetune_strength'].toDouble() : null,
      forceInstrumental: json['force_instrumental'] is bool ? json['force_instrumental'] : null,
      generationMode: json['generation_mode']?.toString(),
      lyricsText: json['lyrics_text']?.toString(),
      modelId: json['model_id']?.toString(),
      musicLengthMs: json['music_length_ms'] is int ? json['music_length_ms'] : null,
      musicPrompt: (() {
        final map = _sdkworkAsMap(json['music_prompt']);
        return map == null ? null : ElevenLabsMusicPrompt.fromJson(map);
      })(),
      prompt: json['prompt']?.toString(),
      respectSectionsDurations: json['respect_sections_durations'] is bool ? json['respect_sections_durations'] : null,
      seed: json['seed'] is int ? json['seed'] : null,
      signWithC2pa: json['sign_with_c2pa'] is bool ? json['sign_with_c2pa'] : null,
      storeForInpainting: json['store_for_inpainting'] is bool ? json['store_for_inpainting'] : null,
      usePhoneticNames: json['use_phonetic_names'] is bool ? json['use_phonetic_names'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'composition_plan': compositionPlan?.toJson(),
      'finetune_id': finetuneId,
      'finetune_strength': finetuneStrength,
      'force_instrumental': forceInstrumental,
      'generation_mode': generationMode,
      'lyrics_text': lyricsText,
      'model_id': modelId,
      'music_length_ms': musicLengthMs,
      'music_prompt': musicPrompt?.toJson(),
      'prompt': prompt,
      'respect_sections_durations': respectSectionsDurations,
      'seed': seed,
      'sign_with_c2pa': signWithC2pa,
      'store_for_inpainting': storeForInpainting,
      'use_phonetic_names': usePhoneticNames,
    };
  }
}

class ElevenLabsMusicPrompt {
  final List<String> negativeGlobalStyles;
  final List<String> positiveGlobalStyles;
  final List<Map<String, dynamic>> sections;

  ElevenLabsMusicPrompt({
    required this.negativeGlobalStyles,
    required this.positiveGlobalStyles,
    required this.sections
  });

  factory ElevenLabsMusicPrompt.fromJson(Map<String, dynamic> json) {
    return ElevenLabsMusicPrompt(
      negativeGlobalStyles: (() {
        final list = _sdkworkAsList(json['negative_global_styles']);
        if (list == null) {
          throw FormatException('ElevenLabsMusicPrompt.negative_global_styles is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      positiveGlobalStyles: (() {
        final list = _sdkworkAsList(json['positive_global_styles']);
        if (list == null) {
          throw FormatException('ElevenLabsMusicPrompt.positive_global_styles is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      sections: (() {
        final list = _sdkworkAsList(json['sections']);
        if (list == null) {
          throw FormatException('ElevenLabsMusicPrompt.sections is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
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
      'negative_global_styles': negativeGlobalStyles.map((item) => item).toList(),
      'positive_global_styles': positiveGlobalStyles.map((item) => item).toList(),
      'sections': sections.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
    };
  }
}

class ElevenLabsPronunciationDictionaryLocator {
  final String pronunciationDictionaryId;
  final String? versionId;

  ElevenLabsPronunciationDictionaryLocator({
    required this.pronunciationDictionaryId,
    this.versionId
  });

  factory ElevenLabsPronunciationDictionaryLocator.fromJson(Map<String, dynamic> json) {
    return ElevenLabsPronunciationDictionaryLocator(
      pronunciationDictionaryId: (() {
        final value = json['pronunciation_dictionary_id']?.toString();
        if (value == null) {
          throw FormatException('ElevenLabsPronunciationDictionaryLocator.pronunciation_dictionary_id is required');
        }
        return value;
      })(),
      versionId: json['version_id']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'pronunciation_dictionary_id': pronunciationDictionaryId,
      'version_id': versionId,
    };
  }
}

class ElevenLabsSoundGenerationRequest {
  final double? durationSeconds;
  final bool? loop;
  final String? modelId;
  final double? promptInfluence;
  final String text;

  ElevenLabsSoundGenerationRequest({
    this.durationSeconds,
    this.loop,
    this.modelId,
    this.promptInfluence,
    required this.text
  });

  factory ElevenLabsSoundGenerationRequest.fromJson(Map<String, dynamic> json) {
    return ElevenLabsSoundGenerationRequest(
      durationSeconds: json['duration_seconds'] is num ? json['duration_seconds'].toDouble() : null,
      loop: json['loop'] is bool ? json['loop'] : null,
      modelId: json['model_id']?.toString(),
      promptInfluence: json['prompt_influence'] is num ? json['prompt_influence'].toDouble() : null,
      text: (() {
        final value = json['text']?.toString();
        if (value == null) {
          throw FormatException('ElevenLabsSoundGenerationRequest.text is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'duration_seconds': durationSeconds,
      'loop': loop,
      'model_id': modelId,
      'prompt_influence': promptInfluence,
      'text': text,
    };
  }
}

class ElevenLabsSoundGenerationResponse {
  final Map<String, dynamic>? audio;
  final String? audioUrl;
  final String? id;
  final String? status;
  final String? url;

  ElevenLabsSoundGenerationResponse({
    this.audio,
    this.audioUrl,
    this.id,
    this.status,
    this.url
  });

  factory ElevenLabsSoundGenerationResponse.fromJson(Map<String, dynamic> json) {
    return ElevenLabsSoundGenerationResponse(
      audio: _sdkworkAsMap(json['audio']),
      audioUrl: json['audio_url']?.toString(),
      id: json['id']?.toString(),
      status: json['status']?.toString(),
      url: json['url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'audio': audio,
      'audio_url': audioUrl,
      'id': id,
      'status': status,
      'url': url,
    };
  }
}

class ElevenLabsTextToSpeechRequest {
  final bool? applyLanguageTextNormalization;
  final String? applyTextNormalization;
  final ElevenLabsAudioEffects? audioEffects;
  final String? languageCode;
  final String? modelId;
  final List<String>? nextRequestIds;
  final String? nextText;
  final List<String>? previousRequestIds;
  final String? previousText;
  final List<ElevenLabsPronunciationDictionaryLocator>? pronunciationDictionaryLocators;
  final int? seed;
  final String text;
  final bool? usePvcAsIvc;
  final ElevenLabsVoiceSettings? voiceSettings;

  ElevenLabsTextToSpeechRequest({
    this.applyLanguageTextNormalization,
    this.applyTextNormalization,
    this.audioEffects,
    this.languageCode,
    this.modelId,
    this.nextRequestIds,
    this.nextText,
    this.previousRequestIds,
    this.previousText,
    this.pronunciationDictionaryLocators,
    this.seed,
    required this.text,
    this.usePvcAsIvc,
    this.voiceSettings
  });

  factory ElevenLabsTextToSpeechRequest.fromJson(Map<String, dynamic> json) {
    return ElevenLabsTextToSpeechRequest(
      applyLanguageTextNormalization: json['apply_language_text_normalization'] is bool ? json['apply_language_text_normalization'] : null,
      applyTextNormalization: json['apply_text_normalization']?.toString(),
      audioEffects: (() {
        final map = _sdkworkAsMap(json['audio_effects']);
        return map == null ? null : ElevenLabsAudioEffects.fromJson(map);
      })(),
      languageCode: json['language_code']?.toString(),
      modelId: json['model_id']?.toString(),
      nextRequestIds: (() {
        final list = _sdkworkAsList(json['next_request_ids']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      nextText: json['next_text']?.toString(),
      previousRequestIds: (() {
        final list = _sdkworkAsList(json['previous_request_ids']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      previousText: json['previous_text']?.toString(),
      pronunciationDictionaryLocators: (() {
        final list = _sdkworkAsList(json['pronunciation_dictionary_locators']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ElevenLabsPronunciationDictionaryLocator.fromJson(map);
      })())
            .whereType<ElevenLabsPronunciationDictionaryLocator>()
            .toList();
      })(),
      seed: json['seed'] is int ? json['seed'] : null,
      text: (() {
        final value = json['text']?.toString();
        if (value == null) {
          throw FormatException('ElevenLabsTextToSpeechRequest.text is required');
        }
        return value;
      })(),
      usePvcAsIvc: json['use_pvc_as_ivc'] is bool ? json['use_pvc_as_ivc'] : null,
      voiceSettings: (() {
        final map = _sdkworkAsMap(json['voice_settings']);
        return map == null ? null : ElevenLabsVoiceSettings.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'apply_language_text_normalization': applyLanguageTextNormalization,
      'apply_text_normalization': applyTextNormalization,
      'audio_effects': audioEffects?.toJson(),
      'language_code': languageCode,
      'model_id': modelId,
      'next_request_ids': nextRequestIds?.map((item) => item).toList(),
      'next_text': nextText,
      'previous_request_ids': previousRequestIds?.map((item) => item).toList(),
      'previous_text': previousText,
      'pronunciation_dictionary_locators': pronunciationDictionaryLocators?.map((item) => item.toJson()).toList(),
      'seed': seed,
      'text': text,
      'use_pvc_as_ivc': usePvcAsIvc,
      'voice_settings': voiceSettings?.toJson(),
    };
  }
}

class ElevenLabsTextToSpeechResponse {
  final String? audioUrl;
  final String? id;
  final String? status;
  final String? url;

  ElevenLabsTextToSpeechResponse({
    this.audioUrl,
    this.id,
    this.status,
    this.url
  });

  factory ElevenLabsTextToSpeechResponse.fromJson(Map<String, dynamic> json) {
    return ElevenLabsTextToSpeechResponse(
      audioUrl: json['audio_url']?.toString(),
      id: json['id']?.toString(),
      status: json['status']?.toString(),
      url: json['url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'audio_url': audioUrl,
      'id': id,
      'status': status,
      'url': url,
    };
  }
}

class ElevenLabsVoiceSettings {
  final double? cloneStrength;
  final double? similarityBoost;
  final double? speed;
  final double? stability;
  final double? style;
  final bool? useSpeakerBoost;

  ElevenLabsVoiceSettings({
    this.cloneStrength,
    this.similarityBoost,
    this.speed,
    this.stability,
    this.style,
    this.useSpeakerBoost
  });

  factory ElevenLabsVoiceSettings.fromJson(Map<String, dynamic> json) {
    return ElevenLabsVoiceSettings(
      cloneStrength: json['clone_strength'] is num ? json['clone_strength'].toDouble() : null,
      similarityBoost: json['similarity_boost'] is num ? json['similarity_boost'].toDouble() : null,
      speed: json['speed'] is num ? json['speed'].toDouble() : null,
      stability: json['stability'] is num ? json['stability'].toDouble() : null,
      style: json['style'] is num ? json['style'].toDouble() : null,
      useSpeakerBoost: json['use_speaker_boost'] is bool ? json['use_speaker_boost'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'clone_strength': cloneStrength,
      'similarity_boost': similarityBoost,
      'speed': speed,
      'stability': stability,
      'style': style,
      'use_speaker_boost': useSpeakerBoost,
    };
  }
}

class GeminiImageGenerationRequest {
  final List<Map<String, dynamic>> instances;
  final Map<String, dynamic>? parameters;

  GeminiImageGenerationRequest({
    required this.instances,
    this.parameters
  });

  factory GeminiImageGenerationRequest.fromJson(Map<String, dynamic> json) {
    return GeminiImageGenerationRequest(
      instances: (() {
        final list = _sdkworkAsList(json['instances']);
        if (list == null) {
          throw FormatException('GeminiImageGenerationRequest.instances is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })())
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      parameters: (() {
        final map = _sdkworkAsMap(json['parameters']);
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
      'instances': instances.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
      'parameters': parameters?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class GeminiImageGenerationResponse {
  final Map<String, dynamic>? error;
  final List<Map<String, dynamic>>? predictions;

  GeminiImageGenerationResponse({
    this.error,
    this.predictions
  });

  factory GeminiImageGenerationResponse.fromJson(Map<String, dynamic> json) {
    return GeminiImageGenerationResponse(
      error: (() {
        final map = _sdkworkAsMap(json['error']);
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
      predictions: (() {
        final list = _sdkworkAsList(json['predictions']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
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
      'error': error?.map((key, item) => MapEntry(key, item)),
      'predictions': predictions?.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
    };
  }
}

class GeminiVideoGenerationRequest {
  final List<Map<String, dynamic>> instances;
  final Map<String, dynamic>? parameters;

  GeminiVideoGenerationRequest({
    required this.instances,
    this.parameters
  });

  factory GeminiVideoGenerationRequest.fromJson(Map<String, dynamic> json) {
    return GeminiVideoGenerationRequest(
      instances: (() {
        final list = _sdkworkAsList(json['instances']);
        if (list == null) {
          throw FormatException('GeminiVideoGenerationRequest.instances is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })())
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      parameters: (() {
        final map = _sdkworkAsMap(json['parameters']);
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
      'instances': instances.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
      'parameters': parameters?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class GeminiVideoOperation {
  final bool? done;
  final Map<String, dynamic>? error;
  final String? name;
  final Map<String, dynamic>? response;

  GeminiVideoOperation({
    this.done,
    this.error,
    this.name,
    this.response
  });

  factory GeminiVideoOperation.fromJson(Map<String, dynamic> json) {
    return GeminiVideoOperation(
      done: json['done'] is bool ? json['done'] : null,
      error: (() {
        final map = _sdkworkAsMap(json['error']);
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
      response: (() {
        final map = _sdkworkAsMap(json['response']);
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
      'done': done,
      'error': error?.map((key, item) => MapEntry(key, item)),
      'name': name,
      'response': response?.map((key, item) => MapEntry(key, item)),
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
  final String model;
  final GoogleContent? systemInstruction;
  final GoogleToolConfig? toolConfig;
  final List<GoogleTool>? tools;
  final String? ttl;

  GoogleCachedContentCreateRequest({
    this.contents,
    this.displayName,
    this.expireTime,
    required this.model,
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
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('GoogleCachedContentCreateRequest.model is required');
        }
        return value;
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
  final Map<String, dynamic>? embedContentConfig;
  final String? model;
  final int? outputDimensionality;
  final String? taskType;
  final String? title;

  GoogleEmbedContentRequest({
    required this.content,
    this.embedContentConfig,
    this.model,
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
      embedContentConfig: (() {
        final map = _sdkworkAsMap(json['embedContentConfig']);
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
      outputDimensionality: json['outputDimensionality'] is int ? json['outputDimensionality'] : null,
      taskType: json['taskType']?.toString(),
      title: json['title']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'content': content.toJson(),
      'embedContentConfig': embedContentConfig?.map((key, item) => MapEntry(key, item)),
      'model': model,
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
  final String? continuationToken;
  final GoogleGenerationConfig? generationConfig;
  final Map<String, String>? labels;
  final String? model;
  final List<GoogleSafetySetting>? safetySettings;
  final String? serviceTier;
  final bool? store;
  final GoogleContent? systemInstruction;
  final GoogleToolConfig? toolConfig;
  final List<GoogleTool>? tools;

  GoogleGenerateContentRequest({
    this.cachedContent,
    required this.contents,
    this.continuationToken,
    this.generationConfig,
    this.labels,
    this.model,
    this.safetySettings,
    this.serviceTier,
    this.store,
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
      continuationToken: json['continuationToken']?.toString(),
      generationConfig: (() {
        final map = _sdkworkAsMap(json['generationConfig']);
        return map == null ? null : GoogleGenerationConfig.fromJson(map);
      })(),
      labels: (() {
        final map = _sdkworkAsMap(json['labels']);
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
      serviceTier: json['serviceTier']?.toString(),
      store: json['store'] is bool ? json['store'] : null,
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
      'continuationToken': continuationToken,
      'generationConfig': generationConfig?.toJson(),
      'labels': labels?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'safetySettings': safetySettings?.map((item) => item.toJson()).toList(),
      'serviceTier': serviceTier,
      'store': store,
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
  final Map<String, dynamic>? audioTranscriptionConfig;
  final int? candidateCount;
  final bool? enableAffectiveDialog;
  final bool? enableEnhancedCivicAnswers;
  final double? frequencyPenalty;
  final Map<String, dynamic>? imageConfig;
  final int? logprobs;
  final int? maxOutputTokens;
  final String? mediaResolution;
  final double? presencePenalty;
  final Map<String, dynamic>? responseFormat;
  final dynamic responseJsonSchema;
  final bool? responseLogprobs;
  final String? responseMimeType;
  final List<String>? responseModalities;
  final GoogleSchema? responseSchema;
  final int? seed;
  final Map<String, dynamic>? speechConfig;
  final List<String>? stopSequences;
  final double? temperature;
  final GoogleThinkingConfig? thinkingConfig;
  final int? topK;
  final double? topP;
  final Map<String, dynamic>? translationConfig;

  GoogleGenerationConfig({
    this.audioTranscriptionConfig,
    this.candidateCount,
    this.enableAffectiveDialog,
    this.enableEnhancedCivicAnswers,
    this.frequencyPenalty,
    this.imageConfig,
    this.logprobs,
    this.maxOutputTokens,
    this.mediaResolution,
    this.presencePenalty,
    this.responseFormat,
    this.responseJsonSchema,
    this.responseLogprobs,
    this.responseMimeType,
    this.responseModalities,
    this.responseSchema,
    this.seed,
    this.speechConfig,
    this.stopSequences,
    this.temperature,
    this.thinkingConfig,
    this.topK,
    this.topP,
    this.translationConfig
  });

  factory GoogleGenerationConfig.fromJson(Map<String, dynamic> json) {
    return GoogleGenerationConfig(
      audioTranscriptionConfig: (() {
        final map = _sdkworkAsMap(json['audioTranscriptionConfig']);
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
      candidateCount: json['candidateCount'] is int ? json['candidateCount'] : null,
      enableAffectiveDialog: json['enableAffectiveDialog'] is bool ? json['enableAffectiveDialog'] : null,
      enableEnhancedCivicAnswers: json['enableEnhancedCivicAnswers'] is bool ? json['enableEnhancedCivicAnswers'] : null,
      frequencyPenalty: json['frequencyPenalty'] is num ? json['frequencyPenalty'].toDouble() : null,
      imageConfig: (() {
        final map = _sdkworkAsMap(json['imageConfig']);
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
      logprobs: json['logprobs'] is int ? json['logprobs'] : null,
      maxOutputTokens: json['maxOutputTokens'] is int ? json['maxOutputTokens'] : null,
      mediaResolution: json['mediaResolution']?.toString(),
      presencePenalty: json['presencePenalty'] is num ? json['presencePenalty'].toDouble() : null,
      responseFormat: (() {
        final map = _sdkworkAsMap(json['responseFormat']);
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
      responseJsonSchema: json['responseJsonSchema']?.toString(),
      responseLogprobs: json['responseLogprobs'] is bool ? json['responseLogprobs'] : null,
      responseMimeType: json['responseMimeType']?.toString(),
      responseModalities: (() {
        final list = _sdkworkAsList(json['responseModalities']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      responseSchema: (() {
        final map = _sdkworkAsMap(json['responseSchema']);
        return map == null ? null : GoogleSchema.fromJson(map);
      })(),
      seed: json['seed'] is int ? json['seed'] : null,
      speechConfig: (() {
        final map = _sdkworkAsMap(json['speechConfig']);
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
      topP: json['topP'] is num ? json['topP'].toDouble() : null,
      translationConfig: (() {
        final map = _sdkworkAsMap(json['translationConfig']);
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
      'audioTranscriptionConfig': audioTranscriptionConfig?.map((key, item) => MapEntry(key, item)),
      'candidateCount': candidateCount,
      'enableAffectiveDialog': enableAffectiveDialog,
      'enableEnhancedCivicAnswers': enableEnhancedCivicAnswers,
      'frequencyPenalty': frequencyPenalty,
      'imageConfig': imageConfig?.map((key, item) => MapEntry(key, item)),
      'logprobs': logprobs,
      'maxOutputTokens': maxOutputTokens,
      'mediaResolution': mediaResolution,
      'presencePenalty': presencePenalty,
      'responseFormat': responseFormat?.map((key, item) => MapEntry(key, item)),
      'responseJsonSchema': responseJsonSchema,
      'responseLogprobs': responseLogprobs,
      'responseMimeType': responseMimeType,
      'responseModalities': responseModalities?.map((item) => item).toList(),
      'responseSchema': responseSchema?.toJson(),
      'seed': seed,
      'speechConfig': speechConfig?.map((key, item) => MapEntry(key, item)),
      'stopSequences': stopSequences?.map((item) => item).toList(),
      'temperature': temperature,
      'thinkingConfig': thinkingConfig?.toJson(),
      'topK': topK,
      'topP': topP,
      'translationConfig': translationConfig?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class GooglePart {
  final Map<String, dynamic>? audioTranscription;
  final GoogleCodeExecutionResult? codeExecutionResult;
  final GoogleExecutableCode? executableCode;
  final GoogleFileData? fileData;
  final GoogleFunctionCall? functionCall;
  final GoogleFunctionResponse? functionResponse;
  final GoogleBlob? inlineData;
  final String? mediaProcessing;
  final Map<String, dynamic>? mediaResolution;
  final Map<String, dynamic>? partMetadata;
  final Map<String, dynamic>? speechMetadata;
  final String? text;
  final bool? thought;
  final String? thoughtSignature;
  final Map<String, dynamic>? toolCall;
  final Map<String, dynamic>? toolResponse;
  final Map<String, dynamic>? videoMetadata;

  GooglePart({
    this.audioTranscription,
    this.codeExecutionResult,
    this.executableCode,
    this.fileData,
    this.functionCall,
    this.functionResponse,
    this.inlineData,
    this.mediaProcessing,
    this.mediaResolution,
    this.partMetadata,
    this.speechMetadata,
    this.text,
    this.thought,
    this.thoughtSignature,
    this.toolCall,
    this.toolResponse,
    this.videoMetadata
  });

  factory GooglePart.fromJson(Map<String, dynamic> json) {
    return GooglePart(
      audioTranscription: (() {
        final map = _sdkworkAsMap(json['audioTranscription']);
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
      mediaProcessing: json['mediaProcessing']?.toString(),
      mediaResolution: (() {
        final map = _sdkworkAsMap(json['mediaResolution']);
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
      partMetadata: (() {
        final map = _sdkworkAsMap(json['partMetadata']);
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
      speechMetadata: (() {
        final map = _sdkworkAsMap(json['speechMetadata']);
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
      text: json['text']?.toString(),
      thought: json['thought'] is bool ? json['thought'] : null,
      thoughtSignature: json['thoughtSignature']?.toString(),
      toolCall: (() {
        final map = _sdkworkAsMap(json['toolCall']);
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
      toolResponse: (() {
        final map = _sdkworkAsMap(json['toolResponse']);
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
      videoMetadata: (() {
        final map = _sdkworkAsMap(json['videoMetadata']);
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
      'audioTranscription': audioTranscription?.map((key, item) => MapEntry(key, item)),
      'codeExecutionResult': codeExecutionResult?.toJson(),
      'executableCode': executableCode?.toJson(),
      'fileData': fileData?.toJson(),
      'functionCall': functionCall?.toJson(),
      'functionResponse': functionResponse?.toJson(),
      'inlineData': inlineData?.toJson(),
      'mediaProcessing': mediaProcessing,
      'mediaResolution': mediaResolution?.map((key, item) => MapEntry(key, item)),
      'partMetadata': partMetadata?.map((key, item) => MapEntry(key, item)),
      'speechMetadata': speechMetadata?.map((key, item) => MapEntry(key, item)),
      'text': text,
      'thought': thought,
      'thoughtSignature': thoughtSignature,
      'toolCall': toolCall?.map((key, item) => MapEntry(key, item)),
      'toolResponse': toolResponse?.map((key, item) => MapEntry(key, item)),
      'videoMetadata': videoMetadata?.map((key, item) => MapEntry(key, item)),
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
  final Map<String, dynamic>? computerUse;
  final Map<String, dynamic>? fileSearch;
  final List<GoogleFunctionDeclaration>? functionDeclarations;
  final Map<String, dynamic>? googleMaps;
  final GoogleSearchTool? googleSearch;
  final Map<String, dynamic>? googleSearchRetrieval;
  final List<Map<String, dynamic>>? mcpServers;
  final GoogleUrlContextTool? urlContext;

  GoogleTool({
    this.codeExecution,
    this.computerUse,
    this.fileSearch,
    this.functionDeclarations,
    this.googleMaps,
    this.googleSearch,
    this.googleSearchRetrieval,
    this.mcpServers,
    this.urlContext
  });

  factory GoogleTool.fromJson(Map<String, dynamic> json) {
    return GoogleTool(
      codeExecution: (() {
        final map = _sdkworkAsMap(json['codeExecution']);
        return map == null ? null : GoogleCodeExecutionTool.fromJson(map);
      })(),
      computerUse: (() {
        final map = _sdkworkAsMap(json['computerUse']);
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
      fileSearch: (() {
        final map = _sdkworkAsMap(json['fileSearch']);
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
      googleMaps: (() {
        final map = _sdkworkAsMap(json['googleMaps']);
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
      googleSearch: (() {
        final map = _sdkworkAsMap(json['googleSearch']);
        return map == null ? null : GoogleSearchTool.fromJson(map);
      })(),
      googleSearchRetrieval: (() {
        final map = _sdkworkAsMap(json['googleSearchRetrieval']);
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
      mcpServers: (() {
        final list = _sdkworkAsList(json['mcpServers']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })())
            .whereType<Map<String, dynamic>>()
            .toList();
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
      'computerUse': computerUse?.map((key, item) => MapEntry(key, item)),
      'fileSearch': fileSearch?.map((key, item) => MapEntry(key, item)),
      'functionDeclarations': functionDeclarations?.map((item) => item.toJson()).toList(),
      'googleMaps': googleMaps?.map((key, item) => MapEntry(key, item)),
      'googleSearch': googleSearch?.toJson(),
      'googleSearchRetrieval': googleSearchRetrieval?.map((key, item) => MapEntry(key, item)),
      'mcpServers': mcpServers?.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
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

class JimengVideoGenerationRequest {
  final String? callbackUrl;
  final int? duration;
  final int? fps;
  final String? image;
  final String model;
  final String prompt;
  final String? ratio;
  final int? seed;

  JimengVideoGenerationRequest({
    this.callbackUrl,
    this.duration,
    this.fps,
    this.image,
    required this.model,
    required this.prompt,
    this.ratio,
    this.seed
  });

  factory JimengVideoGenerationRequest.fromJson(Map<String, dynamic> json) {
    return JimengVideoGenerationRequest(
      callbackUrl: json['callback_url']?.toString(),
      duration: json['duration'] is int ? json['duration'] : null,
      fps: json['fps'] is int ? json['fps'] : null,
      image: json['image']?.toString(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('JimengVideoGenerationRequest.model is required');
        }
        return value;
      })(),
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('JimengVideoGenerationRequest.prompt is required');
        }
        return value;
      })(),
      ratio: json['ratio']?.toString(),
      seed: json['seed'] is int ? json['seed'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'callback_url': callbackUrl,
      'duration': duration,
      'fps': fps,
      'image': image,
      'model': model,
      'prompt': prompt,
      'ratio': ratio,
      'seed': seed,
    };
  }
}

class JimengVideoGenerationTask {
  final int? createdAt;
  final Map<String, dynamic>? error;
  final String? id;
  final String? status;
  final String? taskId;
  final String? videoUrl;

  JimengVideoGenerationTask({
    this.createdAt,
    this.error,
    this.id,
    this.status,
    this.taskId,
    this.videoUrl
  });

  factory JimengVideoGenerationTask.fromJson(Map<String, dynamic> json) {
    return JimengVideoGenerationTask(
      createdAt: json['created_at'] is int ? json['created_at'] : null,
      error: (() {
        final map = _sdkworkAsMap(json['error']);
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
      id: json['id']?.toString(),
      status: json['status']?.toString(),
      taskId: json['task_id']?.toString(),
      videoUrl: json['video_url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created_at': createdAt,
      'error': error?.map((key, item) => MapEntry(key, item)),
      'id': id,
      'status': status,
      'task_id': taskId,
      'video_url': videoUrl,
    };
  }
}

class KlingAudioTask {
  final int? code;
  final Map<String, dynamic>? data;
  final String? message;
  final String? requestId;

  KlingAudioTask({
    this.code,
    this.data,
    this.message,
    this.requestId
  });

  factory KlingAudioTask.fromJson(Map<String, dynamic> json) {
    return KlingAudioTask(
      code: json['code'] is int ? json['code'] : null,
      data: (() {
        final map = _sdkworkAsMap(json['data']);
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
      message: json['message']?.toString(),
      requestId: json['request_id']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.map((key, item) => MapEntry(key, item)),
      'message': message,
      'request_id': requestId,
    };
  }
}

class KlingAvatarCreateRequest {
  final String? audioUrl;
  final String? callbackUrl;
  final String humanImage;
  final String? modelName;
  final String? prompt;
  final String? text;
  final String? voiceId;
  final String? voiceLanguage;
  final String? voiceMode;

  KlingAvatarCreateRequest({
    this.audioUrl,
    this.callbackUrl,
    required this.humanImage,
    this.modelName,
    this.prompt,
    this.text,
    this.voiceId,
    this.voiceLanguage,
    this.voiceMode
  });

  factory KlingAvatarCreateRequest.fromJson(Map<String, dynamic> json) {
    return KlingAvatarCreateRequest(
      audioUrl: json['audio_url']?.toString(),
      callbackUrl: json['callback_url']?.toString(),
      humanImage: (() {
        final value = json['human_image']?.toString();
        if (value == null) {
          throw FormatException('KlingAvatarCreateRequest.human_image is required');
        }
        return value;
      })(),
      modelName: json['model_name']?.toString(),
      prompt: json['prompt']?.toString(),
      text: json['text']?.toString(),
      voiceId: json['voice_id']?.toString(),
      voiceLanguage: json['voice_language']?.toString(),
      voiceMode: json['voice_mode']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'audio_url': audioUrl,
      'callback_url': callbackUrl,
      'human_image': humanImage,
      'model_name': modelName,
      'prompt': prompt,
      'text': text,
      'voice_id': voiceId,
      'voice_language': voiceLanguage,
      'voice_mode': voiceMode,
    };
  }
}

class KlingElementReference {
  final int elementId;

  KlingElementReference({
    required this.elementId
  });

  factory KlingElementReference.fromJson(Map<String, dynamic> json) {
    return KlingElementReference(
      elementId: (() {
        final value = json['element_id'];
        if (value is! int) {
          throw FormatException('KlingElementReference.element_id is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'element_id': elementId,
    };
  }
}

class KlingImageGenerationRequest {
  final String? aspectRatio;
  final String? callbackUrl;
  final List<KlingElementReference>? elementList;
  final String? externalTaskId;
  final double? humanFidelity;
  final String? image;
  final double? imageFidelity;
  final String? imageReference;
  final String? modelName;
  final int? n;
  final String? negativePrompt;
  final String prompt;
  final String? resolution;
  final KlingWatermarkInfo? watermarkInfo;

  KlingImageGenerationRequest({
    this.aspectRatio,
    this.callbackUrl,
    this.elementList,
    this.externalTaskId,
    this.humanFidelity,
    this.image,
    this.imageFidelity,
    this.imageReference,
    this.modelName,
    this.n,
    this.negativePrompt,
    required this.prompt,
    this.resolution,
    this.watermarkInfo
  });

  factory KlingImageGenerationRequest.fromJson(Map<String, dynamic> json) {
    return KlingImageGenerationRequest(
      aspectRatio: json['aspect_ratio']?.toString(),
      callbackUrl: json['callback_url']?.toString(),
      elementList: (() {
        final list = _sdkworkAsList(json['element_list']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : KlingElementReference.fromJson(map);
      })())
            .whereType<KlingElementReference>()
            .toList();
      })(),
      externalTaskId: json['external_task_id']?.toString(),
      humanFidelity: json['human_fidelity'] is num ? json['human_fidelity'].toDouble() : null,
      image: json['image']?.toString(),
      imageFidelity: json['image_fidelity'] is num ? json['image_fidelity'].toDouble() : null,
      imageReference: json['image_reference']?.toString(),
      modelName: json['model_name']?.toString(),
      n: json['n'] is int ? json['n'] : null,
      negativePrompt: json['negative_prompt']?.toString(),
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('KlingImageGenerationRequest.prompt is required');
        }
        return value;
      })(),
      resolution: json['resolution']?.toString(),
      watermarkInfo: (() {
        final map = _sdkworkAsMap(json['watermark_info']);
        return map == null ? null : KlingWatermarkInfo.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'callback_url': callbackUrl,
      'element_list': elementList?.map((item) => item.toJson()).toList(),
      'external_task_id': externalTaskId,
      'human_fidelity': humanFidelity,
      'image': image,
      'image_fidelity': imageFidelity,
      'image_reference': imageReference,
      'model_name': modelName,
      'n': n,
      'negative_prompt': negativePrompt,
      'prompt': prompt,
      'resolution': resolution,
      'watermark_info': watermarkInfo?.toJson(),
    };
  }
}

class KlingImageGenerationTask {
  final int? code;
  final KlingImageTaskData? data;
  final String? message;
  final String? requestId;

  KlingImageGenerationTask({
    this.code,
    this.data,
    this.message,
    this.requestId
  });

  factory KlingImageGenerationTask.fromJson(Map<String, dynamic> json) {
    return KlingImageGenerationTask(
      code: json['code'] is int ? json['code'] : null,
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : KlingImageTaskData.fromJson(map);
      })(),
      message: json['message']?.toString(),
      requestId: json['request_id']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data?.toJson(),
      'message': message,
      'request_id': requestId,
    };
  }
}

class KlingImageResult {
  final int? index;
  final String? url;

  KlingImageResult({
    this.index,
    this.url
  });

  factory KlingImageResult.fromJson(Map<String, dynamic> json) {
    return KlingImageResult(
      index: json['index'] is int ? json['index'] : null,
      url: json['url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'index': index,
      'url': url,
    };
  }
}

class KlingImageTaskData {
  final int? createdAt;
  final String? taskId;
  final Map<String, dynamic>? taskInfo;
  final KlingImageTaskResult? taskResult;
  final String? taskStatus;
  final String? taskStatusMsg;
  final int? updatedAt;

  KlingImageTaskData({
    this.createdAt,
    this.taskId,
    this.taskInfo,
    this.taskResult,
    this.taskStatus,
    this.taskStatusMsg,
    this.updatedAt
  });

  factory KlingImageTaskData.fromJson(Map<String, dynamic> json) {
    return KlingImageTaskData(
      createdAt: json['created_at'] is int ? json['created_at'] : null,
      taskId: json['task_id']?.toString(),
      taskInfo: (() {
        final map = _sdkworkAsMap(json['task_info']);
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
      taskResult: (() {
        final map = _sdkworkAsMap(json['task_result']);
        return map == null ? null : KlingImageTaskResult.fromJson(map);
      })(),
      taskStatus: json['task_status']?.toString(),
      taskStatusMsg: json['task_status_msg']?.toString(),
      updatedAt: json['updated_at'] is int ? json['updated_at'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created_at': createdAt,
      'task_id': taskId,
      'task_info': taskInfo?.map((key, item) => MapEntry(key, item)),
      'task_result': taskResult?.toJson(),
      'task_status': taskStatus,
      'task_status_msg': taskStatusMsg,
      'updated_at': updatedAt,
    };
  }
}

class KlingImageTaskResult {
  final List<KlingImageResult>? images;

  KlingImageTaskResult({
    this.images
  });

  factory KlingImageTaskResult.fromJson(Map<String, dynamic> json) {
    return KlingImageTaskResult(
      images: (() {
        final list = _sdkworkAsList(json['images']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : KlingImageResult.fromJson(map);
      })())
            .whereType<KlingImageResult>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'images': images?.map((item) => item.toJson()).toList(),
    };
  }
}

class KlingMotionControlRequest {
  final String? callbackUrl;
  final String image;
  final String? modelName;
  final String? prompt;
  final String video;

  KlingMotionControlRequest({
    this.callbackUrl,
    required this.image,
    this.modelName,
    this.prompt,
    required this.video
  });

  factory KlingMotionControlRequest.fromJson(Map<String, dynamic> json) {
    return KlingMotionControlRequest(
      callbackUrl: json['callback_url']?.toString(),
      image: (() {
        final value = json['image']?.toString();
        if (value == null) {
          throw FormatException('KlingMotionControlRequest.image is required');
        }
        return value;
      })(),
      modelName: json['model_name']?.toString(),
      prompt: json['prompt']?.toString(),
      video: (() {
        final value = json['video']?.toString();
        if (value == null) {
          throw FormatException('KlingMotionControlRequest.video is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'callback_url': callbackUrl,
      'image': image,
      'model_name': modelName,
      'prompt': prompt,
      'video': video,
    };
  }
}

class KlingSoundGenerationRequest {
  final String? callbackUrl;
  final double duration;
  final String? externalTaskId;
  final String prompt;

  KlingSoundGenerationRequest({
    this.callbackUrl,
    required this.duration,
    this.externalTaskId,
    required this.prompt
  });

  factory KlingSoundGenerationRequest.fromJson(Map<String, dynamic> json) {
    return KlingSoundGenerationRequest(
      callbackUrl: json['callback_url']?.toString(),
      duration: (() {
        final value = json['duration'];
        if (value is! num) {
          throw FormatException('KlingSoundGenerationRequest.duration is required');
        }
        return value.toDouble();
      })(),
      externalTaskId: json['external_task_id']?.toString(),
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('KlingSoundGenerationRequest.prompt is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'callback_url': callbackUrl,
      'duration': duration,
      'external_task_id': externalTaskId,
      'prompt': prompt,
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

class KlingVideoToAudioRequest {
  final bool? asmrMode;
  final String? bgmPrompt;
  final String? callbackUrl;
  final String? externalTaskId;
  final String? soundEffectPrompt;
  final String? videoId;
  final String? videoUrl;

  KlingVideoToAudioRequest({
    this.asmrMode,
    this.bgmPrompt,
    this.callbackUrl,
    this.externalTaskId,
    this.soundEffectPrompt,
    this.videoId,
    this.videoUrl
  });

  factory KlingVideoToAudioRequest.fromJson(Map<String, dynamic> json) {
    return KlingVideoToAudioRequest(
      asmrMode: json['asmr_mode'] is bool ? json['asmr_mode'] : null,
      bgmPrompt: json['bgm_prompt']?.toString(),
      callbackUrl: json['callback_url']?.toString(),
      externalTaskId: json['external_task_id']?.toString(),
      soundEffectPrompt: json['sound_effect_prompt']?.toString(),
      videoId: json['video_id']?.toString(),
      videoUrl: json['video_url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'asmr_mode': asmrMode,
      'bgm_prompt': bgmPrompt,
      'callback_url': callbackUrl,
      'external_task_id': externalTaskId,
      'sound_effect_prompt': soundEffectPrompt,
      'video_id': videoId,
      'video_url': videoUrl,
    };
  }
}

class KlingWatermarkInfo {
  final bool? enabled;

  KlingWatermarkInfo({
    this.enabled
  });

  factory KlingWatermarkInfo.fromJson(Map<String, dynamic> json) {
    return KlingWatermarkInfo(
      enabled: json['enabled'] is bool ? json['enabled'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'enabled': enabled,
    };
  }
}

class LumaConcept {
  final String key;

  LumaConcept({
    required this.key
  });

  factory LumaConcept.fromJson(Map<String, dynamic> json) {
    return LumaConcept(
      key: (() {
        final value = json['key']?.toString();
        if (value == null) {
          throw FormatException('LumaConcept.key is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'key': key,
    };
  }
}

class LumaGenerationAssets {
  final String? image;
  final String? video;

  LumaGenerationAssets({
    this.image,
    this.video
  });

  factory LumaGenerationAssets.fromJson(Map<String, dynamic> json) {
    return LumaGenerationAssets(
      image: json['image']?.toString(),
      video: json['video']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'image': image,
      'video': video,
    };
  }
}

class LumaKeyframe {
  final String? id;
  final String type;
  final String? url;

  LumaKeyframe({
    this.id,
    required this.type,
    this.url
  });

  factory LumaKeyframe.fromJson(Map<String, dynamic> json) {
    return LumaKeyframe(
      id: json['id']?.toString(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('LumaKeyframe.type is required');
        }
        return value;
      })(),
      url: json['url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'type': type,
      'url': url,
    };
  }
}

class LumaKeyframes {
  final LumaKeyframe? frame0;
  final LumaKeyframe? frame1;

  LumaKeyframes({
    this.frame0,
    this.frame1
  });

  factory LumaKeyframes.fromJson(Map<String, dynamic> json) {
    return LumaKeyframes(
      frame0: (() {
        final map = _sdkworkAsMap(json['frame0']);
        return map == null ? null : LumaKeyframe.fromJson(map);
      })(),
      frame1: (() {
        final map = _sdkworkAsMap(json['frame1']);
        return map == null ? null : LumaKeyframe.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'frame0': frame0?.toJson(),
      'frame1': frame1?.toJson(),
    };
  }
}

class LumaVideoGenerationRequest {
  final String? aspectRatio;
  final String? callbackUrl;
  final List<LumaConcept>? concepts;
  final String? duration;
  final String? generationType;
  final LumaKeyframes? keyframes;
  final bool? loop;
  final String model;
  final String? prompt;
  final String? resolution;

  LumaVideoGenerationRequest({
    this.aspectRatio,
    this.callbackUrl,
    this.concepts,
    this.duration,
    this.generationType,
    this.keyframes,
    this.loop,
    required this.model,
    this.prompt,
    this.resolution
  });

  factory LumaVideoGenerationRequest.fromJson(Map<String, dynamic> json) {
    return LumaVideoGenerationRequest(
      aspectRatio: json['aspect_ratio']?.toString(),
      callbackUrl: json['callback_url']?.toString(),
      concepts: (() {
        final list = _sdkworkAsList(json['concepts']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : LumaConcept.fromJson(map);
      })())
            .whereType<LumaConcept>()
            .toList();
      })(),
      duration: json['duration']?.toString(),
      generationType: json['generation_type']?.toString(),
      keyframes: (() {
        final map = _sdkworkAsMap(json['keyframes']);
        return map == null ? null : LumaKeyframes.fromJson(map);
      })(),
      loop: json['loop'] is bool ? json['loop'] : null,
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('LumaVideoGenerationRequest.model is required');
        }
        return value;
      })(),
      prompt: json['prompt']?.toString(),
      resolution: json['resolution']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'callback_url': callbackUrl,
      'concepts': concepts?.map((item) => item.toJson()).toList(),
      'duration': duration,
      'generation_type': generationType,
      'keyframes': keyframes?.toJson(),
      'loop': loop,
      'model': model,
      'prompt': prompt,
      'resolution': resolution,
    };
  }
}

class LumaVideoGenerationTask {
  final LumaGenerationAssets? assets;
  final String? createdAt;
  final String? failureReason;
  final String? generationType;
  final String? id;
  final String? model;
  final Map<String, dynamic>? request;
  final String? state;

  LumaVideoGenerationTask({
    this.assets,
    this.createdAt,
    this.failureReason,
    this.generationType,
    this.id,
    this.model,
    this.request,
    this.state
  });

  factory LumaVideoGenerationTask.fromJson(Map<String, dynamic> json) {
    return LumaVideoGenerationTask(
      assets: (() {
        final map = _sdkworkAsMap(json['assets']);
        return map == null ? null : LumaGenerationAssets.fromJson(map);
      })(),
      createdAt: json['created_at']?.toString(),
      failureReason: json['failure_reason']?.toString(),
      generationType: json['generation_type']?.toString(),
      id: json['id']?.toString(),
      model: json['model']?.toString(),
      request: (() {
        final map = _sdkworkAsMap(json['request']);
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
      state: json['state']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'assets': assets?.toJson(),
      'created_at': createdAt,
      'failure_reason': failureReason,
      'generation_type': generationType,
      'id': id,
      'model': model,
      'request': request?.map((key, item) => MapEntry(key, item)),
      'state': state,
    };
  }
}

class MiniMaxMusicAudioSetting {
  final int? bitrate;
  final String? format;
  final int? sampleRate;

  MiniMaxMusicAudioSetting({
    this.bitrate,
    this.format,
    this.sampleRate
  });

  factory MiniMaxMusicAudioSetting.fromJson(Map<String, dynamic> json) {
    return MiniMaxMusicAudioSetting(
      bitrate: json['bitrate'] is int ? json['bitrate'] : null,
      format: json['format']?.toString(),
      sampleRate: json['sample_rate'] is int ? json['sample_rate'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bitrate': bitrate,
      'format': format,
      'sample_rate': sampleRate,
    };
  }
}

class MiniMaxMusicBaseResp {
  final int? statusCode;
  final String? statusMsg;

  MiniMaxMusicBaseResp({
    this.statusCode,
    this.statusMsg
  });

  factory MiniMaxMusicBaseResp.fromJson(Map<String, dynamic> json) {
    return MiniMaxMusicBaseResp(
      statusCode: json['status_code'] is int ? json['status_code'] : null,
      statusMsg: json['status_msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'status_code': statusCode,
      'status_msg': statusMsg,
    };
  }
}

class MiniMaxMusicData {
  final String? audio;
  final MiniMaxMusicExtraInfo? extraInfo;
  final int? status;

  MiniMaxMusicData({
    this.audio,
    this.extraInfo,
    this.status
  });

  factory MiniMaxMusicData.fromJson(Map<String, dynamic> json) {
    return MiniMaxMusicData(
      audio: json['audio']?.toString(),
      extraInfo: (() {
        final map = _sdkworkAsMap(json['extra_info']);
        return map == null ? null : MiniMaxMusicExtraInfo.fromJson(map);
      })(),
      status: json['status'] is int ? json['status'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'audio': audio,
      'extra_info': extraInfo?.toJson(),
      'status': status,
    };
  }
}

class MiniMaxMusicExtraInfo {
  final int? bitrate;
  final int? musicChannel;
  final double? musicDuration;
  final int? musicSampleRate;
  final int? musicSize;

  MiniMaxMusicExtraInfo({
    this.bitrate,
    this.musicChannel,
    this.musicDuration,
    this.musicSampleRate,
    this.musicSize
  });

  factory MiniMaxMusicExtraInfo.fromJson(Map<String, dynamic> json) {
    return MiniMaxMusicExtraInfo(
      bitrate: json['bitrate'] is int ? json['bitrate'] : null,
      musicChannel: json['music_channel'] is int ? json['music_channel'] : null,
      musicDuration: json['music_duration'] is num ? json['music_duration'].toDouble() : null,
      musicSampleRate: json['music_sample_rate'] is int ? json['music_sample_rate'] : null,
      musicSize: json['music_size'] is int ? json['music_size'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bitrate': bitrate,
      'music_channel': musicChannel,
      'music_duration': musicDuration,
      'music_sample_rate': musicSampleRate,
      'music_size': musicSize,
    };
  }
}

class MiniMaxMusicGenerationRequest {
  final String? audioBase64;
  final MiniMaxMusicAudioSetting? audioSetting;
  final String? audioUrl;
  final String? coverFeatureId;
  final bool? isInstrumental;
  final String? lyrics;
  final bool? lyricsOptimizer;
  final String model;
  final String? outputFormat;
  final String? prompt;
  final bool? stream;

  MiniMaxMusicGenerationRequest({
    this.audioBase64,
    this.audioSetting,
    this.audioUrl,
    this.coverFeatureId,
    this.isInstrumental,
    this.lyrics,
    this.lyricsOptimizer,
    required this.model,
    this.outputFormat,
    this.prompt,
    this.stream
  });

  factory MiniMaxMusicGenerationRequest.fromJson(Map<String, dynamic> json) {
    return MiniMaxMusicGenerationRequest(
      audioBase64: json['audio_base64']?.toString(),
      audioSetting: (() {
        final map = _sdkworkAsMap(json['audio_setting']);
        return map == null ? null : MiniMaxMusicAudioSetting.fromJson(map);
      })(),
      audioUrl: json['audio_url']?.toString(),
      coverFeatureId: json['cover_feature_id']?.toString(),
      isInstrumental: json['is_instrumental'] is bool ? json['is_instrumental'] : null,
      lyrics: json['lyrics']?.toString(),
      lyricsOptimizer: json['lyrics_optimizer'] is bool ? json['lyrics_optimizer'] : null,
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('MiniMaxMusicGenerationRequest.model is required');
        }
        return value;
      })(),
      outputFormat: json['output_format']?.toString(),
      prompt: json['prompt']?.toString(),
      stream: json['stream'] is bool ? json['stream'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'audio_base64': audioBase64,
      'audio_setting': audioSetting?.toJson(),
      'audio_url': audioUrl,
      'cover_feature_id': coverFeatureId,
      'is_instrumental': isInstrumental,
      'lyrics': lyrics,
      'lyrics_optimizer': lyricsOptimizer,
      'model': model,
      'output_format': outputFormat,
      'prompt': prompt,
      'stream': stream,
    };
  }
}

class MiniMaxMusicGenerationResponse {
  final MiniMaxMusicBaseResp? baseResp;
  final MiniMaxMusicData? data;
  final String? traceId;

  MiniMaxMusicGenerationResponse({
    this.baseResp,
    this.data,
    this.traceId
  });

  factory MiniMaxMusicGenerationResponse.fromJson(Map<String, dynamic> json) {
    return MiniMaxMusicGenerationResponse(
      baseResp: (() {
        final map = _sdkworkAsMap(json['base_resp']);
        return map == null ? null : MiniMaxMusicBaseResp.fromJson(map);
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : MiniMaxMusicData.fromJson(map);
      })(),
      traceId: json['trace_id']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'base_resp': baseResp?.toJson(),
      'data': data?.toJson(),
      'trace_id': traceId,
    };
  }
}

class MinimaxBaseResp {
  final int? statusCode;
  final String? statusMsg;

  MinimaxBaseResp({
    this.statusCode,
    this.statusMsg
  });

  factory MinimaxBaseResp.fromJson(Map<String, dynamic> json) {
    return MinimaxBaseResp(
      statusCode: json['status_code'] is int ? json['status_code'] : null,
      statusMsg: json['status_msg']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'status_code': statusCode,
      'status_msg': statusMsg,
    };
  }
}

class MinimaxFileRetrieveResponse {
  final MinimaxBaseResp? baseResp;
  final Map<String, dynamic>? file;

  MinimaxFileRetrieveResponse({
    this.baseResp,
    this.file
  });

  factory MinimaxFileRetrieveResponse.fromJson(Map<String, dynamic> json) {
    return MinimaxFileRetrieveResponse(
      baseResp: (() {
        final map = _sdkworkAsMap(json['base_resp']);
        return map == null ? null : MinimaxBaseResp.fromJson(map);
      })(),
      file: (() {
        final map = _sdkworkAsMap(json['file']);
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
      'base_resp': baseResp?.toJson(),
      'file': file?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class MinimaxImageData {
  final List<String>? imageBase64;
  final List<String>? imageUrls;

  MinimaxImageData({
    this.imageBase64,
    this.imageUrls
  });

  factory MinimaxImageData.fromJson(Map<String, dynamic> json) {
    return MinimaxImageData(
      imageBase64: (() {
        final list = _sdkworkAsList(json['image_base64']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      imageUrls: (() {
        final list = _sdkworkAsList(json['image_urls']);
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
      'image_base64': imageBase64?.map((item) => item).toList(),
      'image_urls': imageUrls?.map((item) => item).toList(),
    };
  }
}

class MinimaxImageGenerationRequest {
  final String? aspectRatio;
  final int? height;
  final String model;
  final int? n;
  final String prompt;
  final bool? promptOptimizer;
  final String? responseFormat;
  final int? seed;
  final List<Map<String, dynamic>>? subjectReference;
  final int? width;

  MinimaxImageGenerationRequest({
    this.aspectRatio,
    this.height,
    required this.model,
    this.n,
    required this.prompt,
    this.promptOptimizer,
    this.responseFormat,
    this.seed,
    this.subjectReference,
    this.width
  });

  factory MinimaxImageGenerationRequest.fromJson(Map<String, dynamic> json) {
    return MinimaxImageGenerationRequest(
      aspectRatio: json['aspect_ratio']?.toString(),
      height: json['height'] is int ? json['height'] : null,
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('MinimaxImageGenerationRequest.model is required');
        }
        return value;
      })(),
      n: json['n'] is int ? json['n'] : null,
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('MinimaxImageGenerationRequest.prompt is required');
        }
        return value;
      })(),
      promptOptimizer: json['prompt_optimizer'] is bool ? json['prompt_optimizer'] : null,
      responseFormat: json['response_format']?.toString(),
      seed: json['seed'] is int ? json['seed'] : null,
      subjectReference: (() {
        final list = _sdkworkAsList(json['subject_reference']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })())
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      width: json['width'] is int ? json['width'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'height': height,
      'model': model,
      'n': n,
      'prompt': prompt,
      'prompt_optimizer': promptOptimizer,
      'response_format': responseFormat,
      'seed': seed,
      'subject_reference': subjectReference?.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
      'width': width,
    };
  }
}

class MinimaxImageGenerationResponse {
  final MinimaxBaseResp? baseResp;
  final MinimaxImageData? data;
  final String? id;
  final Map<String, dynamic>? metadata;

  MinimaxImageGenerationResponse({
    this.baseResp,
    this.data,
    this.id,
    this.metadata
  });

  factory MinimaxImageGenerationResponse.fromJson(Map<String, dynamic> json) {
    return MinimaxImageGenerationResponse(
      baseResp: (() {
        final map = _sdkworkAsMap(json['base_resp']);
        return map == null ? null : MinimaxBaseResp.fromJson(map);
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : MinimaxImageData.fromJson(map);
      })(),
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
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'base_resp': baseResp?.toJson(),
      'data': data?.toJson(),
      'id': id,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class MinimaxStreamOptions {
  final bool? excludeAggregatedAudio;

  MinimaxStreamOptions({
    this.excludeAggregatedAudio
  });

  factory MinimaxStreamOptions.fromJson(Map<String, dynamic> json) {
    return MinimaxStreamOptions(
      excludeAggregatedAudio: json['exclude_aggregated_audio'] is bool ? json['exclude_aggregated_audio'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'exclude_aggregated_audio': excludeAggregatedAudio,
    };
  }
}

class MinimaxTextToSpeechRequest {
  final Map<String, dynamic>? audioSetting;
  final String? languageBoost;
  final String model;
  final String? outputFormat;
  final Map<String, dynamic>? pronunciationDict;
  final bool? stream;
  final MinimaxStreamOptions? streamOptions;
  final bool? subtitleEnable;
  final String? subtitleType;
  final String text;
  final String? textNormalizationMode;
  final List<MinimaxTimbreWeight>? timbreWeights;
  final MinimaxVoiceModify? voiceModify;
  final Map<String, dynamic>? voiceSetting;

  MinimaxTextToSpeechRequest({
    this.audioSetting,
    this.languageBoost,
    required this.model,
    this.outputFormat,
    this.pronunciationDict,
    this.stream,
    this.streamOptions,
    this.subtitleEnable,
    this.subtitleType,
    required this.text,
    this.textNormalizationMode,
    this.timbreWeights,
    this.voiceModify,
    this.voiceSetting
  });

  factory MinimaxTextToSpeechRequest.fromJson(Map<String, dynamic> json) {
    return MinimaxTextToSpeechRequest(
      audioSetting: (() {
        final map = _sdkworkAsMap(json['audio_setting']);
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
      languageBoost: json['language_boost']?.toString(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('MinimaxTextToSpeechRequest.model is required');
        }
        return value;
      })(),
      outputFormat: json['output_format']?.toString(),
      pronunciationDict: (() {
        final map = _sdkworkAsMap(json['pronunciation_dict']);
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
      stream: json['stream'] is bool ? json['stream'] : null,
      streamOptions: (() {
        final map = _sdkworkAsMap(json['stream_options']);
        return map == null ? null : MinimaxStreamOptions.fromJson(map);
      })(),
      subtitleEnable: json['subtitle_enable'] is bool ? json['subtitle_enable'] : null,
      subtitleType: json['subtitle_type']?.toString(),
      text: (() {
        final value = json['text']?.toString();
        if (value == null) {
          throw FormatException('MinimaxTextToSpeechRequest.text is required');
        }
        return value;
      })(),
      textNormalizationMode: json['text_normalization_mode']?.toString(),
      timbreWeights: (() {
        final list = _sdkworkAsList(json['timbre_weights']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : MinimaxTimbreWeight.fromJson(map);
      })())
            .whereType<MinimaxTimbreWeight>()
            .toList();
      })(),
      voiceModify: (() {
        final map = _sdkworkAsMap(json['voice_modify']);
        return map == null ? null : MinimaxVoiceModify.fromJson(map);
      })(),
      voiceSetting: (() {
        final map = _sdkworkAsMap(json['voice_setting']);
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
      'audio_setting': audioSetting?.map((key, item) => MapEntry(key, item)),
      'language_boost': languageBoost,
      'model': model,
      'output_format': outputFormat,
      'pronunciation_dict': pronunciationDict?.map((key, item) => MapEntry(key, item)),
      'stream': stream,
      'stream_options': streamOptions?.toJson(),
      'subtitle_enable': subtitleEnable,
      'subtitle_type': subtitleType,
      'text': text,
      'text_normalization_mode': textNormalizationMode,
      'timbre_weights': timbreWeights?.map((item) => item.toJson()).toList(),
      'voice_modify': voiceModify?.toJson(),
      'voice_setting': voiceSetting?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class MinimaxTextToSpeechResponse {
  final MinimaxBaseResp? baseResp;
  final Map<String, dynamic>? data;
  final Map<String, dynamic>? extraInfo;
  final String? traceId;

  MinimaxTextToSpeechResponse({
    this.baseResp,
    this.data,
    this.extraInfo,
    this.traceId
  });

  factory MinimaxTextToSpeechResponse.fromJson(Map<String, dynamic> json) {
    return MinimaxTextToSpeechResponse(
      baseResp: (() {
        final map = _sdkworkAsMap(json['base_resp']);
        return map == null ? null : MinimaxBaseResp.fromJson(map);
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
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
      extraInfo: (() {
        final map = _sdkworkAsMap(json['extra_info']);
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
      traceId: json['trace_id']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'base_resp': baseResp?.toJson(),
      'data': data?.map((key, item) => MapEntry(key, item)),
      'extra_info': extraInfo?.map((key, item) => MapEntry(key, item)),
      'trace_id': traceId,
    };
  }
}

class MinimaxTimbreWeight {
  final String voiceId;
  final int weight;

  MinimaxTimbreWeight({
    required this.voiceId,
    required this.weight
  });

  factory MinimaxTimbreWeight.fromJson(Map<String, dynamic> json) {
    return MinimaxTimbreWeight(
      voiceId: (() {
        final value = json['voice_id']?.toString();
        if (value == null) {
          throw FormatException('MinimaxTimbreWeight.voice_id is required');
        }
        return value;
      })(),
      weight: (() {
        final value = json['weight'];
        if (value is! int) {
          throw FormatException('MinimaxTimbreWeight.weight is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'voice_id': voiceId,
      'weight': weight,
    };
  }
}

class MinimaxVideoGenerationRequest {
  final String? callbackUrl;
  final int? duration;
  final bool? fastPretreatment;
  final String? firstFrameImage;
  final String? lastFrameImage;
  final String model;
  final String prompt;
  final bool? promptOptimizer;
  final String? resolution;

  MinimaxVideoGenerationRequest({
    this.callbackUrl,
    this.duration,
    this.fastPretreatment,
    this.firstFrameImage,
    this.lastFrameImage,
    required this.model,
    required this.prompt,
    this.promptOptimizer,
    this.resolution
  });

  factory MinimaxVideoGenerationRequest.fromJson(Map<String, dynamic> json) {
    return MinimaxVideoGenerationRequest(
      callbackUrl: json['callback_url']?.toString(),
      duration: json['duration'] is int ? json['duration'] : null,
      fastPretreatment: json['fast_pretreatment'] is bool ? json['fast_pretreatment'] : null,
      firstFrameImage: json['first_frame_image']?.toString(),
      lastFrameImage: json['last_frame_image']?.toString(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('MinimaxVideoGenerationRequest.model is required');
        }
        return value;
      })(),
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('MinimaxVideoGenerationRequest.prompt is required');
        }
        return value;
      })(),
      promptOptimizer: json['prompt_optimizer'] is bool ? json['prompt_optimizer'] : null,
      resolution: json['resolution']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'callback_url': callbackUrl,
      'duration': duration,
      'fast_pretreatment': fastPretreatment,
      'first_frame_image': firstFrameImage,
      'last_frame_image': lastFrameImage,
      'model': model,
      'prompt': prompt,
      'prompt_optimizer': promptOptimizer,
      'resolution': resolution,
    };
  }
}

class MinimaxVideoGenerationTask {
  final MinimaxBaseResp? baseResp;
  final String? fileId;
  final String? status;
  final String? taskId;
  final int? videoHeight;
  final int? videoWidth;

  MinimaxVideoGenerationTask({
    this.baseResp,
    this.fileId,
    this.status,
    this.taskId,
    this.videoHeight,
    this.videoWidth
  });

  factory MinimaxVideoGenerationTask.fromJson(Map<String, dynamic> json) {
    return MinimaxVideoGenerationTask(
      baseResp: (() {
        final map = _sdkworkAsMap(json['base_resp']);
        return map == null ? null : MinimaxBaseResp.fromJson(map);
      })(),
      fileId: json['file_id']?.toString(),
      status: json['status']?.toString(),
      taskId: json['task_id']?.toString(),
      videoHeight: json['video_height'] is int ? json['video_height'] : null,
      videoWidth: json['video_width'] is int ? json['video_width'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'base_resp': baseResp?.toJson(),
      'file_id': fileId,
      'status': status,
      'task_id': taskId,
      'video_height': videoHeight,
      'video_width': videoWidth,
    };
  }
}

class MinimaxVoiceModify {
  final int? intensity;
  final int? pitch;
  final String? soundEffects;
  final int? timbre;

  MinimaxVoiceModify({
    this.intensity,
    this.pitch,
    this.soundEffects,
    this.timbre
  });

  factory MinimaxVoiceModify.fromJson(Map<String, dynamic> json) {
    return MinimaxVoiceModify(
      intensity: json['intensity'] is int ? json['intensity'] : null,
      pitch: json['pitch'] is int ? json['pitch'] : null,
      soundEffects: json['sound_effects']?.toString(),
      timbre: json['timbre'] is int ? json['timbre'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'intensity': intensity,
      'pitch': pitch,
      'sound_effects': soundEffects,
      'timbre': timbre,
    };
  }
}

class MurekaMusicGenerationRequest {
  final String? callbackUrl;
  final int? duration;
  final String? lyrics;
  final String model;
  final String? prompt;
  final String? referenceAudioUrl;
  final List<String>? tags;
  final String? title;

  MurekaMusicGenerationRequest({
    this.callbackUrl,
    this.duration,
    this.lyrics,
    required this.model,
    this.prompt,
    this.referenceAudioUrl,
    this.tags,
    this.title
  });

  factory MurekaMusicGenerationRequest.fromJson(Map<String, dynamic> json) {
    return MurekaMusicGenerationRequest(
      callbackUrl: json['callback_url']?.toString(),
      duration: json['duration'] is int ? json['duration'] : null,
      lyrics: json['lyrics']?.toString(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('MurekaMusicGenerationRequest.model is required');
        }
        return value;
      })(),
      prompt: json['prompt']?.toString(),
      referenceAudioUrl: json['reference_audio_url']?.toString(),
      tags: (() {
        final list = _sdkworkAsList(json['tags']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      title: json['title']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'callback_url': callbackUrl,
      'duration': duration,
      'lyrics': lyrics,
      'model': model,
      'prompt': prompt,
      'reference_audio_url': referenceAudioUrl,
      'tags': tags?.map((item) => item).toList(),
      'title': title,
    };
  }
}

class MurekaMusicGenerationTask {
  final String? audioUrl;
  final int? duration;
  final Map<String, dynamic>? error;
  final String? id;
  final String? status;
  final String? taskId;
  final String? title;

  MurekaMusicGenerationTask({
    this.audioUrl,
    this.duration,
    this.error,
    this.id,
    this.status,
    this.taskId,
    this.title
  });

  factory MurekaMusicGenerationTask.fromJson(Map<String, dynamic> json) {
    return MurekaMusicGenerationTask(
      audioUrl: json['audio_url']?.toString(),
      duration: json['duration'] is int ? json['duration'] : null,
      error: (() {
        final map = _sdkworkAsMap(json['error']);
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
      id: json['id']?.toString(),
      status: json['status']?.toString(),
      taskId: json['task_id']?.toString(),
      title: json['title']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'audio_url': audioUrl,
      'duration': duration,
      'error': error?.map((key, item) => MapEntry(key, item)),
      'id': id,
      'status': status,
      'task_id': taskId,
      'title': title,
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
  final String? reasoningEffort;
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
    this.reasoningEffort,
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
      reasoningEffort: json['reasoning_effort']?.toString(),
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
      'reasoning_effort': reasoningEffort,
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
  final String? reasoningEffort;
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
    this.reasoningEffort,
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
      reasoningEffort: json['reasoning_effort']?.toString(),
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
      'reasoning_effort': reasoningEffort,
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
  final Map<String, dynamic>? outputExpiresAfter;

  OpenAiBatchCreateRequest({
    required this.completionWindow,
    required this.endpoint,
    required this.inputFileId,
    this.metadata,
    this.outputExpiresAfter
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
      })(),
      outputExpiresAfter: (() {
        final map = _sdkworkAsMap(json['output_expires_after']);
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
      'output_expires_after': outputExpiresAfter?.map((key, item) => MapEntry(key, item)),
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
  final OpenAiStreamOptions? streamOptions;
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
    this.streamOptions,
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
      streamOptions: (() {
        final map = _sdkworkAsMap(json['stream_options']);
        return map == null ? null : OpenAiStreamOptions.fromJson(map);
      })(),
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
      'stream_options': streamOptions?.toJson(),
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
  final Map<String, dynamic>? expiresAfter;
  final List<String>? fileIds;
  final String? memoryLimit;
  final String? name;
  final Map<String, dynamic>? networkPolicy;
  final List<Map<String, dynamic>>? skills;

  OpenAiContainerCreateRequest({
    this.expiresAfter,
    this.fileIds,
    this.memoryLimit,
    this.name,
    this.networkPolicy,
    this.skills
  });

  factory OpenAiContainerCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiContainerCreateRequest(
      expiresAfter: (() {
        final map = _sdkworkAsMap(json['expires_after']);
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
      name: json['name']?.toString(),
      networkPolicy: (() {
        final map = _sdkworkAsMap(json['network_policy']);
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
      skills: (() {
        final list = _sdkworkAsList(json['skills']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
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
      'expires_after': expiresAfter?.map((key, item) => MapEntry(key, item)),
      'file_ids': fileIds?.map((item) => item).toList(),
      'memory_limit': memoryLimit,
      'name': name,
      'network_policy': networkPolicy?.map((key, item) => MapEntry(key, item)),
      'skills': skills?.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
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
  final List<Map<String, dynamic>> items;

  OpenAiConversationItemCreateRequest({
    required this.items
  });

  factory OpenAiConversationItemCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiConversationItemCreateRequest(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('OpenAiConversationItemCreateRequest.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
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
      'items': items.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
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

class OpenAiDeepSeekWebFetchRequest {
  final String url;

  OpenAiDeepSeekWebFetchRequest({
    required this.url
  });

  factory OpenAiDeepSeekWebFetchRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiDeepSeekWebFetchRequest(
      url: (() {
        final value = json['url']?.toString();
        if (value == null) {
          throw FormatException('OpenAiDeepSeekWebFetchRequest.url is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'url': url,
    };
  }
}

class OpenAiDeepSeekWebFetchResponse {
  final String content;
  final String title;

  OpenAiDeepSeekWebFetchResponse({
    required this.content,
    required this.title
  });

  factory OpenAiDeepSeekWebFetchResponse.fromJson(Map<String, dynamic> json) {
    return OpenAiDeepSeekWebFetchResponse(
      content: (() {
        final value = json['content']?.toString();
        if (value == null) {
          throw FormatException('OpenAiDeepSeekWebFetchResponse.content is required');
        }
        return value;
      })(),
      title: (() {
        final value = json['title']?.toString();
        if (value == null) {
          throw FormatException('OpenAiDeepSeekWebFetchResponse.title is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'content': content,
      'title': title,
    };
  }
}

class OpenAiDeepSeekWebSearchRequest {
  final int? count;
  final String? localization;
  final bool? needContent;
  final String? oriQuestion;
  final String query;

  OpenAiDeepSeekWebSearchRequest({
    this.count,
    this.localization,
    this.needContent,
    this.oriQuestion,
    required this.query
  });

  factory OpenAiDeepSeekWebSearchRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiDeepSeekWebSearchRequest(
      count: json['count'] is int ? json['count'] : null,
      localization: json['localization']?.toString(),
      needContent: json['need_content'] is bool ? json['need_content'] : null,
      oriQuestion: json['ori_question']?.toString(),
      query: (() {
        final value = json['query']?.toString();
        if (value == null) {
          throw FormatException('OpenAiDeepSeekWebSearchRequest.query is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'count': count,
      'localization': localization,
      'need_content': needContent,
      'ori_question': oriQuestion,
      'query': query,
    };
  }
}

class OpenAiDeepSeekWebSearchResponse {
  final List<OpenAiDeepSeekWebSearchResult> results;

  OpenAiDeepSeekWebSearchResponse({
    required this.results
  });

  factory OpenAiDeepSeekWebSearchResponse.fromJson(Map<String, dynamic> json) {
    return OpenAiDeepSeekWebSearchResponse(
      results: (() {
        final list = _sdkworkAsList(json['results']);
        if (list == null) {
          throw FormatException('OpenAiDeepSeekWebSearchResponse.results is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiDeepSeekWebSearchResult.fromJson(map);
      })())
            .whereType<OpenAiDeepSeekWebSearchResult>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'results': results.map((item) => item.toJson()).toList(),
    };
  }
}

class OpenAiDeepSeekWebSearchResult {
  final int authority;
  final String content;
  final String? date;
  final double rerankScore;
  final String? siteIcon;
  final String? siteName;
  final String snippet;
  final String summary;
  final String title;
  final String url;

  OpenAiDeepSeekWebSearchResult({
    required this.authority,
    required this.content,
    required this.date,
    required this.rerankScore,
    required this.siteIcon,
    required this.siteName,
    required this.snippet,
    required this.summary,
    required this.title,
    required this.url
  });

  factory OpenAiDeepSeekWebSearchResult.fromJson(Map<String, dynamic> json) {
    return OpenAiDeepSeekWebSearchResult(
      authority: (() {
        final value = json['authority'];
        if (value is! int) {
          throw FormatException('OpenAiDeepSeekWebSearchResult.authority is required');
        }
        return value;
      })(),
      content: (() {
        final value = json['content']?.toString();
        if (value == null) {
          throw FormatException('OpenAiDeepSeekWebSearchResult.content is required');
        }
        return value;
      })(),
      date: (() {
        if (!json.containsKey('date')) {
          throw FormatException('OpenAiDeepSeekWebSearchResult.date is required');
        }
        final _sdkworkRequiredValue = json['date'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('OpenAiDeepSeekWebSearchResult.date is required');
        }
        return value;
      })();
      })(),
      rerankScore: (() {
        final value = json['rerank_score'];
        if (value is! num) {
          throw FormatException('OpenAiDeepSeekWebSearchResult.rerank_score is required');
        }
        return value.toDouble();
      })(),
      siteIcon: (() {
        if (!json.containsKey('site_icon')) {
          throw FormatException('OpenAiDeepSeekWebSearchResult.site_icon is required');
        }
        final _sdkworkRequiredValue = json['site_icon'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('OpenAiDeepSeekWebSearchResult.site_icon is required');
        }
        return value;
      })();
      })(),
      siteName: (() {
        if (!json.containsKey('site_name')) {
          throw FormatException('OpenAiDeepSeekWebSearchResult.site_name is required');
        }
        final _sdkworkRequiredValue = json['site_name'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('OpenAiDeepSeekWebSearchResult.site_name is required');
        }
        return value;
      })();
      })(),
      snippet: (() {
        final value = json['snippet']?.toString();
        if (value == null) {
          throw FormatException('OpenAiDeepSeekWebSearchResult.snippet is required');
        }
        return value;
      })(),
      summary: (() {
        final value = json['summary']?.toString();
        if (value == null) {
          throw FormatException('OpenAiDeepSeekWebSearchResult.summary is required');
        }
        return value;
      })(),
      title: (() {
        final value = json['title']?.toString();
        if (value == null) {
          throw FormatException('OpenAiDeepSeekWebSearchResult.title is required');
        }
        return value;
      })(),
      url: (() {
        final value = json['url']?.toString();
        if (value == null) {
          throw FormatException('OpenAiDeepSeekWebSearchResult.url is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'authority': authority,
      'content': content,
      'date': date,
      'rerank_score': rerankScore,
      'site_icon': siteIcon,
      'site_name': siteName,
      'snippet': snippet,
      'summary': summary,
      'title': title,
      'url': url,
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
  final String? background;
  final String? complexity;
  final int? frameCount;
  final int? frameDurationMs;
  final String image;
  final String? inputFidelity;
  final String? markup;
  final String? mask;
  final String model;
  final String? moderation;
  final int? n;
  final int? outputCompression;
  final String? outputFormat;
  final int? partialImages;
  final String prompt;
  final String? quality;
  final String? responseFormat;
  final String? safetyIdentifier;
  final String? size;
  final bool? stream;
  final Map<String, dynamic>? svg;
  final String? user;

  OpenAiImageEditMultipartRequest({
    this.background,
    this.complexity,
    this.frameCount,
    this.frameDurationMs,
    required this.image,
    this.inputFidelity,
    this.markup,
    this.mask,
    required this.model,
    this.moderation,
    this.n,
    this.outputCompression,
    this.outputFormat,
    this.partialImages,
    required this.prompt,
    this.quality,
    this.responseFormat,
    this.safetyIdentifier,
    this.size,
    this.stream,
    this.svg,
    this.user
  });

  factory OpenAiImageEditMultipartRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiImageEditMultipartRequest(
      background: json['background']?.toString(),
      complexity: json['complexity']?.toString(),
      frameCount: json['frame_count'] is int ? json['frame_count'] : null,
      frameDurationMs: json['frame_duration_ms'] is int ? json['frame_duration_ms'] : null,
      image: (() {
        final value = json['image']?.toString();
        if (value == null) {
          throw FormatException('OpenAiImageEditMultipartRequest.image is required');
        }
        return value;
      })(),
      inputFidelity: json['input_fidelity']?.toString(),
      markup: json['markup']?.toString(),
      mask: json['mask']?.toString(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiImageEditMultipartRequest.model is required');
        }
        return value;
      })(),
      moderation: json['moderation']?.toString(),
      n: json['n'] is int ? json['n'] : null,
      outputCompression: json['output_compression'] is int ? json['output_compression'] : null,
      outputFormat: json['output_format']?.toString(),
      partialImages: json['partial_images'] is int ? json['partial_images'] : null,
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('OpenAiImageEditMultipartRequest.prompt is required');
        }
        return value;
      })(),
      quality: json['quality']?.toString(),
      responseFormat: json['response_format']?.toString(),
      safetyIdentifier: json['safety_identifier']?.toString(),
      size: json['size']?.toString(),
      stream: json['stream'] is bool ? json['stream'] : null,
      svg: (() {
        final map = _sdkworkAsMap(json['svg']);
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
      user: json['user']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'background': background,
      'complexity': complexity,
      'frame_count': frameCount,
      'frame_duration_ms': frameDurationMs,
      'image': image,
      'input_fidelity': inputFidelity,
      'markup': markup,
      'mask': mask,
      'model': model,
      'moderation': moderation,
      'n': n,
      'output_compression': outputCompression,
      'output_format': outputFormat,
      'partial_images': partialImages,
      'prompt': prompt,
      'quality': quality,
      'response_format': responseFormat,
      'safety_identifier': safetyIdentifier,
      'size': size,
      'stream': stream,
      'svg': svg?.map((key, item) => MapEntry(key, item)),
      'user': user,
    };
  }
}

class OpenAiImageEditRequest {
  final String? background;
  final String? complexity;
  final int? frameCount;
  final int? frameDurationMs;
  final List<OpenAiImageReferenceInput> images;
  final String? inputFidelity;
  final Map<String, dynamic>? markup;
  final Map<String, dynamic>? mask;
  final String? model;
  final String? moderation;
  final int? n;
  final int? outputCompression;
  final String? outputFormat;
  final int? partialImages;
  final String prompt;
  final String? quality;
  final String? safetyIdentifier;
  final String? size;
  final bool? stream;
  final Map<String, dynamic>? svg;
  final String? user;

  OpenAiImageEditRequest({
    this.background,
    this.complexity,
    this.frameCount,
    this.frameDurationMs,
    required this.images,
    this.inputFidelity,
    this.markup,
    this.mask,
    this.model,
    this.moderation,
    this.n,
    this.outputCompression,
    this.outputFormat,
    this.partialImages,
    required this.prompt,
    this.quality,
    this.safetyIdentifier,
    this.size,
    this.stream,
    this.svg,
    this.user
  });

  factory OpenAiImageEditRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiImageEditRequest(
      background: json['background']?.toString(),
      complexity: json['complexity']?.toString(),
      frameCount: json['frame_count'] is int ? json['frame_count'] : null,
      frameDurationMs: json['frame_duration_ms'] is int ? json['frame_duration_ms'] : null,
      images: (() {
        final list = _sdkworkAsList(json['images']);
        if (list == null) {
          throw FormatException('OpenAiImageEditRequest.images is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OpenAiImageReferenceInput.fromJson(map);
      })())
            .whereType<OpenAiImageReferenceInput>()
            .toList();
      })(),
      inputFidelity: json['input_fidelity']?.toString(),
      markup: (() {
        final map = _sdkworkAsMap(json['markup']);
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
      mask: (() {
        final map = _sdkworkAsMap(json['mask']);
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
      moderation: json['moderation']?.toString(),
      n: json['n'] is int ? json['n'] : null,
      outputCompression: json['output_compression'] is int ? json['output_compression'] : null,
      outputFormat: json['output_format']?.toString(),
      partialImages: json['partial_images'] is int ? json['partial_images'] : null,
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('OpenAiImageEditRequest.prompt is required');
        }
        return value;
      })(),
      quality: json['quality']?.toString(),
      safetyIdentifier: json['safety_identifier']?.toString(),
      size: json['size']?.toString(),
      stream: json['stream'] is bool ? json['stream'] : null,
      svg: (() {
        final map = _sdkworkAsMap(json['svg']);
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
      user: json['user']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'background': background,
      'complexity': complexity,
      'frame_count': frameCount,
      'frame_duration_ms': frameDurationMs,
      'images': images.map((item) => item.toJson()).toList(),
      'input_fidelity': inputFidelity,
      'markup': markup?.map((key, item) => MapEntry(key, item)),
      'mask': mask?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'moderation': moderation,
      'n': n,
      'output_compression': outputCompression,
      'output_format': outputFormat,
      'partial_images': partialImages,
      'prompt': prompt,
      'quality': quality,
      'safety_identifier': safetyIdentifier,
      'size': size,
      'stream': stream,
      'svg': svg?.map((key, item) => MapEntry(key, item)),
      'user': user,
    };
  }
}

class OpenAiImageGenerationRequest {
  final String? background;
  final String? complexity;
  final int? frameCount;
  final int? frameDurationMs;
  final String model;
  final String? moderation;
  final int? n;
  final int? outputCompression;
  final String? outputFormat;
  final int? partialImages;
  final String prompt;
  final String? quality;
  final String? responseFormat;
  final String? safetyIdentifier;
  final String? size;
  final bool? stream;
  final String? style;
  final Map<String, dynamic>? svg;
  final String? user;

  OpenAiImageGenerationRequest({
    this.background,
    this.complexity,
    this.frameCount,
    this.frameDurationMs,
    required this.model,
    this.moderation,
    this.n,
    this.outputCompression,
    this.outputFormat,
    this.partialImages,
    required this.prompt,
    this.quality,
    this.responseFormat,
    this.safetyIdentifier,
    this.size,
    this.stream,
    this.style,
    this.svg,
    this.user
  });

  factory OpenAiImageGenerationRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiImageGenerationRequest(
      background: json['background']?.toString(),
      complexity: json['complexity']?.toString(),
      frameCount: json['frame_count'] is int ? json['frame_count'] : null,
      frameDurationMs: json['frame_duration_ms'] is int ? json['frame_duration_ms'] : null,
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiImageGenerationRequest.model is required');
        }
        return value;
      })(),
      moderation: json['moderation']?.toString(),
      n: json['n'] is int ? json['n'] : null,
      outputCompression: json['output_compression'] is int ? json['output_compression'] : null,
      outputFormat: json['output_format']?.toString(),
      partialImages: json['partial_images'] is int ? json['partial_images'] : null,
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('OpenAiImageGenerationRequest.prompt is required');
        }
        return value;
      })(),
      quality: json['quality']?.toString(),
      responseFormat: json['response_format']?.toString(),
      safetyIdentifier: json['safety_identifier']?.toString(),
      size: json['size']?.toString(),
      stream: json['stream'] is bool ? json['stream'] : null,
      style: json['style']?.toString(),
      svg: (() {
        final map = _sdkworkAsMap(json['svg']);
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
      user: json['user']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'background': background,
      'complexity': complexity,
      'frame_count': frameCount,
      'frame_duration_ms': frameDurationMs,
      'model': model,
      'moderation': moderation,
      'n': n,
      'output_compression': outputCompression,
      'output_format': outputFormat,
      'partial_images': partialImages,
      'prompt': prompt,
      'quality': quality,
      'response_format': responseFormat,
      'safety_identifier': safetyIdentifier,
      'size': size,
      'stream': stream,
      'style': style,
      'svg': svg?.map((key, item) => MapEntry(key, item)),
      'user': user,
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
  final Map<String, dynamic>? audio;
  final List<String>? include;
  final String? instructions;
  final int? maxOutputTokens;
  final String? model;
  final List<String>? outputModalities;
  final bool? parallelToolCalls;
  final Map<String, dynamic>? prompt;
  final Map<String, dynamic>? reasoning;
  final String? toolChoice;
  final List<Map<String, dynamic>>? tools;
  final Map<String, dynamic>? tracing;
  final Map<String, dynamic>? truncation;
  final String type;

  OpenAiRealtimeCallActionRequest({
    this.audio,
    this.include,
    this.instructions,
    this.maxOutputTokens,
    this.model,
    this.outputModalities,
    this.parallelToolCalls,
    this.prompt,
    this.reasoning,
    this.toolChoice,
    this.tools,
    this.tracing,
    this.truncation,
    required this.type
  });

  factory OpenAiRealtimeCallActionRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiRealtimeCallActionRequest(
      audio: (() {
        final map = _sdkworkAsMap(json['audio']);
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
      instructions: json['instructions']?.toString(),
      maxOutputTokens: json['max_output_tokens'] is int ? json['max_output_tokens'] : null,
      model: json['model']?.toString(),
      outputModalities: (() {
        final list = _sdkworkAsList(json['output_modalities']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      parallelToolCalls: json['parallel_tool_calls'] is bool ? json['parallel_tool_calls'] : null,
      prompt: (() {
        final map = _sdkworkAsMap(json['prompt']);
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
      reasoning: (() {
        final map = _sdkworkAsMap(json['reasoning']);
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
      toolChoice: json['tool_choice']?.toString(),
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })())
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      tracing: (() {
        final map = _sdkworkAsMap(json['tracing']);
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
      truncation: (() {
        final map = _sdkworkAsMap(json['truncation']);
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
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRealtimeCallActionRequest.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'audio': audio?.map((key, item) => MapEntry(key, item)),
      'include': include?.map((item) => item).toList(),
      'instructions': instructions,
      'max_output_tokens': maxOutputTokens,
      'model': model,
      'output_modalities': outputModalities?.map((item) => item).toList(),
      'parallel_tool_calls': parallelToolCalls,
      'prompt': prompt?.map((key, item) => MapEntry(key, item)),
      'reasoning': reasoning?.map((key, item) => MapEntry(key, item)),
      'tool_choice': toolChoice,
      'tools': tools?.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
      'tracing': tracing?.map((key, item) => MapEntry(key, item)),
      'truncation': truncation?.map((key, item) => MapEntry(key, item)),
      'type': type,
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
  final String targetUri;

  OpenAiRealtimeCallReferRequest({
    required this.targetUri
  });

  factory OpenAiRealtimeCallReferRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiRealtimeCallReferRequest(
      targetUri: (() {
        final value = json['target_uri']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRealtimeCallReferRequest.target_uri is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'target_uri': targetUri,
    };
  }
}

class OpenAiRealtimeCallRejectRequest {
  final int? statusCode;

  OpenAiRealtimeCallRejectRequest({
    this.statusCode
  });

  factory OpenAiRealtimeCallRejectRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiRealtimeCallRejectRequest(
      statusCode: json['status_code'] is int ? json['status_code'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'status_code': statusCode,
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
  final Map<String, dynamic>? expiresAfter;
  final Map<String, dynamic>? session;

  OpenAiRealtimeClientSecretCreateRequest({
    this.expiresAfter,
    this.session
  });

  factory OpenAiRealtimeClientSecretCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiRealtimeClientSecretCreateRequest(
      expiresAfter: (() {
        final map = _sdkworkAsMap(json['expires_after']);
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
      session: (() {
        final map = _sdkworkAsMap(json['session']);
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
      'expires_after': expiresAfter?.map((key, item) => MapEntry(key, item)),
      'session': session?.map((key, item) => MapEntry(key, item)),
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
  final Map<String, dynamic> clientSecret;
  final String? inputAudioFormat;
  final Map<String, dynamic>? inputAudioTranscription;
  final String? instructions;
  final int? maxResponseOutputTokens;
  final List<String>? modalities;
  final String? outputAudioFormat;
  final Map<String, dynamic>? prompt;
  final double? speed;
  final double? temperature;
  final String? toolChoice;
  final List<Map<String, dynamic>>? tools;
  final Map<String, dynamic>? tracing;
  final Map<String, dynamic>? truncation;
  final Map<String, dynamic>? turnDetection;
  final String? voice;

  OpenAiRealtimeSessionCreateRequest({
    required this.clientSecret,
    this.inputAudioFormat,
    this.inputAudioTranscription,
    this.instructions,
    this.maxResponseOutputTokens,
    this.modalities,
    this.outputAudioFormat,
    this.prompt,
    this.speed,
    this.temperature,
    this.toolChoice,
    this.tools,
    this.tracing,
    this.truncation,
    this.turnDetection,
    this.voice
  });

  factory OpenAiRealtimeSessionCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiRealtimeSessionCreateRequest(
      clientSecret: (() {
        final map = _sdkworkAsMap(json['client_secret']);
        if (map == null) {
          throw FormatException('OpenAiRealtimeSessionCreateRequest.client_secret is required');
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
      inputAudioFormat: json['input_audio_format']?.toString(),
      inputAudioTranscription: (() {
        final map = _sdkworkAsMap(json['input_audio_transcription']);
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
      instructions: json['instructions']?.toString(),
      maxResponseOutputTokens: json['max_response_output_tokens'] is int ? json['max_response_output_tokens'] : null,
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
      outputAudioFormat: json['output_audio_format']?.toString(),
      prompt: (() {
        final map = _sdkworkAsMap(json['prompt']);
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
      speed: json['speed'] is num ? json['speed'].toDouble() : null,
      temperature: json['temperature'] is num ? json['temperature'].toDouble() : null,
      toolChoice: json['tool_choice']?.toString(),
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })())
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      tracing: (() {
        final map = _sdkworkAsMap(json['tracing']);
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
      truncation: (() {
        final map = _sdkworkAsMap(json['truncation']);
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
      turnDetection: (() {
        final map = _sdkworkAsMap(json['turn_detection']);
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
      voice: json['voice']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'client_secret': clientSecret.map((key, item) => MapEntry(key, item)),
      'input_audio_format': inputAudioFormat,
      'input_audio_transcription': inputAudioTranscription?.map((key, item) => MapEntry(key, item)),
      'instructions': instructions,
      'max_response_output_tokens': maxResponseOutputTokens,
      'modalities': modalities?.map((item) => item).toList(),
      'output_audio_format': outputAudioFormat,
      'prompt': prompt?.map((key, item) => MapEntry(key, item)),
      'speed': speed,
      'temperature': temperature,
      'tool_choice': toolChoice,
      'tools': tools?.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
      'tracing': tracing?.map((key, item) => MapEntry(key, item)),
      'truncation': truncation?.map((key, item) => MapEntry(key, item)),
      'turn_detection': turnDetection?.map((key, item) => MapEntry(key, item)),
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
  final List<String>? include;
  final String? inputAudioFormat;
  final Map<String, dynamic>? inputAudioNoiseReduction;
  final Map<String, dynamic>? inputAudioTranscription;
  final Map<String, dynamic>? turnDetection;

  OpenAiRealtimeTranscriptionSessionCreateRequest({
    this.include,
    this.inputAudioFormat,
    this.inputAudioNoiseReduction,
    this.inputAudioTranscription,
    this.turnDetection
  });

  factory OpenAiRealtimeTranscriptionSessionCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiRealtimeTranscriptionSessionCreateRequest(
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
      inputAudioFormat: json['input_audio_format']?.toString(),
      inputAudioNoiseReduction: (() {
        final map = _sdkworkAsMap(json['input_audio_noise_reduction']);
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
      inputAudioTranscription: (() {
        final map = _sdkworkAsMap(json['input_audio_transcription']);
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
      turnDetection: (() {
        final map = _sdkworkAsMap(json['turn_detection']);
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
      'include': include?.map((item) => item).toList(),
      'input_audio_format': inputAudioFormat,
      'input_audio_noise_reduction': inputAudioNoiseReduction?.map((key, item) => MapEntry(key, item)),
      'input_audio_transcription': inputAudioTranscription?.map((key, item) => MapEntry(key, item)),
      'turn_detection': turnDetection?.map((key, item) => MapEntry(key, item)),
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
  final Map<String, dynamic>? image;
  final dynamic input;
  final String? instructions;
  final String model;
  final String? previousResponseId;
  final String? promptCacheKey;
  final Map<String, dynamic>? promptCacheOptions;
  final String? promptCacheRetention;
  final String? serviceTier;

  OpenAiResponseCompactRequest({
    this.image,
    this.input,
    this.instructions,
    required this.model,
    this.previousResponseId,
    this.promptCacheKey,
    this.promptCacheOptions,
    this.promptCacheRetention,
    this.serviceTier
  });

  factory OpenAiResponseCompactRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiResponseCompactRequest(
      image: (() {
        final map = _sdkworkAsMap(json['image']);
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
      input: json['input']?.toString(),
      instructions: json['instructions']?.toString(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiResponseCompactRequest.model is required');
        }
        return value;
      })(),
      previousResponseId: json['previous_response_id']?.toString(),
      promptCacheKey: json['prompt_cache_key']?.toString(),
      promptCacheOptions: (() {
        final map = _sdkworkAsMap(json['prompt_cache_options']);
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
      promptCacheRetention: json['prompt_cache_retention']?.toString(),
      serviceTier: json['service_tier']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'image': image?.map((key, item) => MapEntry(key, item)),
      'input': input,
      'instructions': instructions,
      'model': model,
      'previous_response_id': previousResponseId,
      'prompt_cache_key': promptCacheKey,
      'prompt_cache_options': promptCacheOptions?.map((key, item) => MapEntry(key, item)),
      'prompt_cache_retention': promptCacheRetention,
      'service_tier': serviceTier,
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
  final dynamic conversation;
  final dynamic input;
  final String? instructions;
  final String? model;
  final bool? parallelToolCalls;
  final dynamic personality;
  final String? previousResponseId;
  final dynamic reasoning;
  final dynamic text;
  final dynamic toolChoice;
  final List<dynamic>? tools;
  final String? truncation;

  OpenAiResponseInputTokenCountRequest({
    this.conversation,
    this.input,
    this.instructions,
    this.model,
    this.parallelToolCalls,
    this.personality,
    this.previousResponseId,
    this.reasoning,
    this.text,
    this.toolChoice,
    this.tools,
    this.truncation
  });

  factory OpenAiResponseInputTokenCountRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiResponseInputTokenCountRequest(
      conversation: json['conversation']?.toString(),
      input: json['input']?.toString(),
      instructions: json['instructions']?.toString(),
      model: json['model']?.toString(),
      parallelToolCalls: json['parallel_tool_calls'] is bool ? json['parallel_tool_calls'] : null,
      personality: json['personality']?.toString(),
      previousResponseId: json['previous_response_id']?.toString(),
      reasoning: json['reasoning']?.toString(),
      text: json['text']?.toString(),
      toolChoice: json['tool_choice']?.toString(),
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
      truncation: json['truncation']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'conversation': conversation,
      'input': input,
      'instructions': instructions,
      'model': model,
      'parallel_tool_calls': parallelToolCalls,
      'personality': personality,
      'previous_response_id': previousResponseId,
      'reasoning': reasoning,
      'text': text,
      'tool_choice': toolChoice,
      'tools': tools?.map((item) => item).toList(),
      'truncation': truncation,
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
  final List<OpenAiThreadMessageCreateRequest>? additionalMessages;
  final String assistantId;
  final String? instructions;
  final int? maxCompletionTokens;
  final int? maxPromptTokens;
  final Map<String, dynamic>? metadata;
  final String? model;
  final bool? parallelToolCalls;
  final String? reasoningEffort;
  final dynamic responseFormat;
  final bool? stream;
  final double? temperature;
  final dynamic toolChoice;
  final List<dynamic>? tools;
  final double? topP;
  final dynamic truncationStrategy;

  OpenAiRunCreateRequest({
    this.additionalInstructions,
    this.additionalMessages,
    required this.assistantId,
    this.instructions,
    this.maxCompletionTokens,
    this.maxPromptTokens,
    this.metadata,
    this.model,
    this.parallelToolCalls,
    this.reasoningEffort,
    this.responseFormat,
    this.stream,
    this.temperature,
    this.toolChoice,
    this.tools,
    this.topP,
    this.truncationStrategy
  });

  factory OpenAiRunCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiRunCreateRequest(
      additionalInstructions: json['additional_instructions']?.toString(),
      additionalMessages: (() {
        final list = _sdkworkAsList(json['additional_messages']);
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
      assistantId: (() {
        final value = json['assistant_id']?.toString();
        if (value == null) {
          throw FormatException('OpenAiRunCreateRequest.assistant_id is required');
        }
        return value;
      })(),
      instructions: json['instructions']?.toString(),
      maxCompletionTokens: json['max_completion_tokens'] is int ? json['max_completion_tokens'] : null,
      maxPromptTokens: json['max_prompt_tokens'] is int ? json['max_prompt_tokens'] : null,
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
      parallelToolCalls: json['parallel_tool_calls'] is bool ? json['parallel_tool_calls'] : null,
      reasoningEffort: json['reasoning_effort']?.toString(),
      responseFormat: json['response_format']?.toString(),
      stream: json['stream'] is bool ? json['stream'] : null,
      temperature: json['temperature'] is num ? json['temperature'].toDouble() : null,
      toolChoice: json['tool_choice']?.toString(),
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
      topP: json['top_p'] is num ? json['top_p'].toDouble() : null,
      truncationStrategy: json['truncation_strategy']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'additional_instructions': additionalInstructions,
      'additional_messages': additionalMessages?.map((item) => item.toJson()).toList(),
      'assistant_id': assistantId,
      'instructions': instructions,
      'max_completion_tokens': maxCompletionTokens,
      'max_prompt_tokens': maxPromptTokens,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'parallel_tool_calls': parallelToolCalls,
      'reasoning_effort': reasoningEffort,
      'response_format': responseFormat,
      'stream': stream,
      'temperature': temperature,
      'tool_choice': toolChoice,
      'tools': tools?.map((item) => item).toList(),
      'top_p': topP,
      'truncation_strategy': truncationStrategy,
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
  final String input;
  final String? instructions;
  final String model;
  final String? responseFormat;
  final double? speed;
  final String? streamFormat;
  final String voice;

  OpenAiSpeechCreateRequest({
    required this.input,
    this.instructions,
    required this.model,
    this.responseFormat,
    this.speed,
    this.streamFormat,
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
      instructions: json['instructions']?.toString(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('OpenAiSpeechCreateRequest.model is required');
        }
        return value;
      })(),
      responseFormat: json['response_format']?.toString(),
      speed: json['speed'] is num ? json['speed'].toDouble() : null,
      streamFormat: json['stream_format']?.toString(),
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
      'instructions': instructions,
      'model': model,
      'response_format': responseFormat,
      'speed': speed,
      'stream_format': streamFormat,
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
  final int? maxCompletionTokens;
  final int? maxPromptTokens;
  final Map<String, dynamic>? metadata;
  final String? model;
  final bool? parallelToolCalls;
  final dynamic responseFormat;
  final bool? stream;
  final double? temperature;
  final OpenAiThreadCreateRequest? thread;
  final dynamic toolChoice;
  final dynamic toolResources;
  final List<dynamic>? tools;
  final double? topP;
  final dynamic truncationStrategy;

  OpenAiThreadAndRunCreateRequest({
    required this.assistantId,
    this.instructions,
    this.maxCompletionTokens,
    this.maxPromptTokens,
    this.metadata,
    this.model,
    this.parallelToolCalls,
    this.responseFormat,
    this.stream,
    this.temperature,
    this.thread,
    this.toolChoice,
    this.toolResources,
    this.tools,
    this.topP,
    this.truncationStrategy
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
      maxCompletionTokens: json['max_completion_tokens'] is int ? json['max_completion_tokens'] : null,
      maxPromptTokens: json['max_prompt_tokens'] is int ? json['max_prompt_tokens'] : null,
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
      parallelToolCalls: json['parallel_tool_calls'] is bool ? json['parallel_tool_calls'] : null,
      responseFormat: json['response_format']?.toString(),
      stream: json['stream'] is bool ? json['stream'] : null,
      temperature: json['temperature'] is num ? json['temperature'].toDouble() : null,
      thread: (() {
        final map = _sdkworkAsMap(json['thread']);
        return map == null ? null : OpenAiThreadCreateRequest.fromJson(map);
      })(),
      toolChoice: json['tool_choice']?.toString(),
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
      topP: json['top_p'] is num ? json['top_p'].toDouble() : null,
      truncationStrategy: json['truncation_strategy']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'assistant_id': assistantId,
      'instructions': instructions,
      'max_completion_tokens': maxCompletionTokens,
      'max_prompt_tokens': maxPromptTokens,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'parallel_tool_calls': parallelToolCalls,
      'response_format': responseFormat,
      'stream': stream,
      'temperature': temperature,
      'thread': thread?.toJson(),
      'tool_choice': toolChoice,
      'tool_resources': toolResources,
      'tools': tools?.map((item) => item).toList(),
      'top_p': topP,
      'truncation_strategy': truncationStrategy,
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
        if (!json.containsKey('content')) {
          throw FormatException('OpenAiThreadMessageCreateRequest.content is required');
        }
        final _sdkworkRequiredValue = json['content'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('OpenAiThreadMessageCreateRequest.content is required');
        }
        return value;
      })();
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
  final Map<String, dynamic>? expiresAfter;
  final String filename;
  final String mimeType;
  final String purpose;

  OpenAiUploadCreateRequest({
    required this.bytes,
    this.expiresAfter,
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
      expiresAfter: (() {
        final map = _sdkworkAsMap(json['expires_after']);
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
      'expires_after': expiresAfter?.map((key, item) => MapEntry(key, item)),
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
  final String? description;
  final dynamic expiresAfter;
  final List<String>? fileIds;
  final Map<String, dynamic>? metadata;
  final String? name;

  OpenAiVectorStoreCreateRequest({
    this.chunkingStrategy,
    this.description,
    this.expiresAfter,
    this.fileIds,
    this.metadata,
    this.name
  });

  factory OpenAiVectorStoreCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVectorStoreCreateRequest(
      chunkingStrategy: json['chunking_strategy']?.toString(),
      description: json['description']?.toString(),
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
      'description': description,
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
  final List<String>? fileIds;
  final List<Map<String, dynamic>>? files;

  OpenAiVectorStoreFileBatchCreateRequest({
    this.attributes,
    this.chunkingStrategy,
    this.fileIds,
    this.files
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
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      files: (() {
        final list = _sdkworkAsList(json['files']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
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
      'attributes': attributes?.map((key, item) => MapEntry(key, item)),
      'chunking_strategy': chunkingStrategy,
      'file_ids': fileIds?.map((item) => item).toList(),
      'files': files?.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
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
  final Map<String, dynamic>? inputReference;
  final String? model;
  final String prompt;
  final String? seconds;
  final String? size;

  OpenAiVideoCreateRequest({
    this.inputReference,
    this.model,
    required this.prompt,
    this.seconds,
    this.size
  });

  factory OpenAiVideoCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVideoCreateRequest(
      inputReference: (() {
        final map = _sdkworkAsMap(json['input_reference']);
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
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVideoCreateRequest.prompt is required');
        }
        return value;
      })(),
      seconds: json['seconds']?.toString(),
      size: json['size']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'input_reference': inputReference?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'prompt': prompt,
      'seconds': seconds,
      'size': size,
    };
  }
}

class OpenAiVideoEditRequest {
  final String prompt;
  final dynamic video;

  OpenAiVideoEditRequest({
    required this.prompt,
    required this.video
  });

  factory OpenAiVideoEditRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVideoEditRequest(
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVideoEditRequest.prompt is required');
        }
        return value;
      })(),
      video: (() {
        if (!json.containsKey('video')) {
          throw FormatException('OpenAiVideoEditRequest.video is required');
        }
        final _sdkworkRequiredValue = json['video'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('OpenAiVideoEditRequest.video is required');
        }
        return value;
      })();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'prompt': prompt,
      'video': video,
    };
  }
}

class OpenAiVideoExtendRequest {
  final String prompt;
  final String seconds;
  final dynamic video;

  OpenAiVideoExtendRequest({
    required this.prompt,
    required this.seconds,
    required this.video
  });

  factory OpenAiVideoExtendRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVideoExtendRequest(
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVideoExtendRequest.prompt is required');
        }
        return value;
      })(),
      seconds: (() {
        final value = json['seconds']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVideoExtendRequest.seconds is required');
        }
        return value;
      })(),
      video: (() {
        if (!json.containsKey('video')) {
          throw FormatException('OpenAiVideoExtendRequest.video is required');
        }
        final _sdkworkRequiredValue = json['video'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('OpenAiVideoExtendRequest.video is required');
        }
        return value;
      })();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'prompt': prompt,
      'seconds': seconds,
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
  final String prompt;

  OpenAiVideoRemixRequest({
    required this.prompt
  });

  factory OpenAiVideoRemixRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVideoRemixRequest(
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVideoRemixRequest.prompt is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'prompt': prompt,
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
  final String? name;

  OpenAiVoiceConsentUpdateRequest({
    this.name
  });

  factory OpenAiVoiceConsentUpdateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVoiceConsentUpdateRequest(
      name: json['name']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'name': name,
    };
  }
}

class OpenAiVoiceCreateMultipartRequest {
  final String? file;
  final String? model;
  final String? name;
  final String? prompt;
  final String? scriptHint;
  final String? type;

  OpenAiVoiceCreateMultipartRequest({
    this.file,
    this.model,
    this.name,
    this.prompt,
    this.scriptHint,
    this.type
  });

  factory OpenAiVoiceCreateMultipartRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVoiceCreateMultipartRequest(
      file: json['file']?.toString(),
      model: json['model']?.toString(),
      name: json['name']?.toString(),
      prompt: json['prompt']?.toString(),
      scriptHint: json['script_hint']?.toString(),
      type: json['type']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'file': file,
      'model': model,
      'name': name,
      'prompt': prompt,
      'script_hint': scriptHint,
      'type': type,
    };
  }
}

class OpenAiVoiceCreateRequest {
  final String? model;
  final String name;
  final String prompt;
  final String? scriptHint;
  final String type;

  OpenAiVoiceCreateRequest({
    this.model,
    required this.name,
    required this.prompt,
    this.scriptHint,
    required this.type
  });

  factory OpenAiVoiceCreateRequest.fromJson(Map<String, dynamic> json) {
    return OpenAiVoiceCreateRequest(
      model: json['model']?.toString(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVoiceCreateRequest.name is required');
        }
        return value;
      })(),
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVoiceCreateRequest.prompt is required');
        }
        return value;
      })(),
      scriptHint: json['script_hint']?.toString(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('OpenAiVoiceCreateRequest.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'model': model,
      'name': name,
      'prompt': prompt,
      'script_hint': scriptHint,
      'type': type,
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

class PixverseErrorDetail {
  final String? message;
  final Map<String, dynamic>? param;
  final String? type;

  PixverseErrorDetail({
    this.message,
    this.param,
    this.type
  });

  factory PixverseErrorDetail.fromJson(Map<String, dynamic> json) {
    return PixverseErrorDetail(
      message: json['Message']?.toString(),
      param: (() {
        final map = _sdkworkAsMap(json['Param']);
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
      type: json['Type']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'Message': message,
      'Param': param?.map((key, item) => MapEntry(key, item)),
      'Type': type,
    };
  }
}

class PixverseTaskResp {
  final String? aspectRatio;
  final String? createTime;
  final int? credits;
  final Map<String, dynamic>? customerPaths;
  final int? duration;
  final bool? hasAudio;
  final int? id;
  final String? modifyTime;
  final String? negativePrompt;
  final int? outputHeight;
  final int? outputWidth;
  final String? path;
  final String? prompt;
  final String? quality;
  final int? resolutionRatio;
  final int? seed;
  final int? size;
  final int? status;
  final String? style;
  final String? url;
  final int? videoId;

  PixverseTaskResp({
    this.aspectRatio,
    this.createTime,
    this.credits,
    this.customerPaths,
    this.duration,
    this.hasAudio,
    this.id,
    this.modifyTime,
    this.negativePrompt,
    this.outputHeight,
    this.outputWidth,
    this.path,
    this.prompt,
    this.quality,
    this.resolutionRatio,
    this.seed,
    this.size,
    this.status,
    this.style,
    this.url,
    this.videoId
  });

  factory PixverseTaskResp.fromJson(Map<String, dynamic> json) {
    return PixverseTaskResp(
      aspectRatio: json['aspect_ratio']?.toString(),
      createTime: json['create_time']?.toString(),
      credits: json['credits'] is int ? json['credits'] : null,
      customerPaths: (() {
        final map = _sdkworkAsMap(json['customer_paths']);
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
      duration: json['duration'] is int ? json['duration'] : null,
      hasAudio: json['has_audio'] is bool ? json['has_audio'] : null,
      id: json['id'] is int ? json['id'] : null,
      modifyTime: json['modify_time']?.toString(),
      negativePrompt: json['negative_prompt']?.toString(),
      outputHeight: json['outputHeight'] is int ? json['outputHeight'] : null,
      outputWidth: json['outputWidth'] is int ? json['outputWidth'] : null,
      path: json['path']?.toString(),
      prompt: json['prompt']?.toString(),
      quality: json['quality']?.toString(),
      resolutionRatio: json['resolution_ratio'] is int ? json['resolution_ratio'] : null,
      seed: json['seed'] is int ? json['seed'] : null,
      size: json['size'] is int ? json['size'] : null,
      status: json['status'] is int ? json['status'] : null,
      style: json['style']?.toString(),
      url: json['url']?.toString(),
      videoId: json['video_id'] is int ? json['video_id'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'create_time': createTime,
      'credits': credits,
      'customer_paths': customerPaths?.map((key, item) => MapEntry(key, item)),
      'duration': duration,
      'has_audio': hasAudio,
      'id': id,
      'modify_time': modifyTime,
      'negative_prompt': negativePrompt,
      'outputHeight': outputHeight,
      'outputWidth': outputWidth,
      'path': path,
      'prompt': prompt,
      'quality': quality,
      'resolution_ratio': resolutionRatio,
      'seed': seed,
      'size': size,
      'status': status,
      'style': style,
      'url': url,
      'video_id': videoId,
    };
  }
}

class PixverseVideoGenerationRequest {
  final String aspectRatio;
  final int duration;
  final bool? generateAudioSwitch;
  final bool? generateMultiClipSwitch;
  final String model;
  final String prompt;
  final String quality;
  final int? seed;
  final String? webhookId;

  PixverseVideoGenerationRequest({
    required this.aspectRatio,
    required this.duration,
    this.generateAudioSwitch,
    this.generateMultiClipSwitch,
    required this.model,
    required this.prompt,
    required this.quality,
    this.seed,
    this.webhookId
  });

  factory PixverseVideoGenerationRequest.fromJson(Map<String, dynamic> json) {
    return PixverseVideoGenerationRequest(
      aspectRatio: (() {
        final value = json['aspect_ratio']?.toString();
        if (value == null) {
          throw FormatException('PixverseVideoGenerationRequest.aspect_ratio is required');
        }
        return value;
      })(),
      duration: (() {
        final value = json['duration'];
        if (value is! int) {
          throw FormatException('PixverseVideoGenerationRequest.duration is required');
        }
        return value;
      })(),
      generateAudioSwitch: json['generate_audio_switch'] is bool ? json['generate_audio_switch'] : null,
      generateMultiClipSwitch: json['generate_multi_clip_switch'] is bool ? json['generate_multi_clip_switch'] : null,
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('PixverseVideoGenerationRequest.model is required');
        }
        return value;
      })(),
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('PixverseVideoGenerationRequest.prompt is required');
        }
        return value;
      })(),
      quality: (() {
        final value = json['quality']?.toString();
        if (value == null) {
          throw FormatException('PixverseVideoGenerationRequest.quality is required');
        }
        return value;
      })(),
      seed: json['seed'] is int ? json['seed'] : null,
      webhookId: json['webhook_id']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'duration': duration,
      'generate_audio_switch': generateAudioSwitch,
      'generate_multi_clip_switch': generateMultiClipSwitch,
      'model': model,
      'prompt': prompt,
      'quality': quality,
      'seed': seed,
      'webhook_id': webhookId,
    };
  }
}

class PixverseVideoGenerationResponse {
  final int? errCode;
  final String? errMsg;
  final PixverseErrorDetail? error;
  final PixverseTaskResp? resp;

  PixverseVideoGenerationResponse({
    this.errCode,
    this.errMsg,
    this.error,
    this.resp
  });

  factory PixverseVideoGenerationResponse.fromJson(Map<String, dynamic> json) {
    return PixverseVideoGenerationResponse(
      errCode: json['ErrCode'] is int ? json['ErrCode'] : null,
      errMsg: json['ErrMsg']?.toString(),
      error: (() {
        final map = _sdkworkAsMap(json['Error']);
        return map == null ? null : PixverseErrorDetail.fromJson(map);
      })(),
      resp: (() {
        final map = _sdkworkAsMap(json['Resp']);
        return map == null ? null : PixverseTaskResp.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'ErrCode': errCode,
      'ErrMsg': errMsg,
      'Error': error?.toJson(),
      'Resp': resp?.toJson(),
    };
  }
}

class PixverseVideoGenerationTask {
  final int? errCode;
  final String? errMsg;
  final PixverseErrorDetail? error;
  final PixverseTaskResp? resp;

  PixverseVideoGenerationTask({
    this.errCode,
    this.errMsg,
    this.error,
    this.resp
  });

  factory PixverseVideoGenerationTask.fromJson(Map<String, dynamic> json) {
    return PixverseVideoGenerationTask(
      errCode: json['ErrCode'] is int ? json['ErrCode'] : null,
      errMsg: json['ErrMsg']?.toString(),
      error: (() {
        final map = _sdkworkAsMap(json['Error']);
        return map == null ? null : PixverseErrorDetail.fromJson(map);
      })(),
      resp: (() {
        final map = _sdkworkAsMap(json['Resp']);
        return map == null ? null : PixverseTaskResp.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'ErrCode': errCode,
      'ErrMsg': errMsg,
      'Error': error?.toJson(),
      'Resp': resp?.toJson(),
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

class RunwayImageToVideoRequest {
  final bool? audio;
  final String? bitrate;
  final double? cfgScale;
  final Map<String, dynamic>? contentModeration;
  final bool? draft;
  final int? duration;
  final String model;
  final String? negativePrompt;
  final String? outputFormat;
  final String? promptExpansionMode;
  final String promptImage;
  final String? promptText;
  final String? proresProfile;
  final Map<String, dynamic>? providerSettings;
  final String? ratio;
  final List<Map<String, dynamic>>? referenceAudio;
  final List<Map<String, dynamic>>? referenceVideos;
  final List<Map<String, dynamic>>? references;
  final String? resolution;
  final int? seed;

  RunwayImageToVideoRequest({
    this.audio,
    this.bitrate,
    this.cfgScale,
    this.contentModeration,
    this.draft,
    this.duration,
    required this.model,
    this.negativePrompt,
    this.outputFormat,
    this.promptExpansionMode,
    required this.promptImage,
    this.promptText,
    this.proresProfile,
    this.providerSettings,
    this.ratio,
    this.referenceAudio,
    this.referenceVideos,
    this.references,
    this.resolution,
    this.seed
  });

  factory RunwayImageToVideoRequest.fromJson(Map<String, dynamic> json) {
    return RunwayImageToVideoRequest(
      audio: json['audio'] is bool ? json['audio'] : null,
      bitrate: json['bitrate']?.toString(),
      cfgScale: json['cfgScale'] is num ? json['cfgScale'].toDouble() : null,
      contentModeration: (() {
        final map = _sdkworkAsMap(json['contentModeration']);
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
      draft: json['draft'] is bool ? json['draft'] : null,
      duration: json['duration'] is int ? json['duration'] : null,
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('RunwayImageToVideoRequest.model is required');
        }
        return value;
      })(),
      negativePrompt: json['negativePrompt']?.toString(),
      outputFormat: json['outputFormat']?.toString(),
      promptExpansionMode: json['promptExpansionMode']?.toString(),
      promptImage: (() {
        final value = json['promptImage']?.toString();
        if (value == null) {
          throw FormatException('RunwayImageToVideoRequest.promptImage is required');
        }
        return value;
      })(),
      promptText: json['promptText']?.toString(),
      proresProfile: json['proresProfile']?.toString(),
      providerSettings: (() {
        final map = _sdkworkAsMap(json['providerSettings']);
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
      ratio: json['ratio']?.toString(),
      referenceAudio: (() {
        final list = _sdkworkAsList(json['referenceAudio']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })())
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      referenceVideos: (() {
        final list = _sdkworkAsList(json['referenceVideos']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })())
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      references: (() {
        final list = _sdkworkAsList(json['references']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })())
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      resolution: json['resolution']?.toString(),
      seed: json['seed'] is int ? json['seed'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'audio': audio,
      'bitrate': bitrate,
      'cfgScale': cfgScale,
      'contentModeration': contentModeration?.map((key, item) => MapEntry(key, item)),
      'draft': draft,
      'duration': duration,
      'model': model,
      'negativePrompt': negativePrompt,
      'outputFormat': outputFormat,
      'promptExpansionMode': promptExpansionMode,
      'promptImage': promptImage,
      'promptText': promptText,
      'proresProfile': proresProfile,
      'providerSettings': providerSettings?.map((key, item) => MapEntry(key, item)),
      'ratio': ratio,
      'referenceAudio': referenceAudio?.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
      'referenceVideos': referenceVideos?.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
      'references': references?.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
      'resolution': resolution,
      'seed': seed,
    };
  }
}

class RunwayTask {
  final String? createdAt;
  final String? failure;
  final String? failureCode;
  final String? id;
  final List<String>? output;
  final double? progress;
  final String? status;

  RunwayTask({
    this.createdAt,
    this.failure,
    this.failureCode,
    this.id,
    this.output,
    this.progress,
    this.status
  });

  factory RunwayTask.fromJson(Map<String, dynamic> json) {
    return RunwayTask(
      createdAt: json['createdAt']?.toString(),
      failure: json['failure']?.toString(),
      failureCode: json['failureCode']?.toString(),
      id: json['id']?.toString(),
      output: (() {
        final list = _sdkworkAsList(json['output']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      progress: json['progress'] is num ? json['progress'].toDouble() : null,
      status: json['status']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'createdAt': createdAt,
      'failure': failure,
      'failureCode': failureCode,
      'id': id,
      'output': output?.map((item) => item).toList(),
      'progress': progress,
      'status': status,
    };
  }
}

class RunwayTaskAccepted {
  final Map<String, dynamic>? estimatedCost;
  final String id;

  RunwayTaskAccepted({
    this.estimatedCost,
    required this.id
  });

  factory RunwayTaskAccepted.fromJson(Map<String, dynamic> json) {
    return RunwayTaskAccepted(
      estimatedCost: (() {
        final map = _sdkworkAsMap(json['estimatedCost']);
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
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('RunwayTaskAccepted.id is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'estimatedCost': estimatedCost?.map((key, item) => MapEntry(key, item)),
      'id': id,
    };
  }
}

class RunwayTextToImageRequest {
  final String? background;
  final String? backgroundColor;
  final List<String>? colors;
  final Map<String, dynamic>? contentModeration;
  final bool? edit;
  final bool? grounding;
  final String? maskUri;
  final String? model;
  final int? outputCount;
  final String? outputFormat;
  final bool? preciseEdit;
  final String promptText;
  final String? quality;
  final String? ratio;
  final List<Map<String, dynamic>>? referenceImages;
  final int? seed;
  final String? thinkingLevel;

  RunwayTextToImageRequest({
    this.background,
    this.backgroundColor,
    this.colors,
    this.contentModeration,
    this.edit,
    this.grounding,
    this.maskUri,
    this.model,
    this.outputCount,
    this.outputFormat,
    this.preciseEdit,
    required this.promptText,
    this.quality,
    this.ratio,
    this.referenceImages,
    this.seed,
    this.thinkingLevel
  });

  factory RunwayTextToImageRequest.fromJson(Map<String, dynamic> json) {
    return RunwayTextToImageRequest(
      background: json['background']?.toString(),
      backgroundColor: json['backgroundColor']?.toString(),
      colors: (() {
        final list = _sdkworkAsList(json['colors']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      contentModeration: (() {
        final map = _sdkworkAsMap(json['contentModeration']);
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
      edit: json['edit'] is bool ? json['edit'] : null,
      grounding: json['grounding'] is bool ? json['grounding'] : null,
      maskUri: json['maskUri']?.toString(),
      model: json['model']?.toString(),
      outputCount: json['outputCount'] is int ? json['outputCount'] : null,
      outputFormat: json['outputFormat']?.toString(),
      preciseEdit: json['preciseEdit'] is bool ? json['preciseEdit'] : null,
      promptText: (() {
        final value = json['promptText']?.toString();
        if (value == null) {
          throw FormatException('RunwayTextToImageRequest.promptText is required');
        }
        return value;
      })(),
      quality: json['quality']?.toString(),
      ratio: json['ratio']?.toString(),
      referenceImages: (() {
        final list = _sdkworkAsList(json['referenceImages']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })())
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      seed: json['seed'] is int ? json['seed'] : null,
      thinkingLevel: json['thinkingLevel']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'background': background,
      'backgroundColor': backgroundColor,
      'colors': colors?.map((item) => item).toList(),
      'contentModeration': contentModeration?.map((key, item) => MapEntry(key, item)),
      'edit': edit,
      'grounding': grounding,
      'maskUri': maskUri,
      'model': model,
      'outputCount': outputCount,
      'outputFormat': outputFormat,
      'preciseEdit': preciseEdit,
      'promptText': promptText,
      'quality': quality,
      'ratio': ratio,
      'referenceImages': referenceImages?.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
      'seed': seed,
      'thinkingLevel': thinkingLevel,
    };
  }
}

class RunwayTextToVideoRequest {
  final bool? audio;
  final String? bitrate;
  final double? cfgScale;
  final Map<String, dynamic>? contentModeration;
  final bool? draft;
  final String? draftTaskId;
  final int? duration;
  final String model;
  final String? negativePrompt;
  final String? outputFormat;
  final String? promptExpansionMode;
  final String promptText;
  final String? proresProfile;
  final Map<String, dynamic>? providerSettings;
  final String? ratio;
  final List<Map<String, dynamic>>? referenceAudio;
  final List<Map<String, dynamic>>? referenceVideos;
  final List<Map<String, dynamic>>? references;
  final String? resolution;
  final int? seed;

  RunwayTextToVideoRequest({
    this.audio,
    this.bitrate,
    this.cfgScale,
    this.contentModeration,
    this.draft,
    this.draftTaskId,
    this.duration,
    required this.model,
    this.negativePrompt,
    this.outputFormat,
    this.promptExpansionMode,
    required this.promptText,
    this.proresProfile,
    this.providerSettings,
    this.ratio,
    this.referenceAudio,
    this.referenceVideos,
    this.references,
    this.resolution,
    this.seed
  });

  factory RunwayTextToVideoRequest.fromJson(Map<String, dynamic> json) {
    return RunwayTextToVideoRequest(
      audio: json['audio'] is bool ? json['audio'] : null,
      bitrate: json['bitrate']?.toString(),
      cfgScale: json['cfgScale'] is num ? json['cfgScale'].toDouble() : null,
      contentModeration: (() {
        final map = _sdkworkAsMap(json['contentModeration']);
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
      draft: json['draft'] is bool ? json['draft'] : null,
      draftTaskId: json['draftTaskId']?.toString(),
      duration: json['duration'] is int ? json['duration'] : null,
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('RunwayTextToVideoRequest.model is required');
        }
        return value;
      })(),
      negativePrompt: json['negativePrompt']?.toString(),
      outputFormat: json['outputFormat']?.toString(),
      promptExpansionMode: json['promptExpansionMode']?.toString(),
      promptText: (() {
        final value = json['promptText']?.toString();
        if (value == null) {
          throw FormatException('RunwayTextToVideoRequest.promptText is required');
        }
        return value;
      })(),
      proresProfile: json['proresProfile']?.toString(),
      providerSettings: (() {
        final map = _sdkworkAsMap(json['providerSettings']);
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
      ratio: json['ratio']?.toString(),
      referenceAudio: (() {
        final list = _sdkworkAsList(json['referenceAudio']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })())
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      referenceVideos: (() {
        final list = _sdkworkAsList(json['referenceVideos']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })())
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      references: (() {
        final list = _sdkworkAsList(json['references']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })())
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      resolution: json['resolution']?.toString(),
      seed: json['seed'] is int ? json['seed'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'audio': audio,
      'bitrate': bitrate,
      'cfgScale': cfgScale,
      'contentModeration': contentModeration?.map((key, item) => MapEntry(key, item)),
      'draft': draft,
      'draftTaskId': draftTaskId,
      'duration': duration,
      'model': model,
      'negativePrompt': negativePrompt,
      'outputFormat': outputFormat,
      'promptExpansionMode': promptExpansionMode,
      'promptText': promptText,
      'proresProfile': proresProfile,
      'providerSettings': providerSettings?.map((key, item) => MapEntry(key, item)),
      'ratio': ratio,
      'referenceAudio': referenceAudio?.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
      'referenceVideos': referenceVideos?.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
      'references': references?.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
      'resolution': resolution,
      'seed': seed,
    };
  }
}

class StabilityAudioRequest {
  final double? cfgScale;
  final double? duration;
  final String? model;
  final String? outputFormat;
  final String prompt;
  final int? seed;
  final int? steps;

  StabilityAudioRequest({
    this.cfgScale,
    this.duration,
    this.model,
    this.outputFormat,
    required this.prompt,
    this.seed,
    this.steps
  });

  factory StabilityAudioRequest.fromJson(Map<String, dynamic> json) {
    return StabilityAudioRequest(
      cfgScale: json['cfg_scale'] is num ? json['cfg_scale'].toDouble() : null,
      duration: json['duration'] is num ? json['duration'].toDouble() : null,
      model: json['model']?.toString(),
      outputFormat: json['output_format']?.toString(),
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('StabilityAudioRequest.prompt is required');
        }
        return value;
      })(),
      seed: json['seed'] is int ? json['seed'] : null,
      steps: json['steps'] is int ? json['steps'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cfg_scale': cfgScale,
      'duration': duration,
      'model': model,
      'output_format': outputFormat,
      'prompt': prompt,
      'seed': seed,
      'steps': steps,
    };
  }
}

class StabilityImageGenerationRequest {
  final String? aspectRatio;
  final double? cfgScale;
  final String? image;
  final String? mode;
  final String? model;
  final String? negativePrompt;
  final String? outputFormat;
  final String prompt;
  final int? seed;
  final double? strength;
  final String? stylePreset;

  StabilityImageGenerationRequest({
    this.aspectRatio,
    this.cfgScale,
    this.image,
    this.mode,
    this.model,
    this.negativePrompt,
    this.outputFormat,
    required this.prompt,
    this.seed,
    this.strength,
    this.stylePreset
  });

  factory StabilityImageGenerationRequest.fromJson(Map<String, dynamic> json) {
    return StabilityImageGenerationRequest(
      aspectRatio: json['aspect_ratio']?.toString(),
      cfgScale: json['cfg_scale'] is num ? json['cfg_scale'].toDouble() : null,
      image: json['image']?.toString(),
      mode: json['mode']?.toString(),
      model: json['model']?.toString(),
      negativePrompt: json['negative_prompt']?.toString(),
      outputFormat: json['output_format']?.toString(),
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('StabilityImageGenerationRequest.prompt is required');
        }
        return value;
      })(),
      seed: json['seed'] is int ? json['seed'] : null,
      strength: json['strength'] is num ? json['strength'].toDouble() : null,
      stylePreset: json['style_preset']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'cfg_scale': cfgScale,
      'image': image,
      'mode': mode,
      'model': model,
      'negative_prompt': negativePrompt,
      'output_format': outputFormat,
      'prompt': prompt,
      'seed': seed,
      'strength': strength,
      'style_preset': stylePreset,
    };
  }
}

class StabilityImageGenerationResponse {
  final String? finishReason;
  final String? image;
  final int? seed;

  StabilityImageGenerationResponse({
    this.finishReason,
    this.image,
    this.seed
  });

  factory StabilityImageGenerationResponse.fromJson(Map<String, dynamic> json) {
    return StabilityImageGenerationResponse(
      finishReason: json['finish_reason']?.toString(),
      image: json['image']?.toString(),
      seed: json['seed'] is int ? json['seed'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'finish_reason': finishReason,
      'image': image,
      'seed': seed,
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

class TypeSafeAnswer {
  final String? choice;
  final double? confidence;
  final Map<String, String>? legend;
  final double? noul;
  final Map<String, double>? probabilities;
  final double? score;
  final String type;

  TypeSafeAnswer({
    this.choice,
    this.confidence,
    this.legend,
    this.noul,
    this.probabilities,
    this.score,
    required this.type
  });

  factory TypeSafeAnswer.fromJson(Map<String, dynamic> json) {
    return TypeSafeAnswer(
      choice: json['choice']?.toString(),
      confidence: json['confidence'] is num ? json['confidence'].toDouble() : null,
      legend: (() {
        final map = _sdkworkAsMap(json['legend']);
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
      noul: json['noul'] is num ? json['noul'].toDouble() : null,
      probabilities: (() {
        final map = _sdkworkAsMap(json['probabilities']);
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
      score: json['score'] is num ? json['score'].toDouble() : null,
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('TypeSafeAnswer.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'choice': choice,
      'confidence': confidence,
      'legend': legend?.map((key, item) => MapEntry(key, item)),
      'noul': noul,
      'probabilities': probabilities?.map((key, item) => MapEntry(key, item)),
      'score': score,
      'type': type,
    };
  }
}

class TypeSafeQuestion {
  final dynamic criteria;
  final String instructions;
  final String type;

  TypeSafeQuestion({
    this.criteria,
    required this.instructions,
    required this.type
  });

  factory TypeSafeQuestion.fromJson(Map<String, dynamic> json) {
    return TypeSafeQuestion(
      criteria: json['criteria']?.toString(),
      instructions: (() {
        final value = json['instructions']?.toString();
        if (value == null) {
          throw FormatException('TypeSafeQuestion.instructions is required');
        }
        return value;
      })(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('TypeSafeQuestion.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'criteria': criteria,
      'instructions': instructions,
      'type': type,
    };
  }
}

class TypeSafeSystemOneRequest {
  final String? model;
  final Map<String, TypeSafeQuestion> questions;
  final dynamic state;

  TypeSafeSystemOneRequest({
    this.model,
    required this.questions,
    required this.state
  });

  factory TypeSafeSystemOneRequest.fromJson(Map<String, dynamic> json) {
    return TypeSafeSystemOneRequest(
      model: json['model']?.toString(),
      questions: (() {
        final map = _sdkworkAsMap(json['questions']);
        if (map == null) {
          throw FormatException('TypeSafeSystemOneRequest.questions is required');
        }
        final result = <String, TypeSafeQuestion>{};
        map.forEach((key, item) {
          final deserialized = (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : TypeSafeQuestion.fromJson(map);
      })();
          if (deserialized is TypeSafeQuestion) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      state: (() {
        if (!json.containsKey('state')) {
          throw FormatException('TypeSafeSystemOneRequest.state is required');
        }
        final _sdkworkRequiredValue = json['state'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('TypeSafeSystemOneRequest.state is required');
        }
        return value;
      })();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'model': model,
      'questions': questions.map((key, item) => MapEntry(key, item.toJson())),
      'state': state,
    };
  }
}

class TypeSafeSystemOneResponse {
  final Map<String, TypeSafeAnswer> answers;
  final String? model;
  final TypeSafeUsage? usage;

  TypeSafeSystemOneResponse({
    required this.answers,
    this.model,
    this.usage
  });

  factory TypeSafeSystemOneResponse.fromJson(Map<String, dynamic> json) {
    return TypeSafeSystemOneResponse(
      answers: (() {
        final map = _sdkworkAsMap(json['answers']);
        if (map == null) {
          throw FormatException('TypeSafeSystemOneResponse.answers is required');
        }
        final result = <String, TypeSafeAnswer>{};
        map.forEach((key, item) {
          final deserialized = (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : TypeSafeAnswer.fromJson(map);
      })();
          if (deserialized is TypeSafeAnswer) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      model: json['model']?.toString(),
      usage: (() {
        final map = _sdkworkAsMap(json['usage']);
        return map == null ? null : TypeSafeUsage.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'answers': answers.map((key, item) => MapEntry(key, item.toJson())),
      'model': model,
      'usage': usage?.toJson(),
    };
  }
}

class TypeSafeUsage {
  final int? inputTokens;
  final int? outputTokens;

  TypeSafeUsage({
    this.inputTokens,
    this.outputTokens
  });

  factory TypeSafeUsage.fromJson(Map<String, dynamic> json) {
    return TypeSafeUsage(
      inputTokens: json['input_tokens'] is int ? json['input_tokens'] : null,
      outputTokens: json['output_tokens'] is int ? json['output_tokens'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'input_tokens': inputTokens,
      'output_tokens': outputTokens,
    };
  }
}

class ViduAudioGenerationTask {
  final String? createdAt;
  final List<ViduCreation>? creations;
  final int? credits;
  final int? duration;
  final String? errCode;
  final String? model;
  final String? prompt;
  final int? seed;
  final String? state;
  final String? taskId;

  ViduAudioGenerationTask({
    this.createdAt,
    this.creations,
    this.credits,
    this.duration,
    this.errCode,
    this.model,
    this.prompt,
    this.seed,
    this.state,
    this.taskId
  });

  factory ViduAudioGenerationTask.fromJson(Map<String, dynamic> json) {
    return ViduAudioGenerationTask(
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
      credits: json['credits'] is int ? json['credits'] : null,
      duration: json['duration'] is int ? json['duration'] : null,
      errCode: json['err_code']?.toString(),
      model: json['model']?.toString(),
      prompt: json['prompt']?.toString(),
      seed: json['seed'] is int ? json['seed'] : null,
      state: json['state']?.toString(),
      taskId: json['task_id']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created_at': createdAt,
      'creations': creations?.map((item) => item.toJson()).toList(),
      'credits': credits,
      'duration': duration,
      'err_code': errCode,
      'model': model,
      'prompt': prompt,
      'seed': seed,
      'state': state,
      'task_id': taskId,
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
  final String? watermarkedUrl;
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
    this.watermarkedUrl,
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
      watermarkedUrl: json['watermarked_url']?.toString(),
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
      'watermarked_url': watermarkedUrl,
      'width': width,
    };
  }
}

class ViduImageGenerationTask {
  final String? aspectRatio;
  final String? callbackUrl;
  final String? createdAt;
  final List<ViduCreation>? creations;
  final int? credits;
  final int? duration;
  final String? errCode;
  final List<String>? images;
  final String? model;
  final bool? offPeak;
  final String? payload;
  final String? prompt;
  final String? resolution;
  final int? seed;
  final String? state;
  final String? taskId;
  final bool? watermark;

  ViduImageGenerationTask({
    this.aspectRatio,
    this.callbackUrl,
    this.createdAt,
    this.creations,
    this.credits,
    this.duration,
    this.errCode,
    this.images,
    this.model,
    this.offPeak,
    this.payload,
    this.prompt,
    this.resolution,
    this.seed,
    this.state,
    this.taskId,
    this.watermark
  });

  factory ViduImageGenerationTask.fromJson(Map<String, dynamic> json) {
    return ViduImageGenerationTask(
      aspectRatio: json['aspect_ratio']?.toString(),
      callbackUrl: json['callback_url']?.toString(),
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
      credits: json['credits'] is int ? json['credits'] : null,
      duration: json['duration'] is int ? json['duration'] : null,
      errCode: json['err_code']?.toString(),
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
      offPeak: json['off_peak'] is bool ? json['off_peak'] : null,
      payload: json['payload']?.toString(),
      prompt: json['prompt']?.toString(),
      resolution: json['resolution']?.toString(),
      seed: json['seed'] is int ? json['seed'] : null,
      state: json['state']?.toString(),
      taskId: json['task_id']?.toString(),
      watermark: json['watermark'] is bool ? json['watermark'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'callback_url': callbackUrl,
      'created_at': createdAt,
      'creations': creations?.map((item) => item.toJson()).toList(),
      'credits': credits,
      'duration': duration,
      'err_code': errCode,
      'images': images?.map((item) => item).toList(),
      'model': model,
      'off_peak': offPeak,
      'payload': payload,
      'prompt': prompt,
      'resolution': resolution,
      'seed': seed,
      'state': state,
      'task_id': taskId,
      'watermark': watermark,
    };
  }
}

class ViduImageToVideoRequest {
  final bool? audio;
  final String? callbackUrl;
  final int? duration;
  final List<String> images;
  final bool? isRec;
  final String? metaData;
  final String model;
  final bool? offPeak;
  final String? payload;
  final String? prompt;
  final String? resolution;
  final int? seed;
  final bool? watermark;
  final int? wmPosition;
  final String? wmUrl;

  ViduImageToVideoRequest({
    this.audio,
    this.callbackUrl,
    this.duration,
    required this.images,
    this.isRec,
    this.metaData,
    required this.model,
    this.offPeak,
    this.payload,
    this.prompt,
    this.resolution,
    this.seed,
    this.watermark,
    this.wmPosition,
    this.wmUrl
  });

  factory ViduImageToVideoRequest.fromJson(Map<String, dynamic> json) {
    return ViduImageToVideoRequest(
      audio: json['audio'] is bool ? json['audio'] : null,
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
      isRec: json['is_rec'] is bool ? json['is_rec'] : null,
      metaData: json['meta_data']?.toString(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('ViduImageToVideoRequest.model is required');
        }
        return value;
      })(),
      offPeak: json['off_peak'] is bool ? json['off_peak'] : null,
      payload: json['payload']?.toString(),
      prompt: json['prompt']?.toString(),
      resolution: json['resolution']?.toString(),
      seed: json['seed'] is int ? json['seed'] : null,
      watermark: json['watermark'] is bool ? json['watermark'] : null,
      wmPosition: json['wm_position'] is int ? json['wm_position'] : null,
      wmUrl: json['wm_url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'audio': audio,
      'callback_url': callbackUrl,
      'duration': duration,
      'images': images.map((item) => item).toList(),
      'is_rec': isRec,
      'meta_data': metaData,
      'model': model,
      'off_peak': offPeak,
      'payload': payload,
      'prompt': prompt,
      'resolution': resolution,
      'seed': seed,
      'watermark': watermark,
      'wm_position': wmPosition,
      'wm_url': wmUrl,
    };
  }
}

class ViduReferenceToImageRequest {
  final String? aspectRatio;
  final bool? bgm;
  final String? callbackUrl;
  final List<String>? images;
  final String model;
  final bool? offPeak;
  final String? payload;
  final String prompt;
  final String? resolution;
  final int? seed;

  ViduReferenceToImageRequest({
    this.aspectRatio,
    this.bgm,
    this.callbackUrl,
    this.images,
    required this.model,
    this.offPeak,
    this.payload,
    required this.prompt,
    this.resolution,
    this.seed
  });

  factory ViduReferenceToImageRequest.fromJson(Map<String, dynamic> json) {
    return ViduReferenceToImageRequest(
      aspectRatio: json['aspect_ratio']?.toString(),
      bgm: json['bgm'] is bool ? json['bgm'] : null,
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
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('ViduReferenceToImageRequest.model is required');
        }
        return value;
      })(),
      offPeak: json['off_peak'] is bool ? json['off_peak'] : null,
      payload: json['payload']?.toString(),
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('ViduReferenceToImageRequest.prompt is required');
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
      'bgm': bgm,
      'callback_url': callbackUrl,
      'images': images?.map((item) => item).toList(),
      'model': model,
      'off_peak': offPeak,
      'payload': payload,
      'prompt': prompt,
      'resolution': resolution,
      'seed': seed,
    };
  }
}

class ViduReferenceToVideoRequest {
  final String? aspectRatio;
  final bool? audio;
  final bool? autoSubjects;
  final bool? bgm;
  final String? callbackUrl;
  final int? duration;
  final List<String> images;
  final String? metaData;
  final String model;
  final String? movementAmplitude;
  final bool? offPeak;
  final String? payload;
  final String? prompt;
  final String? resolution;
  final int? seed;
  final List<Map<String, dynamic>>? sounds;
  final List<Map<String, dynamic>>? subjects;
  final bool? watermark;
  final int? wmPosition;
  final String? wmUrl;

  ViduReferenceToVideoRequest({
    this.aspectRatio,
    this.audio,
    this.autoSubjects,
    this.bgm,
    this.callbackUrl,
    this.duration,
    required this.images,
    this.metaData,
    required this.model,
    this.movementAmplitude,
    this.offPeak,
    this.payload,
    this.prompt,
    this.resolution,
    this.seed,
    this.sounds,
    this.subjects,
    this.watermark,
    this.wmPosition,
    this.wmUrl
  });

  factory ViduReferenceToVideoRequest.fromJson(Map<String, dynamic> json) {
    return ViduReferenceToVideoRequest(
      aspectRatio: json['aspect_ratio']?.toString(),
      audio: json['audio'] is bool ? json['audio'] : null,
      autoSubjects: json['auto_subjects'] is bool ? json['auto_subjects'] : null,
      bgm: json['bgm'] is bool ? json['bgm'] : null,
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
      metaData: json['meta_data']?.toString(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('ViduReferenceToVideoRequest.model is required');
        }
        return value;
      })(),
      movementAmplitude: json['movement_amplitude']?.toString(),
      offPeak: json['off_peak'] is bool ? json['off_peak'] : null,
      payload: json['payload']?.toString(),
      prompt: json['prompt']?.toString(),
      resolution: json['resolution']?.toString(),
      seed: json['seed'] is int ? json['seed'] : null,
      sounds: (() {
        final list = _sdkworkAsList(json['sounds']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })())
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      subjects: (() {
        final list = _sdkworkAsList(json['subjects']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })())
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      watermark: json['watermark'] is bool ? json['watermark'] : null,
      wmPosition: json['wm_position'] is int ? json['wm_position'] : null,
      wmUrl: json['wm_url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'audio': audio,
      'auto_subjects': autoSubjects,
      'bgm': bgm,
      'callback_url': callbackUrl,
      'duration': duration,
      'images': images.map((item) => item).toList(),
      'meta_data': metaData,
      'model': model,
      'movement_amplitude': movementAmplitude,
      'off_peak': offPeak,
      'payload': payload,
      'prompt': prompt,
      'resolution': resolution,
      'seed': seed,
      'sounds': sounds?.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
      'subjects': subjects?.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
      'watermark': watermark,
      'wm_position': wmPosition,
      'wm_url': wmUrl,
    };
  }
}

class ViduStartEndToVideoRequest {
  final bool? audio;
  final String? callbackUrl;
  final int? duration;
  final List<String> images;
  final String? metaData;
  final String model;
  final bool? offPeak;
  final String? payload;
  final String? prompt;
  final String? resolution;
  final int? seed;
  final bool? watermark;
  final int? wmPosition;
  final String? wmUrl;

  ViduStartEndToVideoRequest({
    this.audio,
    this.callbackUrl,
    this.duration,
    required this.images,
    this.metaData,
    required this.model,
    this.offPeak,
    this.payload,
    this.prompt,
    this.resolution,
    this.seed,
    this.watermark,
    this.wmPosition,
    this.wmUrl
  });

  factory ViduStartEndToVideoRequest.fromJson(Map<String, dynamic> json) {
    return ViduStartEndToVideoRequest(
      audio: json['audio'] is bool ? json['audio'] : null,
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
      metaData: json['meta_data']?.toString(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('ViduStartEndToVideoRequest.model is required');
        }
        return value;
      })(),
      offPeak: json['off_peak'] is bool ? json['off_peak'] : null,
      payload: json['payload']?.toString(),
      prompt: json['prompt']?.toString(),
      resolution: json['resolution']?.toString(),
      seed: json['seed'] is int ? json['seed'] : null,
      watermark: json['watermark'] is bool ? json['watermark'] : null,
      wmPosition: json['wm_position'] is int ? json['wm_position'] : null,
      wmUrl: json['wm_url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'audio': audio,
      'callback_url': callbackUrl,
      'duration': duration,
      'images': images.map((item) => item).toList(),
      'meta_data': metaData,
      'model': model,
      'off_peak': offPeak,
      'payload': payload,
      'prompt': prompt,
      'resolution': resolution,
      'seed': seed,
      'watermark': watermark,
      'wm_position': wmPosition,
      'wm_url': wmUrl,
    };
  }
}

class ViduTaskCreationsResponse {
  final String? aspectRatio;
  final String? createdAt;
  final List<ViduCreation>? creations;
  final int? credits;
  final int? duration;
  final String? errCode;
  final String? model;
  final bool? offPeak;
  final String? payload;
  final String? prompt;
  final String? resolution;
  final int? seed;
  final String? state;
  final String? taskId;
  final bool? watermark;

  ViduTaskCreationsResponse({
    this.aspectRatio,
    this.createdAt,
    this.creations,
    this.credits,
    this.duration,
    this.errCode,
    this.model,
    this.offPeak,
    this.payload,
    this.prompt,
    this.resolution,
    this.seed,
    this.state,
    this.taskId,
    this.watermark
  });

  factory ViduTaskCreationsResponse.fromJson(Map<String, dynamic> json) {
    return ViduTaskCreationsResponse(
      aspectRatio: json['aspect_ratio']?.toString(),
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
      credits: json['credits'] is int ? json['credits'] : null,
      duration: json['duration'] is int ? json['duration'] : null,
      errCode: json['err_code']?.toString(),
      model: json['model']?.toString(),
      offPeak: json['off_peak'] is bool ? json['off_peak'] : null,
      payload: json['payload']?.toString(),
      prompt: json['prompt']?.toString(),
      resolution: json['resolution']?.toString(),
      seed: json['seed'] is int ? json['seed'] : null,
      state: json['state']?.toString(),
      taskId: json['task_id']?.toString(),
      watermark: json['watermark'] is bool ? json['watermark'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'created_at': createdAt,
      'creations': creations?.map((item) => item.toJson()).toList(),
      'credits': credits,
      'duration': duration,
      'err_code': errCode,
      'model': model,
      'off_peak': offPeak,
      'payload': payload,
      'prompt': prompt,
      'resolution': resolution,
      'seed': seed,
      'state': state,
      'task_id': taskId,
      'watermark': watermark,
    };
  }
}

class ViduTemplateRequest {
  final String? area;
  final String? aspectRatio;
  final String? beast;
  final bool? bgm;
  final String? callbackUrl;
  final List<String> images;
  final String? metaData;
  final bool? offPeak;
  final String? payload;
  final String? prompt;
  final int? seed;
  final String template;
  final List<String>? videoUrls;
  final bool? watermark;
  final int? wmPosition;
  final String? wmUrl;

  ViduTemplateRequest({
    this.area,
    this.aspectRatio,
    this.beast,
    this.bgm,
    this.callbackUrl,
    required this.images,
    this.metaData,
    this.offPeak,
    this.payload,
    this.prompt,
    this.seed,
    required this.template,
    this.videoUrls,
    this.watermark,
    this.wmPosition,
    this.wmUrl
  });

  factory ViduTemplateRequest.fromJson(Map<String, dynamic> json) {
    return ViduTemplateRequest(
      area: json['area']?.toString(),
      aspectRatio: json['aspect_ratio']?.toString(),
      beast: json['beast']?.toString(),
      bgm: json['bgm'] is bool ? json['bgm'] : null,
      callbackUrl: json['callback_url']?.toString(),
      images: (() {
        final list = _sdkworkAsList(json['images']);
        if (list == null) {
          throw FormatException('ViduTemplateRequest.images is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      metaData: json['meta_data']?.toString(),
      offPeak: json['off_peak'] is bool ? json['off_peak'] : null,
      payload: json['payload']?.toString(),
      prompt: json['prompt']?.toString(),
      seed: json['seed'] is int ? json['seed'] : null,
      template: (() {
        final value = json['template']?.toString();
        if (value == null) {
          throw FormatException('ViduTemplateRequest.template is required');
        }
        return value;
      })(),
      videoUrls: (() {
        final list = _sdkworkAsList(json['video_urls']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      watermark: json['watermark'] is bool ? json['watermark'] : null,
      wmPosition: json['wm_position'] is int ? json['wm_position'] : null,
      wmUrl: json['wm_url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'area': area,
      'aspect_ratio': aspectRatio,
      'beast': beast,
      'bgm': bgm,
      'callback_url': callbackUrl,
      'images': images.map((item) => item).toList(),
      'meta_data': metaData,
      'off_peak': offPeak,
      'payload': payload,
      'prompt': prompt,
      'seed': seed,
      'template': template,
      'video_urls': videoUrls?.map((item) => item).toList(),
      'watermark': watermark,
      'wm_position': wmPosition,
      'wm_url': wmUrl,
    };
  }
}

class ViduTemplateTask {
  final String? aspectRatio;
  final bool? bgm;
  final String? createdAt;
  final List<ViduCreation>? creations;
  final int? credits;
  final int? duration;
  final String? errCode;
  final List<String>? images;
  final String? model;
  final bool? offPeak;
  final String? payload;
  final String? prompt;
  final String? resolution;
  final int? seed;
  final String? state;
  final String? taskId;
  final String? template;
  final bool? watermark;

  ViduTemplateTask({
    this.aspectRatio,
    this.bgm,
    this.createdAt,
    this.creations,
    this.credits,
    this.duration,
    this.errCode,
    this.images,
    this.model,
    this.offPeak,
    this.payload,
    this.prompt,
    this.resolution,
    this.seed,
    this.state,
    this.taskId,
    this.template,
    this.watermark
  });

  factory ViduTemplateTask.fromJson(Map<String, dynamic> json) {
    return ViduTemplateTask(
      aspectRatio: json['aspect_ratio']?.toString(),
      bgm: json['bgm'] is bool ? json['bgm'] : null,
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
      credits: json['credits'] is int ? json['credits'] : null,
      duration: json['duration'] is int ? json['duration'] : null,
      errCode: json['err_code']?.toString(),
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
      offPeak: json['off_peak'] is bool ? json['off_peak'] : null,
      payload: json['payload']?.toString(),
      prompt: json['prompt']?.toString(),
      resolution: json['resolution']?.toString(),
      seed: json['seed'] is int ? json['seed'] : null,
      state: json['state']?.toString(),
      taskId: json['task_id']?.toString(),
      template: json['template']?.toString(),
      watermark: json['watermark'] is bool ? json['watermark'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'bgm': bgm,
      'created_at': createdAt,
      'creations': creations?.map((item) => item.toJson()).toList(),
      'credits': credits,
      'duration': duration,
      'err_code': errCode,
      'images': images?.map((item) => item).toList(),
      'model': model,
      'off_peak': offPeak,
      'payload': payload,
      'prompt': prompt,
      'resolution': resolution,
      'seed': seed,
      'state': state,
      'task_id': taskId,
      'template': template,
      'watermark': watermark,
    };
  }
}

class ViduTextToAudioRequest {
  final bool? bgm;
  final String? callbackUrl;
  final double? duration;
  final String model;
  final bool? offPeak;
  final String? payload;
  final String prompt;
  final int? seed;

  ViduTextToAudioRequest({
    this.bgm,
    this.callbackUrl,
    this.duration,
    required this.model,
    this.offPeak,
    this.payload,
    required this.prompt,
    this.seed
  });

  factory ViduTextToAudioRequest.fromJson(Map<String, dynamic> json) {
    return ViduTextToAudioRequest(
      bgm: json['bgm'] is bool ? json['bgm'] : null,
      callbackUrl: json['callback_url']?.toString(),
      duration: json['duration'] is num ? json['duration'].toDouble() : null,
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('ViduTextToAudioRequest.model is required');
        }
        return value;
      })(),
      offPeak: json['off_peak'] is bool ? json['off_peak'] : null,
      payload: json['payload']?.toString(),
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('ViduTextToAudioRequest.prompt is required');
        }
        return value;
      })(),
      seed: json['seed'] is int ? json['seed'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bgm': bgm,
      'callback_url': callbackUrl,
      'duration': duration,
      'model': model,
      'off_peak': offPeak,
      'payload': payload,
      'prompt': prompt,
      'seed': seed,
    };
  }
}

class ViduTextToVideoRequest {
  final String? aspectRatio;
  final bool? audio;
  final String? callbackUrl;
  final int? duration;
  final String? metaData;
  final String model;
  final bool? offPeak;
  final String? payload;
  final String prompt;
  final String? resolution;
  final int? seed;
  final bool? watermark;
  final int? wmPosition;
  final String? wmUrl;

  ViduTextToVideoRequest({
    this.aspectRatio,
    this.audio,
    this.callbackUrl,
    this.duration,
    this.metaData,
    required this.model,
    this.offPeak,
    this.payload,
    required this.prompt,
    this.resolution,
    this.seed,
    this.watermark,
    this.wmPosition,
    this.wmUrl
  });

  factory ViduTextToVideoRequest.fromJson(Map<String, dynamic> json) {
    return ViduTextToVideoRequest(
      aspectRatio: json['aspect_ratio']?.toString(),
      audio: json['audio'] is bool ? json['audio'] : null,
      callbackUrl: json['callback_url']?.toString(),
      duration: json['duration'] is int ? json['duration'] : null,
      metaData: json['meta_data']?.toString(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('ViduTextToVideoRequest.model is required');
        }
        return value;
      })(),
      offPeak: json['off_peak'] is bool ? json['off_peak'] : null,
      payload: json['payload']?.toString(),
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('ViduTextToVideoRequest.prompt is required');
        }
        return value;
      })(),
      resolution: json['resolution']?.toString(),
      seed: json['seed'] is int ? json['seed'] : null,
      watermark: json['watermark'] is bool ? json['watermark'] : null,
      wmPosition: json['wm_position'] is int ? json['wm_position'] : null,
      wmUrl: json['wm_url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'audio': audio,
      'callback_url': callbackUrl,
      'duration': duration,
      'meta_data': metaData,
      'model': model,
      'off_peak': offPeak,
      'payload': payload,
      'prompt': prompt,
      'resolution': resolution,
      'seed': seed,
      'watermark': watermark,
      'wm_position': wmPosition,
      'wm_url': wmUrl,
    };
  }
}

class ViduTimingToAudioRequest {
  final bool? bgm;
  final String? callbackUrl;
  final double? duration;
  final String model;
  final bool? offPeak;
  final String? payload;
  final int? seed;
  final List<Map<String, dynamic>> timingPrompts;

  ViduTimingToAudioRequest({
    this.bgm,
    this.callbackUrl,
    this.duration,
    required this.model,
    this.offPeak,
    this.payload,
    this.seed,
    required this.timingPrompts
  });

  factory ViduTimingToAudioRequest.fromJson(Map<String, dynamic> json) {
    return ViduTimingToAudioRequest(
      bgm: json['bgm'] is bool ? json['bgm'] : null,
      callbackUrl: json['callback_url']?.toString(),
      duration: json['duration'] is num ? json['duration'].toDouble() : null,
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('ViduTimingToAudioRequest.model is required');
        }
        return value;
      })(),
      offPeak: json['off_peak'] is bool ? json['off_peak'] : null,
      payload: json['payload']?.toString(),
      seed: json['seed'] is int ? json['seed'] : null,
      timingPrompts: (() {
        final list = _sdkworkAsList(json['timing_prompts']);
        if (list == null) {
          throw FormatException('ViduTimingToAudioRequest.timing_prompts is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
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
      'bgm': bgm,
      'callback_url': callbackUrl,
      'duration': duration,
      'model': model,
      'off_peak': offPeak,
      'payload': payload,
      'seed': seed,
      'timing_prompts': timingPrompts.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
    };
  }
}

class ViduVideoGenerationTask {
  final String? aspectRatio;
  final String? createdAt;
  final List<ViduCreation>? creations;
  final int? credits;
  final int? duration;
  final String? errCode;
  final String? model;
  final bool? offPeak;
  final String? payload;
  final String? prompt;
  final String? resolution;
  final int? seed;
  final String? state;
  final String? taskId;
  final bool? watermark;

  ViduVideoGenerationTask({
    this.aspectRatio,
    this.createdAt,
    this.creations,
    this.credits,
    this.duration,
    this.errCode,
    this.model,
    this.offPeak,
    this.payload,
    this.prompt,
    this.resolution,
    this.seed,
    this.state,
    this.taskId,
    this.watermark
  });

  factory ViduVideoGenerationTask.fromJson(Map<String, dynamic> json) {
    return ViduVideoGenerationTask(
      aspectRatio: json['aspect_ratio']?.toString(),
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
      credits: json['credits'] is int ? json['credits'] : null,
      duration: json['duration'] is int ? json['duration'] : null,
      errCode: json['err_code']?.toString(),
      model: json['model']?.toString(),
      offPeak: json['off_peak'] is bool ? json['off_peak'] : null,
      payload: json['payload']?.toString(),
      prompt: json['prompt']?.toString(),
      resolution: json['resolution']?.toString(),
      seed: json['seed'] is int ? json['seed'] : null,
      state: json['state']?.toString(),
      taskId: json['task_id']?.toString(),
      watermark: json['watermark'] is bool ? json['watermark'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'created_at': createdAt,
      'creations': creations?.map((item) => item.toJson()).toList(),
      'credits': credits,
      'duration': duration,
      'err_code': errCode,
      'model': model,
      'off_peak': offPeak,
      'payload': payload,
      'prompt': prompt,
      'resolution': resolution,
      'seed': seed,
      'state': state,
      'task_id': taskId,
      'watermark': watermark,
    };
  }
}

class VolcengineContentGenerationTask {
  final ArkVideoTaskContent? content;
  final int? createdAt;
  final bool? draft;
  final int? duration;
  final ProviderTaskError? error;
  final int? executionExpiresAfter;
  final int? frames;
  final int? framespersecond;
  final bool? generateAudio;
  final String? id;
  final String? model;
  final String? outputFormat;
  final int? priority;
  final String? ratio;
  final String? resolution;
  final String? safetyIdentifier;
  final int? seed;
  final String? serviceTier;
  final String? status;
  final List<ArkWebSearchTool>? tools;
  final int? updatedAt;
  final ArkVideoUsage? usage;

  VolcengineContentGenerationTask({
    this.content,
    this.createdAt,
    this.draft,
    this.duration,
    this.error,
    this.executionExpiresAfter,
    this.frames,
    this.framespersecond,
    this.generateAudio,
    this.id,
    this.model,
    this.outputFormat,
    this.priority,
    this.ratio,
    this.resolution,
    this.safetyIdentifier,
    this.seed,
    this.serviceTier,
    this.status,
    this.tools,
    this.updatedAt,
    this.usage
  });

  factory VolcengineContentGenerationTask.fromJson(Map<String, dynamic> json) {
    return VolcengineContentGenerationTask(
      content: (() {
        final map = _sdkworkAsMap(json['content']);
        return map == null ? null : ArkVideoTaskContent.fromJson(map);
      })(),
      createdAt: json['created_at'] is int ? json['created_at'] : null,
      draft: json['draft'] is bool ? json['draft'] : null,
      duration: json['duration'] is int ? json['duration'] : null,
      error: (() {
        final map = _sdkworkAsMap(json['error']);
        return map == null ? null : ProviderTaskError.fromJson(map);
      })(),
      executionExpiresAfter: json['execution_expires_after'] is int ? json['execution_expires_after'] : null,
      frames: json['frames'] is int ? json['frames'] : null,
      framespersecond: json['framespersecond'] is int ? json['framespersecond'] : null,
      generateAudio: json['generate_audio'] is bool ? json['generate_audio'] : null,
      id: json['id']?.toString(),
      model: json['model']?.toString(),
      outputFormat: json['output_format']?.toString(),
      priority: json['priority'] is int ? json['priority'] : null,
      ratio: json['ratio']?.toString(),
      resolution: json['resolution']?.toString(),
      safetyIdentifier: json['safety_identifier']?.toString(),
      seed: json['seed'] is int ? json['seed'] : null,
      serviceTier: json['service_tier']?.toString(),
      status: json['status']?.toString(),
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ArkWebSearchTool.fromJson(map);
      })())
            .whereType<ArkWebSearchTool>()
            .toList();
      })(),
      updatedAt: json['updated_at'] is int ? json['updated_at'] : null,
      usage: (() {
        final map = _sdkworkAsMap(json['usage']);
        return map == null ? null : ArkVideoUsage.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'content': content?.toJson(),
      'created_at': createdAt,
      'draft': draft,
      'duration': duration,
      'error': error?.toJson(),
      'execution_expires_after': executionExpiresAfter,
      'frames': frames,
      'framespersecond': framespersecond,
      'generate_audio': generateAudio,
      'id': id,
      'model': model,
      'output_format': outputFormat,
      'priority': priority,
      'ratio': ratio,
      'resolution': resolution,
      'safety_identifier': safetyIdentifier,
      'seed': seed,
      'service_tier': serviceTier,
      'status': status,
      'tools': tools?.map((item) => item.toJson()).toList(),
      'updated_at': updatedAt,
      'usage': usage?.toJson(),
    };
  }
}

class VolcengineContentGenerationTaskCreateRequest {
  final String? callbackUrl;
  final bool? cameraFixed;
  final List<VolcengineContentPart> content;
  final bool? draft;
  final int? duration;
  final int? executionExpiresAfter;
  final int? frames;
  final bool? generateAudio;
  final String model;
  final String? omniReferenceTaskType;
  final String? outputFormat;
  final int? priority;
  final String? ratio;
  final String? resolution;
  final bool? returnLastFrame;
  final String? safetyIdentifier;
  final int? seed;
  final String? serviceTier;
  final List<ArkWebSearchTool>? tools;
  final bool? watermark;

  VolcengineContentGenerationTaskCreateRequest({
    this.callbackUrl,
    this.cameraFixed,
    required this.content,
    this.draft,
    this.duration,
    this.executionExpiresAfter,
    this.frames,
    this.generateAudio,
    required this.model,
    this.omniReferenceTaskType,
    this.outputFormat,
    this.priority,
    this.ratio,
    this.resolution,
    this.returnLastFrame,
    this.safetyIdentifier,
    this.seed,
    this.serviceTier,
    this.tools,
    this.watermark
  });

  factory VolcengineContentGenerationTaskCreateRequest.fromJson(Map<String, dynamic> json) {
    return VolcengineContentGenerationTaskCreateRequest(
      callbackUrl: json['callback_url']?.toString(),
      cameraFixed: json['camera_fixed'] is bool ? json['camera_fixed'] : null,
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
      draft: json['draft'] is bool ? json['draft'] : null,
      duration: json['duration'] is int ? json['duration'] : null,
      executionExpiresAfter: json['execution_expires_after'] is int ? json['execution_expires_after'] : null,
      frames: json['frames'] is int ? json['frames'] : null,
      generateAudio: json['generate_audio'] is bool ? json['generate_audio'] : null,
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('VolcengineContentGenerationTaskCreateRequest.model is required');
        }
        return value;
      })(),
      omniReferenceTaskType: json['omni_reference_task_type']?.toString(),
      outputFormat: json['output_format']?.toString(),
      priority: json['priority'] is int ? json['priority'] : null,
      ratio: json['ratio']?.toString(),
      resolution: json['resolution']?.toString(),
      returnLastFrame: json['return_last_frame'] is bool ? json['return_last_frame'] : null,
      safetyIdentifier: json['safety_identifier']?.toString(),
      seed: json['seed'] is int ? json['seed'] : null,
      serviceTier: json['service_tier']?.toString(),
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ArkWebSearchTool.fromJson(map);
      })())
            .whereType<ArkWebSearchTool>()
            .toList();
      })(),
      watermark: json['watermark'] is bool ? json['watermark'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'callback_url': callbackUrl,
      'camera_fixed': cameraFixed,
      'content': content.map((item) => item.toJson()).toList(),
      'draft': draft,
      'duration': duration,
      'execution_expires_after': executionExpiresAfter,
      'frames': frames,
      'generate_audio': generateAudio,
      'model': model,
      'omni_reference_task_type': omniReferenceTaskType,
      'output_format': outputFormat,
      'priority': priority,
      'ratio': ratio,
      'resolution': resolution,
      'return_last_frame': returnLastFrame,
      'safety_identifier': safetyIdentifier,
      'seed': seed,
      'service_tier': serviceTier,
      'tools': tools?.map((item) => item.toJson()).toList(),
      'watermark': watermark,
    };
  }
}

class VolcengineContentGenerationTaskCreateResponse {
  final String? id;

  VolcengineContentGenerationTaskCreateResponse({
    this.id
  });

  factory VolcengineContentGenerationTaskCreateResponse.fromJson(Map<String, dynamic> json) {
    return VolcengineContentGenerationTaskCreateResponse(
      id: json['id']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
    };
  }
}

class VolcengineContentPart {
  final ArkAudioSource? audioUrl;
  final ArkDraftTask? draftTask;
  final ArkImageSource? imageUrl;
  final String? role;
  final String? text;
  final String type;
  final ArkVideoSource? videoUrl;

  VolcengineContentPart({
    this.audioUrl,
    this.draftTask,
    this.imageUrl,
    this.role,
    this.text,
    required this.type,
    this.videoUrl
  });

  factory VolcengineContentPart.fromJson(Map<String, dynamic> json) {
    return VolcengineContentPart(
      audioUrl: (() {
        final map = _sdkworkAsMap(json['audio_url']);
        return map == null ? null : ArkAudioSource.fromJson(map);
      })(),
      draftTask: (() {
        final map = _sdkworkAsMap(json['draft_task']);
        return map == null ? null : ArkDraftTask.fromJson(map);
      })(),
      imageUrl: (() {
        final map = _sdkworkAsMap(json['image_url']);
        return map == null ? null : ArkImageSource.fromJson(map);
      })(),
      role: json['role']?.toString(),
      text: json['text']?.toString(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('VolcengineContentPart.type is required');
        }
        return value;
      })(),
      videoUrl: (() {
        final map = _sdkworkAsMap(json['video_url']);
        return map == null ? null : ArkVideoSource.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'audio_url': audioUrl?.toJson(),
      'draft_task': draftTask?.toJson(),
      'image_url': imageUrl?.toJson(),
      'role': role,
      'text': text,
      'type': type,
      'video_url': videoUrl?.toJson(),
    };
  }
}

class VolcengineImageGenerationRequest {
  final String? background;
  final dynamic image;
  final bool? layerDecomposition;
  final String model;
  final Map<String, dynamic>? optimizePromptOptions;
  final String? outputFormat;
  final String? prompt;
  final String? responseFormat;
  final String? sequentialImageGeneration;
  final Map<String, dynamic>? sequentialImageGenerationOptions;
  final String? size;
  final bool? stream;
  final List<ArkWebSearchTool>? tools;
  final bool? watermark;

  VolcengineImageGenerationRequest({
    this.background,
    this.image,
    this.layerDecomposition,
    required this.model,
    this.optimizePromptOptions,
    this.outputFormat,
    this.prompt,
    this.responseFormat,
    this.sequentialImageGeneration,
    this.sequentialImageGenerationOptions,
    this.size,
    this.stream,
    this.tools,
    this.watermark
  });

  factory VolcengineImageGenerationRequest.fromJson(Map<String, dynamic> json) {
    return VolcengineImageGenerationRequest(
      background: json['background']?.toString(),
      image: json['image']?.toString(),
      layerDecomposition: json['layer_decomposition'] is bool ? json['layer_decomposition'] : null,
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('VolcengineImageGenerationRequest.model is required');
        }
        return value;
      })(),
      optimizePromptOptions: (() {
        final map = _sdkworkAsMap(json['optimize_prompt_options']);
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
      outputFormat: json['output_format']?.toString(),
      prompt: json['prompt']?.toString(),
      responseFormat: json['response_format']?.toString(),
      sequentialImageGeneration: json['sequential_image_generation']?.toString(),
      sequentialImageGenerationOptions: (() {
        final map = _sdkworkAsMap(json['sequential_image_generation_options']);
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
      size: json['size']?.toString(),
      stream: json['stream'] is bool ? json['stream'] : null,
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ArkWebSearchTool.fromJson(map);
      })())
            .whereType<ArkWebSearchTool>()
            .toList();
      })(),
      watermark: json['watermark'] is bool ? json['watermark'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'background': background,
      'image': image,
      'layer_decomposition': layerDecomposition,
      'model': model,
      'optimize_prompt_options': optimizePromptOptions?.map((key, item) => MapEntry(key, item)),
      'output_format': outputFormat,
      'prompt': prompt,
      'response_format': responseFormat,
      'sequential_image_generation': sequentialImageGeneration,
      'sequential_image_generation_options': sequentialImageGenerationOptions?.map((key, item) => MapEntry(key, item)),
      'size': size,
      'stream': stream,
      'tools': tools?.map((item) => item.toJson()).toList(),
      'watermark': watermark,
    };
  }
}

class VolcengineImageGenerationResponse {
  final int? created;
  final List<ArkImageGenerationData>? data;
  final ProviderTaskError? error;
  final String? model;
  final List<ArkWebSearchTool>? tools;
  final ArkImageUsage? usage;

  VolcengineImageGenerationResponse({
    this.created,
    this.data,
    this.error,
    this.model,
    this.tools,
    this.usage
  });

  factory VolcengineImageGenerationResponse.fromJson(Map<String, dynamic> json) {
    return VolcengineImageGenerationResponse(
      created: json['created'] is int ? json['created'] : null,
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ArkImageGenerationData.fromJson(map);
      })())
            .whereType<ArkImageGenerationData>()
            .toList();
      })(),
      error: (() {
        final map = _sdkworkAsMap(json['error']);
        return map == null ? null : ProviderTaskError.fromJson(map);
      })(),
      model: json['model']?.toString(),
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ArkWebSearchTool.fromJson(map);
      })())
            .whereType<ArkWebSearchTool>()
            .toList();
      })(),
      usage: (() {
        final map = _sdkworkAsMap(json['usage']);
        return map == null ? null : ArkImageUsage.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created': created,
      'data': data?.map((item) => item.toJson()).toList(),
      'error': error?.toJson(),
      'model': model,
      'tools': tools?.map((item) => item.toJson()).toList(),
      'usage': usage?.toJson(),
    };
  }
}

class XaiDeferredImageResponse {
  final List<XaiGeneratedImage>? data;
  final Map<String, dynamic>? error;
  final String requestId;
  final String status;
  final XaiUsage? usage;

  XaiDeferredImageResponse({
    this.data,
    this.error,
    required this.requestId,
    required this.status,
    this.usage
  });

  factory XaiDeferredImageResponse.fromJson(Map<String, dynamic> json) {
    return XaiDeferredImageResponse(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : XaiGeneratedImage.fromJson(map);
      })())
            .whereType<XaiGeneratedImage>()
            .toList();
      })(),
      error: (() {
        final map = _sdkworkAsMap(json['error']);
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
      requestId: (() {
        final value = json['request_id']?.toString();
        if (value == null) {
          throw FormatException('XaiDeferredImageResponse.request_id is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('XaiDeferredImageResponse.status is required');
        }
        return value;
      })(),
      usage: (() {
        final map = _sdkworkAsMap(json['usage']);
        return map == null ? null : XaiUsage.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data?.map((item) => item.toJson()).toList(),
      'error': error?.map((key, item) => MapEntry(key, item)),
      'request_id': requestId,
      'status': status,
      'usage': usage?.toJson(),
    };
  }
}

class XaiGeneratedImage {
  final String? b64Json;
  final Map<String, dynamic>? fileOutput;
  final String? mimeType;
  final String? storageError;
  final String? url;

  XaiGeneratedImage({
    this.b64Json,
    this.fileOutput,
    this.mimeType,
    this.storageError,
    this.url
  });

  factory XaiGeneratedImage.fromJson(Map<String, dynamic> json) {
    return XaiGeneratedImage(
      b64Json: json['b64_json']?.toString(),
      fileOutput: (() {
        final map = _sdkworkAsMap(json['file_output']);
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
      storageError: json['storage_error']?.toString(),
      url: json['url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'b64_json': b64Json,
      'file_output': fileOutput?.map((key, item) => MapEntry(key, item)),
      'mime_type': mimeType,
      'storage_error': storageError,
      'url': url,
    };
  }
}

class XaiImageEditRequest {
  final String? aspectRatio;
  final bool? deferred_;
  final XaiImageUrl? image;
  final List<XaiImageUrl>? images;
  final String? model;
  final int? n;
  final Map<String, dynamic>? output;
  final String prompt;
  final String? resolution;
  final String? responseFormat;
  final Map<String, dynamic>? storageOptions;
  final String? user;

  XaiImageEditRequest({
    this.aspectRatio,
    this.deferred_,
    this.image,
    this.images,
    this.model,
    this.n,
    this.output,
    required this.prompt,
    this.resolution,
    this.responseFormat,
    this.storageOptions,
    this.user
  });

  factory XaiImageEditRequest.fromJson(Map<String, dynamic> json) {
    return XaiImageEditRequest(
      aspectRatio: json['aspect_ratio']?.toString(),
      deferred_: json['deferred'] is bool ? json['deferred'] : null,
      image: (() {
        final map = _sdkworkAsMap(json['image']);
        return map == null ? null : XaiImageUrl.fromJson(map);
      })(),
      images: (() {
        final list = _sdkworkAsList(json['images']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : XaiImageUrl.fromJson(map);
      })())
            .whereType<XaiImageUrl>()
            .toList();
      })(),
      model: json['model']?.toString(),
      n: json['n'] is int ? json['n'] : null,
      output: (() {
        final map = _sdkworkAsMap(json['output']);
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
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('XaiImageEditRequest.prompt is required');
        }
        return value;
      })(),
      resolution: json['resolution']?.toString(),
      responseFormat: json['response_format']?.toString(),
      storageOptions: (() {
        final map = _sdkworkAsMap(json['storage_options']);
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
      user: json['user']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'deferred': deferred_,
      'image': image?.toJson(),
      'images': images?.map((item) => item.toJson()).toList(),
      'model': model,
      'n': n,
      'output': output?.map((key, item) => MapEntry(key, item)),
      'prompt': prompt,
      'resolution': resolution,
      'response_format': responseFormat,
      'storage_options': storageOptions?.map((key, item) => MapEntry(key, item)),
      'user': user,
    };
  }
}

class XaiImageGenerationRequest {
  final String? aspectRatio;
  final bool? deferred_;
  final String? model;
  final int? n;
  final Map<String, dynamic>? output;
  final String prompt;
  final String? resolution;
  final String? responseFormat;
  final Map<String, dynamic>? storageOptions;
  final String? user;

  XaiImageGenerationRequest({
    this.aspectRatio,
    this.deferred_,
    this.model,
    this.n,
    this.output,
    required this.prompt,
    this.resolution,
    this.responseFormat,
    this.storageOptions,
    this.user
  });

  factory XaiImageGenerationRequest.fromJson(Map<String, dynamic> json) {
    return XaiImageGenerationRequest(
      aspectRatio: json['aspect_ratio']?.toString(),
      deferred_: json['deferred'] is bool ? json['deferred'] : null,
      model: json['model']?.toString(),
      n: json['n'] is int ? json['n'] : null,
      output: (() {
        final map = _sdkworkAsMap(json['output']);
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
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('XaiImageGenerationRequest.prompt is required');
        }
        return value;
      })(),
      resolution: json['resolution']?.toString(),
      responseFormat: json['response_format']?.toString(),
      storageOptions: (() {
        final map = _sdkworkAsMap(json['storage_options']);
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
      user: json['user']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'deferred': deferred_,
      'model': model,
      'n': n,
      'output': output?.map((key, item) => MapEntry(key, item)),
      'prompt': prompt,
      'resolution': resolution,
      'response_format': responseFormat,
      'storage_options': storageOptions?.map((key, item) => MapEntry(key, item)),
      'user': user,
    };
  }
}

class XaiImageGenerationResponse {
  final List<XaiGeneratedImage> data;
  final XaiUsage? usage;

  XaiImageGenerationResponse({
    required this.data,
    this.usage
  });

  factory XaiImageGenerationResponse.fromJson(Map<String, dynamic> json) {
    return XaiImageGenerationResponse(
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          throw FormatException('XaiImageGenerationResponse.data is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : XaiGeneratedImage.fromJson(map);
      })())
            .whereType<XaiGeneratedImage>()
            .toList();
      })(),
      usage: (() {
        final map = _sdkworkAsMap(json['usage']);
        return map == null ? null : XaiUsage.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'data': data.map((item) => item.toJson()).toList(),
      'usage': usage?.toJson(),
    };
  }
}

class XaiImageUrl {
  final String? fileId;
  final String? url;

  XaiImageUrl({
    this.fileId,
    this.url
  });

  factory XaiImageUrl.fromJson(Map<String, dynamic> json) {
    return XaiImageUrl(
      fileId: json['file_id']?.toString(),
      url: json['url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'file_id': fileId,
      'url': url,
    };
  }
}

class XaiUsage {
  final int? completionTokens;
  final int costInUsdTicks;
  final int? numSourcesUsed;
  final int? promptTokens;
  final int? totalTokens;

  XaiUsage({
    this.completionTokens,
    required this.costInUsdTicks,
    this.numSourcesUsed,
    this.promptTokens,
    this.totalTokens
  });

  factory XaiUsage.fromJson(Map<String, dynamic> json) {
    return XaiUsage(
      completionTokens: json['completion_tokens'] is int ? json['completion_tokens'] : null,
      costInUsdTicks: (() {
        final value = json['cost_in_usd_ticks'];
        if (value is! int) {
          throw FormatException('XaiUsage.cost_in_usd_ticks is required');
        }
        return value;
      })(),
      numSourcesUsed: json['num_sources_used'] is int ? json['num_sources_used'] : null,
      promptTokens: json['prompt_tokens'] is int ? json['prompt_tokens'] : null,
      totalTokens: json['total_tokens'] is int ? json['total_tokens'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'completion_tokens': completionTokens,
      'cost_in_usd_ticks': costInUsdTicks,
      'num_sources_used': numSourcesUsed,
      'prompt_tokens': promptTokens,
      'total_tokens': totalTokens,
    };
  }
}

class XaiVideoEditRequest {
  final String? model;
  final Map<String, dynamic>? output;
  final String prompt;
  final Map<String, dynamic>? storageOptions;
  final String? user;
  final XaiVideoInput video;

  XaiVideoEditRequest({
    this.model,
    this.output,
    required this.prompt,
    this.storageOptions,
    this.user,
    required this.video
  });

  factory XaiVideoEditRequest.fromJson(Map<String, dynamic> json) {
    return XaiVideoEditRequest(
      model: json['model']?.toString(),
      output: (() {
        final map = _sdkworkAsMap(json['output']);
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
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('XaiVideoEditRequest.prompt is required');
        }
        return value;
      })(),
      storageOptions: (() {
        final map = _sdkworkAsMap(json['storage_options']);
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
      user: json['user']?.toString(),
      video: (() {
        final map = _sdkworkAsMap(json['video']);
        if (map == null) {
          throw FormatException('XaiVideoEditRequest.video is required');
        }
        return XaiVideoInput.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'model': model,
      'output': output?.map((key, item) => MapEntry(key, item)),
      'prompt': prompt,
      'storage_options': storageOptions?.map((key, item) => MapEntry(key, item)),
      'user': user,
      'video': video.toJson(),
    };
  }
}

class XaiVideoExtensionRequest {
  final int? duration;
  final String? model;
  final Map<String, dynamic>? output;
  final String prompt;
  final Map<String, dynamic>? storageOptions;
  final XaiVideoInput video;

  XaiVideoExtensionRequest({
    this.duration,
    this.model,
    this.output,
    required this.prompt,
    this.storageOptions,
    required this.video
  });

  factory XaiVideoExtensionRequest.fromJson(Map<String, dynamic> json) {
    return XaiVideoExtensionRequest(
      duration: json['duration'] is int ? json['duration'] : null,
      model: json['model']?.toString(),
      output: (() {
        final map = _sdkworkAsMap(json['output']);
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
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('XaiVideoExtensionRequest.prompt is required');
        }
        return value;
      })(),
      storageOptions: (() {
        final map = _sdkworkAsMap(json['storage_options']);
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
      video: (() {
        final map = _sdkworkAsMap(json['video']);
        if (map == null) {
          throw FormatException('XaiVideoExtensionRequest.video is required');
        }
        return XaiVideoInput.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'duration': duration,
      'model': model,
      'output': output?.map((key, item) => MapEntry(key, item)),
      'prompt': prompt,
      'storage_options': storageOptions?.map((key, item) => MapEntry(key, item)),
      'video': video.toJson(),
    };
  }
}

class XaiVideoGenerationRequest {
  final String? aspectRatio;
  final int? duration;
  final XaiImageUrl? image;
  final List<XaiImageUrl>? keyframes;
  final String? model;
  final Map<String, dynamic>? output;
  final String? prompt;
  final List<String>? referenceAudios;
  final List<XaiImageUrl>? referenceImages;
  final String? resolution;
  final Map<String, dynamic>? storageOptions;
  final String? user;

  XaiVideoGenerationRequest({
    this.aspectRatio,
    this.duration,
    this.image,
    this.keyframes,
    this.model,
    this.output,
    this.prompt,
    this.referenceAudios,
    this.referenceImages,
    this.resolution,
    this.storageOptions,
    this.user
  });

  factory XaiVideoGenerationRequest.fromJson(Map<String, dynamic> json) {
    return XaiVideoGenerationRequest(
      aspectRatio: json['aspect_ratio']?.toString(),
      duration: json['duration'] is int ? json['duration'] : null,
      image: (() {
        final map = _sdkworkAsMap(json['image']);
        return map == null ? null : XaiImageUrl.fromJson(map);
      })(),
      keyframes: (() {
        final list = _sdkworkAsList(json['keyframes']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : XaiImageUrl.fromJson(map);
      })())
            .whereType<XaiImageUrl>()
            .toList();
      })(),
      model: json['model']?.toString(),
      output: (() {
        final map = _sdkworkAsMap(json['output']);
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
      prompt: json['prompt']?.toString(),
      referenceAudios: (() {
        final list = _sdkworkAsList(json['reference_audios']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      referenceImages: (() {
        final list = _sdkworkAsList(json['reference_images']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : XaiImageUrl.fromJson(map);
      })())
            .whereType<XaiImageUrl>()
            .toList();
      })(),
      resolution: json['resolution']?.toString(),
      storageOptions: (() {
        final map = _sdkworkAsMap(json['storage_options']);
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
      user: json['user']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aspect_ratio': aspectRatio,
      'duration': duration,
      'image': image?.toJson(),
      'keyframes': keyframes?.map((item) => item.toJson()).toList(),
      'model': model,
      'output': output?.map((key, item) => MapEntry(key, item)),
      'prompt': prompt,
      'reference_audios': referenceAudios?.map((item) => item).toList(),
      'reference_images': referenceImages?.map((item) => item.toJson()).toList(),
      'resolution': resolution,
      'storage_options': storageOptions?.map((key, item) => MapEntry(key, item)),
      'user': user,
    };
  }
}

class XaiVideoGenerationTask {
  final Map<String, dynamic>? error;
  final String? model;
  final int? progress;
  final String? requestId;
  final String status;
  final XaiUsage? usage;
  final XaiVideoUrl? video;

  XaiVideoGenerationTask({
    this.error,
    this.model,
    this.progress,
    this.requestId,
    required this.status,
    this.usage,
    this.video
  });

  factory XaiVideoGenerationTask.fromJson(Map<String, dynamic> json) {
    return XaiVideoGenerationTask(
      error: (() {
        final map = _sdkworkAsMap(json['error']);
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
      progress: json['progress'] is int ? json['progress'] : null,
      requestId: json['request_id']?.toString(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('XaiVideoGenerationTask.status is required');
        }
        return value;
      })(),
      usage: (() {
        final map = _sdkworkAsMap(json['usage']);
        return map == null ? null : XaiUsage.fromJson(map);
      })(),
      video: (() {
        final map = _sdkworkAsMap(json['video']);
        return map == null ? null : XaiVideoUrl.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'error': error?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'progress': progress,
      'request_id': requestId,
      'status': status,
      'usage': usage?.toJson(),
      'video': video?.toJson(),
    };
  }
}

class XaiVideoInput {
  final String? fileId;
  final String? url;

  XaiVideoInput({
    this.fileId,
    this.url
  });

  factory XaiVideoInput.fromJson(Map<String, dynamic> json) {
    return XaiVideoInput(
      fileId: json['file_id']?.toString(),
      url: json['url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'file_id': fileId,
      'url': url,
    };
  }
}

class XaiVideoStartResponse {
  final String requestId;

  XaiVideoStartResponse({
    required this.requestId
  });

  factory XaiVideoStartResponse.fromJson(Map<String, dynamic> json) {
    return XaiVideoStartResponse(
      requestId: (() {
        final value = json['request_id']?.toString();
        if (value == null) {
          throw FormatException('XaiVideoStartResponse.request_id is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'request_id': requestId,
    };
  }
}

class XaiVideoUrl {
  final int? duration;
  final String? fileId;
  final String? url;

  XaiVideoUrl({
    this.duration,
    this.fileId,
    this.url
  });

  factory XaiVideoUrl.fromJson(Map<String, dynamic> json) {
    return XaiVideoUrl(
      duration: json['duration'] is int ? json['duration'] : null,
      fileId: json['file_id']?.toString(),
      url: json['url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'duration': duration,
      'file_id': fileId,
      'url': url,
    };
  }
}

class ZhipuContentFilter {
  final int? level;
  final String? role;

  ZhipuContentFilter({
    this.level,
    this.role
  });

  factory ZhipuContentFilter.fromJson(Map<String, dynamic> json) {
    return ZhipuContentFilter(
      level: json['level'] is int ? json['level'] : null,
      role: json['role']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'level': level,
      'role': role,
    };
  }
}

class ZhipuImageGenerationRequest {
  final String model;
  final String prompt;
  final String? quality;
  final String? size;
  final String? userId;
  final bool? watermarkEnabled;

  ZhipuImageGenerationRequest({
    required this.model,
    required this.prompt,
    this.quality,
    this.size,
    this.userId,
    this.watermarkEnabled
  });

  factory ZhipuImageGenerationRequest.fromJson(Map<String, dynamic> json) {
    return ZhipuImageGenerationRequest(
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('ZhipuImageGenerationRequest.model is required');
        }
        return value;
      })(),
      prompt: (() {
        final value = json['prompt']?.toString();
        if (value == null) {
          throw FormatException('ZhipuImageGenerationRequest.prompt is required');
        }
        return value;
      })(),
      quality: json['quality']?.toString(),
      size: json['size']?.toString(),
      userId: json['user_id']?.toString(),
      watermarkEnabled: json['watermark_enabled'] is bool ? json['watermark_enabled'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'model': model,
      'prompt': prompt,
      'quality': quality,
      'size': size,
      'user_id': userId,
      'watermark_enabled': watermarkEnabled,
    };
  }
}

class ZhipuImageGenerationResponse {
  final List<ZhipuContentFilter>? contentFilter;
  final int? created;
  final List<ZhipuImageResult>? data;

  ZhipuImageGenerationResponse({
    this.contentFilter,
    this.created,
    this.data
  });

  factory ZhipuImageGenerationResponse.fromJson(Map<String, dynamic> json) {
    return ZhipuImageGenerationResponse(
      contentFilter: (() {
        final list = _sdkworkAsList(json['content_filter']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ZhipuContentFilter.fromJson(map);
      })())
            .whereType<ZhipuContentFilter>()
            .toList();
      })(),
      created: json['created'] is int ? json['created'] : null,
      data: (() {
        final list = _sdkworkAsList(json['data']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ZhipuImageResult.fromJson(map);
      })())
            .whereType<ZhipuImageResult>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'content_filter': contentFilter?.map((item) => item.toJson()).toList(),
      'created': created,
      'data': data?.map((item) => item.toJson()).toList(),
    };
  }
}

class ZhipuImageResult {
  final String url;

  ZhipuImageResult({
    required this.url
  });

  factory ZhipuImageResult.fromJson(Map<String, dynamic> json) {
    return ZhipuImageResult(
      url: (() {
        final value = json['url']?.toString();
        if (value == null) {
          throw FormatException('ZhipuImageResult.url is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'url': url,
    };
  }
}

class ZhipuVideoGenerationRequest {
  final int? duration;
  final int? fps;
  final dynamic imageUrl;
  final String model;
  final String? prompt;
  final String? quality;
  final String? requestId;
  final String? size;
  final String? userId;
  final bool? watermarkEnabled;
  final bool? withAudio;

  ZhipuVideoGenerationRequest({
    this.duration,
    this.fps,
    this.imageUrl,
    required this.model,
    this.prompt,
    this.quality,
    this.requestId,
    this.size,
    this.userId,
    this.watermarkEnabled,
    this.withAudio
  });

  factory ZhipuVideoGenerationRequest.fromJson(Map<String, dynamic> json) {
    return ZhipuVideoGenerationRequest(
      duration: json['duration'] is int ? json['duration'] : null,
      fps: json['fps'] is int ? json['fps'] : null,
      imageUrl: json['image_url']?.toString(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('ZhipuVideoGenerationRequest.model is required');
        }
        return value;
      })(),
      prompt: json['prompt']?.toString(),
      quality: json['quality']?.toString(),
      requestId: json['request_id']?.toString(),
      size: json['size']?.toString(),
      userId: json['user_id']?.toString(),
      watermarkEnabled: json['watermark_enabled'] is bool ? json['watermark_enabled'] : null,
      withAudio: json['with_audio'] is bool ? json['with_audio'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'duration': duration,
      'fps': fps,
      'image_url': imageUrl,
      'model': model,
      'prompt': prompt,
      'quality': quality,
      'request_id': requestId,
      'size': size,
      'user_id': userId,
      'watermark_enabled': watermarkEnabled,
      'with_audio': withAudio,
    };
  }
}

class ZhipuVideoGenerationTask {
  final int? created;
  final String? id;
  final List<ZhipuImageResult>? imageResult;
  final String? model;
  final String? requestId;
  final String? taskStatus;
  final List<ZhipuVideoResult>? videoResult;

  ZhipuVideoGenerationTask({
    this.created,
    this.id,
    this.imageResult,
    this.model,
    this.requestId,
    this.taskStatus,
    this.videoResult
  });

  factory ZhipuVideoGenerationTask.fromJson(Map<String, dynamic> json) {
    return ZhipuVideoGenerationTask(
      created: json['created'] is int ? json['created'] : null,
      id: json['id']?.toString(),
      imageResult: (() {
        final list = _sdkworkAsList(json['image_result']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ZhipuImageResult.fromJson(map);
      })())
            .whereType<ZhipuImageResult>()
            .toList();
      })(),
      model: json['model']?.toString(),
      requestId: json['request_id']?.toString(),
      taskStatus: json['task_status']?.toString(),
      videoResult: (() {
        final list = _sdkworkAsList(json['video_result']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ZhipuVideoResult.fromJson(map);
      })())
            .whereType<ZhipuVideoResult>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'created': created,
      'id': id,
      'image_result': imageResult?.map((item) => item.toJson()).toList(),
      'model': model,
      'request_id': requestId,
      'task_status': taskStatus,
      'video_result': videoResult?.map((item) => item.toJson()).toList(),
    };
  }
}

class ZhipuVideoResult {
  final String? coverImageUrl;
  final String? url;

  ZhipuVideoResult({
    this.coverImageUrl,
    this.url
  });

  factory ZhipuVideoResult.fromJson(Map<String, dynamic> json) {
    return ZhipuVideoResult(
      coverImageUrl: json['cover_image_url']?.toString(),
      url: json['url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cover_image_url': coverImageUrl,
      'url': url,
    };
  }
}
