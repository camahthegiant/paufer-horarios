import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_centro
from app.models.centro import Centro
from app.models.profesor import Profesor, RestriccionProfesor
from app.schemas.profesor import ProfesorCreate, ProfesorUpdate, ProfesorResponse

router = APIRouter(prefix="/api/v1/profesores", tags=["profesores"])


@router.get("/", response_model=list[ProfesorResponse])
def listar_profesores(
    solo_activos: bool = True,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    q = db.query(Profesor).filter(Profesor.centro_id == centro.id)
    if solo_activos:
        q = q.filter(Profesor.activo == True)
    return q.order_by(Profesor.apellidos, Profesor.nombre).all()


@router.get("/{profesor_id}", response_model=ProfesorResponse)
def obtener_profesor(
    profesor_id: uuid.UUID,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    profesor = db.query(Profesor).filter(
        Profesor.id == profesor_id, Profesor.centro_id == centro.id
    ).first()
    if not profesor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profesor no encontrado")
    return profesor


@router.post("/", response_model=ProfesorResponse, status_code=status.HTTP_201_CREATED)
def crear_profesor(
    datos: ProfesorCreate,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    if db.query(Profesor).filter(
        Profesor.email == datos.email, Profesor.centro_id == centro.id
    ).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un profesor con el email '{datos.email}' en este centro",
        )

    restricciones = datos.restricciones
    datos_profesor = datos.model_dump(exclude={"restricciones"})
    profesor = Profesor(**datos_profesor, centro_id=centro.id)

    for r in restricciones:
        profesor.restricciones.append(RestriccionProfesor(**r.model_dump()))

    db.add(profesor)
    db.commit()
    db.refresh(profesor)
    return profesor


@router.patch("/{profesor_id}", response_model=ProfesorResponse)
def actualizar_profesor(
    profesor_id: uuid.UUID,
    datos: ProfesorUpdate,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    profesor = db.query(Profesor).filter(
        Profesor.id == profesor_id, Profesor.centro_id == centro.id
    ).first()
    if not profesor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profesor no encontrado")
    for campo, valor in datos.model_dump(exclude_none=True).items():
        setattr(profesor, campo, valor)
    db.commit()
    db.refresh(profesor)
    return profesor


@router.delete("/{profesor_id}", status_code=status.HTTP_204_NO_CONTENT)
def desactivar_profesor(
    profesor_id: uuid.UUID,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    """Soft delete: marca como inactivo en lugar de borrar."""
    profesor = db.query(Profesor).filter(
        Profesor.id == profesor_id, Profesor.centro_id == centro.id
    ).first()
    if not profesor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profesor no encontrado")
    profesor.activo = False
    db.commit()
