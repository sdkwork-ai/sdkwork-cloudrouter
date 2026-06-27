from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class VerificationPolicyUpdateRequest:
    """Verification policy update request schema exposed by Claw Router."""
    allowed_channels: List[str]
    code_length: int
    max_verify_attempts: int
    template_code: str
    ttl_seconds: int
    default_channel: Optional[str] = None
    max_send_per_hour: Optional[int] = None
    resend_interval_seconds: Optional[int] = None
    risk_policy: Optional[Dict[str, str]] = None
