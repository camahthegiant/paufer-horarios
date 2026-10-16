from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin, TimestampMixin


class Centro(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "centros"

    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    usuarios: Mapped[list["Usuario"]] = relationship(back_populates="centro")
    profesores: Mapped[list["Profesor"]] = relationship(back_populates="centro")
    asignaturas: Mapped[list["Asignatura"]] = relationship(back_populates="centro")
    aulas: Mapped[list["Aula"]] = relationship(back_populates="centro")
    grupos: Mapped[list["Grupo"]] = relationship(back_populates="centro")
    periodos: Mapped[list["Periodo"]] = relationship(back_populates="centro")
    cursos_escolares: Mapped[list["CursoEscolar"]] = relationship(back_populates="centro")
