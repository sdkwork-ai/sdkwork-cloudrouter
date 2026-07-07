> Migrated from `docs/07-鎬ц兘璁捐.md` on 2026-06-24.
> Owner: SDKWork maintainers

## 1. 鎬ц兘鐩爣

`sdkwork-clawrouter` 鐨勬€ц兘璁捐浠?Rust-first runtime 涓哄熀纭€銆傜洰鏍囦笉鏄崟绾彁楂?QPS锛岃€屾槸鍦ㄨ璇併€佽矾鐢便€侀檺娴併€佽璐广€佸璁°€乻treaming銆乫allback 鍜屽閮ㄧ讲褰㈡€佷箣闂翠繚鎸佸彲瑙ｉ噴銆佸彲瑙傛祴鍜屽彲鍘嬫祴銆?
| 灞?| 鎸囨爣 | P1 鐩爣 |
| --- | --- | --- |
| Gateway admission | 閴存潈 + API key hash + 涓婁笅鏂囧姞杞?p95 | < 20ms |
| Routing decision | 妯″瀷瑙ｆ瀽 + 绛栫暐蹇収 + provider 鍊欓€?p95 | < 10ms |
| Gateway TTFT overhead | 骞冲彴棰濆 TTFT p95 | < 50ms |
| App/Admin API | 鍏抽敭璇绘帴鍙?p95 | < 300ms |
| streaming | stream success rate | 鍙娴嬪苟鎸佺画鎻愬崌 |
| usage finalize | 鏄庣粏鍙寤惰繜 | 绉掔骇 |
| billing settlement | 璐︽埛缁撹浆 | 寮傛銆佸箓绛夈€佸彲琛ュ伩 |

涓婄嚎鍓嶅繀椤绘彁渚涘帇娴嬫姤鍛婏紝涓嶈兘浠呭嚟鎶€鏈爤瀹ｇО楂樻€ц兘銆?
## 2. 鐑矾寰勫師鍒?
Gateway 鐑矾寰勫彧鍋氬繀瑕佸伐浣滐細

1. request_id銆乼race span銆乥ody/header limit銆?2. API key hash 鏍￠獙鍜?subject context 鍔犺浇銆?3. quota/rate limit fast path銆?4. model alias銆乧apability銆乸ricing snapshot 鏌ヨ銆?5. routing profile compiled snapshot 鏌ヨ銆?6. provider health snapshot 鏌ヨ銆?7. route decision銆?8. provider adapter 鎵ц銆?9. usage/decision/attempt 杞婚噺鍐欏叆鎴?outbox enqueue銆?
涓嶅緱杩涘叆鐑矾寰勶細

- dashboard 鑱氬悎鏌ヨ銆?- 璐㈠姟瀵硅处銆?- 闀垮懆鏈熺粨绠椼€?- provider onboarding銆?- 澶у璞℃壂鎻忋€?- 绠＄悊绔鏉傛潈闄愬垪琛ㄦ煡璇€?- 鍚屾鎶ヨ〃鐢熸垚銆?
## 3. Rust async 妯″瀷

鎬ц兘鍩虹锛?
- Tokio multi-thread executor 鎵胯浇缃戠粶鍜屽紓姝ヤ换鍔°€?- Axum router 鍙仛鍗忚鍜?extractor锛屼笉鎵胯浇澶嶆潅涓氬姟瑙勫垯銆?- Tower middleware 缁熶竴 timeout銆乼race銆乥ody limit銆乧ompression銆丆ORS銆?- Provider HTTP 浣跨敤 connection pool锛岄伩鍏嶆瘡娆¤姹傞噸寤?TLS/杩炴帴銆?- streaming 閲囩敤 backpressure-safe 杞彂锛屼笉鍏ㄩ噺缂撳瓨銆?- CPU 瀵嗛泦鍨嬪伐浣滆繘鍏ヤ笓鐢?blocking pool 鎴栧紓姝?job锛屼笉闃诲 executor銆?
## 4. 缂撳瓨璁捐

| 缂撳瓨 | 鍐呭 | desktop | server/docker/kubernetes | 澶辨晥 |
| --- | --- | --- | --- | --- |
| API key digest | key hash銆佺姸鎬併€乻ubject銆乻cope | moka | moka + Redis | 鐭?TTL + 涓诲姩澶辨晥 |
| model catalog | alias銆乧apability銆乸ricing version | moka | moka + Redis | 閰嶇疆鐗堟湰 |
| routing snapshot | compiled routing profile/rule/fallback | moka | moka + Redis | snapshot version |
| provider health | latency銆乪rror rate銆乧ircuit state | moka | Redis + local mirror | 鐭?TTL |
| rate bucket | token bucket/leaky bucket | memory | Redis + local fast path | TTL |

缂撳瓨閿繀椤诲寘鍚?tenant銆乷rganization銆乻cope銆乿ersion锛岄伩鍏嶈法绉熸埛姹℃煋銆?
璧勯噾銆佽鍗曘€佹敮浠樸€佽处鎴锋祦姘淬€佸璁′笉浠ョ紦瀛樹负鐪熷€笺€?
## 5. 璺敱鎬ц兘

璺敱绛栫暐蹇呴』棰勭紪璇戜负 snapshot锛?
```text
routing_profile_version
  -> model alias map
  -> capability constraints
  -> provider candidate list
  -> channel account health
  -> pricing snapshot
  -> quota/rate policy
  -> weighted strategy
  -> fallback chain
```

璇锋眰鏃跺彧璇诲彇 compiled snapshot锛屼笉涓存椂鎷艰澶嶆潅瑙勫垯銆?
鏀寔绛栫暐锛?
- deterministic priority锛氱ǔ瀹氫紭鍏堢骇銆?- weighted random锛氭寜鏉冮噸鍒嗘祦銆?- SLO-aware锛氱粨鍚堝欢杩熴€侀敊璇巼銆佸閲忋€?- geo affinity锛氬尯鍩熶翰鍜屻€?- cost-aware锛氱粨鍚堜緵搴斿晢浠锋牸鍜屽鎴峰畾浠锋柟妗堛€?- fallback chain锛氫笂娓搁敊璇€佽秴鏃躲€佺啍鏂悗鐨勫€欓€夐摼銆?
route decision 蹇呴』璁板綍鍙В閲婅瘉鎹細鍊欓€夈€佽繃婊ゅ師鍥犮€佹帓搴忓洜绱犮€佹渶缁堥€夋嫨銆乫allback 鍘熷洜銆?
## 6. streaming 鎬ц兘

streaming 鏄?`/v1/**` 鐨勬牳蹇冭兘鍔涳細

1. SSE/chunk 涓嶅叏閲忔嫾鎺ャ€?2. 涓婃父 chunk 鍒颁笅娓?chunk 鐨勫鐞嗗彧鍋氬繀瑕佸崗璁浆鎹㈠拰 usage metadata 閲囬泦銆?3. 鏀寔 client_cancelled銆乸rovider_failed銆乬ateway_timeout銆乫allback_exhausted 鐘舵€併€?4. 涓婃父 stall 蹇呴』鏈?heartbeat/timeout銆?5. usage finalize 涓嶉樆濉炴渶鍚庝竴涓?chunk 鍙戦€併€?6. 涓柇涔熷繀椤诲啓 request trace 鍜?partial usage evidence銆?
## 7. 鍐欏叆涓?batch writer

楂橀鍐欏叆鍖呮嫭锛?
- `ai_request_trace`
- `ai_routing_decision_log`
- `ai_usage`
- provider attempt
- rate limit event
- audit evidence

鍐欏叆绛栫暐锛?
| 鍦烘櫙 | 绛栫暐 |
| --- | --- |
| desktop | SQLite transaction + local batch writer |
| server | PostgreSQL async batch writer |
| docker | PostgreSQL + optional Redis queue |
| kubernetes | PostgreSQL partition + outbox + worker batch writer |

鍏抽敭浜嬪疄鍙互鍏堣交閲忓悓姝ュ啓鍏ワ紝閲嶅瀷鑱氬悎鍜屾姤琛ㄦ姇褰卞紓姝ユ墽琛屻€傝祫閲戠粨杞繀椤诲箓绛夈€佸彲閲嶆斁銆佸彲琛ュ伩銆?
## 8. 鏁版嵁搴撳閲忚璁?
### 8.1 閰嶇疆琛?
Provider銆丆hannel銆丮odel銆丳ricing銆丷outing銆丵uota锛?
- 璇诲鍐欏皯銆?- 浣跨敤 version 鍜?published snapshot銆?- 楂橀璇诲彇璧?moka/Redis銆?- 鍐欐搷浣滃璁″苟瑙﹀彂涓诲姩澶辨晥銆?
### 8.2 鏄庣粏琛?
Request trace銆乨ecision log銆乽sage fact銆乤udit log锛?
- 鍐欏叆楂樸€佹煡璇㈡寜鏃堕棿鑼冨洿銆?- PostgreSQL 鐢熶骇寤鸿鎸夋湀鎴栨寜鏃堕棿鍒嗗尯銆?- 楂橀绱㈠紩浠?`tenant_id`銆乣organization_id`銆乣occurred_at` 璧峰銆?- 鏀寔褰掓。鍜屽喎鐑垎灞傘€?
### 8.3 璐︽埛浜ゆ槗琛?
`plus_account`銆乣plus_account_history`銆乣plus_order`銆乣plus_payment`锛?
- 娌跨敤 Java-owned 琛ㄧ粨鏋勩€?- 浣欓鍙樻洿蹇呴』涓庢祦姘翠繚鎸佷簨鍔′竴鑷淬€?- usage 鍒拌祫閲戠粨杞彲寮傛锛屼絾缁撹浆杩囩▼蹇呴』骞傜瓑銆?
## 9. 闄愭祦鍜岀啍鏂?
闄愭祦缁村害锛?
- tenant
- user
- API key
- channel group
- model
- provider
- channel
- capability family

鐔旀柇缁村害锛?
- provider 閿欒鐜囥€?- channel account 閿欒鐜囥€?- model timeout銆?- 鍖哄煙涓嶅彲鐢ㄣ€?- 绉熸埛寮傚父绐佸銆?
绛栫暐鐪熷€煎湪鏁版嵁搴擄紝杩愯鐘舵€佸湪 Redis/moka銆?
## 10. 鍘嬫祴璁″垝

P1 涓婄嚎鍓嶈嚦灏戝帇娴嬶細

1. `/v1/chat/completions` 闈炴祦寮忋€?2. `/v1/chat/completions` streaming銆?3. `/v1/responses`銆?4. `/v1/embeddings`銆?5. API key 閴存潈楂樺苟鍙戙€?6. routing snapshot 楂樺苟鍙戙€?7. provider timeout 鍜?fallback銆?8. usage fact 鍐欏叆鍜?finalize銆?9. console usage/dashboard 鏌ヨ銆?10. admin monitor 鏌ヨ銆?
鎶ュ憡蹇呴』鍖呭惈锛?
- QPS銆佸苟鍙戙€乸50/p95/p99銆?- 閿欒鐜囧拰鍙栨秷鐜囥€?- 涓婃父寤惰繜鍒嗗竷銆?- 缃戝叧鑷韩寮€閿€銆?- database CPU/IO銆?- Redis/moka 鍛戒腑鐜囥€?- connection pool 鐘舵€併€?- batch writer backlog銆?
## 11. 鎬ц兘绾㈢嚎

1. 绂佹 dashboard SQL 杩涘叆 Gateway 鐑矾寰勩€?2. 绂佹 streaming 鍏ㄩ噺缂撳啿銆?3. 绂佹鏃犱笂闄愰噸璇曘€?4. 绂佹姣忔璇锋眰閲嶆柊鍔犺浇鍏ㄩ儴璺敱閰嶇疆銆?5. 绂佹娌℃湁鍘嬫祴璇佹嵁灏卞绉伴珮鎬ц兘銆?6. 绂佹鎶?desktop 缁撴灉濂楃敤鍒?server/docker/kubernetes銆?7. 绂佹涓烘€ц兘缁曡繃璐︽埛銆侀厤棰濄€佸璁″拰瀹夊叏銆?
