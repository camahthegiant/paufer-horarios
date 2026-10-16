import uuid
from datetime import datetime
from pydantic import BaseModel


class ProfesorAsignaturaCreate(BaseModel):
    profesor_id: uuid.UUID
    asignatura_id: uuid.UUID
    grupo_id: uuid.UUID
    horas_semana: int
    subgrupo: str | None = None


class ProfesorAsignaturaUpdate(BaseModel):
    horas_semana: int | None = None
    subgrupo: str | None = None


class ProfesorAsignaturaResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    profesor_id: uuid.UUID
    asignatura_id: uuid.UUID
    grupo_id: uuid.UUID
    horas_semana: int
    subgrupo: str | None
    created_at: datetime

    # Datos desnormalizados para la UI
    profesor_nombre: str | None = None
    profesor_apellidos: str | None = None
    asignatura_nombre: str | None = None
    asignatura_color: str | None = None
    grupo_nombre: str | None = None
