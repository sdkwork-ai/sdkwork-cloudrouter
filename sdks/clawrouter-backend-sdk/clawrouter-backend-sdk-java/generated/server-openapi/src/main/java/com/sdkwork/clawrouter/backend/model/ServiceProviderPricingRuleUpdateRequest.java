package com.sdkwork.clawrouter.backend.model;


public class ServiceProviderPricingRuleUpdateRequest {
    private String minimumCharge;
    private Integer priority;
    private String status;
    private String unitPrice;
    private String unitSize;

    public String getMinimumCharge() {
        return this.minimumCharge;
    }

    public void setMinimumCharge(String minimumCharge) {
        this.minimumCharge = minimumCharge;
    }

    public Integer getPriority() {
        return this.priority;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getUnitPrice() {
        return this.unitPrice;
    }

    public void setUnitPrice(String unitPrice) {
        this.unitPrice = unitPrice;
    }

    public String getUnitSize() {
        return this.unitSize;
    }

    public void setUnitSize(String unitSize) {
        this.unitSize = unitSize;
    }
}
