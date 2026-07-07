> Migrated from `docs/schema-registry/table-catalog.md` on 2026-06-24.
> Owner: SDKWork maintainers

# 鏁版嵁搴撹〃鐩綍涓庤〃璇存槑

鐢熸垚鏉ユ簮锛歚docs/schema-registry/sdkwork-clawrouter.tables.yaml`
source: docs/schema-registry/sdkwork-clawrouter.tables.yaml
琛ㄦ€绘暟锛?54
table-count: 154
鏈」鐩敓鎴愯〃锛?54

鏈枃鍒楀嚭褰撳墠搴旂敤 schema registry 涓櫥璁扮殑鍏ㄩ儴鏁版嵁搴撹〃锛屽苟缁欏嚭涓枃涓氬姟璇存槑銆俙generated = no` 琛ㄧず鐗╃悊缁撴瀯鐢卞閮ㄧ郴缁熸垨 Java 鍏煎瀹炰綋鎷ユ湁锛屽綋鍓嶅簲鐢ㄥ彧鐧昏鍜岃鍙栧绾︺€?
## Domain 姹囨€?
| domain | 琛ㄦ暟閲?| 璇存槑 |
| --- | ---: | --- |
| `ai` | 84 | AI 涓浆涓庢ā鍨嬫湇鍔?|
| `classification` | 1 | classification |
| `commerce` | 12 | 浜ゆ槗銆佽璐逛笌缁撶畻 |
| `content` | 18 | 鍐呭銆佹枃妗ｄ笌瀵硅薄瀛樺偍 |
| `iam` | 10 | 韬唤銆佽闂笌瀹夊叏 |
| `integration` | 14 | 澶栭儴闆嗘垚涓庢湇鍔″晢 |
| `ops` | 13 | 杩愮淮娌荤悊 |
| `system` | 2 | 绯荤粺瀹夎 |

## AI 涓浆涓庢ā鍨嬫湇鍔?
| 琛ㄥ悕 | 璇存槑 | profile | write_owner | generated |
| --- | --- | --- | --- | --- |
| `ai_channel_group` | 涓浆绔欓潰鍚戠敤鎴?API Key 鐨勮矾鐢变笌璁¤垂鍒嗙粍锛岀粦瀹氫环鏍艰鍒掑拰鍊嶇巼銆?| `tenant_entity` | `ai-routing-service` | yes |
| `ai_channel_group_member` | 缁存姢鍒嗙粍鍙闂殑涓婃父璐﹀彿姹犳垚鍛樺強浼樺厛绾с€佹潈閲嶃€?| `relation_entity` | `ai-routing-service` | yes |
| `ai_channel_group_resource` | 缁存姢鍒嗙粍鍙闂殑璧勬簮鎴栬祫婧愮粍锛屾槸 API Key 鍒拌祫婧愭巿鏉冪殑鏍稿績杈广€?| `relation_entity` | `ai-routing-service` | yes |
| `ai_channel_group_metric_snapshot` | 淇濆瓨鍒嗙粍瀹归噺銆侀搴﹀拰鐢ㄩ噺鐨勬寚鏍囧揩鐓с€?| `projection` | `metrics-worker` | yes |
| `ai_provider` | 瀹氫箟涓婃父闆嗘垚渚涘簲鍟嗙被鍨嬶紝琛ㄧず瀹樻柟鍘傚晢銆佷簯鍘傚晢銆佽仛鍚堝晢鎴栬嚜寤轰腑杞兘鍔涖€?| `dictionary_entity` | `ai-routing-service` | yes |
| `ai_site` | 涓婃父鏈嶅姟鍟嗙珯鐐?璐﹀彿涓讳綋锛屾壙杞戒笂娓告湇鍔″晢鍩虹淇℃伅銆丩ogo銆佸煙鍚嶅拰璁よ瘉鍏ュ彛銆?| `provider_account_secret_ref` | `ai-routing-service` | yes |
| `ai_site_service` | 涓婃父鏈嶅姟鍟嗘寜鍖哄煙鎴栨湇鍔＄淮搴︾殑閮ㄧ讲閰嶇疆锛屼富瑕佸尯鍒?base URL 鍜屽嚟璇佸紩鐢ㄣ€?| `credential_ref` | `ai-routing-service` | yes |
| `ai_channel` | 涓婃父璐﹀彿/娓犻亾杩愯鏃堕厤缃紝杩炴帴 provider銆乻ite銆佽璇佹柟寮忋€佸尯鍩熷拰璋冨害鏉冮噸銆?| `credential_ref` | `ai-routing-service` | yes |
| `ai_channel_credential` | 涓婃父璐﹀彿鐨勫叿浣撳嚟璇佽疆鎹㈠崟鍏冿紝淇濆瓨 base URL銆乻ecret ref銆佹潈閲嶅拰鍋ュ悍鐘舵€併€?| `credential_ref` | `ai-routing-service` | yes |
| `integration_provider_health_snapshot` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑鎶曞奖蹇収锛岃褰?渚涘簲鍟嗗仴搴峰揩鐓с€?| `projection` | `ops-worker` | yes |
| `ai_model_vendor` | 绋冲畾鐨勬ā鍨嬫垨鑳藉姏渚涘簲鍟嗗瓧鍏革紝渚嬪 OpenAI銆丄nthropic銆丟oogle銆並ling銆?| `dictionary_entity` | `model-catalog-service` | yes |
| `ai_modality` | AI 鑳藉姏妯℃€佸瓧鍏革紝渚嬪 LLM銆佸浘鍍忋€佽棰戙€侀煶棰戙€侀煶涔愬拰闊虫晥銆?| `dictionary_entity` | `model-catalog-service` | yes |
| `ai_api_endpoint` | 瀵瑰寮€鏀?API 璧勬簮瀛楀吀锛岀敤浜庢妸璇锋眰璺緞鎶借薄涓哄彲鎺堟潈銆佸彲璁¤垂璧勬簮銆?| `dictionary_entity` | `model-catalog-service` | yes |
| `ai_vendor_modality` | 渚涘簲鍟嗕笌鑳藉姏妯℃€佺殑鍏崇郴锛屾弿杩版煇 vendor 鏀寔鍝簺鑳藉姏銆?| `relation_entity` | `model-catalog-service` | yes |
| `ai_vendor_api_endpoint` | 渚涘簲鍟嗕笌 API 璧勬簮鐨勫叧绯伙紝鎻忚堪鏌?vendor 鏀寔鍝簺 API銆?| `relation_entity` | `model-catalog-service` | yes |
| `ai_modality_api_endpoint` | 鑳藉姏妯℃€佷笌 API 璧勬簮鐨勫叧绯伙紝鏀寔鎸夋ā鎬佺瓫閫?API 鑳藉姏銆?| `relation_entity` | `model-catalog-service` | yes |
| `ai_model_modality` | 妯″瀷涓庢ā鎬佺殑鍏崇郴锛屾弿杩版ā鍨嬭緭鍏ヨ緭鍑鸿兘鍔涘垎绫汇€?| `relation_entity` | `model-catalog-service` | yes |
| `ai_model_api_endpoint` | 妯″瀷涓?API 璧勬簮鐨勫叧绯伙紝鎻忚堪妯″瀷鍙鍝簺 API 璋冪敤銆?| `relation_entity` | `model-catalog-service` | yes |
| `ai_resource` | 涓浆绔欑粺涓€璧勬簮鎶借薄锛岃鐩栨ā鍨嬨€丄PI銆佸浘鐗囥€佽棰戙€侀煶棰戙€侀煶涔愩€侀煶鏁堝拰鎸夋璧勬簮銆?| `dictionary_entity` | `model-catalog-service` | yes |
| `ai_resource_group` | 缁熶竴璧勬簮鍒嗙粍锛岀敤浜庣淮鎶?OpenAI銆丆laude銆丟emini銆並ling 绛?API 璧勬簮闆嗗悎銆?| `dictionary_entity` | `model-catalog-service` | yes |
| `ai_resource_group_item` | 璧勬簮鍒嗙粍鎴愬憳鍏崇郴锛屾敮鎸佽祫婧愮粍宓屽鍜岃祫婧愰泦鍚堝畨瑁呯瀛愩€?| `relation_entity` | `model-catalog-service` | yes |
| `ai_channel_resource` | 涓婃父璐﹀彿/娓犻亾鏀寔鐨勮祫婧愭巿鏉冿紝鏄处鍙疯兘鍔涚瓫閫夊拰璺敱鍊欓€夌敓鎴愮殑鏍稿績杈广€?| `relation_entity` | `ai-routing-service` | yes |
| `ai_provider_object_route` | 瀵硅薄绫绘垨闈炴ā鍨?API 鐨勮繍琛屾椂璺敱缁戝畾锛屾敮鎸佹棤妯″瀷鍙傛暟鐨?API 璋冪敤銆?| `runtime_binding` | `gateway-runtime` | yes |
| `ai_config_version` | AI 璺敱閰嶇疆鐗堟湰锛岀敤浜庡揩鐓х紦瀛樺埛鏂板拰鍒嗗竷寮忓疄渚嬪崗璋冦€?| `runtime_coordination` | `ai-routing-service` | yes |
| `ai_config_change_event` | AI 閰嶇疆鍙樻洿浜嬩欢锛岀敤浜庤Е鍙戣繍琛屾椂缂撳瓨鍜岃矾鐢卞揩鐓у埛鏂般€?| `runtime_coordination_event` | `ai-routing-service` | yes |
| `ai_model_family` | 妯″瀷瀹舵棌瀛楀吀锛岀敤浜庡綊绫诲悓绯诲垪妯″瀷鍜屽睍绀虹瓫閫夈€?| `dictionary_entity` | `model-catalog-service` | yes |
| `ai_model` | 鏍囧噯妯″瀷鐩綍涓昏〃锛屼繚瀛樻ā鍨?catalog key銆乿endor銆佽兘鍔涖€佷笂涓嬫灦鍜屽睍绀轰俊鎭€?| `dictionary_entity` | `model-catalog-service` | yes |
| `ai_model_capability` | 妯″瀷鑳藉姏琛ュ厖琛紝淇濆瓨 chat銆乪mbedding銆乼ools 绛夎兘鍔涙爣绛俱€?| `relation_entity` | `model-catalog-service` | yes |
| `ai_model_catalog_source` | 妯″瀷鐩綍鏉ユ簮閰嶇疆锛岀敤浜庡鍏ュ畼鏂规垨绗笁鏂规ā鍨嬬洰褰曘€?| `catalog_source` | `model-catalog-service` | yes |
| `ai_model_catalog_sync_run` | 妯″瀷鐩綍鍚屾浠诲姟鎵ц璁板綍銆?| `event_log` | `model-catalog-service` | yes |
| `ai_billing_meter` | 璁¤垂璁￠噺鍗曚綅瀛楀吀锛岃鐩?token銆佽姹傛鏁般€佸浘鐗囧紶鏁般€侀煶瑙嗛鏃堕暱绛夈€?| `dictionary_entity` | `pricing-service` | yes |
| `ai_model_pricing` | 妯″瀷涓庤祫婧愪环鏍艰〃锛屼繚瀛樺畼鏂瑰弬鑰冧环銆佹帴鍏ユ垚鏈环銆侀攢鍞环绛変环鏍间晶銆?| `pricing` | `pricing-service` | yes |
| `ai_pricing_plan` | 浠锋牸璁″垝涓昏〃锛屽畾涔夐粯璁ゅ€嶇巼銆佸姞浠峰拰浠锋牸鍩哄噯銆?| `tenant_entity` | `pricing-service` | yes |
| `ai_pricing_plan_binding` | 浠锋牸璁″垝缁戝畾鍏崇郴锛岀敤浜庡皢璐﹀彿銆佸垎缁勩€佺鎴锋垨 SKU 缁戝畾鍒颁环鏍艰鍒掋€?| `relation_entity` | `pricing-service` | yes |
| `ai_pricing_rule` | 浠锋牸瑙勫垯琛紝鏀寔鍊嶇巼銆佸浐瀹氫环鏍笺€侀樁姊环鍜岃〃杈惧紡璁¤垂銆?| `tenant_entity` | `pricing-service` | yes |
| `ai_pricing_tier` | 浠锋牸闃舵琛紝淇濆瓨鍒嗘璁¤垂闃堝€煎拰鍗曚环銆?| `tenant_entity` | `pricing-service` | yes |
| `ai_pricing_import_snapshot` | 浠锋牸瀵煎叆蹇収锛岃褰曞畼鏂逛环鏍兼垨渚涘簲鍟嗚处鍗曚环鏍煎悓姝ヨ繃绋嬨€?| `event_log` | `pricing-sync-worker` | yes |
| `ai_model_rank_snapshot` | 妯″瀷鎺掕鍜岃川閲?鎴愭湰/寤惰繜鎸囨爣鎶曞奖锛岀敤浜庢ā鍨嬪競鍦哄拰鎺ㄨ崘銆?| `projection` | `analytics-worker` | yes |
| `ai_routing_policy` | 璺敱绛栫暐涓昏〃锛屽畾涔夊叏灞€銆佺鎴枫€佺粍缁囥€丄PI Key 鎴栧垎缁勪綔鐢ㄥ煙銆?| `tenant_entity` | `routing-policy-service` | yes |
| `ai_routing_profile` | 璺敱绛栫暐閰嶇疆妗ｏ紝鎵胯浇涓€缁勮鍒欑増鏈€?| `tenant_entity` | `routing-policy-service` | yes |
| `ai_routing_rule` | 璺敱瑙勫垯琛紝淇濆瓨鍖归厤鏉′欢銆佸€欓€夎处鍙枫€乫allback 鍜岀害鏉熴€?| `tenant_entity` | `routing-policy-service` | yes |
| `ai_routing_decision_log` | 杩愯鏃惰矾鐢卞喅绛栨棩蹇楋紝璁板綍璇锋眰閫夋嫨浜嗗摢涓笂娓歌处鍙峰強鍘熷洜銆?| `event_log` | `gateway-runtime` | yes |
| `ai_request_trace` | 缃戝叧璇锋眰閾捐矾璺熻釜琛紝璁板綍 API Key銆佸垎缁勩€佹ā鍨嬨€佽处鍙枫€佺姸鎬佺爜銆乀TFT 鍜岃€楁椂銆?| `event_log` | `gateway-runtime` | yes |
| `ai_usage` | AI 鐢ㄩ噺浜嬪疄琛紝璁板綍璁¤垂鍗曚綅銆佺敤閲忋€佸崟浠峰揩鐓у拰涓婃父鎴愭湰銆?| `ledger_source_fact` | `gateway-runtime` | yes |
| `ai_quota_policy` | AI 鐢ㄩ噺鎴栨ā鍨嬭闂檺棰濈瓥鐣ャ€?| `tenant_entity` | `quota-service` | yes |
| `ai_prompt` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑绉熸埛绾т富鏁版嵁锛岃褰?prompt銆?| `tenant_entity` | `prompt-service` | yes |
| `ai_prompt_version` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑绉熸埛绾т富鏁版嵁锛岃褰?鎻愮ず璇嶇増鏈€?| `tenant_entity` | `prompt-service` | yes |
| `ai_prompt_binding` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑绉熸埛绾т富鏁版嵁锛岃褰?鎻愮ず璇嶇粦瀹氥€?| `tenant_entity` | `prompt-service` | yes |
| `ai_mcp_server` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑绉熸埛绾т富鏁版嵁锛岃褰?MCP 鏈嶅姟銆?| `tenant_entity` | `mcp-service` | yes |
| `ai_mcp_server_revision` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑绉熸埛绾т富鏁版嵁锛岃褰?MCP 鏈嶅姟淇銆?| `tenant_entity` | `mcp-service` | yes |
| `ai_mcp_tool` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑绉熸埛绾т富鏁版嵁锛岃褰?MCP 宸ュ叿銆?| `tenant_entity` | `mcp-service` | yes |
| `ai_mcp_binding` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑绉熸埛绾т富鏁版嵁锛岃褰?MCP 缁戝畾銆?| `tenant_entity` | `mcp-service` | yes |
| `ai_agent` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑绉熸埛绾т富鏁版嵁锛岃褰?agent銆?| `tenant_entity` | `agent-service` | yes |
| `ai_agent_version` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑绉熸埛绾т富鏁版嵁锛岃褰?Agent 鐗堟湰銆?| `tenant_entity` | `agent-service` | yes |
| `ai_agent_run` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑浜嬩欢鏃ュ織锛岃褰?Agent 杩愯銆?| `event_log` | `agent-runtime` | yes |
| `ai_agent_run_step` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑浜嬩欢鏃ュ織锛岃褰?Agent 杩愯姝ラ銆?| `event_log` | `agent-runtime` | yes |
| `ai_agent_memory` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑鐢ㄦ埛绾ф暟鎹紝璁板綍 Agent 璁板繂銆?| `user_entity` | `agent-memory-service` | yes |
| `ai_chat_conversation` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑鐢ㄦ埛绾ф暟鎹紝璁板綍 鑱婂ぉ浼氳瘽銆?| `user_entity` | `chat-service` | yes |
| `ai_chat_turn` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑浜嬩欢鏃ュ織锛岃褰?鑱婂ぉ杞銆?| `event_log` | `chat-service` | yes |
| `ai_chat_item` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑浜嬩欢鏃ュ織锛岃褰?鑱婂ぉ鏉＄洰銆?| `event_log` | `chat-service` | yes |
| `ai_chat_message` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑浜嬩欢鏃ュ織锛岃褰?鑱婂ぉ娑堟伅銆?| `event_log` | `chat-service` | yes |
| `ai_chat_message_part` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑浜嬩欢鏃ュ織锛岃褰?鑱婂ぉ娑堟伅鐗囨銆?| `event_log` | `chat-service` | yes |
| `ai_chat_context_snapshot` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑浜嬩欢鏃ュ織锛岃褰?鑱婂ぉ涓婁笅鏂囧揩鐓с€?| `event_log` | `chat-runtime` | yes |
| `ai_agent_session` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑鐢ㄦ埛绾ф暟鎹紝璁板綍 Agent 浼氳瘽銆?| `user_entity` | `agent-runtime` | yes |
| `ai_runtime_invocation` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑浜嬩欢鏃ュ織锛岃褰?杩愯鏃惰皟鐢ㄣ€?| `event_log` | `ai-runtime` | yes |
| `ai_runtime_invocation_event` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑浜嬩欢鏃ュ織锛岃褰?杩愯鏃惰皟鐢ㄤ簨浠躲€?| `event_log` | `ai-runtime` | yes |
| `ai_runtime_usage_link` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑浜嬩欢鏃ュ織锛岃褰?杩愯鏃剁敤閲忓叧鑱斻€?| `event_log` | `ai-runtime` | yes |
| `ai_runtime_artifact` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑浜嬩欢鏃ュ織锛岃褰?杩愯鏃朵骇鐗┿€?| `event_log` | `ai-runtime` | yes |
| `ai_agent_tool_binding` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑绉熸埛绾т富鏁版嵁锛岃褰?Agent 宸ュ叿缁戝畾銆?| `tenant_entity` | `agent-service` | yes |
| `ai_agent_mcp_server` | AI 涓浆涓庢ā鍨嬫湇鍔＄殑绉熸埛绾т富鏁版嵁锛岃褰?Agent MCP 鏈嶅姟缁戝畾銆?| `tenant_entity` | `agent-service` | yes |
| `ai_model_mapping_rule` | 妯″瀷鏄犲皠瑙勫垯涓昏〃锛屽畾涔夊叏灞€銆乿endor銆佽处鍙锋垨鍒嗙粍绾фā鍨嬪埆鍚嶆槧灏勩€?| `rule_entity` | `ai-routing-service` | yes |
| `ai_model_mapping_rule_item` | 妯″瀷鏄犲皠瑙勫垯鏉＄洰锛屼繚瀛樻簮妯″瀷鍒扮洰鏍囨ā鍨嬬殑鍏蜂綋鏄犲皠銆?| `relation_entity` | `ai-routing-service` | yes |
| `ai_model_mapping_rule_binding` | 妯″瀷鏄犲皠瑙勫垯缁戝畾锛屽畾涔夋槧灏勮鍒欓€傜敤鐨勮处鍙枫€佸垎缁勩€乿endor 鎴栧叏灞€鑼冨洿銆?| `relation_entity` | `ai-routing-service` | yes |
| `ai_usage_service_provider_edge` | 灏?AI 鐢ㄩ噺浜嬪疄鍏宠仈鍒版湇鍔″晢閾捐矾锛岀敤浜庢湇鍔″晢缁撶畻鍜屾垚鏈垎鎽娿€?| `commercial_usage_edge_fact` | `gateway-runtime` | yes |

## classification

| 琛ㄥ悕 | 璇存槑 | profile | write_owner | generated |
| --- | --- | --- | --- | --- |
| `c_category` | classification鐨勭鎴风骇涓绘暟鎹紝璁板綍 ccategory銆?| `tenant_entity` | `catalog-service` | yes |

## 浜ゆ槗銆佽璐逛笌缁撶畻

| 琛ㄥ悕 | 璇存槑 | profile | write_owner | generated |
| --- | --- | --- | --- | --- |
| `commerce_usage_settlement` | 浜ゆ槗銆佽璐逛笌缁撶畻鐨勮处鍔℃姇褰憋紝璁板綍 鐢ㄩ噺缁撶畻銆?| `ledger_projection` | `settlement-worker` | yes |
| `commerce_usage_pricing_plan` | 浜ゆ槗銆佽璐逛笌缁撶畻鐨勫瓧鍏镐富鏁版嵁锛岃褰?鐢ㄩ噺浠锋牸璁″垝銆?| `dictionary_entity` | `pricing-service` | yes |
| `commerce_usage_statement` | 浜ゆ槗銆佽璐逛笌缁撶畻鐨勬姇褰卞揩鐓э紝璁板綍 鐢ㄩ噺璐﹀崟銆?| `projection` | `billing-worker` | yes |
| `commerce_usage_statement_item` | 浜ゆ槗銆佽璐逛笌缁撶畻鐨勬姇褰卞揩鐓э紝璁板綍 鐢ㄩ噺璐﹀崟鏄庣粏銆?| `projection` | `billing-worker` | yes |
| `commerce_settlement_export` | 浜ゆ槗銆佽璐逛笌缁撶畻鐨勫鍑哄璁★紝璁板綍 缁撶畻瀵煎嚭銆?| `export_audit` | `billing-export-service` | yes |
| `commerce_usage_service_provider_statement` | 浜ゆ槗銆佽璐逛笌缁撶畻鐨勬湇鍔″晢璐﹀崟锛岃褰?usageservice渚涘簲鍟唖tatement銆?| `commercial_provider_statement` | `billing-worker` | yes |
| `commerce_usage_service_provider_adjustment` | 浜ゆ槗銆佽璐逛笌缁撶畻鐨勬湇鍔″晢璐﹀姟璋冩暣锛岃褰?usageservice渚涘簲鍟哸djustment銆?| `commercial_provider_adjustment` | `billing-worker` | yes |
| `commerce_usage_service_provider_reconciliation_run` | 浜ゆ槗銆佽璐逛笌缁撶畻鐨勬湇鍔″晢瀵硅处鎵规锛岃褰?usageservice渚涘簲鍟唕econciliationrun銆?| `commercial_provider_reconciliation_run` | `reconciliation-worker` | yes |
| `commerce_usage_service_provider_reconciliation_item` | 浜ゆ槗銆佽璐逛笌缁撶畻鐨勬湇鍔″晢瀵硅处鏄庣粏锛岃褰?usageservice渚涘簲鍟唕econciliationitem銆?| `commercial_provider_reconciliation_item` | `reconciliation-worker` | yes |
| `commerce_service_provider_exposure_snapshot` | 浜ゆ槗銆佽璐逛笌缁撶畻鐨勬湇鍔″晢椋庨櫓鏁炲彛蹇収锛岃褰?鏈嶅姟鍟嗛闄╂暈鍙ｅ揩鐓с€?| `commercial_provider_exposure_snapshot` | `settlement-worker` | yes |
| `analytics_service_provider_daily` | 浜ゆ槗銆佽璐逛笌缁撶畻鐨勬湇鍔″晢鏃ョ粺璁℃姇褰憋紝璁板綍 鏈嶅姟鍟嗘棩缁熻銆?| `commercial_provider_daily_projection` | `analytics-worker` | yes |
| `analytics_service_provider_edge_daily` | 浜ゆ槗銆佽璐逛笌缁撶畻鐨勬湇鍔″晢鍏崇郴鏃ョ粺璁℃姇褰憋紝璁板綍 鏈嶅姟鍟嗗叧绯绘棩缁熻銆?| `commercial_provider_edge_daily_projection` | `analytics-worker` | yes |

## 鍐呭銆佹枃妗ｄ笌瀵硅薄瀛樺偍

| 琛ㄥ悕 | 璇存槑 | profile | write_owner | generated |
| --- | --- | --- | --- | --- |
| `object_provider` | 鍐呭銆佹枃妗ｄ笌瀵硅薄瀛樺偍鐨勫璞″瓨鍌ㄤ緵搴斿晢锛岃褰?渚涘簲鍟嗐€?| `object_storage_provider` | `storage-service` | yes |
| `object_bucket` | 鍐呭銆佹枃妗ｄ笌瀵硅薄瀛樺偍鐨勫璞″瓨鍌ㄦ《锛岃褰?bucket銆?| `object_storage_bucket` | `storage-service` | yes |
| `storage_default_bucket_policy` | 鍐呭銆佹枃妗ｄ笌瀵硅薄瀛樺偍鐨勫璞″瓨鍌ㄨ矾鐢辩瓥鐣ワ紝璁板綍 榛樿妗剁瓥鐣ャ€?| `object_storage_routing_policy` | `storage-service` | yes |
| `storage_quota_policy` | 鍐呭銆佹枃妗ｄ笌瀵硅薄瀛樺偍鐨勫瓨鍌ㄩ厤棰濈瓥鐣ワ紝璁板綍 闄愰绛栫暐銆?| `storage_quota_policy` | `storage-service` | yes |
| `storage_quota_reservation` | 鍐呭銆佹枃妗ｄ笌瀵硅薄瀛樺偍鐨勫瓨鍌ㄩ厤棰濋鐣欙紝璁板綍 閰嶉棰勭暀銆?| `storage_quota_reservation` | `storage-service` | yes |
| `storage_usage_counter` | 鍐呭銆佹枃妗ｄ笌瀵硅薄瀛樺偍鐨勫瓨鍌ㄧ敤閲忚鏁板櫒锛岃褰?鐢ㄩ噺璁℃暟鍣ㄣ€?| `storage_usage_counter` | `storage-service` | yes |
| `storage_usage_ledger` | 鍐呭銆佹枃妗ｄ笌瀵硅薄瀛樺偍鐨勫瓨鍌ㄧ敤閲忔祦姘达紝璁板綍 鐢ㄩ噺娴佹按銆?| `storage_usage_ledger` | `storage-service` | yes |
| `storage_usage_snapshot` | 鍐呭銆佹枃妗ｄ笌瀵硅薄瀛樺偍鐨勫瓨鍌ㄧ敤閲忓揩鐓э紝璁板綍 鐢ㄩ噺蹇収銆?| `storage_usage_snapshot` | `storage-service` | yes |
| `storage_reconciliation_run` | 鍐呭銆佹枃妗ｄ笌瀵硅薄瀛樺偍鐨勫瓨鍌ㄥ璐︽壒娆★紝璁板綍 瀵硅处鎵规銆?| `storage_reconciliation_run` | `storage-service` | yes |
| `storage_reconciliation_item` | 鍐呭銆佹枃妗ｄ笌瀵硅薄瀛樺偍鐨勫瓨鍌ㄥ璐︽槑缁嗭紝璁板綍 瀵硅处鏄庣粏銆?| `storage_reconciliation_item` | `storage-service` | yes |
| `storage_gc_job` | 鍐呭銆佹枃妗ｄ笌瀵硅薄瀛樺偍鐨勫瓨鍌ㄦ竻鐞嗕换鍔★紝璁板綍 鍨冨溇娓呯悊浠诲姟銆?| `storage_garbage_collection_job` | `storage-service` | yes |
| `object_blob` | 鍐呭銆佹枃妗ｄ笌瀵硅薄瀛樺偍鐨勫璞℃枃浠讹紝璁板綍 blob銆?| `object_blob` | `storage-service` | yes |
| `media_resource` | 鍐呭銆佹枃妗ｄ笌瀵硅薄瀛樺偍鐨刴edia resource锛岃褰?濯掍綋璧勬簮銆?| `media_resource` | `storage-service` | yes |
| `object_tag` | 鍐呭銆佹枃妗ｄ笌瀵硅薄瀛樺偍鐨勫璞℃爣绛撅紝璁板綍 tag銆?| `object_tag` | `storage-service` | yes |
| `upload_session` | 鍐呭銆佹枃妗ｄ笌瀵硅薄瀛樺偍鐨勪笂浼犱細璇濓紝璁板綍 浼氳瘽銆?| `object_upload_session` | `storage-service` | yes |
| `upload_part` | 鍐呭銆佹枃妗ｄ笌瀵硅薄瀛樺偍鐨勫垎鐗囦笂浼狅紝璁板綍 part銆?| `object_upload_part` | `storage-service` | yes |
| `upload_presign_grant` | 鍐呭銆佹枃妗ｄ笌瀵硅薄瀛樺偍鐨勯绛炬巿鏉冿紝璁板綍 presigngrant銆?| `object_upload_presign_grant` | `storage-service` | yes |
| `upload_completion_attempt` | 鍐呭銆佹枃妗ｄ笌瀵硅薄瀛樺偍鐨勪笂浼犲畬鎴愬皾璇曪紝璁板綍 completionattempt銆?| `object_upload_completion_attempt` | `storage-service` | yes |

## 韬唤銆佽闂笌瀹夊叏

| 琛ㄥ悕 | 璇存槑 | profile | write_owner | generated |
| --- | --- | --- | --- | --- |
| `iam_gateway_api_key` | 涓浆绔欏澶?API Key 绱㈠紩锛屼繚瀛樺瘑閽ュ搱甯屻€侀粯璁ゅ垎缁勩€佺瓥鐣ュ拰闄愰寮曠敤銆?| `credential_index` | `api-key-service` | yes |
| `iam_gateway_api_key_channel_group` | 韬唤銆佽闂笌瀹夊叏鐨勫叧绯荤粦瀹氾紝璁板綍 gatewayapikeychannelgroup銆?| `relation_entity` | `api-key-service` | yes |
| `iam_gateway_access_policy` | 淇濆瓨缃戝叧 API Key 鐨勮闂兘鍔涖€両P 鐧藉悕鍗曠瓑璁块棶鎺у埗绛栫暐銆?| `tenant_entity` | `access-policy-service` | yes |
| `iam_gateway_risk_rule` | 韬唤銆佽闂笌瀹夊叏鐨勭鎴风骇涓绘暟鎹紝璁板綍 gatewayriskrule銆?| `tenant_entity` | `risk-service` | yes |
| `iam_user_preference` | 韬唤銆佽闂笌瀹夊叏鐨勭敤鎴风骇鏁版嵁锛岃褰?鐢ㄦ埛鍋忓ソ銆?| `user_entity` | `user-preference-service` | yes |
| `iam_user_security_setting` | 韬唤銆佽闂笌瀹夊叏鐨勭敤鎴风骇鏁版嵁锛岃褰?鐢ㄦ埛瀹夊叏璁剧疆銆?| `user_entity` | `user-security-service` | yes |
| `iam_user_login_event` | 韬唤銆佽闂笌瀹夊叏鐨勪簨浠舵棩蹇楋紝璁板綍 鐢ㄦ埛鐧诲綍浜嬩欢銆?| `event_log` | `auth-service` | yes |
| `iam_verification_scene_policy` | 韬唤銆佽闂笌瀹夊叏鐨勯獙璇佺瓥鐣ワ紝璁板綍 楠岃瘉鍦烘櫙绛栫暐銆?| `verification_policy` | `sdkwork-appbase-iam` | yes |
| `iam_verification_challenge` | 韬唤銆佽闂笌瀹夊叏鐨勯獙璇佹寫鎴橈紝璁板綍 楠岃瘉鎸戞垬銆?| `verification_challenge` | `sdkwork-appbase-iam` | yes |
| `iam_verification_attempt` | 韬唤銆佽闂笌瀹夊叏鐨勯獙璇佸皾璇曪紝璁板綍 楠岃瘉灏濊瘯銆?| `verification_attempt` | `sdkwork-appbase-iam` | yes |

## 澶栭儴闆嗘垚涓庢湇鍔″晢

| 琛ㄥ悕 | 璇存槑 | profile | write_owner | generated |
| --- | --- | --- | --- | --- |
| `integration_provider_account` | 澶栭儴闆嗘垚涓庢湇鍔″晢鐨勪緵搴斿晢璐﹀彿鍑瘉寮曠敤锛岃褰?渚涘簲鍟嗚处鍙枫€?| `provider_account_secret_ref` | `integration-service` | yes |
| `integration_proxy` | 澶栭儴闆嗘垚涓庢湇鍔″晢鐨勫嚟璇佸紩鐢ㄩ厤缃紝璁板綍 浠ｇ悊銆?| `credential_ref` | `provider-service` | yes |
| `integration_webhook_endpoint` | 澶栭儴闆嗘垚涓庢湇鍔″晢鐨刉ebhook 閰嶇疆锛岃褰?Webhook 绔偣銆?| `webhook` | `webhook-service` | yes |
| `integration_service_provider` | 澶栭儴闆嗘垚涓庢湇鍔″晢鐨勬湇鍔″晢涓讳綋锛岃褰?鏈嶅姟鍟嗐€?| `commercial_provider_subject` | `service-provider-service` | yes |
| `integration_service_provider_edge` | 澶栭儴闆嗘垚涓庢湇鍔″晢鐨勬湇鍔″晢鍚堝悓杈癸紝璁板綍 鏈嶅姟鍟嗗叧绯昏竟銆?| `commercial_provider_contract_edge` | `service-provider-service` | yes |
| `integration_service_provider_closure` | 澶栭儴闆嗘垚涓庢湇鍔″晢鐨勬湇鍔″晢灞傜骇闂寘锛岃褰?鏈嶅姟鍟嗗眰绾ч棴鍖呫€?| `commercial_provider_tree_closure` | `service-provider-service` | yes |
| `integration_service_provider_member` | 澶栭儴闆嗘垚涓庢湇鍔″晢鐨勬湇鍔″晢鎴愬憳鍏崇郴锛岃褰?鏈嶅姟鍟嗘垚鍛樸€?| `commercial_provider_member` | `service-provider-service` | yes |
| `integration_service_provider_subject_binding` | 澶栭儴闆嗘垚涓庢湇鍔″晢鐨勬湇鍔″晢涓讳綋缁戝畾锛岃褰?鏈嶅姟鍟嗕富浣撶粦瀹氥€?| `commercial_provider_subject_binding` | `service-provider-service` | yes |
| `integration_service_provider_contract` | 澶栭儴闆嗘垚涓庢湇鍔″晢鐨勬湇鍔″晢鍚堝悓锛岃褰?鏈嶅姟鍟嗗悎鍚屻€?| `commercial_provider_contract` | `service-provider-service` | yes |
| `integration_service_provider_finance_profile` | 澶栭儴闆嗘垚涓庢湇鍔″晢鐨勬湇鍔″晢璐㈠姟閰嶇疆锛岃褰?鏈嶅姟鍟嗚储鍔￠厤缃€?| `commercial_provider_finance_profile` | `service-provider-service` | yes |
| `integration_service_provider_price_plan` | 澶栭儴闆嗘垚涓庢湇鍔″晢鐨勬湇鍔″晢浠锋牸鏂规锛岃褰?鏈嶅姟鍟嗕环鏍兼柟妗堛€?| `commercial_provider_price_plan` | `pricing-service` | yes |
| `integration_service_provider_price_rule` | 澶栭儴闆嗘垚涓庢湇鍔″晢鐨勬湇鍔″晢浠锋牸瑙勫垯锛岃褰?鏈嶅姟鍟嗕环鏍艰鍒欍€?| `commercial_provider_price_rule` | `pricing-service` | yes |
| `integration_provider_invoice_import` | 澶栭儴闆嗘垚涓庢湇鍔″晢鐨勪笂娓歌处鍗曞鍏ユ壒娆★紝璁板綍 渚涘簲鍟嗚处鍗曞鍏ユ壒娆°€?| `upstream_provider_invoice_import` | `reconciliation-worker` | yes |
| `integration_provider_invoice_item` | 澶栭儴闆嗘垚涓庢湇鍔″晢鐨勪笂娓歌处鍗曟槑缁嗭紝璁板綍 渚涘簲鍟嗚处鍗曟槑缁嗐€?| `upstream_provider_invoice_item` | `reconciliation-worker` | yes |

## 杩愮淮娌荤悊

| 琛ㄥ悕 | 璇存槑 | profile | write_owner | generated |
| --- | --- | --- | --- | --- |
| `ops_gateway_instance` | 杩愮淮娌荤悊鐨勬牳蹇冧富鏁版嵁锛岃褰?缃戝叧瀹炰緥銆?| `core_entity` | `ops-service` | yes |
| `ops_gateway_heartbeat` | 杩愮淮娌荤悊鐨勪簨浠舵棩蹇楋紝璁板綍 缃戝叧蹇冭烦銆?| `event_log` | `ops-agent` | yes |
| `ops_config_snapshot` | 杩愮淮娌荤悊鐨勫揩鐓э紝璁板綍 閰嶇疆蹇収銆?| `snapshot` | `control-plane` | yes |
| `ops_audit_log` | 杩愮淮娌荤悊鐨勫璁℃棩蹇楋紝璁板綍 瀹¤鏃ュ織銆?| `audit_log` | `audit-service` | yes |
| `ops_outbox_event` | 杩愮淮娌荤悊鐨勪簨鍔″彂浠剁浜嬩欢锛岃褰?鍙戜欢绠变簨浠躲€?| `outbox_event` | `all-transactional-services` | yes |
| `ops_inbox_event` | 杩愮淮娌荤悊鐨刬nbox event锛岃褰?鏀朵欢绠变簨浠躲€?| `inbox_event` | `all-event-consumers` | yes |
| `ops_job_execution` | 杩愮淮娌荤悊鐨勪簨浠舵棩蹇楋紝璁板綍 浠诲姟鎵ц銆?| `event_log` | `job-runtime` | yes |
| `ops_alert_event` | 杩愮淮娌荤悊鐨勪簨浠舵棩蹇楋紝璁板綍 鍛婅浜嬩欢銆?| `event_log` | `alert-service` | yes |
| `ops_notification_message` | 杩愮淮娌荤悊鐨勯€氱煡娑堟伅锛岃褰?閫氱煡娑堟伅銆?| `notification` | `notification-service` | yes |
| `ops_notification_recipient` | 杩愮淮娌荤悊鐨勯€氱煡鏀朵欢浜猴紝璁板綍 閫氱煡鏀朵欢浜恒€?| `notification_recipient` | `notification-service` | yes |
| `ops_notification_delivery` | 杩愮淮娌荤悊鐨勯€氱煡鎶曢€掞紝璁板綍 閫氱煡鎶曢€掋€?| `notification_delivery` | `notification-service` | yes |
| `ops_notification_preference` | 杩愮淮娌荤悊鐨勯€氱煡鍋忓ソ锛岃褰?閫氱煡鍋忓ソ銆?| `notification_preference` | `notification-service` | yes |
| `ops_metric_snapshot` | 杩愮淮娌荤悊鐨勬姇褰卞揩鐓э紝璁板綍 鎸囨爣蹇収銆?| `projection` | `metrics-worker` | yes |

## 绯荤粺瀹夎

| 琛ㄥ悕 | 璇存槑 | profile | write_owner | generated |
| --- | --- | --- | --- | --- |
| `system_installation_state` | 璁板綍搴旂敤鏁版嵁搴撳畨瑁呯姸鎬併€佺瀛愮増鏈拰瀹夎閿侊紝鐢ㄤ簬 installer 骞傜瓑鎵ц銆?| `installation_state` | `database-installer` | yes |
| `system_schema_migration` | 璁板綍 schema registry 鎴栧畨瑁呭櫒鎵ц杩囩殑鏁版嵁搴撹縼绉绘壒娆°€?| `installation_migration_log` | `database-installer` | yes |

