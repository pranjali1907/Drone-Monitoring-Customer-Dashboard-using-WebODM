import os
import time
import requests
import shutil
import random
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from server.config import settings
import server.models as models

class WebODMClient:
    def __init__(self):
        self.url = settings.WEBODM_URL
        self.username = settings.WEBODM_USERNAME
        self.password = settings.WEBODM_PASSWORD
        self.mock_mode = settings.WEBODM_MOCK_MODE
        self._token = None

    def _get_token(self) -> str:
        if self.mock_mode:
            return "mock-token"
        
        if self._token:
            return self._token
            
        try:
            response = requests.post(
                f"{self.url}/api/token-auth/",
                json={"username": self.username, "password": self.password},
                timeout=10
            )
            response.raise_for_status()
            self._token = response.json().get("token")
            return self._token
        except Exception as e:
            print(f"Error authenticating with WebODM: {e}")
            raise Exception("Failed to connect to WebODM server API")

    def _headers(self):
        return {"Authorization": f"JWT {self._get_token()}"}

    def create_project(self, name: str, description: str = "") -> str:
        """Creates a project in WebODM and returns the ID."""
        if self.mock_mode:
            mock_id = str(random.randint(100, 999))
            print(f"[MOCK] Created WebODM project: {name} (ID: {mock_id})")
            return mock_id

        try:
            response = requests.post(
                f"{self.url}/api/projects/",
                headers=self._headers(),
                json={"name": name, "description": description},
                timeout=10
            )
            response.raise_for_status()
            return str(response.json().get("id"))
        except Exception as e:
            print(f"Error creating WebODM project: {e}")
            raise Exception("WebODM Project creation failed")

    def create_task(self, project_id: str, options: List[Dict] = None) -> str:
        """Creates a processing task for a project and returns the task ID."""
        if self.mock_mode:
            mock_task_id = f"task-{random.randint(1000, 9999)}"
            print(f"[MOCK] Created WebODM task for project {project_id} (ID: {mock_task_id})")
            return mock_task_id

        try:
            # Default options if not provided
            if not options:
                options = [{"name": "dsm", "value": "true"}, {"name": "dtm", "value": "true"}]
                
            response = requests.post(
                f"{self.url}/api/projects/{project_id}/tasks/",
                headers=self._headers(),
                json={"options": options},
                timeout=15
            )
            response.raise_for_status()
            return response.json().get("uuid")
        except Exception as e:
            print(f"Error creating WebODM task: {e}")
            raise Exception("WebODM Task creation failed")

    def upload_images(self, project_id: str, task_uuid: str, file_paths: List[str]) -> bool:
        """Uploads drone images to a WebODM task."""
        if self.mock_mode:
            print(f"[MOCK] Uploaded {len(file_paths)} images to task {task_uuid}")
            return True

        try:
            # WebODM expects multipart file uploads
            files = []
            opened_files = []
            for path in file_paths:
                f = open(path, "rb")
                opened_files.append(f)
                files.append(("images", (os.path.basename(path), f, "image/jpeg")))
                
            response = requests.post(
                f"{self.url}/api/projects/{project_id}/tasks/{task_uuid}/upload/",
                headers=self._headers(),
                files=files,
                timeout=120
            )
            
            # Ensure we close all files
            for f in opened_files:
                f.close()
                
            response.raise_for_status()
            return True
        except Exception as e:
            print(f"Error uploading files to WebODM task: {e}")
            raise Exception("WebODM Image upload failed")

    def start_processing(self, project_id: str, task_uuid: str) -> bool:
        """Starts the WebODM task processing."""
        if self.mock_mode:
            print(f"[MOCK] Started WebODM task processing for {task_uuid}")
            return True

        try:
            response = requests.post(
                f"{self.url}/api/projects/{project_id}/tasks/{task_uuid}/processing/",
                headers=self._headers(),
                timeout=15
            )
            response.raise_for_status()
            return True
        except Exception as e:
            print(f"Error starting processing for task: {e}")
            raise Exception("WebODM Task execution start failed")

    def get_task_status(self, project_id: str, task_uuid: str) -> Dict:
        """Retrieves processing status and progress."""
        if self.mock_mode:
            # This is handled separately by the background thread simulator
            return {"status": "running", "progress": 50, "logs": "Processing simulated imagery..."}

        try:
            response = requests.get(
                f"{self.url}/api/projects/{project_id}/tasks/{task_uuid}/",
                headers=self._headers(),
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            # Map WebODM state integers/strings to standard terms
            status_map = {
                1: "queued",
                2: "running",
                3: "completed",
                4: "failed",
                5: "canceled"
            }
            raw_status = data.get("status", {}).get("code", 2)
            progress = data.get("progress", 0.0)
            
            return {
                "status": status_map.get(raw_status, "running"),
                "progress": progress,
                "logs": data.get("console_output", "")
            }
        except Exception as e:
            print(f"Error getting task status: {e}")
            return {"status": "failed", "progress": 0.0, "logs": f"Connection error: {e}"}

    def download_assets(self, project_id: str, task_uuid: str, output_dir: str) -> Dict[str, str]:
        """Downloads standard orthophoto and 3D outputs to server assets directory."""
        os.makedirs(output_dir, exist_ok=True)
        
        assets = {
            "orthophoto": "orthophoto.tif",
            "dsm": "dsm.tif",
            "dtm": "dtm.tif",
            "point_cloud": "point_cloud.laz",
            "model_3d": "model_3d.obj",
            "report": "report.pdf"
        }
        
        downloaded_paths = {}

        if self.mock_mode:
            # Copy sample files or write blank files with correct names to simulate outputs
            for key, filename in assets.items():
                dest_path = os.path.join(output_dir, filename)
                with open(dest_path, "w") as f:
                    f.write(f"Simulated WebODM output for {key}\n")
                downloaded_paths[key] = dest_path
            print(f"[MOCK] Simulated assets written to {output_dir}")
            return downloaded_paths

        # If live WebODM, download actual files from task assets
        for key, filename in assets.items():
            url_map = {
                "orthophoto": f"{self.url}/api/projects/{project_id}/tasks/{task_uuid}/download/orthophoto.tif",
                "dsm": f"{self.url}/api/projects/{project_id}/tasks/{task_uuid}/download/dsm.tif",
                "dtm": f"{self.url}/api/projects/{project_id}/tasks/{task_uuid}/download/dtm.tif",
                "point_cloud": f"{self.url}/api/projects/{project_id}/tasks/{task_uuid}/download/point_cloud.laz",
                "model_3d": f"{self.url}/api/projects/{project_id}/tasks/{task_uuid}/download/model_3d.obj",
                "report": f"{self.url}/api/projects/{project_id}/tasks/{task_uuid}/download/report.pdf"
            }
            
            try:
                asset_url = url_map.get(key)
                if not asset_url:
                    continue
                    
                response = requests.get(asset_url, headers=self._headers(), stream=True, timeout=30)
                if response.status_code == 200:
                    dest_path = os.path.join(output_dir, filename)
                    with open(dest_path, 'wb') as out_file:
                        shutil.copyfileobj(response.raw, out_file)
                    downloaded_paths[key] = dest_path
            except Exception as e:
                print(f"Error downloading asset {key} from WebODM: {e}")
                
        return downloaded_paths

webodm_client = WebODMClient()

# Background Processing Simulator for Offline/Mock usage
def run_simulated_processing(project_id: int, job_id: int, db_session_maker):
    """Background task to simulate WebODM processing step-by-step."""
    print(f"[SIMULATOR] Starting WebODM processing simulation for Project {project_id}, Job {job_id}")
    steps = [
        (10.0, "Initializing imagery dataset alignment..."),
        (25.0, "Extracting feature keypoints and matching descriptors..."),
        (45.0, "Executing structure from motion bundle adjustment..."),
        (65.0, "Generating dense multi-view stereo point cloud..."),
        (80.0, "Constructing mesh surface geometry and textures..."),
        (95.0, "Orthorectifying imagery layers and exporting DSM/DTM..."),
        (100.0, "Task processing completed successfully. Exporting products.")
    ]
    
    for progress, logs in steps:
        time.sleep(1.0)  # Smooth fast background simulation
        db = db_session_maker()
        try:
            job = db.query(models.ProcessingJob).filter(models.ProcessingJob.id == job_id).first()
            if not job or job.status in ["failed", "canceled"]:
                break
                
            job.progress = progress
            job.logs = (job.logs or "") + f"\n[{datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}] {logs}"
            
            if progress >= 100.0:
                job.status = "completed"
                job.completed_at = datetime.datetime.utcnow()
                
                # Update Project status
                proj = db.query(models.Project).filter(models.Project.id == project_id).first()
                if proj:
                    proj.status = "completed"
                    proj.completion_date = datetime.date.today()
                
                # Write simulated orthophoto assets
                out_dir = os.path.join(settings.PROCESSED_DIR, f"project_{project_id}")
                os.makedirs(out_dir, exist_ok=True)
                
                # Create actual placeholder files
                webodm_client.download_assets(str(project_id), job.webodm_task_id, out_dir)
                
                # Insert Orthophoto record
                orthophoto = models.Orthophoto(
                    project_id=project_id,
                    webodm_task_id=job.webodm_task_id,
                    orthophoto_path=f"static/processed/project_{project_id}/orthophoto.tif",
                    dsm_path=f"static/processed/project_{project_id}/dsm.tif",
                    dtm_path=f"static/processed/project_{project_id}/dtm.tif",
                    point_cloud_path=f"static/processed/project_{project_id}/point_cloud.laz",
                    model_3d_path=f"static/processed/project_{project_id}/model_3d.obj",
                    report_path=f"static/processed/project_{project_id}/report.pdf"
                )
                db.add(orthophoto)
                
                # Insert Report record
                report = models.Report(
                    project_id=project_id,
                    title="WebODM Quality Report",
                    report_type="webodm",
                    filepath=f"static/processed/project_{project_id}/report.pdf"
                )
                db.add(report)
                
                print(f"[SIMULATOR] Processing complete for Project {project_id}. Outputs saved.")
            
            db.commit()
        except Exception as e:
            print(f"[SIMULATOR] Error during simulated processing: {e}")
            db.rollback()
        finally:
            db.close()
