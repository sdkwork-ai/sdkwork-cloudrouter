> Migrated from `docs/16-鍓嶇浠ｇ爜濂戠害澶嶆牳涓庢暟鎹璁¤鐩栨锟?md` on 2026-06-24.
> Owner: SDKWork maintainers

> 鐗堟湰锛歷0.1
> 鏃ユ湡锟?026-04-28
> 鑼冨洿锛歚apps/sdkwork-clawrouter-pc` 褰撳墠璺敱銆乸ackage service/interface銆乵ock data 锟?`docs/schema-registry/sdkwork-clawrouter.tables.yaml` 鐨勯〉闈㈢骇瑕嗙洊澶嶆牳锟?> 绾︽潫锛氬彧淇鏁版嵁璁捐涓庢帴鍙ｅ绾︼紝涓嶈皟锟?portal 鏃㈡湁 UI 瑙嗚璁捐锟?> **2026-06-20锟?* 璇剧▼璺敱锟?`content_course*` 琛ㄥ绾﹀凡绉婚櫎锛沜ourse 锟?`sdkwork-course` 鎷ユ湁锛岃 [31-product-composition-model.md](./31-product-composition-model.md)锟?
褰撳墠鏁版嵁搴撹璁＄殑鎬讳綋鏂瑰悜鏄纭殑锛氭病鏈夋寜鍓嶇椤甸潰寤鸿〃锛岃€屾槸锟?IAM銆両ntegration銆丄I銆丆ommerce Projection銆丼tudio銆丆ontent銆丱ps銆丩egacy Compatible 绛夐鍩熸媶鍒嗕簨瀹炶〃銆佹姇褰辫〃鍜屽吋瀹硅〃锛岃兘澶熸敮锟?public銆乧onsole銆乤dmin 涓夌被椤甸潰锟?
鏈疆浠庡墠绔唬鐮佸弽鍚戞鏌ュ悗锛岀‘璁よ〃缁撴瀯鍦ㄦ牳蹇冮鍩熶笂宸茬粡鑳借鐩栵細

- 妯″瀷鐩綍銆佹ā鍨嬪巶锟?`ModelVendor`銆佹ā鍨嬭兘鍔涖€佹ā鍨嬭鎯呫€佹帓琛屾涓庝环鏍煎睍绀猴拷?- API Key 鍒涘缓銆佸垎缁勯€夋嫨銆侀搴︺€佺敤閲忋€両P 闄愬埗涓庡妯℃€佹潈闄愶拷?- Provider銆丆hannel銆佽璇佹柟寮忋€佹ā鍨嬬櫧鍚嶅崟/鏄犲皠銆佷唬鐞嗛厤缃笌鍋ュ悍鐘舵€侊拷?- `/v1/*` 缃戝叧 trace銆佽矾鐢卞喅绛栥€佺敤閲忎簨瀹炪€佽璐瑰揩鐓с€佹垚鏈笌缁撶畻鎶曞奖锟?- LLM銆両mage銆乂ideo銆丄udio銆丮usic銆丼FX銆佹湭锟?API 鎸夋/鎸夌粨锟?鎸夋潯鐩瓑缁熶竴璁￠噺锟?- 璐︽埛銆佺敤鎴枫€乂IP銆佸厖鍊笺€佷紭鎯犲埜銆佽鍗曘€佹敮浠樸€侀€€娆俱€佸彂绁ㄧ瓑缁х画澶嶇敤 `legacy-java-plus-entity` 锟?`plus_*` 琛紱鏂板鏁版嵁妯″瀷鍏堟煡 Java Entity锛屽瓨鍦ㄥ垯锟?Java app/backend API 鍜屽疄浣撶粨鏋勪负鍑嗭拷?- 搴旂敤涓績銆佹妧鑳戒腑蹇冦€佹枃妗ｃ€丼DK銆佽鍧涖€佹秷鎭€佸叕鍛娿€佺洃鎺с€侀檺娴佺瓑闂ㄦ埛鍜屽悗鍙拌兘鍔涳拷?
鏈疆鍙戠幇鐨勯棶棰樹笉鏄€滅己灏戝ぇ琛ㄢ€濓紝鑰屾槸閮ㄥ垎椤甸潰锟?`frontend_routes` 瑕嗙洊鏍囨敞鍋忕獎锛屽彲鑳藉鑷村悗缁敓锟?API銆丏TO銆丼DK 鎴栭獙鏀舵竻鍗曟椂婕忔帀鏁版嵁渚濊禆銆傚凡锟?schema registry 涓慨姝ｏ拷?
## 2. 鍓嶇浠ｇ爜杈撳叆

### 2.1 璺敱鍏ュ彛

| 椤甸潰锟?| 璺敱 |
| --- | --- |
| Public | `/`, `/models`, `/models/:id`, `/models/:provider/:model`, `/rankings`, `/apps`, `/apps/:id`, `/skills-hub`, `/skills-hub/:id`, `/product-docs`, `/docs`, `/api-reference`, `/sdk-reference`, `/playground`, `/forum`, `/forum/:id` |
| Console | `/console/dashboard`, `/console/usage`, `/console/gateway`, `/console/routing`, `/console/api-keys`, `/console/user`, `/console/commerce`, `/console/checkout`, `/console/settlements`, `/console/account`, `/console/recharge`, `/console/settings`, `/console/notifications`, `/console/providers` |
| Admin | `/admin/dashboard`, `/admin/user`, `/admin/group`, `/admin/model`, `/admin/channel`, `/admin/announcement`, `/admin/marketing`, `/admin/record`, `/admin/monitor`, `/admin/ratelimit`, `/admin/finance` |

### 2.2 鍏抽敭 service/interface

| 鍓嶇瀵硅薄 | 鏉ユ簮 | 鍏抽敭瀛楁 |
| --- | --- | --- |
| `Vendor`, `Model` | `admin-model/src/modelService.ts`, `models/src/data/models.ts` | vendor銆乵odel銆乵odality銆乧ontext銆乸ricing銆乧apabilities銆乤piFormat銆乸arameters銆乴atency銆乼hroughput銆乴imitations銆乽seCases |
| `ChannelItem`, provider config | `admin-channel/src/channelService.tsx`, `console-routing/src/routingService.ts`, `console-providers/src/providerService.ts` | vendor銆乸rotocol銆乤ccessType銆乵odels銆乧apabilities銆亀eight銆乻tatus銆乥alance銆乪rrors銆乽rl銆乸roxy銆乵odels config |
| `ApiKey`, `GroupData` | `console-api-keys/src/apiKeyService.ts`, `admin-group/src/groupService.ts` | group銆乺ate銆乹uota銆乽sedQuota銆乵odalities銆乮pLimit銆乥illingType銆乺ateMultiplier銆乧apacity銆乽sage |
| `UsageLog`, `LogRecord`, `GatewayTrace`, `RequestTrace` | usage/gateway/routing/admin-record | requestId銆乵odel銆乸ath銆乻tatus銆乨uration銆乼tft銆乻tream銆乼okens銆乧acheReadTokens銆乧ost銆乵ultiplier銆乥ase price銆乺easoningEffort銆乮p銆乧hannel |
| Billing/settlement/finance records | billing/settlements/account/recharge/admin-finance/admin-marketing | orderNo銆乼radeNo銆乤mount銆乵ethod銆乻tatus銆乥ill period銆乥reakdown銆乮nvoice settings銆乺echarge packages銆乧oupon codes |
| Playground history | `@sdkwork/generations-pc-playground` (`PlaygroundPage.tsx`, `GenerationChatInput.tsx`), `@sdkwork/generations-pc-workspace` (domain generation workspace), domain `*-pc-generation` panels | modality銆乻elected model銆乸rompt銆乺atio銆乺esolution銆亀idth銆乭eight銆乭istory銆乸review asset銆乫avorite銆乨ownload銆乻hare |
| Portal content | app-center銆乻kills-hub銆乫orum銆乤pi-reference銆乻dk-reference | releases銆乻creenshots銆乫rameworks銆乴icense銆乸osts銆乧omments銆丱penAPI snapshot銆丼DK language/package/examples |

## 3. 瑕嗙洊鐭╅樀

| 椤甸潰/妯″潡 | 褰撳墠鏁版嵁搴撹惤锟?| 澶嶆牳缁撹 |
| --- | --- | --- |
| Models list/detail | `ai_model_vendor`, `ai_model_family`, `ai_model`, `ai_model_capability`, `ai_billing_meter`, `ai_model_pricing`, `ai_pricing_plan`, `ai_pricing_rule`, `integration_provider`, `legacy_model_info`, `legacy_model_price` | 鑳借鐩栥€傛ā鍨嬭鎯呴〉鏈変环鏍笺€佽閲忋€佽兘鍔涖€佸弬鏁般€侀檺鍒躲€佹€ц兘瀛楁锛屼笉鑳藉彧璇绘ā鍨嬩富琛拷?|
| Rankings | `ai_model_rank_snapshot`, `ai_usage` | 鑳借鐩栥€傛帓琛屾浣跨敤蹇収琛紝閬垮厤瀹炴椂锟?usage 鐑〃锟?|
| Playground | `ai_generation_session`, `ai_generation_job`, `ai_generation_asset`, `ai_generation_asset_action`, `ai_model`, `ai_model_capability`, `ai_billing_meter`, `ai_model_pricing`, `ai_pricing_plan`, `ai_usage`, `integration_provider` | 鏈疆琛ュ己銆傜敓鎴愬巻鍙插師璁捐宸茶鐩栵紝浣嗘ā鍨嬮€夋嫨銆佽兘鍔涜繃婊ゃ€佷环鏍间及绠楀拰鏈€缁堟墸璐硅繕蹇呴』鍏宠仈妯″瀷鐩綍銆佽閲忚〃銆佷环鏍兼柟妗堝拰鐢ㄩ噺浜嬪疄锟?|
| Console API Keys | `plus_api_key`, `iam_gateway_api_key`, `ai_channel_group`, `iam_gateway_access_policy`, `ai_quota_policy`, `ai_pricing_plan`, `ai_pricing_plan_binding` | 鑳借鐩栥€傚垱锟?API Key 閫夋嫨鐨勬槸涓氬姟鍒嗙粍 `ai_channel_group`锛屼笉鏄环鏍煎垎缁勶拷?|
| Admin Group | `ai_channel_group`, `ai_channel_group_metric_snapshot`, `ai_pricing_plan`, `ai_pricing_plan_binding`, `iam_gateway_access_policy` | 鑳借鐩栥€傚垎缁勬壙锟?Key銆佺瓥鐣ャ€佸閲忋€侀粯璁ゅ畾浠锋柟妗堢殑涓氬姟缁戝畾锟?|
| Console/Admin Routing/Channel | `integration_provider`, `ai_channel`, `ai_channel_credential`, `ai_channel_resource`, `ai_model_mapping_rule*`, `integration_proxy`, `ai_routing_*`, `ops_config_snapshot` | 鏈疆琛ュ己 `/console/providers` 瀵硅祫婧愭巿鏉冦€佹ā鍨嬫槧灏勫拰閰嶇疆蹇収鐨勮矾鐢辫鐩栥€係ecret 鍙繚瀛樺紩鐢ㄤ笌 hash锟?|
| Usage/Gateway/Admin Record | `ai_request_trace`, `ai_routing_decision_log`, `ai_usage`, `ai_billing_meter` | 鑳借鐩栥€倀race銆乺outing decision銆乥illing fact 鍒嗗眰姝ｇ‘锟?|
| Billing/Recharge/Marketing/Finance | `plus_account`, `plus_account_history`, `plus_order`, `plus_order_item`, `plus_order_dispatch_rule`, `plus_order_worker_dispatch_profile`, `plus_payment`, `plus_payment_webhook_event`, `plus_refund`, `plus_invoice*`, `promotion_offer`, `promotion_coupon_stock`, `promotion_code`, `promotion_user_coupon`, `promotion_discount_application`, `plus_vip_recharge*`, `commerce_usage_statement*`, `commerce_usage_settlement` | 鑳借鐩栥€俛dmin marketing 鐨勫崱鍒搞€佹壒娆°€佸厬鎹㈢爜鍜屾牳閿€瀵归綈鏍囧噯 `promotion_*`锛涘厖鍊煎寘/鏀粯璁板綍銆乤dmin finance 鐨勫彂绁ㄤ富琛ㄣ€佽鍗曟淳鍙戝拰鏀粯鍥炶皟浠嶆寜鍚勮嚜鏍囧噯浜嬪疄琛ㄥ鐞嗭拷?|
| Account/User/Settings/Messages | `plus_user`, `plus_oauth_account`, `plus_account`, `iam_user_preference`, `iam_user_security_setting`, `iam_user_login_event`, `integration_webhook_endpoint`, `ops_notification_message`, `ops_notification_delivery` | 鑳借鐩栥€侾II 涓庣櫥褰曞畨鍏ㄤ簨浠朵笉澶嶅埗鍒颁笟鍔℃姇褰辫〃锟?|
| App Center/Skills Hub | `appstore_app`, `plus_agent_skill`, `plus_agent_skill_package`, `plus_user_agent_skill`, `plus_category`, `studio_catalog_action` | 鑳借鐩栥€侫ppCenter 涓绘暟鎹部锟?Java `platform_app`锛汼killsHub 涓绘暟鎹部锟?Java AgentSkills锛屽垎绫绘部锟?`PlusCategory`锛涚増鏈€侀暅鍍忋€佹鏋躲€佹埅鍥剧瓑 portal 灞曠ず鍏冩暟鎹粠 AgentSkill manifest/defaultConfig 閫傞厤锛涗笅杞姐€佹敹钘忋€佽瘎鍒嗕綔涓鸿涓轰簨瀹烇拷?|
| Forum | `content_forum_post`, `content_forum_comment`, `content_reaction` | 鑳借鐩栥€傝瘎璁轰娇鐢ㄩ€氱敤 target锛屾敮鎸佽鍧涘唴瀹癸拷?|
| API/SDK Reference | `content_openapi_snapshot`, `content_sdk_release`, `content_doc_page` | 鑳借鐩栥€侽penAPI 锟?SDK 婧愭枃浠朵粛鐢辨瀯寤轰骇锟?鍙戝竷娴佹按绾胯礋璐ｏ紝DB 淇濆瓨鐗堟湰銆乭ash銆乵anifest 涓庣储寮曪拷?|
| Monitor/RateLimit | `ops_gateway_instance`, `ops_gateway_heartbeat`, `ops_metric_snapshot`, `ops_alert_event`, `ai_quota_policy`, `ai_usage`, `iam_gateway_risk_rule`, `iam_gateway_access_policy` | 鑳借鐩栨湰鍦版闈€丼erver銆丏ocker銆並8S 杩愯褰㈡€佸拰闄愭祦/椋庢帶椤甸潰锟?|

## 4. 鏈疆 schema registry 淇

| 淇锟?| 鍘熼锟?| 淇 |
| --- | --- | --- |
| 妯″瀷璇︽儏椤典环鏍艰锟?| `/models/:id` 锟?`/models/:provider/:model` 鍙爣娉ㄦā锟?鑳藉姏琛紝鍚庣画 DTO 鍙兘婕忔帀 pricing | 锟?`ai_billing_meter`, `ai_model_pricing`, `ai_pricing_plan` 锟?`frontend_routes` 鎵╁睍鍒版ā鍨嬭鎯呰矾锟?|
| Playground 妯″瀷閫夋嫨涓庢垚鏈及锟?| 鍙爣娉ㄧ敓鎴愬巻鍙茶〃锛屾棤娉曚粠 registry 鐪嬪嚭妯″瀷閫夋嫨銆佽閲忋€佷环鏍煎拰鎵ｈ垂渚濊禆 | 锟?`ai_model`, `ai_model_capability`, `ai_billing_meter`, `ai_model_pricing`, `ai_pricing_plan`, `ai_usage`, `integration_provider` 瑕嗙洊锟?`/playground` |
| Console providers 璧勬簮閰嶇疆 | 椤甸潰锟?`models.config.json` 锟?`proxy.conf`锛屽師瑕嗙洊缂哄皯璧勬簮鎺堟潈銆佹ā鍨嬫槧灏勫拰閰嶇疆蹇収 | 锟?`ai_channel_resource`銆乣ai_model_mapping_rule*` 锟?`ops_config_snapshot` 瑕嗙洊锟?`/console/providers` |
| Admin marketing 鍏呭€艰锟?| 椤甸潰灞曠ず鍏呭€艰褰曘€佹敮浠樻柟寮忋€佷氦鏄撳彿锛屽師瑕嗙洊鍋忓悜 coupon/invitation | 锟?`plus_vip_recharge_pack`, `plus_vip_recharge_method`, `plus_order`, `plus_payment` 瑕嗙洊锟?`/admin/marketing` |
| Admin finance 鍙戠エ涓昏〃 | 鍘熻鐩栧彂锟?item/record锛屼絾 finance 璐﹀崟瑙嗗浘浠嶉渶瑕佸彂绁ㄤ富琛ㄤ笂涓嬫枃 | 锟?`plus_invoice` 瑕嗙洊锟?`/admin/finance` |

## 5. 璁捐鍒ゆ柇

### 5.1 搴旇淇濇寔鐜板湪鐨勯鍩熸媶锟?
涓嶅缓璁妸琛ㄦ寜 `console_*`銆乣admin_*`銆乣portal_*` 缁х画鎷嗐€傚墠绔幇鍦ㄨ櫧鐒舵槸涓€涓悎锟?portal锛屼絾瀹冨悓鏃跺寘鍚叕鍏遍棬鎴枫€佺敤鎴锋帶鍒跺彴鍜岀鐞嗗悗鍙般€傛寜椤甸潰寤鸿〃浼氬鑷村悓涓€浜嬪疄閲嶅鍐欏叆锛屼緥濡傛ā鍨嬩环鏍笺€丄PI Key 鍒嗙粍銆佹敮浠樻祦姘淬€佺敤閲忚处鍗曞拰 Provider 閰嶇疆閮戒細琚澶勬秷璐广€傚綋鍓嶇殑棰嗗煙鎷嗗垎鏇撮€傚悎蹇€熼儴缃插拰闀挎湡鎵╁睍锟?
### 5.2 `ai_billing_meter` 涓嶆槸杩囧害璁捐

浠庡墠绔唬鐮佺湅锛孭layground 锟?dashboard 宸茬粡鍑虹幇 text銆乮mage銆乿ideo銆乤udio銆乵usic銆乻fx锛屽鏁伴〉闈㈢殑娑堣垂璁板綍涔熶笉鍙緷锟?token銆備环鏍间綋绯诲鏋滃彧锟?`input_token/output_token` 鎴栫畝锟?`billing_type=token/count/duration`锛屽悗缁敮鎸佸浘鐗囧儚绱犮€侀煶棰戠銆佽闊冲瓧绗︺€佽棰戠銆佺粨鏋滄暟銆佹潯鐩暟銆佸伐鍏疯皟鐢ㄣ€佸瓨鍌ㄥ拰娴侀噺鏃朵細鎸佺画鍔犲瓧娈点€傜粺涓€钀藉埌 `billing_meter_code + billable_quantity + billable_unit` 鏇寸ǔ锟?
### 5.3 涓氬姟鍒嗙粍鍜屽畾浠锋柟妗堢殑杈圭晫蹇呴』淇濇寔

API Key 鍒涘缓閫夋嫨鐨勬槸 `ai_channel_group`銆傚畾浠锋柟妗堟槸 `ai_pricing_plan`锛岄€氳繃 `ai_channel_group.pricing_plan_id` 锟?`ai_pricing_plan_binding` 缁戝畾锟?group銆乲ey銆乽ser銆乿ip銆乻ku銆乼enant 绛変富浣撱€備笉鑳藉啀寮曞叆浠锋牸涓撶敤 group 琛ㄨ繖绫荤嫮绐勫懡鍚嶏拷?
### 5.4 UI 涓嶅簲琚暟鎹簱璁捐鍙嶅悜椹卞姩

鍚庣画鏇挎崲 mock service 鏃讹紝鍙兘璋冩暣鏁版嵁閫傞厤灞傘€丏TO銆乴oading/error/empty 鐘舵€佸拰蹇呰鐨勬帴鍙ｅ瓧娈垫槧灏勶紝涓嶅簲淇敼 `sdkwork-clawrouter-pc` 宸茬粰瀹氱殑甯冨眬銆侀鑹层€佸瓧浣撱€侀棿璺濄€佺粍浠跺瑙傚拰浜や簰椋庢牸銆傛暟鎹簱锟?API 鐨勮亴璐ｆ槸閫傞厤鍓嶇浜у搧瀹氫箟锟?
## 6. 涓嬩竴姝ュ缓锟?
1. 鍩轰簬 schema registry 鐢熸垚 P0/P1 PostgreSQL DDL 鑽夋锛屽苟锟?SQLite 鏈湴妗岄潰妯″紡鐢熸垚鍏煎 DDL锟?2. 锟?`/app/v3/api` 锟?`/backend/v3/api` 杈撳嚭椤甸潰锟?OpenAPI 鍒嗙粍锛岃矾寰勪繚锟?Java app-api/backend-api 鏍囧噯锟?3. 鐢熸垚 TypeScript SDK service adapter锛屾妸 portal 褰撳墠 mock service 閫愭鏇挎崲锟?SDK 璋冪敤锛屼絾淇濇寔 UI 缁勪欢涓嶅彉锟?4. 澧炲姞 CI 妫€鏌ワ細姣忎釜 `src/App.tsx` 璺敱蹇呴』锟?registry 鑷冲皯鏈変竴涓〃瑕嗙洊锛涙秹鍙婇噾棰濄€佷环鏍笺€佷綑棰濈殑瀛楁蹇呴』浣跨敤 decimal string锛涙秹锟?key/secret/IP 鐨勮〃蹇呴』婊¤冻 L3 瀹夊叏瀛楁锟?
