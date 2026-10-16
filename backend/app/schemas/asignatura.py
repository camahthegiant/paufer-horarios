import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator
import re
from app.models.aula import TipoAula


class AsignaturaBase(BaseModel):
    nombre: str
    codigo: str | None = None
    horas_semana: int
    color: str = "#6366f1"
    troncal: bool = False
    aula_tipo_requerido: TipoAula | None = None

    @field_validator("color")
    @classmethod
    def color_hex_valido(cls, v: str) -> str:
        if not re.match(r"^#[0-9a-fA-F]{6}$", v):
            raise ValueError("El color debe ser un código hex válido (#rrggbb)")
        return v


class AsignaturaCreate(AsignaturaBase):
    pass


class AsignaturaUpdate(BaseModel):
    nombre: str | None = None
    codigo: str | None = None
    horas_semana: int | None = None
    color: str | None = None
    troncal: bool | None = None
    aula_tipo_requerido: TipoAula | None = None


class AsignaturaResponse(AsignaturaBase):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    centro_id: uuid.UUID
    created_at: datetime
