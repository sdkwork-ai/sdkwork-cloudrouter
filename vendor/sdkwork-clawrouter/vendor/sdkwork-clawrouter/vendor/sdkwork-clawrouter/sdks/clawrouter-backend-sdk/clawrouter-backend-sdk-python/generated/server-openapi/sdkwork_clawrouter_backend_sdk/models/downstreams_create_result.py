from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .service_provider_downstream_mutation_response import ServiceProviderDownstreamMutationResponse


@dataclass
class DownstreamsCreateResult:
    """Downstreams create result schema exposed by Claw Router."""
    code: str
    data: Optional[ServiceProviderDownstreamMutationResponse] = None
    msg: Optional[str] = None
