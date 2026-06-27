from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .messaging_mutation_response import MessagingMutationResponse


@dataclass
class SenderIdentitiesCreateResult:
    """Sender identities create result schema exposed by Claw Router."""
    code: str
    data: Optional[MessagingMutationResponse] = None
    msg: Optional[str] = None
