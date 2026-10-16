import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from starlette.concurrency import run_in_threadpool
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_centro
from app.models.centro import Centro
from app.models.horario import CursoEscolar, Horario, AsignacionHoraria
from app.models.profesor import Profesor
from app.models.asignatura import Asignatura
from app.models.grupo import Grupo
from app.models.horario import EstadoHorario
from app.schemas.horario import (
    CursoEscolarCreate, CursoEscolarResponse,
    HorarioCreate, HorarioResponse,
    SlotCreate, SlotResponse,
)

router = APIRouter(prefix="/api/v1", tags=["horarios"])


# ── Cursos escolares ──────────────────────────────────────────────────────────

@router.get("/cursos-escolares/", response_model=list[CursoEscolarResponse])
def listar_cursos(centro: Centro = Depends(get_centro), db: Session = Depends(get_db)):
    return db.query(CursoEscolar).filter(CursoEscolar.centro_id == centro.id).order_by(CursoEscolar.nombre.desc()).all()


@router.post("/cursos-escolares/", response_model=CursoEscolarResponse, status_code=201)
def crear_curso(datos: CursoEscolarCreate, centro: Centro = Depends(get_centro), db: Session = Depends(get_db)):
    curso = CursoEscolar(**datos.model_dump(), centro_id=centro.id)
    db.add(curso)
    db.commit()
    db.refresh(curso)
    return curso


# ── Horarios ──────────────────────────────────────────────────────────────────

@router.get("/horarios/", response_model=list[HorarioResponse])
def listar_horarios(centro: Centro = Depends(get_centro), db: Session = Depends(get_db)):
    return (
        db.query(Horario)
        .join(CursoEscolar, Horario.curso_escolar_id == CursoEscolar.id)
        .filter(CursoEscolar.centro_id == centro.id)
        .order_by(Horario.created_at.desc())
        .all()
    )


@router.post("/horarios/", response_model=HorarioResponse, status_code=201)
def crear_horario(datos: HorarioCreate, centro: Centro = Depends(get_centro), db: Session = Depends(get_db)):
    curso = db.query(CursoEscolar).filter(
        CursoEscolar.id == datos.curso_escolar_id,
        CursoEscolar.centro_id == centro.id,
    ).first()
    if not curso:
        raise HTTPException(status_code=404, detail="Curso escolar no encontrado")
    h = Horario(**datos.model_dump())
    db.add(h)
    db.commit()
    db.refresh(h)
    return h


@router.patch("/horarios/{horario_id}/estado", response_model=HorarioResponse)
def cambiar_estado_horario(
    horario_id: uuid.UUID,
    estado: EstadoHorario,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    h = _check_horario(horario_id, centro, db)
    h.estado = estado
    db.commit()
    db.refresh(h)
    return h


# ── Slots (AsignacionHoraria) ─────────────────────────────────────────────────

def _check_horario(horario_id: uuid.UUID, centro: Centro, db: Session) -> Horario:
    h = (
        db.query(Horario)
        .join(CursoEscolar, Horario.curso_escolar_id == CursoEscolar.id)
        .filter(Horario.id == horario_id, CursoEscolar.centro_id == centro.id)
        .first()
    )
    if not h:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    return h


def _enrich_slot(s: AsignacionHoraria) -> dict:
    return {
        "id": s.id,
        "horario_id": s.horario_id,
        "profesor_id": s.profesor_id,
        "asignatura_id": s.asignatura_id,
        "grupo_id": s.grupo_id,
        "aula_id": s.aula_id,
        "periodo_id": s.periodo_id,
        "dia_semana": s.dia_semana,
        "tipo": s.tipo,
        "profesor_nombre": s.profesor.nombre if s.profesor else None,
        "profesor_apellidos": s.profesor.apellidos if s.profesor else None,
        "asignatura_nombre": s.asignatura.nombre if s.asignatura else None,
        "asignatura_color": s.asignatura.color if s.asignatura else None,
        "grupo_nombre": s.grupo.nombre if s.grupo else None,
    }


@router.get("/horarios/{horario_id}/slots", response_model=list[SlotResponse])
def listar_slots(
    horario_id: uuid.UUID,
    grupo_id: uuid.UUID | None = None,
    profesor_id: uuid.UUID | None = None,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    _check_horario(horario_id, centro, db)
    q = db.query(AsignacionHoraria).filter(AsignacionHoraria.horario_id == horario_id)
    if grupo_id:
        q = q.filter(AsignacionHoraria.grupo_id == grupo_id)
    if profesor_id:
        q = q.filter(AsignacionHoraria.profesor_id == profesor_id)
    return [_enrich_slot(s) for s in q.all()]


@router.post("/horarios/{horario_id}/slots", response_model=SlotResponse, status_code=201)
def crear_slot(
    horario_id: uuid.UUID,
    datos: SlotCreate,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    _check_horario(horario_id, centro, db)

    # Verify profe belongs to centro
    if not db.query(Profesor).filter(Profesor.id == datos.profesor_id, Profesor.centro_id == centro.id).first():
        raise HTTPException(status_code=404, detail="Profesor no encontrado")

    s = AsignacionHoraria(horario_id=horario_id, **datos.model_dump())
    db.add(s)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=409, detail="Conflicto de horario: ese slot ya está ocupado (profesor, grupo o aula)")
    db.refresh(s)
    return _enrich_slot(s)


@router.delete("/horarios/{horario_id}", status_code=204)
def eliminar_horario(
    horario_id: uuid.UUID,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    h = _check_horario(horario_id, centro, db)
    db.delete(h)
    db.commit()


@router.post("/horarios/{horario_id}/generar")
async def generar(
    horario_id: uuid.UUID,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    from app.models.horario import EstadoHorario
    from app.solver.solver import SinSolucionError, generar_horario

    h = _check_horario(horario_id, centro, db)
    if h.estado == EstadoHorario.PUBLICADO:
        raise HTTPException(status_code=400, detail="No se puede regenerar un horario publicado.")

    try:
        # El solve es CPU-bound y puede tardar hasta 60s. Lo ejecutamos en el
        # threadpool para no bloquear el event loop (y con él, todo el worker).
        return await run_in_threadpool(generar_horario, h, centro.id, db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except SinSolucionError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.delete("/horarios/{horario_id}/slots/{slot_id}", status_code=204)
def eliminar_slot(
    horario_id: uuid.UUID,
    slot_id: uuid.UUID,
    centro: Centro = Depends(get_centro),
    db: Session = Depends(get_db),
):
    _check_horario(horario_id, centro, db)
    s = db.query(AsignacionHoraria).filter(
        AsignacionHoraria.id == slot_id,
        AsignacionHoraria.horario_id == horario_id,
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Slot no encontrado")
    db.delete(s)
    db.commit()
