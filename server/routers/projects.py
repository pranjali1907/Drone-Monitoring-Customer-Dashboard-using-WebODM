from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json

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
        # Return only projects assigned to this client
        return current_user.assigned_projects

@router.post("", response_model=schemas.ProjectResponse)
def create_project(project_in: schemas.ProjectCreate, current_admin: models.User = Depends(auth.get_current_admin), db: Session = Depends(get_db)):
    new_project = models.Project(
        name=project_in.name,
        description=project_in.description,
        location=project_in.location,
        latitude=project_in.latitude,
        longitude=project_in.longitude,
        boundary=project_in.boundary, # Stored as GeoJSON string or geometry
        survey_date=project_in.survey_date,
        status="draft"
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    
    # Audit logging
    log = models.ActivityLog(user_id=current_admin.id, action="CREATE_PROJECT", details=f"Created project: {new_project.name} (ID: {new_project.id})")
    db.add(log)
    db.commit()
    
    return new_project

@router.get("/{project_id}", response_model=schemas.ProjectDetailResponse)
def get_project_details(project_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Check access for client
    if current_user.role == "client":
        assignment = db.query(models.client_assignments).filter_key_or_value = None
        is_assigned = db.query(models.User).filter(
            models.User.id == current_user.id,
            models.User.assigned_projects.any(id=project_id)
        ).first()
        if not is_assigned:
            raise HTTPException(status_code=403, detail="Not authorized to view this project")
            
    return project

@router.put("/{project_id}", response_model=schemas.ProjectResponse)
def update_project(project_id: int, project_update: schemas.ProjectUpdate, current_admin: models.User = Depends(auth.get_current_admin), db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    update_data = project_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
        
    db.commit()
    db.refresh(project)
    
    # Audit log
    log = models.ActivityLog(user_id=current_admin.id, action="UPDATE_PROJECT", details=f"Updated project ID {project_id}")
    db.add(log)
    db.commit()
    
    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, current_admin: models.User = Depends(auth.get_current_admin), db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    db.delete(project)
    
    # Audit log
    log = models.ActivityLog(user_id=current_admin.id, action="DELETE_PROJECT", details=f"Deleted project: {project.name} (ID: {project_id})")
    db.add(log)
    db.commit()
    return None

@router.post("/{project_id}/assign/{client_id}", status_code=status.HTTP_200_OK)
def assign_client_to_project(project_id: int, client_id: int, current_admin: models.User = Depends(auth.get_current_admin), db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    client = db.query(models.User).filter(models.User.id == client_id, models.User.role == "client").first()
    
    if not project or not client:
        raise HTTPException(status_code=404, detail="Project or Client not found")
        
    # Check if already assigned
    is_assigned = client in project.assigned_clients
    if not is_assigned:
        project.assigned_clients.append(client)
        db.commit()
        
        # Log action
        log = models.ActivityLog(user_id=current_admin.id, action="ASSIGN_PROJECT", details=f"Assigned project {project.name} to client {client.email}")
        db.add(log)
        db.commit()
        
    return {"message": f"Client assigned to project successfully"}

@router.post("/{project_id}/unassign/{client_id}", status_code=status.HTTP_200_OK)
def unassign_client_from_project(project_id: int, client_id: int, current_admin: models.User = Depends(auth.get_current_admin), db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    client = db.query(models.User).filter(models.User.id == client_id, models.User.role == "client").first()
    
    if not project or not client:
        raise HTTPException(status_code=404, detail="Project or Client not found")
        
    if client in project.assigned_clients:
        project.assigned_clients.remove(client)
        db.commit()
        
        # Log action
        log = models.ActivityLog(user_id=current_admin.id, action="UNASSIGN_PROJECT", details=f"Unassigned project {project.name} from client {client.email}")
        db.add(log)
        db.commit()
        
    return {"message": "Client unassigned from project successfully"}

@router.post("/{project_id}/measurements", response_model=schemas.MeasurementResponse)
def create_measurement(project_id: int, measurement_in: schemas.MeasurementCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    # Check project permission
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if current_user.role == "client":
        is_assigned = current_user in project.assigned_clients
        if not is_assigned:
            raise HTTPException(status_code=403, detail="Not authorized to access this project")
            
    new_measurement = models.Measurement(
        project_id=project_id,
        user_id=current_user.id,
        name=measurement_in.name,
        measurement_type=measurement_in.measurement_type,
        geom=measurement_in.geom, # GeoJSON format text
        value=measurement_in.value,
        notes=measurement_in.notes
    )
    db.add(new_measurement)
    db.commit()
    db.refresh(new_measurement)
    return new_measurement

@router.get("/{project_id}/measurements", response_model=List[schemas.MeasurementResponse])
def get_measurements(project_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if current_user.role == "client":
        is_assigned = current_user in project.assigned_clients
        if not is_assigned:
            raise HTTPException(status_code=403, detail="Not authorized to access this project")
            
    return db.query(models.Measurement).filter(models.Measurement.project_id == project_id).all()
