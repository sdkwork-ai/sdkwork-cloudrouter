import fs from 'node:fs';

function patch(file, edits) {
  let content = fs.readFileSync(file, 'utf8');
  for (const [oldStr, newStr] of edits) {
    if (!content.includes(oldStr)) {
      console.log(`MISSING pattern in ${file}:\n${oldStr.slice(0, 160)}`);
      process.exit(1);
    }
    content = content.split(oldStr).join(newStr);
  }
  fs.writeFileSync(file, content);
  console.log(`patched ${file}`);
}

for (const file of [
  'services/sdkwork-cloudrouter-router-service/src/api/openai_embeddings.rs',
  'services/sdkwork-cloudrouter-router-service/src/api/openai_responses.rs',
]) {
  const isEmbeddings = file.includes('embeddings');
  const stateName = isEmbeddings ? 'OpenAiEmbeddingsState' : 'OpenAiResponsesState';
  const optionalRelay = isEmbeddings
    ? 'openai_embeddings_router_with_optional_relay'
    : 'openai_responses_router_with_optional_relay';
  const optionalRelayAndFailure = `${optionalRelay}_and_failure_strategy`;
  const optionalRelayAndRuntime = `${optionalRelay}_and_runtime_config`;

  patch(file, [
    // state struct + clone
    [
      `    failure_strategy: OpenAiRuntimeFailureStrategy,\n    default_retry_policy: ProviderRetryPolicy,\n}\n\nimpl<C> Clone for ${stateName}<C> {`,
      `    failure_strategy: OpenAiRuntimeFailureStrategy,\n    default_retry_policy: ProviderRetryPolicy,\n    region_settings_store: Option<Arc<dyn RuntimeRegionSettingsStore + Send + Sync>>,\n}\n\nimpl<C> Clone for ${stateName}<C> {`,
    ],
    [
      '            failure_strategy: self.failure_strategy,\n            default_retry_policy: self.default_retry_policy.clone(),\n        }\n    }\n}',
      '            failure_strategy: self.failure_strategy,\n            default_retry_policy: self.default_retry_policy.clone(),\n            region_settings_store: self.region_settings_store.clone(),\n        }\n    }\n}',
    ],
    // optional_relay signature + forward
    [
      '    plugins: Vec<OpenAiInvocationPluginRef>,\n) -> Router\nwhere\n    C: UpstreamAccountRouteCatalog + Send + Sync + \'static,\n{\n    openai_embeddings_router_with_optional_relay_and_failure_strategy(',
      '    plugins: Vec<OpenAiInvocationPluginRef>,\n    region_settings_store: Option<Arc<dyn RuntimeRegionSettingsStore + Send + Sync>>,\n) -> Router\nwhere\n    C: UpstreamAccountRouteCatalog + Send + Sync + \'static,\n{\n    openai_embeddings_router_with_optional_relay_and_failure_strategy(',
    ],
    [
      '        OpenAiRuntimeFailureStrategy::default(),\n    )\n}\n\nfn openai_embeddings_router_with_optional_relay_and_failure_strategy<C>(',
      '        OpenAiRuntimeFailureStrategy::default(),\n        region_settings_store,\n    )\n}\n\nfn openai_embeddings_router_with_optional_relay_and_failure_strategy<C>(',
    ],
    // failure_strategy signature + forward
    [
      '    failure_strategy: OpenAiRuntimeFailureStrategy,\n) -> Router\nwhere\n    C: UpstreamAccountRouteCatalog + Send + Sync + \'static,\n{\n    openai_embeddings_router_with_optional_relay_and_runtime_config(',
      '    failure_strategy: OpenAiRuntimeFailureStrategy,\n    region_settings_store: Option<Arc<dyn RuntimeRegionSettingsStore + Send + Sync>>,\n) -> Router\nwhere\n    C: UpstreamAccountRouteCatalog + Send + Sync + \'static,\n{\n    openai_embeddings_router_with_optional_relay_and_runtime_config(',
    ],
    [
      '        OpenAiRuntimeRouteConfig::new(ProviderRetryPolicy::default(), failure_strategy),\n    )\n}\n\nfn openai_embeddings_router_with_optional_relay_and_runtime_config<C>(',
      '        OpenAiRuntimeRouteConfig::new(ProviderRetryPolicy::default(), failure_strategy),\n        region_settings_store,\n    )\n}\n\nfn openai_embeddings_router_with_optional_relay_and_runtime_config<C>(',
    ],
    // runtime_config signature
    [
      '    plugins: Vec<OpenAiInvocationPluginRef>,\n    runtime_config: OpenAiRuntimeRouteConfig,\n) -> Router\nwhere\n    C: UpstreamAccountRouteCatalog + Send + Sync + \'static,\n{\n    let usage_recording = usage_recorder.as_ref().map(|usage_recorder| {',
      '    plugins: Vec<OpenAiInvocationPluginRef>,\n    runtime_config: OpenAiRuntimeRouteConfig,\n    region_settings_store: Option<Arc<dyn RuntimeRegionSettingsStore + Send + Sync>>,\n) -> Router\nwhere\n    C: UpstreamAccountRouteCatalog + Send + Sync + \'static,\n{\n    let usage_recording = usage_recorder.as_ref().map(|usage_recorder| {',
    ],
    // all call sites get trailing None
    [
      '        OpenAiRuntimeFailureStrategy::default(),\n    )',
      '        OpenAiRuntimeFailureStrategy::default(),\n        None,\n    )',
    ],
  ]);
}
