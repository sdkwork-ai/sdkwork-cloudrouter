from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MessagingProviderAccountCreateRequest:
    """Messaging provider account create request schema exposed by Claw Router."""
    account_code: str
    account_name: str
    channel: str
    credential: Dict[str, Any]
    provider_code: str
    base_url: Optional[str] = None
    capability_schema: Optional[Dict[str, str]] = None
    delivery_purpose: Optional[str] = None
