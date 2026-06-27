from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MessagingTemplateSendResponse:
    """Messaging template send response schema exposed by Claw Router."""
    delivery_status: str
    request_id: str
    provider_code: Optional[str] = None
