package com.sdkwork.clawrouter.backend.model;


public class AdminAiModelRegionPrice {
    private String cacheReadPrice;
    private String cacheWritePrice;
    private String currency;
    private String priceIn;
    private String priceOut;
    private String regionCode;

    public String getCacheReadPrice() {
        return this.cacheReadPrice;
    }

    public void setCacheReadPrice(String cacheReadPrice) {
        this.cacheReadPrice = cacheReadPrice;
    }

    public String getCacheWritePrice() {
        return this.cacheWritePrice;
    }

    public void setCacheWritePrice(String cacheWritePrice) {
        this.cacheWritePrice = cacheWritePrice;
    }

    public String getCurrency() {
        return this.currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getPriceIn() {
        return this.priceIn;
    }

    public void setPriceIn(String priceIn) {
        this.priceIn = priceIn;
    }

    public String getPriceOut() {
        return this.priceOut;
    }

    public void setPriceOut(String priceOut) {
        this.priceOut = priceOut;
    }

    public String getRegionCode() {
        return this.regionCode;
    }

    public void setRegionCode(String regionCode) {
        this.regionCode = regionCode;
    }
}
