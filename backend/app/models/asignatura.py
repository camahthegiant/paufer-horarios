import uuid
from sqlalchemy import String, Integer, ForeignKey, Enum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base, UUIDMixin, TimestampMixin
from app.models.aula import TipoAula


class Asignatura(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "asignaturas"

    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    codigo: Mapped[str | None] = mapped_column(String(20), nullable=True)
    horas_semana: Mapped[int] = mapped_column(Integer, nullable=False)
    color: Mapped[str] = mapped_column(String(7), default="#6366f1", nullable=False)  # hex
    troncal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false")
    aula_tipo_requerido: Mapped[TipoAula | None] = mapped_column(
        Enum(TipoAula), nullable=True
    )

    centro_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("centros.id"), nullable=False
    )

    centro: Mapped["Centro"] = relationship(back_populates="asignaturas")
    asignaciones: Mapped[list["ProfesorAsignatura"]] = relationship(back_populates="asignatura")
