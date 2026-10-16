import uuid
from datetime import date, datetime
from pydantic import BaseModel
from app.models.sustitucion import EstadoSustitucion
from app.models.profesor import DiaSemana


class AusenciaCreate(BaseModel):
    profesor_ausente_id: uuid.UUID
    fecha: date
    horario_id: uuid.UUID | None = None
    motivo: str | None = None


class SustitucionUpdate(BaseModel):
    profesor_sustituto_id: uuid.UUID | None = None
    estado: EstadoSustitucion | None = None
    motivo: str | None = None


class SustitucionResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    fecha: date
    dia_semana: DiaSemana
    estado: EstadoSustitucion
    motivo: str | None

    profesor_ausente_id: uuid.UUID
    profesor_ausente_nombre: str | None = None
    profesor_ausente_apellidos: str | None = None

    profesor_sustituto_id: uuid.UUID | None
    profesor_sustituto_nombre: str | None = None
    profesor_sustituto_apellidos: str | None = None

    periodo_id: uuid.UUID
    periodo_nombre: str | None = None
    periodo_hora_inicio: str | None = None
    periodo_hora_fin: str | None = None
    periodo_orden: int | None = None

    asignatura_id: uuid.UUID | None
    asignatura_nombre: str | None = None

    grupo_id: uuid.UUID | None
    grupo_nombre: str | None = None

    aula_id: uuid.UUID | None
    aula_nombre: str | None = None

    created_at: datetime
