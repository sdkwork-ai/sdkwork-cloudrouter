from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminRateLimitItem:
    """Persisted rate limit rule snapshot returned by the backend."""
    id: str
    block_duration: Optional[str] = None
    burst: Optional[int] = None
    channel_group: Optional[str] = None
    channel_group_id: Optional[str] = None
    channel_group_name: Optional[str] = None
    key_prefix: Optional[str] = None
    model: Optional[str] = None
    rpd: Optional[int] = None
    rpm: Optional[int] = None
    rps: Optional[int] = None
    rule_name: Optional[str] = None
    status: Optional[str] = None
    target_ip: Optional[str] = None
    tpm: Optional[int] = None
    user: Optional[str] = None
