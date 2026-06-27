from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminChannelGroupRouteExplainIssue:
    """Admin channel group route explain issue schema exposed by Claw Router."""
    code: str
    details: List[str]
    severity: str
