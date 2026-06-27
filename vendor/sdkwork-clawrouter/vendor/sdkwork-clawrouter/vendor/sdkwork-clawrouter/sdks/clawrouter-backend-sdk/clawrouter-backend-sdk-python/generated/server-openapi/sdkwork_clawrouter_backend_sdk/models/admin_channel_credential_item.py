from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminChannelCredentialItem:
    """Admin channel credential item schema exposed by Claw Router."""
    base_url: str
    credential_id: str
    errors: str
    id: str
    masked_label: str
    name: str
    priority: str
    secret_ref: str
    status: str
    weight: str
    api_key: Optional[str] = None
