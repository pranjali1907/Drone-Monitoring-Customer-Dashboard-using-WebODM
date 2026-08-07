import os
import shutil

def create_mock_files():
    print("[MOCK SEEDER] Generating mock static assets for SkyeView...")
    
    # Target folders
    processed_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "processed", "project_1"))
    uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "uploads", "project_1"))
    reports_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "reports", "project_1"))
    
    os.makedirs(processed_dir, exist_ok=True)
    os.makedirs(uploads_dir, exist_ok=True)
    os.makedirs(reports_dir, exist_ok=True)

    # 1. Write mock photogrammetry download layers
    assets = {
        "orthophoto.tif": "Mock GeoTIFF Orthophoto raster bands description.",
        "dsm.tif": "Mock Digital Surface Model raster elevation grids.",
        "dtm.tif": "Mock Digital Terrain Model raster bare earth grids.",
        "point_cloud.laz": "Mock LASer binary compressed LiDAR point cloud structure.",
        "model_3d.obj": "Mock Wavefront OBJ 3D mesh model vertices coordinates.",
        "report.pdf": "Mock WebODM Quality analysis PDF document data."
    }

    for filename, content in assets.items():
        filepath = os.path.join(processed_dir, filename)
        if not os.path.exists(filepath):
            with open(filepath, "w") as f:
                f.write(content)
            print(f"Created file: {filename}")

    # 2. Write mock reports
    pdf_report_path = os.path.join(reports_dir, "Solar_Farm_Survey_Q2_Report.pdf")
    if not os.path.exists(pdf_report_path):
        with open(pdf_report_path, "w") as f:
            f.write("SkyeView Engineering Survey report for Project Solar Farm Survey A.")
        print("Created file: Solar_Farm_Survey_Q2_Report.pdf")

    # 3. Create a mock drone video file
    video_path = os.path.join(uploads_dir, "survey_flight.mp4")
    if not os.path.exists(video_path):
        # We can use a tiny valid MP4 header byte representation, or just a small mockup file
        # A tiny valid MP4 byte array is best so standard video players don't crash and show loading/ended gracefully.
        # However, a small text/dummy file works as a placeholder, but copying a tiny sample is better.
        # Since we don't have one, let's write a dummy video stream file.
        with open(video_path, "wb") as f:
            f.write(b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom\x00\x00\x00\x08free")
        print("Created dummy drone video file: survey_flight.mp4")

    # 4. Copy some mock raw images to show in gallery
    for i in range(1, 5):
        img_name = f"survey_capture_00{i}.jpg"
        img_path = os.path.join(uploads_dir, img_name)
        if not os.path.exists(img_path):
            # Copy our beautiful generated orthophoto as a placeholder for raw gallery files
            src_img = os.path.join(processed_dir, "orthophoto.png")
            if os.path.exists(src_img):
                shutil.copy(src_img, img_path)
                print(f"Copied image {img_name} to raw uploads gallery")
            else:
                with open(img_path, "w") as f:
                    f.write("Mock Image Content")

    print("[MOCK SEEDER] Finished generating mock static assets.")

if __name__ == "__main__":
    create_mock_files()
