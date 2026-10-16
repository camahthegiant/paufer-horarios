import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.grupo import Etapa


class GrupoBase(BaseModel):
    nombre: str
    nivel: int | None = None
    etapa: Etapa


class GrupoCreate(GrupoBase):
    pass


class GrupoUpdate(BaseModel):
    nombre: str | None = None
    nivel: int | None = None
    etapa: Etapa | None = None


class GrupoResponse(GrupoBase):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    centro_id: uuid.UUID
    created_at: datetime
