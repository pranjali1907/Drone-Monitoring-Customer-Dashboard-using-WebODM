import os
import subprocess
from server.database import SessionLocal
from server.models import ProjectLayer

def process_raster_background(layer_id: int, input_file: str, project_id: int):
    # This runs in a background task
    db = SessionLocal()
    layer = db.query(ProjectLayer).filter(ProjectLayer.id == layer_id).first()
    if not layer:
        db.close()
        return

    try:
        layer.status = "PROCESSING"
        db.commit()

        # Generate paths
        output_dir = f"/app/server/static/projects/{project_id}/tiles"
        os.makedirs(output_dir, exist_ok=True)
        
        warped_file = f"/app/server/static/projects/{project_id}/warped_{layer_id}.tif"

        # 1. Reproject to Web Mercator (EPSG:3857)
        # Assuming the input might not be 3857. gdalwarp will detect source automatically if embedded.
        warp_cmd = [
            "gdalwarp",
            "-t_srs", "EPSG:3857",
            "-r", "bilinear",
            "-co", "COMPRESS=DEFLATE",
            "-co", "TILED=YES",
            input_file,
            warped_file
        ]
        subprocess.run(warp_cmd, check=True)

        # 2. Generate tiles (Zoom 14-21)
        # Using gdal2tiles.py
        tiles_cmd = [
            "gdal2tiles.py",
            "-z", "14-21",
            "-w", "leaflet",
            warped_file,
            output_dir
        ]
        subprocess.run(tiles_cmd, check=True)

        # Success
        layer.status = "READY"
        db.commit()

        # Clean up intermediate warped file
        if os.path.exists(warped_file):
            os.remove(warped_file)

    except Exception as e:
        print(f"Error processing raster: {e}")
        layer.status = "FAILED"
        db.commit()
    finally:
        db.close()
