"""add idiomas to profesores

Revision ID: a1b2c3d4e5f6
Revises: f3a9b2c1d4e5
Create Date: 2026-06-21

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f3a9b2c1d4e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'profesores',
        sa.Column(
            'idiomas',
            postgresql.ARRAY(sa.String()),
            nullable=False,
            server_default='{}',
        )
    )


def downgrade() -> None:
    op.drop_column('profesores', 'idiomas')
