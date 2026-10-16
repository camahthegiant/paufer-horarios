import uuid
import enum
from sqlalchemy import String, Enum, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base, UUIDMixin, TimestampMixin


class RolUsuario(str, enum.Enum):
    SUPERADMIN = "SUPERADMIN"   # acceso a todos los centros
    ADMIN = "ADMIN"             # admin de su centro
    COORDINADOR = "COORDINADOR" # gestiona horarios del centro
    PROFESOR = "PROFESOR"       # solo ve su horario


class Usuario(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "usuarios"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    apellidos: Mapped[str] = mapped_column(String(200), nullable=False)
    rol: Mapped[RolUsuario] = mapped_column(Enum(RolUsuario), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # null para SUPERADMIN
    centro_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("centros.id"), nullable=True
    )

    centro: Mapped["Centro | None"] = relationship(back_populates="usuarios")

    @property
    def centro_slug(self) -> str | None:
        return self.centro.slug if self.centro else None
