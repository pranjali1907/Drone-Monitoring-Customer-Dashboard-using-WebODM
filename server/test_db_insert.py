from server.database import SessionLocal
import server.models as models

db = SessionLocal()
try:
    img = models.DroneImage(
        project_id=4,
        filename='test_debug.jpg',
        filepath='static/uploads/project_4/test_debug.jpg',
        filesize=100
    )
    db.add(img)
    db.commit()
    print("SUCCESS INSERT ID:", img.id)
except Exception as e:
    print("ERROR TRACEBACK:", e)
    import traceback
    traceback.print_exc()
finally:
    db.close()
