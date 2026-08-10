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

        # 2. Find and delete the Demo Project to remove it from display
        demo_projs = db.query(models.Project).filter(
            (models.Project.name.like("%Eagle Highway%")) | (models.Project.name.like("%Solapur (Demo)%"))
        ).all()
        for demo_p in demo_projs:
            db.delete(demo_p)
            print(f"[DEMO] Removed Solapur demo project ID: {demo_p.id}")
        db.commit()
    except Exception as e:
        print(f"[DEMO] Error removing demo project / seeding admin: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_data()
