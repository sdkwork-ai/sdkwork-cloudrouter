> Migrated from `docs/05-鏁版嵁搴撹锟?md` on 2026-06-24.
> Owner: SDKWork maintainers

## 1. 璁捐渚濇嵁

鏁版嵁搴撹璁′互鏈」鐩牴鐩綍锟?[../DATABASE_SPEC.md](../DATABASE_SPEC.md) 涓哄己绾︽潫銆傝瑙勮寖瑕佹眰锟?
- 鏂拌〃鍏堝啓鏁版嵁濂戠害锛屽啀鐢熸垚鎴栨牎锟?DDL銆丱RM銆丏TO銆丼DK锟?- 鏂颁笟鍔¤〃绗竴娈靛繀椤绘槸鍙楁帶涓氬姟妯″潡鍓嶇紑锛屼笉鑳戒娇鐢ㄤ骇鍝佸悕銆侀」鐩悕鎴栨妧鏈爤鍚嶏拷?- 澶氱鎴枫€佽处鎴枫€佹潈闄愩€佹秷鎭€乄ebhook銆佽法鏈嶅姟鍐欏叆琛ㄨ嚦锟?L2锟?- 璧勯噾銆佸嚟璇併€侀殣绉併€佹硶鍔＄暀瀛樸€佸叧閿璁¤〃锟?L3 璁捐锟?- `id` 涓哄唴锟?int64锛孉PI 搴忓垪鍖栦负 string锟?- 閲戦浣跨敤 decimal锛孉PI 搴忓垪鍖栦负 string锟?- 鏂拌〃楂橀绉熸埛绱㈠紩蹇呴』锟?`tenant_id` 寮€濮嬶拷?
鍓嶇椤甸潰绾ц鐩栧拰鍙牎楠岃〃濂戠害锟?[13-椤甸潰绾ф暟鎹粨鏋勮鐩栦笌SchemaRegistry钀藉湴璁捐.md](./13-椤甸潰绾ф暟鎹粨鏋勮鐩栦笌SchemaRegistry钀藉湴璁捐.md)銆乕14-鏁版嵁缁撴瀯缁嗚妭澶嶆牳涓庤ˉ寮鸿锟?md](./14-鏁版嵁缁撴瀯缁嗚妭澶嶆牳涓庤ˉ寮鸿锟?md) 锟?[schema-registry/sdkwork-clawrouter.tables.yaml](./schema-registry/sdkwork-clawrouter.tables.yaml) 涓哄噯銆傛湰鏂囧畾涔夋€讳綋鏁版嵁搴撶瓥鐣ワ紝Registry 瀹氫箟鍚庣画 DDL銆丒ntity銆丏TO銆丱penAPI銆丼DK 鐨勪笂娓稿绾︼拷?
## 2. 琛ㄧ粨鏋勬€讳綋绛栫暐

`sdkwork-clawrouter` 鏁版嵁搴撳垎涓ょ被锟?
| 绫诲瀷 | 琛ㄥ悕 | 绛栫暐 |
| --- | --- | --- |
| 瀛橀噺鍏煎锟?| `legacy-java-plus-entity` 涓殑 `plus_*` 锟?| 淇濇寔鐗╃悊琛ㄥ悕銆佸瓧娈点€佺储寮曘€佸疄浣撶粨鏋勫畬鍏ㄤ竴鑷达紝涓嶅湪 claw-router 涓垱寤烘浛浠ｈ〃 |
| 鏂版爣鍑嗚〃 | claw-router 鏂板鑳藉姏锟?| 锟?`DATABASE_SPEC.md` 浣跨敤 `ai_`銆乣integration_`銆乣iam_`銆乣commerce_`銆乣studio_`銆乣content_`銆乣ops_` 鍓嶇紑 |

閲嶈瑁佸喅锟?
- 鐢ㄦ埛銆乂IP銆乤ccount銆佷紭鎯犲埜銆佺Н鍒嗗厖鍊笺€佽鍗曘€佹敮浠樸€侀€€娆俱€佸彂绁ㄧ瓑蹇呴』浣跨敤鏃㈡湁 `plus_*` 琛拷?- 鏁版嵁搴撹璁℃ā鍨嬮噰锟?Java Entity first锛氫换浣曟柊琛ㄨ繘鍏ヨ璁″墠锛屽繀椤诲厛锟?`legacy-java-plus-entity` 妫€绱㈡槸鍚﹀凡锟?`Plus*` Entity锛涜嫢瀛樺湪锛屽垯鐧昏鏃㈡湁 `plus_*` 琛ㄤ负 L0 legacy compatible锛岀墿鐞嗙粨鏋勪繚鎸佸畬鍏ㄤ竴鑷达紝涓嶅緱鏂板缓鍚屼箟鏇夸唬琛拷?- 鏂板缃戝叧璺敱銆丳rovider銆乽sage fact銆乨ecision log銆乷ps event銆乻ecret reference 绛変娇鐢ㄦ爣鍑嗗墠缂€琛拷?- 瀛橀噺 `plus_*` 琛ㄥ湪鏈郴缁熶腑瑙嗕负 L0 legacy compatible锛屼絾涓嶅緱鍥犱负鏈疆璁捐鑷姩鏀瑰悕锟?- 濡傛灉鏈潵瑕佹妸 `plus_*` 杩佺Щ锟?`iam_`銆乣commerce_` 绛夋爣鍑嗗悕锛屽繀椤诲彟璧疯縼绉婚」鐩紝璁捐鍏煎瑙嗗浘銆佸弻鍐欍€佸洖濉€佹牎楠屻€佸洖婊氬拰鍓嶆粴鏂规锟?
## 3. 蹇呴』淇濇寔涓€鑷寸殑瀛橀噺锟?
浠ヤ笅琛ㄦ潵锟?`legacy-java-plus-entity`锛宑law-router 鍙兘寮曠敤鎴栬皟鐢ㄥ锟?service/repository锛屼笉寰楀垱寤哄悓涔夋浛浠ｈ〃锟?
### 3.1 鐢ㄦ埛涓庤韩浠界浉锟?
| 棰嗗煙 | 鐜版湁锟?| 璇存槑 |
| --- | --- | --- |
| 鐢ㄦ埛 | `plus_user` | 鐢ㄦ埛涓昏〃 |
| 鐢ㄦ埛鍦板潃 | `plus_user_address` | 鐢ㄦ埛鍦板潃 |
| OAuth | `plus_oauth_account` | 绗笁鏂硅处鍙风粦瀹氾紝鐗╃悊琛ㄥ悕锟?`legacy-java-plus-entity` 淇濇寔涓€锟?|
| 绉熸埛 | `plus_tenant` | 绉熸埛 |
| 缁勭粐 | `plus_organization`銆乣plus_organization_member`銆乣plus_department`銆乣plus_position` | 缁勭粐鏋舵瀯 |
| RBAC | `plus_role`銆乣plus_permission`銆乣plus_role_permission`銆乣plus_user_role` | 瑙掕壊鏉冮檺 |

### 3.2 VIP銆佺Н鍒嗗拰鍏咃拷?
| 棰嗗煙 | 鐜版湁锟?| 璇存槑 |
| --- | --- | --- |
| VIP 鐢ㄦ埛 | `plus_vip_user` | 鐢ㄦ埛 VIP 鐘讹拷?|
| VIP 绛夌骇 | `plus_vip_level` | 绛夌骇瀹氫箟 |
| VIP 鏉冪泭 | `plus_vip_benefit`銆乣plus_vip_level_benefit`銆乣plus_vip_benefit_usage` | 鏉冪泭鍜屼娇鐢ㄨ锟?|
| VIP 鍏咃拷?| `plus_vip_recharge`銆乣plus_vip_recharge_pack`銆乣plus_vip_recharge_method` | 鍏呭€艰褰曘€佸厖鍊煎寘銆佸厖鍊兼柟锟?|
| VIP 濂楅 | `plus_vip_pack`銆乣plus_vip_pack_group` | 濂楅鍒嗙粍 |
| 绉垎鍙樺姩 | `plus_vip_point_change` | 绉垎娴佹按 |
| 浼氬憳锟?| `plus_member_card`銆乣plus_member_level`銆乣plus_card`銆乣plus_card_template`銆乣plus_user_card` | 浼氬憳鍗″拰鍗″埜 |

### 3.3 璐︽埛銆佷氦鏄撳拰鏀粯

| 棰嗗煙 | 鐜版湁锟?| 璇存槑 |
| --- | --- | --- |
| 璐︽埛 | `plus_account` | 鐢ㄦ埛/涓讳綋璐︽埛 |
| 璐︽埛娴佹按 | `plus_account_history` | 浣欓鍙樻洿娴佹按 |
| 璐︽湰妗ユ帴 | `plus_ledger_bridge` | 璐︽湰鍏宠仈 |
| 姹囩巼/甯佺 | `plus_currency`銆乣plus_exchange_rate`銆乣plus_account_exchange_config` | 甯佺涓庡厬鎹㈤厤锟?|
| 鍟嗗搧 | `plus_product`銆乣plus_sku` | 鍟嗗搧锟?SKU |
| 璁㈠崟 | `plus_order`銆乣plus_order_item` | 璁㈠崟涓昏〃鍜屾槑锟?|
| 鏀粯 | `plus_payment`銆乣plus_payment_webhook_event` | 鏀粯涓庡洖璋冧簨锟?|
| 閫€锟?| `plus_refund` | 閫€锟?|
| 璐墿锟?| `plus_shopping_cart`銆乣plus_shopping_cart_item` | 璐墿锟?|
| 鍙戠エ | `plus_invoice`銆乣plus_invoice_item`銆乣plus_invoice_record` | 鍙戠エ |

### 3.4 浼樻儬鍒稿拰钀ラ攢

| 棰嗗煙 | 鐜版湁锟?| 璇存槑 |
| --- | --- | --- |
| 鍗″埜钀ラ攢 | `promotion_offer`銆乣promotion_offer_version`銆乣promotion_coupon_stock`銆乣promotion_code`銆乣promotion_user_coupon`銆乣promotion_discount_application` | 鏍囧噯鍗″埜銆佸簱瀛樸€佸厬鎹㈢爜銆佺敤鎴峰埜鍜屼紭鎯犳牳閿€浜嬪疄 |
| 閭€锟?| `plus_invitation_code`銆乣plus_invitation_relation` | 閭€璇风爜鍜岄個璇峰叧锟?|
| 浼欎即 | `plus_partner` | 鍒嗛攢鎴栦紮浼村叧锟?|

## 4. 鏂拌〃涓氬姟鍓嶇紑娉ㄥ唽

| 鍓嶇紑 | bounded context | owner | 绀轰緥 |
| --- | --- | --- | --- |
| `iam_` | identity-access | 韬唤涓庤闂洟锟?| `iam_gateway_api_key`銆乣ai_channel_group` |
| `ai_` | ai-routing-metering | AI 缃戝叧鍥㈤槦 | `ai_routing_policy`銆乣ai_usage` |
| `integration_` | provider-integration | Provider 闆嗘垚鍥㈤槦 | `integration_provider_account` |
| `commerce_` | router-commerce-projection | 浜ゆ槗璐︽埛鍥㈤槦 | `commerce_usage_settlement` |
| `studio_` | portal-studio-assets | 浜у搧鐢熸€佸洟锟?| `studio_catalog_action` |
| `content_` | portal-content | 鍐呭杩愯惀鍥㈤槦 | `content_announcement` |
| `ops_` | operations-observability | 骞冲彴杩愮淮鍥㈤槦 | `ops_gateway_instance`銆乣ops_audit_log` |

### 4.1 缁熶竴鏁版嵁棰嗗煙鍚嶇О

`ModelVendor` 鏄ā鍨嬪巶锟?妯″瀷鍘熷巶鐨勭粺涓€棰嗗煙鍚嶇О锛岃〃绀烘ā鍨嬬殑鍘熷鐮斿彂銆佸彂甯冩垨缁存姢鏂癸紝渚嬪 OpenAI銆丄nthropic銆丟oogle銆丏eepSeek銆丄libaba Qwen銆丮oonshot銆傛暟鎹簱鎸佷箙鍖栦娇鐢ㄧǔ瀹氬瓧绗︿覆缂栫爜 `vendor_code`锛孞ava銆丷ust銆乀ypeScript 锟?OpenAPI 鍧囦粠 Schema Registry 鐢熸垚鏋氫妇鎴栫瓑浠风被鍨嬶紝涓ョ淇濆瓨 enum ordinal锟?
`ModelVendor` 涓嶇瓑鍚屼簬 `Provider`銆俙ai_model_vendor` 淇濆瓨妯″瀷鍘傚涓绘暟鎹紱`ai_model_family` 淇濆瓨鍘傚涓嬬殑妯″瀷鏃忥紱`ai_model` 淇濆瓨鍙 `/v1/*` 鏆撮湶鍜岃矾鐢辩殑鏍囧噯妯″瀷锛沗integration_provider` 淇濆瓨 API 鎺ュ叆渚涘簲鍟嗘垨鍗忚閫傞厤鏂癸紝渚嬪 OpenAI API銆丄zure OpenAI銆丱penRouter銆丱llama銆佹湰鍦版ā鍨嬬綉鍏筹紱`ai_channel` 淇濆瓨鏌愪釜绉熸埛/缁勭粐鍙敤鐨勫叿浣撴帴鍏ラ€氶亾锛沗ai_channel_resource` 淇濆瓨閫氶亾鏀寔鐨勮祫婧愩€佽祫婧愬垎缁勫拰鑳藉姏鑼冨洿锛涙ā鍨嬪悕杞崲锟?`ai_model_mapping_rule`銆乣ai_model_mapping_rule_binding` 锟?`ai_model_mapping_rule_item` 鍒嗗眰鎻忚堪銆侽penRouter銆丄zure銆丄WS銆丟CP銆丠uggingFace 杩欑被鑱氬悎鎴栦簯鎺ュ叆鏂归€氬父灞炰簬 `integration_provider`锛屽彧鏈夊湪瀹冧滑鏈韩鍙戝竷妯″瀷鏃舵墠浣滀负 `ModelVendor`锟?
浠锋牸浣撶郴缁熶竴浣跨敤 `PriceSide`銆乣BillingMeter`銆乣PricingPlan`銆乣BillingMode` 锟?`PricingFormulaMode` 浜斾釜棰嗗煙鍚嶃€俙ai_channel_group` 鏄垱锟?API Key 鏃堕€夋嫨鐨勪笟鍔″垎缁勪簨瀹炴潵婧愶紱`ai_pricing_plan` 鏄寕杞藉湪涓氬姟鍒嗙粍銆丄PI Key銆乂IP銆丼KU銆佺鎴锋垨鐢ㄦ埛涓婄殑瀹氫环鏂规锛屼笉鍐嶆妸鈥滃垎缁勨€濆缓妯′负浠锋牸涓撶敤姒傚康銆俙ai_billing_meter` 鏄粺涓€璁￠噺琛紝瑕嗙洊 LLM token銆乪mbedding token銆佸浘鐗囧紶锟?鍍忕礌銆佽闊崇锟?瀛楃銆佽棰戠鏁般€侀煶涔愮鏁般€侀煶鏁堢粨鏋溿€丄PI 璇锋眰銆丄PI 缁撴灉銆丄PI 鏉＄洰銆佸伐鍏疯皟鐢ㄣ€佸瓨鍌ㄥ拰娴侀噺锛涙瘡鏉＄敤閲忔渶缁堥兘蹇呴』褰掍竴锟?`ai_usage.billing_meter_code + billable_quantity + billable_unit`銆俙ai_model_pricing.price_side=official_reference` 淇濆瓨妯″瀷鍘熷巶鎴栧彲淇′环鏍兼簮鐨勫畼鏂瑰弬鑰冧环锛沗price_side=upstream_cost` 淇濆瓨涓嶅悓 Provider/Channel 鐨勪緵搴斿晢鎴愭湰浠凤紱`price_side=customer_charge` 淇濆瓨闈㈠悜鐢ㄦ埛鐨勯攢鍞环銆俙ai_pricing_plan` 榛樿鍙互璁剧疆 `base_price_side=official_reference + default_multiplier`锛屼粠瀹樻柟浠锋淳鐢熺敤鎴烽攢鍞环锛沗ai_pricing_rule` 鐢ㄤ簬鎸夋ā鍨嬨€佸巶瀹躲€佷緵搴斿晢銆佹笭閬撱€佽兘鍔涖€佽閲忚〃鍜屼环鏍奸」瑕嗙洊锛沗ai_pricing_tier` 鎵胯浇 sub2api 寮忎笂涓嬫枃鍖洪棿銆佹寜娆°€佸浘鐗囥€侀煶棰戙€佽棰戙€佺粨鏋滄暟鍜屾潯鐩暟鍒嗗眰锛沗pricing_formula_mode=expression` 鎵胯浇 new-api `tiered_expr` 绫诲叕寮忥紝浣嗚〃杈惧紡蹇呴』锟?hash 鍜岀増鏈紝骞跺湪 `ai_usage.pricing_snapshot` 鍥哄寲锟?
## 5. 鏂拌〃娓呭崟

### 5.1 IAM 锟?
| 锟?| 鐢诲儚 | 绛夌骇 | 璇存槑 |
| --- | --- | --- | --- |
| `iam_gateway_api_key` | user_entity + credential_index | L3 | Gateway API Key 鎽樿銆佺姸鎬併€佽寖鍥淬€佽繃鏈熴€侀檺娴佸紩锟?|
| `ai_channel_group` | tenant_entity | L2 | API Key 鍒嗙粍銆侀」鐩€佺瓥鐣ョ粦锟?|
| `ai_channel_group_metric_snapshot` | projection | L2 | 鍒嗙粍璐﹀彿瀹归噺銆佸彲鐢ㄨ处鍙锋暟銆佷粖锟?绱鐢ㄩ噺鍜屽仴搴风姸鎬佹姇锟?|
| `iam_gateway_access_policy` | tenant_entity | L3 | Key 绾фā鍨嬭寖鍥淬€佽兘鍔涜寖鍥淬€両P銆佸尯鍩熴€佹暟鎹瓥鐣ワ紱锟?int64 涓讳綋浣跨敤 hash/鑴辨晱寮曠敤 |
| `iam_gateway_risk_rule` | tenant_entity | L3 | IP/Token/Model/Firewall 椋庢帶瑙勫垯锛屾敮锟?hash銆佽劚鏁忓拰瀵嗘枃寮曠敤 |
| `iam_user_preference` | user_entity | L2 | 璇█銆佹椂鍖恒€佷富棰樸€侀€氱煡鍋忓ソ绛夌敤鎴烽厤缃墿灞曪紝涓嶆浛锟?`plus_user` |
| `iam_user_security_setting` | user_entity | L3 | MFA銆佸瘑鐮佹洿鏂版椂闂淬€佸畨鍏ㄧ瓥鐣ユ墿灞曪紝涓嶄繚瀛樺瘑鐮佹槑鏂囷紝涓嶆浛锟?`plus_user` |
| `iam_user_login_event` | event_log | L3 | 鐢ㄦ埛鐧诲綍銆佸畨鍏ㄩ闄┿€佽澶囧拰 MFA 楠岃瘉浜嬩欢 |

璇存槑锛氬绗竴闃舵鍐冲畾澶嶇敤鐜版湁 `plus_api_key`锛屽垯 `iam_gateway_api_key` 鏆傜紦寤鸿〃锛屾枃妗ｄ腑璁板綍涓虹洰鏍囨爣鍑嗚〃锛孭1 閫氳繃鍏煎鏄犲皠鎺ュ叆锟?
### 5.2 AI 锟?
| 锟?| 鐢诲儚 | 绛夌骇 | 璇存槑 |
| --- | --- | --- | --- |
| `ai_model_vendor` | dictionary_entity | L2 | 妯″瀷鍘傚瀛楀吀锛宍ModelVendor` 棰嗗煙浜嬪疄鏉ユ簮锛屼繚瀛樺師鍘傚睍绀恒€佸畼缃戙€佹枃妗ｃ€佽兘鍔涙棌鍜屾灇涓剧紪锟?|
| `ai_model_family` | dictionary_entity | L2 | 妯″瀷鏃忓瓧鍏革紝淇濆瓨鍘傚锟?GPT銆丆laude銆丟emini銆丵wen銆丩lama 绛夌郴鍒楀拰榛樿妯″瀷 |
| `ai_model` | dictionary_entity | L2 | 缃戝叧妯″瀷鐩綍銆佹ā鍨嬪埆鍚嶃€丳rovider independent model |
| `ai_model_capability` | relation_entity | L2 | 妯″瀷鑳藉姏鏃忋€佷笂涓嬫枃銆佽緭鍏ヨ緭鍑烘ā锟?|
| `ai_billing_meter` | dictionary_entity | L2 | 缁熶竴璁￠噺琛紝瀹氫箟 token銆佽姹傘€佺粨鏋溿€佷釜鏁般€佺鏁般€佸瓧绗︺€佸瓨鍌ㄣ€佹祦閲忕瓑鍙璐圭淮锟?|
| `ai_model_pricing` | tenant_entity | L3 | 妯″瀷浠锋牸绨匡紝鍖哄垎瀹樻柟鍙傝€冧环銆佷緵搴斿晢涓婃父鎴愭湰浠枫€佸鎴烽攢鍞环锛屼繚瀛樿璐瑰崟浣嶃€佸竵绉嶃€佽寖鍥村拰鏈夋晥锟?|
| `ai_pricing_plan` | tenant_entity | L3 | 瀹氫环鏂规锛屾敮鎸佹寜瀹樻柟鍙傝€冧环鍊嶇巼銆佸浐瀹氫环銆侀樁姊环鍜岃〃杈惧紡娲剧敓閿€鍞环 |
| `ai_pricing_plan_binding` | relation_entity | L3 | 瀹氫环鏂规缁戝畾锛屾敮锟?API Key 鍒嗙粍銆丄PI Key銆乂IP銆丼KU銆佺敤鎴枫€佺鎴风瓑涓讳綋鎸傝浇浠锋牸绛栫暐 |
| `ai_pricing_rule` | tenant_entity | L3 | 浠锋牸瑙勫垯锛屾寜妯″瀷銆佸巶瀹躲€佷緵搴斿晢銆佹笭閬撱€佽兘鍔涘拰浠锋牸椤硅鐩栭粯璁ゅ垎缁勫€嶇巼 |
| `ai_pricing_tier` | tenant_entity | L3 | 闃舵/鍖洪棿浠锋牸锛屾敮锟?token 涓婁笅鏂囧尯闂淬€佹寜娆°€佸浘鐗囥€侀煶棰戙€佽棰戠瓑鍒嗗眰 |
| `ai_pricing_import_snapshot` | event_log | L3 | 瀹樻柟/渚涘簲鍟嗕环鏍煎鍏ュ揩鐓э紝璁板綍鏉ユ簮 URL銆乭ash銆佺増鏈拰楠屾敹缁撴灉 |
| `ai_routing_policy` | tenant_entity | L2 | 绛栫暐涓昏〃锛氫紭鍏堢骇銆佹潈閲嶃€丼LO銆佸尯鍩熴€乫allback |
| `ai_routing_profile` | tenant_entity | L2 | 绛栫暐鐗堟湰銆佺伆搴︺€佸彂甯冪姸锟?|
| `ai_routing_rule` | tenant_entity | L2 | 鍏蜂綋瑙勫垯銆佹潯浠躲€佸€欓€夐泦銆佺害锟?|
| `ai_routing_decision_log` | event_log | L3 | 璇锋眰璺敱鍐崇瓥璇佹嵁锛屽彲鍥炴斁 |
| `ai_request_trace` | event_log | L3 | 璇锋眰璺熻釜銆侀敊璇€丳rovider attempt |
| `ai_usage` | ledger_source_fact | L3 | 鐢ㄩ噺浜嬪疄锛岃处鍔＄粨杞潵锟?|
| `ai_model_rank_snapshot` | projection | L2 | 妯″瀷鎺掕姒溿€佽秼鍔裤€佸懆锟?鏈堟蹇収 |
| `ai_generation_session` | user_entity | L2 | Playground 浼氳瘽鍜屽伐浣滃彴涓婁笅锟?|
| `ai_generation_job` | event_log/user_entity | L3 | 鍥剧墖銆佽棰戙€侀煶涔愩€佽闊炽€侀煶鏁堛€丄gent 鐢熸垚浠诲姟 |
| `ai_generation_asset` | user_entity | L3 | 鐢熸垚璧勪骇銆佸獟锟?URL銆佺缉鐣ュ浘銆佸弬鏁板揩鐓э紱绛惧悕 URL 涓嶆寔涔呭寲 |
| `ai_generation_asset_action` | event_log | L3 | 鏀惰棌銆佷笅杞姐€佸垎浜€侀珮娓呫€侀噸缁樸€佹墿鍥俱€佹摝闄ゃ€佸鍙ｅ瀷绛夎祫浜ф搷浣滃锟?|
| `ai_quota_policy` | tenant_entity | L3 | 閰嶉鍜岄檺娴佺瓥鐣ワ紝鏀寔 API Key銆佺敤鎴枫€佸垎缁勩€佹ā鍨嬪拰 IP 涓讳綋 |

### 5.3 Integration 锟?
| 锟?| 鐢诲儚 | 绛夌骇 | 璇存槑 |
| --- | --- | --- | --- |
| `integration_provider` | dictionary_entity | L2 | API 鎺ュ叆渚涘簲鍟嗘敞鍐屻€佸浘鏍囥€佹枃妗ｉ摼鎺ャ€佸睍绀鸿壊鍜岄粯璁ゅ崗璁紝锟?OpenAI API銆丱penRouter銆丱llama锛涘彲锟?`default_vendor_code` 鍏宠仈榛樿妯″瀷鍘傚 |
| `ai_channel` | tenant_entity | L2 | 娓犻亾瀹炰緥銆佸崗璁€佹帴鍏ョ被鍨嬨€佹ā鍨嬫ā寮忋€佸尯鍩熴€佹潈閲嶃€佸仴搴风姸锟?|
| `integration_provider_account` | tenant_entity + credential_ref | L3 | 涓婃父璐﹀彿銆佽璇侀厤缃€乻ecret reference銆佺姸鎬併€佽疆鎹㈠拰浣欓蹇収 |
| `ai_channel_resource` | relation_entity | L2 | 娓犻亾鏀寔鐨勮祫婧愩€佽祫婧愬垎缁勫拰鑳藉姏鎺堟潈 |
| `integration_proxy` | tenant_entity | L3 | 浠ｇ悊閰嶇疆锛屼笉淇濆瓨鏁忔劅鏄庢枃 |
| `integration_webhook_endpoint` | tenant_entity + webhook | L3 | 鐢ㄦ埛鎴栫粍缁囩殑 Webhook 鍥炶皟閰嶇疆鍜岀鍚嶅紩锟?|
| `integration_provider_health_snapshot` | event_log/projection | L2 | 鍋ュ悍蹇収鍜屾仮澶嶆帰娴嬭瘉锟?|

### 5.4 Commerce 鎶曞奖锟?
璧勯噾浜嬪疄浠嶅湪 `plus_account`銆乣plus_account_history`銆乣plus_order`銆乣plus_payment` 绛夋棦鏈夎〃銆傛柊琛ㄥ彧鐢ㄤ簬 router 鐢ㄩ噺缁撶畻鎶曞奖鍜屽璐﹁瘉鎹拷?
| 锟?| 鐢诲儚 | 绛夌骇 | 璇存槑 |
| --- | --- | --- | --- |
| `commerce_usage_settlement` | ledger_entry/projection | L3 | 鐢ㄩ噺缁撶畻鎵规銆佹潵锟?usage fact銆侀噾棰濆揩锟?|
| `commerce_usage_pricing_plan` | dictionary_entity | L2 | AI 鐢ㄩ噺濂楅鍜屼环鏍艰鍒掓槧灏勶紝鍙叧鑱旀棦锟?product/sku |
| `commerce_usage_statement` | projection | L3 | 璐︽湡璐﹀崟鎶曞奖锛屼笉鏇夸唬 `plus_invoice` |
| `commerce_usage_statement_item` | projection | L3 | 璐﹀崟鍒嗛」锛屾寜妯″瀷銆佽兘鍔涖€佽祫浜х被鍨嬭仛锟?|
| `commerce_billing_export` | audit/export | L3 | 璐﹀崟瀵煎嚭浠诲姟銆佽繃鏈熷拰瀹¤ |

### 5.5 Portal 鍐呭鍜岀敓鎬佽〃

| 锟?| 鍓嶇紑 | 绛夌骇 | 璇存槑 |
| --- | --- | --- | --- |
| `appstore_app` | `plus_` | L0 | AppCenter 涓绘暟鎹紱娌跨敤 Java `platform_app`锛岀墿鐞嗙粨鏋勪繚鎸佷竴锟?|
| `appstore_app.release_notes` + `appstore_app.install_config` | `plus_` JSON | L0 | 搴旂敤鐗堟湰銆佸彂甯冭鏄庛€佸畨瑁呭寘銆佸钩鍙颁笅杞藉湴鍧€锛涗笉鍗曠嫭锟?App release 锟?|
| `appstore_app.resource_list` | `plus_` JSON | L0 | 搴旂敤鎴浘銆佸皝闈€佸浘鏍囩瓑濯掍綋璧勬簮锛涗笉鍗曠嫭锟?App media 锟?|
| `plus_agent_skill` | `plus_` | L0 | SkillsHub 涓绘暟鎹紱娌跨敤 Java `PlusAgentSkill`锛岀墿鐞嗙粨鏋勪繚鎸佷竴锟?|
| `plus_agent_skill_package` | `plus_` | L0 | 鎶€鑳藉寘/闆嗗悎銆佸垎绫汇€佽仛鍚堢粺璁′笂涓嬫枃锛涙部锟?Java `PlusAgentSkillPackage` |
| `plus_user_agent_skill` | `plus_` | L0 | 鐢ㄦ埛鎶€鑳藉畨瑁呫€佸惎鐢ㄣ€侀厤缃姸鎬侊紱娌跨敤 Java `PlusUserAgentSkill` |
| `plus_category` | `plus_` | L0 | 鎶€鑳藉垎绫伙紱娌跨敤 Java `PlusCategory`锛屾妧鑳藉垎绫婚檺锟?`CategoryType.SKILLS`/`SKILLS_COLLECTION` |
| `studio_catalog_action` | `studio_` | L2 | 搴旂敤/鎶€鑳戒笅杞姐€佸畨瑁呫€佽瘎鍒嗐€佽瘎璁恒€佹敹钘忕瓑琛屼负浜嬪疄 |
| `content_announcement` | `content_` | L2 | 鍏憡 |
| `content_doc_page` | `content_` | L2 | 浜у搧鏂囨。銆丄PI 鏂囨。銆丼DK 鏂囨。椤甸潰绱㈠紩 |
| `content_openapi_snapshot` | `content_` | L2 | OpenAPI 鐗堟湰銆乭ash銆佸垎绫绘爲鍜岀ず锟?manifest |
| `content_sdk_release` | `content_` | L2 | SDK 璇█銆佸寘鐗堟湰銆佸畨瑁呭懡浠ゅ拰鍙戝竷 artifact manifest |
| `content_forum_post` | `content_` | L2 | 璁哄潧甯栧瓙 |
| `content_forum_comment` | `content_` | L2 | 璇勮 |
| `content_reaction` | `content_` | L2 | 璁哄潧銆佽绋嬬瓑鍐呭浜掑姩浜嬪疄 |
| `content_course` | `content_` | L2 | 璇剧▼ |
| `content_course_section` | `content_` | L2 | 璇剧▼绔犺妭鍒嗙粍 |
| `content_course_lesson` | `content_` | L2 | 璇剧▼璇炬椂 |
| `content_course_relation` | `content_` | L2 | 鐩稿叧璇剧▼銆佸悎闆嗐€佹帹鑽愬叧锟?|

### 5.6 Ops 锟?
| 锟?| 鐢诲儚 | 绛夌骇 | 璇存槑 |
| --- | --- | --- | --- |
| `ops_gateway_instance` | tenant_entity/core_entity | L2 | 缃戝叧瀹炰緥銆侀儴缃叉ā寮忋€乺untime銆乷rchestrator銆佺増鏈€佽劚鏁忚妭鐐圭姸锟?|
| `ops_gateway_heartbeat` | event_log | L2 | CPU銆佸唴瀛樸€佺鐩樸€佺綉缁溿€佽繛鎺ャ€乽ptime 绛夊績璺虫寚锟?|
| `ops_config_snapshot` | snapshot | L3 | 閰嶇疆蹇収銆佺伆搴﹀彂甯冦€佸洖锟?|
| `ops_audit_log` | audit_log | L3 | 鍚庡彴銆佺敤鎴枫€佺郴缁熸搷浣滃锟?|
| `ops_outbox_event` | outbox_event | L3 | 浜嬪姟鍚庝簨浠跺彂锟?|
| `ops_inbox_event` | inbox_event | L3 | 娑堣垂骞傜瓑 |
| `ops_job_execution` | event_log | L2 | worker 浠诲姟鎵ц |
| `ops_alert_event` | event_log | L2 | 鍛婅浜嬩欢 |
| `ops_notification_message` | user_entity/event_log | L2 | 鐢ㄦ埛娑堟伅涓績娑堟伅 |
| `ops_notification_delivery` | event_log | L2 | 娑堟伅鎶曢€掋€佸凡璇汇€佸け璐ュ拰娓犻亾鐘讹拷?|
| `ops_metric_snapshot` | projection | L2 | Dashboard 鍜岀洃鎺ч潰鏉胯仛鍚堟寚鏍囧揩锟?|

## 6. 鏍囧噯瀛楁锟?
锟?L2/L3 琛ㄩ粯璁ゅ寘鍚細

```sql
id BIGINT NOT NULL,
uuid VARCHAR(64) NOT NULL,
tenant_id BIGINT NOT NULL,
organization_id BIGINT NOT NULL DEFAULT 0,
user_id BIGINT,
owner_type INTEGER,
owner_id BIGINT,
data_scope INTEGER NOT NULL DEFAULT 1,
status INTEGER NOT NULL,
created_at TIMESTAMP NOT NULL,
updated_at TIMESTAMP NOT NULL,
version BIGINT NOT NULL DEFAULT 0,
deleted_at TIMESTAMP,
deleted_by BIGINT,
archived_at TIMESTAMP,
retention_until TIMESTAMP,
request_id VARCHAR(128),
idempotency_key VARCHAR(128),
external_event_id VARCHAR(128),
payload_hash VARCHAR(128),
metadata JSON
```

鍏蜂綋琛ㄦ寜鐢诲儚瑁佸壀锛屼絾瑁佸壀蹇呴』鍦ㄨ〃濂戠害璇存槑鍘熷洜锟?
## 7. 绀轰緥琛ㄥ锟?
### 7.1 `integration_provider_account`

```yaml
table: integration_provider_account
title: Provider璐﹀彿
domain: integration
bounded_context: provider-integration
profile: tenant_entity
compliance_level: L3
system_of_record: true
write_owner: claw-router-control
columns:
  id: { type: int64, primary_key: true }
  uuid: { type: string, length: 64, unique: true }
  tenant_id: { type: int64, required: true }
  organization_id: { type: int64, required: true, default: 0 }
  user_id: { type: int64, required: false }
  provider_code: { type: string, length: 64, required: true }
  account_name: { type: string, length: 128, required: true }
  secret_ref: { type: string, length: 256, required: true, sensitivity: SECRET_REF }
  masked_label: { type: string, length: 128, required: true }
  key_hash: { type: string, length: 128, required: true, sensitivity: SECRET_HASH }
  status: { type: enum_int32, required: true }
  last_rotated_at: { type: instant, required: false }
  created_at: { type: instant, required: true }
  updated_at: { type: instant, required: true }
  version: { type: int64, required: true, default: 0 }
indexes:
  - { name: uk_integration_provider_account_uuid, unique: true, columns: [uuid] }
  - { name: idx_integration_provider_account_tenant_provider_status, columns: [tenant_id, organization_id, provider_code, status] }
security:
  pii: false
  encrypted_fields: []
  masking_rule: never_return_secret_ref_to_public_api
```

### 7.2 `ai_routing_decision_log`

```yaml
table: ai_routing_decision_log
title: 璺敱鍐崇瓥鏃ュ織
domain: ai
bounded_context: ai-routing-metering
profile: event_log
compliance_level: L3
system_of_record: true
write_owner: claw-router-gateway
columns:
  id: { type: int64, primary_key: true }
  uuid: { type: string, length: 64, unique: true }
  tenant_id: { type: int64, required: true }
  organization_id: { type: int64, required: true, default: 0 }
  user_id: { type: int64, required: false }
  request_id: { type: string, length: 128, required: true }
  api_key_id: { type: int64, required: true }
  model: { type: string, length: 128, required: true }
  capability: { type: string, length: 64, required: true }
  selected_provider: { type: string, length: 64, required: true }
  selected_channel_id: { type: int64, required: true }
  decision_reason: { type: json, required: true }
  fallback_chain: { type: json, required: false }
  status: { type: enum_int32, required: true }
  created_at: { type: instant, required: true }
indexes:
  - { name: uk_ai_routing_decision_log_uuid, unique: true, columns: [uuid] }
  - { name: idx_ai_routing_decision_tenant_request, columns: [tenant_id, organization_id, request_id] }
  - { name: idx_ai_routing_decision_tenant_model_created, columns: [tenant_id, organization_id, model, created_at] }
retention:
  default: 180d
  enterprise: configurable
```

## 8. 绱㈠紩璁捐

1. L2/L3 澶氱鎴疯〃鏌ヨ绱㈠紩蹇呴』锟?`tenant_id, organization_id` 璧峰锟?2. 鍒楄〃椤电储寮曠粺涓€杩藉姞 `status, updated_at, id` 锟?`status, created_at, id`锟?3. 璇锋眰鏄庣粏銆佺敤閲忎簨瀹炪€佸璁℃棩蹇楀繀椤绘寜鏃堕棿鑼冨洿璁捐鍒嗗尯鎴栧綊妗ｇ瓥鐣ワ拷?4. 骞傜瓑閿繀椤绘湁鍞竴绾︽潫锛屼緥锟?`(tenant_id, idempotency_key)` 锟?`(provider_code, external_event_id)`锟?5. 閲戦銆佺姸鎬併€佺鎴枫€佹潈闄愩€佸箓绛夊瓧娈典笉寰楀彧鏀惧湪 JSON锟?
## 9. 缁撴瀯婕旇繘

鎵€鏈夋柊琛ㄥ彉鏇存寜浠ヤ笅娴佺▼锟?
1. 鏇存柊琛ㄥ绾︼拷?2. 鏇存柊 DDL 杩佺Щ锟?3. 鏇存柊 ORM/Entity锟?4. 鏇存柊 DTO/OpenAPI/SDK锟?5. 鏇存柊璇绘ā鍨嬫垨 CDC 鏄犲皠锟?6. 娣诲姞鍏煎鏈熸牎楠岋拷?7. 鍥炲～鍜屽弻锟?鍙屽啓锟?8. 鐏板害鍒囨崲锟?9. 鍒犻櫎鏃у瓧娈垫垨鏃ц矾寰勶拷?
鐮村潖鎬у彉鏇村繀椤昏蛋 expand/backfill/contract锛屼笉鍏佽涓€娆℃€у垹闄ょ敓浜у瓧娈碉拷?
## 10. 鏁版嵁搴撻獙鏀舵竻锟?
- [ ] 鏂拌〃鍓嶇紑宸茬櫥锟?owner 锟?bounded context锟?- [ ] 鏂拌〃宸插０鏄庣敾鍍忓拰 L1/L2/L3 绛夌骇锟?- [ ] 楂橀鏌ヨ宸茬粦瀹氱储寮曪拷?- [ ] 澶氱鎴疯〃绱㈠紩锟?`tenant_id` 璧峰锟?- [ ] 璧勯噾銆佸嚟璇併€佸璁¤〃杈惧埌 L3锟?- [ ] API int64 锟?decimal 搴忓垪鍖栦负 string锟?- [ ] Provider secret 鍙瓨 secret reference锟?- [ ] 鐢ㄦ埛銆乂IP銆佽处鎴枫€佷紭鎯犲埜銆佺Н鍒嗗厖鍊笺€佷氦鏄撹处鎴峰煙鏈垱寤烘浛浠ｈ〃锟?- [ ] 缁撴瀯鍙樻洿銆丱RM銆丱penAPI銆丼DK 淇濇寔鍚屾锟?
## 11. 鏁版嵁浜嬪疄鏉ユ簮鍒嗗眰

鏁版嵁搴撲笉鏄寜椤甸潰鎴栭儴缃插舰鎬佹媶鍒嗭紝鑰屾槸鎸変簨瀹炴潵婧愬拰鍐欏叆 owner 鍒嗗眰銆俙sdkwork-clawrouter` 鍦ㄦ湰鍦版闈€丼erver銆丏ocker銆並8S 涓嬮兘浣跨敤鍚屼竴濂楁暟鎹绾︼紝鍙厑璁哥墿鐞嗘暟鎹簱鏂硅█銆佸垎鍖鸿兘鍔涘拰閮ㄧ讲鍙傛暟涓嶅悓锟?
| 灞傜骇 | 浜嬪疄鏉ユ簮 | 锟?| 鍐欏叆 owner | 璇存槑 |
| --- | --- | --- | --- | --- |
| L0 瀛橀噺涓绘暟鎹眰 | `legacy-java-plus-entity` | `plus_user`銆乣plus_account`銆乣plus_vip_*`銆乣plus_order`銆乣plus_payment` 锟?| 鏃㈡湁 Java service/repository | 琛ㄧ粨鏋勫畬鍏ㄤ繚鎸佷竴鑷达紱claw-router 鍙€氳繃鏍囧噯 service/API/SDK 鎺ュ叆 |
| L1/L2 鎺у埗闈富鏁版嵁锟?| claw-router 鎺у埗锟?| `iam_`銆乣integration_`銆乣ai_`銆乣promotion_` 閰嶇疆涓昏〃 | control-plane service | API Key 鎵╁睍銆丳rovider銆佹笭閬撱€佹ā鍨嬨€佺瓥鐣ャ€佸崱鍒歌惀閿€绛夋爣鍑嗕簨瀹炴潵锟?|
| L3 浜嬩欢浜嬪疄锟?| gateway/worker | `ai_routing_decision_log`銆乣ai_request_trace`銆乣ai_usage`銆乣ops_audit_log` | gateway銆亀orker銆乤dmin | append-only 鎴栧噯 append-only锛岀敤浜庡璁°€佽璐广€佸洖鏀惧拰鏁呴殰瀹氫綅 |
| L2/L3 鎶曞奖涓庡璐﹀眰 | worker/ops | `commerce_usage_settlement`銆乣commerce_billing_export`銆乣integration_provider_health_snapshot` | settlement worker銆乷ps worker | 涓嶆浛浠ｈ祫閲戣处鏈紝鍙繚瀛樼敤閲忕粨绠椼€佸鍑哄拰鍋ュ悍蹇収璇佹嵁 |
| 浜嬩欢涓€鑷存€у眰 | outbox/inbox | `ops_outbox_event`銆乣ops_inbox_event` | 鍚勫啓鍏ユ湇锟?| 淇濋殰璺ㄦ湇鍔°€佽法閮ㄧ讲銆佸紓姝ユ姇褰辩殑鍙潬鍙戝竷鍜屽箓绛夋秷锟?|

鍏抽敭绾︽潫锟?
- `plus_*` 琛ㄦ槸鏃㈡湁涓氬姟鍩熺殑浜嬪疄鏉ユ簮锛屼笉鍥犱负 claw-router 寮曞叆鑰屾敼鍚嶃€佹敼瀛楁鎴栧缓鍚屼箟琛拷?- 鏂拌〃鍙壙杞界綉鍏冲煙鏂板鑳藉姏锛屼笉鎵胯浇鐢ㄦ埛銆乂IP銆佽处鎴枫€佷紭鎯犲埜銆佸厖鍊笺€佽鍗曘€佹敮浠樸€侀€€娆俱€佸彂绁ㄧ瓑鏃㈡湁浜ゆ槗浜嬪疄锟?- 浠讳綍椤甸潰闇€瑕佽仛鍚堜俊鎭椂锛屼紭鍏堥€氳繃 API composition銆佽妯″瀷鎴栨姇褰卞疄鐜帮紝涓嶆妸澶氫釜浜嬪疄鏉ユ簮鎻夋垚涓€涓笉鍙不鐞嗙殑澶у琛拷?- 鎵€鏈夎法鏈嶅姟鍐欏叆蹇呴』锟?`request_id`銆乣idempotency_key` 锟?outbox/inbox 鍘婚噸閿拷?
## 12. 瀛橀噺琛ㄥ鐢ㄥ锟?
鐢ㄦ埛瑕佹眰鐢ㄦ埛銆乂IP銆乤ccount銆佷紭鎯犲埜銆佺Н鍒嗗厖鍊肩瓑璁捐锟?`legacy-java-plus-entity` 瀹屽叏涓€鑷达紝鏈」鐩惤鍦版椂鎸変互涓嬪绾︽墽琛岋拷?
| 涓氬姟锟?| 浜嬪疄鏉ユ簮锟?| claw-router 鍙仛 | claw-router 绂佹锟?|
| --- | --- | --- | --- |
| 鐢ㄦ埛涓庤韩锟?| `plus_user`銆乣plus_user_address`銆乣plus_oauth_account`銆乣plus_tenant`銆乣plus_organization*`銆乣plus_role*` | 璇诲彇鐢ㄦ埛銆佺鎴枫€佺粍缁囥€佽鑹叉潈闄愪笂涓嬫枃锛涢€氳繃 app/backend 鏍囧噯 API 璋冪敤鐢ㄦ埛鑳藉姏 | 鏂板缓 `iam_user`銆乣iam_account_user` 绛夋浛浠ｈ〃锛涘鍒跺瘑鐮併€佹墜鏈哄彿銆丱Auth 鏄庣粏鍒版柊锟?|
| VIP 涓庣Н锟?| `plus_vip_user`銆乣plus_vip_level`銆乣plus_vip_recharge*`銆乣plus_vip_point_change` | 灞曠ず VIP 鐘舵€併€佸厖鍊煎寘銆佺Н鍒嗗彉鍔紱灏嗙綉鍏崇敤閲忕粨绠楃粨鏋滀氦缁欐棦鏈夎处锟?VIP鏈嶅姟 | 鏂板缓 `commerce_vip_user`銆乣commerce_point_change`銆乣router_recharge` 绛夋浛浠ｈ〃 |
| 璐︽埛涓庤处锟?| `plus_account`銆乣plus_account_history`銆乣plus_ledger_bridge`銆乣plus_currency`銆乣plus_exchange_rate` | 閫氳繃璐︽埛鏈嶅姟鎵ｅ噺銆佸喕缁撱€佸厖鍊笺€侀€€娆撅紱锟?`commerce_usage_settlement` 淇濈暀鐢ㄩ噺缁撶畻璇佹嵁 | 鐩存帴缁曡繃鏈嶅姟鏀逛綑棰濓紱鍙敼浣欓涓嶅啓娴佹按锛涙柊锟?`commerce_account` 浣滀负浣欓浜嬪疄鏉ユ簮 |
| 鍟嗗搧銆佽鍗曘€佹敮浠樸€侀€€娆俱€佸彂锟?| `plus_product`銆乣plus_sku`銆乣plus_order*`銆乣plus_payment*`銆乣plus_refund`銆乣plus_invoice*` | 鍏宠仈浠锋牸璁″垝銆佸垱寤鸿锟?鏀粯/閫€娆捐姹傘€佸睍绀轰氦鏄撶粨锟?| 鏂板缓 claw-router 绉佹湁璁㈠崟銆佹敮浠樸€侀€€娆俱€佸彂绁ㄤ富锟?|

璁㈠崟娲惧彂鍜屾湇鍔¤鍗曡兘鍔涗篃锟?Java 瀹炰綋涓哄噯锛歚plus_order_dispatch_rule`銆乣plus_order_worker_dispatch_profile` 宸插瓨鍦ㄤ簬 `legacy-java-plus-entity`锛屽洜锟?claw-router 鍙兘鐧昏鍜岃皟鐢紝涓嶅啀鏂板缓 `commerce_order_dispatch_*` 锟?`router_worker_profile`锟?| 鍗″埜钀ラ攢 | `promotion_offer`銆乣promotion_offer_version`銆乣promotion_offer_scope`銆乣promotion_offer_audience_rule`銆乣promotion_offer_time_window`銆乣promotion_budget_account`銆乣promotion_coupon_stock`銆乣promotion_code`銆乣promotion_user_coupon`銆乣promotion_discount_application`銆乣promotion_discount_allocation`銆乣promotion_coupon_ledger_entry`銆乣promotion_external_binding`銆乣promotion_event_outbox` | 锟?promotion bounded context 缁熶竴绠＄悊鍒稿畾涔夈€佺増鏈€佽寖鍥淬€佷汉缇ゃ€侀绠椼€佸簱瀛樸€佸厬鎹㈢爜銆佺敤鎴峰埜銆佹牳閿€銆佸垎鎽娿€佹祦姘淬€佸閮ㄥ钩鍙扮粦瀹氬拰浜嬩欢 | 鏂板缓锟?`promotion_` 鐨勫崱鍒稿悓涔夎〃 |

瀛橀噺琛ㄥ湪鏈」鐩腑鐨勫吋瀹圭瓑绾ф槸 L0 legacy compatible銆侺0 鐨勫惈涔夋槸鈥滆鍏煎鍜屾槧灏勨€濓紝涓嶆槸鈥滃厑璁哥户缁鍒朵笉鏍囧噯璁捐鈥濄€傛柊鍔熻兘鑻ュ繀椤绘墿灞曡繖浜涗笟鍔″煙锛屽簲鍏堣瘎瀹℃槸鍚﹁兘閫氳繃鏃㈡湁 Java 鏈嶅姟鎵╁睍锛涘彧鏈夊湪鐢ㄦ埛鏄庣‘鎵瑰噯鐙珛杩佺Щ椤圭洰鏃讹紝鎵嶈锟?`plus_*` 鍒版爣鍑嗗墠缂€琛ㄧ殑鐗╃悊杩佺Щ锟?
## 13. 鏂拌〃钀藉湴浼樺厛锟?
鏂拌〃涓嶄竴娆℃€у叏閮ㄨ惤鍦帮紝鎸変笟鍔￠棴鐜拰椋庨櫓浼樺厛绾у垎鎵癸拷?
| 浼樺厛锟?| 鐩爣 | 锟?|
| --- | --- | --- |
| P0 | 鏍囧噯锟?MVP 蹇呴渶锛屾敮锟?Provider銆佽矾鐢便€並ey銆佺敤閲忋€佷环鏍煎拰瀹¤闂幆 | `ai_model_vendor`銆乣ai_model_family`銆乣integration_provider`銆乣ai_channel`銆乣ai_channel_credential`銆乣ai_channel_resource`銆乣ai_model`銆乣ai_model_capability`銆乣ai_billing_meter`銆乣ai_model_pricing`銆乣ai_pricing_plan`銆乣ai_pricing_plan_binding`銆乣ai_pricing_rule`銆乣ai_pricing_tier`銆乣ai_routing_policy`銆乣ai_routing_profile`銆乣ai_routing_rule`銆乣ai_model_mapping_rule`銆乣ai_model_mapping_rule_binding`銆乣ai_model_mapping_rule_item`銆乣ai_routing_decision_log`銆乣ai_request_trace`銆乣ai_usage`銆乣ops_audit_log`銆乣ops_outbox_event`銆乣ops_inbox_event` |
| P1 | 鐢熶骇鍖栬繍钀ャ€丳layground銆佸畨鍏ㄦ槑缁嗗拰缁撶畻澧炲己 | `ai_channel_group`銆乣ai_channel_group_metric_snapshot`銆乣iam_gateway_api_key` 锟?`plus_api_key` 鍏煎绱㈠紩銆乣iam_gateway_access_policy`銆乣iam_user_login_event`銆乣ai_pricing_import_snapshot`銆乣ai_quota_policy`銆乣ai_generation_session`銆乣ai_generation_job`銆乣ai_generation_asset`銆乣ai_generation_asset_action`銆乣commerce_usage_settlement`銆乣commerce_usage_statement`銆乣commerce_usage_statement_item`銆乣ops_config_snapshot`銆乣ops_gateway_instance`銆乣ops_gateway_heartbeat`銆乣ops_notification_message`銆乣ops_notification_delivery` |
| P2 | 闂ㄦ埛鐢熸€併€佸唴瀹硅繍钀ャ€佸鍑恒€佸仴搴锋不锟?| `appstore_app`銆乣plus_agent_skill`銆乣plus_agent_skill_package`銆乣plus_user_agent_skill`銆乣plus_category`銆乣content_announcement`銆乣content_doc_page`銆乣content_forum_post`銆乣content_forum_comment`銆乣content_course`銆乣content_course_lesson`銆乣content_course_relation`銆乣commerce_billing_export`銆乣integration_webhook_endpoint`銆乣integration_provider_health_snapshot`銆乣ai_model_rank_snapshot` |
| P3 | 澶ц锟?SaaS 锟?K8S 锟?Cell 澧炲己 | `ops_job_execution`銆乣ops_alert_event`銆乣ops_metric_snapshot` 浠ュ強锟?Cell/Region 鎷嗗垎鐨勬姇褰辫〃 |

API Key 鐨勭涓€闃舵鏈変袱绉嶅悎娉曡矾绾匡細

- 濡傛灉 Java `plus_api_key` 宸茬粡浣滀负 app/backend API 鐨勬爣鍑嗕簨瀹炴潵婧愶紝锟?P0/P1 鍏堝锟?`plus_api_key`锛屾柊锟?`ai_channel_group`銆乣iam_gateway_access_policy` 绛夋墿灞曡〃閫氳繃 `legacy_api_key_id` 鍏宠仈锛屼笉锟?`plus_api_key` 瀛楁锟?- 濡傛灉 claw-router 闇€瑕佺嫭绔嬬殑楂樺畨鍏ㄧ綉锟?Key 绱㈠紩锛屾墠鏂板 `iam_gateway_api_key`銆傝琛ㄥ彧淇濆瓨 `key_prefix`銆乣key_hash`銆佺瓥鐣ュ紩鐢ㄣ€佺姸鎬佸拰瀹¤淇℃伅锛屼笉淇濆瓨 API Key 鏄庢枃锛涗笌 `plus_api_key` 鐨勫叧绯诲繀椤诲湪濂戠害涓０鏄庯拷?
## 14. 鏍稿績鏁版嵁閾捐矾

### 14.1 Provider 鍜岃矾鐢遍厤缃摼锟?
1. Admin/Console 閫氳繃 `/backend/v3/api` 锟?`/app/v3/api` 璋冪敤閰嶇疆 API锟?2. 鎺у埗闈㈠啓锟?`integration_provider`銆乣ai_channel`銆乣ai_channel_credential`銆乣ai_channel_resource` 锟?`ai_model_mapping_rule*`锛屽叾锟?`integration_provider` 琛ㄧず API 鎺ュ叆鏂癸紝`ai_channel_credential` 鎵胯浇璁よ瘉閰嶇疆锛宍ai_channel_resource` 鎵胯浇璧勬簮鎺堟潈锛屾ā鍨嬭浆鎹㈣鍒欐寜鍏ㄥ眬銆乂endor銆佽处锟?娓犻亾缁戝畾鍒嗗眰瑕嗙洊锟?3. 妯″瀷鐩綍鍐欏叆 `ai_model_vendor`銆乣ai_model_family`銆乣ai_model` 锟?`ai_model_pricing`锛屽叾锟?`ai_model_vendor` 锟?`ModelVendor` 鐨勪簨瀹炴潵婧愶紝`ai_model_pricing.price_side` 鍖哄垎瀹樻柟鍙傝€冧环銆佷緵搴斿晢涓婃父鎴愭湰浠峰拰瀹㈡埛閿€鍞环锟?4. 浠锋牸绛栫暐鍐欏叆 `ai_billing_meter`銆乣ai_pricing_plan`銆乣ai_pricing_plan_binding`銆乣ai_pricing_rule` 锟?`ai_pricing_tier`锛汚PI Key 鍒涘缓閫夋嫨 `ai_channel_group`锛岃鍒嗙粍閫氳繃 `pricing_plan_id` 鎸傞粯璁ゅ畾浠锋柟妗堬紱榛樿閿€鍞环鍙互锟?`official_reference * default_multiplier` 娲剧敓锛屼緵搴斿晢鎴愭湰浠锋寜 `provider_code/channel_id/provider_model` 鐙珛缁存姢锟?5. 璺敱绛栫暐鍐欏叆 `ai_routing_policy`銆乣ai_routing_profile`銆乣ai_routing_rule`锟?6. 鍐欎簨鍔″悓鏃朵骇锟?`ops_outbox_event`锛岀儹璺緞璁㈤槄骞跺埛鏂版湰鍦扮紦瀛橈拷?7. 缃戝叧鐑矾寰勫彧璇荤紦瀛樺拰鍙鍓湰锛屼笉鑳界洿鎺ヤ慨鏀归厤缃富琛拷?
### 14.2 璇锋眰銆佺敤閲忓拰缁撶畻閾捐矾

1. Gateway 鏀跺埌 `/v1/*` 璇锋眰锛岃В锟?API Key銆佺鎴枫€佺粍缁囥€佺敤鎴峰拰 owner锟?2. Gateway 鎵ц绛栫暐鍖归厤锛屽啓鍏ユ垨寮傛钀藉湴 `ai_routing_decision_log`锟?3. Provider 璋冪敤杩囩▼鍐欏叆 `ai_request_trace`锛岃褰曟瘡锟?attempt銆侀敊璇€佸欢杩熴€佺姸鎬佺爜锟?fallback锟?4. 鍝嶅簲瀹屾垚鍚庣敓锟?`ai_usage`锛屼綔涓鸿璐瑰敮涓€鐢ㄩ噺浜嬪疄锟?5. Settlement worker 娑堣垂 `ai_usage`锛岀敓锟?`commerce_usage_settlement`锟?6. 璧勯噾鎵ｅ噺銆佺Н鍒嗘墸鍑忋€佸厖鍊煎叆璐︿粛璋冪敤鏃㈡湁璐︽埛/VIP/浜ゆ槗鏈嶅姟锛屾渶缁堜簨瀹炲啓锟?`plus_account`銆乣plus_account_history`銆乣plus_order`銆乣plus_payment` 绛夋棦鏈夎〃锟?7. 缁撶畻鎴愬姛銆佸け璐ャ€佽ˉ鍋块兘閫氳繃 `ops_outbox_event` 鍙戝竷锛屾秷璐圭锟?`ops_inbox_event` 鍘婚噸锟?
### 14.3 绠＄悊瀹¤閾捐矾

1. Admin 瀵规笭閬撱€佸瘑閽ャ€佽璐广€佺敤鎴蜂綑棰濄€佹潈闄愮殑鎿嶄綔蹇呴』锟?`ops_audit_log`锟?2. `ops_audit_log` 涓嶄繚瀛樻晱鎰熸槑鏂囷紝鍙繚瀛樿劚鏁忓璞°€佺洰锟?ID銆佹搷浣滃墠鍚庢憳锟?hash銆乺equest_id銆乷perator_id锟?3. 楂樺嵄鎿嶄綔闇€锟?`approval_id` 锟?`risk_ticket_id`锛岀敤浜庡悗缁帴鍏ュ鎵规祦锟?
## 15. 閮ㄧ讲褰㈡€佷笅鐨勬暟鎹簱鏄犲皠

| 閮ㄧ讲褰拷?| 鎺ㄨ崘鏁版嵁锟?| 璁捐瑕佹眰 |
| --- | --- | --- |
| 鏈湴妗岄潰 | SQLite WAL 鎴栧祵鍏ュ紡 PostgreSQL | 缁撴瀯濂戠害涓嶅彉锛汮SON 鏄犲皠锟?TEXT/JSON锛沝ecimal 鎸夊瓧绗︿覆锟?NUMERIC 鍏煎锛涘瘑閽ヤ紭鍏堟斁绯荤粺 Keychain锛屽彧鍦ㄥ簱涓繚锟?`secret_ref` |
| Server 鍗曟満 | PostgreSQL | 鎺ㄨ崘鎵€鏈夋柊琛ㄦ寜鏍囧噯 DDL 钀藉湴锛汱3 琛ㄦ敮鎸佸浠姐€佸璁″拰瀹氭湡褰掓。 |
| Docker Compose | PostgreSQL + Redis | 鍒濆鍖栬剼鏈箓绛夛紱杩佺Щ鐗堟湰闅忛暅鍍忓彂甯冿紱鏈湴鍗峰繀椤婚殧锟?secrets 锟?data |
| K8S | PostgreSQL HA/浜戞暟鎹簱 + Redis/娑堟伅闃熷垪 | `ai_usage`銆乣ai_request_trace`銆乣ai_routing_decision_log`銆乣ops_audit_log` 鎸夋椂闂村垎鍖猴紱outbox/inbox 鍙帴 Kafka/NATS/RabbitMQ |

鏂硅█鏄犲皠鍘熷垯锟?
- `BIGINT` 瀵瑰簲閫昏緫 `int64`锛孉PI/SDK 缁熶竴 string锟?- `NUMERIC(18,6)` 鎴栨洿楂樼簿搴﹀锟?decimal锛孉PI/SDK 缁熶竴 string锟?- PostgreSQL `jsonb` 锟?SQLite 涓槧灏勪负 TEXT + JSON 鏍￠獙锛屽湪 MySQL 涓槧灏勪负 JSON锟?- 鍒嗗尯鏄墿鐞嗕紭鍖栵紝涓嶆敼鍙樿〃濂戠害锛汼QLite 鍜岃交閲忛儴缃插彲浠ュ彧鍋氬綊妗ｆ竻鐞嗭拷?
## 16. 鎬ц兘銆佸垎鍖哄拰鐣欏瓨

| 锟?| 鍒嗗尯寤鸿 | 榛樿鐣欏瓨 | 鐑储寮曢锟?| 璇存槑 |
| --- | --- | ---: | ---: | --- |
| `ai_usage` | 锟?`occurred_at` 鏈堝垎鍖猴紱澶ц妯＄鎴峰彲锟?tenant hash 瀛愬垎锟?| 鍦ㄧ嚎 24 涓湀锛屽喎褰掓。 5 锟?| 6 | 璐﹀姟鏉ユ簮浜嬪疄锛屼笉鑳介殢鎰忓垹锟?|
| `ai_request_trace` | 锟?`started_at` 锟?鏈堝垎锟?| 鍦ㄧ嚎 90-180 澶╋紝閿欒 trace 鍙欢锟?| 5 | 楂樺啓鍏ユ棩蹇楋紝payload 闇€瑁佸壀 |
| `ai_routing_decision_log` | 锟?`created_at` 鏈堝垎锟?| 鍦ㄧ嚎 180 澶╋紝浼佷笟鍙厤锟?| 5 | 璺敱鍥炴斁璇佹嵁 |
| `ops_audit_log` | 锟?`created_at` 鏈堝垎锟?| 鍦ㄧ嚎 24 涓湀锛屽喎褰掓。 5 骞存垨鎸夊悎锟?| 6 | 楂樻晱瀹¤锛屾敮锟?legal hold |
| `ops_outbox_event` | 锟?`created_at` 鏈堝垎鍖烘垨鐘舵€佸綊锟?| 鎴愬姛鍙戝竷 30-90 澶╋紝澶辫触淇濈暀鑷冲锟?| 5 | 鎴愬姛浜嬩欢鍙綊妗ｏ紝澶辫触浜嬩欢涓嶅彲鎻愬墠娓呯悊 |
| `ops_inbox_event` | 锟?`created_at` 鏈堝垎锟?| 澶т簬鏈€澶ч噸鏀剧獥鍙ｏ紝榛樿 180 锟?| 4 | 娑堣垂鍘婚噸绐楀彛蹇呴』瑕嗙洊娑堟伅閲嶆斁鍛ㄦ湡 |

绱㈠紩棰勭畻瑙勫垯锟?
- 閰嶇疆涓昏〃鏈€锟?6 涓牳蹇冪储寮曪紱鏃ュ織浜嬪疄琛ㄦ渶锟?8 涓湪绾跨储寮曪拷?- 澶氱鎴峰湪绾挎煡璇㈢储寮曞繀椤讳互 `tenant_id, organization_id` 寮€澶达拷?- `request_id`銆乣trace_id`銆乣idempotency_key`銆乣external_event_id` 蹇呴』鏈夋槑纭敮涓€鎴栨櫘閫氱储寮曠敤閫旓拷?- JSON 瀛楁鍙兘淇濆瓨鎵╁睍鎴栧揩鐓э紝涓嶈兘浣滀负绉熸埛銆侀噾棰濄€佺姸鎬併€佹潈闄愩€佸箓绛夈€佹牳蹇冭繃婊ゆ潯浠剁殑鍞竴鏉ユ簮锟?
## 17. 瀹夊叏鍒嗙骇

| 鏁版嵁绫诲瀷 | 绀轰緥瀛楁 | 瀛樺偍瑕佹眰 | API 杩斿洖瑕佹眰 |
| --- | --- | --- | --- |
| SECRET | API Key 鏄庢枃銆丳rovider token銆佺锟?| 涓嶅叆涓氬姟搴擄紱杩涘叆 Vault/Keychain/KMS | 鍙垱寤烘椂灞曠ず涓€娆★紝鍚庣画涓嶅彲锟?|
| SECRET_REF | `secret_ref` | 鍙叆搴擄紝鎸囧悜瀵嗛挜绯荤粺璺緞鎴栧彞锟?| admin 涔熼粯璁よ劚锟?|
| SECRET_HASH | `key_hash`銆乣payload_hash` | HMAC-SHA256 鎴栫瓑浠风畻娉曪紝pepper 涓嶅叆锟?| 鍙敤浜庢瘮瀵癸紝涓嶇敤浜庡睍锟?|
| PII | 鎵嬫満銆侀偖绠便€丱Auth openid銆佸湴鍧€ | 澶嶇敤 `plus_user*` 鏃㈡湁鍔犲瘑/鑴辨晱绛栫暐 | 锟?Java app/backend API 鏉冮檺杩斿洖 |
| FINANCIAL | 浣欓銆佹祦姘淬€佹敮浠樸€侀€€娆俱€佸彂锟?| 澶嶇敤 `plus_account*`銆乣plus_payment*` 绛夋棦鏈変簨瀹炶〃 | 鍙€氳繃璐︽埛/浜ゆ槗鏈嶅姟鏆撮湶 |
| AUDIT | `ops_audit_log`銆佸喅绛栨棩蹇椼€乼race | append-only銆佺暀瀛樸€乴egal hold | 锟?admin/瀹¤瑙掕壊鍙煡锛屾晱鎰熷瓧娈佃劚锟?|

## 18. 璇︾粏鏁版嵁濂戠害

鏍稿績琛ㄥ瓧娈点€佸敮涓€閿€佺储寮曘€佺姸鎬佹満銆佺敓鍛藉懆鏈熴€佺粨绠椾竴鑷存€у拰 CI 鏍￠獙瑙勫垯锟?[11-鏁版嵁濂戠害涓庢牳蹇冭〃璁捐.md](./11-鏁版嵁濂戠害涓庢牳蹇冭〃璁捐.md)銆傚墠绔姛鑳芥ā鍧楀埌鏁版嵁搴撹〃銆佸瓧娈靛拰 API 闈㈢殑瀹屾暣鏄犲皠锟?[12-鍓嶇鍔熻兘妯″潡涓庢暟鎹簱琛ㄧ粨鏋勬槧锟?md](./12-鍓嶇鍔熻兘妯″潡涓庢暟鎹簱琛ㄧ粨鏋勬槧锟?md)銆傚悗缁敓锟?DDL銆丒ntity銆丏TO銆丱penAPI 锟?SDK 鏃讹紝浠ヨ繖浜涙暟鎹绾︿负璇勫鍏ュ彛锟?
