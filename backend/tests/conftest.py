"""Fixtures de test para el backend de Paufer.

Requiere una base de datos PostgreSQL de test (los modelos usan tipos propios de
Postgres: UUID, ARRAY). La URL se toma de TEST_DATABASE_URL; por defecto apunta a
una base `paufer_test` en el Postgres local. NUNCA apuntes esto a la base de dev
o prod: el esquema se crea y se borra entero.

Patrón de aislamiento: cada test corre dentro de una transacción con savepoint
que se revierte al terminar, así los `db.commit()` de los endpoints no ensucian
la base entre tests.
"""
import os

# Config mínima ANTES de importar la app (settings se evalúa en el import).
os.environ.setdefault(
    "TEST_DATABASE_URL",
    "postgresql://paufer:changeme@localhost:5432/paufer_test",
)
# Asignación dura: los tests deben ganar aunque el entorno (contenedor de dev)
# ya traiga estas variables definidas.
os.environ["DATABASE_URL"] = os.environ["TEST_DATABASE_URL"]
os.environ["APP_DATABASE_URL"] = ""  # dev: usa DATABASE_URL, sin RLS
os.environ["SECRET_KEY"] = "test-secret-key-de-32-bytes-o-mas-larga"
os.environ["ENVIRONMENT"] = "development"
os.environ["BOOTSTRAP_SECRET"] = "test-bootstrap-secret"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

import app.models  # noqa: F401 — registra todos los modelos en Base.metadata
from app.auth import create_access_token, hash_password
from app.database import get_db
from app.main import app
from app.models.base import Base
from app.models.centro import Centro
from app.models.usuario import Usuario
from app.ratelimit import limiter

# El rate limiter usa almacenamiento en memoria por IP; en tests todas las
# peticiones vienen de la misma IP y darían 429 falsos. Se desactiva.
limiter.enabled = False

engine = create_engine(os.environ["TEST_DATABASE_URL"])


@pytest.fixture(scope="session", autouse=True)
def _schema():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db(_schema):
    """Sesión aislada por test: savepoint que se revierte al final."""
    connection = engine.connect()
    trans = connection.begin()
    Session = sessionmaker(bind=connection, autoflush=False)
    session = Session()
    session.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def _restart_savepoint(sess, transaction):
        if transaction.nested and not transaction._parent.nested:
            sess.begin_nested()

    try:
        yield session
    finally:
        session.close()
        trans.rollback()
        connection.close()


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ── Helpers de datos ─────────────────────────────────────────────────────────

def _crear_centro(db, slug: str, activo: bool = True) -> Centro:
    centro = Centro(nombre=slug.upper(), slug=slug, activo=activo)
    db.add(centro)
    db.flush()
    return centro


def _crear_usuario(db, email, password, rol, centro_id=None) -> Usuario:
    user = Usuario(
        email=email,
        hashed_password=hash_password(password),
        nombre="Test",
        apellidos="User",
        rol=rol,
        centro_id=centro_id,
        activo=True,
    )
    db.add(user)
    db.flush()
    return user


def _auth_header(user: Usuario) -> dict:
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def make_centro(db):
    return lambda slug, activo=True: _crear_centro(db, slug, activo)


@pytest.fixture
def make_usuario(db):
    return lambda email, password, rol, centro_id=None: _crear_usuario(
        db, email, password, rol, centro_id
    )


@pytest.fixture
def auth_header():
    return _auth_header
