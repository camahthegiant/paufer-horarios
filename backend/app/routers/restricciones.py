import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_centro
from app.models.centro import Centro
from app.models.profesor import Profesor, RestriccionProfesor
from app.schemas.restriccion import RestriccionCreate, RestriccionResponse

router = APIRouter(prefix="/api/v1/profesores", tags=["restricciones"])


def _get_profesor(profesor_id: uuid.UUID, centro: Centro, db: Session) -> Profesor:
    p = db.query(Profesor).filter(
        Profesor.id == profesor_id,
        Profesor.centro_id == centro.id,
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Profesor no encontrado")
    return p


@router.get("/{profesor_id}/restricciones", response_model=list[RestriccionResponse])
def listar(
    profesor_id: uuid.UUID,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    _get_profesor(profesor_id, centro, db)
    return db.query(RestriccionProfesor).filter(
        RestriccionProfesor.profesor_id == profesor_id
    ).all()


@router.post("/{profesor_id}/restricciones", response_model=RestriccionResponse, status_code=201)
def crear(
    profesor_id: uuid.UUID,
    datos: RestriccionCreate,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    _get_profesor(profesor_id, centro, db)

    # Si ya existe restricción para ese día+periodo, actualiza en lugar de duplicar
    filtro = db.query(RestriccionProfesor).filter(
        RestriccionProfesor.profesor_id == profesor_id,
        RestriccionProfesor.dia_semana == datos.dia_semana,
    )
    if datos.periodo_id is not None:
        filtro = filtro.filter(RestriccionProfesor.periodo_id == datos.periodo_id)
    else:
        filtro = filtro.filter(RestriccionProfesor.periodo_id.is_(None))

    existente = filtro.first()
    if existente:
        existente.tipo = datos.tipo
        existente.motivo = datos.motivo
        db.commit()
        db.refresh(existente)
        return existente

    r = RestriccionProfesor(profesor_id=profesor_id, **datos.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@router.delete("/{profesor_id}/restricciones/{restriccion_id}", status_code=204)
def eliminar(
    profesor_id: uuid.UUID,
    restriccion_id: uuid.UUID,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    _get_profesor(profesor_id, centro, db)
    r = db.query(RestriccionProfesor).filter(
        RestriccionProfesor.id == restriccion_id,
        RestriccionProfesor.profesor_id == profesor_id,
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Restricción no encontrada")
    db.delete(r)
    db.commit()
