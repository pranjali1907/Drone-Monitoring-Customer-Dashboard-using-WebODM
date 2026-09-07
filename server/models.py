import datetime
from sqlalchemy import (
    Column, Integer, BigInteger, String, Text, Float, Date, DateTime,
    ForeignKey, Table, UniqueConstraint
)
from sqlalchemy.orm import relationship
from server.database import Base

# ── Many-to-many: Users ↔ Projects ─────────────────────────────────────
client_assignments = Table(
    "client_assignments",
    Base.metadata,
    Column("user_id",    Integer, ForeignKey("users.id",    ondelete="CASCADE"), primary_key=True),
    Column("project_id", Integer, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("assigned_at", DateTime(timezone=True), default=datetime.datetime.utcnow),
)


class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name       = Column(String(255), nullable=False)
    role            = Column(String(50),  nullable=False, default="client")  # 'admin' | 'client'
    created_at      = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    assigned_projects = relationship(
        "Project", secondary=client_assignments, back_populates="assigned_clients"
    )
    measurements = relationship("Measurement", back_populates="user", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id               = Column(Integer, primary_key=True, index=True)
    name             = Column(String(255), nullable=False)
    description      = Column(Text,       nullable=True)
    location         = Column(String(255), nullable=True)
    survey_date      = Column(Date,        nullable=True)
    latitude         = Column(Float,       nullable=True)
    longitude        = Column(Float,       nullable=True)
    # PostGIS boundary stored as WKT text (compatible without GeoAlchemy2)
    boundary_wkt     = Column(Text,        nullable=True)
    # YouTube IDs for split-screen comparison
    youtube_before_id = Column(String(100), nullable=True)
    youtube_after_id  = Column(String(100), nullable=True)
    # Processing status of this project overall
    status           = Column(String(50), default="active")  # 'active' | 'archived'
    created_at       = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at       = Column(DateTime(timezone=True), default=datetime.datetime.utcnow,
                              onupdate=datetime.datetime.utcnow)

    assigned_clients = relationship(
        "User", secondary=client_assignments, back_populates="assigned_projects"
    )
    layers       = relationship("ProjectLayer", back_populates="project", cascade="all, delete-orphan")
    images       = relationship("DroneImage",   back_populates="project", cascade="all, delete-orphan")
    measurements = relationship("Measurement",  back_populates="project", cascade="all, delete-orphan")


class ProjectLayer(Base):
    """Tracks each raster or point-cloud asset linked to a project."""
    __tablename__ = "project_layers"

    id              = Column(Integer, primary_key=True, index=True)
    project_id      = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name            = Column(String(255), nullable=False, default="Unnamed Layer")
    layer_type      = Column(String(50),  nullable=False)   # 'RASTER_TILES' | 'POINT_CLOUD_PLY'
    drive_file_id   = Column(String(255), nullable=True)    # Google Drive file ID
    drive_url       = Column(Text,        nullable=True)    # Full Drive URL (store for display)
    tile_url_pattern = Column(Text,       nullable=True)    # e.g. /tiles/{layer_id}/{z}/{x}/{y}.png
    status          = Column(String(50),  nullable=False, default="PENDING")  # PENDING|PROCESSING|READY|FAILED
    error_message   = Column(Text,        nullable=True)
    file_size_bytes = Column(BigInteger,  nullable=True)
    crs             = Column(String(100), nullable=True)
    resolution_cm   = Column(Float,       nullable=True)
    metadata_json   = Column(Text,        nullable=True)
    created_at      = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="layers")


class DroneImage(Base):
    """Geotagged individual drone survey photo linked to a project."""
    __tablename__ = "drone_images"

    id            = Column(Integer, primary_key=True, index=True)
    project_id    = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    filename      = Column(String(255), nullable=False)
    drive_file_id = Column(String(255), nullable=True)
    drive_url     = Column(Text,        nullable=True)
    thumbnail_url = Column(Text,        nullable=True)
    latitude      = Column(Float,       nullable=True, index=True)
    longitude     = Column(Float,       nullable=True, index=True)
    altitude_m    = Column(Float,       nullable=True)
    heading_deg   = Column(Float,       nullable=True)
    captured_at   = Column(DateTime(timezone=True), nullable=True)
    created_at    = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="images")


class Measurement(Base):
    """User-drawn 2D annotations on the map (distance or area)."""
    __tablename__ = "measurements"

    id               = Column(Integer, primary_key=True, index=True)
    project_id       = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id          = Column(Integer, ForeignKey("users.id",    ondelete="SET NULL"), nullable=True)
    name             = Column(String(255), nullable=True)
    measurement_type = Column(String(50),  nullable=False)   # 'distance' | 'area'
    value            = Column(Float,       nullable=False)   # meters or sq meters
    geom_geojson     = Column(Text,        nullable=True)    # GeoJSON string
    created_at       = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    project = relationship("Project",     back_populates="measurements")
    user    = relationship("User",        back_populates="measurements")

