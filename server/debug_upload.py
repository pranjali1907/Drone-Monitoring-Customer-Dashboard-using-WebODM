import os
import shutil
import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy.orm import Session
from typing import List, Optional

from server.database import get_db, SessionLocal
from server.config import settings
import server.models as models
import server.schemas as schemas
import server.auth as auth

def test_insert_image():
    db = SessionLocal()
    try:
        project = db.query(models.Project).first()
        if not project:
            print("No project found!")
            return
        
        print(f"Testing insert for project {project.id}...")
        
        new_image = models.DroneImage(
            project_id=project.id,
            filename="test_upload.jpg",
            filepath=f"static/uploads/project_{project.id}/test_upload.jpg",
            filesize=1024,
            capture_time=datetime.datetime.utcnow(),
            latitude=project.latitude or 17.69,
            longitude=project.longitude or 75.79,
            altitude=120.0
        )
        db.add(new_image)
        db.commit()
        db.refresh(new_image)
        print("SUCCESS! Inserted image ID:", new_image.id)
    except Exception as e:
        print("INSERT FAILED WITH EXCEPTION:", e)
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_insert_image()
