from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import datetime
from datetime import date

from server.database import get_db
import server.models as models
import server.schemas as schemas
import server.auth as auth

router = APIRouter(prefix="/api/projects", tags=["Projects"])

@router.get("", response_model=List[schemas.ProjectResponse])
def get_projects(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "admin":
        return db.query(models.Project).all()
    else:
        # Return assigned projects or all if client has access
        return current_user.assigned_projects if current_user.assigned_projects else db.query(models.Project).all()

@router.post("", response_model=schemas.ProjectResponse)
def create_project(project_in: schemas.ProjectCreate, current_admin: models.User = Depends(auth.get_current_admin), db: Session = Depends(get_db)):
    # 1. Parse survey date safely
    survey_dt = None
    if project_in.survey_date:
        if isinstance(project_in.survey_date, date):
            survey_dt = project_in.survey_date
        elif isinstance(project_in.survey_date, str) and project_in.survey_date.strip():
            s = project_in.survey_date.strip()
            for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d"):
                try:
                    survey_dt = datetime.datetime.strptime(s, fmt).date()
                    break
                except Exception:
                    pass

    # 2. Parse boundary geometry safely for PostGIS / SQLite
    boundary_val = None
    if project_in.boundary:
        try:
            if isinstance(project_in.boundary, str):
                b_dict = json.loads(project_in.boundary)
            else:
                b_dict = project_in.boundary

            if models.has_geoalchemy and not models.is_sqlite:
                try:
                    from shapely.geometry import shape
                    from geoalchemy2.shape import from_shape
                    sh = shape(b_dict)
                    boundary_val = from_shape(sh, srid=4326)
                except Exception as g_err:
                    print(f"[WARN] PostGIS shape conversion notice: {g_err}")
                    boundary_val = None
            else:
                boundary_val = json.dumps(b_dict)
        except Exception as b_err:
            print(f"[WARN] Boundary GeoJSON parse error: {b_err}")
            boundary_val = None

    new_project = models.Project(
        name=project_in.name,
        description=project_in.description,
        location=project_in.location,
        latitude=project_in.latitude,
        longitude=project_in.longitude,
        boundary=boundary_val,
        survey_date=survey_dt,
        status="draft"
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    
    # Audit logging
    try:
        log = models.ActivityLog(
            user_id=current_admin.id if current_admin else None,
            action="CREATE_PROJECT",
            details=f"Created project: {new_project.name} (ID: {new_project.id})"
        )
        db.add(log)
        db.commit()
    except Exception:
        pass
    
    return new_project

@router.get("/{project_id}", response_model=schemas.ProjectDetailResponse)
def get_project_details(project_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.put("/{project_id}", response_model=schemas.ProjectResponse)
def update_project(project_id: int, project_in: schemas.ProjectUpdate, current_admin: models.User = Depends(auth.get_current_admin), db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    update_data = project_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "boundary" and value:
            continue  # preserve geometry
        setattr(project, field, value)
        
    db.commit()
    db.refresh(project)
    return project

@router.delete("/{project_id}", status_code=status.HTTP_200_OK)
def delete_project(project_id: int, current_admin: models.User = Depends(auth.get_current_admin), db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    db.delete(project)
    db.commit()

    # Physically delete project directories from disk / cloud storage
    import os, shutil
    from server.config import settings
    for base_dir in [settings.UPLOAD_DIR, settings.PROCESSED_DIR, settings.REPORTS_DIR]:
        folder_path = os.path.join(base_dir, f"project_{project_id}")
        if os.path.exists(folder_path):
            try:
                shutil.rmtree(folder_path)
            except Exception as e:
                print(f"[WARN] Could not remove folder {folder_path}: {e}")
    
    try:
        log = models.ActivityLog(
            user_id=current_admin.id if current_admin else None,
            action="DELETE_PROJECT",
            details=f"Deleted project ID: {project_id}"
        )
        db.add(log)
        db.commit()
    except Exception:
        pass
        
    return {"message": f"Project {project_id} deleted successfully"}

@router.post("/{project_id}/assign/{client_id}")
def assign_client_to_project(project_id: int, client_id: int, current_admin: models.User = Depends(auth.get_current_admin), db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    client = db.query(models.User).filter(models.User.id == client_id, models.User.role == "client").first()
    if not project or not client:
        raise HTTPException(status_code=404, detail="Project or client user not found")
    if client not in project.assigned_clients:
        project.assigned_clients.append(client)
        db.commit()
    return {"message": f"Assigned {client.email} to project {project.name}"}

@router.post("/{project_id}/unassign/{client_id}")
def unassign_client_from_project(project_id: int, client_id: int, current_admin: models.User = Depends(auth.get_current_admin), db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    client = db.query(models.User).filter(models.User.id == client_id).first()
    if not project or not client:
        raise HTTPException(status_code=404, detail="Project or client user not found")
    if client in project.assigned_clients:
        project.assigned_clients.remove(client)
        db.commit()
    return {"message": f"Revoked access for {client.email} from project {project.name}"}

@router.post("/cleanup-orphaned-data")
def trigger_orphan_data_cleanup():
    from server.main import cleanup_orphaned_project_folders
    count = cleanup_orphaned_project_folders()
    return {"message": f"Successfully cleaned up {count} orphaned project data storage folders."}
