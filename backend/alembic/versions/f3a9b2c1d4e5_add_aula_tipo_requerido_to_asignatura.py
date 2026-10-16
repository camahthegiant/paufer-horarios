"""add aula_tipo_requerido to asignatura

Revision ID: f3a9b2c1d4e5
Revises: c628d00c6a52
Create Date: 2026-06-17

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'f3a9b2c1d4e5'
down_revision: Union[str, Sequence[str], None] = 'c628d00c6a52'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Crear el tipo si no existe (puede haberse creado inline con aulas en el initial schema)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipoapula') THEN
                CREATE TYPE tipoapula AS ENUM (
                    'ORDINARIA', 'LABORATORIO', 'INFORMATICA', 'GIMNASIO',
                    'MUSICA', 'BIBLIOTECA', 'OTRO'
                );
            END IF;
        END $$;
    """)
    op.add_column(
        'asignaturas',
        sa.Column(
            'aula_tipo_requerido',
            postgresql.ENUM(
                'ORDINARIA', 'LABORATORIO', 'INFORMATICA', 'GIMNASIO',
                'MUSICA', 'BIBLIOTECA', 'OTRO',
                name='tipoapula',
                create_type=False,
            ),
            nullable=True,
        )
    )


def downgrade() -> None:
    op.drop_column('asignaturas', 'aula_tipo_requerido')
