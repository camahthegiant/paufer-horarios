import uuid
import enum
from sqlalchemy import String, Integer, Enum, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base, UUIDMixin, TimestampMixin


class TipoAula(str, enum.Enum):
    ORDINARIA = "ORDINARIA"
    LABORATORIO = "LABORATORIO"
    INFORMATICA = "INFORMATICA"
    GIMNASIO = "GIMNASIO"
    MUSICA = "MUSICA"
    BIBLIOTECA = "BIBLIOTECA"
    OTRO = "OTRO"


class Aula(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "aulas"

    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    codigo: Mapped[str | None] = mapped_column(String(20), nullable=True)
    capacidad: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tipo: Mapped[TipoAula] = mapped_column(
        Enum(TipoAula), default=TipoAula.ORDINARIA, nullable=False
    )
    activa: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    centro_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("centros.id"), nullable=False
    )

    centro: Mapped["Centro"] = relationship(back_populates="aulas")
