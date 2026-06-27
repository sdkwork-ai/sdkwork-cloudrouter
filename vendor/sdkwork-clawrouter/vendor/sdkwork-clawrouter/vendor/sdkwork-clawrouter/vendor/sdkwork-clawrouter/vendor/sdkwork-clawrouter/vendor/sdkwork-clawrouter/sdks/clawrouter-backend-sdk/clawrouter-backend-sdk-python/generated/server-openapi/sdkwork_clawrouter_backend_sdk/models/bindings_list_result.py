from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .service_provider_collection_response import ServiceProviderCollectionResponse


@dataclass
class BindingsListResult:
    """Bindings list result schema exposed by Claw Router."""
    code: str
    data: Optional[ServiceProviderCollectionResponse] = None
    msg: Optional[str] = None
