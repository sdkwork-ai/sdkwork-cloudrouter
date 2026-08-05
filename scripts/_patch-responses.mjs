import fs from 'node:fs';

const file = 'services/sdkwork-cloudrouter-router-service/src/api/openai_responses.rs';
let content = fs.readFileSync(file, 'utf8');

const edits = [
  // optional_relay signature + forward
  [
    '    plugins: Vec<OpenAiInvocationPluginRef>,\n) -> Router\nwhere\n    C: UpstreamAccountRouteCatalog + Send + Sync + \'static,\n{\n    openai_responses_router_with_optional_relay_and_failure_strategy(',
    '    plugins: Vec<OpenAiInvocationPluginRef>,\n    region_settings_store: Option<Arc<dyn RuntimeRegionSettingsStore + Send + Sync>>,\n) -> Router\nwhere\n    C: UpstreamAccountRouteCatalog + Send + Sync + \'static,\n{\n    openai_responses_router_with_optional_relay_and_failure_strategy(',
  ],
  [
    '        OpenAiRuntimeFailureStrategy::default(),\n    )\n}\n\nfn openai_responses_router_with_optional_relay_and_failure_strategy<C>(',
    '        OpenAiRuntimeFailureStrategy::default(),\n        region_settings_store,\n    )\n}\n\nfn openai_responses_router_with_optional_relay_and_failure_strategy<C>(',
  ],
  // failure_strategy signature + forward
  [
    '    failure_strategy: OpenAiRuntimeFailureStrategy,\n) -> Router\nwhere\n    C: UpstreamAccountRouteCatalog + Send + Sync + \'static,\n{\n    openai_responses_router_with_optional_relay_and_runtime_config(',
    '    failure_strategy: OpenAiRuntimeFailureStrategy,\n    region_settings_store: Option<Arc<dyn RuntimeRegionSettingsStore + Send + Sync>>,\n) -> Router\nwhere\n    C: UpstreamAccountRouteCatalog + Send + Sync + \'static,\n{\n    openai_responses_router_with_optional_relay_and_runtime_config(',
  ],
  [
    '        OpenAiRuntimeRouteConfig::new(ProviderRetryPolicy::default(), failure_strategy),\n    )\n}\n\nfn openai_responses_router_with_optional_relay_and_runtime_config<C>(',
    '        OpenAiRuntimeRouteConfig::new(ProviderRetryPolicy::default(), failure_strategy),\n        region_settings_store,\n    )\n}\n\nfn openai_responses_router_with_optional_relay_and_runtime_config<C>(',
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
];

for (const [oldStr, newStr] of edits) {
  if (!content.includes(oldStr)) {
    console.log(`MISSING pattern:\n${oldStr.slice(0, 160)}`);
    process.exit(1);
  }
  content = content.split(oldStr).join(newStr);
}
fs.writeFileSync(file, content);
console.log('patched responses');
