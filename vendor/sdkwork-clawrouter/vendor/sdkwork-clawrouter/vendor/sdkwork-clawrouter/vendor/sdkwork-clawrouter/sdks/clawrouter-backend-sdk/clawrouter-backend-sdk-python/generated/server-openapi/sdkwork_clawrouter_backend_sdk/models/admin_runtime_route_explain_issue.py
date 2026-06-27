from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminRuntimeRouteExplainIssue:
    """Admin runtime route explain issue schema exposed by Claw Router."""
    code: str
    message: str
    severity: str
