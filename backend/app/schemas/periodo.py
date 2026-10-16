import uuid
from datetime import datetime, time
from pydantic import BaseModel, model_validator


class PeriodoBase(BaseModel):
    orden: int
    nombre: str
    hora_inicio: time
    hora_fin: time
    es_lectivo: bool = True

    @model_validator(mode="after")
    def hora_fin_posterior(self) -> "PeriodoBase":
        if self.hora_fin <= self.hora_inicio:
            raise ValueError("hora_fin debe ser posterior a hora_inicio")
        return self


class PeriodoCreate(PeriodoBase):
    pass


class PeriodoUpdate(BaseModel):
    orden: int | None = None
    nombre: str | None = None
    hora_inicio: time | None = None
    hora_fin: time | None = None
    es_lectivo: bool | None = None


class PeriodoResponse(PeriodoBase):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    centro_id: uuid.UUID
    created_at: datetime
