"""enable row level security

Revision ID: d1e2f3a4b5c6
Revises: b2c3d4e5f6a7
Create Date: 2026-06-24 00:00:00.000000

Habilita RLS en todas las tablas con datos de tenant.
La variable de sesión `app.centro_id` se setea por petición en deps.py.
Política: NULLIF maneja NULL y string vacío (cleanup de conexión) sin error de cast.
centros y usuarios quedan sin RLS (centros se consulta antes de conocer el centro_id;
usuarios se consulta en el flujo de auth sin contexto de tenant).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Tablas con columna centro_id directa
_DIRECT: list[str] = [
    "profesores",
    "asignaturas",
    "aulas",
    "grupos",
    "periodos",
    "cursos_escolares",
]

# Tablas sin centro_id directo: condición de aislamiento via JOIN/subquery
_INDIRECT: dict[str, str] = {
    "profesor_asignatura": (
        "grupo_id IN ("
        "  SELECT id FROM grupos"
        "  WHERE centro_id = NULLIF(current_setting('app.centro_id', true), '')::uuid"
        ")"
    ),
    "restricciones_profesor": (
        "profesor_id IN ("
        "  SELECT id FROM profesores"
        "  WHERE centro_id = NULLIF(current_setting('app.centro_id', true), '')::uuid"
        ")"
    ),
    "horarios": (
        "curso_escolar_id IN ("
        "  SELECT id FROM cursos_escolares"
        "  WHERE centro_id = NULLIF(current_setting('app.centro_id', true), '')::uuid"
        ")"
    ),
    "asignaciones_horarias": (
        "horario_id IN ("
        "  SELECT h.id FROM horarios h"
        "  JOIN cursos_escolares ce ON h.curso_escolar_id = ce.id"
        "  WHERE ce.centro_id = NULLIF(current_setting('app.centro_id', true), '')::uuid"
        ")"
    ),
}


def upgrade() -> None:
    for table in _DIRECT:
        cond = "centro_id = NULLIF(current_setting('app.centro_id', true), '')::uuid"
        op.execute(sa.text(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY"))
        op.execute(sa.text(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY"))
        op.execute(sa.text(
            f"CREATE POLICY tenant_isolation ON {table}"
            f"  FOR ALL"
            f"  USING ({cond})"
            f"  WITH CHECK ({cond})"
        ))

    for table, cond in _INDIRECT.items():
        op.execute(sa.text(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY"))
        op.execute(sa.text(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY"))
        op.execute(sa.text(
            f"CREATE POLICY tenant_isolation ON {table}"
            f"  FOR ALL"
            f"  USING ({cond})"
            f"  WITH CHECK ({cond})"
        ))


def downgrade() -> None:
    for table in _DIRECT + list(_INDIRECT.keys()):
        op.execute(sa.text(f"DROP POLICY IF EXISTS tenant_isolation ON {table}"))
        op.execute(sa.text(f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY"))
        op.execute(sa.text(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY"))
