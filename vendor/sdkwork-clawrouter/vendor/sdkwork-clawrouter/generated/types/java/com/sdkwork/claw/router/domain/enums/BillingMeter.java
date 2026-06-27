package com.sdkwork.claw.router.domain.enums;

public enum BillingMeter {
    LLM_INPUT_TOKEN("llm_input_token"),
    LLM_OUTPUT_TOKEN("llm_output_token"),
    LLM_REASONING_TOKEN("llm_reasoning_token"),
    LLM_CACHE_WRITE_TOKEN("llm_cache_write_token"),
    LLM_CACHE_READ_TOKEN("llm_cache_read_token"),
    LLM_CACHE_STORAGE_TOKEN_HOUR("llm_cache_storage_token_hour"),
    EMBEDDING_INPUT_TOKEN("embedding_input_token"),
    EMBEDDING_IMAGE("embedding_image"),
    IMAGE_INPUT_TOKEN("image_input_token"),
    IMAGE_OUTPUT_TOKEN("image_output_token"),
    IMAGE_RESULT("image_result"),
    IMAGE_PIXEL("image_pixel"),
    IMAGE_MEGAPIXEL("image_megapixel"),
    AUDIO_INPUT_TOKEN("audio_input_token"),
    AUDIO_OUTPUT_TOKEN("audio_output_token"),
    AUDIO_INPUT_SECOND("audio_input_second"),
    AUDIO_OUTPUT_SECOND("audio_output_second"),
    AUDIO_INPUT_MINUTE("audio_input_minute"),
    AUDIO_OUTPUT_MINUTE("audio_output_minute"),
    TTS_INPUT_CHARACTER("tts_input_character"),
    SPEECH_CHARACTER("speech_character"),
    STT_AUDIO_MINUTE("stt_audio_minute"),
    VIDEO_INPUT_TOKEN("video_input_token"),
    VIDEO_OUTPUT_TOKEN("video_output_token"),
    VIDEO_INPUT_SECOND("video_input_second"),
    VIDEO_OUTPUT_SECOND("video_output_second"),
    VIDEO_RESULT("video_result"),
    MUSIC_OUTPUT_SECOND("music_output_second"),
    SFX_RESULT("sfx_result"),
    RERANK_SEARCH("rerank_search"),
    RERANK_DOCUMENT("rerank_document"),
    API_REQUEST("api_request"),
    API_RESULT("api_result"),
    API_ITEM("api_item"),
    TOOL_CALL("tool_call"),
    WEB_SEARCH_CALL("web_search_call"),
    FILE_SEARCH_CALL("file_search_call"),
    CODE_INTERPRETER_SESSION("code_interpreter_session"),
    CONTAINER_SESSION("container_session"),
    STORAGE_GB_DAY("storage_gb_day"),
    BANDWIDTH_GB("bandwidth_gb"),
    UNKNOWN("unknown");

    private final String code;

    BillingMeter(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }

    public static BillingMeter fromCode(String code) {
        for (BillingMeter value : values()) {
            if (value.code.equals(code)) {
                return value;
            }
        }
        return UNKNOWN;
    }
}
