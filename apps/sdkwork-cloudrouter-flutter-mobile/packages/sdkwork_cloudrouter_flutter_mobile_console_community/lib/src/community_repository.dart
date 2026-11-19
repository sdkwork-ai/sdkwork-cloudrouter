import 'package:sdkwork_cloudrouter_flutter_mobile_core/sdkwork_cloudrouter_flutter_mobile_core.dart';

/// Read/write surface for the community App API.
///
/// The generated Flutter app SDK owns the transport; this repository only maps
/// its responses into the views the native screens render. Hosts never build
/// raw HTTP requests or manual auth headers here.
class CommunityRepository {
  CommunityRepository(
    this._client, {
    CloudRouterDriveAppSdkClient? drive,
  }) : _drive = drive;

  factory CommunityRepository.forSession({
    required String appApiBaseUrl,
    String? accessToken,
    String? authToken,
  }) {
    return CommunityRepository(
      createCloudRouterCommunityAppSdkClient(
        appApiBaseUrl: appApiBaseUrl,
        accessToken: accessToken,
        authToken: authToken,
      ),
      drive: createCloudRouterDriveAppSdkClient(
        appApiBaseUrl: appApiBaseUrl,
        accessToken: accessToken,
        authToken: authToken,
      ),
    );
  }

  final CloudRouterCommunityAppSdkClient _client;
  final CloudRouterDriveAppSdkClient? _drive;
  final Map<String, Future<String?>> _mediaCache = <String, Future<String?>>{};

  SdkworkAppClient get _sdk => _client.client;

  /// Resolves a community media reference (`drive://...`) to a short-lived
  /// download URL. Non-drive URLs pass through; failures render a placeholder
  /// rather than a broken image.
  Future<String?> resolveMediaUrl(String uri) {
    if (uri.isEmpty) return Future<String?>.value();
    if (!uri.startsWith('drive://')) return Future<String?>.value(uri);
    return _mediaCache.putIfAbsent(uri, () async {
      final matched =
          RegExp(r'^drive://spaces/([^/]+)/nodes/([^/?#]+)').firstMatch(uri);
      final nodeId = matched?.group(2);
      if (nodeId == null || _drive == null) return null;
      try {
        return await _drive.resolveDownloadUrl(nodeId);
      } catch (_) {
        return null;
      }
    });
  }

  Future<List<CommunityCategory>> listCircles() async {
    final response = await _sdk.community.categoriesList();
    return _listItems(response?.data)
        .map(CommunityCategory.fromJson)
        .toList(growable: false);
  }

  Future<CommunityCategory?> getCircle(String categoryId) async {
    final response = await _sdk.community.categoriesRetrieve(categoryId);
    final item = _item(response?.data);
    return item == null ? null : CommunityCategory.fromJson(item);
  }

  Future<void> joinCircle(String categoryId) async {
    await _sdk.community.categoriesJoin(categoryId);
  }

  Future<void> leaveCircle(String categoryId) async {
    final current = await _sdk.community.membersRetrieve(categoryId);
    final memberId = _memberId(current);
    if (memberId != null) {
      await _sdk.community.membersDelete(categoryId, memberId);
    }
  }

  Future<CommunityCategory?> createCircle({
    required String title,
    required String description,
    required bool isPaid,
    double? price,
    List<String> tags = const <String>[],
    List<String> tabs = const <String>[],
  }) async {
    final response = await _sdk.community.categoriesCreate(
      CommunityCircleCommand(
        title: title,
        description: description,
        isPaid: isPaid,
        price: price,
        tags: tags,
        tabs: tabs,
      ),
    );
    final item = _item(response?.data);
    return item == null ? null : CommunityCategory.fromJson(item);
  }

  Future<void> updateCircle(
    String categoryId, {
    String? title,
    String? description,
    bool? isPaid,
    double? price,
  }) async {
    await _sdk.community.categoriesUpdate(
      categoryId,
      CommunityCircleCommand(
        title: title ?? '',
        description: description,
        isPaid: isPaid,
        price: price,
      ),
    );
  }

  Future<void> deleteCircle(String categoryId) async {
    await _sdk.community.categoriesDelete(categoryId);
  }

  Future<List<CommunityEntry>> listPosts(String categoryId,
      {String? tag}) async {
    final response = await _sdk.community.feedList(
      categoryId,
      null,
      null,
      null,
      tag,
      1,
      50,
    );
    return _listItems(response?.data)
        .map(CommunityEntry.fromJson)
        .where((entry) => entry.kind != 'resource')
        .toList(growable: false);
  }

  Future<List<CommunityEntry>> listTabPosts(
      String categoryId, String tag) async {
    final response = await _sdk.community.feedList(
      categoryId,
      null,
      null,
      null,
      tag,
      1,
      50,
    );
    return _listItems(response?.data)
        .map(CommunityEntry.fromJson)
        .toList(growable: false);
  }

  Future<List<CommunityEntry>> listResources(String categoryId) async {
    final response = await _sdk.community.feedList(
      categoryId,
      'resource',
      null,
      null,
      null,
      1,
      50,
    );
    return _listItems(response?.data)
        .map(CommunityEntry.fromJson)
        .toList(growable: false);
  }

  Future<List<CommunityComment>> listComments(String entryId) async {
    final response = await _sdk.community.commentsList(entryId);
    return _listItems(response?.data)
        .map(CommunityComment.fromJson)
        .toList(growable: false);
  }

  Future<CommunityEntry?> createPost(
    String categoryId, {
    required String title,
    required String body,
    List<String> tags = const <String>[],
  }) async {
    final response = await _sdk.community.entriesCreate(
      CommunityEntryCommand(
        categoryId: categoryId,
        kind: 'discussion',
        title: title,
        excerpt: body.length > 240 ? body.substring(0, 240) : body,
        body: body,
        tags: tags,
      ),
    );
    final item = _item(response?.data);
    return item == null ? null : CommunityEntry.fromJson(item);
  }

  Future<void> deletePost(String entryId) async {
    await _sdk.community.entriesDelete(entryId);
  }

  Future<void> addComment(String entryId, String body) async {
    await _sdk.community
        .commentsCreate(entryId, CommunityCommentCommand(body: body));
  }

  Future<void> setReaction(String entryId, {required bool active}) async {
    await _sdk.community.reactionsCreate(
      entryId,
      CommunityReactionCommand(active: active, reactionType: 'like'),
    );
  }

  Future<List<CommunityMemberResponse>> listMembers(String categoryId) async {
    final response = await _sdk.community.membersList(categoryId);
    return _listItems(response?.data)
        .map(CommunityMemberResponse.fromJson)
        .toList(growable: false);
  }

  Future<void> updateMemberRole(
      String categoryId, String memberId, String role) async {
    await _sdk.community.membersUpdate(
      categoryId,
      memberId,
      CommunityMemberPatchCommand(role: role),
    );
  }

  Future<void> updateMemberStatus(
      String categoryId, String memberId, String status) async {
    await _sdk.community.membersUpdate(
      categoryId,
      memberId,
      CommunityMemberPatchCommand(status: status),
    );
  }

  Future<void> removeMember(String categoryId, String memberId) async {
    await _sdk.community.membersDelete(categoryId, memberId);
  }

  Future<List<CommunityGroupResponse>> listGroups(String categoryId) async {
    final response = await _sdk.community.groupsList(categoryId);
    return _listItems(response?.data)
        .map(CommunityGroupResponse.fromJson)
        .toList(growable: false);
  }

  Future<void> createGroup(
    String categoryId, {
    required String name,
    required String platform,
    String? description,
  }) async {
    await _sdk.community.groupsCreate(
      categoryId,
      CommunityGroupCommand(
        name: name,
        platform: platform,
        description: description,
      ),
    );
  }

  Future<void> deleteGroup(String categoryId, String groupId) async {
    await _sdk.community.groupsDelete(categoryId, groupId);
  }

  Future<List<CommunityMembershipTier>> listTiers(
    String categoryId, {
    bool includeDisabled = false,
  }) async {
    final response =
        await _sdk.community.tiersList(categoryId, includeDisabled);
    return _listItems(response?.data)
        .map(CommunityMembershipTier.fromJson)
        .toList(growable: false);
  }

  Future<void> publishTier(String categoryId, String tierId) async {
    await _sdk.community.tiersPublish(categoryId, tierId);
  }

  Future<void> unpublishTier(String categoryId, String tierId) async {
    await _sdk.community.tiersUnpublish(categoryId, tierId);
  }

  Future<void> deleteTier(String categoryId, String tierId) async {
    await _sdk.community.tiersDelete(categoryId, tierId);
  }

  static List<Map<String, dynamic>> _listItems(dynamic data) {
    if (data is! Map) return const <Map<String, dynamic>>[];
    final items = data['items'];
    if (items is! List) return const <Map<String, dynamic>>[];
    return items
        .whereType<Map>()
        .map(
            (item) => item.map((key, value) => MapEntry(key.toString(), value)))
        .toList(growable: false);
  }

  static Map<String, dynamic>? _item(dynamic data) {
    if (data is! Map) return null;
    final item = data['item'];
    if (item is! Map) return null;
    return item.map((key, value) => MapEntry(key.toString(), value));
  }

  static String? _memberId(MembersRetrieveResponse? response) {
    final item = response?.data;
    if (item is! Map) return null;
    final direct = item['id']?.toString();
    if (direct != null && direct.isNotEmpty) return direct;
    final nested = item['item'];
    if (nested is Map) {
      final id = nested['id']?.toString();
      if (id != null && id.isNotEmpty) return id;
    }
    return null;
  }
}
