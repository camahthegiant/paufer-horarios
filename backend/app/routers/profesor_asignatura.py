import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_centro
from app.models.centro import Centro
from app.models.horario import ProfesorAsignatura
from app.models.profesor import Profesor
from app.models.asignatura import Asignatura
from app.models.grupo import Grupo
from app.schemas.profesor_asignatura import (
    ProfesorAsignaturaCreate,
    ProfesorAsignaturaUpdate,
    ProfesorAsignaturaResponse,
)

router = APIRouter(prefix="/api/v1/profesor-asignatura", tags=["profesor_asignatura"])


def _enrich(pa: ProfesorAsignatura) -> dict:
    return {
        "id": pa.id,
        "profesor_id": pa.profesor_id,
        "asignatura_id": pa.asignatura_id,
        "grupo_id": pa.grupo_id,
        "horas_semana": pa.horas_semana,
        "subgrupo": pa.subgrupo,
        "created_at": pa.created_at,
        "profesor_nombre": pa.profesor.nombre if pa.profesor else None,
        "profesor_apellidos": pa.profesor.apellidos if pa.profesor else None,
        "asignatura_nombre": pa.asignatura.nombre if pa.asignatura else None,
        "asignatura_color": pa.asignatura.color if pa.asignatura else None,
        "grupo_nombre": pa.grupo.nombre if pa.grupo else None,
    }


@router.get("/", response_model=list[ProfesorAsignaturaResponse])
def listar(
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    registros = (
        db.query(ProfesorAsignatura)
        .join(Profesor, ProfesorAsignatura.profesor_id == Profesor.id)
        .join(Asignatura, ProfesorAsignatura.asignatura_id == Asignatura.id)
        .join(Grupo, ProfesorAsignatura.grupo_id == Grupo.id)
        .filter(Profesor.centro_id == centro.id)
        .order_by(Grupo.nombre, Asignatura.nombre)
        .all()
    )
    return [_enrich(r) for r in registros]


@router.post("/", response_model=ProfesorAsignaturaResponse, status_code=status.HTTP_201_CREATED)
def crear(
    datos: ProfesorAsignaturaCreate,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    # Verify entities belong to this centro
    profesor = db.query(Profesor).filter(
        Profesor.id == datos.profesor_id, Profesor.centro_id == centro.id
    ).first()
    if not profesor:
        raise HTTPException(status_code=404, detail="Profesor no encontrado en este centro")

    asignatura = db.query(Asignatura).filter(
        Asignatura.id == datos.asignatura_id, Asignatura.centro_id == centro.id
    ).first()
    if not asignatura:
        raise HTTPException(status_code=404, detail="Asignatura no encontrada en este centro")

    grupo = db.query(Grupo).filter(
        Grupo.id == datos.grupo_id, Grupo.centro_id == centro.id
    ).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado en este centro")

    # Comprobación explícita: NULL != NULL en constraints PostgreSQL
    q = db.query(ProfesorAsignatura).filter(
        ProfesorAsignatura.profesor_id == datos.profesor_id,
        ProfesorAsignatura.asignatura_id == datos.asignatura_id,
        ProfesorAsignatura.grupo_id == datos.grupo_id,
    )
    if datos.subgrupo is None:
        q = q.filter(ProfesorAsignatura.subgrupo.is_(None))
    else:
        q = q.filter(ProfesorAsignatura.subgrupo == datos.subgrupo)
    if q.first():
        raise HTTPException(
            status_code=409,
            detail="Ya existe esta asignación (mismo profesor, asignatura, grupo y subgrupo)"
        )

    pa = ProfesorAsignatura(**datos.model_dump())
    db.add(pa)
    db.commit()
    db.refresh(pa)
    return _enrich(pa)


@router.patch("/{pa_id}", response_model=ProfesorAsignaturaResponse)
def actualizar(
    pa_id: uuid.UUID,
    datos: ProfesorAsignaturaUpdate,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    pa = (
        db.query(ProfesorAsignatura)
        .join(Profesor, ProfesorAsignatura.profesor_id == Profesor.id)
        .filter(ProfesorAsignatura.id == pa_id, Profesor.centro_id == centro.id)
        .first()
    )
    if not pa:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    for campo, valor in datos.model_dump(exclude_none=True).items():
        setattr(pa, campo, valor)
    db.commit()
    db.refresh(pa)
    return _enrich(pa)


@router.delete("/{pa_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(
    pa_id: uuid.UUID,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    pa = (
        db.query(ProfesorAsignatura)
        .join(Profesor, ProfesorAsignatura.profesor_id == Profesor.id)
        .filter(ProfesorAsignatura.id == pa_id, Profesor.centro_id == centro.id)
        .first()
    )
    if not pa:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    db.delete(pa)
    db.commit()
