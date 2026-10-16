"""
Seed de demostración con un centro inventado ("Centro Ejemplo").

Crea:
  - Centro: centro-ejemplo
  - 19 grupos (Infantil + Primaria)
  - 9 periodos (09:00–14:00 con recreo, más reuniones y formación)
  - Usuario coordinador de ejemplo: coordinador@example.com

Ejecutar desde backend/:
  DATABASE_URL=... python scripts/seed_demo.py [--password <pass>]
"""
import sys
import os
import argparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("SECRET_KEY", "seed-secret")
os.environ.setdefault("ENVIRONMENT", "development")

from datetime import time, date
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.models.base import Base
from app.models.centro import Centro
from app.models.grupo import Grupo, Etapa
from app.models.periodo import Periodo
from app.models.usuario import Usuario, RolUsuario
from app.models.horario import CursoEscolar, Horario, EstadoHorario
from app.auth import hash_password


DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("Error: variable de entorno DATABASE_URL no definida")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

GRUPOS = [
    # Infantil
    {"nombre": "INF 2", "etapa": Etapa.INFANTIL, "nivel": 0},
    {"nombre": "INF 3A", "etapa": Etapa.INFANTIL, "nivel": 3},
    {"nombre": "INF 3B", "etapa": Etapa.INFANTIL, "nivel": 3},
    {"nombre": "INF 4A", "etapa": Etapa.INFANTIL, "nivel": 4},
    {"nombre": "INF 4B", "etapa": Etapa.INFANTIL, "nivel": 4},
    {"nombre": "INF 5A", "etapa": Etapa.INFANTIL, "nivel": 5},
    {"nombre": "INF 5B", "etapa": Etapa.INFANTIL, "nivel": 5},
    # Primaria
    {"nombre": "1ºA", "etapa": Etapa.PRIMARIA, "nivel": 1},
    {"nombre": "1ºB", "etapa": Etapa.PRIMARIA, "nivel": 1},
    {"nombre": "2ºA", "etapa": Etapa.PRIMARIA, "nivel": 2},
    {"nombre": "2ºB", "etapa": Etapa.PRIMARIA, "nivel": 2},
    {"nombre": "3ºA", "etapa": Etapa.PRIMARIA, "nivel": 3},
    {"nombre": "3ºB", "etapa": Etapa.PRIMARIA, "nivel": 3},
    {"nombre": "4ºA", "etapa": Etapa.PRIMARIA, "nivel": 4},
    {"nombre": "4ºB", "etapa": Etapa.PRIMARIA, "nivel": 4},
    {"nombre": "5ºA", "etapa": Etapa.PRIMARIA, "nivel": 5},
    {"nombre": "5ºB", "etapa": Etapa.PRIMARIA, "nivel": 5},
    {"nombre": "6ºA", "etapa": Etapa.PRIMARIA, "nivel": 6},
    {"nombre": "6ºB", "etapa": Etapa.PRIMARIA, "nivel": 6},
]

# 6 periodos de 45 min, 09:00-14:00
# Con recreo entre el 2º y 3º periodo (10:30-11:00)
PERIODOS = [
    {"nombre": "1ª hora", "hora_inicio": time(9, 0),  "hora_fin": time(9, 45),  "orden": 1},
    {"nombre": "2ª hora", "hora_inicio": time(9, 45),  "hora_fin": time(10, 30), "orden": 2},
    {"nombre": "Recreo",  "hora_inicio": time(10, 30), "hora_fin": time(11, 0),  "orden": 3, "es_lectivo": False},
    {"nombre": "3ª hora", "hora_inicio": time(11, 0),  "hora_fin": time(11, 45), "orden": 4},
    {"nombre": "4ª hora", "hora_inicio": time(11, 45), "hora_fin": time(12, 30), "orden": 5},
    {"nombre": "5ª hora", "hora_inicio": time(12, 30), "hora_fin": time(13, 15), "orden": 6},
    {"nombre": "6ª hora",   "hora_inicio": time(13, 15), "hora_fin": time(14, 0),  "orden": 7},
    {"nombre": "Reuniones", "hora_inicio": time(14, 0),  "hora_fin": time(15, 0),  "orden": 8, "es_lectivo": False},
    {"nombre": "Formación", "hora_inicio": time(15, 0),  "hora_fin": time(17, 0),  "orden": 9, "es_lectivo": False},
]


def seed(password: str) -> None:
    with Session(engine) as db:
        # Centro
        centro = db.query(Centro).filter(Centro.slug == "centro-ejemplo").first()
        if not centro:
            centro = Centro(
                nombre="Centro Ejemplo",
                slug="centro-ejemplo",
                activo=True,
            )
            db.add(centro)
            db.flush()
            print(f"✓ Centro creado: {centro.nombre}")
        else:
            print(f"· Centro ya existe: {centro.nombre}")

        # Grupos
        grupos_creados = 0
        for g in GRUPOS:
            existe = db.query(Grupo).filter(
                Grupo.nombre == g["nombre"],
                Grupo.centro_id == centro.id,
            ).first()
            if not existe:
                db.add(Grupo(
                    nombre=g["nombre"],
                    etapa=g["etapa"],
                    nivel=g["nivel"],
                    centro_id=centro.id,
                ))
                grupos_creados += 1
        print(f"✓ {grupos_creados} grupos creados ({len(GRUPOS) - grupos_creados} ya existían)")

        # Periodos
        periodos_creados = 0
        for p in PERIODOS:
            existe = db.query(Periodo).filter(
                Periodo.nombre == p["nombre"],
                Periodo.centro_id == centro.id,
            ).first()
            if not existe:
                db.add(Periodo(
                    nombre=p["nombre"],
                    hora_inicio=p["hora_inicio"],
                    hora_fin=p["hora_fin"],
                    orden=p["orden"],
                    es_lectivo=p.get("es_lectivo", True),
                    centro_id=centro.id,
                ))
                periodos_creados += 1
        print(f"✓ {periodos_creados} periodos creados ({len(PERIODOS) - periodos_creados} ya existían)")

        # Coordinador de ejemplo
        coord = db.query(Usuario).filter(Usuario.email == "coordinador@example.com").first()
        if not coord:
            coord = Usuario(
                email="coordinador@example.com",
                hashed_password=hash_password(password),
                nombre="Coordinador",
                apellidos="Ejemplo",
                rol=RolUsuario.COORDINADOR,
                centro_id=centro.id,
            )
            db.add(coord)
            print(f"✓ Usuario coordinador creado: {coord.email}")
        else:
            print(f"· Usuario ya existe: {coord.email}")

        # Curso escolar 2026-2027
        curso = db.query(CursoEscolar).filter(
            CursoEscolar.centro_id == centro.id,
            CursoEscolar.nombre == "2026-2027",
        ).first()
        if not curso:
            curso = CursoEscolar(
                nombre="2026-2027",
                fecha_inicio=date(2026, 9, 7),
                fecha_fin=date(2027, 6, 18),
                centro_id=centro.id,
            )
            db.add(curso)
            db.flush()
            print("✓ Curso escolar creado: 2026-2027")
        else:
            print("· Curso escolar ya existe: 2026-2027")

        # Horario borrador
        horario = db.query(Horario).filter(
            Horario.curso_escolar_id == curso.id,
            Horario.nombre == "Horario 2026-2027",
        ).first()
        if not horario:
            horario = Horario(
                nombre="Horario 2026-2027",
                estado=EstadoHorario.BORRADOR,
                curso_escolar_id=curso.id,
            )
            db.add(horario)
            print(f"✓ Horario borrador creado: {horario.nombre}")
        else:
            print(f"· Horario ya existe: {horario.nombre}")

        db.commit()
        print("\nSeed completado.")


if __name__ == "__main__":
    import secrets

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--password",
        default=None,
        help="Contraseña para el coordinador. Si se omite, se usa SEED_COORDINATOR_PASSWORD "
        "o se genera una aleatoria (se imprime al final).",
    )
    args = parser.parse_args()

    password = args.password or os.environ.get("SEED_COORDINATOR_PASSWORD")
    generated = False
    if not password:
        password = secrets.token_urlsafe(16)
        generated = True

    seed(password)

    if generated:
        print(f"\n⚠️  Contraseña generada para el coordinador: {password}")
        print("   Guárdala ahora: no se vuelve a mostrar.")
