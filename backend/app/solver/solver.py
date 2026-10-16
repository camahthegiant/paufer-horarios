"""
CP-SAT solver para generación automática de horarios lectivos.

Variables de decisión:
  x[pa_i][dia_i][per_i] ∈ {0,1}
      → 1 = PA i se imparte ese día y periodo

El aula concreta NO es una variable: las aulas del mismo tipo son
intercambiables, así que el modelo solo impone una restricción de capacidad por
tipo (nº de clases activas ≤ nº de aulas de ese tipo) y el aula concreta se
reparte tras resolver mediante un greedy que siempre encuentra asignación válida
(garantizado por la restricción de capacidad). Esto evita crear
O(pas·días·periodos·aulas) variables booleanas de identidad de aula.

Restricciones duras:
  1.  Cobertura exacta     — cada PA se imparte exactamente horas_semana veces/semana
  2.  Distribución/día     — máx ceil(h/5) sesiones de la misma PA por día
  3.  Distribución/periodo — máx ceil(h/n_pers) veces en el mismo tramo horario
  4.  Prof sin solapamiento  — ≤1 PA por (dia, periodo, profesor)
  5.  Grupo sin solapamiento — ≤1 PA por (dia, periodo, grupo)
  6.  NO_DISPONIBLE         — x=0 en los slots vetados por el profesor
  7.  Max horas/día         — ≤ ceil(horas_semana/5)+1 clases por día por profesor
  8.  Capacidad de aula     — por (día, periodo, tipo de aula): nº de clases
                              activas de ese tipo ≤ nº de aulas de ese tipo

Restricciones blandas (objetivo a minimizar):
  PREFERENCIA_EVITAR → +PESO_EVITAR si se programa en ese slot
  PREFERENCIA        → +PESO_PREFERENCIA (negativo → premia) si se programa
  Días consecutivos  → +PESO_DIAS_CONSECUTIVOS si la misma PA aparece 2 días seguidos
  Huecos de grupo    → +PESO_HUECO_GRUPO por cada "hora muerta" intermedia de un grupo
"""

import uuid
import logging
import math
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional

from ortools.sat.python import cp_model
from sqlalchemy.orm import Session, joinedload

from app.models.aula import Aula, TipoAula
from app.models.horario import (
    AsignacionHoraria, Horario, ProfesorAsignatura, TipoAsignacion,
)
from app.models.profesor import (
    DiaSemana, Profesor, RestriccionProfesor, TipoRestriccion,
)
from app.models.grupo import Grupo
from app.models.periodo import Periodo

logger = logging.getLogger(__name__)

DIAS = [
    DiaSemana.LUNES,
    DiaSemana.MARTES,
    DiaSemana.MIERCOLES,
    DiaSemana.JUEVES,
    DiaSemana.VIERNES,
]

# ── Pesos del objetivo (restricciones blandas) ────────────────────────────────
PESO_EVITAR = 10             # penaliza programar en un slot marcado PREFERENCIA_EVITAR
PESO_PREFERENCIA = -5        # premia programar en un slot marcado PREFERENCIA
PESO_DIAS_CONSECUTIVOS = 8   # penaliza la misma PA en dos días seguidos
PESO_HUECO_GRUPO = 6         # penaliza cada hora muerta intermedia de un grupo

# ── Parámetros del solver ─────────────────────────────────────────────────────
SOLVER_MAX_SECONDS = 60.0
# El portfolio paralelo (varios workers) es mucho más rápido y fiable que la
# búsqueda de un solo worker. Nota: con >1 worker CP-SAT NO garantiza devolver
# siempre el mismo óptimo entre soluciones de igual coste; el coste/calidad del
# horario sí es estable. Si algún día se necesita un horario byte-idéntico al
# regenerar, habría que fijar SOLVER_WORKERS=1 (a costa de velocidad y de poder
# no cerrar el óptimo dentro del límite de tiempo).
SOLVER_WORKERS = 4
SOLVER_SEED = 42


class SinSolucionError(Exception):
    pass


def _tipo_requerido(pa) -> TipoAula:
    """Tipo de aula que exige un PA. Sin requisito → ORDINARIA."""
    tipo = pa.asignatura.aula_tipo_requerido if pa.asignatura else None
    return tipo or TipoAula.ORDINARIA


def _diagnosticar(
    pas: list,
    restricciones: list,
    n_dias: int,
    n_pers: int,
    aulas: list,
    compatible_aulas: dict[int, list[int]],
) -> str:
    slots_totales = n_dias * n_pers
    mensajes = []

    # ── Por profesor ──────────────────────────────────────────────────────────
    total_h_prof: dict[uuid.UUID, int] = defaultdict(int)
    nombre_prof: dict[uuid.UUID, str] = {}
    for pa in pas:
        total_h_prof[pa.profesor_id] += pa.horas_semana
        nombre_prof[pa.profesor_id] = f"{pa.profesor.nombre} {pa.profesor.apellidos}"

    for prof_id, total_h in total_h_prof.items():
        # Slots vetados por NO_DISPONIBLE
        vetados = 0
        for r in restricciones:
            if r.profesor_id != prof_id or r.tipo != TipoRestriccion.NO_DISPONIBLE:
                continue
            vetados += n_pers if r.periodo_id is None else 1
        disponibles = slots_totales - vetados

        if total_h > disponibles:
            mensajes.append(
                f"• {nombre_prof[prof_id]}: necesita {total_h}h pero solo hay "
                f"{disponibles} slots disponibles (total={slots_totales}, "
                f"vetados por NO_DISPONIBLE={vetados})."
            )

    # ── Por grupo ─────────────────────────────────────────────────────────────
    total_h_grupo: dict[uuid.UUID, int] = defaultdict(int)
    nombre_grupo: dict[uuid.UUID, str] = {}
    for pa in pas:
        total_h_grupo[pa.grupo_id] += pa.horas_semana
        nombre_grupo[pa.grupo_id] = pa.grupo.nombre

    for grupo_id, total_h in total_h_grupo.items():
        if total_h > slots_totales:
            mensajes.append(
                f"• Grupo {nombre_grupo[grupo_id]}: {total_h}h asignadas pero "
                f"solo hay {slots_totales} slots ({n_dias}d × {n_pers}p)."
            )

    # ── Por tipo de aula ──────────────────────────────────────────────────────
    horas_por_tipo: dict[Optional[TipoAula], int] = defaultdict(int)
    for pa in pas:
        horas_por_tipo[_tipo_requerido(pa)] += pa.horas_semana

    for tipo_req, horas_necesarias in horas_por_tipo.items():
        aulas_disp = [a for a in aulas if a.tipo == tipo_req]
        # Max slots que pueden proveer esas aulas en la semana
        slots_aula = len(aulas_disp) * slots_totales
        if horas_necesarias > slots_aula:
            mensajes.append(
                f"• Tipo aula '{tipo_req.value}': {horas_necesarias}h necesarias pero "
                f"solo {len(aulas_disp)} aula(s) × {slots_totales} slots = "
                f"{slots_aula} slots disponibles."
            )

    if mensajes:
        return "No hay solución posible:\n" + "\n".join(mensajes)
    return (
        "El solver no encontró solución con las restricciones actuales. "
        "Posibles causas: combinación de restricciones NO_DISPONIBLE demasiado estricta, "
        "o demasiadas asignaturas en un mismo tipo de aula en los mismos horarios. "
        "Prueba reduciendo restricciones o redistribuyendo horas."
    )


def generar_horario(horario: Horario, centro_id: uuid.UUID, db: Session) -> dict:

    # ── 1. Cargar datos ───────────────────────────────────────────────────────
    periodos = (
        db.query(Periodo)
        .filter(Periodo.centro_id == centro_id, Periodo.es_lectivo.is_(True))
        .order_by(Periodo.orden)
        .all()
    )
    if not periodos:
        raise ValueError("No hay periodos lectivos configurados para este centro.")

    pas = (
        db.query(ProfesorAsignatura)
        .join(Grupo, ProfesorAsignatura.grupo_id == Grupo.id)
        .filter(Grupo.centro_id == centro_id)
        .options(
            joinedload(ProfesorAsignatura.asignatura),
            joinedload(ProfesorAsignatura.profesor),
            joinedload(ProfesorAsignatura.grupo),
        )
        # Orden estable → los índices de variable son reproducibles y el solver
        # devuelve siempre el mismo horario para los mismos datos.
        .order_by(ProfesorAsignatura.id)
        .all()
    )
    if not pas:
        raise ValueError(
            "No hay asignaciones profe-asignatura-grupo. "
            "Configúralas primero en Asignaciones."
        )

    restricciones = (
        db.query(RestriccionProfesor)
        .join(Profesor, RestriccionProfesor.profesor_id == Profesor.id)
        .filter(Profesor.centro_id == centro_id)
        .order_by(RestriccionProfesor.id)
        .all()
    )

    aulas = (
        db.query(Aula)
        .filter(Aula.centro_id == centro_id, Aula.activa.is_(True))
        .order_by(Aula.id)
        .all()
    )

    n_pas = len(pas)
    n_dias = len(DIAS)
    n_pers = len(periodos)
    n_aulas = len(aulas)

    dia_idx = {d: i for i, d in enumerate(DIAS)}
    per_idx = {p.id: i for i, p in enumerate(periodos)}

    # ── 2. Aulas compatibles por PA y capacidad por tipo ──────────────────────
    # compatible_aulas[i] = índices de aulas del tipo que exige el PA i (todas las
    # de ese tipo son intercambiables). Se usa en el reparto greedy y en el
    # diagnóstico. cap_por_tipo[t] = nº de aulas de tipo t.
    cap_por_tipo: dict[TipoAula, int] = defaultdict(int)
    for a in aulas:
        cap_por_tipo[a.tipo] += 1

    aulas_por_tipo: dict[TipoAula, list[int]] = defaultdict(list)
    for j, a in enumerate(aulas):
        aulas_por_tipo[a.tipo].append(j)

    compatible_aulas: dict[int, list[int]] = {}
    pas_por_tipo: dict[TipoAula, list[int]] = defaultdict(list)
    for i, pa in enumerate(pas):
        tipo_req = _tipo_requerido(pa)
        pas_por_tipo[tipo_req].append(i)
        compat = aulas_por_tipo.get(tipo_req, [])
        if not compat and n_aulas > 0:
            raise ValueError(
                f"No hay aulas de tipo '{tipo_req.value}' disponibles para "
                f"'{pa.asignatura.nombre if pa.asignatura else pa.asignatura_id}'."
            )
        compatible_aulas[i] = compat

    # ── 3. Índices rápidos ────────────────────────────────────────────────────
    pas_by_prof: dict[uuid.UUID, list[int]] = defaultdict(list)
    pas_by_grupo: dict[uuid.UUID, list[int]] = defaultdict(list)
    for i, pa in enumerate(pas):
        pas_by_prof[pa.profesor_id].append(i)
        pas_by_grupo[pa.grupo_id].append(i)

    # ── 4. Modelo CP-SAT ──────────────────────────────────────────────────────
    model = cp_model.CpModel()

    # Variables principales x[pa][dia][periodo]
    x = [
        [
            [model.new_bool_var(f"x_{i}_{d}_{p}") for p in range(n_pers)]
            for d in range(n_dias)
        ]
        for i in range(n_pas)
    ]

    # ── 5. Restricciones duras ────────────────────────────────────────────────

    # R1: Cobertura exacta
    for i, pa in enumerate(pas):
        total_slots = n_dias * n_pers
        if pa.horas_semana > total_slots:
            raise ValueError(
                f"PA '{pa.asignatura.nombre if pa.asignatura else '?'}' de "
                f"'{pa.profesor.nombre if pa.profesor else '?'}': "
                f"horas_semana={pa.horas_semana} supera los {total_slots} slots disponibles."
            )
        model.add(
            sum(x[i][d][p] for d in range(n_dias) for p in range(n_pers))
            == pa.horas_semana
        )

    # R2: Distribución por día — máx ceil(h/n_dias) por PA por día
    for i, pa in enumerate(pas):
        max_por_dia = math.ceil(pa.horas_semana / n_dias)
        if max_por_dia < n_pers:
            for d in range(n_dias):
                model.add(sum(x[i][d][p] for p in range(n_pers)) <= max_por_dia)

    # R3: Distribución por periodo — máx ceil(h/n_pers) por PA por tramo
    for i, pa in enumerate(pas):
        max_por_periodo = math.ceil(pa.horas_semana / n_pers)
        if max_por_periodo < n_dias:
            for p in range(n_pers):
                model.add(sum(x[i][d][p] for d in range(n_dias)) <= max_por_periodo)

    # R4: Profesor sin solapamiento
    for d in range(n_dias):
        for p in range(n_pers):
            for indices in pas_by_prof.values():
                if len(indices) > 1:
                    model.add(sum(x[i][d][p] for i in indices) <= 1)

    # R5: Grupo sin solapamiento
    for d in range(n_dias):
        for p in range(n_pers):
            for indices in pas_by_grupo.values():
                if len(indices) > 1:
                    model.add(sum(x[i][d][p] for i in indices) <= 1)

    # R6: NO_DISPONIBLE
    for r in restricciones:
        if r.tipo != TipoRestriccion.NO_DISPONIBLE:
            continue
        d_i = dia_idx.get(r.dia_semana)
        if d_i is None:
            continue
        indices = pas_by_prof.get(r.profesor_id, [])
        if not indices:
            continue
        if r.periodo_id is not None:
            p_i = per_idx.get(r.periodo_id)
            if p_i is None:
                continue
            for i in indices:
                model.add(x[i][d_i][p_i] == 0)
        else:
            for i in indices:
                for p_i in range(n_pers):
                    model.add(x[i][d_i][p_i] == 0)

    # R7: Máx horas por día por profesor
    for prof_id, indices in pas_by_prof.items():
        if not indices:
            continue
        horas_semana_prof = sum(pas[i].horas_semana for i in indices)
        max_dia = min(n_pers, math.ceil(horas_semana_prof / n_dias) + 1)
        max_dia = max(max_dia, 2)
        for d in range(n_dias):
            total_dia = sum(x[i][d][p] for i in indices for p in range(n_pers))
            model.add(total_dia <= max_dia)

    # R8: Capacidad de aula por tipo — nº clases activas de un tipo por
    # (día, periodo) ≤ nº de aulas de ese tipo. El aula concreta se reparte
    # después (aulas del mismo tipo son intercambiables).
    if n_aulas > 0:
        for d in range(n_dias):
            for p in range(n_pers):
                for tipo, indices in pas_por_tipo.items():
                    cap = cap_por_tipo.get(tipo, 0)
                    # Solo añade la restricción si puede llegar a ser vinculante.
                    if len(indices) > cap:
                        model.add(sum(x[i][d][p] for i in indices) <= cap)

    # ── 6. Restricciones blandas (objetivo) ──────────────────────────────────
    penalty_terms = []

    # Preferencias del profesor
    for r in restricciones:
        if r.tipo not in (TipoRestriccion.PREFERENCIA_EVITAR, TipoRestriccion.PREFERENCIA):
            continue
        d_i = dia_idx.get(r.dia_semana)
        if d_i is None:
            continue
        indices = pas_by_prof.get(r.profesor_id, [])
        if not indices:
            continue
        peso = PESO_EVITAR if r.tipo == TipoRestriccion.PREFERENCIA_EVITAR else PESO_PREFERENCIA
        if r.periodo_id is not None:
            p_i = per_idx.get(r.periodo_id)
            if p_i is None:
                continue
            for i in indices:
                penalty_terms.append(x[i][d_i][p_i] * peso)
        else:
            for i in indices:
                for p_i in range(n_pers):
                    penalty_terms.append(x[i][d_i][p_i] * peso)

    # appears[i][d] = la PA i aparece algún periodo del día d
    appears = [
        [model.new_bool_var(f"appears_{i}_{d}") for d in range(n_dias)]
        for i in range(n_pas)
    ]
    for i in range(n_pas):
        for d in range(n_dias):
            total_dia = sum(x[i][d][p] for p in range(n_pers))
            model.add(total_dia >= 1).only_enforce_if(appears[i][d])
            model.add(total_dia == 0).only_enforce_if(appears[i][d].negated())

    # Penalización días consecutivos: evita que la misma PA aparezca L+M, M+X…
    for i, pa in enumerate(pas):
        if pa.horas_semana <= 1:
            continue
        for d in range(n_dias - 1):
            consec = model.new_bool_var(f"consec_{i}_{d}")
            model.add_bool_and([appears[i][d], appears[i][d + 1]]).only_enforce_if(consec)
            model.add_bool_or(
                [appears[i][d].negated(), appears[i][d + 1].negated()]
            ).only_enforce_if(consec.negated())
            penalty_terms.append(consec * PESO_DIAS_CONSECUTIVOS)

    # Penalización de huecos ("horas muertas") por grupo y día. Un hueco es un
    # periodo p sin clase del grupo pero con clase antes y después ese día.
    for g_i, indices in enumerate(pas_by_grupo.values()):
        if not indices:
            continue
        for d in range(n_dias):
            # occ[p] = el grupo tiene clase en (d, p). R5 garantiza ≤1 → es booleana.
            occ = []
            for p in range(n_pers):
                o = model.new_bool_var(f"occ_{g_i}_{d}_{p}")
                model.add(o == sum(x[i][d][p] for i in indices))
                occ.append(o)
            # Los extremos nunca son hueco intermedio.
            for p in range(1, n_pers - 1):
                before = model.new_bool_var(f"before_{g_i}_{d}_{p}")
                after = model.new_bool_var(f"after_{g_i}_{d}_{p}")
                model.add_max_equality(before, occ[:p])
                model.add_max_equality(after, occ[p + 1:])
                hole = model.new_bool_var(f"hole_{g_i}_{d}_{p}")
                # hole = before AND after AND NOT occ[p]
                model.add(hole <= before)
                model.add(hole <= after)
                model.add(hole + occ[p] <= 1)
                model.add(hole >= before + after - occ[p] - 1)
                penalty_terms.append(hole * PESO_HUECO_GRUPO)

    if penalty_terms:
        model.minimize(sum(penalty_terms))

    # ── 7. Resolver ───────────────────────────────────────────────────────────
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = SOLVER_MAX_SECONDS
    solver.parameters.num_search_workers = SOLVER_WORKERS
    solver.parameters.random_seed = SOLVER_SEED
    solver.parameters.log_search_progress = False

    logger.info(
        "Solver iniciado: %d PAs, %d días, %d periodos, %d aulas",
        n_pas, n_dias, n_pers, n_aulas,
    )
    status = solver.solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        msg = _diagnosticar(pas, restricciones, n_dias, n_pers, aulas, compatible_aulas)
        raise SinSolucionError(msg)

    logger.info(
        "Solver terminado en %.2fs — status=%s, objetivo=%.1f",
        solver.wall_time,
        "ÓPTIMO" if status == cp_model.OPTIMAL else "FACTIBLE",
        solver.objective_value,
    )

    # ── 8. Escribir slots ─────────────────────────────────────────────────────
    eliminados = (
        db.query(AsignacionHoraria)
        .filter(
            AsignacionHoraria.horario_id == horario.id,
            AsignacionHoraria.tipo == TipoAsignacion.CLASE,
        )
        .delete(synchronize_session=False)
    )
    logger.info("Slots CLASE previos eliminados: %d", eliminados)

    # Reparto greedy de aula concreta por slot. La restricción R8 garantiza que
    # en cada (día, periodo) el nº de clases activas de un tipo no supera el nº
    # de aulas de ese tipo, así que siempre queda un aula libre.
    slots_nuevos = []
    for d_i, dia in enumerate(DIAS):
        for p_i, periodo in enumerate(periodos):
            aulas_usadas: set[int] = set()
            for i, pa in enumerate(pas):
                if not solver.value(x[i][d_i][p_i]):
                    continue

                aula_id = None
                if n_aulas > 0:
                    for a_j in compatible_aulas[i]:
                        if a_j not in aulas_usadas:
                            aulas_usadas.add(a_j)
                            aula_id = aulas[a_j].id
                            break

                slots_nuevos.append(
                    AsignacionHoraria(
                        horario_id=horario.id,
                        profesor_id=pa.profesor_id,
                        asignatura_id=pa.asignatura_id,
                        grupo_id=pa.grupo_id,
                        periodo_id=periodo.id,
                        dia_semana=dia,
                        tipo=TipoAsignacion.CLASE,
                        aula_id=aula_id,
                    )
                )

    db.add_all(slots_nuevos)
    horario.updated_at = datetime.now(timezone.utc)
    db.add(horario)
    db.commit()

    return {
        "slots_creados": len(slots_nuevos),
        "slots_previos_eliminados": eliminados,
        "estado_solver": "OPTIMO" if status == cp_model.OPTIMAL else "FACTIBLE",
        "tiempo_segundos": round(solver.wall_time, 2),
        "penalizacion": round(solver.objective_value, 1),
    }
