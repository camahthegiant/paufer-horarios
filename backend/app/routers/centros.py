"""
Endpoints de gestión de centros.
Solo accesible por SUPERADMIN (control nuestro, no de los centros).
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.centro import Centro
from app.models.usuario import Usuario
from app.schemas.centro import CentroCreate, CentroUpdate, CentroResponse
from app.auth import require_superadmin

router = APIRouter(prefix="/api/v1/centros", tags=["centros"])


@router.get("/", response_model=list[CentroResponse])
def listar_centros(db: Session = Depends(get_db), _: Usuario = Depends(require_superadmin)):
    return db.query(Centro).filter(Centro.activo == True).all()


@router.get("/{centro_id}", response_model=CentroResponse)
def obtener_centro(centro_id: uuid.UUID, db: Session = Depends(get_db), _: Usuario = Depends(require_superadmin)):
    centro = db.query(Centro).filter(Centro.id == centro_id).first()
    if not centro:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Centro no encontrado")
    return centro


@router.post("/", response_model=CentroResponse, status_code=status.HTTP_201_CREATED)
def crear_centro(datos: CentroCreate, db: Session = Depends(get_db), _: Usuario = Depends(require_superadmin)):
    if db.query(Centro).filter(Centro.slug == datos.slug).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un centro con el slug '{datos.slug}'",
        )
    centro = Centro(**datos.model_dump())
    db.add(centro)
    db.commit()
    db.refresh(centro)
    return centro


@router.patch("/{centro_id}", response_model=CentroResponse)
def actualizar_centro(centro_id: uuid.UUID, datos: CentroUpdate, db: Session = Depends(get_db), _: Usuario = Depends(require_superadmin)):
    centro = db.query(Centro).filter(Centro.id == centro_id).first()
    if not centro:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Centro no encontrado")
    for campo, valor in datos.model_dump(exclude_none=True).items():
        setattr(centro, campo, valor)
    db.commit()
    db.refresh(centro)
    return centro


@router.delete("/{centro_id}", status_code=status.HTTP_204_NO_CONTENT)
def desactivar_centro(centro_id: uuid.UUID, db: Session = Depends(get_db), _: Usuario = Depends(require_superadmin)):
    """Desactiva el centro (soft delete) en lugar de borrarlo."""
    centro = db.query(Centro).filter(Centro.id == centro_id).first()
    if not centro:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Centro no encontrado")
    centro.activo = False
    db.commit()
