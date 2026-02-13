"""add category field to items

Revision ID: 7f0d7efe2e68
Revises: 
Create Date: 2026-02-13 13:54:55.673162

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7f0d7efe2e68'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add category column to items table."""
    op.add_column('items', sa.Column('category', sa.String(), nullable=True))


def downgrade() -> None:
    """Remove category column from items table."""
    op.drop_column('items', 'category')
