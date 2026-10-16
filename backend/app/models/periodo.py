import uuid
from datetime import time
from sqlalchemy import Integer, ForeignKey, Time, Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base, UUIDMixin, TimestampMixin


class Periodo(Base, UUIDMixin, TimestampMixin):
    """Franja horaria definida por el centro (ej: 1ª hora, 8:00-9:00)."""

    __tablename__ = "periodos"

    orden: Mapped[int] = mapped_column(Integer, nullable=False)
    nombre: Mapped[str] = mapped_column(String(50), nullable=False)  # "1ª hora", "Recreo"
    hora_inicio: Mapped[time] = mapped_column(Time, nullable=False)
    hora_fin: Mapped[time] = mapped_column(Time, nullable=False)
    es_lectivo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    centro_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("centros.id"), nullable=False
    )

    centro: Mapped["Centro"] = relationship(back_populates="periodos")
