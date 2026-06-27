from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .messaging_test_send_response import MessagingTestSendResponse


@dataclass
class DiagnosticsTestSendsCreateResult:
    """Diagnostics test sends create result schema exposed by Claw Router."""
    code: str
    data: Optional[MessagingTestSendResponse] = None
    msg: Optional[str] = None
