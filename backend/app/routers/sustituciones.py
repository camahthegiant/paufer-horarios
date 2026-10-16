import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_centro
from app.models.centro import Centro
from app.models.sustitucion import Sustitucion, EstadoSustitucion
from app.models.horario import Horario, AsignacionHoraria, EstadoHorario
from app.models.profesor import Profesor, DiaSemana
from app.models.periodo import Periodo
from app.models.asignatura import Asignatura
from app.models.grupo import Grupo
from app.models.aula import Aula
from app.schemas.sustitucion import AusenciaCreate, SustitucionUpdate, SustitucionResponse

router = APIRouter(prefix="/api/v1/sustituciones", tags=["sustituciones"])

_DIA_MAP = {
    0: DiaSemana.LUNES,
    1: DiaSemana.MARTES,
    2: DiaSemana.MIERCOLES,
    3: DiaSemana.JUEVES,
    4: DiaSemana.VIERNES,
}


def _enrich(s: Sustitucion) -> dict:
    periodo_hora_inicio = None
    periodo_hora_fin = None
    if s.periodo and s.periodo.hora_inicio:
        periodo_hora_inicio = s.periodo.hora_inicio.strftime("%H:%M")
    if s.periodo and s.periodo.hora_fin:
        periodo_hora_fin = s.periodo.hora_fin.strftime("%H:%M")

    return {
        "id": s.id,
        "fecha": s.fecha,
        "dia_semana": s.dia_semana,
        "estado": s.estado,
        "motivo": s.motivo,
        "profesor_ausente_id": s.profesor_ausente_id,
        "profesor_ausente_nombre": s.profesor_ausente.nombre if s.profesor_ausente else None,
        "profesor_ausente_apellidos": s.profesor_ausente.apellidos if s.profesor_ausente else None,
        "profesor_sustituto_id": s.profesor_sustituto_id,
        "profesor_sustituto_nombre": s.profesor_sustituto.nombre if s.profesor_sustituto else None,
        "profesor_sustituto_apellidos": s.profesor_sustituto.apellidos if s.profesor_sustituto else None,
        "periodo_id": s.periodo_id,
        "periodo_nombre": s.periodo.nombre if s.periodo else None,
        "periodo_hora_inicio": periodo_hora_inicio,
        "periodo_hora_fin": periodo_hora_fin,
        "periodo_orden": s.periodo.orden if s.periodo else None,
        "asignatura_id": s.asignatura_id,
        "asignatura_nombre": s.asignatura.nombre if s.asignatura else None,
        "grupo_id": s.grupo_id,
        "grupo_nombre": s.grupo.nombre if s.grupo else None,
        "aula_id": s.aula_id,
        "aula_nombre": s.aula.nombre if s.aula else None,
        "created_at": s.created_at,
    }


@router.post("/ausencia", response_model=list[SustitucionResponse], status_code=201)
def registrar_ausencia(
    datos: AusenciaCreate,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    """Registra la ausencia de un profesor. Auto-crea una sustitucion por cada periodo
    que ese profesor tiene asignado ese día en el horario activo (si existe)."""
    profesor = db.query(Profesor).filter(
        Profesor.id == datos.profesor_ausente_id,
        Profesor.centro_id == centro.id,
    ).first()
    if not profesor:
        raise HTTPException(status_code=404, detail="Profesor no encontrado")

    weekday = datos.fecha.weekday()
    if weekday > 4:
        raise HTTPException(status_code=400, detail="No hay clases en fin de semana")
    dia_semana = _DIA_MAP[weekday]

    # Buscar horario activo del centro
    horario = None
    if datos.horario_id:
        horario = db.query(Horario).filter(Horario.id == datos.horario_id).first()
    else:
        horario = (
            db.query(Horario)
            .join(Horario.curso_escolar)
            .filter(
                Horario.estado == EstadoHorario.PUBLICADO,
                Horario.curso_escolar.has(centro_id=centro.id),
            )
            .order_by(Horario.updated_at.desc())
            .first()
        )

    creadas: list[Sustitucion] = []

    if horario:
        # Una sustitucion por cada clase que tiene ese profesor ese dia
        slots = (
            db.query(AsignacionHoraria)
            .filter(
                AsignacionHoraria.horario_id == horario.id,
                AsignacionHoraria.profesor_id == datos.profesor_ausente_id,
                AsignacionHoraria.dia_semana == dia_semana,
            )
            .all()
        )
        for slot in slots:
            s = Sustitucion(
                fecha=datos.fecha,
                dia_semana=dia_semana,
                estado=EstadoSustitucion.PENDIENTE,
                motivo=datos.motivo,
                profesor_ausente_id=datos.profesor_ausente_id,
                periodo_id=slot.periodo_id,
                asignatura_id=slot.asignatura_id,
                grupo_id=slot.grupo_id,
                aula_id=slot.aula_id,
            )
            db.add(s)
            creadas.append(s)
    else:
        # Sin horario: crear una entrada por cada periodo lectivo del centro
        periodos = (
            db.query(Periodo)
            .filter(Periodo.centro_id == centro.id, Periodo.es_lectivo == True)
            .order_by(Periodo.orden)
            .all()
        )
        for p in periodos:
            s = Sustitucion(
                fecha=datos.fecha,
                dia_semana=dia_semana,
                estado=EstadoSustitucion.PENDIENTE,
                motivo=datos.motivo,
                profesor_ausente_id=datos.profesor_ausente_id,
                periodo_id=p.id,
            )
            db.add(s)
            creadas.append(s)

    if not creadas:
        raise HTTPException(
            status_code=400,
            detail="No se encontraron periodos para ese profesor ese día",
        )

    db.commit()
    for s in creadas:
        db.refresh(s)

    return [_enrich(s) for s in creadas]


@router.get("/", response_model=list[SustitucionResponse])
def listar_sustituciones(
    fecha: date | None = None,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    q = (
        db.query(Sustitucion)
        .join(Profesor, Sustitucion.profesor_ausente_id == Profesor.id)
        .filter(Profesor.centro_id == centro.id)
    )
    if fecha:
        q = q.filter(Sustitucion.fecha == fecha)
    sustituciones = q.order_by(Sustitucion.fecha.desc(), Sustitucion.periodo_id).all()
    return [_enrich(s) for s in sustituciones]


@router.patch("/{sustitucion_id}", response_model=SustitucionResponse)
def actualizar_sustitucion(
    sustitucion_id: uuid.UUID,
    datos: SustitucionUpdate,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    s = (
        db.query(Sustitucion)
        .join(Profesor, Sustitucion.profesor_ausente_id == Profesor.id)
        .filter(Sustitucion.id == sustitucion_id, Profesor.centro_id == centro.id)
        .first()
    )
    if not s:
        raise HTTPException(status_code=404, detail="Sustitución no encontrada")

    if datos.profesor_sustituto_id is not None:
        sustituto = db.query(Profesor).filter(
            Profesor.id == datos.profesor_sustituto_id,
            Profesor.centro_id == centro.id,
        ).first()
        if not sustituto:
            raise HTTPException(status_code=404, detail="Profesor sustituto no encontrado")
        s.profesor_sustituto_id = datos.profesor_sustituto_id
        if s.estado == EstadoSustitucion.PENDIENTE:
            s.estado = EstadoSustitucion.CUBIERTA

    if datos.estado is not None:
        s.estado = datos.estado
    if datos.motivo is not None:
        s.motivo = datos.motivo

    db.commit()
    db.refresh(s)
    return _enrich(s)


@router.delete("/{sustitucion_id}", status_code=204)
def eliminar_sustitucion(
    sustitucion_id: uuid.UUID,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    s = (
        db.query(Sustitucion)
        .join(Profesor, Sustitucion.profesor_ausente_id == Profesor.id)
        .filter(Sustitucion.id == sustitucion_id, Profesor.centro_id == centro.id)
        .first()
    )
    if not s:
        raise HTTPException(status_code=404, detail="Sustitución no encontrada")
    db.delete(s)
    db.commit()
