import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, Date, DateTime, 
    ForeignKey, Table, UniqueConstraint, Boolean
)
from sqlalchemy.orm import relationship
from server.database import Base, is_sqlite

# Conditional import/support for GeoAlchemy2 if PostGIS is used
try:
    from geoalchemy2 import Geometry
    has_geoalchemy = True
except ImportError:
    has_geoalchemy = False

# Association table for Client-Project assignments
client_assignments = Table(
    'client_assignments',
    Base.metadata,
    Column('id', Integer, primary_key=True, index=True),
    Column('project_id', Integer, ForeignKey('projects.id', ondelete='CASCADE')),
    Column('client_id', Integer, ForeignKey('users.id', ondelete='CASCADE')),
    Column('assigned_at', DateTime(timezone=True), default=datetime.datetime.utcnow),
    UniqueConstraint('project_id', 'client_id', name='uq_project_client')
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # 'admin' or 'client'
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    assigned_projects = relationship("Project", secondary=client_assignments, back_populates="assigned_clients")
    measurements = relationship("Measurement", back_populates="user", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="user")

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    survey_date = Column(Date, nullable=True)
    completion_date = Column(Date, nullable=True)
    status = Column(String(50), default="draft")  # 'draft', 'processing', 'completed', 'failed'
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Spatial column fallback
    if not is_sqlite and has_geoalchemy:
        boundary = Column(Geometry(geometry_type='POLYGON', srid=4326), nullable=True)
    else:
        boundary = Column(Text, nullable=True)  # Store GeoJSON string in SQLite

    # Relationships
    assigned_clients = relationship("User", secondary=client_assignments, back_populates="assigned_projects")
    images = relationship("DroneImage", back_populates="project", cascade="all, delete-orphan")
    videos = relationship("Video", back_populates="project", cascade="all, delete-orphan")
    orthophotos = relationship("Orthophoto", back_populates="project", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="project", cascade="all, delete-orphan")
    processing_jobs = relationship("ProcessingJob", back_populates="project", cascade="all, delete-orphan")
    measurements = relationship("Measurement", back_populates="project", cascade="all, delete-orphan")

class DroneImage(Base):
    __tablename__ = "drone_images"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    filename = Column(String(255), nullable=False)
    filepath = Column(String(512), nullable=False)
    filesize = Column(Integer, nullable=False)
    capture_time = Column(DateTime(timezone=True), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    altitude = Column(Float, nullable=True)

    geom = Column(String(255), nullable=True)

    uploaded_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="images")

class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    title = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    filepath = Column(String(512), nullable=False)
    filesize = Column(Integer, nullable=False)
    duration = Column(Integer, nullable=True)  # in seconds
    uploaded_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="videos")

class Orthophoto(Base):
    __tablename__ = "orthophotos"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    webodm_task_id = Column(String(255), nullable=True)
    orthophoto_path = Column(String(512), nullable=True)
    dsm_path = Column(String(512), nullable=True)
    dtm_path = Column(String(512), nullable=True)
    point_cloud_path = Column(String(512), nullable=True)
    model_3d_path = Column(String(512), nullable=True)
    report_path = Column(String(512), nullable=True)
    processed_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="orthophotos")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    title = Column(String(255), nullable=False)
    report_type = Column(String(50), nullable=False)  # 'pdf', 'excel', 'webodm'
    filepath = Column(String(512), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="reports")

class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    webodm_task_id = Column(String(255), unique=True, nullable=False)
    status = Column(String(50), nullable=False)  # 'queued', 'running', 'completed', 'failed', 'canceled'
    progress = Column(Float, default=0.0)
    logs = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    project = relationship("Project", back_populates="processing_jobs")

class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    name = Column(String(255), nullable=False)
    measurement_type = Column(String(50), nullable=False)  # 'distance', 'area', 'coordinate', 'elevation'
    
    if not is_sqlite and has_geoalchemy:
        geom = Column(Geometry(geometry_type='GEOMETRY', srid=4326), nullable=False)
    else:
        geom = Column(Text, nullable=False)  # GeoJSON string fallback

    value = Column(Float, nullable=False)  # distance in m, area in m2
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="measurements")
    user = relationship("User", back_populates="measurements")

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(255), nullable=False)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="activity_logs")
