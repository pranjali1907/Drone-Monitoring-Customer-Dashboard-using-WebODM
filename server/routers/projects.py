import datetime
from typing import List, Optional
import requests as http_requests

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from server.database import get_db
from server.models import Project, ProjectLayer, Measurement, User
from server.schemas import (
    ProjectCreate, ProjectUpdate, ProjectResponse,
    MeasurementCreate, MeasurementResponse,
    ProjectLayerResponse,
)
from server import auth
from server.services.drive_loader import extract_drive_file_id, stream_drive_file
from server.services.raster_worker import process_raster_layer

router = APIRouter(prefix="/api/projects", tags=["Projects"])


# ── Helper ───────────────────────────────────────────────────────────────
def _get_project_or_404(project_id: int, db: Session) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


# ── List Projects ─────────────────────────────────────────────────────────
@router.get("", response_model=List[ProjectResponse])
def list_projects(
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == "admin":
        return db.query(Project).order_by(Project.created_at.desc()).all()
    return current_user.assigned_projects


# ── Create Project ────────────────────────────────────────────────────────
@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(
    project_in: ProjectCreate,
    background_tasks: BackgroundTasks,
    _admin: User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    # Parse survey date
    survey_dt = None
    if project_in.survey_date:
        try:
            survey_dt = datetime.date.fromisoformat(project_in.survey_date)
        except ValueError:
            pass

    project = Project(
        name=project_in.name,
        description=project_in.description,
        location=project_in.location,
        survey_date=survey_dt,
        latitude=project_in.latitude,
        longitude=project_in.longitude,
        boundary_wkt=project_in.boundary_wkt,
        youtube_before_id=project_in.youtube_before_id,
        youtube_after_id=project_in.youtube_after_id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Auto-create RASTER layer if Drive URL given
    if project_in.raster_drive_url:
        file_id = extract_drive_file_id(project_in.raster_drive_url)
        if file_id:
            layer = ProjectLayer(
                project_id=project.id,
                name="Raster Orthomosaic",
                layer_type="RASTER_TILES",
                drive_file_id=file_id,
                drive_url=project_in.raster_drive_url,
                status="PENDING",
            )
            db.add(layer)
            db.commit()
            db.refresh(layer)
            background_tasks.add_task(process_raster_layer, layer.id)

    # Auto-create PLY layers if Drive URLs given
    if project_in.ply_drive_urls:
        for idx, ply_url in enumerate(project_in.ply_drive_urls):
            file_id = extract_drive_file_id(ply_url)
            if file_id:
                ply_layer = ProjectLayer(
                    project_id=project.id,
                    name=f"Point Cloud {idx + 1}",
                    layer_type="POINT_CLOUD_PLY",
                    drive_file_id=file_id,
                    drive_url=ply_url,
                    status="READY",  # PLY is streamed on demand — no preprocessing needed
                )
                db.add(ply_layer)
        db.commit()

    db.refresh(project)
    return project


# ── Get Project ───────────────────────────────────────────────────────────
@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    project = _get_project_or_404(project_id, db)
    if current_user.role != "admin" and project not in current_user.assigned_projects:
        raise HTTPException(status_code=403, detail="Access denied")
    return project


# ── Update Project ────────────────────────────────────────────────────────
@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    _admin: User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    project = _get_project_or_404(project_id, db)
    for field, value in project_in.model_dump(exclude_unset=True).items():
        if field == "survey_date" and value:
            try:
                value = datetime.date.fromisoformat(value)
            except ValueError:
                continue
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


# ── Delete Project ────────────────────────────────────────────────────────
@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: int,
    _admin: User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    project = _get_project_or_404(project_id, db)
    db.delete(project)
    db.commit()


# ── Assign Client ─────────────────────────────────────────────────────────
@router.post("/{project_id}/assign/{user_id}", status_code=204)
def assign_client(
    project_id: int,
    user_id: int,
    _admin: User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    project = _get_project_or_404(project_id, db)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user not in project.assigned_clients:
        project.assigned_clients.append(user)
        db.commit()


# ── Layers ────────────────────────────────────────────────────────────────
@router.get("/{project_id}/layers", response_model=List[ProjectLayerResponse])
def get_layers(
    project_id: int,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    _get_project_or_404(project_id, db)
    return db.query(ProjectLayer).filter(ProjectLayer.project_id == project_id).all()


@router.post("/{project_id}/ingest-raster", status_code=202)
def ingest_raster(
    project_id: int,
    drive_url: str = Query(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    _admin: User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    """Manually trigger async GDAL ingestion for a raster Drive URL."""
    _get_project_or_404(project_id, db)
    file_id = extract_drive_file_id(drive_url)
    if not file_id:
        raise HTTPException(status_code=400, detail="Invalid Google Drive URL")

    layer = ProjectLayer(
        project_id=project_id,
        name="Raster Orthomosaic",
        layer_type="RASTER_TILES",
        drive_file_id=file_id,
        drive_url=drive_url,
        status="PENDING",
    )
    db.add(layer)
    db.commit()
    db.refresh(layer)
    background_tasks.add_task(process_raster_layer, layer.id)
    return {"message": "Ingestion started", "layer_id": layer.id}


# ── Google Drive Streaming Proxy ──────────────────────────────────────────
@router.get("/proxy-drive")
def proxy_drive(file_id: str = Query(...)):
    """Stream a Google Drive file (PLY point cloud etc.) in 1 MB chunks."""
    session = http_requests.Session()
    url = "https://docs.google.com/uc?export=download"
    resp = session.get(url, params={"id": file_id}, stream=True, timeout=30)

    confirm = None
    for key, value in resp.cookies.items():
        if key.startswith("download_warning"):
            confirm = value
            break

    if confirm:
        resp = session.get(url, params={"id": file_id, "confirm": confirm}, stream=True, timeout=60)

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to fetch from Google Drive")

    content_type = resp.headers.get("content-type", "application/octet-stream")

    def chunk_generator():
        for chunk in resp.iter_content(chunk_size=1024 * 1024):
            if chunk:
                yield chunk

    return StreamingResponse(chunk_generator(), media_type=content_type)


# ── Measurements ──────────────────────────────────────────────────────────
@router.get("/{project_id}/measurements", response_model=List[MeasurementResponse])
def list_measurements(
    project_id: int,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    _get_project_or_404(project_id, db)
    return db.query(Measurement).filter(Measurement.project_id == project_id).all()


@router.post("/{project_id}/measurements", response_model=MeasurementResponse, status_code=201)
def create_measurement(
    project_id: int,
    meas_in: MeasurementCreate,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    _get_project_or_404(project_id, db)
    meas = Measurement(
        project_id=project_id,
        user_id=current_user.id,
        name=meas_in.name,
        measurement_type=meas_in.measurement_type,
        value=meas_in.value,
        geom_geojson=meas_in.geom_geojson,
    )
    db.add(meas)
    db.commit()
    db.refresh(meas)
    return meas


@router.delete("/{project_id}/measurements/{meas_id}", status_code=204)
def delete_measurement(
    project_id: int,
    meas_id: int,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    meas = db.query(Measurement).filter(
        Measurement.id == meas_id, Measurement.project_id == project_id
    ).first()
    if not meas:
        raise HTTPException(status_code=404, detail="Measurement not found")
    db.delete(meas)
    db.commit()
