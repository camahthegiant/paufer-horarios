import uuid
import enum
from sqlalchemy import String, Integer, Boolean, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from app.models.base import Base, UUIDMixin, TimestampMixin


class TipoRestriccion(str, enum.Enum):
    NO_DISPONIBLE = "NO_DISPONIBLE"       # el profesor no puede en ese slot
    PREFERENCIA_EVITAR = "PREFERENCIA_EVITAR"  # el solver lo evita si puede
    PREFERENCIA = "PREFERENCIA"           # el solver lo prioriza si puede


class DiaSemana(str, enum.Enum):
    LUNES = "LUNES"
    MARTES = "MARTES"
    MIERCOLES = "MIERCOLES"
    JUEVES = "JUEVES"
    VIERNES = "VIERNES"


class Profesor(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "profesores"

    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    apellidos: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    # ID del calendario Google para DWD push
    google_calendar_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    horas_lectivas_semana: Mapped[int] = mapped_column(Integer, default=18, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    idiomas: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, server_default='{}')

    centro_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("centros.id"), nullable=False
    )

    centro: Mapped["Centro"] = relationship(back_populates="profesores")
    restricciones: Mapped[list["RestriccionProfesor"]] = relationship(
        back_populates="profesor", cascade="all, delete-orphan"
    )
    asignaciones: Mapped[list["ProfesorAsignatura"]] = relationship(
        back_populates="profesor", cascade="all, delete-orphan"
    )


class RestriccionProfesor(Base, UUIDMixin, TimestampMixin):
    """Disponibilidad horaria de un profesor (obligatoria o preferencia)."""

    __tablename__ = "restricciones_profesor"

    profesor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profesores.id"), nullable=False
    )
    tipo: Mapped[TipoRestriccion] = mapped_column(Enum(TipoRestriccion), nullable=False)
    dia_semana: Mapped[DiaSemana] = mapped_column(Enum(DiaSemana), nullable=False)
    periodo_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("periodos.id"), nullable=True
    )
    motivo: Mapped[str | None] = mapped_column(Text, nullable=True)

    profesor: Mapped["Profesor"] = relationship(back_populates="restricciones")
    periodo: Mapped["Periodo | None"] = relationship()
