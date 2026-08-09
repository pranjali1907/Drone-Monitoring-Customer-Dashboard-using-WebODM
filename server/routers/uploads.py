import os
import shutil
import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy.orm import Session
from typing import List, Optional

from server.database import get_db
from server.config import settings
import server.models as models
import server.schemas as schemas

router = APIRouter(prefix="/api/uploads", tags=["Uploads"])

@router.post("/project/{project_id}/images", response_model=List[schemas.DroneImageResponse])
def upload_drone_images(
    project_id: int, 
    files: List[UploadFile] = File(...), 
    db: Session = Depends(get_db)
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project_upload_dir = os.path.join(settings.UPLOAD_DIR, f"project_{project_id}")
    os.makedirs(project_upload_dir, exist_ok=True)

    saved_images = []
    for file in files:
        file_path = os.path.join(project_upload_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        size = os.path.getsize(file_path)

        lat_offset = (len(saved_images) * 0.0001) if project.latitude else 0.0
        lng_offset = (len(saved_images) * 0.0001) if project.longitude else 0.0
        lat_val = (project.latitude or 0.0) + lat_offset
        lng_val = (project.longitude or 0.0) + lng_offset

        new_image = models.DroneImage(
            project_id=project_id,
            filename=file.filename,
            filepath=f"static/uploads/project_{project_id}/{file.filename}",
            filesize=size,
            capture_time=datetime.datetime.utcnow(),
            latitude=lat_val,
            longitude=lng_val,
            altitude=120.0 + (len(saved_images) * 0.5)
        )
        db.add(new_image)
        saved_images.append(new_image)

    db.commit()
    for img in saved_images:
        try:
            db.refresh(img)
        except Exception:
            pass

    return saved_images

@router.post("/project/{project_id}/video", response_model=schemas.VideoResponse)
def upload_drone_video(
    project_id: int, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

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

    return new_video

@router.post("/project/{project_id}/reports/{report_type}", response_model=schemas.ReportResponse)
def upload_project_report(
    project_id: int,
    report_type: str,
    title: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

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
        created_by=1
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    return new_report

@router.post("/project/{project_id}/ply")
def upload_point_cloud(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

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

    return {"message": "Point cloud uploaded successfully", "point_cloud_path": static_path}

@router.delete("/project/{project_id}/ply")
def delete_point_cloud(
    project_id: int,
    db: Session = Depends(get_db),
):
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

    return {"message": "Point cloud deleted successfully"}

@router.delete("/image/{image_id}")
def delete_drone_image(image_id: int, db: Session = Depends(get_db)):
    image = db.query(models.DroneImage).filter(models.DroneImage.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    if image.filepath:
        rel_path = image.filepath.replace("static/uploads/", "")
        full_path = os.path.join(settings.UPLOAD_DIR, rel_path)
        if os.path.exists(full_path):
            try:
                os.remove(full_path)
            except Exception as e:
                print(f"[WARN] Failed to delete image file {full_path}: {e}")

    db.delete(image)
    db.commit()
    return {"message": "Image deleted successfully"}

@router.delete("/video/{video_id}")
def delete_drone_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    if video.filepath:
        rel_path = video.filepath.replace("static/uploads/", "")
        full_path = os.path.join(settings.UPLOAD_DIR, rel_path)
        if os.path.exists(full_path):
            try:
                os.remove(full_path)
            except Exception as e:
                print(f"[WARN] Failed to delete video file {full_path}: {e}")

    db.delete(video)
    db.commit()
    return {"message": "Video deleted successfully"}
