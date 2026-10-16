import uuid
import enum
from datetime import date
from sqlalchemy import String, Integer, Enum, ForeignKey, Date, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base, UUIDMixin, TimestampMixin
from app.models.profesor import DiaSemana


class EstadoHorario(str, enum.Enum):
    BORRADOR = "BORRADOR"
    PUBLICADO = "PUBLICADO"
    ARCHIVADO = "ARCHIVADO"


class TipoAsignacion(str, enum.Enum):
    CLASE = "CLASE"
    GUARDIA = "GUARDIA"
    RECREO = "RECREO"
    REUNION = "REUNION"


class CursoEscolar(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "cursos_escolares"

    nombre: Mapped[str] = mapped_column(String(20), nullable=False)  # "2026-2027"
    fecha_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_fin: Mapped[date] = mapped_column(Date, nullable=False)

    centro_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("centros.id"), nullable=False
    )

    centro: Mapped["Centro"] = relationship(back_populates="cursos_escolares")
    horarios: Mapped[list["Horario"]] = relationship(back_populates="curso_escolar")


class ProfesorAsignatura(Base, UUIDMixin, TimestampMixin):
    """Qué profesor imparte qué asignatura a qué grupo y cuántas horas/semana."""

    __tablename__ = "profesor_asignatura"
    __table_args__ = (
        UniqueConstraint("profesor_id", "asignatura_id", "grupo_id", "subgrupo", name="uq_profesor_asig_grupo"),
    )

    profesor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profesores.id"), nullable=False
    )
    asignatura_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("asignaturas.id"), nullable=False
    )
    grupo_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("grupos.id"), nullable=False
    )
    horas_semana: Mapped[int] = mapped_column(Integer, nullable=False)
    # Grupo partido: "A" o "B" cuando la clase se divide (ej: informática con 15 PCs)
    subgrupo: Mapped[str | None] = mapped_column(String(10), nullable=True)

    profesor: Mapped["Profesor"] = relationship(back_populates="asignaciones")
    asignatura: Mapped["Asignatura"] = relationship(back_populates="asignaciones")
    grupo: Mapped["Grupo"] = relationship(back_populates="asignaciones")


class Horario(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "horarios"

    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    estado: Mapped[EstadoHorario] = mapped_column(
        Enum(EstadoHorario), default=EstadoHorario.BORRADOR, nullable=False
    )

    curso_escolar_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cursos_escolares.id"), nullable=False
    )

    curso_escolar: Mapped["CursoEscolar"] = relationship(back_populates="horarios")
    asignaciones: Mapped[list["AsignacionHoraria"]] = relationship(
        back_populates="horario", cascade="all, delete-orphan"
    )


class AsignacionHoraria(Base, UUIDMixin, TimestampMixin):
    """Un slot concreto del horario: quién, qué, a quién, dónde, cuándo."""

    __tablename__ = "asignaciones_horarias"
    __table_args__ = (
        # Un profesor no puede estar en dos sitios a la vez
        UniqueConstraint("horario_id", "profesor_id", "dia_semana", "periodo_id",
                         name="uq_profesor_slot"),
        # Un grupo no puede tener dos clases a la vez
        UniqueConstraint("horario_id", "grupo_id", "dia_semana", "periodo_id",
                         name="uq_grupo_slot"),
        # Un aula no puede estar ocupada dos veces a la vez
        UniqueConstraint("horario_id", "aula_id", "dia_semana", "periodo_id",
                         name="uq_aula_slot"),
    )

    horario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("horarios.id"), nullable=False
    )
    profesor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profesores.id"), nullable=False
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
    periodo_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("periodos.id"), nullable=False
    )
    dia_semana: Mapped[DiaSemana] = mapped_column(Enum(DiaSemana), nullable=False)
    tipo: Mapped[TipoAsignacion] = mapped_column(
        Enum(TipoAsignacion), default=TipoAsignacion.CLASE, nullable=False
    )

    horario: Mapped["Horario"] = relationship(back_populates="asignaciones")
    profesor: Mapped["Profesor"] = relationship()
    asignatura: Mapped["Asignatura | None"] = relationship()
    grupo: Mapped["Grupo | None"] = relationship()
    aula: Mapped["Aula | None"] = relationship()
    periodo: Mapped["Periodo"] = relationship()
