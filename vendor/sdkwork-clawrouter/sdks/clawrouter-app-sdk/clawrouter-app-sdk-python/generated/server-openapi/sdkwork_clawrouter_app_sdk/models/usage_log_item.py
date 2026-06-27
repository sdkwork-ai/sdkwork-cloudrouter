from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class UsageLogItem:
    """Usage log item schema exposed by Claw Router."""
    base_input_price: str
    base_output_price: str
    cache_read_price: str
    cache_read_tokens: str
    cost: str
    error_code: str
    error_message: str
    error_type: str
    group: str
    http_status: str
    id: str
    input_tokens: str
    ip: str
    is_stream: bool
    model: str
    multiplier: str
    output_tokens: str
    path: str
    provider_native_model: str
    reasoning_effort: str
    region_code: str
    request_id: str
    requested_model_catalog_key: str
    status: str
    time: str
    token_name: str
    total_time: str
    ttft: str
    type: str
    user_agent: str
