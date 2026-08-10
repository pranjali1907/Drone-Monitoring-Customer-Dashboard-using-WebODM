import os
import math
import datetime
from sqlalchemy.orm import Session

from server.config import settings
from server.database import engine, Base, SessionLocal
import server.models as models
import server.auth as auth

def create_sample_ply_file(filepath: str):
    """Generates an ASCII PLY point cloud file representing a terrain stockpile hill."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    points = []
    # Generate a 40x40 grid terrain with a central stockpile hill
    grid_size = 50
    scale = 0.5
    for i in range(grid_size):
        for j in range(grid_size):
            x = (i - grid_size / 2) * scale
            y = (j - grid_size / 2) * scale
            dist = math.sqrt(x*x + y*y)
            # Base terrain height + hill bump
            z = math.sin(x * 0.2) * 0.5 + math.cos(y * 0.2) * 0.5
            if dist < 8:
                # Add stockpile hill height
                z += (8 - dist) * 0.6 + math.sin(dist * 2) * 0.2
                
            # Colors: red/amber on hill, green on base
            if dist < 8:
                r, g, b = 220, 140, 40
            else:
                r, g, b = 40, 160, 90
                
            points.append((x, y, z, r, g, b))
            
    header = f"""ply
format ascii 1.0
comment Created for Eagle Infra Demo
element vertex {len(points)}
property float x
property float y
property float z
property uchar red
property uchar green
property uchar blue
end_header
"""
    with open(filepath, "w") as f:
        f.write(header)
        for pt in points:
            f.write(f"{pt[0]:.4f} {pt[1]:.4f} {pt[2]:.4f} {pt[3]} {pt[4]} {pt[5]}\n")
            
    print(f"[DEMO] Created sample point cloud PLY with {len(points)} vertices at {filepath}")

def seed_demo_data():
    db: Session = SessionLocal()
    try:
        # 1. Ensure Admin User
        admin = db.query(models.User).filter(models.User.email == "admin@dronemonitor.com").first()
        if not admin:
            admin = models.User(
                email="admin@dronemonitor.com",
                hashed_password=auth.get_password_hash("admin123"),
                full_name="Eagle Admin Operator",
                role="admin"
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        # 2. Find or Create Demo Project
        demo_proj = db.query(models.Project).filter(models.Project.name.like("%Eagle Highway%")).first()
        if not demo_proj:
            demo_proj = db.query(models.Project).first()
            
        if not demo_proj:
            demo_proj = models.Project(
                name="Eagle Highway & Bridge Survey - Solapur (Demo)",
                description="Comprehensive 3D drone monitoring, earthwork cut-fill analysis, and high-res orthomap inspection.",
                location="Solapur, Maharashtra",
                latitude=17.6599,
                longitude=75.9064,
                status="completed",
                survey_date=datetime.date.today() - datetime.timedelta(days=5),
                completion_date=datetime.date.today() - datetime.timedelta(days=4)
            )
            db.add(demo_proj)
            db.commit()
            db.refresh(demo_proj)
        else:
            demo_proj.name = "Eagle Highway & Bridge Survey - Solapur (Demo)"
            demo_proj.location = "Solapur, Maharashtra"
            demo_proj.status = "completed"
            db.commit()

        proj_id = demo_proj.id
        
        # 3. Create PLY file on disk and associate orthophoto record
        ply_disk_path = os.path.join(settings.PROCESSED_DIR, f"project_{proj_id}", "point_cloud.ply")
        create_sample_ply_file(ply_disk_path)
        
        ply_rel_path = f"static/processed/project_{proj_id}/point_cloud.ply"
        
        ortho = db.query(models.Orthophoto).filter(models.Orthophoto.project_id == proj_id).first()
        if not ortho:
            ortho = models.Orthophoto(
                project_id=proj_id,
                webodm_task_id="demo-task-101",
                orthophoto_path=f"static/processed/project_{proj_id}/orthophoto.tif",
                point_cloud_path=ply_rel_path,
                dsm_path=f"static/processed/project_{proj_id}/dsm.tif",
                dtm_path=f"static/processed/project_{proj_id}/dtm.tif",
                report_path=f"static/processed/project_{proj_id}/report.pdf"
            )
            db.add(ortho)
        else:
            ortho.point_cloud_path = ply_rel_path
            
        # 4. Ensure raw images exist in project
        img_count = db.query(models.DroneImage).filter(models.DroneImage.project_id == proj_id).count()
        if img_count < 2:
            img1 = models.DroneImage(
                project_id=proj_id,
                filename="Phase_1_Pre_Construction.jpg",
                filepath="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Aerial_view_of_Morro_Bay%2C_California_-_May_2013.jpg/1280px-Aerial_view_of_Morro_Bay%2C_California_-_May_2013.jpg",
                filesize=1024 * 500,
                latitude=demo_proj.latitude,
                longitude=demo_proj.longitude
            )
            img2 = models.DroneImage(
                project_id=proj_id,
                filename="Phase_2_Post_Construction.jpg",
                filepath="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Aerial_photograph_of_a_solar_farm.jpg/1280px-Aerial_photograph_of_a_solar_farm.jpg",
                filesize=1024 * 600,
                latitude=demo_proj.latitude + 0.001,
                longitude=demo_proj.longitude + 0.001
            )
            db.add_all([img1, img2])

        db.commit()
        print(f"[DEMO] Demo project #{proj_id} setup complete!")
    except Exception as e:
        print(f"[DEMO] Error setting up demo project: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_data()
