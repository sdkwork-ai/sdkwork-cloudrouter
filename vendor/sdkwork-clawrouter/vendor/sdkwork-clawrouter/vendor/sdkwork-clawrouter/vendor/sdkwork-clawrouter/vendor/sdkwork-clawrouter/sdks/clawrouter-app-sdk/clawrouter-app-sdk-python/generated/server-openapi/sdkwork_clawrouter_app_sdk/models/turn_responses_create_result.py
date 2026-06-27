from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .chat_turn_create_response import ChatTurnCreateResponse


@dataclass
class TurnResponsesCreateResult:
    """Turn responses create result schema exposed by Claw Router."""
    code: str
    data: Optional[ChatTurnCreateResponse] = None
    msg: Optional[str] = None
