import uuid
import enum
from datetime import date
from sqlalchemy import String, Enum, ForeignKey, Date, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base, UUIDMixin, TimestampMixin
from app.models.profesor import DiaSemana


class EstadoSustitucion(str, enum.Enum):
    PENDIENTE = "PENDIENTE"
    CUBIERTA = "CUBIERTA"
    SIN_CUBRIR = "SIN_CUBRIR"


class Sustitucion(Base, UUIDMixin, TimestampMixin):
    """Registro de ausencia + quién cubre (si lo hay)."""

    __tablename__ = "sustituciones"

    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    dia_semana: Mapped[DiaSemana] = mapped_column(Enum(DiaSemana), nullable=False)
    estado: Mapped[EstadoSustitucion] = mapped_column(
        Enum(EstadoSustitucion), default=EstadoSustitucion.PENDIENTE, nullable=False
    )
    motivo: Mapped[str | None] = mapped_column(Text, nullable=True)

    profesor_ausente_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profesores.id"), nullable=False
    )
    profesor_sustituto_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profesores.id"), nullable=True
    )
    periodo_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("periodos.id"), nullable=False
    )
    asignatura_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("asignaturas.id"), nullable=True
    )
    grupo_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("grupos.id"), nullable=True
    )
    aula_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("aulas.id"), nullable=True
    )

    profesor_ausente: Mapped["Profesor"] = relationship(foreign_keys=[profesor_ausente_id])
    profesor_sustituto: Mapped["Profesor | None"] = relationship(
        foreign_keys=[profesor_sustituto_id]
    )
    periodo: Mapped["Periodo"] = relationship()
    asignatura: Mapped["Asignatura | None"] = relationship()
    grupo: Mapped["Grupo | None"] = relationship()
    aula: Mapped["Aula | None"] = relationship()
