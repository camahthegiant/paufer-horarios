import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator
import re


class CentroBase(BaseModel):
    nombre: str
    slug: str

    @field_validator("slug")
    @classmethod
    def slug_valido(cls, v: str) -> str:
        if not re.match(r"^[a-z0-9-]+$", v):
            raise ValueError("El slug solo puede contener letras minúsculas, números y guiones")
        return v


class CentroCreate(CentroBase):
    pass


class CentroUpdate(BaseModel):
    nombre: str | None = None


class CentroResponse(CentroBase):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    activo: bool
    created_at: datetime
