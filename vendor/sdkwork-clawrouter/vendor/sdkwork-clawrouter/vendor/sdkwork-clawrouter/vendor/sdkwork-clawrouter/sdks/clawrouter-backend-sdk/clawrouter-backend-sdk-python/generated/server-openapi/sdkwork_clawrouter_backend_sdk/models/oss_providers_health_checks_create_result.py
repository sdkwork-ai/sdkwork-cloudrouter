from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_provider_health_check_response import StorageProviderHealthCheckResponse


@dataclass
class OssProvidersHealthChecksCreateResult:
    """Oss providers health checks create result schema exposed by Claw Router."""
    code: str
    data: Optional[StorageProviderHealthCheckResponse] = None
    msg: Optional[str] = None
