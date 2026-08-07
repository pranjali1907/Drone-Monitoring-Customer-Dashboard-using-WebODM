# SkyeView - Cloud-Based Drone Monitoring & Customer Dashboard

SkyeView is a production-ready, cloud-hosted Drone Survey Management Platform that integrates WebODM photogrammetry processing with a premium client-facing dashboard. Survey administrators can upload raw drone photos, execute WebODM runs, upload flight logs/videos/reports, and securely share processed orthorectified maps and 3D textured mesh layouts with clients. 

Clients can log in securely from any web browser, inspect orthophoto layers, calculate distances and polygon areas, drag split progress comparison sliders, view galleries, play drone video logs, and download reports.

---

## Key Features

1. **Role-Based Auth (RBAC)**: JWT authentication separating survey administrators and client roles.
2. **Interactive GIS Map**: Powered by Leaflet, displaying:
   - Dynamic satellite base layer switching.
   - Project boundaries outline.
   - High-fidelity orthophoto overlays with adjustable opacity sliders.
   - Drawing tools for calculating distance (meters) and polygon areas (square meters).
3. **Before/After Split Comparison**: A dragging slider widget to inspect site transformations between survey dates.
4. **WebGL 3D Core**: A Three.js interactive visualizer simulating textured digital terrain meshes and colored point clouds.
5. **WebODM API Integrator**: Code hooks to connect to a WebODM server API for automated task queuing and asset downloads, featuring an offline mock emulator for immediate runs.
6. **Multi-Asset Uploads**: Drag and drop uploader for large TIFF/JPEG map coordinates, flight logs, MP4 videos, and PDF reports.
7. **Audit Logging**: Backend logging tracker mapping user logins, pipeline runs, and client registrations.

---

## Project Structure

```text
├── client/                 # React + TS + Vite + MUI Frontend app
│   ├── src/
│   │   ├── components/     # MapView, 3DViewer, ComparisonSlider, UploadManager
│   │   ├── context/        # JWT AuthContext
│   │   ├── pages/          # Login, Dashboard, Projects, CreateProject, Settings
│   │   ├── theme.ts        # Premium dark glassmorphic styling theme
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── server/                 # FastAPI REST API Backend app
│   ├── routers/            # Auth, Projects, Uploads, WebODM Jobs API endpoints
│   ├── config.py           # Environment configurations
│   ├── database.py         # SQLAlchemy engine session connectors
│   ├── models.py           # Table maps (PostgreSQL PostGIS / SQLite fallbacks)
│   ├── schemas.py          # Pydantic input validators
│   ├── webodm.py           # WebODM API requester client and simulator
│   └── main.py             # Entrypoint & static asset mounts
├── database/
│   └── schema.sql          # Core PostgreSQL/PostGIS DDL schema
├── docker/
│   ├── Dockerfile.backend  # FastAPI container builder
│   ├── Dockerfile.frontend # Multi-stage Nginx bundle builder
│   ├── nginx.conf          # Nginx reverse proxy configuration
│   └── docker-compose.yml  # DB, WebODM, API, and Web server orchestra
└── README.md
```

---

## Database DDL Schema

The database relies on **PostgreSQL + PostGIS** for geographic coordinates and geometry tracking. If run locally, it features a seamless SQLite fallback mapping geographic objects as JSON:

- **users**: Accounts auth profile data.
- **projects**: Survey coordinates center, date, status.
- **drone_images**: Raw geotagged photographs, GPS coordinates, altitude.
- **videos**: Flight path telemetry video records.
- **orthophotos**: WebODM task assets outputs paths (DSM, DTM, LAZ point clouds, OBJ meshes).
- **reports**: PDF/Excel downloads.
- **processing_jobs**: WebODM task UUID state trackers (progress, console outputs logs).
- **measurements**: Saved user metrics drawings (lines, polygons, calculations values).
- **client_assignments**: Project mapping controls granting visibility permissions to clients.
- **activity_logs**: User audit trails.

---

## Local Development Quickstart (SQLite Fallback)

To run the application immediately on your local machine without needing a PostgreSQL database or active WebODM cluster, SkyeView uses a built-in mock/sqlite mode:

### 1. Start the Backend API
1. Ensure Python 3.10+ is installed.
2. Navigate to the `server` directory:
   ```bash
   cd server
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Seed mock files and start the server:
   ```bash
   python create_mock_assets.py
   uvicorn main:app --reload --port 8000
   ```
   *The server runs at [http://localhost:8000](http://localhost:8000). Access swagger docs at `/docs`.*

### 2. Start the React Frontend
1. Ensure Node.js 18+ is installed.
2. Navigate to the `client` directory:
   ```bash
   cd ../client
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the Vite bundler:
   ```bash
   npm run dev
   ```
   *The client dashboard opens at [http://localhost:5173](http://localhost:5173).*

---

## Sandboxed Demo Accounts

On initial start, the database is automatically seeded with default credentials for quick testing:

| Account Type | Email | Password |
|---|---|---|
| **Super Administrator** | `admin@dronemonitor.com` | `admin123` |
| **Survey Client** | `client@dronemonitor.com` | `client123` |

---

## Docker Production Deployment

To package SkyeView into container services running PostgreSQL with PostGIS extensions and an automated Nginx reverse proxy, run:

1. Make sure Docker and Docker Compose are installed and running.
2. Navigate to the `docker` directory:
   ```bash
   cd docker
   ```
3. Build and launch all services:
   ```bash
   docker-compose up --build
   ```
4. The Nginx reverse proxy will bind to port **80**. Open your browser and navigate to `http://localhost`. All `/api` and `/static` requests will automatically route to the background FastAPI container, and the React client will serve compiled files instantly.

---

## Step-by-Step Testing Walkthrough

1. **Admin Entrance**: Open `http://localhost:5173/login`, click the **Super Admin** quick-fill button, and sign in.
2. **Dashboard Overview**: Access the control panel displaying stats (Storage, Active jobs, project tables, log trails).
3. **Client Setup**: Navigate to **Settings**, complete the "Register New Client" form to create a custom customer login.
4. **Create Project**: Click **Create Project**, input survey details, click on the Leaflet map to select coordinates, and hit Save.
5. **Simulated WebODM pipeline**: Open your new project from the list, select the **Admin Pipeline** tab, drag-and-drop some JPG files, hit **Upload**, and then click **Trigger WebODM Pipeline**.
6. **Live Progress**: You can observe the console progress and logs update in the background. The task status bar at the bottom of the sidebar updates in real-time.
7. **Client View**: Log out, and sign in using your registered Client credentials (or click **Survey Client** quick-fill).
8. **Measurements**: Open the assigned project workspace, select **2D Orthomap**, toggle **Distance/Area** drawing tools, click paths on the map to draw, and click **Save** to sync measurements to the cloud.
9. **Timeline Comparison**: Select **Comparison Timeline** and drag the horizontal splitter to compare before-construction soil layers with the finished solar panel grids.
10. **WebGL 3D**: Open **3D Mesh Model** to pan, orbit, and zoom in on the WebGL points array.
11. **Reports Deliverables**: Access the **Downloads** tab to download DSM/DTM GeoTIFF maps, OBJ meshes, and PDF reports.
