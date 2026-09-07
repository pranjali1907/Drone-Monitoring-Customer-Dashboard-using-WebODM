import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr


# ── User Schemas ─────────────────────────────────────────────────────────
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "client"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime.datetime
    class Config:
        from_attributes = True


# ── Auth Schemas ─────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None


# ── ProjectLayer Schemas ─────────────────────────────────────────────────
class ProjectLayerResponse(BaseModel):
    id: int
    project_id: int
    name: str
    layer_type: str
    drive_file_id: Optional[str]
    drive_url: Optional[str]
    tile_url_pattern: Optional[str]
    status: str
    error_message: Optional[str]
    created_at: datetime.datetime
    class Config:
        from_attributes = True


# ── Project Schemas ──────────────────────────────────────────────────────
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    location: Optional[str] = None
    survey_date: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    boundary_wkt: Optional[str] = None
    youtube_before_id: Optional[str] = None
    youtube_after_id: Optional[str] = None
    # Drive links submitted at creation time
    raster_drive_url: Optional[str] = None
    ply_drive_urls: Optional[List[str]] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    survey_date: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    youtube_before_id: Optional[str] = None
    youtube_after_id: Optional[str] = None
    status: Optional[str] = None

class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    location: Optional[str]
    survey_date: Optional[datetime.date]
    latitude: Optional[float]
    longitude: Optional[float]
    boundary_wkt: Optional[str]
    youtube_before_id: Optional[str]
    youtube_after_id: Optional[str]
    status: str
    created_at: datetime.datetime
    layers: List[ProjectLayerResponse] = []
    class Config:
        from_attributes = True


# ── Measurement Schemas ──────────────────────────────────────────────────
class MeasurementCreate(BaseModel):
    name: Optional[str] = None
    measurement_type: str   # 'distance' | 'area'
    value: float
    geom_geojson: Optional[str] = None

class MeasurementResponse(BaseModel):
    id: int
    project_id: int
    user_id: Optional[int]
    name: Optional[str]
    measurement_type: str
    value: float
    geom_geojson: Optional[str]
    created_at: datetime.datetime
    class Config:
        from_attributes = True


# ── Dashboard Stats ──────────────────────────────────────────────────────
class DashboardStats(BaseModel):
    total_projects: int
    active_projects: int
    ready_layers: int
    processing_layers: int
