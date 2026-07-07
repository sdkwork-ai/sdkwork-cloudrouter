> Migrated from `docs/13-椤甸潰绾ф暟鎹粨鏋勮鐩栦笌SchemaRegistry钀藉湴璁捐.md` on 2026-06-24.
> Owner: SDKWork maintainers

> 鐗堟湰锛歷0.1
> 鏃ユ湡锟?026-04-28
> 鑼冨洿锛歚apps/sdkwork-clawrouter-pc` 鍏ㄩ噺 public銆乧onsole銆乤dmin 椤甸潰绾ф暟鎹粨鏋勮鐩栥€侀獙鏀舵潯浠躲€丼chema Registry 钀藉湴鏂瑰紡锟?> 鍏宠仈锛歔12-鍓嶇鍔熻兘妯″潡涓庢暟鎹簱琛ㄧ粨鏋勬槧锟?md](./12-鍓嶇鍔熻兘妯″潡涓庢暟鎹簱琛ㄧ粨鏋勬槧锟?md)銆乕14-鏁版嵁缁撴瀯缁嗚妭澶嶆牳涓庤ˉ寮鸿锟?md](./14-鏁版嵁缁撴瀯缁嗚妭澶嶆牳涓庤ˉ寮鸿锟?md)銆乕schema-registry/sdkwork-clawrouter.tables.yaml](./schema-registry/sdkwork-clawrouter.tables.yaml)锟?> **2026-06-20锟?* 璇剧▼锛坄/courses`銆乣content_course*`锛夊凡杩佸嚭锟?`sdkwork-course`锛涗笅鏂囨秹锟?course 鐨勬钀戒负鍘嗗彶璁板綍锛屼互 [31-product-composition-model.md](./31-product-composition-model.md) 涓哄噯锟?
## 1. 鐩爣

鏈樁娈垫妸鏁版嵁搴撹璁′粠鈥滆〃缁撴瀯璇存槑鈥濇帹杩涘埌鈥滈〉闈㈢骇瑕嗙洊 + 鍙牎楠屽绾︹€濄€傚悗缁疄鐜版椂锛屼换浣曢〉闈㈡帴鍏ョ湡锟?API 鍓嶏紝閮藉繀椤昏兘鍥炵瓟锟?
- 杩欎釜椤甸潰鐨勬暟鎹粠鍝簺浜嬪疄琛ㄣ€佹姇褰辫〃鎴栧瓨锟?`plus_*` 琛ㄦ潵锟?- 椤甸潰鍐欐搷浣滆繘鍏ュ摢锟?API 闈細`/app/v3/api`銆乣/backend/v3/api` 锟?`/v1/*`锟?- 椤甸潰瀛楁鍜岃〃瀛楁濡備綍鏄犲皠锛屾槸鍚︽湁 int64銆乨ecimal銆佹椂闂淬€佹灇涓惧拰 JSON 搴忓垪鍖栭闄╋拷?- 椤甸潰娑夊強鐨勮祫閲戙€佸瘑閽ャ€丳II銆佸璁°€佺粨绠楁槸鍚﹁揪锟?L3锟?- 琛ㄧ粨鏋勬槸鍚﹁繘锟?Schema Registry锛岃兘鍚﹀弽鍚戞牎锟?DDL銆丒ntity銆丏TO銆丱penAPI 锟?SDK锟?
## 2. 琛屼笟鏍囧噯瀵规爣

鏈暟鎹粨鏋勬寜 SaaS API 骞冲彴銆丄I Gateway銆丗inOps銆丏eveloper Portal 锟?Enterprise Admin 鐨勫父瑙佽涓氬疄璺佃璁★拷?
| 璁捐涓婚 | 琛屼笟鏍囧噯鍋氭硶 | 鏈」鐩惤锟?|
| --- | --- | --- |
| 浜嬪疄鏉ユ簮 | 璐︽埛銆佹敮浠樸€佺敤鎴枫€佸埜銆佽鍗曚繚鎸佸崟涓€浜嬪疄鏉ユ簮 | 澶嶇敤 `plus_*`锛屼笉鍒涘缓鍚屼箟鏇夸唬锟?|
| API Key 瀹夊叏 | 鏄庢枃鍙睍绀轰竴娆★紝搴撲腑淇濆瓨 hash/prefix | `plus_api_key` 鍏煎 + `iam_gateway_api_key` L3 绱㈠紩 |
| Provider Secret | Secret 涓嶈惤涓氬姟搴擄紝淇濆瓨 KMS/Vault 寮曠敤 | `integration_provider_account.secret_ref` |
| 鐢ㄩ噺璁¤垂 | 璇锋眰 trace 鍜岃处锟?fact 鍒嗙 | `ai_request_trace` 锟?`ai_usage` 鍒嗚〃 |
| 缁撶畻涓€鑷达拷?| 鐢ㄩ噺浜嬪疄銆佺粨绠楁ˉ鎺ャ€佽处鎴锋祦姘村垎锟?| `ai_usage` -> `commerce_usage_settlement` -> `plus_account_history` |
| 閰嶇疆鍙戝竷 | 閰嶇疆涓昏〃 + 蹇収 + outbox 浜嬩欢鍒锋柊缂撳瓨 | `ops_config_snapshot` + `ops_outbox_event` |
| 鍓嶇闂ㄦ埛 | 鍏紑鍐呭銆佺敤鎴锋帶鍒跺彴銆佸悗鍙扮鐞嗗叡鐢ㄤ簨瀹炶〃锛孉PI 闈㈤殧锟?| public/console/admin 涓嶄骇鐢熼〉闈㈠悕鍓嶇紑锟?|
| 瀹¤鍚堣 | 楂樺嵄鎿嶄綔 append-only 瀹¤ | `ops_audit_log` |
| 澶ц妯℃棩锟?| 鐑簨瀹炶〃鍒嗗尯銆佺暀瀛樸€佸綊锟?| usage銆乼race銆乤udit銆乷utbox/inbox 鎸夋椂闂存不锟?|
| 澶氳瑷€ SDK | int64/decimal string 鍖栵紝schema registry 椹卞姩濂戠害 | YAML 涓粺涓€ `api_serialization` |

## 3. 椤甸潰绾ц鐩栫煩锟?
### 3.1 Public

| 椤甸潰 | 蹇呴』婊¤冻鐨勬暟鎹兘锟?| 浜嬪疄锟?鎶曞奖锟?| 楠屾敹锟?|
| --- | --- | --- | --- |
| `/` Home | 浜у搧鑳藉姏銆侀儴缃叉柟寮忋€佸叆鍙ｅ锟?| 闈欐€佸唴瀹规垨 `content_doc_page` | 棣栭〉涓嶄緷璧栦氦鏄撹〃锛涘彲鐏板害绠＄悊鍐呭锟?|
| `/models` | 妯″瀷鍒楄〃銆佹ā鍨嬪巶瀹躲€佹ā鍨嬫棌銆佹帴鍏ヤ緵搴斿晢銆佹ā鎬併€佽閲忚〃銆佷环鏍笺€佽兘鍔涖€佽繃婊ゆ帓锟?| `ai_model_vendor`銆乣ai_model_family`銆乣ai_model`銆乣ai_model_capability`銆乣ai_billing_meter`銆乣ai_model_pricing`銆乣ai_pricing_plan`銆乣integration_provider` | 浠锋牸 decimal string锛涙ā锟?ID 涓嶇粦瀹氬崟涓€鎺ュ叆渚涘簲鍟嗭紱鍘傚浣跨敤 `ModelVendor`锛涢粯璁ゅ睍绀哄綋鍓嶇敤锟?Key 鍒嗙粍鍛戒腑鐨勫畾浠锋柟锟?|
| `/models/:id`銆乣/models/:provider/:model` | 妯″瀷璇︽儏銆佸巶瀹躲€佹ā鍨嬫棌銆佸弬鏁般€侀檺鍒躲€佺敤渚嬨€丄PI 鏍煎紡锛涘悓鏃舵敮鎸佹ā锟?ID 娣遍摼鍜屼緵搴斿晢/妯″瀷鍙屾娣遍摼 | `ai_model_vendor`銆乣ai_model_family`銆乣ai_model`銆乣ai_model_capability`銆乣ai_model_pricing` | 鑳藉姏瀛楁鍒楀寲锛屽弬锟?schema 鍙増鏈寲锛涘弻娈垫繁閾惧繀椤诲綊涓€鍒板悓涓€妯″瀷鐩綍浜嬪疄 |
| `/rankings` | 鎺掕姒溿€佽秼鍔裤€佹ā鍨嬪巶锟?渚涘簲锟?妯℃€佽繃婊ゃ€佸巻鍙叉洸锟?| `ai_model_rank_snapshot`锛屾潵锟?`ai_usage` | 鎺掕蹇収淇濆瓨 `vendor_code`锛屽彲閲嶅缓锛屼笉鐩存帴鎵湪锟?usage 澶ц〃 |
| `/apps`銆乣/apps/:id` | 搴旂敤鍒楄〃銆佽鎯呫€佹埅鍥俱€佸钩鍙板彂甯冪増鏈€佷笅杞姐€佽瘎鍒嗐€佹敹锟?| `appstore_app`銆乣studio_catalog_action` | App 涓绘暟鎹部锟?canonical platform_app锛涚増鏈€佸畨瑁呭寘銆佸獟浣撴潵锟?appstore_app JSON 瀛楁锛涗笅锟?璇勫垎/鏀惰棌锟?studio_catalog_action 琛屼负浜嬪疄涓哄噯 |
| `/skills-hub`銆乣/skills-hub/:id` | 鎶€鑳藉垪琛ㄣ€侀暅鍍忋€佹鏋躲€佺増鏈€佹埅鍥俱€佷笅杞姐€佽瘎鍒嗐€佹敹锟?| `plus_agent_skill`銆乣plus_agent_skill_package`銆乣plus_user_agent_skill`銆乣plus_category`銆乣studio_catalog_action` | 鎶€鑳戒富鏁版嵁娌跨敤 Java `PlusAgentSkill`锛涘垎绫绘部锟?Java `PlusCategory`锛涢暅锟?澶у皬/妗嗘灦/鎴浘浣滀负 `default_config.portal` 锟?`manifest_url` 鍏冩暟鎹€傞厤锛涗笅锟?璇勫垎/鏀惰棌浠ヨ涓轰簨瀹炲彲閲嶇畻 |
| `/docs`銆乣/product-docs` | 鏂囨。椤点€乻lug銆佸唴锟?hash | `content_doc_page` 鎴栨瀯寤轰骇锟?| 鏂囨。鍙潤鎬佸寲锛孌B 浠呬綔绱㈠紩/鍙戝竷绠＄悊 |
| `/api-reference` | OpenAPI 鍒嗙被銆佹帴鍙ｈ鎯呫€佺ず渚嬨€佺増鏈垏锟?| OpenAPI 鏂囦欢 + `content_doc_page` + `content_openapi_snapshot` | OpenAPI 鏂囦欢鏄帴鍙ｄ簨瀹炴潵婧愶紝DB 鍙繚瀛樼増鏈€乭ash銆佸垎绫绘爲鍜岀ず锟?manifest锛屼笉澶嶅埗瀹屾暣鍙傛暟瀹氫箟 |
| `/sdk-reference` | SDK 璇█銆佸畨瑁呭懡浠ゃ€佺ず渚嬨€佸寘鐗堟湰 | SDK metadata + `content_doc_page` + `content_sdk_release` | SDK 鍏冩暟鎹敱鍙戝竷娴佹按绾跨敓鎴愶紝DB 淇濆瓨鍙绱㈠彂甯冩竻鍗曞拰绀轰緥 manifest |
| `/playground` | Agent/鍥剧墖/瑙嗛/闊充箰/璇煶/闊虫晥鐢熸垚銆佸巻鍙层€侀瑙堛€佹敹钘忋€佷笅杞姐€佸垎浜€佷簩娆℃搷锟?| `ai_generation_session`銆乣ai_generation_job`銆乣ai_generation_asset`銆乣ai_generation_asset_action`銆乣ai_usage` | 鐢熸垚浠诲姟銆佽祫浜у拰鎿嶄綔鍒嗚〃锛涜祫锟?URL 涓嶄綔涓鸿处鍔′簨锟?|
| `/forum`銆乣/forum/:id` | 甯栧瓙銆佽瘎璁恒€佸洖澶嶃€佺偣璧炪€佺疆椤躲€佹爣锟?| `content_forum_post`銆乣content_forum_comment`銆乣content_reaction` | 浣滆€呭揩鐓у拰鐪熷疄鐢ㄦ埛 ID 鍒嗙锛涚偣锟?鍙栨秷鐐硅禐锟?reaction 琛ㄤ负浜嬪疄锛岃鏁板瓧娈靛彲閲嶇畻 |
| `/courses`銆乣/courses/:id` | 璇剧▼銆佺珷鑺傚垎缁勩€佽鏃躲€佸悎闆嗐€佺浉鍏宠绋嬨€佽瘎璁恒€佺偣锟?| `content_course`銆乣content_course_section`銆乣content_course_lesson`銆乣content_course_relation`銆乣content_forum_comment`銆乣content_reaction` | 璇剧▼銆佺珷鑺傚垎缁勩€佽鏃跺拰鎺ㄨ崘鍏崇郴鍒嗚〃锛涜绋嬭瘎璁洪€氳繃閫氱敤 target 瀛楁鎸傝浇 |

### 3.2 Console

| 椤甸潰 | 蹇呴』婊¤冻鐨勬暟鎹兘锟?| 浜嬪疄锟?鎶曞奖锟?| 楠屾敹锟?|
| --- | --- | --- | --- |
| `/console/dashboard` | 鐢ㄦ埛渚х敤閲忚秼鍔裤€佹ā鍨嬫帓琛屻€佸叕锟?| `ai_usage`銆乣ai_model_rank_snapshot`銆乣content_announcement`銆乣ops_metric_snapshot` | 涓嶅叏琛ㄦ壂 usage锛涙寚鏍囧彲閫氳繃蹇収鎴栬仛鍚堣妯″瀷鎻愪緵 |
| `/console/api-keys` | Key 鍒涘缓銆佹壒閲忓垱寤恒€侀€夋嫨鍒嗙粍銆侀搴︺€佽兘鍔涖€両P銆佹ā鍨嬭寖鍥淬€佽繃鏈熴€佸垹锟?| `plus_api_key`銆乣iam_gateway_api_key`銆乣ai_channel_group`銆乣ai_channel_group_metric_snapshot`銆乣iam_gateway_access_policy`銆乣ai_pricing_plan`銆乣ai_quota_policy` | Key 鏄庢枃鍙睍绀轰竴娆★紱鍒涘缓 Key 鏃堕€夋嫨 `ai_channel_group`锛涘垎缁勯€氳繃 `pricing_plan_id` 鑾峰緱榛樿瀹氫环鏂规锛涘垎缁勫閲忓拰宸茬敤閲忚蛋鎶曞奖蹇収 |
| `/console/usage` | 璇锋眰鏃ュ織銆乼oken銆佷环鏍笺€両P銆佽矾寰勩€乀TFT銆佹祦寮忔爣锟?| `ai_request_trace`銆乣ai_usage`銆乣ai_routing_decision_log` | trace 锟?usage 鍙寜 request_id 鍏宠仈 |
| `/console/usage` 澶氭ā鎬佽锟?| 缁撴灉鏁般€佹潯鐩暟銆佸瓧绗︽暟銆侀煶棰戠鏁般€佽棰戠鏁般€佺粺涓€璁¤垂鏁伴噺 | `ai_billing_meter`銆乣ai_usage` | 鎵€鏈夋ā鎬佹渶缁堥兘锟?`billing_meter_code + billable_quantity + billable_unit`锛屽師锟?token/绉掓暟/涓暟浣滀负鏄庣粏瀛楁淇濈暀 |
| `/console/gateway` | endpoint銆乵ethod銆乻tatus銆乨uration銆乧hannel | `ai_request_trace`銆乣ops_gateway_instance` | 杩愯鐘舵€佷笌璇锋眰浜嬪疄鍒嗙 |
| `/console/routing` | 娓犻亾璐﹀彿銆佹ā鍨嬫槧灏勩€佺瓥鐣ャ€丠A銆乫allback銆佽姹傛暟锟?| `integration_*`銆乣ai_routing_*`銆乣ai_request_trace`銆乣ai_usage` | Provider secret 涓嶈惤搴擄紱绛栫暐鍙戝竷鏈夊揩鐓у拰 outbox |
| `/console/commerce` | 鍏戞崲鐮併€佸厖鍊笺€佸厖鍊煎巻锟?| `promotion_code`銆乣promotion_user_coupon`銆乣promotion_discount_application`銆乣commerce_recharge_package`銆乣commerce_order`銆乣commerce_payment_*` | 鍏戞崲鐮佸拰鍗″埜鏍搁攢澶嶇敤 `sdkwork-appbase` promotion 鏍囧噯锟?|
| `/console/checkout` | 鏀粯纭銆佹敮浠樼姸锟?| `plus_order`銆乣plus_payment` | 鏀粯鐘舵€佷互鏀粯鏈嶅姟浜嬪疄涓哄噯 |
| `/console/settlements` | 璐︽湡璐﹀崟銆佸垎椤广€佸锟?| `commerce_usage_statement`銆乣commerce_usage_statement_item`銆乣commerce_billing_export` | 璐﹀崟鏄姇褰憋紝涓嶆浛锟?`plus_invoice` |
| `/console/account` | 璐︽埛璧勬枡銆佷綑棰濄€佸彂绁ㄣ€佸畨鍏ㄣ€佺櫥褰曟棩锟?| `plus_user`銆乣plus_account`銆乣plus_invoice*`銆乣iam_user_security_setting`銆乣iam_user_login_event`銆乣ops_audit_log` | PII 涓嶅鍒跺埌鎵╁睍琛紱鐧诲綍鏄庣粏杩涘叆 IAM 鐧诲綍浜嬩欢锛屼笉娣峰叆鍚庡彴鎿嶄綔瀹¤ |
| `/console/recharge` | 鍏呭€煎寘銆佸厖鍊兼柟锟?| `plus_vip_recharge_pack`銆乣plus_vip_recharge_method` | 鍏呭€煎寘娌跨敤瀛橀噺缁撴瀯 |
| `/console/settings` | 璇█銆佹椂鍖恒€乄ebhook銆侀€氱煡鍋忓ソ | `iam_user_preference`銆乣integration_webhook_endpoint`銆乣ops_notification_delivery` | Webhook secret 瀛樺紩鐢紝閫氱煡鍋忓ソ鍏ョ敤鎴峰亸锟?|
| `/console/notifications` | 閫氱煡鍒楄〃銆佽鎯呫€佸凡璇汇€佽处鍗曟彁閱掋€侀锟?| `ops_notification_message`銆乣ops_notification_delivery` | 閫氱煡瀹氫箟鍜岀敤鎴锋姇閫掔姸鎬佸垎锟?|
| `/console/providers` | Claude/Codex/Gemini/OpenCode 閰嶇疆銆佽祫婧愯兘鍔涖€佷唬锟?| `integration_provider`銆乣ai_channel`銆乣ai_channel_credential`銆乣ai_channel_resource`銆乣integration_proxy`銆乣ai_model_mapping_rule*` | 鏈湴/锟?Provider 鐢ㄥ悓涓€鏍囧噯琛紱璐﹀彿璧勬簮鎺堟潈鍜屾ā鍨嬫槧灏勫垎锟?|
| `/console/user` | 涓汉璧勬枡銆丱Auth銆丮FA銆佸畨鍏ㄧ姸鎬併€佹渶杩戠櫥锟?| `plus_user`銆乣plus_oauth_account`銆乣iam_user_preference`銆乣iam_user_security_setting`銆乣iam_user_login_event` | 鐢ㄦ埛涓绘暟鎹粛锟?`plus_user`锛孫Auth 鐗╃悊琛ㄥ悕锟?entity 淇濇寔涓€锟?|

### 3.3 Admin

| 椤甸潰 | 蹇呴』婊¤冻鐨勬暟鎹兘锟?| 浜嬪疄锟?鎶曞奖锟?| 楠屾敹锟?|
| --- | --- | --- | --- |
| `/admin/dashboard` | 鍏ㄥ眬娴侀噺銆佹垚鏈€乼race銆佸浘锟?| `ai_usage`銆乣ai_request_trace`銆乣ops_metric_snapshot` | 鍚庡彴璺ㄧ鎴锋煡璇㈠繀椤绘樉寮忔巿鏉冨拰瀹¤ |
| `/admin/user` | 鐢ㄦ埛绠＄悊銆佷綑棰濆厖锟?閫€娆俱€佺敤锟?Key | `plus_user`銆乣plus_account`銆乣plus_account_history`銆乣plus_api_key`銆乣iam_gateway_api_key` | 鍚庡彴浣欓鎿嶄綔蹇呴』鍐欒处鎴锋祦姘村拰瀹¤ |
| `/admin/group` | 鍒嗙粍銆佸钩鍙般€佽璐圭被鍨嬨€佸€嶇巼銆侀粯璁ゅ畾浠锋柟妗堛€佽处鍙峰閲忋€佷娇鐢ㄩ噺 | `ai_channel_group`銆乣ai_channel_group_metric_snapshot`銆乣iam_gateway_access_policy`銆乣ai_pricing_plan`銆乣ai_pricing_plan_binding` | 鍒嗙粍涓嶆槸鐢ㄦ埛缁勬浛浠ｈ〃锛屾槸 Key/璁¤垂/绛栫暐鍒嗙粍锛涘垱锟?Key 閫夋嫨璇ュ垎缁勶紱瀹归噺鍜岀敤閲忎粠蹇収璇诲彇锛岄伩鍏嶉〉闈㈡壂鐑簨瀹炶〃 |
| `/admin/model` | 妯″瀷鍘傚銆佹ā鍨嬫棌銆佹ā鍨嬨€佹帴鍏ヤ緵搴斿晢銆佽閲忚〃銆佸畼鏂逛环銆佷緵搴斿晢浠枫€侀攢鍞环銆佷笂涓嬫枃銆佽皟鐢ㄩ噺 | `ai_model_vendor`銆乣ai_model_family`銆乣ai_model`銆乣ai_billing_meter`銆乣ai_model_pricing`銆乣ai_pricing_plan`銆乣ai_pricing_rule`銆乣ai_pricing_tier`銆乣integration_provider`銆乣ai_model_rank_snapshot` | 鏂颁环鏍艰〃涓嶄娇锟?float/double锛沗BillingMeter` 瑕嗙洊 token銆佽姹傘€佺粨鏋溿€佷釜鏁般€佺鏁般€佸瓧绗︺€佸瓨鍌ㄥ拰娴侀噺锛沗price_side` 鍖哄垎瀹樻柟鍙傝€冧环銆佷緵搴斿晢涓婃父鎴愭湰浠枫€佸鎴烽攢鍞环 |
| `/admin/channel` | 涓婃父鏈嶅姟鍟嗚处鍙枫€佸崗璁€佽璇併€佽祫婧愯兘鍔涖€佹ā鍨嬫槧灏勩€佹潈锟?| `ai_model_vendor`銆乣integration_provider`銆乣ai_channel`銆乣ai_channel_credential`銆乣ai_channel_resource`銆乣ai_model_mapping_rule*`銆乣integration_proxy` | Secret 鍙瓨寮曠敤锛涜祫婧愭巿鏉冨拰妯″瀷鏄犲皠鍒嗗埆缁存姢 |
| `/admin/announcement` | 鍏憡鍙戝竷銆佽崏绋裤€佺洰鏍囦汉锟?| `content_announcement` | 鍙戝竷銆佹挙鍥炲啓瀹¤ |
| `/admin/marketing` | 浼樻儬鍒搞€佹壒娆°€佸厬鎹€佸厖鍊艰褰曘€侀個璇风粺锟?| `promotion_offer`銆乣promotion_offer_version`銆乣promotion_coupon_stock`銆乣promotion_code`銆乣promotion_user_coupon`銆乣promotion_discount_application`銆乣promotion_coupon_ledger_entry`銆乣promotion_external_binding`銆乣plus_vip_recharge*`銆乣plus_invitation*`銆乣plus_partner` | 鍗″埜钀ラ攢浜嬪疄缁熶竴杩涘叆 `promotion_*` |
| `/admin/finance` | 浜ゆ槗娴佹按銆佽处鍗曘€佸厖鍊笺€侀€€娆俱€佹秷锟?| `plus_account_history`銆乣plus_payment`銆乣plus_refund`銆乣commerce_usage_statement` | 璐㈠姟浜嬪疄锟?`plus_account_history`銆佹敮浠橀€€娆捐〃涓哄噯 |
| `/admin/record` | 璇锋眰鏃ュ織銆佽璐规槑缁嗐€佷环鏍煎揩鐓с€両P | `ai_request_trace`銆乣ai_usage`銆乣ai_routing_decision_log` | 璇锋眰浜嬪疄鍙寜 request_id 鍥炴斁 |
| `/admin/ratelimit` | IP銆乀oken銆佹ā鍨嬮檺娴併€侀槻鐏 | `ai_quota_policy`銆乣iam_gateway_risk_rule`銆乣iam_gateway_access_policy`銆乣ai_usage`銆乣ops_metric_snapshot` | 榛戠櫧鍚嶅崟鍜岄檺娴佺瓥鐣ュ彲鐗堟湰鍖栵紱杩愯鎬佺敤閲忎粠璇锋眰浜嬪疄鍜屾寚鏍囨姇褰辫仛锟?|
| `/admin/monitor` | 鑺傜偣銆丆PU銆佸唴瀛樸€佸憡璀︺€佹€ц兘鏇茬嚎 | `ops_gateway_instance`銆乣ops_gateway_heartbeat`銆乣ops_alert_event`銆乣ops_metric_snapshot` | 鐩戞帶鎸囨爣涓庡锟?閰嶇疆鍒嗙 |

## 4. Schema Registry 钀藉湴鏂瑰紡

Schema Registry 鏂囦欢锟?[schema-registry/sdkwork-clawrouter.tables.yaml](./schema-registry/sdkwork-clawrouter.tables.yaml)銆傚畠涓嶆槸杩佺Щ鑴氭湰锛岃€屾槸鐢熸垚鍜屾牎楠岃縼绉昏剼鏈殑涓婃父濂戠害锟?
### 4.1 Registry 蹇呴』鍖呭惈

| 濂戠害锟?| 瑕佹眰 |
| --- | --- |
| `table` | 鏍囧噯琛ㄥ悕 |
| `domain` | `iam`銆乣integration`銆乣ai`銆乣commerce`銆乣studio`銆乣content`銆乣ops`銆乣legacy` |
| `profile` | 琛ㄧ敾鍍忥紝渚嬪 `tenant_entity`銆乣event_log`銆乣projection`銆乣audit_log` |
| `compliance_level` | L0/L1/L2/L3 |
| `system_of_record` | 鏄惁浜嬪疄鏉ユ簮 |
| `write_owner` | 鍐欏叆 owner |
| `api_surfaces` | `app`銆乣backend`銆乣openai_v1`銆乣worker`銆乣system` |
| `frontend_routes` | 瑕嗙洊鐨勯〉闈㈣矾锟?|
| `columns` | 涓撳睘瀛楁鍜屽叕鍏卞瓧娈电粍 |
| `indexes` | 鏍稿績鍞竴閿拰鏌ヨ绱㈠紩 |
| `security` | 鏁忔劅绛夌骇銆丳II銆乻ecret銆佸璁¤锟?|
| `lifecycle` | 鐣欏瓨銆佸綊妗ｃ€佽蒋鍒犮€侀噸寤虹瓥锟?|

### 4.2 鐢熸垚閾捐矾

```text
schema-registry YAML
  -> DDL migration draft
  -> Java Entity / Repository
  -> App API / Backend API OpenAPI
  -> generated SDK
  -> frontend SDK service replacement
  -> schema drift / API drift CI
```

### 4.3 闃绘柇瑙勫垯

- Registry 涓笉瀛樺湪鐨勬柊澧炶〃锛屼笉鍏佽杩涘叆杩佺Щ鑴氭湰锟?- Registry 涓病锟?`frontend_routes` 锟?`read_consumers` 鐨勮〃锛屽繀椤昏鏄庡悗鍙颁换鍔°€佺郴缁熸姇褰辨垨鍏煎杩佺Щ鐢ㄩ€旓拷?- L3 琛ㄧ己锟?security銆乺etention銆乮dempotency 锟?audit 璇存槑鏃讹紝闃绘柇瀹炵幇锟?- `plus_*` 琛ㄥ彧鑳界櫥璁颁负 legacy compatible锛屼笉鑳藉湪鏈」鐩敓鎴愭敼锟?DDL锟?- `claw_`銆乣router_`銆乣sdkwork_`銆乣console_`銆乣admin_`銆乣portal_` 涓嶅緱浣滀负鏂颁笟鍔¤〃鍓嶇紑锟?
## 5. 椤甸潰瀹炵幇楠屾敹鍙ｅ緞

| 楠屾敹锟?| 鏍囧噯 |
| --- | --- |
| 椤甸潰鏁版嵁鏉ユ簮 | 姣忎釜椤甸潰鍦ㄦ湰鏂囩 3 鑺傛湁琛ㄦ槧锟?|
| 琛ㄥ锟?| 姣忓紶鏂拌〃锟?Schema Registry 鏈夌櫥锟?|
| API 锟?| Console 鍙蛋 `/app/v3/api`锛孉dmin 鍙蛋 `/backend/v3/api`锛孫penAI 鍏煎鍙蛋 `/v1/*` |
| 閲戦鍜屼环锟?| decimal string锛屼笉浣跨敤 float/double |
| int64 | API/SDK 搴忓垪鍖栦负 string |
| 瀵嗛挜 | 鏄庢枃涓嶈惤搴擄紝secret reference + hash |
| 璐︽埛/鍏咃拷?鏀粯 | 浣跨敤 `plus_*`锛屼笉寤烘浛浠ｈ〃 |
| 鐢ㄩ噺璁¤垂 | `ai_usage` 鏄敤閲忎簨瀹烇紝`commerce_usage_settlement` 鏄ˉ鎺ワ紝`plus_account_history` 鏄渶缁堟祦锟?|
| 瀹¤ | Admin 楂樺嵄鍐欐搷浣滆繘锟?`ops_audit_log` |
| 鍙锟?| 璇锋眰銆乼race銆佽矾鐢卞喅绛栥€佺敤閲忋€佺粨绠楀彲浠ョ敤 `request_id` 涓茶仈 |
| 鎬ц兘 | 鐑棩锟?浜嬪疄琛ㄦ湁鍒嗗尯銆佺暀瀛樸€佺储寮曢锟?|
| 鍙噸锟?| 鎺掕姒溿€佽处鍗曘€佹寚鏍囨槸 projection锛屽彲浠庝簨瀹炶〃閲嶅缓 |

## 6. P0/P1 瀹炵幇鑼冨洿

### 6.1 P0

鍏堟弧锟?API Gateway銆丳rovider銆佽矾鐢便€佺敤閲忎簨瀹炲拰瀹¤闂幆锟?
- `integration_provider`
- `ai_channel`
- `integration_provider_account`
- `ai_channel_credential`
- `ai_channel_resource`
- `ai_model_mapping_rule`
- `ai_model_mapping_rule_binding`
- `ai_model_mapping_rule_item`
- `ai_model_vendor`
- `ai_model_family`
- `ai_model`
- `ai_billing_meter`
- `ai_model_pricing`
- `ai_pricing_plan`
- `ai_pricing_plan_binding`
- `ai_pricing_rule`
- `ai_pricing_tier`
- `ai_routing_policy`
- `ai_routing_profile`
- `ai_routing_rule`
- `ai_routing_decision_log`
- `ai_request_trace`
- `ai_usage`
- `ops_audit_log`
- `ops_outbox_event`
- `ops_inbox_event`

### 6.2 P1

鍐嶆弧锟?console 楂橀椤甸潰鍜岀敓浜х粨绠楅棴鐜細

- `ai_channel_group`
- `ai_channel_group_metric_snapshot`
- `iam_gateway_api_key` 锟?`plus_api_key` 鎵╁睍
- `iam_gateway_access_policy`
- `ai_pricing_import_snapshot`
- `ai_quota_policy`
- `ai_generation_session`
- `ai_generation_job`
- `ai_generation_asset`
- `ai_generation_asset_action`
- `commerce_usage_settlement`
- `commerce_usage_statement`
- `commerce_usage_statement_item`
- `ops_notification_message`
- `ops_notification_delivery`
- `iam_user_preference`
- `iam_user_security_setting`
- `iam_user_login_event`
- `content_openapi_snapshot`
- `content_sdk_release`
- `content_reaction`
- `content_course_section`
- `studio_catalog_action`

## 7. 鍚庣画浜х墿

瀹屾垚鏈枃锟?Schema Registry 鍚庯紝涓嬩竴姝ュ疄鐜板簲鎸変互涓嬮『搴忔帹杩涳細

1. 锟?Registry 鐢熸垚 P0/P1 PostgreSQL DDL 鑽夋锟?2. 锟?SQLite 鏈湴妗岄潰閮ㄧ讲鐢熸垚鍏煎 DDL 鑽夋锟?3. 鐢熸垚 Java Entity/Repository 鑽夋锛屼絾涓嶆敼 `plus_*` 琛拷?4. 锟?`legacy-java-plus-app-api` 锟?`legacy-java-plus-backend-api` 涓ˉ鏍囧噯璺緞锟?OpenAPI锟?5. 鐢熸垚 SDK 鍚庢浛锟?portal 涓殑 mock service锟?6. 澧炲姞 CI锛歴chema registry drift銆佺鐢ㄥ墠缂€銆乮nt64/decimal 搴忓垪鍖栥€丩3 瀹夊叏瀛楁銆佹浛浠ｈ〃闃绘柇锟?
## 8. 缁撹

褰撳墠鏁版嵁缁撴瀯瑕嗙洊锟?portal 鐨勫叏閮ㄩ〉闈細public 鍐呭闈€乧onsole 鐢ㄦ埛鎺у埗闈€乤dmin 绠＄悊闈€丱penAI 鍏煎缃戝叧璋冪敤闈€傝璁′互浜嬪疄鏉ユ簮涓鸿竟鐣岋紝涓嶆寜鍓嶇璺敱寤鸿〃锛涗互 `plus_*` 淇濇姢鏃㈡湁鐢ㄦ埛/璐︽埛/浜ゆ槗浜嬪疄锛屼互鏍囧噯鍓嶇紑琛ㄦ壙杞芥柊澧炵綉鍏炽€侀棬鎴枫€佺敓鎴愯祫浜с€侀€氱煡銆佸璁″拰鎶曞奖鑳藉姏锟?
