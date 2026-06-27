from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_mcp_server_revision_mutation_response import AdminMcpServerRevisionMutationResponse


@dataclass
class RevisionsPublishResult:
    """Revisions publish result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminMcpServerRevisionMutationResponse] = None
    msg: Optional[str] = None
