package com.sdkwork.claw.router.domain.enums;

public enum IntegrationProviderType {
    UNKNOWN("unknown", 0),
    MODEL_VENDOR_DIRECT("model_vendor_direct", 1),
    CLOUD_PLATFORM("cloud_platform", 2),
    RELAY_AGGREGATOR("relay_aggregator", 3),
    SELF_HOSTED_GATEWAY("self_hosted_gateway", 4),
    LOCAL_RUNTIME("local_runtime", 5),
    CUSTOM("custom", 6);

    private final String code;

    private final int intCode;
    IntegrationProviderType(String code, int intCode) {
        this.code = code;
        this.intCode = intCode;
    }

    public String getCode() {
        return code;
    }


    public int getIntCode() {
        return intCode;
    }

    public static IntegrationProviderType fromIntCode(int intCode) {
        for (IntegrationProviderType value : values()) {
            if (value.intCode == intCode) {
                return value;
            }
        }
        return UNKNOWN;
    }
    public static IntegrationProviderType fromCode(String code) {
        for (IntegrationProviderType value : values()) {
            if (value.code.equals(code)) {
                return value;
            }
        }
        return UNKNOWN;
    }
}
