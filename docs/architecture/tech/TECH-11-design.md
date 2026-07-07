> Migrated from `docs/11-鏁版嵁濂戠害涓庢牳蹇冭〃璁捐.md` on 2026-06-24.
> Owner: SDKWork maintainers

> 鐗堟湰锛歷0.1
> 鏃ユ湡锟?026-04-28
> 鑼冨洿锛歚sdkwork-clawrouter` 鏂板鏁版嵁鍩熴€佸瓨锟?`plus_*` 琛ㄥ鐢ㄨ竟鐣屻€佹牳蹇冭〃濂戠害銆佺储寮曘€佺暀瀛樸€佷簨浠朵竴鑷存€у拰 CI 鏍￠獙锟?> 渚濇嵁锛歔DATABASE_SPEC.md](../DATABASE_SPEC.md)銆乕05-鏁版嵁搴撹锟?md](./05-鏁版嵁搴撹锟?md)銆乕12-鍓嶇鍔熻兘妯″潡涓庢暟鎹簱琛ㄧ粨鏋勬槧锟?md](./12-鍓嶇鍔熻兘妯″潡涓庢暟鎹簱琛ㄧ粨鏋勬槧锟?md)銆乕13-椤甸潰绾ф暟鎹粨鏋勮鐩栦笌SchemaRegistry钀藉湴璁捐.md](./13-椤甸潰绾ф暟鎹粨鏋勮鐩栦笌SchemaRegistry钀藉湴璁捐.md)銆乣legacy-java-plus-entity` 鏃㈡湁瀹炰綋銆乣legacy-java-plus-app-api`銆乣legacy-java-plus-backend-api`锟?
## 1. 鏂囨。瀹氫綅

鏈枃涓嶆槸 SQL 杩佺Щ鑴氭湰锛屼篃涓嶆槸 ORM 瀹炰綋娓呭崟锛岃€屾槸寤鸿〃鍓嶇殑鏁版嵁濂戠害銆傚悗缁换锟?DDL銆丣PA Entity銆丷epository銆丱penAPI銆乀ypeScript/Java SDK DTO銆佹暟鎹悓姝ヤ换鍔″拰 CI schema linter 閮藉簲浠庢湰鏂囧绾︾敓鎴愭垨鍙嶅悜鏍￠獙锟?
鏈疆鍙墦纾ㄨ璁★紝涓嶄慨锟?`legacy-java-plus-entity` 鏃㈡湁琛ㄧ粨鏋勶紝涓嶇敓鎴愮敓浜ц縼绉伙拷?
褰撳墠 portal 鍓嶇 public銆乧onsole銆乤dmin 妯″潡鍒版暟鎹簱琛ㄥ拰瀛楁鐨勫畬鏁存槧灏勮 [12-鍓嶇鍔熻兘妯″潡涓庢暟鎹簱琛ㄧ粨鏋勬槧锟?md](./12-鍓嶇鍔熻兘妯″潡涓庢暟鎹簱琛ㄧ粨鏋勬槧锟?md)銆傞〉闈㈢骇瑕嗙洊楠屾敹銆佸瓧娈电骇澶嶆牳鍜屾満鍣ㄥ彲鏍￠獙琛ㄦ敞鍐岃〃锟?[13-椤甸潰绾ф暟鎹粨鏋勮鐩栦笌SchemaRegistry钀藉湴璁捐.md](./13-椤甸潰绾ф暟鎹粨鏋勮鐩栦笌SchemaRegistry钀藉湴璁捐.md)銆乕14-鏁版嵁缁撴瀯缁嗚妭澶嶆牳涓庤ˉ寮鸿锟?md](./14-鏁版嵁缁撴瀯缁嗚妭澶嶆牳涓庤ˉ寮鸿锟?md) 锟?[schema-registry/sdkwork-clawrouter.tables.yaml](./schema-registry/sdkwork-clawrouter.tables.yaml)銆傛湰鏂囪礋璐ｆ牳蹇冩暟鎹绾︼紝12 鍙锋枃妗ｈ礋璐ｄ粠鍓嶇浜у搧闈㈠弽鎺ㄥ畬鏁磋〃缁撴瀯瑕嗙洊锟?3 鍙锋枃妗ｈ礋璐ｉ〉闈㈢骇瑕嗙洊闂幆锟?Registry 钀藉湴瑙勫垯锟?4 鍙锋枃妗ｈ礋锟?service/interface/mock data 瀛楁绾х己鍙ｅ鏍革拷?
鏍稿績鐩爣锟?
- 淇濇寔鐢ㄦ埛銆乂IP銆佽处鎴枫€佷紭鎯犲埜銆佺Н鍒嗗厖鍊笺€佽鍗曘€佹敮浠樸€侀€€娆俱€佸彂绁ㄧ瓑 `plus_*` 琛ㄧ粨鏋勫畬鍏ㄤ竴鑷达拷?- 鏁版嵁搴撴ā鍨嬮噰锟?Java Entity first锛氫换浣曟柊澧炴暟鎹ā鍨嬪厛锟?`legacy-java-plus-entity`锛涘彧瑕佸瓨锟?`Plus*` Entity锛屽氨蹇呴』娌跨敤瀵瑰簲 `plus_*` 琛ㄥ拰 Java app/backend API锛屼笉寰楀湪 claw-router 涓嬫柊寤哄悓涔変富鏁版嵁琛拷?- 锟?claw-router 鏂板缃戝叧鍩熻兘鍔涜璁℃爣鍑嗗寲銆佸彲瀹¤銆佸彲鎵╁睍鐨勬柊琛拷?- 鏀拺鏈湴妗岄潰銆丼erver銆丏ocker銆並8S 鍥涚閮ㄧ讲鏂瑰紡锛屼繚鎸佸悓涓€濂楅€昏緫鏁版嵁濂戠害锟?- 鏀拺 API 閫氳繃 Java app/backend 鏍囧噯璺緞鑷敱鍒囨崲锛氱敤鎴烽潰 `/app/v3/api`锛岀鐞嗛潰 `/backend/v3/api`锛孫penAI 鍏煎锟?`/v1/*`锟?- 鏀拺楂樻€ц兘鐑矾寰勶細閰嶇疆鍙紦瀛樸€佽姹備簨瀹炲彲寮傛钀藉湴銆佺敤閲忕粨绠楀彲骞傜瓑琛ュ伩锟?
## 2. 鏁版嵁鏋舵瀯鎬昏

### 2.1 鍒嗗眰妯″瀷

| 锟?| 璇存槑 | 浠ｈ〃锟?| 鍐欏叆 owner | 涓€鑷存€ц锟?|
| --- | --- | --- | --- | --- |
| 瀛橀噺涓绘暟鎹眰 | Java 涓氬姟瀹炰綋宸叉湁浜嬪疄鏉ユ簮 | `plus_user`銆乣plus_account`銆乣plus_vip_*`銆乣plus_order`銆乣plus_payment` | 鏃㈡湁 Java service/repository | 淇濇寔鐜扮姸锛宑law-router 涓嶇洿鎺ユ敼缁撴瀯 |
| 鎺у埗闈㈤厤缃眰 | 缃戝叧鍩熼厤缃€丳rovider銆佹ā鍨嬪巶瀹躲€佹ā鍨嬨€佺瓥鐣ャ€並ey 鎵╁睍銆佸崱鍒歌惀閿€ | `iam_*`銆乣integration_*`銆乣ai_model_vendor`銆乣ai_model`銆乣ai_routing_*`銆乣promotion_*` | claw-router control-plane | 寮轰竴鑷村啓鍏ワ紝鍙樻洿鍙戝竷鍒扮紦锟?|
| 鐑矾寰勪簨瀹炲眰 | 璇锋眰鍐崇瓥銆佽皟锟?trace銆佺敤閲忎簨锟?| `ai_routing_decision_log`銆乣ai_request_trace`銆乣ai_usage` | gateway runtime | append-only/锟?append-only锛屾敮鎸佸紓姝ヨ惤鍦板拰琛ュ伩 |
| 缁撶畻鎶曞奖锟?| 鐢ㄩ噺锟?appbase 璧勯噾/绉垎璐︽埛鐨勬ˉ鎺ヨ瘉锟?| `commerce_usage_settlement`銆乣commerce_billing_export` | settlement worker | 骞傜瓑锛屽紩锟?`commerce_account_ledger_entry`锛屼笉澶嶅埗璐﹀姟浜嬪疄 |
| 杩愯惀瀹¤锟?| 閰嶇疆蹇収銆佸璁°€佷换鍔°€佸憡璀︺€佷簨锟?| `ops_config_snapshot`銆乣ops_audit_log`銆乣ops_outbox_event`銆乣ops_inbox_event` | admin/ops/worker | L3 瀹¤銆佺暀瀛樸€佸彲杩借釜 |
| 闂ㄦ埛鍐呭锟?| 缁熶竴闂ㄦ埛涓殑鐢熸€佸唴锟?| `studio_*`銆乣content_*` | portal/content service | 涓庢牳蹇冭处鍔￠殧绂伙紝鍙嫭绔嬫墿锟?|

### 2.2 鍐欏叆杈圭晫

| 鎿嶄綔 | 姝ｇ‘鍐欏叆璺緞 | 绂佹璺緞 |
| --- | --- | --- |
| 鍒涘缓/鏇存柊鐢ㄦ埛 | Java app/backend 鐢ㄦ埛鏈嶅姟锟?`plus_user` | 锟?claw-router 涓垱寤虹敤鎴烽暅鍍忚〃 |
| 鍏呭€笺€佹墸璐广€侀€€娆俱€佺Н鍒嗗彉锟?| 璐︽埛/VIP/浜ゆ槗鏈嶅姟锟?`plus_account`銆乣plus_account_history`銆乣plus_vip_point_change`銆乣plus_payment`銆乣plus_refund` | 缃戝叧鐩存帴 update 浣欓锛涘彧鍐欐姇褰变笉鍐欐祦锟?|
| 鍒涘缓 API Key | 浼樺厛澶嶇敤 Java `plus_api_key`锛涢渶瑕佺綉鍏虫墿灞曟椂锟?`iam_gateway_api_key` 浣滀负 L3 Key 绱㈠紩/鎵╁睍 | 淇濆瓨鏄庢枃 key锛涘涓〃鍚勮嚜鐢熸垚鍚屼竴鐢拷?key |
| 閰嶇疆 Provider 璐﹀彿 | 锟?`integration_provider_account`锛宻ecret 杩涘叆 Vault/Keychain/KMS锛屽簱涓彧淇濆瓨 `secret_ref` 锟?hash | 锟?JSON 涓繚瀛樹笂锟?API key 鏄庢枃 |
| 閰嶇疆璺敱绛栫暐 | 锟?`ai_routing_policy/profile/rule`锛岄€氳繃 outbox 鍙戝竷缂撳瓨鍒锋柊 | 鐑矾寰勫疄渚嬫湰鍦伴厤缃紓绉诲悗涓嶅洖锟?|
| 璁板綍璇锋眰鐢ㄩ噺 | gateway 锟?`ai_usage`锛宻ettlement worker 缁撹浆 | 鐩存帴锟?trace 锟?access log 浣滀负璐﹀姟浜嬪疄 |
| 鍙戝竷璺ㄦ湇鍔′簨锟?| 鏈湴浜嬪姟锟?`ops_outbox_event`锛屾秷璐硅€呭啓 `ops_inbox_event` 鍘婚噸 | 鍙緷璧栧唴瀛橀槦鍒楁垨鏃犲箓绛夋秷鎭秷锟?|

## 3. 瀛橀噺 `plus_*` 琛ㄥ鐢ㄥ锟?
### 3.1 寮哄埗澶嶇敤锟?
浠ヤ笅涓氬姟鍩熶笉锟?claw-router 涓垱寤烘浛浠ｈ〃銆傝〃缁撴瀯銆佸瓧娈点€佺储寮曘€佹灇涓捐浆鎹€佸姞瀵嗚浆鎹€佸璁″瓧娈靛潎锟?`legacy-java-plus-entity` 涓哄噯锟?
| 棰嗗煙 | 浜嬪疄鏉ユ簮锟?| 鏈郴缁熺敤锟?|
| --- | --- | --- |
| 鐢ㄦ埛 | `plus_user`銆乣plus_user_address`銆乣plus_oauth_account` | 鐧诲綍鐢ㄦ埛銆佺鎴峰綊灞炪€佽仈绯绘柟寮忋€丱Auth 缁戝畾 |
| 绉熸埛缁勭粐鏉冮檺 | `plus_tenant`銆乣plus_organization`銆乣plus_organization_member`銆乣plus_department`銆乣plus_position`銆乣plus_role`銆乣plus_permission`銆乣plus_role_permission`銆乣plus_user_role` | app/backend 鏉冮檺涓婁笅鏂囥€佸悗鍙扮鐞嗘潈锟?|
| VIP | `plus_vip_user`銆乣plus_vip_level`銆乣plus_vip_benefit`銆乣plus_vip_level_benefit`銆乣plus_vip_benefit_usage` | VIP 鐘舵€併€佺瓑绾с€佹潈鐩娿€佹潈鐩婃秷锟?|
| 鍏呭€煎拰绉垎 | `plus_vip_recharge`銆乣plus_vip_recharge_pack`銆乣plus_vip_recharge_method`銆乣plus_vip_point_change` | 鍏呭€艰褰曘€佸厖鍊煎寘銆佺Н鍒嗘祦锟?|
| 璐︽埛鍜岃处锟?| `plus_account`銆乣plus_account_history`銆乣plus_ledger_bridge`銆乣plus_currency`銆乣plus_exchange_rate`銆乣plus_account_exchange_config` | 浣欓銆佺Н鍒嗐€乼oken銆佽处鎴锋祦姘淬€佹眹锟?|
| 鍟嗗搧璁㈠崟鏀粯 | `plus_product`銆乣plus_sku`銆乣plus_order`銆乣plus_order_item`銆乣plus_payment`銆乣plus_payment_webhook_event`銆乣plus_refund` | 濂楅銆佽鍗曘€佹敮浠樸€佸洖璋冦€侀€€锟?|
| 鏈嶅姟璁㈠崟娲惧彂 | `plus_order_dispatch_rule`銆乣plus_order_worker_dispatch_profile` | 鏈嶅姟璁㈠崟娲惧彂瑙勫垯銆佹帴鍗曚汉鍛樺閲忓拰璇勭骇閰嶇疆 |
| 鍗″埜钀ラ攢 | `promotion_offer`銆乣promotion_offer_version`銆乣promotion_coupon_stock`銆乣promotion_code`銆乣promotion_user_coupon`銆乣promotion_discount_application`銆乣promotion_coupon_ledger_entry`銆乣promotion_external_binding` | 鍒稿畾涔夈€佺増鏈€佸簱瀛樸€佸厬鎹㈢爜銆佺敤鎴峰埜銆佹牳閿€銆佹祦姘村拰澶栭儴骞冲彴缁戝畾 |
| 鍙戠エ璐墿锟?| `plus_invoice`銆乣plus_invoice_item`銆乣plus_invoice_record`銆乣plus_shopping_cart`銆乣plus_shopping_cart_item` | 鍙戠エ銆佽喘鐗╄溅 |

### 3.2 鐜版湁瀹炰綋瑙傚療缁撹

| 锟?| 瑙傚療鍒扮殑鍏抽敭濂戠害 | claw-router 澶勭悊 |
| --- | --- | --- |
| `plus_user` | 鍖呭惈鐢ㄦ埛鍚嶃€佹樀绉般€佸姞瀵嗗瘑鐮併€佸钩鍙般€佹€у埆銆侀偖绠便€佹墜鏈哄彿銆佸尯鍩熴€丱Auth JSON銆佽鑹插叧绯汇€乵etadata 锟?| 鍙紩鐢紝涓嶅锟?PII锛涜繑鍥炲瓧娈佃蛋 app/backend DTO 鑴辨晱 |
| `plus_account` | 鍞竴閿负 `(tenant_id, organization_id, user_id, account_type)`锛涘寘鍚綑棰濄€佸喕缁撲綑棰濄€佺Н鍒嗐€乼oken銆佺姸锟?| 鎵€鏈夋墸锟?鍏呭€煎繀椤昏蛋璐︽埛鏈嶅姟锛涗笉寰楃粫杩囨祦锟?|
| `plus_account_history` | 鍖呭惈 account銆乼ransaction銆乤sset銆乥efore/after銆乻ource銆乽sage_result銆乻tatus | 鐢ㄩ噺缁撶畻鐨勬渶缁堣处鍔¤瘉鎹惤鍦ㄨ繖锟?|
| `plus_vip_recharge*` | 鍏呭€煎寘銆佸厖鍊兼柟寮忋€佸厖鍊艰锟?| Console 鍏呭€奸〉闈㈠鐢ㄦ棦鏈夌粨锟?|
| `plus_vip_point_change` | 绉垎娴佹按 | 绉垎娑堣€楀拰璧犻€佺敱鏃㈡湁 VIP/璐︽埛閫昏緫澶勭悊 |
| `promotion_*` | 鍒稿畾涔夈€佸簱瀛樸€佸厬鎹㈢爜銆佺敤鎴峰埜銆佹牳閿€鍜屾祦锟?| Billing/redeem 鍔熻兘鍙皟鐢ㄦ爣锟?promotion 鑳藉姏 |
| `plus_api_key` | 淇濆瓨 `key_value` 鍔犲瘑鍊笺€乷wner銆佺姸鎬併€佽繃鏈熴€佹渶鍚庝娇鐢ㄦ椂锟?| P0 鍙鐢紱濡傛柊锟?`iam_gateway_api_key`锛屽繀椤诲０鏄庝竴瀵逛竴鎴栨墿灞曞叧锟?|
| `plus_channel*` | 瀛橀噺娓犻亾銆佹笭閬撹处鍙枫€佷唬鐞嗛厤缃紝閮ㄥ垎閰嶇疆浣跨敤 JSON | 浣滀负鍏煎杈撳叆锛涙柊鏁忔劅 Provider 璐﹀彿浼樺厛杩涘叆 `integration_*` L3 锟?|
| `legacy_model_info` | 妯″瀷鐩綍瀛楁杈冧赴瀵岋紝鍖呭惈鑳藉姏銆侀檺鍒躲€佷环锟?JSON銆佺粺璁″瓧锟?| 鍙綔涓烘ā鍨嬪鍏ユ潵婧愶紱缃戝叧鏍囧噯鐩綍锟?`ai_model` |
| `legacy_model_price` | 瀛橀噺浠锋牸浣跨敤 `Double` 瀛楁 | 涓嶄慨鏀癸紱鏂版爣鍑嗕环鏍艰〃 `ai_model_pricing` 蹇呴』浣跨敤 decimal |
| `plus_usage_record` | 瀛橀噺鐢ㄩ噺璁板綍鍖呭惈 token銆乧ount銆乨uration銆乧ost銆乧urrency銆乺equest/response time | 鍙吋瀹瑰鍏ワ紱缃戝叧璁¤垂浜嬪疄锟?`ai_usage` 涓哄噯 |

### 3.3 绂佹鍒涘缓鐨勬浛浠ｈ〃

鏈疆涓嶅緱鍒涘缓浠ヤ笅鏇夸唬琛紝鍗充娇杩欎簺鍚嶇О鐪嬭捣鏉ョ鍚堟爣鍑嗗墠缂€锟?
| 绂佹锟?| 鍘熷洜 |
| --- | --- |
| `iam_user`銆乣iam_user_address`銆乣iam_user_oauth_account` | 浼氱牬锟?`plus_user*` 浜嬪疄鏉ユ簮涓€鑷达拷?|
| `commerce_account`銆乣commerce_account_history` | 浼氬舰鎴愬弻璐︽埛銆佸弻娴佹按椋庨櫓 |
| `commerce_vip_user`銆乣commerce_vip_recharge`銆乣commerce_vip_point_change` | 浼氬舰鎴愬弻 VIP/绉垎浜嬪疄 |
| 锟?`promotion_` 鍛藉悕鐨勫崱鍒镐富锟?| 浼氬舰鎴愬弻鍒镐簨锟?|
| `commerce_order`銆乣commerce_payment`銆乣commerce_refund`銆乣commerce_invoice` | 浼氱粫寮€鏃㈡湁浜ゆ槗鏀粯閾捐矾 |
| 浠绘剰 `claw_*`銆乣router_*`銆乣sdkwork_*` 涓氬姟锟?| 杩濆弽 `DATABASE_SPEC.md` 鐨勪笟鍔″墠缂€瑕佹眰 |

鏈潵濡傛灉瑕佹妸 `plus_*` 鏀瑰悕涓烘爣鍑嗕笟鍔″墠缂€锛屽繀椤诲彟绔嬭縼绉婚」鐩紝鍏堝畬鎴愬吋瀹硅鍥俱€佸弻鍐欍€佸洖濉€佹牎楠屻€佽鍒囨崲銆佸啓鍒囨崲銆佹敹缂╁拰鍥炴粴/鍓嶆粴鏂规锟?
## 4. 鍏叡瀛楁妯℃澘

### 4.1 L2/L3 涓昏〃瀛楁锟?
| 瀛楁 | 閫昏緫绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `id` | int64 | 锟?| 鍐呴儴涓婚敭锛孉PI 搴忓垪鍖栦负 string |
| `uuid` | string(64) | 锟?| 澶栭儴绋冲畾 ID锛屽敮涓€ |
| `tenant_id` | int64 | 锟?| 绉熸埛 ID锛涘钩鍙板叡浜暟鎹彲锟?0锛屼絾蹇呴』鍦ㄥ绾︿腑澹版槑 |
| `organization_id` | int64 | 锟?| 缁勭粐 ID锛涙棤缁勭粐锟?0 |
| `user_id` | int64 | 鏉′欢 | 鐢ㄦ埛绉佹湁鎴栫敤鎴峰垱寤鸿祫婧愬繀锟?|
| `owner_type` | enum_int32 | 鏉′欢 | owner 妯″瀷锛屾敮锟?user銆乷rganization銆乼enant銆乻ystem銆乸roject 锟?|
| `owner_id` | int64 | 鏉′欢 | owner ID |
| `data_scope` | enum_int32 | 锟?| private銆乷rganization銆乼enant銆乸ublic |
| `status` | enum_int32 | 锟?| 鐘舵€佹満鐢辫〃濂戠害瀹氫箟 |
| `created_at` | instant | 锟?| UTC 鍒涘缓鏃堕棿 |
| `updated_at` | instant | 锟?| UTC 鏇存柊鏃堕棿 |
| `version` | int64 | 锟?| 涔愯閿侊紝鍒濆 0 |
| `created_by` | int64 | 寤鸿 | 鍒涘缓锟?|
| `updated_by` | int64 | 寤鸿 | 鏇存柊锟?|
| `deleted_at` | instant | 鍙拷?| 杞垹闄ゆ椂锟?|
| `deleted_by` | int64 | 鍙拷?| 鍒犻櫎锟?|
| `archived_at` | instant | 鍙拷?| 褰掓。鏃堕棿 |
| `retention_until` | instant | L3 寤鸿 | 鐣欏瓨鎴鏃堕棿 |
| `request_id` | string(128) | 鏉′欢 | 璇锋眰閾捐矾 ID |
| `metadata` | json | 鍙拷?| 浠呮斁鎵╁睍瀛楁锛屼笉鏀炬牳蹇冩煡璇㈠瓧锟?|

### 4.2 浜嬩欢/浜嬪疄琛ㄥ瓧娈电粍

| 瀛楁 | 閫昏緫绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `id` | int64 | 锟?| 鍐呴儴涓婚敭 |
| `uuid` | string(64) | 锟?| 浜嬩欢/浜嬪疄澶栭儴 ID |
| `tenant_id` | int64 | 锟?| 绉熸埛 |
| `organization_id` | int64 | 锟?| 缁勭粐 |
| `user_id` | int64 | 鏉′欢 | 鐢ㄦ埛 |
| `request_id` | string(128) | 锟?| 璇锋眰 ID |
| `trace_id` | string(128) | 寤鸿 | 鍒嗗竷锟?trace |
| `span_id` | string(128) | 鍙拷?| 鍒嗗竷锟?span |
| `idempotency_key` | string(128) | 鏉′欢 | 骞傜瓑锟?|
| `external_event_id` | string(128) | 鏉′欢 | 绗笁鏂逛簨锟?ID |
| `payload_hash` | string(128) | L3 蹇呭～ | payload 鎽樿 |
| `status` | enum_int32 | 锟?| 澶勭悊鐘讹拷?|
| `created_at` | instant | 锟?| 璁板綍鍒涘缓鏃堕棿 |
| `occurred_at` | instant | 鏉′欢 | 涓氬姟鍙戠敓鏃堕棿 |
| `retention_until` | instant | L3 寤鸿 | 鐣欏瓨鎴 |
| `legal_hold` | bool | L3 寤鸿 | 娉曞姟鍐荤粨 |

## 5. 鍓嶇紑娉ㄥ唽锟?
| 鍓嶇紑 | bounded context | owner | 鍚堣绾у埆 | 鍙缓琛ㄨ寖锟?|
| --- | --- | --- | --- | --- |
| `iam_` | identity-access | 韬唤涓庤闂洟锟?| L2/L3 | API Key 鎵╁睍銆佽闂瓥鐣ャ€侀闄╃瓥鐣ワ紱涓嶆浛锟?`plus_user` |
| `integration_` | provider-integration | Provider 闆嗘垚鍥㈤槦 | L2/L3 | Provider銆佹笭閬撱€佷笂娓歌处鍙枫€佷唬鐞嗐€佸仴搴峰揩锟?|
| `ai_` | ai-routing-metering | AI 缃戝叧鍥㈤槦 | L2/L3 | 妯″瀷鐩綍銆佹ā鍨嬩环鏍笺€佽矾鐢辩瓥鐣ャ€佸喅绛栨棩蹇椼€佽锟?trace銆佺敤閲忎簨锟?|
| `commerce_` | router-commerce-projection | 浜ゆ槗璐︽埛鍥㈤槦 | L3 | 鐢ㄩ噺缁撶畻鎶曞奖銆佽处鍗曞鍑恒€佷环鏍艰鍒掓槧灏勶紱涓嶆浛浠ｈ处锟?璁㈠崟/鏀粯 |
| `studio_` | portal-studio-assets | 浜у搧鐢熸€佸洟锟?| L2 | 搴旂敤涓績銆佹妧鑳戒腑蹇冦€佽璁℃椂璧勪骇 |
| `content_` | portal-content | 鍐呭杩愯惀鍥㈤槦 | L2 | 鍏憡銆佽鍧涖€佽绋嬨€佽瘎锟?|
| `ops_` | operations-observability | 骞冲彴杩愮淮鍥㈤槦 | L2/L3 | 瀹¤銆佷簨浠躲€侀厤缃揩鐓с€佷换鍔°€佸憡璀︺€佸疄渚嬪績锟?|

## 6. IAM 鏍稿績濂戠害

### 6.1 `ai_channel_group`

鐢ㄩ€旓細API Key 鍒嗙粍銆侀」鐩寲绠＄悊銆侀粯璁ょ瓥鐣ョ粦瀹氥€傝琛ㄤ笉淇濆瓨 Key锟?
浜у搧绾︽潫锛氬垱锟?API Key 鏃堕€夋嫨鐨勬槸璇ヨ〃涓殑鍒嗙粍銆傚垎缁勮礋璐ｅ钩鍙般€佽璐圭被鍨嬨€侀粯璁よ闂瓥鐣ャ€侀粯璁ら厤棰濈瓥鐣ャ€佸閲忓拰榛樿瀹氫环鏂规锛涘畾浠风粏鑺傜敱 `ai_pricing_plan`銆乣ai_pricing_rule`銆乣ai_pricing_tier` 鎵挎媴锛屼笉鑳藉啀鍙﹀缓鈥滀环鏍煎垎缁勨€濇浛浠ｄ笟鍔″垎缁勶拷?
| 灞烇拷?| 锟?|
| --- | --- |
| profile | tenant_entity |
| compliance_level | L2 |
| system_of_record | true |
| write_owner | claw-router-control |

涓氬姟瀛楁锟?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `name` | string(128) | 锟?| 鍒嗙粍鍚嶇О |
| `code` | string(64) | 锟?| 绉熸埛鍐呭彲璇荤紪锟?|
| `description` | string(512) | 锟?| 璇存槑 |
| `provider_code` | string(64) | 锟?| 榛樿 Provider/骞冲彴锛屾敮锟?Admin Group 锟?platform 灞曠ず |
| `group_type` | enum_int32 | 锟?| public銆乨edicated銆乮nternal 绛夊垎缁勭被锟?|
| `default_policy_id` | int64 | 锟?| 榛樿璁块棶绛栫暐 |
| `default_quota_policy_id` | int64 | 锟?| 榛樿閰嶉绛栫暐 |
| `environment` | enum_int32 | 锟?| prod銆乻taging銆乨ev銆乻andbox |
| `pricing_plan_id` | int64 | 锟?| 榛樿缁戝畾锟?`ai_pricing_plan.id` |
| `pricing_plan_code` | string(64) | 锟?| 瀹氫环鏂规缂栫爜蹇収 |
| `rate_multiplier` | decimal_string | 锟?| 璁¤垂鍊嶇巼 |
| `price_reference_mode` | enum_int32 | 锟?| official_reference銆乽pstream_cost銆乧ustom 绛変环鏍煎弬鑰冩ā锟?|
| `official_price_multiplier` | decimal_string | 锟?| 浠ュ畼鏂瑰弬鑰冧环涓哄熀鍑嗙殑鍊嶇巼锛屾湭鍗曠嫭璁剧疆鏃跺彲绛変簬 `rate_multiplier` |
| `billing_type` | enum_int32 | 锟?| balance銆乸ostpaid銆乫ree銆乧ustom |
| `capacity_limit` | int64 | 锟?| 鍒嗙粍瀹归噺涓婇檺 |
| `allowed_origin` | json | 锟?| Web 鏉ユ簮鐧藉悕鍗曪紝鏍稿績鏉冮檺浠嶅湪 policy 锟?|

绾︽潫鍜岀储寮曪細

| 鍚嶇О | 绫诲瀷 | 瀛楁 |
| --- | --- | --- |
| `uk_ai_channel_group_uuid` | unique | `uuid` |
| `uk_ai_channel_group_tenant_code` | unique | `tenant_id, organization_id, code` |
| `idx_ai_channel_group_provider_status` | index | `tenant_id, organization_id, provider_code, status, updated_at, id` |
| `idx_ai_channel_group_tenant_status_updated` | index | `tenant_id, organization_id, status, updated_at, id` |
| `idx_ai_channel_group_pricing` | index | `tenant_id, organization_id, pricing_plan_id, status, updated_at, id` |

#### 6.1.1 `ai_channel_group_metric_snapshot`

鐢ㄩ€旓細Key 鍒嗙粍瀹归噺鍜屼娇鐢ㄩ噺鐨勯珮棰戝垪琛ㄦ姇褰憋紝鏈嶅姟 `/admin/group` 锟?`/console/api-keys`銆傚畠鍙互锟?Key銆丳rovider account銆乽sage fact 閲嶅缓锛屼笉浣滀负璐﹀姟浜嬪疄锟?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `group_id` | int64 | 锟?| 鍒嗙粍 ID |
| `group_code` | string(64) | 锟?| 鍒嗙粍缂栫爜蹇収 |
| `provider_code` | string(64) | 锟?| 骞冲彴/Provider |
| `account_available_count` | int64 | 锟?| 鍙敤璐﹀彿锟?|
| `account_total_count` | int64 | 锟?| 鎬昏处鍙锋暟 |
| `capacity_used` | decimal_string | 锟?| 宸茬敤瀹归噺 |
| `capacity_limit` | decimal_string | 锟?| 瀹归噺涓婇檺 |
| `request_count_today` | int64 | 锟?| 浠婃棩璇锋眰锟?|
| `request_count_total` | int64 | 锟?| 绱璇锋眰锟?|
| `usage_amount_today` | decimal_string | 锟?| 浠婃棩鐢ㄩ噺鎴栭噾锟?|
| `usage_amount_total` | decimal_string | 锟?| 绱鐢ㄩ噺鎴栭噾锟?|
| `health_status` | enum_int32 | 锟?| normal銆亀arning銆乪rror |
| `snapshot_at` | instant | 锟?| 蹇収鏃堕棿 |

### 6.2 `iam_gateway_api_key`

鐢ㄩ€旓細缃戝叧 API Key 鐨勬爣锟?L3 绱㈠紩/鎵╁睍琛ㄣ€傝嫢 P0 澶嶇敤 `plus_api_key`锛岃琛ㄥ彲浠ユ殏缂擄紱鑻ュ垱寤猴紝璇ヨ〃涓嶅緱鏇夸唬鐢ㄦ埛銆佽处鎴枫€佷綑棰濇垨璁㈠崟浜嬪疄锟?
| 灞烇拷?| 锟?|
| --- | --- |
| profile | user_entity + credential_index |
| compliance_level | L3 |
| system_of_record | 鏉′欢 true锛涜嫢澶嶇敤 `plus_api_key` 鍒欎负 extension/projection |
| write_owner | api-key-service |

涓氬姟瀛楁锟?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `legacy_api_key_id` | int64 | 鏉′欢 | 瀵瑰簲 `plus_api_key.id`锛涘鐢ㄥ瓨閲忔椂蹇呭～ |
| `group_id` | int64 | 锟?| API Key 鍒嗙粍 |
| `name` | string(128) | 锟?| Key 鍚嶇О |
| `key_prefix` | string(32) | 锟?| 灞曠ず鍜屽揩閫熷畾浣嶅墠缂€锛屼緥锟?`sk-...` 鍓嶅嚑锟?|
| `key_display_masked` | string(64) | 锟?| Console/API 杩斿洖鐨勮劚鏁忓睍绀哄€硷紝渚嬪 `sk-prod-abc****xyz` |
| `key_hash` | string(128) | 锟?| HMAC-SHA256 鎽樿锛屼笉鍙拷?|
| `hash_alg` | string(32) | 锟?| 绠楁硶鐗堟湰锛屼緥锟?`hmac-sha256-v1` |
| `secret_version` | int64 | 锟?| 瀵嗛挜杞崲鐗堟湰锛屽垱寤轰负 1锛岃疆鎹㈤€掑 |
| `policy_id` | int64 | 锟?| 璁块棶绛栫暐 |
| `quota_policy_id` | int64 | 锟?| 閰嶉绛栫暐 |
| `rate_limit_policy_id` | int64 | 锟?| 闄愭祦绛栫暐 |
| `environment` | enum_int32 | 锟?| prod銆乻taging銆乨ev銆乻andbox |
| `expire_at` | instant | 锟?| 杩囨湡鏃堕棿 |
| `last_used_at` | instant | 锟?| 鏈€杩戜娇鐢ㄦ椂锟?|
| `last_used_ip_hash` | string(128) | 锟?| 鏈€锟?IP 鎽樿 |
| `last_used_ip_masked` | string(64) | 锟?| 鏈€锟?IP 鑴辨晱灞曠ず锛屼笉淇濆瓨瀹屾暣鏄庢枃 IP |
| `last_used_ip_region` | string(128) | 锟?| 鏈€锟?IP 瑙ｆ瀽鍖哄煙 |
| `last_revealed_at` | instant | 锟?| 鍒涘缓鍝嶅簲涓€娆℃€ц繑鍥炴槑鏂囩殑鏃堕棿 |
| `rotated_from_key_id` | int64 | 锟?| 杞崲鏉ユ簮 Key ID |
| `revoked_at` | instant | 锟?| 鍚婇攢鏃堕棿 |
| `revoked_by` | int64 | 锟?| 鍚婇攢锟?|
| `risk_level` | enum_int32 | 锟?| 椋庨櫓绛夌骇 |

绾︽潫鍜岀储寮曪細

| 鍚嶇О | 绫诲瀷 | 瀛楁 |
| --- | --- | --- |
| `uk_iam_gateway_api_key_uuid` | unique | `uuid` |
| `uk_iam_gateway_api_key_hash` | unique | `key_hash` |
| `uk_iam_gateway_api_key_legacy` | unique | `legacy_api_key_id`锛屼粎澶嶇敤 `plus_api_key` 鏃跺惎锟?|
| `idx_iam_gateway_api_key_tenant_user_status` | index | `tenant_id, organization_id, user_id, status, updated_at, id` |
| `idx_ai_channel_group_status` | index | `tenant_id, organization_id, group_id, status` |

瀹夊叏瑕佹眰锟?
- API Key 鏄庢枃鍙湪鍒涘缓鍝嶅簲涓繑鍥炰竴娆★紝绂佹钀藉簱锟?- 璁よ瘉鐑矾寰勬寜 `key_hash` 鏌ユ壘鎴栭€氳繃缂撳瓨鏌ユ壘锟?- `key_prefix` 鍙兘鐢ㄤ簬灞曠ず鍜屾帓闅滐紝涓嶅彲浣滀负璁よ瘉鍑嵁锟?- `last_used_ip_hash` 浣跨敤锟?pepper 锟?hash锛宲epper 涓嶅叆搴擄拷?- `key_display_masked` 鍙兘鐢卞垱寤烘垨杞崲鏃剁敓鎴愮殑鑴辨晱鍊煎啓鍏ワ紝涓嶅厑璁搁€氳繃鎴柇鏄庢枃鍥炶鐢熸垚锟?
### 6.3 `iam_gateway_access_policy`

鐢ㄩ€旓細API Key銆佸垎缁勩€佺鎴锋垨缁勭粐鐨勮闂竟鐣岋拷?
| 灞烇拷?| 锟?|
| --- | --- |
| profile | tenant_entity |
| compliance_level | L3 |
| system_of_record | true |
| write_owner | access-policy-service |

涓氬姟瀛楁锟?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `name` | string(128) | 锟?| 绛栫暐鍚嶇О |
| `policy_type` | enum_int32 | 锟?| api_key銆乬roup銆乼enant銆乷rganization |
| `subject_type` | enum_int32 | 锟?| 缁戝畾涓讳綋绫诲瀷 |
| `subject_id` | int64 | 锟?| 缁戝畾涓讳綋 ID |
| `subject_ref_hash` | string(128) | 锟?| IP銆佸锟?Key銆佸尶鍚嶄富浣撶瓑锟?int64 涓讳綋锟?hash |
| `subject_ref_masked` | string(128) | 锟?| 锟?int64 涓讳綋鐨勮劚鏁忓睍锟?|
| `allowed_capabilities` | json | 锟?| 鍏佽鑳藉姏锛屽 chat銆乺esponses銆乪mbedding銆乮mage銆乤udio銆乿ideo |
| `denied_capabilities` | json | 锟?| 绂佹鑳藉姏 |
| `allowed_models` | json | 锟?| 妯″瀷鐧藉悕锟?|
| `denied_models` | json | 锟?| 妯″瀷榛戝悕锟?|
| `network_policy_mode` | enum_int32 | 锟?| none銆乤llowlist銆乨enylist銆乵ixed |
| `ip_rule_count` | int32 | 锟?| Console/API Key 椤甸潰灞曠ず锟?IP 瑙勫垯鏁伴噺 |
| `ip_allowlist` | json | 锟?| IP 鐧藉悕锟?|
| `ip_denylist` | json | 锟?| IP 榛戝悕锟?|
| `region_allowlist` | json | 锟?| 鍖哄煙鐧藉悕锟?|
| `max_context_tokens` | int64 | 锟?| 鏈€澶т笂涓嬫枃 |
| `data_retention_mode` | enum_int32 | 锟?| none銆乻tandard銆乪nterprise銆乧ustom |
| `effective_from` | instant | 锟?| 鐢熸晥鏃堕棿 |
| `effective_to` | instant | 锟?| 澶辨晥鏃堕棿 |

绱㈠紩锟?
- `uk_iam_gateway_access_policy_uuid`
- `idx_iam_gateway_access_policy_tenant_subject_status`
- `idx_iam_gateway_access_policy_subject_ref`
- `idx_iam_gateway_access_policy_tenant_type_updated`

### 6.3.1 `iam_gateway_risk_rule`

鐢ㄩ€旓細鎵胯浇 Admin RateLimit 锟?IP銆乀oken銆丮odel銆丗irewall 瑙勫垯锛屼互鍙婄綉鍏宠繍琛屾湡鍙懡涓殑缃戠粶瀹夊叏瑙勫垯銆傝琛ㄦ槸 L3 瀹夊叏閰嶇疆琛紝涓嶄繚瀛樺畬锟?IP 鏄庢枃锛涢渶瑕佸墠缂€锟?CIDR 鍖归厤鏃讹紝閫氳繃瀹夊叏鏈嶅姟瑙ｆ瀽 `target_value_cipher_ref`锟?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `rule_name` | string(128) | 锟?| 瑙勫垯鍚嶇О |
| `rule_category` | enum_int32 | 锟?| ip_limit銆乼oken_limit銆乵odel_limit銆乫irewall銆乺isk_control |
| `rule_type` | enum_int32 | 锟?| allow銆乨eny銆乴imit銆乧hallenge銆乷bserve |
| `scope_type` | enum_int32 | 锟?| tenant銆乷rganization銆乬roup銆乤pi_key銆乽ser銆乵odel |
| `scope_id` | int64 | 锟?| 浣滅敤锟?ID |
| `target_type` | enum_int32 | 锟?| ip銆乧idr銆乤pi_key銆乵odel銆乧ountry銆乤sn銆乽ser_agent |
| `target_value_hash` | string(128) | 锟?| 鍛戒腑瀵硅薄 hash |
| `target_value_masked` | string(128) | 锟?| 鍚庡彴鍒楄〃鑴辨晱灞曠ず锟?|
| `target_value_cipher_ref` | string(256) | 锟?| 闇€瑕佸尮閰嶅師鍊兼椂鐨勫瘑鏂囧紩锟?|
| `match_mode` | enum_int32 | 锟?| exact銆乸refix銆乧idr銆乺egex銆乧ontains |
| `requests_per_second` | int64 | 锟?| RPS 闄愬埗 |
| `requests_per_minute` | int64 | 锟?| RPM 闄愬埗 |
| `requests_per_day` | int64 | 锟?| RPD 闄愬埗 |
| `tokens_per_minute` | int64 | 锟?| TPM 闄愬埗 |
| `burst_limit` | decimal_string | 锟?| 绐佸彂棰濆害 |
| `block_duration_seconds` | int64 | 锟?| 闃绘柇鏃堕暱 |
| `priority` | int32 | 锟?| 鍚屼竴浣滅敤鍩熻鍒欎紭鍏堢骇 |
| `hit_count` | int64 | 锟?| 鍛戒腑娆℃暟鎶曞奖 |
| `last_hit_at` | instant | 锟?| 鏈€杩戝懡涓椂锟?|

绱㈠紩锟?
- `uk_iam_gateway_risk_rule_tenant_target(tenant_id, organization_id, rule_type, target_type, target_value)`
- `idx_iam_gateway_risk_rule_scope_priority(tenant_id, organization_id, rule_category, scope_type, scope_id, priority, status)`
- `idx_iam_gateway_risk_rule_target_hash(tenant_id, organization_id, target_type, target_value_hash, status)`

### 6.4 `iam_user_preference` / `iam_user_security_setting` / `iam_user_login_event`

鐢ㄩ€旓細鎵胯浇 Console Settings銆丆onsole User銆丆onsole Account 鐨勭敤鎴峰亸濂姐€佸畨鍏ㄧ姸鎬佸拰鐧诲綍鏄庣粏銆傜敤鎴蜂富妗ｃ€佹墜鏈哄彿銆侀偖绠便€丱Auth 缁戝畾浠嶄互 `plus_user`銆乣plus_oauth_account` 涓轰簨瀹炴潵婧愶拷?
| 锟?| 鐢诲儚 | 鍏抽敭瀛楁 | 璇存槑 |
| --- | --- | --- | --- |
| `iam_user_preference` | user_entity | `language`銆乣timezone`銆乣theme_mode`銆乣notification_preferences`銆乣default_console_path` | 鐢ㄦ埛鍋忓ソ鍜岄€氱煡寮€锟?|
| `iam_user_security_setting` | user_entity, L3 | `mfa_enabled`銆乣mfa_method`銆乣password_last_changed_at`銆乣trusted_device_count`銆乣last_login_at`銆乣last_login_ip_hash`銆乣third_party_bound_snapshot` | 瀹夊叏鐘舵€佹姇褰憋紝涓嶄繚瀛樺瘑鐮佹槑锟?|
| `iam_user_login_event` | event_log, L3 | `auth_method`銆乣auth_provider`銆乣login_result`銆乣risk_level`銆乣client_ip_hash`銆乣client_ip_masked`銆乣client_ip_region`銆乣device_label`銆乣mfa_verified`銆乣session_id_hash`銆乣occurred_at` | 鐧诲綍浜嬩欢浜嬪疄锛屽拰 `ops_audit_log` 鐨勫悗鍙版搷浣滃璁″垎锟?|

瀹夊叏瑕佹眰锟?
- 鐧诲綍浜嬩欢锟?`occurred_at` 鍒嗗尯锛屽湪绾夸繚锟?180 澶╋紝褰掓。淇濈暀 3 骞达拷?- IP銆佽澶囨寚绾广€乻ession ID 鍙繚锟?hash 鎴栬劚鏁忔爣绛撅拷?- OAuth refresh token銆丮FA secret 涓嶈繘鍏ヨ繖浜涜〃锛屽彧淇濆瓨瀹夊叏鏈嶅姟鎴栧瘑閽ユ墭绠＄郴缁熶腑鐨勫紩鐢ㄧ姸鎬侊拷?
### 6.5 缁熶竴鏁版嵁棰嗗煙鍚嶇О锛歚ModelVendor`

`ModelVendor` 鏄ā鍨嬪巶锟?妯″瀷鍘熷巶鐨勭粺涓€棰嗗煙鍚嶇О锛岃〃绀烘ā鍨嬬殑鍘熷鐮斿彂銆佸彂甯冩垨缁存姢鏂广€傚畠瑙ｅ喅鍓嶇銆丣ava銆丷ust銆乀ypeScript銆丱penAPI 鍜屾暟鎹簱涔嬮棿瀵光€滃巶瀹躲€佷緵搴斿晢銆佹笭閬撱€佸钩鍙扳€濇贩鐢ㄧ殑闂锟?
鏍囧噯鑱岃矗杈圭晫锟?
| 鍚嶇О | 浜嬪疄鏉ユ簮 | 鍚箟 | 绀轰緥 |
| --- | --- | --- | --- |
| `ModelVendor` | `ai_model_vendor.vendor_code` | 妯″瀷鍘熷鍘傚/鍙戝竷锟?| `openai`銆乣anthropic`銆乣google`銆乣deepseek`銆乣alibaba`銆乣moonshot` |
| `Provider` | `integration_provider.provider_code` | API 鎺ュ叆渚涘簲鍟嗐€佸崗璁€傞厤鏂规垨鑱氬悎缃戝叧 | `openai_api`銆乣azure_openai`銆乣openrouter`銆乣ollama`銆乣aws_bedrock` |
| `Channel` | `ai_channel.channel_code` | 绉熸埛/缁勭粐鍙矾鐢辩殑鍏蜂綋鎺ュ叆瀹炰緥 | 鏌愪釜 Azure region銆佹煇锟?OpenRouter 璐﹀彿銆佹煇涓湰锟?Ollama 鑺傜偣 |
| `AiModel` | `ai_model.model` | `/v1/*` 瀵瑰鏆撮湶鐨勬爣鍑嗘ā鍨嬪悕 | `gpt-4.1`銆乣claude-3-5-sonnet`銆乣deepseek-chat` |

璺ㄨ瑷€绫诲瀷瑙勫垯锟?
- 鏁版嵁搴撳瓨锟?`vendor_code` 绋冲畾瀛楃涓诧紝涓ョ淇濆瓨 enum ordinal锟?- Java 浣跨敤 `ModelVendor` 鏋氫妇锛屽缓璁父閲忓舰鎬佷负 `OPENAI`銆乣ANTHROPIC`銆乣ALIBABA_QWEN`锛屾瘡涓灇涓炬寔鏈夌ǔ锟?code锟?- Rust 浣跨敤 `enum ModelVendor`锛屽缓璁彉浣撳舰鎬佷负 `OpenAi`銆乣Anthropic`銆乣AlibabaQwen`锛屽簭鍒楀寲涓哄悓涓€濂楃ǔ锟?code锟?- TypeScript/OpenAPI 浣跨敤鐢熸垚锟?`ModelVendor` enum 鎴栧瓧绗︿覆瀛楅潰閲忚仈鍚堢被鍨嬶拷?- 鏈瘑鍒殑鏂板巶瀹跺繀椤讳繚鐣欏師锟?`vendor_code`锛孲DK 鍙槧灏勫埌 `UNKNOWN`锛屼笉寰楁嫆缁濊鍙栧巻鍙叉暟鎹拷?
## 7. Integration 鏍稿績濂戠害

### 7.1 `integration_provider`

鐢ㄩ€旓細API 鎺ュ叆渚涘簲鍟嗘敞鍐岃〃锛屼緥锟?OpenAI API銆丄zure OpenAI銆丄nthropic API銆丟emini API銆丱penRouter銆丱llama銆佹湰鍦版ā鍨嬬綉鍏崇瓑銆傝琛ㄤ笉浣滀负妯″瀷鍘傚浜嬪疄鏉ユ簮锛涙ā鍨嬪巶瀹剁粺涓€杩涘叆 `ai_model_vendor`锟?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `provider_code` | string(64) | 锟?| 鍏ㄥ眬鍞竴缂栫爜 |
| `display_name` | string(128) | 锟?| 灞曠ず鍚嶇О |
| `description` | string(512) | 锟?| Provider 璇存槑锛岀敤浜庢ā鍨嬮〉锟?Admin Model |
| `icon_media_resource_id` | string(128) | 锟?| Provider 鍥炬爣濯掍綋璧勬簮绋冲畾 ID |
| `icon_object_blob_id` | int64 | 锟?| Provider 鍥炬爣瀵硅薄瀛樺偍 Blob |
| `icon_resource_snapshot` | json | 锟?| Provider 鍥炬爣 `MediaResource` 蹇収 |
| `color_token` | string(64) | 锟?| 鍓嶇绋冲畾鑹诧拷?token锛屼笉锟?CSS class |
| `docs_url` | string(512) | 锟?| 瀹樻柟鏂囨。鍦板潃 |
| `website_url` | string(512) | 锟?| Provider 瀹樼綉 |
| `default_vendor_code` | string(64) | 锟?| 榛樿妯″瀷鍘傚缂栫爜锛涜仛锟?Provider 鍙负绌烘垨閫氳繃妯″瀷鏄犲皠纭畾 |
| `integration_type` | enum_int32 | 锟?| model_vendor_direct銆乧loud_platform銆乺elay_aggregator銆乻elf_hosted_gateway銆乴ocal_runtime銆乧ustom銆乽nknown |
| `protocol` | enum_int32 | 锟?| openai_compatible銆乤nthropic銆乬emini銆乤zure_openai銆乧ustom |
| `base_url` | string(512) | 锟?| 榛樿 base URL锛屼笉锟?secret |
| `auth_type` | enum_int32 | 锟?| api_key銆乷auth2銆乥earer銆乶one銆乧ustom |
| `capabilities` | json | 锟?| 鏀寔鑳藉姏闆嗗悎 |
| `metadata_schema_version` | string(32) | 锟?| metadata schema 鐗堟湰 |
| `sort_order` | int32 | 锟?| 闂ㄦ埛鍜屽悗鍙伴粯璁ゆ帓锟?|
| `metadata` | json | 锟?| 鎵╁睍鍏冩暟锟?|

绾︽潫锟?
- `uk_integration_provider_code(provider_code)`
- `idx_integration_provider_status_updated(status, updated_at, id)`

璇存槑锛歚provider_code` 瑙ｅ喅鈥滄€庝箞鎺ュ叆鈥濈殑闂锛宍vendor_code` 瑙ｅ喅鈥滄ā鍨嬫槸璋佸彂甯冪殑鈥濈殑闂銆侽penRouter銆丄zure銆丄WS Bedrock銆丟CP Vertex AI 杩欑被骞冲彴閫氬父锟?`Provider`锛屼笉锟?`ModelVendor`锛涘畠浠墭绠＄殑妯″瀷閫氳繃璧勬簮鐩綍銆乂endor 鍏崇郴鍜屾ā鍨嬫槧灏勮鍒欐爣鏄庡師鍘傦紝涓嶈兘鎶婅处鍙风洿鎺ョ粦瀹氬埌妯″瀷锟?
### 7.2 `ai_channel`

鐢ㄩ€旓細鍙璺敱绛栫暐閫夋嫨鐨勬笭閬撳疄渚嬨€傛笭閬撴槸绉熸埛/缁勭粐鍙锟?Provider 鎺ュ叆閰嶇疆锛屼笉淇濆瓨鍏蜂綋 secret锟?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `provider_id` | int64 | 锟?| `integration_provider.id` |
| `provider_code` | string(64) | 锟?| Provider code 蹇収 |
| `channel_code` | string(64) | 锟?| 绉熸埛鍐呭敮涓€娓犻亾缂栫爜 |
| `name` | string(128) | 锟?| 娓犻亾鍚嶇О |
| `protocol` | enum_int32 | 锟?| OpenAI銆丄nthropic銆丟emini銆丱llama銆丆ustom 绛夊崗锟?|
| `access_type` | enum_int32 | 锟?| api_key銆乷auth-gcp銆乤ws-bedrock銆乤zure-ad銆乧laude-code 绛夋帴鍏ョ被锟?|
| `base_url` | string(512) | 锟?| 娓犻亾锟?base URL锛屼笉淇濆瓨瀵嗛挜 |
| `model_mode` | enum_int32 | 锟?| whitelist銆乵apping銆乸ass_through銆乵ixed |
| `environment` | enum_int32 | 锟?| prod銆乻taging銆乨ev |
| `region` | string(64) | 锟?| 鍖哄煙 |
| `capabilities` | json | 锟?| text銆乮mage銆乤udio銆乿ideo銆乵usic 绛夎兘鍔涘揩锟?|
| `priority` | int32 | 锟?| 榛樿浼樺厛锟?|
| `weight` | int32 | 锟?| 榛樿鏉冮噸 |
| `account_id` | int64 | 锟?| 榛樿 Provider 璐﹀彿 |
| `proxy_id` | int64 | 锟?| 榛樿浠ｇ悊 |
| `rpm_limit` | int64 | 锟?| 娓犻亾绾ф瘡鍒嗛挓璇锋眰涓婇檺 |
| `timeout_ms` | int32 | 锟?| 璇锋眰瓒呮椂 |
| `retry_policy` | json | 锟?| 閲嶈瘯绛栫暐 |
| `circuit_breaker_policy` | json | 锟?| 鐔旀柇绛栫暐 |
| `health_status` | enum_int32 | 锟?| 鏈€杩戝仴搴风姸鎬佸揩锟?|
| `last_latency_ms` | int32 | 锟?| 鏈€杩戝欢杩熷揩锟?|
| `consecutive_error_count` | int64 | 锟?| 杩炵画閿欒娆℃暟 |

绾︽潫鍜岀储寮曪細

- `uk_ai_channel_uuid(uuid)`
- `uk_ai_channel_tenant_code(tenant_id, organization_id, channel_code)`
- `idx_ai_channel_tenant_provider_status(tenant_id, organization_id, provider_code, status)`

### 7.3 `integration_provider_account`

鐢ㄩ€旓細涓婃父 Provider 璐﹀彿鍜屽瘑閽ュ紩鐢紝L3 楂樻晱琛ㄣ€傚畠鏇夸唬鍦ㄦ笭锟?JSON 涓洿鎺ヤ繚瀛樺瘑閽ョ殑鍋氭硶锟?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `provider_id` | int64 | 锟?| Provider ID |
| `provider_code` | string(64) | 锟?| Provider code 蹇収 |
| `account_code` | string(64) | 锟?| 绉熸埛鍐呰处鍙风紪锟?|
| `account_name` | string(128) | 锟?| 璐﹀彿鏄剧ず锟?|
| `auth_type` | enum_int32 | 锟?| api_key銆乷auth2銆乥earer銆乧ustom |
| `credential_profile` | enum_int32 | 锟?| standard_api_key銆乬cp_service_account銆乤ws_sigv4銆乤zure_ad銆乻etup_token |
| `external_account_id` | string(128) | 锟?| 涓婃父璐﹀彿銆侀」鐩垨璁㈤槄 ID |
| `auth_config` | json | 锟?| 闈炲瘑閽ヨ璇侀厤缃紝锟?Azure deployment銆丟CP project/location |
| `secret_ref` | string(256) | 锟?| Vault/Keychain/KMS 寮曠敤 |
| `secret_hash` | string(128) | 锟?| 瀵嗛挜鎽樿锛岀敤浜庡幓閲嶅拰杞崲鏍￠獙 |
| `secret_version` | int64 | 锟?| 褰撳墠瀵嗛挜鐗堟湰 |
| `secret_rotation_policy` | json | 锟?| 杞崲鍛ㄦ湡銆佸鎵广€佺伆搴︾瓥锟?|
| `masked_label` | string(128) | 锟?| 鑴辨晱灞曠ず鏍囩 |
| `quota_unit` | enum_int32 | 锟?| 涓婃父棰濆害鍗曚綅 |
| `quota_limit` | decimal_string | 锟?| 涓婃父棰濆害涓婇檺锛孉PI 瀛楃锟?|
| `quota_used` | decimal_string | 锟?| 涓婃父棰濆害浣跨敤蹇収锛屼笉浣滀负璐﹀姟浜嬪疄 |
| `upstream_balance_amount` | decimal_string | 锟?| 涓婃父璐﹀彿浣欓蹇収锛屼笉浣滀负鏈郴缁熻祫閲戜簨锟?|
| `upstream_balance_currency` | string(10) | 锟?| 涓婃父浣欓甯佺 |
| `last_balance_checked_at` | instant | 锟?| 鏈€杩戜綑棰濆悓姝ユ椂锟?|
| `last_rotated_at` | instant | 锟?| 鏈€杩戣疆锟?|
| `next_rotate_at` | instant | 锟?| 寤鸿涓嬫杞崲 |
| `last_verified_at` | instant | 锟?| 鏈€杩戞牎锟?|
| `last_used_at` | instant | 锟?| 鏈€杩戣娓犻亾璋冪敤鏃堕棿 |
| `consecutive_error_count` | int64 | 锟?| 杩炵画楠岃瘉鎴栬皟鐢ㄩ敊璇锟?|
| `risk_level` | enum_int32 | 锟?| 椋庨櫓绛夌骇 |

绾︽潫鍜岀储寮曪細

- `uk_integration_provider_account_uuid(uuid)`
- `uk_integration_provider_account_tenant_code(tenant_id, organization_id, provider_code, account_code)`
- `uk_integration_provider_account_secret_hash(tenant_id, organization_id, provider_code, secret_hash)`
- `idx_integration_provider_account_tenant_provider_status(tenant_id, organization_id, provider_code, status)`
- `idx_integration_provider_account_rotation(tenant_id, organization_id, next_rotate_at, status)`

瀹夊叏瑕佹眰锟?
- 涓嶄繚锟?API key銆丱Auth refresh token銆佺閽ユ槑鏂囷拷?- `secret_ref` 瀵圭敤鎴烽潰 API 涓嶈繑鍥烇紱鍚庡彴榛樿涔熷彧杩斿洖鑴辨晱璺緞锟?- 杞崲鎿嶄綔蹇呴』锟?`ops_audit_log`锟?
### 7.4 `ai_channel_credential`

鐢ㄩ€旓細娓犻亾鍙敤鐨勮璇佸叆鍙ｏ紝淇濆瓨 base URL銆佽璇佹柟寮忛厤缃拰 secret 寮曠敤銆傚畠鏄矾鐢辩儹璺緞璇诲彇涓婃父璁よ瘉淇℃伅鐨勪簨瀹炴潵婧愶紝涓嶆壙杞芥ā鍨嬬櫧鍚嶅崟锟?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `channel_id` | int64 | 锟?| 娓犻亾 |
| `provider_code` | string(64) | 锟?| Provider code 蹇収 |
| `channel_code` | string(64) | 锟?| 娓犻亾缂栫爜蹇収 |
| `credential_name` | string(128) | 锟?| 鍑瘉鏄剧ず锟?|
| `base_url` | string(512) | 锟?| 涓婃父 base URL |
| `auth_config` | json | 锟?| API Key銆丱Auth銆佷簯璐﹀彿绛夐潪鏄庢枃璁よ瘉閰嶇疆 |
| `credential_ref` | string(256) | 锟?| Vault/Keychain/KMS 寮曠敤 |
| `credential_hash` | string(128) | 锟?| 鍑瘉鎽樿锛岀敤浜庡幓閲嶅拰杞崲鏍￠獙 |
| `masked_label` | string(128) | 锟?| 鑴辨晱灞曠ず鏍囩 |
| `priority` | int32 | 锟?| 鍑瘉绾т紭鍏堢骇 |
| `weight` | int32 | 锟?| 鍑瘉绾ф潈锟?|
| `health_status` | enum_int32 | 锟?| 鏈€杩戝仴搴风姸锟?|
| `last_latency_ms` | int32 | 锟?| 鏈€杩戝欢锟?|
| `consecutive_error_count` | int64 | 锟?| 杩炵画閿欒娆℃暟 |
| `last_verified_at` | instant | 锟?| 鏈€杩戦獙璇佹椂锟?|
| `last_used_at` | instant | 锟?| 鏈€杩戜娇鐢ㄦ椂锟?|

绾︽潫锟?
- `uk_ai_channel_credential_uuid(uuid)`
- `idx_ai_channel_credential_channel(tenant_id, organization_id, channel_id, status, priority, weight, id)`
- `idx_ai_channel_credential_ref(tenant_id, organization_id, credential_ref)`

### 7.5 `ai_channel_resource`

鐢ㄩ€旓細娓犻亾鏀寔鍝簺璧勬簮銆佽祫婧愬垎缁勫拰鑳藉姏鑼冨洿銆傝矾鐢辨寜 API 璺緞銆佹ā鍨嬪弬鏁般€佽祫婧愬垎缁勫拰 Vendor 鑳藉姏绛涢€夎处鍙锋椂璇诲彇璇ヨ〃锛涜处鍙蜂笉鐩存帴缁戝畾妯″瀷锟?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `channel_id` | int64 | 锟?| 娓犻亾 |
| `provider_code` | string(64) | 锟?| Provider code 蹇収 |
| `channel_code` | string(64) | 锟?| 娓犻亾缂栫爜蹇収 |
| `resource_id` | int64 | 锟?| `ai_resource.id` |
| `resource_code` | string(192) | 锟?| 璧勬簮缂栫爜锛屽妯″瀷銆丄PI銆佸浘鐗囥€佽棰戙€侀煶棰戙€侀煶涔愩€侀煶鏁堣祫锟?|
| `resource_group_id` | int64 | 锟?| `ai_resource_group.id` |
| `resource_group_code` | string(128) | 锟?| 璧勬簮鍒嗙粍缂栫爜锛屽 OpenAI Chat API銆並ling 瑙嗛 API |
| `grant_type` | string(32) | 锟?| allow/deny |
| `priority` | int32 | 锟?| 璧勬簮鎺堟潈浼樺厛锟?|
| `weight` | int32 | 锟?| 璧勬簮鎺堟潈鏉冮噸 |
| `effective_from` | instant | 锟?| 鐢熸晥鏃堕棿 |
| `effective_to` | instant | 锟?| 澶辨晥鏃堕棿 |

绾︽潫锟?
- `uk_ai_channel_resource_uuid(uuid)`
- `uk_ai_channel_resource(tenant_id, organization_id, channel_id, resource_code, resource_group_code)`
- `idx_ai_channel_resource_lookup(tenant_id, organization_id, status, channel_id, grant_type, priority, id)`

### 7.6 `ai_model_mapping_rule*`

鐢ㄩ€旓細妯″瀷鏄犲皠瑙勫垯鍒嗕负鍏ㄥ眬銆乂endor銆佽处锟?娓犻亾鑷畾涔変笁灞傦紝瑙ｅ喅璇锋眰妯″瀷鍚嶅埌涓婃父鐩爣妯″瀷鍚嶇殑杞崲銆備紭鍏堢骇浠庨珮鍒颁綆涓鸿嚜瀹氫箟缁戝畾銆乂endor 缁戝畾銆佸叏灞€缁戝畾锛涙病鏈夊懡涓椂浣跨敤璧勬簮鐩綍涓殑鍘熺敓妯″瀷鍚嶏拷?
- `ai_model_mapping_rule` 淇濆瓨瑙勫垯澶达紝鍖呮嫭 source/target vendor銆佸尮閰嶆柟寮忋€佹槧灏勬ā寮忓拰鍚敤鐘舵€侊拷?- `ai_model_mapping_rule_item` 淇濆瓨婧愭ā鍨嬨€佺洰鏍囨ā鍨嬨€佺洰锟?catalog key銆佺洰锟?provider native model 绛夊叿浣撴槧灏勯」锟?- `ai_model_mapping_rule_binding` 淇濆瓨瑙勫垯缁戝畾鑼冨洿锛屽寘锟?global銆乿endor銆乧hannel銆乧hannel_group銆乤ccount 绛夛紝鍚庡彴鑷畾涔夋槧灏勯€氳繃缁戝畾瑕嗙洊榛樿瑙勫垯锟?
### 7.7 `integration_proxy`

鐢ㄩ€旓細浠ｇ悊閰嶇疆銆備唬鐞嗗嚟璇佷笉鍏ュ簱锛屽彧淇濆瓨寮曠敤锟?
鍏抽敭瀛楁锛歚proxy_code`銆乣proxy_type`銆乣endpoint`銆乣secret_ref`銆乣secret_hash`銆乣region`銆乣health_status`銆乣last_checked_at`銆乣description`锟?
绱㈠紩锟?
- `uk_integration_proxy_tenant_code(tenant_id, organization_id, proxy_code)`
- `idx_integration_proxy_tenant_status_region(tenant_id, organization_id, status, region)`

## 8. AI 鏍稿績濂戠害

### 8.0 `ai_model_vendor`

鐢ㄩ€旓細妯″瀷鍘傚瀛楀吀锛屾槸 `ModelVendor` 棰嗗煙鐨勬暟鎹簱浜嬪疄鏉ユ簮銆傚畠淇濆瓨妯″瀷鍘熷巶/鍙戝竷鏂圭殑绋冲畾缂栫爜銆佸睍绀轰俊鎭€佸畼缃戞枃妗ｃ€佸浘鏍囥€佽兘鍔涙棌鍜屾帓搴忥紝涓嶄繚锟?API 鎺ュ叆璐﹀彿銆乥ase URL 鎴栧瘑閽ワ拷?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `vendor_code` | string(64) | 锟?| `ModelVendor` 绋冲畾缂栫爜锛岃法 Java/Rust/TypeScript/OpenAPI 缁熶竴 |
| `display_name` | string(128) | 锟?| 灞曠ず鍚嶇О |
| `legal_name` | string(256) | 锟?| 娉曞姟涓讳綋鍚嶇О |
| `description` | string(512) | 锟?| 鍘傚璇存槑 |
| `website_url` | string(512) | 锟?| 瀹樼綉 |
| `docs_url` | string(512) | 锟?| 妯″瀷锟?API 鏂囨。鍏ュ彛 |
| `logo_media_resource_id` | string(128) | 锟?| 鍝佺墝 logo 濯掍綋璧勬簮绋冲畾 ID |
| `logo_object_blob_id` | int64 | 锟?| 鍝佺墝 logo 瀵硅薄瀛樺偍 Blob |
| `logo_resource_snapshot` | json | 锟?| 鍝佺墝 logo `MediaResource` 蹇収 |
| `icon_media_resource_id` | string(128) | 锟?| 灏忓浘鏍囧獟浣撹祫婧愮ǔ锟?ID |
| `icon_object_blob_id` | int64 | 锟?| 灏忓浘鏍囧璞″瓨锟?Blob |
| `icon_resource_snapshot` | json | 锟?| 灏忓浘锟?`MediaResource` 蹇収 |
| `color_token` | string(64) | 锟?| 鍓嶇绋冲畾鑹诧拷?token |
| `country_region` | string(64) | 锟?| 鍥藉/鍦板尯 |
| `vendor_type` | enum_int32 | 锟?| company銆乧loud銆乷pen_source銆乧ommunity銆乧ustom銆乽nknown |
| `model_families` | json | 锟?| 涓昏妯″瀷鏃忥紝锟?GPT銆丆laude銆丟emini銆丵wen |
| `capabilities` | json | 锟?| 鍘傚绾ц兘鍔涢泦锟?|
| `open_source` | bool | 锟?| 鏄惁寮€锟?绀惧尯涓诲 |
| `sort_order` | int32 | 锟?| 灞曠ず鎺掑簭 |

绾︽潫锟?
- `uk_ai_model_vendor_code(vendor_code)`
- `idx_ai_model_vendor_status_sort(status, sort_order, id)`

鏋氫妇绉嶅瓙搴旀潵锟?Schema Registry 锟?`domain_names.model_vendor.builtin_values`銆侸ava/Rust/TypeScript 浠ｇ爜鐢熸垚鏃跺彧鎶婂唴缃€肩敓鎴愭垚鏋氫妇甯搁噺锛涙暟鎹簱浠嶅厑璁镐繚鐣欐柊澧炲巶锟?code锛屼互鏀寔鍓嶅悜鍏煎锟?
### 8.1 `ai_model_family`

鐢ㄩ€旓細妯″瀷鏃忓瓧鍏革紝琛ㄧず鏌愪釜鍘傚涓嬬殑涓€缁勬ā鍨嬬郴鍒楋紝渚嬪 GPT銆丆laude銆丟emini銆丵wen銆丩lama銆丏eepSeek銆丼uno銆傚畠锟?`ai_model_vendor.model_families` 涓殑灞曠ず蹇収鎻愬崌涓哄彲妫€绱€佸彲鎺掑簭銆佸彲娌荤悊鐨勪竴绛変富鏁版嵁锟?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `vendor_id` | int64 | 锟?| `ai_model_vendor.id` |
| `vendor_code` | string(64) | 锟?| `ModelVendor` 绋冲畾缂栫爜 |
| `family_code` | string(64) | 锟?| 鍘傚鍐呭敮涓€妯″瀷鏃忕紪锟?|
| `display_name` | string(128) | 锟?| 灞曠ず鍚嶇О |
| `description` | string(512) | 锟?| 妯″瀷鏃忚锟?|
| `docs_url` | string(512) | 锟?| 妯″瀷鏃忔枃锟?|
| `icon_media_resource_id` | string(128) | 锟?| 鍥炬爣濯掍綋璧勬簮绋冲畾 ID |
| `icon_object_blob_id` | int64 | 锟?| 鍥炬爣瀵硅薄瀛樺偍 Blob |
| `icon_resource_snapshot` | json | 锟?| 鍥炬爣 `MediaResource` 蹇収 |
| `color_token` | string(64) | 锟?| 灞曠ず锟?token |
| `family_type` | enum_int32 | 锟?| foundation銆乺easoning銆乿ision銆乮mage銆乿ideo銆乤udio銆乵usic銆乪mbedding銆乵oderation |
| `primary_modality` | enum_int32 | 锟?| 涓绘ā锟?|
| `model_count` | int64 | 锟?| 鍙噸绠楁ā鍨嬫暟閲忔姇锟?|
| `default_model_id` | int64 | 锟?| 榛樿鎺ㄨ崘妯″瀷 |
| `default_model` | string(128) | 锟?| 榛樿鎺ㄨ崘妯″瀷鍚嶅揩锟?|
| `sort_order` | int32 | 锟?| 灞曠ず鎺掑簭 |

绾︽潫锟?
- `uk_ai_model_family_vendor_code(vendor_code, family_code)`
- `idx_ai_model_family_vendor_status_sort(vendor_code, status, sort_order, id)`

### 8.2 `ai_model`

鐢ㄩ€旓細缃戝叧瀵瑰妯″瀷鐩綍銆傚畠锟?Provider independent model锛屼笉绛夊悓浜庢煇涓緵搴斿晢鐨勬ā锟?ID锟?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `model` | string(128) | 锟?| OpenAI 鍏煎 API 涓殑 `model` |
| `display_name` | string(128) | 锟?| 灞曠ず鍚嶇О |
| `vendor_id` | int64 | 锟?| `ai_model_vendor.id` |
| `vendor_code` | string(64) | 锟?| `ModelVendor` 绋冲畾缂栫爜 |
| `vendor_name_snapshot` | string(128) | 锟?| 妯″瀷鍘傚灞曠ず鍚嶅揩锟?|
| `family_id` | int64 | 锟?| `ai_model_family.id` |
| `family_code` | string(64) | 锟?| 妯″瀷鏃忕紪锟?|
| `provider_hint` | string(64) | 锟?| 鍏煎瀛楁锛屽彧浣滈粯璁ゆ帴鍏ユ彁绀猴紱涓嶅緱鏇夸唬 `vendor_code` |
| `model_family` | string(128) | 锟?| 妯″瀷锟?|
| `model_version` | string(64) | 锟?| 鍘傚鐗堟湰鍙锋垨鍙戝竷鏃ユ湡缂栫爜 |
| `model_aliases` | json | 锟?| 鍒悕鍜屽吋瀹规ā鍨嬪悕 |
| `capability` | enum_int32 | 锟?| chat銆乺esponses銆乪mbedding銆乮mage銆乤udio銆乿ideo銆乵oderation |
| `modalities` | json | 锟?| input/output 妯★拷?|
| `icon_media_resource_id` | string(128) | 锟?| 灞曠ず鍥炬爣濯掍綋璧勬簮绋冲畾 ID |
| `icon_object_blob_id` | int64 | 锟?| 灞曠ず鍥炬爣瀵硅薄瀛樺偍 Blob |
| `icon_resource_snapshot` | json | 锟?| 灞曠ず鍥炬爣 `MediaResource` 蹇収 |
| `color_token` | string(64) | 锟?| 鍓嶇鍥捐〃棰滆壊 token |
| `docs_url` | string(1024) | 锟?| 瀹樻柟鏂囨。閾炬帴 |
| `license_type` | enum_int32 | 锟?| open-source銆乸roprietary銆乧ustom |
| `api_format` | string(128) | 锟?| Chat Completions銆丷esponses銆丄nthropic Messages 绛夊睍绀烘牸锟?|
| `capability_intro` | text | 锟?| 璇︽儏椤佃兘鍔涗粙锟?|
| `limitations` | json | 锟?| 闄愬埗璇存槑 |
| `supported_languages` | json | 锟?| 鏀寔璇█ |
| `use_cases` | json | 锟?| 浣跨敤鍦烘櫙 |
| `training_data_cutoff` | string(128) | 锟?| 璁粌鏁版嵁鎴璇存槑 |
| `context_tokens` | int64 | 锟?| 涓婁笅鏂囩獥锟?|
| `max_input_tokens` | int64 | 锟?| 鏈€澶ц緭锟?|
| `max_output_tokens` | int64 | 锟?| 鏈€澶ц緭锟?|
| `max_duration_seconds` | int32 | 锟?| 瑙嗛銆侀煶棰戙€侀煶涔愮瓑鏃堕暱涓婇檺 |
| `supports_streaming` | bool | 锟?| 娴佸紡 |
| `supports_tools` | bool | 锟?| 宸ュ叿璋冪敤 |
| `supports_json_schema` | bool | 锟?| 缁撴瀯鍖栬緭锟?|
| `performance_profile` | json | 锟?| latency銆乼hroughput銆乼tft 绛夊睍绀哄拰鎺掑簭蹇収 |
| `default_pricing_id` | int64 | 锟?| 榛樿浠锋牸 |
| `rank_score` | decimal_string | 锟?| 鎺掑悕/鎺ㄨ崘寰楀垎 |
| `release_stage` | enum_int32 | 锟?| beta銆乬a銆乨eprecated |
| `deprecated_at` | instant | 锟?| 涓嬬嚎鏃堕棿 |

绾︽潫锟?
- `uk_ai_model_model(model)`
- `idx_ai_model_vendor_status(vendor_code, status, updated_at, id)`
- `idx_ai_model_family_status(vendor_code, family_code, status, updated_at, id)`
- `idx_ai_model_capability_status(capability, status, updated_at, id)`

### 8.3 `ai_model_capability`

鐢ㄩ€旓細妯″瀷鑳藉姏鏄庣粏琛ㄣ€俙ai_model` 淇濆瓨鍒楄〃鍜岀儹璺緞闇€瑕佺殑鑳藉姏鎽樿锛宍ai_model_capability` 淇濆瓨鍙墿灞曠殑鑳藉姏銆佹ā鎬併€佺鐐规牸寮忋€佸弬锟?schema 鍜岄檺鍒跺€硷紝鐢ㄤ簬妯″瀷璇︽儏銆丳layground 鍙傛暟闈㈡澘銆丼DK 鏂囨。鍜岃矾鐢辫兘鍔涘尮閰嶏拷?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `model_id` | int64 | 锟?| `ai_model.id` |
| `model` | string(128) | 锟?| 妯″瀷鍚嶅揩锟?|
| `vendor_code` | string(64) | 锟?| `ModelVendor` 绋冲畾缂栫爜 |
| `capability` | enum_int32 | 锟?| chat銆乺esponses銆乪mbedding銆乮mage銆乤udio銆乿ideo銆乵usic銆乵oderation |
| `capability_code` | string(64) | 锟?| 绋冲畾鑳藉姏缂栫爜锛屼緥锟?`json_schema`銆乣tool_calling`銆乣vision_input` |
| `modality` | enum_int32 | 锟?| 涓绘ā锟?|
| `input_modalities` | json | 锟?| 杈撳叆妯℃€侀泦锟?|
| `output_modalities` | json | 锟?| 杈撳嚭妯℃€侀泦锟?|
| `endpoint_formats` | json | 锟?| openai_chat銆乷penai_responses銆乤nthropic_messages銆乬emini 绛夊吋瀹圭锟?|
| `parameter_name` | string(128) | 锟?| 鍙傛暟鍚嶏紱鑳藉姏琛屽彲涓虹┖锛屽弬鏁拌蹇呭～ |
| `parameter_schema` | json | 锟?| 鍙傛暟 JSON Schema |
| `supported` | bool | 锟?| 鏄惁鏀寔 |
| `limit_unit` | string(64) | 锟?| token銆乻econd銆乮mage銆乺equest 绛夐檺鍒跺崟锟?|
| `limit_value` | string(128) | 锟?| 闄愬埗鍊硷紝淇濈暀瀛楃涓蹭互鍏煎 `128k`銆乣2M`銆乣4min` |
| `schema_version` | string(32) | 锟?| 鍙傛暟 schema 鐗堟湰 |
| `sort_order` | int32 | 锟?| 鍙傛暟鍜岃兘鍔涘睍绀烘帓锟?|
| `description` | string(512) | 锟?| 璇存槑 |

绾︽潫锟?
- `uk_ai_model_capability_model_code(model_id, capability_code, modality, parameter_name)`
- `idx_ai_model_capability_vendor_capability(tenant_id, organization_id, vendor_code, capability, supported, id)`

#### 8.3.1 `ai_billing_meter`

鐢ㄩ€旓細缁熶竴璁¤垂璁￠噺琛紝瀹氫箟鈥滀粈涔堜笢瑗垮彲浠ヨ璁¤垂鈥濄€傛ā鍨嬩环鏍笺€佸畾浠疯鍒欍€侀樁姊拰鐢ㄩ噺浜嬪疄閮藉紩锟?`meter_code`锛岄伩鍏嶆妸璁¤垂鏂瑰紡鍐欐锟?token銆乮mage 锟?request銆傛柊澧炶闊炽€佽棰戙€佸浘鐗囥€侀煶涔愩€侀煶鏁堛€丄PI 缁撴灉銆丄PI 鏉＄洰銆佸伐鍏疯皟鐢ㄣ€佸瓨鍌ㄣ€佹祦閲忕瓑璁¤垂褰㈡€佹椂锛屽彧闇€瑕佹柊锟?meter 鍜岃鍒欙紝涓嶉渶瑕佹敼 `ai_usage` 涓荤粨鏋勶拷?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `meter_code` | string(64) | 锟?| 绋冲畾缂栫爜锛屼緥锟?`llm_input_token`銆乣image_result`銆乣audio_output_second`銆乣api_result` |
| `display_name` | string(128) | 锟?| 灞曠ず鍚嶇О |
| `description` | string(512) | 锟?| 璇存槑 |
| `modality` | enum_int32 | 锟?| text銆乮mage銆乿ideo銆乤udio銆乵usic銆乻fx銆乤pi銆乻torage銆乶etwork |
| `usage_type` | enum_int32 | 锟?| chat銆乪mbedding銆乮mage銆乤udio銆乿ideo銆乵usic銆乻fx銆乼ool銆乤pi |
| `billing_mode` | enum_int32 | 锟?| token銆乸er_request銆乸er_result銆乸er_item銆乨uration銆乧haracter銆乻torage銆乥andwidth |
| `default_unit` | enum_int32 | 锟?| token锟?k_token锟?m_token銆乺equest銆乺esult銆乮tem銆乻econd銆乧haracter銆乬b_day銆乬b |
| `default_unit_size` | decimal_string | 锟?| 榛樿鍗曚綅澶у皬 |
| `quantity_precision` | int32 | 锟?| 鏁伴噺绮惧害 |
| `quantity_source` | enum_int32 | 锟?| usage_field銆乺esponse_field銆乺equest_field銆乸rovider_usage銆乪xpression銆乵anual |
| `aggregation_mode` | enum_int32 | 锟?| sum銆乵ax銆乵in銆乴ast銆乨istinct_count |
| `result_selector` | string(256) | 锟?| 浠庡搷搴旀垨 usage payload 鍙栫粨鏋滄暟鐨勯€夋嫨锟?|
| `supports_tier` | bool | 锟?| 鏄惁鏀寔闃舵 |
| `supports_expression` | bool | 锟?| 鏄惁鏀寔琛ㄨ揪锟?|
| `allow_negative_quantity` | bool | 锟?| 鏄惁鍏佽鎶垫墸绫昏礋鏁伴噺 |
| `canonical_price_item_type` | enum_int32 | 锟?| 榛樿浠锋牸锟?|
| `sort_order` | int32 | 锟?| 灞曠ず鎺掑簭 |

鍐呯疆 meter 鑷冲皯鍖呮嫭锟?
| 棰嗗煙 | meter 绀轰緥 |
| --- | --- |
| LLM | `llm_input_token`銆乣llm_output_token`銆乣llm_cache_read_token`銆乣llm_cache_write_token`銆乣tool_call` |
| Embedding | `embedding_input_token` |
| 鍥剧墖 | `image_input_token`銆乣image_result`銆乣image_pixel` |
| 璇煶/闊抽 | `audio_input_second`銆乣audio_output_second`銆乣speech_character` |
| 瑙嗛/闊充箰/闊虫晥 | `video_input_second`銆乣video_output_second`銆乣music_output_second`銆乣sfx_result` |
| 閫氱敤 API | `api_request`銆乣api_result`銆乣api_item` |
| 璧勬簮锟?| `storage_gb_day`銆乣bandwidth_gb` |

### 8.4 `ai_model_pricing`

鐢ㄩ€旓細妯″瀷浠锋牸绨裤€傛柊琛ㄥ繀椤讳娇锟?decimal锛屼笉鍏佽 float/double銆傚畠锟?`price_side` 鍖哄垎瀹樻柟鍙傝€冧环銆佷緵搴斿晢涓婃父鎴愭湰浠枫€佸鎴烽攢鍞环鍜屽唴閮ㄧ粨绠椾环锛岀敤 `pricing_scope` 琛ㄧず global銆乼enant銆乷rganization銆乻ku銆乧hannel_group銆乸rovider銆乧hannel 绛夌敓鏁堣寖鍥淬€備竴锟?`ai_model` 鍙互鏈夊锟?`upstream_cost` 浠锋牸锛屽搴斾笉锟?`provider_code/channel_id/provider_model`锛涗篃鍙互鏈夊锟?`customer_charge` 浠锋牸锛屽搴斾笉鍚屽畾浠锋柟妗堛€佺鎴锋垨 SKU锟?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `model_id` | int64 | 锟?| `ai_model.id` |
| `model` | string(128) | 锟?| 妯″瀷蹇収 |
| `vendor_code` | string(64) | 锟?| `ModelVendor` 绋冲畾缂栫爜 |
| `provider_code` | string(64) | 锟?| 涓婃父 Provider 鎴栭攢鍞笭閬撶紪锟?|
| `channel_id` | int64 | 锟?| 娓犻亾绾т环鏍兼椂鍏宠仈 `ai_channel.id` |
| `provider_model` | string(128) | 锟?| 涓婃父妯″瀷鍚嶅揩锟?|
| `platform_code` | string(64) | 锟?| sub2api 寮忓钩鍙扮淮搴︼紝渚嬪 anthropic銆乷penai銆乬emini |
| `service_tier` | string(64) | 锟?| default銆乸riority銆乫lex 绛夋湇鍔″眰锟?|
| `price_side` | enum_int32 | 锟?| official_reference銆乽pstream_cost銆乧ustomer_charge銆乮nternal_transfer |
| `pricing_scope` | enum_int32 | 锟?| global銆乼enant銆乷rganization銆乻ku銆乧hannel_group銆乸rovider銆乧hannel |
| `pricing_scope_id` | int64 | 锟?| scope 瀵硅薄 ID |
| `pricing_plan_id` | int64 | 锟?| `customer_charge` 浠锋牸鎵€灞炲畾浠锋柟锟?|
| `pricing_plan_code` | string(64) | 锟?| 瀹氫环鏂规缂栫爜蹇収 |
| `billing_type` | enum_int32 | 锟?| token銆乺equest銆乨uration銆乮mage銆乿ideo銆乤udio銆乺esult銆乮tem銆乻torage銆乥andwidth |
| `billing_mode` | enum_int32 | 锟?| token銆乫ixed_price銆乸er_request銆乸er_result銆乸er_item銆乨uration銆乧haracter銆乻torage銆乥andwidth銆乼iered銆乪xpression銆乮mage銆乤udio銆乿ideo |
| `billing_meter_id` | int64 | 锟?| `ai_billing_meter.id` |
| `billing_meter_code` | string(64) | 锟?| 璁￠噺缂栫爜锛屼緥锟?`llm_input_token`銆乣api_result` |
| `price_item_type` | enum_int32 | 锟?| input銆乧ached_input銆乷utput銆乺equest銆乨uration 锟?|
| `unit` | enum_int32 | 锟?| token锟?k_token锟?m_token銆乺equest銆乻econd銆乵inute銆乮mage |
| `unit_size` | decimal_string | 锟?| 鍗曚綅澶у皬 |
| `metering_mode` | enum_int32 | 锟?| direct銆乧omputed銆乸rovider_reported銆乪stimated銆乵anual_adjustment |
| `quantity_source` | enum_int32 | 锟?| usage_field銆乺esponse_field銆乺equest_field銆乸rovider_usage銆乪xpression |
| `quantity_formula` | text | 锟?| 璁￠噺鏁伴噺琛ㄨ揪寮忥紝蹇呴』鍙楃櫧鍚嶅崟闄愬埗 |
| `result_selector` | string(256) | 锟?| 鎸夌粨锟?涓暟璁¤垂鏃朵粠鍝嶅簲涓彇鏁伴噺鐨勯€夋嫨锟?|
| `minimum_quantity` | decimal_string | 锟?| 鏈€灏忚璐规暟锟?|
| `quantity_step` | decimal_string | 锟?| 鏁伴噺杩涗綅姝ラ暱 |
| `included_quantity` | decimal_string | 锟?| 鍏嶈垂鍖呭惈鏁伴噺 |
| `unit_price` | decimal_string | 锟?| 鍗曚环 |
| `currency` | string(10) | 锟?| 甯佺 |
| `rounding_mode` | enum_int32 | 锟?| half_up銆乭alf_even銆乧eil銆乫loor |
| `min_charge_amount` | decimal_string | 锟?| 鏈€灏忚璐归噾锟?|
| `reference_price_id` | int64 | 锟?| 娲剧敓浠峰紩鐢ㄧ殑 `ai_model_pricing.id` |
| `reference_price_side` | enum_int32 | 锟?| official_reference銆乽pstream_cost 绛夊弬鑰冧环锟?|
| `reference_multiplier` | decimal_string | 锟?| 鍙傝€冧环鍊嶇巼 |
| `markup_amount` | decimal_string | 锟?| 鍙傝€冧环鍩虹涓婄殑鍥哄畾鍔犱环 |
| `pricing_formula_mode` | enum_int32 | 锟?| fixed銆乵ultiplier銆乵ultiplier_plus_offset銆乼iered銆乪xpression |
| `price_origin` | enum_int32 | 锟?| official_import銆乸rovider_sync銆乵anual銆乨erived銆乫allback |
| `import_snapshot_id` | int64 | 锟?| `ai_pricing_import_snapshot.id` |
| `priority` | int32 | 锟?| 澶氭潯浠锋牸鍛戒腑鏃剁殑浼樺厛锟?|
| `region` | string(64) | 锟?| 浠锋牸鍖哄煙 |
| `price_version` | string(64) | 锟?| 浠锋牸鐗堟湰 |
| `source_url` | string(512) | 锟?| 瀹樻柟鎴栦緵搴斿晢浠锋牸鏉ユ簮 |
| `source_hash` | string(128) | 锟?| 鏉ユ簮鍐呭 hash |
| `published_at` | instant | 锟?| 鍘傚/渚涘簲鍟嗗彂甯冩椂锟?|
| `observed_at` | instant | 锟?| 鏈郴缁熼噰闆嗘椂锟?|
| `effective_from` | instant | 锟?| 鐢熸晥鏃堕棿 |
| `effective_to` | instant | 锟?| 澶辨晥鏃堕棿 |
| `source_price_id` | int64 | 锟?| 鍙叧锟?`legacy_model_price.id` |

绾︽潫锟?
- `uk_ai_model_pricing_uuid(uuid)`
- `idx_ai_model_pricing_lookup(tenant_id, organization_id, model, price_side, pricing_scope, pricing_scope_id, billing_mode, billing_meter_code, status, effective_from, effective_to)`
- `idx_ai_model_pricing_vendor_model(tenant_id, organization_id, vendor_code, model, price_side, status, effective_from, id)`
- `idx_ai_model_pricing_provider_channel(tenant_id, organization_id, provider_code, channel_id, model, price_side, status, effective_from, id)`
- `idx_ai_model_pricing_plan_effective(tenant_id, organization_id, pricing_plan_id, model, price_side, status, effective_from, id)`
- `idx_ai_model_pricing_meter_effective(tenant_id, organization_id, billing_meter_code, price_side, status, effective_from, id)`
- `idx_ai_model_pricing_model_status(tenant_id, organization_id, model_id, status)`

妯″瀷鐩綍淇濆瓨閾捐矾锟?
| 闂 | 涓昏〃 | 鏌ヨ/绾︽潫 |
| --- | --- | --- |
| 姣忎釜鍘傚鏈夊摢浜涙ā鍨嬫棌 | `ai_model_family` | `vendor_code + status + sort_order` |
| 姣忎釜鍘傚鏈夊摢浜涙ā锟?| `ai_model` | `vendor_code + status`锛岄渶瑕佹寜绯诲垪绛涢€夋椂锟?`family_code` |
| 鏌愭ā鍨嬫湁鍝簺鑳藉姏 | `ai_model_capability` | `model_id` 锟?`vendor_code + capability + supported` |
| 鏌愭ā鍨嬮潰鍚戠敤鎴峰浣曡锟?| `ai_model_pricing` | `model + price_side=customer_charge + pricing_scope` |
| 锟?Provider/Channel 鐨勪笂娓告垚锟?| `ai_model_pricing` | `model + price_side=upstream_cost + provider_code/channel_id` |
| 鏌愭ā鍨嬪彲閫氳繃鍝簺娓犻亾璋冪敤 | `ai_channel_resource` + `ai_resource` | `resource_code/resource_group_code + vendor_code` |

浠锋牸浣跨敤瑙勫垯锟?
- 闂ㄦ埛妯″瀷椤靛睍绀洪粯璁よ `price_side=customer_charge`锛屾病鏈夐攢鍞环鏃跺彲鍥為€€锟?`official_reference`锛屼絾蹇呴』锟?DTO 涓爣璁版潵婧愶拷?- 璺敱鎴愭湰浼樺寲鍙 `price_side=upstream_cost`锛屼笉鑳界洿鎺ヤ娇鐢ㄥ鎴烽攢鍞环锟?- 璐﹀姟缁撶畻浠ヨ姹傚畬鎴愭椂鍐欏叆 `ai_usage.pricing_snapshot` 鐨勪环鏍煎揩鐓т负鍑嗭紝涓嶅洖鏌ュ綋鍓嶄环鏍艰〃閲嶇畻鍘嗗彶璐﹀崟锟?
#### 8.4.1 `ai_pricing_plan`

鐢ㄩ€旓細瀹氫环鏂规涓昏〃銆傚畠涓嶆槸鐢ㄦ埛缁勶紝涔熶笉锟?API Key 鍒嗙粍鏈韩锛岃€屾槸鈥滃浣曚粠鍙傝€冧环璁＄畻閿€鍞环鈥濈殑绛栫暐闆嗗悎銆俙ai_channel_group` 鏄垱锟?API Key 鏃堕€夋嫨鐨勪笟鍔″垎缁勪簨瀹炴潵婧愶紝鍙互鐩存帴鎸傞粯锟?`pricing_plan_id`锛涙洿澶嶆潅鍦烘櫙閫氳繃 `ai_pricing_plan_binding` 鎶婂畾浠锋柟妗堢粦瀹氬埌鐢ㄦ埛銆乂IP銆丼KU銆佺鎴锋垨鍗曚釜 API Key锟?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `plan_code` | string(64) | 锟?| 绉熸埛鍐呯ǔ瀹氱紪鐮侊紝渚嬪 default銆乿ip銆乪nterprise |
| `plan_name` | string(128) | 锟?| 灞曠ず鍚嶇О |
| `description` | string(512) | 锟?| 璇存槑 |
| `plan_scope` | enum_int32 | 锟?| global銆乼enant銆乷rganization銆乧hannel_group銆乤pi_key銆乿ip銆乻ku銆乽ser |
| `base_price_side` | enum_int32 | 锟?| 榛樿鍙傝€冧环渚э紝閫氬父锟?official_reference |
| `base_pricing_scope` | enum_int32 | 锟?| 榛樿鍙傝€冧环 scope |
| `default_reference_price_id` | int64 | 锟?| 鍙寚瀹氶粯璁ゅ弬鑰冧环锟?|
| `default_multiplier` | decimal_string | 锟?| 榛樿鍙傝€冧环鍊嶇巼锛屽惛锟?new-api `GroupRatio` 锟?sub2api `groups.rate_multiplier` |
| `default_markup_amount` | decimal_string | 锟?| 榛樿鍥哄畾鍔犱环 |
| `currency` | string(10) | 锟?| 榛樿甯佺 |
| `billing_mode` | enum_int32 | 锟?| token銆乫ixed_price銆乸er_request銆乼iered銆乪xpression 锟?|
| `rounding_mode` | enum_int32 | 锟?| 閲戦鍙栨暣妯″紡 |
| `min_charge_amount` | decimal_string | 锟?| 鏈€灏忚璐归噾锟?|
| `fallback_mode` | enum_int32 | 锟?| missing_as_official銆乵issing_as_cost銆乨eny銆乫ree銆乵anual_review |
| `priority` | int32 | 锟?| 澶氬垎缁勫懡涓椂浼樺厛锟?|
| `price_version` | string(64) | 锟?| 鍒嗙粍浠锋牸鐗堟湰 |
| `effective_from` | instant | 锟?| 鐢熸晥鏃堕棿 |
| `effective_to` | instant | 锟?| 澶辨晥鏃堕棿 |

绾︽潫锟?
- `uk_ai_pricing_plan_tenant_code(tenant_id, organization_id, plan_code)`
- `idx_ai_pricing_plan_scope_status(tenant_id, organization_id, plan_scope, status, priority, id)`
- `idx_ai_pricing_plan_effective(tenant_id, organization_id, status, effective_from, effective_to, id)`

#### 8.4.2 `ai_pricing_plan_binding`

鐢ㄩ€旓細瀹氫环鏂规缁戝畾琛紝瑙ｅ喅 sub2api 锟?API Key 缁戝畾 group銆乤ccount 缁戝畾 group銆佺敤鎴蜂笓锟?group rate 鐨勯渶姹傦紝鍚屾椂閬垮厤淇敼 `plus_user`銆乣plus_vip_user`銆乣plus_account` 绛夊瓨閲忎簨瀹炶〃銆備笟鍔″垎缁勫叧绯讳粛锟?`iam_gateway_api_key.channel_group_id` 锟?`ai_channel_group` 琛ㄨ揪锛涜琛ㄥ彧澶勭悊鈥滄煇涓富浣撲复鏃舵垨涓撳睘浣跨敤鍝瀹氫环鏂规鈥濓拷?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `pricing_plan_id` | int64 | 锟?| `ai_pricing_plan.id` |
| `pricing_plan_code` | string(64) | 锟?| 瀹氫环鏂规缂栫爜蹇収 |
| `subject_type` | enum_int32 | 锟?| tenant銆乷rganization銆乧hannel_group銆乤pi_key銆乽ser銆乿ip_level銆乻ku銆乤ccount |
| `subject_id` | int64 | 锟?| 涓讳綋 ID锛涚敤鎴枫€乂IP銆佽处鎴风瓑寮曠敤鏃㈡湁 `plus_*` 锟?|
| `subject_code` | string(128) | 锟?| 涓讳綋缂栫爜鎴栧揩锟?|
| `binding_source` | enum_int32 | 锟?| manual銆乿ip銆乸ackage銆乸romotion銆乵igration銆乤pi |
| `multiplier_override` | decimal_string | 锟?| 涓讳綋涓撳睘鍊嶇巼锛屽惛锟?sub2api `user_group_rate_multipliers.rate_multiplier` |
| `rpm_override` | int64 | 锟?| 涓讳綋涓撳睘 RPM 瑕嗙洊 |
| `tpm_override` | int64 | 锟?| 涓讳綋涓撳睘 TPM 瑕嗙洊 |
| `quota_policy_id` | int64 | 锟?| 鍙粦锟?`ai_quota_policy.id` |
| `priority` | int32 | 锟?| 澶氱粦瀹氬懡涓椂浼樺厛锟?|
| `effective_from` | instant | 锟?| 鐢熸晥鏃堕棿 |
| `effective_to` | instant | 锟?| 澶辨晥鏃堕棿 |

绾︽潫锟?
- `uk_ai_pricing_plan_binding_subject(tenant_id, organization_id, subject_type, subject_id, pricing_plan_id)`
- `idx_ai_pricing_plan_binding_subject_effective(tenant_id, organization_id, subject_type, subject_id, status, effective_from, id)`
- `idx_ai_pricing_plan_binding_plan(tenant_id, organization_id, pricing_plan_id, status, priority, id)`

#### 8.4.3 `ai_pricing_rule`

鐢ㄩ€旓細瀹氫环鏂规涓嬬殑瑙勫垯琛ㄣ€傚畠锟?new-api 锟?`ModelRatio`銆乣ModelPrice`銆乣CompletionRatio`銆乣CacheRatio`銆乣GroupGroupRatio` 锟?sub2api 锟?channel model pricing 缁熶竴鎴愬彲瀹¤銆佸彲绱㈠紩銆佸彲鐗堟湰鍖栫殑琛屾ā鍨嬶拷?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `pricing_plan_id` | int64 | 锟?| 鎵€灞炲畾浠锋柟锟?|
| `pricing_plan_code` | string(64) | 锟?| 瀹氫环鏂规缂栫爜蹇収 |
| `rule_code` | string(64) | 锟?| 绉熸埛鍐呰鍒欑紪锟?|
| `rule_name` | string(128) | 锟?| 瑙勫垯鍚嶇О |
| `match_type` | enum_int32 | 锟?| wildcard銆乿endor銆乫amily銆乵odel銆乸rovider銆乧hannel銆乧apability銆乵eter銆乸rice_item |
| `vendor_code`銆乣family_code`銆乣model_id`銆乣model` | mixed | 锟?| 妯″瀷鍘傚銆佹ā鍨嬫棌鍜屾ā鍨嬪尮閰嶆潯锟?|
| `provider_code`銆乣channel_id`銆乣provider_model` | mixed | 锟?| 渚涘簲鍟嗐€佹笭閬撳拰涓婃父妯″瀷鍖归厤鏉′欢 |
| `capability_code`銆乣platform_code`銆乣service_tier`銆乣region` | mixed | 锟?| 鑳藉姏銆佸钩鍙般€佹湇鍔″眰绾у拰鍖哄煙鏉′欢 |
| `price_side` | enum_int32 | 锟?| 瑙勫垯鐢熸垚鐨勪环鏍间晶锛岄€氬父锟?customer_charge |
| `reference_price_side` | enum_int32 | 锟?| 鍙傝€冧环渚э紝閫氬父锟?official_reference 锟?upstream_cost |
| `reference_pricing_id` | int64 | 锟?| 鎸囧畾鍙傝€冧环鏍艰 |
| `reference_pricing_scope` | enum_int32 | 锟?| 鍙傝€冧环锟?scope |
| `price_item_type` | enum_int32 | 锟?| input銆乷utput銆乧ache_read銆乧ache_write銆乺equest銆乺esult銆乮tem銆乮mage銆乤udio銆乿ideo銆乻torage |
| `billing_type` | enum_int32 | 锟?| token銆乺equest銆乨uration銆乧ount銆乺esult銆乮tem銆乧haracter銆乻torage銆乥andwidth |
| `billing_mode` | enum_int32 | 锟?| token銆乫ixed_price銆乸er_request銆乸er_result銆乸er_item銆乨uration銆乧haracter銆乻torage銆乥andwidth銆乼iered銆乪xpression |
| `billing_meter_id` | int64 | 锟?| `ai_billing_meter.id` |
| `billing_meter_code` | string(64) | 锟?| 瑙勫垯鍛戒腑鐨勮閲忚〃缂栫爜 |
| `unit`銆乣unit_size` | mixed | 锟?| 璁¤垂鍗曚綅 |
| `metering_mode` | enum_int32 | 锟?| direct銆乧omputed銆乸rovider_reported銆乪stimated銆乵anual_adjustment |
| `quantity_source` | enum_int32 | 锟?| usage_field銆乺esponse_field銆乺equest_field銆乸rovider_usage銆乪xpression |
| `quantity_formula` | text | 锟?| 璁￠噺鏁伴噺琛ㄨ揪锟?|
| `result_selector` | string(256) | 锟?| 缁撴灉/涓暟璁¤垂鏁伴噺閫夋嫨锟?|
| `minimum_quantity` | decimal_string | 锟?| 鏈€灏忚璐规暟锟?|
| `quantity_step` | decimal_string | 锟?| 杩涗綅姝ラ暱 |
| `included_quantity` | decimal_string | 锟?| 鍏嶈垂鍖呭惈鏁伴噺 |
| `formula_mode` | enum_int32 | 锟?| fixed銆乵ultiplier銆乵ultiplier_plus_offset銆乼iered銆乪xpression |
| `multiplier` | decimal_string | 锟?| 鍙傝€冧环鍊嶇巼 |
| `markup_amount` | decimal_string | 锟?| 鍥哄畾鍔犱环 |
| `unit_price_override` | decimal_string | 锟?| 鍥哄畾鍗曚环瑕嗙洊 |
| `expression` | text | 锟?| 琛ㄨ揪寮忚璐癸紝蹇呴』鍙楃櫧鍚嶅崟鍑芥暟锟?sandbox 闄愬埗 |
| `expression_hash` | string(128) | 锟?| 琛ㄨ揪锟?hash |
| `fallback_mode` | enum_int32 | 锟?| 缂轰环澶勭悊绛栫暐 |
| `priority` | int32 | 锟?| 鍛戒腑浼樺厛锟?|
| `effective_from` | instant | 锟?| 鐢熸晥鏃堕棿 |
| `effective_to` | instant | 锟?| 澶辨晥鏃堕棿 |

#### 8.4.4 `ai_pricing_tier`

鐢ㄩ€旓細浠锋牸闃舵鍜屽尯闂磋〃銆傚畠鍚告敹 sub2api `channel_pricing_intervals` 鐨勪紭鐐癸紝鍚屾椂鏀寔 token 涓婁笅鏂囬暱搴︺€佹寜娆°€佹寜缁撴灉銆佹寜涓暟銆佸浘鐗囧昂瀵搞€侀煶棰戞椂闀裤€佽棰戞椂闀裤€佸瓧绗︽暟銆佸瓨鍌ㄩ噺銆佹祦閲忓拰琛ㄨ揪锟?tier label锟?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `pricing_rule_id` | int64 | 锟?| 鎵€锟?`ai_pricing_rule.id` |
| `model_pricing_id` | int64 | 锟?| 鐩存帴鎸傚湪 `ai_model_pricing.id` 鐨勫尯锟?|
| `tier_code` | string(64) | 锟?| 灞傜骇缂栫爜 |
| `tier_label` | string(64) | 锟?| 灞曠ず鏍囩锛屼緥锟?128k銆丠D銆乸riority |
| `price_item_type` | enum_int32 | 锟?| 浠锋牸锟?|
| `billing_mode` | enum_int32 | 锟?| token銆乸er_request銆乸er_result銆乸er_item銆乨uration銆乧haracter銆乻torage銆乥andwidth銆乮mage銆乤udio銆乿ideo銆乼iered |
| `billing_meter_id` | int64 | 锟?| `ai_billing_meter.id` |
| `billing_meter_code` | string(64) | 锟?| 璁￠噺琛ㄧ紪锟?|
| `min_quantity` | decimal_string | 锟?| 鍖洪棿涓嬬晫锛屽惈 |
| `max_quantity` | decimal_string | 锟?| 鍖洪棿涓婄晫锛岀┖琛ㄧず鏃犱笂锟?|
| `quantity_unit` | enum_int32 | 锟?| token銆乺equest銆乺esult銆乮tem銆乮mage銆乻econd銆乵inute銆乧haracter銆乸ixel銆乥yte銆乬b銆乬b_day |
| `quantity_step` | decimal_string | 锟?| 杩涗綅姝ラ暱 |
| `included_quantity` | decimal_string | 锟?| 鍖洪棿鍖呭惈鐨勫厤璐规暟锟?|
| `result_selector` | string(256) | 锟?| 鎸夌粨锟?鏉＄洰璁¤垂鏃剁殑鏁伴噺閫夋嫨锟?|
| `input_unit_price`銆乣output_unit_price` | decimal_string | 锟?| 杈撳叆/杈撳嚭鍗曚环 |
| `cache_write_unit_price`銆乣cache_read_unit_price` | decimal_string | 锟?| 缂撳瓨鍐欏叆/璇诲彇鍗曚环 |
| `image_unit_price`銆乣audio_unit_price`銆乣video_unit_price` | decimal_string | 锟?| 妯℃€佸崟锟?|
| `per_request_price` | decimal_string | 锟?| 鎸夋浠锋牸 |
| `multiplier` | decimal_string | 锟?| 鍖洪棿鍊嶇巼 |
| `currency` | string(10) | 锟?| 甯佺 |
| `sort_order` | int32 | 锟?| 鍖洪棿鎺掑簭 |
| `effective_from` | instant | 锟?| 鐢熸晥鏃堕棿 |
| `effective_to` | instant | 锟?| 澶辨晥鏃堕棿 |

#### 8.4.5 `ai_pricing_import_snapshot`

鐢ㄩ€旓細瀹樻柟/渚涘簲鍟嗕环鏍煎鍏ュ揩鐓с€傚畠璁板綍 LiteLLM銆佸畼鏂归〉闈€乶ew-api/sub2api 杩佺Щ鏁版嵁銆佹墜宸ュ鍏ョ瓑鏉ユ簮锟?URL銆乭ash銆佺増鏈€佽鏁板拰閿欒淇℃伅銆傚鍏ュ揩鐓ф槸浠锋牸璇佹嵁锛屼笉鐩存帴鍙備笌鐑矾寰勮璐癸拷?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `import_source` | enum_int32 | 锟?| official_url銆乴itellm銆乶ew_api銆乻ub2api銆乵anual銆乸rovider_api |
| `source_name` | string(128) | 锟?| 鏉ユ簮鍚嶇О |
| `source_url` | string(1024) | 锟?| 鏉ユ簮 URL |
| `source_version` | string(128) | 锟?| 鐗堟湰锟?|
| `source_hash` | string(128) | 锟?| 鍘熷鍐呭 hash |
| `upstream_commit` | string(128) | 锟?| 澶栭儴浠撳簱 commit |
| `data_format` | string(64) | 锟?| json銆亂aml銆乧sv銆乭tml銆乤pi |
| `row_count`銆乣accepted_count`銆乣rejected_count` | int64 | 锟?| 瀵煎叆缁熻 |
| `currency` | string(10) | 锟?| 榛樿甯佺 |
| `published_at`銆乣observed_at` | instant | 锟?| 鏉ユ簮鍙戝竷鏃堕棿鍜岄噰闆嗘椂锟?|
| `raw_payload_ref` | string(512) | 锟?| 鍘熷鏂囦欢寮曠敤 |
| `normalized_payload_hash` | string(128) | 锟?| 瑙勮寖鍖栧悗 hash |
| `schema_version` | string(32) | 锟?| 瑙ｆ瀽 schema 鐗堟湰 |
| `error_message_masked` | string(1024) | 锟?| 鑴辨晱閿欒 |

### 8.5 `ai_routing_policy`

鐢ㄩ€旓細璺敱绛栫暐涓昏〃锛屽畾涔夌瓥鐣ユ墍灞炰富浣撱€佺洰鏍囪兘鍔涘拰榛樿琛屼负锟?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `policy_code` | string(64) | 锟?| 绉熸埛鍐呭敮涓€绛栫暐缂栫爜 |
| `name` | string(128) | 锟?| 绛栫暐鍚嶇О |
| `policy_scope` | enum_int32 | 锟?| global銆乼enant銆乷rganization銆乤pi_key銆乬roup |
| `subject_id` | int64 | 锟?| 缁戝畾涓讳綋 ID |
| `capability` | enum_int32 | 锟?| chat銆乪mbedding銆乮mage銆乤udio銆乿ideo |
| `default_profile_id` | int64 | 锟?| 榛樿 profile |
| `fallback_mode` | enum_int32 | 锟?| none銆乶ext_provider銆乶ext_region銆乧heapest銆乫astest |
| `slo_latency_ms` | int32 | 锟?| 寤惰繜鐩爣 |
| `slo_success_rate` | decimal_string | 锟?| 鎴愬姛鐜囩洰锟?|
| `cost_ceiling` | decimal_string | 锟?| 鎴愭湰涓婇檺 |
| `currency` | string(10) | 锟?| 鎴愭湰甯佺 |

绾︽潫锟?
- `uk_ai_routing_policy_tenant_code(tenant_id, organization_id, policy_code)`
- `idx_ai_routing_policy_tenant_scope_status(tenant_id, organization_id, policy_scope, subject_id, status)`

### 8.6 `ai_routing_profile`

鐢ㄩ€旓細绛栫暐鐗堟湰鍜岀伆搴﹀彂甯冨崟鍏冦€傛墍鏈夎鍒欏綊灞炰簬 profile锛屾敮鎸佸彂甯冦€佸洖婊氬拰瀹¤锟?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `policy_id` | int64 | 锟?| 绛栫暐 ID |
| `profile_version` | int64 | 锟?| 绛栫暐鐗堟湰 |
| `profile_name` | string(128) | 锟?| 鐗堟湰鍚嶇О |
| `release_status` | enum_int32 | 锟?| draft銆乧anary銆乤ctive銆乺ollback銆乤rchived |
| `traffic_percent` | decimal_string | 锟?| 鐏板害娴侀噺鐧惧垎锟?|
| `config_hash` | string(128) | 锟?| 瑙勫垯闆嗗悎 hash |
| `published_at` | instant | 锟?| 鍙戝竷鏃堕棿 |
| `published_by` | int64 | 锟?| 鍙戝竷锟?|
| `rollback_from_profile_id` | int64 | 锟?| 鍥炴粴鏉ユ簮 |

绾︽潫锟?
- `uk_ai_routing_profile_policy_version(policy_id, profile_version)`
- `idx_ai_routing_profile_tenant_policy_status(tenant_id, organization_id, policy_id, release_status)`

### 8.7 `ai_routing_rule`

鐢ㄩ€旓細鍏蜂綋鍖归厤鏉′欢銆佸€欓€夋笭閬撻泦銆佹潈閲嶃€佺害鏉熷拰 fallback锟?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `profile_id` | int64 | 锟?| profile |
| `rule_code` | string(64) | 锟?| profile 鍐呭敮涓€ |
| `priority` | int32 | 锟?| 浼樺厛绾э紝瓒婂皬瓒婂厛鍖归厤 |
| `match_expression` | json | 锟?| 鏉′欢琛ㄨ揪寮忥紝蹇呴』锟?schema version |
| `target_model` | string(128) | 锟?| 鐩爣妯″瀷 |
| `candidate_channels` | json | 锟?| 鍊欓€夋笭閬撳拰鏉冮噸 |
| `fallback_chain` | json | 锟?| fallback 椤哄簭 |
| `constraints` | json | 锟?| 鎴愭湰銆佸尯鍩熴€佸欢杩熴€佽兘鍔涚害锟?|
| `rate_limit_policy_id` | int64 | 锟?| 闄愭祦绛栫暐 |
| `effective_from` | instant | 锟?| 鐢熸晥鏃堕棿 |
| `effective_to` | instant | 锟?| 澶辨晥鏃堕棿 |

绾︽潫锟?
- `uk_ai_routing_rule_profile_code(profile_id, rule_code)`
- `idx_ai_routing_rule_tenant_profile_priority(tenant_id, organization_id, profile_id, priority, status)`

### 8.8 `ai_routing_decision_log`

鐢ㄩ€旓細姣忎釜璇锋眰鐨勮矾鐢卞喅绛栬瘉鎹紝鍙敤浜庡璁°€佹垚鏈В閲娿€乫allback 澶嶇洏鍜屼簤璁鐞嗭拷?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `request_id` | string(128) | 锟?| 璇锋眰 ID |
| `trace_id` | string(128) | 锟?| trace |
| `api_key_id` | int64 | 锟?| `iam_gateway_api_key.id` 锟?`plus_api_key.id` 鏄犲皠 |
| `legacy_api_key_id` | int64 | 锟?| 浣跨敤 `plus_api_key` 鏃惰锟?|
| `policy_id` | int64 | 锟?| 鍛戒腑绛栫暐 |
| `profile_id` | int64 | 锟?| 鍛戒腑 profile |
| `rule_id` | int64 | 锟?| 鍛戒腑瑙勫垯 |
| `requested_model` | string(128) | 锟?| 璇锋眰妯″瀷 |
| `resolved_model` | string(128) | 锟?| 瑙ｆ瀽鍚庢ā锟?|
| `capability` | enum_int32 | 锟?| 鑳藉姏 |
| `selected_provider_id` | int64 | 锟?| Provider |
| `selected_channel_id` | int64 | 锟?| 娓犻亾 |
| `selected_account_id` | int64 | 锟?| Provider 璐﹀彿 |
| `decision_mode` | enum_int32 | 锟?| direct銆亀eighted銆乫allback銆乧anary銆乵anual |
| `decision_reason` | json | 锟?| 鍐崇瓥鍘熷洜锛屽惈 schema version |
| `candidate_snapshot` | json | 锟?| 鍊欓€夐泦蹇収 |
| `fallback_chain` | json | 锟?| fallback 锟?|
| `decision_latency_ms` | int32 | 锟?| 鍐崇瓥鑰楁椂 |
| `created_at` | instant | 锟?| 鍒涘缓鏃堕棿 |

绾︽潫锟?
- `uk_ai_routing_decision_log_uuid(uuid)`
- `uk_ai_routing_decision_log_request(tenant_id, organization_id, request_id)`
- `idx_ai_routing_decision_tenant_model_created(tenant_id, organization_id, requested_model, created_at, id)`
- `idx_ai_routing_decision_tenant_channel_created(tenant_id, organization_id, selected_channel_id, created_at, id)`

鐣欏瓨锛氶粯璁ゅ湪锟?180 澶╋紱浼佷笟鐗堝彲閰嶇疆锛涙秹鍙婁簤璁彲璁剧疆 `legal_hold`锟?
### 8.9 `ai_request_trace`

鐢ㄩ€旓細Provider 璋冪敤 attempt 锟?trace锛屽寘鎷姹傘€佸搷搴斻€侀敊璇€佸欢杩熴€乫allback 杩囩▼銆傝琛ㄤ笉鏄处鍔′簨瀹烇拷?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `request_id` | string(128) | 锟?| 璇锋眰 ID |
| `trace_id` | string(128) | 锟?| trace |
| `attempt_no` | int32 | 锟?| 绗嚑锟?attempt |
| `decision_log_id` | int64 | 锟?| 鍐崇瓥鏃ュ織 |
| `api_key_id` | int64 | 锟?| 鏍囧噯 Key ID |
| `legacy_api_key_id` | int64 | 锟?| 瀛橀噺 `plus_api_key.id` |
| `api_key_name_snapshot` | string(128) | 锟?| Key 鍚嶇О蹇収 |
| `channel_group_snapshot` | string(128) | 锟?| Key 鍒嗙粍蹇収 |
| `owner_type` | enum_int32 | 锟?| 褰掑睘涓讳綋 |
| `owner_id` | int64 | 锟?| 褰掑睘涓讳綋 ID |
| `owner_name_snapshot` | string(128) | 锟?| 鐢ㄦ埛鎴栦富浣撳睍绀哄悕蹇収 |
| `provider_id` | int64 | 锟?| Provider |
| `channel_id` | int64 | 锟?| 娓犻亾 |
| `channel_name_snapshot` | string(128) | 锟?| 娓犻亾鍚嶇О蹇収 |
| `channel_id` | int64 | 锟?| Provider 璐﹀彿 |
| `requested_model` | string(128) | 锟?| 璇锋眰妯″瀷 |
| `provider_model` | string(128) | 锟?| 涓婃父妯″瀷 |
| `endpoint` | string(256) | 锟?| API endpoint |
| `request_path` | string(256) | 锟?| 鍘熷璇锋眰璺緞 |
| `http_status` | int32 | 锟?| HTTP 鐘讹拷?|
| `provider_error_code` | string(128) | 锟?| 涓婃父閿欒锟?|
| `error_type` | enum_int32 | 锟?| timeout銆乺ate_limit銆乤uth銆乻erver銆乧lient銆乶etwork |
| `started_at` | instant | 锟?| 寮€锟?|
| `ended_at` | instant | 锟?| 缁撴潫 |
| `latency_ms` | int32 | 锟?| 寤惰繜 |
| `streaming` | bool | 锟?| 鏄惁娴佸紡 |
| `request_bytes` | int64 | 锟?| 璇锋眰澶у皬 |
| `response_bytes` | int64 | 锟?| 鍝嶅簲澶у皬 |
| `prompt_tokens` | int64 | 锟?| 杈撳叆 token |
| `completion_tokens` | int64 | 锟?| 杈撳嚭 token |
| `total_tokens` | int64 | 锟?| 锟?token |
| `request_payload_hash` | string(128) | 锟?| 璇锋眰 payload 鎽樿 |
| `response_payload_hash` | string(128) | 锟?| 鍝嶅簲 payload 鎽樿 |
| `error_message_masked` | string(1024) | 锟?| 鑴辨晱閿欒 |
| `reasoning_effort` | string(64) | 锟?| 鎺ㄧ悊寮哄害鎴栫被浼兼ā鍨嬮厤锟?|
| `client_ip_hash` | string(128) | 锟?| 瀹㈡埛锟?IP hash |
| `client_ip_masked` | string(64) | 锟?| 瀹㈡埛锟?IP 鑴辨晱灞曠ず锛屾敮锟?Usage/Admin Record 鍒楄〃 |
| `client_ip_region` | string(128) | 锟?| 瀹㈡埛锟?IP 瑙ｆ瀽鍖哄煙 |
| `user_agent_hash` | string(128) | 锟?| User-Agent hash锛屼笉淇濆瓨瀹屾暣 UA |

绾︽潫锟?
- `uk_ai_request_trace_request_attempt(tenant_id, organization_id, request_id, attempt_no)`
- `idx_ai_request_trace_tenant_trace(tenant_id, organization_id, trace_id)`
- `idx_ai_request_trace_api_key_started(tenant_id, organization_id, api_key_id, started_at, id)`
- `idx_ai_request_trace_model_started(tenant_id, organization_id, requested_model, started_at, id)`
- `idx_ai_request_trace_tenant_status_started(tenant_id, organization_id, status, started_at, id)`

### 8.9.1 `ai_quota_policy`

鐢ㄩ€旓細缁熶竴鎵胯浇 API Key銆佺敤鎴枫€佸垎缁勩€佹ā鍨嬨€両P銆佷复鏃朵富浣撶殑閰嶉鍜岄檺娴佺瓥鐣ワ紝鏀拺 Console API Key 棰濆害銆丄dmin RateLimit 锟?Token/Model/IP 闄愭祦锛屼笉鎶婇潪 int64 涓讳綋纭锟?`subject_id`锟?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `policy_code` | string(64) | 锟?| 绛栫暐缂栫爜 |
| `name` | string(128) | 锟?| 绛栫暐鍚嶇О |
| `subject_type` | enum_int32 | 锟?| api_key銆乽ser銆乬roup銆乵odel銆乮p銆乼enant 锟?|
| `subject_id` | int64 | 锟?| 鍙敤 int64 琛ㄨ揪鐨勪富锟?ID |
| `subject_ref_hash` | string(128) | 锟?| IP銆佸锟?token銆佸尶鍚嶄富浣撶瓑锟?int64 涓讳綋 hash |
| `subject_ref_masked` | string(128) | 锟?| 锟?int64 涓讳綋鑴辨晱灞曠ず |
| `scope_type` | enum_int32 | 锟?| tenant銆乷rganization銆乬roup銆乤pi_key銆乵odel |
| `scope_id` | int64 | 锟?| 浣滅敤锟?ID |
| `group_id` | int64 | 锟?| 妯″瀷鍒嗙粍锟?Key 鍒嗙粍 |
| `model` | string(128) | 锟?| 妯″瀷缁村害闄愭祦 |
| `quota_period` | enum_int32 | 锟?| second銆乵inute銆乨ay銆乵onth銆乴ifetime |
| `quota_unit` | enum_int32 | 锟?| request銆乼oken銆乧ost銆乮mage銆乨uration |
| `quota_limit` | decimal_string | 锟?| 閰嶉涓婇檺 |
| `requests_per_second` | int64 | 锟?| RPS |
| `requests_per_minute` | int64 | 锟?| RPM |
| `requests_per_day` | int64 | 锟?| RPD |
| `tokens_per_minute` | int64 | 锟?| TPM |
| `burst_limit` | decimal_string | 锟?| 绐佸彂棰濆害 |
| `block_duration_seconds` | int64 | 锟?| 瓒呴檺闃绘柇鏃堕暱 |
| `reset_mode` | enum_int32 | 锟?| fixed_window銆乻liding_window銆乧alendar銆乵anual |
| `exhausted_at` | instant | 锟?| 鏈€杩戣€楀敖鏃堕棿 |

绱㈠紩锟?
- `uk_ai_quota_policy_tenant_subject(tenant_id, organization_id, subject_type, subject_id, quota_period, quota_unit)`
- `idx_ai_quota_policy_subject_ref(tenant_id, organization_id, subject_type, subject_ref_hash, status)`
- `idx_ai_quota_policy_model_group(tenant_id, organization_id, model, group_id, status)`

### 8.10 `ai_usage`

鐢ㄩ€旓細缃戝叧璁¤垂鍞竴鐢ㄩ噺浜嬪疄銆傜粨绠椼€佹姤琛ㄣ€佽处鍔℃墸鍑忛兘浠ヨ琛ㄤ负鏉ユ簮锛岃€屼笉鏄互 trace銆乤ccess log 鎴栧墠绔粺璁′负鏉ユ簮锟?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `request_id` | string(128) | 锟?| 璇锋眰 ID |
| `trace_id` | string(128) | 锟?| trace |
| `decision_log_id` | int64 | 锟?| 鍐崇瓥鏃ュ織 |
| `api_key_id` | int64 | 锟?| 鏍囧噯 Key ID |
| `legacy_api_key_id` | int64 | 锟?| `plus_api_key.id` |
| `api_key_name_snapshot` | string(128) | 锟?| Key 鍚嶇О蹇収 |
| `channel_group_id` | int64 | 锟?| Key 鍒嗙粍 ID 蹇収 |
| `channel_group_snapshot` | string(128) | 锟?| Key 鍒嗙粍蹇収 |
| `owner_type` | enum_int32 | 锟?| 褰掑睘涓讳綋 |
| `owner_id` | int64 | 锟?| 褰掑睘涓讳綋 ID |
| `owner_name_snapshot` | string(128) | 锟?| 鐢ㄦ埛鎴栦富浣撳睍绀哄悕蹇収 |
| `model` | string(128) | 锟?| 缃戝叧妯″瀷 |
| `provider_id` | int64 | 锟?| Provider |
| `channel_id` | int64 | 锟?| 娓犻亾 |
| `channel_id` | int64 | 锟?| 璐﹀彿 |
| `modality` | enum_int32 | 锟?| text銆乮mage銆乿ideo銆乤udio銆乵usic銆乻fx |
| `usage_type` | enum_int32 | 锟?| text銆乮mage銆乤udio銆乿ideo銆乪mbedding銆乵oderation銆乵usic銆乻fx銆乤pi銆乻torage |
| `billing_type` | enum_int32 | 锟?| token銆乺equest銆乨uration銆乧ount銆乺esult銆乮tem銆乧haracter銆乻torage銆乥andwidth |
| `billing_mode` | enum_int32 | 锟?| token銆乸er_request銆乸er_result銆乸er_item銆乨uration銆乧haracter銆乻torage銆乥andwidth銆乼iered銆乪xpression |
| `billing_meter_id` | int64 | 锟?| `ai_billing_meter.id` |
| `billing_meter_code` | string(64) | 锟?| 璁￠噺琛ㄧ紪锟?|
| `billing_tier` | string(64) | 锟?| 鍛戒腑锟?tier label |
| `billable_quantity` | decimal_string | 锟?| 缁熶竴鍙璐规暟锟?|
| `billable_unit` | enum_int32 | 锟?| 缁熶竴璁¤垂鍗曚綅 |
| `prompt_tokens` | int64 | 锟?| 杈撳叆 token |
| `completion_tokens` | int64 | 锟?| 杈撳嚭 token |
| `cached_tokens` | int64 | 锟?| 缂撳瓨 token |
| `total_tokens` | int64 | 锟?| 锟?token |
| `request_count` | int64 | 锟?| 娆℃暟 |
| `result_count` | int64 | 锟?| 缁撴灉锟?|
| `item_count` | int64 | 锟?| 鏉＄洰锟?|
| `character_count` | int64 | 锟?| 瀛楃锟?|
| `image_count` | int64 | 锟?| 鍥剧墖锟?|
| `audio_seconds` | decimal_string | 锟?| 闊抽绉掓暟 |
| `video_seconds` | decimal_string | 锟?| 瑙嗛绉掓暟 |
| `storage_byte_hours` | decimal_string | 锟?| 瀛樺偍 byte-hour |
| `bandwidth_bytes` | int64 | 锟?| 缃戠粶娴侀噺瀛楄妭 |
| `unit_price_snapshot` | decimal_string | 锟?| 鍗曚环蹇収 |
| `base_input_unit_price` | decimal_string | 锟?| 杈撳叆鍩虹鍗曚环 |
| `base_output_unit_price` | decimal_string | 锟?| 杈撳嚭鍩虹鍗曚环 |
| `cache_read_unit_price` | decimal_string | 锟?| 缂撳瓨鍛戒腑鍗曚环 |
| `rate_multiplier` | decimal_string | 锟?| 璁¤垂鍊嶇巼 |
| `reference_multiplier` | decimal_string | 锟?| 鍙傝€冧环鍊嶇巼 |
| `official_reference_amount` | decimal_string | 锟?| 瀹樻柟鍙傝€冮噾锟?|
| `upstream_cost_amount` | decimal_string | 锟?| 涓婃父鎴愭湰閲戦 |
| `customer_charge_amount` | decimal_string | 锟?| 瀹㈡埛鏀惰垂閲戦 |
| `cost_amount` | decimal_string | 锟?| 鎴愭湰鎴栧簲鎵ｉ噾锟?|
| `currency` | string(10) | 锟?| 甯佺 |
| `pricing_id` | int64 | 锟?| `ai_model_pricing.id` |
| `pricing_plan_id` | int64 | 锟?| `ai_pricing_plan.id` |
| `pricing_plan_code` | string(64) | 锟?| 瀹氫环鏂规缂栫爜蹇収 |
| `pricing_rule_id` | int64 | 锟?| `ai_pricing_rule.id` |
| `pricing_tier_id` | int64 | 锟?| `ai_pricing_tier.id` |
| `pricing_snapshot` | json | 锟?| 浠锋牸蹇収 |
| `reasoning_effort` | string(64) | 锟?| 鎺ㄧ悊寮哄害鎴栫被浼兼ā鍨嬮厤锟?|
| `occurred_at` | instant | 锟?| 鐢ㄩ噺鍙戠敓鏃堕棿 |
| `settlement_status` | enum_int32 | 锟?| pending銆乻ettling銆乻ettled銆乫ailed銆乮gnored銆乧ompensated |
| `settlement_id` | int64 | 锟?| 鏈€杩戠粨绠楄锟?|

绾︽潫鍜岀储寮曪細

- `uk_ai_usage_uuid(uuid)`
- `uk_ai_usage_request(tenant_id, organization_id, request_id, usage_type)`
- `idx_ai_usage_tenant_owner_occurred(tenant_id, organization_id, owner_type, owner_id, occurred_at, id)`
- `idx_ai_usage_api_key_occurred(tenant_id, organization_id, api_key_id, occurred_at, id)`
- `idx_ai_usage_tenant_model_occurred(tenant_id, organization_id, model, occurred_at, id)`
- `idx_ai_usage_pricing_plan_occurred(tenant_id, organization_id, pricing_plan_id, occurred_at, id)`
- `idx_ai_usage_meter_occurred(tenant_id, organization_id, billing_meter_code, occurred_at, id)`
- `idx_ai_usage_settlement_status(tenant_id, organization_id, settlement_status, occurred_at, id)`

缁撶畻瑕佹眰锟?
- `cost_amount` 鍜屾墍鏈夐噾棰濆瓧娈靛繀椤绘槸 decimal锛屼笉鍏佽 float/double锟?- 鍚屼竴 `request_id + usage_type` 鐨勭敤閲忎簨瀹炲繀椤诲箓绛夛拷?- 缁撶畻澶辫触涓嶈兘鍒犻櫎浜嬪疄锛屽彧鑳芥洿鏂扮姸鎬佹垨鐢熸垚琛ュ伩璁板綍锟?- 缁撶畻锟?`commerce_account_ledger_entry` 鍚庯紝蹇呴』鎶婅处鎴锋祦锟?ID 璁板綍锟?`commerce_usage_settlement.account_ledger_entry_id`锟?
### 8.11 Playground 鐢熸垚璧勪骇濂戠害

`ai_generation_session/job/asset/action` 鏀拺 Playground 鐨勫妯℃€佸巻鍙层€侀瑙堛€佹敹钘忋€佷笅杞藉拰鍒嗕韩銆俙ai_generation_job` 淇濆瓨鐢熸垚浠诲姟鍜屽弬鏁板揩鐓э紝`ai_generation_asset` 淇濆瓨璧勪骇鎶曞奖锛宍ai_generation_asset_action` 淇濆瓨涓嬭浇銆佸垎浜€佹敹钘忋€侀噸缁樸€佹墿鍥俱€侀珮娓呯瓑琛屼负浜嬪疄锟?
缁嗚妭瑕佹眰锟?
- `ai_generation_asset` 锟?L3 澶勭悊锛宍prompt_snapshot`銆佸獟锟?URL銆佸垎浜姸鎬侀兘灞炰簬鐢ㄦ埛鐢熸垚鍐呭锛涙寔涔呭寲瀛楁涓嶈兘淇濆瓨闀挎湡鏈夋晥鐨勭锟?URL锟?- `visibility`銆乣favorite`銆乣shared`銆乣download_count` 鏄珮棰戠姸鎬佹姇褰憋紝鍙互锟?`ai_generation_asset_action` 閲嶅缓锟?- `share_token_hash` 鍙繚锟?hash锛涘叕寮€鍒嗕韩璁块棶闇€瑕佺煭锟?token 鎴栫綉鍏崇鍙戯拷?- `ai_generation_asset_action` 璁板綍 `client_ip_hash`銆乣client_ip_region`銆乣user_agent_hash`锛岀敤浜庡垎锟?涓嬭浇瀹¤锛屼笉淇濆瓨瀹屾暣 IP 锟?UA 鏄庢枃锟?
## 9. Commerce 鎶曞奖濂戠害

### 9.1 `commerce_usage_settlement`

鐢ㄩ€旓細鐢ㄩ噺浜嬪疄鍒版棦鏈夎处锟?绉垎/璁㈠崟/鏀粯浣撶郴鐨勭粨绠楁ˉ鎺ヨ瘉鎹€傚畠涓嶆槸浣欓浜嬪疄鏉ユ簮锟?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `settlement_no` | string(128) | 锟?| 缁撶畻鍗曞彿 |
| `usage_fact_id` | int64 | 锟?| `ai_usage.id` |
| `request_id` | string(128) | 锟?| 璇锋眰 ID |
| `account_id` | string(64) | 锟?| `commerce_account.id` |
| `account_ledger_entry_id` | string(64) | 锟?| `commerce_account_ledger_entry.id` |
| `order_id` | int64 | 锟?| `plus_order.id` |
| `payment_id` | int64 | 锟?| `plus_payment.id` |
| `asset_type` | string(32) | 锟?| points銆乧ash銆乼oken |
| `direction` | string(16) | 锟?| debit銆乧redit |
| `amount` | decimal_string | 锟?| 閲戦 |
| `points` | int64 | 锟?| 绉垎 |
| `tokens` | int64 | 锟?| token 锟?|
| `currency` | string(10) | 锟?| 甯佺 |
| `price_snapshot` | json | 锟?| 浠锋牸蹇収 |
| `settlement_status` | enum_int32 | 锟?| pending銆乸rocessing銆乻uccess銆乫ailed銆乧ompensated |
| `settled_at` | instant | 锟?| 缁撶畻瀹屾垚鏃堕棿 |
| `failure_code` | string(128) | 锟?| 澶辫触锟?|
| `failure_message` | string(512) | 锟?| 鑴辨晱澶辫触淇℃伅 |

绾︽潫锟?
- `uk_commerce_usage_settlement_uuid(uuid)`
- `uk_commerce_usage_settlement_no(settlement_no)`
- `uk_commerce_usage_settlement_usage(tenant_id, organization_id, usage_fact_id)`
- `idx_commerce_usage_settlement_tenant_status(tenant_id, organization_id, settlement_status, created_at, id)`
- `idx_commerce_usage_settlement_account(tenant_id, organization_id, account_id, created_at, id)`

### 9.2 `commerce_usage_pricing_plan`

鐢ㄩ€旓細鎶婄綉鍏虫ā鍨嬩环鏍笺€佸椁愩€丼KU銆乂IP 鏉冪泭鍜岀鎴风瓥鐣ュ叧鑱旇捣鏉ャ€傚畠涓嶆浛锟?`plus_product` 锟?`plus_sku`锟?
鍏抽敭瀛楁锛歚plan_code`銆乣plan_name`銆乣product_id`銆乣sku_id`銆乣vip_level_id`銆乣pricing_mode`銆乣included_quota`銆乣overage_pricing_id`銆乣effective_from`銆乣effective_to`锟?
绾︽潫锟?
- `uk_commerce_usage_pricing_plan_tenant_code(tenant_id, organization_id, plan_code)`
- `idx_commerce_usage_pricing_plan_product_status(tenant_id, organization_id, product_id, sku_id, status)`

### 9.3 `commerce_billing_export`

鐢ㄩ€旓細璐﹀崟瀵煎嚭浠诲姟鍜屽璁°€傚鍑烘枃浠跺簲鍦ㄥ璞″瓨鍌紝琛ㄤ腑鍙繚锟?manifest銆佽繃鏈熸椂闂村拰瀹¤淇℃伅锟?
鍏抽敭瀛楁锛歚export_no`銆乣export_type`銆乣period_start`銆乣period_end`銆乣file_manifest`銆乣file_hash`銆乣expire_at`銆乣download_count`銆乣created_by`銆乣approved_by`锟?
瀹夊叏瑕佹眰锛氬鍑鸿矾寰勫繀椤诲啓 `ops_audit_log`锛屾枃浠跺繀椤绘湁杩囨湡绛栫暐锟?
## 10. Ops 濂戠害

### 10.1 `ops_config_snapshot`

鐢ㄩ€旓細閰嶇疆鍙戝竷蹇収鍜屽洖婊氫緷鎹拷?
瀛楁锛歚snapshot_no`銆乣config_scope`銆乣config_type`銆乣source_table`銆乣source_ids`銆乣config_payload`銆乣config_hash`銆乣published_at`銆乣published_by`銆乣rollback_from_snapshot_id`锟?
绾︽潫锟?
- `uk_ops_config_snapshot_no(snapshot_no)`
- `idx_ops_config_snapshot_tenant_scope(tenant_id, organization_id, config_scope, config_type, created_at, id)`

### 10.2 `ops_audit_log`

鐢ㄩ€旓細鍚庡彴銆佺敤鎴枫€佺郴缁熼珮鍗辨搷浣滃璁★拷?
| 瀛楁 | 绫诲瀷 | 蹇呭～ | 璇存槑 |
| --- | --- | --- | --- |
| `operator_type` | enum_int32 | 锟?| user銆乤dmin銆乻ystem銆乯ob |
| `operator_id` | int64 | 锟?| 鎿嶄綔锟?|
| `operator_name_snapshot` | string(128) | 锟?| 鎿嶄綔浜哄揩鐓э紝鑴辨晱 |
| `action` | string(128) | 锟?| 鎿嶄綔 |
| `target_type` | string(128) | 锟?| 鐩爣绫诲瀷 |
| `target_id` | int64 | 锟?| 鐩爣 ID |
| `target_uuid` | string(64) | 锟?| 鐩爣 UUID |
| `request_id` | string(128) | 锟?| 璇锋眰 ID |
| `trace_id` | string(128) | 锟?| trace |
| `client_ip_hash` | string(128) | 锟?| IP 鎽樿 |
| `user_agent_hash` | string(128) | 锟?| UA 鎽樿 |
| `before_hash` | string(128) | 锟?| 鎿嶄綔鍓嶆憳锟?|
| `after_hash` | string(128) | 锟?| 鎿嶄綔鍚庢憳锟?|
| `change_summary` | json | 锟?| 鑴辨晱鍙樻洿鎽樿 |
| `risk_level` | enum_int32 | 锟?| low銆乵edium銆乭igh銆乧ritical |
| `approval_id` | int64 | 锟?| 瀹℃壒璁板綍 |

绱㈠紩锟?
- `idx_ops_audit_log_tenant_operator_created(tenant_id, organization_id, operator_type, operator_id, created_at, id)`
- `idx_ops_audit_log_tenant_target_created(tenant_id, organization_id, target_type, target_id, created_at, id)`
- `idx_ops_audit_log_request(tenant_id, organization_id, request_id)`

### 10.3 `ops_outbox_event`

鐢ㄩ€旓細鏈湴浜嬪姟鍚庡彲闈犲彂甯冧簨浠讹拷?
瀛楁锛歚event_id`銆乣aggregate_type`銆乣aggregate_id`銆乣aggregate_uuid`銆乣event_type`銆乣event_version`銆乣event_payload`銆乣payload_hash`銆乣headers`銆乣publish_status`銆乣retry_count`銆乣next_retry_at`銆乣published_at`銆乣failure_reason`锟?
绾︽潫锟?
- `uk_ops_outbox_event_id(event_id)`
- `idx_ops_outbox_event_status_retry(publish_status, next_retry_at, created_at, id)`
- `idx_ops_outbox_event_aggregate(aggregate_type, aggregate_id, created_at, id)`

### 10.4 `ops_inbox_event`

鐢ㄩ€旓細娑堣垂鏂规秷鎭幓閲嶅拰澶勭悊鐘舵€佽褰曪拷?
瀛楁锛歚source_system`銆乣message_id`銆乣consumer_name`銆乣event_type`銆乣event_version`銆乣payload_hash`銆乣process_status`銆乣retry_count`銆乣processed_at`銆乣failure_reason`锟?
绾︽潫锟?
- `uk_ops_inbox_event_message(source_system, message_id, consumer_name)`
- `idx_ops_inbox_event_status_retry(process_status, created_at, id)`

## 11. Portal 鍐呭濂戠害

闂ㄦ埛鍐呭涓嶈繘鍏ョ綉鍏崇儹璺緞锛屾寜 L2 璁捐鍗冲彲锟?
| 锟?| 鐢拷?| 鍏抽敭瀛楁 |
| --- | --- | --- |
| `appstore_app` | AppCenter/platform_app 涓绘暟锟?| `name`銆乣icon_resource_snapshot`銆乣resource_list`銆乣project_id`銆乣description`銆乣version`銆乣access_url`銆乣config`銆乣status`銆乣app_type`銆乣platforms`銆乣install_platforms`銆乣install_skill`銆乣install_config`銆乣release_notes`銆乣package_name`銆乣bundle_id`銆乣store_url`銆乣download_url`锛汚PI/view model 杈撳嚭 `icon`銆乣cover`銆乣screenshots` 锟?`MediaResource` 瀵硅薄 |
| `plus_agent_skill` | SkillsHub/AgentSkill 涓绘暟锟?| `skill_key`銆乣name`銆乣summary`銆乣description`銆乣icon_resource_snapshot`銆乣cover_resource_snapshot`銆乣category_id`銆乣package_id`銆乣provider`銆乣version`銆乣manifest_url`銆乣license_name`銆乣market_status`銆乣visibility`銆乣review_status`銆乣install_count`銆乣rating_avg`銆乣capabilities`銆乣default_config`銆乣latest_published_at` |
| `plus_agent_skill_package` | 鎶€鑳藉寘/闆嗗悎 | `package_key`銆乣name`銆乣summary`銆乣description`銆乣icon_resource_snapshot`銆乣cover_resource_snapshot`銆乣category_id`銆乣enabled`銆乣featured`銆乣sort_weight`銆乣tags`銆乣latest_published_at` |
| `plus_user_agent_skill` | 鐢ㄦ埛鎶€鑳藉畨瑁呬笌閰嶇疆 | `user_id`銆乣skill_id`銆乣enabled`銆乣config`銆乣installed_at`銆乣last_enabled_at`銆乣last_used_at`銆乣used_count` |
| `plus_category` | 鎶€鑳藉垎锟?| `name`銆乣description`銆乣type`銆乣code`銆乣icon`銆乣sort_weight`銆乣parent_id`銆乣path`銆乣visible`銆乣status` |
| `studio_catalog_action` | 搴旂敤/鎶€鑳借涓轰簨锟?| `target_type`銆乣target_id`銆乣release_id`銆乣action_type`銆乣rating_score`銆乣review_body` |
| `content_announcement` | 鍏憡 | `title`銆乣content`銆乣audience_scope`銆乣effective_from`銆乣effective_to`銆乣pinned` |
| `content_openapi_snapshot` | API Reference 鐗堟湰蹇収 | `api_system`銆乣version`銆乣source_ref`銆乣openapi_hash`銆乣endpoint_count`銆乣category_tree` |
| `content_sdk_release` | SDK Reference 鍙戝竷娓呭崟 | `api_system`銆乣language`銆乣language_icon`銆乣language_description`銆乣package_name`銆乣version`銆乣install_command`銆乣import_code`銆乣init_code`銆乣example_code`銆乣github_url`銆乣artifact_manifest` |
| `content_forum_post` | 璁哄潧甯栧瓙 | `title`銆乣body`銆乣category`銆乣author_id`銆乣view_count`銆乣reply_count`銆乣last_replied_at` |
| `content_forum_comment` | 璇勮 | `target_type`銆乣target_id`銆乣post_id`銆乣course_id`銆乣parent_id`銆乣body`銆乣author_id` |
| `content_reaction` | 鍐呭浜掑姩浜嬪疄 | `target_type`銆乣target_id`銆乣reaction_type`銆乣reaction_value`銆乣cancelled_at` |
| `content_course` | 璇剧▼ | `course_code`銆乣title`銆乣summary`銆乣thumbnail_resource_snapshot`銆乣level`銆乣published_at`锛汚PI/view model 杈撳嚭 `thumbnail` 锟?`MediaResource` 瀵硅薄 |
| `content_course_section` | 璇剧▼绔犺妭鍒嗙粍 | `course_id`銆乣section_no`銆乣title`銆乣sort_order`銆乣lesson_count`銆乣duration_seconds` |
| `content_course_lesson` | 璇剧▼璇炬椂 | `course_id`銆乣section_id`銆乣lesson_no`銆乣title`銆乣video_resource_snapshot`銆乣external_bvid`銆乣duration_seconds`锛汚PI/view model 杈撳嚭 `video` 锟?`MediaResource` 瀵硅薄 |

鍐呭琛ㄥ悓鏍疯锟?`tenant_id`銆乣organization_id`銆乣status`銆乣created_at`銆乣updated_at`銆乣version`锛屼絾涓嶅弬涓庤处锟?缁撶畻浜嬪姟锟?
## 12. 鏁版嵁娴佸拰浜嬪姟杈圭晫

### 12.1 閰嶇疆鍙戝竷浜嬪姟

```text
admin/backend API
  -> validate permission
  -> write integration_/ai_/iam_ config tables
  -> write ops_config_snapshot
  -> write ops_outbox_event in same transaction
  -> gateway cache consumer writes ops_inbox_event
  -> gateway hot cache refresh
```

閰嶇疆鍙戝竷鎴愬姛鐨勫垽瀹氫笉鏄€滄暟鎹簱鍐欏叆鎴愬姛鈥濓紝鑰屾槸锟?
- 閰嶇疆涓昏〃浜嬪姟鎻愪氦鎴愬姛锟?- outbox 浜嬩欢鍒涘缓鎴愬姛锟?- 鑷冲皯涓€涓帶鍒堕潰娑堣垂鑰呯‘璁ゅ彂甯冿拷?- Gateway 鐑矾寰勭紦瀛樻毚闇叉柊 `config_hash`锟?
### 12.2 璇锋眰璁¤垂浜嬪姟

```text
/v1 request
  -> key auth
  -> route decision
  -> provider attempts
  -> ai_routing_decision_log
  -> ai_request_trace
  -> ai_usage
  -> settlement worker
  -> commerce_usage_settlement
  -> commerce_account / commerce_account_ledger_entry by appbase commerce account service
```

浜嬪姟杈圭晫锟?
- Gateway 璇锋眰鍝嶅簲涓嶈兘绛夊緟闀挎湡缁撶畻浜嬪姟锟?- `ai_usage` 蹇呴』鍙湪澶辫触鍚庨噸鏀剧粨绠楋拷?- `commerce_usage_settlement` 锟?`usage_fact_id` 鍞竴锛岄槻姝㈤噸澶嶆墸璐癸拷?- `commerce_account_ledger_entry` 鏄祫锟?绉垎鏈€缁堟祦姘翠簨瀹烇紝涓嶈兘锟?`commerce_usage_settlement` 鏇夸唬锟?
### 12.3 澶辫触琛ュ伩

| 澶辫触锟?| 澶勭悊鏂瑰紡 |
| --- | --- |
| Provider 璋冪敤澶辫触 | `ai_request_trace` 璁板綍澶辫触 attempt锛涜嫢 fallback 鎴愬姛锛宍ai_usage` 鍙褰曟渶缁堝彲璁¤垂鐢ㄩ噺 |
| usage fact 鍐欏叆澶辫触 | 鏈湴鍙潬闃熷垪锟?outbox 琛ュ啓锛涜姹備晶杩斿洖涓嶅簲浼€犵敤锟?|
| 缁撶畻澶辫触 | `ai_usage.settlement_status=failed`锛宍commerce_usage_settlement` 淇濆瓨澶辫触鐮侊紝worker 閲嶈瘯 |
| 閲嶅缁撶畻 | `uk_commerce_usage_settlement_usage` 闃绘柇锛涜处鎴锋湇锟?idempotency key 闃绘柇 |
| 璐︽埛鎵ｅ噺鎴愬姛浣嗗洖锟?settlement 澶辫触 | 閫氳繃 `commerce_account_ledger_entry.transaction_no` 锟?`settlement_no` 瀵硅处淇 |

## 13. 鐘舵€佹満

### 13.1 閫氱敤閰嶇疆鐘讹拷?
| 锟?| 鍚嶇О | 鍚箟 |
| ---: | --- | --- |
| 0 | DRAFT | 鑽夌 |
| 1 | ACTIVE | 鐢熸晥 |
| 2 | DISABLED | 绂佺敤 |
| 3 | ARCHIVED | 褰掓。 |
| 4 | DELETED | 杞垹锟?|

### 13.2 缁撶畻鐘讹拷?
| 锟?| 鍚嶇О | 鍚箟 |
| ---: | --- | --- |
| 0 | PENDING | 寰呯粨锟?|
| 1 | PROCESSING | 澶勭悊锟?|
| 2 | SUCCESS | 鎴愬姛 |
| 3 | FAILED | 澶辫触鍙噸锟?|
| 4 | IGNORED | 涓嶈璐规垨琚拷锟?|
| 5 | COMPENSATED | 宸茶ˉ锟?|

### 13.3 Outbox/Inbox 鐘讹拷?
| 锟?| 鍚嶇О | 鍚箟 |
| ---: | --- | --- |
| 0 | PENDING | 寰呭彂锟?寰呮秷锟?|
| 1 | PROCESSING | 澶勭悊锟?|
| 2 | SUCCESS | 鎴愬姛 |
| 3 | FAILED | 澶辫触鍙噸锟?|
| 4 | DEAD | 瓒呰繃閲嶈瘯杩涘叆姝讳俊 |

鏋氫妇鍦ㄦ暟鎹簱鍙敤 int32 瀛樺偍锛屽湪 API/SDK 鍙毚闇茬ǔ瀹氬瓧绗︿覆锟?Java 鏍囧噯 DTO 绾﹀畾鍊硷紝浣嗗繀椤绘敮鎸佹湭鐭ュ€煎拰鍚戝墠鍏煎锟?
## 14. 鍒嗗尯銆佺储寮曞拰鐣欏瓨

| 锟?| 鍒嗗尯锟?| 鍦ㄧ嚎鐣欏瓨 | 鍐峰綊锟?| 绱㈠紩棰勭畻 |
| --- | --- | ---: | ---: | ---: |
| `ai_usage` | `occurred_at` 鏈堝垎锟?| 24 涓湀 | 5 锟?| 6 |
| `ai_request_trace` | `started_at` 锟?鏈堝垎锟?| 90-180 锟?| 1 锟?| 5 |
| `ai_routing_decision_log` | `created_at` 鏈堝垎锟?| 180 锟?| 2 锟?| 5 |
| `ops_audit_log` | `created_at` 鏈堝垎锟?| 24 涓湀 | 5 骞存垨鍚堣瑕佹眰 | 6 |
| `ops_outbox_event` | `created_at` 鏈堝垎锟?| 鎴愬姛 30-90 澶╋紱澶辫触淇濈暀 | 1 锟?| 5 |
| `ops_inbox_event` | `created_at` 鏈堝垎锟?| 180 澶╂垨澶т簬娑堟伅閲嶆斁绐楀彛 | 1 锟?| 4 |
| `integration_provider_health_snapshot` | `created_at` 锟?鏈堝垎锟?| 30-90 锟?| 1 锟?| 4 |

绱㈠紩瑙勫垯锟?
- 绉熸埛鍦ㄧ嚎鏌ヨ绱㈠紩蹇呴』锟?`tenant_id, organization_id` 寮€澶达拷?- 鍒楄〃椤典娇锟?`status, updated_at, id` 锟?`status, created_at, id`锛屾敮鎸佹父鏍囩炕椤碉拷?- 鍞竴閿繀椤诲拰涓氬姟杈圭晫涓€鑷达紝渚嬪绉熸埛锟?code 鍞竴銆佸叏灞€ provider code 鍞竴銆佹秷鎭秷璐逛笁鍏冪粍鍞竴锟?- JSON 瀛楁涓嶆壙杞介噾棰濄€佺姸鎬併€佺鎴枫€佹潈闄愩€佸箓绛夌瓑鏍稿績瀛楁锟?- 鏃ュ織浜嬪疄琛ㄧ姝负浜嗕复鏃舵煡璇㈡棤闄愬姞绱㈠紩锛涗綆棰戝垎鏋愯繘鍏ユ暟浠撴垨鎼滅储绱㈠紩锟?
## 15. 澶氭暟鎹簱鏂硅█鏄犲皠

| 閫昏緫绫诲瀷 | PostgreSQL | MySQL/MariaDB | SQLite | API/SDK |
| --- | --- | --- | --- | --- |
| int64 | BIGINT | BIGINT | INTEGER | string |
| int32 enum | INTEGER | INT | INTEGER | string 锟?int锛屾寜 OpenAPI 鏍囧噯澹版槑 |
| decimal | NUMERIC(18,6) 鎴栨洿锟?| DECIMAL(18,6) 鎴栨洿锟?| TEXT 锟?NUMERIC | string |
| instant | TIMESTAMP WITH TIME ZONE 锟?TIMESTAMP UTC | DATETIME(3/6) UTC | TEXT ISO8601 UTC | ISO8601 UTC string |
| json | JSONB | JSON | TEXT + JSON 鏍￠獙 | object |
| bool | BOOLEAN | BOOLEAN/TINYINT | INTEGER | boolean |

閮ㄧ讲瑕佹眰锟?
- 鏈湴妗岄潰鍙敤 SQLite锛屼絾涓嶈兘鏀瑰彉瀛楁璇箟锛沝ecimal 锟?API 涓粛锟?string锟?- Server/Docker/K8S 鎺ㄨ崘 PostgreSQL锟?- `ops_gateway_instance.deployment_mode/runtime_type/orchestrator` 璁板綍 local_desktop銆乻erver銆乨ocker銆乲8s 绛夐儴缃插舰鎬侊紱妗岄潰璁惧銆佸鍣ㄣ€丳od銆丯ode 鍙瓨 hash 鎴栬劚鏁忔爣绛撅拷?- `ops_gateway_heartbeat.uptime_seconds/disk_percent/open_file_count/thread_count` 鏀拺 Admin Monitor 鑺傜偣椤碉紝涓嶄緷璧栧悇閮ㄧ讲骞冲彴鐨勪笓鏈夋寚鏍囧瓧娈碉拷?- 鍒嗗尯銆佺墿鍖栬鍥俱€侀儴鍒嗙储寮曞睘浜庣墿鐞嗕紭鍖栵紝涓嶈兘鎴愪负鍏叡濂戠害鐨勫敮涓€璇箟鏉ユ簮锟?
## 16. 瀹夊叏鍜岄殣锟?
### 16.1 瀵嗛挜

- Provider API key銆丱Auth refresh token銆佺閽ヤ笉杩涘叆涓氬姟琛拷?- `integration_provider_account.secret_ref` 鎸囧悜 Vault銆並MS銆佺郴锟?Keychain 鎴栧畨鍏ㄩ厤缃腑蹇冿拷?- `iam_gateway_api_key.key_hash` 浣跨敤 HMAC-SHA256 鎴栫粍缁囨壒鍑嗙畻娉曪紝pepper 涓嶅叆搴擄拷?- 鍒涘缓 API Key 鏃舵槑鏂囧彧杩斿洖涓€娆★紱鍚庡彴涓嶈兘鍐嶆璇诲彇鏄庢枃锟?
### 16.2 瀹¤

浠ヤ笅鎿嶄綔蹇呴』锟?`ops_audit_log`锟?
- 鍒涘缓銆佺鐢ㄣ€佸垹锟?API Key锟?- 鏂板銆佷慨鏀广€佽疆锟?Provider 璐﹀彿锟?- 淇敼璺敱绛栫暐銆佺伆搴︺€乫allback銆侀檺娴併€佽璐逛环鏍硷拷?- 鐢ㄦ埛浣欓銆佺Н鍒嗐€乂IP銆佸厖鍊笺€侀€€娆剧瓑鍚庡彴鎿嶄綔锟?- 瀵煎嚭璐﹀崟銆佸璁℃棩蹇椼€佺敤鎴锋暟鎹拷?- 淇敼閮ㄧ讲绾у畨鍏ㄩ厤缃€佷唬鐞嗛厤缃€佽法锟?鍖哄煙绛栫暐锟?
### 16.3 PII 鍜岃储鍔℃暟锟?
- PII 浠嶄互 `plus_user*` 鏃㈡湁鍔犲瘑/鑴辨晱绛栫暐涓哄噯锟?- 璐㈠姟鏁版嵁浠嶄互 `plus_account*`銆乣plus_order*`銆乣plus_payment*`銆乣plus_refund`銆乣plus_invoice*` 涓哄噯锟?- 鏂拌〃涓彧淇濆瓨蹇呰锟?user_id銆乷wner_id銆乤ccount_id銆乤ccount_ledger_entry_id 寮曠敤锛屼笉澶嶅埗鎵嬫満鍙枫€侀偖绠便€佸湴鍧€銆佹敮浠樻槑缁嗭拷?
## 17. API/SDK 搴忓垪鍖栧锟?
| 鏁版嵁绫诲瀷 | API 琛ㄨ揪 | 鍘熷洜 |
| --- | --- | --- |
| `id`銆乣tenant_id`銆乣organization_id`銆乣user_id`銆乣owner_id`銆乣*_id` | string | 閬垮厤 JavaScript int64 绮惧害涓㈠け |
| decimal 閲戦/浠锋牸/姣斾緥 | string | 閬垮厤娴偣璇樊 |
| instant | ISO8601 UTC string | 閬垮厤鏃跺尯姝т箟 |
| enum | OpenAPI 鏄庣‘瀹氫箟锛涗繚锟?unknown | 鏀寔鍓嶅悗绔拰澶氳瑷€ SDK 婕旇繘 |
| JSON 蹇収 | object锛屽寘锟?`schema_version` | 鏀寔鍥炴斁鍜屽吋锟?|

app/backend API 鐨勮矾寰勫拰杩斿洖鍖呰蹇呴』锟?Java 鏍囧噯涓€鑷达細

- 鐢ㄦ埛闈細`/app/v3/api/{resource-path}`锛岃繑锟?`SdkWorkApiResponse`锟?- 绠＄悊闈細`/backend/v3/api/{resource-path}`锛岃繑锟?`SdkWorkApiResponse`锟?- OpenAI 鍏煎闈細`/v1/*`锛屼笉鍖呰 `SdkWorkApiResponse`锛坄x-sdkwork-wire-protocol: external`锛夛拷?
## 18. CI 鍜岃瘎瀹￠棬锟?
### 18.1 鏂拌〃闂ㄧ

鏂拌〃杩涘叆杩佺Щ鍓嶅繀椤婚€氳繃浠ヤ笅妫€鏌ワ細

- 琛ㄥ悕鍓嶇紑鍦ㄥ墠缂€娉ㄥ唽琛ㄤ腑锟?- 琛ㄥ悕绗竴娈典笉鏄骇鍝佸悕銆侀」鐩悕銆佸叕鍙稿悕鎴栨妧鏈爤鍚嶏拷?- 宸插０锟?profile銆乧ompliance_level銆乻ystem_of_record銆亀rite_owner锟?- L2/L3 琛ㄥ寘锟?`tenant_id`銆乣organization_id`銆乣created_at`銆乣updated_at`銆乣version`锟?- L3 琛ㄥ０鏄庣暀瀛樸€佸璁°€佸畨鍏ㄥ垎绫汇€乺unbook锟?- 閲戦/浠锋牸涓嶄娇锟?float/double锟?- 楂橀鏌ヨ瀛楁涓嶆槸鍙斁锟?JSON 涓拷?- 骞傜瓑瀛楁鏈夊敮涓€绾︽潫锟?- app/backend DTO 锟?int64/decimal 浣跨敤 string 鎴栫瓑浠峰畨鍏ㄥ簭鍒楀寲锟?
### 18.2 绂佺敤鍓嶇紑闂ㄧ

DDL銆佸绾︺€丒ntity 鏂板琛ㄤ笉寰椾娇鐢ㄤ互涓嬩笟鍔″墠缂€锟?
- `claw_`
- `router_`
- `sdkwork_`

杩欎簺璇嶅彲浠ュ嚭鐜板湪浜у搧鏂囨銆佹敞閲婃垨鈥滅姝㈡竻鍗曗€濅腑锛屼絾涓嶈兘浣滀负鏂颁笟鍔¤〃绗竴娈碉拷?
### 18.3 瀛橀噺鏇夸唬琛ㄩ棬锟?
CI 搴旈樆鏂互涓嬪悓涔夋浛浠ｈ〃锟?
- 鐢ㄦ埛鏇夸唬琛細`iam_user`銆乣iam_user_oauth_account`锟?- 璐︽埛鏇夸唬琛細`commerce_account`銆乣commerce_account_history`锟?- VIP/绉垎鏇夸唬琛細`commerce_vip_user`銆乣commerce_vip_recharge`銆乣commerce_vip_point_change`锟?- 鍗″埜鏇夸唬琛細浠讳綍锟?`promotion_` 鍛藉悕鐨勫埜瀹氫箟銆佸埜瀹炰緥銆佺敤鎴峰埜鍜屾牳閿€涓昏〃锟?- 璁㈠崟鏀粯鏇夸唬琛細`commerce_order`銆乣commerce_payment`銆乣commerce_refund`銆乣commerce_invoice`锟?
### 18.4 鏂囨。鍒板疄鐜板悓姝ラ棬锟?
浠讳綍瀛楁鍙樻洿蹇呴』鍚屾椂鏇存柊锟?
1. 鏈暟鎹绾︼拷?2. DDL 杩佺Щ锟?3. ORM/Entity锟?4. app/backend OpenAPI锟?5. 鐢熸垚 SDK锟?6. 鏁版嵁鍚屾銆佹暟浠撱€佹悳绱㈡垨缂撳瓨鏄犲皠锟?7. 瀹夊叏瀹¤鍜岀暀瀛樼瓥鐣ワ拷?
## 19. 瀹炴柦璺嚎

### 19.1 P0 鏁版嵁闂幆

1. 寤虹珛 schema registry 鏂囦欢鎴栫瓑锟?Markdown/YAML 濂戠害锟?2. 钀藉湴 Provider銆丆hannel銆丳rovider Account銆丆hannel Model锟?3. 钀藉湴 Model銆丷outing Policy/Profile/Rule锟?4. 钀藉湴 Decision Log銆丷equest Trace銆乁sage Fact锟?5. 钀藉湴 Audit Log銆丱utbox銆両nbox锟?6. 鎺ュ叆 app/backend API SDK锛屼繚璇佽矾寰勫拰 DTO 锟?Java 鏍囧噯涓€鑷达拷?
### 19.2 P1 鐢熶骇澧炲己

1. 瀹屾垚 `plus_api_key` 锟?`iam_gateway_api_key` 鐨勬渶缁堣矾绾胯瘎瀹★拷?2. 钀藉湴璁块棶绛栫暐銆侀厤棰濈瓥鐣ャ€佹ā鍨嬩环鏍硷拷?3. 钀藉湴 `commerce_usage_settlement`锛屼覆鑱旀棦鏈夎处锟?VIP/浜ゆ槗鏈嶅姟锟?4. 钀藉湴閰嶇疆蹇収鍜屽彂甯冨洖婊氾拷?5. 鎺ュ叆鍒嗗尯銆佸綊妗ｃ€佹參鏌ヨ鍜屾暟鎹川閲忓贰妫€锟?
### 19.3 P2/P3 瑙勬ā锟?
1. 闂ㄦ埛鍐呭銆佸簲鐢ㄤ腑蹇冦€佹妧鑳戒腑蹇冨唴瀹硅〃锟?2. 璐﹀崟瀵煎嚭銆佸仴搴峰揩鐓с€佸憡璀︺€佷换鍔★拷?3. K8S Cell/Region 涓嬬殑浜嬩欢娴併€佽妯″瀷銆佸喎鐑垎灞傚拰锟?Region 鏁版嵁娌荤悊锟?
## 20. 璇勫缁撹

鏈疆鏁版嵁璁捐寤鸿閲囩敤锟?
- 瀛橀噺鏍稿績涓氬姟浜嬪疄琛細涓ユ牸澶嶇敤 `plus_*`锛屼笉鏀圭粨鏋勶紝涓嶅缓鏇夸唬琛拷?- 缃戝叧鏂板閰嶇疆鍜屼簨瀹烇細浣跨敤 `iam_`銆乣integration_`銆乣ai_`銆乣commerce_`銆乣studio_`銆乣content_`銆乣ops_` 鏍囧噯鍓嶇紑锟?- 璐﹀姟闂幆锛歚ai_usage` 鏄敤閲忎簨瀹烇紝`commerce_usage_settlement` 鏄粨绠楁ˉ鎺ワ紝`commerce_account_ledger_entry` 鏄渶缁堣处鎴锋祦姘翠簨瀹烇拷?- 瀵嗛挜闂幆锛欿ey 鏄庢枃涓嶈惤搴擄紝Provider secret 鍙繚瀛樺紩鐢紝鎵€鏈夐珮鍗辨搷浣滃啓 `ops_audit_log`锟?- 閮ㄧ讲闂幆锛氬洓绉嶉儴缃插舰鎬佸叡浜悓涓€鏁版嵁濂戠害锛屽樊寮傚彧鍦ㄦ暟鎹簱鏂硅█銆佸垎鍖鸿兘鍔涖€佸瘑閽ュ瓨鍌ㄥ拰杩愮淮鍙傛暟锟?
