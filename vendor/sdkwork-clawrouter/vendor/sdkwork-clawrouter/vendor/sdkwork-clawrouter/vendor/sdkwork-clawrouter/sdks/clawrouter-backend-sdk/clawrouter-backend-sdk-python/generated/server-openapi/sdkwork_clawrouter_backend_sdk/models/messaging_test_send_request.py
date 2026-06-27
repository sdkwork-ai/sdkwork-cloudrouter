from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MessagingTestSendRequest:
    """Messaging test send request schema exposed by Claw Router."""
    channel: str
    delivery_purpose: str
    scene_code: str
    target_hash: str
    target_masked: str
    template_code: str
    country_code: Optional[str] = None
    dry_run: Optional[bool] = None
    locale: Optional[str] = None
    user_segment: Optional[str] = None
    variables: Optional[Dict[str, str]] = None
