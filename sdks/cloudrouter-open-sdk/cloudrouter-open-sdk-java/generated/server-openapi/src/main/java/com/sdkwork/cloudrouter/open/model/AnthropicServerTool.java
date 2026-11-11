package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class AnthropicServerTool {
    private List<String> allowedCallers;
    private List<String> allowedDomains;
    private List<String> blockedDomains;
    private AnthropicCacheControl cacheControl;
    private Boolean deferLoading;
    private Integer displayHeightPx;
    private Integer displayNumber;
    private Integer displayWidthPx;
    private Integer maxCharacters;
    private Integer maxUses;
    private String name;
    private Boolean strict;
    private String type;
    private Map<String, String> userLocation;

    public List<String> getAllowedCallers() {
        return this.allowedCallers;
    }

    public void setAllowedCallers(List<String> allowedCallers) {
        this.allowedCallers = allowedCallers;
    }

    public List<String> getAllowedDomains() {
        return this.allowedDomains;
    }

    public void setAllowedDomains(List<String> allowedDomains) {
        this.allowedDomains = allowedDomains;
    }

    public List<String> getBlockedDomains() {
        return this.blockedDomains;
    }

    public void setBlockedDomains(List<String> blockedDomains) {
        this.blockedDomains = blockedDomains;
    }

    public AnthropicCacheControl getCacheControl() {
        return this.cacheControl;
    }

    public void setCacheControl(AnthropicCacheControl cacheControl) {
        this.cacheControl = cacheControl;
    }

    public Boolean getDeferLoading() {
        return this.deferLoading;
    }

    public void setDeferLoading(Boolean deferLoading) {
        this.deferLoading = deferLoading;
    }

    public Integer getDisplayHeightPx() {
        return this.displayHeightPx;
    }

    public void setDisplayHeightPx(Integer displayHeightPx) {
        this.displayHeightPx = displayHeightPx;
    }

    public Integer getDisplayNumber() {
        return this.displayNumber;
    }

    public void setDisplayNumber(Integer displayNumber) {
        this.displayNumber = displayNumber;
    }

    public Integer getDisplayWidthPx() {
        return this.displayWidthPx;
    }

    public void setDisplayWidthPx(Integer displayWidthPx) {
        this.displayWidthPx = displayWidthPx;
    }

    public Integer getMaxCharacters() {
        return this.maxCharacters;
    }

    public void setMaxCharacters(Integer maxCharacters) {
        this.maxCharacters = maxCharacters;
    }

    public Integer getMaxUses() {
        return this.maxUses;
    }

    public void setMaxUses(Integer maxUses) {
        this.maxUses = maxUses;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Boolean getStrict() {
        return this.strict;
    }

    public void setStrict(Boolean strict) {
        this.strict = strict;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Map<String, String> getUserLocation() {
        return this.userLocation;
    }

    public void setUserLocation(Map<String, String> userLocation) {
        this.userLocation = userLocation;
    }
}
