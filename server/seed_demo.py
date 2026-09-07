"""Seed exactly one admin user on first startup."""
from server.database import SessionLocal
from server.models import User
from server import auth as auth_module


def seed_admin():
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "admin@dronemonitor.com").first()
        if not existing:
            admin = User(
                email="admin@dronemonitor.com",
                full_name="Super Administrator",
                role="admin",
                hashed_password=auth_module.get_password_hash("admin123"),
            )
            db.add(admin)
            db.commit()
            print("[SEED] Admin user created: admin@dronemonitor.com / admin123")
        else:
            print("[SEED] Admin user already exists.")
    except Exception as e:
        print(f"[SEED] Error: {e}")
    finally:
        db.close()
