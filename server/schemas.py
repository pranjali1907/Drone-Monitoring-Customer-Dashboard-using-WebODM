from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime, date

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "client"  # 'admin' or 'client'

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Project schemas
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    boundary: Optional[str] = None  # GeoJSON representation
    survey_date: Optional[Any] = None
    completion_date: Optional[Any] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    boundary: Optional[str] = None
    survey_date: Optional[date] = None
    completion_date: Optional[date] = None
    status: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Drone Image schemas
class DroneImageResponse(BaseModel):
    id: int
    project_id: int
    filename: str
    filepath: str
    filesize: int
    capture_time: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude: Optional[float] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True

# Video schemas
class VideoResponse(BaseModel):
    id: int
    project_id: int
    title: str
    filename: str
    filepath: str
    filesize: int
    duration: Optional[int] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True

# Orthophoto schemas
class OrthophotoResponse(BaseModel):
    id: int
    project_id: int
    webodm_task_id: Optional[str] = None
    orthophoto_path: Optional[str] = None
    dsm_path: Optional[str] = None
    dtm_path: Optional[str] = None
    point_cloud_path: Optional[str] = None
    model_3d_path: Optional[str] = None
    report_path: Optional[str] = None
    processed_at: datetime

    class Config:
        from_attributes = True

# Report schemas
class ReportCreate(BaseModel):
    title: str
    report_type: str

class ReportResponse(BaseModel):
    id: int
    project_id: int
    title: str
    report_type: str
    filepath: str
    created_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Processing Job schemas
class ProcessingJobResponse(BaseModel):
    id: int
    project_id: int
    webodm_task_id: str
    status: str
    progress: float
    logs: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Measurement schemas
class MeasurementCreate(BaseModel):
    name: str
    measurement_type: str  # 'distance', 'area', 'coordinate', 'elevation'
    geom: str  # GeoJSON string
    value: float
    notes: Optional[str] = None

class MeasurementResponse(MeasurementCreate):
    id: int
    project_id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Complex response models
class ProjectDetailResponse(ProjectResponse):
    images: List[DroneImageResponse] = []
    videos: List[VideoResponse] = []
    orthophotos: List[OrthophotoResponse] = []
    reports: List[ReportResponse] = []
    measurements: List[MeasurementResponse] = []
    assigned_clients: List[UserResponse] = []

    class Config:
        from_attributes = True

class UserWithProjectsResponse(UserResponse):
    assigned_projects: List[ProjectResponse] = []

    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    total_projects: int
    active_projects: int
    completed_projects: int
    processing_status: List[dict]
    storage_usage: int  # in bytes
    latest_uploads: List[dict]
