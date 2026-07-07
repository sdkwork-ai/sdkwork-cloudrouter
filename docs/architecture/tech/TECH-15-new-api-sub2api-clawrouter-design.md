> Migrated from `docs/15-new-api-sub2api浠锋牸浣撶郴瀵规瘮涓嶤lawRouter瀹氫环璁捐.md` on 2026-06-24.
> Owner: SDKWork maintainers

鐗堟湰锛?.1.0
鏃ユ湡锛?026-04-28
绾︽潫锛氫笉鏀瑰彉 `apps/sdkwork-clawrouter-pc` 鐨?UI 瑙嗚璁捐锛涘悗绔暟鎹粨鏋勫拰 API DTO 閫傞厤鏃㈡湁椤甸潰銆?
## 1. 缁撹

Claw Router 涓嶉噰鐢?`ai_pricing_group` 浣滀负琛ㄥ悕鎴栭鍩熷悕銆備骇鍝侀噷鐨?Group 鏄笟鍔″垎缁勶紝鐢?`ai_channel_group` 琛ㄨ揪锛涘垱寤?API Key 鏃堕€夋嫨璇ュ垎缁勶紝钀藉埌 `iam_gateway_api_key.channel_group_id`銆備环鏍煎彧浣滀负鍒嗙粍鐨勪竴椤归粯璁ょ瓥鐣ワ紝閫氳繃 `ai_channel_group.pricing_plan_id` 鎸囧悜 `ai_pricing_plan`銆?
瀹氫环鏍稿績鎷嗘垚浜斿眰锛?
1. `ai_billing_meter`锛氱粺涓€璁￠噺琛紝瀹氫箟 token銆佽姹傘€佺粨鏋溿€佷釜鏁般€佺鏁般€佸瓧绗︺€佸瓨鍌ㄣ€佹祦閲忕瓑鍙璐圭淮搴︺€?2. `ai_model_pricing`锛氭ā鍨嬩环鏍肩翱锛屼繚瀛樺畼鏂瑰弬鑰冧环銆佷緵搴斿晢鎴愭湰浠枫€佸鎴烽攢鍞环鍜屽唴閮ㄧ粨绠椾环銆?3. `ai_channel_group`锛氫笟鍔″垎缁勶紝淇濆瓨骞冲彴銆佽璐圭被鍨嬨€佸€嶇巼銆侀粯璁ょ瓥鐣ャ€佸閲忓拰榛樿瀹氫环鏂规銆?4. `ai_pricing_plan`锛氬畾浠锋柟妗堬紝瀹氫箟榛樿鍙傝€冧环渚с€侀粯璁ゅ€嶇巼銆佸竵绉嶃€佸彇鏁淬€佺己浠风瓥鐣ュ拰鐗堟湰銆?5. `ai_pricing_rule` + `ai_pricing_tier`锛氬畾浠疯鍒欏拰闃舵锛屾寜妯″瀷銆佸巶瀹躲€佷緵搴斿晢銆佹笭閬撱€佽兘鍔涖€佽閲忚〃鍜屼环鏍奸」瑕嗙洊榛樿鏂规銆?6. `ai_usage.pricing_snapshot`锛氳姹傚畬鎴愭椂鍥哄寲浠锋牸蹇収锛屽巻鍙茶处鍗曚笉鍥炴煡褰撳墠浠锋牸琛ㄩ噸绠椼€?
## 2. new-api 鍙惛鏀剁偣

鍙傝€冩簮鐮侊細

- `external/new-api/setting/ratio_setting/group_ratio.go`
- `external/new-api/setting/ratio_setting/model_ratio.go`
- `external/new-api/relay/helper/price.go`
- `external/new-api/service/text_quota.go`
- `external/new-api/pkg/billingexpr/types.go`

new-api 鐨勪紭鐐规槸閰嶇疆绠€鍗曘€佺儹璺緞璁＄畻鐩存帴锛屾牳蹇冩蹇靛寘鎷細

| new-api 姒傚康 | 浣滅敤 | Claw Router 钀界偣 |
| --- | --- | --- |
| `GroupRatio` | 浣跨敤鍒嗙粍鍊嶇巼 | `ai_channel_group.rate_multiplier`銆乣ai_pricing_plan.default_multiplier` |
| `GroupGroupRatio` | 鐢ㄦ埛缁勫埌浣跨敤鍒嗙粍鐨勭壒娈婂€嶇巼 | `ai_pricing_plan_binding.multiplier_override` |
| `ModelRatio` | 妯″瀷鍊嶇巼 | `ai_pricing_rule.formula_mode=multiplier` |
| `ModelPrice` | 鍥哄畾妯″瀷浠锋牸 | `ai_pricing_rule.formula_mode=fixed` 鎴?`ai_model_pricing.unit_price` |
| `CompletionRatio` | 杈撳嚭 token 鍊嶇巼 | `ai_pricing_rule` 鎸?`price_item_type=output` 閰嶇疆 multiplier |
| `CacheRatio` / `CreateCacheRatio` | 缂撳瓨鍛戒腑/鍐欏叆鍊嶇巼 | `ai_model_pricing.price_item_type=cache_read/cache_write` 鎴?`ai_pricing_tier` |
| `ImageRatio` / `AudioRatio` | 澶氭ā鎬佸€嶇巼 | `price_item_type=image/audio/video` |
| `tiered_expr` | 琛ㄨ揪寮忚璐?| `ai_pricing_rule.formula_mode=expression` + `expression_hash` |

闇€瑕侀伩鍏嶇殑闂锛?
- new-api 澶ч噺浣跨敤 JSON map 閰嶇疆浠锋牸锛岄€傚悎灏忕郴缁燂紝浣嗕笉鍒╀簬瀹¤銆佸垎椤点€佺増鏈€佹潈闄愬拰澶氱鎴烽殧绂汇€?- ratio 浣跨敤 float锛孋law Router 浠锋牸銆侀噾棰濆拰鍊嶇巼蹇呴』鐢?decimal string銆?- 琛ㄨ揪寮忚璐瑰繀椤诲彈鐧藉悕鍗曞嚱鏁般€佺増鏈拰 hash 绾︽潫锛屼笉鍏佽浠绘剰鑴氭湰杩涘叆鐑矾寰勩€?
## 3. sub2api 鍙惛鏀剁偣

鍙傝€冩簮鐮侊細

- `external/sub2api/backend/migrations/001_init.sql`
- `external/sub2api/backend/migrations/047_add_user_group_rate_multipliers.sql`
- `external/sub2api/backend/migrations/082_refactor_channel_pricing.sql`
- `external/sub2api/backend/migrations/086_channel_platform_pricing.sql`
- `external/sub2api/backend/internal/service/model_pricing_resolver.go`
- `external/sub2api/backend/internal/service/pricing_service.go`
- `external/sub2api/backend/internal/service/billing_service.go`

sub2api 鐨勪紭鐐规槸娓犻亾瀹氫环銆佸尯闂村畾浠峰拰瀹氫环鏉ユ簮鍥為€€閾炬瘮杈冩竻鏅帮細

| sub2api 姒傚康 | 浣滅敤 | Claw Router 钀界偣 |
| --- | --- | --- |
| `groups.rate_multiplier` | 鍒嗙粍璐圭巼鍊嶇巼 | `ai_channel_group.rate_multiplier` |
| `api_keys.group_id` | API Key 閫夋嫨鍒嗙粍 | `iam_gateway_api_key.channel_group_id`锛屽吋瀹?`plus_api_key` 鏃堕€氳繃 `legacy_api_key_id` |
| `ai_channel_groups` | 涓婃父璐﹀彿鍙粦瀹氬垎缁?| `integration_provider_account` + 鍒嗙粍绛栫暐鎴栧悗缁?`ai_channel_group_member` |
| `user_group_rate_multipliers` | 鐢ㄦ埛涓撳睘鍒嗙粍鍊嶇巼 | `ai_pricing_plan_binding.subject_type=user + multiplier_override` |
| `channel_model_pricing.billing_mode` | token/per_request/image 妯″紡 | `ai_model_pricing.billing_mode`銆乣ai_pricing_rule.billing_mode` |
| `channel_pricing_intervals` | token/context/request/image 鍖洪棿 | `ai_pricing_tier` |
| `channel_model_pricing.platform` | 骞冲彴缁村害浠锋牸 | `ai_model_pricing.platform_code`銆乣ai_pricing_rule.platform_code` |
| LiteLLM pricing mirror | 瀹樻柟浠?鍙傝€冧环瀵煎叆 | `ai_pricing_import_snapshot` + `ai_model_pricing.price_side=official_reference` |

闇€瑕侀伩鍏嶇殑闂锛?
- sub2api 鎶?group銆乧hannel銆乤ccount銆乸ricing 鐨勯儴鍒嗚兘鍔涜€﹀悎鍦ㄤ竴璧凤紝Claw Router 闇€瑕佹洿娓呮櫚鐨勪簨瀹炶竟鐣屻€?- LiteLLM 瀵煎叆浠锋牸鏄弬鑰冩簮涔嬩竴锛屼笉搴旂洿鎺ユ垚涓哄敮涓€瀹樻柟浜嬪疄锛涘繀椤讳繚瀛?`source_url`銆乣source_hash`銆乣published_at`銆乣observed_at`銆?- 鐢ㄦ埛銆乂IP銆佽处鎴枫€佷紭鎯犲埜銆佺Н鍒嗗厖鍊肩瓑浜嬪疄缁х画淇濇寔 `plus_*` 鐗╃悊琛ㄧ粨鏋勪竴鑷达紝涓嶆妸杩欎簺浜嬪疄杩佺Щ鍒?pricing 琛ㄣ€?
## 4. 鏍囧噯棰嗗煙妯″瀷

### 4.0 BillingMeter 鏄璐圭淮搴?
`ai_billing_meter` 鍙洖绛斺€滆璐规暟閲忔槸浠€涔堚€濓紝涓嶅洖绛斺€滄ā鍨嬫敮鎸佷粈涔堣兘鍔涒€濓紝涔熶笉鍥炵瓟鈥滀环鏍兼槸澶氬皯鈥濄€傛ā鍨嬭兘鍔涗粛鐢?`ai_model_capability` 琛ㄨ揪锛屼环鏍肩敱 `ai_model_pricing`銆乣ai_pricing_rule` 鍜?`ai_pricing_tier` 琛ㄨ揪銆?
鏍囧噯 meter 瑕嗙洊锛?
| 璁¤垂鍦烘櫙 | meter 绀轰緥 | 鏁伴噺鏉ユ簮 |
| --- | --- | --- |
| LLM 杈撳叆/杈撳嚭 | `llm_input_token`銆乣llm_output_token` | provider usage 鎴栫綉鍏?tokenizer |
| LLM 缂撳瓨 | `llm_cache_read_token`銆乣llm_cache_write_token` | provider usage |
| Embedding | `embedding_input_token` | 璇锋眰鏂囨湰 tokenizer |
| 鍥剧墖 | `image_result`銆乣image_pixel`銆乣image_input_token` | 鍝嶅簲缁撴灉鏁般€佸昂瀵搞€乸rovider usage |
| 璇煶/闊抽 | `audio_input_second`銆乣audio_output_second`銆乣speech_character` | 濯掍綋鍏冩暟鎹€佽姹傚瓧绗︽暟 |
| 瑙嗛 | `video_input_second`銆乣video_output_second` | 濯掍綋鍏冩暟鎹?|
| 闊充箰/闊虫晥 | `music_output_second`銆乣sfx_result` | 濯掍綋鍏冩暟鎹€佺粨鏋滄暟 |
| 閫氱敤 API | `api_request`銆乣api_result`銆乣api_item`銆乣tool_call` | 璇锋眰娆℃暟銆佸搷搴旀暟缁勯暱搴︺€佸伐鍏疯皟鐢ㄦ暟 |
| 璧勬簮鍨?| `storage_gb_day`銆乣bandwidth_gb` | 璧勬簮閲囨牱鎴栫綉鍏崇粺璁?|

鏈潵鏂板璁¤垂鏂瑰紡鏃朵紭鍏堟柊澧?meter 鍜岃鍒欙紝涓嶆柊澧炰笓鐢ㄤ环鏍艰〃瀛楁銆傛瘮濡傗€滄寜鎴愬姛缁撴灉璁¤垂鈥濅娇鐢?`billing_mode=per_result + billing_meter_code=api_result`锛涒€滄寜杩斿洖鏉＄洰鏁拌璐光€濅娇鐢?`billing_mode=per_item + billing_meter_code=api_item`銆?
### 4.1 Group 鏄笟鍔″垎缁?
`ai_channel_group` 鏄?`/admin/group` 鍜?`/console/api-keys` 鐨勪簨瀹炴潵婧愶細

- 鍒涘缓 API Key 鏃堕€夋嫨鍒嗙粍锛歚iam_gateway_api_key.channel_group_id`銆?- 鍒嗙粍榛樿璁块棶绛栫暐锛歚default_policy_id`銆?- 鍒嗙粍榛樿閰嶉绛栫暐锛歚default_quota_policy_id`銆?- 鍒嗙粍榛樿瀹氫环鏂规锛歚pricing_plan_id`銆乣pricing_plan_code`銆?- 鍒嗙粍蹇€熷€嶇巼锛歚rate_multiplier`銆乣official_price_multiplier`銆?- 鍒嗙粍瀹归噺鍜岀敤閲忥細`ai_channel_group_metric_snapshot`銆?
鍥犳涓嶅缓绔?`ai_pricing_group`銆傝繖鏍峰彲浠ラ伩鍏嶁€滀笟鍔″垎缁勨€濆拰鈥滀环鏍煎垎缁勨€濅袱涓蹇靛湪 UI銆丄PI銆佹暟鎹〃鍜?SDK 涓簰鐩歌鐩栥€?
### 4.2 PricingPlan 鏄畾浠锋柟妗?
`ai_pricing_plan` 鍙洖绛斺€滃懡涓繖濂楁柟妗堝悗锛屼环鏍煎浣曠畻鈥濓細

- `base_price_side`锛氶€氬父涓?`official_reference`锛屼篃鍙负 `upstream_cost`銆?- `default_multiplier`锛氶粯璁ゅ€嶇巼锛屼緥濡?1.0銆?.2銆?.85銆?- `default_markup_amount`锛氬浐瀹氬姞浠枫€?- `billing_mode`锛歵oken銆乫ixed_price銆乸er_request銆乼iered銆乪xpression銆乮mage銆乤udio銆乿ideo銆?- `fallback_mode`锛氱己浠锋椂鏄嫆缁濄€佸洖閫€瀹樻柟浠枫€佸洖閫€鎴愭湰浠枫€佸厤璐硅繕鏄汉宸ュ鏍搞€?- `effective_from/effective_to`锛氫环鏍肩増鏈敓鏁堢獥鍙ｃ€?
`ai_pricing_plan_binding` 鐢ㄤ簬涓撳睘瑕嗙洊锛屼笉鏇夸唬涓氬姟鍒嗙粍锛?
- `subject_type=channel_group`锛氭煇涓氬姟鍒嗙粍缁戝畾鏂规銆?- `subject_type=api_key`锛氬崟涓?Key 鐗逛环銆?- `subject_type=user`锛氱敤鎴蜂笓灞炲€嶇巼銆?- `subject_type=vip_level`锛歏IP 绛夌骇瀹氫环銆?- `subject_type=sku`锛氬晢鍝?SKU 瀵瑰簲瀹氫环銆?- `subject_type=tenant/organization`锛氱鎴锋垨缁勭粐榛樿瀹氫环銆?
## 5. 瀹樻柟浠枫€佷緵搴斿晢浠枫€侀攢鍞环

`ai_model_pricing.price_side` 鏄环鏍艰涔夌殑鏍稿績锛?
| price_side | 鍚箟 | 鍏稿瀷 scope | 鐢ㄩ€?|
| --- | --- | --- | --- |
| `official_reference` | 瀹樻柟鍙傝€冧环 | global銆乿endor銆乵odel | 鍓嶅彴灞曠ず銆侀攢鍞环鍊嶇巼鍙傝€冦€佺己浠峰洖閫€ |
| `upstream_cost` | 渚涘簲鍟嗕笂娓告垚鏈环 | provider銆乧hannel | 璺敱鎴愭湰浼樺寲銆佹瘺鍒╁垎鏋愩€佷緵搴斿晢瀵硅处 |
| `customer_charge` | 瀹㈡埛閿€鍞环 | pricing_plan銆乧hannel_group銆乻ku銆乼enant | 鐢ㄦ埛鎵ｈ垂銆佹ā鍨嬮〉灞曠ず銆佽处鍗?|
| `internal_transfer` | 鍐呴儴缁撶畻浠?| organization銆亀orkspace | 鍐呴儴鎴愭湰鍒嗘憡 |

涓€涓ā鍨嬪彲浠ユ湁澶氫釜渚涘簲鍟嗕环鏍硷細

```text
ai_model(model = gpt-4o)
  -> ai_model_pricing(price_side=official_reference, provider_code=null, channel_id=null)
  -> ai_model_pricing(price_side=upstream_cost, provider_code=openai, channel_id=1001)
  -> ai_model_pricing(price_side=upstream_cost, provider_code=azure_openai, channel_id=2001)
  -> ai_model_pricing(price_side=upstream_cost, provider_code=openrouter, channel_id=3001)
  -> ai_model_pricing(price_side=customer_charge, pricing_plan_id=default)
  -> ai_model_pricing(price_side=customer_charge, pricing_plan_id=vip)
```

渚涘簲鍟嗕环鏍间笉淇敼瀹樻柟浠凤紱閿€鍞环涔熶笉瑕嗙洊渚涘簲鍟嗘垚鏈环銆備笁鑰呴€氳繃 `reference_price_id`銆乣reference_price_side`銆乣reference_multiplier`銆乣price_origin` 鍜?`import_snapshot_id` 寤虹珛璇佹嵁閾俱€?
## 6. 璁¤垂瑙ｆ瀽椤哄簭

鍦ㄧ嚎璇锋眰璁¤垂瑙ｆ瀽搴旀寜浠ヤ笅椤哄簭鎵ц锛?
1. 瑙ｆ瀽 API Key锛屽緱鍒?`api_key_id`銆乣group_id`銆佺敤鎴枫€佺鎴枫€佺粍缁囥€?2. 璇诲彇 `ai_channel_group.pricing_plan_id`锛屽啀妫€鏌?`ai_pricing_plan_binding` 鏄惁鏈夋洿楂樹紭鍏堢骇鐨?user/api_key/vip/sku 涓撳睘缁戝畾銆?3. 鍦ㄥ懡涓殑 `ai_pricing_plan` 涓嬪尮閰?`ai_pricing_rule`锛屼紭鍏堢骇涓?channel > provider > model > family > vendor > wildcard銆?4. 瑙ｆ瀽 `billing_meter_code` 鍜?`billable_quantity`銆侺LM 浣跨敤 token锛屽浘鐗囧彲浣跨敤缁撴灉鏁版垨鍍忕礌锛岃闊?瑙嗛鍙娇鐢ㄧ鏁帮紝閫氱敤 API 鍙娇鐢ㄨ姹傛暟銆佺粨鏋滄暟鎴栨潯鐩暟銆?5. 瑙勫垯鑻ユ寚瀹?`unit_price_override`锛屼娇鐢ㄥ浐瀹氫环銆?6. 瑙勫垯鑻ユ寚瀹?`reference_pricing_id`锛屾寜璇ヤ环鏍艰娲剧敓銆?7. 鏈寚瀹?reference 鏃讹紝鎸?`reference_price_side` 鏌ヨ褰撳墠妯″瀷鐨勫畼鏂逛环鎴栦緵搴斿晢鎴愭湰浠枫€?8. 鑻ュ瓨鍦?`ai_pricing_tier`锛屾寜涓婁笅鏂囬暱搴︺€佽姹傛鏁般€佺粨鏋滄暟銆佹潯鐩暟銆佸浘鐗囧昂瀵搞€侀煶棰?瑙嗛鏃堕暱銆佸瓧绗︽暟銆佸瓨鍌ㄩ噺銆佹祦閲忔垨 tier label 鍛戒腑鍖洪棿銆?9. 鑻?`formula_mode=expression`锛屾墽琛岀櫧鍚嶅崟琛ㄨ揪寮忥紝骞惰褰?`expression_hash`銆?10. 鐢熸垚 `ai_usage`锛屽啓鍏?`billing_meter_code`銆乣billable_quantity`銆乣pricing_plan_id`銆乣pricing_rule_id`銆乣pricing_tier_id`銆佸崟浠枫€佸€嶇巼銆佸畼鏂瑰弬鑰冮噾棰濄€佷笂娓告垚鏈噾棰濄€佸鎴锋敹璐归噾棰濆拰瀹屾暣 `pricing_snapshot`銆?
## 7. 鍏紡瑙勮寖

Token 浠锋牸锛?
```text
customer_charge =
  (input_tokens * input_price
   + output_tokens * output_price
   + cache_read_tokens * cache_read_price
   + cache_write_tokens * cache_write_price
   + image_tokens * image_price
   + audio_seconds * audio_price
   + video_seconds * video_price)
  * pricing_plan.default_multiplier
  * rule.multiplier
  + markup_amount
```

瀹樻柟浠峰€嶇巼娲剧敓锛?
```text
customer_unit_price =
  official_reference_unit_price * reference_multiplier + markup_amount
```

渚涘簲鍟嗘垚鏈环锛?
```text
upstream_cost =
  provider_channel_unit_price * actual_usage
```

鍒╂鼎鍒嗘瀽锛?
```text
gross_margin = customer_charge_amount - upstream_cost_amount
```

閫氱敤 meter 浠锋牸锛?
```text
charge_amount =
  max(ceil_to_step(billable_quantity - included_quantity, quantity_step), minimum_quantity)
  * unit_price
  * reference_multiplier
  + markup_amount
```

鎸夌粨鏋滄垨鎸変釜鏁拌璐癸細

```text
billable_quantity = count(response.results)       # api_result
billable_quantity = sum(response.items[].count)   # api_item
```

鎸夋椂闀胯璐癸細

```text
billable_quantity = ceil(media_duration_seconds / quantity_step) * quantity_step
```

鎵€鏈夐噾棰濆拰鍊嶇巼鍦?API/SDK 涓繀椤绘槸 decimal string锛屾暟鎹簱濂戠害涓娇鐢?`decimal`锛岀姝?float/double銆?
## 8. 椤甸潰瑕嗙洊

| 椤甸潰 | 鏁版嵁闇€姹?| 钀界偣 |
| --- | --- | --- |
| `/console/api-keys` | 鍒涘缓 Key 鏃堕€夋嫨鍒嗙粍锛涘睍绀哄垎缁勫閲忋€侀搴︺€佺敤閲?| `iam_gateway_api_key.channel_group_id`銆乣ai_channel_group`銆乣ai_channel_group_metric_snapshot` |
| `/admin/group` | 鍒嗙粍銆佸钩鍙般€佽璐圭被鍨嬨€佸€嶇巼銆侀粯璁ゅ畾浠锋柟妗堛€佽处鍙峰閲忋€佷娇鐢ㄩ噺 | `ai_channel_group`銆乣ai_pricing_plan`銆乣ai_pricing_plan_binding`銆乣ai_channel_group_metric_snapshot` |
| `/admin/model` | 璁￠噺琛ㄣ€佸畼鏂逛环銆佷緵搴斿晢鎴愭湰浠枫€侀攢鍞环銆侀樁姊€佽〃杈惧紡銆佹潵婧?hash | `ai_billing_meter`銆乣ai_model_pricing`銆乣ai_pricing_rule`銆乣ai_pricing_tier`銆乣ai_pricing_import_snapshot` |
| `/models` | 褰撳墠鐢ㄦ埛鎴栭粯璁ゅ垎缁勫彲瑙侀攢鍞环锛屽繀瑕佹椂鏍囪鍥為€€鏉ユ簮 | `ai_model_pricing.price_side=customer_charge`锛岀己澶辨椂鍥為€€ `official_reference` |
| `/admin/record` | 璁¤垂鏄庣粏銆佸€嶇巼銆佸懡涓鍒欍€佷环鏍煎揩鐓?| `ai_usage.pricing_snapshot` |

## 9. 鐑矾寰勫拰瀹¤

- 鐑矾寰勮鍙栫紦瀛樺寲鍚庣殑 `GatewayGroupPricingSnapshot`锛屼笉鍦ㄨ姹備腑澶氳〃娣?join銆?- 鎺у埗闈慨鏀?`ai_channel_group`銆乣ai_pricing_plan`銆乣ai_pricing_rule`銆乣ai_pricing_tier` 鍚庡繀椤诲彂鍑?`ops_outbox_event`锛岀綉鍏冲埛鏂扮紦瀛樸€?- `ai_pricing_import_snapshot` 璁板綍鏉ユ簮 hash锛岀敤浜庡垽鏂畼鏂逛环鏄惁鍙樺寲銆?- `ai_usage` 鏄璐逛簨瀹烇紝涓嶈兘鍥犱环鏍艰〃鍙樻洿閲嶇畻鍘嗗彶璐﹀崟銆?- `ops_audit_log` 璁板綍鍚庡彴淇敼浠锋牸銆佸垎缁勫€嶇巼銆佽〃杈惧紡銆佷緵搴斿晢鎴愭湰浠风瓑楂橀闄╂搷浣溿€?
## 10. 鍛藉悕绾㈢嚎

- 涓嶄娇鐢?`ai_pricing_group`锛岄伩鍏嶆妸涓氬姟鍒嗙粍璇缓涓轰环鏍间笓鐢ㄥ垎缁勩€?- 涓嶄娇鐢?`claw_`銆乣router_`銆乣sdkwork_`銆乣console_`銆乣admin_`銆乣portal_` 浣滀负鏂颁笟鍔¤〃鍓嶇紑銆?- 涓嶅鍒?`plus_user`銆乣plus_vip_*`銆乣plus_account*`銆乣plus_order*`銆乣plus_payment*` 鐨勪簨瀹炶〃缁撴瀯锛涘崱鍒歌惀閿€缁熶竴浣跨敤鏍囧噯 `promotion_*` 浜嬪疄琛ㄣ€?- 涓嶄互 JSON map 浣滀负浠锋牸浜嬪疄鍞竴鏉ユ簮锛汮SON 鍙繚瀛樺揩鐓с€佽〃杈惧紡鍙傛暟銆佸鍏ュ師鏂囧紩鐢ㄥ拰鎵╁睍 metadata銆?
