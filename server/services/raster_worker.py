import os
import json
import subprocess
import logging

from server.database import SessionLocal
from server.models import ProjectLayer, Project
from server.services.drive_loader import stream_drive_file

logger = logging.getLogger(__name__)


def process_raster_layer(layer_id: int) -> None:
    """
    Background task:
      1. Download raw raster (.ecw / .tif) from Google Drive.
      2. Reproject to EPSG:3857 via gdalwarp.
      3. Auto-extract exact GPS centroid & boundary extent, updating parent Project.
      4. Generate high-resolution web preview JPEG for Before/After comparison.
      5. Generate XYZ pyramid tiles via gdal2tiles.py.
      6. Update ProjectLayer status to READY.
    """
    db = SessionLocal()
    try:
        layer: ProjectLayer = db.query(ProjectLayer).filter(ProjectLayer.id == layer_id).first()
        if not layer:
            logger.error(f"[RASTER] Layer {layer_id} not found.")
            return

        # ── Mark as PROCESSING ────────────────────────────────────────────
        layer.status = "PROCESSING"
        db.commit()

        tiles_dir = f"/var/www/tiles/{layer_id}"
        os.makedirs(tiles_dir, exist_ok=True)

        raw_path    = f"/tmp/raw_{layer_id}"
        warped_path = f"/tmp/warped_{layer_id}.tif"

        # ── Step 1: Download from Google Drive ────────────────────────────
        logger.info(f"[RASTER] Downloading drive file {layer.drive_file_id} ...")
        stream_drive_file(layer.drive_file_id, raw_path)
        logger.info(f"[RASTER] Download complete: {raw_path}")

        # ── Step 2: Reproject to EPSG:3857 ───────────────────────────────
        warp_cmd = [
            "gdalwarp",
            "-t_srs", "EPSG:3857",
            "-r", "bilinear",
            "-co", "COMPRESS=LZW",
            "-co", "TILED=YES",
            "-of", "GTiff",
            raw_path,
            warped_path,
        ]
        logger.info(f"[RASTER] Running gdalwarp ...")
        result = subprocess.run(warp_cmd, capture_output=True, text=True, timeout=3600)
        if result.returncode != 0:
            raise RuntimeError(f"gdalwarp failed: {result.stderr}")
        logger.info(f"[RASTER] gdalwarp complete: {warped_path}")

        # ── Step 3: Auto-extract GPS Coordinates & Extent from Raster ─────
        try:
            info_res = subprocess.run(["gdalinfo", "-json", warped_path], capture_output=True, text=True, timeout=60)
            if info_res.returncode == 0:
                meta = json.loads(info_res.stdout)
                wgs84 = meta.get("wgs84Extent", {})
                coords = wgs84.get("coordinates", [[]])[0]
                if coords and len(coords) >= 4:
                    avg_lon = sum(c[0] for c in coords) / len(coords)
                    avg_lat = sum(c[1] for c in coords) / len(coords)
                    proj = db.query(Project).filter(Project.id == layer.project_id).first()
                    if proj:
                        proj.latitude = round(avg_lat, 6)
                        proj.longitude = round(avg_lon, 6)
                        proj.boundary_wkt = json.dumps(wgs84)
                        db.commit()
                        logger.info(f"[RASTER] Auto-detected GPS coordinates: {avg_lat}, {avg_lon} for Project #{proj.id}")
        except Exception as err:
            logger.warning(f"[RASTER] Failed to extract coordinates: {err}")

        # ── Step 4: Generate High-Res Preview Image for Before/After ───────
        preview_path = os.path.join(tiles_dir, "preview.jpg")
        try:
            subprocess.run([
                "gdal_translate",
                "-of", "JPEG",
                "-outsize", "1920", "0",
                warped_path,
                preview_path
            ], capture_output=True, timeout=120)
            logger.info(f"[RASTER] Generated preview snapshot at {preview_path}")
        except Exception as err:
            logger.warning(f"[RASTER] Could not generate preview image: {err}")

        # ── Step 5: Generate XYZ tiles ────────────────────────────────────
        tile_cmd = [
            "gdal2tiles.py",
            "--zoom=14-21",
            "--processes=4",
            "--xyz",
            "--webviewer=none",
            warped_path,
            tiles_dir,
        ]
        logger.info(f"[RASTER] Running gdal2tiles.py ...")
        result = subprocess.run(tile_cmd, capture_output=True, text=True, timeout=7200)
        if result.returncode != 0:
            raise RuntimeError(f"gdal2tiles failed: {result.stderr}")
        logger.info(f"[RASTER] Tiles generated at {tiles_dir}")

        # ── Step 6: Mark READY ────────────────────────────────────────────
        layer.status = "READY"
        layer.tile_url_pattern = f"/tiles/{layer_id}/{{z}}/{{x}}/{{y}}.png"
        db.commit()
        logger.info(f"[RASTER] Layer {layer_id} is READY.")

    except Exception as exc:
        logger.exception(f"[RASTER] Layer {layer_id} FAILED: {exc}")
        try:
            db.query(ProjectLayer).filter(ProjectLayer.id == layer_id).update(
                {"status": "FAILED", "error_message": str(exc)[:500]}
            )
            db.commit()
        except Exception:
            pass
    finally:
        # Cleanup temp files
        for path in [raw_path if 'raw_path' in dir() else None,
                     warped_path if 'warped_path' in dir() else None]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass
        db.close()
