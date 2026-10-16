import uuid
from datetime import date, datetime
from pydantic import BaseModel
from app.models.horario import EstadoHorario, TipoAsignacion
from app.models.profesor import DiaSemana


class CursoEscolarCreate(BaseModel):
    nombre: str
    fecha_inicio: date
    fecha_fin: date


class CursoEscolarResponse(CursoEscolarCreate):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    centro_id: uuid.UUID


class HorarioCreate(BaseModel):
    nombre: str
    curso_escolar_id: uuid.UUID


class HorarioResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    nombre: str
    estado: EstadoHorario
    curso_escolar_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class SlotCreate(BaseModel):
    profesor_id: uuid.UUID
    asignatura_id: uuid.UUID | None = None
    grupo_id: uuid.UUID | None = None
    aula_id: uuid.UUID | None = None
    periodo_id: uuid.UUID
    dia_semana: DiaSemana
    tipo: TipoAsignacion = TipoAsignacion.CLASE


class SlotResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    horario_id: uuid.UUID
    profesor_id: uuid.UUID
    asignatura_id: uuid.UUID | None
    grupo_id: uuid.UUID | None
    aula_id: uuid.UUID | None
    periodo_id: uuid.UUID
    dia_semana: DiaSemana
    tipo: TipoAsignacion
    # enriched
    profesor_nombre: str | None = None
    profesor_apellidos: str | None = None
    asignatura_nombre: str | None = None
    asignatura_color: str | None = None
    grupo_nombre: str | None = None
