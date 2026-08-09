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

from server.seed_demo import seed_demo_data

# Database seeding
@app.on_event("startup")
def seed_database():
    try:
        seed_demo_data()
    except Exception as e:
        print(f"[SEED] Startup error: {e}")

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
