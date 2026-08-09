import os
import shutil
import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy.orm import Session
from typing import List

from server.database import get_db
from server.config import settings
import server.models as models
import server.schemas as schemas
import server.auth as auth

router = APIRouter(prefix="/api/uploads", tags=["Uploads"])

@router.post("/project/{project_id}/images", response_model=List[schemas.DroneImageResponse])
def upload_drone_images(
    project_id: int, 
    files: List[UploadFile] = File(...), 
    current_admin: models.User = Depends(auth.get_current_admin), 
    db: Session = Depends(get_db)
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project_upload_dir = os.path.join(settings.UPLOAD_DIR, f"project_{project_id}")
    os.makedirs(project_upload_dir, exist_ok=True)

    saved_images = []
    for file in files:
        # Check extensions
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ['.jpg', '.jpeg', '.tif', '.tiff']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type {file.filename}. Only JPG, JPEG, and TIFF are allowed."
            )

        file_path = os.path.join(project_upload_dir, file.filename)
        # Save file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Extract size
        size = os.path.getsize(file_path)

        # Mock coordinates near project center
        lat_offset = (len(saved_images) * 0.0001) if project.latitude else 0.0
        lng_offset = (len(saved_images) * 0.0001) if project.longitude else 0.0
        lat_val = (project.latitude or 0.0) + lat_offset
        lng_val = (project.longitude or 0.0) + lng_offset

        geom_val = None
        if models.has_geoalchemy and not models.is_sqlite:
            try:
                from geoalchemy2.elements import WKTElement
                geom_val = WKTElement(f"POINT({lng_val} {lat_val})", srid=4326)
            except Exception as g_err:
                print(f"[WARN] WKTElement point conversion notice: {g_err}")
                geom_val = None
        else:
            geom_val = f"{lng_val}, {lat_val}"

        new_image = models.DroneImage(
            project_id=project_id,
            filename=file.filename,
            filepath=f"static/uploads/project_{project_id}/{file.filename}",
            filesize=size,
            capture_time=datetime.datetime.utcnow() - datetime.timedelta(days=1),
            latitude=lat_val,
            longitude=lng_val,
            altitude=120.0 + (len(saved_images) * 0.5),
            geom=None
        )
        db.add(new_image)
        saved_images.append(new_image)

    db.commit()
    for img in saved_images:
        db.refresh(img)

    # Log action safely
    try:
        log = models.ActivityLog(
            user_id=current_admin.id if current_admin else None, 
            action="UPLOAD_IMAGES", 
            details=f"Uploaded {len(files)} raw drone images to project ID {project_id}"
        )
        db.add(log)
        db.commit()
    except Exception:
        pass

    return saved_images

@router.post("/project/{project_id}/video", response_model=schemas.VideoResponse)
def upload_drone_video(
    project_id: int, 
    file: UploadFile = File(...), 
    current_admin: models.User = Depends(auth.get_current_admin), 
    db: Session = Depends(get_db)
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ['.mp4', '.mov', '.avi']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported video format. Allowed: MP4, MOV, AVI"
        )

    project_upload_dir = os.path.join(settings.UPLOAD_DIR, f"project_{project_id}")
    os.makedirs(project_upload_dir, exist_ok=True)

    file_path = os.path.join(project_upload_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    size = os.path.getsize(file_path)

    new_video = models.Video(
        project_id=project_id,
        title=file.filename,
        filename=file.filename,
        filepath=f"static/uploads/project_{project_id}/{file.filename}",
        filesize=size,
        duration=0
    )
    db.add(new_video)
    db.commit()
    db.refresh(new_video)

    try:
        log = models.ActivityLog(
            user_id=current_admin.id if current_admin else None,
            action="UPLOAD_VIDEO",
            details=f"Uploaded video {file.filename} to project ID {project_id}"
        )
        db.add(log)
        db.commit()
    except Exception:
        pass

    return new_video

@router.post("/project/{project_id}/reports/{report_type}", response_model=schemas.ReportResponse)
def upload_project_report(
    project_id: int,
    report_type: str,
    title: str,
    file: UploadFile = File(...),
    current_admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if report_type not in ['pdf', 'excel']:
        raise HTTPException(status_code=400, detail="Invalid report type. Must be 'pdf' or 'excel'")

    ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = {
        'pdf': ['.pdf'],
        'excel': ['.xlsx', '.xls', '.csv']
    }
    
    if ext not in allowed_exts.get(report_type, []):
        raise HTTPException(status_code=400, detail=f"File extension mismatch for type {report_type}")

    reports_dir = os.path.join(settings.REPORTS_DIR, f"project_{project_id}")
    os.makedirs(reports_dir, exist_ok=True)

    file_path = os.path.join(reports_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    new_report = models.Report(
        project_id=project_id,
        title=title,
        report_type=report_type,
        filepath=f"static/reports/project_{project_id}/{file.filename}",
        created_by=current_admin.id if current_admin else None
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    try:
        log = models.ActivityLog(
            user_id=current_admin.id if current_admin else None, 
            action="UPLOAD_REPORT", 
            details=f"Uploaded report: {title} ({report_type}) to project ID {project_id}"
        )
        db.add(log)
        db.commit()
    except Exception:
        pass

    return new_report

@router.post("/project/{project_id}/ply")
def upload_point_cloud(
    project_id: int,
    file: UploadFile = File(...),
    current_admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    """Upload a .ply point cloud file and associate it with the project's Orthophoto record."""
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext != ".ply":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .ply files are supported for point cloud uploads.",
        )

    # Save to processed/project_<id>/point_cloud.ply
    project_processed_dir = os.path.join(settings.PROCESSED_DIR, f"project_{project_id}")
    os.makedirs(project_processed_dir, exist_ok=True)

    dest_path = os.path.join(project_processed_dir, "point_cloud.ply")
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    static_path = f"static/processed/project_{project_id}/point_cloud.ply"

    orthophoto = (
        db.query(models.Orthophoto)
        .filter(models.Orthophoto.project_id == project_id)
        .first()
    )
    if orthophoto:
        orthophoto.point_cloud_path = static_path
    else:
        orthophoto = models.Orthophoto(
            project_id=project_id,
            point_cloud_path=static_path,
        )
        db.add(orthophoto)

    project.status = "completed"
    db.commit()
    db.refresh(orthophoto)

    try:
        log = models.ActivityLog(
            user_id=current_admin.id if current_admin else None,
            action="UPLOAD_PLY",
            details=f"Uploaded point cloud .ply for project ID {project_id}",
        )
        db.add(log)
        db.commit()
    except Exception:
        pass

    return {"message": "Point cloud uploaded successfully", "point_cloud_path": static_path}

@router.delete("/project/{project_id}/ply")
def delete_point_cloud(
    project_id: int,
    current_admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete the saved .ply point cloud file for a project and clear its database record."""
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    orthophoto = (
        db.query(models.Orthophoto)
        .filter(models.Orthophoto.project_id == project_id)
        .first()
    )

    ply_path = os.path.join(settings.PROCESSED_DIR, f"project_{project_id}", "point_cloud.ply")
    try:
        if os.path.exists(ply_path):
            os.remove(ply_path)
    except OSError as exc:
        print(f"[WARN] Could not remove ply file: {exc}")

    if orthophoto:
        orthophoto.point_cloud_path = None
        has_other_outputs = any([
            orthophoto.orthophoto_path,
            orthophoto.dsm_path,
            orthophoto.model_3d_path,
        ])
        if not has_other_outputs:
            project.status = "draft"
        db.commit()

    try:
        log = models.ActivityLog(
            user_id=current_admin.id if current_admin else None,
            action="DELETE_PLY",
            details=f"Deleted point cloud .ply for project ID {project_id}",
        )
        db.add(log)
        db.commit()
    except Exception:
        pass

    return {"message": "Point cloud deleted successfully"}
