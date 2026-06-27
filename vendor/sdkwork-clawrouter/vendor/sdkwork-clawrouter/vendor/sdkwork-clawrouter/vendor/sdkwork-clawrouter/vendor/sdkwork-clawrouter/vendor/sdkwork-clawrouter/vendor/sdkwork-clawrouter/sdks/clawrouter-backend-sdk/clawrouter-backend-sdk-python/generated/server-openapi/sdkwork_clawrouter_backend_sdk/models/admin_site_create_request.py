from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .media_resource import MediaResource


@dataclass
class AdminSiteCreateRequest:
    """Admin site create request schema exposed by Claw Router."""
    base_url: str
    display_name: str
    site_name: str
    credential_ref: Optional[str] = None
    description: Optional[str] = None
    docs_url: Optional[str] = None
    domains: Optional[List[str]] = None
    environment: Optional[str] = None
    logo: Optional[MediaResource] = None
    masked_label: Optional[str] = None
    owner_kind: Optional[str] = None
    region_code: Optional[str] = None
    site_code: Optional[str] = None
    site_type: Optional[str] = None
    status: Optional[str] = None
    vendor_codes: Optional[List[str]] = None
    website_url: Optional[str] = None
