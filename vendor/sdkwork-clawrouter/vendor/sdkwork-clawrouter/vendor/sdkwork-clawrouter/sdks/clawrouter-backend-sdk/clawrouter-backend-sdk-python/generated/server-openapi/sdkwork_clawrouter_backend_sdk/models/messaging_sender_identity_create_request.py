from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MessagingSenderIdentityCreateRequest:
    """Messaging sender identity create request schema exposed by Claw Router."""
    channel: str
    identity_code: str
    provider_account_id: str
    country_code: Optional[str] = None
    display_name: Optional[str] = None
    domain_name: Optional[str] = None
    from_email: Optional[str] = None
    from_name: Optional[str] = None
    reply_to: Optional[str] = None
    sender_id: Optional[str] = None
    sign_name: Optional[str] = None
