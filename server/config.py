import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Eagle - Infra India Ltd | Drone Monitoring"
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:dronepassword_secure_99@db:5432/drone_monitoring"
    )

    TILES_DIR: str = "/var/www/tiles"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
