package com.sdkwork.clawrouter.backend

data class AdminAuthVerificationPolicy(
    val emailCodeLoginEnabled: Boolean? = null,
    val emailRegistrationVerificationRequired: Boolean? = null,
    val phoneCodeLoginEnabled: Boolean? = null,
    val phoneRegistrationVerificationRequired: Boolean? = null
)
