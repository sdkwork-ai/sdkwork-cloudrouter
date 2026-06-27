from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminChannelCredentialInput:
    """Admin channel credential input schema exposed by Claw Router."""
    base_url: str
    api_key: Optional[str] = None
    name: Optional[str] = None
    priority: Optional[str] = None
    secret_ref: Optional[str] = None
    status: Optional[str] = None
    weight: Optional[str] = None
