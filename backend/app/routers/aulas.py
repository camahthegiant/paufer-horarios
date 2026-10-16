import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_centro
from app.models.centro import Centro
from app.models.aula import Aula, TipoAula
from app.schemas.aula import AulaCreate, AulaUpdate, AulaResponse

router = APIRouter(prefix="/api/v1/aulas", tags=["aulas"])


@router.get("/", response_model=list[AulaResponse])
def listar_aulas(
    solo_activas: bool = True,
    tipo: TipoAula | None = None,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    q = db.query(Aula).filter(Aula.centro_id == centro.id)
    if solo_activas:
        q = q.filter(Aula.activa == True)
    if tipo:
        q = q.filter(Aula.tipo == tipo)
    return q.order_by(Aula.nombre).all()


@router.get("/{aula_id}", response_model=AulaResponse)
def obtener_aula(
    aula_id: uuid.UUID,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    aula = db.query(Aula).filter(Aula.id == aula_id, Aula.centro_id == centro.id).first()
    if not aula:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aula no encontrada")
    return aula


@router.post("/", response_model=AulaResponse, status_code=status.HTTP_201_CREATED)
def crear_aula(
    datos: AulaCreate,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    aula = Aula(**datos.model_dump(), centro_id=centro.id)
    db.add(aula)
    db.commit()
    db.refresh(aula)
    return aula


@router.patch("/{aula_id}", response_model=AulaResponse)
def actualizar_aula(
    aula_id: uuid.UUID,
    datos: AulaUpdate,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    aula = db.query(Aula).filter(Aula.id == aula_id, Aula.centro_id == centro.id).first()
    if not aula:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aula no encontrada")
    for campo, valor in datos.model_dump(exclude_none=True).items():
        setattr(aula, campo, valor)
    db.commit()
    db.refresh(aula)
    return aula


@router.delete("/{aula_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_aula(
    aula_id: uuid.UUID,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    aula = db.query(Aula).filter(Aula.id == aula_id, Aula.centro_id == centro.id).first()
    if not aula:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aula no encontrada")
    db.delete(aula)
    db.commit()
