from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ─── Enums ───────────────────────────────────────────────────
class UserRole(str, Enum):
    ADMIN = "admin"
    RESPONDER = "responder"
    CITIZEN = "citizen"


class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ResourceStatus(str, Enum):
    AVAILABLE = "available"
    DEPLOYED = "deployed"
    MAINTENANCE = "maintenance"
    UNAVAILABLE = "unavailable"


class DisasterType(str, Enum):
    EARTHQUAKE = "earthquake"
    FLOOD = "flood"
    HURRICANE = "hurricane"
    WILDFIRE = "wildfire"
    TSUNAMI = "tsunami"
    TORNADO = "tornado"
    VOLCANIC = "volcanic"
    LANDSLIDE = "landslide"
    DROUGHT = "drought"
    OTHER = "other"


# ─── Auth Schemas ────────────────────────────────────────────
class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=200)
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.CITIZEN
    phone: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    role: str
    phone: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=200)
    phone: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = Field(None, min_length=6)


class UserAdminUpdate(BaseModel):
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    full_name: Optional[str] = None


# ─── Admin Auth Schemas ──────────────────────────────────────
class AdminCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8)


class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class AdminResponse(BaseModel):
    id: int
    email: str
    username: str
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AdminToken(BaseModel):
    access_token: str
    token_type: str
    admin: AdminResponse


# ─── Alert Schemas ───────────────────────────────────────────
class AlertCreate(BaseModel):
    title: str = Field(..., max_length=300)
    description: Optional[str] = None
    disaster_type: DisasterType
    severity: AlertSeverity = AlertSeverity.MEDIUM
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(default=10.0, gt=0)
    location_name: Optional[str] = None
    expires_at: Optional[datetime] = None


class AlertUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[AlertSeverity] = None
    is_active: Optional[bool] = None
    radius_km: Optional[float] = None


class AlertResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    disaster_type: str
    severity: str
    latitude: float
    longitude: float
    radius_km: float
    location_name: Optional[str] = None
    is_active: bool
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Resource Schemas ────────────────────────────────────────
class ResourceCreate(BaseModel):
    name: str = Field(..., max_length=200)
    resource_type: str = Field(..., max_length=100)
    description: Optional[str] = None
    quantity: int = Field(default=0, ge=0)
    unit: Optional[str] = None
    status: ResourceStatus = ResourceStatus.AVAILABLE
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None


class ResourceUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[int] = None
    status: Optional[ResourceStatus] = None
    assigned_to_alert: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ResourceResponse(BaseModel):
    id: int
    name: str
    resource_type: str
    description: Optional[str] = None
    quantity: int
    unit: Optional[str] = None
    status: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    assigned_to_alert: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Disaster Zone Schemas ───────────────────────────────────
class DisasterZoneCreate(BaseModel):
    name: str
    disaster_type: DisasterType
    risk_level: float = Field(default=0.5, ge=0.0, le=1.0)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(default=5.0, gt=0)
    population_affected: int = Field(default=0, ge=0)
    description: Optional[str] = None


class DisasterZoneResponse(BaseModel):
    id: int
    name: str
    disaster_type: str
    risk_level: float
    latitude: float
    longitude: float
    radius_km: float
    population_affected: int
    description: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── AI Prediction Schemas ───────────────────────────────────
class PredictionRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    disaster_type: Optional[DisasterType] = None


class PredictionResponse(BaseModel):
    latitude: float
    longitude: float
    risk_score: float
    risk_level: str
    disaster_type: str
    contributing_factors: List[str]
    recommendations: List[str]
    confidence: float


# ─── Disaster Event Schemas (PostgreSQL) ─────────────────────
class DisasterEventCreate(BaseModel):
    event_type: DisasterType
    title: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    magnitude: Optional[float] = None
    affected_area_km2: Optional[float] = None
    casualties: Optional[int] = 0
    injuries: Optional[int] = 0
    displaced: Optional[int] = 0
    economic_damage_usd: Optional[float] = 0
    source: Optional[str] = None
    data: Optional[dict] = None


class DisasterEventResponse(BaseModel):
    id: int
    event_type: str
    title: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    magnitude: Optional[float] = None
    affected_area_km2: Optional[float] = None
    casualties: Optional[int] = 0
    injuries: Optional[int] = 0
    displaced: Optional[int] = 0
    economic_damage_usd: Optional[float] = 0
    source: Optional[str] = None
    created_at: Optional[datetime] = None
    data: Optional[dict] = None

    class Config:
        from_attributes = True
