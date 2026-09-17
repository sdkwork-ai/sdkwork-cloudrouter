import 'package:sdkwork_cloudrouter_flutter_mobile_core/sdkwork_cloudrouter_flutter_mobile_core.dart';

/// Seeds the root session from host storage. Identity resolution itself is owned
/// by the generated SDK / IAM surfaces; this bootstrap step must not invent a
/// second credential store.
void createIamRuntime(CloudRouterSession session) {
  if (!session.authenticated) {
    return;
  }
}
