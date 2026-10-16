import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_centro
from app.models.centro import Centro
from app.models.grupo import Grupo, Etapa
from app.schemas.grupo import GrupoCreate, GrupoUpdate, GrupoResponse

router = APIRouter(prefix="/api/v1/grupos", tags=["grupos"])


@router.get("/", response_model=list[GrupoResponse])
def listar_grupos(
    etapa: Etapa | None = None,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    q = db.query(Grupo).filter(Grupo.centro_id == centro.id)
    if etapa:
        q = q.filter(Grupo.etapa == etapa)
    return q.order_by(Grupo.etapa, Grupo.nivel, Grupo.nombre).all()


@router.get("/{grupo_id}", response_model=GrupoResponse)
def obtener_grupo(
    grupo_id: uuid.UUID,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id, Grupo.centro_id == centro.id).first()
    if not grupo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo no encontrado")
    return grupo


@router.post("/", response_model=GrupoResponse, status_code=status.HTTP_201_CREATED)
def crear_grupo(
    datos: GrupoCreate,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    grupo = Grupo(**datos.model_dump(), centro_id=centro.id)
    db.add(grupo)
    db.commit()
    db.refresh(grupo)
    return grupo


@router.patch("/{grupo_id}", response_model=GrupoResponse)
def actualizar_grupo(
    grupo_id: uuid.UUID,
    datos: GrupoUpdate,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id, Grupo.centro_id == centro.id).first()
    if not grupo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo no encontrado")
    for campo, valor in datos.model_dump(exclude_none=True).items():
        setattr(grupo, campo, valor)
    db.commit()
    db.refresh(grupo)
    return grupo


@router.delete("/{grupo_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_grupo(
    grupo_id: uuid.UUID,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id, Grupo.centro_id == centro.id).first()
    if not grupo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo no encontrado")
    db.delete(grupo)
    db.commit()
