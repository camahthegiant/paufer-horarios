import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_centro
from app.models.centro import Centro
from app.models.periodo import Periodo
from app.schemas.periodo import PeriodoCreate, PeriodoUpdate, PeriodoResponse

router = APIRouter(prefix="/api/v1/periodos", tags=["periodos"])


@router.get("/", response_model=list[PeriodoResponse])
def listar_periodos(
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    return db.query(Periodo).filter(
        Periodo.centro_id == centro.id
    ).order_by(Periodo.orden).all()


@router.get("/{periodo_id}", response_model=PeriodoResponse)
def obtener_periodo(
    periodo_id: uuid.UUID,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    periodo = db.query(Periodo).filter(
        Periodo.id == periodo_id, Periodo.centro_id == centro.id
    ).first()
    if not periodo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Periodo no encontrado")
    return periodo


@router.post("/", response_model=PeriodoResponse, status_code=status.HTTP_201_CREATED)
def crear_periodo(
    datos: PeriodoCreate,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    periodo = Periodo(**datos.model_dump(), centro_id=centro.id)
    db.add(periodo)
    db.commit()
    db.refresh(periodo)
    return periodo


@router.patch("/{periodo_id}", response_model=PeriodoResponse)
def actualizar_periodo(
    periodo_id: uuid.UUID,
    datos: PeriodoUpdate,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    periodo = db.query(Periodo).filter(
        Periodo.id == periodo_id, Periodo.centro_id == centro.id
    ).first()
    if not periodo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Periodo no encontrado")
    for campo, valor in datos.model_dump(exclude_none=True).items():
        setattr(periodo, campo, valor)
    db.commit()
    db.refresh(periodo)
    return periodo


@router.delete("/{periodo_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_periodo(
    periodo_id: uuid.UUID,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    periodo = db.query(Periodo).filter(
        Periodo.id == periodo_id, Periodo.centro_id == centro.id
    ).first()
    if not periodo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Periodo no encontrado")
    db.delete(periodo)
    db.commit()
