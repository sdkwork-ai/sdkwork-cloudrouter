package com.sdkwork.cloudrouter.open

data class PixverseVideoGenerationResponse(
    val errCode: Int? = null,
    val errMsg: String? = null,
    val error: PixverseErrorDetail? = null,
    val resp: PixverseTaskResp? = null
)
