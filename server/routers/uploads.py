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

    raw_filename = os.path.basename(file.filename) if file.filename else "point_cloud.ply"
    if not raw_filename.lower().endswith(".ply"):
        raw_filename += ".ply"

    # Save with original filename
    named_dest = os.path.join(project_processed_dir, raw_filename)
    with open(named_dest, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Also maintain default point_cloud.ply
    default_dest = os.path.join(project_processed_dir, "point_cloud.ply")
    if named_dest != default_dest:
        shutil.copyfile(named_dest, default_dest)

    static_path = f"static/processed/project_{project_id}/{raw_filename}"

    layer = (
        db.query(models.ProjectLayer)
        .filter(
            models.ProjectLayer.project_id == project_id,
            models.ProjectLayer.layer_type == "POINT_CLOUD_PLY"
        )
        .first()
    )
    if layer:
        layer.name = raw_filename
        layer.tile_url_pattern = static_path
        layer.status = "READY"
    else:
        layer = models.ProjectLayer(
            project_id=project_id,
            name=raw_filename,
            layer_type="POINT_CLOUD_PLY",
            tile_url_pattern=static_path,
            status="READY",
        )
        db.add(layer)

    db.commit()
    db.refresh(layer)

    return {
        "message": f"Point cloud '{raw_filename}' uploaded successfully",
        "filename": raw_filename,
        "point_cloud_path": static_path
    }

@router.get("/project/{project_id}/ply-files")
def list_project_ply_files(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project_processed_dir = os.path.join(settings.PROCESSED_DIR, f"project_{project_id}")
    ply_files = []
    seen = set()
    if os.path.exists(project_processed_dir):
        for fname in sorted(os.listdir(project_processed_dir)):
            if fname.lower().endswith(".ply"):
                fpath = os.path.join(project_processed_dir, fname)
                if os.path.isfile(fpath):
                    fsize = os.path.getsize(fpath)
                    ply_files.append({
                        "filename": fname,
                        "url": f"static/processed/project_{project_id}/{fname}",
                        "filesize": fsize,
                        "is_default": (fname == "point_cloud.ply")
                    })
                    seen.add(fname)
    return ply_files

@router.delete("/project/{project_id}/ply")
def delete_point_cloud(
    project_id: int,
    db: Session = Depends(get_db),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    layers = (
        db.query(models.ProjectLayer)
        .filter(
            models.ProjectLayer.project_id == project_id,
            models.ProjectLayer.layer_type == "POINT_CLOUD_PLY"
        )
        .all()
    )
    for l in layers:
        db.delete(l)

    ply_path = os.path.join(settings.PROCESSED_DIR, f"project_{project_id}", "point_cloud.ply")
    try:
        if os.path.exists(ply_path):
            os.remove(ply_path)
    except OSError as exc:
        print(f"[WARN] Could not remove ply file: {exc}")

    db.commit()
    return {"message": "Point cloud deleted successfully"}

@router.delete("/project/{project_id}/ply/{filename}")
def delete_specific_ply_file(
    project_id: int,
    filename: str,
    db: Session = Depends(get_db),
):
    safe_name = os.path.basename(filename)
    ply_path = os.path.join(settings.PROCESSED_DIR, f"project_{project_id}", safe_name)
    if os.path.exists(ply_path):
        try:
            os.remove(ply_path)
        except OSError as exc:
            raise HTTPException(status_code=500, detail=f"Could not remove file: {exc}")
    return {"message": f"File {safe_name} deleted successfully"}

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
