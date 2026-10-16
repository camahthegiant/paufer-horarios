import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.models.profesor import DiaSemana, TipoRestriccion


class RestriccionCreate(BaseModel):
    tipo: TipoRestriccion
    dia_semana: DiaSemana
    periodo_id: uuid.UUID | None = None
    motivo: str | None = None


class RestriccionResponse(RestriccionCreate):
    model_config = {"from_attributes": True}

    id: uuid.UUID


class ProfesorBase(BaseModel):
    nombre: str
    apellidos: str
    email: EmailStr
    horas_lectivas_semana: int = 18
    google_calendar_id: str | None = None
    idiomas: list[str] = []


class ProfesorCreate(ProfesorBase):
    restricciones: list[RestriccionCreate] = []


class ProfesorUpdate(BaseModel):
    nombre: str | None = None
    apellidos: str | None = None
    email: EmailStr | None = None
    horas_lectivas_semana: int | None = None
    google_calendar_id: str | None = None
    activo: bool | None = None
    idiomas: list[str] | None = None


class ProfesorResponse(ProfesorBase):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    activo: bool
    centro_id: uuid.UUID
    restricciones: list[RestriccionResponse] = []
    created_at: datetime
