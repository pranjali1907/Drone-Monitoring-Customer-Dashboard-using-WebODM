import os
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "Drone Monitoring Platform"
    
    # Security
    SECRET_KEY: str = Field("09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7", env="SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Database
    # Standard SQLite fallback is supported to make local runs easier
    DATABASE_URL: str = Field("sqlite:///./drone_monitor.db", env="DATABASE_URL")
    
    # WebODM
    WEBODM_URL: str = Field("http://localhost:8000", env="WEBODM_URL")
    WEBODM_USERNAME: str = Field("admin", env="WEBODM_USERNAME")
    WEBODM_PASSWORD: str = Field("admin", env="WEBODM_PASSWORD")
    WEBODM_MOCK_MODE: bool = Field(True, env="WEBODM_MOCK_MODE")  # Default to true to enable out-of-the-box local runs

    # Storage Paths (inside workspace)
    UPLOAD_DIR: str = "uploads"
    PROCESSED_DIR: str = "processed"
    REPORTS_DIR: str = "reports"

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.PROCESSED_DIR, exist_ok=True)
os.makedirs(settings.REPORTS_DIR, exist_ok=True)
