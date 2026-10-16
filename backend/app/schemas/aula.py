import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.aula import TipoAula


class AulaBase(BaseModel):
    nombre: str
    codigo: str | None = None
    capacidad: int | None = None
    tipo: TipoAula = TipoAula.ORDINARIA


class AulaCreate(AulaBase):
    pass


class AulaUpdate(BaseModel):
    nombre: str | None = None
    codigo: str | None = None
    capacidad: int | None = None
    tipo: TipoAula | None = None
    activa: bool | None = None


class AulaResponse(AulaBase):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    activa: bool
    centro_id: uuid.UUID
    created_at: datetime
