package com.sdkwork.clawrouter.open.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.clawrouter.open.http.HttpClient;
import com.sdkwork.clawrouter.open.model.*;
import java.util.List;
import java.util.Map;

public class ChatAnthropicApi {
    private final HttpClient client;

    public ChatAnthropicApi(HttpClient client) {
        this.client = client;
    }

    /** Anthropic Claude message */
    public AnthropicMessage createV1Message(AnthropicMessageCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/anthropic/v1/messages"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<AnthropicMessage>() {});
    }

    /** Anthropic count message tokens */
    public AnthropicCountMessageTokensResponse createV1MessagesCountToken(AnthropicCountMessageTokensRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/anthropic/v1/messages/count_tokens"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<AnthropicCountMessageTokensResponse>() {});
    }




}
