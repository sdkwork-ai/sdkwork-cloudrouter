# @sdkwork/cloudrouter-h5-messages

Cloud Router H5 adapter for the SDKWork IM conversation capability.

- `configureCloudRouterIm()` creates the generated `ImSdkClient` on the shared
  Cloud Router API origin with the console dual-token manager.
- `MessagesScreen` reads `conversations.list` and renders the "消息" tab
  conversation list in the Cloud Router mobile theme.
- `MessagesDetailScreen` reads `conversations.listMessages` and posts text via
  `conversations.postText`, mounted on `/chat/:conversationId`.
- API Key and Usage remain mounted console routes; their tabs are replaced by
  Messages in the H5 shell.
