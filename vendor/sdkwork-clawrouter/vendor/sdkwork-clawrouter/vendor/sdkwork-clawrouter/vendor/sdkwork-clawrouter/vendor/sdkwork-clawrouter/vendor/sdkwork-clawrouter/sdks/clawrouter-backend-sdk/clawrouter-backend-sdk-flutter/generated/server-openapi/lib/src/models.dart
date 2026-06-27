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

class AdjustmentsListResult {
  final String code;
  final ServiceProviderCollectionResponse? data;
  final String? msg;

  AdjustmentsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory AdjustmentsListResult.fromJson(Map<String, dynamic> json) {
    return AdjustmentsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('AdjustmentsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ServiceProviderCollectionResponse.fromJson(map);
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

class AdminAiModelCreateRequest {
  final String? apiFormat;
  final String? capabilityIntro;
  final String contextTokens;
  final String? description;
  final String? displayName;
  final List<String>? inputModalities;
  final List<String>? limitations;
  final String? maxOutputTokens;
  final List<String>? modalities;
  final String model;
  final List<String>? outputModalities;
  final List<AdminAiModelRegionPrice> regionPrices;
  final String? releaseStage;
  final String? replacementModel;
  final String? routingState;
  final String? shelfState;
  final List<String>? supportedLanguages;
  final bool? supportsJsonSchema;
  final bool? supportsStreaming;
  final bool? supportsTools;
  final String? trainingDataCutoff;
  final String type;
  final List<String>? useCases;
  final String vendorId;

  AdminAiModelCreateRequest({
    this.apiFormat,
    this.capabilityIntro,
    required this.contextTokens,
    this.description,
    this.displayName,
    this.inputModalities,
    this.limitations,
    this.maxOutputTokens,
    this.modalities,
    required this.model,
    this.outputModalities,
    required this.regionPrices,
    this.releaseStage,
    this.replacementModel,
    this.routingState,
    this.shelfState,
    this.supportedLanguages,
    this.supportsJsonSchema,
    this.supportsStreaming,
    this.supportsTools,
    this.trainingDataCutoff,
    required this.type,
    this.useCases,
    required this.vendorId
  });

  factory AdminAiModelCreateRequest.fromJson(Map<String, dynamic> json) {
    return AdminAiModelCreateRequest(
      apiFormat: json['apiFormat']?.toString(),
      capabilityIntro: json['capabilityIntro']?.toString(),
      contextTokens: (() {
        final value = json['contextTokens']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelCreateRequest.contextTokens is required');
        }
        return value;
      })(),
      description: json['description']?.toString(),
      displayName: json['displayName']?.toString(),
      inputModalities: (() {
        final list = _sdkworkAsList(json['inputModalities']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      limitations: (() {
        final list = _sdkworkAsList(json['limitations']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      maxOutputTokens: json['maxOutputTokens']?.toString(),
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
          throw FormatException('AdminAiModelCreateRequest.model is required');
        }
        return value;
      })(),
      outputModalities: (() {
        final list = _sdkworkAsList(json['outputModalities']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      regionPrices: (() {
        final list = _sdkworkAsList(json['regionPrices']);
        if (list == null) {
          throw FormatException('AdminAiModelCreateRequest.regionPrices is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAiModelRegionPrice.fromJson(map);
      })())
            .whereType<AdminAiModelRegionPrice>()
            .toList();
      })(),
      releaseStage: json['releaseStage']?.toString(),
      replacementModel: json['replacementModel']?.toString(),
      routingState: json['routingState']?.toString(),
      shelfState: json['shelfState']?.toString(),
      supportedLanguages: (() {
        final list = _sdkworkAsList(json['supportedLanguages']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      supportsJsonSchema: json['supportsJsonSchema'] is bool ? json['supportsJsonSchema'] : null,
      supportsStreaming: json['supportsStreaming'] is bool ? json['supportsStreaming'] : null,
      supportsTools: json['supportsTools'] is bool ? json['supportsTools'] : null,
      trainingDataCutoff: json['trainingDataCutoff']?.toString(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelCreateRequest.type is required');
        }
        return value;
      })(),
      useCases: (() {
        final list = _sdkworkAsList(json['useCases']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      vendorId: (() {
        final value = json['vendorId']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelCreateRequest.vendorId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'apiFormat': apiFormat,
      'capabilityIntro': capabilityIntro,
      'contextTokens': contextTokens,
      'description': description,
      'displayName': displayName,
      'inputModalities': inputModalities?.map((item) => item).toList(),
      'limitations': limitations?.map((item) => item).toList(),
      'maxOutputTokens': maxOutputTokens,
      'modalities': modalities?.map((item) => item).toList(),
      'model': model,
      'outputModalities': outputModalities?.map((item) => item).toList(),
      'regionPrices': regionPrices.map((item) => item.toJson()).toList(),
      'releaseStage': releaseStage,
      'replacementModel': replacementModel,
      'routingState': routingState,
      'shelfState': shelfState,
      'supportedLanguages': supportedLanguages?.map((item) => item).toList(),
      'supportsJsonSchema': supportsJsonSchema,
      'supportsStreaming': supportsStreaming,
      'supportsTools': supportsTools,
      'trainingDataCutoff': trainingDataCutoff,
      'type': type,
      'useCases': useCases?.map((item) => item).toList(),
      'vendorId': vendorId,
    };
  }
}

class AdminAiModelItem {
  final String apiFormat;
  final String calls;
  final String capabilityIntro;
  final String contextTokens;
  final String description;
  final String displayName;
  final String id;
  final List<String> inputModalities;
  final List<String> limitations;
  final String maxOutputTokens;
  final List<String> modalities;
  final String model;
  final String name;
  final List<String> outputModalities;
  final List<AdminAiModelRegionPrice> regionPrices;
  final String releaseStage;
  final String replacementModel;
  final String routingState;
  final String shelfState;
  final String status;
  final List<String> supportedLanguages;
  final bool supportsJsonSchema;
  final bool supportsStreaming;
  final bool supportsTools;
  final String trainingDataCutoff;
  final String type;
  final List<String> useCases;
  final String vendorCode;
  final String vendorId;

  AdminAiModelItem({
    required this.apiFormat,
    required this.calls,
    required this.capabilityIntro,
    required this.contextTokens,
    required this.description,
    required this.displayName,
    required this.id,
    required this.inputModalities,
    required this.limitations,
    required this.maxOutputTokens,
    required this.modalities,
    required this.model,
    required this.name,
    required this.outputModalities,
    required this.regionPrices,
    required this.releaseStage,
    required this.replacementModel,
    required this.routingState,
    required this.shelfState,
    required this.status,
    required this.supportedLanguages,
    required this.supportsJsonSchema,
    required this.supportsStreaming,
    required this.supportsTools,
    required this.trainingDataCutoff,
    required this.type,
    required this.useCases,
    required this.vendorCode,
    required this.vendorId
  });

  factory AdminAiModelItem.fromJson(Map<String, dynamic> json) {
    return AdminAiModelItem(
      apiFormat: (() {
        final value = json['apiFormat']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelItem.apiFormat is required');
        }
        return value;
      })(),
      calls: (() {
        final value = json['calls']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelItem.calls is required');
        }
        return value;
      })(),
      capabilityIntro: (() {
        final value = json['capabilityIntro']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelItem.capabilityIntro is required');
        }
        return value;
      })(),
      contextTokens: (() {
        final value = json['contextTokens']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelItem.contextTokens is required');
        }
        return value;
      })(),
      description: (() {
        final value = json['description']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelItem.description is required');
        }
        return value;
      })(),
      displayName: (() {
        final value = json['displayName']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelItem.displayName is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelItem.id is required');
        }
        return value;
      })(),
      inputModalities: (() {
        final list = _sdkworkAsList(json['inputModalities']);
        if (list == null) {
          throw FormatException('AdminAiModelItem.inputModalities is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      limitations: (() {
        final list = _sdkworkAsList(json['limitations']);
        if (list == null) {
          throw FormatException('AdminAiModelItem.limitations is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      maxOutputTokens: (() {
        final value = json['maxOutputTokens']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelItem.maxOutputTokens is required');
        }
        return value;
      })(),
      modalities: (() {
        final list = _sdkworkAsList(json['modalities']);
        if (list == null) {
          throw FormatException('AdminAiModelItem.modalities is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelItem.model is required');
        }
        return value;
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelItem.name is required');
        }
        return value;
      })(),
      outputModalities: (() {
        final list = _sdkworkAsList(json['outputModalities']);
        if (list == null) {
          throw FormatException('AdminAiModelItem.outputModalities is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      regionPrices: (() {
        final list = _sdkworkAsList(json['regionPrices']);
        if (list == null) {
          throw FormatException('AdminAiModelItem.regionPrices is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAiModelRegionPrice.fromJson(map);
      })())
            .whereType<AdminAiModelRegionPrice>()
            .toList();
      })(),
      releaseStage: (() {
        final value = json['releaseStage']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelItem.releaseStage is required');
        }
        return value;
      })(),
      replacementModel: (() {
        final value = json['replacementModel']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelItem.replacementModel is required');
        }
        return value;
      })(),
      routingState: (() {
        final value = json['routingState']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelItem.routingState is required');
        }
        return value;
      })(),
      shelfState: (() {
        final value = json['shelfState']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelItem.shelfState is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelItem.status is required');
        }
        return value;
      })(),
      supportedLanguages: (() {
        final list = _sdkworkAsList(json['supportedLanguages']);
        if (list == null) {
          throw FormatException('AdminAiModelItem.supportedLanguages is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      supportsJsonSchema: (() {
        final value = json['supportsJsonSchema'];
        if (value is! bool) {
          throw FormatException('AdminAiModelItem.supportsJsonSchema is required');
        }
        return value;
      })(),
      supportsStreaming: (() {
        final value = json['supportsStreaming'];
        if (value is! bool) {
          throw FormatException('AdminAiModelItem.supportsStreaming is required');
        }
        return value;
      })(),
      supportsTools: (() {
        final value = json['supportsTools'];
        if (value is! bool) {
          throw FormatException('AdminAiModelItem.supportsTools is required');
        }
        return value;
      })(),
      trainingDataCutoff: (() {
        final value = json['trainingDataCutoff']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelItem.trainingDataCutoff is required');
        }
        return value;
      })(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelItem.type is required');
        }
        return value;
      })(),
      useCases: (() {
        final list = _sdkworkAsList(json['useCases']);
        if (list == null) {
          throw FormatException('AdminAiModelItem.useCases is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      vendorCode: (() {
        final value = json['vendorCode']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelItem.vendorCode is required');
        }
        return value;
      })(),
      vendorId: (() {
        final value = json['vendorId']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelItem.vendorId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'apiFormat': apiFormat,
      'calls': calls,
      'capabilityIntro': capabilityIntro,
      'contextTokens': contextTokens,
      'description': description,
      'displayName': displayName,
      'id': id,
      'inputModalities': inputModalities.map((item) => item).toList(),
      'limitations': limitations.map((item) => item).toList(),
      'maxOutputTokens': maxOutputTokens,
      'modalities': modalities.map((item) => item).toList(),
      'model': model,
      'name': name,
      'outputModalities': outputModalities.map((item) => item).toList(),
      'regionPrices': regionPrices.map((item) => item.toJson()).toList(),
      'releaseStage': releaseStage,
      'replacementModel': replacementModel,
      'routingState': routingState,
      'shelfState': shelfState,
      'status': status,
      'supportedLanguages': supportedLanguages.map((item) => item).toList(),
      'supportsJsonSchema': supportsJsonSchema,
      'supportsStreaming': supportsStreaming,
      'supportsTools': supportsTools,
      'trainingDataCutoff': trainingDataCutoff,
      'type': type,
      'useCases': useCases.map((item) => item).toList(),
      'vendorCode': vendorCode,
      'vendorId': vendorId,
    };
  }
}

class AdminAiModelMutationResponse {
  final AdminAiModelItem item;

  AdminAiModelMutationResponse({
    required this.item
  });

  factory AdminAiModelMutationResponse.fromJson(Map<String, dynamic> json) {
    return AdminAiModelMutationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('AdminAiModelMutationResponse.item is required');
        }
        return AdminAiModelItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class AdminAiModelRegionPrice {
  final String? cacheReadPrice;
  final String? cacheWritePrice;
  final String currency;
  final String priceIn;
  final String priceOut;
  final String regionCode;

  AdminAiModelRegionPrice({
    this.cacheReadPrice,
    this.cacheWritePrice,
    required this.currency,
    required this.priceIn,
    required this.priceOut,
    required this.regionCode
  });

  factory AdminAiModelRegionPrice.fromJson(Map<String, dynamic> json) {
    return AdminAiModelRegionPrice(
      cacheReadPrice: json['cacheReadPrice']?.toString(),
      cacheWritePrice: json['cacheWritePrice']?.toString(),
      currency: (() {
        final value = json['currency']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelRegionPrice.currency is required');
        }
        return value;
      })(),
      priceIn: (() {
        final value = json['priceIn']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelRegionPrice.priceIn is required');
        }
        return value;
      })(),
      priceOut: (() {
        final value = json['priceOut']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelRegionPrice.priceOut is required');
        }
        return value;
      })(),
      regionCode: (() {
        final value = json['regionCode']?.toString();
        if (value == null) {
          throw FormatException('AdminAiModelRegionPrice.regionCode is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cacheReadPrice': cacheReadPrice,
      'cacheWritePrice': cacheWritePrice,
      'currency': currency,
      'priceIn': priceIn,
      'priceOut': priceOut,
      'regionCode': regionCode,
    };
  }
}

class AdminAiModelUpdateRequest {
  final String? apiFormat;
  final String? capabilityIntro;
  final String? contextTokens;
  final String? description;
  final String? displayName;
  final List<String>? inputModalities;
  final List<String>? limitations;
  final String? maxOutputTokens;
  final List<String>? modalities;
  final String? model;
  final List<String>? outputModalities;
  final List<AdminAiModelRegionPrice>? regionPrices;
  final String? releaseStage;
  final String? replacementModel;
  final String? routingState;
  final String? shelfState;
  final String? status;
  final List<String>? supportedLanguages;
  final bool? supportsJsonSchema;
  final bool? supportsStreaming;
  final bool? supportsTools;
  final String? trainingDataCutoff;
  final String? type;
  final List<String>? useCases;
  final String? vendorId;

  AdminAiModelUpdateRequest({
    this.apiFormat,
    this.capabilityIntro,
    this.contextTokens,
    this.description,
    this.displayName,
    this.inputModalities,
    this.limitations,
    this.maxOutputTokens,
    this.modalities,
    this.model,
    this.outputModalities,
    this.regionPrices,
    this.releaseStage,
    this.replacementModel,
    this.routingState,
    this.shelfState,
    this.status,
    this.supportedLanguages,
    this.supportsJsonSchema,
    this.supportsStreaming,
    this.supportsTools,
    this.trainingDataCutoff,
    this.type,
    this.useCases,
    this.vendorId
  });

  factory AdminAiModelUpdateRequest.fromJson(Map<String, dynamic> json) {
    return AdminAiModelUpdateRequest(
      apiFormat: json['apiFormat']?.toString(),
      capabilityIntro: json['capabilityIntro']?.toString(),
      contextTokens: json['contextTokens']?.toString(),
      description: json['description']?.toString(),
      displayName: json['displayName']?.toString(),
      inputModalities: (() {
        final list = _sdkworkAsList(json['inputModalities']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      limitations: (() {
        final list = _sdkworkAsList(json['limitations']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      maxOutputTokens: json['maxOutputTokens']?.toString(),
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
      outputModalities: (() {
        final list = _sdkworkAsList(json['outputModalities']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      regionPrices: (() {
        final list = _sdkworkAsList(json['regionPrices']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAiModelRegionPrice.fromJson(map);
      })())
            .whereType<AdminAiModelRegionPrice>()
            .toList();
      })(),
      releaseStage: json['releaseStage']?.toString(),
      replacementModel: json['replacementModel']?.toString(),
      routingState: json['routingState']?.toString(),
      shelfState: json['shelfState']?.toString(),
      status: json['status']?.toString(),
      supportedLanguages: (() {
        final list = _sdkworkAsList(json['supportedLanguages']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      supportsJsonSchema: json['supportsJsonSchema'] is bool ? json['supportsJsonSchema'] : null,
      supportsStreaming: json['supportsStreaming'] is bool ? json['supportsStreaming'] : null,
      supportsTools: json['supportsTools'] is bool ? json['supportsTools'] : null,
      trainingDataCutoff: json['trainingDataCutoff']?.toString(),
      type: json['type']?.toString(),
      useCases: (() {
        final list = _sdkworkAsList(json['useCases']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      vendorId: json['vendorId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'apiFormat': apiFormat,
      'capabilityIntro': capabilityIntro,
      'contextTokens': contextTokens,
      'description': description,
      'displayName': displayName,
      'inputModalities': inputModalities?.map((item) => item).toList(),
      'limitations': limitations?.map((item) => item).toList(),
      'maxOutputTokens': maxOutputTokens,
      'modalities': modalities?.map((item) => item).toList(),
      'model': model,
      'outputModalities': outputModalities?.map((item) => item).toList(),
      'regionPrices': regionPrices?.map((item) => item.toJson()).toList(),
      'releaseStage': releaseStage,
      'replacementModel': replacementModel,
      'routingState': routingState,
      'shelfState': shelfState,
      'status': status,
      'supportedLanguages': supportedLanguages?.map((item) => item).toList(),
      'supportsJsonSchema': supportsJsonSchema,
      'supportsStreaming': supportsStreaming,
      'supportsTools': supportsTools,
      'trainingDataCutoff': trainingDataCutoff,
      'type': type,
      'useCases': useCases?.map((item) => item).toList(),
      'vendorId': vendorId,
    };
  }
}

class AdminAiModelsResponse {
  final List<AdminAiModelItem> items;

  AdminAiModelsResponse({
    required this.items
  });

  factory AdminAiModelsResponse.fromJson(Map<String, dynamic> json) {
    return AdminAiModelsResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminAiModelsResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAiModelItem.fromJson(map);
      })())
            .whereType<AdminAiModelItem>()
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

class AdminAiResourceCreateRequest {
  final String? apiEndpointCode;
  final String? catalogKey;
  final String? compositionMode;
  final String displayName;
  final List<AdminAiResourceMemberInput>? members;
  final String? modalityCode;
  final String? model;
  final String? providerNativeModel;
  final String resourceCode;
  final String resourceType;
  final String? sortOrder;
  final String? status;
  final String? vendorCode;

  AdminAiResourceCreateRequest({
    this.apiEndpointCode,
    this.catalogKey,
    this.compositionMode,
    required this.displayName,
    this.members,
    this.modalityCode,
    this.model,
    this.providerNativeModel,
    required this.resourceCode,
    required this.resourceType,
    this.sortOrder,
    this.status,
    this.vendorCode
  });

  factory AdminAiResourceCreateRequest.fromJson(Map<String, dynamic> json) {
    return AdminAiResourceCreateRequest(
      apiEndpointCode: json['apiEndpointCode']?.toString(),
      catalogKey: json['catalogKey']?.toString(),
      compositionMode: json['compositionMode']?.toString(),
      displayName: (() {
        final value = json['displayName']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceCreateRequest.displayName is required');
        }
        return value;
      })(),
      members: (() {
        final list = _sdkworkAsList(json['members']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAiResourceMemberInput.fromJson(map);
      })())
            .whereType<AdminAiResourceMemberInput>()
            .toList();
      })(),
      modalityCode: json['modalityCode']?.toString(),
      model: json['model']?.toString(),
      providerNativeModel: json['providerNativeModel']?.toString(),
      resourceCode: (() {
        final value = json['resourceCode']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceCreateRequest.resourceCode is required');
        }
        return value;
      })(),
      resourceType: (() {
        final value = json['resourceType']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceCreateRequest.resourceType is required');
        }
        return value;
      })(),
      sortOrder: json['sortOrder']?.toString(),
      status: json['status']?.toString(),
      vendorCode: json['vendorCode']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'apiEndpointCode': apiEndpointCode,
      'catalogKey': catalogKey,
      'compositionMode': compositionMode,
      'displayName': displayName,
      'members': members?.map((item) => item.toJson()).toList(),
      'modalityCode': modalityCode,
      'model': model,
      'providerNativeModel': providerNativeModel,
      'resourceCode': resourceCode,
      'resourceType': resourceType,
      'sortOrder': sortOrder,
      'status': status,
      'vendorCode': vendorCode,
    };
  }
}

class AdminAiResourceGroupCreateRequest {
  final String? description;
  final String groupCode;
  final String groupName;
  final String? groupType;
  final List<AdminAiResourceGroupMemberInput>? members;
  final String? selectionMode;
  final String? sortOrder;
  final String? status;

  AdminAiResourceGroupCreateRequest({
    this.description,
    required this.groupCode,
    required this.groupName,
    this.groupType,
    this.members,
    this.selectionMode,
    this.sortOrder,
    this.status
  });

  factory AdminAiResourceGroupCreateRequest.fromJson(Map<String, dynamic> json) {
    return AdminAiResourceGroupCreateRequest(
      description: json['description']?.toString(),
      groupCode: (() {
        final value = json['groupCode']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceGroupCreateRequest.groupCode is required');
        }
        return value;
      })(),
      groupName: (() {
        final value = json['groupName']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceGroupCreateRequest.groupName is required');
        }
        return value;
      })(),
      groupType: json['groupType']?.toString(),
      members: (() {
        final list = _sdkworkAsList(json['members']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAiResourceGroupMemberInput.fromJson(map);
      })())
            .whereType<AdminAiResourceGroupMemberInput>()
            .toList();
      })(),
      selectionMode: json['selectionMode']?.toString(),
      sortOrder: json['sortOrder']?.toString(),
      status: json['status']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'description': description,
      'groupCode': groupCode,
      'groupName': groupName,
      'groupType': groupType,
      'members': members?.map((item) => item.toJson()).toList(),
      'selectionMode': selectionMode,
      'sortOrder': sortOrder,
      'status': status,
    };
  }
}

class AdminAiResourceGroupDeleteResponse {
  final bool deleted;

  AdminAiResourceGroupDeleteResponse({
    required this.deleted
  });

  factory AdminAiResourceGroupDeleteResponse.fromJson(Map<String, dynamic> json) {
    return AdminAiResourceGroupDeleteResponse(
      deleted: (() {
        final value = json['deleted'];
        if (value is! bool) {
          throw FormatException('AdminAiResourceGroupDeleteResponse.deleted is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'deleted': deleted,
    };
  }
}

class AdminAiResourceGroupItem {
  final List<String>? capabilities;
  final String? capability;
  final String? description;
  final bool dynamic_;
  final String groupCode;
  final String groupName;
  final String groupType;
  final String id;
  final String resourceCount;
  final String selectionMode;
  final String? sortOrder;
  final String status;
  final List<String>? vendorCodes;

  AdminAiResourceGroupItem({
    this.capabilities,
    this.capability,
    this.description,
    required this.dynamic_,
    required this.groupCode,
    required this.groupName,
    required this.groupType,
    required this.id,
    required this.resourceCount,
    required this.selectionMode,
    this.sortOrder,
    required this.status,
    this.vendorCodes
  });

  factory AdminAiResourceGroupItem.fromJson(Map<String, dynamic> json) {
    return AdminAiResourceGroupItem(
      capabilities: (() {
        final list = _sdkworkAsList(json['capabilities']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      capability: json['capability']?.toString(),
      description: json['description']?.toString(),
      dynamic_: (() {
        final value = json['dynamic'];
        if (value is! bool) {
          throw FormatException('AdminAiResourceGroupItem.dynamic is required');
        }
        return value;
      })(),
      groupCode: (() {
        final value = json['groupCode']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceGroupItem.groupCode is required');
        }
        return value;
      })(),
      groupName: (() {
        final value = json['groupName']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceGroupItem.groupName is required');
        }
        return value;
      })(),
      groupType: (() {
        final value = json['groupType']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceGroupItem.groupType is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceGroupItem.id is required');
        }
        return value;
      })(),
      resourceCount: (() {
        final value = json['resourceCount']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceGroupItem.resourceCount is required');
        }
        return value;
      })(),
      selectionMode: (() {
        final value = json['selectionMode']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceGroupItem.selectionMode is required');
        }
        return value;
      })(),
      sortOrder: json['sortOrder']?.toString(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceGroupItem.status is required');
        }
        return value;
      })(),
      vendorCodes: (() {
        final list = _sdkworkAsList(json['vendorCodes']);
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
      'capabilities': capabilities?.map((item) => item).toList(),
      'capability': capability,
      'description': description,
      'dynamic': dynamic_,
      'groupCode': groupCode,
      'groupName': groupName,
      'groupType': groupType,
      'id': id,
      'resourceCount': resourceCount,
      'selectionMode': selectionMode,
      'sortOrder': sortOrder,
      'status': status,
      'vendorCodes': vendorCodes?.map((item) => item).toList(),
    };
  }
}

class AdminAiResourceGroupMemberInput {
  final String? itemRole;
  final String resourceCode;
  final String? sortOrder;

  AdminAiResourceGroupMemberInput({
    this.itemRole,
    required this.resourceCode,
    this.sortOrder
  });

  factory AdminAiResourceGroupMemberInput.fromJson(Map<String, dynamic> json) {
    return AdminAiResourceGroupMemberInput(
      itemRole: json['itemRole']?.toString(),
      resourceCode: (() {
        final value = json['resourceCode']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceGroupMemberInput.resourceCode is required');
        }
        return value;
      })(),
      sortOrder: json['sortOrder']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'itemRole': itemRole,
      'resourceCode': resourceCode,
      'sortOrder': sortOrder,
    };
  }
}

class AdminAiResourceGroupMutationResponse {
  final AdminAiResourceGroupItem item;

  AdminAiResourceGroupMutationResponse({
    required this.item
  });

  factory AdminAiResourceGroupMutationResponse.fromJson(Map<String, dynamic> json) {
    return AdminAiResourceGroupMutationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('AdminAiResourceGroupMutationResponse.item is required');
        }
        return AdminAiResourceGroupItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class AdminAiResourceGroupResourceItem {
  final String? apiEndpointCode;
  final String? catalogKey;
  final String displayName;
  final String id;
  final String memberRole;
  final String? modalityCode;
  final String? model;
  final String? providerNativeModel;
  final String resourceCode;
  final String resourceType;
  final String? sortOrder;
  final String status;
  final String? vendorCode;

  AdminAiResourceGroupResourceItem({
    this.apiEndpointCode,
    this.catalogKey,
    required this.displayName,
    required this.id,
    required this.memberRole,
    this.modalityCode,
    this.model,
    this.providerNativeModel,
    required this.resourceCode,
    required this.resourceType,
    this.sortOrder,
    required this.status,
    this.vendorCode
  });

  factory AdminAiResourceGroupResourceItem.fromJson(Map<String, dynamic> json) {
    return AdminAiResourceGroupResourceItem(
      apiEndpointCode: json['apiEndpointCode']?.toString(),
      catalogKey: json['catalogKey']?.toString(),
      displayName: (() {
        final value = json['displayName']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceGroupResourceItem.displayName is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceGroupResourceItem.id is required');
        }
        return value;
      })(),
      memberRole: (() {
        final value = json['memberRole']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceGroupResourceItem.memberRole is required');
        }
        return value;
      })(),
      modalityCode: json['modalityCode']?.toString(),
      model: json['model']?.toString(),
      providerNativeModel: json['providerNativeModel']?.toString(),
      resourceCode: (() {
        final value = json['resourceCode']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceGroupResourceItem.resourceCode is required');
        }
        return value;
      })(),
      resourceType: (() {
        final value = json['resourceType']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceGroupResourceItem.resourceType is required');
        }
        return value;
      })(),
      sortOrder: json['sortOrder']?.toString(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceGroupResourceItem.status is required');
        }
        return value;
      })(),
      vendorCode: json['vendorCode']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'apiEndpointCode': apiEndpointCode,
      'catalogKey': catalogKey,
      'displayName': displayName,
      'id': id,
      'memberRole': memberRole,
      'modalityCode': modalityCode,
      'model': model,
      'providerNativeModel': providerNativeModel,
      'resourceCode': resourceCode,
      'resourceType': resourceType,
      'sortOrder': sortOrder,
      'status': status,
      'vendorCode': vendorCode,
    };
  }
}

class AdminAiResourceGroupResourcesResponse {
  final List<AdminAiResourceGroupResourceItem> items;

  AdminAiResourceGroupResourcesResponse({
    required this.items
  });

  factory AdminAiResourceGroupResourcesResponse.fromJson(Map<String, dynamic> json) {
    return AdminAiResourceGroupResourcesResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminAiResourceGroupResourcesResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAiResourceGroupResourceItem.fromJson(map);
      })())
            .whereType<AdminAiResourceGroupResourceItem>()
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

class AdminAiResourceGroupUpdateRequest {
  final String? description;
  final String? groupCode;
  final String? groupName;
  final String? groupType;
  final List<AdminAiResourceGroupMemberInput>? members;
  final String? selectionMode;
  final String? sortOrder;
  final String? status;

  AdminAiResourceGroupUpdateRequest({
    this.description,
    this.groupCode,
    this.groupName,
    this.groupType,
    this.members,
    this.selectionMode,
    this.sortOrder,
    this.status
  });

  factory AdminAiResourceGroupUpdateRequest.fromJson(Map<String, dynamic> json) {
    return AdminAiResourceGroupUpdateRequest(
      description: json['description']?.toString(),
      groupCode: json['groupCode']?.toString(),
      groupName: json['groupName']?.toString(),
      groupType: json['groupType']?.toString(),
      members: (() {
        final list = _sdkworkAsList(json['members']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAiResourceGroupMemberInput.fromJson(map);
      })())
            .whereType<AdminAiResourceGroupMemberInput>()
            .toList();
      })(),
      selectionMode: json['selectionMode']?.toString(),
      sortOrder: json['sortOrder']?.toString(),
      status: json['status']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'description': description,
      'groupCode': groupCode,
      'groupName': groupName,
      'groupType': groupType,
      'members': members?.map((item) => item.toJson()).toList(),
      'selectionMode': selectionMode,
      'sortOrder': sortOrder,
      'status': status,
    };
  }
}

class AdminAiResourceGroupsResponse {
  final List<AdminAiResourceGroupItem> items;

  AdminAiResourceGroupsResponse({
    required this.items
  });

  factory AdminAiResourceGroupsResponse.fromJson(Map<String, dynamic> json) {
    return AdminAiResourceGroupsResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminAiResourceGroupsResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAiResourceGroupItem.fromJson(map);
      })())
            .whereType<AdminAiResourceGroupItem>()
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

class AdminAiResourceItem {
  final String? apiEndpointCode;
  final List<String>? capabilities;
  final String? capability;
  final String? catalogKey;
  final String compositionMode;
  final String displayName;
  final String id;
  final List<AdminAiResourceMemberItem> members;
  final String? modalityCode;
  final String? model;
  final String? providerNativeModel;
  final String resourceCode;
  final String resourceType;
  final String? sortOrder;
  final String status;
  final String? vendorCode;

  AdminAiResourceItem({
    this.apiEndpointCode,
    this.capabilities,
    this.capability,
    this.catalogKey,
    required this.compositionMode,
    required this.displayName,
    required this.id,
    required this.members,
    this.modalityCode,
    this.model,
    this.providerNativeModel,
    required this.resourceCode,
    required this.resourceType,
    this.sortOrder,
    required this.status,
    this.vendorCode
  });

  factory AdminAiResourceItem.fromJson(Map<String, dynamic> json) {
    return AdminAiResourceItem(
      apiEndpointCode: json['apiEndpointCode']?.toString(),
      capabilities: (() {
        final list = _sdkworkAsList(json['capabilities']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      capability: json['capability']?.toString(),
      catalogKey: json['catalogKey']?.toString(),
      compositionMode: (() {
        final value = json['compositionMode']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceItem.compositionMode is required');
        }
        return value;
      })(),
      displayName: (() {
        final value = json['displayName']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceItem.displayName is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceItem.id is required');
        }
        return value;
      })(),
      members: (() {
        final list = _sdkworkAsList(json['members']);
        if (list == null) {
          throw FormatException('AdminAiResourceItem.members is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAiResourceMemberItem.fromJson(map);
      })())
            .whereType<AdminAiResourceMemberItem>()
            .toList();
      })(),
      modalityCode: json['modalityCode']?.toString(),
      model: json['model']?.toString(),
      providerNativeModel: json['providerNativeModel']?.toString(),
      resourceCode: (() {
        final value = json['resourceCode']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceItem.resourceCode is required');
        }
        return value;
      })(),
      resourceType: (() {
        final value = json['resourceType']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceItem.resourceType is required');
        }
        return value;
      })(),
      sortOrder: json['sortOrder']?.toString(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceItem.status is required');
        }
        return value;
      })(),
      vendorCode: json['vendorCode']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'apiEndpointCode': apiEndpointCode,
      'capabilities': capabilities?.map((item) => item).toList(),
      'capability': capability,
      'catalogKey': catalogKey,
      'compositionMode': compositionMode,
      'displayName': displayName,
      'id': id,
      'members': members.map((item) => item.toJson()).toList(),
      'modalityCode': modalityCode,
      'model': model,
      'providerNativeModel': providerNativeModel,
      'resourceCode': resourceCode,
      'resourceType': resourceType,
      'sortOrder': sortOrder,
      'status': status,
      'vendorCode': vendorCode,
    };
  }
}

class AdminAiResourceMemberInput {
  final String memberResourceCode;
  final String? memberRole;
  final bool? required_;
  final String? sortOrder;

  AdminAiResourceMemberInput({
    required this.memberResourceCode,
    this.memberRole,
    this.required_,
    this.sortOrder
  });

  factory AdminAiResourceMemberInput.fromJson(Map<String, dynamic> json) {
    return AdminAiResourceMemberInput(
      memberResourceCode: (() {
        final value = json['memberResourceCode']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceMemberInput.memberResourceCode is required');
        }
        return value;
      })(),
      memberRole: json['memberRole']?.toString(),
      required_: json['required'] is bool ? json['required'] : null,
      sortOrder: json['sortOrder']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'memberResourceCode': memberResourceCode,
      'memberRole': memberRole,
      'required': required_,
      'sortOrder': sortOrder,
    };
  }
}

class AdminAiResourceMemberItem {
  final String memberResourceCode;
  final String memberRole;
  final String parentResourceCode;
  final bool required_;
  final String? sortOrder;

  AdminAiResourceMemberItem({
    required this.memberResourceCode,
    required this.memberRole,
    required this.parentResourceCode,
    required this.required_,
    this.sortOrder
  });

  factory AdminAiResourceMemberItem.fromJson(Map<String, dynamic> json) {
    return AdminAiResourceMemberItem(
      memberResourceCode: (() {
        final value = json['memberResourceCode']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceMemberItem.memberResourceCode is required');
        }
        return value;
      })(),
      memberRole: (() {
        final value = json['memberRole']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceMemberItem.memberRole is required');
        }
        return value;
      })(),
      parentResourceCode: (() {
        final value = json['parentResourceCode']?.toString();
        if (value == null) {
          throw FormatException('AdminAiResourceMemberItem.parentResourceCode is required');
        }
        return value;
      })(),
      required_: (() {
        final value = json['required'];
        if (value is! bool) {
          throw FormatException('AdminAiResourceMemberItem.required is required');
        }
        return value;
      })(),
      sortOrder: json['sortOrder']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'memberResourceCode': memberResourceCode,
      'memberRole': memberRole,
      'parentResourceCode': parentResourceCode,
      'required': required_,
      'sortOrder': sortOrder,
    };
  }
}

class AdminAiResourceMutationResponse {
  final AdminAiResourceItem item;

  AdminAiResourceMutationResponse({
    required this.item
  });

  factory AdminAiResourceMutationResponse.fromJson(Map<String, dynamic> json) {
    return AdminAiResourceMutationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('AdminAiResourceMutationResponse.item is required');
        }
        return AdminAiResourceItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class AdminAiResourceUpdateRequest {
  final String? apiEndpointCode;
  final String? catalogKey;
  final String? compositionMode;
  final String? displayName;
  final List<AdminAiResourceMemberInput>? members;
  final String? modalityCode;
  final String? model;
  final String? providerNativeModel;
  final String? resourceCode;
  final String? resourceType;
  final String? sortOrder;
  final String? status;
  final String? vendorCode;

  AdminAiResourceUpdateRequest({
    this.apiEndpointCode,
    this.catalogKey,
    this.compositionMode,
    this.displayName,
    this.members,
    this.modalityCode,
    this.model,
    this.providerNativeModel,
    this.resourceCode,
    this.resourceType,
    this.sortOrder,
    this.status,
    this.vendorCode
  });

  factory AdminAiResourceUpdateRequest.fromJson(Map<String, dynamic> json) {
    return AdminAiResourceUpdateRequest(
      apiEndpointCode: json['apiEndpointCode']?.toString(),
      catalogKey: json['catalogKey']?.toString(),
      compositionMode: json['compositionMode']?.toString(),
      displayName: json['displayName']?.toString(),
      members: (() {
        final list = _sdkworkAsList(json['members']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAiResourceMemberInput.fromJson(map);
      })())
            .whereType<AdminAiResourceMemberInput>()
            .toList();
      })(),
      modalityCode: json['modalityCode']?.toString(),
      model: json['model']?.toString(),
      providerNativeModel: json['providerNativeModel']?.toString(),
      resourceCode: json['resourceCode']?.toString(),
      resourceType: json['resourceType']?.toString(),
      sortOrder: json['sortOrder']?.toString(),
      status: json['status']?.toString(),
      vendorCode: json['vendorCode']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'apiEndpointCode': apiEndpointCode,
      'catalogKey': catalogKey,
      'compositionMode': compositionMode,
      'displayName': displayName,
      'members': members?.map((item) => item.toJson()).toList(),
      'modalityCode': modalityCode,
      'model': model,
      'providerNativeModel': providerNativeModel,
      'resourceCode': resourceCode,
      'resourceType': resourceType,
      'sortOrder': sortOrder,
      'status': status,
      'vendorCode': vendorCode,
    };
  }
}

class AdminAiResourcesResponse {
  final List<AdminAiResourceItem> items;

  AdminAiResourcesResponse({
    required this.items
  });

  factory AdminAiResourcesResponse.fromJson(Map<String, dynamic> json) {
    return AdminAiResourcesResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminAiResourcesResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAiResourceItem.fromJson(map);
      })())
            .whereType<AdminAiResourceItem>()
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

class AdminAnalyticsInsight {
  final String detail;
  final String key;
  final String severity;
  final String title;
  final String value;

  AdminAnalyticsInsight({
    required this.detail,
    required this.key,
    required this.severity,
    required this.title,
    required this.value
  });

  factory AdminAnalyticsInsight.fromJson(Map<String, dynamic> json) {
    return AdminAnalyticsInsight(
      detail: (() {
        final value = json['detail']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsInsight.detail is required');
        }
        return value;
      })(),
      key: (() {
        final value = json['key']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsInsight.key is required');
        }
        return value;
      })(),
      severity: (() {
        final value = json['severity']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsInsight.severity is required');
        }
        return value;
      })(),
      title: (() {
        final value = json['title']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsInsight.title is required');
        }
        return value;
      })(),
      value: (() {
        final value = json['value']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsInsight.value is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'detail': detail,
      'key': key,
      'severity': severity,
      'title': title,
      'value': value,
    };
  }
}

class AdminAnalyticsModelRankItem {
  final double averageTokensPerRequest;
  final String catalogKey;
  final double errorRate;
  final String modality;
  final String model;
  final double points;
  final String rank;
  final String requestCount;
  final double totalTokens;
  final double upstreamCost;
  final String userCount;
  final String vendor;

  AdminAnalyticsModelRankItem({
    required this.averageTokensPerRequest,
    required this.catalogKey,
    required this.errorRate,
    required this.modality,
    required this.model,
    required this.points,
    required this.rank,
    required this.requestCount,
    required this.totalTokens,
    required this.upstreamCost,
    required this.userCount,
    required this.vendor
  });

  factory AdminAnalyticsModelRankItem.fromJson(Map<String, dynamic> json) {
    return AdminAnalyticsModelRankItem(
      averageTokensPerRequest: (() {
        final value = json['averageTokensPerRequest'];
        if (value is! num) {
          throw FormatException('AdminAnalyticsModelRankItem.averageTokensPerRequest is required');
        }
        return value.toDouble();
      })(),
      catalogKey: (() {
        final value = json['catalogKey']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsModelRankItem.catalogKey is required');
        }
        return value;
      })(),
      errorRate: (() {
        final value = json['errorRate'];
        if (value is! num) {
          throw FormatException('AdminAnalyticsModelRankItem.errorRate is required');
        }
        return value.toDouble();
      })(),
      modality: (() {
        final value = json['modality']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsModelRankItem.modality is required');
        }
        return value;
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsModelRankItem.model is required');
        }
        return value;
      })(),
      points: (() {
        final value = json['points'];
        if (value is! num) {
          throw FormatException('AdminAnalyticsModelRankItem.points is required');
        }
        return value.toDouble();
      })(),
      rank: (() {
        final value = json['rank']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsModelRankItem.rank is required');
        }
        return value;
      })(),
      requestCount: (() {
        final value = json['requestCount']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsModelRankItem.requestCount is required');
        }
        return value;
      })(),
      totalTokens: (() {
        final value = json['totalTokens'];
        if (value is! num) {
          throw FormatException('AdminAnalyticsModelRankItem.totalTokens is required');
        }
        return value.toDouble();
      })(),
      upstreamCost: (() {
        final value = json['upstreamCost'];
        if (value is! num) {
          throw FormatException('AdminAnalyticsModelRankItem.upstreamCost is required');
        }
        return value.toDouble();
      })(),
      userCount: (() {
        final value = json['userCount']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsModelRankItem.userCount is required');
        }
        return value;
      })(),
      vendor: (() {
        final value = json['vendor']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsModelRankItem.vendor is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'averageTokensPerRequest': averageTokensPerRequest,
      'catalogKey': catalogKey,
      'errorRate': errorRate,
      'modality': modality,
      'model': model,
      'points': points,
      'rank': rank,
      'requestCount': requestCount,
      'totalTokens': totalTokens,
      'upstreamCost': upstreamCost,
      'userCount': userCount,
      'vendor': vendor,
    };
  }
}

class AdminAnalyticsModelRankings {
  final List<AdminAnalyticsModelRankItem> points;
  final List<AdminAnalyticsModelRankItem> requests;
  final List<AdminAnalyticsModelRankItem> tokens;

  AdminAnalyticsModelRankings({
    required this.points,
    required this.requests,
    required this.tokens
  });

  factory AdminAnalyticsModelRankings.fromJson(Map<String, dynamic> json) {
    return AdminAnalyticsModelRankings(
      points: (() {
        final list = _sdkworkAsList(json['points']);
        if (list == null) {
          throw FormatException('AdminAnalyticsModelRankings.points is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAnalyticsModelRankItem.fromJson(map);
      })())
            .whereType<AdminAnalyticsModelRankItem>()
            .toList();
      })(),
      requests: (() {
        final list = _sdkworkAsList(json['requests']);
        if (list == null) {
          throw FormatException('AdminAnalyticsModelRankings.requests is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAnalyticsModelRankItem.fromJson(map);
      })())
            .whereType<AdminAnalyticsModelRankItem>()
            .toList();
      })(),
      tokens: (() {
        final list = _sdkworkAsList(json['tokens']);
        if (list == null) {
          throw FormatException('AdminAnalyticsModelRankings.tokens is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAnalyticsModelRankItem.fromJson(map);
      })())
            .whereType<AdminAnalyticsModelRankItem>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'points': points.map((item) => item.toJson()).toList(),
      'requests': requests.map((item) => item.toJson()).toList(),
      'tokens': tokens.map((item) => item.toJson()).toList(),
    };
  }
}

class AdminAnalyticsOverviewResponse {
  final String? endTime;
  final List<AdminAnalyticsInsight> insights;
  final String limit;
  final List<AdminPieChartItem> modalityDistribution;
  final List<AdminPieChartItem> modelDistribution;
  final AdminAnalyticsModelRankings modelRankings;
  final String? startTime;
  final AdminAnalyticsSummary summary;
  final String timeRange;
  final List<AdminAnalyticsTrendPoint> trend;
  final AdminAnalyticsUserRankings userRankings;

  AdminAnalyticsOverviewResponse({
    this.endTime,
    required this.insights,
    required this.limit,
    required this.modalityDistribution,
    required this.modelDistribution,
    required this.modelRankings,
    this.startTime,
    required this.summary,
    required this.timeRange,
    required this.trend,
    required this.userRankings
  });

  factory AdminAnalyticsOverviewResponse.fromJson(Map<String, dynamic> json) {
    return AdminAnalyticsOverviewResponse(
      endTime: json['endTime']?.toString(),
      insights: (() {
        final list = _sdkworkAsList(json['insights']);
        if (list == null) {
          throw FormatException('AdminAnalyticsOverviewResponse.insights is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAnalyticsInsight.fromJson(map);
      })())
            .whereType<AdminAnalyticsInsight>()
            .toList();
      })(),
      limit: (() {
        final value = json['limit']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsOverviewResponse.limit is required');
        }
        return value;
      })(),
      modalityDistribution: (() {
        final list = _sdkworkAsList(json['modalityDistribution']);
        if (list == null) {
          throw FormatException('AdminAnalyticsOverviewResponse.modalityDistribution is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminPieChartItem.fromJson(map);
      })())
            .whereType<AdminPieChartItem>()
            .toList();
      })(),
      modelDistribution: (() {
        final list = _sdkworkAsList(json['modelDistribution']);
        if (list == null) {
          throw FormatException('AdminAnalyticsOverviewResponse.modelDistribution is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminPieChartItem.fromJson(map);
      })())
            .whereType<AdminPieChartItem>()
            .toList();
      })(),
      modelRankings: (() {
        final map = _sdkworkAsMap(json['modelRankings']);
        if (map == null) {
          throw FormatException('AdminAnalyticsOverviewResponse.modelRankings is required');
        }
        return AdminAnalyticsModelRankings.fromJson(map);
      })(),
      startTime: json['startTime']?.toString(),
      summary: (() {
        final map = _sdkworkAsMap(json['summary']);
        if (map == null) {
          throw FormatException('AdminAnalyticsOverviewResponse.summary is required');
        }
        return AdminAnalyticsSummary.fromJson(map);
      })(),
      timeRange: (() {
        final value = json['timeRange']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsOverviewResponse.timeRange is required');
        }
        return value;
      })(),
      trend: (() {
        final list = _sdkworkAsList(json['trend']);
        if (list == null) {
          throw FormatException('AdminAnalyticsOverviewResponse.trend is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAnalyticsTrendPoint.fromJson(map);
      })())
            .whereType<AdminAnalyticsTrendPoint>()
            .toList();
      })(),
      userRankings: (() {
        final map = _sdkworkAsMap(json['userRankings']);
        if (map == null) {
          throw FormatException('AdminAnalyticsOverviewResponse.userRankings is required');
        }
        return AdminAnalyticsUserRankings.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'endTime': endTime,
      'insights': insights.map((item) => item.toJson()).toList(),
      'limit': limit,
      'modalityDistribution': modalityDistribution.map((item) => item.toJson()).toList(),
      'modelDistribution': modelDistribution.map((item) => item.toJson()).toList(),
      'modelRankings': modelRankings.toJson(),
      'startTime': startTime,
      'summary': summary.toJson(),
      'timeRange': timeRange,
      'trend': trend.map((item) => item.toJson()).toList(),
      'userRankings': userRankings.toJson(),
    };
  }
}

class AdminAnalyticsSummary {
  final String activeModels;
  final String activeUsers;
  final double averagePointsPerRequest;
  final double averageTokensPerRequest;
  final double errorRate;
  final String failedRequests;
  final String successfulRequests;
  final double totalPoints;
  final String totalRequests;
  final double totalTokens;
  final String totalUsers;
  final double upstreamCost;

  AdminAnalyticsSummary({
    required this.activeModels,
    required this.activeUsers,
    required this.averagePointsPerRequest,
    required this.averageTokensPerRequest,
    required this.errorRate,
    required this.failedRequests,
    required this.successfulRequests,
    required this.totalPoints,
    required this.totalRequests,
    required this.totalTokens,
    required this.totalUsers,
    required this.upstreamCost
  });

  factory AdminAnalyticsSummary.fromJson(Map<String, dynamic> json) {
    return AdminAnalyticsSummary(
      activeModels: (() {
        final value = json['activeModels']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsSummary.activeModels is required');
        }
        return value;
      })(),
      activeUsers: (() {
        final value = json['activeUsers']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsSummary.activeUsers is required');
        }
        return value;
      })(),
      averagePointsPerRequest: (() {
        final value = json['averagePointsPerRequest'];
        if (value is! num) {
          throw FormatException('AdminAnalyticsSummary.averagePointsPerRequest is required');
        }
        return value.toDouble();
      })(),
      averageTokensPerRequest: (() {
        final value = json['averageTokensPerRequest'];
        if (value is! num) {
          throw FormatException('AdminAnalyticsSummary.averageTokensPerRequest is required');
        }
        return value.toDouble();
      })(),
      errorRate: (() {
        final value = json['errorRate'];
        if (value is! num) {
          throw FormatException('AdminAnalyticsSummary.errorRate is required');
        }
        return value.toDouble();
      })(),
      failedRequests: (() {
        final value = json['failedRequests']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsSummary.failedRequests is required');
        }
        return value;
      })(),
      successfulRequests: (() {
        final value = json['successfulRequests']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsSummary.successfulRequests is required');
        }
        return value;
      })(),
      totalPoints: (() {
        final value = json['totalPoints'];
        if (value is! num) {
          throw FormatException('AdminAnalyticsSummary.totalPoints is required');
        }
        return value.toDouble();
      })(),
      totalRequests: (() {
        final value = json['totalRequests']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsSummary.totalRequests is required');
        }
        return value;
      })(),
      totalTokens: (() {
        final value = json['totalTokens'];
        if (value is! num) {
          throw FormatException('AdminAnalyticsSummary.totalTokens is required');
        }
        return value.toDouble();
      })(),
      totalUsers: (() {
        final value = json['totalUsers']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsSummary.totalUsers is required');
        }
        return value;
      })(),
      upstreamCost: (() {
        final value = json['upstreamCost'];
        if (value is! num) {
          throw FormatException('AdminAnalyticsSummary.upstreamCost is required');
        }
        return value.toDouble();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'activeModels': activeModels,
      'activeUsers': activeUsers,
      'averagePointsPerRequest': averagePointsPerRequest,
      'averageTokensPerRequest': averageTokensPerRequest,
      'errorRate': errorRate,
      'failedRequests': failedRequests,
      'successfulRequests': successfulRequests,
      'totalPoints': totalPoints,
      'totalRequests': totalRequests,
      'totalTokens': totalTokens,
      'totalUsers': totalUsers,
      'upstreamCost': upstreamCost,
    };
  }
}

class AdminAnalyticsTrendPoint {
  final double points;
  final double requests;
  final String time;
  final double tokens;
  final String users;

  AdminAnalyticsTrendPoint({
    required this.points,
    required this.requests,
    required this.time,
    required this.tokens,
    required this.users
  });

  factory AdminAnalyticsTrendPoint.fromJson(Map<String, dynamic> json) {
    return AdminAnalyticsTrendPoint(
      points: (() {
        final value = json['points'];
        if (value is! num) {
          throw FormatException('AdminAnalyticsTrendPoint.points is required');
        }
        return value.toDouble();
      })(),
      requests: (() {
        final value = json['requests'];
        if (value is! num) {
          throw FormatException('AdminAnalyticsTrendPoint.requests is required');
        }
        return value.toDouble();
      })(),
      time: (() {
        final value = json['time']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsTrendPoint.time is required');
        }
        return value;
      })(),
      tokens: (() {
        final value = json['tokens'];
        if (value is! num) {
          throw FormatException('AdminAnalyticsTrendPoint.tokens is required');
        }
        return value.toDouble();
      })(),
      users: (() {
        final value = json['users']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsTrendPoint.users is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'points': points,
      'requests': requests,
      'time': time,
      'tokens': tokens,
      'users': users,
    };
  }
}

class AdminAnalyticsUserRankItem {
  final String? email;
  final List<AdminPieChartItem> modelDistribution;
  final double points;
  final String rank;
  final String requestCount;
  final double totalTokens;
  final String userId;
  final String userName;

  AdminAnalyticsUserRankItem({
    this.email,
    required this.modelDistribution,
    required this.points,
    required this.rank,
    required this.requestCount,
    required this.totalTokens,
    required this.userId,
    required this.userName
  });

  factory AdminAnalyticsUserRankItem.fromJson(Map<String, dynamic> json) {
    return AdminAnalyticsUserRankItem(
      email: json['email']?.toString(),
      modelDistribution: (() {
        final list = _sdkworkAsList(json['modelDistribution']);
        if (list == null) {
          throw FormatException('AdminAnalyticsUserRankItem.modelDistribution is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminPieChartItem.fromJson(map);
      })())
            .whereType<AdminPieChartItem>()
            .toList();
      })(),
      points: (() {
        final value = json['points'];
        if (value is! num) {
          throw FormatException('AdminAnalyticsUserRankItem.points is required');
        }
        return value.toDouble();
      })(),
      rank: (() {
        final value = json['rank']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsUserRankItem.rank is required');
        }
        return value;
      })(),
      requestCount: (() {
        final value = json['requestCount']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsUserRankItem.requestCount is required');
        }
        return value;
      })(),
      totalTokens: (() {
        final value = json['totalTokens'];
        if (value is! num) {
          throw FormatException('AdminAnalyticsUserRankItem.totalTokens is required');
        }
        return value.toDouble();
      })(),
      userId: (() {
        final value = json['userId']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsUserRankItem.userId is required');
        }
        return value;
      })(),
      userName: (() {
        final value = json['userName']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsUserRankItem.userName is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'email': email,
      'modelDistribution': modelDistribution.map((item) => item.toJson()).toList(),
      'points': points,
      'rank': rank,
      'requestCount': requestCount,
      'totalTokens': totalTokens,
      'userId': userId,
      'userName': userName,
    };
  }
}

class AdminAnalyticsUserRankings {
  final List<AdminAnalyticsUserRankItem> points;
  final List<AdminAnalyticsUserRankItem> requests;
  final List<AdminAnalyticsUserRankItem> tokens;

  AdminAnalyticsUserRankings({
    required this.points,
    required this.requests,
    required this.tokens
  });

  factory AdminAnalyticsUserRankings.fromJson(Map<String, dynamic> json) {
    return AdminAnalyticsUserRankings(
      points: (() {
        final list = _sdkworkAsList(json['points']);
        if (list == null) {
          throw FormatException('AdminAnalyticsUserRankings.points is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAnalyticsUserRankItem.fromJson(map);
      })())
            .whereType<AdminAnalyticsUserRankItem>()
            .toList();
      })(),
      requests: (() {
        final list = _sdkworkAsList(json['requests']);
        if (list == null) {
          throw FormatException('AdminAnalyticsUserRankings.requests is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAnalyticsUserRankItem.fromJson(map);
      })())
            .whereType<AdminAnalyticsUserRankItem>()
            .toList();
      })(),
      tokens: (() {
        final list = _sdkworkAsList(json['tokens']);
        if (list == null) {
          throw FormatException('AdminAnalyticsUserRankings.tokens is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAnalyticsUserRankItem.fromJson(map);
      })())
            .whereType<AdminAnalyticsUserRankItem>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'points': points.map((item) => item.toJson()).toList(),
      'requests': requests.map((item) => item.toJson()).toList(),
      'tokens': tokens.map((item) => item.toJson()).toList(),
    };
  }
}

class AdminAnnouncementCreateRequest {
  final String content;
  final bool showAsPopup;
  final String status;
  final String target;
  final String title;

  AdminAnnouncementCreateRequest({
    required this.content,
    required this.showAsPopup,
    required this.status,
    required this.target,
    required this.title
  });

  factory AdminAnnouncementCreateRequest.fromJson(Map<String, dynamic> json) {
    return AdminAnnouncementCreateRequest(
      content: (() {
        final value = json['content']?.toString();
        if (value == null) {
          throw FormatException('AdminAnnouncementCreateRequest.content is required');
        }
        return value;
      })(),
      showAsPopup: (() {
        final value = json['showAsPopup'];
        if (value is! bool) {
          throw FormatException('AdminAnnouncementCreateRequest.showAsPopup is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminAnnouncementCreateRequest.status is required');
        }
        return value;
      })(),
      target: (() {
        final value = json['target']?.toString();
        if (value == null) {
          throw FormatException('AdminAnnouncementCreateRequest.target is required');
        }
        return value;
      })(),
      title: (() {
        final value = json['title']?.toString();
        if (value == null) {
          throw FormatException('AdminAnnouncementCreateRequest.title is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'content': content,
      'showAsPopup': showAsPopup,
      'status': status,
      'target': target,
      'title': title,
    };
  }
}

class AdminAnnouncementItem {
  final String content;
  final String date;
  final String id;
  final bool showAsPopup;
  final String status;
  final String target;
  final String title;

  AdminAnnouncementItem({
    required this.content,
    required this.date,
    required this.id,
    required this.showAsPopup,
    required this.status,
    required this.target,
    required this.title
  });

  factory AdminAnnouncementItem.fromJson(Map<String, dynamic> json) {
    return AdminAnnouncementItem(
      content: (() {
        final value = json['content']?.toString();
        if (value == null) {
          throw FormatException('AdminAnnouncementItem.content is required');
        }
        return value;
      })(),
      date: (() {
        final value = json['date']?.toString();
        if (value == null) {
          throw FormatException('AdminAnnouncementItem.date is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminAnnouncementItem.id is required');
        }
        return value;
      })(),
      showAsPopup: (() {
        final value = json['showAsPopup'];
        if (value is! bool) {
          throw FormatException('AdminAnnouncementItem.showAsPopup is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminAnnouncementItem.status is required');
        }
        return value;
      })(),
      target: (() {
        final value = json['target']?.toString();
        if (value == null) {
          throw FormatException('AdminAnnouncementItem.target is required');
        }
        return value;
      })(),
      title: (() {
        final value = json['title']?.toString();
        if (value == null) {
          throw FormatException('AdminAnnouncementItem.title is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'content': content,
      'date': date,
      'id': id,
      'showAsPopup': showAsPopup,
      'status': status,
      'target': target,
      'title': title,
    };
  }
}

class AdminAnnouncementMutationResponse {
  final AdminAnnouncementItem item;

  AdminAnnouncementMutationResponse({
    required this.item
  });

  factory AdminAnnouncementMutationResponse.fromJson(Map<String, dynamic> json) {
    return AdminAnnouncementMutationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('AdminAnnouncementMutationResponse.item is required');
        }
        return AdminAnnouncementItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class AdminAnnouncementUpdateRequest {
  final String? content;
  final bool? showAsPopup;
  final String? status;
  final String? target;
  final String? title;

  AdminAnnouncementUpdateRequest({
    this.content,
    this.showAsPopup,
    this.status,
    this.target,
    this.title
  });

  factory AdminAnnouncementUpdateRequest.fromJson(Map<String, dynamic> json) {
    return AdminAnnouncementUpdateRequest(
      content: json['content']?.toString(),
      showAsPopup: json['showAsPopup'] is bool ? json['showAsPopup'] : null,
      status: json['status']?.toString(),
      target: json['target']?.toString(),
      title: json['title']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'content': content,
      'showAsPopup': showAsPopup,
      'status': status,
      'target': target,
      'title': title,
    };
  }
}

class AdminAnnouncementsResponse {
  final List<AdminAnnouncementItem> items;

  AdminAnnouncementsResponse({
    required this.items
  });

  factory AdminAnnouncementsResponse.fromJson(Map<String, dynamic> json) {
    return AdminAnnouncementsResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminAnnouncementsResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAnnouncementItem.fromJson(map);
      })())
            .whereType<AdminAnnouncementItem>()
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

class AdminApiKeyCreateRequest {
  final String name;
  final String userId;

  AdminApiKeyCreateRequest({
    required this.name,
    required this.userId
  });

  factory AdminApiKeyCreateRequest.fromJson(Map<String, dynamic> json) {
    return AdminApiKeyCreateRequest(
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AdminApiKeyCreateRequest.name is required');
        }
        return value;
      })(),
      userId: (() {
        final value = json['userId']?.toString();
        if (value == null) {
          throw FormatException('AdminApiKeyCreateRequest.userId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'name': name,
      'userId': userId,
    };
  }
}

class AdminApiKeyCreateResponse {
  final AdminApiKeyItem key;
  final String rawKey;

  AdminApiKeyCreateResponse({
    required this.key,
    required this.rawKey
  });

  factory AdminApiKeyCreateResponse.fromJson(Map<String, dynamic> json) {
    return AdminApiKeyCreateResponse(
      key: (() {
        final map = _sdkworkAsMap(json['key']);
        if (map == null) {
          throw FormatException('AdminApiKeyCreateResponse.key is required');
        }
        return AdminApiKeyItem.fromJson(map);
      })(),
      rawKey: (() {
        final value = json['rawKey']?.toString();
        if (value == null) {
          throw FormatException('AdminApiKeyCreateResponse.rawKey is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'key': key.toJson(),
      'rawKey': rawKey,
    };
  }
}

class AdminApiKeyItem {
  final String id;
  final String key;
  final String name;
  final String status;
  final String used;

  AdminApiKeyItem({
    required this.id,
    required this.key,
    required this.name,
    required this.status,
    required this.used
  });

  factory AdminApiKeyItem.fromJson(Map<String, dynamic> json) {
    return AdminApiKeyItem(
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminApiKeyItem.id is required');
        }
        return value;
      })(),
      key: (() {
        final value = json['key']?.toString();
        if (value == null) {
          throw FormatException('AdminApiKeyItem.key is required');
        }
        return value;
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AdminApiKeyItem.name is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminApiKeyItem.status is required');
        }
        return value;
      })(),
      used: (() {
        final value = json['used']?.toString();
        if (value == null) {
          throw FormatException('AdminApiKeyItem.used is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'key': key,
      'name': name,
      'status': status,
      'used': used,
    };
  }
}

class AdminAuthSettingsResponse {
  final String leftRailMode;
  final List<String> loginMethods;
  final bool oauthLoginEnabled;
  final List<String> oauthProviders;
  final String? oauthRegion;
  final bool qrLoginEnabled;
  final String qrLoginType;
  final List<String> recoveryMethods;
  final List<String> registerMethods;
  final AdminAuthVerificationPolicy verificationPolicy;
  final AdminAuthWechatSettings wechat;

  AdminAuthSettingsResponse({
    required this.leftRailMode,
    required this.loginMethods,
    required this.oauthLoginEnabled,
    required this.oauthProviders,
    this.oauthRegion,
    required this.qrLoginEnabled,
    required this.qrLoginType,
    required this.recoveryMethods,
    required this.registerMethods,
    required this.verificationPolicy,
    required this.wechat
  });

  factory AdminAuthSettingsResponse.fromJson(Map<String, dynamic> json) {
    return AdminAuthSettingsResponse(
      leftRailMode: (() {
        final value = json['leftRailMode']?.toString();
        if (value == null) {
          throw FormatException('AdminAuthSettingsResponse.leftRailMode is required');
        }
        return value;
      })(),
      loginMethods: (() {
        final list = _sdkworkAsList(json['loginMethods']);
        if (list == null) {
          throw FormatException('AdminAuthSettingsResponse.loginMethods is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      oauthLoginEnabled: (() {
        final value = json['oauthLoginEnabled'];
        if (value is! bool) {
          throw FormatException('AdminAuthSettingsResponse.oauthLoginEnabled is required');
        }
        return value;
      })(),
      oauthProviders: (() {
        final list = _sdkworkAsList(json['oauthProviders']);
        if (list == null) {
          throw FormatException('AdminAuthSettingsResponse.oauthProviders is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      oauthRegion: json['oauthRegion']?.toString(),
      qrLoginEnabled: (() {
        final value = json['qrLoginEnabled'];
        if (value is! bool) {
          throw FormatException('AdminAuthSettingsResponse.qrLoginEnabled is required');
        }
        return value;
      })(),
      qrLoginType: (() {
        final value = json['qrLoginType']?.toString();
        if (value == null) {
          throw FormatException('AdminAuthSettingsResponse.qrLoginType is required');
        }
        return value;
      })(),
      recoveryMethods: (() {
        final list = _sdkworkAsList(json['recoveryMethods']);
        if (list == null) {
          throw FormatException('AdminAuthSettingsResponse.recoveryMethods is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      registerMethods: (() {
        final list = _sdkworkAsList(json['registerMethods']);
        if (list == null) {
          throw FormatException('AdminAuthSettingsResponse.registerMethods is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      verificationPolicy: (() {
        final map = _sdkworkAsMap(json['verificationPolicy']);
        if (map == null) {
          throw FormatException('AdminAuthSettingsResponse.verificationPolicy is required');
        }
        return AdminAuthVerificationPolicy.fromJson(map);
      })(),
      wechat: (() {
        final map = _sdkworkAsMap(json['wechat']);
        if (map == null) {
          throw FormatException('AdminAuthSettingsResponse.wechat is required');
        }
        return AdminAuthWechatSettings.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'leftRailMode': leftRailMode,
      'loginMethods': loginMethods.map((item) => item).toList(),
      'oauthLoginEnabled': oauthLoginEnabled,
      'oauthProviders': oauthProviders.map((item) => item).toList(),
      'oauthRegion': oauthRegion,
      'qrLoginEnabled': qrLoginEnabled,
      'qrLoginType': qrLoginType,
      'recoveryMethods': recoveryMethods.map((item) => item).toList(),
      'registerMethods': registerMethods.map((item) => item).toList(),
      'verificationPolicy': verificationPolicy.toJson(),
      'wechat': wechat.toJson(),
    };
  }
}

class AdminAuthSettingsUpdateRequest {
  final String? leftRailMode;
  final List<String>? loginMethods;
  final bool? oauthLoginEnabled;
  final List<String>? oauthProviders;
  final String? oauthRegion;
  final bool? qrLoginEnabled;
  final String? qrLoginType;
  final List<String>? recoveryMethods;
  final List<String>? registerMethods;
  final AdminAuthVerificationPolicy? verificationPolicy;
  final AdminAuthWechatSettingsUpdate? wechat;

  AdminAuthSettingsUpdateRequest({
    this.leftRailMode,
    this.loginMethods,
    this.oauthLoginEnabled,
    this.oauthProviders,
    this.oauthRegion,
    this.qrLoginEnabled,
    this.qrLoginType,
    this.recoveryMethods,
    this.registerMethods,
    this.verificationPolicy,
    this.wechat
  });

  factory AdminAuthSettingsUpdateRequest.fromJson(Map<String, dynamic> json) {
    return AdminAuthSettingsUpdateRequest(
      leftRailMode: json['leftRailMode']?.toString(),
      loginMethods: (() {
        final list = _sdkworkAsList(json['loginMethods']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      oauthLoginEnabled: json['oauthLoginEnabled'] is bool ? json['oauthLoginEnabled'] : null,
      oauthProviders: (() {
        final list = _sdkworkAsList(json['oauthProviders']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      oauthRegion: json['oauthRegion']?.toString(),
      qrLoginEnabled: json['qrLoginEnabled'] is bool ? json['qrLoginEnabled'] : null,
      qrLoginType: json['qrLoginType']?.toString(),
      recoveryMethods: (() {
        final list = _sdkworkAsList(json['recoveryMethods']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      registerMethods: (() {
        final list = _sdkworkAsList(json['registerMethods']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      verificationPolicy: (() {
        final map = _sdkworkAsMap(json['verificationPolicy']);
        return map == null ? null : AdminAuthVerificationPolicy.fromJson(map);
      })(),
      wechat: (() {
        final map = _sdkworkAsMap(json['wechat']);
        return map == null ? null : AdminAuthWechatSettingsUpdate.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'leftRailMode': leftRailMode,
      'loginMethods': loginMethods?.map((item) => item).toList(),
      'oauthLoginEnabled': oauthLoginEnabled,
      'oauthProviders': oauthProviders?.map((item) => item).toList(),
      'oauthRegion': oauthRegion,
      'qrLoginEnabled': qrLoginEnabled,
      'qrLoginType': qrLoginType,
      'recoveryMethods': recoveryMethods?.map((item) => item).toList(),
      'registerMethods': registerMethods?.map((item) => item).toList(),
      'verificationPolicy': verificationPolicy?.toJson(),
      'wechat': wechat?.toJson(),
    };
  }
}

class AdminAuthVerificationPolicy {
  final bool emailCodeLoginEnabled;
  final bool emailRegistrationVerificationRequired;
  final bool phoneCodeLoginEnabled;
  final bool phoneRegistrationVerificationRequired;

  AdminAuthVerificationPolicy({
    required this.emailCodeLoginEnabled,
    required this.emailRegistrationVerificationRequired,
    required this.phoneCodeLoginEnabled,
    required this.phoneRegistrationVerificationRequired
  });

  factory AdminAuthVerificationPolicy.fromJson(Map<String, dynamic> json) {
    return AdminAuthVerificationPolicy(
      emailCodeLoginEnabled: (() {
        final value = json['emailCodeLoginEnabled'];
        if (value is! bool) {
          throw FormatException('AdminAuthVerificationPolicy.emailCodeLoginEnabled is required');
        }
        return value;
      })(),
      emailRegistrationVerificationRequired: (() {
        final value = json['emailRegistrationVerificationRequired'];
        if (value is! bool) {
          throw FormatException('AdminAuthVerificationPolicy.emailRegistrationVerificationRequired is required');
        }
        return value;
      })(),
      phoneCodeLoginEnabled: (() {
        final value = json['phoneCodeLoginEnabled'];
        if (value is! bool) {
          throw FormatException('AdminAuthVerificationPolicy.phoneCodeLoginEnabled is required');
        }
        return value;
      })(),
      phoneRegistrationVerificationRequired: (() {
        final value = json['phoneRegistrationVerificationRequired'];
        if (value is! bool) {
          throw FormatException('AdminAuthVerificationPolicy.phoneRegistrationVerificationRequired is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'emailCodeLoginEnabled': emailCodeLoginEnabled,
      'emailRegistrationVerificationRequired': emailRegistrationVerificationRequired,
      'phoneCodeLoginEnabled': phoneCodeLoginEnabled,
      'phoneRegistrationVerificationRequired': phoneRegistrationVerificationRequired,
    };
  }
}

class AdminAuthWechatMini {
  final String appId;
  final bool enabled;
  final String env;
  final String key;
  final String name;
  final String path;
  final bool primary;
  final String secretRef;
  final String? url;

  AdminAuthWechatMini({
    required this.appId,
    required this.enabled,
    required this.env,
    required this.key,
    required this.name,
    required this.path,
    required this.primary,
    required this.secretRef,
    this.url
  });

  factory AdminAuthWechatMini.fromJson(Map<String, dynamic> json) {
    return AdminAuthWechatMini(
      appId: (() {
        final value = json['appId']?.toString();
        if (value == null) {
          throw FormatException('AdminAuthWechatMini.appId is required');
        }
        return value;
      })(),
      enabled: (() {
        final value = json['enabled'];
        if (value is! bool) {
          throw FormatException('AdminAuthWechatMini.enabled is required');
        }
        return value;
      })(),
      env: (() {
        final value = json['env']?.toString();
        if (value == null) {
          throw FormatException('AdminAuthWechatMini.env is required');
        }
        return value;
      })(),
      key: (() {
        final value = json['key']?.toString();
        if (value == null) {
          throw FormatException('AdminAuthWechatMini.key is required');
        }
        return value;
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AdminAuthWechatMini.name is required');
        }
        return value;
      })(),
      path: (() {
        final value = json['path']?.toString();
        if (value == null) {
          throw FormatException('AdminAuthWechatMini.path is required');
        }
        return value;
      })(),
      primary: (() {
        final value = json['primary'];
        if (value is! bool) {
          throw FormatException('AdminAuthWechatMini.primary is required');
        }
        return value;
      })(),
      secretRef: (() {
        final value = json['secretRef']?.toString();
        if (value == null) {
          throw FormatException('AdminAuthWechatMini.secretRef is required');
        }
        return value;
      })(),
      url: json['url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'appId': appId,
      'enabled': enabled,
      'env': env,
      'key': key,
      'name': name,
      'path': path,
      'primary': primary,
      'secretRef': secretRef,
      'url': url,
    };
  }
}

class AdminAuthWechatOfficial {
  final String? aesKeyRef;
  final String appId;
  final bool enabled;
  final String key;
  final String name;
  final String? originalId;
  final bool primary;
  final String? scene;
  final String secretRef;
  final String tokenRef;
  final String? url;

  AdminAuthWechatOfficial({
    this.aesKeyRef,
    required this.appId,
    required this.enabled,
    required this.key,
    required this.name,
    this.originalId,
    required this.primary,
    this.scene,
    required this.secretRef,
    required this.tokenRef,
    this.url
  });

  factory AdminAuthWechatOfficial.fromJson(Map<String, dynamic> json) {
    return AdminAuthWechatOfficial(
      aesKeyRef: json['aesKeyRef']?.toString(),
      appId: (() {
        final value = json['appId']?.toString();
        if (value == null) {
          throw FormatException('AdminAuthWechatOfficial.appId is required');
        }
        return value;
      })(),
      enabled: (() {
        final value = json['enabled'];
        if (value is! bool) {
          throw FormatException('AdminAuthWechatOfficial.enabled is required');
        }
        return value;
      })(),
      key: (() {
        final value = json['key']?.toString();
        if (value == null) {
          throw FormatException('AdminAuthWechatOfficial.key is required');
        }
        return value;
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AdminAuthWechatOfficial.name is required');
        }
        return value;
      })(),
      originalId: json['originalId']?.toString(),
      primary: (() {
        final value = json['primary'];
        if (value is! bool) {
          throw FormatException('AdminAuthWechatOfficial.primary is required');
        }
        return value;
      })(),
      scene: json['scene']?.toString(),
      secretRef: (() {
        final value = json['secretRef']?.toString();
        if (value == null) {
          throw FormatException('AdminAuthWechatOfficial.secretRef is required');
        }
        return value;
      })(),
      tokenRef: (() {
        final value = json['tokenRef']?.toString();
        if (value == null) {
          throw FormatException('AdminAuthWechatOfficial.tokenRef is required');
        }
        return value;
      })(),
      url: json['url']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'aesKeyRef': aesKeyRef,
      'appId': appId,
      'enabled': enabled,
      'key': key,
      'name': name,
      'originalId': originalId,
      'primary': primary,
      'scene': scene,
      'secretRef': secretRef,
      'tokenRef': tokenRef,
      'url': url,
    };
  }
}

class AdminAuthWechatSettings {
  final List<AdminAuthWechatMini> mini;
  final List<AdminAuthWechatOfficial> official;

  AdminAuthWechatSettings({
    required this.mini,
    required this.official
  });

  factory AdminAuthWechatSettings.fromJson(Map<String, dynamic> json) {
    return AdminAuthWechatSettings(
      mini: (() {
        final list = _sdkworkAsList(json['mini']);
        if (list == null) {
          throw FormatException('AdminAuthWechatSettings.mini is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAuthWechatMini.fromJson(map);
      })())
            .whereType<AdminAuthWechatMini>()
            .toList();
      })(),
      official: (() {
        final list = _sdkworkAsList(json['official']);
        if (list == null) {
          throw FormatException('AdminAuthWechatSettings.official is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAuthWechatOfficial.fromJson(map);
      })())
            .whereType<AdminAuthWechatOfficial>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'mini': mini.map((item) => item.toJson()).toList(),
      'official': official.map((item) => item.toJson()).toList(),
    };
  }
}

class AdminAuthWechatSettingsUpdate {
  final List<AdminAuthWechatMini>? mini;
  final List<AdminAuthWechatOfficial>? official;

  AdminAuthWechatSettingsUpdate({
    this.mini,
    this.official
  });

  factory AdminAuthWechatSettingsUpdate.fromJson(Map<String, dynamic> json) {
    return AdminAuthWechatSettingsUpdate(
      mini: (() {
        final list = _sdkworkAsList(json['mini']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAuthWechatMini.fromJson(map);
      })())
            .whereType<AdminAuthWechatMini>()
            .toList();
      })(),
      official: (() {
        final list = _sdkworkAsList(json['official']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAuthWechatOfficial.fromJson(map);
      })())
            .whereType<AdminAuthWechatOfficial>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'mini': mini?.map((item) => item.toJson()).toList(),
      'official': official?.map((item) => item.toJson()).toList(),
    };
  }
}

class AdminCacheInstance {
  final String cacheDeletes;
  final String cacheErrors;
  final String cacheHits;
  final String cacheInspections;
  final String cacheMisses;
  final String cacheRefreshes;
  final String cacheWrites;
  final String? connectionProfileName;
  final String defaultTtlSeconds;
  final String entryCount;
  final String expiredEntryCount;
  final String keyPrefix;
  final String? maxEntries;
  final String name;
  final String providerKind;
  final String purpose;
  final String status;
  final bool supportsDelete;
  final bool supportsInspect;
  final bool supportsRefresh;

  AdminCacheInstance({
    required this.cacheDeletes,
    required this.cacheErrors,
    required this.cacheHits,
    required this.cacheInspections,
    required this.cacheMisses,
    required this.cacheRefreshes,
    required this.cacheWrites,
    this.connectionProfileName,
    required this.defaultTtlSeconds,
    required this.entryCount,
    required this.expiredEntryCount,
    required this.keyPrefix,
    this.maxEntries,
    required this.name,
    required this.providerKind,
    required this.purpose,
    required this.status,
    required this.supportsDelete,
    required this.supportsInspect,
    required this.supportsRefresh
  });

  factory AdminCacheInstance.fromJson(Map<String, dynamic> json) {
    return AdminCacheInstance(
      cacheDeletes: (() {
        final value = json['cacheDeletes']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheInstance.cacheDeletes is required');
        }
        return value;
      })(),
      cacheErrors: (() {
        final value = json['cacheErrors']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheInstance.cacheErrors is required');
        }
        return value;
      })(),
      cacheHits: (() {
        final value = json['cacheHits']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheInstance.cacheHits is required');
        }
        return value;
      })(),
      cacheInspections: (() {
        final value = json['cacheInspections']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheInstance.cacheInspections is required');
        }
        return value;
      })(),
      cacheMisses: (() {
        final value = json['cacheMisses']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheInstance.cacheMisses is required');
        }
        return value;
      })(),
      cacheRefreshes: (() {
        final value = json['cacheRefreshes']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheInstance.cacheRefreshes is required');
        }
        return value;
      })(),
      cacheWrites: (() {
        final value = json['cacheWrites']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheInstance.cacheWrites is required');
        }
        return value;
      })(),
      connectionProfileName: json['connectionProfileName']?.toString(),
      defaultTtlSeconds: (() {
        final value = json['defaultTtlSeconds']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheInstance.defaultTtlSeconds is required');
        }
        return value;
      })(),
      entryCount: (() {
        final value = json['entryCount']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheInstance.entryCount is required');
        }
        return value;
      })(),
      expiredEntryCount: (() {
        final value = json['expiredEntryCount']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheInstance.expiredEntryCount is required');
        }
        return value;
      })(),
      keyPrefix: (() {
        final value = json['keyPrefix']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheInstance.keyPrefix is required');
        }
        return value;
      })(),
      maxEntries: json['maxEntries']?.toString(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheInstance.name is required');
        }
        return value;
      })(),
      providerKind: (() {
        final value = json['providerKind']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheInstance.providerKind is required');
        }
        return value;
      })(),
      purpose: (() {
        final value = json['purpose']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheInstance.purpose is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheInstance.status is required');
        }
        return value;
      })(),
      supportsDelete: (() {
        final value = json['supportsDelete'];
        if (value is! bool) {
          throw FormatException('AdminCacheInstance.supportsDelete is required');
        }
        return value;
      })(),
      supportsInspect: (() {
        final value = json['supportsInspect'];
        if (value is! bool) {
          throw FormatException('AdminCacheInstance.supportsInspect is required');
        }
        return value;
      })(),
      supportsRefresh: (() {
        final value = json['supportsRefresh'];
        if (value is! bool) {
          throw FormatException('AdminCacheInstance.supportsRefresh is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cacheDeletes': cacheDeletes,
      'cacheErrors': cacheErrors,
      'cacheHits': cacheHits,
      'cacheInspections': cacheInspections,
      'cacheMisses': cacheMisses,
      'cacheRefreshes': cacheRefreshes,
      'cacheWrites': cacheWrites,
      'connectionProfileName': connectionProfileName,
      'defaultTtlSeconds': defaultTtlSeconds,
      'entryCount': entryCount,
      'expiredEntryCount': expiredEntryCount,
      'keyPrefix': keyPrefix,
      'maxEntries': maxEntries,
      'name': name,
      'providerKind': providerKind,
      'purpose': purpose,
      'status': status,
      'supportsDelete': supportsDelete,
      'supportsInspect': supportsInspect,
      'supportsRefresh': supportsRefresh,
    };
  }
}

class AdminCacheKeyItem {
  final String? expiresInSeconds;
  final String instanceName;
  final String key;
  final String namespace;
  final String status;

  AdminCacheKeyItem({
    this.expiresInSeconds,
    required this.instanceName,
    required this.key,
    required this.namespace,
    required this.status
  });

  factory AdminCacheKeyItem.fromJson(Map<String, dynamic> json) {
    return AdminCacheKeyItem(
      expiresInSeconds: json['expiresInSeconds']?.toString(),
      instanceName: (() {
        final value = json['instanceName']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheKeyItem.instanceName is required');
        }
        return value;
      })(),
      key: (() {
        final value = json['key']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheKeyItem.key is required');
        }
        return value;
      })(),
      namespace: (() {
        final value = json['namespace']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheKeyItem.namespace is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheKeyItem.status is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'expiresInSeconds': expiresInSeconds,
      'instanceName': instanceName,
      'key': key,
      'namespace': namespace,
      'status': status,
    };
  }
}

class AdminCacheKeyListResponse {
  final bool hasMore;
  final String instanceName;
  final List<AdminCacheKeyItem> items;
  final String limit;
  final String namespace;
  final String nextCursor;
  final String returnedItems;
  final bool scanComplete;
  final String scannedItems;

  AdminCacheKeyListResponse({
    required this.hasMore,
    required this.instanceName,
    required this.items,
    required this.limit,
    required this.namespace,
    required this.nextCursor,
    required this.returnedItems,
    required this.scanComplete,
    required this.scannedItems
  });

  factory AdminCacheKeyListResponse.fromJson(Map<String, dynamic> json) {
    return AdminCacheKeyListResponse(
      hasMore: (() {
        final value = json['hasMore'];
        if (value is! bool) {
          throw FormatException('AdminCacheKeyListResponse.hasMore is required');
        }
        return value;
      })(),
      instanceName: (() {
        final value = json['instanceName']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheKeyListResponse.instanceName is required');
        }
        return value;
      })(),
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminCacheKeyListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminCacheKeyItem.fromJson(map);
      })())
            .whereType<AdminCacheKeyItem>()
            .toList();
      })(),
      limit: (() {
        final value = json['limit']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheKeyListResponse.limit is required');
        }
        return value;
      })(),
      namespace: (() {
        final value = json['namespace']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheKeyListResponse.namespace is required');
        }
        return value;
      })(),
      nextCursor: (() {
        final value = json['nextCursor']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheKeyListResponse.nextCursor is required');
        }
        return value;
      })(),
      returnedItems: (() {
        final value = json['returnedItems']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheKeyListResponse.returnedItems is required');
        }
        return value;
      })(),
      scanComplete: (() {
        final value = json['scanComplete'];
        if (value is! bool) {
          throw FormatException('AdminCacheKeyListResponse.scanComplete is required');
        }
        return value;
      })(),
      scannedItems: (() {
        final value = json['scannedItems']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheKeyListResponse.scannedItems is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'hasMore': hasMore,
      'instanceName': instanceName,
      'items': items.map((item) => item.toJson()).toList(),
      'limit': limit,
      'namespace': namespace,
      'nextCursor': nextCursor,
      'returnedItems': returnedItems,
      'scanComplete': scanComplete,
      'scannedItems': scannedItems,
    };
  }
}

class AdminCacheNamespacePolicy {
  final String consistency;
  final bool enabled;
  final String failureMode;
  final String instanceName;
  final String jitterPercent;
  final String namespace;
  final String scope;
  final String sensitivity;
  final String staleWhileRevalidateSeconds;
  final List<String> tags;
  final String ttlSeconds;

  AdminCacheNamespacePolicy({
    required this.consistency,
    required this.enabled,
    required this.failureMode,
    required this.instanceName,
    required this.jitterPercent,
    required this.namespace,
    required this.scope,
    required this.sensitivity,
    required this.staleWhileRevalidateSeconds,
    required this.tags,
    required this.ttlSeconds
  });

  factory AdminCacheNamespacePolicy.fromJson(Map<String, dynamic> json) {
    return AdminCacheNamespacePolicy(
      consistency: (() {
        final value = json['consistency']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheNamespacePolicy.consistency is required');
        }
        return value;
      })(),
      enabled: (() {
        final value = json['enabled'];
        if (value is! bool) {
          throw FormatException('AdminCacheNamespacePolicy.enabled is required');
        }
        return value;
      })(),
      failureMode: (() {
        final value = json['failureMode']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheNamespacePolicy.failureMode is required');
        }
        return value;
      })(),
      instanceName: (() {
        final value = json['instanceName']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheNamespacePolicy.instanceName is required');
        }
        return value;
      })(),
      jitterPercent: (() {
        final value = json['jitterPercent']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheNamespacePolicy.jitterPercent is required');
        }
        return value;
      })(),
      namespace: (() {
        final value = json['namespace']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheNamespacePolicy.namespace is required');
        }
        return value;
      })(),
      scope: (() {
        final value = json['scope']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheNamespacePolicy.scope is required');
        }
        return value;
      })(),
      sensitivity: (() {
        final value = json['sensitivity']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheNamespacePolicy.sensitivity is required');
        }
        return value;
      })(),
      staleWhileRevalidateSeconds: (() {
        final value = json['staleWhileRevalidateSeconds']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheNamespacePolicy.staleWhileRevalidateSeconds is required');
        }
        return value;
      })(),
      tags: (() {
        final list = _sdkworkAsList(json['tags']);
        if (list == null) {
          throw FormatException('AdminCacheNamespacePolicy.tags is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      ttlSeconds: (() {
        final value = json['ttlSeconds']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheNamespacePolicy.ttlSeconds is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'consistency': consistency,
      'enabled': enabled,
      'failureMode': failureMode,
      'instanceName': instanceName,
      'jitterPercent': jitterPercent,
      'namespace': namespace,
      'scope': scope,
      'sensitivity': sensitivity,
      'staleWhileRevalidateSeconds': staleWhileRevalidateSeconds,
      'tags': tags.map((item) => item).toList(),
      'ttlSeconds': ttlSeconds,
    };
  }
}

class AdminCacheOperationResponse {
  final String? cacheKey;
  final String deletedEntries;
  final String? instanceName;
  final String? namespace;
  final String operation;
  final String refreshedEntries;
  final String status;

  AdminCacheOperationResponse({
    this.cacheKey,
    required this.deletedEntries,
    this.instanceName,
    this.namespace,
    required this.operation,
    required this.refreshedEntries,
    required this.status
  });

  factory AdminCacheOperationResponse.fromJson(Map<String, dynamic> json) {
    return AdminCacheOperationResponse(
      cacheKey: json['cacheKey']?.toString(),
      deletedEntries: (() {
        final value = json['deletedEntries']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheOperationResponse.deletedEntries is required');
        }
        return value;
      })(),
      instanceName: json['instanceName']?.toString(),
      namespace: json['namespace']?.toString(),
      operation: (() {
        final value = json['operation']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheOperationResponse.operation is required');
        }
        return value;
      })(),
      refreshedEntries: (() {
        final value = json['refreshedEntries']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheOperationResponse.refreshedEntries is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheOperationResponse.status is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cacheKey': cacheKey,
      'deletedEntries': deletedEntries,
      'instanceName': instanceName,
      'namespace': namespace,
      'operation': operation,
      'refreshedEntries': refreshedEntries,
      'status': status,
    };
  }
}

class AdminCacheOverviewResponse {
  final List<AdminCacheInstance> instances;
  final List<AdminCacheNamespacePolicy> namespacePolicies;
  final AdminCacheSummary summary;

  AdminCacheOverviewResponse({
    required this.instances,
    required this.namespacePolicies,
    required this.summary
  });

  factory AdminCacheOverviewResponse.fromJson(Map<String, dynamic> json) {
    return AdminCacheOverviewResponse(
      instances: (() {
        final list = _sdkworkAsList(json['instances']);
        if (list == null) {
          throw FormatException('AdminCacheOverviewResponse.instances is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminCacheInstance.fromJson(map);
      })())
            .whereType<AdminCacheInstance>()
            .toList();
      })(),
      namespacePolicies: (() {
        final list = _sdkworkAsList(json['namespacePolicies']);
        if (list == null) {
          throw FormatException('AdminCacheOverviewResponse.namespacePolicies is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminCacheNamespacePolicy.fromJson(map);
      })())
            .whereType<AdminCacheNamespacePolicy>()
            .toList();
      })(),
      summary: (() {
        final map = _sdkworkAsMap(json['summary']);
        if (map == null) {
          throw FormatException('AdminCacheOverviewResponse.summary is required');
        }
        return AdminCacheSummary.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'instances': instances.map((item) => item.toJson()).toList(),
      'namespacePolicies': namespacePolicies.map((item) => item.toJson()).toList(),
      'summary': summary.toJson(),
    };
  }
}

class AdminCacheSummary {
  final String cacheDeletes;
  final String cacheErrors;
  final String cacheHits;
  final String cacheInspections;
  final String cacheMisses;
  final String cacheRefreshes;
  final String cacheWrites;
  final String expiredEntries;
  final String runtimeTarget;
  final String totalEntries;
  final String totalInstances;
  final String totalNamespaces;

  AdminCacheSummary({
    required this.cacheDeletes,
    required this.cacheErrors,
    required this.cacheHits,
    required this.cacheInspections,
    required this.cacheMisses,
    required this.cacheRefreshes,
    required this.cacheWrites,
    required this.expiredEntries,
    required this.runtimeTarget,
    required this.totalEntries,
    required this.totalInstances,
    required this.totalNamespaces
  });

  factory AdminCacheSummary.fromJson(Map<String, dynamic> json) {
    return AdminCacheSummary(
      cacheDeletes: (() {
        final value = json['cacheDeletes']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheSummary.cacheDeletes is required');
        }
        return value;
      })(),
      cacheErrors: (() {
        final value = json['cacheErrors']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheSummary.cacheErrors is required');
        }
        return value;
      })(),
      cacheHits: (() {
        final value = json['cacheHits']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheSummary.cacheHits is required');
        }
        return value;
      })(),
      cacheInspections: (() {
        final value = json['cacheInspections']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheSummary.cacheInspections is required');
        }
        return value;
      })(),
      cacheMisses: (() {
        final value = json['cacheMisses']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheSummary.cacheMisses is required');
        }
        return value;
      })(),
      cacheRefreshes: (() {
        final value = json['cacheRefreshes']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheSummary.cacheRefreshes is required');
        }
        return value;
      })(),
      cacheWrites: (() {
        final value = json['cacheWrites']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheSummary.cacheWrites is required');
        }
        return value;
      })(),
      expiredEntries: (() {
        final value = json['expiredEntries']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheSummary.expiredEntries is required');
        }
        return value;
      })(),
      runtimeTarget: (() {
        final value = json['runtimeTarget']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheSummary.runtimeTarget is required');
        }
        return value;
      })(),
      totalEntries: (() {
        final value = json['totalEntries']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheSummary.totalEntries is required');
        }
        return value;
      })(),
      totalInstances: (() {
        final value = json['totalInstances']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheSummary.totalInstances is required');
        }
        return value;
      })(),
      totalNamespaces: (() {
        final value = json['totalNamespaces']?.toString();
        if (value == null) {
          throw FormatException('AdminCacheSummary.totalNamespaces is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cacheDeletes': cacheDeletes,
      'cacheErrors': cacheErrors,
      'cacheHits': cacheHits,
      'cacheInspections': cacheInspections,
      'cacheMisses': cacheMisses,
      'cacheRefreshes': cacheRefreshes,
      'cacheWrites': cacheWrites,
      'expiredEntries': expiredEntries,
      'runtimeTarget': runtimeTarget,
      'totalEntries': totalEntries,
      'totalInstances': totalInstances,
      'totalNamespaces': totalNamespaces,
    };
  }
}

class AdminCapacityPair {
  final double total;
  final double used;

  AdminCapacityPair({
    required this.total,
    required this.used
  });

  factory AdminCapacityPair.fromJson(Map<String, dynamic> json) {
    return AdminCapacityPair(
      total: (() {
        final value = json['total'];
        if (value is! num) {
          throw FormatException('AdminCapacityPair.total is required');
        }
        return value.toDouble();
      })(),
      used: (() {
        final value = json['used'];
        if (value is! num) {
          throw FormatException('AdminCapacityPair.used is required');
        }
        return value.toDouble();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'total': total,
      'used': used,
    };
  }
}

class AdminChannelCreateRequest {
  final String? accessType;
  final List<String>? capabilities;
  final String? channelType;
  final ProviderCircuitBreakerPolicy? circuitBreakerPolicy;
  final String? credentialRotation;
  final List<AdminChannelCredentialInput> credentials;
  final String? expiresAt;
  final String name;
  final String? protocol;
  final List<String>? resourceCodes;
  final ProviderRetryPolicy? retryPolicy;
  final String? status;
  final String? timeoutMs;
  final String vendor;
  final String? weight;

  AdminChannelCreateRequest({
    this.accessType,
    this.capabilities,
    this.channelType,
    this.circuitBreakerPolicy,
    this.credentialRotation,
    required this.credentials,
    this.expiresAt,
    required this.name,
    this.protocol,
    this.resourceCodes,
    this.retryPolicy,
    this.status,
    this.timeoutMs,
    required this.vendor,
    this.weight
  });

  factory AdminChannelCreateRequest.fromJson(Map<String, dynamic> json) {
    return AdminChannelCreateRequest(
      accessType: json['accessType']?.toString(),
      capabilities: (() {
        final list = _sdkworkAsList(json['capabilities']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      channelType: json['channelType']?.toString(),
      circuitBreakerPolicy: (() {
        final map = _sdkworkAsMap(json['circuitBreakerPolicy']);
        return map == null ? null : ProviderCircuitBreakerPolicy.fromJson(map);
      })(),
      credentialRotation: json['credentialRotation']?.toString(),
      credentials: (() {
        final list = _sdkworkAsList(json['credentials']);
        if (list == null) {
          throw FormatException('AdminChannelCreateRequest.credentials is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminChannelCredentialInput.fromJson(map);
      })())
            .whereType<AdminChannelCredentialInput>()
            .toList();
      })(),
      expiresAt: json['expiresAt']?.toString(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelCreateRequest.name is required');
        }
        return value;
      })(),
      protocol: json['protocol']?.toString(),
      resourceCodes: (() {
        final list = _sdkworkAsList(json['resourceCodes']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      retryPolicy: (() {
        final map = _sdkworkAsMap(json['retryPolicy']);
        return map == null ? null : ProviderRetryPolicy.fromJson(map);
      })(),
      status: json['status']?.toString(),
      timeoutMs: json['timeoutMs']?.toString(),
      vendor: (() {
        final value = json['vendor']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelCreateRequest.vendor is required');
        }
        return value;
      })(),
      weight: json['weight']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'accessType': accessType,
      'capabilities': capabilities?.map((item) => item).toList(),
      'channelType': channelType,
      'circuitBreakerPolicy': circuitBreakerPolicy?.toJson(),
      'credentialRotation': credentialRotation,
      'credentials': credentials.map((item) => item.toJson()).toList(),
      'expiresAt': expiresAt,
      'name': name,
      'protocol': protocol,
      'resourceCodes': resourceCodes?.map((item) => item).toList(),
      'retryPolicy': retryPolicy?.toJson(),
      'status': status,
      'timeoutMs': timeoutMs,
      'vendor': vendor,
      'weight': weight,
    };
  }
}

class AdminChannelCredentialInput {
  final String? apiKey;
  final String baseUrl;
  final String? name;
  final String? priority;
  final String? secretRef;
  final String? status;
  final String? weight;

  AdminChannelCredentialInput({
    this.apiKey,
    required this.baseUrl,
    this.name,
    this.priority,
    this.secretRef,
    this.status,
    this.weight
  });

  factory AdminChannelCredentialInput.fromJson(Map<String, dynamic> json) {
    return AdminChannelCredentialInput(
      apiKey: json['apiKey']?.toString(),
      baseUrl: (() {
        final value = json['baseUrl']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelCredentialInput.baseUrl is required');
        }
        return value;
      })(),
      name: json['name']?.toString(),
      priority: json['priority']?.toString(),
      secretRef: json['secretRef']?.toString(),
      status: json['status']?.toString(),
      weight: json['weight']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'apiKey': apiKey,
      'baseUrl': baseUrl,
      'name': name,
      'priority': priority,
      'secretRef': secretRef,
      'status': status,
      'weight': weight,
    };
  }
}

class AdminChannelCredentialItem {
  final String? apiKey;
  final String baseUrl;
  final String credentialId;
  final String errors;
  final String id;
  final String maskedLabel;
  final String name;
  final String priority;
  final String secretRef;
  final String status;
  final String weight;

  AdminChannelCredentialItem({
    this.apiKey,
    required this.baseUrl,
    required this.credentialId,
    required this.errors,
    required this.id,
    required this.maskedLabel,
    required this.name,
    required this.priority,
    required this.secretRef,
    required this.status,
    required this.weight
  });

  factory AdminChannelCredentialItem.fromJson(Map<String, dynamic> json) {
    return AdminChannelCredentialItem(
      apiKey: json['apiKey']?.toString(),
      baseUrl: (() {
        final value = json['baseUrl']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelCredentialItem.baseUrl is required');
        }
        return value;
      })(),
      credentialId: (() {
        final value = json['credentialId']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelCredentialItem.credentialId is required');
        }
        return value;
      })(),
      errors: (() {
        final value = json['errors']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelCredentialItem.errors is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelCredentialItem.id is required');
        }
        return value;
      })(),
      maskedLabel: (() {
        final value = json['maskedLabel']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelCredentialItem.maskedLabel is required');
        }
        return value;
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelCredentialItem.name is required');
        }
        return value;
      })(),
      priority: (() {
        final value = json['priority']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelCredentialItem.priority is required');
        }
        return value;
      })(),
      secretRef: (() {
        final value = json['secretRef']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelCredentialItem.secretRef is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelCredentialItem.status is required');
        }
        return value;
      })(),
      weight: (() {
        final value = json['weight']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelCredentialItem.weight is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'apiKey': apiKey,
      'baseUrl': baseUrl,
      'credentialId': credentialId,
      'errors': errors,
      'id': id,
      'maskedLabel': maskedLabel,
      'name': name,
      'priority': priority,
      'secretRef': secretRef,
      'status': status,
      'weight': weight,
    };
  }
}

class AdminChannelGroupChannelBindingInput {
  final List<String>? apiScope;
  final List<String>? capabilities;
  final String channelId;
  final int? priority;
  final List<String>? resourceCodes;
  final String? status;
  final int? weight;

  AdminChannelGroupChannelBindingInput({
    this.apiScope,
    this.capabilities,
    required this.channelId,
    this.priority,
    this.resourceCodes,
    this.status,
    this.weight
  });

  factory AdminChannelGroupChannelBindingInput.fromJson(Map<String, dynamic> json) {
    return AdminChannelGroupChannelBindingInput(
      apiScope: (() {
        final list = _sdkworkAsList(json['apiScope']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      capabilities: (() {
        final list = _sdkworkAsList(json['capabilities']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      channelId: (() {
        final value = json['channelId']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupChannelBindingInput.channelId is required');
        }
        return value;
      })(),
      priority: json['priority'] is int ? json['priority'] : null,
      resourceCodes: (() {
        final list = _sdkworkAsList(json['resourceCodes']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      status: json['status']?.toString(),
      weight: json['weight'] is int ? json['weight'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'apiScope': apiScope?.map((item) => item).toList(),
      'capabilities': capabilities?.map((item) => item).toList(),
      'channelId': channelId,
      'priority': priority,
      'resourceCodes': resourceCodes?.map((item) => item).toList(),
      'status': status,
      'weight': weight,
    };
  }
}

class AdminChannelGroupChannelBindingItem {
  final List<String> apiScope;
  final List<String> capabilities;
  final String channelCode;
  final String channelGroupId;
  final String channelId;
  final String channelName;
  final String healthStatus;
  final String id;
  final int priority;
  final String providerCode;
  final String providerName;
  final List<String> resourceCodes;
  final String status;
  final int weight;

  AdminChannelGroupChannelBindingItem({
    required this.apiScope,
    required this.capabilities,
    required this.channelCode,
    required this.channelGroupId,
    required this.channelId,
    required this.channelName,
    required this.healthStatus,
    required this.id,
    required this.priority,
    required this.providerCode,
    required this.providerName,
    required this.resourceCodes,
    required this.status,
    required this.weight
  });

  factory AdminChannelGroupChannelBindingItem.fromJson(Map<String, dynamic> json) {
    return AdminChannelGroupChannelBindingItem(
      apiScope: (() {
        final list = _sdkworkAsList(json['apiScope']);
        if (list == null) {
          throw FormatException('AdminChannelGroupChannelBindingItem.apiScope is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      capabilities: (() {
        final list = _sdkworkAsList(json['capabilities']);
        if (list == null) {
          throw FormatException('AdminChannelGroupChannelBindingItem.capabilities is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      channelCode: (() {
        final value = json['channelCode']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupChannelBindingItem.channelCode is required');
        }
        return value;
      })(),
      channelGroupId: (() {
        final value = json['channelGroupId']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupChannelBindingItem.channelGroupId is required');
        }
        return value;
      })(),
      channelId: (() {
        final value = json['channelId']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupChannelBindingItem.channelId is required');
        }
        return value;
      })(),
      channelName: (() {
        final value = json['channelName']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupChannelBindingItem.channelName is required');
        }
        return value;
      })(),
      healthStatus: (() {
        final value = json['healthStatus']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupChannelBindingItem.healthStatus is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupChannelBindingItem.id is required');
        }
        return value;
      })(),
      priority: (() {
        final value = json['priority'];
        if (value is! int) {
          throw FormatException('AdminChannelGroupChannelBindingItem.priority is required');
        }
        return value;
      })(),
      providerCode: (() {
        final value = json['providerCode']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupChannelBindingItem.providerCode is required');
        }
        return value;
      })(),
      providerName: (() {
        final value = json['providerName']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupChannelBindingItem.providerName is required');
        }
        return value;
      })(),
      resourceCodes: (() {
        final list = _sdkworkAsList(json['resourceCodes']);
        if (list == null) {
          throw FormatException('AdminChannelGroupChannelBindingItem.resourceCodes is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupChannelBindingItem.status is required');
        }
        return value;
      })(),
      weight: (() {
        final value = json['weight'];
        if (value is! int) {
          throw FormatException('AdminChannelGroupChannelBindingItem.weight is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'apiScope': apiScope.map((item) => item).toList(),
      'capabilities': capabilities.map((item) => item).toList(),
      'channelCode': channelCode,
      'channelGroupId': channelGroupId,
      'channelId': channelId,
      'channelName': channelName,
      'healthStatus': healthStatus,
      'id': id,
      'priority': priority,
      'providerCode': providerCode,
      'providerName': providerName,
      'resourceCodes': resourceCodes.map((item) => item).toList(),
      'status': status,
      'weight': weight,
    };
  }
}

class AdminChannelGroupChannelBindingsReplaceRequest {
  final List<AdminChannelGroupChannelBindingInput> items;

  AdminChannelGroupChannelBindingsReplaceRequest({
    required this.items
  });

  factory AdminChannelGroupChannelBindingsReplaceRequest.fromJson(Map<String, dynamic> json) {
    return AdminChannelGroupChannelBindingsReplaceRequest(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminChannelGroupChannelBindingsReplaceRequest.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminChannelGroupChannelBindingInput.fromJson(map);
      })())
            .whereType<AdminChannelGroupChannelBindingInput>()
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

class AdminChannelGroupChannelBindingsResponse {
  final List<AdminChannelGroupChannelBindingItem> items;

  AdminChannelGroupChannelBindingsResponse({
    required this.items
  });

  factory AdminChannelGroupChannelBindingsResponse.fromJson(Map<String, dynamic> json) {
    return AdminChannelGroupChannelBindingsResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminChannelGroupChannelBindingsResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminChannelGroupChannelBindingItem.fromJson(map);
      })())
            .whereType<AdminChannelGroupChannelBindingItem>()
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

class AdminChannelGroupCreateRequest {
  final Map<String, dynamic>? capacity;
  final String groupCode;
  final String groupName;
  final String groupType;
  final double? officialPriceMultiplier;
  final String priceReferenceMode;
  final double? rateMultiplier;
  final List<String>? resourceCodes;
  final List<String>? resourceGroupCodes;
  final String status;

  AdminChannelGroupCreateRequest({
    this.capacity,
    required this.groupCode,
    required this.groupName,
    required this.groupType,
    this.officialPriceMultiplier,
    required this.priceReferenceMode,
    this.rateMultiplier,
    this.resourceCodes,
    this.resourceGroupCodes,
    required this.status
  });

  factory AdminChannelGroupCreateRequest.fromJson(Map<String, dynamic> json) {
    return AdminChannelGroupCreateRequest(
      capacity: _sdkworkAsMap(json['capacity']),
      groupCode: (() {
        final value = json['groupCode']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupCreateRequest.groupCode is required');
        }
        return value;
      })(),
      groupName: (() {
        final value = json['groupName']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupCreateRequest.groupName is required');
        }
        return value;
      })(),
      groupType: (() {
        final value = json['groupType']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupCreateRequest.groupType is required');
        }
        return value;
      })(),
      officialPriceMultiplier: json['officialPriceMultiplier'] is num ? json['officialPriceMultiplier'].toDouble() : null,
      priceReferenceMode: (() {
        final value = json['priceReferenceMode']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupCreateRequest.priceReferenceMode is required');
        }
        return value;
      })(),
      rateMultiplier: json['rateMultiplier'] is num ? json['rateMultiplier'].toDouble() : null,
      resourceCodes: (() {
        final list = _sdkworkAsList(json['resourceCodes']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      resourceGroupCodes: (() {
        final list = _sdkworkAsList(json['resourceGroupCodes']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupCreateRequest.status is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'capacity': capacity,
      'groupCode': groupCode,
      'groupName': groupName,
      'groupType': groupType,
      'officialPriceMultiplier': officialPriceMultiplier,
      'priceReferenceMode': priceReferenceMode,
      'rateMultiplier': rateMultiplier,
      'resourceCodes': resourceCodes?.map((item) => item).toList(),
      'resourceGroupCodes': resourceGroupCodes?.map((item) => item).toList(),
      'status': status,
    };
  }
}

class AdminChannelGroupItem {
  final AdminCountPair accountCount;
  final AdminCapacityPair capacity;
  final String groupCode;
  final String groupName;
  final String groupType;
  final String id;
  final double officialPriceMultiplier;
  final String priceReferenceMode;
  final String providerCode;
  final double rateMultiplier;
  final List<String> resourceCodes;
  final List<String> resourceGroupCodes;
  final String status;
  final AdminUsagePair usage;

  AdminChannelGroupItem({
    required this.accountCount,
    required this.capacity,
    required this.groupCode,
    required this.groupName,
    required this.groupType,
    required this.id,
    required this.officialPriceMultiplier,
    required this.priceReferenceMode,
    required this.providerCode,
    required this.rateMultiplier,
    required this.resourceCodes,
    required this.resourceGroupCodes,
    required this.status,
    required this.usage
  });

  factory AdminChannelGroupItem.fromJson(Map<String, dynamic> json) {
    return AdminChannelGroupItem(
      accountCount: (() {
        final map = _sdkworkAsMap(json['accountCount']);
        if (map == null) {
          throw FormatException('AdminChannelGroupItem.accountCount is required');
        }
        return AdminCountPair.fromJson(map);
      })(),
      capacity: (() {
        final map = _sdkworkAsMap(json['capacity']);
        if (map == null) {
          throw FormatException('AdminChannelGroupItem.capacity is required');
        }
        return AdminCapacityPair.fromJson(map);
      })(),
      groupCode: (() {
        final value = json['groupCode']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupItem.groupCode is required');
        }
        return value;
      })(),
      groupName: (() {
        final value = json['groupName']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupItem.groupName is required');
        }
        return value;
      })(),
      groupType: (() {
        final value = json['groupType']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupItem.groupType is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupItem.id is required');
        }
        return value;
      })(),
      officialPriceMultiplier: (() {
        final value = json['officialPriceMultiplier'];
        if (value is! num) {
          throw FormatException('AdminChannelGroupItem.officialPriceMultiplier is required');
        }
        return value.toDouble();
      })(),
      priceReferenceMode: (() {
        final value = json['priceReferenceMode']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupItem.priceReferenceMode is required');
        }
        return value;
      })(),
      providerCode: (() {
        final value = json['providerCode']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupItem.providerCode is required');
        }
        return value;
      })(),
      rateMultiplier: (() {
        final value = json['rateMultiplier'];
        if (value is! num) {
          throw FormatException('AdminChannelGroupItem.rateMultiplier is required');
        }
        return value.toDouble();
      })(),
      resourceCodes: (() {
        final list = _sdkworkAsList(json['resourceCodes']);
        if (list == null) {
          throw FormatException('AdminChannelGroupItem.resourceCodes is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      resourceGroupCodes: (() {
        final list = _sdkworkAsList(json['resourceGroupCodes']);
        if (list == null) {
          throw FormatException('AdminChannelGroupItem.resourceGroupCodes is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupItem.status is required');
        }
        return value;
      })(),
      usage: (() {
        final map = _sdkworkAsMap(json['usage']);
        if (map == null) {
          throw FormatException('AdminChannelGroupItem.usage is required');
        }
        return AdminUsagePair.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'accountCount': accountCount.toJson(),
      'capacity': capacity.toJson(),
      'groupCode': groupCode,
      'groupName': groupName,
      'groupType': groupType,
      'id': id,
      'officialPriceMultiplier': officialPriceMultiplier,
      'priceReferenceMode': priceReferenceMode,
      'providerCode': providerCode,
      'rateMultiplier': rateMultiplier,
      'resourceCodes': resourceCodes.map((item) => item).toList(),
      'resourceGroupCodes': resourceGroupCodes.map((item) => item).toList(),
      'status': status,
      'usage': usage.toJson(),
    };
  }
}

class AdminChannelGroupMutationResponse {
  final AdminChannelGroupItem item;

  AdminChannelGroupMutationResponse({
    required this.item
  });

  factory AdminChannelGroupMutationResponse.fromJson(Map<String, dynamic> json) {
    return AdminChannelGroupMutationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('AdminChannelGroupMutationResponse.item is required');
        }
        return AdminChannelGroupItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class AdminChannelGroupRouteExplainIssue {
  final String code;
  final List<String> details;
  final String severity;

  AdminChannelGroupRouteExplainIssue({
    required this.code,
    required this.details,
    required this.severity
  });

  factory AdminChannelGroupRouteExplainIssue.fromJson(Map<String, dynamic> json) {
    return AdminChannelGroupRouteExplainIssue(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupRouteExplainIssue.code is required');
        }
        return value;
      })(),
      details: (() {
        final list = _sdkworkAsList(json['details']);
        if (list == null) {
          throw FormatException('AdminChannelGroupRouteExplainIssue.details is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      severity: (() {
        final value = json['severity']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupRouteExplainIssue.severity is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'details': details.map((item) => item).toList(),
      'severity': severity,
    };
  }
}

class AdminChannelGroupRouteExplainResponse {
  final int activeHealthyBindingCount;
  final List<String> apiScope;
  final List<String> capabilities;
  final int configuredResourceAccessCount;
  final int configuredResourceGroupAccessCount;
  final List<String> effectiveResourceCodes;
  final List<String> issueCodes;
  final List<AdminChannelGroupRouteExplainIssue> issues;
  final bool ready;
  final List<String> resourceCodes;
  final List<String> resourceGroupCodes;
  final int routableBindingCount;
  final String source;

  AdminChannelGroupRouteExplainResponse({
    required this.activeHealthyBindingCount,
    required this.apiScope,
    required this.capabilities,
    required this.configuredResourceAccessCount,
    required this.configuredResourceGroupAccessCount,
    required this.effectiveResourceCodes,
    required this.issueCodes,
    required this.issues,
    required this.ready,
    required this.resourceCodes,
    required this.resourceGroupCodes,
    required this.routableBindingCount,
    required this.source
  });

  factory AdminChannelGroupRouteExplainResponse.fromJson(Map<String, dynamic> json) {
    return AdminChannelGroupRouteExplainResponse(
      activeHealthyBindingCount: (() {
        final value = json['activeHealthyBindingCount'];
        if (value is! int) {
          throw FormatException('AdminChannelGroupRouteExplainResponse.activeHealthyBindingCount is required');
        }
        return value;
      })(),
      apiScope: (() {
        final list = _sdkworkAsList(json['apiScope']);
        if (list == null) {
          throw FormatException('AdminChannelGroupRouteExplainResponse.apiScope is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      capabilities: (() {
        final list = _sdkworkAsList(json['capabilities']);
        if (list == null) {
          throw FormatException('AdminChannelGroupRouteExplainResponse.capabilities is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      configuredResourceAccessCount: (() {
        final value = json['configuredResourceAccessCount'];
        if (value is! int) {
          throw FormatException('AdminChannelGroupRouteExplainResponse.configuredResourceAccessCount is required');
        }
        return value;
      })(),
      configuredResourceGroupAccessCount: (() {
        final value = json['configuredResourceGroupAccessCount'];
        if (value is! int) {
          throw FormatException('AdminChannelGroupRouteExplainResponse.configuredResourceGroupAccessCount is required');
        }
        return value;
      })(),
      effectiveResourceCodes: (() {
        final list = _sdkworkAsList(json['effectiveResourceCodes']);
        if (list == null) {
          throw FormatException('AdminChannelGroupRouteExplainResponse.effectiveResourceCodes is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      issueCodes: (() {
        final list = _sdkworkAsList(json['issueCodes']);
        if (list == null) {
          throw FormatException('AdminChannelGroupRouteExplainResponse.issueCodes is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      issues: (() {
        final list = _sdkworkAsList(json['issues']);
        if (list == null) {
          throw FormatException('AdminChannelGroupRouteExplainResponse.issues is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminChannelGroupRouteExplainIssue.fromJson(map);
      })())
            .whereType<AdminChannelGroupRouteExplainIssue>()
            .toList();
      })(),
      ready: (() {
        final value = json['ready'];
        if (value is! bool) {
          throw FormatException('AdminChannelGroupRouteExplainResponse.ready is required');
        }
        return value;
      })(),
      resourceCodes: (() {
        final list = _sdkworkAsList(json['resourceCodes']);
        if (list == null) {
          throw FormatException('AdminChannelGroupRouteExplainResponse.resourceCodes is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      resourceGroupCodes: (() {
        final list = _sdkworkAsList(json['resourceGroupCodes']);
        if (list == null) {
          throw FormatException('AdminChannelGroupRouteExplainResponse.resourceGroupCodes is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      routableBindingCount: (() {
        final value = json['routableBindingCount'];
        if (value is! int) {
          throw FormatException('AdminChannelGroupRouteExplainResponse.routableBindingCount is required');
        }
        return value;
      })(),
      source: (() {
        final value = json['source']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelGroupRouteExplainResponse.source is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'activeHealthyBindingCount': activeHealthyBindingCount,
      'apiScope': apiScope.map((item) => item).toList(),
      'capabilities': capabilities.map((item) => item).toList(),
      'configuredResourceAccessCount': configuredResourceAccessCount,
      'configuredResourceGroupAccessCount': configuredResourceGroupAccessCount,
      'effectiveResourceCodes': effectiveResourceCodes.map((item) => item).toList(),
      'issueCodes': issueCodes.map((item) => item).toList(),
      'issues': issues.map((item) => item.toJson()).toList(),
      'ready': ready,
      'resourceCodes': resourceCodes.map((item) => item).toList(),
      'resourceGroupCodes': resourceGroupCodes.map((item) => item).toList(),
      'routableBindingCount': routableBindingCount,
      'source': source,
    };
  }
}

class AdminChannelGroupUpdateRequest {
  final Map<String, dynamic>? capacity;
  final String? groupCode;
  final String? groupName;
  final String? groupType;
  final double? officialPriceMultiplier;
  final String? priceReferenceMode;
  final double? rateMultiplier;
  final List<String>? resourceCodes;
  final List<String>? resourceGroupCodes;
  final String? status;

  AdminChannelGroupUpdateRequest({
    this.capacity,
    this.groupCode,
    this.groupName,
    this.groupType,
    this.officialPriceMultiplier,
    this.priceReferenceMode,
    this.rateMultiplier,
    this.resourceCodes,
    this.resourceGroupCodes,
    this.status
  });

  factory AdminChannelGroupUpdateRequest.fromJson(Map<String, dynamic> json) {
    return AdminChannelGroupUpdateRequest(
      capacity: _sdkworkAsMap(json['capacity']),
      groupCode: json['groupCode']?.toString(),
      groupName: json['groupName']?.toString(),
      groupType: json['groupType']?.toString(),
      officialPriceMultiplier: json['officialPriceMultiplier'] is num ? json['officialPriceMultiplier'].toDouble() : null,
      priceReferenceMode: json['priceReferenceMode']?.toString(),
      rateMultiplier: json['rateMultiplier'] is num ? json['rateMultiplier'].toDouble() : null,
      resourceCodes: (() {
        final list = _sdkworkAsList(json['resourceCodes']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      resourceGroupCodes: (() {
        final list = _sdkworkAsList(json['resourceGroupCodes']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      status: json['status']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'capacity': capacity,
      'groupCode': groupCode,
      'groupName': groupName,
      'groupType': groupType,
      'officialPriceMultiplier': officialPriceMultiplier,
      'priceReferenceMode': priceReferenceMode,
      'rateMultiplier': rateMultiplier,
      'resourceCodes': resourceCodes?.map((item) => item).toList(),
      'resourceGroupCodes': resourceGroupCodes?.map((item) => item).toList(),
      'status': status,
    };
  }
}

class AdminChannelGroupsResponse {
  final List<AdminChannelGroupItem> items;

  AdminChannelGroupsResponse({
    required this.items
  });

  factory AdminChannelGroupsResponse.fromJson(Map<String, dynamic> json) {
    return AdminChannelGroupsResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminChannelGroupsResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminChannelGroupItem.fromJson(map);
      })())
            .whereType<AdminChannelGroupItem>()
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

class AdminChannelItem {
  final String accessType;
  final String balance;
  final List<String> capabilities;
  final String channelId;
  final String channelType;
  final ProviderCircuitBreakerPolicy? circuitBreakerPolicy;
  final String createdAt;
  final String credentialRotation;
  final List<AdminChannelCredentialItem> credentials;
  final String errors;
  final String? expiresAt;
  final String id;
  final bool isMultimodal;
  final String name;
  final String protocol;
  final List<String> resourceCodes;
  final ProviderRetryPolicy? retryPolicy;
  final String status;
  final String? timeoutMs;
  final String vendor;
  final String weight;

  AdminChannelItem({
    required this.accessType,
    required this.balance,
    required this.capabilities,
    required this.channelId,
    required this.channelType,
    this.circuitBreakerPolicy,
    required this.createdAt,
    required this.credentialRotation,
    required this.credentials,
    required this.errors,
    this.expiresAt,
    required this.id,
    required this.isMultimodal,
    required this.name,
    required this.protocol,
    required this.resourceCodes,
    this.retryPolicy,
    required this.status,
    this.timeoutMs,
    required this.vendor,
    required this.weight
  });

  factory AdminChannelItem.fromJson(Map<String, dynamic> json) {
    return AdminChannelItem(
      accessType: (() {
        final value = json['accessType']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelItem.accessType is required');
        }
        return value;
      })(),
      balance: (() {
        final value = json['balance']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelItem.balance is required');
        }
        return value;
      })(),
      capabilities: (() {
        final list = _sdkworkAsList(json['capabilities']);
        if (list == null) {
          throw FormatException('AdminChannelItem.capabilities is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      channelId: (() {
        final value = json['channelId']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelItem.channelId is required');
        }
        return value;
      })(),
      channelType: (() {
        final value = json['channelType']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelItem.channelType is required');
        }
        return value;
      })(),
      circuitBreakerPolicy: (() {
        final map = _sdkworkAsMap(json['circuitBreakerPolicy']);
        return map == null ? null : ProviderCircuitBreakerPolicy.fromJson(map);
      })(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelItem.createdAt is required');
        }
        return value;
      })(),
      credentialRotation: (() {
        final value = json['credentialRotation']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelItem.credentialRotation is required');
        }
        return value;
      })(),
      credentials: (() {
        final list = _sdkworkAsList(json['credentials']);
        if (list == null) {
          throw FormatException('AdminChannelItem.credentials is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminChannelCredentialItem.fromJson(map);
      })())
            .whereType<AdminChannelCredentialItem>()
            .toList();
      })(),
      errors: (() {
        final value = json['errors']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelItem.errors is required');
        }
        return value;
      })(),
      expiresAt: json['expiresAt']?.toString(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelItem.id is required');
        }
        return value;
      })(),
      isMultimodal: (() {
        final value = json['isMultimodal'];
        if (value is! bool) {
          throw FormatException('AdminChannelItem.isMultimodal is required');
        }
        return value;
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelItem.name is required');
        }
        return value;
      })(),
      protocol: (() {
        final value = json['protocol']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelItem.protocol is required');
        }
        return value;
      })(),
      resourceCodes: (() {
        final list = _sdkworkAsList(json['resourceCodes']);
        if (list == null) {
          throw FormatException('AdminChannelItem.resourceCodes is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      retryPolicy: (() {
        final map = _sdkworkAsMap(json['retryPolicy']);
        return map == null ? null : ProviderRetryPolicy.fromJson(map);
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelItem.status is required');
        }
        return value;
      })(),
      timeoutMs: json['timeoutMs']?.toString(),
      vendor: (() {
        final value = json['vendor']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelItem.vendor is required');
        }
        return value;
      })(),
      weight: (() {
        final value = json['weight']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelItem.weight is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'accessType': accessType,
      'balance': balance,
      'capabilities': capabilities.map((item) => item).toList(),
      'channelId': channelId,
      'channelType': channelType,
      'circuitBreakerPolicy': circuitBreakerPolicy?.toJson(),
      'createdAt': createdAt,
      'credentialRotation': credentialRotation,
      'credentials': credentials.map((item) => item.toJson()).toList(),
      'errors': errors,
      'expiresAt': expiresAt,
      'id': id,
      'isMultimodal': isMultimodal,
      'name': name,
      'protocol': protocol,
      'resourceCodes': resourceCodes.map((item) => item).toList(),
      'retryPolicy': retryPolicy?.toJson(),
      'status': status,
      'timeoutMs': timeoutMs,
      'vendor': vendor,
      'weight': weight,
    };
  }
}

class AdminChannelMutationResponse {
  final AdminChannelItem item;

  AdminChannelMutationResponse({
    required this.item
  });

  factory AdminChannelMutationResponse.fromJson(Map<String, dynamic> json) {
    return AdminChannelMutationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('AdminChannelMutationResponse.item is required');
        }
        return AdminChannelItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class AdminChannelTestResponse {
  final String channelId;
  final AdminChannelItem item;
  final String latency;
  final String status;
  final bool success;

  AdminChannelTestResponse({
    required this.channelId,
    required this.item,
    required this.latency,
    required this.status,
    required this.success
  });

  factory AdminChannelTestResponse.fromJson(Map<String, dynamic> json) {
    return AdminChannelTestResponse(
      channelId: (() {
        final value = json['channelId']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelTestResponse.channelId is required');
        }
        return value;
      })(),
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('AdminChannelTestResponse.item is required');
        }
        return AdminChannelItem.fromJson(map);
      })(),
      latency: (() {
        final value = json['latency']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelTestResponse.latency is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelTestResponse.status is required');
        }
        return value;
      })(),
      success: (() {
        final value = json['success'];
        if (value is! bool) {
          throw FormatException('AdminChannelTestResponse.success is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'channelId': channelId,
      'item': item.toJson(),
      'latency': latency,
      'status': status,
      'success': success,
    };
  }
}

class AdminChannelUpdateRequest {
  final String? accessType;
  final List<String>? capabilities;
  final String? channelType;
  final ProviderCircuitBreakerPolicy? circuitBreakerPolicy;
  final String? credentialRotation;
  final List<AdminChannelCredentialInput>? credentials;
  final String? expiresAt;
  final String id;
  final String? name;
  final String? protocol;
  final List<String>? resourceCodes;
  final ProviderRetryPolicy? retryPolicy;
  final String? status;
  final String? timeoutMs;
  final String? vendor;
  final String? weight;

  AdminChannelUpdateRequest({
    this.accessType,
    this.capabilities,
    this.channelType,
    this.circuitBreakerPolicy,
    this.credentialRotation,
    this.credentials,
    this.expiresAt,
    required this.id,
    this.name,
    this.protocol,
    this.resourceCodes,
    this.retryPolicy,
    this.status,
    this.timeoutMs,
    this.vendor,
    this.weight
  });

  factory AdminChannelUpdateRequest.fromJson(Map<String, dynamic> json) {
    return AdminChannelUpdateRequest(
      accessType: json['accessType']?.toString(),
      capabilities: (() {
        final list = _sdkworkAsList(json['capabilities']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      channelType: json['channelType']?.toString(),
      circuitBreakerPolicy: (() {
        final map = _sdkworkAsMap(json['circuitBreakerPolicy']);
        return map == null ? null : ProviderCircuitBreakerPolicy.fromJson(map);
      })(),
      credentialRotation: json['credentialRotation']?.toString(),
      credentials: (() {
        final list = _sdkworkAsList(json['credentials']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminChannelCredentialInput.fromJson(map);
      })())
            .whereType<AdminChannelCredentialInput>()
            .toList();
      })(),
      expiresAt: json['expiresAt']?.toString(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminChannelUpdateRequest.id is required');
        }
        return value;
      })(),
      name: json['name']?.toString(),
      protocol: json['protocol']?.toString(),
      resourceCodes: (() {
        final list = _sdkworkAsList(json['resourceCodes']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      retryPolicy: (() {
        final map = _sdkworkAsMap(json['retryPolicy']);
        return map == null ? null : ProviderRetryPolicy.fromJson(map);
      })(),
      status: json['status']?.toString(),
      timeoutMs: json['timeoutMs']?.toString(),
      vendor: json['vendor']?.toString(),
      weight: json['weight']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'accessType': accessType,
      'capabilities': capabilities?.map((item) => item).toList(),
      'channelType': channelType,
      'circuitBreakerPolicy': circuitBreakerPolicy?.toJson(),
      'credentialRotation': credentialRotation,
      'credentials': credentials?.map((item) => item.toJson()).toList(),
      'expiresAt': expiresAt,
      'id': id,
      'name': name,
      'protocol': protocol,
      'resourceCodes': resourceCodes?.map((item) => item).toList(),
      'retryPolicy': retryPolicy?.toJson(),
      'status': status,
      'timeoutMs': timeoutMs,
      'vendor': vendor,
      'weight': weight,
    };
  }
}

class AdminChannelsResponse {
  final List<AdminChannelItem> items;

  AdminChannelsResponse({
    required this.items
  });

  factory AdminChannelsResponse.fromJson(Map<String, dynamic> json) {
    return AdminChannelsResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminChannelsResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminChannelItem.fromJson(map);
      })())
            .whereType<AdminChannelItem>()
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

class AdminCountPair {
  final double available;
  final double total;

  AdminCountPair({
    required this.available,
    required this.total
  });

  factory AdminCountPair.fromJson(Map<String, dynamic> json) {
    return AdminCountPair(
      available: (() {
        final value = json['available'];
        if (value is! num) {
          throw FormatException('AdminCountPair.available is required');
        }
        return value.toDouble();
      })(),
      total: (() {
        final value = json['total'];
        if (value is! num) {
          throw FormatException('AdminCountPair.total is required');
        }
        return value.toDouble();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'available': available,
      'total': total,
    };
  }
}

class AdminDashboardDataResponse {
  final String activeUsers;
  final List<AdminPieChartItem> modelDistribution;
  final List<AdminPieChartItem> multimodal;
  final List<AdminDashboardRecentUsageItem> recentUsage;
  final List<AdminDashboardTrafficItem> traffic;
  final List<AdminPieChartItem> userConsumption;

  AdminDashboardDataResponse({
    required this.activeUsers,
    required this.modelDistribution,
    required this.multimodal,
    required this.recentUsage,
    required this.traffic,
    required this.userConsumption
  });

  factory AdminDashboardDataResponse.fromJson(Map<String, dynamic> json) {
    return AdminDashboardDataResponse(
      activeUsers: (() {
        final value = json['activeUsers']?.toString();
        if (value == null) {
          throw FormatException('AdminDashboardDataResponse.activeUsers is required');
        }
        return value;
      })(),
      modelDistribution: (() {
        final list = _sdkworkAsList(json['modelDistribution']);
        if (list == null) {
          throw FormatException('AdminDashboardDataResponse.modelDistribution is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminPieChartItem.fromJson(map);
      })())
            .whereType<AdminPieChartItem>()
            .toList();
      })(),
      multimodal: (() {
        final list = _sdkworkAsList(json['multimodal']);
        if (list == null) {
          throw FormatException('AdminDashboardDataResponse.multimodal is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminPieChartItem.fromJson(map);
      })())
            .whereType<AdminPieChartItem>()
            .toList();
      })(),
      recentUsage: (() {
        final list = _sdkworkAsList(json['recentUsage']);
        if (list == null) {
          throw FormatException('AdminDashboardDataResponse.recentUsage is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminDashboardRecentUsageItem.fromJson(map);
      })())
            .whereType<AdminDashboardRecentUsageItem>()
            .toList();
      })(),
      traffic: (() {
        final list = _sdkworkAsList(json['traffic']);
        if (list == null) {
          throw FormatException('AdminDashboardDataResponse.traffic is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminDashboardTrafficItem.fromJson(map);
      })())
            .whereType<AdminDashboardTrafficItem>()
            .toList();
      })(),
      userConsumption: (() {
        final list = _sdkworkAsList(json['userConsumption']);
        if (list == null) {
          throw FormatException('AdminDashboardDataResponse.userConsumption is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminPieChartItem.fromJson(map);
      })())
            .whereType<AdminPieChartItem>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'activeUsers': activeUsers,
      'modelDistribution': modelDistribution.map((item) => item.toJson()).toList(),
      'multimodal': multimodal.map((item) => item.toJson()).toList(),
      'recentUsage': recentUsage.map((item) => item.toJson()).toList(),
      'traffic': traffic.map((item) => item.toJson()).toList(),
      'userConsumption': userConsumption.map((item) => item.toJson()).toList(),
    };
  }
}

class AdminDashboardRecentUsageItem {
  final String billingMode;
  final String cost;
  final String id;
  final bool isApiUser;
  final String model;
  final String status;
  final String time;
  final String type;
  final double? usageCount;
  final double? usageIn;
  final double? usageOut;
  final String user;

  AdminDashboardRecentUsageItem({
    required this.billingMode,
    required this.cost,
    required this.id,
    required this.isApiUser,
    required this.model,
    required this.status,
    required this.time,
    required this.type,
    this.usageCount,
    this.usageIn,
    this.usageOut,
    required this.user
  });

  factory AdminDashboardRecentUsageItem.fromJson(Map<String, dynamic> json) {
    return AdminDashboardRecentUsageItem(
      billingMode: (() {
        final value = json['billingMode']?.toString();
        if (value == null) {
          throw FormatException('AdminDashboardRecentUsageItem.billingMode is required');
        }
        return value;
      })(),
      cost: (() {
        final value = json['cost']?.toString();
        if (value == null) {
          throw FormatException('AdminDashboardRecentUsageItem.cost is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminDashboardRecentUsageItem.id is required');
        }
        return value;
      })(),
      isApiUser: (() {
        final value = json['isApiUser'];
        if (value is! bool) {
          throw FormatException('AdminDashboardRecentUsageItem.isApiUser is required');
        }
        return value;
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('AdminDashboardRecentUsageItem.model is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminDashboardRecentUsageItem.status is required');
        }
        return value;
      })(),
      time: (() {
        final value = json['time']?.toString();
        if (value == null) {
          throw FormatException('AdminDashboardRecentUsageItem.time is required');
        }
        return value;
      })(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('AdminDashboardRecentUsageItem.type is required');
        }
        return value;
      })(),
      usageCount: json['usageCount'] is num ? json['usageCount'].toDouble() : null,
      usageIn: json['usageIn'] is num ? json['usageIn'].toDouble() : null,
      usageOut: json['usageOut'] is num ? json['usageOut'].toDouble() : null,
      user: (() {
        final value = json['user']?.toString();
        if (value == null) {
          throw FormatException('AdminDashboardRecentUsageItem.user is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'billingMode': billingMode,
      'cost': cost,
      'id': id,
      'isApiUser': isApiUser,
      'model': model,
      'status': status,
      'time': time,
      'type': type,
      'usageCount': usageCount,
      'usageIn': usageIn,
      'usageOut': usageOut,
      'user': user,
    };
  }
}

class AdminDashboardTrafficItem {
  final double cost;
  final double requests;
  final String time;
  final double tokens;

  AdminDashboardTrafficItem({
    required this.cost,
    required this.requests,
    required this.time,
    required this.tokens
  });

  factory AdminDashboardTrafficItem.fromJson(Map<String, dynamic> json) {
    return AdminDashboardTrafficItem(
      cost: (() {
        final value = json['cost'];
        if (value is! num) {
          throw FormatException('AdminDashboardTrafficItem.cost is required');
        }
        return value.toDouble();
      })(),
      requests: (() {
        final value = json['requests'];
        if (value is! num) {
          throw FormatException('AdminDashboardTrafficItem.requests is required');
        }
        return value.toDouble();
      })(),
      time: (() {
        final value = json['time']?.toString();
        if (value == null) {
          throw FormatException('AdminDashboardTrafficItem.time is required');
        }
        return value;
      })(),
      tokens: (() {
        final value = json['tokens'];
        if (value is! num) {
          throw FormatException('AdminDashboardTrafficItem.tokens is required');
        }
        return value.toDouble();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cost': cost,
      'requests': requests,
      'time': time,
      'tokens': tokens,
    };
  }
}

class AdminDeleteResponse {
  final bool deleted;

  AdminDeleteResponse({
    required this.deleted
  });

  factory AdminDeleteResponse.fromJson(Map<String, dynamic> json) {
    return AdminDeleteResponse(
      deleted: (() {
        final value = json['deleted'];
        if (value is! bool) {
          throw FormatException('AdminDeleteResponse.deleted is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'deleted': deleted,
    };
  }
}

class AdminFirewallItem {
  final String id;
  final String reason;
  final String time;
  final String type;
  final String value;

  AdminFirewallItem({
    required this.id,
    required this.reason,
    required this.time,
    required this.type,
    required this.value
  });

  factory AdminFirewallItem.fromJson(Map<String, dynamic> json) {
    return AdminFirewallItem(
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminFirewallItem.id is required');
        }
        return value;
      })(),
      reason: (() {
        final value = json['reason']?.toString();
        if (value == null) {
          throw FormatException('AdminFirewallItem.reason is required');
        }
        return value;
      })(),
      time: (() {
        final value = json['time']?.toString();
        if (value == null) {
          throw FormatException('AdminFirewallItem.time is required');
        }
        return value;
      })(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('AdminFirewallItem.type is required');
        }
        return value;
      })(),
      value: (() {
        final value = json['value']?.toString();
        if (value == null) {
          throw FormatException('AdminFirewallItem.value is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'reason': reason,
      'time': time,
      'type': type,
      'value': value,
    };
  }
}

class AdminFirewallMutationResponse {
  final AdminFirewallItem item;

  AdminFirewallMutationResponse({
    required this.item
  });

  factory AdminFirewallMutationResponse.fromJson(Map<String, dynamic> json) {
    return AdminFirewallMutationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('AdminFirewallMutationResponse.item is required');
        }
        return AdminFirewallItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class AdminFirewallRuleCreateRequest {
  final String reason;
  final String type;
  final String value;

  AdminFirewallRuleCreateRequest({
    required this.reason,
    required this.type,
    required this.value
  });

  factory AdminFirewallRuleCreateRequest.fromJson(Map<String, dynamic> json) {
    return AdminFirewallRuleCreateRequest(
      reason: (() {
        final value = json['reason']?.toString();
        if (value == null) {
          throw FormatException('AdminFirewallRuleCreateRequest.reason is required');
        }
        return value;
      })(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('AdminFirewallRuleCreateRequest.type is required');
        }
        return value;
      })(),
      value: (() {
        final value = json['value']?.toString();
        if (value == null) {
          throw FormatException('AdminFirewallRuleCreateRequest.value is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'reason': reason,
      'type': type,
      'value': value,
    };
  }
}

class AdminFirewallRulesResponse {
  final List<AdminFirewallItem> items;

  AdminFirewallRulesResponse({
    required this.items
  });

  factory AdminFirewallRulesResponse.fromJson(Map<String, dynamic> json) {
    return AdminFirewallRulesResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminFirewallRulesResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminFirewallItem.fromJson(map);
      })())
            .whereType<AdminFirewallItem>()
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

class AdminIpLimitCreateRequest {
  final String blockDuration;
  final int rpm;
  final int rps;
  final String ruleName;
  final String? status;
  final String targetIp;

  AdminIpLimitCreateRequest({
    required this.blockDuration,
    required this.rpm,
    required this.rps,
    required this.ruleName,
    this.status,
    required this.targetIp
  });

  factory AdminIpLimitCreateRequest.fromJson(Map<String, dynamic> json) {
    return AdminIpLimitCreateRequest(
      blockDuration: (() {
        final value = json['blockDuration']?.toString();
        if (value == null) {
          throw FormatException('AdminIpLimitCreateRequest.blockDuration is required');
        }
        return value;
      })(),
      rpm: (() {
        final value = json['rpm'];
        if (value is! int) {
          throw FormatException('AdminIpLimitCreateRequest.rpm is required');
        }
        return value;
      })(),
      rps: (() {
        final value = json['rps'];
        if (value is! int) {
          throw FormatException('AdminIpLimitCreateRequest.rps is required');
        }
        return value;
      })(),
      ruleName: (() {
        final value = json['ruleName']?.toString();
        if (value == null) {
          throw FormatException('AdminIpLimitCreateRequest.ruleName is required');
        }
        return value;
      })(),
      status: json['status']?.toString(),
      targetIp: (() {
        final value = json['targetIp']?.toString();
        if (value == null) {
          throw FormatException('AdminIpLimitCreateRequest.targetIp is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'blockDuration': blockDuration,
      'rpm': rpm,
      'rps': rps,
      'ruleName': ruleName,
      'status': status,
      'targetIp': targetIp,
    };
  }
}

class AdminIpLimitsResponse {
  final List<AdminRateLimitItem> items;

  AdminIpLimitsResponse({
    required this.items
  });

  factory AdminIpLimitsResponse.fromJson(Map<String, dynamic> json) {
    return AdminIpLimitsResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminIpLimitsResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminRateLimitItem.fromJson(map);
      })())
            .whereType<AdminRateLimitItem>()
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

class AdminMcpBindingCreateRequest {
  final List<String>? allowedTools;
  final List<String>? deniedTools;
  final bool? enabled;
  final String ownerId;
  final String ownerType;
  final Map<String, dynamic>? policyJson;
  final int? priority;
  final String? serverRevisionId;
  final String? status;
  final String? toolId;

  AdminMcpBindingCreateRequest({
    this.allowedTools,
    this.deniedTools,
    this.enabled,
    required this.ownerId,
    required this.ownerType,
    this.policyJson,
    this.priority,
    this.serverRevisionId,
    this.status,
    this.toolId
  });

  factory AdminMcpBindingCreateRequest.fromJson(Map<String, dynamic> json) {
    return AdminMcpBindingCreateRequest(
      allowedTools: (() {
        final list = _sdkworkAsList(json['allowedTools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      deniedTools: (() {
        final list = _sdkworkAsList(json['deniedTools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      enabled: json['enabled'] is bool ? json['enabled'] : null,
      ownerId: (() {
        final value = json['ownerId']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpBindingCreateRequest.ownerId is required');
        }
        return value;
      })(),
      ownerType: (() {
        final value = json['ownerType']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpBindingCreateRequest.ownerType is required');
        }
        return value;
      })(),
      policyJson: (() {
        final map = _sdkworkAsMap(json['policyJson']);
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
      priority: json['priority'] is int ? json['priority'] : null,
      serverRevisionId: json['serverRevisionId']?.toString(),
      status: json['status']?.toString(),
      toolId: json['toolId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'allowedTools': allowedTools?.map((item) => item).toList(),
      'deniedTools': deniedTools?.map((item) => item).toList(),
      'enabled': enabled,
      'ownerId': ownerId,
      'ownerType': ownerType,
      'policyJson': policyJson?.map((key, item) => MapEntry(key, item)),
      'priority': priority,
      'serverRevisionId': serverRevisionId,
      'status': status,
      'toolId': toolId,
    };
  }
}

class AdminMcpBindingItem {
  final List<String> allowedTools;
  final String createdAt;
  final List<String> deniedTools;
  final bool enabled;
  final String id;
  final String organizationId;
  final String ownerId;
  final String ownerType;
  final Map<String, dynamic> policyJson;
  final int priority;
  final String serverId;
  final String? serverRevisionId;
  final Map<String, dynamic> snapshotJson;
  final String status;
  final String tenantId;
  final String? toolId;
  final String updatedAt;
  final String uuid;

  AdminMcpBindingItem({
    required this.allowedTools,
    required this.createdAt,
    required this.deniedTools,
    required this.enabled,
    required this.id,
    required this.organizationId,
    required this.ownerId,
    required this.ownerType,
    required this.policyJson,
    required this.priority,
    required this.serverId,
    this.serverRevisionId,
    required this.snapshotJson,
    required this.status,
    required this.tenantId,
    this.toolId,
    required this.updatedAt,
    required this.uuid
  });

  factory AdminMcpBindingItem.fromJson(Map<String, dynamic> json) {
    return AdminMcpBindingItem(
      allowedTools: (() {
        final list = _sdkworkAsList(json['allowedTools']);
        if (list == null) {
          throw FormatException('AdminMcpBindingItem.allowedTools is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpBindingItem.createdAt is required');
        }
        return value;
      })(),
      deniedTools: (() {
        final list = _sdkworkAsList(json['deniedTools']);
        if (list == null) {
          throw FormatException('AdminMcpBindingItem.deniedTools is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      enabled: (() {
        final value = json['enabled'];
        if (value is! bool) {
          throw FormatException('AdminMcpBindingItem.enabled is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpBindingItem.id is required');
        }
        return value;
      })(),
      organizationId: (() {
        final value = json['organizationId']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpBindingItem.organizationId is required');
        }
        return value;
      })(),
      ownerId: (() {
        final value = json['ownerId']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpBindingItem.ownerId is required');
        }
        return value;
      })(),
      ownerType: (() {
        final value = json['ownerType']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpBindingItem.ownerType is required');
        }
        return value;
      })(),
      policyJson: (() {
        final map = _sdkworkAsMap(json['policyJson']);
        if (map == null) {
          throw FormatException('AdminMcpBindingItem.policyJson is required');
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
      priority: (() {
        final value = json['priority'];
        if (value is! int) {
          throw FormatException('AdminMcpBindingItem.priority is required');
        }
        return value;
      })(),
      serverId: (() {
        final value = json['serverId']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpBindingItem.serverId is required');
        }
        return value;
      })(),
      serverRevisionId: json['serverRevisionId']?.toString(),
      snapshotJson: (() {
        final map = _sdkworkAsMap(json['snapshotJson']);
        if (map == null) {
          throw FormatException('AdminMcpBindingItem.snapshotJson is required');
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
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpBindingItem.status is required');
        }
        return value;
      })(),
      tenantId: (() {
        final value = json['tenantId']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpBindingItem.tenantId is required');
        }
        return value;
      })(),
      toolId: json['toolId']?.toString(),
      updatedAt: (() {
        final value = json['updatedAt']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpBindingItem.updatedAt is required');
        }
        return value;
      })(),
      uuid: (() {
        final value = json['uuid']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpBindingItem.uuid is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'allowedTools': allowedTools.map((item) => item).toList(),
      'createdAt': createdAt,
      'deniedTools': deniedTools.map((item) => item).toList(),
      'enabled': enabled,
      'id': id,
      'organizationId': organizationId,
      'ownerId': ownerId,
      'ownerType': ownerType,
      'policyJson': policyJson.map((key, item) => MapEntry(key, item)),
      'priority': priority,
      'serverId': serverId,
      'serverRevisionId': serverRevisionId,
      'snapshotJson': snapshotJson.map((key, item) => MapEntry(key, item)),
      'status': status,
      'tenantId': tenantId,
      'toolId': toolId,
      'updatedAt': updatedAt,
      'uuid': uuid,
    };
  }
}

class AdminMcpBindingListResponse {
  final List<AdminMcpBindingItem> items;

  AdminMcpBindingListResponse({
    required this.items
  });

  factory AdminMcpBindingListResponse.fromJson(Map<String, dynamic> json) {
    return AdminMcpBindingListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminMcpBindingListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminMcpBindingItem.fromJson(map);
      })())
            .whereType<AdminMcpBindingItem>()
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

class AdminMcpBindingMutationResponse {
  final AdminMcpBindingItem item;

  AdminMcpBindingMutationResponse({
    required this.item
  });

  factory AdminMcpBindingMutationResponse.fromJson(Map<String, dynamic> json) {
    return AdminMcpBindingMutationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('AdminMcpBindingMutationResponse.item is required');
        }
        return AdminMcpBindingItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class AdminMcpBindingUpdateRequest {
  final List<String>? allowedTools;
  final List<String>? deniedTools;
  final bool? enabled;
  final String? ownerId;
  final String? ownerType;
  final Map<String, dynamic>? policyJson;
  final int? priority;
  final String? serverRevisionId;
  final String? status;
  final String? toolId;

  AdminMcpBindingUpdateRequest({
    this.allowedTools,
    this.deniedTools,
    this.enabled,
    this.ownerId,
    this.ownerType,
    this.policyJson,
    this.priority,
    this.serverRevisionId,
    this.status,
    this.toolId
  });

  factory AdminMcpBindingUpdateRequest.fromJson(Map<String, dynamic> json) {
    return AdminMcpBindingUpdateRequest(
      allowedTools: (() {
        final list = _sdkworkAsList(json['allowedTools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      deniedTools: (() {
        final list = _sdkworkAsList(json['deniedTools']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      enabled: json['enabled'] is bool ? json['enabled'] : null,
      ownerId: json['ownerId']?.toString(),
      ownerType: json['ownerType']?.toString(),
      policyJson: (() {
        final map = _sdkworkAsMap(json['policyJson']);
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
      priority: json['priority'] is int ? json['priority'] : null,
      serverRevisionId: json['serverRevisionId']?.toString(),
      status: json['status']?.toString(),
      toolId: json['toolId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'allowedTools': allowedTools?.map((item) => item).toList(),
      'deniedTools': deniedTools?.map((item) => item).toList(),
      'enabled': enabled,
      'ownerId': ownerId,
      'ownerType': ownerType,
      'policyJson': policyJson?.map((key, item) => MapEntry(key, item)),
      'priority': priority,
      'serverRevisionId': serverRevisionId,
      'status': status,
      'toolId': toolId,
    };
  }
}

class AdminMcpDiscoveryResponse {
  final String checkedAt;
  final String discoveredCount;
  final String serverId;
  final List<AdminMcpToolItem> tools;

  AdminMcpDiscoveryResponse({
    required this.checkedAt,
    required this.discoveredCount,
    required this.serverId,
    required this.tools
  });

  factory AdminMcpDiscoveryResponse.fromJson(Map<String, dynamic> json) {
    return AdminMcpDiscoveryResponse(
      checkedAt: (() {
        final value = json['checkedAt']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpDiscoveryResponse.checkedAt is required');
        }
        return value;
      })(),
      discoveredCount: (() {
        final value = json['discoveredCount']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpDiscoveryResponse.discoveredCount is required');
        }
        return value;
      })(),
      serverId: (() {
        final value = json['serverId']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpDiscoveryResponse.serverId is required');
        }
        return value;
      })(),
      tools: (() {
        final list = _sdkworkAsList(json['tools']);
        if (list == null) {
          throw FormatException('AdminMcpDiscoveryResponse.tools is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminMcpToolItem.fromJson(map);
      })())
            .whereType<AdminMcpToolItem>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'checkedAt': checkedAt,
      'discoveredCount': discoveredCount,
      'serverId': serverId,
      'tools': tools.map((item) => item.toJson()).toList(),
    };
  }
}

class AdminMcpHealthCheckResponse {
  final String checkedAt;
  final String? errorMasked;
  final String healthStatus;
  final bool healthy;
  final String? latencyMs;
  final String serverId;

  AdminMcpHealthCheckResponse({
    required this.checkedAt,
    this.errorMasked,
    required this.healthStatus,
    required this.healthy,
    this.latencyMs,
    required this.serverId
  });

  factory AdminMcpHealthCheckResponse.fromJson(Map<String, dynamic> json) {
    return AdminMcpHealthCheckResponse(
      checkedAt: (() {
        final value = json['checkedAt']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpHealthCheckResponse.checkedAt is required');
        }
        return value;
      })(),
      errorMasked: json['errorMasked']?.toString(),
      healthStatus: (() {
        final value = json['healthStatus']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpHealthCheckResponse.healthStatus is required');
        }
        return value;
      })(),
      healthy: (() {
        final value = json['healthy'];
        if (value is! bool) {
          throw FormatException('AdminMcpHealthCheckResponse.healthy is required');
        }
        return value;
      })(),
      latencyMs: json['latencyMs']?.toString(),
      serverId: (() {
        final value = json['serverId']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpHealthCheckResponse.serverId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'checkedAt': checkedAt,
      'errorMasked': errorMasked,
      'healthStatus': healthStatus,
      'healthy': healthy,
      'latencyMs': latencyMs,
      'serverId': serverId,
    };
  }
}

class AdminMcpServerCreateRequest {
  final String? categoryId;
  final String? description;
  final String name;
  final String serverKey;
  final List<String>? tags;
  final String? transport;
  final String? visibility;

  AdminMcpServerCreateRequest({
    this.categoryId,
    this.description,
    required this.name,
    required this.serverKey,
    this.tags,
    this.transport,
    this.visibility
  });

  factory AdminMcpServerCreateRequest.fromJson(Map<String, dynamic> json) {
    return AdminMcpServerCreateRequest(
      categoryId: json['categoryId']?.toString(),
      description: json['description']?.toString(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerCreateRequest.name is required');
        }
        return value;
      })(),
      serverKey: (() {
        final value = json['serverKey']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerCreateRequest.serverKey is required');
        }
        return value;
      })(),
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
      transport: json['transport']?.toString(),
      visibility: json['visibility']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'categoryId': categoryId,
      'description': description,
      'name': name,
      'serverKey': serverKey,
      'tags': tags?.map((item) => item).toList(),
      'transport': transport,
      'visibility': visibility,
    };
  }
}

class AdminMcpServerItem {
  final String? categoryCode;
  final String? categoryId;
  final String createdAt;
  final String? deprecatedAt;
  final String? description;
  final String healthStatus;
  final String id;
  final String? lastCheckedAt;
  final String? lastErrorMasked;
  final String? latestRevisionId;
  final String name;
  final String organizationId;
  final String? ownerUserId;
  final String? publishedAt;
  final String? publishedRevisionId;
  final String serverKey;
  final String status;
  final List<String> tags;
  final String tenantId;
  final String transport;
  final String updatedAt;
  final String uuid;
  final String visibility;

  AdminMcpServerItem({
    this.categoryCode,
    this.categoryId,
    required this.createdAt,
    this.deprecatedAt,
    this.description,
    required this.healthStatus,
    required this.id,
    this.lastCheckedAt,
    this.lastErrorMasked,
    this.latestRevisionId,
    required this.name,
    required this.organizationId,
    this.ownerUserId,
    this.publishedAt,
    this.publishedRevisionId,
    required this.serverKey,
    required this.status,
    required this.tags,
    required this.tenantId,
    required this.transport,
    required this.updatedAt,
    required this.uuid,
    required this.visibility
  });

  factory AdminMcpServerItem.fromJson(Map<String, dynamic> json) {
    return AdminMcpServerItem(
      categoryCode: json['categoryCode']?.toString(),
      categoryId: json['categoryId']?.toString(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerItem.createdAt is required');
        }
        return value;
      })(),
      deprecatedAt: json['deprecatedAt']?.toString(),
      description: json['description']?.toString(),
      healthStatus: (() {
        final value = json['healthStatus']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerItem.healthStatus is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerItem.id is required');
        }
        return value;
      })(),
      lastCheckedAt: json['lastCheckedAt']?.toString(),
      lastErrorMasked: json['lastErrorMasked']?.toString(),
      latestRevisionId: json['latestRevisionId']?.toString(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerItem.name is required');
        }
        return value;
      })(),
      organizationId: (() {
        final value = json['organizationId']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerItem.organizationId is required');
        }
        return value;
      })(),
      ownerUserId: json['ownerUserId']?.toString(),
      publishedAt: json['publishedAt']?.toString(),
      publishedRevisionId: json['publishedRevisionId']?.toString(),
      serverKey: (() {
        final value = json['serverKey']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerItem.serverKey is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerItem.status is required');
        }
        return value;
      })(),
      tags: (() {
        final list = _sdkworkAsList(json['tags']);
        if (list == null) {
          throw FormatException('AdminMcpServerItem.tags is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      tenantId: (() {
        final value = json['tenantId']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerItem.tenantId is required');
        }
        return value;
      })(),
      transport: (() {
        final value = json['transport']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerItem.transport is required');
        }
        return value;
      })(),
      updatedAt: (() {
        final value = json['updatedAt']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerItem.updatedAt is required');
        }
        return value;
      })(),
      uuid: (() {
        final value = json['uuid']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerItem.uuid is required');
        }
        return value;
      })(),
      visibility: (() {
        final value = json['visibility']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerItem.visibility is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'categoryCode': categoryCode,
      'categoryId': categoryId,
      'createdAt': createdAt,
      'deprecatedAt': deprecatedAt,
      'description': description,
      'healthStatus': healthStatus,
      'id': id,
      'lastCheckedAt': lastCheckedAt,
      'lastErrorMasked': lastErrorMasked,
      'latestRevisionId': latestRevisionId,
      'name': name,
      'organizationId': organizationId,
      'ownerUserId': ownerUserId,
      'publishedAt': publishedAt,
      'publishedRevisionId': publishedRevisionId,
      'serverKey': serverKey,
      'status': status,
      'tags': tags.map((item) => item).toList(),
      'tenantId': tenantId,
      'transport': transport,
      'updatedAt': updatedAt,
      'uuid': uuid,
      'visibility': visibility,
    };
  }
}

class AdminMcpServerListResponse {
  final List<AdminMcpServerItem> items;

  AdminMcpServerListResponse({
    required this.items
  });

  factory AdminMcpServerListResponse.fromJson(Map<String, dynamic> json) {
    return AdminMcpServerListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminMcpServerListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminMcpServerItem.fromJson(map);
      })())
            .whereType<AdminMcpServerItem>()
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

class AdminMcpServerMutationResponse {
  final AdminMcpServerItem item;

  AdminMcpServerMutationResponse({
    required this.item
  });

  factory AdminMcpServerMutationResponse.fromJson(Map<String, dynamic> json) {
    return AdminMcpServerMutationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('AdminMcpServerMutationResponse.item is required');
        }
        return AdminMcpServerItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class AdminMcpServerRevisionCreateRequest {
  final List<String>? argsJson;
  final String? authType;
  final String? command;
  final String? endpointUrl;
  final Map<String, dynamic>? envSchema;
  final Map<String, dynamic>? retryPolicy;
  final String revisionNo;
  final String? secretRef;
  final int? timeoutMs;
  final String? transport;

  AdminMcpServerRevisionCreateRequest({
    this.argsJson,
    this.authType,
    this.command,
    this.endpointUrl,
    this.envSchema,
    this.retryPolicy,
    required this.revisionNo,
    this.secretRef,
    this.timeoutMs,
    this.transport
  });

  factory AdminMcpServerRevisionCreateRequest.fromJson(Map<String, dynamic> json) {
    return AdminMcpServerRevisionCreateRequest(
      argsJson: (() {
        final list = _sdkworkAsList(json['argsJson']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      authType: json['authType']?.toString(),
      command: json['command']?.toString(),
      endpointUrl: json['endpointUrl']?.toString(),
      envSchema: (() {
        final map = _sdkworkAsMap(json['envSchema']);
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
      retryPolicy: (() {
        final map = _sdkworkAsMap(json['retryPolicy']);
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
      revisionNo: (() {
        final value = json['revisionNo']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerRevisionCreateRequest.revisionNo is required');
        }
        return value;
      })(),
      secretRef: json['secretRef']?.toString(),
      timeoutMs: json['timeoutMs'] is int ? json['timeoutMs'] : null,
      transport: json['transport']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'argsJson': argsJson?.map((item) => item).toList(),
      'authType': authType,
      'command': command,
      'endpointUrl': endpointUrl,
      'envSchema': envSchema?.map((key, item) => MapEntry(key, item)),
      'retryPolicy': retryPolicy?.map((key, item) => MapEntry(key, item)),
      'revisionNo': revisionNo,
      'secretRef': secretRef,
      'timeoutMs': timeoutMs,
      'transport': transport,
    };
  }
}

class AdminMcpServerRevisionItem {
  final List<String> argsJson;
  final String authType;
  final String? command;
  final String configHash;
  final String createdAt;
  final String createdBy;
  final String? deprecatedAt;
  final String? endpointUrl;
  final Map<String, dynamic> envSchema;
  final String id;
  final String lifecycleStatus;
  final String organizationId;
  final String? publishedAt;
  final Map<String, dynamic> retryPolicy;
  final String revisionNo;
  final String? secretRef;
  final String serverId;
  final String status;
  final String tenantId;
  final int timeoutMs;
  final String transport;
  final String updatedAt;
  final String uuid;

  AdminMcpServerRevisionItem({
    required this.argsJson,
    required this.authType,
    this.command,
    required this.configHash,
    required this.createdAt,
    required this.createdBy,
    this.deprecatedAt,
    this.endpointUrl,
    required this.envSchema,
    required this.id,
    required this.lifecycleStatus,
    required this.organizationId,
    this.publishedAt,
    required this.retryPolicy,
    required this.revisionNo,
    this.secretRef,
    required this.serverId,
    required this.status,
    required this.tenantId,
    required this.timeoutMs,
    required this.transport,
    required this.updatedAt,
    required this.uuid
  });

  factory AdminMcpServerRevisionItem.fromJson(Map<String, dynamic> json) {
    return AdminMcpServerRevisionItem(
      argsJson: (() {
        final list = _sdkworkAsList(json['argsJson']);
        if (list == null) {
          throw FormatException('AdminMcpServerRevisionItem.argsJson is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      authType: (() {
        final value = json['authType']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerRevisionItem.authType is required');
        }
        return value;
      })(),
      command: json['command']?.toString(),
      configHash: (() {
        final value = json['configHash']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerRevisionItem.configHash is required');
        }
        return value;
      })(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerRevisionItem.createdAt is required');
        }
        return value;
      })(),
      createdBy: (() {
        final value = json['createdBy']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerRevisionItem.createdBy is required');
        }
        return value;
      })(),
      deprecatedAt: json['deprecatedAt']?.toString(),
      endpointUrl: json['endpointUrl']?.toString(),
      envSchema: (() {
        final map = _sdkworkAsMap(json['envSchema']);
        if (map == null) {
          throw FormatException('AdminMcpServerRevisionItem.envSchema is required');
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
          throw FormatException('AdminMcpServerRevisionItem.id is required');
        }
        return value;
      })(),
      lifecycleStatus: (() {
        final value = json['lifecycleStatus']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerRevisionItem.lifecycleStatus is required');
        }
        return value;
      })(),
      organizationId: (() {
        final value = json['organizationId']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerRevisionItem.organizationId is required');
        }
        return value;
      })(),
      publishedAt: json['publishedAt']?.toString(),
      retryPolicy: (() {
        final map = _sdkworkAsMap(json['retryPolicy']);
        if (map == null) {
          throw FormatException('AdminMcpServerRevisionItem.retryPolicy is required');
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
      revisionNo: (() {
        final value = json['revisionNo']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerRevisionItem.revisionNo is required');
        }
        return value;
      })(),
      secretRef: json['secretRef']?.toString(),
      serverId: (() {
        final value = json['serverId']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerRevisionItem.serverId is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerRevisionItem.status is required');
        }
        return value;
      })(),
      tenantId: (() {
        final value = json['tenantId']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerRevisionItem.tenantId is required');
        }
        return value;
      })(),
      timeoutMs: (() {
        final value = json['timeoutMs'];
        if (value is! int) {
          throw FormatException('AdminMcpServerRevisionItem.timeoutMs is required');
        }
        return value;
      })(),
      transport: (() {
        final value = json['transport']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerRevisionItem.transport is required');
        }
        return value;
      })(),
      updatedAt: (() {
        final value = json['updatedAt']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerRevisionItem.updatedAt is required');
        }
        return value;
      })(),
      uuid: (() {
        final value = json['uuid']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpServerRevisionItem.uuid is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'argsJson': argsJson.map((item) => item).toList(),
      'authType': authType,
      'command': command,
      'configHash': configHash,
      'createdAt': createdAt,
      'createdBy': createdBy,
      'deprecatedAt': deprecatedAt,
      'endpointUrl': endpointUrl,
      'envSchema': envSchema.map((key, item) => MapEntry(key, item)),
      'id': id,
      'lifecycleStatus': lifecycleStatus,
      'organizationId': organizationId,
      'publishedAt': publishedAt,
      'retryPolicy': retryPolicy.map((key, item) => MapEntry(key, item)),
      'revisionNo': revisionNo,
      'secretRef': secretRef,
      'serverId': serverId,
      'status': status,
      'tenantId': tenantId,
      'timeoutMs': timeoutMs,
      'transport': transport,
      'updatedAt': updatedAt,
      'uuid': uuid,
    };
  }
}

class AdminMcpServerRevisionListResponse {
  final List<AdminMcpServerRevisionItem> items;

  AdminMcpServerRevisionListResponse({
    required this.items
  });

  factory AdminMcpServerRevisionListResponse.fromJson(Map<String, dynamic> json) {
    return AdminMcpServerRevisionListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminMcpServerRevisionListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminMcpServerRevisionItem.fromJson(map);
      })())
            .whereType<AdminMcpServerRevisionItem>()
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

class AdminMcpServerRevisionMutationResponse {
  final AdminMcpServerRevisionItem item;

  AdminMcpServerRevisionMutationResponse({
    required this.item
  });

  factory AdminMcpServerRevisionMutationResponse.fromJson(Map<String, dynamic> json) {
    return AdminMcpServerRevisionMutationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('AdminMcpServerRevisionMutationResponse.item is required');
        }
        return AdminMcpServerRevisionItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class AdminMcpServerUpdateRequest {
  final String? categoryId;
  final String? description;
  final String? name;
  final String? serverKey;
  final String? status;
  final List<String>? tags;
  final String? transport;
  final String? visibility;

  AdminMcpServerUpdateRequest({
    this.categoryId,
    this.description,
    this.name,
    this.serverKey,
    this.status,
    this.tags,
    this.transport,
    this.visibility
  });

  factory AdminMcpServerUpdateRequest.fromJson(Map<String, dynamic> json) {
    return AdminMcpServerUpdateRequest(
      categoryId: json['categoryId']?.toString(),
      description: json['description']?.toString(),
      name: json['name']?.toString(),
      serverKey: json['serverKey']?.toString(),
      status: json['status']?.toString(),
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
      transport: json['transport']?.toString(),
      visibility: json['visibility']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'categoryId': categoryId,
      'description': description,
      'name': name,
      'serverKey': serverKey,
      'status': status,
      'tags': tags?.map((item) => item).toList(),
      'transport': transport,
      'visibility': visibility,
    };
  }
}

class AdminMcpToolItem {
  final String createdAt;
  final String? description;
  final String? discoveredAt;
  final bool enabled;
  final String id;
  final Map<String, dynamic> inputSchema;
  final String? lastInvokedAt;
  final String name;
  final String organizationId;
  final Map<String, dynamic> outputSchema;
  final Map<String, dynamic> rateLimitPolicy;
  final bool requiresApproval;
  final String riskLevel;
  final String schemaHash;
  final String serverId;
  final String? serverRevisionId;
  final int sortWeight;
  final String status;
  final String tenantId;
  final String toolKey;
  final String updatedAt;
  final String uuid;

  AdminMcpToolItem({
    required this.createdAt,
    this.description,
    this.discoveredAt,
    required this.enabled,
    required this.id,
    required this.inputSchema,
    this.lastInvokedAt,
    required this.name,
    required this.organizationId,
    required this.outputSchema,
    required this.rateLimitPolicy,
    required this.requiresApproval,
    required this.riskLevel,
    required this.schemaHash,
    required this.serverId,
    this.serverRevisionId,
    required this.sortWeight,
    required this.status,
    required this.tenantId,
    required this.toolKey,
    required this.updatedAt,
    required this.uuid
  });

  factory AdminMcpToolItem.fromJson(Map<String, dynamic> json) {
    return AdminMcpToolItem(
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpToolItem.createdAt is required');
        }
        return value;
      })(),
      description: json['description']?.toString(),
      discoveredAt: json['discoveredAt']?.toString(),
      enabled: (() {
        final value = json['enabled'];
        if (value is! bool) {
          throw FormatException('AdminMcpToolItem.enabled is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpToolItem.id is required');
        }
        return value;
      })(),
      inputSchema: (() {
        final map = _sdkworkAsMap(json['inputSchema']);
        if (map == null) {
          throw FormatException('AdminMcpToolItem.inputSchema is required');
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
      lastInvokedAt: json['lastInvokedAt']?.toString(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpToolItem.name is required');
        }
        return value;
      })(),
      organizationId: (() {
        final value = json['organizationId']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpToolItem.organizationId is required');
        }
        return value;
      })(),
      outputSchema: (() {
        final map = _sdkworkAsMap(json['outputSchema']);
        if (map == null) {
          throw FormatException('AdminMcpToolItem.outputSchema is required');
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
      rateLimitPolicy: (() {
        final map = _sdkworkAsMap(json['rateLimitPolicy']);
        if (map == null) {
          throw FormatException('AdminMcpToolItem.rateLimitPolicy is required');
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
      requiresApproval: (() {
        final value = json['requiresApproval'];
        if (value is! bool) {
          throw FormatException('AdminMcpToolItem.requiresApproval is required');
        }
        return value;
      })(),
      riskLevel: (() {
        final value = json['riskLevel']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpToolItem.riskLevel is required');
        }
        return value;
      })(),
      schemaHash: (() {
        final value = json['schemaHash']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpToolItem.schemaHash is required');
        }
        return value;
      })(),
      serverId: (() {
        final value = json['serverId']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpToolItem.serverId is required');
        }
        return value;
      })(),
      serverRevisionId: json['serverRevisionId']?.toString(),
      sortWeight: (() {
        final value = json['sortWeight'];
        if (value is! int) {
          throw FormatException('AdminMcpToolItem.sortWeight is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpToolItem.status is required');
        }
        return value;
      })(),
      tenantId: (() {
        final value = json['tenantId']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpToolItem.tenantId is required');
        }
        return value;
      })(),
      toolKey: (() {
        final value = json['toolKey']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpToolItem.toolKey is required');
        }
        return value;
      })(),
      updatedAt: (() {
        final value = json['updatedAt']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpToolItem.updatedAt is required');
        }
        return value;
      })(),
      uuid: (() {
        final value = json['uuid']?.toString();
        if (value == null) {
          throw FormatException('AdminMcpToolItem.uuid is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'createdAt': createdAt,
      'description': description,
      'discoveredAt': discoveredAt,
      'enabled': enabled,
      'id': id,
      'inputSchema': inputSchema.map((key, item) => MapEntry(key, item)),
      'lastInvokedAt': lastInvokedAt,
      'name': name,
      'organizationId': organizationId,
      'outputSchema': outputSchema.map((key, item) => MapEntry(key, item)),
      'rateLimitPolicy': rateLimitPolicy.map((key, item) => MapEntry(key, item)),
      'requiresApproval': requiresApproval,
      'riskLevel': riskLevel,
      'schemaHash': schemaHash,
      'serverId': serverId,
      'serverRevisionId': serverRevisionId,
      'sortWeight': sortWeight,
      'status': status,
      'tenantId': tenantId,
      'toolKey': toolKey,
      'updatedAt': updatedAt,
      'uuid': uuid,
    };
  }
}

class AdminMcpToolListResponse {
  final List<AdminMcpToolItem> items;

  AdminMcpToolListResponse({
    required this.items
  });

  factory AdminMcpToolListResponse.fromJson(Map<String, dynamic> json) {
    return AdminMcpToolListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminMcpToolListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminMcpToolItem.fromJson(map);
      })())
            .whereType<AdminMcpToolItem>()
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

class AdminMcpToolMutationResponse {
  final AdminMcpToolItem item;

  AdminMcpToolMutationResponse({
    required this.item
  });

  factory AdminMcpToolMutationResponse.fromJson(Map<String, dynamic> json) {
    return AdminMcpToolMutationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('AdminMcpToolMutationResponse.item is required');
        }
        return AdminMcpToolItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class AdminMcpToolUpdateRequest {
  final String? description;
  final bool? enabled;
  final Map<String, dynamic>? inputSchema;
  final String? name;
  final Map<String, dynamic>? outputSchema;
  final Map<String, dynamic>? rateLimitPolicy;
  final bool? requiresApproval;
  final String? riskLevel;
  final int? sortWeight;
  final String? status;

  AdminMcpToolUpdateRequest({
    this.description,
    this.enabled,
    this.inputSchema,
    this.name,
    this.outputSchema,
    this.rateLimitPolicy,
    this.requiresApproval,
    this.riskLevel,
    this.sortWeight,
    this.status
  });

  factory AdminMcpToolUpdateRequest.fromJson(Map<String, dynamic> json) {
    return AdminMcpToolUpdateRequest(
      description: json['description']?.toString(),
      enabled: json['enabled'] is bool ? json['enabled'] : null,
      inputSchema: (() {
        final map = _sdkworkAsMap(json['inputSchema']);
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
      outputSchema: (() {
        final map = _sdkworkAsMap(json['outputSchema']);
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
      rateLimitPolicy: (() {
        final map = _sdkworkAsMap(json['rateLimitPolicy']);
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
      requiresApproval: json['requiresApproval'] is bool ? json['requiresApproval'] : null,
      riskLevel: json['riskLevel']?.toString(),
      sortWeight: json['sortWeight'] is int ? json['sortWeight'] : null,
      status: json['status']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'description': description,
      'enabled': enabled,
      'inputSchema': inputSchema?.map((key, item) => MapEntry(key, item)),
      'name': name,
      'outputSchema': outputSchema?.map((key, item) => MapEntry(key, item)),
      'rateLimitPolicy': rateLimitPolicy?.map((key, item) => MapEntry(key, item)),
      'requiresApproval': requiresApproval,
      'riskLevel': riskLevel,
      'sortWeight': sortWeight,
      'status': status,
    };
  }
}

class AdminModelCatalogSyncRequest {
  final String? catalogRoot;
  final String? catalogVersion;
  final bool? force;
  final String? mode;
  final String? source;
  final List<String>? vendorCodes;

  AdminModelCatalogSyncRequest({
    this.catalogRoot,
    this.catalogVersion,
    this.force,
    this.mode,
    this.source,
    this.vendorCodes
  });

  factory AdminModelCatalogSyncRequest.fromJson(Map<String, dynamic> json) {
    return AdminModelCatalogSyncRequest(
      catalogRoot: json['catalogRoot']?.toString(),
      catalogVersion: json['catalogVersion']?.toString(),
      force: json['force'] is bool ? json['force'] : null,
      mode: json['mode']?.toString(),
      source: json['source']?.toString(),
      vendorCodes: (() {
        final list = _sdkworkAsList(json['vendorCodes']);
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
      'catalogRoot': catalogRoot,
      'catalogVersion': catalogVersion,
      'force': force,
      'mode': mode,
      'source': source,
      'vendorCodes': vendorCodes?.map((item) => item).toList(),
    };
  }
}

class AdminModelCatalogSyncResponse {
  final String acceptedCount;
  final String capabilityCount;
  final String? catalogRoot;
  final String catalogVersion;
  final bool dryRun;
  final String familyCount;
  final String meterCount;
  final String mode;
  final String modelCount;
  final List<AdminAiModelItem> models;
  final String priceCount;
  final String rankingCount;
  final String? requestedCatalogVersion;
  final String? snapshotId;
  final String source;
  final String sourceHash;
  final String? syncRunId;
  final bool synced;
  final List<String> vendorCodes;
  final String vendorCount;
  final List<AdminModelVendorItem> vendors;

  AdminModelCatalogSyncResponse({
    required this.acceptedCount,
    required this.capabilityCount,
    this.catalogRoot,
    required this.catalogVersion,
    required this.dryRun,
    required this.familyCount,
    required this.meterCount,
    required this.mode,
    required this.modelCount,
    required this.models,
    required this.priceCount,
    required this.rankingCount,
    this.requestedCatalogVersion,
    this.snapshotId,
    required this.source,
    required this.sourceHash,
    this.syncRunId,
    required this.synced,
    required this.vendorCodes,
    required this.vendorCount,
    required this.vendors
  });

  factory AdminModelCatalogSyncResponse.fromJson(Map<String, dynamic> json) {
    return AdminModelCatalogSyncResponse(
      acceptedCount: (() {
        final value = json['acceptedCount']?.toString();
        if (value == null) {
          throw FormatException('AdminModelCatalogSyncResponse.acceptedCount is required');
        }
        return value;
      })(),
      capabilityCount: (() {
        final value = json['capabilityCount']?.toString();
        if (value == null) {
          throw FormatException('AdminModelCatalogSyncResponse.capabilityCount is required');
        }
        return value;
      })(),
      catalogRoot: json['catalogRoot']?.toString(),
      catalogVersion: (() {
        final value = json['catalogVersion']?.toString();
        if (value == null) {
          throw FormatException('AdminModelCatalogSyncResponse.catalogVersion is required');
        }
        return value;
      })(),
      dryRun: (() {
        final value = json['dryRun'];
        if (value is! bool) {
          throw FormatException('AdminModelCatalogSyncResponse.dryRun is required');
        }
        return value;
      })(),
      familyCount: (() {
        final value = json['familyCount']?.toString();
        if (value == null) {
          throw FormatException('AdminModelCatalogSyncResponse.familyCount is required');
        }
        return value;
      })(),
      meterCount: (() {
        final value = json['meterCount']?.toString();
        if (value == null) {
          throw FormatException('AdminModelCatalogSyncResponse.meterCount is required');
        }
        return value;
      })(),
      mode: (() {
        final value = json['mode']?.toString();
        if (value == null) {
          throw FormatException('AdminModelCatalogSyncResponse.mode is required');
        }
        return value;
      })(),
      modelCount: (() {
        final value = json['modelCount']?.toString();
        if (value == null) {
          throw FormatException('AdminModelCatalogSyncResponse.modelCount is required');
        }
        return value;
      })(),
      models: (() {
        final list = _sdkworkAsList(json['models']);
        if (list == null) {
          throw FormatException('AdminModelCatalogSyncResponse.models is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminAiModelItem.fromJson(map);
      })())
            .whereType<AdminAiModelItem>()
            .toList();
      })(),
      priceCount: (() {
        final value = json['priceCount']?.toString();
        if (value == null) {
          throw FormatException('AdminModelCatalogSyncResponse.priceCount is required');
        }
        return value;
      })(),
      rankingCount: (() {
        final value = json['rankingCount']?.toString();
        if (value == null) {
          throw FormatException('AdminModelCatalogSyncResponse.rankingCount is required');
        }
        return value;
      })(),
      requestedCatalogVersion: json['requestedCatalogVersion']?.toString(),
      snapshotId: json['snapshotId']?.toString(),
      source: (() {
        final value = json['source']?.toString();
        if (value == null) {
          throw FormatException('AdminModelCatalogSyncResponse.source is required');
        }
        return value;
      })(),
      sourceHash: (() {
        final value = json['sourceHash']?.toString();
        if (value == null) {
          throw FormatException('AdminModelCatalogSyncResponse.sourceHash is required');
        }
        return value;
      })(),
      syncRunId: json['syncRunId']?.toString(),
      synced: (() {
        final value = json['synced'];
        if (value is! bool) {
          throw FormatException('AdminModelCatalogSyncResponse.synced is required');
        }
        return value;
      })(),
      vendorCodes: (() {
        final list = _sdkworkAsList(json['vendorCodes']);
        if (list == null) {
          throw FormatException('AdminModelCatalogSyncResponse.vendorCodes is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      vendorCount: (() {
        final value = json['vendorCount']?.toString();
        if (value == null) {
          throw FormatException('AdminModelCatalogSyncResponse.vendorCount is required');
        }
        return value;
      })(),
      vendors: (() {
        final list = _sdkworkAsList(json['vendors']);
        if (list == null) {
          throw FormatException('AdminModelCatalogSyncResponse.vendors is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminModelVendorItem.fromJson(map);
      })())
            .whereType<AdminModelVendorItem>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'acceptedCount': acceptedCount,
      'capabilityCount': capabilityCount,
      'catalogRoot': catalogRoot,
      'catalogVersion': catalogVersion,
      'dryRun': dryRun,
      'familyCount': familyCount,
      'meterCount': meterCount,
      'mode': mode,
      'modelCount': modelCount,
      'models': models.map((item) => item.toJson()).toList(),
      'priceCount': priceCount,
      'rankingCount': rankingCount,
      'requestedCatalogVersion': requestedCatalogVersion,
      'snapshotId': snapshotId,
      'source': source,
      'sourceHash': sourceHash,
      'syncRunId': syncRunId,
      'synced': synced,
      'vendorCodes': vendorCodes.map((item) => item).toList(),
      'vendorCount': vendorCount,
      'vendors': vendors.map((item) => item.toJson()).toList(),
    };
  }
}

class AdminModelLimitCreateRequest {
  final String channelGroup;
  final String model;
  final int rpm;
  final String? status;
  final int tpm;

  AdminModelLimitCreateRequest({
    required this.channelGroup,
    required this.model,
    required this.rpm,
    this.status,
    required this.tpm
  });

  factory AdminModelLimitCreateRequest.fromJson(Map<String, dynamic> json) {
    return AdminModelLimitCreateRequest(
      channelGroup: (() {
        final value = json['channelGroup']?.toString();
        if (value == null) {
          throw FormatException('AdminModelLimitCreateRequest.channelGroup is required');
        }
        return value;
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('AdminModelLimitCreateRequest.model is required');
        }
        return value;
      })(),
      rpm: (() {
        final value = json['rpm'];
        if (value is! int) {
          throw FormatException('AdminModelLimitCreateRequest.rpm is required');
        }
        return value;
      })(),
      status: json['status']?.toString(),
      tpm: (() {
        final value = json['tpm'];
        if (value is! int) {
          throw FormatException('AdminModelLimitCreateRequest.tpm is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'channelGroup': channelGroup,
      'model': model,
      'rpm': rpm,
      'status': status,
      'tpm': tpm,
    };
  }
}

class AdminModelLimitsResponse {
  final List<AdminRateLimitItem> items;

  AdminModelLimitsResponse({
    required this.items
  });

  factory AdminModelLimitsResponse.fromJson(Map<String, dynamic> json) {
    return AdminModelLimitsResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminModelLimitsResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminRateLimitItem.fromJson(map);
      })())
            .whereType<AdminRateLimitItem>()
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

class AdminModelMappingCreateRequest {
  final List<AdminModelMappingRuleBindingInput> bindings;
  final bool? enabled;
  final List<AdminModelMappingRuleItemInput> mappingItems;
  final String? mappingMode;
  final String? matchType;
  final String sourceVendorCode;
  final String? sourceVendorId;
  final String targetVendorCode;
  final String? targetVendorId;

  AdminModelMappingCreateRequest({
    required this.bindings,
    this.enabled,
    required this.mappingItems,
    this.mappingMode,
    this.matchType,
    required this.sourceVendorCode,
    this.sourceVendorId,
    required this.targetVendorCode,
    this.targetVendorId
  });

  factory AdminModelMappingCreateRequest.fromJson(Map<String, dynamic> json) {
    return AdminModelMappingCreateRequest(
      bindings: (() {
        final list = _sdkworkAsList(json['bindings']);
        if (list == null) {
          throw FormatException('AdminModelMappingCreateRequest.bindings is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminModelMappingRuleBindingInput.fromJson(map);
      })())
            .whereType<AdminModelMappingRuleBindingInput>()
            .toList();
      })(),
      enabled: json['enabled'] is bool ? json['enabled'] : null,
      mappingItems: (() {
        final list = _sdkworkAsList(json['mappingItems']);
        if (list == null) {
          throw FormatException('AdminModelMappingCreateRequest.mappingItems is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminModelMappingRuleItemInput.fromJson(map);
      })())
            .whereType<AdminModelMappingRuleItemInput>()
            .toList();
      })(),
      mappingMode: json['mappingMode']?.toString(),
      matchType: json['matchType']?.toString(),
      sourceVendorCode: (() {
        final value = json['sourceVendorCode']?.toString();
        if (value == null) {
          throw FormatException('AdminModelMappingCreateRequest.sourceVendorCode is required');
        }
        return value;
      })(),
      sourceVendorId: json['sourceVendorId']?.toString(),
      targetVendorCode: (() {
        final value = json['targetVendorCode']?.toString();
        if (value == null) {
          throw FormatException('AdminModelMappingCreateRequest.targetVendorCode is required');
        }
        return value;
      })(),
      targetVendorId: json['targetVendorId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bindings': bindings.map((item) => item.toJson()).toList(),
      'enabled': enabled,
      'mappingItems': mappingItems.map((item) => item.toJson()).toList(),
      'mappingMode': mappingMode,
      'matchType': matchType,
      'sourceVendorCode': sourceVendorCode,
      'sourceVendorId': sourceVendorId,
      'targetVendorCode': targetVendorCode,
      'targetVendorId': targetVendorId,
    };
  }
}

class AdminModelMappingDeleteResponse {
  final bool deleted;

  AdminModelMappingDeleteResponse({
    required this.deleted
  });

  factory AdminModelMappingDeleteResponse.fromJson(Map<String, dynamic> json) {
    return AdminModelMappingDeleteResponse(
      deleted: (() {
        final value = json['deleted'];
        if (value is! bool) {
          throw FormatException('AdminModelMappingDeleteResponse.deleted is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'deleted': deleted,
    };
  }
}

class AdminModelMappingMutationResponse {
  final AdminModelMappingRule item;

  AdminModelMappingMutationResponse({
    required this.item
  });

  factory AdminModelMappingMutationResponse.fromJson(Map<String, dynamic> json) {
    return AdminModelMappingMutationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('AdminModelMappingMutationResponse.item is required');
        }
        return AdminModelMappingRule.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class AdminModelMappingResolveRequest {
  final String? channelCode;
  final String? channelId;
  final String? providerAccountCode;
  final String? providerAccountId;
  final String sourceModel;
  final String? vendorCode;

  AdminModelMappingResolveRequest({
    this.channelCode,
    this.channelId,
    this.providerAccountCode,
    this.providerAccountId,
    required this.sourceModel,
    this.vendorCode
  });

  factory AdminModelMappingResolveRequest.fromJson(Map<String, dynamic> json) {
    return AdminModelMappingResolveRequest(
      channelCode: json['channelCode']?.toString(),
      channelId: json['channelId']?.toString(),
      providerAccountCode: json['providerAccountCode']?.toString(),
      providerAccountId: json['providerAccountId']?.toString(),
      sourceModel: (() {
        final value = json['sourceModel']?.toString();
        if (value == null) {
          throw FormatException('AdminModelMappingResolveRequest.sourceModel is required');
        }
        return value;
      })(),
      vendorCode: json['vendorCode']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'channelCode': channelCode,
      'channelId': channelId,
      'providerAccountCode': providerAccountCode,
      'providerAccountId': providerAccountId,
      'sourceModel': sourceModel,
      'vendorCode': vendorCode,
    };
  }
}

class AdminModelMappingResolveResponse {
  final bool matched;
  final String? matchedBindingType;
  final AdminModelMappingRule? rule;
  final String sourceModel;
  final String? targetCatalogKey;
  final String targetModel;
  final String? targetProviderModel;
  final String? targetProviderNativeModel;
  final String? targetVendorCode;

  AdminModelMappingResolveResponse({
    required this.matched,
    this.matchedBindingType,
    this.rule,
    required this.sourceModel,
    this.targetCatalogKey,
    required this.targetModel,
    this.targetProviderModel,
    this.targetProviderNativeModel,
    this.targetVendorCode
  });

  factory AdminModelMappingResolveResponse.fromJson(Map<String, dynamic> json) {
    return AdminModelMappingResolveResponse(
      matched: (() {
        final value = json['matched'];
        if (value is! bool) {
          throw FormatException('AdminModelMappingResolveResponse.matched is required');
        }
        return value;
      })(),
      matchedBindingType: json['matchedBindingType']?.toString(),
      rule: (() {
        final map = _sdkworkAsMap(json['rule']);
        return map == null ? null : AdminModelMappingRule.fromJson(map);
      })(),
      sourceModel: (() {
        final value = json['sourceModel']?.toString();
        if (value == null) {
          throw FormatException('AdminModelMappingResolveResponse.sourceModel is required');
        }
        return value;
      })(),
      targetCatalogKey: json['targetCatalogKey']?.toString(),
      targetModel: (() {
        final value = json['targetModel']?.toString();
        if (value == null) {
          throw FormatException('AdminModelMappingResolveResponse.targetModel is required');
        }
        return value;
      })(),
      targetProviderModel: json['targetProviderModel']?.toString(),
      targetProviderNativeModel: json['targetProviderNativeModel']?.toString(),
      targetVendorCode: json['targetVendorCode']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'matched': matched,
      'matchedBindingType': matchedBindingType,
      'rule': rule?.toJson(),
      'sourceModel': sourceModel,
      'targetCatalogKey': targetCatalogKey,
      'targetModel': targetModel,
      'targetProviderModel': targetProviderModel,
      'targetProviderNativeModel': targetProviderNativeModel,
      'targetVendorCode': targetVendorCode,
    };
  }
}

class AdminModelMappingRule {
  final String bindingType;
  final List<AdminModelMappingRuleBinding> bindings;
  final String? createdAt;
  final bool enabled;
  final String id;
  final List<AdminModelMappingRuleItem> mappingItems;
  final String mappingMode;
  final String matchType;
  final String sourceVendorCode;
  final String? sourceVendorId;
  final String targetVendorCode;
  final String? targetVendorId;
  final String? updatedAt;

  AdminModelMappingRule({
    required this.bindingType,
    required this.bindings,
    this.createdAt,
    required this.enabled,
    required this.id,
    required this.mappingItems,
    required this.mappingMode,
    required this.matchType,
    required this.sourceVendorCode,
    this.sourceVendorId,
    required this.targetVendorCode,
    this.targetVendorId,
    this.updatedAt
  });

  factory AdminModelMappingRule.fromJson(Map<String, dynamic> json) {
    return AdminModelMappingRule(
      bindingType: (() {
        final value = json['bindingType']?.toString();
        if (value == null) {
          throw FormatException('AdminModelMappingRule.bindingType is required');
        }
        return value;
      })(),
      bindings: (() {
        final list = _sdkworkAsList(json['bindings']);
        if (list == null) {
          throw FormatException('AdminModelMappingRule.bindings is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminModelMappingRuleBinding.fromJson(map);
      })())
            .whereType<AdminModelMappingRuleBinding>()
            .toList();
      })(),
      createdAt: json['createdAt']?.toString(),
      enabled: (() {
        final value = json['enabled'];
        if (value is! bool) {
          throw FormatException('AdminModelMappingRule.enabled is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminModelMappingRule.id is required');
        }
        return value;
      })(),
      mappingItems: (() {
        final list = _sdkworkAsList(json['mappingItems']);
        if (list == null) {
          throw FormatException('AdminModelMappingRule.mappingItems is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminModelMappingRuleItem.fromJson(map);
      })())
            .whereType<AdminModelMappingRuleItem>()
            .toList();
      })(),
      mappingMode: (() {
        final value = json['mappingMode']?.toString();
        if (value == null) {
          throw FormatException('AdminModelMappingRule.mappingMode is required');
        }
        return value;
      })(),
      matchType: (() {
        final value = json['matchType']?.toString();
        if (value == null) {
          throw FormatException('AdminModelMappingRule.matchType is required');
        }
        return value;
      })(),
      sourceVendorCode: (() {
        final value = json['sourceVendorCode']?.toString();
        if (value == null) {
          throw FormatException('AdminModelMappingRule.sourceVendorCode is required');
        }
        return value;
      })(),
      sourceVendorId: json['sourceVendorId']?.toString(),
      targetVendorCode: (() {
        final value = json['targetVendorCode']?.toString();
        if (value == null) {
          throw FormatException('AdminModelMappingRule.targetVendorCode is required');
        }
        return value;
      })(),
      targetVendorId: json['targetVendorId']?.toString(),
      updatedAt: json['updatedAt']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bindingType': bindingType,
      'bindings': bindings.map((item) => item.toJson()).toList(),
      'createdAt': createdAt,
      'enabled': enabled,
      'id': id,
      'mappingItems': mappingItems.map((item) => item.toJson()).toList(),
      'mappingMode': mappingMode,
      'matchType': matchType,
      'sourceVendorCode': sourceVendorCode,
      'sourceVendorId': sourceVendorId,
      'targetVendorCode': targetVendorCode,
      'targetVendorId': targetVendorId,
      'updatedAt': updatedAt,
    };
  }
}

class AdminModelMappingRuleBinding {
  final String? bindingCode;
  final String? bindingId;
  final String? bindingName;
  final String bindingType;
  final String? createdAt;
  final bool enabled;
  final String id;
  final String sortOrder;
  final String? updatedAt;

  AdminModelMappingRuleBinding({
    this.bindingCode,
    this.bindingId,
    this.bindingName,
    required this.bindingType,
    this.createdAt,
    required this.enabled,
    required this.id,
    required this.sortOrder,
    this.updatedAt
  });

  factory AdminModelMappingRuleBinding.fromJson(Map<String, dynamic> json) {
    return AdminModelMappingRuleBinding(
      bindingCode: json['bindingCode']?.toString(),
      bindingId: json['bindingId']?.toString(),
      bindingName: json['bindingName']?.toString(),
      bindingType: (() {
        final value = json['bindingType']?.toString();
        if (value == null) {
          throw FormatException('AdminModelMappingRuleBinding.bindingType is required');
        }
        return value;
      })(),
      createdAt: json['createdAt']?.toString(),
      enabled: (() {
        final value = json['enabled'];
        if (value is! bool) {
          throw FormatException('AdminModelMappingRuleBinding.enabled is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminModelMappingRuleBinding.id is required');
        }
        return value;
      })(),
      sortOrder: (() {
        final value = json['sortOrder']?.toString();
        if (value == null) {
          throw FormatException('AdminModelMappingRuleBinding.sortOrder is required');
        }
        return value;
      })(),
      updatedAt: json['updatedAt']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bindingCode': bindingCode,
      'bindingId': bindingId,
      'bindingName': bindingName,
      'bindingType': bindingType,
      'createdAt': createdAt,
      'enabled': enabled,
      'id': id,
      'sortOrder': sortOrder,
      'updatedAt': updatedAt,
    };
  }
}

class AdminModelMappingRuleBindingInput {
  final String? bindingCode;
  final String? bindingId;
  final String? bindingName;
  final String bindingType;
  final bool? enabled;
  final String? id;

  AdminModelMappingRuleBindingInput({
    this.bindingCode,
    this.bindingId,
    this.bindingName,
    required this.bindingType,
    this.enabled,
    this.id
  });

  factory AdminModelMappingRuleBindingInput.fromJson(Map<String, dynamic> json) {
    return AdminModelMappingRuleBindingInput(
      bindingCode: json['bindingCode']?.toString(),
      bindingId: json['bindingId']?.toString(),
      bindingName: json['bindingName']?.toString(),
      bindingType: (() {
        final value = json['bindingType']?.toString();
        if (value == null) {
          throw FormatException('AdminModelMappingRuleBindingInput.bindingType is required');
        }
        return value;
      })(),
      enabled: json['enabled'] is bool ? json['enabled'] : null,
      id: json['id']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bindingCode': bindingCode,
      'bindingId': bindingId,
      'bindingName': bindingName,
      'bindingType': bindingType,
      'enabled': enabled,
      'id': id,
    };
  }
}

class AdminModelMappingRuleItem {
  final String? createdAt;
  final bool enabled;
  final String id;
  final String sortOrder;
  final String? sourceCatalogKey;
  final String sourceModel;
  final String? targetCatalogKey;
  final String targetModel;
  final String? targetProviderModel;
  final String? targetProviderNativeModel;
  final String? updatedAt;

  AdminModelMappingRuleItem({
    this.createdAt,
    required this.enabled,
    required this.id,
    required this.sortOrder,
    this.sourceCatalogKey,
    required this.sourceModel,
    this.targetCatalogKey,
    required this.targetModel,
    this.targetProviderModel,
    this.targetProviderNativeModel,
    this.updatedAt
  });

  factory AdminModelMappingRuleItem.fromJson(Map<String, dynamic> json) {
    return AdminModelMappingRuleItem(
      createdAt: json['createdAt']?.toString(),
      enabled: (() {
        final value = json['enabled'];
        if (value is! bool) {
          throw FormatException('AdminModelMappingRuleItem.enabled is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminModelMappingRuleItem.id is required');
        }
        return value;
      })(),
      sortOrder: (() {
        final value = json['sortOrder']?.toString();
        if (value == null) {
          throw FormatException('AdminModelMappingRuleItem.sortOrder is required');
        }
        return value;
      })(),
      sourceCatalogKey: json['sourceCatalogKey']?.toString(),
      sourceModel: (() {
        final value = json['sourceModel']?.toString();
        if (value == null) {
          throw FormatException('AdminModelMappingRuleItem.sourceModel is required');
        }
        return value;
      })(),
      targetCatalogKey: json['targetCatalogKey']?.toString(),
      targetModel: (() {
        final value = json['targetModel']?.toString();
        if (value == null) {
          throw FormatException('AdminModelMappingRuleItem.targetModel is required');
        }
        return value;
      })(),
      targetProviderModel: json['targetProviderModel']?.toString(),
      targetProviderNativeModel: json['targetProviderNativeModel']?.toString(),
      updatedAt: json['updatedAt']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'createdAt': createdAt,
      'enabled': enabled,
      'id': id,
      'sortOrder': sortOrder,
      'sourceCatalogKey': sourceCatalogKey,
      'sourceModel': sourceModel,
      'targetCatalogKey': targetCatalogKey,
      'targetModel': targetModel,
      'targetProviderModel': targetProviderModel,
      'targetProviderNativeModel': targetProviderNativeModel,
      'updatedAt': updatedAt,
    };
  }
}

class AdminModelMappingRuleItemInput {
  final bool? enabled;
  final String? id;
  final String? sourceCatalogKey;
  final String sourceModel;
  final String? targetCatalogKey;
  final String targetModel;
  final String? targetProviderModel;
  final String? targetProviderNativeModel;

  AdminModelMappingRuleItemInput({
    this.enabled,
    this.id,
    this.sourceCatalogKey,
    required this.sourceModel,
    this.targetCatalogKey,
    required this.targetModel,
    this.targetProviderModel,
    this.targetProviderNativeModel
  });

  factory AdminModelMappingRuleItemInput.fromJson(Map<String, dynamic> json) {
    return AdminModelMappingRuleItemInput(
      enabled: json['enabled'] is bool ? json['enabled'] : null,
      id: json['id']?.toString(),
      sourceCatalogKey: json['sourceCatalogKey']?.toString(),
      sourceModel: (() {
        final value = json['sourceModel']?.toString();
        if (value == null) {
          throw FormatException('AdminModelMappingRuleItemInput.sourceModel is required');
        }
        return value;
      })(),
      targetCatalogKey: json['targetCatalogKey']?.toString(),
      targetModel: (() {
        final value = json['targetModel']?.toString();
        if (value == null) {
          throw FormatException('AdminModelMappingRuleItemInput.targetModel is required');
        }
        return value;
      })(),
      targetProviderModel: json['targetProviderModel']?.toString(),
      targetProviderNativeModel: json['targetProviderNativeModel']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'enabled': enabled,
      'id': id,
      'sourceCatalogKey': sourceCatalogKey,
      'sourceModel': sourceModel,
      'targetCatalogKey': targetCatalogKey,
      'targetModel': targetModel,
      'targetProviderModel': targetProviderModel,
      'targetProviderNativeModel': targetProviderNativeModel,
    };
  }
}

class AdminModelMappingUpdateRequest {
  final List<AdminModelMappingRuleBindingInput>? bindings;
  final bool? enabled;
  final List<AdminModelMappingRuleItemInput>? mappingItems;
  final String? mappingMode;
  final String? matchType;
  final String? sourceVendorCode;
  final String? sourceVendorId;
  final String? targetVendorCode;
  final String? targetVendorId;

  AdminModelMappingUpdateRequest({
    this.bindings,
    this.enabled,
    this.mappingItems,
    this.mappingMode,
    this.matchType,
    this.sourceVendorCode,
    this.sourceVendorId,
    this.targetVendorCode,
    this.targetVendorId
  });

  factory AdminModelMappingUpdateRequest.fromJson(Map<String, dynamic> json) {
    return AdminModelMappingUpdateRequest(
      bindings: (() {
        final list = _sdkworkAsList(json['bindings']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminModelMappingRuleBindingInput.fromJson(map);
      })())
            .whereType<AdminModelMappingRuleBindingInput>()
            .toList();
      })(),
      enabled: json['enabled'] is bool ? json['enabled'] : null,
      mappingItems: (() {
        final list = _sdkworkAsList(json['mappingItems']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminModelMappingRuleItemInput.fromJson(map);
      })())
            .whereType<AdminModelMappingRuleItemInput>()
            .toList();
      })(),
      mappingMode: json['mappingMode']?.toString(),
      matchType: json['matchType']?.toString(),
      sourceVendorCode: json['sourceVendorCode']?.toString(),
      sourceVendorId: json['sourceVendorId']?.toString(),
      targetVendorCode: json['targetVendorCode']?.toString(),
      targetVendorId: json['targetVendorId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bindings': bindings?.map((item) => item.toJson()).toList(),
      'enabled': enabled,
      'mappingItems': mappingItems?.map((item) => item.toJson()).toList(),
      'mappingMode': mappingMode,
      'matchType': matchType,
      'sourceVendorCode': sourceVendorCode,
      'sourceVendorId': sourceVendorId,
      'targetVendorCode': targetVendorCode,
      'targetVendorId': targetVendorId,
    };
  }
}

class AdminModelMappingsResponse {
  final List<AdminModelMappingRule> items;

  AdminModelMappingsResponse({
    required this.items
  });

  factory AdminModelMappingsResponse.fromJson(Map<String, dynamic> json) {
    return AdminModelMappingsResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminModelMappingsResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminModelMappingRule.fromJson(map);
      })())
            .whereType<AdminModelMappingRule>()
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

class AdminModelVendorCreateRequest {
  final String? color;
  final String? description;
  final String name;
  final String? status;
  final String? vendorCode;

  AdminModelVendorCreateRequest({
    this.color,
    this.description,
    required this.name,
    this.status,
    this.vendorCode
  });

  factory AdminModelVendorCreateRequest.fromJson(Map<String, dynamic> json) {
    return AdminModelVendorCreateRequest(
      color: json['color']?.toString(),
      description: json['description']?.toString(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AdminModelVendorCreateRequest.name is required');
        }
        return value;
      })(),
      status: json['status']?.toString(),
      vendorCode: json['vendorCode']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'color': color,
      'description': description,
      'name': name,
      'status': status,
      'vendorCode': vendorCode,
    };
  }
}

class AdminModelVendorItem {
  final String color;
  final String description;
  final String id;
  final String name;
  final String status;
  final String vendorCode;

  AdminModelVendorItem({
    required this.color,
    required this.description,
    required this.id,
    required this.name,
    required this.status,
    required this.vendorCode
  });

  factory AdminModelVendorItem.fromJson(Map<String, dynamic> json) {
    return AdminModelVendorItem(
      color: (() {
        final value = json['color']?.toString();
        if (value == null) {
          throw FormatException('AdminModelVendorItem.color is required');
        }
        return value;
      })(),
      description: (() {
        final value = json['description']?.toString();
        if (value == null) {
          throw FormatException('AdminModelVendorItem.description is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminModelVendorItem.id is required');
        }
        return value;
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AdminModelVendorItem.name is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminModelVendorItem.status is required');
        }
        return value;
      })(),
      vendorCode: (() {
        final value = json['vendorCode']?.toString();
        if (value == null) {
          throw FormatException('AdminModelVendorItem.vendorCode is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'color': color,
      'description': description,
      'id': id,
      'name': name,
      'status': status,
      'vendorCode': vendorCode,
    };
  }
}

class AdminModelVendorMutationResponse {
  final AdminModelVendorItem item;

  AdminModelVendorMutationResponse({
    required this.item
  });

  factory AdminModelVendorMutationResponse.fromJson(Map<String, dynamic> json) {
    return AdminModelVendorMutationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('AdminModelVendorMutationResponse.item is required');
        }
        return AdminModelVendorItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class AdminModelVendorsResponse {
  final List<AdminModelVendorItem> items;

  AdminModelVendorsResponse({
    required this.items
  });

  factory AdminModelVendorsResponse.fromJson(Map<String, dynamic> json) {
    return AdminModelVendorsResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminModelVendorsResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminModelVendorItem.fromJson(map);
      })())
            .whereType<AdminModelVendorItem>()
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

class AdminMonitorAlertItem {
  final String id;
  final String message;
  final String severity;
  final String source;
  final String status;
  final String time;
  final String title;

  AdminMonitorAlertItem({
    required this.id,
    required this.message,
    required this.severity,
    required this.source,
    required this.status,
    required this.time,
    required this.title
  });

  factory AdminMonitorAlertItem.fromJson(Map<String, dynamic> json) {
    return AdminMonitorAlertItem(
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminMonitorAlertItem.id is required');
        }
        return value;
      })(),
      message: (() {
        final value = json['message']?.toString();
        if (value == null) {
          throw FormatException('AdminMonitorAlertItem.message is required');
        }
        return value;
      })(),
      severity: (() {
        final value = json['severity']?.toString();
        if (value == null) {
          throw FormatException('AdminMonitorAlertItem.severity is required');
        }
        return value;
      })(),
      source: (() {
        final value = json['source']?.toString();
        if (value == null) {
          throw FormatException('AdminMonitorAlertItem.source is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminMonitorAlertItem.status is required');
        }
        return value;
      })(),
      time: (() {
        final value = json['time']?.toString();
        if (value == null) {
          throw FormatException('AdminMonitorAlertItem.time is required');
        }
        return value;
      })(),
      title: (() {
        final value = json['title']?.toString();
        if (value == null) {
          throw FormatException('AdminMonitorAlertItem.title is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'message': message,
      'severity': severity,
      'source': source,
      'status': status,
      'time': time,
      'title': title,
    };
  }
}

class AdminMonitorAlertsResponse {
  final List<AdminMonitorAlertItem> items;

  AdminMonitorAlertsResponse({
    required this.items
  });

  factory AdminMonitorAlertsResponse.fromJson(Map<String, dynamic> json) {
    return AdminMonitorAlertsResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminMonitorAlertsResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminMonitorAlertItem.fromJson(map);
      })())
            .whereType<AdminMonitorAlertItem>()
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

class AdminMonitorNodeItem {
  final double cpu;
  final String id;
  final String ip;
  final double memory;
  final String name;
  final String region;
  final String status;
  final String uptime;

  AdminMonitorNodeItem({
    required this.cpu,
    required this.id,
    required this.ip,
    required this.memory,
    required this.name,
    required this.region,
    required this.status,
    required this.uptime
  });

  factory AdminMonitorNodeItem.fromJson(Map<String, dynamic> json) {
    return AdminMonitorNodeItem(
      cpu: (() {
        final value = json['cpu'];
        if (value is! num) {
          throw FormatException('AdminMonitorNodeItem.cpu is required');
        }
        return value.toDouble();
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminMonitorNodeItem.id is required');
        }
        return value;
      })(),
      ip: (() {
        final value = json['ip']?.toString();
        if (value == null) {
          throw FormatException('AdminMonitorNodeItem.ip is required');
        }
        return value;
      })(),
      memory: (() {
        final value = json['memory'];
        if (value is! num) {
          throw FormatException('AdminMonitorNodeItem.memory is required');
        }
        return value.toDouble();
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AdminMonitorNodeItem.name is required');
        }
        return value;
      })(),
      region: (() {
        final value = json['region']?.toString();
        if (value == null) {
          throw FormatException('AdminMonitorNodeItem.region is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminMonitorNodeItem.status is required');
        }
        return value;
      })(),
      uptime: (() {
        final value = json['uptime']?.toString();
        if (value == null) {
          throw FormatException('AdminMonitorNodeItem.uptime is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cpu': cpu,
      'id': id,
      'ip': ip,
      'memory': memory,
      'name': name,
      'region': region,
      'status': status,
      'uptime': uptime,
    };
  }
}

class AdminMonitorNodesResponse {
  final List<AdminMonitorNodeItem> items;

  AdminMonitorNodesResponse({
    required this.items
  });

  factory AdminMonitorNodesResponse.fromJson(Map<String, dynamic> json) {
    return AdminMonitorNodesResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminMonitorNodesResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminMonitorNodeItem.fromJson(map);
      })())
            .whereType<AdminMonitorNodeItem>()
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

class AdminMonitorPerformanceItem {
  final double cpu;
  final double memory;
  final double network;
  final String time;

  AdminMonitorPerformanceItem({
    required this.cpu,
    required this.memory,
    required this.network,
    required this.time
  });

  factory AdminMonitorPerformanceItem.fromJson(Map<String, dynamic> json) {
    return AdminMonitorPerformanceItem(
      cpu: (() {
        final value = json['cpu'];
        if (value is! num) {
          throw FormatException('AdminMonitorPerformanceItem.cpu is required');
        }
        return value.toDouble();
      })(),
      memory: (() {
        final value = json['memory'];
        if (value is! num) {
          throw FormatException('AdminMonitorPerformanceItem.memory is required');
        }
        return value.toDouble();
      })(),
      network: (() {
        final value = json['network'];
        if (value is! num) {
          throw FormatException('AdminMonitorPerformanceItem.network is required');
        }
        return value.toDouble();
      })(),
      time: (() {
        final value = json['time']?.toString();
        if (value == null) {
          throw FormatException('AdminMonitorPerformanceItem.time is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cpu': cpu,
      'memory': memory,
      'network': network,
      'time': time,
    };
  }
}

class AdminMonitorPerformanceResponse {
  final List<AdminMonitorPerformanceItem> items;

  AdminMonitorPerformanceResponse({
    required this.items
  });

  factory AdminMonitorPerformanceResponse.fromJson(Map<String, dynamic> json) {
    return AdminMonitorPerformanceResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminMonitorPerformanceResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminMonitorPerformanceItem.fromJson(map);
      })())
            .whereType<AdminMonitorPerformanceItem>()
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

class AdminPieChartItem {
  final String color;
  final String name;
  final double value;

  AdminPieChartItem({
    required this.color,
    required this.name,
    required this.value
  });

  factory AdminPieChartItem.fromJson(Map<String, dynamic> json) {
    return AdminPieChartItem(
      color: (() {
        final value = json['color']?.toString();
        if (value == null) {
          throw FormatException('AdminPieChartItem.color is required');
        }
        return value;
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AdminPieChartItem.name is required');
        }
        return value;
      })(),
      value: (() {
        final value = json['value'];
        if (value is! num) {
          throw FormatException('AdminPieChartItem.value is required');
        }
        return value.toDouble();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'color': color,
      'name': name,
      'value': value,
    };
  }
}

class AdminPromptBindingCreateRequest {
  final String bindingRole;
  final bool? enabled;
  final String ownerId;
  final String ownerType;
  final Map<String, dynamic>? policyJson;
  final int? priority;
  final String? promptVersionId;

  AdminPromptBindingCreateRequest({
    required this.bindingRole,
    this.enabled,
    required this.ownerId,
    required this.ownerType,
    this.policyJson,
    this.priority,
    this.promptVersionId
  });

  factory AdminPromptBindingCreateRequest.fromJson(Map<String, dynamic> json) {
    return AdminPromptBindingCreateRequest(
      bindingRole: (() {
        final value = json['bindingRole']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptBindingCreateRequest.bindingRole is required');
        }
        return value;
      })(),
      enabled: json['enabled'] is bool ? json['enabled'] : null,
      ownerId: (() {
        final value = json['ownerId']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptBindingCreateRequest.ownerId is required');
        }
        return value;
      })(),
      ownerType: (() {
        final value = json['ownerType']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptBindingCreateRequest.ownerType is required');
        }
        return value;
      })(),
      policyJson: (() {
        final map = _sdkworkAsMap(json['policyJson']);
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
      priority: json['priority'] is int ? json['priority'] : null,
      promptVersionId: json['promptVersionId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bindingRole': bindingRole,
      'enabled': enabled,
      'ownerId': ownerId,
      'ownerType': ownerType,
      'policyJson': policyJson?.map((key, item) => MapEntry(key, item)),
      'priority': priority,
      'promptVersionId': promptVersionId,
    };
  }
}

class AdminPromptBindingItem {
  final String bindingRole;
  final String createdAt;
  final bool enabled;
  final String id;
  final String organizationId;
  final String ownerId;
  final String ownerType;
  final Map<String, dynamic> policyJson;
  final int priority;
  final String promptId;
  final String? promptVersionId;
  final Map<String, dynamic> snapshotJson;
  final String tenantId;
  final String updatedAt;
  final String uuid;

  AdminPromptBindingItem({
    required this.bindingRole,
    required this.createdAt,
    required this.enabled,
    required this.id,
    required this.organizationId,
    required this.ownerId,
    required this.ownerType,
    required this.policyJson,
    required this.priority,
    required this.promptId,
    this.promptVersionId,
    required this.snapshotJson,
    required this.tenantId,
    required this.updatedAt,
    required this.uuid
  });

  factory AdminPromptBindingItem.fromJson(Map<String, dynamic> json) {
    return AdminPromptBindingItem(
      bindingRole: (() {
        final value = json['bindingRole']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptBindingItem.bindingRole is required');
        }
        return value;
      })(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptBindingItem.createdAt is required');
        }
        return value;
      })(),
      enabled: (() {
        final value = json['enabled'];
        if (value is! bool) {
          throw FormatException('AdminPromptBindingItem.enabled is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptBindingItem.id is required');
        }
        return value;
      })(),
      organizationId: (() {
        final value = json['organizationId']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptBindingItem.organizationId is required');
        }
        return value;
      })(),
      ownerId: (() {
        final value = json['ownerId']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptBindingItem.ownerId is required');
        }
        return value;
      })(),
      ownerType: (() {
        final value = json['ownerType']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptBindingItem.ownerType is required');
        }
        return value;
      })(),
      policyJson: (() {
        final map = _sdkworkAsMap(json['policyJson']);
        if (map == null) {
          throw FormatException('AdminPromptBindingItem.policyJson is required');
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
      priority: (() {
        final value = json['priority'];
        if (value is! int) {
          throw FormatException('AdminPromptBindingItem.priority is required');
        }
        return value;
      })(),
      promptId: (() {
        final value = json['promptId']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptBindingItem.promptId is required');
        }
        return value;
      })(),
      promptVersionId: json['promptVersionId']?.toString(),
      snapshotJson: (() {
        final map = _sdkworkAsMap(json['snapshotJson']);
        if (map == null) {
          throw FormatException('AdminPromptBindingItem.snapshotJson is required');
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
      tenantId: (() {
        final value = json['tenantId']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptBindingItem.tenantId is required');
        }
        return value;
      })(),
      updatedAt: (() {
        final value = json['updatedAt']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptBindingItem.updatedAt is required');
        }
        return value;
      })(),
      uuid: (() {
        final value = json['uuid']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptBindingItem.uuid is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bindingRole': bindingRole,
      'createdAt': createdAt,
      'enabled': enabled,
      'id': id,
      'organizationId': organizationId,
      'ownerId': ownerId,
      'ownerType': ownerType,
      'policyJson': policyJson.map((key, item) => MapEntry(key, item)),
      'priority': priority,
      'promptId': promptId,
      'promptVersionId': promptVersionId,
      'snapshotJson': snapshotJson.map((key, item) => MapEntry(key, item)),
      'tenantId': tenantId,
      'updatedAt': updatedAt,
      'uuid': uuid,
    };
  }
}

class AdminPromptBindingListResponse {
  final List<AdminPromptBindingItem> items;

  AdminPromptBindingListResponse({
    required this.items
  });

  factory AdminPromptBindingListResponse.fromJson(Map<String, dynamic> json) {
    return AdminPromptBindingListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminPromptBindingListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminPromptBindingItem.fromJson(map);
      })())
            .whereType<AdminPromptBindingItem>()
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

class AdminPromptBindingMutationResponse {
  final AdminPromptBindingItem item;

  AdminPromptBindingMutationResponse({
    required this.item
  });

  factory AdminPromptBindingMutationResponse.fromJson(Map<String, dynamic> json) {
    return AdminPromptBindingMutationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('AdminPromptBindingMutationResponse.item is required');
        }
        return AdminPromptBindingItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class AdminPromptBindingUpdateRequest {
  final String? bindingRole;
  final bool? enabled;
  final String? ownerId;
  final String? ownerType;
  final Map<String, dynamic>? policyJson;
  final int? priority;
  final String? promptVersionId;

  AdminPromptBindingUpdateRequest({
    this.bindingRole,
    this.enabled,
    this.ownerId,
    this.ownerType,
    this.policyJson,
    this.priority,
    this.promptVersionId
  });

  factory AdminPromptBindingUpdateRequest.fromJson(Map<String, dynamic> json) {
    return AdminPromptBindingUpdateRequest(
      bindingRole: json['bindingRole']?.toString(),
      enabled: json['enabled'] is bool ? json['enabled'] : null,
      ownerId: json['ownerId']?.toString(),
      ownerType: json['ownerType']?.toString(),
      policyJson: (() {
        final map = _sdkworkAsMap(json['policyJson']);
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
      priority: json['priority'] is int ? json['priority'] : null,
      promptVersionId: json['promptVersionId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bindingRole': bindingRole,
      'enabled': enabled,
      'ownerId': ownerId,
      'ownerType': ownerType,
      'policyJson': policyJson?.map((key, item) => MapEntry(key, item)),
      'priority': priority,
      'promptVersionId': promptVersionId,
    };
  }
}

class AdminPromptCreateRequest {
  final String? categoryId;
  final String? description;
  final String name;
  final String promptKey;
  final String? promptType;
  final List<String>? tags;
  final String? visibility;

  AdminPromptCreateRequest({
    this.categoryId,
    this.description,
    required this.name,
    required this.promptKey,
    this.promptType,
    this.tags,
    this.visibility
  });

  factory AdminPromptCreateRequest.fromJson(Map<String, dynamic> json) {
    return AdminPromptCreateRequest(
      categoryId: json['categoryId']?.toString(),
      description: json['description']?.toString(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptCreateRequest.name is required');
        }
        return value;
      })(),
      promptKey: (() {
        final value = json['promptKey']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptCreateRequest.promptKey is required');
        }
        return value;
      })(),
      promptType: json['promptType']?.toString(),
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
      visibility: json['visibility']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'categoryId': categoryId,
      'description': description,
      'name': name,
      'promptKey': promptKey,
      'promptType': promptType,
      'tags': tags?.map((item) => item).toList(),
      'visibility': visibility,
    };
  }
}

class AdminPromptItem {
  final String? categoryCode;
  final String? categoryId;
  final String createdAt;
  final String? description;
  final String id;
  final String? latestVersionId;
  final String name;
  final String organizationId;
  final String? ownerUserId;
  final String promptKey;
  final String promptType;
  final String? publishedVersionId;
  final String status;
  final List<String> tags;
  final String tenantId;
  final String updatedAt;
  final String uuid;
  final String visibility;

  AdminPromptItem({
    this.categoryCode,
    this.categoryId,
    required this.createdAt,
    this.description,
    required this.id,
    this.latestVersionId,
    required this.name,
    required this.organizationId,
    this.ownerUserId,
    required this.promptKey,
    required this.promptType,
    this.publishedVersionId,
    required this.status,
    required this.tags,
    required this.tenantId,
    required this.updatedAt,
    required this.uuid,
    required this.visibility
  });

  factory AdminPromptItem.fromJson(Map<String, dynamic> json) {
    return AdminPromptItem(
      categoryCode: json['categoryCode']?.toString(),
      categoryId: json['categoryId']?.toString(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptItem.createdAt is required');
        }
        return value;
      })(),
      description: json['description']?.toString(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptItem.id is required');
        }
        return value;
      })(),
      latestVersionId: json['latestVersionId']?.toString(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptItem.name is required');
        }
        return value;
      })(),
      organizationId: (() {
        final value = json['organizationId']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptItem.organizationId is required');
        }
        return value;
      })(),
      ownerUserId: json['ownerUserId']?.toString(),
      promptKey: (() {
        final value = json['promptKey']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptItem.promptKey is required');
        }
        return value;
      })(),
      promptType: (() {
        final value = json['promptType']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptItem.promptType is required');
        }
        return value;
      })(),
      publishedVersionId: json['publishedVersionId']?.toString(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptItem.status is required');
        }
        return value;
      })(),
      tags: (() {
        final list = _sdkworkAsList(json['tags']);
        if (list == null) {
          throw FormatException('AdminPromptItem.tags is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      tenantId: (() {
        final value = json['tenantId']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptItem.tenantId is required');
        }
        return value;
      })(),
      updatedAt: (() {
        final value = json['updatedAt']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptItem.updatedAt is required');
        }
        return value;
      })(),
      uuid: (() {
        final value = json['uuid']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptItem.uuid is required');
        }
        return value;
      })(),
      visibility: (() {
        final value = json['visibility']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptItem.visibility is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'categoryCode': categoryCode,
      'categoryId': categoryId,
      'createdAt': createdAt,
      'description': description,
      'id': id,
      'latestVersionId': latestVersionId,
      'name': name,
      'organizationId': organizationId,
      'ownerUserId': ownerUserId,
      'promptKey': promptKey,
      'promptType': promptType,
      'publishedVersionId': publishedVersionId,
      'status': status,
      'tags': tags.map((item) => item).toList(),
      'tenantId': tenantId,
      'updatedAt': updatedAt,
      'uuid': uuid,
      'visibility': visibility,
    };
  }
}

class AdminPromptListResponse {
  final List<AdminPromptItem> items;

  AdminPromptListResponse({
    required this.items
  });

  factory AdminPromptListResponse.fromJson(Map<String, dynamic> json) {
    return AdminPromptListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminPromptListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminPromptItem.fromJson(map);
      })())
            .whereType<AdminPromptItem>()
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

class AdminPromptMutationResponse {
  final AdminPromptItem item;

  AdminPromptMutationResponse({
    required this.item
  });

  factory AdminPromptMutationResponse.fromJson(Map<String, dynamic> json) {
    return AdminPromptMutationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('AdminPromptMutationResponse.item is required');
        }
        return AdminPromptItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class AdminPromptRenderRequest {
  final Map<String, dynamic>? variables;

  AdminPromptRenderRequest({
    this.variables
  });

  factory AdminPromptRenderRequest.fromJson(Map<String, dynamic> json) {
    return AdminPromptRenderRequest(
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
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'variables': variables?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class AdminPromptRenderResponse {
  final String rendered;

  AdminPromptRenderResponse({
    required this.rendered
  });

  factory AdminPromptRenderResponse.fromJson(Map<String, dynamic> json) {
    return AdminPromptRenderResponse(
      rendered: (() {
        final value = json['rendered']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptRenderResponse.rendered is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'rendered': rendered,
    };
  }
}

class AdminPromptVersionCreateRequest {
  final String content;
  final dynamic examplesJson;
  final Map<String, dynamic>? modelConstraints;
  final Map<String, dynamic>? outputSchema;
  final Map<String, dynamic>? safetyPolicy;
  final String title;
  final Map<String, dynamic>? variableSchema;
  final String versionNo;

  AdminPromptVersionCreateRequest({
    required this.content,
    this.examplesJson,
    this.modelConstraints,
    this.outputSchema,
    this.safetyPolicy,
    required this.title,
    this.variableSchema,
    required this.versionNo
  });

  factory AdminPromptVersionCreateRequest.fromJson(Map<String, dynamic> json) {
    return AdminPromptVersionCreateRequest(
      content: (() {
        final value = json['content']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptVersionCreateRequest.content is required');
        }
        return value;
      })(),
      examplesJson: (() {
        final list = _sdkworkAsList(json['examplesJson']);
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
      modelConstraints: (() {
        final map = _sdkworkAsMap(json['modelConstraints']);
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
      outputSchema: (() {
        final map = _sdkworkAsMap(json['outputSchema']);
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
      safetyPolicy: (() {
        final map = _sdkworkAsMap(json['safetyPolicy']);
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
      title: (() {
        final value = json['title']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptVersionCreateRequest.title is required');
        }
        return value;
      })(),
      variableSchema: (() {
        final map = _sdkworkAsMap(json['variableSchema']);
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
      versionNo: (() {
        final value = json['versionNo']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptVersionCreateRequest.versionNo is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'content': content,
      'examplesJson': examplesJson?.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
      'modelConstraints': modelConstraints?.map((key, item) => MapEntry(key, item)),
      'outputSchema': outputSchema?.map((key, item) => MapEntry(key, item)),
      'safetyPolicy': safetyPolicy?.map((key, item) => MapEntry(key, item)),
      'title': title,
      'variableSchema': variableSchema?.map((key, item) => MapEntry(key, item)),
      'versionNo': versionNo,
    };
  }
}

class AdminPromptVersionItem {
  final String checksumHash;
  final String content;
  final String createdAt;
  final String createdBy;
  final List<Map<String, dynamic>> examplesJson;
  final String id;
  final String lifecycleStatus;
  final Map<String, dynamic> modelConstraints;
  final String organizationId;
  final Map<String, dynamic> outputSchema;
  final String promptId;
  final String? publishedAt;
  final String? reviewComment;
  final String reviewStatus;
  final Map<String, dynamic> safetyPolicy;
  final String tenantId;
  final String title;
  final String updatedAt;
  final String uuid;
  final Map<String, dynamic> variableSchema;
  final String versionNo;

  AdminPromptVersionItem({
    required this.checksumHash,
    required this.content,
    required this.createdAt,
    required this.createdBy,
    required this.examplesJson,
    required this.id,
    required this.lifecycleStatus,
    required this.modelConstraints,
    required this.organizationId,
    required this.outputSchema,
    required this.promptId,
    this.publishedAt,
    this.reviewComment,
    required this.reviewStatus,
    required this.safetyPolicy,
    required this.tenantId,
    required this.title,
    required this.updatedAt,
    required this.uuid,
    required this.variableSchema,
    required this.versionNo
  });

  factory AdminPromptVersionItem.fromJson(Map<String, dynamic> json) {
    return AdminPromptVersionItem(
      checksumHash: (() {
        final value = json['checksumHash']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptVersionItem.checksumHash is required');
        }
        return value;
      })(),
      content: (() {
        final value = json['content']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptVersionItem.content is required');
        }
        return value;
      })(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptVersionItem.createdAt is required');
        }
        return value;
      })(),
      createdBy: (() {
        final value = json['createdBy']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptVersionItem.createdBy is required');
        }
        return value;
      })(),
      examplesJson: (() {
        final list = _sdkworkAsList(json['examplesJson']);
        if (list == null) {
          throw FormatException('AdminPromptVersionItem.examplesJson is required');
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
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptVersionItem.id is required');
        }
        return value;
      })(),
      lifecycleStatus: (() {
        final value = json['lifecycleStatus']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptVersionItem.lifecycleStatus is required');
        }
        return value;
      })(),
      modelConstraints: (() {
        final map = _sdkworkAsMap(json['modelConstraints']);
        if (map == null) {
          throw FormatException('AdminPromptVersionItem.modelConstraints is required');
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
      organizationId: (() {
        final value = json['organizationId']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptVersionItem.organizationId is required');
        }
        return value;
      })(),
      outputSchema: (() {
        final map = _sdkworkAsMap(json['outputSchema']);
        if (map == null) {
          throw FormatException('AdminPromptVersionItem.outputSchema is required');
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
      promptId: (() {
        final value = json['promptId']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptVersionItem.promptId is required');
        }
        return value;
      })(),
      publishedAt: json['publishedAt']?.toString(),
      reviewComment: json['reviewComment']?.toString(),
      reviewStatus: (() {
        final value = json['reviewStatus']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptVersionItem.reviewStatus is required');
        }
        return value;
      })(),
      safetyPolicy: (() {
        final map = _sdkworkAsMap(json['safetyPolicy']);
        if (map == null) {
          throw FormatException('AdminPromptVersionItem.safetyPolicy is required');
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
      tenantId: (() {
        final value = json['tenantId']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptVersionItem.tenantId is required');
        }
        return value;
      })(),
      title: (() {
        final value = json['title']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptVersionItem.title is required');
        }
        return value;
      })(),
      updatedAt: (() {
        final value = json['updatedAt']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptVersionItem.updatedAt is required');
        }
        return value;
      })(),
      uuid: (() {
        final value = json['uuid']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptVersionItem.uuid is required');
        }
        return value;
      })(),
      variableSchema: (() {
        final map = _sdkworkAsMap(json['variableSchema']);
        if (map == null) {
          throw FormatException('AdminPromptVersionItem.variableSchema is required');
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
      versionNo: (() {
        final value = json['versionNo']?.toString();
        if (value == null) {
          throw FormatException('AdminPromptVersionItem.versionNo is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'checksumHash': checksumHash,
      'content': content,
      'createdAt': createdAt,
      'createdBy': createdBy,
      'examplesJson': examplesJson.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
      'id': id,
      'lifecycleStatus': lifecycleStatus,
      'modelConstraints': modelConstraints.map((key, item) => MapEntry(key, item)),
      'organizationId': organizationId,
      'outputSchema': outputSchema.map((key, item) => MapEntry(key, item)),
      'promptId': promptId,
      'publishedAt': publishedAt,
      'reviewComment': reviewComment,
      'reviewStatus': reviewStatus,
      'safetyPolicy': safetyPolicy.map((key, item) => MapEntry(key, item)),
      'tenantId': tenantId,
      'title': title,
      'updatedAt': updatedAt,
      'uuid': uuid,
      'variableSchema': variableSchema.map((key, item) => MapEntry(key, item)),
      'versionNo': versionNo,
    };
  }
}

class AdminPromptVersionListResponse {
  final List<AdminPromptVersionItem> items;

  AdminPromptVersionListResponse({
    required this.items
  });

  factory AdminPromptVersionListResponse.fromJson(Map<String, dynamic> json) {
    return AdminPromptVersionListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminPromptVersionListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminPromptVersionItem.fromJson(map);
      })())
            .whereType<AdminPromptVersionItem>()
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

class AdminPromptVersionMutationResponse {
  final AdminPromptVersionItem item;

  AdminPromptVersionMutationResponse({
    required this.item
  });

  factory AdminPromptVersionMutationResponse.fromJson(Map<String, dynamic> json) {
    return AdminPromptVersionMutationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('AdminPromptVersionMutationResponse.item is required');
        }
        return AdminPromptVersionItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class AdminProviderSecretCreateRequest {
  final String? authType;
  final String name;
  final String providerCode;
  final String secretRef;
  final String? status;

  AdminProviderSecretCreateRequest({
    this.authType,
    required this.name,
    required this.providerCode,
    required this.secretRef,
    this.status
  });

  factory AdminProviderSecretCreateRequest.fromJson(Map<String, dynamic> json) {
    return AdminProviderSecretCreateRequest(
      authType: json['authType']?.toString(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AdminProviderSecretCreateRequest.name is required');
        }
        return value;
      })(),
      providerCode: (() {
        final value = json['providerCode']?.toString();
        if (value == null) {
          throw FormatException('AdminProviderSecretCreateRequest.providerCode is required');
        }
        return value;
      })(),
      secretRef: (() {
        final value = json['secretRef']?.toString();
        if (value == null) {
          throw FormatException('AdminProviderSecretCreateRequest.secretRef is required');
        }
        return value;
      })(),
      status: json['status']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'authType': authType,
      'name': name,
      'providerCode': providerCode,
      'secretRef': secretRef,
      'status': status,
    };
  }
}

class AdminProviderSecretItem {
  final String accountCode;
  final String authType;
  final String createdAt;
  final String id;
  final String maskedLabel;
  final String name;
  final String providerCode;
  final String secretRef;
  final String status;
  final String updatedAt;

  AdminProviderSecretItem({
    required this.accountCode,
    required this.authType,
    required this.createdAt,
    required this.id,
    required this.maskedLabel,
    required this.name,
    required this.providerCode,
    required this.secretRef,
    required this.status,
    required this.updatedAt
  });

  factory AdminProviderSecretItem.fromJson(Map<String, dynamic> json) {
    return AdminProviderSecretItem(
      accountCode: (() {
        final value = json['accountCode']?.toString();
        if (value == null) {
          throw FormatException('AdminProviderSecretItem.accountCode is required');
        }
        return value;
      })(),
      authType: (() {
        final value = json['authType']?.toString();
        if (value == null) {
          throw FormatException('AdminProviderSecretItem.authType is required');
        }
        return value;
      })(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('AdminProviderSecretItem.createdAt is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminProviderSecretItem.id is required');
        }
        return value;
      })(),
      maskedLabel: (() {
        final value = json['maskedLabel']?.toString();
        if (value == null) {
          throw FormatException('AdminProviderSecretItem.maskedLabel is required');
        }
        return value;
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AdminProviderSecretItem.name is required');
        }
        return value;
      })(),
      providerCode: (() {
        final value = json['providerCode']?.toString();
        if (value == null) {
          throw FormatException('AdminProviderSecretItem.providerCode is required');
        }
        return value;
      })(),
      secretRef: (() {
        final value = json['secretRef']?.toString();
        if (value == null) {
          throw FormatException('AdminProviderSecretItem.secretRef is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminProviderSecretItem.status is required');
        }
        return value;
      })(),
      updatedAt: (() {
        final value = json['updatedAt']?.toString();
        if (value == null) {
          throw FormatException('AdminProviderSecretItem.updatedAt is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'accountCode': accountCode,
      'authType': authType,
      'createdAt': createdAt,
      'id': id,
      'maskedLabel': maskedLabel,
      'name': name,
      'providerCode': providerCode,
      'secretRef': secretRef,
      'status': status,
      'updatedAt': updatedAt,
    };
  }
}

class AdminProviderSecretMutationResponse {
  final AdminProviderSecretItem item;

  AdminProviderSecretMutationResponse({
    required this.item
  });

  factory AdminProviderSecretMutationResponse.fromJson(Map<String, dynamic> json) {
    return AdminProviderSecretMutationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('AdminProviderSecretMutationResponse.item is required');
        }
        return AdminProviderSecretItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class AdminProviderSecretUpdateRequest {
  final String? authType;
  final String id;
  final String? name;
  final String? providerCode;
  final String? secretRef;
  final String? status;

  AdminProviderSecretUpdateRequest({
    this.authType,
    required this.id,
    this.name,
    this.providerCode,
    this.secretRef,
    this.status
  });

  factory AdminProviderSecretUpdateRequest.fromJson(Map<String, dynamic> json) {
    return AdminProviderSecretUpdateRequest(
      authType: json['authType']?.toString(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminProviderSecretUpdateRequest.id is required');
        }
        return value;
      })(),
      name: json['name']?.toString(),
      providerCode: json['providerCode']?.toString(),
      secretRef: json['secretRef']?.toString(),
      status: json['status']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'authType': authType,
      'id': id,
      'name': name,
      'providerCode': providerCode,
      'secretRef': secretRef,
      'status': status,
    };
  }
}

class AdminProviderSecretsResponse {
  final List<AdminProviderSecretItem> items;

  AdminProviderSecretsResponse({
    required this.items
  });

  factory AdminProviderSecretsResponse.fromJson(Map<String, dynamic> json) {
    return AdminProviderSecretsResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminProviderSecretsResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminProviderSecretItem.fromJson(map);
      })())
            .whereType<AdminProviderSecretItem>()
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

class AdminRateLimitItem {
  final String? blockDuration;
  final int? burst;
  final String? channelGroup;
  final String? channelGroupId;
  final String? channelGroupName;
  final String id;
  final String? keyPrefix;
  final String? model;
  final int? rpd;
  final int? rpm;
  final int? rps;
  final String? ruleName;
  final String? status;
  final String? targetIp;
  final int? tpm;
  final String? user;

  AdminRateLimitItem({
    this.blockDuration,
    this.burst,
    this.channelGroup,
    this.channelGroupId,
    this.channelGroupName,
    required this.id,
    this.keyPrefix,
    this.model,
    this.rpd,
    this.rpm,
    this.rps,
    this.ruleName,
    this.status,
    this.targetIp,
    this.tpm,
    this.user
  });

  factory AdminRateLimitItem.fromJson(Map<String, dynamic> json) {
    return AdminRateLimitItem(
      blockDuration: json['blockDuration']?.toString(),
      burst: json['burst'] is int ? json['burst'] : null,
      channelGroup: json['channelGroup']?.toString(),
      channelGroupId: json['channelGroupId']?.toString(),
      channelGroupName: json['channelGroupName']?.toString(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminRateLimitItem.id is required');
        }
        return value;
      })(),
      keyPrefix: json['keyPrefix']?.toString(),
      model: json['model']?.toString(),
      rpd: json['rpd'] is int ? json['rpd'] : null,
      rpm: json['rpm'] is int ? json['rpm'] : null,
      rps: json['rps'] is int ? json['rps'] : null,
      ruleName: json['ruleName']?.toString(),
      status: json['status']?.toString(),
      targetIp: json['targetIp']?.toString(),
      tpm: json['tpm'] is int ? json['tpm'] : null,
      user: json['user']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'blockDuration': blockDuration,
      'burst': burst,
      'channelGroup': channelGroup,
      'channelGroupId': channelGroupId,
      'channelGroupName': channelGroupName,
      'id': id,
      'keyPrefix': keyPrefix,
      'model': model,
      'rpd': rpd,
      'rpm': rpm,
      'rps': rps,
      'ruleName': ruleName,
      'status': status,
      'targetIp': targetIp,
      'tpm': tpm,
      'user': user,
    };
  }
}

class AdminRateLimitMutationResponse {
  final AdminRateLimitItem item;

  AdminRateLimitMutationResponse({
    required this.item
  });

  factory AdminRateLimitMutationResponse.fromJson(Map<String, dynamic> json) {
    return AdminRateLimitMutationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('AdminRateLimitMutationResponse.item is required');
        }
        return AdminRateLimitItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class AdminRecordLogItem {
  final String baseInputPrice;
  final String baseOutputPrice;
  final String cacheReadPrice;
  final String cacheReadTokens;
  final String cost;
  final String errorCode;
  final String errorMessage;
  final String errorType;
  final String group;
  final String httpMethod;
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
  final String user;
  final String userAgent;

  AdminRecordLogItem({
    required this.baseInputPrice,
    required this.baseOutputPrice,
    required this.cacheReadPrice,
    required this.cacheReadTokens,
    required this.cost,
    required this.errorCode,
    required this.errorMessage,
    required this.errorType,
    required this.group,
    required this.httpMethod,
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
    required this.user,
    required this.userAgent
  });

  factory AdminRecordLogItem.fromJson(Map<String, dynamic> json) {
    return AdminRecordLogItem(
      baseInputPrice: (() {
        final value = json['baseInputPrice']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.baseInputPrice is required');
        }
        return value;
      })(),
      baseOutputPrice: (() {
        final value = json['baseOutputPrice']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.baseOutputPrice is required');
        }
        return value;
      })(),
      cacheReadPrice: (() {
        final value = json['cacheReadPrice']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.cacheReadPrice is required');
        }
        return value;
      })(),
      cacheReadTokens: (() {
        final value = json['cacheReadTokens']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.cacheReadTokens is required');
        }
        return value;
      })(),
      cost: (() {
        final value = json['cost']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.cost is required');
        }
        return value;
      })(),
      errorCode: (() {
        final value = json['errorCode']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.errorCode is required');
        }
        return value;
      })(),
      errorMessage: (() {
        final value = json['errorMessage']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.errorMessage is required');
        }
        return value;
      })(),
      errorType: (() {
        final value = json['errorType']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.errorType is required');
        }
        return value;
      })(),
      group: (() {
        final value = json['group']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.group is required');
        }
        return value;
      })(),
      httpMethod: (() {
        final value = json['httpMethod']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.httpMethod is required');
        }
        return value;
      })(),
      httpStatus: (() {
        final value = json['httpStatus']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.httpStatus is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.id is required');
        }
        return value;
      })(),
      inputTokens: (() {
        final value = json['inputTokens']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.inputTokens is required');
        }
        return value;
      })(),
      ip: (() {
        final value = json['ip']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.ip is required');
        }
        return value;
      })(),
      isStream: (() {
        final value = json['isStream'];
        if (value is! bool) {
          throw FormatException('AdminRecordLogItem.isStream is required');
        }
        return value;
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.model is required');
        }
        return value;
      })(),
      multiplier: (() {
        final value = json['multiplier']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.multiplier is required');
        }
        return value;
      })(),
      outputTokens: (() {
        final value = json['outputTokens']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.outputTokens is required');
        }
        return value;
      })(),
      path: (() {
        final value = json['path']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.path is required');
        }
        return value;
      })(),
      providerNativeModel: (() {
        final value = json['providerNativeModel']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.providerNativeModel is required');
        }
        return value;
      })(),
      reasoningEffort: (() {
        final value = json['reasoningEffort']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.reasoningEffort is required');
        }
        return value;
      })(),
      regionCode: (() {
        final value = json['regionCode']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.regionCode is required');
        }
        return value;
      })(),
      requestId: (() {
        final value = json['requestId']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.requestId is required');
        }
        return value;
      })(),
      requestedModelCatalogKey: (() {
        final value = json['requestedModelCatalogKey']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.requestedModelCatalogKey is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.status is required');
        }
        return value;
      })(),
      time: (() {
        final value = json['time']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.time is required');
        }
        return value;
      })(),
      tokenName: (() {
        final value = json['tokenName']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.tokenName is required');
        }
        return value;
      })(),
      totalTime: (() {
        final value = json['totalTime']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.totalTime is required');
        }
        return value;
      })(),
      ttft: (() {
        final value = json['ttft']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.ttft is required');
        }
        return value;
      })(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.type is required');
        }
        return value;
      })(),
      user: (() {
        final value = json['user']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.user is required');
        }
        return value;
      })(),
      userAgent: (() {
        final value = json['userAgent']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogItem.userAgent is required');
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
      'httpMethod': httpMethod,
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
      'user': user,
      'userAgent': userAgent,
    };
  }
}

class AdminRecordLogsResponse {
  final List<AdminRecordLogItem> logs;
  final String page;
  final String pageSize;
  final String total;

  AdminRecordLogsResponse({
    required this.logs,
    required this.page,
    required this.pageSize,
    required this.total
  });

  factory AdminRecordLogsResponse.fromJson(Map<String, dynamic> json) {
    return AdminRecordLogsResponse(
      logs: (() {
        final list = _sdkworkAsList(json['logs']);
        if (list == null) {
          throw FormatException('AdminRecordLogsResponse.logs is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminRecordLogItem.fromJson(map);
      })())
            .whereType<AdminRecordLogItem>()
            .toList();
      })(),
      page: (() {
        final value = json['page']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogsResponse.page is required');
        }
        return value;
      })(),
      pageSize: (() {
        final value = json['pageSize']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogsResponse.pageSize is required');
        }
        return value;
      })(),
      total: (() {
        final value = json['total']?.toString();
        if (value == null) {
          throw FormatException('AdminRecordLogsResponse.total is required');
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

class AdminReferralStatItem {
  final String bonusAwarded;
  final String id;
  final String inviter;
  final String link;
  final String totalInvited;
  final String totalRevenue;

  AdminReferralStatItem({
    required this.bonusAwarded,
    required this.id,
    required this.inviter,
    required this.link,
    required this.totalInvited,
    required this.totalRevenue
  });

  factory AdminReferralStatItem.fromJson(Map<String, dynamic> json) {
    return AdminReferralStatItem(
      bonusAwarded: (() {
        final value = json['bonus_awarded']?.toString();
        if (value == null) {
          throw FormatException('AdminReferralStatItem.bonus_awarded is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminReferralStatItem.id is required');
        }
        return value;
      })(),
      inviter: (() {
        final value = json['inviter']?.toString();
        if (value == null) {
          throw FormatException('AdminReferralStatItem.inviter is required');
        }
        return value;
      })(),
      link: (() {
        final value = json['link']?.toString();
        if (value == null) {
          throw FormatException('AdminReferralStatItem.link is required');
        }
        return value;
      })(),
      totalInvited: (() {
        final value = json['total_invited']?.toString();
        if (value == null) {
          throw FormatException('AdminReferralStatItem.total_invited is required');
        }
        return value;
      })(),
      totalRevenue: (() {
        final value = json['total_revenue']?.toString();
        if (value == null) {
          throw FormatException('AdminReferralStatItem.total_revenue is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bonus_awarded': bonusAwarded,
      'id': id,
      'inviter': inviter,
      'link': link,
      'total_invited': totalInvited,
      'total_revenue': totalRevenue,
    };
  }
}

class AdminReferralStatsResponse {
  final List<AdminReferralStatItem> items;

  AdminReferralStatsResponse({
    required this.items
  });

  factory AdminReferralStatsResponse.fromJson(Map<String, dynamic> json) {
    return AdminReferralStatsResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminReferralStatsResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminReferralStatItem.fromJson(map);
      })())
            .whereType<AdminReferralStatItem>()
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

class AdminRuntimeRegionSettingsResponse {
  final String currentRegionCode;
  final String currentRegionName;
  final String remark;

  AdminRuntimeRegionSettingsResponse({
    required this.currentRegionCode,
    required this.currentRegionName,
    required this.remark
  });

  factory AdminRuntimeRegionSettingsResponse.fromJson(Map<String, dynamic> json) {
    return AdminRuntimeRegionSettingsResponse(
      currentRegionCode: (() {
        final value = json['currentRegionCode']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRegionSettingsResponse.currentRegionCode is required');
        }
        return value;
      })(),
      currentRegionName: (() {
        final value = json['currentRegionName']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRegionSettingsResponse.currentRegionName is required');
        }
        return value;
      })(),
      remark: (() {
        final value = json['remark']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRegionSettingsResponse.remark is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'currentRegionCode': currentRegionCode,
      'currentRegionName': currentRegionName,
      'remark': remark,
    };
  }
}

class AdminRuntimeRegionSettingsUpdateRequest {
  final String? currentRegionCode;
  final String? currentRegionName;
  final String? remark;

  AdminRuntimeRegionSettingsUpdateRequest({
    this.currentRegionCode,
    this.currentRegionName,
    this.remark
  });

  factory AdminRuntimeRegionSettingsUpdateRequest.fromJson(Map<String, dynamic> json) {
    return AdminRuntimeRegionSettingsUpdateRequest(
      currentRegionCode: json['currentRegionCode']?.toString(),
      currentRegionName: json['currentRegionName']?.toString(),
      remark: json['remark']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'currentRegionCode': currentRegionCode,
      'currentRegionName': currentRegionName,
      'remark': remark,
    };
  }
}

class AdminRuntimeRouteExplainCandidate {
  final String apiCode;
  final String catalogKey;
  final String channelGroupCode;
  final String channelGroupId;
  final String channelId;
  final String credentialId;
  final String credentialRotation;
  final String kind;
  final String policyId;
  final String pricingPlanCode;
  final String providerCode;
  final String providerModel;
  final String regionCode;
  final String requestedModel;
  final String ruleId;
  final int timeoutMs;

  AdminRuntimeRouteExplainCandidate({
    required this.apiCode,
    required this.catalogKey,
    required this.channelGroupCode,
    required this.channelGroupId,
    required this.channelId,
    required this.credentialId,
    required this.credentialRotation,
    required this.kind,
    required this.policyId,
    required this.pricingPlanCode,
    required this.providerCode,
    required this.providerModel,
    required this.regionCode,
    required this.requestedModel,
    required this.ruleId,
    required this.timeoutMs
  });

  factory AdminRuntimeRouteExplainCandidate.fromJson(Map<String, dynamic> json) {
    return AdminRuntimeRouteExplainCandidate(
      apiCode: (() {
        final value = json['apiCode']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainCandidate.apiCode is required');
        }
        return value;
      })(),
      catalogKey: (() {
        final value = json['catalogKey']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainCandidate.catalogKey is required');
        }
        return value;
      })(),
      channelGroupCode: (() {
        final value = json['channelGroupCode']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainCandidate.channelGroupCode is required');
        }
        return value;
      })(),
      channelGroupId: (() {
        final value = json['channelGroupId']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainCandidate.channelGroupId is required');
        }
        return value;
      })(),
      channelId: (() {
        final value = json['channelId']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainCandidate.channelId is required');
        }
        return value;
      })(),
      credentialId: (() {
        final value = json['credentialId']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainCandidate.credentialId is required');
        }
        return value;
      })(),
      credentialRotation: (() {
        final value = json['credentialRotation']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainCandidate.credentialRotation is required');
        }
        return value;
      })(),
      kind: (() {
        final value = json['kind']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainCandidate.kind is required');
        }
        return value;
      })(),
      policyId: (() {
        final value = json['policyId']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainCandidate.policyId is required');
        }
        return value;
      })(),
      pricingPlanCode: (() {
        final value = json['pricingPlanCode']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainCandidate.pricingPlanCode is required');
        }
        return value;
      })(),
      providerCode: (() {
        final value = json['providerCode']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainCandidate.providerCode is required');
        }
        return value;
      })(),
      providerModel: (() {
        final value = json['providerModel']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainCandidate.providerModel is required');
        }
        return value;
      })(),
      regionCode: (() {
        final value = json['regionCode']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainCandidate.regionCode is required');
        }
        return value;
      })(),
      requestedModel: (() {
        final value = json['requestedModel']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainCandidate.requestedModel is required');
        }
        return value;
      })(),
      ruleId: (() {
        final value = json['ruleId']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainCandidate.ruleId is required');
        }
        return value;
      })(),
      timeoutMs: (() {
        final value = json['timeoutMs'];
        if (value is! int) {
          throw FormatException('AdminRuntimeRouteExplainCandidate.timeoutMs is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'apiCode': apiCode,
      'catalogKey': catalogKey,
      'channelGroupCode': channelGroupCode,
      'channelGroupId': channelGroupId,
      'channelId': channelId,
      'credentialId': credentialId,
      'credentialRotation': credentialRotation,
      'kind': kind,
      'policyId': policyId,
      'pricingPlanCode': pricingPlanCode,
      'providerCode': providerCode,
      'providerModel': providerModel,
      'regionCode': regionCode,
      'requestedModel': requestedModel,
      'ruleId': ruleId,
      'timeoutMs': timeoutMs,
    };
  }
}

class AdminRuntimeRouteExplainIssue {
  final String code;
  final String message;
  final String severity;

  AdminRuntimeRouteExplainIssue({
    required this.code,
    required this.message,
    required this.severity
  });

  factory AdminRuntimeRouteExplainIssue.fromJson(Map<String, dynamic> json) {
    return AdminRuntimeRouteExplainIssue(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainIssue.code is required');
        }
        return value;
      })(),
      message: (() {
        final value = json['message']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainIssue.message is required');
        }
        return value;
      })(),
      severity: (() {
        final value = json['severity']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainIssue.severity is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'message': message,
      'severity': severity,
    };
  }
}

class AdminRuntimeRouteExplainRequest {
  final String? apiCode;
  final String apiKeyId;
  final String? billingMeter;
  final String? capability;
  final String? catalogKey;
  final String? channelGroupId;
  final String? model;
  final String? resourceCode;
  final String? routeKey;

  AdminRuntimeRouteExplainRequest({
    this.apiCode,
    required this.apiKeyId,
    this.billingMeter,
    this.capability,
    this.catalogKey,
    this.channelGroupId,
    this.model,
    this.resourceCode,
    this.routeKey
  });

  factory AdminRuntimeRouteExplainRequest.fromJson(Map<String, dynamic> json) {
    return AdminRuntimeRouteExplainRequest(
      apiCode: json['apiCode']?.toString(),
      apiKeyId: (() {
        final value = json['apiKeyId']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainRequest.apiKeyId is required');
        }
        return value;
      })(),
      billingMeter: json['billingMeter']?.toString(),
      capability: json['capability']?.toString(),
      catalogKey: json['catalogKey']?.toString(),
      channelGroupId: json['channelGroupId']?.toString(),
      model: json['model']?.toString(),
      resourceCode: json['resourceCode']?.toString(),
      routeKey: json['routeKey']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'apiCode': apiCode,
      'apiKeyId': apiKeyId,
      'billingMeter': billingMeter,
      'capability': capability,
      'catalogKey': catalogKey,
      'channelGroupId': channelGroupId,
      'model': model,
      'resourceCode': resourceCode,
      'routeKey': routeKey,
    };
  }
}

class AdminRuntimeRouteExplainResponse {
  final String apiCode;
  final String apiKeyId;
  final String billingMeter;
  final List<AdminRuntimeRouteExplainIssue> blockedReasons;
  final int candidateCount;
  final String capability;
  final String catalogKey;
  final String channelGroupId;
  final String groupCode;
  final String model;
  final String policyId;
  final String policySnapshotVersion;
  final String pricingPlanCode;
  final bool ready;
  final String resourceCode;
  final String ruleId;
  final List<AdminRuntimeRouteExplainCandidate> selectedCandidates;
  final String source;
  final List<AdminRuntimeRouteExplainIssue> warnings;

  AdminRuntimeRouteExplainResponse({
    required this.apiCode,
    required this.apiKeyId,
    required this.billingMeter,
    required this.blockedReasons,
    required this.candidateCount,
    required this.capability,
    required this.catalogKey,
    required this.channelGroupId,
    required this.groupCode,
    required this.model,
    required this.policyId,
    required this.policySnapshotVersion,
    required this.pricingPlanCode,
    required this.ready,
    required this.resourceCode,
    required this.ruleId,
    required this.selectedCandidates,
    required this.source,
    required this.warnings
  });

  factory AdminRuntimeRouteExplainResponse.fromJson(Map<String, dynamic> json) {
    return AdminRuntimeRouteExplainResponse(
      apiCode: (() {
        final value = json['apiCode']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainResponse.apiCode is required');
        }
        return value;
      })(),
      apiKeyId: (() {
        final value = json['apiKeyId']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainResponse.apiKeyId is required');
        }
        return value;
      })(),
      billingMeter: (() {
        final value = json['billingMeter']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainResponse.billingMeter is required');
        }
        return value;
      })(),
      blockedReasons: (() {
        final list = _sdkworkAsList(json['blockedReasons']);
        if (list == null) {
          throw FormatException('AdminRuntimeRouteExplainResponse.blockedReasons is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminRuntimeRouteExplainIssue.fromJson(map);
      })())
            .whereType<AdminRuntimeRouteExplainIssue>()
            .toList();
      })(),
      candidateCount: (() {
        final value = json['candidateCount'];
        if (value is! int) {
          throw FormatException('AdminRuntimeRouteExplainResponse.candidateCount is required');
        }
        return value;
      })(),
      capability: (() {
        final value = json['capability']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainResponse.capability is required');
        }
        return value;
      })(),
      catalogKey: (() {
        final value = json['catalogKey']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainResponse.catalogKey is required');
        }
        return value;
      })(),
      channelGroupId: (() {
        final value = json['channelGroupId']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainResponse.channelGroupId is required');
        }
        return value;
      })(),
      groupCode: (() {
        final value = json['groupCode']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainResponse.groupCode is required');
        }
        return value;
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainResponse.model is required');
        }
        return value;
      })(),
      policyId: (() {
        final value = json['policyId']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainResponse.policyId is required');
        }
        return value;
      })(),
      policySnapshotVersion: (() {
        final value = json['policySnapshotVersion']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainResponse.policySnapshotVersion is required');
        }
        return value;
      })(),
      pricingPlanCode: (() {
        final value = json['pricingPlanCode']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainResponse.pricingPlanCode is required');
        }
        return value;
      })(),
      ready: (() {
        final value = json['ready'];
        if (value is! bool) {
          throw FormatException('AdminRuntimeRouteExplainResponse.ready is required');
        }
        return value;
      })(),
      resourceCode: (() {
        final value = json['resourceCode']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainResponse.resourceCode is required');
        }
        return value;
      })(),
      ruleId: (() {
        final value = json['ruleId']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainResponse.ruleId is required');
        }
        return value;
      })(),
      selectedCandidates: (() {
        final list = _sdkworkAsList(json['selectedCandidates']);
        if (list == null) {
          throw FormatException('AdminRuntimeRouteExplainResponse.selectedCandidates is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminRuntimeRouteExplainCandidate.fromJson(map);
      })())
            .whereType<AdminRuntimeRouteExplainCandidate>()
            .toList();
      })(),
      source: (() {
        final value = json['source']?.toString();
        if (value == null) {
          throw FormatException('AdminRuntimeRouteExplainResponse.source is required');
        }
        return value;
      })(),
      warnings: (() {
        final list = _sdkworkAsList(json['warnings']);
        if (list == null) {
          throw FormatException('AdminRuntimeRouteExplainResponse.warnings is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminRuntimeRouteExplainIssue.fromJson(map);
      })())
            .whereType<AdminRuntimeRouteExplainIssue>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'apiCode': apiCode,
      'apiKeyId': apiKeyId,
      'billingMeter': billingMeter,
      'blockedReasons': blockedReasons.map((item) => item.toJson()).toList(),
      'candidateCount': candidateCount,
      'capability': capability,
      'catalogKey': catalogKey,
      'channelGroupId': channelGroupId,
      'groupCode': groupCode,
      'model': model,
      'policyId': policyId,
      'policySnapshotVersion': policySnapshotVersion,
      'pricingPlanCode': pricingPlanCode,
      'ready': ready,
      'resourceCode': resourceCode,
      'ruleId': ruleId,
      'selectedCandidates': selectedCandidates.map((item) => item.toJson()).toList(),
      'source': source,
      'warnings': warnings.map((item) => item.toJson()).toList(),
    };
  }
}

class AdminServiceNodeCreateRequest {
  final String domain;
  final String ip;
  final String name;
  final String? remark;
  final String? status;

  AdminServiceNodeCreateRequest({
    required this.domain,
    required this.ip,
    required this.name,
    this.remark,
    this.status
  });

  factory AdminServiceNodeCreateRequest.fromJson(Map<String, dynamic> json) {
    return AdminServiceNodeCreateRequest(
      domain: (() {
        final value = json['domain']?.toString();
        if (value == null) {
          throw FormatException('AdminServiceNodeCreateRequest.domain is required');
        }
        return value;
      })(),
      ip: (() {
        final value = json['ip']?.toString();
        if (value == null) {
          throw FormatException('AdminServiceNodeCreateRequest.ip is required');
        }
        return value;
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AdminServiceNodeCreateRequest.name is required');
        }
        return value;
      })(),
      remark: json['remark']?.toString(),
      status: json['status']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'domain': domain,
      'ip': ip,
      'name': name,
      'remark': remark,
      'status': status,
    };
  }
}

class AdminServiceNodeDeleteResponse {
  final bool deleted;

  AdminServiceNodeDeleteResponse({
    required this.deleted
  });

  factory AdminServiceNodeDeleteResponse.fromJson(Map<String, dynamic> json) {
    return AdminServiceNodeDeleteResponse(
      deleted: (() {
        final value = json['deleted'];
        if (value is! bool) {
          throw FormatException('AdminServiceNodeDeleteResponse.deleted is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'deleted': deleted,
    };
  }
}

class AdminServiceNodeItem {
  final String domain;
  final String healthStatus;
  final String id;
  final String ip;
  final String name;
  final String remark;
  final String status;
  final String updatedAt;

  AdminServiceNodeItem({
    required this.domain,
    required this.healthStatus,
    required this.id,
    required this.ip,
    required this.name,
    required this.remark,
    required this.status,
    required this.updatedAt
  });

  factory AdminServiceNodeItem.fromJson(Map<String, dynamic> json) {
    return AdminServiceNodeItem(
      domain: (() {
        final value = json['domain']?.toString();
        if (value == null) {
          throw FormatException('AdminServiceNodeItem.domain is required');
        }
        return value;
      })(),
      healthStatus: (() {
        final value = json['healthStatus']?.toString();
        if (value == null) {
          throw FormatException('AdminServiceNodeItem.healthStatus is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminServiceNodeItem.id is required');
        }
        return value;
      })(),
      ip: (() {
        final value = json['ip']?.toString();
        if (value == null) {
          throw FormatException('AdminServiceNodeItem.ip is required');
        }
        return value;
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AdminServiceNodeItem.name is required');
        }
        return value;
      })(),
      remark: (() {
        final value = json['remark']?.toString();
        if (value == null) {
          throw FormatException('AdminServiceNodeItem.remark is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminServiceNodeItem.status is required');
        }
        return value;
      })(),
      updatedAt: (() {
        final value = json['updatedAt']?.toString();
        if (value == null) {
          throw FormatException('AdminServiceNodeItem.updatedAt is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'domain': domain,
      'healthStatus': healthStatus,
      'id': id,
      'ip': ip,
      'name': name,
      'remark': remark,
      'status': status,
      'updatedAt': updatedAt,
    };
  }
}

class AdminServiceNodeMutationResponse {
  final AdminServiceNodeItem item;

  AdminServiceNodeMutationResponse({
    required this.item
  });

  factory AdminServiceNodeMutationResponse.fromJson(Map<String, dynamic> json) {
    return AdminServiceNodeMutationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('AdminServiceNodeMutationResponse.item is required');
        }
        return AdminServiceNodeItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class AdminServiceNodeStatusUpdateRequest {
  final String status;

  AdminServiceNodeStatusUpdateRequest({
    required this.status
  });

  factory AdminServiceNodeStatusUpdateRequest.fromJson(Map<String, dynamic> json) {
    return AdminServiceNodeStatusUpdateRequest(
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminServiceNodeStatusUpdateRequest.status is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'status': status,
    };
  }
}

class AdminServiceNodeUpdateRequest {
  final String? domain;
  final String? ip;
  final String? name;
  final String? remark;

  AdminServiceNodeUpdateRequest({
    this.domain,
    this.ip,
    this.name,
    this.remark
  });

  factory AdminServiceNodeUpdateRequest.fromJson(Map<String, dynamic> json) {
    return AdminServiceNodeUpdateRequest(
      domain: json['domain']?.toString(),
      ip: json['ip']?.toString(),
      name: json['name']?.toString(),
      remark: json['remark']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'domain': domain,
      'ip': ip,
      'name': name,
      'remark': remark,
    };
  }
}

class AdminServiceNodesResponse {
  final List<AdminServiceNodeItem> items;

  AdminServiceNodesResponse({
    required this.items
  });

  factory AdminServiceNodesResponse.fromJson(Map<String, dynamic> json) {
    return AdminServiceNodesResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminServiceNodesResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminServiceNodeItem.fromJson(map);
      })())
            .whereType<AdminServiceNodeItem>()
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

class AdminSiteActionRequest {


  AdminSiteActionRequest();

  factory AdminSiteActionRequest.fromJson(Map<String, dynamic> json) {
    return AdminSiteActionRequest();
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{};
  }
}

class AdminSiteChannelItem {
  final String channelCode;
  final String channelName;
  final String healthStatus;
  final String id;
  final String? providerCode;
  final String? siteChannelRole;
  final String? siteCode;
  final String? siteServiceCode;
  final String status;

  AdminSiteChannelItem({
    required this.channelCode,
    required this.channelName,
    required this.healthStatus,
    required this.id,
    this.providerCode,
    this.siteChannelRole,
    this.siteCode,
    this.siteServiceCode,
    required this.status
  });

  factory AdminSiteChannelItem.fromJson(Map<String, dynamic> json) {
    return AdminSiteChannelItem(
      channelCode: (() {
        final value = json['channelCode']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteChannelItem.channelCode is required');
        }
        return value;
      })(),
      channelName: (() {
        final value = json['channelName']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteChannelItem.channelName is required');
        }
        return value;
      })(),
      healthStatus: (() {
        final value = json['healthStatus']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteChannelItem.healthStatus is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteChannelItem.id is required');
        }
        return value;
      })(),
      providerCode: json['providerCode']?.toString(),
      siteChannelRole: json['siteChannelRole']?.toString(),
      siteCode: json['siteCode']?.toString(),
      siteServiceCode: json['siteServiceCode']?.toString(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteChannelItem.status is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'channelCode': channelCode,
      'channelName': channelName,
      'healthStatus': healthStatus,
      'id': id,
      'providerCode': providerCode,
      'siteChannelRole': siteChannelRole,
      'siteCode': siteCode,
      'siteServiceCode': siteServiceCode,
      'status': status,
    };
  }
}

class AdminSiteChannelsResponse {
  final List<AdminSiteChannelItem> items;

  AdminSiteChannelsResponse({
    required this.items
  });

  factory AdminSiteChannelsResponse.fromJson(Map<String, dynamic> json) {
    return AdminSiteChannelsResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminSiteChannelsResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminSiteChannelItem.fromJson(map);
      })())
            .whereType<AdminSiteChannelItem>()
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

class AdminSiteConnectionCheckResponse {
  final String checkedAt;
  final String healthStatus;
  final String? latencyMs;
  final String? message;
  final String siteId;
  final String status;

  AdminSiteConnectionCheckResponse({
    required this.checkedAt,
    required this.healthStatus,
    this.latencyMs,
    this.message,
    required this.siteId,
    required this.status
  });

  factory AdminSiteConnectionCheckResponse.fromJson(Map<String, dynamic> json) {
    return AdminSiteConnectionCheckResponse(
      checkedAt: (() {
        final value = json['checkedAt']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteConnectionCheckResponse.checkedAt is required');
        }
        return value;
      })(),
      healthStatus: (() {
        final value = json['healthStatus']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteConnectionCheckResponse.healthStatus is required');
        }
        return value;
      })(),
      latencyMs: json['latencyMs']?.toString(),
      message: json['message']?.toString(),
      siteId: (() {
        final value = json['siteId']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteConnectionCheckResponse.siteId is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteConnectionCheckResponse.status is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'checkedAt': checkedAt,
      'healthStatus': healthStatus,
      'latencyMs': latencyMs,
      'message': message,
      'siteId': siteId,
      'status': status,
    };
  }
}

class AdminSiteCreateRequest {
  final String baseUrl;
  final String? credentialRef;
  final String? description;
  final String displayName;
  final String? docsUrl;
  final List<String>? domains;
  final String? environment;
  final MediaResource? logo;
  final String? maskedLabel;
  final String? ownerKind;
  final String? regionCode;
  final String? siteCode;
  final String siteName;
  final String? siteType;
  final String? status;
  final List<String>? vendorCodes;
  final String? websiteUrl;

  AdminSiteCreateRequest({
    required this.baseUrl,
    this.credentialRef,
    this.description,
    required this.displayName,
    this.docsUrl,
    this.domains,
    this.environment,
    this.logo,
    this.maskedLabel,
    this.ownerKind,
    this.regionCode,
    this.siteCode,
    required this.siteName,
    this.siteType,
    this.status,
    this.vendorCodes,
    this.websiteUrl
  });

  factory AdminSiteCreateRequest.fromJson(Map<String, dynamic> json) {
    return AdminSiteCreateRequest(
      baseUrl: (() {
        final value = json['baseUrl']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteCreateRequest.baseUrl is required');
        }
        return value;
      })(),
      credentialRef: json['credentialRef']?.toString(),
      description: json['description']?.toString(),
      displayName: (() {
        final value = json['displayName']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteCreateRequest.displayName is required');
        }
        return value;
      })(),
      docsUrl: json['docsUrl']?.toString(),
      domains: (() {
        final list = _sdkworkAsList(json['domains']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      environment: json['environment']?.toString(),
      logo: (() {
        final map = _sdkworkAsMap(json['logo']);
        return map == null ? null : MediaResource.fromJson(map);
      })(),
      maskedLabel: json['maskedLabel']?.toString(),
      ownerKind: json['ownerKind']?.toString(),
      regionCode: json['regionCode']?.toString(),
      siteCode: json['siteCode']?.toString(),
      siteName: (() {
        final value = json['siteName']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteCreateRequest.siteName is required');
        }
        return value;
      })(),
      siteType: json['siteType']?.toString(),
      status: json['status']?.toString(),
      vendorCodes: (() {
        final list = _sdkworkAsList(json['vendorCodes']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      websiteUrl: json['websiteUrl']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'baseUrl': baseUrl,
      'credentialRef': credentialRef,
      'description': description,
      'displayName': displayName,
      'docsUrl': docsUrl,
      'domains': domains?.map((item) => item).toList(),
      'environment': environment,
      'logo': logo?.toJson(),
      'maskedLabel': maskedLabel,
      'ownerKind': ownerKind,
      'regionCode': regionCode,
      'siteCode': siteCode,
      'siteName': siteName,
      'siteType': siteType,
      'status': status,
      'vendorCodes': vendorCodes?.map((item) => item).toList(),
      'websiteUrl': websiteUrl,
    };
  }
}

class AdminSiteDeleteResponse {
  final bool deleted;

  AdminSiteDeleteResponse({
    required this.deleted
  });

  factory AdminSiteDeleteResponse.fromJson(Map<String, dynamic> json) {
    return AdminSiteDeleteResponse(
      deleted: (() {
        final value = json['deleted'];
        if (value is! bool) {
          throw FormatException('AdminSiteDeleteResponse.deleted is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'deleted': deleted,
    };
  }
}

class AdminSiteItem {
  final String baseUrl;
  final String? consecutiveErrorCount;
  final String? description;
  final String displayName;
  final String? docsUrl;
  final List<String>? domains;
  final String environment;
  final String healthStatus;
  final String id;
  final String? lastCheckedAt;
  final String? lastLatencyMs;
  final String? lastSyncAt;
  final MediaResource? logo;
  final String? ownerKind;
  final String? regionCode;
  final String siteCode;
  final String siteName;
  final String siteType;
  final String? sortOrder;
  final String status;
  final List<String>? vendorCodes;
  final String? websiteUrl;

  AdminSiteItem({
    required this.baseUrl,
    this.consecutiveErrorCount,
    this.description,
    required this.displayName,
    this.docsUrl,
    this.domains,
    required this.environment,
    required this.healthStatus,
    required this.id,
    this.lastCheckedAt,
    this.lastLatencyMs,
    this.lastSyncAt,
    this.logo,
    this.ownerKind,
    this.regionCode,
    required this.siteCode,
    required this.siteName,
    required this.siteType,
    this.sortOrder,
    required this.status,
    this.vendorCodes,
    this.websiteUrl
  });

  factory AdminSiteItem.fromJson(Map<String, dynamic> json) {
    return AdminSiteItem(
      baseUrl: (() {
        final value = json['baseUrl']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteItem.baseUrl is required');
        }
        return value;
      })(),
      consecutiveErrorCount: json['consecutiveErrorCount']?.toString(),
      description: json['description']?.toString(),
      displayName: (() {
        final value = json['displayName']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteItem.displayName is required');
        }
        return value;
      })(),
      docsUrl: json['docsUrl']?.toString(),
      domains: (() {
        final list = _sdkworkAsList(json['domains']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      environment: (() {
        final value = json['environment']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteItem.environment is required');
        }
        return value;
      })(),
      healthStatus: (() {
        final value = json['healthStatus']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteItem.healthStatus is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteItem.id is required');
        }
        return value;
      })(),
      lastCheckedAt: json['lastCheckedAt']?.toString(),
      lastLatencyMs: json['lastLatencyMs']?.toString(),
      lastSyncAt: json['lastSyncAt']?.toString(),
      logo: (() {
        final map = _sdkworkAsMap(json['logo']);
        return map == null ? null : MediaResource.fromJson(map);
      })(),
      ownerKind: json['ownerKind']?.toString(),
      regionCode: json['regionCode']?.toString(),
      siteCode: (() {
        final value = json['siteCode']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteItem.siteCode is required');
        }
        return value;
      })(),
      siteName: (() {
        final value = json['siteName']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteItem.siteName is required');
        }
        return value;
      })(),
      siteType: (() {
        final value = json['siteType']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteItem.siteType is required');
        }
        return value;
      })(),
      sortOrder: json['sortOrder']?.toString(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteItem.status is required');
        }
        return value;
      })(),
      vendorCodes: (() {
        final list = _sdkworkAsList(json['vendorCodes']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      websiteUrl: json['websiteUrl']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'baseUrl': baseUrl,
      'consecutiveErrorCount': consecutiveErrorCount,
      'description': description,
      'displayName': displayName,
      'docsUrl': docsUrl,
      'domains': domains?.map((item) => item).toList(),
      'environment': environment,
      'healthStatus': healthStatus,
      'id': id,
      'lastCheckedAt': lastCheckedAt,
      'lastLatencyMs': lastLatencyMs,
      'lastSyncAt': lastSyncAt,
      'logo': logo?.toJson(),
      'ownerKind': ownerKind,
      'regionCode': regionCode,
      'siteCode': siteCode,
      'siteName': siteName,
      'siteType': siteType,
      'sortOrder': sortOrder,
      'status': status,
      'vendorCodes': vendorCodes?.map((item) => item).toList(),
      'websiteUrl': websiteUrl,
    };
  }
}

class AdminSiteMutationResponse {
  final AdminSiteItem item;

  AdminSiteMutationResponse({
    required this.item
  });

  factory AdminSiteMutationResponse.fromJson(Map<String, dynamic> json) {
    return AdminSiteMutationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('AdminSiteMutationResponse.item is required');
        }
        return AdminSiteItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class AdminSiteSettingsResponse {
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

  AdminSiteSettingsResponse({
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

  factory AdminSiteSettingsResponse.fromJson(Map<String, dynamic> json) {
    return AdminSiteSettingsResponse(
      accentColor: (() {
        final value = json['accentColor']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteSettingsResponse.accentColor is required');
        }
        return value;
      })(),
      brandColor: (() {
        final value = json['brandColor']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteSettingsResponse.brandColor is required');
        }
        return value;
      })(),
      customCss: (() {
        final value = json['customCss']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteSettingsResponse.customCss is required');
        }
        return value;
      })(),
      description: (() {
        final value = json['description']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteSettingsResponse.description is required');
        }
        return value;
      })(),
      docsUrl: (() {
        final value = json['docsUrl']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteSettingsResponse.docsUrl is required');
        }
        return value;
      })(),
      favicon: (() {
        final map = _sdkworkAsMap(json['favicon']);
        if (map == null) {
          throw FormatException('AdminSiteSettingsResponse.favicon is required');
        }
        return MediaResource.fromJson(map);
      })(),
      footerCopyright: (() {
        final value = json['footerCopyright']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteSettingsResponse.footerCopyright is required');
        }
        return value;
      })(),
      icon: (() {
        final map = _sdkworkAsMap(json['icon']);
        if (map == null) {
          throw FormatException('AdminSiteSettingsResponse.icon is required');
        }
        return MediaResource.fromJson(map);
      })(),
      icpRecordNumber: (() {
        final value = json['icpRecordNumber']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteSettingsResponse.icpRecordNumber is required');
        }
        return value;
      })(),
      icpRecordUrl: (() {
        final value = json['icpRecordUrl']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteSettingsResponse.icpRecordUrl is required');
        }
        return value;
      })(),
      logo: (() {
        final map = _sdkworkAsMap(json['logo']);
        if (map == null) {
          throw FormatException('AdminSiteSettingsResponse.logo is required');
        }
        return MediaResource.fromJson(map);
      })(),
      policeRecordNumber: (() {
        final value = json['policeRecordNumber']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteSettingsResponse.policeRecordNumber is required');
        }
        return value;
      })(),
      policeRecordUrl: (() {
        final value = json['policeRecordUrl']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteSettingsResponse.policeRecordUrl is required');
        }
        return value;
      })(),
      privacyUrl: (() {
        final value = json['privacyUrl']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteSettingsResponse.privacyUrl is required');
        }
        return value;
      })(),
      seoDescription: (() {
        final value = json['seoDescription']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteSettingsResponse.seoDescription is required');
        }
        return value;
      })(),
      seoTitle: (() {
        final value = json['seoTitle']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteSettingsResponse.seoTitle is required');
        }
        return value;
      })(),
      shortName: (() {
        final value = json['shortName']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteSettingsResponse.shortName is required');
        }
        return value;
      })(),
      siteName: (() {
        final value = json['siteName']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteSettingsResponse.siteName is required');
        }
        return value;
      })(),
      supportUrl: (() {
        final value = json['supportUrl']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteSettingsResponse.supportUrl is required');
        }
        return value;
      })(),
      termsUrl: (() {
        final value = json['termsUrl']?.toString();
        if (value == null) {
          throw FormatException('AdminSiteSettingsResponse.termsUrl is required');
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

class AdminSiteSettingsUpdateRequest {
  final String? accentColor;
  final String? brandColor;
  final String? customCss;
  final String? description;
  final String? docsUrl;
  final MediaResource? favicon;
  final String? footerCopyright;
  final MediaResource? icon;
  final String? icpRecordNumber;
  final String? icpRecordUrl;
  final MediaResource? logo;
  final String? policeRecordNumber;
  final String? policeRecordUrl;
  final String? privacyUrl;
  final String? seoDescription;
  final String? seoTitle;
  final String? shortName;
  final String? siteName;
  final String? supportUrl;
  final String? termsUrl;

  AdminSiteSettingsUpdateRequest({
    this.accentColor,
    this.brandColor,
    this.customCss,
    this.description,
    this.docsUrl,
    this.favicon,
    this.footerCopyright,
    this.icon,
    this.icpRecordNumber,
    this.icpRecordUrl,
    this.logo,
    this.policeRecordNumber,
    this.policeRecordUrl,
    this.privacyUrl,
    this.seoDescription,
    this.seoTitle,
    this.shortName,
    this.siteName,
    this.supportUrl,
    this.termsUrl
  });

  factory AdminSiteSettingsUpdateRequest.fromJson(Map<String, dynamic> json) {
    return AdminSiteSettingsUpdateRequest(
      accentColor: json['accentColor']?.toString(),
      brandColor: json['brandColor']?.toString(),
      customCss: json['customCss']?.toString(),
      description: json['description']?.toString(),
      docsUrl: json['docsUrl']?.toString(),
      favicon: (() {
        final map = _sdkworkAsMap(json['favicon']);
        return map == null ? null : MediaResource.fromJson(map);
      })(),
      footerCopyright: json['footerCopyright']?.toString(),
      icon: (() {
        final map = _sdkworkAsMap(json['icon']);
        return map == null ? null : MediaResource.fromJson(map);
      })(),
      icpRecordNumber: json['icpRecordNumber']?.toString(),
      icpRecordUrl: json['icpRecordUrl']?.toString(),
      logo: (() {
        final map = _sdkworkAsMap(json['logo']);
        return map == null ? null : MediaResource.fromJson(map);
      })(),
      policeRecordNumber: json['policeRecordNumber']?.toString(),
      policeRecordUrl: json['policeRecordUrl']?.toString(),
      privacyUrl: json['privacyUrl']?.toString(),
      seoDescription: json['seoDescription']?.toString(),
      seoTitle: json['seoTitle']?.toString(),
      shortName: json['shortName']?.toString(),
      siteName: json['siteName']?.toString(),
      supportUrl: json['supportUrl']?.toString(),
      termsUrl: json['termsUrl']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'accentColor': accentColor,
      'brandColor': brandColor,
      'customCss': customCss,
      'description': description,
      'docsUrl': docsUrl,
      'favicon': favicon?.toJson(),
      'footerCopyright': footerCopyright,
      'icon': icon?.toJson(),
      'icpRecordNumber': icpRecordNumber,
      'icpRecordUrl': icpRecordUrl,
      'logo': logo?.toJson(),
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

class AdminSiteUpdateRequest {
  final String? baseUrl;
  final String? credentialRef;
  final String? description;
  final String? displayName;
  final String? docsUrl;
  final List<String>? domains;
  final String? environment;
  final MediaResource? logo;
  final String? maskedLabel;
  final String? ownerKind;
  final String? regionCode;
  final String? siteCode;
  final String? siteName;
  final String? siteType;
  final String? status;
  final List<String>? vendorCodes;
  final String? websiteUrl;

  AdminSiteUpdateRequest({
    this.baseUrl,
    this.credentialRef,
    this.description,
    this.displayName,
    this.docsUrl,
    this.domains,
    this.environment,
    this.logo,
    this.maskedLabel,
    this.ownerKind,
    this.regionCode,
    this.siteCode,
    this.siteName,
    this.siteType,
    this.status,
    this.vendorCodes,
    this.websiteUrl
  });

  factory AdminSiteUpdateRequest.fromJson(Map<String, dynamic> json) {
    return AdminSiteUpdateRequest(
      baseUrl: json['baseUrl']?.toString(),
      credentialRef: json['credentialRef']?.toString(),
      description: json['description']?.toString(),
      displayName: json['displayName']?.toString(),
      docsUrl: json['docsUrl']?.toString(),
      domains: (() {
        final list = _sdkworkAsList(json['domains']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      environment: json['environment']?.toString(),
      logo: (() {
        final map = _sdkworkAsMap(json['logo']);
        return map == null ? null : MediaResource.fromJson(map);
      })(),
      maskedLabel: json['maskedLabel']?.toString(),
      ownerKind: json['ownerKind']?.toString(),
      regionCode: json['regionCode']?.toString(),
      siteCode: json['siteCode']?.toString(),
      siteName: json['siteName']?.toString(),
      siteType: json['siteType']?.toString(),
      status: json['status']?.toString(),
      vendorCodes: (() {
        final list = _sdkworkAsList(json['vendorCodes']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      websiteUrl: json['websiteUrl']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'baseUrl': baseUrl,
      'credentialRef': credentialRef,
      'description': description,
      'displayName': displayName,
      'docsUrl': docsUrl,
      'domains': domains?.map((item) => item).toList(),
      'environment': environment,
      'logo': logo?.toJson(),
      'maskedLabel': maskedLabel,
      'ownerKind': ownerKind,
      'regionCode': regionCode,
      'siteCode': siteCode,
      'siteName': siteName,
      'siteType': siteType,
      'status': status,
      'vendorCodes': vendorCodes?.map((item) => item).toList(),
      'websiteUrl': websiteUrl,
    };
  }
}

class AdminSitesResponse {
  final List<AdminSiteItem> items;

  AdminSitesResponse({
    required this.items
  });

  factory AdminSitesResponse.fromJson(Map<String, dynamic> json) {
    return AdminSitesResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminSitesResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminSiteItem.fromJson(map);
      })())
            .whereType<AdminSiteItem>()
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

class AdminTokenLimitCreateRequest {
  final int burst;
  final String keyPrefix;
  final int rpd;
  final int rps;
  final String? status;
  final String user;

  AdminTokenLimitCreateRequest({
    required this.burst,
    required this.keyPrefix,
    required this.rpd,
    required this.rps,
    this.status,
    required this.user
  });

  factory AdminTokenLimitCreateRequest.fromJson(Map<String, dynamic> json) {
    return AdminTokenLimitCreateRequest(
      burst: (() {
        final value = json['burst'];
        if (value is! int) {
          throw FormatException('AdminTokenLimitCreateRequest.burst is required');
        }
        return value;
      })(),
      keyPrefix: (() {
        final value = json['keyPrefix']?.toString();
        if (value == null) {
          throw FormatException('AdminTokenLimitCreateRequest.keyPrefix is required');
        }
        return value;
      })(),
      rpd: (() {
        final value = json['rpd'];
        if (value is! int) {
          throw FormatException('AdminTokenLimitCreateRequest.rpd is required');
        }
        return value;
      })(),
      rps: (() {
        final value = json['rps'];
        if (value is! int) {
          throw FormatException('AdminTokenLimitCreateRequest.rps is required');
        }
        return value;
      })(),
      status: json['status']?.toString(),
      user: (() {
        final value = json['user']?.toString();
        if (value == null) {
          throw FormatException('AdminTokenLimitCreateRequest.user is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'burst': burst,
      'keyPrefix': keyPrefix,
      'rpd': rpd,
      'rps': rps,
      'status': status,
      'user': user,
    };
  }
}

class AdminTokenLimitsResponse {
  final List<AdminRateLimitItem> items;

  AdminTokenLimitsResponse({
    required this.items
  });

  factory AdminTokenLimitsResponse.fromJson(Map<String, dynamic> json) {
    return AdminTokenLimitsResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AdminTokenLimitsResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AdminRateLimitItem.fromJson(map);
      })())
            .whereType<AdminRateLimitItem>()
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

class AdminUsagePair {
  final double today;
  final double total;

  AdminUsagePair({
    required this.today,
    required this.total
  });

  factory AdminUsagePair.fromJson(Map<String, dynamic> json) {
    return AdminUsagePair(
      today: (() {
        final value = json['today'];
        if (value is! num) {
          throw FormatException('AdminUsagePair.today is required');
        }
        return value.toDouble();
      })(),
      total: (() {
        final value = json['total'];
        if (value is! num) {
          throw FormatException('AdminUsagePair.total is required');
        }
        return value.toDouble();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'today': today,
      'total': total,
    };
  }
}

class AiResourceGroupsCreateResult {
  final String code;
  final AdminAiResourceGroupMutationResponse? data;
  final String? msg;

  AiResourceGroupsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory AiResourceGroupsCreateResult.fromJson(Map<String, dynamic> json) {
    return AiResourceGroupsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('AiResourceGroupsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminAiResourceGroupMutationResponse.fromJson(map);
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

class AiResourceGroupsDeleteResult {
  final String code;
  final AdminAiResourceGroupDeleteResponse? data;
  final String? msg;

  AiResourceGroupsDeleteResult({
    required this.code,
    this.data,
    this.msg
  });

  factory AiResourceGroupsDeleteResult.fromJson(Map<String, dynamic> json) {
    return AiResourceGroupsDeleteResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('AiResourceGroupsDeleteResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminAiResourceGroupDeleteResponse.fromJson(map);
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

class AiResourceGroupsListResult {
  final String code;
  final AdminAiResourceGroupsResponse? data;
  final String? msg;

  AiResourceGroupsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory AiResourceGroupsListResult.fromJson(Map<String, dynamic> json) {
    return AiResourceGroupsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('AiResourceGroupsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminAiResourceGroupsResponse.fromJson(map);
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

class AiResourceGroupsResourcesListResult {
  final String code;
  final AdminAiResourceGroupResourcesResponse? data;
  final String? msg;

  AiResourceGroupsResourcesListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory AiResourceGroupsResourcesListResult.fromJson(Map<String, dynamic> json) {
    return AiResourceGroupsResourcesListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('AiResourceGroupsResourcesListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminAiResourceGroupResourcesResponse.fromJson(map);
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

class AiResourceGroupsUpdateResult {
  final String code;
  final AdminAiResourceGroupMutationResponse? data;
  final String? msg;

  AiResourceGroupsUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory AiResourceGroupsUpdateResult.fromJson(Map<String, dynamic> json) {
    return AiResourceGroupsUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('AiResourceGroupsUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminAiResourceGroupMutationResponse.fromJson(map);
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

class AiResourcesCreateResult {
  final String code;
  final AdminAiResourceMutationResponse? data;
  final String? msg;

  AiResourcesCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory AiResourcesCreateResult.fromJson(Map<String, dynamic> json) {
    return AiResourcesCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('AiResourcesCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminAiResourceMutationResponse.fromJson(map);
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

class AiResourcesListResult {
  final String code;
  final AdminAiResourcesResponse? data;
  final String? msg;

  AiResourcesListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory AiResourcesListResult.fromJson(Map<String, dynamic> json) {
    return AiResourcesListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('AiResourcesListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminAiResourcesResponse.fromJson(map);
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

class AiResourcesUpdateResult {
  final String code;
  final AdminAiResourceMutationResponse? data;
  final String? msg;

  AiResourcesUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory AiResourcesUpdateResult.fromJson(Map<String, dynamic> json) {
    return AiResourcesUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('AiResourcesUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminAiResourceMutationResponse.fromJson(map);
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

class AnalyticsAdminOverviewRetrieveResult {
  final String code;
  final AdminAnalyticsOverviewResponse? data;
  final String? msg;

  AnalyticsAdminOverviewRetrieveResult({
    required this.code,
    this.data,
    this.msg
  });

  factory AnalyticsAdminOverviewRetrieveResult.fromJson(Map<String, dynamic> json) {
    return AnalyticsAdminOverviewRetrieveResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('AnalyticsAdminOverviewRetrieveResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminAnalyticsOverviewResponse.fromJson(map);
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

class AnnouncementsCreateResult {
  final String code;
  final AdminAnnouncementMutationResponse? data;
  final String? msg;

  AnnouncementsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory AnnouncementsCreateResult.fromJson(Map<String, dynamic> json) {
    return AnnouncementsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('AnnouncementsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminAnnouncementMutationResponse.fromJson(map);
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

class AnnouncementsDeleteResult {
  final String code;
  final AdminDeleteResponse? data;
  final String? msg;

  AnnouncementsDeleteResult({
    required this.code,
    this.data,
    this.msg
  });

  factory AnnouncementsDeleteResult.fromJson(Map<String, dynamic> json) {
    return AnnouncementsDeleteResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('AnnouncementsDeleteResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminDeleteResponse.fromJson(map);
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

class AnnouncementsListResult {
  final String code;
  final AdminAnnouncementsResponse? data;
  final String? msg;

  AnnouncementsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory AnnouncementsListResult.fromJson(Map<String, dynamic> json) {
    return AnnouncementsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('AnnouncementsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminAnnouncementsResponse.fromJson(map);
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

class AnnouncementsUpdateResult {
  final String code;
  final AdminAnnouncementMutationResponse? data;
  final String? msg;

  AnnouncementsUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory AnnouncementsUpdateResult.fromJson(Map<String, dynamic> json) {
    return AnnouncementsUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('AnnouncementsUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminAnnouncementMutationResponse.fromJson(map);
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

class ApiKeysCreateResult {
  final String code;
  final AdminApiKeyCreateResponse? data;
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
        return map == null ? null : AdminApiKeyCreateResponse.fromJson(map);
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
  final AdminDeleteResponse? data;
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
        return map == null ? null : AdminDeleteResponse.fromJson(map);
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

class AuditEventsListResult {
  final String code;
  final ServiceProviderCollectionResponse? data;
  final String? msg;

  AuditEventsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory AuditEventsListResult.fromJson(Map<String, dynamic> json) {
    return AuditEventsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('AuditEventsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ServiceProviderCollectionResponse.fromJson(map);
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

class AuthSettingsRetrieveResult {
  final String code;
  final AdminAuthSettingsResponse? data;
  final String? msg;

  AuthSettingsRetrieveResult({
    required this.code,
    this.data,
    this.msg
  });

  factory AuthSettingsRetrieveResult.fromJson(Map<String, dynamic> json) {
    return AuthSettingsRetrieveResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('AuthSettingsRetrieveResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminAuthSettingsResponse.fromJson(map);
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

class AuthSettingsUpdateResult {
  final String code;
  final AdminAuthSettingsResponse? data;
  final String? msg;

  AuthSettingsUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory AuthSettingsUpdateResult.fromJson(Map<String, dynamic> json) {
    return AuthSettingsUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('AuthSettingsUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminAuthSettingsResponse.fromJson(map);
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

class BindingsListResult {
  final String code;
  final ServiceProviderCollectionResponse? data;
  final String? msg;

  BindingsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory BindingsListResult.fromJson(Map<String, dynamic> json) {
    return BindingsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('BindingsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ServiceProviderCollectionResponse.fromJson(map);
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

class CacheInstancesDeleteResult {
  final String code;
  final AdminCacheOperationResponse? data;
  final String? msg;

  CacheInstancesDeleteResult({
    required this.code,
    this.data,
    this.msg
  });

  factory CacheInstancesDeleteResult.fromJson(Map<String, dynamic> json) {
    return CacheInstancesDeleteResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('CacheInstancesDeleteResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminCacheOperationResponse.fromJson(map);
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

class CacheInstancesRefreshCreateResult {
  final String code;
  final AdminCacheOperationResponse? data;
  final String? msg;

  CacheInstancesRefreshCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory CacheInstancesRefreshCreateResult.fromJson(Map<String, dynamic> json) {
    return CacheInstancesRefreshCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('CacheInstancesRefreshCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminCacheOperationResponse.fromJson(map);
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

class CacheNamespacesDeleteResult {
  final String code;
  final AdminCacheOperationResponse? data;
  final String? msg;

  CacheNamespacesDeleteResult({
    required this.code,
    this.data,
    this.msg
  });

  factory CacheNamespacesDeleteResult.fromJson(Map<String, dynamic> json) {
    return CacheNamespacesDeleteResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('CacheNamespacesDeleteResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminCacheOperationResponse.fromJson(map);
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

class CacheNamespacesKeysDeleteResult {
  final String code;
  final AdminCacheOperationResponse? data;
  final String? msg;

  CacheNamespacesKeysDeleteResult({
    required this.code,
    this.data,
    this.msg
  });

  factory CacheNamespacesKeysDeleteResult.fromJson(Map<String, dynamic> json) {
    return CacheNamespacesKeysDeleteResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('CacheNamespacesKeysDeleteResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminCacheOperationResponse.fromJson(map);
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

class CacheNamespacesKeysListResult {
  final String code;
  final AdminCacheKeyListResponse? data;
  final String? msg;

  CacheNamespacesKeysListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory CacheNamespacesKeysListResult.fromJson(Map<String, dynamic> json) {
    return CacheNamespacesKeysListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('CacheNamespacesKeysListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminCacheKeyListResponse.fromJson(map);
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

class CacheNamespacesRefreshCreateResult {
  final String code;
  final AdminCacheOperationResponse? data;
  final String? msg;

  CacheNamespacesRefreshCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory CacheNamespacesRefreshCreateResult.fromJson(Map<String, dynamic> json) {
    return CacheNamespacesRefreshCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('CacheNamespacesRefreshCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminCacheOperationResponse.fromJson(map);
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

class CacheOverviewRetrieveResult {
  final String code;
  final AdminCacheOverviewResponse? data;
  final String? msg;

  CacheOverviewRetrieveResult({
    required this.code,
    this.data,
    this.msg
  });

  factory CacheOverviewRetrieveResult.fromJson(Map<String, dynamic> json) {
    return CacheOverviewRetrieveResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('CacheOverviewRetrieveResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminCacheOverviewResponse.fromJson(map);
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

class CacheRefreshCreateResult {
  final String code;
  final AdminCacheOperationResponse? data;
  final String? msg;

  CacheRefreshCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory CacheRefreshCreateResult.fromJson(Map<String, dynamic> json) {
    return CacheRefreshCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('CacheRefreshCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminCacheOperationResponse.fromJson(map);
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

class ChannelGroupsChannelBindingsListResult {
  final String code;
  final AdminChannelGroupChannelBindingsResponse? data;
  final String? msg;

  ChannelGroupsChannelBindingsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ChannelGroupsChannelBindingsListResult.fromJson(Map<String, dynamic> json) {
    return ChannelGroupsChannelBindingsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ChannelGroupsChannelBindingsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminChannelGroupChannelBindingsResponse.fromJson(map);
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

class ChannelGroupsChannelBindingsUpdateResult {
  final String code;
  final AdminChannelGroupChannelBindingsResponse? data;
  final String? msg;

  ChannelGroupsChannelBindingsUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ChannelGroupsChannelBindingsUpdateResult.fromJson(Map<String, dynamic> json) {
    return ChannelGroupsChannelBindingsUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ChannelGroupsChannelBindingsUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminChannelGroupChannelBindingsResponse.fromJson(map);
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

class ChannelGroupsCreateResult {
  final String code;
  final AdminChannelGroupMutationResponse? data;
  final String? msg;

  ChannelGroupsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ChannelGroupsCreateResult.fromJson(Map<String, dynamic> json) {
    return ChannelGroupsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ChannelGroupsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminChannelGroupMutationResponse.fromJson(map);
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

class ChannelGroupsDeleteResult {
  final String code;
  final AdminDeleteResponse? data;
  final String? msg;

  ChannelGroupsDeleteResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ChannelGroupsDeleteResult.fromJson(Map<String, dynamic> json) {
    return ChannelGroupsDeleteResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ChannelGroupsDeleteResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminDeleteResponse.fromJson(map);
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
  final AdminChannelGroupsResponse? data;
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
        return map == null ? null : AdminChannelGroupsResponse.fromJson(map);
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

class ChannelGroupsRouteExplainRetrieveResult {
  final String code;
  final AdminChannelGroupRouteExplainResponse? data;
  final String? msg;

  ChannelGroupsRouteExplainRetrieveResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ChannelGroupsRouteExplainRetrieveResult.fromJson(Map<String, dynamic> json) {
    return ChannelGroupsRouteExplainRetrieveResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ChannelGroupsRouteExplainRetrieveResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminChannelGroupRouteExplainResponse.fromJson(map);
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

class ChannelGroupsUpdateResult {
  final String code;
  final AdminChannelGroupMutationResponse? data;
  final String? msg;

  ChannelGroupsUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ChannelGroupsUpdateResult.fromJson(Map<String, dynamic> json) {
    return ChannelGroupsUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ChannelGroupsUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminChannelGroupMutationResponse.fromJson(map);
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

class ChannelsCreateResult {
  final String code;
  final AdminChannelMutationResponse? data;
  final String? msg;

  ChannelsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ChannelsCreateResult.fromJson(Map<String, dynamic> json) {
    return ChannelsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ChannelsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminChannelMutationResponse.fromJson(map);
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

class ChannelsDeleteResult {
  final String code;
  final AdminDeleteResponse? data;
  final String? msg;

  ChannelsDeleteResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ChannelsDeleteResult.fromJson(Map<String, dynamic> json) {
    return ChannelsDeleteResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ChannelsDeleteResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminDeleteResponse.fromJson(map);
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

class ChannelsListResult {
  final String code;
  final AdminChannelsResponse? data;
  final String? msg;

  ChannelsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ChannelsListResult.fromJson(Map<String, dynamic> json) {
    return ChannelsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ChannelsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminChannelsResponse.fromJson(map);
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

class ChannelsUpdateResult {
  final String code;
  final AdminChannelMutationResponse? data;
  final String? msg;

  ChannelsUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ChannelsUpdateResult.fromJson(Map<String, dynamic> json) {
    return ChannelsUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ChannelsUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminChannelMutationResponse.fromJson(map);
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

class ChannelsVerifyResult {
  final String code;
  final AdminChannelTestResponse? data;
  final String? msg;

  ChannelsVerifyResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ChannelsVerifyResult.fromJson(Map<String, dynamic> json) {
    return ChannelsVerifyResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ChannelsVerifyResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminChannelTestResponse.fromJson(map);
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

class ContractsListResult {
  final String code;
  final ServiceProviderCollectionResponse? data;
  final String? msg;

  ContractsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ContractsListResult.fromJson(Map<String, dynamic> json) {
    return ContractsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ContractsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ServiceProviderCollectionResponse.fromJson(map);
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

class CreateStorageBucketRequest {
  final bool? blockPublicAccess;
  final String bucketName;
  final String? bucketRegion;
  final String? dataResidencyRegion;
  final String? defaultEncryptionMode;
  final String? defaultStorageClass;
  final String? encryption;
  final String? kmsKeyRef;
  final bool? lifecycleEnabled;
  final String logicalScope;
  final String? objectKeyPrefix;
  final bool? objectLockEnabled;
  final String providerId;
  final bool? publicAccessBlocked;
  final String? storageClass;
  final bool? versioningEnabled;

  CreateStorageBucketRequest({
    this.blockPublicAccess,
    required this.bucketName,
    this.bucketRegion,
    this.dataResidencyRegion,
    this.defaultEncryptionMode,
    this.defaultStorageClass,
    this.encryption,
    this.kmsKeyRef,
    this.lifecycleEnabled,
    required this.logicalScope,
    this.objectKeyPrefix,
    this.objectLockEnabled,
    required this.providerId,
    this.publicAccessBlocked,
    this.storageClass,
    this.versioningEnabled
  });

  factory CreateStorageBucketRequest.fromJson(Map<String, dynamic> json) {
    return CreateStorageBucketRequest(
      blockPublicAccess: json['blockPublicAccess'] is bool ? json['blockPublicAccess'] : null,
      bucketName: (() {
        final value = json['bucketName']?.toString();
        if (value == null) {
          throw FormatException('CreateStorageBucketRequest.bucketName is required');
        }
        return value;
      })(),
      bucketRegion: json['bucketRegion']?.toString(),
      dataResidencyRegion: json['dataResidencyRegion']?.toString(),
      defaultEncryptionMode: json['defaultEncryptionMode']?.toString(),
      defaultStorageClass: json['defaultStorageClass']?.toString(),
      encryption: json['encryption']?.toString(),
      kmsKeyRef: json['kmsKeyRef']?.toString(),
      lifecycleEnabled: json['lifecycleEnabled'] is bool ? json['lifecycleEnabled'] : null,
      logicalScope: (() {
        final value = json['logicalScope']?.toString();
        if (value == null) {
          throw FormatException('CreateStorageBucketRequest.logicalScope is required');
        }
        return value;
      })(),
      objectKeyPrefix: json['objectKeyPrefix']?.toString(),
      objectLockEnabled: json['objectLockEnabled'] is bool ? json['objectLockEnabled'] : null,
      providerId: (() {
        final value = json['providerId']?.toString();
        if (value == null) {
          throw FormatException('CreateStorageBucketRequest.providerId is required');
        }
        return value;
      })(),
      publicAccessBlocked: json['publicAccessBlocked'] is bool ? json['publicAccessBlocked'] : null,
      storageClass: json['storageClass']?.toString(),
      versioningEnabled: json['versioningEnabled'] is bool ? json['versioningEnabled'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'blockPublicAccess': blockPublicAccess,
      'bucketName': bucketName,
      'bucketRegion': bucketRegion,
      'dataResidencyRegion': dataResidencyRegion,
      'defaultEncryptionMode': defaultEncryptionMode,
      'defaultStorageClass': defaultStorageClass,
      'encryption': encryption,
      'kmsKeyRef': kmsKeyRef,
      'lifecycleEnabled': lifecycleEnabled,
      'logicalScope': logicalScope,
      'objectKeyPrefix': objectKeyPrefix,
      'objectLockEnabled': objectLockEnabled,
      'providerId': providerId,
      'publicAccessBlocked': publicAccessBlocked,
      'storageClass': storageClass,
      'versioningEnabled': versioningEnabled,
    };
  }
}

class CreateStorageGarbageCollectionJobRequest {
  final Map<String, dynamic>? criteria;
  final bool dryRun;
  final String? dryRunSample;
  final String jobType;
  final String? retentionWindow;
  final String? target;

  CreateStorageGarbageCollectionJobRequest({
    this.criteria,
    required this.dryRun,
    this.dryRunSample,
    required this.jobType,
    this.retentionWindow,
    this.target
  });

  factory CreateStorageGarbageCollectionJobRequest.fromJson(Map<String, dynamic> json) {
    return CreateStorageGarbageCollectionJobRequest(
      criteria: (() {
        final map = _sdkworkAsMap(json['criteria']);
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
      dryRun: (() {
        final value = json['dryRun'];
        if (value is! bool) {
          throw FormatException('CreateStorageGarbageCollectionJobRequest.dryRun is required');
        }
        return value;
      })(),
      dryRunSample: json['dryRunSample']?.toString(),
      jobType: (() {
        final value = json['jobType']?.toString();
        if (value == null) {
          throw FormatException('CreateStorageGarbageCollectionJobRequest.jobType is required');
        }
        return value;
      })(),
      retentionWindow: json['retentionWindow']?.toString(),
      target: json['target']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'criteria': criteria?.map((key, item) => MapEntry(key, item)),
      'dryRun': dryRun,
      'dryRunSample': dryRunSample,
      'jobType': jobType,
      'retentionWindow': retentionWindow,
      'target': target,
    };
  }
}

class CreateStorageProviderRequest {
  final String credentialRef;
  final String? endpoint;
  final String? endpointUrl;
  final bool? lifecycle;
  final bool? multipart;
  final bool? objectLock;
  final bool? pathStyleEnabled;
  final String providerCode;
  final String providerType;
  final String? region;
  final bool? supportsLifecycle;
  final bool? supportsMultipart;
  final bool? supportsObjectLock;

  CreateStorageProviderRequest({
    required this.credentialRef,
    this.endpoint,
    this.endpointUrl,
    this.lifecycle,
    this.multipart,
    this.objectLock,
    this.pathStyleEnabled,
    required this.providerCode,
    required this.providerType,
    this.region,
    this.supportsLifecycle,
    this.supportsMultipart,
    this.supportsObjectLock
  });

  factory CreateStorageProviderRequest.fromJson(Map<String, dynamic> json) {
    return CreateStorageProviderRequest(
      credentialRef: (() {
        final value = json['credentialRef']?.toString();
        if (value == null) {
          throw FormatException('CreateStorageProviderRequest.credentialRef is required');
        }
        return value;
      })(),
      endpoint: json['endpoint']?.toString(),
      endpointUrl: json['endpointUrl']?.toString(),
      lifecycle: json['lifecycle'] is bool ? json['lifecycle'] : null,
      multipart: json['multipart'] is bool ? json['multipart'] : null,
      objectLock: json['objectLock'] is bool ? json['objectLock'] : null,
      pathStyleEnabled: json['pathStyleEnabled'] is bool ? json['pathStyleEnabled'] : null,
      providerCode: (() {
        final value = json['providerCode']?.toString();
        if (value == null) {
          throw FormatException('CreateStorageProviderRequest.providerCode is required');
        }
        return value;
      })(),
      providerType: (() {
        final value = json['providerType']?.toString();
        if (value == null) {
          throw FormatException('CreateStorageProviderRequest.providerType is required');
        }
        return value;
      })(),
      region: json['region']?.toString(),
      supportsLifecycle: json['supportsLifecycle'] is bool ? json['supportsLifecycle'] : null,
      supportsMultipart: json['supportsMultipart'] is bool ? json['supportsMultipart'] : null,
      supportsObjectLock: json['supportsObjectLock'] is bool ? json['supportsObjectLock'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'credentialRef': credentialRef,
      'endpoint': endpoint,
      'endpointUrl': endpointUrl,
      'lifecycle': lifecycle,
      'multipart': multipart,
      'objectLock': objectLock,
      'pathStyleEnabled': pathStyleEnabled,
      'providerCode': providerCode,
      'providerType': providerType,
      'region': region,
      'supportsLifecycle': supportsLifecycle,
      'supportsMultipart': supportsMultipart,
      'supportsObjectLock': supportsObjectLock,
    };
  }
}

class CreateStorageQuotaPolicyRequest {
  final String? enforcement;
  final String? quotaLimit;
  final String quotaLimitBytes;
  final String scopeId;
  final String scopeType;
  final String? singleFileLimitBytes;

  CreateStorageQuotaPolicyRequest({
    this.enforcement,
    this.quotaLimit,
    required this.quotaLimitBytes,
    required this.scopeId,
    required this.scopeType,
    this.singleFileLimitBytes
  });

  factory CreateStorageQuotaPolicyRequest.fromJson(Map<String, dynamic> json) {
    return CreateStorageQuotaPolicyRequest(
      enforcement: json['enforcement']?.toString(),
      quotaLimit: json['quotaLimit']?.toString(),
      quotaLimitBytes: (() {
        final value = json['quotaLimitBytes']?.toString();
        if (value == null) {
          throw FormatException('CreateStorageQuotaPolicyRequest.quotaLimitBytes is required');
        }
        return value;
      })(),
      scopeId: (() {
        final value = json['scopeId']?.toString();
        if (value == null) {
          throw FormatException('CreateStorageQuotaPolicyRequest.scopeId is required');
        }
        return value;
      })(),
      scopeType: (() {
        final value = json['scopeType']?.toString();
        if (value == null) {
          throw FormatException('CreateStorageQuotaPolicyRequest.scopeType is required');
        }
        return value;
      })(),
      singleFileLimitBytes: json['singleFileLimitBytes']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'enforcement': enforcement,
      'quotaLimit': quotaLimit,
      'quotaLimitBytes': quotaLimitBytes,
      'scopeId': scopeId,
      'scopeType': scopeType,
      'singleFileLimitBytes': singleFileLimitBytes,
    };
  }
}

class CreateStorageReconciliationRunRequest {
  final String? bucketId;
  final String? checkMode;
  final bool dryRun;
  final String? providerId;
  final String? reason;
  final String runType;

  CreateStorageReconciliationRunRequest({
    this.bucketId,
    this.checkMode,
    required this.dryRun,
    this.providerId,
    this.reason,
    required this.runType
  });

  factory CreateStorageReconciliationRunRequest.fromJson(Map<String, dynamic> json) {
    return CreateStorageReconciliationRunRequest(
      bucketId: json['bucketId']?.toString(),
      checkMode: json['checkMode']?.toString(),
      dryRun: (() {
        final value = json['dryRun'];
        if (value is! bool) {
          throw FormatException('CreateStorageReconciliationRunRequest.dryRun is required');
        }
        return value;
      })(),
      providerId: json['providerId']?.toString(),
      reason: json['reason']?.toString(),
      runType: (() {
        final value = json['runType']?.toString();
        if (value == null) {
          throw FormatException('CreateStorageReconciliationRunRequest.runType is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bucketId': bucketId,
      'checkMode': checkMode,
      'dryRun': dryRun,
      'providerId': providerId,
      'reason': reason,
      'runType': runType,
    };
  }
}

class DashboardAdminOverviewRetrieveResult {
  final String code;
  final AdminDashboardDataResponse? data;
  final String? msg;

  DashboardAdminOverviewRetrieveResult({
    required this.code,
    this.data,
    this.msg
  });

  factory DashboardAdminOverviewRetrieveResult.fromJson(Map<String, dynamic> json) {
    return DashboardAdminOverviewRetrieveResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('DashboardAdminOverviewRetrieveResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminDashboardDataResponse.fromJson(map);
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

class DashboardRetrieveResult {
  final String code;
  final ServiceProviderDashboardResponse? data;
  final String? msg;

  DashboardRetrieveResult({
    required this.code,
    this.data,
    this.msg
  });

  factory DashboardRetrieveResult.fromJson(Map<String, dynamic> json) {
    return DashboardRetrieveResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('DashboardRetrieveResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ServiceProviderDashboardResponse.fromJson(map);
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

class DefinitionBindingsCreateResult {
  final String code;
  final AdminPromptBindingMutationResponse? data;
  final String? msg;

  DefinitionBindingsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory DefinitionBindingsCreateResult.fromJson(Map<String, dynamic> json) {
    return DefinitionBindingsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('DefinitionBindingsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminPromptBindingMutationResponse.fromJson(map);
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

class DefinitionBindingsListResult {
  final String code;
  final AdminPromptBindingListResponse? data;
  final String? msg;

  DefinitionBindingsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory DefinitionBindingsListResult.fromJson(Map<String, dynamic> json) {
    return DefinitionBindingsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('DefinitionBindingsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminPromptBindingListResponse.fromJson(map);
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

class DefinitionBindingsUpdateResult {
  final String code;
  final AdminPromptBindingMutationResponse? data;
  final String? msg;

  DefinitionBindingsUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory DefinitionBindingsUpdateResult.fromJson(Map<String, dynamic> json) {
    return DefinitionBindingsUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('DefinitionBindingsUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminPromptBindingMutationResponse.fromJson(map);
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

class DefinitionsCreateResult {
  final String code;
  final AdminPromptMutationResponse? data;
  final String? msg;

  DefinitionsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory DefinitionsCreateResult.fromJson(Map<String, dynamic> json) {
    return DefinitionsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('DefinitionsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminPromptMutationResponse.fromJson(map);
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

class DefinitionsListResult {
  final String code;
  final AdminPromptListResponse? data;
  final String? msg;

  DefinitionsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory DefinitionsListResult.fromJson(Map<String, dynamic> json) {
    return DefinitionsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('DefinitionsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminPromptListResponse.fromJson(map);
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

class DiagnosticsRouteSimulationCreateResult {
  final String code;
  final MessagingRouteSimulationResponse? data;
  final String? msg;

  DiagnosticsRouteSimulationCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory DiagnosticsRouteSimulationCreateResult.fromJson(Map<String, dynamic> json) {
    return DiagnosticsRouteSimulationCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('DiagnosticsRouteSimulationCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : MessagingRouteSimulationResponse.fromJson(map);
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

class DiagnosticsTestSendsCreateResult {
  final String code;
  final MessagingTestSendResponse? data;
  final String? msg;

  DiagnosticsTestSendsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory DiagnosticsTestSendsCreateResult.fromJson(Map<String, dynamic> json) {
    return DiagnosticsTestSendsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('DiagnosticsTestSendsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : MessagingTestSendResponse.fromJson(map);
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

class DownstreamsCreateResult {
  final String code;
  final ServiceProviderDownstreamMutationResponse? data;
  final String? msg;

  DownstreamsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory DownstreamsCreateResult.fromJson(Map<String, dynamic> json) {
    return DownstreamsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('DownstreamsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ServiceProviderDownstreamMutationResponse.fromJson(map);
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

class DownstreamsListResult {
  final String code;
  final ServiceProviderCollectionResponse? data;
  final String? msg;

  DownstreamsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory DownstreamsListResult.fromJson(Map<String, dynamic> json) {
    return DownstreamsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('DownstreamsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ServiceProviderCollectionResponse.fromJson(map);
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

class FieldError {
  final String? code;
  final String? field;
  final String? message;

  FieldError({
    this.code,
    this.field,
    this.message
  });

  factory FieldError.fromJson(Map<String, dynamic> json) {
    return FieldError(
      code: json['code']?.toString(),
      field: json['field']?.toString(),
      message: json['message']?.toString()
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

class FirewallsRulesCreateResult {
  final String code;
  final AdminFirewallMutationResponse? data;
  final String? msg;

  FirewallsRulesCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory FirewallsRulesCreateResult.fromJson(Map<String, dynamic> json) {
    return FirewallsRulesCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('FirewallsRulesCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminFirewallMutationResponse.fromJson(map);
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

class FirewallsRulesDeleteResult {
  final String code;
  final AdminDeleteResponse? data;
  final String? msg;

  FirewallsRulesDeleteResult({
    required this.code,
    this.data,
    this.msg
  });

  factory FirewallsRulesDeleteResult.fromJson(Map<String, dynamic> json) {
    return FirewallsRulesDeleteResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('FirewallsRulesDeleteResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminDeleteResponse.fromJson(map);
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

class FirewallsRulesListResult {
  final String code;
  final AdminFirewallRulesResponse? data;
  final String? msg;

  FirewallsRulesListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory FirewallsRulesListResult.fromJson(Map<String, dynamic> json) {
    return FirewallsRulesListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('FirewallsRulesListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminFirewallRulesResponse.fromJson(map);
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

class HealthCheckCreateResult {
  final String code;
  final AdminSiteConnectionCheckResponse? data;
  final String? msg;

  HealthCheckCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory HealthCheckCreateResult.fromJson(Map<String, dynamic> json) {
    return HealthCheckCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('HealthCheckCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminSiteConnectionCheckResponse.fromJson(map);
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

class InstallationStatusResponse {
  final String catalogSource;
  final String catalogVersion;
  final bool changed;
  final String environment;
  final bool externalCatalog;
  final String lastCatalogRefreshStatus;
  final String schemaVersion;
  final String seedProfile;
  final String status;

  InstallationStatusResponse({
    required this.catalogSource,
    required this.catalogVersion,
    required this.changed,
    required this.environment,
    required this.externalCatalog,
    required this.lastCatalogRefreshStatus,
    required this.schemaVersion,
    required this.seedProfile,
    required this.status
  });

  factory InstallationStatusResponse.fromJson(Map<String, dynamic> json) {
    return InstallationStatusResponse(
      catalogSource: (() {
        final value = json['catalogSource']?.toString();
        if (value == null) {
          throw FormatException('InstallationStatusResponse.catalogSource is required');
        }
        return value;
      })(),
      catalogVersion: (() {
        final value = json['catalogVersion']?.toString();
        if (value == null) {
          throw FormatException('InstallationStatusResponse.catalogVersion is required');
        }
        return value;
      })(),
      changed: (() {
        final value = json['changed'];
        if (value is! bool) {
          throw FormatException('InstallationStatusResponse.changed is required');
        }
        return value;
      })(),
      environment: (() {
        final value = json['environment']?.toString();
        if (value == null) {
          throw FormatException('InstallationStatusResponse.environment is required');
        }
        return value;
      })(),
      externalCatalog: (() {
        final value = json['externalCatalog'];
        if (value is! bool) {
          throw FormatException('InstallationStatusResponse.externalCatalog is required');
        }
        return value;
      })(),
      lastCatalogRefreshStatus: (() {
        final value = json['lastCatalogRefreshStatus']?.toString();
        if (value == null) {
          throw FormatException('InstallationStatusResponse.lastCatalogRefreshStatus is required');
        }
        return value;
      })(),
      schemaVersion: (() {
        final value = json['schemaVersion']?.toString();
        if (value == null) {
          throw FormatException('InstallationStatusResponse.schemaVersion is required');
        }
        return value;
      })(),
      seedProfile: (() {
        final value = json['seedProfile']?.toString();
        if (value == null) {
          throw FormatException('InstallationStatusResponse.seedProfile is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('InstallationStatusResponse.status is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'catalogSource': catalogSource,
      'catalogVersion': catalogVersion,
      'changed': changed,
      'environment': environment,
      'externalCatalog': externalCatalog,
      'lastCatalogRefreshStatus': lastCatalogRefreshStatus,
      'schemaVersion': schemaVersion,
      'seedProfile': seedProfile,
      'status': status,
    };
  }
}

class InstallationStatusRetrieveResult {
  final String code;
  final InstallationStatusResponse? data;
  final String? msg;

  InstallationStatusRetrieveResult({
    required this.code,
    this.data,
    this.msg
  });

  factory InstallationStatusRetrieveResult.fromJson(Map<String, dynamic> json) {
    return InstallationStatusRetrieveResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('InstallationStatusRetrieveResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : InstallationStatusResponse.fromJson(map);
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

class MarketingReferralStatsListResult {
  final String code;
  final AdminReferralStatsResponse? data;
  final String? msg;

  MarketingReferralStatsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory MarketingReferralStatsListResult.fromJson(Map<String, dynamic> json) {
    return MarketingReferralStatsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('MarketingReferralStatsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminReferralStatsResponse.fromJson(map);
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

class MembersListResult {
  final String code;
  final ServiceProviderCollectionResponse? data;
  final String? msg;

  MembersListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory MembersListResult.fromJson(Map<String, dynamic> json) {
    return MembersListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('MembersListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ServiceProviderCollectionResponse.fromJson(map);
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

class MessagingCollectionResponse {
  final List<Map<String, dynamic>> items;
  final String page;
  final String pageSize;
  final String total;

  MessagingCollectionResponse({
    required this.items,
    required this.page,
    required this.pageSize,
    required this.total
  });

  factory MessagingCollectionResponse.fromJson(Map<String, dynamic> json) {
    return MessagingCollectionResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('MessagingCollectionResponse.items is required');
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
      page: (() {
        final value = json['page']?.toString();
        if (value == null) {
          throw FormatException('MessagingCollectionResponse.page is required');
        }
        return value;
      })(),
      pageSize: (() {
        final value = json['pageSize']?.toString();
        if (value == null) {
          throw FormatException('MessagingCollectionResponse.pageSize is required');
        }
        return value;
      })(),
      total: (() {
        final value = json['total']?.toString();
        if (value == null) {
          throw FormatException('MessagingCollectionResponse.total is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
      'page': page,
      'pageSize': pageSize,
      'total': total,
    };
  }
}

class MessagingMutationResponse {
  final String id;
  final String status;

  MessagingMutationResponse({
    required this.id,
    required this.status
  });

  factory MessagingMutationResponse.fromJson(Map<String, dynamic> json) {
    return MessagingMutationResponse(
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('MessagingMutationResponse.id is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('MessagingMutationResponse.status is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'status': status,
    };
  }
}

class MessagingProviderAccountCreateRequest {
  final String accountCode;
  final String accountName;
  final String? baseUrl;
  final Map<String, dynamic>? capabilitySchema;
  final String channel;
  final Map<String, dynamic> credential;
  final String? deliveryPurpose;
  final String providerCode;

  MessagingProviderAccountCreateRequest({
    required this.accountCode,
    required this.accountName,
    this.baseUrl,
    this.capabilitySchema,
    required this.channel,
    required this.credential,
    this.deliveryPurpose,
    required this.providerCode
  });

  factory MessagingProviderAccountCreateRequest.fromJson(Map<String, dynamic> json) {
    return MessagingProviderAccountCreateRequest(
      accountCode: (() {
        final value = json['accountCode']?.toString();
        if (value == null) {
          throw FormatException('MessagingProviderAccountCreateRequest.accountCode is required');
        }
        return value;
      })(),
      accountName: (() {
        final value = json['accountName']?.toString();
        if (value == null) {
          throw FormatException('MessagingProviderAccountCreateRequest.accountName is required');
        }
        return value;
      })(),
      baseUrl: json['baseUrl']?.toString(),
      capabilitySchema: (() {
        final map = _sdkworkAsMap(json['capabilitySchema']);
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
      channel: (() {
        final value = json['channel']?.toString();
        if (value == null) {
          throw FormatException('MessagingProviderAccountCreateRequest.channel is required');
        }
        return value;
      })(),
      credential: (() {
        final map = _sdkworkAsMap(json['credential']);
        if (map == null) {
          throw FormatException('MessagingProviderAccountCreateRequest.credential is required');
        }
        return map;
      })(),
      deliveryPurpose: json['deliveryPurpose']?.toString(),
      providerCode: (() {
        final value = json['providerCode']?.toString();
        if (value == null) {
          throw FormatException('MessagingProviderAccountCreateRequest.providerCode is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'accountCode': accountCode,
      'accountName': accountName,
      'baseUrl': baseUrl,
      'capabilitySchema': capabilitySchema?.map((key, item) => MapEntry(key, item)),
      'channel': channel,
      'credential': credential,
      'deliveryPurpose': deliveryPurpose,
      'providerCode': providerCode,
    };
  }
}

class MessagingRouteRuleCreateRequest {
  final String channel;
  final String? countryCode;
  final String deliveryPurpose;
  final Map<String, dynamic>? failoverPolicy;
  final String? locale;
  final int? priority;
  final String ruleCode;
  final String sceneCode;
  final List<Map<String, dynamic>> targets;
  final String? userSegment;

  MessagingRouteRuleCreateRequest({
    required this.channel,
    this.countryCode,
    required this.deliveryPurpose,
    this.failoverPolicy,
    this.locale,
    this.priority,
    required this.ruleCode,
    required this.sceneCode,
    required this.targets,
    this.userSegment
  });

  factory MessagingRouteRuleCreateRequest.fromJson(Map<String, dynamic> json) {
    return MessagingRouteRuleCreateRequest(
      channel: (() {
        final value = json['channel']?.toString();
        if (value == null) {
          throw FormatException('MessagingRouteRuleCreateRequest.channel is required');
        }
        return value;
      })(),
      countryCode: json['countryCode']?.toString(),
      deliveryPurpose: (() {
        final value = json['deliveryPurpose']?.toString();
        if (value == null) {
          throw FormatException('MessagingRouteRuleCreateRequest.deliveryPurpose is required');
        }
        return value;
      })(),
      failoverPolicy: (() {
        final map = _sdkworkAsMap(json['failoverPolicy']);
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
      locale: json['locale']?.toString(),
      priority: json['priority'] is int ? json['priority'] : null,
      ruleCode: (() {
        final value = json['ruleCode']?.toString();
        if (value == null) {
          throw FormatException('MessagingRouteRuleCreateRequest.ruleCode is required');
        }
        return value;
      })(),
      sceneCode: (() {
        final value = json['sceneCode']?.toString();
        if (value == null) {
          throw FormatException('MessagingRouteRuleCreateRequest.sceneCode is required');
        }
        return value;
      })(),
      targets: (() {
        final list = _sdkworkAsList(json['targets']);
        if (list == null) {
          throw FormatException('MessagingRouteRuleCreateRequest.targets is required');
        }
        return list
            .map((item) => _sdkworkAsMap(item))
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      userSegment: json['userSegment']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'channel': channel,
      'countryCode': countryCode,
      'deliveryPurpose': deliveryPurpose,
      'failoverPolicy': failoverPolicy?.map((key, item) => MapEntry(key, item)),
      'locale': locale,
      'priority': priority,
      'ruleCode': ruleCode,
      'sceneCode': sceneCode,
      'targets': targets.map((item) => item).toList(),
      'userSegment': userSegment,
    };
  }
}

class MessagingRouteSimulationRequest {
  final String channel;
  final String? countryCode;
  final String deliveryPurpose;
  final String? locale;
  final String sceneCode;
  final String? userSegment;

  MessagingRouteSimulationRequest({
    required this.channel,
    this.countryCode,
    required this.deliveryPurpose,
    this.locale,
    required this.sceneCode,
    this.userSegment
  });

  factory MessagingRouteSimulationRequest.fromJson(Map<String, dynamic> json) {
    return MessagingRouteSimulationRequest(
      channel: (() {
        final value = json['channel']?.toString();
        if (value == null) {
          throw FormatException('MessagingRouteSimulationRequest.channel is required');
        }
        return value;
      })(),
      countryCode: json['countryCode']?.toString(),
      deliveryPurpose: (() {
        final value = json['deliveryPurpose']?.toString();
        if (value == null) {
          throw FormatException('MessagingRouteSimulationRequest.deliveryPurpose is required');
        }
        return value;
      })(),
      locale: json['locale']?.toString(),
      sceneCode: (() {
        final value = json['sceneCode']?.toString();
        if (value == null) {
          throw FormatException('MessagingRouteSimulationRequest.sceneCode is required');
        }
        return value;
      })(),
      userSegment: json['userSegment']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'channel': channel,
      'countryCode': countryCode,
      'deliveryPurpose': deliveryPurpose,
      'locale': locale,
      'sceneCode': sceneCode,
      'userSegment': userSegment,
    };
  }
}

class MessagingRouteSimulationResponse {
  final bool matched;
  final String? routeRuleId;
  final List<Map<String, dynamic>> targets;

  MessagingRouteSimulationResponse({
    required this.matched,
    this.routeRuleId,
    required this.targets
  });

  factory MessagingRouteSimulationResponse.fromJson(Map<String, dynamic> json) {
    return MessagingRouteSimulationResponse(
      matched: (() {
        final value = json['matched'];
        if (value is! bool) {
          throw FormatException('MessagingRouteSimulationResponse.matched is required');
        }
        return value;
      })(),
      routeRuleId: json['routeRuleId']?.toString(),
      targets: (() {
        final list = _sdkworkAsList(json['targets']);
        if (list == null) {
          throw FormatException('MessagingRouteSimulationResponse.targets is required');
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
      'matched': matched,
      'routeRuleId': routeRuleId,
      'targets': targets.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
    };
  }
}

class MessagingSenderIdentityCreateRequest {
  final String channel;
  final String? countryCode;
  final String? displayName;
  final String? domainName;
  final String? fromEmail;
  final String? fromName;
  final String identityCode;
  final String providerAccountId;
  final String? replyTo;
  final String? senderId;
  final String? signName;

  MessagingSenderIdentityCreateRequest({
    required this.channel,
    this.countryCode,
    this.displayName,
    this.domainName,
    this.fromEmail,
    this.fromName,
    required this.identityCode,
    required this.providerAccountId,
    this.replyTo,
    this.senderId,
    this.signName
  });

  factory MessagingSenderIdentityCreateRequest.fromJson(Map<String, dynamic> json) {
    return MessagingSenderIdentityCreateRequest(
      channel: (() {
        final value = json['channel']?.toString();
        if (value == null) {
          throw FormatException('MessagingSenderIdentityCreateRequest.channel is required');
        }
        return value;
      })(),
      countryCode: json['countryCode']?.toString(),
      displayName: json['displayName']?.toString(),
      domainName: json['domainName']?.toString(),
      fromEmail: json['fromEmail']?.toString(),
      fromName: json['fromName']?.toString(),
      identityCode: (() {
        final value = json['identityCode']?.toString();
        if (value == null) {
          throw FormatException('MessagingSenderIdentityCreateRequest.identityCode is required');
        }
        return value;
      })(),
      providerAccountId: (() {
        final value = json['providerAccountId']?.toString();
        if (value == null) {
          throw FormatException('MessagingSenderIdentityCreateRequest.providerAccountId is required');
        }
        return value;
      })(),
      replyTo: json['replyTo']?.toString(),
      senderId: json['senderId']?.toString(),
      signName: json['signName']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'channel': channel,
      'countryCode': countryCode,
      'displayName': displayName,
      'domainName': domainName,
      'fromEmail': fromEmail,
      'fromName': fromName,
      'identityCode': identityCode,
      'providerAccountId': providerAccountId,
      'replyTo': replyTo,
      'senderId': senderId,
      'signName': signName,
    };
  }
}

class MessagingSuppressionCreateRequest {
  final String channel;
  final String? endsAt;
  final String? note;
  final String reasonCode;
  final String? scopeId;
  final String? scopeType;
  final String? source;
  final String startsAt;
  final String targetHash;
  final String targetMasked;

  MessagingSuppressionCreateRequest({
    required this.channel,
    this.endsAt,
    this.note,
    required this.reasonCode,
    this.scopeId,
    this.scopeType,
    this.source,
    required this.startsAt,
    required this.targetHash,
    required this.targetMasked
  });

  factory MessagingSuppressionCreateRequest.fromJson(Map<String, dynamic> json) {
    return MessagingSuppressionCreateRequest(
      channel: (() {
        final value = json['channel']?.toString();
        if (value == null) {
          throw FormatException('MessagingSuppressionCreateRequest.channel is required');
        }
        return value;
      })(),
      endsAt: json['endsAt']?.toString(),
      note: json['note']?.toString(),
      reasonCode: (() {
        final value = json['reasonCode']?.toString();
        if (value == null) {
          throw FormatException('MessagingSuppressionCreateRequest.reasonCode is required');
        }
        return value;
      })(),
      scopeId: json['scopeId']?.toString(),
      scopeType: json['scopeType']?.toString(),
      source: json['source']?.toString(),
      startsAt: (() {
        final value = json['startsAt']?.toString();
        if (value == null) {
          throw FormatException('MessagingSuppressionCreateRequest.startsAt is required');
        }
        return value;
      })(),
      targetHash: (() {
        final value = json['targetHash']?.toString();
        if (value == null) {
          throw FormatException('MessagingSuppressionCreateRequest.targetHash is required');
        }
        return value;
      })(),
      targetMasked: (() {
        final value = json['targetMasked']?.toString();
        if (value == null) {
          throw FormatException('MessagingSuppressionCreateRequest.targetMasked is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'channel': channel,
      'endsAt': endsAt,
      'note': note,
      'reasonCode': reasonCode,
      'scopeId': scopeId,
      'scopeType': scopeType,
      'source': source,
      'startsAt': startsAt,
      'targetHash': targetHash,
      'targetMasked': targetMasked,
    };
  }
}

class MessagingTemplateCreateRequest {
  final String bodyTemplate;
  final String category;
  final String channel;
  final String? contentFormat;
  final String deliveryPurpose;
  final String? locale;
  final String sceneCode;
  final String? subjectTemplate;
  final String templateCode;
  final String templateName;
  final Map<String, dynamic>? variableSchema;

  MessagingTemplateCreateRequest({
    required this.bodyTemplate,
    required this.category,
    required this.channel,
    this.contentFormat,
    required this.deliveryPurpose,
    this.locale,
    required this.sceneCode,
    this.subjectTemplate,
    required this.templateCode,
    required this.templateName,
    this.variableSchema
  });

  factory MessagingTemplateCreateRequest.fromJson(Map<String, dynamic> json) {
    return MessagingTemplateCreateRequest(
      bodyTemplate: (() {
        final value = json['bodyTemplate']?.toString();
        if (value == null) {
          throw FormatException('MessagingTemplateCreateRequest.bodyTemplate is required');
        }
        return value;
      })(),
      category: (() {
        final value = json['category']?.toString();
        if (value == null) {
          throw FormatException('MessagingTemplateCreateRequest.category is required');
        }
        return value;
      })(),
      channel: (() {
        final value = json['channel']?.toString();
        if (value == null) {
          throw FormatException('MessagingTemplateCreateRequest.channel is required');
        }
        return value;
      })(),
      contentFormat: json['contentFormat']?.toString(),
      deliveryPurpose: (() {
        final value = json['deliveryPurpose']?.toString();
        if (value == null) {
          throw FormatException('MessagingTemplateCreateRequest.deliveryPurpose is required');
        }
        return value;
      })(),
      locale: json['locale']?.toString(),
      sceneCode: (() {
        final value = json['sceneCode']?.toString();
        if (value == null) {
          throw FormatException('MessagingTemplateCreateRequest.sceneCode is required');
        }
        return value;
      })(),
      subjectTemplate: json['subjectTemplate']?.toString(),
      templateCode: (() {
        final value = json['templateCode']?.toString();
        if (value == null) {
          throw FormatException('MessagingTemplateCreateRequest.templateCode is required');
        }
        return value;
      })(),
      templateName: (() {
        final value = json['templateName']?.toString();
        if (value == null) {
          throw FormatException('MessagingTemplateCreateRequest.templateName is required');
        }
        return value;
      })(),
      variableSchema: (() {
        final map = _sdkworkAsMap(json['variableSchema']);
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
      'bodyTemplate': bodyTemplate,
      'category': category,
      'channel': channel,
      'contentFormat': contentFormat,
      'deliveryPurpose': deliveryPurpose,
      'locale': locale,
      'sceneCode': sceneCode,
      'subjectTemplate': subjectTemplate,
      'templateCode': templateCode,
      'templateName': templateName,
      'variableSchema': variableSchema?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class MessagingTemplateSendRequest {
  final String channel;
  final String? countryCode;
  final String deliveryPurpose;
  final bool? dryRun;
  final String? locale;
  final String sceneCode;
  final String targetHash;
  final String targetMasked;
  final String templateCode;
  final String? userSegment;
  final Map<String, dynamic>? variables;

  MessagingTemplateSendRequest({
    required this.channel,
    this.countryCode,
    required this.deliveryPurpose,
    this.dryRun,
    this.locale,
    required this.sceneCode,
    required this.targetHash,
    required this.targetMasked,
    required this.templateCode,
    this.userSegment,
    this.variables
  });

  factory MessagingTemplateSendRequest.fromJson(Map<String, dynamic> json) {
    return MessagingTemplateSendRequest(
      channel: (() {
        final value = json['channel']?.toString();
        if (value == null) {
          throw FormatException('MessagingTemplateSendRequest.channel is required');
        }
        return value;
      })(),
      countryCode: json['countryCode']?.toString(),
      deliveryPurpose: (() {
        final value = json['deliveryPurpose']?.toString();
        if (value == null) {
          throw FormatException('MessagingTemplateSendRequest.deliveryPurpose is required');
        }
        return value;
      })(),
      dryRun: json['dryRun'] is bool ? json['dryRun'] : null,
      locale: json['locale']?.toString(),
      sceneCode: (() {
        final value = json['sceneCode']?.toString();
        if (value == null) {
          throw FormatException('MessagingTemplateSendRequest.sceneCode is required');
        }
        return value;
      })(),
      targetHash: (() {
        final value = json['targetHash']?.toString();
        if (value == null) {
          throw FormatException('MessagingTemplateSendRequest.targetHash is required');
        }
        return value;
      })(),
      targetMasked: (() {
        final value = json['targetMasked']?.toString();
        if (value == null) {
          throw FormatException('MessagingTemplateSendRequest.targetMasked is required');
        }
        return value;
      })(),
      templateCode: (() {
        final value = json['templateCode']?.toString();
        if (value == null) {
          throw FormatException('MessagingTemplateSendRequest.templateCode is required');
        }
        return value;
      })(),
      userSegment: json['userSegment']?.toString(),
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
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'channel': channel,
      'countryCode': countryCode,
      'deliveryPurpose': deliveryPurpose,
      'dryRun': dryRun,
      'locale': locale,
      'sceneCode': sceneCode,
      'targetHash': targetHash,
      'targetMasked': targetMasked,
      'templateCode': templateCode,
      'userSegment': userSegment,
      'variables': variables?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class MessagingTemplateSendResponse {
  final String deliveryStatus;
  final String? providerCode;
  final String requestId;

  MessagingTemplateSendResponse({
    required this.deliveryStatus,
    this.providerCode,
    required this.requestId
  });

  factory MessagingTemplateSendResponse.fromJson(Map<String, dynamic> json) {
    return MessagingTemplateSendResponse(
      deliveryStatus: (() {
        final value = json['deliveryStatus']?.toString();
        if (value == null) {
          throw FormatException('MessagingTemplateSendResponse.deliveryStatus is required');
        }
        return value;
      })(),
      providerCode: json['providerCode']?.toString(),
      requestId: (() {
        final value = json['requestId']?.toString();
        if (value == null) {
          throw FormatException('MessagingTemplateSendResponse.requestId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'deliveryStatus': deliveryStatus,
      'providerCode': providerCode,
      'requestId': requestId,
    };
  }
}

class MessagingTestSendRequest {
  final String channel;
  final String? countryCode;
  final String deliveryPurpose;
  final bool? dryRun;
  final String? locale;
  final String sceneCode;
  final String targetHash;
  final String targetMasked;
  final String templateCode;
  final String? userSegment;
  final Map<String, dynamic>? variables;

  MessagingTestSendRequest({
    required this.channel,
    this.countryCode,
    required this.deliveryPurpose,
    this.dryRun,
    this.locale,
    required this.sceneCode,
    required this.targetHash,
    required this.targetMasked,
    required this.templateCode,
    this.userSegment,
    this.variables
  });

  factory MessagingTestSendRequest.fromJson(Map<String, dynamic> json) {
    return MessagingTestSendRequest(
      channel: (() {
        final value = json['channel']?.toString();
        if (value == null) {
          throw FormatException('MessagingTestSendRequest.channel is required');
        }
        return value;
      })(),
      countryCode: json['countryCode']?.toString(),
      deliveryPurpose: (() {
        final value = json['deliveryPurpose']?.toString();
        if (value == null) {
          throw FormatException('MessagingTestSendRequest.deliveryPurpose is required');
        }
        return value;
      })(),
      dryRun: json['dryRun'] is bool ? json['dryRun'] : null,
      locale: json['locale']?.toString(),
      sceneCode: (() {
        final value = json['sceneCode']?.toString();
        if (value == null) {
          throw FormatException('MessagingTestSendRequest.sceneCode is required');
        }
        return value;
      })(),
      targetHash: (() {
        final value = json['targetHash']?.toString();
        if (value == null) {
          throw FormatException('MessagingTestSendRequest.targetHash is required');
        }
        return value;
      })(),
      targetMasked: (() {
        final value = json['targetMasked']?.toString();
        if (value == null) {
          throw FormatException('MessagingTestSendRequest.targetMasked is required');
        }
        return value;
      })(),
      templateCode: (() {
        final value = json['templateCode']?.toString();
        if (value == null) {
          throw FormatException('MessagingTestSendRequest.templateCode is required');
        }
        return value;
      })(),
      userSegment: json['userSegment']?.toString(),
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
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'channel': channel,
      'countryCode': countryCode,
      'deliveryPurpose': deliveryPurpose,
      'dryRun': dryRun,
      'locale': locale,
      'sceneCode': sceneCode,
      'targetHash': targetHash,
      'targetMasked': targetMasked,
      'templateCode': templateCode,
      'userSegment': userSegment,
      'variables': variables?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class MessagingTestSendResponse {
  final String deliveryStatus;
  final String? providerCode;
  final String requestId;

  MessagingTestSendResponse({
    required this.deliveryStatus,
    this.providerCode,
    required this.requestId
  });

  factory MessagingTestSendResponse.fromJson(Map<String, dynamic> json) {
    return MessagingTestSendResponse(
      deliveryStatus: (() {
        final value = json['deliveryStatus']?.toString();
        if (value == null) {
          throw FormatException('MessagingTestSendResponse.deliveryStatus is required');
        }
        return value;
      })(),
      providerCode: json['providerCode']?.toString(),
      requestId: (() {
        final value = json['requestId']?.toString();
        if (value == null) {
          throw FormatException('MessagingTestSendResponse.requestId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'deliveryStatus': deliveryStatus,
      'providerCode': providerCode,
      'requestId': requestId,
    };
  }
}

class ModelMappingsCreateResult {
  final String code;
  final AdminModelMappingMutationResponse? data;
  final String? msg;

  ModelMappingsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ModelMappingsCreateResult.fromJson(Map<String, dynamic> json) {
    return ModelMappingsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ModelMappingsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminModelMappingMutationResponse.fromJson(map);
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

class ModelMappingsDeleteResult {
  final String code;
  final AdminModelMappingDeleteResponse? data;
  final String? msg;

  ModelMappingsDeleteResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ModelMappingsDeleteResult.fromJson(Map<String, dynamic> json) {
    return ModelMappingsDeleteResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ModelMappingsDeleteResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminModelMappingDeleteResponse.fromJson(map);
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

class ModelMappingsListResult {
  final String code;
  final AdminModelMappingsResponse? data;
  final String? msg;

  ModelMappingsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ModelMappingsListResult.fromJson(Map<String, dynamic> json) {
    return ModelMappingsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ModelMappingsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminModelMappingsResponse.fromJson(map);
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

class ModelMappingsResolveCreateResult {
  final String code;
  final AdminModelMappingResolveResponse? data;
  final String? msg;

  ModelMappingsResolveCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ModelMappingsResolveCreateResult.fromJson(Map<String, dynamic> json) {
    return ModelMappingsResolveCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ModelMappingsResolveCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminModelMappingResolveResponse.fromJson(map);
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

class ModelMappingsUpdateResult {
  final String code;
  final AdminModelMappingMutationResponse? data;
  final String? msg;

  ModelMappingsUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ModelMappingsUpdateResult.fromJson(Map<String, dynamic> json) {
    return ModelMappingsUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ModelMappingsUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminModelMappingMutationResponse.fromJson(map);
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

class ModelRankingRefreshJobHistoryPage {
  final List<ModelRankingRefreshJobItem> items;

  ModelRankingRefreshJobHistoryPage({
    required this.items
  });

  factory ModelRankingRefreshJobHistoryPage.fromJson(Map<String, dynamic> json) {
    return ModelRankingRefreshJobHistoryPage(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('ModelRankingRefreshJobHistoryPage.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : ModelRankingRefreshJobItem.fromJson(map);
      })())
            .whereType<ModelRankingRefreshJobItem>()
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

class ModelRankingRefreshJobItem {
  final String durationMs;
  final String endedAt;
  final String failureCount;
  final String failureReason;
  final String generatedCount;
  final String id;
  final String jobName;
  final String nextRefreshAt;
  final String organizationId;
  final String rankScope;
  final String snapshotDate;
  final String snapshotPeriod;
  final String sourceCount;
  final String startedAt;
  final String status;
  final String successCount;
  final String tenantId;
  final String windowEnd;
  final String windowStart;

  ModelRankingRefreshJobItem({
    required this.durationMs,
    required this.endedAt,
    required this.failureCount,
    required this.failureReason,
    required this.generatedCount,
    required this.id,
    required this.jobName,
    required this.nextRefreshAt,
    required this.organizationId,
    required this.rankScope,
    required this.snapshotDate,
    required this.snapshotPeriod,
    required this.sourceCount,
    required this.startedAt,
    required this.status,
    required this.successCount,
    required this.tenantId,
    required this.windowEnd,
    required this.windowStart
  });

  factory ModelRankingRefreshJobItem.fromJson(Map<String, dynamic> json) {
    return ModelRankingRefreshJobItem(
      durationMs: (() {
        final value = json['durationMs']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshJobItem.durationMs is required');
        }
        return value;
      })(),
      endedAt: (() {
        final value = json['endedAt']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshJobItem.endedAt is required');
        }
        return value;
      })(),
      failureCount: (() {
        final value = json['failureCount']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshJobItem.failureCount is required');
        }
        return value;
      })(),
      failureReason: (() {
        final value = json['failureReason']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshJobItem.failureReason is required');
        }
        return value;
      })(),
      generatedCount: (() {
        final value = json['generatedCount']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshJobItem.generatedCount is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshJobItem.id is required');
        }
        return value;
      })(),
      jobName: (() {
        final value = json['jobName']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshJobItem.jobName is required');
        }
        return value;
      })(),
      nextRefreshAt: (() {
        final value = json['nextRefreshAt']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshJobItem.nextRefreshAt is required');
        }
        return value;
      })(),
      organizationId: (() {
        final value = json['organizationId']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshJobItem.organizationId is required');
        }
        return value;
      })(),
      rankScope: (() {
        final value = json['rankScope']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshJobItem.rankScope is required');
        }
        return value;
      })(),
      snapshotDate: (() {
        final value = json['snapshotDate']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshJobItem.snapshotDate is required');
        }
        return value;
      })(),
      snapshotPeriod: (() {
        final value = json['snapshotPeriod']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshJobItem.snapshotPeriod is required');
        }
        return value;
      })(),
      sourceCount: (() {
        final value = json['sourceCount']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshJobItem.sourceCount is required');
        }
        return value;
      })(),
      startedAt: (() {
        final value = json['startedAt']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshJobItem.startedAt is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshJobItem.status is required');
        }
        return value;
      })(),
      successCount: (() {
        final value = json['successCount']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshJobItem.successCount is required');
        }
        return value;
      })(),
      tenantId: (() {
        final value = json['tenantId']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshJobItem.tenantId is required');
        }
        return value;
      })(),
      windowEnd: (() {
        final value = json['windowEnd']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshJobItem.windowEnd is required');
        }
        return value;
      })(),
      windowStart: (() {
        final value = json['windowStart']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshJobItem.windowStart is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'durationMs': durationMs,
      'endedAt': endedAt,
      'failureCount': failureCount,
      'failureReason': failureReason,
      'generatedCount': generatedCount,
      'id': id,
      'jobName': jobName,
      'nextRefreshAt': nextRefreshAt,
      'organizationId': organizationId,
      'rankScope': rankScope,
      'snapshotDate': snapshotDate,
      'snapshotPeriod': snapshotPeriod,
      'sourceCount': sourceCount,
      'startedAt': startedAt,
      'status': status,
      'successCount': successCount,
      'tenantId': tenantId,
      'windowEnd': windowEnd,
      'windowStart': windowStart,
    };
  }
}

class ModelRankingRefreshLatestJob {
  final String durationMs;
  final String endedAt;
  final String failureCount;
  final String failureReason;
  final String generatedCount;
  final String id;
  final String jobName;
  final String nextRefreshAt;
  final String organizationId;
  final String rankScope;
  final String snapshotDate;
  final String snapshotPeriod;
  final String sourceCount;
  final String startedAt;
  final String status;
  final String successCount;
  final String tenantId;
  final String windowEnd;
  final String windowStart;

  ModelRankingRefreshLatestJob({
    required this.durationMs,
    required this.endedAt,
    required this.failureCount,
    required this.failureReason,
    required this.generatedCount,
    required this.id,
    required this.jobName,
    required this.nextRefreshAt,
    required this.organizationId,
    required this.rankScope,
    required this.snapshotDate,
    required this.snapshotPeriod,
    required this.sourceCount,
    required this.startedAt,
    required this.status,
    required this.successCount,
    required this.tenantId,
    required this.windowEnd,
    required this.windowStart
  });

  factory ModelRankingRefreshLatestJob.fromJson(Map<String, dynamic> json) {
    return ModelRankingRefreshLatestJob(
      durationMs: (() {
        final value = json['durationMs']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshLatestJob.durationMs is required');
        }
        return value;
      })(),
      endedAt: (() {
        final value = json['endedAt']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshLatestJob.endedAt is required');
        }
        return value;
      })(),
      failureCount: (() {
        final value = json['failureCount']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshLatestJob.failureCount is required');
        }
        return value;
      })(),
      failureReason: (() {
        final value = json['failureReason']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshLatestJob.failureReason is required');
        }
        return value;
      })(),
      generatedCount: (() {
        final value = json['generatedCount']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshLatestJob.generatedCount is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshLatestJob.id is required');
        }
        return value;
      })(),
      jobName: (() {
        final value = json['jobName']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshLatestJob.jobName is required');
        }
        return value;
      })(),
      nextRefreshAt: (() {
        final value = json['nextRefreshAt']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshLatestJob.nextRefreshAt is required');
        }
        return value;
      })(),
      organizationId: (() {
        final value = json['organizationId']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshLatestJob.organizationId is required');
        }
        return value;
      })(),
      rankScope: (() {
        final value = json['rankScope']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshLatestJob.rankScope is required');
        }
        return value;
      })(),
      snapshotDate: (() {
        final value = json['snapshotDate']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshLatestJob.snapshotDate is required');
        }
        return value;
      })(),
      snapshotPeriod: (() {
        final value = json['snapshotPeriod']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshLatestJob.snapshotPeriod is required');
        }
        return value;
      })(),
      sourceCount: (() {
        final value = json['sourceCount']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshLatestJob.sourceCount is required');
        }
        return value;
      })(),
      startedAt: (() {
        final value = json['startedAt']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshLatestJob.startedAt is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshLatestJob.status is required');
        }
        return value;
      })(),
      successCount: (() {
        final value = json['successCount']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshLatestJob.successCount is required');
        }
        return value;
      })(),
      tenantId: (() {
        final value = json['tenantId']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshLatestJob.tenantId is required');
        }
        return value;
      })(),
      windowEnd: (() {
        final value = json['windowEnd']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshLatestJob.windowEnd is required');
        }
        return value;
      })(),
      windowStart: (() {
        final value = json['windowStart']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshLatestJob.windowStart is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'durationMs': durationMs,
      'endedAt': endedAt,
      'failureCount': failureCount,
      'failureReason': failureReason,
      'generatedCount': generatedCount,
      'id': id,
      'jobName': jobName,
      'nextRefreshAt': nextRefreshAt,
      'organizationId': organizationId,
      'rankScope': rankScope,
      'snapshotDate': snapshotDate,
      'snapshotPeriod': snapshotPeriod,
      'sourceCount': sourceCount,
      'startedAt': startedAt,
      'status': status,
      'successCount': successCount,
      'tenantId': tenantId,
      'windowEnd': windowEnd,
      'windowStart': windowStart,
    };
  }
}

class ModelRankingRefreshStatus {
  final String cacheMaxAgeSeconds;
  final String generatedAt;
  final String generatedCount;
  final ModelRankingRefreshLatestJob latestJob;
  final String nextRefreshAt;
  final String organizationId;
  final String rankScope;
  final String refreshIntervalSeconds;
  final String snapshotDate;
  final String snapshotPeriod;
  final String sourceCount;
  final List<String> sourceTables;
  final String status;
  final String tenantId;
  final String windowEnd;
  final String windowStart;

  ModelRankingRefreshStatus({
    required this.cacheMaxAgeSeconds,
    required this.generatedAt,
    required this.generatedCount,
    required this.latestJob,
    required this.nextRefreshAt,
    required this.organizationId,
    required this.rankScope,
    required this.refreshIntervalSeconds,
    required this.snapshotDate,
    required this.snapshotPeriod,
    required this.sourceCount,
    required this.sourceTables,
    required this.status,
    required this.tenantId,
    required this.windowEnd,
    required this.windowStart
  });

  factory ModelRankingRefreshStatus.fromJson(Map<String, dynamic> json) {
    return ModelRankingRefreshStatus(
      cacheMaxAgeSeconds: (() {
        final value = json['cacheMaxAgeSeconds']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshStatus.cacheMaxAgeSeconds is required');
        }
        return value;
      })(),
      generatedAt: (() {
        final value = json['generatedAt']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshStatus.generatedAt is required');
        }
        return value;
      })(),
      generatedCount: (() {
        final value = json['generatedCount']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshStatus.generatedCount is required');
        }
        return value;
      })(),
      latestJob: (() {
        final map = _sdkworkAsMap(json['latestJob']);
        if (map == null) {
          throw FormatException('ModelRankingRefreshStatus.latestJob is required');
        }
        return ModelRankingRefreshLatestJob.fromJson(map);
      })(),
      nextRefreshAt: (() {
        final value = json['nextRefreshAt']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshStatus.nextRefreshAt is required');
        }
        return value;
      })(),
      organizationId: (() {
        final value = json['organizationId']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshStatus.organizationId is required');
        }
        return value;
      })(),
      rankScope: (() {
        final value = json['rankScope']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshStatus.rankScope is required');
        }
        return value;
      })(),
      refreshIntervalSeconds: (() {
        final value = json['refreshIntervalSeconds']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshStatus.refreshIntervalSeconds is required');
        }
        return value;
      })(),
      snapshotDate: (() {
        final value = json['snapshotDate']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshStatus.snapshotDate is required');
        }
        return value;
      })(),
      snapshotPeriod: (() {
        final value = json['snapshotPeriod']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshStatus.snapshotPeriod is required');
        }
        return value;
      })(),
      sourceCount: (() {
        final value = json['sourceCount']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshStatus.sourceCount is required');
        }
        return value;
      })(),
      sourceTables: (() {
        final list = _sdkworkAsList(json['sourceTables']);
        if (list == null) {
          throw FormatException('ModelRankingRefreshStatus.sourceTables is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshStatus.status is required');
        }
        return value;
      })(),
      tenantId: (() {
        final value = json['tenantId']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshStatus.tenantId is required');
        }
        return value;
      })(),
      windowEnd: (() {
        final value = json['windowEnd']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshStatus.windowEnd is required');
        }
        return value;
      })(),
      windowStart: (() {
        final value = json['windowStart']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshStatus.windowStart is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cacheMaxAgeSeconds': cacheMaxAgeSeconds,
      'generatedAt': generatedAt,
      'generatedCount': generatedCount,
      'latestJob': latestJob.toJson(),
      'nextRefreshAt': nextRefreshAt,
      'organizationId': organizationId,
      'rankScope': rankScope,
      'refreshIntervalSeconds': refreshIntervalSeconds,
      'snapshotDate': snapshotDate,
      'snapshotPeriod': snapshotPeriod,
      'sourceCount': sourceCount,
      'sourceTables': sourceTables.map((item) => item).toList(),
      'status': status,
      'tenantId': tenantId,
      'windowEnd': windowEnd,
      'windowStart': windowStart,
    };
  }
}

class ModelRankingRefreshTriggerRequest {
  final String? cacheMaxAgeSeconds;
  final String? limit;
  final String? lookbackDays;
  final String? rankScope;
  final String? refreshIntervalSeconds;
  final String? snapshotPeriod;

  ModelRankingRefreshTriggerRequest({
    this.cacheMaxAgeSeconds,
    this.limit,
    this.lookbackDays,
    this.rankScope,
    this.refreshIntervalSeconds,
    this.snapshotPeriod
  });

  factory ModelRankingRefreshTriggerRequest.fromJson(Map<String, dynamic> json) {
    return ModelRankingRefreshTriggerRequest(
      cacheMaxAgeSeconds: json['cacheMaxAgeSeconds']?.toString(),
      limit: json['limit']?.toString(),
      lookbackDays: json['lookbackDays']?.toString(),
      rankScope: json['rankScope']?.toString(),
      refreshIntervalSeconds: json['refreshIntervalSeconds']?.toString(),
      snapshotPeriod: json['snapshotPeriod']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cacheMaxAgeSeconds': cacheMaxAgeSeconds,
      'limit': limit,
      'lookbackDays': lookbackDays,
      'rankScope': rankScope,
      'refreshIntervalSeconds': refreshIntervalSeconds,
      'snapshotPeriod': snapshotPeriod,
    };
  }
}

class ModelRankingRefreshTriggerResponse {
  final String cacheMaxAgeSeconds;
  final String generatedCount;
  final String nextRefreshAt;
  final String organizationId;
  final String rankScope;
  final String refreshIntervalSeconds;
  final String snapshotDate;
  final String snapshotPeriod;
  final String sourceCount;
  final String status;
  final String tenantId;
  final bool triggered;
  final String windowEnd;
  final String windowStart;

  ModelRankingRefreshTriggerResponse({
    required this.cacheMaxAgeSeconds,
    required this.generatedCount,
    required this.nextRefreshAt,
    required this.organizationId,
    required this.rankScope,
    required this.refreshIntervalSeconds,
    required this.snapshotDate,
    required this.snapshotPeriod,
    required this.sourceCount,
    required this.status,
    required this.tenantId,
    required this.triggered,
    required this.windowEnd,
    required this.windowStart
  });

  factory ModelRankingRefreshTriggerResponse.fromJson(Map<String, dynamic> json) {
    return ModelRankingRefreshTriggerResponse(
      cacheMaxAgeSeconds: (() {
        final value = json['cacheMaxAgeSeconds']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshTriggerResponse.cacheMaxAgeSeconds is required');
        }
        return value;
      })(),
      generatedCount: (() {
        final value = json['generatedCount']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshTriggerResponse.generatedCount is required');
        }
        return value;
      })(),
      nextRefreshAt: (() {
        final value = json['nextRefreshAt']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshTriggerResponse.nextRefreshAt is required');
        }
        return value;
      })(),
      organizationId: (() {
        final value = json['organizationId']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshTriggerResponse.organizationId is required');
        }
        return value;
      })(),
      rankScope: (() {
        final value = json['rankScope']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshTriggerResponse.rankScope is required');
        }
        return value;
      })(),
      refreshIntervalSeconds: (() {
        final value = json['refreshIntervalSeconds']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshTriggerResponse.refreshIntervalSeconds is required');
        }
        return value;
      })(),
      snapshotDate: (() {
        final value = json['snapshotDate']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshTriggerResponse.snapshotDate is required');
        }
        return value;
      })(),
      snapshotPeriod: (() {
        final value = json['snapshotPeriod']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshTriggerResponse.snapshotPeriod is required');
        }
        return value;
      })(),
      sourceCount: (() {
        final value = json['sourceCount']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshTriggerResponse.sourceCount is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshTriggerResponse.status is required');
        }
        return value;
      })(),
      tenantId: (() {
        final value = json['tenantId']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshTriggerResponse.tenantId is required');
        }
        return value;
      })(),
      triggered: (() {
        final value = json['triggered'];
        if (value is! bool) {
          throw FormatException('ModelRankingRefreshTriggerResponse.triggered is required');
        }
        return value;
      })(),
      windowEnd: (() {
        final value = json['windowEnd']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshTriggerResponse.windowEnd is required');
        }
        return value;
      })(),
      windowStart: (() {
        final value = json['windowStart']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingRefreshTriggerResponse.windowStart is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cacheMaxAgeSeconds': cacheMaxAgeSeconds,
      'generatedCount': generatedCount,
      'nextRefreshAt': nextRefreshAt,
      'organizationId': organizationId,
      'rankScope': rankScope,
      'refreshIntervalSeconds': refreshIntervalSeconds,
      'snapshotDate': snapshotDate,
      'snapshotPeriod': snapshotPeriod,
      'sourceCount': sourceCount,
      'status': status,
      'tenantId': tenantId,
      'triggered': triggered,
      'windowEnd': windowEnd,
      'windowStart': windowStart,
    };
  }
}

class ModelRankingsJobsListResult {
  final String code;
  final ModelRankingRefreshJobHistoryPage? data;
  final String? msg;

  ModelRankingsJobsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ModelRankingsJobsListResult.fromJson(Map<String, dynamic> json) {
    return ModelRankingsJobsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingsJobsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ModelRankingRefreshJobHistoryPage.fromJson(map);
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

class ModelRankingsRefreshResult {
  final String code;
  final ModelRankingRefreshTriggerResponse? data;
  final String? msg;

  ModelRankingsRefreshResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ModelRankingsRefreshResult.fromJson(Map<String, dynamic> json) {
    return ModelRankingsRefreshResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingsRefreshResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ModelRankingRefreshTriggerResponse.fromJson(map);
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

class ModelRankingsStatusRetrieveResult {
  final String code;
  final ModelRankingRefreshStatus? data;
  final String? msg;

  ModelRankingsStatusRetrieveResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ModelRankingsStatusRetrieveResult.fromJson(Map<String, dynamic> json) {
    return ModelRankingsStatusRetrieveResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingsStatusRetrieveResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ModelRankingRefreshStatus.fromJson(map);
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

class ModelVendorsCreateResult {
  final String code;
  final AdminModelVendorMutationResponse? data;
  final String? msg;

  ModelVendorsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ModelVendorsCreateResult.fromJson(Map<String, dynamic> json) {
    return ModelVendorsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ModelVendorsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminModelVendorMutationResponse.fromJson(map);
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

class ModelVendorsListResult {
  final String code;
  final AdminModelVendorsResponse? data;
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
        return map == null ? null : AdminModelVendorsResponse.fromJson(map);
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

class ModelsCreateResult {
  final String code;
  final AdminAiModelMutationResponse? data;
  final String? msg;

  ModelsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ModelsCreateResult.fromJson(Map<String, dynamic> json) {
    return ModelsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ModelsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminAiModelMutationResponse.fromJson(map);
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

class ModelsDeleteResult {
  final String code;
  final AdminDeleteResponse? data;
  final String? msg;

  ModelsDeleteResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ModelsDeleteResult.fromJson(Map<String, dynamic> json) {
    return ModelsDeleteResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ModelsDeleteResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminDeleteResponse.fromJson(map);
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
  final AdminAiModelsResponse? data;
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
        return map == null ? null : AdminAiModelsResponse.fromJson(map);
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

class ModelsRefreshResult {
  final String code;
  final AdminModelCatalogSyncResponse? data;
  final String? msg;

  ModelsRefreshResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ModelsRefreshResult.fromJson(Map<String, dynamic> json) {
    return ModelsRefreshResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ModelsRefreshResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminModelCatalogSyncResponse.fromJson(map);
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

class ModelsUpdateResult {
  final String code;
  final AdminAiModelMutationResponse? data;
  final String? msg;

  ModelsUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ModelsUpdateResult.fromJson(Map<String, dynamic> json) {
    return ModelsUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ModelsUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminAiModelMutationResponse.fromJson(map);
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

class MonitorAlertsListResult {
  final String code;
  final AdminMonitorAlertsResponse? data;
  final String? msg;

  MonitorAlertsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory MonitorAlertsListResult.fromJson(Map<String, dynamic> json) {
    return MonitorAlertsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('MonitorAlertsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminMonitorAlertsResponse.fromJson(map);
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

class MonitorNodesListResult {
  final String code;
  final AdminMonitorNodesResponse? data;
  final String? msg;

  MonitorNodesListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory MonitorNodesListResult.fromJson(Map<String, dynamic> json) {
    return MonitorNodesListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('MonitorNodesListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminMonitorNodesResponse.fromJson(map);
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

class MonitorPerformanceListResult {
  final String code;
  final AdminMonitorPerformanceResponse? data;
  final String? msg;

  MonitorPerformanceListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory MonitorPerformanceListResult.fromJson(Map<String, dynamic> json) {
    return MonitorPerformanceListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('MonitorPerformanceListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminMonitorPerformanceResponse.fromJson(map);
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

class OssBucketsCreateResult {
  final String code;
  final StorageBucketMutationResponse? data;
  final String? msg;

  OssBucketsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory OssBucketsCreateResult.fromJson(Map<String, dynamic> json) {
    return OssBucketsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('OssBucketsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : StorageBucketMutationResponse.fromJson(map);
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

class OssBucketsListResult {
  final String code;
  final StorageBucketListResponse? data;
  final String? msg;

  OssBucketsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory OssBucketsListResult.fromJson(Map<String, dynamic> json) {
    return OssBucketsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('OssBucketsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : StorageBucketListResponse.fromJson(map);
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

class OssBucketsUpdateResult {
  final String code;
  final StorageBucketMutationResponse? data;
  final String? msg;

  OssBucketsUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory OssBucketsUpdateResult.fromJson(Map<String, dynamic> json) {
    return OssBucketsUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('OssBucketsUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : StorageBucketMutationResponse.fromJson(map);
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

class OssDefaultBucketsListResult {
  final String code;
  final StorageDefaultBucketListResponse? data;
  final String? msg;

  OssDefaultBucketsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory OssDefaultBucketsListResult.fromJson(Map<String, dynamic> json) {
    return OssDefaultBucketsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('OssDefaultBucketsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : StorageDefaultBucketListResponse.fromJson(map);
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

class OssDefaultBucketsUpdateResult {
  final String code;
  final StorageDefaultBucketMutationResponse? data;
  final String? msg;

  OssDefaultBucketsUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory OssDefaultBucketsUpdateResult.fromJson(Map<String, dynamic> json) {
    return OssDefaultBucketsUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('OssDefaultBucketsUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : StorageDefaultBucketMutationResponse.fromJson(map);
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

class OssGcJobsCreateResult {
  final String code;
  final StorageGarbageCollectionJobMutationResponse? data;
  final String? msg;

  OssGcJobsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory OssGcJobsCreateResult.fromJson(Map<String, dynamic> json) {
    return OssGcJobsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('OssGcJobsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : StorageGarbageCollectionJobMutationResponse.fromJson(map);
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

class OssGcJobsListResult {
  final String code;
  final StorageGarbageCollectionJobListResponse? data;
  final String? msg;

  OssGcJobsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory OssGcJobsListResult.fromJson(Map<String, dynamic> json) {
    return OssGcJobsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('OssGcJobsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : StorageGarbageCollectionJobListResponse.fromJson(map);
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

class OssProvidersCreateResult {
  final String code;
  final StorageProviderMutationResponse? data;
  final String? msg;

  OssProvidersCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory OssProvidersCreateResult.fromJson(Map<String, dynamic> json) {
    return OssProvidersCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('OssProvidersCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : StorageProviderMutationResponse.fromJson(map);
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

class OssProvidersHealthChecksCreateResult {
  final String code;
  final StorageProviderHealthCheckResponse? data;
  final String? msg;

  OssProvidersHealthChecksCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory OssProvidersHealthChecksCreateResult.fromJson(Map<String, dynamic> json) {
    return OssProvidersHealthChecksCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('OssProvidersHealthChecksCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : StorageProviderHealthCheckResponse.fromJson(map);
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

class OssProvidersListResult {
  final String code;
  final StorageProviderListResponse? data;
  final String? msg;

  OssProvidersListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory OssProvidersListResult.fromJson(Map<String, dynamic> json) {
    return OssProvidersListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('OssProvidersListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : StorageProviderListResponse.fromJson(map);
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

class OssProvidersUpdateResult {
  final String code;
  final StorageProviderMutationResponse? data;
  final String? msg;

  OssProvidersUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory OssProvidersUpdateResult.fromJson(Map<String, dynamic> json) {
    return OssProvidersUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('OssProvidersUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : StorageProviderMutationResponse.fromJson(map);
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

class OssQuotasCreateResult {
  final String code;
  final StorageQuotaPolicyMutationResponse? data;
  final String? msg;

  OssQuotasCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory OssQuotasCreateResult.fromJson(Map<String, dynamic> json) {
    return OssQuotasCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('OssQuotasCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : StorageQuotaPolicyMutationResponse.fromJson(map);
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

class OssQuotasListResult {
  final String code;
  final StorageQuotaPolicyListResponse? data;
  final String? msg;

  OssQuotasListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory OssQuotasListResult.fromJson(Map<String, dynamic> json) {
    return OssQuotasListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('OssQuotasListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : StorageQuotaPolicyListResponse.fromJson(map);
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

class OssReconciliationRunsCreateResult {
  final String code;
  final StorageReconciliationRunMutationResponse? data;
  final String? msg;

  OssReconciliationRunsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory OssReconciliationRunsCreateResult.fromJson(Map<String, dynamic> json) {
    return OssReconciliationRunsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('OssReconciliationRunsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : StorageReconciliationRunMutationResponse.fromJson(map);
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

class OssReconciliationRunsListResult {
  final String code;
  final StorageReconciliationRunListResponse? data;
  final String? msg;

  OssReconciliationRunsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory OssReconciliationRunsListResult.fromJson(Map<String, dynamic> json) {
    return OssReconciliationRunsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('OssReconciliationRunsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : StorageReconciliationRunListResponse.fromJson(map);
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

class OssUsageLedgerListResult {
  final String code;
  final StorageUsageLedgerListResponse? data;
  final String? msg;

  OssUsageLedgerListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory OssUsageLedgerListResult.fromJson(Map<String, dynamic> json) {
    return OssUsageLedgerListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('OssUsageLedgerListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : StorageUsageLedgerListResponse.fromJson(map);
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

class OssUsageListResult {
  final String code;
  final StorageUsageCounterListResponse? data;
  final String? msg;

  OssUsageListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory OssUsageListResult.fromJson(Map<String, dynamic> json) {
    return OssUsageListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('OssUsageListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : StorageUsageCounterListResponse.fromJson(map);
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

class OssUsageSnapshotsListResult {
  final String code;
  final StorageUsageSnapshotListResponse? data;
  final String? msg;

  OssUsageSnapshotsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory OssUsageSnapshotsListResult.fromJson(Map<String, dynamic> json) {
    return OssUsageSnapshotsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('OssUsageSnapshotsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : StorageUsageSnapshotListResponse.fromJson(map);
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

class PriceSimulationCreateResult {
  final String code;
  final ServiceProviderPriceSimulationResponse? data;
  final String? msg;

  PriceSimulationCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory PriceSimulationCreateResult.fromJson(Map<String, dynamic> json) {
    return PriceSimulationCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('PriceSimulationCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ServiceProviderPriceSimulationResponse.fromJson(map);
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

class PricingRulesCreateResult {
  final String code;
  final ServiceProviderPricingRuleMutationResponse? data;
  final String? msg;

  PricingRulesCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory PricingRulesCreateResult.fromJson(Map<String, dynamic> json) {
    return PricingRulesCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('PricingRulesCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ServiceProviderPricingRuleMutationResponse.fromJson(map);
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

class PricingRulesListResult {
  final String code;
  final ServiceProviderCollectionResponse? data;
  final String? msg;

  PricingRulesListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory PricingRulesListResult.fromJson(Map<String, dynamic> json) {
    return PricingRulesListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('PricingRulesListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ServiceProviderCollectionResponse.fromJson(map);
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

class PricingRulesUpdateResult {
  final String code;
  final ServiceProviderPricingRuleMutationResponse? data;
  final String? msg;

  PricingRulesUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory PricingRulesUpdateResult.fromJson(Map<String, dynamic> json) {
    return PricingRulesUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('PricingRulesUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ServiceProviderPricingRuleMutationResponse.fromJson(map);
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

class ProviderAccountsCreateResult {
  final String code;
  final MessagingMutationResponse? data;
  final String? msg;

  ProviderAccountsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ProviderAccountsCreateResult.fromJson(Map<String, dynamic> json) {
    return ProviderAccountsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ProviderAccountsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : MessagingMutationResponse.fromJson(map);
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

class ProviderAccountsListResult {
  final String code;
  final MessagingCollectionResponse? data;
  final String? msg;

  ProviderAccountsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ProviderAccountsListResult.fromJson(Map<String, dynamic> json) {
    return ProviderAccountsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ProviderAccountsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : MessagingCollectionResponse.fromJson(map);
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

class ProviderCircuitBreakerPolicy {
  final int failureThreshold;

  ProviderCircuitBreakerPolicy({
    required this.failureThreshold
  });

  factory ProviderCircuitBreakerPolicy.fromJson(Map<String, dynamic> json) {
    return ProviderCircuitBreakerPolicy(
      failureThreshold: (() {
        final value = json['failureThreshold'];
        if (value is! int) {
          throw FormatException('ProviderCircuitBreakerPolicy.failureThreshold is required');
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

class ProviderRegistryListResult {
  final String code;
  final ServiceProviderCollectionResponse? data;
  final String? msg;

  ProviderRegistryListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ProviderRegistryListResult.fromJson(Map<String, dynamic> json) {
    return ProviderRegistryListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ProviderRegistryListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ServiceProviderCollectionResponse.fromJson(map);
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

class ProviderRetryPolicy {
  final int? backoffMs;
  final int maxAttempts;
  final List<int> retryableStatusCodes;

  ProviderRetryPolicy({
    this.backoffMs,
    required this.maxAttempts,
    required this.retryableStatusCodes
  });

  factory ProviderRetryPolicy.fromJson(Map<String, dynamic> json) {
    return ProviderRetryPolicy(
      backoffMs: json['backoffMs'] is int ? json['backoffMs'] : null,
      maxAttempts: (() {
        final value = json['maxAttempts'];
        if (value is! int) {
          throw FormatException('ProviderRetryPolicy.maxAttempts is required');
        }
        return value;
      })(),
      retryableStatusCodes: (() {
        final list = _sdkworkAsList(json['retryableStatusCodes']);
        if (list == null) {
          throw FormatException('ProviderRetryPolicy.retryableStatusCodes is required');
        }
        return list
            .map((item) => item is int ? item : null)
            .whereType<int>()
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

class ProviderSecretsCreateResult {
  final String code;
  final AdminProviderSecretMutationResponse? data;
  final String? msg;

  ProviderSecretsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ProviderSecretsCreateResult.fromJson(Map<String, dynamic> json) {
    return ProviderSecretsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ProviderSecretsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminProviderSecretMutationResponse.fromJson(map);
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

class ProviderSecretsDeleteResult {
  final String code;
  final AdminDeleteResponse? data;
  final String? msg;

  ProviderSecretsDeleteResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ProviderSecretsDeleteResult.fromJson(Map<String, dynamic> json) {
    return ProviderSecretsDeleteResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ProviderSecretsDeleteResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminDeleteResponse.fromJson(map);
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

class ProviderSecretsListResult {
  final String code;
  final AdminProviderSecretsResponse? data;
  final String? msg;

  ProviderSecretsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ProviderSecretsListResult.fromJson(Map<String, dynamic> json) {
    return ProviderSecretsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ProviderSecretsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminProviderSecretsResponse.fromJson(map);
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

class ProviderSecretsUpdateResult {
  final String code;
  final AdminProviderSecretMutationResponse? data;
  final String? msg;

  ProviderSecretsUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ProviderSecretsUpdateResult.fromJson(Map<String, dynamic> json) {
    return ProviderSecretsUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ProviderSecretsUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminProviderSecretMutationResponse.fromJson(map);
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

class ProviderWalletAccountsListResult {
  final String code;
  final ServiceProviderCollectionResponse? data;
  final String? msg;

  ProviderWalletAccountsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ProviderWalletAccountsListResult.fromJson(Map<String, dynamic> json) {
    return ProviderWalletAccountsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ProviderWalletAccountsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ServiceProviderCollectionResponse.fromJson(map);
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

class RateLimitBucketsListResult {
  final String code;
  final MessagingCollectionResponse? data;
  final String? msg;

  RateLimitBucketsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory RateLimitBucketsListResult.fromJson(Map<String, dynamic> json) {
    return RateLimitBucketsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('RateLimitBucketsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : MessagingCollectionResponse.fromJson(map);
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

class RateLimitsApiKeysCreateResult {
  final String code;
  final AdminRateLimitMutationResponse? data;
  final String? msg;

  RateLimitsApiKeysCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory RateLimitsApiKeysCreateResult.fromJson(Map<String, dynamic> json) {
    return RateLimitsApiKeysCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('RateLimitsApiKeysCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminRateLimitMutationResponse.fromJson(map);
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

class RateLimitsApiKeysListResult {
  final String code;
  final AdminTokenLimitsResponse? data;
  final String? msg;

  RateLimitsApiKeysListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory RateLimitsApiKeysListResult.fromJson(Map<String, dynamic> json) {
    return RateLimitsApiKeysListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('RateLimitsApiKeysListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminTokenLimitsResponse.fromJson(map);
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

class RateLimitsIpCreateResult {
  final String code;
  final AdminRateLimitMutationResponse? data;
  final String? msg;

  RateLimitsIpCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory RateLimitsIpCreateResult.fromJson(Map<String, dynamic> json) {
    return RateLimitsIpCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('RateLimitsIpCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminRateLimitMutationResponse.fromJson(map);
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

class RateLimitsIpListResult {
  final String code;
  final AdminIpLimitsResponse? data;
  final String? msg;

  RateLimitsIpListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory RateLimitsIpListResult.fromJson(Map<String, dynamic> json) {
    return RateLimitsIpListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('RateLimitsIpListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminIpLimitsResponse.fromJson(map);
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

class RateLimitsModelsCreateResult {
  final String code;
  final AdminRateLimitMutationResponse? data;
  final String? msg;

  RateLimitsModelsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory RateLimitsModelsCreateResult.fromJson(Map<String, dynamic> json) {
    return RateLimitsModelsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('RateLimitsModelsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminRateLimitMutationResponse.fromJson(map);
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

class RateLimitsModelsListResult {
  final String code;
  final AdminModelLimitsResponse? data;
  final String? msg;

  RateLimitsModelsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory RateLimitsModelsListResult.fromJson(Map<String, dynamic> json) {
    return RateLimitsModelsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('RateLimitsModelsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminModelLimitsResponse.fromJson(map);
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

class ReconciliationRunsListResult {
  final String code;
  final ServiceProviderCollectionResponse? data;
  final String? msg;

  ReconciliationRunsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ReconciliationRunsListResult.fromJson(Map<String, dynamic> json) {
    return ReconciliationRunsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ReconciliationRunsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ServiceProviderCollectionResponse.fromJson(map);
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

class RecordsListResult {
  final String code;
  final AdminRecordLogsResponse? data;
  final String? msg;

  RecordsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory RecordsListResult.fromJson(Map<String, dynamic> json) {
    return RecordsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('RecordsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminRecordLogsResponse.fromJson(map);
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

class RelationsListResult {
  final String code;
  final ServiceProviderCollectionResponse? data;
  final String? msg;

  RelationsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory RelationsListResult.fromJson(Map<String, dynamic> json) {
    return RelationsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('RelationsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ServiceProviderCollectionResponse.fromJson(map);
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

class RevisionsPublishResult {
  final String code;
  final AdminMcpServerRevisionMutationResponse? data;
  final String? msg;

  RevisionsPublishResult({
    required this.code,
    this.data,
    this.msg
  });

  factory RevisionsPublishResult.fromJson(Map<String, dynamic> json) {
    return RevisionsPublishResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('RevisionsPublishResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminMcpServerRevisionMutationResponse.fromJson(map);
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

class RiskEventsListResult {
  final String code;
  final ServiceProviderCollectionResponse? data;
  final String? msg;

  RiskEventsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory RiskEventsListResult.fromJson(Map<String, dynamic> json) {
    return RiskEventsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('RiskEventsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ServiceProviderCollectionResponse.fromJson(map);
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

class RouteExplainCreateResult {
  final String code;
  final AdminRuntimeRouteExplainResponse? data;
  final String? msg;

  RouteExplainCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory RouteExplainCreateResult.fromJson(Map<String, dynamic> json) {
    return RouteExplainCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('RouteExplainCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminRuntimeRouteExplainResponse.fromJson(map);
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

class RouteRulesCreateResult {
  final String code;
  final MessagingMutationResponse? data;
  final String? msg;

  RouteRulesCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory RouteRulesCreateResult.fromJson(Map<String, dynamic> json) {
    return RouteRulesCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('RouteRulesCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : MessagingMutationResponse.fromJson(map);
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

class RouteRulesListResult {
  final String code;
  final MessagingCollectionResponse? data;
  final String? msg;

  RouteRulesListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory RouteRulesListResult.fromJson(Map<String, dynamic> json) {
    return RouteRulesListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('RouteRulesListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : MessagingCollectionResponse.fromJson(map);
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

class RuntimeRegionSettingsRetrieveResult {
  final String code;
  final AdminRuntimeRegionSettingsResponse? data;
  final String? msg;

  RuntimeRegionSettingsRetrieveResult({
    required this.code,
    this.data,
    this.msg
  });

  factory RuntimeRegionSettingsRetrieveResult.fromJson(Map<String, dynamic> json) {
    return RuntimeRegionSettingsRetrieveResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('RuntimeRegionSettingsRetrieveResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminRuntimeRegionSettingsResponse.fromJson(map);
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

class RuntimeRegionSettingsUpdateResult {
  final String code;
  final AdminRuntimeRegionSettingsResponse? data;
  final String? msg;

  RuntimeRegionSettingsUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory RuntimeRegionSettingsUpdateResult.fromJson(Map<String, dynamic> json) {
    return RuntimeRegionSettingsUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('RuntimeRegionSettingsUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminRuntimeRegionSettingsResponse.fromJson(map);
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

class SendRequestsListResult {
  final String code;
  final MessagingCollectionResponse? data;
  final String? msg;

  SendRequestsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory SendRequestsListResult.fromJson(Map<String, dynamic> json) {
    return SendRequestsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('SendRequestsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : MessagingCollectionResponse.fromJson(map);
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

class SenderIdentitiesCreateResult {
  final String code;
  final MessagingMutationResponse? data;
  final String? msg;

  SenderIdentitiesCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory SenderIdentitiesCreateResult.fromJson(Map<String, dynamic> json) {
    return SenderIdentitiesCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('SenderIdentitiesCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : MessagingMutationResponse.fromJson(map);
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

class SenderIdentitiesListResult {
  final String code;
  final MessagingCollectionResponse? data;
  final String? msg;

  SenderIdentitiesListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory SenderIdentitiesListResult.fromJson(Map<String, dynamic> json) {
    return SenderIdentitiesListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('SenderIdentitiesListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : MessagingCollectionResponse.fromJson(map);
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

class ServersBindingsCreateResult {
  final String code;
  final AdminMcpBindingMutationResponse? data;
  final String? msg;

  ServersBindingsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ServersBindingsCreateResult.fromJson(Map<String, dynamic> json) {
    return ServersBindingsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ServersBindingsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminMcpBindingMutationResponse.fromJson(map);
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

class ServersBindingsListResult {
  final String code;
  final AdminMcpBindingListResponse? data;
  final String? msg;

  ServersBindingsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ServersBindingsListResult.fromJson(Map<String, dynamic> json) {
    return ServersBindingsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ServersBindingsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminMcpBindingListResponse.fromJson(map);
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

class ServersBindingsUpdateResult {
  final String code;
  final AdminMcpBindingMutationResponse? data;
  final String? msg;

  ServersBindingsUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ServersBindingsUpdateResult.fromJson(Map<String, dynamic> json) {
    return ServersBindingsUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ServersBindingsUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminMcpBindingMutationResponse.fromJson(map);
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

class ServersCreateResult {
  final String code;
  final AdminMcpServerMutationResponse? data;
  final String? msg;

  ServersCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ServersCreateResult.fromJson(Map<String, dynamic> json) {
    return ServersCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ServersCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminMcpServerMutationResponse.fromJson(map);
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

class ServersHealthChecksCreateResult {
  final String code;
  final AdminMcpHealthCheckResponse? data;
  final String? msg;

  ServersHealthChecksCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ServersHealthChecksCreateResult.fromJson(Map<String, dynamic> json) {
    return ServersHealthChecksCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ServersHealthChecksCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminMcpHealthCheckResponse.fromJson(map);
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

class ServersListResult {
  final String code;
  final AdminMcpServerListResponse? data;
  final String? msg;

  ServersListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ServersListResult.fromJson(Map<String, dynamic> json) {
    return ServersListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ServersListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminMcpServerListResponse.fromJson(map);
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

class ServersRetrieveResult {
  final String code;
  final AdminMcpServerMutationResponse? data;
  final String? msg;

  ServersRetrieveResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ServersRetrieveResult.fromJson(Map<String, dynamic> json) {
    return ServersRetrieveResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ServersRetrieveResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminMcpServerMutationResponse.fromJson(map);
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

class ServersRevisionsCreateResult {
  final String code;
  final AdminMcpServerRevisionMutationResponse? data;
  final String? msg;

  ServersRevisionsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ServersRevisionsCreateResult.fromJson(Map<String, dynamic> json) {
    return ServersRevisionsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ServersRevisionsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminMcpServerRevisionMutationResponse.fromJson(map);
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

class ServersRevisionsListResult {
  final String code;
  final AdminMcpServerRevisionListResponse? data;
  final String? msg;

  ServersRevisionsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ServersRevisionsListResult.fromJson(Map<String, dynamic> json) {
    return ServersRevisionsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ServersRevisionsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminMcpServerRevisionListResponse.fromJson(map);
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

class ServersToolsListResult {
  final String code;
  final AdminMcpToolListResponse? data;
  final String? msg;

  ServersToolsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ServersToolsListResult.fromJson(Map<String, dynamic> json) {
    return ServersToolsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ServersToolsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminMcpToolListResponse.fromJson(map);
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

class ServersToolsRefreshResult {
  final String code;
  final AdminMcpDiscoveryResponse? data;
  final String? msg;

  ServersToolsRefreshResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ServersToolsRefreshResult.fromJson(Map<String, dynamic> json) {
    return ServersToolsRefreshResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ServersToolsRefreshResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminMcpDiscoveryResponse.fromJson(map);
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

class ServersUpdateResult {
  final String code;
  final AdminMcpServerMutationResponse? data;
  final String? msg;

  ServersUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ServersUpdateResult.fromJson(Map<String, dynamic> json) {
    return ServersUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ServersUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminMcpServerMutationResponse.fromJson(map);
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

class ServiceNodesCreateResult {
  final String code;
  final AdminServiceNodeMutationResponse? data;
  final String? msg;

  ServiceNodesCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ServiceNodesCreateResult.fromJson(Map<String, dynamic> json) {
    return ServiceNodesCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ServiceNodesCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminServiceNodeMutationResponse.fromJson(map);
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

class ServiceNodesDeleteResult {
  final String code;
  final AdminServiceNodeDeleteResponse? data;
  final String? msg;

  ServiceNodesDeleteResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ServiceNodesDeleteResult.fromJson(Map<String, dynamic> json) {
    return ServiceNodesDeleteResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ServiceNodesDeleteResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminServiceNodeDeleteResponse.fromJson(map);
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

class ServiceNodesListResult {
  final String code;
  final AdminServiceNodesResponse? data;
  final String? msg;

  ServiceNodesListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ServiceNodesListResult.fromJson(Map<String, dynamic> json) {
    return ServiceNodesListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ServiceNodesListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminServiceNodesResponse.fromJson(map);
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

class ServiceNodesStatusUpdateResult {
  final String code;
  final AdminServiceNodeMutationResponse? data;
  final String? msg;

  ServiceNodesStatusUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ServiceNodesStatusUpdateResult.fromJson(Map<String, dynamic> json) {
    return ServiceNodesStatusUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ServiceNodesStatusUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminServiceNodeMutationResponse.fromJson(map);
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

class ServiceNodesUpdateResult {
  final String code;
  final AdminServiceNodeMutationResponse? data;
  final String? msg;

  ServiceNodesUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ServiceNodesUpdateResult.fromJson(Map<String, dynamic> json) {
    return ServiceNodesUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ServiceNodesUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminServiceNodeMutationResponse.fromJson(map);
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

class ServiceProviderCollectionResponse {
  final List<Map<String, dynamic>> items;
  final String page;
  final String pageSize;
  final String total;

  ServiceProviderCollectionResponse({
    required this.items,
    required this.page,
    required this.pageSize,
    required this.total
  });

  factory ServiceProviderCollectionResponse.fromJson(Map<String, dynamic> json) {
    return ServiceProviderCollectionResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('ServiceProviderCollectionResponse.items is required');
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
      page: (() {
        final value = json['page']?.toString();
        if (value == null) {
          throw FormatException('ServiceProviderCollectionResponse.page is required');
        }
        return value;
      })(),
      pageSize: (() {
        final value = json['pageSize']?.toString();
        if (value == null) {
          throw FormatException('ServiceProviderCollectionResponse.pageSize is required');
        }
        return value;
      })(),
      total: (() {
        final value = json['total']?.toString();
        if (value == null) {
          throw FormatException('ServiceProviderCollectionResponse.total is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
      'page': page,
      'pageSize': pageSize,
      'total': total,
    };
  }
}

class ServiceProviderDashboardResponse {
  final Map<String, dynamic> item;

  ServiceProviderDashboardResponse({
    required this.item
  });

  factory ServiceProviderDashboardResponse.fromJson(Map<String, dynamic> json) {
    return ServiceProviderDashboardResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('ServiceProviderDashboardResponse.item is required');
        }
        return map;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item,
    };
  }
}

class ServiceProviderDownstreamCreateRequest {
  final String? defaultCurrency;
  final String? defaultMultiplier;
  final String displayName;
  final String? pricePlanCode;
  final String providerNo;
  final String? providerType;
  final String sellerProviderId;
  final String? settlementMode;

  ServiceProviderDownstreamCreateRequest({
    this.defaultCurrency,
    this.defaultMultiplier,
    required this.displayName,
    this.pricePlanCode,
    required this.providerNo,
    this.providerType,
    required this.sellerProviderId,
    this.settlementMode
  });

  factory ServiceProviderDownstreamCreateRequest.fromJson(Map<String, dynamic> json) {
    return ServiceProviderDownstreamCreateRequest(
      defaultCurrency: json['defaultCurrency']?.toString(),
      defaultMultiplier: json['defaultMultiplier']?.toString(),
      displayName: (() {
        final value = json['displayName']?.toString();
        if (value == null) {
          throw FormatException('ServiceProviderDownstreamCreateRequest.displayName is required');
        }
        return value;
      })(),
      pricePlanCode: json['pricePlanCode']?.toString(),
      providerNo: (() {
        final value = json['providerNo']?.toString();
        if (value == null) {
          throw FormatException('ServiceProviderDownstreamCreateRequest.providerNo is required');
        }
        return value;
      })(),
      providerType: json['providerType']?.toString(),
      sellerProviderId: (() {
        final value = json['sellerProviderId']?.toString();
        if (value == null) {
          throw FormatException('ServiceProviderDownstreamCreateRequest.sellerProviderId is required');
        }
        return value;
      })(),
      settlementMode: json['settlementMode']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'defaultCurrency': defaultCurrency,
      'defaultMultiplier': defaultMultiplier,
      'displayName': displayName,
      'pricePlanCode': pricePlanCode,
      'providerNo': providerNo,
      'providerType': providerType,
      'sellerProviderId': sellerProviderId,
      'settlementMode': settlementMode,
    };
  }
}

class ServiceProviderDownstreamMutationResponse {
  final Map<String, dynamic> item;

  ServiceProviderDownstreamMutationResponse({
    required this.item
  });

  factory ServiceProviderDownstreamMutationResponse.fromJson(Map<String, dynamic> json) {
    return ServiceProviderDownstreamMutationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('ServiceProviderDownstreamMutationResponse.item is required');
        }
        return map;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item,
    };
  }
}

class ServiceProviderPriceSimulationRequest {
  final String billingMeterCode;
  final String buyerProviderId;
  final String? catalogKey;
  final String? model;
  final String quantity;
  final String? tokenKind;

  ServiceProviderPriceSimulationRequest({
    required this.billingMeterCode,
    required this.buyerProviderId,
    this.catalogKey,
    this.model,
    required this.quantity,
    this.tokenKind
  });

  factory ServiceProviderPriceSimulationRequest.fromJson(Map<String, dynamic> json) {
    return ServiceProviderPriceSimulationRequest(
      billingMeterCode: (() {
        final value = json['billingMeterCode']?.toString();
        if (value == null) {
          throw FormatException('ServiceProviderPriceSimulationRequest.billingMeterCode is required');
        }
        return value;
      })(),
      buyerProviderId: (() {
        final value = json['buyerProviderId']?.toString();
        if (value == null) {
          throw FormatException('ServiceProviderPriceSimulationRequest.buyerProviderId is required');
        }
        return value;
      })(),
      catalogKey: json['catalogKey']?.toString(),
      model: json['model']?.toString(),
      quantity: (() {
        final value = json['quantity']?.toString();
        if (value == null) {
          throw FormatException('ServiceProviderPriceSimulationRequest.quantity is required');
        }
        return value;
      })(),
      tokenKind: json['tokenKind']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'billingMeterCode': billingMeterCode,
      'buyerProviderId': buyerProviderId,
      'catalogKey': catalogKey,
      'model': model,
      'quantity': quantity,
      'tokenKind': tokenKind,
    };
  }
}

class ServiceProviderPriceSimulationResponse {
  final Map<String, dynamic> item;

  ServiceProviderPriceSimulationResponse({
    required this.item
  });

  factory ServiceProviderPriceSimulationResponse.fromJson(Map<String, dynamic> json) {
    return ServiceProviderPriceSimulationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('ServiceProviderPriceSimulationResponse.item is required');
        }
        return map;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item,
    };
  }
}

class ServiceProviderPricingRuleCreateRequest {
  final String billingMeterCode;
  final String buyerProviderId;
  final String? catalogKey;
  final String? currency;
  final String? edgeId;
  final String minimumCharge;
  final String? model;
  final String? pricePlanId;
  final int? priority;
  final String sellerProviderId;
  final String? tokenKind;
  final String unitPrice;
  final String unitSize;

  ServiceProviderPricingRuleCreateRequest({
    required this.billingMeterCode,
    required this.buyerProviderId,
    this.catalogKey,
    this.currency,
    this.edgeId,
    required this.minimumCharge,
    this.model,
    this.pricePlanId,
    this.priority,
    required this.sellerProviderId,
    this.tokenKind,
    required this.unitPrice,
    required this.unitSize
  });

  factory ServiceProviderPricingRuleCreateRequest.fromJson(Map<String, dynamic> json) {
    return ServiceProviderPricingRuleCreateRequest(
      billingMeterCode: (() {
        final value = json['billingMeterCode']?.toString();
        if (value == null) {
          throw FormatException('ServiceProviderPricingRuleCreateRequest.billingMeterCode is required');
        }
        return value;
      })(),
      buyerProviderId: (() {
        final value = json['buyerProviderId']?.toString();
        if (value == null) {
          throw FormatException('ServiceProviderPricingRuleCreateRequest.buyerProviderId is required');
        }
        return value;
      })(),
      catalogKey: json['catalogKey']?.toString(),
      currency: json['currency']?.toString(),
      edgeId: json['edgeId']?.toString(),
      minimumCharge: (() {
        final value = json['minimumCharge']?.toString();
        if (value == null) {
          throw FormatException('ServiceProviderPricingRuleCreateRequest.minimumCharge is required');
        }
        return value;
      })(),
      model: json['model']?.toString(),
      pricePlanId: json['pricePlanId']?.toString(),
      priority: json['priority'] is int ? json['priority'] : null,
      sellerProviderId: (() {
        final value = json['sellerProviderId']?.toString();
        if (value == null) {
          throw FormatException('ServiceProviderPricingRuleCreateRequest.sellerProviderId is required');
        }
        return value;
      })(),
      tokenKind: json['tokenKind']?.toString(),
      unitPrice: (() {
        final value = json['unitPrice']?.toString();
        if (value == null) {
          throw FormatException('ServiceProviderPricingRuleCreateRequest.unitPrice is required');
        }
        return value;
      })(),
      unitSize: (() {
        final value = json['unitSize']?.toString();
        if (value == null) {
          throw FormatException('ServiceProviderPricingRuleCreateRequest.unitSize is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'billingMeterCode': billingMeterCode,
      'buyerProviderId': buyerProviderId,
      'catalogKey': catalogKey,
      'currency': currency,
      'edgeId': edgeId,
      'minimumCharge': minimumCharge,
      'model': model,
      'pricePlanId': pricePlanId,
      'priority': priority,
      'sellerProviderId': sellerProviderId,
      'tokenKind': tokenKind,
      'unitPrice': unitPrice,
      'unitSize': unitSize,
    };
  }
}

class ServiceProviderPricingRuleMutationResponse {
  final Map<String, dynamic> item;

  ServiceProviderPricingRuleMutationResponse({
    required this.item
  });

  factory ServiceProviderPricingRuleMutationResponse.fromJson(Map<String, dynamic> json) {
    return ServiceProviderPricingRuleMutationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('ServiceProviderPricingRuleMutationResponse.item is required');
        }
        return map;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item,
    };
  }
}

class ServiceProviderPricingRuleUpdateRequest {
  final String? minimumCharge;
  final int? priority;
  final String? status;
  final String? unitPrice;
  final String? unitSize;

  ServiceProviderPricingRuleUpdateRequest({
    this.minimumCharge,
    this.priority,
    this.status,
    this.unitPrice,
    this.unitSize
  });

  factory ServiceProviderPricingRuleUpdateRequest.fromJson(Map<String, dynamic> json) {
    return ServiceProviderPricingRuleUpdateRequest(
      minimumCharge: json['minimumCharge']?.toString(),
      priority: json['priority'] is int ? json['priority'] : null,
      status: json['status']?.toString(),
      unitPrice: json['unitPrice']?.toString(),
      unitSize: json['unitSize']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'minimumCharge': minimumCharge,
      'priority': priority,
      'status': status,
      'unitPrice': unitPrice,
      'unitSize': unitSize,
    };
  }
}

class SetStorageDefaultBucketRequest {
  final String bucketId;
  final String reason;

  SetStorageDefaultBucketRequest({
    required this.bucketId,
    required this.reason
  });

  factory SetStorageDefaultBucketRequest.fromJson(Map<String, dynamic> json) {
    return SetStorageDefaultBucketRequest(
      bucketId: (() {
        final value = json['bucketId']?.toString();
        if (value == null) {
          throw FormatException('SetStorageDefaultBucketRequest.bucketId is required');
        }
        return value;
      })(),
      reason: (() {
        final value = json['reason']?.toString();
        if (value == null) {
          throw FormatException('SetStorageDefaultBucketRequest.reason is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bucketId': bucketId,
      'reason': reason,
    };
  }
}

class SiteCatalogListResult {
  final String code;
  final AdminSitesResponse? data;
  final String? msg;

  SiteCatalogListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory SiteCatalogListResult.fromJson(Map<String, dynamic> json) {
    return SiteCatalogListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('SiteCatalogListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminSitesResponse.fromJson(map);
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

class SiteChannelsListResult {
  final String code;
  final AdminSiteChannelsResponse? data;
  final String? msg;

  SiteChannelsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory SiteChannelsListResult.fromJson(Map<String, dynamic> json) {
    return SiteChannelsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('SiteChannelsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminSiteChannelsResponse.fromJson(map);
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

class SiteCreateResult {
  final String code;
  final AdminSiteMutationResponse? data;
  final String? msg;

  SiteCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory SiteCreateResult.fromJson(Map<String, dynamic> json) {
    return SiteCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('SiteCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminSiteMutationResponse.fromJson(map);
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

class SiteDeleteResult {
  final String code;
  final AdminSiteDeleteResponse? data;
  final String? msg;

  SiteDeleteResult({
    required this.code,
    this.data,
    this.msg
  });

  factory SiteDeleteResult.fromJson(Map<String, dynamic> json) {
    return SiteDeleteResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('SiteDeleteResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminSiteDeleteResponse.fromJson(map);
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

class SiteSettingsRetrieveResult {
  final String code;
  final AdminSiteSettingsResponse? data;
  final String? msg;

  SiteSettingsRetrieveResult({
    required this.code,
    this.data,
    this.msg
  });

  factory SiteSettingsRetrieveResult.fromJson(Map<String, dynamic> json) {
    return SiteSettingsRetrieveResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('SiteSettingsRetrieveResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminSiteSettingsResponse.fromJson(map);
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

class SiteSettingsUpdateResult {
  final String code;
  final AdminSiteSettingsResponse? data;
  final String? msg;

  SiteSettingsUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory SiteSettingsUpdateResult.fromJson(Map<String, dynamic> json) {
    return SiteSettingsUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('SiteSettingsUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminSiteSettingsResponse.fromJson(map);
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

class SiteUpdateResult {
  final String code;
  final AdminSiteMutationResponse? data;
  final String? msg;

  SiteUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory SiteUpdateResult.fromJson(Map<String, dynamic> json) {
    return SiteUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('SiteUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminSiteMutationResponse.fromJson(map);
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

class StatementsListResult {
  final String code;
  final ServiceProviderCollectionResponse? data;
  final String? msg;

  StatementsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory StatementsListResult.fromJson(Map<String, dynamic> json) {
    return StatementsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('StatementsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ServiceProviderCollectionResponse.fromJson(map);
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

class StorageBucketConfig {
  final bool? blockPublicAccess;
  final String bucketName;
  final String? bucketRegion;
  final String? createdAt;
  final String? defaultEncryptionMode;
  final String? defaultStorageClass;
  final String? encryption;
  final String id;
  final String? kmsKeyRef;
  final bool? lifecycleEnabled;
  final String logicalScope;
  final String? objectKeyPrefix;
  final bool? objectLockEnabled;
  final String providerCode;
  final String providerId;
  final bool? publicAccessBlocked;
  final String status;
  final String? storageClass;
  final String? updatedAt;
  final bool? versioningEnabled;

  StorageBucketConfig({
    this.blockPublicAccess,
    required this.bucketName,
    this.bucketRegion,
    this.createdAt,
    this.defaultEncryptionMode,
    this.defaultStorageClass,
    this.encryption,
    required this.id,
    this.kmsKeyRef,
    this.lifecycleEnabled,
    required this.logicalScope,
    this.objectKeyPrefix,
    this.objectLockEnabled,
    required this.providerCode,
    required this.providerId,
    this.publicAccessBlocked,
    required this.status,
    this.storageClass,
    this.updatedAt,
    this.versioningEnabled
  });

  factory StorageBucketConfig.fromJson(Map<String, dynamic> json) {
    return StorageBucketConfig(
      blockPublicAccess: json['blockPublicAccess'] is bool ? json['blockPublicAccess'] : null,
      bucketName: (() {
        final value = json['bucketName']?.toString();
        if (value == null) {
          throw FormatException('StorageBucketConfig.bucketName is required');
        }
        return value;
      })(),
      bucketRegion: json['bucketRegion']?.toString(),
      createdAt: json['createdAt']?.toString(),
      defaultEncryptionMode: json['defaultEncryptionMode']?.toString(),
      defaultStorageClass: json['defaultStorageClass']?.toString(),
      encryption: json['encryption']?.toString(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('StorageBucketConfig.id is required');
        }
        return value;
      })(),
      kmsKeyRef: json['kmsKeyRef']?.toString(),
      lifecycleEnabled: json['lifecycleEnabled'] is bool ? json['lifecycleEnabled'] : null,
      logicalScope: (() {
        final value = json['logicalScope']?.toString();
        if (value == null) {
          throw FormatException('StorageBucketConfig.logicalScope is required');
        }
        return value;
      })(),
      objectKeyPrefix: json['objectKeyPrefix']?.toString(),
      objectLockEnabled: json['objectLockEnabled'] is bool ? json['objectLockEnabled'] : null,
      providerCode: (() {
        final value = json['providerCode']?.toString();
        if (value == null) {
          throw FormatException('StorageBucketConfig.providerCode is required');
        }
        return value;
      })(),
      providerId: (() {
        final value = json['providerId']?.toString();
        if (value == null) {
          throw FormatException('StorageBucketConfig.providerId is required');
        }
        return value;
      })(),
      publicAccessBlocked: json['publicAccessBlocked'] is bool ? json['publicAccessBlocked'] : null,
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('StorageBucketConfig.status is required');
        }
        return value;
      })(),
      storageClass: json['storageClass']?.toString(),
      updatedAt: json['updatedAt']?.toString(),
      versioningEnabled: json['versioningEnabled'] is bool ? json['versioningEnabled'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'blockPublicAccess': blockPublicAccess,
      'bucketName': bucketName,
      'bucketRegion': bucketRegion,
      'createdAt': createdAt,
      'defaultEncryptionMode': defaultEncryptionMode,
      'defaultStorageClass': defaultStorageClass,
      'encryption': encryption,
      'id': id,
      'kmsKeyRef': kmsKeyRef,
      'lifecycleEnabled': lifecycleEnabled,
      'logicalScope': logicalScope,
      'objectKeyPrefix': objectKeyPrefix,
      'objectLockEnabled': objectLockEnabled,
      'providerCode': providerCode,
      'providerId': providerId,
      'publicAccessBlocked': publicAccessBlocked,
      'status': status,
      'storageClass': storageClass,
      'updatedAt': updatedAt,
      'versioningEnabled': versioningEnabled,
    };
  }
}

class StorageBucketListResponse {
  final List<StorageBucketConfig> items;
  final String? nextCursor;
  final String requestId;

  StorageBucketListResponse({
    required this.items,
    this.nextCursor,
    required this.requestId
  });

  factory StorageBucketListResponse.fromJson(Map<String, dynamic> json) {
    return StorageBucketListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('StorageBucketListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : StorageBucketConfig.fromJson(map);
      })())
            .whereType<StorageBucketConfig>()
            .toList();
      })(),
      nextCursor: json['nextCursor']?.toString(),
      requestId: (() {
        final value = json['requestId']?.toString();
        if (value == null) {
          throw FormatException('StorageBucketListResponse.requestId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
      'nextCursor': nextCursor,
      'requestId': requestId,
    };
  }
}

class StorageBucketMutationResponse {
  final StorageBucketConfig bucket;
  final String requestId;

  StorageBucketMutationResponse({
    required this.bucket,
    required this.requestId
  });

  factory StorageBucketMutationResponse.fromJson(Map<String, dynamic> json) {
    return StorageBucketMutationResponse(
      bucket: (() {
        final map = _sdkworkAsMap(json['bucket']);
        if (map == null) {
          throw FormatException('StorageBucketMutationResponse.bucket is required');
        }
        return StorageBucketConfig.fromJson(map);
      })(),
      requestId: (() {
        final value = json['requestId']?.toString();
        if (value == null) {
          throw FormatException('StorageBucketMutationResponse.requestId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bucket': bucket.toJson(),
      'requestId': requestId,
    };
  }
}

class StorageDefaultBucketConfig {
  final String bucketId;
  final String bucketName;
  final String? dataResidencyRegion;
  final String id;
  final String logicalScope;
  final String providerCode;
  final String providerId;
  final String? providerType;
  final String? reason;
  final String? region;
  final String status;
  final String? updatedAt;

  StorageDefaultBucketConfig({
    required this.bucketId,
    required this.bucketName,
    this.dataResidencyRegion,
    required this.id,
    required this.logicalScope,
    required this.providerCode,
    required this.providerId,
    this.providerType,
    this.reason,
    this.region,
    required this.status,
    this.updatedAt
  });

  factory StorageDefaultBucketConfig.fromJson(Map<String, dynamic> json) {
    return StorageDefaultBucketConfig(
      bucketId: (() {
        final value = json['bucketId']?.toString();
        if (value == null) {
          throw FormatException('StorageDefaultBucketConfig.bucketId is required');
        }
        return value;
      })(),
      bucketName: (() {
        final value = json['bucketName']?.toString();
        if (value == null) {
          throw FormatException('StorageDefaultBucketConfig.bucketName is required');
        }
        return value;
      })(),
      dataResidencyRegion: json['dataResidencyRegion']?.toString(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('StorageDefaultBucketConfig.id is required');
        }
        return value;
      })(),
      logicalScope: (() {
        final value = json['logicalScope']?.toString();
        if (value == null) {
          throw FormatException('StorageDefaultBucketConfig.logicalScope is required');
        }
        return value;
      })(),
      providerCode: (() {
        final value = json['providerCode']?.toString();
        if (value == null) {
          throw FormatException('StorageDefaultBucketConfig.providerCode is required');
        }
        return value;
      })(),
      providerId: (() {
        final value = json['providerId']?.toString();
        if (value == null) {
          throw FormatException('StorageDefaultBucketConfig.providerId is required');
        }
        return value;
      })(),
      providerType: json['providerType']?.toString(),
      reason: json['reason']?.toString(),
      region: json['region']?.toString(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('StorageDefaultBucketConfig.status is required');
        }
        return value;
      })(),
      updatedAt: json['updatedAt']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bucketId': bucketId,
      'bucketName': bucketName,
      'dataResidencyRegion': dataResidencyRegion,
      'id': id,
      'logicalScope': logicalScope,
      'providerCode': providerCode,
      'providerId': providerId,
      'providerType': providerType,
      'reason': reason,
      'region': region,
      'status': status,
      'updatedAt': updatedAt,
    };
  }
}

class StorageDefaultBucketListResponse {
  final List<StorageDefaultBucketConfig> items;
  final String requestId;

  StorageDefaultBucketListResponse({
    required this.items,
    required this.requestId
  });

  factory StorageDefaultBucketListResponse.fromJson(Map<String, dynamic> json) {
    return StorageDefaultBucketListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('StorageDefaultBucketListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : StorageDefaultBucketConfig.fromJson(map);
      })())
            .whereType<StorageDefaultBucketConfig>()
            .toList();
      })(),
      requestId: (() {
        final value = json['requestId']?.toString();
        if (value == null) {
          throw FormatException('StorageDefaultBucketListResponse.requestId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
      'requestId': requestId,
    };
  }
}

class StorageDefaultBucketMutationResponse {
  final StorageDefaultBucketConfig defaultBucket;
  final String requestId;

  StorageDefaultBucketMutationResponse({
    required this.defaultBucket,
    required this.requestId
  });

  factory StorageDefaultBucketMutationResponse.fromJson(Map<String, dynamic> json) {
    return StorageDefaultBucketMutationResponse(
      defaultBucket: (() {
        final map = _sdkworkAsMap(json['defaultBucket']);
        if (map == null) {
          throw FormatException('StorageDefaultBucketMutationResponse.defaultBucket is required');
        }
        return StorageDefaultBucketConfig.fromJson(map);
      })(),
      requestId: (() {
        final value = json['requestId']?.toString();
        if (value == null) {
          throw FormatException('StorageDefaultBucketMutationResponse.requestId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'defaultBucket': defaultBucket.toJson(),
      'requestId': requestId,
    };
  }
}

class StorageGarbageCollectionJob {
  final String? candidateCount;
  final String? createdAt;
  final bool? dryRun;
  final String id;
  final String jobId;
  final String? jobType;
  final String? retention;
  final String status;
  final String? target;

  StorageGarbageCollectionJob({
    this.candidateCount,
    this.createdAt,
    this.dryRun,
    required this.id,
    required this.jobId,
    this.jobType,
    this.retention,
    required this.status,
    this.target
  });

  factory StorageGarbageCollectionJob.fromJson(Map<String, dynamic> json) {
    return StorageGarbageCollectionJob(
      candidateCount: json['candidateCount']?.toString(),
      createdAt: json['createdAt']?.toString(),
      dryRun: json['dryRun'] is bool ? json['dryRun'] : null,
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('StorageGarbageCollectionJob.id is required');
        }
        return value;
      })(),
      jobId: (() {
        final value = json['jobId']?.toString();
        if (value == null) {
          throw FormatException('StorageGarbageCollectionJob.jobId is required');
        }
        return value;
      })(),
      jobType: json['jobType']?.toString(),
      retention: json['retention']?.toString(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('StorageGarbageCollectionJob.status is required');
        }
        return value;
      })(),
      target: json['target']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'candidateCount': candidateCount,
      'createdAt': createdAt,
      'dryRun': dryRun,
      'id': id,
      'jobId': jobId,
      'jobType': jobType,
      'retention': retention,
      'status': status,
      'target': target,
    };
  }
}

class StorageGarbageCollectionJobListResponse {
  final List<StorageGarbageCollectionJob> items;
  final String? nextCursor;
  final String requestId;

  StorageGarbageCollectionJobListResponse({
    required this.items,
    this.nextCursor,
    required this.requestId
  });

  factory StorageGarbageCollectionJobListResponse.fromJson(Map<String, dynamic> json) {
    return StorageGarbageCollectionJobListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('StorageGarbageCollectionJobListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : StorageGarbageCollectionJob.fromJson(map);
      })())
            .whereType<StorageGarbageCollectionJob>()
            .toList();
      })(),
      nextCursor: json['nextCursor']?.toString(),
      requestId: (() {
        final value = json['requestId']?.toString();
        if (value == null) {
          throw FormatException('StorageGarbageCollectionJobListResponse.requestId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
      'nextCursor': nextCursor,
      'requestId': requestId,
    };
  }
}

class StorageGarbageCollectionJobMutationResponse {
  final StorageGarbageCollectionJob job;
  final String requestId;

  StorageGarbageCollectionJobMutationResponse({
    required this.job,
    required this.requestId
  });

  factory StorageGarbageCollectionJobMutationResponse.fromJson(Map<String, dynamic> json) {
    return StorageGarbageCollectionJobMutationResponse(
      job: (() {
        final map = _sdkworkAsMap(json['job']);
        if (map == null) {
          throw FormatException('StorageGarbageCollectionJobMutationResponse.job is required');
        }
        return StorageGarbageCollectionJob.fromJson(map);
      })(),
      requestId: (() {
        final value = json['requestId']?.toString();
        if (value == null) {
          throw FormatException('StorageGarbageCollectionJobMutationResponse.requestId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'job': job.toJson(),
      'requestId': requestId,
    };
  }
}

class StorageProviderConfig {
  final String? createdAt;
  final String credentialRef;
  final String? endpoint;
  final String? endpointUrl;
  final String health;
  final String? healthStatus;
  final String id;
  final String? lastHealthCheckAt;
  final bool? lifecycle;
  final bool? multipart;
  final bool? objectLock;
  final bool? pathStyleEnabled;
  final String providerCode;
  final String providerType;
  final String? region;
  final String status;
  final bool? supportsLifecycle;
  final bool? supportsMultipart;
  final bool? supportsObjectLock;
  final String? updatedAt;

  StorageProviderConfig({
    this.createdAt,
    required this.credentialRef,
    this.endpoint,
    this.endpointUrl,
    required this.health,
    this.healthStatus,
    required this.id,
    this.lastHealthCheckAt,
    this.lifecycle,
    this.multipart,
    this.objectLock,
    this.pathStyleEnabled,
    required this.providerCode,
    required this.providerType,
    this.region,
    required this.status,
    this.supportsLifecycle,
    this.supportsMultipart,
    this.supportsObjectLock,
    this.updatedAt
  });

  factory StorageProviderConfig.fromJson(Map<String, dynamic> json) {
    return StorageProviderConfig(
      createdAt: json['createdAt']?.toString(),
      credentialRef: (() {
        final value = json['credentialRef']?.toString();
        if (value == null) {
          throw FormatException('StorageProviderConfig.credentialRef is required');
        }
        return value;
      })(),
      endpoint: json['endpoint']?.toString(),
      endpointUrl: json['endpointUrl']?.toString(),
      health: (() {
        final value = json['health']?.toString();
        if (value == null) {
          throw FormatException('StorageProviderConfig.health is required');
        }
        return value;
      })(),
      healthStatus: json['healthStatus']?.toString(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('StorageProviderConfig.id is required');
        }
        return value;
      })(),
      lastHealthCheckAt: json['lastHealthCheckAt']?.toString(),
      lifecycle: json['lifecycle'] is bool ? json['lifecycle'] : null,
      multipart: json['multipart'] is bool ? json['multipart'] : null,
      objectLock: json['objectLock'] is bool ? json['objectLock'] : null,
      pathStyleEnabled: json['pathStyleEnabled'] is bool ? json['pathStyleEnabled'] : null,
      providerCode: (() {
        final value = json['providerCode']?.toString();
        if (value == null) {
          throw FormatException('StorageProviderConfig.providerCode is required');
        }
        return value;
      })(),
      providerType: (() {
        final value = json['providerType']?.toString();
        if (value == null) {
          throw FormatException('StorageProviderConfig.providerType is required');
        }
        return value;
      })(),
      region: json['region']?.toString(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('StorageProviderConfig.status is required');
        }
        return value;
      })(),
      supportsLifecycle: json['supportsLifecycle'] is bool ? json['supportsLifecycle'] : null,
      supportsMultipart: json['supportsMultipart'] is bool ? json['supportsMultipart'] : null,
      supportsObjectLock: json['supportsObjectLock'] is bool ? json['supportsObjectLock'] : null,
      updatedAt: json['updatedAt']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'createdAt': createdAt,
      'credentialRef': credentialRef,
      'endpoint': endpoint,
      'endpointUrl': endpointUrl,
      'health': health,
      'healthStatus': healthStatus,
      'id': id,
      'lastHealthCheckAt': lastHealthCheckAt,
      'lifecycle': lifecycle,
      'multipart': multipart,
      'objectLock': objectLock,
      'pathStyleEnabled': pathStyleEnabled,
      'providerCode': providerCode,
      'providerType': providerType,
      'region': region,
      'status': status,
      'supportsLifecycle': supportsLifecycle,
      'supportsMultipart': supportsMultipart,
      'supportsObjectLock': supportsObjectLock,
      'updatedAt': updatedAt,
    };
  }
}

class StorageProviderHealthCheckResponse {
  final String? checkedAt;
  final bool healthy;
  final String providerId;
  final String requestId;
  final String status;

  StorageProviderHealthCheckResponse({
    this.checkedAt,
    required this.healthy,
    required this.providerId,
    required this.requestId,
    required this.status
  });

  factory StorageProviderHealthCheckResponse.fromJson(Map<String, dynamic> json) {
    return StorageProviderHealthCheckResponse(
      checkedAt: json['checkedAt']?.toString(),
      healthy: (() {
        final value = json['healthy'];
        if (value is! bool) {
          throw FormatException('StorageProviderHealthCheckResponse.healthy is required');
        }
        return value;
      })(),
      providerId: (() {
        final value = json['providerId']?.toString();
        if (value == null) {
          throw FormatException('StorageProviderHealthCheckResponse.providerId is required');
        }
        return value;
      })(),
      requestId: (() {
        final value = json['requestId']?.toString();
        if (value == null) {
          throw FormatException('StorageProviderHealthCheckResponse.requestId is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('StorageProviderHealthCheckResponse.status is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'checkedAt': checkedAt,
      'healthy': healthy,
      'providerId': providerId,
      'requestId': requestId,
      'status': status,
    };
  }
}

class StorageProviderListResponse {
  final List<StorageProviderConfig> items;
  final String requestId;

  StorageProviderListResponse({
    required this.items,
    required this.requestId
  });

  factory StorageProviderListResponse.fromJson(Map<String, dynamic> json) {
    return StorageProviderListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('StorageProviderListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : StorageProviderConfig.fromJson(map);
      })())
            .whereType<StorageProviderConfig>()
            .toList();
      })(),
      requestId: (() {
        final value = json['requestId']?.toString();
        if (value == null) {
          throw FormatException('StorageProviderListResponse.requestId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
      'requestId': requestId,
    };
  }
}

class StorageProviderMutationResponse {
  final StorageProviderConfig provider;
  final String requestId;

  StorageProviderMutationResponse({
    required this.provider,
    required this.requestId
  });

  factory StorageProviderMutationResponse.fromJson(Map<String, dynamic> json) {
    return StorageProviderMutationResponse(
      provider: (() {
        final map = _sdkworkAsMap(json['provider']);
        if (map == null) {
          throw FormatException('StorageProviderMutationResponse.provider is required');
        }
        return StorageProviderConfig.fromJson(map);
      })(),
      requestId: (() {
        final value = json['requestId']?.toString();
        if (value == null) {
          throw FormatException('StorageProviderMutationResponse.requestId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'provider': provider.toJson(),
      'requestId': requestId,
    };
  }
}

class StorageQuotaPolicy {
  final String? createdAt;
  final String? enforcement;
  final String id;
  final String? limit;
  final String quotaLimitBytes;
  final String scopeId;
  final String scopeType;
  final String? singleFileLimitBytes;
  final String status;
  final String? updatedAt;
  final String? used;
  final String usedBytes;

  StorageQuotaPolicy({
    this.createdAt,
    this.enforcement,
    required this.id,
    this.limit,
    required this.quotaLimitBytes,
    required this.scopeId,
    required this.scopeType,
    this.singleFileLimitBytes,
    required this.status,
    this.updatedAt,
    this.used,
    required this.usedBytes
  });

  factory StorageQuotaPolicy.fromJson(Map<String, dynamic> json) {
    return StorageQuotaPolicy(
      createdAt: json['createdAt']?.toString(),
      enforcement: json['enforcement']?.toString(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('StorageQuotaPolicy.id is required');
        }
        return value;
      })(),
      limit: json['limit']?.toString(),
      quotaLimitBytes: (() {
        final value = json['quotaLimitBytes']?.toString();
        if (value == null) {
          throw FormatException('StorageQuotaPolicy.quotaLimitBytes is required');
        }
        return value;
      })(),
      scopeId: (() {
        final value = json['scopeId']?.toString();
        if (value == null) {
          throw FormatException('StorageQuotaPolicy.scopeId is required');
        }
        return value;
      })(),
      scopeType: (() {
        final value = json['scopeType']?.toString();
        if (value == null) {
          throw FormatException('StorageQuotaPolicy.scopeType is required');
        }
        return value;
      })(),
      singleFileLimitBytes: json['singleFileLimitBytes']?.toString(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('StorageQuotaPolicy.status is required');
        }
        return value;
      })(),
      updatedAt: json['updatedAt']?.toString(),
      used: json['used']?.toString(),
      usedBytes: (() {
        final value = json['usedBytes']?.toString();
        if (value == null) {
          throw FormatException('StorageQuotaPolicy.usedBytes is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'createdAt': createdAt,
      'enforcement': enforcement,
      'id': id,
      'limit': limit,
      'quotaLimitBytes': quotaLimitBytes,
      'scopeId': scopeId,
      'scopeType': scopeType,
      'singleFileLimitBytes': singleFileLimitBytes,
      'status': status,
      'updatedAt': updatedAt,
      'used': used,
      'usedBytes': usedBytes,
    };
  }
}

class StorageQuotaPolicyListResponse {
  final List<StorageQuotaPolicy> items;
  final String requestId;

  StorageQuotaPolicyListResponse({
    required this.items,
    required this.requestId
  });

  factory StorageQuotaPolicyListResponse.fromJson(Map<String, dynamic> json) {
    return StorageQuotaPolicyListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('StorageQuotaPolicyListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : StorageQuotaPolicy.fromJson(map);
      })())
            .whereType<StorageQuotaPolicy>()
            .toList();
      })(),
      requestId: (() {
        final value = json['requestId']?.toString();
        if (value == null) {
          throw FormatException('StorageQuotaPolicyListResponse.requestId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
      'requestId': requestId,
    };
  }
}

class StorageQuotaPolicyMutationResponse {
  final StorageQuotaPolicy quotaPolicy;
  final String requestId;

  StorageQuotaPolicyMutationResponse({
    required this.quotaPolicy,
    required this.requestId
  });

  factory StorageQuotaPolicyMutationResponse.fromJson(Map<String, dynamic> json) {
    return StorageQuotaPolicyMutationResponse(
      quotaPolicy: (() {
        final map = _sdkworkAsMap(json['quotaPolicy']);
        if (map == null) {
          throw FormatException('StorageQuotaPolicyMutationResponse.quotaPolicy is required');
        }
        return StorageQuotaPolicy.fromJson(map);
      })(),
      requestId: (() {
        final value = json['requestId']?.toString();
        if (value == null) {
          throw FormatException('StorageQuotaPolicyMutationResponse.requestId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'quotaPolicy': quotaPolicy.toJson(),
      'requestId': requestId,
    };
  }
}

class StorageReconciliationRun {
  final String? bucketId;
  final String? bucketName;
  final bool? dryRun;
  final String? finishedAt;
  final String id;
  final String? issueCount;
  final String? issues;
  final String? providerCode;
  final String? providerId;
  final String runId;
  final String? runType;
  final String? scope;
  final String? startedAt;
  final String status;

  StorageReconciliationRun({
    this.bucketId,
    this.bucketName,
    this.dryRun,
    this.finishedAt,
    required this.id,
    this.issueCount,
    this.issues,
    this.providerCode,
    this.providerId,
    required this.runId,
    this.runType,
    this.scope,
    this.startedAt,
    required this.status
  });

  factory StorageReconciliationRun.fromJson(Map<String, dynamic> json) {
    return StorageReconciliationRun(
      bucketId: json['bucketId']?.toString(),
      bucketName: json['bucketName']?.toString(),
      dryRun: json['dryRun'] is bool ? json['dryRun'] : null,
      finishedAt: json['finishedAt']?.toString(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('StorageReconciliationRun.id is required');
        }
        return value;
      })(),
      issueCount: json['issueCount']?.toString(),
      issues: json['issues']?.toString(),
      providerCode: json['providerCode']?.toString(),
      providerId: json['providerId']?.toString(),
      runId: (() {
        final value = json['runId']?.toString();
        if (value == null) {
          throw FormatException('StorageReconciliationRun.runId is required');
        }
        return value;
      })(),
      runType: json['runType']?.toString(),
      scope: json['scope']?.toString(),
      startedAt: json['startedAt']?.toString(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('StorageReconciliationRun.status is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bucketId': bucketId,
      'bucketName': bucketName,
      'dryRun': dryRun,
      'finishedAt': finishedAt,
      'id': id,
      'issueCount': issueCount,
      'issues': issues,
      'providerCode': providerCode,
      'providerId': providerId,
      'runId': runId,
      'runType': runType,
      'scope': scope,
      'startedAt': startedAt,
      'status': status,
    };
  }
}

class StorageReconciliationRunListResponse {
  final List<StorageReconciliationRun> items;
  final String? nextCursor;
  final String requestId;

  StorageReconciliationRunListResponse({
    required this.items,
    this.nextCursor,
    required this.requestId
  });

  factory StorageReconciliationRunListResponse.fromJson(Map<String, dynamic> json) {
    return StorageReconciliationRunListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('StorageReconciliationRunListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : StorageReconciliationRun.fromJson(map);
      })())
            .whereType<StorageReconciliationRun>()
            .toList();
      })(),
      nextCursor: json['nextCursor']?.toString(),
      requestId: (() {
        final value = json['requestId']?.toString();
        if (value == null) {
          throw FormatException('StorageReconciliationRunListResponse.requestId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
      'nextCursor': nextCursor,
      'requestId': requestId,
    };
  }
}

class StorageReconciliationRunMutationResponse {
  final StorageReconciliationRun reconciliationRun;
  final String requestId;

  StorageReconciliationRunMutationResponse({
    required this.reconciliationRun,
    required this.requestId
  });

  factory StorageReconciliationRunMutationResponse.fromJson(Map<String, dynamic> json) {
    return StorageReconciliationRunMutationResponse(
      reconciliationRun: (() {
        final map = _sdkworkAsMap(json['reconciliationRun']);
        if (map == null) {
          throw FormatException('StorageReconciliationRunMutationResponse.reconciliationRun is required');
        }
        return StorageReconciliationRun.fromJson(map);
      })(),
      requestId: (() {
        final value = json['requestId']?.toString();
        if (value == null) {
          throw FormatException('StorageReconciliationRunMutationResponse.requestId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'reconciliationRun': reconciliationRun.toJson(),
      'requestId': requestId,
    };
  }
}

class StorageUsageCounter {
  final String fileCount;
  final String? files;
  final String id;
  final String? reserved;
  final String reservedBytes;
  final String? scope;
  final String scopeId;
  final String scopeType;
  final String? snapshotAt;
  final String? updatedAt;
  final String? used;
  final String usedBytes;

  StorageUsageCounter({
    required this.fileCount,
    this.files,
    required this.id,
    this.reserved,
    required this.reservedBytes,
    this.scope,
    required this.scopeId,
    required this.scopeType,
    this.snapshotAt,
    this.updatedAt,
    this.used,
    required this.usedBytes
  });

  factory StorageUsageCounter.fromJson(Map<String, dynamic> json) {
    return StorageUsageCounter(
      fileCount: (() {
        final value = json['fileCount']?.toString();
        if (value == null) {
          throw FormatException('StorageUsageCounter.fileCount is required');
        }
        return value;
      })(),
      files: json['files']?.toString(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('StorageUsageCounter.id is required');
        }
        return value;
      })(),
      reserved: json['reserved']?.toString(),
      reservedBytes: (() {
        final value = json['reservedBytes']?.toString();
        if (value == null) {
          throw FormatException('StorageUsageCounter.reservedBytes is required');
        }
        return value;
      })(),
      scope: json['scope']?.toString(),
      scopeId: (() {
        final value = json['scopeId']?.toString();
        if (value == null) {
          throw FormatException('StorageUsageCounter.scopeId is required');
        }
        return value;
      })(),
      scopeType: (() {
        final value = json['scopeType']?.toString();
        if (value == null) {
          throw FormatException('StorageUsageCounter.scopeType is required');
        }
        return value;
      })(),
      snapshotAt: json['snapshotAt']?.toString(),
      updatedAt: json['updatedAt']?.toString(),
      used: json['used']?.toString(),
      usedBytes: (() {
        final value = json['usedBytes']?.toString();
        if (value == null) {
          throw FormatException('StorageUsageCounter.usedBytes is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'fileCount': fileCount,
      'files': files,
      'id': id,
      'reserved': reserved,
      'reservedBytes': reservedBytes,
      'scope': scope,
      'scopeId': scopeId,
      'scopeType': scopeType,
      'snapshotAt': snapshotAt,
      'updatedAt': updatedAt,
      'used': used,
      'usedBytes': usedBytes,
    };
  }
}

class StorageUsageCounterListResponse {
  final List<StorageUsageCounter> items;
  final String? nextCursor;
  final String requestId;

  StorageUsageCounterListResponse({
    required this.items,
    this.nextCursor,
    required this.requestId
  });

  factory StorageUsageCounterListResponse.fromJson(Map<String, dynamic> json) {
    return StorageUsageCounterListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('StorageUsageCounterListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : StorageUsageCounter.fromJson(map);
      })())
            .whereType<StorageUsageCounter>()
            .toList();
      })(),
      nextCursor: json['nextCursor']?.toString(),
      requestId: (() {
        final value = json['requestId']?.toString();
        if (value == null) {
          throw FormatException('StorageUsageCounterListResponse.requestId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
      'nextCursor': nextCursor,
      'requestId': requestId,
    };
  }
}

class StorageUsageLedgerEntry {
  final String? deltaBytes;
  final String id;
  final String? occurredAt;
  final String? scopeId;
  final String? scopeType;

  StorageUsageLedgerEntry({
    this.deltaBytes,
    required this.id,
    this.occurredAt,
    this.scopeId,
    this.scopeType
  });

  factory StorageUsageLedgerEntry.fromJson(Map<String, dynamic> json) {
    return StorageUsageLedgerEntry(
      deltaBytes: json['deltaBytes']?.toString(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('StorageUsageLedgerEntry.id is required');
        }
        return value;
      })(),
      occurredAt: json['occurredAt']?.toString(),
      scopeId: json['scopeId']?.toString(),
      scopeType: json['scopeType']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'deltaBytes': deltaBytes,
      'id': id,
      'occurredAt': occurredAt,
      'scopeId': scopeId,
      'scopeType': scopeType,
    };
  }
}

class StorageUsageLedgerListResponse {
  final List<StorageUsageLedgerEntry> items;
  final String? nextCursor;
  final String requestId;

  StorageUsageLedgerListResponse({
    required this.items,
    this.nextCursor,
    required this.requestId
  });

  factory StorageUsageLedgerListResponse.fromJson(Map<String, dynamic> json) {
    return StorageUsageLedgerListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('StorageUsageLedgerListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : StorageUsageLedgerEntry.fromJson(map);
      })())
            .whereType<StorageUsageLedgerEntry>()
            .toList();
      })(),
      nextCursor: json['nextCursor']?.toString(),
      requestId: (() {
        final value = json['requestId']?.toString();
        if (value == null) {
          throw FormatException('StorageUsageLedgerListResponse.requestId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
      'nextCursor': nextCursor,
      'requestId': requestId,
    };
  }
}

class StorageUsageSnapshot {
  final String fileCount;
  final String id;
  final String? reservedBytes;
  final String? scope;
  final String scopeId;
  final String scopeType;
  final String snapshotAt;
  final String? snapshotType;
  final String usedBytes;

  StorageUsageSnapshot({
    required this.fileCount,
    required this.id,
    this.reservedBytes,
    this.scope,
    required this.scopeId,
    required this.scopeType,
    required this.snapshotAt,
    this.snapshotType,
    required this.usedBytes
  });

  factory StorageUsageSnapshot.fromJson(Map<String, dynamic> json) {
    return StorageUsageSnapshot(
      fileCount: (() {
        final value = json['fileCount']?.toString();
        if (value == null) {
          throw FormatException('StorageUsageSnapshot.fileCount is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('StorageUsageSnapshot.id is required');
        }
        return value;
      })(),
      reservedBytes: json['reservedBytes']?.toString(),
      scope: json['scope']?.toString(),
      scopeId: (() {
        final value = json['scopeId']?.toString();
        if (value == null) {
          throw FormatException('StorageUsageSnapshot.scopeId is required');
        }
        return value;
      })(),
      scopeType: (() {
        final value = json['scopeType']?.toString();
        if (value == null) {
          throw FormatException('StorageUsageSnapshot.scopeType is required');
        }
        return value;
      })(),
      snapshotAt: (() {
        final value = json['snapshotAt']?.toString();
        if (value == null) {
          throw FormatException('StorageUsageSnapshot.snapshotAt is required');
        }
        return value;
      })(),
      snapshotType: json['snapshotType']?.toString(),
      usedBytes: (() {
        final value = json['usedBytes']?.toString();
        if (value == null) {
          throw FormatException('StorageUsageSnapshot.usedBytes is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'fileCount': fileCount,
      'id': id,
      'reservedBytes': reservedBytes,
      'scope': scope,
      'scopeId': scopeId,
      'scopeType': scopeType,
      'snapshotAt': snapshotAt,
      'snapshotType': snapshotType,
      'usedBytes': usedBytes,
    };
  }
}

class StorageUsageSnapshotListResponse {
  final List<StorageUsageSnapshot> items;
  final String? nextCursor;
  final String requestId;

  StorageUsageSnapshotListResponse({
    required this.items,
    this.nextCursor,
    required this.requestId
  });

  factory StorageUsageSnapshotListResponse.fromJson(Map<String, dynamic> json) {
    return StorageUsageSnapshotListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('StorageUsageSnapshotListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : StorageUsageSnapshot.fromJson(map);
      })())
            .whereType<StorageUsageSnapshot>()
            .toList();
      })(),
      nextCursor: json['nextCursor']?.toString(),
      requestId: (() {
        final value = json['requestId']?.toString();
        if (value == null) {
          throw FormatException('StorageUsageSnapshotListResponse.requestId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
      'nextCursor': nextCursor,
      'requestId': requestId,
    };
  }
}

class SuppressionsCreateResult {
  final String code;
  final MessagingMutationResponse? data;
  final String? msg;

  SuppressionsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory SuppressionsCreateResult.fromJson(Map<String, dynamic> json) {
    return SuppressionsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('SuppressionsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : MessagingMutationResponse.fromJson(map);
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

class SuppressionsListResult {
  final String code;
  final MessagingCollectionResponse? data;
  final String? msg;

  SuppressionsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory SuppressionsListResult.fromJson(Map<String, dynamic> json) {
    return SuppressionsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('SuppressionsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : MessagingCollectionResponse.fromJson(map);
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

class TemplateSendsCreateResult {
  final String code;
  final MessagingTemplateSendResponse? data;
  final String? msg;

  TemplateSendsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory TemplateSendsCreateResult.fromJson(Map<String, dynamic> json) {
    return TemplateSendsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('TemplateSendsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : MessagingTemplateSendResponse.fromJson(map);
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

class TemplatesCreateResult {
  final String code;
  final MessagingMutationResponse? data;
  final String? msg;

  TemplatesCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory TemplatesCreateResult.fromJson(Map<String, dynamic> json) {
    return TemplatesCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('TemplatesCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : MessagingMutationResponse.fromJson(map);
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

class TemplatesListResult {
  final String code;
  final MessagingCollectionResponse? data;
  final String? msg;

  TemplatesListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory TemplatesListResult.fromJson(Map<String, dynamic> json) {
    return TemplatesListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('TemplatesListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : MessagingCollectionResponse.fromJson(map);
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

class TemplatesVersionsPublishResult {
  final String code;
  final MessagingMutationResponse? data;
  final String? msg;

  TemplatesVersionsPublishResult({
    required this.code,
    this.data,
    this.msg
  });

  factory TemplatesVersionsPublishResult.fromJson(Map<String, dynamic> json) {
    return TemplatesVersionsPublishResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('TemplatesVersionsPublishResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : MessagingMutationResponse.fromJson(map);
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

class TestConnectionCreateResult {
  final String code;
  final AdminSiteConnectionCheckResponse? data;
  final String? msg;

  TestConnectionCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory TestConnectionCreateResult.fromJson(Map<String, dynamic> json) {
    return TestConnectionCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('TestConnectionCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminSiteConnectionCheckResponse.fromJson(map);
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

class ToolsUpdateResult {
  final String code;
  final AdminMcpToolMutationResponse? data;
  final String? msg;

  ToolsUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory ToolsUpdateResult.fromJson(Map<String, dynamic> json) {
    return ToolsUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('ToolsUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminMcpToolMutationResponse.fromJson(map);
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

class UpdateStorageBucketRequest {
  final String reason;
  final String status;

  UpdateStorageBucketRequest({
    required this.reason,
    required this.status
  });

  factory UpdateStorageBucketRequest.fromJson(Map<String, dynamic> json) {
    return UpdateStorageBucketRequest(
      reason: (() {
        final value = json['reason']?.toString();
        if (value == null) {
          throw FormatException('UpdateStorageBucketRequest.reason is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('UpdateStorageBucketRequest.status is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'reason': reason,
      'status': status,
    };
  }
}

class UpdateStorageProviderRequest {
  final String reason;
  final String status;

  UpdateStorageProviderRequest({
    required this.reason,
    required this.status
  });

  factory UpdateStorageProviderRequest.fromJson(Map<String, dynamic> json) {
    return UpdateStorageProviderRequest(
      reason: (() {
        final value = json['reason']?.toString();
        if (value == null) {
          throw FormatException('UpdateStorageProviderRequest.reason is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('UpdateStorageProviderRequest.status is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'reason': reason,
      'status': status,
    };
  }
}

class UsageListResult {
  final String code;
  final ServiceProviderCollectionResponse? data;
  final String? msg;

  UsageListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory UsageListResult.fromJson(Map<String, dynamic> json) {
    return UsageListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('UsageListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : ServiceProviderCollectionResponse.fromJson(map);
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

class VerificationPoliciesListResult {
  final String code;
  final MessagingCollectionResponse? data;
  final String? msg;

  VerificationPoliciesListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory VerificationPoliciesListResult.fromJson(Map<String, dynamic> json) {
    return VerificationPoliciesListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('VerificationPoliciesListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : MessagingCollectionResponse.fromJson(map);
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

class VerificationPoliciesUpdateResult {
  final String code;
  final MessagingMutationResponse? data;
  final String? msg;

  VerificationPoliciesUpdateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory VerificationPoliciesUpdateResult.fromJson(Map<String, dynamic> json) {
    return VerificationPoliciesUpdateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('VerificationPoliciesUpdateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : MessagingMutationResponse.fromJson(map);
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

class VerificationPolicyUpdateRequest {
  final List<String> allowedChannels;
  final int codeLength;
  final String? defaultChannel;
  final int? maxSendPerHour;
  final int maxVerifyAttempts;
  final int? resendIntervalSeconds;
  final Map<String, dynamic>? riskPolicy;
  final String templateCode;
  final int ttlSeconds;

  VerificationPolicyUpdateRequest({
    required this.allowedChannels,
    required this.codeLength,
    this.defaultChannel,
    this.maxSendPerHour,
    required this.maxVerifyAttempts,
    this.resendIntervalSeconds,
    this.riskPolicy,
    required this.templateCode,
    required this.ttlSeconds
  });

  factory VerificationPolicyUpdateRequest.fromJson(Map<String, dynamic> json) {
    return VerificationPolicyUpdateRequest(
      allowedChannels: (() {
        final list = _sdkworkAsList(json['allowedChannels']);
        if (list == null) {
          throw FormatException('VerificationPolicyUpdateRequest.allowedChannels is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      codeLength: (() {
        final value = json['codeLength'];
        if (value is! int) {
          throw FormatException('VerificationPolicyUpdateRequest.codeLength is required');
        }
        return value;
      })(),
      defaultChannel: json['defaultChannel']?.toString(),
      maxSendPerHour: json['maxSendPerHour'] is int ? json['maxSendPerHour'] : null,
      maxVerifyAttempts: (() {
        final value = json['maxVerifyAttempts'];
        if (value is! int) {
          throw FormatException('VerificationPolicyUpdateRequest.maxVerifyAttempts is required');
        }
        return value;
      })(),
      resendIntervalSeconds: json['resendIntervalSeconds'] is int ? json['resendIntervalSeconds'] : null,
      riskPolicy: (() {
        final map = _sdkworkAsMap(json['riskPolicy']);
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
      templateCode: (() {
        final value = json['templateCode']?.toString();
        if (value == null) {
          throw FormatException('VerificationPolicyUpdateRequest.templateCode is required');
        }
        return value;
      })(),
      ttlSeconds: (() {
        final value = json['ttlSeconds'];
        if (value is! int) {
          throw FormatException('VerificationPolicyUpdateRequest.ttlSeconds is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'allowedChannels': allowedChannels.map((item) => item).toList(),
      'codeLength': codeLength,
      'defaultChannel': defaultChannel,
      'maxSendPerHour': maxSendPerHour,
      'maxVerifyAttempts': maxVerifyAttempts,
      'resendIntervalSeconds': resendIntervalSeconds,
      'riskPolicy': riskPolicy?.map((key, item) => MapEntry(key, item)),
      'templateCode': templateCode,
      'ttlSeconds': ttlSeconds,
    };
  }
}

class VersionRendersCreateResult {
  final String code;
  final AdminPromptRenderResponse? data;
  final String? msg;

  VersionRendersCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory VersionRendersCreateResult.fromJson(Map<String, dynamic> json) {
    return VersionRendersCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('VersionRendersCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminPromptRenderResponse.fromJson(map);
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

class VersionsCreateResult {
  final String code;
  final AdminPromptVersionMutationResponse? data;
  final String? msg;

  VersionsCreateResult({
    required this.code,
    this.data,
    this.msg
  });

  factory VersionsCreateResult.fromJson(Map<String, dynamic> json) {
    return VersionsCreateResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('VersionsCreateResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminPromptVersionMutationResponse.fromJson(map);
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

class VersionsListResult {
  final String code;
  final AdminPromptVersionListResponse? data;
  final String? msg;

  VersionsListResult({
    required this.code,
    this.data,
    this.msg
  });

  factory VersionsListResult.fromJson(Map<String, dynamic> json) {
    return VersionsListResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('VersionsListResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminPromptVersionListResponse.fromJson(map);
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

class VersionsPublishResult {
  final String code;
  final AdminPromptVersionMutationResponse? data;
  final String? msg;

  VersionsPublishResult({
    required this.code,
    this.data,
    this.msg
  });

  factory VersionsPublishResult.fromJson(Map<String, dynamic> json) {
    return VersionsPublishResult(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('VersionsPublishResult.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        return map == null ? null : AdminPromptVersionMutationResponse.fromJson(map);
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
