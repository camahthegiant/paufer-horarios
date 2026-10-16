import uuid
from pydantic import BaseModel
from app.models.profesor import TipoRestriccion, DiaSemana


class RestriccionCreate(BaseModel):
    dia_semana: DiaSemana
    periodo_id: uuid.UUID | None = None
    tipo: TipoRestriccion
    motivo: str | None = None


class RestriccionResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    profesor_id: uuid.UUID
    dia_semana: DiaSemana
    periodo_id: uuid.UUID | None
    tipo: TipoRestriccion
    motivo: str | None
