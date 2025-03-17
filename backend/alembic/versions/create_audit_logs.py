"""create audit logs table

Revision ID: create_audit_logs
Revises: previous_revision
Create Date: 2024-03-17 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'create_audit_logs'
down_revision = 'previous_revision'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('resource_type', sa.String(), nullable=False),
        sa.Column('resource_id', sa.String(), nullable=True),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('user_agent', sa.String(), nullable=True),
        sa.Column('details', postgresql.JSONB(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(
        op.f('ix_audit_logs_id'),
        'audit_logs',
        ['id'],
        unique=False
    )
    op.create_index(
        op.f('ix_audit_logs_timestamp'),
        'audit_logs',
        ['timestamp'],
        unique=False
    )
    op.create_index(
        op.f('ix_audit_logs_action'),
        'audit_logs',
        ['action'],
        unique=False
    )
    op.create_index(
        op.f('ix_audit_logs_resource_type'),
        'audit_logs',
        ['resource_type'],
        unique=False
    )

def downgrade():
    op.drop_index(op.f('ix_audit_logs_resource_type'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_action'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_timestamp'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_id'), table_name='audit_logs')
    op.drop_table('audit_logs') 