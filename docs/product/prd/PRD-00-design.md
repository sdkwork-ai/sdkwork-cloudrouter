> Migrated from `docs/00-璁捐鏂囨。绱㈠紩.md` on 2026-06-24.
> Owner: SDKWork maintainers

> 鐗堟湰锛歷0.1
> 鏃ユ湡锛?026-04-28 
> 渚濇嵁锛歚DATABASE_SPEC.md`銆乣apps/sdkwork-clawrouter-pc`銆乣legacy-java-plus-backend-api` 涓?`legacy-java-plus-app-api` API 鏍囧噯銆?

## 1. 鏂囨。闆?
| 鏂囨。 | 鐩爣 |
| --- | --- |
| [01-PRD-sdkwork-clawrouter.md](./01-PRD-sdkwork-clawrouter.md) | 浜у搧瀹氫綅銆佺洰鏍囩敤鎴枫€佷骇鍝侀潰銆佸姛鑳借寖鍥淬€佺増鏈矾绾垮拰楠屾敹鏍囧噯 |
| [02-鎶€鏈灦鏋勮璁?md](./02-鎶€鏈灦鏋勮璁?md) | 鎬讳綋鏋舵瀯銆佽繍琛岄潰銆佸垎灞傘€佺姸鎬佺湡鍊笺€佷富閾捐矾鍜屾灦鏋勫喅绛?|
| [03-鎶€鏈€夊瀷.md](./03-鎶€鏈€夊瀷.md) | 鍚庣銆佺綉鍏炽€佸墠绔€佹暟鎹簱銆佺紦瀛樸€侀儴缃层€佽娴嬨€佸畨鍏ㄧ粍浠堕€夊瀷 |
| [04-妯″潡瑙勫垝.md](./04-妯″潡瑙勫垝.md) | public銆乧onsole銆乤dmin銆乬ateway銆乨omain銆亀orker銆乷ps 妯″潡杈圭晫 |
| [05-鏁版嵁搴撹璁?md](./05-鏁版嵁搴撹璁?md) | 鏁版嵁搴撴爣鍑嗐€佸瓨閲忚〃鍏煎銆佹柊寤鸿〃鍓嶇紑銆佹牳蹇冭〃濂戠害銆佺储寮曞拰婕旇繘绛栫暐 |
| [06-API-Gateway涓庢帴鍙ｆ爣鍑嗚璁?md](./06-API-Gateway涓庢帴鍙ｆ爣鍑嗚璁?md) | `/v1/*` 缃戝叧鍏煎闈€乣/backend/v3/api` 绠＄悊闈€乣/app/v3/api` 鐢ㄦ埛闈?|
| [07-鎬ц兘璁捐.md](./07-鎬ц兘璁捐.md) | 鐑矾寰勩€佺紦瀛樸€佹祦寮忋€佸紓姝ャ€佸閲忋€佸帇娴嬩笌 SLO 闂ㄦ |
| [08-瀹夊叏璁捐.md](./08-瀹夊叏璁捐.md) | 韬唤銆佹巿鏉冦€佸瘑閽ャ€佺鎴烽殧绂汇€佸璁°€佸悎瑙勫拰渚涘簲閾惧畨鍏?|
| [09-閮ㄧ讲鏋舵瀯璁捐.md](./09-閮ㄧ讲鏋舵瀯璁捐.md) | 鏈湴妗岄潰銆丼erver銆丏ocker銆並8S 鍥涚閮ㄧ讲鏂瑰紡涓庡彂甯冩不鐞?|
| [10-API璺緞涓€鑷存€т笌鑷敱鍒囨崲鏋舵瀯.md](./10-API璺緞涓€鑷存€т笌鑷敱鍒囨崲鏋舵瀯.md) | Java app/backend API 璺緞涓€鑷存€с€乥ase URL 鍒囨崲鍜屽閮ㄧ讲鑷敱鍒囨崲鏍囧噯 |
| [11-鏁版嵁濂戠害涓庢牳蹇冭〃璁捐.md](./11-鏁版嵁濂戠害涓庢牳蹇冭〃璁捐.md) | 瀛橀噺 `plus_*` 琛ㄥ鐢ㄨ竟鐣屻€佹柊澧炴牳蹇冭〃瀛楁濂戠害銆佺储寮曘€佺暀瀛樸€佷簨浠朵竴鑷存€у拰 CI 闂ㄧ |
| [12-鍓嶇鍔熻兘妯″潡涓庢暟鎹簱琛ㄧ粨鏋勬槧灏?md](./12-鍓嶇鍔熻兘妯″潡涓庢暟鎹簱琛ㄧ粨鏋勬槧灏?md) | 褰撳墠 portal 鍓嶇 public/console/admin 妯″潡鍒嗘瀽銆佹ā鍧楀埌琛ㄦ槧灏勩€佸畬鏁撮€昏緫琛ㄧ粨鏋勬竻鍗?|
| [13-椤甸潰绾ф暟鎹粨鏋勮鐩栦笌SchemaRegistry钀藉湴璁捐.md](./13-椤甸潰绾ф暟鎹粨鏋勮鐩栦笌SchemaRegistry钀藉湴璁捐.md) | portal 姣忎釜椤甸潰鍒颁簨瀹炶〃/鎶曞奖琛?API 闈㈢殑瑕嗙洊鐭╅樀銆侀〉闈㈢骇楠屾敹鍙ｅ緞鍜?Schema Registry 钀藉湴瑙勫垯 |
| [14-鏁版嵁缁撴瀯缁嗚妭澶嶆牳涓庤ˉ寮鸿褰?md](./14-鏁版嵁缁撴瀯缁嗚妭澶嶆牳涓庤ˉ寮鸿褰?md) | 鍩轰簬鍓嶇 service/interface/mock data 鐨勫瓧娈电骇澶嶆牳銆佺己鍙ｄ慨姝ｃ€佽〃濂戠害琛ュ己鍜?DDL 鐢熸垚鍓嶆鏌ユ竻鍗?|
| [30-platform-data-model-v4.md](./30-platform-data-model-v4.md) | **鐜拌** v4.1 骞冲彴/鍒嗙被/鎶€鑳?鍐呭琛ㄥ懡鍚嶄笌 greenfield 鏁版嵁妯″瀷锛堟浛浠?docs/17銆乨ocs/18 鐨?Plus 鍏煎鏂规锛?|
| [schema-registry/sdkwork-clawrouter.tables.yaml](./schema-registry/sdkwork-clawrouter.tables.yaml) | 鏈哄櫒鍙牎楠岃〃濂戠害娉ㄥ唽琛紝绾︽潫鏂板琛ㄥ墠缂€銆丄PI 闈€侀〉闈㈣鐩栥€佸瓧娈点€佺储寮曘€佸畨鍏ㄥ拰鐢熷懡鍛ㄦ湡 |

## 2. 鏈疆鏍稿績瑁佸喅

1. `sdkwork-clawrouter` 涓嶆寜鏃х増澶氫釜鍓嶇搴旂敤缁х画鎷嗗垎锛屼骇鍝侀潰缁熶竴鍒?`apps/sdkwork-clawrouter-pc`锛屽唴閮ㄩ€氳繃 public銆乧onsole銆乤dmin 涓変釜璺敱鍩熼殧绂汇€?2. 鎺ㄨ崘閲囩敤鈥淩ust-first Modular Runtime + Java-compatible API Contract + Generated SDK Boundary鈥濈殑鏋舵瀯璺嚎銆俙sdkwork-clawrouter` 鐨?gateway銆乤pp-api銆乤dmin-api銆亀orker 鍜?product runtime 鍧囦互 Rust services 涓轰富瀹炵幇锛孞ava app/backend 妯″潡浣滀负璺緞銆丱penAPI銆丼DK 鍜屾棦鏈夊疄浣撳吋瀹规爣鍑嗐€?3. Admin 鎺у埗鍙?API 蹇呴』璧?`legacy-java-plus-backend-api` 鏍囧噯锛岃矾寰勫墠缂€涓?Java `com.sdkwork.backend.api.ApiPaths.API_PREFIX`锛屽嵆 `/backend/v3/api`锛岃繑鍥?`PlusApiResult<T>`锛屾潈闄愭ā鍨嬫寜鍚庡彴瑙掕壊鍜岀鐞嗚兘鍔涙帶鍒躲€?4. Console銆乸ublic portal銆佺敤鎴疯嚜鍔?API 蹇呴』璧?`legacy-java-plus-app-api` 鏍囧噯锛岃矾寰勫墠缂€涓?Java `com.sdkwork.app.api.ApiPaths.API_PREFIX`锛屽嵆 `/app/v3/api`锛岃繑鍥?`PlusApiResult<T>`锛岀敤鎴蜂笂涓嬫枃鍜岃祫婧愬綊灞炲湪鏈嶅姟灞傚己鏍￠獙銆?5. OpenAI 鍏煎缃戝叧 API 淇濇寔 `/v1/*`锛屼笉寰楀寘瑁?`PlusApiResult<T>`锛屽繀椤讳繚鎸佺涓夋柟 SDK 鍙洿鎺ヨ皟鐢ㄣ€?6. App/Backend 鍏叡涓氬姟璺緞涓嶅緱棰濆鎻掑叆 `/claw-router`銆乣/router`銆乣/sdkwork` 绛変骇鍝佹垨閮ㄧ讲鍛藉悕绌洪棿锛涙柊澧炶兘鍔涘繀椤诲厛杩涘叆 Java app-api/backend-api 鐨?controller銆丱penAPI 鍜岀敓鎴?SDK銆?7. 鐢ㄦ埛銆乂IP銆乤ccount銆佷紭鎯犲埜銆佺Н鍒嗗厖鍊笺€佽鍗曘€佹敮浠樸€侀€€娆俱€佸彂绁ㄧ瓑浜ゆ槗璐︽埛鍩熷繀椤诲鐢?`legacy-java-plus-entity` 涓棦鏈?`plus_*` 琛ㄧ粨鏋勶紝涓嶅湪 claw-router 涓垱寤烘浛浠ｈ〃銆?8. 鏂板缓 claw-router 涓撳睘琛ㄥ繀椤婚伒瀹?`DATABASE_SPEC.md`锛岄噰鐢ㄤ笟鍔″墠缂€锛歚ai_`銆乣integration_`銆乣iam_`銆乣commerce_`銆乣studio_`銆乣content_`銆乣ops_` 绛夛紝绂佹浣跨敤 `claw_`銆乣router_`銆乣sdkwork_` 浣滀负鏂颁笟鍔¤〃绗竴娈靛墠缂€銆?9. 鏈湴妗岄潰銆丼erver銆丏ocker銆並8S 蹇呴』鏄悓涓€濂楁牳蹇冭兘鍔涚殑涓嶅悓瑁呴厤锛屼笉鍏佽鍑虹幇鍥涘涓嶅悓涓氬姟閫昏緫锛汚PI 鑷敱鍒囨崲鍙兘閫氳繃 base URL resolver 瀹屾垚銆?10. 鏁版嵁搴撳疄鐜板繀椤诲厛杩囨暟鎹绾﹁瘎瀹★細`ai_usage` 鏄敤閲忎簨瀹烇紝`commerce_usage_settlement` 鏄粨绠楁ˉ鎺ワ紝`plus_account_history` 鎵嶆槸鏈€缁堣处鎴锋祦姘翠簨瀹炪€?11. 鍓嶇妯″潡涓嶈兘鍙嶅悜姹℃煋鏁版嵁搴撳懡鍚嶏紱public銆乧onsole銆乤dmin 鍙槸浣跨敤鑰咃紝涓嶈兘浜х敓 `console_`銆乣admin_`銆佷骇鍝佸悕鎴栭儴缃插悕鍓嶇紑琛ㄣ€?
## 3. 涓夌鏋舵瀯璺嚎瀵规瘮

| 璺嚎 | 鎻忚堪 | 浼樼偣 | 椋庨櫓 | 缁撹 |
| --- | --- | --- | --- | --- |
| A. Rust-first Modular Runtime | Rust services 鎵胯浇 `/v1/**`銆乣/app/v3/api/**`銆乣/backend/v3/api/**`銆亀orker 鍜?product runtime锛汮ava-compatible app/backend 鍙綔涓?API/SDK/瀹炰綋鍏煎鏍囧噯 | 鎬ц兘銆侀儴缃层€佷唬鐮佽竟鐣屽拰闀挎湡婕旇繘鏈€缁熶竴锛涢€傚悎鍏ㄦ柊搴旂敤鏃犳妧鏈€虹洰鏍?| 闇€瑕佽ˉ榻?Rust app/admin handler銆丼DK 鐢熸垚鍜?persistence 瀹炵幇 | 鎺ㄨ崘浣滀负 P0/P1 涓荤嚎 |
| B. Rust Gateway + Java-compatible Remote Business | Rust 鎵胯浇 `/v1/**`锛岄儴鍒?app/backend business 閫氳繃 generated SDK 璋冪敤杩滅 Java-compatible 鏈嶅姟 | 杩佺Щ椋庨櫓浣庯紝鑳界煭鏈熷鐢ㄦ棦鏈変笟鍔¤兘鍔?| 瀹规槗闀挎湡褰㈡垚鍙岃繍琛屾椂锛岄渶瑕佷弗鏍奸檺鍒朵负杩囨浮褰㈡€?| 浣滀负杩佺Щ妗ユ帴璺嚎 |
| C. Desktop-local 浼樺厛杞婚噺鐗?| 浠ユ湰鍦?SQLite銆佸唴缃?provider銆佸墠绔闈㈠３涓轰富锛宻erver/kubernetes 鑳藉姏鍚庣疆 | 鏈湴閮ㄧ讲蹇紝涓汉浣撻獙濂?| 瀹规槗鍋忕 SaaS/浼佷笟绾ф爣鍑嗐€丄PI 鍜岃〃缁撴瀯娌荤悊 | 鍙綔涓?`desktop` profile锛屼笉浣滀负鎬讳綋鏋舵瀯 |

## 4. 鍚庣画瀹炴柦寤鸿

1. 鍏堝喕缁撴湰鏂囨。闆嗕腑鐨勬灦鏋勩€丄PI銆佹暟鎹拰閮ㄧ讲绾︽潫銆?2. 鍐嶆媶鍒嗗疄鐜拌鍒掞細鍚庣妯″潡銆佹暟鎹簱濂戠害涓庤縼绉汇€丄PI SDK銆佸墠绔湇鍔℃浛鎹€侀儴缃茶剼鏈€佽娴嬩笌瀹夊叏闂ㄧ銆?3. 鏂板缓琛ㄥ厛鍐?YAML/Markdown 琛ㄥ绾︼紝鍐嶇敓鎴?DDL銆丱RM銆丏TO 鍜?OpenAPI銆?4. 鍓嶇涓嶅緱缁х画闀挎湡浣跨敤 mock service锛宑onsole/admin/public 鍧囧簲杩佺Щ鍒扮敓鎴?SDK锛涘垏鎹㈤儴缃茬洰鏍囨椂鍙兘鍒囨崲 SDK base URL銆?5. 绗竴闃舵浜や粯鐩爣搴旀槸鈥淩ust-first 鏍囧噯鍖栧彲閮ㄧ讲 MVP鈥濓紝鍐嶅仛澶?Region銆佸鏉傜瓥鐣ャ€佽涓氶珮绾ц兘鍔涘拰鏇存繁鍏ョ殑鍘嬫祴浼樺寲銆?
## 5. 琛ュ厖鏂囨。绱㈠紩

| 鏂囨。 | 鐩爣 |
| --- | --- |
| [15-new-api-sub2api浠锋牸浣撶郴瀵规瘮涓嶤lawRouter瀹氫环璁捐.md](./15-new-api-sub2api浠锋牸浣撶郴瀵规瘮涓嶤lawRouter瀹氫环璁捐.md) | 瀵规瘮 new-api/sub2api 鐨勪环鏍间綋绯伙紝瀹氫箟瀹樻柟浠枫€佷緵搴斿晢浠枫€佸鎴蜂环銆佸畾浠锋柟妗堛€佽鍒欍€侀樁姊笌缁熶竴璁￠噺妯″瀷 |
| [16-鍓嶇浠ｇ爜濂戠害澶嶆牳涓庢暟鎹璁¤鐩栨鏌?md](./16-鍓嶇浠ｇ爜濂戠害澶嶆牳涓庢暟鎹璁¤鐩栨鏌?md) | 鍩轰簬 portal 褰撳墠鍓嶇浠ｇ爜鐨勮矾鐢便€乻ervice/interface 鍜?mock data 鍙嶅悜澶嶆牳鏁版嵁搴撹璁¤鐩栨儏鍐典笌鏈疆淇璁板綍 |
| [17-AppCenter-PlusApp-compatible-design.md](./17-AppCenter-PlusApp-compatible-design.md) | **宸插簾寮?* 鈥?瑙?[30-platform-data-model-v4.md](./30-platform-data-model-v4.md)锛涘巻鍙?Java platform_app/appstore_app 鍏煎璁捐锛堝綊妗ｆ枃浠跺悕淇濈暀锛?|
| [18-SkillsHub-AgentSkills-PlusCategory-compatible-design.md](./18-SkillsHub-AgentSkills-PlusCategory-compatible-design.md) | **宸插簾寮?* 鈥?瑙?[30-platform-data-model-v4.md](./30-platform-data-model-v4.md)锛涘巻鍙?AgentSkills/PlusCategory 鍏煎璁捐 |
| [19-Finance-Trade-Java-compatible-design.md](./19-Finance-Trade-Java-compatible-design.md) | 鏀粯銆佽鍗曘€侀€€娆俱€佸彂绁ㄣ€佽处鎴枫€佷紭鎯犲埜銆乂IP 绛夐噾铻嶄氦鏄撳煙鎸?Java 鏃㈡湁 Entity 鍜?API 鏍囧噯澶嶇敤锛岄伩鍏嶉噸澶嶅缓妯?|
| [20-schema-guardian-quality-gate.md](./20-schema-guardian-quality-gate.md) | 灏?Java-first銆丩0 legacy銆佺姝㈠悓涔夎〃銆丼killsHub 琛ㄦ浛鎹㈢瓑鏁版嵁鏍囧噯鍥哄寲涓哄彲鎵ц璐ㄩ噺闂ㄧ |
| [21-schema-compiler-postgres-ddl.md](./21-schema-compiler-postgres-ddl.md) | 灏?Schema Registry 缂栬瘧涓?PostgreSQL DDL锛屽苟鎻愪緵鐢熸垚鏂囦欢婕傜Щ妫€鏌ワ紝纭繚鏁版嵁濂戠害鍙互钀藉簱 |
| [22-domain-type-generator.md](./22-domain-type-generator.md) | 浠?Schema Registry 鐨?`domain_names` 鐢熸垚 Java/Rust/TypeScript/OpenAPI 棰嗗煙鏋氫妇锛屼繚璇?`ModelVendor`銆乣BillingMeter` 绛夊绔竴鑷?|
| [23-schema-manifest.md](./23-schema-manifest.md) | 灏?Schema Registry 缂栬瘧涓烘満鍣ㄥ彲璇?Manifest锛岀粺涓€杈撳嚭琛ㄣ€佽矾鐢便€丄PI surface銆乷wner銆佸瓧娈点€佺储寮曘€佸畨鍏ㄥ拰鐢熷懡鍛ㄦ湡鍏冩暟鎹?|
| [24-openapi-schema-components.md](./24-openapi-schema-components.md) | 浠?Schema Registry 鐢熸垚 OpenAPI component schemas锛岀粺涓€ app/backend/SDK/鍓嶇浣跨敤鐨勫瓧娈靛簭鍒楀寲鏍囧噯 |
| [25-frontend-contract-guardian.md](./25-frontend-contract-guardian.md) | 灏?portal 瀹為檯璺敱涓庨〉闈㈠叧閿瓧娈甸渶姹傚浐鍖栦负鍙墽琛屽绾︼紝鎸佺画鏍￠獙 Schema Manifest 鏄惁瀹屾暣婊¤冻鍓嶇椤甸潰 |
| [26-java-legacy-contract-audit.md](./26-java-legacy-contract-audit.md) | 灏?Java-owned `plus_*` 琛ㄥ疄浣撴槧灏勪笌澹版槑鍒楃敓鎴愬璁′骇鐗╋紝闃叉 claw-router fork 鎴栨浛浠?Java 涓昏〃缁撴瀯 |
| [27-rust-runtime-and-sdk-integration-standard.md](./27-rust-runtime-and-sdk-integration-standard.md) | 鍥哄寲 Rust runtime銆丣ava-compatible app/backend API 璺緞銆乬enerated SDK 杈圭晫鍜?portal 涓嶆敼 UI 鐨勬帴鍏ユ爣鍑?|
| [28-architecture-standard-guardian.md](./28-architecture-standard-guardian.md) | 灏?Rust-first 鏋舵瀯鍜屾妧鏈€夊瀷瑁佸喅鍥哄寲涓哄彲鎵ц鏂囨。瀹堝崼锛岄槻姝㈡牳蹇冩枃妗ｅ洖閫€鍒版棫璺嚎 |
| [29-rust-backend-module-standard.md](./29-rust-backend-module-standard.md) | 鍥哄寲 Rust 鍚庣鍒嗗寘銆丠exagonal architecture 妯″潡褰㈡€併€侀珮鎬ц兘鍜屽畨鍏ㄨ竟鐣岋紝骞舵帴鍏ュ彲鎵ц瀹堝崼 |
| [32-sdkwork-models-standard.md](./32-sdkwork-models-standard.md) | 瀹氫箟鐙珛 `sdkwork-models` 妯″瀷鐩綍銆乿endor 鍒嗙洰褰曘€丣SON 濂戠害銆佸璇█ SDK 鏍囧噯銆丆lawRouter 瀵煎叆鍜屽瓙妯″潡鏇存柊瑙勫垯 |

