import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import Dict, List
import datetime

from server.config import settings
from server.database import engine, Base, get_db
import server.models as models
import server.schemas as schemas
import server.auth as auth

# Import Routers
from server.routers import auth as auth_router
from server.routers import projects as projects_router
from server.routers import uploads as uploads_router
from server.routers import webodm_jobs as jobs_router

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API server for Cloud-Based Drone Monitoring & Customer Dashboard",
    version="1.0.0"
)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create folders if not exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.PROCESSED_DIR, exist_ok=True)
os.makedirs(settings.REPORTS_DIR, exist_ok=True)

# Mount static asset folders to serve files (orthophotos, videos, reports)
app.mount("/static/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/static/processed", StaticFiles(directory=settings.PROCESSED_DIR), name="processed")
app.mount("/static/reports", StaticFiles(directory=settings.REPORTS_DIR), name="reports")

# Register Routers
app.include_router(auth_router.router)
app.include_router(projects_router.router)
app.include_router(uploads_router.router)
app.include_router(jobs_router.router)

# Database seeding
@app.on_event("startup")
def seed_database():
    db = next(get_db())
    try:
        # Check if admin user exists
        admin = db.query(models.User).filter(models.User.email == "admin@dronemonitor.com").first()
        if not admin:
            hashed_pw = auth.get_password_hash("admin123")
            admin_user = models.User(
                email="admin@dronemonitor.com",
                hashed_password=hashed_pw,
                full_name="Super Administrator",
                role="admin"
            )
            db.add(admin_user)
            db.commit()
            print("[SEED] Created default admin user: admin@dronemonitor.com / admin123")

        # Check if client user exists
        client = db.query(models.User).filter(models.User.email == "client@dronemonitor.com").first()
        if not client:
            hashed_pw = auth.get_password_hash("client123")
            client_user = models.User(
                email="client@dronemonitor.com",
                hashed_password=hashed_pw,
                full_name="Construx Inc. Client",
                role="client"
            )
            db.add(client_user)
            db.commit()
            print("[SEED] Created default client user: client@dronemonitor.com / client123")
            
        # Create a sample project if none exist
        if db.query(models.Project).count() == 0:
            sample_project = models.Project(
                name="Solar Farm Survey A",
                description="Quarterly drone mapping analysis of the Solar Farm construction site in Mojave, CA.",
                location="Mojave, CA",
                latitude=35.0592,
                longitude=-118.1622,
                status="completed",
                survey_date=datetime.date.today() - datetime.timedelta(days=10),
                completion_date=datetime.date.today() - datetime.timedelta(days=9)
            )
            db.add(sample_project)
            db.commit()
            db.refresh(sample_project)
            
            # Associate sample project with sample client
            c_user = db.query(models.User).filter(models.User.email == "client@dronemonitor.com").first()
            if c_user:
                sample_project.assigned_clients.append(c_user)
                db.commit()
                
            # Create a mock completed WebODM job and orthophoto record for the sample project
            job = models.ProcessingJob(
                project_id=sample_project.id,
                webodm_task_id="task-sample-9999",
                status="completed",
                progress=100.0,
                logs="Alignment completed\nDense matching complete\nDSM complete\nTextured model output successfully",
                started_at=datetime.datetime.utcnow() - datetime.timedelta(hours=2),
                completed_at=datetime.datetime.utcnow() - datetime.timedelta(hours=1)
            )
            db.add(job)
            
            out_dir = os.path.join(settings.PROCESSED_DIR, f"project_{sample_project.id}")
            os.makedirs(out_dir, exist_ok=True)
            
            # Create simple blank placeholder files for map display simulation
            assets = ["orthophoto.tif", "dsm.tif", "dtm.tif", "point_cloud.laz", "model_3d.obj", "report.pdf"]
            for a in assets:
                with open(os.path.join(out_dir, a), "w") as f:
                    f.write(f"Sample data for {a}\n")
                    
            ortho = models.Orthophoto(
                project_id=sample_project.id,
                webodm_task_id="task-sample-9999",
                orthophoto_path=f"static/processed/project_{sample_project.id}/orthophoto.tif",
                dsm_path=f"static/processed/project_{sample_project.id}/dsm.tif",
                dtm_path=f"static/processed/project_{sample_project.id}/dtm.tif",
                point_cloud_path=f"static/processed/project_{sample_project.id}/point_cloud.laz",
                model_3d_path=f"static/processed/project_{sample_project.id}/model_3d.obj",
                report_path=f"static/processed/project_{sample_project.id}/report.pdf"
            )
            db.add(ortho)
            
            report = models.Report(
                project_id=sample_project.id,
                title="WebODM Quality Report",
                report_type="webodm",
                filepath=f"static/processed/project_{sample_project.id}/report.pdf"
            )
            db.add(report)

            report2 = models.Report(
                project_id=sample_project.id,
                title="Mojave Solar Farm Q2 Survey Report",
                report_type="pdf",
                filepath=f"static/reports/project_{sample_project.id}/Solar_Farm_Survey_Q2_Report.pdf"
            )
            db.add(report2)

            video = models.Video(
                project_id=sample_project.id,
                title="Survey Flight Path Video Logs",
                filename="survey_flight.mp4",
                filepath=f"static/uploads/project_{sample_project.id}/survey_flight.mp4",
                filesize=1024 * 1024 * 5,
                duration=65
            )
            db.add(video)

            # Seed 4 raw images in gallery database
            for i in range(1, 5):
                img = models.DroneImage(
                    project_id=sample_project.id,
                    filename=f"survey_capture_00{i}.jpg",
                    filepath=f"static/uploads/project_{sample_project.id}/survey_capture_00{i}.jpg",
                    filesize=1024 * 180,
                    capture_time=datetime.datetime.utcnow() - datetime.timedelta(days=10),
                    latitude=sample_project.latitude + (i * 0.0001),
                    longitude=sample_project.longitude + (i * 0.0001),
                    altitude=120.0,
                    geom=f"{sample_project.longitude + (i * 0.0001)}, {sample_project.latitude + (i * 0.0001)}"
                )
                db.add(img)

            # Insert an initial Activity Log to look nice
            log = models.ActivityLog(
                action="SYSTEM_INIT",
                details="Initial project workspace seeded with mock Orthomaps and 3D terrain meshes.",
                created_at=datetime.datetime.utcnow()
            )
            db.add(log)

            db.commit()
            print("[SEED] Created default completed project, orthophoto, raw images, videos, and reports records")

    except Exception as e:
        print(f"[SEED] Seeding error: {e}")
    finally:
        db.close()

# Dashboard Stats Endpoint
@app.get("/api/dashboard/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "admin":
        projects = db.query(models.Project).all()
        jobs = db.query(models.ProcessingJob).all()
        logs = db.query(models.ActivityLog).order_by(models.ActivityLog.created_at.desc()).limit(5).all()
    else:
        projects = current_user.assigned_projects
        proj_ids = [p.id for p in projects]
        jobs = db.query(models.ProcessingJob).filter(models.ProcessingJob.project_id.in_(proj_ids)).all() if proj_ids else []
        logs = db.query(models.ActivityLog).filter(models.ActivityLog.user_id == current_user.id).order_by(models.ActivityLog.created_at.desc()).limit(5).all()

    total_projects = len(projects)
    active_projects = sum(1 for p in projects if p.status in ["processing", "draft"])
    completed_projects = sum(1 for p in projects if p.status == "completed")
    
    processing_status = []
    for j in jobs:
        processing_status.append({
            "task_id": j.webodm_task_id,
            "project_id": j.project_id,
            "status": j.status,
            "progress": j.progress
        })

    # Storage Usage calculation (sizes of uploads, processed, and reports)
    storage_usage = 0
    for folder in [settings.UPLOAD_DIR, settings.PROCESSED_DIR, settings.REPORTS_DIR]:
        if os.path.exists(folder):
            for root, dirs, files in os.walk(folder):
                for file in files:
                    storage_usage += os.path.getsize(os.path.join(root, file))

    latest_uploads = []
    for log in logs:
        latest_uploads.append({
            "action": log.action,
            "details": log.details,
            "timestamp": log.created_at
        })

    return {
        "total_projects": total_projects,
        "active_projects": active_projects,
        "completed_projects": completed_projects,
        "processing_status": processing_status,
        "storage_usage": storage_usage,
        "latest_uploads": latest_uploads
    }

@app.get("/")
def read_root():
    return {"message": "Welcome to Drone Monitoring Platform REST API. Access Swagger docs at /docs"}
