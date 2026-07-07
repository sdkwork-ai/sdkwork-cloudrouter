> Migrated from `docs/12-鍓嶇鍔熻兘妯″潡涓庢暟鎹簱琛ㄧ粨鏋勬槧锟?md` on 2026-06-24.
> Owner: SDKWork maintainers

> 鐗堟湰锛歷0.1
> 鏃ユ湡锟?026-04-28
> 鑼冨洿锛歚apps/sdkwork-clawrouter-pc` 褰撳墠鍓嶇鍔熻兘妯″潡銆侀〉闈㈡暟鎹璞°€丄PI 闈㈠拰鏁版嵁搴撹〃缁撴瀯鏄犲皠锟?> 渚濇嵁锛歚src/App.tsx`銆乣src/AdminLayout.tsx`銆乣packages/*/src/*Service.ts(x)`銆乣packages/*/src/data/*.ts`銆乕05-鏁版嵁搴撹锟?md](./05-鏁版嵁搴撹锟?md)銆乕11-鏁版嵁濂戠害涓庢牳蹇冭〃璁捐.md](./11-鏁版嵁濂戠害涓庢牳蹇冭〃璁捐.md)銆乕13-椤甸潰绾ф暟鎹粨鏋勮鐩栦笌SchemaRegistry钀藉湴璁捐.md](./13-椤甸潰绾ф暟鎹粨鏋勮鐩栦笌SchemaRegistry钀藉湴璁捐.md)銆乕14-鏁版嵁缁撴瀯缁嗚妭澶嶆牳涓庤ˉ寮鸿锟?md](./14-鏁版嵁缁撴瀯缁嗚妭澶嶆牳涓庤ˉ寮鸿锟?md)锟?> **2026-06-20锟?* Courses 妯″潡锟?`content_course*` 鏄犲皠宸查€€褰癸紱褰撳墠浜у搧锟?[31-product-composition-model.md](./31-product-composition-model.md) 涓哄噯锟?
## 1. 璁捐鐩爣

鏈枃鎶婂綋鍓嶅墠绔凡缁忓嚭鐜扮殑鍔熻兘妯″潡鍏ㄩ儴鏄犲皠鍒版暟鎹簱璁捐锛岃В鍐充笁涓棶棰橈細

- 椤甸潰鍔熻兘鍜屾暟鎹簱琛ㄤ笉鑴辫妭锛氭瘡锟?public銆乧onsole銆乤dmin 妯″潡閮芥湁鏄庣‘浜嬪疄鏉ユ簮锟?- 瀛橀噺涓氬姟琛ㄤ笉琚噸澶嶈璁★細鐢ㄦ埛銆佽处鎴枫€乂IP銆佸厖鍊笺€佷紭鎯犲埜銆佽鍗曘€佹敮浠樸€侀€€娆俱€佸彂绁ㄧ户缁娇锟?`legacy-java-plus-entity` 锟?`plus_*` 琛紱鏂板妯″瀷璁捐鍓嶅厛锟?Java Entity锛屽瓨鍦ㄥ垯鐧昏 L0 鍏煎琛紝涓嶆柊寤哄悓涔夎〃锟?- 鏂板鍔熻兘琛ラ綈鏍囧噯琛ㄧ粨鏋勶細Playground 鐢熸垚鍘嗗彶銆佸簲鐢ㄤ腑蹇冦€佹妧鑳戒腑蹇冦€佽鍧涜绋嬨€侀€氱煡涓績銆乄ebhook銆佹帓琛屾銆佽处鍗曟姇褰辩瓑杩涘叆鏍囧噯涓氬姟鍓嶇紑琛拷?- 鍓嶇 UI 瑙嗚璁捐涓嶈鏁版嵁璁捐鍙嶅悜椹卞姩锛氬悗绔€佹暟鎹簱銆丼DK 鍜屾帴鍙ｅ疄鐜板繀椤婚€傞厤 `apps/sdkwork-clawrouter-pc` 褰撳墠鐢ㄦ埛璁捐锛屼笉鑳戒负浜嗗疄鐜颁究鍒╂敼鍙樻棦鏈夊竷灞€銆佽壊褰┿€佸瓧浣撱€侀棿璺濄€佺粍浠跺瑙傘€佸鑸粨鏋勬垨浜や簰椋庢牸锟?
鏈枃鏄€昏緫鏁版嵁缁撴瀯姊崇悊锛屼笉锟?DDL 鑴氭湰銆傜敓锟?DDL 鍓嶄粛瑕佹寜 `DATABASE_SPEC.md` 杈撳嚭 schema registry 鎴栫瓑浠峰绾︼紱褰撳墠鍙牎楠岃〃濂戠害锟?[schema-registry/sdkwork-clawrouter.tables.yaml](./schema-registry/sdkwork-clawrouter.tables.yaml)锟?
### 1.1 UI 瑙嗚淇濇姢绾︽潫

`apps/sdkwork-clawrouter-pc` 鏄敤鎴峰凡缁欏畾鐨勪骇鍝佽瑙夊熀鍑嗐€傚悗缁妸 mock service 鏇挎崲锟?app/backend SDK銆佹帴鍏ョ湡瀹炴暟鎹簱銆佷慨澶嶆暟鎹瓧娈电己鍙ｆ垨璋冩暣 API DTO 鏃讹紝鍙厑璁告敼鍙樻暟鎹潵婧愩€佸姞杞界姸鎬併€侀敊璇姸鎬佸拰蹇呰鐨勭┖鎬佹枃妗堬紝涓嶅厑璁告搮鑷敼鍙橀〉闈㈣瑙夎璁°€傝嫢纭疄闇€瑕佽皟锟?UI锛屽繀椤讳綔涓虹嫭绔嬩骇鍝佽璁″彉鏇存彁鍑猴紝涓嶅緱澶瑰甫鍦ㄦ暟鎹粨鏋勬垨鎺ュ彛瀹炵幇浠诲姟涓拷?
## 2. 鍓嶇妯″潡鍒嗘瀽鏉ユ簮

### 2.1 璺敱鍏ュ彛

| 浜у搧锟?| 璺敱鏉ユ簮 | 妯″潡 |
| --- | --- | --- |
| Public | `src/App.tsx` 锟?`MainLayout` | Home銆丮odels銆丷ankings銆丄ppCenter銆丼killsHub銆丏ocs銆丄piReference銆丼dkReference銆丳layground銆丗orum |
| Console | `src/App.tsx` + `console-core/ConsoleLayout.tsx` | Dashboard銆丄PI Keys銆乁sage銆丟ateway銆丷outing銆丅illing銆丆heckout銆丼ettlements銆丄ccount銆丷echarge銆丼ettings銆丮essages銆丳roviders銆乁ser |
| Admin | `src/App.tsx` + `src/AdminLayout.tsx` | Dashboard銆乁ser銆丟roup銆丮odel銆丆hannel銆丄nnouncement銆丮arketing銆丗inance銆丷ecord銆丷ateLimit銆丮onitor |

### 2.2 鍏抽敭鏁版嵁瀵硅薄

褰撳墠鍓嶇 service/interface 鏆撮湶鐨勬暟鎹璞″彲浠ュ綊绾充负锟?
| 鍓嶇瀵硅薄 | 鏉ユ簮鏂囦欢 | 褰掑睘鏁版嵁锟?|
| --- | --- | --- |
| `ApiKey`銆乣ApiKeyItem` | console/admin user銆乧onsole api-keys | `plus_api_key` + `iam_gateway_*`锛屽垎缁勫锟?鐢ㄩ噺锟?`ai_channel_group_metric_snapshot` |
| `ChannelItem`銆乣ProviderConfig`銆乣Channel` | admin channel銆乧onsole routing銆乧onsole providers | `integration_*` |
| `UsageLog`銆乣LogRecord`銆乣GatewayTrace`銆乣RequestTrace` | console usage/gateway/routing銆乤dmin record | `ai_request_trace`銆乣ai_usage`銆乣ai_routing_decision_log` |
| `Bill`銆乣BillingRecord`銆乣TransactionRecord` | console settlements銆乤dmin finance | `commerce_usage_statement`銆乣commerce_usage_settlement` + `commerce_account_ledger_entry` |
| `RechargePackage`銆乣RechargeRecord` | console recharge銆乤dmin marketing | `plus_vip_recharge*`銆乣plus_order`銆乣plus_payment` |
| `PromotionOfferRecord`銆乣PromotionCouponStockRecord`銆乣PromotionCodeRecord`銆乣PromotionCodeRedemptionRecord` | admin marketing | `promotion_offer`銆乣promotion_coupon_stock`銆乣promotion_code`銆乣promotion_code_redemption`銆乣promotion_user_coupon`銆乣promotion_discount_application` |
| `UserProfile`銆乣UserListItem`銆乣AccountStats` | console user/account銆乤dmin user | `plus_user`銆乣plus_account` + `iam_user_*` 鎵╁睍锛岀櫥褰曟槑缁嗚蛋 `iam_user_login_event` |
| `SettingsData` | console settings | `iam_user_preference`銆乣integration_webhook_endpoint`銆乣ops_notification_*` |
| `Message` | console messages | `ops_notification_message`銆乣ops_notification_delivery` |
| `Model`銆乣Vendor`銆乣RankingModel` | models銆乺ankings銆乤dmin model | `ai_model_vendor`銆乣ai_model_family`銆乣ai_model`銆乣ai_model_pricing`銆乣ai_model_rank_snapshot` |
| `App`銆乣AppRelease` | app center | `appstore_app` + `appstore_app.release_notes` + `appstore_app.install_config` + `appstore_app.resource_list` |
| `Skill` | skills hub | `plus_agent_skill`銆乣plus_agent_skill_package`銆乣plus_user_agent_skill`銆乣plus_category` |
| `Post`銆乣Comment` | forum | `content_forum_*` |
| Playground history and generated items | playground | `ai_generation_session`銆乣ai_generation_job`銆乣ai_generation_asset`銆乣ai_generation_asset_action` |

## 3. 鎬讳綋鏁版嵁锟?
| 鏁版嵁锟?| 琛ㄥ墠缂€ | 鐢拷?|
| --- | --- | --- |
| IAM | `iam_` | API Key 鎵╁睍銆佽闂瓥鐣ャ€佺敤鎴峰亸濂藉拰瀹夊叏璁剧疆鎵╁睍 |
| Integration | `integration_` | Provider銆佹笭閬撱€佽处鍙枫€佹ā鍨嬫槧灏勩€佷唬鐞嗐€乄ebhook銆佸仴搴峰揩锟?|
| AI | `ai_` | 妯″瀷鐩綍銆佷环鏍笺€佹帓琛屾銆佽矾鐢便€佽锟?trace銆佺敤閲忎簨瀹炪€佺敓鎴愪换鍔″拰璧勪骇 |
| Commerce Projection | `commerce_` | 鐢ㄩ噺缁撶畻銆佽处鍗曟姇褰便€佸鍑猴紱涓嶆浛锟?`plus_account`銆乣plus_order`銆乣plus_payment` |
| Studio | `studio_` | 搴旂敤涓績銆佹妧鑳戒腑蹇冦€佺増鏈€佸獟锟?|
| Content | `content_` | 鍏憡銆佹枃妗ｃ€佽锟?|
| Ops | `ops_` | 瀹¤銆侀€氱煡銆佹寚鏍囥€佸疄渚嬨€佸績璺炽€佷簨浠躲€佷换鍔°€佸憡锟?|
| Legacy Compatible | `plus_` | 鏃㈡湁鐢ㄦ埛銆佽处鎴枫€乂IP銆佸厖鍊笺€佷紭鎯犲埜銆佽鍗曘€佹敮浠樸€侀€€娆俱€佸彂绁ㄤ簨瀹炴潵锟?|

缁熶竴棰嗗煙鍚嶇害鏉燂細鍓嶇 `Vendor` 缁勪欢鍜屾ā鍨嬬瓫閫変腑鐨勨€滄ā鍨嬪巶瀹垛€濈粺涓€鏄犲皠锟?`ModelVendor`锛屼簨瀹炴潵婧愭槸 `ai_model_vendor.vendor_code`锛汚PI 鎺ュ叆渚涘簲锟?骞冲彴缁熶竴鏄犲皠锟?`Provider`锛屼簨瀹炴潵婧愭槸 `integration_provider.provider_code`銆侽penRouter銆丄zure銆丄WS銆丟CP銆丱llama 绛夋帴鍏ュ钩鍙颁紭鍏堝綊锟?`Provider`锛屽彧鏈夊畠浠彂甯冭嚜鏈夋ā鍨嬫椂鎵嶈繘锟?`ModelVendor`锟?
## 4. Public 妯″潡鏄犲皠

| 鍓嶇妯″潡 | 璺敱 | 鍔熻兘 | 鏁版嵁锟?|
| --- | --- | --- | --- |
| Home | `/` | 浜у搧棣栭〉銆侀儴缃叉柟寮忋€佽兘鍔涘睍锟?| 闈欐€佸唴瀹癸紱鍙拷?`content_doc_page` 绠＄悊棣栭〉鍐呭锟?|
| Models | `/models`銆乣/models/:id`銆乣/models/:provider/:model` | 妯″瀷鐩綍銆佽鎯呫€佸巶瀹躲€佹ā鍨嬫棌銆佷环鏍笺€佽兘鍔涖€佸弬鏁般€佺敤渚嬶紱鏀寔妯″瀷 ID 鍜屼緵搴斿晢/妯″瀷鍙屾娣遍摼 | `ai_model_vendor`銆乣ai_model_family`銆乣ai_model`銆乣ai_model_capability`銆乣ai_model_pricing`銆乣integration_provider` |
| Rankings | `/rankings` | 妯″瀷鎺掕姒溿€佽秼鍔裤€佸懆浣跨敤閲忋€佸巶锟?渚涘簲锟?妯℃€佽繃锟?| `ai_model_rank_snapshot`锛屽巶瀹舵潵锟?`vendor_code`锛屽師濮嬩簨瀹炴潵锟?`ai_usage` |
| AppCenter | `/apps`銆乣/apps/:id` | 搴旂敤鍒楄〃銆佽鎯呫€佹埅鍥俱€佺増鏈€佷笅杞姐€佽瘎鍒嗐€佹敹锟?| `appstore_app`銆乣studio_catalog_action` | App 涓绘暟鎹潵锟?Java `platform_app`锛涚増锟?涓嬭浇锟?濯掍綋鏉ヨ嚜 `appstore_app` JSON 瀛楁锛涜涓烘暟鎹潵锟?`studio_catalog_action` |
| SkillsHub | `/skills-hub`銆乣/skills-hub/:id` | 鎶€鑳藉垪琛ㄣ€佽鎯呫€侀暅鍍忋€佺増鏈€佹鏋躲€佹埅鍥俱€佷笅杞姐€佽瘎鍒嗐€佹敹锟?| `plus_agent_skill`銆乣plus_agent_skill_package`銆乣plus_user_agent_skill`銆乣plus_category`銆乣studio_catalog_action` | 涓绘暟鎹部锟?Java AgentSkills锛涘垎绫绘部锟?Java `PlusCategory`锛沘pp 锟?API 锟?`/app/v3/api/skills`锛岀鐞嗙 API 锟?`/backend/v3/api/skill`銆乣/backend/v3/api/skill/package`銆乣/backend/v3/api/category` |
| Docs/ProductDocs | `/docs`銆乣/product-docs` | 浜у搧鏂囨。 | `content_doc_page` 鎴栨瀯寤轰骇鐗╋紝涓嶈繘鍏ヤ氦鏄撻摼锟?|
| ApiReference | `/api-reference` | OpenAPI 灞曠ず銆佹帴锟?playground銆佺増鏈竻锟?| OpenAPI 鏂囦欢涓轰簨瀹炴潵婧愶紱`content_openapi_snapshot` 淇濆瓨鐗堟湰銆乭ash銆佸垎绫绘爲鍜岀ず锟?manifest |
| SdkReference | `/sdk-reference` | SDK 璇█銆佸畨瑁呭懡浠ゃ€佺ず渚嬨€佸寘鐗堟湰 | SDK metadata 鏂囦欢涓轰簨瀹炴潵婧愶紱`content_sdk_release` 淇濆瓨鍙绱㈠彂甯冩竻锟?|
| Playground | `/playground` | Agent銆佸浘鐗囥€佽棰戙€侀煶涔愩€佽闊炽€侀煶鏁堢敓鎴愬拰鍘嗗彶璧勪骇 | `ai_generation_session`銆乣ai_generation_job`銆乣ai_generation_asset`銆乣ai_generation_asset_action`銆乣ai_usage` |
| Forum | `/forum`銆乣/forum/:id` | 甯栧瓙銆佽瘎璁恒€佸洖澶嶃€佺偣璧炪€佺疆椤躲€佹爣锟?| `content_forum_post`銆乣content_forum_comment`銆乣content_reaction` |

## 5. Console 妯″潡鏄犲皠

| 鍓嶇妯″潡 | 璺敱 | 鍔熻兘 | API 锟?| 鏁版嵁锟?|
| --- | --- | --- | --- | --- |
| Dashboard | `/console/dashboard` | 鐢ㄩ噺瓒嬪娍銆佹ā鍨嬫帓琛屻€佸叕锟?| `/app/v3/api` | `ai_usage`銆乣ai_model_rank_snapshot`銆乣content_announcement`銆乣ops_metric_snapshot` |
| API Keys | `/console/api-keys` | 鍒涘缓銆佹壒閲忓垱寤恒€佹煡鐪嬨€佺紪杈戙€佸垹锟?Key銆侀€夋嫨鍒嗙粍銆侀搴︺€佹ā鍨嬫潈闄愩€両P 闄愬埗 | `/app/v3/api` | `plus_api_key`銆乣iam_gateway_api_key`銆乣ai_channel_group`銆乣ai_channel_group_metric_snapshot`銆乣iam_gateway_access_policy`銆乣ai_pricing_plan`銆乣ai_quota_policy` |
| Usage | `/console/usage` | 璋冪敤鏃ュ織銆乼oken銆佽€楁椂銆佷环鏍笺€佽矾寰勩€両P | `/app/v3/api` | `ai_request_trace`銆乣ai_usage`銆乣ai_routing_decision_log` |
| Gateway | `/console/gateway` | 缃戝叧 trace銆乪ndpoint銆佺姸鎬併€乨uration銆乧hannel | `/app/v3/api` | `ai_request_trace`銆乣ops_gateway_instance` |
| Routing | `/console/routing` | 娓犻亾璐﹀彿銆佺瓥鐣ャ€丠A銆佹棩蹇椼€佺粺璁°€佽姹傛暟鎹€並ey | `/app/v3/api` | `integration_*`銆乣ai_routing_*`銆乣ai_request_trace`銆乣ai_usage` |
| Commerce | `/console/commerce` | 鍏戞崲鐮併€佸厖鍊笺€佸巻鍙茶锟?| `/app/v3/api/promotions` + `/app/v3/api/billing` | `promotion_code`銆乣promotion_user_coupon`銆乣promotion_discount_application`銆乣commerce_recharge_package`銆乣commerce_order`銆乣commerce_payment_*` |
| Checkout | `/console/checkout` | 鏀粯纭 | `/app/v3/api` | `plus_order`銆乣plus_payment` |
| Settlements | `/console/settlements` | 璐﹀崟銆佽处鏈熴€佹ā鍨嬪垎椤广€佸锟?| `/app/v3/api` | `commerce_usage_statement`銆乣commerce_usage_statement_item`銆乣commerce_billing_export` |
| Account | `/console/account` | 璐︽埛璧勬枡銆佷綑棰濄€佸彂绁ㄨ缃€佸畨鍏ㄣ€佺櫥褰曟棩锟?| `/app/v3/api` | `plus_user`銆乣plus_account`銆乣plus_invoice*`銆乣iam_user_security_setting`銆乣iam_user_login_event`銆乣ops_audit_log` |
| Recharge | `/console/recharge` | 鍏呭€煎寘 | `/app/v3/api` | `plus_vip_recharge_pack`銆乣plus_vip_recharge_method` |
| Settings | `/console/settings` | 璇█銆佹椂鍖恒€乄ebhook銆侀€氱煡寮€鍏炽€佸锟?| `/app/v3/api` | `iam_user_preference`銆乣integration_webhook_endpoint`銆乣ops_notification_delivery` |
| Notifications | `/console/notifications` | 绯荤粺閫氱煡銆佽处鍗曟彁閱掋€侀璀︺€佸凡锟?| `/app/v3/api` | `ops_notification_message`銆乣ops_notification_delivery` |
| Providers | `/console/providers` | Claude/Codex/Gemini/OpenCode 鏈湴宸ュ叿閰嶇疆銆佽祫婧愯兘鍔涘拰浠ｇ悊閰嶇疆 | `/app/v3/api` | `integration_provider`銆乣ai_channel`銆乣ai_channel_credential`銆乣ai_channel_resource`銆乣integration_proxy`銆乣ai_model_mapping_rule*` |
| User | `/console/user` | 涓汉璧勬枡銆侀偖绠便€佹墜鏈哄彿銆佽瑷€銆佸ご鍍忋€丮FA銆佺涓夋柟缁戝畾 | `/app/v3/api` | `plus_user`銆乣plus_oauth_account`銆乣iam_user_preference`銆乣iam_user_security_setting`銆乣iam_user_login_event` |

## 6. Admin 妯″潡鏄犲皠

| 鍓嶇妯″潡 | 璺敱 | 鍔熻兘 | API 锟?| 鏁版嵁锟?|
| --- | --- | --- | --- | --- |
| Dashboard | `/admin/dashboard` | 鍏ㄥ眬娴侀噺銆佹垚鏈€佷娇锟?trace銆佸浘锟?| `/backend/v3/api` | `ai_usage`銆乣ai_request_trace`銆乣ops_metric_snapshot` |
| User | `/admin/user` | 鐢ㄦ埛绠＄悊銆佷綑棰濆厖锟?閫€娆俱€佺敤锟?Key | `/backend/v3/api` | `plus_user`銆乣plus_account`銆乣plus_account_history`銆乣plus_api_key`銆乣iam_gateway_api_key` |
| Group | `/admin/group` | 鍒嗙粍銆佸钩鍙般€佽璐圭被鍨嬨€佸€嶇巼銆侀粯璁ゅ畾浠锋柟妗堛€佸閲忋€佷娇鐢ㄩ噺 | `/backend/v3/api` | `ai_channel_group`銆乣ai_channel_group_metric_snapshot`銆乣iam_gateway_access_policy`銆乣ai_pricing_plan`銆乣ai_pricing_plan_binding` |
| Model | `/admin/model` | 妯″瀷鍘傚銆佹ā鍨嬫棌銆佹帴鍏ヤ緵搴斿晢銆佹ā鍨嬨€佽閲忚〃銆佸畼鏂逛环銆佷緵搴斿晢浠枫€侀攢鍞环銆佷笂涓嬫枃銆佺姸鎬併€佽皟鐢ㄩ噺 | `/backend/v3/api` | `ai_model_vendor`銆乣ai_model_family`銆乣ai_model`銆乣ai_billing_meter`銆乣ai_model_pricing`銆乣ai_pricing_plan`銆乣ai_pricing_rule`銆乣ai_pricing_tier`銆乣integration_provider`銆乣ai_model_rank_snapshot` |
| Channel | `/admin/channel` | 涓婃父鏈嶅姟鍟嗚处鍙枫€佸崗璁€佽璇併€佽祫婧愯兘鍔涖€佹ā鍨嬫槧灏勩€佹潈锟?| `/backend/v3/api` | `ai_model_vendor`銆乣integration_provider`銆乣ai_channel`銆乣ai_channel_credential`銆乣ai_channel_resource`銆乣ai_model_mapping_rule*`銆乣integration_proxy` |
| Announcement | `/admin/announcement` | 鍏憡鍙戝竷銆佽崏绋裤€佺洰鏍囦汉锟?| `/backend/v3/api` | `content_announcement` |
| Marketing | `/admin/marketing` | 浼樻儬鍒搞€佹壒娆°€佸厬鎹㈢爜銆佸厖鍊艰褰曘€侀個璇风粺锟?| `/backend/v3/api/promotions` + `/backend/v3/api` | `promotion_offer`銆乣promotion_offer_version`銆乣promotion_coupon_stock`銆乣promotion_code`銆乣promotion_user_coupon`銆乣promotion_discount_application`銆乣promotion_coupon_ledger_entry`銆乣promotion_external_binding`銆乣plus_vip_recharge*`銆乣plus_invitation*`銆乣plus_partner` |
| Finance | `/admin/finance` | 浜ゆ槗娴佹按銆佽处鍗曘€佸厖鍊笺€侀€€娆俱€佹秷锟?| `/backend/v3/api` | `plus_account_history`銆乣plus_order`銆乣plus_payment`銆乣plus_refund`銆乣plus_invoice*`銆乣plus_ledger_bridge`銆乣commerce_usage_statement` |
| Record | `/admin/record` | 璇锋眰鏃ュ織銆佽璐规槑缁嗐€佷环鏍煎揩鐓с€両P | `/backend/v3/api` | `ai_request_trace`銆乣ai_usage`銆乣ai_routing_decision_log` |
| RateLimit | `/admin/ratelimit` | IP 闄愭祦銆乀oken 闄愭祦銆佹ā鍨嬮檺娴併€侀槻鐏 | `/backend/v3/api` | `ai_quota_policy`銆乣iam_gateway_risk_rule`銆乣iam_gateway_access_policy`銆乣ai_usage`銆乣ops_metric_snapshot` |
| Monitor | `/admin/monitor` | 鑺傜偣銆佸尯鍩熴€丆PU銆佸唴瀛樸€佸憡璀︺€佹€ц兘鏇茬嚎 | `/backend/v3/api` | `ops_gateway_instance`銆乣ops_gateway_heartbeat`銆乣ops_alert_event`銆乣ops_metric_snapshot` |

## 7. 瀛橀噺 `plus_*` 琛ㄦ竻锟?
杩欎簺琛ㄦ槸浜嬪疄鏉ユ簮锛宑law-router 鍙紩鐢ㄦ垨閫氳繃 Java service/API 璋冪敤锛屼笉鍒涘缓鍚屼箟鏇夸唬琛拷?
| 锟?| 鍓嶇妯″潡 | 璇存槑 |
| --- | --- | --- |
| `plus_user` | Console User/Account銆丄dmin User | 鐢ㄦ埛涓昏〃 |
| `plus_user_address` | Account銆佸彂绁ㄦ墿锟?| 鐢ㄦ埛鍦板潃 |
| `plus_oauth_account` | Console User | 绗笁鏂圭粦瀹氾紝鐗╃悊琛ㄥ悕锟?`legacy-java-plus-entity` 锟?`PlusUserOAuthAccount` 涓哄噯 |
| `plus_tenant`銆乣plus_organization*` | 鍏ㄩ儴澶氱鎴锋ā锟?| 绉熸埛銆佺粍锟?|
| `plus_role`銆乣plus_permission`銆乣plus_role_permission`銆乣plus_user_role` | Admin銆佹潈闄愭帶锟?| RBAC |
| `plus_api_key` | API Keys銆丄dmin User | 瀛橀噺 API Key锛孭0 鍙锟?|
| `plus_vip_user`銆乣plus_vip_level`銆乣plus_vip_benefit*` | Billing銆丷echarge銆丮arketing | VIP 鍜屾潈锟?|
| `plus_vip_recharge`銆乣plus_vip_recharge_pack`銆乣plus_vip_recharge_method` | Billing銆丷echarge銆丮arketing | 鍏呭€艰褰曘€佸厖鍊煎寘銆佸厖鍊兼柟锟?|
| `plus_vip_point_change` | Billing銆丗inance | 绉垎娴佹按 |
| `plus_account` | Account銆丅illing銆丗inance | 璐︽埛浣欓銆佺Н鍒嗐€乼oken |
| `plus_account_history` | Usage settlement銆丗inance | 鏈€缁堣处鎴锋祦姘翠簨锟?|
| `plus_product`銆乣plus_sku` | Recharge銆丳ricing plan | 鍟嗗搧锟?SKU |
| `plus_order`銆乣plus_order_item` | Checkout銆丅illing銆丗inance | 璁㈠崟 |
| `plus_order_dispatch_rule`銆乣plus_order_worker_dispatch_profile` | Admin Finance銆乄orker | 鏈嶅姟璁㈠崟娲惧彂瑙勫垯鍜屾帴鍗曚汉鍛樺閲忛厤锟?|
| `plus_payment`銆乣plus_payment_webhook_event` | Checkout銆丗inance | 鏀粯鍜屾敮浠樺洖锟?|
| `plus_refund` | Finance銆丄dmin User | 閫€锟?|
| `plus_invoice`銆乣plus_invoice_item`銆乣plus_invoice_record` | Account銆丼ettlements | 鍙戠エ |
| `promotion_offer`銆乣promotion_offer_version`銆乣promotion_coupon_stock`銆乣promotion_code`銆乣promotion_user_coupon`銆乣promotion_discount_application`銆乣promotion_coupon_ledger_entry` | Billing銆丮arketing | 鏍囧噯鍗″埜钀ラ攢 |
| `plus_invitation_code`銆乣plus_invitation_relation`銆乣plus_partner` | Marketing | 閭€璇枫€佷紮锟?|
| `plus_channel`銆乣ai_channel`銆乣plus_channel_proxy` | Routing/Channel 鍏煎瀵煎叆 | 瀛橀噺娓犻亾閰嶇疆锛岄€愭鏄犲皠锟?`integration_*` |
| `legacy_model_info`銆乣legacy_model_price` | Models/Admin Model 鍏煎瀵煎叆 | 瀛橀噺妯″瀷鍜屼环鏍硷紝鏍囧噯浠锋牸杩涘叆 `ai_model_pricing` |
| `plus_usage_record` | Usage 鍏煎瀵煎叆 | 瀛橀噺鐢ㄩ噺璁板綍锛岀綉鍏虫柊浜嬪疄杩涘叆 `ai_usage` |

## 8. 鏂板鏍囧噯琛ㄦ€绘竻锟?
### 8.1 IAM

| 锟?| 鐢拷?|
| --- | --- |
| `iam_gateway_api_key` | 缃戝叧 Key L3 绱㈠紩/鎵╁睍锛屾垨 `plus_api_key` 鐨勫吋瀹规墿锟?|
| `ai_channel_group` | Key 鍒嗙粍銆侀」鐩拰榛樿绛栫暐 |
| `ai_channel_group_metric_snapshot` | Key 鍒嗙粍璐﹀彿瀹归噺銆佸彲鐢ㄨ处鍙锋暟銆佷粖锟?绱鐢ㄩ噺鍜屽仴搴风姸鎬佹姇锟?|
| `iam_gateway_access_policy` | Key/鍒嗙粍/绉熸埛璁块棶绛栫暐銆佹ā鍨嬭寖鍥淬€佽兘鍔涜寖鍥淬€両P/鍖哄煙 |
| `iam_gateway_risk_rule` | 椋庢帶銆侀槻鐏銆侀粦鐧藉悕锟?|
| `iam_user_preference` | 鐢ㄦ埛璇█銆佹椂鍖恒€佷富棰樸€侀€氱煡鍋忓ソ |
| `iam_user_security_setting` | MFA銆佸畨鍏ㄨ缃€佸瘑鐮佹洿鏂版椂闂存墿锟?|
| `iam_user_login_event` | 鐧诲綍缁撴灉銆佽澶囥€両P 鍖哄煙銆丮FA 楠岃瘉鍜岄闄╀簨锟?|

### 8.2 Integration

| 锟?| 鐢拷?|
| --- | --- |
| `integration_provider` | Provider 娉ㄥ唽 |
| `ai_channel` | 娓犻亾瀹炰緥 |
| `integration_provider_account` | 涓婃父璐﹀彿锟?secret reference |
| `ai_channel_credential` | 娓犻亾璁よ瘉鍏ュ彛銆乥ase URL 锟?secret 寮曠敤 |
| `ai_channel_resource` | 娓犻亾璧勬簮銆佽祫婧愬垎缁勫拰鑳藉姏鎺堟潈 |
| `ai_model_mapping_rule*` | 鍏ㄥ眬銆乂endor銆佽处锟?娓犻亾绾фā鍨嬫槧灏勮锟?|
| `integration_proxy` | 浠ｇ悊閰嶇疆 |
| `integration_webhook_endpoint` | Webhook 鍥炶皟閰嶇疆 |
| `integration_provider_health_snapshot` | Provider 鍋ュ悍蹇収 |

### 8.3 AI

| 锟?| 鐢拷?|
| --- | --- |
| `ai_model_vendor` | 妯″瀷鍘傚瀛楀吀锛宍ModelVendor` 棰嗗煙浜嬪疄鏉ユ簮 |
| `ai_model_family` | 妯″瀷鏃忓瓧鍏革紝鏀拺鍘傚涓嬬郴鍒椼€侀粯璁ゆā鍨嬪拰鎺掑簭 |
| `ai_model` | 缃戝叧妯″瀷鐩綍 |
| `ai_model_capability` | 妯″瀷鑳藉姏銆佹ā鎬併€佸弬鏁拌兘锟?|
| `ai_billing_meter` | 缁熶竴璁￠噺琛紝瀹氫箟 token銆佽姹傘€佺粨鏋溿€佷釜鏁般€佺鏁般€佸瓧绗︺€佸瓨鍌ㄣ€佹祦閲忕瓑鍙璐圭淮锟?|
| `ai_model_pricing` | 妯″瀷浠锋牸绨匡紝鍖哄垎瀹樻柟鍙傝€冧环銆佷笂娓告垚鏈环銆佸鎴烽攢鍞环 |
| `ai_pricing_plan` | 瀹氫环鏂规锛屾寕杞藉埌 API Key 鍒嗙粍銆乂IP銆丼KU銆佺鎴枫€佺敤鎴锋垨鍗曚釜 API Key |
| `ai_pricing_plan_binding` | 瀹氫环鏂规缁戝畾锛屽鐞嗙敤锟?VIP/SKU/Key 涓撳睘瀹氫环锛屼笉鏇夸唬涓氬姟鍒嗙粍 |
| `ai_pricing_rule` | 瀹氫环瑙勫垯锛屾寜妯″瀷銆佸巶瀹躲€佷緵搴斿晢銆佹笭閬撱€佽兘鍔涘拰浠锋牸椤硅鐩栭粯璁ゅ€嶇巼 |
| `ai_pricing_tier` | 闃舵/鍖洪棿瀹氫环锛屾敮鎸佷笂涓嬫枃鍖洪棿銆佹寜娆°€佸浘鐗囥€侀煶棰戙€佽棰戝垎锟?|
| `ai_pricing_import_snapshot` | 瀹樻柟/渚涘簲鍟嗕环鏍煎鍏ュ揩鐓у拰 hash 璇佹嵁 |
| `ai_model_rank_snapshot` | 鎺掕姒滃拰瓒嬪娍蹇収 |
| `ai_routing_policy` | 璺敱绛栫暐 |
| `ai_routing_profile` | 绛栫暐鐗堟湰鍜岀伆锟?|
| `ai_routing_rule` | 璺敱瑙勫垯 |
| `ai_routing_decision_log` | 璺敱鍐崇瓥鏃ュ織 |
| `ai_request_trace` | 璇锋眰锟?Provider attempt trace |
| `ai_usage` | 鐢ㄩ噺浜嬪疄 |
| `ai_quota_policy` | 閰嶉銆侀檺娴佺瓥锟?|
| `ai_generation_session` | Playground 浼氳瘽 |
| `ai_generation_job` | Playground 鐢熸垚浠诲姟 |
| `ai_generation_asset` | 鐢熸垚璧勪骇 |
| `ai_generation_asset_action` | 璧勪骇鎿嶄綔璁板綍 |

### 8.4 Commerce Projection

| 锟?| 鐢拷?|
| --- | --- |
| `commerce_usage_settlement` | 鐢ㄩ噺缁撶畻妗ユ帴 |
| `commerce_usage_pricing_plan` | 鐢ㄩ噺濂楅/浠锋牸璁″垝鏄犲皠 |
| `commerce_usage_statement` | 璐︽湡璐﹀崟鎶曞奖 |
| `commerce_usage_statement_item` | 璐﹀崟鍒嗛」 |
| `commerce_billing_export` | 璐﹀崟瀵煎嚭 |

### 8.5 Studio

| 锟?| 鐢拷?|
| --- | --- |
| `appstore_app` | AppCenter 涓绘暟鎹紱娌跨敤 Java `platform_app` 鐗╃悊缁撴瀯 |
| `appstore_app.release_notes` + `appstore_app.install_config` | App 鍙戝竷璇存槑銆佺増鏈€佸畨瑁呭寘涓庡钩鍙颁笅杞借兘锟?|
| `appstore_app.resource_list` | App 鎴浘銆佸皝闈€佸浘鏍囩瓑濯掍綋璧勬簮 |
| `plus_agent_skill` | SkillsHub 涓绘暟鎹紱娌跨敤 Java `PlusAgentSkill` 鐗╃悊缁撴瀯 |
| `plus_agent_skill_package` | 鎶€鑳藉寘/闆嗗悎锛涙部锟?Java `PlusAgentSkillPackage` 鐗╃悊缁撴瀯 |
| `plus_user_agent_skill` | 鐢ㄦ埛鎶€鑳藉畨瑁呫€佸惎鐢ㄣ€侀厤缃紱娌跨敤 Java `PlusUserAgentSkill` 鐗╃悊缁撴瀯 |
| `plus_category` | 鎶€鑳藉垎绫伙紱娌跨敤 Java `PlusCategory`锛岀被鍨嬩娇锟?`CategoryType.SKILLS`/`SKILLS_COLLECTION` |
| `studio_catalog_action` | 搴旂敤/鎶€鑳戒笅杞姐€佸畨瑁呫€佽瘎鍒嗐€佽瘎璁恒€佹敹钘忕瓑琛屼负浜嬪疄 |

### 8.6 Content

| 锟?| 鐢拷?|
| --- | --- |
| `content_announcement` | 鍏憡 |
| `content_doc_page` | 鏂囨。椤电储锟?|
| `content_openapi_snapshot` | API Reference 锟?OpenAPI 鐗堟湰銆乭ash銆佸垎绫绘爲鍜岀ず锟?manifest |
| `content_sdk_release` | SDK Reference 鐨勮瑷€銆佸寘鍚嶃€佺増鏈€佸畨瑁呭懡浠ゅ拰绀轰緥 manifest |
| `content_forum_post` | 璁哄潧甯栧瓙 |
| `content_forum_comment` | 璇勮 |
| `content_reaction` | 璁哄潧绛夊唴瀹圭偣璧炪€佸彇娑堢偣璧炪€佹敹钘忕被琛屼负浜嬪疄 |

### 8.7 Ops

| 锟?| 鐢拷?|
| --- | --- |
| `ops_gateway_instance` | 缃戝叧瀹炰緥 |
| `ops_gateway_heartbeat` | 缃戝叧蹇冭烦 |
| `ops_config_snapshot` | 閰嶇疆蹇収 |
| `ops_audit_log` | 瀹¤鏃ュ織 |
| `ops_outbox_event` | 鍙潬浜嬩欢鍙戝竷 |
| `ops_inbox_event` | 鍙潬浜嬩欢娑堣垂 |
| `ops_job_execution` | Worker 浠诲姟 |
| `ops_alert_event` | 鍛婅浜嬩欢 |
| `ops_notification_message` | 鐢ㄦ埛娑堟伅 |
| `ops_notification_delivery` | 娑堟伅鎶曢€掑拰宸茶鐘讹拷?|
| `ops_metric_snapshot` | 鎸囨爣蹇収 |

## 9. 鍏叡瀛楁缁撴瀯

锟?`plus_*` 瀛橀噺琛ㄥ锛屾柊 L2/L3 琛ㄩ粯璁ゅ寘鍚互涓嬪叕鍏卞瓧娈点€傚悗锟?DDL 鍙互閫氳繃妯℃澘灞曞紑锟?
| 瀛楁 | 閫昏緫绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `id` | int64 | 锟?| 鍐呴儴涓婚敭锛孉PI 搴忓垪鍖栦负 string |
| `uuid` | string(64) | 锟?| 澶栭儴绋冲畾 ID |
| `tenant_id` | int64 | 锟?| 绉熸埛 ID |
| `organization_id` | int64 | 锟?| 缁勭粐 ID锛屾棤缁勭粐锟?0 |
| `user_id` | int64 | 鏉′欢 | 鐢ㄦ埛褰掑睘 |
| `owner_type` | enum_int32 | 鏉′欢 | user銆乷rganization銆乼enant銆乻ystem銆乸roject 锟?|
| `owner_id` | int64 | 鏉′欢 | owner ID |
| `data_scope` | enum_int32 | 锟?| private銆乷rganization銆乼enant銆乸ublic |
| `status` | enum_int32 | 锟?| 鐘讹拷?|
| `created_at` | instant | 锟?| UTC 鍒涘缓鏃堕棿 |
| `updated_at` | instant | 锟?| UTC 鏇存柊鏃堕棿 |
| `version` | int64 | 锟?| 涔愯锟?|
| `created_by` | int64 | 寤鸿 | 鍒涘缓锟?|
| `updated_by` | int64 | 寤鸿 | 鏇存柊锟?|
| `deleted_at` | instant | 鍙拷?| 杞垹锟?|
| `deleted_by` | int64 | 鍙拷?| 鍒犻櫎锟?|
| `metadata` | json | 鍙拷?| 鎵╁睍鍏冩暟鎹紝涓嶆壙杞芥牳蹇冩煡璇㈠瓧锟?|

鏃ュ織銆佷簨瀹炪€佸璁″拰 L3 琛ㄩ澶栧寘鍚細

| 瀛楁 | 閫昏緫绫诲瀷 | 璇存槑 |
| --- | --- | --- |
| `request_id` | string(128) | 璇锋眰 ID |
| `trace_id` | string(128) | Trace ID |
| `idempotency_key` | string(128) | 骞傜瓑锟?|
| `payload_hash` | string(128) | payload 鎽樿 |
| `retention_until` | instant | 鐣欏瓨鎴 |
| `legal_hold` | bool | 娉曞姟鍐荤粨 |

## 10. 鏍稿績琛ㄧ粨锟?
浠ヤ笅缁撴瀯鍙垪涓撳睘瀛楁锛屽叕鍏卞瓧娈垫寜锟?9 鑺傚睍寮€锟?
### 10.1 `iam_gateway_api_key`

| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `legacy_api_key_id` | int64 | 鏉′欢 | 鍏宠仈 `plus_api_key.id` |
| `group_id` | int64 | 锟?| Key 鍒嗙粍 |
| `name` | string(128) | 锟?| Key 鍚嶇О |
| `key_prefix` | string(32) | 锟?| 灞曠ず鍓嶇紑 |
| `key_display_masked` | string(64) | 锟?| Console `keyVal` 鑴辨晱灞曠ず鍊硷紝涓嶈兘鍙嶆帹鏄庢枃 |
| `key_hash` | string(128) | 锟?| HMAC 鎽樿 |
| `hash_alg` | string(32) | 锟?| 绠楁硶鐗堟湰 |
| `secret_version` | int64 | 锟?| Key 杞崲鐗堟湰 |
| `policy_id` | int64 | 锟?| 璁块棶绛栫暐 |
| `quota_policy_id` | int64 | 锟?| 閰嶉绛栫暐 |
| `rate_limit_policy_id` | int64 | 锟?| 闄愭祦绛栫暐 |
| `environment` | enum_int32 | 锟?| prod銆乻taging銆乨ev銆乻andbox |
| `expire_at` | instant | 锟?| 杩囨湡鏃堕棿 |
| `last_used_at` | instant | 锟?| 鏈€杩戜娇锟?|
| `last_used_ip_hash` | string(128) | 锟?| 鏈€锟?IP 鎽樿 |
| `last_used_ip_masked` | string(64) | 锟?| 鏈€锟?IP 鑴辨晱灞曠ず |
| `last_used_ip_region` | string(128) | 锟?| 鏈€锟?IP 鍖哄煙 |
| `last_revealed_at` | instant | 锟?| 鍒涘缓鍚庝竴娆℃€ф槑鏂囪繑鍥炴椂锟?|
| `rotated_from_key_id` | int64 | 锟?| 杞崲鏉ユ簮 Key |
| `revoked_at` | instant | 锟?| 鍚婇攢鏃堕棿 |
| `revoked_by` | int64 | 锟?| 鍚婇攢锟?|

绱㈠紩锟?
- `uk_iam_gateway_api_key_hash(key_hash)`
- `uk_iam_gateway_api_key_legacy(legacy_api_key_id)`
- `idx_iam_gateway_api_key_tenant_user_status(tenant_id, organization_id, user_id, status, updated_at, id)`
- `idx_ai_channel_group_status(tenant_id, organization_id, group_id, status, updated_at, id)`

### 10.2 `ai_channel_group`

瀛楁锛歚name`銆乣code`銆乣description`銆乣provider_code`銆乣group_type`銆乣default_policy_id`銆乣default_quota_policy_id`銆乣environment`銆乣pricing_plan_id`銆乣pricing_plan_code`銆乣rate_multiplier`銆乣price_reference_mode`銆乣official_price_multiplier`銆乣billing_type`銆乣capacity_limit`銆乣allowed_origin`锟?
绱㈠紩锟?
- `uk_ai_channel_group_tenant_code(tenant_id, organization_id, code)`
- `idx_ai_channel_group_provider_status(tenant_id, organization_id, provider_code, status, updated_at, id)`
- `idx_ai_channel_group_tenant_status_updated(tenant_id, organization_id, status, updated_at, id)`
- `idx_ai_channel_group_pricing(tenant_id, organization_id, pricing_plan_id, status, updated_at, id)`

### 10.3 `iam_gateway_access_policy`

瀛楁锛歚name`銆乣policy_type`銆乣subject_type`銆乣subject_id`銆乣subject_ref_hash`銆乣subject_ref_masked`銆乣allowed_capabilities`銆乣denied_capabilities`銆乣allowed_models`銆乣denied_models`銆乣network_policy_mode`銆乣ip_rule_count`銆乣ip_allowlist`銆乣ip_denylist`銆乣region_allowlist`銆乣max_context_tokens`銆乣data_retention_mode`銆乣effective_from`銆乣effective_to`锟?
绱㈠紩锟?
- `idx_iam_gateway_access_policy_tenant_subject_status(tenant_id, organization_id, subject_type, subject_id, status)`
- `idx_iam_gateway_access_policy_subject_ref(tenant_id, organization_id, subject_type, subject_ref_hash, status)`

### 10.4 `iam_gateway_risk_rule`

瀛楁锛歚rule_name`銆乣rule_category`銆乣rule_type`銆乣scope_type`銆乣scope_id`銆乣target_type`銆乣target_value`銆乣target_value_hash`銆乣target_value_masked`銆乣target_value_cipher_ref`銆乣match_mode`銆乣reason`銆乣action`銆乣priority`銆乣requests_per_second`銆乣requests_per_minute`銆乣requests_per_day`銆乣tokens_per_minute`銆乣burst_limit`銆乣block_duration_seconds`銆乣effective_from`銆乣effective_to`銆乣hit_count`銆乣last_hit_at`锟?
绱㈠紩锟?
- `uk_iam_gateway_risk_rule_tenant_target(tenant_id, organization_id, rule_type, target_type, target_value)`
- `idx_iam_gateway_risk_rule_scope_priority(tenant_id, organization_id, rule_category, scope_type, scope_id, priority, status)`
- `idx_iam_gateway_risk_rule_target_hash(tenant_id, organization_id, target_type, target_value_hash, status)`

### 10.5 `iam_user_preference`

鐢ㄩ€旓細鎵胯浇 Settings/User 涓殑璇█銆佹椂鍖恒€佷富棰樺拰閫氱煡鍋忓ソ锛屼笉澶嶅埗 `plus_user` 鏍稿績璧勬枡锟?
瀛楁锛歚language`銆乣timezone`銆乣theme_mode`銆乣appearance_config`銆乣notification_preferences`銆乣default_console_path`锟?
绱㈠紩锟?
- `uk_iam_user_preference_user(tenant_id, organization_id, user_id)`

### 10.6 `iam_user_security_setting`

鐢ㄩ€旓細鎵胯浇 MFA銆佸畨鍏ㄧ姸鎬併€佸瘑鐮佹洿鏂版椂闂存墿灞曪紝涓嶄繚瀛樺瘑鐮佹槑鏂囷拷?
瀛楁锛歚mfa_enabled`銆乣mfa_method`銆乣password_last_changed_at`銆乣security_level`銆乣trusted_device_count`銆乣last_login_at`銆乣last_login_ip_hash`銆乣third_party_bound_snapshot`锟?
绱㈠紩锟?
- `uk_iam_user_security_setting_user(tenant_id, organization_id, user_id)`

### 10.7 `integration_provider`

鐢ㄩ€旓細API 鎺ュ叆渚涘簲锟?鍗忚閫傞厤鏂癸紝涓嶄綔涓烘ā鍨嬪巶瀹朵簨瀹炴潵婧愶紱妯″瀷鍘傚浣跨敤 `ai_model_vendor`锟?
瀛楁锛歚provider_code`銆乣display_name`銆乣description`銆乣icon_media_resource_id`銆乣icon_object_blob_id`銆乣icon_resource_snapshot`銆乣color_token`銆乣docs_url`銆乣website_url`銆乣default_vendor_code`銆乣integration_type`銆乣protocol`銆乣base_url`銆乣auth_type`銆乣capabilities`銆乣metadata_schema_version`銆乣sort_order`銆乣metadata`銆傚墠锟?鎺ュ彛灞傝緭锟?`icon: MediaResource`锛屽彧鍦ㄥ浘鐗囨覆鏌撹竟鐣岃鍙栧彲璁块棶鍦板潃锟?
绱㈠紩锟?
- `uk_integration_provider_code(provider_code)`
- `idx_integration_provider_status_updated(status, updated_at, id)`

### 10.8 `ai_channel`

瀛楁锛歚provider_id`銆乣provider_code`銆乣channel_code`銆乣name`銆乣protocol`銆乣access_type`銆乣base_url`銆乣model_mode`銆乣environment`銆乣region`銆乣capabilities`銆乣priority`銆乣weight`銆乣account_id`銆乣proxy_id`銆乣rpm_limit`銆乣timeout_ms`銆乣retry_policy`銆乣circuit_breaker_policy`銆乣health_status`銆乣last_latency_ms`銆乣consecutive_error_count`锟?
绱㈠紩锟?
- `uk_ai_channel_tenant_code(tenant_id, organization_id, channel_code)`
- `idx_ai_channel_tenant_provider_status(tenant_id, organization_id, provider_code, status)`

### 10.9 `integration_provider_account`

瀛楁锛歚provider_id`銆乣provider_code`銆乣account_code`銆乣account_name`銆乣auth_type`銆乣credential_profile`銆乣external_account_id`銆乣auth_config`銆乣secret_ref`銆乣secret_hash`銆乣secret_version`銆乣secret_rotation_policy`銆乣masked_label`銆乣quota_unit`銆乣quota_limit`銆乣quota_used`銆乣upstream_balance_amount`銆乣upstream_balance_currency`銆乣last_balance_checked_at`銆乣last_rotated_at`銆乣next_rotate_at`銆乣last_verified_at`銆乣last_used_at`銆乣consecutive_error_count`銆乣risk_level`锟?
绱㈠紩锟?
- `uk_integration_provider_account_tenant_code(tenant_id, organization_id, provider_code, account_code)`
- `uk_integration_provider_account_secret_hash(tenant_id, organization_id, provider_code, secret_hash)`

### 10.10 `ai_channel_credential` / `ai_channel_resource` / `ai_model_mapping_rule*`

娓犻亾璐﹀彿涓嶇洿鎺ョ粦瀹氭ā鍨嬨€傝璇佷俊鎭繘锟?`ai_channel_credential`锛屽寘锟?`channel_id`銆乣credential_name`銆乣base_url`銆乣auth_config`銆乣credential_ref`銆乣credential_hash`銆乣priority`銆乣weight`銆乣health_status`銆乣last_latency_ms`銆乣last_verified_at`銆乣last_used_at`銆傝祫婧愯兘鍔涜繘锟?`ai_channel_resource`锛屽寘锟?`channel_id`銆乣resource_code`銆乣resource_group_code`銆乣grant_type`銆乣priority`銆乣weight`銆乣effective_from`銆乣effective_to`銆傛ā鍨嬫槧灏勮繘锟?`ai_model_mapping_rule`銆乣ai_model_mapping_rule_binding` 锟?`ai_model_mapping_rule_item`锛屾敮鎸佸叏灞€銆乂endor銆佽处锟?娓犻亾鑷畾涔夋槧灏勮鐩栵拷?
绱㈠紩锟?
- `idx_ai_channel_credential_channel(tenant_id, organization_id, channel_id, status, priority, weight, id)`
- `uk_ai_channel_resource(tenant_id, organization_id, channel_id, resource_code, resource_group_code)`
- `idx_ai_channel_resource_lookup(tenant_id, organization_id, status, channel_id, grant_type, priority, id)`
- `idx_ai_model_mapping_rule_enabled(tenant_id, organization_id, status, enabled, id)`

### 10.11 `integration_proxy`

瀛楁锛歚proxy_code`銆乣proxy_type`銆乣endpoint`銆乣secret_ref`銆乣secret_hash`銆乣region`銆乣health_status`銆乣last_checked_at`銆乣description`锟?
绱㈠紩锟?
- `uk_integration_proxy_tenant_code(tenant_id, organization_id, proxy_code)`

### 10.12 `integration_webhook_endpoint`

瀛楁锛歚endpoint_code`銆乣name`銆乣target_url`銆乣secret_ref`銆乣secret_hash`銆乣event_types`銆乣signing_alg`銆乣retry_policy`銆乣last_success_at`銆乣last_failure_at`銆乣failure_count`锟?
绱㈠紩锟?
- `uk_integration_webhook_endpoint_tenant_code(tenant_id, organization_id, endpoint_code)`
- `idx_integration_webhook_endpoint_tenant_status(tenant_id, organization_id, status, updated_at, id)`

### 10.13 `ai_model_vendor`

鐢ㄩ€旓細妯″瀷鍘傚瀛楀吀锛屾敮锟?`/models`銆乣/rankings`銆乣/admin/model`銆乣/admin/channel` 鐨勫巶瀹跺睍绀恒€佺瓫閫夈€佹帓搴忓拰璺ㄨ瑷€鏋氫妇鐢熸垚锟?
瀛楁锛歚vendor_code`銆乣display_name`銆乣legal_name`銆乣description`銆乣website_url`銆乣docs_url`銆乣logo_media_resource_id`銆乣logo_object_blob_id`銆乣logo_resource_snapshot`銆乣icon_media_resource_id`銆乣icon_object_blob_id`銆乣icon_resource_snapshot`銆乣color_token`銆乣country_region`銆乣vendor_type`銆乣model_families`銆乣capabilities`銆乣open_source`銆乣sort_order`銆傚墠锟?鎺ュ彛灞傝緭锟?`logo`銆乣icon` 锟?`MediaResource` 瀵硅薄锟?
绱㈠紩锟?
- `uk_ai_model_vendor_code(vendor_code)`
- `idx_ai_model_vendor_status_sort(status, sort_order, id)`

### 10.14 `ai_model_family`

瀛楁锛歚vendor_id`銆乣vendor_code`銆乣family_code`銆乣display_name`銆乣description`銆乣docs_url`銆乣icon_media_resource_id`銆乣icon_object_blob_id`銆乣icon_resource_snapshot`銆乣color_token`銆乣family_type`銆乣primary_modality`銆乣model_count`銆乣default_model_id`銆乣default_model`銆乣sort_order`銆傚墠锟?鎺ュ彛灞傝緭锟?`icon: MediaResource`锟?
绱㈠紩锟?
- `uk_ai_model_family_vendor_code(vendor_code, family_code)`
- `idx_ai_model_family_vendor_status_sort(vendor_code, status, sort_order, id)`

### 10.15 `ai_model`

瀛楁锛歚model`銆乣display_name`銆乣vendor_id`銆乣vendor_code`銆乣vendor_name_snapshot`銆乣family_id`銆乣family_code`銆乣provider_hint`銆乣model_family`銆乣model_version`銆乣model_aliases`銆乣capability`銆乣modalities`銆乣icon_media_resource_id`銆乣icon_object_blob_id`銆乣icon_resource_snapshot`銆乣color_token`銆乣docs_url`銆乣license_type`銆乣api_format`銆乣capability_intro`銆乣limitations`銆乣supported_languages`銆乣use_cases`銆乣training_data_cutoff`銆乣context_tokens`銆乣max_input_tokens`銆乣max_output_tokens`銆乣max_duration_seconds`銆乣supports_streaming`銆乣supports_tools`銆乣supports_json_schema`銆乣performance_profile`銆乣default_pricing_id`銆乣rank_score`銆乣release_stage`銆乣deprecated_at`銆乣description`銆傚墠锟?鎺ュ彛灞傝緭锟?`icon: MediaResource`锟?
绱㈠紩锟?
- `uk_ai_model_model(model)`
- `idx_ai_model_vendor_status(vendor_code, status, updated_at, id)`
- `idx_ai_model_family_status(vendor_code, family_code, status, updated_at, id)`
- `idx_ai_model_capability_status(capability, status, updated_at, id)`

### 10.16 `ai_model_capability`

瀛楁锛歚model_id`銆乣model`銆乣vendor_code`銆乣capability`銆乣capability_code`銆乣modality`銆乣input_modalities`銆乣output_modalities`銆乣endpoint_formats`銆乣parameter_name`銆乣parameter_schema`銆乣supported`銆乣limit_unit`銆乣limit_value`銆乣schema_version`銆乣sort_order`銆乣description`锟?
绱㈠紩锟?
- `uk_ai_model_capability_model_code(model_id, capability_code, modality, parameter_name)`
- `idx_ai_model_capability_vendor_capability(tenant_id, organization_id, vendor_code, capability, supported, id)`

### 10.16.1 `ai_billing_meter`

瀛楁锛歚meter_code`銆乣display_name`銆乣description`銆乣modality`銆乣usage_type`銆乣billing_mode`銆乣default_unit`銆乣default_unit_size`銆乣quantity_precision`銆乣quantity_source`銆乣aggregation_mode`銆乣result_selector`銆乣supports_tier`銆乣supports_expression`銆乣allow_negative_quantity`銆乣canonical_price_item_type`銆乣sort_order`锟?
鐢ㄩ€旓細缁熶竴璁￠噺琛ㄣ€傚畠锟?Admin Model 鍙互鍚屾椂绠＄悊 LLM token銆佸浘鐗囧紶鏁般€佽闊崇鏁般€佽棰戠鏁般€侀煶鏁堢粨鏋溿€丄PI 璇锋眰銆丄PI 缁撴灉銆丄PI 鏉＄洰銆佸瓧绗︽暟銆佸瓨鍌ㄥ拰娴侀噺浠锋牸锟?
### 10.17 `ai_model_pricing`

瀛楁锛歚model_id`銆乣model`銆乣vendor_code`銆乣provider_code`銆乣channel_id`銆乣provider_model`銆乣platform_code`銆乣service_tier`銆乣price_side`銆乣pricing_scope`銆乣pricing_scope_id`銆乣pricing_plan_id`銆乣pricing_plan_code`銆乣billing_type`銆乣billing_mode`銆乣billing_meter_id`銆乣billing_meter_code`銆乣price_item_type`銆乣unit`銆乣unit_size`銆乣metering_mode`銆乣quantity_source`銆乣quantity_formula`銆乣result_selector`銆乣minimum_quantity`銆乣quantity_step`銆乣included_quantity`銆乣unit_price`銆乣currency`銆乣rounding_mode`銆乣min_charge_amount`銆乣reference_price_id`銆乣reference_price_side`銆乣reference_multiplier`銆乣markup_amount`銆乣pricing_formula_mode`銆乣price_origin`銆乣import_snapshot_id`銆乣priority`銆乣region`銆乣price_version`銆乣source_url`銆乣source_hash`銆乣published_at`銆乣observed_at`銆乣effective_from`銆乣effective_to`銆乣source_price_id`锟?
绱㈠紩锟?
- `idx_ai_model_pricing_lookup(tenant_id, organization_id, model, price_side, pricing_scope, pricing_scope_id, billing_mode, billing_meter_code, status, effective_from, effective_to)`
- `idx_ai_model_pricing_vendor_model(tenant_id, organization_id, vendor_code, model, price_side, status, effective_from, id)`
- `idx_ai_model_pricing_provider_channel(tenant_id, organization_id, provider_code, channel_id, model, price_side, status, effective_from, id)`
- `idx_ai_model_pricing_plan_effective(tenant_id, organization_id, pricing_plan_id, model, price_side, status, effective_from, id)`
- `idx_ai_model_pricing_meter_effective(tenant_id, organization_id, billing_meter_code, price_side, status, effective_from, id)`

#### 10.17.1 `ai_pricing_plan`

瀛楁锛歚plan_code`銆乣plan_name`銆乣description`銆乣plan_scope`銆乣base_price_side`銆乣base_pricing_scope`銆乣default_reference_price_id`銆乣default_multiplier`銆乣default_markup_amount`銆乣currency`銆乣billing_mode`銆乣rounding_mode`銆乣min_charge_amount`銆乣fallback_mode`銆乣priority`銆乣price_version`銆乣effective_from`銆乣effective_to`锟?
鐢ㄩ€旓細瀹氫环鏂规锛屼笉鏄笟鍔″垎缁勩€傚垱锟?API Key 閫夋嫨鐨勬槸 `ai_channel_group`锛涜鍒嗙粍閫氳繃 `pricing_plan_id` 鑾峰緱榛樿璁¤垂鏂规锟?
绱㈠紩锟?
- `uk_ai_pricing_plan_tenant_code(tenant_id, organization_id, plan_code)`
- `idx_ai_pricing_plan_scope_status(tenant_id, organization_id, plan_scope, status, priority, id)`
- `idx_ai_pricing_plan_effective(tenant_id, organization_id, status, effective_from, effective_to, id)`

#### 10.17.2 `ai_pricing_plan_binding`

瀛楁锛歚pricing_plan_id`銆乣pricing_plan_code`銆乣subject_type`銆乣subject_id`銆乣subject_code`銆乣binding_source`銆乣multiplier_override`銆乣rpm_override`銆乣tpm_override`銆乣quota_policy_id`銆乣priority`銆乣effective_from`銆乣effective_to`锟?
鐢ㄩ€旓細锟?VIP銆丼KU銆佺敤鎴枫€佺鎴锋垨鍗曚釜 API Key 璁剧疆涓撳睘瀹氫环鏂规銆侫PI Key 涓庝笟鍔″垎缁勭殑甯歌缁戝畾浠嶇劧浣跨敤 `iam_gateway_api_key.channel_group_id`锟?
#### 10.17.3 `ai_pricing_rule`

瀛楁锛歚pricing_plan_id`銆乣pricing_plan_code`銆乣rule_code`銆乣rule_name`銆乣match_type`銆乣vendor_code`銆乣family_code`銆乣model_id`銆乣model`銆乣provider_code`銆乣channel_id`銆乣provider_model`銆乣capability_code`銆乣platform_code`銆乣service_tier`銆乣region`銆乣price_side`銆乣reference_price_side`銆乣reference_pricing_id`銆乣reference_pricing_scope`銆乣price_item_type`銆乣billing_type`銆乣billing_mode`銆乣billing_meter_id`銆乣billing_meter_code`銆乣unit`銆乣unit_size`銆乣metering_mode`銆乣quantity_source`銆乣quantity_formula`銆乣result_selector`銆乣minimum_quantity`銆乣quantity_step`銆乣included_quantity`銆乣formula_mode`銆乣multiplier`銆乣markup_amount`銆乣unit_price_override`銆乣expression`銆乣expression_hash`銆乣fallback_mode`銆乣priority`銆乣effective_from`銆乣effective_to`锟?
#### 10.17.4 `ai_pricing_tier`

瀛楁锛歚pricing_rule_id`銆乣model_pricing_id`銆乣tier_code`銆乣tier_label`銆乣price_item_type`銆乣billing_mode`銆乣billing_meter_id`銆乣billing_meter_code`銆乣min_quantity`銆乣max_quantity`銆乣quantity_unit`銆乣quantity_step`銆乣included_quantity`銆乣result_selector`銆乣input_unit_price`銆乣output_unit_price`銆乣cache_write_unit_price`銆乣cache_read_unit_price`銆乣image_unit_price`銆乣audio_unit_price`銆乣video_unit_price`銆乣per_request_price`銆乣multiplier`銆乣currency`銆乣sort_order`銆乣effective_from`銆乣effective_to`锟?
#### 10.17.5 `ai_pricing_import_snapshot`

瀛楁锛歚import_source`銆乣source_name`銆乣source_url`銆乣source_version`銆乣source_hash`銆乣upstream_commit`銆乣data_format`銆乣row_count`銆乣accepted_count`銆乣rejected_count`銆乣currency`銆乣published_at`銆乣observed_at`銆乣raw_payload_ref`銆乣normalized_payload_hash`銆乣schema_version`銆乣error_message_masked`锟?
### 10.18 `ai_model_rank_snapshot`

鐢ㄩ€旓細Rankings 椤甸潰浣跨敤锛屼笉浣滀负璐﹀姟浜嬪疄锟?
瀛楁锛歚snapshot_date`銆乣snapshot_period`銆乣rank_scope`銆乣model_id`銆乣model`銆乣vendor_code`銆乣vendor_name_snapshot`銆乣provider_code`銆乣modality`銆乣rank_no`銆乣previous_rank_no`銆乣base_volume`銆乣cost_indicator`銆乣context_size_text`銆乣is_new`銆乣color_token`銆乣pricing_text`銆乣license_type`銆乣strengths`銆乣request_count`銆乣token_count`銆乣cost_amount`銆乣currency`銆乣latency_p50_ms`銆乣latency_p95_ms`銆乣success_rate`銆乣win_rate`銆乣trend_score`銆乣rank_payload`锟?
绱㈠紩锟?
- `uk_ai_model_rank_snapshot_scope_model(snapshot_date, snapshot_period, rank_scope, model)`
- `idx_ai_model_rank_snapshot_vendor_rank(snapshot_date, snapshot_period, vendor_code, rank_no)`
- `idx_ai_model_rank_snapshot_scope_rank(snapshot_date, snapshot_period, rank_scope, rank_no)`

### 10.19 `ai_routing_policy`

瀛楁锛歚policy_code`銆乣name`銆乣policy_scope`銆乣subject_id`銆乣capability`銆乣default_profile_id`銆乣fallback_mode`銆乣slo_latency_ms`銆乣slo_success_rate`銆乣cost_ceiling`銆乣currency`锟?
绱㈠紩锟?
- `uk_ai_routing_policy_tenant_code(tenant_id, organization_id, policy_code)`

### 10.20 `ai_routing_profile`

瀛楁锛歚policy_id`銆乣profile_version`銆乣profile_name`銆乣release_status`銆乣traffic_percent`銆乣config_hash`銆乣published_at`銆乣published_by`銆乣rollback_from_profile_id`锟?
绱㈠紩锟?
- `uk_ai_routing_profile_policy_version(policy_id, profile_version)`

### 10.21 `ai_routing_rule`

瀛楁锛歚profile_id`銆乣rule_code`銆乣priority`銆乣match_expression`銆乣target_model`銆乣candidate_channels`銆乣fallback_chain`銆乣constraints`銆乣rate_limit_policy_id`銆乣effective_from`銆乣effective_to`锟?
绱㈠紩锟?
- `uk_ai_routing_rule_profile_code(profile_id, rule_code)`
- `idx_ai_routing_rule_tenant_profile_priority(tenant_id, organization_id, profile_id, priority, status)`

### 10.22 `ai_routing_decision_log`

瀛楁锛歚request_id`銆乣trace_id`銆乣api_key_id`銆乣legacy_api_key_id`銆乣policy_id`銆乣profile_id`銆乣rule_id`銆乣requested_model`銆乣resolved_model`銆乣capability`銆乣selected_provider_id`銆乣selected_channel_id`銆乣selected_account_id`銆乣decision_mode`銆乣decision_reason`銆乣candidate_snapshot`銆乣fallback_chain`銆乣decision_latency_ms`锟?
绱㈠紩锟?
- `uk_ai_routing_decision_log_request(tenant_id, organization_id, request_id)`
- `idx_ai_routing_decision_tenant_model_created(tenant_id, organization_id, requested_model, created_at, id)`

### 10.23 `ai_request_trace`

瀛楁锛歚request_id`銆乣trace_id`銆乣attempt_no`銆乣decision_log_id`銆乣api_key_id`銆乣legacy_api_key_id`銆乣api_key_name_snapshot`銆乣channel_group_snapshot`銆乣owner_type`銆乣owner_id`銆乣owner_name_snapshot`銆乣provider_id`銆乣channel_id`銆乣channel_name_snapshot`銆乣channel_id`銆乣requested_model`銆乣provider_model`銆乣endpoint`銆乣request_path`銆乣http_method`銆乣http_status`銆乣provider_error_code`銆乣error_type`銆乣started_at`銆乣ended_at`銆乣latency_ms`銆乣ttft_ms`銆乣streaming`銆乣request_bytes`銆乣response_bytes`銆乣prompt_tokens`銆乣completion_tokens`銆乣cached_tokens`銆乣total_tokens`銆乣request_payload_hash`銆乣response_payload_hash`銆乣error_message_masked`銆乣reasoning_effort`銆乣client_ip_hash`銆乣client_ip_masked`銆乣client_ip_region`銆乣user_agent_hash`锟?
绱㈠紩锟?
- `uk_ai_request_trace_request_attempt(tenant_id, organization_id, request_id, attempt_no)`
- `idx_ai_request_trace_tenant_trace(tenant_id, organization_id, trace_id)`
- `idx_ai_request_trace_api_key_started(tenant_id, organization_id, api_key_id, started_at, id)`
- `idx_ai_request_trace_model_started(tenant_id, organization_id, requested_model, started_at, id)`
- `idx_ai_request_trace_tenant_status_started(tenant_id, organization_id, status, started_at, id)`

### 10.24 `ai_usage`

瀛楁锛歚request_id`銆乣trace_id`銆乣decision_log_id`銆乣api_key_id`銆乣legacy_api_key_id`銆乣api_key_name_snapshot`銆乣channel_group_id`銆乣channel_group_snapshot`銆乣owner_type`銆乣owner_id`銆乣owner_name_snapshot`銆乣model`銆乣provider_id`銆乣channel_id`銆乣channel_id`銆乣modality`銆乣usage_type`銆乣billing_type`銆乣billing_mode`銆乣billing_meter_id`銆乣billing_meter_code`銆乣billing_tier`銆乣billable_quantity`銆乣billable_unit`銆乣prompt_tokens`銆乣completion_tokens`銆乣cached_tokens`銆乣total_tokens`銆乣request_count`銆乣result_count`銆乣item_count`銆乣character_count`銆乣image_count`銆乣audio_seconds`銆乣video_seconds`銆乣storage_byte_hours`銆乣bandwidth_bytes`銆乣unit_price_snapshot`銆乣base_input_unit_price`銆乣base_output_unit_price`銆乣cache_read_unit_price`銆乣rate_multiplier`銆乣reference_multiplier`銆乣official_reference_amount`銆乣upstream_cost_amount`銆乣customer_charge_amount`銆乣cost_amount`銆乣currency`銆乣pricing_id`銆乣pricing_plan_id`銆乣pricing_plan_code`銆乣pricing_rule_id`銆乣pricing_tier_id`銆乣pricing_snapshot`銆乣reasoning_effort`銆乣occurred_at`銆乣settlement_status`銆乣settlement_id`锟?
绱㈠紩锟?
- `uk_ai_usage_request(tenant_id, organization_id, request_id, usage_type)`
- `idx_ai_usage_tenant_owner_occurred(tenant_id, organization_id, owner_type, owner_id, occurred_at, id)`
- `idx_ai_usage_api_key_occurred(tenant_id, organization_id, api_key_id, occurred_at, id)`
- `idx_ai_usage_model_occurred(tenant_id, organization_id, model, occurred_at, id)`
- `idx_ai_usage_pricing_plan_occurred(tenant_id, organization_id, pricing_plan_id, occurred_at, id)`
- `idx_ai_usage_meter_occurred(tenant_id, organization_id, billing_meter_code, occurred_at, id)`
- `idx_ai_usage_settlement_status(tenant_id, organization_id, settlement_status, occurred_at, id)`

### 10.25 `ai_quota_policy`

瀛楁锛歚policy_code`銆乣name`銆乣subject_type`銆乣subject_id`銆乣subject_ref_hash`銆乣subject_ref_masked`銆乣scope_type`銆乣scope_id`銆乣group_id`銆乣model`銆乣quota_period`銆乣quota_unit`銆乣quota_limit`銆乣requests_per_second`銆乣requests_per_minute`銆乣requests_per_day`銆乣tokens_per_minute`銆乣burst_limit`銆乣block_duration_seconds`銆乣reset_mode`銆乣exhausted_at`銆乣effective_from`銆乣effective_to`锟?
绱㈠紩锟?
- `uk_ai_quota_policy_tenant_subject(tenant_id, organization_id, subject_type, subject_id, quota_period, quota_unit)`
- `idx_ai_quota_policy_subject_ref(tenant_id, organization_id, subject_type, subject_ref_hash, status)`
- `idx_ai_quota_policy_model_group(tenant_id, organization_id, model, group_id, status)`

### 10.27 `ai_generation_session`

鐢ㄩ€旓細Playground 宸ヤ綔鍙颁笂涓嬫枃銆佽繃婊ゅ櫒銆侀粯璁ゆā鍨嬶拷?
瀛楁锛歚session_code`銆乣title`銆乣active_modality`銆乣selected_models`銆乣filter_config`銆乣last_prompt`銆乣last_opened_at`锟?
绱㈠紩锟?
- `uk_ai_generation_session_user_code(tenant_id, organization_id, user_id, session_code)`
- `idx_ai_generation_session_user_updated(tenant_id, organization_id, user_id, updated_at, id)`

### 10.28 `ai_generation_job`

鐢ㄩ€旓細鍥剧墖銆佽棰戙€侀煶涔愩€佽闊炽€侀煶鏁堛€丄gent 妯″紡鐢熸垚浠诲姟锟?
瀛楁锛歚session_id`銆乣request_id`銆乣job_type`銆乣modality`銆乣model`銆乣provider_id`銆乣channel_id`銆乣prompt`銆乣negative_prompt`銆乣input_asset_ids`銆乣parameter_snapshot`銆乣progress_percent`銆乣started_at`銆乣completed_at`銆乣failure_code`銆乣failure_message_masked`銆乣usage_fact_id`锟?
绱㈠紩锟?
- `uk_ai_generation_job_request(tenant_id, organization_id, request_id)`
- `idx_ai_generation_job_user_modality_created(tenant_id, organization_id, user_id, modality, created_at, id)`
- `idx_ai_generation_job_status_created(tenant_id, organization_id, status, created_at, id)`

### 10.29 `ai_generation_asset`

鐢ㄩ€旓細Playground 鍘嗗彶銆侀瑙堛€佷笅杞姐€佹敹钘忥拷?
瀛楁锛歚job_id`銆乣asset_type`銆乣asset_media_resource_id`銆乣asset_object_blob_id`銆乣asset_resource_snapshot`銆乣thumbnail_media_resource_id`銆乣thumbnail_object_blob_id`銆乣thumbnail_resource_snapshot`銆乣storage_provider`銆乣storage_key`銆乣mime_type`銆乣file_size`銆乣duration_seconds`銆乣width`銆乣height`銆乣prompt_snapshot`銆乣model_snapshot`銆乣parameter_snapshot`銆乣active_index`銆乣visibility`銆乣favorite`銆乣shared`銆乣share_token_hash`銆乣download_count`銆乣last_accessed_at`銆乣expire_at`銆傚墠锟?鎺ュ彛灞傝緭锟?`asset`銆乣thumbnail` 锟?`MediaResource` 瀵硅薄锟?
绱㈠紩锟?
- `idx_ai_generation_asset_user_type_created(tenant_id, organization_id, user_id, asset_type, created_at, id)`
- `idx_ai_generation_asset_job(job_id, id)`
- `idx_ai_generation_asset_favorite(tenant_id, organization_id, user_id, favorite, updated_at, id)`

### 10.30 `ai_generation_asset_action`

鐢ㄩ€旓細鏀惰棌銆佷笅杞姐€佸垎浜€侀珮娓呫€佹墿鍥俱€侀噸缁樸€佸眬閮ㄩ噸缁樸€佹摝闄ゃ€佸鍙ｅ瀷銆佹坊鍔犺儗鏅煶涔愩€佹彃甯с€侀煶鏁堢瓑鎿嶄綔锟?
瀛楁锛歚asset_id`銆乣job_id`銆乣action_type`銆乣action_params`銆乣result_asset_id`銆乣request_id`銆乣client_ip_hash`銆乣client_ip_region`銆乣user_agent_hash`銆乣status`銆乣created_at`銆乣completed_at`銆乣failure_code`锟?
绱㈠紩锟?
- `idx_ai_generation_asset_action_asset_created(asset_id, created_at, id)`
- `idx_ai_generation_asset_action_user_type(tenant_id, organization_id, user_id, action_type, created_at, id)`

### 10.31 `commerce_usage_settlement`

瀛楁锛歚settlement_no`銆乣usage_fact_id`銆乣request_id`銆乣account_id`銆乣account_ledger_entry_id`銆乣order_id`銆乣payment_id`銆乣asset_type`銆乣direction`銆乣amount`銆乣points`銆乣tokens`銆乣currency`銆乣price_snapshot`銆乣settlement_status`銆乣settled_at`銆乣failure_code`銆乣failure_message`锟?
绱㈠紩锟?
- `uk_commerce_usage_settlement_usage(tenant_id, organization_id, usage_fact_id)`
- `idx_commerce_usage_settlement_tenant_status(tenant_id, organization_id, settlement_status, created_at, id)`

### 10.32 `commerce_usage_pricing_plan`

瀛楁锛歚plan_code`銆乣plan_name`銆乣product_id`銆乣sku_id`銆乣vip_level_id`銆乣pricing_mode`銆乣included_quota`銆乣overage_pricing_id`銆乣rate_multiplier`銆乣effective_from`銆乣effective_to`锟?
绱㈠紩锟?
- `uk_commerce_usage_pricing_plan_tenant_code(tenant_id, organization_id, plan_code)`

### 10.33 `commerce_usage_statement`

鐢ㄩ€旓細Settlements/Billing 椤甸潰璐﹀崟鎶曞奖锛屼笉鏇夸唬 `plus_invoice`锟?
瀛楁锛歚statement_no`銆乣period`銆乣period_start`銆乣period_end`銆乣owner_type`銆乣owner_id`銆乣total_tokens`銆乣total_requests`銆乣total_cost`銆乣currency`銆乣statement_status`銆乣generated_at`銆乣due_at`銆乣paid_at`銆乣payment_status`銆乣invoice_id`銆乣export_id`锟?
绱㈠紩锟?
- `uk_commerce_usage_statement_owner_period(tenant_id, organization_id, owner_type, owner_id, period)`
- `idx_commerce_usage_statement_tenant_status(tenant_id, organization_id, statement_status, period_end, id)`

### 10.34 `commerce_usage_statement_item`

瀛楁锛歚statement_id`銆乣item_type`銆乣modality`銆乣model`銆乣model_list`銆乣provider_code`銆乣usage_text`銆乣breakdown_payload`銆乣request_count`銆乣token_count`銆乣asset_count`銆乣duration_seconds`銆乣cost_amount`銆乣currency`銆乣source_usage_fact_ids`锟?
绱㈠紩锟?
- `idx_commerce_usage_statement_item_statement(statement_id, item_type, model)`

### 10.35 `commerce_billing_export`

瀛楁锛歚export_no`銆乣export_type`銆乣period_start`銆乣period_end`銆乣statement_id`銆乣file_manifest`銆乣file_hash`銆乣expire_at`銆乣download_count`銆乣created_by`銆乣approved_by`銆乣audit_log_id`锟?
绱㈠紩锟?
- `uk_commerce_billing_export_no(export_no)`
- `idx_commerce_billing_export_tenant_period(tenant_id, organization_id, period_start, period_end, created_at, id)`

### 10.36 `appstore_app`

瀛楁锛歚app_code`銆乣name`銆乣developer`銆乣category`銆乣summary`銆乣description`銆乣icon_media_resource_id`銆乣icon_object_blob_id`銆乣icon_resource_snapshot`銆乣cover_media_resource_id`銆乣cover_object_blob_id`銆乣cover_resource_snapshot`銆乣platform_types`銆乣os_list`銆乣rating_score`銆乣review_count`銆乣download_count`銆乣download_count_text`銆乣feature_list`銆乣latest_release_at`銆乣sort_order`銆乣published_at`銆傚墠锟?鎺ュ彛灞傝緭锟?`icon`銆乣cover`銆乣image` 锟?`MediaResource` 瀵硅薄锛屽叿浣撳湴鍧€鍙湪灞曠ず杈圭晫瑙ｆ瀽锟?
绱㈠紩锟?
- `idx_app_user_id(user_id)`
- `idx_app_status(status)`銆乣idx_app_project_id(project_id)`

### 10.37 `appstore_app.release_notes` + `appstore_app.install_config`

瀛楁锛歚app_id`銆乣release_code`銆乣platform_type`銆乣os`銆乣version`銆乣size_text`銆乣release_date`銆乣download_url`銆乣download_manifest`銆乣whats_new`锟?
绱㈠紩锟?
- JSON 绾︽潫锛歚release_notes.packageIds` 寮曠敤 `install_config.packages[].id`锛涗笉鐢熸垚鐗╃悊鍞竴绱㈠紩锟?
### 10.38 `appstore_app.resource_list`

瀛楁锛歚app_id`銆乣media_type`銆乣media_resource_id`銆乣object_blob_id`銆乣resource_snapshot`銆乣sort_order`銆乣alt_text`銆乣width`銆乣height`銆俙resource_snapshot` 鎵胯浇 `MediaResource` 瀵硅薄锟?
绱㈠紩锟?
- JSON 绾︽潫锛氬獟浣撹祫婧愯窡锟?`appstore_app` 鐢熷懡鍛ㄦ湡锛涗笉鐢熸垚鐙珛 App media 琛ㄧ储寮曪拷?
### 10.39 `plus_category`

瀛楁锛歚name`銆乣description`銆乣shop_id`銆乣type`銆乣group_name`銆乣code`銆乣tags`銆乣icon`銆乣sort_weight`銆乣parent_id`銆乣path`銆乣visible`銆乣status`锟?
绾︽潫锟?
- SkillsHub 鍙锟?`CategoryType.SKILLS` 锟?`CategoryType.SKILLS_COLLECTION`锟?- app 绔垎绫绘帴鍙ｅ浐瀹氫负 `GET /app/v3/api/skills/categories`锟?- backend 鍒嗙被绠＄悊鎺ュ彛鍥哄畾锟?`/backend/v3/api/category`銆乣/backend/v3/api/category/list`銆乣/backend/v3/api/category/list/all`銆乣/backend/v3/api/category/get_tree`锟?
绱㈠紩锟?
- `idx_category_shop_id(shop_id)`
- `idx_category_type_shop(type, shop_id)`

### 10.40 `plus_agent_skill_package`

瀛楁锛歚package_key`銆乣name`銆乣summary`銆乣description`銆乣icon_media_resource_id`銆乣icon_object_blob_id`銆乣icon_resource_snapshot`銆乣cover_media_resource_id`銆乣cover_object_blob_id`銆乣cover_resource_snapshot`銆乣category_id`銆乣enabled`銆乣featured`銆乣sort_weight`銆乣tags`銆乣latest_published_at`銆傚墠锟?鎺ュ彛灞傝緭锟?`icon`銆乣cover` 锟?`MediaResource` 瀵硅薄锟?
API锟?
- app锛歚GET /app/v3/api/skills/packages`銆乣GET /app/v3/api/skills/packages/{packageId}`锟?- backend锛歚/backend/v3/api/skill/package`銆乣/backend/v3/api/skill/package/list`銆乣/backend/v3/api/skill/package/list/all`锟?
绱㈠紩锟?
- `uk_plus_agent_skill_package_key(tenant_id, organization_id, package_key)`
- `idx_plus_agent_skill_package_user(user_id)`
- `idx_plus_agent_skill_package_category(category_id)`
- `idx_plus_agent_skill_package_market(enabled, featured, sort_weight)`

### 10.41 `plus_agent_skill`

瀛楁锛歚skill_key`銆乣name`銆乣summary`銆乣description`銆乣icon_media_resource_id`銆乣icon_object_blob_id`銆乣icon_resource_snapshot`銆乣cover_media_resource_id`銆乣cover_object_blob_id`銆乣cover_resource_snapshot`銆乣category_id`銆乣package_id`銆乣provider`銆乣version`銆乣runtime`銆乣entrypoint`銆乣manifest_url`銆乣repository_url`銆乣homepage_url`銆乣documentation_url`銆乣license_name`銆乣source_type`銆乣market_status`銆乣visibility`銆乣review_status`銆乣review_comment`銆乣reviewed_by`銆乣reviewed_at`銆乣is_builtin`銆乣enabled`銆乣featured`銆乣recommend_weight`銆乣price`銆乣currency`銆乣install_count`銆乣rating_avg`銆乣rating_count`銆乣tags`銆乣capabilities`銆乣config_schema`銆乣default_config`銆乣latest_published_at`銆傚墠锟?鎺ュ彛灞傝緭锟?`icon`銆乣cover` 锟?`MediaResource` 瀵硅薄锟?
鍓嶇閫傞厤锟?
- `Skill.id/name/description/version/license` 鍒嗗埆鏉ヨ嚜 `skillId/name/description/version/licenseName`锟?- `Skill.category` 鏉ヨ嚜 `plus_category.name`锟?- `Skill.developer` 鏉ヨ嚜 `authorName`锛岀己鐪佹椂浣跨敤 `provider`锟?- `Skill.image` 鏉ヨ嚜 `cover` 濯掍綋璧勬簮锛岀己鐪佹椂浣跨敤 `icon` 濯掍綋璧勬簮锟?- `Skill.rating/downloads` 鏉ヨ嚜 `ratingAvg/installCount`锛岃涓轰簨瀹炰粛鍙敱 `studio_catalog_action` 鍋氬璁″拰閲嶇畻锟?- `Skill.features` 鏉ヨ嚜 `capabilities`锟?- `Skill.clawhubImage/size/frameworks/screenshots` 浣滀负 portal 灞曠ず鍏冩暟鎹斁锟?`default_config.portal` 鎴栫敱 `manifest_url` 鎸囧悜锟?skill manifest 瑙ｆ瀽锛屼笉鏂板绗簩濂楁妧鑳戒富琛拷?
API锟?
- app锛歚GET /app/v3/api/skills`銆乣GET /app/v3/api/skills/{skillId}`銆乣GET /app/v3/api/skills/{skillId}/reviews`銆乣POST /app/v3/api/skills/{skillId}/enable`銆乣PUT /app/v3/api/skills/{skillId}/config`锟?- backend锛歚/backend/v3/api/skill`銆乣/backend/v3/api/skill/list`銆乣/backend/v3/api/skill/list/all`銆乣/backend/v3/api/skill/{id}/review/*`锟?
绱㈠紩锟?
- `uk_plus_agent_skill_key(tenant_id, organization_id, skill_key)`
- `idx_plus_agent_skill_user(user_id)`
- `idx_plus_agent_skill_category(category_id)`
- `idx_plus_agent_skill_package(package_id)`
- `idx_plus_agent_skill_market(market_status, visibility, review_status, enabled)`
- `idx_plus_agent_skill_featured(featured, recommend_weight)`

### 10.42 `plus_user_agent_skill`

瀛楁锛歚skill_id`銆乣enabled`銆乣config`銆乣installed_at`銆乣last_enabled_at`銆乣last_used_at`銆乣used_count`锟?
绱㈠紩锟?
- `uk_plus_user_agent_skill(tenant_id, organization_id, user_id, skill_id)`
- `idx_plus_user_agent_skill_user(user_id)`
- `idx_plus_user_agent_skill_skill(skill_id)`
- `idx_plus_user_agent_skill_enabled(enabled)`

### 10.43 `studio_catalog_action`

瀛楁锛歚target_type`銆乣target_id`銆乣release_id`銆乣action_type`銆乣rating_score`銆乣review_title`銆乣review_body`銆乣client_ip_hash`銆乣user_agent_hash`锟?
绱㈠紩锟?
- `idx_studio_catalog_action_target_type(target_type, target_id, action_type, created_at, id)`
- `idx_studio_catalog_action_user(tenant_id, organization_id, user_id, action_type, created_at, id)`

### 10.43 `content_announcement`

瀛楁锛歚title`銆乣content`銆乣target_scope`銆乣audience_filter`銆乣announcement_type`銆乣pinned`銆乣published_at`銆乣effective_from`銆乣effective_to`锟?
绱㈠紩锟?
- `idx_content_announcement_target_status(tenant_id, organization_id, target_scope, status, published_at, id)`

### 10.44 `content_doc_page`

瀛楁锛歚doc_code`銆乣doc_type`銆乣title`銆乣slug`銆乣path`銆乣summary`銆乣content_source`銆乣source_ref`銆乣content_hash`銆乣sort_order`銆乣published_at`锟?
绱㈠紩锟?
- `uk_content_doc_page_type_slug(doc_type, slug)`

### 10.45 `content_openapi_snapshot`

瀛楁锛歚api_system`銆乣api_surface`銆乣version`銆乣title`銆乣source_ref`銆乣openapi_hash`銆乣endpoint_count`銆乣category_tree`銆乣example_manifest`銆乣published_at`锟?
绱㈠紩锟?
- `uk_content_openapi_snapshot_system_version(api_system, version)`
- `idx_content_openapi_snapshot_system_published(api_system, published_at, id)`

### 10.46 `content_sdk_release`

瀛楁锛歚api_system`銆乣language`銆乣language_icon`銆乣language_description`銆乣package_name`銆乣package_manager`銆乣version`銆乣install_command`銆乣import_code`銆乣init_code`銆乣example_code`銆乣github_url`銆乣source_repo`銆乣docs_url`銆乣openapi_snapshot_id`銆乣default_base_url`銆乣artifact_manifest`銆乣example_manifest`銆乣published_at`锟?
绱㈠紩锟?
- `uk_content_sdk_release_system_lang_version(api_system, language, version)`
- `idx_content_sdk_release_system_lang_published(api_system, language, published_at, id)`

### 10.47 `content_forum_post`

瀛楁锛歚title`銆乣body`銆乣content_snippet`銆乣category`銆乣tags`銆乣author_id`銆乣author_snapshot`銆乣like_count`銆乣comment_count`銆乣view_count`銆乣pinned`銆乣last_replied_at`锟?
绱㈠紩锟?
- `idx_content_forum_post_category_status(category, status, pinned, updated_at, id)`
- `idx_content_forum_post_author(author_id, created_at, id)`

### 10.48 `content_forum_comment`

瀛楁锛歚target_type`銆乣target_id`銆乣post_id`銆乣parent_id`銆乣root_id`銆乣body`銆乣author_id`銆乣author_snapshot`銆乣like_count`锟?
绱㈠紩锟?
- `idx_content_forum_comment_post(post_id, parent_id, created_at, id)`
- `idx_content_forum_comment_target(target_type, target_id, parent_id, created_at, id)`

### 10.49 `content_reaction`

瀛楁锛歚target_type`銆乣target_id`銆乣reaction_type`銆乣reaction_value`銆乣client_ip_hash`銆乣user_agent_hash`銆乣cancelled_at`锟?
绱㈠紩锟?
- `uk_content_reaction_user_target_type(tenant_id, organization_id, user_id, target_type, target_id, reaction_type)`
- `idx_content_reaction_target_type(target_type, target_id, reaction_type, created_at, id)`

### 10.50 璇剧▼琛紙宸插缃級

`content_course*` 琛ㄤ笌 `/courses` 璺敱宸茬Щ锟?claw-router锛岀敱 sibling 浠撳簱 `sdkwork-course` 鎷ユ湁銆傝 [31-product-composition-model.md](./31-product-composition-model.md)锟?
### 10.51 `ops_notification_message`

瀛楁锛歚message_code`銆乣message_type`銆乣title`銆乣summary`銆乣content`銆乣severity`銆乣target_scope`銆乣target_user_id`銆乣target_owner_type`銆乣target_owner_id`銆乣action_url`銆乣published_at`銆乣expire_at`锟?
绱㈠紩锟?
- `idx_ops_notification_message_target(tenant_id, organization_id, target_scope, target_user_id, published_at, id)`

### 10.55 `ops_notification_delivery`

瀛楁锛歚message_id`銆乣user_id`銆乣delivery_channel`銆乣delivery_status`銆乣read_at`銆乣delivered_at`銆乣failure_code`銆乣retry_count`锟?
绱㈠紩锟?
- `uk_ops_notification_delivery_user_message(message_id, user_id, delivery_channel)`
- `idx_ops_notification_delivery_user_read(tenant_id, organization_id, user_id, read_at, created_at, id)`

### 10.56 `ops_metric_snapshot`

瀛楁锛歚metric_scope`銆乣metric_name`銆乣metric_period`銆乣period_start`銆乣period_end`銆乣dimension_key`銆乣dimension_value`銆乣metric_value`銆乣metric_unit`銆乣payload`锟?
绱㈠紩锟?
- `uk_ops_metric_snapshot(metric_scope, metric_name, metric_period, period_start, dimension_key, dimension_value)`

### 10.57 `ops_gateway_instance`

瀛楁锛歚instance_code`銆乣deployment_mode`銆乣region`銆乣cell`銆乣version_name`銆乣host_name`銆乣ip_address_hash`銆乣ip_address_masked`銆乣node_name`銆乣pod_name`銆乣container_id_hash`銆乣desktop_device_hash`銆乣runtime_type`銆乣orchestrator`銆乣started_at`銆乣last_heartbeat_at`銆乣health_status`銆乣config_hash`锟?
绱㈠紩锟?
- `uk_ops_gateway_instance_code(instance_code)`
- `idx_ops_gateway_instance_region_status(region, cell, health_status, last_heartbeat_at)`

### 10.58 `ops_gateway_heartbeat`

瀛楁锛歚instance_id`銆乣heartbeat_at`銆乣cpu_percent`銆乣memory_percent`銆乣disk_percent`銆乣network_in_bytes`銆乣network_out_bytes`銆乣active_connections`銆乣uptime_seconds`銆乣open_file_count`銆乣thread_count`銆乣payload`锟?
绱㈠紩锟?
- `idx_ops_gateway_heartbeat_instance_time(instance_id, heartbeat_at, id)`

### 10.59 `ops_alert_event`

瀛楁锛歚alert_no`銆乣severity`銆乣source`銆乣title`銆乣message`銆乣alert_status`銆乣first_seen_at`銆乣last_seen_at`銆乣resolved_at`銆乣resolved_by`锟?
绱㈠紩锟?
- `uk_ops_alert_event_no(alert_no)`
- `idx_ops_alert_event_status_severity(alert_status, severity, last_seen_at, id)`

### 10.60 `integration_provider_health_snapshot`

瀛楁锛歚provider_id`銆乣channel_id`銆乣channel_id`銆乣check_type`銆乣health_status`銆乣latency_ms`銆乣http_status`銆乣error_code`銆乣error_message_masked`銆乣quota_snapshot`銆乣checked_at`锟?
绱㈠紩锟?
- `idx_integration_provider_health_provider_time(provider_id, checked_at, id)`
- `idx_integration_provider_health_channel_time(channel_id, checked_at, id)`

### 10.61 `ops_config_snapshot`

瀛楁锛歚snapshot_no`銆乣config_scope`銆乣config_type`銆乣source_table`銆乣source_ids`銆乣config_payload`銆乣config_hash`銆乣published_at`銆乣published_by`銆乣rollback_from_snapshot_id`锟?
绱㈠紩锟?
- `uk_ops_config_snapshot_no(snapshot_no)`
- `idx_ops_config_snapshot_tenant_scope(tenant_id, organization_id, config_scope, config_type, created_at, id)`

### 10.62 `ops_audit_log`

瀛楁锛歚operator_type`銆乣operator_id`銆乣operator_name_snapshot`銆乣action`銆乣target_type`銆乣target_id`銆乣target_uuid`銆乣request_id`銆乣trace_id`銆乣client_ip_hash`銆乣user_agent_hash`銆乣before_hash`銆乣after_hash`銆乣change_summary`銆乣risk_level`銆乣approval_id`锟?
绱㈠紩锟?
- `idx_ops_audit_log_tenant_operator_created(tenant_id, organization_id, operator_type, operator_id, created_at, id)`
- `idx_ops_audit_log_tenant_target_created(tenant_id, organization_id, target_type, target_id, created_at, id)`
- `idx_ops_audit_log_request(tenant_id, organization_id, request_id)`

### 10.63 `ops_outbox_event`

瀛楁锛歚event_id`銆乣aggregate_type`銆乣aggregate_id`銆乣aggregate_uuid`銆乣event_type`銆乣event_version`銆乣event_payload`銆乣payload_hash`銆乣headers`銆乣publish_status`銆乣retry_count`銆乣next_retry_at`銆乣published_at`銆乣failure_reason`锟?
绱㈠紩锟?
- `uk_ops_outbox_event_id(event_id)`
- `idx_ops_outbox_event_status_retry(publish_status, next_retry_at, created_at, id)`
- `idx_ops_outbox_event_aggregate(aggregate_type, aggregate_id, created_at, id)`

### 10.64 `ops_inbox_event`

瀛楁锛歚source_system`銆乣message_id`銆乣consumer_name`銆乣event_type`銆乣event_version`銆乣payload_hash`銆乣process_status`銆乣retry_count`銆乣processed_at`銆乣failure_reason`锟?
绱㈠紩锟?
- `uk_ops_inbox_event_message(source_system, message_id, consumer_name)`
- `idx_ops_inbox_event_status_retry(process_status, created_at, id)`

### 10.65 `ops_job_execution`

瀛楁锛歚job_name`銆乣job_type`銆乣trigger_type`銆乣request_id`銆乣started_at`銆乣ended_at`銆乣duration_ms`銆乣execution_status`銆乣processed_count`銆乣success_count`銆乣failure_count`銆乣failure_reason`銆乣payload`锟?
绱㈠紩锟?
- `idx_ops_job_execution_name_started(job_name, started_at, id)`
- `idx_ops_job_execution_status_started(execution_status, started_at, id)`

### 10.66 `ai_channel_group_metric_snapshot`

鐢ㄩ€旓細Admin Group 锟?API Key 鍒嗙粍椤甸潰鐨勫閲忋€佽处鍙峰彲鐢ㄦ暟銆佷粖锟?绱鐢ㄩ噺銆佸仴搴风姸鎬佹姇褰便€傝琛ㄧ敱 metrics worker 锟?`ai_channel_group`銆乣integration_provider_account`銆乣ai_usage` 绛変簨瀹炶〃閲嶅缓锛屼笉浣滀负璐﹀姟浜嬪疄锟?
瀛楁锛歚group_id`銆乣group_code`銆乣provider_code`銆乣account_available_count`銆乣account_total_count`銆乣capacity_used`銆乣capacity_limit`銆乣request_count_today`銆乣request_count_total`銆乣usage_amount_today`銆乣usage_amount_total`銆乣health_status`銆乣snapshot_at`锟?
绱㈠紩锟?
- `uk_ai_channel_group_metric_snapshot(tenant_id, organization_id, group_id, snapshot_at)`
- `idx_ai_channel_group_metric_status(tenant_id, organization_id, provider_code, health_status, snapshot_at, id)`

### 10.67 `iam_user_login_event`

鐢ㄩ€旓細Console Account/User 鐨勬渶杩戠櫥褰曘€佸畨鍏ㄥ憡璀﹀拰 Admin User 椋庨櫓鎺掓煡銆傜櫥褰曚簨浠朵笌 `ops_audit_log` 鍒嗙锛岄伩鍏嶆妸璁よ瘉鏄庣粏娣峰叆鍚庡彴鎿嶄綔瀹¤锟?
瀛楁锛歚auth_method`銆乣auth_provider`銆乣login_result`銆乣risk_level`銆乣failure_reason_code`銆乣client_ip_hash`銆乣client_ip_region`銆乣device_fingerprint_hash`銆乣device_label`銆乣user_agent_hash`銆乣mfa_verified`銆乣session_id_hash`銆乣occurred_at`锟?
绱㈠紩锟?
- `idx_iam_user_login_event_user_occurred(tenant_id, organization_id, user_id, occurred_at, id)`
- `idx_iam_user_login_event_result_occurred(tenant_id, organization_id, login_result, occurred_at, id)`

## 11. 瀛橀噺琛ㄥ叧閿粨锟?
瀛橀噺 `plus_*` 琛ㄧ殑鐗╃悊瀛楁锟?`legacy-java-plus-entity` 瀹炰綋涓哄噯锛屾湰鏂囧彧鍒楀墠绔浉鍏崇殑鍏抽敭缁撴瀯锛岄伩鍏嶅湪鏈」鐩腑澶嶅埗鍑虹浜屼唤鏉ユ簮锟?
| 锟?| 鍓嶇鐩稿叧鍏抽敭瀛楁 |
| --- | --- |
| `plus_user` | `id`銆乣tenant_id`銆乣organization_id`銆乣username`銆乣nickname`銆乣password` 鍔犲瘑瀛楁銆乣email`銆乣phone`銆乣avatar/face`銆乣platform`銆乣type`銆乣status`銆乣roles`銆乣oauth_info`銆乣metadata` |
| `plus_oauth_account` | 鐢ㄦ埛 ID銆佸钩鍙般€乷penid/unionid 鎴栧閮ㄨ处锟?ID銆佺粦瀹氱姸鎬併€佺粦瀹氭椂锟?|
| `plus_account` | `tenant_id`銆乣organization_id`銆乣user_id`銆乣account_type`銆乣owner`銆乣owner_id`銆乣available_balance`銆乣frozen_balance`銆乣available_points`銆乣frozen_points`銆乣token_balance`銆乣frozen_token`銆乣status` |
| `plus_account_history` | `account_id`銆乣transaction_id`銆乣transaction_type`銆乣asset_type`銆佸彉鏇村墠鍚庝綑锟?绉垎/token銆乣source_type`銆乣source_id`銆乣usage_result`銆乣status` |
| `plus_vip_user` | 鐢ㄦ埛 VIP 鐘舵€併€佺瓑绾с€佹湁鏁堟湡銆佹潈鐩婄姸锟?|
| `plus_vip_level` | 绛夌骇缂栫爜銆佺瓑绾у悕绉般€佹潈鐩娿€佷环鏍兼垨瑙勫垯寮曠敤 |
| `plus_vip_recharge` | 鍏呭€煎崟鍙枫€佺敤鎴枫€佸厖鍊煎寘銆佹敮浠橀噾棰濄€佺Н锟?浣欓鍏ヨ处銆佹敮浠樼姸鎬併€佹椂锟?|
| `plus_vip_recharge_pack` | 鍏呭€煎寘鍚嶇О銆侀噾棰濄€佽禒閫併€佹湁鏁堟湡銆佺姸锟?|
| `plus_vip_point_change` | 鐢ㄦ埛銆佺Н鍒嗗彉鍔ㄦ柟鍚戙€佸彉鍔ㄥ€笺€佹潵婧愩€佸彉鍔ㄥ墠鍚庛€佺姸锟?|
| `promotion_offer`銆乣promotion_offer_version` | 鍒稿畾涔夈€佺被鍨嬨€侀潰锟?鎶樻墸銆佹湁鏁堟湡銆侀锟?浣跨敤瑙勫垯 |
| `promotion_coupon_stock`銆乣promotion_code` | 搴撳瓨鎵规銆佸埜鐮併€佸畨鍏ㄥ搱甯屻€佺姸鎬併€佸彂琛屼俊锟?|
| `promotion_user_coupon`銆乣promotion_discount_application` | 鐢ㄦ埛鍒搞€侀鍙栨椂闂淬€佷娇鐢ㄦ椂闂淬€佺姸鎬併€佹牳閿€搴旂敤 |
| `plus_order` | 璁㈠崟鍙枫€佺敤鎴枫€佸晢锟?SKU銆侀噾棰濄€佷紭鎯犮€佹敮浠樼姸鎬併€佽鍗曠姸锟?|
| `plus_order_item` | 璁㈠崟銆丼KU銆佸晢鍝佸揩鐓с€佹暟閲忋€佷环鏍煎揩锟?|
| `plus_payment` | 鏀粯鍗曞彿銆佽鍗曘€佹笭閬撱€侀噾棰濄€佸竵绉嶃€佺姸鎬併€佹敮浠樻椂锟?|
| `plus_payment_webhook_event` | 鏀粯娓犻亾銆佸閮ㄤ簨锟?ID銆乸ayload hash銆佸鐞嗙姸鎬併€佸箓锟?|
| `plus_refund` | 閫€娆惧崟鍙枫€佹敮浠樺崟銆佽鍗曘€侀€€娆鹃噾棰濄€佺姸锟?|
| `plus_invoice`銆乣plus_invoice_item`銆乣plus_invoice_record` | 鍙戠エ鎶ご銆佺◣鍙枫€佽处鏈熴€佸紑绁ㄩ」鐩€佸紑绁ㄨ锟?|
| `plus_api_key` | `name`銆乣key_value` 鍔犲瘑瀛楁銆乣key_type`銆乣owner`銆乣status`銆乣expire_time`銆乣last_used_time`銆乣description` |
| `legacy_model_info` | 妯″瀷銆佹笭閬撱€佷緵搴斿晢銆佽兘鍔涖€佷笂涓嬫枃銆佺敓鍛藉懆鏈熴€佹弿杩般€佷环锟?JSON銆佽兘锟?JSON銆佺粺璁″瓧锟?|
| `legacy_model_price` | 妯″瀷銆佹笭閬撱€佽璐圭被鍨嬨€佷环鏍奸」銆佸崟浣嶃€佷环鏍笺€佸竵绉嶃€佺敓鏁堟湡锛涘瓨閲忎娇锟?`Double`锛屾柊鏍囧噯浠锋牸涓嶇敤璇ョ被锟?|
| `plus_usage_record` | 璇锋眰 ID銆乷wner銆乸latform銆乧hannel銆乸roduct銆乵odel銆乽sage type銆乥illing type銆乼oken/count/duration銆乧ost銆乧urrency銆佺姸锟?|

## 12. 椤甸潰瀛楁鍒拌〃瀛楁鏄犲皠瑕佺偣

| 鍓嶇瀛楁 | 鏍囧噯瀛楁鎴栨潵锟?|
| --- | --- |
| API Key `keyVal/fullKey` | 鍒涘缓鏃惰繑鍥炴槑鏂囦竴娆★紱搴撲腑鍙瓨 `key_prefix`銆乣key_hash` |
| API Key `quota/usedQuota` | `ai_quota_policy` 瀹氫箟閰嶉绛栫暐锛宍ai_usage` 鑱氬悎瀹為檯鐢ㄩ噺锛涘垎缁勭骇瀹归噺/鐢ㄩ噺锟?`ai_channel_group_metric_snapshot` 鎻愪緵 |
| API Key `modalities` | `iam_gateway_access_policy.allowed_capabilities` |
| API Key `ipLimit` | `iam_gateway_access_policy.ip_allowlist` |
| Channel `models` / resources | `ai_channel_resource` + `ai_resource`锛涙ā鍨嬪悕杞崲锟?`ai_model_mapping_rule*` |
| Channel `weight` | `ai_channel.weight` 锟?`ai_routing_rule.candidate_channels` |
| Channel `baseUrl/protocol/accessType` | `ai_channel.base_url/protocol/access_type`锛涢粯璁ゅ€煎彲缁ф壙 `integration_provider.base_url/protocol/auth_type` |
| Channel `balance/errors/latency/rpm` | 涓婃父璐﹀彿棰濆害鍜屽仴搴峰揩鐓ц繘锟?`integration_provider_account`銆乣integration_provider_health_snapshot`銆乣ops_metric_snapshot`锛屼笉浣滆祫閲戜簨锟?|
| Usage `inputTokens/outputTokens/cacheReadTokens` | `ai_usage`銆乣ai_request_trace` |
| Usage `resultCount/itemCount/characterCount/audioSeconds/videoSeconds/billableQuantity` | `ai_usage.billing_meter_code` + `billable_quantity` + 鍚勭被鍨嬫槑缁嗗瓧锟?|
| Usage `baseInputPrice/baseOutputPrice/cacheReadPrice/multiplier/reasoningEffort` | `ai_usage` 鐨勫崟浠峰揩鐓с€佸€嶇巼鍜屾帹鐞嗛厤缃瓧娈碉紱`ai_request_trace` 淇濆瓨璺緞銆乀TFT銆佹祦寮忓拰 IP 鍖哄煙 |
| Billing `totalCost/breakdown/dueDate/status` | `commerce_usage_statement`銆乣commerce_usage_statement_item`锛屽叾锟?`due_at/payment_status/model_list/breakdown_payload` 鏀拺璐﹀崟璇︽儏 |
| Account `loginLogs` | `iam_user_login_event`锛宍ops_audit_log` 鍙壙杞藉悗锟?楂樺嵄鎿嶄綔瀹¤ |
| Account `availableCredits` | `plus_account` |
| Account `invoiceSettings` | `plus_invoice*` 鎴栧彂绁ㄦ湇锟?DTO |
| Settings `webhookUrl` | `integration_webhook_endpoint.target_url` |
| Settings notification switches | `iam_user_preference.notification_preferences` |
| Message `read` | `ops_notification_delivery.read_at` |
| Playground `prompt/modelInfo/type/url/images/videos` | `ai_generation_job` + `ai_generation_asset` |
| Playground favorite/download/share | `ai_generation_asset_action`锛屽父鐢ㄧ姸鎬佸洖锟?`ai_generation_asset.favorite/shared` |
| Model `vendor/family/apiFormat/parameters/limitations/useCases` | `ai_model_vendor` + `ai_model_family` + `ai_model` + `ai_model_capability`锛涘彲鎵╁睍瀛楁杩涘叆 JSON锛屼絾鍏抽敭绛涢€夊瓧娈电嫭绔嬪垪锟?|
| Model `input/output/cachedInput/unit` | `ai_model_pricing` + `ai_billing_meter`锛涘垪琛ㄩ粯璁よ `price_side=customer_charge`锛屾垚鏈紭鍖栬 `price_side=upstream_cost` |
| Model ranking `rank/prevRank/winRate/costIndicator` | `ai_model_rank_snapshot` |
| App releases/downloads/ratings | `appstore_app.release_notes` + `appstore_app.install_config` + `studio_catalog_action`锛涜仛鍚堣鏁颁綔锟?AppCenter view model 鎶曞奖杩斿洖锛屼笉鍥炲啓涓虹浜屽 App 锟?|
| Skill image/framework/license/downloads/ratings | `plus_agent_skill.cover_resource_snapshot/icon_resource_snapshot/license_name/default_config.portal`銆乣plus_agent_skill.install_count/rating_avg`銆乣studio_catalog_action`锛涘墠锟?image 锟?`cover` 锟?`icon` 锟?`MediaResource` 瀵硅薄娓叉煋 |
| Forum author snapshot/likes/replies | `content_forum_post.author_snapshot`銆乣content_forum_comment`銆乣content_reaction`锛涚湡瀹炵敤鎴蜂粛鏉ヨ嚜 `plus_user` |
| API Reference version/category/example | `content_openapi_snapshot`锛涘畬锟?OpenAPI 鏂囦欢浠嶆槸浜嬪疄鏉ユ簮 |
| SDK Reference language/package/install/import/init/example/github | `content_sdk_release`锛汼DK artifact 浠嶇敱鍙戝竷娴佹按绾跨敓锟?|

## 13. API 璺緞绾︽潫

| 鍓嶇浜у搧锟?| API 鍓嶇紑 | 璇存槑 |
| --- | --- | --- |
| Public 鍐呭鍜屽叕寮€妯″瀷鐩綍 | `/app/v3/api` 鎴栭潤鎬佹瀯寤轰骇锟?| 鐢ㄦ埛闈㈡爣鍑嗭紝涓嶅鍔犱骇鍝佸懡鍚嶇┖锟?|
| Console 鐢ㄦ埛鑷姪 | `/app/v3/api` | 杩斿洖 `SdkWorkApiResponse`锛坄code: 0`, `data`, `traceId`锟?|
| Admin 鍚庡彴绠＄悊 | `/backend/v3/api` | 杩斿洖 `SdkWorkApiResponse`锛坄code: 0`, `data`, `traceId`锟?|
| OpenAI 鍏煎璋冪敤 | `/v1/*` | 涓嶅寘锟?`SdkWorkApiResponse`锛堝閮ㄥ崗璁眮鍏嶏級 |

鏁版嵁搴撹〃涓嶈兘涓轰簡鍓嶇璺敱澧炲姞 `console_`銆乣admin_`銆乣portal_`銆佷骇鍝佸悕鎴栭儴缃插悕鍓嶇紑銆傚墠绔ā鍧楀彧鏄娇鐢ㄨ€咃紝涓嶆槸琛ㄥ悕鍓嶇紑鏉ユ簮锟?
## 14. 寤鸿〃浼樺厛锟?
| 闃舵 | 蹇呭缓锟?|
| --- | --- |
| P0 | `ai_model_vendor`銆乣ai_model_family`銆乣integration_provider`銆乣ai_channel`銆乣ai_channel_credential`銆乣ai_channel_resource`銆乣ai_model_mapping_rule`銆乣ai_model_mapping_rule_binding`銆乣ai_model_mapping_rule_item`銆乣ai_model`銆乣ai_model_capability`銆乣ai_billing_meter`銆乣ai_model_pricing`銆乣ai_pricing_plan`銆乣ai_pricing_plan_binding`銆乣ai_pricing_rule`銆乣ai_pricing_tier`銆乣ai_routing_policy`銆乣ai_routing_profile`銆乣ai_routing_rule`銆乣ai_routing_decision_log`銆乣ai_request_trace`銆乣ai_usage`銆乣ops_audit_log`銆乣ops_outbox_event`銆乣ops_inbox_event` |
| P1 | `ai_channel_group`銆乣ai_channel_group_metric_snapshot`銆乣iam_gateway_api_key` 锟?`plus_api_key` 鎵╁睍銆乣iam_gateway_access_policy`銆乣iam_user_login_event`銆乣ai_quota_policy`銆乣ai_generation_session`銆乣ai_generation_job`銆乣ai_generation_asset`銆乣ai_generation_asset_action`銆乣commerce_usage_settlement`銆乣commerce_usage_statement`銆乣commerce_usage_statement_item`銆乣ops_notification_message`銆乣ops_notification_delivery` |
| P2 | `appstore_app`銆乣plus_agent_skill`銆乣plus_agent_skill_package`銆乣plus_user_agent_skill`銆乣plus_category`銆乣content_announcement`銆乣content_doc_page`銆乣content_forum_post`銆乣content_forum_comment`銆乣integration_webhook_endpoint`銆乣ai_model_rank_snapshot` |
| P3 | `ops_gateway_instance`銆乣ops_gateway_heartbeat`銆乣ops_alert_event`銆乣ops_metric_snapshot`銆乣integration_provider_health_snapshot`銆乣commerce_billing_export`銆乣ops_job_execution` |

## 15. 璁捐缁撹

褰撳墠鍓嶇宸茬粡鏄竴涓粺涓€闂ㄦ埛锛屼笉鍐嶆槸澶氫釜鍓嶇搴旂敤鎷嗗垎銆傛暟鎹簱璁捐瑕佹寜鍔熻兘浜嬪疄鏉ユ簮缁勭粐锛岃€屼笉鏄寜鍖呭悕鎴栬矾鐢卞悕寤鸿〃锟?
- Public 妯″潡涓昏浣跨敤 `ai_`銆乣studio_`銆乣content_` 鍜屽皯锟?`ops_` 鎶曞奖琛拷?- Console 妯″潡涓昏浣跨敤 `plus_*` 鏃㈡湁鐢ㄦ埛/璐︽埛/浜ゆ槗琛ㄣ€乣iam_` Key 鍜屽亸濂借〃銆乣integration_` Provider 琛ㄣ€乣ai_` 鐢ㄩ噺/鐢熸垚/璺敱琛ㄣ€乣commerce_` 璐﹀崟鎶曞奖琛拷?- Admin 妯″潡浣跨敤鍚屼竴鎵逛簨瀹炶〃锛屼絾閫氳繃 `/backend/v3/api` 鏆撮湶绠＄悊鑳藉姏锛屽苟寮哄埗锟?`ops_audit_log`锟?- `plus_*` 琛ㄧ户缁繚鎸佸畬鍏ㄤ竴鑷达紱鏂板琛ㄥ彧琛ョ綉鍏炽€侀棬鎴枫€佺敓鎴愯祫浜с€侀€氱煡銆佹姇褰卞拰杩愮淮鑳藉姏锟?
