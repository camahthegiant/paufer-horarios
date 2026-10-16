import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_centro
from app.models.centro import Centro
from app.models.asignatura import Asignatura
from app.schemas.asignatura import AsignaturaCreate, AsignaturaUpdate, AsignaturaResponse

router = APIRouter(prefix="/api/v1/asignaturas", tags=["asignaturas"])


@router.get("/", response_model=list[AsignaturaResponse])
def listar_asignaturas(
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    return db.query(Asignatura).filter(
        Asignatura.centro_id == centro.id
    ).order_by(Asignatura.nombre).all()


@router.get("/{asignatura_id}", response_model=AsignaturaResponse)
def obtener_asignatura(
    asignatura_id: uuid.UUID,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    asignatura = db.query(Asignatura).filter(
        Asignatura.id == asignatura_id, Asignatura.centro_id == centro.id
    ).first()
    if not asignatura:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignatura no encontrada")
    return asignatura


@router.post("/", response_model=AsignaturaResponse, status_code=status.HTTP_201_CREATED)
def crear_asignatura(
    datos: AsignaturaCreate,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    asignatura = Asignatura(**datos.model_dump(), centro_id=centro.id)
    db.add(asignatura)
    db.commit()
    db.refresh(asignatura)
    return asignatura


@router.patch("/{asignatura_id}", response_model=AsignaturaResponse)
def actualizar_asignatura(
    asignatura_id: uuid.UUID,
    datos: AsignaturaUpdate,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    asignatura = db.query(Asignatura).filter(
        Asignatura.id == asignatura_id, Asignatura.centro_id == centro.id
    ).first()
    if not asignatura:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignatura no encontrada")
    for campo, valor in datos.model_dump(exclude_none=True).items():
        setattr(asignatura, campo, valor)
    db.commit()
    db.refresh(asignatura)
    return asignatura


@router.delete("/{asignatura_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_asignatura(
    asignatura_id: uuid.UUID,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    asignatura = db.query(Asignatura).filter(
        Asignatura.id == asignatura_id, Asignatura.centro_id == centro.id
    ).first()
    if not asignatura:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignatura no encontrada")
    db.delete(asignatura)
    db.commit()
