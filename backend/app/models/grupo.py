import uuid
import enum
from sqlalchemy import String, Integer, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base, UUIDMixin, TimestampMixin


class Etapa(str, enum.Enum):
    INFANTIL = "INFANTIL"
    PRIMARIA = "PRIMARIA"
    ESO = "ESO"
    BACHILLERATO = "BACHILLERATO"
    FP = "FP"
    OTRO = "OTRO"


class Grupo(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "grupos"

    nombre: Mapped[str] = mapped_column(String(50), nullable=False)  # "1ºA", "2ºB"
    nivel: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1, 2, 3...
    etapa: Mapped[Etapa] = mapped_column(Enum(Etapa), nullable=False)

    centro_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("centros.id"), nullable=False
    )

    centro: Mapped["Centro"] = relationship(back_populates="grupos")
    asignaciones: Mapped[list["ProfesorAsignatura"]] = relationship(back_populates="grupo")
