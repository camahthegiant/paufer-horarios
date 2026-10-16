from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from app.config import settings

engine = create_engine(settings.effective_database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        try:
            # Limpia app.centro_id antes de devolver la conexión al pool.
            # Evita que la siguiente petición herede el contexto de tenant de esta.
            db.execute(text("SET app.centro_id = ''"))
            db.commit()
        except Exception:
            pass
        db.close()
