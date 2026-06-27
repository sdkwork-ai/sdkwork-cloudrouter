from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ChatTurnResponseRequest:
    """Chat turn response request schema exposed by Claw Router."""
    message: str
    metadata: Optional[Dict[str, str]] = None
    model: Optional[str] = None
    provider: Optional[str] = None
    runtime: Optional[str] = None
    runtime_invocation_id: Optional[str] = None
    status: Optional[str] = None
    usage: Optional[Dict[str, Any]] = None
    usage_fact_id: Optional[str] = None
