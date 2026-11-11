package com.sdkwork.cloudrouter.open

data class TypeSafeAnswer(
    val choice: String? = null,
    val confidence: Double? = null,
    val legend: Map<String, String>? = null,
    val noul: Double? = null,
    val probabilities: Map<String, Double>? = null,
    val score: Double? = null,
    val type: String? = null
)
