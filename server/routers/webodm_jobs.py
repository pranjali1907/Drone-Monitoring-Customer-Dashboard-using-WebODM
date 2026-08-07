from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from typing import List
import datetime

from server.database import get_db, SessionLocal
from server.config import settings
import server.models as models
import server.schemas as schemas
import server.auth as auth
from server.webodm import webodm_client, run_simulated_processing

router = APIRouter(prefix="/api/jobs", tags=["WebODM Processing"])

@router.post("/project/{project_id}/start", response_model=schemas.ProcessingJobResponse)
def start_webodm_processing(
    project_id: int, 
    background_tasks: BackgroundTasks,
    current_admin: models.User = Depends(auth.get_current_admin), 
    db: Session = Depends(get_db)
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Verify project has uploaded images
    images_count = db.query(models.DroneImage).filter(models.DroneImage.project_id == project_id).count()
    if images_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Cannot process project. No drone imagery uploaded yet."
        )

    # Get local files of all images
    images = db.query(models.DroneImage).filter(models.DroneImage.project_id == project_id).all()
    # Resolve to absolute filesystem paths (reversing URL placeholder static/uploads/...)
    file_paths = []
    for img in images:
        # img.filepath is e.g. "static/uploads/project_1/img1.jpg"
        relative_path = img.filepath.replace("static/", "")
        abs_path = os.path.abspath(os.path.join(os.getcwd(), relative_path))
        file_paths.append(abs_path)

    # Trigger WebODM flow
    try:
        webodm_proj_id = webodm_client.create_project(
            name=project.name, 
            description=project.description or ""
        )
        task_uuid = webodm_client.create_task(webodm_proj_id)
        webodm_client.upload_images(webodm_proj_id, task_uuid, file_paths)
        webodm_client.start_processing(webodm_proj_id, task_uuid)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to communicate with WebODM: {str(e)}"
        )

    # Create Database Job
    new_job = models.ProcessingJob(
        project_id=project_id,
        webodm_task_id=task_uuid,
        status="queued",
        progress=0.0,
        logs="Job submitted to processing queue."
    )
    db.add(new_job)
    
    # Update project status
    project.status = "processing"
    db.commit()
    db.refresh(new_job)

    # Audit log
    log = models.ActivityLog(
        user_id=current_admin.id, 
        action="START_PROCESSING", 
        details=f"Triggered processing job for project ID {project_id} (WebODM Task UUID: {task_uuid})"
    )
    db.add(log)
    db.commit()

    # Trigger simulated processing in background if mock mode is on
    if settings.WEBODM_MOCK_MODE:
        background_tasks.add_task(
            run_simulated_processing, 
            project_id, 
            new_job.id, 
            SessionLocal
        )
    else:
        # In real mode, a separate background scheduler or request-time sync could poll WebODM.
        # For simplicity, we can spin up a real polling monitor task
        background_tasks.add_task(
            monitor_real_webodm_processing,
            project_id,
            new_job.id,
            webodm_proj_id,
            task_uuid,
            SessionLocal
        )

    return new_job

@router.get("/project/{project_id}/status", response_model=List[schemas.ProcessingJobResponse])
def get_project_jobs(
    project_id: int, 
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if current_user.role == "client":
        is_assigned = current_user in project.assigned_clients
        if not is_assigned:
            raise HTTPException(status_code=403, detail="Not authorized to access this project")

    # Return processing jobs associated with this project
    return db.query(models.ProcessingJob).filter(models.ProcessingJob.project_id == project_id).all()

# Helper for real WebODM polling
import os
import time

def monitor_real_webodm_processing(project_id: int, job_id: int, webodm_proj_id: str, task_uuid: str, db_session_maker):
    print(f"[MONITOR] Starting WebODM monitoring for project {project_id}, task {task_uuid}")
    while True:
        time.sleep(10)
        db = db_session_maker()
        try:
            job = db.query(models.ProcessingJob).filter(models.ProcessingJob.id == job_id).first()
            if not job or job.status in ["completed", "failed", "canceled"]:
                break
                
            status_info = webodm_client.get_task_status(webodm_proj_id, task_uuid)
            job.status = status_info["status"]
            job.progress = status_info["progress"]
            job.logs = status_info["logs"]
            
            if status_info["status"] == "completed":
                job.completed_at = datetime.datetime.utcnow()
                proj = db.query(models.Project).filter(models.Project.id == project_id).first()
                if proj:
                    proj.status = "completed"
                    proj.completion_date = datetime.date.today()
                    
                # Download results
                out_dir = os.path.join(settings.PROCESSED_DIR, f"project_{project_id}")
                webodm_client.download_assets(webodm_proj_id, task_uuid, out_dir)
                
                # Insert Orthophoto record
                orthophoto = models.Orthophoto(
                    project_id=project_id,
                    webodm_task_id=task_uuid,
                    orthophoto_path=f"static/processed/project_{project_id}/orthophoto.tif",
                    dsm_path=f"static/processed/project_{project_id}/dsm.tif",
                    dtm_path=f"static/processed/project_{project_id}/dtm.tif",
                    point_cloud_path=f"static/processed/project_{project_id}/point_cloud.laz",
                    model_3d_path=f"static/processed/project_{project_id}/model_3d.obj",
                    report_path=f"static/processed/project_{project_id}/report.pdf"
                )
                db.add(orthophoto)
                
                # Insert Report record
                report = models.Report(
                    project_id=project_id,
                    title="WebODM Quality Report",
                    report_type="webodm",
                    filepath=f"static/processed/project_{project_id}/report.pdf"
                )
                db.add(report)
                
                db.commit()
                break
                
            elif status_info["status"] == "failed":
                job.completed_at = datetime.datetime.utcnow()
                proj = db.query(models.Project).filter(models.Project.id == project_id).first()
                if proj:
                    proj.status = "failed"
                db.commit()
                break
                
            db.commit()
        except Exception as e:
            print(f"[MONITOR] Error during polling: {e}")
        finally:
            db.close()
