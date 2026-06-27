package com.sdkwork.clawrouter.backend.model;


public class ServiceProviderPricingRuleCreateRequest {
    private String billingMeterCode;
    private String buyerProviderId;
    private String catalogKey;
    private String currency;
    private String edgeId;
    private String minimumCharge;
    private String model;
    private String pricePlanId;
    private Integer priority;
    private String sellerProviderId;
    private String tokenKind;
    private String unitPrice;
    private String unitSize;

    public String getBillingMeterCode() {
        return this.billingMeterCode;
    }

    public void setBillingMeterCode(String billingMeterCode) {
        this.billingMeterCode = billingMeterCode;
    }

    public String getBuyerProviderId() {
        return this.buyerProviderId;
    }

    public void setBuyerProviderId(String buyerProviderId) {
        this.buyerProviderId = buyerProviderId;
    }

    public String getCatalogKey() {
        return this.catalogKey;
    }

    public void setCatalogKey(String catalogKey) {
        this.catalogKey = catalogKey;
    }

    public String getCurrency() {
        return this.currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getEdgeId() {
        return this.edgeId;
    }

    public void setEdgeId(String edgeId) {
        this.edgeId = edgeId;
    }

    public String getMinimumCharge() {
        return this.minimumCharge;
    }

    public void setMinimumCharge(String minimumCharge) {
        this.minimumCharge = minimumCharge;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getPricePlanId() {
        return this.pricePlanId;
    }

    public void setPricePlanId(String pricePlanId) {
        this.pricePlanId = pricePlanId;
    }

    public Integer getPriority() {
        return this.priority;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public String getSellerProviderId() {
        return this.sellerProviderId;
    }

    public void setSellerProviderId(String sellerProviderId) {
        this.sellerProviderId = sellerProviderId;
    }

    public String getTokenKind() {
        return this.tokenKind;
    }

    public void setTokenKind(String tokenKind) {
        this.tokenKind = tokenKind;
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
