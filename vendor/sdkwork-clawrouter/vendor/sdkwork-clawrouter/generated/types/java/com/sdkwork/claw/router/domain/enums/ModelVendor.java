package com.sdkwork.claw.router.domain.enums;

public enum ModelVendor {
    OPENAI("openai"),
    ANTHROPIC("anthropic"),
    GOOGLE("google"),
    ALIBABA("alibaba"),
    BAIDU("baidu"),
    BLACK_FOREST_LABS("black_forest_labs"),
    BYTEDANCE("bytedance"),
    DEEPSEEK("deepseek"),
    ELEVENLABS("elevenlabs"),
    KUAISHOU("kuaishou"),
    MINIMAX("minimax"),
    MOONSHOT("moonshot"),
    XAI("xai"),
    STABILITY_AI("stability_ai"),
    SUNO("suno"),
    TENCENT("tencent"),
    ZHIPU("zhipu"),
    CUSTOM("custom"),
    UNKNOWN("unknown");

    private final String code;

    ModelVendor(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }

    public static ModelVendor fromCode(String code) {
        for (ModelVendor value : values()) {
            if (value.code.equals(code)) {
                return value;
            }
        }
        return UNKNOWN;
    }
}
